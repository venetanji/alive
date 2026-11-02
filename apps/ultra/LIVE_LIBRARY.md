# Import Installed Live Devices

`import-live-library.py` inventories a local Live installation without loading
its binaries or starting audio. It generates ordinary saved Ultra devices only
for coordinator-registered profiles whose required stages all passed and whose
installed artifact identities still match. It preserves every existing source
revision and user-authored file in the Alive library.

Run an inventory first:

```sh
python3 -B apps/ultra/import-live-library.py \
  '/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite' \
  --dry-run --report /absolute/private/live-inventory.json
```

The positional argument is the installation root containing `Program` and
`Resources`. No Wine process or REA session is needed. Python 3.10 or newer on
Linux is sufficient for inventory; qualified generation additionally uses Node.js
and the fixed repository helper `export-live-device.mjs`. The importer does not
install dependencies, change device settings, or modify the Live installation.

Omit `--dry-run` to generate and publish qualified devices:

```sh
python3 -B apps/ultra/import-live-library.py /absolute/Live \
  --library /absolute/private/qualified-devices \
  --report /absolute/private/live-import.json
```

Without `--library`, publication uses `$XDG_DATA_HOME/alive/devices` when that
variable is absolute, otherwise `~/.local/share/alive/devices`. Alive also scans
directories configured through `ALIVE_DEVICE_LIBRARY_PATHS`. A dry run does not
create the library directory or its lock and does not require the exporter.
An empty registry is valid: discovery completes, with zero generated files.

## Inventory And Bounds

The JSON report goes to stdout; `--report` also writes it atomically outside the
installation. Reports cannot use the playable `.ultra` extension. Keep reports
and private evidence outside Git. Reports contain paths, sizes, hashes and
export names, not executable bytes, presets, XML, artwork or decompilations.

Discovery enumerates every file under the explicit root, including hidden files.
It includes every literal `.dll`, `.mxe64`, `.node` and `.vst3` file regardless of
case, plus files with an MZ signature even when their suffix differs. It hashes
each retained path with SHA-256, parses bounded PE headers and exact named
exports, and keeps duplicate-content paths in `duplicate_content`.

`classification` separates seven-export standalone DSP candidates, complete Max
device candidates (`abl.device.*` with `ext_main`), lower-level Max DSP blocks,
ordinary Max externals, support DLLs, executables, unsupported architectures,
unsupported formats, and malformed PE images. An unsupported or malformed image
can be completely inventoried; its reason does not become an execution claim.
Max externals require a different backend from the standalone DSP family.

The report separates `scan.complete` from profile eligibility and publication.
Directory/file symlinks are rejected without following their targets. Read,
traversal or budget failures mark discovery incomplete and prevent all generation
for that run. The report records inspected artifacts, so an incomplete result is
not mistaken for absence. A complete scan containing unsupported candidates is
successful discovery. It does not certify constructor compatibility, parameter
meaning, GUI behavior, real audio, or a working Alive device.

| Limit | Maximum |
| --- | ---: |
| Directory depth (`--max-depth`, root depth is zero) | 32 default, 64 accepted |
| Visited installation/library entries (`--max-entries`) | 100000 |
| Individual installed file (`--max-file-bytes`) | 512 MiB |
| Total installed bytes read, including qualification rechecks (`--max-total-bytes`) | 4 GiB |
| PE sections / named exports / export-name bytes | 96 / 65536 / 1024 |
| Registry / generated document, including canonical output | 2 MiB each |
| JSON depth / structural values | 64 / 200000 |
| Profiles / artifacts per profile / evidence references per profile | 128 / 64 / 64 |
| Generator time (`--generator-timeout`) / stderr | 30 seconds / 64 KiB |

Except for the documented depth allowance, CLI limits can only lower the defaults.
Reads use non-following directory/file descriptors. Hashing checks file metadata
before and after reading. Artifact checks and post-generation rechecks share the
total installed-read budget. Exhausting it during qualification blocks the
profile even if discovery completed. No scanned executable is invoked.

## Qualification Registry

The default registry is `apps/ultra/live-device-qualifications.json` beside the
script. `--registry` selects another authored registry for controlled testing or
review. Schema `ultra-live-device-qualifications-v1` has exactly `schema` and
`profiles` at the top level. Profile records have these fields:

```json
{
  "id": "live12-example-v1",
  "device": "Example",
  "class": "instrument",
  "artifacts": [
    {"path": "Resources/Devices/Pc/Example_64.dll", "bytes": 1234,
     "sha256": "0000000000000000000000000000000000000000000000000000000000000000"}
  ],
  "stages": {
    "construction": "unrun", "initialization": "unrun", "audio": "unrun",
    "mapping": "unrun", "editor": "unrun", "state": "unrun",
    "instances": "unrun", "lifecycle": "unrun", "timing": "unrun", "alive": "unrun"
  },
  "evidence": ["coordinator-owned qualification record; example only"],
  "generator": "export-live-device.mjs"
}
```

This is an incomplete example, not an enabled device. `class` is `instrument`
or `audioEffect`. IDs contain 1..48 lowercase ASCII letters, digits, dots,
underscores or hyphens, starting with a letter or digit. Artifact paths are
normalized installation-relative POSIX paths without traversal or symlinks.
Every byte count and lowercase SHA-256 must match. At least one artifact must
be a discovered valid x86-64 PE DLL. Profile IDs and per-profile artifact paths
must be unique. Unknown fields, arbitrary generator commands, duplicate JSON
keys, nonfinite numbers and unsafe names are rejected.

Each required stage is `passed`, `failed`, `partial` or `unrun`. Only ten
`passed` declarations plus matching identities yield `eligible`. Every incomplete
stage appears in the report. Nonempty bounded evidence strings identify the
coordinator's qualification records; the importer does not execute their tests
or verify their truth. Reviewing genuine construction, initialization, sound,
semantics, original editor, state, instance, lifecycle, timing and Alive evidence
remains the coordinator's responsibility.

## Fixed Exporter

For eligible profiles, the importer invokes only the adjacent repository helper:

```text
node /absolute/repository/apps/ultra/export-live-device.mjs
```

It supplies JSON on stdin:

```json
{"device":"Example","profile":"live12-example-v1","installation":"/absolute/Live","resources":"/absolute/Live/Resources"}
```

Success means exit zero and one bounded JSON saved Ultra document on stdout.
The fixed helper owns shared profile/default conversion and full graph,
presentation, manifest and native-state validation. The importer additionally
checks finite JSON, duplicate keys, document/presentation/manifest envelopes,
and the declared musical class. It contains no parameter conversion tables.
Profiles cannot supply executable paths or shell commands.

Missing helpers, timeouts, excessive streams, invalid output or changed inputs
prevent publication and preserve previous library files. Installed artifacts
are checked again after generation, as is the helper's own source identity.

## Immutable Publication

Qualified output is named:

```text
<profile-id>-<input-revision-sha256>-<document-sha256>.ultra
```

The input revision covers the profile declaration, installation path, pipeline
schema and fixed helper source hash. The document hash covers canonical saved
JSON. Changed evidence/qualification or helper source creates a new revision;
previous paths remain available to accepted sessions. Keep exporter dependency
and profile changes synchronized with new qualification declarations; the
importer does not infer the exporter's complete transitive module graph.

A destination-local `.live-library.lock` serializes writers. The importer holds
the directory descriptor, writes and flushes a private staged file, and atomically
links its completed inode to a new filename without replacing occupied paths.
It rejects symlink destinations and changes to the destination during generation.
Staged files are removed after publication or failure. Abrupt process termination
can leave a hidden staging file; it is never a playable `.ultra` entry.

Identical reruns verify identities and the saved document hash, then return
`unchanged` without rerunning the helper or changing the document mtime. Edited
generated files, invalid occupied names or ambiguous revisions produce errors
and are preserved. User-authored names such as `Electric.ultra` are untouched.
Do not delete old generated revisions while sessions may reference their paths.

`profiles` reports `unqualified`, `artifact-mismatch` or `eligible` separately
from `publication`, whose per-profile results are `published`, `unchanged` or
`failed`. One profile's export error does not undo other independent immutable
publications. Incomplete discovery prevents every export. Unsupported candidates
never produce playable placeholders.

Exit codes:

- `0`: complete discovery without identity/publication failure, including empty
  registries and unqualified candidates.
- `1`: incomplete discovery, artifact mismatch or publication failure.
- `2`: invalid registry/configuration, inaccessible installation or report-write
  failure; standard argument syntax errors also use argparse's code `2`.

## Verification

```sh
python3 -B -m unittest discover -s apps/ultra/tests -p test_import_live_library.py -v
```

Tests author synthetic PE bytes and temporary fixed-name Node helpers; they
never execute discovered binaries or installed DSP. They cover classification,
malformed RVAs, duplicate paths, traversal/read bounds, symlinks, stage/identity
gates, invalid registries/output, generator time/stream limits, changed inputs,
concurrent locks, source preservation and immutable reruns.

On 2026-11-02, the local Live 12 Suite dry run completed with 53486 visited
filesystem entries, 986 native artifact paths and zero scan errors: 7 standalone
candidates, 15 Max device candidates, 59 Max DSP blocks, 790 other Max externals,
87 support DLLs, 22 executables and 6 unsupported-format artifacts. The empty
registry produced zero qualified exports. This inventory does not change the
qualification of Analog, Electric, Corpus or any other device.
