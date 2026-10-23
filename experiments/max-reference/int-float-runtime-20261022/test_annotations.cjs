// Metadata-only fixtures for the two finite int annotations.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ctx=vm.createContext({jsarguments:['controller','private']});
vm.runInContext(fs.readFileSync(path.join(__dirname,'controller.js'),'utf8'),ctx);
const source='bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61';
const helpers={
 'helpstarter.js':'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
 'helpname.js':'49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
 'helpdetails.js':'31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
 'helpargs.js':'04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'};
const attrs=[{inlets:1,outlets:0,fontname:'Arial',fontsize:13,bubble:1,bubbleside:3,
 bubblepoint:.75,bubbletextmargin:null,linecount:3},
 {inlets:1,outlets:1,filename:'helpargs.js',ignoreclick:1,
 jsarguments_sha256:'c511da579364be932435a248bf3f04254e5c257664551ad10ac69cdc4170a098',
 border:0,parameter_enable:0,outlettype:['']}];
const live=[[11,186.5,143,55],[291,296,208.19552612304688,39]];
const expected=[['obj-23','comment',[11,186.5,143,54],
 '96d3d71a61b0f13d7c759315dc9e49578d5c542d24ac120753d628392a55723d'],
 ['obj-4','jsui',[291,296,208.315216,39],
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855']].map(([id,cls,rect,text],i)=>({
 id,anchor:'root/obj-2/'+id,maxclass:cls,runtime_class:cls,rect,outlets:attrs[i].outlets,
 source_text_sha256:text,source_attributes:attrs[i],saved_incoming_routes:0,saved_outgoing_routes:0,
 annotation_geometry_policy:{kind:'source-bound-int-annotation-geometry',document:'int',source_sha256:source,
 anchor:'root/obj-2/'+id,runtime_class:cls,saved_rect:rect,live_rect:live[i],source_text_sha256:text,
 source_attributes:attrs[i],helper_sha256:helpers,saved_incoming_routes:0,saved_outgoing_routes:0}}));
ctx.config={helpers:Object.entries(helpers).map(([name,sha256])=>({name,sha256})),ack_path:'private'};
const definition={document:'int',source_sha256:source,revision:1,helper_sha256:helpers,saved_edges:[]};
function object(i,rect=live[i]){return {maxclass:expected[i].runtime_class,getboxattr:()=>rect.slice(),nextobject:null};}
for(let i=0;i<2;i++){
 const e=expected[i],o=object(i),retained=[];
 assert.equal(ctx.resolve({firstobject:o},e,definition,retained),o);
 assert.equal(retained.length,1,'accepted annotation discrepancy is retained');
 assert.throws(()=>ctx.resolve({firstobject:o},e,definition),'disposition sink is required');
 for(const [component,delta] of [[i===0?3:2,.0001],[0,1],[1,1],[i===0?2:3,1]]){
  const rect=live[i].slice();rect[component]+=delta;
  assert.throws(()=>ctx.resolve({firstobject:object(i,rect)},e,definition,[]));
 }
 for(const mutate of [d=>d.document='float',d=>d.helper_sha256={...helpers,'helpargs.js':'0'.repeat(64)},
  d=>d.saved_edges=[{source:[e.id,0],destination:['obj-16',0]}]]){
  const d=JSON.parse(JSON.stringify(definition));mutate(d);assert.throws(()=>ctx.resolve({firstobject:o},e,d,[]));
 }
 for(const mutate of [b=>b.source_text_sha256='0'.repeat(64),b=>b.source_attributes.inlets=2,
  b=>b.anchor='root/obj-2/obj-16',b=>b.saved_incoming_routes=1]){
  const b=JSON.parse(JSON.stringify(e));mutate(b);assert.throws(()=>ctx.resolve({firstobject:o},b,definition,[]));
 }
 o.nextobject=object(i);assert.throws(()=>ctx.resolve({firstobject:o},e,definition,[]));
}
const basic={firstobject:object(0)};basic.firstobject.nextobject=object(1);
const container={maxclass:'patcher',getboxattr:()=>[0,0,50,22],subpatcher:()=>basic,nextobject:null};
const root={firstobject:container,getnamed:()=>container};let mutations=0,connections=0;
basic.newdefault=()=>{mutations++;return {}};basic.connect=()=>{connections++};
root.newdefault=()=>{mutations++;return {setboxattr(){}}};root.connect=()=>{};
ctx.config.lifecycle={owners:[{document:'int',revision:1,channel:'synthetic_private'}]};
const full={...definition,lifecycle_owner_inlet:0,basic_varname:'synthetic_basic',boxes:expected,
 full_inventory:[{anchor:'root/obj-2',runtime_class:'patcher',maxclass:'newobj',rect:[0,0,50,22],child:true},...expected]};
ctx.bind(root,full);
assert.equal(ctx.geometryDispositions.length,2,'full-tree and Basic matches deduplicate');
assert.equal(connections,1,'the helper retains its declared outlet leaf');
let ack;ctx.write=(p,v)=>{ack=v};ctx.record=()=>{};
ctx.fail({command_id:1},Error('synthetic failure'));
assert.equal(ack.geometry_dispositions.length,2,'failed ACK retains accepted discrepancies');
mutations=0;const bad=JSON.parse(JSON.stringify(full));bad.boxes[1].source_attributes.ignoreclick=0;
assert.throws(()=>ctx.bind(root,bad));assert.equal(mutations,0,'failed Basic policy mutates nothing');
console.log('annotations: exact int profiles, strict identities, deduplicated ACKs and retained helper leaf pass');
