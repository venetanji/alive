//! Bounded saved-device metadata. Bindings describe authored, live graph parameters.
use super::{parameters, NativeGraph};
use serde::{Deserialize, Deserializer};
use std::collections::{HashMap, HashSet};

/// The validated device interface consumed by hosts; no DSP or UI ownership.
#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HostManifest {
    pub version: u32,
    pub id: String,
    pub name: String,
    pub kind: DeviceKind,
    pub note_node: Option<u32>,
    pub input: Option<HostAudioInput>,
    pub output: ChannelBundle,
    pub parameters: Vec<HostParameter>,
}
#[derive(Clone, Copy, Debug, PartialEq, Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum DeviceKind { Instrument, AudioEffect }
#[derive(Clone, Debug, Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ChannelBundle { pub channels: u32, pub layout: String }
#[derive(Clone, Debug, Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct HostAudioInput { pub node: u32, pub bundle: ChannelBundle }
#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HostParameter {
    pub key: String, pub label: String, pub node: u32, pub param: String,
    pub slot: u32, pub min: f64, pub max: f64, pub base: f64,
    pub integral: bool, pub unit: Option<String>,
}

pub(crate) fn host_manifest(patch: &serde_json::Value, graph: &NativeGraph) -> Result<HostManifest, String> {
    let device: Device = serde_json::from_value(patch.get("device").cloned()
        .ok_or("This Ultra patch has no reusable device manifest")?).map_err(|e| e.to_string())?;
    validate(Some(&device), graph)?;
    let nodes = &graph.nodes[..graph.node_count as usize];
    let bindings = device.parameters.into_iter().map(|binding| {
        let node = nodes.iter().find(|node| node.id == binding.node).unwrap();
        let spec = parameters(node.kind).iter().find(|spec| spec.key == binding.param).unwrap();
        HostParameter { key: binding.key, label: binding.label, node: binding.node,
            param: binding.param, slot: spec.slot, min: binding.min, max: binding.max,
            base: [node.p0,node.p1,node.p2,node.p3,node.p4,node.p5][spec.slot as usize],
            integral: spec.integral, unit: binding.unit }
    }).collect();
    Ok(HostManifest { version: device.version, id: device.id, name: device.name,
        kind: device.kind, note_node: device.midi.map(|midi| midi.node),
        input: device.audio_input, output: device.audio_output,
        parameters: bindings })
}

pub(super) struct Device {
    version: u32, id: String, name: String, kind: DeviceKind,
    midi: Option<Midi>, audio_input: Option<HostAudioInput>, audio_output: ChannelBundle,
    parameters: Vec<Binding>, presets: Vec<Preset>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DeviceV1 {
    version: u32,
    id: String,
    name: String,
    midi: Midi,
    audio: Audio,
    parameters: Vec<Binding>,
    presets: Vec<Preset>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DeviceV2 {
    version: u32, id: String, name: String, kind: DeviceKind,
    midi: MidiV2, audio: AudioV2, parameters: Vec<Binding>, presets: Vec<Preset>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct MidiV2 {
    #[serde(deserialize_with = "required_option")]
    input: Option<Midi>,
    #[serde(deserialize_with = "required_option")]
    output: Option<()>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct AudioV2 {
    #[serde(deserialize_with = "required_option")]
    input: Option<HostAudioInput>,
    output: ChannelBundle,
}
fn required_option<'de, D: Deserializer<'de>, T: Deserialize<'de>>(deserializer: D) -> Result<Option<T>, D::Error> {
    Option::<T>::deserialize(deserializer)
}
impl<'de> Deserialize<'de> for Device {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        use serde::de::Error;
        let value=serde_json::Value::deserialize(deserializer)?;
        match value.get("version").and_then(serde_json::Value::as_u64) {
            Some(1) => {
                let d: DeviceV1=serde_json::from_value(value).map_err(D::Error::custom)?;
                if d.audio.inputs!=0 { return Err(D::Error::custom("version 1 audio inputs must be zero")); }
                Ok(Self {version:d.version,id:d.id,name:d.name,kind:DeviceKind::Instrument,midi:Some(d.midi),
                    audio_input:None,audio_output:ChannelBundle{channels:d.audio.outputs,layout:d.audio.layout},parameters:d.parameters,presets:d.presets})
            }
            Some(2) => {
                let d: DeviceV2=serde_json::from_value(value).map_err(D::Error::custom)?;
                if d.midi.output.is_some() { return Err(D::Error::custom("MIDI output must be null")); }
                Ok(Self {version:d.version,id:d.id,name:d.name,kind:d.kind,midi:d.midi.input,
                    audio_input:d.audio.input,audio_output:d.audio.output,parameters:d.parameters,presets:d.presets})
            }
            _ => Err(D::Error::custom("expected device manifest version 1 or 2")),
        }
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Midi { node: u32, inlet: u32 }
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Audio { inputs: u32, outputs: u32, layout: String }
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Binding {
    key: String, label: String, node: u32, param: String, min: f64, max: f64,
    #[serde(default, deserialize_with = "present_string")]
    unit: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Preset { name: String, values: HashMap<String, f64> }

pub(super) fn present<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Option<Device>, D::Error> {
    Device::deserialize(deserializer).map(Some)
}
fn present_string<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Option<String>, D::Error> {
    String::deserialize(deserializer).map(Some)
}
fn text(value: &str, min: usize, max: usize) -> bool {
    (min..=max).contains(&value.len()) && value.bytes().all(|byte| (32..=126).contains(&byte))
}
fn key(value: &str) -> bool {
    (1..=31).contains(&value.len()) && !matches!(value,"__proto__"|"prototype"|"constructor")
        && value.bytes().enumerate().all(|(index,byte)| byte.is_ascii_alphabetic() || byte==b'_' || index!=0 && byte.is_ascii_digit())
}

pub(super) fn validate(device: Option<&Device>, graph: &NativeGraph) -> Result<(), String> {
    let Some(device) = device else { return Ok(()); };
    let fail = |message: &str| format!("Invalid device manifest: {message}");
    if device.id.is_empty() || device.id.len()>127 || !device.id.split('.').all(|part| !part.is_empty()
        && part.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte,b'_'|b'-'))) {
        return Err(fail("id requires 1..127 ASCII letters, digits, underscores or hyphens, with optional dot-separated tokens"));
    }
    if !text(&device.name,1,64) { return Err(fail("name requires 1..64 printable ASCII bytes")); }
    if device.audio_output.channels!=2 || device.audio_output.layout!="stereo" {
        return Err(fail("public audio output requires two stereo channels"));
    }
    let nodes=&graph.nodes[..graph.node_count as usize];
    match device.kind {
        DeviceKind::Instrument => {
            if device.audio_input.is_some() { return Err(fail("instruments require no audio input")); }
            if !device.midi.as_ref().is_some_and(|midi| midi.inlet==0 && nodes.iter().any(|node| node.id==midi.node && node.kind==60)) {
                return Err(fail("MIDI must target inlet 0 of an authored poly.note~ node"));
            }
        }
        DeviceKind::AudioEffect => {
            if device.midi.is_some() { return Err(fail("audio effects require no MIDI input")); }
            if !device.audio_input.as_ref().is_some_and(|input| input.bundle.channels==2 && input.bundle.layout=="stereo"
                && nodes.iter().any(|node| node.id==input.node && node.kind==66)) {
                return Err(fail("effects require a bound audio.in~ input with two stereo channels"));
            }
        }
    }
    if device.parameters.is_empty() || device.parameters.len()>16 || device.presets.len()>16 {
        return Err(fail("requires 1..16 parameters and at most 16 presets"));
    }
    let mut keys=HashSet::new();let mut targets=HashSet::new();
    for binding in &device.parameters {
        if !key(&binding.key) || !keys.insert(binding.key.as_str()) { return Err(fail("parameter keys must be unique ASCII identifiers of 1..31 bytes")); }
        if !text(&binding.label,1,64) || binding.unit.as_ref().is_some_and(|unit| !text(unit,0,16)) {
            return Err(fail("labels require 1..64 printable ASCII bytes and units at most 16"));
        }
        if !targets.insert((binding.node,binding.param.as_str())) { return Err(fail("a node parameter can be bound only once")); }
        let node=nodes.iter().find(|node| node.id==binding.node).ok_or_else(|| fail("parameter references an unknown executable node"))?;
        let spec=parameters(node.kind).iter().find(|spec| spec.key==binding.param && spec.live)
            .ok_or_else(|| fail("binding must name an existing live numeric parameter"))?;
        if !binding.min.is_finite() || !binding.max.is_finite() || binding.min>=binding.max || binding.min<spec.min || binding.max>spec.max
            || spec.integral && (binding.min.fract()!=0. || binding.max.fract()!=0.) {
            return Err(fail("parameter range must lie within the node registry bounds"));
        }
        let current=[node.p0,node.p1,node.p2,node.p3,node.p4,node.p5][spec.slot as usize];
        if !(binding.min..=binding.max).contains(&current) { return Err(fail("current parameter value lies outside its declared range")); }
    }
    let mut names=HashSet::new();
    for preset in &device.presets {
        if !text(&preset.name,1,64) || !names.insert(preset.name.as_str()) { return Err(fail("preset names must be unique and contain 1..64 printable ASCII bytes")); }
        if preset.values.len()!=device.parameters.len() { return Err(fail("each preset must contain the complete parameter key set")); }
        for binding in &device.parameters {
            let value=*preset.values.get(&binding.key).ok_or_else(|| fail("each preset must contain the complete parameter key set"))?;
            let node=nodes.iter().find(|node| node.id==binding.node).unwrap();
            let spec=parameters(node.kind).iter().find(|spec| spec.key==binding.param).unwrap();
            if !value.is_finite() || !(binding.min..=binding.max).contains(&value) || spec.integral && value.fract()!=0. {
                return Err(fail("preset values must be finite, in range and respect integer parameters"));
            }
        }
    }
    Ok(())
}
