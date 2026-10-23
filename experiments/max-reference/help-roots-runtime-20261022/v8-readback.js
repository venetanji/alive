// Original read-only root observer. Text stays in private JSON; no console output.
autowatch = 0;
inlets = 1;
outlets = 0;
var configFile = jsarguments[1], documentName = jsarguments[2];
function readPrivate(path) {
    var file = new File(path, "read"), text = "";
    if (!file.isopen) throw Error("private-file-unavailable");
    try { while (file.position < file.eof) text += file.readline() + "\n"; }
    finally { file.close(); }
    return JSON.parse(text);
}
function writePrivate(path, value) {
    var file = new File(path, "write", "TEXT");
    if (!file.isopen) throw Error("private-file-unavailable");
    try { file.eof = 0; file.writeline(JSON.stringify(value)); }
    finally { file.close(); }
}
function samePath(left, right) {
    return typeof left === "string" && typeof right === "string" &&
        left.replace(/\\/g, "/").toLowerCase() === right.replace(/\\/g, "/").toLowerCase();
}
function objectName(box) { return "__alive_help_" + box.id.replace(/-/g, "_"); }
function observedRectangle(object) {
    try {
        var rect = object.getboxattr("patching_rect");
        if (!rect || rect.length !== 4) return null;
        for (var i = 0; i < 4; ++i)
            if (typeof rect[i] !== "number" || !isFinite(rect[i])) return null;
        return [rect[0], rect[1], rect[2], rect[3]];
    } catch (error) { return null; }
}
function endpoint(object, port) {
    if (!object || typeof object.varname !== "string" || !Number.isInteger(port) || port < 0)
        throw Error("patchcord-endpoint-unavailable");
    return {varname: object.varname, port: port};
}
function collectReadback(root, definition, request, requestId, stepId) {
    if (!request || request.op !== "readback" || !Number.isInteger(requestId) || requestId < 1 ||
        request.command_id !== requestId || request.step_id !== stepId ||
        request.document !== definition.document || request.source_sha256 !== definition.source_sha256)
        throw Error("readback-request-mismatch");
    var rootPath, parent;
    try {
        if (!("parentpatcher" in root)) throw Error("working-root-path-mismatch");
        rootPath = root.filepath; parent = root.parentpatcher;
    } catch (error) { throw Error("working-root-path-mismatch"); }
    if (!samePath(rootPath, definition.working_windows_path) || parent != null)
        throw Error("working-root-path-mismatch");
    var basicBox = root.getnamed(definition.basic_varname);
    if (!basicBox) throw Error("basic-scope-unavailable");
    var basic = basicBox.subpatcher(), boxes = [], objects = {}, inputs = [], outputs = [], messages = [];
    for (var object = basic.firstobject; object; object = object.nextobject) {
        var name = object.varname;
        if (typeof name !== "string" || !name || objects[name]) throw Error("original-anchor-not-unique");
        objects[name] = object;
        boxes.push({varname: name, maxclass: object.maxclass, rect: observedRectangle(object)});
        var cords = object.patchcords;
        if (!cords || !Array.isArray(cords.inputs) || !Array.isArray(cords.outputs))
            throw Error("patchcord-inventory-unavailable");
        for (var direction of ["inputs", "outputs"]) {
            for (var cord of cords[direction]) {
                var route = {source: endpoint(cord.srcobject, cord.srcoutlet),
                    destination: endpoint(cord.dstobject, cord.dstinlet)};
                (direction === "inputs" ? inputs : outputs).push(route);
            }
        }
    }
    for (var expected of definition.boxes) {
        var original = objects[objectName(expected)];
        if (!original) throw Error("original-anchor-not-unique");
        if (expected.maxclass !== "message") continue;
        var text;
        try { text = original.boxtext; } catch (error) { throw Error("message-boxtext-unavailable"); }
        if (typeof text !== "string") throw Error("message-boxtext-unavailable");
        messages.push({anchor: expected.anchor, text: text});
    }
    return {success: true, readback_method: "v8-boxtext", request_id: requestId, step_id: stepId,
        document: definition.document, source_sha256: definition.source_sha256,
        working_root_path: rootPath, root_is_top_level: true, boxes: boxes, messages: messages,
        input_routes: inputs, output_routes: outputs, saved_order_observed: false};
}
function checkpoint(requestId, stepId) {
    var definition = null;
    try {
        var config = readPrivate(configFile);
        if (config.readback_method !== "v8-boxtext") throw Error("readback-method-mismatch");
        definition = config.documents.find(function(item) { return item.document === documentName; });
        if (!definition) throw Error("readback-document-unavailable");
        var request = readPrivate(config.command_path);
        var observation = collectReadback(this.patcher, definition, request, requestId, stepId);
        writePrivate(definition.readback_windows_path, observation);
    } catch (error) {
        if (definition) {
            try { writePrivate(definition.readback_windows_path,
                {success: false, readback_method: "v8-boxtext", request_id: requestId,
                    step_id: stepId, document: definition.document, error_code: "v8-readback-refused"}); }
            catch (unavailableOutput) {}
        }
    }
}
