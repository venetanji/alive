// In-memory Max APIs for lifecycle fixtures; no runtime or private-file access.
const fs=require('fs'),vm=require('vm'),path=require('path');
module.exports=function create(options={}){
 const owners=Array.from({length:4},(_,inlet)=>({inlet,document:inlet<2?'int':'float',revision:inlet%2+1,
  channel:'private_'+inlet,working_path:'Z:/private/'+inlet,source_sha256:'a'.repeat(64)}));
 const inventory=[{varname:'__alive_numeric_controller',maxclass:'js',boxtext:'js synthetic',rect:[0,0,100,22]},
  {varname:'__alive_numeric_lifecycle_observer',maxclass:'v8',boxtext:'v8 synthetic',rect:[0,30,100,22]},
  ...owners.map(o=>({varname:'__alive_numeric_lifecycle_receive_'+o.inlet,maxclass:'receive',
   boxtext:'receive '+o.channel,rect:[0,60+o.inlet*30,100,22]}))];
 const config={lifecycle:{version:'freebang-v1',monitor_epoch:'e'.repeat(48),owners,
  driver_inventory:inventory,report_path:'synthetic-report'}};
 const files={'synthetic-config':JSON.stringify(config)};
 class File{
  constructor(filename,mode){this.name=filename;this.isopen=mode!=='read'||Object.hasOwn(files,filename);
   if(mode!=='read')files[filename]='';this.position=0;}
  get eof(){return (files[this.name]||'').length;}
  set eof(n){files[this.name]=(files[this.name]||'').slice(0,n);}
  readstring(n){const chunk=files[this.name].slice(this.position,this.position+n);this.position+=chunk.length;return chunk;}
  writestring(s){const old=files[this.name];files[this.name]=old.slice(0,this.position)+s+old.slice(this.position+s.length);
   this.position+=s.length;}
  close(){this.isopen=false;}
 }
 const boxes=inventory.map(e=>({...e,valid:true,getboxattr:()=>e.rect.slice(),patchcords:{inputs:[],outputs:[]}}));
 boxes.forEach((b,i)=>b.nextobject=boxes[i+1]||null);
 owners.forEach((o,i)=>{const cord={srcobject:boxes[i+2],srcoutlet:0,dstobject:boxes[1],dstinlet:i+1};
  boxes[i+2].patchcords.outputs.push(cord);boxes[1].patchcords.inputs.push(cord);});
 const ctx=vm.createContext({File,inlet:0,patcher:{firstobject:boxes[0]}});
 if(options.lexicalArguments)vm.runInContext('let jsarguments=["v8","synthetic-config"];',ctx);
 else ctx.jsarguments=['v8','synthetic-config'];
 if(Object.hasOwn(options,'bootstrapThrown')){
  const literal=options.bootstrapThrown===undefined?'undefined':JSON.stringify(options.bootstrapThrown);
  vm.runInContext('Object.defineProperty(this,"jsarguments",{get(){throw '+literal+';}});',ctx);
 }
 vm.runInContext(fs.readFileSync(path.join(__dirname,'lifecycle-observer.js'),'utf8'),ctx);
 function report(){return JSON.parse(files['synthetic-report']);}
 function control(kind,inlet=2,request=125,step='close-float'){
  ctx.inlet=0;ctx.lifecyclecontrol(kind,inlet,request,step);return report();}
 function fire(index=2,callback='bang'){ctx.inlet=index+1;ctx[callback]();return report();}
 return {ctx,owners,config,boxes,files,report,control,fire};
};
