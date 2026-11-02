#!/usr/bin/env python3
"""Check compact Alive option text in the native Linux renderer."""
import functools
import http.server
import json
from pathlib import Path
import sys
import threading
import unittest

import gi
gi.require_version('Gtk', '3.0')
gi.require_version('WebKit2', '4.1')
from gi.repository import GLib, Gtk, WebKit2


class AliveSelectWebKitTest(unittest.TestCase):
    def test_compact_option_has_the_same_visible_glyph_height_as_ordinary_text(self):
        ui = Path(__file__).resolve().parents[2] / 'ui'
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ui))
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        window = Gtk.Window()
        window.set_default_size(800, 600)
        view = WebKit2.WebView.new_with_context(WebKit2.WebContext.new_ephemeral())
        window.add(view)
        window.show_all()
        self.addCleanup(window.destroy)
        loop = GLib.MainLoop()
        failures, result = [], {}

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
        def snapshot_done(webview, response, _data):
            surface = webview.get_snapshot_finish(response)
            surface.flush()
            pixels, stride = surface.get_data(), surface.get_stride()
            for key, rect in result.items():
                rows = []
                # Exclude the select border and arrow; inspect only its label.
                for y in range(round(rect['y']) + 2, round(rect['bottom']) - 2):
                    for x in range(round(rect['x']) + 7, round(rect['x']) + 40):
                        offset = y * stride + x * 4
                        argb = int.from_bytes(pixels[offset:offset + 4], sys.byteorder)
                        if min((argb >> 16) & 255, (argb >> 8) & 255, argb & 255) > 150:
                            rows.append(y)
                            break
                rect['ink_rows'] = len(rows)
            loop.quit()

        @guard
        def evaluated(webview, response, _data):
            result.update(json.loads(webview.evaluate_javascript_finish(response).to_string()))
            view.get_snapshot(WebKit2.SnapshotRegion.VISIBLE, WebKit2.SnapshotOptions.NONE,
                              None, snapshot_done, None)

        @guard
        def inspect():
            view.evaluate_javascript("JSON.stringify(Object.fromEntries(['option-control','reference'].map(id=>[id,document.getElementById(id).getBoundingClientRect().toJSON()])))",
                                     -1, None, None, None, evaluated, None)
            return False

        def loaded(_view, event):
            if event == WebKit2.LoadEvent.FINISHED:
                GLib.timeout_add(200, inspect)

        def timed_out():
            failures.append(TimeoutError('Native option text did not finish rendering'))
            loop.quit()
            return False

        timeout = GLib.timeout_add_seconds(20, timed_out)
        self.addCleanup(lambda: GLib.source_remove(timeout))
        view.connect('load-changed', loaded)
        view.load_html('''<!doctype html><html><head>
          <link rel="stylesheet" href="alive.css"><link rel="stylesheet" href="alive-shell.css">
          <link rel="stylesheet" href="alive-piano.css"><link rel="stylesheet" href="alive-ui-contract.css">
          </head><body><div class="clip-properties"><div class="clip-launch-settings">
          <label>Launch Quantization<select id="option-control"><option>Global</option></select></label>
          <label><span id="reference" style="display:block;height:20px;padding:1px 5px">Global</span></label>
          </div></div></body></html>''', f'http://127.0.0.1:{server.server_port}/')
        loop.run()
        if failures:
            raise failures[0]
        self.assertGreaterEqual(result['reference']['ink_rows'], 7, result)
        self.assertGreaterEqual(result['option-control']['ink_rows'],
                                result['reference']['ink_rows'] - 1, result)


if __name__ == '__main__':
    unittest.main()
