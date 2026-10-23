import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvasController, makeNode, nodeSpec, validatePatch} from './canvas-model.mjs';
import {objectText, parseObjectText, portHelp} from './canvas-catalog.mjs';
import {completionFor} from './canvas-completion.mjs';
import {importMaxPatcher} from './canvas-max-import.mjs';

const patch = (...nodes) => ({version:1,profile:'ultra-canvas-v1',nodes,edges:[]});
const tick = () => new Promise(resolve => setImmediate(resolve));
const box = (id,text,numinlets,numoutlets) => ({box:{id,maxclass:'newobj',text,numinlets,numoutlets,patching_rect:[40,60,100,22]}});
const message = (id,text) => ({box:{id,maxclass:'message',text,patching_rect:[40,30,100,22]}});
const wire = (from,to) => ({patchline:{source:[from,0],destination:[to,0]}});
const source = (boxes,lines=[]) => ({patcher:{boxes,lines}});
function host() {
  const calls=[];let revision=0,running=true,current=patch();
  return {calls,get running(){return running;},invoke:async(name,args={})=>{
    calls.push({name,args});
    if(name==='canvas_apply'){current=args.patch;return{revision:++revision};}
    if(name==='audio_start')running=true;
    if(name==='audio_stop')running=false;
    if(name==='audio_status')return{running,fault:false};
    if(name==='canvas_status')return{revision,active:true,nodes:current.nodes.map(n=>({id:n.id,value:0,pulses:0}))};
    return true;
  }};
}

test('send and receive authoring preserves names, aliases, and creation-dependent ports',()=>{
  for(const name of ['send','s'])assert.deepEqual(parseObjectText(`${name} notes`),{type:'send',params:{name:'notes'}});
  for(const name of ['receive','r']){
    assert.deepEqual(parseObjectText(`${name} notes`),{type:'receive',params:{name:'notes'}});
    assert.deepEqual(parseObjectText(name),{type:'receive',params:{name:''}});
  }
  assert.deepEqual(parseObjectText('receive',{type:'receive',params:{name:'old'}}),{type:'receive',params:{name:''}});
  assert.throws(()=>parseObjectText('send'),/name/i);
  const send=makeNode('send',1),named=makeNode('receive',2,0,0,{name:'notes'}),unbound=makeNode('receive',3);
  assert.deepEqual([nodeSpec(send).inlets.length,nodeSpec(send).outlets.length],[1,0]);
  assert.deepEqual([nodeSpec(named).inlets.length,nodeSpec(named).outlets.length],[0,1]);
  assert.deepEqual([nodeSpec(unbound).inlets.length,nodeSpec(unbound).outlets.length],[1,1]);
  assert.equal(objectText(unbound),'receive');
  assert.match(portHelp(send,'in',0).detail,/complete|unchanged/i);
  assert.deepEqual(portHelp(unbound,'in',0).messages,['set <name>']);
  const complete=completionFor('receive ');
  assert.match(complete.parameter.detail,/optional|unbound/i);
  assert.deepEqual(complete.choices,[]);
});

test('bus names remain bounded ASCII symbols and send requires a nonempty name',()=>{
  for(const type of ['send','receive']){
    assert.equal(validatePatch(patch(makeNode(type,1,0,0,{name:'x'.repeat(31)}))).nodes[0].params.name.length,31);
    for(const name of ['x'.repeat(32),'two words','a;b','a,b','a$b','a\\b','a"b','\t','音',1,null]){
      assert.throws(()=>validatePatch(patch(makeNode(type,1,0,0,{name}))),/name/i,`${type}: ${name}`);
    }
  }
  assert.throws(()=>validatePatch(patch(makeNode('send',1,0,0,{name:''}))),/name/i);
  assert.equal(validatePatch(patch(makeNode('receive',1))).nodes[0].params.name,'');
  const named=patch(makeNode('receive',1,0,0,{name:'notes'}),makeNode('send',2));
  named.edges=[{from:1,outlet:0,to:2,inlet:0}];assert.doesNotThrow(()=>validatePatch(named));
  named.edges=[{from:2,outlet:0,to:1,inlet:0}];assert.throws(()=>validatePatch(named),/index/i);
});

test('name edits and their undo reapply the document instead of numeric parameter commands',async()=>{
  const h=host(),c=createCanvasController({invoke:h.invoke,patch:patch(makeNode('receive',1))});
  await c.prepare();const before=h.calls.length;
  c.parameter(1,'name','notes');await c.flush();c.undo();await c.flush();
  const calls=h.calls.slice(before);
  assert.deepEqual(calls.filter(c=>c.name==='canvas_apply').map(c=>c.args.patch.nodes[0].params.name),['notes','']);
  assert.equal(calls.filter(c=>c.name==='canvas_param').length,0);
});

test('Max import admits named and unbound receives, send aliases, and set as bus payload',()=>{
  const result=importMaxPatcher(source([
    message('payload','set next'),box('send','s notes',1,0),box('named','r notes',0,1),
    box('unbound','receive',1,1),message('retarget','set notes'),
  ],[wire('payload','send'),wire('retarget','unbound')]),{allowPartial:true});
  assert.ok(result.patch,JSON.stringify(result.diagnostics));
  assert.equal(result.diagnostics.filter(d=>d.severity==='error').length,0);
  assert.deepEqual(result.patch.nodes.map(n=>[n.type,n.params.name]),[['message_box',undefined],['send','notes'],['receive','notes'],['receive',''],['message_box',undefined]]);
  assert.equal(result.patch.edges.length,2);
  assert.equal(result.diagnostics.filter(d=>d.code==='port-shape').length,0);
  for(const text of ['send','s','send #0-private','receive #0-private','s ---private','r ---private']){
    const rejected=importMaxPatcher(source([box('a',text,1,0)]));
    assert.equal(rejected.patch,null,text);
    assert.ok(rejected.diagnostics.some(d=>/name|scop|expan/i.test(d.message)),text);
  }
});

test('disposing a document stops only its own graph and leaves global audio running',async()=>{
  const h=host(),c=createCanvasController({invoke:h.invoke,patch:patch(makeNode('bang',1))});
  await c.prepare();await c.poll();const before=h.calls.length;
  await c.disposeDocument();
  assert.deepEqual(h.calls.slice(before).map(c=>c.name),['canvas_stop']);
  assert.equal(h.running,true);assert.equal(c.getState().status.running,true);assert.equal(c.getState().ready,false);
});

test('Max message #0 expansion cannot become a literal runtime receive binding',()=>{
  const result=importMaxPatcher(source([message('retarget','set #0-private'),box('receive','receive',1,1)],[wire('retarget','receive')]),{allowPartial:true});
  assert.deepEqual(result.patch.nodes.map(n=>n.type),['receive']);
  assert.equal(result.patch.edges.length,0);
  assert.ok(result.diagnostics.some(d=>d.severity==='error'&&/#0|expan/i.test(d.message)));
});

for(const pendingCommand of ['canvas_apply','audio_start'])test(`document disposal during pending ${pendingCommand} cancels its startup without stopping global audio`,async()=>{
  const h=host();let release,blocked=false;
  const c=createCanvasController({patch:patch(makeNode('bang',1)),invoke:async(name,args)=>{
    if(name===pendingCommand&&!blocked){blocked=true;await new Promise(resolve=>release=resolve);}
    return h.invoke(name,args);
  }});
  const start=c.startAudio();await tick();assert.ok(release);
  const done=c.dispose();release();await Promise.all([start,done]);
  assert.equal(h.calls.filter(c=>c.name==='audio_stop').length,0);
  assert.ok(h.calls.some(c=>c.name==='canvas_stop'));
  if(pendingCommand==='canvas_apply')assert.equal(h.calls.filter(c=>c.name==='audio_start').length,0);
  assert.equal(h.running,true);assert.equal(c.getState().ready,false);
});

test('failed document stop rejects disposal and allows cleanup to be retried',async()=>{
  const h=host();let reject=true;
  const c=createCanvasController({patch:patch(makeNode('bang',1)),invoke:(name,args)=>name==='canvas_stop'&&reject?Promise.reject(Error('document busy')):h.invoke(name,args)});
  await c.prepare();await assert.rejects(c.dispose(),/cleanup|stop/i);
  assert.match(c.getState().notice,/document busy/);assert.equal(h.running,true);
  reject=false;await c.dispose();assert.equal(h.calls.filter(c=>c.name==='audio_stop').length,0);
});
