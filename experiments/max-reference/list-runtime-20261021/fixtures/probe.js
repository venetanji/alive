// A collector records arrival order at the JS boundary; scheduler priority can defer JS.
inlets = 64;
outlets = 0;
var id = jsarguments[1], rows = [], seq = 0, score, task, position = 0;
var folder = this.patcher.filepath.replace(/[^\/]*$/, "");
function readjson(path) {
    var f = new File(path, "read"), s = "";
    while (f.isopen && f.position < f.eof) s += f.readline() + "\n";
    f.close(); return JSON.parse(s);
}
function record(selector, atoms, label) {
    rows.push({seq: ++seq, fixture: id, input_id: position ? score.events[position-1].id : null, label: label || (score ? score.labels[inlet] : "inlet_"+inlet),
        selector: selector, atoms: atoms, wall_ms: new Date().getTime()});
}
function msg_int(x) { record("int", [x]); }
function msg_float(x) { record("float", [x]); }
function bang() { record("bang", []); }
function list() { record("list", arrayfromargs(arguments)); }
function anything() { record(messagename, arrayfromargs(arguments)); }
function loadbang() {
    score = readjson(folder + id + ".score.json");
    // Early loadbang messages already collected retain numeric inlet labels.
    for (var i=0;i<rows.length;i++) if (/^inlet_/.test(rows[i].label))
        rows[i].label=score.labels[parseInt(rows[i].label.substr(6),10)];
    task = new Task(step, this); task.schedule(500);
}
function step() {
    if (position < score.events.length) {
        var e = score.events[position++];
        if (e.wait_ms) { task = new Task(function(){fire(e);},this); task.schedule(e.wait_ms); }
        else fire(e);
    } else {
        task = new Task(finish,this); task.schedule(score.drain_ms);
    }
}
function fire(e) {
    record("stimulus", [e.id,e.message,e.destination,e.inlet], "$input");
    if (e.direct) {
        var target = null;
        for (var i=0;i<score.targets.length;i++) if (score.targets[i].id === e.destination)
            target = this.patcher.getnamed(score.targets[i].key);
        if (!target) { error("Missing direct target " + e.destination + "\n"); return; }
        target.message.apply(target, [e.selector].concat(e.atoms));
    } else this.patcher.getnamed(e.id).message("bang");
    task = new Task(step,this); task.schedule(1);
}
function finish() {
    record("complete", [score.events.length], "$harness");
    var f = new File(folder + "../results/" + id + ".jsonl", "write", "TEXT");
    if (!f.isopen) { error("Cannot write evidence for "+id+"\n"); return; }
    f.eof = 0;
    for (var i=0;i<rows.length;i++) f.writeline(JSON.stringify(rows[i]));
    f.close();
    // Max saving is authorization-gated in this installed standalone session.
    // Do not attempt programmatic saves or an alternative serialization path here.
    post("ALIVE_REFERENCE_COMPLETE " + id + " " + rows.length + "\n");
}
function capture() {
    var b = new Buffer("alive_reference_dsp"), channels = [];
    for (var ch=1;ch<=b.channelcount();ch++) channels.push(b.peek(ch,0,b.framecount()));
    var f = new File(folder+"../dsp/max-samples.jsonl","write","TEXT");
    f.eof = 0;
    for (var n=0;n<b.framecount();n++) {
        var frame=[]; for (var c=0;c<channels.length;c++) frame.push(channels[c][n]);
        f.writeline(JSON.stringify({frame:n, samples:frame}));
    }
    f.close();
    record("captured",[b.framecount(),b.channelcount()],"$dsp");
}
