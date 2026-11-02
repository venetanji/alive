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
