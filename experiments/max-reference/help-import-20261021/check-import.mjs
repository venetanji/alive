import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {analyzeMaxPatch, importMaxPatcher} from '../../../apps/ultra/ui/canvas-max-import.mjs';
import {validatePatch} from '../../../apps/ultra/ui/canvas-model.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const NAMES = ['toggle', 'button', 'number', 'flonum', 'slider', 'int', 'float', 'pack', 'unpack', 'select', 'route', 'trigger', 'line'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const options = {};
for (let i = 2; i < process.argv.length; i += 2) {
  assert.ok(['--max-root', '--output', '--export-slider'].includes(process.argv[i]) && process.argv[i + 1], 'Usage: node check-import.mjs --max-root /licensed/Max [--output results.json] [--export-slider /tmp/slider.ultra.json]');
  options[process.argv[i]] = process.argv[i + 1];
}
assert.ok(options['--max-root'], '--max-root is required');

function nativeInput(patch, operations) {
  const kinds = {bang: 0, message: 1, number: 2, toggle: 3, add: 4, multiply: 5, metro: 6, int: 15, float: 16, flonum: 17, slider: 18, pack: 19, unpack: 20, select: 21, route: 22, trigger: 23, line: 24};
  const rows = [`1 ${patch.nodes.length} ${patch.edges.length}`];
  for (const node of patch.nodes) {
    assert.ok(Object.hasOwn(kinds, node.type));
    const p = node.params;
    const values = node.type === 'flonum' ? [p.value, p.minimum, p.maximum, p.numdecimalplaces] : node.type === 'slider' ? [p.value, p.size, p.min, p.mult, p.floatoutput] : node.type === 'line' ? [p.value, p.time, p.grain, p.floatoutput] : [p.value ?? p.rhs ?? p.interval ?? 0];
    rows.push([node.id, kinds[node.type], ...Array.from({length: 5}, (_, i) => values[i] ?? 0), JSON.stringify(p.text ?? p.args ?? '')].join(' '));
  }
  rows.push(...patch.edges.map(e => [e.from, e.outlet, e.to, e.inlet].join(' ')), String(operations.length));
  for (const operation of operations) rows.push(`event ${operation.node} ${operation.inlet} ${JSON.stringify(operation.text)}`);
  return `${rows.join('\n')}\n`;
}

const files = [];
let slider;
for (const name of NAMES) {
  const relative = `resources/help/max/${name}.maxhelp`;
  const bytes = await readFile(path.resolve(options['--max-root'], relative));
  const text = bytes.toString('utf8');
  const analysis = analyzeMaxPatch(text, {sourceName: `${name}.maxhelp`});
  const basic = analysis.patchers.find(p => p.name === 'basic');
  assert.ok(basic, `${name}: named basic tab is absent`);
  assert.equal(importMaxPatcher(text, {patcherId: basic.id}).patch, null, `${name}: strict import must surface the partial boundary`);
  const imported = importMaxPatcher(text, {patcherId: basic.id, allowPartial: true});
  assert.ok(imported.patch, `${name}: explicitly partial import failed`);
  assert.deepEqual(validatePatch(imported.patch), imported.patch);
  assert.equal(imported.complete, false);
  assert.equal(imported.partial, true);
  const selected = {
    selection: imported.selection, stats: imported.stats, diagnostics: imported.diagnostics,
    source_box_to_native_node: imported.nodeMap,
    supported_native_types: [...new Set(imported.patch.nodes.map(n => n.type))],
    graph_sha256: hash(JSON.stringify(imported.patch)), strict_import_accepted: false,
    explicit_partial_import_accepted: true, complete_selected_graph: false,
    extracted_graph_executed: false, source_help_executed_as_a_whole: false, max_executed: false,
  };
  files.push({object: name, installed_relative_path: relative, source_bytes: bytes.length, source_sha256: hash(bytes), recursive_inventory: analysis.totals, selected});
  if (name === 'slider') slider = {imported, selected};
}

const directory = await mkdtemp(path.join(tmpdir(), 'ultra-max-import-'));
let native;
try {
  const binary = path.join(directory, 'native-scenario');
  const runner = path.resolve(HERE, '../help-next-20261021/native-scenario.cpp');
  const compiled = spawnSync('g++', ['-std=c++17', '-O2', '-Wall', '-Wextra', '-Werror', '-I', REPO, runner, '-o', binary], {encoding: 'utf8'});
  if (compiled.error) throw compiled.error;
  assert.equal(compiled.status, 0, compiled.stderr);
  const {patch} = slider.imported;
  // Source IDs identify a real retained slider -> number/button branch in the
  // installed basic tab. No substitute author-authored graph is built here.
  const sliderId = slider.imported.nodeMap['obj-17'];
  const numberId = slider.imported.nodeMap['obj-22'];
  const buttonId = slider.imported.nodeMap['obj-23'];
  assert.ok(patch.edges.some(e => e.from === sliderId && e.to === numberId && e.inlet === 0));
  assert.ok(patch.edges.some(e => e.from === sliderId && e.to === buttonId && e.inlet === 0));
  const operations = [{node: sliderId, inlet: 0, text: '73'}, {node: sliderId, inlet: 0, text: '21'}];
  const result = spawnSync(binary, [], {input: nativeInput(patch, operations), encoding: 'utf8'});
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  const observations = JSON.parse(result.stdout);
  for (const [i, expected] of [73, 21].entries()) {
    for (const id of [sliderId, numberId]) assert.equal(observations[i].nodes.find(n => n.id === id).value, expected);
    assert.equal(observations[i].nodes.find(n => n.id === numberId).pulses, i + 1);
    assert.equal(observations[i].nodes.find(n => n.id === buttonId).pulses, i + 1);
  }
  slider.selected.extracted_graph_executed = true;
  native = {
    source_file: 'resources/help/max/slider.maxhelp', selection: slider.imported.selection,
    exact_imported_graph_sha256: slider.selected.graph_sha256,
    graph_modified_after_import: false, production_compile_canvas: true, production_canvas_runtime: true,
    operations, observed_nodes: observations.map(step => ({step: step.step, nodes: step.nodes.filter(n => [sliderId, numberId, buttonId].includes(n.id))})),
    behavioral_assertions_passed: 8,
    transport: 'Research descriptor transport from the existing help-next native-scenario.cpp driver; UI appearance metadata is not part of native execution descriptors.',
    rust_preparation_executed: false, browser_executed: false, tauri_executed: false, audio_device_opened: false, max_executed: false,
  };
  if (options['--export-slider']) await writeFile(path.resolve(options['--export-slider']), `${JSON.stringify(patch, null, 2)}\n`);
} finally { await rm(directory, {recursive: true, force: true}); }

const evidencePaths = ['apps/ultra/ui/canvas-max-import.mjs', 'apps/ultra/ui/canvas-max-import.test.mjs', 'apps/ultra/ui/canvas-model.mjs', 'apps/ultra/ui/canvas-catalog.mjs', 'apps/ultra/ui/canvas-appearance.mjs', 'apps/ultra/src-tauri/native/patch_graph.hpp', 'apps/ultra/src-tauri/native/canvas_message.hpp', 'experiments/max-reference/help-next-20261021/native-scenario.cpp', 'experiments/max-reference/help-import-20261021/check-import.mjs'];
const report = {
  schema_version: 1,
  scope: 'Use the production Max importer on installed named basic tabs; execute the exact explicitly partial imported slider graph in the production native control runtime. No whole-help or Max-runtime execution is claimed.',
  summary: {installed_sources_analyzed: files.length, named_basic_tabs_imported_with_explicit_partial: files.length, strict_imports_accepted: 0, complete_selected_graphs: 0, exact_imported_graphs_native_executed: 1, native_behavioral_assertions_passed: 8, whole_help_execution_passes_added: 0, whole_installed_help_corpus: 2103, max_runtime_executed: false},
  files, native,
  evidence_sources: await Promise.all(evidencePaths.map(async file => ({path: file, sha256: hash(await readFile(path.resolve(REPO, file)))}))),
  limitations: [
    'All 13 basic tabs are partial and require explicit acknowledgement; helper scripts, print/receive objects, unsupported displays, message syntax and unavailable ports remain omissions.',
    'Diagnostics distinguish retained native behavior gaps from unsupported nodes and cables. Native execution proves only the retained branch behavior under the tested numeric inputs.',
    'The research transport bypasses Rust preparation and desktop IPC. Appearance metadata is accepted by the JS document but not evaluated by this native runner.',
    'No proprietary help source or extracted graph is retained in this report. The optional exported graph remains in the caller-selected local path.',
    'This experiment supplies no Max runtime reference, timing oracle, whole-file execution, dependency emulation or audio-device evidence.',
  ],
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (options['--output']) await writeFile(path.resolve(options['--output']), serialized);
else process.stdout.write(serialized);
process.stderr.write(`${JSON.stringify(report.summary)}\n`);
