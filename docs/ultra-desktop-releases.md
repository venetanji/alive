# Ultra desktop builds and releases

## Scope and prerequisites

This workflow packages the existing Rust/Tauri + CPAL + Clockwork/Faust app,
not the editing-only browser preview. It preserves the shared native-library
boundary and the pinned generated Faust code. No Max/Live installation, licensed
help corpus, Faust compiler, scsynth, Steam publishing or updater service is
required. The optional JACK diagnostic remains Linux-only; desktop audio uses
CPAL on every target.

PR #1 and its checkpoint safety/portable-contract fixes are merged on main
(`821745888794e3b792e76e455962db2d61858755`). The packaging branch includes
that main history and PR #2 targets main. Verify the combined exact-head CI
before merging the packaging changes; do not tag an unmerged work branch.

## Builds

`.github/workflows/ultra-desktop.yml` runs unsigned packaging on relevant PRs
and manual dispatches. All four native targets must pass:

| Runner | Rust target | Download |
| --- | --- | --- |
| Ubuntu 24.04 | x86_64-unknown-linux-gnu | DEB and AppImage |
| Windows 2022 | x86_64-pc-windows-msvc | NSIS EXE |
| macOS 26 Apple Silicon | aarch64-apple-darwin | DMG |
| macOS 26 Intel | x86_64-apple-darwin | DMG |

AppImage is not a promise of compatibility with older glibc/WebKit distributions;
the Linux baseline is Ubuntu 24.04. Windows installers are currently unsigned
and can display SmartScreen warnings. Matching MSVC release runtime DLLs are
packaged app-locally from CMake’s selected Visual Studio toolset; extracted
installer checks also inspect the native DLL’s actual runtime imports. App-local
CRT servicing requires rebuilding packages when Microsoft ships runtime security
fixes; it does not receive central redistributable servicing automatically.
Maintainers must verify the applicable Visual Studio redistribution terms before
public distribution. macOS PR/manual builds are ad-hoc signed,
not notarized release downloads. Actual device/MIDI/latency and interactive UI
acceptance still require platform hardware testing.

Each job verifies version consistency, runs packaging-helper unit tests, builds
the real native engine, checks the shared ABI with a sounding Faust voice,
note termination and stop/restart, runs Rust tests and builds the installer.
Artifacts are uploaded as `ultra-<Rust target>` for 14 days with SHA256 manifests.
The separate existing Ultra CI retains its browser/contracts/CPAL loopback gates.

Build dependencies: Rust 1.85.1, CMake 3.31.6, Python 3.12.10, Node 22.20.0,
Tauri CLI 2.8.4, pinned Cargo.lock, SHA256-verified Clockwork revision
94b67500c96e105491682ec68741b5018560eab7 and Faust 2.88.0 source headers.
The macOS toolchain must support C++20 jthread/stop_token; Clockwork checks this
at configure time. Native runners avoid mismatching the Clockwork Rust archive
architecture with the C++/Tauri target. No ARM Linux/Windows or universal Mac
binary is claimed. Vendored fast_float 8.0.2 supplies allocation-free, locale-
independent decimal parsing without Apple libc++ floating-point availability
constraints. Its exact upstream revision and license texts are retained.

Local packaging on an equivalent host, after installing the platform's Tauri
prerequisites and pinned build tools:

```sh
npm --prefix apps/ultra/scripts/tooling ci --ignore-scripts
python apps/ultra/scripts/release.py check-version
python apps/ultra/scripts/test_release.py
python apps/ultra/scripts/release.py build --target x86_64-unknown-linux-gnu
python apps/ultra/scripts/release.py collect --target x86_64-unknown-linux-gnu
```

Use the corresponding native target on macOS/Windows. The existing Linux
`apps/ultra/build.sh` remains the development route. Packaging generates a config
override rather than silently changing that development command into a release.

## Tag-triggered publication

1. Merge and verify the packaging PR on main; the checkpoint cleanup is already merged.
2. Set the same desired SemVer in Cargo.toml and tauri.conf.json; update Cargo.lock
   with Cargo if the package version changes. Commit and pass CI.
3. An authorized maintainer pushes exactly `v<committed version>`, e.g.
   `v0.1.0` or `v0.2.0-rc.1`. This document does not create a tag.
4. The tag must point to a commit reachable from main. All four package jobs run.
5. Only after every job succeeds, a write-scoped publish job verifies five
   installers and four checksums, creates a draft release with assets and then
   publishes it. A hyphenated prerelease version creates a GitHub prerelease.

Manual dispatch only builds. No `release: published` trigger is used, avoiding
double builds. Existing releases are not overwritten. If creation succeeds but
final publication fails, inspect the draft and its assets before retrying; the
workflow intentionally refuses to clobber it. No release tags, merges or
repository secret changes are performed by this implementation.

## macOS signing/notarization setup

Configure these **names** as repository secrets or secrets in the protected
`desktop-build` environment, following the same convention as the other apps:

- `MACOS_CERTIFICATE`: base64 Developer ID Application .p12.
- `MACOS_CERTIFICATE_PASSWORD`: exported certificate password.
- `MACOS_SIGNING_IDENTITY`: Developer ID Application identity.
- `ASC_API_KEY_P8`: App Store Connect private-key contents.
- `ASC_API_KEY_ID`: key identifier.
- `ASC_API_ISSUER_ID`: issuer identifier.

No values are stored in source. The maintainer reports that signing secrets are
configured; their contents and authenticated signing have not been inspected or tested.
Configure credentials directly in GitHub, not chat. Limit `desktop-build`
access to approved release tags; `desktop-checks` needs no secrets. Review
GitHub environment protection rules before enabling release signing.

PRs never enter `desktop-build` and never receive signing secrets. Tag builds
fail closed when any required secret is missing. The script uses a temporary
keychain/key file, restores the keychain search list and deletes temporary
material on exit. Tauri receives APPLE_SIGNING_IDENTITY, APPLE_API_KEY,
APPLE_API_ISSUER and APPLE_API_KEY_PATH. The built app and distributed DMG are
signature-verified, notarized/stapled and assessed with Gatekeeper. Signing
cannot be proven by unsigned PR CI; the first authorized tag validates that path.

## Source references

Adapted release structure, not Electron build commands:
- [Tetrilaunch desktop.yml at 20bcab7](https://github.com/venetanji/tetrilaunch/blob/20bcab7f8731daff885103020d8739aad32499e6/.github/workflows/desktop.yml)
- [Easel desktop.yml at c070a52](https://github.com/venetanji/easel-client/blob/c070a5200566beb84ec2826c9b142b30b20a7298/.github/workflows/desktop.yml)
- [Easel signing checks](https://github.com/venetanji/easel-client/blob/c070a5200566beb84ec2826c9b142b30b20a7298/scripts/sign-macos.sh)
- [Tauri macOS signing and API-key notarization](https://v2.tauri.app/distribute/sign/macos/)
- [Tauri GitHub pipeline](https://v2.tauri.app/distribute/pipelines/github/)
- [GitHub native runner architectures](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

Alive/Ultra-owned source remains AGPL-3.0-or-later. Packages retain existing
license/provenance notices. Pinned upstream source, generated Faust exceptions,
Rust dependency metadata and system-library terms remain separately applicable;
packaging is not a new license grant or an assertion that every dependency is
AGPL. Release tags provide the corresponding Alive source snapshot on GitHub.
