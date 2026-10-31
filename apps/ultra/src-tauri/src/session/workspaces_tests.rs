use super::*;
use serde_json::{json, Value};
use std::collections::HashSet;

fn wire() -> Value {
    json!({"format":"alive-session-v4","title":"Workspace","tempo":120.,"lengthBeats":8.,
        "loopEnabled":false,"loopStartBeats":0.,"loopEndBeats":8.,
        "tracks":[{"id":"track","name":"MIDI","color":"#c77b61",
            "chain":{"kind":"midi","instrument":{"instanceId":"instrument","sourceSha256":"a".repeat(64),
                "bypassed":false,"path":"missing.ultra","id":"org.alive.instrument","version":1,"parameters":{"cutoff":500.}}},
            "effects":[],"slots":[{"id":"slot","name":"Slot","sourceId":"source",
                "region":{"start":0.,"end":4.,"loopStart":0.,"loopEnd":4.,"loopEnabled":true}},null,null,null],
            "gain":1.,"mute":false,"solo":false}],
        "sources":[{"kind":"midi","id":"source","trackId":"track","name":"Source","lengthBeats":4.,
            "notes":[{"id":"note","beat":0.,"duration":1.,"pitch":60,"velocity":90}],"automation":[]}],
        "placements":[{"id":"placement","trackId":"track","sourceId":"source","start":0.,"duration":4.,
            "region":{"start":0.,"end":4.,"loopStart":0.,"loopEnd":4.,"loopEnabled":false}}]})
}
fn project() -> ProjectV4 {
    decode(&wire().to_string()).unwrap()
}

#[test]
fn independent_region_markers_and_empty_midi_instrument_decode() {
    let mut v = wire();
    v["tracks"][0]["chain"]["instrument"] = Value::Null;
    for occurrence in [&mut v["tracks"][0]["slots"][0]] {
        occurrence.as_object_mut().unwrap().remove("sourceOffset");
        occurrence.as_object_mut().unwrap().remove("loopEnabled");
        occurrence["region"] =
            json!({"start":0.,"end":4.,"loopStart":1.,"loopEnd":3.,"loopEnabled":true});
    }
    v["placements"][0]
        .as_object_mut()
        .unwrap()
        .remove("sourceOffset");
    v["placements"][0]
        .as_object_mut()
        .unwrap()
        .remove("loopEnabled");
    v["placements"][0]["region"] =
        json!({"start":0.,"end":4.,"loopStart":1.,"loopEnd":3.,"loopEnabled":true});
    assert!(decode(&v.to_string()).is_ok());
}

#[test]
fn midi_clip_creation_is_atomic_and_region_edit_preserves_content() {
    let p = project();
    let created = edit(
        &p,
        json!({"kind":"midiClipCreate","trackId":"track","slot":1,"name":"New clip"}),
    )
    .unwrap();
    let slot = created.project.tracks[0].slots[1].as_ref().unwrap();
    let slot_id = slot.id.clone();
    let source_id = slot.source_id.clone();
    let extended = edit(
        &created.project,
        json!({"kind":"regionSet","occurrence":{"kind":"slot","trackId":"track","slotId":slot_id},
        "region":{"start":0.,"end":8.,"loopStart":1.,"loopEnd":3.,"loopEnabled":true}}),
    )
    .unwrap();
    let source = extended
        .project
        .sources
        .iter()
        .find(|s| s.id() == source_id)
        .unwrap();
    let saved = serde_json::to_value(source).unwrap();
    assert_eq!(saved["lengthBeats"], json!(8.));
    assert!(edit(
        &p,
        json!({"kind":"midiClipCreate","trackId":"track","slot":0,"name":"Occupied"})
    )
    .is_err());
    assert_eq!(p.sources.len(), 1);
    let shortened = edit(
        &p,
        json!({"kind":"regionSet","occurrence":{"kind":"slot","trackId":"track","slotId":"slot"},
        "region":{"start":0.,"end":0.5,"loopStart":0.,"loopEnd":0.5,"loopEnabled":true}}),
    )
    .unwrap();
    assert_eq!(shortened.project.sources[0], p.sources[0]);
    assert_eq!(shortened.project.placements[0], p.placements[0]);
}

#[test]
fn arrangement_clip_creation_uses_the_selected_span_atomically() {
    let p = project();
    let created=edit(&p,json!({"kind":"midiPlacementCreate","trackId":"track","start":4.,"duration":2.,"name":"Range"})).unwrap();
    let source = created.project.sources.last().unwrap();
    let placement = created.project.placements.last().unwrap();
    assert_eq!(source.length_beats(), 2.);
    assert_eq!(placement.start, 4.);
    assert_eq!(placement.duration, 2.);
    assert_eq!(placement.source_id, source.id());
    assert!(edit(&p,json!({"kind":"midiPlacementCreate","trackId":"track","start":2.,"duration":2.,"name":"Overlap"})).is_err());
    assert_eq!(p.sources.len(), 1);
}
fn edit(p: &ProjectV4, value: Value) -> Result<EditResultV4, String> {
    let operation = decode_edit(&value.to_string())?;
    let mut next = 0;
    apply_edit_with(p, operation, &HashSet::new(), |prefix| {
        next += 1;
        format!("{prefix}-fresh-{next}")
    })
}
fn audio_wire() -> Value {
    let mut v = wire();
    v["tracks"][0]["chain"] = json!({"kind":"audio"});
    v["sources"][0] = json!({"kind":"audio","id":"source","trackId":"track","name":"PCM",
        "file":{"path":"missing.wav","sourceSha256":"b".repeat(64),"encoding":"wavPcm","channels":2,
            "sampleRate":48000,"bitsPerSample":24,"frames":"96000"},"sourceTempo":120.,"warpMode":"repitch","automation":[]});
    v
}

#[test]
fn audio_import_creates_source_and_occurrence_with_independent_beat_markers() {
    let p = decode(&audio_wire().to_string()).unwrap();
    let created = edit(
        &p,
        json!({"kind":"audioClipImport","trackId":"track","slot":1,"name":"Imported",
        "file":audio_wire()["sources"][0]["file"],"sourceTempo":120.,"warpMode":"repitch"}),
    )
    .unwrap();
    let slot = created.project.tracks[0].slots[1].as_ref().unwrap();
    assert_eq!(slot.region, ClipRegionV4::full(4.));
    assert_eq!(created.project.sources.len(), 2);
    let changed = edit(
        &created.project,
        json!({"kind":"regionSet","occurrence":{"kind":"slot","trackId":"track","slotId":slot.id},
        "region":{"start":1.,"end":4.,"loopStart":2.,"loopEnd":3.,"loopEnabled":true}}),
    )
    .unwrap();
    assert_eq!(changed.project.sources, created.project.sources);
    assert_eq!(changed.project.tracks[0].slots[0], p.tracks[0].slots[0]);
    assert!(edit(
        &created.project,
        json!({"kind":"regionSet","occurrence":{"kind":"slot","trackId":"track","slotId":slot.id},
        "region":{"start":0.,"end":5.,"loopStart":0.,"loopEnd":4.,"loopEnabled":true}})
    )
    .is_err());
}

#[test]
fn region_validation_rejects_nonfinite_and_collapsed_loop_markers() {
    for (field, value) in [
        ("start", 4.),
        ("end", 0.),
        ("loopStart", 4.),
        ("loopEnd", 0.),
        ("loopEnd", 0.001),
    ] {
        let mut v = wire();
        v["tracks"][0]["slots"][0]["region"][field] = json!(value);
        assert!(decode(&v.to_string()).is_err(), "{field}: {value}");
    }
    let mut p = project();
    p.tracks[0].slots[0].as_mut().unwrap().region.loop_start = f64::NAN;
    assert!(p.validate().is_err());
}

#[test]
fn strict_roundtrip_keeps_explicit_empty_slots_and_no_audio_instrument() {
    for v in [wire(), audio_wire()] {
        let p = decode(&v.to_string()).unwrap();
        assert_eq!(decode(&encode(&p).unwrap()).unwrap(), p);
        assert_eq!(serde_json::to_value(&p).unwrap(), v);
    }
}

#[test]
fn wire_rejects_unknown_missing_duplicate_and_noncanonical_decimal_members() {
    let text = wire().to_string();
    for bad in [
        text.replacen("\"tempo\":120.0", "\"tempo\":120.0,\"tempo\":120.0", 1),
        text.replace("\"cutoff\":500.0", "\"cutoff\":500.0,\"cutoff\":600.0"),
    ] {
        assert!(decode(&bad).is_err());
    }
    for pointer in [
        "/title",
        "/tracks/0/slots",
        "/tracks/0/chain/instrument/bypassed",
        "/sources/0/notes/0/id",
    ] {
        let mut v = wire();
        let (parent, key) = pointer.rsplit_once('/').unwrap();
        v.pointer_mut(parent)
            .unwrap()
            .as_object_mut()
            .unwrap()
            .remove(key);
        assert!(decode(&v.to_string()).is_err(), "{pointer}");
    }
    let mut v = wire();
    v["tracks"][0]["chain"]["extra"] = true.into();
    assert!(decode(&v.to_string()).is_err());
    for frames in [
        json!(96000),
        json!("00"),
        json!("01"),
        json!("096000"),
        json!("+96000"),
        json!("18446744073709551616"),
        json!("96000.0"),
        Value::Null,
    ] {
        let mut v = audio_wire();
        v["sources"][0]["file"]["frames"] = frames;
        assert!(decode(&v.to_string()).is_err());
    }
    let mut v = wire();
    v["tracks"][0]["slots"].as_array_mut().unwrap().pop();
    assert!(decode(&v.to_string()).is_err());
}

#[test]
fn strict_edits_reject_duplicate_unknown_and_missing_fields() {
    for s in [
        r#"{"kind":"sourceRename","sourceId":"source","name":"A","name":"B"}"#,
        r#"{"kind":"sourceRename","sourceId":"source"}"#,
        r#"{"kind":"sourceRename","sourceId":"source","name":"A","x":0}"#,
        r#"{"kind":"sourceIndependent","occurrence":{"kind":"placement","placementId":"placement","x":0}}"#,
    ] {
        assert!(decode_edit(s).is_err());
    }
}

#[test]
fn validation_rejects_identity_kind_ownership_and_device_targets() {
    for (pointer, value) in [
        ("/tracks/0/id", json!("bad id")),
        ("/tracks/0/color", json!("#ABCDEF")),
        ("/sources/0/id", json!("track")),
        ("/sources/0/notes/0/id", json!("slot")),
        ("/sources/0/trackId", json!("absent")),
        ("/tracks/0/slots/0/sourceId", json!("absent")),
        ("/placements/0/trackId", json!("absent")),
        (
            "/sources/0/automation",
            json!([{"instanceId":"other","key":"cutoff","enabled":false,"points":[]}]),
        ),
    ] {
        let mut v = wire();
        *v.pointer_mut(pointer).unwrap() = value;
        assert!(decode(&v.to_string()).is_err(), "{pointer}");
    }
    let mut v = wire();
    v["tracks"][0]["chain"] = json!({"kind":"audio"});
    assert!(decode(&v.to_string()).is_err());
    let mut v = wire();
    v["sources"][0]["automation"] =
        json!([{"instanceId":"instrument","key":"unsafe key","enabled":false,"points":[]}]);
    assert!(decode(&v.to_string()).is_err());
    v["sources"][0]["automation"][0]["key"] = json!("manifest-default");
    assert!(decode(&v.to_string()).is_ok()); // Binding needs the resolved manifest, even for omitted bases.
}

#[test]
fn finite_bounds_and_loop_brace_apply_even_when_disabled() {
    for (pointer, value) in [
        ("/tempo", json!(29.)),
        ("/lengthBeats", json!(257.)),
        ("/loopStartBeats", json!(8.)),
        ("/loopEndBeats", json!(9.)),
        ("/tracks/0/gain", json!(2.01)),
        ("/sources/0/notes/0/duration", json!(0.)),
        ("/sources/0/notes/0/velocity", json!(0)),
        ("/placements/0/duration", json!(1e308)),
    ] {
        let mut v = wire();
        *v.pointer_mut(pointer).unwrap() = value;
        assert!(decode(&v.to_string()).is_err(), "{pointer}");
    }
    let mut p = project();
    p.tempo = f64::NAN;
    assert!(p.validate().is_err());
    let mut p = project();
    p.placements[0].start = f64::MAX;
    p.placements[0].duration = f64::MAX;
    assert!(p.validate().is_err());
    assert!(frame_at(f64::INFINITY, 120.).is_err());
    assert!(frame_at(1e308, 120.).is_err());
    assert_eq!(frame_at(0.5 / 24000., 120.).unwrap(), 1);
    assert_eq!(frame_at(0.0001361111111111111, 112.).unwrap(), 4); // Reassociation would round to 3.
}

#[test]
fn independent_starts_and_touching_occurrences_use_endpoint_frames() {
    let mut v = wire();
    v["placements"][0]["region"]["start"] = json!(1.);
    assert!(decode(&v.to_string()).unwrap_err().contains("placement"));
    v["placements"][0]["duration"] = json!(3.);
    assert!(decode(&v.to_string()).is_ok());
    v["placements"][0]["region"]["loopEnabled"] = json!(true);
    v["placements"][0]["duration"] = json!(8.);
    assert!(decode(&v.to_string()).is_ok());
    v["placements"][0]["region"]["start"] = json!(3.999);
    assert!(decode(&v.to_string()).is_ok());
    let p = project();
    let r = edit(
        &p,
        json!({"kind":"placementDuplicate","placementId":"placement","start":4.}),
    )
    .unwrap();
    assert_eq!(r.project.placements.len(), 2);
    assert_eq!(
        r.project.placements[0].source_id,
        r.project.placements[1].source_id
    );
    assert!(edit(
        &p,
        json!({"kind":"placementDuplicate","placementId":"placement","start":3.99999})
    )
    .is_err());
    let mut v = wire();
    v["placements"][0]["duration"] = json!(1. / 24000.);
    v["placements"][0]["start"] = json!(0.49 / 24000.);
    assert_eq!(
        decode(&v.to_string()).unwrap().placements[0].duration,
        1. / 24000.
    );
}

#[test]
fn repitch_tempo_changes_preserve_audio_beats_and_source_shrink_is_transactional() {
    let p = decode(&audio_wire().to_string()).unwrap();
    let before = p.clone();
    let e = edit(
        &p,
        json!({"kind":"transportRange","tempo":60.,"lengthBeats":8.,"loopEnabled":false,
        "loopStartBeats":0.,"loopEndBeats":8.}),
    )
    .unwrap();
    assert_eq!(e.project.sources, p.sources);
    assert_eq!(p, before);
    let p = project();
    let before = p.clone();
    let e = edit(
        &p,
        json!({"kind":"sourceLength","sourceId":"source","lengthBeats":2.}),
    )
    .unwrap_err();
    assert!(e.contains("source") && e.contains("placement"), "{e}");
    assert_eq!(p, before);
}

#[test]
fn shared_source_edits_and_independent_copy_preserve_occurrence_identity() {
    let p = project();
    let before = p.clone();
    let r = edit(
        &p,
        json!({"kind":"slotDuplicate","trackId":"track","slotId":"slot","destinationSlot":1}),
    )
    .unwrap();
    assert_eq!(r.project.sources.len(), 1);
    assert_eq!(
        r.project.tracks[0].slots[1].as_ref().unwrap().source_id,
        "source"
    );
    let r=edit(&r.project,json!({"kind":"sourceIndependent","occurrence":{"kind":"slot","trackId":"track","slotId":"slot"}})).unwrap();
    assert_eq!(r.project.sources.len(), 2);
    assert_eq!(r.project.tracks[0].slots[0].as_ref().unwrap().id, "slot");
    let copy = r.project.tracks[0].slots[0]
        .as_ref()
        .unwrap()
        .source_id
        .clone();
    assert_ne!(copy, "source");
    let r=edit(&r.project,json!({"kind":"noteUpdate","sourceId":copy,"noteId":"note-fresh-2","beat":1.,"duration":1.,"pitch":61,"velocity":90})).unwrap();
    let SourceV4::Midi { notes, .. } = &r.project.sources[0] else {
        panic!()
    };
    assert_eq!(notes[0].pitch, 60);
    assert_eq!(p, before);
    let renamed = edit(
        &p,
        json!({"kind":"sourceRename","sourceId":"source","name":"Renamed"}),
    )
    .unwrap();
    assert!(
        renamed.affected_ids.contains(&"slot".into())
            && renamed.affected_ids.contains(&"placement".into())
    );
    assert!(edit(&p, json!({"kind":"sourceDelete","sourceId":"source"})).is_err());
}

#[test]
fn fresh_ids_check_current_and_reserved_history_and_undo_keeps_originals() {
    let p = project();
    let mut calls = vec!["slot".to_string(), "history".into(), "new-note".into()].into_iter();
    let reserved = HashSet::from(["history".into()]);
    // Caller-supplied identities may be deterministic; occupied candidates are retried.
    let r=apply_edit_with(&p,decode_edit(r#"{"kind":"noteCreate","sourceId":"source","beat":2,"duration":1,"pitch":61,"velocity":90}"#).unwrap(),
        &reserved, |_|calls.next().unwrap()).unwrap();
    assert!(r.affected_ids.contains(&"new-note".into()));
    assert!(r.project.identities().contains("new-note"));
    assert!(!p.identities().contains("new-note"));
    assert_eq!(decode(&encode(&p).unwrap()).unwrap(), p);
}

fn replicated(count: usize) -> Value {
    let original = wire();
    let mut result = original.clone();
    result["tracks"] = json!([]);
    result["sources"] = json!([]);
    result["placements"] = json!([]);
    for index in 0..count {
        let mut track = original["tracks"][0].clone();
        let mut source = original["sources"][0].clone();
        let track_id = format!("track-{index}");
        let source_id = format!("source-{index}");
        track["id"] = json!(track_id);
        track["chain"]["instrument"]["instanceId"] = json!(format!("instrument-{index}"));
        track["slots"][0]["id"] = json!(format!("slot-{index}"));
        track["slots"][0]["sourceId"] = json!(source_id);
        source["id"] = json!(source_id);
        source["trackId"] = json!(track_id);
        source["notes"][0]["id"] = json!(format!("note-{index}"));
        if index >= 6 {
            track["chain"]["instrument"] = Value::Null;
        }
        result["tracks"].as_array_mut().unwrap().push(track);
        result["sources"].as_array_mut().unwrap().push(source);
    }
    result
}

#[test]
fn per_track_and_global_bounds_include_disabled_automation() {
    assert!(decode(&replicated(8).to_string()).is_ok());
    assert!(decode(&replicated(9).to_string()).is_err());
    for count in [4, 5] {
        let mut v = replicated(8);
        for index in 0..8 {
            for extra in 1..count {
                let mut source = v["sources"][index].clone();
                source["id"] = json!(format!("extra-{index}-{extra}"));
                source["notes"] = json!([]);
                v["sources"].as_array_mut().unwrap().push(source);
            }
        }
        assert_eq!(decode(&v.to_string()).is_ok(), count == 4);
    }
    for points in [256, 257] {
        let mut v = wire();
        v["sources"][0]["automation"] = json!([{"instanceId":"instrument","key":"cutoff","enabled":false,
            "points":(0..points).map(|i|json!({"beat":i as f64/128.,"value":500.})).collect::<Vec<_>>()}]);
        assert_eq!(decode(&v.to_string()).is_ok(), points == 256);
    }
    for lanes in [16, 17] {
        let mut v = wire();
        v["sources"][0]["automation"]=json!((0..lanes).map(|i|json!({"instanceId":"instrument","key":format!("key-{i}"),"enabled":false,"points":[]})).collect::<Vec<_>>());
        assert_eq!(decode(&v.to_string()).is_ok(), lanes == 16);
    }
    for notes in [128, 129] {
        let mut v = wire();
        v["sources"][0]["notes"]=json!((0..notes).map(|i|json!({"id":format!("n-{i}"),"beat":i as f64/64.,"duration":1./128.,"pitch":60,"velocity":90})).collect::<Vec<_>>());
        assert_eq!(decode(&v.to_string()).is_ok(), notes == 128);
    }
    for placements in [8, 9] {
        let mut v = wire();
        v["placements"]=json!((0..placements).map(|i|json!({"id":format!("p-{i}"),"trackId":"track","sourceId":"source","start":i as f64/2.,"duration":0.5,
            "region":{"start":0.,"end":4.,"loopStart":0.,"loopEnd":4.,"loopEnabled":false}})).collect::<Vec<_>>());
        assert_eq!(decode(&v.to_string()).is_ok(), placements == 8);
    }
    let mut v = replicated(3);
    for index in 0..3 {
        let mut effect = v["tracks"][index]["chain"]["instrument"].clone();
        effect["instanceId"] = json!(format!("effect-{index}"));
        v["tracks"][index]["effects"] = json!([effect]);
    }
    assert!(decode(&v.to_string()).is_ok());
    let mut extra = v["tracks"][0]["effects"][0].clone();
    extra["instanceId"] = json!("root-7");
    v["tracks"][0]["effects"]
        .as_array_mut()
        .unwrap()
        .push(extra);
    assert!(decode(&v.to_string()).is_err());
}

#[test]
fn source_event_pool_counts_rounded_note_ends_and_enabled_points_once() {
    let mut v = replicated(4);
    for index in 0..4 {
        v["sources"][index]["notes"] = json!((0..128)
            .map(|i| json!({"id":format!("n-{index}-{i}"),
        "beat":i as f64/32.,"duration":0.01,"pitch":60,"velocity":90}))
            .collect::<Vec<_>>());
    }
    assert!(decode(&v.to_string()).is_ok()); // 4 * 128 * 2 = 1024.
    v["sources"][0]["automation"] = json!([{"instanceId":"instrument-0","key":"cutoff","enabled":true,"points":[{"beat":0.,"value":500.}]}]);
    assert!(decode(&v.to_string()).unwrap_err().contains("1024"));
    // Beat end is before 4, but F(end) == F(4): no stored note-off.
    v["sources"][0]["notes"][127]["duration"] = json!(4. - 127. / 32. - 0.1 / 24000.);
    assert!(decode(&v.to_string()).is_ok());
    v["sources"][0]["automation"][0]["points"]
        .as_array_mut()
        .unwrap()
        .push(json!({"beat":0.5,"value":500.}));
    assert!(decode(&v.to_string()).unwrap_err().contains("1024"));
    v["sources"][0]["automation"][0]["enabled"] = json!(false);
    assert!(decode(&v.to_string()).is_ok());
}

#[test]
fn notes_reject_overlap_and_five_held_voices_but_allow_touching_ends() {
    for count in [4, 5] {
        let mut v = wire();
        v["sources"][0]["notes"]=json!((0..count).map(|i|json!({"id":format!("n-{i}"),"beat":0.,"duration":1.,"pitch":60+i,"velocity":90})).collect::<Vec<_>>());
        assert_eq!(decode(&v.to_string()).is_ok(), count == 4);
    }
    let mut v = wire();
    let mut n = v["sources"][0]["notes"][0].clone();
    n["id"] = json!("other");
    n["beat"] = json!(0.5);
    v["sources"][0]["notes"].as_array_mut().unwrap().push(n);
    assert!(decode(&v.to_string()).is_err());
    v["sources"][0]["notes"][1]["beat"] = json!(1.);
    assert!(decode(&v.to_string()).is_ok());
}

#[test]
fn audio_suffix_descriptors_and_automation_retain_exact_frames() {
    let mut v = audio_wire();
    v["placements"][0]["region"]["start"] = json!(1. / 24000.);
    assert!(decode(&v.to_string()).is_err());
    v["placements"][0]["duration"] = json!(95999. / 24000.);
    assert!(decode(&v.to_string()).is_ok());
    v["placements"][0]["region"]["start"] = json!(95999. / 24000.);
    v["placements"][0]["duration"] = json!(1. / 24000.);
    assert!(decode(&v.to_string()).is_ok());
    v["placements"][0]["region"]["loopEnabled"] = json!(true);
    assert!(decode(&v.to_string()).is_ok());
    for (field, value) in [
        ("frames", json!("0")),
        ("channels", json!(3)),
        ("sampleRate", json!(0)),
        ("bitsPerSample", json!(12)),
        ("encoding", json!("mp3")),
        ("sourceSha256", json!("B".repeat(64))),
    ] {
        let mut v = audio_wire();
        v["sources"][0]["file"][field] = value;
        assert!(decode(&v.to_string()).is_err(), "{field}");
    }
    let p = decode(&audio_wire().to_string()).unwrap();
    let r=edit(&p,json!({"kind":"sourceIndependent","occurrence":{"kind":"placement","placementId":"placement"}})).unwrap();
    let (SourceV4::Audio { file: a, .. }, SourceV4::Audio { file: b, .. }) =
        (&r.project.sources[0], &r.project.sources[1])
    else {
        panic!()
    };
    assert_eq!(a, b);
    assert_eq!(r.project.placements[0].id, "placement");
    assert!(edit(
        &p,
        json!({"kind":"sourceLength","sourceId":"source","lengthBeats":2.})
    )
    .is_err());
    let mut v = audio_wire();
    let effect = wire()["tracks"][0]["chain"]["instrument"].clone();
    v["tracks"][0]["effects"] = json!([effect]);
    v["sources"][0]["automation"] = json!([{"instanceId":"instrument","key":"cutoff","enabled":false,"points":[{"beat":3.999,"value":500.}]}]);
    assert!(decode(&v.to_string()).is_ok());
    v["sources"][0]["automation"][0]["points"][0]["beat"] = json!(4.);
    assert!(decode(&v.to_string()).is_err());
}

#[test]
fn source_slot_note_placement_lifecycle_returns_stable_affected_ids() {
    let p = project();
    let created = edit(
        &p,
        json!({"kind":"sourceCreateMidi","trackId":"track","name":"New","lengthBeats":2.}),
    )
    .unwrap();
    assert!(created.affected_ids.contains(&"source-fresh-1".into()));
    let assigned=edit(&created.project,json!({"kind":"slotAssign","trackId":"track","slot":2,"sourceId":"source-fresh-1","name":"New slot",
        "region":{"start":0.5,"end":2.,"loopStart":0.5,"loopEnd":2.,"loopEnabled":true}})).unwrap();
    let updated = edit(
        &assigned.project,
        json!({"kind":"slotUpdate","trackId":"track","slotId":"slot-fresh-1","name":"Edited",
        "region":{"start":1.,"end":4.,"loopStart":1.,"loopEnd":4.,"loopEnabled":false}}),
    )
    .unwrap();
    assert_eq!(
        updated.project.tracks[0].slots[2].as_ref().unwrap().id,
        "slot-fresh-1"
    );
    let deleted = edit(
        &updated.project,
        json!({"kind":"slotDelete","trackId":"track","slotId":"slot-fresh-1"}),
    )
    .unwrap();
    assert!(deleted.affected_ids.contains(&"slot-fresh-1".into()));
    let deleted = edit(
        &deleted.project,
        json!({"kind":"sourceDelete","sourceId":"source-fresh-1"}),
    )
    .unwrap();
    assert_eq!(deleted.project, p);
    let added=edit(&p,json!({"kind":"placementCreate","trackId":"track","sourceId":"source","start":4.,"duration":2.,
        "region":{"start":1.,"end":4.,"loopStart":1.,"loopEnd":4.,"loopEnabled":false}})).unwrap();
    let updated = edit(
        &added.project,
        json!({"kind":"placementUpdate","placementId":"placement-fresh-1","start":5.,"duration":1.,
        "region":{"start":2.,"end":4.,"loopStart":2.,"loopEnd":4.,"loopEnabled":false}}),
    )
    .unwrap();
    assert_eq!(updated.project.placements[1].id, "placement-fresh-1");
    let deleted = edit(
        &updated.project,
        json!({"kind":"placementDelete","placementId":"placement-fresh-1"}),
    )
    .unwrap();
    assert_eq!(deleted.project, p);
    let deleted = edit(
        &p,
        json!({"kind":"noteDelete","sourceId":"source","noteId":"note"}),
    )
    .unwrap();
    assert!(deleted.affected_ids.contains(&"note".into()));
    let SourceV4::Midi { notes, .. } = &deleted.project.sources[0] else {
        panic!()
    };
    assert!(notes.is_empty());
    let presented = edit(
        &p,
        json!({"kind":"trackPresentation","trackId":"track","name":"Changed","color":"#123abc"}),
    )
    .unwrap();
    assert_eq!(presented.project.tracks[0].name, "Changed");
    assert_eq!(presented.affected_ids, vec!["track"]);
    let default=apply_edit(&p,decode_edit(r#"{"kind":"noteCreate","sourceId":"source","beat":2,"duration":1,"pitch":61,"velocity":90}"#).unwrap(),&HashSet::new()).unwrap();
    assert_eq!(default.project.identities().len(), p.identities().len() + 1);
}

#[test]
fn real_cross_track_references_and_duplicate_lane_targets_reject() {
    for (pointer, value) in [
        ("/tracks/0/slots/0/sourceId", json!("source-1")),
        (
            "/sources/0/automation",
            json!([{"instanceId":"instrument-1","key":"cutoff","enabled":false,"points":[]}]),
        ),
    ] {
        let mut v = replicated(2);
        *v.pointer_mut(pointer).unwrap() = value;
        assert!(decode(&v.to_string()).unwrap_err().contains("ross-track"));
    }
    let mut v = wire();
    v["sources"][0]["automation"] = json!([
        {"instanceId":"instrument","key":"cutoff","enabled":false,"points":[]},
        {"instanceId":"instrument","key":"cutoff","enabled":true,"points":[]}]);
    assert!(decode(&v.to_string()).is_err());
    v["sources"][0]["automation"] = json!([{"instanceId":"instrument","key":"cutoff","enabled":false,
        "points":[{"beat":0.,"value":500.},{"beat":0.1/24000.,"value":500.}]}]);
    assert!(decode(&v.to_string()).is_err());
    let p = project();
    let before = p.clone();
    let err=edit(&p,json!({"kind":"automationSet","sourceId":"source","lanes":[{"instanceId":"instrument","key":"cutoff","enabled":false,
        "points":[{"beat":4.,"value":500.}]}]})).unwrap_err();
    assert!(err.contains("source") && err.contains("slot") && err.contains("placement"));
    assert_eq!(p, before);
    let set=edit(&p,json!({"kind":"automationSet","sourceId":"source","lanes":[{"instanceId":"instrument","key":"cutoff","enabled":true,
        "points":[{"beat":1.,"value":500.}]}]})).unwrap();
    assert_eq!(set.project.sources[0].automation()[0].points[0].beat, 1.);
    assert!(
        set.affected_ids.contains(&"slot".into()) && set.affected_ids.contains(&"placement".into())
    );
}

#[test]
fn endpoint_difference_controls_duration_and_beats_still_detect_subframe_overlap() {
    let mut v = audio_wire();
    v["placements"][0]["region"]["start"] = json!(95999. / 24000.);
    v["placements"][0]["start"] = json!(0.49 / 24000.);
    v["placements"][0]["duration"] = json!(1.02 / 24000.);
    assert!(decode(&v.to_string()).is_err()); // Endpoints span two frames; rounded duration alone is one.
    v["placements"][0]["start"] = json!(0.51 / 24000.);
    assert!(decode(&v.to_string()).is_ok());
    let mut v = wire();
    let mut next = v["placements"][0].clone();
    next["id"] = json!("next");
    next["start"] = json!(4. - 0.1 / 24000.);
    next["duration"] = json!(4.);
    v["placements"].as_array_mut().unwrap().push(next);
    assert!(decode(&v.to_string()).unwrap_err().contains("Overlap")); // Frames touch, but beats overlap.
}

#[test]
fn byte_limits_unicode_controls_and_document_size_are_enforced() {
    for (pointer, limit) in [
        ("/title", 128),
        ("/tracks/0/name", 64),
        ("/sources/0/name", 64),
        ("/tracks/0/slots/0/name", 64),
        ("/tracks/0/chain/instrument/path", 4096),
    ] {
        let mut v = wire();
        *v.pointer_mut(pointer).unwrap() = json!("\u{00e9}".repeat(limit / 2));
        assert!(decode(&v.to_string()).is_ok(), "{pointer}");
        *v.pointer_mut(pointer).unwrap() = json!("x".repeat(limit + 1));
        assert!(decode(&v.to_string()).is_err(), "{pointer}");
        *v.pointer_mut(pointer).unwrap() = json!("control\n");
        assert!(decode(&v.to_string()).is_err(), "{pointer}");
    }
    let oversized = format!("{}{}", wire(), " ".repeat(1024 * 1024));
    assert!(decode(&oversized).unwrap_err().contains("1 MiB"));
    let mut v = audio_wire();
    v["sources"][0]["file"]["channels"] = json!(1);
    v["sources"][0]["file"]["frames"] = json!("18446744073709551615");
    assert!(decode(&v.to_string()).is_err());
    v["sources"][0]["file"]["channels"] = json!(2);
    assert!(decode(&v.to_string()).is_err());
}

#[test]
fn every_nested_wire_record_rejects_missing_or_unknown_fields() {
    let mut midi = wire();
    midi["sources"][0]["automation"] = json!([{"instanceId":"instrument","key":"cutoff","enabled":true,
        "points":[{"beat":1.,"value":500.}]}]);
    for (v, paths) in [
        (
            midi,
            vec![
                "",
                "/tracks/0",
                "/tracks/0/chain",
                "/tracks/0/chain/instrument",
                "/tracks/0/slots/0",
                "/tracks/0/slots/0/region",
                "/sources/0",
                "/sources/0/notes/0",
                "/sources/0/automation/0",
                "/sources/0/automation/0/points/0",
                "/placements/0",
            ],
        ),
        (
            audio_wire(),
            vec![
                "/tracks/0/chain",
                "/sources/0",
                "/sources/0/file",
                "/placements/0/region",
            ],
        ),
    ] {
        for path in paths {
            let record = v.pointer(path).unwrap().as_object().unwrap();
            for key in record
                .keys()
                .filter(|key| path != "/tracks/0/chain" || key.as_str() != "instrument")
            {
                let mut bad = v.clone();
                bad.pointer_mut(path)
                    .unwrap()
                    .as_object_mut()
                    .unwrap()
                    .remove(key);
                assert!(decode(&bad.to_string()).is_err(), "missing {path}/{key}");
            }
            let mut bad = v.clone();
            bad.pointer_mut(path).unwrap()["unknown"] = json!(0);
            assert!(decode(&bad.to_string()).is_err(), "unknown {path}");
        }
    }
}

#[test]
fn invalid_id_generators_and_occupied_targets_leave_input_unchanged() {
    let p = project();
    let before = p.clone();
    let op=decode_edit(r#"{"kind":"noteCreate","sourceId":"source","beat":2,"duration":1,"pitch":61,"velocity":90}"#).unwrap();
    assert!(apply_edit_with(&p, op.clone(), &HashSet::new(), |_| "unsafe id".into()).is_err());
    assert!(apply_edit_with(&p, op, &HashSet::new(), |_| "note".into()).is_err());
    for op in [
        json!({"kind":"slotAssign","trackId":"track","slot":0,"sourceId":"source","name":"Occupied",
        "region":{"start":0.,"end":4.,"loopStart":0.,"loopEnd":4.,"loopEnabled":true}}),
        json!({"kind":"slotDuplicate","trackId":"track","slotId":"slot","destinationSlot":4}),
        json!({"kind":"noteUpdate","sourceId":"source","noteId":"absent","beat":0.,"duration":1.,"pitch":60,"velocity":90}),
        json!({"kind":"sourceRename","sourceId":"absent","name":"Name"}),
    ] {
        assert!(edit(&p, op).is_err());
    }
    assert_eq!(p, before);
}

#[test]
fn occupied_slot_names_identity_and_delete_assign_mints_a_new_occurrence() {
    let p = project();
    let before = p.clone();
    let op = json!({"kind":"slotAssign","trackId":"track","slot":0,"sourceId":"source","name":"Reassigned",
        "region":{"start":0.,"end":4.,"loopStart":0.,"loopEnd":4.,"loopEnabled":true}});
    let err = edit(&p, op.clone()).unwrap_err();
    assert!(
        err.contains("'slot'") && err.contains("delete") && err.contains("assign"),
        "{err}"
    );
    assert_eq!(p, before);
    let deleted = edit(
        &p,
        json!({"kind":"slotDelete","trackId":"track","slotId":"slot"}),
    )
    .unwrap();
    let assigned = edit(&deleted.project, op).unwrap();
    assert_ne!(
        assigned.project.tracks[0].slots[0].as_ref().unwrap().id,
        "slot"
    );
    assert_eq!(
        assigned.project.tracks[0].slots[0]
            .as_ref()
            .unwrap()
            .source_id,
        "source"
    );
}
