import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analyzeMaxPatch, importMaxPatcher} from './canvas-max-import.mjs';
import {validatePatch} from './canvas-model.mjs';

const box = (id, maxclass, text, extra = {}) => ({box: {id, maxclass, ...(text === undefined ? {} : {text}), patching_rect: [40, 60, 70, 22], ...extra}});
const wire = (from, outlet, to, inlet, extra = {}) => ({patchline: {source: [from, outlet], destination: [to, inlet], ...extra}});
const source = (boxes, lines = []) => ({patcher: {boxes, lines}});
test('print imports as a console sink and accepts arbitrary literal selectors',()=>{
  const result=importMaxPatcher(source([box('a','message','set 4'),box('b','newobj','print notes @level 2')],[wire('a',0,'b',0)]),{allowPartial:true});
  assert.ok(result.patch);
  assert.equal(result.patch.nodes[1].type,'print');
  assert.deepEqual(result.patch.nodes[1].params,{label:'notes',level:2,popup:0});
  assert.equal(result.patch.edges.length,1);
});

test('imports named embedded patchers and keeps explicit source selection', () => {
  const input = source([box('tab/one', 'newobj', 'p basic', {patcher: source([box('a', 'button')]).patcher})]);
  const analysis = analyzeMaxPatch(input, {sourceName: 'example.maxhelp'});
  assert.deepEqual(analysis.patchers.map(p => [p.id, p.name, p.path]), [['root', 'Root', []], ['root/tab%2Fone', 'basic', ['tab/one']]]);
  const whole = importMaxPatcher(input);
  assert.ok(whole.patch, JSON.stringify(whole.diagnostics));
  assert.equal(whole.patch.version, 2);
  assert.equal(whole.patch.nodes[0].type, 'patcher');
  assert.equal(whole.patch.nodes[0].params.name, 'basic');
  assert.equal(whole.patch.nodes[0].patcher.nodes[0].type, 'bang');
  const imported = importMaxPatcher(input, {patcherId: 'root/tab%2Fone'});
  assert.equal(imported.patch.nodes[0].type, 'bang');
  assert.equal(imported.complete, true);
  assert.equal(imported.selection.id, 'root/tab%2Fone');
  assert.equal(imported.patch.version, 1);
});

test('imports recursive inline boundaries with globally unique IDs and retained comments', () => {
  const inner = source([
    box('a', 'inlet', undefined, {index: 2}),
    box('b', 'outlet', undefined, {index: 1}),
  ], [wire('a', 0, 'b', 0)]);
  const child = source([
    box('a', 'inlet'), box('b', 'newobj', 'int 17'),
    box('p', 'newobj', 'patcher inner', {patcher: inner.patcher}),
    box('out', 'outlet'), box('note', 'comment', 'Keep this explanation.\nAnd this line.'),
  ], [wire('a', 0, 'b', 0), wire('b', 0, 'p', 0), wire('p', 0, 'out', 0)]);
  const input = source([
    box('a', 'button'), box('p', 'newobj', 'p basic', {patcher: child.patcher}), box('b', 'newobj', 'print'),
  ], [wire('a', 0, 'p', 0), wire('p', 0, 'b', 0)]);
  const result = importMaxPatcher(input);
  assert.ok(result.patch, JSON.stringify(result.diagnostics));
  assert.equal(result.complete, true);
  assert.equal(result.patch.profile, 'ultra-patcher-v2');
  assert.deepEqual(result.patch.nodes.map(n => [n.id, n.type]), [[1, 'bang'], [2, 'patcher'], [10, 'print']]);
  const basic = result.patch.nodes[1].patcher;
  assert.deepEqual(basic.nodes.map(n => [n.id, n.type]), [[3, 'inlet'], [4, 'int'], [5, 'patcher'], [8, 'outlet'], [9, 'comment']]);
  assert.deepEqual(basic.nodes[2].patcher.nodes.map(n => n.id), [6, 7]);
  assert.deepEqual(basic.nodes[4].params, {text: 'Keep this explanation.\nAnd this line.'});
  assert.deepEqual(result.patch.edges, [{from: 1, outlet: 0, to: 2, inlet: 0}, {from: 2, outlet: 0, to: 10, inlet: 0}]);
  assert.deepEqual(basic.edges, [{from: 3, outlet: 0, to: 4, inlet: 0}, {from: 4, outlet: 0, to: 5, inlet: 0}, {from: 5, outlet: 0, to: 8, inlet: 0}]);
  assert.equal(result.nodeMap.a, 1);
  assert.equal(result.scopedNodeMap['root/p/a'], 3);
  assert.equal(result.scopedNodeMap['root/p/p/a'], 6);
  assert.deepEqual(validatePatch(result.patch), result.patch);
  assert.deepEqual(result.stats, {sourceBoxes: 10, sourceEdges: 6, importedBoxes: 10, importedEdges: 6, omittedBoxes: 0, omittedEdges: 0, decorations: 0});
});

test('flat Max comments retain callout appearance and source identity in a version 2 document', () => {
  const input=source([
    box('go','button'),
    box('note','comment','Original two-line\ncallout.',{patching_rect:[210.5,279.5,219,40],bubble:1,bubbleside:3,bubblepoint:0.75,fontsize:13,numinlets:1,numoutlets:0}),
  ]);
  const result=importMaxPatcher(input,{allowPartial:true});
  assert.ok(result.patch,JSON.stringify(result.diagnostics));
  assert.equal(result.patch.version,2);
  assert.deepEqual(result.patch.nodes[1],{id:2,type:'comment',x:210.5,y:279.5,params:{text:'Original two-line\ncallout.'},style:{width:219,height:40,fontsize:13,bubble:1,bubbleside:3,bubblepoint:0.75}});
  assert.equal(result.nodeMap.note,2);assert.equal(result.scopedNodeMap['root/note'],2);
  assert.deepEqual(result.stats,{sourceBoxes:2,sourceEdges:0,importedBoxes:2,importedEdges:0,omittedBoxes:0,omittedEdges:0,decorations:0});
  assert.ok(result.diagnostics.some(d=>d.code==='port-shape'&&d.boxId==='note'));
  assert.equal(result.complete,false);
  assert.ok(!result.diagnostics.some(d=>['bubble','bubbleside','bubblepoint'].includes(d.attribute)));
});

test('invalid comment callout values are omitted individually without clamping or dropping the annotation', () => {
  const input=source([box('note','comment','Original annotation.',{bubble:2,bubbleside:4,bubblepoint:-0.1,linecount:2})]);
  const result=importMaxPatcher(input,{allowPartial:true});
  assert.ok(result.patch,JSON.stringify(result.diagnostics));
  assert.deepEqual(result.patch.nodes[0].style,{width:70,height:22});
  assert.equal(result.stats.omittedBoxes,0);
  for(const attribute of ['bubble','bubbleside','bubblepoint','linecount'])assert.ok(result.diagnostics.some(d=>d.code==='appearance-gap'&&d.attribute===attribute),attribute);
});

test('comments snapshot the nearest valid patcher font size in whole imports and selected fragments', () => {
  const inherited=source([box('grand-note','comment','Original inherited note.')]);
  const child=source([
    box('child-note','comment','Original child note.'),
    box('explicit','comment','Original explicit note.',{fontsize:19}),
    box('invalid','comment','Original invalid override.',{fontsize:99}),
    box('grand','newobj','p grand',{patcher:{...inherited.patcher,default_fontsize:'invalid'}}),
  ]);
  const input={patcher:{...source([
    box('root-note','comment','Original root note.'),
    box('child','newobj','p child',{patcher:{...child.patcher,default_fontsize:13}}),
    box('parent-size','newobj','p parent-size',{patcher:source([box('inherited','comment','Original parent note.')]).patcher}),
  ]).patcher,default_fontsize:18}};
  const result=importMaxPatcher(input,{allowPartial:true});
  assert.ok(result.patch,JSON.stringify(result.diagnostics));
  const [root,container,parentSize]=result.patch.nodes,[local,explicit,invalid,grand]=container.patcher.nodes;
  assert.equal(root.style.fontsize,18);assert.equal(local.style.fontsize,13);assert.equal(explicit.style.fontsize,19);
  assert.equal(invalid.style.fontsize,undefined);assert.equal(grand.patcher.nodes[0].style.fontsize,13);
  assert.equal(parentSize.patcher.nodes[0].style.fontsize,18);
  assert.equal(container.style.fontsize,undefined);
  assert.ok(result.diagnostics.some(d=>d.boxId==='invalid'&&d.attribute==='fontsize'));
  assert.ok(result.diagnostics.some(d=>d.attribute==='default_fontsize'));
  for(const [patcherId,want]of [['root/child',13],['root/child/grand',13],['root/parent-size',18]]){
    const selected=importMaxPatcher(input,{patcherId,allowPartial:true});
    assert.ok(selected.patch,JSON.stringify(selected.diagnostics));
    assert.equal(selected.patch.nodes[0].style.fontsize,want,patcherId);
  }
});

test('inherited comment font size leaves unresolved font and named-style dependencies visible', () => {
  const input={patcher:{...source([box('label','comment','Original label.',{style:'helpfile_label',fontname:'Arial',fontface:0})]).patcher,default_fontsize:13}};
  const result=importMaxPatcher(input,{allowPartial:true});
  assert.ok(result.patch,JSON.stringify(result.diagnostics));
  assert.equal(result.patch.nodes[0].style.fontsize,13);
  for(const attribute of ['style','fontname','fontface','default_fontsize'])assert.ok(result.diagnostics.some(d=>d.attribute===attribute),attribute);
});

test('reports descendant failures in their owner scope and requires explicit partial import', () => {
  const child = source([
    box('a', 'inlet'), box('start', 'newobj', 'loadbang'), box('out', 'outlet'),
  ], [wire('a', 0, 'out', 0), wire('start', 0, 'out', 0)]);
  const input = source([box('a', 'button'), box('p', 'newobj', 'p basic', {patcher: child.patcher}), box('out', 'newobj', 'print')], [wire('a', 0, 'p', 0), wire('p', 0, 'out', 0)]);
  const strict = importMaxPatcher(input);
  assert.equal(strict.patch, null);
  const partial = importMaxPatcher(input, {allowPartial: true});
  assert.ok(partial.patch, JSON.stringify(partial.diagnostics));
  assert.equal(partial.patch.nodes[1].type, 'patcher');
  assert.equal(partial.patch.nodes[1].patcher.nodes.length, 2);
  assert.equal(partial.patch.nodes[1].patcher.edges.length, 1);
  assert.equal(partial.patch.edges.length, 2);
  assert.equal(partial.partial, true);
  assert.ok(partial.diagnostics.some(d => d.code === 'unsupported-box' && d.boxId === 'start' && d.patcherId === 'root/p'));
  assert.ok(partial.diagnostics.some(d => d.code === 'unsupported-edge' && d.edgeIndex === 1 && d.patcherId === 'root/p'));
  assert.deepEqual(partial.stats, {sourceBoxes: 6, sourceEdges: 4, importedBoxes: 5, importedEdges: 3, omittedBoxes: 1, omittedEdges: 1, decorations: 0});
});

test('diagnoses unsupported patcher arguments and does not relabel bpatcher as an embedded p', () => {
  for (const item of [box('p', 'newobj', 'p basic 42', {patcher: source([box('a', 'button')]).patcher}), box('p', 'bpatcher', undefined, {patcher: source([box('a', 'button')]).patcher})]) {
    const result = importMaxPatcher(source([box('a', 'button'), item]), {allowPartial: true});
    assert.ok(result.patch);
    assert.deepEqual(result.patch.nodes.map(n => n.type), ['bang']);
    assert.equal(result.stats.omittedBoxes, 2);
    assert.ok(result.diagnostics.some(d => d.code === 'unsupported-box' && d.boxId === 'p'));
  }
});

test('retains standalone inlet/outlet fragments as v2 without restoring saved execution attributes', () => {
  const input = source([box('a', 'inlet'), box('b', 'outlet', undefined, {saved_object_attributes: {example: 1}})], [wire('a', 0, 'b', 0)]);
  assert.equal(importMaxPatcher(input).patch, null);
  const result = importMaxPatcher(input, {allowPartial: true});
  assert.ok(result.patch, JSON.stringify(result.diagnostics));
  assert.equal(result.patch.version, 2);
  assert.equal(result.patch.nodes[0].type, 'inlet');
  assert.equal(result.patch.edges.length, 1);
  assert.ok(result.diagnostics.some(d => d.attribute === 'saved_object_attributes' && d.patcherId === 'root'));
});

test('counts executable hierarchy limits across descendants without charging comments or containers', () => {
  const child = source(Array.from({length: 32}, (_, i) => box('n' + i, 'button')));
  const supported = importMaxPatcher(source([box('p', 'newobj', 'p basic', {patcher: child.patcher}), box('note', 'comment', 'A comment is not a native node.')]));
  assert.ok(supported.patch, JSON.stringify(supported.diagnostics));
  assert.equal(supported.patch.nodes[0].patcher.nodes.length, 32);
  const tooLarge = importMaxPatcher(source([box('a', 'button'), box('p', 'newobj', 'p basic', {patcher: child.patcher})]), {allowPartial: true});
  assert.equal(tooLarge.patch, null);
  assert.ok(tooLarge.diagnostics.some(d => d.code === 'native-limit'));
});

test('does not reroute a parent cable to a different child when a boundary is omitted', () => {
  const child = source([
    box('bad', 'inlet', undefined, {patching_rect: [-1, 20, 30, 30]}),
    box('kept', 'inlet', undefined, {patching_rect: [100, 20, 30, 30]}),
    box('out', 'outlet'),
  ], [wire('kept', 0, 'out', 0)]);
  const result = importMaxPatcher(source([box('a', 'button'), box('p', 'newobj', 'p basic', {patcher: child.patcher})], [wire('a', 0, 'p', 0)]), {allowPartial: true});
  assert.ok(result.patch, JSON.stringify(result.diagnostics));
  assert.equal(result.patch.nodes[1].patcher.nodes[0].type, 'inlet');
  assert.equal(result.patch.edges.length, 0);
  assert.ok(result.diagnostics.some(d => d.code === 'unsupported-edge' && d.patcherId === 'root' && d.edgeIndex === 0));
});

test('preserves mixed signal boundaries and refuses cables that escape a child scope', () => {
  const child = source([box('a', 'inlet'), box('b', 'outlet')], [wire('a', 0, 'b', 0), wire('a', 0, 'outside', 0, {order: 1})]);
  const input = source([box('outside', 'newobj', 'sig~ 3'), box('p', 'newobj', 'p signal', {patcher: child.patcher}), box('tap', 'newobj', 'print')], [wire('outside', 0, 'p', 0), wire('p', 0, 'tap', 0)]);
  const result = importMaxPatcher(input, {allowPartial: true});
  assert.ok(result.patch, JSON.stringify(result.diagnostics));
  assert.equal(result.patch.nodes[1].patcher.edges.length, 1);
  assert.equal(result.patch.edges.length, 2);
  assert.ok(result.diagnostics.some(d => d.code === 'unsupported-edge' && d.patcherId === 'root/p' && d.edgeIndex === 1));
});

test('keeps source maps distinct when a literal root box ID resembles a descendant path', () => {
  const child = source([box('a', 'button')]);
  const result = importMaxPatcher(source([box('root/p/a', 'button'), box('p', 'newobj', 'p basic', {patcher: child.patcher})]));
  assert.ok(result.patch);
  assert.equal(result.nodeMap['root/p/a'], 1);
  assert.equal(result.scopedNodeMap['root/root%2Fp%2Fa'], 1);
  assert.equal(result.scopedNodeMap['root/p/a'], 3);
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
  for (const name of ['counter 8', 'makenote 100 150', 'voice~', 'midiin', 'stereo.dac~']) {
    const result = importMaxPatcher(source([box('a', 'newobj', name)]), {allowPartial: true});
    assert.equal(result.patch, null, name);
    assert.ok(result.diagnostics.some(d => d.code === 'unsupported-box'), name);
  }
});

test('retains integer Tab and message cold cables while surfacing the remaining metro gap', () => {
  const input = source([box('n', 'number', undefined, {numinlets: 1, numoutlets: 2}), box('b', 'button'), box('m', 'message', '42', {numinlets: 2, numoutlets: 1}), box('clock', 'newobj', 'metro 500')], [wire('n', 1, 'b', 0), wire('b', 0, 'm', 1)]);
  assert.equal(importMaxPatcher(input).patch, null);
  const result = importMaxPatcher(input, {allowPartial: true});
  assert.equal(result.patch.edges.length, 2);
  assert.equal(result.stats.omittedEdges, 0);
  assert.ok(result.diagnostics.some(d => d.code === 'semantic-gap' && d.boxId === 'clock'));
  assert.equal(result.diagnostics.some(d=>d.boxId==='m'&&['semantic-gap','port-shape'].includes(d.code)),false);
  assert.equal(result.diagnostics.some(d => d.boxId === 'n' && ['semantic-gap','port-shape'].includes(d.code)),false);
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
  const input = source([box('a', 'message', 'size $3'), box('b', 'message', 'size 3'), box('c', 'newobj', 'int'), box('d', 'button')], [wire('b', 0, 'c', 0)]);
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
  assert.equal(styled.diagnostics.some(d => d.attribute === 'midpoints'),false);
  assert.deepEqual(styled.patch.edges[0].midpoints,[40,50,60,70]);
  assert.ok(styled.diagnostics.some(d => d.attribute === 'mystery' && d.edgeIndex === 0));
  assert.equal(styled.complete, false);
});
test('imports bounded cable midpoints losslessly and isolates invalid geometry from executable cable admission',()=>{
  for(const midpoints of [[],[0,4000],[10.5,20,10.5,20],Array(256).fill(4000)]){
    const input=source([box('a','button'),box('b','button')],[wire('a',0,'b',0,{midpoints})]);
    const result=importMaxPatcher(input);assert.ok(result.patch);assert.equal(result.complete,true);
    assert.deepEqual(result.patch.edges[0].midpoints,midpoints);assert.notEqual(result.patch.edges[0].midpoints,midpoints);
  }
  for(const midpoints of [null,'10,20',[1],Array(258).fill(1),[-1,0],[4001,0],[null,0],['1',2]]){
    const input=source([box('a','button'),box('b','button')],[wire('a',0,'b',0,{midpoints})]);
    const result=importMaxPatcher(input,{allowPartial:true});assert.ok(result.patch);assert.equal(result.patch.edges.length,1);
    assert.equal(Object.hasOwn(result.patch.edges[0],'midpoints'),false);assert.equal(result.stats.omittedEdges,0);
    assert.equal(result.diagnostics.filter(d=>d.code==='appearance-gap'&&d.attribute==='midpoints'&&d.edgeIndex===0).length,1);
    assert.equal(result.complete,false);
  }
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
    assert.ok(result.patch.nodes.some(n => n.type === ({button:'bang',number:'number_int'}[name]??name)));
    assert.deepEqual(validatePatch(result.patch), result.patch);
    assert.ok(result.stats.omittedBoxes > 0);
    assert.ok(result.diagnostics.length > 0);
  });
}
