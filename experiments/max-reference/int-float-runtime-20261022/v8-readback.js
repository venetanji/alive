// Original read-only numeric/Message observer. Raw strings stay in private JSON.
autowatch=0;inlets=1;outlets=0;
var configFile=jsarguments[1],documentName=jsarguments[2],revision=Number(jsarguments[3]);
function readPrivate(path){var f=new File(path,"read"),s="";if(!f.isopen)throw Error("private-file-unavailable");
    while(f.position<f.eof)s+=f.readline()+"\n";f.close();return JSON.parse(s);}
function writePrivate(path,value){var f=new File(path,"write","TEXT");if(!f.isopen)throw Error("private-file-unavailable");
    f.eof=0;f.writeline(JSON.stringify(value));f.close();}
function samePath(a,b){return typeof a==="string"&&typeof b==="string"&&a.replace(/\\/g,"/").toLowerCase()===b.replace(/\\/g,"/").toLowerCase();}
function numericValue(object,cls) {
    if(typeof object.getvalueof!=="function")throw Error("numeric-getter-unavailable");
    var raw=object.getvalueof(),representation="scalar-number",value=raw;
    if(Array.isArray(raw)) {
        if(raw.length!==1)throw Error("numeric-getter-array-shape");
        value=raw[0];representation="singleton-number-array";
    }
    if(typeof value!=="number"||!isFinite(value)||
        ((cls==="number"||cls==="slider")&&Math.trunc(value)!==value))throw Error("numeric-getter-invalid");
    if(cls!=="number"&&cls!=="flonum"&&cls!=="slider")throw Error("numeric-getter-class");
    return {value:value,getter_representation:representation,getter_method:"getvalueof",
        semantic_tag:cls==="flonum"?"float":"int",
        semantic_tag_basis:cls==="flonum"?"flonum-class":cls==="number"?"number-class":"source-integer-slider-mode"};
}
function rectangle(object){var rect=object.getboxattr("patching_rect");
    if(!rect||rect.length!==4)throw Error("geometry-unavailable");
    for(var v of rect)if(typeof v!=="number"||!isFinite(v))throw Error("geometry-unavailable");
    return Array.from(rect);}
function endpoint(object,port){if(!object||typeof object.varname!=="string"||!Number.isInteger(port)||port<0)throw Error("endpoint-unavailable");
    return {varname:object.varname,port:port};}
function numericModePolicy(expected,definition) {
    var policy=expected.numeric_mode_policy;if(typeof policy==="undefined")return null;
    var source="c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c";
    var rects={"root/obj-2/obj-16":[194,230.5,54,23],"root/obj-2/obj-17":[265,230.5,54,23],
        "root/obj-2/obj-21":[220,330.5,54,23],"root/obj-2/obj-33":[117,380.5,54,23]};
    var attrs={inlets:1,outlets:2,format:6,numdecimalplaces:null,fontname:"Arial",fontsize:13,
        outlettype:["","bang"],parameter_enable:0};
    var helpers={
        "helpstarter.js":"a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8",
        "helpname.js":"49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa",
        "helpdetails.js":"31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1",
        "helpargs.js":"04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469"};
    var empty="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",rect=rects[expected.anchor];
    function fields(value,wanted) {
        if(!value||Object.keys(value).length!==Object.keys(wanted).length)return false;
        for(var key in wanted)if(JSON.stringify(value[key])!==JSON.stringify(wanted[key]))return false;
        return true;
    }
    function exactRect(value) {
        if(!value||!rect||value.length!==4)return false;
        for(var i=0;i<4;i++)if(typeof value[i]!=="number"||!isFinite(value[i])||value[i]!==rect[i])return false;
        return true;
    }
    if(!policy||!rect||!definition||definition.document!=="float"||definition.source_sha256!==source||
        expected.maxclass!=="flonum"||expected.runtime_class!=="flonum"||!exactRect(expected.rect)||
        expected.source_text_sha256!==empty||!fields(expected.source_attributes,attrs)||
        (typeof expected.outlets!=="undefined"&&expected.outlets!==2)||
        (typeof expected.id!=="undefined"&&expected.id!==expected.anchor.slice(expected.anchor.lastIndexOf("/")+1))||
        policy.kind!=="source-bound-float-number-mode"||policy.document!=="float"||policy.source_sha256!==source||
        policy.anchor!==expected.anchor||policy.source_class!=="flonum"||policy.runtime_class!=="number"||
        !exactRect(policy.saved_rect)||policy.source_text_sha256!==empty||!fields(policy.source_attributes,attrs)||
        !fields(policy.helper_sha256,helpers)||!fields(definition.helper_sha256,helpers)||
        policy.getter_method!=="getattr"||policy.attribute!=="format"||
        policy.getter_representation!=="scalar-number"||policy.required_value!==6)
        throw Error("invalid-source-bound-float-mode-policy");
    return policy;
}
function numericModeObservation(object,expected,definition) {
    if(!numericModePolicy(expected,definition))throw Error("float-mode-policy-required");
    var row={anchor:expected.anchor,source_class:"flonum",runtime_class:object.maxclass,
        getter_method:"getattr",attribute:"format",getter_representation:"unavailable",getter_value:null};
    if(typeof object.getattr==="function") {
        var raw;
        try{raw=object.getattr("format");}catch(error){row.getter_representation="threw";}
        if(row.getter_representation!=="threw") {
            row.getter_representation=typeof raw==="number"?(isFinite(raw)?"scalar-number":"nonfinite-number"):
                raw===null?"null":Array.isArray(raw)?"array":typeof raw;
            row.getter_value=typeof raw==="undefined"?null:typeof raw==="number"&&!isFinite(raw)?String(raw):
                raw!==null&&typeof raw==="object"&&!Array.isArray(raw)?null:raw;
        }
    }
    if(row.runtime_class!=="number"||row.getter_representation!=="scalar-number"||row.getter_value!==6) {
        var failure=Error("read-only-float-mode-unavailable");failure.numeric_mode_observation=row;throw failure;
    }
    return row;
}
function collectReadback(root,definition,request) {
    if(request.op!=="readback"||request.document!==definition.document||request.revision!==definition.revision||
        request.source_sha256!==definition.source_sha256||!Number.isInteger(request.command_id)||request.command_id<1||
        !samePath(root.filepath,definition.working_windows_path)||root.parentpatcher!=null)throw Error("checkpoint-owner-binding");
    var basicBox=root.getnamed(definition.basic_varname);if(!basicBox)throw Error("basic-unavailable");
    var basic=basicBox.subpatcher(),boxes=[],objects={},inputs=[],outputs=[],messages=[],numeric=[],modes=[];
    for(var o=basic.firstobject;o;o=o.nextobject) {
        var name=o.varname;if(typeof name!=="string"||!name||objects[name])throw Error("box-identity-not-unique");
        objects[name]=o;boxes.push({varname:name,maxclass:o.maxclass,rect:rectangle(o)});
        var cords=o.patchcords;if(!cords||!Array.isArray(cords.inputs)||!Array.isArray(cords.outputs))throw Error("endpoint-inventory-unavailable");
        for(var direction of ["inputs","outputs"])for(var cord of cords[direction]) {
            var edge={source:endpoint(cord.srcobject,cord.srcoutlet),destination:endpoint(cord.dstobject,cord.dstinlet)};
            (direction==="inputs"?inputs:outputs).push(edge);
        }
    }
    for(var b of definition.boxes) {
        var object=objects["__alive_help_"+b.id.replace(/-/g,"_")];if(!object)throw Error("original-unavailable");
        if(typeof b.numeric_mode_policy!=="undefined"||(definition.document==="float"&&b.maxclass==="flonum"))
            modes.push(numericModeObservation(object,b,definition));
        if(b.maxclass==="message") {
            var text=object.boxtext;if(typeof text!=="string")throw Error("message-prototype-unavailable");
            messages.push({anchor:b.anchor,text:text});
        }
        if(["number","flonum","slider"].indexOf(b.maxclass)!==-1)
            numeric.push(Object.assign({anchor:b.anchor,class_name:b.maxclass},numericValue(object,b.maxclass)));
    }
    return {success:true,readback_method:"v8-numeric-getvalueof",request_id:request.command_id,
        operation_request_id:request.operation_request_id,step_id:request.step_id,action:request.action,
        action_document:request.action_document,action_revision:request.action_revision,
        document:definition.document,revision:definition.revision,source_sha256:definition.source_sha256,
        working_root_path:root.filepath,root_is_top_level:true,saved_order_observed:false,
        boxes:boxes,messages:messages,numeric:numeric,numeric_modes:modes,input_routes:inputs,output_routes:outputs};
}
function checkpoint(requestId,stepId) {
    var config=readPrivate(configFile),request=readPrivate(config.command_path),path=request.output_path;
    try {
        var definition=config.documents.find(d=>d.document===documentName&&d.revision===revision);
        if(!definition||requestId!==request.command_id||stepId!==request.step_id)throw Error("checkpoint-request-binding");
        writePrivate(path,collectReadback(this.patcher,definition,request));
    }catch(error){writePrivate(path,{success:false,request_id:requestId,error_code:"numeric-readback-refused",
        numeric_mode_observation:error.numeric_mode_observation||null});}
}
// Captured V8 class spelling is confined to these source-bound int/float-r1 shells.
function lifecycleRootV8Class(expected,definition,config){
    var sources={int:"bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61",
        float:"c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c"};
    var profiles={
        "root/obj-2":[[10,85,50,20],"484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393"],
        "root/obj-3":[[205,205,50,20],"bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a"]};
    if(!Object.prototype.hasOwnProperty.call(sources,definition.document)||definition.revision!==1||
        !Object.prototype.hasOwnProperty.call(profiles,expected.anchor))return null;
    var document=definition.document,source=sources[document],profile=profiles[expected.anchor];
    var helpers={
        "helpstarter.js":"a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8",
        "helpname.js":"49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa",
        "helpdetails.js":"31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1",
        "helpargs.js":"04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469"};
    function fields(value,wanted){
        if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).length!==Object.keys(wanted).length)return false;
        for(var key in wanted){
            if(wanted[key]&&typeof wanted[key]==="object"&&!Array.isArray(wanted[key])){
                if(!fields(value[key],wanted[key]))return false;
            }else if(JSON.stringify(value[key])!==JSON.stringify(wanted[key]))return false;
        }
        return true;
    }
    var policy={kind:"source-bound-"+document+"-shell-height",document:document,source_sha256:source,anchor:expected.anchor,
        runtime_class:"patcher",saved_rect:profile[0],live_rect:profile[0].slice(0,3).concat([22]),
        source_text_sha256:profile[1],helper_sha256:helpers,saved_incoming_routes:0,saved_outgoing_routes:0};
    var configured={};
    if(config.helpers&&config.helpers.length===4)for(var helper of config.helpers)configured[helper.name]=helper.sha256;
    if(definition.source_sha256!==source||expected.maxclass!=="newobj"||expected.runtime_class!=="patcher"||
        !Array.isArray(expected.runtime_classes)||JSON.stringify(expected.runtime_classes)!=='["patcher","p"]'||
        !Array.isArray(expected.rect)||JSON.stringify(expected.rect)!==JSON.stringify(profile[0])||
        expected.source_text_sha256!==profile[1]||expected.saved_incoming_routes!==0||expected.saved_outgoing_routes!==0||
        !fields(expected.shell_height_policy,policy)||!fields(definition.helper_sha256,helpers)||!fields(configured,helpers))
        throw Error("lifecycle-root-v8-class-policy");
    return "jpatcher";
}
function collectLifecycleProof(root,definition,request,config,progress) {
    if(progress)progress.stage="root-binding";
    if(request.op!=="operation"||request.action!=="close"||request.document!==definition.document||
        request.action_revision!==definition.revision||request.source_sha256!==definition.source_sha256||
        !Number.isInteger(request.command_id)||request.command_id<1||root.parentpatcher!=null||
        !samePath(root.filepath,definition.working_windows_path))throw Error("lifecycle-root-binding");
    var owner=config.lifecycle.owners[definition.lifecycle_owner_inlet];
    if(progress)progress.stage="owner-map";
    if(!owner||owner.document!==definition.document||owner.revision!==definition.revision||
        owner.source_sha256!==definition.source_sha256||owner.working_path!==definition.working_windows_path)
        throw Error("lifecycle-owner-map");
    var expected=[{varname:"__alive_numeric_reader",maxclass:"v8",rect:[-3000,-3000,160,133]},
        {varname:"__alive_numeric_disposer",maxclass:"thispatcher",rect:[-3100,-3000,100,22]},
        {varname:"__alive_numeric_freebang",maxclass:"freebang",rect:[-3200,-3000,100,22],boxtext:"freebang"},
        {varname:"__alive_numeric_lifecycle_send",maxclass:"send",rect:[-3400,-3000,200,64],boxtext:"send "+owner.channel}];
    var originals=[],harness=[],inputs=[],outputs=[],identities={},originalDefinitions=
        definition.full_inventory.filter(e=>e.anchor.split("/").length===2);
    function identify(o){
        if(progress)progress.stage="geometry";
        var rect=rectangle(o),found=expected.filter(e=>e.varname===o.varname);
        if(found.length){var e=found[0];
            if(progress)progress.stage="harness";
            if(o.maxclass!==e.maxclass||JSON.stringify(rect)!==JSON.stringify(e.rect)||
                (o.valid!==true&&o.valid!==1)||typeof o.boxtext!=="string"||
                (e.boxtext!==undefined&&o.boxtext!==e.boxtext))throw Error("lifecycle-root-harness");
            return {identity:e.varname,harness:true,rect:rect};}
        if(progress)progress.stage="original";
        found=originalDefinitions.filter(e=>{
            var policy=e.shell_height_policy,wanted=policy?policy.live_rect:e.rect,
                actualClass=lifecycleRootV8Class(e,definition,config);
            return (actualClass?o.maxclass===actualClass:o.maxclass!=="jpatcher"&&(e.runtime_classes||[e.runtime_class]).includes(o.maxclass))&&
                (o.varname||"")===(e.source_varname||"")&&JSON.stringify(rect)===JSON.stringify(wanted);});
        if(found.length!==1)throw Error("lifecycle-root-original");
        return {identity:found[0].anchor,harness:false,rect:rect};
    }
    if(progress)progress.stage="inventory";
    for(var o=root.firstobject;o;o=o.nextobject){var id=identify(o);
        if(progress)progress.stage="inventory";
        if(identities[id.identity])throw Error("lifecycle-root-duplicate");identities[id.identity]=true;
        if(id.harness)harness.push({varname:o.varname,maxclass:o.maxclass,rect:id.rect,boxtext:o.boxtext,valid:o.valid});
        else originals.push({anchor:id.identity,varname:o.varname||"",maxclass:o.maxclass,rect:id.rect});
    }
    if(progress)progress.stage="count";
    if(harness.length!==4||originals.length!==originalDefinitions.length)throw Error("lifecycle-root-count");
    function endpoint(o,port){var id=identify(o);if(!identities[id.identity]||!Number.isInteger(port)||port<0)
        throw Error("lifecycle-root-endpoint");return {identity:id.identity,port:port};}
    if(progress)progress.stage="patchcords";
    for(var o=root.firstobject;o;o=o.nextobject){var cords=o.patchcords;
        if(!cords||!Array.isArray(cords.inputs)||!Array.isArray(cords.outputs))throw Error("lifecycle-root-cords");
        for(var direction of ["inputs","outputs"])for(var c of cords[direction])
            (direction==="inputs"?inputs:outputs).push({source:endpoint(c.srcobject,c.srcoutlet),destination:endpoint(c.dstobject,c.dstinlet)});
    }
    var edge={source:{identity:"__alive_numeric_freebang",port:0},destination:{identity:"__alive_numeric_lifecycle_send",port:0}};
    if(progress)progress.stage="routes";
    if(inputs.length!==1||outputs.length!==1||JSON.stringify(inputs[0])!==JSON.stringify(edge)||
        JSON.stringify(outputs[0])!==JSON.stringify(edge))throw Error("lifecycle-root-routes");
    return {version:"freebang-v1",request_id:request.command_id,step_id:request.step_id,document:definition.document,
        revision:definition.revision,source_sha256:definition.source_sha256,working_path:root.filepath,
        root_is_top_level:true,originals:originals,harness:harness,input_routes:inputs,output_routes:outputs};
}
function rootDiagnosticValue(value,depth){
    var type=value===null?"null":Array.isArray(value)?"array":typeof value,result={type:type};
    if(type==="string"){
        result.value=value.slice(0,256);
        if(value.length>256){result.truncated=true;result.length=value.length;}
    }else if(type==="boolean")result.value=value;
    else if(type==="number"){
        if(Number.isFinite(value))result.value=value;
        else result.representation=Number.isNaN(value)?"nan":value>0?"positive-infinity":"negative-infinity";
    }else if(type==="array"){
        result.length=value.length;result.items=[];
        var count=depth>=1?0:Math.min(value.length,16);
        for(var index=0;index<count;index++)result.items.push(rootDiagnosticRead(()=>value[index],1));
        if(count<value.length)result.truncated=true;
    }
    return result;
}
function rootDiagnosticException(error,compact){
    var result={status:"threw"};
    try{result.exception=rootDiagnosticValue(error,compact?1:0);}catch(ignored){result.exception={type:typeof error,unavailable:true};}
    for(var key of ["name","message"])try{
        var value=error[key];if(typeof value==="string"){
            result[key]=value.slice(0,256);if(value.length>256)result[key+"_truncated"]=true;
        }
    }catch(ignored){}
    return result;
}
function rootDiagnosticRead(read,depth){
    try{return Object.assign({status:"returned"},rootDiagnosticValue(read(),depth||0));}
    catch(error){return rootDiagnosticException(error);}
}
function lifecycleFailureDiagnostics(root,stage,error){
    var objects=[],harnessClasses={"__alive_numeric_reader":"v8","__alive_numeric_disposer":"thispatcher",
        "__alive_numeric_freebang":"freebang","__alive_numeric_lifecycle_send":"send"};
    var scan=rootDiagnosticRead(()=>{
        var object=root.firstobject,count=0;
        while(object&&count++<16){var current=object,varname=rootDiagnosticRead(()=>current.varname);
            var row={varname:varname,maxclass:rootDiagnosticRead(()=>current.maxclass),
                patching_rect:rootDiagnosticRead(()=>current.getboxattr("patching_rect"))};
            if(varname.status==="returned"&&varname.type==="string"&&!varname.truncated&&
                row.maxclass.status==="returned"&&row.maxclass.type==="string"&&!row.maxclass.truncated&&
                Object.prototype.hasOwnProperty.call(harnessClasses,varname.value)&&harnessClasses[varname.value]===row.maxclass.value){
                row.boxtext=rootDiagnosticRead(()=>current.boxtext);row.valid=rootDiagnosticRead(()=>current.valid);
            }
            objects.push(row);object=object.nextobject;
        }
        return !object;
    });
    return {stage:stage,error:rootDiagnosticException(error),bounds:{objects:16,string_characters:256,
        array_items:16,array_depth:1,ascii_json_bytes:24000},root_objects:objects,scan:scan};
}
function lifecycleproof(requestId,stepId) {
    var config=readPrivate(configFile),request=readPrivate(config.command_path);
    var definition=config.documents.find(d=>d.document===documentName&&d.revision===revision);
    if(!definition)throw Error("lifecycle-definition");
    var path=config.lifecycle.owners[definition.lifecycle_owner_inlet].root_proof_path;
    var progress={stage:"request"};
    try{
        if(requestId!==request.command_id||stepId!==request.step_id)throw Error("lifecycle-proof-request");
        var proof=collectLifecycleProof(this.patcher,definition,request,config,progress);
        progress.stage="write";writePrivate(path,proof);
    }catch(error){
        var failure={success:false,request_id:requestId,error_code:"lifecycle-root-proof-refused"};
        try{
            var diagnostic=lifecycleFailureDiagnostics(this.patcher,progress.stage,error);
            failure.failure_diagnostics=diagnostic;
            // Bound the complete failure line below Max's observed single-line transport limit.
            function bytes(){return JSON.stringify(failure).replace(/[\u007f-\uffff]/g,"\\u0000").length;}
            while(bytes()>24000&&diagnostic.root_objects.length){
                diagnostic.root_objects.pop();diagnostic.omitted_objects=(diagnostic.omitted_objects||0)+1;
            }
            if(bytes()>24000)throw Error("lifecycle-diagnostics-size");
        }catch(diagnosticError){
            // Omitting fallback array items bounds both exceptions independently of the failed diagnostic scan.
            failure.failure_diagnostics={stage:progress.stage,error:rootDiagnosticException(error,true),
                diagnostics_error:rootDiagnosticException(diagnosticError,true)};}
        writePrivate(path,failure);
    }
}
