import test from 'node:test';
import assert from 'node:assert/strict';
import {beatToX,xToBeat,snap,transformPlacement,placementError,midiMarks} from './alive-timeline.mjs';

const source={lengthBeats:4,notes:[{beat:1,duration:1,pitch:60}]};
const placement={id:'p',trackId:'t',sourceId:'s',start:4,duration:4,sourceOffset:{kind:'beats',value:0},loopEnabled:true};
test('timeline geometry shares scale and scroll, snapping to quarter beats',()=>{
  for(const scale of [16,48,160])for(const scroll of [0,124])for(const beat of [0,.25,33])assert.equal(xToBeat(beatToX(beat,scale,scroll),scale,scroll),beat);
  assert.equal(snap(1.37),1.25);assert.equal(snap(1.38),1.5);
});
test('fixed-end trim preserves notes, resize preserves offset and move stays on track',()=>{
  const trim=transformPlacement(placement,'trim',1);assert.equal(trim.start,5);assert.equal(trim.duration,3);assert.equal(trim.sourceOffset.value,1);assert.equal(trim.start+trim.duration,8);
  const resize=transformPlacement(placement,'resize',2);assert.equal(resize.duration,6);assert.deepEqual(resize.sourceOffset,placement.sourceOffset);
  const move=transformPlacement(placement,'move',2);assert.equal(move.trackId,'t');assert.equal(move.duration,4);assert.equal(move.start,6);
});
test('half-open adjacency is valid, overlap and invalid suffixes refuse without cropping',()=>{
  assert.equal(placementError(placement,source,[{...placement,id:'other',start:8}],16),null);
  assert.match(placementError(placement,source,[{...placement,id:'other',start:7}],16),/overlap/i);
  assert.match(placementError(transformPlacement(placement,'trim',-1),source,[],16),/offset/i);
  assert.match(placementError({...placement,loopEnabled:false,sourceOffset:{kind:'beats',value:1}},source,[],16),/suffix/i);
});
test('MIDI marks repeat only the offset suffix and clip to occurrence and viewport',()=>{
  const p={...placement,duration:8,sourceOffset:{kind:'beats',value:1}};
  assert.deepEqual(midiMarks(source,p,0,16,48).map(m=>[m.start,m.end]),[[4,5],[7,8],[10,11]]);
  assert.deepEqual(midiMarks(source,p,7.5,10.5,48).map(m=>[m.start,m.end]),[[7.5,8],[10,10.5]]);
  assert.ok(midiMarks({lengthBeats:.015625,notes:[{beat:0,duration:.015625,pitch:60}]},{...p,duration:256,sourceOffset:{kind:'beats',value:0}},0,256,16).length<=4096);
});
