#!/usr/bin/env python3
"""Build a source-bound control-object research map without launching Max/Ultra.

Read licensed local XML/help as data. A Node subprocess checks Ultra's existing
authoring vocabulary only; it does not start a desktop or native/audio runtime.
Only facts, hashes, interface signatures and original notes are retained.
"""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET


HERE = Path(__file__).resolve().parent
REFERENCE = HERE.parent
REPO = REFERENCE.parent.parent
CONTRACTS = HERE / "contracts.json"
XML_SUFFIX = ".maxref.xml"
EXPECTED_CLASSES = {
    "iter", "spray", "buddy", "funnel", "join", "prepend", "append", "expr", "regexp",
    "zl.group", "zl.iter", "zl.reg", "zl.join", "zl.len", "zl.nth", "zl.slice",
    "zl.rev", "zl.rot", "zl.sort", "zl.queue", "zl.stream",
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_fact(path, root):
    return {"path": path.relative_to(root).as_posix(),
            "sha256": digest(path.read_bytes()), "bytes": path.stat().st_size}


def node_fact(node):
    text = " ".join(" ".join(node.itertext()).split())
    return {"signature": dict(node.attrib),
            "element_sha256": digest(ET.tostring(node, encoding="utf-8")),
            "contains_template_text": any(x in text for x in
                                          ["TEXT_HERE", "OBJARG_NAME", "OBJARG_TYPE"])}


def xml_fact(path, resources):
    root = ET.parse(path).getroot()
    attributes = []
    for attr in root.findall("./attributelist/attribute"):
        defaults = [item.get("value") for item in attr.findall(
            "./attributelist/attribute[@name='default']")]
        attributes.append({**node_fact(attr), "default_lexemes": defaults,
                           "default_metadata_status": "present" if defaults else "not-stated"})
    return {**file_fact(path, resources), "status": "static-interface-inspected",
            "arguments": [node_fact(node) for node in root.findall("./objarglist/objarg")],
            "methods": [{**node_fact(node),
                         "arguments": [dict(arg.attrib) for arg in node.findall("./arglist/arg")]}
                        for node in root.findall("./methodlist/method")],
            "attributes": attributes,
            "inlet_rows": [node_fact(node) for node in root.findall("./inletlist/inlet")],
            "outlet_rows": [node_fact(node) for node in root.findall("./outletlist/outlet")],
            "caution": "XML rows may contain inactive ports or literal type/argument/prose templates. These are not measured behavior or defaults."}


def token(box):
    words = box.get("text", "").split()
    return words[0] if box.get("maxclass") == "newobj" and words else box.get("maxclass")


def is_target(box, name):
    words = box.get("text", "").split()
    if box.get("maxclass") != "newobj":
        return False
    return words[:1] == [name] or (name.startswith("zl.") and
                                    words[:2] == ["zl", name.split(".", 1)[1]])


def help_fact(path, resources, name, anchor=None):
    if not path.exists():
        if anchor is not None:
            raise ValueError(f"Missing help for selected class {name}")
        return {"path": path.relative_to(resources).as_posix(), "status": "not-found-at-standard-path"}
    document = json.loads(path.read_text(encoding="utf-8-sig"))["patcher"]
    tokens, dependencies = Counter(), set()
    targets, anchors, basic_paths = [], [], []

    def walk(patcher, ancestry):
        boxes = {entry["box"]["id"]: entry["box"] for entry in patcher.get("boxes", [])}
        for dependency in patcher.get("dependency_cache", []):
            dependencies.add(dependency["name"].replace("\\", "/").rsplit("/", 1)[-1])
        for box in boxes.values():
            box_path = ancestry + [box["id"]]
            tokens[(patcher.get("classnamespace", "box"), token(box))] += 1
            if is_target(box, name):
                row = {"box_path": box_path, "saved_spelling": token(box),
                       "numinlets": box.get("numinlets"), "numoutlets": box.get("numoutlets"),
                       "outlettype": box.get("outlettype")}
                targets.append(row)
                if box_path == anchor:
                    incident = []
                    for line in patcher.get("lines", []):
                        edge = line["patchline"]
                        if box["id"] in {edge["source"][0], edge["destination"][0]}:
                            incident.append({"source": edge["source"],
                                             "destination": edge["destination"],
                                             "source_token": token(boxes[edge["source"][0]]),
                                             "destination_token": token(boxes[edge["destination"][0]]),
                                             "order": edge.get("order")})
                    anchors.append({**row, "direct_incident_edges": incident})
            if isinstance(box.get("patcher"), dict):
                if box.get("text", "").strip() == "p basic":
                    basic_paths.append(box_path)
                walk(box["patcher"], box_path)

    walk(document, [])
    if anchor is not None and len(anchors) != 1:
        raise ValueError(f"Expected exactly one selected target anchor for {name}: {anchor}")
    if not targets:
        raise ValueError(f"No {name} target instance found in {path.name}")
    return {**file_fact(path, resources), "status": "static-json-inspected-not-imported-or-executed",
            "target_instances": targets, "selected_anchor": anchors[0] if anchors else None,
            "basic_tab_paths": basic_paths,
            "tokens": [{"namespace": ns, "token": tok, "count": count}
                       for (ns, tok), count in sorted(tokens.items())],
            "declared_dependency_names": sorted(dependencies),
            "limits": "Saved interface/topology facts only; no message text, creation arguments, patch body, helper source, styling or media is retained."}


def cite(resources, name, citations):
    records = []
    for source_name, selector in citations:
        actual_name = name if source_name == "self" else source_name
        path = resources / "docs/refpages/max-ref" / (actual_name + XML_SUFFIX)
        nodes = ET.parse(path).getroot().findall(selector)
        if not nodes:
            raise ValueError(f"Unresolved evidence selector {actual_name}: {selector}")
        records.append({"source": path.relative_to(resources).as_posix(), "selector": selector,
                        "matching_elements": [node_fact(node) for node in nodes]})
    return records


def ultra_snapshot(names):
    script = """
import {REGISTRY} from './apps/ultra/ui/canvas-model.mjs';
import {OBJECTS,parseObjectText} from './apps/ultra/ui/canvas-catalog.mjs';
const names=JSON.parse(process.argv[1]);
const probes=Object.fromEntries(names.map(name=>{
  try{return [name,{accepted:true,result:parseObjectText(name)}];}
  catch(error){return [name,{accepted:false,error:error.message}];}
}));
const kinds=Object.fromEntries(Object.entries(REGISTRY).map(([key,value])=>[key,{
  authoring_name:OBJECTS[key].name,aliases:OBJECTS[key].aliases,
  input_types:value.inlets.map(port=>port.type),
  output_types:value.outlets.map(port=>port.type)
}]));
console.log(JSON.stringify({registered_kind_count:Object.keys(kinds).length,kinds,probes}));
"""
    result = subprocess.run(["node", "--input-type=module", "-e", script,
                             json.dumps(sorted(names | {"zl", "join~"}))],
                            cwd=REPO, text=True, capture_output=True, check=True)
    snapshot = json.loads(result.stdout)
    # Detect newly implemented vocabulary instead of silently keeping a stale unsupported label.
    for name in names | {"zl"}:
        probe = snapshot["probes"][name]
        if probe["accepted"] or "Unknown object" not in probe.get("error", ""):
            raise ValueError(f"Ultra authoring vocabulary changed for {name}; review the proposed contract")
    audio_join = snapshot["probes"]["join~"]
    if not audio_join["accepted"] or audio_join["result"]["type"] != "join":
        raise ValueError("Ultra join~ naming baseline changed; review the message/audio collision")
    snapshot.update({
        "status": "source-and-production-authoring-probe-only-no-native-runtime-execution",
        "sources": [file_fact(REPO / p, REPO) for p in [
            "apps/ultra/ui/canvas-model.mjs", "apps/ultra/ui/canvas-catalog.mjs",
            "apps/ultra/src-tauri/native/patch_graph.hpp"]],
        "join_collision": "Registry key join belongs to audio join~ (mono+mono to stereo); message join is unknown to authoring and needs a distinct native kind.",
        "limits": "Parser refusal establishes current name admission only. It does not execute a target object, native graph, desktop, imported help or audio engine."})
    return snapshot


def build(resources):
    contracts = json.loads(CONTRACTS.read_text())
    if set(contracts["objects"]) != EXPECTED_CLASSES:
        raise ValueError("The reviewed 21-class contract scope changed")
    previous_names = set()
    previous_maps = []
    for directory in ["object-batch-20261021", "object-batch-next-20261021"]:
        path = REFERENCE / directory / "object-map.json"
        data = json.loads(path.read_text())
        previous_names.update(row["class"] for row in data["objects"])
        previous_maps.append(file_fact(path, REFERENCE))
    if overlap := previous_names & EXPECTED_CLASSES:
        raise ValueError(f"New semantic map duplicates previous class maps: {sorted(overlap)}")

    objects = []
    xml_dir = resources / "docs/refpages/max-ref"
    help_dir = resources / "help/max"
    for name, contract in contracts["objects"].items():
        xml = xml_fact(xml_dir / (name + XML_SUFFIX), resources)
        help_data = help_fact(help_dir / (name + ".maxhelp"), resources, name,
                              contract["help_anchor"])
        for row in help_data["target_instances"]:
            for count_key in ["inlets", "outlets"]:
                expected = contract["ports"][count_key]
                if isinstance(expected, int) and row["num" + count_key] != expected:
                    raise ValueError(f"Saved {count_key} contradicts fixed contract for {name}")
        objects.append({"class": name,
                        "official_reference": f"https://docs.cycling74.com/reference/{name}/",
                        "native_status": "research-only-no-admitted-message-kind",
                        "contract_status": "original-paraphrase-and-explicit-proposed-subset",
                        "contract": contract, "reference": xml, "installed_help": help_data,
                        "evidence": cite(resources, name, contract["citations"]),
                        "runtime_evidence": {"status": "not-executed-or-compared-by-this-map",
                                             "retained_oracle_claim": "none; existing corpus not exhaustively searched for incidental uses"}})

    family_inventory = []
    for path in sorted(xml_dir.glob("zl.*" + XML_SUFFIX)):
        name = path.name.removesuffix(XML_SUFFIX)
        family_inventory.append({"class": name,
                                 "coverage": "bounded-semantic-contract" if name in EXPECTED_CLASSES
                                 else "structural-inventory-only-no-semantic-contract",
                                 "reference": xml_fact(path, resources),
                                 "installed_help": help_fact(help_dir / (name + ".maxhelp"),
                                                              resources, name)})
    family_ref = xml_fact(xml_dir / ("zl" + XML_SUFFIX), resources)
    family_help = help_fact(help_dir / "zl.maxhelp", resources, "zl")
    source_paths = {row["reference"]["path"] for row in objects + family_inventory}
    source_paths.add(family_ref["path"])
    help_paths = {row["installed_help"]["path"] for row in objects + family_inventory}
    help_paths.add(family_help["path"])
    selected_modes = sum(name.startswith("zl.") for name in EXPECTED_CLASSES)
    return {
        "schema_version": 1, "batch_id": "control-map-20261021",
        "object_count": len(objects), "selected_zl_mode_count": selected_modes,
        "scope": "Nine additional Max message classes and twelve selected zl modes; all installed zl mode interfaces inventoried separately.",
        "provenance": "STATIC_INSTALLED_REFERENCE_AND_HELP_WITH_PRODUCTION_AUTHORING_ADMISSION_PROBES",
        "execution": {"max": False, "ultra_native_runtime": False, "desktop": False,
                      "audio": False, "installed_help": False, "ultra_authoring_parser_only": True},
        "source_policy": "Caller-supplied licensed Max resources. Paths are root-relative. No external binary/helper is executed.",
        "generation_inputs": {"authored_contracts": file_fact(CONTRACTS, HERE),
                              "generator": file_fact(Path(__file__).resolve(), HERE),
                              "prior_map_boundaries": previous_maps},
        "source_counts": {"unique_xml_files": len(source_paths),
                          "unique_help_files": len(help_paths),
                          "selected_help_anchors": len(objects),
                          "cited_xml_selectors": sum(len(row["evidence"]) for row in objects),
                          "installed_zl_mode_references": len(family_inventory),
                          "deferred_zl_modes": len(family_inventory) - selected_modes},
        "ultra": ultra_snapshot(EXPECTED_CLASSES),
        "zl_shared": contracts["zl_shared"], "zl_family_reference": family_ref,
        "zl_family_help": family_help, "zl_mode_inventory": family_inventory,
        "implementation_order": [
            {"priority": 1, "classes": [name for name, row in contracts["objects"].items()
                                        if row["priority"] == 1],
             "gate": "Obtain original typed Max traces first; reuse the synchronous native executor and define atomically refused capacity growth."},
            {"priority": 2, "classes": [name for name, row in contracts["objects"].items()
                                        if row["priority"] == 2],
             "gate": "Resolve ordering, buffering, indexes, count/readiness outputs and reset semantics before stateful admission."},
            {"priority": 3, "classes": ["expr"],
             "gate": "Design and verify a bounded expression grammar, typed numeric rules and explicit unsupported functions."},
            {"priority": 4, "classes": ["regexp"],
             "gate": "Choose an appropriate PCRE-compatible engine and resource limits, then capture text/binary and saved-version ordering contracts."}],
        "shared_limits": [
            "The map changes no runtime, UI, object registry, installed resource or Max/Wine process.",
            "No new Max oracle, native object test, help import, desktop run or whole-help compatibility pass was performed.",
            "Read-only production parser probes refuse the selected class names; this is authoring admission evidence, not object behavior.",
            "All bounds in bounded_contract are proposed Ultra contracts, not observed Max limits.",
            "No-argument defaults are reported only when explicitly established; saved instances with arguments do not imply defaults.",
            "Prior scheduler mapping remains in object-batch-next-20261021; no scheduler/transport parity is added by immediate list operations."],
        "redistribution": {"reference_prose": False, "help_patch_bodies": False,
                           "helper_source": False, "creation_message_text": False,
                           "retained": "Hashes, interface signatures/names/default lexemes, saved port facts, selected incident endpoints and original analysis."},
        "objects": objects,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--resources", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=HERE / "control-map.json")
    parser.add_argument("--check", action="store_true",
                        help="Regenerate in memory and require byte-identical output")
    args = parser.parse_args()
    payload = build(args.resources.resolve())
    rendered = json.dumps(payload, indent=2, ensure_ascii=True) + "\n"
    if args.check:
        if args.output.read_text() != rendered:
            raise SystemExit("Mapping changed; inspect source/contract changes, regenerate and review.")
    else:
        args.output.write_text(rendered)
    print(json.dumps({"status": "verified-identical" if args.check else "generated",
                      "objects": payload["object_count"], **payload["source_counts"],
                      "selected_message_names_admitted": 0,
                      "max_or_native_execution": False, "output": str(args.output)}))


if __name__ == "__main__":
    main()
