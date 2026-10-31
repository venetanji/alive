# Clip View Layout Evidence

These are unmodified private Xvfb/Tauri/WebKit captures of the Alive layout
from product source commit `4ffee6d`. The native app used real XTest input,
the existing native library and a private software-audio session. The audio
clip loads a prepared local stereo WAV; playback and physical audio were not
tested in this layout check.

| View | 800x600 | 1280x800 |
| --- | --- | --- |
| MIDI | `midi-800x600.png` | `midi-1280x800.png` |
| Audio | `audio-800x600.png` | `audio-1280x800.png` |

`clip-layout-report.json` records the native bounds, executable SHA-256 and
adjacent-library mapping. The private XDG directory has no user library, so
the browser reports that its temporary user-library root is unavailable; this
is a test-environment observation. The retained Live reference screenshots are
identified separately in `docs/ALIVE_CLIP_VIEW_FEATURE_MAP.md`.

The browser suites previously passed 15 clip-region and 111 Session/Arrangement
checks; the latter ran before a final label-only refinement. Fresh verification
before publication passed all 662 UI Node tests and the three affected browser
layout/source-action tests. The installed preview uses these same product
source bytes; its source snapshot and build manifest remain under
`/home/venetanji/.cache/alive-verification/clip-view-live/` and the versioned
local installation respectively. This evidence does not establish support for
the future features listed in the feature map.
