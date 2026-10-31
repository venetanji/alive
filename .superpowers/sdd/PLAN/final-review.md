# Alive Final Architecture And Acceptance Review

Scope: `31033483eb3baf15edab1734b966cc6d55c4b8c7..7b5e76c`, plus the
parent's in-progress endurance-observer correction in
`apps/ultra/tests/check_alive_desktop.py`. Reviewed against PLAN.md and
`apps/alive/SESSION_CONTRACT.md`. No production edits, commits or delegation.

Verdict: no outstanding Critical or Important implementation findings. The
one new Important acceptance-observer finding was addressed during review.
The final 600-playing-second run remains pending at this review's timestamp;
this review does not mark that acceptance gate complete.

## Scoped Display Fix Re-Review

Approved `130b2b1` for the prior Minor automation-base display finding.
Lane invalidation includes current bound bases/ranges and musical lane data;
live refresh repaints changed base segments, including empty lanes. Unchanged
poll frames retain the existing SVG nodes. Notes, lane points and authoring
inputs do not need reconstruction for a base-only update.

The hosted editor's fitted zoom option now represents arbitrary fitted scales
in the selector, and the selected value is synchronized with the canvas scale
and graph summary. Existing preset scales remain available.

Fresh verification:
`node --test apps/ultra/ui/alive-model.test.mjs apps/ultra/ui/alive-dom.test.mjs`
passes all 10 tests, including delayed-first-point/empty-lane base updates and
Fit/manual zoom synchronization. No new regression found in this fix.

## Important Acceptance Finding, Addressed

Original location: `apps/ultra/tests/check_alive_desktop.py:298` and
`apps/ultra/tests/check_alive_desktop.py:310`; related reset behavior in
`apps/ultra/src-tauri/src/audio.rs:177` and
`apps/ultra/src-tauri/src/audio.rs:206`.

The original endurance harness periodically applied a draft, stopping and
restarting Driver I/O and resetting its counters. It asserted zero stream
errors only at the final snapshot, with intermediate logs every three cycles.
An error from an earlier stream could therefore disappear before the final
assertion. A final zero alone did not substantiate zero observed errors over
the entire endurance journey.

Reviewed correction: each playing cycle now snapshots and persists current
audio observations before Stop/possible Apply, checks stream errors, failure
and native rejected commands, and checks that absolute frames advanced during
the cycle. Snapshot persistence precedes assertions, so evidence survives a
failure. This covers each playing interval before a stream reset. Counts must
still be described as observed CPAL stream errors, not physical underruns or
an independently measured xrun count.

Focused verification parsed the complete harness and executed its actual log
function with controlled snapshots: a clean snapshot passed, while a nonzero
stream-error count, failed flag or rejected-command count each failed after
persisting the offending observation. The parent stopped the old partial run
and restarted the full 600-second acceptance run at `/tmp/alive-native-final`.
Its final receipt must be inspected before making an endurance success claim.

## Architecture And Requirements

- The callback remains the sole frame clock and device executor. Rust prepares
  graphs, schedules, file state and admission outside callback ownership. The
  native API bounds event density/storage, command snapshots, tracks, voices
  and parameters, with a separate Stop epoch. Prepared node constraints and
  command-head/Stop ordering retain the earlier reviewed corrections.
- Both tracks consume independent document roots from real saved Ultra device
  references. Explicit native signal paths and stereo routing are preserved;
  the example/host do not embed another synthesizer. Unsupported legacy Voice
  and named cross-root paths are rejected rather than silently delayed/mixed.
- Live bases and mixer values stay separate from the prepared musical draft
  and automated effective values. Apply merges current live values before
  preparation. Native node validation occurs before enqueueing supported live
  edits; callback state does not depend on an editor window or UI poll.
- Desktop commands authenticate actual native window labels, current instance
  generation and editor track scope. Driver retirement precedes graph reset,
  slot replacement and destruction. Hosted editor close releases UI only;
  replacement closes stale views and stale commands reject.
- Prospective dependency/admission failure preserves the current schedule.
  Installation has explicit rollback with fresh revisions and restoration
  errors. Persistence stores stable references and saved bases, uses relative
  paths and same-directory atomic replacement, and protects source devices.
- The first profile's one-or-two-track requirement, whole-session clip/loop
  length, stopped structural source/Replace workflow and software-only audio
  qualification are explicit. No undocumented expansion to a full arrangement,
  arbitrary JIT DSP, external MIDI or physical latency qualification is implied.

## Evidence Inspected

- `/tmp/alive-final-native.log`: guarded Alive and existing native gates pass;
  both 42-cycle Stop/edit stress paths pass with 43,008 compared samples.
- `/tmp/alive-final-rust.log`: 150 tests passed, 2 explicitly ignored, no failures.
- `/tmp/alive-final-contracts.log`: numeric/arithmetic/message/print and related
  recorded-reference/protocol checks pass; the message oracle reports 0 failures.
- `/tmp/alive-native-journey5/native-session-report.json`: actual Tauri/native
  device loading, musical preparation, live edits/mixer, hosted editor
  close/reopen, save/reopen/play, missing-device preservation and removal. Its
  software loopback contains 1,202,176 captured frames, peak 0.3726453483 and
  matching stereo after setup; final observations show running audio, active
  voices and zero reported stream errors/rejections. Deliberate stopped periods
  appear in capture; this short journey is not the endurance proof.
- `.superpowers/sdd/PLAN/task-3-backend-review.md`: prior package-resource lookup
  and asynchronous webview-creation corrections are approved; current source
  preserves them. New session probe/desktop CI steps and packaging mappings are
  present. Exact final-commit remote CI remains a delivery check, not a source
  implementation defect.

## Remaining Acceptance Limits

Inspect the final 600-playing-second receipt, captured audio, all per-cycle
observations and process-tree resource samples, then qualify any growth/error
conclusion to that measured workload. Physical audio, hardware deadlines,
end-to-end MIDI/analog latency and Windows runtime remain untested. The known
JACK diagnostic's legacy +64 latency declaration is documented separately from
Alive's CPAL/native profile. Pending documentation, PR delivery and remote CI
are already tracked by the parent and are not new implementation findings.

## Final Receipt Addendum

Independently inspected the retained post-fix receipts in
`experiments/alive-session-20261024/` for runtime `e841f6f`. Local software
endurance acceptance is now supported: 602.551206 playing seconds across 47
edit/transport cycles, with all 47 consecutively numbered pre-Stop/possible-Apply
observations present. Those snapshots show playing transport and increasing
absolute frames; all 64 observations show zero reported CPAL stream errors,
failure flags and rejected commands. Quit Cancel preserves the session and Quit
Discard exits. This closes the earlier counter-reset observation requirement.

The 840.576-second capture contains 40,347,648 stereo frames with nonzero peak
0.3550373316. Independently hashed `/tmp/alive-native-accepted/endurance.f32`
and verified its byte count against the receipt; both match. Silent bins occur
in this journey with deliberate Stops/Apply and are not described as continuous
uninterrupted sound. `verify.py` passes for all 15 retained assets/source
identities and acceptance assertions; it does not replay native execution.

Recomputed all resource-summary start/end/min/max/delta fields from the 17 raw
samples: RSS +28,824 KiB, PSS +50,564 KiB, descriptors 202 to 164 and threads
128 to 105. Every sample after initial child retirement has three processes.
The separate eight-reopening evidence retains one WebKit worker throughout
after the teardown fix, compared with nine before it. Positive memory growth
and concurrent-process/sharing effects are explicitly recorded; no zero-growth
or general no-leak conclusion is warranted.

No substantive local acceptance evidence gap remains in this reviewed scope.
Qualification remains private Xvfb/software PipeWire on Linux, Ryzen 9 5900HS,
48 kHz and observed 512-frame buffers; physical audio/deadlines/latency and
Windows remain unmeasured. Final remote CI is still pending and is not approved
or claimed passing by this receipt review. Only this addendum was edited.
