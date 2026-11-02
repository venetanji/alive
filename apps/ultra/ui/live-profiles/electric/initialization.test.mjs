import assert from 'node:assert/strict';
import test from 'node:test';
import {electricModelFields} from './default-model.mjs';
import {electricNativeModelFields, planElectricInitialization} from './initialization.mjs';

const model = () => new Map(electricModelFields.map(key => [key,
  key === 'On' ? true : key === 'Polyphony' ? 30 : key === 'KeyboardTranspose' ? 12 : key === 'PickupModel' ? 0 : .5,
]));

test('a saved model cannot borrow the visible bend field for the missing dummy native slot', () => {
  const values = model();
  values.set('PerNotePitchBendRange', 0);
  const plan = planElectricInitialization(values);
  assert.equal(plan.ready, false);
  assert.deepEqual(plan.missing, [{key: 'DummyPerNotePitchBendRange', index: 32}]);
  assert.equal(plan.updates, null);
  assert.equal(plan.values, null);
  assert.equal(values.has('DummyPerNotePitchBendRange'), false);
});

test('a complete explicit model creates an immutable ordered33 batch without runtime admission', () => {
  const values = model();
  values.set('DummyPerNotePitchBendRange', 48);
  const plan = planElectricInitialization(values);
  assert.equal(plan.ready, true);
  assert.equal(plan.runtimeQualified, false);
  assert.equal(plan.values.length, 33);
  assert.equal(electricNativeModelFields.length, 33);
  assert.equal(plan.values[0], 30);
  assert.equal(plan.values[30], 12);
  assert.equal(plan.values[32], 48);
  assert.deepEqual(plan.updates.map(update => update.index), Array.from({length: 33}, (_, i) => i));
  values.set('Volume', 0);
  assert.equal(plan.values[2], .5);
  assert.throws(() => { plan.updates[0].value = 0; }, TypeError);
  assert.throws(() => { plan.values[0] = 0; }, TypeError);
});

test('the planner reports every missing native source and rejects invalid present fields atomically', () => {
  assert.equal(planElectricInitialization(new Map()).missing.length, 33);
  for (const bad of [null, {}, [], undefined]) assert.throws(() => planElectricInitialization(bad), /Map/);
  const values = model();
  values.set('Polyphony', .5);
  assert.throws(() => planElectricInitialization(values), /Polyphony/);
  values.set('Polyphony', 30);
  values.set('DummyPerNotePitchBendRange', 49);
  assert.throws(() => planElectricInitialization(values), /DummyPerNotePitchBendRange/);
});
