# Task 11 MSVC portability correction

The actual Windows package job 120797175550 at dc76fa9 failed with MSVC C3861
for `__builtin_popcount` and `__builtin_ctz`. The retained red log is
`experiments/alive-clips-m3-20261024/windows-build-dc76fa9/alive-dc76fa9-windows-job.log`.

Replaced these GCC/Clang extensions with C++17 constexpr uint32_t helpers.
Counting terminates in at most 32 iterations; first-bit lookup returns 32 for
zero and reaches the highest bit in 31 iterations. The callback lookup receives
the already validated, nonzero, single-track mask, so its admitted two-track
profile takes at most one iteration (structural eight-track storage at most
seven). The preparation-only ownership count remains bounded by 32 bits.
No profile, work policy, ABI, reducer order, or queue/Stop behavior changes.

The native v3 suite adds compile-time behavior checks for zero, full-width,
sparse, highest-bit, and multiple-bit inputs. Local green commands:

```sh
mkdir -p /tmp/alive-task11-msvc-fix
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  -DULTRA_ALIVE_SESSION_TEST_TRACE -c apps/ultra/src-tauri/native/backend.cpp \
  -o /tmp/alive-task11-msvc-fix/backend.o
for test in alive_session_v3_test alive_session_test alive_session_v2_test; do
  c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
    -DULTRA_ALIVE_SESSION_TEST_TRACE apps/ultra/tests/${test}.cpp \
    /tmp/alive-task11-msvc-fix/backend.o apps/ultra/build/core/libultra_core_bundle.a \
    -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock \
    -ldl -lrt -o /tmp/alive-task11-msvc-fix/${test}
  /tmp/alive-task11-msvc-fix/${test}
done
```

All commands exit 0. Logs in that directory retain the v3 admission/prime clips/
partitions/quantization/receipts/Stop/callback guards PASS, v1 exact-frame/
ownership/Stop/seek/loop/isolation/mixer PASS, and v2 ordered chains/exact bypass/
warm state/partitions/ownership/resets/admission/overload/callback guards PASS.
The unchanged timing matrix was not rerun. This Linux result does not establish
MSVC or Windows packaging qualification; the next pushed-head Windows job is
still required. Self-review found no unbounded loop or zero-mask indexing path
introduced by the replacement.
