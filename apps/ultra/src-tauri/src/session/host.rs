//! Own prepared devices independently of any editor window.
use super::*;
use serde::Serialize;
use std::path::Path;

#[derive(Default)]
pub struct Host {
    pub prepared: Option<PreparedSession>,
    revisions: [u64; 16],
    owned_roots: [bool; 16],
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct View<'a> {
    pub document: &'a Session,
    pub path: &'a Path,
    pub devices: Vec<&'a crate::canvas::device::HostManifest>,
}
impl Host {
    pub fn view(&self) -> Result<View<'_>, String> {
        let p = self.prepared.as_ref().ok_or("Create or open an Alive session")?;
        Ok(View { document: &p.document, path: &p.origin, devices: p.tracks.iter().map(|t| &p.devices[t.instrument].manifest).collect() })
    }
    fn configuration(&self, prepared: &PreparedSession) -> (Box<native::ConfigV2>, Vec<crate::canvas::NativeGraph>) {
        let mut config = Box::<native::ConfigV2>::default();
        config.track_count = prepared.tracks.len() as u32;
        config.device_count = prepared.devices.len() as u32;
        config.event_count = prepared.events.len() as u32;
        config.loop_enabled = prepared.document.loop_enabled as u32;
        config.length_frames = prepared.length_frames;
        config.loop_end = prepared.length_frames;
        let mut graphs = Vec::with_capacity(prepared.devices.len());
        for (index, device) in prepared.devices.iter().enumerate() {
            let model = &prepared.document.tracks[device.track];
            let reference = model.devices().find(|d| d.instance_id == device.instance_id).unwrap();
            let mut graph = device.graph.clone();
            graph.revision = self.revisions[index] + 1;
            let output = &device.manifest.output;
            let input = device.manifest.input.as_ref();
            let mut native = native::DeviceV2 { document: index as u32, kind: if device.manifest.kind == crate::canvas::device::DeviceKind::Instrument { 1 } else { 2 },
                note_node: device.manifest.note_node.unwrap_or(0), input_node: input.map_or(0, |i| i.node),
                input_channels: input.map_or(0, |i| i.bundle.channels), input_layout: input.map_or(0, |i| layout(&i.bundle.layout)),
                output_channels: output.channels, output_layout: layout(&output.layout),
                parameter_count: device.manifest.parameters.len() as u32, revision: graph.revision, bypassed: reference.bypassed as u32, ..Default::default() };
            for (slot, parameter) in device.manifest.parameters.iter().enumerate() {
                native.parameters[slot] = native::Parameter { node: parameter.node, param: parameter.slot,
                    automated: model.automation.iter().any(|lane| lane.instance_id == device.instance_id && lane.key == parameter.key && lane.enabled) as u32,
                    base: parameter.base, minimum: parameter.min, maximum: parameter.max, reserved: 0 };
            }
            config.devices[index] = native;
            graphs.push(graph);
        }
        for (index, track) in prepared.tracks.iter().enumerate() {
            let model = &prepared.document.tracks[index];
            let mut native = native::TrackV2 { instrument: track.instrument as u32, effect_count: track.effects.len() as u32,
                gain: model.gain, mute: model.mute as u32, solo: model.solo as u32, ..Default::default() };
            for (slot, &device) in track.effects.iter().enumerate() { native.effects[slot] = device as u32; }
            config.tracks[index] = native;
        }
        for (index, event) in prepared.events.iter().enumerate() {
            config.events[index] = native::EventV2 { frame: event.frame, track: event.track, kind: event.kind,
                device: event.device, target: event.target, value: event.value };
        }
        (config, graphs)
    }
    /// Prospective admission leaves the current playback and document untouched.
    pub fn validate(&self, prepared: &PreparedSession) -> Result<(), String> {
        let (config, graphs) = self.configuration(prepared);
        for (index, graph) in graphs.iter().enumerate() {
            if unsafe { native::alive_session_validate_device_v2(&config.devices[index], graph) } == 0 {
                let device = &prepared.devices[index];
                let track = &prepared.document.tracks[device.track];
                return Err(format!("Track '{}' instance '{}' ({}): {}. Use Replace to recover", track.name, device.instance_id, device.path.display(), native::error()));
            }
        }
        if unsafe { native::alive_session_validate_prepared_v2(&*config, graphs.as_ptr(), graphs.len() as u32) } == 0 {
            return Err(native::error());
        }
        Ok(())
    }
    /// Caller must drop/stop its CPAL stream first. Musical Stop alone is insufficient.
    pub fn install(&mut self, prepared: PreparedSession) -> Result<(), String> {
        self.validate(&prepared)?;
        unsafe { native::ultra_audio_stop(); }
        if let Err(error) = self.apply(&prepared) {
            if let Some(previous) = self.prepared.clone() {
                if let Err(rollback) = self.apply(&previous) {
                    return Err(format!("Session apply failed: {error}; prior session remains saved in memory but audio restoration failed: {rollback}"));
                }
            }
            return Err(format!("Session apply failed; prior session retained: {error}"));
        }
        self.prepared = Some(prepared);
        Ok(())
    }
    fn apply(&mut self, prepared: &PreparedSession) -> Result<(), String> {
        let (config, graphs) = self.configuration(prepared);
        unsafe {
            if native::alive_session_reset() == 0 { return Err("Stop device I/O before applying a session".into()); }
            for slot in 0..16 {
                if self.owned_roots[slot] {
                    if crate::ultra_canvas_close_document(slot as u32) == 0 { return Err(format!("Native root {slot} could not be closed")); }
                    self.owned_roots[slot] = false;
                }
            }
            for (slot, graph) in graphs.iter().enumerate() {
                self.revisions[slot] = graph.revision;
                if crate::ultra_canvas_install_document(slot as u32, graph) == 0 { return Err(format!("Native device {} installation failed", slot + 1)); }
                self.owned_roots[slot] = true;
            }
            if native::alive_session_configure_v2(&*config) == 0 { return Err(native::error()); }
        }
        Ok(())
    }
    pub fn base(&mut self, instance_id: &str, key: &str, value: f64) -> Result<(), String> {
        let prepared = self.prepared.as_mut().ok_or("No session")?;
        let index = prepared.devices.iter().position(|d| d.instance_id == instance_id).ok_or("Unknown instance")?;
        let device = &mut prepared.devices[index];
        let slot = device.manifest.parameters.iter().position(|p| p.key == key).ok_or("Unknown device parameter")?;
        let parameter = &mut device.manifest.parameters[slot];
        prepare::binding_value(parameter, value)?;
        if unsafe { native::alive_session_base_v2(index as u32, self.revisions[index], slot as u32, value) } == 0 { return Err(native::error()); }
        parameter.base = value;
        prepared.document.tracks[device.track].devices_mut().find(|d| d.instance_id == instance_id).unwrap().parameters.insert(key.into(), value);
        prepare::edit_parameter(&mut device.patch, parameter.node, &parameter.param, value);
        // Keep the prepared snapshot ready for rollback without recompiling on a knob edit.
        let node = device.graph.nodes.iter_mut().find(|node| node.id == parameter.node).unwrap();
        match parameter.slot { 0 => node.p0 = value, 1 => node.p1 = value, 2 => node.p2 = value,
            3 => node.p3 = value, 4 => node.p4 = value, 5 => node.p5 = value, _ => unreachable!() }
        Ok(())
    }
    pub fn bypass(&mut self, instance_id: &str, bypassed: bool) -> Result<(), String> {
        let prepared = self.prepared.as_mut().ok_or("No session")?;
        let index = prepared.devices.iter().position(|d| d.instance_id == instance_id).ok_or("Unknown instance")?;
        if prepared.devices[index].manifest.kind != crate::canvas::device::DeviceKind::AudioEffect { return Err("Only effects can be bypassed".into()); }
        if unsafe { native::alive_session_bypass_v2(index as u32, self.revisions[index], bypassed as u32) } == 0 { return Err(native::error()); }
        prepared.document.tracks[prepared.devices[index].track].devices_mut().find(|d| d.instance_id == instance_id).unwrap().bypassed = bypassed;
        Ok(())
    }
    pub fn mixer(&mut self, track: usize, gain: f64, mute: bool, solo: bool) -> Result<(), String> {
        if !gain.is_finite() || !(0. ..=2.).contains(&gain) { return Err("Track gain must be 0..2".into()); }
        let model = self.prepared.as_mut().and_then(|p| p.document.tracks.get_mut(track)).ok_or("Unknown track")?;
        if unsafe { native::alive_session_mixer(track as u32, gain, mute as u32, solo as u32) } == 0 { return Err(native::error()); }
        model.gain = gain; model.mute = mute; model.solo = solo;
        Ok(())
    }
}

fn layout(value: &str) -> u32 { match value { "stereo" => 2, "mono" => 1, _ => 0 } }
