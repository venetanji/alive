// Original finite harness. Scalar handlers preserve the observed int/float selector.
autowatch = 0;
inlets = 16;
outlets = 16;
var folder = this.patcher.filepath.replace(/[^\\/]*$/, "");
var rows = [], seq = 0, current = "startup", seen = -1, timer;
var names = ["zero", "whole", "half", "negative", "fraction", "small", "tinyneg", "tiny", "", "", "multiply-direct", "multiply-after", "entry", "next-entry"];
function read(path) {
    var f = new File(path, "read"), text = "";
    if (!f.isopen) return null;
    while (f.position < f.eof) text += f.readline() + "\n";
    f.close(); return JSON.parse(text);
}
function write(path, value) {
    var f = new File(path, "write", "TEXT"); f.eof = 0;
    f.writeline(JSON.stringify(value)); f.close();
}
function record(kind, value) {
    var row = {seq: ++seq, input_id: current, kind: kind, value: value, wall_ms: new Date().getTime()};
    rows.push(row);
    // One bounded JSON value per write avoids Max File's long-string truncation.
    var f = new File(folder+"../results/receipts.jsonl", "readwrite", "TEXT");
    f.position = f.eof; f.writeline(JSON.stringify(row)); f.close();
}
function msg_int(v) { record("receipt", {label:names[inlet], selector:"int", atoms:[v]}); }
function msg_float(v) { record("receipt", {label:names[inlet], selector:"float", atoms:[v]}); }
function bang() { record("receipt", {label:names[inlet], selector:"bang", atoms:[]}); }
function anything() { record("unexpected", {label:names[inlet], selector:messagename, atoms:arrayfromargs(arguments)}); }
function snapshot() {
    var result = {locked:this.patcher.locked, wind_location:this.patcher.wind.location, objects:[]};
    for (var o = this.patcher.firstobject; o; o = o.nextobject) {
        var r = {name:o.varname, maxclass:o.maxclass, rect:o.rect};
        if (o.maxclass === "flonum" || o.maxclass === "number") {
            r.value = o.getvalueof();
            var attrs = ["format", "numdecimalplaces", "minimum", "maximum", "fontsize", "patching_rect"];
            for (var j=0; j<attrs.length; ++j) {
                try { r[attrs[j]]=o.getattr(attrs[j]); } catch(e) { r[attrs[j]+"_error"]=String(e); }
            }
        }
        result.objects.push(r);
    }
    record("snapshot", result);
}
function tick() {
    try {
        var r=read(folder+"command.json");
        if (!r || r.id === seen) return;
        seen=r.id; current=r.label || String(r.id); record("command", r);
        if (r.op === "score") {
            var score=read(folder+"score.json");
            for (var i=0;i<score.length;++i) {
                var e=score[i]; current=e.id; record("stimulus",e);
                outlet.apply(this,[e.lane,e.selector].concat(e.atoms));
                snapshot();
            }
            current=r.label;
        } else if (r.op === "move") {
            for(var i=0;i<r.objects.length;++i) {
                var o=this.patcher.getnamed(r.objects[i]), a=o.rect;
                o.setattr("patching_rect",a[0]+r.dx,a[1]+r.dy,a[2]-a[0],a[3]-a[1]);
                record("moved",{name:r.objects[i],rect:o.rect});
            }
        } else if (r.op === "lock") this.patcher.locked=r.value;
        else if (r.op === "select-number") this.patcher.getnamed(r.target).message("select");
        else if (r.op !== "snapshot") throw Error("Unknown finite command");
        this.patcher.front(); snapshot();
        write(folder+"../results/applied.json",{id:seen});
    } catch(e) { record("harness-error",String(e)); }
}
function loadbang() {
    timer=new Task(start,this); timer.schedule(10000);
}
function start() {
    this.patcher.front(); current="ready"; snapshot();
    write(folder+"../results/ready.json",{ready:true});
    timer=new Task(tick,this); timer.interval=100; timer.repeat();
}
