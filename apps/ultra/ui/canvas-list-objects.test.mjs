import assert from 'node:assert/strict';
import {test} from 'node:test';
import {REGISTRY, makeNode, nodeSpec, parseArguments, validatePatch} from './canvas-model.mjs';
import {OBJECTS, objectText, parseObjectText, portHelp, suggestObjects} from './canvas-catalog.mjs';
import {importMaxPatcher} from './canvas-max-import.mjs';
import {OBJECT_EXAMPLES} from './canvas-object-examples.mjs';
import {createLibraryPatch, searchLibrary} from './canvas-library.mjs';

const types=['iter','prepend','append','zl_reg','zl_join','zl_len','zl_iter','zl_slice','zl_rev','zl_rot'];
const empty=()=>({version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]});
const box=(id,text,extra={})=>({box:{id,maxclass:'newobj',text,patching_rect:[40,60,120,22],...extra}});
const message=(id,text)=>({box:{id,maxclass:'message',text,patching_rect:[40,20,120,22]}});
const wire=(from,to,inlet=0)=>({patchline:{source:[from,0],destination:[to,inlet]}});
const source=(boxes,lines=[])=>({patcher:{boxes,lines}});

test('list object creation preserves typed argument spelling and fixed saved topology',()=>{
  const cases=[['iter','iter',{}],['prepend list 1 2.5 red','prepend',{args:'list 1 2.5 red'}],['append 9 blue','append',{args:'9 blue'}],['zl.reg 1 2. red','zl_reg',{args:'1 2. red'}],['zl.join 3.5 green','zl_join',{args:'3.5 green'}],['zl.len','zl_len',{}],['zl.iter 3','zl_iter',{size:3}],['zl.slice 2','zl_slice',{size:2}],['zl.rev','zl_rev',{}],['zl.rot -2','zl_rot',{rotation:-2}]];
  for(const [text,type,params]of cases){
    assert.deepEqual(parseObjectText(text),{type,params},text);
    const node=makeNode(type,1,40,40,params),spec=nodeSpec(node);
    assert.equal(spec.inlets.length,type.startsWith('zl_')?2:1,type);
    assert.equal(spec.outlets.length,type.startsWith('zl_')?2:1,type);
    assert.deepEqual(parseObjectText(objectText(node)),{type,params},type);
    assert.deepEqual(validatePatch({...empty(),nodes:[node]}).nodes[0],node);
  }
  assert.equal(nodeSpec(makeNode('zl_reg',1,40,40,{args:'1 2 3 4 5 6 7 8'})).inlets.length,2);
  assert.equal(nodeSpec(makeNode('prepend',1,40,40,{args:'list 1 2 3 4 5 6 7'})).inlets.length,1);
});

test('optional retained lists and bare prepend may be explicitly empty without weakening existing argument validation',()=>{
  for(const type of ['prepend','append','zl_reg','zl_join']){
    const name=OBJECTS[type].name,node=makeNode(type,1);
    assert.equal(node.params.args,'');
    assert.deepEqual(parseObjectText(name),{type,params:{args:''}});
    assert.deepEqual(parseObjectText(name,{type,params:{args:'old value'}}),{type,params:{args:''}});
    assert.doesNotThrow(()=>validatePatch({...empty(),nodes:[node]}));
    assert.doesNotThrow(()=>validatePatch({...empty(),nodes:[makeNode(type,1,40,40,{args:' \t '})]}));
    for(const args of ['1 2 3 4 5 6 7 8 9','hello;world','x'.repeat(32),' '.repeat(128)])assert.throws(()=>validatePatch({...empty(),nodes:[makeNode(type,1,40,40,{args})]}),undefined,`${type}: ${args}`);
  }
  assert.throws(()=>parseArguments(''),/at least one/);
  for(const type of ['pack','unpack','select','route','trigger'])assert.throws(()=>validatePatch({...empty(),nodes:[makeNode(type,1,40,40,{args:''})]}),/at least one/);
});

test('legacy fixed zl modes normalize to dotted names while unsupported modes and execution options are refused',()=>{
  for(const type of types.filter(type=>type.startsWith('zl_'))){
    const standard=objectText(makeNode(type,1)),legacy=standard.replace('zl.','zl ');
    assert.deepEqual(parseObjectText(legacy),parseObjectText(standard),legacy);
    assert.ok(suggestObjects('zl').some(entry=>entry.type===type));
  }
  for(const text of ['zl','zl queue','zl 256 reg','zl.reg @zlmaxsize 256','zl.reg @fuzzy 1','zl.reg @mode rev','append @bogus 1','iter 1','zl.rev 1','zl.len 1','zl.iter -1','zl.iter 2.5','zl.slice -1','zl.rot 100001'])assert.throws(()=>parseObjectText(text),undefined,text);
  assert.deepEqual(parseObjectText('prepend'),{type:'prepend',params:{args:''}});
  assert.deepEqual(parseObjectText('prepend list'),{type:'prepend',params:{args:'list'}});
  assert.deepEqual(parseObjectText('prepend 1 2.'),{type:'prepend',params:{args:'1 2.'}});
  assert.equal(parseObjectText('zl.iter').params.size,0);
  assert.equal(parseObjectText('zl.iter 0').params.size,0);
  assert.equal(parseObjectText('zl.slice').params.size,0);
  assert.equal(parseObjectText('zl.slice 0').params.size,0);
  assert.equal(parseObjectText('zl.iter 100000').params.size,100000);
  assert.equal(parseObjectText('zl.rot -100000').params.rotation,-100000);
});

test('list help documents active and inactive ports and includes original runnable examples',()=>{
  for(const type of types){
    assert.ok(REGISTRY[type].help&&OBJECTS[type].summary,type);
    assert.ok(OBJECT_EXAMPLES[type]?.nodes.some(node=>node.type===type),type);
    const example=createLibraryPatch(`help:${type}`);
    assert.ok(example.edges.length,type);
    assert.ok(example.nodes.some(node=>node.type==='print'),type);
    assert.deepEqual(example,validatePatch(example));
    assert.ok(searchLibrary(OBJECTS[type].name,'help').some(entry=>entry.objectType===type),type);
    for(const direction of ['in','out'])for(let index=0;index<(direction==='in'?nodeSpec(makeNode(type,1)).inlets:nodeSpec(makeNode(type,1)).outlets).length;index++)assert.ok(portHelp(type,direction,index).detail);
  }
  assert.match(portHelp('zl_reg','in',1).detail,/cold|silently/i);
  assert.match(portHelp('zl_join','in',1).detail,/cold|silently/i);
  assert.match(portHelp('zl_len','in',1).detail,/inactive/i);
  assert.deepEqual(portHelp('zl_len','in',1).messages,['zlclear','zlreset']);
  assert.ok(portHelp('zl_iter','in',1).messages.includes('zlreset'));
  assert.match(portHelp('zl_rev','out',1).detail,/inactive/i);
  assert.match(portHelp('zl_slice','out',1).detail,/first|before/i);
});

test('Max list imports retain both saved zl ports and admit typed data selectors',()=>{
  for(const type of types){
    const node=makeNode(type,1),text=objectText(node),ports=nodeSpec(node);
    const result=importMaxPatcher(source([message('m','red 1 2.5'),box('o',text,{numinlets:ports.inlets.length,numoutlets:ports.outlets.length})],[wire('m','o')]),{allowPartial:true});
    assert.ok(result.patch,type);
    assert.equal(result.patch.nodes[1].type,type);
    assert.equal(result.patch.edges.length,1,type);
    assert.equal(result.stats.omittedBoxes,0,type);
    assert.equal(result.stats.omittedEdges,0,type);
    assert.ok(!result.diagnostics.some(d=>d.code==='port-shape'),type);
  }
  const cold=importMaxPatcher(source([message('m','red 1 2.5'),box('r','zl reg'),box('j','zl join')],[wire('m','r',1),wire('m','j',1)]),{allowPartial:true});
  assert.equal(cold.patch.edges.length,2);
});

test('unsupported list execution attributes and modes never become an approved Max box',()=>{
  for(const text of ['zl reg @zlmaxsize 512','zl.reg @fuzzy 1','zl reg @mode rev','append @unknown 1','zl 256 reg','zl group 3','prepend #0-local','append #0-local','zl.reg #0-local','zl.join #0-local']){
    const result=importMaxPatcher(source([box('o',text)]),{allowPartial:true});
    assert.equal(result.patch,null,text);
    assert.equal(result.stats.omittedBoxes,1,text);
  }
  for(const attribute of ['fuzzy','zlmaxsize','mode']){
    const result=importMaxPatcher(source([box('o','zl.reg',{[attribute]:1})]),{allowPartial:true});
    assert.equal(result.patch,null,attribute);
    assert.ok(result.diagnostics.some(d=>d.code==='unsupported-box'),attribute);
  }
});

test('Max runtime mode and capacity messages remain explicit gaps while ordinary selector data reaches fixed zl modes',()=>{
  for(const inlet of [0,1])for(const selector of ['mode rev','zlmaxsize 512','fuzzy 1']){
    const result=importMaxPatcher(source([message('m',selector),box('o','zl.reg')],[wire('m','o',inlet)]),{allowPartial:true});
    assert.ok(result.patch);
    assert.equal(result.patch.edges.length,0,`${selector}, inlet ${inlet}`);
    assert.ok(result.diagnostics.some(d=>d.code==='unsupported-edge'),`${selector}, inlet ${inlet}`);
  }
  for(const inlet of [0,1])for(const selector of ['list mode rev','red 1 2.5','zlclear','zlreset']){
    const result=importMaxPatcher(source([message('m',selector),box('o','zl.reg')],[wire('m','o',inlet)]),{allowPartial:true});
    assert.equal(result.patch.edges.length,1,`${selector}, inlet ${inlet}`);
  }
});
