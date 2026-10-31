import test from 'node:test';
import assert from 'node:assert/strict';
import {beatToX,xToBeat,snap,transformPlacement,placementError,midiMarks} from './alive-timeline.mjs';
import * as timeline from './alive-timeline.mjs';

const source={lengthBeats:4,notes:[{beat:1,duration:1,pitch:60}]};
const placement={id:'p',trackId:'t',sourceId:'s',start:4,duration:4,region:{start:0,end:4,loopStart:0,loopEnd:4,loopEnabled:true}};
test('timeline geometry shares scale and scroll, snapping to quarter beats',()=>{
  for(const scale of [16,48,160])for(const scroll of [0,124])for(const beat of [0,.25,33])assert.equal(xToBeat(beatToX(beat,scale,scroll),scale,scroll),beat);
  assert.equal(snap(1.37),1.25);assert.equal(snap(1.38),1.5);
});
test('fixed-end trim preserves notes, resize preserves offset and move stays on track',()=>{
  const trim=transformPlacement(placement,'trim',1);assert.equal(trim.start,5);assert.equal(trim.duration,3);assert.equal(trim.region.start,1);assert.equal(trim.start+trim.duration,8);
  const resize=transformPlacement(placement,'resize',2);assert.equal(resize.duration,6);assert.deepEqual(resize.region,placement.region);
  const move=transformPlacement(placement,'move',2);assert.equal(move.trackId,'t');assert.equal(move.duration,4);assert.equal(move.start,6);
});
test('half-open adjacency is valid, overlap and invalid suffixes refuse without cropping',()=>{
  assert.equal(placementError(placement,source,[{...placement,id:'other',start:8}],16),null);
  assert.match(placementError(placement,source,[{...placement,id:'other',start:7}],16),/overlap/i);
  assert.match(placementError(transformPlacement(placement,'trim',-1),source,[],16),/start/i);
  assert.match(placementError({...placement,region:{...placement.region,loopEnabled:false,start:1}},source,[],16),/nonloop/i);
});
test('MIDI marks repeat only the offset suffix and clip to occurrence and viewport',()=>{
  const p={...placement,duration:8,region:{...placement.region,start:1,loopStart:1}};
  assert.deepEqual(midiMarks(source,p,0,16,48).map(m=>[m.start,m.end]),[[4,5],[7,8],[10,11]]);
  assert.deepEqual(midiMarks(source,p,7.5,10.5,48).map(m=>[m.start,m.end]),[[7.5,8],[10,10.5]]);
  assert.ok(midiMarks({lengthBeats:.015625,notes:[{beat:0,duration:.015625,pitch:60}]},{...p,duration:256,region:{start:0,end:.015625,loopStart:0,loopEnd:.015625,loopEnabled:true}},0,256,16).length<=4096);
});

test('independent Start plays an introduction before repeating only the loop, preserving outer notes',()=>{
  const notes=[{beat:0,duration:1,pitch:60},{beat:2,duration:1,pitch:62},{beat:5,duration:1,pitch:64}],s={kind:'midi',lengthBeats:8,notes};
  const p={...placement,duration:10,region:{start:0,end:8,loopStart:2,loopEnd:4,loopEnabled:true}};
  assert.deepEqual(midiMarks(s,p,0,20,48).map(m=>[m.start,m.end]),[[4,5],[6,7],[8,9],[10,11],[12,13]]);
  assert.equal(s.notes.length,3);
});
test('audio placement validation uses real source duration and independent region bounds',()=>{
  const audio={kind:'audio',sourceTempo:120,file:{frames:'192000',sampleRate:48000}};
  assert.equal(placementError(placement,audio,[],16),null);
  assert.match(placementError({...placement,region:{...placement.region,end:9}},audio,[],16),/source/i);
});
test('Arrangement waveform uses the same intro and loop mapping as MIDI marks',()=>{
  assert.equal(typeof timeline.waveformMarks,'function');
  const audio={kind:'audio',sourceTempo:120,file:{frames:'96000',sampleRate:48000}},p={...placement,duration:8,region:{start:0,end:4,loopStart:2,loopEnd:4,loopEnabled:true}};
  assert.deepEqual(timeline.waveformMarks(audio,p,[[-.5,.5],[-1,1]],0,16,48),[
    {start:4,end:6,min:-.5,max:.5},{start:6,end:8,min:-1,max:1},{start:8,end:10,min:-1,max:1},{start:10,end:12,min:-1,max:1}
  ]);
});
