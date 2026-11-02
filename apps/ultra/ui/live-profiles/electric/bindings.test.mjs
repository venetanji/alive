import assert from 'node:assert/strict';
import test from 'node:test';

import * as module from './bindings.mjs';

test('unqualified Electric properties never create an enabled binding or write', () => {
  assert.equal(typeof module.createElectricBindings, 'function', 'Electric editor boundary must exist');
  let writes = 0;
  const bindings = module.createElectricBindings({send: () => { writes++; }, sendBatch: () => { writes++; }});
  for (const expression of ['PickupModel.Current', 'Volume', 'MalletStiffness', 'DamperBalance', 'NoSuchProperty']) {
    assert.equal(bindings.resolve({scope: [], expression}), null);
  }
  assert.equal(writes, 0);
  assert.equal(bindings.evaluate({value: 'Volume', scope: []}), undefined);
});

test('UI navigation remains distinct from native mappings and persisted DSP state', () => {
  assert.equal(typeof module.electricConnectionStatus, 'function');
  assert.equal(module.electricConnectionStatus({scope: [], expression: 'SelectedFinger'}).authority, 'editor');
  assert.equal(module.electricConnectionStatus({scope: ['doc'], expression: 'ShowSplashScreen'}).authority, 'editor');
  assert.equal(module.electricConnectionStatus({scope: [], expression: 'PickupModel.Current'}).authority, 'unqualified-model');
  assert.equal(module.electricConnectionStatus({scope: [], expression: 'doc'}).authority, 'scope');
  assert.equal(module.electricConnectionStatus({scope: ['Foreign'], expression: 'SelectedFinger'}).authority, 'unknown');
});

test('installed model snapshots retain known values without acquiring a write binding', () => {
  const source = new Map([['MalletStiffness', .5], ['PickupDistance', .25], ['PickupModel', 0], ['On', true], ['FutureField', .9]]);
  let writes = 0;
  const bindings = module.createElectricBindings({modelValues: source, send: () => { writes++; }});
  source.set('MalletStiffness', .9);
  const stiffness = bindings.resolve({scope: [], expression: 'MalletStiffness'});
  assert.equal(stiffness.verified, true);
  assert.equal(stiffness.onChange, undefined);
  assert.equal(stiffness.onInput, undefined);
  assert.deepEqual(stiffness.getState(), {
    enabled: false, known: true, pending: false, value: .5, initial: .5,
    authority: 'installed-model-snapshot',
  });
  assert.equal(stiffness.display.format(.5), '50 %');
  assert.equal(stiffness.display.format(.25), '25 %');
  assert.equal(stiffness.display.parse('50 %'), .5);
  const pickup = bindings.resolve({scope: ['doc'], expression: 'PickupDistance'});
  assert.equal(pickup.min, 0);
  assert.equal(pickup.max, 1);
  assert.equal(pickup.getState().value, .25);
  assert.equal(pickup.display.format(.25), '25 %');
  const selector = bindings.resolve({scope: [], expression: 'PickupModel.Current'});
  assert.equal(selector.getState().value, 0);
  assert.deepEqual(selector.options, [{value: 0, label: 'R'}, {value: 1, label: 'W'}]);
  for (const connection of [
    {scope: ['Foreign'], expression: 'MalletStiffness'}, {scope: ['doc', 'doc'], expression: 'MalletStiffness'},
    {scope: [], expression: 'FutureField'}, {scope: [], expression: 'Volume'},
    {scope: [], expression: 'SelectedFinger'}, {scope: [], expression: 'ShowSplashScreen'},
  ]) assert.equal(bindings.resolve(connection), null);
  assert.equal(writes, 0);
});

test('model snapshot construction rejects malformed values before exposing any binding', () => {
  for (const value of [NaN, Infinity, '0.5', null, undefined, false]) {
    assert.throws(() => module.createElectricBindings({modelValues: new Map([['MalletStiffness', value]])}), /model snapshot/);
  }
  assert.throws(() => module.createElectricBindings({modelValues: {MalletStiffness: .5}}), /model snapshot/);
  assert.throws(() => module.createElectricBindings({modelValues: new Map([['On', 1]])}), /model snapshot/);
});

test('static Electric displays preserve unsupported and out-of-range model values without enabling positions', () => {
  const bindings = module.createElectricBindings({modelValues: new Map([['MalletStiffness', 2], ['On', true], ['PerNotePitchBendRange', 24]])});
  const invalid = bindings.resolve({scope: [], expression: 'MalletStiffness'});
  assert.equal(invalid.getState().value, 2);
  assert.equal(invalid.verified, false);
  assert.equal(invalid.display.format(2), '--');
  const activation = bindings.resolve({scope: [], expression: 'On'});
  assert.equal(activation.verified, false);
  assert.equal(activation.getState().enabled, false);
  const bend = bindings.resolve({scope: [], expression: 'PerNotePitchBendRange'});
  assert.equal(bend.verified, true);
  assert.equal(bend.min, 0);
  assert.equal(bend.max, 48);
  assert.equal(bend.display.format(24), '24 st');
  assert.equal(bend.getState().enabled, false);
  assert.equal(bend.onChange, undefined);
});
