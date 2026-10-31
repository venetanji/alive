"""Cross-check installed journey receipts against the final immutable manifest."""
import json
from pathlib import Path

packet = Path(__file__).resolve().parent
read = lambda name: json.loads((packet / name).read_text())
manifest = read('build/final-9ced05e/source-build-manifest.json')
drop = read('reports/final-9ced05e/device-drop-report.json')
alive = read('reports/final-9ced05e/alive-surface-report.json')
ultra = read('reports/final-9ced05e/ultra-surface-report.json')
install = Path('/home/venetanji/.local/share/alive/builds/9ced05e')
assert manifest['source_commit'] == '9ced05eb38e0620865e4c9401646657669c1f6ae'
assert drop['binary'] == alive['alive']['binary'] == str(install / 'bin/alive')
for name, receipt in [('alive', alive['alive']), ('ultra', ultra['ultra'])]:
    assert receipt['binary'] == str(install / 'bin' / name)
    assert receipt['binary_sha256'] == manifest['artifacts'][name]
    assert receipt['native_library'] == str(install / 'bin/libultra_native.so')
    assert receipt['native_sha256'] == manifest['artifacts']['libultra_native.so']
assert ultra['passed'] and not ultra['ultra']['automatic_keyboard']
assert alive['independence']['unfinished_field_survived_navigation']
assert alive['independence']['accepted_values'] == [122.99, 47]
assert alive['independence']['other_parameters_unchanged']
assert alive['alive']['editor_closed_while_playing']
for receipt in [drop, alive['alive']]:
    assert receipt['stream_errors'] == receipt['rejected_commands'] == 0
    assert receipt['audio']['frames'] > 0 and receipt['audio']['peak'] > .001
for receipt, product in [(alive, 'alive'), (ultra, 'ultra')]:
    layouts = [item for item in receipt['layouts'] if item['product'] == product]
    assert [item['window'] for item in layouts] == [[800, 600], [1280, 800]]
    for layout in layouts:
        width, height = layout['window']
        x, y, w, h = layout['last_after_focus_scroll']
        assert 0 <= x and x + w <= width and 0 <= y and y + h <= height
        assert 'Base:' in layout['ownership']
    for size in [[800, 600], [1280, 800]]:
        assert any(row['requested'] == row['actual'] == size for row in receipt['native_window_sizes'])
assert all(row['wheel_values_unchanged'] for row in ultra['layouts'])
result = {'source_commit': manifest['source_commit'], 'install': str(install),
          'combined_scoped_acceptance_passed': True,
          'scope': ['browser/drop/clip/save/scheduled software PCM',
                    'Alive independent saved values and unfinished draft',
                    'Alive editor closure during software-audio playback',
                    'Alive and Ultra actual 800x600 and 1280x800 saved controls',
                    'actual executable hashes and adjacent frozen native mapping'],
          'receipts': ['reports/final-9ced05e/device-drop-report.json',
                       'reports/final-9ced05e/alive-surface-report.json',
                       'reports/final-9ced05e/ultra-surface-report.json'],
          'initial_final_surface_attempt_exited_nonzero_after_alive_checks': True,
          'ultra_followup_exit_code': 0, 'physical_audio': False,
          'native_hosting_qualified': False, 'source_suites_rerun': False}
print(json.dumps(result, indent=2))
