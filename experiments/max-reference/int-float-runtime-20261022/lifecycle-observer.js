// Private driver-owned lifecycle evidence. Never writes the score journal.
autowatch=0;inlets=5;outlets=0;
var lifecycleCallbacks=(function(runtime){
var configFile,bootstrapFailed=false,bootstrapError,config,monitor=null,lastRequest=0,lastStep="",lastControl="monitoring",failureDiagnostic=null;
try{configFile=runtime.jsarguments[1];}catch(error){
    bootstrapFailed=true;bootstrapError=error;
    // The documented global supplies a failure destination only; it cannot repair bootstrap.
    try{if(typeof jsarguments!=="undefined")configFile=jsarguments[1];}catch(ignored){}
}
function readPrivate(path){var f=new File(path,"read"),s="";if(!f.isopen)throw Error("lifecycle-file-unavailable");
    try{while(f.position<f.eof){var before=f.position,chunk=f.readstring(Math.min(4096,f.eof-before));
        if(!chunk||f.position!==before+chunk.length)throw Error("lifecycle-read-progress");s+=chunk;}
        return JSON.parse(s);}finally{f.close();}}
function writePrivate(path,value){var s=JSON.stringify(value).replace(/[\u007f-\uffff]/g,
    c=>"\\u"+("0000"+c.charCodeAt(0).toString(16)).slice(-4))+"\n";
    var f=new File(path,"write","TEXT");if(!f.isopen)throw Error("lifecycle-file-unavailable");
    try{f.eof=0;f.position=0;for(var i=0;i<s.length;i+=4096){var chunk=s.slice(i,i+4096),before=f.position;
        f.writestring(chunk);if(f.position!==before+chunk.length)throw Error("lifecycle-write-progress");}
        if(f.eof!==s.length)throw Error("lifecycle-write-size");}finally{f.close();}}
function ensureMonitor(){
    if(!config)config=readPrivate(configFile);
    if(!monitor){
        if(config.lifecycle.version!=="freebang-v1"||config.lifecycle.owners.length!==4)throw Error("lifecycle-config");
        monitor={monitor_epoch:config.lifecycle.monitor_epoch,seq:0,transitions:[],events:[],
            states:config.lifecycle.owners.map((o,i)=>{
                if(o.inlet!==i)throw Error("lifecycle-inlet-map");
                return {inlet:i,state:"monitoring",request_id:0,step_id:"",witness_count:0};}),failures:[],sealed:false};
    }
}
function reject(code){monitor.failures.push(code);}
function transition(kind,index,request,step){
    ensureMonitor();if(monitor.sealed)throw Error("lifecycle-sealed");
    if(!Number.isInteger(index)||!Number.isInteger(request)||request<1||typeof step!=="string"){
        reject("control-binding");return;}
    var row={seq:++monitor.seq,kind:kind,inlet:index,request_id:request,step_id:step};
    monitor.transitions.push(row);
    if(kind==="barrier"){
        if(index!==-1||step!=="capture-complete")reject("barrier-binding");
        for(var owner of config.lifecycle.owners){var s=monitor.states[owner.inlet];
            if(owner.revision===1?(s.state!=="closed"||s.witness_count!==1):
                (s.state!=="monitoring"||s.witness_count!==0))reject("barrier-owner-state");}
        if(!monitor.failures.length)monitor.sealed=true;return;
    }
    var state=monitor.states[index];if(!state){reject("control-owner");return;}
    if(kind==="arm"){
        if(state.state!=="monitoring"||monitor.states.some(s=>["armed","dispatching","witnessed"].includes(s.state)))
            reject("arm-state");
        else{state.state="armed";state.request_id=request;state.step_id=step;}
    }else if(request!==state.request_id||step!==state.step_id)reject("stale-control");
    else if(kind==="dispatch-start"&&state.state==="armed")state.state="dispatching";
    else if(kind==="dispatch-return"&&["dispatching","witnessed"].includes(state.state)){
        if(monitor.transitions.filter(t=>t.kind==="dispatch-return"&&t.inlet===index).length!==1)reject("duplicate-dispatch-return");
    }else if(kind==="close-validated"&&state.state==="witnessed"&&state.witness_count===1&&
        monitor.transitions.some(t=>t.kind==="dispatch-return"&&t.inlet===index))state.state="closed";
    else reject("control-state");
}
function observe(kind,physical){
    ensureMonitor();if(monitor.sealed)return;
    var index=physical-1,state=monitor.states[index];
    monitor.events.push({seq:++monitor.seq,inlet:index,payload_kind:kind,
        request_id:state?state.request_id:0,step_id:state?state.step_id:""});
    if(!state||kind!=="bang"||state.state!=="dispatching"||state.witness_count!==0)reject("unexpected-notification");
    else{state.witness_count++;state.state="witnessed";}
    persist();
}
function bang(physical,count){observe(count===0?"bang":"bang-with-atoms",physical);}
function msg_int(physical){observe("int",physical);}
function msg_float(physical){observe("float",physical);}
function list(physical){observe("list",physical);}
function anything(physical){observe("anything",physical);}
function diagnosticValue(value){
    var type=value===null?"null":Array.isArray(value)?"array":typeof value,result={type:type};
    if(type==="boolean"||type==="string")result.value=value;
    else if(type==="number"){
        if(Number.isFinite(value))result.value=value;
        else result.representation=Number.isNaN(value)?"nan":value>0?"positive-infinity":"negative-infinity";
    }else if(type==="array")result.items=value.slice(0,16).map(v=>{
        if(Array.isArray(v))return {type:"array"};return diagnosticValue(v);});
    return result;
}
function diagnosticRead(read){
    try{return Object.assign({status:"returned"},diagnosticValue(read()));}catch(error){
        var result={status:"threw",exception:diagnosticValue(error)};
        try{if(typeof error.name==="string")result.name=error.name;}catch(ignored){}
        try{if(typeof error.message==="string")result.message=error.message;}catch(ignored){}
        return result;
    }
}
function diagnosticDriver(){
    var objects=[],scan;
    scan=diagnosticRead(()=>{
        var object=runtime.patcher.firstobject,count=0;
        while(object&&count++<32){var current=object;
            objects.push({varname:diagnosticRead(()=>current.varname),maxclass:diagnosticRead(()=>current.maxclass),
                boxtext:diagnosticRead(()=>current.boxtext),valid:diagnosticRead(()=>current.valid),
                patching_rect:diagnosticRead(()=>current.getboxattr("patching_rect"))});
            object=object.nextobject;
        }
        return !object;
    });
    return {objects:objects,scan:scan};
}
function proofError(stage,code){var error=Error(code);error.lifecycle_stage=stage;return error;}
function persistFailure(stage,error){
    if(!failureDiagnostic){
        var driver=diagnosticDriver();
        failureDiagnostic={stage:stage,error:diagnosticRead(()=>{throw error;}),
            driver_objects:driver.objects,driver_scan:driver.scan};
        if(monitor)reject("lifecycle-capability-refused");
    }
    if(!config)try{config=readPrivate(configFile);}catch(ignored){}
    var lifecycle=config&&config.lifecycle,path=lifecycle&&lifecycle.report_path;
    if(typeof path!=="string"){
        if(typeof configFile!=="string"||!/(^|[\\/])config\.json$/.test(configFile))throw Error("lifecycle-diagnostic-path");
        path=configFile.slice(0,-"config.json".length)+"lifecycle-report.json";
    }
    writePrivate(path,{version:"freebang-v1",monitor_epoch:lifecycle?lifecycle.monitor_epoch:null,
        request_id:lastRequest,step_id:lastStep,control:lastControl,success:false,failure_diagnostics:failureDiagnostic});
}
function driverProof(root){
    var boxes=[],inputs=[],outputs=[],objects={},expected=config.lifecycle.driver_inventory;
    for(var o=root.firstobject;o;o=o.nextobject){
        var matches=expected.filter(e=>e.varname===o.varname);
        if(matches.length!==1||objects[o.varname])throw proofError("driver-inventory","lifecycle-driver-inventory");
        var wanted=matches[0],rect=Array.from(o.getboxattr("patching_rect"));
        if(o.maxclass!==wanted.maxclass||o.boxtext!==wanted.boxtext||JSON.stringify(rect)!==JSON.stringify(wanted.rect)||
            (o.valid!==true&&o.valid!==1))throw proofError("driver-object","lifecycle-driver-object");
        objects[o.varname]=wanted;
        boxes.push({varname:o.varname,maxclass:o.maxclass,boxtext:o.boxtext,rect:rect,valid:o.valid});
    }
    if(boxes.length!==expected.length)throw proofError("driver-count","lifecycle-driver-count");
    function endpoint(o,p){var e=objects[o.varname];if(!e||o.maxclass!==e.maxclass||
        JSON.stringify(Array.from(o.getboxattr("patching_rect")))!==JSON.stringify(e.rect)||!Number.isInteger(p)||p<0)
        throw proofError("driver-endpoint","lifecycle-driver-endpoint");return {identity:o.varname,port:p};}
    for(var o=root.firstobject;o;o=o.nextobject){var cords=o.patchcords;
        if(!cords||!Array.isArray(cords.inputs)||!Array.isArray(cords.outputs))throw proofError("driver-cords","lifecycle-driver-cords");
        for(var direction of ["inputs","outputs"])for(var c of cords[direction])
            (direction==="inputs"?inputs:outputs).push({source:endpoint(c.srcobject,c.srcoutlet),destination:endpoint(c.dstobject,c.dstinlet)});
    }
    var routes=config.lifecycle.owners.map(owner=>({source:{identity:"__alive_numeric_lifecycle_receive_"+owner.inlet,port:0},
        destination:{identity:"__alive_numeric_lifecycle_observer",port:owner.inlet+1}}));
    function sorted(v){return v.map(x=>JSON.stringify(x)).sort().join("\n");}
    if(sorted(inputs)!==sorted(routes)||sorted(outputs)!==sorted(routes))throw proofError("driver-routes","lifecycle-driver-routes");
    return {boxes:boxes,input_routes:inputs,output_routes:outputs,declared_inlets:inlets,declared_outlets:outlets};
}
function persist(){
    if(bootstrapFailed){persistFailure("bootstrap",bootstrapError);return;}
    if(failureDiagnostic){persistFailure();return;}
    var stage="config";
    try{
        ensureMonitor();stage="driver-proof";var proof=driverProof(runtime.patcher);stage="persist";
        writePrivate(config.lifecycle.report_path,{version:"freebang-v1",monitor_epoch:config.lifecycle.monitor_epoch,
            request_id:lastRequest,step_id:lastStep,control:lastControl,
            driver_route_proof:proof,observer_report:monitor});
    }catch(error){persistFailure(error&&error.lifecycle_stage||stage,error);}
}
function lifecyclecontrol(physical,kind,index,request,step,count){
    if(physical!==0||count!==4){observe("control-selector",physical);return;}
    lastRequest=request;lastStep=step;lastControl=kind;
    if(bootstrapFailed){persistFailure("bootstrap",bootstrapError);return;}
    var stage="config";
    try{ensureMonitor();stage="control";if(kind!=="attest")transition(kind,index,request,step);}
    catch(error){persistFailure(stage,error);return;}
    persist();
}

return {bang:bang,msg_int:msg_int,msg_float:msg_float,list:list,anything:anything,lifecyclecontrol:lifecyclecontrol};
})(this);
function bang(){lifecycleCallbacks.bang(inlet,arguments.length);}
function msg_int(){lifecycleCallbacks.msg_int(inlet);}
function msg_float(){lifecycleCallbacks.msg_float(inlet);}
function list(){lifecycleCallbacks.list(inlet);}
function anything(){lifecycleCallbacks.anything(inlet);}
function lifecyclecontrol(kind,index,request,step){lifecycleCallbacks.lifecyclecontrol(inlet,kind,index,request,step,arguments.length);}
