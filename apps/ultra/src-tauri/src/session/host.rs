//! Own prepared devices independently of any editor window.
use super::*;
use serde::Serialize;
use std::path::Path;

#[derive(Default)]
pub struct Host {
    pub prepared: Option<PreparedSession>,
    revisions: [u64; 16],
    owned_roots: [bool; 16],
    pub preparation_revision: u64,
    pub bank_revision: u64,
}
pub(super) struct InstallFailure { pub message:String, pub rollback_serial:Option<u64> }
#[cfg(test)]
thread_local! { static TEST_FAIL_AFTER_RESET:std::cell::Cell<u32> = const { std::cell::Cell::new(0) }; }
#[cfg(test)]
pub(super) fn test_fail_after_reset(count:u32) { TEST_FAIL_AFTER_RESET.with(|remaining|remaining.set(count)); }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct View<'a> {
    pub document: &'a Session,
    pub path: &'a Path,
    pub devices: Vec<&'a crate::canvas::device::HostManifest>,
}
impl Host {
    pub(super) fn workspace_candidate(&self,document:Session,launch:launch::LaunchSettings)->Result<PreparedSession,String>{
        let current=self.prepared.as_ref().ok_or("No session")?;
        let project=&document;
        let mut candidate=current.clone();
        let mut expected=std::collections::HashSet::new();
        for (track_index,track) in project.tracks.iter().enumerate(){for reference in track.devices(){
            let device=candidate.devices.iter_mut().find(|d|d.instance_id==reference.instance_id).ok_or("Load devices using the stopped device controls")?;
            let original=current.saved.score.tracks().into_iter().flat_map(|t|t.devices().collect::<Vec<_>>()).find(|d|d.instance_id==reference.instance_id).ok_or("Prepared device identity changed")?;
            if reference.id!=original.id||reference.version!=original.version||reference.path!=original.path||reference.source_sha256!=original.source_sha256{return Err("Replace devices using the stopped device controls".into())}
            device.track=track_index;expected.insert(reference.instance_id.as_str());
        }}
        if candidate.devices.iter().any(|d|!expected.contains(d.instance_id.as_str())){return Err("Remove device-bearing tracks using the stopped device controls".into())}
        prepare_workspaces::compile(project,&mut candidate)?;
        candidate.saved=current.saved.with_score(document);candidate.saved.launch=launch;
        super::persistence::serialize_saved(&candidate.saved)?;
        Ok(candidate)
    }
    pub(super) fn publication_config(&self,candidate:&PreparedSession)->Result<Box<native::ConfigV4>,String>{
        let (mut config,_)=self.configuration_workspaces(candidate)?;
        config.preparation_revision=self.preparation_revision;
        for (i,device) in config.devices[..config.device_count as usize].iter_mut().enumerate(){device.revision=self.revisions[i];}
        Ok(config)
    }
    pub(super) fn preflight_master(prepared:&PreparedSession)->Result<(),String>{
        prepared.saved.validate_master()?;
        native::master_capability().ok_or("The current native workspace and Master engine is required")?;
        Ok(())
    }
    pub(super) fn configuration_workspaces(&self, prepared:&PreparedSession)->Result<(Box<native::ConfigV4>,Vec<crate::canvas::NativeGraph>),String> {
        let (project,workspace)=(&prepared.saved.score,&prepared.schedule);
        let (common,graphs)=self.configuration_common(prepared)?;
        let mut config=Box::<native::ConfigV4>::default();
        config.profile=native::V4_PROFILE_2X4;config.work_policy=native::V4_WORK_POLICY_1;
        config.preparation_revision=self.preparation_revision.checked_add(1).ok_or("Native preparation revision exhausted")?;
        config.track_count=common.track_count;config.device_count=common.device_count;config.devices=common.devices;
        config.event_count=common.event_count;config.events=common.events;config.loop_enabled=common.loop_enabled;
        config.length_frames=prepared.length_frames;config.tempo_bpm=project.tempo;
        config.loop_start=workspaces::frame_at(project.loop_start_beats,project.tempo)?;config.loop_end=workspaces::frame_at(project.loop_end_beats,project.tempo)?;
        config.source_count=workspace.sources.len() as u32;config.slot_count=workspace.slots.len() as u32;config.placement_count=workspace.placements.len() as u32;
        config.audio_buffer_count=workspace.audio_descriptors().len() as u32;
        for (i,source) in workspace.sources.iter().enumerate(){config.sources[i]=source.descriptor;}
        for (i,slot) in workspace.slots.iter().enumerate(){config.slots[i]=slot.descriptor;}
        for (i,placement) in workspace.placements.iter().enumerate(){config.placements[i]=placement.descriptor;}
        let mut placement_begin=0;
        for (i,track) in prepared.tracks.iter().enumerate(){
            let chain=common.tracks[i];
            let kind=match track.input {prepare::PreparedTrackInput::Midi{..}=>native::V4_MIDI,prepare::PreparedTrackInput::Audio=>native::V4_AUDIO};
            let mut native=native::TrackV4{kind,instrument:track.optional_midi_instrument().map_or(native::V4_NONE,|i|i as u32),effect_count:chain.effect_count,effects:chain.effects,gain:chain.gain,mute:chain.mute,solo:chain.solo,placement_begin,..Default::default()};
            for (index,slot) in workspace.slots.iter().enumerate().filter(|(_,s)|s.descriptor.track==i as u32){native.slots[slot.slot]=index as u32;}
            native.placement_count=workspace.placements.iter().filter(|p|p.descriptor.track==i as u32).count() as u32;
            placement_begin+=native.placement_count;config.tracks[i]=native;
        }
        Ok((config,graphs))
    }
    pub fn view(&self)->Result<View<'_>,String>{
        let p=self.prepared.as_ref().ok_or("Create or open an Alive session")?;
        Ok(View{document:&p.saved.score,path:&p.origin,devices:p.devices.iter().map(|d|&d.manifest).collect()})
    }
    fn configuration_common(&self, prepared: &PreparedSession) -> Result<(Box<native::ConfigV4>, Vec<crate::canvas::NativeGraph>),String> {
        let mut config = Box::<native::ConfigV4>::default();
        config.track_count = prepared.tracks.len() as u32;
        config.device_count = prepared.devices.len() as u32;
        config.event_count = prepared.events.len() as u32;
        config.loop_enabled = prepared.saved.score.loop_enabled() as u32;
        config.length_frames = prepared.length_frames;
        let mut graphs = Vec::with_capacity(prepared.devices.len());
        for (index, device) in prepared.devices.iter().enumerate() {
            let model = &prepared.saved.score.tracks()[device.track];
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
                    automated: prepared.schedule.sources.iter().any(|s|s.descriptor.owned_masks[index]&(1<<slot)!=0) as u32,
                    base: parameter.base, minimum: parameter.min, maximum: parameter.max, reserved: 0 };
            }
            config.devices[index] = native;
            graphs.push(graph);
        }
        for (index, track) in prepared.tracks.iter().enumerate() {
            let model = &prepared.saved.score.tracks()[index];
            let mut native = native::TrackV4 { instrument: track.optional_midi_instrument().map_or(native::V4_NONE,|i|i as u32), effect_count: track.effects.len() as u32,
                gain: model.mixer().0, mute: model.mixer().1 as u32, solo: model.mixer().2 as u32, ..Default::default() };
            for (slot, &device) in track.effects.iter().enumerate() { native.effects[slot] = device as u32; }
            config.tracks[index] = native;
        }
        for (index, event) in prepared.events.iter().enumerate() {
            config.events[index] = native::EventV2 { frame: event.frame, track: event.track, kind: event.kind,
                device: event.device, target: event.target, value: event.value };
        }
        Ok((config, graphs))
    }
    /// Prospective admission leaves the current playback and document untouched.
    pub fn validate(&self, prepared: &PreparedSession) -> Result<(), String> {
        self.admit(prepared).map_err(|e|e.message)
    }
    pub(super) fn admit(&self,prepared:&PreparedSession)->Result<(),AdmissionError> {
        if self.revisions.iter().any(|r|*r==u64::MAX)||self.preparation_revision==u64::MAX{return Err(AdmissionError{code:native::V4_BAD_FIELD,message:"Native revision exhausted".into()});}
        workspace_limits().map_err(|message|AdmissionError{code:native::V4_FEATURE_DISABLED,message})?;
        let (config,graphs)=self.configuration_workspaces(prepared).map_err(|message|AdmissionError{code:native::V4_BAD_FIELD,message})?;
        for (index,graph) in graphs.iter().enumerate() {
            if unsafe{native::alive_session_validate_device_v2(&config.devices[index],graph)}==0 {
                let device=&prepared.devices[index];let track=&prepared.saved.score.tracks[device.track];
                return Err(AdmissionError{code:native::V4_GRAPH_REJECTED,message:format!("Track '{}' instance '{}' ({}): {}",track.name,device.instance_id,device.path.display(),native::error())});
            }
        }
        let audio=prepared.schedule.audio_descriptors();
        if unsafe{native::alive_session_validate_prepared_v4(&*config,graphs.as_ptr(),graphs.len() as u32,audio.as_ptr(),audio.len() as u32)}==0 {
            let mut diagnostic=native::DiagnosticV4::default();unsafe{native::alive_session_diagnostic_v4(&mut diagnostic);}
            return Err(AdmissionError{code:diagnostic.error,message:format!("Workspace playback refused the complete candidate: {} (resource {}, observed {}, limit {}). Reduce simultaneous music or simplify chains.",native::error(),diagnostic.resource,diagnostic.observed,diagnostic.limit)});
        }
        Ok(())
    }
    /// Caller must witness both CPAL closures destroyed through Driver::stop.
    /// A failed open, stream=None, or musical Stop alone is insufficient.
    /// Headless probes have no CPAL closures and stop their renderer synchronously.
    pub fn install(&mut self, prepared: PreparedSession) -> Result<u64, String> {
        Self::preflight_master(&prepared)?;
        self.validate(&prepared)?;
        let serials=super::native_master::reserve_pair().ok_or("Master serial exhausted")?;
        self.install_reserved(prepared,serials).map_err(|failure|failure.message)?;
        Ok(serials.0)
    }
    pub(super) fn install_reserved(&mut self,prepared:PreparedSession,serials:(u64,u64))->Result<(),InstallFailure> {
        unsafe { native::ultra_audio_stop(); }
        let mut replaced=false;
        let result=self.apply(&prepared,&mut replaced).and_then(|()|Self::initialize_master(prepared.saved.master.gain,serials.0));
        if let Err(error) = result {
            if !replaced{return Err(InstallFailure{message:format!("Session apply failed; prior session retained: {error}"),rollback_serial:None});}
            if let Some(previous) = self.prepared.clone() {
                let mut rollback_replaced=false;
                if let Err(rollback) = self.apply(&previous,&mut rollback_replaced).and_then(|()|Self::initialize_master(previous.saved.master.gain,serials.1)) {
                    return Err(InstallFailure{message:format!("Session apply failed: {error}; prior session remains saved in memory but audio restoration failed: {rollback}"),rollback_serial:None});
                }
                return Err(InstallFailure{message:format!("Session apply failed; prior session retained: {error}"),rollback_serial:Some(serials.1)});
            }
            return Err(InstallFailure{message:format!("Session apply failed; prior session retained: {error}"),rollback_serial:None});
        }
        self.prepared = Some(prepared);
        self.bank_revision = 0;
        Ok(())
    }
    fn initialize_master(gain:f64,serial:u64)->Result<(),String>{
        let capability=native::master_capability().ok_or("Native Master support is unavailable")?;
        if unsafe{(capability.set)(1,gain,serial)}!=1{return Err("Native Master initialization failed".into());}Ok(())
    }
    fn apply(&mut self, prepared: &PreparedSession, replaced:&mut bool) -> Result<(), String> {
        if self.revisions.iter().any(|r|*r==u64::MAX)||self.preparation_revision==u64::MAX{return Err("Native revision exhausted".into());}
        let (config,graphs)=self.configuration_workspaces(prepared)?;
        self.preparation_revision=self.preparation_revision.checked_add(1).ok_or("Native preparation revision exhausted")?;
        unsafe {
            if native::alive_session_reset() == 0 { return Err("Stop device I/O before applying a session".into()); }
            *replaced=true;
            #[cfg(test)]
            if TEST_FAIL_AFTER_RESET.with(|remaining|{let count=remaining.get();if count>0{remaining.set(count-1);true}else{false}}){return Err("Injected failure after native reset".into());}
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
            let audio=prepared.schedule.audio_descriptors();
            let accepted=native::alive_session_configure_v4(&*config,audio.as_ptr(),audio.len() as u32);
            if accepted == 0 { return Err(native::error()); }
        }
        self.bank_revision=0;
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
        prepared.saved.score.device_mut(instance_id)?.parameters.insert(key.into(), value);
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
        prepared.saved.score.device_mut(instance_id)?.bypassed = bypassed;
        Ok(())
    }
    pub fn mixer(&mut self, track: usize, gain: f64, mute: bool, solo: bool) -> Result<(), String> {
        if !gain.is_finite() || !(0. ..=2.).contains(&gain) { return Err("Track gain must be 0..2".into()); }
        let document=&mut self.prepared.as_mut().ok_or("No session")?.saved.score;
        let id=document.tracks().get(track).ok_or("Unknown track")?.id().to_owned();
        if unsafe { native::alive_session_mixer(track as u32, gain, mute as u32, solo as u32) } == 0 { return Err(native::error()); }
        document.set_mixer(&id,gain,mute,solo)?;
        Ok(())
    }
}

pub(super) fn workspace_limits()->Result<native::LimitsV4,String>{
    let mut limits=native::LimitsV4::default();
    let required=native::V4_FEATURE_ADMITTED|native::V4_FEATURE_ARRANGEMENT;
    if unsafe{native::alive_session_limits_v4(native::V4_PROFILE_2X4,&mut limits)}==0||limits.features&required!=required{return Err("Measured MIDI workspace profile 1 is unavailable in this native backend".into());}
    Ok(limits)
}

fn layout(value: &str) -> u32 { match value { "stereo" => 2, "mono" => 1, _ => 0 } }

pub(super) struct AdmissionError {pub code:u32,pub message:String}
