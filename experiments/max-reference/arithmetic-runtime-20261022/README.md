# Original Max arithmetic evidence, 2026-10-22

This package preserves one completed original-fixture execution of `+`, `*`,
`-`, `/`, `%`, `!-`, `!/` and `abs`: 31 object creations, 300 ordered input
deliveries, 218 typed scalar receipts and 820 journal rows. The recorded capture
ran from 2026-10-22 00:44:33.521 to 00:45:04.876 UTC. Finalization uses only the
preserved files and does not launch Max or Wine.

REA Evidence ID:
`ev_074aa48ec8f1ce9d52c4e240ffd330aeae2631d933ba683458e54f1de7ccda7e`.

The fixture declares Max 9.1.5 Windows x64. The launcher sampled the copied
`Max.exe` before launch, recording SHA-256
`7a881318209a10d33c982db482297ab870327d5d2cb90aee6e4e01a13e279d8b`
in the REA-bound session record. REA directly captured the Python launcher's
process scenario; its own selected-executable digest identifies Python, not
Max. Neither digest proves an atomic operating-system image binding.

## Evidence and derived files

- `fixtures/` contains the original generated graph, score, target map and JS
  recorder. No installed help patch, script, prose or asset is copied here.
- `results/receipts.jsonl` is the immutable original event journal. Each input
  is bracketed by `stimulus` and `step-complete`; `seq` establishes order.
- `rea-process-evidence.json` contains the complete retained process evidence.
  Its three filesystem checkpoints bind the journal, session and cleanup file
  sizes and SHA-256 digests independently of the package manifest.
- `results/session.json`, `results/cleanup.json`, `results/complete.json`,
  `results/preferences-*.json` and `results/runtime.log` retain capture and
  preservation records. Preference snapshots contain paths and digests only.
- `summary.json` is derived from the frozen score and receipts; its cases retain
  raw receipt sequence references. `sources.json` freezes the recovered fixture
  and harness bytes at finalization and preserves the session's Max digest.
  These source-file digests were not independently checkpointed during capture.
- `results/native-*` records the separate production C++ replay. These generated
  artifacts may be refreshed without changing any original Max receipts.
- `manifest.json` lists every package file's size and SHA-256 except itself and
  Python caches. `derive.py` preserves existing source hashes and refuses to seal
  changed REA-bound files. Installed reference files are not read by finalization;
  no absent historical documentation digests are reconstructed.

## Reading typed results

`selector` records the Max JS `msg_int` or `msg_float` handler that received the
scalar outlet message, independently of whether its value has a fractional
part. `number_repr`, `negative_zero` and `finite` preserve facts JSON numbers
cannot express. In four nonfinite results, `atoms:[null]` is JSON's serialization
of a JS nonfinite number; it does not mean Max emitted a null atom. Two receipts
have `number_repr:["Infinity"]`, and two have `["NaN"]`, all with `finite:[false]`.
The carrier can represent `-Infinity`, but this score did not observe it.

The key observed corrections to the earlier metadata-only contract are that
floating `%` creation works, selected `2e0` creations remain integer and behave
as omitted operands, integer-mode named `in1` works, reverse integer `ft1`
changes the right operand, reverse `set` leaves the tested recall unchanged,
and integer `abs` accepts the first atom of the tested
lists while producing no bang recall. Full observations and explicit unknowns
are in `.impeccable/review/max-fidelity-20261021/arithmetic-oracle.md`.

## Native comparison

The refreshed production replay delivers 291 inputs: **287 compared passes**,
**4 explicit local refusals** and **9 outside-qualified-creation cases** among
the original 300 inputs. Finite values compare at relative/absolute tolerance
`1e-13`; scalar output selectors and zero signs compare exactly. The four Max
nonfinite outputs intentionally produce the local
`arithmetic-result-out-of-range` error without an outlet receipt; they are not
parity passes. Three exponent-created targets, with three events each, are
excluded from native graph replay because modern creation refuses exponents.
That UI/import refusal needs its own product tests.

`native-build.json` records the replay harness and production header hashes.
They are separate from the frozen reference identities. The most recent replay
used the supplied production test binary recorded there; its build/sanitizer
evidence belongs to the separate arithmetic-verification package. Recheck these
source hashes whenever product files change.

## Offline verification

From the repository root:

```sh
python3 experiments/max-reference/arithmetic-runtime-20261022/verify.py
python3 experiments/max-reference/arithmetic-runtime-20261022/verify.py --check-native-current --check-machine
```

The first command checks package and REA checkpoint hashes, source identities,
score order, scalar tags, silence, selected independent arithmetic assertions,
summary derivation, preservation records and native report structure. It reports
native source staleness without invalidating the historical original capture.
`--check-native-current` additionally requires current production source hashes
to match. `--check-machine` checks the exact owned prefix/display and X server
arguments, verifies that the prefix and display socket remain absent, and
compares current preference digests with the saved original/source snapshots.
It prints only scoped process matches and counts, never process environments.
Unreadable process environments remain an explicit attribution limit.

To regenerate only derived indexes and hashes after an authorized native replay
or documentation edit:

```sh
python3 experiments/max-reference/arithmetic-runtime-20261022/derive.py
python3 experiments/max-reference/arithmetic-runtime-20261022/verify.py --check-native-current
```

`compare-native.py` can build the production arithmetic test harness and replay
the frozen score without Max, or accept `--binary PATH`. After any such replay,
reseal with `derive.py`. `generate.py` and `run-runtime.py` are archived capture
sources, not verification commands; do not rerun them to validate this package.

## Limits

The captured private prefix was removed and display `:149` exited. At capture
cleanup, original and source preferences were unchanged across 33 and 1081 files
respectively. Screenshots and clipboard actions are both zero. No audio/DSP
settings or console error text were collected. REA process ownership is sampled;
seven unrelated processes had unreadable environments and were left untouched.
Inherited environment and network activity were not observed.

Bare `!/`'s numerator default of zero versus one is unresolved because both
truncate to zero for the tested hot integer 7. Float-mode direct `in1`/`ft1`,
integer input into float-configured `abs`, numeric atom subtypes inside JS lists,
other exponent spellings, general numeric overflow and all unscored messages
remain unqualified. No installed help root ran: whole-help qualification stays
**0/2103**.
