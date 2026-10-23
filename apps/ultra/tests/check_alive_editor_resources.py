#!/usr/bin/env python3
"""Bound editor reopen resources in the actual private Linux desktop harness."""
import json
from pathlib import Path
import time

import check_alive_desktop as alive


def run():
    alive.windows.focus(alive.MAIN)
    alive.ui.wait_for('Start transport')
    alive.ui.click('Audio details')
    alive.transport('start')
    samples = []

    def observe(action):
        sample = alive.process_sample()
        sample['action'] = action
        sample['web_processes'] = 0
        for pid in sample['pids']:
            try:
                sample['web_processes'] += Path(f'/proc/{pid}/comm').read_text().strip() == 'WebKitWebProces'
            except OSError:
                pass
        samples.append(sample)
        (alive.ui.output / 'editor-resources.json').write_text(json.dumps(samples, indent=2))
        print(json.dumps(sample), flush=True)

    observe('before editors')
    for cycle in range(8):
        alive.editor_edit(900 + cycle * 10)
        time.sleep(1)
        alive.log(f'editor resource cycle {cycle + 1}')
        observe(f'closed editor {cycle + 1}')
    time.sleep(25)
    observe('after idle')
    alive.transport('stop')
    # Permit a small browser cache and allocator variation, but never a worker
    # and its descriptors for every editor reopening.
    assert samples[-1]['fds'] < samples[1]['fds'] + 100, samples
    assert samples[-1]['web_processes'] <= samples[1]['web_processes'] + 2, samples
    assert samples[-1]['pss_kib'] < samples[1]['pss_kib'] + 384 * 1024, samples


if __name__ == '__main__':
    run()
