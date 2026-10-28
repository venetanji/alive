"""GI-free tests of the actual desktop measurement adapter."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from desktop_sustained import DesktopSustained
from sustained_measurement import ProcessDisappeared
from test_sustained_measurement import diagnostics


class UI:
    pid = 123
    def __init__(self, output): self.output = output


class DesktopSustainedIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.driver = DesktopSustained(UI(Path(self.tmp.name)), None, None, None)

    def test_real_adapter_feeds_diagnostics_and_transport_to_collector(self):
        import json
        values = {'Stream diagnostics': json.dumps(diagnostics()), 'Transport playing': 'true', 'Absolute frame': '48000'}
        self.driver.accessible = values.get
        with patch('pathlib.Path.read_text', return_value='123 (alive) S 1'):
            self.driver.observe()
        self.assertEqual(self.driver.epochs.cursor, 1)
        self.assertEqual(self.driver.playing.last[1], True)

    def test_confirmed_process_disappearance_is_latched(self):
        with patch('pathlib.Path.read_text', side_effect=FileNotFoundError):
            with self.assertRaises(ProcessDisappeared): self.driver.observe()
        with self.assertRaises(ProcessDisappeared): self.driver.observe()

    def test_accessible_reference_is_reused_and_replaced_after_stale_read(self):
        class Stale(Exception): pass
        class Node:
            def __init__(self, text): self.text = text
            def get_name(self): return 'Stream diagnostics'
            def get_interfaces(self): return ['Text']
        class Text:
            @staticmethod
            def get_text(node, _start, _end):
                if node.text is None: raise Stale()
                return node.text
        class Atspi: pass
        class GLib: pass
        Atspi.Text, GLib.Error = Text, Stale
        class Windows:
            def __init__(self): self.calls = 0
            def app_frames(self): self.calls += 1; return [object()]
        class FakeUI(UI):
            node = Node('first')
            def walk(self, _frame): return iter([self.node])
        ui, windows = FakeUI(Path(self.tmp.name)), Windows()
        driver = DesktopSustained(ui, windows, Atspi, GLib)
        self.assertEqual(driver.accessible('Stream diagnostics'), 'first')
        self.assertEqual(driver.accessible('Stream diagnostics'), 'first')
        self.assertEqual(windows.calls, 1)
        ui.node.text = None
        ui.node = Node('replacement')
        self.assertEqual(driver.accessible('Stream diagnostics'), 'replacement')
        self.assertEqual(windows.calls, 2)
        ui.node.text = ''
        ui.node = Node('fresh after empty')
        self.assertEqual(driver.accessible('Stream diagnostics'), 'fresh after empty')
        self.assertEqual(windows.calls, 3)

    def test_defunct_diagnostics_without_replacement_breaks_playing_continuity(self):
        import json
        class Stale(Exception): pass
        class Node:
            def __init__(self, name, text): self.name, self.text = name, text
            def get_name(self): return self.name
            def get_interfaces(self): return ['Text']
        class Text:
            @staticmethod
            def get_text(node, _start, _end):
                if node.text is None: raise Stale()
                return node.text
        class Atspi: pass
        class GLib: pass
        Atspi.Text, GLib.Error = Text, Stale
        class Windows:
            def app_frames(self): return [object()]
        class FakeUI(UI):
            def walk(self, _frame): return iter(self.nodes)
        ui = FakeUI(Path(self.tmp.name))
        diagnostic = Node('Stream diagnostics', json.dumps(diagnostics()))
        ui.nodes = [diagnostic, Node('Transport playing', 'true'), Node('Absolute frame', '0')]
        driver = DesktopSustained(ui, Windows(), Atspi, GLib)
        with patch('pathlib.Path.read_text', return_value='123 (alive) S 1'):
            driver.observe()
            self.assertIsNotNone(driver.playing.last)
            diagnostic.text = None
            ui.nodes.remove(diagnostic)
            driver.observe()
        self.assertIsNone(driver.playing.last)
        self.assertIsNone(driver.accessible('Stream diagnostics'))

    def test_defunct_handle_is_not_reused_even_if_it_returns_text(self):
        class State:
            def __init__(self, node): self.node = node
            def contains(self, _state): return self.node.defunct
        class Node:
            def __init__(self, text): self.text, self.defunct = text, False
            def get_name(self): return 'Absolute frame'
            def get_interfaces(self): return ['Text']
            def get_state_set(self): return State(self)
        class Text:
            @staticmethod
            def get_text(node, _start, _end): return node.text
        class Atspi:
            class StateType: DEFUNCT = 'defunct'
        class GLib: Error = RuntimeError
        Atspi.Text = Text
        class Windows:
            def app_frames(self): return [object()]
        class FakeUI(UI):
            def walk(self, _frame): return iter([self.node])
        ui = FakeUI(Path(self.tmp.name))
        ui.node = Node('100')
        driver = DesktopSustained(ui, Windows(), Atspi, GLib)
        self.assertEqual(driver.accessible('Absolute frame'), '100')
        ui.node.defunct = True
        ui.node = Node('200')
        self.assertEqual(driver.accessible('Absolute frame'), '200')


    def test_install_brackets_real_ui_action_and_cleanup_restores_hooks(self):
        events = []
        class FakeUI(UI):
            def click(self, name): events.append(('click', name))
            def text(self, name, value): events.append(('text', name, value))
            def keys(self, key): events.append(('keys', key))
        class FakeThread:
            def __init__(self, **kwargs): pass
            def start(self): events.append(('sampler_started',))
            def join(self, timeout): events.append(('sampler_joined',))
            def is_alive(self): return False
        import time
        original_sleep = time.sleep
        ui = FakeUI(Path(self.tmp.name))
        driver = DesktopSustained(ui, None, None, None)
        driver.observer.read = lambda: (diagnostics(), 'true', '0')
        original_click = ui.click
        with patch('desktop_sustained.threading.Thread', FakeThread):
            try:
                driver.install()
                ui.click('Seek transport')
                self.assertEqual(driver.measure.action_ordinal, 1)
                self.assertEqual(driver.epochs.cursor, 1)
                self.assertIn(('click', 'Seek transport'), events)
            finally:
                driver.cleanup()
        self.assertEqual(ui.click, original_click)
        self.assertIs(time.sleep, original_sleep)
        self.assertIn(('sampler_joined',), events)

    def test_short_sleeps_do_not_insert_reads_between_native_clicks(self):
        class Clock:
            now = 0.
            def monotonic(self): return self.now
            def sleep(self, seconds): self.now += seconds
        class FakeUI(UI):
            def click(self, _name): pass
            def text(self, _name, _value): pass
            def keys(self, _key): pass
        class FakeThread:
            def __init__(self, **_kwargs): pass
            def start(self): pass
            def join(self, timeout): pass
            def is_alive(self): return False
        clock, reads = Clock(), []
        with patch('desktop_sustained.time', clock), patch('desktop_sustained.threading.Thread', FakeThread):
            driver = DesktopSustained(FakeUI(Path(self.tmp.name)), None, None, None)
            def read():
                reads.append(clock.now)
                return diagnostics(), 'true', str(int(clock.now * 48000))
            driver.observer.read = read
            driver.observe()
            try:
                driver.install()
                clock.sleep(.07); clock.sleep(.07)
                self.assertEqual(len(reads), 1)
                clock.sleep(2.1)
                self.assertGreaterEqual(len(reads), 3)
            finally:
                driver.cleanup()

    def test_resource_sampling_continues_while_ui_action_waits(self):
        import threading
        blocking, sampled, release = threading.Event(), threading.Event(), threading.Event()
        class FakeUI(UI):
            def click(self, _name):
                blocking.set()
                if not release.wait(4): raise RuntimeError('fixture release timed out')
            def text(self, _name, _value): pass
            def keys(self, _key): pass
        class FakeSampler:
            def __init__(self, _pid): pass
        class FakeGroups:
            def __init__(self, **_groups): pass
            def sample(self):
                if blocking.is_set(): sampled.set()
                return {'app': None, 'sampler_capture_overhead': None, 'private_audio_server': None}
        driver = DesktopSustained(FakeUI(Path(self.tmp.name)), None, None, None)
        driver.observer.read = lambda: (diagnostics(), 'true', '0')
        result = []
        def unblock():
            blocking.wait(2)
            result.append(sampled.wait(2))
            release.set()
        helper = threading.Thread(target=unblock)
        with patch('desktop_sustained.ProcessSampler', FakeSampler), patch('desktop_sustained.ProcessGroups', FakeGroups):
            try:
                driver.install()
                helper.start()
                driver.ui.click('long UI action')
            finally:
                release.set()
                helper.join(timeout=5)
                driver.cleanup()
        self.assertEqual(result, [True], 'resource sampler was blocked by the UI action')
        import json
        rows = [json.loads(line) for line in driver.resource_log.path.read_text().splitlines()]
        self.assertTrue(rows)
        for row in rows:
            self.assertGreaterEqual(row['monotonic'], row['sampling_started'])
            self.assertAlmostEqual(row['sampling_duration'], row['monotonic'] - row['sampling_started'])
            self.assertAlmostEqual(row['sampling_delay'], max(0, row['sampling_started'] - row['scheduled_monotonic']))

    def test_exited_recorder_and_sampler_fail_health(self):
        class Process:
            def poll(self): return 1
        class Capture:
            process = Process()
        self.driver.capture = (Capture(), Path('capture'))
        with self.assertRaisesRegex(RuntimeError, 'recorder supervisor'):
            self.driver.health()
        self.driver.finishing_capture = True
        self.driver.health()
        self.driver.finishing_capture = False
        self.driver.capture = None
        self.driver.errors.append(ValueError('sampler'))
        with self.assertRaisesRegex(RuntimeError, 'resource sampler') as caught:
            self.driver.health()
        self.assertEqual(str(caught.exception.__cause__), 'sampler')
