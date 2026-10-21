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
#[derive(Clone, Copy, Debug)]
pub struct NativeNode {
    pub id: u32,
    pub kind: u32,
    pub device: u32,
    pub count: u32,
    pub p0: f64,
    pub p1: f64,
    pub p2: f64,
    pub p3: f64,
    pub p4: f64,
    pub p5: f64,
    pub text: [u8; 128],
}
impl Default for NativeNode {
    fn default() -> Self {
        Self {
            id: 0,
            kind: 0,
            device: 0,
            count: 0,
            p0: 0.,
            p1: 0.,
            p2: 0.,
            p3: 0.,
            p4: 0.,
            p5: 0.,
            text: [0; 128],
        }
    }
}
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct NativeMessage {
    pub count: u32,
    pub values: [f64; 8],
    pub tags: [u32; 8],
    pub symbols: [[u8; 32]; 8],
    pub selector: [u8; 32],
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
fn inlet(node: &NativeNode, port: u32) -> Option<Port> {
    let count = argument_count(node);
    match node.kind {
        0..=1 | 3 if port == 0 => Some(Port::Control),
        2 | 4..=8 if port <= 1 => Some(Port::Control),
        9 | 11 if port <= 2 => Some(Port::Control),
        12 if port == 0 => Some(Port::Mono),
        12 if port == 1 => Some(Port::Control),
        13 if port <= 1 => Some(Port::Mono),
        14 if port == 0 => Some(Port::Stereo),
        15..=16 if port <= 1 => Some(Port::Control),
        17..=18 | 20 | 23 if port == 0 => Some(Port::Control),
        19 if port < count => Some(Port::Control),
        21 if port < if count == 1 { 2 } else { 1 } => Some(Port::Control),
        22 if port <= count => Some(Port::Control),
        24 if port <= 2 => Some(Port::Control),
        _ => None,
    }
}
fn outlet(node: &NativeNode, port: u32) -> Option<Port> {
    let count = argument_count(node);
    match node.kind {
        0..=10 | 15..=16 | 18..=19 if port == 0 => Some(Port::Control),
        11..=12 if port == 0 => Some(Port::Mono),
        13 if port == 0 => Some(Port::Stereo),
        17 | 24 if port <= 1 => Some(Port::Control),
        20 | 23 if port < count => Some(Port::Control),
        21..=22 if port <= count => Some(Port::Control),
        _ => None,
    }
}
fn argument_count(node: &NativeNode) -> u32 {
    let end = node
        .text
        .iter()
        .position(|&b| b == 0)
        .unwrap_or(node.text.len());
    node.text[..end]
        .split(u8::is_ascii_whitespace)
        .filter(|part| !part.is_empty())
        .count() as u32
}
fn kind(name: &str) -> Option<u32> {
    [
        "bang", "message", "number", "toggle", "add", "multiply", "metro", "counter", "chord",
        "makenote", "midiin", "voice", "gain", "join", "dac", "int", "float", "flonum", "slider",
        "pack", "unpack", "select", "route", "trigger", "line",
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
        15..=16 => &[p!("value", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true)],
        17 => &[
            p!("value", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true),
            p!(
                "minimum",
                1,
                -NUMBER_LIMIT,
                -NUMBER_LIMIT,
                NUMBER_LIMIT,
                false,
                true
            ),
            p!(
                "maximum",
                2,
                NUMBER_LIMIT,
                -NUMBER_LIMIT,
                NUMBER_LIMIT,
                false,
                true
            ),
            p!("numdecimalplaces", 3, 6., 0., 9., true, true),
        ],
        18 => &[
            p!("value", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true),
            p!("size", 1, 128., 1., NUMBER_LIMIT, true, true),
            p!("min", 2, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true),
            p!("mult", 3, 1., -NUMBER_LIMIT, NUMBER_LIMIT, false, true),
            p!("floatoutput", 4, 0., 0., 1., true, true),
        ],
        24 => &[
            p!("value", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true),
            p!("time", 1, 0., 0., NUMBER_LIMIT, false, true),
            p!("grain", 2, 20., 1., NUMBER_LIMIT, false, true),
            p!("floatoutput", 3, 2., 0., 2., true, true),
        ],
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
            2 => node.p2 = value,
            3 => node.p3 = value,
            4 => node.p4 = value,
            5 => node.p5 = value,
            _ => unreachable!("unsupported numeric parameter slot"),
        }
    }
}
fn validate_text(text: &str) -> Result<(), String> {
    if text.len() > 127
        || text.trim().is_empty()
        || !text.is_ascii()
        || text.bytes().any(|b| {
            matches!(b, b',' | b';' | b'$' | b'"' | b'\'' | b'\\')
                || (b.is_ascii_control() && !matches!(b, b'\n' | b'\r' | b'\t'))
        })
    {
        return Err("Text requires 1..127 ASCII bytes without substitution, quotes, backslashes, commas or semicolons".into());
    }
    Ok(())
}
fn symbol(text: &str) -> Result<[u8; 32], String> {
    if text.is_empty() || text.len() > 31 || text.bytes().any(|b| b.is_ascii_whitespace()) {
        return Err("Symbols require 1..31 ASCII bytes without whitespace".into());
    }
    let mut result = [0; 32];
    result[..text.len()].copy_from_slice(text.as_bytes());
    Ok(result)
}
fn add_atom(message: &mut NativeMessage, token: &str, force_symbol: bool) -> Result<(), String> {
    let index = message.count as usize;
    if index == 8 {
        return Err("Messages and creation arguments support at most eight atoms".into());
    }
    if !force_symbol {
        match token.parse::<f64>() {
            Ok(value) => {
                validate_number(value)?;
                message.values[index] = value;
                message.tags[index] = u32::from(token.contains(['.', 'e', 'E']));
                message.count += 1;
                return Ok(());
            }
            Err(_)
                if token.as_bytes().first().is_some_and(u8::is_ascii_digit)
                    || matches!(token.as_bytes().first(), Some(b'+' | b'-' | b'.')) =>
            {
                return Err("Malformed numeric atom".into());
            }
            Err(_) => {}
        }
    }
    message.tags[index] = 2;
    message.symbols[index] = symbol(token)?;
    message.count += 1;
    Ok(())
}
fn arguments(text: &str) -> Result<NativeMessage, String> {
    validate_text(text)?;
    let mut result = NativeMessage::default();
    for token in text.split_ascii_whitespace() {
        add_atom(&mut result, token, false)?;
    }
    Ok(result)
}
fn literal(text: &str) -> Result<NativeMessage, String> {
    validate_text(text)?;
    let tokens: Vec<_> = text.split_ascii_whitespace().collect();
    let first = tokens[0];
    if first == "bang" {
        if tokens.len() != 1 {
            return Err("bang accepts no atoms".into());
        }
        return Ok(NativeMessage::default());
    }
    let mut result = NativeMessage::default();
    if first == "symbol" {
        if tokens.len() != 2 {
            return Err("symbol requires one literal atom".into());
        }
        result.selector = symbol(first)?;
        add_atom(&mut result, tokens[1], true)?;
    } else if first == "list" {
        result.selector = symbol(first)?;
        for token in &tokens[1..] {
            add_atom(&mut result, token, false)?;
        }
    } else {
        let mut head = NativeMessage::default();
        add_atom(&mut head, first, false)?;
        if head.tags[0] == 2 {
            result.selector = head.symbols[0];
            for token in &tokens[1..] {
                add_atom(&mut result, token, false)?;
            }
        } else {
            result = head;
            for token in &tokens[1..] {
                add_atom(&mut result, token, false)?;
            }
        }
    }
    Ok(result)
}
fn validate_number(value: f64) -> Result<(), String> {
    if !value.is_finite() || value.abs() > NUMBER_LIMIT {
        return Err("Control values must be finite numbers in -100000..100000".into());
    }
    Ok(())
}
fn validate_relationships(node: &NativeNode) -> Result<(), String> {
    if node.kind == 17 && node.p1 > node.p2 {
        return Err("flonum minimum must not exceed maximum".into());
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
            literal(text)?;
            native.text[..text.len()].copy_from_slice(text.as_bytes());
        } else if (19..=23).contains(&kind) {
            if node.params.keys().any(|key| key != "args") {
                return Err(format!("Unknown parameter for {}", node.r#type));
            }
            let text = match node.params.get("args") {
                Some(value) => value.as_str().ok_or("Creation args must be a string")?,
                None => match kind {
                    19..=20 => "0 0",
                    21..=22 => "0",
                    _ => "i i",
                },
            };
            arguments(text)?;
            native.text[..text.len()].copy_from_slice(text.as_bytes());
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
            validate_relationships(&native)?;
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
        let out = outlet(&a, edge.outlet).ok_or("Invalid outlet")?;
        let input = inlet(&b, edge.inlet).ok_or("Invalid inlet")?;
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
    ) -> Result<NativeMessage, String> {
        let index = self.node_index(revision, node)?;
        if inlet(&self.graph.as_ref().unwrap().native.nodes[index], port) != Some(Port::Control) {
            return Err("Events require a valid control inlet".into());
        }
        let mut event = NativeMessage::default();
        if value.is_null() {
            return Ok(event);
        }
        if let Some(text) = value.as_str() {
            return literal(text);
        }
        let values = value
            .as_array()
            .filter(|values| (1..=8).contains(&values.len()))
            .ok_or("Events must be null, a literal string, or one to eight numeric values")?;
        event.count = values.len() as u32;
        for (index, value) in values.iter().enumerate() {
            let value = value.as_f64().ok_or("Event values must be numeric")?;
            validate_number(value)?;
            event.values[index] = value;
            event.tags[index] = u32::from(value.fract() != 0.);
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
        let mut next = native;
        assign_parameter(&mut next, *spec, value);
        validate_relationships(&next)?;
        if !send(spec.slot, value) {
            return Err("Native canvas parameter was not admitted".into());
        }
        self.graph.as_mut().unwrap().native.nodes[index] = next;
        Ok(())
    }
}

#[cfg(test)]
#[path = "canvas_tests.rs"]
mod tests;
