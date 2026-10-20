//! Strict, bounded preparation for the native `ultra-canvas-v1` execution profile.
//!
//! This module never touches the audio thread. The caller admits a fully prepared
//! plan while holding the same control mutex used by legacy commands.
use serde::Deserialize;
use serde_json::{Map, Value};
use std::{
    collections::{HashMap, HashSet},
    io::{self, Write},
};

pub const MAX_NODES: usize = 32;
pub const MAX_EDGES: usize = 64;
pub const MAX_JSON_BYTES: usize = 64 * 1024;
const NUMBER_LIMIT: f64 = 100_000.;

// Keep these C-layout types in sync with native/patch_graph.h. Tests pin sizes.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct NativeNode {
    pub id: u32,
    pub kind: u32,
    pub device: u32,
    pub count: u32,
    pub p0: f64,
    pub p1: f64,
    pub p2: f64,
}
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct NativeEdge {
    pub from: u32,
    pub outlet: u32,
    pub to: u32,
    pub inlet: u32,
}
#[repr(C)]
#[derive(Clone, Debug)]
pub struct NativeGraph {
    pub revision: u64,
    pub node_count: u32,
    pub edge_count: u32,
    pub nodes: [NativeNode; MAX_NODES],
    pub edges: [NativeEdge; MAX_EDGES],
}
impl Default for NativeGraph {
    fn default() -> Self {
        Self {
            revision: 0,
            node_count: 0,
            edge_count: 0,
            nodes: [NativeNode::default(); MAX_NODES],
            edges: [NativeEdge::default(); MAX_EDGES],
        }
    }
}
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct NativeObservation {
    pub id: u32,
    pub reserved: u32,
    pub value: f64,
    pub pulses: u64,
}
#[repr(C)]
#[derive(Default)]
pub struct NativeStatus {
    pub revision: u64,
    pub node_count: u32,
    pub active: u32,
    pub nodes: [NativeObservation; MAX_NODES],
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Document {
    version: u32,
    profile: String,
    nodes: Vec<Node>,
    edges: Vec<Edge>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Node {
    id: u32,
    r#type: String,
    x: f64,
    y: f64,
    params: Map<String, Value>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Edge {
    from: u32,
    outlet: u32,
    to: u32,
    inlet: u32,
}
#[derive(Clone, Debug)]
pub struct Prepared {
    pub native: NativeGraph,
}

/// Count the serialized input without allocating another unbounded JSON string.
struct SizeLimit(usize);
impl Write for SizeLimit {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        if bytes.len() > MAX_JSON_BYTES.saturating_sub(self.0) {
            return Err(io::Error::other("Canvas patch exceeds 64 KiB JSON"));
        }
        self.0 += bytes.len();
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Port {
    Control,
    Mono,
    Stereo,
}
fn inlet(kind: u32, port: u32) -> Option<Port> {
    match kind {
        0..=1 | 3 if port == 0 => Some(Port::Control),
        2 | 4..=8 if port <= 1 => Some(Port::Control),
        9 | 11 if port <= 2 => Some(Port::Control),
        12 if port == 0 => Some(Port::Mono),
        12 if port == 1 => Some(Port::Control),
        13 if port <= 1 => Some(Port::Mono),
        14 if port == 0 => Some(Port::Stereo),
        _ => None,
    }
}
fn outlet(kind: u32, port: u32) -> Option<Port> {
    if port != 0 {
        return None;
    }
    match kind {
        0..=10 => Some(Port::Control),
        11..=12 => Some(Port::Mono),
        13 => Some(Port::Stereo),
        _ => None,
    }
}
fn kind(name: &str) -> Option<u32> {
    [
        "bang", "message", "number", "toggle", "add", "multiply", "metro", "counter", "chord",
        "makenote", "midiin", "voice", "gain", "join", "dac",
    ]
    .iter()
    .position(|candidate| *candidate == name)
    .map(|i| i as u32)
}

#[derive(Clone, Copy)]
struct Parameter {
    key: &'static str,
    slot: u32,
    default: f64,
    min: f64,
    max: f64,
    integral: bool,
    live: bool,
}
fn parameters(kind: u32) -> &'static [Parameter] {
    macro_rules! p {
        ($key:literal,$slot:literal,$default:expr,$min:expr,$max:expr,$int:literal,$live:literal) => {
            Parameter {
                key: $key,
                slot: $slot,
                default: $default,
                min: $min,
                max: $max,
                integral: $int,
                live: $live,
            }
        };
    }
    match kind {
        2 => &[p!("value", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true)],
        3 => &[p!("value", 0, 0., 0., 1., true, true)],
        4 => &[p!("rhs", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true)],
        5 => &[p!("rhs", 0, 1., -NUMBER_LIMIT, NUMBER_LIMIT, false, true)],
        6 => &[p!("interval", 0, 150., 20., 2000., false, true)],
        7 => &[p!("steps", 0, 8., 1., 32., true, true)],
        8 => &[
            p!("root", 0, 48., 0., 127., true, true),
            p!("shape", 1, 0., 0., 2., true, true),
        ],
        9 => &[
            p!("velocity", 0, 100., 1., 127., true, true),
            p!("duration", 1, 150., 10., 2000., false, true),
        ],
        10 => &[p!("channel", 0, 2., 1., 16., true, false)],
        11 => &[
            p!("device", 2, 0., 0., 1., true, false),
            p!("attack", 0, 8., 0., 127., true, true),
            p!("release", 1, 28., 0., 127., true, true),
        ],
        12 => &[p!("value", 0, 90., 0., 127., true, true)],
        _ => &[],
    }
}
fn validate_parameter(spec: Parameter, value: f64) -> Result<(), String> {
    if !value.is_finite()
        || value < spec.min
        || value > spec.max
        || (spec.integral && value.fract() != 0.)
    {
        return Err(format!(
            "Invalid {}: expected {}{}..{}",
            spec.key,
            if spec.integral {
                "integer "
            } else {
                "finite number "
            },
            spec.min,
            spec.max
        ));
    }
    Ok(())
}
fn assign_parameter(node: &mut NativeNode, spec: Parameter, value: f64) {
    if node.kind == 11 && spec.key == "device" {
        node.device = value as u32;
    } else {
        match spec.slot {
            0 => node.p0 = value,
            1 => node.p1 = value,
            _ => unreachable!("unsupported numeric parameter slot"),
        }
    }
}
fn literals(text: &str) -> Result<([f64; 3], u32), String> {
    if text.chars().count() > 128 {
        return Err("Message text exceeds 128 characters".into());
    }
    let mut values = [0.; 3];
    if text.trim() == "bang" {
        return Ok((values, 0));
    }
    let mut count = 0;
    for token in text.split_whitespace() {
        if count == 3 {
            return Err("Messages support bang or one to three literal numbers".into());
        }
        let value: f64 = token.parse().map_err(|_| {
            "Messages support only literal numbers, not symbols or Max message syntax"
        })?;
        validate_number(value)?;
        values[count] = value;
        count += 1;
    }
    if count == 0 {
        return Err("Message text must be bang or one to three literal numbers".into());
    }
    Ok((values, count as u32))
}
fn validate_number(value: f64) -> Result<(), String> {
    if !value.is_finite() || value.abs() > NUMBER_LIMIT {
        return Err("Control values must be finite numbers in -100000..100000".into());
    }
    Ok(())
}

pub fn prepare(patch: Value) -> Result<Prepared, String> {
    serde_json::to_writer(SizeLimit(0), &patch)
        .map_err(|e| format!("Invalid canvas input: {e}"))?;
    let doc: Document =
        serde_json::from_value(patch).map_err(|e| format!("Invalid canvas schema: {e}"))?;
    if doc.version != 1 || doc.profile != "ultra-canvas-v1" {
        return Err("Expected version 1 and profile ultra-canvas-v1".into());
    }
    if doc.nodes.len() > MAX_NODES || doc.edges.len() > MAX_EDGES {
        return Err("Canvas supports at most 32 nodes and 64 edges".into());
    }
    let mut graph = NativeGraph {
        node_count: doc.nodes.len() as u32,
        edge_count: doc.edges.len() as u32,
        ..NativeGraph::default()
    };
    let mut ids = HashMap::new();
    let mut devices = HashSet::new();
    let mut singletons = HashSet::new();
    for (index, node) in doc.nodes.iter().enumerate() {
        if node.id == 0 || ids.insert(node.id, index).is_some() {
            return Err("Node IDs must be unique positive u32 integers".into());
        }
        if !node.x.is_finite()
            || !node.y.is_finite()
            || !(0. ..=4000.).contains(&node.x)
            || !(0. ..=4000.).contains(&node.y)
        {
            return Err("Node positions must be finite and within 0..4000".into());
        }
        let kind =
            kind(&node.r#type).ok_or_else(|| format!("Unknown canvas object: {}", node.r#type))?;
        let mut native = NativeNode {
            id: node.id,
            kind,
            ..NativeNode::default()
        };
        if kind == 1 {
            if node.params.keys().any(|key| key != "text") {
                return Err("Unknown message parameter".into());
            }
            let text = match node.params.get("text") {
                Some(value) => value.as_str().ok_or("Message text must be a string")?,
                None => "60 100",
            };
            let (values, count) = literals(text)?;
            native.count = count;
            native.p0 = values[0];
            native.p1 = values[1];
            native.p2 = values[2];
        } else {
            let specs = parameters(kind);
            if node
                .params
                .keys()
                .any(|key| !specs.iter().any(|spec| spec.key == key))
            {
                return Err(format!("Unknown parameter for {}", node.r#type));
            }
            for spec in specs {
                let value = match node.params.get(spec.key) {
                    Some(value) => value
                        .as_f64()
                        .ok_or_else(|| format!("{} must be numeric", spec.key))?,
                    None => spec.default,
                };
                validate_parameter(*spec, value)?;
                assign_parameter(&mut native, *spec, value);
            }
        }
        if kind == 11 && !devices.insert(native.device) {
            return Err("Only one voice per logical device is supported".into());
        }
        if (kind == 13 || kind == 14) && !singletons.insert(kind) {
            return Err("Only one join and one dac are supported".into());
        }
        graph.nodes[index] = native;
    }
    let mut cords = HashSet::new();
    let mut audio_inlets = HashSet::new();
    let mut voice_paths = HashSet::new();
    let mut controls = vec![Vec::new(); doc.nodes.len()];
    for (index, edge) in doc.edges.iter().enumerate() {
        let from = *ids.get(&edge.from).ok_or("Unknown edge source")?;
        let to = *ids.get(&edge.to).ok_or("Unknown edge destination")?;
        let a = graph.nodes[from];
        let b = graph.nodes[to];
        let out = outlet(a.kind, edge.outlet).ok_or("Invalid outlet")?;
        let input = inlet(b.kind, edge.inlet).ok_or("Invalid inlet")?;
        if out != input {
            return Err("Control, mono audio and stereo audio ports cannot be mixed".into());
        }
        if !cords.insert((edge.from, edge.outlet, edge.to, edge.inlet)) {
            return Err("Duplicate canvas edge".into());
        }
        if out == Port::Control {
            controls[from].push(to);
        } else {
            if !matches!((a.kind, b.kind), (11, 12) | (12, 13) | (13, 14)) {
                return Err("Supported audio paths are voice -> gain -> join -> dac".into());
            }
            if !audio_inlets.insert((edge.to, edge.inlet)) {
                return Err("An audio inlet accepts exactly one source".into());
            }
            if a.kind == 11 && !voice_paths.insert(edge.from) {
                return Err("A voice may feed only one gain path".into());
            }
        }
        graph.edges[index] = NativeEdge {
            from: edge.from,
            outlet: edge.outlet,
            to: edge.to,
            inlet: edge.inlet,
        };
    }
    fn visit(node: usize, graph: &[Vec<usize>], marks: &mut [u8]) -> bool {
        if marks[node] == 1 {
            return false;
        }
        if marks[node] == 2 {
            return true;
        }
        marks[node] = 1;
        for &next in &graph[node] {
            if !visit(next, graph, marks) {
                return false;
            }
        }
        marks[node] = 2;
        true
    }
    let mut marks = vec![0; doc.nodes.len()];
    for node in 0..doc.nodes.len() {
        if !visit(node, &controls, &mut marks) {
            return Err("Control cycles are not supported".into());
        }
    }
    Ok(Prepared { native: graph })
}

#[derive(Default)]
pub struct CanvasState {
    graph: Option<Prepared>,
    revision: u64,
}
pub struct Event {
    pub count: u32,
    pub values: [f64; 3],
}
impl CanvasState {
    /// Commit the generation only after the native bounded plan has been admitted.
    pub fn install(
        &mut self,
        mut plan: Prepared,
        install: impl FnOnce(&NativeGraph) -> bool,
    ) -> Result<u64, String> {
        let revision = self
            .revision
            .checked_add(1)
            .ok_or("Canvas revision exhausted")?;
        plan.native.revision = revision;
        if !install(&plan.native) {
            return Err("Native canvas admission failed; previous graph retained".into());
        }
        self.revision = revision;
        self.graph = Some(plan);
        Ok(revision)
    }
    fn node_index(&self, revision: u64, id: u32) -> Result<usize, String> {
        if revision == 0 || revision != self.revision {
            return Err("Stale canvas revision; reapply or refresh the patch".into());
        }
        self.graph
            .as_ref()
            .and_then(|plan| {
                plan.native.nodes[..plan.native.node_count as usize]
                    .iter()
                    .position(|node| node.id == id)
            })
            .ok_or_else(|| "Unknown canvas node".into())
    }
    pub fn event(
        &self,
        revision: u64,
        node: u32,
        port: u32,
        value: Value,
    ) -> Result<Event, String> {
        let index = self.node_index(revision, node)?;
        if inlet(self.graph.as_ref().unwrap().native.nodes[index].kind, port) != Some(Port::Control)
        {
            return Err("Events require a valid control inlet".into());
        }
        let mut event = Event {
            count: 0,
            values: [0.; 3],
        };
        if value.is_null() {
            return Ok(event);
        }
        let values = value
            .as_array()
            .filter(|values| (1..=3).contains(&values.len()))
            .ok_or("Events must be null (bang) or one to three numeric values")?;
        event.count = values.len() as u32;
        for (index, value) in values.iter().enumerate() {
            let value = value.as_f64().ok_or("Event values must be numeric")?;
            validate_number(value)?;
            event.values[index] = value;
        }
        Ok(event)
    }
    pub fn parameter(
        &mut self,
        revision: u64,
        node: u32,
        key: &str,
        value: f64,
        send: impl FnOnce(u32, f64) -> bool,
    ) -> Result<(), String> {
        let index = self.node_index(revision, node)?;
        let native = self.graph.as_ref().unwrap().native.nodes[index];
        let spec = parameters(native.kind)
            .iter()
            .find(|spec| spec.key == key)
            .ok_or("Unknown or nonnumeric canvas parameter")?;
        if !spec.live {
            return Err(format!("{key} is structural; apply a new graph"));
        }
        validate_parameter(*spec, value)?;
        if !send(spec.slot, value) {
            return Err("Native canvas parameter was not admitted".into());
        }
        assign_parameter(
            &mut self.graph.as_mut().unwrap().native.nodes[index],
            *spec,
            value,
        );
        Ok(())
    }
}

#[cfg(test)]
#[path = "canvas_tests.rs"]
mod tests;
