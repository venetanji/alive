import test from 'node:test';
import assert from 'node:assert/strict';
import {createAliveModel, parameterReading} from './alive-model.mjs';

const document=()=>({format:'alive-session-v2',title:'Test',tempo:120,lengthBeats:8,loopEnabled:true,tracks:[{id:'a',name:'Pulse',effects:[],device:{instanceId:'instrument',sourceSha256:'0'.repeat(64),bypassed:false,id:'synth',path:'a.ultra',version:1,parameters:{cutoff:1000}},gain:.7,mute:false,solo:false,notes:[{beat:0,pitch:60,duration:1,velocity:90}],automation:[{instanceId:'instrument',key:'cutoff',enabled:true,points:[{beat:0,value:700}]}]}]});
const snapshot=(doc=document())=>({generation:1,document:doc,devices:[],state:{position:0,playing:1,tracks:[{effective:[700],owned:[1]}]}});

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
  const doc=document(),t=doc.tracks[0];doc.format='alive-session-v4';t.chain={kind:'midi',instrument:t.device};delete t.device;t.slots=[];doc.sources=[{id:'source',trackId:t.id,name:'Prepared name',notes:t.notes,automation:t.automation}];delete t.notes;delete t.automation;doc.placements=[{id:'occurrence',trackId:t.id,sourceId:'source',start:0,duration:4,sourceOffset:{kind:'beats',value:0},loopEnabled:true}];
  const initial={...snapshot(doc),draftRevision:2,preparationRevision:'9007199254740993',snapshotSequence:'9007199254740995',preparedWorkspaces:{preparationRevision:'9007199254740993',sources:[{sourceId:'source',name:'Prepared name'}],placements:[{placementId:'occurrence',sourceId:'source',startFrame:'0'}]}};
  const model=createAliveModel();model.accept(initial);model.edit(d=>{d.sources[0].name='Pending name';d.sources[0].notes[0].pitch=72;d.placements[0].start=2;});
  const poll=structuredClone(initial);poll.snapshotSequence='9007199254740996';poll.document.tracks[0].chain.instrument.parameters.cutoff=1700;poll.document.tracks[0].gain=.5;model.accept(poll);
  assert.equal(model.document().placements[0].start,2);assert.equal(model.document().sources[0].notes[0].pitch,72);assert.equal(model.document().tracks[0].gain,.5);assert.equal(model.document().tracks[0].chain.instrument.parameters.cutoff,1700);assert.equal(model.snapshot().preparedWorkspaces.sources[0].name,'Prepared name');assert.equal(model.snapshot().preparedWorkspaces.placements[0].startFrame,'0');
});
