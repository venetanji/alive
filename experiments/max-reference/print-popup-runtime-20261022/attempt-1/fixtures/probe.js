// Original finite control harness; no shipped helper code is evaluated.
inlets = 2;
outlets = 0;
var folder = this.patcher.filepath.replace(/[^\/]*$/, "");
var seen = -1, sequence = 0, rows = [], timer;
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
    rows.push({seq: ++sequence, request: seen, kind: kind, value: value, wall_ms: new Date().getTime()});
    var f = new File(folder + "../results/print-popup.jsonl", "write", "TEXT"); f.eof = 0;
    for (var i = 0; i < rows.length; ++i) f.writeline(JSON.stringify(rows[i]));
    f.close();
}
function msg_int(value) { record("dsp", value); }
function snapshot() {
    var result = {};
    for (var i = 0; i < 3; ++i) {
        var name = ["quiet", "popup", "default"][i], object = this.patcher.getnamed(name);
        result[name] = {popup: object.getattr("popup"), level: object.getattr("level")};
    }
    record("attributes", result);
}
function tick() {
    try {
        var request = read(folder + "command.json");
        if (!request || request.id === seen) return;
        seen = request.id; record("input", request);
        if (request.op === "message") {
            var object = this.patcher.getnamed(request.target);
            object.message.apply(object, [request.selector].concat(request.atoms || []));
        } else if (request.op === "setattr") {
            this.patcher.getnamed(request.target).setattr("popup", request.value);
        } else if (request.op !== "snapshot") throw Error("Unknown original probe command");
        snapshot(); this.patcher.getnamed("audio").message("bang");
        write(folder + "../results/applied.json", {id: seen});
    } catch (failure) { record("harness-error", String(failure)); }
}
function loadbang() {
    this.patcher.getnamed("audio").message(0);
    timer = new Task(tick, this); timer.interval = 100; timer.repeat();
}
