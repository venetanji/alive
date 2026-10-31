# Intel macOS Package Failure

At exact source `fdcdd1b353f7560fdd3d448377168ec51a9cc2bf`, package run
`40069422711` failed job `120799742059` on Intel macOS. Linux, Windows/MSVC
and Apple Silicon jobs passed; publishing was skipped. The complete matrix
is a failure, not a package qualification pass.

The raw log shows successful native/Rust compilation and Alive's generated-
context test. Tauri builds and ad-hoc signs the Ultra app, then its
`bundle_dmg.sh` returns nonzero. The emitted wrapper message does not name the
underlying failed command or its stderr. Root cause remains unestablished;
neither a transient runner failure nor an application/compiler defect is
claimed from that generic error.

`package-job.log` is the byte-preserved completed-job API log;
`failed-step.log` is the completed run's failed-step output. `job.json` records
the actual failed step. `manifest.json` hashes those artifacts. Read-only
diagnosis is separate; a later pass will not erase this observation.
