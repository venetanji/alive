# Semantic Boundaries

Every claim is bounded to the supplied input score and environment. `objects.json`
contains official interface metadata; an object having documentation is not a
claim that it is implemented in Alive. Tests ran in Max 9.1.5 Windows x64 under
Wine 11.13, not native Windows/macOS, Max 8, RNBO, or the Live scheduler.

- Several installed XML argument/port entries contain literal template markers
  such as INLET_TYPE, OUTLET_TYPE and TEXT_HERE. They are not type specifications.
  Method descriptions and bounded scores provide evidence where available;
  exact port/default details absent from those sources remain deferred.
- Integer/float selectors are preserved by distinct JS handlers. Within lists,
  Max JS converts numeric atoms to JavaScript Numbers, so per-atom int/float
  distinctions are not recoverable from this logger. JSON numeric spelling also
  does not preserve `2` versus `2.0`. Use top-level selectors for typed scalars.
- `symbol foo` and arbitrary selector `foo` are different messages. The input
  score retains literal message box syntax; commas, semicolons and dollar
  substitution have Max message-box semantics, not generic string splitting.
- A logger receipt is not a timestamp of an event in the high-priority thread.
  Max JS may defer high-priority input. Current scheduler probes use Overdrive
  off, Scheduler in Audio Interrupt off and DSP off. No claims about race-free
  high-priority delivery, transport, sample-accurate automation or real-time
  deadlines follow. Wall time is diagnostic and distinct from sequence order.
- `send` documentation explicitly says reception order of multiple receivers is
  not deterministic. Preserve this run's order as evidence, not a portable
  contract. `#0` abstraction instances were tested; `#0` inheritance in embedded
  patchers, `#1` arguments, poly~, bpatcher and Live namespaces are deferred.
- Nested loadbang and parameter initialization order describes this fixture;
  do not generalize to arbitrary graphs, pattr, plug-in or Live initialization.
- Numeric overflow, NaN/Inf, denormals, divide-by-zero, very long lists, Unicode
  symbols, escaped delimiters, transport units and thread saturation are untested.
- UI message handling is observed. Mouse, keyboard, visual formatting, focus,
  accessibility, undo, automation, gain~ taper and physical output remain deferred.
- DSP capture uses offline buffer~ recording, no microphone or physical output.
  Audio output object was instantiated under NonRealTime only. Faust's oscillator
  may use sine phase, a different wavetable/interpolator, state reset and ramp
  scheduling; do not assume sample identity. Compare phase-aligned waveforms,
  frequency/amplitude and event alignment with explicit tolerances.
- Output traces do not capture the Max Console's error channel. A stimulus with
  no output must not be labelled accepted or silently ignored: it may report a
  Max diagnostic. The original startup logs rotated during host setup, and the
  error stream was not retained for the first message run. This is a known
  capture gap, not evidence that invalid messages produce no error.
- Standalone Max displayed saving disabled. The existing Max for Live access
  was tried in a disposable empty set after user approval; the copied session
  remained at Starting Max Editor. No Max-saved format snapshots or self-created
  AMXD were obtained. This does not establish that the original installation's
  editor is unusable. The private display/session ended before a snapshot save.
