# Max subset inventory probe

This is **not a Max runtime, compiler, translator or compatibility claim**. `max-subset-v1` remains a proposed execution profile. This probe's implemented profile is `max-subset-inventory-v1`: read bounded `.maxpat` JSON into a neutral inventory and diagnose content that is not understood. It never runs objects, follows search paths, opens dependencies, contacts a server or writes patches.

## Run

Python 3.10+ standard library only:

```sh
cd experiments/max-subset
python3 -m unittest -v
python3 max_subset.py fixtures/ordered.synthetic.maxpat > /tmp/ordered.inventory.json
```

Exit 0 means structurally inventoried, **not executable or compatible**. Exit 2 means rejected. Every result has `executable: false`. `unsupported` diagnostics coexist with an accepted inventory; `error` diagnostics reject it. The optional schema test uses an already installed `jsonschema` package; without it that test explicitly skips. No install is needed for the importer or its tests.

The CLI reads only the explicit user-supplied `.maxpat` path and its own bundled catalog. The caller is responsible for authorizing that input file. It does not scan directories. The API accepts source bytes, not paths. Output goes to stdout; redirection is the caller's choice. AMXD, encrypted/opaque encodings and non-JSON formats are refused. No export/save-back safety is implied.

## What survives import

- Exact valid UTF-8 source text and its SHA-256, plus full parsed JSON including unknown root, box, edge and dependency fields. These are source preservation, not a round-trip editor.
- Object IDs, serialized `maxclass`, first-token class identity for `newobj`, documented aliases, uninterpreted original text, declared port counts/types, patching and presentation coordinates.
- Original edge array order as `source_index`, exact explicit `order` or null when absent, endpoints and all original patchline fields. No sorting or inference of missing execution order. Feedback is inventoried, never evaluated.
- Dependencies as declared, without resolving their existence. Embedded patchers are opaque preserved data with refusal diagnostics, not recursively imported graphs.
- Unsupported class families: Gen, Jitter, Live, JS/V8/Node/Java/web, multichannel wrappers, unknown externals/abstractions. No binaries or proprietary assets are used.

Every non-structural attribute is conservatively diagnosed as uninterpreted, including ordinary presentation/style/runtime metadata and inline `@attributes`. Preserving an attribute does not implement it. Object arguments and message syntax are deliberately not parsed or executed. Token identification is not a Max grammar. Catalog port descriptions are research notes, not inferred port counts: only declared counts are checked.

## Bounds and rejection

2 MiB input, nesting depth 32 checked before JSON parsing, 100,000 JSON values, 65,536 characters per string, 4,096 top-level boxes, 16,384 patchlines, 256 ports per object. Reject invalid UTF-8, duplicate keys, non-finite numbers, malformed wrappers/IDs/ports/rectangles/endpoints, undeclared endpoints and port indexes exceeding serialized counts. Dependency paths using traversal, absolute roots, drive/URI syntax or NUL are refused. Unsafe object-path tokens are refused; the `/` arithmetic class is distinguished from a path.

Bounds protect this offline inventory task, not a realtime callback or general hostile-file sandbox. The source is retained after successful JSON decoding even if structural checks fail; malformed or oversized byte streams are represented by hash and diagnostic only. Output includes source data and may be larger than input. Unknown attributes may contain arbitrary opaque strings, but no such string is ever dereferenced. A dependency cache is not proof of complete dependency closure.

## Catalog and evidence

`catalog.json` has 26 explicit classes, documented aliases, execution domains, message vocabulary, port notes, official Cycling '74 reference URLs, inspection date and unresolved reference gates. Arithmetic here means only `+`, `-`, `*`, `/`. All entries are `DOC_ONLY` with `max_compatibility_verified: false`. PD, CYCLONE, FAUST and ULTRA are **research candidates**, not implementations or equivalence mappings. Differently named DSP and message objects are never silently substituted.

Specific documentation pitfalls carried into the contract: trigger's right-to-left outlets, pack's hot/cold inlets, toggle's numeric pass-through, cycle~'s default cosine, gain~'s nonlinear control and smoothing, line~'s optional activity outlet and duration rules, and nondeterministic order among multiple named receive objects. The scheduler contract separates message depth-first dispatch, deferred work, timer state and DSP/vector timing. Documentation was inspected on 2026-10-20; the live documentation is not a pinned Max 9.1.5 specification.

## Incoming real reference corpus

Use `reference-manifest.schema.json` (JSON Schema 2020-12), one manifest per experiment/run setting. The included manifest and patch are **SYNTHETIC_NOT_MAX_EXECUTED**. The independently authored inventory golden is only an importer expectation; it is not a message trace. It includes feedback intentionally and must not be treated as an executable example.

For an actual capture in the separately owned `experiments/max-reference` directory:

1. Supply independently authored `.maxpat` sources, dependency names/hashes and permission/provenance. Do not bundle Max executables or proprietary example assets. Record exact Max/Live versions, OS/architecture and standalone/Live host.
2. Record sample rate, **both** signal and I/O vector sizes, Overdrive, Scheduler in Audio Interrupt, DSP on/off, transport and any relevant preferences. Use null plus `unknown_fields` where unavailable, never guess. State initial values/reset procedure.
3. Include an ordered operations file and exact output traces with hashes. Each message trace event should preserve sequence, operation ID, object/outlet, original selector, atom types and values, and timing units/clock domain. Integer and float atoms must remain distinguishable even when numerically equal; don't infer types from a console string. Record logger/instrumentation and its perturbation limits.
4. For DSP provide input/output WAVs or raw arrays with explicit encoding/channel/sample-rate/frame metadata, input onset alignment, initial oscillator/ramp state, and justified absolute/relative tolerance. Compare boundary offsets 0, 1 and vector-end. Silence or a screenshot is not DSP equivalence evidence.
5. Include hot/cold arithmetic/pack, trigger and patchcord order, typed message substitution, timers/retrigger/cancel, initialization, named sends, numeric UI controls, oscillator phase, ramp interruption and gain smoothing. Preserve unexpected results, Max errors and unsupported cases.
6. Set provenance `MAX_REFERENCE_CAPTURE` and `max_executed: true` only after running in the recorded reference environment. The schema requires a patch and operations artifact; message/DSP captures must also include their actual output artifact. SHA values authenticate bytes only, not the truth of provenance.

This probe does not yet load manifests, run references, compare traces or upgrade catalog statuses. The manifest schema is a handoff contract for subsequent work. Independent observed Max behavior and our synthetic structural fixtures must remain visibly separate.
