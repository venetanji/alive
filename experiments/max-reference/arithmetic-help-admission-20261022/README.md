# Arithmetic Help Admission

This private intake bridge uses the production help-shell recognizer, Max
importer and hierarchy lowering for the exact installed `times`, `plus` and
`minus` roots. It verifies each source and all four helper file digests before
supplying the offline probe response. The bridge is an importer harness;
backend recognition and Reference authorization need their own Rust checks.

Run from the worktree root:

```sh
node --test experiments/max-reference/arithmetic-help-admission-20261022/import.test.mjs
node experiments/max-reference/arithmetic-help-admission-20261022/import.mjs RESOURCES times NEW_PRIVATE_OUTPUT_DIRECTORY
```

Use a new output directory outside the worktree. Its exclusive private files
contain the imported authoring document, flattened graph and import metadata.
Repeat separately for `plus` and `minus`. Keep these files private: they retain
installed authored content and source maps. The terminal summary contains only
identity metadata, counts and completeness status.

The existing `help_root_export` Cargo example calls production Rust preparation
on each private `authoring.json`; direct descriptor construction is not part of
this bridge. A successful intake must retain 20 source boxes, eight cables, 20
scoped node mappings and ten native executable nodes per root. Preserve all
diagnostics, including finite arithmetic range and saved appearance/metadata
warnings. Neither successful intake nor zero omissions establishes complete
behavior, physical interaction, saved-state fidelity or whole-help qualification.
