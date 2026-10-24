//! Offline host for the saved authored instrument, using the desktop admission path.
use crate::{canvas, document_windows::commands, documents};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{fs, io::Write, path::Path};

extern "C" {
    fn ultra_external_start() -> i32;
    fn ultra_external_render(frames: u32, left: *mut f32, right: *mut f32) -> i32;
    fn ultra_audio_stop();
}
struct NativeSession;
impl Drop for NativeSession {
    fn drop(&mut self) {
        unsafe {
            ultra_audio_stop();
            for document in 0..documents::MAX_DOCUMENTS as u32 { crate::ultra_canvas_close_document(document); }
        }
    }
}

struct Host {
    registry: documents::Registry,
    controls: [canvas::CanvasState; documents::MAX_DOCUMENTS],
    frames: usize,
}
impl Host {
    fn install(&mut self, label: &str) -> Result<documents::Document, String> {
        self.registry.prepare_runtime(label, |owner| commands::admit(&mut self.controls[owner.id as usize], owner,
            owner.patch.as_ref().unwrap(),None,true))
    }
    fn note(&self, label: &str, pitch: u32, velocity: u32) -> Result<(), String> {
        let owner=self.registry.get_open(label)?;
        let node=instrument_manifest(owner.patch.as_ref().unwrap())?.note_node
            .ok_or("Instrument probe requires an authored MIDI input")?;
        let message=self.controls[owner.id as usize].event(owner.runtime_revision,node,0,json!([pitch,velocity]))?;
        if unsafe {crate::ultra_canvas_message_document(owner.id,owner.runtime_revision,node,0,&message)}==0 {
            return Err("Probe note was not admitted".into());
        }
        Ok(())
    }
    fn stop(&self, label: &str) -> Result<(), String> {
        if unsafe {crate::ultra_canvas_stop_document(self.registry.get_open(label)?.id)}==0 { return Err("Probe Stop was not admitted".into()); }
        Ok(())
    }
    fn commit(&mut self, label: &str, patch: Value, parameter: Option<&commands::Parameter>) -> Result<(), String> {
        let base=self.registry.get_open(label)?.authoring_revision;
        let result=self.registry.commit(label,base,patch,true,|owner,patch|
            commands::admit(&mut self.controls[owner.id as usize],owner,patch,parameter,false))?;
        if !result.accepted { return Err("Probe authoring revision conflict".into()); }
        Ok(())
    }
    fn parameter(&mut self, label: &str, binding: &Value, value: f64) -> Result<(), String> {
        let owner=self.registry.get_open(label)?;
        let revision=owner.runtime_revision;
        let mut patch=owner.patch.clone().unwrap();
        let node=binding["node"].as_u64().unwrap() as u32;
        let key=binding["param"].as_str().unwrap();
        if !edit_parameter(&mut patch,node,key,value) { return Err("Probe binding node disappeared".into()); }
        self.commit(label,patch,Some(&commands::Parameter {node,key:key.into(),value,hot:false}))?;
        if self.registry.get_open(label)?.runtime_revision!=revision { return Err("Live parameter edit replaced the graph".into()); }
        Ok(())
    }
    fn render(&mut self, frames: usize, output: &Path, name: &str) -> Result<f64, String> {
        let mut left=[0f32;256];let mut right=[0f32;256];let mut wave=Vec::with_capacity(frames*2);
        for offset in (0..frames).step_by(256) {
            let count=256.min(frames-offset);
            if unsafe {ultra_external_render(count as u32,left.as_mut_ptr(),right.as_mut_ptr())}==0 {
                return Err("Native offline render was refused".into());
            }
            for index in 0..count {
                if !left[index].is_finite() || !right[index].is_finite() { return Err("Native render returned a nonfinite sample".into()); }
                wave.extend_from_slice(&[left[index],right[index]]);
            }
        }
        self.frames+=frames;
        let energy=wave.iter().map(|sample| f64::from(*sample).powi(2)).sum::<f64>()/wave.len() as f64;
        write_wav(&output.join(format!("{name}.wav")),&wave).map_err(|error|error.to_string())?;
        Ok(energy)
    }
}

fn edit_parameter(scope: &mut Value, id: u32, key: &str, value: f64) -> bool {
    let Some(nodes)=scope.get_mut("nodes").and_then(Value::as_array_mut) else { return false; };
    for node in nodes {
        if node["id"].as_u64()==Some(u64::from(id)) {node["params"][key]=json!(value);return true;}
        if let Some(child)=node.get_mut("patcher") { if edit_parameter(child,id,key,value) {return true;} }
    }
    false
}
fn remove_input(scope: &mut Value, id: u32) -> bool {
    if let Some(edges)=scope.get_mut("edges").and_then(Value::as_array_mut) {
        if let Some(index)=edges.iter().position(|edge|edge["to"].as_u64()==Some(u64::from(id)) && edge["inlet"]==0) {
            edges.remove(index);return true;
        }
    }
    let Some(nodes)=scope.get_mut("nodes").and_then(Value::as_array_mut) else { return false; };
    nodes.iter_mut().filter_map(|node|node.get_mut("patcher")).any(|child|remove_input(child,id))
}
pub(crate) fn write_wav(path: &Path, samples: &[f32]) -> std::io::Result<()> {
    let bytes=(samples.len()*4) as u32;let mut file=fs::File::create(path)?;
    file.write_all(b"RIFF")?;file.write_all(&(36+bytes).to_le_bytes())?;file.write_all(b"WAVEfmt ")?;
    file.write_all(&16u32.to_le_bytes())?;file.write_all(&3u16.to_le_bytes())?;file.write_all(&2u16.to_le_bytes())?;
    file.write_all(&48000u32.to_le_bytes())?;file.write_all(&(48000u32*8).to_le_bytes())?;
    file.write_all(&8u16.to_le_bytes())?;file.write_all(&32u16.to_le_bytes())?;file.write_all(b"data")?;file.write_all(&bytes.to_le_bytes())?;
    for sample in samples {file.write_all(&sample.to_le_bytes())?;}
    Ok(())
}
fn require(condition: bool, message: &str) -> Result<(), String> { if condition {Ok(())}else{Err(message.into())} }

fn instrument_manifest(source: &Value) -> Result<canvas::device::HostManifest, String> {
    let prepared=canvas::prepare(source.clone())?;
    let manifest=canvas::device::host_manifest(source,&prepared.native)?;
    if manifest.kind!=canvas::device::DeviceKind::Instrument {
        return Err("Instrument probe supports instruments only; an audio effect requires host audio input".into());
    }
    Ok(manifest)
}

pub fn run(path: &Path, output: &Path) -> Result<Value, String> {
    let loaded=documents::read_patch(path)?;
    let source=loaded.patch.ok_or("Instrument probe requires an authored Ultra patch")?;
    instrument_manifest(&source)?;
    let manifest=source.get("device").ok_or("Instrument probe requires a device manifest")?.clone();
    let bindings=manifest["parameters"].as_array().unwrap();
    let binding=|param:&str| bindings.iter().find(|row|row["param"]==param).cloned()
        .ok_or_else(||format!("Instrument probe requires a {param} binding"));
    let cutoff=binding("cutoff")?;let attack=binding("attack")?;let level=binding("value")?;
    require(level["min"].as_f64()==Some(0.),"Instrument probe requires a level binding whose minimum is zero")?;
    fs::create_dir_all(output).map_err(|error|error.to_string())?;
    unsafe {
        ultra_audio_stop();
        for document in 0..documents::MAX_DOCUMENTS as u32 {crate::ultra_canvas_close_document(document);}
        crate::ultra_audio_routes(3);
    }
    let _session=NativeSession;
    if unsafe {ultra_external_start()}==0 { return Err("Native offline host failed to start".into()); }
    let mut host=Host {registry:documents::Registry::default(),controls:std::array::from_fn(|_|canvas::CanvasState::default()),frames:0};
    let first=host.registry.add("Headless source".into(),documents::Kind::Patch,Some(source.clone()),Some(loaded.path.clone()),None)?;
    let second=host.registry.instantiate(&first.label)?;
    require(first.id!=second.id && second.path.is_none(),"Native roots must have independent identities and file ownership")?;
    host.install(&first.label)?;host.install(&second.label)?;
    let a=&first.label;let b=&second.label;
    let silent=host.render(1024,output,"initial-silence")?;
    require(silent==0.,"Saved instrument sounds before MIDI ingress")?;
    host.note(a,69,100)?;
    let baseline=host.render(24000,output,"baseline")?;
    require(baseline>1e-9,"Saved instrument produced no audible samples")?;
    let revision=host.registry.get_open(a)?.runtime_revision;
    let mut metadata=host.registry.get_open(a)?.patch.clone().unwrap();
    metadata["device"]["name"]=json!("Headless manifest edit");host.commit(a,metadata,None)?;
    require(host.registry.get_open(a)?.runtime_revision==revision,"Metadata edit replaced the native graph")?;
    let metadata_live=host.render(12000,output,"metadata-edit-held-note")?;
    require(metadata_live>1e-9,"Metadata edit cleared the held native note")?;
    host.note(b,72,100)?;let mixed=host.render(12000,output,"two-instances")?;
    host.parameter(a,&level,0.)?;
    let second_only=host.render(12000,output,"instance-b-after-muting-a")?;
    require(second_only>1e-9,"Changing instance A level muted instance B")?;
    host.stop(b)?;
    let both_silent=host.render(1024,output,"b-stopped-a-muted")?;
    require(both_silent==0.,"Instance A level edit did not mute its authored audio path")?;
    host.parameter(a,&level,level["max"].as_f64().unwrap())?;
    let resumed=host.render(12000,output,"a-resumes-held-note")?;
    require(resumed>1e-9,"Stopping instance B cleared instance A voice state")?;
    unsafe {require(crate::ultra_canvas_close_document(second.id)!=0,"Instance B close failed")?;}
    host.registry.remove(b);
    let after_close=host.render(12000,output,"a-after-b-close")?;
    require(after_close>1e-9,"Closing instance B stopped instance A")?;

    host.parameter(a,&cutoff,cutoff["max"].as_f64().unwrap())?;
    host.render(12000,output,"filter-high-settle")?;
    let filter_high=host.render(12000,output,"filter-high")?;
    host.parameter(a,&cutoff,cutoff["min"].as_f64().unwrap())?;
    host.render(24000,output,"filter-low-settle")?;
    let filter_low=host.render(12000,output,"filter-low")?;
    require(filter_low<filter_high*0.25,"Saved cutoff binding did not audibly change the authored filter")?;
    host.parameter(a,&cutoff,cutoff["max"].as_f64().unwrap())?;
    host.stop(a)?;host.render(1024,output,"before-envelope")?;
    host.parameter(a,&attack,attack["min"].as_f64().unwrap())?;host.note(a,69,100)?;
    let attack_fast=host.render(4800,output,"attack-fast")?;
    host.stop(a)?;host.render(1024,output,"between-envelopes")?;
    host.parameter(a,&attack,attack["max"].as_f64().unwrap())?;host.note(a,69,100)?;
    let attack_slow=host.render(4800,output,"attack-slow")?;
    require(attack_slow<attack_fast*0.25,"Saved attack binding did not audibly change the authored envelope")?;
    host.stop(a)?;host.render(1024,output,"before-presets")?;
    let revision=host.registry.get_open(a)?.runtime_revision;
    for preset in manifest["presets"].as_array().unwrap() {
        for row in bindings { host.parameter(a,row,preset["values"][row["key"].as_str().unwrap()].as_f64().unwrap())?; }
    }
    require(host.registry.get_open(a)?.runtime_revision==revision,"Preset recall replaced native voice state")?;

    let connected=host.registry.get_open(a)?.patch.clone().unwrap();
    let graph=canvas::prepare(connected.clone())?;
    let mix=graph.native.nodes[..graph.native.node_count as usize].iter().find(|node|node.kind==65)
        .ok_or("Instrument probe requires an authored mix.voice~ node")?.id;
    let mut disconnected=connected.clone();
    require(remove_input(&mut disconnected,mix),"Authored mix input cable is missing")?;
    host.commit(a,disconnected,None)?;host.note(a,69,100)?;
    let disconnected_energy=host.render(24000,output,"required-cable-disconnected")?;
    require(disconnected_energy==0.,"Disconnecting the saved voice audio cable did not silence rendering")?;
    host.commit(a,connected,None)?;host.note(a,69,100)?;
    let restored=host.render(24000,output,"required-cable-restored")?;
    require(restored>1e-9,"Restoring the authored cable did not restore instrument output")?;
    host.stop(a)?;let stopped=host.render(1024,output,"stopped")?;
    require(stopped==0.,"Document Stop did not terminate the instrument")?;
    let report=json!({"passed":true,"scope":"standalone native authored graph; no Alive session host or hardware timing claim",
        "source":loaded.path,"canonicalDocumentSha256":format!("{:x}",Sha256::digest(serde_json::to_vec(&source).unwrap())),
        "device":manifest["id"],"editorWindowsCreated":0,"instances":[first.id,second.id],
        "sampleRate":48000,"channels":2,"format":"IEEE float32 WAV","blockFrames":256,"renderedFrames":host.frames,
        "presetCount":manifest["presets"].as_array().unwrap().len(),"liveParameterAndPresetRevisionsPreserved":true,"metadataEditsPreservedRuntime":true,
        "energy":{"initial":silent,"baseline":baseline,"metadataEditHeldNote":metadata_live,"mixed":mixed,"secondAfterFirstMuted":second_only,
            "firstMutedSecondStopped":both_silent,"firstResumed":resumed,"firstAfterSecondClosed":after_close,
            "filterHigh":filter_high,"filterLow":filter_low,"attackFast":attack_fast,"attackSlow":attack_slow,
            "disconnected":disconnected_energy,"restored":restored,"stopped":stopped}});
    fs::write(output.join("report.json"),serde_json::to_vec_pretty(&report).unwrap()).map_err(|error|error.to_string())?;
    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn version_two_instrument_uses_the_normalized_midi_entry_in_headless_render() {
        const NAME: &str="instrument_probe::tests::version_two_instrument_uses_the_normalized_midi_entry_in_headless_render";
        if std::env::var("ULTRA_V2_PROBE_TEST_PROCESS").as_deref()!=Ok("1") {
            let child=std::process::Command::new(std::env::current_exe().unwrap()).args(["--exact",NAME,"--nocapture"])
                .env("ULTRA_V2_PROBE_TEST_PROCESS","1").env_remove("DISPLAY").env_remove("WAYLAND_DISPLAY").output().unwrap();
            assert!(child.status.success(),"{}\n{}",String::from_utf8_lossy(&child.stdout),String::from_utf8_lossy(&child.stderr));return;
        }
        let path=Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples/subtractive.ultra");
        let mut patch: Value=serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
        let d=&mut patch["device"];d["version"]=json!(2);d["kind"]=json!("instrument");
        d["midi"]=json!({"input":d["midi"].clone(),"output":null});d["audio"]=json!({"input":null,"output":{"channels":2,"layout":"stereo"}});
        let folder=std::env::temp_dir().join(format!("ultra-v2-instrument-probe-{}",std::process::id()));
        fs::create_dir_all(&folder).unwrap();let source=folder.join("source.ultra");fs::write(&source,serde_json::to_vec(&patch).unwrap()).unwrap();
        assert_eq!(run(&source,&folder.join("render")).unwrap()["passed"],true);fs::remove_dir_all(folder).unwrap();
    }
    #[test]
    fn effects_are_rejected_by_the_instrument_probe_before_rendering() {
        let source=Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples/utility.ultra");
        let output=std::env::temp_dir().join(format!("ultra-effect-probe-{}",std::process::id()));
        let error=run(&source,&output).unwrap_err();
        assert!(error.contains("instrument")&&error.contains("audio effect"),"{error}");
        assert!(!output.exists());
    }
    #[test]
    fn saved_instrument_renders_headlessly_with_independent_instances_and_authored_cables() {
        // The native workspace retains revisions after close. Give this host its
        // own process, as the CLI does, without touching other FFI tests' roots.
        if std::env::var("ULTRA_INSTRUMENT_PROBE_TEST_PROCESS").as_deref()!=Ok("1") {
            let child=std::process::Command::new(std::env::current_exe().unwrap())
                .args(["--exact","instrument_probe::tests::saved_instrument_renders_headlessly_with_independent_instances_and_authored_cables","--nocapture"])
                .env("ULTRA_INSTRUMENT_PROBE_TEST_PROCESS","1").env_remove("DISPLAY").env_remove("WAYLAND_DISPLAY")
                .output().unwrap();
            assert!(child.status.success(),"{}\n{}",String::from_utf8_lossy(&child.stdout),String::from_utf8_lossy(&child.stderr));
            return;
        }
        let path=Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples/subtractive.ultra");
        let output=std::env::temp_dir().join(format!("ultra-instrument-probe-{}",std::process::id()));
        let report=run(&path,&output).unwrap();
        assert_eq!(report["passed"],true);assert_eq!(report["editorWindowsCreated"],0);
        assert_eq!(report["liveParameterAndPresetRevisionsPreserved"],true);
        assert_ne!(report["instances"][0],report["instances"][1]);
        let wave=fs::read(output.join("required-cable-restored.wav")).unwrap();
        assert_eq!(&wave[..4],b"RIFF");assert_eq!(wave.len(),44+24000*2*4);
        assert!(output.join("report.json").is_file());fs::remove_dir_all(output).unwrap();
    }
}
