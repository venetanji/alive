//! Offline proof through the same saved-session and native admission path as Alive.
use super::{host::Host, native, prepare, read, save};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::path::Path;
struct Shutdown;
impl Drop for Shutdown {
    fn drop(&mut self) { unsafe {
        native::ultra_audio_stop();
        native::alive_session_reset();
        for slot in 0..16 { crate::ultra_canvas_close_document(slot); }
    } }
}
fn require(condition: bool, error: &str) -> Result<(), String> {
    if condition { Ok(()) } else { Err(error.into()) }
}
fn render(frames: usize, partitions: &[usize]) -> Result<Vec<f32>, String> {
    let mut wave = Vec::with_capacity(frames * 2);
    let (mut left, mut right) = ([0f32; 1024], [0f32; 1024]);
    let mut part = 0;
    while wave.len() / 2 < frames {
        let count = partitions[part % partitions.len()].min(frames - wave.len() / 2);
        part += 1;
        require(unsafe { native::ultra_external_render(count as u32, left.as_mut_ptr(), right.as_mut_ptr()) } != 0,
            "Native Alive render was refused")?;
        for index in 0..count {
            require(left[index].is_finite() && right[index].is_finite(), "Nonfinite output sample")?;
            wave.extend_from_slice(&[left[index], right[index]]);
        }
    }
    Ok(wave)
}
fn workspace_state()->Result<native::StateV4,String>{
    let mut state=native::StateV4::default();require(unsafe{native::alive_session_state_v4(&mut state)}==1,"Workspace state is unavailable")?;Ok(state)
}
fn transport(host:&Host,kind:u32,position:u64)->Result<native::ReceiptV4,String>{
    use std::sync::atomic::{AtomicU64,Ordering};static NEXT:AtomicU64=AtomicU64::new(1);
    let request=native::RequestV4{kind,preparation_revision:host.preparation_revision,request_serial:NEXT.fetch_add(1,Ordering::Relaxed),position,..Default::default()};
    let mut receipt=native::ReceiptV4::default();require(unsafe{native::alive_session_request_v4(&request,&mut receipt)}==1,&native::error())?;Ok(receipt)
}
fn start(host:&Host)->Result<(),String>{
    require(unsafe{native::ultra_external_start()}==1,"Offline engine failed to start")?;transport(host,native::V4_START,0).map(|_|())
}
fn energy(wave: &[f32]) -> f64 { wave.iter().map(|&s| f64::from(s).powi(2)).sum::<f64>() / wave.len() as f64 }
fn digest(wave: &[f32]) -> String {
    let mut hash = Sha256::new();
    for sample in wave { hash.update(sample.to_le_bytes()); }
    format!("{:x}", hash.finalize())
}
fn saved_device_boundaries(host:&mut Host,source:&super::PreparedSession,output:&Path)->Result<Value,String>{
    use super::workspaces::{SourceV4,ClipNote,PlacementV4,ClipRegionV4};
    let offsets=[0u64,1,31,63,64,127];let mut baseline=Vec::new();let mut observations=Vec::new();
    for &offset in &offsets {
        let mut document=source.saved.score.clone();document.tempo=120.;document.length_beats=1.;document.loop_enabled=true;document.loop_start_beats=0.;document.loop_end_beats=1.;document.sources.clear();document.placements.clear();
        for (track,model) in document.tracks.iter_mut().enumerate(){
            model.gain=0.7;model.mute=false;model.solo=false;model.slots=[None,None,None,None];
            let instrument=model.instrument().ok_or("Boundary proof requires MIDI instruments")?.instance_id.clone();
            let id=format!("boundary-source-{track}");
            let automation=["cutoff","level"].into_iter().map(|key|super::Lane{instance_id:instrument.clone(),key:key.into(),enabled:true,points:vec![super::Point{beat:offset as f64/24000.,value:if key=="cutoff"{700.+offset as f64+track as f64*100.}else{30.+track as f64*5.}}]}).collect();
            document.sources.push(SourceV4::Midi{id:id.clone(),track_id:model.id.clone(),name:"Boundary event".into(),length_beats:1.,notes:vec![ClipNote{id:format!("boundary-note-{track}"),beat:offset as f64/24000.,duration:128./24000.,pitch:60+track as u32*12,velocity:90}],automation});
            document.placements.push(PlacementV4{id:format!("boundary-placement-{track}"),track_id:model.id.clone(),source_id:id,start:0.,duration:1.,region:ClipRegionV4::full(1.)});
        }
        let prepared=prepare(&source.saved.with_score(document),&source.origin)?;
        unsafe{native::ultra_audio_stop();}host.install(prepared.clone())?;start(host)?;
        let mut reference=Vec::new();
        for frame in 0..512 {
            reference.extend(render(1,&[1])?);
            if frame==offset {let observed=workspace_state()?;require(observed.position==frame+1,"Boundary event used the wrong frame")?;
                for track in 0..prepared.tracks.len(){let device=prepared.tracks[track].midi_instrument()?;let manifest=&prepared.devices[device].manifest;
                    let cutoff=manifest.parameters.iter().position(|p|p.key=="cutoff").ok_or("Missing cutoff binding")?;let level=manifest.parameters.iter().position(|p|p.key=="level").ok_or("Missing level binding")?;
                    let expected_cutoff=700.+offset as f64+track as f64*100.;let expected_level=30.+track as f64*5.;
                    require(observed.devices[device].effective[cutoff]==expected_cutoff&&observed.devices[device].effective[level]==expected_level,"Saved automation missed its timestamped sample")?;
                    observations.push(json!({"frame":frame,"track":track,"effectiveCutoff":expected_cutoff,"effectiveLevel":expected_level}));
                }
            }
        }
        require(energy(&reference)>0.,"Boundary fixture produced no audio")?;
        unsafe{native::ultra_audio_stop();}host.install(prepared)?;start(host)?;
        require(reference==render(512,&[17,127,64,31,1])?,"Boundary fixture depends on buffer partitioning")?;baseline.extend(reference);
    }
    crate::instrument_probe::write_wav(&output.join("boundary-events.wav"),&baseline).map_err(|e|e.to_string())?;
    Ok(json!({"offsets":offsets,"observations":observations,"partitionsIdentical":true,"audioSha256":digest(&baseline),"energy":energy(&baseline)}))
}
fn saved_chain_proof(host: &mut Host, source: &super::PreparedSession, output: &Path) -> Result<Value, String> {
    use super::{DeviceInstance,Lane,Point,workspaces::{ProjectV4,TrackV4,ChainV4,SourceV4,ClipNote,PlacementV4,ClipRegionV4}};
    let patch = json!({"version":1,"profile":"ultra-canvas-v1",
        "nodes":[{"id":1,"type":"poly_note","x":0,"y":0,"params":{"voices":4}},
            {"id":2,"type":"mix_voice","x":0,"y":80,"params":{}},
            {"id":3,"type":"gain","x":0,"y":160,"params":{"value":127}},
            {"id":4,"type":"join","x":0,"y":240,"params":{}},
            {"id":5,"type":"dac","x":0,"y":320,"params":{}}],
        "edges":[{"from":1,"outlet":1,"to":2,"inlet":0},{"from":2,"outlet":0,"to":3,"inlet":0},
            {"from":3,"outlet":0,"to":4,"inlet":0},{"from":3,"outlet":0,"to":4,"inlet":1},{"from":4,"outlet":0,"to":5,"inlet":0}],
        "device":{"version":1,"id":"org.alive.probe-impulse","name":"Probe Impulse","midi":{"node":1,"inlet":0},
            "audio":{"inputs":0,"outputs":2,"layout":"stereo"},"parameters":[{"key":"level","label":"Level","node":3,"param":"value","min":0,"max":127}],"presets":[]}});
    let impulse = output.join("impulse.ultra");
    std::fs::write(&impulse, serde_json::to_vec_pretty(&patch).unwrap()).map_err(|e| e.to_string())?;
    let reference = |path: &Path, instance: &str| -> Result<DeviceInstance, String> {
        let loaded = crate::documents::read_patch(path)?;
        let patch = loaded.patch.ok_or("Expected saved probe device")?;
        let graph = crate::canvas::prepare(patch.clone())?.native;
        let manifest = crate::canvas::device::host_manifest(&patch, &graph)?;
        Ok(DeviceInstance { instance_id: instance.into(), path: loaded.path.to_str().ok_or("Probe source path must be UTF-8")?.into(), id: manifest.id,
            version: manifest.version, source_sha256: super::prepare::fingerprint(&patch)?, parameters: Default::default(), bypassed: false })
    };
    let folder = source.devices[source.tracks[0].midi_instrument()?].path.parent().ok_or("Missing device folder")?;
    let instrument = reference(&impulse,"probe-instrument")?;
    let utility = reference(&folder.join("utility.ultra"),"probe-utility")?;
    let filter = reference(&folder.join("stereo-lowpass.ultra"),"probe-filter")?;
    let document=ProjectV4{format:"alive-session-v4".into(),title:"Saved chain proof".into(),tempo:120.,length_beats:1.,loop_enabled:false,loop_start_beats:0.,loop_end_beats:1.,
        tracks:vec![TrackV4{id:"probe-track".into(),name:"Saved impulse chain".into(),color:"#c77b61".into(),chain:ChainV4::Midi{instrument:Some(instrument)},effects:vec![utility,filter],slots:[None,None,None,None],gain:1.,mute:false,solo:false}],
        sources:vec![SourceV4::Midi{id:"probe-source".into(),track_id:"probe-track".into(),name:"Impulse".into(),length_beats:1.,notes:vec![ClipNote{id:"probe-note".into(),beat:0.,duration:1./24000.,pitch:60,velocity:127}],automation:vec![]}],
        placements:vec![PlacementV4{id:"probe-placement".into(),track_id:"probe-track".into(),source_id:"probe-source".into(),start:0.,duration:1.,region:ClipRegionV4::full(1.)}]};
    let origin=output.join("chain.alive");
    let saved = save(&origin,&source.saved.with_score(document.clone()),&origin)?;
    let prepared = read(&saved)?;
    unsafe { native::ultra_audio_stop(); }
    host.install(prepared.clone())?; start(host)?;
    let wet = render(256,&[1])?;
    require(wet[2] > 0., "Saved lowpass did not ring after the impulse")?;
    let mut dry_document = prepared.saved.score.clone(); dry_document.tracks[0].effects[1].bypassed = true;
    unsafe { native::ultra_audio_stop(); }
    host.install(prepare(&prepared.saved.with_score(dry_document),&saved)?)?; start(host)?;
    let dry = render(256,&[31,1,63,127])?;
    require(dry[0] > 0. && dry[2..].iter().all(|&s| s == 0.),"Saved bypass did not emit the exact dry impulse")?;
    unsafe { native::ultra_audio_stop(); }
    host.install(prepared.clone())?; start(host)?;
    let mut switched = render(31,&[17,1,13])?;
    host.bypass("probe-filter",true)?;
    switched.extend(render(33,&[1,31,1])?);
    require(switched[..62] == wet[..62] && switched[62..] == dry[62..128],"Live wet-to-dry samples did not change exactly at the callback boundary")?;
    host.bypass("probe-filter",false)?;
    let warm = render(192,&[63,1,127,1])?;
    require(warm == wet[128..],"Unbypassed saved filter did not retain continuously processed wet state")?;

    let mut ordered = document.clone();
    match &mut ordered.sources[0]{SourceV4::Midi{automation,..}=>automation.push(Lane { instance_id:"probe-utility".into(),key:"gain".into(),enabled:true,points:vec![Point { beat:1. / 24000.,value:0. }] }),_=>unreachable!()};
    let forward = prepare(&prepared.saved.with_score(ordered.clone()),&saved)?;
    unsafe { native::ultra_audio_stop(); } host.install(forward.clone())?; start(host)?;
    let ringing = render(128,&[31,63,1])?;
    ordered.tracks[0].effects.reverse();
    let reverse = prepare(&prepared.saved.with_score(ordered.clone()),&saved)?;
    let target = |p: &super::PreparedSession| p.events.iter().find(|e| e.kind == 1).map(|e| p.devices[e.device as usize].instance_id.clone());
    require(target(&forward) == target(&reverse) && target(&reverse).as_deref() == Some("probe-utility"),"Reorder changed automation ownership")?;
    unsafe { native::ultra_audio_stop(); } host.install(reverse)?; start(host)?;
    let suppressed = render(128,&[1,64,31])?;
    require(ringing[2] > 0. && suppressed[2..].iter().all(|&s| s == 0.),"Saved effect execution order did not preserve the noncommuting impulse tail")?;

    unsafe { native::ultra_audio_stop(); } host.install(prepared.clone())?; start(host)?;
    render(1,&[1])?;
    let before = workspace_state()?;
    let previous = host.prepared.as_ref().unwrap().saved.score.clone();
    let mut invalid = prepared.clone(); invalid.devices[0].graph.node_count = 0;
    require(host.install(invalid).is_err(),"Invalid prospective graph unexpectedly installed")?;
    require(host.prepared.as_ref().unwrap().saved.score == previous,"Rejected candidate changed saved model")?;
    let continued = render(1,&[1])?;
    require(continued == wet[2..4] && workspace_state()?.position == before.position+1,"Rejected candidate interrupted the active native session")?;
    let stale = workspace_state()?.devices[0];
    // Every admitted command updates the saved base, while queue rejection leaves it intact.
    for _ in 0..64 { host.base("probe-utility","gain",0.4)?; }
    require(host.base("probe-utility","gain",0.3).is_err(),"Saturated base queue did not reject")?;
    require(host.bypass("probe-filter",true).is_err(),"Saturated bypass queue did not reject")?;
    let model = &host.prepared.as_ref().unwrap().saved.score;
    require(model.tracks[0].effects[0].parameters["gain"] == 0.4 && !model.tracks[0].effects[1].bypassed,"Rejected live value leaked into saved state")?;
    unsafe { native::alive_session_stop(); }
    require(render(64,&[31,1,32])?.iter().all(|&s| s==0.) && workspace_state()?.playing==0,"Stop failed under saturated chain command queue")?;
    unsafe { native::ultra_audio_stop(); } host.install(prepared.clone())?;
    require(unsafe { native::alive_session_bypass_v2(stale.document,stale.revision,1) } == 0,"Reinstallation accepted a stale root handle")?;
    let saved = save(&output.join("chain-reopened.alive"),&host.prepared.as_ref().unwrap().saved,&saved)?;
    let reopened = read(&saved)?;
    require(reopened.saved.score.tracks[0].effects.len()==2,"Reopen lost saved effects")?;
    host.install(reopened)?; start(host)?;
    require(render(256,&[127,1,64])? == wet,"Reopened saved chain changed audio")?;
    let audio_path=output.join("independent-effects.wav");
    let mut impulse_audio=vec![0.;48000];impulse_audio[0]=0.5;impulse_audio[1]=0.5;
    crate::instrument_probe::write_wav(&audio_path,&impulse_audio).map_err(|e|e.to_string())?;
    let file=super::wav::inspect(&audio_path)?;
    let mut two=document.clone();two.tracks.clear();two.sources.clear();two.placements.clear();
    for (index,cutoff) in [2400.,700.].into_iter().enumerate(){
        let id=format!("audio-track-{index}");let source_id=format!("audio-source-{index}");
        let mut filter=reference(&folder.join("stereo-lowpass.ultra"),&format!("independent-filter-{index}"))?;
        filter.parameters.insert("cutoff".into(),cutoff);
        two.tracks.push(TrackV4{id:id.clone(),name:format!("Independent filter {index}"),color:"#c77b61".into(),chain:ChainV4::Audio{},effects:vec![filter],slots:[None,None,None,None],gain:1.,mute:false,solo:false});
        two.sources.push(SourceV4::Audio{id:source_id.clone(),track_id:id.clone(),name:"Shared impulse file".into(),file:file.clone(),source_tempo:120.,warp_mode:"repitch".into(),automation:vec![]});
        two.placements.push(PlacementV4{id:format!("audio-placement-{index}"),track_id:id,source_id,start:0.,duration:1.,region:ClipRegionV4::full(1.)});
    }
    let independent_prepared=prepare(&prepared.saved.with_score(two.clone()),&saved)?;
    unsafe{native::ultra_audio_stop();}host.install(independent_prepared.clone())?;start(host)?;
    let combined=render(128,&[31,1,64])?;let state=workspace_state()?;
    let first_filter=independent_prepared.devices.iter().position(|d|d.instance_id=="independent-filter-0").unwrap();
    let other_filter=independent_prepared.devices.iter().position(|d|d.instance_id=="independent-filter-1").unwrap();
    require(state.devices[first_filter].base[0]==2400.&&state.devices[other_filter].base[0]==700.,"Identical source effects shared base state")?;
    let mut first=two.clone();first.tracks[1].mute=true;
    unsafe{native::ultra_audio_stop();}host.install(prepare(&prepared.saved.with_score(first),&saved)?)?;start(host)?;
    let only_first=render(128,&[1,127])?;
    let mut other=two.clone();other.tracks[0].mute=true;
    unsafe{native::ultra_audio_stop();}host.install(prepare(&prepared.saved.with_score(other),&saved)?)?;start(host)?;
    let only_other=render(128,&[1,127])?;
    require(combined.iter().zip(only_first.iter().zip(&only_other)).all(|(sum,(a,b))|(sum-a-b).abs()<1e-7),"Identical source effects shared filter tails or mixed a root twice")?;
    require(only_other[2..].iter().zip(&only_first[2..]).any(|(a,b)|a!=b),"Distinct filter instances unexpectedly shared their tail")?;
    host.bypass("independent-filter-1",true)?;host.base("independent-filter-0","cutoff",1234.)?;render(1,&[1])?;
    let isolated=workspace_state()?;
    require(isolated.devices[first_filter].bypassed==0&&isolated.devices[other_filter].bypassed==1&&isolated.devices[first_filter].base[0]==1234.&&isolated.devices[other_filter].base[0]==700.,"Instance-specific bypass/base affected the other effect")?;
    Ok(json!({"savedDevices":3,"exactLiveDryAndWarmWet":true,"wetToDryFrame":31,"warmWetFrame":64,
        "reorderedAutomationIdentity":true,"noncommutingOrderTail":true,"independentSameSourceEffects":true,"independentAudioEffectRoots":2,"rejectedCandidatePreservedPlayback":true,
        "queueRejectedModelPreserved":true,"stopSurvivedFullQueue":true,"staleRootRejected":true,"reopenSamplesIdentical":true,
        "wetSha256":digest(&wet),"drySha256":digest(&dry)}))
}

pub fn run(path: &Path, output: &Path) -> Result<Value, String> {
    std::fs::create_dir_all(output).map_err(|e| e.to_string())?;
    let _shutdown = Shutdown;
    let prepared = read(path)?;
    require(prepared.tracks.len() == 2, "The session proof requires two saved device references")?;
    require(prepared.saved.score.loop_enabled, "The session proof requires an enabled loop")?;
    let mut owner = Host::default();let host=&mut owner;
    host.install(prepared.clone())?;
    start(host)?;
    let loop_start = workspace_state()?;
    let loop_begin=super::workspaces::frame_at(prepared.saved.score.loop_start_beats,prepared.saved.score.tempo)?;
    let loop_limit=super::workspaces::frame_at(prepared.saved.score.loop_end_beats,prepared.saved.score.tempo)?;
    let loop_period=loop_limit-loop_begin;
    let count = (loop_limit+loop_period) as usize + 1024;
    let baseline = render(count, &[1024])?;
    let loop_end = workspace_state()?;
    let second_cycle = energy(&baseline[loop_limit as usize * 2..(loop_limit+loop_period) as usize * 2]);
    let wraps = loop_end.generation.saturating_sub(loop_start.generation + 1);
    require(loop_end.playing == 1 && loop_end.position == loop_begin+(count as u64-loop_limit)%loop_period
        && loop_end.absolute_frame - loop_start.absolute_frame == count as u64
        && wraps == 1+(count as u64-loop_limit)/loop_period && second_cycle > 1e-9,
        "Loop did not wrap on the expected frame/generation and produce second-cycle audio")?;
    require(energy(&baseline) > 1e-9, "Saved Alive session produced no sound")?;
    unsafe { native::ultra_audio_stop(); }
    host.install(prepared.clone())?;
    start(host)?;
    let partitions = [1, 31, 63, 64, 127, 1024, 17, 509];
    let partitioned = render(count, &partitions)?;
    require(baseline == partitioned, "Saved session changed samples with host-buffer partitioning")?;
    crate::instrument_probe::write_wav(&output.join("two-devices-notes-automation.wav"), &baseline).map_err(|e| e.to_string())?;

    unsafe { native::ultra_audio_stop(); }
    host.install(prepared.clone())?;
    start(host)?;
    render(128, &[128])?;
    let cutoff = prepared.devices[prepared.tracks[0].midi_instrument()?].manifest.parameters.iter().position(|p| p.key == "cutoff").ok_or("Proof requires cutoff binding")?;
    let level = prepared.devices[prepared.tracks[0].midi_instrument()?].manifest.parameters.iter().position(|p| p.key == "level").ok_or("Proof requires level binding")?;
    let before = workspace_state()?;
    host.base(&prepared.saved.score.tracks[0].instrument().ok_or("Missing proof instrument")?.instance_id, "cutoff", 1711.)?;
    host.base(&prepared.saved.score.tracks[0].instrument().ok_or("Missing proof instrument")?.instance_id, "level", 72.)?;
    render(1, &[1])?;
    let owned = workspace_state()?;
    require(owned.devices[prepared.tracks[0].midi_instrument()?].base[cutoff] == 1711. && owned.devices[prepared.tracks[0].midi_instrument()?].effective[cutoff] == before.devices[prepared.tracks[0].midi_instrument()?].effective[cutoff]
        && owned.devices[prepared.tracks[0].midi_instrument()?].owned[cutoff] == 1 && owned.devices[prepared.tracks[0].midi_instrument()?].base[level] == 72.
        && owned.devices[prepared.tracks[0].midi_instrument()?].effective[level] == before.devices[prepared.tracks[0].midi_instrument()?].effective[level], "Automation failed to retain ownership over a panel base edit")?;
    require(owned.devices[prepared.tracks[1].midi_instrument()?].base == before.devices[prepared.tracks[1].midi_instrument()?].base, "Editing the first device changed the second instance")?;
    host.mixer(0, 0.7, true, false)?;
    host.mixer(1, 0.7, false, true)?;
    let second_only = energy(&render(1024, &[127, 64])?);
    require(second_only > 1e-9, "Solo/mute unexpectedly silenced the second device")?;
    host.mixer(1, 0.7, true, true)?;
    require(energy(&render(1024, &[1024])?) == 0., "Mute did not take precedence over solo")?;
    unsafe { native::alive_session_stop(); }
    require(energy(&render(1024, &[63, 1, 127])?) == 0., "Stop left sounding notes")?;
    let stopped = workspace_state()?;
    require(stopped.tracks.iter().all(|t| t.mixer.active_voices == 0)
        && stopped.devices[prepared.tracks[0].midi_instrument()?].effective[cutoff] == 1711. && stopped.devices[prepared.tracks[0].midi_instrument()?].effective[level] == 72.
        && stopped.devices[prepared.tracks[0].midi_instrument()?].owned[cutoff] == 0, "Stop did not clear voices and restore saved bases")?;
    host.mixer(0, 0.7, false, false)?;
    host.mixer(1, 0.7, false, false)?;
    transport(host,native::V4_START,0)?;
    // Start and Seek each reconstruct sources; separate their bounded work windows.
    render(1024, &[1024])?;
    let before_seek = workspace_state()?;
    let seek=transport(host,native::V4_SEEK,17)?;
    render(1, &[1])?;
    let queued=workspace_state()?;
    let target=queued.receipts.iter().find(|r|r.request_serial==seek.request_serial).ok_or("Seek receipt was not published")?.target_frame;
    require(target!=native::V4_NO_FRAME,"Seek receipt has no musical target")?;
    let remaining=(target+1).checked_sub(queued.absolute_frame).ok_or("Seek passed its observed target frame")?;
    render(remaining as usize,&[1024])?;
    let sought = workspace_state()?;
    require(sought.position == 18 && sought.absolute_frame==target+1 && sought.generation > before_seek.generation
        && sought.receipts.iter().any(|r|r.request_serial==seek.request_serial&&r.status==native::V4_APPLIED), &format!("Seek used the wrong frame/generation: position {}, absolute {}, target {}, generation {} -> {}, receipt {:?}",sought.position,sought.absolute_frame,target,before_seek.generation,sought.generation,sought.receipts.iter().find(|r|r.request_serial==seek.request_serial).map(|r|(r.status,r.error,r.target_frame))))?;

    let view = host.view()?;
    let saved = save(&output.join("reopened.alive"), &host.prepared.as_ref().unwrap().saved, view.path)?;
    let reopened = read(&saved)?;
    require(reopened.saved.score.tracks[0].instrument().ok_or("Missing proof instrument")?.parameters["cutoff"] == 1711.
        && reopened.saved.score.tracks[0].instrument().ok_or("Missing proof instrument")?.parameters["level"] == 72.
        && reopened.saved.score.sources == prepared.saved.score.sources, "Session reopen lost state")?;
    unsafe { native::ultra_audio_stop(); }
    host.install(reopened)?;
    start(host)?;
    let reopened_energy = energy(&render(4800, &[31, 64, 127])?);
    require(reopened_energy > 1e-9, "Reopened session did not play")?;
    let mut single = host.view()?.document.clone();
    single.tracks.truncate(1);let id=single.tracks[0].id.clone();single.sources.retain(|s|s.track_id()==id);single.placements.retain(|p|p.track_id==id);
    let one = prepare(&host.prepared.as_ref().unwrap().saved.with_score(single), &saved)?;
    unsafe { native::ultra_audio_stop(); }
    host.install(one)?;
    start(host)?;
    render(128, &[128])?;
    require(workspace_state()?.track_count == 1, "Removed device is still configured")?;
    unsafe { native::alive_session_stop(); }
    require(energy(&render(1024, &[1024])?) == 0., "Device removal/Stop retained notes")?;
    let boundary_proof = saved_device_boundaries(host, &prepared, output)?;

    let chain_proof = saved_chain_proof(host, &prepared, output)?;
    let report = json!({"passed":true,"scope":"real saved Alive session, native offline DSP; no physical audio or desktop claim",
        "source":path.canonicalize().map_err(|e|e.to_string())?,"devices":prepared.devices.iter().map(|t|json!({"path":t.path,"id":t.manifest.id,"output":t.manifest.output})).collect::<Vec<_>>(),
        "editorWindowsCreated":0,"sampleRate":48000,"masterChannels":2,"renderedFramesPerComparison":count,
        "partitions":partitions,"partitionSamplesIdentical":true,"audioSha256":digest(&baseline),
        "energy":{"twoDevices":energy(&baseline),"secondOnly":second_only,"reopened":reopened_energy},
        "loopProof":{"secondCycleEnergy":second_cycle,"wrapGenerations":wraps,"position":loop_end.position},
        "seekProof":{"generationAdvanced":sought.generation > before_seek.generation,"position":sought.position},
        "savedDeviceBoundaryProof":boundary_proof,"savedChainProof":chain_proof,
        "checked":["real-device-dependencies","loop","arbitrary-partitions","automation-ownership","device-isolation","mute-solo","stop","seek","session-save-reopen","device-removal"],
        "timingBoundaryOffsets":[0,1,31,63,64,127],"timingEvidence":"The current workspace probe measures workspace sample offsets with current saved-device manifests"});
    std::fs::write(output.join("report.json"), serde_json::to_vec_pretty(&report).unwrap()).map_err(|e|e.to_string())?;
    Ok(report)
}
