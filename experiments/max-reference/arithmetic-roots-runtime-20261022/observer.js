// Original zero-output leaf. Source outlets and destination outlets are observed directly.
autowatch=0;inlets=1;outlets=0;
var configFile=jsarguments[1],document=jsarguments[2],revision=Number(jsarguments[3]);
var anchor=jsarguments[4],port=Number(jsarguments[5]);
function read(path) {
    var f=new File(path,"read"),text="";
    if (!f.isopen) throw Error("private-file-unavailable");
    try {
        var length=f.eof;
        if(!(typeof length==="number"&&isFinite(length))||length<0||Math.floor(length)!==length)throw Error("private-file-read-size");
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
var config=read(configFile),shared=new Global(config.global_name),source=null;
for(var d=0;d<config.documents.length;d++)if(config.documents[d].document===document&&config.documents[d].revision===revision)source=config.documents[d].source_sha256;
function record(selector,values,tag) {
    var atoms=[];for(var i=0;i<values.length;i++)atoms.push({tag:typeof values[i]==="number"?(tag||"unknown-number"):"symbol",value:values[i]});
    var row={seq:++shared.seq,request_id:shared.request_id,step_id:shared.step_id,action:shared.action,
        action_document:shared.action_document,action_revision:shared.action_revision,document:document,
        revision:revision,source_sha256:source,kind:"receipt",anchor:anchor,port:port,
        synchronous_dispatch_active:shared.dispatch_active===1,message:{selector:selector,atoms:atoms}};
    var f=new File(config.journal_path,"readwrite","TEXT");if(!f.isopen)throw Error("private-journal-unavailable");
    f.position=f.eof;f.writeline(JSON.stringify(row));f.close();
}
function bang(){record("bang",[]);}
function msg_int(v){record("int",[v],"int");}
function msg_float(v){record("float",[v],"float");}
function list(){record("list",arrayfromargs(arguments));}
function anything(){record(messagename,arrayfromargs(arguments));}
