# Pending Launch State Across Arrangement Boundaries

Source `74d92d407602d3fd7b8c2ac6161d59220eb09f1f`, fixing `92d84d1`.
Independent scoped re-review approves with no new findings. This remains provisional native MIDI
work; the launcher and shipping capability bits are unchanged.

Review reproduced a queued Launch whose published slot became NONE at an
unrelated Arrangement boundary while its action and receipt stayed pending.
The final transition now derives pending-slot metadata from the authoritative
queued action/token. A new playing regression uses track-local slot 3/global
slot 5 and checks adjacent occurrences, gap entry/exit, pending identity and
receipt, then exact application at frame 48000. Concurrent readers must observe
each pending boundary region and the applied state.

The retained review reproduction fails before the fix (exit 1), then passes
(exit 0). The new sparse regression also fails before the production edit.
Focused suites pass in 45.130320 seconds; the full native suite passes in
171.139815 seconds, including the unchanged 106661824-assertion envelope oracle,
original old-version proofs and 42 + 42 Stop stress cycles. The direct shipping
build still refuses unadmitted v4 configuration. Commands and output are retained.

```sh
bash apps/ultra/tests/ci/check-native.sh
```

Parent verification matches 68 raw artifacts, 58 source/binary/fixture/report
pins and both committed file blobs. The retained 145001 finite stereo PCM
frames are byte-identical to the initial authority render. This is offline
evidence, not native-app playback, deadline qualification or endurance.

Large binaries, binary configurations, PCM and source snapshots remain under
`/tmp/alive-workspaces-task2c-authority-actions/fix-1`; their hashes are retained.
Initial evidence and failed review remain separately in
`../task2c-authority-actions/`. No earlier failure is replaced by the fix logs.
