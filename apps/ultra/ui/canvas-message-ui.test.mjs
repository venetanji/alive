import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMessageTemplate, mergeMessageDisplays} from './canvas-message-ui.mjs';
import {makeNode, nodeSpec, parsePatch, serializePatch, validatePatch, createCanvasController} from './canvas-model.mjs';
import {objectText, parseObjectText} from './canvas-catalog.mjs';
import {createSharedCanvasController} from './canvas-shared.mjs';

test('Message templates admit empty, typed literals and only complete $1/$2 references',()=>{
  for(const text of ['', '  ', 'saved $1 $2', '1 $1 $2', '5 pear 2.25', 'symbol kiwi', 'bang', 'set fresh $1'])assert.doesNotThrow(()=>parseMessageTemplate(text));
  for(const text of ['$0', '$3', '$10', '$1 $2', 'x$1', '$1tail', '1, 2', '; remote 9', '"hello"', 'symbol $1', 'bang $1', '100001', '1 2 3 4 5 6 7 8 9', 'x'.repeat(32)])assert.throws(()=>parseMessageTemplate(text),undefined,text);
});

test('new Message authoring has two inlets and preserves saved legacy literals',()=>{
  const authored=parseObjectText('message saved $1 $2');
  assert.equal(authored.type,'message_box');
  assert.equal(parseObjectText('msg').params.text,'');
  const node=makeNode(authored.type,7,30,40,authored.params);
  assert.equal(nodeSpec(node).inlets.length,2);assert.equal(nodeSpec(node).outlets.length,1);
  const legacy=makeNode('message',8,40,60,{text:'9'});
  assert.equal(nodeSpec(legacy).inlets.length,1);
  assert.equal(objectText(legacy),'message.legacy 9');
  assert.equal(parseObjectText(objectText(legacy)).type,'message');
  const patch={version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[node,legacy,makeNode('message_box',9)],edges:[{from:8,outlet:0,to:7,inlet:1}]};
  assert.equal(parsePatch(serializePatch(patch)).nodes[2].params.text,'');
  assert.throws(()=>validatePatch({...patch,nodes:[{...legacy,params:{text:'saved $1'}}]}));
});

const row=(id,text,generation=1)=>({id,generation,empty:text==='',text,prototype:{},placeholders:[]});
const snapshot=(nodes,serial=0,revision=4)=>({revision,text_edit_serial:serial,nodes});
const options=(extra={})=>({revision:4,serial:0,ids:new Set([1,2]),pending:new Set(),...extra});
test('display cache preserves empty templates, refuses stale serials and keeps non-consuming snapshots',()=>{
  const first=mergeMessageDisplays({},snapshot([row(1,'saved $1'),row(2,'')]),options());
  assert.equal(first[1].text,'saved $1');assert.equal(first[2].text,'');assert.equal(first[2].empty,true);
  const second=mergeMessageDisplays(first,null,options());assert.deepEqual(second,first);
  assert.deepEqual(mergeMessageDisplays({},snapshot([row(1,'saved $1'),row(2,'')]),options()),first);
  const pending=mergeMessageDisplays(first,snapshot([row(1,'old')]),options({pending:new Set([1]),serial:2}));
  assert.equal(pending[1],undefined);assert.equal(pending[2].text,'');
  assert.equal(mergeMessageDisplays(pending,snapshot([row(1,'new')],1),options({serial:2}))[1],undefined);
  const accepted=mergeMessageDisplays(pending,snapshot([row(1,'new',3),row(2,'')],2),options({serial:2}));
  assert.equal(accepted[1].text,'new');
  assert.equal(mergeMessageDisplays(accepted,snapshot([row(1,'older',2)],2),options({serial:2}))[1].text,'new');
  assert.deepEqual(mergeMessageDisplays(accepted,null,options({revision:5})),{});
});

test('standalone Message text edit and history precede hot input without graph replacement',async()=>{
  const calls=[];let release,serial=0;
  const patch={version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('message_box',1,0,0,{text:'saved $1'})],edges:[]};
  let live=snapshot([row(1,'runtime')],0,8);
  const c=createCanvasController({patch,invoke:async(name,args)=>{
    calls.push({name,args});if(name==='canvas_apply')return{revision:8};
    if(name==='canvas_message_text'){if(!serial)await new Promise(resolve=>release=resolve);return{serial:++serial};}
    if(name==='canvas_status')return{revision:8,active:true,nodes:[],message_boxes:live};
    return true;
  }});
  await c.prepare();await c.poll();assert.equal(c.getState().messageBoxes[1].text,'runtime');
  const update=c.parameter(1,'text','fresh $1'),hot=c.event(1);
  assert.equal(c.getState().messageBoxes[1],undefined);assert.equal(calls.some(call=>call.name==='canvas_event'),false);
  release();await Promise.all([update,hot]);await c.flush();
  assert.equal(calls.filter(call=>call.name==='canvas_apply').length,1);
  assert.deepEqual(calls.filter(call=>['canvas_message_text','canvas_event'].includes(call.name)).map(call=>call.name),['canvas_message_text','canvas_event']);
  await c.poll();assert.equal(c.getState().messageBoxes[1],undefined);
  live=snapshot([row(1,'fresh $1',2)],1,8);await c.poll();assert.equal(c.getState().messageBoxes[1].text,'fresh $1');
  c.undo();await c.flush();assert.equal(c.getState().patch.nodes[0].params.text,'saved $1');
  assert.equal(calls.filter(call=>call.name==='canvas_apply').length,1);
  assert.equal(calls.filter(call=>call.name==='canvas_message_text').at(-1).args.text,'saved $1');
  c.configure(1,'message_box',{text:'saved $1'});await c.flush();
  assert.equal(calls.filter(call=>call.name==='canvas_message_text').length,3);
});

test('shared Message same-text restore carries explicit CAS hint and serial-gates all views',async()=>{
  let serial=0,publication=1,live=snapshot([row(1,'runtime')],0,8);
  const patch={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[makeNode('message_box',1,0,0,{text:'saved'})],edges:[]};
  const descriptor=()=>({shared:true,label:'owner',ownerLabel:'owner',viewPath:[],patch,authoringRevision:1,runtimeRevision:8,messageTextSerial:serial,descriptorRevision:publication});
  const calls=[];const c=createSharedCanvasController({invoke:async(name,args)=>{
    calls.push({name,args});if(name==='document_current')return descriptor();
    if(name==='document_commit'){serial++;publication++;return{accepted:true,document:descriptor()};}
    if(name==='canvas_status')return{revision:8,active:true,nodes:[],message_boxes:live};return{};
  }});
  await c.prepare();await c.poll();assert.equal(c.getState().messageBoxes[1].text,'runtime');
  c.configure(1,'message_box',{text:'saved'});await c.flush();
  assert.deepEqual(calls.find(call=>call.name==='document_commit').args.messageText,{node:1,text:'saved'});
  assert.equal(c.getState().messageBoxes[1],undefined);
  await c.poll();assert.equal(c.getState().messageBoxes[1],undefined);
  live=snapshot([row(1,'saved',2)],1,8);await c.poll();assert.equal(c.getState().messageBoxes[1].text,'saved');
  assert.equal(c.getState().patch.nodes[0].params.text,'saved');
});

test('standalone Message edits preserve interleaved text / trigger order',async()=>{
  const calls=[];let release,serial=0;
  const c=createCanvasController({patch:{version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('message_box',1)],edges:[]},invoke:async(name,args)=>{
    if(name==='canvas_apply')return{revision:4};
    calls.push({name,args});
    if(name==='canvas_message_text'){if(!serial)await new Promise(resolve=>release=resolve);return{serial:++serial};}
    return true;
  }});
  await c.prepare();c.parameter(1,'text','first');c.event(1);c.parameter(1,'text','second');c.event(1);
  release();await c.flush();
  assert.deepEqual(calls.map(call=>call.name==='canvas_message_text'?call.args.text:'bang'),['first','bang','second','bang']);
});

test('rejected standalone text admission preserves saved text and history and blocks dependent edits',async()=>{
  let reject;
  const c=createCanvasController({patch:{version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('message_box',1,0,0,{text:'saved'})],edges:[]},invoke:async(name)=>{
    if(name==='canvas_apply')return{revision:4};
    if(name==='canvas_message_text')await new Promise((_,failure)=>reject=failure);
    return true;
  }});
  await c.prepare();const edit=c.parameter(1,'text','rejected');
  assert.equal(c.getState().patch.nodes[0].params.text,'saved');assert.equal(c.getState().canUndo,false);
  assert.throws(()=>c.add('bang'),/Wait for the message text edit/);assert.throws(()=>c.undo(),/Wait for the message text edit/);
  reject(Error('queue full'));assert.equal(await edit,false);await c.flush();
  assert.equal(c.getState().patch.nodes[0].params.text,'saved');assert.equal(c.getState().canUndo,false);assert.equal(c.getState().faulted,true);
});

test('both controllers admit replacement placeholders only for MessageBox cold/set input',async()=>{
  for(const shared of [false,true]){
    const calls=[],patch={version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('message_box',1),makeNode('message',2)],edges:[]};
    const invoke=async(name,args)=>{calls.push({name,args});
      if(name==='canvas_apply')return{revision:4};
      if(name==='document_current')return{shared:true,label:'owner',ownerLabel:'owner',viewPath:[],patch,authoringRevision:1,runtimeRevision:4,messageTextSerial:0};
      return true;};
    const c=shared?createSharedCanvasController({invoke}):createCanvasController({patch,invoke});await c.prepare();
    await c.event(1,1,'new $1 $2');await c.event(1,0,'set fresh $1');
    assert.throws(()=>c.event(1,0,'new $1'),/substitution|quotes/);
    assert.throws(()=>c.event(2,0,'set fresh $1'),/substitution|quotes/);
    assert.equal(calls.filter(call=>call.name==='canvas_event').length,2);
  }
});

test('Stop cancels queued text edits and settles already-admitted text without losing saved state',async()=>{
  let release;
  const c=createCanvasController({patch:{version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('message_box',1)],edges:[]},invoke:async(name)=>{
    if(name==='canvas_apply')return{revision:4};
    if(name==='canvas_message_text'){await new Promise(resolve=>release=resolve);return{serial:1};}
    return true;
  }});
  await c.prepare();const first=c.parameter(1,'text','admitted'),second=c.parameter(1,'text','cancelled');
  const stop=c.stop();assert.equal(await second,false);release();
  assert.equal(await first,true);await stop;await c.flush();
  assert.equal(c.getState().patch.nodes[0].params.text,'admitted');
});
