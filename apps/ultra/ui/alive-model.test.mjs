import test from 'node:test';
import assert from 'node:assert/strict';
import {createAliveModel,parameterReading,actualDevices,sourceLength} from './alive-model.mjs';

const master=()=>({gain:.5,acceptedSerial:'9007199254740994',available:true,unavailableReason:null,observation:{targetGain:.25,currentGain:.3,peakLeft:.8,peakRight:1.2,clipMask:2,appliedSerial:'9007199254740993',appliedFrame:'9007199254740995',observationStartFrame:'9007199254740995',observationEndFrame:'9007199254741059'},observationStale:false});
const snapshot=()=>({generation:1,editRevision:4,preparationRevision:'9007199254740993',snapshotSequence:'9007199254740995',master:master(),document:{format:'alive-session-v4',tempo:120,tracks:[],sources:[],placements:[]},state:{playing:1}});

test('accepted score and live controls come from one authoritative snapshot',()=>{
  const model=createAliveModel(),initial=snapshot();assert.equal(model.accept(initial),true);
  const next=structuredClone(initial);next.editRevision++;next.snapshotSequence='9007199254740996';next.document.tempo=140;next.master.gain=.75;
  assert.equal(model.accept(next),true);assert.equal(model.document(),next.document);assert.equal(model.document().tempo,140);assert.equal(model.snapshot().master.gain,.75);
});

test('late generation, edit, preparation and runtime responses cannot replace accepted state',()=>{
  const model=createAliveModel(),initial=snapshot();model.accept(initial);
  for(const changes of [{generation:0},{editRevision:3},{preparationRevision:'9007199254740992'},{snapshotSequence:'9007199254740994'}]){
    const old={...structuredClone(initial),...changes};old.document.tempo=80;assert.equal(model.accept(old),false);assert.equal(model.document().tempo,120);assert.equal(model.snapshot(),initial);
  }
});

for(const key of ['editRevision','generation','master','preparationRevision','snapshotSequence'])test(`current IPC requires ${key} before replacing accepted state`,()=>{
  const model=createAliveModel(),initial=snapshot();model.accept(initial);const malformed=structuredClone(initial);delete malformed[key];
  assert.throws(()=>model.accept(malformed));assert.equal(model.snapshot(),initial);
});

test('malformed Master and unsafe revision identities leave accepted state intact',()=>{
  const model=createAliveModel(),initial=snapshot();model.accept(initial);
  for(const changes of [{editRevision:-1},{editRevision:9007199254740992},{snapshotSequence:9007199254740994}])assert.throws(()=>model.accept({...structuredClone(initial),...changes}));
  const malformed=structuredClone(initial);malformed.master.observation.appliedSerial=9007199254740993;assert.throws(()=>model.accept(malformed),/decimal string/);assert.equal(model.snapshot(),initial);
});

test('nullable and stale Master observations remain explicit while score updates continue',()=>{
  const model=createAliveModel(),initial=snapshot();model.accept(initial);
  const stale=structuredClone(initial);stale.snapshotSequence='9007199254740996';stale.master.observationStale=true;model.accept(stale);assert.equal(model.snapshot().master.observationStale,true);
  const unavailable=structuredClone(stale);unavailable.snapshotSequence='9007199254740997';unavailable.master={gain:.5,acceptedSerial:'0',available:false,unavailableReason:'Audio is stopped',observation:null,observationStale:false};model.accept(unavailable);assert.deepEqual(model.snapshot().master,unavailable.master);
});

test('automation displays the live base separately from its effective owner',()=>{
  assert.deepEqual(parameterReading({base:1600},{effective:[700],owned:[1]},0),{base:1600,effective:700,owner:'Automation'});
  assert.deepEqual(parameterReading({base:1600},{effective:[1600],owned:[0]},0),{base:1600,effective:1600,owner:'Base'});
});

test('rootless MIDI and audio tracks expose only their actual devices',()=>{
  const effect={instanceId:'effect'};assert.deepEqual(actualDevices({chain:{kind:'midi',instrument:null},effects:[effect]}),[effect]);assert.deepEqual(actualDevices({chain:{kind:'audio'},effects:[]}),[]);
});

test('audio source length follows its frames and source tempo',()=>{
  assert.equal(sourceLength({kind:'audio',file:{frames:'192000',sampleRate:48000},sourceTempo:120}),8);assert.equal(sourceLength({kind:'midi',lengthBeats:16}),16);
});
