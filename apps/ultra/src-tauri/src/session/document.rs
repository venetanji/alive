//! Checked shared metadata and actual device chains; musical data stays versioned.
use super::{Document, DeviceInstance, LegacySession, Track, workspaces::{ChainV4, TrackV4}};

#[derive(Clone, Copy)]
pub enum TrackRef<'a> { Legacy(&'a Track), Workspace(&'a TrackV4) }
impl<'a> TrackRef<'a> {
    pub fn id(self) -> &'a str { match self { Self::Legacy(t)=>&t.id, Self::Workspace(t)=>&t.id } }
    pub fn name(self) -> &'a str { match self { Self::Legacy(t)=>&t.name, Self::Workspace(t)=>&t.name } }
    pub fn instrument(self) -> Option<&'a DeviceInstance> {
        match self { Self::Legacy(t)=>Some(&t.device), Self::Workspace(t)=>match &t.chain {ChainV4::Midi{instrument}=>Some(instrument),ChainV4::Audio{}=>None} }
    }
    pub fn effects(self) -> &'a [DeviceInstance] { match self { Self::Legacy(t)=>&t.effects, Self::Workspace(t)=>&t.effects } }
    pub fn devices(self) -> impl Iterator<Item=&'a DeviceInstance> { self.instrument().into_iter().chain(self.effects()) }
    pub fn mixer(self) -> (f64,bool,bool) {match self {Self::Legacy(t)=>(t.gain,t.mute,t.solo),Self::Workspace(t)=>(t.gain,t.mute,t.solo)}}
}
impl Document {
    pub fn legacy(&self) -> Result<&LegacySession,String> {match self {Self::LegacyV2(s)=>Ok(s),Self::ClipsV3(s)=>Ok(&s.common),Self::WorkspacesV4(_)=>Err("This operation requires a legacy or v3 clip document".into())}}
    pub fn legacy_mut(&mut self) -> Result<&mut LegacySession,String> {match self {Self::LegacyV2(s)=>Ok(s),Self::ClipsV3(s)=>Ok(&mut s.common),Self::WorkspacesV4(_)=>Err("This operation requires a legacy or v3 clip document".into())}}
    pub fn format(&self) -> &str {match self {Self::LegacyV2(s)=>&s.format,Self::ClipsV3(s)=>&s.common.format,Self::WorkspacesV4(s)=>&s.format}}
    pub fn title(&self) -> &str {match self {Self::LegacyV2(s)=>&s.title,Self::ClipsV3(s)=>&s.common.title,Self::WorkspacesV4(s)=>&s.title}}
    pub fn tempo(&self) -> f64 {match self {Self::LegacyV2(s)=>s.tempo,Self::ClipsV3(s)=>s.common.tempo,Self::WorkspacesV4(s)=>s.tempo}}
    pub fn length_beats(&self) -> f64 {match self {Self::LegacyV2(s)=>s.length_beats,Self::ClipsV3(s)=>s.common.length_beats,Self::WorkspacesV4(s)=>s.length_beats}}
    pub fn loop_enabled(&self) -> bool {match self {Self::LegacyV2(s)=>s.loop_enabled,Self::ClipsV3(s)=>s.common.loop_enabled,Self::WorkspacesV4(s)=>s.loop_enabled}}
    pub fn is_workspaces(&self) -> bool {matches!(self,Self::WorkspacesV4(_))}
    pub fn tracks(&self) -> Vec<TrackRef<'_>> {match self {Self::LegacyV2(s)=>s.tracks.iter().map(TrackRef::Legacy).collect(),Self::ClipsV3(s)=>s.common.tracks.iter().map(TrackRef::Legacy).collect(),Self::WorkspacesV4(s)=>s.tracks.iter().map(TrackRef::Workspace).collect()}}
    pub fn device_mut(&mut self, id:&str) -> Result<&mut DeviceInstance,String> {
        let found=match self {Self::LegacyV2(s)=>s.tracks.iter_mut().flat_map(Track::devices_mut).find(|d|d.instance_id==id),Self::ClipsV3(s)=>s.common.tracks.iter_mut().flat_map(Track::devices_mut).find(|d|d.instance_id==id),Self::WorkspacesV4(s)=>s.tracks.iter_mut().flat_map(|t|{let instrument=match &mut t.chain {ChainV4::Midi{instrument}=>Some(instrument),ChainV4::Audio{}=>None};instrument.into_iter().chain(&mut t.effects)}).find(|d|d.instance_id==id)};
        found.ok_or_else(||format!("Unknown device instance: {id}"))
    }
    pub fn set_mixer(&mut self, id:&str, gain:f64, mute:bool, solo:bool) -> Result<(),String> {
        match self {
            Self::WorkspacesV4(s)=>{let t=s.tracks.iter_mut().find(|t|t.id==id).ok_or("Unknown track")?;t.gain=gain;t.mute=mute;t.solo=solo;},
            _=>{let t=self.legacy_mut()?.tracks.iter_mut().find(|t|t.id==id).ok_or("Unknown track")?;t.gain=gain;t.mute=mute;t.solo=solo;}
        }Ok(())
    }
}
