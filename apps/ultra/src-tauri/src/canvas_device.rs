//! Bounded saved-device metadata. Bindings describe authored, live graph parameters.
use super::{parameters, NativeGraph};
use serde::{Deserialize, Deserializer};
use std::collections::{HashMap, HashSet};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Device {
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
    if device.version != 1 { return Err(fail("expected version 1")); }
    if device.id.is_empty() || device.id.len()>127 || !device.id.split('.').all(|part| !part.is_empty()
        && part.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte,b'_'|b'-'))) {
        return Err(fail("id requires 1..127 ASCII letters, digits, underscores or hyphens, with optional dot-separated tokens"));
    }
    if !text(&device.name,1,64) { return Err(fail("name requires 1..64 printable ASCII bytes")); }
    if device.audio.inputs!=0 || device.audio.outputs!=2 || device.audio.layout!="stereo" {
        return Err(fail("public audio must have zero inputs and two stereo outputs"));
    }
    let nodes=&graph.nodes[..graph.node_count as usize];
    if device.midi.inlet!=0 || !nodes.iter().any(|node| node.id==device.midi.node && node.kind==60) {
        return Err(fail("MIDI must target inlet 0 of an authored poly.note~ node"));
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
