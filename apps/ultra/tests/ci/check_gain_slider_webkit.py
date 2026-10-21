#!/usr/bin/env python3
"""Render the real gain control in Tauri's Linux WebKitGTK engine.

Run with: xvfb-run -a python3 apps/ultra/tests/ci/check_gain_slider_webkit.py
Requires the system Python GI, GTK 3, WebKit2 4.1 and Cairo packages.
"""

import functools
import http.server
import json
from pathlib import Path
import sys
import threading
import unittest

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("WebKit2", "4.1")
from gi.repository import GLib, Gtk, WebKit2


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class GainSliderWebKitTest(unittest.TestCase):
    def test_fill_grows_up_from_minimum_without_reversing_at_midpoint(self):
        ui = Path(__file__).resolve().parents[2] / "ui"
        handler = functools.partial(QuietHandler, directory=str(ui))
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        window = Gtk.Window()
        window.set_default_size(1500, 1100)
        view = WebKit2.WebView.new_with_context(WebKit2.WebContext.new_ephemeral())
        window.add(view)
        window.show_all()
        self.addCleanup(window.destroy)
        loop = GLib.MainLoop()
        values = iter((0, 64, 127))
        samples, failures = {}, []
        current, geometry = None, None

        def guard(callback):
            def guarded(*args):
                try:
                    return callback(*args)
                except Exception as error:
                    failures.append(error)
                    loop.quit()
                    return False
            return guarded

        @guard
        def snapshot_done(webview, result, _data):
            surface = webview.get_snapshot_finish(result)
            surface.flush()
            scale = surface.get_width() / geometry["viewportWidth"]
            rect = geometry["rect"]
            x = round((rect["x"] + rect["width"] / 2) * scale)
            pixels = surface.get_data()

            def pixel_at(fraction):
                y = round((rect["y"] + rect["height"] * fraction) * scale)
                if not (0 <= x < surface.get_width() and 0 <= y < surface.get_height()):
                    raise AssertionError(f"Gain sample outside the visible snapshot: {(x, y)}")
                offset = y * surface.get_stride() + x * 4
                # Cairo ARGB32 stores native-endian 0xAARRGGBB pixels.
                argb = int.from_bytes(pixels[offset:offset + 4], sys.byteorder)
                return ((argb >> 16) & 255, (argb >> 8) & 255, argb & 255)

            samples[current] = (pixel_at(.3), pixel_at(.7))
            GLib.idle_add(next_value)

        @guard
        def take_snapshot():
            view.get_snapshot(WebKit2.SnapshotRegion.VISIBLE,
                              WebKit2.SnapshotOptions.NONE, None,
                              snapshot_done, None)
            return False

        @guard
        def evaluated(webview, result, _data):
            nonlocal geometry
            geometry = json.loads(webview.evaluate_javascript_finish(result).to_string())
            GLib.timeout_add(120, take_snapshot)

        @guard
        def next_value():
            nonlocal current
            current = next(values, None)
            if current is None:
                loop.quit()
                return False
            script = """(() => {
                if (!document.querySelector('#workspace.locked'))
                    document.querySelector('#lock-patch').click();
                const input = document.querySelector('.gain-input');
                input.scrollIntoView({block: 'center', inline: 'nearest'});
                input.value = %s;
                input.dispatchEvent(new Event('input', {bubbles: true}));
                return JSON.stringify({viewportWidth: innerWidth,
                    rect: input.getBoundingClientRect().toJSON()});
            })()""" % current
            view.evaluate_javascript(script, -1, None, None, None, evaluated, None)
            return False

        def loaded(_view, event):
            if event == WebKit2.LoadEvent.FINISHED:
                GLib.timeout_add(300, next_value)

        def timed_out():
            failures.append(TimeoutError("WebKit gain slider did not finish rendering"))
            loop.quit()
            return False

        timeout = GLib.timeout_add_seconds(20, timed_out)
        self.addCleanup(lambda: GLib.source_remove(timeout))
        view.connect("load-changed", loaded)
        view.load_uri(f"http://127.0.0.1:{server.server_port}/canvas.html")
        loop.run()
        if failures:
            raise failures[0]

        def is_blue(rgb):
            red, green, blue = rgb
            return blue > 150 and blue - red > 30 and blue - green > 5

        filled = {value: tuple(map(is_blue, pixels)) for value, pixels in samples.items()}
        self.assertEqual(filled[0], (False, False), f"minimum must be unfilled: {samples}")
        self.assertEqual(filled[64], (False, True), f"midpoint must fill below the thumb: {samples}")
        self.assertEqual(filled[127], (True, True), f"maximum must fill the track: {samples}")


if __name__ == "__main__":
    unittest.main()
