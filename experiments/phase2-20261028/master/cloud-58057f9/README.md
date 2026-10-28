# Cloud checkpoint 58057f9

These terminal receipts apply exactly to
`58057f980afd3365e106433c7102cfc19450c130`, with application build source
`f69125cd289365424cd0661975291d8c12a96cac`.

CI `40769366285` passes all three jobs: UI/protocol/reference, Chromium, and
Linux native/Rust/CPAL software-loopback. Package run `40769366396` is terminal:
Linux, Apple ARM and Intel Mac pass; Windows fails; publication is skipped.
These results do not qualify the later harness or Windows linkage correction.

`ci-original.log.gz` retains the lossless output of `gh run view --log`; that
command adds job and step presentation fields, so it is not the raw provider
log representation. Its decoded and stored hashes are in `manifest.json`.
The actual original Windows job log and initializer diagnostic report are
retained in the adjacent `windows-anchor/` bundle. The diagnostic records the
instrumented initializer's executable-owned address before later DLL-owned
helper/direct anchors; it does not establish the original instruction bytes
or the cause of an earlier uninstrumented failure.

The next source checkpoint contains reviewed Windows-only explicit DLL anchor
linkage and six direct-resolver fixtures. Those changes still require actual
Windows compilation and execution. No owner/export/limit validation is relaxed,
and direct resolver negatives do not establish full-host or cached-path
negative coverage. No release or persistent environment setting changed.
