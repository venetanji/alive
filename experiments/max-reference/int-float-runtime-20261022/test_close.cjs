// Synthetic supported close proof; no Max/Wine/display/source/preparation access.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'controller.js'),'utf8');
const createLifecycle=require('./lifecycle-fixture.cjs');
const helpers={'helpstarter.js':'a'.repeat(64),'helpname.js':'b'.repeat(64),
 'helpdetails.js':'c'.repeat(64),'helpargs.js':'d'.repeat(64)};
const command={op:'operation',action:'close',document:'float',action_revision:1,
 source_sha256:'e'.repeat(64),command_id:125,step_id:'close-float'};
function run(options={}) {
 const ctx=vm.createContext({jsarguments:['js','synthetic-config']});vm.runInContext(source,ctx);
 const life=createLifecycle(),owners=life.owners;
 const pending=[],acks=[],journal=[];let disposed=false,disposeCalls=0,serializedObjects=0,poll=0;
 function opaque(object) {object.toJSON=()=>{++serializedObjects;throw Error('runtime object serialized');};
  object.toString=()=>{++serializedObjects;throw Error('runtime object stringified');};return object;}
 function handle(name) {return opaque(Object.defineProperty({},'valid',{get:()=>{
  if(options.valid)return options.valid(name,disposed,poll);return !disposed;}}));}
 const root=opaque({filepath:'Z:/private/float-r1.maxhelp'});
 if(options.rootValid)Object.defineProperty(root,'valid',{get:()=>options.rootValid(disposed)});
 const reader=handle('reader'),disposer=handle('disposer'),freebang=handle('freebang'),send=handle('send');
 disposer.message=selector=>{assert.equal(selector,'dispose');++disposeCalls;
  if(options.disposeThrow)throw Error('dispose unavailable');disposed=true;
  if(options.witness!==false){life.fire(options.crossOwner?0:2);if(options.duplicate)life.fire();}
 };
 const objects={};for(let i=1;i<=23;++i)objects['root/obj-2/obj-'+i]=handle('original-'+i);
 const first=handle('first');Object.defineProperty(root,'firstobject',{get(){
  if(options.firstobjectThrow)throw Error('firstobject unavailable');return disposed?null:first;}});
 const wind=opaque({assocclass:'jpatcher',assoc:root});
 Object.defineProperty(wind,'visible',{get:()=>true});Object.defineProperty(root,'wind',{get:()=>wind});
 const state={patcher:root,reader,disposer,freebang,lifecycleSend:send,objects,definition:{document:'float',revision:1,
  source_sha256:'e'.repeat(64),working_windows_path:'Z:/private/float-r1.maxhelp',helper_sha256:helpers,
  lifecycle_owner_inlet:2}};
 owners[2]={...owners[2],working_path:root.filepath,root_proof_path:'synthetic-proof'};
 const retained={};ctx.roots={int:retained,float:state};ctx.shared={};
 ctx.config={ack_path:'synthetic-ack',command_path:'synthetic-command',
  package_sha256:{'lifecycle-observer.js':'d'.repeat(64)},lifecycle:life.config.lifecycle};
 ctx.Task=function(fn,owner){this.schedule=ms=>{assert.equal(ms,100);pending.push(()=>{++poll;fn.call(owner);});};};
 ctx.read=()=>command;ctx.record=(kind,extra)=>journal.push({kind,...extra});
 ctx.write=(filename,value)=>{assert.equal(filename,'synthetic-ack');acks.push(JSON.parse(JSON.stringify(value)));};
 ctx.requestLifecycleProof=(s,c,done)=>done({version:'freebang-v1',request_id:c.command_id});
 ctx.lifecycleControl=(kind,index,c)=>life.control(kind,index,c.command_id,c.step_id);
 ctx.tick();while(pending.length){assert.ok(poll<30);pending.shift()();}
 assert.equal(serializedObjects,0);assert.equal(acks.length,1);assert.equal(ctx.roots.int,retained);
 return {ctx,state,ack:acks[0],journal,polls:poll,disposeCalls};
}
function refused(result,attempted=true){assert.equal(result.ack.success,false);assert.equal(result.ctx.roots.float,result.state);
 assert.equal(result.disposeCalls,attempted?1:0);assert.equal(result.journal.filter(x=>x.kind==='step-complete').length,0);
 if(attempted&&!result.ack.close_diagnostics.dispose.result.status.includes('threw'))assert.equal(result.polls,30);
 return result.ack.close_diagnostics;}
for(const invalid of [false,0]){
 const positive=run({valid:(name,closed)=>closed?invalid:true});
 assert.equal(positive.ack.success,true);assert.equal(positive.ack.closed_owner_absence_validated,true);
 assert.equal(positive.ctx.roots.float,undefined);assert.equal(positive.polls,30);
 const d=positive.ack.close_diagnostics;assert.equal(d.samples.length,31);assert.equal(d.lifecycle_evidence.version,'freebang-v1');
 for(let i=0;i<31;++i){const s=d.samples[i];assert.equal(s.phase,i?'poll':'before-dispose');assert.equal(s.attempt,i);
  assert.deepEqual(s.root_valid,{status:'returned',type:'undefined'});assert.equal(s.objects.length,23);
  assert.equal(s.harness_objects.length,2);assert.equal(s.retained_firstobject_valid.value,i?invalid:true);
  assert.equal(s.firstobject.type,i?'null':'object');assert.equal(s.wind_visible.value,true);
  assert.equal(s.root_filepath.value,'Z:/private/float-r1.maxhelp');assert.equal(s.wind_assocclass.value,'jpatcher');}
 const c2={...command,command_id:126};positive.ctx.fail(c2,Error('next refusal'));
 assert.equal(positive.ack.close_diagnostics.request_id,125);
}
refused(run({witness:false}));refused(run({duplicate:true}));refused(run({crossOwner:true}));
for(const handle of ['reader','disposer','freebang','send','first','original-4']){
 refused(run({valid:(name,closed)=>name===handle?true:!closed}));
 for(const bad of [undefined,null,'0',NaN,Infinity,2,{},()=>false])
  refused(run({valid:(name,closed)=>closed&&name===handle?bad:!closed}));
 refused(run({valid:(name,closed)=>{if(closed&&name===handle)throw Error('unavailable');return !closed;}}));
}
const delayed=run({valid:(name,closed,poll)=>!closed||poll<5});assert.equal(delayed.ack.success,true);
refused(run({valid:(name,closed,poll)=>!closed||(name==='reader'&&poll===20)}));
refused(run({firstobjectThrow:true}),false);
const thrown=refused(run({disposeThrow:true}));assert.equal(thrown.samples.length,1);
// Patcher.valid, including a throwing getter, is retained diagnostic information only.
assert.equal(run({rootValid:()=>{throw Error('undocumented');}}).ack.success,true);
console.log('close: missing Patcher.valid supported only with witness+owned invalidity; full31 typed diagnostics and bounded convergence pass');
