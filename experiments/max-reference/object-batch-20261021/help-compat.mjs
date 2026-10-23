#!/usr/bin/env node
// Read licensed local help files; publish metadata and diagnostics, never their contents.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {REGISTRY, createCanvasController, makeNode, parseMessage, parsePatch, validatePatch} from '../../../apps/ultra/ui/canvas-model.mjs';
import {parseObjectText} from '../../../apps/ultra/ui/canvas-catalog.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const SELECTED = ['int', 'float', 'flonum', 'slider', 'pack', 'unpack', 'select', 'route', 'trigger', 'line'];
const ALIASES = {int: ['i'], float: ['f'], select: ['sel'], trigger: ['t']};
const CANONICAL = Object.fromEntries(Object.entries(ALIASES).flatMap(([name, aliases]) => aliases.map(alias => [alias, name])));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const empty = () => ({version: 1, profile: 'ultra-canvas-v1', nodes: [], edges: []});
function attempt(fn) {
  try { fn(); return {accepted: true, error: null}; }
  catch (error) { return {accepted: false, error: error.message}; }
}
function token(box) {
  if (box.maxclass !== 'newobj') return box.maxclass ?? '<missing-maxclass>';
  return box.text?.trim().split(/\s+/)[0] || '<empty-newobj>';
}
function inventory(patcher, selected) {
  const tokens = new Map(), basic = [], targets = [], targetShapes = new Map();
  let patchers = 0, boxes = 0, edges = 0;
  function walk(current, ancestry) {
    patchers++;
    edges += (current.lines ?? []).length;
    for (const {box} of current.boxes ?? []) {
      boxes++;
      const name = token(box);
      tokens.set(name, (tokens.get(name) ?? 0) + 1);
      if ((CANONICAL[name] ?? name) === selected) {
        const shape = {token: name, maxclass: box.maxclass, inlets: box.numinlets ?? null, outlets: box.numoutlets ?? null};
        const key = JSON.stringify(shape);
        targetShapes.set(key, {...shape, count: (targetShapes.get(key)?.count ?? 0) + 1});
        targets.push({box_id: box.id, patcher_box_path: ancestry});
      }
      if (box.patcher) {
        const childPath = [...ancestry, box.id];
        if (box.text?.trim() === 'p basic') {
          const child = box.patcher;
          basic.push({
            box_path: childPath,
            boxes: (child.boxes ?? []).length,
            edges: (child.lines ?? []).length,
            compact_max_wrapper_bytes: Buffer.byteLength(JSON.stringify({patcher: child})),
            production_parser: attempt(() => parsePatch(JSON.stringify({patcher: child}))),
            direct_tokens: [...new Set((child.boxes ?? []).map(({box: b}) => token(b)))].sort(),
          });
        }
        walk(box.patcher, childPath);
      }
    }
  }
  walk(patcher, []);
  return {
    patchers, boxes, edges,
    root_boxes: (patcher.boxes ?? []).length,
    root_edges: (patcher.lines ?? []).length,
    recursive_capacity_excess: {nodes_over_32: Math.max(0, boxes - 32), edges_over_64: Math.max(0, edges - 64)},
    capacity_note: 'Recursive counts are an inventory, not a flattening algorithm; hierarchy and helper patchers remain unsupported.',
    token_counts: [...tokens].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({token: name, count, exact_registry_key_exists: Object.hasOwn(REGISTRY, name)})),
    target_occurrences: targets,
    target_saved_port_shapes: [...targetShapes.values()],
    basic_tabs: basic,
  };
}

function boundaryChecks() {
  const results = [];
  const check = (name, fn, expectedAccepted, expectedError = null) => {
    const result = attempt(fn);
    assert.equal(result.accepted, expectedAccepted, name);
    if (expectedError) assert.equal(result.error, expectedError, name);
    results.push({name, ...result, expected: expectedAccepted ? 'accept' : 'reject', assertion_pass: true});
  };
  check('32 nodes accepted', () => validatePatch({...empty(), nodes: Array.from({length: 32}, (_, i) => makeNode('bang', i + 1))}), true);
  check('33 nodes rejected', () => validatePatch({...empty(), nodes: Array.from({length: 33}, (_, i) => makeNode('bang', i + 1))}), false, 'A patch supports at most 32 objects.');
  const nodes = Array.from({length: 17}, (_, i) => makeNode('bang', i + 1));
  const cables = [];
  for (let from = 1; from <= 17; from++) for (let to = from + 1; to <= 17; to++) cables.push({from, outlet: 0, to, inlet: 0});
  check('64 edges accepted', () => validatePatch({...empty(), nodes, edges: cables.slice(0, 64)}), true);
  check('65 edges rejected', () => validatePatch({...empty(), nodes, edges: cables.slice(0, 65)}), false, 'A patch supports at most 64 cables.');
  const minimal = JSON.stringify(empty());
  check('65536-byte input accepted', () => parsePatch(minimal.padEnd(65536, ' ')), true);
  check('65537-byte input rejected', () => parsePatch(minimal.padEnd(65537, ' ')), false, 'Patch exceeds 64 KiB.');
  check('unknown node parameter rejected', () => validatePatch({...empty(), nodes: [{...makeNode('number', 1), params: {unknown: 1}}]}), false, 'Unknown number parameters field: unknown.');
  check('nonexistent outlet rejected', () => validatePatch({...empty(), nodes: nodes.slice(0, 2), edges: [{from: 1, outlet: 1, to: 2, inlet: 0}]}), false);
  check('control cycle rejected', () => validatePatch({...empty(), nodes: nodes.slice(0, 2), edges: [{from: 1, outlet: 0, to: 2, inlet: 0}, {from: 2, outlet: 0, to: 1, inlet: 0}]}), false, 'Control cycles are unsupported.');
  check('selector message accepted', () => validatePatch({...empty(), nodes: [makeNode('message', 1, 0, 0, {text: 'set 5'})]}), true);
  check('unsupported message substitution rejected', () => validatePatch({...empty(), nodes: [makeNode('message', 1, 0, 0, {text: '$1 5'})]}), false);
  return results;
}

const NATIVE_SOURCE = String.raw`
#include "apps/ultra/src-tauri/native/patch_graph.hpp"
#include <iomanip>
#include <iostream>
using namespace ultra;
int main() {
  UltraCanvasGraph g{};
  if (!(std::cin >> g.revision >> g.node_count >> g.edge_count) || g.node_count > 32 || g.edge_count > 64) return 2;
  for (unsigned i=0; i<g.node_count; ++i) {
    auto& n=g.nodes[i];
    if (!(std::cin >> n.id >> n.kind >> n.device >> n.count >> n.p0 >> n.p1 >> n.p2)) return 3;
  }
  for (unsigned i=0; i<g.edge_count; ++i) {
    auto& e=g.edges[i];
    if (!(std::cin >> e.from >> e.outlet >> e.to >> e.inlet)) return 4;
  }
  CanvasPlan plan{};
  if (!compile_canvas(g,plan)) return 5;
  CanvasRuntime runtime;
  runtime.reset(plan);
  auto emit=[](alive::Event) { return true; };
  unsigned operations=0;
  if (!(std::cin >> operations) || operations > 64) return 6;
  std::cout << std::setprecision(17) << "[";
  for (unsigned step=0; step<operations; ++step) {
    unsigned node=0,inlet=0; CanvasMessage message{};
    if (!(std::cin >> node >> inlet >> message.count) || message.count > 3) return 7;
    for (unsigned i=0; i<message.count; ++i) if (!(std::cin >> message.values[i])) return 8;
    runtime.begin_callback();
    if (!runtime.event(g.revision,node,inlet,message,0,emit)) return 9;
    if (step) std::cout << ",";
    std::cout << "{\"step\":" << step << ",\"observations\":[";
    for (unsigned i=0; i<g.node_count; ++i) {
      if (i) std::cout << ",";
      std::cout << "{\"id\":" << g.nodes[i].id << ",\"value\":" << runtime.value(i) << ",\"pulses\":" << runtime.pulses(i) << "}";
    }
    std::cout << "]}";
  }
  std::cout << "]\n";
}
`;

function nativeInput(patch, operations) {
  // This experimental transport covers only our independently authored smoke fixtures.
  const kinds = {bang: 0, message: 1, number: 2, add: 4};
  const rows = [`1 ${patch.nodes.length} ${patch.edges.length}`];
  for (const node of patch.nodes) {
    assert.ok(Object.hasOwn(kinds, node.type), `No smoke transport for ${node.type}`);
    const message = node.type === 'message' ? parseMessage(node.params.text) ?? [] : [];
    const values = node.type === 'message' ? message : [node.params.value ?? node.params.rhs ?? 0];
    rows.push([node.id, kinds[node.type], 0, message.length, ...Array.from({length: 3}, (_, i) => values[i] ?? 0)].join(' '));
  }
  rows.push(...patch.edges.map(edge => [edge.from, edge.outlet, edge.to, edge.inlet].join(' ')));
  rows.push(String(operations.length));
  rows.push(...operations.map(op => [op.node, op.inlet, op.value?.length ?? 0, ...(op.value ?? [])].join(' ')));
  return `${rows.join('\n')}\n`;
}

async function nativeFixtures() {
  const fixtures = JSON.parse(await readFile(path.join(HERE, 'help-compat-fixtures.json'), 'utf8'));
  const directory = await mkdtemp(path.join(tmpdir(), 'ultra-help-compat-'));
  try {
    const source = path.join(directory, 'smoke.cpp'), binary = path.join(directory, 'smoke');
    await writeFile(source, NATIVE_SOURCE);
    const args = ['-std=c++20', '-O2', '-Wall', '-Wextra', '-Werror', '-I', REPO, source, '-o', binary];
    const compiled = spawnSync('g++', args, {encoding: 'utf8'});
    if (compiled.error) throw compiled.error;
    assert.equal(compiled.status, 0, `Native smoke compilation failed:\n${compiled.stderr}`);
    const cases = fixtures.cases.map(fixture => {
      const patch = parsePatch(JSON.stringify(fixture.patch));
      const result = spawnSync(binary, [], {input: nativeInput(patch, fixture.operations), encoding: 'utf8'});
      if (result.error) throw result.error;
      assert.equal(result.status, 0, `${fixture.name}: native runtime exited ${result.status}: ${result.stderr}`);
      const actual = JSON.parse(result.stdout);
      assert.equal(actual.length, fixture.operations.length);
      let assertions = 0;
      for (const [step, operation] of fixture.operations.entries()) {
        for (const expected of operation.expected) {
          const observed = actual[step].observations.find(node => node.id === expected.id);
          assert.ok(observed, `${fixture.name} step ${step} missing node ${expected.id}`);
          for (const [key, value] of Object.entries(expected)) {
            assert.equal(observed[key], value, `${fixture.name} step ${step} node ${expected.id} ${key}`);
            assertions++;
          }
        }
      }
      return {name: fixture.name, parser_accepted: true, native_compiled_and_executed: true, assertion_count: assertions, assertions_pass: true, operations: fixture.operations.length, actual};
    });
    const compiler = spawnSync('g++', ['--version'], {encoding: 'utf8'});
    return {
      provenance: fixtures.provenance,
      scope: fixtures.scope,
      layer: 'Production parsePatch + production native compile_canvas/CanvasRuntime, called by an experimental fixture transport.',
      native_header_sha256: digest(await readFile(path.join(REPO, 'apps/ultra/src-tauri/native/patch_graph.hpp'))),
      compiler: compiler.stdout.split('\n')[0],
      compile_arguments: ['-std=c++20', '-O2', '-Wall', '-Wextra', '-Werror', '-I <repo>', '<temporary original smoke.cpp>', '-o <temporary binary>'],
      rust_preparation_or_ipc_executed: false,
      browser_or_tauri_executed: false,
      audio_device_opened: false,
      max_executed: false,
      selected_object_compatibility_passes: 0,
      cases,
    };
  } finally { await rm(directory, {recursive: true, force: true}); }
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    assert.ok(['--max-root', '--output'].includes(args[i]) && args[i + 1], 'Usage: node help-compat.mjs --max-root /licensed/Max [--output report.json]');
    options[args[i]] = args[i + 1];
  }
  assert.ok(options['--max-root'], '--max-root is required');
  const maxRoot = path.resolve(options['--max-root']);
  const html = await readFile(path.join(REPO, 'apps/ultra/ui/canvas.html'), 'utf8');
  const pickerAccept = html.match(/<input\b[^>]*id="patch-file"[^>]*accept="([^"]*)"/)?.[1];
  assert.ok(pickerAccept, 'Unable to read the production patch-file accept declaration');
  const controller = createCanvasController({patch: {...empty(), nodes: [makeNode('number', 1)]}});
  const before = controller.export();
  const reports = [];
  for (const name of SELECTED) {
    const relative = `resources/help/max/${name}.maxhelp`;
    const bytes = await readFile(path.join(maxRoot, relative));
    const text = bytes.toString('utf8');
    const source = JSON.parse(text.replace(/^\uFEFF/, ''));
    const sourceFacts = inventory(source.patcher, name);
    const direct = attempt(() => parsePatch(text));
    const controllerLoad = attempt(() => controller.load(text));
    const retained = before === controller.export();
    assert.ok(retained, `Rejected help replaced the working graph: ${name}`);
    const compact = attempt(() => parsePatch(JSON.stringify(source)));
    const canonical = attempt(() => validatePatch({...empty(), nodes: [{id: 1, type: name, x: 0, y: 0, params: {}}]}));
    const authoring = [name, ...(ALIASES[name] ?? [])].map(spelling => ({spelling, ...attempt(() => parseObjectText(spelling))}));
    assert.equal(direct.accepted, false, `${name} unexpectedly accepted; reassess the compatibility status`);
    assert.equal(canonical.accepted, true, `${name} must remain available as a native canvas type`);
    assert.ok(authoring.every(result => result.accepted), `${name} canonical name or alias was rejected`);
    assert.equal(compact.error, 'Unknown patch field: patcher.');
    reports.push({
      object: name,
      installed_relative_path: relative,
      sha256: digest(bytes), bytes: bytes.length,
      source_json_parses: true,
      file_picker_extension_advertised: pickerAccept.split(',').includes('.maxhelp'),
      direct_production_parser: direct,
      production_controller_load: {...controllerLoad, previous_document_retained: retained},
      compacting_source_does_not_convert_schema: compact,
      isolated_canonical_node_schema_probe: canonical,
      authoring_object_entry_probes: authoring,
      source: sourceFacts,
      conversion: {
        production_max_importer_exists: false,
        all_source_nodes_and_ports_converted: false,
        adapted_selected_object_fixture_available: false,
        selected_object_executed_in_ultra: false,
        installed_help_executed_in_ultra: false,
        max_reference_compared: false,
        blockers: [
          ...(bytes.length > 65536 ? ['original-source-exceeds-64KiB-intake'] : []),
          'max-patcher-schema-has-no-production-importer',
          'max-node-arguments-ports-state-and-attributes-have-no-runtime-converter',
          'nested-help-tabs-helper-scripts-and-dependencies-have-no-execution-adapter',
        ],
      },
    });
  }
  const boundary = boundaryChecks();
  const native = await nativeFixtures();
  const evidenceFiles = ['apps/ultra/ui/canvas-model.mjs', 'apps/ultra/ui/canvas-catalog.mjs', 'apps/ultra/ui/canvas.mjs', 'apps/ultra/ui/canvas.html', 'apps/ultra/src-tauri/src/canvas.rs', 'apps/ultra/src-tauri/native/patch_graph.hpp', 'experiments/max-reference/object-batch-20261021/help-compat.mjs', 'experiments/max-reference/object-batch-20261021/help-compat-fixtures.json'];
  const report = {
    schema_version: 1,
    scope: 'Installed Max help intake and feasibility measured against the real current Ultra canvas parser/registry. Rejections are expected results, not compatibility passes.',
    selected_objects: SELECTED,
    node_version: process.version,
    production_file_picker_accept: pickerAccept,
    runtime_profile: {name: 'ultra-canvas-v1', registry_types: Object.keys(REGISTRY), registry_count: Object.keys(REGISTRY).length, max_nodes: 32, max_edges: 64, max_source_json_bytes: 65536},
    evidence_sources: await Promise.all(evidenceFiles.map(async file => ({path: file, sha256: digest(await readFile(path.join(REPO, file)))}))),
    summary: {
      installed_files_checked: reports.length,
      source_json_valid: reports.filter(r => r.source_json_parses).length,
      direct_help_accepted: reports.filter(r => r.direct_production_parser.accepted).length,
      direct_help_rejected_for_size_first: reports.filter(r => r.direct_production_parser.error === 'Patch exceeds 64 KiB.').length,
      direct_help_rejected_for_schema_first: reports.filter(r => r.direct_production_parser.error === 'Unknown patch field: patcher.').length,
      canonical_types_accepted: reports.filter(r => r.isolated_canonical_node_schema_probe.accepted).length,
      isolated_basic_tabs_parser_checked: reports.reduce((sum, r) => sum + r.source.basic_tabs.length, 0),
      isolated_basic_tabs_parser_accepted: reports.reduce((sum, r) => sum + r.source.basic_tabs.filter(tab => tab.production_parser.accepted).length, 0),
      adapted_selected_object_fixtures_executed: 0,
      installed_help_executed_or_compared: 0,
      boundary_assertions_pass: boundary.length,
      independent_existing_ultra_native_smoke_cases_pass: native.cases.length,
    },
    files: reports,
    intake_boundary_checks: boundary,
    existing_ultra_native_smoke: native,
    limitations: [
      'No proprietary source text is retained in this report; hashes, object tokens, saved port counts, IDs and counts are derived metadata.',
      'No Max help is opened in Max, no helper script is executed, and no external dependency is loaded.',
      'This runner does not implement a production importer. Selected runtime objects are checked in the separate native, Rust and editor tests.',
      'Exact registry key overlap is an identity candidate only, not Max semantics or schema compatibility.',
      'Native smoke fixtures are independently authored Ultra patches; they are neither adapted installed help nor a Max reference comparison.',
      'This runner calls the native core directly and does not certify the Rust preparation layer, full desktop application, audio timeline host, visuals or audio behavior.',
    ],
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (options['--output']) await writeFile(path.resolve(options['--output']), serialized);
  else process.stdout.write(serialized);
  process.stderr.write(`${JSON.stringify(report.summary)}\n`);
}

await main();
