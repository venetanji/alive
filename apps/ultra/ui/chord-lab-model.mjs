import {starter, payload} from './graph.mjs';

export const CHORDS = Object.freeze([[0, 4, 7], [0, 3, 7], [0, 5, 7]]);
export const DEFAULT_CONFIG = Object.freeze({
  enabled: false, bpm: 108, root: 48, chord: 0, steps: 8,
  gate: 55, velocity: 100, transpose: 0, clock_source: 0,
});
const bounds = {
  bpm: [30, 240], root: [24, 84], chord: [0, 2], steps: [1, 8],
  gate: [10, 90], velocity: [1, 127], transpose: [-24, 24], clock_source: [0, 1],
};
const parameterKeys = ['attack', 'release', 'gain'];
function validConfigValue(key, value) {
  const range = bounds[key];
  return range && Number.isInteger(value) && value >= range[0] && value <= range[1];
}
/** Presets are parameters of this fixed adapter, never arbitrary routing or code. */
export function parsePreset(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > 65536) throw Error('Preset must be JSON of at most 64 KiB.');
  const value = JSON.parse(text);
  const exactKeys = (object, keys) => object && typeof object === 'object' && !Array.isArray(object) &&
    Object.keys(object).length === keys.length && Object.keys(object).every(key => keys.includes(key));
  if (!exactKeys(value, ['format', 'version', 'name', 'adapter', 'config', 'parameters']) ||
      value.format !== 'ultra-chord-lab' || value.version !== 1 || value.adapter !== 'ultra-native-stereo-v1' ||
      typeof value.name !== 'string' || value.name.length < 1 || value.name.length > 80 ||
      !exactKeys(value.config, Object.keys(DEFAULT_CONFIG)) || value.config.enabled !== false ||
      Object.entries(bounds).some(([key]) => !validConfigValue(key, value.config[key])) ||
      !exactKeys(value.parameters, parameterKeys) ||
      parameterKeys.some(key => !Number.isInteger(value.parameters[key]) || value.parameters[key] < 0 || value.parameters[key] > 127)) {
    throw Error('Expected a stopped Ultra Chord lab v1 preset for the fixed stereo adapter, with valid controls.');
  }
  return {...value, config: {...value.config}, parameters: {...value.parameters}};
}
export function noteName(note) {
  if (!Number.isInteger(note) || note < 0 || note > 127) return '—';
  return `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][note % 12]}${Math.floor(note / 12) - 1}`;
}
export function chordNotes(config) {
  return Array.from({length: config.steps}, (_, step) =>
    Math.max(0, Math.min(127, config.root + CHORDS[config.chord][step % 3] + 12 * Math.floor(step / 3) + config.transpose)));
}
export function envelopeMs(kind, value) {
  return value === 0 ? 16 / 48 : value * (kind === 'attack' ? 4 : 8);
}

/** Native-only control state. The UI never clocks notes or synthesizes audio. */
export function createLabController({invoke, onState = () => {}, onNotice = () => {}} = {}) {
  const native = typeof invoke === 'function';
  let config = {...DEFAULT_CONFIG}, parameters = {attack: 8, release: 28, gain: 90};
  let status = {running: false, sequence_enabled: false, sequence_step: 0, sequence_note: 128, sequence_ticks: 0};
  let armed = false, faulted = false, prepared = false, busy = 0, generation = 0, noteGeneration = 0;
  let nativeArmedObserved = false;
  let queue = Promise.resolve(), flushing = false, configDirty = false, parametersDirty = false;
  const held = new Map();
  const getState = () => ({
    native, config: {...config}, parameters: {...parameters}, status: {...status},
    armed, faulted, prepared, busy: busy > 0, held: [...held.values()],
  });
  const emit = () => onState(getState());
  const notice = text => onNotice(text);
  const playable = () => native && prepared && status.running && !faulted && !status.fault && !status.server_lost;
  async function command(name, args = {}) {
    try {
      const result = await invoke(name, args);
      if (result === false) throw Error(`${name} was rejected by the native engine.`);
      return result;
    } catch (cause) {
      const error = new Error(`${cause?.message || cause} Stop audio, then Start to recover.`);
      error.command = name;
      throw error;
    }
  }
  function enqueue(fn) {
    queue = queue.then(fn).catch(async error => {
      const firstFault = !faulted;
      armed = false; faulted = true;
      held.clear(); emit();
      notice(String(error?.message || error));
      // A lost note-off/disable acknowledgment must not leave sound running
      // behind a merely local fault latch. Never recurse through this queue.
      if (native && status.running && firstFault && error.command !== 'audio_panic') {
        try { await invoke('audio_panic'); }
        catch { notice(`${error?.message || error} Native Panic could not be confirmed; use Stop audio.`); }
      }
      return false;
    });
    return queue;
  }
  function critical(fn) {
    busy++; emit();
    return enqueue(async () => {
      try { return await fn(); }
      finally { busy--; emit(); }
    });
  }
  async function refresh() {
    if (!native) { emit(); return; }
    try {
      status = await invoke('audio_status');
      if (status.fault || status.server_lost) {
        faulted = true; armed = false; held.clear();
        notice(`${status.message || 'Native engine fault'}. Stop audio, then Start to recover.`);
      }
      if (armed && status.sequence_enabled) nativeArmedObserved = true;
      else if (armed && nativeArmedObserved && !status.sequence_enabled) {
        armed = false; config.enabled = false; nativeArmedObserved = false;
        notice('The native sequence was disarmed. Press Run or Arm to start again.');
      }
      emit();
    } catch (error) {
      notice(`Cannot read native status: ${error?.message || error}`);
    }
  }
  async function applyParameters(values = {...parameters}) {
    for (const device of [0, 1]) {
      for (const [kind, value] of [[3, values.gain], [6, values.attack], [7, values.release]]) {
        await command('note_event', {device, kind, note: 0, value});
      }
    }
  }
  function flushLatest() {
    if (flushing || !playable()) return;
    flushing = true;
    enqueue(async () => {
      const writeConfig = configDirty, writeParameters = parametersDirty;
      const currentConfig = {...config, enabled: false}, currentParameters = {...parameters};
      configDirty = false; parametersDirty = false;
      try {
        if (!playable()) return;
        if (writeConfig) await command('sequence_config', {config: currentConfig});
        if (writeParameters) await applyParameters(currentParameters);
      } finally {
        flushing = false;
        if ((configDirty || parametersDirty) && playable()) flushLatest();
      }
    });
  }
  async function idle() {
    while (true) {
      const pending = queue;
      await pending;
      if (pending === queue && !flushing) return;
    }
  }
  function setConfig(key, value) {
    if (!validConfigValue(key, value)) {
      throw RangeError(`Invalid ${key}`);
    }
    if (config[key] === value) return;
    const wasArmed = armed;
    config = {...config, [key]: value, enabled: false};
    generation++; armed = false; configDirty = true; emit(); flushLatest();
    if (wasArmed) notice('Sequence settings changed. Transport stopped; press Run or Arm to use the new pattern.');
  }
  function setParameter(key, value) {
    if (!parameterKeys.includes(key) || !Number.isInteger(value) || value < 0 || value > 127) {
      throw RangeError(`Invalid ${key}`);
    }
    if (parameters[key] === value) return;
    parameters = {...parameters, [key]: value}; parametersDirty = true; emit(); flushLatest();
  }
  async function releaseNative() {
    if (!native || !status.running) return;
    // A all-off also disarms native sequencing. B remains the manual instrument.
    for (const device of [0, 1]) {
      await command('note_event', {device, kind: 2, note: 0, value: 0});
      await command('note_event', {device, kind: 4, note: 0, value: 0});
    }
  }
  function clearHeld() { held.clear(); noteGeneration++; emit(); }
  async function acceptFixedRoutes() {
    const result = await command('patch_apply', payload(starter()));
    if (result?.route_mask !== 3) throw Error('Native engine did not accept both fixed instrument routes.');
    prepared = true; emit();
  }
  function prepare() {
    if (!native || prepared) return Promise.resolve();
    generation++; armed = false; clearHeld();
    return critical(async () => {
      await refresh();
      if (status.running && !faulted) {
        await command('sequence_config', {config: {...config, enabled: false}});
      }
      await acceptFixedRoutes();
      if (playable()) {
        await releaseNative();
        parametersDirty = false; await applyParameters();
      }
    });
  }
  function silence(message = 'Transport stopped. All keys released.') {
    generation++; armed = false; config.enabled = false; clearHeld();
    if (!native) return Promise.resolve();
    return critical(async () => {
      if (status.running && !faulted) {
        await command('sequence_config', {config: {...config, enabled: false}});
        await releaseNative();
      }
      notice(message);
    });
  }
  function startAudio() {
    if (!native) { notice('View only. Open the native Ultra app to hear audio.'); return Promise.resolve(); }
    if (status.running || faulted) {
      notice(faulted ? 'Stop audio, then Start to clear the fault.' : 'Audio is already on.');
      return Promise.resolve();
    }
    generation++; armed = false; config.enabled = false; clearHeld();
    return critical(async () => {
      await acceptFixedRoutes();
      await command('audio_start');
      await refresh();
      if (!status.running || status.fault || status.server_lost) throw Error(status.message || 'Audio could not start. Check the JACK server.');
      parametersDirty = false;
      await applyParameters();
      configDirty = false;
      await command('sequence_config', {config: {...config, enabled: false}});
      notice('Audio is on. Run the sequence, or play the B keyboard below.');
      await refresh();
    });
  }
  function stopAudio() {
    generation++; armed = false; config.enabled = false; clearHeld();
    if (!native) return Promise.resolve();
    return critical(async () => {
      // audio_stop itself clears the native client and notes, even after a fault.
      await command('audio_stop');
      faulted = false;
      await refresh();
      notice('Audio stopped. The next Start keeps transport stopped.');
    });
  }
  function run() {
    if (!playable()) {
      notice(native ? (faulted ? 'Stop audio, then Start to clear the fault.' : 'Start audio before running transport.') : 'View only. Native audio is not available in this browser.');
      return Promise.resolve();
    }
    const current = ++generation;
    return critical(async () => {
      if (current !== generation || !playable()) return;
      await command('sequence_config', {config: {...config, enabled: true}});
      // A focus-loss stop can arrive while native admission is in flight.
      if (current !== generation) return;
      armed = true; config.enabled = true; nativeArmedObserved = false; emit();
      notice(config.clock_source === 1 ? 'Armed for JACK MIDI clock. Send MIDI Start (FA) or Continue (FB); Stop (FC) releases the note.' : 'Native 16th-note transport running on A. Keyboard and MIDI channel 2 play B.');
    });
  }
  function panic() {
    generation++; armed = false; config.enabled = false; clearHeld();
    if (!native) return Promise.resolve();
    faulted = true; emit();
    return critical(async () => {
      await command('audio_panic');
      await refresh();
      notice('Panic latched. Output is muted. Stop audio, then Start to recover.');
    });
  }
  function noteDown(source, note) {
    if (!playable() || held.has(source) || !Number.isInteger(note) || note < 0 || note > 127) return;
    const already = [...held.values()].includes(note);
    held.set(source, note); emit();
    if (already) return;
    const current = noteGeneration;
    enqueue(async () => {
      if (current === noteGeneration && playable() && [...held.values()].includes(note)) {
        await command('note_event', {device: 1, kind: 0, note, value: config.velocity});
      }
    });
  }
  function noteUp(source) {
    const note = held.get(source);
    if (note === undefined) return;
    held.delete(source); emit();
    if ([...held.values()].includes(note) || !native) return;
    enqueue(async () => {
      if (status.running && !faulted) await command('note_event', {device: 1, kind: 1, note, value: 0});
    });
  }
  function exportPreset() {
    return {
      format: 'ultra-chord-lab', version: 1, name: 'Triad stair',
      adapter: 'ultra-native-stereo-v1', config: {...config, enabled: false}, parameters: {...parameters},
    };
  }
  async function loadPreset(text) {
    const preset = parsePreset(text); // Validate completely before changing the live instrument.
    const stopped = await silence();
    if (stopped === false) throw Error('Could not stop the native transport; preset was not loaded.');
    config = {...preset.config}; parameters = {...preset.parameters};
    configDirty = true; parametersDirty = true;
    emit(); flushLatest(); await idle();
    if (faulted) throw Error('Preset controls loaded, but the native engine rejected an update. Stop and Start before playback.');
    notice(`Loaded “${preset.name}”. Transport stays stopped; press Run when ready.`);
  }
  return {getState, setConfig, setParameter, prepare, startAudio, stopAudio, run, silence, panic, noteDown, noteUp, refresh, idle, exportPreset, loadPreset};
}
