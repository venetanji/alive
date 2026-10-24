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
