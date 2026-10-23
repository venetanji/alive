// Original synthetic hierarchy/height fixtures. No target or installed source access.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ctx=vm.createContext({jsarguments:['controller','private']});
vm.runInContext(fs.readFileSync(path.join(__dirname,'controller.js'),'utf8'),ctx);
const source='bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61';
const helpers={
 'helpstarter.js':'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
 'helpname.js':'49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
 'helpdetails.js':'31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
 'helpargs.js':'04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'};
const expected=[
 ['root/obj-1','js',[92,94,110,20],'3c299423556feddb0be4ff31bc20e20f1fc305063815420e899f529763daa2e1'],
 ['root/obj-2','patcher',[10,85,50,20],'484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393'],
 ['root/obj-3','patcher',[205,205,50,20],'bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a']
].map(([anchor,cls,rect,text])=>({anchor,maxclass:'newobj',runtime_class:cls,runtime_classes:[cls],rect,
 source_text_sha256:text,saved_incoming_routes:0,saved_outgoing_routes:0,
 shell_height_policy:{kind:'source-bound-int-shell-height',document:'int',source_sha256:source,anchor,
 runtime_class:cls,saved_rect:rect,live_rect:[...rect.slice(0,3),22],source_text_sha256:text,
 helper_sha256:helpers,saved_incoming_routes:0,saved_outgoing_routes:0}}));
ctx.config={helpers:Object.entries(helpers).map(([name,sha256])=>({name,sha256}))};
const definition={document:'int',source_sha256:source,helper_sha256:helpers,full_inventory:expected};
function box(e,height=22){return {maxclass:e.runtime_class,getboxattr:()=>[...e.rect.slice(0,3),height],nextobject:null};}
for(const e of expected){
 const o=box(e),observed=[];
 assert.equal(ctx.resolve({firstobject:o},e,definition,observed),o,'only measured shell heights are admitted');
 assert.equal(observed.length,1,'accepted discrepancy must be retained');
 assert.equal(observed[0].live_rect[3],22);
 assert.throws(()=>ctx.resolve({firstobject:o},e,definition),'a discrepancy cannot be silently discarded');
 for(const h of [19,21,22.005,23,30])assert.throws(()=>ctx.resolve({firstobject:box(e,h)},e,definition,[]));
 const changed=box(e);changed.getboxattr=()=>[e.rect[0]+1,e.rect[1],e.rect[2],22];
 assert.throws(()=>ctx.resolve({firstobject:changed},e,definition,[]));
 const duplicate=box(e);o.nextobject=duplicate;assert.throws(()=>ctx.resolve({firstobject:o},e,definition,[]));o.nextobject=null;
 for(const mutate of [d=>d.document='float',d=>d.source_sha256='0'.repeat(64),
   d=>d.helper_sha256={...helpers,'helpstarter.js':'0'.repeat(64)}]){
  const bad=JSON.parse(JSON.stringify(definition));mutate(bad);assert.throws(()=>ctx.resolve({firstobject:o},e,bad,[]));
 }
 for(const mutate of [b=>b.anchor='root/obj-2/obj-1',b=>b.runtime_class='number',
   b=>b.saved_incoming_routes=1,b=>b.source_text_sha256='0'.repeat(64)]){
  const bad=JSON.parse(JSON.stringify(e));mutate(bad);assert.throws(()=>ctx.resolve({firstobject:o},bad,definition,[]));
 }
}
const basic={anchor:'root/obj-2/obj-16',maxclass:'number',runtime_class:'number',rect:[5,5,40,20],child:false};
assert.throws(()=>ctx.resolve({firstobject:box(basic)},basic,definition,[]),'Basic height remains strict');
// Root failure must not hide failures in independently named, resolvable child scopes.
const one=box({...basic,rect:[5,5,40,20]},21),two=box({...basic,rect:[60,5,40,20]},21);one.nextobject=two;
const child={firstobject:one};const container=box(expected[1],23);container.varname='synthetic_basic';container.subpatcher=()=>child;
const starter=box(expected[0],23);starter.nextobject=container;
const broken={...definition,full_inventory:[expected[0],{...expected[1],child:true,source_varname:'synthetic_basic'},
 basic,{...basic,anchor:'root/obj-2/obj-17',rect:[60,5,40,20]}]};
const root={firstobject:starter};
assert.throws(()=>ctx.validateTree(root,broken));
assert.deepEqual(Array.from(ctx.anchorDiagnostics.filter(d=>d.expected_anchor).map(d=>d.expected_anchor)).sort(),
 ['root/obj-1','root/obj-2','root/obj-2/obj-16','root/obj-2/obj-17'].sort(),'all resolvable failures must aggregate');
const count=ctx.anchorDiagnostics.length;
assert.throws(()=>ctx.validateTree(root,broken));assert.equal(ctx.anchorDiagnostics.length,count,'settling attempts must replace failures');
let mutations=0;Object.defineProperty(one,'varname',{set(){mutations++}});root.newdefault=()=>{mutations++};
assert.throws(()=>ctx.bind(root,broken));assert.equal(mutations,0,'failed hierarchy preflight must mutate nothing');
starter.getboxattr=()=>[92,94,110,22];container.getboxattr=()=>[10,85,50,22];
one.getboxattr=()=>[5,5,40,20];two.getboxattr=()=>[60,5,40,20];root.getnamed=()=>container;
const badBasic={...broken,basic_varname:'synthetic_basic',boxes:[basic,{...basic,anchor:'root/obj-2/obj-17',
 rect:[60,5,40,20],shell_height_policy:{}}]};
assert.throws(()=>ctx.bind(root,badBasic));assert.equal(mutations,0,'invalid Basic policy must fail before mutation');
console.log('shell: exact int-only height disposition, source/helper/route binding, strict Basic and aggregate preflight pass');
