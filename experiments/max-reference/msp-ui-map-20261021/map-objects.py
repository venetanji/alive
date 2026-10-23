#!/usr/bin/env python3
"""Read licensed Max XML/help data into an original UI/MSP contract map.

No Max, Wine, Ultra, audio engine, helper JS or installed patch is executed.
Only interface metadata, saved structural facts and original analysis are emitted.
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


def fact(selector, claim):
    return {"selector": selector, "claim": claim,
            "evidence_type": "installed-documentation-not-runtime"}


def method(name, claim):
    return fact(f"./methodlist/method[@name='{name}']", claim)


def attribute(name, claim):
    return fact(f"./attributelist/attribute[@name='{name}']", claim)


def contract(name, ports, facts, bounded, oracles, **extra):
    signal = name.endswith("~")
    return {"class": name, "reference_stem": {"*~": "times~", "+~": "plus~"}.get(name, name),
            "family": "msp" if signal else "max",
            "json_maxclass": name if name in {"button", "toggle", "slider", "number", "flonum", "dial", "multislider", "kslider", "scope~", "meter~"} else "newobj",
            "ports": ports, "documented_facts": facts,
            "proposed_bounded_contract": bounded, "missing_oracles": oracles, **extra}


CONTRACTS = [
    contract("print", {"inlets": 1, "outlets": 0,
                        "input_roles": ["0: message to console"], "output_roles": []}, [
        fact("./objarglist/objarg[@name='identifier']", "Optional word or number labels console rows; omitted label is print."),
        method("anything", "Ordinary messages are displayed without treating their selector as a print command."),
        method("array", "Array values use an expanded single-row console representation."),
        method("dictionary", "Dictionary values use an expanded single-row console representation."),
        method("string", "String-object contents use a single-row console representation."),
        method("(mouse)", "Double-click raises the Max Console."),
        attribute("level", "Levels 0, 1, 2, 3 select print, warning, error and bug presentation; error level also reaches error objects."),
        attribute("time", "Enabled time prefix uses scheduler time."),
        attribute("bettersymquotes", "Optional quoting distinguishes numeric-looking symbols and quoted symbols.")],
        ["Retain the implemented native sink: one message inlet, no outlet, bounded ASCII label and numeric level 0..3.",
         "Keep ordinary accepted bang/int/float/symbol/list/anything as typed records with node identity, distinct from rendered text.",
         "Keep the implemented 128-record native queue, 512-row UI history, overflow count and Clear action as explicit Ultra bounds.",
         "Collection expansion, precision/quoting options, popup, time/deltatime prefixes, Max error-object routing and exact legacy formatting remain unsupported."],
        ["Capture no-label/word/numeric labels, all scalar tags, numeric-looking symbols, empty/list/anything and Unicode text.",
         "Capture precision 0/1/2, negative zero, exponent thresholds, quote escaping, level colors, time/deltatime units and scheduling order.",
         "No retained original print-console capture exists in this corpus; logger output is not print formatting."],
        ultra_kind="print", priority=1),
    contract("button", {"inlets": 1, "outlets": 1,
                         "input_roles": ["0: any message"], "output_roles": ["0: bang"]}, [
        method("anything", "Any inlet message flashes the button and emits bang."),
        method("(mouse)", "Click emits bang and flashes the button."),
        attribute("blinktime", "Flash duration is a separate millisecond setting; metadata default is 200."),
        attribute("blinkcolor", "Flash color follows the style color role unless explicitly overridden."),
        attribute("outlinecolor", "Outline color follows the style elementcolor role unless overridden.")],
        ["Keep the existing native bang kind as an explicit button alias.",
         "Retain a message-independent momentary appearance, blinktime and per-object RGBA overrides; execute clicks with audio off."],
        ["Capture clicks and all message forms with DSP off, repeated events during a flash, and exact blink timing under UI load.",
         "Historical fixtures cover bang/numeric triggering, not every named message or pixel appearance."],
        ultra_kind="bang", priority=1),
    contract("toggle", {"inlets": 1, "outlets": 1,
                         "input_roles": ["0: bang toggles; number sets"], "output_roles": ["0: integer value"]}, [
        method("bang", "Bang alternates the visible on/off state."),
        method("int", "Incoming integer is emitted unchanged; visible on state means nonzero."),
        method("float", "Floating input uses integer conversion."),
        method("set", "Set changes visible state without output."),
        method("outputvalue", "Recall emits current value without changing state."),
        attribute("checkedcolor", "On indicator uses the style color role."),
        attribute("uncheckedcolor", "Off indicator uses the style elementcolor role."),
        attribute("svg", "An optional SVG replaces the X and uses checkedcolor for black source shapes.")],
        ["Expand the boolean-only Ultra profile only with a migration policy: Max may emit 7 where Ultra emits 1.",
         "Store numeric output value separately from visible boolean state; implement silent set and recall after ordered reference capture.",
         "Keep SVG loading and parameter mapping explicitly outside the first native message subset."],
        ["Capture bang after nonbinary positive/negative values, fractional conversion, set followed by recall/bang, and saved initial state.",
         "Historical original trace establishes input 7 -> int 7, but not every state transition."],
        ultra_kind="toggle", priority=1),
    contract("slider", {"inlets": 1, "outlets": 1,
                         "input_roles": ["0: value, recall, silent set or range message"], "output_roles": ["0: int or float"]}, [
        method("bang", "Bang recalls the stored value through the output mapping."),
        method("int", "Numeric input updates the display and emits; multiplier and offset may transform output."),
        method("float", "Float method prose says integer conversion; floatoutput separately enables floating output."),
        method("set", "Set changes the display without emitting."),
        method("setminmax", "Low/high range message automatically enables floatoutput."),
        attribute("size", "Size is a float-valued range setting, default 128; minimum accepted size is 2 in integer mode and 1 in floating mode."),
        attribute("floatoutput", "Output mode defaults to integer (0)."),
        attribute("orientation", "Automatic orientation uses the longer dimension; explicit horizontal and vertical modes are available."),
        attribute("relative", "Mouse absolute/relative mode has a metadata/prose default conflict."),
        attribute("inputrangemode", "A switch for using the output range as input exists, but its description is a placeholder.")],
        ["Keep raw state, output transform and pointer range separate; do not enforce Ultra's integer size as a Max limit.",
         "First new profile should admit finite fractional size, explicit floatoutput, min and mult plus silent set and recall.",
         "Implement setminmax only after confirming normalized input domain and endpoint treatment for size=1 floating mode.",
         "Expose orientation, knobshape, thickness, drawoffcolor and explicit colors independently from runtime values."],
        ["Capture fractional size (1, 1.5, 2.5, 128.5), raw numeric input outside pointer range, negative mult and offset.",
         "Capture pointer endpoints separately for integer/float modes, size=1, setminmax integer versus float atoms and reversed/equal bounds.",
         "Capture inputrangemode 0/1 and initial absolute/relative mouse mode; current XML cannot establish transforms or default from prose alone."],
        ultra_kind="slider", priority=1,
        source_conflicts=["relative metadata default is 0, enum order Absolute/Relative; description calls Relative the default.",
                          "Float method's unconditional integer-conversion prose is incomplete beside floatoutput; do not extrapolate float-mode coercion."]),
    contract("number", {"inlets": 1, "outlets": 2,
                         "input_roles": ["0: value/message and settings"], "output_roles": ["0: stored value/message", "1: Tab bang"]}, [
        method("int", "Numeric conversion follows the format attribute."),
        method("float", "Integer formats convert floating input to integer; floating format retains floating output."),
        method("list", "Numeric formats retain the first list value; List/Text formats preserve complete lists."),
        method("anything", "Text format retains complete messages; numeric formats report a console error; List format ignores without that error."),
        method("set", "Set stores without output."),
        method("min", "A number sets the minimum; no argument removes it."),
        method("max", "A number sets the maximum; no argument removes it."),
        attribute("format", "Nine indexed formats include integer, alternate integer displays, floating, list and text; metadata default is integer decimal."),
        attribute("minimum", "Default lower bound is absent (<none>), not an arbitrary finite limit."),
        attribute("maximum", "Default upper bound is absent (<none>)."),
        fact("./outletlist/outlet[@id='1']", "Tab emits bang on the second outlet for focus chaining.")],
        ["Treat the current 2-in/1-out Ultra number as a legacy profile; Max number requires 1-in/2-out and default integer coercion.",
         "Start with explicit integer and float formats, optional bounds and Tab bang; finite -100000..100000 remains a declared Ultra admission bound.",
         "Keep decimal-place display, triangle and theming settings separate from numerical value and typed output.",
         "Reject List/Text formats until full-message storage and console diagnostics are implemented."],
        ["Capture Tab focus-chain ordering, bound removal, fractional bounds, min>max, format changes and number editing/commit rules.",
         "Historical 06-number captures default integer conversion and silent set, but not appearance, format variants or Tab."],
        ultra_kind="number", priority=1),
    contract("flonum", {"inlets": 1, "outlets": 2,
                         "input_roles": ["0: numeric value and settings"], "output_roles": ["0: float", "1: Tab bang"]}, [
        method("bang", "Bang emits the displayed numerical value."),
        method("int", "Integer input is stored and emitted as a floating-point UI value."),
        method("float", "Floating input is stored and emitted."),
        method("set", "Set updates without output."),
        method("min", "No-argument min removes the lower bound."),
        method("max", "No-argument max removes the upper bound."),
        attribute("numdecimalplaces", "Decimal-place setting controls displayed precision; metadata default is 0."),
        attribute("minimum", "Default lower bound is absent (<none>)."),
        attribute("maximum", "Default upper bound is absent (<none>)."),
        fact("./outletlist/outlet[@id='1']", "Tab emits bang on the second outlet.")],
        ["Retain existing one-in/two-out native subset and float tags; declare its finite numerical bounds and six-decimal initial display as Ultra choices.",
         "Separate absence of a bound from a finite bound in authoring metadata; preserve min/max removal semantics within the admitted finite profile.",
         "Expose Tab focus behavior and display-only decimal places without rounding native stored values."],
        ["Capture numdecimalplaces=0 rendering, keyboard commit/Tab, rounding versus stored value, fractional bounds and invalid bound ordering.",
         "Historical 07-flonum captures int/float inputs, bang and silent set; XML does not list a list method, so list behavior needs a fresh oracle."],
        ultra_kind="flonum", priority=1),
    contract("dial", {"inlets": 1, "outlets": 1,
                       "input_roles": ["0: value and settings"], "output_roles": ["0: int or float"]}, [
        method("bang", "Bang recalls the stored value."),
        method("int", "Input updates the dial and emits using multiplier before offset."),
        method("set", "Set updates without output."),
        method("setminmax", "Range message enables floatoutput when its range values are floating-point."),
        attribute("size", "Range is float-valued, default 128; integer mode minimum 2, floating mode minimum 1."),
        attribute("floatoutput", "Default output mode is integer (0)."),
        attribute("clip", "Mouse tracking clips to range by default."),
        attribute("vtracking", "Vertical tracking is default; circular tracking is separate."),
        attribute("mode", "Seven drawing modes are enumerated independently of value tracking.")],
        ["Add a separate dial UI class using a captured slider-like raw/output contract; retain float range and explicit output mode.",
         "Start with vertical tracking, clipping, one drawing mode and RGBA overrides; size is numerical range while resize controls pixels."],
        ["Capture floatoutput, raw versus output input, setminmax atom types, fractional range, endpoint/coercion and resize.",
         "Confirm inputrangemode and circular/vertical fine interaction before expanding pointer modes."],
        ultra_kind="dial", priority=2),
    contract("multislider", {"inlets": 1, "outlets": 2,
                              "input_roles": ["0: list, scalar or command"], "output_roles": ["0: whole list", "1: selected/statistic scalar"]}, [
        method("bang", "Bang emits the stored slider list."),
        method("int", "A scalar fills all slider positions and emits the list."),
        method("float", "Integer mode truncates floating values."),
        method("list", "Lists assign left-to-right; slider count follows list length when resizing is enabled."),
        method("set", "Set uses one-based slider index plus value without output."),
        method("setlist", "Setlist stores a whole list without output."),
        method("fetch", "Fetch emits a one-based selected value at the right outlet; indexes below 1 select the first."),
        attribute("listresize", "List-driven resizing metadata default is enabled."),
        attribute("settype", "Type enum is integer 0 / floating 1; metadata and prose disagree on its default."),
        attribute("setminmax", "Metadata range is -1..1; prose also gives integer-mode range 0..127."),
        attribute("size", "Documented slider count default is 1 and maximum 4096."),
        attribute("compatibility", "Compatibility mode can move maximum/minimum/sum scalar results to the left outlet.")],
        ["Start with explicit settype and setminmax, 1..8 sliders (Ultra bound), two typed outlets, bang/list/fill/set/setlist/fetch and explicit echo policy.",
         "Native state owns the list; pointer updates use the same admission path as inlet messages.",
         "Reject scrolling, normalize/quantiles, copy/paste, legacy compatibility and long-list resizing until independently measured."],
        ["Resolve no-argument default type/range with a saved fresh object and typed output capture.",
         "Capture listresize=0 short/long lists, echo=0, clipping, set/setlist count changes, out-of-range fetch and scalar outlet order.",
         "Capture contdata pointer output policies; copying a list-shaped UI is not proof of its message contract."],
        ultra_kind="multislider", priority=3,
        source_conflicts=["settype metadata default is 1 (Floating-point); description says integer default 0.",
                          "normalize description both says values are scaled irreversibly and says stored/displayed values are not updated; retain as unresolved."]),
    contract("kslider", {"inlets": 2, "outlets": 2,
                          "input_roles": ["0: pitch/commands", "1: cold velocity"], "output_roles": ["0: pitch", "1: velocity (emitted first)"]}, [
        method("int", "Pitch input emits current velocity first, then pitch; display highlights only the visible range."),
        method("in1", "Right-inlet integer sets velocity without output."),
        method("set", "Set changes displayed pitch without emitting."),
        method("clear", "Clear removes highlights without output."),
        method("chord", "Polyphonic chord replaces held notes with note-offs followed by new pitch/velocity pairs."),
        method("flush", "In polyphonic mode flush emits held-note offs and clears display."),
        attribute("mode", "Default mode is monophonic; polyphonic and touchscreen modes differ in note-off gestures."),
        attribute("inputmode", "Input modes distinguish unclipped, MIDI-clipped and visible-range-clipped input."),
        attribute("offset", "Offset metadata default is 36; description calls the offset an octave quantity, requiring unit verification."),
        attribute("range", "Displayed key-count metadata default is 48.")],
        ["Start with monophonic mode, MIDI pitch/velocity bounds, cold velocity inlet and right-before-left output; make inputmode explicit.",
         "Keep note and velocity separate messages; Ultra's makenote note-pair outlet is a different contract.",
         "Bound later polyphony to a declared fixed held-note set and flush on replacement; do not call monophonic support polyphonic parity."],
        ["Capture default velocity, offset units, invisible/out-of-MIDI pitches in each inputmode, bang after clear and set followed by bang.",
         "Capture two-output ordering, key-edge mapping, velocity from mouse position and mode-specific note-off behavior."],
        ultra_kind="kslider", priority=2,
        source_conflicts=["offset prose describes octaves while metadata gives 36; default unit is not inferred here."]),
    contract("sig~", {"inlets": 1, "outlets": "N (number of initial values)",
                       "input_roles": ["0: numbers/list; signal ignored except DSP ordering"], "output_roles": ["0..N-1: constant signals"]}, [
        fact("./objarglist/objarg[@name='initial-output-value']", "Each initial value creates one signal outlet."),
        method("list", "A list assigns values by outlet position."),
        method("set", "Set uses zero-based outlet index then value."),
        method("signal", "A connected signal does not change values but imposes DSP ordering.")],
        ["First profile: one finite explicit initial value, one message inlet and one mono signal outlet; sample-and-hold values change at a declared native event boundary.",
         "Reject extra initial values and signal order-forcing rather than ignoring them."],
        ["Capture no-argument initial value/outlet count, dynamic value update sample boundary, list lengths and indexed set errors.",
         "Historical DSP capture observes only sig~ 0.25 as one constant channel."],
        ultra_kind="sig", priority=2),
    contract("cycle~", {"inlets": 2, "outlets": 1,
                         "input_roles": ["0: signal/number frequency Hz", "1: signal/number phase"], "output_roles": ["0: waveform signal"]}, [
        fact("./objarglist/objarg[@name='frequency']", "Initial frequency is optional, but no numeric default is stated there."),
        fact("./objarglist/objarg[@name='buffer-name']", "Without a named buffer the documented oscillator uses an internal 16K 64-bit cosine wavetable."),
        method("signal", "Left signal controls frequency; right signal controls phase in cycles."),
        method("reset", "Reset sets phase using a 0..1 cycle value."),
        method("set", "Set selects the first 512 buffer samples; no name restores the internal table."),
        method("setall", "Setall selects the complete buffer as the table.")],
        ["First profile: native mono cosine oscillator, explicit Hz frequency and phase/reset; no external buffers.",
         "Establish signal-vs-message precedence, interpolation tolerance, phase convention and event sample offset before integration."],
        ["Capture no-argument frequency, phase inlet semantics, negative/zero/high frequency, signal frequency, reset timing and restart phase.",
         "Historical capture covers fresh 1 kHz cosine and multiplication at 48 kHz; it does not prove general oscillator parity."],
        ultra_kind="cycle", priority=2),
    contract("phasor~", {"inlets": 2, "outlets": 1,
                          "input_roles": ["0: signal/number frequency or time", "1: number phase; signal reset trigger"], "output_roles": ["0: 0..1 ramp signal"]}, [
        method("int", "Left number sets Hz unless a frequency signal is connected; right number jumps phase."),
        method("signal", "Right nonzero signal triggers reset to phaseoffset; it is not a continuous phase-offset input."),
        method("reset", "Reset jumps to configured phaseoffset."),
        attribute("phaseoffset", "Configured offset controls DSP-start and reset phase; an unset offset preserves startup behavior."),
        attribute("syncupdate", "Enabled syncupdate defers message frequency changes until cycle wrap; bang can force application."),
        attribute("lock", "Transport lock is a separate notevalue-dependent clock contract.")],
        ["First profile: explicit finite Hz, one mono ramp outlet, numeric phase reset and explicit phaseoffset.",
         "Keep syncupdate, jitter, transport/notevalues and signal reset triggering unsupported until scored."],
        ["Capture first sample and endpoint wrap, negative Hz, zero Hz, phase outside 0..1 and event offsets.",
         "No original phasor~ runtime oracle is retained in this corpus."],
        ultra_kind="phasor", priority=3),
    contract("line~", {"inlets": 2, "outlets": "2 normally; 3 with @activeout 1",
                        "input_roles": ["0: target/ramp command", "1: duration ms"],
                        "output_roles": ["0: ramp signal", "1: completion bang normally; activity signal when enabled", "2: completion bang only when activity output enabled"]}, [
        fact("./objarglist/objarg[@name='initial-value']", "Initial signal value defaults to 0."),
        method("int", "Right duration is consumed by the next scalar target; another target without a new duration jumps immediately."),
        method("list", "Target/time pairs queue compound ramps; new target/list replaces pending ramps; documented list capacity is 128 pairs."),
        method("stop", "Stop freezes the current value and clears pending segments."),
        method("pause", "Pause holds output while retaining target and pending segments."),
        method("resume", "Resume continues paused segments."),
        attribute("activeout", "Creation-time-only activeout adds an activity signal outlet."),
        attribute("maxpoints", "Creation-time point capacity defaults to 129, per prose."),
        fact("./outletlist/outlet[@id='1']", "Outlet type metadata says signal while its description names a completion bang; saved help resolves ordinary ports as signal/bang.")],
        ["Add a distinct sample-rate native ramp; the existing control line kind is not line~.",
         "First profile: explicit initial value, milliseconds, at most four target/time pairs (eight atoms), consumed right time, replacement, stop/pause/resume and completion bang.",
         "Specify message-to-sample placement and completion scheduling; reject activeout/maxpoints overrides until graph arity supports them."],
        ["Capture target timing at sample/vector boundaries, first/last ramp sample, fractional/zero/negative times, immediate replacement and completion ordering.",
         "Historical capture covers one 10 ms 0-to-1 ramp at 48 kHz; completion, pause and compound ramps are unmeasured."],
        ultra_kind="line_signal", priority=2,
        source_conflicts=["XML outlet 1 type is signal while description names bang; normal help saves [signal,bang], activeout help saves [signal,signal,bang]."]),
    contract("*~", {"inlets": 2, "outlets": 1,
                     "input_roles": ["0: signal/number factor", "1: signal/number factor"], "output_roles": ["0: product signal"]}, [
        fact("./objarglist/objarg[@name='initial-multiplier']", "Unconnected right multiplier defaults to 0; a right signal supersedes the argument."),
        method("float", "Numbers provide a constant on an inlet without a signal; both signal-connected inlets ignore numeric messages."),
        method("signal", "Signals at each inlet are summed before multiplication.")],
        ["Add a native mono multiply distinct from control multiply and raw-127 gain~.",
         "Start with one signal edge per inlet plus finite fallback constants, right default 0; explicitly reject Max's multi-edge summing until supported."],
        ["Capture both/no/one signal-connected cases, constants in either inlet, graph rewiring and event offsets.",
         "Historical 18-dsp validates only a specific cosine-times-envelope path."],
        ultra_kind="multiply_signal", priority=2),
    contract("+~", {"inlets": 2, "outlets": 1,
                     "input_roles": ["0: signal/number addend", "1: signal/number addend"], "output_roles": ["0: sum signal"]}, [
        fact("./objarglist/objarg[@name='initial-offset']", "Unconnected right offset defaults to 0; a right signal supersedes the argument."),
        method("float", "Numbers provide a constant on an inlet without a signal; both signal-connected inlets ignore numeric messages."),
        method("signal", "Signals at each inlet are summed before adding the two inlet values.")],
        ["Add a native mono add distinct from message add.",
         "Start with one signal edge per inlet and finite fallback constants, right default 0; declare no implicit multi-edge summing."],
        ["Capture both/no/one signal-connected cases, constants in either inlet, graph rewiring and event offsets.",
         "No original +~ runtime oracle is retained in this corpus."],
        ultra_kind="add_signal", priority=2),
    contract("snapshot~", {"inlets": 2, "outlets": 1,
                            "input_roles": ["0: signal, bang or reporting gate", "1: reporting interval ms"], "output_roles": ["0: float sample"]}, [
        fact("./objarglist/objarg[@name='reporting-interval']", "Default reporting interval is 0, so output requires bang."),
        method("bang", "Reports a sample in the most recent vector at offset; SIAI/high-priority bang can instead use the scheduler's current sample offset."),
        method("int", "Left zero/nonzero stops/starts automatic output; right sets interval, with zero stopping it."),
        attribute("offset", "Sample index is constrained to the active signal vector."),
        method("sampleinterval", "A separate samples-based interval interface exists.")],
        ["First profile: native latest-vector snapshot with explicit offset and bang, one float output, no browser sampling clock.",
         "Define audio-off value and graph lifecycle, then add periodic millisecond reporting using the native scheduler.",
         "Keep sampleinterval, SIAI and transport-relative scheduling unsupported until measured."],
        ["Capture audio off/on/stopped behavior, vector offset clamping, bang during DSP, interval updates and same-deadline output.",
         "No original snapshot~ runtime oracle is retained in this corpus; XML misleadingly labels its interval inlet signal."],
        ultra_kind="snapshot", priority=3,
        source_conflicts=["Inlet 1 XML type is signal but numeric-method prose and its description identify a reporting-interval control."]),
    contract("scope~", {"inlets": 2, "outlets": 0,
                         "input_roles": ["0: X signal; integer samples/display element", "1: Y signal; integer display buffer size"], "output_roles": []}, [
        method("signal", "Two connected signal inlets select X/Y plotting; one connected inlet gives a time-domain trace."),
        method("int", "Left integer configures samples per display value (documented 2..8092, default 256); right configures buffer size."),
        method("(mouse)", "Holding a click freezes the display."),
        attribute("bufsize", "Display-buffer metadata default is 128."),
        attribute("range", "Vertical display range metadata default is -1..1."),
        attribute("trigger", "Trigger modes are free-running 0, upward crossing 1 and downward crossing 2.")],
        ["First profile: one-channel native bounded display ring, explicit range, fixed decimation and UI snapshots of native data.",
         "Keep X/Y, triggers, multichannel, exact peak-picking and hold behavior separately gated; never connect redraw rate to DSP evolution."],
        ["Capture peak/min representative selection, ring wrap, trigger inclusivity, display delay, click hold and resize/color behavior.",
         "No original scope~ runtime oracle is retained; equal-looking waveforms do not prove its decimation algorithm."],
        ultra_kind="scope", priority=3),
    contract("meter~", {"inlets": 1, "outlets": 1,
                         "input_roles": ["0: signal or numeric peak value"], "output_roles": ["0: float peak each interval"]}, [
        method("signal", "Display and output track incoming peak amplitude, including independent multichannel meters."),
        method("float", "Numeric input behaves like a supplied peak; values above 1 light overload."),
        attribute("interval", "Refresh/output interval is 10..2000 ms, default 50 ms."),
        attribute("dbperled", "Default LED step is 3 dB."),
        attribute("numleds", "Documented LED count is 10..20; metadata default is 12."),
        attribute("orientation", "Automatic orientation follows rectangle dimensions.")],
        ["First profile: mono absolute-peak accumulation on the native audio thread, explicit 50 ms report interval and float outlet.",
         "Use bounded UI observation snapshots and separate styling; do not mistake RMS or a browser animation for Max peak metering.",
         "Keep multichannel, exact LED thresholds/decay and audio-off numeric behavior gated by captures."],
        ["Capture negative input, peak reset windows, overload hold/clear, dB boundaries, interval alignment and silent DSP/off states.",
         "No original meter~ runtime oracle is retained; static saved ports prove only interface shape."],
        ultra_kind="meter", priority=3),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def identity(path, root):
    return {"path": path.relative_to(root).as_posix(), "sha256": digest(path), "bytes": path.stat().st_size}


def xml_metadata(path, resources, entry):
    root = ET.parse(path).getroot()
    if root.get("name") != entry["class"]:
        raise ValueError(f"Wrong object reference: {path}")
    selectors = [row["selector"] for row in entry["documented_facts"]]
    for selector in selectors:
        if not root.findall(selector):
            raise ValueError(f"Missing cited selector: {path}: {selector}")
    attrs = []
    metadata_keys = {"default", "legacydefault", "dynamiccolor_default", "stylemap", "obsolete", "invisible"}
    for item in root.findall("./attributelist/*"):
        metadata = {child.get("name"): child.get("value") for child in item.findall("./attributelist/attribute")
                    if child.get("name") in metadata_keys and child.get("value") is not None}
        attrs.append({"element_kind": item.tag, **dict(item.attrib), "metadata_lexemes": metadata,
                      "enum_names_in_order": [enum.get("name") for enum in item.findall(".//enum")],
                      "default_status": "documented-metadata" if "default" in metadata else "not-stated-as-literal-default"})
    if entry["class"] == "print":
        levels = next(item["enum_names_in_order"] for item in attrs if item["name"] == "level")
        if levels != ["Print", "Warn", "Error", "Bug"]:
            raise ValueError("Print level enum changed; review numeric severity mappings")
    return {**identity(path, resources), "root_identity": dict(root.attrib),
            "status": "static-reference-inspected",
            "arguments": [dict(item.attrib) for item in root.findall("./objarglist/objarg")],
            "methods": [{**dict(item.attrib), "arguments": [dict(arg.attrib) for arg in item.findall("./arglist/arg")]}
                        for item in root.findall("./methodlist/method")],
            "attributes": attrs,
            "port_templates": {kind: [dict(item.attrib) for item in root.findall(f"./{kind}list/{kind}")]
                               for kind in ("inlet", "outlet")},
            "validated_selectors": selectors,
            "limits": ["Names/types/default lexemes are interface facts, not executed behavior.",
                       "INLET_TYPE, OUTLET_TYPE, OBJARG_NAME and related placeholders are not concrete contracts.",
                       "dynamiccolor_default and stylemap are theme/style links; legacydefault is not a current measured pixel color."]}


def token(box):
    words = box.get("text", "").split()
    return words[0] if box.get("maxclass") == "newobj" and words else box.get("maxclass")


def help_metadata(path, resources, entry):
    root = json.loads(path.read_text(encoding="utf-8-sig"))["patcher"]
    counts, targets, dependencies, anchors = Counter(), [], set(), []
    patchers = patchlines = 0
    saved_fields = {"size", "min", "mult", "floatoutput", "inputrangemode", "minimum", "maximum", "format",
                    "numdecimalplaces", "orientation", "relative", "settype", "setminmax", "mode", "offset", "range"}

    def walk(patcher, ancestry, in_basic=False):
        nonlocal patchers, patchlines
        patchers += 1
        patchlines += len(patcher.get("lines", []))
        namespace = patcher.get("classnamespace", "box")
        for dependency in patcher.get("dependency_cache", []):
            dependencies.add(dependency["name"].replace("\\", "/").rsplit("/", 1)[-1])
        boxes = {item["box"]["id"]: item["box"] for item in patcher.get("boxes", [])}
        for box in boxes.values():
            kind = token(box)
            counts[(namespace, kind)] += 1
            box_path = ancestry + [box["id"]]
            if kind == entry["class"] and namespace == "box":
                row = {"box_path": box_path, "maxclass": box["maxclass"], "in_basic_tab": in_basic,
                       "numinlets": box.get("numinlets"), "numoutlets": box.get("numoutlets"),
                       "outlettype": box.get("outlettype"),
                       "selected_saved_settings": {k: box[k] for k in sorted(saved_fields) if k in box}}
                targets.append(row)
                edges = []
                for item in patcher.get("lines", []):
                    line = item["patchline"]
                    if box["id"] in {line["source"][0], line["destination"][0]}:
                        edges.append({"source": line["source"], "destination": line["destination"],
                                      "source_token": token(boxes[line["source"][0]]),
                                      "destination_token": token(boxes[line["destination"][0]]), "order": line.get("order")})
                anchors.append({"box_path": box_path, "in_basic_tab": in_basic, "incident_edges": edges})
            if isinstance(box.get("patcher"), dict):
                walk(box["patcher"], box_path, in_basic or box.get("text", "").strip() == "p basic")

    walk(root, [])
    if not targets:
        raise ValueError(f"No saved target object found in {path}")
    for row in targets:
        for key in ("inlets", "outlets"):
            expected = entry["ports"][key]
            actual = row["num" + key]
            if isinstance(expected, int) and actual != expected:
                raise ValueError(f"Saved help port mismatch: {entry['class']} {row['box_path']} {key}")
    anchor = next((row for row in anchors if row["in_basic_tab"]), anchors[0])
    return {**identity(path, resources), "status": "static-json-inspected-not-run",
            "patchers": patchers, "boxes": sum(counts.values()), "patchlines": patchlines,
            "object_tokens": [{"namespace": ns, "token": name, "count": count}
                              for (ns, name), count in sorted(counts.items())],
            "saved_target_instances": targets, "selected_help_anchor": anchor,
            "declared_dependency_names": sorted(dependencies),
            "limits": ["Saved settings are examples, not default-value measurements.",
                       "An empty saved outlettype means unspecified, not absence of output.",
                       "Dependency names and direct edges are inventories; helpers/transitive loads are not resolved or executed.",
                       "No installed message/comment/helper source, patch body or asset is exported."]}


def historical_evidence():
    records = []
    cases = [
        ("06-number", ["number"], "Default integer box output, float truncation and silent set; no Tab/appearance/format coverage."),
        ("07-flonum", ["flonum"], "Floating numeric output and silent set; no bound/Tab/appearance coverage."),
        ("12-ui-message", ["button", "toggle"], "Button triggering and toggle values including int 7; no console formatting coverage."),
        ("18-dsp", ["sig~", "cycle~", "line~", "*~"], "One fresh 48 kHz, 64-frame-vector, NonRealTime render: 1 kHz cosine, 0-to-1 10 ms ramp, product and constant 0.25.")]
    for fixture, objects, claim in cases:
        paths = [f"fixtures/{fixture}.maxpat", f"fixtures/{fixture}.score.json", f"results/{fixture}.jsonl",
                 f"expected/{fixture}.json", f"manifests/{fixture}.manifest.json"]
        if fixture == "18-dsp":
            paths += ["dsp/analysis.json", "dsp/max-samples.jsonl", "dsp/max-reference.wav"]
        records.append({"id": fixture, "objects": objects, "status": "retained-historical-original-Max-capture-not-rerun",
                        "bounded_observation": claim, "sources": [identity(REFERENCE / p, REFERENCE) for p in paths]})
    for name in ("ui-events", "dsp-query"):
        path = REFERENCE / "help-coverage-20261021/results" / f"{name}.jsonl"
        records.append({"id": name, "objects": ["button", "toggle", "slider"],
                        "status": "retained-historical-physical-UI-capture-not-rerun",
                        "bounded_observation": "Locked UI controls emitted messages; follow-up read-only DSP query reports off. No range/float transform or pixel conformance was scored.",
                        "sources": [identity(path, REFERENCE)]})
    return records


def ultra_snapshot():
    model = REPO / "apps/ultra/ui/canvas-model.mjs"
    text = model.read_text()
    names = re.findall(r"^  (\w+): spec\(", text, re.MULTILINE)
    if not names or len(names) != len(set(names)):
        raise ValueError("Could not read unambiguous Ultra kind registry")
    return {"status": "read-only-source-snapshot-not-behavior-tested", "registered_kinds": names,
            "mapped_presence": [{"max_class": row["class"], "candidate_ultra_kind": row["ultra_kind"],
                                 "present": row["ultra_kind"] in names} for row in CONTRACTS],
            "sources": [identity(REPO / p, REPO) for p in ["apps/ultra/ui/canvas-model.mjs", "apps/ultra/ui/canvas-catalog.mjs",
                        "apps/ultra/ui/canvas-appearance.mjs", "apps/ultra/src-tauri/native/patch_graph.hpp"]],
            "observed_source_boundary": [
                "Existing classes from this batch: print, button via bang alias, toggle, number, flonum, slider. Presence is not conformance.",
                "Current print is a native one-in/zero-out sink with ASCII label and level only; collection expansion, popup, precision/quoting and time/deltatime options remain unsupported.",
                "Current print uses a 128-record native queue, 512-row UI history, dropped-record reporting and Clear action. These are Ultra bounds, not Max limits.",
                "Current number is 2-in/1-out generic scalar UI; default Max number is 1-in/2-out integer UI.",
                "Current toggle admits 0/1 and emits boolean state; Max integer pass-through includes values such as 7.",
                "Current slider size schema is integer 1..100000 and pointer adapter uses 0..size-1; Max size is float-valued and float-mode endpoints need an oracle.",
                "Current native slider setminmax enables float mode but configures size=2; normalized size=1 behavior is not established by that implementation.",
                "Current flonum defaults to finite bounds and six display decimal places; Max metadata has absent bounds and decimal-place value 0.",
                "The message executor and recurring control clocks can run with audio off in the present source; the older help-coverage gap report predates that work.",
                "The audio graph admits only voice -> gain -> join -> dac edges, one source per audio inlet. It cannot host the arbitrary mono graph proposed here.",
                "Existing voice~ and raw-127 gain~ do not establish cycle~, line~, *~ or +~ support.",
                "Appearance fields permit explicit RGBA and selected UI attributes; full Max styles, theme inheritance and parameter mapping are not implemented by their names alone."],
            "print_current_subset": {
                "status": "implemented-bounded-native-subset-source-inspected-not-tested-by-this-map",
                "kind": 25, "inlets": 1, "outlets": 0,
                "settings": {"label": {"default": "print", "bound": "one ASCII token, 1..31 bytes; no quotes/substitution/separators"},
                             "level": {"default": 0, "minimum": 0, "maximum": 3,
                                       "max_reference_enum": {"0": "Print", "1": "Warn", "2": "Error", "3": "Bug"}}},
                "native_queue_records": 128, "ui_history_rows": 512,
                "unsupported_max_options": ["array/dictionary/string collection expansion", "bettersymquotes", "floatprecision",
                                            "deltatime", "time", "popup", "error-object routing", "exact Max console formatting"],
                "source_anchors": ["REGISTRY.print", "definitions.print", "case Print", "CanvasRuntime::print", "clearConsole"]}}


def build(resources):
    snapshot = ultra_snapshot()
    objects = []
    for entry in CONTRACTS:
        family, stem = entry["family"], entry["reference_stem"]
        xml = resources / f"docs/refpages/{family}-ref/{stem}.maxref.xml"
        help_path = resources / f"help/{family}/{stem}.maxhelp"
        objects.append({**entry, "namespace": "box",
                        "native_status": "current-bounded-subset-source-inspected" if entry["ultra_kind"] in snapshot["registered_kinds"] else "absent-from-current-registry",
                        "official_reference": f"https://docs.cycling74.com/reference/{stem}/",
                        "reference": xml_metadata(xml, resources, entry),
                        "installed_help": help_metadata(help_path, resources, entry)})
    return {"schema_version": 1, "batch_id": HERE.name, "object_count": len(objects),
            "provenance": "STATIC_INSTALLED_XML_AND_HELP_WITH_SEPARATE_HISTORICAL_ORIGINAL_CAPTURE_LINKS",
            "max_version": "9.1.5 Windows x64 (existing environment record)",
            "runtime_execution_performed": False,
            "source_root_policy": "Caller supplies legitimately accessible Max resources; installed paths are relative to that root.",
            "contract_status": "Original paraphrases and proposed Ultra bounds; no new implementation or parity claim.",
            "ultra_source_snapshot": snapshot,
            "historical_evidence": historical_evidence(),
            "shared_requirements": [
                "Keep message scheduling native and available with audio off; signal evolution requires the audio engine.",
                "Preserve scalar int/float and symbol/list/anything identity, inlet/outlet identity and right-before-left output ordering where documented.",
                "Represent semantic settings separately from visual settings and use one native event path for UI and connected messages.",
                "Preserve unrecognized authoring fields for round trips while rejecting unsupported execution attributes with diagnostics.",
                "Absent attributes inherit theme/style roles; never replace current theme defaults with legacydefault RGBA constants.",
                "Use bounded native console/visualization queues and latest-state snapshots; browser redraws must not drive DSP or message time.",
                "Require original finite Max scores, typed output/console captures and DSP sample tolerances before labeling a bounded contract compared-pass.",
                "Static help inventory, parser admission, native execution, message parity, DSP parity and appearance parity are separate outcomes."],
            "implementation_order": [
                {"priority": 1, "objects": ["print", "button", "toggle", "slider", "number", "flonum"],
                 "reason": "Make message inspection and existing UI profile boundaries explicit before expanding graph families."},
                {"priority": 2, "objects": ["dial", "kslider", "sig~", "cycle~", "line~", "*~", "+~"],
                 "reason": "New UI classes and minimal mono signal graph need native graph/arity and event-boundary design."},
                {"priority": 3, "objects": ["multislider", "phasor~", "snapshot~", "scope~", "meter~"],
                 "reason": "Typed arrays, phase/reset clocks and bounded signal-to-UI observations require new oracles and lifecycle contracts."}],
            "redistribution": {"installed_patch_bodies_copied": False, "installed_reference_prose_copied": False,
                               "published_content": "Interface signatures/names/default lexemes, hashes, counts, selected saved settings/ports/edge endpoints and original analysis."},
            "objects": objects}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--resources", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=HERE / "object-map.json")
    parser.add_argument("--check", action="store_true", help="Require byte-identical regeneration from the installed/current sources")
    args = parser.parse_args()
    payload = build(args.resources.resolve())
    rendered = json.dumps(payload, indent=2, ensure_ascii=True) + "\n"
    if args.check:
        if args.output.read_text() != rendered:
            raise SystemExit("Mapping differs: inspect changed source evidence, then regenerate the snapshot.")
    else:
        args.output.write_text(rendered)
    print(json.dumps({"status": "verified-identical" if args.check else "generated", "objects": len(payload["objects"]),
                      "installed_xml_files": len(payload["objects"]), "installed_help_files": len(payload["objects"]),
                      "validated_selectors": sum(len(row["reference"]["validated_selectors"]) for row in payload["objects"]),
                      "saved_target_instances": sum(len(row["installed_help"]["saved_target_instances"]) for row in payload["objects"]),
                      "selected_help_anchors": len(payload["objects"]), "runtime_execution_performed": False,
                      "output": str(args.output)}))


if __name__ == "__main__":
    main()
