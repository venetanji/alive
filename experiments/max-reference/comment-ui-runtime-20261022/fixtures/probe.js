// Original read-only snapshots plus finite text/width changes on synthetic boxes.
autowatch = 0;
var folder = this.patcher.filepath.replace(/[^\\/]*$/, "");
var rows = [], task;
var attributes = ["patching_rect", "fontsize", "fontname", "bubble", "bubbleside", "bubblepoint", "bubbletextmargin", "linecount", "style", "text"];
function write(path, value) {
    var f = new File(path, "write", "TEXT");
    f.eof = 0; f.writeline(JSON.stringify(value)); f.close();
}
function snapshot(stage) {
    var result = {stage: stage, wall_ms: new Date().getTime(), objects: []};
    for (var o = this.patcher.firstobject; o; o = o.nextobject) {
        if (o.maxclass !== "comment") continue;
        var r = {name: o.varname, rect: o.rect};
        for (var i = 0; i < attributes.length; i++) {
            try { r[attributes[i]] = o.getattr(attributes[i]); }
            catch (error) { r[attributes[i] + "_error"] = String(error); }
        }
        result.objects.push(r);
    }
    rows.push(result);
    write(folder + "../results/snapshots.json", rows);
    write(folder + "../results/capture-request.json", {stage: stage});
}
function loadbang() { task = new Task(initial, this); task.schedule(10000); }
function initial() {
    this.patcher.front();
    snapshot("initial");
    task = new Task(changed, this); task.schedule(2200);
}
function changed() {
    this.patcher.getnamed("plain-count-1").message("set", "Short");
    this.patcher.getnamed("bubble-count-1").message("set", "Short");
    this.patcher.getnamed("plain-count-2").setattr("patching_rect", 740, 230, 90, 70);
    this.patcher.getnamed("bubble-count-2").setattr("patching_rect", 940, 230, 90, 70);
    task = new Task(afterchange, this); task.schedule(1200);
}
function afterchange() {
    snapshot("changed");
    task = new Task(finish, this); task.schedule(2200);
}
function finish() { write(folder + "../results/complete.json", {complete: true, stages: rows.length}); }
