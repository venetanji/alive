use super::*;
use std::path::Path;
fn test_saved(score:Session)->SavedSession{SavedSession{score,master:MasterSettings{gain:1.},launch:Default::default()}}
fn prepare_score_fixture(score:&Session,path:&Path)->Result<PreparedSession,String>{super::prepare(&test_saved(score.clone()),path)}
fn save_score_fixture(path:&Path,score:&Session,origin:&Path)->Result<std::path::PathBuf,String>{super::save(path,&test_saved(score.clone()),origin)}
fn example_path()->std::path::PathBuf{Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive")}
fn example()->Session{read(&example_path()).unwrap().saved.score}
fn instrument_mut(s:&mut Session,index:usize)->&mut DeviceInstance{let workspaces::ChainV4::Midi{instrument:Some(d)}=&mut s.tracks[index].chain else{panic!("MIDI fixture instrument")};d}
fn automation_mut(s:&mut Session,index:usize)->&mut Vec<Lane>{let workspaces::SourceV4::Midi{automation,..}=&mut s.sources[index] else{panic!("MIDI fixture source")};automation}


fn effect(instance: &str, filename: &str) -> DeviceInstance {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples").join(filename);
    let patch = crate::documents::read_patch(&path).unwrap().patch.unwrap();
    let graph = crate::canvas::prepare(patch.clone()).unwrap().native;
    let manifest = crate::canvas::device::host_manifest(&patch, &graph).unwrap();
    DeviceInstance { instance_id: instance.into(), path: path.to_string_lossy().into(), id: manifest.id, version: manifest.version,
        source_sha256: prepare::fingerprint(&patch).unwrap(), parameters: Default::default(), bypassed: false }
}

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

#[test]
fn active_v4_preparation_compiles_shared_sources_once() {
    let mut project = example();
    let mut shared = project.tracks[0].slots[0].clone().unwrap();
    shared.id = "shared-second-slot".into();
    project.tracks[0].slots[1] = Some(shared);
    let base = prepare_score_fixture(&example(), &example_path()).unwrap();
    let prepared = prepare_score_fixture(&project.clone(), &example_path()).unwrap();
    assert_eq!(prepared.events.len(), base.events.len());
    assert_eq!(prepared.saved.score, project);
    assert_eq!(prepared.tracks.len(), 2);
    assert_eq!(prepared.devices.len(), 2);
    let mut ordered=prepared.events.clone();
    ordered.sort_by_key(|e|(e.frame,e.kind,e.track,e.device,e.target));
    let mut expected=base.events.clone();expected.sort_by_key(|e|(e.frame,e.kind,e.track,e.device,e.target));
    for (a,b) in ordered.iter().zip(&expected) {
        assert_eq!((a.frame,a.kind,a.track,a.device,a.target,a.value), (b.frame,b.kind,b.track,b.device,b.target,b.value));
    }
}

#[test]
fn active_v4_preparation_accepts_empty_audio_tracks_without_dependencies() {
    let mut project = example();
    project.sources.clear();project.placements.clear();
    for track in &mut project.tracks {track.chain=workspaces::ChainV4::Audio{};track.effects.clear();track.slots=[None,None,None,None];}
    let prepared=prepare_score_fixture(&project, &example_path()).unwrap();
    assert!(prepared.devices.is_empty());assert!(prepared.events.is_empty());
    assert!(prepared.tracks.iter().all(|t|matches!(t.input,prepare::PreparedTrackInput::Audio)));
}

#[test]
fn saved_session_resolves_two_real_independent_device_references() {
    let session = example();
    assert_eq!(session.tracks.len(), 2);
    assert_ne!(session.tracks[0].id, session.tracks[1].id);
    assert_eq!(session.tracks[0].instrument().unwrap().path, session.tracks[1].instrument().unwrap().path);
    let prepared = prepare_score_fixture(&session, &example_path()).unwrap();
    assert_eq!(prepared.devices[prepared.tracks[0].midi_instrument().unwrap()].manifest.id, "org.alive.subtractive");
    assert_ne!(prepared.devices[prepared.tracks[0].midi_instrument().unwrap()].manifest.parameters.last().unwrap().base,
        prepared.devices[prepared.tracks[1].midi_instrument().unwrap()].manifest.parameters.last().unwrap().base);
}

#[test]
fn missing_and_incompatible_devices_identify_track_and_preserve_input() {
    let mut missing = example();
    instrument_mut(&mut missing,1).path = "missing.ultra".into();
    let before = missing.clone();
    let error = prepare_score_fixture(&missing, &example_path()).unwrap_err();
    assert!(error.contains("Harmony") && error.contains("missing.ultra"), "{error}");
    assert_eq!(missing, before);
    let mut incompatible = example();
    instrument_mut(&mut incompatible,0).version = 1;
    let error = prepare_score_fixture(&incompatible, &example_path()).unwrap_err();
    assert!(error.contains("Pulse") && error.contains("version"), "{error}");
}

#[test]
fn save_as_rebases_references_and_failed_save_retains_file() {
    let folder = std::env::temp_dir().join(format!("alive-session-roundtrip-{}", std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let path = folder.join("roundtrip.alive");
    let mut session = example();
    session.tracks[0].gain = 0.432;
    instrument_mut(&mut session,1).parameters.insert("cutoff".into(), 1999.);
    save_score_fixture(&path, &session, &example_path()).unwrap();
    let loaded = read(&path).unwrap();
    assert_eq!(loaded.saved.score.tracks[0].gain, 0.432);
    assert_eq!(loaded.saved.score.tracks[1].instrument().unwrap().parameters["cutoff"], 1999.);
    assert_eq!(loaded.saved.score.sources,session.sources);
    assert_eq!(loaded.devices[loaded.tracks[0].midi_instrument().unwrap()].path, { let p = prepare_score_fixture(&session, &example_path()).unwrap(); p.devices[p.tracks[0].midi_instrument().unwrap()].path.clone() });
    let previous = std::fs::read(&path).unwrap();
    instrument_mut(&mut session,0).path = "missing.ultra".into();
    assert!(save_score_fixture(&path, &session, &example_path()).is_err());
    assert_eq!(std::fs::read(&path).unwrap(), previous);
    assert!(read(&path).is_ok());
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn save_cannot_replace_source_device_or_accept_oversized_file() {
    let session = example();
    let prepared = prepare_score_fixture(&session, &example_path()).unwrap();
    let source = &prepared.devices[prepared.tracks[0].midi_instrument().unwrap()].path;
    let original = std::fs::read(source).unwrap();
    assert!(save_score_fixture(source, &session, &example_path()).is_err());
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
    save_score_fixture(&target, &example(), &example_path()).unwrap();
    let link = folder.join("linked.alive");
    symlink(&target, &link).unwrap();
    save_score_fixture(&link, &example(), &example_path()).unwrap();
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
    let graph = &mut broken.devices[broken.tracks[1].midi_instrument().unwrap()].graph;
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
fn saved_effect_order_and_automation_resolve_by_instance_not_chain_index() {
    let mut session = example();
    session.tracks[0].effects = vec![effect("effect-z", "utility.ultra"), effect("effect-a", "utility.ultra")];
    session.tracks[0].effects[0].parameters.insert("gain".into(), 0.2);
    session.tracks[0].effects[1].parameters.insert("gain".into(), 0.8);
    session.tracks[0].effects[1].bypassed = true;
    automation_mut(&mut session,0).push(Lane { instance_id: "effect-z".into(), key: "gain".into(), enabled: true, points: vec![Point { beat: 0., value: 0.5 }] });
    let first = prepare_score_fixture(&session, &example_path()).unwrap();
    let z = first.devices.iter().position(|d| d.instance_id == "effect-z").unwrap();
    assert_eq!(first.tracks[0].effects[0], z);
    assert_eq!(first.devices[z].manifest.parameters[0].base, 0.2);
    assert!(first.events.iter().any(|e| e.device == z as u32 && e.kind == 1 && e.value == 0.5));
    session.tracks[0].effects.reverse();
    let second = prepare_score_fixture(&session, &example_path()).unwrap();
    assert_eq!(second.tracks[0].effects[1], z);
    assert_eq!(first.events.iter().map(|e| (e.frame,e.device,e.target,e.value)).collect::<Vec<_>>(), second.events.iter().map(|e| (e.frame,e.device,e.target,e.value)).collect::<Vec<_>>());
    let cross = automation_mut(&mut session,0).last().unwrap().clone();
    automation_mut(&mut session,1).push(cross);
    assert!(prepare_score_fixture(&session, &example_path()).unwrap_err().contains("cross-track"));
}

#[test]
fn hashes_cover_original_json_before_instance_bases_and_formatting_is_irrelevant() {
    let mut session = example();
    let folder = std::env::temp_dir().join(format!("alive-source-hash-{}",std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let path = folder.join("source.ultra");
    let original = read(&example_path()).unwrap();
    let device = &original.devices[original.tracks[0].midi_instrument().unwrap()];
    let source = crate::documents::read_patch(&device.path).unwrap().patch.unwrap();
    std::fs::write(&path, serde_json::to_vec(&source).unwrap()).unwrap();
    instrument_mut(&mut session,0).path = path.to_string_lossy().into();
    instrument_mut(&mut session,0).parameters.insert("cutoff".into(), 1337.);
    let prepared = prepare_score_fixture(&session, &example_path()).unwrap();
    let saved = super::save(&folder.join("saved.alive"), &prepared.saved, &example_path()).unwrap();
    std::fs::write(&path, serde_json::to_vec_pretty(&source).unwrap()).unwrap();
    assert!(read(&saved).is_ok());
    let mut changed = source; changed["nodes"][0]["x"] = serde_json::json!(12345);
    std::fs::write(&path, serde_json::to_vec(&changed).unwrap()).unwrap();
    let error = read(&saved).unwrap_err();
    assert!(error.contains("Pulse") && error.contains(&instrument_mut(&mut session,0).instance_id) && error.contains("source.ultra") && error.contains("Replace"),"{error}");
    let mut wire = serde_json::to_value(&session).unwrap();
    wire["tracks"][0]["chain"]["instrument"].as_object_mut().unwrap().remove("sourceSha256");
    assert!(serde_json::from_value::<Session>(wire).is_err());
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn save_as_relocates_every_effect_and_cannot_overwrite_any_dependency() {
    let mut session = example();
    session.tracks[0].effects = vec![effect("utility", "utility.ultra"),effect("filter", "stereo-lowpass.ultra")];
    let folder = std::env::temp_dir().join(format!("alive-chain-save-{}",std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let path = save_score_fixture(&folder.join("chain.alive"), &session, &example_path()).unwrap();
    let loaded = read(&path).unwrap();
    assert_eq!(loaded.devices.len(),4);
    assert_eq!(loaded.saved.score.tracks[0].effects.iter().map(|d| (&d.instance_id,&d.source_sha256,d.bypassed)).collect::<Vec<_>>(),session.tracks[0].effects.iter().map(|d| (&d.instance_id,&d.source_sha256,d.bypassed)).collect::<Vec<_>>());
    for device in &loaded.devices { assert!(device.path.exists()); assert!(super::save(&device.path,&loaded.saved,&path).is_err()); }
    let json_dependency=folder.join("effect-source.json");
    let source=std::fs::read(&session.tracks[0].effects[0].path).unwrap();
    std::fs::write(&json_dependency,&source).unwrap();
    session.tracks[0].effects[0].path=json_dependency.to_string_lossy().into();
    assert!(save_score_fixture(&json_dependency,&session,&example_path()).unwrap_err().contains("cannot replace"));
    assert_eq!(std::fs::read(&json_dependency).unwrap(),source);
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn stable_parameter_keys_survive_explicit_source_manifest_reordering() {
    let mut session=example();
    let mut filter=effect("filter", "stereo-lowpass.ultra");
    filter.parameters.insert("cutoff".into(),777.);
    session.tracks[0].effects.push(filter.clone());
    automation_mut(&mut session,0).push(Lane {instance_id:"filter".into(),key:"cutoff".into(),enabled:true,points:vec![Point {beat:0.,value:1234.}]});
    let first=prepare_score_fixture(&session,&example_path()).unwrap();
    let before=first.events.iter().find(|e| e.kind==1&&first.devices[e.device as usize].instance_id=="filter").unwrap();
    let mut patch=crate::documents::read_patch(Path::new(&filter.path)).unwrap().patch.unwrap();
    patch["device"]["parameters"].as_array_mut().unwrap().reverse();
    let path=std::env::temp_dir().join(format!("alive-reordered-manifest-{}.ultra",std::process::id()));
    std::fs::write(&path,serde_json::to_vec(&patch).unwrap()).unwrap();
    session.tracks[0].effects[0].path=path.to_string_lossy().into();
    // Explicit replacement captures the new authored source, preserving key targets.
    session.tracks[0].effects[0].source_sha256=prepare::fingerprint(&patch).unwrap();
    let second=prepare_score_fixture(&session,&example_path()).unwrap();
    let after=second.events.iter().find(|e| e.kind==1&&second.devices[e.device as usize].instance_id=="filter").unwrap();
    assert_ne!(before.target,after.target);
    assert_eq!(second.devices[after.device as usize].manifest.parameters[after.target as usize].key,"cutoff");
    assert_eq!(after.value,1234.);
    assert_eq!(second.saved.score.tracks[0].effects[0].parameters["cutoff"],777.);
    std::fs::remove_file(path).unwrap();
}

#[test]
fn v4_nested_duplicates_and_invalid_prepared_dependencies_are_transactional(){
    let project=example();
    let text=workspaces::encode(&project).unwrap();let duplicate=text.replacen("\"cutoff\":", "\"cutoff\": 120, \"cutoff\":",1);
    assert_ne!(text,duplicate);assert!(workspaces::decode(&duplicate).is_err());assert!(persistence::decode(&duplicate,&example_path()).is_err());
    for case in ["missing","changed","role"] {
        let mut candidate=project.clone();let workspaces::ChainV4::Midi{instrument:Some(instrument)}=&mut candidate.tracks[0].chain else{unreachable!()};
        match case {"missing"=>instrument.path="/missing-workspace-instrument.ultra".into(),"changed"=>instrument.source_sha256="0".repeat(64),"role"=>{let id=instrument.instance_id.clone();*instrument=effect(&id,"utility.ultra");},_=>unreachable!()}
        let document=candidate;let before=document.clone();let error=prepare_score_fixture(&document,&example_path()).unwrap_err();assert!(error.contains("Pulse")||error.contains("role"),"{case}: {error}");assert_eq!(document,before);
    }
}

#[test]
fn v4_source_compiler_checks_disabled_bindings_and_placement_endpoint_arithmetic(){
    let project=example();
    for (key,value) in [("unknown",1.),("level",0.5),("cutoff",1_000_000.)] {
        let mut candidate=project.clone();let instance=candidate.tracks[0].devices().next().unwrap().instance_id.clone();
        let workspaces::SourceV4::Midi{automation,..}=&mut candidate.sources[0] else{unreachable!()};
        *automation=vec![Lane{instance_id:instance,key:key.into(),enabled:false,points:vec![Point{beat:0.,value}]}];
        assert!(prepare_score_fixture(&candidate,&example_path()).is_err(),"{key}");
    }
    let mut candidate=project;candidate.tempo=137.;candidate.placements[0].start=0.03;candidate.placements[0].duration=0.03;
    let prepared=prepare_score_fixture(&candidate.clone(),&example_path()).unwrap();let w=prepared.schedule;
    let p=w.placements.iter().find(|p|p.id==candidate.placements[0].id).unwrap();
    assert_eq!(p.descriptor.duration_frames,workspaces::frame_at(0.06,137.).unwrap()-workspaces::frame_at(0.03,137.).unwrap());
}

#[test]
fn master_preflight_accepts_nonunity_with_native_capability() {
    let mut candidate=read(&example_path()).unwrap();
    candidate.saved.master.gain=0.5;
    assert!(native::master_capability().is_some());
    assert!(host::Host::preflight_master(&candidate).is_ok());
}

#[test]
fn master_host_install_publishes_saved_gain_before_audio() {
    if native_master::fresh_process("session::tests::master_host_install_publishes_saved_gain_before_audio"){return;}
    let _native_guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut candidate=read(&example_path()).unwrap();candidate.saved.master.gain=0.5;
    let mut host=host::Host::default();host.install(candidate).unwrap();
    let capability=native::master_capability().unwrap();let mut score=native::StateV4::default();
    let mut master=native_master::State::output();
    assert_eq!(unsafe{(capability.snapshot_v4)((&mut score as *mut native::StateV4).cast(),&mut master)},1);
    assert_eq!(master.current_gain,0.5);assert_eq!(master.target_gain,0.5);assert_ne!(master.applied_serial,0);
    assert_eq!(master.applied_frame,score.absolute_frame);
    unsafe{native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
}

#[test]
fn invalid_master_preflight_preserves_the_current_owner() {
    let original=read(&example_path()).unwrap();
    let mut candidate=original.clone();candidate.saved.master.gain=f64::NAN;
    let mut host=host::Host::default();host.prepared=Some(original.clone());
    let revision=host.preparation_revision;
    assert!(host::Host::preflight_master(&candidate).unwrap_err().contains("Master gain"));
    assert_eq!(host.preparation_revision,revision);
    assert_eq!(host.prepared.unwrap().saved,original.saved);
}

#[test]
fn master_read_checks_byte_limit_before_utf8_decoding() {
    let path=std::env::temp_dir().join(format!("alive-master-invalid-utf8-{}.alive",std::process::id()));
    let mut bytes=vec![b' ';1_048_576];bytes.push(0xc3);
    std::fs::write(&path,bytes).unwrap();
    let error=read(&path).unwrap_err();std::fs::remove_file(path).unwrap();
    assert!(error.contains("1 MiB"),"{error}");
}

#[test]
fn current_envelope_roundtrips_master_launch_and_complete_workspace() {
    let mut saved=test_saved(example());saved.master.gain=0.5;
    let occurrence=saved.score.tracks[0].slots[0].as_ref().unwrap().id.clone();
    saved.launch.global_quantization=launch::Quantization::Sixteenth;
    saved.launch.clip_quantization.push(launch::Override{occurrence_id:occurrence,quantization:launch::ClipQuantization::None});
    let bytes=persistence::serialize_saved(&saved).unwrap();assert_eq!(bytes.last(),Some(&b'\n'));
    let wire:serde_json::Value=serde_json::from_slice(&bytes).unwrap();
    assert_eq!(wire["format"],"alive-session-v6");assert_eq!(wire["score"]["format"],"alive-session-v4");
    assert_eq!(persistence::decode(std::str::from_utf8(&bytes).unwrap(),&example_path()).unwrap(),saved);
}

#[test]
fn current_envelope_rejects_missing_unknown_duplicate_and_invalid_members() {
    let saved=test_saved(example());let text=String::from_utf8(persistence::serialize_saved(&saved).unwrap()).unwrap();
    let wire:serde_json::Value=serde_json::from_str(&text).unwrap();
    for member in ["format","score","master","launch"] {
        let mut invalid=wire.clone();invalid.as_object_mut().unwrap().remove(member);
        assert!(persistence::decode(&invalid.to_string(),&example_path()).is_err(),"missing {member}");
    }
    for (path,value) in [
        ("/format",serde_json::json!("unsupported")),("/master/gain",serde_json::json!(-0.01)),
        ("/master/gain",serde_json::json!(4.01)),("/master/gain",serde_json::json!("1")),
        ("/launch/globalQuantization",serde_json::json!("invalid")),
        ("/score/format",serde_json::json!("unsupported")),
    ] {let mut invalid=wire.clone();*invalid.pointer_mut(path).unwrap()=value;assert!(persistence::decode(&invalid.to_string(),&example_path()).is_err(),"{path}");}
    let mut unknown=wire.clone();unknown["extra"]=serde_json::json!(true);
    assert!(persistence::decode(&unknown.to_string(),&example_path()).is_err());
    for (old,new) in [("\"master\": {","\"master\": {}, \"master\": {"),("\"gain\": 1.0","\"gain\": 1.0, \"\\u0067ain\": 1.0"),("\"cutoff\":","\"cutoff\": 120, \"cutoff\":")] {
        let invalid=text.replacen(old,new,1);assert_ne!(invalid,text);assert!(persistence::decode(&invalid,&example_path()).is_err());
    }
    assert!(persistence::decode(&(text.clone()+" false"),&example_path()).is_err());
    let mut maximum=text;maximum.push_str(&" ".repeat(1_048_576-maximum.len()));
    assert!(persistence::decode(&maximum,&example_path()).is_ok());maximum.push(' ');
    assert!(persistence::decode(&maximum,&example_path()).unwrap_err().contains("1 MiB"));
}

#[test]
fn v4_native_host_admits_complete_candidate_and_preserves_old_on_refusal() {
    if native_master::fresh_process("session::tests::v4_native_host_admits_complete_candidate_and_preserves_old_on_refusal"){return;}
    let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let path=Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/quantized-midi.alive");
    let prepared=read(&path).unwrap();let mut host=host::Host::default();host.validate(&prepared).unwrap();host.install(prepared).unwrap();
    let before=host.prepared.as_ref().unwrap().saved.clone();let revision=host.preparation_revision;
    let mut runtime=runtime::Runtime::default();assert_eq!(unsafe{native::ultra_external_start()},1);
    runtime.workspace_request(&host,runtime_workspaces::Action::Start{}).unwrap();
    let mut left=[0f32;1024];let mut right=left;
    assert_eq!(unsafe{native::ultra_external_render(1024,left.as_mut_ptr(),right.as_mut_ptr())},1);
    assert!(left.iter().any(|sample|sample.abs()>1e-6));
    let mut observed=native::StateV4::default();assert_eq!(unsafe{native::alive_session_state_v4(&mut observed)},1);
    let mut invalid=host.prepared.clone().unwrap();invalid.devices[0].graph.node_count=0;
    let rejected=host.admit(&invalid).err().expect("Native admission must reject an empty device graph");assert_ne!(rejected.code,0);
    assert!(host.install(invalid).is_err());assert_eq!(host.preparation_revision,revision);assert_eq!(host.prepared.as_ref().unwrap().saved,before);
    assert_eq!(unsafe{native::ultra_external_render(31,left.as_mut_ptr(),right.as_mut_ptr())},1);
    let mut continued=native::StateV4::default();assert_eq!(unsafe{native::alive_session_state_v4(&mut continued)},1);
    assert_eq!(continued.absolute_frame,observed.absolute_frame+31);assert_eq!(continued.position,observed.position+31);
    assert_eq!(continued.generation,observed.generation);assert_eq!(continued.playing,1);
    unsafe{native::ultra_audio_stop();native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
}
