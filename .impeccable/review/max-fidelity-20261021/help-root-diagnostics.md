# Four Installed Help Roots: Fresh Diagnostic Disposition

Static assessment on 2026-10-22, ordered append, prepend, int, float. All four
exact installed sources retain every box and cable through the current
recognized-shell importer, but all four remain partial imports. There are
**521 diagnostic records: 505 warnings and 16 helper information records**.
There are no import errors or omissions. This is a fresh importer run, not the
older arithmetic projection in `after-cables-next-wave.md`.

No product code, runtime behavior, screenshots, helper scripts or installed
source files were changed. No Max, Wine, browser or desktop application was
launched. Whole-help qualification remains **0/2,103**.

## Inputs And Method

The resource path comes from `apps/ultra/src-tauri/src/help_reference.rs:71`:
`ULTRA_MAX_RESOURCES` takes precedence; otherwise the default is
`/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources`.
The four inputs are its `help/max/{append,prepend,int,float}.maxhelp` files.

| Root | Bytes | SHA-256 |
| --- | ---: | --- |
| append | 22,166 | `d4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729` |
| prepend | 20,651 | `281fec882e5eac1c59f74b677a2c8485701602153028e2bead9e338e1440f5fb` |
| int | 26,001 | `bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61` |
| float | 28,070 | `c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c` |

A read-only Node harness verified these raw-byte hashes and all four helper
hashes against the current Rust `ROOTS`/`HELPERS` constants. The helper names
are `helpstarter.js`, `helpname.js`, `helpdetails.js` and `helpargs.js`; their
contents were neither printed nor copied. It then supplied the statically
verified recognition response through the real `probeHelpShell` function and
called the real `importMaxPatcher(source,{helpShell:identity,allowPartial:true})`.
This exercises the JS source-bound identity and structural adapter. It does
not claim that native IPC or a native runtime was exercised.

Only counts, IDs, class names, diagnostic fields and attribute metadata were
emitted. No installed help prose, full JSON graph or script source is included
in this report. Current importer/helper tests were read; they use original
synthetic fixtures and an explicitly fake native probe, rather than proving
these installed roots' example behavior.

## Current Results

| Root | Boxes Retained | Cables Retained | Appearance Warnings | Semantic Warnings | Port Warnings | Helper Info | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| append | 19/19 | 9/9 | 77 | 43 | 1 | 4 | 125 |
| prepend | 18/18 | 9/9 | 75 | 43 | 1 | 4 | 123 |
| int | 25/25 | 10/10 | 80 | 43 | 5 | 4 | 132 |
| float | 27/27 | 12/12 | 83 | 49 | 5 | 4 | 141 |
| Total | 89/89 | 40/40 | 315 | 178 | 12 | 16 | 521 |

For every root: `importable=true`, `complete=false`, `partial=true`,
`omittedBoxes=0`, `omittedEdges=0`, `decorations=0`, adapter
`max-help-four-v1`. Without explicit partial admission, the warning-bearing
reports do not yield a patch. Containers, helpers and comments are retained
authoring nodes, not extra native executable classes.

The source scopes are append Basic `root/obj-5`, question `root/obj-1`;
the other roots use Basic `root/obj-2`, question `root/obj-3`. All question
scopes are empty. Each full tree includes root, Basic and question scopes.

## Actual Diagnostic Keys And Values

In these tables, A is current `appearance-gap`, S is current `semantic-gap`;
both have severity `warning`. P is current warning `port-shape`, and I is
information-level `help-helper`. These are the actual importer classifications,
not recommended severities. A repeated-key row counts one diagnostic per
attribute occurrence, even if several keys share one table row.

### Patcher Attributes

Each of the following **30 keys occurs in all three scopes of every root**:
3 records per root per key, 360 records in total.

| Key | Actual Value | Code | Disposition |
| --- | --- | --- | --- |
| `bglocked` | `0` | A | Saved edit/lock default; explicit policy still needed. |
| `openinpresentation` | `0` | A | Saved patching-mode default; no general presentation support. |
| `default_fontsize` | root `12`, Basic/question `13` | A | Partially represented by explicit box sizes/comment inheritance; not a general patcher font model. |
| `default_fontface` | `0` | A | Normal-face policy still needs an explicit mapping. |
| `default_fontname` | `"Arial"` | A | Real font dependency; renderer uses Liberation Sans. |
| `gridonopen` | `1` | A | Saved grid visibility is not imported. |
| `gridsize` | `[15,15]`; prepend root `[10,10]` | A | Saved grid spacing is not imported. |
| `gridsnaponopen` | `1` | A | Saved snap behavior is not imported. |
| `objectsnaponopen` | `1` | S | Editor interaction policy, rather than a missing native object. |
| `statusbarvisible` | `2` | A | Saved chrome policy; enum meaning is not established here. |
| `toolbarvisible` | `1` | A | Saved chrome visibility is not imported. |
| `lefttoolbarpinned` | `0` | S | Saved editor chrome policy. |
| `toptoolbarpinned` | `0` | S | Saved editor chrome policy. |
| `righttoolbarpinned` | `0` | S | Saved editor chrome policy. |
| `bottomtoolbarpinned` | `0` | S | Saved editor chrome policy. |
| `toolbars_unpinned_last_save` | `0` | A | Saved editor chrome state. |
| `tallnewobj` | `0` | A | Ordinary object-height policy; imported rectangles alone do not establish future creation behavior. |
| `boxanimatetime` | `200` | A | Saved animation timing is not imported. |
| `enablehscroll` | `1` | A | Saved scroll policy is not imported as a per-patcher setting. |
| `enablevscroll` | `1` | A | Saved scroll policy is not imported as a per-patcher setting. |
| `devicewidth` | `0` | A | Unconstrained-width policy needs an explicit finite disposition. |
| `description` | `""` | S | Exact empty metadata candidate for informational disposition. |
| `digest` | `""` | S | Exact empty metadata candidate for informational disposition. |
| `tags` | `""` | S | Exact empty metadata candidate for informational disposition. |
| `style` | `""` | A | No named patcher style selected; exact-empty candidate. |
| `subpatcher_template` | `""` | A | No template selected; exact-empty candidate. |
| `showontab` | root `0`, Basic/question `1` | A | Already represented by the fixed recognized shell, not generic tab support. |
| `assistshowspatchername` | `0` | A | Saved editor assistance policy. |
| `cluebar` | `0` | S | Saved editor assistance/chrome policy. |
| `originid` | source IDs in the next table | S | Nonexecuting source identity; informational candidate. |

| Root | Root `originid` | Basic `originid` | Question `originid` |
| --- | --- | --- | --- |
| append | `pat-4826` | `pat-4828` | `pat-4830` |
| prepend | `pat-8982` | `pat-8984` | `pat-8986` |
| int | `pat-7080` | `pat-7082` | `pat-7084` |
| float | `pat-6730` | `pat-6732` | `pat-6734` |

The following **11 keys occur only at each root**, one record per root per
key, 44 records total. All currently use S.

| Key | Actual Value | Disposition |
| --- | --- | --- |
| `showrootpatcherontab` | `0` | Fixed shell already hides the root while hosting Basic. |
| `dependency_cache` | Four records described next | Fixed verified helper dependencies, not generic dependency loading. |
| `autosave` | `0` | Exact disabled-service candidate. |
| `oscsendmode` | `0` | Exact disabled-service candidate. |
| `oscsendudpaddr` | `"127.0.0.1"` | Dormant endpoint only when its mode remains disabled. |
| `oscsendudpport` | `30337` | Dormant endpoint only when its mode remains disabled. |
| `oscreceivemode` | `0` | Exact disabled-service candidate. |
| `oscreceiveudpport` | `30338` | Dormant endpoint only when its mode remains disabled. |
| `oscqueryenable` | `0` | Exact disabled-service candidate. |
| `oscprefixmode` | `0` | Dormant prefix configuration under disabled OSC modes. |
| `oscprefix` | `""` | Dormant prefix configuration under disabled OSC modes. |

Each `dependency_cache` contains exactly `helpargs.js`, `helpdetails.js`,
`helpname.js`, `helpstarter.js`, in that order. Each record has
`bootpath:"C74:/help/resources"`, `type:"TEXT"`, `implicit:1`. There are no
other dependency records in these four sources. Exact helper bytes were
verified separately; a filename match alone must never authorize adaptation.

### Box Attributes And Helpers

Counts in the four root columns are actual diagnostic records. The table
accounts for the remaining 117 records.

| Key / Condition | Actual Value | Code | append | prepend | int | float |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `fontname` | `"Arial"` | A | 16 | 14 | 15 | 18 |
| Patcher box `saved_object_attributes` | Empty description/digest/globalpatchername/tags, `fontsize:13` | S | 2 | 2 | 2 | 2 |
| Comment `numinlets` | saved `1`, local annotation `0` | P | 1 | 1 | 5 | 5 |
| Comment `linecount` | `2` | A | 1 | 1 | 2 | 2 |
| Comment `linecount` | `3` | A | 0 | 0 | 1 | 2 |
| Comment named `style` | `"helpfile_label"` | A | 0 | 0 | 2 | 1 |
| Flonum `format` | `6` | S | 0 | 0 | 0 | 4 |
| Typed scalar arithmetic profile | finite `-100000..100000` output envelope | S | 0 | 0 | 0 | 2 |
| Known helper roles | starter/name/details/arguments, one each | I | 4 | 4 | 4 | 4 |

The eight `saved_object_attributes` records have exactly
`{description:"",digest:"",fontsize:13,globalpatchername:"",tags:""}`.
Do not treat the complete object as empty metadata: its font-size member is
meaningful. The four float `format:6` anchors are Basic `obj-16`, `obj-17`,
`obj-21`, `obj-33`. The two arithmetic profile warnings are Basic `obj-19`
and `obj-23`; those multipliers now import with float numeric mode. These are
the intentional bounded-profile warnings, not the previous integer-creation
typing gap.

The twelve port differences are exclusively comments with saved
`numinlets:1`, `numoutlets:0` and **zero attached source cables**:

| Root | Basic Comment Anchors |
| --- | --- |
| append | `obj-26` |
| prepend | `obj-12` |
| int | `obj-5`, `obj-1`, `obj-23`, `obj-31`, `obj-34` |
| float | `obj-6`, `obj-3`, `obj-1`, `obj-5`, `obj-34` |

Named `helpfile_label` comments are int `obj-31`/`obj-34` and float `obj-34`.
They have no explicit saved font family/size; comment inheritance supplies
size 13, but does not resolve their named style or font family. All other
saved font-bearing Basic text boxes explicitly use size 13; root text objects
use size 12. Icon-only buttons/sliders and the four adapted helper roles do
not establish general font inheritance equivalence.

## Smallest Safe Production Changes

The first useful scope is a **diagnostic policy for the existing exact-source
adapter**, with original synthetic regression fixtures. Keep the source-bound
identity and strict helper/shape/cable checks in
`canvas-help-shell.mjs:27`. Do not add a global ignored-attribute list to
`canvas-max-import.mjs:267` or `canvas-max-import.mjs:184`.

1. **Describe already represented fixed shell metadata.** For a recognized
   shell only, explain `showrootpatcherontab:0`, root `showontab:0`, child
   `showontab:1`, and the exact four verified helper dependencies as
   information-level adapter dispositions. This covers 20 existing warnings
   across the four sources. The message should state the fixed Basic/question
   contract and nonexecution of helpers; it must not claim generic Max tab or
   script/dependency support.
2. **Give exact empty/identity fields an explicit metadata disposition.** For
   these recognized sources, description/digest/tags/template/style empty
   strings and the recorded `originid` values have no example action to
   implement. Information-level records can explain that they are source
   metadata and are not authored runtime fields. This covers 72 current
   warnings. Nonempty strings, arbitrary named styles and a changed source
   must continue to receive generic diagnostics. Keep saved font-size members
   in `saved_object_attributes` separate from this rule.
3. **Describe disabled services as disabled, using a grouped value check.** The
   nine root autosave/OSC records can receive an exact-source informational
   disposition only while all corresponding modes/enable flags stay `0` and
   the listed dormant values match. This covers 36 current warnings; it adds
   no network or autosave implementation. Test each enabling flag/nonmatching
   endpoint as a negative case rather than accepting every `osc*` key.
4. **Explain unused comment connector differences.** The exact twelve comments
   above lose no source route. An information-level record can state that the
   saved unused comment inlet is absent from the local annotation contract.
   Require the no-connected-cables condition and the expected saved port shape;
   a connected comment must retain a warning/error and cannot silently lose a
   cable. Do not invent a native Comment inlet to make a count match.
5. **Make unresolved warnings more specific without reducing severity.** In
   particular, `format:6` is a numeric display-format limit, and editor snap,
   toolbar pinning and cluebar keys are editor policies. Classifying all of
   these as undifferentiated native semantic gaps obscures the actual work.
   Preserve warning severity and explain the responsible surface. Keep the two
   arithmetic finite-profile warnings as semantic limits.

The first four proposals would disposition **140 warnings as explicit info**
if implemented with all guards. They would leave **365 warnings**, not a
complete import. This is a proposed arithmetic accounting, not a new result:
no diagnostic or product change was made in this assessment. Keeping all
records would still yield 521 records, with different severities.

Tests for any future policy should cover the same values in a plain generic
patcher, a changed/unrecognized source, malformed recognition, wrong helper
bytes/shape, unexpected dependency, nonempty metadata, enabled service and
connected comment. Existing tests in `canvas-help-import.test.mjs` already
cover forged/changed inputs and helper isolation; they do not yet cover this
specific metadata disposition. New fixtures should remain original synthetic
data, not copies of licensed help trees.

## Contracts That Remain Unimplemented Or Unqualified

| Remaining Group | Current Warning Records | Why A Blanket Downgrade Is Wrong |
| --- | ---: | --- |
| Editor/chrome/interaction policies | 192 | Grid visibility/spacing/snap, object snap, toolbar/statusbar/cluebar/assistance settings, scrolling and animation are saved user-facing policies. Current canvas controls do not consume them. |
| Fonts/style/layout, including saved patcher attributes | 107 | 63 box font names, 12 patcher font names, 12 patcher font sizes, 9 linecounts, 3 named styles and 8 mixed saved-attribute objects. Existing explicit sizes/inheritance cover part of this, not a named-font/style/linecount model. |
| Normal/default view policies | 60 | Normal fontface, unlocked background, presentation off, unconstrained device width and ordinary object height require deliberate finite policies and verification of initial/future editing behavior. Zero is not automatically proof of equivalence. |
| Float display format | 4 | The retained oracle proves typed float/storage behavior in a finite format6 case, but explicitly does not establish a general display algorithm. Current `canvas-node.mjs:206` uses fixed decimal places. |
| Scalar result envelope | 2 | Native typed multiplication can refuse results outside the finite control envelope; that remains a real difference from Max. |
| Total After The Proposed 140 Dispositions | 365 | All four roots would still require partial admission. |

This report does not authorize reopening completed comment, Print, cable or
help-shell visual polish. It also does not establish a need for another native
object class. Append/prepend are the smaller first behavior scores: their
remaining diagnostics are metadata/editor/layout issues, while their saved
affix chains still need the actual complete-root action matrix in
`after-cables-next-wave.md`. Follow with int/float together for typed storage,
ordered fanout and named send/receive. Static retention, fewer warnings and
class availability cannot substitute for those runtime qualification rows.

Normal Help discovery still opens original bundled demos; this diagnostic
assessment changes neither that route nor source-file protection. Exact-root
qualification and normal Help source selection remain separate work.
