import test from 'node:test';
import assert from 'node:assert/strict';
import {analogIdentity, analogDescriptors} from './facts.mjs';
import {analogModelSpecifications, analogModelValues, planAnalogPreset, applyAnalogPreset} from './model.mjs';

const source = () => ({version: 1, profile: analogIdentity.profile,
  dllSha256: analogIdentity.dllSha256, guiSha256: analogIdentity.guiSha256,
  graphicsSha256: analogIdentity.graphicsSha256, values: analogDescriptors.map(row => row.min)});
const catalog = state => ({generation: '7', parameters: analogDescriptors.map(row => ({...row,
  value: state.values[row.index], applied: state.values[row.index], revision: 0, applied_revision: 0}))});

test('retained mappings keep model/native encoding separate from physical displays', () => {
  for (const balance of [0, .25, 1]) {
    const state = source();
    const values = new Map([['NoiseBalance', balance], ['SignalChain1.OscillatorBalance', balance],
      ['SignalChain2.OscillatorBalance', balance], ['SignalChain1.OscillatorOct', -3],
      ['SignalChain2.OscillatorSemi', 12], ['SignalChain1.OscillatorEnvAmount', -.75],
      ['SignalChain2.OscillatorEnvAmount', .5]]);
    const plan = applyAnalogPreset(state, values, catalog(state));
    for (const index of [26, 38, 121]) assert.equal(plan.state.values[index], 1 - balance);
    assert.deepEqual(plan.updates.filter(row => [39, 40].includes(row.index)), [{index: 39, value: .75}, {index: 40, value: 1}]);
    assert.equal(plan.state.values[30], 0); assert.equal(plan.state.values[114], 24);
    const restored = analogModelValues(plan.state);
    for (const [key, value] of values) assert.equal(restored.get(key), value);
  }
});

test('coverage reports all missing slots and preserves unknown model values', () => {
  const state = source(); state.values[202] = -2.25;
  const values = new Map(analogModelSpecifications.map(spec => [spec.key, spec.min]));
  values.set('FutureControl', true);
  const result = applyAnalogPreset(state, values, catalog(state));
  assert.equal(result.mappedKeys.length, 124); assert.equal(result.updates.length, 126);
  assert.equal(result.untouchedNativeSlots.length, 77); assert.equal(result.complete, false);
  assert.deepEqual([...result.unknownValues], [['FutureControl', true]]);
  assert.equal(result.state.values[202], -2.25);
  assert.equal(result.state.values[87], state.values[87]);
  assert.equal(result.qualification, 'historical-mapping');
});

test('current host contradictions quarantine historical LFO sync toggle writes', () => {
  const state = source(); state.values[81] = 1; state.values[164] = 1;
  const values = new Map([['SignalChain1.LFOSyncToggle', false], ['SignalChain2.LFOSyncToggle', false]]);
  const result = applyAnalogPreset(state, values, catalog(state));
  assert.deepEqual(result.updates, []);
  assert.deepEqual(result.mappedKeys, []);
  assert.deepEqual([...result.unknownValues], [...values]);
  assert.equal(result.state.values[81], 1); assert.equal(result.state.values[164], 1);
  for (const key of values.keys()) assert.equal(analogModelValues(state).has(key), false);
});

test('unsupported controls never acquire an encoded update', () => {
  const state = source(), values = new Map([['SignalChain1.FilterType', 4], ['SetRouting1', true],
    ['Polyphony', 8], ['SignalChain1.LFOSync', 13]]);
  const result = planAnalogPreset(values, catalog(state));
  assert.deepEqual(result.updates, []); assert.deepEqual(result.mappedKeys, []);
  assert.deepEqual([...result.unknownValues], [...values]);
  assert.equal(result.untouchedNativeSlots.length, 203);
});

test('invalid descriptors and model values reject before any state is changed', () => {
  const state = source(), before = structuredClone(state), wrong = catalog(state);
  wrong.parameters[202].property++;
  assert.throws(() => applyAnalogPreset(state, new Map([['Volume', .5]]), wrong), /202/);
  for (const values of [new Map([['Volume', 2]]), new Map([['SignalChain1.OscillatorOct', .5]]),
    new Map([['FutureControl', NaN]]), new Map([['FutureControl', {}]])]) {
    assert.throws(() => applyAnalogPreset(state, values, catalog(state)));
  }
  assert.deepEqual(state, before);
});
