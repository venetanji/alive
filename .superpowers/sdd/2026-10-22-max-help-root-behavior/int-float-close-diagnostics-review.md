# Frozen Close Diagnostics Review

Verdict: **SPEC PASS / QUALITY PASS**. No material findings remain in this
bounded review of the diagnostic-only close change.

Only this report was written by the reviewer. No tests, preparation, scorer,
target processes, screenshots or clipboard actions were run. This verdict
does not establish successful root destruction, a supported Patcher validity
capability or completion of the reference timeline.

## Frozen Binding

The reviewer independently verified the 17-script aggregate, focused diff and
changed source/test hashes:

| Input | SHA-256 |
| --- | --- |
| Package aggregate | `f8e957f32edf094d3e2040cd6a78f1f479d16313b44c3e03013953040f4aa04d` |
| `controller.js` | `c5f9f1dc4d171ec933316f7675bb056ce90d4ebe4ea38f5ccba1756bc5b5217e` |
| `test_controller.cjs` | `356e40ce19bbdf8a22af157c33fc7076504eaf1f00d6df544f3ac1c12ca25bfa` |
| New `test_close.cjs` | `f2c935487f1ae8209c3926b64c9f17d3e2d21628cc97db5affc4d75c45759012` |
| Focused diff, 18990 bytes | `47ca54adb35c42148823a1a2d5835b87ff4d930e5a6eca57e0d34ff8f1a7aab0` |
| Final worker report | `b7f943f73c76832e0177dcd5dcf2b791a5dac14971a03d32a712b850ed4f3a82` |
| Package README | `5386f00391296e715f9141e456290ef5bac68699e3a9a66d73ba0d8119a4987a` |
| Package schema | `56974583765147ad8ffc87bd294e7fdfd4430c758327eb36e113ca6c0bacf964` |

Package: `experiments/max-reference/int-float-runtime-20261022/`.
Diff:
`.superpowers/sdd/2026-10-22-max-help-root-behavior/int-float-close-diagnostics.diff`.
The changed script set against the retained preparation004 manifest is exactly
controller, controller test and new close test. No scripts were removed.

## Requirements Checked

The explicit post-capture004 brief and design-spec ruling authorize diagnostics
only. Source review confirms that boundary:

- `controller.js:422` retains source/revision/exact-path admission, one documented
  dispose message, and the existing close conjunction: root, reader and disposer
  must each return primitive false or numeric zero. `controller.js:451` preserves
  the 30-poll bound at 100 ms. Unsupported or unavailable validity cannot pass.
- `controller.js:377` preserves distinct returned types, false versus zero,
  undefined versus null, and explicit nonfinite representations. Objects and
  functions receive type tags without generic serialization or coercion.
  `controller.js:386` isolates each read and each exception name/message access.
- `controller.js:396` records one pre-dispose snapshot and every attempted poll.
  It independently reads root/reader/disposer validity, all tracked original
  Basic Maxobjs by anchor, root filepath/firstobject and its validity, and Wind
  access/visibility/association information. Unattempted dependent probes differ
  from returned-null records. No diagnostic handle or exception object is
  serialized, and no wrapper equality or window-only inference is added.
- The diagnostic record binds request, step, action, document, revision, source,
  exact working path and helper hashes. Dispose attempted/result metadata is
  retained. A thrown required validity read still refuses after that poll's
  isolated diagnostics; optional probe failure supplies no alternate pass rule.
- Success and failure ACKs retain the bound record. Failure attachment checks
  the request ID, and the next action resets diagnostic state. The unchanged
  runner at `run-runtime.py:77` exclusively retains ACK bytes and records their
  hash/size before checking success, so failure metadata receives the same raw
  binding. Public checkpoint/comparator shapes remain unchanged.

After verifying the retained preparation004 configuration hash, selected
metadata confirmed exactly 21 int and 23 float original Basic anchors for
each revision. Existing binding populates `state.objects` from every original
Basic definition; the new diagnostic loop visits that complete tracked set.
No private source/config dictionaries or authored strings were printed.

Geometry, numeric mode, observer, preparation, runner and Python validation
sources are unchanged from preparation004. The change neither fixes nor
weakens the close admission rule.

## Coverage And Limits

The inspected new fixture uses a realistic synthetic Patcher without `.valid`;
invalid reader/disposer Maxobjs do not turn that missing root capability into
success. It covers all 31 bounded snapshots, 23 original-handle observations,
each required read returning null/string/object/function/nonfinite/live values,
exceptions in each required read, optional probe exceptions, hostile exception
fields, dispose exceptions, retained owner tracking on refusal, and request
isolation. Handle serialization/stringification traps guard the diagnostic
boundary. False and zero positive cases explicitly invent Patcher.valid and
are labelled conditional in both the new and historical controller fixtures.

The worker reports 33 Python tests, six Node suites, syntax/package checks and
a default nonlaunch dry run passing. The reviewer inspected covering tests
but did not rerun them. The final report and schema accurately retain the
unknown actual close validity and destruction semantics.

Fresh controlled diagnostic capture and independent retained-artifact audit
remain the parent's next gate. This source review makes no new claim about
actual close success, supported invalid-Patcher behavior, reopen/reset,
complete timeline comparison, rendering/layout, physical/shared views,
serialization, saved order, authoring or whole-help qualification.
