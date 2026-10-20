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
    assert_eq!(p.native.nodes[1].count, 2);
    assert_eq!(p.native.nodes[1].p0, 60.0);
    assert_eq!(p.native.nodes[1].p1, 100.0);
    assert_eq!(p.native.nodes[5].p0, 1.0);
    assert_eq!(p.native.nodes[6].p0, 150.0);
    assert_eq!(p.native.nodes[8].p0, 48.0);
    assert_eq!(p.native.nodes[11].p1, 28.0);
    assert_eq!(p.native.nodes[12].p0, 90.0);
    assert_eq!(std::mem::size_of::<NativeNode>(), 40);
    assert_eq!(std::mem::size_of::<NativeEdge>(), 16);
    assert_eq!(std::mem::size_of::<NativeGraph>(), 2320);
    assert_eq!(std::mem::size_of::<NativeObservation>(), 24);
    assert_eq!(std::mem::size_of::<NativeStatus>(), 784);
}
#[test]
fn messages_are_only_bang_or_bounded_literal_lists() {
    for valid in ["bang", " 60 100 ", "-100000 +1.25 1e5", "0", "1\n2\t3"] {
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
        "", " ", "NaN", "inf", "1e309", "100001", "1 2 3 4", "60, 100", "$1", "set 60", "bang 1",
        "60; bang", "0x10",
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
        (1, 1, 0, json!([1, 2, 3, 4])),
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
        "gain",
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
