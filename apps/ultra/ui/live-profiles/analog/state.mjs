import {analogDescriptors, analogIdentity} from './facts.mjs';

const stateFields = Object.freeze(['version', 'profile', 'dllSha256', 'guiSha256', 'graphicsSha256', 'values']);
const fail = message => { throw new Error(`Analog: ${message}`); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exactKeys = (value, keys) => record(value) && Reflect.ownKeys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));

export function validateAnalogDescriptors(parameters) {
  if (!Array.isArray(parameters) || parameters.length !== analogDescriptors.length) fail('expected all 203 native descriptors.');
  for (const expected of analogDescriptors) {
    const actual = parameters[expected.index];
    if (!Object.hasOwn(parameters, expected.index) || !record(actual)
      || Object.entries(expected).some(([key, value]) => !Object.hasOwn(actual, key) || actual[key] !== value)) {
      fail(`descriptor identity mismatch at index ${expected.index}.`);
    }
  }
  return analogDescriptors;
}

export function validateAnalogState(state) {
  if (!exactKeys(state, stateFields)) fail('expected complete versioned source state.');
  for (const key of stateFields) {
    if (key !== 'values' && state[key] !== analogIdentity[key]) fail(`unsupported ${key} identity.`);
  }
  if (!Array.isArray(state.values) || state.values.length !== analogDescriptors.length) fail('expected 203 native values.');
  const values = [];
  for (const {index, kind, min, max} of analogDescriptors) {
    const value = state.values[index];
    if (!Object.hasOwn(state.values, index) || typeof value !== 'number' || !Number.isFinite(value)
      || value < min || value > max || kind === 3 && !Number.isInteger(value)) fail(`invalid native value at index ${index}.`);
    values.push(Math.fround(value));
  }
  return {...state, values};
}

export function patchAnalogState(state, updates) {
  const next = validateAnalogState(state);
  if (!Array.isArray(updates) || !updates.length || updates.length > analogDescriptors.length) fail('expected a bounded state batch.');
  const seen = new Set();
  for (const update of updates) {
    if (!exactKeys(update, ['index', 'value']) || !Number.isInteger(update.index)
      || update.index < 0 || update.index >= analogDescriptors.length || seen.has(update.index)) fail('invalid or duplicate native update.');
    seen.add(update.index);
    next.values[update.index] = update.value;
  }
  return validateAnalogState(next);
}
