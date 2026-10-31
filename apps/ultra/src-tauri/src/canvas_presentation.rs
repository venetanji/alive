//! Saved authoring metadata, resolved from authored nodes before graph lowering.
use super::{inlet, kind, parameters, NativeNode, Port};
use serde_json::{json, Map, Value};
use std::collections::{HashMap, HashSet};

fn fields<'a>(value: &'a Value, keys: &[&str]) -> Result<&'a Map<String, Value>, String> {
    let object = value.as_object().ok_or("Presentation: expected object")?;
    if object.len() != keys.len() || keys.iter().any(|key| !object.contains_key(*key)) {
        return Err("Presentation: missing or unknown field".into());
    }
    Ok(object)
}
fn integer(value: &Value, min: u64, max: u64) -> Result<u64, String> {
    value
        .as_f64()
        .filter(|value| {
            value.is_finite() && value.fract() == 0. && *value >= min as f64 && *value <= max as f64
        })
        .map(|value| value as u64)
        .ok_or_else(|| "Presentation: integer outside bounds".into())
}
fn label(value: &Value, min: usize) -> Result<(), String> {
    if !value.as_str().is_some_and(|s| {
        (min..=64).contains(&s.len()) && s.bytes().all(|c| (32..=126).contains(&c))
    }) {
        return Err("Presentation: invalid ASCII label".into());
    }
    Ok(())
}
fn collect<'a>(scope: &'a Value, nodes: &mut HashMap<u64, &'a Value>) -> Result<(), String> {
    collect_at(scope, nodes, 0)
}
fn collect_at<'a>(
    scope: &'a Value,
    nodes: &mut HashMap<u64, &'a Value>,
    depth: usize,
) -> Result<(), String> {
    if depth > 16 {
        return Err("Presentation: hierarchy exceeds 16 levels".into());
    }
    for node in scope["nodes"]
        .as_array()
        .ok_or("Presentation: missing authored nodes")?
    {
        let id = integer(&node["id"], 1, u32::MAX as u64)?;
        if nodes.len() >= 512 {
            return Err("Presentation: hierarchy exceeds 512 nodes".into());
        }
        if nodes.insert(id, node).is_some() {
            return Err("Presentation: duplicate authored node identity".into());
        }
        if node["type"] == "patcher" {
            collect_at(&node["patcher"], nodes, depth + 1)?;
        }
    }
    Ok(())
}
fn display_text(node: &Value) -> Result<&str, String> {
    match node["type"].as_str() {
        Some("comment" | "message" | "message_box") => match node["params"].get("text") {
            Some(value) => value
                .as_str()
                .ok_or_else(|| "Presentation: unsupported display text target".into()),
            None if node["type"] == "message" => Ok("60 100"),
            None if node["type"] == "message_box" => Ok(""),
            _ => Err("Presentation: unsupported display text target".into()),
        },
        _ => Err("Presentation: unsupported display text target".into()),
    }
}
#[derive(Default)]
struct Bounds {
    ids: HashSet<String>,
    items: usize,
    panels: usize,
    bytes: usize,
}

/// Qualified source facts are injectable for schema tests; the executable registry
/// deliberately contains no live_device node in this delivery.
pub(super) fn validate_with_profiles(
    document: &Value,
    profiles: &HashMap<u64, (String, String)>,
) -> Result<(), String> {
    fn scope(
        document: &Value,
        profiles: &HashMap<u64, (String, String)>,
        bounds: &mut Bounds,
        depth: usize,
    ) -> Result<(), String> {
        if depth > 16 {
            return Err("Presentation: hierarchy exceeds 16 levels".into());
        }
        let p = document
            .get("presentation")
            .ok_or("Presentation: missing presentation record")?;
        if !p.is_null() {
            fields(p, &["version", "openOnLoad", "size", "items"])?;
            if p["version"].as_f64() != Some(1.) || !p["openOnLoad"].is_boolean() {
                return Err("Presentation: unsupported version or openOnLoad".into());
            }
            fields(&p["size"], &["width", "height"])?;
            let width = integer(&p["size"]["width"], 1, 8192)?;
            let height = integer(&p["size"]["height"], 1, 8192)?;
            let items = p["items"]
                .as_array()
                .ok_or("Presentation: items must be an array")?;
            bounds.items += items.len();
            bounds.bytes += serde_json::to_vec(p).map_err(|e| e.to_string())?.len();
            if bounds.items > 128 || bounds.bytes > 65536 {
                return Err("Presentation: exceeds 128 items or 64 KiB".into());
            }
            let mut nodes = HashMap::new();
            collect(document, &mut nodes)?;
            for item in items {
                let control = item["kind"] == "control";
                let options = matches!(item["widget"].as_str(), Some("menu" | "radio"));
                let mut keys = vec![
                    "id", "kind", "target", "rect", "included", "visible", "style",
                ];
                if control {
                    keys.extend(["widget", "label"]);
                    if options {
                        keys.push("options");
                    }
                }
                fields(item, &keys)?;
                let id = item["id"].as_str().ok_or("Presentation: invalid item ID")?;
                if !(1..=64).contains(&id.len())
                    || !id.bytes().enumerate().all(|(i, c)| {
                        c.is_ascii_alphabetic()
                            || c == b'_'
                            || i > 0 && (c.is_ascii_digit() || c == b'-')
                    })
                    || !bounds.ids.insert(id.into())
                {
                    return Err(
                        "Presentation: item IDs must be document-wide unique ASCII identifiers"
                            .into(),
                    );
                }
                if !item["included"].is_boolean() || !item["visible"].is_boolean() {
                    return Err("Presentation: invalid visibility".into());
                }
                let rect = &item["rect"];
                fields(rect, &["x", "y", "width", "height"])?;
                let x = integer(&rect["x"], 0, 8192)?;
                let y = integer(&rect["y"], 0, 8192)?;
                let w = integer(&rect["width"], 1, 8192)?;
                let h = integer(&rect["height"], 1, 8192)?;
                if x + w > width || y + h > height {
                    return Err("Presentation: rectangle must fit surface".into());
                }
                fields(
                    &item["style"],
                    if control {
                        &["accent", "labelPosition"]
                    } else {
                        &["accent"]
                    },
                )?;
                if !matches!(
                    item["style"]["accent"].as_str(),
                    Some("default" | "cyan" | "orange" | "neutral")
                ) {
                    return Err("Presentation: invalid accent".into());
                }
                let target = &item["target"];
                let id = integer(&target["node"], 1, u32::MAX as u64)?;
                let node = nodes
                    .get(&id)
                    .ok_or("Presentation: target outside authored subtree")?;
                if !control {
                    fields(target, &["node", "profile"])?;
                    bounds.panels += 1;
                    if item["kind"] != "livePanel" || bounds.panels > 8 {
                        return Err("Presentation: unsupported kind or more than 8 panels".into());
                    }
                    let identity = profiles
                        .get(&id)
                        .ok_or("Presentation: unsupported installed source capability")?;
                    if node["type"] != "live_device"
                        || node["params"]["device"] != identity.0
                        || node["params"]["state"]["profile"] != identity.1
                        || target["profile"] != identity.1
                    {
                        return Err("Presentation: installed profile identity mismatch".into());
                    }
                    continue;
                }
                label(&item["label"], 0)?;
                if !matches!(
                    item["style"]["labelPosition"].as_str(),
                    Some("above" | "below" | "hidden")
                ) {
                    return Err("Presentation: invalid label position".into());
                }
                match target["kind"].as_str() {
                    Some("parameter") => {
                        fields(target, &["kind", "node", "param"])?;
                        let spec = kind(node["type"].as_str().unwrap_or(""))
                            .and_then(|k| {
                                parameters(k)
                                    .iter()
                                    .find(|p| Some(p.key) == target["param"].as_str() && p.live)
                            })
                            .ok_or("Presentation: target must be live numeric parameter")?;
                        let widget = item["widget"].as_str().unwrap_or("");
                        if !matches!(
                            widget,
                            "dial" | "slider" | "number" | "toggle" | "menu" | "radio"
                        ) {
                            return Err("Presentation: invalid numeric widget".into());
                        }
                        if widget == "toggle"
                            && (!spec.integral || spec.min != 0. || spec.max != 1.)
                        {
                            return Err("Presentation: toggle requires Boolean range".into());
                        }
                        if options {
                            let values = item["options"]
                                .as_array()
                                .ok_or("Presentation: missing choices")?;
                            if !spec.integral
                                || values.len() > 32
                                || values.len() as f64 != spec.max - spec.min + 1.
                            {
                                return Err(
                                    "Presentation: choices must cover integer domain".into()
                                );
                            }
                            let mut unique = HashSet::new();
                            for option in values {
                                fields(option, &["value", "label"])?;
                                let value = option["value"]
                                    .as_f64()
                                    .ok_or("Presentation: invalid choice")?;
                                if value.fract() != 0.
                                    || value < spec.min
                                    || value > spec.max
                                    || !unique.insert(value as i64)
                                {
                                    return Err("Presentation: invalid or duplicate choice".into());
                                }
                                label(&option["label"], 1)?;
                            }
                        }
                    }
                    Some("event") => {
                        fields(target, &["kind", "node", "inlet", "action"])?;
                        // Authored inlets have no inputs; their lowered relays do.
                        if node["type"] == "inlet" {
                            return Err("Presentation: unsupported bang event target".into());
                        }
                        let port = integer(&target["inlet"], 0, u32::MAX as u64)? as u32;
                        let mut native = NativeNode {
                            kind: kind(node["type"].as_str().unwrap_or(""))
                                .ok_or("Presentation: unsupported event source")?,
                            ..Default::default()
                        };
                        if let Some(args) = node["params"]["args"]
                            .as_str()
                            .or_else(|| node["params"]["name"].as_str())
                            .or_else(|| {
                                matches!(native.kind, 19..=23)
                                    .then(|| super::default_arguments(native.kind))
                            })
                        {
                            if args.len() > 127 {
                                return Err("Presentation: invalid event arguments".into());
                            }
                            native.text[..args.len()].copy_from_slice(args.as_bytes());
                        }
                        if item["widget"] != "button"
                            || target["action"] != "bang"
                            || !matches!(inlet(&native, port), Some(Port::Control | Port::Mixed))
                        {
                            return Err("Presentation: unsupported bang event target".into());
                        }
                    }
                    Some("text") => {
                        fields(target, &["kind", "node", "param"])?;
                        if item["widget"] != "text"
                            || target["param"] != "text"
                            || !matches!(
                                node["type"].as_str(),
                                Some("comment" | "message" | "message_box")
                            )
                            || display_text(node).is_err()
                        {
                            return Err("Presentation: unsupported display text target".into());
                        }
                    }
                    _ => return Err("Presentation: unknown target kind".into()),
                }
            }
        }
        for node in document["nodes"]
            .as_array()
            .ok_or("Presentation: missing nodes")?
        {
            if node["type"] == "patcher" {
                scope(&node["patcher"], profiles, bounds, depth + 1)?;
            }
        }
        Ok(())
    }
    scope(document, profiles, &mut Bounds::default(), 0)
}
pub(super) fn validate(document: &Value) -> Result<(), String> {
    validate_with_profiles(document, &HashMap::new())
}

/// Preserve the authored root record and attach immutable resolved control data.
/// Admission requires capabilities only for included root items, even if hidden.
pub(super) fn project(
    document: &Value,
    bindings: &[super::device::HostParameter],
) -> Result<Value, String> {
    validate(document)?;
    let mut surface = document["presentation"].clone();
    if surface.is_null() {
        return Err("Reusable devices require a root presentation".into());
    }
    let mut nodes = HashMap::new();
    collect(document, &mut nodes)?;
    for item in surface["items"].as_array_mut().unwrap() {
        let target = &item["target"];
        let required = item["included"] == true;
        let node_id = integer(&target["node"], 1, u32::MAX as u64)?;
        let node = nodes[&node_id];
        match target["kind"].as_str() {
            Some("parameter") => {
                let binding = bindings.iter().find(|p| {
                    p.node as u64 == node_id && Some(p.param.as_str()) == target["param"].as_str()
                });
                if required && binding.is_none() {
                    return Err(format!(
                        "Unsupported Alive presentation capability: parameter {}.{} is not exposed",
                        node_id,
                        target["param"].as_str().unwrap()
                    ));
                }
                let spec = parameters(kind(node["type"].as_str().unwrap()).unwrap())
                    .iter()
                    .find(|p| Some(p.key) == target["param"].as_str())
                    .unwrap();
                item["resolved"] = json!({"kind":"parameter","bindingId":binding.map(|b|b.key.as_str()),"descriptor":{"min":binding.map_or(spec.min,|b|b.min),"max":binding.map_or(spec.max,|b|b.max),"integral":spec.integral,"unit":binding.and_then(|b|b.unit.as_deref())}});
            }
            Some("text") => {
                item["resolved"] = json!({"kind":"text","text":display_text(node)?,"style":node.get("style").cloned().unwrap_or(json!({}))});
            }
            Some("event") => {
                if required {
                    return Err(format!(
                        "Unsupported Alive presentation capability: event {}:{} bang",
                        target["node"], target["inlet"]
                    ));
                }
                item["resolved"] = json!({"kind":"event","supported":false});
            }
            _ => {
                if required {
                    return Err("Unsupported Alive presentation capability: livePanel".into());
                }
            }
        }
    }
    Ok(surface)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shared_presentation_corpus() {
        let cases: Value =
            serde_json::from_str(include_str!("../../ui/canvas-presentation-cases.json")).unwrap();
        for case in cases.as_array().unwrap() {
            let mut profiles = HashMap::new();
            if let Some(facts) = case["profiles"].as_object() {
                for (id, fact) in facts {
                    profiles.insert(
                        id.parse().unwrap(),
                        (
                            fact["device"].as_str().unwrap().into(),
                            fact["profile"].as_str().unwrap().into(),
                        ),
                    );
                }
            }
            assert_eq!(
                validate_with_profiles(&case["document"], &profiles).is_ok(),
                case["valid"].as_bool().unwrap(),
                "{}",
                case["name"]
            );
        }
    }
}
