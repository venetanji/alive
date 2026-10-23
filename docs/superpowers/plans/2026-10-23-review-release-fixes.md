# Review Fixes and Release Readiness Implementation Plan

Reproduce each Astra finding against PR #2 before changing production behavior. Preserve main history, safety admission, private evidence identity and hardware-evidence limits.

1. Native Stop: add queued Gain/Stop overload and ordering regressions in document audio tests; coalesce physical cleanup per epoch without losing saved edits or document isolation.
2. macOS lifecycle: test owner close/flush/save/discard/cancel and pending-operation policies; route Quit through them and install application-wide menus with focused owner routing.
3. Frontend queue: add held-IPC event/deletion and history/edit regressions; use admitted state at event dispatch and a history authoring barrier.
4. Notices: compare locked metadata to inventory, reproduce missing entries, regenerate actual package license/provenance metadata and fail packaging on omissions.
5. Cable drawing: reproduce repeated stopped status poll path writes; invalidate only when rendering inputs change, retaining geometry/interaction behavior.
6. Set Cargo/Tauri/lock version to 0.1.0-rc.1; run full public contracts, Rust/native and packaging helper checks. Push existing branch without rewriting user history. Obtain all four package targets and three Ultra CI passes on the exact final head.
7. After exact-head checks and release absence verification, merge through normal GitHub protections, verify resulting main tree, tag v0.1.0-rc.1 and verify signed/notarized Mac jobs plus all release assets. Stop on approval/signing/access failures without changing secrets or gates.

