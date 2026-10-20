// Original UI evidence collector. Records message arrival, not scheduler priority.
inlets = 6;
outlets = 0;
var sequence = 0;
var labels = ['button', 'toggle', 'number', 'flonum', 'slider', 'dsp-enabled'];
var folder = this.patcher.filepath.replace(/[^\/]*$/, '');
function record(selector, atoms) {
    var f = new File(folder + '../results/dsp-query.jsonl', 'readwrite', 'TEXT');
    if (!f.isopen) { error('Cannot open own UI evidence file\n'); return; }
    f.position = f.eof;
    f.writeline(JSON.stringify({seq: ++sequence, label: labels[inlet], selector: selector, atoms: atoms}));
    f.close();
}
function bang() { record('bang', []); }
function msg_int(value) { record('int', [value]); }
function msg_float(value) { record('float', [value]); }
function list() { record('list', arrayfromargs(arguments)); }
function dump() {
    var counts = {}, object = this.patcher.firstobject;
    while (object) {
        var name = object.maxclass;
        counts[name] = (counts[name] || 0) + 1;
        object = object.nextobject;
    }
    record('class-counts', [JSON.stringify(counts)]);
}

function query() { var o = this.patcher.firstobject; while(o) { if(o.maxclass === "adstatus") o.message("bang"); o=o.nextobject; } }
var queryTask = new Task(query, this); queryTask.schedule(1000);
