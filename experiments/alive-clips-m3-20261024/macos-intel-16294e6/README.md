# Intel macOS Package Confirmation At 16294e6

Both-app package run
<https://github.com/venetanji/alive/actions/runs/40072317053> completes
successfully on exact source `16294e67ed2b94614b78f6ab1501d7918e8c6b79`.
Linux, Windows/MSVC, Apple Silicon and Intel macOS package jobs all pass;
publishing is skipped. This source includes accepted Task 12 saved clips and
predates Task 13a stream-observability changes.

The completed Intel job is
<https://github.com/venetanji/alive/actions/runs/40072317053/job/120808224918>.
`job.json` records its actual result; `job.log` preserves the raw verbose output,
including terminal escapes, without rewriting. `sha256.json` pins both files.
The raw logs were retrieved with:

```sh
gh api repos/venetanji/alive/actions/jobs/120808224918
gh api repos/venetanji/alive/actions/jobs/120808224918/logs --allow-escape-sequences
```

The log observes Ultra's DMG created at 07:38:29 UTC and Alive's at 07:44:06 UTC.
Collection/upload succeeds. The resulting Intel artifact is
<https://github.com/venetanji/alive/actions/runs/40072317053/artifacts/12552981865>;
it has not been downloaded or interactively qualified here. Package compilation
and bundling do not establish physical or interactive audio on macOS.

The earlier `fdcdd1b` Intel DMG failure remains failed, with its underlying child
cause unknown. The reviewed `813ba76` change adds one Tauri verbosity argument;
it is a diagnostic, not an established functional fix. A later passing runner
does not explain the prior hidden error. The original logs/diagnosis remain in
the adjacent `macos-intel-fdcdd1b/` directory.

Observed log warnings include the vendored stb pointer comparison, guest
observation C linkage, duplicate native libraries, Node deprecations and
GitHub's Node 20 deprecation/Node 24 transition notices.
No toolchain, action, persistent setting or environment change was made in
response to that noise.
