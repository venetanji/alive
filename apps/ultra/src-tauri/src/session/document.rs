//! Shared metadata access for the current workspace document.
use super::{Document, DeviceInstance, workspaces::{ChainV4, TrackV4}};

pub type TrackRef<'a> = &'a TrackV4;
impl TrackV4 {
    pub fn id(&self) -> &str { &self.id }
    pub fn name(&self) -> &str { &self.name }
    pub fn effects(&self) -> &[DeviceInstance] { &self.effects }
    pub fn mixer(&self) -> (f64,bool,bool) { (self.gain,self.mute,self.solo) }
}
impl Document {
    pub fn title(&self) -> &str { &self.title }
    pub fn tempo(&self) -> f64 { self.tempo }
    pub fn length_beats(&self) -> f64 { self.length_beats }
    pub fn loop_enabled(&self) -> bool { self.loop_enabled }
    pub fn tracks(&self) -> Vec<TrackRef<'_>> { self.tracks.iter().collect() }
    pub fn device_mut(&mut self, id:&str) -> Result<&mut DeviceInstance,String> {
        self.tracks.iter_mut().flat_map(|t| {
            let instrument=match &mut t.chain {ChainV4::Midi{instrument}=>instrument.as_mut(),ChainV4::Audio{}=>None};
            instrument.into_iter().chain(&mut t.effects)
        }).find(|d|d.instance_id==id).ok_or_else(||format!("Unknown device instance: {id}"))
    }
    pub fn set_mixer(&mut self,id:&str,gain:f64,mute:bool,solo:bool)->Result<(),String>{
        let track=self.tracks.iter_mut().find(|t|t.id==id).ok_or("Unknown track")?;
        track.gain=gain;track.mute=mute;track.solo=solo;Ok(())
    }
}
