# WAV Workflow Reference

LOCAL-AUDIO-R1, observed 2026-10-26 in Live 12.4.6 Suite on Wine 11.13.
This bounded study informs the existing WAV implementation task after MIDI
Arrangement acceptance. It does not qualify Alive audio playback or timing.
Original screenshots, projects and application artifacts remain private.

## Observed Actions And Results

| Action | Settled result | Implication for Alive |
| --- | --- | --- |
| Import an original mono PCM16/48 kHz WAV into Arrangement | A waveform and sample-format header appear. Saved placement spans beats 4..12, with a separate external file reference and 192000 source frames. | Show actual decoded waveform data and distinguish source frames from placement beats. |
| Disable Warp, then move the occurrence | Moving from beats 4..12 to 20..28 retains source seconds 0..4 and file identity. | Moving a placement must preserve the source offset and content. |
| Trim the left edge | Placement becomes beats 24..28; source start advances to two seconds while the global end stays fixed. | Test left-edge position and source-offset arithmetic together. |
| Undo the trim | Settled UI restores the left edge and source start. An immediate saved snapshot was stale and is excluded. | Verify accepted state after undo, not merely delivery of the shortcut. |
| Enable Warp and Loop, then extend the right edge | Placement extends to beats 20..44 with repeated waveform; source loop stays eight beats. Later saved state corroborates undo restoring 20..28. | Draw bounded waveform repetitions from real source data. Alive's approved direct-PCM looping deliberately does not implement Warp. |
| Copy the mono occurrence into Session | Session and Arrangement clips coexist with separate clip IDs referencing the same file. | Both views need coherent source and occurrence selection. This observation does not establish shared edit identity in Live. |
| Import unequal stereo into Session | Two waveforms and a 48 kHz/16-bit/two-channel header appear. | Preserve and prove mono/stereo channel behavior. |
| Save and Quit | Saved state retains both clip collections, paths and source lengths. Ordinary Save leaves external WAV files external. | Portable Alive save needs an explicit tested collection policy, rather than assuming Save copies dependencies. |

Live disables Loop when Warp is off in this study. That is an observed reference
restriction, not a reason to add time stretching or change Alive's accepted
direct-PCM suffix-loop contract. Initial misses and unsettled frames are retained
privately and excluded from these results. No running transport, audible output,
sample correctness or latency measurement was established.

## Recovery Gap And Documentation Fallback

Process-restart restoration and missing-source recovery remain unobserved.
The disposable application's updater changed its executable during Quit. A
prelaunch digest guard refused that changed target. One restoration from the
verified source copy matched the pinned digest, but the subsequent bounded
launch attempt produced no window and its process exited; cause unknown.
The study stopped without further repair or a missing-source experiment.
The user's original-prefix executable was only read at the end and differed
from the pinned study copy; without a starting digest its change time cannot
be established. Original/source preference digests match before and after.

The official [Live 12 manual, Managing Files and Sets](https://www.ableton.com/en/manual/managing-files-and-sets/)
sections 5.6 and 5.7 provide documentation fallback: missing samples display
Offline and a status warning; File Manager supports replacement by dragging
and automatic search; collection copies external samples into the project.
These are documented behaviors, not runtime observations from this study.
Alive must independently demonstrate useful missing/incompatible-file errors,
transactional preservation and portable reopen in its native acceptance journey.

## Evidence Attribution

The identified executable SHA-256 is
`fdc11a99a6a02c715115ed028becc29c1a2e3b67604ca99e22a81bbfd9d96c6e`.
REA lifecycle evidence is
`ev_827b591a2ab5339361c5737c8c7990c023401d445662f6bffdb29e789a032e84`;
it establishes process lifecycle, not semantic UI actions. Timestamped actions,
settled frames and saved-project inventories establish the findings above.
The private manifest contains 113 independently hash-verified artifacts;
its SHA-256 is
`e6f4bac531c4a8ea2eafde914b02743f9eed35c8471945f7a1425a5f80693e5f`.
Cleanup records no owned processes, an exited private Xvfb and removed disposable
prefix. No proprietary assets are included with this derived report.
