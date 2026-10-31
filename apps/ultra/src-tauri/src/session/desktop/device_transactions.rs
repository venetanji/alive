use super::*;

struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!(
            "alive-device-transaction-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&root).unwrap();
        Self(root)
    }
    fn path(&self) -> PathBuf {
        self.0.join("cached.ultra")
    }
    fn restore(&self) {
        std::fs::write(
            self.path(),
            include_bytes!("../../../../examples/subtractive.ultra"),
        )
        .unwrap();
    }
    fn ready_entry(&self) -> browser::Entry {
        self.restore();
        let config = browser::Config::user_fixture(&self.0);
        let page = browser::CatalogCache::default()
            .page(browser::Request::default(), &config)
            .unwrap();
        let entry = page
            .entries
            .into_iter()
            .find(|e| e.provider == browser::Provider::User)
            .unwrap();
        assert_eq!(entry.availability, browser::Availability::Ready);
        entry
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}
fn control() -> Control {
    let mut c = super::tests::musical_control();
    let mut initial = c.host.prepared.clone().unwrap();
    let id = initial.saved.score.tracks[1].id.clone();
    initial.saved.score.tracks[1].chain = workspaces::ChainV4::Audio {};
    initial.saved.score.tracks[1].slots = [None, None, None, None];
    initial.saved.score.sources.retain(|s| s.track_id() != id);
    initial.saved.score.placements.retain(|p| p.track_id != id);
    let utility = Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples/utility.ultra");
    let effect = capture_device(&utility, &initial.saved.score).unwrap();
    initial.saved.score.tracks[0].effects.push(effect);
    let prepared = prepare(&initial.saved, &initial.origin).unwrap();
    c.accepted_serial = c.host.install(prepared).unwrap();
    c
}
fn cleanup() {
    unsafe {
        native::ultra_audio_stop();
        native::alive_session_reset();
        for slot in 0..16 {
            crate::ultra_canvas_close_document(slot);
        }
    }
}
fn retained(c: &Control) -> serde_json::Value {
    serde_json::json!({"saved":persistence::serialize_saved(&c.host.prepared.as_ref().unwrap().saved).unwrap(),"generation":c.generation,"revision":c.edit_revision,"dirty":c.dirty,"history":c.history.view(),"undo":c.history.target(Direction::Undo).ok(),"redo":c.history.target(Direction::Redo).ok(),"reserved":c.history.identities().into_iter().collect::<std::collections::BTreeSet<_>>()})
}
fn load(c: &mut Control, anchor: &str, path: &Path) -> Result<(), String> {
    c.device_edit(
        anchor,
        "loadNewTrack",
        None,
        None,
        c.generation,
        c.edit_revision,
        || Ok(Some(path.to_owned())),
    )
}

#[test]
fn cached_instrument_failures_leave_automatic_track_and_history_unpublished() {
    if native_master::fresh_process("session::desktop::device_transactions::cached_instrument_failures_leave_automatic_track_and_history_unpublished"){return}
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let f = Fixture::new();
    let mut c = control();
    // Keep an existing Undo/Redo cursor so refusal must preserve more than an empty history.
    let before = c.host.prepared.as_ref().unwrap().saved.score.clone();
    let mut renamed = before.clone();
    renamed.title = "Before compound load".into();
    c.history.record(&before, &renamed, "Rename").unwrap();
    c.host.prepared.as_mut().unwrap().saved.score = renamed;
    c.history(Direction::Undo, c.generation, c.edit_revision)
        .unwrap();
    for index in [0, 1] {
        for failure in ["missing", "invalid", "unsupported"] {
            let entry = f.ready_entry();
            let path = entry.path.unwrap();
            match failure {
                "missing" => std::fs::remove_file(&path).unwrap(),
                "invalid" => std::fs::write(&path, b"not saved JSON").unwrap(),
                _ => {
                    let mut patch: serde_json::Value = serde_json::from_slice(include_bytes!(
                        "../../../../examples/subtractive.ultra"
                    ))
                    .unwrap();
                    patch["nodes"]
                        .as_array_mut()
                        .unwrap()
                        .push(serde_json::json!({"id":99,"type":"voice","x":0,"y":0,"params":{}}));
                    std::fs::write(&path, serde_json::to_vec(&patch).unwrap()).unwrap();
                }
            }
            let expected = retained(&c);
            let preparation = c.host.preparation_revision;
            let anchor = c.host.prepared.as_ref().unwrap().saved.score.tracks[index]
                .id
                .clone();
            let error = load(&mut c, &anchor, &path).unwrap_err();
            let reason = match failure {
                "missing" => "Cannot open",
                "invalid" => "not valid JSON",
                _ => "does not support legacy Voice",
            };
            assert!(
                error.contains(reason),
                "transaction must reach real {failure} file admission: {error}"
            );
            assert_eq!(retained(&c), expected, "{failure} from track {index}");
            assert_eq!(c.host.preparation_revision, preparation);
        }
    }
    cleanup();
}

#[test]
fn automatic_instrument_track_from_audio_commits_one_history_entry_and_redoes_captured_identity() {
    if native_master::fresh_process("session::desktop::device_transactions::automatic_instrument_track_from_audio_commits_one_history_entry_and_redoes_captured_identity"){return}
    successful_load(1);
}
#[test]
fn automatic_instrument_track_from_occupied_midi_commits_one_history_entry_and_redoes_captured_identity(
) {
    if native_master::fresh_process("session::desktop::device_transactions::automatic_instrument_track_from_occupied_midi_commits_one_history_entry_and_redoes_captured_identity"){return}
    successful_load(0);
}
fn successful_load(index: usize) {
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let f = Fixture::new();
    f.restore();
    let mut c = control();
    let original = c.host.prepared.as_ref().unwrap().saved.score.clone();
    let anchor = original.tracks[index].id.clone();
    load(&mut c, &anchor, &f.path()).unwrap();
    let loaded = c.host.prepared.as_ref().unwrap().saved.score.clone();
    assert_eq!(loaded.tracks.len(), original.tracks.len() + 1);
    assert_eq!(c.generation, 8);
    assert_eq!(c.edit_revision, 1);
    assert!(c.dirty);
    let added = &loaded.tracks[index + 1];
    let instance = added.instrument().unwrap().instance_id.clone();
    assert!(
        c.history.identities().contains(&instance),
        "removed instrument identities must stay reserved for Redo"
    );
    assert_eq!(
        serde_json::to_value(c.history.view()).unwrap()["undoLabel"],
        "Insert MIDI instrument"
    );
    // Live values on surviving instances stay outside the history payload.
    let survivor = original.tracks[0].instrument().unwrap().instance_id.clone();
    let effect = original.tracks[0].effects[0].instance_id.clone();
    c.host.base(&survivor, "cutoff", 4321.).unwrap();
    c.host.mixer(0, 0.23, true, false).unwrap();
    c.host.bypass(&effect, true).unwrap();
    c.history(Direction::Undo, c.generation, c.edit_revision)
        .unwrap();
    assert_eq!(
        c.host.prepared.as_ref().unwrap().saved.score.tracks.len(),
        original.tracks.len()
    );
    assert!(!c.history.view().can_undo);
    assert!(c.history.view().can_redo);
    let undo = retained(&c);
    std::fs::write(f.path(), b"{}").unwrap();
    assert!(c
        .history(Direction::Redo, c.generation, c.edit_revision)
        .is_err());
    assert_eq!(retained(&c), undo);
    f.restore();
    // Rebase even the removed track's device record on Save As.
    let destination = f.0.join(format!("saved-{index}/session.alive"));
    std::fs::create_dir_all(destination.parent().unwrap()).unwrap();
    save_to_path(&mut c, &destination).unwrap();
    c.history(Direction::Redo, c.generation, c.edit_revision)
        .unwrap();
    let redone = &c.host.prepared.as_ref().unwrap().saved.score;
    assert_eq!(redone.tracks[index + 1].id, added.id);
    assert_eq!(
        redone.tracks[index + 1].instrument().unwrap().instance_id,
        instance
    );
    let restored = redone.tracks[index + 1].instrument().unwrap();
    assert_eq!(
        restored.source_sha256,
        added.instrument().unwrap().source_sha256
    );
    assert!(!Path::new(&restored.path).is_absolute());
    assert_eq!(
        destination
            .parent()
            .unwrap()
            .join(&restored.path)
            .canonicalize()
            .unwrap(),
        f.path().canonicalize().unwrap()
    );
    assert_eq!(redone.tracks[0].gain, 0.23);
    assert!(redone.tracks[0].mute);
    assert_eq!(
        redone
            .tracks
            .iter()
            .flat_map(|t| t.devices())
            .find(|d| d.instance_id == survivor)
            .unwrap()
            .parameters["cutoff"],
        4321.
    );
    assert!(redone.tracks[0].effects[0].bypassed);
    assert!(c.history.view().can_undo);
    assert!(!c.history.view().can_redo);
    cleanup();
}

#[test]
fn automatic_instrument_native_install_failure_retains_owner_and_history_cursor() {
    if native_master::fresh_process("session::desktop::device_transactions::automatic_instrument_native_install_failure_retains_owner_and_history_cursor"){return}
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut c = control();
    let f = Fixture::new();
    f.restore();
    let before = c.host.prepared.as_ref().unwrap().saved.score.clone();
    let mut after = before.clone();
    after.title = "Existing music".into();
    c.history.record(&before, &after, "Rename").unwrap();
    c.host.prepared.as_mut().unwrap().saved.score = after;
    let expected = retained(&c);
    host::test_fail_after_reset(1);
    let error = load(&mut c, &before.tracks[1].id, &f.path()).unwrap_err();
    assert!(error.contains("prior session retained"), "{error}");
    assert_eq!(retained(&c), expected);
    cleanup();
}

#[test]
fn automatic_instrument_and_structural_history_keep_version_transport_and_pending_guards() {
    if native_master::fresh_process("session::desktop::device_transactions::automatic_instrument_and_structural_history_keep_version_transport_and_pending_guards"){return}
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let mut c = control();
    let f = Fixture::new();
    f.restore();
    let anchor = c.host.prepared.as_ref().unwrap().saved.score.tracks[1]
        .id
        .clone();
    let before = retained(&c);
    for (track, generation, revision) in [
        (&anchor, 6, 0),
        (&anchor, 7, 1),
        (&"removed-track".to_owned(), 7, 0),
    ] {
        assert!(c
            .device_edit(
                track,
                "loadNewTrack",
                None,
                None,
                generation,
                revision,
                || panic!("authorization must precede dependency access")
            )
            .is_err());
        assert_eq!(retained(&c), before);
    }
    let mut chosen = 0;
    c.device_edit(&anchor, "loadNewTrack", None, None, 7, 0, || {
        chosen += 1;
        Ok(None)
    })
    .unwrap();
    assert_eq!(chosen, 1);
    assert_eq!(retained(&c), before);
    // An explicit Audio-track instrument drop must still refuse instead of adding a track.
    assert!(c
        .device_edit(&anchor, "load", None, None, 7, 0, || panic!(
            "Audio drops refuse before dependency access"
        ))
        .is_err());
    assert_eq!(retained(&c), before);
    load(&mut c, &anchor, &f.path()).unwrap();
    let accepted = retained(&c);
    assert_eq!(unsafe { native::ultra_external_start() }, 1);
    c.runtime
        .workspace_request(&c.host, runtime_workspaces::Action::Start {})
        .unwrap();
    let mut left = [0f32; 1];
    let mut right = [0f32; 1];
    assert_eq!(
        unsafe { native::ultra_external_render(1, left.as_mut_ptr(), right.as_mut_ptr()) },
        1
    );
    assert!(c
        .history(Direction::Undo, c.generation, c.edit_revision)
        .unwrap_err()
        .contains("Stop transport"));
    assert_eq!(retained(&c), accepted);
    assert!(c
        .device_edit(
            &anchor,
            "loadNewTrack",
            None,
            None,
            c.generation,
            c.edit_revision,
            || panic!("rolling admission must not open a dependency")
        )
        .unwrap_err()
        .contains("Stop transport"));
    let track_id = c.host.prepared.as_ref().unwrap().saved.score.tracks[0]
        .id
        .clone();
    c.workspace_edit(
        "main",
        workspaces::WorkspaceEditV4::MidiClipCreate {
            track_id,
            slot: 1,
            name: "Awaiting playback".into(),
        },
        c.generation,
        c.edit_revision,
    )
    .unwrap();
    assert!(c.publication_pending.is_some());
    let pending = retained(&c);
    assert!(c
        .history(Direction::Undo, c.generation, c.edit_revision)
        .unwrap_err()
        .contains("awaiting playback"));
    assert_eq!(retained(&c), pending);
    assert!(c
        .device_edit(
            &anchor,
            "loadNewTrack",
            None,
            None,
            c.generation,
            c.edit_revision,
            || panic!("pending admission must not open a dependency")
        )
        .unwrap_err()
        .contains("awaiting playback"));
    assert_eq!(retained(&c), pending);
    cleanup();
}
