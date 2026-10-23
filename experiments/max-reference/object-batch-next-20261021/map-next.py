#!/usr/bin/env python3
"""Map ten installed control references to original, bounded implementation notes.

Reads XML and help JSON as data. No Max/Ultra launch, helper execution, native
build, imported patch admission, or runtime comparison occurs here.
"""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET


HERE = Path(__file__).resolve().parent
REFERENCE = HERE.parent
REPO = REFERENCE.parent.parent
BATCH = ["metro", "counter", "delay", "pipe", "change", "gate", "switch",
         "split", "clip", "scale"]

# All behavioral descriptions and proposed scopes below are original notes.
CONTRACTS = {
    "metro": {
        "priority": 2,
        "arguments": "Optional interval; documented positional default 5 ms. Milliseconds or notevalue positionally; other units use @interval.",
        "ports": {"inlets": 2, "outlets": 1,
                  "input_roles": ["0: bang/nonzero start; zero/stop stop.",
                                  "1: set future interval; current interval finishes first."],
                  "output_roles": ["0: bang ticks."]},
        "messages": ["bang starts the metronome; int/float zero stops and nonzero starts.",
                     "Right-inlet time updates apply after the next tick.",
                     "clock selects a named setclock; no name restores internal time."],
        "scheduling": "Recurring clock. defer selects low-priority output. Transport, quantize and autostart have additional timing semantics.",
        "bounded_native_scope": ["Extend the existing native millisecond clock, with explicit start/stop and deterministic deadline ordering.",
                                 "Keep the existing 20..2000 ms Ultra profile unless a new configuration explicitly selects a wider tested range.",
                                 "Choose an explicit document migration/profile for Max bang-start behavior; existing Ultra bang emits one tick.",
                                 "Support interval updates without retiming the currently pending tick; cancel on graph replacement/Stop."],
        "edge_cases_and_unknowns": ["Exact first-tick time, retrigger while active, and zero/negative interval normalization need new Max scores.",
                                    "Do not claim transport, notevalues, quantization, setclock, defer queues or autostart from a millisecond-only implementation."],
        "source_conflicts": [],
        "required_methods": ["bang", "int", "float", "list", "anything", "clock", "stop"],
        "evidence_selectors": ["./objarglist/objarg[@name='interval']", "./methodlist/method[@name='int']",
                               "./methodlist/method[@name='bang']", "./attributelist/attribute[@name='defer']"],
        "help_anchor": ["obj-2", "obj-20"],
        "help_use_case": "Basic tab connects a toggle to start/stop a 500 ms metronome, a number to its interval input, and its bang output to a button.",
        "acceptance_cases": ["Start, update interval halfway through a wait, stop, then advance beyond all pending deadlines.",
                             "Probe bang on a stopped and running instance separately; preserve old Ultra behavior during migration."]
    },
    "counter": {
        "priority": 3,
        "arguments": "0 args: up, min 0, max 2147483647. 1 arg: maximum. 2 args: minimum/maximum. 3 args: direction/minimum/maximum; directions 0 up, 1 down, 2 updown.",
        "ports": {"inlets": 5, "outlets": 4,
                  "input_roles": ["0: advance or command.", "1: direction.",
                                  "2: value for next clock.", "3: immediate value/output.", "4: maximum; bang jumps to maximum/output."],
                  "output_roles": ["0: count.", "1: minimum/underflow flag.",
                                   "2: maximum/carry flag.", "3: carry count."]},
        "messages": ["Left int acts like bang; floats convert to integers.",
                     "set/goto set the next output silently; jam emits immediately only within current bounds.",
                     "inc/dec emit while overriding ordinary direction; up/down/updown select direction.",
                     "min changes minimum, count and output; max changes maximum; setmin changes minimum silently.",
                     "carrybang/carryint, flags, carryflag and compatmode affect carry/reset behavior; state reports to the console."],
        "scheduling": "Immediate message state machine. Four-outlet ordering, initial count and wrap/bounce transitions need a retained ordered oracle.",
        "bounded_native_scope": ["Treat as expansion/migration of an existing Ultra object, whose argument is a step count and whose ports are 2 in/1 out.",
                                 "Start with explicit direction/min/max in the existing finite numeric range, all five inlets, four typed outlets and silent versus immediate reset.",
                                 "Version saved counter configuration; counter 8 currently means 0..7 in Ultra, but Max's one argument is inclusive maximum 8.",
                                 "Keep integer flags as a declared first mode; reject unsupported compatibility/flag modes explicitly."],
        "edge_cases_and_unknowns": ["Reset below minimum may lower minimum; reset above maximum can set minimum equal to maximum while preserving the hidden maximum request.",
                                    "Maximum below minimum is constrained effectively while the requested maximum remains stored.",
                                    "Negative/reversed bounds appear in help; one-step ranges, bounce endpoint duplication, carry timing/order and overflow require runtime capture.",
                                    "Default Max maximum exceeds Ultra's -100000..100000 numeric profile."],
        "source_conflicts": [],
        "required_methods": ["bang", "int", "float", "carrybang", "carryint", "dec", "down", "flags", "goto", "inc", "jam", "max", "min", "next", "set", "setmin", "state", "up", "updown"],
        "evidence_selectors": ["./objarglist/objarg[@name='options']", "./methodlist/method[@name='int']",
                               "./methodlist/method[@name='set']", "./methodlist/method[@name='flags']"],
        "help_anchor": ["obj-2", "obj-3"],
        "help_use_case": "Basic tab uses a 1..4 upward counter with a button, inc/dec messages and separate count, minimum flag, maximum flag and carry-count displays.",
        "acceptance_cases": ["Capture all four outlets for up/down/updown, first trigger, wrap, bounce and single-value ranges.",
                             "Compare next-clock reset, immediate reset, jam, min, setmin and maximum changes, including out-of-range resets."]
    },
    "delay": {
        "priority": 2,
        "arguments": "Initial delay accepts milliseconds or a notevalue; prose explicitly allows no argument and says 5 ms despite the argument's optional=0 metadata.",
        "ports": {"inlets": 2, "outlets": 1,
                  "input_roles": ["0: bang schedules; number changes time and schedules; stop cancels.",
                                  "1: stores the time for future triggers without retiming a pending bang."],
                  "output_roles": ["0: delayed bang."]},
        "messages": ["bang starts a delayed bang; left int/float stores a new time then triggers.",
                     "Right-inlet numeric/list/anything time configuration changes future delay.",
                     "stop cancels pending output; clock selects/restores clock source."],
        "scheduling": "Cancellable one-shot clock. Pending-trigger replacement/restart is not established by the retained stop-then-restart score.",
        "bounded_native_scope": ["Implement finite nonnegative milliseconds with one pending deadline per object and explicit retrigger policy after a new Max oracle.",
                                 "Preserve right-inlet update isolation; reuse the audio-independent native clock and graph-generation cancellation.",
                                 "Require an explicit time argument until the documented no-argument default conflict is resolved."],
        "edge_cases_and_unknowns": ["Two triggers before expiry, zero/negative times and same-deadline cancellation need runtime cases.",
                                    "Tempo-relative delays require a running transport; quantize, transport and setclock remain outside the initial scope."],
        "source_conflicts": ["Argument prose says no-argument initial delay is 5 ms; delaytime metadata default is 0 ms; the argument row has optional=0."],
        "required_methods": ["bang", "int", "float", "list", "anything", "clock", "stop"],
        "evidence_selectors": ["./objarglist/objarg[@name='time']", "./methodlist/method[@name='int']",
                               "./methodlist/method[@name='stop']", "./attributelist/attribute[@name='delaytime']"],
        "help_anchor": ["obj-2", "obj-1"],
        "help_use_case": "Basic tab connects a trigger button and stop message to delay 500, a dial/number chain to its time input, and its output to a button/print chain.",
        "acceptance_cases": ["Schedule, change the cold time, verify original pending deadline, then trigger with the new time.",
                             "Capture retrigger-before-expiry separately from stop-then-restart; verify no output after destruction or graph replacement."]
    },
    "pipe": {
        "priority": 3,
        "arguments": "Last argument is delay. Preceding atoms establish stored fields/types and data port count. No args: one initial 0 field, 0 ms. One arg changes delay only.",
        "ports": {"inlets": "N data fields + 1 delay input; N defaults to 1", "outlets": "N data fields; N defaults to 1",
                  "input_roles": ["0: updates fields and queues a delayed output; bang queues stored values again.",
                                  "1..N-1: store field values without scheduling; lists update successive fields.",
                                  "N: delay/time configuration."],
                  "output_roles": ["0..N-1: corresponding delayed values."]},
        "messages": ["int/float update values; non-float-initialized data fields convert floats to integers.",
                     "List distributes values; anything is documented via list behavior, while symbols are also named by the overview.",
                     "clear/stop halt queued output. flush emits retained values immediately in reverse arrival order for each outlet, then clears pending output."],
        "scheduling": "Multiple pending snapshots; a bang adds another event without replacing older events. Normal due-time tie order and multi-outlet delivery order remain unmeasured.",
        "bounded_native_scope": ["Use 1..8 typed stored fields, N+1 inputs, N outputs and a fixed queue of 64 pending snapshots as an explicit proposed Ultra capacity.",
                                 "Copy every scheduled payload into the queue; later cold-field edits must not mutate already pending messages.",
                                 "Signal queue overflow explicitly without allocation or silent eviction; preserve existing queued records.",
                                 "Implement clear, stop and reverse-arrival flush, with generation cancellation and bounded dispatch; verify stored values after clear/flush separately."],
        "edge_cases_and_unknowns": ["Help includes a 12-field instance, beyond the proposed eight-field Ultra subset.",
                                    "List wording does not settle every intermediate-snapshot detail; capture hot and cold list update cases before implementation.",
                                    "Simple pipe does not establish arbitrary-length anything-message preservation; advanced help uses surrounding helper objects.",
                                    "Flush cross-outlet order, delay changes on pending items, equal deadlines, symbols, queue capacity and zero/negative time need runtime capture.",
                                    "Transport/notevalues, quantize and named clock are deferred."],
        "source_conflicts": [],
        "required_methods": ["bang", "int", "float", "list", "anything", "clear", "flush", "stop"],
        "evidence_selectors": ["./objarglist/objarg[@name='initialization']", "./methodlist/method[@name='bang']",
                               "./methodlist/method[@name='list']", "./methodlist/method[@name='flush']"],
        "help_anchor": ["obj-3", "obj-5"],
        "help_use_case": "Basic tab demonstrates two stored integer fields, separate hot/cold inputs, a delay input, and two output displays. A second branch exposes stop and flush.",
        "acceptance_cases": ["Queue 10, 20 and 30 at long delay; flush should distinguish reverse arrival from ordinary deadline output.",
                             "Change cold fields between triggers and inspect every outlet; test clear/stop without assuming stored fields are erased.",
                             "Fill the proposed bounded queue and verify explicit overflow status, cancellation and recovery."]
    },
    "change": {
        "priority": 1,
        "arguments": "Optional initial comparison number, default 0. Mode can be + or -; help also contains change + and change - without a numeric first argument.",
        "ports": {"inlets": 1, "outlets": 3,
                  "input_roles": ["0: numeric comparison, mode or silent set."],
                  "output_roles": ["0: changed value, or directional 1/-1.",
                                   "1: integer 1 on zero-to-nonzero transition.",
                                   "2: integer 1 on nonzero-to-zero transition."]},
        "messages": ["int/float compare to stored value and replace it; repeated numeric value is suppressed.",
                     "mode + outputs 1 for increases; mode - outputs -1 for decreases; bare mode restores ordinary changed-value output.",
                     "set replaces comparison state without output."],
        "scheduling": "Immediate stateful filter; multi-outlet order and transition outlet behavior in directional modes need a runtime oracle.",
        "bounded_native_scope": ["Store a typed finite scalar, implement exact value comparison plus silent set and mode selection.",
                                 "Expose all three typed control outlets; preserve input scalar type where later runtime evidence requires it.",
                                 "Use saved initial number and declared mode, resetting on graph replacement consistently with other scalar objects."],
        "edge_cases_and_unknowns": ["Numeric equality across int/float selectors, negative zero and mode transitions need scores.",
                                    "A suppressed value still replaces comparison state; verify this for directional filters.",
                                    "No bang/list/anything method is documented; do not invent bang recall or list-head acceptance."],
        "source_conflicts": ["Argument table places mode second, while shipped help instantiates change + and change - as single arguments."],
        "required_methods": ["int", "float", "mode", "set"],
        "evidence_selectors": ["./objarglist/objarg[@name='initial-value']", "./objarglist/objarg[@name='mode']",
                               "./methodlist/method[@name='mode']", "./methodlist/method[@name='set']"],
        "help_anchor": ["obj-2", "obj-5"],
        "help_use_case": "Basic tab feeds change 0 with a number, displays changed values, routes logical transitions to separate print objects, and sends set 100 silently.",
        "acceptance_cases": ["Send 0, 0, 2, 2, -3, 0; retain exact outlet order and selector types.",
                             "Send set 100, 100, 99; then exercise +, -, bare mode and single-symbol creation forms."]
    },
    "gate": {
        "priority": 1,
        "arguments": "Optional number of outlets, default 1; optional initial open outlet, default 0 (closed). Selection numbering is 1..N.",
        "ports": {"inlets": 2, "outlets": "N; default 1",
                  "input_roles": ["0: selection/report/next.", "1: arbitrary message to pass when open."],
                  "output_roles": ["0..N-1: unchanged data for selected outlet; outlet 0 also reports selection on control bang."]},
        "messages": ["Left int sets selection silently; float converts to int.",
                     "Left bang outputs the current open-outlet number, including 0 if closed.",
                     "next selects the next outlet, wrapping closed/rightmost to outlet 1.",
                     "Messages at the right data inlet pass unchanged only when an outlet is open."],
        "scheduling": "Immediate selector; no queued or stored data replay is implied by changing the selected outlet.",
        "bounded_native_scope": ["Support 1..8 outlets, fixed two inputs and an explicit initial selection.",
                                 "Forward the complete typed CanvasMessage without number conversion; control and data bang have distinct roles.",
                                 "Keep selector changes silent; implement next and control-bang report synchronously."],
        "edge_cases_and_unknowns": ["Out-of-range/negative selectors, zero/negative outlet-count arguments and invalid initial selection need Max probes.",
                                    "Do not choose clamp, close or wrap for invalid selectors from the next-message wrap rule."],
        "source_conflicts": [],
        "required_methods": ["bang", "int", "float", "next"],
        "evidence_selectors": ["./objarglist/objarg[@name='outlets']", "./objarglist/objarg[@name='initial-state']",
                               "./methodlist/method[@name='bang']", "./methodlist/method[@name='next']"],
        "help_anchor": ["obj-2", "obj-14"],
        "help_use_case": "Basic tab directs a metronome/counter stream through one of three gate outputs selected by a radiogroup/number chain.",
        "acceptance_cases": ["Select 0, 1, 3 and next; send distinct bang/int/float/symbol/list/anything data at inlet 1.",
                             "Bang the left inlet while closed/open and verify integer report on outlet 0 without replaying prior data."]
    },
    "switch": {
        "priority": 1,
        "arguments": "Optional number N of data inputs, default 2; one additional control input. Initial open input defaults to 0 (closed), numbered 1..N.",
        "ports": {"inlets": "N+1; default 3", "outlets": 1,
                  "input_roles": ["0: selection/report/next.", "1..N: arbitrary messages, only selected input passes."],
                  "output_roles": ["0: unchanged selected message or integer selection report."]},
        "messages": ["Left int sets open input; zero closes all data inputs; float converts to int.",
                     "Left bang reports selected input or 0; next cycles to the next data input, wrapping to 1.",
                     "A message arriving at an unselected data input produces no forwarded message."],
        "scheduling": "Immediate message selector. Selection changes do not imply replay of previously discarded inputs.",
        "bounded_native_scope": ["Support 1..8 data inputs plus one control input and one output.",
                                 "Forward complete typed messages; selection updates remain silent; implement next and integer report.",
                                 "Use dynamic saved ports and inlet help so authoring distinguishes selector input from data inputs."],
        "edge_cases_and_unknowns": ["Negative/out-of-range selectors, invalid initial state and invalid N require capture.",
                                    "Bang at data input is data; bang at input 0 is an integer state query."],
        "source_conflicts": [],
        "required_methods": ["bang", "int", "float", "next"],
        "evidence_selectors": ["./objarglist/objarg[@name='inlets']", "./objarglist/objarg[@name='initial']",
                               "./methodlist/method[@name='bang']", "./methodlist/method[@name='next']"],
        "help_anchor": ["obj-2", "obj-26"],
        "help_use_case": "Basic tab chooses one of four message/slider sources through switch 4; a menu controls selection and the chosen message updates a message box through its cold input.",
        "acceptance_cases": ["Interleave distinct typed data on all inputs, select each input, then close and cycle with next.",
                             "Verify selection changes emit nothing and control-bang reports without forwarding stored data."]
    },
    "split": {
        "priority": 1,
        "arguments": "Minimum and maximum, both marked required. Numeric output type follows the first/lower-bound argument; undocumented missing-argument defaults remain unknown.",
        "ports": {"inlets": 3, "outlets": 2,
                  "input_roles": ["0: numeric value to route.", "1: lower bound and numeric mode.", "2: upper bound."],
                  "output_roles": ["0: value within bounds.", "1: value outside bounds."]},
        "messages": ["int/float in the hot input routes one numeric value to one output.",
                     "Cold lower/upper inputs update bounds; integer lower-bound configuration selects integer conversion.",
                     "Creation prose specifies float output when the first argument is float, regardless of input selector."],
        "scheduling": "Immediate numeric comparison/route; no timers or storage recall are documented.",
        "bounded_native_scope": ["Require explicit finite lower/upper creation arguments and all three inputs/two outputs.",
                                 "Retain numeric tags for the lower-bound type; compare/emit using the verified conversion order.",
                                 "Keep bound changes cold and route exactly once per accepted numeric message."],
        "edge_cases_and_unknowns": ["Exact endpoint inclusion, conversion before versus after comparison and fractional boundaries need oracle cases.",
                                    "Reversed/equal bounds, missing arguments and float-to-integer rounding need capture.",
                                    "Method prose repeats an integer-lower-bound condition in both int/float entries; capture type changes in the cold lower input.",
                                    "No bang/list/set method is documented."],
        "source_conflicts": [],
        "required_methods": ["int", "float"],
        "evidence_selectors": ["./objarglist/objarg[@name='minimum']", "./objarglist/objarg[@name='maximum']",
                               "./methodlist/method[@name='int']", "./methodlist/method[@name='float']"],
        "help_anchor": ["obj-2", "obj-21"],
        "help_use_case": "Basic tab sends integer and floating input through split 1 10, provides separate numeric lower/upper controls, and displays in-range/out-of-range values independently.",
        "acceptance_cases": ["Capture just below, equal to and just above both bounds with int and float lower-bound configurations.",
                             "Change lower bound type and probe fractional values that cross an endpoint only after conversion."]
    },
    "clip": {
        "priority": 1,
        "arguments": "Optional min/max; no arguments mean both 0, one argument supplies both bounds. mode metadata defaults to 0.",
        "ports": {"inlets": 3, "outlets": 1,
                  "input_roles": ["0: numeric/list input or set lower upper.", "1: lower bound.", "2: upper bound."],
                  "output_roles": ["0: constrained numeric value or numeric list."]},
        "messages": ["Scalar output type follows incoming int versus float, independently of bound argument types.",
                     "List input clips every numeric element and emits a list.",
                     "set lower upper updates both bounds; cold inputs update individual bounds.",
                     "mode 0 clamps; nonzero mode emits zero for out-of-range values."],
        "scheduling": "Immediate transform; bound-update silence and list atom conversion still require a Max trace.",
        "bounded_native_scope": ["Implement three control inputs with finite bounds, scalar tag preservation and lists of up to eight numeric atoms.",
                                 "Implement set and explicit mode 0/1 configuration with silent bound storage.",
                                 "Use a separate clip object rather than globally clamping all routed control data."],
        "edge_cases_and_unknowns": ["Integer input with fractional clipped bounds needs exact conversion/rounding capture.",
                                    "Reversed/equal bounds, endpoint inclusion, mixed numeric list tags and nonnumeric list atoms need scores.",
                                    "No bang recall is documented; mode normalization beyond 0/1 is not part of the proposed subset."],
        "source_conflicts": [],
        "required_methods": ["int", "float", "list", "set"],
        "evidence_selectors": ["./objarglist/objarg[@name='minimum']", "./methodlist/method[@name='int']",
                               "./methodlist/method[@name='float']", "./attributelist/attribute[@name='mode']"],
        "help_anchor": ["obj-2", "obj-8"],
        "help_use_case": "Basic tab combines slider/int/float/list inputs for clip 10 50, independent floating lower/upper inputs, set 0 29 and a print outlet.",
        "acceptance_cases": ["Probe no/one/two creation bounds, endpoints, out-of-range values and fractional bounds with int/float inputs.",
                             "Compare clamp and zero-outside mode on scalar and mixed numeric lists; verify silent bound updates."]
    },
    "scale": {
        "priority": 3,
        "arguments": "Four optional input-low/input-high/output-low/output-high numbers and optional exponent. Missing-argument numeric defaults are not stated in this reference; require all four ranges initially.",
        "ports": {"inlets": 6, "outlets": 1,
                  "input_roles": ["0: scalar/list to map; bang recomputes prior input.", "1: input low.",
                                  "2: input high.", "3: output low.", "4: output high.", "5: exponent/curve."],
                  "output_roles": ["0: mapped scalar/list, including extrapolation beyond expected input range."]},
        "messages": ["bang reapplies the latest input using current range configuration.",
                     "Lists map each numeric item. Input is not clipped to expected range.",
                     "Integer argument ranges truncate rather than round; float input can be converted to int when input range is integer.",
                     "Modern mode uses a signed power of normalized input; classic 1 retains legacy scaling; classic 2 also reverses exponent orientation when output bounds invert."],
        "scheduling": "Immediate numeric transform with stored previous input; no clock.",
        "bounded_native_scope": ["Start with explicit four floating ranges and linear exponent 1; support six inputs, one output, bang recall and numeric lists up to eight atoms.",
                                 "Implement non-clipped extrapolation and reversed output ranges; reject a zero input span explicitly in the first Ultra profile.",
                                 "Add integer/mixed-range coercion and classic 0/2 curves only after reference scores; do not infer modern default mode from an absent default metadata entry.",
                                 "Keep legacy classic 1, historical inverted exponent behavior and nonfinite results explicitly unsupported until measured."],
        "edge_cases_and_unknowns": ["Default ranges/exponent/classic mode, zero input span and nonpositive exponents need capture.",
                                    "The int and float method prose leaves mixed-range input conversion interactions ambiguous.",
                                    "The classic attribute prose names scale~ even though this is the scale reference; confirm modes on the message object.",
                                    "Negative normalized input with fractional exponent, inverted input/output ranges, overflow and bang after a list need oracle cases."],
        "source_conflicts": ["classic metadata has no default entry; do not label its default 0 from convention.",
                             "Attribute description refers to scale~ in the scale XML."],
        "required_methods": ["bang", "int", "float", "list"],
        "evidence_selectors": ["./description", "./objarglist/objarg[@name='exponential']",
                               "./methodlist/method[@name='float']", "./attributelist/attribute[@name='classic']"],
        "help_anchor": ["obj-2", "obj-14"],
        "help_use_case": "Basic tab contrasts integer 0..127 to 0..500 scaling with floating 0..1 to 0..5 scaling; another branch exposes all four range-setting inputs.",
        "acceptance_cases": ["Capture integer, float and mixed ranges with fractions, endpoints and values beyond both ends.",
                             "Exercise reversed ranges, signed modern power with fractional exponent, classic 0/1/2 and cold changes followed by bang."]
    }
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source(path, root):
    return {"path": path.relative_to(root).as_posix(), "sha256": digest(path),
            "bytes": path.stat().st_size}


def xml_metadata(path, resources, contract):
    root = ET.parse(path).getroot()
    methods = [{"name": method.get("name"),
                "arguments": [dict(arg.attrib) for arg in method.findall("./arglist/arg")]}
               for method in root.findall("./methodlist/method")]
    if sorted(x["name"] for x in methods) != sorted(contract["required_methods"]):
        raise ValueError(f"Method vocabulary changed for {path.stem}")
    selectors = contract["evidence_selectors"]
    if not all(root.findall(selector) for selector in selectors):
        raise ValueError(f"A cited XML selector no longer resolves in {path}")
    attributes = []
    for attr in root.findall("./attributelist/attribute"):
        defaults = [entry.get("value") for entry in attr.findall(
            "./attributelist/attribute[@name='default']")]
        attributes.append({**dict(attr.attrib), "default_lexemes": defaults,
                           "default_status": "documented-metadata" if defaults else "not-stated"})
    return {**source(path, resources), "status": "documentation-inspected-not-executed",
            "arguments": [dict(arg.attrib) for arg in root.findall("./objarglist/objarg")],
            "port_templates": {
                "inlets": [dict(port.attrib) for port in root.findall("./inletlist/inlet")],
                "outlets": [dict(port.attrib) for port in root.findall("./outletlist/outlet")]},
            "template_caution": "INLET_TYPE/OUTLET_TYPE and TEXT_HERE markers are placeholders, not measured type contracts.",
            "methods": methods, "attributes": attributes, "cited_xml_selectors": selectors}


def token(box):
    words = box.get("text", "").split()
    return words[0] if box.get("maxclass") == "newobj" and words else box.get("maxclass")


def help_metadata(path, resources, name, contract):
    patch = json.loads(path.read_text(encoding="utf-8-sig"))["patcher"]
    counts, dependencies = Counter(), set()
    saved_ports, basic_tabs, anchors = [], [], []
    patcher_count = line_count = 0

    def walk(patcher, ancestry):
        nonlocal patcher_count, line_count
        patcher_count += 1
        line_count += len(patcher.get("lines", []))
        namespace = patcher.get("classnamespace", "box")
        for dependency in patcher.get("dependency_cache", []):
            dependencies.add(dependency["name"].replace("\\", "/").rsplit("/", 1)[-1])
        boxes = {entry["box"]["id"]: entry["box"] for entry in patcher.get("boxes", [])}
        for box in boxes.values():
            box_path = ancestry + [box["id"]]
            kind = token(box)
            counts[(namespace, kind)] += 1
            if kind == name:
                row = {"box_path": box_path, "numinlets": box.get("numinlets"),
                       "numoutlets": box.get("numoutlets"), "outlettype": box.get("outlettype")}
                saved_ports.append(row)
                if box_path == contract["help_anchor"]:
                    edges = []
                    for entry in patcher.get("lines", []):
                        edge = entry["patchline"]
                        if box["id"] not in {edge["source"][0], edge["destination"][0]}:
                            continue
                        edges.append({"source": edge["source"], "destination": edge["destination"],
                                      "source_token": token(boxes[edge["source"][0]]),
                                      "destination_token": token(boxes[edge["destination"][0]]),
                                      "order": edge.get("order")})
                    anchors.append({**row, "parent_box_path": ancestry, "direct_incident_edges": edges,
                                    "interpretation": contract["help_use_case"]})
            if isinstance(box.get("patcher"), dict):
                child = box["patcher"]
                if box.get("text", "").strip() == "p basic":
                    basic_tabs.append({"box_path": box_path,
                                       "direct_tokens": sorted({token(entry["box"]) for entry in child.get("boxes", [])})})
                walk(child, box_path)

    walk(patch, [])
    if len(anchors) != 1:
        raise ValueError(f"Expected one help evidence anchor for {name}")
    if not basic_tabs:
        raise ValueError(f"Missing basic tab for {name}")
    expected_in, expected_out = contract["ports"]["inlets"], contract["ports"]["outlets"]
    for sample in saved_ports:
        if isinstance(expected_in, int) and sample["numinlets"] != expected_in:
            raise ValueError(f"Saved inlet count contradicts fixed contract for {name}")
        if isinstance(expected_out, int) and sample["numoutlets"] != expected_out:
            raise ValueError(f"Saved outlet count contradicts fixed contract for {name}")
    return {**source(path, resources), "status": "static-json-inspected-not-imported-or-executed",
            "patchers": patcher_count, "boxes": sum(counts.values()), "patchlines": line_count,
            "tokens": [{"namespace": ns, "token": kind, "count": count}
                       for (ns, kind), count in sorted(counts.items())],
            "basic_tabs": basic_tabs, "saved_target_ports": saved_ports,
            "use_case_evidence": anchors, "declared_dependency_names": sorted(dependencies),
            "limits": ["Saved ports do not prove message behavior.",
                       "Only static dependency_cache names are inventoried; helpers/transitive loads are not resolved or executed.",
                       "No copied patch body, message text, comment, helper source, appearance data or bundled media is published."]}


def runtime_evidence(name):
    if name not in {"metro", "delay", "pipe"}:
        return {"status": "no-retained-original-max-oracle-in-this-corpus", "max_executed_by_this_map": False}
    files = [REFERENCE / "fixtures/14-scheduler.maxpat",
             REFERENCE / "fixtures/14-scheduler.score.json",
             REFERENCE / "results/14-scheduler.jsonl",
             REFERENCE / "expected/14-scheduler.json",
             REFERENCE / "manifests/14-scheduler.manifest.json"]
    manifest = json.loads(files[-1].read_text())
    expected = json.loads(files[-2].read_text())
    events = [event for event in expected["events"] if event["label"] == name]
    scope = {
        "metro": "Start and stop metro 10 at collector arrival; six bangs in this one run are not an exact tick-count/timing contract.",
        "delay": "delay 20: bang, stop after 5 ms, bang again; one delayed bang observed. No overlapping-trigger replacement test.",
        "pipe": "pipe 20: queue 1 and 2, clear after 5 ms, queue 3; only integer 3 observed. No flush/typed-fields test."
    }[name]
    if not manifest["max_executed"]:
        raise ValueError("Referenced historical capture is not marked Max-executed")
    return {"status": "existing-bounded-original-max-score-only", "max_executed_by_this_map": False,
            "historical_max_executed": manifest["max_executed"], "fixture": "14-scheduler",
            "expected_status": expected["status"], "scope": scope,
            "observed_event_count_for_label": len(events),
            "files": [{**source(path, REFERENCE), "path": "../" + path.relative_to(REFERENCE).as_posix()} for path in files],
            "limitations": ["JS collector arrival does not measure logical scheduler time or causality.",
                            "No retained console error channel; no output alone cannot prove successful acceptance.",
                            "These original patches are not installed help execution or Ultra comparison."]}


def ultra_snapshot():
    model = REPO / "apps/ultra/ui/canvas-model.mjs"
    names = re.findall(r"^  (\w+): spec\(", model.read_text(), re.MULTILINE)
    if not {"metro", "counter"}.issubset(names):
        raise ValueError("Current Ultra baseline no longer contains metro/counter")
    if any(name in names for name in set(BATCH) - {"metro", "counter"}):
        raise ValueError("A researched object entered the Ultra registry; update the existence boundary")
    return {"status": "read-only-source-snapshot-not-runtime-executed", "registered_kind_count": len(names),
            "already_present_from_this_batch": ["metro", "counter"],
            "absent_from_registry": [name for name in BATCH if name not in names],
            "sources": [source(REPO / relative, REPO) for relative in [
                "apps/ultra/ui/canvas-model.mjs", "apps/ultra/ui/canvas-catalog.mjs",
                "apps/ultra/src-tauri/native/patch_graph.hpp"]],
            "source_anchors": {"metro": ["REGISTRY.metro", "definitions.metro", "case Metro"],
                               "counter": ["REGISTRY.counter", "definitions.counter", "case Counter"]},
            "metro_current_subset": "2 in/1 out; interval default 150 ms, range 20..2000 ms; bang emits once; nonzero arms, zero stops; native sample clock also advances with audio off.",
            "counter_current_subset": "2 in/1 out; steps default 8, range 1..32; bang outputs index then increments modulo steps; second input silently resets the index."}


def build(resources):
    objects = []
    for name in BATCH:
        contract = CONTRACTS[name]
        objects.append({"class": name, "json_maxclass": "newobj", "namespace": "box",
                        "official_reference": f"https://docs.cycling74.com/reference/{name}/",
                        "native_status": "existing-ultra-subset-migration-required" if name in {"metro", "counter"} else "research-only-not-in-current-ultra-registry",
                        "contract_status": "original-paraphrase-and-proposal-based-on-installed-documentation",
                        "contract": contract,
                        "reference": xml_metadata(resources / "docs/refpages/max-ref" / f"{name}.maxref.xml", resources, contract),
                        "installed_help": help_metadata(resources / "help/max" / f"{name}.maxhelp", resources, name, contract),
                        "max_runtime_evidence": runtime_evidence(name)})
    return {"schema_version": 1, "batch_id": "object-batch-next-20261021", "object_count": len(objects),
            "scope": "Ten control-object research contracts. Eight absent Ultra kinds plus two existing subsets needing compatibility work.",
            "source_environment": {"max_version": "9.1.5 Windows x64", "historical_environment": "../docs/environment.json",
                                   "resource_root_policy": "Caller supplies local licensed Max resources; output paths are relative to that root."},
            "provenance": "STATIC_REFERENCE_AND_HELP_MAPPING_WITH_SEPARATE_HISTORICAL_CAPTURE_LINKS",
            "runtime_execution_performed": False, "ultra_source_snapshot": ultra_snapshot(),
            "implementation_order": [
                {"priority": 1, "objects": ["change", "clip", "gate", "switch", "split"],
                 "reason": "Reuse typed synchronous dispatch with small per-object state; obtain original Max scores for coercion and extra-outlet order first."},
                {"priority": 2, "objects": ["delay", "metro"],
                 "reason": "Reuse existing native clock after pinning trigger/deadline semantics; metro requires existing-document migration."},
                {"priority": 3, "objects": ["scale", "counter", "pipe"],
                 "reason": "Numeric mode ambiguity, complex counter state/migration and typed queued snapshots need more reference coverage."}],
            "shared_acceptance_requirements": [
                "Create original finite Max scores and retain typed outlet traces plus console diagnostics; help source inspection is not runtime parity.",
                "Preserve bang/int/float/symbol/list/anything identity, inlet/outlet identity and depth-first synchronous downstream completion.",
                "Use finite scalar bounds and at most eight atoms as explicit Ultra profile limits, not Max limits.",
                "Keep timers native and operational with audio off; cancel on object/graph lifecycle changes and bound dispatch/queue growth.",
                "Declare unsupported options and invalid configurations explicitly; do not infer defaults or silently reinterpret existing patches.",
                "Separate whole-help admission, original runnable examples, native tests and comparisons against observed Max traces."],
            "redistribution": {"contains_installed_patch_bodies": False, "contains_reference_prose": False,
                               "published_data": "File identity, interface signatures/names/default lexemes, counts, saved port facts, selected graph endpoints and original analysis only."},
            "objects": objects}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--resources", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=HERE / "object-map.json")
    parser.add_argument("--check", action="store_true", help="Regenerate in memory and compare with retained output")
    args = parser.parse_args()
    payload = build(args.resources.resolve())
    rendered = json.dumps(payload, indent=2, ensure_ascii=True) + "\n"
    if args.check:
        if args.output.read_text() != rendered:
            raise SystemExit("Mapping differs from installed/current source evidence; regenerate and review the changed facts.")
    else:
        args.output.write_text(rendered)
    print(json.dumps({"status": "verified-identical" if args.check else "generated",
                      "objects": len(payload["objects"]), "installed_xml_files": 10, "installed_help_files": 10,
                      "existing_ultra_subsets": 2, "research_only_kinds": 8,
                      "validated_help_anchors": 10, "validated_xml_selectors": sum(len(row["reference"]["cited_xml_selectors"]) for row in payload["objects"]),
                      "runtime_execution_performed": False, "output": str(args.output)}))


if __name__ == "__main__":
    main()
