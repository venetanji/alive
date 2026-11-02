#!/usr/bin/env python3
"""Check the closed companion through an actual shared-library boundary."""
import ctypes
import sys


class Limits(ctypes.Structure):
    _fields_ = [(name, ctypes.c_uint32) for name in (
        'version', 'struct_bytes', 'workspace_profile', 'features',
        'native_policy', 'max_native_roots', 'held_keys', 'midi_records_per_sample',
        'emergency_note_records', 'supported_native_features', 'reserved0', 'reserved1')]


library = ctypes.CDLL(sys.argv[1])
names = ('alive_session_note_limits_v1', 'alive_session_validate_prepared_notes_v1',
         'alive_session_configure_notes_v1')
missing = [name for name in names if not hasattr(library, name)]
assert not missing, f'missing note companion exports: {missing}'
limits = getattr(library, names[0])
limits.argtypes = [ctypes.c_uint32, ctypes.POINTER(Limits)]
limits.restype = ctypes.c_int
assert ctypes.sizeof(Limits) == 48
for profile in (1, 2):
    value = Limits(1, 48)
    assert limits(profile, ctypes.byref(value)) == 0
    assert value.workspace_profile == profile
    assert value.features == value.max_native_roots == value.supported_native_features == 0
    assert (value.native_policy, value.held_keys, value.midi_records_per_sample,
            value.emergency_note_records) == (1, 4, 16, 4)
    assert value.reserved0 == value.reserved1 == 0
assert limits(1, None) == 1
bad = Limits(1, 47)
assert limits(1, ctypes.byref(bad)) == 1
assert limits(99, ctypes.byref(Limits(1, 48))) == 2
print('PASS: three C exports, exact 48-byte limits, explicit statuses, native admission closed')
