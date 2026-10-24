//! Device I/O and preferences belong to Rust; the prepared native DSP stays at 48 kHz.
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::{Deserialize, Serialize};
use std::{
    path::PathBuf,
    sync::{atomic::Ordering, Arc},
    time::Instant,
};
#[path = "audio_epoch.rs"]
mod epoch;
use epoch::*;

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
        Self {
            host: "default".into(),
            device: "default".into(),
            sample_rate: RATE,
            buffer_frames: None,
        }
    }
}
impl Config {
    fn validate(&self) -> Result<(), String> {
        if self.sample_rate != RATE {
            return Err("The current DSP core supports 48,000 Hz. Choose 48 kHz.".into());
        }
        if self.host.is_empty()
            || self.host.len() > 64
            || self.device.is_empty()
            || self.device.len() > 2048
        {
            return Err("Invalid audio host or output device identifier.".into());
        }
        if self
            .buffer_frames
            .is_some_and(|n| !(32..=8192).contains(&n))
        {
            return Err("Buffer size must be automatic or 32 to 8192 frames.".into());
        }
        Ok(())
    }
}

#[derive(Serialize)]
pub struct DeviceInfo {
    id: String,
    name: String,
    compatible: bool,
}
#[derive(Serialize)]
pub struct Catalog {
    pub config: Config,
    hosts: Vec<String>,
    effective_host: String,
    devices: Vec<DeviceInfo>,
    pub notice: String,
}
#[derive(Serialize)]
pub struct Snapshot {
    pub running: bool,
    pub config: Config,
    pub host: String,
    pub device: String,
    pub observed_buffer_frames: u32,
    pub callbacks: String,
    pub stream_errors: String,
    pub epoch: Option<serde_json::Value>,
    pub lifetime_errors: serde_json::Value,
    pub native_quiescent: bool,
    pub retirement_pending: bool,
    pub failed: bool,
    pub message: String,
}
pub struct Driver {
    config: Config,
    path: PathBuf,
    stream: Option<cpal::Stream>,
    epochs: Epochs,
    host: String,
    device: String,
    message: String,
}
fn host(name: &str) -> Result<cpal::Host, String> {
    if name == "default" {
        return Ok(cpal::default_host());
    }
    let id = cpal::available_hosts()
        .into_iter()
        .find(|id| id.name() == name)
        .ok_or_else(|| {
            "Audio host is unavailable. Refresh devices and choose an available host.".to_string()
        })?;
    cpal::host_from_id(id).map_err(|e| format!("Cannot open audio host: {e}"))
}
fn output(host: &cpal::Host, id: &str) -> Result<cpal::Device, String> {
    if id == "default" {
        return host.default_output_device().ok_or_else(|| {
            "No default output device. Connect an output, then refresh devices.".into()
        });
    }
    let id = id
        .parse()
        .map_err(|_| "Invalid output device identifier.".to_string())?;
    host.device_by_id(&id).ok_or_else(|| {
        "The selected output is disconnected. Refresh devices and select an output.".into()
    })
}
fn rank(format: cpal::SampleFormat) -> u8 {
    match format {
        cpal::SampleFormat::F32 => 0,
        cpal::SampleFormat::I16 => 1,
        cpal::SampleFormat::I32 => 2,
        cpal::SampleFormat::U16 => 3,
        cpal::SampleFormat::F64 => 4,
        _ => 255,
    }
}
fn admits(range: &cpal::SupportedStreamConfigRange, buffer: Option<u32>) -> bool {
    range.channels() == 2
        && range.min_sample_rate() <= RATE
        && range.max_sample_rate() >= RATE
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
        let loaded = std::fs::read(&path)
            .map_err(|e| e.to_string())
            .and_then(|bytes| {
                if bytes.len() > 8192 {
                    return Err("settings file exceeds 8 KiB".into());
                }
                let config: Config = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
                config.validate()?;
                Ok(config)
            });
        let (config, message) = match loaded {
            Ok(c) => (c, "Saved audio configuration loaded. Audio is off.".into()),
            Err(_) if !path.exists() => (Config::default(), "Choose an output, then start audio.".into()),
            Err(e) => (Config::default(), format!("Saved audio configuration could not be read ({e}). Choose and save new settings.")),
        };
        Self {
            config,
            path,
            stream: None,
            epochs: Epochs::default(),
            host: String::new(),
            device: String::new(),
            message,
        }
    }
    pub fn catalog(&self, selected_host: &str) -> Result<Catalog, String> {
        // Discovery failures must not hide the hosts needed for explicit recovery.
        // Never resolve a stale selection to a different host or device here.
        let mut catalog = Catalog {
            config: self.config.clone(),
            hosts: cpal::available_hosts()
                .iter()
                .map(|h| h.name().into())
                .collect(),
            effective_host: String::new(),
            devices: Vec::new(),
            notice: self.message.clone(),
        };
        let host = match host(selected_host) {
            Ok(host) => host,
            Err(error) => {
                catalog.notice = error;
                return Ok(catalog);
            }
        };
        catalog.effective_host = host.id().name().into();
        let outputs = match host.output_devices() {
            Ok(outputs) => outputs,
            Err(error) => {
                catalog.notice = format!(
                    "Cannot list output devices: {error}. Refresh devices or choose another host."
                );
                return Ok(catalog);
            }
        };
        if let Some(d) = host.default_output_device() {
            catalog.devices.push(DeviceInfo {
                id: "default".into(),
                name: format!("System default - {d}"),
                compatible: format(&d, &Config::default()).is_ok(),
            });
        }
        for d in outputs {
            if let Ok(id) = d.id() {
                catalog.devices.push(DeviceInfo {
                    id: id.to_string(),
                    name: d.to_string(),
                    compatible: format(&d, &Config::default()).is_ok(),
                });
            }
        }
        Ok(catalog)
    }

    pub fn configure(&mut self, config: Config) -> Result<(), String> {
        if self.stream.is_some() {
            return Err("Stop audio before changing its configuration.".into());
        }
        self.require_quiescent()?;
        config.validate()?;
        format(&output(&host(&config.host)?, &config.device)?, &config)?;
        let bytes = serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?;
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Cannot save audio settings: {e}"))?;
        }
        let temporary = self.path.with_extension("json.tmp");
        std::fs::write(&temporary, bytes)
            .and_then(|_| std::fs::rename(&temporary, &self.path))
            .map_err(|e| format!("Cannot save audio settings: {e}"))?;
        self.config = config;
        self.message = "Audio settings saved. Start audio when ready.".into();
        Ok(())
    }
    pub fn start(&mut self) -> Result<(), String> {
        if self.stream.is_some() {
            return Ok(());
        }
        let result = self.start_stream();
        if let Err(e) = &result {
            self.message = e.clone();
        }
        result
    }
    fn start_stream(&mut self) -> Result<(), String> {
        self.require_quiescent()?;
        self.config.validate()?;
        let host = host(&self.config.host)?;
        let device = output(&host, &self.config.device)?;
        let sample_format = format(&device, &self.config)?;
        self.host = host.id().name().into();
        self.device = device.to_string().chars().take(512).collect();
        self.epochs.begin(Identity {
            requested_buffer_frames: self.config.buffer_frames,
            rate_hz: RATE,
            channels: 2,
            sample_format: sample_format.to_string(),
            host: self.host.clone(),
            device: self.device.clone(),
            source_id: source_id(),
            timing_enabled: !cfg!(feature = "telemetry-disabled"),
        })?;
        if unsafe { ultra_external_start() } == 0 {
            self.retire("native_init_failed", true);
            return Err("The DSP engine could not initialize. Audio remains off.".into());
        }
        let config = cpal::StreamConfig {
            channels: 2,
            sample_rate: RATE,
            buffer_size: self
                .config
                .buffer_frames
                .map(cpal::BufferSize::Fixed)
                .unwrap_or(cpal::BufferSize::Default),
        };
        let metrics = self.epochs.callback_owner();
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
            Err(e) => {
                self.retire("build_failed", true);
                return Err(format!(
                    "Cannot open output: {e}. Try Automatic buffer size or another output."
                ));
            }
        };
        if let Err(e) = stream.play() {
            self.epochs.retire("play_failed", true);
            drop(stream);
            self.reap();
            return Err(format!(
                "Cannot start output: {e}. Check the output connection and try again."
            ));
        }
        self.host = host.id().name().into();
        self.device = device.to_string().chars().take(512).collect();
        self.stream = Some(stream);
        self.epochs.running();
        self.message = "Audio output is running.".into();
        Ok(())
    }
    fn reap(&mut self) -> bool {
        self.epochs.reap(|| unsafe {
            ultra_audio_stop();
        })
    }
    fn retire(&mut self, reason: &'static str, failed: bool) {
        self.epochs.retire(reason, failed);
        self.stream.take();
        self.reap();
    }
    pub fn reject_retiring(&mut self) -> Result<(), String> {
        self.reap();
        if self.epochs.pending() {
            Err(PENDING.into())
        } else {
            Ok(())
        }
    }
    pub fn require_quiescent(&mut self) -> Result<(), String> {
        if self.reap() {
            Ok(())
        } else {
            Err(PENDING.into())
        }
    }
    pub fn stop(&mut self) -> Result<(), String> {
        self.retire("stop", false);
        if !self.epochs.quiescent() {
            self.message = PENDING.into();
            return Err(PENDING.into());
        }
        self.message = "Audio is off.".into();
        Ok(())
    }
    pub fn diagnostics(&mut self, after: u64) -> serde_json::Value {
        self.reap();
        self.epochs.diagnostics(after)
    }
    pub fn snapshot(&mut self) -> Snapshot {
        self.reap();
        let record = self.epochs.current();
        let failed = record.is_some_and(|r| r.failed);
        let numeric = record.map(|r| &r.numeric);
        Snapshot {
            running: self.stream.is_some() && !failed,
            config: self.config.clone(),
            host: self.host.clone(),
            device: self.device.clone(),
            observed_buffer_frames: numeric.map_or(0, |n| n.v[LAST] as u32),
            callbacks: numeric.map_or(0, |n| n.v[ENTER]).to_string(),
            stream_errors: numeric
                .map_or(0, |n| n.v[ERRORS].saturating_add(n.v[SHAPE]))
                .to_string(),
            epoch: record.map(|r| r.json(false)),
            lifetime_errors: serde_json::json!({"cpal_error_total":self.epochs.lifetime.v[ERRORS].to_string(),"cpal_xrun_reports":self.epochs.lifetime.v[XRUN].to_string(),"cpal_non_xrun_reports":self.epochs.lifetime.v[NON_XRUN].to_string()}),
            native_quiescent: self.epochs.quiescent(),
            retirement_pending: self.epochs.pending(),
            failed,
            message: if self.epochs.pending() {
                PENDING.into()
            } else if failed {
                "Audio output stopped after a stream error. Stop audio, refresh devices, then start again.".into()
            } else {
                self.message.clone()
            },
        }
    }
    // Called only after the application's save/discard/allow_exit authorization.
    // No native or Rust destructors may run while a detached callback owns state.
    pub fn authorized_exit(&mut self) {
        if self.stop().is_err() {
            let evidence = serde_json::json!({"kind":"incomplete_audio_retirement","run_id":self.epochs.run_id,"complete":false,"epoch":self.epochs.current().map(|r|r.json(false))});
            immediate_exit(&evidence.to_string());
        }
    }
}
impl Drop for Driver {
    fn drop(&mut self) {
        self.authorized_exit();
    }
}
fn source_id() -> String {
    use sha2::{Digest, Sha256};
    format!(
        "{:x}",
        Sha256::digest(
            concat!(include_str!("audio.rs"), include_str!("audio_epoch.rs")).as_bytes()
        )
    )
}
fn immediate_exit(evidence: &str) -> ! {
    // Best-effort nonblocking evidence: stderr can be a stalled pipe. Never wait
    // on it on the terminal path. The small write may be partial or unavailable.
    #[cfg(unix)]
    unsafe {
        extern "C" {
            fn fcntl(fd: i32, cmd: i32, ...) -> i32;
            fn write(fd: i32, buf: *const u8, len: usize) -> isize;
            fn _exit(code: i32) -> !;
        }
        #[cfg(target_os = "linux")]
        const NONBLOCK: i32 = 0x800;
        #[cfg(target_os = "macos")]
        const NONBLOCK: i32 = 0x4;
        let flags = fcntl(2, 3);
        if flags >= 0 && fcntl(2, 4, flags | NONBLOCK) >= 0 {
            let _ = write(2, evidence.as_ptr(), evidence.len().min(4096));
        }
        _exit(0)
    }
    #[cfg(windows)]
    unsafe {
        extern "system" {
            fn GetCurrentProcess() -> *mut std::ffi::c_void;
            fn TerminateProcess(process: *mut std::ffi::c_void, code: u32) -> i32;
        }
        let _ = evidence;
        TerminateProcess(GetCurrentProcess(), 0);
        std::hint::unreachable_unchecked()
    }
}

// No heap allocation/free, locks, logging, discovery or settings I/O here.
fn fill<T: cpal::SizedSample + cpal::FromSample<f32>>(
    data: &mut [T],
    metrics: &Metrics,
    local: &mut Numeric,
    left: &mut [f32; BLOCK],
    right: &mut [f32; BLOCK],
    mut render: impl FnMut(u32, *mut f32, *mut f32) -> i32,
) {
    local.tick(ENTER);
    data.fill(T::EQUILIBRIUM);
    let valid = data.len() % 2 == 0 && data.len() / 2 <= MAX_CALLBACK;
    if valid {
        local.valid((data.len() / 2) as u64);
    } else {
        local.tick(SHAPE);
    }
    if metrics.failed.load(Ordering::Acquire) {
        local.tick(AFTER_FAILURE);
        local.tick(SILENCED);
        return;
    }
    if !valid {
        metrics.failed.store(true, Ordering::Release);
        local.tick(SILENCED);
        unsafe {
            ultra_audio_panic();
        }
        return;
    }
    if data.is_empty() {
        local.tick(SILENCED);
        return;
    }
    for chunk in data.chunks_mut(BLOCK * 2) {
        let frames = chunk.len() / 2;
        local.tick(RENDERS);
        if render(frames as u32, left.as_mut_ptr(), right.as_mut_ptr()) == 0 {
            local.tick(RENDER_FAILURE);
            local.tick(SILENCED);
            data.fill(T::EQUILIBRIUM);
            return;
        }
        for (i, output) in chunk.chunks_exact_mut(2).enumerate() {
            output[0] = T::from_sample(clean(left[i]));
            output[1] = T::from_sample(clean(right[i]));
        }
    }
}
fn measured_fill<T: cpal::SizedSample + cpal::FromSample<f32>>(
    data: &mut [T],
    metrics: &Metrics,
    local: &mut Numeric,
    left: &mut [f32; BLOCK],
    right: &mut [f32; BLOCK],
    render: impl FnMut(u32, *mut f32, *mut f32) -> i32,
    mut clock: impl FnMut() -> u64,
) {
    let start = clock();
    fill(data, metrics, local, left, right, render);
    let end = clock();
    let valid = data.len() % 2 == 0 && data.len() / 2 <= MAX_CALLBACK;
    let (duration, util) = local.finish(start, end, valid.then_some((data.len() / 2) as u64), RATE);
    metrics.publish(local, duration, util);
}
fn clean(sample: f32) -> f32 {
    if sample.is_finite() {
        sample.clamp(-1., 1.)
    } else {
        0.
    }
}
fn build<T: cpal::SizedSample + cpal::FromSample<f32>>(
    device: &cpal::Device,
    config: cpal::StreamConfig,
    metrics: Arc<Metrics>,
) -> Result<cpal::Stream, cpal::Error> {
    let errors = metrics.clone();
    let mut left = [0.; BLOCK];
    let mut right = [0.; BLOCK];
    let mut local = Numeric::default();
    let clock = Instant::now();
    let _ = clock.elapsed();
    device.build_output_stream(
        config,
        move |data: &mut [T], _| {
            #[cfg(not(feature = "telemetry-disabled"))]
            measured_fill(
                data,
                &metrics,
                &mut local,
                &mut left,
                &mut right,
                |n, l, r| unsafe { ultra_external_render(n, l, r) },
                || clock.elapsed().as_nanos().min(u64::MAX as u128) as u64,
            );
            #[cfg(feature = "telemetry-disabled")]
            {
                fill(
                    data,
                    &metrics,
                    &mut local,
                    &mut left,
                    &mut right,
                    |n, l, r| unsafe { ultra_external_render(n, l, r) },
                );
                metrics.publish(&local, 0, None);
            }
        },
        move |error| {
            stream_error(&errors, &error);
            // CPAL owns Error; an owned Cow message may free here, outside the
            // allocation-free typed action. Do not retain or leak its payload.
        },
        None,
    )
}

fn stream_error(metrics: &Metrics, error: &cpal::Error) {
    let xrun = error.kind() == cpal::ErrorKind::Xrun;
    metrics.error(xrun);
    if !xrun {
        unsafe {
            ultra_audio_panic();
        }
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    pub(crate) fn hold_retiring(driver: &mut Driver) -> impl Drop + Clone {
        driver.epochs.begin(test_identity()).unwrap();
        let witness = driver.epochs.callback_owner();
        driver.epochs.retire("build_failed", true);
        witness
    }
    pub(crate) fn hold_running(driver: &mut Driver) -> impl Drop {
        driver.epochs.begin(test_identity()).unwrap();
        driver.epochs.running();
        driver.epochs.callback_owner()
    }
    fn test_identity() -> Identity {
        Identity {
            requested_buffer_frames: Some(256),
            rate_hz: RATE,
            channels: 2,
            sample_format: "f32".into(),
            host: "fake".into(),
            device: "fake".into(),
            source_id: "test".into(),
            timing_enabled: true,
        }
    }
    #[test]
    fn stop_retains_observed_callbacks() {
        let _native_guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut driver = Driver::load(PathBuf::from("/nonexistent/task13-settings.json"));
        driver.epochs.begin(test_identity()).unwrap();
        let m = driver.epochs.callback_owner();
        let mut n = Numeric::default();
        n.v[ENTER] = 7;
        m.publish(&n, 0, None);
        drop(m);
        driver.stop().unwrap();
        assert_eq!(
            driver.snapshot().callbacks,
            "7",
            "Stop must not erase observations"
        );
    }
    #[test]
    fn measured_fill_counts_all_returns_shapes_and_later_partition_failure() {
        let _native_guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let m = Metrics::default();
        let mut n = Numeric::default();
        let mut l = [0.; BLOCK];
        let mut r = [0.; BLOCK];
        for size in [512, 0, 4096, 3, 512, MAX_CALLBACK * 2 + 2] {
            let mut data = vec![1f32; size];
            let mut clock = 0;
            let mut calls = 0;
            measured_fill(
                &mut data,
                &m,
                &mut n,
                &mut l,
                &mut r,
                |frames, left, right| {
                    calls += 1;
                    unsafe {
                        for i in 0..frames as usize {
                            *left.add(i) = 0.5;
                            *right.add(i) = -0.5;
                        }
                    }
                    if calls == 2 {
                        0
                    } else {
                        1
                    }
                },
                || {
                    clock += 1000;
                    clock
                },
            );
            if size != 512 || n.v[ENTER] > 1 {
                assert!(data.iter().all(|x| *x == 0.));
            }
        }
        assert_eq!(n.v[ENTER], 6);
        assert_eq!(n.v[SAMPLES], 6);
        assert_eq!(n.v[SUM], 6000);
        assert_eq!(n.v[SHAPE], 2);
        assert_eq!(n.v[ZERO], 1);
        assert_eq!(n.v[RENDER_FAILURE], 1);
        assert_eq!(n.v[RENDERS], 3);
        assert_eq!(n.v[AFTER_FAILURE], 2);
        assert_eq!(n.v[SILENCED], 5);
        assert_eq!(n.v[BUDGETS], 3);
        assert_eq!(n.v[MIN], 0);
        assert_eq!(n.v[MAX], 2048);
        assert_eq!(n.v[CHANGES], 3);
        m.error(true);
        assert!(m.failed.load(Ordering::Acquire));
        let mut read = Numeric::default();
        m.read(&mut read);
        assert_eq!(read.v[ERRORS], 1);
        assert_eq!(read.v[XRUN], 1);
        assert_eq!(read.v[NON_XRUN], 0);
        let clean = Metrics::default();
        clean.error(true);
        assert!(!clean.failed.load(Ordering::Acquire));
        clean.error(false);
        assert!(clean.failed.load(Ordering::Acquire));
        clean.read(&mut read);
        assert_eq!(&read.v[ERRORS..], [2, 1, 1]);
    }
    #[test]
    fn pending_start_configure_and_stop_refuse_without_consuming_an_epoch() {
        let _native_guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut d = Driver::load(PathBuf::from("/nonexistent/task13-pending.json"));
        d.epochs.begin(test_identity()).unwrap();
        let owner = d.epochs.callback_owner();
        d.epochs.retire("build_failed", true);
        assert!(d.start().unwrap_err().starts_with("retirement_pending"));
        assert!(d
            .configure(Config::default())
            .unwrap_err()
            .starts_with("retirement_pending"));
        assert!(d.stop().unwrap_err().starts_with("retirement_pending"));
        assert_eq!(d.diagnostics(0)["active"]["epoch_id"], "1");
        drop(owner);
        d.stop().unwrap();
        assert_eq!(d.diagnostics(0)["completed"].as_array().unwrap().len(), 1);
    }
    #[test]
    fn authorized_pending_exit_skips_destructors_in_child() {
        if let Ok(path) = std::env::var("ALIVE_PENDING_EXIT_CHILD") {
            struct Marker(String);
            impl Drop for Marker {
                fn drop(&mut self) {
                    std::fs::write(&self.0, b"unsafe destructor ran").unwrap();
                }
            }
            let _marker = Marker(path);
            let mut d = Driver::load(PathBuf::from("/nonexistent/exit-test.json"));
            d.epochs.begin(test_identity()).unwrap();
            let _closure = d.epochs.callback_owner();
            d.epochs.retire("build_failed", true);
            d.authorized_exit();
            panic!("terminal exit returned");
        }
        let path = std::env::temp_dir().join(format!("alive-exit-marker-{}", std::process::id()));
        let output = std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "audio::tests::authorized_pending_exit_skips_destructors_in_child",
                "--nocapture",
            ])
            .env("ALIVE_PENDING_EXIT_CHILD", &path)
            .output()
            .unwrap();
        assert!(output.status.success());
        assert!(!path.exists());
        #[cfg(unix)]
        assert!(String::from_utf8_lossy(&output.stderr).contains("incomplete_audio_retirement"));
    }
    #[test]
    fn configuration_rejects_unsupported_rates_buffers_and_fields() {
        let mut c = Config::default();
        assert!(c.validate().is_ok());
        c.sample_rate = 44100;
        assert!(c.validate().is_err());
        c.sample_rate = RATE;
        c.buffer_frames = Some(16);
        assert!(c.validate().is_err());
        c.buffer_frames = Some(8192);
        assert!(c.validate().is_ok());
        assert!(serde_json::from_str::<Config>(r#"{"host":"default","device":"default","sample_rate":48000,"buffer_frames":null,"oops":1}"#).is_err());
    }
    #[test]
    fn callback_partitions_stereo_and_converts_without_losing_frames() {
        let metrics = Metrics::default();
        let mut local = Numeric::default();
        let mut left = [0.; BLOCK];
        let mut right = [0.; BLOCK];
        let mut output = vec![0i16; 4099 * 2];
        let mut calls = Vec::new();
        fill(
            &mut output,
            &metrics,
            &mut local,
            &mut left,
            &mut right,
            |n, l, r| {
                calls.push(n);
                unsafe {
                    for i in 0..n as usize {
                        *l.add(i) = 0.5;
                        *r.add(i) = -0.5;
                    }
                }
                1
            },
        );
        assert_eq!(calls, [1024, 1024, 1024, 1024, 3]);
        assert!(output.chunks_exact(2).all(|x| x == [16384, -16384]));
        assert_eq!(local.v[LAST], 4099);
    }
    #[test]
    fn disconnected_or_stale_device_is_not_silently_replaced() {
        assert!(host("missing-host").is_err());
        let mut config = Config::default();
        config.device = "".into();
        assert!(config.validate().is_err());
        assert_eq!(clean(f32::NAN), 0.);
        assert_eq!(clean(2.), 1.);
    }
    #[test]
    fn unavailable_saved_host_catalog_keeps_preferences_and_lists_recovery_hosts() {
        let path =
            std::env::temp_dir().join(format!("ultra-stale-host-{}.json", std::process::id()));
        let config = Config {
            host: "missing-host".into(),
            device: "saved-output".into(),
            ..Config::default()
        };
        let bytes = serde_json::to_vec(&config).unwrap();
        std::fs::write(&path, &bytes).unwrap();
        let driver = Driver::load(path.clone());
        let catalog = driver
            .catalog(&config.host)
            .expect("host failure must not hide recovery choices");
        assert_eq!(catalog.config, config);
        assert_eq!(
            catalog.hosts,
            cpal::available_hosts()
                .iter()
                .map(|h| h.name().to_string())
                .collect::<Vec<_>>()
        );
        assert!(catalog.devices.is_empty());
        assert!(catalog.effective_host.is_empty());
        assert!(catalog.notice.contains("Audio host is unavailable"));
        assert_eq!(driver.config, config);
        assert_eq!(std::fs::read(&path).unwrap(), bytes);
        std::fs::remove_file(path).unwrap();
    }
    #[test]
    fn native_failure_silences_the_whole_device_callback() {
        let metrics = Metrics::default();
        let mut local = Numeric::default();
        let mut l = [0.; BLOCK];
        let mut r = [0.; BLOCK];
        let mut output = vec![0f32; 2048 * 2];
        let mut calls = 0;
        fill(
            &mut output,
            &metrics,
            &mut local,
            &mut l,
            &mut r,
            |n, left, right| {
                calls += 1;
                unsafe {
                    for i in 0..n as usize {
                        *left.add(i) = 0.8;
                        *right.add(i) = 0.8;
                    }
                }
                if calls == 2 {
                    0
                } else {
                    1
                }
            },
        );
        assert!(output.iter().all(|x| *x == 0.));
    }
    #[test]
    fn invalid_saved_settings_use_defaults_without_rewriting_user_data() {
        let p =
            std::env::temp_dir().join(format!("ultra-invalid-audio-{}.json", std::process::id()));
        std::fs::write(&p, b"invalid settings").unwrap();
        let mut d = Driver::load(p.clone());
        assert_eq!(d.config, Config::default());
        assert!(d.snapshot().message.contains("could not be read"));
        assert_eq!(std::fs::read(&p).unwrap(), b"invalid settings");
        std::fs::remove_file(p).unwrap();
    }
    #[test]
    #[ignore = "requires the private software-only PipeWire graph from check_cpal_audio.sh"]
    fn private_software_output() {
        assert_eq!(
            std::env::var("PIPEWIRE_REMOTE").unwrap(),
            "ultra-audio-test"
        );
        assert!(std::env::var("PIPEWIRE_RUNTIME_DIR")
            .unwrap()
            .starts_with("/tmp/ultra-cpal."));
        extern "C" {
            fn ultra_audio_routes(mask: u32);
            fn ultra_audio_event(d: u32, k: u32, n: u32, v: u32) -> i32;
            fn ultra_audio_frames() -> u64;
        }
        let p = PathBuf::from(std::env::var("ULTRA_AUDIO_PROBE_SETTINGS").unwrap());
        let mut driver = Driver::load(p.clone());
        let catalog = driver.catalog("PipeWire").unwrap();
        driver
            .configure(Config {
                buffer_frames: Some(512),
                ..Config::default()
            })
            .unwrap();
        println!("DEFAULT_DEVICE_CONFIGURATION=admitted");
        let device = &catalog
            .devices
            .iter()
            .find(|d| d.name.contains("Ultra-Software-Output") && d.compatible)
            .expect("private software sink")
            .id;
        let mut config = Config {
            host: "PipeWire".into(),
            device: device.clone(),
            sample_rate: RATE,
            buffer_frames: Some(128),
        };
        assert!(driver.configure(config.clone()).is_err()); // This private server admits only 512.
        config.buffer_frames = None;
        driver.configure(config).unwrap();
        assert_eq!(Driver::load(p).config, driver.config);
        unsafe {
            ultra_audio_routes(3);
        }
        driver.start().unwrap();
        assert!(driver.configure(Config::default()).is_err());
        // The runner connects/captures only this private graph before the score.
        std::thread::sleep(std::time::Duration::from_secs(2));
        assert!(driver.snapshot().callbacks.parse::<u64>().unwrap() > 0);
        assert_ne!(unsafe { ultra_audio_event(0, 0, 69, 70) }, 0);
        assert_ne!(unsafe { ultra_audio_event(1, 0, 69, 70) }, 0);
        std::thread::sleep(std::time::Duration::from_millis(600));
        assert_ne!(unsafe { ultra_audio_event(0, 1, 69, 0) }, 0);
        assert_ne!(unsafe { ultra_audio_event(1, 1, 69, 0) }, 0);
        std::thread::sleep(std::time::Duration::from_millis(300));
        assert!(unsafe { ultra_audio_frames() } > 48000);
        assert!(!driver.snapshot().failed);
        println!(
            "CPAL_SNAPSHOT={}",
            serde_json::to_string(&driver.snapshot()).unwrap()
        );
        driver.stop().unwrap();
        driver.start().unwrap();
        std::thread::sleep(std::time::Duration::from_millis(100));
        driver.stop().unwrap();
    }
}

#[cfg(test)]
#[path = "audio_instrumentation.rs"]
mod instrumentation;
