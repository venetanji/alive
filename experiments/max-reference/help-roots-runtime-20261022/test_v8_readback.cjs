// Offline boundary fixture; no Max, Wine, X server, or licensed source is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const helperPath = __dirname + '/v8-readback.js';
assert.ok(fs.existsSync(helperPath), 'the V8 branch needs its own zero-output reader');
const context = {jsarguments:[]};
vm.createContext(context);vm.runInContext(fs.readFileSync(helperPath,'utf8'),context);
assert.equal(context.outlets,0);
assert.equal(typeof context.collectReadback,'function');
const definition = {document:'append',source_sha256:'a'.repeat(64),working_windows_path:'Z:/private/working/append.maxhelp',
    basic_varname:'basic_tab',boxes:[{id:'obj-1',anchor:'root/obj-5/obj-1',maxclass:'message',runtime_class:'message',
        rect:[10,20,80,20],outlets:1,authored_text:'private-sentinel 7'}]};
const object = {maxclass:'message',varname:'__alive_help_obj_1',nextobject:null,
    getboxattr:()=>[10,20,80,20],boxtext:'private-sentinel 7',patchcords:{inputs:[],outputs:[]}};
const basic={firstobject:object};
const root={filepath:definition.working_windows_path,parentpatcher:null,getnamed:()=>({subpatcher:()=>basic})};
const request={op:'readback',command_id:4,step_id:'initial',document:'append',source_sha256:definition.source_sha256};
let result=context.collectReadback(root,definition,request,4,'initial');
assert.equal(result.readback_method,'v8-boxtext');assert.equal(result.request_id,4);
assert.equal(result.saved_order_observed,false);assert.equal(result.messages[0].text,'private-sentinel 7');
object.boxtext='';result=context.collectReadback(root,definition,request,4,'initial');
assert.equal(result.messages[0].text,'','a real empty string remains an observation');
for(const value of [null,undefined,7,new String('private-sentinel')]) {
    object.boxtext=value;
    assert.throws(()=>context.collectReadback(root,definition,request,4,'initial'),/message-boxtext-unavailable/);
}
Object.defineProperty(object,'boxtext',{get:()=>{throw Error('private-sentinel');},configurable:true});
assert.throws(()=>context.collectReadback(root,definition,request,4,'initial'),/message-boxtext-unavailable/);
Object.defineProperty(object,'boxtext',{value:'private-sentinel 7',writable:true,configurable:true});
for(const change of [{command_id:3},{step_id:'wrong'},{document:'prepend'},{source_sha256:'b'.repeat(64)}])
    assert.throws(()=>context.collectReadback(root,definition,{...request,...change},4,'initial'),/readback-request-mismatch/);
assert.throws(()=>context.collectReadback({...root,filepath:'Z:/private/pristine/append.maxhelp'},definition,request,4,'initial'),/working-root-path-mismatch/);
const missingParent={...root};delete missingParent.parentpatcher;
assert.throws(()=>context.collectReadback(missingParent,definition,request,4,'initial'),/working-root-path-mismatch/);
assert.throws(()=>context.collectReadback({...root,get parentpatcher(){throw Error('private-sentinel');}},definition,request,4,'initial'),/working-root-path-mismatch/);
assert.equal(context.collectReadback({...root,parentpatcher:undefined},definition,request,4,'initial').root_is_top_level,true,
    'a present property with the documented undefined absence remains distinct from a missing API');
object.varname='wrong';assert.throws(()=>context.collectReadback(root,definition,request,4,'initial'),/original-anchor-not-unique/);
object.varname='__alive_help_obj_1';object.nextobject={...object,nextobject:null};
assert.throws(()=>context.collectReadback(root,definition,request,4,'initial'),/original-anchor-not-unique/);
object.nextobject=null;
const destination={varname:'__alive_help_leaf_obj_1_0'};
const cord={srcobject:{varname:object.varname},srcoutlet:0,dstobject:destination,dstinlet:0};
object.patchcords.outputs=[cord];
result=context.collectReadback(root,definition,request,4,'initial');
assert.equal(result.output_routes[0].source.varname,object.varname);
assert.equal(result.output_routes[0].destination.varname,destination.varname);
assert.equal(result.output_routes[0].source.port,0);
console.log('V8 private reader boundary fixtures passed');
