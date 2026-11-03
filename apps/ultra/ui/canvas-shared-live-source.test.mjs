import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CanvasDocument, makeNode, parsePatch, serializePatch, validatePatch} from './canvas-model.mjs';
import {HIERARCHY_LIMITS, lowerHierarchy} from './canvas-hierarchy.mjs';
import {createSharedCanvasController} from './canvas-shared.mjs';
import {createLiveDeviceState, liveDeviceCatalog} from './live-device-profile.mjs';
import {planAnalogCurrentParameters} from './live-profiles/analog/parameter-mapping.mjs';
import {analogDescriptors} from './live-profiles/analog/facts.mjs';

const clone = value => structuredClone(value);
const tick = () => new Promise(resolve=>setImmediate(resolve));
const state = () => {
  const source=createLiveDeviceState();
  for(const [index,value] of [[87,0],[99,0],[170,0],[182,0],[194,12.1],[6,0],[80,0],[163,0],[30,2],[31,0]])source.values[index]=value;
  return source;
};
const initial = () => ({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[
  {...makeNode('live_device',1),params:{device:'Analog',state:state()}},
  {...makeNode('live_device',2),params:{device:'Analog',state:state()}},makeNode('number',3,0,0),
],edges:[]});

// Only the IPC/native boundary is simulated. State-only commits retain runtime,
// preserve JSON numbers, and CAS/scope checks precede admission and history.
function service(start=initial()) {
  let patch=clone(start),authoringRevision=1,runtimeRevision=10,descriptorRevision=1;
  let hold=null,mode=null,readsFail=false;
  const calls=[],past=[],future=[],listeners=[];
  const descriptor=()=>({shared:true,label:'owner',ownerLabel:'owner',id:1,title:'Shared',
    viewPath:[],patch:clone(patch),authoringRevision,runtimeRevision,descriptorRevision,
    canUndo:past.length>0,canRedo:future.length>0,parameterPreviews:[]});
  const publish=()=>{descriptorRevision++;for(const listener of listeners)listener(descriptor());};
  return {
    calls,past,descriptor,listen:listener=>listeners.push(listener),
    get patch(){return clone(patch);},
    hold(){let release;hold=new Promise(resolve=>release=resolve);return release;},
    fail(next){mode=next;},failReads(value=true){readsFail=value;},
    replace(next,{runtime=false,broadcast=true}={}){patch=clone(next);authoringRevision++;if(runtime)runtimeRevision++;if(broadcast)publish();},
    reapply(){runtimeRevision++;publish();},
    invoke:async(name,args={})=>{
      calls.push({name,args:clone(args)});
      if(name==='document_current'){if(readsFail)throw Error('canonical read unavailable');return descriptor();}
      if(name==='document_commit'){
        if(hold){const pending=hold;hold=null;await pending;}
        if(args.baseRevision!==authoringRevision||args.expectedScope&&
          (args.expectedScope.ownerLabel!=='owner'||args.expectedScope.runtimeRevision!==runtimeRevision))
          return {accepted:false,document:descriptor()};
        new CanvasDocument(args.patch);
        if(mode==='reject'){mode=null;throw Error('native admission refused');}
        if(JSON.stringify(patch)!==JSON.stringify(args.patch)){
          if(args.history!==false)past.push(clone(patch));future.length=0;
          patch=clone(args.patch);authoringRevision++;publish();
        }
        if(mode==='throw'){mode=null;throw Error('accepted reply lost');}
        if(mode==='malformed'){mode=null;return {accepted:true};}
        if(mode==='unordered'){mode=null;return {accepted:true,document:{...descriptor(),descriptorRevision:0}};}
        return {accepted:true,document:descriptor()};
      }
      if(name==='document_history'){
        const from=args.direction==='undo'?past:future,to=args.direction==='undo' ? future:past;
        if(from.length){to.push(clone(patch));patch=from.pop();authoringRevision++;publish();}
        return {accepted:true,document:descriptor()};
      }
      if(name==='audio_status')return {running:true};
      if(name==='canvas_status')return {revision:runtimeRevision,active:true,nodes:[]};
      if(name==='audio_panic')return true;
      throw Error(`Unexpected IPC ${name}`);
    },
  };
}
async function setup({broadcast=true,patch}={}) {
  const host=service(patch),a=createSharedCanvasController({invoke:host.invoke}),b=createSharedCanvasController({invoke:host.invoke});
  if(broadcast){host.listen(a.acceptDescriptor);host.listen(b.acceptDescriptor);}
  assert.equal(await a.prepare(),true,a.getState().notice);
  assert.equal(await b.prepare(),true,b.getState().notice);return {host,a,b};
}
function request(controller,index=26,value=.875,node=1) {
  const read=controller.readLiveSource(node);
  assert.equal(read.available,true);
  const nextState=clone(read.expected.state);nextState.values[index]=value;
  return {expected:read.expected,nextState};
}
const writes=host=>host.calls.filter(call=>call.name==='document_commit');

test('complete source commits stay non-optimistic and preserve both raw native states',async()=>{
  const {host,a}=await setup(),original=host.patch,req=request(a),release=host.hold();
  const pending=a.commitLiveSource(req);await tick();
  assert.equal(a.readLiveSource(1).expected.state.values[26],.5);
  assert.equal(a.getState().busy,true);assert.equal(host.past.length,0);
  a.move(3,120,140);release();
  const result=await pending;await a.flush();
  assert.equal(result.outcome,'accepted');assert.deepEqual(result.native,{status:'unobserved'});
  assert.equal(result.canonical.source.state.values[194],12.1);
  assert.equal(host.patch.nodes[0].params.state.values[26],.875);
  assert.equal(host.patch.nodes[2].x,120);
  assert.deepEqual(host.patch.nodes[1].params.state,original.nodes[1].params.state);
  for(const index of [87,99,170,182,194,6,80,163,30,31])assert.equal(host.patch.nodes[0].params.state.values[index],original.nodes[0].params.state.values[index]);
  assert.deepEqual(Object.keys(writes(host)[0].args).sort(),['baseRevision','expectedScope','history','patch']);
  assert.deepEqual(writes(host)[0].args.expectedScope,{ownerLabel:'owner',runtimeRevision:10});
  assert.equal(host.past.length,2);
  req.nextState.values[194]=99;result.canonical.source.state.values[194]=99;
  assert.equal(a.readLiveSource(1).expected.state.values[194],12.1);
});

test('linked views refuse the entire stale source even if next equals canonical',async()=>{
  const {host,a,b}=await setup(),stale=request(b,27,.3),same=request(b);
  await a.commitLiveSource(request(a));
  assert.equal((await b.commitLiveSource(stale)).outcome,'conflict');
  assert.equal((await b.commitLiveSource(same)).outcome,'conflict');
  assert.equal(writes(host).length,1);assert.equal(host.past.length,1);
});

test('CAS retries preserve disjoint edits and refuse a source changed during IPC',async()=>{
  for(const sourceChanges of [false,true]){
    const {host,a,b}=await setup({broadcast:false}),req=request(a),release=host.hold();
    const pending=a.commitLiveSource(req);await tick();
    if(sourceChanges)await b.commitLiveSource(request(b,27,.3));
    else {b.move(3,230,240);await b.flush();}
    release();const result=await pending;
    assert.equal(result.outcome,sourceChanges?'conflict':'accepted');
    assert.equal(host.patch.nodes[2].x,sourceChanges?0:230);
    assert.equal(writes(host).length,sourceChanges?2:3);
  }
});

test('runtime reapply between frontend check and locked commit cannot retarget',async()=>{
  const {host,a}=await setup({broadcast:false}),release=host.hold();
  const pending=a.commitLiveSource(request(a));await tick();host.reapply();release();
  const result=await pending;
  assert.equal(result.outcome,'conflict');assert.equal(result.canonical.runtimeRevision,11);
  assert.equal(host.past.length,0);assert.equal(writes(host).length,1);
});

test('current mapping overlays exact raw state in one complete history transaction',async()=>{
  const {host,a}=await setup();
  for(const [key,value,want] of [
    ['NoiseBalance',0,[[26,1]]],['NoiseBalance',1,[[26,0]]],['NoiseBalance',.125,[[26,.875]]],
    ['SignalChain1.OscillatorEnvAmount',-.75,[[39,.75],[40,1]]],
    ['SignalChain1.OscillatorEnvAmount',0,[[39,0],[40,0]]],
    ['SignalChain1.OscillatorEnvAmount',.75,[[39,.75],[40,0]]],
  ]){
    const {expected}=a.readLiveSource(1),nextState=clone(expected.state);
    const plan=planAnalogCurrentParameters(new Map([[key,value]]),liveDeviceCatalog(expected.state));
    assert.deepEqual(plan.updates,want.map(([index,value])=>({index,value})));
    for(const update of plan.updates)nextState.values[update.index]=update.value;
    const before=host.past.length,result=await a.commitLiveSource({expected,nextState});
    assert.equal(result.outcome,'accepted');assert.equal(host.past.length,before+1);
    assert.equal(writes(host).at(-1).args.patch.nodes[0].params.state.values.length,203);
    assert.equal(host.patch.nodes[0].params.state.values[194],12.1);
  }
});

test('same complete state is unchanged independent of field insertion order',async()=>{
  const {host,a}=await setup(),{expected}=a.readLiveSource(1);
  const nextState=Object.fromEntries(Object.entries(expected.state).reverse());
  assert.equal((await a.commitLiveSource({expected,nextState})).outcome,'unchanged');
  assert.equal(writes(host).length,0);assert.equal(host.past.length,0);
});

test('malformed, partial and identity-changing states refuse before IPC',async()=>{
  const {host,a}=await setup();
  const invalid=[
    s=>delete s.values,s=>s.extra=true,s=>delete s.values[1],s=>s.values[1]=undefined,
    s=>s.values[1]=NaN,s=>s.values[1]=Infinity,s=>s.values[0]=.5,s=>s.values[26]=2,
    s=>s.version=2,s=>s.profile='foreign',s=>s.dllSha256='0'.repeat(64),
    s=>{s.guiSha256='75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f';s.graphicsSha256='ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d';},
    s=>Object.setPrototypeOf(s,{inherited:true}),
  ];
  for(const mutate of invalid){
    const req=request(a);mutate(req.nextState);
    assert.equal((await a.commitLiveSource(req)).outcome,'rejected');
  }
  const req=request(a);delete req.expected.state.values[1];
  assert.equal((await a.commitLiveSource(req)).outcome,'rejected');
  assert.equal(writes(host).length,0);
});

test('source arrays reject serialization hooks that could replace validated values',async()=>{
  const {host,a}=await setup(),req=request(a);
  req.nextState.values.toJSON=()=>state().values;
  assert.equal((await a.commitLiveSource(req)).outcome,'rejected');
  assert.equal(writes(host).length,0);
});

test('extra array properties cannot disguise a missing own native index',async()=>{
  const {host,a}=await setup(),req=request(a);delete req.nextState.values[1];req.nextState.values.extra=true;
  assert.equal((await a.commitLiveSource(req)).outcome,'rejected');assert.equal(writes(host).length,0);
});

test('huge sparse native arrays refuse before any index traversal',async()=>{
  const {host,a}=await setup(),req=request(a);
  req.nextState.values=new Proxy(new Array(4294967295),{
    get(target,key){if(/^\d+$/.test(String(key)))assert.fail('oversized arrays must not read native indices');return Reflect.get(target,key);},
    ownKeys(){assert.fail('oversized arrays must not enumerate native indices');},
  });
  assert.equal((await a.commitLiveSource(req)).outcome,'rejected');assert.equal(writes(host).length,0);
});

test('older admitted resource pairs remain exact on source and unrelated generic commits',async()=>{
  const patch=initial();
  for(const node of patch.nodes.filter(node=>node.type==='live_device')){
    node.params.state.guiSha256='75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f';
    node.params.state.graphicsSha256='ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d';
  }
  const {host,a}=await setup({patch});
  a.move(3,100,100);await a.flush();
  assert.deepEqual(host.patch.nodes[0].params.state,patch.nodes[0].params.state);
  assert.equal((await a.commitLiveSource(request(a))).outcome,'accepted');
  assert.deepEqual(host.patch.nodes[1].params.state,patch.nodes[1].params.state);
});

test('unrelated generic preservation never overrides an intentional source edit',async()=>{
  const {host,a}=await setup();
  const edited=clone(a.getState().document.nodes[0].params.state);edited.values[26]=.25;
  a.deviceParameter(1,'state',edited);await a.flush();
  assert.equal(host.patch.nodes[0].params.state.values[26],.25);
});

test('source unavailable states do not prepare or install as a side effect',async()=>{
  const host=service(),a=createSharedCanvasController({invoke:host.invoke});
  assert.equal(a.readLiveSource(1).available,false);assert.equal(host.calls.length,0);
  assert.equal((await a.commitLiveSource({})).outcome,'unavailable');assert.equal(host.calls.length,0);
  await a.prepare();assert.equal(a.readLiveSource(3).available,false);
  await a.panic();assert.equal(a.readLiveSource(1).available,false);
});

test('no-adapter and unprepared native owners remain explicitly unavailable',async()=>{
  for(const reply of ['no-adapter','unprepared']){
    let reads=0;
    const a=createSharedCanvasController({invoke:async name=>{
      assert.equal(name,'document_current');reads++;
      if(reply==='no-adapter')throw Error('Native Live device adapter is not enabled.');
      return {...service().descriptor(),runtimeRevision:0};
    }});
    assert.equal(await a.prepare(),false);
    assert.equal(a.readLiveSource(1).available,false);
    assert.equal((await a.commitLiveSource({})).outcome,'unavailable');assert.equal(reads,1);
  }
});

test('source snapshots and caller-owned preview or canceled drafts never write',async()=>{
  const {host,a}=await setup(),read=a.readLiveSource(1),before=host.calls.length;
  read.expected.state.values[194]=42;
  const preview=clone(read.expected.state);preview.values[26]=.125;
  assert.equal(a.readLiveSource(1).expected.state.values[194],12.1);
  assert.equal(host.calls.length,before);assert.equal(host.past.length,0);
});

test('replaced, deleted and foreign expected sources never retarget',async()=>{
  for(const change of ['deleted','replaced','identity','owner','runtime']){
    const {host,a}=await setup(),req=request(a),next=host.patch;
    if(change==='owner')req.expected.ownerLabel='foreign';
    else if(change==='runtime')req.expected.runtimeRevision=9;
    else {
      if(change==='deleted')next.nodes.shift();
      if(change==='replaced')next.nodes[0]=makeNode('number',1);
      if(change==='identity'){
        next.nodes[0].params.state.guiSha256='75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f';
        next.nodes[0].params.state.graphicsSha256='ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d';
      }
      host.replace(next);
    }
    assert.equal((await a.commitLiveSource(req)).outcome,'conflict');assert.equal(writes(host).length,0);
  }
});

test('ambiguous source replies reconcile canonical state and retain later unrelated edits',async()=>{
  for(const failure of ['throw','malformed','unordered','reject']){
    const {host,a}=await setup({broadcast:false}),req=request(a),draft=clone(req.nextState),release=host.hold();
    host.fail(failure);const pending=a.commitLiveSource(req);await tick();a.move(3,310,320);release();
    const result=await pending;await a.flush();
    assert.equal(result.outcome,'unknown');assert.equal(result.canonical.source.state.values[26],failure==='reject'?.5:.875);
    assert.equal(host.patch.nodes[2].x,310);assert.deepEqual(req.nextState,draft);
    assert.equal(writes(host).length,2);assert.equal(host.past.length,failure==='reject'?1:2);
  }
});

test('malformed acceptance without one authoring step cannot replay through a later layout edit',async()=>{
  for(const authoringOffset of [0,2]){
    const host=service();let fabricated=false;
    const a=createSharedCanvasController({invoke:async(name,args)=>{
      if(name==='document_commit'&&args.expectedScope&&!fabricated){
        fabricated=true;
        return {accepted:true,document:{...host.descriptor(),authoringRevision:args.baseRevision+authoringOffset,
          descriptorRevision:2,patch:clone(args.patch)}};
      }
      return host.invoke(name,args);
    }});
    await a.prepare();const result=await a.commitLiveSource(request(a));
    assert.equal(result.outcome,'unknown');assert.equal(result.canonical.source.state.values[26],.5);
    assert.equal(host.calls.filter(call=>call.name==='document_current').length,2);
    a.move(3,450,460);await a.flush();
    assert.equal(host.patch.nodes[0].params.state.values[26],.5);
    assert.equal(host.patch.nodes[0].params.state.values[194],12.1);assert.equal(host.patch.nodes[2].x,450);
    assert.equal(host.past.length,1);
  }
});

test('malformed acceptance requires a safe advanced descriptor publication',async()=>{
  for(const publication of [1,undefined,1.5,Number.MAX_SAFE_INTEGER+1]){
    const host=service();let malformed=false;
    const a=createSharedCanvasController({invoke:async(name,args)=>{
      const result=await host.invoke(name,args);
      if(name==='document_commit'&&!malformed){malformed=true;result.document.descriptorRevision=publication;}
      return result;
    }});
    await a.prepare();const result=await a.commitLiveSource(request(a));
    assert.equal(result.outcome,'unknown');assert.equal(result.canonical.source.state.values[26],.875);
    assert.equal(host.calls.filter(call=>call.name==='document_current').length,2);
    assert.equal(writes(host).length,1);assert.equal(host.past.length,1);
  }
});

test('valid accepted receipt uses invocation revisions when overtaken by a newer broadcast',async()=>{
  const host=service();let overtaken=false;
  const a=createSharedCanvasController({invoke:async(name,args)=>{
    const result=await host.invoke(name,args);
    if(name==='document_commit'&&args.expectedScope&&!overtaken){
      overtaken=true;const next=host.patch;next.nodes[2].x=470;host.replace(next);
    }
    return result;
  }});
  host.listen(a.acceptDescriptor);await a.prepare();
  const result=await a.commitLiveSource(request(a));
  assert.equal(result.outcome,'accepted');assert.equal(result.canonical.authoringRevision,3);
  assert.equal(result.canonical.source.state.values[26],.875);
  assert.equal(a.getState().document.nodes[2].x,470);
  assert.equal(host.calls.filter(call=>call.name==='document_current').length,1);
  assert.equal(writes(host).length,1);assert.equal(host.past.length,1);
});

test('source acknowledgement isolates conflicting later edits and retains independent queued layout',async()=>{
  const {host,a}=await setup(),release=host.hold(),pending=a.commitLiveSource(request(a));await tick();
  const source=clone(a.getState().document.nodes[0].params.state);source.values[26]=.25;
  a.deviceParameter(1,'state',source);a.move(3,330,340);release();
  const result=await pending;await a.flush();
  assert.equal(result.outcome,'accepted');
  assert.equal(host.patch.nodes[0].params.state.values[26],.875);
  assert.equal(host.patch.nodes[2].x,330);
});

test('failed reconciliation returns unknown null and disables source capability until fresh canonical read',async()=>{
  const {host,a}=await setup({broadcast:false}),release=host.hold();host.fail('throw');
  const pending=a.commitLiveSource(request(a));await tick();host.failReads();release();
  const result=await pending;
  assert.equal(result.outcome,'unknown');assert.equal(result.canonical,null);
  assert.equal(a.readLiveSource(1).available,false);
  assert.equal((await a.commitLiveSource({})).outcome,'unavailable');
  host.failReads(false);a.acceptDescriptor(await host.invoke('document_current'));
  assert.equal(a.readLiveSource(1).expected.state.values[26],.875);
});

test('history restores exact source and blocks new source captures while pending',async()=>{
  const {host,a}=await setup();await a.commitLiveSource(request(a));
  const undo=a.undo();
  assert.equal((await a.commitLiveSource(request(a))).outcome,'unavailable');
  await undo;assert.equal(a.readLiveSource(1).expected.state.values[26],.5);
  assert.equal(a.readLiveSource(1).expected.state.values[194],12.1);
  await a.redo();assert.equal(a.readLiveSource(1).expected.state.values[26],.875);
  assert.equal(host.past.length,1);
});

test('save and close barriers drain queued source commits then refuse new writes',async()=>{
  for(const purpose of ['save','close']){
    const {host,a}=await setup(),release=host.hold(),pending=a.commitLiveSource(request(a));await tick();
    const barrier={requestLabel:'owner',token:1,purpose},closing=a.flushBeforeClose(barrier);
    assert.equal((await a.commitLiveSource(request(a))).outcome,'unavailable');
    release();await pending;await closing;
    assert.equal(host.patch.nodes[0].params.state.values[26],.875);a.cancelClose(barrier);
  }
});

test('failed source admission marks the active barrier while unrelated queued edits still drain',async()=>{
  const {host,a}=await setup(),release=host.hold();host.fail('reject');
  const pending=a.commitLiveSource(request(a));await tick();a.move(3,350,360);
  const closing=a.flushBeforeClose({requestLabel:'owner',token:1,purpose:'save'});
  const refused=assert.rejects(closing,/admission refused/);release();await pending;await refused;
  assert.equal(host.patch.nodes[2].x,350);assert.equal(host.patch.nodes[0].params.state.values[194],12.1);
});

test('source commits drain after earlier edits and stop after bounded CAS contention',async()=>{
  const {host,a}=await setup();a.move(3,370,380);
  assert.equal((await a.commitLiveSource(request(a))).outcome,'accepted');
  assert.equal(writes(host).length,2);assert.equal(writes(host)[1].args.patch.nodes[2].x,370);
  let attempts=0;
  const b=createSharedCanvasController({invoke:async(name,args)=>{
    if(name==='document_commit'){
      attempts++;const next=host.patch;next.nodes[2].x=370+attempts;host.replace(next,{broadcast:false});
      return {accepted:false,document:host.descriptor()};
    }
    return host.invoke(name,args);
  }});
  await b.prepare();assert.equal((await b.commitLiveSource(request(b,26,.25))).outcome,'conflict');
  assert.equal(attempts,8);assert.equal(host.patch.nodes[0].params.state.values[26],.875);
});

test('source queue cap shares the generic edit bound without coalescing',async()=>{
  const {host,a}=await setup(),req=request(a),release=host.hold(),pending=[a.commitLiveSource(req)];await tick();
  for(let i=1;i<64;i++)pending.push(a.commitLiveSource(req));
  assert.equal((await a.commitLiveSource(req)).outcome,'rejected');
  assert.throws(()=>a.move(3,20,20),/queue full/i);
  release();const results=await Promise.all(pending);await a.flush();
  assert.equal(results[0].outcome,'accepted');assert.ok(results.slice(1).every(result=>result.outcome==='conflict'));
  assert.equal(writes(host).length,1);
});

test('descriptor ordering protects the raw source and running audio does not refuse commits',async()=>{
  const {host,a}=await setup(),old=host.descriptor();await a.poll();
  assert.equal((await a.commitLiveSource(request(a))).outcome,'accepted');
  assert.equal(a.acceptDescriptor(old),false);
  assert.equal(a.readLiveSource(1).expected.state.values[26],.875);
  assert.equal(a.readLiveSource(1).expected.state.values[194],12.1);
});

test('export retains exact canonical source through optimistic layout and source history',async()=>{
  const {host,a}=await setup(),source=()=>JSON.parse(a.export()).nodes[0].params.state;
  assert.deepEqual(source(),host.patch.nodes[0].params.state);
  const release=host.hold();a.move(3,170,180);await tick();
  assert.equal(JSON.parse(a.export()).nodes[2].x,170);
  assert.equal(source().values[194],12.1);release();await a.flush();
  assert.equal(source().values[194],12.1);
  assert.equal((await a.commitLiveSource(request(a,194,12.2))).outcome,'accepted');
  assert.equal(source().values[194],12.2);
  await a.undo();assert.equal(source().values[194],12.1);
  await a.redo();assert.equal(source().values[194],12.2);
});


test('export respects exact same-f32 source intent after U1 acknowledgement and history',async()=>{
  const {host,a}=await setup(),release=host.hold();
  const source=()=>JSON.parse(a.export()).nodes[0].params.state.values[194];
  const next=12.1000001;
  assert.equal(Math.fround(next),Math.fround(12.1));
  const pending=a.commitLiveSource(request(a,194,next));await tick();
  assert.equal(source(),12.1);
  release();assert.equal((await pending).outcome,'accepted');
  assert.equal(source(),next);
  await a.undo();assert.equal(source(),12.1);
  await a.redo();assert.equal(source(),next);
});


test('duplicate and load export their actual optimistic normalized sources without stale overlay',async()=>{
  const {host,a}=await setup(),release=host.hold();
  const [id]=a.duplicateMany([1]);await tick();
  const exported=JSON.parse(a.export());
  assert.equal(exported.nodes[0].params.state.values[194],12.1);
  assert.equal(exported.nodes.find(node=>node.id===id).params.state.values[194],Math.fround(12.1));
  release();await a.flush();
  assert.equal(host.patch.nodes.find(node=>node.id===id).params.state.values[194],Math.fround(12.1));
  const replacement=initial();replacement.nodes[0].params.state.values[194]=12.1000001;
  replacement.nodes[2].x=333;a.load(replacement);
  assert.equal(JSON.parse(a.export()).nodes[0].params.state.values[194],Math.fround(12.1));
  await a.flush();
});

test('nested canonical source survives optimistic edits and removal or replacement does not resurrect it',async()=>{
  const patch=initial(),child=patch.nodes.shift();
  patch.nodes.push({...makeNode('patcher',4),patcher:{presentation:null,nodes:[child],edges:[]}});
  const {host,a}=await setup({patch}),release=host.hold();
  a.move(3,220,230);await tick();
  assert.equal(JSON.parse(a.export()).nodes.find(node=>node.id===4).patcher.nodes[0].params.state.values[194],12.1);
  a.enter(4);a.remove(1);
  assert.deepEqual(JSON.parse(a.export()).nodes.find(node=>node.id===4).patcher.nodes,[]);
  release();await a.flush();assert.equal(host.patch.nodes.find(node=>node.id===4).patcher.nodes.length,0);
  const next=initial(),second=await setup({patch:next}),release2=second.host.hold();
  second.a.configure(1,'number',{});await tick();
  assert.equal(JSON.parse(second.a.export()).nodes[0].type,'number');
  release2();await second.a.flush();
});

test('failed source reconciliation refuses source-bearing export until a fresh descriptor',async()=>{
  const {host,a}=await setup({broadcast:false}),release=host.hold();host.fail('throw');
  const pending=a.commitLiveSource(request(a));await tick();host.failReads();release();
  assert.equal((await pending).outcome,'unknown');
  assert.throws(()=>a.export(),/canonical source state is unavailable/i);
  host.failReads(false);a.acceptDescriptor(await host.invoke('document_current'));
  assert.equal(JSON.parse(a.export()).nodes[0].params.state.values[194],12.1);
});

test('conflicting queued source edit is never overlaid with stale canonical source',async()=>{
  const {host,a,b}=await setup({broadcast:false}),release=host.hold();
  const source=clone(a.getState().document.nodes[0].params.state);source.values[194]=13;
  a.deviceParameter(1,'state',source);await tick();
  await b.commitLiveSource(request(b,194,14));
  assert.equal(JSON.parse(a.export()).nodes[0].params.state.values[194],13);
  release();await a.flush();
  assert.equal(JSON.parse(a.export()).nodes[0].params.state.values[194],14);
});

test('source acknowledgement retains a later optimistic layout edit in export',async()=>{
  const {host,a}=await setup(),release=host.hold();
  const pending=a.commitLiveSource(request(a,194,12.2));await tick();
  a.move(3,420,430);
  let exported=JSON.parse(a.export());
  assert.equal(exported.nodes[2].x,420);assert.equal(exported.nodes[0].params.state.values[194],12.1);
  release();assert.equal((await pending).outcome,'accepted');await a.flush();
  exported=JSON.parse(a.export());
  assert.equal(exported.nodes[2].x,420);assert.equal(exported.nodes[0].params.state.values[194],12.2);
});

test('failed generic edit reconciliation also withholds canonical source export',async()=>{
  const {host,a}=await setup({broadcast:false}),release=host.hold();host.fail('reject');
  a.move(3,500,510);await tick();host.failReads();release();await a.flush();
  assert.throws(()=>a.export(),/canonical source state is unavailable/i);
  host.failReads(false);a.acceptDescriptor(await host.invoke('document_current'));
  assert.equal(JSON.parse(a.export()).nodes[0].params.state.values[194],12.1);
});


test('lost history replies reconcile once or withhold source export until a fresh descriptor',async()=>{
  for(const direction of ['undo','redo'])for(const failRead of [false,true]){
    const host=service();let lost=false,armed=false;
    const a=createSharedCanvasController({invoke:async(name,args)=>{
      const result=await host.invoke(name,args);
      if(name==='document_history'&&armed&&!lost){lost=true;if(failRead)host.failReads();throw Error('history reply lost');}
      return result;
    }});
    await a.prepare();await a.commitLiveSource(request(a,194,12.2));
    if(direction==='redo')await a.undo();
    armed=true;assert.equal(await a[direction](),false);
    assert.equal(host.calls.filter(call=>call.name==='document_history').length,direction==='redo'?2:1);
    const expected=direction==='undo'?12.1:12.2;
    assert.equal(host.patch.nodes[0].params.state.values[194],expected);
    if(failRead){
      assert.throws(()=>a.export(),/canonical source state is unavailable/i);
      host.failReads(false);a.acceptDescriptor(await host.invoke('document_current'));
    }
    assert.equal(JSON.parse(a.export()).nodes[0].params.state.values[194],expected);
  }
});

test('exact restored hierarchy enforces the compact hierarchy bound',async()=>{
  const patch=initial();for(const node of patch.nodes.slice(0,2))node.params.state.values[194]=1.0000000000000002;
  while(true){
    const node=makeNode('comment',patch.nodes.length+1,0,0,{text:'x'.repeat(4096)});
    patch.nodes.push(node);
    try{if(Buffer.byteLength(JSON.stringify(validatePatch(patch)))<=HIERARCHY_LIMITS.bytes-5)continue;}catch{}
    patch.nodes.pop();break;
  }
  const last=makeNode('comment',patch.nodes.length+1,0,0,{text:''});patch.nodes.push(last);
  const normalizedSize=Buffer.byteLength(JSON.stringify(validatePatch(patch)));
  last.params.text='x'.repeat(HIERARCHY_LIMITS.bytes-normalizedSize-5);
  assert.ok(Buffer.byteLength(JSON.stringify(validatePatch(patch)))<=HIERARCHY_LIMITS.bytes);
  assert.ok(Buffer.byteLength(JSON.stringify(patch))>HIERARCHY_LIMITS.bytes);
  assert.ok(Buffer.byteLength(JSON.stringify(lowerHierarchy(patch)))<=65536);
  const {a}=await setup({patch});
  assert.throws(()=>a.export(),/hierarchy exceeds 1 MiB/i);
});


test('exact restored source enforces the lowered execution bound',async()=>{
  const patch={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[],edges:[]};
  for(let id=1;id<=32;id++)patch.nodes.push({...makeNode('live_device',id),params:{device:'Analog',state:state()}});
  for(const node of patch.nodes)node.params.state.values[194]=1;
  patch.nodes[0].params.state.values[194]=0.5000000000000001;
  const eligible=analogDescriptors.filter(({kind,min,max,index})=>kind!==3&&min<=0.1234567890123456&&max>=0.1234567890123456&&index!==194);
  let normalized=validatePatch(patch),size=Buffer.byteLength(JSON.stringify(lowerHierarchy(normalized)));
  outer:for(const node of patch.nodes)for(const {index} of eligible){
    const old=node.params.state.values[index];node.params.state.values[index]=Math.fround(0.1234567890123456);
    try{normalized=validatePatch(patch);}catch{node.params.state.values[index]=old;continue;}
    size=Buffer.byteLength(JSON.stringify(lowerHierarchy(normalized)));
    if(size>65536-12)break outer;
  }
  assert.ok(size<=65536&&size>65536-12,`normalized lowered size ${size}`);
  assert.ok(Buffer.byteLength(JSON.stringify(lowerHierarchy(patch)))>65536);
  const {a}=await setup({patch});assert.throws(()=>a.export(),/patch exceeds 64 KiB/i);
});


test('format-specific reader bounds retain valid flat and large hierarchical exports',async()=>{
  const flat={version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[],edges:[]};
  for(let id=1;id<=32;id++)flat.nodes.push({...makeNode('live_device',id),params:{device:'Analog',state:state()}});
  assert.ok(Buffer.byteLength(serializePatch(flat))>65536);
  const {a}=await setup({patch:flat}),text=a.export();
  assert.ok(Buffer.byteLength(text)<=65536);assert.equal(JSON.parse(text).nodes[0].params.state.values[194],12.1);
  assert.equal(parsePatch(text).version,1);
  const hierarchy=initial();
  for(let id=4;id<=22;id++)hierarchy.nodes.push(makeNode('comment',id,0,0,{text:'x'.repeat(4096)}));
  const second=await setup({patch:hierarchy}),expanded=second.a.export();
  assert.ok(Buffer.byteLength(expanded)>65536);assert.equal(parsePatch(expanded).version,2);
  hierarchy.nodes=hierarchy.nodes.filter(node=>node.type==='comment');
  const third=await setup({patch:hierarchy});assert.equal(third.a.export(),serializePatch(hierarchy));
});
