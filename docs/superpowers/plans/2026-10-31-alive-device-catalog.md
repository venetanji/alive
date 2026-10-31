# Alive Device Catalog Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute
> this plan task-by-task. Do not spawn additional agents from an implementation
> or review assignment. The controller owns integration and review dispatch.

**Goal:** Populate Alive's existing browser with bounded, qualified descriptors
from bundled devices, the user's saved Ultra library and installed Live device
candidates, without constructing DSP while browsing.

**Architecture:** Native providers produce a paged metadata index separate from
session/audio ownership. The existing browser merges project references and
clips, searches all loaded metadata and routes qualified activation through its
captured-target load/drop path. Unsupported installed candidates stay visible
with useful reasons and cannot enter the loader.

**Tech Stack:** Existing Rust/Tauri 2 backend and plain JS browser, Node unit
tests, sandboxed Chromium and the private Tauri desktop harness.

**Spec:** `experiments/native-devices-20261031/alive-device-hosting.md`, especially
Current Alive Baseline and Browser Population And Loading Contract.

This implements delivery 0 of the full hosting goal. Saved presentation, Analog
ownership/transport, other profiles, native audio input and MIDI/rack import
remain requirements of that goal and are tracked in the hosting ledger. They
do not become complete when this catalog plan is complete.

## Global Constraints

- Work only in `/home/venetanji/.codex/worktrees/phase2-ui/alive` on
  `feat/phase2-ui-fidelity`; preserve the concurrent `2a0f` runtime and source.
- No old-schema readers, migrations or compatibility fallbacks. Update current
  fixtures/callers together. Do not raise native capacity or qualification.
- Never construct/load DLLs or install a graph for discovery, selection, refresh
  or search. No filesystem work or catalog lock on the audio callback.
- Keep current stable track/generation/revision authorization, stopped device
  graph editing, selection preservation and per-card draft behavior.
- No proprietary binaries, resources, preset payloads, disassembly or private
  packet exports in git. Authored names, paths, hashes and mappings are allowed.
- All three musical class names are `instrument`, `audioEffect`, `midiEffect`.
  Project clips remain `source`. Existing browser-only `effect` is replaced
  directly; native session effect action names remain their current API.
- Keep the native library frozen until a separate host-integration task builds
  to a fresh path. Do not close user windows or dispatch cloud CI.

## Contract

The current command becomes `alive_browser_catalog({request})`:

```js
const request={refresh:false,cursor:null};
const page={
  revision:'1',
  entries:[{
    id:'bundled:subtractive',provider:'bundled',name:'Subtractive',
    kind:'instrument',path:'/resolved/subtractive.ultra',profile:null,
    qualification:'qualified',availability:'ready',reason:null,
    description:'Bundled Ultra device',dependencies:[]
  }],
  nextCursor:null,notices:[]
};
// A continuation cursor is {revision:'1',offset:64}; it belongs to one index.
```

Providers are `bundled`, `user` and `live`; project entries are composed by JS.
`qualification` is `qualified`, `candidate` or `unsupported`; `availability` is
`ready` or `unavailable`. Only qualified + ready + a nonempty saved-device path
can activate or drag. A discovered DLL alone has no loadable saved-device path.
Dependencies are bounded `{kind,identity,available}` metadata, without payloads.

The index serves 64 entries/page, at most 1024 descriptors. User-library walking
is bounded to 4096 visited filesystem entries, depth 8 and 16 MiB aggregate file
reads, at most 2 MiB per file before canvas's stricter schema limits apply.
Never follow directory symlinks; canonicalize/deduplicate actual device paths.
Sort deterministically and report every exhausted discovery bound in notices.
Invalid files or missing roots must not hide unrelated valid results.

## Task 1: Native Catalog Providers And Paged IPC

**Files:** Modify `apps/ultra/src-tauri/src/session/browser.rs` and
`apps/ultra/src-tauri/src/session/desktop.rs`; create focused helper modules under
`apps/ultra/src-tauri/src/session/browser/` if useful. Tests live with providers.
Only change Alive setup/command registration if required for its dedicated
catalog state; do not change audio ownership or device installation.

**Interfaces:** Produce the Contract above, serialized in camelCase. Use a
catalog cache independent of session/audio locks. Build/refresh on
`tauri::async_runtime::spawn_blocking`; no lock survives an await. Reject stale,
malformed or out-of-range cursors explicitly. A refresh atomically replaces the
completed index, preserving its predecessor on a failed rebuild.

- [ ] Write failing tests for installed/source bundled resource resolution,
  partial missing bundled files, valid/invalid user `.ultra` discovery, stable
  identities, duplicate canonical paths, symlink loops, scan/read limits,
  candidate refusal and stable pagination/stale-cursor rejection.

```rust
assert!(page.entries.iter().any(|entry| entry.name == "Subtractive"));
assert!(page.entries.iter().filter(|entry| entry.provider == "live")
    .all(|entry| entry.availability == "unavailable" && entry.path.is_none()));
assert!(index.page(stale_cursor).is_err());
```

- [ ] Run `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib
  session::browser` against the frozen native library and retain red evidence.
- [ ] Implement the descriptor/page/request/index types and the three providers.
  Reuse `canvas::prepare` and `canvas::device::host_manifest` for saved Ultra
  metadata validation; these compile metadata and must not install DSP. Reject
  a document with native-source requirements until Alive admits that exact
  profile. The installed Live provider only inspects known candidate paths.
- [ ] User roots: `$XDG_DATA_HOME/alive/devices` or
  `~/.local/share/alive/devices`, plus explicit path-list
  `ALIVE_DEVICE_LIBRARY_PATHS`. Live roots: explicit path-list
  `ALIVE_LIVE_ROOTS`, then installed Ableton Live directories under the default
  Wine prefix, `~/.wine-ableton` and `WINEPREFIX`, deduplicated. Also honor
  `ULTRA_LIVE_RESOURCES`, the native session's explicit Resources-directory
  override. The read-only native audit provides the known relative candidate
  paths; do not read a private cache as a required
  production dependency. No fake candidate when its artifact is absent.
- [ ] Make cache construction/refresh injectable for isolated tests. Bundled
  entries that fail validation expose their reason. A user device's ready status
  means current saved-graph admission metadata validates; final load still
  revalidates it. Analog and other installed DLL/Max candidates are unavailable
  until their profile/Alive integration gates pass.
- [ ] Installed candidate facts, relative to `Resources`: standalone
  `Devices/Pc/{Amp,Analog,Cabinet,Collision,Corpus,Electric,Tension}_64.dll`;
  Analog/Collision/Electric/Tension are instruments, the other three audio
  effects. Max prefix is `Max/resources/packages/ableton-dsp/externals/` with
  `abl.device.{autofilter,channeleq,compressor,delay,drift,drumbuss,drumsampler,echo,limiter,redux,reverb,roar,spectralresonator,spectraltime,utility}~.mxe64`.
  Drift and Drum Sampler are instruments; the other thirteen are audio effects.
  These paths prove discovery only; distinguish missing artifacts from present
  candidates without implying a qualified full host or preset importer.
- [ ] Wire the asynchronous command, run provider tests and `cargo check`, and
  commit only this task's files. Report exact changed APIs, tests and limitations.

## Task 2: Browser Availability, Refresh And Existing Loading Paths

**Files:** Modify `apps/ultra/ui/alive-browser.mjs`, `alive-browser.css`,
`alive-device-drop.mjs`, relevant browser loading in `alive.mjs`, and their
Node/DOM and `apps/ultra/tests/ci/alive-chain.spec.mjs` fixtures. Update all current
`alive_browser_catalog` fixtures to the Contract, including region tests.

**Interfaces:** Consume Task 1 pages incrementally through
`onCatalog(request)`. Preserve native catalog IDs instead of deriving every ID
from paths. Deduplicate project aliases of catalog devices by resolved path,
without collapsing multiple candidate/preset identities that have no path.

- [ ] Write regressions for candidate selection showing its reason without a
  native mutation, blocked keyboard/double-click/drag activation, search across
  additional pages, explicit Refresh, stale responses after refresh/disposal,
  retry after discovery failure and retained selection when an ID still exists.

```js
assert.equal(filterEntries(entries,'Analog','instrument')[0].path,null);
assert.equal(filterEntries(entries,'chord','midiEffect')[0].kind,'midiEffect');
```

- [ ] Run those tests red, then add the three device-class filters and a compact
  Refresh Library action using the established icon/type/color language.
  Unavailable rows remain selectable/searchable; show a reason, disable loading
  and dragging. Enforce the same admission predicate in the drop/load handler,
  rather than relying only on disabled browser controls.
- [ ] Fetch subsequent metadata pages asynchronously; preserve already loaded
  results while loading. Cancel stale response ownership on refresh/disposal,
  and report discovery notices without replacing useful results.
- [ ] Keep project clips, arrow/Home/End/Enter navigation and current per-card
  draft preservation. Use `audioEffect` consistently for browser kinds, adapting
  deliberately to existing native load action names at their boundary.
- [ ] Verify no whole-window overflow and usable search/reason/refresh at
  800x600 and 1280x800. Capture both. Run all affected Alive Node and rendered
  browser tests once the focused checks pass, then commit.

## Task 3: Catalog Integration Review And Installed Acceptance

**Files:** Current Alive packaging resource map if newly imported assets require
it; evidence under `experiments/alive-device-catalog-20261031/`; roadmap status.

- [ ] Review provider and browser changes against the hosting spec; fix all
  correctness findings with focused re-verification.
- [ ] Build Alive and Ultra against the frozen runtime. Create a new immutable
  versioned install and verify its manifested sources/artifacts.
- [ ] Exercise actual native browser load/drop/save/playback and candidate
  refusal. Confirm discovery/search/refresh do not construct native devices.
  Inspect native rendered browser at compact and normal window sizes.
- [ ] Update the existing launcher and draft PR with the verified catalog work
  and its explicit native-hosting boundary; leave CI manual and retain all
  remaining full-goal milestones in the ledger.
