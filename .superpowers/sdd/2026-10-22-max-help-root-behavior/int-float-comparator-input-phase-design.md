# Numeric Comparator Input Phase Correction

Capture012 completes all54 operations,102 checkpoints and612 numeric states.
Both revision1 owner closes and barrier157 are independently accepted by the
runner. The unchanged strict comparator produces int-float-comparison-012.json
with all endpoint values, numeric states, Message prototypes and21 destination
output orders matching, zero unknown numeric tags, and exit1 solely because
native_only_destination_inputs_ordered is false for all21 pairs.

Root and an independent worker inspect the retained trace and identify a phase
error in destination_pair: it requires the button message to be bang for both
input and output phases. Actual native input delivery sends the same typed
numeric message to the numeric control and then the button. The button emits
bang only at its output. E08 input ordinals6/8 carry int0; outputs7/9 carry
int0/bang. E19 input8/10 carries float0; outputs9/11 carry float0/bang.
The existing synthetic fixture copies output messages into input receipts and
therefore invents button bang input. This is a checker/fixture defect; the
retained traces do not establish a product scheduling defect.

## Scope And Predicates

Authorize a new comparator revision in compare-int-float.py and its original
test-compare-int-float.py only, plus reports/docs. This follows execution of the
previously pinned comparator unchanged; preserve that failed result and log.
Archive both previous source files privately before editing. Preserve score,
native run, Max capture, all source/capability/cleanup/coverage/value/tag/schema
gates, public fields and whole-help qualification count. No product change,
capture rerun, source normalization or waived gate.

For native input phase, require exactly one port0 input at each exact
document/anchor, a typed scalar numeric message matching int or float, equal
complete numeric messages at both destinations, and numeric ordinal strictly
before button ordinal. Reversed order, duplicate/missing inputs, changed value,
selector, tag, destination, port, or button bang must fail the input gate.
Existing input validation continues to reject malformed/nonfinite messages.

For native output and reference receipt phases retain the existing rule:
exactly one typed numeric output and one zero-atom bang output, numeric strictly
before button. Preserve the final all_comparison_gates_pass conjunction.

## Verification

TDD first corrects the synthetic input fixture to real numeric delivery and
demonstrates failure under the original comparator. Cover both scalar modes,
negative/fractional values, exact input message agreement, all refusal cases,
and unchanged output/order/endpoint/capability gates. Keep actual capture data
out of committed fixtures. Run the complete comparator suite and syntax checks,
freeze both sources, and obtain independent review before parent reruns the
same retained complete capture against unchanged native/score inputs.

The corrected comparison uses a new exclusive output name
int-float-comparison-012-input-phase-001.json; it never replaces the historical
failed comparison012. Bind old/new comparator hashes and all input hashes in
the correction report and verification index. Even a corrected finite pass
adds zero installed-help qualifications; physical, view, saved-authoring,
saved-order and visual/metadata gates remain separate.
