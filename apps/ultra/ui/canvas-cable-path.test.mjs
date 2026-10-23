import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cableBounds,cablePath} from './canvas-cable-path.mjs';

test('saved cable corners are rounded while joining actual ports vertically',()=>{
  assert.equal(cablePath({x:47.5,y:64},{x:327.5,y:190},[47.5,100,210,100,210,160,327.5,160]),
    'M 47.5 64 L 47.5 88 Q 47.5 100 59.5 100 L 198 100 Q 210 100 210 112 L 210 148 Q 210 160 222 160 L 315.5 160 Q 327.5 160 327.5 172 L 327.5 190');
});

test('stale endpoint x coordinates render against current ports without rewriting source',()=>{
  const points=[51.5,100,100,100,100,160,171.5,160],saved=[...points];
  assert.equal(cablePath({x:47.5,y:64},{x:147.5,y:190},points),
    'M 47.5 64 L 47.5 88 Q 47.5 100 59.5 100 L 88 100 Q 100 100 100 112 L 100 148 Q 100 160 112 160 L 135.5 160 Q 147.5 160 147.5 172 L 147.5 190');
  assert.deepEqual(points,saved);
});

test('single and repeated saved points render an endpoint-aligned dogleg',()=>{
  for(const points of [[50,100],[50,100,50,100],[50,100,50,100,50,100]]){
    assert.equal(cablePath({x:50,y:70},{x:200,y:140},points),
      'M 50 70 L 50 88 Q 50 100 62 100 L 188 100 Q 200 100 200 112 L 200 140');
  }
});

test('short segments limit corner rounding without overshoot',()=>{
  assert.equal(cablePath({x:50,y:94},{x:60,y:106},[50,100]),
    'M 50 94 L 50 97 Q 50 100 53 100 L 57 100 Q 60 100 60 103 L 60 106');
});

test('coincident ports and collinear or reversing points never produce invalid curves',()=>{
  assert.equal(cablePath({x:50,y:100},{x:50,y:100},[50,100,50,100]),'M 50 100 L 50 100');
  assert.equal(cablePath({x:50,y:70},{x:50,y:140},[50,100,50,110]),'M 50 70 L 50 100 L 50 110 L 50 140');
  assert.equal(cablePath({x:50,y:70},{x:50,y:140},[50,100,50,80]),'M 50 70 L 50 100 L 50 80 L 50 140');
});

test('unrouted and explicitly empty cables keep automatic curves',()=>{
  for(const midpoints of [undefined,[]])assert.equal(cablePath({x:50,y:70},{x:200,y:170},midpoints),
    'M 50 70 C 50 115, 200 125, 200 170');
});

test('camera bounds include every saved bend and ignore automatic routes',()=>{
  assert.deepEqual(cableBounds([{midpoints:[90,800,1100,800,1100,220]},{},{midpoints:[25,900]}]),
    {left:25,top:220,right:1100,bottom:900});
  assert.equal(cableBounds([{}, {midpoints:[]}]),null);
});
