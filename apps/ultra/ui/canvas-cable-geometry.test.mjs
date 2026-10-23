import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMidpoints,translatedMidpoints} from './canvas-cable-geometry.mjs';

test('midpoints preserve empty arrays repeated vertices fractional coordinates and exact bounds',()=>{
  for(const value of [[],[0,4000],[10.5,20.25,10.5,20.25],Array(256).fill(4000)]){
    const result=validateMidpoints(value);assert.deepEqual(result,value);assert.notEqual(result,value);
  }
});
test('midpoints reject malformed arrays nonnumbers nonfinite coordinates and excess without coercion',()=>{
  for(const value of [null,undefined,false,{},'1,2',[1],[1,2,3],Array(258).fill(0),[-.1,0],[0,4000.1],[NaN,0],[0,Infinity],[0,'2'],[null,0],new Array(2),new Float64Array([1,2])]){
    assert.throws(()=>validateMidpoints(value),/midpoint/i);
  }
});
test('translation carries only equally moved endpoint pairs and never mutates its inputs',()=>{
  const nodes=[{id:1,x:10,y:20},{id:2,x:80,y:100}],edge={from:1,to:2,midpoints:[30,40,30,40]};
  for(const positions of [[],[{id:1,x:20,y:30}],[{id:1,x:20,y:30},{id:2,x:95,y:110}]]){
    const points=translatedMidpoints(edge,positions,nodes);assert.deepEqual(points,edge.midpoints);assert.notEqual(points,edge.midpoints);
  }
  assert.deepEqual(translatedMidpoints(edge,[{id:1,x:20,y:25},{id:2,x:90,y:105}],nodes),[40,45,40,45]);
  assert.deepEqual(edge.midpoints,[30,40,30,40]);assert.deepEqual(nodes,[{id:1,x:10,y:20},{id:2,x:80,y:100}]);
  assert.equal(translatedMidpoints({from:1,to:2},[],nodes),undefined);
  assert.deepEqual(translatedMidpoints({...edge,midpoints:[]},[{id:1,x:20,y:25},{id:2,x:90,y:105}],nodes),[]);
  assert.throws(()=>translatedMidpoints({...edge,midpoints:[3999,0]},[{id:1,x:20,y:25},{id:2,x:90,y:105}],nodes),/midpoint/i);
});
test('fractional group movement tolerates subtraction roundoff but preserves genuinely different endpoint moves',()=>{
  const nodes=[{id:1,x:10.5,y:20.5},{id:2,x:80.1,y:100.1}],edge={from:1,to:2,midpoints:[30,40]};
  const positions=nodes.map(({id,x,y})=>({id,x:x+.1,y:y+.1}));
  assert.deepEqual(translatedMidpoints(edge,positions,nodes),[30.1,40.1]);
  positions[1].x+=1e-8;
  assert.deepEqual(translatedMidpoints(edge,positions,nodes),edge.midpoints);
});
test('translation removes only floating point boundary drift and rejects genuine overflow',()=>{
  const nodes=[{id:1,x:10.5,y:20.5},{id:2,x:80.1,y:100.1}],edge={from:1,to:2,midpoints:[.1,.1]};
  const positions=nodes.map(({id,x,y})=>({id,x:x-.1,y:y-.1}));
  assert.deepEqual(translatedMidpoints(edge,positions,nodes),[0,0]);
  assert.throws(()=>translatedMidpoints({...edge,midpoints:[0,0]},positions,nodes),/midpoint/i);
});
