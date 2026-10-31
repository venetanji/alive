import {makeNode,validatePatch} from './canvas-model.mjs';

const control=(id,label,node,param,x)=>({id,kind:'control',target:{kind:'parameter',node,param},widget:'dial',label,rect:{x,y:8,width:88,height:96},included:true,visible:true,style:{accent:'cyan',labelPosition:'above'}});
const edges=routes=>routes.map(([from,outlet,to,inlet])=>({from,outlet,to,inlet}));
const manifest=(id,name,parameters,presets)=>({version:2,kind:'audioEffect',id,name,
  midi:{input:null,output:null},audio:{input:{node:1,bundle:{channels:2,layout:'stereo'}},output:{channels:2,layout:'stereo'}},parameters,presets});

// The shared line~ gain remains an authored signal feeding both multiplies.
export function utilityPatch(){
  return validatePatch({version:1,profile:'ultra-canvas-v1',presentation:{version:1,openOnLoad:false,size:{width:160,height:112},items:[control('gain','Gain',2,'value',8)]},nodes:[
    makeNode('audio_in',1,75,70),makeNode('line_signal',2,350,70,{value:1}),
    makeNode('signal_multiply',3,75,190),makeNode('signal_multiply',4,240,190),makeNode('signal_dac',5,75,300),
  ],edges:edges([[1,0,3,0],[1,1,4,0],[2,0,3,1],[2,0,4,1],[3,0,5,0],[4,0,5,1]]),
  device:manifest('org.alive.utility','Stereo Utility',[
    {key:'gain',label:'Gain',node:2,param:'value',min:0,max:2,unit:'linear'},
  ],[{name:'Unity',values:{gain:1}},{name:'Half',values:{gain:.5}},{name:'Silence',values:{gain:0}}])});
}

export function stereoLowpassPatch(){
  return validatePatch({version:1,profile:'ultra-canvas-v1',presentation:{version:1,openOnLoad:false,size:{width:240,height:112},items:[control('cutoff','Cutoff',2,'cutoff',8),control('resonance','Resonance',2,'resonance',112)]},nodes:[
    makeNode('audio_in',1,75,70),makeNode('filter_stereo',2,75,190),makeNode('signal_dac',3,75,300),
  ],edges:edges([[1,0,2,0],[1,1,2,1],[2,0,3,0],[2,1,3,1]]),
  device:manifest('org.alive.stereo-lowpass','Stereo Lowpass',[
    {key:'cutoff',label:'Cutoff',node:2,param:'cutoff',min:20,max:20000,unit:'Hz'},
    {key:'resonance',label:'Resonance',node:2,param:'resonance',min:.1,max:20,unit:'Q'},
  ],[{name:'Init',values:{cutoff:2400,resonance:.7}},{name:'Warm',values:{cutoff:700,resonance:.8}},
    {name:'Resonant',values:{cutoff:4200,resonance:2.5}}])});
}
