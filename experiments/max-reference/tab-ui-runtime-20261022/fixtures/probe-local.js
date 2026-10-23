// Original probe, with source filepath in every retained row.
inlets = 1;
outlets = 2;
var id = jsarguments[1], folder = this.patcher.filepath.replace(/[^\/]*$/, "");
var rows = [], position = 0, task;
var steps = ["initial", "open-zeta", "zeta-local", "zeta-return", "zeta-set77", "alpha", "zeta-retained", "promote-runtime", "root", "promoted"];
function write(path, value) {
    var f = new File(path, "write", "TEXT"); f.eof = 0;
    f.writeline(JSON.stringify(value)); f.close();
}
function attr(patcher, key) {
    try { var value = patcher.getattr(key); return typeof value === "undefined" ? "undefined" : value; }
    catch (e) { return String(e); }
}
function loadbang() { task = new Task(step, this); task.schedule(1800); }
function step() {
    if (position >= steps.length) {
        write(folder + "../results/" + id + "-complete.json", rows); return;
    }
    var label = steps[position++], zeta = this.patcher.getnamed("zeta").subpatcher();
    if (label === "alpha") outlet(0, "setactivetab", "Alpha");
    if (label === "zeta-set77" || label === "zeta-retained") outlet(0, "setactivetab", "Zeta");
    if (label === "zeta-set77") zeta.getnamed("value").message("set", 77);
    if (label === "promoted") outlet(0, "setactivetab", "Promoted");
    if (label === "root") { outlet(0, "front"); outlet(0, "setactivetab", id + " (root)"); }
    if (label === "promote-runtime") zeta.getnamed("promoted").message("showontab", 2);
    if (label === "open-zeta") { outlet(1, "open"); zeta.getnamed("this").message("front"); }
    if (label === "zeta-local") zeta.getnamed("this").message("setactivetab", "Local");
    if (label === "zeta-return") zeta.getnamed("this").message("setactivetab", "Zeta");
    rows.push({fixture: id, source_filepath: this.patcher.filepath, stage: label,
        number_value: zeta.getnamed("value").getvalueof(), root_showroot: attr(this.patcher, "showrootpatcherontab"),
        root_showontab: attr(this.patcher, "showontab"), zeta_showroot: attr(zeta, "showrootpatcherontab"),
        zeta_showontab: attr(zeta, "showontab"), local_showontab: attr(zeta.getnamed("local").subpatcher(), "showontab"),
        promoted_showontab: attr(zeta.getnamed("promoted").subpatcher(), "showontab"), wall_ms: new Date().getTime()});
    task = new Task(capture, this); task.schedule(350);
}
function capture() {
    write(folder + "../results/" + id + "-request.json", rows[rows.length - 1]);
    task = new Task(step, this); task.schedule(750);
}
