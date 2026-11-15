# Analog Live Controls

Followup to the original installed-layout import. The native Analog test host
now connects admitted original panel controls to the actual DSP DLL through
block-boundary parameter mailboxes. This qualifies the control path for the
intended generic Ultra object; canvas object registration and Alive admission
are separate outstanding work.

## Evidence And Mapping

The pinned Analog DLL remains SHA-256
`4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133`.
The original XML provides symbolic connections and inherited signal-chain and
envelope scopes. Named property records in DLL module instances, descriptor
registration, and 59 installed preset model trees allow those connections to be
joined to the native parameter interface. Only authored interoperability facts
are recorded in `apps/ultra/ui/analog-parameter-facts.mjs`; original XML, artwork,
presets, and application code stay outside the repository.

Private evidence is under
`~/.cache/alive-ultra-evidence/analog-bindings-20261031/`:

- `ui/binding-map.json` and `.csv`: 169 symbolic keys with source hashes,
  resource offsets/scopes, module/property observations and conversion limits.
- `ui/source-manifest.json`, `ui/verification.json`, `ui/FINDINGS.md`: retained
  input identities, deterministic rerun checks and confidence boundaries.
- `native/matrix-results.json`: 20 direct-DLL held-note causal cases.
- `native/mailbox-results.json`: production mailbox held-note PCM/revision cases.
- `native/batch-summary.json`: bounded setter-batch import/time observations.

Retained REA registration Evidence:
`ev_9c4982588d4c4cddbc5a45b8b5fee06fac406780ff0a027e6c501e70059b6ca4`.
Setter Evidence:
`ev_2e186369a48cb72e17816dfc0c534d98e142a9b9c79d53905b9d5183fa03775d`.
Native setter entry is `0x18001d220`. Static observations establish structure;
runtime PCM establishes causal changes for the tested parameters.

The adapter admits 124 single-descriptor parameter identities whose model/native
domains match, including corroborated module/property names, runtime-confirmed
root Volume, and oscillator octave/semitone offsets. Every descriptor's full
index/module/property/type/range is checked again at connection. Normalized
controls expose raw 0..1 values; integer selectors expose raw numeric choices.
The later [values report](analog-values.md) supersedes the original raw-value
display with qualified physical curves, named choices and installed defaults.
It also records the inverse model/native conversion for F1/F2 balance.
Other paired signed modulation, FilterType/LFOSync, wrapper polyphony/unison/MPE
and unmapped gate reset stay disabled. Both pitch-envelope initial controls now
use causally qualified magnitude/sign pairs, described below. Raw oscillator and amplifier level zero is a
finite gain floor; root Volume zero is an actual mute.

## Transport And UI

The UI maintains one IPC request in flight and a coalesced latest desired value
per parameter. Native requests carry an instance generation and return a
requested/applied revision snapshot. Older polls and old-instance completions
cannot replace newer optimistic values. Host polling also checks its lifecycle
epoch after awaiting a response. Stopping disconnects the controls.

The native player uses 203 lock-free packed value/revision slots, separate from
the note queue. The callback owner applies changed slots before MIDI for that
callback, then publishes applied revisions. GUI/Rust producer code never calls
the DLL setter directly. This establishes block-boundary updates; it does not
establish sample-accurate interleaving of notes and automation. Requested/applied
state is commanded state, not a DLL state getter. Open/close remain quiescent;
Rust serializes producers.

The imported panel refreshes shared controls in place, retaining detail-page
navigation and numeric drafts. Repeated bindings stay linked. A bounded AST
interpreter handles the observed resource condition grammar without `eval` or
arbitrary script execution. Known on/off and alternate-view conditions track
optimistic model values; unknown conditions remain disabled/hidden. Custom
LFO drawing and routing LEDs remain unresolved, and some layout labels differ
from Live.

## Central Editors

Module pointer/focus selection switches the resource-defined central CardView.
Osc1/2 show pitch envelopes, Filter1/2 and Amp1/2 show their respective ADSR
editors, LFO shows the shared page, and Global exposes its Global/MPE subpages.
Graph bindings retain the selected chain and envelope scope. Numeric edits and
graph edits share the same model. LIN/EXP are separate options, and Legato/Free
are square switches. Caption widths and bounded grid allocation keep the Loop
chooser inside the original 490x83 inspector.

The new SVG graphics are authored normalized-parameter diagrams, based on
original layout facts and retained manual screenshots. They are not recovered
Live drawing implementations or verified physical time/pitch plots. Exact loop
shape behavior, physical conversion curves and LFO waveform order remain open.
Original XML, screenshots and binary-derived evidence remain private under
`~/.cache/alive-ultra-evidence/analog-central-20261031/`.

Pitch Initial's chain-1 pair is magnitude index39/module3513/property10 and sign
index40/property16; chain2 uses indices122/123 in module3521. The adapter maps
signed value v to magnitude abs(v) and sign (v<0). Direct PCM probes at magnitude
.5 measured early pitches ~310.530Hz and ~221.962Hz around a ~262.428Hz base;
both settle back to base. At magnitude zero both signs give bit-identical PCM.
The pitch Time indices are33/116. Probe results and methods are retained in the
private central evidence directory's `native/` folder.

A generic batch transport publishes magnitude/sign coherently before rendering.
An odd/even sequentially consistent request epoch fences a complete publication;
the callback takes one bounded snapshot attempt and defers incomplete writes
without locks, waits or retries. Coherent control-side snapshots fence requested
and applied epochs. Native stress coverage runs 2000 concurrent publication/read
iterations. UI acknowledgments validate every descriptor and the instance
generation. Active graph gestures abandon stale generations rather than restoring
old values into a new instance; same-generation Escape reverses preview edits.

## Causal Qualification

Independent production mailbox probes hold a note and compare against a
deterministic reference. Pre-change PCM is bit-identical in every case.

- 10,000 coalesced Volume writes plus final zero advance applied revision from
  2 to 10003 on the next callback and settle to exact stereo silence.
- Amp1 Pan 0 silences the right channel exactly.
- Filter1 cutoff .85 to .25 reduces the fraction of power above 2 kHz from
  .0439059 to 1.20768e-8.
- Restoring the controls returns the final 8192 frames bit-for-bit to reference;
  all four production cases retain fault zero and pass note-off/close.

The user's subsequent repeating-note report exposed a separate initialization
bug: setting every native parameter to its midpoint enabled envelope Loop=2 and
FreeRun=1 on all four envelopes. A/B PCM runs reproduce continuing sound for at
least four seconds after note-off. The startup patch now sets those eight flags
to zero. It sustains while held, reaches exact zero .296625 seconds after release,
stays silent through four seconds, and retriggers/releases successfully. No time
curve changes were needed. Private methods and PCM are retained in
`native/envelope-release/`; the production native test now checks settled note-off
silence directly. The original DLL's envelope generators remain responsible for
the sound; the new envelope editor controls their qualified native parameters.

Direct-DLL probes additionally confirm both signal chains, module toggles,
resonance, pitch octave/semitone/fine movement and root Volume scaling. These
are raw-domain measurements, not a claim of physical-unit conversion fidelity.
Setter batches used no observed adapted allocator/lock imports, but this is
neither a complete internal allocation audit nor a hard realtime bound.

## Verification

Run `node --test apps/ultra/ui/*.test.mjs`, the native
`apps/ultra/tests/external_device_run.py` against the pinned DLL, and focused
Playwright specs `analog-test`, `live-device-resources`, and `live-controls`.
The optional real-resource browser tests require `LIVE_RESOURCE_DIR` and
`ULTRA_TEST_NO_CAPTURES=1`. They verify actual imported controls and host IPC;
native PCM probes independently qualify the DSP effects. Browser mocks do not
by themselves establish audible output.

Build into a fresh private CMake directory while a user window is running;
never truncate its mapped shared library. Point `ULTRA_NATIVE_LIB_DIR` and the
launched process's `LD_LIBRARY_PATH` at the same private build. No installed
Ultra executable is replaced.
