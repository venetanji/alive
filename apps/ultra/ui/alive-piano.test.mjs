import test from 'node:test';
import assert from 'node:assert/strict';
import * as piano from './alive-piano.mjs';
const {geometry,point,beatAt,pitchAt,transformNote,addNote,keyEdit}=piano;
test('scroll-independent viewBox mapping and stable viewport geometry',()=>{
  const g=geometry([{pitch:60}],8),p=point({clientX:420,clientY:120},{left:100,top:20,width:640,height:218},g);
  assert.equal(p.x,320);assert.equal(p.y,100);
  assert.ok(g.min<=60&&g.max>=60);
});
test('default pitch rows stay readable and the viewport uses its real dimensions',()=>{
  const g=geometry([{pitch:60}],8,{}, {width:976,height:182});
  assert.equal(g.width,976);assert.equal(g.height,182);
  assert.ok(g.pitchHeight>=10);
  assert.ok(g.pad>=40,'keyboard has a separate gutter');
  assert.equal(beatAt({x:g.pad},g),0);
  assert.equal(beatAt({x:g.width},g),8);
});
test('time and pitch navigation are independent and bounded without touching notes',()=>{
  assert.equal(typeof piano.initialViewport,'function');
  assert.equal(typeof piano.navigateViewport,'function');
  const notes=[{beat:2,duration:1,pitch:60,velocity:90}],before=structuredClone(notes);
  const initial=piano.initialViewport(notes,16),g=geometry(notes,16,initial);
  const time=piano.navigateViewport(initial,g,{type:'timeZoom',factor:2,anchor:.5});
  assert.equal(time.beatSpan,8);assert.equal(time.beatStart,4);
  assert.equal(time.pitchTop,initial.pitchTop);assert.equal(time.pitchHeight,initial.pitchHeight);
  const pitch=piano.navigateViewport(time,geometry(notes,16,time),{type:'pitchZoom',factor:2,anchor:.5});
  assert.equal(pitch.pitchHeight,initial.pitchHeight*2);
  assert.equal(pitch.beatStart,time.beatStart);assert.equal(pitch.beatSpan,time.beatSpan);
  const right=piano.navigateViewport(pitch,geometry(notes,16,pitch),{type:'timePan',beats:1000});
  assert.equal(right.beatStart,8);
  const up=piano.navigateViewport(right,geometry(notes,16,right),{type:'pitchPan',pitches:1000});
  assert.ok(geometry(notes,16,up).max<=127);
  assert.deepEqual(notes,before);
});
test('fit includes note bounds in both axes and handles empty clips',()=>{
  assert.equal(typeof piano.fitViewport,'function');
  const notes=[{beat:5.13,duration:.37,pitch:54},{beat:10,duration:2,pitch:72}],g=geometry(notes,32,{}, {width:976,height:182});
  const fit=piano.fitViewport(notes,g),f=geometry(notes,32,fit,{width:976,height:182});
  assert.ok(f.beatStart<=5.13);assert.ok(f.beatStart+f.beatSpan>=12);
  assert.ok(f.min<=54&&f.max>=72);
  const empty=geometry([],8,piano.fitViewport([],geometry([],8)));
  assert.equal(empty.beatStart,0);assert.equal(empty.beatSpan,8);
  assert.ok(empty.min<=60&&empty.max>=60);
});
test('resizing recomputes hit positions while a frozen gesture keeps its original scale',()=>{
  const viewport={beatStart:2,beatSpan:4,pitchTop:72,pitchHeight:12};
  const frozen=geometry([],16,viewport,{width:900,height:182});
  const resized=geometry([],16,viewport,{width:450,height:230});
  const hit=(g,beat,pitch)=>({x:g.pad+(beat-g.beatStart)/g.beatSpan*(g.width-g.pad),y:g.top+(g.max-pitch+.5)*g.pitchHeight});
  for(const g of [frozen,resized]){
    const p=hit(g,4,65);
    assert.equal(beatAt(p,g),4);assert.equal(pitchAt(p,g),65);
  }
  assert.equal(frozen.width,900);assert.equal(resized.width,450);
  assert.equal(frozen.pitchHeight,resized.pitchHeight);
});
test('musical ruler labels bars and beats and bounds its work at distant positions',()=>{
  assert.equal(typeof piano.rulerTicks,'function');
  const ticks=piano.rulerTicks(geometry([],16,{beatStart:4,beatSpan:8}));
  assert.equal(ticks.find(t=>t.beat===4).label,'2');
  assert.equal(ticks.find(t=>t.beat===5).label,'2.2');
  assert.equal(ticks.find(t=>t.beat===8).major,true);
  assert.ok(piano.rulerTicks(geometry([],1000000,{beatStart:999900,beatSpan:100})).length<=130);
});
test('velocity lane drags use the original value and clamp to the MIDI range',()=>{
  assert.equal(typeof piano.velocityEdit,'function');
  const note={id:'a',beat:.13,duration:.37,pitch:60,velocity:90};
  assert.deepEqual(piano.velocityEdit(note,7),{...note,velocity:122});
  assert.deepEqual(piano.velocityEdit(note,100),{...note,velocity:127});
  assert.deepEqual(piano.velocityEdit(note,-100),{...note,velocity:1});
  assert.equal(note.velocity,90);
});
test('move and resize snap displacement while preserving imported offsets',()=>{
  const n={beat:.13,duration:.37,pitch:60,velocity:100};
  assert.deepEqual(transformNote(n,'move',.26,2),{...n,beat:.38,pitch:62});
  assert.deepEqual(transformNote(n,'resize',.27,12),{...n,duration:.62});
  assert.deepEqual(keyEdit(n,'ArrowRight',false),{...n,beat:.38});
  assert.deepEqual(keyEdit(n,'ArrowLeft',true),{...n,duration:.12});
});
test('new notes use the fixed grid, velocity and duration and reject clipped placement',()=>{
  assert.deepEqual(addNote(.38,60,8),{beat:.5,pitch:60,duration:.25,velocity:100});
  assert.equal(addNote(7.99,60,8),null);
});
