// Original collector: ordered messages plus frame-indexed float32 buffer samples.
inlets = 64;
outlets = 0;
var id = jsarguments[1], rows = [], seq = 0, score, task, position = 0;
var folder = this.patcher.filepath.replace(/[^\\/]*$/, "");
function readjson(path) {
    var f = new File(path, "read"), s = "";
    while (f.isopen && f.position < f.eof) s += f.readline() + "\n";
    f.close(); return JSON.parse(s);
}
function record(selector, atoms, label) {
    rows.push({seq: ++seq, fixture: id, input_id: position ? score.events[position-1].id : null,
        label: label || (score ? score.labels[inlet] : "inlet_" + inlet), selector: selector,
        atoms: atoms, wall_ms: new Date().getTime()});
}
function msg_int(x) { record("int", [x]); }
function msg_float(x) { record("float", [x]); }
function bang() { record("bang", []); }
function list() { record("list", arrayfromargs(arguments)); }
function anything() { record(messagename, arrayfromargs(arguments)); }
function loadbang() {
    score = readjson(folder + id + ".score.json");
    task = new Task(step, this); task.schedule(700);
}
function step() {
    if (position < score.events.length) {
        var e = score.events[position++];
        if (e.wait_ms) { task = new Task(function(){fire(e);},this); task.schedule(e.wait_ms); }
        else fire(e);
    } else { task = new Task(finish,this); task.schedule(score.drain_ms); }
}
function fire(e) {
    record("stimulus", [e.id,e.message,e.destination,e.inlet], "$input");
    this.patcher.getnamed(e.id).message("bang");
    task = new Task(step,this); task.schedule(2);
}
function encoded(value) {
    if (isNaN(value)) return "NaN";
    if (value === Infinity) return "+Infinity";
    if (value === -Infinity) return "-Infinity";
    return value;
}
function capture(stage) {
    var b = new Buffer(score.buffer), channels = [];
    for (var ch=1;ch<=b.channelcount();ch++) channels.push(b.peek(ch,0,b.framecount()));
    var f = new File(folder+"../results/"+id+"-"+stage+".samples.jsonl","write","TEXT");
    if (!f.isopen) { error("Cannot open sample result\n"); return; }
    f.eof = 0;
    for (var n=0;n<b.framecount();n++) {
        var frame=[]; for(var c=0;c<channels.length;c++) frame.push(encoded(channels[c][n]));
        f.writeline(JSON.stringify({frame:n,samples:frame}));
    }
    f.close();
    record("captured", [stage,b.framecount(),b.channelcount()], "$dsp");
}
function finish() {
    record("complete", [score.events.length], "$harness");
    var f = new File(folder+"../results/"+id+".jsonl","write","TEXT");
    if (!f.isopen) { error("Cannot write evidence\n"); return; }
    f.eof = 0;
    for(var i=0;i<rows.length;i++) f.writeline(JSON.stringify(rows[i]));
    f.close();
    post("ALIVE_SIGNAL_COMPLETE "+id+" "+rows.length+"\n");
}
