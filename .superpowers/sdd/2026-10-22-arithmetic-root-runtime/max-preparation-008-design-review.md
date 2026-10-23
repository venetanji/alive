# Preparation008 Independent Design Review

Date: 2026-10-23 (Asia/Hong_Kong).

Findings: **none**. No concrete specification blocker or incompatibility with the proposed six-file scope was found. Specification verdict: **PASS**. Design-quality verdict: **PASS**. These verdicts concern the frozen design; implementation and later preparation/capture gates remain separate.

Reviewed design: `max-preparation-008-design.md`, SHA256 `79e6d3bd2db09eb87a6d62f02752989c1d571411a2d4afcb8de019866c11943a`, against `max-preparation-008-design-brief.md` and the current consumer interfaces. Review was bounded to design and interface compatibility; it did not repeat the007 evidence audit or run suites.

## Required Boundaries

| Concern | Review Result |
| --- | --- |
| Shared six-file schema | The exact plus-specific policy and witness schemas are shared across arithmetic, V8 runtime and independent stdlib lifecycle consumers, with corresponding tests in the three existing test files. Existing metadata field names are reused with distinct plus kinds and exact source/evidence tables. Strict keys, duplicate rejection, identity types, finite scalar shapes and multiplicity are required. No concrete dependency forces an additional production file. |
| Independent007 loader | The loader binds historical007 rather than current package bytes, checks all22 sealed inputs and16 consumed files, recomputes the historical ten-file subset, validates all six owners and reconstructs the exact source/legacy additions. It explicitly avoids current `verify_private()`/`package_binding()`, historical code execution, recursive `source_metadata` and runtime contract dependencies. Hash-rebound semantic corruption controls are required. |
| Pristine projection | The complete source projection pins all source views, saved edges and observer leaves, with explicit pristine-key selection. It preserves structurally different Basic/full views rather than demanding whole-object equality. Consistent corruption of both views fails the independently pinned projection. |
| Exact five-policy set | Three numeric policies with matching full-inventory copies and two root-only policies are required. Partial, extra, duplicate, malformed or transferred policies refuse before target capabilities. All four root source/class/geometry guards remain required; existing times and controller permissions are not transferred. |
| Honest diagnostics | Raw authored/actual classes and `strict_mismatch=true` remain unchanged. Local policy satisfaction is separate. Unnamed root raw candidate lists preserve both candidates with exactly one geometry match; unexpected classes are rejected rather than filtered away. Historical failed raw52 and successful protocol ACK52 remain distinct. |
| Request-local lifetime | A new closure captures selected object references and immutable request/owner/configuration/source/policy snapshots for each readback or close. Only that closure issues and consumes its reference once. No copied/serialized/prior-pass diagnostic or witness can become authority, and no global cache/registry is introduced. |
| Last-getter currentness | Binding checks occur after every capability call, including the last getter, before issuance/consumption and after later graph/retention reads. Original and normalized close requests are both captured. Identity/class/geometry/path checks use existing property/traversal APIs without a second gated capability pass; simultaneous-state claims are excluded. |
| Trusted operation binding | `extract_checkpoint` must conjoin raw/witness identity with the existing trusted `request_record` before retained-byte updates. The causing-operation chain originates outside raw data. Existing runner/comparator checks remain in force. |
| Fresh live state | Each gated format/value method is called once per member and its validated diagnostic result reused. Installs require pristine equality; events and closes permit evolved finite values while retaining exact format. Revision1 historical evidence never replaces revision2 live validation. The other four live getters and complete graph/endpoint/retention plus journal-silence gates remain required. |
| Independent close | Each close collects a fresh five-row witness with close request equality and owner2/3 binding. Readback witnesses cannot substitute. The outer close schema, independent observer/driver/disposal/history conjunction, full Basic retention and all six closes remain intact. No four extra nongated close getters are added. |

Relevant design anchors: source projection and set completeness at lines142,198; independent loader at line209; lifetime/currentness at lines280,297; exact witness schema at line318; trusted record at line359; independent close and retention at lines376,384; required controls at line393.

## Concrete Compatibility Checks

A single pure source-projection reconstruction from the pinned pristine plus bytes reproduced the design exactly: SHA256 `ba8d3d1ec23265bd75f16641fa95668466888d4033811fda95bcdef757da600f`,18,683 canonical bytes,16 Basic boxes,20 full entries,8 saved edges and19 leaves. No source strings, values, geometry or graph payloads were emitted.

The frozen controller's existing cohort validator compares its exact controller policy and explicit corresponding descriptor fields; independently validated V8 metadata can coexist without changing `controller.js`. The controller itself is not made responsible for admitting V8 representations. The proposed V8 preflight and coexistence tests cover this boundary.

The existing `extract_checkpoint(..., request_record=None)` interface already receives the runner's trusted request record, so requiring the plus conjunction can stay in `arithmetic.py`. The existing readback field and outer close proof already accommodate `v8_representation_witnesses`; plus dispatch can be added within the three authorized consumers. Close normalization currently creates a separate request object, which supports the design's explicit original-and-normalized snapshot requirement.

The parent verification file exists at `experiments/max-reference/arithmetic-roots-runtime-20261022/verification-capture007.json` and matches `097f03f2aed69c63b54d747d714cdd2af4e66e509b39fab7007f0ac1787dccfd`. The design's statement about author discovery is coverage context and introduces no runtime dependency or contradictory admission requirement.

## Implementation Review Limits

This is a design review, not evidence that future code implements the boundaries. Later review must require tests to exercise semantic loader failures beyond outer hashes, absence/mismatch of the trusted request record, copied/prior-pass witness refusal, mutations during the final getter and later retention reads, exact probe counts, and fresh independent closes for both revisions. The specified test groups and existing full regression gates cover these obligations without expanding the implementation scope.

The immutable007 audit, all26 private arithmetic inventories, current16 implementation files and full score remain unchanged. Native evidence retains its exact five originals. This report is the only write. No suites, native/target/display launches, preparation, capture, implementation, commit or delegation occurred. Full78/72+6/504/141/6-close denominators, native90 cable deliveries/297 typed receipts and qualification0/2103 remain unchanged.

