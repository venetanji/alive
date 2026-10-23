// Synthetic Max APIs only. No Max, Wine, display, browser or source files.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const path = require('path');
const ctx = vm.createContext({jsarguments:['js','private-config'],console});
const file=path.join(__dirname,'controller.js');
if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
assert.equal(typeof ctx.dispatch, 'function','typed dispatch capability absent');
let calls=[];const object={message(...args){calls.push(args)}};
ctx.dispatch(object,{selector:'float',atoms:[{tag:'float',value:7}]});
assert.deepEqual(calls,[['float',7]],'must invoke actual float selector for whole float');
for(const msg of [{selector:'int',atoms:[{tag:'float',value:7}]},
 {selector:'float',atoms:[{tag:'float',value:null}]},{selector:'bang',atoms:[1]}]){
 assert.throws(()=>ctx.dispatch(object,msg));
}
assert.equal(calls.length,1);
const a={maxclass:'number',getboxattr:()=>[1,2,30,20]}, b={maxclass:'number',getboxattr:()=>[1,2,31,20]};
a.nextobject=b;b.nextobject=null;
assert.equal(ctx.resolve({firstobject:a},{id:'obj-1',maxclass:'number',runtime_class:'number',rect:[1,2,30,20]}),a);
assert.throws(()=>ctx.resolve({firstobject:a},{id:'obj-1',maxclass:'number',runtime_class:'number',rect:[1,2,32,20]}));
b.getboxattr=()=>[1,2,30,20];assert.throws(()=>ctx.resolve({firstobject:a},{id:'obj-1',maxclass:'number',runtime_class:'number',rect:[1,2,30,20]}));
assert.equal(ctx.samePath('Z:/private/I-r1.maxhelp','Z:\\private\\I-r1.maxhelp'),true);
let tasks=[],written=[],journal=[],opened=[];
ctx.Task=function(fn,owner){this.fn=()=>fn.call(owner);this.schedule=()=>tasks.push(this);this.repeat=()=>{};};
ctx.Global=function(){return {};};
ctx.write=(p,v)=>written.push(v);ctx.record=(kind,v)=>journal.push({kind,...v});
ctx.read=()=>ctx.config;
ctx.config={global_name:'synthetic',ready_path:'private',ack_path:'ack',documents:[],lifecycle:{driver_inventory:[],owners:[]}};
ctx.lifecycleControl=()=>({observer_report:{failures:[]}});
ctx.start();const recurring=ctx.ticker;
assert.ok(recurring,'start must retain the repeating task');
assert.deepEqual(Object.keys(ctx.roots),[],'driver must start with no owners');
function root(doc,rev){
 const number={maxclass:'number',getboxattr:()=>[1,2,30,20],nextobject:null,valid:true,
  message(selector,value){this.last={selector,value};}};
 const basic={firstobject:number,newdefault(){return {valid:true}},connect(){}};
 const shell={maxclass:'patcher',varname:'basic_tab',getboxattr:()=>[0,0,100,100],subpatcher:()=>basic,nextobject:null};
 const objects=[];const p={firstobject:shell,filepath:`Z:/private/${doc}-r${rev}.maxhelp`,
  getnamed:()=>shell,connect(){},newdefault(x,y,cls){const o={valid:true,setboxattr(name,value){this[name]=value;},message(){}};
   objects.push(o);return o;}};
 return p;
}
for(const doc of ['int','float'])for(const rev of [1,2]){
 const inlet=ctx.config.lifecycle.owners.length;ctx.config.lifecycle.owners.push({document:doc,revision:rev,channel:'synthetic_'+inlet});
 ctx.config.documents.push({document:doc,revision:rev,lifecycle_owner_inlet:inlet,
 source_sha256:doc==='int'?'a'.repeat(64):'b'.repeat(64),working_windows_path:`Z:/private/${doc}-r${rev}.maxhelp`,
 basic_varname:'basic_tab',boxes:[{id:'obj-1',anchor:'root/obj-2/obj-1',maxclass:'number',runtime_class:'number',rect:[1,2,30,20],outlets:2}],
 full_inventory:[{anchor:'root/obj-2',maxclass:'newobj',runtime_class:'patcher',rect:[0,0,100,100],child:true},
 {anchor:'root/obj-2/obj-1',maxclass:'number',runtime_class:'number',rect:[1,2,30,20],child:false}]});}
ctx.max={message(selector,name,filepath){opened.push(filepath);const m=/\/(int|float)-r(\d)/.exec(filepath);this.frontpatcher=root(m[1],+m[2]);}};
function drain(){let count=0;while(tasks.length){assert.ok(++count<200);tasks.shift().fn();}}
function install(doc,rev,id){ctx.handle({op:'operation',action:'install',document:doc,revision:rev,action_revision:rev,
 source_sha256:doc==='int'?'a'.repeat(64):'b'.repeat(64),
 command_id:id,step_id:`install-${doc}-${rev}`});drain();assert.equal(written.at(-1).success,true);}
install('int',1,1);const retainedInt=ctx.roots.int;
assert.deepEqual(Array.from(retainedInt.reader.patching_rect),[-3000,-3000,160,133]);
assert.deepEqual(Array.from(retainedInt.lifecycleSend.patching_rect),[-3400,-3000,200,64]);
assert.deepEqual(Array.from(retainedInt.disposer.patching_rect),[-3100,-3000,100,22]);
assert.deepEqual(Array.from(retainedInt.freebang.patching_rect),[-3200,-3000,100,22]);
assert.deepEqual(Object.keys(ctx.roots),['int']);assert.equal(ctx.ticker,recurring);
ctx.handle({op:'operation',action:'event',document:'int',source_sha256:'a'.repeat(64),action_revision:1,
 command_id:2,step_id:'synthetic-event',anchor:'root/obj-2/obj-1',inlet:0,message:{selector:'int',atoms:[{tag:'int',value:7}]}});
assert.equal(journal.find(r=>r.kind==='stimulus').port,0,'stimulus must bind inlet as public port');
assert.throws(()=>ctx.handle({op:'operation',action:'event',document:'int',source_sha256:'a'.repeat(64),action_revision:1,
 command_id:3,step_id:'bad-inlet',anchor:'root/obj-2/obj-1',inlet:1,message:{selector:'bang',atoms:[]}}));
install('float',1,2);assert.equal(ctx.roots.int,retainedInt,'install F must retain I');
// Supported close and survival of the other owner are exercised in test_close.
// Simulate that established postcondition here to isolate fresh-path reinstall.
delete ctx.roots.float;
assert.deepEqual(Object.keys(ctx.roots),['int']);
install('float',2,4);assert.equal(ctx.roots.int,retainedInt);assert.equal(ctx.roots.float.definition.revision,2);
assert.equal(opened.length,3);assert.equal(new Set(opened).size,3,'reopened owner needs a fresh path');
assert.equal(ctx.ticker,recurring);
assert.throws(()=>ctx.handle({op:'operation',action:'install',document:'float',revision:2,action_revision:2}));
assert.throws(()=>ctx.handle({op:'operation',action:'close',document:'float',source_sha256:'wrong',action_revision:2}));
assert.throws(()=>ctx.handle({op:'operation',action:'unknown',document:'int',action_revision:1,anchor:'root/obj-2/obj-1',
 source_sha256:'a'.repeat(64),message:{selector:'bang',atoms:[]}}));
function startupScenario(scenario){
 const startup=vm.createContext({jsarguments:['js','Z:/synthetic/config.json']});
 vm.runInContext(fs.readFileSync(file,'utf8'),startup);
 const writes=[],opened=[],repeated=[];
 const definition={varname:'observer',rect:[-2000,-2000,300,22]};
 const config={global_name:'synthetic',ready_path:'Z:/synthetic/ready.json',lifecycle:{
  monitor_epoch:'e'.repeat(48),report_path:'Z:/synthetic/lifecycle-report.json',driver_inventory:[definition]}};
 const success={version:'freebang-v1',monitor_epoch:'e'.repeat(48),request_id:0,step_id:'startup',
  control:'attest',observer_report:{failures:[]}};
 startup.Global=function(){return {};};
 startup.Task=function(){if(scenario==='startup')throw Error('synthetic-task-refused');
  this.repeat=()=>repeated.push(true);};
 startup.max={message:()=>opened.push(true)};
 startup.patcher={getnamed:()=>({valid:true,setboxattr(){if(scenario==='geometry')throw Error('synthetic-geometry-refused');},
  message(){if(scenario==='dispatch')throw Error('synthetic-dispatch-refused');}})};
 startup.read=path=>{if(path==='Z:/synthetic/config.json'){
  if(scenario==='config')throw Error('synthetic-config-refused');return config;}
  if(scenario==='absent')return null;
  if(scenario==='unreadable')throw Error('synthetic-report-json-refused');
  if(scenario==='stale')return {...success,request_id:9};
  if(scenario==='failure'||scenario==='failure-unbound')return {...success,
   monitor_epoch:scenario==='failure-unbound'?null:success.monitor_epoch,success:false,failure_diagnostics:{stage:'driver-object',
   error:{status:'threw',exception:{type:'object'},message:'synthetic-driver-refused'},driver_objects:[]}};
  return success;};
 startup.write=(path,value)=>writes.push({path,value:JSON.parse(JSON.stringify(value))});
 assert.doesNotThrow(()=>startup.start(),'startup refusals must leave a private ready result');
 const ready=writes.at(-1);assert.equal(ready.path,'Z:/synthetic/ready.json');
 assert.deepEqual(Object.keys(startup.roots),[]);assert.deepEqual(opened,[]);
 if(scenario==='success'){assert.equal(ready.value.ready,true);assert.equal(repeated.length,1);return;}
 assert.equal(ready.value.ready,false);assert.deepEqual(repeated,[]);assert.equal(startup.ticker,undefined);
 assert.equal(ready.value.source_roots_opened,0);assert.deepEqual(ready.value.live_owners,{});
 const diagnostic=ready.value.startup_diagnostics;
 assert.equal(diagnostic.stage,['config','geometry','startup'].includes(scenario)?scenario:'observer');
 assert.equal(diagnostic.error.status,'threw');assert.equal(diagnostic.error.exception.type,'object');
 if(['absent','stale','unreadable'].includes(scenario))
  assert.equal(diagnostic.error.message,'lifecycle-report-'+scenario);
 if(scenario==='failure'||scenario==='failure-unbound')
  assert.equal(diagnostic.lifecycle_failure&&diagnostic.lifecycle_failure.failure_diagnostics.stage,'driver-object');
 return {startup,writes,ready};
}
for(const scenario of ['config','geometry','absent','stale','unreadable','failure','failure-unbound','dispatch','startup','success'])
 startupScenario(scenario);
const invalidConfig=vm.createContext({jsarguments:['js','Z:/synthetic/other.json']});
vm.runInContext(fs.readFileSync(file,'utf8'),invalidConfig);
let fallbackWrites=0;invalidConfig.read=()=>{throw Error('config-unavailable');};
invalidConfig.write=()=>{++fallbackWrites;};
assert.throws(()=>invalidConfig.start(),/startup-diagnostic-path/);
assert.equal(fallbackWrites,0,'fallback must require the exact config.json path component');
console.log('controller: dispatch/geometry/startup/ticker and fresh-path reinstall pass; supported close has separate fixtures');
