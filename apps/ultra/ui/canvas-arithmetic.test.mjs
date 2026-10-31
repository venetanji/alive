import assert from 'node:assert/strict';
import {test} from 'node:test';
import {makeNode,validatePatch,createCanvasController} from './canvas-model.mjs';
import {parseObjectText,objectText,OBJECTS,portHelp} from './canvas-catalog.mjs';
import {appearanceFields} from './canvas-appearance.mjs';
import {completionFor} from './canvas-completion.mjs';
import {importMaxPatcher} from './canvas-max-import.mjs';

const patch=node=>({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[node],edges:[]});
const node=text=>{const parsed=parseObjectText(text);return makeNode(parsed.type,1,0,0,parsed.params);};

test('saved rhs-only arithmetic and English legacy text retain existing defaults',()=>{
  assert.deepEqual(validatePatch(patch({id:1,type:'multiply',x:0,y:0,params:{rhs:.5}})).nodes[0].params,{rhs:.5,numericmode:0});
  assert.deepEqual(makeNode('multiply',1).params,{rhs:1,numericmode:0});
  for(const [text,type,rhs]of [['add 2','add',2],['multiply .5','multiply',.5],['add.legacy','add',0],['multiply.legacy','multiply',1]]){
    assert.deepEqual(parseObjectText(text),{type,params:{rhs,numericmode:0}});
    assert.match(objectText(node(text)),/\.legacy /);
  }
});

test('typed creation retains whole float spelling and bare edits reset operand and mode',()=>{
  for(const [text,type,rhs,mode,canonical]of [
    ['+ 2','add',2,1,'+ 2'],['+ 2.','add',2,2,'+ 2.'],['*','multiply',0,1,'* 0'],
    ['* .5','multiply',.5,2,'* 0.5'],['- 2.','subtract',2,2,'- 2.'],
    ['/','divide',1,1,'/ 1'],['% 3','modulo',3,1,'% 3'],
    ['!- 2','reverse_subtract',2,1,'!- 2'],['!/','reverse_divide',1,1,'!/ 1'],
  ]){
    const parsed=parseObjectText(text);
    assert.deepEqual(parsed,{type,params:{rhs,numericmode:mode}});
    assert.equal(objectText(makeNode(type,1,0,0,parsed.params)),canonical);
    assert.deepEqual(parseObjectText(canonical),parsed);
  }
  assert.deepEqual(parseObjectText('*',node('* 2.')),{type:'multiply',params:{rhs:0,numericmode:1}});
  assert.deepEqual(parseObjectText('* 2',node('* 2.')),{type:'multiply',params:{rhs:2,numericmode:1}});
  for(const text of ['+ 2 @numericmode 2','* @rhs 2','/ NaN','- 2 3'])assert.throws(()=>parseObjectText(text));
});

test('qualified decimal modulo and abs creation retain float mode without exponent aliases',()=>{
  for(const [text,type,params]of [['% 2.','modulo',{rhs:2,numericmode:2}],['% 2.5','modulo',{rhs:2.5,numericmode:2}],['abs 2','abs',{numericmode:1}],['abs 2.','abs',{numericmode:2}]]){
    assert.deepEqual(parseObjectText(text),{type,params});
  }
  for(const text of ['+ 2e0','/ 2e0','abs 2e0'])assert.throws(()=>parseObjectText(text),/exponent|decimal/i);
  for(const value of [1e-8,-1.23456789e-9,1e-25,Number.MIN_VALUE,-Number.MIN_VALUE,2.2250738585072014e-308]){
    const n=makeNode('add',1,0,0,{rhs:value,numericmode:2}),text=objectText(n);
    assert.doesNotMatch(text,/[eE]/);assert.deepEqual(parseObjectText(text).params,n.params);
  }
  assert.deepEqual(parseObjectText('multiply.legacy 2e-8').params,{rhs:2e-8,numericmode:0});
  assert.throws(()=>parseObjectText('+ 0.'+'0'.repeat(400)),/characters/);
});

test('integer saved operands validate atomically across flat and nested patches',()=>{
  for(const type of ['add','multiply','subtract','divide','modulo','reverse_subtract','reverse_divide']){
    for(const value of [null,false,3,-1,1.5])assert.throws(()=>validatePatch(patch(makeNode(type,1,0,0,{rhs:2,numericmode:value}))));
    assert.throws(()=>validatePatch(patch(makeNode(type,1,0,0,{rhs:2.5,numericmode:1}))),/integer|integral/i);
    const nested={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[{...makeNode('patcher',2),patcher:{presentation:null,nodes:[makeNode(type,1,0,0,{rhs:2.5,numericmode:1})],edges:[]}}],edges:[]};
    assert.throws(()=>validatePatch(nested),/integer|integral/i);
  }
  assert.throws(()=>validatePatch(patch(makeNode('abs',1,0,0,{rhs:2}))),/rhs/);
  assert.throws(()=>validatePatch(patch(makeNode('subtract',1,0,0,{numericmode:0}))));
});

test('mode changes and their undo redo reapply standalone graphs while rhs stays live',async()=>{
  const calls=[];let revision=0;
  const controller=createCanvasController({patch:patch(node('+ 2')),invoke:async(name,args)=>{
    calls.push({name,args});
    if(name==='canvas_apply')return{revision:++revision};
    if(name==='audio_status')return{running:false};
    return true;
  }});
  await controller.prepare();
  await controller.parameter(1,'rhs',3);await controller.flush();
  assert.equal(calls.filter(c=>c.name==='canvas_param').length,1);
  for(const action of [()=>controller.parameter(1,'numericmode',2),()=>controller.undo(),()=>controller.redo()]){
    const before=revision;await action();await controller.flush();assert.equal(revision,before+1);
  }
  assert.equal(calls.some(c=>c.name==='canvas_param'&&c.args.key==='numericmode'),false);
  assert.equal(controller.getState().patch.nodes[0].params.numericmode,2);
});

test('new arithmetic reuses generic faces and exposes fixed type in help and creation hints',()=>{
  for(const type of ['subtract','divide','modulo','reverse_subtract','reverse_divide','abs']){
    assert.equal(OBJECTS[type].ui,'object');assert.ok(appearanceFields(type).some(f=>f.key==='fontsize'));
    assert.equal(OBJECTS[type].inlets.length,type==='abs'?1:2);assert.equal(OBJECTS[type].outlets.length,1);
  }
  assert.match(portHelp(node('+ 2.'),'out',0).detail,/float/i);
  assert.match(portHelp(node('+ 2'),'out',0).detail,/integer/i);
  assert.match(portHelp(makeNode('add',1),'out',0).detail,/legacy/i);
  assert.match(completionFor('+ ').parameter.detail,/float|decimal/i);
});

test('Max import uses typed symbols and refuses Ultra-only legacy spellings',()=>{
  const source=text=>({patcher:{boxes:[{box:{id:'a',maxclass:'newobj',text,patching_rect:[0,0,54,23]}}],lines:[]}});
  const imported=importMaxPatcher(source('* 2.'),{allowPartial:true});
  assert.deepEqual(imported.patch.nodes[0].params,{rhs:2,numericmode:2});
  assert.equal(imported.diagnostics.some(d=>/integer creation-argument coercion is not reproduced/.test(d.message)),false);
  for(const text of ['multiply 2','multiply.legacy 2','add 2','add.legacy 2','+ 2 @numericmode 2'])assert.equal(importMaxPatcher(source(text)).patch,null);
  for(const text of ['+ 2e0','abs 2e0','/ 2e0']){
    const rejected=importMaxPatcher(source(text));assert.equal(rejected.patch,null);
    assert.ok(rejected.diagnostics.some(d=>/exponent/i.test(d.message)));
  }
});

test('qualified arithmetic set cables import and ignored reverse set is described accurately',()=>{
  const source={patcher:{boxes:[{box:{id:'m',maxclass:'message',text:'set 5',patching_rect:[0,0,54,23]}},
    {box:{id:'a',maxclass:'newobj',text:'- 2.',patching_rect:[0,80,54,23]}}],
    lines:[{patchline:{source:['m',0],destination:['a',0]}}]}};
  const imported=importMaxPatcher(source,{allowPartial:true});assert.equal(imported.patch.edges.length,1);
  assert.equal(imported.diagnostics.some(d=>d.code==='unsupported-message'),false);
  assert.equal(portHelp(node('!- 2.'),'in',0).messages.includes('set'),false);
});
