import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

const module = await import('./chord-lab-model.mjs').catch(() => null);
assert.ok(module, 'The chord lab needs its native control model');
const {createLabController, chordNotes, envelopeMs, noteName, DEFAULT_CONFIG, parsePreset} = module;

function harness() {
  const calls = [], notices = [];
  let state = {running: false, fault: false, sequence_enabled: false, sequence_note: 128};
  let pause, release;
  const controller = createLabController({
    invoke: async (name, args = {}) => {
      calls.push({name, args: structuredClone(args)});
      if (pause === name) {
        pause = null;
        await new Promise(resolve => { release = resolve; });
      }
      if (name === 'audio_start') state.running = true;
      if (name === 'audio_stop') state = {...state, running: false, fault: false, sequence_enabled: false};
      if (name === 'audio_panic') state = {...state, fault: true, sequence_enabled: false};
      if (name === 'sequence_config') state.sequence_enabled = args.config.enabled;
      if (name === 'audio_status') return {...state};
      if (name === 'patch_apply') return {route_mask: 3};
      return true;
    },
    onNotice: message => notices.push(message),
  });
  return {
    controller, calls, notices,
    pause(name) { pause = name; },
    release() { assert.ok(release, 'A command is paused'); release(); release = null; },
    setStatus(next) { state = {...state, ...next}; },
  };
}

test('chord math matches native zero-based triad / octave / clamp formula', () => {
  assert.deepEqual(chordNotes({...DEFAULT_CONFIG, steps: 8}), [48, 52, 55, 60, 64, 67, 72, 76]);
  assert.deepEqual(chordNotes({...DEFAULT_CONFIG, chord: 1, steps: 4}), [48, 51, 55, 60]);
  assert.deepEqual(chordNotes({...DEFAULT_CONFIG, chord: 2, root: 84, transpose: 24, steps: 8}), [108, 113, 115, 120, 125, 127, 127, 127]);
  assert.equal(envelopeMs('attack', 0), 16 / 48);
  assert.equal(envelopeMs('attack', 127), 508);
  assert.equal(envelopeMs('release', 127), 1016);
  assert.equal(noteName(60), 'C4');
  assert.equal(noteName(128), '—');
});

test('audio start applies fixed routes first, then both devices’ parameters, with transport disarmed', async () => {
  const h = harness();
  h.controller.setParameter('attack', 24);
  h.controller.setParameter('release', 40);
  h.controller.setParameter('gain', 77);
  await h.controller.startAudio();
  const names = h.calls.map(c => c.name);
  assert.ok(names.indexOf('patch_apply') < names.indexOf('audio_start'));
  const start = names.indexOf('audio_start');
  for (const device of [0, 1]) for (const [kind, value] of [[3, 77], [6, 24], [7, 40]]) {
    const index = h.calls.findIndex(c => c.name === 'note_event' && c.args.device === device && c.args.kind === kind && c.args.value === value);
    assert.ok(index > start, `Device ${device} parameter ${kind} is applied after native reset`);
  }
  assert.equal(h.calls.filter(c => c.name === 'sequence_config').at(-1).args.config.enabled, false);
  assert.equal(h.controller.getState().armed, false);
});

test('opening the lab accepts the fixed routes and stops an inherited transport', async () => {
  const h = harness();
  h.setStatus({running: true, sequence_enabled: true});
  assert.equal(h.controller.getState().prepared, false);
  await h.controller.prepare();
  assert.ok(h.calls.some(c => c.name === 'patch_apply'));
  assert.equal(h.calls.filter(c => c.name === 'sequence_config').at(-1).args.config.enabled, false);
  assert.equal(h.controller.getState().prepared, true);
  assert.equal(h.controller.getState().armed, false);
});

test('opening from every disconnected patcher mask accepts routes before route-sensitive release events', async () => {
  for (const initialMask of [0, 1, 2, 3]) {
    let mask = initialMask;
    const controller = createLabController({
      invoke: async (name, args) => {
        if (name === 'audio_status') return {running: true, sequence_enabled: false};
        if (name === 'patch_apply') { mask = 3; return {route_mask: mask}; }
        if (name === 'note_event') return !!(mask & (1 << args.device));
        return true;
      },
    });
    await controller.prepare();
    assert.equal(controller.getState().prepared, true, `Inherited mask ${initialMask}`);
    assert.equal(controller.getState().faulted, false, `Inherited mask ${initialMask}`);
    assert.equal(mask, 3);
  }
});

test('native disarm reconciles the Run button after an enabled state was observed', async () => {
  const h = harness();
  await h.controller.startAudio(); await h.controller.run();
  await h.controller.refresh();
  assert.equal(h.controller.getState().armed, true);
  h.setStatus({sequence_enabled: false});
  await h.controller.refresh();
  assert.equal(h.controller.getState().armed, false);
});

test('parameter edits during startup survive the in-flight parameter snapshot', async () => {
  const h = harness();
  h.pause('note_event');
  const start = h.controller.startAudio();
  for (let i = 0; i < 12; i++) await Promise.resolve();
  h.controller.setParameter('attack', 100);
  h.release();
  await start; await h.controller.idle();
  for (const device of [0, 1]) {
    assert.equal(h.calls.filter(c => c.name === 'note_event' && c.args.device === device && c.args.kind === 6).at(-1)?.args.value, 100);
  }
});

test('unexpected control rejection requests a native panic, not only a UI fault', async () => {
  const calls = [];
  const controller = createLabController({
    invoke: async (name, args) => {
      calls.push({name, args});
      if (name === 'patch_apply') return {route_mask: 3};
      if (name === 'audio_status') return {running: true};
      if (name === 'sequence_config' && args.config.enabled) return false;
      return true;
    },
  });
  await controller.startAudio();
  await controller.run();
  assert.equal(controller.getState().faulted, true);
  assert.ok(calls.some(c => c.name === 'audio_panic'));
});

test('failed note-off requests Panic and Stop still recovers if Panic IPC also fails', async () => {
  const calls = [];
  let running = true;
  const controller = createLabController({
    invoke: async (name, args) => {
      calls.push({name, args});
      if (name === 'patch_apply') return {route_mask: 3};
      if (name === 'audio_status') return {running};
      if (name === 'audio_stop') running = false;
      if (name === 'note_event' && args.kind === 1) throw Error('IPC unavailable for note-off');
      if (name === 'audio_panic') throw Error('Panic IPC unavailable');
      return true;
    },
  });
  await controller.startAudio();
  controller.noteDown('typing-a', 60); await controller.idle();
  controller.noteUp('typing-a'); await controller.idle();
  assert.equal(controller.getState().faulted, true);
  assert.equal(calls.filter(c => c.name === 'audio_panic').length, 1);
  await controller.stopAudio();
  assert.equal(controller.getState().faulted, false);
  assert.equal(controller.getState().status.running, false);
});

test('Run is explicit and configuration changes stop until another Run', async () => {
  const h = harness();
  await h.controller.startAudio();
  await h.controller.run();
  assert.equal(h.calls.filter(c => c.name === 'sequence_config').at(-1).args.config.enabled, true);
  h.controller.setConfig('bpm', 132);
  await h.controller.idle();
  const last = h.calls.filter(c => c.name === 'sequence_config').at(-1).args.config;
  assert.equal(last.bpm, 132);
  assert.equal(last.enabled, false);
  assert.equal(h.controller.getState().armed, false);
});

test('pending Run cannot revive transport after focus loss', async () => {
  const h = harness();
  await h.controller.startAudio();
  h.pause('sequence_config');
  const run = h.controller.run();
  await Promise.resolve(); await Promise.resolve();
  const stop = h.controller.silence('Focus left the patch');
  h.release();
  await Promise.all([run, stop]);
  assert.equal(h.calls.filter(c => c.name === 'sequence_config').at(-1).args.config.enabled, false);
  assert.equal(h.controller.getState().armed, false);
  assert.ok(h.calls.some(c => c.name === 'note_event' && c.args.device === 1 && c.args.kind === 4));
});

test('manual keyboard uses B, deduplicates pitches, and always releases', async () => {
  const h = harness();
  await h.controller.startAudio();
  await h.controller.run();
  h.calls.length = 0;
  h.controller.noteDown('typing-a', 60);
  h.controller.noteDown('pointer-1', 60);
  h.controller.noteUp('typing-a');
  await h.controller.idle();
  assert.deepEqual(h.calls.filter(c => c.name === 'note_event').map(c => [c.args.device, c.args.kind, c.args.note]), [[1, 0, 60]]);
  h.controller.noteUp('pointer-1');
  await h.controller.idle();
  assert.deepEqual(h.calls.filter(c => c.name === 'note_event').map(c => [c.args.device, c.args.kind, c.args.note]), [[1, 0, 60], [1, 1, 60]]);
});

test('release during pending note-on cannot leave a held voice', async () => {
  const h = harness();
  await h.controller.startAudio();
  h.calls.length = 0;
  h.pause('note_event');
  h.controller.noteDown('pointer-1', 64);
  await Promise.resolve(); await Promise.resolve();
  h.controller.noteUp('pointer-1');
  h.release();
  await h.controller.idle();
  assert.deepEqual(h.calls.filter(c => c.name === 'note_event').map(c => c.args.kind), [0, 1]);
  assert.equal(h.controller.getState().held.length, 0);
});

test('rapid committed controls coalesce to a bounded latest-value queue', async () => {
  const h = harness();
  await h.controller.startAudio();
  h.calls.length = 0;
  h.pause('sequence_config');
  h.controller.setConfig('bpm', 90);
  await Promise.resolve(); await Promise.resolve();
  for (let bpm = 91; bpm <= 200; bpm++) h.controller.setConfig('bpm', bpm);
  h.release();
  await h.controller.idle();
  const configs = h.calls.filter(c => c.name === 'sequence_config');
  assert.ok(configs.length <= 2, `At most in-flight + latest, got ${configs.length}`);
  assert.equal(configs.at(-1).args.config.bpm, 200);
});

test('Panic latches locally and only Stop then Start allows Run again', async () => {
  const h = harness();
  await h.controller.startAudio();
  await h.controller.run();
  await h.controller.panic();
  const count = h.calls.length;
  await h.controller.run();
  assert.equal(h.calls.length, count);
  assert.equal(h.controller.getState().faulted, true);
  await h.controller.stopAudio();
  await h.controller.startAudio();
  assert.equal(h.controller.getState().faulted, false);
});

test('browser preview rejects playback without fake processing', async () => {
  const controller = createLabController({});
  await controller.startAudio();
  await controller.run();
  controller.noteDown('preview', 60);
  assert.equal(controller.getState().native, false);
  assert.equal(controller.getState().armed, false);
  assert.equal(controller.getState().held.length, 0);
});

test('invalid UI control data is not transmitted', async () => {
  const h = harness();
  await h.controller.startAudio();
  const count = h.calls.length;
  for (const [key, value] of [['bpm', NaN], ['steps', 9], ['root', 100], ['clock_source', 2]]) {
    assert.throws(() => h.controller.setConfig(key, value));
  }
  assert.throws(() => h.controller.setParameter('attack', 128));
  await h.controller.idle();
  assert.equal(h.calls.length, count);
});

test('presets validate the complete fixed patch before mutating controls and never autorun', async () => {
  const h = harness();
  await h.controller.startAudio();
  await h.controller.run();
  const preset = h.controller.exportPreset();
  assert.equal(preset.config.enabled, false);
  preset.config.chord = 1;
  preset.parameters.attack = 50;
  await h.controller.loadPreset(JSON.stringify(preset));
  assert.equal(h.controller.getState().config.chord, 1);
  assert.equal(h.controller.getState().parameters.attack, 50);
  assert.equal(h.controller.getState().armed, false);
  const before = h.controller.getState();
  preset.config.root = 999;
  await assert.rejects(h.controller.loadPreset(JSON.stringify(preset)));
  assert.deepEqual(h.controller.getState().config, before.config);
  assert.throws(() => parsePreset(' '.repeat(65537)));
  assert.throws(() => parsePreset(JSON.stringify({...h.controller.exportPreset(), adapter: 'other'})));
  assert.throws(() => parsePreset(JSON.stringify({...h.controller.exportPreset(), graph: {}})));
});

test('page contract includes accessible native controls and safe navigation, not a JS note clock', () => {
  const html = readFileSync(new URL('./chord-lab.html', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('./chord-lab.mjs', import.meta.url), 'utf8');
  const index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(index, /href="chord-lab\.html"/);
  assert.match(html, /Read-only routing/);
  assert.match(html, /id="start-audio"/);
  assert.match(html, /id="run-transport"/);
  assert.match(html, /id="patcher-link"/);
  assert.match(ui, /await controller\.prepare\(\)/);
  assert.match(ui, /native && prepared && status\.running/);
  assert.match(ui, /const result = await controller\.stopAudio\(\)/);
  assert.deepEqual(parsePreset(readFileSync(new URL('./chord-lab-preset.json', import.meta.url), 'utf8')).config, DEFAULT_CONFIG);
  for (const event of ['pointercancel', 'lostpointercapture', 'visibilitychange', 'blur', 'pagehide']) assert.ok(ui.includes(event));
  assert.doesNotMatch(ui, /setInterval|AudioContext|webkitAudioContext/);
});
