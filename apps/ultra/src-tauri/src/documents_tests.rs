use super::*;

#[test]
fn native_descriptors_expose_shared_owner_authority() {
    let mut registry = Registry::default();
    let document = registry.add("Owner".into(), Kind::Patch, Some(patch()), None, None).unwrap();
    let descriptor = serde_json::to_value(document).unwrap();
    assert_eq!(descriptor["shared"], true);
    assert_eq!(descriptor["ownerLabel"], "main");
    assert_eq!(descriptor["viewPath"], serde_json::json!([]));
    assert_eq!(descriptor["authoringRevision"], 0);
}

fn directory() -> PathBuf {
    let path = std::env::temp_dir().join(format!("ultra-documents-{}-{}", std::process::id(), NEXT_TEMP.fetch_add(1, Ordering::Relaxed)));
    fs::create_dir_all(&path).unwrap();
    path
}
fn patch() -> Value {
    serde_json::json!({"version":1,"profile":"ultra-canvas-v1","nodes":[],"edges":[]})
}

#[test]
fn document_identity_is_independent_and_reused_slots_have_new_labels() {
    let mut registry = Registry::default();
    let main = registry.add("Untitled".into(), Kind::Patch, Some(patch()), None, None).unwrap();
    let other = registry.add("Untitled".into(), Kind::Patch, Some(patch()), None, None).unwrap();
    assert_eq!(main.id, 0);
    assert_eq!(other.id, 1);
    assert_ne!(main.label, other.label);
    registry.remove(&main.label).unwrap();
    let next = registry.add("Untitled".into(), Kind::Patch, Some(patch()), None, None).unwrap();
    assert_eq!(next.id, 0);
    assert_ne!(next.label, main.label, "old in-flight window commands must not address a reused slot");
    assert!(registry.get(&main.label).is_err());
    assert_eq!(registry.get(&other.label).unwrap().id, 1);
}

#[test]
fn full_registry_retains_all_documents_and_closing_frees_one_slot() {
    let mut registry = Registry::default();
    for _ in 0..16 { registry.add("Untitled".into(), Kind::Patch, Some(patch()), None, None).unwrap(); }
    assert!(registry.add("Overflow".into(), Kind::Patch, Some(patch()), None, None).is_err());
    assert_eq!(registry.list().len(), 16);
    let removed = registry.list()[7].label.clone();
    registry.remove(&removed).unwrap();
    assert_eq!(registry.add("Available".into(), Kind::Patch, Some(patch()), None, None).unwrap().id, 7);
}

#[test]
fn save_is_atomic_and_imported_sources_are_not_overwritten() {
    let dir = directory();
    let target = dir.join("saved.ultra");
    fs::write(&target, "previous file").unwrap();
    save_patch(&target, &patch()).unwrap();
    assert_eq!(serde_json::from_str::<Value>(&fs::read_to_string(&target).unwrap()).unwrap(), patch());
    assert_eq!(fs::read_dir(&dir).unwrap().count(), 1, "temporary files must be cleaned up");
    let max = dir.join("original.maxpat");
    fs::write(&max, "licensed source").unwrap();
    assert!(save_patch(&max, &patch()).is_err());
    assert_eq!(fs::read_to_string(&max).unwrap(), "licensed source");
    let invalid = serde_json::json!({"version":1,"nodes":[],"edges":[]});
    assert!(save_patch(&target, &invalid).is_err());
    assert_eq!(serde_json::from_str::<Value>(&fs::read_to_string(&target).unwrap()).unwrap(), patch());
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn file_open_canonicalizes_paths_and_routes_max_to_import_report() {
    let dir = directory();
    let target = dir.join("saved.ultra");
    save_patch(&target, &patch()).unwrap();
    let loaded = read_patch(&dir.join("./saved.ultra")).unwrap();
    assert_eq!(loaded.path, fs::canonicalize(&target).unwrap());
    assert_eq!(loaded.patch, Some(patch()));
    assert!(loaded.source.is_none());
    let max = dir.join("example.maxhelp");
    fs::write(&max, r#"{"patcher":{"boxes":[],"lines":[]}}"#).unwrap();
    let imported = read_patch(&max).unwrap();
    assert!(imported.patch.is_none());
    assert!(imported.source.unwrap().contains("patcher"));
    let mut registry = Registry::default();
    let doc = registry.add("saved.ultra".into(), Kind::Patch, loaded.patch, Some(loaded.path.clone()), None).unwrap();
    assert_eq!(registry.for_path(&loaded.path).unwrap().label, doc.label);
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn save_as_rejects_another_open_documents_path_and_dirty_is_local() {
    let dir = directory();
    let a = dir.join("a.ultra"); let b = dir.join("b.ultra");
    save_patch(&a, &patch()).unwrap(); save_patch(&b, &patch()).unwrap();
    let mut registry = Registry::default();
    let first = registry.add("a.ultra".into(), Kind::Patch, Some(patch()), Some(a.clone()), None).unwrap();
    let second = registry.add("b.ultra".into(), Kind::Patch, Some(patch()), Some(b.clone()), None).unwrap();
    registry.get_mut(&first.label).unwrap().dirty = true;
    assert!(!registry.get(&second.label).unwrap().dirty);
    assert!(registry.check_save_path(&first.label, &b).is_err());
    assert!(registry.check_save_path(&first.label, &a).is_ok());
    fs::remove_dir_all(dir).unwrap();
}

#[cfg(unix)]
#[test]
fn save_cannot_overwrite_max_source_through_an_ultra_symlink() {
    let dir = directory();
    let original = dir.join("licensed.maxhelp");
    fs::write(&original, "original content").unwrap();
    let alias = dir.join("alias.ultra");
    std::os::unix::fs::symlink(&original, &alias).unwrap();
    assert!(save_patch(&alias, &patch()).is_err());
    assert_eq!(fs::read_to_string(&original).unwrap(), "original content");
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn imported_max_json_cannot_save_over_its_own_source_path() {
    let dir = directory();
    let source = dir.join("source.json");
    fs::write(&source, r#"{"patcher":{"boxes":[],"lines":[]}}"#).unwrap();
    let mut registry = Registry::default();
    let document = registry.add("source.json".into(), Kind::Patch, None, Some(source.clone()), None).unwrap();
    registry.get_mut(&document.label).unwrap().source = Some("source JSON".into());
    assert!(registry.check_save_path(&document.label, &source).is_err());
    assert!(registry.check_save_path(&document.label, &dir.join("converted.ultra")).is_ok());
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn writing_a_snapshot_compares_the_authoritative_tree() {
    let mut registry = Registry::default();
    let document = registry.add("Untitled".into(), Kind::Patch, Some(patch()), None, None).unwrap();
    registry.get_mut(&document.label).unwrap().dirty = true;
    let saved = registry.saved(&document.label, PathBuf::from("/tmp/written.ultra"), patch()).unwrap();
    assert!(!saved.dirty, "canonical equality acknowledges the saved snapshot");
    assert!(!registry.get(&document.label).unwrap().dirty);
    assert_eq!(saved.title, "written.ultra");
}

fn hierarchy() -> Value {
    serde_json::json!({"version":2,"profile":"ultra-patcher-v2","nodes":[{"id":1,"type":"patcher","x":0,"y":0,"params":{"name":"child"},"patcher":{"nodes":[{"id":2,"type":"number","x":0,"y":0,"params":{"value":1}}],"edges":[]}}],"edges":[]})
}

#[test]
fn child_views_share_owner_identity_without_consuming_slots_and_detach_independently() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    let (child, created) = registry.open_view(&root.label, 1).unwrap();
    assert!(created);
    assert_eq!(child.id, root.id);
    assert_eq!(child.owner_label, root.label);
    assert_eq!(child.view_path, vec![1]);
    assert_ne!(child.label, root.label);
    assert!(!registry.open_view(&child.label, 1).unwrap().1);
    assert_eq!(registry.list().len(), 1);
    registry.remove(&child.label);
    assert!(registry.get(&child.label).is_err());
    assert!(registry.get_open(&root.label).is_ok());
}

#[test]
fn owner_cas_history_admission_and_save_race_are_atomic() {
    let mut registry = Registry::default();
    let original = hierarchy();
    let root = registry.add("Owner".into(), Kind::Patch, Some(original.clone()), None, None).unwrap();
    let (child, _) = registry.open_view(&root.label, 1).unwrap();
    let mut edited = original.clone(); edited["nodes"][0]["patcher"]["nodes"][0]["params"]["value"] = serde_json::json!(12);
    assert!(registry.commit(&child.label, 0, edited.clone(), true, |_,_| Err("rejected".into())).is_err());
    assert_eq!(registry.get(&root.label).unwrap().patch, Some(original.clone()));
    assert!(registry.commit(&child.label, 0, edited.clone(), true, |_,_| Ok(1.into())).unwrap().accepted);
    assert!(!registry.commit(&root.label, 0, original.clone(), true, |_,_| panic!("stale request reached admission")).unwrap().accepted);
    let saved = registry.saved(&child.label, PathBuf::from("/tmp/shared.ultra"), original.clone()).unwrap();
    assert!(saved.dirty);
    assert_eq!(saved.patch, Some(edited.clone()), "save must not replace newer edits");
    let undo = registry.history(&root.label, 1, "undo", |_,_| Ok(2.into())).unwrap();
    assert!(undo.accepted); assert!(!undo.document.dirty);
    assert_eq!(undo.document.patch, Some(original));
    let redo = registry.history(&child.label, 2, "redo", |_,_| Ok(3.into())).unwrap();
    assert!(redo.accepted); assert_eq!(redo.document.patch, Some(edited));
    assert!(redo.document.dirty);
}

#[test]
fn console_records_are_cached_for_each_view_and_drop_counts_stay_cumulative() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    let (child, _) = registry.open_view(&root.label, 1).unwrap();
    let record = |sequence| crate::canvas::ConsoleRecord { sequence, revision:1, frame:0, node:2, level:0, label:"test".into(), text:sequence.to_string() };
    let (rows, dropped) = registry.console(&root.label, vec![record(1)], 3).unwrap();
    assert_eq!(rows.len(), 1); assert_eq!(dropped, 3);
    let (rows, dropped) = registry.console(&child.label, vec![], 3).unwrap();
    assert_eq!(rows.len(), 1); assert_eq!(dropped, 3);
    let (rows, dropped) = registry.console(&root.label, vec![], 3).unwrap();
    assert!(rows.is_empty()); assert_eq!(dropped, 3);
    registry.console(&root.label, (2..=520).map(record).collect(), 3).unwrap();
    let (rows, dropped) = registry.console(&child.label, vec![], 3).unwrap();
    assert_eq!(rows.len(), 512); assert_eq!(dropped, 10);
    assert_eq!(registry.console(&child.label, vec![], 3).unwrap().1, 10);
}

#[test]
fn reading_owner_and_child_installs_once_and_removed_children_detach() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    assert!(registry.prepare_runtime(&root.label, |_| Err("rejected".into())).is_err());
    assert_eq!(registry.prepare_runtime(&root.label, |_| Ok(9.into())).unwrap().runtime_revision, 9);
    let (child, _) = registry.open_view(&root.label, 1).unwrap();
    assert_eq!(registry.prepare_runtime(&child.label, |_| panic!("child installed owner graph")).unwrap().runtime_revision, 9);
    registry.prepare_runtime(&root.label, |_| panic!("repeated read installed owner graph")).unwrap();
    assert!(registry.set_reveal(&child.label, Some(1), Some(9)).is_err());
    registry.set_reveal(&child.label, Some(2), Some(9)).unwrap();
    assert_eq!(registry.descriptor(&child.label).unwrap().reveal_node, Some(2));
    registry.commit(&root.label, 0, empty_patch(), true, |_,_| Ok(10.into())).unwrap();
    assert_eq!(registry.prune_views(&root.label).unwrap(), vec![child.label.clone()]);
    assert!(registry.get_open(&child.label).is_err());
    assert!(registry.get_open(&root.label).is_ok());
}

#[test]
fn pending_reveal_is_not_relabelled_after_runtime_replacement() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    registry.prepare_runtime(&root.label, |_| Ok(9.into())).unwrap();
    let (child, _) = registry.open_view(&root.label, 1).unwrap();
    registry.set_reveal(&root.label, Some(1), Some(9)).unwrap();
    registry.set_reveal(&child.label, Some(2), Some(9)).unwrap();
    let mut replacement = hierarchy();
    replacement["nodes"][0]["patcher"]["nodes"][0]["type"] = serde_json::json!("int");
    registry.commit(&root.label, 0, replacement, true, |_, _| Ok(10.into())).unwrap();
    for label in [&root.label, &child.label] {
        let descriptor = registry.descriptor(label).unwrap();
        assert_eq!(descriptor.runtime_revision, 10);
        assert_eq!(descriptor.reveal_node, None, "old source must not select a reused ID");
        let serialized = serde_json::to_value(descriptor).unwrap();
        assert!(serialized.get("revealNode").is_none());
        assert!(serialized.get("revealRevision").is_none());
    }
}

#[test]
fn source_reveal_requires_matching_revision_before_creating_or_mutating_views() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    registry.prepare_runtime(&root.label, |_| Ok(9.into())).unwrap();
    let serial = registry.serial;
    for revision in [None, Some(8), Some(10)] {
        assert!(registry.open_view_reveal(&root.label, 1, Some(2), revision).is_err());
        assert_eq!(registry.owner_views(&root.label).unwrap(), vec![root.label.clone()]);
        assert_eq!(registry.serial, serial, "rejected reveal consumed a view identity");
    }
    assert!(registry.open_view_reveal(&root.label, 1, Some(99), Some(9)).is_err());
    assert_eq!(registry.serial, serial, "invalid source created a transient view");
    let (child, created) = registry.open_view_reveal(&root.label, 1, Some(2), Some(9)).unwrap();
    assert!(created);
    let serialized = serde_json::to_value(&child).unwrap();
    assert_eq!(serialized["revealNode"], 2);
    assert_eq!(serialized["revealRevision"], 9);
    for revision in [None, Some(8)] {
        assert!(registry.open_view_reveal(&root.label, 1, Some(2), revision).is_err());
        let current = serde_json::to_value(registry.descriptor(&child.label).unwrap()).unwrap();
        assert_eq!(current["revealNode"], 2);
        assert_eq!(current["revealRevision"], 9);
    }
    assert!(registry.open_view_reveal(&child.label, 0, Some(1), Some(8)).is_err());
    assert_eq!(registry.descriptor(&root.label).unwrap().reveal_node, None);
    let (_, created) = registry.open_view_reveal(&root.label, 1, None, None).unwrap();
    assert!(!created, "ordinary child navigation must reuse its view");
    assert_eq!(registry.descriptor(&child.label).unwrap().reveal_node, None);
}

#[test]
fn source_reveal_rejects_reused_ids_after_replacement_and_keeps_captured_revision() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    registry.prepare_runtime(&root.label, |_| Ok(9.into())).unwrap();
    let (child, _) = registry.open_view_reveal(&root.label, 1, Some(2), Some(9)).unwrap();
    let pending = serde_json::to_value(&child).unwrap();
    let mut replacement = hierarchy();
    replacement["nodes"][0]["patcher"]["nodes"][0]["type"] = serde_json::json!("int");
    registry.commit(&root.label, 0, replacement.clone(), true, |_, _| Ok(10.into())).unwrap();
    assert!(registry.open_view_reveal(&root.label, 1, Some(2), Some(9)).is_err());
    assert_eq!(registry.descriptor(&child.label).unwrap().reveal_node, None);
    assert_eq!(pending["revealRevision"], 9, "queued descriptor must retain source revision");
    let (latest, created) = registry.open_view_reveal(&root.label, 1, Some(2), Some(10)).unwrap();
    assert!(!created);
    assert_eq!(serde_json::to_value(&latest).unwrap()["revealRevision"], 10);
    registry.commit(&root.label, 1, replacement, false, |_, _| Ok(10.into())).unwrap();
    assert_eq!(registry.descriptor(&child.label).unwrap().reveal_node, Some(2), "same-runtime publication must retain the pending reveal");
}

#[test]
fn child_view_limit_is_separate_from_root_slots_and_owner_close_detaches_all() {
    let mut registry = Registry::default();
    let nodes: Vec<_> = (1..=65).map(|id| serde_json::json!({"id":id,"type":"patcher","x":0,"y":0,"params":{"name":"p"},"patcher":{"nodes":[],"edges":[]}})).collect();
    let patch = serde_json::json!({"version":2,"profile":"ultra-patcher-v2","nodes":nodes,"edges":[]});
    let root = registry.add("Owner".into(), Kind::Patch, Some(patch), None, None).unwrap();
    let mut labels = Vec::new();
    for id in 1..=64 { labels.push(registry.open_view(&root.label, id).unwrap().0.label); }
    assert!(registry.open_view(&root.label, 65).is_err());
    for _ in 1..16 { registry.add("Other".into(), Kind::Patch, Some(empty_patch()), None, None).unwrap(); }
    assert_eq!(registry.list().len(), 16);
    registry.remove(&labels[0]);
    labels.push(registry.open_view(&root.label, 65).unwrap().0.label);
    registry.get_mut(&root.label).unwrap().close_approved = true;
    assert!(registry.get_open(&labels[1]).is_err());
    registry.remove(&root.label);
    for label in labels { assert!(registry.get(&label).is_err()); }
    assert_eq!(registry.list().len(), 15);
}

#[test]
fn shared_history_bounds_large_authoring_snapshots_by_bytes() {
    let mut registry = Registry::default();
    let nodes: Vec<_> = (1..=200).map(|id| serde_json::json!({"id":id,"type":"comment","x":0,"y":0,"params":{"text":"a".repeat(4096)}})).collect();
    let mut patch = serde_json::json!({"version":2,"profile":"ultra-patcher-v2","nodes":nodes,"edges":[]});
    let root = registry.add("Owner".into(), Kind::Patch, Some(patch.clone()), None, None).unwrap();
    for base in 0..24 {
        patch["nodes"][0]["x"] = serde_json::json!(base + 1);
        registry.commit(&root.label, base, patch.clone(), true, |_,_| Ok(1.into())).unwrap();
    }
    let stored = registry.get(&root.label).unwrap();
    assert!(stored.undo.len() < 24);
    assert!(stored.undo.iter().chain(stored.redo.iter()).map(|snapshot| snapshot.bytes).sum::<usize>() <= 16 * 1024 * 1024);
    let mut count = 0;
    while registry.get(&root.label).unwrap().can_undo {
        let base = registry.get(&root.label).unwrap().authoring_revision;
        registry.history(&root.label, base, "undo", |_,_| Ok(1.into())).unwrap();
        count += 1;
    }
    assert!(count > 0 && count < 24);
    assert!(registry.get(&root.label).unwrap().can_redo);
}

fn flush_request(gate: CloseGate) -> (u64, Vec<String>) {
    match gate { CloseGate::Flush { token, views } => (token, views), _ => panic!("close did not request editor flush") }
}

#[test]
fn owner_close_waits_for_all_ready_views_and_rejects_stale_or_forged_acknowledgements() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    let child = registry.open_view(&root.label, 1).unwrap().0;
    let other = registry.add("Other".into(), Kind::Patch, Some(empty_patch()), None, None).unwrap();
    assert!(matches!(registry.begin_close(&root.label).unwrap(), CloseGate::Proceed));
    for label in [&root.label, &child.label, &other.label] { registry.mark_ready(label).unwrap(); }
    let (token, views) = flush_request(registry.begin_close(&root.label).unwrap());
    assert_eq!(views, vec![root.label.clone(), child.label.clone()]);
    assert!(matches!(registry.begin_close(&root.label).unwrap(), CloseGate::Waiting));
    assert!(registry.acknowledge_close(&other.label, &root.label, token).is_err());
    assert!(registry.acknowledge_close(&child.label, &root.label, token + 1).is_err());
    assert!(!registry.acknowledge_close(&root.label, &root.label, token).unwrap());
    assert!(matches!(registry.begin_close(&root.label).unwrap(), CloseGate::Waiting));
    assert!(registry.acknowledge_close(&child.label, &root.label, token).unwrap());
    assert!(matches!(registry.begin_close(&root.label).unwrap(), CloseGate::Proceed));
    let release = registry.release_close(&root.label).unwrap();
    assert_eq!(release.token, token);
    assert_eq!(release.views, vec![root.label.clone(), child.label.clone()]);
    let (next, _) = flush_request(registry.begin_close(&root.label).unwrap());
    assert!(next > token, "the completed gate is consumed exactly once");
}

#[test]
fn child_close_flushes_only_that_view_and_disappearance_releases_owner_obligation() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    let child = registry.open_view(&root.label, 1).unwrap().0;
    registry.mark_ready(&root.label).unwrap(); registry.mark_ready(&child.label).unwrap();
    let (child_token, views) = flush_request(registry.begin_close(&child.label).unwrap());
    assert_eq!(views, vec![child.label.clone()]);
    assert!(registry.acknowledge_close(&root.label, &child.label, child_token).is_err());
    let (owner_token, _) = flush_request(registry.begin_close(&root.label).unwrap());
    assert!(!registry.acknowledge_close(&root.label, &root.label, owner_token).unwrap());
    registry.remove(&child.label);
    assert_eq!(registry.take_completed_closes(), vec![root.label.clone()]);
    assert!(matches!(registry.begin_close(&root.label).unwrap(), CloseGate::Proceed));
    assert!(registry.acknowledge_close(&child.label, &child.label, child_token).is_err());
    registry.remove(&root.label);
    assert!(registry.take_completed_closes().is_empty());
}

#[test]
fn failed_close_flush_is_cancelled_and_next_attempt_uses_a_new_token() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    let child = registry.open_view(&root.label, 1).unwrap().0;
    registry.mark_ready(&root.label).unwrap();
    let (token, views) = flush_request(registry.begin_close(&root.label).unwrap());
    assert_eq!(views, vec![root.label.clone()], "unready children have no editor changes to flush");
    assert!(registry.cancel_close(&root.label, token + 1).is_err());
    assert!(registry.reject_close(&child.label, &root.label, token).is_err());
    registry.reject_close(&root.label, &root.label, token).unwrap();
    let (next, _) = flush_request(registry.begin_close(&root.label).unwrap());
    assert!(next > token);
    assert!(registry.acknowledge_close(&root.label, &root.label, token).is_err());
    assert!(registry.get_open(&child.label).is_ok());
}

#[test]
fn owner_dirty_decision_observes_the_child_commit_flushed_before_its_acknowledgement() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    let child = registry.open_view(&root.label, 1).unwrap().0;
    registry.mark_ready(&root.label).unwrap(); registry.mark_ready(&child.label).unwrap();
    assert!(!registry.get(&root.label).unwrap().dirty);
    let (token, _) = flush_request(registry.begin_close(&root.label).unwrap());
    assert!(!registry.acknowledge_close(&root.label, &root.label, token).unwrap());
    let mut edited = hierarchy();
    edited["nodes"][0]["patcher"]["nodes"][0]["params"]["value"] = serde_json::json!(42);
    registry.commit(&child.label, 0, edited, true, |_,_| Ok(1.into())).unwrap();
    assert!(registry.acknowledge_close(&child.label, &root.label, token).unwrap());
    assert!(matches!(registry.begin_close(&root.label).unwrap(), CloseGate::Proceed));
    assert!(registry.get(&root.label).unwrap().dirty, "dirty prompt must inspect the newly flushed canonical tree");
    registry.get_mut(&root.label).unwrap().dirty = false;
    registry.allow_close_once(&root.label).unwrap();
    assert!(matches!(registry.begin_close(&root.label).unwrap(), CloseGate::Proceed), "Discard must not start another flush pass");
}

#[test]
fn descriptor_revision_orders_runtime_and_save_publications_without_authoring_conflicts() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(empty_patch()), None, None).unwrap();
    let ready = registry.prepare_runtime(&root.label, |_| Ok(1.into())).unwrap();
    assert!(ready.descriptor_revision > root.descriptor_revision);
    let reapplied = registry.commit(&root.label, 0, empty_patch(), true, |_,_| Ok(2.into())).unwrap().document;
    assert_eq!(reapplied.authoring_revision, 0);
    assert!(reapplied.descriptor_revision > ready.descriptor_revision);
    let saved = registry.saved(&root.label, PathBuf::from("/tmp/descriptor-order.ultra"), empty_patch()).unwrap();
    assert_eq!(saved.authoring_revision, 0);
    assert_eq!(saved.runtime_revision, reapplied.runtime_revision);
    assert!(saved.descriptor_revision > reapplied.descriptor_revision);
    let edited = registry.commit(&root.label, 0, hierarchy(), true, |_,_| Ok(3.into())).unwrap();
    assert!(edited.accepted);
    assert!(edited.document.descriptor_revision > saved.descriptor_revision);
    let stale = registry.commit(&root.label, 0, empty_patch(), true, |_,_| panic!("stale admission")).unwrap();
    assert!(!stale.accepted);
    assert_eq!(stale.document.descriptor_revision, edited.document.descriptor_revision);
}

#[test]
fn child_becoming_ready_during_owner_flush_adds_an_acknowledgement_obligation() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    let child = registry.open_view(&root.label, 1).unwrap().0;
    registry.mark_ready(&root.label).unwrap();
    let (token, _) = flush_request(registry.begin_close(&root.label).unwrap());
    registry.mark_ready(&child.label).unwrap();
    assert!(!registry.acknowledge_close(&root.label, &root.label, token).unwrap(), "a newly ready child must also flush before owner close");
    assert!(registry.acknowledge_close(&child.label, &root.label, token).unwrap());
}

#[test]
fn newly_ready_child_reopens_completed_gate_and_dialog_cancel_releases_all_members() {
    let mut registry = Registry::default();
    let root = registry.add("Owner".into(), Kind::Patch, Some(hierarchy()), None, None).unwrap();
    let child = registry.open_view(&root.label, 1).unwrap().0;
    registry.mark_ready(&root.label).unwrap();
    let (token, _) = flush_request(registry.begin_close(&root.label).unwrap());
    assert!(registry.acknowledge_close(&root.label, &root.label, token).unwrap());
    let notices = registry.mark_ready(&child.label).unwrap();
    assert_eq!(notices.len(), 1); assert_eq!(notices[0].token, token); assert_eq!(notices[0].views, vec![child.label.clone()]);
    assert!(matches!(registry.begin_close(&root.label).unwrap(), CloseGate::Waiting));
    assert!(registry.acknowledge_close(&child.label, &root.label, token).unwrap());
    assert!(matches!(registry.begin_close(&root.label).unwrap(), CloseGate::Proceed));
    assert!(registry.owner_close_active(&child.label).unwrap());
    let release = registry.release_close(&root.label).unwrap();
    assert_eq!(release.views, vec![root.label.clone(), child.label.clone()]);
    assert!(!registry.owner_close_active(&child.label).unwrap());
}

#[test]
fn a_child_ready_during_dirty_dialog_joins_barrier_without_retriggering_close() {
    let mut registry = Registry::default();
    let mut patch = hierarchy();
    patch["nodes"].as_array_mut().unwrap().push(serde_json::json!({"id":3,"type":"patcher","x":0,"y":0,"params":{"name":"second"},"patcher":{"nodes":[],"edges":[]}}));
    let root = registry.add("Owner".into(), Kind::Patch, Some(patch), None, None).unwrap();
    let child = registry.open_view(&root.label, 1).unwrap().0;
    registry.mark_ready(&root.label).unwrap();
    let (token, _) = flush_request(registry.begin_close(&root.label).unwrap());
    assert!(registry.acknowledge_close(&root.label, &root.label, token).unwrap());
    assert!(matches!(registry.begin_close(&root.label).unwrap(), CloseGate::Proceed));
    assert!(registry.open_view(&root.label, 3).is_err());
    assert_eq!(registry.mark_ready(&child.label).unwrap()[0].token, token);
    assert!(!registry.acknowledge_close(&child.label, &root.label, token).unwrap(), "the dirty dialog is already handling close");
    let release = registry.release_close(&root.label).unwrap();
    assert_eq!(release.views.len(), 2);
    assert!(registry.open_view(&root.label, 3).is_ok());
}

#[test]
fn admitted_close_blocks_late_graph_and_save_commands_before_destroy() {
    let mut registry = Registry::default();
    let document = registry.add("Untitled".into(), Kind::Patch, Some(patch()), None, None).unwrap();
    registry.get_mut(&document.label).unwrap().close_approved = true;
    assert!(registry.get_open(&document.label).is_err());
    assert!(registry.check_save_path(&document.label, Path::new("/tmp/closed.ultra")).is_err());
    assert!(registry.get(&document.label).is_ok(), "identity stays reserved until native destruction");
}
