# Updated-head packaging validation

Head: `de663840346a12d0fe5b49eb669af1cc1788f25f`.
CI run: https://github.com/venetanji/alive/actions/runs/39988671475 (attempt 1).
CI merge checkout: `61a9fecf578e73d7b06983ba96214c115bb21fb1`.
Merge/head tree, verified equal: `cc661bfd4c1cd1dccde0d002e27270143b9547c0`.

No current inventory/notice defect found. The original head's Windows metadata decoding blocker is fixed by explicit UTF-8 decoding and is superseded by the successful native Windows packaging job. All 11 packaging tests pass, including independent red/green verification of the CP1252 regression. The new validator also passes real unfiltered locked Cargo metadata validation.

The complete inventory remains 568 third-party entries, compared with 517 before the original fix. All 51 omissions are repaired, and metadata/license/source/checksum verification remains valid because the updated head did not change the inventory, lockfile, Cargo manifest, or THIRD-PARTY.txt.

## Actual Packaged Files

| Package | SHA-256 | Notice Inspection |
| --- | --- | --- |
| Ultra-0.1.0-rc.1-aarch64-apple-darwin.dmg | `de98f6d220720ddf4aac071c759c290abc2a8462a40e088a908df13011e8c1b1` | Pass |
| Ultra-0.1.0-rc.1-x86_64-unknown-linux-gnu.deb | `4cd5729dcf8e452422183891bf821290bb6e15dd1bc24d28ce48fcf8738574a6` | Pass |
| Ultra-0.1.0-rc.1-x86_64-unknown-linux-gnu.AppImage | `81ce4d70511f6f203faca02c3cda3f26fd9e2bd54bbfe866cb9a11ff533c206b` | Pass |
| Ultra-0.1.0-rc.1-x86_64-pc-windows-msvc.exe | `c71fcb5cfc5581e92ff068b98d6abee6a480d203e7a9af5e367575b6ad84dec1` | Pass |

All four configured resource files are present in every inspected package: THIRD-PARTY.txt, THIRD-PARTY-CRATES.json, Alive-LICENSE, fast_float-MIT. The packaged inventory contains all 568 entries. Unix packages match exact-head Git blobs byte for byte. Windows files differ only by CRLF line endings; normalizing those endings makes them identical to exact-head Git blobs, and the parsed JSON equals source exactly. Raw Windows hashes and normalization evidence are recorded, rather than reporting a false raw-byte match.

Downloaded artifact ZIP hashes match GitHub API digests. Package hashes match each CI SHA256SUMS file. Individual provenance, file paths, byte sizes, and hashes are in `macos-arm-bundled-notices.json`, `linux-bundled-notices.json`, and `windows-bundled-notices.json`; full artifact API metadata and job logs remain in the local evidence directory.

Intel macOS still building; its actual DMG has not been inspected yet. The other three native package jobs succeeded. Local archive inspection executed no Windows/macOS code and did not launch Linux binaries. Native CI includes its own tests/smoke checks, but this report does not claim manual platform GUI validation or full legal-license compliance.

No tracked-file changes or external writes were made by this packaging review. The parent intentionally advanced the source worktree from the original head to this updated head; initial updated-code tests used extracted files outside the worktree.

Final status snapshot at 2026-10-23T17:11:39.330328+00:00: run 39988671475 remains in_progress; three native package jobs succeeded and Intel macOS job `120534744185` remains in progress. Three artifacts (four installers) are available and verified; Intel macOS DMG unavailable for inspection. Validation stops polling at this snapshot per parent instruction so the remaining gap can be stated explicitly. See `final-status.json`.
