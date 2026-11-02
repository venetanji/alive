//! Complete per-instance commanded state; installed paths and DSP owners are not saved.
use crate::canvas::live_device::Source;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct PersistedSource { pub node: u32, pub state: Value }

pub(super) fn validate(sources: &[PersistedSource]) -> Result<Vec<Source>, String> {
    if sources.len() > 32 { return Err("Native source state exceeds 32 nodes per device".into()); }
    let mut seen = HashSet::new();
    sources.iter().map(|source| {
        if !seen.insert(source.node) { return Err("Duplicate native source state node".into()); }
        // Keep JSON precision through the existing descriptor/range validator.
        let params = json!({"device":"Analog","state":source.state});
        Source::parse(source.node, params.as_object().unwrap())
    }).collect()
}

pub(super) fn capture(sources: &[Source]) -> Result<Vec<PersistedSource>, String> {
    sources.iter().map(|source| Ok(PersistedSource {node:source.node,
        state:serde_json::to_value(&source.state).map_err(|e|e.to_string())?})).collect()
}

pub(super) fn apply(patch: &mut Value, saved: &[PersistedSource], original: &[Source]) -> Result<(), String> {
    let validated = validate(saved)?;
    for source in &validated {
        let expected = original.iter().find(|s|s.node==source.node)
            .ok_or("Stored native source state has no matching source node")?;
        if !expected.same_identity(source) { return Err("Stored native source identity differs from its saved Ultra source".into()); }
    }
    fn replace(patch: &mut Value, source: &PersistedSource) -> bool {
        let Some(nodes) = patch.get_mut("nodes").and_then(Value::as_array_mut) else {return false;};
        for node in nodes {
            if node["id"].as_u64()==Some(source.node as u64) && node["type"]=="live_device" {
                node["params"]["state"] = source.state.clone(); return true;
            }
            if let Some(child)=node.get_mut("patcher") {if replace(child,source){return true;}}
        }
        false
    }
    for source in saved {
        if !replace(patch,source) {return Err("Stored native source node disappeared during preparation".into());}
    }
    Ok(())
}
