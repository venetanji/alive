# Read-Only Intel macOS Packaging Failure Diagnosis

Investigate actual failed package job 120799742059, run 40069422711, exact
source fdcdd1b353f7560fdd3d448377168ec51a9cc2bf. Evidence is retained under
`experiments/alive-clips-m3-20261024/macos-intel-fdcdd1b/`: raw completed-job
log, failed-step log, metadata and hashes. The exact package matrix receipt is
`experiments/alive-clips-m3-20261024/packages-fdcdd1b.json`.

Observed: Rust/native builds and Alive's one generated-context test pass. The
Ultra app is assembled/ad-hoc signed, then Tauri's bundle_dmg.sh exits nonzero
with a generic wrapper error. Linux, Windows/MSVC and Apple Silicon package
jobs pass. Publishing is skipped. Do not infer a runner transient or an app/
native compiler defect from this generic message.

Read-only diagnosis only: use systematic-debugging. Inspect the frozen release
wrapper/workflow and available pinned bundler source/docs as needed, compare
the working platform/previous package behavior, and identify the earliest
established failing boundary. Determine whether these logs expose the root
cause. If not, recommend the smallest concrete diagnostic change/command that
will capture it on the next authorized CI run. Explain any process-local
verbosity/debug option with verified syntax. Do not rerun CI yourself, mutate
source/index/branches, build/run GUI, change settings/credentials, dispatch
subagents or propose guessed retries/toolchain changes as a fix.

The Task12 implementer remains sole source owner; frozen independent Task12
review runs concurrently. Report to `task-12-macos-diagnosis.md`: observed
failure, evidence and source anchors, established cause versus unknowns,
minimal next diagnostic step, and whether a source fix is justified now.
Return a concise status and report path. Parent owns orchestration/CI/evidence.
