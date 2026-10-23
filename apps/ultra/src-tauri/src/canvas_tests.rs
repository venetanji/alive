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
fn arithmetic_modes_preserve_legacy_defaults_and_validate_new_descriptors() {
    for (name,id,default) in [("add",4,0.),("multiply",5,1.)] {
        let prepared=prepare(patch(vec![node(1,name,json!({}))],vec![])).unwrap();
        assert_eq!((prepared.native.nodes[0].kind,prepared.native.nodes[0].p0,prepared.native.nodes[0].p1),(id,default,0.));
        assert!(prepare(patch(vec![node(1,name,json!({"rhs":0.5}))],vec![])).is_ok());
    }
    for (name,rhs) in [("subtract",0.),("divide",1.),("modulo",1.),("reverse_subtract",0.),("reverse_divide",1.),("abs",0.)] {
        let prepared=prepare(patch(vec![node(1,name,json!({}))],vec![])).unwrap();
        assert_eq!((prepared.native.nodes[0].p0,prepared.native.nodes[0].p1),(rhs,1.));
    }
    assert!(prepare(patch(vec![node(1,"abs",json!({"rhs":0}))],vec![])).is_err());
    for (name,id) in [("add",4),("multiply",5),("subtract",54),("divide",55),("modulo",56),("reverse_subtract",57),("reverse_divide",58),("abs",59)] {
        let params=if id==59 {json!({"numericmode":1})} else {json!({"rhs":2,"numericmode":1})};
        let prepared=prepare(patch(vec![node(1,name,params)],vec![])).unwrap();
        assert_eq!((prepared.native.nodes[0].kind,prepared.native.nodes[0].p1),(id,1.));
        for mode in [-1.,0.5,3.] { assert!(prepare(patch(vec![node(1,name,json!({"numericmode":mode}))],vec![])).is_err()); }
        if id>=54 { assert!(prepare(patch(vec![node(1,name,json!({"numericmode":0}))],vec![])).is_err()); }
        if id!=59 { assert!(prepare(patch(vec![node(1,name,json!({"rhs":0.5,"numericmode":1}))],vec![])).is_err()); }
        assert!(prepare(patch(vec![node(1,name,json!({"numericmode":2}))],vec![])).is_ok());
        let graph=patch(vec![node(1,"bang",json!({})),node(2,name,json!({})),node(3,"print",json!({}))],vec![edge(1,0,2,0),edge(2,0,3,0)]);
        assert!(prepare(graph.clone()).is_ok());
        let mut cold=graph;cold["edges"][0]["inlet"]=json!(1);assert_eq!(prepare(cold).is_ok(),id!=59);
    }
}
#[test]
fn arithmetic_numericmode_is_structural_and_rhs_live_admission_is_atomic() {
    let source=patch(vec![node(1,"subtract",json!({"rhs":2,"numericmode":1}))],vec![]);
    let mut state=CanvasState::default();let revision=state.install(prepare(source.clone()).unwrap(),|_|true).unwrap();
    assert!(state.parameter(revision,1,"numericmode",2.,|_,_|panic!("structural mode sent live")).is_err());
    assert!(state.parameter(revision,1,"rhs",0.5,|_,_|panic!("fractional integer rhs sent live")).is_err());
    assert!(state.matches(&prepare(source.clone()).unwrap()));
    let mut changed=source.clone();changed["nodes"][0]["params"]["numericmode"]=json!(2);
    assert_eq!(state.single_parameter_change(&prepare(changed).unwrap()),None);
    changed=source;changed["nodes"][0]["params"]["rhs"]=json!(3);
    assert_eq!(state.single_parameter_change(&prepare(changed.clone()).unwrap()),Some((1,"rhs",3.,false)));
    assert!(state.parameter(revision,1,"rhs",3.,|slot,value|slot==0&&value==3.).is_ok());
    assert!(state.matches(&prepare(changed).unwrap()));
}
#[test]
fn mutable_message_schema_accepts_empty_and_fixed_head_templates() {
    for text in ["", "saved $1 $2", "1 $2", "symbol kiwi", "bang"] {
        let p = prepare(patch(vec![node(1,"message_box",json!({"text":text})),node(2,"bang",json!({}))],vec![edge(2,0,1,1)])).unwrap();
        assert_eq!(p.native.nodes[0].kind,53);
    }
    for text in ["$1", "symbol $1", "bang $1", "x $3", "x a$1", "x $0"] {
        assert!(prepare(patch(vec![node(1,"message_box",json!({"text":text}))],vec![])).is_err());
    }
    assert!(prepare(patch(vec![node(1,"message",json!({"text":"saved $1"}))],vec![])).is_err());
}
#[test]
fn message_text_admission_is_atomic_and_same_text_reapply_advances_serial() {
    let source=patch(vec![node(1,"message_box",json!({"text":"saved $1"})),node(2,"number",json!({"value":4}))],vec![]);
    let mut state=CanvasState::default();let revision=state.install(prepare(source.clone()).unwrap(),|_|true).unwrap();
    assert!(state.message_text(revision,1,"next",|_|false).is_err());assert_eq!(state.message_text_serial(),0);
    assert!(state.matches(&prepare(source.clone()).unwrap()));
    assert_eq!(state.message_text(revision,1,"saved $1",|serial|serial==1).unwrap(),1);
    assert!(state.message_text(revision,2,"next",|_|panic!("wrong kind admitted")).is_err());
    let mut updated=source.clone();updated["nodes"][0]["params"]["text"]=json!("new $2");
    assert_eq!(state.single_message_text_change(&prepare(updated.clone()).unwrap()),Some((1,"new $2".into())));
    updated["nodes"][1]["params"]["value"]=json!(5);
    assert_eq!(state.single_message_text_change(&prepare(updated).unwrap()),None);
    assert!(state.event(revision,1,1,json!("new $1 $2")).is_ok());
    assert!(state.event(revision,1,0,json!("set fresh $1")).is_ok());
    assert!(state.event(revision,1,0,json!("new $1")).is_err());
    state.install(prepare(source).unwrap(),|_|true).unwrap();assert_eq!(state.message_text_serial(),0);
}
#[test]
fn message_snapshot_preserves_empty_bang_float_and_template_types() {
    assert_eq!(std::mem::size_of::<NativeMessageBoxObservation>(),440);
    assert_eq!(std::mem::size_of::<NativeMessageBoxSnapshot>(),14104);
    let mut native=NativeMessageBoxSnapshot {revision:3,text_edit_serial:2,node_count:3,..Default::default()};
    native.nodes[0].flags=1;
    let (prototype,placeholders)=message_template("new 1. $2").unwrap();native.nodes[2].prototype=prototype;native.nodes[2].placeholders=placeholders;
    let projected=message_box_snapshot(&native).unwrap();
    assert_eq!(projected.nodes[0].text,"");assert!(projected.nodes[0].empty);
    assert_eq!(projected.nodes[1].text,"bang");assert!(!projected.nodes[1].empty);
    assert_eq!(projected.nodes[2].text,"new 1.0 $2");assert_eq!(projected.nodes[2].prototype["atoms"][0]["tag"],1);
    native.nodes[2].prototype=message_template("tiny 1e-300").unwrap().0;native.nodes[2].placeholders=[0;8];
    assert_eq!(message_box_snapshot(&native).unwrap().nodes[2].text,"tiny 1e-300");
    native.nodes[2].prototype=NativeMessage::default();native.nodes[2].prototype.count=8;
    native.nodes[2].prototype.selector[..31].fill(b'a');
    for index in 0..8 { native.nodes[2].prototype.tags[index]=2;native.nodes[2].prototype.symbols[index][..31].fill(b'b'); }
    assert_eq!(message_box_snapshot(&native).unwrap().nodes[2].text.len(),287);
}
#[test]
fn integer_number_ports_parameters_and_live_history_preserve_legacy_numbers() {
    let mut source = node(1, "number_int", json!({"value":3,"minimum":-5,"maximum":5}));
    source["style"] = json!({"triangle":0,"tricolor":[1,0,0,1],"bordercolor":[0,0,0,1]});
    let document = patch(vec![source.clone(), node(2,"number",json!({"value":2.75}))], vec![edge(1,1,2,0)]);
    let prepared = prepare(document.clone()).unwrap();
    assert_eq!(prepared.native.nodes[0].kind,52);
    assert_eq!(prepared.native.nodes[1].p0,2.75);
    assert!(prepare(patch(vec![source.clone(),node(2,"bang",json!({}))],vec![edge(2,0,1,1)])).is_err());
    for params in [json!({"value":1.5}),json!({"minimum":-1.5}),json!({"maximum":2.5}),json!({"minimum":3,"maximum":2})] {
        assert!(prepare(patch(vec![node(1,"number_int",params)],vec![])).is_err());
    }
    let mut state = CanvasState::default();
    let revision = state.install(prepared, |_|true).unwrap();
    let mut edited = document;
    edited["nodes"][0]["params"]["value"] = json!(4);
    let prepared = prepare(edited).unwrap();
    assert_eq!(state.single_parameter_change(&prepared),Some((1,"value",4.,true)));
    assert!(state.parameter(revision,1,"value",4.,|slot,value|slot==0&&value==4.).is_ok());
    assert!(state.matches(&prepared));
    assert!(state.parameter(revision,1,"value",4.25,|_,_|panic!("fractional integer parameter admitted")).is_err());
    assert!(state.parameter(revision,1,"minimum",6.,|_,_|panic!("crossed bounds admitted")).is_err());
    assert_eq!(state.revision(),revision);
}
#[test]
fn physical_tab_validation_rejects_stale_and_non_ui_actions_without_changing_messages() {
    let mut state = CanvasState::default();
    let revision = state.install(prepare(patch(vec![node(1,"number_int",json!({})),node(2,"flonum",json!({})),node(3,"number",json!({}))],vec![])).unwrap(), |_|true).unwrap();
    for id in [1,2] { assert!(state.ui_action(revision,id,0,&Value::Null,"tab").is_ok()); }
    for (r,id,port,value,action) in [(revision+1,1,0,Value::Null,"tab"),(revision,99,0,Value::Null,"tab"),(revision,3,0,Value::Null,"tab"),
        (revision,1,1,Value::Null,"tab"),(revision,1,0,json!([1]),"tab"),(revision,1,0,json!("tab"),"tab"),(revision,1,0,Value::Null,"other")] {
        assert!(state.ui_action(r,id,port,&value,action).is_err());
    }
    let incoming = state.event(revision,1,0,json!("tab")).unwrap();
    assert_eq!(&incoming.selector[..4], b"tab\0");
    assert_eq!(state.revision(),revision);
}
#[test]
fn print_prepares_a_bounded_label_and_has_no_output() {
    let p = prepare(patch(vec![node(1,"print",json!({"label":"notes","level":2}))],vec![])).unwrap();
    assert_eq!(p.native.nodes[0].kind,25);
    assert_eq!(&p.native.nodes[0].text[..6],b"notes\0");
    assert_eq!(p.native.nodes[0].p0,2.);
    for label in ["", "two words", "a;b", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"] {
        assert!(prepare(patch(vec![node(1,"print",json!({"label":label}))],vec![])).is_err());
    }
    assert!(prepare(patch(vec![node(1,"print",json!({})),node(2,"bang",json!({}))],vec![edge(1,0,2,0)])).is_err());
    assert_eq!(std::mem::size_of::<NativeConsoleRecord>(),456);
}
#[test]
fn console_formatting_preserves_fractional_legacy_values_and_typed_float_identity() {
    let mut record = NativeConsoleRecord::default();
    record.message.count=3;
    record.message.values=[1.5,2.,3.,0.,0.,0.,0.,0.];
    record.message.tags=[0,0,1,0,0,0,0,0];
    assert_eq!(console_record(&record).unwrap().text,"1.5 2 3.");
}
#[test]
fn appearance_shared_cases_validate_without_changing_native_descriptors() {
    let cases: Value =
        serde_json::from_str(include_str!("../../ui/canvas-appearance-cases.json")).unwrap();
    let appearance_patch = |kind: &str, style: Option<&Value>| {
        let params = match kind { "comment" => json!({"text":"Original callout."}), "patcher" => json!({"name":"child"}), _ => json!({}) };
        let mut source = node(1, kind, params);
        if kind == "patcher" { source["patcher"] = json!({"nodes":[],"edges":[]}); }
        if let Some(style) = style { source["style"] = style.clone(); }
        let mut document = patch(vec![source], vec![]);
        if matches!(kind, "comment" | "patcher") { document["version"] = json!(2); document["profile"] = json!("ultra-patcher-v2"); }
        document
    };
    for case in cases["valid"].as_array().unwrap() {
        let kind = case["type"].as_str().unwrap();
        let original = prepare(appearance_patch(kind, None)).unwrap();
        let prepared = prepare(appearance_patch(kind, Some(&case["style"])))
            .unwrap_or_else(|error| panic!("{}: {error}", case["name"]));
        assert_eq!(
            format!("{:?}", prepared.native),
            format!("{:?}", original.native),
            "{}",
            case["name"]
        );
    }
    for case in cases["invalid"].as_array().unwrap() {
        assert!(
            prepare(appearance_patch(case["type"].as_str().unwrap(), Some(&case["style"]))).is_err(),
            "{}",
            case["name"]
        );
    }
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
fn signal_routes_allow_sums_and_fanout_but_preserve_device_and_bundle_ownership() {
    let mut duplicate = stereo();
    duplicate["nodes"][2]["params"]["device"] = json!(0);
    assert!(prepare(duplicate).is_err());
    let mut p = stereo();
    p["edges"][3]["inlet"] = json!(0);
    assert!(prepare(p).is_ok());
    let mut p = stereo();
    p["edges"].as_array_mut().unwrap().push(edge(1, 0, 4, 0));
    assert!(prepare(p).is_ok());
    let mut p = stereo();
    p["edges"][1] = edge(2, 0, 4, 0);
    assert!(prepare(p).is_ok());
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
    let mut writer = SizeLimit { bytes: 0, max: MAX_JSON_BYTES, error: "Canvas patch exceeds 64 KiB JSON" };
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

#[test]
fn list_objects_prepare_stable_kinds_and_keep_inactive_zl_ports() {
    let names = ["iter", "prepend", "append", "zl_reg", "zl_join", "zl_len",
                 "zl_iter", "zl_slice", "zl_rev", "zl_rot"];
    let prepared = prepare(patch(names.iter().enumerate()
        .map(|(index, name)| node(index as u32 + 1, name, json!({}))).collect(), vec![])).unwrap();
    for (index, native) in prepared.native.nodes[..names.len()].iter().enumerate() {
        assert_eq!(native.kind, index as u32 + 28, "{}", names[index]);
        let count = if index < 3 { 1 } else { 2 };
        for port in 0..count {
            assert!(inlet(native, port).is_some(), "{} inlet {port}", names[index]);
            assert!(outlet(native, port).is_some(), "{} outlet {port}", names[index]);
        }
        assert!(inlet(native, count).is_none());
        assert!(outlet(native, count).is_none());
    }
    for index in [1, 2, 3, 4] { assert_eq!(prepared.native.nodes[index].text, [0; 128]); }
    assert_eq!(prepared.native.nodes[6].p0, 0.);
    assert_eq!(prepared.native.nodes[7].p0, 0.);
    assert_eq!(prepared.native.nodes[9].p0, 0.);
}

#[test]
fn list_creation_text_is_typed_structural_and_strictly_bounded() {
    for name in ["prepend", "append", "zl_reg", "zl_join"] {
        let prepared = prepare(patch(vec![node(1, name, json!({"args":"violet 2 3."}))], vec![])).unwrap();
        assert_eq!(&prepared.native.nodes[0].text[..12], b"violet 2 3.\0");
        for args in ["0 0 0 0 0 0 0 0 0", "100001", "0; bang", "$1", "\\\\"] {
            assert!(prepare(patch(vec![node(1, name, json!({"args":args}))], vec![])).is_err(), "{name}: {args}");
        }
        assert!(prepare(patch(vec![node(1, name, json!({"args":3}))], vec![])).is_err());
        assert!(prepare(patch(vec![node(1, name, json!({"args":"violet", "extra":1}))], vec![])).is_err());
        assert!(prepare(patch(vec![node(1, name, json!({"args":""}))], vec![])).is_ok());
        assert!(prepare(patch(vec![node(1, name, json!({"args":" \t "}))], vec![])).is_ok());
    }
    for name in ["iter", "zl_len", "zl_rev"] {
        assert!(prepare(patch(vec![node(1, name, json!({"args":"violet"}))], vec![])).is_err());
    }
}

#[test]
fn list_sizes_validate_and_update_the_live_native_slot() {
    let mut state = CanvasState::default();
    state.install(prepare(patch(vec![node(1,"zl_iter",json!({"size":2})),
        node(2,"zl_slice",json!({"size":0})), node(3,"zl_rot",json!({"rotation":-2}))],vec![])).unwrap(), |_|true).unwrap();
    for (id, key, value) in [(1,"size",3.),(2,"size",2.),(3,"rotation",-3.)] {
        state.parameter(1, id, key, value, |slot, sent| {
            assert_eq!(slot,0); assert_eq!(sent,value); true
        }).unwrap();
    }
    for (name, key, value) in [("zl_iter","size",-1.),("zl_iter","size",1.5),
        ("zl_slice","size",-1.),("zl_rot","rotation",0.5),("zl_rot","rotation",100001.)] {
        assert!(prepare(patch(vec![node(1,name,json!({key:value}))],vec![])).is_err());
    }
    assert!(state.parameter(1,1,"args",1.,|_,_|panic!("Structural text reached live numeric update")).is_err());
}

#[test]
fn named_bus_nodes_preserve_creation_names_and_exact_port_shapes() {
    let prepared = prepare(patch(vec![
        node(1, "send", json!({"name":"notes"})),
        node(2, "receive", json!({"name":"notes"})),
        node(3, "receive", json!({})),
    ], vec![edge(2, 0, 1, 0), edge(3, 0, 1, 0)])).unwrap();
    for (index, (kind, name)) in [(26, "notes"), (27, "notes"), (27, "")].iter().enumerate() {
        let n = prepared.native.nodes[index];
        assert_eq!(n.kind, *kind);
        assert_eq!(&n.text[..name.len()], name.as_bytes());
        assert!(n.text[name.len()..].iter().all(|b| *b == 0));
        assert_eq!((n.device, n.count, n.p0, n.p1, n.p2, n.p3, n.p4, n.p5), (0, 0, 0., 0., 0., 0., 0., 0.));
    }
    for nodes in [
        vec![node(1, "send", json!({})), node(2, "number", json!({}))],
        vec![node(1, "number", json!({})), node(2, "receive", json!({"name":"notes"}))],
    ] { assert!(prepare(patch(nodes, vec![edge(1, 0, 2, 0)])).is_err()); }
    assert!(prepare(patch(vec![node(1, "number", json!({})), node(2, "receive", json!({}))], vec![edge(1, 0, 2, 0)])).is_ok());
    let defaults = prepare(patch(vec![node(1, "send", json!({}))], vec![])).unwrap();
    assert_eq!(&defaults.native.nodes[0].text[..7], b"channel");
}

#[test]
fn named_bus_parameters_are_strict_and_structural() {
    for kind in ["send", "receive"] {
        for name in [json!("x".repeat(32)), json!("two words"), json!("a;b"), json!("a,b"), json!("a$b"), json!("a\\b"), json!("a\"b"), json!("音"), json!(1), Value::Null] {
            assert!(prepare(patch(vec![node(1, kind, json!({"name":name}))], vec![])).is_err(), "{kind}: {name}");
        }
        assert!(prepare(patch(vec![node(1, kind, json!({"name":"x".repeat(31)}))], vec![])).is_ok());
        assert!(prepare(patch(vec![node(1, kind, json!({"name":"notes", "value":1}))], vec![])).is_err());
    }
    assert!(prepare(patch(vec![node(1, "send", json!({"name":""}))], vec![])).is_err());
    let mut state = CanvasState::default();
    state.install(prepare(patch(vec![node(1, "send", json!({"name":"notes"})), node(2, "receive", json!({})), node(3, "receive", json!({"name":"notes"}))], vec![])).unwrap(), |_| true).unwrap();
    let sent = state.event(1, 1, 0, json!("set next")).unwrap();
    assert_eq!(&sent.selector[..4], b"set\0");
    assert_eq!(sent.count, 1);
    assert_eq!(sent.tags[0], 2);
    assert_eq!(&sent.symbols[0][..5], b"next\0");
    assert!(state.event(1, 2, 0, json!("set notes")).is_ok());
    assert!(state.event(1, 3, 0, json!("set next")).is_err());
    assert!(state.parameter(1, 1, "name", 1., |_, _| panic!("name reached numeric native update")).is_err());
}

#[test]
fn signal_objects_prepare_appended_ids_and_observed_defaults() {
    let names = ["sig", "signal_add", "signal_subtract", "signal_multiply", "signal_divide",
        "cycle", "phasor", "noise", "signal_clip", "line_signal", "snapshot", "signal_dac"];
    let prepared = prepare(patch(names.iter().enumerate()
        .map(|(index, name)| node(index as u32 + 1, name, json!({}))).collect(), vec![])).unwrap();
    for (index, native) in prepared.native.nodes[..names.len()].iter().enumerate() {
        assert_eq!(native.kind, index as u32 + 38, "{}", names[index]);
    }
    assert_eq!(&prepared.native.nodes[0].text[..2], b"0\0");
    for index in 1..=7 { assert_eq!(prepared.native.nodes[index].p0, 0.); }
    assert_eq!((prepared.native.nodes[8].p0, prepared.native.nodes[8].p1), (0., 0.));
    assert_eq!(&prepared.native.nodes[11].text[..4], b"1 2\0");
}

#[test]
fn signal_graph_admits_mixed_inlets_fanin_and_sampled_control_feedback() {
    let nodes = vec![node(1,"sig",json!({"args":"1 2 3."})), node(2,"signal_add",json!({})),
        node(3,"snapshot",json!({})), node(4,"number",json!({})),
        node(5,"signal_dac",json!({"channels":"2 1 2"})), node(6,"signal_dac",json!({}))];
    let prepared = prepare(patch(nodes.clone(),vec![edge(1,0,2,0),edge(1,1,2,0),
        edge(1,2,2,1),edge(4,0,2,0),edge(2,0,3,0),edge(3,0,1,0),
        edge(2,0,5,2),edge(2,0,6,1)])).unwrap();
    assert!(outlet(&prepared.native.nodes[0],2).is_some());
    assert!(outlet(&prepared.native.nodes[0],3).is_none());
    assert!(inlet(&prepared.native.nodes[4],2).is_some());
    assert!(inlet(&prepared.native.nodes[4],3).is_none());
    for invalid in [vec![edge(1,0,3,1)], vec![edge(1,0,4,0)],
        vec![edge(2,0,2,0)],vec![edge(2,0,1,0),edge(1,0,2,0)],
        vec![edge(4,0,4,0)],vec![edge(1,0,2,0),edge(1,0,2,0)]] {
        assert!(prepare(patch(nodes.clone(),invalid)).is_err());
    }
}

#[test]
fn signal_creation_layouts_are_numeric_structural_and_bounded() {
    assert!(prepare(patch(vec![node(1,"sig",json!({"args":"0 1 2 3 4 5 6 7"}))],vec![])).is_ok());
    for args in ["", "word", "0 word", "0 1 2 3 4 5 6 7 8", "100001", "$1"] {
        assert!(prepare(patch(vec![node(1,"sig",json!({"args":args}))],vec![])).is_err(),"sig {args}");
    }
    for channels in ["", "0", "3", "1.5", "left", "1 2 1 2 1 2 1 2 1"] {
        assert!(prepare(patch(vec![node(1,"signal_dac",json!({"channels":channels}))],vec![])).is_err(),"dac~ {channels}");
    }
    let mut state = CanvasState::default();
    state.install(prepare(patch(vec![node(1,"sig",json!({})),node(2,"signal_dac",json!({}))],vec![])).unwrap(),|_|true).unwrap();
    for (id,key) in [(1,"args"),(2,"channels")] {
        assert!(state.parameter(1,id,key,1.,|_,_|panic!("Structural signal layout reached live numeric update")).is_err());
    }
}

#[test]
fn signal_parameters_use_live_slots_and_reject_unrepresented_configuration() {
    let mut state = CanvasState::default();
    state.install(prepare(patch(vec![node(1,"cycle",json!({"frequency":440.})),
        node(2,"signal_multiply",json!({"rhs":0.25})),node(3,"line_signal",json!({"time":10.}))],vec![])).unwrap(),|_|true).unwrap();
    for (id,key,value,slot) in [(1,"frequency",220.,0),(1,"phase",0.25,1),
        (2,"rhs",0.5,0),(3,"time",20.,1)] {
        state.parameter(1,id,key,value,|sent_slot,sent_value| {
            assert_eq!((sent_slot,sent_value),(slot,value));true
        }).unwrap();
    }
    for (name,params) in [("cycle",json!({"frequency":100001})),
        ("cycle",json!({"buffer":"custom"})),("noise",json!({"seed":5})),
        ("line_signal",json!({"time":-1})),("snapshot",json!({"interval":-1})),
        ("sig",json!({"args":3}))] {
        assert!(prepare(patch(vec![node(1,name,params)],vec![])).is_err(),"{name}");
    }
}

#[test]
fn signal_control_and_mixed_ports_reach_the_message_bridge_but_dac_stays_signal_only() {
    let mut state = CanvasState::default();
    let prepared = prepare(patch(vec![node(1,"message",json!({"text":"seed 1"})),
        node(2,"noise",json!({})),node(3,"signal_add",json!({})),
        node(4,"signal_dac",json!({}))],vec![edge(1,0,2,0)])).unwrap();
    state.install(prepared,|_|true).unwrap();
    // The bridge validates inlet shape; native method dispatch still refuses
    // the unimplemented noise seed method without changing the running patch.
    assert_eq!(state.event(1,2,0,json!("seed 1")).unwrap().count,1);
    for port in [0,1] {
        assert_eq!(state.event(1,3,port,json!([0.5])).unwrap().values[0],0.5);
    }
    assert!(state.event(1,2,1,json!([1])).is_err());
    assert!(state.event(1,4,0,json!([1])).is_err());
}

fn hierarchy(nodes: Vec<Value>, edges: Vec<Value>) -> Value {
    json!({"version":2,"profile":"ultra-patcher-v2","nodes":nodes,"edges":edges})
}
fn patcher(id: u32, nodes: Vec<Value>, edges: Vec<Value>) -> Value {
    let mut result = node(id, "patcher", json!({"name":"basic"}));
    result["patcher"] = json!({"nodes":nodes,"edges":edges});
    result
}
fn native_edges(prepared: &Prepared) -> Vec<(u32, u32, u32, u32)> {
    prepared.native.edges[..prepared.native.edge_count as usize].iter()
        .map(|edge| (edge.from, edge.outlet, edge.to, edge.inlet)).collect()
}

#[test]
fn hierarchy_lowers_nested_boundaries_without_splicing_or_reordering_cables() {
    let prepared = prepare(hierarchy(vec![
        node(1, "bang", json!({})),
        patcher(2, vec![
            node(3, "inlet", json!({})),
            patcher(4, vec![node(5, "inlet", json!({})),
                node(6, "add", json!({"rhs":7})), node(7, "outlet", json!({}))],
                vec![edge(5, 0, 6, 0), edge(6, 0, 7, 0)]),
            node(8, "outlet", json!({})), node(9, "comment", json!({"text":"A saved note."}))
        ], vec![edge(3, 0, 4, 0), edge(4, 0, 8, 0)]),
        node(10, "number", json!({}))
    ], vec![edge(1, 0, 2, 0), edge(2, 0, 10, 0)])).unwrap();
    assert_eq!(prepared.native.nodes[..7].iter().map(|n| (n.id, n.kind)).collect::<Vec<_>>(),
        vec![(1, 0), (3, 50), (5, 50), (6, 4), (7, 51), (8, 51), (10, 2)]);
    assert_eq!(prepared.native.node_count, 7);
    assert_eq!(native_edges(&prepared), vec![
        (1, 0, 3, 0), (8, 0, 10, 0), (3, 0, 5, 0),
        (7, 0, 8, 0), (5, 0, 6, 0), (6, 0, 7, 0)]);
    for relay in prepared.native.nodes[..7].iter().filter(|n| n.kind >= 50) {
        assert_eq!((relay.device, relay.count), (0, 0));
        assert_eq!([relay.p0, relay.p1, relay.p2, relay.p3, relay.p4, relay.p5], [0.; 6]);
        assert_eq!(relay.text, [0; 128]);
    }
}

#[test]
fn hierarchy_boundary_order_uses_x_then_saved_node_order_and_ignores_y() {
    let positioned = |id, kind, x, y| {
        let mut result = node(id, kind, json!({}));
        result["x"] = json!(x);
        result["y"] = json!(y);
        result
    };
    let prepared = prepare(hierarchy(vec![node(1, "bang", json!({})),
        patcher(2, vec![positioned(4, "inlet", 200, 0), positioned(3, "inlet", 20, 300),
            positioned(5, "inlet", 20, 0), positioned(8, "outlet", 200, 0),
            positioned(7, "outlet", 20, 300), positioned(9, "outlet", 20, 0)], vec![]),
        node(10, "number", json!({})), node(11, "number", json!({})), node(12, "number", json!({}))],
        vec![edge(1, 0, 2, 0), edge(1, 0, 2, 1), edge(1, 0, 2, 2),
            edge(2, 0, 10, 0), edge(2, 1, 11, 0), edge(2, 2, 12, 0)])).unwrap();
    assert_eq!(native_edges(&prepared), vec![(1, 0, 3, 0), (1, 0, 5, 0), (1, 0, 4, 0),
        (7, 0, 10, 0), (9, 0, 11, 0), (8, 0, 12, 0)]);
}

#[test]
fn hierarchy_boundary_order_treats_negative_zero_as_the_same_position() {
    let mut first = node(3, "inlet", json!({}));
    first["x"] = json!(0.0);
    let mut second = node(4, "inlet", json!({}));
    second["x"] = json!(-0.0);
    let prepared = prepare(hierarchy(vec![node(1, "bang", json!({})),
        patcher(2, vec![first, second], vec![])],
        vec![edge(1, 0, 2, 0), edge(1, 0, 2, 1)])).unwrap();
    assert_eq!(native_edges(&prepared), vec![(1, 0, 3, 0), (1, 0, 4, 0)]);
}

#[test]
fn hierarchy_requires_global_ids_and_scope_local_wires() {
    let valid = hierarchy(vec![node(1, "bang", json!({})),
        patcher(2, vec![node(3, "inlet", json!({})), node(4, "number", json!({}))],
            vec![edge(3, 0, 4, 0)])], vec![edge(1, 0, 2, 0)]);
    assert!(prepare(valid.clone()).is_ok());
    let mut direct_child = valid.clone();
    direct_child["edges"][0]["to"] = json!(3);
    assert!(prepare(direct_child).unwrap_err().contains("scope"));
    let mut child_to_parent = valid.clone();
    child_to_parent["nodes"][1]["patcher"]["edges"][0]["to"] = json!(1);
    assert!(prepare(child_to_parent).unwrap_err().contains("scope"));
    let mut duplicate = valid.clone();
    duplicate["nodes"][1]["patcher"]["nodes"][1]["id"] = json!(1);
    assert!(prepare(duplicate).unwrap_err().contains("unique"));
    let mut duplicate_virtual = valid;
    duplicate_virtual["nodes"].as_array_mut().unwrap().push(node(2, "comment", json!({"text":"duplicate"})));
    assert!(prepare(duplicate_virtual).unwrap_err().contains("unique"));
}

#[test]
fn hierarchy_enforces_surface_ports_before_lowering_relays() {
    let valid = hierarchy(vec![node(1, "bang", json!({})),
        patcher(2, vec![node(3, "inlet", json!({})), node(4, "outlet", json!({}))],
            vec![edge(3, 0, 4, 0)]), node(5, "number", json!({}))],
        vec![edge(1, 0, 2, 0), edge(2, 0, 5, 0)]);
    assert!(prepare(valid.clone()).is_ok());
    for invalid in [edge(3, 0, 3, 0), edge(4, 0, 3, 0), edge(3, 1, 4, 0), edge(3, 0, 4, 1)] {
        let mut p = valid.clone();
        p["nodes"][1]["patcher"]["edges"] = json!([invalid]);
        assert!(prepare(p).is_err());
    }
    for (index, key) in [(0, "inlet"), (1, "outlet")] {
        let mut p = valid.clone();
        p["edges"][index][key] = json!(1);
        assert!(prepare(p).is_err());
    }
    let mut comment_wire = valid;
    comment_wire["nodes"].as_array_mut().unwrap().push(node(6, "comment", json!({"text":"note"})));
    comment_wire["edges"][1]["to"] = json!(6);
    assert!(prepare(comment_wire).is_err());
}

#[test]
fn hierarchy_schema_rejects_unknown_fields_and_inapplicable_child_patchers() {
    let valid = hierarchy(vec![patcher(1, vec![node(2, "inlet", json!({}))], vec![]),
        node(3, "comment", json!({"text":"quotes, $args; and \\\" are literal comments\n\t"}))], vec![]);
    assert!(prepare(valid.clone()).is_ok());
    for location in [vec![], vec!["nodes", "0"], vec!["nodes", "0", "patcher"]] {
        let mut p = valid.clone();
        let target = match location.len() { 0 => &mut p, 2 => &mut p["nodes"][0], _ => &mut p["nodes"][0]["patcher"] };
        target["unknown"] = json!(true);
        assert!(prepare(p).is_err());
    }
    for (kind, params) in [("patcher", json!({"name":"x","extra":0})),
        ("comment", json!({"text":"x","extra":0})), ("inlet", json!({"index":1})),
        ("outlet", json!({"index":1}))] {
        let mut n = node(1, kind, params);
        if kind == "patcher" { n["patcher"] = json!({"nodes":[],"edges":[]}); }
        assert!(prepare(hierarchy(vec![n], vec![])).is_err(), "{kind}");
    }
    assert!(prepare(hierarchy(vec![node(1, "patcher", json!({"name":"x"}))], vec![])).is_err());
    for child in [Value::Null, json!({"nodes":[],"edges":[]})] {
        let mut n = node(1, "bang", json!({}));
        n["patcher"] = child;
        assert!(prepare(hierarchy(vec![n], vec![])).is_err());
    }
    for name in ["", "x\n", "\u{7f}", "音"] {
        let mut n = patcher(1, vec![], vec![]);
        n["params"]["name"] = json!(name);
        assert!(prepare(hierarchy(vec![n], vec![])).is_err());
    }
    for text in ["x\0", "\u{7f}", "音", &"x".repeat(4097)] {
        assert!(prepare(hierarchy(vec![node(1, "comment", json!({"text":text}))], vec![])).is_err());
    }
    let mut n = patcher(1, vec![], vec![]);
    n["style"] = json!({"width":80,"bgcolor":[0.1,0.2,0.3,1]});
    assert!(prepare(hierarchy(vec![n.clone()], vec![])).is_ok());
    n["style"]["triangle"] = json!(1);
    assert!(prepare(hierarchy(vec![n], vec![])).is_err());
}

#[test]
fn hierarchy_keeps_v1_flat_and_forbids_public_v1_relays() {
    assert!(prepare(hierarchy(vec![node(1, "inlet", json!({})), node(2, "outlet", json!({}))], vec![])).is_ok());
    for kind in ["patcher", "comment", "inlet", "outlet"] {
        assert!(prepare(patch(vec![node(1, kind, json!({}))], vec![])).is_err(), "{kind}");
    }
    let mut wrong = hierarchy(vec![], vec![]);
    wrong["profile"] = json!("ultra-canvas-v1");
    assert!(prepare(wrong).is_err());
}

#[test]
fn hierarchy_authoring_bounds_count_virtual_nodes_and_allow_large_comments() {
    let comments = |count: u32, size| (1..=count).map(|id| node(id, "comment", json!({"text":"x".repeat(size)}))).collect();
    let prepared = prepare(hierarchy(comments(17, 4096), vec![])).unwrap();
    assert_eq!((prepared.native.node_count, prepared.native.edge_count), (0, 0));
    assert!(prepare(hierarchy(comments(512, 0), vec![])).is_ok());
    assert!(prepare(hierarchy(comments(513, 0), vec![])).unwrap_err().contains("512"));
    assert!(prepare(hierarchy(comments(256, 4096), vec![])).unwrap_err().contains("1 MiB"));
    let nodes = vec![node(1, "bang", json!({})), node(2, "bang", json!({}))];
    assert!(prepare(hierarchy(nodes.clone(), vec![])).is_ok());
    assert!(prepare(hierarchy(nodes, vec![edge(1, 0, 2, 0); 1025])).unwrap_err().contains("1024"));
}

#[test]
fn hierarchy_embedded_depth_is_bounded_independently_of_runtime_nodes() {
    let nested = |depth| {
        let mut child = node(depth + 1, "comment", json!({"text":"leaf"}));
        for id in (1..=depth).rev() { child = patcher(id, vec![child], vec![]); }
        hierarchy(vec![child], vec![])
    };
    assert_eq!(prepare(nested(16)).unwrap().native.node_count, 0);
    assert!(prepare(nested(17)).unwrap_err().contains("16"));
}

#[test]
fn hierarchy_reports_native_capacity_without_truncating_the_authoring_tree() {
    let leaves = |count: u32| (2..=count + 1).map(|id| node(id, "bang", json!({}))).collect();
    assert_eq!(prepare(hierarchy(vec![patcher(1, leaves(32), vec![])], vec![])).unwrap().native.node_count, 32);
    assert!(prepare(hierarchy(vec![patcher(1, leaves(33), vec![])], vec![])).unwrap_err().contains("32"));
    let nodes = (1..=12).map(|id| node(id, "bang", json!({}))).collect::<Vec<_>>();
    let edges = (1..=12).flat_map(|from| ((from + 1)..=12).map(move |to| edge(from, 0, to, 0))).collect::<Vec<_>>();
    assert_eq!(prepare(hierarchy(nodes.clone(), edges[..64].to_vec())).unwrap().native.edge_count, 64);
    assert!(prepare(hierarchy(nodes, edges[..65].to_vec())).unwrap_err().contains("64"));
}

#[test]
fn hierarchy_mixed_boundaries_allow_control_taps_and_mono_routes() {
    let valid = hierarchy(vec![node(1, "sig", json!({"args":"0.5"})),
        patcher(2, vec![node(3, "inlet", json!({})), node(4, "outlet", json!({}))], vec![edge(3, 0, 4, 0)]),
        node(5, "number", json!({})), node(6, "signal_dac", json!({}))],
        vec![edge(1, 0, 2, 0), edge(2, 0, 5, 0), edge(2, 0, 6, 0)]);
    assert!(prepare(valid.clone()).is_ok());
    let mut direct_signal = valid.clone();
    direct_signal["edges"][1]["from"] = json!(1);
    assert!(prepare(direct_signal).is_err());
    let mut stereo = valid;
    stereo["nodes"][0] = node(1, "join", json!({}));
    assert!(prepare(stereo).is_err());
}

#[test]
fn hierarchy_checks_control_and_active_signal_cycles_separately() {
    let sampled = hierarchy(vec![node(1, "sig", json!({})),
        patcher(2, vec![node(3, "inlet", json!({})), node(4, "snapshot", json!({})), node(5, "outlet", json!({}))],
            vec![edge(3, 0, 4, 0), edge(4, 0, 5, 0)])], vec![edge(1, 0, 2, 0), edge(2, 0, 1, 0)]);
    assert!(prepare(sampled).is_ok());
    let control_cycle = hierarchy(vec![patcher(1, vec![node(2, "inlet", json!({})), node(3, "outlet", json!({}))],
        vec![edge(2, 0, 3, 0)])], vec![edge(1, 0, 1, 0)]);
    assert!(prepare(control_cycle).unwrap_err().contains("Control cycles"));
    let signal_cycle = hierarchy(vec![node(1, "sig", json!({})), node(2, "signal_add", json!({})),
        patcher(3, vec![node(4, "inlet", json!({})), node(5, "outlet", json!({}))], vec![edge(4, 0, 5, 0)])],
        vec![edge(1, 0, 3, 0), edge(3, 0, 2, 0), edge(2, 0, 3, 0)]);
    assert!(prepare(signal_cycle).unwrap_err().contains("Signal cycles"));
}
#[test]
fn print_popup_parameter_is_strict_and_live() {
    let prepared = prepare(patch(vec![node(1, "print", json!({"popup":1}))], vec![])).unwrap();
    assert_eq!(prepared.native.nodes[0].p1, 1.);
    assert_eq!(prepare(patch(vec![node(1, "print", json!({}))], vec![])).unwrap().native.nodes[0].p1, 0.);
    for invalid in [json!(-1), json!(2), json!(0.5), json!(true), json!("1"), Value::Null] {
        assert!(prepare(patch(vec![node(1, "print", json!({"popup":invalid}))], vec![])).is_err());
    }
    let mut state=CanvasState::default();let revision=state.install(prepared, |_|true).unwrap();
    assert!(state.parameter(revision,1,"popup",0.,|slot,value|slot==1&&value==0.).is_ok());
    let next=prepare(patch(vec![node(1,"print",json!({"popup":1}))],vec![])).unwrap();
    assert_eq!(state.single_parameter_change(&next),Some((1,"popup",1.,false)));
    assert!(state.parameter(revision,1,"popup",1.,|_,_|false).is_err());
    assert_eq!(state.single_parameter_change(&next),Some((1,"popup",1.,false)));
}

#[test]
fn print_popup_snapshot_preserves_types_and_rejects_malformed_rows() {
    assert_eq!(std::mem::size_of::<NativeConsoleRecord>(),456);
    assert_eq!(std::mem::size_of::<NativePrintPopupObservation>(),424);
    assert_eq!(std::mem::size_of::<NativePrintPopupSnapshot>(),13592);
    let mut native=NativePrintPopupSnapshot {revision:3,frame:100,node_count:2,..Default::default()};
    native.nodes[0]=NativePrintPopupObservation {id:1,enabled:1,has_value:1,generation:7,frame:50,..Default::default()};
    native.nodes[0].message=literal("5 kiwi 2.0").unwrap();native.nodes[1].id=2;
    let snapshot=print_popup_snapshot(&native).unwrap();
    assert_eq!(snapshot.nodes[0].text,"5 kiwi 2.");assert!(snapshot.nodes[0].enabled&&snapshot.nodes[0].has_value);
    assert_eq!(snapshot.nodes[0].generation,7);assert_eq!(snapshot.nodes[0].frame,50);assert_eq!(snapshot.frame,100);
    assert_eq!(snapshot.nodes[1].text,"");assert!(!snapshot.nodes[1].has_value);
    native.nodes[0].message=literal("popup 0").unwrap();assert_eq!(print_popup_snapshot(&native).unwrap().nodes[0].text,"popup 0");
    native.nodes[0].message=NativeMessage::default();assert_eq!(print_popup_snapshot(&native).unwrap().nodes[0].text,"bang");
    let reject=|mut value:NativePrintPopupSnapshot, mutate:fn(&mut NativePrintPopupSnapshot)|{mutate(&mut value);assert!(print_popup_snapshot(&value).is_err());};
    reject(native,|n|n.node_count=33);reject(native,|n|n.reserved=1);
    reject(native,|n|n.nodes[0].enabled=2);reject(native,|n|n.nodes[0].has_value=2);reject(native,|n|n.nodes[0].reserved=1);
    reject(native,|n|n.nodes[0].enabled=0);reject(native,|n|n.nodes[0].generation=0);reject(native,|n|n.nodes[0].frame=101);
    reject(native,|n|n.nodes[1].id=1);reject(native,|n|n.nodes[0].id=0);
    reject(native,|n|n.nodes[0].message.count=9);reject(native,|n|n.nodes[0].message.selector=[b'a';32]);
    reject(native,|n|n.nodes[0].message.selector[0]=b'\n');reject(native,|n|{n.nodes[0].message.count=1;n.nodes[0].message.tags[0]=3;});
    reject(native,|n|{n.nodes[0].message.count=1;n.nodes[0].message.values[0]=f64::NAN;});
    reject(native,|n|{n.nodes[0].message.count=1;n.nodes[0].message.tags[0]=2;n.nodes[0].message.symbols[0][0]=0xff;});
    native.nodes[0].message.count=8;native.nodes[0].message.values=[f64::from_bits(1);8];native.nodes[0].message.tags=[1;8];
    let text=print_popup_snapshot(&native).unwrap().nodes.remove(0).text;assert!(text.len()>287&&text.len()<=4096);
}
#[test]
fn shared_help_shell_schema_and_lowering_cases() {
    let cases:Vec<Value>=serde_json::from_str(include_str!("../../tests/fixtures/help-shell-schema.json")).unwrap();
    for case in cases {
        let result=prepare(case["patch"].clone());
        assert_eq!(result.is_ok(),case["valid"].as_bool().unwrap(),"{}: {:?}",case["name"],result.err());
    }
    let cases:Vec<Value>=serde_json::from_str(include_str!("../../tests/fixtures/help-shell-schema.json")).unwrap();
    let prepared=prepare(cases[0]["patch"].clone()).unwrap();
    assert_eq!(prepared.native.node_count,2);assert_eq!(prepared.native.edge_count,1);
    assert_eq!(prepared.native.nodes[0].id,7);assert_eq!(prepared.native.nodes[1].id,8);
}

#[test]
fn arithmetic_help_shell_policy_pairs_retain_topology_and_no_helper_ports() {
    let cases:Vec<Value>=serde_json::from_str(include_str!("../../tests/fixtures/help-shell-schema.json")).unwrap();
    for object in ["times","plus","minus"] {
        let mut valid=cases[0]["patch"].clone();
        valid["helpShell"]["adapter"]=json!("max-help-arithmetic-three-v1");valid["helpShell"]["object"]=json!(object);
        let prepared=prepare(valid.clone()).unwrap();assert_eq!(prepared.native.node_count,2);assert_eq!(prepared.native.edge_count,1);
        assert_eq!(help_shell_object(&valid).unwrap(),Some(object.into()));
        for adapter in ["max-help-four-v1","unknown"] {
            let mut crossed=valid.clone();crossed["helpShell"]["adapter"]=json!(adapter);assert!(prepare(crossed).is_err());
        }
        let mut port=valid.clone();port["nodes"][2]["patcher"]["edges"][0]["from"]=json!(5);assert!(prepare(port).is_err());
        let mut duplicate=valid.clone();duplicate["nodes"][2]["patcher"]["nodes"][1]["params"]["role"]=json!("details");assert!(prepare(duplicate).is_err());
        let mut wrong_tab=valid.clone();wrong_tab["nodes"][2]["params"]["name"]=json!("other");assert!(prepare(wrong_tab).is_err());
        let mut question=valid.clone();question["nodes"][3]["patcher"]["nodes"]=json!([node(9,"bang",json!({}))]);assert!(prepare(question).is_err());
        let mut root_edge=valid;root_edge["edges"]=json!([edge(1,0,2,0)]);assert!(prepare(root_edge).is_err());
    }
    for object in ["append","prepend","int","float","*","+","-","unknown"] {
        let mut crossed=cases[0]["patch"].clone();crossed["helpShell"]["adapter"]=json!("max-help-arithmetic-three-v1");
        crossed["helpShell"]["object"]=json!(object);assert!(prepare(crossed).is_err());
    }
}

#[test]
fn cable_midpoints_are_bounded_authoring_only_in_flat_and_nested_documents() {
    let base=patch(vec![node(1,"bang",json!({})),node(2,"bang",json!({}))],vec![edge(1,0,2,0)]);
    for nested in [false,true] {
        let document=|mut scope:Value|{
            if nested {json!({"version":2,"profile":"ultra-patcher-v2","nodes":[{"id":3,"type":"patcher","x":10,"y":10,"params":{"name":"inner"},"patcher":{"nodes":scope["nodes"].take(),"edges":scope["edges"].take()}}],"edges":[]})}else{scope}
        };
        let plain=prepare(document(base.clone())).unwrap();
        let mut state=CanvasState::default();let revision=state.install(plain,|_|true).unwrap();
        for points in [json!([]),json!([0,4000]),json!([1.5,2,1.5,2]),json!(vec![4000.;256])] {
            let mut changed=base.clone();changed["edges"][0]["midpoints"]=points;
            let prepared=prepare(document(changed)).unwrap();assert!(state.matches(&prepared));assert_eq!(state.revision(),revision);
            assert_eq!(prepared.native.edge_count,1);assert_eq!(prepared.native.edges[0].from,1);assert_eq!(prepared.native.edges[0].to,2);
        }
        for points in [Value::Null,json!(false),json!("1,2"),json!({}),json!([1]),json!([1,2,3]),json!([-0.1,0]),json!([0,4000.1]),json!([1e308,0]),json!(["1",2]),json!([null,0]),json!(vec![0.;258])] {
            let mut changed=base.clone();changed["edges"][0]["midpoints"]=points;
            assert!(prepare(document(changed)).is_err());
        }
    }
}
