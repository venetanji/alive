# Stopped Cue Receipt Regression

Independent Task 11 review used an immutable temporary copy of native library
SHA256 `8d1768cedb1f5b2208f8708deb8fccb663c727dcc4ecbdf183a257cbe9755f00`,
matching the build retained in `../task11-native/manifest.json`.

With musical transport stopped, launch track 0 slot 1 and then slot 0 before
rendering a callback. Both calls queue successfully. The active clip correctly
ends at slot 0, but both terminal receipts report APPLIED (3), instead of
SUPERSEDED (5) then APPLIED (3). `stopped-action-receipts.json` retains the
reviewer's direct observation. The JSON's temporary library path is provenance,
not a portable dependency. No GUI or physical audio was involved.

This checkpoint is a failing regression observation, not acceptance of Task 11.
The following focused native correction/review must name its own source and
test results. Existing native timing distributions retain their original scope.
