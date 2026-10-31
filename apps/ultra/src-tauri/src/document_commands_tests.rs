use super::*;

fn parameter(value: f64) -> Parameter { Parameter { node: 2, key: "value".into(), value, hot: false } }

fn numeric_patch() -> Value {
    serde_json::json!({"version":2,"profile":"ultra-patcher-v2","presentation":null,"nodes":[
        {"id":1,"type":"patcher","x":0,"y":0,"params":{"name":"numeric"},"patcher":{"presentation":null,
            "nodes":[{"id":2,"type":"number","x":0,"y":0,"params":{"value":1}}],"edges":[]}}
    ],"edges":[]})
}

fn native_numeric_state(id: u32) -> (u64, u32, Vec<(u32, f64, u64)>) {
    let status = snapshot(id);
    (status.revision, status.active, status.nodes[..status.node_count as usize].iter()
        .map(|node| (node.id, node.value, node.pulses)).collect())
}

#[test]
fn canvas_parameter_retirement_preserves_numeric_history_and_live_edits() {
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut registry = Registry::default();
    let root = registry.add("Numeric".into(), Kind::Patch, Some(numeric_patch()), None, None).unwrap();
    // Native close retains revision history; reserve distinct slots for these routes.
    registry.get_mut(&root.label).unwrap().id = 8;
    let mut audio = crate::AudioControl::default();
    let mut io = crate::audio::Driver::load(PathBuf::from("/nonexistent/ultra-param-retirement-test.json"));
    let root = registry.prepare_runtime(&root.label, |owner| admit_owned(&mut io, &mut audio.graphs[8], owner, owner.patch.as_ref().unwrap(), None, None, true)).unwrap();
    let (child, _) = registry.open_view(&root.label, 1).unwrap();
    for value in [2., 3.] {
        canvas_parameter(&mut registry, &mut audio, &mut io, &child.label, root.runtime_revision, parameter(value)).unwrap();
    }
    registry.history(&child.label, 2, "undo", |owner, patch| admit_owned(&mut io, &mut audio.graphs[8], owner, patch, None, None, false)).unwrap();
    let before = serde_json::to_value(registry.descriptor(&child.label).unwrap()).unwrap();
    let native_before = native_numeric_state(root.id);
    let views_before = registry.owner_views(&root.label).unwrap();
    let data_owner = crate::audio::tests::hold_retiring(&mut io);
    let error_owner = data_owner.clone();
    let refused = canvas_parameter(&mut registry, &mut audio, &mut io, &child.label, root.runtime_revision, parameter(4.));
    assert!(refused.as_ref().is_err_and(|error| error.contains("retirement_pending")), "numeric route passed unresolved retirement");
    assert_eq!(serde_json::to_value(registry.descriptor(&child.label).unwrap()).unwrap(), before);
    assert_eq!(native_numeric_state(root.id), native_before);
    assert_eq!(registry.owner_views(&root.label).unwrap(), views_before);
    drop(data_owner);
    assert!(canvas_parameter(&mut registry, &mut audio, &mut io, &child.label, root.runtime_revision, parameter(5.)).is_err(), "the error owner still retains the epoch");
    assert_eq!(serde_json::to_value(registry.descriptor(&child.label).unwrap()).unwrap(), before);
    assert_eq!(native_numeric_state(root.id), native_before);
    drop(error_owner);
    for (direction, value) in [("redo", 3.), ("undo", 2.), ("undo", 1.), ("redo", 2.)] {
        let base = registry.get(&root.label).unwrap().authoring_revision;
        let restored = registry.history(&child.label, base, direction, |owner, patch| admit_owned(&mut io, &mut audio.graphs[8], owner, patch, None, None, false)).unwrap();
        assert_eq!(restored.document.patch.unwrap()["nodes"][0]["patcher"]["nodes"][0]["params"]["value"].as_f64(), Some(value));
    }
    let running_owner = crate::audio::tests::hold_running(&mut io);
    assert_eq!(unsafe { crate::session::native::ultra_external_start() }, 1);
    let edited = canvas_parameter(&mut registry, &mut audio, &mut io, &child.label, root.runtime_revision, parameter(4.)).unwrap();
    assert_eq!(edited.document.runtime_revision, root.runtime_revision);
    let (mut left, mut right) = ([0.; 256], [0.; 256]);
    assert_eq!(unsafe { crate::session::native::ultra_external_render(256, left.as_mut_ptr(), right.as_mut_ptr()) }, 1);
    assert_eq!(native_numeric_state(root.id).2.iter().find(|node| node.0 == 2).unwrap().1, 4.);
    drop(running_owner);
    io.stop().unwrap();
    close_owned(&mut io, root.id).unwrap();
}

#[test]
fn canvas_parameter_retirement_blocks_revision_zero_installation() {
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut registry = Registry::default();
    let root = registry.add("Initial numeric".into(), Kind::Patch, Some(numeric_patch()), None, None).unwrap();
    registry.get_mut(&root.label).unwrap().id = 7;
    let mut audio = crate::AudioControl::default();
    let mut io = crate::audio::Driver::load(PathBuf::from("/nonexistent/ultra-param-initial-test.json"));
    let before = serde_json::to_value(registry.get(&root.label).unwrap()).unwrap();
    let native_before = native_numeric_state(7);
    let data_owner = crate::audio::tests::hold_retiring(&mut io);
    let error_owner = data_owner.clone();
    let refused = canvas_parameter(&mut registry, &mut audio, &mut io, &root.label, 0, parameter(6.));
    assert!(refused.as_ref().is_err_and(|error| error.contains("retirement_pending")), "revision-zero route installed during unresolved retirement");
    assert_eq!(serde_json::to_value(registry.get(&root.label).unwrap()).unwrap(), before);
    assert_eq!(native_numeric_state(7), native_before);
    assert_eq!(audio.graphs[7].revision(), 0);
    drop(error_owner);
    assert!(canvas_parameter(&mut registry, &mut audio, &mut io, &root.label, 0, parameter(7.)).is_err(), "the data owner still retains the epoch");
    assert_eq!(serde_json::to_value(registry.get(&root.label).unwrap()).unwrap(), before);
    assert_eq!(native_numeric_state(7), native_before);
    drop(data_owner);
    let edited = canvas_parameter(&mut registry, &mut audio, &mut io, &root.label, 0, parameter(7.)).unwrap();
    assert!(edited.accepted && edited.document.runtime_revision > 0 && edited.document.can_undo);
    assert_eq!(edited.document.authoring_revision, 1);
    assert_eq!(native_numeric_state(7).2.iter().find(|node| node.0 == 2).unwrap().1, 7.);
    assert!(canvas_parameter(&mut registry, &mut audio, &mut io, &root.label, 0, parameter(8.)).err().unwrap().contains("Stale canvas revision"));
    let unknown = Parameter { node: 99, ..parameter(8.) };
    assert!(canvas_parameter(&mut registry, &mut audio, &mut io, &root.label, edited.document.runtime_revision, unknown).err().unwrap().contains("Unknown canvas node"));
    let restored = registry.history(&root.label, 1, "undo", |owner, patch| admit_owned(&mut io, &mut audio.graphs[7], owner, patch, None, None, false)).unwrap();
    assert_eq!(restored.document.patch.unwrap(), numeric_patch());
    close_owned(&mut io, 7).unwrap();
}

#[test]
fn retiring_ultra_owner_refuses_admission_history_and_root_close() {
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut registry = Registry::default();
    let patch = serde_json::json!({"version":2,"profile":"ultra-patcher-v2","presentation":null,"nodes":[],"edges":[]});
    let root = registry.add("Retained".into(), Kind::Patch, Some(patch.clone()), None, None).unwrap();
    registry.get_mut(&root.label).unwrap().id = 9;
    let mut control = canvas::CanvasState::default();
    let mut io = crate::audio::Driver::load(PathBuf::from("/nonexistent/ultra-retirement-test.json"));
    let root = registry.prepare_runtime(&root.label, |owner| admit_owned(&mut io, &mut control, owner, &patch, None, None, true)).unwrap();
    let mut edited = patch.clone();
    edited["nodes"] = serde_json::json!([{"id":1,"type":"number","x":0,"y":0,"params":{"value":3}}]);
    registry.commit(&root.label, 0, edited.clone(), true, |owner, patch| admit_owned(&mut io, &mut control, owner, patch, None, None, false)).unwrap();
    let before = serde_json::to_value(registry.get(&root.label).unwrap()).unwrap();
    let revision = control.revision();
    let closure = crate::audio::tests::hold_retiring(&mut io);
    let error_closure = closure.clone();
    let result = registry.commit(&root.label, 1, patch.clone(), true, |owner, patch| admit_owned(&mut io, &mut control, owner, patch, None, None, false));
    assert!(result.is_err(), "native replacement passed unresolved retirement");
    assert!(registry.history(&root.label, 1, "undo", |owner, patch| admit_owned(&mut io, &mut control, owner, patch, None, None, false)).is_err());
    assert!(close_owned(&mut io, root.id).is_err(), "native root close passed unresolved retirement");
    assert_eq!(serde_json::to_value(registry.get(&root.label).unwrap()).unwrap(), before);
    assert_eq!(control.revision(), revision);
    drop(closure);
    assert!(close_owned(&mut io, root.id).is_err(), "the remaining error closure still owns the epoch");
    drop(error_closure);
    close_owned(&mut io, root.id).unwrap();
}

#[test]
fn retiring_ultra_owner_refuses_root_close_independently() {
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut io = crate::audio::Driver::load(PathBuf::from("/nonexistent/ultra-close-retirement-test.json"));
    let closure = crate::audio::tests::hold_retiring(&mut io);
    let error_closure = closure.clone();
    drop(error_closure);
    let result = close_owned(&mut io, 14);
    drop(closure);
    assert!(result.is_err(), "root close must consult the closure witness even for an empty slot");
}

#[test]
fn running_ultra_owner_keeps_live_authoring_available() {
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut registry = Registry::default();
    let patch = documents::empty_patch();
    let root = registry.add("Live".into(), Kind::Patch, Some(patch.clone()), None, None).unwrap();
    registry.get_mut(&root.label).unwrap().id = 10;
    let mut control = canvas::CanvasState::default();
    let mut io = crate::audio::Driver::load(PathBuf::from("/nonexistent/ultra-live-test.json"));
    let closure = crate::audio::tests::hold_running(&mut io);
    assert_eq!(unsafe { crate::session::native::ultra_external_start() }, 1);
    let accepted = registry.prepare_runtime(&root.label, |owner| admit_owned(&mut io, &mut control, owner, &patch, None, None, true));
    let accepted = accepted.unwrap();
    assert!(close_owned(&mut io, accepted.id).is_ok());
    drop(closure);
    io.stop().unwrap();
}

fn snapshot(id: u32) -> canvas::NativeStatus {
    let mut status = canvas::NativeStatus::default();
    unsafe { crate::ultra_canvas_status_document(id, &mut status); }
    status
}

#[test]
fn arithmetic_shared_rhs_history_retains_hot_state_and_mode_history_reinstalls() {
    let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut registry=Registry::default();
    let patch=serde_json::json!({"version":2,"profile":"ultra-patcher-v2","presentation":null,"nodes":[
        {"id":1,"type":"patcher","x":0,"y":0,"params":{"name":"arithmetic"},"patcher":{"presentation":null,"nodes":[
            {"id":2,"type":"multiply","x":0,"y":0,"params":{"rhs":2,"numericmode":1}},
            {"id":3,"type":"print","x":100,"y":0,"params":{"label":"product","popup":1}},
            {"id":4,"type":"number","x":200,"y":0,"params":{"value":0}}
        ],"edges":[{"from":2,"outlet":0,"to":3,"inlet":0}]}}
    ],"edges":[]});
    let root=registry.add("Arithmetic".into(),Kind::Patch,Some(patch),None,None).unwrap();
    // Native close retains revision history; keep this test's slot distinct.
    registry.get_mut(&root.label).unwrap().id=15;
    let mut control=canvas::CanvasState::default();
    let root=registry.prepare_runtime(&root.label,|owner|admit(&mut control,owner,owner.patch.as_ref().unwrap(),None,true)).unwrap();
    let (child,_)=registry.open_view(&root.label,1).unwrap();
    registry.prepare_runtime(&child.label,|_|panic!("child reinstalled arithmetic runtime")).unwrap();
    let send=|control:&canvas::CanvasState,node,inlet,value| {
        let event=control.event(control.revision(),node,inlet,value).unwrap();
        assert_eq!(unsafe {crate::ultra_canvas_message_document(root.id,control.revision(),node,inlet,&event)},1);
    };
    let output=|| {
        let mut raw=canvas::NativePrintPopupSnapshot::default();assert_eq!(unsafe {crate::ultra_canvas_print_popups_document(root.id,&mut raw)},1);
        canvas::print_popup_snapshot(&raw).unwrap().nodes.remove(0)
    };
    let independent=||snapshot(root.id).nodes[..3].iter().find(|node|node.id==4).unwrap().value;
    send(&control,2,0,serde_json::json!("7"));send(&control,4,0,serde_json::json!("37.5"));
    assert_eq!(output().text,"14");
    assert_eq!(unsafe {crate::ultra_canvas_param_hot_document(root.id,root.runtime_revision,2,1,2.,0)},0,"raw native mode edit must refuse");
    assert_eq!(unsafe {crate::ultra_canvas_param_hot_document(root.id,root.runtime_revision,2,0,0.5,0)},0,"raw fractional integer rhs must refuse");
    let original=root.patch.clone().unwrap();let mut rhs=original.clone();rhs["nodes"][0]["patcher"]["nodes"][0]["params"]["rhs"]=serde_json::json!(3);
    let changed=registry.commit(&child.label,0,rhs.clone(),true,|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
    assert_eq!(changed.runtime_revision,root.runtime_revision);
    assert_eq!(output().text,"14","cold rhs commit must retain the existing receipt");
    let verify=|control:&canvas::CanvasState,text:&str| {
        assert_eq!(control.revision(),root.runtime_revision);assert_eq!(independent(),37.5);
        send(control,2,0,Value::Null);assert_eq!(output().text,text);
    };
    verify(&control,"21");
    for (view,revision,direction,expected,text) in [(&root.label,1,"undo",original,"14"),(&child.label,2,"redo",rhs.clone(),"21")] {
        let updated=registry.history(view,revision,direction,|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
        assert_eq!(updated.runtime_revision,root.runtime_revision);verify(&control,text);
        for label in [&root.label,&child.label] {assert_eq!(registry.descriptor(label).unwrap().patch,Some(expected.clone()));}
    }
    let mut floating=rhs.clone();floating["nodes"][0]["patcher"]["nodes"][0]["params"]["numericmode"]=serde_json::json!(2);
    let changed=registry.commit(&root.label,3,floating.clone(),true,|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
    assert!(changed.runtime_revision>root.runtime_revision);assert_eq!(independent(),0.);
    let stale=canvas::NativeMessage::default();assert_eq!(unsafe {crate::ultra_canvas_message_document(root.id,root.runtime_revision,2,0,&stale)},0);
    send(&control,2,0,serde_json::json!("3.75"));assert_eq!(output().text,"11.25");
    let mut runtime_revision=changed.runtime_revision;
    for (view,revision,direction,expected,text) in [(&child.label,4,"undo",rhs,"0"),(&root.label,5,"redo",floating,"0.")] {
        let updated=registry.history(view,revision,direction,|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
        assert!(updated.runtime_revision>runtime_revision);runtime_revision=updated.runtime_revision;
        send(&control,2,0,Value::Null);assert_eq!(output().text,text);
        for label in [&root.label,&child.label] {let view=registry.descriptor(label).unwrap();assert_eq!(view.runtime_revision,runtime_revision);assert_eq!(view.patch,Some(expected.clone()));}
    }
    assert_eq!(unsafe {crate::ultra_canvas_close_document(root.id)},1);
}

#[test]
fn cable_midpoints_owner_commits_and_history_preserve_fresh_native_recall() {
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut registry = Registry::default();
    let patch = serde_json::json!({"version":2,"profile":"ultra-patcher-v2","presentation":null,"nodes":[
        {"id":1,"type":"patcher","x":0,"y":0,"params":{"name":"child"},"patcher":{"presentation":null,"nodes":[
            {"id":2,"type":"number","x":10,"y":10,"params":{"value":1}},
            {"id":3,"type":"number","x":100,"y":100,"params":{"value":0}},
            {"id":4,"type":"message_box","x":150,"y":0,"params":{"text":"saved $1"}},
            {"id":5,"type":"print","x":150,"y":100,"params":{"label":"cord","popup":1}}
        ],"edges":[
            {"from":2,"outlet":0,"to":3,"inlet":0,"midpoints":[30.5,40,30.5,40]},
            {"from":2,"outlet":0,"to":5,"inlet":0}
        ]}}
    ],"edges":[]});
    let root = registry.add("Cables".into(), Kind::Patch, Some(patch), None, None).unwrap();
    registry.get_mut(&root.label).unwrap().id = 14;
    let mut control = canvas::CanvasState::default();
    let root = registry.prepare_runtime(&root.label, |owner| admit(&mut control, owner, owner.patch.as_ref().unwrap(), None, true)).unwrap();
    let (child, _) = registry.open_view(&root.label, 1).unwrap();
    registry.prepare_runtime(&child.label, |_| panic!("child reinstalled runtime")).unwrap();
    let send = |control: &canvas::CanvasState, node, inlet, value| {
        let event = control.event(root.runtime_revision, node, inlet, value).unwrap();
        assert_eq!(unsafe {crate::ultra_canvas_message_document(root.id, root.runtime_revision, node, inlet, &event)}, 1);
    };
    let print = || {
        let mut raw = canvas::NativePrintPopupSnapshot::default();
        assert_eq!(unsafe {crate::ultra_canvas_print_popups_document(root.id, &mut raw)}, 1);
        canvas::print_popup_snapshot(&raw).unwrap().nodes.remove(0)
    };
    let sink = || snapshot(root.id).nodes[..4].iter().find(|node| node.id == 3).copied().unwrap();
    send(&control, 2, 0, serde_json::json!([77]));
    send(&control, 4, 1, serde_json::json!("live $1"));
    let mut generation = print().generation;
    assert_eq!(sink().value, 77.);
    let verify_live = |control: &canvas::CanvasState, generation| {
        assert_eq!(control.revision(), root.runtime_revision);
        let mut text = canvas::NativeMessageBoxSnapshot::default();
        assert_eq!(unsafe {crate::ultra_canvas_message_boxes_document(root.id, &mut text)}, 1);
        assert_eq!(canvas::message_box_snapshot(&text).unwrap().nodes[0].text, "live $1");
        let receipt = print();
        assert!(receipt.enabled && receipt.has_value);
        assert_eq!(receipt.text, "77");
        assert_eq!(receipt.generation, generation, "geometry must retain the existing Print receipt");
        // Clear the sink, then recall the source: stale display state cannot pass.
        send(control, 3, 0, serde_json::json!([0]));
        let before = sink();
        assert_eq!(before.value, 0.);
        send(control, 2, 0, Value::Null);
        assert_eq!(sink().value, 77.);
        assert_eq!(sink().pulses, before.pulses + 1);
        assert_eq!(print().generation, generation + 1);
        generation + 1
    };
    let mut revision = 0;
    for (author, undo_view, redo_view, points) in [
        (&child.label, &root.label, &child.label, serde_json::json!([40.5,45,40.5,45])),
        (&root.label, &child.label, &root.label, serde_json::json!([60.5,65,60.5,65])),
    ] {
        let previous = registry.descriptor(&root.label).unwrap().patch.unwrap();
        let mut edited = previous.clone();
        edited["nodes"][0]["patcher"]["edges"][0]["midpoints"] = points;
        let committed = registry.commit(author, revision, edited.clone(), true, |owner, patch| admit(&mut control, owner, patch, None, false)).unwrap();
        assert!(committed.accepted);
        revision += 1;
        assert_eq!(committed.document.runtime_revision, root.runtime_revision);
        assert_eq!(committed.document.authoring_revision, revision);
        assert_eq!(registry.descriptor(&root.label).unwrap().patch, Some(edited.clone()));
        assert_eq!(registry.descriptor(&child.label).unwrap().patch, Some(edited.clone()));
        assert!(!registry.commit(undo_view, revision - 1, previous.clone(), true, |_, _| panic!("stale geometry CAS reached admission")).unwrap().accepted);
        generation = verify_live(&control, generation);
        for (view, direction, expected) in [(undo_view, "undo", previous), (redo_view, "redo", edited)] {
            let result = registry.history(view, revision, direction, |owner, patch| admit(&mut control, owner, patch, None, false)).unwrap();
            assert!(result.accepted);
            revision += 1;
            assert_eq!(result.document.authoring_revision, revision);
            assert_eq!(result.document.runtime_revision, root.runtime_revision);
            for label in [&root.label, &child.label] {
                let descriptor = registry.descriptor(label).unwrap();
                assert_eq!(descriptor.runtime_revision, root.runtime_revision);
                assert_eq!(descriptor.patch, Some(expected.clone()));
            }
            generation = verify_live(&control, generation);
        }
    }
    assert_eq!(unsafe {crate::ultra_canvas_close_document(root.id)}, 1);
}

#[test]
fn forced_graph_installs_cannot_silently_ignore_message_text_intent() {
    let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut registry=Registry::default();
    let owner=registry.add("Hint".into(),Kind::Patch,Some(documents::empty_patch()),None,None).unwrap();
    let mut control=canvas::CanvasState::default();
    let hint=MessageText { node:99,text:"ignored".into() };
    assert!(admit_message(&mut control,&owner,owner.patch.as_ref().unwrap(),None,Some(&hint),true).is_err());
    assert_eq!(control.revision(),0);
}

#[test]
fn message_box_shared_restore_history_and_child_view_serials() {
    let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut registry=Registry::default();
    let patch=serde_json::json!({"version":2,"profile":"ultra-patcher-v2","presentation":null,"nodes":[
        {"id":1,"type":"patcher","x":0,"y":0,"params":{"name":"child"},"patcher":{"presentation":null,"nodes":[
            {"id":2,"type":"message_box","x":0,"y":0,"params":{"text":"saved $1 $2"}},
            {"id":3,"type":"number","x":100,"y":0,"params":{"value":0}}
        ],"edges":[]}}
    ],"edges":[]});
    let root=registry.add("Messages".into(),Kind::Patch,Some(patch),None,None).unwrap();
    registry.get_mut(&root.label).unwrap().id=13;
    let mut control=canvas::CanvasState::default();
    let root=registry.prepare_runtime(&root.label,|owner|admit(&mut control,owner,owner.patch.as_ref().unwrap(),None,true)).unwrap();
    let (child,_)=registry.open_view(&root.label,1).unwrap();
    let read=|| { let mut raw=canvas::NativeMessageBoxSnapshot::default();assert_eq!(unsafe {crate::ultra_canvas_message_boxes_document(root.id,&mut raw)},1);canvas::message_box_snapshot(&raw).unwrap() };
    let cold=control.event(root.runtime_revision,2,1,serde_json::json!("new $1 $2")).unwrap();
    assert_eq!(unsafe {crate::ultra_canvas_message_document(root.id,root.runtime_revision,2,1,&cold)},1);
    assert_eq!(read().nodes[0].text,"new $1 $2");assert!(!registry.descriptor(&child.label).unwrap().dirty);
    let hint=MessageText {node:2,text:"saved $1 $2".into()};
    let restored=registry.commit(&child.label,0,root.patch.clone().unwrap(),true,|owner,patch|admit_message(&mut control,owner,patch,None,Some(&hint),false)).unwrap().document;
    assert_eq!(restored.authoring_revision,0);assert!(!restored.can_undo&&!restored.dirty);
    assert_eq!(restored.message_text_serial,1);assert_eq!(read().text_edit_serial,1);assert_eq!(read().nodes[0].text,"saved $1 $2");
    assert_eq!(registry.descriptor(&root.label).unwrap().message_text_serial,1);
    let mut edited=root.patch.clone().unwrap();edited["nodes"][0]["patcher"]["nodes"][0]["params"]["text"]=serde_json::json!("fresh $1");
    let updated=registry.commit(&root.label,0,edited.clone(),true,|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
    assert_eq!(updated.message_text_serial,2);assert_eq!(updated.runtime_revision,root.runtime_revision);
    assert!(!registry.commit(&child.label,0,edited.clone(),true,|_,_|panic!("stale CAS reached admission")).unwrap().accepted);
    let undone=registry.history(&child.label,1,"undo",|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
    assert_eq!(undone.message_text_serial,3);assert_eq!(read().nodes[0].text,"saved $1 $2");
    let redone=registry.history(&root.label,2,"redo",|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
    assert_eq!(redone.message_text_serial,4);assert_eq!(read().nodes[0].text,"fresh $1");
    edited["nodes"][0]["patcher"]["nodes"][1]["params"]["value"]=serde_json::json!(8);
    assert!(registry.commit(&root.label,3,edited,true,|owner,patch|admit_message(&mut control,owner,patch,None,Some(&hint),false)).is_err());
    assert_eq!(read().text_edit_serial,4);
    assert_eq!(unsafe {crate::ultra_canvas_close_document(root.id)},1);
}

#[test]
fn integer_number_shared_edits_and_history_keep_runtime_and_tab_independent() {
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut registry = Registry::default();
    let patch = serde_json::json!({"version":2,"profile":"ultra-patcher-v2","presentation":null,"nodes":[
        {"id":1,"type":"number_int","x":0,"y":0,"params":{"value":1}},
        {"id":2,"type":"number","x":100,"y":0,"params":{"value":0}},
        {"id":3,"type":"number","x":200,"y":0,"params":{"value":0}}
    ],"edges":[{"from":1,"outlet":0,"to":2,"inlet":0}]});
    let root = registry.add("Integer".into(), Kind::Patch, Some(patch), None, None).unwrap();
    registry.get_mut(&root.label).unwrap().id = 12;
    let mut control = canvas::CanvasState::default();
    let root = registry.prepare_runtime(&root.label, |owner| admit(&mut control, owner, owner.patch.as_ref().unwrap(), None, true)).unwrap();
    let independent = control.event(root.runtime_revision,3,0,serde_json::json!([37.5])).unwrap();
    assert_eq!(unsafe {crate::ultra_canvas_message_document(root.id,root.runtime_revision,3,0,&independent)},1);
    let mut edited = root.patch.unwrap();edited["nodes"][0]["params"]["value"] = serde_json::json!(4);
    let updated = registry.commit(&root.label,0,edited,true,|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
    assert_eq!(updated.runtime_revision,root.runtime_revision);
    assert_eq!(snapshot(root.id).nodes[1].value,4.);
    assert_eq!(unsafe {crate::ultra_canvas_tab_document(root.id,root.runtime_revision,1)},1);
    assert_eq!(snapshot(root.id).nodes[0].value,4.);
    let undone = registry.history(&root.label,1,"undo",|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
    assert_eq!(undone.runtime_revision,root.runtime_revision);
    assert_eq!(snapshot(root.id).nodes[1].value,1.);
    let redone = registry.history(&root.label,2,"redo",|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
    assert_eq!(redone.runtime_revision,root.runtime_revision);
    assert_eq!(snapshot(root.id).nodes[1].value,4.);
    assert_eq!(snapshot(root.id).nodes[2].value,37.5);
    assert_eq!(unsafe {crate::ultra_canvas_close_document(root.id)},1);
    assert_eq!(unsafe {crate::ultra_canvas_tab_document(root.id,root.runtime_revision,1)},0);
}

#[test]
fn shared_admission_preserves_live_state_and_uses_atomic_hot_numeric_updates() {
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut registry = Registry::default();
    let patch = serde_json::json!({"version":2,"profile":"ultra-patcher-v2","presentation":null,"nodes":[
        {"id":1,"type":"patcher","x":0,"y":0,"params":{"name":"child"},"patcher":{"presentation":null,"nodes":[
            {"id":2,"type":"number","x":0,"y":0,"params":{"value":1}},
            {"id":3,"type":"number","x":50,"y":0,"params":{"value":0}}
        ],"edges":[{"from":2,"outlet":0,"to":3,"inlet":0}]}}
    ],"edges":[]});
    let root = registry.add("Owner".into(), Kind::Patch, Some(patch), None, None).unwrap();
    registry.get_mut(&root.label).unwrap().id = 11;
    let mut control = canvas::CanvasState::default();
    let root = registry.prepare_runtime(&root.label, |owner| admit(&mut control, owner, owner.patch.as_ref().unwrap(), None, true)).unwrap();
    let (child, _) = registry.open_view(&root.label, 1).unwrap();
    registry.prepare_runtime(&child.label, |_| panic!("child reinstalled runtime")).unwrap();
    let event = control.event(root.runtime_revision, 2, 0, serde_json::json!([7])).unwrap();
    assert_eq!(unsafe { crate::ultra_canvas_message_document(root.id, root.runtime_revision, 2, 0, &event) }, 1);
    let before = snapshot(root.id);
    let source = |status: &canvas::NativeStatus| status.nodes[..status.node_count as usize].iter().find(|node| node.id == 3).copied().unwrap();
    assert_eq!(source(&before).value, 7.);

    let mut geometry = root.patch.unwrap();
    geometry["nodes"][0]["params"]["name"] = serde_json::json!("renamed");
    geometry["nodes"][0]["patcher"]["nodes"][0]["y"] = serde_json::json!(90);
    let moved = registry.commit(&child.label, 0, geometry.clone(), true, |owner, patch| admit(&mut control, owner, patch, None, false)).unwrap().document;
    assert_eq!(moved.runtime_revision, root.runtime_revision);
    assert_eq!(moved.view_title, "renamed");
    let after = snapshot(root.id);
    assert_eq!(source(&after).value, 7.);
    assert_eq!(source(&after).pulses, source(&before).pulses);

    let same_value = Parameter { node:2, key:"value".into(), value:1., hot:true };
    let reapplied = registry.commit(&child.label, 1, geometry.clone(), true, |owner, patch| admit(&mut control, owner, patch, Some(&same_value), false)).unwrap();
    assert_eq!(reapplied.document.authoring_revision, 1);
    assert_eq!(source(&snapshot(root.id)).value, 1., "a hot edit must emit even when authoring value is unchanged");

    let mut numeric = geometry.clone();
    numeric["nodes"][0]["patcher"]["nodes"][0]["params"]["value"] = serde_json::json!(4);
    let parameter = Parameter { node:2, key:"value".into(), value:4., hot:true };
    let changed = registry.commit(&child.label, 1, numeric.clone(), true, |owner, patch| admit(&mut control, owner, patch, Some(&parameter), false)).unwrap().document;
    assert_eq!(changed.runtime_revision, root.runtime_revision);
    let after = snapshot(root.id);
    assert_eq!(source(&after).value, 4.);
    assert_eq!(source(&after).pulses, source(&before).pulses + 2);

    let undo = registry.history(&root.label, 2, "undo", |owner, patch| admit(&mut control, owner, patch, None, false)).unwrap().document;
    assert_eq!(undo.runtime_revision, root.runtime_revision, "single numeric undo must not reinstall the graph");
    assert_eq!(source(&snapshot(root.id)).value, 1.);
    let redo = registry.history(&child.label, 3, "redo", |owner, patch| admit(&mut control, owner, patch, None, false)).unwrap().document;
    assert_eq!(redo.runtime_revision, root.runtime_revision);
    assert_eq!(source(&snapshot(root.id)).value, 4.);

    let mut dishonest = numeric.clone();
    dishonest["nodes"][0]["patcher"]["nodes"][0]["params"]["value"] = serde_json::json!(5);
    dishonest["nodes"][0]["patcher"]["nodes"][1]["params"]["value"] = serde_json::json!(6);
    let parameter = Parameter { node:2, key:"value".into(), value:5., hot:true };
    assert!(registry.commit(&child.label, 4, dishonest, true, |owner, patch| admit(&mut control, owner, patch, Some(&parameter), false)).is_err());
    assert_eq!(registry.get(&root.label).unwrap().patch, Some(numeric));
    assert_eq!(source(&snapshot(root.id)).value, 4.);
    assert_eq!(unsafe { crate::ultra_canvas_close_document(root.id) }, 1);
    registry.remove(&root.label);

    // A new owner can reuse the slot and identical content, but must install it.
    let replacement = registry.add("Replacement".into(), Kind::Patch, Some(geometry), None, None).unwrap();
    registry.get_mut(&replacement.label).unwrap().id = 11;
    let replacement = registry.prepare_runtime(&replacement.label, |owner| admit(&mut control, owner, owner.patch.as_ref().unwrap(), None, true)).unwrap();
    assert!(replacement.runtime_revision > root.runtime_revision);
    assert_eq!(snapshot(root.id).active, 1);
    assert_eq!(unsafe { crate::ultra_canvas_close_document(root.id) }, 1);
}

#[test]
fn saved_presentation_shared_history_and_reopen_preserve_native_runtime_and_receipts(){
    const NAME:&str="document_windows::commands::tests::saved_presentation_shared_history_and_reopen_preserve_native_runtime_and_receipts";
    if std::env::var("ULTRA_PRESENTATION_HISTORY_TEST_PROCESS").as_deref()!=Ok("1"){
        let child=std::process::Command::new(std::env::current_exe().unwrap()).args(["--exact",NAME,"--nocapture"])
            .env("ULTRA_PRESENTATION_HISTORY_TEST_PROCESS","1").output().unwrap();
        assert!(child.status.success(),"{}\n{}",String::from_utf8_lossy(&child.stdout),String::from_utf8_lossy(&child.stderr));return;
    }
    let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut registry=Registry::default();
    let root=registry.add("Surface".into(),Kind::Patch,Some(numeric_patch()),None,None).unwrap();
    registry.get_mut(&root.label).unwrap().id=14;
    let mut control=canvas::CanvasState::default();
    let root=registry.prepare_runtime(&root.label,|owner|admit(&mut control,owner,owner.patch.as_ref().unwrap(),None,true)).unwrap();
    let (child,_)=registry.open_view(&root.label,1).unwrap();
    let message=control.event(root.runtime_revision,2,0,serde_json::json!([87])).unwrap();
    assert_eq!(unsafe{crate::ultra_canvas_message_document(root.id,root.runtime_revision,2,0,&message)},1);
    let native_before=native_numeric_state(root.id);
    let mut edited=root.patch.clone().unwrap();
    edited["presentation"]=serde_json::json!({"version":1,"openOnLoad":false,"size":{"width":640,"height":120},"items":[{
        "id":"value","kind":"control","target":{"kind":"parameter","node":2,"param":"value"},"widget":"number","label":"Value",
        "rect":{"x":8,"y":8,"width":100,"height":80},"included":true,"visible":true,"style":{"accent":"cyan","labelPosition":"above"}}]});
    let committed=registry.commit(&child.label,0,edited.clone(),true,|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
    assert_eq!(committed.runtime_revision,root.runtime_revision);assert!(committed.dirty);
    assert_eq!(native_numeric_state(root.id),native_before,"metadata commit reinstalled DSP or reset a live receipt");
    for (base,direction,expected) in [(1,"undo",root.patch.unwrap()),(2,"redo",edited.clone())]{
        let result=registry.history(&root.label,base,direction,|owner,patch|admit(&mut control,owner,patch,None,false)).unwrap().document;
        assert_eq!(result.runtime_revision,root.runtime_revision);assert_eq!(native_numeric_state(root.id),native_before);
        assert_eq!(registry.descriptor(&child.label).unwrap().patch,Some(expected));
    }
    let folder=std::env::temp_dir().join(format!("alive-saved-presentation-{}",std::process::id()));std::fs::create_dir_all(&folder).unwrap();
    let file=folder.join("saved.ultra");documents::save_patch(&file,&edited).unwrap();
    assert_eq!(documents::read_patch(&file).unwrap().patch,Some(edited));std::fs::remove_dir_all(folder).unwrap();
    assert_eq!(unsafe{crate::ultra_canvas_close_document(root.id)},1);
}
