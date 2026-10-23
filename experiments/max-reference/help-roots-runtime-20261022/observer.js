// Original leaf recorder. It observes one existing outlet and has no output.
autowatch = 0;
inlets = 1;
outlets = 0;
var configFile = jsarguments[1], document = jsarguments[2];
var anchor = jsarguments[3], port = Number(jsarguments[4]), config, shared;
function read(path) {
    var f = new File(path, "read"), text = "";
    if (!f.isopen) throw Error("private-config-unavailable");
    while (f.position < f.eof) text += f.readline() + "\n";
    f.close(); return JSON.parse(text);
}
config = read(configFile);
shared = new Global(config.global_name);
function record(selector, values, scalarTag) {
    var atoms = [];
    for (var i = 0; i < values.length; ++i) {
        atoms.push({tag: typeof values[i] === "number" ? (scalarTag || "unknown-number") : "symbol",
                    value: values[i]});
    }
    var row = {seq: ++shared.seq, step_id: shared.step_id, document: document,
        kind: "receipt", anchor: anchor, port: port,
        message: {selector: selector, atoms: atoms}, wall_ms: new Date().getTime()};
    var f = new File(config.journal_path, "readwrite", "TEXT");
    if (!f.isopen) throw Error("private-journal-unavailable");
    f.position = f.eof; f.writeline(JSON.stringify(row)); f.close();
}
function bang() { record("bang", []); }
function msg_int(value) { record("int", [value], "int"); }
function msg_float(value) { record("float", [value], "float"); }
function list() { record("list", arrayfromargs(arguments)); }
function anything() { record(messagename, arrayfromargs(arguments)); }
