import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodeElectricParameter, electricParameterMapping, encodeElectricParameter,
} from './parameter-mapping.mjs';

test('PickupModel preserves both saved enum values through the qualified native signature', () => {
  assert.deepEqual(electricParameterMapping('PickupModel'), {
    key: 'PickupModel', index: 23, module: 616, property: 11, kind: 3, min: 0, max: 1,
    authority: 'current-host-static', runtimeQualified: false,
  });
  for (const value of [0, 1]) {
    const update = encodeElectricParameter('PickupModel', value);
    assert.deepEqual(update, {index: 23, value});
    assert.equal(decodeElectricParameter('PickupModel', update), value);
  }
});

test('enum conversion rejects coercion, fractions, unrelated indices and unqualified properties', () => {
  for (const value of [-1, 2, 0.5, NaN, Infinity, '0', true, null, undefined]) {
    assert.throws(() => encodeElectricParameter('PickupModel', value), /PickupModel/);
    assert.throws(() => decodeElectricParameter('PickupModel', {index: 23, value}), /PickupModel/);
  }
  for (const index of [0, 22, 24, '23', null]) {
    assert.throws(() => decodeElectricParameter('PickupModel', {index, value: 0}), /index/);
  }
  for (const key of ['PickupModel.Current', 'On', 'PerNotePitchBendRange', 'NoSuchProperty']) {
    assert.equal(electricParameterMapping(key), null);
    assert.throws(() => encodeElectricParameter(key, 0), /unqualified/);
    assert.throws(() => decodeElectricParameter(key, {index: 23, value: 0}), /unqualified/);
  }
});

test('Polyphony, transpose and the separate dummy bend field preserve discrete raw values', () => {
  for (const [key, index, max] of [['Polyphony', 0, 30], ['KeyboardTranspose', 30, 24], ['DummyPerNotePitchBendRange', 32, 48]]) {
    assert.equal(electricParameterMapping(key)?.index, index, key);
    for (let value = 0; value <= max; value++) {
      assert.deepEqual(encodeElectricParameter(key, value), {index, value});
      assert.equal(decodeElectricParameter(key, {index, value}), value);
    }
    for (const value of [-1, max + 1, .5, NaN, Infinity, '0', null]) {
      assert.throws(() => encodeElectricParameter(key, value), new RegExp(key));
      assert.throws(() => decodeElectricParameter(key, {index, value}), new RegExp(key));
    }
    assert.throws(() => decodeElectricParameter(key, {index: index + 1, value: 0}), /index/);
  }
});

test('all normalized real vector fields retain raw values through their exact native indices', () => {
  const expected = [
    ['PitchBendRange', 1], ['Volume', 2], ['KeyboardFineTune', 3], ['MalletStiffness', 4],
    ['MalletStiffnessKeyboard', 5], ['MalletStiffnessVelocity', 6], ['MalletForceStrength', 7],
    ['MalletForceKeyboard', 8], ['MalletForceVelocity', 9], ['MalletNoisePitch', 10],
    ['MalletNoiseDecay', 11], ['MalletNoiseAmount', 12], ['MalletNoiseKeyboardScaling', 13],
    ['ForkReleaseTime', 14], ['ForkTineDecay', 15], ['ForkTineVolume', 16],
    ['ForkTineKeyboardScaling', 17], ['ForkTineColor', 18], ['ForkToneBarDecay', 19],
    ['ForkToneBarVolume', 20], ['PickupSymmetry', 21], ['PickupDistance', 22],
    ['PickupAmpIn', 24], ['PickupAmpOut', 25], ['PickupAmpKeyboardScaling', 26],
    ['DamperTone', 27], ['DamperAmount', 28], ['DamperBalance', 29], ['KeyboardStretch', 31],
  ];
  for (const [key, index] of expected) {
    const fact = electricParameterMapping(key);
    assert.equal(fact?.index, index, key);
    assert.equal(fact.min, 0);
    assert.equal(fact.max, 1);
    assert.equal(fact.runtimeQualified, false);
    for (const value of [0, .125, .5, .875, 1]) {
      assert.deepEqual(encodeElectricParameter(key, value), {index, value});
      assert.equal(decodeElectricParameter(key, {index, value}), value);
    }
    for (const value of [-1, 2, NaN, Infinity, '0.5', null]) {
      assert.throws(() => encodeElectricParameter(key, value), new RegExp(key));
    }
  }
});

test('pickup real mappings preserve endpoints and asymmetric normalized values', () => {
  for (const [key, index, property] of [['PickupSymmetry', 21, 1], ['PickupDistance', 22, 2]]) {
    assert.deepEqual(electricParameterMapping(key), {
      key, index, module: 616, property, kind: 0, min: 0, max: 1,
      authority: 'current-host-static', runtimeQualified: false,
    });
    for (const value of [0, 0.125, 0.5, 0.875, 1]) {
      assert.deepEqual(encodeElectricParameter(key, value), {index, value});
      assert.equal(decodeElectricParameter(key, {index, value}), value);
    }
    for (const value of [-0.01, 1.01, NaN, Infinity, '0.5', true, null, undefined]) {
      assert.throws(() => encodeElectricParameter(key, value), new RegExp(key));
      assert.throws(() => decodeElectricParameter(key, {index, value}), new RegExp(key));
    }
    assert.throws(() => decodeElectricParameter(key, {index: index === 21 ? 22 : 21, value: 0.5}), /index/);
  }
});
