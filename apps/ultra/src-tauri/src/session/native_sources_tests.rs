use super::*;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};

fn source_state() -> Value {
    json!({"version":1,"profile":"live12-analog-v1",
        "dllSha256":"4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133",
        "guiSha256":"75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f",
        "graphicsSha256":"ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d",
        "values":crate::canvas::live_device::ANALOG_DESCRIPTORS.iter().map(|&(_,_,_,min,_)|min).collect::<Vec<_>>()})
}

fn fixture() -> (PathBuf, Value, Value) {
    let origin = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive");
    let prepared = read(&origin).unwrap();
    let mut patch = prepared.devices[0].patch.clone();
    let state = source_state();
    patch["nodes"].as_array_mut().unwrap().push(json!({"id":90000,"type":"live_device","x":0,"y":0,
        "params":{"device":"Analog","state":state}}));
    let folder = std::env::temp_dir().join(format!("alive-native-instance-state-{}", std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let source = folder.join("source.ultra");
    std::fs::write(&source, serde_json::to_vec(&patch).unwrap()).unwrap();
    let mut instance = serde_json::to_value(prepared.saved.score.tracks[0].instrument().unwrap()).unwrap();
    instance["path"] = json!(source.to_str().unwrap());
    instance["sourceSha256"] = json!(super::prepare::fingerprint(&patch).unwrap());
    (folder, instance, state)
}

#[test]
fn per_instance_native_sources_roundtrip_without_mutating_the_shared_file() {
    let (folder, mut instance, state) = fixture();
    let origin = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive");
    let mut saved = read(&origin).unwrap().saved;
    instance["nativeSources"] = json!([{"node":90000,"state":state}]);
    instance["nativeSources"][0]["state"]["values"][2] = json!(0.25);
    let reference: DeviceInstance = serde_json::from_value(instance.clone()).unwrap();
    let device = super::prepare::prepare_device(&reference, &folder.join("session.alive"), 0).unwrap();
    assert_eq!(device.live_devices[0].state.values[2], 0.25);
    assert_eq!(device.patch["nodes"].as_array().unwrap().last().unwrap()["params"]["state"]["values"][2], 0.25);

    let mut sibling_json = instance.clone();
    sibling_json["instanceId"] = json!(saved.score.tracks[1].instrument().unwrap().instance_id);
    sibling_json["nativeSources"][0]["state"]["values"][2] = json!(0.75);
    let sibling: DeviceInstance = serde_json::from_value(sibling_json).unwrap();
    let other = super::prepare::prepare_device(&sibling, &folder.join("session.alive"), 1).unwrap();
    assert_eq!(other.live_devices[0].state.values[2], 0.75);
    assert_eq!(device.live_devices[0].state.values[2], 0.25);
    let original: Value = serde_json::from_slice(&std::fs::read(folder.join("source.ultra")).unwrap()).unwrap();
    assert_eq!(original["nodes"].as_array().unwrap().last().unwrap()["params"]["state"]["values"][2], 0.);

    let ChainV4::Midi{instrument} = &mut saved.score.tracks[0].chain else {unreachable!()};
    *instrument = Some(reference);
    let ChainV4::Midi{instrument} = &mut saved.score.tracks[1].chain else {unreachable!()};
    *instrument = Some(sibling);
    let path = folder.join("session.alive");
    save(&path, &saved, &path).unwrap();
    let reopened = read(&path).unwrap();
    assert_eq!(reopened.devices[0].live_devices[0].state.values[2], 0.25);
    assert_eq!(reopened.devices[1].live_devices[0].state.values[2], 0.75);
    assert_eq!(reopened.saved.score.tracks[0].instrument().unwrap().source_sha256, instance["sourceSha256"]);

    let mut foreign = state.clone(); foreign["profile"] = json!("unqualified");
    let mut changed_release = state.clone();
    changed_release["guiSha256"] = json!("5ec872d673fd5f4f5f05787e4245c56e172ff2663c2d4493e94d598b883114e6");
    changed_release["graphicsSha256"] = json!("a0b8aa480aa3d21f093b416ea59b3f200d2e2466936f95d886a554bffe875cb7");
    let mut narrowed_enum = state.clone(); narrowed_enum["values"][0] = json!(1.000000001);
    for invalid in [
        json!([{"node":90000,"state":state},{"node":90000,"state":state}]),
        json!([{"node":90001,"state":state}]),
        json!([{"node":90000,"state":foreign}]),
        json!([{"node":90000,"state":changed_release}]),
        json!([{"node":90000,"state":narrowed_enum}]),
    ] {
        let mut candidate = instance.clone(); candidate["nativeSources"] = invalid;
        let result = serde_json::from_value::<DeviceInstance>(candidate).and_then(|value|
            super::prepare::prepare_device(&value, &path, 0).map_err(serde::de::Error::custom));
        assert!(result.is_err());
    }
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn absent_native_sources_preserve_the_ordinary_saved_format() {
    let origin = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive");
    let saved = read(&origin).unwrap().saved;
    for device in saved.score.tracks.iter().flat_map(|t|t.devices()) {
        assert!(!serde_json::to_value(device).unwrap().as_object().unwrap().contains_key("nativeSources"));
    }
    let mut value = serde_json::to_value(saved.score.tracks[0].instrument().unwrap()).unwrap();
    value["nativeSources"] = json!([]);
    let device: DeviceInstance = serde_json::from_value(value.clone()).unwrap();
    assert!(super::native_sources::validate(&device.native_sources).unwrap().is_empty());
    value["nativeSources"] = json!(null);
    assert!(serde_json::from_value::<DeviceInstance>(value).is_err());
}

#[test]
fn musical_publication_cannot_change_instance_native_state_without_preparing_it() {
    let origin = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive");
    let prepared = read(&origin).unwrap();
    let mut candidate = prepared.saved.score.clone();
    let ChainV4::Midi{instrument:Some(device)} = &mut candidate.tracks[0].chain else {unreachable!()};
    device.native_sources.push(super::native_sources::PersistedSource{node:90000,state:source_state()});
    let mut owner = host::Host::default();owner.prepared = Some(prepared);
    assert!(owner.workspace_candidate(candidate,Default::default()).unwrap_err().contains("stopped device controls"));
}

use super::workspaces::ChainV4;
