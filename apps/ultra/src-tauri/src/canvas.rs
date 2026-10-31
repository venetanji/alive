//! Strict, bounded preparation for flat and hierarchical canvas documents.
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

#[path = "canvas_hierarchy.rs"]
mod hierarchy;
#[path = "canvas_presentation.rs"]
mod presentation;
#[path = "canvas_device.rs"]
pub(crate) mod device;

// Keep these C-layout types in sync with native/patch_graph.h. Tests pin sizes.
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
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
pub struct NativeConsoleRecord {
    pub sequence: u64,
    pub revision: u64,
    pub frame: u64,
    pub node: u32,
    pub level: u32,
    pub label: [u8; 32],
    pub message: NativeMessage,
}
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct NativeMessageBoxObservation {
    pub id: u32, pub flags: u32, pub generation: u64,
    pub prototype: NativeMessage, pub placeholders: [u32; 8],
}
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct NativeMessageBoxSnapshot {
    pub revision: u64, pub text_edit_serial: u64,
    pub node_count: u32, pub reserved: u32,
    pub nodes: [NativeMessageBoxObservation; 32],
}
#[derive(serde::Serialize)]
pub struct MessageBoxObservation {
    pub id: u32, pub generation: u64, pub empty: bool, pub text: String,
    pub prototype: Value, pub placeholders: Vec<u32>,
}
#[derive(serde::Serialize)]
pub struct MessageBoxSnapshot {
    pub revision: u64, pub text_edit_serial: u64, pub nodes: Vec<MessageBoxObservation>,
}
pub fn message_box_snapshot(snapshot: &NativeMessageBoxSnapshot) -> Result<MessageBoxSnapshot, String> {
    if snapshot.node_count > 32 || snapshot.reserved != 0 { return Err("Invalid native message snapshot".into()); }
    let mut nodes = Vec::new();
    for row in &snapshot.nodes[..snapshot.node_count as usize] {
        if row.flags > 1 || row.prototype.count > 8 || row.placeholders.iter().any(|&reference| reference > 2) { return Err("Invalid native message template".into()); }
        let bytes = |bytes: &[u8]| -> Result<String,String> {
            let end = bytes.iter().position(|&byte| byte == 0).ok_or("Unterminated message symbol")?;
            String::from_utf8(bytes[..end].to_vec()).map_err(|_| "Invalid message symbol".into())
        };
        let selector = bytes(&row.prototype.selector)?;
        let mut words = Vec::new();let mut atoms = Vec::new();
        if !selector.is_empty() { words.push(selector.clone()); }
        for i in 0..row.prototype.count as usize {
            let tag = row.prototype.tags[i];
            let word = match tag {
                0 | 1 => {
                    let value=row.prototype.values[i];validate_number(value)?;
                    let mut word=value.to_string();
                    if word.len()>31 { word=format!("{value:e}"); }
                    if tag==1 && !word.contains(['.','e','E']) { word.push_str(".0"); }
                    word
                },
                2 => bytes(&row.prototype.symbols[i])?,
                _ => return Err("Invalid message atom tag".into()),
            };
            atoms.push(if tag==2 { serde_json::json!({"tag":tag,"symbol":word}) } else { serde_json::json!({"tag":tag,"value":row.prototype.values[i]}) });
            words.push(if row.placeholders[i] != 0 { format!("${}",row.placeholders[i]) } else { word });
        }
        if words.is_empty() && row.flags==0 { words.push("bang".into()); }
        nodes.push(MessageBoxObservation { id:row.id,generation:row.generation,empty:row.flags!=0,text:if row.flags!=0 { String::new() } else { words.join(" ") },
            prototype:serde_json::json!({"selector":selector,"atoms":atoms}),placeholders:row.placeholders[..row.prototype.count as usize].to_vec() });
    }
    Ok(MessageBoxSnapshot { revision:snapshot.revision,text_edit_serial:snapshot.text_edit_serial,nodes })
}
#[derive(Clone, serde::Serialize, Debug)]
pub struct ConsoleRecord {
    pub sequence: u64,
    pub revision: u64,
    pub frame: u64,
    pub node: u32,
    pub level: u32,
    pub label: String,
    pub text: String,
}
fn native_text(bytes: &[u8]) -> Result<String, String> {
    let end = bytes.iter().position(|&b| b == 0).ok_or("Unterminated console text")?;
    String::from_utf8(bytes[..end].to_vec()).map_err(|_| "Invalid console text".into())
}
fn native_message_text(message: &NativeMessage) -> Result<String, String> {
    if message.count > 8 { return Err("Invalid native message count".into()); }
    let mut words = Vec::with_capacity(9);
    let selector = native_text(&message.selector)?;
    if !selector.is_empty() { words.push(selector); }
    for i in 0..message.count as usize {
        let atom = match message.tags[i] {
            // Older numeric objects carry untyped fractional doubles with tag 0.
            0 => { validate_number(message.values[i])?; message.values[i].to_string() },
            1 => {
                validate_number(message.values[i])?;
                let mut value = message.values[i].to_string();
                if !value.contains(['.','e','E']) { value.push('.'); }
                value
            },
            2 => native_text(&message.symbols[i])?,
            _ => return Err("Invalid native console atom".into()),
        };
        words.push(atom);
    }
    if words.is_empty() { words.push("bang".into()); }
    Ok(words.join(" "))
}
pub fn console_record(record: &NativeConsoleRecord) -> Result<ConsoleRecord, String> {
    if record.message.count > 8 || record.level > 3 { return Err("Invalid native console record".into()); }
    Ok(ConsoleRecord { sequence: record.sequence, revision: record.revision, frame: record.frame,
        node: record.node, level: record.level, label: native_text(&record.label)?, text: native_message_text(&record.message)? })
}
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct NativePrintPopupObservation {
    pub id: u32, pub enabled: u32, pub has_value: u32, pub reserved: u32,
    pub generation: u64, pub frame: u64, pub message: NativeMessage,
}
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct NativePrintPopupSnapshot {
    pub revision: u64, pub frame: u64, pub node_count: u32, pub reserved: u32,
    pub nodes: [NativePrintPopupObservation; 32],
}
#[derive(serde::Serialize)]
pub struct PrintPopupObservation {
    pub id: u32, pub enabled: bool, pub has_value: bool,
    pub generation: u64, pub frame: u64, pub text: String,
}
#[derive(serde::Serialize)]
pub struct PrintPopupSnapshot {
    pub revision: u64, pub frame: u64, pub nodes: Vec<PrintPopupObservation>,
}
pub fn print_popup_snapshot(snapshot: &NativePrintPopupSnapshot) -> Result<PrintPopupSnapshot, String> {
    if snapshot.node_count > 32 || snapshot.reserved != 0 { return Err("Invalid native print snapshot".into()); }
    let symbol = |bytes: &[u8]| -> Result<(), String> {
        let text=native_text(bytes)?;
        if text.bytes().any(|byte| !(33..=126).contains(&byte) || b",;$'\"\\".contains(&byte)) {
            return Err("Invalid native print symbol".into());
        }
        Ok(())
    };
    let mut ids=HashSet::new();let mut nodes=Vec::new();
    for row in &snapshot.nodes[..snapshot.node_count as usize] {
        if row.id==0 || !ids.insert(row.id) || row.enabled>1 || row.has_value>1 || row.reserved!=0 || row.frame>snapshot.frame
            || (row.has_value!=0 && (row.enabled==0 || row.generation==0)) || row.message.count>8 {
            return Err("Invalid native print observation".into());
        }
        symbol(&row.message.selector)?;
        for i in 0..row.message.count as usize {
            if row.message.tags[i]>2 { return Err("Invalid native print atom".into()); }
            validate_number(row.message.values[i])?;symbol(&row.message.symbols[i])?;
        }
        let text=native_message_text(&row.message)?;
        nodes.push(PrintPopupObservation {id:row.id,enabled:row.enabled!=0,has_value:row.has_value!=0,
            generation:row.generation,frame:row.frame,text:if row.enabled!=0&&row.has_value!=0 {text} else {String::new()} });
    }
    Ok(PrintPopupSnapshot {revision:snapshot.revision,frame:snapshot.frame,nodes})
}
#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq)]
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
    #[serde(rename = "presentation", deserialize_with = "required_presentation")]
    _presentation: Value,
    #[serde(default, deserialize_with = "device::present")]
    device: Option<device::Device>,
}
fn required_presentation<'de,D:serde::Deserializer<'de>>(deserializer:D)->Result<Value,D::Error>{Value::deserialize(deserializer)}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Node {
    id: u32,
    r#type: String,
    x: f64,
    y: f64,
    params: Map<String, Value>,
    #[serde(default)]
    style: Map<String, Value>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Edge {
    from: u32,
    outlet: u32,
    to: u32,
    inlet: u32,
    #[serde(default, rename = "midpoints", deserialize_with = "present_midpoints")]
    _midpoints: Option<Vec<f64>>,
}

// Geometry is validated at the authoring boundary and never enters NativeEdge.
fn present_midpoints<'de, D>(deserializer: D) -> Result<Option<Vec<f64>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let points = Vec::<f64>::deserialize(deserializer)?;
    if points.len() > 256 || points.len() % 2 != 0
        || points.iter().any(|value| !value.is_finite() || !(0.0..=4000.0).contains(value))
    {
        return Err(serde::de::Error::custom("Cable midpoints require at most 128 pairs of finite coordinates from 0 to 4000"));
    }
    Ok(Some(points))
}
#[derive(Clone, Debug)]
pub struct Prepared {
    pub native: NativeGraph,
}
impl Prepared {
    pub fn parameter_hot(&self,id:u32,key:&str)->bool{key=="value"&&self.native.nodes[..self.native.node_count as usize].iter().any(|n|n.id==id&&matches!(n.kind,2|3|15..=18|52))}
    pub fn parameter_value(&self, id:u32, key:&str)->Result<f64,String>{
        let node=self.native.nodes[..self.native.node_count as usize].iter().find(|n|n.id==id).ok_or("Unknown canvas node")?;
        let spec=parameters(node.kind).iter().find(|s|s.key==key&&s.live).ok_or("Unknown or structural canvas parameter")?;
        Ok([node.p0,node.p1,node.p2,node.p3,node.p4,node.p5][spec.slot as usize])
    }
}

/// Count the serialized input without allocating another unbounded JSON string.
struct SizeLimit {
    bytes: usize,
    max: usize,
    error: &'static str,
}
impl Write for SizeLimit {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        if bytes.len() > self.max.saturating_sub(self.bytes) {
            return Err(io::Error::other(self.error));
        }
        self.bytes += bytes.len();
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}
fn validate_json_size(patch: &Value, max: usize, error: &'static str) -> Result<(), String> {
    serde_json::to_writer(SizeLimit { bytes: 0, max, error }, patch)
        .map_err(|e| format!("Invalid canvas input: {e}"))
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Port {
    Control,
    Mono,
    Stereo,
    Mixed,
    Voice4,
}
impl Port {
    fn domains(self) -> u8 {
        match self {
            Self::Control => 1,
            Self::Mono => 2,
            Self::Stereo => 4,
            Self::Mixed => 3,
            Self::Voice4 => 8,
        }
    }
}
fn inlet(node: &NativeNode, port: u32) -> Option<Port> {
    let count = argument_count(node);
    match node.kind {
        0..=1 | 3 if port == 0 => Some(Port::Control),
        2 | 4..=8 | 53..=58 if port <= 1 => Some(Port::Control),
        9 | 11 if port <= 2 => Some(Port::Control),
        12 if port == 0 => Some(Port::Mono),
        12 if port == 1 => Some(Port::Control),
        13 if port <= 1 => Some(Port::Mono),
        14 if port == 0 => Some(Port::Stereo),
        15..=16 if port <= 1 => Some(Port::Control),
        17..=18 | 20 | 23 | 25..=26 | 28..=30 | 52 | 59 if port == 0 => Some(Port::Control),
        27 if port == 0 && node.text[0] == 0 => Some(Port::Control),
        19 if port < count => Some(Port::Control),
        21 if port < if count == 1 { 2 } else { 1 } => Some(Port::Control),
        22 if port <= count => Some(Port::Control),
        24 if port <= 2 => Some(Port::Control),
        31..=37 if port <= 1 => Some(Port::Control),
        38 if port == 0 => Some(Port::Mixed),
        39..=44 if port <= 1 => Some(Port::Mixed),
        45 if port == 0 => Some(Port::Control),
        46 if port <= 2 => Some(Port::Mixed),
        47 if port <= 1 => Some(Port::Control),
        48 if port == 0 => Some(Port::Mixed),
        48 if port == 1 => Some(Port::Control),
        49 if port < count => Some(Port::Mono),
        50..=51 if port == 0 => Some(Port::Mixed),
        60 if port <= 1 => Some(Port::Control),
        61..=63 | 65 if port == 0 => Some(Port::Voice4),
        62 if port <= 2 => Some(Port::Control),
        63 if port <= 4 => Some(Port::Control),
        64 if port <= 1 => Some(Port::Voice4),
        67 if port <= 1 => Some(Port::Mono),
        67 if port <= 3 => Some(Port::Control),
        _ => None,
    }
}
fn outlet(node: &NativeNode, port: u32) -> Option<Port> {
    let count = argument_count(node);
    match node.kind {
        0..=10 | 15..=16 | 18..=19 | 27..=30 | 53..=59 if port == 0 => Some(Port::Control),
        11..=12 if port == 0 => Some(Port::Mono),
        13 if port == 0 => Some(Port::Stereo),
        17 | 24 | 52 if port <= 1 => Some(Port::Control),
        20 | 23 if port < count => Some(Port::Control),
        21..=22 if port <= count => Some(Port::Control),
        31..=37 if port <= 1 => Some(Port::Control),
        38 if port < count => Some(Port::Mono),
        39..=47 if port == 0 => Some(Port::Mono),
        47 if port == 1 => Some(Port::Control),
        48 if port == 0 => Some(Port::Control),
        50..=51 if port == 0 => Some(Port::Mixed),
        60 if port <= 2 => Some(Port::Voice4),
        61..=64 if port == 0 => Some(Port::Voice4),
        65 if port == 0 => Some(Port::Mono),
        66..=67 if port <= 1 => Some(Port::Mono),
        _ => None,
    }
}
fn default_arguments(kind:u32)->&'static str{
    match kind{19..=20=>"0 0",21..=22|38=>"0",29..=32=>"",49=>"1 2",_=>"i i"}
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
        "pack", "unpack", "select", "route", "trigger", "line", "print", "send", "receive",
        "iter", "prepend", "append", "zl_reg", "zl_join", "zl_len", "zl_iter", "zl_slice", "zl_rev", "zl_rot",
        "sig", "signal_add", "signal_subtract", "signal_multiply", "signal_divide", "cycle", "phasor", "noise", "signal_clip", "line_signal", "snapshot", "signal_dac",
        "inlet", "outlet", "number_int", "message_box",
        "subtract", "divide", "modulo", "reverse_subtract", "reverse_divide", "abs",
        "poly_note", "saw_voice", "filter_voice", "adsr_voice", "multiply_voice", "mix_voice",
        "audio_in", "filter_stereo",
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
        25 => &[p!("level", 0, 0., 0., 3., true, true), p!("popup", 1, 0., 0., 1., true, true)],
        2 => &[p!("value", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true)],
        52 => &[
            p!("value", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, true, true),
            p!("minimum", 1, -NUMBER_LIMIT, -NUMBER_LIMIT, NUMBER_LIMIT, true, true),
            p!("maximum", 2, NUMBER_LIMIT, -NUMBER_LIMIT, NUMBER_LIMIT, true, true),
        ],
        3 => &[p!("value", 0, 0., 0., 1., true, true)],
        4 => &[p!("rhs", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true), p!("numericmode", 1, 0., 0., 2., true, false)],
        5 => &[p!("rhs", 0, 1., -NUMBER_LIMIT, NUMBER_LIMIT, false, true), p!("numericmode", 1, 0., 0., 2., true, false)],
        54 | 57 => &[p!("rhs", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true), p!("numericmode", 1, 1., 1., 2., true, false)],
        55..=56 | 58 => &[p!("rhs", 0, 1., -NUMBER_LIMIT, NUMBER_LIMIT, false, true), p!("numericmode", 1, 1., 1., 2., true, false)],
        59 => &[p!("numericmode", 1, 1., 1., 2., true, false)],
        60 => &[p!("voices", 0, 4., 1., 4., true, false)],
        62 | 67 => &[
            p!("cutoff", 0, 2400., 20., 20000., false, true),
            p!("resonance", 1, 0.7, 0.1, 20., false, true),
        ],
        63 => &[
            p!("attack", 0, 10., 1., 10000., false, true),
            p!("decay", 1, 150., 1., 10000., false, true),
            p!("sustain", 2, 0.65, 0., 1., false, true),
            p!("release", 3, 300., 1., 10000., false, true),
        ],
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
        34..=35 => &[p!("size", 0, 0., 0., NUMBER_LIMIT, true, true)],
        37 => &[p!("rotation", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, true, true)],
        39..=42 => &[p!("rhs", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true)],
        43..=44 => &[
            p!("frequency", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true),
            p!("phase", 1, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true),
        ],
        46 => &[
            p!("minimum", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true),
            p!("maximum", 1, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true),
        ],
        47 => &[
            p!("value", 0, 0., -NUMBER_LIMIT, NUMBER_LIMIT, false, true),
            p!("time", 1, 0., 0., NUMBER_LIMIT, false, true),
        ],
        48 => &[
            p!("interval", 0, 0., 0., NUMBER_LIMIT, false, true),
            p!("offset", 1, 0., 0., 63., true, true),
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
    validate_text_config(text, false)
}
fn validate_text_config(text: &str, allow_empty: bool) -> Result<(), String> {
    if text.len() > 127
        || (!allow_empty && text.trim().is_empty())
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
fn arguments_config(text: &str, allow_empty: bool) -> Result<NativeMessage, String> {
    validate_text_config(text, allow_empty)?;
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
pub fn message_template(text: &str) -> Result<(NativeMessage,[u32;8]),String> {
    if text.len()>127 || !text.is_ascii() { return Err("Message text requires at most 127 ASCII bytes".into()); }
    let words:Vec<_>=text.split_ascii_whitespace().collect();
    if words.is_empty() { validate_text_config(text,true)?;return Ok((NativeMessage::default(),[0;8])); }
    if words[0].starts_with('$') { return Err("Message placeholders require a fixed literal head".into()); }
    let mut clean=Vec::new();let mut references=Vec::new();
    for (index,word) in words.iter().enumerate() {
        let reference=match *word { "$1"=>1,"$2"=>2,_=>0 };
        if reference!=0 && (index==0 || matches!(words[0],"symbol"|"bang")) { return Err("Unsupported message placeholder position".into()); }
        clean.push(if reference!=0 { "0" } else { word });references.push(reference);
    }
    let prototype=literal(&clean.join(" "))?;
    // Validate discarded whitespace as well as tokens without admitting dollar syntax globally.
    let validation=text.replace("$1","0").replace("$2","0");validate_text_config(&validation,true)?;
    let selector=usize::from(prototype.selector[0]!=0);let mut placeholders=[0;8];
    for (index,reference) in references.into_iter().enumerate() { if reference!=0 { placeholders[index-selector]=reference; } }
    Ok((prototype,placeholders))
}
fn message_replacement_literal(text: &str) -> Result<NativeMessage,String> {
    let (mut result,references)=message_template(text)?;
    for (index,reference) in references.iter().enumerate() { if *reference!=0 { result.tags[index]=2;result.symbols[index]=[0;32];result.symbols[index][0]=b'$';result.symbols[index][1]=b'0'+*reference as u8; } }
    Ok(result)
}
fn validate_number(value: f64) -> Result<(), String> {
    if !value.is_finite() || value.abs() > NUMBER_LIMIT {
        return Err("Control values must be finite numbers in -100000..100000".into());
    }
    Ok(())
}
fn validate_relationships(node: &NativeNode) -> Result<(), String> {
    if matches!(node.kind, 4..=5 | 54..=58) && node.p1 == 1. && node.p0.fract() != 0. {
        return Err("Integer arithmetic requires an integer rhs".into());
    }
    if matches!(node.kind, 17 | 52) && node.p1 > node.p2 {
        return Err("Numeric UI minimum must not exceed maximum".into());
    }
    Ok(())
}

fn validate_style(kind: u32, name: &str, style: &Map<String, Value>) -> Result<(), String> {
    let bounded = |value: &Value, lo: f64, hi: f64, integer: bool| {
        value.as_f64().is_some_and(|number| {
            number.is_finite() && (lo..=hi).contains(&number) && (!integer || number.fract() == 0.)
        })
    };
    for (key, value) in style {
        let valid = match key.as_str() {
            "width" => bounded(value, 12., 1200., false),
            "height" => bounded(value, 12., 800., false),
            "fontsize" => bounded(value, 8., 48., false),
            "bubble" if name == "comment" => bounded(value, 0., 1., true),
            "bubbleside" if name == "comment" => bounded(value, 0., 3., true),
            "bubblepoint" if name == "comment" => bounded(value, 0., 1., false),
            "triangle" if matches!(kind, 2 | 17 | 52) => bounded(value, 0., 1., true),
            "orientation" if matches!(kind, 12 | 18) => bounded(value, 0., 2., true),
            _ => {
                let is_color = match key.as_str() {
                    "bgcolor" | "textcolor" | "color" => true,
                    "blinkcolor" | "outlinecolor" => kind == 0,
                    "checkedcolor" | "uncheckedcolor" => kind == 3,
                    "bordercolor" => matches!(kind, 2 | 3 | 12 | 17 | 18 | 52),
                    "tricolor" => matches!(kind, 2 | 17 | 52),
                    "knobcolor" => matches!(kind, 12 | 18),
                    "elementcolor" => kind == 18,
                    _ => false,
                };
                if !is_color {
                    return Err(format!("Unknown {name} style attribute: {key}"));
                }
                value.as_array().is_some_and(|rgba| {
                    rgba.len() == 4
                        && rgba
                            .iter()
                            .all(|component| bounded(component, 0., 1., false))
                })
            }
        };
        if !valid {
            return Err(format!("Invalid {name} style value for {key}"));
        }
    }
    Ok(())
}

pub fn prepare(patch: Value) -> Result<Prepared, String> {
    if patch["version"]==2 {validate_json_size(&patch,1024*1024,"Hierarchy patch exceeds 1 MiB JSON")?;}
    else {validate_json_size(&patch,MAX_JSON_BYTES,"Canvas patch exceeds 64 KiB JSON")?;}
    presentation::validate(&patch)?;
    if patch.get("device").is_some() && patch["presentation"].is_null(){return Err("Reusable devices require a root presentation".into());}
    if patch.get("version").and_then(Value::as_u64) == Some(2) {
        return hierarchy::prepare(patch);
    }
    validate_json_size(&patch, MAX_JSON_BYTES, "Canvas patch exceeds 64 KiB JSON")?;
    let doc: Document =
        serde_json::from_value(patch).map_err(|e| format!("Invalid canvas schema: {e}"))?;
    if doc.version != 1 || doc.profile != "ultra-canvas-v1" {
        return Err("Expected version 1 and profile ultra-canvas-v1".into());
    }
    prepare_flat(doc, false)
}

pub fn help_shell_object(patch:&Value)->Result<Option<String>,String>{
    prepare(patch.clone())?;
    Ok(patch.get("helpShell").and_then(|shell|shell.get("object")).and_then(Value::as_str).map(str::to_owned))
}

fn validate_position(x: f64, y: f64) -> Result<(), String> {
    if !x.is_finite() || !y.is_finite() || !(0. ..=4000.).contains(&x) || !(0. ..=4000.).contains(&y) {
        return Err("Node positions must be finite and within 0..4000".into());
    }
    Ok(())
}

fn prepare_flat(doc: Document, allow_relays: bool) -> Result<Prepared, String> {
    if doc.nodes.len() > MAX_NODES || doc.edges.len() > MAX_EDGES {
        if allow_relays {
            return Err("Compiled canvas supports at most 32 executable nodes including boundary relays and 64 edges".into());
        }
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
        validate_position(node.x, node.y)?;
        let kind =
            kind(&node.r#type).ok_or_else(|| format!("Unknown canvas object: {}", node.r#type))?;
        if matches!(kind, 50 | 51) && !allow_relays {
            return Err("Boundary connectors require version 2 and profile ultra-patcher-v2".into());
        }
        // Display overrides are validated document data and never reach the native graph.
        validate_style(kind, &node.r#type, &node.style)?;
        let mut native = NativeNode {
            id: node.id,
            kind,
            ..NativeNode::default()
        };
        if kind == 1 || kind == 53 {
            if node.params.keys().any(|key| key != "text") {
                return Err("Unknown message parameter".into());
            }
            let text = match node.params.get("text") {
                Some(value) => value.as_str().ok_or("Message text must be a string")?,
                None => if kind == 53 { "" } else { "60 100" },
            };
            if kind == 53 { message_template(text)?; } else { literal(text)?; }
            native.text[..text.len()].copy_from_slice(text.as_bytes());
        } else if matches!(kind, 26..=27) {
            if node.params.keys().any(|key| key != "name") {
                return Err(format!("Unknown parameter for {}", node.r#type));
            }
            let name = match node.params.get("name") {
                Some(value) => value.as_str().ok_or("Send/receive name must be a string")?,
                None => if kind == 26 { "channel" } else { "" },
            };
            if name.is_empty() && kind == 26 || name.len() > 31 || name.bytes().any(|b| !(33..=126).contains(&b) || b",;$'\"\\".contains(&b)) {
                return Err("Send/receive name must be one ASCII token of 1 to 31 bytes; only receive may be unnamed".into());
            }
            native.text[..name.len()].copy_from_slice(name.as_bytes());
        } else if (19..=23).contains(&kind) || (29..=32).contains(&kind) || matches!(kind, 38 | 49) {
            let key = if kind == 49 { "channels" } else { "args" };
            if node.params.keys().any(|candidate| candidate != key) {
                return Err(format!("Unknown parameter for {}", node.r#type));
            }
            let text = match node.params.get(key) {
                Some(value) => value.as_str().ok_or("Creation args must be a string")?,
                None => default_arguments(kind),
            };
            let arguments = arguments_config(text, (29..=32).contains(&kind))?;
            if matches!(kind, 38 | 49) {
                for index in 0..arguments.count as usize {
                    if arguments.tags[index] == 2 {
                        return Err("Signal values and output channels must be numeric".into());
                    }
                    if kind == 49 && (!(1. ..=2.).contains(&arguments.values[index])
                        || arguments.values[index].fract() != 0.) {
                        return Err("This audio host exposes only physical channels 1 and 2".into());
                    }
                }
            }
            native.text[..text.len()].copy_from_slice(text.as_bytes());
        } else {
            if kind == 25 {
                let label = node.params.get("label").map_or(Ok("print"), |v|v.as_str().ok_or("Print label must be a string"))?;
                if label.is_empty() || label.len() > 31 || label.bytes().any(|b| !(33..=126).contains(&b) || b",;$'\"\\".contains(&b)) {
                    return Err("Print label must be one ASCII token of 1 to 31 bytes".into());
                }
                native.text[..label.len()].copy_from_slice(label.as_bytes());
            }
            let specs = parameters(kind);
            if node
                .params
                .keys()
                .any(|key| !(kind == 25 && key == "label") && !specs.iter().any(|spec| spec.key == key))
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
        if matches!(kind, 13 | 14 | 60) && !singletons.insert(kind) {
            return Err("Only one join, one dac and one poly.note~ allocator are supported".into());
        }
        graph.nodes[index] = native;
    }
    let mut cords = HashSet::new();
    let mut edge_domains = Vec::with_capacity(doc.edges.len());
    for (index, edge) in doc.edges.iter().enumerate() {
        let from = *ids.get(&edge.from).ok_or("Unknown edge source")?;
        let to = *ids.get(&edge.to).ok_or("Unknown edge destination")?;
        let a = graph.nodes[from];
        let b = graph.nodes[to];
        let out = outlet(&a, edge.outlet).ok_or("Invalid outlet")?;
        let input = inlet(&b, edge.inlet).ok_or("Invalid inlet")?;
        let domains = out.domains() & input.domains();
        if domains == 0 {
            return Err("Control, mono, stereo and discrete four-voice ports require matching types".into());
        }
        if !cords.insert((edge.from, edge.outlet, edge.to, edge.inlet)) {
            return Err("Duplicate canvas edge".into());
        }
        edge_domains.push((from, to, domains, out));
        graph.edges[index] = NativeEdge {
            from: edge.from,
            outlet: edge.outlet,
            to: edge.to,
            inlet: edge.inlet,
        };
    }
    // Relays become signal-active only when fed by a real mono output. An
    // undriven boundary must leave downstream scalar signal fallbacks intact.
    let mut active_mono = vec![false; doc.nodes.len()];
    loop {
        let mut changed = false;
        for &(from, to, domains, out) in &edge_domains {
            if domains & 2 != 0 && matches!(graph.nodes[to].kind, 50..=51)
                && !active_mono[to] && (out == Port::Mono || active_mono[from])
            {
                active_mono[to] = true;
                changed = true;
            }
        }
        if !changed { break; }
    }
    let mut controls = vec![Vec::new(); doc.nodes.len()];
    let mut signals = vec![Vec::new(); doc.nodes.len()];
    for (from, to, domains, out) in edge_domains {
        if domains & 1 != 0 { controls[from].push(to); }
        if domains & (4 | 8) != 0 || domains & 2 != 0 && (out == Port::Mono || active_mono[from]) {
            signals[from].push(to);
        }
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
    marks.fill(0);
    for node in 0..doc.nodes.len() {
        if !visit(node, &signals, &mut marks) {
            return Err("Signal cycles require a delay object and are not supported".into());
        }
    }
    device::validate(doc.device.as_ref(), &graph)?;
    Ok(Prepared { native: graph })
}

#[derive(Clone, Default)]
pub struct CanvasState {
    graph: Option<Prepared>,
    revision: u64,
    message_text_serial: u64,
}
impl CanvasState {
    pub fn revision(&self) -> u64 { self.revision }
    pub fn message_text_serial(&self) -> u64 { self.message_text_serial }

    pub fn live_changes_only(old:&Prepared,next:&Prepared)->bool{
        let mut current=Self{graph:Some(old.clone()),revision:1,..Self::default()};
        for node in &next.native.nodes[..next.native.node_count as usize]{for spec in parameters(node.kind).iter().filter(|s|s.live){
            let value=[node.p0,node.p1,node.p2,node.p3,node.p4,node.p5][spec.slot as usize];
            if current.parameter(1,node.id,spec.key,value,|_,_|true).is_err(){return false;}
        }}current.matches(next)
    }

    // Native preview is transient; canonical comparison still reflects the authored graph.
    pub fn preview_parameter(&self,revision:u64,node:u32,key:&str,value:f64,send:impl FnOnce(u32,f64)->bool)->Result<(),String>{
        self.clone().parameter(revision,node,key,value,send)
    }

    pub fn matches(&self, plan: &Prepared) -> bool {
        self.graph.as_ref().is_some_and(|current| {
            let a = &current.native; let b = &plan.native;
            a.node_count == b.node_count && a.edge_count == b.edge_count && a.nodes == b.nodes && a.edges == b.edges
        })
    }

    pub fn parameter_matches(&self, plan: &Prepared, node: u32, key: &str, value: f64) -> Result<bool, String> {
        let mut next = self.clone();
        next.parameter(self.revision, node, key, value, |_, _| true)?;
        Ok(next.matches(plan))
    }

    pub fn single_parameter_change(&self, plan: &Prepared) -> Option<(u32, &'static str, f64, bool)> {
        if self.matches(plan) { return None; }
        for node in &plan.native.nodes[..plan.native.node_count as usize] {
            let values = [node.p0, node.p1, node.p2, node.p3, node.p4, node.p5];
            for parameter in parameters(node.kind).iter().filter(|parameter| parameter.live) {
                let value = values[parameter.slot as usize];
                if self.parameter_matches(plan, node.id, parameter.key, value).unwrap_or(false) {
                    let hot = parameter.key == "value" && matches!(node.kind, 2 | 3 | 15..=18 | 52);
                    return Some((node.id, parameter.key, value, hot));
                }
            }
        }
        None
    }
    pub fn message_text_matches(&self, plan: &Prepared, node: u32, text: &str) -> Result<bool,String> {
        let mut next=self.clone();next.message_text(self.revision,node,text,|_|true)?;Ok(next.matches(plan))
    }
    pub fn single_message_text_change(&self, plan: &Prepared) -> Option<(u32,String)> {
        if self.matches(plan) { return None; }
        for node in &plan.native.nodes[..plan.native.node_count as usize] {
            if node.kind!=53 { continue; }
            let end=node.text.iter().position(|&byte| byte==0)?;let text=std::str::from_utf8(&node.text[..end]).ok()?;
            if self.message_text_matches(plan,node.id,text).unwrap_or(false) { return Some((node.id,text.into())); }
        }
        None
    }
    pub fn message_text(&mut self, revision: u64, node: u32, text: &str, send: impl FnOnce(u64)->bool) -> Result<u64,String> {
        let index=self.node_index(revision,node)?;
        if self.graph.as_ref().unwrap().native.nodes[index].kind!=53 { return Err("Text actions require message_box".into()); }
        message_template(text)?;
        let serial=self.message_text_serial.checked_add(1).filter(|&serial| serial<=9_007_199_254_740_991).ok_or("Message text serial exhausted")?;
        if !send(serial) { return Err("Native message text was not admitted".into()); }
        let native=&mut self.graph.as_mut().unwrap().native.nodes[index];native.text=[0;128];native.text[..text.len()].copy_from_slice(text.as_bytes());
        self.message_text_serial=serial;Ok(serial)
    }
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
        self.message_text_serial = 0;
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
        if !matches!(inlet(&self.graph.as_ref().unwrap().native.nodes[index], port), Some(Port::Control | Port::Mixed)) {
            return Err("Events require a valid control inlet".into());
        }
        let mut event = NativeMessage::default();
        if value.is_null() {
            return Ok(event);
        }
        if let Some(text) = value.as_str() {
            if self.graph.as_ref().unwrap().native.nodes[index].kind == 53 && (port == 1 || text.split_ascii_whitespace().next() == Some("set")) {
                return message_replacement_literal(text);
            }
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
    pub fn ui_action(&self, revision: u64, node: u32, port: u32, value: &Value, action: &str) -> Result<(), String> {
        if action != "tab" || port != 0 || !value.is_null() {
            return Err("Tab actions require action tab, inlet 0 and null value".into());
        }
        let index = self.node_index(revision, node)?;
        if !matches!(self.graph.as_ref().unwrap().native.nodes[index].kind, 17 | 52) {
            return Err("Tab actions require a flonum or number_int object".into());
        }
        Ok(())
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
