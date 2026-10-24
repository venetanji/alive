use super::*;

#[test]
fn native_v3_layout_matches_fixed_c_interface() {
    use std::mem::{align_of, offset_of, size_of};
    assert_eq!(size_of::<native::TrackV3>(), 56);
    assert_eq!(size_of::<native::ClipV3>(), 88);
    assert_eq!(size_of::<native::ConfigV3>(), 47232);
    assert_eq!(size_of::<native::TrackActionV3>(), 8);
    assert_eq!(size_of::<native::RequestV3>(), 112);
    assert_eq!(size_of::<native::ReceiptV3>(), 80);
    assert_eq!(size_of::<native::WorkV3>(), 32);
    assert_eq!(size_of::<native::LimitsV3>(), 224);
    assert_eq!(size_of::<native::DiagnosticV3>(), 120);
    assert_eq!(size_of::<native::TrackStateV3>(), 88);
    assert_eq!(size_of::<native::StateV3>(), 16592);
    assert_eq!(align_of::<native::ConfigV3>(), 8);
    assert_eq!(align_of::<native::StateV3>(), 8);
    assert_eq!(offset_of!(native::ConfigV3, preparation_revision), 40);
    assert_eq!(offset_of!(native::ConfigV3, tracks), 64);
    assert_eq!(offset_of!(native::ConfigV3, devices), 512);
    assert_eq!(offset_of!(native::ConfigV3, clips), 11648);
    assert_eq!(offset_of!(native::ConfigV3, events), 14464);
    assert_eq!(offset_of!(native::RequestV3, tracks), 48);
    assert_eq!(offset_of!(native::StateV3, tracks), 144);
    assert_eq!(offset_of!(native::StateV3, devices), 848);
    assert_eq!(offset_of!(native::StateV3, receipts), 6352);
}
use std::path::Path;

fn example_path() -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive")
}
fn example() -> Session {
    read(&example_path()).unwrap().document
}

fn capacity_document() -> Session {
    let mut value = serde_json::to_value(example().to_clips().unwrap()).unwrap();
    let original = value["tracks"][0].clone();
    let mut tracks = Vec::new();
    for index in 0..8 {
        let mut track = original.clone();
        track["id"] = format!("capacity-track-{index}").into();
        track["name"] = format!("Capacity {}", index + 1).into();
        track["device"]["instanceId"] = format!("capacity-instrument-{index}").into();
        track["gain"] = serde_json::json!(0.125);
        track["defaultClipId"] = format!("capacity-clip-{index}").into();
        track["slots"][0]["id"] = format!("capacity-clip-{index}").into();
        track["slots"][0]["notes"] = serde_json::json!((0..4).map(|voice| serde_json::json!({
            "id": format!("capacity-note-{index}-{voice}"), "beat": 0., "duration": 8.,
            "pitch": 60 + voice, "velocity": 90
        })).collect::<Vec<_>>());
        track["slots"][0]["automation"] = serde_json::json!([]);
        let effects = if index < 4 { vec!["utility", "stereo-lowpass"] } else { vec![] };
        track["effects"] = serde_json::Value::Array(effects.into_iter().enumerate().map(|(position, name)| {
            let path = Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("../examples/{name}.ultra"));
            let patch = crate::documents::read_patch(&path).unwrap().patch.unwrap();
            serde_json::json!({"instanceId": format!("capacity-effect-{index}-{position}"),
                "path": path, "id": patch["device"]["id"], "version": patch["device"]["version"],
                "sourceSha256": prepare::fingerprint(&patch).unwrap(), "bypassed": false, "parameters": {}})
        }).collect());
        tracks.push(track);
    }
    value["tracks"] = tracks.into();
    serde_json::from_value(value).unwrap()
}

#[test]
fn v3_eight_track_host_roundtrip_and_mixer() {
    const NAME: &str = "session::tests::v3_eight_track_host_roundtrip_and_mixer";
    if std::env::var("ALIVE_CAPACITY_HOST_CHILD").as_deref() != Ok("1") {
        let child = std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", NAME, "--nocapture"]).env("ALIVE_CAPACITY_HOST_CHILD", "1")
            .env_remove("DISPLAY").env_remove("WAYLAND_DISPLAY").output().unwrap();
        assert!(child.status.success(), "{}\n{}", String::from_utf8_lossy(&child.stdout), String::from_utf8_lossy(&child.stderr));
        return;
    }
    let document = capacity_document();
    let prepared = prepare(&document, &example_path()).unwrap();
    assert_eq!((prepared.tracks.len(), prepared.devices.len(), prepared.events.len()), (8, 16, 32));
    let mut host = host::Host::default();
    host.install(prepared).unwrap();
    let mut runtime = runtime::Runtime::default();
    assert_eq!(unsafe { native::ultra_external_start() }, 1);
    runtime.request(&host, native::RequestV3 { kind: native::V3_START, ..Default::default() }, None, None).unwrap();
    let mut left = [0f32; 1024]; let mut right = left;
    assert_eq!(unsafe { native::ultra_external_render(1024, left.as_mut_ptr(), right.as_mut_ptr()) }, 1);
    let (state, _) = runtime.poll(&host).unwrap();
    assert_eq!(state["tracks"].as_array().unwrap().len(), 8);
    assert_eq!(state["devices"].as_array().unwrap().len(), 16);
    for index in 0..8 {
        assert_eq!(state["tracks"][index]["activeVoices"], 4);
        host.mixer(index, 0.1 + index as f64 * 0.01, index == 3, index == 7).unwrap();
    }
    assert_eq!(unsafe { native::ultra_external_render(31, left.as_mut_ptr(), right.as_mut_ptr()) }, 1);
    let (state, _) = runtime.poll(&host).unwrap();
    assert_eq!(state["tracks"][3]["mute"], 1);
    assert_eq!(state["tracks"][7]["solo"], 1);
    assert!(left[..31].iter().all(|sample| sample.is_finite()));
    let folder = std::env::temp_dir().join(format!("alive-capacity-host-{}", std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let saved = save(&folder.join("eight.alive"), &host.prepared.as_ref().unwrap().document, &example_path()).unwrap();
    let reopened = read(&saved).unwrap();
    assert_eq!(reopened.document.tracks[7].id, "capacity-track-7");
    assert!(reopened.document.tracks[3].mute && reopened.document.tracks[7].solo);
    assert_eq!(reopened.document.banks(), host.prepared.as_ref().unwrap().document.banks());
    let mut excess = document.clone();
    let mut extra = excess.tracks[0].effects[0].clone(); extra.instance_id = "seventeenth-root".into();
    excess.tracks[4].effects.push(extra);
    for track in &mut excess.tracks { for device in track.devices_mut() { device.path = "/missing-capacity-dependency.ultra".into(); } }
    assert!(prepare(&excess, &example_path()).unwrap_err().contains("sixteen native roots"));
    unsafe { native::alive_session_stop_v3(); native::ultra_audio_stop(); native::alive_session_reset();
             for slot in 0..16 { crate::ultra_canvas_close_document(slot); } }
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn v3_strict_wire_migration_and_roundtrip_preserve_score_identity() {
    let legacy = example();
    let clips = legacy.to_clips().unwrap();
    let wire = serde_json::to_value(&clips).unwrap();
    assert_eq!(wire["format"], "alive-session-v3");
    assert_eq!(wire["tracks"][0]["slots"].as_array().unwrap().len(), 4);
    assert!(wire["tracks"][0].get("notes").is_none());
    assert_eq!(wire["tracks"][0]["slots"][0]["notes"][0]["beat"], legacy.tracks[0].notes[0].beat);
    assert_eq!(wire["tracks"][0]["slots"][0]["id"], "clip-8254b7a92a82cb008365518183971131");
    assert_eq!(wire["tracks"][0]["slots"][0]["notes"][0]["id"], "note-b81cb31228756f6d8c9d9d538eceec38");
    assert_eq!(clips, legacy.to_clips().unwrap());
    let encoded = serde_json::to_string(&clips).unwrap();
    assert_eq!(persistence::decode(&encoded, &example_path()).unwrap(), clips);
    for field in ["defaultClipId", "slots"] {
        let mut bad = wire.clone(); bad["tracks"][0].as_object_mut().unwrap().remove(field);
        assert!(persistence::decode(&bad.to_string(), &example_path()).is_err());
    }
    let duplicate = encoded.replacen("\"parameters\":{", "\"parameters\":{\"cutoff\":999,", 1);
    assert!(persistence::decode(&duplicate, &example_path()).is_err());
    let mut empty = wire.clone(); empty["tracks"][0]["defaultClipId"] = serde_json::Value::Null;
    empty["tracks"][0]["slots"] = serde_json::json!([null,null,null,null]);
    assert!(persistence::decode(&empty.to_string(), &example_path()).is_ok());
    let mut bad = wire.clone(); bad["tracks"][0]["slots"].as_array_mut().unwrap().pop();
    assert!(persistence::decode(&bad.to_string(), &example_path()).is_err());
}

#[test]
fn v3_compiles_independent_clip_ranges_and_empty_lane_ownership() {
    let mut document=example().to_clips().unwrap();document.tempo=120.;
    let id=document.tracks[0].id.clone();
    let bank=document.bank_mut(&id).unwrap();
    let mut copied=bank.slots[0].clone().unwrap();copied.id="copy".into();copied.name="Second".into();copied.length_beats=32.;
    for n in &mut copied.notes{n.id=format!("copy-{}",n.id);}
    for lane in &mut copied.automation{lane.points.clear();}
    bank.slots[2]=Some(copied);bank.default_clip_id=None;
    let prepared=prepare(&document,&example_path()).unwrap();
    let Schedule::Clips(clips)=&prepared.schedule else {panic!("expected clips")};
    assert_eq!(clips.len(),3);assert_eq!(clips[1].slot,2);assert_eq!(clips[1].id,"copy");
    assert_eq!(clips[1].length_frames,768000);assert!(clips[1].owned_masks.iter().any(|m|*m!=0));
    assert_eq!(clips[1].event_begin,clips[0].event_begin+clips[0].event_count);
    assert_eq!(prepared.document,document);
}

#[test]
fn v3_strict_ids_disabled_aggregate_and_source_free_range_rejections(){
    let document=example().to_clips().unwrap();let good=serde_json::to_value(&document).unwrap();
    for mutate in [
        |v:&mut serde_json::Value|v["tracks"][0]["slots"][0]["unknown"]=serde_json::json!(true),
        |v:&mut serde_json::Value|v["tracks"][0]["slots"][0]["notes"][0].as_object_mut().unwrap().remove("id").map(|_|()).unwrap(),
        |v:&mut serde_json::Value|v["tracks"][1]["slots"][0]["id"]=v["tracks"][0]["slots"][0]["id"].clone(),
        |v:&mut serde_json::Value|v["tracks"][1]["slots"][0]["notes"][0]["id"]=v["tracks"][0]["slots"][0]["notes"][0]["id"].clone(),
        |v:&mut serde_json::Value|v["tracks"][0]["defaultClipId"]=v["tracks"][1]["slots"][0]["id"].clone(),
        |v:&mut serde_json::Value|v["tracks"][0]["slots"][0]["automation"][0]["instanceId"]=v["tracks"][1]["device"]["instanceId"].clone(),
        |v:&mut serde_json::Value|{let mut c=v["tracks"][0]["slots"][0].clone();c["id"]=serde_json::json!("disabled");c["notes"]=serde_json::json!([]);for l in c["automation"].as_array_mut().unwrap(){l["enabled"]=serde_json::json!(false);l["points"]=(0..129).map(|i|serde_json::json!({"beat":i as f64/32.,"value":500})).collect();}v["tracks"][0]["slots"][1]=c;},
    ]{let mut bad=good.clone();mutate(&mut bad);assert!(persistence::decode(&bad.to_string(),&example_path()).is_err(),"{bad}");}
    let mut invalid=good.clone();invalid["tracks"][0]["device"]["path"]=serde_json::json!("/nonexistent/source.ultra");invalid["tracks"][0]["slots"][0]["notes"][0]["velocity"]=serde_json::json!(0);
    assert!(persistence::decode(&invalid.to_string(),&example_path()).unwrap_err().contains("velocity"));
}

#[test]
fn v3_save_as_preserves_bank_ids_beats_defaults_and_source_hashes(){
    let mut document=example().to_clips().unwrap();let id=document.tracks[0].id.clone();document.bank_mut(&id).unwrap().slots[0].as_mut().unwrap().notes[0].beat=0.03125;document.tracks[0].gain=0.43;
    let folder=std::env::temp_dir().join(format!("alive-v3-roundtrip-{}",std::process::id()));std::fs::create_dir_all(folder.join("nested")).unwrap();
    let (path,saved)=persistence::save_document(&folder.join("nested/session.alive"),&document,&example_path()).unwrap();let reopened=read(&path).unwrap();
    assert!(reopened.document.is_clips());assert_eq!(saved.banks(),document.banks());assert_eq!(reopened.document.banks(),document.banks());
    assert_eq!(saved.tracks[0].device.source_sha256,document.tracks[0].device.source_sha256);assert_eq!(saved.tracks[0].device.parameters,document.tracks[0].device.parameters);assert_eq!(saved.tracks[0].gain,0.43);
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn saved_session_resolves_two_real_independent_device_references() {
    let session = example();
    assert_eq!(session.tracks.len(), 2);
    assert_ne!(session.tracks[0].id, session.tracks[1].id);
    assert_eq!(session.tracks[0].device.path, session.tracks[1].device.path);
    let prepared = prepare(&session, &example_path()).unwrap();
    assert_eq!(prepared.devices[prepared.tracks[0].instrument].manifest.id, "org.alive.subtractive");
    assert_ne!(prepared.devices[prepared.tracks[0].instrument].manifest.parameters.last().unwrap().base,
        prepared.devices[prepared.tracks[1].instrument].manifest.parameters.last().unwrap().base);
}

#[test]
fn session_v1_rejects_effects_with_an_explicit_chain_runtime_error() {
    let mut session=example();
    let reference=&mut session.tracks[0].device;
    reference.path="../../ultra/examples/utility.ultra".into();reference.id="org.alive.utility".into();reference.version=2;
    reference.parameters.clear();
    reference.source_sha256 = prepare::fingerprint(&crate::documents::read_patch(&example_path().parent().unwrap().join(&reference.path)).unwrap().patch.unwrap()).unwrap();
    let error=prepare(&session,&example_path()).unwrap_err();
    assert!(error.contains("instruments only")&&error.contains("chain runtime")&&error.contains("Pulse"),"{error}");
}

#[test]
fn session_v1_accepts_version_two_instruments_and_checks_declared_version() {
    let mut session=example();
    let original=prepare(&session,&example_path()).unwrap();
    let mut patch=original.devices[original.tracks[0].instrument].patch.clone();
    let device=&mut patch["device"];device["version"]=serde_json::json!(2);device["kind"]=serde_json::json!("instrument");
    device["midi"]=serde_json::json!({"input":device["midi"].clone(),"output":null});
    device["audio"]=serde_json::json!({"input":null,"output":{"channels":2,"layout":"stereo"}});
    let path=std::env::temp_dir().join(format!("alive-v2-instrument-{}.ultra",std::process::id()));
    std::fs::write(&path,serde_json::to_vec(&patch).unwrap()).unwrap();
    session.tracks[0].device.path=path.to_string_lossy().into_owned();session.tracks[0].device.version=2;
    session.tracks[0].device.source_sha256 = prepare::fingerprint(&patch).unwrap();
    assert!(prepare(&session,&example_path()).is_ok());
    session.tracks[0].device.version=1;
    assert!(prepare(&session,&example_path()).unwrap_err().contains("version mismatch"));
    std::fs::remove_file(path).unwrap();
}

#[test]
fn frame_conversion_orders_off_automation_on_and_preserves_required_offsets() {
    let mut session = example();
    session.tempo = 120.;
    session.length_beats = 1.;
    session.tracks.truncate(1);
    let track = &mut session.tracks[0];
    track.notes = vec![Note { beat: 0., duration: 64. / 24000., pitch: 60, velocity: 100 },
        Note { beat: 64. / 24000., duration: 64. / 24000., pitch: 60, velocity: 90 }];
    track.automation = vec![Lane { instance_id: track.device.instance_id.clone(), key: "cutoff".into(), enabled: true,
        points: [0, 1, 31, 63, 64, 127].iter().map(|&frame| Point { beat: frame as f64 / 24000., value: 1000. }).collect() }];
    let prepared = prepare(&session, &example_path()).unwrap();
    let offsets: Vec<_> = prepared.events.iter().filter(|e| e.kind == 1).map(|e| e.frame).collect();
    assert_eq!(offsets, [0, 1, 31, 63, 64, 127]);
    assert_eq!(prepared.events.iter().filter(|e| e.frame == 64).map(|e| e.kind).collect::<Vec<_>>(), [0, 1, 2]);
    assert_eq!(prepared.length_frames, 24000);
}

#[test]
fn frame_collision_voice_release_ambiguity_and_loop_seam_overload_are_rejected() {
    let mut session = example();
    let duplicate = session.tracks[0].notes[0].clone();
    session.tracks[0].notes.push(duplicate);
    assert!(prepare(&session, &example_path()).unwrap_err().contains("Overlapping"));
    let mut session = example();
    session.tracks[0].automation[0].points[1].beat = 0.00000001;
    assert!(prepare(&session, &example_path()).unwrap_err().contains("distinct audio frames"));
    let mut session = example();
    session.tempo = 240.;
    session.length_beats = 1. / 64.; // 188 frames, repeated six times per callback.
    session.tracks.truncate(1);
    session.tracks[0].automation.clear();
    session.tracks[0].notes = (0..8).map(|pitch| Note { beat: 0., duration: 0.005, pitch: 60 + pitch, velocity: 100 }).collect();
    assert!(prepare(&session, &example_path()).unwrap_err().contains("overload"));
}

#[test]
fn session_roundtrip_preserves_notes_automation_and_mixer() {
    let mut session = example();
    session.tracks[0].mute = true;
    session.tracks[1].solo = true;
    session.tracks[0].notes[0].velocity = 43;
    session.tracks[0].notes[0].duration = 0.375;
    let encoded = serde_json::to_vec(&session).unwrap();
    assert_eq!(serde_json::from_slice::<Session>(&encoded).unwrap(), session);
    assert!(prepare(&session, &example_path()).is_ok());
}

#[test]
fn missing_and_incompatible_devices_identify_track_and_preserve_input() {
    let mut missing = example();
    missing.tracks[1].device.path = "missing.ultra".into();
    let before = missing.clone();
    let error = prepare(&missing, &example_path()).unwrap_err();
    assert!(error.contains("Harmony") && error.contains("missing.ultra"), "{error}");
    assert_eq!(missing, before);
    let mut incompatible = example();
    incompatible.tracks[0].device.version = 2;
    let error = prepare(&incompatible, &example_path()).unwrap_err();
    assert!(error.contains("Pulse") && error.contains("version"), "{error}");
}

#[test]
fn rejects_invalid_schedule_and_parameter_binding_before_admission() {
    for mutate in [
        |s: &mut Session| s.tempo = 0.,
        |s: &mut Session| s.tracks[0].notes[0].duration = 0.,
        |s: &mut Session| s.tracks[0].notes[0].velocity = 128,
        |s: &mut Session| s.tracks[0].automation[0].key = "missing".into(),
        |s: &mut Session| s.tracks[0].automation[0].points[0].value = -1.,
        |s: &mut Session| {let track=s.tracks[0].clone();s.tracks.push(track)},
    ] {
        let mut session = example();
        mutate(&mut session);
        assert!(prepare(&session, &example_path()).is_err());
    }
}

#[test]
fn save_as_rebases_references_and_failed_save_retains_file() {
    let folder = std::env::temp_dir().join(format!("alive-session-roundtrip-{}", std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let path = folder.join("roundtrip.alive");
    let mut session = example();
    session.tracks[0].gain = 0.432;
    session.tracks[1].device.parameters.insert("cutoff".into(), 1999.);
    save(&path, &session, &example_path()).unwrap();
    let loaded = read(&path).unwrap();
    assert_eq!(loaded.document.tracks[0].gain, 0.432);
    assert_eq!(loaded.document.tracks[1].device.parameters["cutoff"], 1999.);
    assert_eq!(loaded.document.tracks[0].notes, session.tracks[0].notes);
    assert_eq!(loaded.document.tracks[1].automation, session.tracks[1].automation);
    assert_eq!(loaded.devices[loaded.tracks[0].instrument].path, { let p = prepare(&session, &example_path()).unwrap(); p.devices[p.tracks[0].instrument].path.clone() });
    let previous = std::fs::read(&path).unwrap();
    session.tracks[0].device.path = "missing.ultra".into();
    assert!(save(&path, &session, &example_path()).is_err());
    assert_eq!(std::fs::read(&path).unwrap(), previous);
    assert!(read(&path).is_ok());
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn save_cannot_replace_source_device_or_accept_oversized_file() {
    let session = example();
    let prepared = prepare(&session, &example_path()).unwrap();
    let source = &prepared.devices[prepared.tracks[0].instrument].path;
    let original = std::fs::read(source).unwrap();
    assert!(save(source, &session, &example_path()).is_err());
    assert_eq!(std::fs::read(source).unwrap(), original);
    let oversized = std::env::temp_dir().join(format!("alive-oversized-{}.alive", std::process::id()));
    std::fs::write(&oversized, vec![b' '; 1024 * 1024 + 1]).unwrap();
    assert!(read(&oversized).unwrap_err().contains("1 MiB"));
    std::fs::remove_file(oversized).unwrap();
}

#[cfg(unix)]
#[test]
fn saving_through_a_session_symlink_keeps_dependency_paths_relative_to_target() {
    use std::os::unix::fs::symlink;
    let folder = std::env::temp_dir().join(format!("alive-symlink-save-{}", std::process::id()));
    let target_folder = folder.join("deep/target");
    std::fs::create_dir_all(&target_folder).unwrap();
    let target = target_folder.join("target.alive");
    save(&target, &example(), &example_path()).unwrap();
    let link = folder.join("linked.alive");
    symlink(&target, &link).unwrap();
    save(&link, &example(), &example_path()).unwrap();
    assert!(read(&target).is_ok(), "Saving through a link rebased devices against the link's folder");
    assert!(link.is_symlink());
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn rust_host_installs_the_saved_session_without_editor_windows() {
    // Keep native global engine/revision ownership separate from other tests.
    const NAME: &str = "session::tests::rust_host_installs_the_saved_session_without_editor_windows";
    if std::env::var("ALIVE_HOST_TEST_CHILD").as_deref() != Ok("1") {
        let child = std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", NAME, "--nocapture"]).env("ALIVE_HOST_TEST_CHILD", "1")
            .env_remove("DISPLAY").env_remove("WAYLAND_DISPLAY").output().unwrap();
        assert!(child.status.success(), "{}\n{}", String::from_utf8_lossy(&child.stdout), String::from_utf8_lossy(&child.stderr));
        return;
    }
    assert_eq!(std::mem::size_of::<native::Parameter>(), 40);
    assert_eq!(std::mem::size_of::<native::Track>(), 688);
    assert_eq!(std::mem::size_of::<native::Event>(), 32);
    assert_eq!(std::mem::size_of::<native::Config>(), 34184);
    assert_eq!(std::mem::size_of::<native::State>(), 784);
    let output = std::env::temp_dir().join(format!("alive-host-proof-{}", std::process::id()));
    let report = probe::run(&example_path(), &output).unwrap();
    assert_eq!(report["passed"], true);
    assert_eq!(report["editorWindowsCreated"], 0);
    assert!(report["loopProof"]["secondCycleEnergy"].as_f64().unwrap_or(0.) > 1e-9);
    assert!(report["loopProof"]["wrapGenerations"].as_u64().unwrap_or(0) >= 2);
    assert_eq!(report["seekProof"]["generationAdvanced"], true);
    assert_eq!(report["savedChainProof"]["exactLiveDryAndWarmWet"], true);
    assert_eq!(report["savedChainProof"]["reorderedAutomationIdentity"], true);
    assert_eq!(report["savedDeviceBoundaryProof"]["partitionsIdentical"], true);
    assert_eq!(report["savedDeviceBoundaryProof"]["observations"].as_array().map(Vec::len), Some(12));
    let mut broken = read(&example_path()).unwrap();
    let graph = &mut broken.devices[broken.tracks[1].instrument].graph;
    let sink = graph.nodes[..graph.node_count as usize].iter().position(|n| n.id == 11).unwrap();
    graph.nodes[sink..].rotate_left(1);
    graph.node_count -= 1;
    let edges: Vec<_> = graph.edges[..graph.edge_count as usize].iter().filter(|e| e.from != 11 && e.to != 11).cloned().collect();
    graph.edge_count = edges.len() as u32;
    for (slot, edge) in edges.into_iter().enumerate() { graph.edges[slot] = edge; }
    let error = host::Host::default().validate(&broken).unwrap_err();
    assert!(error.contains("Harmony") && error.contains("subtractive.ultra") && error.contains("stereo"), "{error}");
    std::fs::remove_dir_all(output).unwrap();
}

#[test]
fn v3_scene_is_one_native_queue_entry_with_prepared_member_identities() {
    const NAME:&str="session::tests::v3_scene_is_one_native_queue_entry_with_prepared_member_identities";
    if std::env::var("ALIVE_SCENE_HOST_CHILD").as_deref()!=Ok("1") {
        let child=std::process::Command::new(std::env::current_exe().unwrap()).args(["--exact",NAME,"--nocapture"])
            .env("ALIVE_SCENE_HOST_CHILD","1").env_remove("DISPLAY").env_remove("WAYLAND_DISPLAY").output().unwrap();
        assert!(child.status.success(),"{}\n{}",String::from_utf8_lossy(&child.stdout),String::from_utf8_lossy(&child.stderr));return;
    }
    let mut host=host::Host::default();let p=host.enable_clips(read(&example_path()).unwrap()).unwrap();host.install(p).unwrap();
    let before=serde_json::to_value(&host.prepared.as_ref().unwrap().document).unwrap();
    let mut runtime=runtime::Runtime::default();assert_eq!(unsafe{native::ultra_external_start()},1);
    for _ in 0..63 {assert_eq!(unsafe{native::alive_session_mixer(0,1.,0,0)},1);}
    let scene=runtime.scene(&host,0).unwrap();assert_eq!(scene.status,"queued");assert_eq!(scene.request_serial,"1");
    assert_eq!(scene.track_mask,3);assert_eq!(scene.scene_slot,Some(0));assert_eq!(scene.members.len(),2);
    for (index,member) in scene.members.iter().enumerate(){
        let track=&host.prepared.as_ref().unwrap().document.tracks[index];
        assert_eq!(member.track_id,track.id);assert_eq!(member.clip_id,host.prepared.as_ref().unwrap().document.bank(&track.id).unwrap().default_clip_id);
        assert_eq!(member.action,"launch");assert_eq!(member.status,"queued");
    }
    let refused=runtime.scene(&host,3).unwrap();assert_eq!(refused.status,"rejected");assert_eq!(refused.reason,7);assert_eq!(refused.rejected_mask,3);
    let mut left=[0f32;64];let mut right=[0f32;64];assert_eq!(unsafe{native::ultra_external_render(64,left.as_mut_ptr(),right.as_mut_ptr())},1);
    let mut raw=native::StateV3::default();assert_eq!(unsafe{native::alive_session_state_v3(&mut raw)},1);
    assert_eq!(raw.last_consumed_request,1);assert_eq!(raw.receipts[1].applied_mask,3);assert_eq!(raw.playing,0);
    let empty=runtime.scene(&host,3).unwrap();assert_eq!(empty.members.iter().map(|m|m.action.as_str()).collect::<Vec<_>>(),vec!["stop","stop"]);
    assert_eq!(unsafe{native::ultra_external_render(64,left.as_mut_ptr(),right.as_mut_ptr())},1);
    let (_,view)=runtime.poll(&host).unwrap();let requests=view.unwrap().requests;assert_eq!(requests.last().unwrap().applied_mask,3);
    assert_eq!(serde_json::to_value(&host.prepared.as_ref().unwrap().document).unwrap(),before);
    unsafe{native::ultra_audio_stop();native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
}

#[test]
fn v3_native_host_defaults_requests_and_graph_fallback_are_real() {
    const NAME:&str="session::tests::v3_native_host_defaults_requests_and_graph_fallback_are_real";
    if std::env::var("ALIVE_V3_HOST_CHILD").as_deref()!=Ok("1"){
        let child=std::process::Command::new(std::env::current_exe().unwrap()).args(["--exact",NAME,"--nocapture"]).env("ALIVE_V3_HOST_CHILD","1").env_remove("DISPLAY").env_remove("WAYLAND_DISPLAY").output().unwrap();
        assert!(child.status.success(),"{}\n{}",String::from_utf8_lossy(&child.stdout),String::from_utf8_lossy(&child.stderr));return;
    }
    let mut host=host::Host::default();let upgraded=host.enable_clips(read(&example_path()).unwrap()).unwrap();assert!(upgraded.document.is_clips(),"{:?}",upgraded.notice);
    let default=upgraded.document.bank(&upgraded.document.tracks[0].id).unwrap().default_clip_id.clone();host.install(upgraded).unwrap();
    let mut raw=native::StateV3::default();assert_eq!(unsafe{native::alive_session_state_v3(&mut raw)},1);assert_eq!(raw.playing,0);assert_eq!(raw.tracks[0].active_clip,0);assert_eq!(raw.tracks[0].phase,0);assert!(default.is_some());
    let mut runtime=runtime::Runtime::default();let mut request=native::RequestV3::default();request.kind=native::V3_START;
    assert_eq!(unsafe{native::ultra_external_start()},1);let receipt=runtime.request(&host,request,None,None).unwrap();assert_eq!(receipt.status,"queued");
    let mut left=[0f32;512];let mut right=[0f32;512];assert_eq!(unsafe{native::ultra_external_render(512,left.as_mut_ptr(),right.as_mut_ptr())},1);
    let (state,view)=runtime.poll(&host).unwrap();assert_eq!(state["playing"],1);assert_eq!(view.unwrap().requests[0].status,"applied");
    unsafe{native::alive_session_stop_v3();native::ultra_audio_stop();native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
    let folder=std::env::temp_dir().join(format!("alive-v3-fallback-{}",std::process::id()));std::fs::create_dir_all(&folder).unwrap();
    let mut old=example();let source=crate::documents::read_patch(&example_path().parent().unwrap().join(&old.tracks[0].device.path)).unwrap().patch.unwrap();let mut patch=source.clone();
    patch["device"]["parameters"].as_array_mut().unwrap().push(serde_json::json!({"key":"demo","label":"Demo","node":12,"param":"value","min":0,"max":1,"unit":""}));
    for preset in patch["device"]["presets"].as_array_mut().unwrap(){preset["values"]["demo"]=serde_json::json!(0);}
    let path=folder.join("toggle-binding.ultra");std::fs::write(&path,serde_json::to_vec(&patch).unwrap()).unwrap();
    old.tracks[0].device.path=path.to_string_lossy().into_owned();old.tracks[0].device.source_sha256=prepare::fingerprint(&patch).unwrap();
    let candidate=prepare(&old,&example_path()).unwrap();host.validate(&candidate).unwrap();
    let mut explicit=candidate.clone();explicit.document=explicit.document.to_clips().unwrap();let doc=explicit.document.clone();prepare::compile_clips(&doc,&mut explicit).unwrap();
    assert_eq!(host.admit(&explicit).err().unwrap().code,native::V3_GRAPH_REJECTED);assert!(host.enable_clips(explicit).is_err());
    let retained=host.enable_clips(candidate).unwrap();assert!(!retained.document.is_clips());assert!(retained.notice.as_ref().unwrap().contains("graph policy"));assert_eq!(retained.document.tracks[0].notes,old.tracks[0].notes);
    let mut dense=example();dense.tempo=120.;dense.length_beats=4.;
    for (i,t) in dense.tracks.iter_mut().enumerate(){t.automation.clear();t.notes=(40..60).map(|pitch|Note{beat:i as f64,duration:0.01,pitch,velocity:80}).collect();}
    let density=host.enable_clips(prepare(&dense,&example_path()).unwrap()).unwrap();assert!(!density.document.is_clips(),"Expected conservative phase combination refusal");assert_eq!(density.document.tracks[1].notes,dense.tracks[1].notes);assert!(density.notice.as_ref().unwrap().contains("Conservative"));
    host.install(retained).unwrap();assert_eq!(unsafe{native::ultra_external_start()},1);assert_eq!(unsafe{native::alive_session_start()},1);assert_eq!(unsafe{native::ultra_external_render(512,left.as_mut_ptr(),right.as_mut_ptr())},1);assert_eq!(native::state().unwrap().playing,1);
    let p=host.prepared.as_ref().unwrap();let saved=save(&folder.join("retained.alive"),&p.document,&p.origin).unwrap();assert!(!read(&saved).unwrap().document.is_clips());
    unsafe{native::alive_session_stop();native::ultra_audio_stop();native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn legacy_read_returns_canonical_v2_with_stable_instance_targets() {
    let first = read(&example_path()).unwrap();
    let second = read(&example_path()).unwrap();
    let wire = serde_json::to_value(&first.document).unwrap();
    assert_eq!(wire["format"], "alive-session-v2");
    assert_eq!(wire["tracks"][0]["effects"], serde_json::json!([]));
    let id = wire["tracks"][0]["device"]["instanceId"].as_str().unwrap();
    assert!(id.starts_with("legacy-"));
    assert_eq!(id.len(), 39);
    assert_eq!(wire["tracks"][0]["automation"][0]["instanceId"], id);
    assert_eq!(wire["tracks"][0]["device"]["sourceSha256"].as_str().unwrap().len(), 64);
    assert_eq!(first.document, second.document);
}

#[test]
fn native_wire_layouts_have_matching_sizes_headers_and_offsets() {
    use std::mem::{size_of, offset_of};
    if size_of::<usize>() != 8 { return; }
    assert_eq!(size_of::<native::Parameter>(),40);
    assert_eq!(size_of::<native::Track>(),688);
    assert_eq!(size_of::<native::Event>(),32);
    assert_eq!(size_of::<native::Config>(),34184);
    assert_eq!(size_of::<native::TrackState>(),360);
    assert_eq!(size_of::<native::State>(),784);
    assert_eq!(offset_of!(native::Track, revision),24);
    assert_eq!(offset_of!(native::Track, parameters),48);
    assert_eq!(offset_of!(native::Config, tracks),40);
    assert_eq!(offset_of!(native::Config, events),1416);
    assert_eq!(offset_of!(native::State, tracks),64);
    assert_eq!(size_of::<native::DeviceV2>(),696);
    assert_eq!(size_of::<native::TrackV2>(),32);
    assert_eq!(size_of::<native::EventV2>(),32);
    assert_eq!(size_of::<native::ConfigV2>(),37064);
    assert_eq!(size_of::<native::TrackStateV2>(),40);
    assert_eq!(size_of::<native::DeviceStateV2>(),344);
    assert_eq!(size_of::<native::StateV2>(),2216);
    assert_eq!(offset_of!(native::DeviceV2, revision),48);
    assert_eq!(offset_of!(native::DeviceV2, parameters),56);
    assert_eq!(offset_of!(native::ConfigV2, tracks),56);
    assert_eq!(offset_of!(native::ConfigV2, devices),120);
    assert_eq!(offset_of!(native::ConfigV2, events),4296);
    assert_eq!(offset_of!(native::StateV2, tracks),72);
    assert_eq!(offset_of!(native::StateV2, devices),152);
    assert_eq!(native::ConfigV2::default().struct_bytes,37064);
    assert_eq!(native::StateV2::default().version,2);
}

fn effect(instance: &str, filename: &str) -> DeviceInstance {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples").join(filename);
    let patch = crate::documents::read_patch(&path).unwrap().patch.unwrap();
    let graph = crate::canvas::prepare(patch.clone()).unwrap().native;
    let manifest = crate::canvas::device::host_manifest(&patch, &graph).unwrap();
    DeviceInstance { instance_id: instance.into(), path: path.to_string_lossy().into(), id: manifest.id, version: manifest.version,
        source_sha256: prepare::fingerprint(&patch).unwrap(), parameters: Default::default(), bypassed: false }
}

#[test]
fn saved_effect_order_and_automation_resolve_by_instance_not_chain_index() {
    let mut session = example();
    session.tracks[0].effects = vec![effect("effect-z", "utility.ultra"), effect("effect-a", "utility.ultra")];
    session.tracks[0].effects[0].parameters.insert("gain".into(), 0.2);
    session.tracks[0].effects[1].parameters.insert("gain".into(), 0.8);
    session.tracks[0].effects[1].bypassed = true;
    session.tracks[0].automation.push(Lane { instance_id: "effect-z".into(), key: "gain".into(), enabled: true, points: vec![Point { beat: 0., value: 0.5 }] });
    let first = prepare(&session, &example_path()).unwrap();
    let z = first.devices.iter().position(|d| d.instance_id == "effect-z").unwrap();
    assert_eq!(first.tracks[0].effects[0], z);
    assert_eq!(first.devices[z].manifest.parameters[0].base, 0.2);
    assert!(first.events.iter().any(|e| e.device == z as u32 && e.kind == 1 && e.value == 0.5));
    session.tracks[0].effects.reverse();
    let second = prepare(&session, &example_path()).unwrap();
    assert_eq!(second.tracks[0].effects[1], z);
    assert_eq!(first.events.iter().map(|e| (e.frame,e.device,e.target,e.value)).collect::<Vec<_>>(), second.events.iter().map(|e| (e.frame,e.device,e.target,e.value)).collect::<Vec<_>>());
    let cross = session.tracks[0].automation.last().unwrap().clone();
    session.tracks[1].automation.push(cross);
    assert!(prepare(&session, &example_path()).unwrap_err().contains("cross-track"));
}

#[test]
fn hashes_cover_original_json_before_instance_bases_and_formatting_is_irrelevant() {
    let mut session = example();
    let folder = std::env::temp_dir().join(format!("alive-source-hash-{}",std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let path = folder.join("source.ultra");
    let original = read(&example_path()).unwrap();
    let device = &original.devices[original.tracks[0].instrument];
    let source = crate::documents::read_patch(&device.path).unwrap().patch.unwrap();
    std::fs::write(&path, serde_json::to_vec(&source).unwrap()).unwrap();
    session.tracks[0].device.path = path.to_string_lossy().into();
    session.tracks[0].device.parameters.insert("cutoff".into(), 1337.);
    let prepared = prepare(&session, &example_path()).unwrap();
    let saved = save(&folder.join("saved.alive"), &prepared.document, &example_path()).unwrap();
    std::fs::write(&path, serde_json::to_vec_pretty(&source).unwrap()).unwrap();
    assert!(read(&saved).is_ok());
    let mut changed = source; changed["nodes"][0]["x"] = serde_json::json!(12345);
    std::fs::write(&path, serde_json::to_vec(&changed).unwrap()).unwrap();
    let error = read(&saved).unwrap_err();
    assert!(error.contains("Pulse") && error.contains(&session.tracks[0].device.instance_id) && error.contains("source.ultra") && error.contains("Replace"),"{error}");
    let mut wire = serde_json::to_value(&session).unwrap();
    wire["tracks"][0]["device"].as_object_mut().unwrap().remove("sourceSha256");
    assert!(serde_json::from_value::<Session>(wire).is_err());
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn save_as_relocates_every_effect_and_cannot_overwrite_any_dependency() {
    let mut session = example();
    session.tracks[0].effects = vec![effect("utility", "utility.ultra"),effect("filter", "stereo-lowpass.ultra")];
    let folder = std::env::temp_dir().join(format!("alive-chain-save-{}",std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let path = save(&folder.join("chain.alive"), &session, &example_path()).unwrap();
    let loaded = read(&path).unwrap();
    assert_eq!(loaded.devices.len(),4);
    assert_eq!(loaded.document.tracks[0].effects.iter().map(|d| (&d.instance_id,&d.source_sha256,d.bypassed)).collect::<Vec<_>>(),session.tracks[0].effects.iter().map(|d| (&d.instance_id,&d.source_sha256,d.bypassed)).collect::<Vec<_>>());
    for device in &loaded.devices { assert!(device.path.exists()); assert!(save(&device.path,&loaded.document,&path).is_err()); }
    let json_dependency=folder.join("effect-source.json");
    let source=std::fs::read(&session.tracks[0].effects[0].path).unwrap();
    std::fs::write(&json_dependency,&source).unwrap();
    session.tracks[0].effects[0].path=json_dependency.to_string_lossy().into();
    assert!(save(&json_dependency,&session,&example_path()).unwrap_err().contains("cannot replace"));
    assert_eq!(std::fs::read(&json_dependency).unwrap(),source);
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn global_root_and_chain_bounds_reject_before_dependency_reads() {
    let mut session=example();
    let mut reference=session.tracks[0].device.clone();reference.path="must-not-be-read.ultra".into();
    session.tracks[0].effects=(0..15).map(|i| {let mut d=reference.clone();d.instance_id=format!("effect-{i}");d}).collect();
    assert!(prepare(&session,&example_path()).unwrap_err().contains("sixteen"));
    session.tracks[0].effects.truncate(3);
    assert!(prepare(&session,&example_path()).unwrap_err().contains("two effects"));
    // Future eight-instrument/nine-effect input still hits the global root budget
    // before track-profile rejection, dependency reads or fixed-array indexing.
    let mut future=example(); future.tracks=(0..8).map(|i| {
        let mut track=future.tracks[0].clone();track.id=format!("future-{i}");
        track.device.instance_id=format!("instrument-{i}");track.device.path="missing.ultra".into();
        let mut effect=track.device.clone();effect.instance_id=format!("effect-{i}");track.effects=vec![effect];track
    }).collect();
    let mut ninth=future.tracks[0].effects[0].clone();ninth.instance_id="ninth-effect".into();future.tracks[0].effects.push(ninth);
    assert!(prepare(&future,&example_path()).unwrap_err().contains("sixteen"));
}

#[test]
fn stable_parameter_keys_survive_explicit_source_manifest_reordering() {
    let mut session=example();
    let mut filter=effect("filter", "stereo-lowpass.ultra");
    filter.parameters.insert("cutoff".into(),777.);
    session.tracks[0].effects.push(filter.clone());
    session.tracks[0].automation.push(Lane {instance_id:"filter".into(),key:"cutoff".into(),enabled:true,points:vec![Point {beat:0.,value:1234.}]});
    let first=prepare(&session,&example_path()).unwrap();
    let before=first.events.iter().find(|e| e.kind==1&&first.devices[e.device as usize].instance_id=="filter").unwrap();
    let mut patch=crate::documents::read_patch(Path::new(&filter.path)).unwrap().patch.unwrap();
    patch["device"]["parameters"].as_array_mut().unwrap().reverse();
    let path=std::env::temp_dir().join(format!("alive-reordered-manifest-{}.ultra",std::process::id()));
    std::fs::write(&path,serde_json::to_vec(&patch).unwrap()).unwrap();
    session.tracks[0].effects[0].path=path.to_string_lossy().into();
    // Explicit replacement captures the new authored source, preserving key targets.
    session.tracks[0].effects[0].source_sha256=prepare::fingerprint(&patch).unwrap();
    let second=prepare(&session,&example_path()).unwrap();
    let after=second.events.iter().find(|e| e.kind==1&&second.devices[e.device as usize].instance_id=="filter").unwrap();
    assert_ne!(before.target,after.target);
    assert_eq!(second.devices[after.device as usize].manifest.parameters[after.target as usize].key,"cutoff");
    assert_eq!(after.value,1234.);
    assert_eq!(second.document.tracks[0].effects[0].parameters["cutoff"],777.);
    std::fs::remove_file(path).unwrap();
}

#[test]
fn v1_dispatch_is_strict_and_v2_never_infers_missing_instance_data() {
    let text=std::fs::read_to_string(example_path()).unwrap();
    let mut wire:serde_json::Value=serde_json::from_str(&text).unwrap();
    wire["tracks"][0]["device"]["bypassed"]=serde_json::json!(false);
    assert!(persistence::decode(&wire.to_string(),&example_path()).is_err());
    let mut wire:serde_json::Value=serde_json::from_str(&text).unwrap();
    wire["format"]=serde_json::json!("alive-session-v2");
    assert!(persistence::decode(&wire.to_string(),&example_path()).is_err());
    let mut wire:serde_json::Value=serde_json::from_str(&text).unwrap();
    wire["tracks"][1]["id"]=wire["tracks"][0]["id"].clone();
    assert!(persistence::decode(&wire.to_string(),&example_path()).unwrap_err().contains("Duplicate track"));
}
