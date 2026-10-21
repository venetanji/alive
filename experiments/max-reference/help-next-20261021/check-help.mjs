#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {REGISTRY, makeNode, nodeSpec, parseMessage, parsePatch, validatePatch} from '../../../apps/ultra/ui/canvas-model.mjs';
import {parseObjectText} from '../../../apps/ultra/ui/canvas-catalog.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const CURRENT = ['int', 'float', 'flonum', 'slider', 'pack', 'unpack', 'select', 'route', 'trigger', 'line'];
const NEXT = ['metro', 'counter', 'delay', 'pipe', 'change', 'gate', 'switch', 'split', 'clip', 'scale'];
const ALIASES = {i: 'int', f: 'float', sel: 'select', t: 'trigger', button: 'bang', '+': 'add', '*': 'multiply'};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const empty = () => ({version: 1, profile: 'ultra-canvas-v1', nodes: [], edges: []});
const token = box => box.maxclass === 'newobj' ? box.text?.trim().split(/\s+/)[0] || '<empty-newobj>' : box.maxclass;
const canonical = box => ALIASES[token(box)] ?? token(box);
function attempt(fn) {
  try { return {accepted: true, value: fn(), error: null}; }
  catch (error) { return {accepted: false, error: error.message}; }
}
function decision(fn) {
  const {value: _value, ...result} = attempt(fn);
  return result;
}

function convertBox(box, id) {
  const name = canonical(box);
  if (name === 'counter') throw Error('Max counter uses five inlets/four outlets; Ultra counter uses two/one and a different argument/state contract.');
  let authored;
  if (box.maxclass === 'newobj') authored = parseObjectText(box.text);
  else if (name === 'bang' || name === 'toggle') authored = {type: name, params: {}};
  else if (name === 'message') {
    if (!box.text?.trim()) throw Error('An empty Max message display requires storage/editing behavior absent from this adapter.');
    parseMessage(box.text);
    authored = {type: name, params: {text: box.text}};
  } else if (name === 'number') {
    if (box.minimum != null || box.maximum != null) throw Error('Max number bounds cannot be preserved by the current Ultra number parameters.');
    authored = {type: name, params: {}};
  } else if (name === 'flonum') {
    authored = {type: name, params: {}};
    for (const [source, target] of [['minimum', 'minimum'], ['maximum', 'maximum'], ['numdecimalplaces', 'numdecimalplaces']]) {
      if (box[source] != null) authored.params[target] = box[source];
    }
  } else if (name === 'slider') {
    authored = {type: name, params: {}};
    for (const key of ['size', 'min', 'mult', 'floatoutput']) if (box[key] != null) authored.params[key] = box[key];
  } else throw Error(`No research box adapter for ${token(box)}.`);
  const node = makeNode(authored.type, id, 0, 0, authored.params);
  validatePatch({...empty(), nodes: [node]});
  return node;
}

function inspectBasic(patcher, boxPath, selected) {
  const sourceBoxes = (patcher.boxes ?? []).map(item => item.box);
  const byId = new Map(sourceBoxes.map(box => [box.id, box]));
  const mapped = new Map(), omitted = [], portDifferences = [], cautions = new Set();
  for (const [index, box] of sourceBoxes.entries()) {
    const result = attempt(() => convertBox(box, index + 1));
    if (!result.accepted) {
      omitted.push({box_id: box.id, token: token(box), is_selected_target: canonical(box) === selected, reason: result.error});
      continue;
    }
    mapped.set(box.id, result.value);
    const spec = nodeSpec(result.value);
    if (box.numinlets !== spec.inlets.length || box.numoutlets !== spec.outlets.length) {
      portDifferences.push({box_id: box.id, token: token(box), saved: {inlets: box.numinlets, outlets: box.numoutlets}, adapted: {inlets: spec.inlets.length, outlets: spec.outlets.length}});
    }
    if (box.maxclass === 'number') cautions.add('Max integer number-box coercion, bounds, gestures and Tab behavior are not reproduced by a structural mapping to Ultra number.');
    if (box.maxclass === 'message') cautions.add('A parseable literal or named selector does not certify the receiver implements that selector. Max message editing and cold-inlet replacement are not adapted.');
    if (box.maxclass === 'newobj' && ['int', 'float', 'line'].includes(result.value.type)) cautions.add('Lexical numeric type and Max attributes/state are not all represented by Ultra numeric creation parameters.');
    if (box.maxclass !== 'newobj') cautions.add('Saved UI initialization, appearance, scripting, automation and attributes beyond the adapter allowlist are not preserved.');
  }
  const originalEdges = (patcher.lines ?? []).map(({patchline}) => patchline);
  const edges = [], boundaryEdges = [];
  for (const edge of originalEdges) {
    const from = mapped.get(edge.source[0]), to = mapped.get(edge.destination[0]);
    if (from && to) edges.push({from: from.id, outlet: edge.source[1], to: to.id, inlet: edge.destination[1]});
    else boundaryEdges.push({source: edge.source, destination: edge.destination, source_token: token(byId.get(edge.source[0]) ?? {}), destination_token: token(byId.get(edge.destination[0]) ?? {}), reason: 'One or both endpoint boxes have no accepted research mapping.'});
  }
  const nodes = [...mapped.values()];
  const adjacency = new Map(nodes.map(node => [node.id, new Set()]));
  for (const edge of edges) { adjacency.get(edge.from).add(edge.to); adjacency.get(edge.to).add(edge.from); }
  const seen = new Set(), components = [];
  const originalId = new Map([...mapped].map(([id, node]) => [node.id, id]));
  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    const ids = new Set(), queue = [node.id];
    while (queue.length) {
      const id = queue.pop();
      if (seen.has(id)) continue;
      seen.add(id); ids.add(id); queue.push(...adjacency.get(id));
    }
    const targetIds = [...ids].filter(id => canonical(byId.get(originalId.get(id))) === selected);
    if (!targetIds.length) continue;
    const patch = {...empty(), nodes: nodes.filter(item => ids.has(item.id)), edges: edges.filter(edge => ids.has(edge.from) && ids.has(edge.to))};
    const validation = decision(() => validatePatch(patch));
    const touchingBoundary = boundaryEdges.filter(edge => ids.has(mapped.get(edge.source[0])?.id) || ids.has(mapped.get(edge.destination[0])?.id));
    components.push({source_box_ids: [...ids].map(id => originalId.get(id)), target_box_ids: targetIds.map(id => originalId.get(id)), nodes: patch.nodes.length, edges: patch.edges.length, graph_sha256: hash(JSON.stringify(patch)), production_graph_validation: validation, omitted_boundary_edges: touchingBoundary, complete_source_basic_graph: false, source_graph_executed: false});
  }
  return {box_path: boxPath, source_boxes: sourceBoxes.length, source_edges: originalEdges.length, mapped_boxes: nodes.length, mapped_edges: edges.length, omitted_boxes: omitted, omitted_boundary_edges: boundaryEdges.length, saved_port_differences: portDifferences, structural_induced_graph_validation: decision(() => validatePatch({...empty(), nodes, edges})), target_components: components, semantic_cautions: [...cautions]};
}

function inspectHelp(patcher, selected) {
  const basics = [];
  let patchers = 0, boxes = 0, edges = 0;
  const shapes = new Map();
  function walk(current, ancestry) {
    patchers++; boxes += (current.boxes ?? []).length; edges += (current.lines ?? []).length;
    for (const {box} of current.boxes ?? []) {
      if (canonical(box) === selected) {
        const shape = {token: token(box), inlets: box.numinlets, outlets: box.numoutlets};
        const key = JSON.stringify(shape);
        shapes.set(key, {...shape, count: (shapes.get(key)?.count ?? 0) + 1});
      }
      if (box.patcher) {
        const childPath = [...ancestry, box.id];
        if (box.text?.trim() === 'p basic') basics.push(inspectBasic(box.patcher, childPath, selected));
        walk(box.patcher, childPath);
      }
    }
  }
  walk(patcher, []);
  return {recursive_patchers: patchers, recursive_boxes: boxes, recursive_edges: edges, target_saved_port_shapes: [...shapes.values()], basic_tabs: basics};
}

function adapterBoundaryChecks() {
  const results = [];
  function check(name, run, expected) {
    const result = decision(run);
    assert.equal(result.accepted, expected, name);
    results.push({name, ...result, expected: expected ? 'accept' : 'reject', assertion_pass: true});
  }
  check('Max counter refuses accidental same-name conversion', () => convertBox({maxclass: 'newobj', text: 'counter', numinlets: 5, numoutlets: 4}, 1), false);
  check('Numeric metro fits the bounded Ultra contract', () => convertBox({maxclass: 'newobj', text: 'metro 500'}, 1), true);
  check('Transport metro time symbol is not silently converted', () => convertBox({maxclass: 'newobj', text: 'metro 4n @active 1'}, 1), false);
  check('Message substitution is not silently removed', () => convertBox({maxclass: 'message', text: 'size $1'}, 1), false);
  check('Comma-sequenced line message requires explicit rewrite', () => convertBox({maxclass: 'message', text: '0, 12 50'}, 1), false);
  check('Empty message display does not become a default stored literal', () => convertBox({maxclass: 'message'}, 1), false);
  check('Message cold display inlet is rejected by production validation', () => validatePatch({...empty(), nodes: [makeNode('pack', 1), makeNode('message', 2)], edges: [{from: 1, outlet: 0, to: 2, inlet: 1}]}), false);
  check('Max number Tab outlet is rejected by production validation', () => validatePatch({...empty(), nodes: [makeNode('number', 1), makeNode('bang', 2)], edges: [{from: 1, outlet: 1, to: 2, inlet: 0}]}), false);
  return results;
}

function nativeInput(patch, operations) {
  const kinds = {bang: 0, message: 1, number: 2, toggle: 3, add: 4, multiply: 5, metro: 6, counter: 7, int: 15, float: 16, flonum: 17, slider: 18, pack: 19, unpack: 20, select: 21, route: 22, trigger: 23, line: 24};
  const rows = [`1 ${patch.nodes.length} ${patch.edges.length}`];
  for (const node of patch.nodes) {
    const p = node.params;
    assert.ok(Object.hasOwn(kinds, node.type), `No research descriptor mapping for ${node.type}`);
    const values = node.type === 'flonum' ? [p.value, p.minimum, p.maximum, p.numdecimalplaces] : node.type === 'slider' ? [p.value, p.size, p.min, p.mult, p.floatoutput] : node.type === 'line' ? [p.value, p.time, p.grain, p.floatoutput] : [p.value ?? p.rhs ?? p.interval ?? p.steps ?? 0];
    rows.push([node.id, kinds[node.type], ...Array.from({length: 5}, (_, index) => values[index] ?? 0), JSON.stringify(p.text ?? p.args ?? '')].join(' '));
  }
  rows.push(...patch.edges.map(edge => [edge.from, edge.outlet, edge.to, edge.inlet].join(' ')));
  rows.push(String(operations.length));
  for (const operation of operations) {
    if (operation.event) rows.push(`event ${operation.event.node} ${operation.event.inlet} ${JSON.stringify(operation.event.text)}`);
    else rows.push(`advance ${operation.advance_frames}`);
  }
  return `${rows.join('\n')}\n`;
}

async function runScenarios() {
  const manifest = JSON.parse(await readFile(path.join(HERE, 'fixtures/scenarios.json'), 'utf8'));
  assert.equal(manifest.source_help_graph_copied, false);
  const directory = await mkdtemp(path.join(tmpdir(), 'ultra-help-next-'));
  try {
    const binary = path.join(directory, 'native-scenario');
    const args = ['-std=c++17', '-O2', '-Wall', '-Wextra', '-Werror', '-I', REPO, path.join(HERE, 'native-scenario.cpp'), '-o', binary];
    const compiled = spawnSync('g++', args, {encoding: 'utf8'});
    if (compiled.error) throw compiled.error;
    assert.equal(compiled.status, 0, compiled.stderr);
    const cases = [];
    for (const fixture of manifest.cases) {
      const bytes = await readFile(path.join(HERE, fixture.patch_file));
      const patch = parsePatch(bytes.toString('utf8'));
      const result = spawnSync(binary, [], {input: nativeInput(patch, fixture.operations), encoding: 'utf8'});
      if (result.error) throw result.error;
      assert.equal(result.status, 0, `${fixture.name}: native runner exit ${result.status}: ${result.stderr}`);
      const actual = JSON.parse(result.stdout);
      assert.equal(actual.length, fixture.operations.length);
      let assertions = 0;
      for (const [step, operation] of fixture.operations.entries()) {
        for (const expected of operation.expected) {
          const observed = actual[step].nodes.find(node => node.id === expected.id);
          assert.ok(observed, `${fixture.name} step ${step} missing ${expected.id}`);
          for (const [key, value] of Object.entries(expected)) {
            if (key === 'id') continue;
            assert.deepEqual(observed[key], value, `${fixture.name} step ${step} node ${expected.id} ${key}`);
            assertions++;
          }
        }
      }
      cases.push({...fixture, patch_sha256: hash(bytes), nodes: patch.nodes.length, edges: patch.edges.length, production_parser_accepted: true, native_compiled_and_executed: true, assertion_count: assertions, assertions_pass: true, actual});
    }
    assert.ok(CURRENT.every(name => cases.some(fixture => fixture.objects.includes(name))), 'Every current batch kind must execute in an original scenario');
    return {provenance: manifest.provenance, scope: manifest.scope, compiler: spawnSync('g++', ['--version'], {encoding: 'utf8'}).stdout.split('\n')[0], compile_arguments: ['-std=c++17', '-O2', '-Wall', '-Wextra', '-Werror', '-I <repo>', 'native-scenario.cpp', '-o <temporary binary>'], sample_rate_hz: 48000, audio_device_opened: false, browser_executed: false, tauri_executed: false, rust_preparation_executed: false, installed_help_executed: false, max_executed: false, cases};
  } finally { await rm(directory, {recursive: true, force: true}); }
}

async function main() {
  const options = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    assert.ok(['--max-root', '--output'].includes(process.argv[index]) && process.argv[index + 1], 'Usage: node check-help.mjs --max-root /licensed/Max [--output report.json]');
    options[process.argv[index]] = process.argv[index + 1];
  }
  assert.ok(options['--max-root'], '--max-root is required');
  const files = [];
  for (const object of [...CURRENT, ...NEXT]) {
    const relative = `resources/help/max/${object}.maxhelp`;
    const bytes = await readFile(path.resolve(options['--max-root'], relative));
    const source = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    const direct = decision(() => parsePatch(bytes.toString('utf8')));
    assert.equal(direct.accepted, false, `${object} unexpectedly loads as a whole help file`);
    files.push({object, batch: CURRENT.includes(object) ? 'current-ten' : 'next-control-candidates', installed_relative_path: relative, source_sha256: hash(bytes), source_bytes: bytes.length, source_json_parses: true, direct_production_parser: direct, bare_authoring_probe: decision(() => parseObjectText(object)), ...inspectHelp(source.patcher, object), installed_help_executed: false, extracted_fragment_executed: false});
  }
  const boundaries = adapterBoundaryChecks();
  const native = await runScenarios();
  const tabs = files.flatMap(file => file.basic_tabs);
  const components = tabs.flatMap(tab => tab.target_components);
  const report = {
    schema_version: 1,
    scope: 'Read installed help JSON, create temporary partial structural graphs, validate them using the current production model, and execute separate original Ultra scenarios in the native core. No Max help importer or whole-help execution is claimed.',
    selected_objects: [...CURRENT, ...NEXT], node_version: process.version,
    production_registry_types: Object.keys(REGISTRY),
    extraction_policy: ['Only nested p basic tabs are considered for fragment validation.', 'Boxes without an explicit research adapter are omitted and every omission and crossing edge is reported.', 'Retained edges keep the saved port indices; invalid ports fail production validation.', 'Current same-name counter is refused because its contract differs from Max.', 'All converted layouts use neutral coordinates; UI initialization and unlisted attributes are not preserved.', 'Only target-containing connected components are counted; accepted fragments can be incomplete and are never compatibility passes.', 'No proprietary source graph, message text, object argument text or helper script is retained in this report.'],
    summary: {installed_help_files_read: files.length, direct_help_accepted: files.filter(file => file.direct_production_parser.accepted).length, basic_tabs_inspected: tabs.length, target_components_examined: components.length, target_components_graph_valid: components.filter(component => component.production_graph_validation.accepted).length, graph_valid_components_with_cables: components.filter(component => component.production_graph_validation.accepted && component.edges > 0).length, isolated_target_components: components.filter(component => component.edges === 0).length, objects_with_graph_valid_connected_target_fragment: files.filter(file => file.basic_tabs.some(tab => tab.target_components.some(component => component.production_graph_validation.accepted && component.edges > 0))).map(file => file.object), installed_help_executed: 0, extracted_help_fragments_executed: 0, browser_scenarios_executed: 0, original_native_scenarios_pass: native.cases.length, original_native_behavioral_assertions_pass: native.cases.reduce((sum, fixture) => sum + fixture.assertion_count, 0), adapter_boundary_assertions_pass: boundaries.length},
    files, adapter_boundary_checks: boundaries, original_native_scenarios: native,
    evidence_sources: await Promise.all(['apps/ultra/ui/canvas-model.mjs', 'apps/ultra/ui/canvas-catalog.mjs', 'apps/ultra/src-tauri/native/patch_graph.hpp', 'apps/ultra/src-tauri/native/canvas_message.hpp', 'experiments/max-reference/help-next-20261021/check-help.mjs', 'experiments/max-reference/help-next-20261021/native-scenario.cpp', 'experiments/max-reference/help-next-20261021/fixtures/scenarios.json'].map(async file => ({path: file, sha256: hash(await readFile(path.join(REPO, file)))}))),
    limitations: ['Structural fragment acceptance says nothing about complete Max runtime equivalence.', 'The whole corpus denominator remains 2103 installed help files; zero whole-help execution passes are added.', 'Only basic tabs are selected for graph conversion. Other tabs, dependency resolution, helper code, global send/receive and transport scheduling remain outside this adapter.', 'Native scenarios use a research descriptor transport and call production C++ compile_canvas/CanvasRuntime; they do not run Rust preparation, the browser, Tauri IPC, the audio device, or Max.', 'No new Max runtime reference or timing oracle is captured by this experiment.'],
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (options['--output']) await writeFile(path.resolve(options['--output']), serialized);
  else process.stdout.write(serialized);
  process.stderr.write(`${JSON.stringify(report.summary)}\n`);
}

await main();
