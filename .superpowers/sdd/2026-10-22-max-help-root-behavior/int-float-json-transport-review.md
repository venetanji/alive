# Controller JSON Transport Review

Verdict: **SPEC PASS / QUALITY PASS** for the frozen offline transport correction.
No material findings within the authorized source/test scope.

This independent review inspected the latest transport ruling, focused diff,
actual source and synthetic transport fixtures. It performed no test reruns,
preparation, target launch, runtime observation, screenshot or clipboard action.
Only this review note was written.

## Frozen Bindings

Package: `experiments/max-reference/int-float-runtime-20261022/`.

| Binding | SHA-256 |
| --- | --- |
| Current 18-script aggregate | `11f641871d3800335c750c9c047940af1ec98b703b91320182c4a7288f3619be` |
| `controller.js` | `49d79f9787a65823b859007f9c33678377fbc05872e34c6c581a0c4df9b0af21` |
| `test_transport.cjs` | `4cb2f7a09f1828b39242dd417e30ca512ce95711c3126cb340ae3a20206ece35` |
| Focused diff, 10181 bytes | `9c78bd9c45e75b39f888b685175021c439b9e80e96b8142b4d4e27b6a0863d26` |

The focused diff is
`.superpowers/sdd/2026-10-22-max-help-root-behavior/int-float-json-transport.diff`.
The preparation005 record binds the preceding 17-script aggregate
`f8e957f32edf094d3e2040cd6a78f1f479d16313b44c3e03013953040f4aa04d`.
Comparing every current script digest against that record independently found
only `controller.js` changed, `test_transport.cjs` added, and no scripts removed.
The retained baseline controller matches the preparation005 controller digest.
Its prefix before `read` and entire suffix from `record` are byte-identical to
the current controller, bounding the controller change to `read` and `write`.

Final documentation inspected and independently hash-matched:

| Document | Bytes | SHA-256 |
| --- | --- | --- |
| `int-float-max-report.md` | 44755 | `52513007afeac0a4ec62085876e87c6d0ab0db369ca7ea03b46f8fdcd8082026` |
| Package `README.md` | 14643 | `eb543b51a198c02938216f953a467b9f115056ba43deed33bc924ac6bd340469` |
| Package `schema.md` | 12724 | `65f08d6b926afe54ef129bba8772952c2161008ae0812e5846c6c2f30e26b60d` |

## Specification Checks

- `controller.js:24` preserves the whole JSON value. It escapes non-ASCII
  UTF-16 units before chunking, including paired and lone surrogates, and appends
  one literal newline. Every `writestring` argument is at most 4096 ASCII bytes.
  Splitting a JSON escape between writes does not alter the concatenated file.
- The writer explicitly truncates and resets, checks both results, checks exact
  cursor advance after every chunk, checks final EOF, and closes the opened
  handle in `finally`. Short/stalled writes and failed truncation refuse.
- `controller.js:7` reads bounded strings without artificial fragment newlines.
  It checks finite nonnegative integral length, zero initial cursor, positive
  returned progress consistent with the cursor, and the exact stable final EOF.
  Positive short reads concatenate and continue because the documented count is
  an upper bound. Stalled, oversized or inconsistent reads refuse. Parsing and
  IO failures still close the opened handle.
- The ASCII byte/character progress assumption matches the actual inputs:
  Python config/command serialization uses `ensure_ascii=True` in the unchanged
  `help_runtime.py:25`, and the controller writer now emits ASCII JSON.
- All close diagnostic fields, pre-dispose/per-poll samples, original-handle
  rows, source/request/helper binding and typed observations remain unchanged.
  The close rule at `controller.js:446` still requires actual false or numeric
  zero from root, reader and disposer validity. Missing root validity refuses;
  window/property observations do not substitute for that conjunction.
- Public comparator/schema shapes, geometric/mode policies, raw ACK retention,
  observer/journal/V8 transports and process ownership source are unchanged.
  Capture005's partial ACK is not repaired, rebound or promoted to success.

## Quality And Evidence

The new test loads the real controller source into a synthetic File boundary.
Source inspection confirms meaningful assertions for the oversized failed ACK
with all 31 snapshots and 23 handle rows per snapshot, exact replacement of a
stale suffix, complete roundtrip, 4096/32768 boundary neighbors, Unicode/control
values, paired/lone surrogates and an escape crossing a chunk boundary.
Fault cases cover positive short reads, read stalls/loss/throws/shrink/growth,
nonzero initial cursor, invalid JSON, short/stalled/thrown writes, truncate and
reset failures, final-length mismatch, unavailable files and opened-handle
closure on failure. These fixtures preserve the complete diagnostic payload.

The documentation correctly distinguishes the observed capture005 bytes
(32767 incomplete JSON bytes plus CRLF, 32769 total) from the conservative
synthetic writeline model (32768-byte prefix plus LF). The model reproduces the
size-loss failure without claiming identical runtime bytes.

The parent's retained `results/transport-parent-verification.json` was inspected
and hash-matched at
`a00ab231a63fdc100d75b0e0f320b424be7e25b7da70df3d4ba409340e4cdba3`.
It reports seven Node suites, ten JavaScript syntax checks, eight Python AST
checks, package-only verification and a dry run with `runtime_started:false`,
bound to the reviewed aggregate. Those are retained parent results, not tests
run by this reviewer.

## Runtime Limits

This verdict establishes source/specification quality within the frozen scope.
Actual chunked Max File behavior still requires the parent's fresh diagnostic006
capture. It supplies no new root-validity capability, complete typed close
result, root destruction, fresh reopen, full 54-operation timeline, lifecycle
pass or layout/rendering qualification. The original close gate remains
unresolved and unchanged. Fresh preparation and target activity remain with the
parent after this review.
