// Collector order is JS arrival order, not a scheduler-thread timestamp.
inlets = 1;
outlets = 0;
var rows = [], seq = 0, position = 0, score, task;
var folder = this.patcher.filepath.replace(/[^\/]*$/, "");
function record(selector, atoms, label) {
    rows.push({seq: ++seq, input_id: position ? score.events[position-1].id : null,
        label: label || "event", selector: selector, atoms: atoms, wall_ms: new Date().getTime()});
}
function msg_int(x) { record("int", [x]); }
function msg_float(x) { record("float", [x]); }
function bang() { record("bang", []); }
function list() { record("list", arrayfromargs(arguments)); }
function anything() { record(messagename, arrayfromargs(arguments)); }
function loadbang() {
    var f = new File(folder + "hierarchy.score.json", "read"), s = "";
    while (f.isopen && f.position < f.eof) s += f.readline() + "\n";
    f.close(); score = JSON.parse(s);
    task = new Task(step, this); task.schedule(1000);
}
function step() {
    if (position < score.events.length) {
        var e = score.events[position++];
        record("stimulus", [e.id,e.message,e.destination,e.inlet], "$input");
        this.patcher.getnamed(e.id).message("bang");
        task = new Task(step,this); task.schedule(100);
    } else {
        task = new Task(finish,this); task.schedule(300);
    }
}
function finish() {
    record("complete", [score.events.length], "$harness");
    var f = new File(folder + "../results/hierarchy.jsonl", "write", "TEXT");
    if (!f.isopen) { error("Cannot write hierarchy evidence\n"); return; }
    f.eof = 0;
    for (var i=0;i<rows.length;i++) f.writeline(JSON.stringify(rows[i]));
    f.close(); post("ALIVE_HIERARCHY_REFERENCE_COMPLETE " + rows.length + "\n");
}
