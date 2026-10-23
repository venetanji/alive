// Original controller. Licensed roots are opened from private working copies.
autowatch = 0;
inlets = 1;
outlets = 0;
var configFile = jsarguments[1], config, shared, timer, roots = {}, seen = -1;
var opening = 0, openAttempts = 0, loadingDiagnostics = [], anchorDiagnostics = [];
function read(path) {
    var f = new File(path, "read"), text = "";
    if (!f.isopen) return null;
    while (f.position < f.eof) text += f.readline() + "\n";
    f.close(); return JSON.parse(text);
}
function write(path, value) {
    var f = new File(path, "write", "TEXT");
    if (!f.isopen) throw Error("private-output-unavailable");
    f.eof = 0; f.writeline(JSON.stringify(value)); f.close();
}
function record(kind, value) {
    var row = {seq: ++shared.seq, step_id: shared.step_id, document: shared.document, kind: kind,
        wall_ms: new Date().getTime(), value: value};
    var f = new File(config.journal_path, "readwrite", "TEXT");
    f.position = f.eof; f.writeline(JSON.stringify(row)); f.close();
}
function numericRectangle(value) {
    if (!value || value.length !== 4) return null;
    for (var i = 0; i < 4; ++i) if (typeof value[i] !== "number" || !isFinite(value[i])) return null;
    return [value[0], value[1], value[2], value[3]];
}
function patchingRectangle(object, method) {
    try {
        if (typeof object[method] !== "function") return {status: "unavailable", rect: null};
        var value = object[method]("patching_rect");
        if (value === null || typeof value === "undefined") return {status: "null", rect: null};
        var rect = numericRectangle(value);
        return {status: rect ? "observed" : "malformed", rect: rect};
    } catch (error) { return {status: "threw", rect: null}; }
}
function rawRectangle(object) {
    try { return numericRectangle(object.rect); } catch (error) { return null; }
}
function sameRect(left, right) {
    if (!left || left.length !== 4) return false;
    for (var i = 0; i < 4; ++i) if (Math.abs(left[i] - right[i]) > 0.01) return false;
    return true;
}
function annotationWidthPolicy(expected, definition) {
    var policy = expected.annotation_width_policy;
    if (!policy && typeof expected.observer_policy === "undefined") return null;
    var saved = [130, 195, 257.934143, 39];
    if (!policy || policy.kind !== "source-bound-helper-width" ||
        policy.source_sha256 !== "d4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729" ||
        policy.anchor !== "root/obj-5/obj-4" || expected.anchor !== policy.anchor || expected.id !== "obj-4" ||
        expected.maxclass !== "jsui" || expected.runtime_class !== "jsui" || expected.filename !== "helpargs.js" ||
        expected.ignoreclick !== 1 || expected.outlets !== 1 || policy.helper_filename !== "helpargs.js" ||
        policy.helper_sha256 !== "04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469" ||
        policy.source_ignoreclick !== 1 || policy.source_outlets !== 1 || policy.saved_incoming_routes !== 0 ||
        policy.saved_outgoing_routes !== 0 || policy.observer_policy !== "omit-disconnected-annotation-leaf" ||
        expected.observer_policy !== policy.observer_policy || !numericRectangle(policy.saved_rect) ||
        !numericRectangle(expected.rect)) throw Error("invalid-source-bound-annotation-policy");
    for (var i = 0; i < 4; ++i)
        if (policy.saved_rect[i] !== saved[i] || expected.rect[i] !== saved[i])
            throw Error("invalid-source-bound-annotation-policy");
    if (definition) {
        if (definition.document !== "append" || definition.source_sha256 !== policy.source_sha256 ||
            !definition.saved_edges) throw Error("invalid-source-bound-annotation-policy");
        for (var i = 0; i < definition.saved_edges.length; ++i) {
            var edge = definition.saved_edges[i];
            if ((edge.source && edge.source[0] === expected.id) ||
                (edge.destination && edge.destination[0] === expected.id))
                throw Error("invalid-source-bound-annotation-policy");
        }
    }
    // Return only the approved metadata; private authored fields never enter capabilities.
    return {kind: "source-bound-helper-width", source_sha256: policy.source_sha256, anchor: policy.anchor,
        helper_filename: "helpargs.js", helper_sha256: policy.helper_sha256, source_ignoreclick: 1,
        source_outlets: 1, saved_incoming_routes: 0, saved_outgoing_routes: 0, saved_rect: saved,
        observer_policy: "omit-disconnected-annotation-leaf"};
}
function annotationRectMatches(object, rect, saved) {
    return object.maxclass === "jsui" && rect && rect[2] > 0 &&
        Math.abs(rect[0] - saved[0]) <= 0.01 && Math.abs(rect[1] - saved[1]) <= 0.01 &&
        Math.abs(rect[3] - saved[3]) <= 0.01;
}
function describeAnchorFailure(expected, candidates, fullMatchCount, policy, policyMatchCount) {
    var value = {expected_anchor: expected.anchor, expected_id: expected.id,
        expected_rect: expected.rect.slice(0), expected_maxclass: expected.maxclass,
        expected_runtime_class: expected.runtime_class, full_match_count: fullMatchCount,
        full_matches: [], position_class_matches: [], candidates: []};
    for (var i = 0; i < candidates.length; ++i) {
        var object = candidates[i].object, geometry = candidates[i].geometry, rect = geometry.rect;
        var generic = patchingRectangle(object, "getattr");
        var item = {ordinal: i, rect: rect, maxclass: object.maxclass, raw_rect: rawRectangle(object),
            patching_rect_status: geometry.status, patching_rect: rect,
            getattr_patching_rect_status: generic.status, getattr_patching_rect: generic.rect};
        value.candidates.push(item);
        if (sameRect(rect, expected.rect)) value.full_matches.push(item);
        if (rect && Math.abs(rect[0] - expected.rect[0]) <= 0.01 && Math.abs(rect[1] - expected.rect[1]) <= 0.01 &&
            (object.maxclass === expected.runtime_class || object.maxclass === expected.maxclass))
            value.position_class_matches.push(item);
    }
    value.position_class_match_count = value.position_class_matches.length;
    if (policy) {
        value.annotation_width_policy = policy;
        value.annotation_policy_match_count = policyMatchCount;
    }
    anchorDiagnostics.push(value);
}
function resolve(patcher, expected, definition, annotationBindings) {
    var policy = annotationWidthPolicy(expected, definition), found = [], candidates = [], fullMatchCount = 0;
    for (var object = patcher.firstobject; object; object = object.nextobject) {
        var geometry = patchingRectangle(object, "getboxattr");
        candidates.push({object: object, geometry: geometry});
        if (sameRect(geometry.rect, expected.rect)) ++fullMatchCount;
        if (policy ? annotationRectMatches(object, geometry.rect, expected.rect) : sameRect(geometry.rect, expected.rect))
            found.push({object: object, rect: geometry.rect});
    }
    if (found.length !== 1) {
        describeAnchorFailure(expected, candidates, fullMatchCount, policy, found.length);
        throw Error("saved-anchor-not-unique:" + expected.id);
    }
    if (found[0].object.maxclass !== expected.runtime_class && found[0].object.maxclass !== expected.maxclass) {
        describeAnchorFailure(expected, candidates, fullMatchCount, policy, found.length);
        throw Error("saved-anchor-class-mismatch:" + expected.id);
    }
    if (policy && annotationBindings) {
        policy.live_rect = found[0].rect.slice(0);
        annotationBindings.push(policy);
    }
    return found[0].object;
}
function countTree(patcher) {
    var count = 0;
    for (var object = patcher.firstobject; object; object = object.nextobject) {
        ++count;
        try { var child = object.subpatcher(); if (child) count += countTree(child); } catch (error) {}
    }
    return count;
}
function samePath(left, right) {
    return String(left || "").replace(/\\/g, "/").toLowerCase() ===
        String(right || "").replace(/\\/g, "/").toLowerCase();
}
function describeRoot(patcher, definition) {
    var value = {document: definition.document, filepath: "", tree_boxes: 0,
        top_boxes: [], basic_named: false, attempts: openAttempts};
    if (!patcher) return value;
    value.filepath = String(patcher.filepath || "");
    value.tree_boxes = countTree(patcher);
    value.basic_named = Boolean(patcher.getnamed(definition.basic_varname));
    for (var object = patcher.firstobject; object; object = object.nextobject) {
        value.top_boxes.push({ordinal: value.top_boxes.length, maxclass: object.maxclass,
            basic_named: object.varname === definition.basic_varname});
    }
    return value;
}
function fail(error) {
    record("harness-error", String(error));
    write(config.ready_path, {ready: false, error: String(error), diagnostics: loadingDiagnostics,
        anchor_diagnostics: anchorDiagnostics});
}
function openNext() {
    if (opening === config.documents.length) { bind(); return; }
    var definition = config.documents[opening];
    openAttempts = 0;
    // Patcher's constructor creates an empty window; openfile loads the exact file.
    max.message("openfile", config.global_name + "_" + definition.document, definition.working_windows_path);
    timer = new Task(pollOpen, this); timer.schedule(100);
}
function pollOpen() {
    try {
        var definition = config.documents[opening], patcher = max.frontpatcher;
        ++openAttempts;
        loadingDiagnostics[opening] = describeRoot(patcher, definition);
        if (patcher && samePath(patcher.filepath, definition.working_windows_path)) {
            roots[definition.document] = {patcher: patcher};
            ++opening; openNext();
        } else if (openAttempts < 100) {
            timer = new Task(pollOpen, this); timer.schedule(100);
        } else throw Error("working-root-load-timeout");
    } catch (error) { fail(error); }
}
function bind() {
    try {
        var capabilities = [], preflightError = null;
        for (var d = 0; d < config.documents.length; ++d) {
            var definition = config.documents[d], state = roots[definition.document];
            if (!samePath(state.patcher.filepath, definition.working_windows_path))
                throw Error("working-root-path-mismatch");
            state.initialCount = countTree(state.patcher);
            if (state.initialCount !== definition.full_inventory.length) throw Error("full-tree-count-mismatch");
            var basicBox = state.patcher.getnamed(definition.basic_varname);
            if (!basicBox) throw Error("basic-scope-unavailable");
            state.basic = basicBox.subpatcher(); state.objects = {}; state.annotationBindings = [];
            for (var i = 0; i < definition.boxes.length; ++i) {
                var expected = definition.boxes[i], beforeDiagnostics = anchorDiagnostics.length;
                try { state.objects[expected.anchor] = resolve(state.basic, expected, definition, state.annotationBindings); }
                catch (error) {
                    if (anchorDiagnostics.length === beforeDiagnostics) throw error;
                    if (preflightError === null) preflightError = error;
                }
            }
        }
        if (preflightError !== null) throw preflightError;
        // Resolve both complete Basic scopes before any original object is mutated.
        for (var d = 0; d < config.documents.length; ++d) {
            var definition = config.documents[d], state = roots[definition.document];
            var observerLeafCount = 0;
            for (var i = 0; i < definition.boxes.length; ++i) {
                var expected = definition.boxes[i], object = state.objects[expected.anchor];
                object.varname = "__alive_help_" + expected.id.replace(/-/g, "_");
                if (annotationWidthPolicy(expected, definition)) continue;
                for (var port = 0; port < expected.outlets; ++port) {
                    var leaf = state.basic.newdefault(-2000 - i * 10, -2000 - port * 10,
                        "js", config.observer_path, configFile, definition.document, expected.anchor, port);
                    leaf.varname = "__alive_help_leaf_" + expected.id.replace(/-/g, "_") + "_" + port;
                    // Add a leaf only; every original route and endpoint remains connected.
                    state.basic.connect(object, port, leaf, 0);
                    ++observerLeafCount;
                }
            }
            if (config.readback_method === "v8-boxtext") {
                state.reader = state.patcher.newdefault(-3000, -3000, "v8", config.readback_helper_path,
                    configFile, definition.document);
                state.reader.varname = "__alive_help_v8_readback";
            } else state.writer = state.patcher.newdefault(-3000, -3000, "thispatcher");
            capabilities.push({document: definition.document, initial_tree_boxes: state.initialCount,
                source_inventory_boxes: definition.full_inventory.length,
                resolved_basic_boxes: definition.boxes.length,
                source_basic_cables: definition.saved_edges ? definition.saved_edges.length : 0,
                observer_leaf_cables: observerLeafCount,
                annotation_bindings: state.annotationBindings,
                working_path: definition.working_windows_path,
                original_routes: "retained; only leaf branches added",
                observer_order: "callback order only; not destination-order evidence"});
        }
        shared.step_id = "ready";
        record("ready", capabilities); write(config.ready_path,
            {ready: true, capabilities: capabilities, diagnostics: loadingDiagnostics,
                anchor_diagnostics: anchorDiagnostics});
        timer = new Task(tick, this); timer.interval = 50; timer.repeat();
    } catch (error) {
        fail(error);
    }
}
function diagnosticFlag(read) {
    try {
        var value = read();
        if (typeof value === "boolean") return value;
        if (value === 0 || value === 1) return Boolean(value);
    } catch (error) {}
    return null;
}
function writerDiagnostics(state) {
    var owner = null;
    try { owner = state.writer.patcher; } catch (error) {}
    return {
        writer_valid: diagnosticFlag(function() { return state.writer.valid; }),
        writer_class_is_thispatcher: diagnosticFlag(function() {
            return typeof state.writer.maxclass === "string" ? state.writer.maxclass === "thispatcher" : null;
        }),
        writer_owner_is_root: owner ? owner === state.patcher : null,
        writer_owner_path_matches: diagnosticFlag(function() { return samePath(owner.filepath, state.patcher.filepath); }),
        writer_understands_write: diagnosticFlag(function() { return state.writer.understands("write"); }),
        root_is_top_level: diagnosticFlag(function() {
            var parent = state.patcher.parentpatcher;
            return typeof parent === "undefined" ? null : parent === null;
        }),
        root_locked: diagnosticFlag(function() { return state.patcher.locked; }),
        root_dirty: diagnosticFlag(function() { return state.patcher.wind.dirty; })
    };
}
function tick() {
    try {
        var command = read(config.command_path);
        if (!command || command.command_id === seen) return;
        seen = command.command_id; shared.step_id = command.step_id; shared.document = command.document;
        var state = roots[command.document], snapshotDiagnostics = null;
        if (!state) throw Error("unknown-document");
        if (command.op === "event") {
            var object = state.objects[command.anchor];
            if (!object) throw Error("unknown-source-anchor");
            record("stimulus", command);
            if (command.message.selector === "bang") object.message("bang");
            else if (command.message.selector === "int") object.message("int", command.message.atoms[0].value);
            else throw Error("unsupported-finite-selector");
            record("step-complete", {step_id: command.step_id});
        } else if (command.op === "snapshot") {
            if (config.readback_method === "v8-boxtext") throw Error("serialization-disabled-for-v8-readback");
            // This object belongs to the expendable working patcher, never the pristine copy.
            snapshotDiagnostics = writerDiagnostics(state);
            state.writer.message("write");
            record("snapshot-request", {document: command.document});
        } else if (command.op === "readback") {
            if (config.readback_method !== "v8-boxtext") throw Error("v8-readback-not-selected");
            state.reader.message("checkpoint", command.command_id, command.step_id);
            record("readback-request", {request_id: command.command_id, source_sha256: command.source_sha256});
        } else if (command.op === "prepare-entry") {
            state.basic.front(); state.objects[command.anchor].message("select");
        } else if (command.op === "front") state.basic.front();
        else if (command.op === "complete") record("complete", {steps: command.steps});
        else throw Error("unknown-finite-command");
        var acknowledgement = {command_id: seen, success: true, step_id: shared.step_id};
        if (snapshotDiagnostics) acknowledgement.snapshot_diagnostics = snapshotDiagnostics;
        write(config.ack_path, acknowledgement);
    } catch (error) {
        record("harness-error", String(error));
        write(config.ack_path, {command_id: seen, success: false, error: String(error)});
    }
}
function start() {
    config = read(configFile);
    if (!config) throw Error("private-config-unavailable");
    if (config.readback_method && config.readback_method !== "private-serialization" && config.readback_method !== "v8-boxtext")
        throw Error("unknown-readback-method");
    shared = new Global(config.global_name); shared.seq = 0; shared.step_id = "startup";
    try { openNext(); } catch (error) { fail(error); }
}
function loadbang() { timer = new Task(start, this); timer.schedule(10000); }
