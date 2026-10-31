use super::*;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};

struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        static NEXT: AtomicU64 = AtomicU64::new(0);
        let root = std::env::temp_dir().join(format!(
            "alive-browser-{}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(root.join("source/src-tauri")).unwrap();
        Self(root)
    }
    fn write(&self, relative: &str, bytes: &[u8]) -> PathBuf {
        let path = self.0.join(relative);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, bytes).unwrap();
        path
    }
    fn device(&self, relative: &str) -> PathBuf {
        self.write(
            relative,
            include_bytes!("../../../../examples/subtractive.ultra"),
        )
    }
    fn config(&self) -> Config {
        Config {
            resources: self.0.join("resources"),
            source: self.0.join("source/src-tauri"),
            user_roots: vec![self.0.join("user")],
            live_roots: vec![self.0.join("live")],
            live_resources: Vec::new(),
        }
    }
    fn discover(&self) -> Discovery {
        discover(&self.config(), Limits::default()).unwrap()
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn users(discovery: &Discovery) -> Vec<&Entry> {
    discovery
        .entries
        .iter()
        .filter(|e| e.provider == Provider::User)
        .collect()
}

#[cfg(unix)]
#[test]
fn non_utf8_saved_paths_are_isolated_in_serializable_pages() {
    use std::{
        ffi::OsString,
        os::unix::{ffi::OsStringExt, fs::symlink},
    };
    let f = Fixture::new();
    let valid = f.device("user/valid.ultra");
    let bad_file =
        f.0.join("user")
            .join(OsString::from_vec(b"device-\xff.ultra".to_vec()));
    let bad_directory = f.0.join(OsString::from_vec(b"root-\xfe".to_vec()));
    fs::create_dir_all(&bad_directory).unwrap();
    let bad_ancestor = bad_directory.join("nested.ultra");
    let bundled_target = bad_directory.join("bundled.ultra");
    for path in [&bad_file, &bad_ancestor, &bundled_target] {
        fs::write(
            path,
            include_bytes!("../../../../examples/subtractive.ultra"),
        )
        .unwrap();
    }
    let bundled =
        f.0.join("resources/alive-session/ultra/examples/subtractive.ultra");
    fs::create_dir_all(bundled.parent().unwrap()).unwrap();
    symlink(&bundled_target, &bundled).unwrap();
    let mut config = f.config();
    config.user_roots.push(bad_directory);
    let cache = CatalogCache::default();
    let page = cache
        .request(Request::default(), || discover(&config, Limits::default()))
        .unwrap();
    let json = serde_json::to_value(&page).expect("one unsupported path must not poison its page");
    let entries = json["entries"].as_array().unwrap();
    assert!(entries
        .iter()
        .any(|entry| entry["path"] == valid.to_str().unwrap() && entry["availability"] == "ready"));
    use sha2::{Digest, Sha256};
    let user_id = |path: &Path| {
        format!(
            "user:{:x}",
            Sha256::digest(path.as_os_str().as_encoded_bytes())
        )
    };
    let unsupported_ids = [
        user_id(&bad_file),
        user_id(&bad_ancestor),
        "bundled:subtractive".into(),
    ];
    for id in &unsupported_ids {
        let entry = entries.iter().find(|entry| entry["id"] == *id).unwrap();
        assert!(entry["path"].is_null());
        assert_eq!(entry["availability"], "unavailable");
        assert_eq!(entry["qualification"], "unsupported");
        assert!(entry["reason"].as_str().unwrap().contains("UTF-8"));
    }
    let refreshed = cache
        .request(
            Request {
                refresh: true,
                cursor: None,
            },
            || discover(&config, Limits::default()),
        )
        .unwrap();
    serde_json::to_value(&refreshed).unwrap();
    for id in unsupported_ids {
        assert!(refreshed.entries.iter().any(|entry| entry.id == id));
    }
}

#[test]
fn installed_resources_win_and_missing_siblings_stay_visible() {
    let f = Fixture::new();
    let installed = f.device("resources/alive-session/ultra/examples/subtractive.ultra");
    f.device("source/examples/subtractive.ultra");
    f.write(
        "resources/alive-session/ultra/examples/utility.ultra",
        b"invalid",
    );
    let d = f.discover();
    let sub = d
        .entries
        .iter()
        .find(|e| e.id == "bundled:subtractive")
        .unwrap();
    assert_eq!(sub.path.as_ref(), Some(&installed.canonicalize().unwrap()));
    assert_eq!(sub.availability, Availability::Ready);
    assert_eq!(sub.name, "Subtractive");
    let utility = d
        .entries
        .iter()
        .find(|e| e.id == "bundled:utility")
        .unwrap();
    assert_eq!(utility.kind, MusicalKind::AudioEffect);
    assert_eq!(utility.availability, Availability::Unavailable);
    assert!(utility.reason.as_ref().is_some_and(|r| !r.is_empty()));
    let missing = d
        .entries
        .iter()
        .find(|e| e.id == "bundled:stereo-lowpass")
        .unwrap();
    assert!(missing.path.is_none());
    assert_eq!(missing.availability, Availability::Unavailable);
}

#[test]
fn source_bundles_are_used_without_installed_resources() {
    let f = Fixture::new();
    let source = f.device("source/examples/subtractive.ultra");
    let d = f.discover();
    assert!(d
        .entries
        .iter()
        .any(|e| e.path.as_ref() == Some(&source) && e.availability == Availability::Ready));
}

#[test]
fn valid_user_documents_have_stable_path_identities_and_invalid_neighbors_do_not_hide_them() {
    let f = Fixture::new();
    f.device("user/a.ultra");
    f.device("user/b.ultra");
    f.write("user/bad.ultra", b"{}");
    f.write("user/ignore.json", b"{}");
    let a = f.discover();
    let b = f.discover();
    assert_eq!(users(&a).len(), 3);
    assert_eq!(
        users(&a)
            .iter()
            .filter(|e| e.availability == Availability::Ready)
            .count(),
        2
    );
    assert_eq!(
        users(&a).iter().map(|e| &e.id).collect::<Vec<_>>(),
        users(&b).iter().map(|e| &e.id).collect::<Vec<_>>()
    );
    let ids = users(&a)
        .iter()
        .map(|e| e.id.as_str())
        .collect::<HashSet<_>>();
    assert_eq!(
        ids.len(),
        3,
        "two saved paths with the same manifest identity remain distinct"
    );
}

#[cfg(unix)]
#[test]
fn bundled_and_user_aliases_emit_one_descriptor_per_actual_saved_device() {
    use std::os::unix::fs::symlink;
    let f = Fixture::new();
    let original = f.device("resources/alive-session/ultra/examples/subtractive.ultra");
    symlink(
        &original,
        f.0.join("resources/alive-session/ultra/examples/utility.ultra"),
    )
    .unwrap();
    let distinct = f.device("resources/alive-session/ultra/examples/stereo-lowpass.ultra");
    fs::create_dir_all(f.0.join("user")).unwrap();
    symlink(&original, f.0.join("user/alias.ultra")).unwrap();

    let d = f.discover();

    assert_eq!(
        d.entries
            .iter()
            .filter(|entry| entry.path.as_ref() == Some(&original))
            .count(),
        1,
        "bundled filenames and user aliases must share one canonical descriptor"
    );
    assert_eq!(d.entries.len(), 2);
    assert!(d
        .entries
        .iter()
        .any(|entry| entry.id == "bundled:subtractive"
            && entry.path.as_ref() == Some(&original)
            && entry.availability == Availability::Ready));
    assert!(d
        .entries
        .iter()
        .any(|entry| entry.id == "bundled:stereo-lowpass"
            && entry.path.as_ref() == Some(&distinct)
            && entry.availability == Availability::Ready));
    assert!(users(&d).is_empty());
}

#[cfg(unix)]
#[test]
fn file_aliases_are_deduplicated_and_directory_symlinks_are_never_walked() {
    use std::os::unix::fs::symlink;
    let f = Fixture::new();
    let original = f.device("user/a.ultra");
    symlink(&original, f.0.join("user/alias.ultra")).unwrap();
    symlink(f.0.join("user"), f.0.join("user/loop")).unwrap();
    f.device("outside/hidden.ultra");
    symlink(f.0.join("outside"), f.0.join("user/outside")).unwrap();
    let mut config = f.config();
    config.user_roots.push(f.0.join("user"));
    config.user_roots.push(f.0.join("user/loop"));
    let d = discover(&config, Limits::default()).unwrap();
    assert_eq!(users(&d).len(), 1);
    assert_eq!(users(&d)[0].path.as_ref(), Some(&original));
}

#[test]
fn native_source_and_cross_document_graphs_are_not_admitted() {
    let f = Fixture::new();
    for kind in ["voice", "send", "receive"] {
        let mut patch: serde_json::Value =
            serde_json::from_slice(include_bytes!("../../../../examples/subtractive.ultra"))
                .unwrap();
        patch["nodes"]
            .as_array_mut()
            .unwrap()
            .push(serde_json::json!({"id":99,"type":kind,"x":0,"y":0,"params":{}}));
        assert!(
            crate::canvas::prepare(patch.clone()).is_ok(),
            "fixture must compile as canvas metadata"
        );
        f.write(
            &format!("user/{kind}.ultra"),
            &serde_json::to_vec(&patch).unwrap(),
        );
    }
    let d = f.discover();
    assert_eq!(users(&d).len(), 3);
    assert!(users(&d)
        .iter()
        .all(|entry| entry.availability == Availability::Unavailable
            && entry.qualification == Qualification::Unsupported
            && entry.reason.as_ref().unwrap().contains("not admitted")));
}

#[test]
fn scan_depth_and_read_bounds_are_reported_without_hiding_valid_neighbors() {
    let f = Fixture::new();
    f.device("user/a.ultra");
    f.write("user/huge.ultra", &vec![b' '; 1025]);
    f.device("user/deep/hidden.ultra");
    let mut limits = Limits::default();
    limits.depth = 0;
    limits.file_bytes = 1024;
    let d = discover(&f.config(), limits).unwrap();
    assert!(d.notices.iter().any(|n| n.contains("depth")));
    assert!(d.notices.iter().any(|n| n.contains("per-file")));
    limits = Limits::default();
    limits.visits = 1;
    let d = discover(&f.config(), limits).unwrap();
    assert!(d.notices.iter().any(|n| n.contains("visited")));
    limits = Limits::default();
    limits.read_bytes = include_bytes!("../../../../examples/subtractive.ultra").len() as u64;
    let d = discover(&f.config(), limits).unwrap();
    assert_eq!(
        users(&d)
            .iter()
            .filter(|e| e.availability == Availability::Ready)
            .count(),
        1
    );
    assert!(d.notices.iter().any(|n| n.contains("aggregate")));
}

#[test]
fn descriptor_limit_is_reported() {
    let f = Fixture::new();
    f.device("user/a.ultra");
    let mut limits = Limits::default();
    limits.entries = 3;
    let d = discover(&f.config(), limits).unwrap();
    assert_eq!(d.entries.len(), 3);
    assert!(d.notices.iter().any(|n| n.contains("descriptor")));
}

#[test]
fn only_existing_live_artifacts_become_unavailable_candidates() {
    let f = Fixture::new();
    f.write("live/Resources/Devices/Pc/Analog_64.dll", b"candidate only");
    f.write(
        "live/Resources/Max/resources/packages/ableton-dsp/externals/abl.device.utility~.mxe64",
        b"candidate only",
    );
    let d = f.discover();
    let live = d
        .entries
        .iter()
        .filter(|e| e.provider == Provider::Live)
        .collect::<Vec<_>>();
    assert_eq!(live.len(), 2);
    assert!(live
        .iter()
        .all(|e| e.availability == Availability::Unavailable
            && e.path.is_none()
            && e.qualification == Qualification::Candidate
            && e.reason.as_ref().is_some_and(|r| !r.is_empty())));
    assert!(live
        .iter()
        .any(|e| e.name == "Analog" && e.kind == MusicalKind::Instrument));
    assert!(live
        .iter()
        .any(|e| e.name == "Utility" && e.kind == MusicalKind::AudioEffect));
    assert!(live
        .iter()
        .all(|e| e.dependencies.len() == 1 && e.dependencies[0].available));
}

#[test]
fn wine_installations_and_explicit_resource_override_are_discovered_and_deduplicated() {
    let f = Fixture::new();
    f.write(
        "prefix/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Devices/Pc/Analog_64.dll",
        b"candidate",
    );
    let mut config = f.config();
    config.live_roots = vec![f.0.join("prefix")];
    config.live_resources = vec![f
        .0
        .join("prefix/drive_c/ProgramData/Ableton/Live 12 Suite/Resources")];
    let d = discover(&config, Limits::default()).unwrap();
    assert_eq!(
        d.entries
            .iter()
            .filter(|e| e.provider == Provider::Live)
            .count(),
        1
    );
    let vars = HashMap::from([
        ("HOME", f.0.clone().into_os_string()),
        ("XDG_DATA_HOME", f.0.join("xdg").into_os_string()),
        (
            "ALIVE_DEVICE_LIBRARY_PATHS",
            std::env::join_paths([f.0.join("extra-a"), f.0.join("extra-b")]).unwrap(),
        ),
        ("ALIVE_LIVE_ROOTS", f.0.join("live").into_os_string()),
        (
            "ULTRA_LIVE_RESOURCES",
            f.0.join("resources-override").into_os_string(),
        ),
        ("WINEPREFIX", f.0.join("prefix").into_os_string()),
    ]);
    let config = Config::from_environment(f.0.join("res"), f.0.join("src"), |key| {
        vars.get(key).cloned()
    });
    assert_eq!(
        config.user_roots,
        vec![
            f.0.join("xdg/alive/devices"),
            f.0.join("extra-a"),
            f.0.join("extra-b")
        ]
    );
    assert!(config.live_roots.contains(&f.0.join(".wine")));
    assert!(config.live_roots.contains(&f.0.join(".wine-ableton")));
    assert!(config.live_roots.contains(&f.0.join("prefix")));
    assert_eq!(config.live_resources, vec![f.0.join("resources-override")]);
}

#[test]
fn pages_are_stable_and_reject_stale_malformed_and_out_of_range_cursors() {
    let f = Fixture::new();
    for i in 0..70 {
        f.device(&format!("user/{i:03}.ultra"));
    }
    let cache = CatalogCache::default();
    let build = || discover(&f.config(), Limits::default());
    let first = cache.request(Request::default(), build).unwrap();
    assert_eq!(first.entries.len(), 64);
    assert_eq!(first.revision, "1");
    let cursor = first.next_cursor.clone().unwrap();
    assert_eq!(cursor.offset, 64);
    let last = cache
        .request(
            Request {
                refresh: false,
                cursor: Some(cursor.clone()),
            },
            || panic!("cached page must not rebuild"),
        )
        .unwrap();
    assert_eq!(last.entries.len(), 9);
    assert!(last.next_cursor.is_none());
    let first_again = cache
        .request(Request::default(), || {
            panic!("cached index must not rebuild")
        })
        .unwrap();
    assert_eq!(
        first.entries.iter().map(|e| &e.id).collect::<Vec<_>>(),
        first_again
            .entries
            .iter()
            .map(|e| &e.id)
            .collect::<Vec<_>>()
    );
    for offset in [0, 1, 65, 128, usize::MAX] {
        assert!(cache
            .request(
                Request {
                    refresh: false,
                    cursor: Some(Cursor {
                        revision: "1".into(),
                        offset
                    })
                },
                build
            )
            .is_err());
    }
    assert!(serde_json::from_value::<Request>(
        serde_json::json!({"refresh":false,"cursor":{"revision":"1","offset":-1}})
    )
    .is_err());
    assert!(serde_json::from_value::<Request>(
        serde_json::json!({"refresh":false,"cursor":{"revision":"1","offset":64,"extra":true}})
    )
    .is_err());
    assert!(cache
        .request(
            Request {
                refresh: true,
                cursor: Some(cursor.clone())
            },
            build
        )
        .is_err());
    let refreshed = cache
        .request(
            Request {
                refresh: true,
                cursor: None,
            },
            build,
        )
        .unwrap();
    assert_eq!(refreshed.revision, "2");
    assert!(cache
        .request(
            Request {
                refresh: false,
                cursor: Some(cursor)
            },
            build
        )
        .unwrap_err()
        .contains("stale"));
}

#[test]
fn failed_refresh_preserves_the_previous_index_and_its_cursor() {
    let f = Fixture::new();
    for i in 0..70 {
        f.device(&format!("user/{i:03}.ultra"));
    }
    let cache = CatalogCache::default();
    let first = cache
        .request(Request::default(), || Ok(f.discover()))
        .unwrap();
    assert!(cache
        .request(
            Request {
                refresh: true,
                cursor: None
            },
            || Err("injected rebuild failure".into())
        )
        .is_err());
    let page = cache
        .request(
            Request {
                refresh: false,
                cursor: first.next_cursor,
            },
            || panic!("failed refresh must retain previous cache"),
        )
        .unwrap();
    assert_eq!(page.revision, "1");
    assert_eq!(page.entries.len(), 9);
    let json = serde_json::to_value(page).unwrap();
    assert!(json.get("nextCursor").is_some());
    assert!(json["entries"][0].get("qualification").is_some());
}

#[test]
fn a_rebuild_keeps_the_completed_index_readable_until_atomic_replacement() {
    let f = Fixture::new();
    let cache = Arc::new(CatalogCache::default());
    cache
        .request(Request::default(), || Ok(f.discover()))
        .unwrap();
    let (started_tx, started_rx) = std::sync::mpsc::channel();
    let (finish_tx, finish_rx) = std::sync::mpsc::channel();
    let worker_cache = Arc::clone(&cache);
    let worker = std::thread::spawn(move || {
        worker_cache.request(
            Request {
                refresh: true,
                cursor: None,
            },
            || {
                started_tx.send(()).unwrap();
                finish_rx.recv().unwrap();
                Ok(Discovery {
                    entries: Vec::new(),
                    notices: Vec::new(),
                })
            },
        )
    });
    started_rx
        .recv_timeout(std::time::Duration::from_secs(5))
        .unwrap();
    let reader_cache = Arc::clone(&cache);
    let (page_tx, page_rx) = std::sync::mpsc::channel();
    let reader = std::thread::spawn(move || {
        page_tx
            .send(
                reader_cache.request(Request::default(), || panic!("reader must use predecessor")),
            )
            .unwrap()
    });
    let during = page_rx.recv_timeout(std::time::Duration::from_secs(5));
    finish_tx.send(()).unwrap();
    reader.join().unwrap();
    let after = worker.join().unwrap().unwrap();
    assert_eq!(during.unwrap().unwrap().revision, "1");
    assert_eq!(after.revision, "2");
    assert!(after.entries.is_empty());
}

#[cfg(unix)]
#[test]
fn live_candidate_discovery_does_not_follow_directory_symlinks() {
    use std::os::unix::fs::symlink;
    let f = Fixture::new();
    f.write("outside/Pc/Analog_64.dll", b"candidate");
    fs::create_dir_all(f.0.join("live/Resources")).unwrap();
    symlink(f.0.join("outside"), f.0.join("live/Resources/Devices")).unwrap();
    let d = f.discover();
    assert!(d
        .entries
        .iter()
        .all(|entry| entry.provider != Provider::Live));
}

#[test]
fn malformed_revision_and_unknown_initial_cursors_are_explicitly_refused() {
    let f = Fixture::new();
    let cache = CatalogCache::default();
    assert!(cache
        .request(
            Request {
                refresh: false,
                cursor: Some(Cursor {
                    revision: "1".into(),
                    offset: 64
                })
            },
            || panic!("continuation must not build")
        )
        .is_err());
    cache
        .request(Request::default(), || Ok(f.discover()))
        .unwrap();
    for revision in ["", "0", "01", "-1", "1.0", " 1", "garbage"] {
        let error = cache
            .request(
                Request {
                    refresh: false,
                    cursor: Some(Cursor {
                        revision: revision.into(),
                        offset: 64,
                    }),
                },
                || panic!("bad continuation must not build"),
            )
            .unwrap_err();
        assert!(error.contains("Malformed"), "{revision:?}: {error}");
    }
}

#[test]
fn saved_readiness_revalidates_required_surface_bindings_and_keeps_excluded_items(){
    let f=Fixture::new();let path=f.device("user/surface.ultra");
    let mut patch:serde_json::Value=serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
    patch["presentation"]["items"][0]["target"]["param"]=serde_json::json!("time");
    patch["presentation"]["items"][0]["target"]["node"]=serde_json::json!(16);
    fs::write(&path,serde_json::to_vec(&patch).unwrap()).unwrap();
    let discovery=f.discover();let entry=users(&discovery)[0];
    assert_eq!(entry.availability,Availability::Unavailable);
    assert!(entry.reason.as_ref().unwrap().contains("live numeric"));
    patch["presentation"]["items"][0]["target"]["node"]=serde_json::json!(5);
    patch["presentation"]["items"][0]["target"]["param"]=serde_json::json!("release");
    patch["device"]["parameters"].as_array_mut().unwrap().retain(|p|p["key"]!="release");
    for preset in patch["device"]["presets"].as_array_mut().unwrap(){preset["values"].as_object_mut().unwrap().remove("release");}
    fs::write(&path,serde_json::to_vec(&patch).unwrap()).unwrap();
    let discovery=f.discover();assert!(users(&discovery)[0].reason.as_ref().unwrap().contains("is not exposed"));
    patch["presentation"]["items"][0]["included"]=serde_json::json!(false);
    // Other authored release controls must be excluded too.
    for item in patch["presentation"]["items"].as_array_mut().unwrap(){if item["target"]["param"]=="release"{item["included"]=serde_json::json!(false);}}
    fs::write(&path,serde_json::to_vec(&patch).unwrap()).unwrap();
    assert_eq!(users(&f.discover())[0].availability,Availability::Ready);
}
