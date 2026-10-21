# Object entry argument and option assistance

Reference: installed Max 9.1.5 user guide, `objects.json`, sections Autocomplete,
Arguments and Attributes, inspected on 2026-10-21. The guide describes matching
object names during text entry, optional positional initialization arguments,
and named attributes introduced by `@`. This is documentation evidence; no new
live Max autocomplete session was captured for this change.

Ultra now shows supported object signatures, the argument at the caret, numeric
ranges/defaults, and named choices for enumerated parameters. `@` lists only
the numeric creation parameters in Ultra's authoritative registry. These are
Ultra option names and bounds, not a claim of Max attribute compatibility.
`metro @interval 250` is equivalent to `metro 250`. Message boxes retain their
literal bang / numeric-list grammar; arbitrary symbols and attributes are not
accepted there.

Tab and pointer selection replace the current token, preserving following text.
Enter keeps the author's typed parameter values. Invalid options and out-of-range
values use the existing atomic validation path. Browser checks cover these
behaviors and narrow viewport geometry; they do not establish native audio or
Max semantic equivalence.
