# Coordinator And Worker Contracts

## One REA Owner

REA's active native target is shared. Give one named coordinator ownership for
the whole mapping batch. This is an operating rule, not a claim that the MCP
server implements locks. Parallel workers use exported files and never query or
switch its active session. A project lock file alone cannot protect other tasks
using the same MCP server.

Before using REA, the coordinator checks the actual session and ownership. Reuse
matching retained evidence. Do not close another session's target or open a new
target over it. If another task owns REA, continue local resource/model analysis
and obtain a release through that task's authorized coordination mechanism.

Use the installed `reverse-engineer-anything` skill when operating REA. Do not
make workers install or reconfigure the server. If the engine is unavailable,
record the specific missing evidence and continue work supported by exported
data; do not label guesses as verified mappings.

## Acquisition Pass

Start from concrete questions, not a full decompilation of every binary:

1. Identify the exact installed DLL, host build when needed, preset and resource
   packs. Hash artifacts before analysis; reuse prior observations only when
   their identities match.
2. Inventory the common DSP exports/imports and retained constructor/descriptor
   evidence. Note which results came from the retained adapter and which belong
   to older throwaway probes. Do not execute an unqualified constructor in Ultra.
3. Follow unresolved model-to-native mappings and display conversions in the
   host as needed. Capture the specific function, address convention, branches,
   tables, referenced evidence IDs and limits supporting each claim.
4. Inventory the actual installed GUI entrypoint and reachable resources, plus
   preset model roots and property scopes, using the existing bounded readers.
   Resource presence alone does not prove rendering or a loadable DSP boundary.
5. Export complete evidence to the private batch directory. If a tool response
   is truncated, retain/page/export its evidence instead of treating the preview
   as a complete analysis. Keep raw results beside authored findings.
6. Close the native session after export. Build one immutable packet revision
   per device, verify it, and record its digest in worker assignments.

One acquisition phase can inspect targets serially. It need not recover every
control before workers begin. A focused followup phase answers queued questions
and emits new packet revisions; workers do not edit a dispatched revision.

## Dispatch

Each assignment supplies these concrete values:

| Field | Meaning |
| --- | --- |
| Worker mechanism and identity | Actual Terra task, Codex agent or other selected runner; no guessed executable/model |
| Device or parameter scope | One independently qualifiable device or explicit property subset |
| Checkout and source revision | Exact worktree plus starting revision/dirty-state boundaries |
| Host/profile contract | Exact current contract path and allowed extension points |
| Packet path and SHA-256 | Private immutable evidence revision |
| Owned source/test paths | Disjoint device files; central registries and loader admission excluded |
| Private output/build path | Unique per worker and run; outside repository and running app build directories |
| Question path | Unique worker-owned append-only JSONL file |
| Result path | Unique worker report, with structured conclusions and test evidence |
| Acceptance scope | Which stages this assignment must prove, and which are explicitly outside it |

Prompt template, with values filled by the coordinator:

```text
Use live-device-mapping at the supplied SKILL.md path.
Role: mapping worker. Device/scope: [assigned scope].
Checkout/revision: [checkout and revision].
Host/profile contract: [current contract path].
Packet: [private manifest path], SHA-256 [digest].
Owned source/test paths: [explicit paths].
Private build/output: [unique path]. Questions: [worker JSONL path].
Result report: [worker report path]. Acceptance: [required stages].
No REA MCP calls and no shared registration/loader/host edits.
Verify evidence identities, qualify supported mappings, and return changes,
test outcomes and explicit unknowns. Queue narrow missing-evidence questions;
continue independent supported work. Do not spawn additional workers.
```

This template does not grant permission to alter unspecified files or to send
messages through external services.

## Missing-Evidence Questions

Each worker appends to its own file; workers never append to a shared queue:

```json
{"id":"electric-filter-order","device":"Electric","packet_revision":1,"property":"FilterType","question":"Which native enum order does the model chooser encode?","candidate_native_indices":[12],"evidence_file_ids":["descriptor-probe"],"required_authority":"static-model-and-native","blocked_scope":"FilterType only"}
```

The values above illustrate a request format; the index and property are not
Electric mapping facts. The coordinator aggregates these files, deduplicates
questions and records answers in a new evidence packet. Findings cite the new
revision. Elapsed time and a guessed candidate never count as an answer.

## Result Report

Return one report with:

- Packet path, digest, revision, exact artifact identities, and changed files.
- Mapping facts with model key, complete native signature(s), encode/decode,
  display/parser evidence, observed/inferred/unknown status and evidence IDs.
- Commands, environment, actual test outcomes and retained runtime log paths.
- Counts kept separate: model fields, logical mappings, native slots, UI control
  instances and drawings. Include unresolved entries and fallback initialization.
- Stage status for construction, I/O audio, editor binding, preset/state roundtrip,
  multiple instances, timing/lifecycle, and Alive hosting. Use partial/unknown
  where the assignment did not exercise a stage.
- Questions still open, integration requirements and the exact scope released.

## Integration And Forward Test

The integrator reviews the device facts and covering tests, applies central
registration/admission deliberately, and reruns the tests covering integration.
Do not upgrade old private-probe evidence into current runtime support.

Before launching a large mapping batch, give a fresh worker this skill, the
agreed contract and a packet for a small device/property subset. Supply the raw
evidence, not the expected answer. Assign temporary output and no central edits.
Observe whether it verifies identities, keeps static/runtime claims separate,
produces a reviewable mapping, queues a missing fact and leaves MCP untouched.
Tamper with a copied packet payload and confirm verification stops dependent
work. Correct the workflow only for demonstrated failures. Record which worker
mechanism was actually tested; a Codex forward test does not prove Terra setup.
