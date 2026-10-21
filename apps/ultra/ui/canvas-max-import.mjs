import {makeNode, nodeSpec, parseMessage, validatePatch} from './canvas-model.mjs';
import {parseObjectText} from './canvas-catalog.mjs';
import {appearanceFields, validateStyle} from './canvas-appearance.mjs';

// Max JSON is data only. Embedded scripts, dependencies, abstractions and startup
// messages are never evaluated or resolved by this bounded control-graph adapter.
export const MAX_IMPORT_LIMITS = Object.freeze({bytes: 8 * 1024 * 1024, depth: 64, patcherDepth: 24, patchers: 256, boxes: 20000, edges: 40000, values: 250000});
const encoder = new TextEncoder();
const empty = () => ({version: 1, profile: 'ultra-canvas-v1', nodes: [], edges: []});
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (obj, key) => Object.hasOwn(obj, key);
const fail = message => { throw Error(message); };
const nativeTypes = new Set(['int', 'float', 'pack', 'unpack', 'select', 'route', 'trigger', 'line', 'add', 'multiply', 'metro']);

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
        queue.push({patcher: b.patcher, id: `${entry.id}/${encodeURIComponent(b.id)}`, name: name || b.id, path: childPath});
      }
    }
    patchers.push(entry);
  }
  return {patchers, totals: {patchers: patchers.length, boxes: boxCount, edges: edgeCount}};
}

function convertBox(box, id, diagnostic) {
  let authored;
  if (box.patcher) fail('Nested patcher boundaries are not flattened. Select this named subpatch separately.');
  switch (box.maxclass) {
    case 'button': authored = {type: 'bang', params: {}}; break;
    case 'toggle':
      authored = {type: 'toggle', params: {}};
      diagnostic('warning', 'semantic-gap', 'Ultra toggle normalizes every nonzero numeric input to 1; Max toggle can pass the nonzero input value through.', {boxId: box.id});
      break;
    case 'message':
      if (typeof box.text !== 'string' || !box.text.trim()) fail('Empty/editable Max message displays and cold-inlet storage are unsupported.');
      parseMessage(box.text);
      authored = {type: 'message', params: {text: box.text}};
      diagnostic('warning', 'semantic-gap', 'Only the literal hot-inlet message is supported; Max cold-inlet replacement and message editing are unavailable.', {boxId: box.id});
      break;
    case 'number':
      if (box.minimum != null || box.maximum != null) fail('Max integer number-box bounds are not represented by Ultra number parameters.');
      authored = {type: 'number', params: {}};
      diagnostic('warning', 'semantic-gap', 'Max integer coercion and the second (Tab) outlet differ: Ultra number stores a floating-point value and has one outlet.', {boxId: box.id});
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
      if (token === 'counter') fail('Max counter has a different argument, state and five-inlet/four-outlet contract; it is not Ultra counter.');
      authored = parseObjectText(box.text);
      if (!nativeTypes.has(authored.type)) fail(`Max ${token} does not have an approved equivalent in this adapter.`);
      if (['pack', 'unpack'].includes(authored.type) && authored.params.args.split(/\s+/).some(atom => ['i', 'f'].includes(atom))) fail('Literal Max pack/unpack symbol arguments i/f would be reinterpreted as Ultra numeric placeholders. Use numeric Max creation arguments.');
      if (authored.type === 'metro') diagnostic('warning', 'semantic-gap', 'Max metro bang/start, transport, scheduling and interval semantics differ from the bounded Ultra clock (20-2000 ms).', {boxId: box.id});
      if (authored.type === 'line') {
        const first = box.text.trim().split(/\s+/)[1];
        authored.params.floatoutput = first && /[.eE]/.test(first) ? 1 : 0;
      }
      if (['add', 'multiply'].includes(authored.type)) diagnostic('warning', 'semantic-gap', 'Ultra arithmetic uses floating-point operands; Max integer creation-argument coercion is not reproduced.', {boxId: box.id});
      break;
    }
    default: fail(`No execution adapter for Max class ${box.maxclass}.`);
  }
  const rect = box.patching_rect;
  if (!Array.isArray(rect) || rect.length !== 4 || rect.some(n => typeof n !== 'number' || !Number.isFinite(n))) fail('Max patching_rect must contain four finite coordinates/dimensions.');
  const node = makeNode(authored.type, id, rect[0], rect[1], authored.params);
  validatePatch({...empty(), nodes: [node]});
  const style = {}, styleKeys = appearanceFields(node.type).map(field => field.key);
  const candidates = {width: rect[2], height: rect[3]};
  for (const key of styleKeys) if (key !== 'width' && key !== 'height' && own(box, key)) candidates[key] = box[key];
  for (const [key, value] of Object.entries(candidates)) {
    try { Object.assign(style, validateStyle(node.type, {[key]: value})); }
    catch (error) { diagnostic('warning', 'appearance-gap', `${error.message} The saved value is omitted without clamping.`, {boxId: box.id, attribute: key}); }
  }
  if (Object.keys(style).length) node.style = style;
  const ports = nodeSpec(node);
  for (const [key, count] of [['numinlets', ports.inlets.length], ['numoutlets', ports.outlets.length]]) {
    if (own(box, key) && box[key] !== count) diagnostic('warning', 'port-shape', `Saved Max ${key}=${box[key]}; Ultra exposes ${count}. Cable indices are kept and unavailable ports are rejected.`, {boxId: box.id});
  }
  if (own(box, 'saved_attribute_attributes') || own(box, 'parameter_enable') && box.parameter_enable || own(box, 'valueof')) diagnostic('warning', 'semantic-gap', 'Saved parameter automation and initialization are not restored.', {boxId: box.id});
  const understood = new Set(['id', 'maxclass', 'text', 'patching_rect', 'numinlets', 'numoutlets', 'outlettype', 'varname', 'parameter_enable', 'saved_attribute_attributes', 'valueof', ...Object.keys(authored.params), ...styleKeys]);
  for (const key of Object.keys(box)) {
    if (understood.has(key)) continue;
    const visual = /color$/.test(key) || ['fontname', 'fontface', 'style', 'linecount', 'textjustification', 'triscale', 'knobshape', 'svg', 'thickness', 'presentation', 'presentation_rect'].includes(key);
    diagnostic('warning', visual ? 'appearance-gap' : 'semantic-gap', `Saved Max ${visual ? 'appearance' : 'behavior'} attribute ${key} is not adapted.`, {boxId: box.id, attribute: key});
  }
  return node;
}

function receiverAcceptsLiteral(from, to, inlet) {
  if (from.type !== 'message' || ['bang', 'message', 'pack', 'unpack', 'select', 'route', 'trigger'].includes(to.type)) return true;
  const value = parseMessage(from.params.text);
  if (value === null || Array.isArray(value)) return true;
  const selector = value.split(/\s+/)[0];
  if (selector === 'list') return true;
  if (inlet !== 0) return false;
  const supported = {int: ['set'], float: ['set'], flonum: ['set', 'min', 'max'], slider: ['set', 'setminmax'], line: ['set', 'stop', 'pause', 'resume']};
  return (supported[to.type] ?? []).includes(selector);
}

function convertPatcher(entry, {allowPartial = false, sourceName = ''} = {}) {
  const diagnostics = [], mapped = new Map(), patch = empty(), {patcher} = entry;
  const sourceBoxes = new Map(patcher.boxes.map(item => [item.box.id, item.box]));
  const diagnostic = (severity, code, message, detail = {}) => diagnostics.push({severity, code, message, ...detail});
  let decorations = 0, omittedBoxes = 0, omittedEdges = 0, fatal = false;
  for (const item of patcher.boxes) {
    const b = item.box;
    if (b.maxclass === 'comment' && !b.patcher) {
      decorations++;
      diagnostic('info', 'decoration', 'Comment text is not imported into the executable graph.', {boxId: b.id});
      continue;
    }
    try {
      const node = convertBox(b, patch.nodes.length + 1, diagnostic);
      mapped.set(b.id, node); patch.nodes.push(node);
    } catch (error) {
      omittedBoxes++;
      diagnostic('error', 'unsupported-box', error.message, {boxId: b.id, maxclass: b.maxclass});
    }
  }
  const grouped = new Map();
  for (const [index, item] of (patcher.lines ?? []).entries()) {
    const line = item?.patchline;
    const source = line?.source, destination = line?.destination;
    const validPort = p => Array.isArray(p) && p.length === 2 && typeof p[0] === 'string' && Number.isInteger(p[1]) && p[1] >= 0;
    let reason;
    if (record(line)) {
      for (const key of Object.keys(line)) {
        if (['source', 'destination', 'order', 'disabled'].includes(key)) continue;
        const visual = ['midpoints', 'hidden', 'color'].includes(key);
        diagnostic('warning', visual ? 'appearance-gap' : 'semantic-gap', `Saved Max cable ${visual ? 'appearance' : 'behavior'} attribute ${key} is not adapted.`, {edgeIndex: index, attribute: key});
      }
    }
    const from = validPort(source) && mapped.get(source[0]), to = validPort(destination) && mapped.get(destination[0]);
    if (!record(line) || !validPort(source) || !validPort(destination)) reason = 'Malformed Max patchline endpoint.';
    else if (own(line, 'disabled') && line.disabled !== 0) reason = 'Disabled or malformed disabled-state Max cable is not activated by the importer.';
    else if (!from || !to) reason = 'A cable endpoint has no imported executable box.';
    else if ((Number.isInteger(sourceBoxes.get(source[0]).numoutlets) && source[1] >= sourceBoxes.get(source[0]).numoutlets) ||
      (Number.isInteger(sourceBoxes.get(destination[0]).numinlets) && destination[1] >= sourceBoxes.get(destination[0]).numinlets)) reason = 'Saved cable references a port beyond its original Max box shape.';
    else if (source[1] >= nodeSpec(from).outlets.length || destination[1] >= nodeSpec(to).inlets.length) reason = 'Saved Max cable references an unavailable Ultra inlet/outlet; port indices are not remapped.';
    else if (!receiverAcceptsLiteral(from, to, destination[1])) reason = 'The destination does not implement this literal Max message selector.';
    if (reason) {
      omittedEdges++;
      diagnostic('error', 'unsupported-edge', reason, {edgeIndex: index, ...(validPort(source) ? {source: [...source]} : {}), ...(validPort(destination) ? {destination: [...destination]} : {})});
      continue;
    }
    const key = `${from.id}:${source[1]}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({index, order: line.order, edge: {from: from.id, outlet: source[1], to: to.id, inlet: destination[1]}});
  }
  for (const group of grouped.values()) {
    if (group.length > 1) {
      const orders = group.map(item => item.order);
      if (orders.every(order => Number.isInteger(order) && order >= 0) && new Set(orders).size === orders.length) group.sort((a, b) => a.order - b.order);
      else diagnostic('warning', 'semantic-gap', 'This fanout has no unique explicit Max cable order. Saved array order is retained; Max geometric fanout order is not certified.', {edgeIndex: group[0].index});
    }
    patch.edges.push(...group.map(item => item.edge));
  }
  if (patch.nodes.length > 32 || patch.edges.length > 64) {
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
    sourceName, selection: {id: entry.id, name: entry.name, path: [...entry.path]}, nodeMap: Object.fromEntries([...mapped].map(([sourceId, node]) => [sourceId, node.id])),
    patch: available ? validatePatch(patch) : null, complete, partial: available && !complete,
    importable: !fatal, requiresPartial: !fatal && !complete, diagnostics,
    stats: {sourceBoxes: patcher.boxes.length, sourceEdges: (patcher.lines ?? []).length, importedBoxes: patch.nodes.length, importedEdges: patch.edges.length, omittedBoxes, omittedEdges, decorations},
    scope: 'Only the selected patcher graph is adapted. Nested tabs, scripts, dependencies, automation and Max runtime parity are not included. Importing does not execute Max.',
  };
}

/** Inventory actual nested patcher boundaries and their conservative import reports. */
export function analyzeMaxPatch(input, {sourceName = ''} = {}) {
  const source = readSource(input);
  return {sourceName, totals: source.totals, patchers: source.patchers.map(entry => {
    const report = convertPatcher(entry, {sourceName});
    const {patch: _patch, selection, ...rest} = report;
    return {...selection, ...rest, boxCount: report.stats.sourceBoxes, edgeCount: report.stats.sourceEdges};
  })};
}

/** A partial graph is returned only after the caller explicitly opts into omissions/gaps. */
export function importMaxPatcher(input, {patcherId = 'root', allowPartial = false, sourceName = ''} = {}) {
  const entry = readSource(input).patchers.find(p => p.id === patcherId);
  if (!entry) fail('Selected Max patcher was not found.');
  return convertPatcher(entry, {allowPartial: allowPartial === true, sourceName});
}
