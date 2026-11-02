import {analogDescriptors} from './facts.mjs';
import {analogNativeVectorFacts} from './native-vector.mjs';
import {validateAnalogDescriptors, validateAnalogState, patchAnalogState} from './state.mjs';

export const analogBridgeEvidence = Object.freeze({
  packetRevision: 2,
  packetSha256: 'f5ec6579cfbaf6203bfb1b9ac7e5e16be79055b356a109911d003a216b45730a',
  hostSha256: '5f0afddc288b352e92672de2df9175eaf81c9898fb5bd5faef6a09f155c45d26',
  vector: '0x1440dab70', chainVector: '0x1440d35f0', envelopeVector: '0x1440d0f10',
  indexerFactory: '0x14414d270', sourceFactory: '0x14414e5b0',
  normalizedSetup: '0x144132d80', signedSetup: '0x144132fb0',
  extendedAmountSetup: '0x1441333a0', linearConverter: '0x14323fe90',
  ordinaryBoolSetup: '0x1440d1082', ordinaryBoolSource: '0x1411048d0',
  ordinaryBoolReceiver: '0x1435ddbf0', ordinaryBoolOutput: '0x140b0a9d0',
  dummyPitchSetup: '0x1440dd6f2', quantizingConverter: '0x14323d1f0',
  polarizer: '0x143fb2f50', filterType: '0x141365dc0', polyphony: '0x143fb2d80',
  nativeWrite: '0x143fee0c0',
  authority: 'current-host-static', runtimeQualified: false,
});

export const analogCurrentVector = Object.freeze(analogNativeVectorFacts.map(row => Object.freeze({
  ...row, descriptor: analogDescriptors[row.index],
})));

export const analogCurrentMappings = Object.freeze(analogCurrentVector.filter(row => row.source).map(row => {
  const indices = row.kind === 1 || row.kind === 3 ? [row.index, row.index + 1]
    : row.kind === 5 ? [row.index, row.extraIndex] : [row.index];
  const min = row.source.min ?? 0;
  const max = row.source.max ?? (row.kind === 3 || row.kind === 5 ? 9 : row.descriptor.max);
  return Object.freeze({...row, indices: Object.freeze(indices), min, max,
    qualification: 'current-host-static', runtimeQualified: false});
}));
const mappings = new Map(analogCurrentMappings.map(row => [row.model, row]));
const secondaryMappings = new Map(analogCurrentMappings.filter(row => row.secondary).map(row => [row.secondary, row]));

function mapping(key) {
  const row = mappings.get(key);
  if (!row) throw new Error(`Analog ${String(key)} source conversion is unqualified.`);
  return row;
}

function modelValue(row, value) {
  if (row.source.type === 'bool') {
    if (typeof value !== 'boolean') throw new Error(`Analog ${row.model} requires a boolean.`);
    return value ? 1 : 0;
  }
  if (!Number.isFinite(value) || value < row.min || value > row.max
    || ['enum', 'int', 'gated'].includes(row.source.type) && !Number.isInteger(value)) {
    throw new Error(`Analog ${row.model} requires ${['enum', 'int', 'gated'].includes(row.source.type) ? 'an integer' : 'a finite number'} from ${row.min} to ${row.max}.`);
  }
  return value === 0 ? 0 : Math.fround(value);
}

function nativeValue(index, value) {
  const row = analogDescriptors[index];
  if (!Number.isFinite(value) || value < row.min || value > row.max || row.kind === 3 && !Number.isInteger(value)) {
    throw new Error(`Analog native parameter ${index} is invalid.`);
  }
  return Math.fround(value);
}

export function encodeAnalogCurrentParameter(key, value, secondaryValue) {
  const row = mapping(key), input = modelValue(row, value), index = row.index;
  let toggle;
  if (row.kind === 2) {
    if (row.source.toggleType === 'bool' ? typeof secondaryValue !== 'boolean' : secondaryValue !== 0 && secondaryValue !== 1) {
      throw new Error(`Analog ${key} requires its explicit ${row.secondary} value.`);
    }
    toggle = Boolean(secondaryValue);
  }
  const updates = row.kind === 1 ? [{index, value: Math.abs(input)}, {index: index + 1, value: input < 0 ? 1 : 0}]
    : row.kind === 2 ? [{index, value: toggle ? input + 1 : 0}]
    : row.kind === 3 ? [{index, value: input >> 1}, {index: index + 1, value: input & 1}]
    : row.kind === 5 ? [{index, value: Math.max(input - 1, 0)}, {index: row.extraIndex, value: input > .5 ? 1 : 0}]
    : [{index, value: row.kind === 6 ? Math.fround(input * row.multiply + row.offset) : input}];
  return updates.map(update => ({index: update.index, value: nativeValue(update.index, update.value)}));
}

export function decodeAnalogCurrentParameter(key, updates, dormantValue) {
  const row = mapping(key);
  if (!Array.isArray(updates) || updates.length !== row.indices.length) throw new Error(`Analog ${key} requires its complete native group.`);
  const values = new Map();
  for (const update of updates) {
    if (!update || !row.indices.includes(update.index) || values.has(update.index)) throw new Error(`Analog ${key} native indices do not match.`);
    values.set(update.index, nativeValue(update.index, update.value));
  }
  const first = values.get(row.index), second = values.get(row.indices[1]);
  if (row.kind === 2) {
    const enabled = first !== 0, toggle = row.source.toggleType === 'bool' ? enabled : Number(enabled);
    const ambiguous = !enabled && dormantValue === undefined;
    const value = enabled ? modelValue(row, first - 1) : ambiguous ? null : modelValue(row, dormantValue);
    return {value, toggle, ambiguous};
  }
  if (row.kind === 5 && second === 0 && first !== 0) throw new Error(`Analog ${key} native group is not representable.`);
  const value = row.kind === 1 ? first * (second ? -1 : 1)
    : row.kind === 3 ? first * 2 + second
    : row.kind === 5 ? second ? first + 1 : 0
    : row.kind === 6 ? (first - row.offset) / row.multiply : first;
  if (value < row.min || value > row.max) throw new Error(`Analog ${key} native group is not representable.`);
  if (row.source.type === 'bool') return Boolean(value);
  return modelValue(row, value);
}

export function planAnalogCurrentParameters(values, catalog) {
  if (!(values instanceof Map) || values.size > 256) throw new Error('Analog: expected bounded explicit model values.');
  validateAnalogDescriptors(catalog?.parameters);
  const groups = [], unknownValues = new Map();
  for (const [key, value] of values) {
    if (typeof key !== 'string' || !key.length || key.length > 256
      || typeof value !== 'boolean' && !Number.isFinite(value)) throw new Error('Analog: invalid model field.');
    const row = mappings.get(key) ?? secondaryMappings.get(key);
    if (row?.secondary && (!values.has(row.model) || !values.has(row.secondary))) {
      throw new Error(`Analog ${row.model} requires both model fields: ${row.model} and ${row.secondary}.`);
    }
    if (mappings.has(key)) groups.push({key, updates: encodeAnalogCurrentParameter(key, value, values.get(row.secondary))});
    else if (secondaryMappings.has(key)) continue;
    else unknownValues.set(key, value);
  }
  const updates = groups.flatMap(group => group.updates).sort((a, b) => a.index - b.index);
  const written = new Set(updates.map(update => update.index));
  const untouchedNativeSlots = analogDescriptors.filter(row => !written.has(row.index)).map(row => row.index);
  const mappedKeys = groups.flatMap(group => {
    const row = mappings.get(group.key);
    return row.secondary ? [row.model, row.secondary] : [row.model];
  });
  return {groups, updates, mappedKeys, unknownValues, untouchedNativeSlots,
    complete: untouchedNativeSlots.length === 0 && unknownValues.size === 0,
    qualification: 'current-host-static', runtimeQualified: false};
}

export function applyAnalogCurrentParameters(state, values, catalog) {
  const previous = validateAnalogState(state), plan = planAnalogCurrentParameters(values, catalog);
  return {...plan, state: plan.updates.length ? patchAnalogState(previous, plan.updates) : previous};
}

export function decodeAnalogCurrentState(state, dormantValues = new Map()) {
  const previous = validateAnalogState(state);
  if (!(dormantValues instanceof Map) || dormantValues.size > 3) throw new Error('Analog: expected bounded dormant selections.');
  for (const [key, value] of dormantValues) {
    const row = mappings.get(key);
    if (!row || row.kind !== 2) throw new Error(`Analog ${String(key)} is not a dormant selection.`);
    modelValue(row, value);
  }
  const values = new Map(), ambiguousKeys = [];
  for (const row of analogCurrentMappings) {
    const updates = row.indices.map(index => ({index, value: previous.values[index]}));
    const decoded = decodeAnalogCurrentParameter(row.model, updates, dormantValues.get(row.model));
    if (row.secondary) {
      values.set(row.model, decoded.value); values.set(row.secondary, decoded.toggle);
      if (decoded.ambiguous) ambiguousKeys.push(row.model);
    } else values.set(row.model, decoded);
  }
  return {values, ambiguousKeys, qualification: 'current-host-static', runtimeQualified: false};
}
