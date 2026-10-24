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
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct View<'a> {
    pub document: &'a Session,
    pub path: &'a Path,
    pub devices: Vec<&'a crate::canvas::device::HostManifest>,
}
impl Host {
    fn configuration_v3(&self,prepared:&PreparedSession)->Result<(Box<native::ConfigV3>,Vec<crate::canvas::NativeGraph>),String> {
        let profile=if prepared.tracks.len()<=2&&prepared.devices.len()<=6{native::V3_PROFILE_2X4}else{native::V3_PROFILE_8X4};
        let limits=native::clip_limits(profile)?;
        if prepared.tracks.len()>limits.max_tracks as usize||prepared.devices.len()>limits.max_devices as usize{return Err("Prepared session exceeds its admitted native clip profile".into());}
        let (mut config,graphs)=self.configuration_common(prepared);
        config.profile=limits.profile;config.work_policy=limits.work_policy;config.preparation_revision=self.preparation_revision.checked_add(1).ok_or("Native preparation revision exhausted")?;
        config.tempo_bpm=prepared.document.tempo;
        let Schedule::Clips(clips)=&prepared.schedule else{return Err("Not a clip bank".into())};config.clip_count=clips.len() as u32;
        for (i,track) in prepared.document.tracks.iter().enumerate(){
            config.tracks[i].slots=[native::V3_NONE;4];config.tracks[i].initial_clip=native::V3_NONE;
            let default=&prepared.document.bank(&track.id).unwrap().default_clip_id;
            for (index,clip) in clips.iter().enumerate().filter(|(_,c)|c.track==i){config.tracks[i].slots[clip.slot]=index as u32;if default.as_ref()==Some(&clip.id){config.tracks[i].initial_clip=index as u32;}}
        }
        for (index,clip) in clips.iter().enumerate(){config.clips[index]=native::ClipV3{track:clip.track as u32,event_begin:clip.event_begin as u32,event_count:clip.event_count as u32,lane_count:clip.lane_count,length_frames:clip.length_frames,owned_masks:clip.owned_masks};}
        Ok((config,graphs))
    }
    /// Only a playable legacy candidate may fall back after stricter clip admission.
    pub fn enable_clips(&self,mut prepared:PreparedSession)->Result<PreparedSession,String> {
        self.validate(&prepared)?;
        if prepared.document.is_clips(){return Ok(prepared);}
        let attempt=(||{let mut candidate=prepared.clone();candidate.document=prepared.document.to_clips()?;let document=candidate.document.clone();prepare::compile_clips(&document,&mut candidate)?;self.admit(&candidate).map_err(|e|format!("{} (native reason {})",e.message,e.code))?;Ok::<_,String>(candidate)})();
        match attempt {Ok(mut candidate)=>{candidate.notice=Some("Upgraded in memory; Save writes session v3".into());Ok(candidate)},Err(reason)=>{prepared.notice=Some(format!("Legacy session - clip-bank conversion unavailable: {reason}"));Ok(prepared)}}
    }
    pub fn view(&self) -> Result<View<'_>, String> {
        let p = self.prepared.as_ref().ok_or("Create or open an Alive session")?;
        Ok(View { document: &p.document, path: &p.origin, devices: p.tracks.iter().map(|t| &p.devices[t.instrument].manifest).collect() })
    }
    fn configuration(&self, prepared: &PreparedSession) -> (Box<native::ConfigV2>, Vec<crate::canvas::NativeGraph>) {
        let (common,graphs)=self.configuration_common(prepared);
        let mut config = Box::<native::ConfigV2>::default();
        config.track_count=common.track_count;config.device_count=common.device_count;config.event_count=common.event_count;
        config.loop_enabled=common.loop_enabled;config.length_frames=common.length_frames;config.loop_end=common.length_frames;
        config.devices.copy_from_slice(&common.devices[..6]);config.events=common.events;
        for (index,track) in config.tracks.iter_mut().enumerate(){*track=common.tracks[index].chain;}
        (config,graphs)
    }
    fn configuration_common(&self, prepared: &PreparedSession) -> (Box<native::ConfigV3>, Vec<crate::canvas::NativeGraph>) {
        let mut config = Box::<native::ConfigV3>::default();
        config.track_count = prepared.tracks.len() as u32;
        config.device_count = prepared.devices.len() as u32;
        config.event_count = prepared.events.len() as u32;
        config.loop_enabled = prepared.document.loop_enabled as u32;
        config.length_frames = prepared.length_frames;
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
                    automated: match &prepared.schedule {Schedule::Legacy=>model.automation.iter().any(|lane| lane.instance_id == device.instance_id && lane.key == parameter.key && lane.enabled),Schedule::Clips(clips)=>clips.iter().any(|c|c.owned_masks[index]&(1<<slot)!=0)} as u32,
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
            config.tracks[index].chain = native;
        }
        for (index, event) in prepared.events.iter().enumerate() {
            config.events[index] = native::EventV2 { frame: event.frame, track: event.track, kind: event.kind,
                device: event.device, target: event.target, value: event.value };
        }
        (config, graphs)
    }
    /// Prospective admission leaves the current playback and document untouched.
    pub fn validate(&self, prepared: &PreparedSession) -> Result<(), String> {
        self.admit(prepared).map_err(|e|e.message)
    }
    pub(super) fn admit(&self,prepared:&PreparedSession)->Result<(),AdmissionError> {
        if self.revisions.iter().any(|r|*r==u64::MAX)||self.preparation_revision==u64::MAX{return Err(AdmissionError{code:native::V3_BAD_FIELD,message:"Native revision exhausted".into()});}
        if matches!(prepared.schedule,Schedule::Clips(_)) {
            let (config,graphs)=self.configuration_v3(prepared).map_err(|message|AdmissionError{code:native::V3_FEATURE_DISABLED,message})?;
            if unsafe {native::alive_session_validate_prepared_v3(&*config,graphs.as_ptr(),graphs.len() as u32)}==0{return Err(diagnostic(prepared));}
            return Ok(());
        }
        let (config, graphs) = self.configuration(prepared);
        for (index, graph) in graphs.iter().enumerate() {
            if unsafe { native::alive_session_validate_device_v2(&config.devices[index], graph) } == 0 {
                let device = &prepared.devices[index];
                let track = &prepared.document.tracks[device.track];
                return Err(AdmissionError{code:native::V3_GRAPH_REJECTED,message:format!("Track '{}' instance '{}' ({}): {}", track.name, device.instance_id, device.path.display(), native::error())});
            }
        }
        if unsafe { native::alive_session_validate_prepared_v2(&*config, graphs.as_ptr(), graphs.len() as u32) } == 0 {
            return Err(AdmissionError{code:native::V3_BAD_FIELD,message:native::error()});
        }
        Ok(())
    }
    /// Caller must witness both CPAL closures destroyed through Driver::stop.
    /// A failed open, stream=None, or musical Stop alone is insufficient.
    /// Headless probes have no CPAL closures and stop their renderer synchronously.
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
        if self.revisions.iter().any(|r|*r==u64::MAX)||self.preparation_revision==u64::MAX{return Err("Native revision exhausted".into());}
        let (legacy,clips,graphs)=if prepared.document.is_clips(){let (config,graphs)=self.configuration_v3(prepared)?;(None,Some(config),graphs)}else{let (config,graphs)=self.configuration(prepared);(Some(config),None,graphs)};
        self.preparation_revision=self.preparation_revision.checked_add(1).ok_or("Native preparation revision exhausted")?;
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
            let accepted=match clips {Some(config)=>native::alive_session_configure_v3(&*config),None=>native::alive_session_configure_v2(&**legacy.as_ref().unwrap())};
            if accepted == 0 { return Err(native::error()); }
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

pub(super) struct AdmissionError {pub code:u32,pub message:String}
fn diagnostic(prepared:&PreparedSession)->AdmissionError {
    let native_message=native::error();let mut d=native::DiagnosticV3::default();
    if unsafe{native::alive_session_diagnostic_v3(&mut d)}==0{return AdmissionError{code:native::V3_BAD_FIELD,message:native_message};}
    if d.error==native::V3_GRAPH_REJECTED{return AdmissionError{code:d.error,message:format!("V3 graph policy restriction: {native_message}. The source may remain valid for legacy playback")};}
    let resource=match d.resource{native::V3_RESOURCE_EVENTS=>"events",native::V3_RESOURCE_ROOT_CLEARS=>"root clears",native::V3_RESOURCE_EVENT_SCANS=>"event scans",native::V3_RESOURCE_PARAMETER_WRITES=>"parameter writes",native::V3_RESOURCE_GUARD_STEPS=>"guard steps",_=>"native admission"};
    let contributors=prepared.document.tracks.iter().enumerate().filter(|(i,_)|d.track_mask&(1<<i)!=0).map(|(i,t)|{let clips=match &prepared.schedule {Schedule::Clips(clips)=>clips.iter().enumerate().filter(|(n,c)|c.track==i&&(d.clip[i]==native::V3_NONE||*n==d.clip[i] as usize)).map(|(_,c)|c.name.as_str()).collect::<Vec<_>>().join(", "),_=>String::new()};format!("{} [{}]: {}{}",t.name,clips,if d.contribution[i]==u32::MAX{"at least "}else{""},d.contribution[i])}).collect::<Vec<_>>().join("; ");
    let envelope=d.conservative!=0||d.frame==native::V3_NO_FRAME||d.clip.iter().enumerate().any(|(i,c)|d.track_mask&(1<<i)!=0&&*c==native::V3_NONE);
    AdmissionError{code:d.error,message:format!("{} exceeds {resource}: {}{} / {}. {contributors}. {native_message}. Use fewer simultaneous notes/points, longer very short loops, or simpler chains",if envelope{"Conservative combination envelope"}else{"Prepared bank"},if d.observed==u64::MAX{"at least "}else{""},d.observed,d.limit)}
}
