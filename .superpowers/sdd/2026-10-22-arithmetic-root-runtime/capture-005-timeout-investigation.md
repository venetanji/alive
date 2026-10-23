# Capture005 Timeout Investigation

Date: 2026-10-23 (Asia/Hong_Kong). Read-only investigation of request 51, `install-plus-r1`.

Verdict: the retained evidence establishes a missing request-51 ACK at the runner's finite wait deadline. It does not locate the delay between command delivery and terminal ACK writing. Repeated validation cost is a plausible hypothesis, not an observed cause. A format/getter failure, a class refusal, an X-server crash, and successful plus eligibility are not established.

## Evidence And Frozen Bindings

The investigation read the public `results/arithmetic-005` projection, the private `arithmetic-max-runtime-005` evidence and the frozen `arithmetic-package-005-historical` implementation. Private descriptor/configuration bodies were used only in memory. No target was launched, preparation made, historical evidence changed or implementation edited.

| Binding | SHA256 / Identity |
| --- | --- |
| Corrected005 ten-file package | `0e81702204d177c3d13590dd617edb64eb0c0344405692219b252d8123e4ecfe` |
| Frozen controller | `febc0bede6c58a4b11667a580e5d845089accd9237ab3c5f52caa632a884726c` |
| Public session | `87961ed65de6fac8d92947f0f3e7ca26e48be7746cc5491a275bf0dfe9420fba` |
| Public capture projection | `964f487038acd028bbd9b80331f20f60dff0c527c361827d01de7c5d5cb2dd98` |
| Public cleanup | `eff1be6a3acf5aaec17c320db343853020052e4b7f6ea0fab5fe1ba57b6db37a` |
| Frozen score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |
| REA capture | `ev_0af2ac7e106424371ec5b4052b952ef28c14689a3b626d5eb474fd756e57a8c8` |
| Parent's capture005 audit | `d2a9fe468be06f8b31d0e8371056530e9951821f44e9a64326b7eb25bf6a6950` |

Capture005 is FAILED with `complete=false`. The completed observations contain 26 times operations, 24 live readbacks, two independently accepted closes and 47 original outlet messages. The parent's completed-row audit found the 47 messages and 168 states match the corresponding complete native rows. That does not complete the arithmetic comparison.

Direct retained observations:

- The runner records 51 command requests. The final command is the correctly bound plus revision-1 installation request 51. Its command file SHA256 is `7a53e382e6d67241fef6ac8e313f76986896991c789971b5f7c2d1b3cdf93261`.
- The current ACK is byte-identical to successful request 50, `close-times-r2`, SHA256 `e5aa7c4c07a7c17f4155bb0539f64953328ba2d5ca6e6454cdc050710664d7fd`. No retained `ack-request-51.json` exists.
- The private journal contains 95 contiguous rows, ends in request 50's `step-complete`, and contains neither a request-51 row nor a `harness-error` row. There is no durable command-consumed or validation-start marker in the frozen controller.
- The private failure class is `TimeoutError`. Command-file to failure-file modification timestamps differ by 10.021644138 seconds. ACK50 to command51 modification timestamps differ by 0.101069368 seconds. These are filesystem wall-clock intervals, not monotonic callback measurements.
- There are no retained plus observations. Actual plus getter/capability attempts, classes, topology and eligibility in capture005 are unknown. Capture004 observations are not transferred to capture005.
- Plus revision definitions each contain 20 inventory rows and four exact geometry policies, with correctly bound owner revision/inlet metadata. Correct configuration is not proof of matching live state.
- The 681-byte private runtime log has no controller progress marker. Its XKB warning is compatible with the standard warning that xkbcomp errors are not fatal to the X server; a cleanup XIO line does not establish an earlier X crash. Parent-supplied REA process samples span 39.34 seconds and still sample processes near cleanup. Neither observation measures request51's controller phase.

## Code Boundaries And Inferences

The frozen runner writes `command.json`, waits up to 10 seconds for an ACK with the new command ID, and only then retains the ACK as an observation. The underlying wait reads/parses the existing ACK and sleeps for 50 ms between unsuccessful checks. Missing retained ACK51 therefore follows from the timeout and is not specific evidence of a serialization failure.

The controller ticker reads commands every nominal 25 ms when not busy. It marks a new command seen/busy, then handles it, without a durable entry marker. Installation calls `max.message("openfile", ...)` synchronously before scheduling its first poll. An open call that does not return would leave no poll or ACK evidence.

Each matching-root poll calls `validateTree`. Persistent validation refusal reaches its terminal throw at attempt 70; a continuously absent or mismatched front root reaches the separate attempt-80 timeout. Both use 100 ms scheduling intervals. Validation resets diagnostics on each pass, and diagnostics reach disk only through a terminal ACK/failure path. Zero retained observations is compatible with an unknown number of earlier in-memory attempts.

On the persistent strict-refusal path, installation's actual `bind` is never called. The repeated work consists of tree validation and binding-precondition functions. A terminal `fail` first appends a `harness-error` journal row and then writes the failure ACK. The absence of that row does not prove that validation was never entered; it also permits failure before/during this terminal boundary.

All three plus candidate bindings and the full inventory/geometry conjunction must pass before capability observations are eligible. Unknown parent topology suppresses the probes and retains strict refusal. Ordinary unavailable, throwing, null, undefined, ambiguous or nonfinite capability results are handled by the controller and do not by themselves imply an unbounded JavaScript retry. A synchronously blocked host property/method call remains unmeasured.

Prior successful large ACKs demonstrate that generic ACK bodies larger than 32768 bytes can be written by the chunked writer. ACK50 is 102719 bytes. The private journal's current 32000-byte length is not evidence of a file-size cap. Neither fact establishes request51 terminal I/O health.

## Offline Tests And Their Limits

All tests were in-memory Node executions of the frozen controller, with no target, display, file writes or added target capability calls.

An actual-descriptor model privately read plus revision-1 inventory/configuration and constructed Max API doubles. It modeled the three source flonums as runtime `number`, using capture004 only as an explicit hypothesis, not capture005 evidence. Geometry, source and owner bindings came from the private descriptor; capability return values were synthetic. After ten warmups, 200 validation passes per case produced:

| Model | Median / P95 / Maximum Per Pass | Result |
| --- | --- | --- |
| Synthetic available capabilities | 0.774 / 1.075 / 30.887 ms | Aggregate strict hierarchy refusal; three diagnostics, four geometry dispositions |
| Unavailable capability methods | 0.779 / 0.968 / 1.099 ms | Same strict refusal and diagnostic/disposition counts |
| Unknown root parent | 0.666 / 0.890 / 1.507 ms | Strict refusal; zero numeric observations and zero capability calls |

The available model counted 282 `getboxattr` calls, 22 `subpatcher` calls, 22 geometry hashes, six plus binding-precondition calls and six capability-observation slots per validation pass. Across 70 eligible failed passes this would be 19740 modeled box-attribute calls, 1540 subpatcher calls, 1540 hashes and 420 capability slots. These counts describe the modeled path. They are not capture005 attempt counts.

Pure JavaScript validation in Node v22.23.3 did not reproduce the target timeout. Node timings do not measure Max/Wine API costs, the legacy Max JavaScript engine, helper initialization, scheduler delay, synchronous blocking or terminal file I/O. The maximum available-model timing is an isolated observation; its cause was not measured. These results cannot rule out the retry-cost hypothesis.

A second test ran the frozen `install` function with a virtual `Task` scheduler and constant synthetic validation costs. Only the host operations and terminal sinks were replaced by in-memory doubles:

| Virtual Scenario | Polls / Validations / Binds | Terminal Time |
| --- | --- | --- |
| Persistent strict refusal, zero callback cost | 70 / 70 / 0 | 7000 ms |
| Persistent strict refusal, 42 ms per validation | 70 / 70 / 0 | 9940 ms |
| Persistent strict refusal, 43 ms per validation | 70 / 70 / 0 | 10010 ms |
| Persistent strict refusal, 60 ms per validation | 70 / 70 / 0 | 11200 ms |
| No matching front root | 80 / 0 / 0 | 8000 ms |
| Settled successful validation, zero callback cost | 10 / 10 / 1 | 1000 ms |

Thus, 70 scheduled 100 ms waits leave approximately 3000 ms, or 42.857 ms extra per failed validation, before a 10-second wait expires. Openfile, ticker dispatch, scheduler lateness, property access and terminal writes also consume that budget. The experiment proves that a finite refusal path can exceed the runner deadline. It does not show which costs occurred in capture005.

## Remaining Hypotheses

| Possibility | Evidence / Limit |
| --- | --- |
| Repeated host-backed validation plus scheduled waits exceeds deadline | Finite virtual model demonstrates plausibility; actual pass count and durations are absent. |
| Command is not consumed, ticker is delayed, or busy remains set | No consumed marker exists. ACK50 completed, but that does not record request51 dispatch. No specific busy-state defect is established. |
| Openfile does not return promptly | It precedes poll scheduling and has no retained boundary marker. |
| Polling begins but root/path access or matching is delayed | Attempt count and root/path-match state are not retained. Nominal no-match duration alone is eight seconds, leaving only two seconds of overhead budget. |
| Tree traversal, geometry/binding checks or an existing capability blocks | These are synchronous host-facing boundaries without timing records. Capability invocation itself is not established. |
| A terminal journal/ACK write stalls or fails | No terminal marker or journal error row exists. Generic large-ACK support does not eliminate a request-specific I/O problem. |
| Target/display termination or global timeout | Retained log/process metadata does not establish a crash; the approximately ten-second command interval supports the per-command wait rather than the 150-second global bound. |

No one hypothesis is selected as root cause. Increasing the ACK deadline, retry capacity or polling interval, relaxing plus admission, inferring V8 behavior or importing capture004 capability outcomes would not resolve the missing measurement.

## Minimal Proposed Capture006 Trace

This is a design for separate review/dispatch, not an implementation or launch authorization. Keep changes to `controller.js` and `test_helpers.cjs`. Derive one private sidecar path from the already sealed `config.ack_path` and `configFile`, requiring exact expected basenames and a common directory; require fresh-work absence before launch. No Python, comparator, public evidence schema, score or policy expansion is needed.

Enable the trace only for the exact request51 / install / plus / revision1 / `install-plus-r1` conjunction. Use bounded metadata records: sequence, wall-clock timestamp/elapsed time explicitly labeled as wall time, phase, request/attempt identity, known local counts/booleans and fixed result/status enums. Do not record raw paths, configuration, exceptions, descriptors, vectors, values/defaults, source text or ACK/readback bodies.

Place enter/return markers at these existing boundaries:

1. Command marked seen/busy and handler entry; openfile call entry and return.
2. Initial/next poll scheduling return and poll callback entry; existing front-root/path evaluation result using the already-read locals, without rereading host properties.
3. Validation entry and returned/refused exit; plus candidate/eligibility outcome derived from the existing decision and existing local counts. Preserve every current inventory, topology, owner-inlet and exact-geometry check before capability entry.
4. Entry/return around each existing format/getvalueof operation, identified by anchor and method, with only the existing unavailable/threw/returned representation metadata. Do not introduce any capability, property or geometry probe and do not repeat a call to produce trace data.
5. Terminal refusal/ACK entry; journal append entry/return; ACK serialization/write entry/return. If the success path is reached, mark its existing bind boundary as well.

Keep a hard record and byte bound large enough for the existing maximum 80 polls (for example 2048 records, at most 512 ASCII bytes each), reserve one final cap marker, and stop tracing at the cap. A review must count the actual instrumented sites against that bound. Trace I/O exceptions must be caught within the trace sink, disable tracing and never become capability throws, controller failures or admission decisions. Partial trace/sink failure is an explicit limitation. Synchronous trace writes add observer cost, so measured timings remain instrumented timings, and trace overhead must be bounded and reported.

The offline review should verify exact phase/call ordering, unchanged host property/capability call counts, unchanged invalid-case zero-call suppression, unchanged exceptions/results with a throwing trace sink, finite cap behavior and absence of private payloads. Existing P1 topology/owner-inlet and P2 exact plus-geometry regressions must still pass. The runner's 10-second ACK wait, controller's 70/80 poll bounds, 100 ms interval, score and strict class refusal remain unchanged.

The resulting trace can distinguish command consumption, openfile return, polling, validation completion, plus eligibility and return of each existing capability. It can still end at an unreturned boundary or a failed trace sink; such an outcome must be reported as that boundary, without inventing the underlying host cause.

## Write Scope

This report is the investigation's only persistent artifact. No implementation, package, score, capture, private evidence or historical report was edited. No preparation, launch, commit, delegation or additional runtime invocation occurred. No silence, saved-order, parity, qualification or numeric-admission claim is made.
