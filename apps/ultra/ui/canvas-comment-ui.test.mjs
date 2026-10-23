import assert from 'node:assert/strict';
import {test} from 'node:test';
import {commentBubbleGeometry} from './canvas-comment-ui.mjs';

test('callouts reserve fifteen pixels on the selected side without expanding the saved box',()=>{
  for(const [side,body,padding,tip] of [
    [0,{x:.5,y:15.5,width:219,height:64},[20,5,5,5],{x:110,y:.5}],
    [1,{x:15.5,y:.5,width:204,height:79},[5,5,5,20],{x:.5,y:40}],
    [2,{x:.5,y:.5,width:219,height:64},[5,5,20,5],{x:110,y:79.5}],
    [3,{x:.5,y:.5,width:204,height:79},[5,20,5,5],{x:219.5,y:40}],
  ]){
    const geometry=commentBubbleGeometry(220,80,side,.5);
    assert.deepEqual(geometry.body,body);assert.deepEqual(geometry.padding,padding);assert.deepEqual(geometry.tip,tip);
  }
});

test('normalized callout points move toward each end of the selected side',()=>{
  assert.deepEqual(commentBubbleGeometry(220,80,0,0).tip,{x:5,y:.5});
  assert.deepEqual(commentBubbleGeometry(220,80,0,1).tip,{x:215,y:.5});
  assert.deepEqual(commentBubbleGeometry(220,80,2,0).tip,{x:5,y:79.5});
  assert.deepEqual(commentBubbleGeometry(220,80,1,0).tip,{x:.5,y:5});
  assert.deepEqual(commentBubbleGeometry(220,80,1,1).tip,{x:.5,y:75});
  assert.deepEqual(commentBubbleGeometry(220,80,3,1).tip,{x:219.5,y:75});
});

test('minimum dimensions and point extremes keep the entire contour and padding bounded',()=>{
  for(const [width,height] of [[12,12],[12,800],[1200,12],[1200,800]])for(const side of [0,1,2,3])for(const point of [0,.5,1]){
    const geometry=commentBubbleGeometry(width,height,side,point),coordinates=geometry.path.match(/-?\d+(?:\.\d+)?/g).map(Number);
    coordinates.forEach((value,index)=>assert.ok(Number.isFinite(value)&&value>=0&&value<=(index%2?height:width)));
    assert.ok(geometry.body.width>0&&geometry.body.height>0);
    assert.ok(geometry.padding[0]+geometry.padding[2]<=height);
    assert.ok(geometry.padding[1]+geometry.padding[3]<=width);
  }
});
