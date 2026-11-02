import test from 'node:test';
import assert from 'node:assert/strict';
import {analogDescriptors, analogIdentity} from './facts.mjs';
import {analogCurrentVector, analogCurrentMappings, encodeAnalogCurrentParameter,
  decodeAnalogCurrentParameter, planAnalogCurrentParameters, applyAnalogCurrentParameters} from './parameter-mapping.mjs';
import {decodeAnalogCurrentState} from './parameter-mapping.mjs';

const catalog = () => ({parameters: analogDescriptors.map(row => ({...row}))});
const source = () => ({version: 1, profile: analogIdentity.profile,
  dllSha256: analogIdentity.dllSha256, guiSha256: analogIdentity.guiSha256,
  graphicsSha256: analogIdentity.graphicsSha256, values: analogDescriptors.map(row => row.min)});

test('current vector accounts for every native slot without inventing model defaults', () => {
  assert.equal(analogCurrentVector.length, 203);
  for (const [index, row] of analogCurrentVector.entries()) {
    assert.equal(row.index, index); assert.deepEqual(row.descriptor, analogDescriptors[index]);
    assert.equal(Object.hasOwn(row, 'default'), false);
  }
  for (const [index, key] of [[0, 'Polyphony'], [80, 'SignalChain1.LFOSync'],
    [81, 'SignalChain1.LFOGateReset'], [163, 'SignalChain2.LFOSync'],
    [164, 'SignalChain2.LFOGateReset'], [194, 'DummyPerNotePitchBendRange']]) {
    assert.equal(analogCurrentVector[index].model, key);
  }
  assert.equal(analogCurrentVector[80].secondary, 'SignalChain1.LFOSyncToggle');
  assert.equal(analogCurrentVector.filter(row => row.model === null).length, 31);
});

test('all ten filter choices produce one atomic type and slope pair', () => {
  for (const [chain, index] of [[1, 47], [2, 130]]) {
    const key = `SignalChain${chain}.FilterType`;
    for (let choice = 0; choice < 10; choice++) {
      const updates = encodeAnalogCurrentParameter(key, choice);
      assert.deepEqual(updates, [{index, value: choice >> 1}, {index: index + 1, value: choice & 1}]);
      assert.equal(decodeAnalogCurrentParameter(key, updates), choice);
    }
    assert.throws(() => encodeAnalogCurrentParameter(key, 10));
    assert.throws(() => decodeAnalogCurrentParameter(key, [{index, value: 5}, {index: index + 1, value: 0}]), /representable/);
  }
});

test('all 28 signed modulations preserve magnitude and polarity at endpoints and asymmetric values', () => {
  const signed = analogCurrentMappings.filter(row => row.kind === 1);
  assert.equal(signed.length, 28);
  for (const row of signed) for (const value of [-1, -.75, -.125, 0, .125, .75, 1]) {
    const updates = encodeAnalogCurrentParameter(row.model, value);
    assert.deepEqual(updates, [{index: row.index, value: Math.abs(value)}, {index: row.index + 1, value: value < 0 ? 1 : 0}]);
    assert.equal(decodeAnalogCurrentParameter(row.model, updates), value);
  }
});

test('polyphony uses the current count and enable outputs including installed Manual value 3', () => {
  for (let choice = 0; choice < 10; choice++) {
    const updates = encodeAnalogCurrentParameter('Polyphony', choice);
    assert.deepEqual(updates, [{index: 0, value: Math.max(choice - 1, 0)}, {index: 7, value: choice > .5 ? 1 : 0}]);
    assert.equal(decodeAnalogCurrentParameter('Polyphony', updates), choice);
  }
  assert.deepEqual(encodeAnalogCurrentParameter('Polyphony', 3), [{index: 0, value: 2}, {index: 7, value: 1}]);
  assert.throws(() => decodeAnalogCurrentParameter('Polyphony', [{index: 0, value: 2}, {index: 7, value: 0}]), /representable/);
});

test('qualified source ranges remain separate from native limits and display formatting', () => {
  for (const key of ['PitchBendRange', 'Volume', 'NoiseBalance', 'SignalChain1.AmplifierPan',
    'ChannelPressureAmount1', 'MpeCC74Amount2']) {
    const row = analogCurrentMappings.find(row => row.model === key);
    for (const value of [row.min, .125, .875, row.max]) {
      const updates = encodeAnalogCurrentParameter(key, value);
      assert.equal(decodeAnalogCurrentParameter(key, updates), value);
    }
  }
  assert.throws(() => encodeAnalogCurrentParameter('ChannelPressureAmount1', 2));
  for (const value of [NaN, Infinity, '0', true, null]) assert.throws(() => encodeAnalogCurrentParameter('Volume', value));
  assert.throws(() => encodeAnalogCurrentParameter('SignalChain1.FilterType', .5));
});

test('31 current boolean fields include four ordinary envelope sources and 27 timeable controls', () => {
  const booleans = analogCurrentMappings.filter(row => row.source.type === 'bool');
  assert.equal(booleans.length, 31);
  for (const row of booleans) for (const value of [false, true]) {
    const updates = encodeAnalogCurrentParameter(row.model, value);
    assert.deepEqual(updates, [{index: row.index, value: value ? 1 : 0}]);
    assert.equal(decodeAnalogCurrentParameter(row.model, updates), value);
  }
  assert.deepEqual(encodeAnalogCurrentParameter('SignalChain1.LFOGateReset', true), [{index: 81, value: 1}]);
  for (const value of [0, 1, .5, 'true', null]) assert.throws(() => encodeAnalogCurrentParameter('VibratoToggle', value));
});

test('five hidden model sources require explicit values and never alias saved pitch-bend fields', () => {
  for (const [chain, envelope, index] of [[1, 0, 87], [1, 1, 99], [2, 0, 170], [2, 1, 182]]) {
    const key = `SignalChain${chain}.Envelope[${envelope}].ToggleDummy`;
    for (const value of [false, true]) assert.deepEqual(encodeAnalogCurrentParameter(key, value), [{index, value: Number(value)}]);
  }
  for (const value of [0, .25, 12, 47.75, 48]) {
    const updates = encodeAnalogCurrentParameter('DummyPerNotePitchBendRange', value);
    assert.deepEqual(updates, [{index: 194, value}]);
    assert.equal(decodeAnalogCurrentParameter('DummyPerNotePitchBendRange', updates), value);
  }
  for (const value of [-1, 49, true, null]) assert.throws(() => encodeAnalogCurrentParameter('DummyPerNotePitchBendRange', value));
  const plan = planAnalogCurrentParameters(new Map([['PerNotePitchBendRange', 48]]), catalog());
  assert.equal(plan.updates.length, 0); assert.equal(plan.unknownValues.get('PerNotePitchBendRange'), 48);
  const explicit = new Map(analogCurrentMappings.map(row => [row.model, row.source.type === 'bool' ? false : row.min]));
  for (const row of analogCurrentMappings.filter(row => row.secondary)) explicit.set(row.secondary, row.source.toggleType === 'bool' ? false : 0);
  const complete = planAnalogCurrentParameters(explicit, catalog());
  assert.equal(complete.groups.length, 172); assert.equal(complete.mappedKeys.length, 175);
  assert.equal(complete.updates.length, 203); assert.equal(complete.complete, true);
  assert.deepEqual(complete.untouchedNativeSlots, []); assert.equal(complete.runtimeQualified, false);
});

test('six octave and semitone quantizers preserve every signed integer and reject fractions', () => {
  for (const key of ['Octave', 'Transpose', 'SignalChain1.OscillatorOct', 'SignalChain1.OscillatorSemi',
    'SignalChain2.OscillatorOct', 'SignalChain2.OscillatorSemi']) {
    const row = analogCurrentMappings.find(row => row.model === key);
    for (let value = row.min; value <= row.max; value++) {
      const updates = encodeAnalogCurrentParameter(key, value);
      assert.deepEqual(updates, [{index: row.index, value: value + row.offset}]);
      assert.equal(decodeAnalogCurrentParameter(key, updates), value);
    }
    assert.throws(() => encodeAnalogCurrentParameter(key, .25));
  }
});

test('gated selections combine both model fields and preserve dormant-selection ambiguity', () => {
  for (const [key, index, max, on, off] of [['KeyboardUnison', 6, 1, true, false],
    ['SignalChain1.LFOSync', 80, 23, 1, 0], ['SignalChain2.LFOSync', 163, 23, 1, 0]]) {
    for (const value of [0, max]) {
      const enabled = encodeAnalogCurrentParameter(key, value, on);
      assert.deepEqual(enabled, [{index, value: value + 1}]);
      assert.deepEqual(decodeAnalogCurrentParameter(key, enabled), {value, toggle: on, ambiguous: false});
      const disabled = encodeAnalogCurrentParameter(key, value, off);
      assert.deepEqual(disabled, [{index, value: 0}]);
      assert.deepEqual(decodeAnalogCurrentParameter(key, disabled), {value: null, toggle: off, ambiguous: true});
      assert.deepEqual(decodeAnalogCurrentParameter(key, disabled, value), {value, toggle: off, ambiguous: false});
    }
    assert.throws(() => encodeAnalogCurrentParameter(key, 0));
  }
  assert.throws(() => planAnalogCurrentParameters(new Map([['KeyboardUnisonToggle', true]]), catalog()), /requires both/);
});

test('current planner preserves hidden source state absent from the saved model inventory', () => {
  const state = source(); state.values[194] = 12;
  const values = new Map(analogCurrentMappings.map(row => [row.model, row.source.type === 'bool' ? false : row.min]));
  for (const row of analogCurrentMappings.filter(row => row.secondary)) values.set(row.secondary, row.source.toggleType === 'bool' ? false : 0);
  for (const index of [87, 99, 170, 182, 194]) values.delete(analogCurrentVector[index].model);
  values.set('On', true);
  const result = applyAnalogCurrentParameters(state, values, catalog());
  assert.equal(result.groups.length, 167); assert.equal(result.mappedKeys.length, 170); assert.equal(result.updates.length, 198);
  assert.deepEqual(result.untouchedNativeSlots, [87, 99, 170, 182, 194]); assert.equal(result.complete, false);
  assert.equal(result.state.values[194], 12);
  assert.deepEqual([...result.unknownValues], [['On', true]]);
  assert.equal(result.qualification, 'current-host-static'); assert.equal(result.runtimeQualified, false);
  assert.equal(result.groups.find(group => group.key === 'Polyphony').updates.length, 2);
});

test('current planner rejects invalid descriptors and compound updates transactionally', () => {
  const state = source(), before = structuredClone(state), wrong = catalog(); wrong.parameters[202].module++;
  assert.throws(() => applyAnalogCurrentParameters(state, new Map([['Volume', .5]]), wrong), /202/);
  assert.throws(() => applyAnalogCurrentParameters(state, new Map([['Volume', .5], ['SignalChain1.FilterType', 10]]), catalog()));
  assert.throws(() => planAnalogCurrentParameters(new Map([['FutureField', NaN]]), catalog()));
  assert.throws(() => decodeAnalogCurrentParameter('Polyphony', [{index: 0, value: 2}, {index: 0, value: 1}]));
  assert.deepEqual(state, before);
});

test('current state decoding exposes all model fields without inventing dormant selections', () => {
  const initial = new Map(analogCurrentMappings.map(row => [row.model, row.source.type === 'bool' ? false : row.min]));
  for (const row of analogCurrentMappings.filter(row => row.secondary)) initial.set(row.secondary, row.source.toggleType === 'bool' ? false : 0);
  const {state} = applyAnalogCurrentParameters(source(), initial, catalog());
  const result = decodeAnalogCurrentState(state);
  assert.equal(result.values.size, 175);
  assert.deepEqual(result.ambiguousKeys, ['KeyboardUnison', 'SignalChain1.LFOSync', 'SignalChain2.LFOSync']);
  assert.equal(result.values.get('KeyboardUnison'), null);
  assert.equal(result.values.get('KeyboardUnisonToggle'), false);
  assert.equal(result.values.get('SignalChain1.LFOSyncToggle'), 0);
  assert.equal(result.values.get('SignalChain1.LFOGateReset'), false);
  const dormant = new Map([['KeyboardUnison', 1], ['SignalChain1.LFOSync', 23], ['SignalChain2.LFOSync', 0]]);
  const selected = decodeAnalogCurrentState(state, dormant);
  assert.deepEqual(selected.ambiguousKeys, []);
  assert.equal(selected.values.get('SignalChain1.LFOSync'), 23);
  assert.equal(selected.values.get('SignalChain1.LFOSyncToggle'), 0);
  state.values[80] = 7;
  assert.equal(decodeAnalogCurrentState(state, dormant).values.get('SignalChain1.LFOSync'), 6);
  assert.equal(result.runtimeQualified, false);
  assert.throws(() => decodeAnalogCurrentState(state, new Map([['Volume', .5]])), /dormant/);
  assert.throws(() => decodeAnalogCurrentState(state, new Map([['SignalChain1.LFOSync', 24]])));
  state.values[47] = 5;
  assert.throws(() => decodeAnalogCurrentState(state), /representable/);
});
