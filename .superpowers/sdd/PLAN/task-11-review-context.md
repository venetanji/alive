# Task 11 Review Context

Supplement to the task brief, exact interface design, preflight and forthcoming
implementation report/diff. This is not a verdict or a replacement for those
requirements. Review spec compliance and quality independently; report concrete
Critical/Important findings and cross-task CannotVerify items with references.

Binding task constraints, copied from the plan/spec:

> Append one fixed v3 C ABI with storage for eight tracks, sixteen devices and
> 32 clips (four slots per track), initially admitting only two tracks/six
> devices. Preserve v1/v2 layouts, semantics and tests through common helpers;
> old state getters reject without writing if a larger state is unrepresentable.
> Keep 1024 stored events, 32/frame, 64/1024 frames, sixteen roots, two effects per
> track and the 64-command snapshot. Structural array size is not admitted audio
> capacity. No new DSP engine or per-clip device instance.

> Stop retains its reserved capacity and epoch guarantees.

> Prospective native admission covers every selectable clip combination and
> outgoing/incoming splice, including global seams, partial bars and short empty
> loops. Bound reset/chase/parameter/control work separately from stored events.
> Repeated seeks/restarts cannot bypass absolute-frame rolling dispatch/work
> guards; reject optional overload while reserving unconditional termination.

> Compile/prepare/load/destroy devices outside the audio callback. Bound voices,
> scheduled events, automation and command work. No callback allocation, blocking
> locks or synchronous UI dependency.

> Keep device instances independent and editor lifetime separate from DSP lifetime.

Concrete task-specific risks for focused review:

- Native structural and prepared-graph validation must enforce the actual
  measured graph/work profile; caller-provided descriptors cannot certify
  arbitrary graphs. Authored initial values and routes as well as manifest
  bindings matter to dormant control/timer activation. Actual saved PR4
  instrument and both saved effects must remain supported.
- A single shared runtime must preserve legacy adapters while v3 owns its
  per-track phase, automation masks, quantization and frame order. Check
  coalesced transitions and phase-zero dispatch, including global/clip seams.
- Scheduled and optional ledgers have separate bounds as well as combined
  bounds. Absolute-frame history survives transport discontinuities.
  Effective unscheduled transitions use the prospective horizon; admitted
  scheduled playback and no-op START have their specified distinct behavior.
- Landing-cursor reconstruction and strict-prefix chase must share the one
  charged scan. Candidate preview reads, including refused optional batches,
  need an explicit bound and measured accounting; test tracing must describe
  work actually performed rather than only increment an intended charge.
- Stop mailbox ordering, old command epochs, receipt reservation reuse and
  coherent publication interact across producer/callback boundaries. Read
  the exact design/preflight semantics rather than infer queue success means
  execution. Invalid output headers and unrepresentable legacy projections
  preserve output memory.
- Measurement evidence must include actual admitted Faust graphs and full
  reset/control/chase/publication/emergency work. Duration observations do not
  establish physical deadlines, scheduling lateness or eight-track capacity.

Cross-task state: current desktop/session format remains v2 until Task 12.
Pushed checkpoint d1f8a66 passes both UI jobs but its native desktop walkthrough
fails after a synthetic chain-reorder click; diagnosis and a serialized
harness correction are separately tracked in ci-d1f8a66-reorder-diagnosis.md.
The original missing-control assertion remains valid. Parent owns final CI,
package/native interface qualification and the eventual 1800-playing-second
soak. Task 11 local evidence must be assessed on its own exact sources/results.
