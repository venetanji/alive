// Original finite controller. Start empty; owner files are immutable private revisions.
autowatch = 0; inlets = 1; outlets = 0;
var configFile=jsarguments[1], config, shared, roots={}, revisions={}, seen=0, busy=false;
var ticker, pollTask, startupTask;
var anchorDiagnostics=[], geometryDispositions=[], numericModeObservations=[],controllerRepresentationObservations=[];
var closeDiagnostics=null;
var plusPreflightContext=null;
var installTrace=null;
function traceAscii(value) {
    return JSON.stringify(value).replace(/[\u007f-\uffff]/g,function(character){
        return "\\u"+("0000"+character.charCodeAt(0).toString(16)).slice(-4);
    });
}
function installTraceRefusal(code,phase,cause) {
    var error=Error("private-install-trace-refused:"+code);error.install_trace_refusal=true;
    if(installTrace&&!installTrace.failure)installTrace.failure={code:code,phase:phase,attempt:installTrace.attempt,
        original_error:installTrace.original_error,trace_error:cause?String(cause):null};
    return error;
}
function installTraceRow(phase,extra) {
    var now=(new Date()).getTime();
    if(!finite(now))throw Error("private-trace-clock-unavailable");
    var row={seq:installTrace.seq+1,request_id:51,step_id:"install-plus-r1",action:"install",document:"plus",revision:1,
        source_sha256:PLUS_SOURCE,owner_inlet:2,attempt:installTrace.attempt,phase:phase,clock:"wall-ms",
        at_ms:now,elapsed_ms:now-installTrace.started};
    for(var key in extra)row[key]=extra[key];
    return traceAscii(row)+"\n";
}
function appendInstallTrace(text) {
    var f=new File(installTrace.path,installTrace.seq===0?"write":"readwrite","TEXT");
    if(!f.isopen)throw Error("private-trace-file-unavailable");
    try {
        if(f.eof!==installTrace.bytes)throw Error("private-trace-file-size-changed");
        f.position=f.eof;f.writestring(text);
        if(f.position!==installTrace.bytes+text.length||f.eof!==f.position)throw Error("private-trace-write-progress");
    }finally{f.close();}
    installTrace.seq++;installTrace.bytes+=text.length;
}
function installTraceEvent(phase,extra) {
    if(!installTrace||!installTrace.active)return;
    if(installTrace.failure)throw installTraceRefusal(installTrace.failure.code,phase);
    try {
        var text=installTraceRow(phase,extra||{}),limit=null;
        if(text.length>2048)limit="record-bytes";
        else if(installTrace.seq>=2047)limit="records";
        else if(installTrace.bytes+text.length>2097152-2048)limit="total-bytes";
        if(limit) {
            // The final row and its full byte budget are reserved before every normal append.
            var marker=installTraceRow("trace-limit",{limit:limit,interrupted_phase:phase});
            if(marker.length>2048||installTrace.seq>=2048||installTrace.bytes+marker.length>2097152)
                throw Error("private-trace-limit-marker-unavailable");
            appendInstallTrace(marker);throw installTraceRefusal("limit",phase);
        }
        appendInstallTrace(text);
    }catch(error){
        if(error&&error.install_trace_refusal)throw error;
        throw installTraceRefusal("sink",phase,error);
    }
}
function beginInstallTrace(command) {
    installTrace=null;
    if(command.command_id!==51||command.op!=="operation"||command.action!=="install"||command.document!=="plus"||
        command.revision!==1||command.action_revision!==1||command.step_id!=="install-plus-r1")return;
    installTrace={active:true,path:null,seq:0,bytes:0,attempt:0,started:(new Date()).getTime(),original_error:null,
        failure:null,observations:{},observation_id:0,snapshot_attempt:-1,capabilities:[]};
    try {
        var definition=definitionFor("plus",1),owner=config.lifecycle&&config.lifecycle.owners&&config.lifecycle.owners[2];
        var cfg=typeof configFile==="string"?configFile.replace(/\\/g,"/"):"";
        var ackPath=typeof config.ack_path==="string"?config.ack_path.replace(/\\/g,"/"):"";
        if(!/\/config\.json$/.test(cfg)||!/\/ack\.json$/.test(ackPath)||
            cfg.slice(0,-11)!==ackPath.slice(0,-8)||/(^|\/)\.{1,2}(\/|$)/.test(cfg)||
            definition.source_sha256!==PLUS_SOURCE||command.source_sha256!==PLUS_SOURCE||definition.lifecycle_owner_inlet!==2||
            !owner||owner.inlet!==2||owner.document!=="plus"||owner.revision!==1||owner.source_sha256!==PLUS_SOURCE||
            typeof definition.working_windows_path!=="string"||!definition.working_windows_path||
            owner.working_path!==definition.working_windows_path)throw Error("private-trace-install-binding");
        installTrace.path=cfg.slice(0,-11)+"install-plus-r1-trace.jsonl";
        var existing=new File(installTrace.path,"read"),present=existing.isopen;
        if(present){existing.close();throw Error("private-trace-already-exists");}
    }catch(error){throw installTraceRefusal("binding","command-consumed",error);}
    installTraceEvent("command-consumed",{working_path:definition.working_windows_path});
}
function installTraceObservation(kind,index,row) {
    if(!installTrace||!installTrace.active)return;
    var key=kind+":"+index,text=traceAscii(row);
    if(installTrace.observations[key]===text)return;
    var id=++installTrace.observation_id,total=Math.ceil(text.length/512);
    for(var part=0;part<total;part++)installTraceEvent("observation-chunk",{
        observation_kind:kind,observation_id:id,part:part,parts:total,data:text.slice(part*512,(part+1)*512)});
    installTrace.observations[key]=text;
}
function retainAnchorDiagnostic(row) {
    anchorDiagnostics.push(row);installTraceObservation("anchor",anchorDiagnostics.length-1,row);
}
function installTraceCollected() {
    if(!installTrace||!installTrace.active||installTrace.snapshot_attempt===installTrace.attempt)return;
    for(var i=0;i<anchorDiagnostics.length;i++)installTraceObservation("anchor",i,anchorDiagnostics[i]);
    for(var i=0;i<geometryDispositions.length;i++)installTraceObservation("geometry",i,geometryDispositions[i]);
    installTrace.snapshot_attempt=installTrace.attempt;
}
function installTraceCapability(result,anchor,pendingTraceFailure) {
    if(installTrace&&installTrace.active) {
        var retained={anchor:anchor,method:result.method,observation:result},found=false;
        for(var i=0;i<installTrace.capabilities.length;i++)if(installTrace.capabilities[i].anchor===anchor&&
            installTrace.capabilities[i].method===result.method){installTrace.capabilities[i]=retained;found=true;break;}
        if(!found)installTrace.capabilities.push(retained);
        if(pendingTraceFailure)throw pendingTraceFailure;
        installTraceEvent("capability-exit",retained);
    }
    return result;
}
function read(path) {
    var f=new File(path,"read"),text="";
    if (!f.isopen) return null;
    try {
        var length=f.eof;
        if(!finite(length)||length<0||Math.floor(length)!==length)throw Error("private-file-read-size");
        if(f.position!==0)throw Error("private-file-read-position");
        while(f.position<length) {
            var before=f.position,count=Math.min(4096,length-before),chunk=f.readstring(count);
            if(typeof chunk!=="string"||chunk.length===0||chunk.length>count||f.position!==before+chunk.length)
                throw Error("private-file-read-progress");
            text+=chunk;
        }
        if(f.position!==length||f.eof!==length)throw Error("private-file-read-size");
        return JSON.parse(text);
    }finally{f.close();}
}
function write(path,value) {
    // ASCII chunks avoid Max's observed 32768-byte line limit and split UTF-16 pairs safely.
    var text=JSON.stringify(value).replace(/[\u007f-\uffff]/g,function(character){
        return "\\u"+("0000"+character.charCodeAt(0).toString(16)).slice(-4);
    })+"\n";
    var f=new File(path,"write","TEXT");if(!f.isopen)throw Error("private-file-unavailable");
    try {
        f.eof=0;f.position=0;
        if(f.eof!==0||f.position!==0)throw Error("private-file-truncate-refused");
        for(var offset=0;offset<text.length;offset+=4096) {
            var chunk=text.slice(offset,offset+4096),before=f.position;
            f.writestring(chunk);
            if(f.position!==before+chunk.length)throw Error("private-file-write-progress");
        }
        if(f.eof!==text.length)throw Error("private-file-write-size");
    }finally{f.close();}
}
function record(kind,extra) {
    var row={seq:++shared.seq,request_id:shared.request_id,step_id:shared.step_id,action:shared.action,
        action_document:shared.action_document,action_revision:shared.action_revision,kind:kind};
    for(var k in extra)row[k]=extra[k];
    var f=new File(config.journal_path,"readwrite","TEXT");
    if(!f.isopen)throw Error("private-journal-unavailable");
    f.position=f.eof;f.writeline(JSON.stringify(row));f.close();
}
function samePath(a,b) {
    return typeof a==="string"&&typeof b==="string"&&
        a.replace(/\\/g,"/").toLowerCase()===b.replace(/\\/g,"/").toLowerCase();
}
function finite(v){return typeof v==="number"&&isFinite(v);}
function sameRect(a,b) {
    if(!a||!b||a.length!==4||b.length!==4)return false;
    for(var i=0;i<4;i++)if(!finite(a[i])||!finite(b[i])||Math.abs(a[i]-b[i])>0.01)return false;
    return true;
}
function sameNumbers(a,b) {
    if(!a||!b||a.length!==b.length)return false;
    for(var i=0;i<a.length;i++)if(!finite(a[i])||a[i]!==b[i])return false;
    return true;
}
// Exact capture001 hashes; authored/live geometry remains private configuration.
var GEOMETRY_SOURCE="1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b";
var GEOMETRY_HELPERS={"helpstarter.js":"a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8","helpname.js":"49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa","helpdetails.js":"31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1","helpargs.js":"04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469"};
var GEOMETRY_EVIDENCE={"ack_sha256":"8a9b1405f0e5b6cc0706c57c54660777d73736eafb5281025fcd17f9f0addaeb","config_sha256":"a6512b968a0637b93752b446ebfc5c4ab86f0cb6c006b22272ec52f9091c3cff","seal_sha256":"34634c43ab942f092fe2f2ccc66e4ea987ca9c5e78d7649cc7d026e728ab9070","manifest_sha256":"65ad2d5c90b185f4c89ca512274cf61682ab2ca9e939b79f52d8234e61c6c0b3","rea_evidence_id":"ev_a9118e14891b1c344fa246dcb7663ea520d23df9c742ffc3dd450a6289a37098"};
var TIMES_GEOMETRY_PINS={"root/obj-3":{"runtime_class":"js","changed_dimension":3,"source_box_sha256":"c7355e6a1bd3aef210bfd59ead9d88a6faa6c3aaba8fb2eda9ccbaa5accf6ec9","source_text_sha256":"0ca81c69553c5299b7dc137769cb0887e0f1dc26c73bfe08c0e04891d8a99d02","saved_rect_sha256":"4814549a20cdea1cfbb09260659e96090b0f19f029fd07d1405c2a48d7288f69","live_rect_sha256":"db4ae3c63db9fecef333bf4657bce3104026f6484bd5ab0edd0bc53c328ecd7e"},"root/obj-4":{"runtime_class":"patcher","changed_dimension":3,"source_box_sha256":"339c2bd0981f0070983da5a867fef9356a4a992df87739ff60b05a946df309fc","source_text_sha256":"484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393","saved_rect_sha256":"d354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb","live_rect_sha256":"6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3"},"root/obj-4/obj-5":{"runtime_class":"jsui","changed_dimension":2,"source_box_sha256":"eb55b6bacadd9290ad4ee92a7d298d2145bb0c4107afc28a60405c9d40bfa247","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"fc417b56433ec311af6d252074e5992d7ba6210f706e1ae5fd1f9982d385996c","live_rect_sha256":"9feebcd05aba863038f477eeded7fe885e0634d3e796d765969fdd55cecc478c"},"root/obj-1":{"runtime_class":"patcher","changed_dimension":3,"source_box_sha256":"ae8f1b27f351f9a4adb1997619d3b70f80666212c66402864934e5c5b753ab6e","source_text_sha256":"bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a","saved_rect_sha256":"d9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86","live_rect_sha256":"1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926"}};
// Capture004 plus-only identities; measured vectors remain private.
var PLUS_SOURCE="d1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895";
var PLUS_EVIDENCE={"ack_sha256":"ed2fe5493d43ee8d00ee06cb76bd39bf5ddbbe00723e9b8ed62730ab66394cd6","config_sha256":"cc06829fbbd1e0e89888152e0f2d4407df5a4e9a3817d7aa7e3a1a40e5ac74fb","seal_sha256":"c3f37c41129eead48fc0f97597731d2c9e3ae3596746ee8d9551ee89d0426e5c","command_sha256":"7a53e382e6d67241fef6ac8e313f76986896991c789971b5f7c2d1b3cdf93261","manifest_sha256":"9b00b30ab36278e5e387bdac9deeb42364fdfa2948cf902be0a015488a04cd11","package_sha256":"22d237c6efd59c8aa87acad901da09028999e369d62c89deb1cc3fe646da177a","rea_evidence_id":"ev_ebf222bc4a6c33847e6667ce57f8dffcf8eb185e38e981a0efbfee44492f47a1","audit_sha256":"925a70d2cda0811794b03eb8f59ff76127ccfed10c0c843b36f368550ba88c53"};
var PLUS_GEOMETRY_PINS={"root/obj-1":{"source_box_sha256":"c4af8c73939eab75ed8940ff6b03159859ca0a782cd411601e0ea594db29d8e2","source_text_sha256":"e86f190fbc376badcc5d7b14a552d4e84fad436e0789bb2c7cc221fa38bf9390","saved_rect_sha256":"7c282ca427b38aa6bf81f9155d70ce5720fd0f12f6ab4ef4da21f6441c947cd6","runtime_class":"js","changed_dimension":3,"live_rect_sha256":"da868357a7d43088775aeb0784d73cae93002d63fcabbd3ceddd53521cd20e84"},"root/obj-2":{"source_box_sha256":"bbc5fe757f0ef027839d4a09709a97b50451ae9a5fec7d7f38aa810d53ce9f92","source_text_sha256":"484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393","saved_rect_sha256":"d354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb","runtime_class":"patcher","changed_dimension":3,"live_rect_sha256":"6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3"},"root/obj-2/obj-4":{"source_box_sha256":"d9b8da7ef51019bd5837726c704eda09de39cffe89f08bd61e32811cde5acd0f","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"a421ba89c6cd1917427e84dbab006bf66255f8cf04f84b0b83de8c6c6b4646d2","runtime_class":"jsui","changed_dimension":2,"live_rect_sha256":"ef478f664cd641a901af80ccc3be0b0f9a1388d863a267d636bdb72fd1a5908a"},"root/obj-3":{"source_box_sha256":"310417ef44ee7139be2082fc5bbc63c5a65dfa5d10ab54894b29fe164b84c100","source_text_sha256":"bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a","saved_rect_sha256":"d9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86","runtime_class":"patcher","changed_dimension":3,"live_rect_sha256":"1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926"}};
var PLUS_NUMERIC_PINS={"root/obj-2/obj-1":{"source_box_sha256":"c873e45cc1ebc4c71b93a736b509fc0f622d4764df74edb3a21f5bad4d999a78","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"97bd3d008866faa2c6cdc5bf0de64333c64bd29bf79bae29b6ae070ec6823267"},"root/obj-2/obj-24":{"source_box_sha256":"d84cf4a6a5daa8db1d4b2616b5c1f94385a15d274a80be64ca07ddcb728d8cb3","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"14acfb0d484e461a00397ecfb34329cfe8167d5e47b6360edbd54f0fabbd91bc"},"root/obj-2/obj-23":{"source_box_sha256":"5b0e92ade41a0633d5d5dc178c9fd1ebc519f7014d331e4a924afff0dfe07982","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"38b2cd4242257c9f9802ef997eccb7d32e451c1b05f37868136baa42fb89636c"}};
var TIMES_NUMERIC_PINS={"root/obj-4/obj-1":"3c1b5b23cac75bca82bf1aa6c7c161ca91e8e050d41c2fed4549959291d45360","root/obj-4/obj-24":"d46ddd6aff2b7184bce9a8b1218416dcb47db543026c78a533139b289cb73b42","root/obj-4/obj-23":"f122ac20a6bf9ecec78a24a73a0cbd911d938b441439337f9298ae4dfbcc853c"};
var NUMERIC_REPRESENTATION_EVIDENCE={"ack_sha256":"47764e9dac8f1ec69514509e22e93849e6d8d9a13783c60843757d8a0a3fb22a","config_sha256":"801e50b51d1055791cc07221776ebeaf1c1d755088a36c86d05722a3cfb94ec3","seal_sha256":"cdfd0f740b0705af080b6bff21d7ace7004bb94bc0713addd99e1eebf84b084d","manifest_sha256":"40bca79b06ddbbcd8644fca527e4240fab68f79b7acc8b526a6467399c562616","rea_evidence_id":"ev_51b14ef10881b6c5b881216a7fd4fa1b0f0c5c5e8bc05f75694dcbc9c4426d5d"};
var NUMERIC_REPRESENTATION_PINS={"root/obj-4/obj-1":{"source_box_sha256":"3c1b5b23cac75bca82bf1aa6c7c161ca91e8e050d41c2fed4549959291d45360","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"be69f9cbfae7d8916a7697c10b45556c60dab2bf806f472f39a1f743c6b71562","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"},"root/obj-4/obj-24":{"source_box_sha256":"d46ddd6aff2b7184bce9a8b1218416dcb47db543026c78a533139b289cb73b42","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"3ae5be738626430c7205dcb01a2fba671d0f93a83677c43e9ba362422cdd0754","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"},"root/obj-4/obj-23":{"source_box_sha256":"f122ac20a6bf9ecec78a24a73a0cbd911d938b441439337f9298ae4dfbcc853c","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"6172628b9bf9e972a77a1773539e5ffe75c0b592876ec787c48026a2e90b89f2","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"}};
var PLUS_CONTROLLER_COHORT_PINS={"root/obj-2/obj-1":{"source_box_sha256":"c873e45cc1ebc4c71b93a736b509fc0f622d4764df74edb3a21f5bad4d999a78","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"97bd3d008866faa2c6cdc5bf0de64333c64bd29bf79bae29b6ae070ec6823267","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"},"root/obj-2/obj-24":{"source_box_sha256":"d84cf4a6a5daa8db1d4b2616b5c1f94385a15d274a80be64ca07ddcb728d8cb3","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"14acfb0d484e461a00397ecfb34329cfe8167d5e47b6360edbd54f0fabbd91bc","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"},"root/obj-2/obj-23":{"source_box_sha256":"5b0e92ade41a0633d5d5dc178c9fd1ebc519f7014d331e4a924afff0dfe07982","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"38b2cd4242257c9f9802ef997eccb7d32e451c1b05f37868136baa42fb89636c","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"}};
var PLUS_CONTROLLER_COHORT_BINDING="31e249de8a69dd317ae9b50f93bca88e3da8392edda68dd7b66865e6a0c98a89";
var PLUS_CONTROLLER_FORMAT_SHA256="dcdadd560ab2234a2bf2d2b5ed44e5d7640e88eefe6bdbc98aa84aaf31649983";
var PLUS_CONTROLLER_COHORT_EVIDENCE={"trace_sha256":"2b3287e45de1123f8ac7582544aa13da5dbfba6650d2aa33e7a46b5f8be39a63","config_sha256":"4a922bf0b1e2d2c5755eb339d0fa8e73a4139f74c5acc3b92352388e85a167ad","seal_sha256":"3e5b31cdcb62618e08444d35c2ec20815cf07a21aad86de4d058ca6a94170935","manifest_sha256":"c4fc2bf8badc5cfc98b85d2b1bc8dad9cd7df42f730665521080631ecefad898","controller_sha256":"c0b0a45ef7a72a484fa976774f5a10e1ca9fcf6892603f723fb7df6c220a3d97","package_sha256":"b140eddbac9d134e162ff4cfdf2388be1285cf45b9127bd8bcc0d253ff0e99e5","historical_binding_sha256":"bce1edf4484c73bf95a5c1c1648ff7e7f8f3ce479fe96c92be6639fa6e466df6","audit_sha256":"9ded6e777503d6181120dc92c3f4745ec4eb565e5a6f29e9bd52c38755870e8d","investigation_sha256":"7b555ff81a58e426185fb9fca93b23216e18cf0205a8a923b3ca70c892e3e54b","verification_sha256":"081856c4f782f6c1603d998e6637c2355c84585635c7a3deca980e1b1cce2bfc","rea_evidence_id":"ev_a0ed6947bdad1fbe7e7ba19b62634a570fdff7803e7db65363b019dd0db409c8","trace_role":"incomplete-install-prefix","observed_revision":1};
function plusControllerNumericCohortPolicy(expected,definition,configuration) {
    var policy=expected.plus_controller_numeric_cohort_policy;
    if(typeof policy==="undefined")return null;
    var pin=PLUS_CONTROLLER_COHORT_PINS[expected.anchor],configured={};
    if(configuration&&Array.isArray(configuration.helpers)&&configuration.helpers.length===4)
        for(var i=0;i<configuration.helpers.length;i++)configured[configuration.helpers[i].name]=configuration.helpers[i].sha256;
    if(!pin||!definition||definition.document!=="plus"||definition.source_sha256!==PLUS_SOURCE||
        !sameData(definition.helper_sha256,GEOMETRY_HELPERS)||!sameData(configured,GEOMETRY_HELPERS)||
        (typeof definition.revision!=="undefined"&&definition.revision!==1&&definition.revision!==2)||
        expected.maxclass!=="flonum"||expected.runtime_class!=="flonum"||!sameData(expected.runtime_classes,["flonum"])||
        expected.source_box_sha256!==pin.source_box_sha256||expected.source_text_sha256!==pin.source_text_sha256||
        geometryVectorHash(expected.rect)!==pin.saved_rect_sha256||typeof expected.initial_numeric!=="number"||
        !isFinite(expected.initial_numeric)||geometryVectorHash([expected.initial_numeric,0,0,0])!==pin.initial_numeric_sha256)
        throw Error("plus-controller-cohort-source-binding");
    var wanted={kind:"plus-controller-numeric-cohort-v1",engine:"js-controller",document:"plus",source_sha256:PLUS_SOURCE,
        anchor:expected.anchor,source_class:"flonum",runtime_class:"number",source_box_sha256:pin.source_box_sha256,
        source_text_sha256:pin.source_text_sha256,saved_rect_sha256:pin.saved_rect_sha256,initial_numeric_sha256:pin.initial_numeric_sha256,
        cohort_anchors:Object.keys(PLUS_NUMERIC_PINS),cohort_binding_sha256:PLUS_CONTROLLER_COHORT_BINDING,
        helper_sha256:GEOMETRY_HELPERS,evidence:PLUS_CONTROLLER_COHORT_EVIDENCE,
        format_method:"getattr",format_attribute:"format",format_representation:"scalar-number",format_value_sha256:PLUS_CONTROLLER_FORMAT_SHA256,
        getter_method:"getvalueof",getter_representation:"singleton-number-array",finite_required:true,
        source_initial_equality:true,fresh_complete_cohort_required:true};
    if(!sameData(policy,wanted))throw Error("plus-controller-cohort-policy-changed");
    return policy;
}
function plusControllerCohortMetadata(definition,configuration) {
    var boxes=definition.boxes||[],inventory=definition.full_inventory||[],selected=[],saved=[],anchors=Object.keys(PLUS_NUMERIC_PINS);
    for(var i=0;i<boxes.length;i++)if(typeof boxes[i].plus_controller_numeric_cohort_policy!=="undefined")selected.push(boxes[i]);
    for(var i=0;i<inventory.length;i++)if(typeof inventory[i].plus_controller_numeric_cohort_policy!=="undefined")saved.push(inventory[i]);
    if(!selected.length&&!saved.length)return false;
    if(selected.length!==3||saved.length!==3)throw Error("incomplete-plus-controller-cohort-policy");
    var keys=["maxclass","runtime_class","runtime_classes","rect","source_box_sha256","source_text_sha256","initial_numeric","plus_controller_numeric_cohort_policy"];
    for(var i=0;i<anchors.length;i++) {
        var anchor=anchors[i],a=selected.filter(function(b){return b.anchor===anchor;}),b=saved.filter(function(b){return b.anchor===anchor;});
        if(a.length!==1||b.length!==1)throw Error("plus-controller-cohort-member-inventory");
        plusControllerNumericCohortPolicy(a[0],definition,configuration);plusControllerNumericCohortPolicy(b[0],definition,configuration);
        for(var j=0;j<keys.length;j++)if(!sameData(a[0][keys[j]],b[0][keys[j]]))throw Error("plus-controller-cohort-descriptor-copy");
    }
    return true;
}
function sameData(a,b) {
    if(a===b)return true;
    if(!a||!b||typeof a!=="object"||typeof b!=="object"||Array.isArray(a)!==Array.isArray(b))return false;
    var left=Object.keys(a).sort(),right=Object.keys(b).sort();
    if(left.length!==right.length)return false;
    for(var i=0;i<left.length;i++)if(left[i]!==right[i]||!sameData(a[left[i]],b[right[i]]))return false;
    return true;
}
// SHA-256 of an ASCII JSON rectangle; this independently pins private vectors.
function geometryVectorHash(rect) {
    if(!Array.isArray(rect)||rect.length!==4)throw Error("geometry-hash-shape");
    for(var check=0;check<4;check++)if(typeof rect[check]!=="number"||!isFinite(rect[check]))throw Error("geometry-hash-value");
    var input=JSON.stringify(rect),words=[],length=input.length*8;
    for(var i=0;i<input.length;i++)words[i>>2]=(words[i>>2]||0)|(input.charCodeAt(i)<<(24-(i%4)*8));
    words[length>>5]=(words[length>>5]||0)|(0x80<<(24-length%32));
    words[(((length+64)>>9)<<4)+15]=length;
    var h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    function rotate(value,count){return (value>>>count)|(value<<(32-count));}
    for(var offset=0;offset<words.length;offset+=16){
        var w=[],state=h.slice(0);
        for(var round=0;round<64;round++){
            if(round<16)w[round]=words[offset+round]|0;
            else{var a=w[round-15],b=w[round-2];
                w[round]=((rotate(a,7)^rotate(a,18)^(a>>>3))+w[round-16]+
                    (rotate(b,17)^rotate(b,19)^(b>>>10))+w[round-7])|0;}
            var first=(state[7]+(rotate(state[4],6)^rotate(state[4],11)^rotate(state[4],25))+
                ((state[4]&state[5])^(~state[4]&state[6]))+k[round]+w[round])|0;
            var second=((rotate(state[0],2)^rotate(state[0],13)^rotate(state[0],22))+
                ((state[0]&state[1])^(state[0]&state[2])^(state[1]&state[2])))|0;
            state=[(first+second)|0,state[0],state[1],state[2],(state[3]+first)|0,state[4],state[5],state[6]];
        }
        for(var index=0;index<8;index++)h[index]=(h[index]+state[index])|0;
    }
    var output="";for(var index=0;index<8;index++)output+=("00000000"+(h[index]>>>0).toString(16)).slice(-8);
    return output;
}
function minusAsciiHash(input) {
    var words=[],length=input.length*8;
    for(var i=0;i<input.length;i++)words[i>>2]=(words[i>>2]||0)|(input.charCodeAt(i)<<(24-(i%4)*8));
    words[length>>5]=(words[length>>5]||0)|(0x80<<(24-length%32));
    words[(((length+64)>>9)<<4)+15]=length;
    var h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    function rotate(value,count){return (value>>>count)|(value<<(32-count));}
    for(var offset=0;offset<words.length;offset+=16){
        var w=[],state=h.slice(0);
        for(var round=0;round<64;round++){
            if(round<16)w[round]=words[offset+round]|0;
            else{var a=w[round-15],b=w[round-2];
                w[round]=((rotate(a,7)^rotate(a,18)^(a>>>3))+w[round-16]+
                    (rotate(b,17)^rotate(b,19)^(b>>>10))+w[round-7])|0;}
            var first=(state[7]+(rotate(state[4],6)^rotate(state[4],11)^rotate(state[4],25))+
                ((state[4]&state[5])^(~state[4]&state[6]))+k[round]+w[round])|0;
            var second=((rotate(state[0],2)^rotate(state[0],13)^rotate(state[0],22))+
                ((state[0]&state[1])^(state[0]&state[2])^(state[1]&state[2])))|0;
            state=[(first+second)|0,state[0],state[1],state[2],(state[3]+first)|0,state[4],state[5],state[6]];
        }
        for(var index=0;index<8;index++)h[index]=(h[index]+state[index])|0;
    }
    var output="";for(var index=0;index<8;index++)output+=("00000000"+(h[index]>>>0).toString(16)).slice(-8);
    return output;
}
var MINUS_SOURCE="7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0";
var MINUS_SOURCE_PATH="/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources/help/max/minus.maxhelp";
var MINUS_PROJECTION_SHA256="c17962fba204a882ce5b0bca6c792e55c0a4181366c7dfe0c39b28152215084e";
var MINUS_TARGETS=["root/obj-2/obj-1","root/obj-2/obj-24","root/obj-2/obj-23"];
var MINUS_PINS={
    "root/obj-1":{source_box_sha256:"47b23e380478f1e93c6b234356c0fa2f472fa399cc583372ce1abbb9616188b0",source_text_sha256:"490326e775bc3adc514c502064cb4b937c4122d2450e8b62c85f583077795a37",saved_rect_sha256:"4f39e57126f4c857cccaa454c4ab0e63ba3242488875a7ce82e28a36a8473599",live_rect_sha256:"2bbedba5a709496a6e1b8b7252ad7551792415160de76c6243e424be2e44fecf",runtime_class:"js",changed_dimension:3},
    "root/obj-2":{source_box_sha256:"e254f23d85b8ee207253f4dc1029b3edfc6f0c1a812bda01d40c8d2d6439d709",source_text_sha256:"484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393",saved_rect_sha256:"d354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb",live_rect_sha256:"6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3",runtime_class:"patcher",changed_dimension:3},
    "root/obj-3":{source_box_sha256:"3622827a44f82021c6fdc23b03d27df271c3c9f9984a27b866204a10f93c49f6",source_text_sha256:"bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a",saved_rect_sha256:"d9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86",live_rect_sha256:"1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926",runtime_class:"patcher",changed_dimension:3},
    "root/obj-2/obj-4":{source_box_sha256:"524b28f0b96fd76c10f82fa9f77f97758537b51d01698a5186e35842d9ba07e7",source_text_sha256:"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",saved_rect_sha256:"340d5343c495ec0ef2df4cf661f7721c884d92e69f786c61876d64cc258789df",live_rect_sha256:"c4bfc3fab3c2e8957c0b09681ee183e78f32d3b524c9b4d8710ac11c17dcfd6a",runtime_class:"jsui",changed_dimension:2},
    "root/obj-2/obj-1":{source_box_sha256:"28fec7d46992171319a9ec22ab58a29f4bd64b37d0911c1737011b8ec6ada820",source_text_sha256:"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",saved_rect_sha256:"8fcf2982f5c69c778c940dccf3fdaea0019d77ca05f69b6867da71b1f05f8ec5",live_rect_sha256:"8fcf2982f5c69c778c940dccf3fdaea0019d77ca05f69b6867da71b1f05f8ec5",runtime_class:"number",changed_dimension:null},
    "root/obj-2/obj-24":{source_box_sha256:"d26fc7fade06b3d6932ac9c355de12f1aaa240599fed6461867b5bfcfa81ed19",source_text_sha256:"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",saved_rect_sha256:"0096550e8a7358d46eaf6b7e05238b1df060d90b50bf8a9c65ba87a1f3e7f763",live_rect_sha256:"0096550e8a7358d46eaf6b7e05238b1df060d90b50bf8a9c65ba87a1f3e7f763",runtime_class:"number",changed_dimension:null},
    "root/obj-2/obj-23":{source_box_sha256:"7d43f313c084a84dea7eac4e09e104439f9b21553a056c9d3858c8122b6e628b",source_text_sha256:"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",saved_rect_sha256:"620809c4f421f0cf433e13bd34bb01d5bf3cb08603635a78463b2694197b2f95",live_rect_sha256:"620809c4f421f0cf433e13bd34bb01d5bf3cb08603635a78463b2694197b2f95",runtime_class:"number",changed_dimension:null}
};
var minusIntrinsicApply=null;
try{minusIntrinsicApply=Function.prototype.call.bind(Function.prototype.apply);}catch(minusBridgeError){}
function minusCanonical(value) {
    if(value===null)return "null";
    if(typeof value==="string")return JSON.stringify(value).replace(/[\u007f-\uffff]/g,function(c){return "\\u"+("000"+c.charCodeAt(0).toString(16)).slice(-4);});
    if(typeof value==="boolean")return value?"true":"false";
    if(typeof value==="number") {
        if(!finite(value))throw Error("minus-canonical-nonfinite");
        if(value===0)return "0";
        if(Math.floor(value)===value&&Math.abs(value)>9007199254740991) {
            var number=Math.abs(value),bits=[],digits=[0];
            while(number){bits.push(number%2);number=Math.floor(number/2);}
            for(var bit=bits.length-1;bit>=0;bit--){var carry=bits[bit];
                for(var d=0;d<digits.length;d++){var next=digits[d]*2+carry;digits[d]=next%10;carry=Math.floor(next/10);}
                if(carry)digits.push(carry);}
            return (value<0?"-":"")+digits.reverse().join("");
        }
        if(Math.floor(value)!==value&&Math.abs(value)<0.0001)
            return value.toExponential().replace(/e([+-])(\d)$/, "e$10$2");
        return JSON.stringify(value);
    }
    if(!value||typeof value!=="object")throw Error("minus-canonical-type");
    var pieces=[],i;
    if(Array.isArray(value)){for(i=0;i<value.length;i++)pieces.push(minusCanonical(value[i]));return "["+pieces.join(",")+"]";}
    var keys=Object.keys(value).sort();
    for(i=0;i<keys.length;i++)pieces.push(minusCanonical(keys[i])+":"+minusCanonical(value[keys[i]]));
    return "{"+pieces.join(",")+"}";
}
function minusCanonicalHash(value){return minusAsciiHash(minusCanonical(value));}
function minusKeys(value,keys) {
    return !!value&&typeof value==="object"&&!Array.isArray(value)&&sameData(Object.keys(value).sort(),keys.split(" ").sort());
}
function minusInteger(value){return finite(value)&&Math.floor(value)===value&&value>=0&&value<=9007199254740991;}
function minusCommand(command) {
    return minusKeys(command,"command_id op action document revision action_revision step_id source_sha256")&&
        command.command_id===101&&command.op==="operation"&&command.action==="install"&&command.document==="minus"&&
        command.revision===1&&command.action_revision===1&&command.step_id==="install-minus-r1"&&command.source_sha256===MINUS_SOURCE;
}
function minusSourceDefinition(definition,configuration,command) {
    var d=definition,c=configuration;
    if(!minusCommand(command)||!minusKeys(d,"document source_sha256 helper_sha256 basic_anchor basic_varname boxes full_inventory saved_edges observer_leaves revision lifecycle_owner_inlet pristine_path source_path working_path working_windows_path")||
        d.document!=="minus"||d.revision!==1||d.source_sha256!==MINUS_SOURCE||d.lifecycle_owner_inlet!==4||
        d.basic_anchor!=="root/obj-2"||d.basic_varname!=="basic_tab"||!sameData(d.helper_sha256,GEOMETRY_HELPERS)||
        !c||typeof c.work!=="string"||!c.work||d.source_path!==MINUS_SOURCE_PATH||
        d.pristine_path!==c.work+"/pristine/minus-r1.maxhelp"||d.working_path!==c.work+"/working/minus-r1.maxhelp"||
        d.working_windows_path!=="Z:"+d.working_path||!Array.isArray(c.documents)||
        c.documents.filter(function(x){return x.document==="minus"&&x.revision===1;}).length!==1||
        c.documents.indexOf(d)===-1||!Array.isArray(c.helpers)||c.helpers.length!==4)throw Error("minus-source-request-binding");
    var helpers={};
    for(var i=0;i<c.helpers.length;i++) {
        var h=c.helpers[i];
        if(!minusKeys(h,"name sha256 bytes path")||helpers[h.name]||GEOMETRY_HELPERS[h.name]!==h.sha256||
            !minusInteger(h.bytes)||h.bytes===0||h.path!=="help/resources/"+h.name)throw Error("minus-helper-binding");
        helpers[h.name]=h.sha256;
    }
    if(!sameData(helpers,GEOMETRY_HELPERS))throw Error("minus-helper-inventory");
    var owners=c.lifecycle&&c.lifecycle.owners,owner=owners&&owners[4];
    if(!Array.isArray(owners)||!minusKeys(owner,"inlet document revision source_sha256 working_path channel root_proof_path")||
        owner.inlet!==4||owner.document!=="minus"||owner.revision!==1||owner.source_sha256!==MINUS_SOURCE||
        owner.working_path!==d.working_windows_path||typeof owner.channel!=="string"||!owner.channel||
        typeof owner.root_proof_path!=="string"||!owner.root_proof_path)throw Error("minus-owner-binding");
    if(!Array.isArray(d.boxes)||d.boxes.length!==16||!Array.isArray(d.full_inventory)||d.full_inventory.length!==20||
        !Array.isArray(d.saved_edges)||d.saved_edges.length!==8||!Array.isArray(d.observer_leaves)||d.observer_leaves.length!==19)
        throw Error("minus-source-inventory");
    var seen={},full={},basic={},fields="anchor authored_empty authored_text inlets maxclass outlets rect runtime_class runtime_classes source_box_sha256 source_text_sha256";
    for(var view=0;view<2;view++) {
        var rows=view?d.boxes:d.full_inventory;
        for(i=0;i<rows.length;i++) {
            var b=rows[i];
            if(!minusKeys(b,fields+(view?" id initial_numeric role":" child saved_incoming_routes saved_outgoing_routes source_varname"))||
                typeof b.anchor!=="string"||typeof b.authored_empty!=="boolean"||typeof b.authored_text!=="string"||
                b.authored_empty!==(b.authored_text.length===0)||!minusInteger(b.inlets)||!minusInteger(b.outlets)||
                typeof b.maxclass!=="string"||typeof b.runtime_class!=="string"||!Array.isArray(b.runtime_classes)||!b.runtime_classes.length||
                b.runtime_classes.some(function(x){return typeof x!=="string";})||
                typeof b.source_box_sha256!=="string"||typeof b.source_text_sha256!=="string"||
                !/^[a-f0-9]{64}$/.test(b.source_box_sha256)||!/^[a-f0-9]{64}$/.test(b.source_text_sha256))throw Error("minus-descriptor-schema");
            geometryVectorHash(b.rect);
            if(view) {
                if(typeof b.id!=="string"||b.anchor!==d.basic_anchor+"/"+b.id||basic[b.id]||
                    b.initial_numeric!==null&&!finite(b.initial_numeric)||b.role!==null&&typeof b.role!=="string")throw Error("minus-basic-schema");
                basic[b.id]=b;
                var corresponding=full[b.anchor];if(!corresponding)throw Error("minus-basic-correspondence");
                var common=fields.split(" ");for(var j=0;j<common.length;j++)if(!sameData(b[common[j]],corresponding[common[j]]))throw Error("minus-basic-copy");
            }else {
                if(seen[b.anchor]||typeof b.child!=="boolean"||!minusInteger(b.saved_incoming_routes)||!minusInteger(b.saved_outgoing_routes)||
                    b.source_varname!==null&&typeof b.source_varname!=="string")throw Error("minus-full-schema");
                seen[b.anchor]=true;full[b.anchor]=b;
            }
        }
    }
    for(i=0;i<d.saved_edges.length;i++) {
        var edge=d.saved_edges[i];if(!minusKeys(edge,"source destination index")||!minusInteger(edge.index)||edge.index!==i)throw Error("minus-edge-schema");
        for(var side=0;side<2;side++) {
            var end=edge[side?"destination":"source"],box=end&&basic[end[0]];
            if(!Array.isArray(end)||end.length!==2||typeof end[0]!=="string"||!box||!minusInteger(end[1])||end[1]>=(side?box.inlets:box.outlets))throw Error("minus-edge-port");
        }
    }
    for(i=0;i<d.observer_leaves.length;i++) {
        var leaf=d.observer_leaves[i],box=leaf&&full[leaf.anchor];
        if(!minusKeys(leaf,"anchor port varname")||!box||!minusInteger(leaf.port)||leaf.port>=box.outlets||typeof leaf.varname!=="string")throw Error("minus-leaf-schema");
    }
    for(var anchor in MINUS_PINS) {
        var pin=MINUS_PINS[anchor],box=full[anchor];
        if(!box||box.source_box_sha256!==pin.source_box_sha256||box.source_text_sha256!==pin.source_text_sha256||
            geometryVectorHash(box.rect)!==pin.saved_rect_sha256)throw Error("minus-source-pin");
    }
    var projection={},keys="document source_sha256 helper_sha256 basic_anchor basic_varname boxes full_inventory saved_edges observer_leaves".split(" ");
    for(i=0;i<keys.length;i++)projection[keys[i]]=d[keys[i]];
    if(minusCanonicalHash(projection)!==MINUS_PROJECTION_SHA256)throw Error("minus-source-projection");
    return owner;
}
function createMinusDiagnosticCollector(command,definition) {
    if(!minusCommand(command))return null;
    var configuration=config,action=shared,documents=config.documents,helpers=config.helpers,lifecycle=config.lifecycle;
    var owners=lifecycle&&lifecycle.owners,owner=owners&&owners[4],bridge=minusIntrinsicApply;
    var initial=null,authority=null,sourceValidated=false,root=null,retained=null,evidence=null,attempted=false;
    var nativeFunctionString=Function.prototype.toString,objectConstructorString=nativeFunctionString.call(Object),
        arrayConstructorString=nativeFunctionString.call(Array);
    var plainPrototypes=[{prototype:Object.prototype,array:false,parent:null},
        {prototype:Array.prototype,array:true,parent:Object.prototype}];
    var progress={version:"minus-collector-progress-v1",identity:{request_id:101,step_id:"install-minus-r1",document:"minus",
        revision:1,source_sha256:MINUS_SOURCE,owner_inlet:4,working_path:null},initial_snapshot_available:false,
        observe_entries:0,source_validation_attempts:0,source_validated:false,host_sample_attempts:0,
        envelope_created:false,collection_entered:false,phase:"initial-inputs",last_sample_phase:null,
        first_eligibility_failure:null,last_eligibility_failure:null};
    var progressPoll=0,progressStage="initialization",failureRecorded=false;
    function phase(value){progress.phase=value;}
    function samplePhase(value){phase(value);progress.last_sample_phase=value;}
    function refusal(reason,code) {
        var failure={poll_index:progressPoll,stage:progressStage,phase:progress.phase,reason:reason,error_code:code};
        if(!progress.first_eligibility_failure)progress.first_eligibility_failure=failure;
        progress.last_eligibility_failure=failure;failureRecorded=true;
    }
    function reject(code,reason){refusal(reason,code);throw Error(code);}
    function inputs() {
        if(config!==configuration||shared!==action||config.documents!==documents||config.helpers!==helpers||
            config.lifecycle!==lifecycle||!lifecycle||lifecycle.owners!==owners||owners[4]!==owner||
            documents.indexOf(definition)===-1||!minusCommand(command)||
            !sameData(plusInstallIdentity(),{request_id:101,step_id:"install-minus-r1",action:"install",action_document:"minus",action_revision:1}))
            reject("minus-input-identity","input-identity");
    }
    try{
        inputs();
        phase("initial-snapshots");
        initial={command:minusCanonical(command),definition:minusCanonical(definition),configuration:minusCanonical(config),owner:minusCanonical(owner)};
        authority={command:JSON.parse(initial.command),definition:JSON.parse(initial.definition),
            configuration:JSON.parse(initial.configuration),owner:JSON.parse(initial.owner)};
        progress.initial_snapshot_available=true;
        var ownedPath=authority.definition.working_windows_path;
        progress.identity.working_path=typeof ownedPath==="string"?ownedPath:null;phase("ready");
    }catch(initialError){initial=null;if(!failureRecorded)refusal("threw",null);}
    function plainPrototype(prototype,array) {
        if(prototype===null)return true;
        for(var i=0;i<plainPrototypes.length;i++) {
            var allowed=plainPrototypes[i];
            if(prototype!==allowed.prototype)continue;
            if(array!==allowed.array||Object.getPrototypeOf(prototype)!==allowed.parent||
                Object.getOwnPropertyDescriptor(prototype,"toJSON"))return false;
            return !array||plainPrototype(allowed.parent,false);
        }
        // A foreign realm's intrinsic constructor must point back to this exact prototype.
        var constructor=Object.getOwnPropertyDescriptor(prototype,"constructor");
        if(!constructor||typeof constructor.value!=="function")return false;
        var descriptor=Object.getOwnPropertyDescriptor(constructor.value,"prototype"),parent=Object.getPrototypeOf(prototype);
        if(!descriptor||descriptor.value!==prototype||nativeFunctionString.call(constructor.value)!==
            (array?arrayConstructorString:objectConstructorString)||Object.getOwnPropertyDescriptor(prototype,"toJSON"))return false;
        if(array?!Array.isArray(prototype)||!plainPrototype(parent,false):parent!==null)return false;
        plainPrototypes.push({prototype:prototype,array:array,parent:parent});return true;
    }
    function samePlain(current,expected) {
        var remaining=100000,ancestors=[];
        function compare(value,snapshot,depth) {
            if(--remaining<0||depth>128||typeof value!==typeof snapshot)return false;
            if(snapshot===null||typeof snapshot!=="object")return value===snapshot;
            if(!value||Array.isArray(value)!==Array.isArray(snapshot)||ancestors.indexOf(value)!==-1)return false;
            if(!plainPrototype(Object.getPrototypeOf(value),Array.isArray(value)))return false;
            if(typeof Object.getOwnPropertySymbols==="function"&&Object.getOwnPropertySymbols(value).length)return false;
            var keys=Object.getOwnPropertyNames(value),expectedKeys=Object.getOwnPropertyNames(snapshot);
            if(keys.length!==expectedKeys.length)return false;
            ancestors.push(value);
            for(var i=0;i<expectedKeys.length;i++) {
                var key=expectedKeys[i],descriptor=Object.getOwnPropertyDescriptor(value,key);
                if(!descriptor||!Object.prototype.hasOwnProperty.call(descriptor,"value")||!compare(descriptor.value,snapshot[key],depth+1))return false;
            }
            ancestors.pop();return true;
        }
        return compare(current,expected,0);
    }
    function sameInputs(){
        if(!initial)return false;
        inputs();
        return samePlain(command,authority.command)&&samePlain(definition,authority.definition)&&
            samePlain(config,authority.configuration)&&samePlain(owner,authority.owner);
    }
    function sample() {
        progress.host_sample_attempts++;
        samplePhase("front-root");
        if(max.frontpatcher!==root)reject("minus-root-ownership","front-root-mismatch");
        samplePhase("root-parent");
        if(root.parentpatcher!==null)reject("minus-root-ownership","root-parent-mismatch");
        var handles=[],data=[],scopes=[],mapped={},eligibility={};
        function scope(p,parent,container,count) {
            samplePhase("scope-duplicate");
            if(scopes.indexOf(p)!==-1)reject("minus-scope-ownership","duplicate-scope");
            if(parent!=="root") {
                samplePhase("child-parent");
                if(p.parentpatcher!==root)reject("minus-scope-ownership","child-parent-mismatch");
                samplePhase("child-container");
                if(p.box!==container)reject("minus-scope-ownership","child-container-mismatch");
            }
            scopes.push(p);handles.push(p);var objects=[],rows=[];eligibility[parent]=[];
            samplePhase("scope-firstobject");
            for(var object=p.firstobject;object;object=object.nextobject) {
                samplePhase("object-inventory");
                if(objects.length>=count||handles.indexOf(object)!==-1)reject("minus-runtime-inventory","runtime-inventory");
                objects.push(object);handles.push(object);
                samplePhase("object-parent");
                if(object.patcher!==p)reject("minus-object-parent","object-parent-mismatch");
                samplePhase("object-class");var cls=object.maxclass;
                samplePhase("object-name");var name=object.varname;
                samplePhase("object-rectangle");var rawRect=object.getboxattr("patching_rect"),rect=[];
                samplePhase("object-identity");
                if(typeof cls!=="string"||name!==null&&typeof name!=="string")reject("minus-runtime-identity","runtime-identity");
                samplePhase("rectangle-shape");
                if(!Array.isArray(rawRect)||rawRect.length!==4)reject("minus-runtime-rectangle","runtime-rectangle");
                for(var coordinate=0;coordinate<4;coordinate++) {
                    samplePhase("rectangle-coordinate");
                    var value=rawRect[coordinate];if(!finite(value))reject("minus-runtime-coordinate","runtime-coordinate");rect.push(value);
                }
                samplePhase("runtime-mapping");
                var expected;
                if(retained) {
                    // The first source-pinned sample owns these eligibility values.
                    var candidates=retained.eligibility[parent],ordered=candidates&&candidates[objects.length-1];
                    var eligible=function(candidate){return candidate.runtime_classes.indexOf(cls)!==-1&&sameNumbers(rect,candidate.rect);};
                    expected=ordered&&eligible(ordered)?[ordered]:(candidates||[]).filter(eligible);
                }else {
                    var rectHash=geometryVectorHash(rect);
                    expected=definition.full_inventory.filter(function(b){
                        if(b.anchor.slice(0,b.anchor.lastIndexOf("/"))!==parent)return false;
                        var pin=MINUS_PINS[b.anchor];
                        return pin?cls===pin.runtime_class&&rectHash===pin.live_rect_sha256:
                            b.runtime_classes.indexOf(cls)!==-1&&sameNumbers(rect,b.rect);
                    });
                }
                if(expected.length!==1||mapped[expected[0].anchor])reject("minus-runtime-bijection","runtime-bijection");
                var b=expected[0],pin=MINUS_PINS[b.anchor];
                samplePhase("runtime-name");
                if(b.source_varname!==null?name!==b.source_varname:name!==null&&name!=="")reject("minus-runtime-name","runtime-name");
                samplePhase("runtime-dimension");
                if(!retained&&pin&&pin.changed_dimension!==null)for(var dimension=0;dimension<4;dimension++)
                    if((dimension===pin.changed_dimension)===(rect[dimension]===b.rect[dimension]))reject("minus-runtime-dimension","runtime-dimension");
                if(!retained)eligibility[parent].push({anchor:b.anchor,source_varname:b.source_varname,child:b.child,rect:rect.slice(),
                    runtime_classes:pin?[pin.runtime_class]:authority.definition.full_inventory.filter(function(row){return row.anchor===b.anchor;})[0].runtime_classes.slice()});
                mapped[b.anchor]=object;rows.push({anchor:b.anchor,maxclass:cls,varname:name,rect:rect});
                samplePhase("object-child");var child=object.subpatcher();
                if(b.child) {
                    samplePhase("named-child");
                    if(!child||p.getnamed(b.source_varname)!==object)reject("minus-named-child","named-child");
                    samplePhase("child-scope");
                    if(b.anchor!=="root/obj-2"&&b.anchor!=="root/obj-3")reject("minus-unexpected-scope","unexpected-scope");
                    scope(child,b.anchor,object,b.anchor==="root/obj-2"?16:0);
                }else if(child)reject("minus-unexpected-child","unexpected-child");
                samplePhase("object-nextobject");
            }
            samplePhase("scope-count");
            if(objects.length!==count)reject("minus-scope-count","scope-count");data.push({scope:parent,rows:rows});
        }
        scope(root,"root",null,4);
        samplePhase("full-count");
        if(Object.keys(mapped).length!==20||scopes.length!==3)reject("minus-full-count","full-count");
        samplePhase("root-filepath");
        var filepath=root.filepath;
        // This is the final host read; only plain input/snapshot checks follow.
        samplePhase("final-inputs");
        if(!sameInputs())reject("minus-final-input-binding","final-inputs");
        samplePhase("final-path");
        if(!samePath(filepath,definition.working_windows_path))reject("minus-final-input-binding","final-path");
        return {handles:handles,data:data,filepath:filepath,mapped:mapped,eligibility:eligibility};
    }
    function invalidate(pollIndex,stage,code) {
        if(!evidence||evidence.terminal_context.stale)return;
        evidence.terminal_context.stale=true;
        evidence.terminal_context.first_invalidation={poll_index:pollIndex,stage:stage,code:code};
    }
    function guard(pollIndex,stage) {
        progressPoll=pollIndex;progressStage=stage;failureRecorded=false;
        var code=null;
        try{
            var now=sample();
            phase("binding-comparison");
            if(now.filepath!==retained.filepath||now.data.length!==retained.data.length||now.handles.length!==retained.handles.length)code="binding-changed";
            else {
                for(var i=0;i<now.handles.length;i++)if(now.handles[i]!==retained.handles[i]){code="binding-changed";break;}
                for(i=0;!code&&i<now.data.length;i++) {
                    var current=now.data[i],previous=retained.data[i];
                    if(current.scope!==previous.scope||current.rows.length!==previous.rows.length){code="binding-changed";break;}
                    for(var j=0;j<current.rows.length;j++) {
                        var a=current.rows[j],b=previous.rows[j];
                        if(a.anchor!==b.anchor||a.maxclass!==b.maxclass||a.varname!==b.varname||!sameNumbers(a.rect,b.rect)){code="binding-changed";break;}
                    }
                }
            }
        }catch(guardError){if(!failureRecorded)refusal("threw",null);code="guard-threw";}
        if(code&&!failureRecorded)refusal("binding-changed","binding-changed");
        if(code)invalidate(pollIndex,stage,code);return code;
    }
    function stop(stage,index,code) {
        if(!evidence.collection.first_failure)evidence.collection.first_failure={stage:stage,method_index:index,code:code};
        evidence.collection.status="stopped";
    }
    function observation(row,status,representation,value) {
        var result={method:row.method,status:status,representation:representation,value:value};
        if(row.attribute!==null)result.attribute=row.attribute;return result;
    }
    function classify(raw,row) {
        var representation="scalar-number",value=raw;
        if(raw===null)return observation(row,"returned","null",null);
        if(typeof raw==="undefined")return observation(row,"returned","undefined",null);
        if(Array.isArray(raw)) {
            var length=raw.length;if(length!==1)return observation(row,"returned","ambiguous-array",null);
            value=raw[0];representation="singleton-number-array";
        }
        if(typeof value!=="number")return observation(row,"returned","other",null);
        if(!finite(value))return observation(row,"returned","nonfinite",null);
        return observation(row,"returned",representation,value);
    }
    function collect(pollIndex) {
        progress.collection_entered=true;phase("collection-entry");
        for(var index=0;index<6;index++) {
            var row=evidence.methods[index],object=retained.mapped[row.anchor],code=guard(pollIndex,"collection-guard"),fn=null;
            if(code){stop("guard-before-lookup",index,code);break;}
            attempted=true;evidence.counts.lookups_attempted++;
            phase("method-lookup");
            try{fn=object[row.method];row.lookup_status=typeof fn==="function"?"callable":"unavailable";}
            catch(lookupError){row.lookup_status="threw";}
            if(row.lookup_status==="unavailable")row.observation=observation(row,"unavailable","unavailable",null);
            code=guard(pollIndex,"collection-guard");
            if(code){stop("guard-before-invocation",index,code);break;}
            if(row.lookup_status==="callable") {
                if(typeof bridge!=="function"){row.invocation_status="unsupported";stop("invocation",index,"unsupported-intrinsic-bridge");break;}
                var raw,classificationFailed=false;
                evidence.counts.invocation_attempts++;
                phase("method-invocation");
                try {
                    raw=bridge(fn,object,row.attribute===null?[]:[row.attribute]);
                    row.invocation_status="returned";
                    row.observation=observation(row,"returned","classification-threw",null);
                }catch(invocationError){row.invocation_status="threw";row.observation=observation(row,"threw","threw",null);}
                evidence.counts.invocation_outcomes_retained++;
                if(row.invocation_status==="returned") {
                    phase("result-classification");
                    try{row.observation=classify(raw,row);}catch(classificationError){classificationFailed=true;stop("classification",index,"classification-threw");}
                }
                raw=null;fn=null;
                code=guard(pollIndex,"collection-guard");
                if(code){stop("guard-after-outcome",index,code);break;}
                if(classificationFailed)break;
            }else {
                code=guard(pollIndex,"collection-guard");if(code){stop("guard-after-outcome",index,code);break;}
            }
            if(index%2===1)evidence.counts.completed_pairs++;
        }
    }
    return {
        observe:function(patcher,d,pollIndex,diagnostics) {
            progress.observe_entries++;progressPoll=pollIndex;progressStage="eligibility";failureRecorded=false;phase("observe-entry");
            if(attempted)return;
            if(!initial){refusal("initial-unavailable",null);return;}
            if(d!==definition){refusal("definition-identity",null);return;}
            try {
                phase("plain-inputs");
                if(!sameInputs()){refusal("input-inequality",null);return;}
                if(!sourceValidated) {
                    phase("source-validation");progress.source_validation_attempts++;
                    minusSourceDefinition(d,configuration,command);
                    phase("post-source-inputs");
                    if(!sameInputs()){refusal("input-inequality",null);return;}
                    sourceValidated=true;progress.source_validated=true;
                }
                root=patcher;
                var bindings=sample();
                phase("diagnostic-shape");
                if(diagnostics.length!==7||geometryDispositions.length||numericModeObservations.length||controllerRepresentationObservations.length){refusal("diagnostic-shape",null);return;}
                var anchors={};
                for(var i=0;i<diagnostics.length;i++) {
                    phase("diagnostic-pins");
                    var row=diagnostics[i],pin=MINUS_PINS[row.expected_anchor];
                    var expected=d.full_inventory.filter(function(b){return b.anchor===row.expected_anchor;})[0];
                    if(!pin||anchors[row.expected_anchor]||!expected||row.diagnostic_type||!sameData(row.expected_rect,expected.rect)||
                        row.expected_maxclass!==expected.maxclass||row.expected_runtime_class!==expected.runtime_class){refusal("diagnostic-pin-mismatch",null);return;}
                    var parent=expected.anchor.slice(0,expected.anchor.lastIndexOf("/"));
                    var scope=bindings.data.filter(function(s){return s.scope===parent;})[0];
                    phase("diagnostic-candidates");
                    if(!scope||!sameData(row.candidates,scope.rows.map(function(r){return {maxclass:r.maxclass,rect:r.rect};}))){refusal("diagnostic-candidate-mismatch",null);return;}
                    anchors[row.expected_anchor]=true;
                }
                retained=bindings;
                phase("envelope-creation");
                evidence={version:"minus-controller-diagnostic-v1",binding:{command:JSON.parse(initial.command),owner:JSON.parse(initial.owner),
                    working_path:d.working_windows_path,source_projection_sha256:MINUS_PROJECTION_SHA256,helper_sha256:JSON.parse(minusCanonical(d.helper_sha256)),
                    command_snapshot_sha256:minusAsciiHash(initial.command),definition_snapshot_sha256:minusAsciiHash(initial.definition),
                    configuration_snapshot_sha256:minusAsciiHash(initial.configuration),owner_snapshot_sha256:minusAsciiHash(initial.owner)},
                    collection:{poll_index:pollIndex,diagnostic_sha256:minusCanonicalHash(diagnostics),status:"complete",first_failure:null},methods:[],
                    counts:{lookups_attempted:0,invocation_attempts:0,invocation_outcomes_retained:0,completed_pairs:0},
                    terminal_context:{stale:false,first_invalidation:null}};
                progress.envelope_created=true;
                for(i=0;i<6;i++)evidence.methods.push({anchor:MINUS_TARGETS[Math.floor(i/2)],method:i%2?"getvalueof":"getattr",attribute:i%2?null:"format",
                    lookup_status:"unattempted",invocation_status:"unattempted",observation:null});
                collect(pollIndex);
            }catch(eligibilityError){if(!failureRecorded)refusal("threw",null);}
        },
        later:function(pollIndex){if(attempted)guard(pollIndex,"later-validation");},
        terminal:function(pollIndex){if(attempted)guard(pollIndex,"terminal-guard");},
        exportData:function(){return attempted?JSON.parse(JSON.stringify(evidence)):null;},
        exportProgress:function(){
            phase("terminal-export");
            var result=JSON.parse(JSON.stringify(progress));
            result.counts=evidence?{lookup_attempts:evidence.counts.lookups_attempted,invocation_attempts:evidence.counts.invocation_attempts,
                outcomes_retained:evidence.counts.invocation_outcomes_retained,completed_pairs:evidence.counts.completed_pairs}:
                {lookup_attempts:0,invocation_attempts:0,outcomes_retained:0,completed_pairs:0};
            result.collection=evidence?{status:evidence.collection.status,first_failure:evidence.collection.first_failure}:null;
            return JSON.parse(JSON.stringify(result));
        }
    };
}
function observedGeometryPolicy(expected,definition,configuration) {
    var policy=expected.observed_geometry_policy;if(typeof policy==="undefined")return null;
    var plus=definition&&definition.document==="plus",name=plus?"plus":"times",source=plus?PLUS_SOURCE:GEOMETRY_SOURCE;
    var pin=(plus?PLUS_GEOMETRY_PINS:TIMES_GEOMETRY_PINS)[expected.anchor],evidence=plus?PLUS_EVIDENCE:GEOMETRY_EVIDENCE,configured={};
    if(!pin||!definition||definition.document!==name||definition.source_sha256!==source||
        !sameData(definition.helper_sha256,GEOMETRY_HELPERS)||!configuration||!configuration.helpers||configuration.helpers.length!==4)
        throw Error("unobserved-arithmetic-geometry-binding");
    for(var index=0;index<configuration.helpers.length;index++){var helper=configuration.helpers[index];configured[helper.name]=helper.sha256;}
    var wanted={kind:name+"-observed-geometry-v1",document:name,source_sha256:source,
        anchor:expected.anchor,runtime_class:pin.runtime_class,changed_dimension:pin.changed_dimension,
        source_box_sha256:pin.source_box_sha256,source_text_sha256:pin.source_text_sha256,
        saved_rect:expected.rect,live_rect:policy.live_rect,saved_rect_sha256:pin.saved_rect_sha256,
        live_rect_sha256:pin.live_rect_sha256,helper_sha256:GEOMETRY_HELPERS,evidence:evidence,
        saved_incoming_routes:0,saved_outgoing_routes:0};
    if(!sameData(policy,wanted)||!sameData(configured,GEOMETRY_HELPERS)||expected.runtime_class!==pin.runtime_class||
        (plus&&expected.maxclass!==(pin.runtime_class==="jsui"?"jsui":"newobj"))||
        expected.source_box_sha256!==pin.source_box_sha256||expected.source_text_sha256!==pin.source_text_sha256||
        expected.saved_incoming_routes!==0||expected.saved_outgoing_routes!==0||
        !Array.isArray(policy.live_rect)||policy.live_rect.length!==4||!Array.isArray(expected.rect)||expected.rect.length!==4)
        throw Error("measured-arithmetic-geometry-binding-changed");
    for(var i=0;i<4;i++)if(typeof policy.live_rect[i]!=="number"||!isFinite(policy.live_rect[i])||
        typeof expected.rect[i]!=="number"||!isFinite(expected.rect[i])||
        (i===pin.changed_dimension?policy.live_rect[i]===expected.rect[i]:policy.live_rect[i]!==expected.rect[i]))
        throw Error("measured-arithmetic-geometry-vector-changed");
    if(geometryVectorHash(policy.saved_rect)!==pin.saved_rect_sha256||geometryVectorHash(policy.live_rect)!==pin.live_rect_sha256)
        throw Error("measured-arithmetic-geometry-vector-hash-changed");
    return policy;
}
function capabilityObservation(object,method,attribute,anchor) {
    installTraceEvent("capability-enter",{anchor:anchor||null,method:method});
    var result={method:method,status:"unavailable",representation:"unavailable",value:null};
    if(attribute)result.attribute=attribute;
    var raw,available=false,pendingTraceFailure=null;try{if(typeof object[method]==="function") {
        available=true;
        raw=attribute?object[method](attribute):object[method]();}}catch(error){
        result.status="threw";result.representation="threw";}
    if(!available||result.status==="threw")return installTraceCapability(result,anchor);
    // Keep trace I/O outside the capability catch; retain its result before propagating a sink refusal.
    try{installTraceEvent("capability-call-return",{anchor:anchor||null,method:method});}
    catch(traceError){pendingTraceFailure=traceError;}
    result.status="returned";
    if(raw===null){result.representation="null";return installTraceCapability(result,anchor,pendingTraceFailure);}
    if(typeof raw==="undefined"){result.representation="undefined";return installTraceCapability(result,anchor,pendingTraceFailure);}
    var value=raw;
    if(Array.isArray(raw)) {
        if(raw.length!==1){result.representation="ambiguous-array";return installTraceCapability(result,anchor,pendingTraceFailure);}
        value=raw[0];result.representation="singleton-number-array";
    }else result.representation="scalar-number";
    if(typeof value!=="number"){result.representation="other";return installTraceCapability(result,anchor,pendingTraceFailure);}
    if(!isFinite(value)){result.representation="nonfinite";return installTraceCapability(result,anchor,pendingTraceFailure);}
    result.value=value;return installTraceCapability(result,anchor,pendingTraceFailure);
}
function plusNumericPreflightBinding(object,expected,definition,root) {
    var pin=PLUS_NUMERIC_PINS[expected.anchor],configured={},revision=definition&&definition.revision;
    if(config&&Array.isArray(config.helpers)&&config.helpers.length===4)for(var i=0;i<config.helpers.length;i++)
        configured[config.helpers[i].name]=config.helpers[i].sha256;
    var owner=config&&config.lifecycle&&config.lifecycle.owners&&definition&&config.lifecycle.owners[definition.lifecycle_owner_inlet];
    var documents=config&&Array.isArray(config.documents)?config.documents.filter(function(d){return d.document==="plus"&&d.revision===revision;}):[];
    var originals=definition&&Array.isArray(definition.full_inventory)?definition.full_inventory.filter(function(b){return b.anchor===expected.anchor;}):[];
    if(!pin||!definition||definition.document!=="plus"||definition.source_sha256!==PLUS_SOURCE||
        !sameData(definition.helper_sha256,GEOMETRY_HELPERS)||!sameData(configured,GEOMETRY_HELPERS)||
        (revision!==1&&revision!==2)||definition.lifecycle_owner_inlet!==revision+1||
        !owner||owner.inlet!==definition.lifecycle_owner_inlet||owner.document!=="plus"||owner.revision!==revision||owner.source_sha256!==PLUS_SOURCE||
        typeof definition.working_windows_path!=="string"||!definition.working_windows_path||
        !root||root.parentpatcher!==null||!samePath(root.filepath,definition.working_windows_path)||
        owner.working_path!==definition.working_windows_path||documents.length!==1||
        documents[0].source_sha256!==PLUS_SOURCE||documents[0].working_windows_path!==definition.working_windows_path||
        documents[0].lifecycle_owner_inlet!==definition.lifecycle_owner_inlet||originals.length!==1||!sameData(originals[0],expected)||
        expected.maxclass!=="flonum"||expected.runtime_class!=="flonum"||!sameData(expected.runtime_classes,["flonum"])||
        expected.source_box_sha256!==pin.source_box_sha256||expected.source_text_sha256!==pin.source_text_sha256||
        geometryVectorHash(expected.rect)!==pin.saved_rect_sha256||object.maxclass!=="number"||
        !sameNumbers(object.getboxattr("patching_rect"),expected.rect)||!shared||shared.action!=="install"||
        shared.action_document!=="plus"||shared.action_revision!==revision||shared.step_id!=="install-plus-r"+revision||
        !finite(shared.request_id)||shared.request_id<1||Math.floor(shared.request_id)!==shared.request_id)
        throw Error("unobserved-plus-numeric-preflight-binding");
}
function numericPreflightObservation(object,expected,definition,cohort) {
    if(definition&&definition.document==="plus") {
        var context=cohort||plusPreflightContext;
        if(!context||context.definition!==definition||
            !context.candidates.some(function(row){return row.object===object&&row.expected===expected;}))
            throw Error("incomplete-plus-numeric-preflight-inventory");
        plusNumericPreflightBinding(object,expected,definition,context.root);
        if(cohort&&(!sameData(cohort.request_snapshot,plusInstallIdentity())||
            cohort.definition_snapshot!==JSON.stringify(definition)||
            cohort.owner_snapshot!==JSON.stringify(config.lifecycle.owners[definition.lifecycle_owner_inlet])))
            throw Error("plus-controller-cohort-preflight-changed");
    }else{
        var configured={};
        if(config&&config.helpers&&config.helpers.length===4)for(var i=0;i<config.helpers.length;i++)
            configured[config.helpers[i].name]=config.helpers[i].sha256;
        if(!definition||definition.document!=="times"||definition.source_sha256!==GEOMETRY_SOURCE||
            !sameData(definition.helper_sha256,GEOMETRY_HELPERS)||!sameData(configured,GEOMETRY_HELPERS)||
            expected.maxclass!=="flonum"||expected.runtime_class!=="flonum"||object.maxclass!=="number"||
            expected.source_box_sha256!==TIMES_NUMERIC_PINS[expected.anchor]||!TIMES_NUMERIC_PINS[expected.anchor]||
            !sameNumbers(object.getboxattr("patching_rect"),expected.rect)||!shared||shared.action!=="install"||
            shared.action_document!==definition.document||shared.action_revision!==definition.revision||
            typeof shared.request_id!=="number"||shared.request_id<1||Math.floor(shared.request_id)!==shared.request_id||
            typeof shared.step_id!=="string")throw Error("unobserved-numeric-preflight-binding");
    }
    var observation={anchor:expected.anchor,document:definition.document,revision:definition.revision,
        source_sha256:definition.source_sha256,source_box_sha256:expected.source_box_sha256,
        request_id:shared.request_id,step_id:shared.step_id,operation_action:"install",
        source_class:"flonum",runtime_class:"number",receipt_tag_observed:false};
    if(cohort) {
        observation.engine="js-controller";observation.cohort_satisfied=false;
        observation.policy=plusControllerNumericCohortPolicy(expected,definition,config);
        context.candidates.filter(function(row){return row.object===object;})[0].diagnostic.numeric_preflight_observation=observation;
        controllerRepresentationObservations.push(observation);
    }
    observation.format_observation=capabilityObservation(object,"getattr","format",expected.anchor);
    observation.value_observation=capabilityObservation(object,"getvalueof",null,expected.anchor);
    return observation;
}
function controllerNumericRepresentationPolicy(expected,definition,configuration) {
    var policy=expected.controller_numeric_representation_policy;if(typeof policy==="undefined")return null;
    var pin=NUMERIC_REPRESENTATION_PINS[expected.anchor],configured={};
    if(!pin||!definition||definition.document!=="times"||definition.source_sha256!==GEOMETRY_SOURCE||
        !sameData(definition.helper_sha256,GEOMETRY_HELPERS)||!configuration||!configuration.helpers||configuration.helpers.length!==4)
        throw Error("unobserved-controller-numeric-binding");
    for(var i=0;i<configuration.helpers.length;i++)configured[configuration.helpers[i].name]=configuration.helpers[i].sha256;
    var wanted={kind:"times-controller-numeric-representation-v1",engine:"js-controller",document:"times",
        source_sha256:GEOMETRY_SOURCE,anchor:expected.anchor,source_class:"flonum",runtime_class:"number",
        source_box_sha256:pin.source_box_sha256,source_text_sha256:pin.source_text_sha256,
        saved_rect_sha256:pin.saved_rect_sha256,initial_numeric_sha256:pin.initial_numeric_sha256,
        helper_sha256:GEOMETRY_HELPERS,evidence:NUMERIC_REPRESENTATION_EVIDENCE,
        format_method:"getattr",format_attribute:"format",format_representation:"scalar-number",format_value:6,
        getter_method:"getvalueof",getter_representation:"singleton-number-array",finite_required:true,source_initial_equality:true};
    if(!sameData(policy,wanted)||!sameData(configured,GEOMETRY_HELPERS)||expected.maxclass!=="flonum"||
        expected.runtime_class!=="flonum"||!sameData(expected.runtime_classes,["flonum"])||
        expected.source_box_sha256!==pin.source_box_sha256||expected.source_text_sha256!==pin.source_text_sha256||
        typeof expected.initial_numeric!=="number"||!isFinite(expected.initial_numeric)||
        geometryVectorHash(expected.rect)!==pin.saved_rect_sha256||
        geometryVectorHash([expected.initial_numeric,0,0,0])!==pin.initial_numeric_sha256||
        (typeof definition.revision!=="undefined"&&
            (typeof definition.revision!=="number"||Math.floor(definition.revision)!==definition.revision||
                (definition.revision!==1&&definition.revision!==2))))throw Error("controller-numeric-policy-changed");
    return policy;
}
function controllerNumericRepresentationObservation(object,expected,definition) {
    var policy=controllerNumericRepresentationPolicy(expected,definition,config),revision=definition.revision;
    var owner=config&&config.lifecycle&&config.lifecycle.owners&&config.lifecycle.owners[definition.lifecycle_owner_inlet];
    var documents=config&&config.documents?config.documents.filter(function(d){return d.document==="times"&&d.revision===revision;}):[];
    if(!policy||(revision!==1&&revision!==2)||definition.lifecycle_owner_inlet!==revision-1||
        !owner||owner.document!=="times"||owner.revision!==revision||owner.source_sha256!==GEOMETRY_SOURCE||
        typeof definition.working_windows_path!=="string"||!definition.working_windows_path||
        owner.working_path!==definition.working_windows_path||documents.length!==1||
        documents[0].source_sha256!==definition.source_sha256||documents[0].working_windows_path!==definition.working_windows_path||
        documents[0].lifecycle_owner_inlet!==definition.lifecycle_owner_inlet||
        !shared||shared.action!=="install"||shared.action_document!=="times"||shared.action_revision!==revision||
        shared.step_id!=="install-times-r"+revision||typeof shared.request_id!=="number"||
        !isFinite(shared.request_id)||shared.request_id<1||Math.floor(shared.request_id)!==shared.request_id)
        throw Error("controller-numeric-install-owner-binding");
    var liveRect;
    try{liveRect=object.getboxattr("patching_rect");}catch(error){throw Error("controller-numeric-live-geometry-unavailable");}
    if(!sameNumbers(liveRect,expected.rect))throw Error("controller-numeric-live-geometry-changed");
    var row={anchor:expected.anchor,document:"times",revision:revision,source_sha256:GEOMETRY_SOURCE,
        source_box_sha256:expected.source_box_sha256,request_id:shared.request_id,step_id:shared.step_id,
        operation_action:"install",engine:"js-controller",source_class:"flonum",runtime_class:object.maxclass,
        receipt_tag_observed:false,policy:policy,format_observation:capabilityObservation(object,"getattr","format"),
        value_observation:capabilityObservation(object,"getvalueof")};
    var old=null;
    for(var i=0;i<controllerRepresentationObservations.length;i++)if(controllerRepresentationObservations[i].anchor===row.anchor&&
        controllerRepresentationObservations[i].document===row.document&&controllerRepresentationObservations[i].revision===revision)
        old=controllerRepresentationObservations[i];
    if(old&&!sameData(old,row))throw Error("controller-numeric-observation-changed-during-bind");
    if(!old)controllerRepresentationObservations.push(row);
    if(object.maxclass!=="number"||row.format_observation.status!=="returned"||
        row.format_observation.representation!=="scalar-number"||row.format_observation.value!==6||
        row.value_observation.status!=="returned"||row.value_observation.representation!=="singleton-number-array"||
        typeof row.value_observation.value!=="number"||!isFinite(row.value_observation.value)||
        row.value_observation.value!==expected.initial_numeric)throw Error("controller-numeric-live-representation-refused");
    return row;
}
function resolve(patcher,expected,definition,dispositions,plusCandidates,bindings) {
    var forbidden=["annotation_width_policy","observer_policy","shell_height_policy","annotation_geometry_policy","numeric_mode_policy"];
    for(var i=0;i<forbidden.length;i++)if(typeof expected[forbidden[i]]!=="undefined")
        throw Error("arithmetic-policy-not-admitted");
    plusControllerNumericCohortPolicy(expected,definition,config);
    var policy=observedGeometryPolicy(expected,definition,config);
    var representation=controllerNumericRepresentationPolicy(expected,definition,config);
    var found=[],foundRects=[],diagnostic={expected_anchor:expected.anchor,expected_rect:expected.rect,
        expected_maxclass:expected.maxclass,expected_runtime_class:expected.runtime_class,candidates:[]};
    for(var o=patcher.firstobject;o;o=o.nextobject) {
        var rect=null;try{rect=o.getboxattr("patching_rect");}catch(error){}
        diagnostic.candidates.push({maxclass:o.maxclass,rect:rect});
        var savedMatches=policy&&definition.document==="plus"?sameNumbers(rect,expected.rect):sameRect(rect,expected.rect);
        if(savedMatches||(policy&&sameNumbers(rect,policy.live_rect))){found.push(o);foundRects.push(rect);}
    }
    var classes=representation?["number"]:(expected.runtime_classes||[expected.runtime_class]);
    if(found.length!==1||classes.indexOf(found[0].maxclass)===-1||
        (expected.child&&found[0].varname!==expected.source_varname)) {
        if(!representation&&found.length===1&&definition&&definition.document==="times"&&definition.source_sha256===GEOMETRY_SOURCE&&
            expected.maxclass==="flonum"&&found[0].maxclass==="number"&&TIMES_NUMERIC_PINS[expected.anchor])
            diagnostic.numeric_preflight_observation=numericPreflightObservation(found[0],expected,definition);
        if(plusCandidates&&found.length===1&&definition&&definition.document==="plus"&&definition.source_sha256===PLUS_SOURCE&&
            expected.maxclass==="flonum"&&found[0].maxclass==="number"&&PLUS_NUMERIC_PINS[expected.anchor])
            plusCandidates.push({object:found[0],expected:expected,diagnostic:diagnostic});
        retainAnchorDiagnostic(diagnostic);throw Error("strict-original-geometry-class-unavailable");
    }
    if(representation)controllerNumericRepresentationObservation(found[0],expected,definition);
    if(policy&&sameNumbers(found[0].getboxattr("patching_rect"),policy.live_rect)) {
        if(!dispositions)throw Error("private-geometry-disposition-sink-required");
        if(!dispositions.some(function(row){return row.anchor===expected.anchor&&row.revision===definition.revision;})) {
            dispositions.push({document:definition.document,revision:definition.revision,source_sha256:definition.source_sha256,
                anchor:expected.anchor,policy:policy});
            if(dispositions===geometryDispositions)installTraceObservation("geometry",dispositions.length-1,dispositions[dispositions.length-1]);
        }
    }
    if(bindings)bindings.push({object:found[0],expected:expected,parent:patcher,
        rect:foundRects[0].slice(0),runtime_class:found[0].maxclass});
    return found[0];
}
function tree(patcher) {
    var result=[];
    for(var o=patcher.firstobject;o;o=o.nextobject) {
        result.push(o);
        try{var child=o.subpatcher();if(child)result=result.concat(tree(child));}catch(e){}
    }
    return result;
}
function validateTree(patcher,definition,minusCollector,pollIndex) {
    anchorDiagnostics=[];geometryDispositions=[];numericModeObservations=[];controllerRepresentationObservations=[];
    plusPreflightContext=null;var plusCandidates=[],plusPolicy=false,plusPolicyError=null,bindings=[],scopeHandles={};
    try{plusPolicy=plusControllerCohortMetadata(definition,config);}catch(error){plusPolicyError=error;}
    var cohort=null;
    if(plusPolicy) {
        var owners=config&&config.lifecycle&&config.lifecycle.owners;
        cohort={definition:definition,candidates:plusCandidates,root:patcher,request_snapshot:plusInstallIdentity(),
            definition_snapshot:JSON.stringify(definition),owner_snapshot:JSON.stringify(owners&&owners[definition.lifecycle_owner_inlet])};
    }
    var actualTotal=tree(patcher).length;
    if(actualTotal!==definition.full_inventory.length)retainAnchorDiagnostic({scope:"root",diagnostic_type:"tree-count",
        expected_count:definition.full_inventory.length,actual_count:actualTotal});
    function namedChild(p,b) {
        if(typeof b.source_varname!=="string"||!b.source_varname)return null;
        var found=[],classes=b.runtime_classes||[b.runtime_class];
        for(var o=p.firstobject;o;o=o.nextobject)
            if(o.varname===b.source_varname&&classes.indexOf(o.maxclass)!==-1)found.push(o);
        return found.length===1?found[0]:null;
    }
    function scope(p,parent) {
        scopeHandles[parent]=p;
        var expected=definition.full_inventory.filter(function(b){return b.anchor.slice(0,b.anchor.lastIndexOf("/"))===parent;});
        var actual=0;for(var o=p.firstobject;o;o=o.nextobject)actual++;
        if(actual!==expected.length)retainAnchorDiagnostic({scope:parent,diagnostic_type:"scope-count",
            expected_count:expected.length,actual_count:actual});
        for(var i=0;i<expected.length;i++) {
            var b=expected[i],object=null,before=anchorDiagnostics.length;
            try{object=resolve(p,b,definition,geometryDispositions,plusCandidates,plusPolicy?bindings:null);}catch(error){
                if(error&&error.install_trace_refusal)throw error;
                if(anchorDiagnostics.length===before)retainAnchorDiagnostic({expected_anchor:b.anchor,
                    expected_rect:b.rect,expected_runtime_class:b.runtime_class,diagnostic_type:"invalid-anchor-binding",
                    numeric_mode_observation:error.numeric_mode_observation||null});
            }
            if(b.child) {
                // A saved unique name permits diagnostic traversal only; it never clears an anchor failure.
                var container=object||namedChild(p,b),sub=null;
                try{if(container)sub=container.subpatcher();}catch(error){}
                if(sub)scope(sub,b.anchor);
                else retainAnchorDiagnostic({scope:b.anchor,diagnostic_type:"unresolved-child-scope"});
            }
        }
    }
    scope(patcher,"root");
    installTraceCollected();
    // Defer plus getters until the entire inventory and all three bindings are checked.
    var plusEligibilityReported=false,plusSatisfied=false;
    if(definition.document==="plus"&&actualTotal===20&&definition.full_inventory.length===20&&
        anchorDiagnostics.length===3&&plusCandidates.length===3) {
        var ready=!plusPolicyError,anchors={};
        try{
            if(plusPolicyError)throw plusPolicyError;
            for(var anchor in PLUS_GEOMETRY_PINS) {
                var originals=definition.full_inventory.filter(function(b){return b.anchor===anchor;});
                if(originals.length!==1||!originals[0].observed_geometry_policy)
                    throw Error("incomplete-plus-geometry-evidence");
                observedGeometryPolicy(originals[0],definition,config);
            }
            for(var i=0;i<plusCandidates.length;i++) {
                var row=plusCandidates[i];if(anchors[row.expected.anchor])throw Error("duplicate-plus-preflight-anchor");
                anchors[row.expected.anchor]=true;plusNumericPreflightBinding(row.object,row.expected,definition,patcher);
            }
            if(plusPolicy) {
                if(definition.basic_anchor!=="root/obj-2"||definition.basic_varname!=="basic_tab"||
                    !scopeHandles[definition.basic_anchor]||definition.boxes.length!==16||bindings.length!==17||
                    definition.full_inventory.filter(function(b){return b.anchor.slice(0,b.anchor.lastIndexOf("/"))===definition.basic_anchor;}).length!==16)
                    throw Error("plus-controller-cohort-complete-handles");
                var fields=["maxclass","runtime_class","runtime_classes","rect","source_box_sha256","source_text_sha256",
                    "inlets","outlets","authored_text","authored_empty"],seen={};
                for(var i=0;i<definition.boxes.length;i++) {
                    var box=definition.boxes[i],saved=definition.full_inventory.filter(function(b){return b.anchor===box.anchor;});
                    if(seen[box.anchor]||saved.length!==1||box.anchor!==definition.basic_anchor+"/"+box.id||
                        box.anchor.slice(0,box.anchor.lastIndexOf("/"))!==definition.basic_anchor)
                        throw Error("plus-controller-cohort-basic-descriptor");
                    seen[box.anchor]=true;
                    for(var j=0;j<fields.length;j++)if(!sameData(box[fields[j]],saved[0][fields[j]]))
                        throw Error("plus-controller-cohort-basic-copy");
                }
                if(!sameData(cohort.request_snapshot,plusInstallIdentity())||cohort.definition_snapshot!==JSON.stringify(definition)||
                    cohort.owner_snapshot!==JSON.stringify(config.lifecycle.owners[definition.lifecycle_owner_inlet]))
                    throw Error("plus-controller-cohort-preflight-changed");
            }
        }catch(error){ready=false;}
        plusEligibilityReported=true;
        installTraceEvent("plus-eligibility",{ready:ready,candidates:plusCandidates.length,diagnostics:anchorDiagnostics.length});
        if(ready) {
            if(!plusPolicy)cohort={definition:definition,candidates:plusCandidates,root:patcher};
            if(!plusPolicy)plusPreflightContext=cohort;
            try{for(var i=0;i<plusCandidates.length;i++) {
                var row=plusCandidates[i];
                row.diagnostic.numeric_preflight_observation=numericPreflightObservation(row.object,row.expected,definition,plusPolicy?cohort:null);
            }}finally{plusPreflightContext=null;}
            if(plusPolicy) {
                plusSatisfied=controllerRepresentationObservations.length===3&&
                    sameData(cohort.request_snapshot,plusInstallIdentity())&&cohort.definition_snapshot===JSON.stringify(definition)&&
                    cohort.owner_snapshot===JSON.stringify(config.lifecycle.owners[definition.lifecycle_owner_inlet]);
                for(var i=0;i<controllerRepresentationObservations.length;i++) {
                    var observation=controllerRepresentationObservations[i],format=observation.format_observation,value=observation.value_observation;
                    var expected=plusCandidates[i].expected;
                    if(!format||format.status!=="returned"||format.representation!=="scalar-number"||!finite(format.value)||
                        geometryVectorHash([format.value,0,0,0])!==PLUS_CONTROLLER_FORMAT_SHA256||
                        !value||value.status!=="returned"||value.representation!=="singleton-number-array"||!finite(value.value)||
                        value.value!==expected.initial_numeric)plusSatisfied=false;
                }
                for(var i=0;i<controllerRepresentationObservations.length;i++)
                    controllerRepresentationObservations[i].cohort_satisfied=plusSatisfied;
            }
        }
    }
    if(!plusEligibilityReported)installTraceEvent("plus-eligibility",{ready:false,candidates:plusCandidates.length,diagnostics:anchorDiagnostics.length});
    if(minusCollector)minusCollector.observe(patcher,definition,pollIndex,anchorDiagnostics);
    if(minusCollector)throw Error("minus-diagnostic-install-refused");
    if(plusPolicyError||plusPolicy&&!plusSatisfied||anchorDiagnostics.length&&!plusSatisfied)
        throw Error("aggregate-original-hierarchy-preflight-failed");
    if(plusSatisfied) {
        for(var i=0;i<plusCandidates.length;i++)bindings.push({object:plusCandidates[i].object,expected:plusCandidates[i].expected,
            parent:scopeHandles[definition.basic_anchor],rect:plusCandidates[i].expected.rect.slice(0),runtime_class:"number"});
        var objects={};
        for(var i=0;i<definition.boxes.length;i++) {
            var box=definition.boxes[i],matches=bindings.filter(function(b){return b.expected.anchor===box.anchor;});
            if(matches.length!==1)throw Error("plus-controller-cohort-handle-map");objects[box.anchor]=matches[0].object;
        }
        return {root:patcher,definition:definition,basic:scopeHandles[definition.basic_anchor],objects:objects,bindings:bindings,
            candidates:plusCandidates,definition_snapshot:cohort.definition_snapshot,request_snapshot:cohort.request_snapshot,
            owner_snapshot:cohort.owner_snapshot};
    }
}
function plusInstallIdentity() {
    return {request_id:shared.request_id,step_id:shared.step_id,action:shared.action,
        action_document:shared.action_document,action_revision:shared.action_revision};
}
function createPlusValidationPass(minusCollector,pollIndex) {
    var active=true,validated=false,consumed=false,issued=null,payload=null;
    return {
        validate:function(root,definition) {
            if(!active||validated)throw Error("plus-validation-pass-expired");validated=true;
            payload=validateTree(root,definition,minusCollector,pollIndex);
            if(!payload)return null;
            issued={};return issued;
        },
        bind:function(root,definition,result) {
            // Authenticate the reference before inspecting any supplied object's properties.
            if(!active||consumed||!issued||result!==issued||root!==payload.root||definition!==payload.definition)
                throw Error("plus-validation-result-not-owned");
            active=false;
            if(payload.definition_snapshot!==JSON.stringify(definition)||!sameData(payload.request_snapshot,plusInstallIdentity())||
                !plusControllerCohortMetadata(definition,config))throw Error("plus-validation-binding-changed");
            for(var i=0;i<payload.candidates.length;i++) {
                var row=payload.candidates[i];plusNumericPreflightBinding(row.object,row.expected,definition,root);
            }
            for(var i=0;i<payload.bindings.length;i++) {
                var row=payload.bindings[i];
                if(row.object.maxclass!==row.runtime_class||!sameNumbers(row.object.getboxattr("patching_rect"),row.rect)||
                    row.expected.child&&row.object.varname!==row.expected.source_varname)
                    throw Error("plus-validation-handle-changed");
            }
            if(!sameData(payload.request_snapshot,plusInstallIdentity())||
                payload.definition_snapshot!==JSON.stringify(definition)||
                payload.owner_snapshot!==JSON.stringify(config.lifecycle.owners[definition.lifecycle_owner_inlet]))
                throw Error("plus-validation-owner-changed");
            consumed=true;
            return attachBindings(root,definition,payload.basic,payload.objects);
        },
        expire:function(){active=false;issued=null;payload=null;}
    };
}
function dispatch(object,message) {
    if(!message||Object.keys(message).length!==2||!Array.isArray(message.atoms))throw Error("message-shape");
    var selector=message.selector,atoms=message.atoms;
    if(selector==="bang") {if(atoms.length)throw Error("bang-atoms");object.message("bang");return;}
    if((selector!=="int"&&selector!=="float")||atoms.length!==1||!atoms[0]||
        Object.keys(atoms[0]).length!==2||atoms[0].tag!==selector||!finite(atoms[0].value)||
        (selector==="int"&&Math.floor(atoms[0].value)!==atoms[0].value))throw Error("typed-scalar-shape");
    // A float selector preserves Max's float dispatch even for whole-valued inputs.
    object.message(selector,atoms[0].value);
}
function definitionFor(doc,revision) {
    for(var i=0;i<config.documents.length;i++) {
        var d=config.documents[i];if(d.document===doc&&d.revision===revision)return d;
    }
    throw Error("revision-definition-unavailable");
}
function setAction(command) {
    anchorDiagnostics=[];geometryDispositions=[];numericModeObservations=[];controllerRepresentationObservations=[];closeDiagnostics=null;
    shared.request_id=command.command_id;shared.step_id=command.step_id;shared.action=command.action;
    shared.action_document=command.document;shared.action_revision=command.action_revision;
}
function ack(command,extra) {
    var value={command_id:command.command_id,success:true,step_id:command.step_id};
    for(var k in extra)value[k]=extra[k];write(config.ack_path,value);busy=false;
}
function fail(command,error,minusCollector,pollIndex) {
    var tracing=installTrace&&installTrace.active;
    if(tracing&&!error.install_trace_refusal)installTrace.original_error=String(error);
    function progress(phase) {
        if(!tracing||installTrace.failure)return;
        try{installTraceEvent(phase);}catch(traceError){error=traceError;}
    }
    progress("failure-enter");progress("failure-journal-enter");
    record("harness-error",{error:tracing&&installTrace.failure?"Error: private-install-trace-refused:"+installTrace.failure.code:String(error)});
    progress("failure-journal-return");
    var value={command_id:command.command_id,success:false,error_code:"arithmetic-controller-refused",
        anchor_diagnostics:anchorDiagnostics,geometry_dispositions:geometryDispositions,
        numeric_mode_observations:numericModeObservations,controller_representation_observations:controllerRepresentationObservations};
    if(minusCollector) {
        minusCollector.terminal(pollIndex);
        var minusDiagnostic=minusCollector.exportData();
        if(minusDiagnostic)value.minus_numeric_preflight_diagnostic=minusDiagnostic;
        value.minus_collector_progress=minusCollector.exportProgress();
    }
    if(closeDiagnostics&&closeDiagnostics.request_id===command.command_id)value.close_diagnostics=closeDiagnostics;
    function retainTraceFailure() {
        if(tracing&&installTrace.failure) {
            value.install_trace_failure={};
            for(var key in installTrace.failure)value.install_trace_failure[key]=installTrace.failure[key];
            value.install_trace_failure.collected_capabilities=installTrace.capabilities;
        }
    }
    progress("failure-ack-enter");retainTraceFailure();write(config.ack_path,value);
    var priorFailure=tracing&&installTrace.failure;
    progress("failure-ack-return");
    if(tracing&&!priorFailure&&installTrace.failure){retainTraceFailure();write(config.ack_path,value);}
    if(tracing)installTrace.active=false;
    busy=false;
}
function bind(patcher,definition) {
    if(plusControllerCohortMetadata(definition,config))throw Error("plus-validation-result-required");
    validateTree(patcher,definition);
    var box=patcher.getnamed(definition.basic_varname);
    if(!box)throw Error("saved-basic-unavailable");
    var basic=box.subpatcher(),objects={};
    for(var i=0;i<definition.boxes.length;i++) {
        var before=anchorDiagnostics.length;
        try{objects[definition.boxes[i].anchor]=resolve(basic,definition.boxes[i],definition,geometryDispositions);}catch(error){
            if(error&&error.install_trace_refusal)throw error;
            if(anchorDiagnostics.length===before)retainAnchorDiagnostic({expected_anchor:definition.boxes[i].anchor,
                expected_rect:definition.boxes[i].rect,diagnostic_type:"invalid-basic-binding",
                numeric_mode_observation:error.numeric_mode_observation||null});
        }
    }
    if(anchorDiagnostics.length)throw Error("aggregate-basic-preflight-failed");
    return attachBindings(patcher,definition,basic,objects);
}
function attachBindings(patcher,definition,basic,objects) {
    for(var i=0;i<definition.boxes.length;i++) {
        var b=definition.boxes[i],object=objects[b.anchor];object.varname="__alive_help_"+b.id.replace(/-/g,"_");
        for(var port=0;port<b.outlets;port++) {
            var leaf=basic.newdefault(-2000-i*10,-2000-port*10,"js",config.observer_path,
                configFile,definition.document,definition.revision,b.anchor,port);
            leaf.varname="__alive_help_leaf_"+b.id.replace(/-/g,"_")+"_"+port;
            basic.connect(object,port,leaf,0);
        }
    }
    var reader=patcher.newdefault(-3000,-3000,"v8",config.readback_helper_path,
        configFile,definition.document,definition.revision);
    reader.varname="__alive_arithmetic_reader";
    var disposer=patcher.newdefault(-3100,-3000,"thispatcher");disposer.varname="__alive_arithmetic_disposer";
    var owner=config.lifecycle.owners[definition.lifecycle_owner_inlet];
    if(!owner||owner.document!==definition.document||owner.revision!==definition.revision)throw Error("lifecycle-install-owner");
    var freebang=patcher.newdefault(-3200,-3000,"freebang");freebang.varname="__alive_arithmetic_freebang";
    var lifecycleSend=patcher.newdefault(-3400,-3000,"send",owner.channel);
    lifecycleSend.varname="__alive_arithmetic_lifecycle_send";
    reader.setboxattr("patching_rect",[-3000,-3000,160,133]);
    disposer.setboxattr("patching_rect",[-3100,-3000,100,22]);
    freebang.setboxattr("patching_rect",[-3200,-3000,100,22]);
    lifecycleSend.setboxattr("patching_rect",[-3400,-3000,200,64]);
    patcher.connect(freebang,0,lifecycleSend,0);
    return {patcher:patcher,basic:basic,objects:objects,reader:reader,disposer:disposer,
        freebang:freebang,lifecycleSend:lifecycleSend,definition:definition};
}
function install(command) {
    var doc=command.document,revision=command.revision;
    if(Object.keys(roots).length||typeof revision!=="number"||revision!==(revisions[doc]||0)+1)throw Error("invalid-install-revision");
    var definition=definitionFor(doc,revision),attempts=0,stable=0,terminalFailure=false;
    if(command.source_sha256!==definition.source_sha256)throw Error("install-source-binding");
    var minusCollector=createMinusDiagnosticCollector(command,definition);
    installTraceEvent("openfile-enter");
    max.message("openfile",config.global_name+"_"+doc+"_r"+revision,definition.working_windows_path);
    installTraceEvent("openfile-return");
    function poll() {
        // A scheduled callback remains owned by this install after the global trace changes.
        if(terminalFailure)return;
        var pass=createPlusValidationPass(minusCollector,attempts+1),validation=null;
        try {
            if(installTrace&&installTrace.active)installTrace.attempt=attempts+1;
            installTraceEvent("poll-enter");
            var p=max.frontpatcher;++attempts;
            var matches=p&&samePath(p.filepath,definition.working_windows_path);
            installTraceEvent("root-decision",{root_present:!!p,path_match:!!matches});
            if(matches) {
                installTraceEvent("validate-enter");
                try{validation=pass.validate(p,definition);stable++;installTraceEvent("validate-return");}catch(e){
                    stable=0;if(e&&e.install_trace_refusal)throw e;
                    if(installTrace&&installTrace.active)installTrace.original_error=String(e);
                    installTraceCollected();installTraceEvent("validate-refused",{diagnostics:anchorDiagnostics.length,
                        geometry_dispositions:geometryDispositions.length});
                    if(attempts>=70)throw e;
                }
                // The pinned helper's deferred initialization must have settled before binding.
                if(stable>=5&&attempts>=10) {
                    installTraceEvent("bind-enter");
                    roots[doc]=validation?pass.bind(p,definition,validation):bind(p,definition);revisions[doc]=revision;
                    installTraceEvent("bind-return");
                    record("step-complete",{document:doc,revision:revision,source_sha256:definition.source_sha256});
                    installTraceEvent("install-ready-for-ack");
                    ack(command,{working_path:definition.working_windows_path,geometry_dispositions:geometryDispositions,
                        numeric_mode_observations:numericModeObservations,
                        controller_representation_observations:controllerRepresentationObservations});
                    if(installTrace)installTrace.active=false;
                    return;
                }
            }
            if(attempts>=80)throw Error("bounded-helper-settling-timeout");
            pollTask=new Task(poll,this);pollTask.schedule(100);
            installTraceEvent("poll-scheduled");
        }catch(error){terminalFailure=true;fail(command,error,minusCollector,attempts);}finally{
            if(minusCollector&&!terminalFailure)minusCollector.later(attempts);
            pass.expire();
        }
    }
    try {
        pollTask=new Task(poll,this);pollTask.schedule(100);
        installTraceEvent("poll-scheduled");
    }catch(error){terminalFailure=true;throw error;}
}
function closeValue(value) {
    var type=value===null?"null":typeof value,result={type:type};
    if(type==="boolean"||type==="string")result.value=value;
    else if(type==="number") {
        if(finite(value))result.value=value;
        else result.representation=value!==value?"nan":value>0?"positive-infinity":"negative-infinity";
    }
    return result;
}
function closeRead(read) {
    try {
        var value=closeValue(read());value.status="returned";return value;
    }catch(error) {
        var result={status:"threw",exception:closeValue(error)},name,message;
        try{name=error.name;if(typeof name==="string")result.name=name;}catch(ignoredName){}
        try{message=error.message;if(typeof message==="string")result.message=message;}catch(ignoredMessage){}
        return result;
    }
}
function closeSnapshot(state,phase,attempt) {
    var sample={phase:phase,attempt:attempt,
        root_valid:closeRead(function(){return state.patcher.valid;}),
        reader_valid:closeRead(function(){return state.reader.valid;}),
        disposer_valid:closeRead(function(){return state.disposer.valid;}),
        root_filepath:closeRead(function(){return state.patcher.filepath;}),objects:[],
        retained_firstobject_valid:closeRead(function(){return state.retainedFirstobject.valid;}),
        harness_objects:[{anchor:"__alive_arithmetic_freebang",valid:closeRead(function(){return state.freebang.valid;})},
            {anchor:"__alive_arithmetic_lifecycle_send",valid:closeRead(function(){return state.lifecycleSend.valid;})}]};
    var first,wind,associated;
    sample.firstobject=closeRead(function(){first=state.patcher.firstobject;return first;});
    sample.firstobject_valid=first&&(typeof first==="object"||typeof first==="function")?
        closeRead(function(){return first.valid;}):null;
    sample.wind=closeRead(function(){wind=state.patcher.wind;return wind;});
    sample.wind_visible=null;sample.wind_assocclass=null;sample.wind_assoc=null;sample.wind_assoc_filepath=null;
    if(wind&&(typeof wind==="object"||typeof wind==="function")) {
        sample.wind_visible=closeRead(function(){return wind.visible;});
        sample.wind_assocclass=closeRead(function(){return wind.assocclass;});
        sample.wind_assoc=closeRead(function(){associated=wind.assoc;return associated;});
        if(associated&&(typeof associated==="object"||typeof associated==="function"))
            sample.wind_assoc_filepath=closeRead(function(){return associated.filepath;});
    }
    var anchors=Object.keys(state.objects).sort();
    for(var i=0;i<anchors.length;i++) {
        var anchor=anchors[i];
        sample.objects.push({anchor:anchor,valid:closeRead(function(){return state.objects[anchor].valid;})});
    }
    closeDiagnostics.samples.push(sample);return sample;
}
function lifecycleControl(kind,index,command) {
    var observer=this.patcher.getnamed("__alive_arithmetic_lifecycle_observer");
    if(!observer||(observer.valid!==true&&observer.valid!==1))throw Error("lifecycle-driver-unavailable");
    try{observer.message("lifecyclecontrol",kind,index,command.command_id,command.step_id);}catch(error){
        var failure=Error("lifecycle-control-dispatch-threw");
        failure.lifecycle_failure={stage:"dispatch",error:closeRead(function(){throw error;})};throw failure;
    }
    var report;
    try{report=read(config.lifecycle.report_path);}catch(error){
        var failure=Error("lifecycle-report-unreadable");
        failure.lifecycle_failure={stage:"report-read",error:closeRead(function(){throw error;})};throw failure;
    }
    if(!report)throw Error("lifecycle-report-absent");
    if(report.success===false||report.failure_diagnostics){
        var failure=Error("lifecycle-observer-failure-report");failure.lifecycle_failure=report;throw failure;
    }
    if(report.version!=="arithmetic-freebang-v1"||report.monitor_epoch!==config.lifecycle.monitor_epoch||
        report.request_id!==command.command_id||report.step_id!==command.step_id||report.control!==kind||
        typeof report!=="object")throw Error("lifecycle-report-stale");
    if(!report.observer_report||!report.observer_report.failures)throw Error("lifecycle-observer-refused");
    return report;
}
function requestLifecycleProof(state,command,done) {
    var owner=config.lifecycle.owners[state.definition.lifecycle_owner_inlet],attempts=0;
    state.reader.message("lifecycleproof",command.command_id,command.step_id);
    function wait(){try{
        ++attempts;var proof=read(owner.root_proof_path);
        if(proof&&proof.request_id===command.command_id){
            if(proof.version!=="arithmetic-freebang-v1"||proof.step_id!==command.step_id||proof.document!==command.document||
                proof.revision!==command.action_revision||proof.source_sha256!==command.source_sha256||
                !samePath(proof.working_path,state.definition.working_windows_path))throw Error("lifecycle-root-proof-refused");
            done(proof);return;
        }
        if(attempts>=30)throw Error("lifecycle-root-proof-timeout");
        pollTask=new Task(wait,this);pollTask.schedule(100);
    }catch(error){fail(command,error);}}
    pollTask=new Task(wait,this);pollTask.schedule(100);
}
function validity(reading) {
    if(!reading||reading.status!=="returned"||
        !((reading.type==="boolean"&&typeof reading.value==="boolean")||
          (reading.type==="number"&&typeof reading.value==="number"&&(reading.value===0||reading.value===1))))
        throw Error("close-owned-validity-malformed");
    return reading.value===true||reading.value===1;
}
function ownedValidity(sample) {
    var reads=[sample.reader_valid,sample.disposer_valid,sample.retained_firstobject_valid];
    for(var i=0;i<sample.objects.length;i++)reads.push(sample.objects[i].valid);
    for(var i=0;i<sample.harness_objects.length;i++)reads.push(sample.harness_objects[i].valid);
    var values=[];for(var i=0;i<reads.length;i++)values.push(validity(reads[i]));return values;
}
function lifecycleEvidence(command,state,proof,report) {
    var binding={monitor_epoch:config.lifecycle.monitor_epoch,request_id:command.command_id,step_id:command.step_id,
        action:command.action,document:command.document,revision:state.definition.revision,
        source_sha256:command.source_sha256,working_path:state.definition.working_windows_path,
        observer_helper_sha256:config.package_sha256["lifecycle-observer.js"]};
    return {version:"arithmetic-freebang-v1",binding:binding,
        root_route_path:config.lifecycle.owners[state.definition.lifecycle_owner_inlet].root_proof_path,
        root_route_proof:proof,driver_route_proof:report.driver_route_proof,observer_report:report.observer_report};
}
function closeOwner(command) {
    var state=roots[command.document];if(!state)throw Error("absent-close-owner");
    if(command.source_sha256!==state.definition.source_sha256||command.action_revision!==state.definition.revision)
        throw Error("close-source-revision-binding");
    if(!samePath(state.patcher.filepath,state.definition.working_windows_path))throw Error("close-owner-path-mismatch");
    var helpers={};
    for(var name in state.definition.helper_sha256)helpers[name]=state.definition.helper_sha256[name];
    closeDiagnostics={request_id:command.command_id,step_id:command.step_id,action:command.action,
        document:command.document,revision:state.definition.revision,source_sha256:state.definition.source_sha256,
        working_path:state.definition.working_windows_path,helper_sha256:helpers,samples:[]};
    requestLifecycleProof(state,command,function(proof){
        var index=state.definition.lifecycle_owner_inlet,attempts=0,jointlyInvalid=false,invalidityError=null;
        var report=lifecycleControl("attest",index,command);
        closeDiagnostics.lifecycle_evidence=lifecycleEvidence(command,state,proof,report);
        if(report.observer_report.failures.length)throw Error("lifecycle-observer-refused");
        try{state.retainedFirstobject=state.patcher.firstobject;}catch(error){state.retainedFirstobject=null;}
        var before=ownedValidity(closeSnapshot(state,"before-dispose",0));
        if(before.indexOf(false)!==-1)throw Error("close-owned-handle-not-valid-before");
        report=lifecycleControl("arm",index,command);
        report=lifecycleControl("dispatch-start",index,command);
        if(report.observer_report.failures.length)throw Error("lifecycle-observer-refused");
        // Only disposal can create an eligible bang; no harness event inlet is invoked.
        closeDiagnostics.dispose={attempted:true,result:closeRead(function(){return state.disposer.message("dispose");})};
        if(closeDiagnostics.dispose.result.status==="threw")throw Error("close-dispose-threw");
        try{report=lifecycleControl("dispatch-return",index,command);}catch(error){invalidityError=error;}
        function poll(){try{
            ++attempts;var sample=closeSnapshot(state,"poll",attempts),values=null;
            try{values=ownedValidity(sample);
                if(jointlyInvalid&&values.indexOf(true)!==-1)throw Error("close-owned-handle-revived");
                if(values.indexOf(true)===-1)jointlyInvalid=true;
            }catch(error){invalidityError=invalidityError||error;}
            if(attempts<30){pollTask=new Task(poll,this);pollTask.schedule(100);return;}
            // Retain a final observer report on refusal as well as on success.
            try{report=lifecycleControl("attest",index,command);}catch(error){invalidityError=invalidityError||error;}
            closeDiagnostics.lifecycle_evidence=lifecycleEvidence(command,state,proof,report);
            if(invalidityError)throw invalidityError;
            if(report.observer_report.failures.length)throw Error("lifecycle-observer-refused");
            if(!jointlyInvalid||!values||values.indexOf(true)!==-1)throw Error("closed-owner-absence-unproven");
            report=lifecycleControl("close-validated",index,command);
            closeDiagnostics.lifecycle_evidence=lifecycleEvidence(command,state,proof,report);
            if(report.observer_report.failures.length)throw Error("lifecycle-observer-refused");
            delete roots[command.document];record("step-complete",{document:command.document,
                revision:state.definition.revision,source_sha256:state.definition.source_sha256,
                closed_owner_absence_validated:true});ack(command,{closed_owner_absence_validated:true,close_diagnostics:closeDiagnostics});
        }catch(error){fail(command,error);}}
        pollTask=new Task(poll,this);pollTask.schedule(100);
    });
}
function handle(command) {
    if(command.op==="operation") {
        setAction(command);
        if(command.action==="install"){beginInstallTrace(command);install(command);return;}
        if(command.action==="close"){closeOwner(command);return;}
        if(command.action!=="event")throw Error("unknown-operation-action");
        if(command.inlet!==0)throw Error("finite-inlet-zero-required");
        var state=roots[command.document];
        if(!state||state.definition.revision!==command.action_revision)throw Error("event-owner-binding");
        var object=state.objects[command.anchor];if(!object)throw Error("absent-original-anchor");
        if(command.source_sha256!==state.definition.source_sha256)throw Error("event-source-binding");
        record("stimulus",{document:command.document,revision:state.definition.revision,
            source_sha256:state.definition.source_sha256,anchor:command.anchor,port:command.inlet,message:command.message});
        shared.dispatch_active=1;dispatch(object,command.message);shared.dispatch_active=0;
        record("step-complete",{document:command.document,revision:state.definition.revision,
            source_sha256:state.definition.source_sha256});ack(command,{});
    } else if(command.op==="readback") {
        var state=roots[command.document];
        if(!state||command.revision!==state.definition.revision)throw Error("readback-owner-binding");
        state.reader.message("checkpoint",command.command_id,command.step_id);ack(command,{});
    } else if(command.op==="lifecycle-barrier"){
        if(command.step_id!=="capture-complete"||Object.keys(roots).length!==0)throw Error("lifecycle-final-live-owners");
        var report=lifecycleControl("barrier",-1,command);
        if(report.observer_report.failures.length||report.observer_report.sealed!==true)throw Error("lifecycle-barrier-refused");
        ack(command,{lifecycle_evidence:{version:"arithmetic-freebang-v1",binding:{monitor_epoch:config.lifecycle.monitor_epoch,
            request_id:command.command_id,step_id:command.step_id,action:"lifecycle-barrier",
            observer_helper_sha256:config.package_sha256["lifecycle-observer.js"]},
            driver_route_proof:report.driver_route_proof,observer_report:report.observer_report}});
    } else throw Error("finite-command-required");
}
function tick() {
    if(busy)return;
    var command;
    try {
        command=read(config.command_path);if(!command||command.command_id<=seen)return;
        if(typeof command.command_id!=="number"||Math.floor(command.command_id)!==command.command_id)throw Error("command-id");
        seen=command.command_id;busy=true;handle(command);
    }catch(error){shared.dispatch_active=0;fail(command||{command_id:seen},error);}
}
function start() {
    var stage="config",startingTicker;
    try{
        config=read(configFile);
        if(!config||typeof config.ready_path!=="string"||!config.lifecycle)throw Error("startup-config-unavailable");
        stage="startup";shared=new Global(config.global_name);shared.seq=0;shared.dispatch_active=0;
        stage="geometry";
        for(var i=0;i<config.lifecycle.driver_inventory.length;i++){
            var expected=config.lifecycle.driver_inventory[i],object=this.patcher.getnamed(expected.varname);
            if(!object)throw Error("lifecycle-driver-startup");object.setboxattr("patching_rect",expected.rect);
        }
        stage="observer";
        var report=lifecycleControl("attest",-1,{command_id:0,step_id:"startup"});
        if(report.observer_report.failures.length)throw Error("lifecycle-driver-startup-refused");
        stage="startup";shared.step_id="startup";
        write(config.ready_path,{ready:true,live_owners:{},source_roots_opened:0});
        startingTicker=new Task(tick,this);startingTicker.interval=25;startingTicker.repeat();ticker=startingTicker;
    }catch(error){
        if(startingTicker&&typeof startingTicker.cancel==="function")try{startingTicker.cancel();}catch(ignored){}
        var readyPath=config&&typeof config.ready_path==="string"?config.ready_path:null;
        if(!readyPath){
            if(typeof configFile!=="string"||!/(^|[\\/])config\.json$/.test(configFile))throw Error("startup-diagnostic-path");
            readyPath=configFile.slice(0,-"config.json".length)+"ready.json";
        }
        var diagnostic={stage:stage,error:closeRead(function(){throw error;})};
        if(error&&error.lifecycle_failure)diagnostic.lifecycle_failure=error.lifecycle_failure;
        write(readyPath,{ready:false,live_owners:{},source_roots_opened:0,startup_diagnostics:diagnostic});
    }
}
function loadbang(){startupTask=new Task(start,this);startupTask.schedule(1000);}
