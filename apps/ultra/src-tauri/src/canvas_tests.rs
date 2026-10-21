use super::*;
use serde_json::{json, Value};
fn node(id: u32, kind: &str, params: Value) -> Value {
    json!({"id":id,"type":kind,"x":0,"y":4000,"params":params})
}
fn edge(from: u32, outlet: u32, to: u32, inlet: u32) -> Value {
    json!({"from":from,"outlet":outlet,"to":to,"inlet":inlet})
}
fn patch(nodes: Vec<Value>, edges: Vec<Value>) -> Value {
    json!({"version":1,"profile":"ultra-canvas-v1","nodes":nodes,"edges":edges})
}
fn stereo() -> Value {
    patch(
        vec![
            node(1, "voice", json!({"device":0})),
            node(2, "gain", json!({})),
            node(3, "voice", json!({"device":1})),
            node(4, "gain", json!({})),
            node(5, "join", json!({})),
            node(6, "dac", json!({})),
        ],
        vec![
            edge(1, 0, 2, 0),
            edge(2, 0, 5, 0),
            edge(3, 0, 4, 0),
            edge(4, 0, 5, 1),
            edge(5, 0, 6, 0),
        ],
    )
}
#[test]
fn empty_document_is_a_valid_silent_graph() {
    let p = prepare(patch(vec![], vec![])).unwrap();
    assert_eq!(p.native.node_count, 0);
}
#[test]
fn schema_is_strict_and_required() {
    for field in ["version", "profile", "nodes", "edges"] {
        let mut p = patch(vec![], vec![]);
        p.as_object_mut().unwrap().remove(field);
        assert!(prepare(p).is_err());
    }
    let mut p = patch(vec![], vec![]);
    p["version"] = json!(2);
    assert!(prepare(p).is_err());
    let mut p = patch(vec![], vec![]);
    p["profile"] = json!("max");
    assert!(prepare(p).is_err());
    let mut p = patch(vec![], vec![]);
    p["extra"] = json!(1);
    assert!(prepare(p).is_err());
    let mut n = node(1, "bang", json!({}));
    n["unknown"] = json!(false);
    assert!(prepare(patch(vec![n], vec![])).is_err());
    for field in ["id", "type", "x", "y", "params"] {
        let mut n = node(1, "bang", json!({}));
        n.as_object_mut().unwrap().remove(field);
        assert!(prepare(patch(vec![n], vec![])).is_err());
    }
    let mut e = edge(1, 0, 2, 0);
    e["unknown"] = json!(1);
    assert!(prepare(patch(
        vec![node(1, "bang", json!({})), node(2, "bang", json!({}))],
        vec![e]
    ))
    .is_err());
}
#[test]
fn node_identifiers_positions_and_counts_are_bounded() {
    for id in [
        json!(0),
        json!(-1),
        json!(1.5),
        json!(4294967296u64),
        json!("1"),
    ] {
        let mut n = node(1, "bang", json!({}));
        n["id"] = id;
        assert!(prepare(patch(vec![n], vec![])).is_err());
    }
    for position in [-0.01, 4000.01] {
        let mut n = node(1, "bang", json!({}));
        n["x"] = json!(position);
        assert!(prepare(patch(vec![n], vec![])).is_err());
    }
    assert!(prepare(patch(
        vec![node(1, "bang", json!({})), node(1, "number", json!({}))],
        vec![]
    ))
    .is_err());
    assert!(prepare(patch(
        (1..=32).map(|id| node(id, "bang", json!({}))).collect(),
        vec![]
    ))
    .is_ok());
    assert!(prepare(patch(
        (1..=33).map(|id| node(id, "bang", json!({}))).collect(),
        vec![]
    ))
    .is_err());
}
#[test]
fn serialized_input_is_bounded_without_an_unbounded_copy() {
    let mut p = patch(vec![], vec![]);
    p["padding"] = json!("x".repeat(MAX_JSON_BYTES));
    assert!(prepare(p).unwrap_err().contains("64 KiB"));
}
#[test]
fn defaults_compile_to_exact_native_slots() {
    let kinds = [
        "bang", "message", "number", "toggle", "add", "multiply", "metro", "counter", "chord",
        "makenote", "midiin", "voice", "gain", "join", "dac",
    ];
    let p = prepare(patch(
        kinds
            .iter()
            .enumerate()
            .map(|(i, k)| node(i as u32 + 1, k, json!({})))
            .collect(),
        vec![],
    ))
    .unwrap();
    for (i, n) in p.native.nodes[..15].iter().enumerate() {
        assert_eq!(n.kind, i as u32);
    }
    assert_eq!(&p.native.nodes[1].text[..7], b"60 100\0");
    assert_eq!(p.native.nodes[1].count, 0);
    assert_eq!(p.native.nodes[1].p0, 0.0);
    assert_eq!(p.native.nodes[5].p0, 1.0);
    assert_eq!(p.native.nodes[6].p0, 150.0);
    assert_eq!(p.native.nodes[8].p0, 48.0);
    assert_eq!(p.native.nodes[11].p1, 28.0);
    assert_eq!(p.native.nodes[12].p0, 90.0);
    assert_eq!(std::mem::size_of::<NativeNode>(), 192);
    assert_eq!(std::mem::size_of::<NativeEdge>(), 16);
    assert_eq!(std::mem::size_of::<NativeGraph>(), 7184);
    assert_eq!(std::mem::size_of::<NativeObservation>(), 24);
    assert_eq!(std::mem::size_of::<NativeStatus>(), 784);
}
#[test]
fn messages_admit_typed_literals_and_reject_unsupported_syntax() {
    for valid in [
        "bang",
        " 60 100 ",
        "-100000 +1.25 1e5",
        "0",
        "1\n2\t3",
        "1 2 3 4",
        "set 60",
        "stop",
        "pause",
        "resume",
        "list",
    ] {
        assert!(
            prepare(patch(
                vec![node(1, "message", json!({"text":valid}))],
                vec![]
            ))
            .is_ok(),
            "{valid}"
        );
    }
    for invalid in [
        "",
        " ",
        "NaN",
        "inf",
        "1e309",
        "100001",
        "1 2 3 4 5 6 7 8 9",
        "60, 100",
        "$1",
        "bang 1",
        "60; bang",
        "0x10",
        "+",
        "-",
        ".",
        "+foo",
        "symbol",
        "symbol bing bang",
        "'bing'",
        "\"bing\"",
        "bing\\bang",
        "b\0ing",
        "b\u{7f}ing",
        "音",
    ] {
        assert!(
            prepare(patch(
                vec![node(1, "message", json!({"text":invalid}))],
                vec![]
            ))
            .is_err(),
            "{invalid}"
        );
    }
    assert!(prepare(patch(
        vec![node(1, "message", json!({"text":" ".repeat(128)+"1"}))],
        vec![]
    ))
    .is_err());
    assert!(prepare(patch(vec![node(1, "message", json!({"text":60}))], vec![])).is_err());
}
#[test]
fn strict_numeric_parameters_and_enum_integrality() {
    for (kind, key, lo, hi, integral) in [
        ("number", "value", -100000., 100000., false),
        ("toggle", "value", 0., 1., true),
        ("add", "rhs", -100000., 100000., false),
        ("multiply", "rhs", -100000., 100000., false),
        ("metro", "interval", 20., 2000., false),
        ("counter", "steps", 1., 32., true),
        ("chord", "root", 0., 127., true),
        ("chord", "shape", 0., 2., true),
        ("makenote", "velocity", 1., 127., true),
        ("makenote", "duration", 10., 2000., false),
        ("midiin", "channel", 1., 16., true),
        ("voice", "device", 0., 1., true),
        ("voice", "attack", 0., 127., true),
        ("voice", "release", 0., 127., true),
        ("gain", "value", 0., 127., true),
    ] {
        for v in [lo, hi] {
            assert!(
                prepare(patch(vec![node(1, kind, json!({key:v}))], vec![])).is_ok(),
                "{kind}.{key}={v}"
            );
        }
        for v in [
            json!(lo - 1.),
            json!(hi + 1.),
            json!("1"),
            json!(true),
            Value::Null,
        ] {
            assert!(
                prepare(patch(vec![node(1, kind, json!({key:v}))], vec![])).is_err(),
                "{kind}.{key}"
            );
        }
        assert_eq!(
            prepare(patch(vec![node(1, kind, json!({key:lo+0.5}))], vec![])).is_ok(),
            !integral,
            "{kind}.{key}"
        );
    }
    for (kind, params) in [
        ("bogus", json!({})),
        ("bang", json!({"value":1})),
        ("number", json!({"rhs":1})),
        ("join", json!({"channels":2})),
        ("voice", json!([])),
    ] {
        assert!(prepare(patch(vec![node(1, kind, params)], vec![])).is_err());
    }
}
#[test]
fn typed_ports_duplicates_cycles_and_edge_limit() {
    let nodes = vec![
        node(1, "number", json!({})),
        node(2, "add", json!({})),
        node(3, "gain", json!({})),
        node(4, "join", json!({})),
        node(5, "midiin", json!({})),
    ];
    assert!(prepare(patch(
        nodes.clone(),
        vec![edge(1, 0, 2, 1), edge(2, 0, 3, 1)]
    ))
    .is_ok());
    for edges in [
        vec![edge(1, 1, 2, 0)],
        vec![edge(1, 0, 2, 2)],
        vec![edge(1, 0, 3, 0)],
        vec![edge(3, 0, 2, 0)],
        vec![edge(3, 0, 4, 2)],
        vec![edge(1, 0, 5, 0)],
        vec![edge(1, 0, 90, 0)],
        vec![edge(1, 0, 1, 0)],
        vec![edge(1, 0, 2, 0), edge(2, 0, 1, 1)],
        vec![edge(1, 0, 2, 0), edge(1, 0, 2, 0)],
    ] {
        assert!(prepare(patch(nodes.clone(), edges)).is_err());
    }
    let nodes: Vec<_> = (1..=32).map(|id| node(id, "number", json!({}))).collect();
    let edges: Vec<_> = (1..=32)
        .flat_map(|from| ((from + 1)..=32).map(move |to| edge(from, 0, to, 0)))
        .take(65)
        .collect();
    assert!(prepare(patch(nodes.clone(), edges[..64].to_vec())).is_ok());
    assert!(prepare(patch(nodes, edges)).is_err());
}
#[test]
fn audio_map_supports_stereo_swap_dual_mono_and_partial_paths() {
    let p = stereo();
    assert!(prepare(p.clone()).is_ok());
    let mut swapped = p.clone();
    swapped["edges"][1]["inlet"] = json!(1);
    swapped["edges"][3]["inlet"] = json!(0);
    assert!(prepare(swapped).is_ok());
    let mut dual = p.clone();
    dual["edges"][3]["from"] = json!(2);
    assert!(prepare(dual).is_ok());
    for keep in 0..5 {
        let mut partial = p.clone();
        partial["edges"].as_array_mut().unwrap().truncate(keep);
        assert!(prepare(partial).is_ok());
    }
}
#[test]
fn ambiguous_audio_topologies_are_rejected() {
    let mut duplicate = stereo();
    duplicate["nodes"][2]["params"]["device"] = json!(0);
    assert!(prepare(duplicate).is_err());
    let mut p = stereo();
    p["edges"][3]["inlet"] = json!(0);
    assert!(prepare(p).is_err());
    let mut p = stereo();
    p["edges"].as_array_mut().unwrap().push(edge(1, 0, 4, 0));
    assert!(prepare(p).is_err());
    let mut p = stereo();
    p["edges"][1] = edge(2, 0, 4, 0);
    assert!(prepare(p).is_err());
    let mut p = stereo();
    p["nodes"]
        .as_array_mut()
        .unwrap()
        .push(node(7, "join", json!({})));
    assert!(prepare(p).is_err());
    let mut p = stereo();
    p["nodes"]
        .as_array_mut()
        .unwrap()
        .push(node(7, "dac", json!({})));
    assert!(prepare(p).is_err());
}
#[test]
fn generation_admission_is_atomic_and_failure_keeps_last_plan() {
    let mut state = CanvasState::default();
    let first = prepare(patch(vec![node(1, "number", json!({}))], vec![])).unwrap();
    assert_eq!(state.install(first.clone(), |_| true).unwrap(), 1);
    assert!(state
        .install(prepare(patch(vec![], vec![])).unwrap(), |_| false)
        .is_err());
    assert!(state.event(1, 1, 0, Value::Null).is_ok());
    assert!(state.event(2, 1, 0, Value::Null).is_err());
    assert_eq!(state.install(first, |_| true).unwrap(), 2);
    assert!(state.event(1, 1, 0, Value::Null).is_err());
}
#[test]
fn events_validate_generation_target_control_ports_and_values() {
    let mut state = CanvasState::default();
    state.install(prepare(stereo()).unwrap(), |_| true).unwrap();
    assert_eq!(state.event(1, 1, 0, json!([60, 100])).unwrap().count, 2);
    assert_eq!(state.event(1, 1, 0, Value::Null).unwrap().count, 0);
    for (revision, node, inlet, value) in [
        (0, 1, 0, Value::Null),
        (1, 90, 0, Value::Null),
        (1, 2, 0, Value::Null),
        (1, 6, 0, Value::Null),
        (1, 1, 3, Value::Null),
        (1, 1, 0, json!(60)),
        (1, 1, 0, json!([])),
        (1, 1, 0, json!([1, 2, 3, 4, 5, 6, 7, 8, 9])),
        (1, 1, 0, json!([100001])),
        (1, 1, 0, json!(["60"])),
    ] {
        assert!(state.event(revision, node, inlet, value).is_err());
    }
}
#[test]
fn live_parameters_do_not_revise_graph_and_rejections_do_not_mutate() {
    let mut state = CanvasState::default();
    state.install(prepare(stereo()).unwrap(), |_| true).unwrap();
    assert!(state.parameter(1, 1, "device", 1., |_, _| true).is_err());
    assert!(state
        .parameter(1, 1, "attack", 20., |i, v| {
            assert_eq!(i, 0);
            assert_eq!(v, 20.);
            true
        })
        .is_ok());
    assert!(state.parameter(1, 2, "value", 9., |_, _| false).is_err());
    assert_eq!(state.graph.as_ref().unwrap().native.nodes[1].p0, 90.);
    assert!(state.event(1, 1, 0, json!([60, 100])).is_ok());
    assert!(state.parameter(2, 2, "value", 9., |_, _| true).is_err());
    assert!(state.parameter(1, 2, "value", 9.5, |_, _| true).is_err());
    assert!(state.parameter(1, 2, "text", 9., |_, _| true).is_err());
    assert!(state
        .parameter(1, 2, "value", f64::INFINITY, |_, _| true)
        .is_err());
}

#[test]
fn structural_routes_require_reapply_and_never_call_live_native_update() {
    let mut state = CanvasState::default();
    state
        .install(
            prepare(patch(
                vec![node(1, "voice", json!({})), node(2, "midiin", json!({}))],
                vec![],
            ))
            .unwrap(),
            |_| true,
        )
        .unwrap();
    for (node, key, value) in [(1, "device", 1.), (2, "channel", 3.)] {
        assert!(state
            .parameter(1, node, key, value, |_, _| panic!(
                "Structural changes must not reach live native parameters"
            ))
            .unwrap_err()
            .contains("structural"));
    }
}

#[test]
fn revision_exhaustion_never_wraps_or_calls_native() {
    let mut state = CanvasState::default();
    let graph = prepare(patch(vec![], vec![])).unwrap();
    state.install(graph.clone(), |_| true).unwrap();
    state.revision = u64::MAX;
    assert!(state
        .install(graph, |_| panic!(
            "Wrapped generation must never reach native admission"
        ))
        .is_err());
    assert_eq!(state.revision, u64::MAX);
}

#[test]
fn finite_control_bounds_and_exact_size_limit_are_enforced() {
    for value in [
        f64::NAN,
        f64::INFINITY,
        f64::NEG_INFINITY,
        100000.1,
        -100000.1,
    ] {
        assert!(validate_number(value).is_err());
    }
    for value in [-100000., 0., 100000.] {
        assert!(validate_number(value).is_ok());
    }
    let mut writer = SizeLimit(0);
    assert!(writer.write_all(&vec![b' '; MAX_JSON_BYTES]).is_ok());
    assert!(writer.write_all(b"x").is_err());
}

#[test]
fn all_allowed_live_parameters_use_their_native_slot_without_revising() {
    let kinds = [
        "number", "toggle", "add", "multiply", "metro", "counter", "chord", "makenote", "voice",
        "gain", "int", "float", "flonum", "slider", "line",
    ];
    let nodes = kinds
        .iter()
        .enumerate()
        .map(|(i, kind)| node(i as u32 + 1, kind, json!({})))
        .collect();
    let mut state = CanvasState::default();
    state
        .install(prepare(patch(nodes, vec![])).unwrap(), |_| true)
        .unwrap();
    for (index, name) in kinds.iter().enumerate() {
        for spec in parameters(kind(name).unwrap())
            .iter()
            .filter(|spec| spec.live)
        {
            state
                .parameter(1, index as u32 + 1, spec.key, spec.min, |slot, value| {
                    assert_eq!(slot, spec.slot);
                    assert_eq!(value, spec.min);
                    true
                })
                .unwrap();
        }
    }
    assert_eq!(state.revision, 1);
}

#[test]
fn shipped_editor_preset_compiles_as_the_same_native_profile() {
    let value: Value = serde_json::from_str(include_str!("../../ui/canvas-preset.json")).unwrap();
    let prepared = prepare(value).unwrap();
    let nodes = &prepared.native.nodes[..prepared.native.node_count as usize];
    assert!(nodes.iter().any(|n| n.kind == 6)); // Native metro, not a browser clock.
    assert_eq!(nodes.iter().filter(|n| n.kind == 11).count(), 2);
    assert_eq!(nodes.iter().filter(|n| n.kind == 13).count(), 1);
    assert_eq!(nodes.iter().filter(|n| n.kind == 14).count(), 1);
}

#[test]
fn object_batch_default_kinds_and_argument_dependent_ports_are_admitted() {
    let kinds = [
        "int", "float", "flonum", "slider", "pack", "unpack", "select", "route", "trigger", "line",
    ];
    let prepared = prepare(patch(
        kinds
            .iter()
            .enumerate()
            .map(|(i, k)| node(i as u32 + 1, k, json!({})))
            .collect(),
        vec![],
    ))
    .unwrap();
    for (index, native) in prepared.native.nodes[..10].iter().enumerate() {
        assert_eq!(native.kind, index as u32 + 15);
    }
    let nodes = vec![
        node(1, "trigger", json!({"args":"b i f"})),
        node(2, "pack", json!({"args":"0 0. bing"})),
        node(3, "unpack", json!({"args":"0 0. bing"})),
        node(4, "select", json!({"args":"bing"})),
        node(5, "route", json!({"args":"bing bang"})),
        node(6, "line", json!({})),
        node(7, "number", json!({})),
    ];
    let edges = vec![
        edge(1, 2, 2, 2),
        edge(2, 0, 3, 0),
        edge(3, 2, 4, 1),
        edge(4, 1, 5, 2),
        edge(5, 2, 6, 2),
        edge(6, 1, 7, 0),
    ];
    assert!(prepare(patch(nodes.clone(), edges)).is_ok());
    for bad in [
        edge(1, 3, 7, 0),
        edge(7, 0, 2, 3),
        edge(3, 3, 7, 0),
        edge(7, 0, 4, 2),
        edge(7, 0, 5, 3),
        edge(6, 2, 7, 0),
    ] {
        assert!(prepare(patch(nodes.clone(), vec![bad])).is_err());
    }
}

#[test]
fn typed_literal_messages_and_eight_atom_events_preserve_cardinality() {
    for text in [
        "set 7.5",
        "list 1 2. bing",
        "symbol bing",
        "bing",
        "tab",
        "1 2 3 4 5 6 7 8",
    ] {
        assert!(
            prepare(patch(
                vec![node(1, "message", json!({"text":text}))],
                vec![]
            ))
            .is_ok(),
            "{text}"
        );
    }
    let mut state = CanvasState::default();
    state
        .install(
            prepare(patch(vec![node(1, "int", json!({}))], vec![])).unwrap(),
            |_| true,
        )
        .unwrap();
    assert_eq!(
        state
            .event(1, 1, 0, json!([1, 2, 3, 4, 5, 6, 7, 8]))
            .unwrap()
            .count,
        8
    );
    assert_eq!(state.event(1, 1, 0, json!("set 7.5")).unwrap().count, 1);
    assert!(state
        .event(1, 1, 0, json!([1, 2, 3, 4, 5, 6, 7, 8, 9]))
        .is_err());
}

#[test]
fn typed_message_pod_layout_and_atom_identity_are_preserved() {
    assert_eq!(std::mem::size_of::<NativeMessage>(), 392);
    assert_eq!(std::mem::offset_of!(NativeMessage, values), 8);
    assert_eq!(std::mem::offset_of!(NativeMessage, tags), 72);
    assert_eq!(std::mem::offset_of!(NativeMessage, symbols), 104);
    assert_eq!(std::mem::offset_of!(NativeMessage, selector), 360);
    assert_eq!(std::mem::offset_of!(NativeNode, p3), 40);
    assert_eq!(std::mem::offset_of!(NativeNode, text), 64);
    let message = literal("list 1 1. 1e0 bing").unwrap();
    assert_eq!(message.count, 4);
    assert_eq!(&message.tags[..4], &[0, 1, 1, 2]);
    assert_eq!(&message.values[..3], &[1., 1., 1.]);
    assert_eq!(&message.selector[..5], b"list\0");
    assert_eq!(&message.symbols[3][..5], b"bing\0");
    let forced = literal("symbol 100001").unwrap();
    assert_eq!(forced.tags[0], 2);
    assert_eq!(&forced.symbols[0][..7], b"100001\0");
    let selector = literal("set -2.5").unwrap();
    assert_eq!(&selector.selector[..4], b"set\0");
    assert_eq!(selector.tags[0], 1);
    assert_eq!(selector.values[0], -2.5);
    assert_eq!(literal("bing").unwrap().count, 0);
    for bad in [
        "x".repeat(32),
        "symbol ".to_string() + &"x".repeat(32),
        " ".repeat(127) + "1",
    ] {
        assert!(literal(&bad).is_err(), "{bad}");
    }
    assert!(literal(&"x".repeat(31)).is_ok());
    assert!(literal(&("list ".to_string() + &["1"; 8].join(" "))).is_ok());
}

#[test]
fn batch_parameters_use_six_slots_and_refuse_crossed_flonum_limits_atomically() {
    let p = prepare(patch(
        vec![
            node(1, "flonum", json!({})),
            node(2, "slider", json!({})),
            node(3, "line", json!({})),
        ],
        vec![],
    ))
    .unwrap();
    let f = p.native.nodes[0];
    assert_eq!((f.p0, f.p1, f.p2, f.p3), (0., -100000., 100000., 6.));
    let s = p.native.nodes[1];
    assert_eq!((s.p0, s.p1, s.p2, s.p3, s.p4), (0., 128., 0., 1., 0.));
    let l = p.native.nodes[2];
    assert_eq!((l.p0, l.p1, l.p2, l.p3), (0., 0., 20., 2.));
    for (kind, params) in [
        ("flonum", json!({"minimum":4,"maximum":3})),
        ("flonum", json!({"numdecimalplaces":10})),
        ("slider", json!({"size":1.5})),
        ("slider", json!({"size":0})),
        ("slider", json!({"floatoutput":2})),
        ("line", json!({"time":-1})),
        ("line", json!({"grain":0})),
        ("line", json!({"floatoutput":3})),
    ] {
        assert!(
            prepare(patch(vec![node(1, kind, params)], vec![])).is_err(),
            "{kind}"
        );
    }
    let mut state = CanvasState::default();
    state.install(p, |_| true).unwrap();
    state
        .parameter(1, 1, "minimum", 10., |slot, value| {
            assert_eq!((slot, value), (1, 10.));
            true
        })
        .unwrap();
    assert!(state
        .parameter(1, 1, "maximum", 9., |_, _| panic!(
            "crossed limit reached native"
        ))
        .is_err());
    assert_eq!(state.graph.as_ref().unwrap().native.nodes[0].p2, 100000.);
    state
        .parameter(1, 2, "floatoutput", 1., |slot, value| {
            assert_eq!((slot, value), (4, 1.));
            true
        })
        .unwrap();
    state
        .parameter(1, 3, "floatoutput", 0., |slot, value| {
            assert_eq!((slot, value), (3, 0.));
            true
        })
        .unwrap();
}

#[test]
fn creation_arguments_are_bounded_structural_and_drive_event_ports() {
    for name in ["pack", "unpack", "select", "route", "trigger"] {
        for args in ["", "0 0 0 0 0 0 0 0 0", "100001", "NaN", "0; bang", "音"] {
            assert!(
                prepare(patch(vec![node(1, name, json!({"args":args}))], vec![])).is_err(),
                "{name}: {args}"
            );
        }
    }
    let mut state = CanvasState::default();
    state
        .install(
            prepare(patch(
                vec![
                    node(1, "pack", json!({"args":"0 0. bing"})),
                    node(2, "select", json!({"args":"0 1"})),
                ],
                vec![],
            ))
            .unwrap(),
            |_| true,
        )
        .unwrap();
    assert!(state.event(1, 1, 2, json!("symbol bing")).is_ok());
    assert!(state.event(1, 1, 3, Value::Null).is_err());
    assert!(state.event(1, 2, 1, Value::Null).is_err());
    assert!(state
        .parameter(1, 1, "args", 1., |_, _| panic!(
            "structural text reached numeric update"
        ))
        .is_err());
    let arrays = state.event(1, 1, 0, json!([1, 1.5])).unwrap();
    assert_eq!(&arrays.tags[..2], &[0, 1]);
}
