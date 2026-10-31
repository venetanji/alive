# Windows cache-initializer diagnostic source specification review

Frozen candidate d79f2281d3c57877127ee06efe58826fe7e0afb1 on
da7c6fb30c14a42502461a2ef2f4297b075b34ec; two Rust files only. Read the
immutable windows-cache-initializer-review.diff, implementer brief/report and
windows-runner-evidence-report.md beside this file. Use git show at immutable
refs for necessary context, not moving worktree source.

Judge whether this minimal diagnostic records the ACTUAL OnceLock initializer
anchor/order, actual single resolver attempt/failure stage and cached result
before separate helper/direct diagnostic calls. Prior real Windows child has
both explicit measured anchors resolving true but cache false, so a guessed
link attribute/thunk fix is forbidden. All production owner/exact-anchor/limits
checks and non-test behavior must remain unchanged. Instrumentation must be
Windows+test only and logs additionally sentinel-only, with no production/
callback logging. Early error paths must retain useful stage facts. Source
approval cannot establish Windows compilation, cause or fix; evaluate reported
static body equivalence and codegen/timing perturbation limitations honestly.

Use SDD task-reviewer specification methodology; findings ordered by severity
with immutable file/line and smallest correction. No tests/build/native/GUI/
browser/Wine/audio/cloud workloads, source/index/ref changes or children; Q1
owns all local runtime resources. Read-only source and canonical report write
only. Write windows-cache-initializer-spec-review.md. Return concise verdict,
findings and material remaining qualification. Independent quality follows.
