use super::*;
use std::path::Path;

fn example_path() -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive")
}
fn example() -> Session {
    serde_json::from_str(&std::fs::read_to_string(example_path()).unwrap()).unwrap()
}

#[test]
fn saved_session_resolves_two_real_independent_device_references() {
    let session = example();
    assert_eq!(session.tracks.len(), 2);
    assert_ne!(session.tracks[0].id, session.tracks[1].id);
    assert_eq!(session.tracks[0].device.path, session.tracks[1].device.path);
    let prepared = prepare(&session, &example_path()).unwrap();
    assert_eq!(prepared.tracks[0].manifest.id, "org.alive.subtractive");
    assert_ne!(prepared.tracks[0].manifest.parameters.last().unwrap().base,
        prepared.tracks[1].manifest.parameters.last().unwrap().base);
}

#[test]
fn session_v1_rejects_effects_with_an_explicit_chain_runtime_error() {
    let mut session=example();
    let reference=&mut session.tracks[0].device;
    reference.path="../../ultra/examples/utility.ultra".into();reference.id="org.alive.utility".into();reference.version=2;
    reference.parameters.clear();
    let error=prepare(&session,&example_path()).unwrap_err();
    assert!(error.contains("instruments only")&&error.contains("chain runtime")&&error.contains("Pulse"),"{error}");
}

#[test]
fn session_v1_accepts_version_two_instruments_and_checks_declared_version() {
    let mut session=example();
    let original=prepare(&session,&example_path()).unwrap();
    let mut patch=original.tracks[0].patch.clone();
    let device=&mut patch["device"];device["version"]=serde_json::json!(2);device["kind"]=serde_json::json!("instrument");
    device["midi"]=serde_json::json!({"input":device["midi"].clone(),"output":null});
    device["audio"]=serde_json::json!({"input":null,"output":{"channels":2,"layout":"stereo"}});
    let path=std::env::temp_dir().join(format!("alive-v2-instrument-{}.ultra",std::process::id()));
    std::fs::write(&path,serde_json::to_vec(&patch).unwrap()).unwrap();
    session.tracks[0].device.path=path.to_string_lossy().into_owned();session.tracks[0].device.version=2;
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
    track.automation = vec![Lane { key: "cutoff".into(), enabled: true,
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
        |s: &mut Session| s.tracks.push(s.tracks[0].clone()),
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
    assert_eq!(loaded.tracks[0].path, prepare(&session, &example_path()).unwrap().tracks[0].path);
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
    let source = &prepared.tracks[0].path;
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
    assert_eq!(report["savedDeviceBoundaryProof"]["partitionsIdentical"], true);
    assert_eq!(report["savedDeviceBoundaryProof"]["observations"].as_array().map(Vec::len), Some(12));
    let mut broken = read(&example_path()).unwrap();
    let graph = &mut broken.tracks[1].graph;
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
