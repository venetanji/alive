//! Device I/O and preferences belong to Rust; the prepared native DSP stays at 48 kHz.
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, sync::{Arc, atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering}}};

const RATE: u32 = 48_000;
const BLOCK: usize = 1024;
const MAX_CALLBACK: usize = 16_384;
extern "C" {
    fn ultra_external_start() -> i32;
    fn ultra_external_render(frames: u32, left: *mut f32, right: *mut f32) -> i32;
    fn ultra_audio_stop();
    fn ultra_audio_panic();
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Config {
    pub host: String,
    pub device: String,
    pub sample_rate: u32,
    pub buffer_frames: Option<u32>,
}
impl Default for Config {
    fn default() -> Self {
        Self { host: "default".into(), device: "default".into(), sample_rate: RATE, buffer_frames: None }
    }
}
impl Config {
    fn validate(&self) -> Result<(), String> {
        if self.sample_rate != RATE { return Err("The current DSP core supports 48,000 Hz. Choose 48 kHz.".into()); }
        if self.host.is_empty() || self.host.len() > 64 || self.device.is_empty() || self.device.len() > 2048 {
            return Err("Invalid audio host or output device identifier.".into());
        }
        if self.buffer_frames.is_some_and(|n| !(32..=8192).contains(&n)) {
            return Err("Buffer size must be automatic or 32 to 8192 frames.".into());
        }
        Ok(())
    }
}

#[derive(Serialize)]
pub struct DeviceInfo { id: String, name: String, compatible: bool }
#[derive(Serialize)]
pub struct Catalog {
    pub config: Config,
    hosts: Vec<String>,
    effective_host: String,
    devices: Vec<DeviceInfo>,
    pub notice: String,
}
#[derive(Default)]
struct Metrics {
    frames: AtomicU32,
    callbacks: AtomicU64,
    errors: AtomicU32,
    failed: AtomicBool,
}
#[derive(Serialize)]
pub struct Snapshot {
    pub config: Config,
    pub host: String,
    pub device: String,
    pub observed_buffer_frames: u32,
    pub callbacks: u64,
    pub stream_errors: u32,
    pub failed: bool,
    pub message: String,
}
pub struct Driver {
    config: Config,
    path: PathBuf,
    stream: Option<cpal::Stream>,
    metrics: Arc<Metrics>,
    host: String,
    device: String,
    message: String,
}
fn host(name: &str) -> Result<cpal::Host, String> {
    if name == "default" { return Ok(cpal::default_host()); }
    let id = cpal::available_hosts().into_iter().find(|id| id.name() == name)
        .ok_or_else(|| "Audio host is unavailable. Refresh devices and choose an available host.".to_string())?;
    cpal::host_from_id(id).map_err(|e| format!("Cannot open audio host: {e}"))
}
fn output(host: &cpal::Host, id: &str) -> Result<cpal::Device, String> {
    if id == "default" {
        return host.default_output_device().ok_or_else(|| "No default output device. Connect an output, then refresh devices.".into());
    }
    let id = id.parse().map_err(|_| "Invalid output device identifier.".to_string())?;
    host.device_by_id(&id).ok_or_else(|| "The selected output is disconnected. Refresh devices and select an output.".into())
}
fn rank(format: cpal::SampleFormat) -> u8 {
    match format { cpal::SampleFormat::F32 => 0, cpal::SampleFormat::I16 => 1,
        cpal::SampleFormat::I32 => 2, cpal::SampleFormat::U16 => 3,
        cpal::SampleFormat::F64 => 4, _ => 255 }
}
fn admits(range: &cpal::SupportedStreamConfigRange, buffer: Option<u32>) -> bool {
    range.channels() == 2 && range.min_sample_rate() <= RATE && range.max_sample_rate() >= RATE
        && rank(range.sample_format()) != 255
        && match (buffer, range.buffer_size()) {
            (Some(n), cpal::SupportedBufferSize::Range { min, max }) => n >= *min && n <= *max,
            _ => true,
        }
}
fn format(device: &cpal::Device, config: &Config) -> Result<cpal::SampleFormat, String> {
    device.supported_output_configs().map_err(|e| format!("Cannot query output formats: {e}"))?
        .filter(|r| admits(r, config.buffer_frames)).min_by_key(|r| rank(r.sample_format()))
        .map(|r| r.sample_format()).ok_or_else(|| "This output does not advertise stereo 48 kHz with this buffer. Try Automatic or another output.".into())
}

impl Driver {
    pub fn load(path: PathBuf) -> Self {
        let loaded = std::fs::read(&path).map_err(|e| e.to_string()).and_then(|bytes| {
            if bytes.len() > 8192 { return Err("settings file exceeds 8 KiB".into()); }
            let config: Config = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
            config.validate()?; Ok(config)
        });
        let (config, message) = match loaded {
            Ok(c) => (c, "Saved audio configuration loaded. Audio is off.".into()),
            Err(_) if !path.exists() => (Config::default(), "Choose an output, then start audio.".into()),
            Err(e) => (Config::default(), format!("Saved audio configuration could not be read ({e}). Choose and save new settings.")),
        };
        Self { config, path, stream: None, metrics: Arc::default(), host: String::new(), device: String::new(), message }
    }
    pub fn catalog(&self, selected_host: &str) -> Result<Catalog, String> {
        // Discovery failures must not hide the hosts needed for explicit recovery.
        // Never resolve a stale selection to a different host or device here.
        let mut catalog = Catalog { config: self.config.clone(),
            hosts: cpal::available_hosts().iter().map(|h| h.name().into()).collect(),
            effective_host: String::new(), devices: Vec::new(), notice: self.message.clone() };
        let host = match host(selected_host) {
            Ok(host) => host,
            Err(error) => { catalog.notice = error; return Ok(catalog); }
        };
        catalog.effective_host = host.id().name().into();
        let outputs = match host.output_devices() {
            Ok(outputs) => outputs,
            Err(error) => {
                catalog.notice = format!("Cannot list output devices: {error}. Refresh devices or choose another host.");
                return Ok(catalog);
            }
        };
        if let Some(d) = host.default_output_device() {
            catalog.devices.push(DeviceInfo { id: "default".into(), name: format!("System default - {d}"), compatible: format(&d, &Config::default()).is_ok() });
        }
        for d in outputs {
            if let Ok(id) = d.id() {
                catalog.devices.push(DeviceInfo { id: id.to_string(), name: d.to_string(), compatible: format(&d, &Config::default()).is_ok() });
            }
        }
        Ok(catalog)
    }

    pub fn configure(&mut self, config: Config) -> Result<(), String> {
        if self.stream.is_some() { return Err("Stop audio before changing its configuration.".into()); }
        config.validate()?;
        format(&output(&host(&config.host)?, &config.device)?, &config)?;
        let bytes = serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?;
        if let Some(parent) = self.path.parent() { std::fs::create_dir_all(parent).map_err(|e| format!("Cannot save audio settings: {e}"))?; }
        let temporary = self.path.with_extension("json.tmp");
        std::fs::write(&temporary, bytes).and_then(|_| std::fs::rename(&temporary, &self.path))
            .map_err(|e| format!("Cannot save audio settings: {e}"))?;
        self.config = config; self.message = "Audio settings saved. Start audio when ready.".into();
        Ok(())
    }
    pub fn start(&mut self) -> Result<(), String> {
        if self.stream.is_some() { return Ok(()); }
        let result = self.start_stream();
        if let Err(e) = &result { self.message = e.clone(); }
        result
    }
    fn start_stream(&mut self) -> Result<(), String> {
        self.config.validate()?;
        let host = host(&self.config.host)?;
        let device = output(&host, &self.config.device)?;
        let sample_format = format(&device, &self.config)?;
        self.metrics = Arc::default();
        if unsafe { ultra_external_start() } == 0 { return Err("The DSP engine could not initialize. Audio remains off.".into()); }
        let config = cpal::StreamConfig { channels: 2, sample_rate: RATE,
            buffer_size: self.config.buffer_frames.map(cpal::BufferSize::Fixed).unwrap_or(cpal::BufferSize::Default) };
        let metrics = self.metrics.clone();
        let stream = match sample_format {
            cpal::SampleFormat::F32 => build::<f32>(&device, config, metrics),
            cpal::SampleFormat::F64 => build::<f64>(&device, config, metrics),
            cpal::SampleFormat::I16 => build::<i16>(&device, config, metrics),
            cpal::SampleFormat::I32 => build::<i32>(&device, config, metrics),
            cpal::SampleFormat::U16 => build::<u16>(&device, config, metrics),
            _ => unreachable!(),
        };
        let stream = match stream {
            Ok(s) => s,
            Err(e) => { unsafe { ultra_audio_stop(); } return Err(format!("Cannot open output: {e}. Try Automatic buffer size or another output.")); }
        };
        if let Err(e) = stream.play() {
            drop(stream); unsafe { ultra_audio_stop(); }
            return Err(format!("Cannot start output: {e}. Check the output connection and try again."));
        }
        self.host = host.id().name().into(); self.device = device.to_string();
        self.stream = Some(stream); self.message = "Audio output is running.".into();
        Ok(())
    }
    pub fn stop(&mut self) {
        // Stream drop retires its callback before native state is reclaimed.
        self.stream.take();
        unsafe { ultra_audio_stop(); }
        self.metrics = Arc::default();
        self.message = "Audio is off.".into();
    }
    pub fn snapshot(&self) -> Snapshot {
        let failed = self.metrics.failed.load(Ordering::Acquire);
        Snapshot { config: self.config.clone(), host: self.host.clone(), device: self.device.clone(),
            observed_buffer_frames: self.metrics.frames.load(Ordering::Relaxed),
            callbacks: self.metrics.callbacks.load(Ordering::Relaxed),
            stream_errors: self.metrics.errors.load(Ordering::Relaxed), failed,
            message: if failed { "Audio output stopped after a stream error. Stop audio, refresh devices, then start again.".into() } else { self.message.clone() } }
    }
}
impl Drop for Driver { fn drop(&mut self) { if self.stream.is_some() { self.stop(); } } }

// No heap allocation, locks, logging, device discovery or settings I/O in this callback.
fn fill<T: cpal::SizedSample + cpal::FromSample<f32>>(data: &mut [T], metrics: &Metrics,
    left: &mut [f32; BLOCK], right: &mut [f32; BLOCK], mut render: impl FnMut(u32, *mut f32, *mut f32) -> i32) {
    data.fill(T::EQUILIBRIUM);
    if metrics.failed.load(Ordering::Acquire) { return; }
    if data.len() % 2 != 0 || data.len() / 2 > MAX_CALLBACK {
        metrics.errors.fetch_add(1, Ordering::Relaxed); metrics.failed.store(true, Ordering::Release);
        unsafe { ultra_audio_panic(); } return;
    }
    metrics.frames.store((data.len() / 2) as u32, Ordering::Relaxed);
    metrics.callbacks.fetch_add(1, Ordering::Relaxed);
    let mut admitted = true;
    for chunk in data.chunks_mut(BLOCK * 2) {
        let frames = chunk.len() / 2;
        if render(frames as u32, left.as_mut_ptr(), right.as_mut_ptr()) == 0 { admitted = false; break; }
        for (i, output) in chunk.chunks_exact_mut(2).enumerate() {
            output[0] = T::from_sample(clean(left[i])); output[1] = T::from_sample(clean(right[i]));
        }
    }
    if !admitted { data.fill(T::EQUILIBRIUM); }
}
fn clean(sample: f32) -> f32 { if sample.is_finite() { sample.clamp(-1., 1.) } else { 0. } }
fn build<T: cpal::SizedSample + cpal::FromSample<f32>>(device: &cpal::Device, config: cpal::StreamConfig, metrics: Arc<Metrics>) -> Result<cpal::Stream, cpal::Error> {
    let errors = metrics.clone(); let mut left = [0.; BLOCK]; let mut right = [0.; BLOCK];
    device.build_output_stream(config, move |data: &mut [T], _| {
        fill(data, &metrics, &mut left, &mut right, |n,l,r| unsafe { ultra_external_render(n,l,r) });
    }, move |error| {
        errors.errors.fetch_add(1, Ordering::Relaxed);
        if error.kind() == cpal::ErrorKind::Xrun { return; }
        errors.failed.store(true, Ordering::Release);
        unsafe { ultra_audio_panic(); }
    }, None)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn configuration_rejects_unsupported_rates_buffers_and_fields() {
        let mut c = Config::default(); assert!(c.validate().is_ok());
        c.sample_rate = 44100; assert!(c.validate().is_err()); c.sample_rate = RATE;
        c.buffer_frames = Some(16); assert!(c.validate().is_err());
        c.buffer_frames = Some(8192); assert!(c.validate().is_ok());
        assert!(serde_json::from_str::<Config>(r#"{"host":"default","device":"default","sample_rate":48000,"buffer_frames":null,"oops":1}"#).is_err());
    }
    #[test]
    fn callback_partitions_stereo_and_converts_without_losing_frames() {
        let metrics = Metrics::default(); let mut left = [0.; BLOCK]; let mut right = [0.; BLOCK];
        let mut output = vec![0i16; 4099 * 2]; let mut calls = Vec::new();
        fill(&mut output, &metrics, &mut left, &mut right, |n,l,r| {
            calls.push(n); unsafe { for i in 0..n as usize { *l.add(i) = 0.5; *r.add(i) = -0.5; } } 1
        });
        assert_eq!(calls, [1024,1024,1024,1024,3]);
        assert!(output.chunks_exact(2).all(|x| x == [16384,-16384]));
        assert_eq!(metrics.frames.load(Ordering::Relaxed),4099);
    }
    #[test]
    fn disconnected_or_stale_device_is_not_silently_replaced() {
        assert!(host("missing-host").is_err());
        let mut config = Config::default(); config.device = "".into();
        assert!(config.validate().is_err());
        assert_eq!(clean(f32::NAN),0.); assert_eq!(clean(2.),1.);
    }
    #[test]
    fn unavailable_saved_host_catalog_keeps_preferences_and_lists_recovery_hosts() {
        let path = std::env::temp_dir().join(format!("ultra-stale-host-{}.json", std::process::id()));
        let config = Config { host: "missing-host".into(), device: "saved-output".into(), ..Config::default() };
        let bytes = serde_json::to_vec(&config).unwrap();
        std::fs::write(&path, &bytes).unwrap();
        let driver = Driver::load(path.clone());
        let catalog = driver.catalog(&config.host).expect("host failure must not hide recovery choices");
        assert_eq!(catalog.config, config);
        assert_eq!(catalog.hosts, cpal::available_hosts().iter().map(|h| h.name().to_string()).collect::<Vec<_>>());
        assert!(catalog.devices.is_empty());
        assert!(catalog.effective_host.is_empty());
        assert!(catalog.notice.contains("Audio host is unavailable"));
        assert_eq!(driver.config, config);
        assert_eq!(std::fs::read(&path).unwrap(), bytes);
        std::fs::remove_file(path).unwrap();
    }
    #[test]
    fn native_failure_silences_the_whole_device_callback() {
        let metrics = Metrics::default(); let mut l = [0.; BLOCK]; let mut r = [0.; BLOCK];
        let mut output = vec![0f32; 2048 * 2]; let mut calls = 0;
        fill(&mut output, &metrics, &mut l, &mut r, |n,left,right| {
            calls += 1;
            unsafe { for i in 0..n as usize { *left.add(i) = 0.8; *right.add(i) = 0.8; } }
            if calls == 2 { 0 } else { 1 }
        });
        assert!(output.iter().all(|x| *x == 0.));
    }
    #[test]
    fn invalid_saved_settings_use_defaults_without_rewriting_user_data() {
        let p = std::env::temp_dir().join(format!("ultra-invalid-audio-{}.json",std::process::id()));
        std::fs::write(&p,b"invalid settings").unwrap();
        let d = Driver::load(p.clone());
        assert_eq!(d.config,Config::default());
        assert!(d.snapshot().message.contains("could not be read"));
        assert_eq!(std::fs::read(&p).unwrap(),b"invalid settings");
        std::fs::remove_file(p).unwrap();
    }
    #[test]
    #[ignore = "requires the private software-only PipeWire graph from check_cpal_audio.sh"]
    fn private_software_output() {
        assert_eq!(std::env::var("PIPEWIRE_REMOTE").unwrap(),"ultra-audio-test");
        assert!(std::env::var("PIPEWIRE_RUNTIME_DIR").unwrap().starts_with("/tmp/ultra-cpal."));
        extern "C" { fn ultra_audio_routes(mask:u32); fn ultra_audio_event(d:u32,k:u32,n:u32,v:u32)->i32; fn ultra_audio_frames()->u64; }
        let p = PathBuf::from(std::env::var("ULTRA_AUDIO_PROBE_SETTINGS").unwrap());
        let mut driver = Driver::load(p.clone());
        let catalog = driver.catalog("PipeWire").unwrap();
        driver.configure(Config {buffer_frames:Some(512),..Config::default()}).unwrap();
        println!("DEFAULT_DEVICE_CONFIGURATION=admitted");
        let device = &catalog.devices.iter().find(|d| d.name.contains("Ultra-Software-Output") && d.compatible).expect("private software sink").id;
        let mut config = Config {host:"PipeWire".into(),device:device.clone(),sample_rate:RATE,buffer_frames:Some(128)};
        assert!(driver.configure(config.clone()).is_err()); // This private server admits only 512.
        config.buffer_frames = None;
        driver.configure(config).unwrap();
        assert_eq!(Driver::load(p).config,driver.config);
        unsafe { ultra_audio_routes(3); }
        driver.start().unwrap();
        assert!(driver.configure(Config::default()).is_err());
        // The runner connects/captures only this private graph before the score.
        std::thread::sleep(std::time::Duration::from_secs(2));
        assert!(driver.metrics.callbacks.load(Ordering::Relaxed)>0);
        assert_ne!(unsafe { ultra_audio_event(0,0,69,70) },0);
        assert_ne!(unsafe { ultra_audio_event(1,0,69,70) },0);
        std::thread::sleep(std::time::Duration::from_millis(600));
        assert_ne!(unsafe { ultra_audio_event(0,1,69,0) },0);
        assert_ne!(unsafe { ultra_audio_event(1,1,69,0) },0);
        std::thread::sleep(std::time::Duration::from_millis(300));
        assert!(unsafe { ultra_audio_frames() }>48000);
        assert!(!driver.snapshot().failed);
        println!("CPAL_SNAPSHOT={}",serde_json::to_string(&driver.snapshot()).unwrap());
        driver.stop();
        driver.start().unwrap();
        std::thread::sleep(std::time::Duration::from_millis(100));
        driver.stop();
    }
}
