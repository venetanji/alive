# Bounded Mac Package Failure Diagnostics

Reviewed integration `c301d0d` adds an unsigned-macOS-build-failure-only helper
and separate seven-day diagnostic artifact. It preserves the failing build,
all package formats/targets, signed-release actions and publication guards.
It neither fixes the unproven busy-eject cause nor authorizes a cloud retry.

The helper bounds its commands, output and matched mounts. It reports only
images inside this checkout's known target bundle directories and matching
open paths; unrelated mounts, raw global plist, stderr contents and process
environments/argv are withheld. Missing, timed-out, truncated and late results
are inconclusive. Original attempts and review findings are retained.

Independent spec and quality reviews accept fix round 1. Root reruns eight
diagnostic, eighteen release and four notices fixtures on Linux; all pass.
The workflow runs the diagnostic fixtures in macOS validation jobs, excluding
their POSIX-specific test children from Windows. A weakened `true ||` gate
fails the regression. This proves fixture and source behavior, not actual
hosted-macOS commands or holder visibility. The initial red run includes
missing-symbol errors; the behavioral gate and malformed-XML failures are
retained separately. The implementer's earlier incidental Linux lsof syntax
probe is disclosed and supplies no Mac evidence.

Context7 on 2026-10-29 resolved `/tauri-apps/tauri-docs` and `/lsof-org/lsof`.
Tauri's DMG documentation confirms CLI DMG bundling, with no documented
busy-eject remedy established by that query. lsof's manpage says a mounted-on
directory selects open files on its filesystem; `-F0pcfn` selects process,
command, descriptor and name with NUL field terminators and newline set
terminators. The helper uses that documented format. These documentation
facts do not prove the pinned Mac runner's permissions or observed output.

- https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/distribute/dmg.mdx
- https://github.com/lsof-org/lsof/blob/master/docs/manpage.md
- https://github.com/lsof-org/lsof/blob/master/docs/faq.md

`manifest.json` maps retained files and decoded gzip bytes to their original
hashes. Raw logs/diffs are compressed losslessly. Package attempt 2's full raw
job log and terminal status live separately in
`../../master/cloud-0f1deae/attempt-2-terminal/`; attempt 1 remains unchanged.
