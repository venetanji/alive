import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CanvasDocument, makeNode} from './canvas-model.mjs';
import {createSharedCanvasController} from './canvas-shared.mjs';
import {createLiveDeviceState, liveDeviceCatalog} from './live-device-profile.mjs';
import {planAnalogCurrentParameters} from './live-profiles/analog/parameter-mapping.mjs';

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
