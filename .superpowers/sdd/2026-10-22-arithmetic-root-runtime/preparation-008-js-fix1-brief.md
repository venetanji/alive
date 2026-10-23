# Preparation008 JavaScript Fix1

This brief becomes executable only when parent explicitly says Python fix1
is frozen and supplies the final JS review hash. Until then keep the JS pair
frozen. Read preparation-008-js-review.md and the accepted design/common/JS
briefs. Own only v8-readback.js/test_helpers.cjs and a new
preparation-008-js-fix1-report.md. Initial JS code is preserved under
preparation-008-js-initial/, binding SHA256
27584596834c217ff10d00d25294ca37b1ef86dd5441e6fd13b30721b36b8bd1.
All earlier records and every private evidence directory remain immutable.

Address the confirmed currentness P2 test-first. The current dataCurrent()
compares captured data before plusV8RequestBinding(), whose final root.filepath
host read can mutate that data after comparison. Baseline live readback and
fresh close succeed; mutation on their final filepath read still permits a
proof with a changed original command ID. Independent review observed six
gated calls and four/zero nongated calls, so additional probes cannot repair
the ordering gap.

Add meaningful RED controls using successful baselines and an adaptive final
host-read mutation for both live and close paths. Verify original request,
including original close context, cannot change during that last binding read
and escape final comparison. Preserve diagnostic prefixes and the existing
failure envelope. Do not bake the reviewer's incidental host-read counts into
the implementation or tests as a timing assumption.

Order host/binding reads and immutable captured-data comparison so the final
host read cannot mutate captured inputs after their last check, through proof
return. Apply the shared guard consistently to issue/consume and final return.
Keep private closure authority, exact source/policies and all previous
last-getter/later-retention controls. Add no gated capability pass, witness
cache, alias, schema change, timeout/capacity change or unrelated refactor.
These remain ordered observations; make no simultaneous-state claim.

Use synthetic/in-memory fixtures and read-only metadata with python3 -B.
No other edits, launch, preparation/archive, commit or subagent. Run focused
RED/GREEN, complete Node suite and applicable syntax checks after the fix.
Report exact commands/counts, changed hashes, concerns and unrun checks.
Parent will freeze the fix diff/map and request a scoped independent rereview.
