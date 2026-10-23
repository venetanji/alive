#!/usr/bin/env python3
"""Author finite original MSP probes. Generation is not a Max execution."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n')


class Patch:
    def __init__(self, name, frames):
        self.name, self.frames = name, frames
        self.boxes, self.lines, self.events, self.labels, self.channels = [], [], [], [], []
        self.settings = {}
        for setting in ['driver', 'sr', 'sigvs', 'iovs', 'overdrive', 'takeover', 'switch']:
            node = self.add('adstatus ' + setting)
            self.settings[setting] = node
            self.tap(node, setting + '_left')
            self.tap(node, setting + '_right', 1)
            self.event('override 1', node)
        self.event('0', self.settings['switch'])
        self.event('4', self.settings['driver'])
        self.event('48000', self.settings['sr'], 1)
        self.event('64', self.settings['sigvs'], 1)
        self.event('512', self.settings['iovs'], 1)
        self.event('0', self.settings['overdrive'])
        self.event('0', self.settings['takeover'])

    def add(self, text, cls='newobj', **attrs):
        node = 'obj-' + str(len(self.boxes) + 1)
        box = dict(id=node, maxclass=cls, patching_rect=[20. + len(self.boxes) % 8 * 150, 20. + len(self.boxes) // 8 * 50, 145., 22.])
        if text is not None:
            box['text'] = text
        box.update(attrs)
        self.boxes.append(dict(box=box))
        return node

    def wire(self, source, target, outlet=0, inlet=0):
        self.lines.append(dict(patchline=dict(source=[source, outlet], destination=[target, inlet])))

    def tap(self, source, label, outlet=0):
        self.labels.append(label)
        self.wire(source, 'logger', outlet, len(self.labels) - 1)

    def event(self, message, target, inlet=0, wait_ms=0):
        key = 'event_' + str(len(self.events))
        node = self.add(message, 'message', varname=key)
        self.wire(node, target, inlet=inlet)
        self.events.append(dict(id=key, message=message, destination=target, inlet=inlet, wait_ms=wait_ms))

    def channel(self, source, label, outlet=0, **details):
        self.channels.append(dict(source=source, outlet=outlet, label=label, **details))

    def recorder(self):
        count = len(self.channels)
        self.buffer = self.add('buffer~ alive_signal_reference 100 ' + str(count))
        self.record = self.add('record~ alive_signal_reference ' + str(count))
        for i, channel in enumerate(self.channels):
            self.wire(channel['source'], self.record, channel['outlet'], i)
        # NonRealTime has no hardware output; this sink instantiates DSP only.
        self.dac = self.add('dac~')
        self.wire(self.channels[0]['source'], self.dac, self.channels[0]['outlet'])

    def capture(self, label, before=()):
        self.event('sizeinsamps ' + str(self.frames), self.buffer)
        self.event('clear', self.buffer)
        for message, target, inlet in before:
            self.event(message, target, inlet)
        self.event('1', self.record)
        self.event('1', self.settings['switch'])
        self.event('0', self.settings['switch'], wait_ms=100)
        self.event('0', self.record)
        self.event('capture ' + label, 'logger')

    def save(self, probe='probe.js'):
        for setting in self.settings.values():
            self.event('bang', setting)
        self.boxes.append(dict(box=dict(id='logger', maxclass='newobj', text='js ' + probe + ' ' + self.name,
                                       varname='logger', numinlets=64, numoutlets=0,
                                       patching_rect=[20., 900., 400., 22.])))
        patch = dict(patcher=dict(fileversion=1, appversion=dict(major=9, minor=1, revision=5, architecture='x64', modernui=1),
                                 classnamespace='box', rect=[0., 0., 1280., 950.], boxes=self.boxes, lines=self.lines))
        score = dict(fixture=self.name, sample_rate=48000, signal_vector=64, frames=self.frames,
                     buffer='alive_signal_reference', labels=self.labels, channels=self.channels,
                     events=self.events, drain_ms=100)
        write(ROOT / 'fixtures' / (self.name + '.maxpat'), patch)
        write(ROOT / 'fixtures' / (self.name + '.score.json'), score)


def arithmetic():
    p = Patch('arithmetic', 512)
    left, right, left_sum, right_sum = [p.add('sig~ ' + str(value)) for value in [6, 2, 3, 1]]
    targets = []
    for operator in ['+~', '-~', '*~', '/~']:
        for topology in ['none', 'left', 'right', 'both', 'summed']:
            node = p.add(operator)
            if topology in ['left', 'both', 'summed']:
                p.wire(left, node)
            if topology in ['right', 'both', 'summed']:
                p.wire(right, node, inlet=1)
            if topology == 'summed':
                p.wire(left_sum, node)
                p.wire(right_sum, node, inlet=1)
            p.channel(node, operator + ':' + topology, operator=operator, topology=topology, creation=operator)
            targets.append(node)
        node = p.add(operator + ' 10')
        p.wire(left, node)
        p.channel(node, operator + ':creation10', operator=operator, topology='left', creation=operator + ' 10')
        targets.append(node)
    p.recorder()
    p.capture('initial')
    for inlet, value, label in [(0, 3, 'left3'), (1, 5, 'right5'), (0, 7, 'left7'), (1, 4, 'right4'), (1, 0, 'right0')]:
        for target in targets:
            p.event(str(value), target, inlet)
        p.capture(label)
    p.save()


def waves():
    p = Patch('waves', 1024)
    sig_default = p.add('sig~')
    p.channel(sig_default, 'sig_default', creation='sig~')
    sig = p.add('sig~ 0.25 -0.5 2')
    for i in range(3):
        p.channel(sig, 'sig_multi_' + str(i), i, creation='sig~ 0.25 -0.5 2')
    cycle = p.add('cycle~ 1000')
    p.channel(cycle, 'cycle1000')
    quarter = p.add('cycle~ 1000')
    p.event('0.25', quarter, 1)
    p.channel(quarter, 'cycle1000_phase_quarter')
    zero_cycle = p.add('cycle~')
    p.channel(zero_cycle, 'cycle_default')
    phase_signal = p.add('sig~ 0.25')
    driven = p.add('cycle~ 0')
    p.wire(phase_signal, driven, inlet=1)
    p.channel(driven, 'cycle0_phase_signal_quarter')
    phasor = p.add('phasor~ 1000')
    p.channel(phasor, 'phasor1000')
    backwards = p.add('phasor~ -1000')
    p.channel(backwards, 'phasor_negative1000')
    for value in [-2., -1., -.5, 0., .5, 1., 2.]:
        source = p.add('sig~ ' + str(value))
        clip = p.add('clip~ -1. 1.')
        p.wire(source, clip)
        p.channel(clip, 'clip_' + str(value), value=value)
    source = p.add('sig~ 2.')
    for creation in ['clip~', 'clip~ 1. -1.', 'clip~ -1. 1. @mode 1']:
        node = p.add(creation)
        p.wire(source, node)
        p.channel(node, creation, creation=creation)
    noise = p.add('noise~')
    p.channel(noise, 'noise_default')
    classic = p.add('noise~ @classic 1')
    p.channel(classic, 'noise_classic')
    ramp = p.add('line~ 0.')
    p.channel(ramp, 'line_0_to_1_10ms')
    p.tap(ramp, 'line_completion', 1)
    snapshot = p.add('snapshot~ 0')
    p.wire(phase_signal, snapshot)
    p.tap(snapshot, 'snapshot_constant')
    p.event('bang', snapshot)
    p.recorder()
    p.capture('initial', [('1. 10', ramp, 0)])
    p.event('bang', snapshot)
    p.event('list 0.75 0.5 -2.', sig)
    p.event('set 1 0.125', sig)
    p.event('reset 0.25', cycle)
    p.event('0.25', phasor, 1)
    p.capture('changed')
    p.event('bang', snapshot)
    p.save()


def precision():
    p = Patch('precision', 64)
    for value in [-2., 0., 2.]:
        source = p.add('sig~ ' + str(value))
        clip = p.add('clip~ 1. -1.')
        p.wire(source, clip)
        p.channel(clip, 'clip_reversed_' + str(value), value=value)
    source = p.add('sig~ 1.5')
    clip = p.add('clip~ -1. 1. @mode 1')
    p.wire(source, clip)
    p.channel(clip, 'clip_mode1_1.5')
    phasor = p.add('phasor~ 1000')
    cycle = p.add('cycle~ 1000')
    p.channel(phasor, 'phasor1000')
    p.channel(cycle, 'cycle1000')
    noises = []
    for i in range(2):
        noise = p.add('noise~')
        noises.append(noise)
        p.channel(noise, 'noise_seed1_' + str(i))
    snapshots = []
    for offset in [0, 1, 63]:
        snapshot = p.add('snapshot~ 0 @offset ' + str(offset))
        snapshots.append(snapshot)
        p.wire(phasor, snapshot)
        p.tap(snapshot, 'snapshot_offset_' + str(offset))
        p.event('bang', snapshot)
    automatic = p.add('snapshot~ 10 @offset 0')
    p.wire(phasor, automatic)
    p.tap(automatic, 'snapshot_automatic')
    p.event('stop', automatic)
    errors = p.add('error')
    p.tap(errors, 'max_error')
    p.recorder()
    loopbuf = p.add('buffer~ alive_snapshot_reference 100 2')
    looprec = p.add('record~ alive_snapshot_reference 2')
    p.wire(phasor, looprec)
    p.wire(cycle, looprec, inlet=1)
    p.event('sizeinsamps 64', loopbuf)
    p.event('loop 1', looprec)
    for stage in ['initial', 'restarted', 'reset']:
        p.event('phase ' + stage, 'logger')
        before = [('1', looprec, 0), ('start', automatic, 0)]
        if stage in ['initial', 'reset']:
            before += [('seed 1', noise, 0) for noise in noises]
        if stage == 'reset':
            before += [('0.25', phasor, 1), ('reset 0.25', cycle, 0)]
        if stage == 'restarted':
            p.event('offset 63', snapshots[0])
            p.event('offset 0', snapshots[1])
            p.event('offset 1', snapshots[2])
            p.event('5', automatic, 1)
        p.capture(stage, before)
        p.event('stop', automatic)
        for snapshot in snapshots:
            p.event('bang', snapshot)
        p.event('capture last_' + stage + ' alive_snapshot_reference', 'logger')
    p.save('probe-precision.js')


if __name__ == '__main__':
    (ROOT / 'results').mkdir(exist_ok=True)
    arithmetic()
    waves()
    precision()
    print('Authored fixed arithmetic, waves and precision fixtures; no runtime claims yet.')
