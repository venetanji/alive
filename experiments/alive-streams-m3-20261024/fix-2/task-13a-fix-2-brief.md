# Task 13a Fix Round 2 Of 5

Read this first, then `task-13a-fix-1-review.md`. Base is
`ccba93b2e0a76915a9b060d604cc8c62a8f72c29`. R2, R3 and R4 are addressed with
no new fix breakage. The sole open Important finding remains T13A-R1:

> Ultra native installation and root close bypass retirement_pending.

The remaining production route is `canvas_param` in `lib.rs`, whose direct
`commands::admit` closure bypasses the new serialized AudioIo/admit_owned gate.
Initialized numeric edits can change native parameters and authoring/history
while retirement is unresolved. With runtime revision zero, forced admission
can install a native graph. The prior tests exercised the shared helper, not
this remaining production route.

Route this command through the same Driver gate, before native or authoring/
history changes. Preserve normal running live parameter edits and revision/
validation behavior. Add focused failing regressions for the actual command's
numeric and revision-zero/initial-install route, with independent data/error
owner retention, unchanged history/root state on refusal and success after
witnessed retirement. Use a focused production helper if needed to test the
route; do not add a general IPC framework or a test-only alternate path.
Audit direct production admission callers for this same concrete bypass and
document the finite result. Authorized Quit and scoped Stop remain available.

Retain red/green commands/output, update the report's fix section and commit
only the narrow source/test changes. Original requirements, storage/CPAL
boundary rulings and deferred warning/tooltip observations remain. No new
capacity/scenes/schema/features, native changes, source research or full soak.
Parent will perform scoped re-review of `ccba93b..HEAD` for this open finding.

Runtime: retain the now-passing ccba93b Ultra and Alive journeys under their
actual identities. Rebuild after correction and exercise the affected real
Ultra numeric/authoring path. Assess whether Alive bytes/behavior changed
before repeating its complete unchanged journey; no blind full-suite/native
reruns are required. Finish the explicit-state, fresh-diagnostics overhead
control comparison on the final intended build, with shared ProcessGroups
budget, source/fixture/script/artifact hashes and complete final epochs.
Never relabel prior source measurements. Preserve incomplete/failed controls.

Notify coherent checkpoint/source freeze; parent owns PLAN/ledger/PR/retained
experiments. No subagents, release branches, merge/tag/publish/deploy,
persistent setting/credential changes or cloud sessions. Parent does not
stage/commit while you use the index.
