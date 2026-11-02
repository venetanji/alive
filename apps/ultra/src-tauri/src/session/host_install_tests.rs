use super::*;
use std::path::Path;

fn example() -> PreparedSession {
    super::super::read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive")).unwrap()
}

#[test]
fn candidate_preparation_failure_retains_the_configured_session() {
    if super::super::native_master::fresh_process("session::host::install_tests::candidate_preparation_failure_retains_the_configured_session") { return; }
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let original = example();
    let mut host = Host::default();
    host.install(original.clone()).unwrap();
    let revision = host.preparation_revision;
    let roots = host.revisions;
    // A different serialized owner is still finishing its prepared transaction.
    let pending = DocumentBatch::prepare(&[]).unwrap();
    let mut candidate = original.clone();
    candidate.saved.master.gain = 0.5;
    let result = host.install(candidate);
    drop(pending);
    assert!(result.err().expect("The pending preparation must refuse replacement").contains("pending"));
    assert_eq!(host.preparation_revision, revision);
    assert_eq!(host.revisions, roots);
    assert_eq!(host.prepared.as_ref().unwrap().saved, original.saved);
    let mut state = native::StateV4::default();
    assert_eq!(unsafe { native::alive_session_state_v4(&mut state) }, 1);
    assert_eq!(state.preparation_revision, revision);
    // A failed preparation releases no installed roots and does not poison retry.
    host.install(original).unwrap();
}

#[test]
fn explicit_native_notes_are_refused_before_replacement_and_preserve_revisions() {
    if super::super::native_master::fresh_process("session::host::install_tests::explicit_native_notes_are_refused_before_replacement_and_preserve_revisions") { return; }
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let original=example();
    let mut host=Host::default();host.install(original.clone()).unwrap();
    let revisions=host.revisions;
    let preparation_revision=host.preparation_revision;
    let bank_revision=host.bank_revision;
    let owned_roots=host.owned_roots;
    let mut patch=serde_json::json!({"version":1,"profile":"ultra-canvas-v1",
        "presentation":{"version":1,"openOnLoad":false,"size":{"width":640,"height":120},"items":[]},
        "nodes":[{"id":1,"type":"live_device","x":0,"y":0,"params":{"device":"Analog","state":{
            "version":1,"profile":"live12-analog-v1",
            "dllSha256":"4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133",
            "guiSha256":"5ec872d673fd5f4f5f05787e4245c56e172ff2663c2d4493e94d598b883114e6",
            "graphicsSha256":"a0b8aa480aa3d21f093b416ea59b3f200d2e2466936f95d886a554bffe875cb7",
            "values":vec![0.;203]}}},
            {"id":2,"type":"signal_dac","x":100,"y":0,"params":{"channels":"1 2"}}],
        "edges":[{"from":1,"outlet":0,"to":2,"inlet":0},{"from":1,"outlet":1,"to":2,"inlet":1}]});
    patch["device"]=serde_json::json!({"version":2,"kind":"instrument","id":original.devices[0].manifest.id,
        "name":"Authored native test instrument","midi":{"input":{"kind":"nativeInstrument","node":1,"inlet":0,
            "profile":"live12-analog-v1","profileVersion":1},"output":null},
        "audio":{"input":null,"output":{"channels":2,"layout":"stereo"}},"parameters":[],"presets":[]});
    let compiled=crate::canvas::prepare(patch.clone()).unwrap();
    let manifest=crate::canvas::device::host_manifest(&patch,&compiled.native,&compiled.live_devices).unwrap();
    let mut candidate=original.clone();
    candidate.devices[0].patch=patch;candidate.devices[0].graph=compiled.native;
    candidate.devices[0].live_devices=compiled.live_devices;candidate.devices[0].manifest=manifest;
    // A pending batch makes any attempted foreign preparation fail independently.
    let pending=DocumentBatch::prepare(&[]).unwrap();
    let error=host.admit(&candidate).err().expect("native notes remain closed");
    assert!(error.message.contains("Native instrument note inputs are not admitted"),"{}",error.message);
    assert!(host.install(candidate).unwrap_err().contains("Native instrument note inputs are not admitted"));
    drop(pending);
    assert_eq!(host.revisions,revisions);assert_eq!(host.preparation_revision,preparation_revision);
    assert_eq!(host.bank_revision,bank_revision);assert_eq!(host.owned_roots,owned_roots);
    assert_eq!(host.prepared.as_ref().unwrap().saved,original.saved);
    let mut state=native::StateV4::default();
    assert_eq!(unsafe{native::alive_session_state_v4(&mut state)},1);
    assert_eq!(state.preparation_revision,preparation_revision);
    for (index,_) in original.devices.iter().enumerate(){assert_eq!(state.devices[index].revision,revisions[index]);}
    host.install(original).unwrap();
}

#[test]
fn prospective_admission_reserves_graph_and_preparation_revisions_for_rollback() {
    let candidate = example();
    let mut host = Host::default();
    host.revisions[0] = u64::MAX - 1;
    assert!(host.validate(&candidate).err().expect("A rollback needs a second graph revision").contains("revision exhausted"));
    host.revisions[0] = 0;
    host.preparation_revision = u64::MAX - 1;
    assert!(host.validate(&candidate).err().expect("A rollback needs a second preparation revision").contains("revision exhausted"));
}

#[test]
fn rollback_can_use_the_last_available_graph_and_preparation_revisions() {
    if super::super::native_master::fresh_process("session::host::install_tests::rollback_can_use_the_last_available_graph_and_preparation_revisions") { return; }
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let original = example();
    let mut host = Host::default();
    host.install(original.clone()).unwrap();
    host.revisions[..original.devices.len()].fill(u64::MAX - 2);
    host.preparation_revision = u64::MAX - 2;
    test_fail_after_reset(1);
    let error = host.install(original.clone()).unwrap_err();
    assert!(error.contains("prior session retained"), "{error}");
    assert_eq!(host.preparation_revision, u64::MAX);
    assert!(host.revisions[..original.devices.len()].iter().all(|revision| *revision == u64::MAX));
    assert_eq!(host.prepared.as_ref().unwrap().saved, original.saved);
    let mut state = native::StateV4::default();
    assert_eq!(unsafe { native::alive_session_state_v4(&mut state) }, 1);
    assert_eq!(state.preparation_revision, u64::MAX);
    assert!(host.validate(&original).is_err());
}

#[test]
fn failed_replacement_restores_roots_removed_by_the_candidate() {
    if super::super::native_master::fresh_process("session::host::install_tests::failed_replacement_restores_roots_removed_by_the_candidate") { return; }
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let original = example();
    let mut host = Host::default();
    host.install(original.clone()).unwrap();
    let roots = host.revisions;
    let mut smaller = original.saved.clone();
    let removed = smaller.score.tracks.pop().unwrap().id;
    smaller.score.sources.retain(|source| source.track_id() != removed);
    smaller.score.placements.retain(|placement| placement.track_id != removed);
    let candidate = super::super::prepare(&smaller, &original.origin).unwrap();
    assert_eq!(candidate.devices.len(), 1);
    test_fail_after_reset(1);
    assert!(host.install(candidate.clone()).unwrap_err().contains("prior session retained"));
    assert_eq!(host.prepared.as_ref().unwrap().saved, original.saved);
    let mut state = native::StateV4::default();
    assert_eq!(unsafe { native::alive_session_state_v4(&mut state) }, 1);
    assert_eq!(state.device_count, 2);
    assert_eq!(state.devices[0].revision, roots[0] + 2);
    assert_eq!(state.devices[1].revision, roots[1] + 1);
    assert!(host.owned_roots[0] && host.owned_roots[1]);
    host.install(candidate).unwrap();
    assert!(!host.owned_roots[1]);
    assert_eq!(unsafe { native::alive_session_state_v4(&mut state) }, 1);
    assert_eq!(state.device_count, 1);
}
