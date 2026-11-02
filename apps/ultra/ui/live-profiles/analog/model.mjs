import {analogParameterFacts} from '../../analog-parameter-facts.mjs';
import {analogPresetParameters} from '../../analog-bindings.mjs';
import {analogDescriptors, analogQualification} from './facts.mjs';
import {validateAnalogDescriptors, validateAnalogState, patchAnalogState} from './state.mjs';

const reversedBalances = new Set(['NoiseBalance', 'SignalChain1.OscillatorBalance', 'SignalChain2.OscillatorBalance']);
// Current-host vector slots 81/164 read LFOGateReset, not these historical keys.
const contradictedKeys = new Set(['SignalChain1.LFOSyncToggle', 'SignalChain2.LFOSyncToggle']);
const specifications = analogParameterFacts.filter(([key]) => !contradictedKeys.has(key))
  .map(([key, index, , , kind, min, max, offset]) => Object.freeze({
  key, indices: Object.freeze([index]), kind, min: min - offset, max: max - offset,
  decode: values => reversedBalances.has(key) ? 1 - values[index] : values[index] - offset,
}));
for (const [chain, index] of [[1, 39], [2, 122]]) {
  specifications.push(Object.freeze({key: `SignalChain${chain}.OscillatorEnvAmount`,
    indices: Object.freeze([index, index + 1]), kind: 0, min: -1, max: 1,
    decode: values => values[index] * (values[index + 1] ? -1 : 1)}));
}
export const analogModelSpecifications = Object.freeze(specifications);
const modelKeys = new Set(specifications.map(spec => spec.key));

export function analogModelValues(state) {
  const {values} = validateAnalogState(state);
  return new Map(specifications.map(spec => [spec.key, spec.decode(values)]));
}

export function planAnalogPreset(values, catalog) {
  if (!(values instanceof Map) || values.size > 256) throw new Error('Analog: expected bounded preset model values.');
  validateAnalogDescriptors(catalog?.parameters);
  const unknownValues = new Map(), mappedKeys = [];
  for (const [key, value] of values) {
    if (typeof key !== 'string' || !key.length || key.length > 256
      || typeof value !== 'boolean' && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error('Analog: invalid preset model field.');
    }
    if (modelKeys.has(key)) mappedKeys.push(key);
    else unknownValues.set(key, value);
  }
  const supportedValues = new Map([...values].filter(([key]) => modelKeys.has(key)));
  const updates = analogPresetParameters(supportedValues, catalog);
  const written = new Set(updates.map(update => update.index));
  const untouchedNativeSlots = analogDescriptors.filter(row => !written.has(row.index)).map(row => row.index);
  return {updates, mappedKeys, unknownValues, untouchedNativeSlots,
    complete: untouchedNativeSlots.length === 0 && unknownValues.size === 0,
    qualification: analogQualification.modelNativeBridge};
}

export function applyAnalogPreset(state, values, catalog) {
  const previous = validateAnalogState(state), plan = planAnalogPreset(values, catalog);
  return {...plan, state: plan.updates.length ? patchAnalogState(previous, plan.updates) : previous};
}
