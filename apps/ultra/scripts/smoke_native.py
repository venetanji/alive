#!/usr/bin/env python3
"""Load the actual packaged engine ABI and exercise an offline CPAL-shaped callback."""
import ctypes as c
import math
from pathlib import Path
import sys

library = c.CDLL(str(Path(sys.argv[1]).resolve()))
library.ultra_external_start.restype = c.c_int
library.ultra_external_render.argtypes = [c.c_uint, c.POINTER(c.c_float), c.POINTER(c.c_float)]
library.ultra_external_render.restype = c.c_int
library.ultra_audio_event.argtypes = [c.c_uint] * 4
library.ultra_audio_event.restype = c.c_int
library.ultra_audio_flags.restype = c.c_uint
library.ultra_audio_routes.argtypes = [c.c_uint]
library.ultra_audio_routes.restype = None
library.ultra_audio_stop.restype = None
library.ultra_audio_panic.restype = None
try:
    library.ultra_audio_routes(1)
    assert library.ultra_external_start() == 1, 'Engine failed to initialize'
    assert library.ultra_audio_event(0, 0, 60, 100) == 1, 'Note-on rejected'
    peak = 0.0
    # This is an offline ABI smoke test, not a physical device or MIDI latency test.
    for count in (1, 31, 64, 127, 512, 1024):
        left, right = (c.c_float * count)(), (c.c_float * count)()
        assert library.ultra_external_render(count, left, right) == 1, 'Callback fault'
        peak = max(peak, *(abs(x) for x in [*left, *right]))
        assert all(math.isfinite(x) for x in [*left, *right]), 'Non-finite output'
    assert peak > 0.001, 'Faust voice produced no audible output'
    assert library.ultra_audio_event(0, 1, 60, 0) == 1, 'Note-off rejected'
    for _ in range(10):
        left, right = (c.c_float * 512)(), (c.c_float * 512)()
        assert library.ultra_external_render(512, left, right) == 1
    assert max(abs(x) for x in [*left, *right]) < 1e-6, 'Note did not terminate'
    library.ultra_audio_panic()
    library.ultra_audio_stop()
    assert library.ultra_external_start() == 1, 'Restart failed'
finally:
    library.ultra_audio_stop()
print('Native shared library loaded; finite callback output and stop/restart passed')
