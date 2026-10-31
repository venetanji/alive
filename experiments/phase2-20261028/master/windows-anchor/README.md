# Windows Master evidence

The original producer reports, patches, review diffs, independent reviews, integration receipts, diagnostic briefs and actual 58057f9 runner evidence are copied byte-for-byte from `.superpowers/sdd/2026-10-28-phase2-live-max/`. See `manifest.json` for original paths and hashes and `source-identity.json` for independently read Git commit, parent, blob and content identities. All 13 changed producer files equal their integrated and HEAD bytes. The root and producer lines have different parents; the recorded ancestor checks describe each line, not a claim that the producer commits are ancestors of the root integration commits.

The 58057f9 instrumented Windows run compiled and failed with 275 passed, 9 failed and 4 ignored. Its empty-cache initializer address mapped to the test executable and lacked the anchor export; subsequent helper and direct addresses mapped to the DLL and passed the ownership and limits checks. This trace does not prove instruction bytes or the cause of the earlier uninstrumented failure.

Both fixes have source approval only; neither has been built or run on Windows. The six direct-resolver cases do not establish full-host or cached-path negative behavior. Windows cache positive, fixtures, release and package qualification remain pending. No runtime, build, test or network activity was performed in this curation.
