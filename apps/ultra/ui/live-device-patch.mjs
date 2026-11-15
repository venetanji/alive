import {makeNode,validatePatch} from './canvas-model.mjs';

export function liveDevicePatch(state){
 return validatePatch({version:2,profile:'ultra-patcher-v2',nodes:[
  makeNode('live_device',1,50,110,state?{device:'Analog',state}:{}),
  makeNode('message_box',2,50,40,{text:'60 100'}),makeNode('message_box',3,180,40,{text:'60 0'}),
  makeNode('signal_multiply',4,50,440,{rhs:.15}),makeNode('signal_multiply',5,260,440,{rhs:.15}),
  makeNode('signal_dac',6,50,520),
 ],edges:[[2,0,1,0],[3,0,1,0],[1,0,4,0],[1,1,5,0],[4,0,6,0],[5,0,6,1]].map(([from,outlet,to,inlet])=>({from,outlet,to,inlet}))});
}
