import {createComponent} from './components/index.mjs';
import {createLabController, CHORDS, chordNotes, envelopeMs, noteName} from './chord-lab-model.mjs';
import {NATIVE_STEREO_ADAPTER, describeJoin, assertBusConnection} from './audio-bus.mjs';

const $ = selector => document.querySelector(selector);
const controls = new Map(), previousValues = new Map();
const keyboardMap = {a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12};
const nativeInvoke = window.__TAURI__?.core?.invoke;
// Validate the bus topology represented here. These descriptors do not create DSP.
const packedBus = describeJoin(NATIVE_STEREO_ADAPTER.pack.inputs, NATIVE_STEREO_ADAPTER.pack.output);
assertBusConnection(NATIVE_STEREO_ADAPTER.pack.output, NATIVE_STEREO_ADAPTER.output);
if (!packedBus || NATIVE_STEREO_ADAPTER.outputChannels !== 2) throw Error('Unsupported native adapter descriptor.');
let initialized = false, lastTicks = -1, leaving = false;
const controller = createLabController({
  invoke: nativeInvoke,
  onState: state => { if (initialized) render(state); },
  onNotice: message => { $('#notice').textContent = message; },
});
const initial = controller.getState();
const msText = (kind, value) => `${value === 0 ? '0.333' : envelopeMs(kind, value)} ms`;

function addControl(key, type, min, max, label, parameter = false) {
  const value = parameter ? initial.parameters[key] : initial.config[key];
  const component = createComponent({id: key, type, label, min, max, step: 1, value}, {
    onEvent: event => {
      if (event.action === 'input') {
        if (key === 'attack' || key === 'release') $(`#${key}-time`).textContent = msText(key, event.value);
        if (key === 'gain') $('#gain-readout').textContent = event.value;
        return;
      }
      if (event.action !== 'change') return;
      try {
        if (parameter) controller.setParameter(key, event.value);
        else controller.setConfig(key, event.value);
      } catch (error) { $('#notice').textContent = error.message; }
    },
  });
  $(`#${key === 'bpm' ? 'tempo' : key}-control`).append(component.element);
  controls.set(key, component); previousValues.set(key, value);
}
addControl('bpm', 'number', 30, 240, 'BPM');
addControl('gate', 'number', 10, 90, 'Gate %');
addControl('steps', 'number', 1, 8, 'Steps');
addControl('root', 'number', 24, 84, 'Root MIDI');
addControl('transpose', 'number', -24, 24, 'Transpose');
addControl('velocity', 'slider', 1, 127, 'Velocity');
addControl('attack', 'slider', 0, 127, 'Attack', true);
addControl('release', 'slider', 0, 127, 'Release', true);
addControl('gain', 'slider', 0, 127, 'Level', true);

for (let step = 0; step < 8; step++) {
  const cell = document.createElement('span');
  cell.textContent = step + 1; cell.dataset.step = step;
  $('#step-row').append(cell);
}
const blackNotes = [1, 3, 6, 8, 10], whiteNotes = [0, 2, 4, 5, 7, 9, 11, 12];
for (const pitch of [...whiteNotes, ...blackNotes]) {
  const note = 60 + pitch, black = blackNotes.includes(pitch);
  const key = document.createElement('button');
  key.className = `key${black ? ' black' : ''}`; key.type = 'button';
  key.dataset.note = note;
  key.setAttribute('aria-label', `Play ${noteName(note)}, MIDI ${note}, on instrument B`);
  key.setAttribute('aria-pressed', 'false');
  const name = document.createElement('span'); name.textContent = noteName(note).replace(/\d+$/, '');
  const shortcut = document.createElement('span'); shortcut.className = 'typing';
  shortcut.textContent = Object.entries(keyboardMap).find(([, value]) => value === pitch)[0].toUpperCase();
  key.append(name, shortcut);
  if (black) key.style.left = `${([1, 3].includes(pitch) ? [1, 3].indexOf(pitch) + 1 : [6, 8, 10].indexOf(pitch) + 4) * 12.5 - 4}%`;
  key.addEventListener('pointerdown', event => {
    if (event.button !== 0 || key.disabled) return;
    event.preventDefault();
    key.setPointerCapture(event.pointerId);
    controller.noteDown(`pointer-${event.pointerId}`, note);
  });
  const release = event => controller.noteUp(`pointer-${event.pointerId}`);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) key.addEventListener(type, release);
  key.addEventListener('keydown', event => {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (!event.repeat) controller.noteDown(`button-${note}`, note);
  });
  key.addEventListener('keyup', event => {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation(); controller.noteUp(`button-${note}`);
  });
  key.addEventListener('blur', () => controller.noteUp(`button-${note}`));
  $('#keyboard').append(key);
}

function render(state) {
  const {native, config, parameters, status, armed, faulted, prepared, busy, held} = state;
  const ready = native && prepared && status.running && !faulted && !status.fault && !status.server_lost;
  $('#preview-banner').hidden = native;
  $('#engine-label').textContent = !native ? 'Preview only' : faulted ? 'Fault · restart' : status.running ? 'Audio on' : 'Audio off';
  $('#engine-badge').dataset.on = ready;
  $('#engine-badge').dataset.fault = faulted;
  $('#start-audio').disabled = !native || !!status.running || busy || faulted;
  $('#stop-audio').disabled = !native || busy || !(status.running || faulted || status.server_lost);
  $('#panic').disabled = !native || !(status.running || busy) || faulted;
  $('#run-transport').disabled = !ready || busy || armed;
  $('#run-transport').textContent = config.clock_source === 1 ? (armed ? '● MIDI armed' : '○ Arm MIDI') : (armed ? '▶ Running' : '▶ Run');
  $('#run-transport').setAttribute('aria-pressed', String(armed));
  $('#stop-transport').disabled = !ready || !(armed || busy || status.sequence_enabled);
  $('#transport-help').textContent = config.clock_source === 1
    ? 'Arm, then send MIDI Start / Continue. MIDI Stop leaves the clock armed.'
    : 'Sample-clocked 16ths. Stop releases A; the keyboard remains playable.';
  for (const [key, value] of Object.entries({...config, ...parameters})) {
    if (!controls.has(key) || previousValues.get(key) === value) continue;
    controls.get(key).setState({value}); previousValues.set(key, value);
    if (key === 'attack' || key === 'release') $(`#${key}-time`).textContent = msText(key, value);
    if (key === 'gain') $('#gain-readout').textContent = value;
  }
  $('#clock-source').value = String(config.clock_source);
  $('#chord-shape').value = String(config.chord);
  $('#period-readout').textContent = config.clock_source === 1 ? 'MIDI F8 × 6' : `${(60000 / (config.bpm * 4)).toFixed(1)} ms`;
  const live = native && armed && status.sequence_enabled && status.sequence_ticks > 0;
  const step = live ? status.sequence_step : -1;
  for (const cell of $('#step-row').children) {
    const i = Number(cell.dataset.step);
    cell.classList.toggle('disabled', i >= config.steps);
    cell.classList.toggle('current', i === step);
    cell.setAttribute('aria-label', `Step ${i + 1}${i >= config.steps ? ', inactive' : i === step ? ', current' : ''}`);
  }
  $('#step-readout').textContent = live ? `${step + 1} / ${config.steps}` : '—';
  $('#math-index').textContent = live ? step : '—';
  $('#math-readout').textContent = live
    ? `i % 3 = ${step % 3} · interval ${CHORDS[config.chord][step % 3]} · octave +${12 * Math.floor(step / 3)}`
    : 'Triad repeats; every third step adds an octave.';
  const sounding = live && status.sequence_note !== 128;
  $('#note-readout').textContent = sounding ? noteName(status.sequence_note) : '—';
  $('#midi-readout').textContent = sounding ? `MIDI ${status.sequence_note}` : 'MIDI —';
  $('#held-readout').textContent = [...new Set(held)].map(noteName).join(' ') || '—';
  $('#root-readout').textContent = `Root ${noteName(config.root)} · MIDI ${config.root}`;
  $('#chord-list').replaceChildren(...CHORDS[config.chord].map(value => {
    const span = document.createElement('span'); span.textContent = value; return span;
  }));
  const map = chordNotes(config);
  $('#pitch-map').replaceChildren(...map.map((note, i) => {
    const li = document.createElement('li'), index = document.createElement('span');
    index.textContent = i + 1; li.append(index, noteName(note)); li.title = `Step ${i + 1}: MIDI ${note}`;
    li.classList.toggle('current', i === step); return li;
  }));
  for (const key of $('#keyboard').children) {
    key.disabled = !ready;
    const active = held.includes(Number(key.dataset.note));
    key.classList.toggle('active', active); key.setAttribute('aria-pressed', String(active));
  }
  $('#output-light').dataset.on = ready;
  $('#sample-rate').textContent = native && status.sample_rate ? `${status.sample_rate / 1000} kHz` : '—';
  $('#adapter-delay').textContent = native && status.delay_frames !== undefined ? `${status.delay_frames} frames` : '—';
  for (const [id, field] of [['frames', 'frames'], ['ticks', 'sequence_ticks'], ['xruns', 'xruns'], ['rejected', 'rejected']]) {
    $(`#${id}`).textContent = native && status[field] !== undefined ? String(status[field]) : '—';
  }
  // The light only reflects changes observed in actual native counters.
  $('#beat-light').classList.toggle('lit', !!(live && status.sequence_ticks !== lastTicks));
  lastTicks = status.sequence_ticks;
}

function drawCables() {
  const svg = $('#patch-cables'), base = $('#patch').getBoundingClientRect();
  svg.replaceChildren();
  const endpoint = (id, port) => {
    const rect = $(`#${id} [data-port="${port}"]`).getBoundingClientRect();
    return {x: rect.left - base.left + rect.width / 2, y: rect.top - base.top + rect.height / 2};
  };
  const wires = [
    ['transport', 'out', 'metro', 'in', 'control'],
    ['metro', 'out', 'cycle', 'in', 'control'],
    ['cycle', 'out', 'math', 'in', 'control'],
    ['chord', 'out', 'math', 'in', 'control', 'chord'],
    ['math', 'out', 'pitch', 'in', 'control'],
    ['pitch', 'out', 'voice', 'notes', 'control', 'pitch'],
    ['keyboard-object', 'out', 'voice', 'notes', 'control'],
    ['envelope', 'out', 'voice', 'envelope', 'control'],
    ['voice', 'a', 'gain', 'a-in', 'audio'],
    ['voice', 'b', 'gain', 'b-in', 'audio'],
    ['gain', 'a-out', 'join', 'a', 'audio'],
    ['gain', 'b-out', 'join', 'b', 'audio'],
    ['join', 'out', 'output', 'in', 'audio', 'bundle'],
  ];
  for (const [from, outlet, to, inlet, kind, route] of wires) {
    const a = endpoint(from, outlet), b = endpoint(to, inlet);
    let d;
    if (route === 'pitch') d = `M${a.x},${a.y} C${a.x},441 ${b.x},421 ${b.x},${b.y}`;
    else if (route === 'chord') d = `M${a.x},${a.y} C${a.x},242 ${b.x + 23},225 ${b.x},${b.y}`;
    else if (Math.abs(a.y - b.y) < 2) d = `M${a.x},${a.y} L${b.x},${b.y}`;
    else d = `M${a.x},${a.y} C${a.x},${a.y + 22} ${b.x},${b.y - 22} ${b.x},${b.y}`;
    for (const className of ['cable-halo', `cable ${kind}`]) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d); path.setAttribute('class', className); svg.append(path);
    }
    if (route === 'bundle') {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String((a.x + b.x) / 2 - 6)); label.setAttribute('y', String(a.y - 9));
      label.setAttribute('class', 'bundle-label'); label.textContent = '×2'; svg.append(label);
    }
  }
}

$('#start-audio').addEventListener('click', () => controller.startAudio());
$('#stop-audio').addEventListener('click', () => controller.stopAudio());
$('#run-transport').addEventListener('click', () => controller.run());
$('#stop-transport').addEventListener('click', () => controller.silence());
$('#panic').addEventListener('click', () => controller.panic());
$('#clock-source').addEventListener('change', event => controller.setConfig('clock_source', Number(event.target.value)));
$('#chord-shape').addEventListener('change', event => controller.setConfig('chord', Number(event.target.value)));
window.addEventListener('keydown', event => {
  if ($('#preset-dialog').open || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target?.tagName) || event.target?.isContentEditable || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'Escape') { event.preventDefault(); controller.silence(); return; }
  const key = event.key.toLowerCase();
  if (key in keyboardMap) {
    event.preventDefault();
    if (!event.repeat) controller.noteDown(`typing-${key}`, 60 + keyboardMap[key]);
  }
});
window.addEventListener('keyup', event => controller.noteUp(`typing-${event.key.toLowerCase()}`));
window.addEventListener('blur', () => controller.silence('Focus left the patch. Transport stopped and keys released.'));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) controller.silence('Patch hidden. Transport stopped and keys released.');
});
window.addEventListener('pagehide', () => { leaving = true; controller.silence(); });
$('#patcher-link').addEventListener('click', async event => {
  event.preventDefault();
  const result = await controller.stopAudio();
  if (result === false) {
    $('#notice').textContent = 'Could not confirm audio stopped. Stop audio before leaving the lab.';
    return;
  }
  leaving = true;
  window.location.assign($('#patcher-link').href);
});
window.addEventListener('resize', drawCables);
$('#preset-button').addEventListener('click', async () => {
  const stopped = await controller.silence('Preset opened. Transport stopped and keys released.');
  if (stopped === false) return;
  $('#preset-json').value = JSON.stringify(controller.exportPreset(), null, 2);
  $('#preset-status').textContent = 'Select and copy the text to save it in a local file.';
  $('#preset-dialog').showModal(); $('#preset-json').focus(); $('#preset-json').select();
});
$('#copy-preset').addEventListener('click', async () => {
  $('#preset-json').focus(); $('#preset-json').select();
  try {
    await navigator.clipboard.writeText($('#preset-json').value);
    $('#preset-status').textContent = 'Preset JSON copied.';
  } catch {
    $('#preset-status').textContent = 'Clipboard unavailable. The JSON is selected; press Ctrl+C to copy.';
  }
});
$('#load-preset').addEventListener('click', async () => {
  $('#load-preset').disabled = true;
  try {
    await controller.loadPreset($('#preset-json').value);
    $('#preset-dialog').close();
  } catch (error) { $('#preset-status').textContent = `Not loaded: ${error.message}`; }
  finally { $('#load-preset').disabled = false; }
});

// Poll only observations. Native code alone owns note scheduling and audio.
async function pollStatus() {
  if (leaving) return;
  await controller.refresh();
  if (!leaving) window.setTimeout(pollStatus, document.hidden ? 1000 : 100);
}
initialized = true;
render(controller.getState());
drawCables();
$('#notice').textContent = initial.native
  ? 'Ready. Start audio first, then Run the sequence or play B. Routing is fixed; controls are live.'
  : 'Browser preview. Explore the pitch map; open the native Ultra app for playback.';
await controller.prepare();
pollStatus();
