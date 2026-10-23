// Original finite controller. Start empty; owner files are immutable private revisions.
autowatch = 0; inlets = 1; outlets = 0;
var configFile=jsarguments[1], config, shared, roots={}, revisions={}, seen=0, busy=false;
var ticker, pollTask, startupTask;
var anchorDiagnostics=[], geometryDispositions=[], numericModeObservations=[];
var closeDiagnostics=null;
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
function shellHeightPolicy(expected,definition) {
    var policy=expected.shell_height_policy;if(typeof policy==="undefined")return null;
    var source="bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61";
    var profiles={
        "root/obj-1":["js",[92,94,110,20],"3c299423556feddb0be4ff31bc20e20f1fc305063815420e899f529763daa2e1"],
        "root/obj-2":["patcher",[10,85,50,20],"484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393"],
        "root/obj-3":["patcher",[205,205,50,20],"bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a"]};
    var document=definition&&definition.document;
    if(document==="float") {
        source="c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c";
        profiles["root/obj-1"]=["js",[374,27.5,120,20],"e9cd2d2ae24129f7ce891e9a5ee418d273b18a0b2641d3f3beb34be09def8ab5"];
    }
    var helpers={
        "helpstarter.js":"a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8",
        "helpname.js":"49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa",
        "helpdetails.js":"31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1",
        "helpargs.js":"04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469"};
    var profile=profiles[expected.anchor];
    if(!policy||!profile||!definition||(document!=="int"&&document!=="float")||definition.source_sha256!==source||
        policy.kind!=="source-bound-"+document+"-shell-height"||policy.document!==document||policy.source_sha256!==source||
        policy.anchor!==expected.anchor||policy.runtime_class!==profile[0]||expected.runtime_class!==profile[0]||
        expected.maxclass!=="newobj"||!sameNumbers(expected.rect,profile[1])||!sameNumbers(policy.saved_rect,profile[1])||
        !sameNumbers(policy.live_rect,profile[1].slice(0,3).concat([22]))||
        policy.source_text_sha256!==profile[2]||expected.source_text_sha256!==profile[2]||
        policy.saved_incoming_routes!==0||policy.saved_outgoing_routes!==0||
        expected.saved_incoming_routes!==0||expected.saved_outgoing_routes!==0)throw Error("invalid-int-shell-height-policy");
    function pinned(map) {
        if(!map||Object.keys(map).length!==4)return false;
        for(var name in helpers)if(map[name]!==helpers[name])return false;
        return true;
    }
    var configured={};
    if(!config||!config.helpers||config.helpers.length!==4)throw Error("int-shell-helper-binding");
    for(var i=0;i<config.helpers.length;i++)configured[config.helpers[i].name]=config.helpers[i].sha256;
    if(!pinned(policy.helper_sha256)||!pinned(definition.helper_sha256)||!pinned(configured))throw Error("int-shell-helper-binding");
    return policy;
}
function annotationGeometryPolicy(expected,definition) {
    var policy=expected.annotation_geometry_policy;if(typeof policy==="undefined")return null;
    var source="bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61";
    var profiles={
        "root/obj-2/obj-23":["comment",[11,186.5,143,54],[11,186.5,143,55],
            "96d3d71a61b0f13d7c759315dc9e49578d5c542d24ac120753d628392a55723d",
            {inlets:1,outlets:0,fontname:"Arial",fontsize:13,bubble:1,bubbleside:3,
                bubblepoint:0.75,bubbletextmargin:null,linecount:3}],
        "root/obj-2/obj-4":["jsui",[291,296,208.315216,39],[291,296,208.19552612304688,39],
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            {inlets:1,outlets:1,filename:"helpargs.js",ignoreclick:1,
                jsarguments_sha256:"c511da579364be932435a248bf3f04254e5c257664551ad10ac69cdc4170a098",
                border:0,parameter_enable:0,outlettype:[""]}]};
    var document=definition&&definition.document;
    if(document==="float") {
        source="c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c";
        profiles={
            "root/obj-2/obj-3":["comment",[411,156.5,133,54],[411,156.5,133,55],
                "de8dbc68910ee493e95c0bad7d48cf0b12577baa5955cd7d894aa80cae1fb027",
                {inlets:1,outlets:0,fontname:"Arial",fontsize:13,bubble:1,bubbleside:null,
                    bubblepoint:null,bubbletextmargin:null,linecount:3}],
            "root/obj-2/obj-5":["comment",[14,201.5,143,54],[14,201.5,143,55],
                profiles["root/obj-2/obj-23"][3],profiles["root/obj-2/obj-23"][4]],
            "root/obj-2/obj-4":["jsui",[289,274,190.328094,39],[289,274,190.31402587890625,39],
                profiles["root/obj-2/obj-4"][3],
                {inlets:1,outlets:1,filename:"helpargs.js",ignoreclick:1,
                    jsarguments_sha256:"a6c871ff72c57f35934325de26fba3add81b1df8935af30a164fb9a13117949a",
                    border:0,parameter_enable:0,outlettype:[""]}]};
    }
    var helpers={
        "helpstarter.js":"a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8",
        "helpname.js":"49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa",
        "helpdetails.js":"31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1",
        "helpargs.js":"04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469"};
    function fields(value,wanted) {
        if(!value||Object.keys(value).length!==Object.keys(wanted).length)return false;
        for(var key in wanted)if(JSON.stringify(value[key])!==JSON.stringify(wanted[key]))return false;
        return true;
    }
    var p=profiles[expected.anchor];
    if(!policy||!p||!definition||(document!=="int"&&document!=="float")||definition.source_sha256!==source||
        policy.kind!=="source-bound-"+document+"-annotation-geometry"||policy.document!==document||policy.source_sha256!==source||
        policy.anchor!==expected.anchor||policy.runtime_class!==p[0]||expected.maxclass!==p[0]||
        expected.runtime_class!==p[0]||!sameNumbers(expected.rect,p[1])||!sameNumbers(policy.saved_rect,p[1])||
        !sameNumbers(policy.live_rect,p[2])||policy.source_text_sha256!==p[3]||expected.source_text_sha256!==p[3]||
        !fields(expected.source_attributes,p[4])||!fields(policy.source_attributes,p[4])||
        (typeof expected.outlets!=="undefined"&&expected.outlets!==p[4].outlets)||
        (typeof expected.id!=="undefined"&&expected.id!==expected.anchor.slice(expected.anchor.lastIndexOf("/")+1))||
        policy.saved_incoming_routes!==0||policy.saved_outgoing_routes!==0||
        expected.saved_incoming_routes!==0||expected.saved_outgoing_routes!==0)
        throw Error("invalid-int-annotation-geometry-policy");
    var configured={};
    if(!config||!config.helpers||config.helpers.length!==4)throw Error("int-annotation-helper-binding");
    for(var i=0;i<config.helpers.length;i++)configured[config.helpers[i].name]=config.helpers[i].sha256;
    if(!fields(policy.helper_sha256,helpers)||!fields(definition.helper_sha256,helpers)||!fields(configured,helpers))
        throw Error("int-annotation-helper-binding");
    if(!definition.saved_edges)throw Error("int-annotation-route-binding");
    var id=expected.anchor.slice(expected.anchor.lastIndexOf("/")+1);
    for(var i=0;i<definition.saved_edges.length;i++) {
        var edge=definition.saved_edges[i];
        if(edge.source[0]===id||edge.destination[0]===id)throw Error("int-annotation-route-binding");
    }
    return policy;
}
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
function retainGeometry(dispositions,row) {
    if(!dispositions)throw Error("geometry-disposition-sink-required");
    for(var i=0;i<dispositions.length;i++) {
        var old=dispositions[i];
        if(old.document===row.document&&old.revision===row.revision&&old.anchor===row.anchor) {
            if(old.source_sha256!==row.source_sha256||old.runtime_class!==row.runtime_class||
                !sameNumbers(old.saved_rect,row.saved_rect)||!sameNumbers(old.live_rect,row.live_rect))
                throw Error("geometry-disposition-changed-during-bind");
            return;
        }
    }
    dispositions.push(row);
}
function resolve(patcher,expected,definition,dispositions) {
    var policy=shellHeightPolicy(expected,definition),annotation=annotationGeometryPolicy(expected,definition);
    var mode=numericModePolicy(expected,definition);
    if(policy&&annotation)throw Error("multiple-geometry-policies");
    policy=policy||annotation;
    var found=[],fullCount=0,policyCount=0;
    var diagnostic={expected_anchor:expected.anchor,expected_rect:expected.rect,
        expected_maxclass:expected.maxclass,expected_runtime_class:expected.runtime_class,candidates:[]};
    for(var o=patcher.firstobject;o;o=o.nextobject) {
        var rect=null;try{rect=o.getboxattr("patching_rect");}catch(e){}
        diagnostic.candidates.push({maxclass:o.maxclass,rect:rect});
        var changed=annotation&&policy.runtime_class==="jsui"?2:3;
        var full=sameRect(rect,expected.rect),adapted=policy&&rect&&rect[changed]===policy.live_rect[changed]&&
            o.maxclass===policy.runtime_class&&sameRect(rect,policy.live_rect);
        if(full)fullCount++;
        if(adapted)policyCount++;
        if(full||adapted)found.push({object:o,rect:rect,adapted:adapted});
    }
    var classes=mode?[mode.runtime_class]:policy?[policy.runtime_class]:(expected.runtime_classes||[expected.runtime_class]);
    if(found.length!==1||classes.indexOf(found[0].object.maxclass)===-1) {
        diagnostic.full_match_count=fullCount;
        if(policy)diagnostic.policy_match_count=policyCount;
        anchorDiagnostics.push(diagnostic);
        throw Error("strict-original-geometry-class-unavailable");
    }
    if(found[0].adapted)retainGeometry(dispositions,{anchor:expected.anchor,source_sha256:definition.source_sha256,
        document:definition.document,revision:definition.revision,runtime_class:found[0].object.maxclass,
        saved_rect:expected.rect.slice(0),live_rect:found[0].rect.slice(0),policy:policy});
    if(mode) {
        var observed=numericModeObservation(found[0].object,expected,definition);
        observed.document=definition.document;observed.source_sha256=definition.source_sha256;observed.revision=definition.revision;
        observed.saved_rect=expected.rect.slice(0);observed.live_rect=found[0].rect.slice(0);observed.policy=mode;
        retainGeometry(numericModeObservations,observed);
    }
    return found[0].object;
}
function tree(patcher) {
    var result=[];
    for(var o=patcher.firstobject;o;o=o.nextobject) {
        result.push(o);
        try{var child=o.subpatcher();if(child)result=result.concat(tree(child));}catch(e){}
    }
    return result;
}
function validateTree(patcher,definition) {
    anchorDiagnostics=[];geometryDispositions=[];numericModeObservations=[];
    var actualTotal=tree(patcher).length;
    if(actualTotal!==definition.full_inventory.length)anchorDiagnostics.push({scope:"root",diagnostic_type:"tree-count",
        expected_count:definition.full_inventory.length,actual_count:actualTotal});
    function namedChild(p,b) {
        if(typeof b.source_varname!=="string"||!b.source_varname)return null;
        var found=[],classes=b.runtime_classes||[b.runtime_class];
        for(var o=p.firstobject;o;o=o.nextobject)
            if(o.varname===b.source_varname&&classes.indexOf(o.maxclass)!==-1)found.push(o);
        return found.length===1?found[0]:null;
    }
    function scope(p,parent) {
        var expected=definition.full_inventory.filter(function(b){return b.anchor.slice(0,b.anchor.lastIndexOf("/"))===parent;});
        var actual=0;for(var o=p.firstobject;o;o=o.nextobject)actual++;
        if(actual!==expected.length)anchorDiagnostics.push({scope:parent,diagnostic_type:"scope-count",
            expected_count:expected.length,actual_count:actual});
        for(var i=0;i<expected.length;i++) {
            var b=expected[i],object=null,before=anchorDiagnostics.length;
            try{object=resolve(p,b,definition,geometryDispositions);}catch(error){
                if(anchorDiagnostics.length===before)anchorDiagnostics.push({expected_anchor:b.anchor,
                    expected_rect:b.rect,expected_runtime_class:b.runtime_class,diagnostic_type:"invalid-anchor-binding",
                    numeric_mode_observation:error.numeric_mode_observation||null});
            }
            if(b.child) {
                // A saved unique name permits diagnostic traversal only; it never clears an anchor failure.
                var container=object||namedChild(p,b),sub=null;
                try{if(container)sub=container.subpatcher();}catch(error){}
                if(sub)scope(sub,b.anchor);
                else anchorDiagnostics.push({scope:b.anchor,diagnostic_type:"unresolved-child-scope"});
            }
        }
    }
    scope(patcher,"root");
    if(anchorDiagnostics.length)throw Error("aggregate-original-hierarchy-preflight-failed");
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
    anchorDiagnostics=[];geometryDispositions=[];numericModeObservations=[];closeDiagnostics=null;
    shared.request_id=command.command_id;shared.step_id=command.step_id;shared.action=command.action;
    shared.action_document=command.document;shared.action_revision=command.action_revision;
}
function ack(command,extra) {
    var value={command_id:command.command_id,success:true,step_id:command.step_id};
    for(var k in extra)value[k]=extra[k];write(config.ack_path,value);busy=false;
}
function fail(command,error) {
    record("harness-error",{error:String(error)});
    var value={command_id:command.command_id,success:false,error_code:"numeric-controller-refused",
        anchor_diagnostics:anchorDiagnostics,geometry_dispositions:geometryDispositions,
        numeric_mode_observations:numericModeObservations};
    if(closeDiagnostics&&closeDiagnostics.request_id===command.command_id)value.close_diagnostics=closeDiagnostics;
    write(config.ack_path,value);busy=false;
}
function bind(patcher,definition) {
    validateTree(patcher,definition);
    var box=patcher.getnamed(definition.basic_varname);
    if(!box)throw Error("saved-basic-unavailable");
    var basic=box.subpatcher(),objects={};
    for(var i=0;i<definition.boxes.length;i++) {
        var before=anchorDiagnostics.length;
        try{objects[definition.boxes[i].anchor]=resolve(basic,definition.boxes[i],definition,geometryDispositions);}catch(error){
            if(anchorDiagnostics.length===before)anchorDiagnostics.push({expected_anchor:definition.boxes[i].anchor,
                expected_rect:definition.boxes[i].rect,diagnostic_type:"invalid-basic-binding",
                numeric_mode_observation:error.numeric_mode_observation||null});
        }
    }
    if(anchorDiagnostics.length)throw Error("aggregate-basic-preflight-failed");
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
    reader.varname="__alive_numeric_reader";
    var disposer=patcher.newdefault(-3100,-3000,"thispatcher");disposer.varname="__alive_numeric_disposer";
    var owner=config.lifecycle.owners[definition.lifecycle_owner_inlet];
    if(!owner||owner.document!==definition.document||owner.revision!==definition.revision)throw Error("lifecycle-install-owner");
    var freebang=patcher.newdefault(-3200,-3000,"freebang");freebang.varname="__alive_numeric_freebang";
    var lifecycleSend=patcher.newdefault(-3400,-3000,"send",owner.channel);
    lifecycleSend.varname="__alive_numeric_lifecycle_send";
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
    if(roots[doc]||typeof revision!=="number"||revision!==(revisions[doc]||0)+1)throw Error("invalid-install-revision");
    var definition=definitionFor(doc,revision),attempts=0,stable=0;
    if(command.source_sha256!==definition.source_sha256)throw Error("install-source-binding");
    max.message("openfile",config.global_name+"_"+doc+"_r"+revision,definition.working_windows_path);
    function poll() {
        try {
            var p=max.frontpatcher;++attempts;
            if(p&&samePath(p.filepath,definition.working_windows_path)) {
                try{validateTree(p,definition);stable++;}catch(e){stable=0;if(attempts>=70)throw e;}
                // The pinned helper's deferred initialization must have settled before binding.
                if(stable>=5&&attempts>=10) {
                    roots[doc]=bind(p,definition);revisions[doc]=revision;
                    record("step-complete",{document:doc,revision:revision,source_sha256:definition.source_sha256});
                    ack(command,{working_path:definition.working_windows_path,geometry_dispositions:geometryDispositions,
                        numeric_mode_observations:numericModeObservations});return;
                }
            }
            if(attempts>=80)throw Error("bounded-helper-settling-timeout");
            pollTask=new Task(poll,this);pollTask.schedule(100);
        }catch(error){fail(command,error);}
    }
    pollTask=new Task(poll,this);pollTask.schedule(100);
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
        harness_objects:[{anchor:"__alive_numeric_freebang",valid:closeRead(function(){return state.freebang.valid;})},
            {anchor:"__alive_numeric_lifecycle_send",valid:closeRead(function(){return state.lifecycleSend.valid;})}]};
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
    var observer=this.patcher.getnamed("__alive_numeric_lifecycle_observer");
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
    if(report.version!=="freebang-v1"||report.monitor_epoch!==config.lifecycle.monitor_epoch||
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
            if(proof.version!=="freebang-v1"||proof.step_id!==command.step_id||proof.document!==command.document||
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
    return {version:"freebang-v1",binding:binding,
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
        if(command.action==="install"){install(command);return;}
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
        if(command.step_id!=="capture-complete"||!roots.int||!roots.float||
            roots.int.definition.revision!==2||roots.float.definition.revision!==2)throw Error("lifecycle-final-live-owners");
        var report=lifecycleControl("barrier",-1,command);
        if(report.observer_report.failures.length||report.observer_report.sealed!==true)throw Error("lifecycle-barrier-refused");
        ack(command,{lifecycle_evidence:{version:"freebang-v1",binding:{monitor_epoch:config.lifecycle.monitor_epoch,
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
