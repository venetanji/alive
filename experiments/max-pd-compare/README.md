# Bounded Max → actual libpd message comparison

Run from this directory:

```sh
python3 compare.py --reference-root /path/to/experiments/max-reference --libpd /path/to/libpd.so
```

Requires Python 3 and the existing pinned libpd build; neither the library nor reference bundle is included. Both paths are required; no machine-specific defaults are used. Output files are generated next to compare.py. The input parser explicitly rejects messages outside the literal forms used by the three selected scores; it is not general Max message-box syntax support.

Uses the existing MULTI libpd shared library supplied through --libpd, with libpd commit ba0dc63262901d658af8bbda5e619a60fa975e78 and Pd commit f009fd8d7b537e209e09898d487fdf1bf547da2b. No install, network, Max process, UI, audio initialization or hardware. Results include the SHA256 of the loaded library. Source reference: `experiments/max-reference` from user commit 37e3b0f282bc5c03e57acdbe658dbb946f549527. Input files are read-only. The three generated `.pd` graphs are explicit hand mappings, not a general importer/interpreter.

## Method

Read the reference README and probe.js collector limitations first. Run the complete supplied scores for 19-depth-first (1 input), 03-hot-cold (8 inputs) and 08-pack (7 inputs). Graph output labels connect to Pd sends, bound using libpd_bind; hooks capture output immediately in arrival order, grouped by synchronous input. The Max expected records retain raw ordered observations; this comparison does NOT use derived event_annotations, source-outlet claims or causal attribution for asynchronous events. Each selected score has no explicit wait, scheduler or initialization behavior; the 1 ms Max task spacing and 100 ms drain are not reproduced because these graphs are synchronous only.

Input message-box syntax is deliberately mapped: bang→libpd_bang; scalar number→libpd_float (including Max integers, an explicit type loss); `symbol pear`→libpd_symbol; `list ...`→libpd_start_message/add_float/add_symbol/finish_list; `set 11`→libpd_finish_message with selector set and numeric argument. These particular messages contain no comma, semicolon or substitution syntax. Max int→Pd float conversion is NOT a compatibility claim.

Max `t b b`→Pd `t b b`, preserving nested branch topology. Max `+ 10`→Pd `+ 10`, Max `int 7`→Pd `int 7`. Max `pack i f s`→Pd `pack f f s`: Pd does not carry a separate integer atom type, and this is only a value/storage candidate mapping. It does not establish integer slot coercion equivalence. No corrective adapter was inserted to hide divergences.

## Results

- Depth-first: exact match, inner_right bang then inner_left bang then outer_left bang. Three outputs, no diagnostic.
- Hot/cold: 5 outputs each. Ordered values 12, 102, 105 and 9 match; all Pd selectors are float versus Max int. Cold changes remain silent. At `set 11`, Pd logs `int: no method for 'set'`, leaving state unchanged. Final bang is Pd 9 versus Max 11. This is a real method/state divergence in addition to numeric typing.
- Pack: 5 outputs each. Initial list is Pd `[0,0,"symbol"]` versus Max `[0,0,"s"]`, a real default-state divergence. Later lists match values and order: `[5,2.75,"pear"]`, `[8,9,"pear"]`, `[1,2,"peach"]`, `[1,2,"peach"]`. This captures silent cold updates, short-list retained slots and long-list ignored tail for this score. Max numeric list atom types are unknown at its JS collector, while Pd hook atoms are floats; matching values do NOT certify type equivalence. Results use null exact_observable_equal where type equality cannot be established, not false evidence of known type mismatch.

Useful reusable primitive: Pd synchronous trigger/depth-first propagation. Candidate value behavior: + hot/cold and pack post-initialization list storage on these scores. Required compatibility policy/adapter: explicit numeric tags/coercion, int set storage, pack initial symbol state. No general Max compatibility, scheduling, UI, DSP or hardware claim.

Committed evidence: results.snapshot.json and run.snapshot.log. A run writes results.json and regenerated hand-mapped .pd graphs next to compare.py. Exit zero means the comparison ran, NOT that Max compatibility passed: the intentional divergences are reported, not hidden. See PLAN.md for the curated local handoff and next gates. Project-owned files are AGPL-3.0-or-later under the repository LICENSE.
