import {makeNode,validatePatch} from './canvas-model.mjs';
import {deviceValues} from './canvas-device.mjs';

export function packageInstrument(patch,{id=patch.device?.id??'org.alive.instrument',name=patch.device?.name??'Subtractive instrument'}={}){
  if(Object.hasOwn(patch,'device')){
    // Validate the existing interface against the graph before changing its identity.
    validatePatch(patch);
    return validatePatch({...patch,device:{...patch.device,id,name}});
  }
  const all=scope=>scope.nodes.flatMap(node=>[node,...(node.type==='patcher'?all(node.patcher):[])]);
  const nodes=all(patch),find=type=>{
    const matches=nodes.filter(node=>node.type===type);
    if(matches.length!==1)throw Error(`Package instrument requires exactly one ${type} object.`);
    return matches[0].id;
  };
  const poly=find('poly_note'),envelope=find('adsr_voice'),filter=find('filter_voice'),gain=find('gain');
  const parameter=(key,label,node,param,min,max,unit)=>({key,label,node,param,min,max,unit});
  const control=(id,label,node,param,x)=>({id,kind:'control',target:{kind:'parameter',node,param},widget:'dial',label,rect:{x,y:8,width:80,height:96},included:true,visible:true,style:{accent:'default',labelPosition:'above'}});
  const presentation={version:1,openOnLoad:false,size:{width:640,height:112},items:[
    control('attack','Attack',envelope,'attack',8),control('decay','Decay',envelope,'decay',96),
    control('sustain','Sustain',envelope,'sustain',184),control('release','Release',envelope,'release',272),
    control('cutoff','Cutoff',filter,'cutoff',360),control('resonance','Resonance',filter,'resonance',448),
    control('level','Level',gain,'value',536),
  ]};
  const next={...patch,presentation:patch.presentation===null?presentation:patch.presentation,device:{version:2,kind:'instrument',id,name,midi:{input:{node:poly,inlet:0},output:null},audio:{input:null,output:{channels:2,layout:'stereo'}},parameters:[
    parameter('attack','Attack',envelope,'attack',1,10000,'ms'),
    parameter('decay','Decay',envelope,'decay',1,10000,'ms'),
    parameter('sustain','Sustain',envelope,'sustain',0,1,''),
    parameter('release','Release',envelope,'release',1,10000,'ms'),
    parameter('cutoff','Cutoff',filter,'cutoff',20,20000,'Hz'),
    parameter('resonance','Resonance',filter,'resonance',0.1,20,'Q'),
    parameter('level','Level',gain,'value',0,127,'raw'),
  ],presets:[]}};
  next.device.presets.push({name:'Init',values:deviceValues(next)});
  return validatePatch(next);
}

// An original editable example. Every audible route is a normal saved cable.
export function subtractivePatch(){
  const nodes=[
    makeNode('midiin',1,75,50,{channel:1}),
    makeNode('poly_note',2,75,115),
    makeNode('saw_voice',3,75,190),
    makeNode('filter_voice',4,75,260),
    makeNode('adsr_voice',5,350,260),
    makeNode('multiply_voice',6,170,345),
    makeNode('multiply_voice',7,170,415),
    makeNode('mix_voice',8,170,480),
    makeNode('gain',9,170,535,{value:90}),
    makeNode('join',10,170,610),
    makeNode('dac',11,170,675),
    makeNode('toggle',12,660,50),
    makeNode('metro',13,660,115,{interval:250}),
    makeNode('counter',14,660,190,{steps:8}),
    makeNode('chord',15,660,260,{root:48,shape:1}),
    makeNode('makenote',16,660,345,{velocity:100,duration:400}),
  ];
  nodes[8].style={width:180,height:30,orientation:1};
  const edges=[[1,0,2,0],[2,0,3,0],[3,0,4,0],[2,1,5,0],[4,0,6,0],
    [5,0,6,1],[6,0,7,0],[2,2,7,1],[7,0,8,0],[8,0,9,0],
    [9,0,10,0],[9,0,10,1],[10,0,11,0],[12,0,13,0],[13,0,14,0],
    [14,0,15,0],[15,0,16,0],[16,0,2,0]].map(([from,outlet,to,inlet])=>({from,outlet,to,inlet}));
  const patch=packageInstrument({version:1,profile:'ultra-canvas-v1',presentation:null,nodes,edges},{id:'org.alive.subtractive',name:'Subtractive'});
  patch.device.presets.push({name:'Soft',values:{attack:80,decay:450,sustain:0.5,release:800,cutoff:700,resonance:0.8,level:80}},
    {name:'Pluck',values:{attack:2,decay:170,sustain:0.12,release:120,cutoff:4200,resonance:2.5,level:85}});
  return validatePatch(patch);
}
