import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as model from './canvas-model.mjs';
import {parseObjectText,objectText,portHelp,suggestObjects} from './canvas-catalog.mjs';
import {completionFor} from './canvas-completion.mjs';
import {readFileSync} from 'node:fs';
import {OBJECT_EXAMPLES} from './canvas-object-examples.mjs';

const empty=()=>({version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]});
test('appended control objects preserve protocol order and typed authoring aliases',()=>{
  assert.deepEqual(Object.keys(model.REGISTRY).slice(15,28),['int','float','flonum','slider','pack','unpack','select','route','trigger','line','print','send','receive']);
  for(const [text,type] of [['i 3','int'],['f 3.5','float'],['flonum','flonum'],['slider','slider'],['sel red','select'],['t b i','trigger'],['line','line']])
    assert.equal(parseObjectText(text).type,type);
  assert.equal(suggestObjects('').length,62);
  assert.deepEqual(parseObjectText('flonum').params,{value:0,minimum:-100000,maximum:100000,numdecimalplaces:6});
  assert.deepEqual(parseObjectText('slider').params,{value:0,size:128,min:0,mult:1,floatoutput:0});
  assert.deepEqual(parseObjectText('line').params,{value:0,time:0,grain:20,floatoutput:2});
});
test('variadic objects round-trip typed configuration and validate per-node port shapes atomically',()=>{
  const doc=new model.CanvasDocument(empty());
  const p=doc.add('pack',0,0,{args:'0 0. red s'}),u=doc.add('unpack',0,80,{args:'i f s 0 0'});
  assert.equal(model.nodeSpec(doc.patch.nodes[0]).inlets.length,4);
  assert.equal(model.nodeSpec(doc.patch.nodes[1]).outlets.length,5);
  doc.connect(u,4,p,3);
  const before=doc.patch;
  assert.throws(()=>doc.parameter(p,'args','0 0'),/inlet/i);
  assert.deepEqual(doc.patch,before);
  assert.deepEqual(parseObjectText(objectText(doc.patch.nodes[0])).params,{args:'0 0. red s'});
  for(const [type,args,ins,outs] of [['select','red',2,2],['select','red blue',1,3],['route','red blue',3,3],['trigger','b i f s',1,4]]){
    const n=model.makeNode(type,10,0,0,{args}),s=model.nodeSpec(n);
    assert.equal(s.inlets.length,ins);assert.equal(s.outlets.length,outs);
    for(let i=0;i<outs;i++)assert.ok(portHelp(n,'out',i).detail);
  }
  for(const args of ['', 'a '.repeat(9).trim(),'x'.repeat(32),'$1','a,b','a;b','"a"','a\\b','a é','100001'])
    assert.throws(()=>model.validatePatch({...empty(),nodes:[model.makeNode('pack',1,0,0,{args})]}),undefined,args);
});
test('literal typed messages retain legacy numeric arrays and reject unsupported syntax',()=>{
  assert.deepEqual(model.parseMessage('1 2.5 3 4 5 6 7 8'),[1,2.5,3,4,5,6,7,8]);
  assert.equal(model.parseMessage('bang'),null);
  for(const text of ['red','set 1','stop','pause','resume','list','list 1 red 3.','symbol blue','symbol 123','symbol 100001','symbol NaN','list 1 2 3 4 5 6 7 8'])assert.equal(model.parseMessage(text),text);
  for(const text of ['', '1 2 3 4 5 6 7 8 9','list 1 2 3 4 5 6 7 8 9','set $1','1,2','1;2','é','x'.repeat(32),'symbol','symbol one two','"red"',"'red'",'a\\b','100001','bang 1','123red','+x','.x','0x10','1e1000','NaN','inf','Infinity'])
    assert.throws(()=>model.parseMessage(text),undefined,text);
});
test('numeric configuration options and variadic guidance appear in completion',()=>{
  assert.deepEqual(parseObjectText('line 0 5').params,{value:0,time:0,grain:5,floatoutput:2});
  const line=parseObjectText('line 0 5 @time 100 @floatoutput 1');
  assert.deepEqual(line.params,{value:0,time:100,grain:5,floatoutput:1});
  assert.deepEqual(parseObjectText(objectText({id:1,...line})),line);
  assert.equal(completionFor('line 0 ').parameter.key,'grain');
  assert.deepEqual(completionFor('line 0 5 @').choices.map(x=>x.label),['@time','@floatoutput']);
  assert.deepEqual(parseObjectText('flonum 1 @minimum -2 @maximum 3 @numdecimalplaces 4').params,{value:1,minimum:-2,maximum:3,numdecimalplaces:4});
  assert.deepEqual(parseObjectText('slider @size 12 @min -2 @mult -0.5 @floatoutput 1').params,{value:0,size:12,min:-2,mult:-.5,floatoutput:1});
  assert.equal(completionFor('pack 0 ').parameter.key,'args');
  assert.match(completionFor('pack 0 ').parameter.detail,/8.*atom|atom.*8/i);
  assert.match(completionFor('trig').choices[0].syntax,/args/);
  assert.deepEqual(completionFor('line @floatoutput ').choices.map(x=>x.label),['0','1','2']);
  for(const text of ['flonum @minimum 3 @maximum 2','flonum @numdecimalplaces 10','slider @size 0','slider @floatoutput 2','line @grain 0','line @floatoutput 3'])assert.throws(()=>parseObjectText(text),undefined,text);
});
test('control-only native graphs accept typed events while DSP is stopped and dynamic inlets enforce bounds',async()=>{
  const calls=[],patch={...empty(),nodes:[model.makeNode('flonum',1),model.makeNode('slider',2),model.makeNode('pack',3,0,0,{args:'0 0 0 0'})]};
  const c=model.createCanvasController({patch,invoke:async(name,args)=>{calls.push({name,args});if(name==='canvas_apply')return{revision:1};return true;}});
  await c.prepare();assert.equal(c.getState().ready,true);
  await c.parameter(1,'value',2.5);await c.parameter(2,'value',30);await c.event(1,0,'tab');await c.event(3,3,'symbol red');await c.flush();
  assert.deepEqual(calls.filter(x=>x.name==='canvas_event').map(x=>x.args.value),[[2.5],[30],'tab','symbol red']);
  assert.throws(()=>c.event(3,4,[1]),/inlet/i);
  await c.parameter(3,'args','0 0 0');await c.flush();assert.equal(calls.filter(x=>x.name==='canvas_apply').length,2);
  await c.panic();assert.equal(c.getState().ready,false);await c.event(1,0,null);
  assert.equal(calls.filter(x=>x.name==='canvas_event').length,4);
  await c.dispose();assert.equal(c.getState().ready,false);
});
test('parameter edits admitted during Stop cannot send a delayed hot event',async()=>{
  const calls=[];let release;
  const c=model.createCanvasController({patch:{...empty(),nodes:[model.makeNode('flonum',1)]},invoke:async(name,args)=>{
    calls.push({name,args});if(name==='canvas_apply')return{revision:1};
    if(name==='canvas_stop'&&!release)await new Promise(resolve=>release=resolve);
    return true;
  }});
  await c.prepare();const stopping=c.stop();await c.parameter(1,'value',3.5);release();await stopping;await c.flush();
  assert.equal(c.getState().ready,true);assert.equal(calls.filter(x=>x.name==='canvas_event').length,0);
  await c.parameter(1,'value',4.5);await c.flush();assert.equal(calls.filter(x=>x.name==='canvas_event').length,1);
});
test('Tab waits for a pending value commit and retains its admission epoch across Stop',async()=>{
  for(const stopped of [false,true]){
    const calls=[];let release;
    const c=model.createCanvasController({patch:{...empty(),nodes:[model.makeNode('flonum',1)]},invoke:async(name,args)=>{
      calls.push({name,args});if(name==='canvas_apply')return{revision:1};
      if(name==='canvas_param')await new Promise(resolve=>release=resolve);
      return true;
    }});
    await c.prepare();const committed=c.parameter(1,'value',5.25),tab=c.tab(1);
    assert.equal(calls.filter(x=>x.name==='canvas_event').length,0);
    const stopping=stopped?c.stop():Promise.resolve();release();
    await Promise.all([committed,tab,stopping]);await c.flush();
    assert.deepEqual(calls.filter(x=>x.name==='canvas_event').map(x=>({value:x.args.value,...(x.args.action?{action:x.args.action}:{})})),stopped?[]:[{value:[5.25]},{value:null,action:'tab'}]);
    assert.equal(c.getState().ready,true);
  }
});
test('bundled control examples match editable source files and retain valid node-aware graphs',()=>{
  assert.deepEqual(Object.keys(OBJECT_EXAMPLES),Object.keys(model.REGISTRY).slice(15));
  for(const [type,patch]of Object.entries(OBJECT_EXAMPLES)){
    const source=JSON.parse(readFileSync(new URL(`../examples/${type}.ultra`,import.meta.url),'utf8'));
    assert.deepEqual(patch,source);assert.deepEqual(model.validatePatch(patch),patch);
    assert.ok(patch.nodes.some(n=>n.type===type));assert.ok(patch.edges.length);
  }
});
