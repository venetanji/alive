// Original finite arithmetic recorder. Scalar handlers retain Max's outlet type.
autowatch = 0;
inlets = 31;
outlets = 62;
var folder = this.patcher.filepath.replace(/[^\\/]*$/, "");
var seq = 0, current = "startup", targets, score, task;
function read(path) {
    var f = new File(path, "read"), text = "";
    if (!f.isopen) throw Error("Cannot read original fixture input");
    while (f.position < f.eof) text += f.readline() + "\n";
    f.close(); return JSON.parse(text);
}
function write(path, value) {
    var f = new File(path, "write", "TEXT"); f.eof = 0;
    f.writeline(JSON.stringify(value)); f.close();
}
function record(kind, value) {
    var row = {seq:++seq, input_id:current, kind:kind, value:value, wall_ms:new Date().getTime()};
    var f = new File(folder+"../results/receipts.jsonl", "readwrite", "TEXT");
    f.position = f.eof; f.writeline(JSON.stringify(row)); f.close();
}
function receipt(selector, atoms) {
    var repr = [], negative = [], finite = [];
    for (var i=0; i<atoms.length; ++i) {
        repr.push(String(atoms[i]));
        negative.push(typeof atoms[i] === "number" && atoms[i] === 0 && 1/atoms[i] === -Infinity);
        finite.push(typeof atoms[i] !== "number" || isFinite(atoms[i]));
    }
    record("receipt", {target:targets ? targets[inlet].label : String(inlet), inlet:inlet,
                      selector:selector, atoms:atoms, number_repr:repr,
                      negative_zero:negative, finite:finite});
}
function msg_int(v) { receipt("int", [v]); }
function msg_float(v) { receipt("float", [v]); }
function bang() { receipt("bang", []); }
function list() { receipt("list", arrayfromargs(arguments)); }
function anything() { receipt(messagename, arrayfromargs(arguments)); }
function run() {
    try {
        targets = read(folder+"targets.json"); score = read(folder+"score.json");
        record("ready", {target_count:targets.length, steps:score.length});
        for (var i=0; i<score.length; ++i) {
            var e=score[i], atoms=e.atoms.slice(0); current=e.id;
            if (e.negative_zero && atoms.length) atoms[0]=-1*0;
            record("stimulus", e);
            outlet.apply(this, [e.lane,e.selector].concat(atoms));
            record("step-complete", {id:e.id});
        }
        current="complete";record("complete", {steps:score.length});
        write(folder+"../results/complete.json", {steps:score.length, receipts_file:"receipts.jsonl"});
    } catch(e) { record("harness-error", String(e)); }
}
function loadbang() { task=new Task(run,this); task.schedule(10000); }
