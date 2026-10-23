# Capture006 Bounded Close Audit

Verdict: **FAILED, partial, nonqualifying; zero qualification passes added.**
No mismatch found in the audited bindings or preservation checks. This audit
prioritizes the complete close ACK and does not repeat a full graph assessment
or native comparison. Only this note and the derived diagnosis were written;
no preparation, launch, current verifier, source/package edit, scorer or
full reference validator was invoked. The lifecycle rule remains unchanged.

Request **125**, `close-float` revision 1, now has a complete retained ACK:
**91,560 bytes**, comprising 91,559 bytes of ASCII JSON plus one LF. Exact
JSON parsing succeeds; there are no other ASCII control bytes. Current
`ack.json`, retained `observations/ack-request-125.json`, and the public
request's raw hash/size binding agree. This is complete capture-bound
evidence, unlike capture005's subsequently retained truncated prefix.

The ACK reports `success=false`, `numeric-controller-refused`. Journal
sequence 223 records `closed-owner-absence-unproven`, matching the public
error digest. No close completion, post-close checkpoint, reopen or reset
is retained.

The complete diagnostics bind the private command, float revision/source,
working owner path and helper hashes. They contain exactly **31 samples**:
one before dispose and polls **1-30**, with no missing suffix. Poll timing
and elapsed duration are not recorded. The dispose field is preserved
literally as `attempted=true`, result `type=function`, `status=returned`;
that return metadata is not interpreted as a destruction certificate.

| Observation | Before Dispose | Every Recorded Post-Dispose Poll |
| --- | --- | --- |
| Root `.valid` | `undefined`, returned | `undefined`, returned |
| Reader / disposer `.valid` | numeric `1` each | numeric `0` each |
| All 23 original Basic handles | numeric `1` each | numeric `0` each |
| First-object handle `.valid` | numeric `1` | numeric `0` |
| Retained Wind `.visible` | boolean `true` | boolean `true` |
| Root/Wind-associated filepath | bound owner path | same bound owner path |

All 23 source anchors are present once per sample: **713 original-handle
validity observations**, including 690 post-dispose invalid observations.
Reader/disposer add 62 validity observations. These now establish the
capture-bound handle states. They do not establish top-level root destruction
or hidden-root absence. `Patcher.valid` remains undocumented and undefined;
the retained root/Wind wrappers and their associated `jpatcher` class/path
can retain values without furnishing a supported lifetime test. The separate
API assessment's `freebang` notification remains prospective and unobserved.

The retained prefix contains 42 completed operations (two installs, 40
events), 82 checkpoints (42 int, 40 float), 492 finite numeric values and
223 journal rows. All 125 ACK bindings, 82 raw/retained/public/sidecar
bindings and public/private journal projections match. All 18 historical
scripts, 17 sealed files and preparation/score bindings match pins.
Installed/pristine/working sources and installed/private helpers match;
private directories/files are `0700`/`0600`; preferences are byte-identical.

REA `ev_e1a2c14be3cbfa05e08772d47d97c6a401f708337e594d7bd573855d51d689cd`
records exit 1, 110 ms settlement, and matching untruncated hashes/sizes for
all four public after-artifacts. Cleanup records empty readable
owned/prefix/marker scans, prefix removal and Xvfb exit; the prefix is absent.
Limits include 327 unreadable environments per scan, ten unverified REA
processes, sampled processes and filesystem snapshots. Private files bind
through session/config and the derived ledger, not direct REA snapshots.

| Artifact | SHA-256 |
| --- | --- |
| Historical package006 | `11f641871d3800335c750c9c047940af1ec98b703b91320182c4a7288f3619be` |
| Complete ACK125 | `d99fe809a570a15635fc9ffe3c660ff6e3226002d70fe6be46c316712ab1ead8` |
| Canonical complete samples | `d2272cf666750d2949c75838605a89bb2a5b99f414e0b06fd6abfe60b10cc505` |
| Private observation ledger | `1d50fbdf094a368e5af4906e3a42faa78047fc8de9aa3962fc85b98af371a793` |
| Derived close diagnosis | `7a4e9184fc1151637da1ae81ee9bbfe1728c585ae4984e7a3b3437b3d3712568` |

`results/int-float-006/close-diagnosis.json` is audit metadata, not REA
runtime output. It binds all 31 samples and summarizes each of the 23
original handles without source/helper bodies or private graph payloads.
