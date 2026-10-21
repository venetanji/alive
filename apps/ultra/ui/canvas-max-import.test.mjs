import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analyzeMaxPatch, importMaxPatcher} from './canvas-max-import.mjs';
import {validatePatch} from './canvas-model.mjs';

const box = (id, maxclass, text, extra = {}) => ({box: {id, maxclass, ...(text === undefined ? {} : {text}), patching_rect: [40, 60, 70, 22], ...extra}});
const wire = (from, outlet, to, inlet, extra = {}) => ({patchline: {source: [from, outlet], destination: [to, inlet], ...extra}});
const source = (boxes, lines = []) => ({patcher: {boxes, lines}});

test('selects actual named nested patchers without flattening their boundaries', () => {
  const input = source([box('tab/one', 'newobj', 'p basic', {patcher: source([box('a', 'button')]).patcher})]);
  const analysis = analyzeMaxPatch(input, {sourceName: 'example.maxhelp'});
  assert.deepEqual(analysis.patchers.map(p => [p.id, p.name, p.path]), [['root', 'Root', []], ['root/tab%2Fone', 'basic', ['tab/one']]]);
  assert.equal(importMaxPatcher(input).patch, null);
  const imported = importMaxPatcher(input, {patcherId: 'root/tab%2Fone'});
  assert.equal(imported.patch.nodes[0].type, 'bang');
  assert.equal(imported.complete, true);
  assert.equal(imported.selection.id, 'root/tab%2Fone');
});

test('preserves coordinates, inlet/outlet indices and explicit Max fanout order', () => {
  const input = source([box('a', 'newobj', 'trigger b i'), box('b', 'newobj', 'int 7', {patching_rect: [130.5, 180, 80, 22]}), box('c', 'button')], [wire('a', 1, 'b', 1, {order: 1}), wire('a', 1, 'c', 0, {order: 0})]);
  const result = importMaxPatcher(input);
  assert.equal(result.complete, true);
  assert.deepEqual(result.patch.edges, [{from: 1, outlet: 1, to: 3, inlet: 0}, {from: 1, outlet: 1, to: 2, inlet: 1}]);
  assert.equal(result.patch.nodes[1].x, 130.5);
  assert.equal(result.patch.nodes[1].y, 180);
  assert.deepEqual(validatePatch(result.patch), result.patch);
});

test('requires explicit partial import and diagnoses every unknown box and boundary cable', () => {
  const input = source([box('a', 'button'), box('b', 'newobj', 'mystery~')], [wire('a', 0, 'b', 0)]);
  const strict = importMaxPatcher(input);
  assert.equal(strict.patch, null);
  assert.equal(strict.complete, false);
  const partial = importMaxPatcher(input, {allowPartial: true});
  assert.equal(partial.partial, true);
  assert.equal(partial.patch.nodes.length, 1);
  assert.equal(partial.patch.edges.length, 0);
  assert.ok(partial.diagnostics.some(d => d.code === 'unsupported-box' && d.boxId === 'b'));
  assert.ok(partial.diagnostics.some(d => d.code === 'unsupported-edge' && d.edgeIndex === 0));
  assert.equal(partial.stats.omittedBoxes, 1);
  assert.equal(partial.stats.omittedEdges, 1);
});

test('does not reinterpret Max counter arguments or Max-only classes as native namesakes', () => {
  for (const name of ['counter 8', 'makenote 100 150', 'voice~', 'midiin', 'dac~']) {
    const result = importMaxPatcher(source([box('a', 'newobj', name)]), {allowPartial: true});
    assert.equal(result.patch, null, name);
    assert.ok(result.diagnostics.some(d => d.code === 'unsupported-box'), name);
  }
});

test('surfaces number, metro and message semantic gaps and refuses nonexistent ports', () => {
  const input = source([box('n', 'number', undefined, {numinlets: 1, numoutlets: 2}), box('b', 'button'), box('m', 'message', '42', {numinlets: 2, numoutlets: 1}), box('clock', 'newobj', 'metro 500')], [wire('n', 1, 'b', 0), wire('b', 0, 'm', 1)]);
  assert.equal(importMaxPatcher(input).patch, null);
  const result = importMaxPatcher(input, {allowPartial: true});
  assert.equal(result.patch.edges.length, 0);
  assert.equal(result.stats.omittedEdges, 2);
  for (const id of ['n', 'm', 'clock']) assert.ok(result.diagnostics.some(d => d.code === 'semantic-gap' && d.boxId === id));
});

test('preserves the lexical output mode of Max line creation arguments', () => {
  const result = importMaxPatcher(source([box('a', 'newobj', 'line 0.'), box('b', 'newobj', 'line 1 20')]));
  assert.equal(result.patch.nodes[0].params.floatoutput, 1);
  assert.equal(result.patch.nodes[1].params.floatoutput, 0);
});

test('surfaces toggle value coercion and unsupported saved behavioral attributes', () => {
  const input = source([box('a', 'toggle'), box('b', 'slider', undefined, {relative: 1}), box('c', 'flonum', undefined, {cantchange: 1})]);
  assert.equal(importMaxPatcher(input).patch, null);
  const result = importMaxPatcher(input, {allowPartial: true});
  for (const id of ['a', 'b', 'c']) assert.ok(result.diagnostics.some(d => d.code === 'semantic-gap' && d.boxId === id));
  assert.equal(result.nodeMap.a, 1);
  assert.equal(result.nodeMap.b, 2);
  assert.equal(result.nodeMap.c, 3);
});

test('refuses argument placeholders that Max pack treats as literal symbols', () => {
  const result = importMaxPatcher(source([box('a', 'newobj', 'pack i f'), box('b', 'newobj', 'unpack f i'), box('c', 'button')]), {allowPartial: true});
  assert.equal(result.stats.omittedBoxes, 2);
  assert.equal(result.patch.nodes.length, 1);
});

test('surfaces ambiguous cable order instead of certifying fanout parity', () => {
  const input = source([box('a', 'button'), box('b', 'button'), box('c', 'button')], [wire('a', 0, 'b', 0), wire('a', 0, 'c', 0)]);
  assert.equal(importMaxPatcher(input).patch, null);
  const result = importMaxPatcher(input, {allowPartial: true});
  assert.ok(result.diagnostics.some(d => d.code === 'semantic-gap' && d.edgeIndex === 0));
  assert.equal(result.patch.edges.length, 2);
});

test('preserves approved native Max appearance attributes and saved dimensions', () => {
  const input = source([box('a', 'slider', undefined, {patching_rect: [10, 20, 140, 22], bgcolor: [0.1, 0.2, 0.3, 1], knobcolor: [1, 0.5, 0, 1], orientation: 1}), box('b', 'button', undefined, {patching_rect: [30, 40, 20, 20], blinkcolor: [1, 0, 0, 1]})]);
  const result = importMaxPatcher(input);
  assert.deepEqual(result.patch.nodes[0].style, {width: 140, height: 22, bgcolor: [0.1, 0.2, 0.3, 1], knobcolor: [1, 0.5, 0, 1], orientation: 1});
  assert.deepEqual(result.patch.nodes[1].style, {width: 20, height: 20, blinkcolor: [1, 0, 0, 1]});
  assert.equal(result.complete, true);
});

test('reports invalid or unmapped appearance without clamping or hiding executable objects', () => {
  const input = source([box('a', 'button', undefined, {patching_rect: [10, 20, 5, 22], bgcolor: [2, 0, 0, 1], fontname: 'Example Font', mysterybehavior: 99})]);
  const result = importMaxPatcher(input, {allowPartial: true});
  assert.equal(result.patch.nodes.length, 1);
  assert.equal(result.patch.nodes[0].style.width, undefined);
  assert.equal(result.patch.nodes[0].style.bgcolor, undefined);
  for (const attr of ['width', 'bgcolor', 'fontname', 'mysterybehavior']) assert.ok(result.diagnostics.some(d => d.attribute === attr));
  assert.equal(result.complete, false);
});

test('rejects unsupported message syntax and unsupported receiving selectors explicitly', () => {
  const input = source([box('a', 'message', 'size $1'), box('b', 'message', 'send nowhere'), box('c', 'newobj', 'int'), box('d', 'button')], [wire('b', 0, 'c', 0)]);
  const result = importMaxPatcher(input, {allowPartial: true});
  assert.ok(result.diagnostics.some(d => d.code === 'unsupported-box' && d.boxId === 'a'));
  assert.ok(result.diagnostics.some(d => d.code === 'unsupported-edge' && d.edgeIndex === 0));
  assert.equal(result.patch.edges.length, 0);
});

test('does not repair cycles or truncate graphs to the native limits', () => {
  const cycle = importMaxPatcher(source([box('a', 'button'), box('b', 'button')], [wire('a', 0, 'b', 0), wire('b', 0, 'a', 0)]), {allowPartial: true});
  assert.equal(cycle.patch, null);
  assert.ok(cycle.diagnostics.some(d => d.code === 'invalid-graph'));
  const large = importMaxPatcher(source(Array.from({length: 33}, (_, i) => box(String(i), 'button'))), {allowPartial: true});
  assert.equal(large.patch, null);
  assert.ok(large.diagnostics.some(d => d.code === 'native-limit'));
});

test('rejects malformed, duplicate, oversized and recursive inputs within analysis bounds', () => {
  assert.throws(() => analyzeMaxPatch('{broken'), /JSON/);
  assert.throws(() => analyzeMaxPatch(' '.repeat(8 * 1024 * 1024 + 1)), /limit|MiB/);
  const recursive = source([]); recursive.patcher.boxes.push(box('p', 'newobj', 'p recurse', {patcher: recursive.patcher}));
  assert.throws(() => analyzeMaxPatch(recursive), /recursive|cyclic|shared/);
  assert.throws(() => analyzeMaxPatch(source([box('a', 'button'), box('a', 'button')])), /Duplicate/);
  assert.throws(() => importMaxPatcher(source([box('a', 'button')]), {patcherId: 'missing'}), /patcher/);
  assert.throws(() => analyzeMaxPatch(source([box('a', 'button', undefined, {bogus: NaN})])), /finite|JSON/);
  let deep = source([]);
  for (let i = 0; i < 40; i++) deep = source([box(`p${i}`, 'newobj', 'p child', {patcher: deep.patcher})]);
  assert.throws(() => analyzeMaxPatch(deep), /depth/);
});

test('does not certify mismatched saved port shapes even when the absent port is unused', () => {
  const input = source([box('a', 'button', undefined, {numinlets: 5, numoutlets: 1})]);
  assert.equal(importMaxPatcher(input).patch, null);
  const result = importMaxPatcher(input, {allowPartial: true});
  assert.equal(result.patch.nodes.length, 1);
  assert.ok(result.diagnostics.some(d => d.code === 'port-shape'));
});

test('rejects endpoints beyond the saved Max ports even when the native object has extra ports', () => {
  const input = source([box('a', 'button', undefined, {numinlets: 1, numoutlets: 1}), box('b', 'number', undefined, {numinlets: 1, numoutlets: 2})], [wire('a', 0, 'b', 1)]);
  const result = importMaxPatcher(input, {allowPartial: true});
  assert.equal(result.patch.edges.length, 0);
  assert.equal(result.stats.omittedEdges, 1);
  assert.ok(result.diagnostics.some(d => d.code === 'unsupported-edge'));
});

test('does not activate disabled saved cables or silently ignore their attributes', () => {
  const input = source([box('a', 'button'), box('b', 'button')], [wire('a', 0, 'b', 0, {disabled: 1})]);
  const result = importMaxPatcher(input, {allowPartial: true});
  assert.equal(result.patch.edges.length, 0);
  assert.equal(result.stats.omittedEdges, 1);
  assert.ok(result.diagnostics.some(d => d.code === 'unsupported-edge' && d.edgeIndex === 0));
  const styled = importMaxPatcher(source([box('a', 'button'), box('b', 'button')], [wire('a', 0, 'b', 0, {midpoints: [40, 50, 60, 70], mystery: 1})]), {allowPartial: true});
  assert.equal(styled.patch.edges.length, 1);
  assert.ok(styled.diagnostics.some(d => d.attribute === 'midpoints' && d.edgeIndex === 0));
  assert.ok(styled.diagnostics.some(d => d.attribute === 'mystery' && d.edgeIndex === 0));
  assert.equal(styled.complete, false);
});

const installedRoot = '/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources/help/max';
for (const name of ['toggle', 'button', 'number', 'flonum', 'slider', 'int', 'float', 'pack', 'unpack', 'select', 'route', 'trigger', 'line']) {
  test(`installed ${name}.maxhelp basic tab imports an explicitly partial native graph`, async t => {
    let text;
    try { text = await readFile(`${installedRoot}/${name}.maxhelp`, 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') return t.skip('Licensed local Max installation is absent.'); throw error; }
    const analysis = analyzeMaxPatch(text, {sourceName: `${name}.maxhelp`});
    const basic = analysis.patchers.find(p => p.name === 'basic');
    assert.ok(basic);
    const strict = importMaxPatcher(text, {patcherId: basic.id});
    assert.equal(strict.patch, null);
    const result = importMaxPatcher(text, {patcherId: basic.id, allowPartial: true});
    assert.ok(result.patch, JSON.stringify(result.diagnostics));
    assert.equal(result.complete, false);
    assert.equal(result.partial, true);
    assert.ok(result.patch.nodes.some(n => n.type === (name === 'button' ? 'bang' : name)));
    assert.deepEqual(validatePatch(result.patch), result.patch);
    assert.ok(result.stats.omittedBoxes > 0);
    assert.ok(result.diagnostics.length > 0);
  });
}
