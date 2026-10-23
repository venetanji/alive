# Int/float close API assessment

Date: 2026-10-22. Scope: official Max JavaScript/reference documentation and
shipped reference documentation; no runtime experiment or controller change.

No documented top-level `Patcher.valid` property or enumeration of every loaded
root, including hidden roots, was found in the inspected API surfaces. This is
a bounded negative finding about those documented surfaces, not a claim about
every native SDK or internal facility. There is a documented patcher-free
notification, `freebang`, which would require separate instrumentation and
captured evidence.

## Supported API facts

- [Maxobj.valid](https://docs.cycling74.com/apiref/js/maxobj/) is a read-only
  boolean. The reference explicitly says an underlying Max object can be freed
  and that `valid` can test this condition.
- The [Patcher API](https://docs.cycling74.com/apiref/js/patcher/) documents no
  corresponding lifetime boolean. `box` returns the containing `Maxobj` **if
  the patcher is a subpatcher**; it does not supply a documented top-level
  owner handle. `parentpatcher` and `parentclass` describe parent topology,
  not lifetime. Object traversal and `apply` methods operate inside a known
  patcher tree.
- [Max.frontpatcher](https://docs.cycling74.com/apiref/js/max/) returns the
  frontmost patcher window, or nil if no patcher window is visible.
  [Wind.next](https://docs.cycling74.com/apiref/js/wind/) explicitly traverses
  patchers visible in the application's window list. Neither establishes
  absence of hidden loaded roots. The documented Max property/method index
  and [Controlling Max with Messages](https://docs.cycling74.com/userguide/controlling_max_with_messages/)
  supply no all-roots enumeration; `openfile`/`closefile` concern a separately
  named file opened by that mechanism.
- [thispatcher dispose](https://docs.cycling74.com/reference/thispatcher/)
  says: "*USE AT YOUR OWN RISK* - Closes the patcher or destroys the subpatcher
  that the thispatcher object is contained in." This documents the action,
  not a postcondition query. The shipped `thispatcher.maxref.xml` agrees.

## Destruction notifications

[freebang](https://docs.cycling74.com/reference/freebang/) is documented to
output a bang automatically "when the patcher is freed." The
[patcher lifecycle guide](https://docs.cycling74.com/userguide/patcher_lifecycle/)
describes subpatchers freeing before parents, followed by freeing objects and
the corresponding `freebang` outputs. These references do not limit this
notification to subpatchers. In contrast,
[closebang](https://docs.cycling74.com/reference/closebang/) reports a patcher
**window** closing. [jsthis.notifydeleted](https://docs.cycling74.com/apiref/js/jsthis/)
reports the `js`/`jsui` object being freed, not the top-level root's lifetime.

An automatically emitted, captured `freebang` from a positively bound owner
would be documented evidence of that patcher's freeing phase. A manual bang
can also fire `freebang`, so provenance matters. This is prospective
instrumentation; this assessment supplies no such observation for capture 004
or 005, and it cannot enumerate unrelated or hidden roots.

## Limits for the pending close ruling

If every retained original Basic-object handle plus the reader and disposer
becomes invalid after `dispose`, the documented `Maxobj.valid` semantics
support that those specific objects have been freed. Source/profile/path and
ownership binding must establish which objects those handles represented.
Even exhaustive invalidation of these retained handles does not logically
exclude an empty root shell or another hidden root. A missing or `undefined`
`Patcher.valid` is not a false lifetime result and must not count as destruction
evidence. Visible-window absence alone does not close that gap either.

Capture006 now retains all31 complete bound snapshots. Root.valid is undefined
throughout; reader/disposer and all23 original Basic handles change1->0.
This confirms the unavailable property, without establishing top-level absence.
This assessment does not change or approve a replacement for the existing
close conjunction. The automatic freebang witness remains design work.

## Reference preservation

Official pages were retrieved directly on 2026-10-22; parsed text is cached in
`/tmp/alive-max-close-api-docs-4hernx2k`. Shipped documentation was independently
checked under the installed Max `resources/docs` directory. Relevant shipped
SHA-256 digests: `freebang.maxref.xml`
`9da88e2866ff092263728e9c8b148653fef8b62edf43edc5affe330e7054ad58`;
`closebang.maxref.xml`
`c5178d4b359c426f092e3eb9559d6e33e3d12d9ed1118474607b0b399a1c1856`;
`patcher_lifecycle.json`
`1ec9527db7cdd1be2f5abc462270610e8a9afae5ba6a14360e3dc8dcc84bfd1b`.
