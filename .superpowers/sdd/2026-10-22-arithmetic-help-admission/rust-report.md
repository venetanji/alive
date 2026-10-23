# Rust Arithmetic Help Admission

Frozen 2026-10-22. Owned edits only: `help_reference.rs`,
`canvas_hierarchy.rs`, and focused additions to `canvas_tests.rs`. Existing
dirty changes were preserved. No commit, application launch, Max launch,
native source change, or CSS change.

## Behavior

- Exact times/plus/minus source SHA-256 identities select
  `max-help-arithmetic-three-v1`, after all four pinned helper files pass.
  Append/prepend/int/float retain `max-help-four-v1`.
- The public Probe and Reference JSON shapes are unchanged. Public arithmetic
  request/result IDs remain `times`, `plus`, and `minus`.
- Three fixed tuples bind those safe IDs to their exact XML routes, symbolic
  `c74object` identities (`*`, `+`, `-`) and source-byte SHA-256 values from
  the coordinator addendum. Missing, changed, wrong-identity, escaped,
  nonregular, or oversized XML refuses; symbolic public requests refuse.
- Related symbols map to safe IDs only through those three finite tuples.
  Arithmetic related availability also requires the pinned XML to validate.
  Unknown names stay unavailable. The existing 13-page catalog is retained.
- Shared hierarchy admission accepts only the exact two policy/object sets;
  helper roles, placement, named tabs, empty question scope, root topology
  and absence of helper ports retain their existing checks.
- Admitted owner authorization, contained regular-file reads, source/XML/
  parser/field/response bounds and plain-text extraction remain enforced.

## Test Evidence

TDD RED was observed before implementation: wrong arithmetic probe adapter,
refused arithmetic shell preparation/owner history, missing pinned XML
admission, unmapped symbolic related IDs, then the symbolic XML identity
mismatch in successful synthetic tuple loading. All fixtures and helper
bodies used by ordinary tests are original synthetic data. Synthetic pins
are created only inside private Rust unit tests; no production caller can
override the fixed tuples or probe identity tables.

Environment used for the following locked release tests:

```sh
ULTRA_NATIVE_LIB_DIR=/home/venetanji/Work/alive/apps/ultra/build
LD_LIBRARY_PATH=/home/venetanji/Work/alive/apps/ultra/build
```

```sh
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked help_ -- --nocapture
```

Result: 14 passed, 0 failed, 1 explicitly ignored local-installation test.
Includes `shared_help_shell_schema_and_lowering_cases` against the parent's
110-case shared corpus; all legacy cases and arithmetic valid/refusal cases
pass. New coverage includes every helper's changed/missing refusal, distinct
probe selection, fixed XML routes/digests/symbolic identities, public symbol
and path-alias refusals, missing/changed related pages, exact policy pairs,
helper topology/ports, admitted shared owners, undo/redo, refused crossed
policy commits and disk roundtrips.

```sh
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked local_identity_and_catalog_are_available -- --ignored --nocapture
```

Result: 1 passed, 0 failed. Metadata/status output only: 7 exact source roots,
4 exact helper files, 13 existing bounded local references, and 3 pinned
arithmetic references verified. Before implementation, a separate bounded
private read also matched the plan's three source byte counts/digests, all
four helper digests and all three XML byte counts/digests/symbolic identities.
No licensed bodies, authored creation strings, graphs or reference prose were
written to repository fixtures or printed.

`git diff --check` on the three owned paths passes. Parent owns the full Rust
suite/release build, frontend integration and full-source production intake.
This work makes no new runtime, physical UI, visual parity or whole-help
qualification claim.

## Source Freeze

| File | SHA-256 Before | SHA-256 Frozen |
| --- | --- | --- |
| `apps/ultra/src-tauri/src/help_reference.rs` | `01aa5b04a6a0eece70f79f257f8ee9b8b26473208a1cfd3d75274d1c8aadb802` | `8df11627c19471a9f3f535ecd7db09865da6299a274db49c50a83ac6553215b1` |
| `apps/ultra/src-tauri/src/canvas_hierarchy.rs` | `3899cb878396005b5947dc4494e6a2c18802c045fcbaca02444318325f23dcc5` | `19d6ef24e3cdb88c77574f90acb5ce045091c038d70ad7b0baecfddc4f01457b` |
| `apps/ultra/src-tauri/src/canvas_tests.rs` | `b52142566a31e4654df9ae7912d4fa79dec2d656a5946da4010498dad1e19c1a` | `496392b28d6cab5edc03e9ad98347e5ee6bac7aef2b29cbf794f8195b5675814` |

Shared corpus verified at SHA-256
`cd3d30cd44e2723a0d8171dc59ac5a1fbebdc001967a6670f537b7c13a47f9b8`.
