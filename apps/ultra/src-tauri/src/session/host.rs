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
    pub(super) fn preflight_master(prepared: &PreparedSession) -> Result<(), String> {
        Self::preflight_master_with_capability(prepared,native::master_capability().is_some())
    }
    pub(super) fn preflight_master_with_capability(prepared: &PreparedSession,available:bool) -> Result<(), String> {
        prepared.saved.validate_master()?;
        if !available && prepared.saved.master.gain != 1. { Err("Master gain is unavailable until native Master support is installed".into()) } else { Ok(()) }
    }
    pub(super) fn configuration_workspaces(&self, prepared:&PreparedSession)->Result<(Box<native::ConfigV4>,Vec<crate::canvas::NativeGraph>),String> {
        let (Document::WorkspacesV4(project),Schedule::Workspaces(workspace))=(&prepared.saved.score,&prepared.schedule) else{return Err("Workspace document and schedule disagree".into())};
        let (common,graphs)=self.configuration_common(prepared)?;
        let mut config=Box::<native::ConfigV4>::default();
        config.profile=native::V4_PROFILE_2X4;config.work_policy=native::V4_WORK_POLICY_1;
        config.preparation_revision=self.preparation_revision.checked_add(1).ok_or("Native preparation revision exhausted")?;
        config.track_count=common.track_count;config.device_count=common.device_count;config.devices=common.devices;
        config.event_count=common.event_count;config.events=common.events;config.loop_enabled=common.loop_enabled;
        config.length_frames=prepared.length_frames;config.tempo_bpm=project.tempo;
        config.loop_start=workspaces::frame_at(project.loop_start_beats,project.tempo)?;config.loop_end=workspaces::frame_at(project.loop_end_beats,project.tempo)?;
        config.source_count=workspace.sources.len() as u32;config.slot_count=workspace.slots.len() as u32;config.placement_count=workspace.placements.len() as u32;
        for (i,source) in workspace.sources.iter().enumerate(){config.sources[i]=source.descriptor;}
        for (i,slot) in workspace.slots.iter().enumerate(){config.slots[i]=slot.descriptor;}
        for (i,placement) in workspace.placements.iter().enumerate(){config.placements[i]=placement.descriptor;}
        let mut placement_begin=0;
        for (i,track) in prepared.tracks.iter().enumerate(){
            let chain=common.tracks[i].chain;
            let mut native=native::TrackV4{kind:native::V4_MIDI,instrument:track.midi_instrument()? as u32,effect_count:chain.effect_count,effects:chain.effects,gain:chain.gain,mute:chain.mute,solo:chain.solo,placement_begin,..Default::default()};
            for (index,slot) in workspace.slots.iter().enumerate().filter(|(_,s)|s.descriptor.track==i as u32){native.slots[slot.slot]=index as u32;}
            native.placement_count=workspace.placements.iter().filter(|p|p.descriptor.track==i as u32).count() as u32;
            placement_begin+=native.placement_count;config.tracks[i]=native;
        }
        Ok((config,graphs))
    }
    pub(super) fn check_schedule(prepared:&PreparedSession)->Result<(),String>{
        match (&prepared.saved.score,&prepared.schedule){(Document::LegacyV2(_),Schedule::Legacy)|(Document::ClipsV3(_),Schedule::Clips(_))|(Document::WorkspacesV4(_),Schedule::Workspaces(_))=>Ok(()),_=>Err("Document and prepared schedule disagree".into())}
    }
    fn configuration_v3(&self,prepared:&PreparedSession)->Result<(Box<native::ConfigV3>,Vec<crate::canvas::NativeGraph>),String> {
        let profile=if prepared.tracks.len()<=2&&prepared.devices.len()<=6{native::V3_PROFILE_2X4}else{native::V3_PROFILE_8X4};
        let limits=native::clip_limits(profile)?;
        if prepared.tracks.len()>limits.max_tracks as usize||prepared.devices.len()>limits.max_devices as usize{return Err("Prepared session exceeds its admitted native clip profile".into());}
        let (mut config,graphs)=self.configuration_common(prepared)?;
        config.profile=limits.profile;config.work_policy=limits.work_policy;config.preparation_revision=self.preparation_revision.checked_add(1).ok_or("Native preparation revision exhausted")?;
        config.tempo_bpm=prepared.saved.score.tempo();
        let Schedule::Clips(clips)=&prepared.schedule else{return Err("Not a clip bank".into())};config.clip_count=clips.len() as u32;
        for (i,track) in prepared.saved.score.tracks().into_iter().enumerate(){
            config.tracks[i].slots=[native::V3_NONE;4];config.tracks[i].initial_clip=native::V3_NONE;
            let default=&prepared.saved.score.bank(&track.id()).unwrap().default_clip_id;
            for (index,clip) in clips.iter().enumerate().filter(|(_,c)|c.track==i){config.tracks[i].slots[clip.slot]=index as u32;if default.as_ref()==Some(&clip.id){config.tracks[i].initial_clip=index as u32;}}
        }
        for (index,clip) in clips.iter().enumerate(){config.clips[index]=native::ClipV3{track:clip.track as u32,event_begin:clip.event_begin as u32,event_count:clip.event_count as u32,lane_count:clip.lane_count,length_frames:clip.length_frames,owned_masks:clip.owned_masks};}
        Ok((config,graphs))
    }
    /// Only a playable legacy candidate may fall back after stricter clip admission.
    pub fn enable_clips(&self,mut prepared:PreparedSession)->Result<PreparedSession,String> {
        self.validate(&prepared)?;
        if prepared.saved.score.is_clips()||prepared.saved.score.is_workspaces(){return Ok(prepared);}
        let attempt=(||{let mut candidate=prepared.clone();candidate.saved.score=prepared.saved.score.to_clips()?;let document=candidate.saved.score.clone();prepare::compile_clips(&document,&mut candidate)?;self.admit(&candidate).map_err(|e|format!("{} (native reason {})",e.message,e.code))?;Ok::<_,String>(candidate)})();
        match attempt {Ok(mut candidate)=>{candidate.notice=Some(match candidate.saved.wire {SaveWire::LegacyScore=>"Upgraded in memory; Save writes session v3",SaveWire::V5=>"Upgraded in memory; Save writes session v5 with a v3 score",SaveWire::V6=>"Upgraded in memory; Save writes session v6 with launch settings"}.into());Ok(candidate)},Err(reason)=>{prepared.notice=Some(format!("Legacy session - clip-bank conversion unavailable: {reason}"));Ok(prepared)}}
    }
    pub fn view(&self) -> Result<View<'_>, String> {
        let p = self.prepared.as_ref().ok_or("Create or open an Alive session")?;
        Ok(View { document: &p.saved.score, path: &p.origin, devices: if p.saved.score.is_workspaces(){vec![]}else{p.tracks.iter().map(|t| Ok(&p.devices[t.midi_instrument()?].manifest)).collect::<Result<_,String>>()?} })
    }
    fn configuration(&self, prepared: &PreparedSession) -> Result<(Box<native::ConfigV2>, Vec<crate::canvas::NativeGraph>),String> {
        let (common,graphs)=self.configuration_common(prepared)?;
        let mut config = Box::<native::ConfigV2>::default();
        config.track_count=common.track_count;config.device_count=common.device_count;config.event_count=common.event_count;
        config.loop_enabled=common.loop_enabled;config.length_frames=common.length_frames;config.loop_end=common.length_frames;
        config.devices.copy_from_slice(&common.devices[..6]);config.events=common.events;
        for (index,track) in config.tracks.iter_mut().enumerate(){*track=common.tracks[index].chain;}
        Ok((config,graphs))
    }
    fn configuration_common(&self, prepared: &PreparedSession) -> Result<(Box<native::ConfigV3>, Vec<crate::canvas::NativeGraph>),String> {
        let mut config = Box::<native::ConfigV3>::default();
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
                    automated: match &prepared.schedule {Schedule::Legacy=>match &prepared.saved.score {Document::LegacyV2(s)=>s.tracks[device.track].automation.iter().any(|lane| lane.instance_id == device.instance_id && lane.key == parameter.key && lane.enabled),_=>false},Schedule::Clips(clips)=>clips.iter().any(|c|c.owned_masks[index]&(1<<slot)!=0),Schedule::Workspaces(w)=>w.sources.iter().any(|s|s.descriptor.owned_masks[index]&(1<<slot)!=0)} as u32,
                    base: parameter.base, minimum: parameter.min, maximum: parameter.max, reserved: 0 };
            }
            config.devices[index] = native;
            graphs.push(graph);
        }
        for (index, track) in prepared.tracks.iter().enumerate() {
            let model = &prepared.saved.score.tracks()[index];
            let mut native = native::TrackV2 { instrument: track.midi_instrument()? as u32, effect_count: track.effects.len() as u32,
                gain: model.mixer().0, mute: model.mixer().1 as u32, solo: model.mixer().2 as u32, ..Default::default() };
            for (slot, &device) in track.effects.iter().enumerate() { native.effects[slot] = device as u32; }
            config.tracks[index].chain = native;
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
        Self::check_schedule(prepared).map_err(|message|AdmissionError{code:native::V4_BAD_FIELD,message})?;
        if self.revisions.iter().any(|r|*r==u64::MAX)||self.preparation_revision==u64::MAX{return Err(AdmissionError{code:native::V3_BAD_FIELD,message:"Native revision exhausted".into()});}
        if matches!(prepared.schedule,Schedule::Workspaces(_)) {
            workspace_limits().map_err(|message|AdmissionError{code:native::V4_FEATURE_DISABLED,message})?;
            let (config,graphs)=self.configuration_workspaces(prepared).map_err(|message|AdmissionError{code:native::V4_BAD_FIELD,message})?;
            if unsafe{native::alive_session_validate_prepared_v4(&*config,graphs.as_ptr(),graphs.len() as u32,std::ptr::null(),0)}==0 {
                let mut d=native::DiagnosticV4::default();unsafe{native::alive_session_diagnostic_v4(&mut d);}
                return Err(AdmissionError{code:d.error,message:format!("Measured workspace profile 1 refused the complete candidate: {} (resource {}, observed {}, limit {}). Keep the current playable project, reduce simultaneous music or simplify chains. Profile 2 is not admitted.",native::error(),d.resource,d.observed,d.limit)});
            }return Ok(());
        }
        if matches!(prepared.schedule,Schedule::Clips(_)) {
            let (config,graphs)=self.configuration_v3(prepared).map_err(|message|AdmissionError{code:native::V3_FEATURE_DISABLED,message})?;
            if unsafe {native::alive_session_validate_prepared_v3(&*config,graphs.as_ptr(),graphs.len() as u32)}==0{return Err(diagnostic(prepared));}
            return Ok(());
        }
        let (config, graphs) = self.configuration(prepared).map_err(|message|AdmissionError{code:native::V3_BAD_FIELD,message})?;
        for (index, graph) in graphs.iter().enumerate() {
            if unsafe { native::alive_session_validate_device_v2(&config.devices[index], graph) } == 0 {
                let device = &prepared.devices[index];
                let track = &prepared.saved.score.tracks()[device.track];
                return Err(AdmissionError{code:native::V3_GRAPH_REJECTED,message:format!("Track '{}' instance '{}' ({}): {}", track.name(), device.instance_id, device.path.display(), native::error())});
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
    pub fn install(&mut self, prepared: PreparedSession) -> Result<u64, String> {
        Self::preflight_master(&prepared)?;
        self.validate(&prepared)?;
        let serials=if native::master_capability().is_some(){Some(super::native_master::reserve_pair().ok_or("Master serial exhausted")?)}else{None};
        self.install_reserved(prepared,serials).map_err(|failure|failure.message)?;
        Ok(serials.map_or(0,|s|s.0))
    }
    pub(super) fn install_reserved(&mut self,prepared:PreparedSession,serials:Option<(u64,u64)>)->Result<(),InstallFailure> {
        unsafe { native::ultra_audio_stop(); }
        let mut replaced=false;
        let result=self.apply(&prepared,&mut replaced).and_then(|()|Self::initialize_master(prepared.saved.master.gain,serials.map(|s|s.0)));
        if let Err(error) = result {
            if !replaced{return Err(InstallFailure{message:format!("Session apply failed; prior session retained: {error}"),rollback_serial:None});}
            if let Some(previous) = self.prepared.clone() {
                let mut rollback_replaced=false;
                if let Err(rollback) = self.apply(&previous,&mut rollback_replaced).and_then(|()|Self::initialize_master(previous.saved.master.gain,serials.map(|s|s.1))) {
                    return Err(InstallFailure{message:format!("Session apply failed: {error}; prior session remains saved in memory but audio restoration failed: {rollback}"),rollback_serial:None});
                }
                return Err(InstallFailure{message:format!("Session apply failed; prior session retained: {error}"),rollback_serial:serials.map(|s|s.1)});
            }
            return Err(InstallFailure{message:format!("Session apply failed; prior session retained: {error}"),rollback_serial:None});
        }
        self.prepared = Some(prepared);
        Ok(())
    }
    fn initialize_master(gain:f64,serial:Option<u64>)->Result<(),String>{
        if let Some(serial)=serial {
            let capability=native::master_capability().ok_or("Native Master support is unavailable")?;
            if unsafe{(capability.set)(1,gain,serial)}!=1{return Err("Native Master initialization failed".into());}
        }
        Ok(())
    }
    fn apply(&mut self, prepared: &PreparedSession, replaced:&mut bool) -> Result<(), String> {
        if self.revisions.iter().any(|r|*r==u64::MAX)||self.preparation_revision==u64::MAX{return Err("Native revision exhausted".into());}
        Self::check_schedule(prepared)?;
        let (legacy,clips,workspaces,graphs)=match &prepared.schedule {
            Schedule::Workspaces(_)=>{let (config,graphs)=self.configuration_workspaces(prepared)?;(None,None,Some(config),graphs)},
            Schedule::Clips(_)=>{let (config,graphs)=self.configuration_v3(prepared)?;(None,Some(config),None,graphs)},
            Schedule::Legacy=>{let (config,graphs)=self.configuration(prepared)?;(Some(config),None,None,graphs)}
        };
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
            let accepted=if let Some(config)=workspaces {native::alive_session_configure_v4(&*config,std::ptr::null(),0)}else{match clips {Some(config)=>native::alive_session_configure_v3(&*config),None=>native::alive_session_configure_v2(&**legacy.as_ref().unwrap())}};
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
fn diagnostic(prepared:&PreparedSession)->AdmissionError {
    let native_message=native::error();let mut d=native::DiagnosticV3::default();
    if unsafe{native::alive_session_diagnostic_v3(&mut d)}==0{return AdmissionError{code:native::V3_BAD_FIELD,message:native_message};}
    if d.error==native::V3_GRAPH_REJECTED{return AdmissionError{code:d.error,message:format!("V3 graph policy restriction: {native_message}. The source may remain valid for legacy playback")};}
    let resource=match d.resource{native::V3_RESOURCE_EVENTS=>"events",native::V3_RESOURCE_ROOT_CLEARS=>"root clears",native::V3_RESOURCE_EVENT_SCANS=>"event scans",native::V3_RESOURCE_PARAMETER_WRITES=>"parameter writes",native::V3_RESOURCE_GUARD_STEPS=>"guard steps",_=>"native admission"};
    let contributors=prepared.saved.score.tracks().into_iter().enumerate().filter(|(i,_)|d.track_mask&(1<<i)!=0).map(|(i,t)|{let clips=match &prepared.schedule {Schedule::Clips(clips)=>clips.iter().enumerate().filter(|(n,c)|c.track==i&&(d.clip[i]==native::V3_NONE||*n==d.clip[i] as usize)).map(|(_,c)|c.name.as_str()).collect::<Vec<_>>().join(", "),_=>String::new()};format!("{} [{}]: {}{}",t.name(),clips,if d.contribution[i]==u32::MAX{"at least "}else{""},d.contribution[i])}).collect::<Vec<_>>().join("; ");
    let envelope=d.conservative!=0||d.frame==native::V3_NO_FRAME||d.clip.iter().enumerate().any(|(i,c)|d.track_mask&(1<<i)!=0&&*c==native::V3_NONE);
    AdmissionError{code:d.error,message:format!("{} exceeds {resource}: {}{} / {}. {contributors}. {native_message}. Use fewer simultaneous notes/points, longer very short loops, or simpler chains",if envelope{"Conservative combination envelope"}else{"Prepared bank"},if d.observed==u64::MAX{"at least "}else{""},d.observed,d.limit)}
}
