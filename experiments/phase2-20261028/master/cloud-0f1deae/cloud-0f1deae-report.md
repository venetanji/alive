# Cloud evidence: 0f1deae

Read-only cloud follow-up for exact head `0f1deaecc34e8a54bc9b1ec136876831ebb132e5`. Evidence directory `experiments/phase2-20261028/master/cloud-0f1deae/`. Both workflow receipts are terminal.

Windows package job `123171010686` in run `40789537264` completed success. In its actual job log the primary stdin launcher emits `vcvars-exit=0`, `rustc-exit=0`, `cmd-exit=0` and `probe-exists=True`. The six direct resolver cases `real`, `full`, `old`, `partial`, `forwarded`, and `bad_limits` all pass. Each source and staged DLL hash matches; real staged DLL SHA-256 `dba476a5360050179cba643f333c0995a81996ace3ee78201b4111be28b925a4`. The log shows real and full version 1, 24-byte limits, features 7, ramp 64, maximum gain 4; old missing symbol, forwarded set owned by separate forward target, bad limits maximum gain 3, with expected probes passing. This is direct fixture evidence, not full-host negative-path proof. Successful launcher does not exercise timeout, tree termination, cleanup failure, or missing-output paths.

Separately, the Windows package job's Rust unit run reports 284 passed, 0 failed, 4 ignored; `production_capability_fresh_process_diagnostics` and `resolves_the_loaded_native_image` both report ok. This is test-process evidence and does not establish every cached-path negative fixture or an interactive full-host journey. Physical audio is not measured.

GitHub artifact `12861822897` (`windows-master-resolver-report`) SHA-256 `8178c092f928e5be0270b8f3af842b7ec8073e61165146b85989018f25629f62` matches downloaded `attempt-1-windows-report.zip`; extracted `attempt-1-windows-report.txt` SHA-256 `65b61955d8842d21c9332573462d4846990cb0caa4ce86775830cd6d8384a763`. Completed Windows job log `attempt-1-windows-job.log` SHA-256 `fe78e60334a28da66376baa3d6f7a3fbe1c044bb7e0989414be5e1b89d555eb3`; unlike the PowerShell transcript, this includes child stage output and direct probe observations. No large packages were downloaded; `attempt-1-package-artifacts.json` retains metadata and hashes for them.

Default CI `40789537429` completed success on exact head: UI/protocol/reference `123171011092`, Chromium `123171011301`, Linux native/Rust/software CPAL `123171011371` all successful. Terminal receipt `attempt-1-run-40789537429.json` SHA-256 `98fec5f8398ade86a202917c3072f6870261f9b2db0b15d11f5014d5630f4682`. This was the ordinary zero-endurance CI; software loopback does not establish physical audio or a sustained endurance result. Prior cloud pilot retains its own `0f3776c` attribution and failed planning admission; this run does not replace that evidence.

Packages `40789537264` completed failure on exact head. Windows `123171010686`, arm64 macOS `123171010815`, and Linux `123171010854` succeeded; x64 macOS `123171010992` failed and publication `skipped`. Its committed version/release ancestry validation, unsigned/ad-hoc package build, and target artifact/checksum collection all succeeded; Ultra and Alive app/DMG bundles were produced and notarization skipped. Upload found four files but failed with exact message: `Failed to CreateArtifact: Failed to make request after 5 attempts: Request timeout: /twirp/github.actions.results.api.v1.ArtifactService/CreateArtifact`. No x64 macOS artifact appears in the terminal artifact listing; Windows, Linux, arm64 macOS and Windows resolver report are present and unexpired. The available logs identify a request timeout, not a quota or permissions denial; no deeper cause is established. The x64 macOS packages and generated checksums cannot be independently verified because their artifact was not delivered. No retry or dispatch occurred.

Terminal package receipt SHA-256 `686c671421a5027114c6ad475656999d40b747c139a076383cb77e2a5dba547a`; full x64 Mac job log `8ee00ec69666ed8a7983b7a221ba71586507c1b248ba3b950a7b7658ba1a2307`; failed-step log `81de7ab1b6b20348cf70a2020c578b3cb0ccadb55f04ee7d449043a45a32ca99`; terminal artifact metadata `7c981ee25897f3b415066271f7c0c444c3bade51d9bae30081002a522c5d544a`. Full compressed CI log SHA-256 `68ab7835365857884d94e97c5d648a69d1ee86c1475cd1973f74337c882cfd74`. All package binaries omitted locally; artifact IDs, hashes, sizes and expiration are in metadata.

Attempt-one manifest `attempt-1-manifest.json` SHA-256 `e72670091c9a74805bae8d0d0f934e139c5517e48933ee1df9e195daf448e02d`. All stored entries (bytes, SHA-256):

- `attempt-1-ci-run.log.gz`: 233300 bytes, `68ab7835365857884d94e97c5d648a69d1ee86c1475cd1973f74337c882cfd74`; decoded 2792222 bytes, `c5d9571168e4b0535366cc022caf4914cd8e4d78fcdc32388f855a934842fb3b`
- `attempt-1-macos-x64-job.log`: 215913 bytes, `8ee00ec69666ed8a7983b7a221ba71586507c1b248ba3b950a7b7658ba1a2307`
- `attempt-1-package-artifacts.json`: 2867 bytes, `7c981ee25897f3b415066271f7c0c444c3bade51d9bae30081002a522c5d544a`
- `attempt-1-packages-failed.log`: 5571 bytes, `81de7ab1b6b20348cf70a2020c578b3cb0ccadb55f04ee7d449043a45a32ca99`
- `attempt-1-run-40789537264.json`: 15005 bytes, `686c671421a5027114c6ad475656999d40b747c139a076383cb77e2a5dba547a`
- `attempt-1-run-40789537429.json`: 10710 bytes, `98fec5f8398ade86a202917c3072f6870261f9b2db0b15d11f5014d5630f4682`
- `attempt-1-windows-job.log`: 231496 bytes, `fe78e60334a28da66376baa3d6f7a3fbe1c044bb7e0989414be5e1b89d555eb3`
- `attempt-1-windows-report.txt`: 6713 bytes, `65b61955d8842d21c9332573462d4846990cb0caa4ce86775830cd6d8384a763`
- `attempt-1-windows-report.zip`: 1870 bytes, `8178c092f928e5be0270b8f3af842b7ec8073e61165146b85989018f25629f62`; decoded `report.txt` 6713 bytes, `65b61955d8842d21c9332573462d4846990cb0caa4ce86775830cd6d8384a763`

Omitted package artifacts (service IDs, sizes, digests):

- `desktop-x86_64-pc-windows-msvc`: 12861673327, 7859679 bytes, `sha256:7b643d6b5c79eb3bf95b4541f5121ffdbefedd5248e881f5e1e3490e69e8650e`
- `desktop-aarch64-apple-darwin`: 12861462973, 11704007 bytes, `sha256:9895a520da4790b8105bd81361750516541cec3f3282c27ea96ab3250c1c41df`
- `desktop-x86_64-unknown-linux-gnu`: 12861462281, 187984235 bytes, `sha256:d4012a9b66febd0c9a71ec6093f24f85a70e58670d6a8ec88a04b5c467bc6a0b`
