import test from 'node:test';
import assert from 'node:assert/strict';
import {createAliveModel, parameterReading} from './alive-model.mjs';

const document=()=>({format:'alive-session-v2',title:'Test',tempo:120,lengthBeats:8,loopEnabled:true,tracks:[{id:'a',name:'Pulse',effects:[],device:{instanceId:'instrument',sourceSha256:'0'.repeat(64),bypassed:false,id:'synth',path:'a.ultra',version:1,parameters:{cutoff:1000}},gain:.7,mute:false,solo:false,notes:[{beat:0,pitch:60,duration:1,velocity:90}],automation:[{instanceId:'instrument',key:'cutoff',enabled:true,points:[{beat:0,value:700}]}]}]});
const snapshot=(doc=document())=>({generation:1,document:doc,devices:[],state:{position:0,playing:1,tracks:[{effective:[700],owned:[1]}]}});
const master=()=>({gain:.5,acceptedSerial:'9007199254740994',available:true,unavailableReason:null,observation:{targetGain:.25,currentGain:.3,peakLeft:.8,peakRight:1.2,clipMask:2,appliedSerial:'9007199254740993',appliedFrame:'9007199254740995',observationStartFrame:'9007199254740995',observationEndFrame:'9007199254741059'},observationStale:false});

for(const method of ['accept','applied'])for(const missing of ['master','snapshotSequence','preparationRevision']){
  test(`${method} refuses a delayed response missing established ${missing}`,()=>{
    const model=createAliveModel();
    assert.equal(model.accept(snapshot()),true); // Legacy-only streams remain usable.
    const current={...snapshot(),draftRevision:1,preparationRevision:'20',snapshotSequence:'20',master:master()};
    assert.equal(model.accept(current),true);model.edit(d=>{d.tempo=140;});
    const late=structuredClone(current);delete late[missing];late.document.tempo=80;
    assert.equal(model[method](late),false);
    assert.equal(model.snapshot(),current);assert.equal(model.document().tempo,140);assert.equal(model.pending(),true);assert.deepEqual(model.snapshot().master,current.master);
    const next=structuredClone(current);next.snapshotSequence='21';next.master.gain=.75;
    assert.equal(model.accept(next),true);assert.equal(model.snapshot().master.gain,.75);assert.equal(model.document().tempo,140);
  });
}

test('malformed Master identities are rejected before changing current or draft',()=>{
  const model=createAliveModel(),initial={...snapshot(),draftRevision:1,snapshotSequence:'1',master:master()};
  model.accept(initial);model.edit(d=>{d.tempo=140;});
  const invalid=structuredClone(initial);invalid.draftRevision=2;invalid.snapshotSequence='2';invalid.master.observation.appliedSerial=9007199254740993;
  assert.throws(()=>model.accept(invalid),/decimal string/);
  assert.equal(model.snapshot(),initial);assert.equal(model.document().tempo,140);assert.equal(model.pending(),true);
  assert.throws(()=>model.applied(invalid),/decimal string/);
  assert.equal(model.snapshot(),initial);assert.equal(model.document().tempo,140);
});

test('Master survives score editing, live merge, apply and discard independently',()=>{
  const model=createAliveModel(),initial={...snapshot(),draftRevision:1,snapshotSequence:'1',master:master()};
  model.accept(initial);model.edit(d=>{d.tempo=140;});
  const next=structuredClone(initial);next.snapshotSequence='2';next.master.gain=.75;next.master.acceptedSerial='9007199254740995';next.document.tracks[0].gain=.4;model.accept(next);
  assert.equal(model.document().tempo,140);assert.equal(model.document().tracks[0].gain,.4);assert.deepEqual(model.snapshot().master,next.master);assert.equal(model.document().master,undefined);
  const applied=structuredClone(next);applied.snapshotSequence='3';applied.document.tempo=140;model.applied(applied);
  assert.equal(model.pending(),false);assert.deepEqual(model.snapshot().master,next.master);
  model.edit(d=>{d.tempo=150;});model.discard();assert.equal(model.document().tempo,140);assert.deepEqual(model.snapshot().master,next.master);
});

test('nullable and stale observations and older snapshots preserve authoritative Master',()=>{
  const model=createAliveModel(),initial={...snapshot(),draftRevision:4,preparationRevision:'4',snapshotSequence:'10',master:master()};model.accept(initial);model.edit(d=>{d.tempo=140;});
  const stale=structuredClone(initial);stale.snapshotSequence='11';stale.master.observationStale=true;model.accept(stale);assert.equal(model.snapshot().master.observationStale,true);assert.equal(model.document().tempo,140);
  const unavailable=structuredClone(stale);unavailable.snapshotSequence='12';unavailable.master={gain:.5,acceptedSerial:'0',available:false,unavailableReason:'Upgrade native library',observation:null,observationStale:false};model.accept(unavailable);assert.deepEqual(model.snapshot().master,unavailable.master);
  for(const old of [{...initial,snapshotSequence:'9'}, {...initial,generation:0,snapshotSequence:'13'}, {...initial,draftRevision:3,snapshotSequence:'13'}, {...initial,preparationRevision:'3',snapshotSequence:'13'}]){assert.equal(model.accept(old),false);assert.deepEqual(model.snapshot().master,unavailable.master);}
  assert.equal(model.document().tempo,140);
});

test('polling preserves musical drafts and merges newer live base and mixer values',()=>{
  const model=createAliveModel();model.accept(snapshot());
  model.edit(doc=>{doc.tempo=130;doc.tracks[0].notes[0].pitch=64;});
  const updated=document();updated.tracks[0].device.parameters.cutoff=1600;updated.tracks[0].gain=.4;
  model.accept(snapshot(updated));
  assert.equal(model.document().tracks[0].notes[0].pitch,64);
  assert.equal(model.document().tempo,130);
  assert.equal(model.document().tracks[0].device.parameters.cutoff,1600);
  assert.equal(model.document().tracks[0].gain,.4);
  assert.equal(model.pending(),true);
  model.discard();assert.equal(model.document().tracks[0].notes[0].pitch,60);
});

test('replacement invalidates old drafts only after generation changes',()=>{
  const model=createAliveModel();model.accept(snapshot());model.edit(doc=>{doc.tracks[0].notes.push({beat:2,pitch:67,duration:.5,velocity:80});});
  model.accept({...snapshot(),generation:2});
  assert.equal(model.pending(),false);assert.equal(model.document().tracks[0].notes.length,1);
});

test('automation ownership displays saved base separately from effective value',()=>{
  assert.deepEqual(parameterReading({base:1600},{effective:[700],owned:[1]},0),{base:1600,effective:700,owner:'Automation'});
  assert.deepEqual(parameterReading({base:1600},{effective:[1600],owned:[0]},0),{base:1600,effective:1600,owner:'Base'});
});

test('a resolved native file dialog adopts its authoritative retained or discarded draft',()=>{
  const model=createAliveModel();model.accept(snapshot());model.edit(doc=>{doc.tracks[0].notes[0].pitch=64;});
  const retained=structuredClone(model.document());
  model.applied({...snapshot(),draft:retained});
  assert.equal(model.pending(),true);assert.equal(model.document().tracks[0].notes[0].pitch,64);
  model.applied({...snapshot(),draft:null});
  assert.equal(model.pending(),false);assert.equal(model.document().tracks[0].notes[0].pitch,60);
});

test('independent same-source effects merge by instance identity while retaining chain order',()=>{
  const doc=document();doc.tracks[0].device.instanceId='instrument';
  doc.tracks[0].effects=[{instanceId:'a',id:'gain',path:'gain.ultra',parameters:{gain:.2},bypassed:false},{instanceId:'b',id:'gain',path:'gain.ultra',parameters:{gain:.8},bypassed:false}];
  const model=createAliveModel();model.accept(snapshot(doc));model.edit(d=>{d.tempo=140;});
  const live=structuredClone(doc);live.tracks[0].effects[0].parameters.gain=.4;live.tracks[0].effects[1].bypassed=true;
  model.accept(snapshot(live));
  assert.equal(model.document().tracks[0].effects[0].parameters.gain,.4);
  assert.equal(model.document().tracks[0].effects[1].parameters.gain,.8);
  assert.equal(model.document().tracks[0].effects[1].bypassed,true);
  assert.deepEqual(model.document().tracks[0].effects.map(e=>e.instanceId),['a','b']);
});

test('older polling responses cannot replace a newer authoritative musical revision',()=>{
  const model=createAliveModel(),a={...snapshot(),draftRevision:4,draft:null};model.accept(a);
  const b=structuredClone(a);b.draftRevision=5;b.draft=structuredClone(b.document);b.draft.tempo=140;model.accept(b);model.accept(a);
  assert.equal(model.document().tempo,140);assert.equal(model.snapshot().draftRevision,5);
});

test('native sequence and preparation strings reject late runtime snapshots beyond JS precision',()=>{
  const model=createAliveModel(),a={...snapshot(),draftRevision:4,preparationRevision:'9007199254740993',snapshotSequence:'9007199254740993'};
  model.accept(a);const b=structuredClone(a);b.state.playing=0;b.snapshotSequence='9007199254740994';model.accept(b);model.accept(a);
  assert.equal(model.snapshot().state.playing,0);
  const old=structuredClone(b);old.snapshotSequence='9007199254740995';old.preparationRevision='9007199254740992';old.state.playing=1;model.accept(old);assert.equal(model.snapshot().state.playing,0);
  assert.throws(()=>model.accept({...b,snapshotSequence:9007199254740994}),/decimal string/);
});

test('v4 live polls preserve placement/source drafts and immutable prepared labels',()=>{
  const doc=document(),t=doc.tracks[0];doc.format='alive-session-v4';t.chain={kind:'midi',instrument:t.device};delete t.device;t.slots=[];doc.sources=[{id:'source',trackId:t.id,name:'Prepared name',notes:t.notes,automation:t.automation}];delete t.notes;delete t.automation;doc.placements=[{id:'occurrence',trackId:t.id,sourceId:'source',start:0,duration:4,region:{start:0,end:8,loopStart:0,loopEnd:8,loopEnabled:true}}];
  const initial={...snapshot(doc),draftRevision:2,preparationRevision:'9007199254740993',snapshotSequence:'9007199254740995',preparedWorkspaces:{preparationRevision:'9007199254740993',sources:[{sourceId:'source',name:'Prepared name'}],placements:[{placementId:'occurrence',sourceId:'source',startFrame:'0'}]}};
  const model=createAliveModel();model.accept(initial);model.edit(d=>{d.sources[0].name='Pending name';d.sources[0].notes[0].pitch=72;d.placements[0].start=2;});
  const poll=structuredClone(initial);poll.snapshotSequence='9007199254740996';poll.document.tracks[0].chain.instrument.parameters.cutoff=1700;poll.document.tracks[0].gain=.5;model.accept(poll);
  assert.equal(model.document().placements[0].start,2);assert.equal(model.document().sources[0].notes[0].pitch,72);assert.equal(model.document().tracks[0].gain,.5);assert.equal(model.document().tracks[0].chain.instrument.parameters.cutoff,1700);assert.equal(model.snapshot().preparedWorkspaces.sources[0].name,'Prepared name');assert.equal(model.snapshot().preparedWorkspaces.placements[0].startFrame,'0');
});
