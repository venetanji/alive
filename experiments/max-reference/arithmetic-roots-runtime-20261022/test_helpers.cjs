// Original in-memory Max API fixtures; this never starts Max or a display.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function helper(name, extra = {}) {
  const file = path.join(__dirname, name);
  assert.ok(fs.existsSync(file), `Finite arithmetic helper missing: ${name}`);
  const context = vm.createContext({jsarguments: ['js', 'Z:/synthetic/config.json'], ...extra});
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return context;
}
const plain = value => JSON.parse(JSON.stringify(value));

const controller = helper('controller.js');
assert.equal(typeof controller.observedGeometryPolicy, 'function', 'source-bound arithmetic geometry policy missing');
assert.equal(typeof controller.numericPreflightObservation, 'function', 'failed-preflight numeric capability observation missing');
const delivered = [];
controller.dispatch({message(...args) { delivered.push(args); }},
  {selector: 'float', atoms: [{tag: 'float', value: 7}]});
assert.deepEqual(delivered, [['float', 7]]);
for (const message of [{selector: 'int', atoms: [{tag: 'float', value: 7}]},
  {selector: 'float', atoms: [{tag: 'float', value: null}]}, {selector: 'bang', atoms: [1]}]) {
  assert.throws(() => controller.dispatch({message() { assert.fail('malformed input dispatched'); }}, message));
}
const object = {maxclass: 'flonum', getboxattr: () => [4, 8, 40, 20], nextobject: null};
const expected = {anchor: 'root/synthetic', maxclass: 'flonum', runtime_class: 'flonum', rect: [4, 8, 40, 20]};
assert.equal(controller.resolve({firstobject: object}, expected), object);
for (const key of ['shell_height_policy', 'annotation_geometry_policy', 'numeric_mode_policy', 'observer_policy']) {
  assert.throws(() => controller.resolve({firstobject: object}, {...expected, [key]: {kind: 'inherited'}}));
}
object.maxclass = 'number';
assert.throws(() => controller.resolve({firstobject: object}, expected));
object.maxclass = 'flonum'; object.getboxattr = () => [4, 8, 40, 22];
assert.throws(() => controller.resolve({firstobject: object}, expected));
const crypto = require('node:crypto');
const canonical = value => JSON.stringify(value);
const hash = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');
const measuredSaved = [4, 8, 40, 20], measuredLive = [4, 8, 41.25, 20], measuredAnchor = 'root/obj-4/obj-5';
const syntheticPin = {runtime_class: 'jsui', changed_dimension: 2, source_box_sha256: 'a'.repeat(64),
  source_text_sha256: 'b'.repeat(64), saved_rect_sha256: hash(measuredSaved), live_rect_sha256: hash(measuredLive)};
controller.TIMES_GEOMETRY_PINS = {[measuredAnchor]: syntheticPin};
const measuredDefinition = {document: 'times', revision: 1, source_sha256: controller.GEOMETRY_SOURCE,
  helper_sha256: plain(controller.GEOMETRY_HELPERS)};
controller.config = {helpers: Object.entries(controller.GEOMETRY_HELPERS).map(([name, sha256]) => ({name, sha256}))};
const measuredPolicy = {kind: 'times-observed-geometry-v1', document: 'times', source_sha256: controller.GEOMETRY_SOURCE,
  anchor: measuredAnchor, runtime_class: 'jsui', changed_dimension: 2,
  source_box_sha256: syntheticPin.source_box_sha256, source_text_sha256: syntheticPin.source_text_sha256,
  saved_rect: measuredSaved, live_rect: measuredLive, saved_rect_sha256: syntheticPin.saved_rect_sha256,
  live_rect_sha256: syntheticPin.live_rect_sha256, helper_sha256: plain(controller.GEOMETRY_HELPERS),
  evidence: plain(controller.GEOMETRY_EVIDENCE), saved_incoming_routes: 0, saved_outgoing_routes: 0};
const measuredExpected = {...expected, anchor: measuredAnchor, maxclass: 'jsui', runtime_class: 'jsui',
  rect: measuredSaved, source_box_sha256: syntheticPin.source_box_sha256, source_text_sha256: syntheticPin.source_text_sha256,
  saved_incoming_routes: 0, saved_outgoing_routes: 0, observed_geometry_policy: measuredPolicy};
const measuredObject = {maxclass: 'jsui', getboxattr: () => measuredLive, nextobject: null};
const dispositions = [];
assert.equal(controller.resolve({firstobject: measuredObject}, measuredExpected, measuredDefinition, dispositions), measuredObject);
assert.equal(dispositions.length, 1);
assert.throws(() => controller.resolve({firstobject: measuredObject}, measuredExpected, {...measuredDefinition, document: 'plus'}, []));
assert.throws(() => controller.resolve({firstobject: measuredObject}, {...measuredExpected,
  observed_geometry_policy: {...measuredPolicy, evidence: {...measuredPolicy.evidence, ack_sha256: 'f'.repeat(64)}}}, measuredDefinition, []));
assert.throws(() => controller.observedGeometryPolicy({...measuredExpected,
  observed_geometry_policy: {...measuredPolicy, live_rect: [4, 8, 42, 20]}}, measuredDefinition, controller.config),
  'private vectors must match their measured hash independently');
const numericExpected = {anchor: 'root/obj-4/obj-1', maxclass: 'flonum', runtime_class: 'flonum', rect: [8, 12, 60, 20],
  source_box_sha256: controller.TIMES_NUMERIC_PINS['root/obj-4/obj-1']};
const numericObject = {maxclass: 'number', getboxattr: () => numericExpected.rect, nextobject: null,
  getattr(attribute) {assert.equal(attribute, 'format'); return 6;}, getvalueof: () => [91827.25],
  message() {assert.fail('capability getter must not send input');}, setvalueof() {assert.fail('capability getter must not mutate state');}};
controller.shared = {request_id: 1, step_id: 'install-times-r1', action: 'install', action_document: 'times', action_revision: 1};
assert.throws(() => controller.resolve({firstobject: numericObject}, numericExpected, measuredDefinition, []));
const diagnostic = controller.anchorDiagnostics.at(-1).numeric_preflight_observation;
assert.equal(diagnostic.format_observation.value, 6);
assert.equal(diagnostic.value_observation.value, 91827.25);
assert.equal(diagnostic.value_observation.representation, 'singleton-number-array');
assert.equal(diagnostic.receipt_tag_observed, false);
assert.throws(() => controller.numericPreflightObservation(numericObject, numericExpected, {...measuredDefinition, document: 'minus'}));
for (const [object, method, expectedStatus, expectedRepresentation] of [
  [{}, 'getvalueof', 'unavailable', 'unavailable'],
  [{getvalueof() {throw Error('synthetic unavailable');}}, 'getvalueof', 'threw', 'threw'],
  [Object.defineProperty({}, 'getvalueof', {get() {throw Error('synthetic property unavailable');}}), 'getvalueof', 'threw', 'threw'],
  [{getvalueof: () => null}, 'getvalueof', 'returned', 'null'],
  [{getvalueof: () => [1, 2]}, 'getvalueof', 'returned', 'ambiguous-array'],
  [{getvalueof: () => Infinity}, 'getvalueof', 'returned', 'nonfinite']]) {
  const outcome = controller.capabilityObservation(object, method);
  assert.equal(outcome.status, expectedStatus); assert.equal(outcome.representation, expectedRepresentation);
  assert.equal(outcome.value, null, 'unknown capability must remain unknown');
}
assert.equal(typeof controller.controllerNumericRepresentationPolicy, 'function', 'controller-only representation gate missing');
const gateInitial = 91827.25;
const gatePin = {source_box_sha256: numericExpected.source_box_sha256, source_text_sha256: 'b'.repeat(64),
  saved_rect_sha256: hash(numericExpected.rect), initial_numeric_sha256: hash([gateInitial, 0, 0, 0])};
controller.NUMERIC_REPRESENTATION_PINS = {[numericExpected.anchor]: gatePin};
const gatePolicy = {kind: 'times-controller-numeric-representation-v1', engine: 'js-controller', document: 'times',
  source_sha256: controller.GEOMETRY_SOURCE, anchor: numericExpected.anchor, source_class: 'flonum', runtime_class: 'number',
  ...gatePin, helper_sha256: plain(controller.GEOMETRY_HELPERS), evidence: plain(controller.NUMERIC_REPRESENTATION_EVIDENCE),
  format_method: 'getattr', format_attribute: 'format', format_representation: 'scalar-number', format_value: 6,
  getter_method: 'getvalueof', getter_representation: 'singleton-number-array', finite_required: true, source_initial_equality: true};
const gateExpected = {...numericExpected, runtime_classes: ['flonum'], source_text_sha256: gatePin.source_text_sha256,
  initial_numeric: gateInitial, controller_numeric_representation_policy: gatePolicy};
const gateDefinition = {...measuredDefinition, working_windows_path: 'Z:/synthetic/times-r1.maxhelp', lifecycle_owner_inlet: 0};
const gateConfig = {...controller.config, documents: [gateDefinition], lifecycle: {owners: [{document: 'times', revision: 1,
  source_sha256: controller.GEOMETRY_SOURCE, working_path: gateDefinition.working_windows_path}]}};
controller.config = gateConfig;
assert.equal(controller.resolve({firstobject: numericObject}, gateExpected, gateDefinition, []), numericObject);
assert.equal(controller.controllerRepresentationObservations.length, 1);
assert.equal(controller.resolve({firstobject: numericObject}, gateExpected, gateDefinition, []), numericObject);
assert.equal(controller.controllerRepresentationObservations.length, 1, 'resolver passes retain one request-bound observation per anchor');
assert.deepEqual(gateExpected.runtime_classes, ['flonum']);
for (const liveRectangle of [() => [8.005, 12, 60, 20], () => undefined, undefined,
  () => {throw Error('synthetic geometry unavailable');}]) {
  for (const entry of ['resolve', 'direct-observation']) {
    const calls = [];
    const shifted = {...numericObject, getboxattr: liveRectangle,
      getattr() {calls.push('format'); return 6;}, getvalueof() {calls.push('value'); return [gateInitial];},
      message() {calls.push('input');}, setvalueof() {calls.push('setter');}};
    assert.throws(() => entry === 'resolve'
      ? controller.resolve({firstobject: shifted}, gateExpected, gateDefinition, [])
      : controller.controllerNumericRepresentationObservation(shifted, gateExpected, gateDefinition),
    `exact live geometry must precede probes through ${entry}`);
    assert.deepEqual(calls, [], 'geometry refusal must not probe capabilities, send input or set state');
  }
}
for (const mutation of ['source', 'helper', 'anchor', 'box', 'text', 'rect', 'initial', 'evidence', 'alias']) {
  const e = plain(gateExpected), d = plain(gateDefinition);
  if (mutation === 'source') d.source_sha256 = 'f'.repeat(64);
  if (mutation === 'helper') d.helper_sha256['helpargs.js'] = 'f'.repeat(64);
  if (mutation === 'anchor') e.anchor = 'root/obj-2/obj-1';
  if (mutation === 'box') e.source_box_sha256 = 'f'.repeat(64);
  if (mutation === 'text') e.source_text_sha256 = 'f'.repeat(64);
  if (mutation === 'rect') e.rect[2] += 1;
  if (mutation === 'initial') e.initial_numeric += .125;
  if (mutation === 'evidence') e.controller_numeric_representation_policy.evidence.ack_sha256 = 'f'.repeat(64);
  if (mutation === 'alias') e.runtime_classes.push('number');
  assert.throws(() => controller.resolve({firstobject: numericObject}, e, d, []), mutation);
}
for (const change of [{request_id: 0}, {request_id: 1.5}, {action: 'event'}, {action_document: 'plus'},
  {action_revision: 2}, {step_id: 'times-A01'}]) {
  const saved = controller.shared; controller.shared = {...saved, ...change};
  assert.throws(() => controller.resolve({firstobject: numericObject}, gateExpected, gateDefinition, []));
  controller.shared = saved;
}
for (const changed of [{getattr: () => [6]}, {getattr: () => 5}, {getattr: undefined},
  {getattr() {throw Error('synthetic unavailable');}}, {getvalueof: () => gateInitial},
  {getvalueof: () => [gateInitial + .25]}, {getvalueof: () => [NaN]}, {getvalueof: () => [1, 2]},
  {getvalueof: () => null}, {maxclass: 'flonum'}]) {
  assert.throws(() => controller.resolve({firstobject: {...numericObject, ...changed}}, gateExpected, gateDefinition, []));
}
const wrongOwner = plain(gateConfig); wrongOwner.lifecycle.owners[0].revision = 2; controller.config = wrongOwner;
assert.throws(() => controller.resolve({firstobject: numericObject}, gateExpected, gateDefinition, []));
controller.config = gateConfig;
controller.config = {package_sha256: {'lifecycle-observer.js': 'a'.repeat(64)}, lifecycle: {monitor_epoch: 'e'.repeat(48)}};
controller.lifecycleControl = () => ({observer_report: {failures: [], sealed: true}});
let barrierAck;
controller.ack = (command, value) => { barrierAck = value; };
controller.handle({op: 'lifecycle-barrier', step_id: 'capture-complete', command_id: 900});
assert.equal(barrierAck.lifecycle_evidence.version, 'arithmetic-freebang-v1');
controller.roots.times = {definition: {revision: 2}};
assert.throws(() => controller.handle({op: 'lifecycle-barrier', step_id: 'capture-complete', command_id: 901}));

const reader = helper('v8-readback.js');
for (const [cls, value] of [['number', 13], ['flonum', -3.25]]) {
  for (const raw of [value, [value]]) {
    const result = reader.numericValue({getvalueof: () => raw}, cls);
    assert.equal(result.value, value); assert.equal(result.getter_method, 'getvalueof');
    assert.equal(result.semantic_tag_basis, cls === 'number' ? 'number-class' : 'flonum-class');
  }
}
for (const raw of [null, undefined, [], [1, 2], [null], NaN, Infinity, '13', {}]) {
  assert.throws(() => reader.numericValue({getvalueof: () => raw}, 'number'));
}
assert.throws(() => reader.numericValue({getvalueof: () => 0.25}, 'number'));
assert.throws(() => reader.numericValue({getvalueof: () => 0}, 'slider'));
assert.equal(typeof reader.collectRepresentationDiagnostics, 'function', 'aggregate source-bound V8 diagnostics missing');
const diagConfig = plain(gateConfig), diagDefinition = diagConfig.documents[0];
const numericAnchors = ['root/obj-4/obj-1', 'root/obj-4/obj-24', 'root/obj-4/obj-23'];
const rootAnchors = ['root/obj-3', 'root/obj-6', 'root/obj-4', 'root/obj-1'];
const diagNumericObjects = [], diagRootObjects = [];
diagDefinition.boxes = numericAnchors.map((anchor, index) => {
  const box = {...plain(gateExpected), id: anchor.split('/').at(-1), anchor, rect: [8 + 70 * index, 12, 60, 20]};
  const pin = {...gatePin, saved_rect_sha256: hash(box.rect)};
  reader.NUMERIC_REPRESENTATION_PINS = {...reader.NUMERIC_REPRESENTATION_PINS, [anchor]: pin};
  box.controller_numeric_representation_policy = {...plain(gatePolicy), anchor, ...pin};
  diagNumericObjects.push({...numericObject, varname: '__alive_help_' + box.id.replace(/-/g, '_'),
    getboxattr: () => box.rect, nextobject: null});
  return box;
});
diagDefinition.full_inventory = rootAnchors.map((anchor, index) => {
  const box = {anchor, maxclass: index > 1 ? 'newobj' : index === 0 ? 'newobj' : 'jsui',
    runtime_class: index > 1 ? 'patcher' : index === 0 ? 'js' : 'jsui',
    rect: [80 * index, 80, 60, 20], source_box_sha256: 'c'.repeat(64), source_text_sha256: 'd'.repeat(64),
    source_varname: index === 2 ? 'basic_tab' : index === 3 ? 'q_tab' : undefined};
  box.runtime_classes = [box.runtime_class];
  reader.TIMES_ROOT_REPRESENTATION_PINS = {...reader.TIMES_ROOT_REPRESENTATION_PINS,
    [anchor]: {source_box_sha256: box.source_box_sha256, source_text_sha256: box.source_text_sha256,
      saved_rect_sha256: hash(box.rect), runtime_class: box.runtime_class, runtime_classes: box.runtime_classes}};
  diagRootObjects.push({maxclass: index > 1 ? 'jpatcher' : box.runtime_class, varname: box.source_varname || '',
    getboxattr: () => box.rect, nextobject: null});
  return box;
});
function linkObjects(objects) {objects.forEach((o, i) => o.nextobject = objects[i + 1] || null); return {firstobject: objects[0] || null};}
const diagBasic = linkObjects(diagNumericObjects);
diagRootObjects[2].subpatcher = () => diagBasic;
const diagRoot = {...linkObjects(diagRootObjects), filepath: diagDefinition.working_windows_path, parentpatcher: null,
  getnamed(name) {assert.equal(name, 'basic_tab'); return diagRootObjects[2];}};
diagDefinition.basic_varname = 'basic_tab';
const diagRequest = {op: 'readback', command_id: 2, operation_request_id: 1, step_id: 'install-times-r1', action: 'install',
  action_document: 'times', action_revision: 1, document: 'times', revision: 1, source_sha256: reader.GEOMETRY_SOURCE};
const diag = reader.collectRepresentationDiagnostics(diagRoot, diagDefinition, diagRequest, diagConfig);
assert.equal(diag.numeric_rows.length, 3); assert.equal(diag.root_rows.length, 4);
assert.equal(diag.strict_mismatch, true);
assert.ok(diag.numeric_rows.every(r => r.actual_runtime_class === 'number' && r.value_observation.value === gateInitial));
assert.equal(diag.root_rows.filter(r => r.actual_runtime_class === 'jpatcher').length, 2);
let refused;
try {reader.collectReadback(diagRoot, diagDefinition, diagRequest, diagConfig);} catch (error) {refused = error;}
assert.ok(refused, 'V8 number and jpatcher representations must remain refused');
assert.equal(refused.v8_representation_diagnostics.numeric_rows.length, 3);
assert.equal(refused.v8_representation_diagnostics.root_rows.length, 4);
assert.equal(typeof reader.collectRepresentationWitnesses, 'function', 'Fresh capture003 V8 witnesses missing');
const liveConfig = plain(diagConfig), liveDefinition = liveConfig.documents[0];
const liveNumeric = diagNumericObjects.map(o => ({...o, patchcords: {inputs: [], outputs: []}, getvalueof: () => gateInitial}));
const liveRoots = diagRootObjects.map(o => ({...o, patchcords: {inputs: [], outputs: []}}));
liveDefinition.saved_edges = [];
reader.V8_ROOT_REPRESENTATION_PINS = {};
for (const box of liveDefinition.boxes) {
  box.outlets = 2;
  box.inlets = 1; box.authored_text = ''; box.authored_empty = true;
  box.source_text_sha256 = require('node:crypto').createHash('sha256').update('').digest('hex');
  reader.NUMERIC_REPRESENTATION_PINS[box.anchor].source_text_sha256 = box.source_text_sha256;
  box.controller_numeric_representation_policy.source_text_sha256 = box.source_text_sha256;
  box.v8_numeric_representation_policy = {kind: 'times-v8-numeric-representation-v1', engine: 'v8', document: 'times',
    source_sha256: reader.GEOMETRY_SOURCE, anchor: box.anchor, source_class: 'flonum', runtime_class: 'number',
    ...plain(reader.NUMERIC_REPRESENTATION_PINS[box.anchor]), helper_sha256: plain(reader.GEOMETRY_HELPERS),
    evidence: plain(reader.V8_REPRESENTATION_EVIDENCE), format_method: 'getattr', format_attribute: 'format',
    format_representation: 'scalar-number', format_value: 6, getter_method: 'getvalueof',
    getter_representation: 'scalar-number', finite_required: true, initial_equality_action: 'install'};
}
for (const [index, cls] of [...Array(4).fill('number'), 'button', '*', '*', ...Array(4).fill('comment'), 'jsui', 'jsui'].entries()) {
  const id = 'synthetic-live-' + index, maxclass = cls === '*' ? 'newobj' : cls;
  const box = {id, anchor: 'root/obj-4/' + id, maxclass, runtime_class: cls, runtime_classes: [cls],
    rect: [index * 80, 400, 60, 20], outlets: cls === 'number' ? 2 : cls === 'comment' ? 0 : 1,
    inlets: cls === 'comment' ? 0 : cls === '*' ? 2 : 1, authored_text: cls === '*' ? '* synthetic' : '', authored_empty: cls !== '*'};
  box.source_text_sha256 = require('node:crypto').createHash('sha256').update(box.authored_text).digest('hex');
  liveDefinition.boxes.push(box);
  liveNumeric.push({varname: '__alive_help_' + id.replace(/-/g, '_'), maxclass: cls, getboxattr: () => box.rect,
    getvalueof: () => 13, patchcords: {inputs: [], outputs: []}});
}
liveDefinition.observer_leaves = [];
for (const [index, box] of liveDefinition.boxes.entries()) for (let port = 0; port < box.outlets; port++) {
  const leaf = {varname: '__alive_help_leaf_' + box.id.replace(/-/g, '_') + '_' + port, anchor: box.anchor, port};
  liveDefinition.observer_leaves.push(leaf);
  const object = {varname: leaf.varname, maxclass: 'js', getboxattr: () => [-4000, 40 * liveDefinition.observer_leaves.length, 40, 20],
    patchcords: {inputs: [], outputs: []}};
  const cord = {srcobject: liveNumeric[index], srcoutlet: port, dstobject: object, dstinlet: 0};
  liveNumeric[index].patchcords.outputs.push(cord); object.patchcords.inputs.push(cord); liveNumeric.push(object);
}
liveDefinition.saved_edges = [{index: 0, source: [liveDefinition.boxes[3].id, 0], destination: [liveDefinition.boxes[4].id, 0]}];
const originalCord = {srcobject: liveNumeric[3], srcoutlet: 0, dstobject: liveNumeric[4], dstinlet: 0};
liveNumeric[3].patchcords.outputs.push(originalCord); liveNumeric[4].patchcords.inputs.push(originalCord);
for (const [index, box] of liveDefinition.full_inventory.entries()) if (index > 1) {
  box.runtime_classes = ['patcher', 'p'];
  reader.TIMES_ROOT_REPRESENTATION_PINS[box.anchor].runtime_classes = ['patcher', 'p'];
  const liveRect = box.rect.map((v, i) => i === 3 ? v + 2 : v);
  const pin = {...plain(reader.TIMES_ROOT_REPRESENTATION_PINS[box.anchor]), live_rect_sha256: hash(liveRect)};
  delete pin.runtime_class; delete pin.runtime_classes;
  reader.V8_ROOT_REPRESENTATION_PINS[box.anchor] = pin;
  box.v8_root_representation_policy = {kind: 'times-v8-root-representation-v1', engine: 'v8', document: 'times',
    source_sha256: reader.GEOMETRY_SOURCE, anchor: box.anchor, source_class: 'newobj', source_runtime_class: 'patcher',
    runtime_class: 'jpatcher', ...pin, saved_rect: box.rect, live_rect: liveRect, source_varname: box.source_varname,
    helper_sha256: plain(reader.GEOMETRY_HELPERS), evidence: plain(reader.V8_REPRESENTATION_EVIDENCE),
    saved_incoming_routes: 0, saved_outgoing_routes: 0};
  box.saved_incoming_routes = box.saved_outgoing_routes = 0;
  liveRoots[index].getboxattr = () => liveRect;
}
liveDefinition.full_inventory.push(...plain(liveDefinition.boxes));
const liveBasic = linkObjects(liveNumeric); liveRoots[2].subpatcher = () => liveBasic;
const harnessSpecs = [['__alive_arithmetic_reader', 'v8', [-3000, -3000, 160, 133]],
  ['__alive_arithmetic_disposer', 'thispatcher', [-3100, -3000, 100, 22]],
  ['__alive_arithmetic_freebang', 'freebang', [-3200, -3000, 100, 22]],
  ['__alive_arithmetic_lifecycle_send', 'send', [-3400, -3000, 200, 64]]];
liveConfig.lifecycle.owners[0].channel = 'synthetic_channel';
for (const [varname, maxclass, rect] of harnessSpecs) liveRoots.push({varname, maxclass, valid: true,
  boxtext: maxclass === 'send' ? 'send synthetic_channel' : maxclass, getboxattr: () => rect, patchcords: {inputs: [], outputs: []}});
const closeCord = {srcobject: liveRoots[6], srcoutlet: 0, dstobject: liveRoots[7], dstinlet: 0};
liveRoots[6].patchcords.outputs.push(closeCord); liveRoots[7].patchcords.inputs.push(closeCord);
const liveRoot = {...linkObjects(liveRoots), filepath: liveDefinition.working_windows_path, parentpatcher: null,
  getnamed: () => liveRoots[2]};
const liveReadback = reader.collectReadback(liveRoot, liveDefinition, diagRequest, liveConfig);
assert.equal(liveReadback.numeric.length, 7);
assert.equal(liveReadback.boxes.length, 35);
assert.equal(liveReadback.v8_representation_witnesses.numeric.length, 3);
assert.equal(liveReadback.v8_representation_witnesses.roots.length, 2);
assert.ok(liveReadback.numeric.filter(v => v.source_class === 'flonum').every(v =>
  v.class_name === 'number' && v.semantic_tag_basis === 'source-flonum-and-live-v8-format6'));
assert.deepEqual(liveDefinition.boxes[0].runtime_classes, ['flonum']);
for (const mutation of ['format', 'array', 'class', 'rect', 'default', 'root-class', 'root-rect', 'policy']) {
  const object = liveNumeric[0], saved = {...object}, rootObject = liveRoots[2], savedRoot = {...rootObject};
  const policy = liveDefinition.boxes[0].v8_numeric_representation_policy;
  if (mutation === 'format') object.getattr = () => 5;
  if (mutation === 'array') object.getvalueof = () => [gateInitial];
  if (mutation === 'class') object.maxclass = 'flonum';
  if (mutation === 'rect') object.getboxattr = () => [1, 2, 3, 4];
  if (mutation === 'default') object.getvalueof = () => gateInitial + .25;
  if (mutation === 'root-class') rootObject.maxclass = 'patcher';
  if (mutation === 'root-rect') rootObject.getboxattr = () => liveDefinition.full_inventory[2].rect;
  if (mutation === 'policy') policy.evidence.raw_sha256 = 'f'.repeat(64);
  let error; try {reader.collectReadback(liveRoot, liveDefinition, diagRequest, liveConfig);} catch (e) {error = e;}
  assert.ok(error, mutation); if (mutation !== 'policy') {
    assert.equal(error.v8_representation_diagnostics.numeric_rows.length, 3);
    assert.equal(error.v8_representation_diagnostics.root_rows.length, 4);
  }
  Object.assign(object, saved); Object.assign(rootObject, savedRoot);
  policy.evidence = plain(reader.V8_REPRESENTATION_EVIDENCE);
}
liveNumeric[0].getvalueof = () => gateInitial + .25;
const eventRequest = {...diagRequest, command_id: 3, operation_request_id: 2, action: 'event', step_id: 'times-A01'};
assert.equal(reader.collectReadback(liveRoot, liveDefinition, eventRequest, liveConfig).numeric[0].value, gateInitial + .25);
const closeRequest = {op: 'operation', command_id: 4, document: 'times', action_revision: 1,
  source_sha256: reader.GEOMETRY_SOURCE, action: 'close', step_id: 'close-times-r1'};
const closeProof = reader.collectLifecycleProof(liveRoot, liveDefinition, closeRequest, liveConfig);
assert.equal(closeProof.v8_representation_witnesses.action, 'close');
assert.equal(closeProof.originals.filter(o => o.maxclass === 'jpatcher').length, 2);
const acceptedBasicCorruptions = [];
const droppedCloseDiagnostics = [];
const originalLeafCord = liveNumeric[3].patchcords.outputs[0], leafObject = liveNumeric[16];
const basicCorruptions = [
  ['nongated-class', liveNumeric[3], 'maxclass', 'toggle'],
  ['nongated-geometry', liveNumeric[3], 'getboxattr', () => [991, 992, 60, 20]],
  ['duplicate-original', liveNumeric[3], 'varname', liveNumeric[4].varname],
  ['unexpected-original', liveNumeric[3], 'varname', '__unexpected_original'],
  ['missing-original', liveNumeric[2], 'nextobject', liveNumeric[4]],
  ['missing-leaf', liveNumeric[15], 'nextobject', liveNumeric[17]],
  ['unexpected-leaf', leafObject, 'varname', '__unexpected_leaf'],
  ['leaf-class', leafObject, 'maxclass', 'toggle'],
  ['duplicate-leaf', liveNumeric[17], 'varname', leafObject.varname],
  ['input-duplicate', leafObject.patchcords, 'inputs', [...leafObject.patchcords.inputs, leafObject.patchcords.inputs[0]]],
  ['output-duplicate', liveNumeric[3].patchcords, 'outputs', [...liveNumeric[3].patchcords.outputs, originalLeafCord]],
  ['input-missing', leafObject.patchcords, 'inputs', []],
  ['output-missing', liveNumeric[3].patchcords, 'outputs', []],
  ['observer-inlet', originalLeafCord, 'dstinlet', 1],
  ['original-inlet', originalCord, 'dstinlet', 1],
  ['boolean-port', originalCord, 'srcoutlet', true],
  ['unknown-endpoint', originalCord, 'dstobject', {varname: '__unobserved_endpoint'}],
  ['source-port-bound', liveDefinition.saved_edges[0].source, '1', liveDefinition.boxes[3].outlets],
  ['source-text', liveDefinition.boxes[3], 'authored_text', 'changed'],
  ['source-empty', liveDefinition.boxes[3], 'authored_empty', false],
  ['source-inlet', liveDefinition.boxes[3], 'inlets', true],
  ['source-outlet', liveDefinition.boxes[3], 'outlets', true],
];
for (const [label, target, key, value] of basicCorruptions) {
  const saved = target[key]; target[key] = value;
  let accepted = false; try {reader.collectLifecycleProof(liveRoot, liveDefinition, closeRequest, liveConfig); accepted = true;} catch (error) {
    if (!error.v8_representation_diagnostics || error.v8_representation_diagnostics.numeric_rows.length !== 3 ||
      error.v8_representation_diagnostics.root_rows.length !== 4) droppedCloseDiagnostics.push(label);
  }
  target[key] = saved; if (accepted) acceptedBasicCorruptions.push(label);
}
assert.deepEqual(acceptedBasicCorruptions, [], 'fresh preclose must refuse every Basic retention corruption');
const nativeEndpoint = originalCord.dstobject; originalCord.dstobject = {varname: nativeEndpoint.varname};
assert.equal(reader.collectLifecycleProof(liveRoot, liveDefinition, closeRequest, liveConfig).basic_retention.boxes.length, 35,
  'patchcord endpoint binding uses the captured name without assuming JS wrapper identity');
originalCord.dstobject = nativeEndpoint;
const laterRootCorruptions = [
  ['root-harness-class', liveRoots[4], 'maxclass', 'toggle'],
  ['root-harness-geometry', liveRoots[4], 'getboxattr', () => [-3000, -3000, 161, 133]],
  ['root-route-inlet', closeCord, 'dstinlet', 1],
  ['root-input-multiplicity', liveRoots[7].patchcords, 'inputs', [closeCord, closeCord]],
  ['root-output-multiplicity', liveRoots[6].patchcords, 'outputs', [closeCord, closeCord]],
];
for (const [label, target, key, value] of laterRootCorruptions) {
  const saved = target[key]; target[key] = value;
  let refusal; try {reader.collectLifecycleProof(liveRoot, liveDefinition, closeRequest, liveConfig);} catch (error) {refusal = error;}
  target[key] = saved; assert.ok(refusal, label);
  if (!refusal.v8_representation_diagnostics || refusal.v8_representation_diagnostics.numeric_rows.length !== 3 ||
    refusal.v8_representation_diagnostics.root_rows.length !== 4) droppedCloseDiagnostics.push(label);
}
assert.deepEqual(droppedCloseDiagnostics, [], 'all later preclose failures must retain seven diagnostic rows');
assert.equal(closeProof.basic_retention.version, 'arithmetic-basic-retention-v1');
assert.equal(closeProof.basic_retention.boxes.length, 35);
assert.equal(closeProof.basic_retention.input_routes.length, 20);
assert.equal(closeProof.basic_retention.output_routes.length, 20);
assert.deepEqual(Object.keys(plain(closeProof.basic_retention)).sort(), ['version', 'request_id', 'operation_request_id',
  'step_id', 'action', 'document', 'revision', 'source_sha256', 'working_path', 'basic_varname', 'boxes', 'input_routes', 'output_routes'].sort());
for (const text of ['', 'synthetic ASCII', '\u03bb synthetic \ud83c\udf31']) {
  assert.equal(reader.sourceTextHash(text), require('node:crypto').createHash('sha256').update(text).digest('hex'));
}
liveNumeric[0].getattr = () => 5;
assert.throws(() => reader.collectLifecycleProof(liveRoot, liveDefinition, closeRequest, liveConfig));
liveNumeric[0].getattr = () => 6;
const freshCalls = [];
for (const [index, object] of liveNumeric.slice(0, 3).entries()) {
  object.getattr = () => {freshCalls.push('format-' + index); return 6;};
  object.getvalueof = () => {freshCalls.push('value-' + index); return gateInitial;};
  object.message = object.setvalueof = () => {throw Error('gate must never send an input or setter');};
}
for (const action of ['readback', 'readback', 'close']) {
  freshCalls.length = 0;
  if (action === 'close') reader.collectLifecycleProof(liveRoot, liveDefinition, closeRequest, liveConfig);
  else reader.collectReadback(liveRoot, liveDefinition, eventRequest, liveConfig);
  assert.deepEqual(freshCalls, ['format-0', 'value-0', 'format-1', 'value-1', 'format-2', 'value-2']);
}
const secondConfig = plain(liveConfig), secondDefinition = secondConfig.documents[0];
secondDefinition.revision = 2; secondDefinition.lifecycle_owner_inlet = 1;
secondDefinition.working_windows_path = 'Z:/synthetic/times-r2.maxhelp';
secondConfig.lifecycle.owners = [plain(liveConfig.lifecycle.owners[0]), {...plain(liveConfig.lifecycle.owners[0]),
  revision: 2, working_path: secondDefinition.working_windows_path}];
const secondRoot = {...liveRoot, filepath: secondDefinition.working_windows_path};
const secondInstall = {...diagRequest, command_id: 21, operation_request_id: 20, revision: 2, action_revision: 2, step_id: 'install-times-r2'};
assert.equal(reader.collectReadback(secondRoot, secondDefinition, secondInstall, secondConfig).v8_representation_witnesses.revision, 2);
const secondClose = {...closeRequest, command_id: 23, action_revision: 2, step_id: 'close-times-r2'};
assert.equal(reader.collectLifecycleProof(secondRoot, secondDefinition, secondClose, secondConfig).v8_representation_witnesses.revision, 2);
const secondBasic = reader.collectLifecycleProof(secondRoot, secondDefinition, secondClose, secondConfig).basic_retention;
assert.equal(secondBasic.request_id, 23); assert.equal(secondBasic.operation_request_id, 23);
assert.equal(secondBasic.revision, 2); assert.equal(secondBasic.working_path, secondDefinition.working_windows_path);
liveNumeric[1].getvalueof = () => [gateInitial];
assert.throws(() => reader.collectReadback(secondRoot, secondDefinition, {...secondInstall, action: 'event', step_id: 'times-A21'}, secondConfig));
assert.throws(() => reader.collectLifecycleProof(secondRoot, secondDefinition, secondClose, secondConfig));
liveNumeric[1].getvalueof = () => gateInitial;
for (const scope of ['root', 'numeric']) {
  freshCalls.length = 0;
  const overflow = {maxclass: 'comment', varname: '__overflow', getboxattr: () => [999, 999, 20, 20]};
  const tail = scope === 'root' ? liveRoots.at(-1) : liveNumeric.at(-1);
  tail.nextobject = overflow;
  let failure; try {reader.collectReadback(liveRoot, liveDefinition, eventRequest, liveConfig);} catch (error) {failure = error;}
  assert.ok(failure); assert.deepEqual(freshCalls, []);
  assert.equal(failure.v8_representation_diagnostics.root_rows.length, 4);
  assert.equal(failure.v8_representation_diagnostics.numeric_rows.length, 3);
  tail.nextobject = null;
}
const savedNongatedGetters = liveNumeric.slice(3).map(o => o.getvalueof);
for (const object of liveNumeric.slice(3)) object.getvalueof = () => {throw Error('preclose must not add nongated numeric getters');};
for (const [docIndex, document] of ['plus', 'minus'].entries()) for (const revision of [1, 2]) {
  const otherConfig = plain(liveConfig), otherDefinition = otherConfig.documents[0], inlet = 2 + docIndex * 2 + revision - 1;
  otherDefinition.document = document; otherDefinition.revision = revision; otherDefinition.lifecycle_owner_inlet = inlet;
  otherDefinition.source_sha256 = document === 'plus' ? 'd1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895' :
    '7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0';
  otherDefinition.working_windows_path = 'Z:/synthetic/' + document + '-r' + revision + '.maxhelp';
  for (const b of [...otherDefinition.boxes, ...otherDefinition.full_inventory]) {
    delete b.v8_numeric_representation_policy; delete b.v8_root_representation_policy; delete b.controller_numeric_representation_policy;
  }
  otherConfig.lifecycle.owners = Array.from({length: 6}, () => ({}));
  otherConfig.lifecycle.owners[inlet] = {document, revision, source_sha256: otherDefinition.source_sha256,
    working_path: otherDefinition.working_windows_path, channel: 'synthetic_channel'};
  const otherRoot = {...liveRoot, filepath: otherDefinition.working_windows_path};
  const otherRequest = {op: 'operation', action: 'close', document, action_revision: revision, command_id: 40 + inlet,
    source_sha256: otherDefinition.source_sha256, step_id: 'close-' + document + '-r' + revision};
  for (const object of liveNumeric.slice(0, 3)) object.maxclass = 'flonum';
  liveRoots[2].maxclass = liveRoots[3].maxclass = 'patcher';
  for (const b of otherDefinition.full_inventory.filter(b => b.runtime_class === 'patcher')) b.rect =
    liveRoots[b.source_varname === 'basic_tab' ? 2 : 3].getboxattr();
  freshCalls.length = 0;
  const otherProof = reader.collectLifecycleProof(otherRoot, otherDefinition, otherRequest, otherConfig);
  assert.equal(otherProof.basic_retention.document, document); assert.equal(otherProof.basic_retention.revision, revision);
  assert.equal(otherProof.basic_retention.boxes.length, 35); assert.equal(otherProof.v8_representation_witnesses, undefined);
  assert.deepEqual(freshCalls, [], 'plus/minus preclose must not acquire numeric getters');
  const oldClass = liveNumeric[3].maxclass; liveNumeric[3].maxclass = 'toggle';
  assert.throws(() => reader.collectLifecycleProof(otherRoot, otherDefinition, otherRequest, otherConfig));
  liveNumeric[3].maxclass = oldClass;
  const oldInlet = originalCord.dstinlet; originalCord.dstinlet = 1;
  assert.throws(() => reader.collectLifecycleProof(otherRoot, otherDefinition, otherRequest, otherConfig));
  originalCord.dstinlet = oldInlet;
  for (const object of liveNumeric.slice(0, 3)) object.maxclass = 'number';
  liveRoots[2].maxclass = liveRoots[3].maxclass = 'jpatcher';
}
liveNumeric.slice(3).forEach((object, index) => {object.getvalueof = savedNongatedGetters[index];});
// Restore the legacy diagnostic fixture's source-class pins.
for (const box of diagDefinition.full_inventory) reader.TIMES_ROOT_REPRESENTATION_PINS[box.anchor].runtime_classes = box.runtime_classes;
for (const box of diagDefinition.boxes) reader.NUMERIC_REPRESENTATION_PINS[box.anchor].source_text_sha256 = box.source_text_sha256;
for (const scenario of ['root-overflow', 'numeric-overflow', 'root-unavailable', 'numeric-unavailable', 'numeric-traversal-throw']) {
  const calls = [];
  const numericObjects = diagNumericObjects.map(object => ({...object,
    getattr() {calls.push('format'); return 6;}, getvalueof() {calls.push('value'); return [gateInitial];},
    message() {calls.push('input');}, setvalueof() {calls.push('setter');}}));
  const rootObjects = diagRootObjects.map(object => ({...object}));
  const extra = index => ({maxclass: 'comment', varname: '__synthetic_extra_' + index,
    getboxattr: () => [1000 + 80 * index, 400, 60, 20], nextobject: null});
  if (scenario === 'numeric-overflow') numericObjects.push(extra(0), {...numericObjects[0]});
  const basic = linkObjects(numericObjects);
  if (scenario === 'numeric-traversal-throw') Object.defineProperty(numericObjects[1], 'nextobject', {
    get() {throw Error('synthetic traversal unavailable');}});
  rootObjects[2].subpatcher = () => {
    calls.push('basic-child'); return scenario === 'numeric-unavailable' ? undefined : basic;
  };
  if (scenario === 'root-overflow') rootObjects.push(...Array.from({length: 5}, (_, index) => extra(index)), {...rootObjects[2]});
  const root = {...diagRoot, ...linkObjects(rootObjects)};
  if (scenario === 'root-unavailable') root.firstobject = undefined;
  const overflow = reader.collectRepresentationDiagnostics(root, diagDefinition, diagRequest, diagConfig);
  assert.deepEqual(calls.filter(call => call !== 'basic-child'), [], `${scenario} must suppress all numeric capability probes`);
  if (scenario.startsWith('root-')) assert.deepEqual(calls, [], 'incomplete root coverage must not derive Basic from a prefix');
  assert.equal(overflow.strict_mismatch, true);
  assert.equal(overflow.numeric_rows.length, 3); assert.equal(overflow.root_rows.length, 4);
  assert.equal(overflow.inventory_complete, false);
  assert.equal(overflow.inventory_coverage[scenario.startsWith('root-') ? 'root' : 'numeric'].complete, false);
  for (const row of [...overflow.root_rows, ...overflow.numeric_rows]) {
    assert.equal(row.candidate_count, null, 'incomplete required coverage cannot assert a complete match count');
    assert.equal(row.candidate_count_complete, false);
    assert.equal(row.actual_runtime_class, null); assert.equal(row.live_rect, null);
    assert.equal(typeof row.observed_candidate_count, 'number');
  }
  assert.ok(overflow.numeric_rows.every(row => row.value_observation.value === null && row.format_observation.value === null));
  let refusal;
  try {reader.collectReadback(root, diagDefinition, diagRequest, diagConfig);} catch (error) {refusal = error;}
  assert.equal(refusal.v8_representation_diagnostics.numeric_rows.length, 3);
  assert.equal(refusal.v8_representation_diagnostics.root_rows.length, 4);
}
diagNumericObjects[0].getvalueof = () => {throw Error('synthetic unavailable');};
diagNumericObjects[1].getattr = undefined;
diagNumericObjects[2].varname = '__missing';
const unknownDiag = reader.collectRepresentationDiagnostics(diagRoot, diagDefinition, diagRequest, diagConfig);
assert.equal(unknownDiag.numeric_rows[0].value_observation.status, 'threw');
assert.equal(unknownDiag.numeric_rows[1].format_observation.status, 'unavailable');
assert.equal(unknownDiag.numeric_rows[2].value_observation.value, null);
const duplicate = {...diagNumericObjects[0], nextobject: null};
diagNumericObjects[2].nextobject = duplicate;
const duplicateDiag = reader.collectRepresentationDiagnostics(diagRoot, diagDefinition, diagRequest, diagConfig);
assert.equal(duplicateDiag.numeric_rows[0].candidate_count, null);
assert.equal(duplicateDiag.numeric_rows[0].observed_candidate_count, 2);
assert.equal(duplicateDiag.numeric_rows[0].value_observation.value, null);
assert.throws(() => reader.collectRepresentationDiagnostics(diagRoot, diagDefinition, {...diagRequest, operation_request_id: 0}, diagConfig));
assert.throws(() => reader.collectRepresentationDiagnostics(diagRoot, {...diagDefinition, source_sha256: 'f'.repeat(64)}, diagRequest, diagConfig));

function memoryFile(memory) {
  return function File(file, mode) {
    let content = mode === 'write' ? '' : memory.get(file) || '';
    this.isopen = memory.has(file) || mode === 'write'; this.position = 0;
    Object.defineProperty(this, 'eof', {get() { return content.length; }, set(length) { content = content.slice(0, length); }});
    this.readstring = length => {const result = content.slice(this.position, this.position + length); this.position += result.length; return result;};
    this.writestring = value => {assert.ok(value.length <= 4096); content = content.slice(0, this.position) + value + content.slice(this.position + value.length); this.position += value.length;};
    this.writeline = value => {assert.ok(value.length <= 32768, 'large private JSON must avoid the Max line limit'); this.writestring(value + '\n');};
    this.readline = () => {const line = content.slice(this.position).split('\n')[0]; assert.ok(line.length <= 32768); this.position += line.length + 1; return line;};
    this.close = () => {if (mode !== 'read') memory.set(file, content);};
  };
}
const diagnosticMemory = new Map();
const diagnosticCommand = {...diagRequest, output_path: 'Z:/synthetic/failed-readback.json'};
diagnosticMemory.set('Z:/synthetic/config.json', JSON.stringify({...diagConfig, command_path: 'Z:/synthetic/command.json'}));
diagnosticMemory.set('Z:/synthetic/command.json', JSON.stringify(diagnosticCommand));
reader.File = memoryFile(diagnosticMemory); reader.documentName = 'times'; reader.revision = 1;
reader.checkpoint.call({patcher: diagRoot}, 2, 'install-times-r1');
const failedReadback = JSON.parse(diagnosticMemory.get(diagnosticCommand.output_path));
assert.equal(failedReadback.success, false);
assert.equal(failedReadback.v8_representation_diagnostics.numeric_rows.length, 3);
assert.equal(failedReadback.v8_representation_diagnostics.root_rows.length, 4);
const closeMemory = new Map(), closePath = 'Z:/synthetic/failed-close-proof.json';
for (const box of liveDefinition.full_inventory.filter(b => b.anchor.split('/').length === 2)) reader.TIMES_ROOT_REPRESENTATION_PINS[box.anchor].runtime_classes = box.runtime_classes;
for (const box of liveDefinition.boxes.filter(b => b.maxclass === 'flonum')) reader.NUMERIC_REPRESENTATION_PINS[box.anchor].source_text_sha256 = box.source_text_sha256;
liveConfig.lifecycle.owners[0].root_proof_path = closePath;
closeMemory.set('Z:/synthetic/config.json', JSON.stringify({...liveConfig, command_path: 'Z:/synthetic/command.json'}));
closeMemory.set('Z:/synthetic/command.json', JSON.stringify(closeRequest));
reader.File = memoryFile(closeMemory); liveNumeric[0].getattr = () => 5;
reader.lifecycleproof.call({patcher: liveRoot}, 4, 'close-times-r1');
const failedClose = JSON.parse(closeMemory.get(closePath));
assert.equal(failedClose.success, false);
assert.equal(failedClose.v8_representation_diagnostics.numeric_rows.length, 3);
assert.equal(failedClose.v8_representation_diagnostics.root_rows.length, 4);
liveNumeric[0].getattr = () => 6;
for (const [label, target, key, value] of [...basicCorruptions.slice(0, 17), ...laterRootCorruptions]) {
  const saved = target[key]; target[key] = value;
  reader.lifecycleproof.call({patcher: liveRoot}, 4, 'close-times-r1');
  const serializedFailure = JSON.parse(closeMemory.get(closePath)); target[key] = saved;
  assert.equal(serializedFailure.success, false, label);
  assert.equal(serializedFailure.v8_representation_diagnostics.numeric_rows.length, 3, label);
  assert.equal(serializedFailure.v8_representation_diagnostics.root_rows.length, 4, label);
}
reader.lifecycleproof.call({patcher: liveRoot}, 4, 'close-times-r1');
const serializedSuccess = JSON.parse(closeMemory.get(closePath));
assert.equal(serializedSuccess.basic_retention.version, 'arithmetic-basic-retention-v1');
assert.equal(serializedSuccess.basic_retention.boxes.length, 35);
assert.equal(serializedSuccess.basic_retention.input_routes.length, 20);
assert.equal(serializedSuccess.basic_retention.output_routes.length, 20);
for (const box of diagDefinition.full_inventory) reader.TIMES_ROOT_REPRESENTATION_PINS[box.anchor].runtime_classes = box.runtime_classes;
for (const box of diagDefinition.boxes) reader.NUMERIC_REPRESENTATION_PINS[box.anchor].source_text_sha256 = box.source_text_sha256;
const transportMemory = new Map();
reader.File = memoryFile(transportMemory);
const large = {synthetic: 'original synthetic fixture '.repeat(4000)};
reader.writePrivate('Z:/synthetic/raw.json', large);
assert.deepEqual(plain(reader.readPrivate('Z:/synthetic/raw.json')), large);
assert.throws(() => reader.readPrivate('Z:/synthetic/missing.json'));
const observerMemory = new Map();
observerMemory.set('Z:/synthetic/config.json', JSON.stringify({global_name: 'synthetic',
  journal_path: 'Z:/synthetic/journal.jsonl', padding: large.synthetic,
  documents: [{document: 'times', revision: 1, source_sha256: 'a'.repeat(64),
    boxes: [{anchor: 'root/synthetic/value', outlets: 2}]}]}));
observerMemory.set('Z:/synthetic/journal.jsonl', '');
const shared = {seq: 0, request_id: 7, step_id: 'synthetic', action: 'event',
  action_document: 'times', action_revision: 1, dispatch_active: 1};
const outletObserver = helper('observer.js', {File: memoryFile(observerMemory),
  jsarguments: ['js', 'Z:/synthetic/config.json', 'times', 1, 'root/synthetic/value', 0],
  Global: function() {return shared;}, arrayfromargs: value => Array.from(value)});
assert.equal(outletObserver.inlets, 1); assert.equal(outletObserver.outlets, 0);
outletObserver.msg_float(7); outletObserver.msg_int(-3);
const outletRows = observerMemory.get('Z:/synthetic/journal.jsonl').trim().split('\n').map(line => JSON.parse(line));
assert.deepEqual(outletRows.map(row => [row.message.selector, row.message.atoms[0].tag]), [['float', 'float'], ['int', 'int']]);
assert.ok(outletRows.every(row => row.source_sha256 === 'a'.repeat(64) && row.synchronous_dispatch_active === true));
assert.deepEqual(outletRows.map(row => row.seq), [1, 2]);

function lifecycleHarness() {
  const memory = new Map(), configPath = 'Z:/synthetic/config.json', reportPath = 'Z:/synthetic/lifecycle-report.json';
  const owners = ['times', 'plus', 'minus'].flatMap(document => [1, 2].map(revision => ({document, revision})));
  owners.forEach((owner, inlet) => Object.assign(owner, {inlet, channel: `synthetic_channel_${inlet}`}));
  const inventory = [{varname: '__alive_arithmetic_controller', maxclass: 'js', boxtext: 'js synthetic.js', rect: [0, 0, 80, 20]},
    {varname: '__alive_arithmetic_lifecycle_observer', maxclass: 'v8', boxtext: 'v8 synthetic.js', rect: [0, 30, 80, 20]},
    ...owners.map(owner => ({varname: `__alive_arithmetic_lifecycle_receive_${owner.inlet}`, maxclass: 'receive',
      boxtext: `receive ${owner.channel}`, rect: [0, 60 + 30 * owner.inlet, 80, 20]}))];
  memory.set(configPath, JSON.stringify({lifecycle: {version: 'arithmetic-freebang-v1', monitor_epoch: 'e'.repeat(48),
    owners, driver_inventory: inventory, report_path: reportPath}}));
  const boxes = inventory.map(entry => ({...entry, valid: true, getboxattr() { return this.rect; }, patchcords: {inputs: [], outputs: []}}));
  boxes.forEach((box, index) => { box.nextobject = boxes[index + 1] || null; });
  owners.forEach(owner => {
    const edge = {srcobject: boxes[2 + owner.inlet], srcoutlet: 0, dstobject: boxes[1], dstinlet: owner.inlet + 1};
    boxes[2 + owner.inlet].patchcords.outputs.push(edge); boxes[1].patchcords.inputs.push(edge);
  });
  const context = helper('lifecycle-observer.js', {File: memoryFile(memory), patcher: {firstobject: boxes[0]}, inlet: 0});
  const control = (kind, inlet, request, step) => {context.inlet = 0; context.lifecyclecontrol(kind, inlet, request, step); return JSON.parse(memory.get(reportPath));};
  return {context, owners, control, report: () => JSON.parse(memory.get(reportPath))};
}
const monitor = lifecycleHarness();
assert.equal(monitor.context.inlets, 7); assert.equal(monitor.context.outlets, 0);
assert.deepEqual(monitor.control('attest', -1, 0, 'startup').observer_report.failures, []);
monitor.owners.forEach((owner, inlet) => {
  const request = 100 + inlet, step = `close-${owner.document}-r${owner.revision}`;
  for (const kind of ['arm', 'dispatch-start']) monitor.control(kind, inlet, request, step);
  monitor.context.inlet = inlet + 1; monitor.context.bang();
  for (const kind of ['dispatch-return', 'close-validated']) monitor.control(kind, inlet, request, step);
  assert.deepEqual(monitor.report().observer_report.failures, []);
});
const completed = monitor.control('barrier', -1, 900, 'capture-complete');
assert.equal(completed.observer_report.sealed, true);
assert.ok(completed.observer_report.states.every(state => state.state === 'closed' && state.witness_count === 1));
const premature = lifecycleHarness();
assert.ok(premature.control('barrier', -1, 900, 'capture-complete').observer_report.failures.length);
const late = lifecycleHarness();
late.control('attest', -1, 0, 'startup'); late.context.inlet = 1; late.context.bang();
assert.ok(late.report().observer_report.failures.includes('unexpected-notification'));
console.log('arithmetic helpers: typed dispatch, strict geometry/getters, six-owner automatic-close monitor pass');

// Removing the plus dispatch or exact metadata checks must break these gates.
for (const name of ['controller.js', 'v8-readback.js']) {
  const context = helper(name);
  assert.equal(typeof context.PLUS_SOURCE, 'string', `${name}: separate capture004 plus binding missing`);
  for (const [index, [anchor, originalPin]] of Object.entries(plain(context.PLUS_GEOMETRY_PINS)).entries()) {
    const saved = [index * 80, 8, 40, 20], live = [...saved]; live[originalPin.changed_dimension] += 2;
    const pin = {...originalPin, saved_rect_sha256: hash(saved), live_rect_sha256: hash(live)};
    context.PLUS_GEOMETRY_PINS = {[anchor]: pin};
    const definition = {document: 'plus', source_sha256: context.PLUS_SOURCE, helper_sha256: plain(context.GEOMETRY_HELPERS)};
    const configuration = {helpers: Object.entries(context.GEOMETRY_HELPERS).map(([name, sha256]) => ({name, sha256}))};
    const expected = {anchor, maxclass: pin.runtime_class === 'jsui' ? 'jsui' : 'newobj', runtime_class: pin.runtime_class,
      rect: saved, source_box_sha256: pin.source_box_sha256, source_text_sha256: pin.source_text_sha256,
      saved_incoming_routes: 0, saved_outgoing_routes: 0};
    expected.observed_geometry_policy = {kind: 'plus-observed-geometry-v1', document: 'plus', source_sha256: context.PLUS_SOURCE,
      anchor, ...pin, saved_rect: saved, live_rect: live, helper_sha256: plain(context.GEOMETRY_HELPERS),
      evidence: plain(context.PLUS_EVIDENCE), saved_incoming_routes: 0, saved_outgoing_routes: 0};
    assert.deepEqual(plain(context.observedGeometryPolicy(expected, definition, configuration)), expected.observed_geometry_policy);
    for (const mutation of ['times', 'minus', 'source', 'helper', 'anchor', 'box', 'text', 'saved', 'live', 'axis', 'route', 'class', 'source-class', 'evidence']) {
      const e = plain(expected), d = plain(definition), c = plain(configuration);
      if (['times', 'minus'].includes(mutation)) d.document = mutation;
      if (mutation === 'source') d.source_sha256 = 'f'.repeat(64);
      if (mutation === 'helper') c.helpers[0].sha256 = 'f'.repeat(64);
      if (mutation === 'anchor') e.anchor = 'root/unobserved';
      if (mutation === 'box') e.source_box_sha256 = 'f'.repeat(64);
      if (mutation === 'text') e.source_text_sha256 = 'f'.repeat(64);
      if (mutation === 'saved') e.rect[0] += .001;
      if (mutation === 'live') e.observed_geometry_policy.live_rect[pin.changed_dimension] += .001;
      if (mutation === 'axis') e.observed_geometry_policy.live_rect[0] += 1;
      if (mutation === 'route') e.saved_outgoing_routes = 1;
      if (mutation === 'class') e.runtime_class = 'number';
      if (mutation === 'source-class') e.maxclass = 'number';
      if (mutation === 'evidence') e.observed_geometry_policy.evidence.audit_sha256 = 'f'.repeat(64);
      assert.throws(() => context.observedGeometryPolicy(e, d, c), `${name}:${anchor}:${mutation}`);
    }
  }
}

function plusPreflightFixture(revision = 1) {
  const context = helper('controller.js'), calls = [], scopes = {'root': [], 'root/obj-2': [], 'root/obj-3': []};
  assert.equal(typeof context.PLUS_NUMERIC_PINS, 'object', 'Plus diagnostic-only source pins missing');
  const geometry = plain(context.PLUS_GEOMETRY_PINS), numeric = plain(context.PLUS_NUMERIC_PINS), inventory = [];
  const add = (anchor, cls, extra = {}) => {
    const rect = [inventory.length * 80, 8, 40, 20];
    const expected = {anchor, maxclass: ['js', 'patcher'].includes(cls) ? 'newobj' : cls,
      runtime_class: cls, runtime_classes: cls === 'patcher' ? ['patcher', 'p'] : [cls], rect,
      source_box_sha256: hash(anchor), source_text_sha256: hash('synthetic'), child: cls === 'patcher',
      saved_incoming_routes: 0, saved_outgoing_routes: 0, ...extra};
    const object = {maxclass: cls, live: [...rect], getboxattr() {return this.live;}, nextobject: null,
      message() {assert.fail('plus preflight sent input');}, setvalueof() {assert.fail('plus preflight set value');}};
    if (expected.child) {
      expected.source_varname = anchor === 'root/obj-2' ? 'basic_tab' : 'q_tab';
      object.varname = expected.source_varname; object.subpatcher = () => ({firstobject: scopes[anchor][0] || null});
    }
    if (geometry[anchor]) {
      const pin = geometry[anchor]; object.live[pin.changed_dimension] += 2;
      pin.saved_rect_sha256 = hash(rect); pin.live_rect_sha256 = hash(object.live);
      Object.assign(expected, {source_box_sha256: pin.source_box_sha256, source_text_sha256: pin.source_text_sha256});
      expected.observed_geometry_policy = {kind: 'plus-observed-geometry-v1', document: 'plus', source_sha256: context.PLUS_SOURCE,
        anchor, ...pin, saved_rect: rect, live_rect: object.live, helper_sha256: plain(context.GEOMETRY_HELPERS),
        evidence: plain(context.PLUS_EVIDENCE), saved_incoming_routes: 0, saved_outgoing_routes: 0};
    }
    if (numeric[anchor]) {
      const pin = numeric[anchor]; pin.saved_rect_sha256 = hash(rect);
      Object.assign(expected, {source_box_sha256: pin.source_box_sha256, source_text_sha256: pin.source_text_sha256});
      object.maxclass = 'number'; object.getattr = attribute => {assert.equal(attribute, 'format'); calls.push([anchor, 'format']); return 6;};
      object.getvalueof = () => {calls.push([anchor, 'value']); return [123.5];};
    }
    inventory.push(expected); scopes[anchor.slice(0, anchor.lastIndexOf('/'))].push(object);
    return {expected, object};
  };
  add('root/obj-1', 'js'); add('root/obj-2', 'patcher'); add('root/obj-3', 'patcher'); add('root/obj-4', 'jsui');
  add('root/obj-2/obj-4', 'jsui');
  const targets = Object.keys(numeric).map(anchor => add(anchor, 'flonum'));
  for (let i = 0; i < 12; i++) add(`root/obj-2/synthetic-${i}`, 'comment');
  for (const objects of Object.values(scopes)) objects.forEach((o, i) => {o.nextobject = objects[i + 1] || null;});
  context.PLUS_GEOMETRY_PINS = geometry; context.PLUS_NUMERIC_PINS = numeric;
  const definition = {document: 'plus', revision, source_sha256: context.PLUS_SOURCE, helper_sha256: plain(context.GEOMETRY_HELPERS),
    working_windows_path: `Z:/synthetic/plus-r${revision}.maxhelp`, lifecycle_owner_inlet: revision + 1, full_inventory: inventory};
  const owners = []; owners[revision + 1] = {inlet: revision + 1, document: 'plus', revision, source_sha256: context.PLUS_SOURCE, working_path: definition.working_windows_path};
  context.config = {helpers: Object.entries(context.GEOMETRY_HELPERS).map(([name, sha256]) => ({name, sha256})), documents: [definition], lifecycle: {owners}};
  context.shared = {request_id: 51, step_id: `install-plus-r${revision}`, action: 'install', action_document: 'plus', action_revision: revision};
  return {context, calls, definition, targets, scopes, root: {firstobject: scopes.root[0], filepath: definition.working_windows_path, parentpatcher: null}};
}
for (const revision of [1, 2]) {
  const f = plusPreflightFixture(revision);
  assert.throws(() => f.context.validateTree(f.root, f.definition), /aggregate-original-hierarchy-preflight-failed/);
  assert.equal(f.calls.length, 6, 'exact three plus controls each read format and value');
  assert.equal(f.context.anchorDiagnostics.length, 3); assert.equal(f.context.geometryDispositions.length, 4);
  assert.equal(f.context.controllerRepresentationObservations.length, 0); assert.equal(f.context.numericModeObservations.length, 0);
  for (const row of f.context.anchorDiagnostics) {
    const observation = row.numeric_preflight_observation;
    assert.equal(observation.source_class, 'flonum'); assert.equal(observation.runtime_class, 'number');
    assert.equal(observation.format_observation.value, 6); assert.equal(observation.value_observation.representation, 'singleton-number-array');
    assert.equal(observation.receipt_tag_observed, false);
  }
  assert.ok(f.targets.every(t => t.expected.runtime_classes.join(',') === 'flonum'));
  assert.throws(() => f.context.numericPreflightObservation(f.targets[0].object, f.targets[0].expected, f.definition),
    'direct diagnostic calls cannot reuse a completed inventory context');
  assert.equal(f.calls.length, 6);
}
for (const mutation of ['times', 'minus', 'source', 'helper', 'box', 'text', 'saved', 'live', 'class', 'request', 'infinite-request',
  'step', 'revision', 'owner', 'owner-path', 'root-path', 'owner-source', 'document-duplicate', 'candidate-duplicate', 'missing', 'extra', 'child', 'evidence', 'missing-policy']) {
  const f = plusPreflightFixture(), {context: c, definition: d, targets} = f, target = targets[0];
  if (['times', 'minus'].includes(mutation)) d.document = mutation;
  if (mutation === 'source') d.source_sha256 = 'f'.repeat(64);
  if (mutation === 'helper') c.config.helpers[0].sha256 = 'f'.repeat(64);
  if (mutation === 'box') target.expected.source_box_sha256 = 'f'.repeat(64);
  if (mutation === 'text') target.expected.source_text_sha256 = 'f'.repeat(64);
  if (mutation === 'saved') target.expected.rect[0] += .001;
  if (mutation === 'live') target.object.live[0] += .001;
  if (mutation === 'class') target.object.maxclass = 'flonum';
  if (mutation === 'request') c.shared.request_id = 1.25;
  if (mutation === 'infinite-request') c.shared.request_id = Infinity;
  if (mutation === 'step') c.shared.step_id = 'install-times-r1';
  if (mutation === 'revision') d.revision = 3;
  if (mutation === 'owner') d.lifecycle_owner_inlet = 3;
  if (mutation === 'owner-path') c.config.lifecycle.owners[2].working_path = 'Z:/wrong.maxhelp';
  if (mutation === 'root-path') f.root.filepath = 'Z:/wrong.maxhelp';
  if (mutation === 'owner-source') c.config.lifecycle.owners[2].source_sha256 = 'f'.repeat(64);
  if (mutation === 'document-duplicate') c.config.documents.push(d);
  if (mutation === 'candidate-duplicate') f.scopes['root/obj-2'][0].live = [...target.object.live];
  if (mutation === 'missing') f.scopes['root/obj-2'].at(-2).nextobject = null;
  if (mutation === 'extra') f.scopes['root/obj-2'].at(-1).nextobject = {maxclass: 'comment', nextobject: null};
  if (mutation === 'child') f.scopes.root[1].varname = 'wrong';
  if (mutation === 'evidence') d.full_inventory[0].observed_geometry_policy.evidence.audit_sha256 = 'f'.repeat(64);
  if (mutation === 'missing-policy') {
    delete d.full_inventory[0].observed_geometry_policy;
    f.scopes.root[0].live = [...d.full_inventory[0].rect];
  }
  assert.throws(() => c.validateTree(f.root, d), `${mutation}: plus install must refuse`);
  assert.deepEqual(f.calls, [], `${mutation}: all plus probes must be suppressed before any capability call`);
}
for (const [value, want] of [[undefined, 'undefined'], [null, 'null'], [[1, 2], 'ambiguous-array'], [Infinity, 'nonfinite'], ['x', 'other'], [123.5, 'scalar-number']]) {
  const f = plusPreflightFixture(); f.targets[0].object.getvalueof = () => value;
  assert.throws(() => f.context.validateTree(f.root, f.definition));
  assert.equal(f.context.anchorDiagnostics[0].numeric_preflight_observation.value_observation.representation, want);
}
for (const outcome of ['unavailable', 'threw', 'property-threw']) {
  const f = plusPreflightFixture(), object = f.targets[0].object;
  if (outcome === 'unavailable') {object.getattr = undefined; object.getvalueof = undefined;}
  if (outcome === 'threw') {object.getattr = object.getvalueof = () => {throw Error('synthetic unavailable');};}
  if (outcome === 'property-threw') {
    for (const method of ['getattr', 'getvalueof']) Object.defineProperty(object, method, {get() {throw Error('synthetic property unavailable');}});
  }
  assert.throws(() => f.context.validateTree(f.root, f.definition));
  const observation = f.context.anchorDiagnostics[0].numeric_preflight_observation;
  for (const key of ['format_observation', 'value_observation']) {
    assert.equal(observation[key].status, outcome === 'unavailable' ? 'unavailable' : 'threw');
    assert.equal(observation[key].value, null);
  }
}
const plusFailure = plusPreflightFixture(), plusMemory = new Map([['Z:/synthetic/journal.jsonl', '']]);
plusFailure.context.File = memoryFile(plusMemory); plusFailure.context.shared.seq = 0;
plusFailure.context.config.ack_path = 'Z:/synthetic/ack.json'; plusFailure.context.config.journal_path = 'Z:/synthetic/journal.jsonl';
assert.throws(() => plusFailure.context.validateTree(plusFailure.root, plusFailure.definition));
plusFailure.context.fail({command_id: 51}, Error('synthetic later failure'));
const plusSerialized = JSON.parse(plusMemory.get('Z:/synthetic/ack.json'));
assert.equal(plusSerialized.success, false); assert.equal(plusSerialized.anchor_diagnostics.length, 3);
assert.equal(plusSerialized.geometry_dispositions.length, 4);
assert.ok(plusSerialized.anchor_diagnostics.every(row => row.numeric_preflight_observation));
assert.deepEqual(plusSerialized.controller_representation_observations, []); assert.deepEqual(plusSerialized.numeric_mode_observations, []);
console.log('capture004 plus: four exact geometry gates and three diagnostic-only probes pass');

function serializePlusRefusal(fixture, error) {
  const memory = new Map([['Z:/synthetic/journal.jsonl', '']]), context = fixture.context;
  context.File = memoryFile(memory); context.shared.seq = 0;
  context.config.ack_path = 'Z:/synthetic/fix1-ack.json'; context.config.journal_path = 'Z:/synthetic/journal.jsonl';
  context.fail({command_id: 51}, error);
  return JSON.parse(memory.get(context.config.ack_path));
}
const fix1Invalid = [];
for (const revision of [1, 2]) {
  const variants = ['nested-root', 'unknown-parent', 'throwing-parent', 'missing-owner-inlet', 'boolean-owner-inlet', 'wrong-owner-inlet'];
  const anchors = Object.keys(plain(helper('controller.js').PLUS_GEOMETRY_PINS));
  for (const variant of [...variants, ...anchors]) {
    const f = plusPreflightFixture(revision), owner = f.context.config.lifecycle.owners[revision + 1];
    if (variant === 'nested-root') f.root.parentpatcher = {};
    if (variant === 'unknown-parent') delete f.root.parentpatcher;
    if (variant === 'throwing-parent') Object.defineProperty(f.root, 'parentpatcher', {get() {throw Error('synthetic parent unavailable');}});
    if (variant === 'missing-owner-inlet') delete owner.inlet;
    if (variant === 'boolean-owner-inlet') owner.inlet = true;
    if (variant === 'wrong-owner-inlet') owner.inlet = 99;
    if (anchors.includes(variant)) {
      const index = f.definition.full_inventory.findIndex(box => box.anchor === variant), expected = f.definition.full_inventory[index];
      const scope = variant.slice(0, variant.lastIndexOf('/'));
      const scopeBoxes = f.definition.full_inventory.filter(box => box.anchor.slice(0, box.anchor.lastIndexOf('/')) === scope);
      const object = f.scopes[scope][scopeBoxes.indexOf(expected)];
      object.live = [...expected.rect]; object.live[0] += .005;
    }
    let failure; try {f.context.validateTree(f.root, f.definition);} catch (error) {failure = error;}
    assert.ok(failure, `plus revision${revision}:${variant}: install must refuse`);
    const directObservations = f.context.anchorDiagnostics.filter(row => row.numeric_preflight_observation).length;
    const ack = serializePlusRefusal(f, failure);
    assert.equal(ack.success, false); assert.ok(ack.anchor_diagnostics.length >= 3);
    assert.equal(ack.geometry_dispositions.length, anchors.includes(variant) ? 3 : 4,
      'retain only the geometry dispositions actually collected');
    assert.deepEqual(ack.numeric_mode_observations, []); assert.deepEqual(ack.controller_representation_observations, []);
    fix1Invalid.push({revision, variant, calls: f.calls.length, directObservations,
      serializedObservations: ack.anchor_diagnostics.filter(row => row.numeric_preflight_observation).length});
  }
  for (const anchor of anchors) {
    const f = plusPreflightFixture(revision), expected = f.definition.full_inventory.find(box => box.anchor === anchor);
    const scope = anchor.slice(0, anchor.lastIndexOf('/'));
    const scopeBoxes = f.definition.full_inventory.filter(box => box.anchor.slice(0, box.anchor.lastIndexOf('/')) === scope);
    f.scopes[scope][scopeBoxes.indexOf(expected)].live = [...expected.rect];
    assert.throws(() => f.context.validateTree(f.root, f.definition));
    assert.equal(f.calls.length, 6, 'exact saved plus geometry remains permitted');
    assert.equal(f.context.geometryDispositions.length, 3);
    assert.equal(f.context.anchorDiagnostics.filter(row => row.numeric_preflight_observation).length, 3);
  }
}
const nearSavedTimes = {maxclass: 'jsui', nextobject: null, getboxattr: () => [4.005, 8, 40, 20]};
const timesTolerance = helper('controller.js'); timesTolerance.TIMES_GEOMETRY_PINS = {[measuredAnchor]: syntheticPin};
timesTolerance.config = gateConfig;
assert.equal(timesTolerance.resolve({firstobject: nearSavedTimes}, measuredExpected, measuredDefinition, []), nearSavedTimes,
  'the plus correction must retain existing times saved-geometry tolerance');
console.log(JSON.stringify({fix1IdentityCases: 12, fix1GeometryCases: 8,
  invalidCasesWithCalls: fix1Invalid.filter(row => row.calls !== 0).length,
  directCasesWithObservations: fix1Invalid.filter(row => row.directObservations !== 0).length,
  serializedCasesWithObservations: fix1Invalid.filter(row => row.serializedObservations !== 0).length}));
assert.ok(fix1Invalid.every(row => row.calls === 0 && row.directObservations === 0 && row.serializedObservations === 0),
  'every invalid plus identity/geometry case must suppress calls and numeric observations');

// Catch missing/private trace boundaries without replacing validation or capability logic.
function installTraceFixture(options = {}) {
  const f = plusPreflightFixture(), c = f.context, memory = new Map([['Z:/synthetic/journal.jsonl', '']]);
  let now = 0, polls = 0, openCalls = 0, propertyReads = 0, geometryReads = 0;
  const queue = [], schedules = [], fileActivity = [], tracePath = 'Z:/synthetic/install-plus-r1-trace.jsonl';
  const command = {command_id: 51, op: 'operation', action: 'install', document: 'plus', revision: 1,
    action_revision: 1, step_id: 'install-plus-r1', source_sha256: c.PLUS_SOURCE, ...options.command};
  Object.assign(c.config, {ack_path: 'Z:/synthetic/ack.json', journal_path: 'Z:/synthetic/journal.jsonl',
    command_path: 'Z:/synthetic/command.json', global_name: 'synthetic'});
  memory.set(c.config.command_path, JSON.stringify(command));
  const OriginalFile = memoryFile(memory);
  c.File = function(file, mode) {
    fileActivity.push([file, mode]);
    if (file === tracePath && options.sinkFailure && options.sinkFailure(mode, memory.get(file) || ''))
      throw Error('synthetic trace sink failure');
    return new OriginalFile(file, mode);
  };
  c.Date = function() {this.getTime = () => now;};
  c.Task = function(fn, owner) {this.fn = fn; this.owner = owner;};
  c.Task.prototype.schedule = function(delay) {schedules.push(delay); queue.push({at: now + delay, fn: this.fn, owner: this.owner});};
  c.max = {message(...args) {
    openCalls++; assert.equal(args[0], 'openfile'); assert.equal(args[2], f.definition.working_windows_path);
    if (options.open) options.open(f);
  }};
  Object.defineProperty(c.max, 'frontpatcher', {get() {
    propertyReads++; return options.noMatch && options.noMatch(polls) ? null : f.root;
  }});
  for (const objects of Object.values(f.scopes)) for (const object of objects) {
    const original = object.getboxattr;
    object.getboxattr = function(...args) {geometryReads++; return original.apply(this, args);};
  }
  f.memory = memory; f.command = command; f.tracePath = tracePath; f.schedules = schedules;
  f.fileActivity = fileActivity; f.pending = () => queue.length;
  f.rows = () => (memory.get(tracePath) || '').trim().split('\n').filter(Boolean).map(JSON.parse);
  f.ack = () => JSON.parse(memory.get(c.config.ack_path));
  f.start = () => c.tick();
  f.next = () => {
    const next = queue.shift(); assert.ok(next, 'expected scheduled callback'); now = next.at; polls++;
    if (options.callbackCost) now += options.callbackCost;
    next.fn.call(next.owner);
  };
  f.finish = () => {let remaining = 81; while (queue.length && remaining--) f.next(); assert.ok(remaining > 0, 'bounded install');};
  f.counts = () => ({now, polls, openCalls, propertyReads, geometryReads});
  return f;
}
const traced = installTraceFixture(); traced.start(); traced.next();
assert.ok(traced.memory.has(traced.tracePath), 'request51 must durably trace before terminal ACK');
const firstTrace = traced.rows();
assert.deepEqual(firstTrace.slice(0, 4).map(row => row.phase),
  ['command-consumed', 'openfile-enter', 'openfile-return', 'poll-scheduled']);
assert.ok(firstTrace.some(row => row.phase === 'plus-eligibility' && row.ready === true));
assert.deepEqual(firstTrace.filter(row => row.phase === 'capability-exit').map(row => [row.method, row.observation.status]),
  [['getattr', 'returned'], ['getvalueof', 'returned'], ['getattr', 'returned'], ['getvalueof', 'returned'], ['getattr', 'returned'], ['getvalueof', 'returned']]);
assert.equal(firstTrace.filter(row => row.phase === 'capability-call-return').length, 6,
  'host return must be distinguished from subsequent result normalization');
assert.ok(firstTrace.some(row => row.phase === 'observation-chunk' && row.observation_kind === 'anchor'));
assert.ok(firstTrace.some(row => row.phase === 'observation-chunk' && row.observation_kind === 'geometry'));
assert.equal(traced.memory.has(traced.context.config.ack_path), false, 'partial observations survive before ACK');
assert.equal(traced.memory.get(traced.context.config.journal_path), '', 'trace is not a runtime journal event');
const partialGeometry = installTraceFixture(); let geometryDurableDuringTraversal = false;
const originalGeometry = partialGeometry.scopes.root[0].getboxattr;
partialGeometry.scopes.root[0].getboxattr = function(...args) {
  if (partialGeometry.context.geometryDispositions.length && partialGeometry.rows().some(row =>
    row.phase === 'observation-chunk' && row.observation_kind === 'geometry')) geometryDurableDuringTraversal = true;
  return originalGeometry.apply(this, args);
};
partialGeometry.start(); partialGeometry.next();
assert.equal(geometryDurableDuringTraversal, true, 'collected geometry must survive a later traversal stall');
const untraced = installTraceFixture({command: {command_id: 52}}); untraced.start(); untraced.next();
assert.equal(untraced.memory.has(untraced.tracePath), false);
assert.deepEqual(traced.calls, untraced.calls, 'tracing must preserve exact six-call order');
assert.deepEqual(traced.counts(), untraced.counts(), 'trace must not add host property/geometry reads');
traced.finish(); untraced.finish();
assert.equal(traced.counts().polls, 70); assert.equal(traced.calls.length, 420);
assert.equal(traced.counts().now, 7000); assert.ok(traced.schedules.every(delay => delay === 100));
assert.equal(traced.ack().success, false); assert.equal(traced.ack().anchor_diagnostics.length, 3);
assert.equal(traced.ack().geometry_dispositions.length, 4);
assert.equal(traced.ack().install_trace_failure, undefined);
const untracedAck = untraced.ack(); untracedAck.command_id = 51;
for (const row of untracedAck.anchor_diagnostics) row.numeric_preflight_observation.request_id = 51;
assert.deepEqual(traced.ack(), untracedAck, 'healthy trace leaves refusal content unchanged apart from request identity');
assert.deepEqual(traced.rows().slice(-5).map(row => row.phase),
  ['failure-enter', 'failure-journal-enter', 'failure-journal-return', 'failure-ack-enter', 'failure-ack-return']);
assert.equal(traced.memory.get(traced.context.config.journal_path).trim().split('\n').length, 1);
for (const [index, row] of traced.rows().entries()) {
  assert.equal(row.seq, index + 1); assert.equal(row.request_id, 51); assert.equal(row.step_id, 'install-plus-r1');
  assert.equal(row.document, 'plus'); assert.equal(row.revision, 1); assert.equal(row.source_sha256, traced.context.PLUS_SOURCE);
  assert.equal(row.owner_inlet, 2); assert.equal(row.clock, 'wall-ms'); assert.ok(Number.isFinite(row.at_ms));
}
const costly = installTraceFixture({callbackCost: 43}); costly.start(); costly.finish();
assert.equal(costly.counts().now, 10010, 'finite callback costs must remain visible beyond unchanged ACK deadline');
assert.equal(costly.rows().at(-1).elapsed_ms, 10010);
const longest = installTraceFixture({noMatch: poll => poll >= 70 && poll < 80}); longest.start(); longest.finish();
assert.equal(longest.counts().polls, 80); assert.equal(longest.calls.length, 420);
assert.ok(longest.rows().length < 2048); assert.ok(longest.memory.get(longest.tracePath).length <= 2 * 1024 * 1024);
for (const line of longest.memory.get(longest.tracePath).trimEnd().split('\n')) {
  assert.ok(line.length + 1 <= 2048); assert.match(line, /^[\x00-\x7f]*$/);
}
const noRoot = installTraceFixture({noMatch: () => true}); noRoot.start(); noRoot.finish();
assert.equal(noRoot.counts().polls, 80); assert.equal(noRoot.calls.length, 0);
assert.ok(noRoot.rows().every(row => row.phase !== 'validate-enter'));
for (const [unmatchedPolls, expectedPolls] of [[0, 10], [8, 13]]) {
  const f = installTraceFixture({noMatch: poll => poll <= unmatchedPolls});
  for (const target of f.targets) target.object.maxclass = 'flonum';
  f.definition.basic_varname = 'basic_tab'; f.definition.boxes = [];
  f.root.getnamed = name => {assert.equal(name, 'basic_tab'); return f.scopes.root[1];};
  let helpersCreated = 0, connections = 0;
  f.root.newdefault = () => {helpersCreated++; return {setboxattr() {}};};
  f.root.connect = () => {connections++;};
  f.start(); f.finish();
  assert.equal(f.counts().polls, expectedPolls, 'minimum ten attempts and five consecutive stable passes remain required');
  assert.equal(f.ack().success, true); assert.equal(f.calls.length, 0);
  assert.equal(helpersCreated, 4); assert.equal(connections, 1);
  assert.ok(f.rows().some(row => row.phase === 'bind-enter'));
  assert.deepEqual(f.rows().slice(-3).map(row => row.phase), ['plus-eligibility', 'bind-return', 'install-ready-for-ack'],
    'binding validation must finish before readiness');
}

for (const variant of ['unavailable', 'threw', 'ambiguous', 'property-threw']) {
  const f = installTraceFixture(); let incompletePrefix;
  for (const target of f.targets) {
    if (variant === 'unavailable') {delete target.object.getattr; delete target.object.getvalueof;}
    if (variant === 'threw') target.object.getvalueof = () => {
      incompletePrefix = f.rows(); throw Error('synthetic capability unavailable');
    };
    if (variant === 'ambiguous') target.object.getvalueof = () => [1, 2];
    if (variant === 'property-threw') Object.defineProperty(target.object, 'getvalueof', {get() {
      incompletePrefix = f.rows(); throw Error('synthetic capability property unavailable');
    }});
  }
  f.start(); f.next();
  const exits = f.rows().filter(row => row.phase === 'capability-exit' && row.method === 'getvalueof');
  assert.equal(exits.length, 3);
  assert.ok(exits.every(row => row.observation.status === (variant === 'unavailable' ? 'unavailable' :
    variant === 'ambiguous' ? 'returned' : 'threw')));
  if (variant === 'ambiguous') assert.ok(exits.every(row => row.observation.representation === 'ambiguous-array'));
  if (incompletePrefix) assert.equal(incompletePrefix.at(-1).phase, 'capability-enter', 'entry must be durable before host return');
}
let openPrefix;
const interruptedOpen = installTraceFixture({open(f) {openPrefix = f.rows(); throw Error('synthetic interrupted open');}});
interruptedOpen.start();
assert.equal(openPrefix.at(-1).phase, 'openfile-enter');
assert.ok(!interruptedOpen.rows().some(row => row.phase === 'openfile-return'));
assert.equal(interruptedOpen.ack().success, false);

for (const variant of ['unknown-parent', 'wrong-inlet', 'inexact-geometry']) {
  const f = installTraceFixture();
  if (variant === 'unknown-parent') delete f.root.parentpatcher;
  if (variant === 'wrong-inlet') f.context.config.lifecycle.owners[2].inlet = 99;
  if (variant === 'inexact-geometry') f.scopes.root[0].live[0] += .005;
  f.start(); f.finish();
  assert.equal(f.calls.length, 0, variant + ': existing preflight must still suppress all calls');
  assert.equal(f.ack().success, false);
  assert.ok(!f.rows().some(row => row.phase === 'capability-enter'));
}
for (const variant of ['ack-basename', 'ack-directory', 'config-basename', 'existing-sidecar', 'source']) {
  const f = installTraceFixture();
  if (variant === 'ack-basename') f.context.config.ack_path = 'Z:/synthetic/other.json';
  if (variant === 'ack-directory') f.context.config.ack_path = 'Z:/other/ack.json';
  if (variant === 'config-basename') f.context.configFile = 'Z:/synthetic/other.json';
  if (variant === 'existing-sidecar') f.memory.set(f.tracePath, 'preserved-before-start\n');
  if (variant === 'source') f.definition.source_sha256 = 'f'.repeat(64);
  f.start();
  assert.equal(f.ack().success, false); assert.equal(f.ack().install_trace_failure.code, 'binding');
  assert.equal(f.calls.length, 0); assert.equal(f.counts().openCalls, 0);
  if (variant === 'existing-sidecar') assert.equal(f.memory.get(f.tracePath), 'preserved-before-start\n');
}
for (const command of [{document: 'times', step_id: 'install-times-r1'}, {document: 'minus', step_id: 'install-minus-r1'},
  {command_id: 52}, {revision: 2, action_revision: 2, step_id: 'install-plus-r2'}]) {
  const f = installTraceFixture({command}); f.start();
  assert.equal(f.memory.has(f.tracePath), false, 'unrelated install must never create a trace');
}
const sinkFailure = installTraceFixture({sinkFailure: (mode, body) => mode !== 'read' && body.includes('"method":"getattr"')});
sinkFailure.start(); sinkFailure.next();
assert.equal(sinkFailure.ack().success, false);
assert.equal(sinkFailure.ack().install_trace_failure.code, 'sink');
assert.equal(sinkFailure.calls.length, 1, 'trace failure must stop before the next capability');
assert.equal(sinkFailure.ack().install_trace_failure.collected_capabilities[0].observation.status, 'returned',
  'trace sink failure must not rewrite a returned capability into threw');
assert.equal(sinkFailure.ack().install_trace_failure.collected_capabilities[0].observation.value, 6);
const contextFailure = installTraceFixture({sinkFailure: (mode, body) => mode !== 'read' && body.includes('"phase":"validate-refused"')});
contextFailure.start(); contextFailure.next(); contextFailure.next();
assert.equal(contextFailure.ack().install_trace_failure.code, 'sink');
assert.match(contextFailure.ack().install_trace_failure.original_error, /aggregate-original-hierarchy-preflight-failed/);
assert.equal(contextFailure.ack().anchor_diagnostics.length, 3);
for (const variant of ['records', 'record-bytes', 'total-bytes']) {
  const f = installTraceFixture(); f.start();
  let failure;
  try {for (let i = 0; i < 2200; i++) f.context.installTraceEvent('synthetic-bound',
    {payload: 'x'.repeat(variant === 'record-bytes' ? 2048 : variant === 'total-bytes' ? 1400 : 0)});}
  catch (error) {failure = error;}
  assert.ok(failure, variant + ': bounds must fail explicitly');
  f.context.fail(f.command, failure);
  assert.equal(f.ack().install_trace_failure.code, 'limit');
  assert.equal(f.rows().at(-1).phase, 'trace-limit');
  assert.ok(f.rows().length <= 2048); assert.ok(f.memory.get(f.tracePath).length <= 2 * 1024 * 1024);
  assert.ok(f.memory.get(f.tracePath).trimEnd().split('\n').every(line => line.length + 1 <= 2048));
}
console.log(JSON.stringify({trace006: 'ordered private phases and preserved capabilities',
  refusalRows: traced.rows().length, longestRows: longest.rows().length,
  longestBytes: longest.memory.get(longest.tracePath).length, polls: longest.counts().polls,
  capabilityCalls: longest.calls.length, maxLineBytes: Math.max(...longest.memory.get(longest.tracePath).trimEnd().split('\n').map(line => line.length + 1))}));

// A failed schedule marker must revoke the callback that has already been queued.
function scheduledFailureFixture(validBind, options) {
  const f = installTraceFixture(options); f.helperActivity = [];
  if (validBind) {
    for (const target of f.targets) target.object.maxclass = 'flonum';
    f.definition.basic_varname = 'basic_tab'; f.definition.boxes = [];
    f.root.getnamed = name => {f.helperActivity.push(['getnamed', name]); return f.scopes.root[1];};
    f.root.newdefault = (...args) => {
      f.helperActivity.push(['newdefault', ...args]);
      return {setboxattr(...args) {f.helperActivity.push(['setboxattr', ...args]);}};
    };
    f.root.connect = (...args) => {f.helperActivity.push(['connect', args.length]);};
  }
  return f;
}
function scheduledActivity(f) {
  const {openCalls, propertyReads, geometryReads} = f.counts();
  return hash({openCalls, propertyReads, geometryReads, capabilityCalls: f.calls, helpers: f.helperActivity,
    files: f.fileActivity, schedules: f.schedules,
    ack: f.memory.get(f.context.config.ack_path), journal: f.memory.get(f.context.config.journal_path),
    trace: f.memory.get(f.tracePath)});
}
const scheduledFailures = [];
for (const stage of ['initial', 'recurring']) for (const validBind of [false, true]) for (const stale of [false, true]) {
  const precedingPhase = stage === 'initial' ? 'openfile-return' : validBind ? 'validate-return' : 'validate-refused';
  const f = scheduledFailureFixture(validBind, {sinkFailure: (mode, body) =>
    mode !== 'read' && body.includes('"phase":"' + precedingPhase + '"')});
  f.start(); if (stage === 'recurring') f.next();
  assert.equal(f.ack().success, false); assert.equal(f.ack().install_trace_failure.code, 'sink');
  assert.equal(f.pending(), 1, 'the failing marker follows a successful schedule');
  if (stale) {
    f.memory.set(f.context.config.command_path, JSON.stringify({...f.command, command_id: 52}));
    f.start();
    assert.equal(f.context.installTrace, null, 'a new install changes the mutable global trace identity');
    assert.equal(f.pending(), 2, 'old callback remains ahead of the new install callback');
  }
  const before = scheduledActivity(f), ackBefore = f.memory.get(f.context.config.ack_path);
  if (stale) f.next(); else f.finish();
  scheduledFailures.push({stage, validBind, stale, activityUnchanged: scheduledActivity(f) === before,
    ackUnchanged: f.memory.get(f.context.config.ack_path) === ackBefore,
    expectedQueue: f.pending() === (stale ? 1 : 0)});
}
for (const validBind of [false, true]) {
  const f = scheduledFailureFixture(validBind, {open(fixture) {
    for (let i = 0; i < 2044; i++) fixture.context.installTraceEvent('synthetic-reserved-limit');
  }});
  f.start();
  assert.equal(f.ack().success, false); assert.equal(f.ack().install_trace_failure.code, 'limit');
  assert.equal(f.rows().length, 2048); assert.equal(f.rows().at(-1).phase, 'trace-limit');
  assert.equal(f.pending(), 1);
  const before = scheduledActivity(f), ackBefore = f.memory.get(f.context.config.ack_path);
  f.finish();
  scheduledFailures.push({stage: 'initial-limit', validBind, stale: false,
    activityUnchanged: scheduledActivity(f) === before,
    ackUnchanged: f.memory.get(f.context.config.ack_path) === ackBefore, expectedQueue: f.pending() === 0});
}
console.log(JSON.stringify({scheduledFailureCases: scheduledFailures.length,
  casesWithPostFailureActivity: scheduledFailures.filter(row => !row.activityUnchanged).length,
  casesWithChangedAck: scheduledFailures.filter(row => !row.ackUnchanged).length,
  casesWithUnexpectedQueue: scheduledFailures.filter(row => !row.expectedQueue).length}));
assert.ok(scheduledFailures.every(row => row.activityUnchanged && row.ackUnchanged && row.expectedQueue),
  'every failed install must leave already queued callbacks inert, including after a new install');

// These fixtures exercise the script boundary; only Max/File/Task are synthetic.
function plus007Policy(c, expected) {
  return {kind: 'plus-controller-numeric-cohort-v1', engine: 'js-controller', document: 'plus',
    source_sha256: c.PLUS_SOURCE, anchor: expected.anchor, source_class: 'flonum', runtime_class: 'number',
    ...plain(c.PLUS_CONTROLLER_COHORT_PINS[expected.anchor]),
    cohort_anchors: Object.keys(c.PLUS_NUMERIC_PINS), cohort_binding_sha256: c.PLUS_CONTROLLER_COHORT_BINDING,
    helper_sha256: plain(c.GEOMETRY_HELPERS), evidence: plain(c.PLUS_CONTROLLER_COHORT_EVIDENCE || {}),
    format_method: 'getattr', format_attribute: 'format', format_representation: 'scalar-number',
    format_value_sha256: hash([6, 0, 0, 0]), getter_method: 'getvalueof',
    getter_representation: 'singleton-number-array', finite_required: true, source_initial_equality: true,
    fresh_complete_cohort_required: true};
}
function plus007Fixture(base = plusPreflightFixture()) {
  const f = base, c = f.context, d = f.definition;
  d.basic_anchor = 'root/obj-2'; d.basic_varname = 'basic_tab'; d.saved_edges = [];
  const basicEntries = d.full_inventory.filter(b => b.anchor.startsWith('root/obj-2/'));
  const extraClasses = ['number', 'number', 'number', 'number', '*', '*', 'button', 'comment', 'comment', 'comment', 'comment', 'jsui'];
  basicEntries.forEach((b, i) => {
    b.id = b.anchor.split('/').at(-1); b.authored_text = ''; b.authored_empty = true; b.inlets = 1;
    if (i >= 4) {
      const cls = extraClasses[i - 4]; b.maxclass = cls === '*' ? 'newobj' : cls;
      b.runtime_class = cls; b.runtime_classes = [cls]; f.scopes['root/obj-2'][i].maxclass = cls;
    }
    b.outlets = ['number', 'flonum'].includes(b.maxclass) ? 2 : b.maxclass === 'comment' ? 0 : 1;
    b.initial_numeric = ['number', 'flonum'].includes(b.maxclass) ? 123.5 : null;
  });
  c.PLUS_CONTROLLER_COHORT_PINS = Object.fromEntries(f.targets.map(({expected: b}) => [b.anchor,
    {...plain(c.PLUS_NUMERIC_PINS[b.anchor]), initial_numeric_sha256: hash([123.5, 0, 0, 0])}]));
  c.PLUS_CONTROLLER_COHORT_BINDING = 'd'.repeat(64);
  c.PLUS_CONTROLLER_FORMAT_SHA256 = hash([6, 0, 0, 0]);
  for (const {expected: b} of f.targets) b.plus_controller_numeric_cohort_policy = plus007Policy(c, b);
  d.boxes = plain(basicEntries);
  d.observer_leaves = d.boxes.flatMap(b => Array.from({length: b.outlets}, (_, port) =>
    ({anchor: b.anchor, port, varname: '__alive_help_leaf_' + b.id.replace(/-/g, '_') + '_' + port})));
  const basic = {firstobject: f.scopes['root/obj-2'][0]}, activity = [];
  f.scopes.root[1].subpatcher = () => basic;
  f.root.getnamed = () => assert.fail('plus bind must reuse the validated Basic handle');
  function attach(scope) {
    scope.newdefault = (...args) => {activity.push(['newdefault', ...args]); return {setboxattr() {}};};
    scope.connect = (...args) => activity.push(['connect', args.length]);
  }
  attach(f.root); attach(basic); f.basic = basic; f.activity = activity;
  return f;
}
const failures007 = [], completed007 = [];
function case007(name, body) {
  if (process.env.ARITHMETIC_007_CASE && process.env.ARITHMETIC_007_CASE !== name) return;
  try {body(); completed007.push(name);} catch (error) {failures007.push({name, error: error.message});}
}
case007('plus007_preflight_suppresses_capabilities', () => {
  for (const mutation of ['policy', 'partial', 'box-copy', 'basic-duplicate', 'port-copy', 'extra-diagnostic', 'parent', 'owner']) {
    const f = plus007Fixture();
    if (mutation === 'policy') f.targets[0].expected.plus_controller_numeric_cohort_policy.evidence.bad = true;
    if (mutation === 'partial') delete f.targets[0].expected.plus_controller_numeric_cohort_policy;
    if (mutation === 'box-copy') f.definition.boxes[1].source_box_sha256 = 'f'.repeat(64);
    if (mutation === 'basic-duplicate') f.definition.boxes[15] = plain(f.definition.boxes[14]);
    if (mutation === 'port-copy') f.definition.boxes[15].outlets++;
    if (mutation === 'extra-diagnostic') f.scopes['root/obj-2'].at(-1).maxclass = 'wrong';
    if (mutation === 'parent') delete f.root.parentpatcher;
    if (mutation === 'owner') f.context.config.lifecycle.owners[2].inlet = '2';
    assert.throws(() => f.context.validateTree(f.root, f.definition), mutation + ': invalid preflight accepted');
    assert.equal(f.calls.length, 0, mutation + ': invalid preflight probed target');
  }
});
case007('plus007_current_capability_refusal', () => {
  for (const change of [{getattr: () => [6]}, {getattr: () => 5}, {getattr: undefined},
    {getattr() {throw Error('synthetic');}}, {getvalueof: () => 123.5}, {getvalueof: () => [124]},
    {getvalueof: () => null}, {getvalueof: () => undefined}, {getvalueof: () => [NaN]}, {getvalueof: () => [1, 2]}]) {
    const f = plus007Fixture(); Object.assign(f.targets[0].object, change);
    assert.throws(() => f.context.validateTree(f.root, f.definition));
    assert.equal(f.context.anchorDiagnostics.length, 3);
    assert.equal(f.context.controllerRepresentationObservations.length, 3, 'all cohort outcomes must be retained');
    assert.ok(f.context.controllerRepresentationObservations.every(r => r.cohort_satisfied === false));
    assert.equal(f.activity.length, 0);
  }
});
case007('plus007_fresh_cohort_bind_reuse', () => {
  const f = plus007Fixture(installTraceFixture()); f.start(); f.finish();
  assert.equal(f.ack().success, true); assert.equal(f.counts().polls, 10); assert.equal(f.calls.length, 60);
  assert.equal(f.context.anchorDiagnostics.length, 3, 'original class facts must survive accepted cohort');
  assert.equal(f.context.controllerRepresentationObservations.length, 3);
  assert.ok(f.context.controllerRepresentationObservations.every(r => r.cohort_satisfied === true));
  assert.equal(f.activity.filter(row => row[0] === 'newdefault').length, 23);
  assert.equal(f.context.roots.plus.basic, f.basic);
  for (const t of f.targets) assert.equal(f.context.roots.plus.objects[t.expected.anchor], t.object);
});
case007('plus007_result_ownership_lifetime', () => {
  for (const mutation of ['request', 'owner', 'definition']) {
    const f = plus007Fixture(), c = f.context, first = f.scopes.root[0], geometry = first.getboxattr;
    let changed = false;
    first.getboxattr = (...args) => {
      if (!changed) {
        changed = true;
        if (mutation === 'request') c.shared.request_id++;
        if (mutation === 'owner') c.config.lifecycle.owners[2].channel = 'changed';
        if (mutation === 'definition') f.definition.boxes.at(-1).outlets++;
      }
      return geometry.apply(first, args);
    };
    assert.throws(() => c.createPlusValidationPass().validate(f.root, f.definition),
      mutation + ': traversal must not change ownership before capabilities');
    assert.equal(f.calls.length, 0); assert.equal(f.activity.length, 0);
  }
  for (const mutation of ['request', 'owner', 'definition']) {
    const f = plus007Fixture(), c = f.context, last = f.targets.at(-1).object, getter = last.getvalueof;
    last.getvalueof = () => {
      const value = getter();
      if (mutation === 'request') c.shared.request_id++;
      if (mutation === 'owner') c.config.lifecycle.owners[2].channel = 'changed';
      if (mutation === 'definition') f.definition.boxes.at(-1).outlets++;
      return value;
    };
    assert.throws(() => c.createPlusValidationPass().validate(f.root, f.definition),
      mutation + ': a getter must not change ownership while minting a result');
    assert.equal(f.calls.length, 6); assert.equal(f.activity.length, 0);
    assert.ok(c.controllerRepresentationObservations.every(r => r.cohort_satisfied === false));
  }
  for (const mutation of ['forged', 'foreign', 'expired', 'consumed', 'request', 'root', 'definition', 'owner', 'geometry', 'revision']) {
    const f = plus007Fixture(), c = f.context;
    assert.equal(typeof c.createPlusValidationPass, 'function', 'local cohort issuer missing');
    const pass = c.createPlusValidationPass(), result = pass.validate(f.root, f.definition);
    assert.equal(f.calls.length, 6);
    let supplied = result, root = f.root, definition = f.definition, consuming = pass;
    if (mutation === 'forged') supplied = {get consume() {assert.fail('forged consume getter executed');}};
    if (mutation === 'foreign') consuming = c.createPlusValidationPass();
    if (mutation === 'expired') pass.expire();
    if (mutation === 'consumed') pass.bind(root, definition, result);
    if (mutation === 'request') c.shared.request_id++;
    if (mutation === 'root') root = {...root};
    if (mutation === 'definition') definition = plain(definition);
    if (mutation === 'owner') c.config.lifecycle.owners[2].working_path = 'wrong';
    if (mutation === 'geometry') f.targets[0].object.live[0] += .001;
    if (mutation === 'revision') c.shared.action_revision = 2;
    const before = f.activity.length;
    assert.throws(() => consuming.bind(root, definition, supplied), mutation);
    assert.equal(f.activity.length, before); assert.equal(f.calls.length, 6);
    assert.throws(() => c.bind(root, definition, supplied));
    assert.equal(f.activity.length, before, 'ordinary bind must not accept a forged result');
  }
});
case007('plus007_both_independent_revisions', () => {
  for (const revision of [1, 2]) {
    const f = plus007Fixture(plusPreflightFixture(revision)), c = f.context;
    assert.equal(typeof c.createPlusValidationPass, 'function');
    const a = c.createPlusValidationPass(), result = a.validate(f.root, f.definition);
    const state = a.bind(f.root, f.definition, result);
    assert.equal(state.definition.revision, revision); assert.equal(f.calls.length, 6);
    assert.equal(c.controllerRepresentationObservations.length, 3);
    assert.ok(c.controllerRepresentationObservations.every(r => r.revision === revision));
  }
});
case007('plus007_old_fixture_refusal', () => {
  const old = plusPreflightFixture(); assert.throws(() => old.context.validateTree(old.root, old.definition));
  assert.equal(old.calls.length, 6); assert.equal(old.context.controllerRepresentationObservations.length, 0);
  const malformed = plus007Fixture(); delete malformed.definition.boxes[1].plus_controller_numeric_cohort_policy;
  assert.throws(() => malformed.context.validateTree(malformed.root, malformed.definition));
  assert.equal(malformed.calls.length, 0);
});
function plus007V8Fixture() {
  const f = plus007Fixture(), c = f.context, r = helper('v8-readback.js');
  for (const key of ['PLUS_GEOMETRY_PINS', 'PLUS_NUMERIC_PINS', 'PLUS_CONTROLLER_COHORT_PINS',
    'PLUS_CONTROLLER_COHORT_BINDING', 'PLUS_CONTROLLER_FORMAT_SHA256']) r[key] = plain(c[key]);
  r.PLUS_ROOT_DIAGNOSTIC_PINS = Object.fromEntries(f.definition.full_inventory.filter(b => b.anchor.split('/').length === 2).map(b =>
    [b.anchor, {source_class: b.maxclass, source_box_sha256: b.source_box_sha256, source_text_sha256: b.source_text_sha256,
      runtime_class: b.runtime_class, runtime_classes: b.runtime_classes, saved_rect_sha256: hash(b.rect)}]));
  f.scopes['root/obj-2'].forEach((o, i) => {o.varname = '__alive_help_' + f.definition.boxes[i].id.replace(/-/g, '_');});
  const leaves = f.definition.observer_leaves.map(leaf => ({maxclass: 'js', varname: leaf.varname, nextobject: null}));
  f.basic.firstobject = linkObjects([...f.scopes['root/obj-2'], ...leaves]).firstobject;
  f.root.firstobject = linkObjects([...f.scopes.root, ...harnessSpecs.map(([varname, maxclass]) => ({varname, maxclass}))]).firstobject;
  f.root.getnamed = () => f.scopes.root[1];
  const request = {op: 'readback', command_id: 52, operation_request_id: 51, step_id: 'install-plus-r1',
    action: 'install', action_document: 'plus', action_revision: 1, document: 'plus', revision: 1, source_sha256: c.PLUS_SOURCE};
  f.reader = r; f.request = request; return f;
}
case007('plus007_v8_complete_diagnostics', () => {
  const f = plus007V8Fixture(), diag = f.reader.collectRepresentationDiagnostics(f.root, f.definition, f.request, f.context.config);
  assert.ok(diag, 'plus V8 diagnostic producer is missing');
  assert.equal(diag.root_rows.length, 4); assert.equal(diag.numeric_rows.length, 3); assert.equal(f.calls.length, 6);
  assert.equal(diag.inventory_coverage.root.complete_count, 8); assert.equal(diag.inventory_coverage.numeric.complete_count, 35);
  assert.ok(diag.numeric_rows.every(row => row.actual_runtime_class === 'number'));
  assert.equal(diag.strict_mismatch, true);
});
case007('plus007_v8_incomplete_suppression', () => {
  for (const mutation of ['root-missing', 'basic-missing', 'extra', 'duplicate', 'unknown', 'throw', 'ambiguous']) {
    const f = plus007V8Fixture();
    if (mutation === 'root-missing') f.root.firstobject = f.root.firstobject.nextobject;
    if (mutation === 'basic-missing') f.basic.firstobject = f.basic.firstobject.nextobject;
    if (mutation === 'extra') f.basic.firstobject = {maxclass: 'comment', nextobject: f.basic.firstobject};
    if (mutation === 'duplicate') f.scopes['root/obj-2'][0].varname = f.scopes['root/obj-2'][1].varname;
    if (mutation === 'unknown') f.scopes['root/obj-2'][0].varname = 'unknown';
    if (mutation === 'throw') Object.defineProperty(f.basic, 'firstobject', {get() {throw Error('synthetic');}});
    if (mutation === 'ambiguous') f.scopes.root[3].live = [...f.scopes.root[0].live];
    const diag = f.reader.collectRepresentationDiagnostics(f.root, f.definition, f.request, f.context.config);
    assert.ok(diag, 'plus diagnostics missing'); assert.equal(diag.inventory_complete, false, mutation);
    assert.equal(f.calls.length, 0, mutation); assert.ok(diag.numeric_rows.every(r => r.candidate_count === null && r.actual_runtime_class === null));
  }
});
case007('plus007_v8_recognition_is_not_admission', () => {
  const f = plus007V8Fixture(); let refusal;
  try {f.reader.collectReadback(f.root, f.definition, f.request, f.context.config);} catch (error) {refusal = error;}
  assert.match(String(refusal), /strict-v8-original-representation-refused/);
  assert.equal(refusal.v8_representation_diagnostics.numeric_rows.length, 3);
  f.calls.length = 0; f.targets[0].expected.plus_controller_numeric_cohort_policy.evidence.bad = true;
  assert.throws(() => f.reader.collectRepresentationDiagnostics(f.root, f.definition, f.request, f.context.config));
  assert.equal(f.calls.length, 0);
});
case007('plus007_fix1_v8_root_source_class_binding', () => {
  const valid = plus007V8Fixture(), authored = ['newobj', 'newobj', 'newobj', 'jsui'];
  valid.scopes.root[1].maxclass = 'jpatcher';
  const diag = valid.reader.collectRepresentationDiagnostics(valid.root, valid.definition, valid.request, valid.context.config);
  assert.deepEqual(plain(diag.root_rows.map(row => row.source_class)), authored);
  assert.equal(diag.root_rows[1].actual_runtime_class, 'jpatcher');
  assert.ok(diag.numeric_rows.every(row => row.actual_runtime_class === 'number'));
  assert.equal(diag.inventory_coverage.root.complete_count, 8);
  assert.equal(diag.inventory_coverage.numeric.complete_count, 35);
  assert.equal(valid.calls.length, 6); assert.equal(diag.strict_mismatch, true);
  valid.calls.length = 0;
  assert.throws(() => valid.reader.collectReadback(valid.root, valid.definition, valid.request, valid.context.config),
    /strict-v8-original-representation-refused/);
  assert.equal(valid.calls.length, 6);
  for (const anchor of ['root/obj-1', 'root/obj-2', 'root/obj-3', 'root/obj-4']) {
    const f = plus007V8Fixture();
    f.definition.full_inventory.find(b => b.anchor === anchor).maxclass = 'synthetic-forged-source-class';
    assert.throws(() => f.reader.collectRepresentationDiagnostics(f.root, f.definition, f.request, f.context.config),
      anchor + ': changed authored class must refuse before target calls');
    assert.equal(f.calls.length, 0, anchor + ': changed authored class reached target calls');
  }
  const production = helper('v8-readback.js');
  assert.deepEqual(plain(Object.values(production.PLUS_ROOT_DIAGNOSTIC_PINS).map(pin => pin.source_class)), authored);
});
console.log(JSON.stringify({completed007, failures007}));
assert.deepEqual(failures007, [], 'preparation007 behavioral regressions');

// This block uses licensed source descriptors and private capture007 evidence.
// All earlier/later original in-memory helper suites remain portable and active.
const local008Present = JSON.parse(require('node:child_process').execFileSync('python3', ['-B', '-c',
  'import arithmetic,json; from pathlib import Path; p=Path.home()/".cache/alive-ultra-evidence"; paths=[arithmetic.common.RESOURCES,p/"arithmetic-max-runtime-007",p/"arithmetic-package-007-historical"]; print(json.dumps(any(x.exists() or x.is_symlink() for x in paths)))'],
  {cwd: __dirname, encoding: 'utf8'}));
const source008 = local008Present ? JSON.parse(require('node:child_process').execFileSync('python3', ['-B', '-c',
  'import arithmetic,json; d,_,h=arithmetic.source_metadata(); print(json.dumps({"definition":next(x for x in d if x["document"]=="plus"),"helpers":h}))'],
  {cwd: __dirname, encoding: 'utf8', maxBuffer: 1024 * 1024})) : null;
function plus008Fixture(revision = 1, action = 'install') {
  const r = helper('v8-readback.js'), d = plain(source008.definition), calls = [], nongated = [], byAnchor = {}, byName = {};
  Object.assign(d, {revision, lifecycle_owner_inlet: revision + 1, working_windows_path: `Z:/synthetic/plus-r${revision}.maxhelp`});
  function object(b, name) {
    const o = {varname: name, maxclass: b.v8_numeric_representation_policy ? 'number' :
      b.v8_root_representation_policy ? 'jpatcher' : b.runtime_class,
      live: plain((b.observed_geometry_policy || {}).live_rect || b.rect), valid: true,
      patchcords: {inputs: [], outputs: []}, getboxattr() {return [...this.live];}};
    byAnchor[b.anchor] = o; byName[name] = o;
    if (['number', 'flonum'].includes(b.maxclass)) {
      o.getvalueof = () => { (b.v8_numeric_representation_policy ? calls : nongated).push([b.anchor, 'value']);
        return action === 'install' ? b.initial_numeric : b.initial_numeric + .25; };
      if (b.v8_numeric_representation_policy) o.getattr = () => {calls.push([b.anchor, 'format']); return 6;};
      else o.getvalueof = () => {nongated.push([b.anchor, 'value']); return 13;};
    }
    return o;
  }
  const originals = d.full_inventory.filter(b => b.anchor.split('/').length === 2).map(b => object(b, b.source_varname));
  const basicObjects = d.boxes.map(b => object(b, '__alive_help_' + b.id.replace(/-/g, '_')));
  const leaves = d.observer_leaves.map(l => object({anchor: l.varname, runtime_class: 'js', rect: [-4000, -4000, 100, 22]}, l.varname));
  const basic = linkObjects([...basicObjects, ...leaves]);
  byAnchor['root/obj-2'].subpatcher = () => basic; byAnchor['root/obj-3'].subpatcher = () => ({firstobject: null});
  function connect(src, outlet, dst, inlet) {
    const cord = {srcobject: src, srcoutlet: outlet, dstobject: dst, dstinlet: inlet};
    src.patchcords.outputs.push(cord); dst.patchcords.inputs.push(cord);
  }
  for (const edge of d.saved_edges) connect(byAnchor[d.basic_anchor + '/' + edge.source[0]], edge.source[1],
    byAnchor[d.basic_anchor + '/' + edge.destination[0]], edge.destination[1]);
  for (const leaf of d.observer_leaves) connect(byAnchor[leaf.anchor], leaf.port, byName[leaf.varname], 0);
  const channel = 'synthetic-plus-r' + revision;
  const harness = [
    ['__alive_arithmetic_reader', 'v8', [-3000, -3000, 160, 133], 'v8 synthetic'],
    ['__alive_arithmetic_disposer', 'thispatcher', [-3100, -3000, 100, 22], 'thispatcher'],
    ['__alive_arithmetic_freebang', 'freebang', [-3200, -3000, 100, 22], 'freebang'],
    ['__alive_arithmetic_lifecycle_send', 'send', [-3400, -3000, 200, 64], 'send ' + channel]
  ].map(([name, cls, rect, boxtext]) => Object.assign(object({anchor: name, runtime_class: cls, rect}, name), {boxtext}));
  connect(harness[2], 0, harness[3], 0);
  const root = Object.assign(linkObjects([...originals, ...harness]), {filepath: d.working_windows_path, parentpatcher: null,
    getnamed: name => originals.find(o => o.varname === name)});
  const owners = []; owners[revision + 1] = {inlet: revision + 1, document: 'plus', revision, source_sha256: d.source_sha256,
    working_path: d.working_windows_path, channel, root_proof_path: 'Z:/synthetic/proof.json'};
  const config = {helpers: plain(source008.helpers), documents: [d], lifecycle: {owners}};
  const request = {op: action === 'close' ? 'operation' : 'readback', command_id: 100 + revision,
    operation_request_id: action === 'close' ? 100 + revision : 90 + revision,
    action, document: 'plus', revision, action_document: 'plus', action_revision: revision, source_sha256: d.source_sha256,
    step_id: action === 'event' ? 'plus-A' + (revision === 1 ? '01' : '21') : action + '-plus-r' + revision};
  return {reader: r, definition: d, request, config, calls, nongated, root, basic, byAnchor, byName, originals, harness};
}
const failures008 = [], completed008 = [], unavailable008 = [];
function case008(name, body) {
  if (!local008Present) {unavailable008.push(name); return;}
  if (process.env.ARITHMETIC_008_CASE && process.env.ARITHMETIC_008_CASE !== name) return;
  try {body(); completed008.push(name);} catch (error) {failures008.push({name, error: error.message.split('\n')[0]});}
}
const read008 = f => f.reader.collectReadback(f.root, f.definition, f.request, f.config);
const close008 = f => f.reader.collectLifecycleProof(f.root, f.definition, f.request, f.config);
case008('plus008_full_readback_and_fresh_close', () => {
  for (const revision of [1, 2]) for (const action of ['install', 'event', 'close']) {
    const f = plus008Fixture(revision, action), result = action === 'close' ? close008(f) : read008(f);
    const w = result.v8_representation_witnesses;
    assert.ok(w && w.version === 'plus-v8-representation-witnesses-v1', 'fresh plus witness missing');
    assert.equal(f.calls.length, 6, 'gated calls must occur exactly once');
    assert.equal(f.nongated.length, action === 'close' ? 0 : 4, 'live and close getter obligations differ');
    assert.equal(w.numeric.length, 3); assert.equal(w.roots.length, 2);
    assert.equal(w.request_id, f.request.command_id); assert.equal(w.operation_request_id, f.request.operation_request_id);
    assert.equal(w.inventory_coverage.root.complete_count, 8); assert.equal(w.inventory_coverage.numeric.complete_count, 35);
    assert.ok(JSON.stringify(Object.keys(w).sort()) === JSON.stringify(['version', 'engine', 'request_id', 'operation_request_id',
      'step_id', 'action', 'action_document', 'action_revision', 'document', 'revision', 'source_sha256', 'helper_sha256',
      'working_path', 'root_is_top_level', 'receipt_tag_observed', 'evidence', 'inventory_coverage', 'numeric', 'roots'].sort()), 'exact witness schema');
    for (const row of w.numeric) assert.ok(JSON.stringify(Object.keys(row).sort()) === JSON.stringify(['anchor', 'source_box_sha256',
      'source_text_sha256', 'source_class', 'actual_runtime_class', 'live_rect', 'candidate_count', 'candidate_count_complete',
      'geometry_matches', 'receipt_tag_observed', 'format_observation', 'value_observation'].sort()), 'exact numeric witness schema');
    for (const row of w.roots) assert.ok(JSON.stringify(Object.keys(row).sort()) === JSON.stringify(['anchor', 'source_box_sha256',
      'source_text_sha256', 'source_class', 'actual_runtime_class', 'varname', 'live_rect', 'candidate_count', 'candidate_count_complete'].sort()), 'exact root witness schema');
    assert.equal(Object.hasOwn(w, 'op'), false, 'op is request context only');
    if (action !== 'close') {
      assert.equal(result.numeric.length, 7); assert.equal(result.boxes.length, 35);
      for (const row of w.numeric) assert.ok(result.numeric.some(n => n.anchor === row.anchor && n.value === row.value_observation.value &&
        n.semantic_tag === 'float' && n.receipt_tag_observed === false), 'gated source semantics/value reuse missing');
    } else {assert.equal(result.basic_retention.boxes.length, 35); assert.equal(Object.hasOwn(result, 'op'), false);}
  }
});
case008('plus008_honest_diagnostics_and_no_external_authority', () => {
  const f = plus008Fixture(), diag = f.reader.collectRepresentationDiagnostics(f.root, f.definition, f.request, f.config);
  assert.equal(diag.strict_mismatch, true); assert.equal(diag.root_rows.length, 4); assert.equal(diag.numeric_rows.length, 3);
  assert.equal(diag.root_rows.find(r => r.anchor === 'root/obj-1').candidates.length, 2);
  assert.equal(diag.root_rows.find(r => r.anchor === 'root/obj-4').candidates.length, 2);
  for (const supplied of [diag, plain(diag), {}, {strict_mismatch: false}])
    assert.throws(() => f.reader.collectRepresentationWitnesses(f.root, f.definition, f.request, f.config, supplied));
  f.calls.length = 0; assert.equal(read008(f).success, true); assert.equal(f.calls.length, 6, 'prior diagnostics must not replace fresh calls');
});
case008('plus008_metadata_preflight', () => {
  const mutations = [
    f => delete f.definition.boxes.find(b => b.v8_numeric_representation_policy).v8_numeric_representation_policy,
    f => f.definition.boxes.push(plain(f.definition.boxes[0])),
    f => f.definition.observer_leaves[0].v8_numeric_representation_policy = plain(f.definition.boxes.find(b => b.v8_numeric_representation_policy).v8_numeric_representation_policy),
    f => f.definition.full_inventory[0].authored_empty = !f.definition.full_inventory[0].authored_empty,
    f => {for (const v of ['boxes', 'full_inventory']) f.definition[v].find(b => b.anchor === 'root/obj-2/obj-1').inlets++;},
    f => f.definition.boxes.at(-1).unknown = true,
    f => f.definition.observer_leaves[0].port = false,
    f => f.definition.saved_edges[0].source[1] = false,
    f => f.definition.saved_edges[0].order = false,
    f => f.definition.full_inventory.find(b => b.anchor === 'root/obj-2').saved_incoming_routes = false,
    f => f.config.helpers[0].sha256 = 'x', f => f.request.op = 'operation', f => f.request.action_document = 'times',
    f => f.config.lifecycle.owners[2].inlet = 3, f => f.config.documents = [plain(f.definition), plain(f.definition)],
    f => f.root.parentpatcher = {}, f => f.root.filepath = 'Z:/wrong'
  ];
  for (const mutate of mutations) {const f = plus008Fixture(); mutate(f); assert.throws(() => read008(f)); assert.equal(f.calls.length, 0);}
  for (const view of ['boxes', 'full_inventory']) for (const index of [0, 1, 2]) {
    const f = plus008Fixture(), b = f.definition[view].filter(b => b.v8_numeric_representation_policy)[index];
    for (const key of Object.keys(b.v8_numeric_representation_policy)) {
      const g = plus008Fixture(), p = g.definition[view].find(x => x.anchor === b.anchor).v8_numeric_representation_policy;
      delete p[key]; assert.throws(() => read008(g)); assert.equal(g.calls.length, 0, 'malformed policy reached capability');
    }
  }
});
case008('plus008_capability_shapes', () => {
  assert.equal(read008(plus008Fixture()).success, true, 'positive capability control');
  for (const method of ['getattr', 'getvalueof']) for (const raw of [null, undefined, [], [1], [1, 2], '6', true, NaN, Infinity, {}]) {
    const f = plus008Fixture(); f.byAnchor['root/obj-2/obj-1'][method] = () => raw; assert.throws(() => read008(f));
  }
  for (const method of ['getattr', 'getvalueof']) for (const shape of ['unavailable', 'throws']) {
    const f = plus008Fixture(); f.byAnchor['root/obj-2/obj-1'][method] = shape === 'throws' ? () => {throw Error('synthetic');} : null;
    assert.throws(() => read008(f));
  }
  const wrongFormat = plus008Fixture(); wrongFormat.byAnchor['root/obj-2/obj-1'].getattr = () => 7; assert.throws(() => read008(wrongFormat));
  const wrongDefault = plus008Fixture(); wrongDefault.byAnchor['root/obj-2/obj-1'].getvalueof = () => .5; assert.throws(() => read008(wrongDefault));
});
case008('plus008_last_getter_and_retention_currentness', () => {
  assert.equal(read008(plus008Fixture()).success, true, 'positive freshness control');
  const mutations = [
    f => f.request.command_id++, f => f.request.op = 'invalid', f => f.config.lifecycle.owners[2].channel = 'changed',
    f => f.config.lifecycle.owners = [...f.config.lifecycle.owners], f => f.config.documents = [plain(f.definition)],
    f => f.config.helpers = plain(f.config.helpers), f => f.definition.boxes.at(-1).authored_empty = !f.definition.boxes.at(-1).authored_empty,
    f => f.definition.boxes.find(b => b.v8_numeric_representation_policy).v8_numeric_representation_policy.finite_required = false,
    f => f.definition.boxes.find(b => b.v8_numeric_representation_policy).initial_numeric = .5,
    f => f.root.parentpatcher = {}, f => f.root.filepath = 'Z:/changed',
    f => f.byAnchor['root/obj-2/obj-1'].maxclass = 'flonum',
    f => f.byAnchor['root/obj-2/obj-1'].live[0] += .001
  ];
  for (const action of ['install', 'close']) for (const mutate of mutations) {
    const f = plus008Fixture(1, action), last = f.byAnchor['root/obj-2/obj-23'], getter = last.getvalueof;
    last.getvalueof = () => {const value = getter(); mutate(f); return value;};
    assert.throws(() => action === 'close' ? close008(f) : read008(f)); assert.equal(f.calls.length, 6, 'no second gated pass');
  }
  for (const action of ['install', 'close']) {
    const f = plus008Fixture(1, action), object = f.byAnchor['root/obj-2/obj-23']; let changed = false;
    const cords = object.patchcords;
    Object.defineProperty(object, 'patchcords', {get() {
      if (!changed && f.calls.length === 6) {changed = true; f.request.command_id++;}
      return cords;
    }});
    assert.throws(() => action === 'close' ? close008(f) : read008(f));
    assert.equal(changed, true, 'mutation must occur during later retention');
  }
  const later = plus008Fixture(), b = later.definition.boxes.find(b => b.maxclass === 'number'), o = later.byAnchor[b.anchor], getter = o.getvalueof;
  o.getvalueof = () => {const v = getter(); later.config.helpers[0].sha256 = 'changed'; return v;};
  assert.throws(() => read008(later)); assert.equal(later.calls.length, 6); assert.equal(later.nongated.length, 1);
});
case008('plus008_inventory_preflight_and_retention', () => {
  const mutations = [
    f => f.basic.firstobject = f.basic.firstobject.nextobject,
    f => f.byAnchor['root/obj-2/obj-1'].varname = f.byAnchor['root/obj-2/obj-24'].varname,
    f => f.harness[0].maxclass = 'js', f => f.harness[0].valid = false,
    f => f.originals[3].maxclass = 'comment', f => f.originals[0].live[0] += .1,
    f => f.byName[f.definition.observer_leaves[0].varname].maxclass = 'comment',
    f => f.byAnchor[f.definition.boxes.find(b => b.maxclass === 'comment').anchor].maxclass = 'button'
  ];
  for (const mutate of mutations) {const f = plus008Fixture(); mutate(f); assert.throws(() => read008(f)); assert.equal(f.calls.length, 0);}
  const f = plus008Fixture(), c = f.byAnchor['root/obj-2/obj-1'].patchcords.outputs[0];
  c.srcoutlet = 99; assert.throws(() => read008(f)); assert.equal(f.calls.length, 0);
});
case008('plus008_original_close_and_endpoint_identity', () => {
  assert.ok(close008(plus008Fixture(1, 'close')).v8_representation_witnesses, 'positive close control');
  for (const change of [{revision: 2}, {action_document: 'times'}, {operation_request_id: 1}]) {
    const f = plus008Fixture(1, 'close'); Object.assign(f.request, change);
    assert.throws(() => close008(f)); assert.equal(f.calls.length, 0, 'original request must bind before normalization');
  }
  const f = plus008Fixture(), cord = f.byAnchor['root/obj-2/obj-1'].patchcords.outputs[0];
  cord.srcobject = {...cord.srcobject}; assert.throws(() => read008(f)); assert.equal(f.calls.length, 0, 'endpoint identity must be retained');
  const closed = plus008Fixture(1, 'close'), rootCord = closed.harness[2].patchcords.outputs[0];
  rootCord.srcobject = {...rootCord.srcobject}; assert.throws(() => close008(closed), 'root endpoint must bind the actual retained object');
});
case008('plus008_binding_read_snapshots_and_failure_prefix', () => {
  for (const action of ['install', 'close']) {
    const f = plus008Fixture(1, action), path = f.root.filepath; let changed = false;
    Object.defineProperty(f.root, 'filepath', {get() {if (!changed) {changed = true; f.request.command_id++;} return path;}});
    assert.throws(() => action === 'close' ? close008(f) : read008(f), 'first binding read must not change captured request');
    assert.equal(f.calls.length, 0);
  }
  const f = plus008Fixture(), last = f.byAnchor['root/obj-2/obj-23'], getter = last.getvalueof;
  last.getvalueof = () => {const value = getter(); f.request.command_id++; return value;};
  let refused;try {read008(f);} catch (error) {refused = error;}
  const diag = refused && refused.v8_representation_diagnostics;
  assert.ok(diag && diag.strict_mismatch === true, 'raw mismatch/prefix must survive currentness refusal');
  assert.equal(diag.numeric_rows.length, 3); assert.equal(diag.numeric_rows.at(-1).value_observation.status, 'returned');
  const failed = plus008Fixture(), r = failed.reader, memory = new Map();
  failed.byAnchor['root/obj-2/obj-1'].getvalueof = () => [];
  failed.config.command_path = 'Z:/synthetic/request.json'; failed.request.output_path = 'Z:/synthetic/refusal.json';
  r.configFile = 'Z:/synthetic/config.json'; r.documentName = 'plus'; r.revision = 1; r.File = memoryFile(memory);
  memory.set(r.configFile, JSON.stringify(failed.config)); memory.set(failed.config.command_path, JSON.stringify(failed.request));
  r.checkpoint.call({patcher: failed.root}, failed.request.command_id, failed.request.step_id);
  const envelope = JSON.parse(memory.get(failed.request.output_path));
  assert.ok(JSON.stringify(Object.keys(envelope).sort()) === JSON.stringify(['success', 'request_id', 'error_code',
    'numeric_mode_observation', 'v8_representation_diagnostics'].sort()), 'five-key refusal envelope changed');
  assert.equal(envelope.success, false); assert.equal(envelope.error_code, 'numeric-readback-refused');
  assert.equal(envelope.numeric_mode_observation, null); assert.equal(envelope.v8_representation_diagnostics.strict_mismatch, true);
  assert.equal(envelope.v8_representation_diagnostics.root_rows.length, 4); assert.equal(envelope.v8_representation_diagnostics.numeric_rows.length, 3);
});
case008('plus008_controller_coexistence', () => {
  const f = plus008Fixture(), c = helper('controller.js'); c.config = f.config;
  c.shared = {request_id: 51, step_id: 'install-plus-r1', action: 'install', action_document: 'plus', action_revision: 1};
  f.root.firstobject = linkObjects(f.originals).firstobject;
  f.basic.firstobject = linkObjects(f.definition.boxes.map(b => f.byAnchor[b.anchor])).firstobject;
  for (const b of f.definition.full_inventory.filter(b => b.anchor.split('/').length === 2)) f.byAnchor[b.anchor].maxclass = b.runtime_class;
  for (const b of f.definition.boxes.filter(b => b.v8_numeric_representation_policy)) {
    const o = f.byAnchor[b.anchor]; o.getvalueof = () => [b.initial_numeric];
  }
  const pass = c.createPlusValidationPass(), accepted = pass.validate(f.root, f.definition);
  assert.ok(accepted); assert.equal(c.anchorDiagnostics.length, 3); assert.equal(c.controllerRepresentationObservations.length, 3);
  assert.ok(c.controllerRepresentationObservations.every(r => r.cohort_satisfied === true));
});
for (const action of ['install', 'close']) case008('plus008_fix1_final_binding_read_' + action, () => {
  const collect = action === 'close' ? close008 : read008;
  for (const revision of [1, 2]) {
    const baseline = plus008Fixture(revision, action), baselinePath = baseline.root.filepath;
    let baselineReads = 0;
    Object.defineProperty(baseline.root, 'filepath', {get() {baselineReads++; return baselinePath;}});
    const result = collect(baseline);
    assert.ok(baselineReads > 0, 'successful baseline must observe the host path');
    assert.equal(result.v8_representation_witnesses.request_id, baseline.request.command_id);
    assert.equal(baseline.calls.length, 6); assert.equal(baseline.nongated.length, action === 'close' ? 0 : 4);

    const changed = plus008Fixture(revision, action), path = changed.root.filepath, originalId = changed.request.command_id;
    let pathReads = 0, mutated = false, refusal;
    Object.defineProperty(changed.root, 'filepath', {get() {
      if (++pathReads === baselineReads) {mutated = true; changed.request.command_id++;}
      return path;
    }});
    try {collect(changed);} catch (error) {refusal = error;}
    assert.equal(mutated, true, 'adaptive mutation must reach the final baseline host read');
    assert.equal(changed.request.command_id, originalId + 1, 'original request mutation must be exercised');
    assert.equal(changed.calls.length, 6, 'terminal currentness checks must not add gated calls');
    assert.equal(changed.nongated.length, action === 'close' ? 0 : 4, 'live and close getter counts must be preserved');
    assert.ok(refusal, action + ': final host read must not change the original request through proof return');
    const diagnostic = refusal.v8_representation_diagnostics;
    assert.ok(diagnostic && diagnostic.strict_mismatch === true, 'terminal refusal must preserve raw mismatch diagnostics');
    assert.equal(diagnostic.request_id, originalId); assert.equal(diagnostic.root_rows.length, 4); assert.equal(diagnostic.numeric_rows.length, 3);
    assert.ok(diagnostic.numeric_rows.every(row => row.value_observation.status === 'returned'), 'terminal refusal must retain all returned numeric observations');
  }
});
console.log(JSON.stringify({completed008, failures008, unavailable008,
  oracleStatus: local008Present ? 'LOCAL_TESTS_EXECUTED' : 'UNAVAILABLE: licensed resources and capture007 evidence absent; no oracle pass'}));
if (!local008Present) assert.equal(unavailable008.length, 11, 'only the eleven private-derived cases may be unavailable');
assert.equal(failures008.length, 0, 'preparation008 behavioral regressions');

// Wholly original source data: only public anchor identities match the request.
const sorted009 = value => {
  if (Array.isArray(value)) return value.map(sorted009);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, sorted009(value[k])]));
  return value;
};
const canonical009 = value => JSON.stringify(sorted009(value)).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const digest009 = value => crypto.createHash('sha256').update(canonical009(value)).digest('hex');
function minus009Fixture() {
  const queue = [], memory = new Map(), calls = [], activity = [];
  const c = helper('controller.js', {Task: function (callback) {this.schedule = () => queue.push(callback);}});
  const d = {document: 'minus', revision: 1, source_sha256: '7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0',
    helper_sha256: plain(c.GEOMETRY_HELPERS), basic_anchor: 'root/obj-2', basic_varname: 'basic_tab',
    lifecycle_owner_inlet: 4, source_path: '/synthetic/resources/minus.maxhelp',
    pristine_path: '/synthetic/work/pristine/minus-r1.maxhelp', working_path: '/synthetic/work/working/minus-r1.maxhelp',
    working_windows_path: 'Z:/synthetic/work/working/minus-r1.maxhelp', boxes: [], full_inventory: [], saved_edges: [], observer_leaves: []};
  const scopes = {root: {parentpatcher: null}, 'root/obj-2': {}, 'root/obj-3': {}};
  const byAnchor = {}, pins = {}, scopeObjects = {root: [], 'root/obj-2': [], 'root/obj-3': []};
  const targets = ['root/obj-2/obj-1', 'root/obj-2/obj-24', 'root/obj-2/obj-23'];
  function add(anchor, cls, index, child = false) {
    const numeric = targets.includes(anchor), parent = anchor.slice(0, anchor.lastIndexOf('/'));
    const rect = [100 + index * 71, 200 + index * 37, 43, 29];
    const b = {anchor, authored_empty: false, authored_text: 'original synthetic descriptor ' + index, child,
      inlets: 1, outlets: numeric ? 2 : 1, maxclass: ['patcher', 'js'].includes(cls) ? 'newobj' : cls,
      rect, runtime_class: cls, runtime_classes: [cls], saved_incoming_routes: 0, saved_outgoing_routes: 0,
      source_box_sha256: hash('original synthetic box ' + index), source_text_sha256: hash('original synthetic text ' + index),
      source_varname: child ? (anchor === 'root/obj-2' ? 'basic_tab' : 'q_tab') : null};
    const o = {maxclass: numeric ? 'number' : cls, varname: b.source_varname, patcher: scopes[parent], live: [...rect], nextobject: null,
      getboxattr(attribute) {assert.equal(attribute, 'patching_rect'); return [...this.live];}, subpatcher: () => child ? scopes[anchor] : null,
      message() {assert.fail('minus diagnostic sent input');}, setvalueof() {assert.fail('minus diagnostic set value');}};
    if (child) Object.assign(scopes[anchor], {parentpatcher: scopes[parent], box: o});
    if (numeric) {
      o.getattr = function (attribute) {assert.equal(this, o); assert.equal(attribute, 'format'); calls.push([anchor, 'getattr']); return 9;};
      o.getvalueof = function () {assert.equal(this, o); assert.equal(arguments.length, 0); calls.push([anchor, 'getvalueof']); return [123.25];};
    }
    const dimension = anchor === 'root/obj-2/obj-4' ? 2 : ['root/obj-1', 'root/obj-2', 'root/obj-3'].includes(anchor) ? 3 : null;
    if (dimension !== null) o.live[dimension] += 5;
    if (numeric || dimension !== null) pins[anchor] = {source_box_sha256: b.source_box_sha256, source_text_sha256: b.source_text_sha256,
      saved_rect_sha256: hash(rect), runtime_class: o.maxclass, changed_dimension: dimension,
      live_rect_sha256: hash(o.live)};
    d.full_inventory.push(b); byAnchor[anchor] = o; scopeObjects[parent].push(o);
    if (parent === d.basic_anchor) {
      const {child: omittedChild, source_varname: omittedName, saved_incoming_routes: omittedIn, saved_outgoing_routes: omittedOut, ...basic} = b;
      d.boxes.push({...plain(basic), id: anchor.split('/').at(-1), role: null, initial_numeric: numeric ? 123.25 : null});
    }
  }
  add('root/obj-1', 'js', 0); add('root/obj-2', 'patcher', 1, true);
  add('root/obj-2/obj-4', 'jsui', 2);
  targets.forEach((anchor, i) => add(anchor, 'flonum', i + 3));
  for (let i = 0; i < 12; i++) add('root/obj-2/synthetic-' + i, 'comment', i + 6);
  add('root/obj-3', 'patcher', 18, true); add('root/obj-4', 'jsui', 19);
  for (const [scope, objects] of Object.entries(scopeObjects)) {
    objects.forEach((o, i) => {o.nextobject = objects[i + 1] || null;}); scopes[scope].firstobject = objects[0] || null;
    scopes[scope].getnamed = name => objects.find(o => o.varname === name) || null;
    scopes[scope].newdefault = () => {activity.push('observer'); assert.fail('minus observer attached');};
  }
  for (let index = 0; index < 8; index++) d.saved_edges.push({index, source: [d.boxes[index].id, 0], destination: [d.boxes[index + 1].id, 0]});
  d.observer_leaves = d.boxes.flatMap(b => Array.from({length: b.outlets}, (_, port) =>
    ({anchor: b.anchor, port, varname: '__alive_help_leaf_' + b.id.replace(/-/g, '_') + '_' + port})));
  const projection = Object.fromEntries(['document', 'source_sha256', 'helper_sha256', 'basic_anchor', 'basic_varname', 'boxes',
    'full_inventory', 'saved_edges', 'observer_leaves'].map(k => [k, d[k]]));
  c.MINUS_PROJECTION_SHA256 = digest009(projection); c.MINUS_PINS = pins; c.MINUS_SOURCE_PATH = d.source_path;
  const owner = {inlet: 4, document: 'minus', revision: 1, source_sha256: d.source_sha256, working_path: d.working_windows_path,
    channel: 'synthetic-owner4', root_proof_path: '/synthetic/work/owner4.json'};
  const owners = [null, null, null, null, owner];
  c.config = {work: '/synthetic/work', documents: [d], helpers: Object.entries(c.GEOMETRY_HELPERS).map(([name, sha256]) =>
    ({name, sha256, bytes: 100, path: 'help/resources/' + name})), lifecycle: {owners},
    ack_path: 'Z:/synthetic/ack.json', journal_path: 'Z:/synthetic/journal.jsonl', global_name: 'synthetic'};
  const command = {command_id: 101, op: 'operation', action: 'install', document: 'minus', revision: 1, action_revision: 1,
    step_id: 'install-minus-r1', source_sha256: d.source_sha256};
  c.shared = {seq: 0}; c.setAction(command); c.File = memoryFile(memory); memory.set(c.config.journal_path, '');
  const root = scopes.root; root.filepath = d.working_windows_path;
  c.max = {frontpatcher: root, message() {activity.push('open');}};
  let collector;
  const createCollector = c.createMinusDiagnosticCollector;
  c.createMinusDiagnosticCollector = (...args) => (collector = createCollector(...args));
  const run = (count = 1) => {while (count-- && queue.length) queue.shift()();};
  const finish = () => {let n = 100; while (queue.length && n--) run(); assert.equal(queue.length, 0, 'bounded scheduled polls');};
  return {c, d, command, owner, root, scopes, scopeObjects, byAnchor, targets, calls, activity, queue, memory,
    start() {c.install(command);}, run, finish, get collector() {return collector;}, ack: () => JSON.parse(memory.get(c.config.ack_path))};
}
const completed009 = [], failures009 = [];
function case009(name, body) {
  if (process.env.ARITHMETIC_009_CASE && process.env.ARITHMETIC_009_CASE !== name) return;
  try {body(); completed009.push(name);} catch (error) {failures009.push({name, error: error.message});}
}
function refused009(f) {
  const ack = f.ack(); assert.equal(ack.success, false); assert.equal(Object.keys(f.c.roots).length, 0);
  assert.equal(Object.keys(f.c.revisions).length, 0); assert.equal(f.activity.filter(x => x === 'observer').length, 0);
  assert.deepEqual(ack.geometry_dispositions, []); assert.deepEqual(ack.numeric_mode_observations, []);
  assert.deepEqual(ack.controller_representation_observations, []); return ack.minus_numeric_preflight_diagnostic;
}
case009('minus009_once_only_strict_refusal', () => {
  const f = minus009Fixture(); f.start(); f.finish(); const e = refused009(f);
  assert.equal(f.c.anchorDiagnostics.length, 7, 'unchanged terminal pass retains seven strict refusals');
  assert.equal(f.calls.length, 6, 'complete eligible minus hierarchy must collect six ordered calls once');
  assert.deepEqual(f.calls, f.targets.flatMap(a => [[a, 'getattr'], [a, 'getvalueof']]));
  assert.ok(e, 'eligible strict refusal must retain the diagnostic envelope');
  assert.deepEqual(e.counts, {lookups_attempted: 6, invocation_attempts: 6, invocation_outcomes_retained: 6, completed_pairs: 3});
  assert.equal(e.collection.status, 'complete'); assert.equal(e.collection.first_failure, null);
  assert.deepEqual(e.terminal_context, {stale: false, first_invalidation: null});
  assert.deepEqual(e.binding.command, f.command); assert.deepEqual(e.binding.owner, f.owner);
  assert.equal(e.binding.source_projection_sha256, f.c.MINUS_PROJECTION_SHA256);
  assert.equal(e.collection.poll_index, 1); assert.equal(e.collection.diagnostic_sha256, digest009(f.ack().anchor_diagnostics));
  assert.deepEqual(Object.keys(e).sort(), ['binding', 'collection', 'counts', 'methods', 'terminal_context', 'version']);
  assert.equal(e.version, 'minus-controller-diagnostic-v1');
  assert.deepEqual(Object.keys(e.binding).sort(), ['command', 'command_snapshot_sha256', 'configuration_snapshot_sha256',
    'definition_snapshot_sha256', 'helper_sha256', 'owner', 'owner_snapshot_sha256', 'source_projection_sha256', 'working_path']);
  assert.deepEqual(Object.keys(e.collection).sort(), ['diagnostic_sha256', 'first_failure', 'poll_index', 'status']);
  for (const row of e.methods) assert.deepEqual(Object.keys(row).sort(), ['anchor', 'attribute', 'invocation_status', 'lookup_status', 'method', 'observation']);
  assert.equal(e.binding.command_snapshot_sha256, digest009(f.command)); assert.equal(e.binding.definition_snapshot_sha256, digest009(f.d));
  assert.equal(e.binding.configuration_snapshot_sha256, digest009(f.c.config)); assert.equal(e.binding.owner_snapshot_sha256, digest009(f.owner));
});
case009('minus009_canonical_source_hash', () => {
  const c = helper('controller.js');
  const value = {z: 2.0, a: ['\u00e9\ud83d\ude00', true, null, -0, 1e-7, 1e-6, .000012345, 1e23]};
  const literal = '{"a":["\\u00e9\\ud83d\\ude00",true,null,0,1e-07,1e-06,1.2345e-05,99999999999999991611392],"z":2}';
  assert.equal(c.minusCanonical(value), literal);
  assert.equal(c.minusCanonicalHash(value), crypto.createHash('sha256').update(literal).digest('hex'));
  for (const bad of [NaN, Infinity, -Infinity, undefined, () => 1]) assert.throws(() => c.minusCanonicalHash(bad));
  for (const bad of [[1, 2, 3], [1, 2, 3, true], [1, 2, 3, Infinity], {0: 1, 1: 2, 2: 3, 3: 4, length: 4}])
    assert.throws(() => c.geometryVectorHash(bad));
});
case009('minus009_source_request_owner_schema_suppression', () => {
  const mutations = [
    f => {f.command.command_id = 102;}, f => {f.command.op = 'readback';}, f => {f.command.action = 'close';},
    f => {f.command.document = 'plus';}, f => {f.command.revision = 2;}, f => {f.command.action_revision = true;},
    f => {f.command.step_id = 'install-minus-r2';}, f => {f.command.source_sha256 = 'f'.repeat(64);},
    f => {f.command.extra = 1;}, f => {delete f.command.action_revision;},
    f => {f.d.document = 'times';}, f => {f.d.revision = true;}, f => {f.d.source_sha256 = 'f'.repeat(64);},
    f => {f.d.lifecycle_owner_inlet = true;}, f => {f.d.source_path = '/different/minus.maxhelp';},
    f => {f.d.pristine_path += '.changed';}, f => {f.d.working_path += '.changed';}, f => {f.d.working_windows_path += '.changed';},
    f => {f.d.extra = 1;}, f => {delete f.d.basic_anchor;}, f => {f.c.config.documents.push(f.d);},
    f => {f.d.helper_sha256['helpstarter.js'] = 'f'.repeat(64);}, f => {f.c.config.helpers[0].sha256 = 'f'.repeat(64);},
    f => {f.c.config.helpers.pop();}, f => {f.c.config.helpers[1] = plain(f.c.config.helpers[0]);},
    f => {f.c.config.helpers[0].bytes = true;}, f => {f.c.config.helpers[0].path += '.changed';},
    f => {f.owner.inlet = true;}, f => {f.owner.document = 'plus';}, f => {f.owner.revision = 2;},
    f => {f.owner.source_sha256 = 'f'.repeat(64);}, f => {f.owner.working_path += '.changed';},
    f => {delete f.owner.channel;}, f => {f.owner.extra = true;}, f => {f.c.shared.request_id = 102;},
    f => {f.c.shared.action_revision = true;}, f => {f.root.filepath += '.changed';},
    f => {f.d.boxes[0].observed_geometry_policy = {};}, f => {f.d.full_inventory[0].controller_numeric_representation_policy = {};},
    f => {f.d.boxes[0].authored_empty = 1;}, f => {f.d.full_inventory[0].child = 1;},
    f => {f.d.boxes[0].inlets = true;}, f => {f.d.full_inventory[0].outlets = true;},
    f => {f.d.saved_edges[0].index = true;}, f => {f.d.saved_edges[0].source[1] = true;},
    f => {f.d.observer_leaves[0].port = true;}, f => {f.d.observer_leaves[0].extra = 1;},
    f => {f.d.boxes[0].authored_text += ' changed';}, f => {f.d.full_inventory[0].source_text_sha256 = 'f'.repeat(64);},
    f => {f.d.boxes[1].source_box_sha256 = 'f'.repeat(64);}, f => {f.d.boxes[0].rect[0] += .001;},
    f => {f.d.saved_edges.reverse();}, f => {f.d.observer_leaves.reverse();},
    f => {f.d.boxes[0].runtime_classes.push('number');}, f => {f.d.boxes[0].initial_numeric = Infinity;},
    f => {f.d.full_inventory[0].saved_incoming_routes = true;}, f => {f.d.full_inventory.pop();}
  ];
  mutations.forEach((mutate, index) => {
    const f = minus009Fixture(); mutate(f);
    try {f.start(); f.finish();} catch (error) {assert.equal(f.calls.length, 0, 'early refusal must not probe'); return;}
    assert.equal(f.calls.length, 0, 'source/request mutation ' + index + ' reached capability');
    assert.equal(f.ack().success, false); assert.equal(f.ack().minus_numeric_preflight_diagnostic, undefined);
    assert.equal(Object.keys(f.c.roots).length, 0); assert.equal(Object.keys(f.c.revisions).length, 0);
    assert.deepEqual(f.ack().geometry_dispositions, []);
  });
});
case009('minus009_complete_hierarchy_suppression', () => {
  const mutations = [
    f => {f.scopeObjects['root/obj-2'].at(-2).nextobject = null;},
    f => {f.scopeObjects['root/obj-2'].at(-1).nextobject = {...f.byAnchor['root/obj-2/synthetic-0'], nextobject: null};},
    f => {f.scopeObjects['root/obj-2'].at(-1).nextobject = f.scopeObjects['root/obj-2'][0];},
    f => {f.scopes['root/obj-3'].firstobject = {...f.byAnchor['root/obj-2/synthetic-0'], nextobject: null};},
    f => {f.byAnchor['root/obj-2/synthetic-0'].patcher = f.root;},
    f => {f.scopes['root/obj-2'].parentpatcher = {};}, f => {f.scopes['root/obj-2'].box = {};},
    f => {f.root.parentpatcher = {};}, f => {delete f.root.parentpatcher;},
    f => {f.root.getnamed = () => ({});}, f => {f.byAnchor['root/obj-2'].varname = 'other';},
    f => {f.byAnchor['root/obj-2/synthetic-0'].varname = 'unexpected';},
    f => {f.byAnchor['root/obj-2/synthetic-0'].maxclass = 'button';},
    f => {f.byAnchor['root/obj-2/obj-1'].maxclass = 'flonum';},
    f => {f.byAnchor['root/obj-2/obj-1'].live[0] += .001;},
    f => {f.byAnchor['root/obj-1'].live[0] += .001;},
    f => {f.byAnchor['root/obj-2/obj-4'].live[2] += .001;},
    f => {f.byAnchor['root/obj-4'].live[0] += .001;},
    f => {f.byAnchor['root/obj-2/synthetic-0'].live = [...f.byAnchor['root/obj-2/obj-1'].live];},
    f => {f.byAnchor['root/obj-4'].subpatcher = () => {throw {toString() {assert.fail('host exception converted');}};};}
  ];
  mutations.forEach((mutate, index) => {
    const f = minus009Fixture(); mutate(f);
    // A cycle would also hang the frozen legacy traversal; exercise the independent finite gate directly.
    if (index === 2) {
      f.start(); f.c.anchorDiagnostics = [];
      f.collector.observe(f.root, f.d, 1, []); assert.equal(f.calls.length, 0); return;
    }
    f.start(); f.finish(); assert.equal(f.calls.length, 0, 'hierarchy mutation ' + index + ' reached capability');
    const e = refused009(f); assert.equal(e, undefined);
  });
});
case009('minus009_all_classified_outcomes', () => {
  const cases = [[0, 'scalar-number', 0], [-4.25, 'scalar-number', -4.25], [[7.5], 'singleton-number-array', 7.5],
    [null, 'null', null], [undefined, 'undefined', null], [[], 'ambiguous-array', null], [[1, 2], 'ambiguous-array', null],
    ['7', 'other', null], [true, 'other', null], [[false], 'other', null], [NaN, 'nonfinite', null],
    [Infinity, 'nonfinite', null], [[-Infinity], 'nonfinite', null],
    [{toJSON() {assert.fail('returned host object serialized');}, toString() {assert.fail('returned host object converted');}}, 'other', null]];
  for (const [raw, representation, value] of cases) for (const method of ['getattr', 'getvalueof']) {
    const f = minus009Fixture(), object = f.byAnchor[f.targets[0]];
    object[method] = function () {f.calls.push([f.targets[0], method]); return raw;}; f.start(); f.finish();
    const e = refused009(f), index = method === 'getattr' ? 0 : 1, observation = e.methods[index].observation;
    assert.equal(observation.status, 'returned'); assert.equal(observation.representation, representation); assert.equal(observation.value, value);
    assert.equal(e.collection.status, 'complete'); assert.equal(e.counts.completed_pairs, 3); assert.equal(f.calls.length, 6);
  }
});
case009('minus009_stable_lookup_and_invocation_failures_continue', () => {
  for (const shape of ['unavailable', 'lookup-threw', 'invocation-threw']) {
    const f = minus009Fixture(), object = f.byAnchor[f.targets[0]];
    if (shape === 'unavailable') object.getattr = null;
    if (shape === 'lookup-threw') Object.defineProperty(object, 'getattr', {get() {throw {toString() {assert.fail('lookup exception converted');}};}});
    if (shape === 'invocation-threw') object.getattr = function () {f.calls.push([f.targets[0], 'getattr']); throw {toString() {assert.fail('invocation exception converted');}};};
    f.start(); f.finish(); const e = refused009(f), row = e.methods[0];
    assert.equal(row.lookup_status, shape === 'unavailable' ? 'unavailable' : shape === 'lookup-threw' ? 'threw' : 'callable');
    assert.equal(row.invocation_status, shape === 'invocation-threw' ? 'threw' : 'unattempted');
    assert.equal(e.counts.lookups_attempted, 6); assert.equal(e.counts.invocation_attempts, shape === 'invocation-threw' ? 6 : 5);
    assert.equal(e.counts.invocation_outcomes_retained, e.counts.invocation_attempts); assert.equal(e.counts.completed_pairs, 3);
    assert.equal(row.observation === null, shape === 'lookup-threw'); assert.equal(e.collection.first_failure, null);
  }
});
case009('minus009_single_lookup_and_trusted_receiver_bridge', () => {
  const f = minus009Fixture(), reads = [];
  for (const anchor of f.targets) for (const method of ['getattr', 'getvalueof']) {
    const object = f.byAnchor[anchor], fn = object[method];
    for (const property of ['call', 'apply', 'toString']) Object.defineProperty(fn, property, {get() {assert.fail('untrusted function property inspected');}});
    Object.defineProperty(object, method, {get() {reads.push([anchor, method]); return fn;}});
  }
  f.start(); f.finish(); const e = refused009(f);
  assert.deepEqual(reads, f.targets.flatMap(a => [[a, 'getattr'], [a, 'getvalueof']])); assert.equal(e.counts.invocation_attempts, 6);
});
case009('minus009_lookup_mutation_suppresses_invocation', () => {
  for (const mutate of [f => {f.command.command_id++;}, f => {f.c.shared.action_revision++;},
    f => {f.owner.channel += '-changed';}, f => {f.d.boxes[0].outlets++;},
    f => {f.byAnchor[f.targets[0]].patcher = f.root;}]) {
    const f = minus009Fixture(), object = f.byAnchor[f.targets[0]], fn = object.getattr; let lookups = 0;
    Object.defineProperty(object, 'getattr', {get() {lookups++; mutate(f); return fn;}});
    f.start(); f.finish(); const e = refused009(f);
    assert.equal(lookups, 1); assert.equal(f.calls.length, 0); assert.equal(e.methods[0].lookup_status, 'callable');
    assert.equal(e.methods[0].invocation_status, 'unattempted'); assert.equal(e.counts.lookups_attempted, 1);
    assert.equal(e.collection.first_failure.stage, 'guard-before-invocation'); assert.equal(e.terminal_context.stale, true);
    assert.ok(e.methods.slice(1).every(r => r.lookup_status === 'unattempted' && r.invocation_status === 'unattempted' && r.observation === null));
  }
});
case009('minus009_unsupported_intrinsic_stops_without_fallback', () => {
  const f = minus009Fixture(); f.c.minusIntrinsicApply = null; f.start(); f.finish(); const e = refused009(f);
  assert.equal(f.calls.length, 0); assert.equal(e.counts.lookups_attempted, 1); assert.equal(e.counts.invocation_attempts, 0);
  assert.equal(e.methods[0].lookup_status, 'callable'); assert.equal(e.methods[0].invocation_status, 'unsupported');
  assert.equal(e.methods[0].observation, null); assert.equal(e.collection.first_failure.code, 'unsupported-intrinsic-bridge');
  assert.equal(e.collection.first_failure.stage, 'invocation'); assert.equal(e.terminal_context.stale, false);
  const startup = helper('controller.js', {Function: {prototype: {}}});
  assert.equal(startup.minusIntrinsicApply, null, 'optional bridge initialization must not break helper startup');
  assert.equal(startup.capabilityObservation({getvalueof: () => 7}, 'getvalueof').value, 7, 'legacy helper remains isolated');
});
case009('minus009_returned_classification_failure_retains_prefix', () => {
  for (const property of ['length', '0']) {
    const f = minus009Fixture(), raw = new Proxy([3], {get(target, key) {
      if (key === property) throw {toString() {assert.fail('classification exception converted');}};
      return Reflect.get(target, key);
    }});
    f.byAnchor[f.targets[0]].getattr = () => {f.calls.push([f.targets[0], 'getattr']); return raw;};
    f.start(); f.finish(); const e = refused009(f);
    assert.equal(f.calls.length, 1); assert.equal(e.counts.invocation_attempts, 1); assert.equal(e.counts.invocation_outcomes_retained, 1);
    assert.equal(e.methods[0].invocation_status, 'returned'); assert.equal(e.methods[0].observation.representation, 'classification-threw');
    assert.equal(e.collection.first_failure.stage, 'classification'); assert.equal(e.counts.completed_pairs, 0);
  }
  const f = minus009Fixture(); let lengths = 0, elements = 0;
  f.byAnchor[f.targets[0]].getvalueof = () => {f.calls.push([f.targets[0], 'getvalueof']); return new Proxy([3], {get(target, key) {
    if (key === 'length') lengths++; if (key === '0') elements++; return Reflect.get(target, key);
  }});};
  f.start(); f.finish(); assert.equal(refused009(f).methods[1].observation.value, 3); assert.equal(lengths, 1); assert.equal(elements, 1);
});
case009('minus009_invocation_mutations_and_partial_pairs', () => {
  for (let index = 0; index < 6; index++) {
    const f = minus009Fixture(), anchor = f.targets[Math.floor(index / 2)], method = index % 2 ? 'getvalueof' : 'getattr';
    const object = f.byAnchor[anchor], fn = object[method];
    object[method] = function (...args) {const result = Reflect.apply(fn, this, args); f.owner.channel += '-changed'; return result;};
    f.start(); f.finish(); const e = refused009(f);
    assert.equal(f.calls.length, index + 1); assert.equal(e.counts.invocation_attempts, index + 1);
    assert.equal(e.counts.invocation_outcomes_retained, index + 1); assert.equal(e.counts.completed_pairs, Math.floor(index / 2));
    assert.equal(e.methods[index].invocation_status, 'returned'); assert.equal(e.collection.first_failure.method_index, index);
    assert.equal(e.collection.first_failure.stage, 'guard-after-outcome'); assert.equal(e.terminal_context.stale, true);
    assert.ok(e.methods.slice(index + 1).every(r => r.lookup_status === 'unattempted' && r.observation === null));
  }
});
case009('minus009_final_host_read_mutation', () => {
  for (const callsBeforeMutation of [0, 1, 6]) {
    const f = minus009Fixture(), filepath = f.root.filepath; let changed = false;
    Object.defineProperty(f.root, 'filepath', {get() {
      if (!changed && f.calls.length === callsBeforeMutation) {changed = true; f.command.command_id++;} return filepath;
    }});
    f.start(); f.finish(); const e = refused009(f);
    assert.equal(changed, true); assert.equal(f.calls.length, callsBeforeMutation);
    if (!callsBeforeMutation) assert.equal(e, undefined);
    else {assert.equal(e.methods[callsBeforeMutation - 1].invocation_status, 'returned'); assert.equal(e.terminal_context.stale, true);
      assert.equal(e.collection.first_failure.stage, 'guard-after-outcome'); assert.equal(e.binding.command.command_id, 101);}
  }
});
case009('minus009_later_hierarchy_and_terminal_arrays', () => {
  for (const change of ['missing', 'all-source-classes']) {
    const f = minus009Fixture(); f.start(); f.run(); const original = plain(f.collector.exportData());
    assert.equal(original.collection.status, 'complete'); assert.equal(f.calls.length, 6);
    if (change === 'missing') f.scopeObjects['root/obj-2'].at(-2).nextobject = null;
    else for (const b of f.d.full_inventory) {const o = f.byAnchor[b.anchor]; o.maxclass = b.runtime_class; o.live = [...b.rect];}
    f.finish(); const e = refused009(f);
    for (const key of ['binding', 'collection', 'methods', 'counts']) assert.deepEqual(e[key], original[key]);
    assert.equal(e.terminal_context.stale, true); assert.equal(e.terminal_context.first_invalidation.stage, 'later-validation');
    assert.notEqual(digest009(f.ack().anchor_diagnostics), original.collection.diagnostic_sha256);
    if (change === 'missing') assert.ok(f.ack().anchor_diagnostics.some(r => r.diagnostic_type === 'scope-count'));
    else assert.deepEqual(f.ack().anchor_diagnostics, []);
    assert.equal(f.calls.length, 6);
  }
});
case009('minus009_terminal_throw_and_export_immutability', () => {
  const f = minus009Fixture(); f.start(); f.run(); const first = f.collector.exportData(), frozenBytes = JSON.stringify(first);
  const terminalRows = f.c.anchorDiagnostics;
  Object.defineProperty(f.root, 'filepath', {get() {throw {toString() {assert.fail('host getter exception converted');}};}, configurable: true});
  // The legacy poll error formatter sees its own error; the collector must never convert a raw host exception.
  f.c.max.frontpatcher = null; f.collector.terminal(2);
  assert.equal(f.collector.exportData().terminal_context.first_invalidation.stage, 'terminal-guard');
  f.c.max.frontpatcher = f.root;
  Object.defineProperty(f.root, 'filepath', {get() {throw Error('original synthetic terminal path unavailable');}, configurable: true});
  f.finish(); const e = refused009(f);
  assert.equal(e.terminal_context.stale, true); assert.deepEqual(f.ack().anchor_diagnostics, plain(terminalRows));
  assert.equal(JSON.stringify(first), frozenBytes); first.methods[0].observation.value = -999;
  assert.notEqual(f.collector.exportData().methods[0].observation.value, -999);
  const ackBytes = f.memory.get(f.c.config.ack_path); f.collector.later(99);
  assert.equal(f.memory.get(f.c.config.ack_path), ackBytes); assert.equal(f.calls.length, 6);
});
case009('minus009_request_and_queued_callback_ownership', () => {
  const f = minus009Fixture(); f.c.config.command_path = 'Z:/synthetic/command.json';
  f.memory.set(f.c.config.command_path, JSON.stringify(f.command)); f.c.tick(); const queued = f.queue[0]; f.finish();
  const original = f.ack(), bytes = f.memory.get(f.c.config.ack_path), calls = f.calls.length;
  f.c.tick(); queued(); assert.equal(f.calls.length, calls); assert.equal(f.memory.get(f.c.config.ack_path), bytes);
  const command = {...f.command, command_id: 102}; f.memory.set(f.c.config.command_path, JSON.stringify(command));
  f.c.tick(); queued(); assert.equal(f.calls.length, calls); f.finish();
  assert.equal(f.ack().command_id, 102); assert.equal(f.ack().minus_numeric_preflight_diagnostic, undefined);
  assert.equal(f.ack().success, false); assert.equal(f.calls.length, calls); assert.equal(original.minus_numeric_preflight_diagnostic.counts.invocation_attempts, 6);
  assert.equal(Object.keys(f.c.roots).length, 0); assert.equal(Object.keys(f.c.revisions).length, 0);
});
case009('minus009_stopped_batch_keeps_first_failure', () => {
  const f = minus009Fixture(); f.c.minusIntrinsicApply = null; f.start(); f.run();
  const original = plain(f.collector.exportData()); assert.equal(original.collection.first_failure.code, 'unsupported-intrinsic-bridge');
  f.owner.channel += '-changed'; f.run(); const invalidation = plain(f.collector.exportData().terminal_context);
  assert.equal(invalidation.stale, true); assert.equal(invalidation.first_invalidation.stage, 'later-validation');
  f.root.parentpatcher = {}; f.finish(); const e = refused009(f);
  for (const key of ['binding', 'collection', 'methods', 'counts']) assert.deepEqual(e[key], original[key]);
  assert.deepEqual(e.terminal_context, invalidation); assert.equal(f.calls.length, 0);
});
console.log(JSON.stringify({completed009, failures009}));
assert.equal(failures009.length, 0, 'preparation009 behavioral regressions');

// Task010 counters observe the real install/poll/refusal path, including legacy reads.
function work010(f) {
  const counts = {canonical: {command: 0, definition: 0, configuration: 0, owner: 0}, source: 0,
    geometry: 0, rectangles: 0, filepaths: 0, samples: 0};
  const c = f.c, canonical = c.minusCanonical, source = c.minusSourceDefinition, geometry = c.geometryVectorHash;
  let depth = 0;
  c.minusCanonical = function (value) {
    if (!depth) for (const [name, object] of Object.entries({command: f.command, definition: f.d, configuration: c.config, owner: f.owner}))
      if (value === object) counts.canonical[name]++;
    depth++;
    try {return canonical(value);} finally {depth--;}
  };
  c.minusSourceDefinition = (...args) => {counts.source++; return source(...args);};
  c.geometryVectorHash = (...args) => {counts.geometry++; return geometry(...args);};
  const filepath = f.root.filepath;
  Object.defineProperty(f.root, 'filepath', {configurable: true, get() {counts.filepaths++; return filepath;}});
  let parent = f.root.parentpatcher;
  const parentDescriptor = Object.getOwnPropertyDescriptor(f.root, 'parentpatcher');
  Object.defineProperty(f.root, 'parentpatcher', {configurable: true, get() {
    if (new Error().stack.includes('at sample (')) counts.samples++;
    return parentDescriptor.get ? parentDescriptor.get.call(f.root) : parent;
  }, set(value) {if (parentDescriptor.set) parentDescriptor.set.call(f.root, value); else parent = value;}});
  for (const object of Object.values(f.byAnchor)) {
    const get = object.getboxattr;
    object.getboxattr = function (...args) {counts.rectangles++; return get.apply(this, args);};
  }
  return counts;
}
const completed010 = [], failures010 = [];
function readOracle010(f) {
  const expected = ['max.frontpatcher', 'root.parentpatcher'], actual = [];
  function scope(name) {
    if (name !== 'root') expected.push(name + '.parentpatcher', name + '.box');
    expected.push(name + '.firstobject');
    for (const object of f.scopeObjects[name]) {
      const anchor = Object.keys(f.byAnchor).find(a => f.byAnchor[a] === object);
      expected.push(...['patcher', 'maxclass', 'varname', 'getboxattr', 'getboxattr()', 'rect.length', 'rect.0', 'rect.1', 'rect.2', 'rect.3', 'subpatcher', 'subpatcher()'].map(k => anchor + '.' + k));
      if (f.scopes[anchor]) {expected.push(name + '.getnamed', name + '.getnamed()'); scope(anchor);}
      expected.push(anchor + '.nextobject');
    }
  }
  scope('root'); expected.push('root.filepath');
  let muted = false;
  const record = event => {if (!muted && new Error().stack.includes('at sample (')) actual.push(event);};
  function property(object, key, name, method = false) {
    let value = object[key];
    Object.defineProperty(object, key, {configurable: true, get() {
      record(name + '.' + key);
      if (!method) return value;
      const captured = value;
      return function (...args) {
        record(name + '.' + key + '()');
        const previous = muted; muted = true;
        let result; try {result = captured.apply(this, args);} finally {muted = previous;}
        if (key === 'getboxattr') result = new Proxy(result, {get(target, coordinate) {
          if (['length', '0', '1', '2', '3'].includes(coordinate)) record(name + '.rect.' + coordinate);
          return target[coordinate];
        }});
        return result;
      };
    }, set(next) {value = next;}});
  }
  property(f.c.max, 'frontpatcher', 'max');
  property(f.root, 'parentpatcher', 'root'); property(f.root, 'filepath', 'root');
  for (const [name, object] of Object.entries(f.scopes)) {
    if (name !== 'root') {property(object, 'parentpatcher', name); property(object, 'box', name);}
    property(object, 'firstobject', name); property(object, 'getnamed', name, true);
  }
  for (const [name, object] of Object.entries(f.byAnchor))
    for (const key of ['patcher', 'maxclass', 'varname', 'getboxattr', 'subpatcher', 'nextobject'])
      property(object, key, name, ['getboxattr', 'subpatcher'].includes(key));
  return {expected, actual};
}
function case010(name, body) {
  if (process.env.ARITHMETIC_010_CASE && process.env.ARITHMETIC_010_CASE !== name) return;
  try {body(); completed010.push(name);} catch (error) {failures010.push({name, error: error.message});}
}
case010('minus010_stable_work_budget', () => {
  const f = minus009Fixture(), counts = work010(f);
  f.start(); f.finish(); const e = refused009(f);
  assert.equal(counts.samples, 89); assert.equal(counts.rectangles, 20820); assert.equal(counts.filepaths, 159);
  assert.deepEqual(f.calls, f.targets.flatMap(a => [[a, 'getattr'], [a, 'getvalueof']]));
  assert.deepEqual(e.counts, {lookups_attempted: 6, invocation_attempts: 6, invocation_outcomes_retained: 6, completed_pairs: 3});
  assert.equal(f.ack().anchor_diagnostics.length, 7); assert.equal(e.collection.diagnostic_sha256, digest009(f.ack().anchor_diagnostics));
  for (const [name, value] of Object.entries({command: f.command, definition: f.d, configuration: f.c.config, owner: f.owner}))
    assert.equal(e.binding[name + '_snapshot_sha256'], digest009(value));
  console.log(JSON.stringify({work010: 'stable', counts}));
  assert.deepEqual(counts.canonical, {command: 1, definition: 1, configuration: 1, owner: 1}, 'four complete snapshots must be canonicalized once');
  assert.equal(counts.source, 1); assert.ok(counts.geometry <= 63, 'only source and first eligible host geometry may be hashed');
});
case010('minus010_ineligible_source_cache', () => {
  const f = minus009Fixture(), oracle = readOracle010(f), counts = work010(f); f.root.parentpatcher = {};
  f.start(); f.finish(); assert.equal(refused009(f), undefined); assert.equal(f.calls.length, 0);
  assert.equal(counts.rectangles, 19040); assert.equal(counts.filepaths, 70);
  assert.equal(counts.samples, 70);
  assert.deepEqual(oracle.actual, Array.from({length: 70}, () => ['max.frontpatcher', 'root.parentpatcher']).flat(), 'ineligible ownership must still be freshly read each retry');
  console.log(JSON.stringify({work010: 'ineligible', counts}));
  assert.equal(counts.source, 1, 'successful immutable validation must survive ineligible host retries');
  assert.deepEqual(counts.canonical, {command: 1, definition: 1, configuration: 1, owner: 1});
});
case010('minus010_complete_ordered_read_oracle', () => {
  const f = minus009Fixture(), oracle = readOracle010(f);
  f.start(); f.finish(); const e = refused009(f);
  assert.equal(e.collection.status, 'complete');
  assert.equal(oracle.actual.length, oracle.expected.length * 89);
  for (let index = 0; index < 89; index++)
    assert.deepEqual(oracle.actual.slice(index * oracle.expected.length, (index + 1) * oracle.expected.length), oracle.expected, 'fresh sample ' + index);
  assert.equal(digest009(oracle.actual), 'bd9606c23777bcc7bce36c56f688eaea22d3314bf88b55110394d03059fbfea6', 'ordered baseline from current009 before source edits');
  console.log(JSON.stringify({readOracle010: {samples: 89, readsPerSample: oracle.expected.length, orderedDigest: digest009(oracle.actual)}}));
});
case010('minus010_complete_plain_mutations_after_cache', () => {
  const mutations = {
    'array-prototype': f => {Object.setPrototypeOf(f.d.boxes, Object.create(Array.prototype));},
    nested: f => {f.d.boxes[0].authored_text += ' changed';},
    'full-inventory-value': f => {f.d.full_inventory[0].source_box_sha256 = 'e'.repeat(64);},
    'edge-value': f => {f.d.saved_edges[0].source[1]++;},
    'leaf-value': f => {f.d.observer_leaves[0].varname += '-changed';},
    'helper-value': f => {f.c.config.helpers[0].bytes++;},
    'path-value': f => {f.d.pristine_path += '-changed';},
    'owner-value': f => {f.owner.channel += '-changed';},
    'other-definition': f => {f.c.config.documents[1].nested.value++;},
    'added-command': f => {f.command.extra = 1;},
    'missing-owner': f => {delete f.owner.channel;},
    'added-config': f => {f.c.config.extra = true;},
    'array-order': f => {f.d.saved_edges.reverse();},
    'array-length': f => {f.d.observer_leaves.pop();},
    'array-expando': f => {f.d.boxes.extra = 1;},
    'array-hole': f => {delete f.d.boxes[0];},
    type: f => {f.d.boxes[0].inlets = true;},
    toJSON: f => {f.c.config.documents[1].toJSON = () => {assert.fail('user serialization called');};},
    function: f => {f.c.config.documents[1].nested.value = () => 1;},
    undefined: f => {f.c.config.documents[1].nested.value = undefined;},
    nonfinite: f => {f.c.config.documents[1].nested.value = Infinity;},
    nan: f => {f.c.config.documents[1].nested.value = NaN;},
    'negative-infinity': f => {f.c.config.documents[1].nested.value = -Infinity;},
    cycle: f => {f.c.config.documents[1].nested.value = f.c.config.documents[1];},
    'definition-reference': f => {f.c.config.documents[0] = plain(f.d);},
    'owner-reference': f => {f.c.config.lifecycle.owners[4] = plain(f.owner);},
    'document-array-reference': f => {f.c.config.documents = [...f.c.config.documents];},
    'helper-array-reference': f => {f.c.config.helpers = [...f.c.config.helpers];},
    'configuration-reference': f => {f.c.config = {...f.c.config};},
    'action-reference': f => {f.c.shared = {...f.c.shared};},
    'hidden-field': f => {Object.defineProperty(f.d.boxes, 'extra', {value: 1});},
    symbol: f => {f.c.config.documents[1][Symbol('extra')] = 1;},
    prototype: f => {Object.setPrototypeOf(f.c.config.documents[1].nested, {unexpected: 1});}
  };
  for (const [name, mutate] of Object.entries(mutations)) for (const phase of ['lookup', 'outcome', 'later']) {
    const f = minus009Fixture(); f.c.config.documents.push({document: 'synthetic-other', nested: {value: 0}});
    const object = f.byAnchor[f.targets[0]], original = object.getattr;
    if (phase === 'lookup') Object.defineProperty(object, 'getattr', {get() {mutate(f); return original;}});
    if (phase === 'outcome') object.getattr = function (...args) {const result = original.apply(this, args); mutate(f); return result;};
    f.start(); f.run();
    if (phase === 'later') mutate(f);
    f.finish(); const e = refused009(f), prefix = phase === 'lookup' ? 0 : phase === 'outcome' ? 1 : 6;
    assert.ok(e, name + '/' + phase); assert.equal(f.calls.length, prefix, name + '/' + phase);
    assert.equal(e.counts.invocation_outcomes_retained, prefix); assert.equal(e.counts.completed_pairs, phase === 'later' ? 3 : 0);
    assert.equal(e.terminal_context.stale, true);
    assert.equal(e.terminal_context.first_invalidation.code, 'guard-threw');
    assert.equal(e.terminal_context.first_invalidation.stage, phase === 'later' ? 'later-validation' : 'collection-guard');
    if (phase !== 'later') assert.equal(e.collection.first_failure.stage, phase === 'lookup' ? 'guard-before-invocation' : 'guard-after-outcome');
    assert.equal(e.binding.command_snapshot_sha256, digest009({command_id: 101, op: 'operation', action: 'install', document: 'minus', revision: 1,
      action_revision: 1, step_id: 'install-minus-r1', source_sha256: f.d.source_sha256}));
  }
});
case010('minus010_object_order_and_finite_numeric_equivalence', () => {
  const f = minus009Fixture(); f.c.config.synthetic = {zero: 0, fraction: 1.25, integer: 2};
  const object = f.byAnchor[f.targets[0]], original = object.getattr;
  object.getattr = function (...args) {
    f.c.config.synthetic = {integer: 2.0, fraction: 1.250, zero: -0};
    const keys = Object.keys(f.command).reverse(), values = keys.map(k => f.command[k]);
    for (const key of keys) delete f.command[key]; keys.forEach((key, i) => {f.command[key] = values[i];});
    return original.apply(this, args);
  };
  f.start(); f.finish(); const e = refused009(f);
  assert.equal(f.calls.length, 6); assert.equal(e.terminal_context.stale, false); assert.equal(e.collection.status, 'complete');
});
case010('minus010_post_source_validation_equality', () => {
  const f = minus009Fixture(); f.c.config.synthetic = 0;
  const source = f.c.minusSourceDefinition; let calls = 0;
  f.c.minusSourceDefinition = (...args) => {const result = source(...args); if (++calls === 1) f.c.config.synthetic = 1; return result;};
  f.start(); f.run(); assert.equal(f.calls.length, 0); assert.equal(f.collector.exportData(), null);
  f.c.config.synthetic = 0; f.finish(); const e = refused009(f);
  assert.equal(calls, 2, 'source success that changes plain inputs cannot populate the cache');
  assert.equal(f.calls.length, 6); assert.equal(e.collection.poll_index, 2); assert.equal(e.terminal_context.stale, false);
});
case010('minus010_binding_change_and_invalid_eligibility_codes', () => {
  const mutations = {
    reorder(f) {const list = f.scopeObjects['root/obj-2'], first = list[0], second = list[1];
      f.scopes['root/obj-2'].firstobject = second; second.nextobject = first; first.nextobject = list[2];},
    replacement(f) {const object = f.byAnchor['root/obj-4'], replacement = {...object}; f.byAnchor['root/obj-3'].nextobject = replacement;},
    class(f) {f.byAnchor['root/obj-4'].maxclass = 'invalid-class';},
    name(f) {f.byAnchor['root/obj-4'].varname = 'invalid-name';},
    rectangle(f) {f.byAnchor['root/obj-4'].live[0]++;},
    ownership(f) {f.byAnchor['root/obj-4'].patcher = {};}
  };
  for (const [name, mutate] of Object.entries(mutations)) for (const phase of ['collection', 'later']) {
    const f = minus009Fixture(), object = f.byAnchor[f.targets[0]], original = object.getattr;
    if (phase === 'collection') object.getattr = function (...args) {const result = original.apply(this, args); mutate(f); return result;};
    f.start(); f.run(); if (phase === 'later') mutate(f); f.finish(); const e = refused009(f);
    const code = ['reorder', 'replacement'].includes(name) ? 'binding-changed' : 'guard-threw';
    assert.equal(e.terminal_context.first_invalidation.code, code, name + '/' + phase);
    assert.equal(e.terminal_context.first_invalidation.stage, phase === 'later' ? 'later-validation' : 'collection-guard');
    assert.equal(e.counts.invocation_outcomes_retained, phase === 'later' ? 6 : 1);
    assert.equal(f.calls.length, phase === 'later' ? 6 : 1);
    if (phase === 'collection') {assert.equal(e.collection.first_failure.code, code); assert.equal(e.collection.first_failure.stage, 'guard-after-outcome');}
  }
});
for (const form of ['object', 'array']) for (const phase of ['lookup', 'outcome', 'later'])
  case010('minus010_fix1_inherited_hook_' + form + '_' + phase, () => {
    const f = minus009Fixture(); f.c.config.synthetic = form === 'object' ? {value: 0} : [0];
    let serializationCalls = 0;
    const prototype = form === 'object' ? Object.create(null) : Object.setPrototypeOf([], Object.prototype);
    prototype.toJSON = () => {serializationCalls++; return null;};
    const mutate = () => {Object.setPrototypeOf(f.c.config.synthetic, prototype);};
    const object = f.byAnchor[f.targets[0]], original = object.getattr;
    if (phase === 'lookup') Object.defineProperty(object, 'getattr', {get() {mutate(); return original;}});
    if (phase === 'outcome') object.getattr = function (...args) {const result = original.apply(this, args); mutate(); return result;};
    f.start(); f.run(); if (phase === 'later') mutate(); f.finish();
    const e = refused009(f), prefix = phase === 'lookup' ? 0 : phase === 'outcome' ? 1 : 6;
    console.log(JSON.stringify({fix1010: {form, phase, calls: f.calls.length, serializationCalls, stale: e.terminal_context.stale}}));
    assert.equal(serializationCalls, 0, 'inherited serialization hooks must never execute');
    assert.equal(f.calls.length, prefix, form + '/' + phase + ': exact invocation prefix');
    assert.deepEqual(e.counts, {lookups_attempted: phase === 'later' ? 6 : 1, invocation_attempts: prefix,
      invocation_outcomes_retained: prefix, completed_pairs: phase === 'later' ? 3 : 0});
    assert.equal(e.terminal_context.stale, true);
    assert.deepEqual(e.terminal_context.first_invalidation, {poll_index: phase === 'later' ? 2 : 1,
      stage: phase === 'later' ? 'later-validation' : 'collection-guard', code: 'guard-threw'});
    assert.equal(e.collection.status, phase === 'later' ? 'complete' : 'stopped');
    assert.deepEqual(e.collection.first_failure, phase === 'later' ? null : {
      stage: phase === 'lookup' ? 'guard-before-invocation' : 'guard-after-outcome', method_index: 0, code: 'guard-threw'});
    if (prefix) {assert.equal(e.methods[0].invocation_status, 'returned'); assert.equal(e.methods[0].observation.value, 9);}
    else {assert.equal(e.methods[0].lookup_status, 'callable'); assert.equal(e.methods[0].invocation_status, 'unattempted'); assert.equal(e.methods[0].observation, null);}
    assert.ok(e.methods.slice(prefix).every(row => row.invocation_status === 'unattempted'));
  });
case010('minus010_fix1_plain_cross_realm_and_null_prototype', () => {
  for (const form of ['local-object', 'local-array', 'foreign-object', 'foreign-array', 'null-object', 'null-array']) {
    const f = minus009Fixture(); f.c.config.synthetic = form.endsWith('array') ? [0] : {value: 0};
    let replacement;
    if (form.startsWith('local-')) replacement = vm.runInContext(form.endsWith('array') ? '[0]' : '({value: 0})', f.c);
    else if (form.startsWith('foreign-')) replacement = vm.runInNewContext(form.endsWith('array') ? '[0]' : '({value: 0})');
    else replacement = Object.setPrototypeOf(form.endsWith('array') ? [0] : {value: 0}, null);
    const object = f.byAnchor[f.targets[0]], original = object.getattr;
    object.getattr = function (...args) {f.c.config.synthetic = replacement; return original.apply(this, args);};
    f.start(); f.finish(); const e = refused009(f);
    assert.equal(f.calls.length, 6, form); assert.equal(e.collection.status, 'complete');
    assert.deepEqual(e.terminal_context, {stale: false, first_invalidation: null});
    assert.deepEqual(e.counts, {lookups_attempted: 6, invocation_attempts: 6, invocation_outcomes_retained: 6, completed_pairs: 3});
  }
});
console.log(JSON.stringify({completed010, failures010}));
assert.equal(failures010.length, 0, 'preparation010 behavioral regressions');

const completed011 = [], failures011 = [];
function case011(name, body) {
  if (process.env.ARITHMETIC_011_CASE && process.env.ARITHMETIC_011_CASE !== name) return;
  try {body(); completed011.push(name);} catch (error) {failures011.push({name, error: error.message});}
}
case011('minus011_terminal_root_parent_progress', () => {
  const f = minus009Fixture(); f.root.parentpatcher = {};
  f.start(); f.finish(); const ack = f.ack();
  assert.equal(ack.success, false); assert.equal(ack.anchor_diagnostics.length, 7);
  assert.equal(ack.minus_numeric_preflight_diagnostic, undefined); assert.equal(f.calls.length, 0);
  assert.ok(ack.minus_collector_progress, 'terminal refusal must identify the collector boundary even without a capability envelope');
  const progress = ack.minus_collector_progress;
  assert.equal(progress.version, 'minus-collector-progress-v1');
  assert.equal(progress.last_eligibility_failure.phase, 'root-parent');
  assert.equal(progress.last_eligibility_failure.reason, 'root-parent-mismatch');
  assert.equal(progress.last_eligibility_failure.error_code, 'minus-root-ownership');
  assert.equal(progress.observe_entries, 70); assert.equal(progress.host_sample_attempts, 70);
  assert.equal(progress.phase, 'terminal-export');
});
function insideSample011() {return new Error().stack.includes('at sample (');}
function sampleRead011(object, key, transform) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key), value = descriptor && descriptor.value;
  Object.defineProperty(object, key, {configurable: true, get() {
    const original = descriptor && descriptor.get ? descriptor.get.call(this) : value;
    return insideSample011() ? transform(original) : original;
  }});
}
function hostile011() {
  let probes = 0;
  const probe = () => {probes++; throw Error('unknown exception was inspected');};
  return {exception: new Proxy({}, {get: probe, ownKeys: probe, getPrototypeOf: probe, getOwnPropertyDescriptor: probe}),
    probes: () => probes};
}
function progress011(f, counts) {
  const envelope = refused009(f), progress = f.ack().minus_collector_progress;
  assert.ok(progress); assert.deepEqual(progress.counts, counts);
  assert.equal(f.calls.length, counts.invocation_attempts);
  if (envelope) assert.deepEqual(envelope.counts, {lookups_attempted: counts.lookup_attempts,
    invocation_attempts: counts.invocation_attempts, invocation_outcomes_retained: counts.outcomes_retained,
    completed_pairs: counts.completed_pairs});
  assert.equal(progress.phase, 'terminal-export');
  return progress;
}
const zero011 = {lookup_attempts: 0, invocation_attempts: 0, outcomes_retained: 0, completed_pairs: 0};
case011('minus011_stable_progress_and_work', () => {
  const f = minus009Fixture(), work = work010(f); f.start(); f.finish();
  const p = progress011(f, {lookup_attempts: 6, invocation_attempts: 6, outcomes_retained: 6, completed_pairs: 3});
  assert.deepEqual(p.identity, {request_id: 101, step_id: 'install-minus-r1', document: 'minus', revision: 1,
    source_sha256: f.command.source_sha256, owner_inlet: 4, working_path: 'Z:/synthetic/work/working/minus-r1.maxhelp'});
  assert.equal(p.initial_snapshot_available, true); assert.equal(p.observe_entries, 70);
  assert.equal(p.source_validation_attempts, 1); assert.equal(p.source_validated, true);
  assert.equal(p.host_sample_attempts, 89); assert.equal(p.last_sample_phase, 'final-path');
  assert.equal(p.envelope_created, true); assert.equal(p.collection_entered, true);
  assert.equal(p.first_eligibility_failure, null); assert.equal(p.last_eligibility_failure, null);
  assert.deepEqual(p.collection, {status: 'complete', first_failure: null});
  assert.deepEqual(work.canonical, {command: 1, definition: 1, configuration: 1, owner: 1});
  assert.equal(work.source, 1); assert.equal(work.geometry, 63);
  assert.equal(work.samples, 89); assert.equal(work.rectangles, 20820); assert.equal(work.filepaths, 159);
  console.log(JSON.stringify({work011: 'stable', work, progressCounts: p.counts}));
});
case011('minus011_ownership_subconditions_and_skipped_reads', () => {
  const cases = [
    {phase: 'front-root', reason: 'front-root-mismatch', code: 'minus-root-ownership', boundary: 'root.parentpatcher',
      mutate(f) {sampleRead011(f.c.max, 'frontpatcher', () => ({}));}},
    {phase: 'root-parent', reason: 'root-parent-mismatch', code: 'minus-root-ownership', boundary: 'root.firstobject',
      mutate(f) {f.root.parentpatcher = {};}},
    {phase: 'scope-duplicate', reason: 'duplicate-scope', code: 'minus-scope-ownership', boundary: 'root/obj-2.parentpatcher',
      mutate(f) {const o = f.byAnchor['root/obj-2'], original = o.subpatcher;
        o.subpatcher = function () {return insideSample011() ? f.root : original.call(this);};}},
    {phase: 'child-parent', reason: 'child-parent-mismatch', code: 'minus-scope-ownership', boundary: 'root/obj-2.box',
      mutate(f) {f.scopes['root/obj-2'].parentpatcher = {};}},
    {phase: 'child-container', reason: 'child-container-mismatch', code: 'minus-scope-ownership', boundary: 'root/obj-2.firstobject',
      mutate(f) {f.scopes['root/obj-2'].box = {};}}
  ];
  for (const test of cases) {
    const f = minus009Fixture(), oracle = readOracle010(f); test.mutate(f); f.start(); f.finish();
    const p = progress011(f, zero011), failure = p.last_eligibility_failure;
    assert.equal(failure.phase, test.phase); assert.equal(failure.reason, test.reason); assert.equal(failure.error_code, test.code);
    assert.equal(p.first_eligibility_failure.poll_index, 1); assert.equal(failure.poll_index, 70);
    assert.equal(p.host_sample_attempts, 70); assert.equal(p.source_validation_attempts, 1);
    const prefix = oracle.expected.slice(0, oracle.expected.indexOf(test.boundary));
    assert.deepEqual(oracle.actual, Array.from({length: 70}, () => prefix).flat(), test.phase + ': skipped reads must remain skipped');
    assert.equal(f.ack().minus_numeric_preflight_diagnostic, undefined);
  }
});
case011('minus011_hostile_ownership_throws_and_skipped_reads', () => {
  for (const test of [
    {phase: 'front-root', object: f => f.c.max, key: 'frontpatcher', boundary: 'root.parentpatcher'},
    {phase: 'root-parent', object: f => f.root, key: 'parentpatcher', boundary: 'root.firstobject'},
    {phase: 'child-parent', object: f => f.scopes['root/obj-2'], key: 'parentpatcher', boundary: 'root/obj-2.box'},
    {phase: 'child-container', object: f => f.scopes['root/obj-2'], key: 'box', boundary: 'root/obj-2.firstobject'}
  ]) {
    const f = minus009Fixture(), oracle = readOracle010(f), unknown = hostile011();
    sampleRead011(test.object(f), test.key, () => {throw unknown.exception;});
    f.start(); f.finish(); const p = progress011(f, zero011);
    assert.equal(p.last_eligibility_failure.phase, test.phase); assert.equal(p.last_eligibility_failure.reason, 'threw');
    assert.equal(p.last_eligibility_failure.error_code, null); assert.equal(unknown.probes(), 0);
    const prefix = oracle.expected.slice(0, oracle.expected.indexOf(test.boundary));
    assert.deepEqual(oracle.actual, Array.from({length: 70}, () => prefix).flat(), test.phase + ': throwing earlier operand must skip later reads');
  }
  const f = minus009Fixture(), oracle = readOracle010(f), unknown = hostile011();
  const arrayPrototype = vm.runInContext('Array.prototype', f.c), original = arrayPrototype.indexOf;
  arrayPrototype.indexOf = function (...args) {
    if (new Error().stack.includes('at scope (')) throw unknown.exception;
    return Reflect.apply(original, this, args);
  };
  f.start(); f.finish(); const p = progress011(f, zero011);
  assert.equal(p.last_eligibility_failure.phase, 'scope-duplicate'); assert.equal(p.last_eligibility_failure.reason, 'threw');
  assert.equal(unknown.probes(), 0);
  assert.deepEqual(oracle.actual, Array.from({length: 70}, () => ['max.frontpatcher', 'root.parentpatcher']).flat(),
    'a throwing duplicate-scope check must skip all following ownership and inventory reads');
});
case011('minus011_initial_input_and_source_boundaries', () => {
  for (const test of [
    {name: 'initial-throw', first: 'initial-snapshots', reason: 'threw', initial: false, source: 0,
      mutate(f, unknown) {const original = f.c.minusCanonical;
        f.c.minusCanonical = value => {if (value === f.command) throw unknown.exception; return original(value);};}},
    {name: 'initial-identity', first: 'initial-inputs', reason: 'input-identity', initial: false, source: 0,
      mutate(f) {f.c.shared.action_revision = 2;}},
    {name: 'plain-inequality', first: 'plain-inputs', reason: 'input-inequality', initial: true, source: 0,
      mutate(f) {f.c.config.synthetic = 0; f.c.max.message = () => {f.c.config.synthetic = 1;};}},
    {name: 'source-throw', first: 'source-validation', reason: 'threw', initial: true, source: 70,
      mutate(f, unknown) {f.c.minusSourceDefinition = () => {throw unknown.exception;};}},
    {name: 'post-source-inequality', first: 'post-source-inputs', reason: 'input-inequality', initial: true, source: 1,
      mutate(f) {f.c.config.synthetic = 0; const original = f.c.minusSourceDefinition;
        f.c.minusSourceDefinition = (...args) => {const owner = original(...args); f.c.config.synthetic = 1; return owner;};}}
  ]) {
    const f = minus009Fixture(), unknown = hostile011(); test.mutate(f, unknown); f.start(); f.finish();
    const p = progress011(f, zero011);
    assert.equal(p.first_eligibility_failure.phase, test.first, test.name);
    assert.equal(p.first_eligibility_failure.reason, test.reason, test.name);
    assert.equal(p.initial_snapshot_available, test.initial); assert.equal(p.source_validation_attempts, test.source);
    assert.equal(p.source_validated, false); assert.equal(p.host_sample_attempts, 0);
    assert.equal(p.envelope_created, false); assert.equal(p.collection_entered, false); assert.equal(p.collection, null);
    assert.equal(p.identity.working_path, test.initial ? 'Z:/synthetic/work/working/minus-r1.maxhelp' : null);
    assert.equal(unknown.probes(), 0);
    if (!test.initial) {assert.equal(p.first_eligibility_failure.poll_index, 0); assert.equal(p.last_eligibility_failure.reason, 'initial-unavailable');}
  }
});
case011('minus011_diagnostic_gate_boundaries', () => {
  for (const test of [
    {phase: 'diagnostic-shape', reason: 'diagnostic-shape', mutate(rows) {rows.pop();}},
    {phase: 'diagnostic-pins', reason: 'diagnostic-pin-mismatch', mutate(rows) {rows[0].expected_maxclass = 'synthetic-invalid';}},
    {phase: 'diagnostic-candidates', reason: 'diagnostic-candidate-mismatch', mutate(rows) {rows[0].candidates[0].maxclass = 'synthetic-invalid';}}
  ]) {
    const f = minus009Fixture(), create = f.c.createMinusDiagnosticCollector;
    f.c.createMinusDiagnosticCollector = (...args) => {
      const collector = create(...args), observe = collector.observe;
      collector.observe = (root, definition, poll, rows) => {const copy = plain(rows); test.mutate(copy); return observe(root, definition, poll, copy);};
      return collector;
    };
    f.start(); f.finish(); const p = progress011(f, zero011);
    assert.equal(p.last_eligibility_failure.phase, test.phase); assert.equal(p.last_eligibility_failure.reason, test.reason);
    assert.equal(p.host_sample_attempts, 70); assert.equal(p.source_validation_attempts, 1);
    assert.equal(p.envelope_created, false); assert.equal(f.ack().anchor_diagnostics.length, 7);
  }
});
case011('minus011_malformed_owned_path_stays_primitive', () => {
  for (const value of [{nested: {value: 1}}, [1], 7, true, undefined]) {
    const f = minus009Fixture(); f.d.working_windows_path = value;
    f.start(); f.finish(); const p = progress011(f, zero011);
    assert.ok(Object.hasOwn(p.identity, 'working_path'), 'invalid path must retain the explicit identity key');
    assert.equal(p.identity.working_path, null, 'only an owned string may become the progress working path');
    assert.equal(p.source_validated, false); assert.equal(p.envelope_created, false);
  }
});
case011('minus011_sample_property_throw_phases', () => {
  for (const test of [
    {phase: 'scope-firstobject', object: f => f.root, key: 'firstobject'},
    {phase: 'object-parent', object: f => f.byAnchor['root/obj-1'], key: 'patcher'},
    {phase: 'object-class', object: f => f.byAnchor['root/obj-1'], key: 'maxclass'},
    {phase: 'object-name', object: f => f.byAnchor['root/obj-1'], key: 'varname'},
    {phase: 'object-rectangle', object: f => f.byAnchor['root/obj-1'], key: 'getboxattr'},
    {phase: 'object-child', object: f => f.byAnchor['root/obj-1'], key: 'subpatcher'},
    {phase: 'object-nextobject', object: f => f.byAnchor['root/obj-1'], key: 'nextobject'},
    {phase: 'named-child', object: f => f.root, key: 'getnamed'},
    {phase: 'root-filepath', object: f => f.root, key: 'filepath'}
  ]) {
    const f = minus009Fixture(), unknown = hostile011();
    sampleRead011(test.object(f), test.key, () => {throw unknown.exception;});
    f.start(); f.finish(); const p = progress011(f, zero011);
    assert.equal(p.last_eligibility_failure.phase, test.phase); assert.equal(p.last_eligibility_failure.reason, 'threw');
    assert.equal(p.last_eligibility_failure.error_code, null); assert.equal(unknown.probes(), 0);
  }
  for (const property of ['length', '0']) {
    const f = minus009Fixture(), unknown = hostile011(), object = f.byAnchor['root/obj-1'], original = object.getboxattr;
    object.getboxattr = function (...args) {
      const raw = original.apply(this, args);
      return insideSample011() ? new Proxy(raw, {get(target, key) {if (key === property) throw unknown.exception; return Reflect.get(target, key);}}) : raw;
    };
    f.start(); f.finish(); const p = progress011(f, zero011);
    assert.equal(p.last_eligibility_failure.phase, property === 'length' ? 'rectangle-shape' : 'rectangle-coordinate');
    assert.equal(p.last_eligibility_failure.reason, 'threw'); assert.equal(unknown.probes(), 0);
  }
});
case011('minus011_explicit_sample_rejections', () => {
  for (const test of [
    {phase: 'object-parent', code: 'minus-object-parent', object: f => f.byAnchor['root/obj-1'], key: 'patcher', value: {}},
    {phase: 'object-identity', code: 'minus-runtime-identity', object: f => f.byAnchor['root/obj-1'], key: 'maxclass', value: 1},
    {phase: 'runtime-name', code: 'minus-runtime-name', object: f => f.byAnchor['root/obj-1'], key: 'varname', value: 'synthetic-wrong'},
    {phase: 'scope-count', code: 'minus-scope-count', object: f => f.root, key: 'firstobject', value: null}
  ]) {
    const f = minus009Fixture(); sampleRead011(test.object(f), test.key, () => test.value);
    f.start(); f.finish(); const p = progress011(f, zero011);
    assert.equal(p.last_eligibility_failure.phase, test.phase); assert.equal(p.last_eligibility_failure.error_code, test.code);
  }
  for (const test of [
    {phase: 'rectangle-shape', code: 'minus-runtime-rectangle', change: () => [1]},
    {phase: 'rectangle-coordinate', code: 'minus-runtime-coordinate', change: () => [Infinity, 1, 2, 3]},
    {phase: 'runtime-mapping', code: 'minus-runtime-bijection', change: raw => [raw[0] + 1, ...raw.slice(1)]}
  ]) {
    const f = minus009Fixture(), object = f.byAnchor['root/obj-1'], original = object.getboxattr;
    object.getboxattr = function (...args) {const raw = original.apply(this, args); return insideSample011() ? test.change(raw) : raw;};
    f.start(); f.finish(); const p = progress011(f, zero011);
    assert.equal(p.last_eligibility_failure.phase, test.phase); assert.equal(p.last_eligibility_failure.error_code, test.code);
  }
  for (const change of ['plain', 'path']) {
    const f = minus009Fixture(); f.c.config.synthetic = 0;
    sampleRead011(f.root, 'filepath', original => {if (change === 'plain') f.c.config.synthetic++; return change === 'path' ? original + '-changed' : original;});
    f.start(); f.finish(); const p = progress011(f, zero011);
    assert.equal(p.first_eligibility_failure.phase, change === 'plain' ? 'final-inputs' : 'final-path');
    assert.equal(p.first_eligibility_failure.error_code, 'minus-final-input-binding');
  }
});
case011('minus011_unattempted_first_guard_retains_collection_stop', () => {
  const f = minus009Fixture(); let samples = 0;
  sampleRead011(f.c.max, 'frontpatcher', original => (++samples === 1 ? original : {}));
  f.start(); f.finish(); const p = progress011(f, zero011);
  assert.equal(p.envelope_created, true); assert.equal(p.collection_entered, true); assert.equal(p.host_sample_attempts, 71);
  assert.equal(f.ack().minus_numeric_preflight_diagnostic, undefined);
  assert.deepEqual(p.collection, {status: 'stopped', first_failure: {stage: 'guard-before-lookup', method_index: 0, code: 'guard-threw'}});
  assert.equal(p.first_eligibility_failure.stage, 'collection-guard'); assert.equal(p.last_eligibility_failure.phase, 'front-root');
  assert.equal(p.last_eligibility_failure.error_code, 'minus-root-ownership');
});
case011('minus011_partial_lookup_invocation_and_classification_counts', () => {
  for (const shape of ['lookup-change', 'outcome-change', 'classification', 'unsupported', 'lookup-throw', 'invocation-throw']) {
    const f = minus009Fixture(), object = f.byAnchor[f.targets[0]], original = object.getattr, unknown = hostile011();
    if (shape === 'lookup-change') Object.defineProperty(object, 'getattr', {get() {f.owner.channel += '-changed'; return original;}});
    if (shape === 'outcome-change') object.getattr = function (...args) {const raw = original.apply(this, args); f.owner.channel += '-changed'; return raw;};
    if (shape === 'classification') object.getattr = function (...args) {original.apply(this, args); return new Proxy([1], {get() {throw unknown.exception;}});};
    if (shape === 'unsupported') f.c.minusIntrinsicApply = null;
    if (shape === 'lookup-throw') Object.defineProperty(object, 'getattr', {get() {throw unknown.exception;}});
    if (shape === 'invocation-throw') object.getattr = function (...args) {original.apply(this, args); throw unknown.exception;};
    f.start(); f.finish();
    const counts = shape === 'lookup-change' || shape === 'unsupported' ? {lookup_attempts: 1, invocation_attempts: 0, outcomes_retained: 0, completed_pairs: 0} :
      shape === 'outcome-change' || shape === 'classification' ? {lookup_attempts: 1, invocation_attempts: 1, outcomes_retained: 1, completed_pairs: 0} :
      shape === 'lookup-throw' ? {lookup_attempts: 6, invocation_attempts: 5, outcomes_retained: 5, completed_pairs: 3} :
      {lookup_attempts: 6, invocation_attempts: 6, outcomes_retained: 6, completed_pairs: 3};
    const p = progress011(f, counts), e = f.ack().minus_numeric_preflight_diagnostic;
    assert.deepEqual(p.collection, {status: e.collection.status, first_failure: e.collection.first_failure});
    if (shape === 'lookup-change') assert.equal(p.collection.first_failure.stage, 'guard-before-invocation');
    if (shape === 'outcome-change') assert.equal(p.collection.first_failure.stage, 'guard-after-outcome');
    if (shape === 'classification') assert.equal(p.collection.first_failure.stage, 'classification');
    if (shape === 'unsupported') assert.equal(p.collection.first_failure.code, 'unsupported-intrinsic-bridge');
    assert.equal(unknown.probes(), 0);
  }
});
case011('minus011_later_and_terminal_stale_boundaries', () => {
  for (const when of ['later', 'terminal']) {
    const f = minus009Fixture();
    if (when === 'terminal') {const record = f.c.record; f.c.record = (kind, extra) => {record(kind, extra); if (kind === 'harness-error') f.root.parentpatcher = {};};}
    f.start(); f.run(); if (when === 'later') f.root.parentpatcher = {}; f.finish();
    const p = progress011(f, {lookup_attempts: 6, invocation_attempts: 6, outcomes_retained: 6, completed_pairs: 3});
    assert.equal(p.first_eligibility_failure.stage, when === 'later' ? 'later-validation' : 'terminal-guard');
    assert.equal(p.last_eligibility_failure.stage, 'terminal-guard'); assert.equal(p.last_eligibility_failure.phase, 'root-parent');
    const e = f.ack().minus_numeric_preflight_diagnostic;
    assert.equal(e.terminal_context.stale, true); assert.equal(e.terminal_context.first_invalidation.stage, p.first_eligibility_failure.stage);
    assert.deepEqual(p.collection, {status: 'complete', first_failure: null});
  }
});
case011('minus011_owned_host_free_repeated_export', () => {
  const f = minus009Fixture(); f.c.minusIntrinsicApply = null; f.start(); f.run(); f.root.parentpatcher = {}; f.finish();
  const expected = plain(f.ack().minus_collector_progress), memory = [...f.memory];
  let reads = 0;
  const rejectRead = () => {reads++; throw Error('progress export read live data');};
  for (const object of [f.root, f.c.max, ...Object.values(f.byAnchor), ...Object.values(f.scopes)])
    for (const key of Object.keys(object)) if (Object.getOwnPropertyDescriptor(object, key).configurable)
      Object.defineProperty(object, key, {configurable: true, get: rejectRead});
  f.c.config = new Proxy({}, {get: rejectRead}); f.c.shared = new Proxy({}, {get: rejectRead});
  f.c.minusCanonical = rejectRead; f.c.minusSourceDefinition = rejectRead; f.c.geometryVectorHash = rejectRead;
  const first = plain(f.collector.exportProgress()); assert.deepEqual(first, expected);
  first.identity.working_path = 'changed'; first.counts.lookup_attempts = 99;
  first.first_eligibility_failure.reason = 'changed'; first.last_eligibility_failure.phase = 'changed';
  first.collection.first_failure.code = 'changed';
  assert.deepEqual(plain(f.collector.exportProgress()), expected); assert.equal(reads, 0);
  assert.deepEqual([...f.memory], memory);
});
case011('minus011_nonminus_and_queued_callback_boundaries', () => {
  const f = minus009Fixture(); f.start(); const queued = f.queue[0]; f.finish();
  const bytes = f.memory.get(f.c.config.ack_path); queued(); assert.equal(f.memory.get(f.c.config.ack_path), bytes); assert.equal(f.calls.length, 6);
  const other = minus009Fixture(); other.command.command_id = 102; other.start(); other.finish();
  assert.equal(other.ack().success, false); assert.equal(other.ack().minus_collector_progress, undefined); assert.equal(other.calls.length, 0);
  const plus = installTraceFixture({command: {command_id: 52}}); plus.start(); plus.finish();
  assert.equal(plus.ack().minus_collector_progress, undefined); assert.equal(plus.ack().minus_numeric_preflight_diagnostic, undefined);
});
console.log(JSON.stringify({completed011, failures011}));
assert.equal(failures011.length, 0, 'preparation011 behavioral regressions');
