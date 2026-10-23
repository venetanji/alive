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
        for slot in 0..2 { crate::ultra_canvas_close_document(slot); }
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
    let mut document = source.document.clone();
    document.tempo = 120.; document.length_beats = 1.; document.loop_enabled = true;
    for (track, model) in document.tracks.iter_mut().enumerate() {
        model.gain = 0.7; model.mute = false; model.solo = false;
        model.notes = offsets.iter().enumerate().map(|(index, &frame)| super::Note {
            beat: frame as f64 / 24000., duration: 128. / 24000.,
            pitch: 60 + index as u32 + track as u32 * 12, velocity: 80 + index as u32 * 5,
        }).collect();
        model.automation = ["cutoff", "level"].iter().map(|&key| super::Lane {
            key: key.into(), enabled: true,
            points: offsets.iter().enumerate().map(|(index, &frame)| super::Point {
                beat: frame as f64 / 24000., value: if key == "cutoff" { 700. + index as f64 * 1000. + track as f64 * 100. }
                    else { 30. + index as f64 * 10. + track as f64 * 5. },
            }).collect(),
        }).collect();
    }
    let prepared = prepare(&document, &source.origin)?;
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
                let manifest = &prepared.tracks[track].manifest;
                let cutoff = manifest.parameters.iter().position(|p| p.key == "cutoff").unwrap();
                let level = manifest.parameters.iter().position(|p| p.key == "level").unwrap();
                let expected_cutoff = 700. + index as f64 * 1000. + track as f64 * 100.;
                let expected_level = 30. + index as f64 * 10. + track as f64 * 5.;
                require(state.tracks[track].effective[cutoff] == expected_cutoff
                    && state.tracks[track].effective[level] == expected_level,
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
pub fn run(path: &Path, output: &Path) -> Result<Value, String> {
    std::fs::create_dir_all(output).map_err(|e| e.to_string())?;
    let _shutdown = Shutdown;
    let prepared = read(path)?;
    require(prepared.tracks.len() == 2, "The session proof requires two saved device references")?;
    require(prepared.document.loop_enabled, "The session proof requires an enabled loop")?;
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
    let cutoff = prepared.tracks[0].manifest.parameters.iter().position(|p| p.key == "cutoff").ok_or("Proof requires cutoff binding")?;
    let level = prepared.tracks[0].manifest.parameters.iter().position(|p| p.key == "level").ok_or("Proof requires level binding")?;
    let before = native::state()?;
    host.base(0, "cutoff", 1711.)?;
    host.base(0, "level", 72.)?;
    render(1, &[1])?;
    let owned = native::state()?;
    require(owned.tracks[0].base[cutoff] == 1711. && owned.tracks[0].effective[cutoff] == before.tracks[0].effective[cutoff]
        && owned.tracks[0].owned[cutoff] == 1 && owned.tracks[0].base[level] == 72.
        && owned.tracks[0].effective[level] == before.tracks[0].effective[level], "Automation failed to retain ownership over a panel base edit")?;
    require(owned.tracks[1].base == before.tracks[1].base, "Editing the first device changed the second instance")?;
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
        && stopped.tracks[0].effective[cutoff] == 1711. && stopped.tracks[0].effective[level] == 72.
        && stopped.tracks[0].owned[cutoff] == 0, "Stop did not clear voices and restore saved bases")?;
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
    let saved = save(&output.join("reopened.alive"), view.document, view.path)?;
    let reopened = read(&saved)?;
    require(reopened.document.tracks[0].device.parameters["cutoff"] == 1711.
        && reopened.document.tracks[0].device.parameters["level"] == 72.
        && reopened.document.tracks[1].notes == prepared.document.tracks[1].notes, "Session reopen lost state")?;
    unsafe { native::ultra_audio_stop(); }
    host.install(reopened)?;
    start()?;
    let reopened_energy = energy(&render(4800, &[31, 64, 127])?);
    require(reopened_energy > 1e-9, "Reopened session did not play")?;
    let mut single = host.view()?.document.clone();
    single.tracks.truncate(1);
    let one = prepare(&single, &saved)?;
    unsafe { native::ultra_audio_stop(); }
    host.install(one)?;
    start()?;
    render(128, &[128])?;
    require(native::state()?.track_count == 1, "Removed device is still configured")?;
    unsafe { native::alive_session_stop(); }
    require(energy(&render(1024, &[1024])?) == 0., "Device removal/Stop retained notes")?;
    let boundary_proof = saved_device_boundaries(&mut host, &prepared, output)?;

    let report = json!({"passed":true,"scope":"real saved Alive session, native offline DSP; no physical audio or desktop claim",
        "source":path.canonicalize().map_err(|e|e.to_string())?,"devices":prepared.tracks.iter().map(|t|json!({"path":t.path,"id":t.manifest.id,"output":t.manifest.output})).collect::<Vec<_>>(),
        "editorWindowsCreated":0,"sampleRate":48000,"masterChannels":2,"renderedFramesPerComparison":count,
        "partitions":partitions,"partitionSamplesIdentical":true,"audioSha256":digest(&baseline),
        "energy":{"twoDevices":energy(&baseline),"secondOnly":second_only,"reopened":reopened_energy},
        "loopProof":{"secondCycleEnergy":second_cycle,"wrapGenerations":wraps,"position":loop_end.position},
        "seekProof":{"generationAdvanced":sought.generation > before_seek.generation,"position":sought.position},
        "savedDeviceBoundaryProof":boundary_proof,
        "checked":["real-device-dependencies","loop","arbitrary-partitions","automation-ownership","device-isolation","mute-solo","stop","seek","session-save-reopen","device-removal"],
        "timingBoundaryOffsets":[0,1,31,63,64,127],"timingEvidence":"alive_session_test.cpp measures native sample at offset and legacy Clockwork sample at offset+64; the session profile rejects legacy Voice"});
    std::fs::write(output.join("report.json"), serde_json::to_vec_pretty(&report).unwrap()).map_err(|e|e.to_string())?;
    Ok(report)
}
