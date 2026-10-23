# Capture003 Float Class And Mode Assessment

The smallest supported class disposition is an exact source-bound profile for
the four float-root flonums, requiring actual runtime class `number` and actual
primitive numeric `format` equal to 6. Capture003 establishes the class
discrepancy at unchanged rectangles, but contains no live mode observation.
A general flonum-to-number alias is not supported by this assessment.

This assessment is complete and precedes the float implementation freeze. It
does not give that implementation a SPEC or QUALITY verdict. The reviewer
inspected retained artifacts, selected installed source metadata and local XML;
no code, tests, preparation, runtime, screenshots or clipboard actions were
performed. Only this assessment report was written. Private configuration and
authored help text were not printed.

## Capture And Source Facts

The retained preparation003 configuration matched its public preparation hash
before selected metadata was inspected. The installed float source matches
SHA-256
`c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c`.
All four numeric anchors below have source maxclass `flonum`, saved format 6,
one inlet, two outlets, and no authored decimal-place override:

| Float Basic Anchor | Saved Rectangle | Capture003 Exact-Rectangle Candidate |
| --- | --- | --- |
| `root/obj-2/obj-16` | `[194,230.5,54,23]` | `number` |
| `root/obj-2/obj-17` | `[265,230.5,54,23]` | `number` |
| `root/obj-2/obj-21` | `[220,330.5,54,23]` | `number` |
| `root/obj-2/obj-33` | `[117,380.5,54,23]` | `number` |

Each class diagnostic has full geometry match count 1 and one exact-rectangle
candidate. The failed ACK hash and size match its retained command request:
SHA-256 `7a278f9caf2b32ee2c4775ee32803bcf7d16d1a4c9a9a9b92780f26050826cb9`,
9874 bytes. That ACK records class and geometry only; it does not record format.

REA artifact:
`experiments/max-reference/int-float-runtime-20261022/rea-int-float-003.json`,
SHA-256 `c8ea53d36dbbe2ca07b27aaee3b48c292f69c36dc6cf27b6f569ed9569e038c8`,
Evidence ID
`ev_276a95d8e4b9209ee97a8336fc3c8132e433cce2d2407e3baada856a380c0078`.
The session completed two int operations and two int checkpoints before float
installation refused. It establishes no completed float operation/checkpoint.

The six reported float geometry discrepancies are a separate finite policy
question. A class/mode disposition does not relax any rectangle component.

## Local Reference And Prior Runtime Evidence

The installed reference is
`/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources/docs/refpages/max-ref/number.maxref.xml`,
SHA-256 `ba955a3f6984509b3fe718c4653fd0f00921effc23bcdb56fb58b62e892d07f5`.
At line 260 it declares `format` readable, scalar and integer. Enum index 6
at line 321 is floating-point decimal display/output; integer, list and text
formats have separate enum entries. `numdecimalplaces`, at line 452, controls
display precision and is not a substitute for the output-mode gate.

The existing bounded interpretation is
`.impeccable/review/max-fidelity-20261021/float-cable-oracle.md:17`,
SHA-256 `b9be46f72cb04837236f3d9abe749dcbf1ddefc735ce5fbd8ca36c1489b00610`.
It records authored flonum/format 6, runtime class number/format 6, default
decimal-place metadata, exact getters and typed float outlets for the finite
Max/Wine scope.

The reviewer independently checked selected prior snapshots and receipts for
all eight scalar probes: 0, 2, 2.5, -2.5, 0.123456789, 1e-6, -1e-7 and 1e-8.
Every selected object reports runtime class number, numeric format 6,
numdecimalplaces 0 and the exact singleton getter value. Every corresponding
receipt has selector float and the matching value, including the first
int-selector zero input. These are retained observations, not a new execution.

The following bytes match the prior experiment's manifest bindings:

| Prior Artifact Under `experiments/max-reference/float-cable-runtime-20261022/` | SHA-256 |
| --- | --- |
| `results/receipts.json` | `94d2e72b5551cddefda313b04beb1384f069d20bb8a2f13b27e2dbcd26039516` |
| `results/receipts.jsonl` | `e1a61c1a6ca2bb7b03dea500298c2839ce44e6c20175443e2d59fe71fcda8e5b` |
| `fixtures/probe.js` | `8ab2e60c7e1a04980fba3428df6f6ff5f04ada7ecc4e1972269de41f07c7d4fa` |
| `fixtures/float-cable.maxpat` | `32e6ba1acd13530302d0c64d2ceae0f29fbd421c51a34fc5bd85f5c8510382a3` |

The prior probe uses `object.getattr("format")` and `getvalueof`. A JavaScript
number value, fractional or whole, cannot by itself establish an outlet selector
tag. Typed receipts and documented mode semantics supply different evidence.

## Required Implementation Gates

1. Derive the profile only from the exact float source, four listed anchors,
   source flonum/format 6 metadata and saved rectangles. Preserve source class
   separately from observed runtime class. Do not add a global runtime alias.
2. During both controller hierarchy and Basic admission, require the allowed
   actual class and `object.getattr("format")` to be the primitive numeric value
   6. Missing, throwing, null, boolean, string, array, nonfinite or other mode
   values refuse before mutation. Preserve duplicate-sensitive geometry lookup,
   complete hierarchy checks and aggregate numeric diagnostics.
3. V8 must independently observe and retain actual runtime class and mode at
   each checkpoint. Python must validate those raw observations against the
   finite source profile before any temporary class adaptation for the shared
   topology validator. Retain original observations unchanged.
4. Preserve source semantic role `flonum` in existing public state contracts
   deliberately, while keeping actual number/format 6 evidence in raw retained
   data. Recheck mode at every checkpoint so later drift cannot pass on the
   strength of installation alone. Keep existing typed getter/receipt checks.
5. Cover wrong or missing modes, coercions, other number formats, wrong source,
   anchor or runtime class, all rectangle components and later mode drift.
   The geometry profiles require their own exact finite validation and retained
   discrepancy evidence.

## Review Handoff

The parent subsequently recorded an explicit ruling for six exact float
geometry profiles and the four-anchor actual-format-6 gate in the spec and
brief. The reviewer will assess its implementation only after receiving the
frozen focused diff and aggregate hashes. In-progress implementation sources
have not been reviewed as part of this assessment.

Float runtime completion, geometry equality, rendering, physical, shared-view,
serialization, saved-order, authoring and whole-help qualification remain open.
