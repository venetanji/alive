#!/usr/bin/env python3
"""Emit native test fixtures from the three actual saved example devices."""
import hashlib
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
spec = {
    "midiin": (10, ["channel"]), "poly_note": (60, ["voices"]),
    "saw_voice": (61, []), "filter_voice": (62, ["cutoff", "resonance"]),
    "adsr_voice": (63, ["attack", "decay", "sustain", "release"]),
    "multiply_voice": (64, []), "mix_voice": (65, []), "gain": (12, ["value"]),
    "join": (13, []), "dac": (14, []), "toggle": (3, ["value"]),
    "metro": (6, ["interval"]), "counter": (7, ["steps"]),
    "chord": (8, ["root", "shape"]), "makenote": (9, ["velocity", "duration"]),
    "audio_in": (66, []), "filter_stereo": (67, ["cutoff", "resonance"]),
    "line_signal": (47, ["value", "time"]), "signal_multiply": (41, ["rhs"]),
    "signal_dac": (49, []),
}
out = ["// Generated from saved examples by alive_session_v3_fixtures.py.\n"]
for index, name in enumerate(["subtractive", "utility", "stereo-lowpass"]):
    path = root / "examples" / f"{name}.ultra"
    data = path.read_bytes()
    patch = json.loads(data)
    out.append(f"// {name}.ultra sha256={hashlib.sha256(data).hexdigest()}\n")
    out.append(f"inline void saved_{index}(UltraCanvasGraph& g, AliveSessionDeviceV2& d) {{\n")
    out.append(f"g={{}};d={{}};g.node_count={len(patch['nodes'])};g.edge_count={len(patch['edges'])};\n")
    nodes = {n["id"]: n for n in patch["nodes"]}
    for slot, n in enumerate(patch["nodes"]):
        kind, params = spec[n["type"]]
        out.append(f"g.nodes[{slot}].id={n['id']};g.nodes[{slot}].kind={kind};\n")
        for p, key in enumerate(params):
            out.append(f"g.nodes[{slot}].p{p}={n['params'][key]!r};\n")
        if n["type"] == "signal_dac":
            out.append(f"std::strcpy(g.nodes[{slot}].text,{json.dumps(n['params']['channels'])});\n")
    for slot, edge in enumerate(patch["edges"]):
        out.append(f"g.edges[{slot}]={{{edge['from']},{edge['outlet']},{edge['to']},{edge['inlet']}}};\n")
    manifest = patch["device"]
    out.append(f"d.kind={1 if index == 0 else 2};d.output_channels=2;d.output_layout=2;\n")
    if index == 0:
        out.append(f"d.note_node={manifest['midi']['node']};\n")
    else:
        out.append(f"d.input_node={manifest['audio']['input']['node']};d.input_channels=2;d.input_layout=2;\n")
    out.append(f"d.parameter_count={len(manifest['parameters'])};\n")
    for p, binding in enumerate(manifest["parameters"]):
        n = nodes[binding["node"]]
        param = spec[n["type"]][1].index(binding["param"])
        value = n["params"][binding["param"]]
        out.append(f"d.parameters[{p}]={{{n['id']},{param},0,0,{value!r},{binding['min']!r},{binding['max']!r}}};\n")
    out.append("}\n")
Path(sys.argv[1]).write_text("".join(out))
