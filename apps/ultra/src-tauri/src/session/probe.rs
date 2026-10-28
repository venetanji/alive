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
fn start() -> Result<(), String> {
    require(unsafe { native::ultra_external_start() } != 0, "Offline engine failed to start")?;
    require(unsafe { native::alive_session_start() } != 0, &native::error())
}
fn energy(wave: &[f32]) -> f64 { wave.iter().map(|&s| f64::from(s).powi(2)).sum::<f64>() / wave.len() as f64 }
fn digest(wave: &[f32]) -> String {
    let mut hash = Sha256::new();
    for sample in wave { hash.update(sample.to_le_bytes()); }
    format!("{:x}", hash.finalize())
}
fn saved_device_boundaries(host: &mut Host, source: &super::PreparedSession, output: &Path) -> Result<Value, String> {
    let offsets = [0u64, 1, 31, 63, 64, 127];
    let mut document = source.saved.score.clone();
    document.legacy_mut()?.tempo = 120.; document.legacy_mut()?.length_beats = 1.; document.legacy_mut()?.loop_enabled = true;
    for (track, model) in document.legacy_mut()?.tracks.iter_mut().enumerate() {
        model.gain = 0.7; model.mute = false; model.solo = false;
        model.notes = offsets.iter().enumerate().map(|(index, &frame)| super::Note {
            beat: frame as f64 / 24000., duration: 128. / 24000.,
            pitch: 60 + index as u32 + track as u32 * 12, velocity: 80 + index as u32 * 5,
        }).collect();
        model.automation = ["cutoff", "level"].iter().map(|&key| super::Lane {
            instance_id: model.device.instance_id.clone(), key: key.into(), enabled: true,
            points: offsets.iter().enumerate().map(|(index, &frame)| super::Point {
                beat: frame as f64 / 24000., value: if key == "cutoff" { 700. + index as f64 * 1000. + track as f64 * 100. }
                    else { 30. + index as f64 * 10. + track as f64 * 5. },
            }).collect(),
        }).collect();
    }
    let prepared = prepare(&source.saved.with_score(document), &source.origin)?;
    unsafe { native::ultra_audio_stop(); }
    host.install(prepared.clone())?; start()?;
    let mut baseline = Vec::with_capacity(1024);
    let mut observations = Vec::new();
    for frame in 0..512 {
        baseline.extend(render(1, &[1])?);
        if let Some(index) = offsets.iter().position(|&at| at == frame) {
            let state = native::state()?;
            require(state.position == frame + 1, "Saved-device boundary event used the wrong frame")?;
            for track in 0..2 {
                let manifest = &prepared.devices[prepared.tracks[track].midi_instrument()?].manifest;
                let cutoff = manifest.parameters.iter().position(|p| p.key == "cutoff").unwrap();
                let level = manifest.parameters.iter().position(|p| p.key == "level").unwrap();
                let expected_cutoff = 700. + index as f64 * 1000. + track as f64 * 100.;
                let expected_level = 30. + index as f64 * 10. + track as f64 * 5.;
                require(state.devices[prepared.tracks[track].midi_instrument()?].effective[cutoff] == expected_cutoff
                    && state.devices[prepared.tracks[track].midi_instrument()?].effective[level] == expected_level,
                    "Saved-device automation did not take effect on its timestamped sample")?;
                observations.push(json!({"frame":frame,"track":track,"effectiveCutoff":expected_cutoff,"effectiveLevel":expected_level}));
            }
        }
    }
    require(energy(&baseline) > 0., "Saved-device boundary fixture produced no audio")?;
    unsafe { native::ultra_audio_stop(); }
    host.install(prepared)?; start()?;
    let partitioned = render(512, &[17, 127, 64, 31, 1])?;
    require(baseline == partitioned, "Saved-device boundary fixture depends on buffer partitioning")?;
    crate::instrument_probe::write_wav(&output.join("boundary-events.wav"), &baseline).map_err(|e|e.to_string())?;
    Ok(json!({"offsets":offsets,"observations":observations,"partitionsIdentical":true,"audioSha256":digest(&baseline),"energy":energy(&baseline)}))
}
fn saved_chain_proof(host: &mut Host, source: &super::PreparedSession, output: &Path) -> Result<Value, String> {
    use super::{DeviceInstance, Lane, Note, Point, Track};
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
    let document = super::LegacySession { format:"alive-session-v2".into(), title:"Saved chain proof".into(), tempo:120., length_beats:1., loop_enabled:false,
        tracks:vec![Track { id:"probe-track".into(), name:"Saved impulse chain".into(), device:instrument, effects:vec![utility,filter],
            notes:vec![Note { beat:0., duration:1. / 24000., pitch:60, velocity:127 }], automation:vec![], gain:1., mute:false, solo:false }] };
    let origin = output.join("chain.alive");
    let document = super::Document::LegacyV2(document);
    let saved = save(&origin,&source.saved.with_score(document.clone()),&origin)?;
    let prepared = read(&saved)?;
    unsafe { native::ultra_audio_stop(); }
    host.install(prepared.clone())?; start()?;
    let wet = render(256,&[1])?;
    require(wet[2] > 0., "Saved lowpass did not ring after the impulse")?;
    let mut dry_document = prepared.saved.score.clone(); dry_document.legacy_mut()?.tracks[0].effects[1].bypassed = true;
    unsafe { native::ultra_audio_stop(); }
    host.install(prepare(&prepared.saved.with_score(dry_document),&saved)?)?; start()?;
    let dry = render(256,&[31,1,63,127])?;
    require(dry[0] > 0. && dry[2..].iter().all(|&s| s == 0.),"Saved bypass did not emit the exact dry impulse")?;
    unsafe { native::ultra_audio_stop(); }
    host.install(prepared.clone())?; start()?;
    let mut switched = render(31,&[17,1,13])?;
    host.bypass("probe-filter",true)?;
    switched.extend(render(33,&[1,31,1])?);
    require(switched[..62] == wet[..62] && switched[62..] == dry[62..128],"Live wet-to-dry samples did not change exactly at the callback boundary")?;
    host.bypass("probe-filter",false)?;
    let warm = render(192,&[63,1,127,1])?;
    require(warm == wet[128..],"Unbypassed saved filter did not retain continuously processed wet state")?;

    let mut ordered = document.clone();
    ordered.legacy_mut()?.tracks[0].automation.push(Lane { instance_id:"probe-utility".into(),key:"gain".into(),enabled:true,points:vec![Point { beat:1. / 24000.,value:0. }] });
    let forward = prepare(&prepared.saved.with_score(ordered.clone()),&saved)?;
    unsafe { native::ultra_audio_stop(); } host.install(forward.clone())?; start()?;
    let ringing = render(128,&[31,63,1])?;
    ordered.legacy_mut()?.tracks[0].effects.reverse();
    let reverse = prepare(&prepared.saved.with_score(ordered.clone()),&saved)?;
    let target = |p: &super::PreparedSession| p.events.iter().find(|e| e.kind == 1).map(|e| p.devices[e.device as usize].instance_id.clone());
    require(target(&forward) == target(&reverse) && target(&reverse).as_deref() == Some("probe-utility"),"Reorder changed automation ownership")?;
    unsafe { native::ultra_audio_stop(); } host.install(reverse)?; start()?;
    let suppressed = render(128,&[1,64,31])?;
    require(ringing[2] > 0. && suppressed[2..].iter().all(|&s| s == 0.),"Saved effect execution order did not preserve the noncommuting impulse tail")?;

    unsafe { native::ultra_audio_stop(); } host.install(prepared.clone())?; start()?;
    render(1,&[1])?;
    let before = native::state()?;
    let previous = host.prepared.as_ref().unwrap().saved.score.clone();
    let mut invalid = prepared.clone(); invalid.devices[0].graph.node_count = 0;
    require(host.install(invalid).is_err(),"Invalid prospective graph unexpectedly installed")?;
    require(host.prepared.as_ref().unwrap().saved.score == previous,"Rejected candidate changed saved model")?;
    let continued = render(1,&[1])?;
    require(continued == wet[2..4] && native::state()?.position == before.position+1,"Rejected candidate interrupted the active native session")?;
    let stale = native::state()?.devices[0];
    // Every admitted command updates the saved base, while queue rejection leaves it intact.
    for _ in 0..64 { host.base("probe-utility","gain",0.4)?; }
    require(host.base("probe-utility","gain",0.3).is_err(),"Saturated base queue did not reject")?;
    require(host.bypass("probe-filter",true).is_err(),"Saturated bypass queue did not reject")?;
    let model = &host.prepared.as_ref().unwrap().saved.score;
    require(model.legacy()?.tracks[0].effects[0].parameters["gain"] == 0.4 && !model.legacy()?.tracks[0].effects[1].bypassed,"Rejected live value leaked into saved state")?;
    unsafe { native::alive_session_stop(); }
    require(render(64,&[31,1,32])?.iter().all(|&s| s==0.) && native::state()?.playing==0,"Stop failed under saturated chain command queue")?;
    unsafe { native::ultra_audio_stop(); } host.install(prepared.clone())?;
    require(unsafe { native::alive_session_bypass_v2(stale.document,stale.revision,1) } == 0,"Reinstallation accepted a stale root handle")?;
    let saved = save(&output.join("chain-reopened.alive"),&host.prepared.as_ref().unwrap().saved,&saved)?;
    let reopened = read(&saved)?;
    require(reopened.saved.score.legacy()?.tracks[0].effects.len()==2,"Reopen lost saved effects")?;
    host.install(reopened)?; start()?;
    require(render(256,&[127,1,64])? == wet,"Reopened saved chain changed audio")?;
    let mut two = document.clone();
    let mut other = two.legacy_mut()?.tracks[0].clone(); other.id = "other-track".into(); other.name = "Independent identical sources".into();
    for device in other.devices_mut() { device.instance_id.push_str("-other"); }
    other.effects[0].parameters.insert("gain".into(),0.5);
    other.effects[1].parameters.insert("cutoff".into(),700.);
    two.legacy_mut()?.tracks.push(other);
    let six = prepare(&prepared.saved.with_score(two.clone()),&saved)?;
    unsafe { native::ultra_audio_stop(); } host.install(six.clone())?; start()?;
    let combined = render(128,&[31,1,64])?;
    let state = native::state()?;
    let first_filter = six.devices.iter().position(|d| d.instance_id=="probe-filter").unwrap();
    let other_filter = six.devices.iter().position(|d| d.instance_id=="probe-filter-other").unwrap();
    require(state.devices[first_filter].base[0]==2400. && state.devices[other_filter].base[0]==700.,"Identical source effects shared base state")?;
    let mut only_other = two.clone(); only_other.legacy_mut()?.tracks[0].mute = true;
    unsafe { native::ultra_audio_stop(); } host.install(prepare(&prepared.saved.with_score(only_other),&saved)?)?; start()?;
    let independent = render(128,&[1,127])?;
    require(combined.iter().zip(wet.iter().zip(&independent)).all(|(sum,(a,b))| (sum-a-b).abs()<1e-7),"Identical source effects shared filter tails or mixed a root twice")?;
    require(independent[2..].iter().zip(&wet[2..]).any(|(a,b)| a != b),"Distinct filter instances unexpectedly shared their tail")?;
    host.bypass("probe-filter-other",true)?; host.base("probe-filter","cutoff",1234.)?; render(1,&[1])?;
    let isolated = native::state()?;
    require(isolated.devices[first_filter].bypassed==0 && isolated.devices[other_filter].bypassed==1
        && isolated.devices[first_filter].base[0]==1234. && isolated.devices[other_filter].base[0]==700.,"Instance-specific bypass/base affected the other effect")?;
    Ok(json!({"savedDevices":3,"exactLiveDryAndWarmWet":true,"wetToDryFrame":31,"warmWetFrame":64,
        "reorderedAutomationIdentity":true,"noncommutingOrderTail":true,"independentSameSourceEffects":true,"fullProfileDevices":6,"rejectedCandidatePreservedPlayback":true,
        "queueRejectedModelPreserved":true,"stopSurvivedFullQueue":true,"staleRootRejected":true,"reopenSamplesIdentical":true,
        "wetSha256":digest(&wet),"drySha256":digest(&dry)}))
}

pub fn run(path: &Path, output: &Path) -> Result<Value, String> {
    std::fs::create_dir_all(output).map_err(|e| e.to_string())?;
    let _shutdown = Shutdown;
    let prepared = read(path)?;
    require(prepared.tracks.len() == 2, "The session proof requires two saved device references")?;
    require(prepared.saved.score.legacy()?.loop_enabled, "The session proof requires an enabled loop")?;
    let mut host = Host::default();
    host.install(prepared.clone())?;
    start()?;
    let loop_start = native::state()?;
    let count = prepared.length_frames as usize * 2 + 1024;
    let baseline = render(count, &[1024])?;
    let loop_end = native::state()?;
    let second_cycle = energy(&baseline[prepared.length_frames as usize * 2..prepared.length_frames as usize * 4]);
    let wraps = loop_end.generation.saturating_sub(loop_start.generation + 1);
    require(loop_end.playing == 1 && loop_end.position == count as u64 % prepared.length_frames
        && loop_end.absolute_frame - loop_start.absolute_frame == count as u64
        && wraps == count as u64 / prepared.length_frames && second_cycle > 1e-9,
        "Loop did not wrap on the expected frame/generation and produce second-cycle audio")?;
    require(energy(&baseline) > 1e-9, "Saved Alive session produced no sound")?;
    unsafe { native::ultra_audio_stop(); }
    host.install(prepared.clone())?;
    start()?;
    let partitions = [1, 31, 63, 64, 127, 1024, 17, 509];
    let partitioned = render(count, &partitions)?;
    require(baseline == partitioned, "Saved session changed samples with host-buffer partitioning")?;
    crate::instrument_probe::write_wav(&output.join("two-devices-notes-automation.wav"), &baseline).map_err(|e| e.to_string())?;

    unsafe { native::ultra_audio_stop(); }
    host.install(prepared.clone())?;
    start()?;
    render(128, &[128])?;
    let cutoff = prepared.devices[prepared.tracks[0].midi_instrument()?].manifest.parameters.iter().position(|p| p.key == "cutoff").ok_or("Proof requires cutoff binding")?;
    let level = prepared.devices[prepared.tracks[0].midi_instrument()?].manifest.parameters.iter().position(|p| p.key == "level").ok_or("Proof requires level binding")?;
    let before = native::state()?;
    host.base(&prepared.saved.score.legacy()?.tracks[0].device.instance_id, "cutoff", 1711.)?;
    host.base(&prepared.saved.score.legacy()?.tracks[0].device.instance_id, "level", 72.)?;
    render(1, &[1])?;
    let owned = native::state()?;
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
    let stopped = native::state()?;
    require(stopped.tracks.iter().all(|t| t.active_voices == 0)
        && stopped.devices[prepared.tracks[0].midi_instrument()?].effective[cutoff] == 1711. && stopped.devices[prepared.tracks[0].midi_instrument()?].effective[level] == 72.
        && stopped.devices[prepared.tracks[0].midi_instrument()?].owned[cutoff] == 0, "Stop did not clear voices and restore saved bases")?;
    host.mixer(0, 0.7, false, false)?;
    host.mixer(1, 0.7, false, false)?;
    require(unsafe { native::alive_session_start() } != 0, &native::error())?;
    render(128, &[128])?;
    let before_seek = native::state()?;
    require(unsafe { native::alive_session_seek(17) } != 0, &native::error())?;
    render(1, &[1])?;
    let sought = native::state()?;
    require(sought.position == 18 && sought.generation > before_seek.generation
        && sought.tracks.iter().all(|t| t.active_voices == 0), "Seek retained pre-seek notes or used the wrong frame/generation")?;

    let view = host.view()?;
    let saved = save(&output.join("reopened.alive"), &host.prepared.as_ref().unwrap().saved, view.path)?;
    let reopened = read(&saved)?;
    require(reopened.saved.score.legacy()?.tracks[0].device.parameters["cutoff"] == 1711.
        && reopened.saved.score.legacy()?.tracks[0].device.parameters["level"] == 72.
        && reopened.saved.score.legacy()?.tracks[1].notes == prepared.saved.score.legacy()?.tracks[1].notes, "Session reopen lost state")?;
    unsafe { native::ultra_audio_stop(); }
    host.install(reopened)?;
    start()?;
    let reopened_energy = energy(&render(4800, &[31, 64, 127])?);
    require(reopened_energy > 1e-9, "Reopened session did not play")?;
    let mut single = host.view()?.document.clone();
    single.legacy_mut()?.tracks.truncate(1);
    let one = prepare(&host.prepared.as_ref().unwrap().saved.with_score(single), &saved)?;
    unsafe { native::ultra_audio_stop(); }
    host.install(one)?;
    start()?;
    render(128, &[128])?;
    require(native::state()?.track_count == 1, "Removed device is still configured")?;
    unsafe { native::alive_session_stop(); }
    require(energy(&render(1024, &[1024])?) == 0., "Device removal/Stop retained notes")?;
    let boundary_proof = saved_device_boundaries(&mut host, &prepared, output)?;

    let chain_proof = saved_chain_proof(&mut host, &prepared, output)?;
    let report = json!({"passed":true,"scope":"real saved Alive session, native offline DSP; no physical audio or desktop claim",
        "source":path.canonicalize().map_err(|e|e.to_string())?,"devices":prepared.devices.iter().map(|t|json!({"path":t.path,"id":t.manifest.id,"output":t.manifest.output})).collect::<Vec<_>>(),
        "editorWindowsCreated":0,"sampleRate":48000,"masterChannels":2,"renderedFramesPerComparison":count,
        "partitions":partitions,"partitionSamplesIdentical":true,"audioSha256":digest(&baseline),
        "energy":{"twoDevices":energy(&baseline),"secondOnly":second_only,"reopened":reopened_energy},
        "loopProof":{"secondCycleEnergy":second_cycle,"wrapGenerations":wraps,"position":loop_end.position},
        "seekProof":{"generationAdvanced":sought.generation > before_seek.generation,"position":sought.position},
        "savedDeviceBoundaryProof":boundary_proof,"savedChainProof":chain_proof,
        "checked":["real-device-dependencies","loop","arbitrary-partitions","automation-ownership","device-isolation","mute-solo","stop","seek","session-save-reopen","device-removal"],
        "timingBoundaryOffsets":[0,1,31,63,64,127],"timingEvidence":"alive_session_test.cpp measures native sample at offset and legacy Clockwork sample at offset+64; the session profile rejects legacy Voice"});
    std::fs::write(output.join("report.json"), serde_json::to_vec_pretty(&report).unwrap()).map_err(|e|e.to_string())?;
    Ok(report)
}
