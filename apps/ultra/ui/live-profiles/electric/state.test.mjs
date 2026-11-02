import assert from 'node:assert/strict';
import test from 'node:test';

import * as module from './state.mjs';

function sourceState() {
  return {
    version: 1, profile: 'live12-electric-v1',
    dllSha256: '66a42b09161ca7d48861e1980523e2cb44dd4f08fbd04ac9c4231a56d79b2be8',
    guiSha256: '75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f',
    graphicsSha256: 'ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d',
    // Synthetic bounded commanded values, never an Electric default preset.
    values: Array.from({length: 33}, (_, index) => ({0: 12, 1: .25, 3: .5, 23: 1, 30: 12, 32: 24}[index] ?? 0)),
  };
}

test('complete commanded state is copied without exposing mutable ownership', () => {
  assert.equal(typeof module.validateElectricState, 'function', 'Electric state validation must exist');
  const source = sourceState();
  const validated = module.validateElectricState(source);
  assert.deepEqual(validated, source);
  validated.values[0] = 2;
  assert.equal(source.values[0], 12);
});

test('state rejects missing, foreign, oversized and nonfinite source state', () => {
  assert.equal(typeof module.validateElectricState, 'function');
  const invalid = [null, [], {...sourceState(), profile: 'live12-analog-v1'},
    {...sourceState(), version: 2}, {...sourceState(), dllSha256: '0'.repeat(64)},
    {...sourceState(), guiSha256: '0'.repeat(64)}, {...sourceState(), graphicsSha256: '0'.repeat(64)},
    {...sourceState(), selectedFinger: 2}, {...sourceState(), values: Array(32).fill(0)},
    {...sourceState(), values: Array(34).fill(0)}, {...sourceState(), values: new Float32Array(33)}];
  for (const input of invalid) assert.throws(() => module.validateElectricState(input));
  for (const [index, value] of [[0, 31], [23, .5], [30, 25], [32, 49], [8, -1], [8, NaN], [8, Infinity], [8, '0']]) {
    const source = sourceState();
    source.values[index] = value;
    assert.throws(() => module.validateElectricState(source), `reject slot ${index}=${value}`);
  }
  const sparse = sourceState(); delete sparse.values[8];
  assert.throws(() => module.validateElectricState(sparse), 'sparse complete state is invalid');
});

test('atomic update failure leaves the previous state untouched', () => {
  assert.equal(typeof module.patchElectricState, 'function');
  const source = sourceState();
  const before = structuredClone(source);
  assert.throws(() => module.patchElectricState(source, [{index: 8, value: .8}, {index: 23, value: .5}]));
  assert.deepEqual(source, before);
  for (const updates of [[], [{index: 8, value: .2}, {index: 8, value: .3}], [{index: 33, value: 0}], [{index: 8, value: .2, extra: true}]]) {
    assert.throws(() => module.patchElectricState(source, updates));
  }
  const next = module.patchElectricState(source, [{index: 8, value: .8}, {index: 23, value: 0}]);
  assert.equal(next.values[8], Math.fround(.8));
  assert.equal(next.values[23], 0);
  assert.deepEqual(source, before);
});

test('descriptor admission requires every exact signature in index order', () => {
  assert.equal(typeof module.validateElectricDescriptors, 'function');
  assert.equal(typeof module.electricDescriptors, 'object');
  const catalog = module.electricDescriptors.map(row => ({...row}));
  assert.equal(module.validateElectricDescriptors(catalog).length, 33);
  for (let index = 0; index < catalog.length; index++) {
    for (const field of ['index', 'module', 'property', 'kind', 'min', 'max']) {
      const changed = structuredClone(catalog);
      changed[index][field] += 1;
      assert.throws(() => module.validateElectricDescriptors(changed), `reject index ${index} ${field}`);
    }
  }
  assert.throws(() => module.validateElectricDescriptors(catalog.slice(1)));
  assert.throws(() => module.validateElectricDescriptors([...catalog, catalog[0]]));
  assert.throws(() => module.validateElectricDescriptors(catalog.toReversed()));
});

test('saved commanded state survives JSON and two edited instances remain independent', () => {
  const first = module.validateElectricState(sourceState());
  const second = module.validateElectricState(sourceState());
  const edited = module.patchElectricState(first, [{index: 8, value: .7}]);
  const reopened = module.validateElectricState(JSON.parse(JSON.stringify(edited)));
  assert.equal(reopened.values[8], Math.fround(.7));
  assert.equal(second.values[8], 0);
  assert.equal(first.values[8], 0);
});
