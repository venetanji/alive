# Shared-source recovery investigation

## Conclusion

The Task 8/9 baseline has a recovery deadlock when multiple instances reference a source that changes externally. Replace captures the changed file for one selected instance, but full-candidate preparation still rejects every untouched instance carrying the old source hash. The first failed Replace does not install its candidate, so repeating Replace on the other instance cannot make incremental progress. The error's unconditional "Use Replace to recover" advice is incomplete for this case.

The narrow recovery available without changing ownership or ordinary hash policy is to preserve the changed source at a new path, restore the original source at the shared path, and then Replace selected instances from the new path. Both sequential candidate states passed the existing native session probe. This requires an original matching source backup. If none exists, the current desktop flow offers no general supported recovery for this situation.

No implementation change is proposed as part of Task 10. Recommend documenting this verified recovery and improving the error advice as a focused follow-up. An explicit stopped batch refingerprint operation is a separate product/API decision, not a side effect to add to selected Replace.

## Scope and source evidence

All repository source inspection used `git show 7d6410f:<path>` against the frozen Task 8/9 baseline. The current working-tree sources were not used to infer behavior. No repository source, index, or HEAD was modified. Runtime experiments used disposable copies under `/tmp/alive-shared-source-recovery-359a8vsb`; original examples and `/tmp/alive-task9-native-final` sources were not modified. No whole-suite reruns or GUI automation were performed.

Baseline flow:

- `apps/ultra/src-tauri/src/session/desktop.rs:346`: `capture_device` reads and prepares the selected source, validates its manifest, and captures a fresh source fingerprint and fresh instance ID. Its stored parameter overrides start empty, with bypass false.
- `apps/ultra/src-tauri/src/session/desktop.rs:394`: `change_device` replaces only the selected instrument/effect reference and removes only automation lanes targeting that old instance. It does not refresh sibling references to the same source.
- `apps/ultra/src-tauri/src/session/desktop.rs:405`: `alive_device` requires main-window authority, the current generation, stopped transport, and no pending draft. It clones the installed canonical document, captures/replaces on that clone, calls `prepare` on the complete candidate, then calls `control.install`. Preparation failure returns before installing anything or closing stale editors.
- `apps/ultra/src-tauri/src/session/prepare.rs:64`: `prepare` sorts all device references by instance ID and prepares every one, including bypassed effects. Its contextual error always appends "Use Replace to recover".
- `apps/ultra/src-tauri/src/session/prepare.rs:140`: `prepare_device` reads the original source and checks its required lowercase SHA-256 fingerprint before applying instance-specific stored bases. Manifest identity/version, bindings, kind, and native profile checks still follow.
- `apps/ultra/src-tauri/src/session/persistence.rs:6` and `apps/ultra/src-tauri/src/session/persistence.rs:16`: normal Open and Save both call full `prepare`. Save checks before writing. Neither is an implicit refingerprint path.

Therefore the desktop deadlock and unchanged active model on preparation failure follow directly from source control flow. They were not exercised through private desktop commands in these display-free experiments.

## Reproduction and observed results

The fixture was copied from `/tmp/alive-task9-native-final/journey.alive`. Its two Utility effects share `journey-utility.ultra` and fingerprint `a1d4a9c5e3c474979108ca42e53bc5fe1c58c28c8c18ad3681f5652dc1de30f8`, but own separate IDs, bases, and bypass state:

| Track | Utility instance | Gain | Bypass |
| --- | --- | --- | --- |
| Pulse | `72c49480-a34a-489d-ab1a-f266617e2f4b` | 0.65 | true |
| Harmony | `005674ad-2f5f-42bb-aa26-6045140acb55` | 0.85 | false |

The instrument path was rewritten to a disposable frozen `subtractive.ultra` copy. Other referenced sources were copied unchanged; `utility.ultra` and `stereo-lowpass.ultra` were also staged for the probe's saved-chain proof. Canonical sorted, compact JSON SHA-256 computed in Python matched every saved source fingerprint before testing. This fixture has no problematic numeric serialization differences; the release probe also independently accepted the baseline and changed-source recovery hashes.

Command shape (each candidate has separate output/log files):

```sh
env -u DISPLAY -u WAYLAND_DISPLAY \
  LD_LIBRARY_PATH="$PWD/apps/ultra/src-tauri/target/release" \
  apps/ultra/src-tauri/target/release/alive --session-probe \
  /tmp/alive-shared-source-recovery-359a8vsb/baseline.alive \
  /tmp/alive-shared-source-recovery-359a8vsb/baseline-proof
```

The valid external edit changed only the first Utility node's canvas `x` from 75 to 76. It retained executable behavior and manifest bindings. Its new fingerprint was `d7baf1c4036f3bd40e07283ed015abcee0ce4a8f9d4fbc8b41101d708e1404ee`.

Replacement-equivalent candidates were manually constructed from the baseline wire document: only the selected Utility received a fresh UUID-shaped instance ID, new source fingerprint, empty bases, bypass false, and removal of any old selected-instance lanes. They model the candidate produced by capture/change; they do not invoke desktop `alive_device`.

| Candidate | Direct observation |
| --- | --- |
| Original copied baseline, before edit | Exit 0; `baseline-proof/report.json` has `passed: true`. |
| Unchanged baseline, shared source edited | Exit 1; Harmony old instance reports `Device source changed`. |
| Pulse replacement candidate, shared source edited | Exit 1; Harmony old instance still reports `Device source changed`. |
| Harmony replacement candidate, shared source edited | Exit 1; Pulse old instance reports `Device source changed`. |
| Restore original at shared path; Pulse replacement points to changed copy | Exit 0; `restore-copy-one-proof/report.json` has `passed: true`. |
| Same restored shared path; both sequential replacements point to changed copy | Exit 0; `restore-copy-two-proof/report.json` has `passed: true`. |
| Manual batch: both original Utility IDs retained, fingerprints updated together, both paths point to changed copy | Exit 0; `manual-batch-proof/report.json` has `passed: true`. |

Exact changed-source errors are preserved in `baseline-changed.log`, `replace-pulse-changed.log`, and `replace-harmony-changed.log`. For example:

```text
Alive session probe failed: Track 'Harmony' instance '005674ad-2f5f-42bb-aa26-6045140acb55' (journey-utility.ultra): Device source changed. Use Replace to recover
```

The final manual-batch experiment retained each instance's independent bases and bypass state. It only establishes that an explicitly constructed all-reference candidate can satisfy current preparation. It does not establish a supported batch desktop command, confirmation flow, race protection, rollback behavior, or general compatibility with arbitrary changed manifests/automation.

The existing release binary was not rebuilt or assumed to be an exact reproducible build of `7d6410f`. Recorded identities:

- `alive`: SHA-256 `981b782b071d1f58e46d89ab0474a5ce06e5d788bfaf71c625b29188b095aa2e`; mtime `2026-10-24T03:16:46.271228Z`.
- `libultra_native.so`: SHA-256 `693f0acff15caa77b8e572255f9e333bd8254eec2905c19386b38ffd9882a3a1`; mtime `2026-10-24T02:28:46.542041Z`.

Thus the report separately supports frozen-baseline flow reasoning and directly observed existing-release preparation/native probe behavior. These are offline native results, not physical audio or GUI claims.

## Conservative recovery policy

For the current implementation, document this procedure:

1. Stop transport and resolve pending schedule edits.
2. Copy the changed source to a new `.ultra` path before restoring anything.
3. Restore the original matching source at the shared path. Existing instances now satisfy their saved hashes. If reopening was blocked, Open can succeed again.
4. Replace the intended instance from the changed copy. Replace deliberately gives it a new identity, defaults/bypass state, and removes its old automation lanes.
5. Repeat explicitly for other intended instances, or leave them using the restored source. Save after successful recovery.

Simply copying the changed source and selecting that copy does not suffice while a sibling still resolves to the changed original path with an old hash. Restoring the matching shared source is the critical step. A different valid replacement device has the same limitation. Removing stale effects one at a time also fails while any stale sibling remains, so removal is not a general workaround. Removing an instrument removes its whole track and could eliminate multiple stale references together, at the cost of that track and chain.

Suggested future error guidance should identify the stale source and all dependent instances, explain that shared references may block selected Replace, and mention restore/copy recovery. Do not imply that ordinary Save/Open/Prepare accepts changed or absent hashes, or that Replace silently updates siblings.

If recovery without a source backup becomes a requirement, consider a separate explicit stopped batch refingerprint operation. It should enumerate the affected instances and exact source revision for user review, preserve instance IDs and their independent bases/bypass/lanes, validate each existing manifest/binding/automation against the captured changed source, prepare the whole candidate, and install atomically only on success. Normal Open/Prepare/Save stay strict. A selected Replace must remain selected-instance owned. The all-reference wire experiment demonstrates feasibility for a compatible appearance-only edit; implementing and testing this operation requires separate scope.
