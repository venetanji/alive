import {makeNode, nodeSpec, parseMessage, validatePatch} from './canvas-model.mjs';
import {parseMessageTemplate} from './canvas-message-ui.mjs';
import {parseObjectText} from './canvas-catalog.mjs';
import {appearanceFields, validateStyle} from './canvas-appearance.mjs';
import {recognizedHelpShell} from './canvas-help-shell.mjs';
import {validateMidpoints} from './canvas-cable-geometry.mjs';

// Max JSON is data only. Embedded scripts, dependencies, abstractions and startup
// messages are never evaluated or resolved by this bounded native-graph adapter.
export const MAX_IMPORT_LIMITS = Object.freeze({bytes: 8 * 1024 * 1024, depth: 64, patcherDepth: 24, patchers: 256, boxes: 20000, edges: 40000, values: 250000});
const encoder = new TextEncoder();
const empty = () => ({version: 1, profile: 'ultra-canvas-v1',presentation:null, nodes: [], edges: []});
const emptyHierarchy = () => ({version: 2, profile: 'ultra-patcher-v2',presentation:null, nodes: [], edges: []});
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (obj, key) => Object.hasOwn(obj, key);
const fail = message => { throw Error(message); };
function commentFontsize(patcher, inherited) {
  if (!own(patcher, 'default_fontsize')) return inherited;
  try { return validateStyle('comment', {fontsize: patcher.default_fontsize}).fontsize; }
  catch { return inherited; }
}
const listTypes = new Set(['iter', 'prepend', 'append', 'zl_reg', 'zl_join', 'zl_len', 'zl_iter', 'zl_slice', 'zl_rev', 'zl_rot']);
const signalTypes = new Set(['sig', 'signal_add', 'signal_subtract', 'signal_multiply', 'signal_divide', 'cycle', 'phasor', 'noise', 'signal_clip', 'line_signal', 'snapshot', 'signal_dac']);
const nativeTypes = new Set(['int', 'float', 'pack', 'unpack', 'select', 'route', 'trigger', 'line', 'add', 'multiply','subtract','divide','modulo','reverse_subtract','reverse_divide','abs', 'metro', 'print', 'send', 'receive', ...listTypes, ...signalTypes]);
const signalAttributes = {
  cycle:['buffer','buffer_offset','buffer_sizeinsamps','frequency','phase'],
  phasor:['frequency','jitter','limit','lock','phaseoffset','syncupdate','transport'],
  signal_clip:['mode'],line_signal:['activeout','maxpoints','time'],snapshot:['active','interval','offset','sampleinterval'],noise:['seed'],
};

export async function readPatchFile(file){
  if(file.size>MAX_IMPORT_LIMITS.bytes)fail('Input exceeds the 8 MiB analysis limit.');
  const bytes=await file.arrayBuffer();
  if(bytes.byteLength>MAX_IMPORT_LIMITS.bytes)fail('Input exceeds the 8 MiB analysis limit.');
  // Preserve a BOM so the native probe hashes the original file bytes.
  try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}
  catch{fail('Patch file is not valid UTF-8.');}
}

function readSource(input) {
  let value = input;
  if (typeof input === 'string') {
    if (input.length > MAX_IMPORT_LIMITS.bytes || encoder.encode(input).length > MAX_IMPORT_LIMITS.bytes) fail('Max input exceeds the 8 MiB analysis limit.');
    try { value = JSON.parse(input.replace(/^\uFEFF/, '')); }
    catch { fail('Max file is not valid JSON.'); }
  }
  // Iterative preflight also bounds caller-supplied objects before traversal or
  // serialization, including cyclic/shared structures and enormous metadata.
  const seen = new WeakSet(), stack = [[value, 0]];
  let values = 0, bytes = 0;
  while (stack.length) {
    const [item, depth] = stack.pop();
    if (++values > MAX_IMPORT_LIMITS.values || depth > MAX_IMPORT_LIMITS.depth) fail('Max input exceeds the analysis depth/value limit.');
    if (typeof item === 'string') {
      if (item.length > MAX_IMPORT_LIMITS.bytes) fail('Max input exceeds the 8 MiB analysis limit.');
      bytes += encoder.encode(item).length;
    } else if (item && typeof item === 'object') {
      if (seen.has(item)) fail('Max input contains a cyclic or shared object.');
      seen.add(item);
      const keys = Object.keys(item);
      if (keys.length + values + stack.length > MAX_IMPORT_LIMITS.values) fail('Max input exceeds the analysis value limit.');
      for (const key of keys) { bytes += key.length; stack.push([item[key], depth + 1]); }
    } else if (typeof item === 'number' && !Number.isFinite(item)) fail('Max input must contain finite JSON numbers only.');
    else if (item !== null && !['number', 'boolean'].includes(typeof item)) fail('Max input must contain JSON data only.');
    if (bytes > MAX_IMPORT_LIMITS.bytes) fail('Max input exceeds the 8 MiB analysis limit.');
  }
  if (!record(value) || !record(value.patcher)) fail('Expected a Max .maxpat or .maxhelp JSON object containing a patcher.');
  const patchers = [], queue = [{patcher: value.patcher, id: 'root', name: 'Root', path: []}];
  let boxCount = 0, edgeCount = 0;
  for (let index = 0; index < queue.length; index++) {
    const entry = queue[index], {patcher, path} = entry;
    if (queue.length > MAX_IMPORT_LIMITS.patchers || path.length > MAX_IMPORT_LIMITS.patcherDepth) fail('Max input exceeds the patcher count/depth limit.');
    if (!record(patcher) || !Array.isArray(patcher.boxes) || (own(patcher, 'lines') && !Array.isArray(patcher.lines))) fail(`Malformed Max patcher ${entry.id}: boxes and lines must be arrays.`);
    boxCount += patcher.boxes.length; edgeCount += (patcher.lines ?? []).length;
    if (boxCount > MAX_IMPORT_LIMITS.boxes || edgeCount > MAX_IMPORT_LIMITS.edges) fail('Max input exceeds the box/cable analysis limit.');
    const ids = new Set();
    for (const item of patcher.boxes) {
      const b = item?.box;
      if (!record(b) || typeof b.id !== 'string' || !b.id || b.id.length > 256 || typeof b.maxclass !== 'string') fail(`Malformed Max box in ${entry.id}.`);
      if (ids.has(b.id)) fail(`Duplicate Max box ID ${b.id} in ${entry.id}.`);
      ids.add(b.id);
      if (own(b, 'patcher')) {
        const childPath = [...path, b.id];
        const name = typeof b.text === 'string' ? b.text.replace(/^(?:p|patcher)\s+/, '').trim() : b.varname || b.id;
        queue.push({patcher: b.patcher, id: `${entry.id}/${encodeURIComponent(b.id)}`, name: name || b.id, path: childPath, inheritedFontsize: commentFontsize(patcher, entry.inheritedFontsize)});
      }
    }
    patchers.push(entry);
  }
  return {patchers, totals: {patchers: patchers.length, boxes: boxCount, edges: edgeCount}};
}

function patcherName(box) {
  if (box.maxclass !== 'newobj' || typeof box.text !== 'string') fail('Only embedded p/patcher objects are supported; bpatcher and external abstractions are not adapted.');
  const match = /^(?:p|patcher)(?:\s+(?:"([^"\\]+)"|([^\s"\\]+)))?$/.exec(box.text.trim());
  if (!match) fail('Embedded p/patcher creation must have at most one simple name; patcher arguments and attributes are not implemented.');
  const name = match[1] ?? match[2] ?? 'sub patch';
  if (name.startsWith('@')) fail('Max patcher creation attributes are not implemented.');
  return name;
}

function convertBox(box, id, diagnostic, hierarchy = false, helperRole = null, inheritedFontsize) {
  let authored;
  if(helperRole)authored={type:'help_helper',params:{role:helperRole}};
  else if (box.patcher) authored = {type: 'patcher', params: {name: patcherName(box)}};
  else switch (box.maxclass) {
    case 'comment': authored = {type: 'comment', params: {text: box.text ?? ''}}; break;
    case 'inlet': case 'outlet': authored = {type: box.maxclass, params: {}}; break;
    case 'button': authored = {type: 'bang', params: {}}; break;
    case 'toggle':
      authored = {type: 'toggle', params: {}};
      diagnostic('warning', 'semantic-gap', 'Ultra toggle normalizes every nonzero numeric input to 1; Max toggle can pass the nonzero input value through.', {boxId: box.id});
      break;
    case 'message':
      if (box.text != null && typeof box.text !== 'string') fail('Max message text must be a string.');
      if ((box.text??'').trim().split(/\s+/).some(word=>word.startsWith('#0'))) fail('Max message #0 patcher-instance expansion is not implemented; the unexpanded name is not imported as a literal global destination.');
      parseMessageTemplate(box.text??'');
      authored = {type: 'message_box', params: {text: box.text??''}};
      break;
    case 'number':
      authored = {type: 'number_int', params: {}};
      for (const key of ['minimum', 'maximum']) if (box[key] != null) authored.params[key] = box[key];
      break;
    case 'flonum':
      authored = {type: 'flonum', params: {}};
      for (const key of ['minimum', 'maximum', 'numdecimalplaces']) if (box[key] != null) authored.params[key] = box[key];
      break;
    case 'slider':
      authored = {type: 'slider', params: {}};
      for (const key of ['size', 'min', 'mult', 'floatoutput']) if (box[key] != null) authored.params[key] = box[key];
      break;
    case 'newobj': {
      if (typeof box.text !== 'string') fail('Max object has no creation text.');
      const token = box.text.trim().split(/\s+/)[0];
      if (['inlet', 'outlet'].includes(token)) {
        if (box.text.trim() !== token) fail('Generic inlet/outlet creation arguments and attributes are not implemented.');
        authored = {type: token, params: {}};
        break;
      }
      if (token === 'counter') fail('Max counter has a different argument, state and five-inlet/four-outlet contract; it is not Ultra counter.');
      if(['add','multiply','add.legacy','multiply.legacy'].includes(token))fail('Ultra legacy arithmetic spellings are not qualified Max creation names.');
      authored = parseObjectText(box.text);
      if (!nativeTypes.has(authored.type)) fail(`Max ${token} does not have an approved equivalent in this adapter.`);
      if (signalTypes.has(authored.type)) {
        if (box.text.trim().split(/\s+/).some(word=>word.startsWith('@'))) fail('Max signal execution attributes are not qualified by this adapter; use supported positional creation arguments.');
        for (const key of signalAttributes[authored.type]??[]) if (own(box,key)) fail(`Max signal execution attribute ${key} is not implemented; this object is not imported with altered behavior.`);
        if (own(box,'saved_object_attributes') || own(box,'saved_attribute_attributes') || own(box,'valueof') || box.parameter_enable) fail('Saved Max signal execution attributes, automation and initialization are not implemented.');
      }
      if (listTypes.has(authored.type)) {
        for (const key of ['fuzzy', 'zlmaxsize', 'mode']) if (own(box, key)) fail(`Max list execution attribute ${key} is not implemented; this object is not imported with altered behavior.`);
        if (authored.params.args?.split(/\s+/).some(word => word.startsWith('#0'))) fail('Max list argument #0 patcher-instance expansion is not implemented; the unexpanded prefix or retained list is not imported as literal data.');
      }
      if (['send','receive'].includes(authored.type) && /^(?:#0|---)/.test(authored.params.name)) fail('Scoped Max send/receive names require #0 or Max for Live --- expansion, which this document adapter does not implement.');
      if (['pack', 'unpack'].includes(authored.type) && authored.params.args.split(/\s+/).some(atom => ['i', 'f'].includes(atom))) fail('Literal Max pack/unpack symbol arguments i/f would be reinterpreted as Ultra numeric placeholders. Use numeric Max creation arguments.');
      if (authored.type === 'metro') diagnostic('warning', 'semantic-gap', 'Max metro bang/start, transport, scheduling and interval semantics differ from the bounded Ultra clock (20-2000 ms).', {boxId: box.id});
      if (authored.type === 'print' && box.level != null) authored.params.level = box.level;
      if (authored.type === 'print' && own(box,'popup')) authored.params.popup = box.popup;
      if (authored.type === 'line') {
        const first = box.text.trim().split(/\s+/)[1];
        authored.params.floatoutput = first && /[.eE]/.test(first) ? 1 : 0;
      }
      if (['add','multiply','subtract','divide','modulo','reverse_subtract','reverse_divide','abs'].includes(authored.type)) diagnostic('warning','semantic-gap','Scalar arithmetic uses Ultra\'s bounded -100000 to 100000 control profile; out-of-profile results are not equivalent to Max.',{boxId:box.id});
      if(authored.type==='reverse_divide'&&box.text.trim()==='!/')diagnostic('warning','semantic-gap','Bare !/ uses Ultra\'s stored numerator default of 1; this exact Max creation default was not distinguished by the frozen runtime probe.',{boxId:box.id});
      break;
    }
    default: fail(`No execution adapter for Max class ${box.maxclass}.`);
  }
  const rect = box.patching_rect;
  if (!Array.isArray(rect) || rect.length !== 4 || rect.some(n => typeof n !== 'number' || !Number.isFinite(n))) fail('Max patching_rect must contain four finite coordinates/dimensions.');
  const node = helperRole?{id,type:'help_helper',x:rect[0],y:rect[1],params:authored.params}:makeNode(authored.type, id, rect[0], rect[1], authored.params);
  if (node.type === 'patcher') node.patcher = {presentation:null,nodes: [], edges: []};
  if(!helperRole)validatePatch({...(hierarchy ? emptyHierarchy() : empty()), nodes: [node]});
  const style = {}, styleKeys = appearanceFields(node.type).map(field => field.key);
  const candidates = {width: rect[2], height: rect[3]};
  for (const key of styleKeys) if (key !== 'width' && key !== 'height' && own(box, key)) candidates[key] = box[key];
  if (node.type === 'comment' && !own(box, 'fontsize') && inheritedFontsize !== undefined) candidates.fontsize = inheritedFontsize;
  for (const [key, value] of Object.entries(candidates)) {
    try { Object.assign(style, validateStyle(node.type, {[key]: value})); }
    catch (error) { diagnostic('warning', 'appearance-gap', `${error.message} The saved value is omitted without clamping.`, {boxId: box.id, attribute: key}); }
  }
  if (Object.keys(style).length) node.style = style;
  if(helperRole)diagnostic('info','help-helper',`Known ${helperRole} helper retained as an authoring annotation; no script execution or surface ports.`,{boxId:box.id});
  else if (node.type !== 'patcher') diagnosePorts(box, node, diagnostic);
  if (own(box, 'saved_attribute_attributes') || own(box, 'parameter_enable') && box.parameter_enable || own(box, 'valueof')) diagnostic('warning', 'semantic-gap', 'Saved parameter automation and initialization are not restored.', {boxId: box.id});
  const understood = new Set(['id', 'maxclass', 'text', 'patching_rect', 'numinlets', 'numoutlets', 'outlettype', 'varname', 'parameter_enable', 'saved_attribute_attributes', 'valueof', ...Object.keys(authored.params), ...styleKeys,
    ...(helperRole?['filename','border','ignoreclick','jsarguments','saved_object_attributes']:[]),
    ...(node.type === 'patcher' ? ['patcher'] : []), ...(['inlet', 'outlet'].includes(node.type) ? ['index'] : [])]);
  for (const key of Object.keys(box)) {
    if (understood.has(key)) continue;
    const visual = /color$/.test(key) || ['fontname', 'fontface', 'style', 'linecount', 'textjustification', 'triscale', 'knobshape', 'svg', 'thickness', 'presentation', 'presentation_rect'].includes(key);
    diagnostic('warning', visual ? 'appearance-gap' : 'semantic-gap', `Saved Max ${visual ? 'appearance' : 'behavior'} attribute ${key} is not adapted.`, {boxId: box.id, attribute: key});
  }
  return node;
}

function diagnosePorts(box, node, diagnostic) {
  const ports = nodeSpec(node);
  for (const [key, count] of [['numinlets', ports.inlets.length], ['numoutlets', ports.outlets.length]]) {
    if (own(box, key) && box[key] !== count) diagnostic('warning', 'port-shape', `Saved Max ${key}=${box[key]}; Ultra exposes ${count}. Cable indices are kept and unavailable ports are rejected.`, {boxId: box.id});
  }
}

function receiverAcceptsLiteral(from, to, inlet) {
  if (!['message','message_box'].includes(from.type)) return true;
  if (['patcher', 'inlet', 'outlet'].includes(to.type)) return true;
  if(from.type==='message_box'&&!from.params.text.trim())return true;
  const text=from.type==='message_box'?parseMessageTemplate(from.params.text).map(word=>/^\$[12]$/.test(word)?'0':word).join(' '):from.params.text;
  const value = parseMessage(text);
  if(to.type==='message_box'&&typeof value==='string'){
    const selector=value.split(/\s+/)[0];
    if(inlet===1&&(selector==='set'||value==='list'))return false;
    if(inlet===0&&['append','prepend','setargs'].includes(selector))return false;
  }
  if (signalTypes.has(to.type)) {
    const words=typeof value==='string'?value.split(/\s+/):null;
    const atoms=Array.isArray(value)?value:words?.[0]==='list'?words.slice(1).map(word=>/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(word)?Number(word):NaN):null;
    const numeric=atoms?.length&&atoms.every(Number.isFinite),scalar=numeric&&atoms.length===1;
    if(to.type==='sig')return !!numeric||words?.[0]==='set'&&words.length===3&&/^\d+$/.test(words[1])&&Number(words[1])<nodeSpec(to).outlets.length&&Number.isFinite(Number(words[2]));
    if(['signal_add','signal_subtract','signal_multiply','signal_divide','signal_clip','phasor'].includes(to.type))return !!scalar;
    if(to.type==='cycle')return !!scalar||inlet===0&&words?.[0]==='reset'&&words.length===2&&Number.isFinite(Number(words[1]));
    if(to.type==='line_signal')return inlet===1?!!scalar&&atoms[0]>=0:!!numeric&&(atoms.length===1||atoms.length%2===0&&atoms.every((atom,index)=>index%2===0||atom>=0))||!!words&&['stop','pause','resume'].includes(words[0])&&words.length===1;
    if(to.type==='snapshot'){
      if(inlet===1)return !!scalar&&atoms[0]>=0;
      return value===null||!!words&&((['start','stop'].includes(words[0])&&words.length===1)||(words[0]==='offset'&&words.length===2&&Number.isInteger(Number(words[1]))&&Number(words[1])>=0&&Number(words[1])<=63));
    }
    return false;
  }
  if (to.type.startsWith('zl_') && typeof value === 'string' && ['mode', 'zlmaxsize', 'fuzzy'].includes(value.split(/\s+/)[0])) return false;
  if(['add','multiply','subtract','divide','modulo'].includes(to.type)&&to.params.numericmode!==0&&inlet===0&&typeof value==='string'&&/^set\s+[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(value))return true;
  if (['bang', 'message', 'message_box', 'pack', 'unpack', 'select', 'route', 'trigger', 'print', 'send', ...listTypes].includes(to.type)) return true;
  if (value === null || Array.isArray(value)) return true;
  const selector = value.split(/\s+/)[0];
  if (selector === 'list') return true;
  if (inlet !== 0) return false;
  if (['int','float'].includes(to.type) && selector === 'send') {
    const words=value.trim().split(/\s+/);
    return words.length===2&&!/^(?:#0|---)/.test(words[1])&&!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(words[1]);
  }
  if (to.type === 'number_int' && ['min','max'].includes(selector)) {
    const words=value.trim().split(/\s+/);
    return words.length===1||words.length===2&&Number.isInteger(Number(words[1]));
  }
  const supported = {int: ['set'], float: ['set'], flonum: ['set', 'min', 'max'], number_int: ['set', 'min', 'max'], slider: ['set', 'setminmax'], line: ['set', 'stop', 'pause', 'resume'], receive: ['set']};
  return (supported[to.type] ?? []).includes(selector);
}

function convertPatcher(entry, {allowPartial = false, sourceName = '', shell = null} = {}) {
  const diagnostics = [], scoped = new Map(), inventory = [];
  const queue = [entry.patcher];
  for (const patcher of queue) {
    inventory.push(patcher);
    for (const {box} of patcher.boxes) if (box.patcher) queue.push(box.patcher);
  }
  const hierarchy = inventory.some(p => p.boxes.some(({box}) => box.patcher || ['inlet', 'outlet', 'comment'].includes(box.maxclass) || box.maxclass === 'newobj' && /^(?:inlet|outlet)(?:\s|$)/.test(box.text?.trim() ?? '')));
  const patch = hierarchy ? emptyHierarchy() : empty();
  const nodeMap = {};
  const decorations = 0;
  let nextId = 1, fatal = false;
  const diagnose = (patcherId, severity, code, message, detail = {}) => diagnostics.push({severity, code, message, patcherId, ...detail});
  function convertScope(current) {
    const tree = {presentation:null,nodes: [], edges: []}, {patcher} = current;
    const inheritedFontsize = commentFontsize(patcher, current.inheritedFontsize);
    const diagnostic = (severity, code, message, detail = {}) => diagnose(current.id, severity, code, message, detail);
    if (patcher.classnamespace != null && patcher.classnamespace !== 'box') {
      diagnostic('error', 'unsupported-patcher', 'Only the Max box namespace is adapted; the entire patcher scope is omitted.');
      return tree;
    }
    if (hierarchy) {
      const metadata = new Set(['boxes', 'lines', 'fileversion', 'appversion', 'classnamespace', 'rect']);
      for (const key of Object.keys(patcher)) {
        if (metadata.has(key)) continue;
        const value = patcher[key];
        if (key === 'dependency_cache' && Array.isArray(value) && !value.length) continue;
        const visual = /color$/.test(key) || /^(?:font|default_font|grid|toolbar|scroll|enable.*scroll)/.test(key) || ['showontab', 'openinpresentation', 'presentation', 'bglocked', 'style', 'styles', 'boxanimatetime', 'modernui', 'tallnewobj', 'devicewidth', 'assistshowspatchername', 'statusbarvisible', 'toolbarsvisible', 'subpatcher_template'].includes(key);
        diagnostic('warning', visual ? 'appearance-gap' : 'semantic-gap', `Saved Max patcher ${visual ? 'appearance' : 'behavior'} attribute ${key} is not adapted.`, {attribute: key});
      }
    }
    const mapped = new Map(), sourceBoxes = new Map(patcher.boxes.map(item => [item.box.id, item.box]));
    for (const {box} of patcher.boxes) {
      try {
        const node = convertBox(box, nextId, diagnostic, hierarchy, shell?.roles.get(box), inheritedFontsize);
        nextId++;
        if (box.patcher) {
          node.patcher = convertScope({patcher: box.patcher, id: `${current.id}/${encodeURIComponent(box.id)}`, inheritedFontsize});
          diagnosePorts(box, node, diagnostic);
        }
        mapped.set(box.id, node);
        scoped.set(`${current.id}/${encodeURIComponent(box.id)}`, node.id);
        if (current.id === entry.id) Object.defineProperty(nodeMap, box.id, {value: node.id, enumerable: true});
        tree.nodes.push(node);
      } catch (error) {
        diagnostic('error', 'unsupported-box', `${error.message}${box.patcher ? ' The embedded subtree is omitted.' : ''}`, {boxId: box.id, maxclass: box.maxclass});
      }
    }
    const grouped = new Map();
    // Partial import must not shift a parent's cable onto a surviving sibling.
    const retainsBoundary = (node, sourceBox, type, port) => {
      if (node.type !== 'patcher') return true;
      const original = sourceBox.patcher.boxes.map(({box}, index) => ({box, index})).filter(({box}) => box.maxclass === type || box.maxclass === 'newobj' && new RegExp(`^${type}(?:\\s|$)`).test(box.text?.trim() ?? ''));
      if (original.some(({box}) => !Array.isArray(box.patching_rect) || !Number.isFinite(box.patching_rect[0]))) return false;
      original.sort((a, b) => a.box.patching_rect[0] - b.box.patching_rect[0] || a.index - b.index);
      const retained = node.patcher.nodes.filter(child => child.type === type).map((child, index) => ({child, index})).sort((a, b) => a.child.x - b.child.x || a.index - b.index);
      const boundary = original[port]?.box;
      return !!boundary && retained[port]?.child.id === scoped.get(`${current.id}/${encodeURIComponent(sourceBox.id)}/${encodeURIComponent(boundary.id)}`);
    };
    for (const [index, item] of (patcher.lines ?? []).entries()) {
      const line = item?.patchline, source = line?.source, destination = line?.destination;
      const validPort = p => Array.isArray(p) && p.length === 2 && typeof p[0] === 'string' && Number.isInteger(p[1]) && p[1] >= 0;
      let reason, midpoints;
      if (record(line)) {
        for (const key of Object.keys(line)) {
          if (['source', 'destination', 'order', 'disabled'].includes(key)) continue;
          if (key === 'midpoints') {
            try { midpoints = validateMidpoints(line.midpoints); }
            catch (error) { diagnostic('warning', 'appearance-gap', `Saved Max cable midpoints are omitted: ${error.message}`, {edgeIndex: index, attribute: key}); }
            continue;
          }
          const visual = ['midpoints', 'hidden', 'color'].includes(key);
          diagnostic('warning', visual ? 'appearance-gap' : 'semantic-gap', `Saved Max cable ${visual ? 'appearance' : 'behavior'} attribute ${key} is not adapted.`, {edgeIndex: index, attribute: key});
        }
      }
      const from = validPort(source) && mapped.get(source[0]), to = validPort(destination) && mapped.get(destination[0]);
      if (!record(line) || !validPort(source) || !validPort(destination)) reason = 'Malformed Max patchline endpoint.';
      else if (own(line, 'disabled') && line.disabled !== 0) reason = 'Disabled or malformed disabled-state Max cable is not activated by the importer.';
      else if (!from || !to) reason = 'A cable endpoint has no imported executable box in this patcher scope.';
      else if (!retainsBoundary(from, sourceBoxes.get(source[0]), 'outlet', source[1]) || !retainsBoundary(to, sourceBoxes.get(destination[0]), 'inlet', destination[1])) reason = 'An original child boundary was omitted or shifted by partial import; the parent cable is omitted rather than routed to a different connector.';
      else if ((Number.isInteger(sourceBoxes.get(source[0]).numoutlets) && source[1] >= sourceBoxes.get(source[0]).numoutlets) ||
        (Number.isInteger(sourceBoxes.get(destination[0]).numinlets) && destination[1] >= sourceBoxes.get(destination[0]).numinlets)) reason = 'Saved cable references a port beyond its original Max box shape.';
      else if (source[1] >= nodeSpec(from).outlets.length || destination[1] >= nodeSpec(to).inlets.length) reason = 'Saved Max cable references an unavailable Ultra inlet/outlet; port indices are not remapped.';
      else if (!receiverAcceptsLiteral(from, to, destination[1])) reason = 'The destination does not implement this literal Max message selector.';
      if (reason) {
        diagnostic('error', 'unsupported-edge', reason, {edgeIndex: index, ...(validPort(source) ? {source: [...source]} : {}), ...(validPort(destination) ? {destination: [...destination]} : {})});
        continue;
      }
      const key = `${from.id}:${source[1]}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({index, order: line.order, edge: {from: from.id, outlet: source[1], to: to.id, inlet: destination[1], ...(midpoints !== undefined ? {midpoints} : {})}});
    }
    for (const group of grouped.values()) {
      if (group.length > 1) {
        const orders = group.map(item => item.order);
        if (orders.every(order => Number.isInteger(order) && order >= 0) && new Set(orders).size === orders.length) group.sort((a, b) => a.order - b.order);
        else diagnostic('warning', 'semantic-gap', 'This fanout has no unique explicit Max cable order. Saved array order is retained; Max geometric fanout order is not certified.', {edgeIndex: group[0].index});
      }
      tree.edges.push(...group.map(item => item.edge));
    }
    return tree;
  }
  Object.assign(patch, convertScope(entry));
  if(shell)patch.helpShell={adapter:shell.identity.adapter,object:shell.identity.object,basicNode:nodeMap[shell.basic],questionNode:nodeMap[shell.question]};
  let importedBoxes = 0, importedEdges = 0, executable = 0;
  const trees = [patch];
  for (const tree of trees) {
    importedBoxes += tree.nodes.length; importedEdges += tree.edges.length;
    for (const node of tree.nodes) {
      if (node.type === 'patcher') trees.push(node.patcher);
      else if (!['comment','help_helper'].includes(node.type)) executable++;
    }
  }
  const diagnostic = (severity, code, message, detail = {}) => diagnose(entry.id, severity, code, message, detail);
  if (executable > 32 || importedEdges > 64) {
    fatal = true;
    diagnostic('error', 'native-limit', 'The supported graph exceeds Ultra limits (32 objects / 64 cables). Select a smaller subpatch; graphs are never truncated.');
  } else {
    try { validatePatch(patch); }
    catch (error) { fatal = true; diagnostic('error', 'invalid-graph', error.message); }
  }
  if (!patch.nodes.length) { fatal = true; diagnostic('error', 'empty-graph', 'No executable supported objects remain in this patcher.'); }
  const complete = !fatal && diagnostics.every(d => d.severity === 'info');
  const available = !fatal && (complete || allowPartial);
  return {
    ...(shell?{helpShell:{...patch.helpShell}}:{}),
    sourceName, selection: {id: entry.id, name: entry.name, path: [...entry.path]}, nodeMap, scopedNodeMap: Object.fromEntries(scoped),
    patch: available ? validatePatch(patch) : null, complete, partial: available && !complete,
    importable: !fatal, requiresPartial: !fatal && !complete, diagnostics,
    stats: {sourceBoxes: inventory.reduce((sum, p) => sum + p.boxes.length, 0), sourceEdges: inventory.reduce((sum, p) => sum + (p.lines ?? []).length, 0), importedBoxes, importedEdges,
      omittedBoxes: inventory.reduce((sum, p) => sum + p.boxes.length, 0) - importedBoxes - decorations,
      omittedEdges: inventory.reduce((sum, p) => sum + (p.lines ?? []).length, 0) - importedEdges, decorations},
    scope: shell?'The known help shell and authoring helpers are retained without executing scripts. Remaining diagnostics describe unsupported appearance or behavior; source retention does not qualify complete Max help execution.':hierarchy
      ? 'Supported embedded p/patcher boundaries and comments in the selected tree are adapted. Tabs, scripts, dependencies, abstractions, initialization and Max runtime parity are not included. Importing does not execute Max.'
      : 'Only the selected flat patcher graph is adapted. Nested tabs, scripts, dependencies, automation and Max runtime parity are not included. Importing does not execute Max.',
  };
}

/** Inventory actual nested patcher boundaries and their conservative import reports. */
export function analyzeMaxPatch(input, {sourceName = '',helpShell = null} = {}) {
  const source = readSource(input);
  const shell=recognizedHelpShell(input,helpShell,source.patchers[0].patcher);
  return {sourceName, totals: source.totals, patchers: source.patchers.map(entry => {
    const report = convertPatcher(entry, {sourceName,shell:entry.id==='root'?shell:null});
    const {patch: _patch, selection, ...rest} = report;
    return {...selection, ...rest, boxCount: report.stats.sourceBoxes, edgeCount: report.stats.sourceEdges};
  })};
}

/** A partial graph is returned only after the caller explicitly opts into omissions/gaps. */
export function importMaxPatcher(input, {patcherId = 'root', allowPartial = false, sourceName = '',helpShell = null} = {}) {
  const entry = readSource(input).patchers.find(p => p.id === patcherId);
  if (!entry) fail('Selected Max patcher was not found.');
  return convertPatcher(entry, {allowPartial: allowPartial === true, sourceName,shell:entry.id==='root'?recognizedHelpShell(input,helpShell,entry.patcher):null});
}
