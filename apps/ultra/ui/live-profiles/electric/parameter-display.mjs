import {electricModelFields} from './default-model.mjs';
import {electricVolumeCurve, electricFineTuneCurve} from './display-curves.mjs';

export const electricDisplayEvidence = Object.freeze({
  hostSha256: '5f0afddc288b352e92672de2df9175eaf81c9898fb5bd5faef6a09f155c45d26',
  packetSha256: '741d6ae704fb925c3354d0d43c071beac753c84794b3591f78ccfadf525052c1',
  formatter: '0x1413c7370', parser: '0x1413c7190',
  physicalForward: '0x144139130', physicalInverse: '0x144139040', units: '0x144139220',
  percentageNumber: '0x1430c3980', percentageNumberParser: '0x1430c3920',
  transposeFormatter: '0x1430c4e30', transposeParser: '0x1430c4dd0',
  pickupChoices: Object.freeze(['0x1440c0b80', '0x1440c0b91']),
  limitation: 'Decimal precision and suffixes are traced; C runtime half-tie rounding has not been compared at runtime.',
});

const percentageNumbers = new Set([
  'MalletStiffnessKeyboard', 'MalletStiffnessVelocity', 'MalletForceKeyboard',
  'MalletForceVelocity', 'MalletNoiseKeyboardScaling', 'ForkTineKeyboardScaling',
  'PickupAmpKeyboardScaling',
]);
const percentages = new Set([
  'MalletStiffness', 'MalletForceStrength', 'MalletNoisePitch', 'MalletNoiseDecay',
  'MalletNoiseAmount', 'ForkReleaseTime', 'ForkTineDecay', 'ForkTineVolume',
  'ForkTineColor', 'ForkToneBarDecay', 'ForkToneBarVolume', 'PickupSymmetry',
  'PickupDistance', 'PickupAmpIn', 'PickupAmpOut', 'DamperTone', 'DamperAmount',
]);
const f32 = Math.fround;
const fixed = (value, digits) => Number(value.toFixed(digits)).toFixed(digits);
const bounded = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const numeric = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*([a-z%]*)$/i;

function physicalNumber(text, unit) {
  if (typeof text !== 'string') return NaN;
  const match = text.trim().match(numeric);
  if (!match || (match[2] && match[2].toLowerCase() !== unit.toLowerCase())) return NaN;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : NaN;
}

// The compiled curves have 64 intervals below .5 and 63 above it.
function lookup(table, raw) {
  const x = f32(raw);
  const position = x < .5 ? f32(x * 128) : f32((x - .5) * 126 + 64);
  const index = Math.floor(position);
  if (index === 127) return table[127];
  const fraction = f32(position - index);
  return f32(f32(table[index] - fraction * table[index]) + fraction * table[index + 1]);
}

function inverse(table, value) {
  const physical = f32(value);
  if (physical <= table[0]) return 0;
  if (physical >= table[127]) return 1;
  let upper = 1;
  while (physical >= table[upper]) upper++;
  const fraction = f32(f32(physical - table[upper - 1]) / f32(table[upper] - table[upper - 1]));
  const position = f32(upper - 1 + fraction);
  return position < 64 ? f32(position / 128) : f32((position - 64) * f32(1 / 126) + .5);
}

function continuous({unit = '', scale = 1, offset = 0, table, digits = 0, suffix = unit, generic = false} = {}) {
  const toDisplay = value => table ? lookup(table, value) : generic ? value * scale + offset : f32(f32(value) * scale + offset);
  const fromDisplay = value => table ? inverse(table, value) : generic ? (value - offset) / scale : f32(f32(value) * f32(1 / scale) - offset / scale);
  const low = table ? table[0] : offset;
  const high = table ? table[127] : scale + offset;
  return Object.freeze({
    qualified: true, authority: 'current-host-static', unit, min: 0, max: 1,
    physicalMin: low, physicalMax: high, toDisplay, fromDisplay,
    format(value) {
      if (!bounded(value, 0, 1)) return '--';
      const physical = toDisplay(value);
      if (unit === 'dB' && physical <= -100000) return '-inf dB';
      const precision = unit === 'dB' ? Math.abs(physical) < 9.95 ? 1 : 0 : digits;
      return fixed(physical, precision) + (suffix ? ` ${suffix}` : '');
    },
    parse(text) {
      if (unit === 'dB' && typeof text === 'string' && /^-inf(?:inity)?\s*(?:db)?$/i.test(text.trim())) return 0;
      const physical = physicalNumber(text, unit);
      if (!bounded(physical, low, high)) return NaN;
      return fromDisplay(physical);
    },
  });
}

function integerUnit(min, max, offset = 0, unit = '') {
  return Object.freeze({
    qualified: true, authority: 'current-host-static', unit, min, max,
    physicalMin: min + offset, physicalMax: max + offset,
    toDisplay: value => value + offset, fromDisplay: value => value - offset,
    format: value => bounded(value, min, max) && Number.isInteger(value) ? `${value + offset}${unit ? ` ${unit}` : ''}` : '--',
    parse(text) {
      const value = physicalNumber(text, unit) - offset;
      return bounded(value, min, max) && Number.isInteger(value) ? value : NaN;
    },
  });
}

function choices(labels) {
  const options = Object.freeze(labels.map((label, value) => Object.freeze({value, label})));
  return Object.freeze({
    qualified: true, authority: 'current-host-static', unit: '', min: 0, max: labels.length - 1, options,
    format: value => Number.isInteger(value) ? options[value]?.label ?? '--' : '--',
    parse: text => typeof text === 'string' ? options.find(option => option.label === text.trim())?.value ?? NaN : NaN,
  });
}

const displays = new Map([
  ...[...percentages].map(key => [key, continuous({unit: '%', scale: 100})]),
  ...[...percentageNumbers].map(key => [key, continuous({scale: 100, generic: true})]),
  ['KeyboardStretch', continuous({unit: '%', scale: 200, offset: -100})],
  ['DamperBalance', continuous({unit: '%', scale: 200, offset: -100})],
  ['Volume', continuous({unit: 'dB', table: electricVolumeCurve})],
  ['KeyboardFineTune', continuous({table: electricFineTuneCurve, digits: 2})],
  ['PitchBendRange', continuous({scale: 12, digits: 2})],
  ['KeyboardTranspose', integerUnit(0, 24, -12, 'st')],
  ['PerNotePitchBendRange', integerUnit(0, 48, 0, 'st')],
  ['PickupModel', choices(['R', 'W'])],
  ['Polyphony', choices(Array.from({length: 31}, (_, index) => String(index + 2)))],
]);

export const electricDisplayCatalog = Object.freeze(electricModelFields.map(key => Object.freeze({
  key, qualified: displays.has(key),
  ...(displays.has(key) ? {authority: 'current-host-static', unit: displays.get(key).unit} : {reason: 'Device activation is host-owned; no Electric DSP or physical display binding is published.'}),
})));

export function electricParameterDisplay(key) {
  return displays.get(key === 'PickupModel.Current' ? 'PickupModel' : key) ?? null;
}
