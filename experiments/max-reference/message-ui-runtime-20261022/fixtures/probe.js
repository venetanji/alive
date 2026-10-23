// Original direct-wire collector. JS atom-array numeric subtypes are not preserved.
inlets = 64;
outlets = 64;
var id = jsarguments[1], rows = [], seq = 0, score, task, position = 0;
var folder = this.patcher.filepath.replace(/[^\/]*$/, "");
function readjson(path) {
    var f = new File(path, "read"), text = "";
    while (f.isopen && f.position < f.eof) text += f.readline() + "\n";
    f.close(); return JSON.parse(text);
}
function record(selector, atoms, label) {
    rows.push({seq: ++seq, fixture: id, input_id: position ? score.events[position-1].id : null,
        label: label || score.labels[inlet], selector: selector, atoms: atoms, wall_ms: new Date().getTime()});
}
function msg_int(x) { record("int", [x]); }
function msg_float(x) { record("float", [x]); }
function bang() { record("bang", []); }
function list() { record("list", arrayfromargs(arguments)); }
function anything() { record(messagename, arrayfromargs(arguments)); }
function loadbang() {
    score = readjson(folder + id + ".score.json");
    task = new Task(step, this); task.schedule(800);
}
function snapshot(e) {
    var object = this.patcher.getnamed(e.target), result = {target: e.target};
    try { result.value = object.getvalueof(); } catch (error) { result.value_error = String(error); }
    if (e.target === "template" || e.target === "empty" || e.target === "literal") {
        try { result.text = object.getattr("text"); } catch (error) { result.text_error = String(error); }
    }
    record("snapshot", [JSON.stringify(result)], "$state");
}
function step() {
    if (position >= score.events.length) { task = new Task(finish, this); task.schedule(score.drain_ms); return; }
    var e = score.events[position++];
    record("stimulus", [e.target, e.inlet, e.selector].concat(e.atoms), "$input");
    outlet.apply(this, [e.lane, e.selector].concat(e.atoms));
    snapshot(e);
    if (e.keyboard) {
        var f = new File(folder + "../results/keyboard-request.json", "write", "TEXT");
        f.eof = 0; f.writeline(JSON.stringify({id: e.id, key: e.keyboard})); f.close();
    }
    task = new Task(step, this); task.schedule(e.wait_after_ms || 5);
}
function finish() {
    record("complete", [score.events.length], "$harness");
    var f = new File(folder + "../results/" + id + ".jsonl", "write", "TEXT");
    if (!f.isopen) { error("Cannot write reference evidence\n"); return; }
    f.eof = 0;
    for (var i = 0; i < rows.length; i++) f.writeline(JSON.stringify(rows[i]));
    f.close(); post("ALIVE_REFERENCE_COMPLETE " + rows.length + "\n");
}
