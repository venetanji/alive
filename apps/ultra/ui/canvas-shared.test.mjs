import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {CanvasDocument, makeNode, validatePatch} from './canvas-model.mjs';
import {lowerHierarchy} from './canvas-hierarchy.mjs';
import {createSharedCanvasController} from './canvas-shared.mjs';

const clone = value => structuredClone(value);
const tick = () => new Promise(resolve=>setImmediate(resolve));
const initial = () => ({version:2,profile:'ultra-patcher-v2',nodes:[
  makeNode('number',1),makeNode('number',2),
  {...makeNode('patcher',3),patcher:{nodes:[makeNode('number',4)],edges:[]}},
],edges:[]});

// This service owns the tree/history. Each controller gets only an IPC view of it.
function nativeService(start=initial()) {
  let patch=clone(start),authoringRevision=1,runtimeRevision=10,installed=false;
  const calls=[],past=[],future=[],listeners=new Map(),cursors=new Map(),records=[],hotEvents=[];
  const live=new Map([[1,0],[2,0],[4,92]]);
  let block=null,failAdmission=false;
  const descriptor=label=>({shared:true,label,ownerLabel:'owner',id:1,title:'Shared',
    viewTitle:label,viewPath:label==='child'?[3]:[],patch:clone(patch),
    authoringRevision,runtimeRevision,canUndo:past.length>0,canRedo:future.length>0});
  const broadcast=()=>{for(const [label,listener] of listeners)listener(descriptor(label));};
  return {
    calls,hotEvents,descriptor,listen:(label,listener)=>listeners.set(label,listener),
    get patch(){return clone(patch);},get revision(){return authoringRevision;},
    rejectNext(){failAdmission=true;},
    holdNextCommit(){let release;const promise=new Promise(resolve=>release=resolve);block=promise;return release;},
    log(record){records.push(record);},
    invoke:label=>async(name,args={})=>{
      calls.push({label,name,args:clone(args)});
      if(name==='document_current'){if(!installed){installed=true;calls.push({name:'install'});}return descriptor(label);}
      if(name==='document_commit'){
        if(block){const pending=block;block=null;await pending;}
        if(args.baseRevision!==authoringRevision)return {accepted:false,document:descriptor(label)};
        const next=validatePatch(args.patch);
        if(failAdmission){failAdmission=false;throw Error('native admission refused');}
        if(args.parameter){
          live.set(args.parameter.node,args.parameter.value);
          if(args.parameter.hot)hotEvents.push(clone(args.parameter));
        }
        if(JSON.stringify(next)===JSON.stringify(patch))return {accepted:true,document:descriptor(label)};
        if(args.history!==false){past.push(clone(patch));future.length=0;}
        const before=new CanvasDocument(patch),after=new CanvasDocument(next);
        const executable=p=>{const graph=lowerHierarchy(p);return JSON.stringify({nodes:graph.nodes.map(({id,type,params})=>({id,type,params})),edges:graph.edges});};
        if(executable(before.document)!==executable(after.document)&&!args.parameter)runtimeRevision++;
        patch=next;authoringRevision++;broadcast();return {accepted:true,document:descriptor(label)};
      }
      if(name==='document_history'){
        if(args.baseRevision!==authoringRevision)return {accepted:false,document:descriptor(label)};
        const from=args.direction==='undo'?past:future,to=args.direction==='undo'?future:past;
        if(from.length){to.push(clone(patch));patch=from.pop();authoringRevision++;runtimeRevision++;broadcast();}
        return {accepted:true,document:descriptor(label)};
      }
      if(name==='audio_status')return {running:false};
      if(name==='canvas_status'){
        const offset=cursors.get(label)||0;cursors.set(label,records.length);
        return {revision:runtimeRevision,active:true,nodes:[...live].map(([id,value])=>({id,value,pulses:2})),console:clone(records.slice(offset)),console_dropped:0};
      }
      if(name==='canvas_event'&&Array.isArray(args.value))live.set(args.node,args.value[0]);
      if(['canvas_apply','canvas_param'].includes(name))throw Error(`Forbidden shared operation ${name}`);
      return true;
    },
  };
}
async function views({broadcast=false,patch}={}) {
  const host=nativeService(patch);
  const owner=createSharedCanvasController({invoke:host.invoke('owner')});
  const child=createSharedCanvasController({invoke:host.invoke('child')});
  if(broadcast){host.listen('owner',owner.acceptDescriptor);host.listen('child',child.acceptDescriptor);}
  await owner.prepare();await child.prepare();return {host,owner,child};
}

test('shared controller is available',()=>assert.equal(typeof createSharedCanvasController,'function'));
test('shared root and child modes commit structurally while operands retain live admission',async()=>{
  const patch={version:2,profile:'ultra-patcher-v2',nodes:[makeNode('add',1,0,0,{rhs:2,numericmode:1}),
    {...makeNode('patcher',3),patcher:{nodes:[makeNode('modulo',4,0,0,{rhs:3,numericmode:1})],edges:[]}}],edges:[]};
  const {host,owner,child}=await views({broadcast:true,patch});
  const initialRevision=owner.getState().revision;
  owner.parameter(1,'numericmode',2);await owner.flush();
  assert.equal(owner.getState().revision,initialRevision+1);
  assert.equal(child.getState().document.nodes[0].params.numericmode,2);
  child.parameter(4,'numericmode',2);await child.flush();
  assert.equal(owner.getState().document.nodes[1].patcher.nodes[0].params.numericmode,2);
  assert.ok(host.calls.filter(c=>c.name==='document_commit').every(c=>!c.args.parameter));
  const revision=owner.getState().revision;
  owner.parameter(1,'rhs',2.5);await owner.flush();
  assert.equal(owner.getState().revision,revision);
  assert.deepEqual(host.calls.filter(c=>c.name==='document_commit').at(-1).args.parameter,{node:1,key:'rhs',value:2.5,hot:false});
  await owner.undo();await owner.flush();await owner.undo();await owner.flush();
  assert.equal(child.getState().patch.nodes[0].params.numericmode,1);
  await owner.redo();await owner.flush();assert.equal(child.getState().patch.nodes[0].params.numericmode,2);
});
test('opening root and child adopts one owner graph and child scope without resetting it',async()=>{
  const {host,owner,child}=await views();
  assert.equal(host.calls.filter(call=>call.name==='install').length,1);
  assert.deepEqual(child.getState().path,[3]);assert.equal(child.getState().patch.nodes[0].id,4);
  assert.deepEqual(child.getState().document,owner.getState().document);
  await child.prepare();assert.equal(host.calls.filter(call=>call.name==='document_current').length,2);
  assert.equal(host.calls.some(call=>call.name==='canvas_apply'),false);
});
test('optimistic edits serialize and stale disjoint edits rebase without overwriting the owner',async()=>{
  const {host,owner,child}=await views();
  owner.move(1,120,140);child.move(4,200,220);
  assert.equal(child.getState().patch.nodes[0].x,200);
  await Promise.all([owner.flush(),child.flush()]);
  assert.equal(host.patch.nodes[0].x,120);assert.equal(host.patch.nodes[2].patcher.nodes[0].x,200);
  const commits=host.calls.filter(call=>call.name==='document_commit');
  assert.ok(commits.some(call=>call.args.baseRevision===1));assert.equal(host.revision,3);
});
test('simultaneous changes to one field retain the canonical tree and report conflict',async()=>{
  const {host,owner,child}=await views();child.reveal(1);
  owner.move(1,100,100);await owner.flush();child.move(1,200,200);await child.flush();
  assert.equal(host.patch.nodes[0].x,100);assert.equal(child.getState().document.nodes[0].x,100);
  assert.match(child.getState().notice,/conflict/i);
});
test('broadcasts during admission preserve later local edits and ignore older descriptors',async()=>{
  const {host,owner,child}=await views({broadcast:true});
  const old=host.descriptor('child'),release=host.holdNextCommit();
  child.move(4,250,250);await tick();child.parameter(4,'value',27);
  owner.move(1,180,180);await owner.flush();release();await child.flush();
  assert.equal(host.patch.nodes[0].x,180);assert.equal(host.patch.nodes[2].patcher.nodes[0].x,250);
  assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,27);
  child.acceptDescriptor(old);assert.equal(child.getState().document.nodes[0].x,180);
});
test('numeric hot edits use one native admission and queued events wait for admission',async()=>{
  const {host,child}=await views();const release=host.holdNextCommit();
  child.parameter(4,'value',70);const event=child.event(4,0,[12]);await tick();
  assert.equal(host.calls.some(call=>call.name==='canvas_event'),false);
  release();await event;await child.flush();
  const commit=host.calls.find(call=>call.name==='document_commit');
  assert.deepEqual(commit.args.parameter,{node:4,key:'value',value:70,hot:true});
  assert.equal(host.calls.filter(call=>call.name==='document_commit').length,1);
  assert.ok(host.calls.findIndex(call=>call.name==='document_commit')<host.calls.findIndex(call=>call.name==='canvas_event'));
  assert.equal(host.calls.find(call=>call.name==='canvas_event').args.revision,10);
});
test('native owner history includes edits from another child and continuous history groups',async()=>{
  const {host,owner,child}=await views({broadcast:true});
  child.parameter(4,'value',20);child.parameter(4,'value',21,{history:false});await child.flush();
  await owner.undo();assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,0);
  await child.redo();assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,21);
  assert.equal(host.calls.filter(call=>call.name==='document_history').length,2);
});
test('admission rejection restores the authoritative root and cancels dependent events',async()=>{
  const {host,child}=await views();host.rejectNext();child.parameter(4,'value',77);
  const event=child.event(4);await child.flush();await event;
  assert.equal(child.getState().patch.nodes[0].params.value,0);assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,0);
  assert.match(child.getState().notice,/admission refused/);assert.equal(host.calls.some(call=>call.name==='canvas_event'),false);
});
test('flush returns canonical descriptor for whole-owner save and layout preserves runtime revision',async()=>{
  const {host,child}=await views();child.move(4,90,100);const descriptor=await child.flush();
  assert.deepEqual(descriptor.patch,host.patch);assert.equal(descriptor.runtimeRevision,10);
  assert.equal(descriptor.authoringRevision,2);assert.equal(child.getState().revision,10);
});
test('observations cover descendants and each view retains its own native console cursor',async()=>{
  const {host,owner,child}=await views();host.log({node:4,message:'hello'});
  await owner.poll();await child.poll();
  assert.equal(owner.getState().observations[4].value,92);assert.equal(child.getState().console.length,1);
  owner.clearConsole();await owner.poll();assert.equal(owner.getState().console.length,0);
  assert.equal(child.getState().console.length,1);
});
test('recursive model validation is atomic and detach never stops the owner graph',async()=>{
  const {host,child}=await views();const before=child.getState().document;
  assert.throws(()=>child.parameter(4,'value',Infinity));assert.deepEqual(child.getState().document,before);
  child.move(4,80,90);await child.dispose();await child.disposeDocument();
  assert.equal(host.patch.nodes[2].patcher.nodes[0].x,80);
  assert.equal(host.calls.some(call=>['canvas_stop','audio_stop','canvas_apply'].includes(call.name)),false);
  assert.equal(child.getState().ready,false);
});
test('structural child edits publish a fresh runtime revision before events and never reinstall through legacy IPC',async()=>{
  const {host,child}=await views();
  const id=child.add('bang',10,10);const event=child.event(id);await child.flush();await event;
  assert.equal(host.patch.nodes[2].patcher.nodes.at(-1).id,id);
  assert.equal(child.getState().revision,11);
  assert.equal(host.calls.find(call=>call.name==='canvas_event').args.revision,11);
  assert.equal(host.calls.some(call=>call.name==='canvas_apply'),false);
});
test('simultaneous additions cannot overwrite the other view when both allocate the same ID',async()=>{
  const {host,owner,child}=await views();
  owner.add('bang',100,100);child.add('number',200,200);
  await Promise.all([owner.flush(),child.flush()]);
  assert.equal(host.patch.nodes.at(-1).type,'bang');
  assert.equal(host.patch.nodes[2].patcher.nodes.length,1);
  assert.match(child.getState().notice,/conflict/i);
});
test('a stale owner undo retains newer native changes and asks the caller to try again',async()=>{
  const {host,owner,child}=await views();
  child.parameter(4,'value',53);await child.flush();await owner.undo();
  assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,53);
  assert.match(owner.getState().notice,/history changed/i);
  await owner.undo();assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,0);
});
test('same-node edits to independent fields rebase and history remains native',async()=>{
  const {host,owner,child}=await views();child.reveal(1);
  owner.move(1,300,310);child.parameter(1,'value',35);
  await Promise.all([owner.flush(),child.flush()]);
  assert.equal(host.patch.nodes[0].x,300);assert.equal(host.patch.nodes[0].params.value,35);
  assert.equal(host.calls.some(call=>call.name==='canvas_param'),false);
});
test('hot numeric admission restores a live value to unchanged saved state exactly once',async()=>{
  const {host,child}=await views();const saved=host.patch,revision=host.revision;
  await child.event(4,0,[19]);await child.poll();
  assert.equal(child.getState().observations[4].value,19);
  const before=host.calls.length;
  child.parameter(4,'value',0);await child.flush();await child.poll();
  assert.equal(child.getState().observations[4].value,0);
  assert.deepEqual(host.patch,saved);assert.equal(host.revision,revision);
  assert.deepEqual(host.hotEvents,[{node:4,key:'value',value:0,hot:true}]);
  assert.equal(host.calls.slice(before).filter(call=>call.name==='document_commit').length,1);
  assert.equal(host.calls.slice(before).some(call=>['canvas_apply','canvas_param','canvas_event'].includes(call.name)),false);
});
test('whole-document loads keep a surviving native child view anchored to its descriptor path',async()=>{
  const {host,child}=await views();
  child.load(child.export());assert.deepEqual(child.getState().path,[3]);
  const replacement=host.patch;replacement.nodes[2].patcher.nodes[0].x=345;
  child.load(replacement);assert.deepEqual(child.getState().path,[3]);
  assert.equal(child.getState().patch.nodes[0].x,345);
  await child.flush();assert.deepEqual(child.getState().path,[3]);
});
test('native descriptors restore their view path after local navigation and repair removed paths',async()=>{
  const {host,child}=await views();
  child.leave(0);assert.deepEqual(child.getState().path,[]);
  child.acceptDescriptor(host.descriptor('child'));assert.deepEqual(child.getState().path,[3]);
  const replacement=host.patch;replacement.nodes=replacement.nodes.filter(node=>node.id!==3);
  child.load(replacement);assert.deepEqual(child.getState().path,[]);
  await child.flush();assert.deepEqual(child.getState().path,[]);
});

test('late descriptors cannot regress a runtime reapply at the same authoring revision',async()=>{
  const {host,child}=await views(),old=host.descriptor('child');
  child.acceptDescriptor({...old,runtimeRevision:11,descriptorRevision:3});
  assert.equal(child.acceptDescriptor({...old,descriptorRevision:2}),false);
  assert.equal(child.getState().revision,11);
  await child.event(4);await child.flush();
  assert.equal(host.calls.find(call=>call.name==='canvas_event').args.revision,11);
});

test('close flush reports a real pending admission failure and allows retry after cancellation',async()=>{
  const {host,child}=await views();host.rejectNext();child.parameter(4,'value',42);
  const request={requestLabel:'owner',token:1};
  await assert.rejects(child.flushBeforeClose(request),/native admission refused/);
  assert.equal(child.getState().closing,true);
  child.cancelClose(request);assert.equal(child.getState().closing,false);
  child.parameter(4,'value',43);await child.flush();
  assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,43);
  await child.flushBeforeClose({...request,token:2});
});

test('an acknowledged view blocks new authoring until every matching close barrier releases',async()=>{
  const {host,child}=await views(),first={requestLabel:'owner',token:2},second={requestLabel:'child',token:3};
  child.parameter(4,'value',12);await child.flushBeforeClose(first);await child.flushBeforeClose(second);
  assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,12);
  assert.equal(child.getState().ready,false);assert.throws(()=>child.move(4,200,200),/clos/i);
  assert.equal(await child.event(4),false);assert.equal(await child.undo(),false);
  child.cancelClose({...first,token:1});assert.equal(child.getState().closing,true);
  child.cancelClose(first);assert.equal(child.getState().closing,true);
  child.cancelClose(second);assert.equal(child.getState().closing,false);
  child.move(4,200,200);await child.flush();assert.equal(host.patch.nodes[2].patcher.nodes[0].x,200);
});

test('a pending undo rejected by owner CAS cancels the close flush',async()=>{
  const {owner,child}=await views();child.parameter(4,'value',23);await child.flush();
  const undo=owner.undo();
  await assert.rejects(owner.flushBeforeClose({requestLabel:'owner',token:8}),/History changed/);
  assert.equal(await undo,false);
});

const helpShell=()=>JSON.parse(readFileSync(new URL('../tests/fixtures/help-shell-schema.json',import.meta.url),'utf8'))[0].patch;
test('help root hosts Basic locally while a real Basic child keeps its native binding',async()=>{
  const {host,owner,child}=await views({patch:helpShell(),broadcast:true});
  assert.deepEqual(owner.getState().path,[3]);assert.deepEqual(owner.getState().boundPath,[]);
  assert.deepEqual(child.getState().path,[3]);assert.deepEqual(child.getState().boundPath,[3]);
  assert.equal(owner.getState().hostingHelp,true);assert.equal(child.getState().hostingHelp,false);
  assert.deepEqual(owner.getState().helpShell,helpShell().helpShell);
  assert.notEqual(owner.getState().helpIdentity,child.getState().helpIdentity);
  const before=clone(host.calls),revision=owner.getState().revision,identity=owner.getState().helpIdentity;
  owner.leave(0);assert.equal(owner.hostHelpBasic(),true);assert.equal(child.hostHelpBasic(),false);
  owner.reveal(7);assert.deepEqual(owner.getState().path,[3]);assert.deepEqual(host.calls,before);
  assert.equal(owner.getState().revision,revision);assert.equal(owner.getState().helpIdentity,identity);
  assert.deepEqual(JSON.parse(owner.export()),validatePatch(host.patch));
});
test('help hosting survives optimistic edits CAS publications save descriptors and rejected edit recovery',async()=>{
  const {host,owner,child}=await views({patch:helpShell(),broadcast:true});const identity=owner.getState().helpIdentity;
  owner.move(7,220,230);await owner.flush();assert.deepEqual(owner.getState().path,[3]);
  child.move(8,330,340);await child.flush();assert.deepEqual(owner.getState().path,[3]);
  owner.acceptDescriptor({...host.descriptor('owner'),dirty:false,descriptorRevision:12});
  assert.deepEqual(owner.getState().path,[3]);assert.equal(owner.getState().helpIdentity,identity);
  host.rejectNext();owner.move(7,999,999);await owner.flush();
  assert.deepEqual(owner.getState().path,[3]);assert.equal(owner.getState().patch.nodes.find(node=>node.id===7).x,220);
  assert.equal(owner.getState().helpIdentity,identity);
});
test('shell import into adopted owner and history reconcile identity and restore local Basic',async()=>{
  const {host,owner}=await views({broadcast:true});assert.equal(owner.getState().helpIdentity,null);
  owner.load(helpShell());assert.deepEqual(owner.getState().path,[3]);await owner.flush();
  const identity=owner.getState().helpIdentity;assert.equal(typeof identity,'string');
  owner.load(owner.export());assert.deepEqual(owner.getState().path,[3]);
  await owner.undo();await owner.flush();assert.equal(owner.getState().helpShell,null);assert.deepEqual(owner.getState().path,[]);
  await owner.redo();await owner.flush();assert.equal(owner.getState().helpIdentity,identity);assert.deepEqual(owner.getState().path,[3]);
  const changed=helpShell();changed.helpShell.object='prepend';owner.load(changed);await owner.flush();
  assert.notEqual(owner.getState().helpIdentity,identity);assert.deepEqual(owner.getState().path,[3]);
  assert.equal(host.calls.some(call=>call.name==='canvas_apply'||call.name==='canvas_stop'),false);
});
test('pending shell import keeps hosting across older publications and rejected import restores ordinary state',async()=>{
  const {host,owner}=await views({broadcast:true});const release=host.holdNextCommit();
  owner.load(helpShell());await tick();owner.acceptDescriptor(host.descriptor('owner'));
  assert.deepEqual(owner.getState().path,[3]);assert.equal(owner.getState().hostingHelp,true);
  release();await owner.flush();assert.deepEqual(owner.getState().path,[3]);
  const ordinary=initial();owner.load(ordinary);await owner.flush();host.rejectNext();owner.load(helpShell());await owner.flush();
  assert.equal(owner.getState().helpIdentity,null);assert.equal(owner.getState().hostingHelp,false);assert.deepEqual(owner.getState().path,[]);
});
test('local Basic navigation preserves numeric Message and Print observations and independent views',async()=>{
  const host=nativeService(helpShell());const invoke=host.invoke('owner');
  const owner=createSharedCanvasController({invoke:async(name,args)=>{
    const result=await invoke(name,args);if(name!=='canvas_status')return result;
    return {...result,nodes:[{id:7,value:42,pulses:3}],
      message_boxes:{revision:10,text_edit_serial:0,nodes:[{id:7,generation:2,empty:false,text:'42'}]},
      print_popups:{revision:10,frame:4800,nodes:[{id:8,generation:2,frame:4800,enabled:true,has_value:true,text:'42'}]}};
  }});
  const child=createSharedCanvasController({invoke:host.invoke('child')});await owner.prepare();await child.prepare();await owner.poll();
  const before=owner.getState(),calls=clone(host.calls);owner.leave(0);owner.hostHelpBasic();owner.reveal(7);
  const after=owner.getState();assert.deepEqual(after.observations,before.observations);assert.deepEqual(after.messageBoxes,before.messageBoxes);assert.deepEqual(after.printPopups,before.printPopups);
  assert.deepEqual(host.calls,calls);assert.deepEqual(child.getState().path,[3]);assert.equal(after.revision,before.revision);
});


test('Panic then global Stop Audio recovers even when scoped stop rejects the fault state',async()=>{
  const host=nativeService();const native=host.invoke('owner');let panic=false,running=true;
  const controller=createSharedCanvasController({invoke:async(name,args)=>{
    if(name==='audio_panic')panic=true;
    if(name==='canvas_stop'&&panic)throw Error('fault state');
    if(name==='audio_stop'){running=false;panic=false;}
    return native(name,args);
  }});
  await controller.prepare();await controller.panic();assert.equal(controller.getState().faulted,true);
  assert.equal(await controller.stopAudio(),true);assert.equal(running,false);
  assert.equal(controller.getState().faulted,false);assert.equal(controller.getState().ready,true);
  assert.equal(host.calls.filter(call=>call.name==='audio_stop').length,1);
});

test('continuous edits retain bounded snapshots and their native undo boundary',async()=>{
  const {host,child}=await views();const release=host.holdNextCommit();
  child.parameter(4,'value',1);await tick();
  child.parameter(4,'value',2);
  for(let value=3;value<=1000;value++)child.parameter(4,'value',value,{history:false});
  assert.equal(child.getState().desiredRevision-child.getState().activeDocumentRevision,2);
  release();await child.flush();
  assert.equal(host.calls.filter(call=>call.name==='document_commit').length,2);
  assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,1000);
  await child.undo();assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,1);
  await child.undo();assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,0);
});

test('coalescing cannot cross an event or discrete undo boundary and backlog rejects atomically',async()=>{
  const {host,child}=await views();const release=host.holdNextCommit();
  child.parameter(4,'value',1);await tick();
  child.parameter(4,'value',2,{history:false});const event=child.event(4,0,[9]);
  child.parameter(4,'value',3,{history:false});
  for(let value=4;value<=64;value++)child.parameter(4,'value',value);
  assert.throws(()=>child.parameter(4,'value',65),/Edit queue full/);
  assert.equal(child.getState().patch.nodes[0].params.value,64);
  release();await event;await child.flush();
  const relevant=host.calls.filter(call=>['document_commit','canvas_event'].includes(call.name));
  assert.deepEqual(relevant.slice(0,4).map(call=>call.name),['document_commit','document_commit','canvas_event','document_commit']);
  assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,64);
});

test('Stop and Panic run immediately after in-flight admission ahead of queued edits in request order',async()=>{
  const {host,child}=await views();const release=host.holdNextCommit();
  child.parameter(4,'value',1);await tick();child.parameter(4,'value',2);
  const event=child.event(4,0,[9]),start=child.startAudio(),panic=child.panic(),stop=child.stopAudio();
  release();await Promise.all([panic,stop,event,start]);await child.flush();
  const names=host.calls.filter(call=>['document_commit','canvas_event','audio_panic','canvas_stop','audio_stop'].includes(call.name)).map(call=>call.name);
  assert.deepEqual(names,['document_commit','audio_panic','canvas_stop','audio_stop','document_commit']);
  assert.equal(host.calls.some(call=>call.name==='audio_start'),false);
  assert.deepEqual(host.hotEvents.map(event=>event.value),[1]);
  assert.equal(host.patch.nodes[2].patcher.nodes[0].params.value,2);
});
