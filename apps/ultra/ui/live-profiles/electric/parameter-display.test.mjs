import assert from 'node:assert/strict';
import test from 'node:test';
import * as displays from './parameter-display.mjs';
import {electricModelFields} from './default-model.mjs';

const display = key => {
  const result = displays.electricParameterDisplay(key);
  assert.ok(result?.qualified, `${key} must have a qualified display`);
  return result;
};

test('Electric percentage controls use their host formatter and preserve bipolar distinctions', () => {
  for (const key of ['MalletStiffness', 'MalletNoiseAmount', 'ForkReleaseTime', 'ForkTineDecay', 'PickupDistance', 'PickupAmpIn', 'DamperAmount']) {
    const d = display(key);
    for (const [raw, text] of [[0, '0 %'], [.12, '12 %'], [.5, '50 %'], [.87, '87 %'], [1, '100 %']]) assert.equal(d.format(raw), text, key);
    assert.equal(d.parse('25 %'), .25, key);
    assert.equal(d.parse('7.1 %'), 0.07099999487400055, key);
  }
  for (const key of ['KeyboardStretch', 'DamperBalance']) {
    const d = display(key);
    for (const [raw, text] of [[0, '-100 %'], [.125, '-75 %'], [.5, '0 %'], [.875, '75 %'], [1, '100 %']]) assert.equal(d.format(raw), text, key);
    assert.equal(d.parse('-75 %'), 0.1250000149011612);
  }
});

test('Electric keyboard and velocity amounts retain numbers without a percent suffix', () => {
  for (const key of ['MalletStiffnessKeyboard', 'MalletStiffnessVelocity', 'MalletForceKeyboard', 'MalletForceVelocity', 'MalletNoiseKeyboardScaling', 'ForkTineKeyboardScaling', 'PickupAmpKeyboardScaling']) {
    const d = display(key);
    for (const [raw, text] of [[0, '0'], [.12, '12'], [.5, '50'], [.87, '87'], [1, '100']]) assert.equal(d.format(raw), text, key);
    assert.equal(d.parse('25'), .25);
  }
});

test('Electric volume retains the compiled curve, infinity endpoint and default readout', () => {
  const d = display('Volume');
  for (const [raw, text] of [[0, '-inf dB'], [.125, '-30 dB'], [.25, '-18 dB'], [.5, '-6.0 dB'], [.7047892213, '0.0 dB'], [.875, '3.7 dB'], [1, '6.0 dB']]) assert.equal(d.format(raw), text);
  assert.equal(d.parse('-inf dB'), 0);
  assert.ok(Math.abs(d.parse('0 dB') - .7047892213) < 2e-7);
  assert.ok(Math.abs(d.toDisplay(.25) - -17.92555046081543) < 1e-6);
  assert.ok(Math.abs(d.parse('-17.92555046081543 dB') - .25) < 1e-7);
});

test('Electric transpose, fine tune and bend retain distinct source offsets and units', () => {
  const transpose = display('KeyboardTranspose');
  for (const [raw, text] of [[0, '-12 st'], [5, '-7 st'], [12, '0 st'], [19, '7 st'], [24, '12 st']]) assert.equal(transpose.format(raw), text);
  assert.equal(transpose.parse('-7 st'), 5);
  assert.equal(transpose.parse('7 st'), 19);
  const fine = display('KeyboardFineTune');
  for (const [raw, text] of [[0, '-0.50'], [.125, '-0.38'], [.25, '-0.25'], [.5, '0.00'], [.875, '0.38'], [1, '0.50']]) assert.equal(fine.format(raw), text);
  assert.ok(Math.abs(fine.parse('-0.25') - .25) < 1e-7);
  const bend = display('PitchBendRange');
  for (const [raw, text] of [[0, '0.00'], [.125, '1.50'], [.5, '6.00'], [1, '12.00']]) assert.equal(bend.format(raw), text);
  assert.equal(bend.parse('3'), .25);
  assert.equal(display('PerNotePitchBendRange').format(24), '24 st');
  assert.equal(display('PerNotePitchBendRange').parse('12 st'), 12);
});

test('Electric selector labels use constructor order and polyphony uses displayed voice counts', () => {
  const pickup = display('PickupModel');
  assert.deepEqual(pickup.options, [{value: 0, label: 'R'}, {value: 1, label: 'W'}]);
  assert.equal(pickup.format(0), 'R');
  assert.equal(pickup.format(1), 'W');
  assert.equal(pickup.parse('R'), 0);
  assert.equal(pickup.parse('W'), 1);
  const polyphony = display('Polyphony');
  for (const [raw, text] of [[0, '2'], [3, '5'], [15, '17'], [30, '32']]) {
    assert.equal(polyphony.format(raw), text);
    assert.equal(polyphony.parse(text), raw);
  }
});

test('Electric display parsing rejects invalid text and out-of-range states without clamping', () => {
  for (const [key, bad] of [['MalletStiffness', ['101 %', '-1 %', '50 ms', 'NaN', 'Infinity', '']], ['Volume', ['7 dB', '50 %', 'Infinity dB']], ['KeyboardTranspose', ['-13 st', '13 st', '1.5 st']], ['PerNotePitchBendRange', ['49 st', '-1 st']], ['PickupModel', ['X', '2']], ['Polyphony', ['1', '33']]]) {
    const d = display(key);
    for (const text of bad) assert.ok(Number.isNaN(d.parse(text)), `${key}: ${text}`);
    for (const raw of [NaN, Infinity, -Infinity, undefined, '0.5']) assert.equal(d.format(raw), '--');
  }
});

test('every original model field has an explicit display qualification or unsupported reason', () => {
  assert.deepEqual(displays.electricDisplayCatalog.map(row => row.key), electricModelFields);
  const unsupported = displays.electricDisplayCatalog.filter(row => !row.qualified);
  assert.deepEqual(unsupported.map(row => row.key), ['On']);
  assert.match(unsupported[0].reason, /host-owned/);
  assert.equal(displays.electricParameterDisplay('FutureField'), null);
});
