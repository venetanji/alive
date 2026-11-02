//! Pure, bounded source-state validation for saved live.device~ objects.
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
include!("canvas_live_device_facts.rs");

pub(crate) const PARAMETER_COUNT: usize = 203;
pub(crate) const PROFILE: &str = "live12-analog-v1";
const DLL_SHA256: &str = "4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133";
const GUI_SHA256: &str = "5ec872d673fd5f4f5f05787e4245c56e172ff2663c2d4493e94d598b883114e6";
const GRAPHICS_SHA256: &str = "a0b8aa480aa3d21f093b416ea59b3f200d2e2466936f95d886a554bffe875cb7";
const RESOURCE_PAIRS: [(&str, &str); 2] = [
    (GUI_SHA256, GRAPHICS_SHA256),
    ("75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f", "ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d"),
];

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct SourceState {
    pub version: u32,
    pub profile: String,
    dll_sha256: String,
    gui_sha256: String,
    graphics_sha256: String,
    pub values: Vec<f32>,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct Source { pub node: u32, pub state: SourceState }

impl Source {
    pub fn parse(node: u32, params: &Map<String, Value>) -> Result<Self, String> {
        if node > 100_000 { return Err("live.device~ node ID must be at most 100000".into()); }
        if params.len() != 2 || params.get("device").and_then(Value::as_str) != Some("Analog") {
            return Err("live.device~ requires device Analog and complete qualified source state".into());
        }
        let raw_state = params.get("state").ok_or("live.device~ requires complete source state")?;
        let raw_values = raw_state.get("values").and_then(Value::as_array)
            .filter(|values| values.len() == PARAMETER_COUNT)
            .ok_or("Analog source state requires exactly 203 finite native parameter values")?;
        // Validate JSON precision first: f32 narrowing can hide an invalid enum or bound.
        for (index, (raw, &(_, _, kind, min, max))) in raw_values.iter().zip(&ANALOG_DESCRIPTORS).enumerate() {
            let value = raw.as_f64().filter(|value| value.is_finite())
                .ok_or_else(|| format!("Invalid Analog native value at index {index}"))?;
            if value < min || value > max || (kind == 3 && value.fract() != 0.) {
                return Err(format!("Invalid Analog native value at index {index}"));
            }
        }
        let state: SourceState = serde_json::from_value(raw_state.clone())
            .map_err(|e| format!("Invalid live.device~ source state: {e}"))?;
        if state.version != 1 || state.profile != PROFILE || state.dll_sha256 != DLL_SHA256
            || !RESOURCE_PAIRS.iter().any(|&(gui, graphics)| state.gui_sha256 == gui && state.graphics_sha256 == graphics) {
            return Err("Unsupported live.device~ source identity or profile revision".into());
        }
        Ok(Self { node, state })
    }

    pub fn same_identity(&self, other: &Self) -> bool {
        self.node == other.node && self.state.version == other.state.version
            && self.state.profile == other.state.profile && self.state.dll_sha256 == other.state.dll_sha256
            && self.state.gui_sha256 == other.state.gui_sha256 && self.state.graphics_sha256 == other.state.graphics_sha256
    }
}
