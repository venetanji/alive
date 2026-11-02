import test from 'node:test';
import assert from 'node:assert/strict';
import {createAliveModel,parameterReading,actualDevices,sourceLength,clipPlayback} from './alive-model.mjs';

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

function playbackSnapshot(){
  return{preparationRevision:'7',document:{tempo:120},state:{playing:1},
    runtime:{tracks:[{trackId:'track',authority:'session',activeSourceId:'source',activeSlotId:'slot',phase:'24000'}]},
    preparedWorkspaces:{preparationRevision:'7',sources:[{trackId:'track',sourceId:'source',lengthFrames:'384000'}],
      slots:[{trackId:'track',slotId:'slot',sourceId:'source',region:{startFrame:'0',endFrame:'384000',loopStartFrame:'0',loopEndFrame:'96000',loopEnabled:true}}],placements:[]}};
}
test('loop position uses the admitted occurrence and never invents completed plays',()=>{
  const s=playbackSnapshot(),v=clipPlayback(s,'track');assert.equal(v.fraction,.25);assert.equal(v.lengthBeats,4);assert.equal(v.playing,true);assert.equal(v.playCount,null);
  s.runtime.tracks[0].activeSourceId='another-source';assert.equal(clipPlayback(s,'track'),null);
});
test('one-shot position and cued state use native frames without unsafe integer conversion',()=>{
  const s=playbackSnapshot(),base=9007199254740993n,region=s.preparedWorkspaces.slots[0].region;
  Object.assign(region,{startFrame:String(base),endFrame:String(base+48000n),loopEnabled:false});
  s.preparedWorkspaces.sources[0].lengthFrames=String(base+96000n);s.runtime.tracks[0].phase=String(base+24000n);s.state.playing=0;
  const v=clipPlayback(s,'track');assert.equal(v.fraction,.5);assert.equal(v.lengthBeats,2);assert.equal(v.playing,false);
  s.runtime.tracks[0].phase=Number(base);assert.equal(clipPlayback(s,'track'),null);
});
test('loop intros and a source Start inside the loop keep distinct phase semantics',()=>{
  const s=playbackSnapshot(),region=s.preparedWorkspaces.slots[0].region;region.loopStartFrame='48000';
  let v=clipPlayback(s,'track');assert.equal(v.intro,true);assert.equal(v.fraction,null);assert.equal(v.lengthBeats,2);
  region.startFrame='72000';s.runtime.tracks[0].phase='60000';v=clipPlayback(s,'track');assert.equal(v.intro,false);assert.equal(v.fraction,.25);
});
test('stale preparations, missing phase and impossible native regions clear loop presentation',()=>{
  for(const mutate of [s=>s.preparedWorkspaces.preparationRevision='6',s=>s.runtime.tracks[0].phase=null,s=>s.preparedWorkspaces.slots[0].region.startFrame='120000']){
    const s=playbackSnapshot();mutate(s);assert.equal(clipPlayback(s,'track'),null);
  }
});
