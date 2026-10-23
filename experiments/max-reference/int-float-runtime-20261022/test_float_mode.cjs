// Exact source float-mode gate and raw getter representations.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
function context(file){const c=vm.createContext({jsarguments:[file,'private','float',1]});
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),c);return c;}
const ctx=context('controller.js'),reader=context('v8-readback.js');
const source='c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c';
const helpers={
 'helpstarter.js':'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
 'helpname.js':'49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
 'helpdetails.js':'31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
 'helpargs.js':'04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'};
const attrs={inlets:1,outlets:2,format:6,numdecimalplaces:null,fontname:'Arial',fontsize:13,
 outlettype:['','bang'],parameter_enable:0};
const rects={'obj-16':[194,230.5,54,23],'obj-17':[265,230.5,54,23],
 'obj-21':[220,330.5,54,23],'obj-33':[117,380.5,54,23]};
const definition={document:'float',source_sha256:source,revision:1,helper_sha256:helpers,saved_edges:[]};
ctx.config={helpers:Object.entries(helpers).map(([name,sha256])=>({name,sha256}))};
const empty='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const modeBoxes=[],modeObjects=[];
for(const [id,rect] of Object.entries(rects)){
 const b={id,anchor:'root/obj-2/'+id,maxclass:'flonum',runtime_class:'flonum',rect,outlets:2,
 source_text_sha256:empty,source_attributes:attrs,numeric_mode_policy:{kind:'source-bound-float-number-mode',
 document:'float',source_sha256:source,anchor:'root/obj-2/'+id,source_class:'flonum',runtime_class:'number',
 saved_rect:rect,source_text_sha256:empty,source_attributes:attrs,helper_sha256:helpers,
 getter_method:'getattr',attribute:'format',getter_representation:'scalar-number',required_value:6}};
 const o={maxclass:'number',getboxattr:()=>rect.slice(),getattr:a=>{assert.equal(a,'format');return 6},nextobject:null};
 modeBoxes.push(b);modeObjects.push(o);
 ctx.numericModeObservations=[];
 assert.equal(ctx.resolve({firstobject:o},b,definition,[]),o);
 assert.equal(ctx.numericModeObservations.length,1);
 const observed=reader.numericModeObservation(o,b,definition);
 assert.equal(observed.runtime_class,'number');assert.equal(observed.getter_value,6);
 for(const value of [null,undefined,true,'6',[6],NaN,Infinity,0,6.001]){
  const bad={...o,getattr:()=>value};
  assert.throws(()=>ctx.resolve({firstobject:bad},b,definition,[]));
  assert.throws(()=>reader.numericModeObservation(bad,b,definition));
 }
 for(const mutate of [x=>x.source_attributes={...attrs,format:0},x=>x.anchor='root/obj-2/obj-18',
  x=>x.maxclass='number',x=>delete x.numeric_mode_policy]){
  const bad=JSON.parse(JSON.stringify(b));mutate(bad);
  assert.throws(()=>ctx.resolve({firstobject:o},bad,definition,[]));
 }
 const moved={...o,getboxattr:()=>[rect[0],rect[1],rect[2]+1,rect[3]]};
 assert.throws(()=>ctx.resolve({firstobject:moved},b,definition,[]));
}
assert.throws(()=>ctx.resolve({firstobject:{maxclass:'number',getboxattr:()=>[1,2,30,20]}},
 {anchor:'root/obj-2/synthetic',maxclass:'flonum',runtime_class:'flonum',rect:[1,2,30,20]},definition,[]));
const commentAttrs={inlets:1,outlets:0,fontname:'Arial',fontsize:13,bubble:1,bubbleside:null,
 bubblepoint:null,bubbletextmargin:null,linecount:3};
const geometry=[
 ['root/obj-1','newobj','js',[374,27.5,120,20],[374,27.5,120,22],
 'e9cd2d2ae24129f7ce891e9a5ee418d273b18a0b2641d3f3beb34be09def8ab5'],
 ['root/obj-2','newobj','patcher',[10,85,50,20],[10,85,50,22],
 '484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393'],
 ['root/obj-3','newobj','patcher',[205,205,50,20],[205,205,50,22],
 'bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a'],
 ['root/obj-2/obj-3','comment','comment',[411,156.5,133,54],[411,156.5,133,55],
 'de8dbc68910ee493e95c0bad7d48cf0b12577baa5955cd7d894aa80cae1fb027',commentAttrs],
 ['root/obj-2/obj-5','comment','comment',[14,201.5,143,54],[14,201.5,143,55],
 '96d3d71a61b0f13d7c759315dc9e49578d5c542d24ac120753d628392a55723d',
 {...commentAttrs,bubbleside:3,bubblepoint:.75}],
 ['root/obj-2/obj-4','jsui','jsui',[289,274,190.328094,39],[289,274,190.31402587890625,39],empty,
 {inlets:1,outlets:1,filename:'helpargs.js',ignoreclick:1,border:0,parameter_enable:0,outlettype:[''],
 jsarguments_sha256:'a6c871ff72c57f35934325de26fba3add81b1df8935af30a164fb9a13117949a'}]];
for(const [anchor,maxclass,runtime_class,rect,actual,text,source_attributes] of geometry){
 const annotation=!!source_attributes;
 const b={anchor,maxclass,runtime_class,rect,source_text_sha256:text,saved_incoming_routes:0,saved_outgoing_routes:0};
 if(annotation)b.source_attributes=source_attributes;
 b[annotation?'annotation_geometry_policy':'shell_height_policy']={
 kind:'source-bound-float-'+(annotation?'annotation-geometry':'shell-height'),document:'float',source_sha256:source,
 anchor,runtime_class,saved_rect:rect,live_rect:actual,source_text_sha256:text,helper_sha256:helpers,
 saved_incoming_routes:0,saved_outgoing_routes:0};
 if(annotation)b.annotation_geometry_policy.source_attributes=source_attributes;
 const o={maxclass:runtime_class,getboxattr:()=>actual.slice(),nextobject:null},sink=[];
 assert.equal(ctx.resolve({firstobject:o},b,definition,sink),o);assert.equal(sink.length,1);
 const altered=actual.slice();altered[runtime_class==='jsui'?2:3]+=.0001;
 assert.throws(()=>ctx.resolve({firstobject:{...o,getboxattr:()=>altered}},b,definition,[]));
 assert.throws(()=>ctx.resolve({firstobject:o},b,{...definition,document:'int'},[]));
}
for(let i=0;i<modeObjects.length;i++){
 const o=modeObjects[i];o.nextobject=modeObjects[i+1]||null;
 o.varname='__alive_help_'+modeBoxes[i].id.replace(/-/g,'_');o.getvalueof=()=>[0];o.patchcords={inputs:[],outputs:[]};
}
const basic={firstobject:modeObjects[0]},container={maxclass:'patcher',getboxattr:()=>[0,0,50,22],
 subpatcher:()=>basic,nextobject:null};
const root={firstobject:container,getnamed:()=>container,filepath:'Z:/synthetic-float.maxhelp',parentpatcher:null};
const full={...definition,boxes:modeBoxes,basic_varname:'synthetic_basic',working_windows_path:root.filepath,
 full_inventory:[{anchor:'root/obj-2',maxclass:'newobj',runtime_class:'patcher',rect:[0,0,50,22],child:true},...modeBoxes]};
const request={op:'readback',document:'float',revision:1,source_sha256:source,command_id:2};
const raw=reader.collectReadback(root,full,request);
assert.equal(raw.numeric_modes.length,4);assert.equal(raw.boxes[0].maxclass,'number');
let mutations=0,connections=0;basic.newdefault=()=>{mutations++;return {}};
basic.connect=()=>{connections++};root.newdefault=()=>{mutations++;return {setboxattr(){}}};root.connect=()=>{};
ctx.config.lifecycle={owners:[{document:'float',revision:1,channel:'synthetic_private'}]};full.lifecycle_owner_inlet=0;
ctx.bind(root,full);assert.equal(ctx.numericModeObservations.length,4);assert.equal(connections,8);
mutations=0;modeObjects[0].getattr=()=>'6';
assert.throws(()=>ctx.bind(root,full));assert.equal(mutations,0);
try{reader.collectReadback(root,full,request);assert.fail('coerced format must refuse');}
catch(error){assert.equal(error.numeric_mode_observation.getter_representation,'string');
 assert.equal(error.numeric_mode_observation.getter_value,'6');}
console.log('float modes: four exact source anchors require scalar read-only format6 with strict geometry');
