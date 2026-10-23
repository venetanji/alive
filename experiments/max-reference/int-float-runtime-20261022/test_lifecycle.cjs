// Synthetic lifecycle state machine and actual-route fixtures; no Max launch.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const create=require('./lifecycle-fixture.cjs');
let fixture=create();
const owners=fixture.owners;
function control(kind,index=2,request=125,step='close-float'){return fixture.control(kind,index,request,step);}
function monitor(){return fixture.report().observer_report;}
control('arm');control('dispatch-start');fixture.fire();control('dispatch-return');control('close-validated');
assert.equal(monitor().states[2].state,'closed');assert.equal(monitor().events.length,1);
assert.deepEqual(monitor().failures,[]);assert.equal(monitor().seq,5);
for(const scenario of ['missing','early','duplicate','cross-owner','nonbang','stale']) {
 fixture=create();if(scenario==='early')fixture.fire();
 control('arm');control('dispatch-start');
 if(scenario==='nonbang')fixture.fire(2,'msg_int');else if(scenario!=='missing')fixture.fire(scenario==='cross-owner'?0:2);
 if(scenario==='duplicate')fixture.fire();
 control('dispatch-return');control('close-validated');if(scenario==='stale')fixture.fire();
 assert.ok(monitor().failures.length,scenario+' must refuse');
}
fixture=create();
for(const [i,r,s] of [[2,125,'close-float'],[0,147,'close-int']]) {
 control('arm',i,r,s);control('dispatch-start',i,r,s);control('dispatch-return',i,r,s);
 fixture.fire(i);control('close-validated',i,r,s);
}
control('barrier',-1,157,'capture-complete');assert.equal(monitor().sealed,true);assert.deepEqual(monitor().failures,[]);
const before=fixture.files['synthetic-report'];fixture.fire(1);
assert.equal(fixture.files['synthetic-report'],before,'post-barrier cleanup is never a witness');
for(const attack of ['bang-control','control-event','transition','persist','readPrivate','observe']){
 fixture=create();control('attest');
 if(attack==='bang-control'){fixture.ctx.inlet=0;fixture.ctx.bang();}
 else if(attack==='control-event'){fixture.ctx.inlet=3;fixture.ctx.lifecyclecontrol('arm',2,125,'close-float');}
 else{assert.equal(typeof fixture.ctx[attack],'undefined','internal functions must be encapsulated');
  fixture.ctx.inlet=3;fixture.ctx.messagename=attack;fixture.ctx.anything();}
 assert.ok(monitor().failures.length,attack+' must refuse');assert.equal(monitor().transitions.length,0);
}
fixture=create();control('arm');control('dispatch-start');fixture.ctx.inlet=3;fixture.ctx.bang(7);
assert.ok(monitor().failures.length,'bang with atoms is never an automatic witness');
fixture=create();fixture.boxes[2].boxtext='receive wrong';
let failure;assert.doesNotThrow(()=>{failure=control('attest');},'proof refusal must be retained privately');
assert.equal(failure.success,false);
assert.equal(failure.failure_diagnostics.stage,'driver-object');
assert.equal(failure.failure_diagnostics.error.status,'threw');
assert.equal(failure.failure_diagnostics.error.message,'lifecycle-driver-object');
assert.equal(failure.monitor_epoch,fixture.config.lifecycle.monitor_epoch);
assert.equal(failure.request_id,125);assert.equal(failure.step_id,'close-float');assert.equal(failure.control,'attest');
assert.equal(Object.hasOwn(failure,'driver_route_proof'),false);
assert.equal(Object.hasOwn(failure,'observer_report'),false);
assert.equal(failure.failure_diagnostics.driver_objects.length,6);
const actual=failure.failure_diagnostics.driver_objects[2];
assert.equal(actual.maxclass.value,'receive');assert.equal(actual.boxtext.value,'receive wrong');
assert.equal(actual.valid.value,true);assert.equal(actual.patching_rect.type,'array');
fixture.boxes[2].boxtext=fixture.config.lifecycle.driver_inventory[2].boxtext;
assert.equal(control('attest').success,false,'capability failure cannot be cleared by another control');
fixture=create();fixture.boxes[2].patchcords.inputs.push(fixture.boxes[2].patchcords.outputs[0]);
failure=control('attest');assert.equal(failure.success,false);assert.equal(failure.failure_diagnostics.stage,'driver-routes');
fixture=create();fixture.boxes[2].getboxattr=()=>{throw Error('synthetic-geometry-unavailable');};
failure=control('attest');assert.equal(failure.success,false);assert.equal(failure.failure_diagnostics.stage,'driver-proof');
assert.equal(failure.failure_diagnostics.driver_objects[2].patching_rect.status,'threw');
fixture=create();fixture.boxes[2].getboxattr=()=>{throw null;};
assert.doesNotThrow(()=>{failure=control('attest');},'primitive exceptions must retain typed refusal');
assert.equal(failure.success,false);assert.equal(failure.failure_diagnostics.error.exception.type,'null');
fixture=create();fixture.ctx.File.prototype.writestring=function(){throw Error('synthetic-write-refused');};
assert.throws(()=>control('attest'),/synthetic-write-refused/,'an unwritable diagnostic path still refuses');
fixture=create();let writeAttempts=0;const originalWrite=fixture.ctx.File.prototype.writestring;
fixture.ctx.File.prototype.writestring=function(value){if(++writeAttempts===1)throw Error('synthetic-first-write-refused');
 return originalWrite.call(this,value);};
failure=control('attest');assert.equal(failure.success,false);assert.equal(failure.failure_diagnostics.stage,'persist');
assert.equal(failure.failure_diagnostics.error.message,'synthetic-first-write-refused');
assert.doesNotThrow(()=>{fixture=create({lexicalArguments:true});},'bootstrap property failure must leave guarded callbacks');
failure=control('attest');assert.equal(failure.success,false);
assert.equal(failure.failure_diagnostics.stage,'bootstrap');assert.equal(failure.failure_diagnostics.error.status,'threw');
assert.equal(failure.monitor_epoch,fixture.config.lifecycle.monitor_epoch);
assert.equal(Object.hasOwn(failure,'driver_route_proof'),false);
for(const thrown of [null,undefined,false,0,'']){
 fixture=create({lexicalArguments:true,bootstrapThrown:thrown});failure=control('attest');
 assert.equal(failure.success,false,'every thrown bootstrap value must refuse');
 assert.equal(failure.failure_diagnostics.stage,'bootstrap');
 const expected={type:thrown===null?'null':typeof thrown};
 if(thrown!==null&&thrown!==undefined)expected.value=thrown;
 assert.deepEqual(failure.failure_diagnostics.error.exception,expected);
 assert.equal(Object.hasOwn(failure,'driver_route_proof'),false);
 assert.equal(Object.hasOwn(failure,'observer_report'),false);
 assert.deepEqual(control('attest'),failure,'bootstrap refusal must remain sticky');
}
const reader=vm.createContext({jsarguments:['v8','private','float',1]});
vm.runInContext(fs.readFileSync(path.join(__dirname,'v8-readback.js'),'utf8'),reader);
function box(varname,maxclass,rect,boxtext='') {return {varname,maxclass,boxtext,valid:true,
 getboxattr:()=>rect,patchcords:{inputs:[],outputs:[]}};}
const original=box('','comment',[0,0,10,10]);
const rootBoxes=[original,box('__alive_numeric_reader','v8',[-3000,-3000,160,133]),
 box('__alive_numeric_disposer','thispatcher',[-3100,-3000,100,22]),
 box('__alive_numeric_freebang','freebang',[-3200,-3000,100,22],'freebang'),
 box('__alive_numeric_lifecycle_send','send',[-3400,-3000,200,64],'send private_2')];
rootBoxes.forEach((b,i)=>b.nextobject=rootBoxes[i+1]||null);
const cord={srcobject:rootBoxes[3],srcoutlet:0,dstobject:rootBoxes[4],dstinlet:0};
rootBoxes[3].patchcords.outputs.push(cord);rootBoxes[4].patchcords.inputs.push(cord);
const definition={document:'float',revision:1,source_sha256:'a'.repeat(64),working_windows_path:'Z:/private/2',
 lifecycle_owner_inlet:2,full_inventory:[{anchor:'root/obj-1',source_varname:null,
 runtime_classes:['comment'],rect:[0,0,10,10]}]};
const request={op:'operation',action:'close',command_id:125,step_id:'close-float',document:'float',
 action_revision:1,source_sha256:'a'.repeat(64)};
const root={filepath:'Z:/private/2',parentpatcher:null,firstobject:original};
const proof=reader.collectLifecycleProof(root,definition,request,{lifecycle:{owners}});
assert.equal(proof.originals.length,1);assert.equal(proof.harness.length,4);
assert.equal(proof.input_routes.length,1);assert.equal(proof.output_routes.length,1);
rootBoxes[3].patchcords.inputs.push(cord);
assert.throws(()=>reader.collectLifecycleProof(root,definition,request,{lifecycle:{owners}}),/routes/);
rootBoxes[3].patchcords.inputs=[];rootBoxes[4].boxtext='send wrong';
assert.throws(()=>reader.collectLifecycleProof(root,definition,request,{lifecycle:{owners}}),/harness/);
function rootDiagnostic(mutate=()=>{},callRequest=125){
 const diagnosticReader=vm.createContext({jsarguments:['v8','synthetic-config','float',1]});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'v8-readback.js'),'utf8'),diagnosticReader);
 let originalTextReads=0;
 const boxes=[box('','comment',[0,0,10,10]),box('__alive_numeric_reader','v8',[-3000,-3000,160,133]),
  box('__alive_numeric_disposer','thispatcher',[-3100,-3000,100,22]),
  box('__alive_numeric_freebang','freebang',[-3200,-3000,100,22],'freebang'),
  box('__alive_numeric_lifecycle_send','send',[-3400,-3000,200,64],'send private_2')];
 Object.defineProperty(boxes[0],'boxtext',{get(){++originalTextReads;throw Error('original text is forbidden');}});
 boxes.forEach((b,i)=>b.nextobject=boxes[i+1]||null);
 const edge={srcobject:boxes[3],srcoutlet:0,dstobject:boxes[4],dstinlet:0};
 boxes[3].patchcords.outputs.push(edge);boxes[4].patchcords.inputs.push(edge);
 const ownerMap=owners.map((o,i)=>({...o,...(i===2?{root_proof_path:'synthetic-root-proof'}:{})}));
 const config={command_path:'synthetic-command',documents:[definition],lifecycle:{owners:ownerMap}};
 diagnosticReader.readPrivate=filename=>{assert.ok(['synthetic-config','synthetic-command'].includes(filename));
  return filename==='synthetic-config'?config:request;};
 const writes=[];diagnosticReader.writePrivate=(filename,value)=>{
  assert.equal(filename,'synthetic-root-proof');writes.push(JSON.parse(JSON.stringify(value)));};
 const ownedRoot={filepath:'Z:/private/2',parentpatcher:null,firstobject:boxes[0]};
 diagnosticReader.patcher=ownedRoot;
 mutate({boxes,root:ownedRoot,reader:diagnosticReader,config});
 assert.doesNotThrow(()=>diagnosticReader.lifecycleproof(callRequest,'close-float'));
 assert.equal(writes.length,1);assert.equal(originalTextReads,0,'diagnostics cannot inspect original box text');
 return writes[0];
}
function rootRefusal(value,stage){
 assert.equal(value.success,false);assert.equal(value.error_code,'lifecycle-root-proof-refused');
 assert.equal(value.failure_diagnostics&&value.failure_diagnostics.stage,stage);
 assert.equal(value.failure_diagnostics.error.status,'threw');
 for(const field of ['version','root_is_top_level','originals','harness','input_routes','output_routes'])
  assert.equal(Object.hasOwn(value,field),false,'a diagnostic refusal cannot become a proof');
 return value.failure_diagnostics;
}
const rootSuccess=rootDiagnostic();assert.equal(rootSuccess.version,'freebang-v1');
assert.equal(Object.hasOwn(rootSuccess,'failure_diagnostics'),false);
for(const [index,rect] of [[1,[-3000,-3000,160,22]],[4,[-3400,-3000,200,22]]])
 rootRefusal(rootDiagnostic(({boxes})=>{boxes[index].getboxattr=()=>rect;}),'harness');
let rootFailure=rootRefusal(rootDiagnostic(({boxes})=>{boxes[3].getboxattr=()=>[-3200,-3000,100,50];}),'harness');
assert.deepEqual(rootFailure.root_objects[3].patching_rect.items.map(item=>item.value),[-3200,-3000,100,50]);
rootFailure=rootRefusal(rootDiagnostic(({boxes})=>{boxes[3].boxtext='wrong';}),'harness');
assert.equal(rootFailure.root_objects[3].boxtext.value,'wrong');
rootRefusal(rootDiagnostic(({boxes})=>{boxes[0].maxclass='button';}),'original');
rootFailure=rootRefusal(rootDiagnostic(({boxes})=>{boxes[0].varname='__alive_numeric_freebang';}),'harness');
assert.equal(Object.hasOwn(rootFailure.root_objects[0],'boxtext'),false);
assert.equal(Object.hasOwn(rootFailure.root_objects[0],'valid'),false);
rootFailure=rootRefusal(rootDiagnostic(({boxes})=>{boxes[3].getboxattr=()=>{throw Error('geometry unavailable');};}),'geometry');
assert.equal(rootFailure.root_objects[3].patching_rect.status,'threw');
assert.equal(rootFailure.root_objects[3].boxtext.value,'freebang');
assert.equal(rootFailure.root_objects[3].valid.value,true);
for(const thrown of [null,undefined,false,0,'']){
 rootFailure=rootRefusal(rootDiagnostic(({boxes})=>{boxes[3].getboxattr=()=>{throw thrown;};}),'geometry');
 const expected={type:thrown===null?'null':typeof thrown};
 if(thrown!==null&&thrown!==undefined)expected.value=thrown;
 assert.deepEqual(rootFailure.error.exception,expected);
}
rootFailure=rootRefusal(rootDiagnostic(({root})=>{Object.defineProperty(root,'firstobject',{get(){throw Error('scan unavailable');}});}),
 'inventory');
assert.equal(rootFailure.scan.status,'threw');assert.deepEqual(rootFailure.root_objects,[]);
rootFailure=rootRefusal(rootDiagnostic(({boxes})=>{
 boxes[0].nextobject=boxes[0];boxes[0].maxclass='button';
}),'original');
assert.equal(rootFailure.root_objects.length,16);assert.equal(rootFailure.scan.value,false);
rootFailure=rootRefusal(rootDiagnostic(({boxes})=>{
 boxes[3].boxtext='x'.repeat(10000);boxes[3].getboxattr=()=>Array(1000).fill('r'.repeat(10000));
}),'geometry');
assert.equal(rootFailure.root_objects[3].boxtext.value.length,256);
assert.equal(rootFailure.root_objects[3].boxtext.truncated,true);
assert.equal(rootFailure.root_objects[3].patching_rect.items.length,16);
assert.equal(rootFailure.root_objects[3].patching_rect.truncated,true);
assert.ok(JSON.stringify(rootFailure).replace(/[\u007f-\uffff]/g,'\\u0000').length<24000);
const largeFailure=rootDiagnostic(({root})=>{
 const oversized=Array.from({length:20},()=>box('__alive_numeric_freebang','freebang',
  Array(1000).fill('r'.repeat(10000)),'t'.repeat(10000)));
 oversized.forEach((b,i)=>b.nextobject=oversized[i+1]||null);root.firstobject=oversized[0];
});
rootFailure=rootRefusal(largeFailure,'geometry');assert.ok(rootFailure.omitted_objects>0);
assert.equal(rootFailure.scan.value,false);
assert.ok(JSON.stringify(largeFailure).replace(/[\u007f-\uffff]/g,'\\u0000').length<=24000);
rootRefusal(rootDiagnostic(()=>{},124),'request');
rootFailure=rootRefusal(rootDiagnostic(({reader})=>{
 const write=reader.writePrivate;let attempted=false;
 reader.writePrivate=(filename,value)=>{if(!attempted){attempted=true;throw 0;}return write(filename,value);};
}),'write');assert.equal(rootFailure.error.exception.value,0);
rootFailure=rootRefusal(rootDiagnostic(({boxes,reader})=>{
 boxes[3].boxtext='wrong';reader.lifecycleFailureDiagnostics=()=>{throw false;};
}),'harness');
assert.equal(rootFailure.diagnostics_error.status,'threw');assert.equal(rootFailure.diagnostics_error.exception.value,false);
const oversizedException=Array(16).fill('\u4e00'.repeat(256));
const fallbackFailure=rootDiagnostic(({boxes,reader})=>{
 boxes[3].getboxattr=()=>{throw oversizedException;};
 reader.lifecycleFailureDiagnostics=()=>{throw oversizedException;};
});
rootFailure=rootRefusal(fallbackFailure,'geometry');
assert.ok(JSON.stringify(fallbackFailure).replace(/[\u007f-\uffff]/g,'\\u0000').length<=24000,
 'fallback exceptions must obey the same complete-record byte limit');
assert.equal(rootFailure.error.exception.type,'array');assert.equal(rootFailure.error.exception.truncated,true);
assert.equal(rootFailure.diagnostics_error.exception.type,'array');
assert.equal(rootFailure.diagnostics_error.exception.truncated,true);
for(const thrown of [null,undefined,false,0,'']){
 rootFailure=rootRefusal(rootDiagnostic(({boxes,reader})=>{
  boxes[3].getboxattr=()=>{throw thrown;};reader.lifecycleFailureDiagnostics=()=>{throw thrown;};
 }),'geometry');
 const expected={type:thrown===null?'null':typeof thrown};
 if(thrown!==null&&thrown!==undefined)expected.value=thrown;
 assert.deepEqual(rootFailure.error.exception,expected);assert.deepEqual(rootFailure.diagnostics_error.exception,expected);
}
const floatRootSource='c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c';
const intRootSource='bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61';
const floatRootHelpers={
 'helpstarter.js':'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
 'helpname.js':'49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
 'helpdetails.js':'31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
 'helpargs.js':'04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'};
function finiteRoot(mutate=()=>{},document='float'){
 const source=document==='int'?intRootSource:floatRootSource;
 const profiles=[['root/obj-2',[10,85,50,20],'484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393'],
  ['root/obj-3',[205,205,50,20],'bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a']];
 const entries=profiles.map(([anchor,rect,sha],i)=>({anchor,maxclass:'newobj',runtime_class:'patcher',
  runtime_classes:['patcher','p'],source_varname:'synthetic-subpatcher-'+i,rect:rect.slice(),source_text_sha256:sha,
  saved_incoming_routes:0,saved_outgoing_routes:0,shell_height_policy:{kind:'source-bound-'+document+'-shell-height',
   document,source_sha256:source,anchor,runtime_class:'patcher',saved_rect:rect.slice(),
   live_rect:rect.slice(0,3).concat([22]),source_text_sha256:sha,helper_sha256:{...floatRootHelpers},
   saved_incoming_routes:0,saved_outgoing_routes:0}}));
 const originals=entries.map(e=>box(e.source_varname,'jpatcher',e.shell_height_policy.live_rect.slice()));
 const boxes=originals.concat([box('__alive_numeric_reader','v8',[-3000,-3000,160,133]),
  box('__alive_numeric_disposer','thispatcher',[-3100,-3000,100,22]),
  box('__alive_numeric_freebang','freebang',[-3200,-3000,100,22],'freebang'),
  box('__alive_numeric_lifecycle_send','send',[-3400,-3000,200,64],'send private_2')]);
 boxes.forEach((b,i)=>b.nextobject=boxes[i+1]||null);
 const route={srcobject:boxes[4],srcoutlet:0,dstobject:boxes[5],dstinlet:0};
 boxes[4].patchcords.outputs.push(route);boxes[5].patchcords.inputs.push(route);
 const d={...definition,document,source_sha256:source,helper_sha256:{...floatRootHelpers},full_inventory:entries};
 const cfg={helpers:Object.entries(floatRootHelpers).map(([name,sha256])=>({name,sha256})),lifecycle:{owners:owners.map(o=>({...o}))}};
 const req={...request,command_id:document==='int'?141:125,step_id:'close-'+document},ownedRoot={...root,firstobject:boxes[0]};
 mutate({definition:d,config:cfg,originals,boxes,entries,root:ownedRoot,route});
 Object.assign(req,{document:d.document,action_revision:d.revision,source_sha256:d.source_sha256});
 Object.assign(cfg.lifecycle.owners[2],{document:d.document,revision:d.revision,source_sha256:d.source_sha256});
 return reader.collectLifecycleProof(ownedRoot,d,req,cfg);
}
for(const document of ['float','int']){
const finiteProof=finiteRoot(()=>{},document);
assert.deepEqual(finiteProof.originals.map(o=>o.maxclass),['jpatcher','jpatcher'],'retain raw V8 class evidence');
assert.equal(finiteProof.document,document);
assert.equal(finiteProof.request_id,document==='int'?141:125);
const decimalProof=finiteRoot(({entries})=>{
 for(const e of entries){
  e.rect=JSON.parse(JSON.stringify(e.rect).replace(/\b(\d+)\b/g,'$1.0'));
  e.shell_height_policy.saved_rect=e.rect.slice();
 }
},document);
assert.deepEqual(decimalProof.originals,finiteProof.originals,'numeric source-style decimals retain exact geometry');
for(const index of [0,1]){
 const refuse=change=>assert.throws(()=>finiteRoot(state=>change(state,state.entries[index],state.originals[index]),document));
 for(const cls of ['patcher','p','js','number'])refuse((s,e,o)=>{o.maxclass=cls;});
 for(const name of Object.keys(floatRootHelpers)){
  refuse((s,e)=>{e.shell_height_policy.helper_sha256[name]='0'.repeat(64);});
  refuse(s=>{s.definition.helper_sha256[name]='0'.repeat(64);});
  refuse(s=>{s.config.helpers.find(h=>h.name===name).sha256='0'.repeat(64);});
 }
 for(const change of [
  (s,e)=>{e.anchor='root/obj-9';},(s,e)=>{e.maxclass='patcher';},(s,e)=>{e.runtime_class='jpatcher';},
  (s,e)=>{e.runtime_classes=['patcher','p','jpatcher'];},(s,e)=>{e.runtime_classes=['p','patcher'];},
  (s,e)=>{delete e.runtime_classes;},(s,e)=>{e.source_text_sha256='0'.repeat(64);},
  (s,e)=>{e.rect[3]=22;},(s,e)=>{e.source_varname='wrong';},
  (s,e)=>{e.saved_incoming_routes=1;},(s,e)=>{e.saved_outgoing_routes=false;},
  (s,e)=>{delete e.shell_height_policy;},(s,e)=>{e.shell_height_policy.kind='other';},
  (s,e)=>{e.shell_height_policy.document=document==='int'?'float':'int';},(s,e)=>{e.shell_height_policy.source_sha256='0'.repeat(64);},
  (s,e)=>{e.shell_height_policy.anchor='root/obj-9';},(s,e)=>{e.shell_height_policy.runtime_class='jpatcher';},
  (s,e)=>{e.shell_height_policy.saved_rect[0]+=1;},(s,e)=>{e.shell_height_policy.live_rect[3]=20;},
  (s,e)=>{e.shell_height_policy.source_text_sha256='0'.repeat(64);},
  (s,e)=>{e.shell_height_policy.saved_incoming_routes=1;},(s,e)=>{e.shell_height_policy.saved_outgoing_routes=1;},
  (s,e)=>{e.shell_height_policy.extra=true;},
  (s,e)=>{e.shell_height_policy.helper_sha256['helpname.js']='0'.repeat(64);},
  (s,e,o)=>{o.getboxattr=()=>e.rect.slice();},(s,e,o)=>{o.varname='wrong';},
  (s,e,o)=>{o.patchcords.inputs.push(s.route);}
 ])refuse(change);
 for(const component of [0,1,2,3])for(const bad of [value=>value+1,()=>true,value=>String(value),()=>null,()=>NaN,()=>Infinity]){
  refuse((s,e)=>{e.rect[component]=bad(e.rect[component]);});
  refuse((s,e)=>{e.shell_height_policy.saved_rect[component]=bad(e.shell_height_policy.saved_rect[component]);});
  refuse((s,e)=>{e.shell_height_policy.live_rect[component]=bad(e.shell_height_policy.live_rect[component]);});
  refuse((s,e,o)=>{const rect=e.shell_height_policy.live_rect.slice();rect[component]=bad(rect[component]);o.getboxattr=()=>rect;});
 }
 for(const key of ['saved_incoming_routes','saved_outgoing_routes'])for(const bad of [1,false,'0',null]){
  refuse((s,e)=>{e[key]=bad;});refuse((s,e)=>{e.shell_height_policy[key]=bad;});
 }
}
for(const change of [
 s=>{s.definition.document='other';},s=>{s.definition.revision=2;},s=>{s.definition.source_sha256='0'.repeat(64);},
 s=>{s.definition.document=document==='int'?'float':'int';},
 s=>{s.definition.source_sha256='0'.repeat(64);s.originals.forEach(o=>{o.maxclass='patcher';});},
 s=>{s.definition.document='other';s.entries.forEach(e=>{e.runtime_classes=['jpatcher'];});},
 s=>{s.definition.revision=2;s.entries.forEach(e=>{e.runtime_classes=['jpatcher'];});},
 s=>{s.definition.helper_sha256['helpstarter.js']='0'.repeat(64);},
 s=>{s.definition.helper_sha256.extra='0'.repeat(64);},s=>{s.config.helpers.pop();},
 s=>{s.config.helpers[0].sha256='0'.repeat(64);},s=>{s.config.helpers[0]=s.config.helpers[1];},
 s=>{s.originals[0].nextobject=s.originals[0];},s=>{s.boxes[4].patchcords.outputs.push(s.route);}
])assert.throws(()=>finiteRoot(change,document));
}
const closeProofBytes=[JSON.stringify(finiteRoot()),JSON.stringify(finiteRoot(()=>{},'int'))];
fixture=create();
control('arm',2,125,'close-float');control('dispatch-start',2,125,'close-float');fixture.fire(2);
control('dispatch-return',2,125,'close-float');control('close-validated',2,125,'close-float');
const retainedFloatBytes=fixture.files['synthetic-report'],retainedFloat=JSON.parse(retainedFloatBytes).observer_report;
control('arm',0,141,'close-int');control('dispatch-start',0,141,'close-int');control('dispatch-return',0,141,'close-int');
fixture.fire(0);control('close-validated',0,141,'close-int');control('barrier',-1,157,'capture-complete');
const finalReport=monitor();assert.equal(finalReport.sealed,true);assert.deepEqual(finalReport.failures,[]);
for(const key of ['events','transitions'])assert.deepEqual(finalReport[key].slice(0,retainedFloat[key].length),retainedFloat[key]);
assert.deepEqual(closeProofBytes.map(bytes=>JSON.parse(bytes).originals.map(o=>o.maxclass)),
 [['jpatcher','jpatcher'],['jpatcher','jpatcher']]);
assert.equal(JSON.stringify(JSON.parse(retainedFloatBytes).observer_report),JSON.stringify(retainedFloat));
console.log('lifecycle: automatic inlet provenance, synchronous/asynchronous receipt, sticky refusal and final barrier pass');
