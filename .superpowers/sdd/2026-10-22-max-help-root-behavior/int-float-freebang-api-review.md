# Automatic Freebang API Review

Date: 2026-10-22. Scope: independent read-only API/design review, following
`int-float-close-api-assessment.md`. No product or harness edits, preparation,
test execution, target launch or predicate change were performed. This note
records documented API conclusions and design limits, not a runtime proof.

The surviving-driver route is the safer documented design. The current proposal
uses the required V8-only API correctly and avoids an assumed channel-name
attribute. No API blocker remains if implementation enforces the identity,
topology and mutation constraints below. Actual automatic delivery remains a
runtime capability gate, and approval of a replacement close conjunction
remains with the parent.

## API Conclusions

- [Maxobj.boxtext](https://docs.cycling74.com/apiref/js/maxobj/#boxtext) is a
  read-only string documented for V8 only. The legacy `js` controller must not
  use it. The owner V8 reader can attest the root route before disposal, while
  the surviving driver V8 observer attests its receiver routes. Both proofs
  must bind to the same private owner/channel/request configuration.
- [send](https://docs.cycling74.com/reference/send/) and
  [receive](https://docs.cycling74.com/reference/receive/) document the channel
  as a creation argument. Their inspected shipped attribute lists provide no
  object-specific `name` attribute. `getattr` reads an existing attribute; its
  presence does not establish that `getattr("name")` is supported here.
- Box text proves actual object text, not a documented read of the receiver's
  internal active name. `receive` supports `set`, so exact V8 text and zero
  receiver input cords alone do not exclude programmatic retargeting. The
  proposed sealed prohibition on `set`, retyping, replacement and all channel
  mutation after creation is necessary, including the interval between
  attestation and disposal. An eligible automatic event then supplies the
  actual delivery observation. The parent selected this construction discipline
  without a prearm challenge; no synthetic traffic is needed for that design.
- [Maxobj.patchcords](https://docs.cycling74.com/apiref/js/maxobj/#patchcords)
  documents `inputs` and `outputs` arrays of
  [MaxobjConnection](https://docs.cycling74.com/apiref/js/maxobjconnection/).
  The documented endpoint fields are `srcobject`, `srcoutlet`, `dstobject`
  and `dstinlet`. These support actual duplicate-sensitive edge inventories.
- Endpoint identity should be resolved through a complete enumerated scope,
  unique harness varnames and exact classes, with each endpoint label required
  to resolve once. Reject missing or duplicate labels and unexpected scopes;
  compare endpoint/port multisets without wrapper equality. In particular, do
  not deduplicate parallel cords before comparing their multiplicity.
- The observer's documented [inlets/outlets declarations](https://docs.cycling74.com/apiref/js/jsthis/)
  and self-report can bind four dedicated inputs and zero outputs to its sealed
  source. Actual cord inventories independently prove no output routes. No
  generic `getattr("numinlets")` or `getattr("numoutlets")` capability was
  established by the inspected object/box references; do not assume one.

## Topology And Lifetime

The owner's root must contain exactly the added `freebang` and `send` in the
expected scope. Require zero incoming freebang cords, precisely one
`freebang:0 -> send:0` edge, precisely that send input, and no send outputs.
The driver must have exactly the mapped receivers and sealed V8 observer:
each receiver has zero input cords and one `receive:0 -> observer:mapped-inlet`
edge, with no additional observer incident routes. All channels and inlet
assignments are checked together. Channels remain finite, unique per
capture/owner/revision, and independent of every original named score bus.
No manual input to freebang or synthetic event injection is allowed.

The [patcher lifecycle guide](https://docs.cycling74.com/userguide/patcher_lifecycle/)
documents children freeing before parents and freebang notification during
freeing. It does not establish a peer-object destruction order that guarantees
a root-local JavaScript sink remains available to record its root's event.
[notifydeleted](https://docs.cycling74.com/apiref/js/jsthis/#notifydeleted)
describes destruction of the JavaScript object itself, not root lifetime.
A root-local sink therefore should not be the sole acceptance witness.

A receiver/observer in the surviving driver avoids that dependency. It must
exist, be verified and monitor before the owner route is connected; retain its
validity and continue monitoring through the final capture barrier. This does
not statically guarantee delivery through the installed runtime's freeing
phase. A missing event refuses the proposed proof; invalid object handles alone
must not replace it. A synchronous event during `dispose` is compatible with
the documented notification and must be ordered after dispatch-start rather
than incorrectly required to follow dispatch-return.

## Proposal Critique And Evidence Binding

The inspected proposal was `int-float-freebang-design.md`, finally frozen at
18794 bytes, SHA-256
`01aa4f0b93cfc850db20dabe5f48415b020d0d7d6313e7c509afc36fe12b3f3d`.
It includes the V8-only distinction, actual route readbacks, channel-mutation
prohibition, declaration/self-report distinction, surviving driver, automatic
provenance restrictions and a separate independent Python gate. These choices
address the API risks above. The parent's bounded-convergence polling policy
is outside this narrow API review. Neither this note nor the proposal supplies
a new runtime observation or automatically approves a lifecycle pass.

The prior close assessment inspected here has SHA-256
`83ec11f0d83e969aa846f67d9d5cc85113e08626bb3f930c457a0fa5986674e1`.
Official API HTML was checked directly on 2026-10-22; only conclusions and
hashes are recorded here. Source-bearing documentation text and source helper
contents were not copied into this note.

| Reference | SHA-256 |
| --- | --- |
| Official Maxobj API HTML | `32427ae324988475bd624fdb8471da8fec38c7f1aefa9c4eb14720b932cecb77` |
| Official MaxobjConnection API HTML | `f43f0214ff539536df27005dbb558d5727368cd185070b828c0a0750ef97e3ef` |
| Official jsthis API HTML | `21992a6941482fed581c931e95c4409030a174e6844a2cb00c850fd75d13611e` |
| Official send reference HTML | `5974bea3d8193712330e3d857ec994fabc1c991b9c0f5fe73a368eb3df834a7f` |
| Official receive reference HTML | `b0bbb43b789314cd1aeaec5fdfb84e487738b66d1a7aeed50aca4ecdbdee2b27` |
| Shipped send reference XML | `b4883d20eb847abcdd89c37666bb545282f1282318a0cd4da0cc29be5f954a73` |
| Shipped receive reference XML | `360289408f81a609674a25a189f7567b33cd1810ad5c23169ad9ce888ad550dd` |
| Shipped freebang reference XML | `9da88e2866ff092263728e9c8b148653fef8b62edf43edc5affe330e7054ad58` |
| Shipped lifecycle guide JSON | `1ec9527db7cdd1be2f5abc462270610e8a9afae5ba6a14360e3dc8dcc84bfd1b` |
