import test from 'node:test';
import assert from 'node:assert/strict';
import {analogIdentity, analogDescriptors} from './facts.mjs';
import {validateAnalogDescriptors, validateAnalogState, patchAnalogState} from './state.mjs';

const source = () => ({version: 1, profile: analogIdentity.profile,
  dllSha256: analogIdentity.dllSha256, guiSha256: analogIdentity.guiSha256,
  graphicsSha256: analogIdentity.graphicsSha256, values: analogDescriptors.map(row => row.min)});

test('complete explicit state roundtrips all native slots independently', () => {
  const initial = source();
  initial.values[196] = -7.25;
  const restored = validateAnalogState(JSON.parse(JSON.stringify(initial)));
  assert.deepEqual(restored, initial);
  restored.values[196] = 3;
  assert.equal(initial.values[196], -7.25);
  assert.equal(restored.values.length, 203);
  assert.equal(analogIdentity.guiSha256, '75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f');
});

test('sparse, inherited and malformed source state cannot enter the native boundary', () => {
  const initial = source();
  const sparse = [...initial.values];
  delete sparse[201];
  const inherited = Object.assign(Object.create({version: 1}), initial);
  for (const state of [{...initial, values: sparse}, inherited, {...initial, version: 2},
    {...initial, extra: true}, {...initial, [Symbol('extra')]: 1},
    {...initial, guiSha256: '5ec872d673fd5f4f5f05787e4245c56e172ff2663c2d4493e94d598b883114e6'},
    {...initial, values: initial.values.slice(1)}]) assert.throws(() => validateAnalogState(state));
  for (const [index, value] of [[0, .5], [196, -11], [2, NaN], [2, Infinity], [2, '0']]) {
    const values = [...initial.values]; values[index] = value;
    assert.throws(() => validateAnalogState({...initial, values}));
  }
});

test('state batches are transactional and preserve unrepresented native slots', () => {
  const initial = source(); initial.values[202] = -4.5;
  const next = patchAnalogState(initial, [{index: 39, value: .75}, {index: 40, value: 1}]);
  assert.equal(next.values[39], .75); assert.equal(next.values[40], 1);
  assert.equal(next.values[202], -4.5); assert.equal(initial.values[39], 0);
  for (const updates of [[], [{index: 2, value: .5}, {index: 29, value: .25}],
    [{index: 203, value: 0}], [{index: 2, value: .5}, {index: 2, value: .7}],
    [{index: 2, value: .5, extra: 1}]]) assert.throws(() => patchAnalogState(initial, updates));
  assert.equal(initial.values[2], 0);
});

test('every descriptor is checked including currently unbound native slots', () => {
  const catalog = analogDescriptors.map(row => ({...row}));
  assert.equal(validateAnalogDescriptors(catalog), analogDescriptors);
  for (const field of ['index', 'module', 'property', 'kind', 'min', 'max']) {
    const changed = catalog.map(row => ({...row})); changed[202][field] += 1;
    assert.throws(() => validateAnalogDescriptors(changed), /202/);
  }
  assert.throws(() => validateAnalogDescriptors(catalog.slice(1)));
});
