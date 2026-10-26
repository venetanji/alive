//! Diagnostic-only guards and paired release measurements of the same fill code.
use super::*;
use std::{
    alloc::{GlobalAlloc, Layout, System},
    cell::Cell,
    hint::black_box,
};
thread_local! {static GUARDED:Cell<bool>=const{Cell::new(false)};static ALLOCS:Cell<u64>=const{Cell::new(0)};static FREES:Cell<u64>=const{Cell::new(0)};}
struct GuardedAllocator;
unsafe impl GlobalAlloc for GuardedAllocator {
    unsafe fn alloc(&self, l: Layout) -> *mut u8 {
        GUARDED.with(|g| {
            if g.get() {
                ALLOCS.with(|c| c.set(c.get() + 1))
            }
        });
        System.alloc(l)
    }
    unsafe fn dealloc(&self, p: *mut u8, l: Layout) {
        GUARDED.with(|g| {
            if g.get() {
                FREES.with(|c| c.set(c.get() + 1))
            }
        });
        System.dealloc(p, l)
    }
    unsafe fn realloc(&self, p: *mut u8, l: Layout, n: usize) -> *mut u8 {
        GUARDED.with(|g| {
            if g.get() {
                ALLOCS.with(|c| c.set(c.get() + 1));
                FREES.with(|c| c.set(c.get() + 1));
            }
        });
        System.realloc(p, l, n)
    }
}
#[global_allocator]
static ALLOCATOR: GuardedAllocator = GuardedAllocator;
#[test]
fn warmed_fill_clock_histogram_publication_allocate_and_free_nothing() {
    let metrics = Metrics::default();
    let mut n = Numeric::default();
    let mut l = [0.25; BLOCK];
    let mut r = [-0.25; BLOCK];
    let mut data = [0f32; 512];
    let clock = Instant::now();
    let _ = clock.elapsed();
    GUARDED.with(|g| g.set(true));
    for _ in 0..1000 {
        measured_fill(
            &mut data,
            &metrics,
            &mut n,
            &mut l,
            &mut r,
            |_, _, _| black_box(1),
            || clock.elapsed().as_nanos() as u64,
        );
    }
    GUARDED.with(|g| g.set(false));
    assert_eq!(ALLOCS.with(Cell::get), 0);
    assert_eq!(FREES.with(Cell::get), 0);
    assert_eq!(n.v[CLOCK], 0);
    assert_eq!(n.v[SAMPLES], 1000);
}
#[test]
#[ignore = "explicit release measurement; no timing acceptance threshold"]
fn paired_release_overhead() {
    let raw_output = std::env::var_os("ALIVE_MEASUREMENT_OUTPUT").map(PathBuf::from);
    let clock = Instant::now();
    let metrics = Metrics::default();
    let mut n = Numeric::default();
    let mut l = [0.25; BLOCK];
    let mut r = [-0.25; BLOCK];
    for frames in [256, 512] {
        let mut data = vec![0f32; frames * 2];
        for repetition in 0..3 {
            for mode in [
                "clock_pair",
                "fill_without_timing",
                "fill_with_timing",
                "histogram_publication_tail",
            ] {
                let mut durations = Vec::with_capacity(20000);
                for _ in 0..20000 {
                    let start = clock.elapsed().as_nanos();
                    match mode {
                        "clock_pair" => {
                            black_box(clock.elapsed());
                        }
                        "fill_without_timing" => fill(
                            black_box(&mut data),
                            &metrics,
                            &mut n,
                            &mut l,
                            &mut r,
                            |_, _, _| black_box(1),
                        ),
                        "fill_with_timing" => measured_fill(
                            black_box(&mut data),
                            &metrics,
                            &mut n,
                            &mut l,
                            &mut r,
                            |_, _, _| black_box(1),
                            || clock.elapsed().as_nanos() as u64,
                        ),
                        _ => {
                            let (d, u) = n.finish(0, 1000, Some(frames as u64), RATE);
                            metrics.publish(&n, d, u);
                        }
                    }
                    durations.push((clock.elapsed().as_nanos() - start) as u64);
                }
                if let Some(directory) = &raw_output {
                    use std::io::Write;
                    std::fs::create_dir_all(directory).unwrap();
                    let path = directory.join(format!("overhead-{frames}-{repetition}-{mode}.json"));
                    let mut file = std::fs::OpenOptions::new().write(true).create_new(true).open(path).unwrap();
                    file.write_all(serde_json::to_vec(&serde_json::json!({"source_id":source_id(),"frames":frames,"repetition":repetition,"mode":mode,"duration_ns":durations})).unwrap().as_slice()).unwrap();
                }
                durations.sort_unstable();
                println!(
                    "OVERHEAD={}",
                    serde_json::json!({"mode":mode,"frames":frames,"repetition":repetition,"samples":durations.len(),"p50_ns":durations[10000],"p95_ns":durations[19000],"p99_ns":durations[19800],"p999_ns":durations[19980],"max_ns":durations[19999],"source_id":source_id(),"guard_build":true,"render":"fixed fake render; native guard measurement separate"})
                );
            }
        }
    }
}
#[test]
fn cpal_owned_error_destruction_is_separate_from_the_typed_action() {
    let m = Metrics::default();
    let error =
        cpal::Error::with_message(cpal::ErrorKind::Xrun, "owned backend payload".to_owned());
    ALLOCS.with(|c| c.set(0));
    FREES.with(|c| c.set(0));
    GUARDED.with(|g| g.set(true));
    stream_error(&m, &error);
    let action_allocs = ALLOCS.with(Cell::get);
    let action_frees = FREES.with(Cell::get);
    drop(error);
    GUARDED.with(|g| g.set(false));
    assert_eq!((action_allocs, action_frees), (0, 0));
    assert_eq!(FREES.with(Cell::get), 1);
    println!("CPAL_ERROR_BOUNDARY=typed_action_allocations:0,frees:0; owned_error_drop_frees:1");
}

#[test]
#[ignore = "exact saved-fixture release measurement; requires ALIVE_MEASUREMENT_SESSION"]
fn native_saved_clip_release_overhead() {
    use crate::session::{host::Host, native, read};
    use sha2::{Digest, Sha256};
    let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
    let fixture = PathBuf::from(std::env::var("ALIVE_MEASUREMENT_SESSION").unwrap());
    let fixture_sha = format!("{:x}", Sha256::digest(std::fs::read(&fixture).unwrap()));
    let mut host = Host::default();
    let prepared = host.enable_clips(read(&fixture).unwrap()).unwrap();
    assert!(prepared.document.is_clips() && prepared.document.loop_enabled());
    let count:usize=std::env::var("ALIVE_MEASUREMENT_SAMPLES").map(|value|value.parse().unwrap()).unwrap_or(5000);
    assert!((1000..=20000).contains(&count));
    let raw_output=std::env::var_os("ALIVE_MEASUREMENT_OUTPUT").map(PathBuf::from);
    let mut request_serial = 0;
    for frames in [256, 512] {
        for repetition in 0..3 {
            host.install(prepared.clone()).unwrap();
            assert_eq!(unsafe { ultra_external_start() }, 1);
            request_serial += 1;
            let request = native::RequestV3 {
                kind: native::V3_START,
                preparation_revision: host.preparation_revision,
                request_serial,
                ..Default::default()
            };
            let mut receipt = native::ReceiptV3::default();
            assert_eq!(
                unsafe { native::alive_session_request_v3(&request, &mut receipt) },
                1,
                "request error {}: {}", receipt.error, native::error()
            );
            let metrics = Metrics::default();
            let mut n = Numeric::default();
            let mut l = [0.; BLOCK];
            let mut r = [0.; BLOCK];
            let mut data = vec![0f32; frames * 2];
            let clock = Instant::now();
            let mut durations = Vec::with_capacity(count);
            let mut raw_durations = Vec::with_capacity(count + 64);
            for index in 0..count + 64 {
                let begin = clock.elapsed().as_nanos();
                if cfg!(feature = "telemetry-disabled") {
                    fill(
                        &mut data,
                        &metrics,
                        &mut n,
                        &mut l,
                        &mut r,
                        |n, l, r| unsafe { ultra_external_render(n, l, r) },
                    );
                    metrics.publish(&n, 0, None);
                } else {
                    measured_fill(
                        &mut data,
                        &metrics,
                        &mut n,
                        &mut l,
                        &mut r,
                        |n, l, r| unsafe { ultra_external_render(n, l, r) },
                        || clock.elapsed().as_nanos() as u64,
                    );
                }
                let elapsed = (clock.elapsed().as_nanos() - begin) as u64;
                raw_durations.push(elapsed);
                if index >= 64 {
                    durations.push(elapsed);
                }
            }
            let mut state = native::StateV3::default();
            assert_eq!(unsafe { native::alive_session_state_v3(&mut state) }, 1);
            assert_eq!(state.playing, 1);
            assert_eq!(n.v[RENDER_FAILURE], 0);
            if let Some(directory)=&raw_output {
                use std::io::Write;
                std::fs::create_dir_all(directory).unwrap();
                let path=directory.join(format!("native-{}-{}-{frames}-{repetition}.json",prepared.tracks.len(),if cfg!(feature="telemetry-disabled"){ "disabled" }else{ "enabled" }));
                let mut file=std::fs::OpenOptions::new().write(true).create_new(true).open(path).unwrap();
                file.write_all(serde_json::to_vec(&serde_json::json!({"source_id":source_id(),"fixture_sha256":fixture_sha,"frames":frames,"repetition":repetition,"telemetry_enabled":!cfg!(feature="telemetry-disabled"),"warmup_callbacks":64,"duration_ns":raw_durations})).unwrap().as_slice()).unwrap();
            }
            durations.sort_unstable();
            println!(
                "NATIVE_OVERHEAD={}",
                serde_json::json!({"telemetry_enabled":!cfg!(feature="telemetry-disabled"),"frames":frames,"repetition":repetition,"samples":durations.len(),"p50_ns":durations[count/2],"p95_ns":durations[count*95/100],"p99_ns":durations[count*99/100],"p999_ns":durations[count*999/1000],"max_ns":durations[count-1],"source_id":source_id(),"fixture_sha256":fixture_sha,"devices":prepared.devices.len(),"tracks":prepared.tracks.len(),"backend":"synchronous native external render; no CPAL scheduling","warmup_callbacks":64,"startup_retained_in_metrics":true,"duration_samples":n.v[SAMPLES].to_string(),"native_render_failures":n.v[RENDER_FAILURE].to_string(),"observed_frames_min":n.v[MIN],"observed_frames_max":n.v[MAX]})
            );
            unsafe {
                ultra_audio_stop();
            }
        }
    }
    unsafe {
        native::alive_session_reset();
        for slot in 0..16 {
            crate::ultra_canvas_close_document(slot);
        }
    }
}
