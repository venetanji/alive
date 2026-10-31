import assert from 'node:assert/strict';
import {test} from 'node:test';

test('save flush waits for the local barrier and suppresses a late acknowledgement after release',async()=>{
  const {createDocumentSession}=await import('./canvas-documents.mjs');const calls=[];let release;
  const session=createDocumentSession({getPatch:()=>({}),adopt:()=>{},beforeClose:()=>new Promise(resolve=>release=resolve),invoke:async(name,args)=>{calls.push({name,args});}});
  const request={owner:'main',token:9},flushing=session.flushBeforeSave(request);
  assert.deepEqual(calls,[]);assert.deepEqual(session.releaseSave(request),{requestLabel:'save/main',token:9,purpose:'save'});
  release();await flushing;assert.deepEqual(calls,[]);
  await session.flushBeforeSave(request);assert.deepEqual(calls,[]);
});
test('invalid save flush reports an error to the owner preflight',async()=>{
  const {createDocumentSession}=await import('./canvas-documents.mjs');const calls=[];
  const session=createDocumentSession({getPatch:()=>({}),adopt:()=>{},beforeClose:()=>{throw Error('invalid draft');},invoke:async(name,args)=>{calls.push({name,args});}});
  await session.flushBeforeSave({owner:'main',token:12});
  assert.deepEqual(calls,[{name:'document_save_flushed',args:{owner:'main',token:12,error:'invalid draft'}}]);
});
test('a lost release event reconciles and unfreezes the live save barrier',async()=>{
  const {createDocumentSession}=await import('./canvas-documents.mjs');const timers=[],released=[],calls=[];let active=true;
  const session=createDocumentSession({getPatch:()=>({}),adopt:()=>{},beforeClose:async()=>{},
    setTimer:fn=>{timers.push(fn);return timers.length;},clearTimer:()=>{},onSaveReleased:barrier=>released.push(barrier),
    invoke:async(name,args)=>{calls.push({name,args});return name==='document_save_barrier_active'?active:true;}});
  await session.flushBeforeSave({owner:'main',token:11});await timers.shift()();assert.deepEqual(released,[]);
  active=false;await timers.shift()();assert.deepEqual(released,[{requestLabel:'save/main',token:11,purpose:'save'}]);
  assert.equal(calls.filter(call=>call.name==='document_save_flushed').length,1);
  session.dispose();
});

const patch=()=>({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[],edges:[]});
async function setup(responses={}){
  const {createDocumentSession}=await import('./canvas-documents.mjs');
  const calls=[],titles=[],notices=[];let current=patch();
  const session=createDocumentSession({invoke:async(name,args)=>{calls.push({name,args});return typeof responses[name]==='function'?responses[name](args):responses[name];},
    getPatch:()=>current,adopt:value=>{current=value;},metadata:value=>titles.push(value),notice:value=>notices.push(value)});
  return{session,calls,titles,notices,get patch(){return current;},set patch(value){current=value;}};
}

test('native document boot adopts its patch before marking it clean and tracks undo back to the saved content',async()=>{
  const initial={...patch(),nodes:[{id:1,type:'bang',x:20,y:20,params:{}}]},p=await setup({document_current:{id:4,title:'Control.ultra',kind:'patch',patch:initial}});
  await p.session.ready();assert.deepEqual(p.patch,initial);assert.equal(p.session.dirty,false);
  p.patch={...initial,nodes:[]};await p.session.update();assert.equal(p.session.dirty,true);
  p.patch=initial;await p.session.update();assert.equal(p.session.dirty,false);
  assert.deepEqual(p.calls.filter(call=>call.name==='document_set_dirty').map(call=>call.args.dirty),[false,true,false]);
});

test('saving preserves edits made while the native dialog is pending and cancelled Save As stays dirty',async()=>{
  let finish;const p=await setup({document_current:{id:1,title:'Untitled',kind:'patch',patch:patch()},document_save:()=>new Promise(resolve=>finish=resolve)});
  await p.session.ready();p.patch={...patch(),nodes:[{id:1,type:'bang',x:20,y:20,params:{}}]};await p.session.update();
  const saving=p.session.save(true);await Promise.resolve();p.patch.nodes[0].x=40;await p.session.update();
  finish({id:1,title:'Saved.ultra',path:'/tmp/Saved.ultra',kind:'patch'});assert.equal(await saving,true);assert.equal(p.session.dirty,true);
  const cancelled=p.session.save(true);await Promise.resolve();finish(null);assert.equal(await cancelled,false);assert.equal(p.session.dirty,true);
});

test('opening and creating native documents never replace the invoking document',async()=>{
  const p=await setup({document_current:{id:1,title:'First',kind:'patch',patch:patch()},document_open:{id:2,title:'Second',kind:'patch'},document_new:{id:3,title:'Untitled',kind:'patch'}});
  await p.session.ready();const before=p.patch;await p.session.open('/tmp/second.ultra');await p.session.new();
  assert.equal(p.patch,before);assert.ok(p.calls.some(call=>call.name==='document_open'&&call.args.path==='/tmp/second.ultra'));
  assert.ok(p.calls.some(call=>call.name==='document_new'));
});

test('save-before-close confirms the close only after a successful save',async()=>{
  const p=await setup({document_current:{id:1,title:'First',kind:'patch',patch:patch()},document_save:null});await p.session.ready();
  await p.session.saveBeforeClose();assert.ok(!p.calls.some(call=>call.name==='document_close_confirmed'));
});

test('edits during a native save reassert native dirty after the save acknowledges clean',async()=>{
  const {createDocumentSession}=await import('./canvas-documents.mjs');let current=patch(),nativeDirty=false,finish,saved;
  const session=createDocumentSession({getPatch:()=>current,adopt:value=>{current=value;},invoke:async(name,args)=>{
    if(name==='document_current')return{id:1,title:'Untitled',kind:'patch',patch:patch()};
    if(name==='document_set_dirty'){nativeDirty=args.dirty;return true;}
    if(name==='document_save'){saved=args.patch;return new Promise(resolve=>finish=()=>{nativeDirty=false;resolve({id:1,title:'Saved.ultra',kind:'patch'});});}
  }});
  await session.ready();current={...patch(),nodes:[{id:1,type:'bang',x:20,y:20,params:{}}]};await session.update();
  const saving=session.save();await Promise.resolve();current.nodes[0].x=40;await session.update();finish();await saving;
  assert.equal(saved.nodes[0].x,20);assert.equal(session.dirty,true);assert.equal(nativeDirty,true);
});

test('Max source documents adopt an empty graph before showing compatibility analysis',async()=>{
  const p=await setup({document_current:{id:2,title:'Reference.maxhelp',kind:'patch',patch:null,source:'{"patcher":{}}'}});
  p.patch={...patch(),nodes:[{id:1,type:'metro',x:20,y:20,params:{}}]};assert.equal(await p.session.ready(),true);
  assert.deepEqual(p.patch.nodes,[]);assert.equal(p.session.dirty,false);
});

test('shared document boot adopts its native descriptor and uses the owner dirty baseline',async()=>{
  const {createDocumentSession}=await import('./canvas-documents.mjs');const calls=[];let adopted;
  const descriptor={id:0,label:'patch-view-1',ownerLabel:'main',viewPath:[2],title:'Owner.ultra',viewTitle:'basic',kind:'patch',shared:true,authoringRevision:4,runtimeRevision:1,dirty:true,patch:patch()};
  const session=createDocumentSession({invoke:async(name,args)=>{calls.push({name,args});if(name==='document_current')return descriptor;throw Error(name);},getPatch:patch,adopt:(value,metadata)=>{adopted={value,metadata};}});
  await session.ready();assert.equal(adopted.metadata?.ownerLabel,'main');assert.deepEqual(adopted.metadata?.viewPath,[2]);
  assert.equal(session.dirty,true);await session.update();assert.equal(session.dirty,true);
  assert.equal(calls.filter(call=>call.name==='document_set_dirty').length,0);
});

test('shared save flushes pending authoring before capturing the complete owner and accepts native dirty state',async()=>{
  const {createDocumentSession}=await import('./canvas-documents.mjs');let current=patch(),saved,flushed=false;
  const initial={id:0,label:'main',ownerLabel:'main',viewPath:[],title:'Owner.ultra',kind:'patch',shared:true,authoringRevision:1,runtimeRevision:1,dirty:false,patch:patch()};
  const session=createDocumentSession({invoke:async(name,args)=>{
    if(name==='document_current')return initial;
    if(name==='document_save'){assert.equal(flushed,true);saved=args.patch;return{...initial,authoringRevision:2,dirty:true};}
    throw Error(name);
  },getPatch:()=>current,adopt:value=>{current=value;},beforeSave:async()=>{flushed=true;current={...patch(),nodes:[{id:8,type:'bang',x:20,y:20,params:{}}]};}});
  await session.ready();assert.equal(await session.save(),true);assert.equal(saved.nodes[0].id,8);assert.equal(session.dirty,true);
});

test('owner descriptor broadcasts update all view metadata and ignore older authoring revisions',async()=>{
  const p=await setup({document_current:{id:0,label:'patch-view-1',ownerLabel:'main',viewPath:[2],shared:true,title:'Owner.ultra',kind:'patch',patch:patch(),authoringRevision:3,dirty:false}});
  await p.session.ready();p.session.acceptDescriptor({shared:true,label:'patch-view-1',ownerLabel:'main',authoringRevision:5,title:'Saved.ultra',dirty:true});
  p.session.acceptDescriptor({shared:true,label:'patch-view-1',ownerLabel:'main',authoringRevision:4,title:'Stale.ultra',dirty:false});
  assert.equal(p.session.document.title,'Saved.ultra');assert.equal(p.session.dirty,true);
});

test('native OS close acknowledges a view only after its queued authoring has flushed',async()=>{
  const {createDocumentSession}=await import('./canvas-documents.mjs');const calls=[];let finish;
  const session=createDocumentSession({getPatch:patch,adopt:()=>{},beforeSave:()=>new Promise(resolve=>{finish=resolve;}),
    invoke:async(name,args)=>{calls.push({name,args});return true;}});
  const closing=session.flushBeforeClose({requestLabel:'main',token:7});await Promise.resolve();
  assert.equal(calls.length,0);finish();await closing;
  assert.deepEqual(calls,[{name:'document_close_flushed',args:{requestLabel:'main',token:7}}]);
});

test('failed authoring flush cancels native close instead of leaving an unanswered request',async()=>{
  const {createDocumentSession}=await import('./canvas-documents.mjs');const calls=[];
  const session=createDocumentSession({getPatch:patch,adopt:()=>{},beforeSave:async()=>{throw Error('Admission unavailable');},
    invoke:async(name,args)=>{calls.push({name,args});return true;}});
  await assert.rejects(session.flushBeforeClose({requestLabel:'main',token:9}),/Admission unavailable/);
  assert.deepEqual(calls,[{name:'document_close_flushed',args:{requestLabel:'main',token:9,error:'Admission unavailable'}}]);
});

test('late responses cannot replace newer save metadata at the same authoring revision',async()=>{
  const initial={id:0,label:'main',ownerLabel:'main',shared:true,title:'Untitled',kind:'patch',patch:patch(),authoringRevision:3,runtimeRevision:5,descriptorRevision:8,dirty:true};
  const p=await setup({document_current:initial});await p.session.ready();
  assert.equal(p.session.acceptDescriptor({...initial,title:'Saved.ultra',dirty:false,descriptorRevision:9}),true);
  assert.equal(p.session.acceptDescriptor(initial),false);
  assert.equal(p.session.document.title,'Saved.ultra');assert.equal(p.session.dirty,false);
});

test('a cancelled close does not acknowledge its obsolete flush',async()=>{
  const {createDocumentSession}=await import('./canvas-documents.mjs');const calls=[];let release;
  const request={requestLabel:'main',token:5};
  const session=createDocumentSession({getPatch:patch,adopt:()=>{},beforeClose:()=>new Promise(resolve=>{release=resolve;}),
    invoke:async(name,args)=>{calls.push({name,args});return true;}});
  const closing=session.flushBeforeClose(request);
  session.cancelClose(request);release();await closing;
  assert.deepEqual(calls,[]);
});

test('a real shared-controller admission rejection sends a failed native close acknowledgement',async()=>{
  const {createSharedCanvasController}=await import('./canvas-shared.mjs');
  const {createDocumentSession}=await import('./canvas-documents.mjs');const calls=[];
  const descriptor={shared:true,id:0,label:'main',ownerLabel:'main',title:'Owner.ultra',kind:'patch',patch:{version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[{id:1,type:'number',x:20,y:20,params:{value:0}}],edges:[]},viewPath:[],authoringRevision:0,runtimeRevision:1};
  const invoke=async(name,args)=>{calls.push({name,args});if(name==='document_current')return descriptor;if(name==='document_commit')throw Error('Native canvas parameter was not admitted');return true;};
  const controller=createSharedCanvasController({invoke}),session=createDocumentSession({invoke,getPatch:()=>controller.getState().document,
    adopt:(_,value)=>controller.adoptDescriptor(value),beforeSave:()=>controller.flush(),beforeClose:request=>controller.flushBeforeClose(request)});
  await session.ready();controller.parameter(1,'value',42);
  await assert.rejects(session.flushBeforeClose({requestLabel:'main',token:6}),/not admitted/);
  assert.deepEqual(calls.find(call=>call.name==='document_close_flushed').args,{requestLabel:'main',token:6,error:'Native canvas parameter was not admitted'});
});


for(const failure of ['preflight','save','cancelled','dirty','confirmation'])test(`save-before-close cancels the native transaction on ${failure}`,async()=>{
  const {createDocumentSession}=await import('./canvas-documents.mjs');const calls=[];
  const initial={shared:true,ownerLabel:'main',label:'main',title:'Owner',patch:patch(),authoringRevision:1,dirty:true};
  const session=createDocumentSession({getPatch:patch,adopt:()=>{},
    beforeSave:async()=>{if(failure==='preflight')throw Error('preflight rejected');},
    invoke:async(name)=>{
      calls.push(name);
      if(name==='document_current')return initial;
      if(name==='document_save'){
        if(failure==='save')throw Error('save rejected');
        return failure==='cancelled'?null:{...initial,dirty:failure==='dirty'};
      }
      if(name==='document_close_confirmed')throw Error('confirmation rejected');
      return true;
    }});
  await session.ready();
  if(['preflight','save','confirmation'].includes(failure))await assert.rejects(session.saveBeforeClose(),/rejected/);
  else assert.equal(await session.saveBeforeClose(),false);
  assert.equal(calls.filter(name=>name==='document_cancel_close').length,1);
  assert.equal(calls.includes('document_close_confirmed'),failure==='confirmation');
});

test('successful save-before-close confirms once without cancelling the native transaction',async()=>{
  const initial={shared:true,ownerLabel:'main',label:'main',title:'Owner',patch:patch(),authoringRevision:1,dirty:true};
  const p=await setup({document_current:initial,document_save:{...initial,dirty:false},document_close_confirmed:true});
  await p.session.ready();assert.equal(await p.session.saveBeforeClose(),true);
  assert.equal(p.calls.filter(call=>call.name==='document_close_confirmed').length,1);
  assert.equal(p.calls.some(call=>call.name==='document_cancel_close'),false);
});


for(const accepted of [true,false])test(`save-before-close preserves the Quit generation when confirmation is ${accepted}`,async()=>{
  const initial={shared:true,ownerLabel:'main',label:'main',title:'Owner',patch:patch(),authoringRevision:1,dirty:true};
  const p=await setup({document_current:initial,document_save:{...initial,dirty:false},document_close_confirmed:accepted});
  await p.session.ready();assert.equal(await p.session.saveBeforeClose({quitToken:17}),accepted);
  assert.deepEqual(p.calls.find(call=>call.name==='document_close_confirmed').args,{quitToken:17});
  if(!accepted)assert.deepEqual(p.calls.find(call=>call.name==='document_cancel_close').args,{quitToken:17});
  else assert.equal(p.calls.some(call=>call.name==='document_cancel_close'),false);
});

test('save-before-close retains the Quit generation when frontend preflight fails',async()=>{
  const {createDocumentSession}=await import('./canvas-documents.mjs');const calls=[];
  const session=createDocumentSession({getPatch:patch,adopt:()=>{},beforeSave:async()=>{throw Error('flush failed');},
    invoke:async(name,args)=>{calls.push({name,args});return true;}});
  await assert.rejects(session.saveBeforeClose({quitToken:23}),/flush failed/);
  assert.deepEqual(calls,[{name:'document_cancel_close',args:{quitToken:23}}]);
});
