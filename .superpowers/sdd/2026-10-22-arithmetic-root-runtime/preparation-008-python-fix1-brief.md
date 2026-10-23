# Preparation008 Python Fix1

This brief becomes executable only when parent explicitly says JS008 is
frozen. Until then the Python pair remains frozen. After that instruction,
own only arithmetic.py/test_preparation.py and new
preparation-008-python-fix1-report.md in this SDD directory. All original
common/Python brief boundaries and the accepted design remain required.

Read independent preparation-008-python-review.md first (SHA256
13c3a4446feb607d5cbf4ee233707e053e5857bdc191098016541ed31fd95f54).
Address exactly its two P2 findings with failing tests before production edits.
Initial Python files are preserved in preparation-008-python-initial/; treat
that directory and every earlier report/diff/map as immutable.

1. Separate trusted caller/context validation from raw result admission.
   Invalid/missing trusted context must refuse before record updates or a
   retained write. A valid trusted request must retain/account raw bytes when
   its result is the existing five-key failure envelope or a success-shaped
   payload that later fails checkpoint validation. Preserve the original
   failure, exact bytes, raw hash/size binding and session accounting while
   propagating refusal. Keep full successful raw/witness/trusted-operation
   conjunction; do not add an op field or weaken identity checks. Add controls
   for both failure cases and all existing invalid-context cases.
2. Validate exact nested saved-edge/endpoint/observer-leaf schemas and strict
   Python integer identity/count types before projection normalization/hash.
   Cover leaf ports, edge indices and both endpoint ports with float, boolean,
   malformed/extra/missing field and bounds controls where applicable. Require
   early metadata refusal and full-checkpoint refusal. Retain finite numeric
   equivalence for geometry/scalar values; do not extend it to identities.

Use in-memory or synthetic fixtures; keep all private evidence read-only and
use python3 -B. No other files, launch, preparation/archive, commit or subagent.
Run focused RED/GREEN controls and the required complete Python regression
after the fixes. Report exact commands/counts, changed hashes, any concerns and
which checks were not run. Parent will freeze the fix diff/map and request a
scoped independent rereview before accepting this task.
