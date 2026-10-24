//! Bounded stream telemetry. Only the serialized Driver owns epoch retirement.
use serde::Serialize;
use std::{
    collections::VecDeque,
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc, OnceLock,
    },
    time::Instant,
};
#[cfg(not(target_has_atomic = "64"))]
compile_error!("Audio telemetry requires native lock-free 64-bit atomics");

pub const NAMES: [&str; 24] = [
    "callbacks_entered",
    "valid_callbacks",
    "output_frames",
    "buffer_frames_last",
    "buffer_frames_min",
    "buffer_frames_max",
    "buffer_size_changed_count",
    "render_calls",
    "native_render_failures",
    "silenced_callbacks",
    "invalid_callback_shape",
    "zero_frame_callbacks",
    "callbacks_after_failure",
    "duration_samples",
    "duration_sum_ns",
    "duration_max_ns",
    "budget_samples",
    "over_buffer_budget_count",
    "max_utilization_ppm",
    "clock_anomaly_count",
    "counter_overflow",
    "cpal_error_total",
    "cpal_xrun_reports",
    "cpal_non_xrun_reports",
];
pub const ENTER: usize = 0;
pub const VALID: usize = 1;
pub const FRAMES: usize = 2;
pub const LAST: usize = 3;
pub const MIN: usize = 4;
pub const MAX: usize = 5;
pub const CHANGES: usize = 6;
pub const RENDERS: usize = 7;
pub const RENDER_FAILURE: usize = 8;
pub const SILENCED: usize = 9;
pub const SHAPE: usize = 10;
pub const ZERO: usize = 11;
pub const AFTER_FAILURE: usize = 12;
pub const SAMPLES: usize = 13;
pub const SUM: usize = 14;
pub const DURATION_MAX: usize = 15;
pub const BUDGETS: usize = 16;
pub const OVER: usize = 17;
pub const UTIL_MAX: usize = 18;
pub const CLOCK: usize = 19;
pub const OVERFLOW: usize = 20;
pub const ERRORS: usize = 21;
pub const XRUN: usize = 22;
pub const NON_XRUN: usize = 23;
pub const PENDING:&str="retirement_pending: Audio callbacks are still retiring. Native state and pending edits are retained; retry shortly or Quit.";

pub fn edges() -> &'static [u64; 255] {
    static EDGES: OnceLock<[u64; 255]> = OnceLock::new();
    EDGES.get_or_init(|| {
        std::array::from_fn(|i| (1000.0 * 2f64.powf(i as f64 / 16.)).round() as u64)
    })
}
#[derive(Clone)]
pub struct Numeric {
    pub v: [u64; 24],
    pub duration: [u64; 256],
    pub utilization: [u64; 202],
}
impl Default for Numeric {
    fn default() -> Self {
        Self {
            v: [0; 24],
            duration: [0; 256],
            utilization: [0; 202],
        }
    }
}
impl Numeric {
    pub fn add(&mut self, index: usize, value: u64) {
        let (n, overflow) = self.v[index].overflowing_add(value);
        self.v[index] = if overflow { u64::MAX } else { n };
        if overflow {
            self.v[OVERFLOW] = 1;
        }
    }
    pub fn tick(&mut self, index: usize) {
        self.add(index, 1);
    }
    pub fn valid(&mut self, frames: u64) {
        self.tick(VALID);
        self.add(FRAMES, frames);
        if self.v[VALID] > 1 && self.v[LAST] != frames {
            self.tick(CHANGES);
        }
        self.v[LAST] = frames;
        self.v[MIN] = if self.v[VALID] == 1 {
            frames
        } else {
            self.v[MIN].min(frames)
        };
        self.v[MAX] = self.v[MAX].max(frames);
        if frames == 0 {
            self.tick(ZERO);
        }
    }
    pub fn finish(
        &mut self,
        start: u64,
        end: u64,
        frames: Option<u64>,
        rate: u32,
    ) -> (usize, Option<usize>) {
        let elapsed = match end.checked_sub(start) {
            Some(n) => n,
            None => {
                self.tick(CLOCK);
                0
            }
        };
        self.tick(SAMPLES);
        self.add(SUM, elapsed);
        self.v[DURATION_MAX] = self.v[DURATION_MAX].max(elapsed);
        let bucket = edges().partition_point(|edge| *edge < elapsed);
        if self.duration[bucket] == u64::MAX {
            self.v[OVERFLOW] = 1;
        } else {
            self.duration[bucket] += 1;
        }
        let util = frames.filter(|n| *n > 0).map(|frames| {
            let numerator = elapsed as u128 * rate as u128;
            let denominator = frames as u128 * 1_000_000_000;
            self.tick(BUDGETS);
            if numerator > denominator {
                self.tick(OVER);
            }
            let ppm = numerator * 1_000_000 / denominator;
            if ppm > u64::MAX as u128 {
                self.v[OVERFLOW] = 1;
            }
            self.v[UTIL_MAX] = self.v[UTIL_MAX].max(ppm.min(u64::MAX as u128) as u64);
            let b = ((numerator * 100).div_ceil(denominator)).min(201) as usize;
            if self.utilization[b] == u64::MAX {
                self.v[OVERFLOW] = 1;
            } else {
                self.utilization[b] += 1;
            }
            b
        });
        (bucket, util)
    }
    fn merge(&mut self, other: &Self) {
        let prior_valid = self.v[VALID];
        for i in 0..24 {
            match i {
                LAST => self.v[i] = other.v[i],
                MIN => {
                    if other.v[VALID] > 0 {
                        self.v[i] = if prior_valid == 0 {
                            other.v[i]
                        } else {
                            self.v[i].min(other.v[i])
                        }
                    }
                }
                MAX | DURATION_MAX | UTIL_MAX | OVERFLOW => self.v[i] = self.v[i].max(other.v[i]),
                _ => self.add(i, other.v[i]),
            }
        }
        for (a, b) in self.duration.iter_mut().zip(other.duration) {
            let (n, o) = a.overflowing_add(b);
            *a = if o {
                self.v[OVERFLOW] = 1;
                u64::MAX
            } else {
                n
            };
        }
        for (a, b) in self.utilization.iter_mut().zip(other.utilization) {
            let (n, o) = a.overflowing_add(b);
            *a = if o {
                self.v[OVERFLOW] = 1;
                u64::MAX
            } else {
                n
            };
        }
    }
    pub fn json(&self, full: bool) -> serde_json::Value {
        let mut v = serde_json::Map::new();
        for (name, n) in NAMES.iter().zip(self.v) {
            v.insert((*name).into(), n.to_string().into());
        }
        if full {
            v.insert(
                "duration_hist".into(),
                self.duration.map(|n| n.to_string()).to_vec().into(),
            );
            v.insert(
                "util_hist".into(),
                self.utilization.map(|n| n.to_string()).to_vec().into(),
            );
        }
        v.into()
    }
}
pub struct Metrics {
    sequence: AtomicU64,
    values: [AtomicU64; 24],
    duration: [AtomicU64; 256],
    utilization: [AtomicU64; 202],
    errors: [AtomicU64; 3],
    overflow_flags: AtomicU64,
    pub failed: AtomicBool,
}
impl Default for Metrics {
    fn default() -> Self {
        edges();
        Self {
            sequence: AtomicU64::new(0),
            values: std::array::from_fn(|_| AtomicU64::new(0)),
            duration: std::array::from_fn(|_| AtomicU64::new(0)),
            utilization: std::array::from_fn(|_| AtomicU64::new(0)),
            errors: std::array::from_fn(|_| AtomicU64::new(0)),
            overflow_flags: AtomicU64::new(0),
            failed: AtomicBool::new(false),
        }
    }
}
impl Metrics {
    // CPAL may share its error closure internally. Saturating fetch_update would
    // retry; fetch_add is bounded, with overflow explicitly invalidating evidence.
    pub fn error(&self, xrun: bool) {
        for index in [0, if xrun { 1 } else { 2 }] {
            if self.errors[index].fetch_add(1, Ordering::Relaxed) == u64::MAX {
                self.overflow_flags.fetch_or(1 << index, Ordering::Release);
            }
        }
        if !xrun {
            self.failed.store(true, Ordering::Release);
        }
    }
    pub fn publish(&self, local: &Numeric, duration: usize, util: Option<usize>) {
        // All slots and sequence operations are SeqCst. A matching even sequence
        // brackets a single total-order interval containing no writer stores.
        // No reader reads ordinary callback memory, and the writer never retries.
        let sequence = self.sequence.load(Ordering::SeqCst);
        if sequence >= u64::MAX - 1 {
            self.overflow_flags.fetch_or(8, Ordering::Release);
            return;
        }
        self.sequence.store(sequence + 1, Ordering::SeqCst);
        for (a, n) in self.values.iter().zip(local.v) {
            a.store(n, Ordering::SeqCst);
        }
        self.duration[duration].store(local.duration[duration], Ordering::SeqCst);
        if let Some(i) = util {
            self.utilization[i].store(local.utilization[i], Ordering::SeqCst);
        }
        self.sequence.store(sequence + 2, Ordering::SeqCst);
    }
    pub fn read(&self, cache: &mut Numeric) -> (u64, bool) {
        let mut sequence = 0;
        let mut stale = true;
        for _ in 0..3 {
            sequence = self.sequence.load(Ordering::SeqCst);
            if sequence & 1 != 0 {
                continue;
            }
            let candidate = Numeric {
                v: std::array::from_fn(|i| self.values[i].load(Ordering::SeqCst)),
                duration: std::array::from_fn(|i| self.duration[i].load(Ordering::SeqCst)),
                utilization: std::array::from_fn(|i| self.utilization[i].load(Ordering::SeqCst)),
            };
            if sequence == self.sequence.load(Ordering::SeqCst) {
                *cache = candidate;
                stale = false;
                break;
            }
        }
        for i in 0..3 {
            cache.v[ERRORS + i] = if self.overflow_flags.load(Ordering::Acquire) & (1 << i) != 0 {
                u64::MAX
            } else {
                self.errors[i].load(Ordering::Relaxed)
            };
        }
        if self.overflow_flags.load(Ordering::Acquire) != 0 {
            cache.v[OVERFLOW] = 1;
        }
        (sequence, stale)
    }
}
#[derive(Clone, Serialize)]
pub struct Identity {
    pub requested_buffer_frames: Option<u32>,
    pub rate_hz: u32,
    pub channels: u16,
    pub sample_format: String,
    pub host: String,
    pub device: String,
    pub source_id: String,
    pub timing_enabled: bool,
}
#[derive(Clone)]
pub struct Record {
    pub id: u64,
    pub state: &'static str,
    pub reason: &'static str,
    pub failed: bool,
    pub opened: u64,
    pub retired: Option<u64>,
    pub identity: Identity,
    pub numeric: Numeric,
    pub sequence: u64,
    pub stale: bool,
}
impl Record {
    pub fn json(&self, full: bool) -> serde_json::Value {
        serde_json::json!({"epoch_id":self.id.to_string(),"state":self.state,"retire_reason":self.reason,"failed":self.failed,"final":self.state=="finalized","opened_mono_ns":self.opened.to_string(),"retired_mono_ns":self.retired.map(|n|n.to_string()),"config":self.identity,"metrics":self.numeric.json(full),"snapshot_sequence":self.sequence.to_string(),"stale":self.stale,"error_observations_independent":true})
    }
}
struct Epoch {
    metrics: Arc<Metrics>,
    record: Record,
}
pub struct Epochs {
    active: Option<Epoch>,
    pub completed: VecDeque<Record>,
    pub lifetime: Numeric,
    next: u64,
    pub evicted: u64,
    origin: Instant,
    pub run_id: String,
}
impl Default for Epochs {
    fn default() -> Self {
        Self {
            active: None,
            completed: VecDeque::with_capacity(64),
            lifetime: Numeric::default(),
            next: 1,
            evicted: 0,
            origin: Instant::now(),
            run_id: format!(
                "{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_nanos()
            ),
        }
    }
}
impl Epochs {
    fn now(&self) -> u64 {
        self.origin.elapsed().as_nanos().min(u64::MAX as u128) as u64
    }
    pub fn begin(&mut self, identity: Identity) -> Result<(), String> {
        if self.active.is_some() {
            return Err(PENDING.into());
        }
        let id = self.next;
        self.next = self
            .next
            .checked_add(1)
            .ok_or("Stream epoch identity exhausted")?;
        self.active = Some(Epoch {
            metrics: Arc::default(),
            record: Record {
                id,
                state: "opening",
                reason: "none",
                failed: false,
                opened: self.now(),
                retired: None,
                identity,
                numeric: Numeric::default(),
                sequence: 0,
                stale: false,
            },
        });
        Ok(())
    }
    pub fn callback_owner(&self) -> Arc<Metrics> {
        self.active.as_ref().expect("opening epoch").metrics.clone()
    }
    pub fn running(&mut self) {
        self.active.as_mut().unwrap().record.state = "running";
    }
    pub fn retire(&mut self, reason: &'static str, failed: bool) {
        if let Some(e) = self.active.as_mut() {
            if e.record.state != "retiring" {
                e.record.state = "retiring";
                e.record.reason = reason;
            }
            if failed {
                e.metrics.failed.store(true, Ordering::Release);
            }
        }
    }
    pub fn reap(&mut self, cleanup: impl FnOnce()) -> bool {
        if let Some(e) = self.active.as_mut() {
            if e.record.state != "retiring" || Arc::get_mut(&mut e.metrics).is_none() {
                return false;
            }
        } else {
            return true;
        }
        let now = self.now();
        let mut e = self.active.take().unwrap();
        let (sequence, stale) = e.metrics.read(&mut e.record.numeric);
        e.record.sequence = sequence;
        e.record.stale = stale;
        e.record.failed = e.metrics.failed.load(Ordering::Acquire);
        e.record.state = "finalized";
        e.record.retired = Some(now);
        cleanup();
        self.lifetime.merge(&e.record.numeric);
        if self.completed.len() == 64 {
            self.completed.pop_front();
            self.evicted = self.evicted.saturating_add(1);
        }
        self.completed.push_back(e.record);
        true
    }
    pub fn current(&mut self) -> Option<&Record> {
        if let Some(e) = self.active.as_mut() {
            let (sequence, stale) = e.metrics.read(&mut e.record.numeric);
            if !stale {
                e.record.sequence = sequence;
            }
            e.record.stale = stale;
            e.record.failed = e.metrics.failed.load(Ordering::Acquire);
            Some(&e.record)
        } else {
            self.completed.back()
        }
    }
    pub fn quiescent(&self) -> bool {
        self.active.is_none()
    }
    pub fn pending(&self) -> bool {
        self.active
            .as_ref()
            .is_some_and(|e| e.record.state == "retiring")
    }
    pub fn diagnostics(&mut self, after: u64) -> serde_json::Value {
        self.current();
        let oldest = self.completed.front().map(|r| r.id);
        let last = self.completed.back().map(|r| r.id);
        serde_json::json!({"schema":"alive-stream-epochs-v1","run_id":self.run_id,"active":self.active.as_ref().map(|e|e.record.json(true)),"completed":self.completed.iter().filter(|r|r.id>after).map(|r|r.json(true)).collect::<Vec<_>>(),"lifetime":self.lifetime.json(true),"oldest_retained_epoch":oldest.map(|n|n.to_string()),"last_completed_epoch":last.map(|n|n.to_string()),"evicted_epoch_count":self.evicted.to_string(),"retiring_epoch_id":self.active.as_ref().filter(|e|e.record.state=="retiring").map(|e|e.record.id.to_string()),"native_quiescent":self.quiescent(),"coverage_gap":oldest.is_some_and(|n|after.saturating_add(1)<n),"complete":self.quiescent(),"duration_upper_edges_ns":edges().map(|n|n.to_string()).to_vec(),"utilization_upper_percent":(0..=200).collect::<Vec<_>>(),"timing_boundary":"fill entry to fill return; final clock read and publication tail excluded","numeric_record_bytes":std::mem::size_of::<Numeric>(),"active_numeric_storage_bytes":2*std::mem::size_of::<Numeric>()+std::mem::size_of::<Metrics>(),"completed_ring_numeric_limit_bytes":64*std::mem::size_of::<Numeric>()})
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn identity() -> Identity {
        Identity {
            requested_buffer_frames: Some(256),
            rate_hz: 48000,
            channels: 2,
            sample_format: "f32".into(),
            host: "test".into(),
            device: "test".into(),
            source_id: "test".into(),
            timing_enabled: true,
        }
    }
    #[test]
    fn duration_edges_and_exact_per_buffer_budgets() {
        let mut n = Numeric::default();
        assert_eq!(n.finish(0, 1000, Some(256), 48000).0, 0);
        assert_eq!(n.finish(0, 1001, Some(256), 48000).0, 1);
        assert_eq!(n.finish(0, u64::MAX, None, 48000).0, 255);
        assert_eq!(n.finish(5, 4, None, 48000).0, 0);
        assert_eq!(n.v[CLOCK], 1);
        let mut n = Numeric::default();
        n.finish(0, 5_333_333, Some(256), 48000);
        assert_eq!(n.v[OVER], 0);
        n.finish(0, 5_333_334, Some(256), 48000);
        assert_eq!(n.v[OVER], 1);
        assert_eq!(n.utilization[100], 1);
        assert_eq!(n.utilization[101], 1);
        n.finish(0, 0, Some(0), 48000);
        assert_eq!(n.v[BUDGETS], 2);
        n.v[SUM] = u64::MAX;
        n.finish(0, 1, Some(1), 48000);
        assert_eq!(n.v[SUM], u64::MAX);
        assert_eq!(n.v[OVERFLOW], 1);
    }
    #[test]
    fn independent_closures_keep_late_errors_and_native_state_until_both_drop() {
        for reason in ["build_failed", "play_failed", "stop"] {
            let mut epochs = Epochs::default();
            epochs.begin(identity()).unwrap();
            let data = epochs.callback_owner();
            let errors = epochs.callback_owner();
            epochs.retire(reason, reason != "stop");
            assert!(!epochs.reap(|| panic!("premature native cleanup")));
            assert!(epochs
                .begin(identity())
                .unwrap_err()
                .starts_with("retirement_pending"));
            drop(data);
            errors.error(true);
            assert!(!epochs.reap(|| panic!("late error owner still exists")));
            assert_eq!(epochs.current().unwrap().numeric.v[XRUN], 1);
            assert_eq!(epochs.lifetime.v[XRUN], 0);
            drop(errors);
            let mut cleaned = 0;
            assert!(epochs.reap(|| cleaned += 1));
            assert!(epochs.reap(|| cleaned += 1));
            assert_eq!(cleaned, 1);
            assert_eq!(epochs.lifetime.v[XRUN], 1);
            assert_eq!(epochs.completed.len(), 1);
        }
    }
    #[test]
    fn retention_eviction_merges_each_attempt_once_and_reports_cursor_gap() {
        let mut e = Epochs::default();
        for i in 0..66 {
            e.begin(identity()).unwrap();
            let m = e.callback_owner();
            m.error(i % 2 == 0);
            drop(m);
            e.retire("build_failed", true);
            assert!(e.reap(|| {}));
        }
        assert_eq!(e.completed.len(), 64);
        assert_eq!(e.completed.front().unwrap().id, 3);
        assert_eq!(e.evicted, 2);
        assert_eq!(e.lifetime.v[ERRORS], 66);
        assert_eq!(e.lifetime.v[XRUN], 33);
        assert!(e.diagnostics(0)["coverage_gap"].as_bool().unwrap());
        assert!(!e.diagnostics(2)["coverage_gap"].as_bool().unwrap());
        assert!(std::mem::size_of::<Numeric>() + 128 <= 8192);
        assert!(64 * std::mem::size_of::<Record>() < 1024 * 1024);
    }
    #[test]
    fn reader_contention_returns_cached_payload_after_three_attempts() {
        let m = Metrics::default();
        let mut n = Numeric::default();
        n.tick(ENTER);
        let (d, u) = n.finish(0, 1000, Some(256), 48000);
        m.publish(&n, d, u);
        let mut cache = Numeric::default();
        assert_eq!(m.read(&mut cache), (2, false));
        m.sequence.store(3, Ordering::SeqCst);
        assert!(m.read(&mut cache).1);
        assert_eq!(cache.v[ENTER], 1);
        assert_eq!(cache.duration[0], 1);
    }
    #[test]
    fn concurrent_publication_reads_are_coherent_or_stale() {
        let m = Arc::new(Metrics::default());
        let writer = m.clone();
        let worker = std::thread::spawn(move || {
            let mut n = Numeric::default();
            for _ in 0..20000 {
                n.tick(ENTER);
                let (d, u) = n.finish(0, 1000, Some(256), 48000);
                writer.publish(&n, d, u);
            }
        });
        let mut cache = Numeric::default();
        for _ in 0..2000 {
            m.read(&mut cache);
            assert_eq!(cache.v[ENTER], cache.v[SAMPLES]);
            assert_eq!(cache.v[SAMPLES], cache.duration[0]);
        }
        worker.join().unwrap();
        m.read(&mut cache);
        assert_eq!(cache.v[ENTER], 20000);
    }
}
