import test from 'node:test';
import assert from 'node:assert/strict';
import {geometry,point,transformNote,addNote,keyEdit} from './alive-piano.mjs';
test('scroll-independent viewBox mapping and stable viewport geometry',()=>{
  const g=geometry([{pitch:60}],8),p=point({clientX:420,clientY:120},{left:100,top:20,width:640,height:218},g);
  assert.equal(p.x,320);assert.equal(p.y,100);assert.equal(g.max,85);
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
