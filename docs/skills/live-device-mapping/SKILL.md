---
name: live-device-mapping
description: Map locally installed Live device DLLs, model properties and editor resources into Ultra live.device profiles. Supports a coordinator acquiring REA evidence serially and Terra or other workers qualifying separate devices in parallel. Use for this native-device workflow, not general VST hosting or ordinary source refactoring.
---

# Map Live Devices Into Ultra

The product is one `live.device~` host with device profiles, original installed
DSP, and one shared Live-style control family. A profile is not a separate app.
User-owned DLLs, presets, XML/artwork, disassembly, REA exports and captures stay
in the private evidence directory outside the repository. Authored mapping facts,
adapters and tests may enter the assigned source paths.

Read the repository's current
[generalization audit](../../../experiments/native-devices-20261031/generalization-audit.md)
and [live.device object contract](../../superpowers/specs/2026-10-31-live-device-object.md).
The assignment identifies the exact contract revision and extension points.
Distinguish the current contract from the audit's proposed architecture. Do not infer interfaces
from old experiment kind numbers or add a new device by copying the Analog app.

## Choose The Assigned Role

- **Coordinator:** read [coordination.md](references/coordination.md). Acquire
  missing evidence sequentially, export immutable per-device packets, and assign
  workers disjoint files and private build/output paths. Only this role owns the
  shared REA MCP session.
- **Mapping worker:** read [qualification.md](references/qualification.md), verify
  the assigned packet and qualify one device or parameter scope. Do not call any
  REA MCP tool, including session/readiness tools. Write a focused request to your
  own question file when a missing fact needs the coordinator's next REA pass.
- **Integrator/reviewer:** use the returned evidence and tests to accept a
  profile. Updating central registration, loader admission or host contracts
  belongs to the integrator, not concurrent mapping workers.

The workflow is engine-neutral: Terra may dispatch these instructions through
its own task mechanism; Codex workers can consume the same skill and assignment.
Do not assume a Terra executable, model alias or MCP registration exists. The
assignment must identify the actual worker mechanism.

## Packet Before Parallel Work

The coordinator supplies an absolute private `packet.json` path and its SHA-256.
The schema and evidence boundaries are in [packet.md](references/packet.md).
Verify the packet, retained files and installed artifact identities without
opening an analysis session:

```sh
python3 -B docs/skills/live-device-mapping/scripts/verify_packet.py /absolute/private/device/packet.json
```

Compare the returned `manifest_sha256` with the assignment. The verifier checks
integrity and references; it cannot certify that a claim is true, that an owner
closed REA, or that static evidence observed runtime behavior. Read each cited
finding and its limitations. A changed/missing artifact requires a new packet;
do not silently update its identity to make a check pass.

## Mapping Invariants

- Keep **model-to-native encoding** separate from **physical formatting/parsing**.
  Name/range similarity is a candidate, not proof. Verify endpoints, sign,
  offsets, enum order and compound fields. Midpoints hide inversions.
- Use the same encode/decode path for default import, edits, acknowledgments and
  polling. Group compound writes atomically under the host contract.
- Validate exact descriptor identity: index, module, property, kind and range.
  A working cached parameter write does not prove native readback or sound fidelity.
- Treat host-owned settings, UI commands and DSP slots as distinct. Some controls
  change several properties; others require MIDI/transport behavior outside DSP.
- Initialize a complete bounded state before notes. Preserve unsupported fields
  according to the host contract; keep unqualified controls disabled and report
  them. Do not invent units/curves or substitute midpoint values for defaults.
- Prepare and destroy native instances off the audio thread. Build probes in the
  assigned private path, never over a library mapped into a running app. Do not
  enlarge shared loader admission merely to obtain a successful probe.

## Return A Reviewable Device Package

Return authored mapping/profile changes only in assigned files, meaningful tests
and an evidence-linked report. Include actual commands and outcomes, current UI
coverage, unsupported mappings/drawings, runtime limitations, and any queued REA
questions. State independently whether the device constructs, produces sound,
has a bound editor, preserves saved state and works in Alive. One success does
not imply the others.

Use [coordination.md](references/coordination.md)'s dispatch/result format. The
coordinator owns central integration and decides when another evidence pass is
needed. Workers can finish supported subsets while keeping unknowns explicit.
