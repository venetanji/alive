# Offline Evidence Packet

Packets are private immutable snapshots. Store them outside the repository,
for example beneath `~/.cache/alive-ultra-evidence/device-mapping-<batch>/<device>/r1/`.
The coordinator supplies the manifest's absolute path and SHA-256 separately in
the dispatch. Workers verify that digest and all declared artifact/payload hashes.
An unchanged manifest is not proof of the truth or completeness of its claims.

## Manifest Fields

Schema name: `live-device-evidence-v1`. `verify_packet.py` reads this structure:

| Field | Contents |
| --- | --- |
| `schema` | Exact schema name |
| `device` | Human-readable device name, 1..100 characters |
| `revision` | Positive integer; a change produces a new private snapshot |
| `acquisition.owner` | Named coordinator, 1..100 characters |
| `acquisition.rea_status` | `exported-and-closed` or `not-needed` |
| `artifacts` | Nonempty list of installed source identity records |
| `files` | Nonempty list of retained evidence payload records |
| `findings` | Nonempty list of evidence-linked findings, including explicit unknowns when needed |
| `unknowns` | List of remaining questions or limitations; may be empty |

Identifiers are unique within each record list and use ASCII letters, digits,
period, underscore or hyphen, at most 100 characters. A list has at most 4096
entries. The manifest is at most 2 MiB. Hashes are lowercase 64-character SHA-256;
byte counts are integers from zero through 2 GiB. The verifier rejects duplicate
JSON keys, nonfinite constants, changed identities and broken references.

## Installed Artifact Records

Each `artifacts` entry has `id`, `kind`, absolute `path`, `bytes` and `sha256`.
At least one artifact has kind `dsp-dll`. Other useful kinds are `host-executable`,
`gui-pack`, `graphics-pack` and `default-preset`. These are references to installed
files, not an instruction to copy them. Include every source artifact needed by
the packet's claims. A host-derived conversion must identify that host, not just
the DSP DLL.

The verifier streams hashes from these exact files. It does not execute them,
modify them, acquire REA ownership or discover substitutes on the machine.

## Retained Evidence File Records

Each `files` entry has:

- `id`, `path`, `bytes`, `sha256`: payload identity. `path` is relative to the
  manifest directory, using `/`, with no empty, dot or parent components. Absolute
  paths and symlink escapes are rejected. Two entries cannot name the same payload.
- `authority`: `rea-static`, `native-runtime`, `host-runtime`,
  `installed-resource`, `authored-analysis` or `test-report`.
- `artifact_ids`: nonempty list of referenced installed artifact IDs.
- `evidence_ids`: nonempty list of REA `ev_...` IDs for `rea-static` entries.
  These IDs identify records inside the full retained payload; the verifier only
  checks their spelling, not their authenticity or presence in a REA export.

Useful payloads include full REA exports; descriptor JSON with the adapter/build
identity and command; resource inventories with entrypoints/model scopes;
observed physical conversion facts; native logs; and authored findings. Keep
original payloads and the derived analysis separate so a worker can revisit the
evidence boundary.

Use the authority describing the actual producer. A derived table transcribed
from disassembly is authored analysis linked to static evidence, not a runtime
observation. A mocked browser run is a UI test report, not a native audio test.
Put command, environment, implementation revision and scope in runtime/test
payloads; an energy number without its preparation state is weak evidence.

## Findings

Each finding has `id`, `claim`, `status`, `file_ids` and `limitations`:

- `observed`: the cited evidence directly establishes the bounded claim. This
  may be a static observation; it does not automatically mean runtime execution.
- `inferred`: the claim follows from evidence but still needs stated corroboration.
- `unknown`: evidence does not establish the claim; `file_ids` may be empty.
- `contradicted`: cited evidence conflicts with the claim or previous assumption.

All other statuses require at least one `file_ids` entry. `limitations` is a list
of explicit boundaries and may be empty. Claim/limitation strings have at most
4096 characters. Each file reference must exist in the packet. Include complete
evidence IDs in the claim or its retained analysis when several records share a
payload.

The verifier checks structure and byte identity. Reviewing whether references
support a particular finding is an analyst responsibility.

## Scope And Revision Discipline

Packets may contain partial evidence. Use an explicit unknown finding for missing
descriptor mappings, constructor failures, untested I/O or ambiguous conversions.
Do not fill required lists with invented measurements or empty exports.

The `rea_status` value records the coordinator's declaration. A script cannot
confirm server state, target ownership or permission to close someone else's
session. The coordinator must actually export and release its session before
parallel dispatch. Workers do not call MCP to verify this declaration.

Changed source bytes or a changed payload invalidate a packet. Preserve the old
snapshot, create `r2/`, verify the new files and dispatch its new digest. Do not
let parallel workers rewrite a shared manifest, append to one evidence JSON file,
or repair a mismatched hash in place. Their questions and outputs have separate
worker-owned paths outside the immutable packet.

## Local Verification

```sh
python3 -B docs/skills/live-device-mapping/scripts/verify_packet.py /absolute/private/device/packet.json
python3 -B docs/skills/live-device-mapping/scripts/test_packet.py
```

Successful verification prints only the device, revision, manifest digest and
record counts. It never prints payload bytes or runs a target. The tests use
synthetic fixtures, including source/payload changes, invalid paths, symlink
escapes, duplicate IDs, absent evidence references and unreleased acquisition.
