// Original finite tab/view probe. Screenshots are requested after each command.
inlets = 1;
outlets = 1;
var id = jsarguments[1], folder = this.patcher.filepath.replace(/[^\/]*$/, "");
var rows = [], position = 0, task;
var steps = ["initial", "alpha", "zeta-set77", "alpha-again", "zeta-retained", "promoted", "zeta-local", "zeta-return"];
function write(path, value) {
    var f = new File(path, "write", "TEXT"); f.eof = 0;
    f.writeline(JSON.stringify(value)); f.close();
}
function loadbang() { task = new Task(step, this); task.schedule(1800); }
function step() {
    if (position >= steps.length) {
        write(folder + "../results/" + id + "-complete.json", rows); return;
    }
    var label = steps[position++], zeta = this.patcher.getnamed("zeta").subpatcher();
    if (label === "alpha" || label === "alpha-again") outlet(0, "setactivetab", "Alpha");
    if (label === "zeta-set77" || label === "zeta-retained" || label === "zeta-local" || label === "zeta-return") outlet(0, "setactivetab", "Zeta");
    if (label === "zeta-set77") zeta.getnamed("value").message("set", 77);
    if (label === "promoted") outlet(0, "setactivetab", "Promoted");
    if (label === "zeta-local") zeta.getnamed("this").message("setactivetab", "Local");
    if (label === "zeta-return") zeta.getnamed("this").message("setactivetab", "Zeta");
    rows.push({fixture: id, stage: label, number_value: zeta.getnamed("value").getvalueof(), wall_ms: new Date().getTime()});
    task = new Task(capture, this); task.schedule(350);
}
function capture() {
    write(folder + "../results/" + id + "-request.json", rows[rows.length - 1]);
    task = new Task(step, this); task.schedule(750);
}
