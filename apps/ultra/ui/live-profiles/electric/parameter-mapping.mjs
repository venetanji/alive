import {electricDescriptors} from './facts.mjs';

export const electricBridgeEvidence = Object.freeze({
  packetRevision: 5,
  packetSha256: '69ceb28c1c5c9515dbed0cb964b203076b64e2e656ae5fc087f2a88a5429d8de',
  hostSha256: '5f0afddc288b352e92672de2df9175eaf81c9898fb5bd5faef6a09f155c45d26',
  modelRegistration: '0x1440c22a8',
  propertyVector: '0x1440bde60',
  indexedUnitBuilder: '0x14414eb00',
  enumIntegerToFloat: '0x143621d00',
  normalizedRealSetup: '0x144132d80',
  normalizedConverter: '0x14323fe90',
  transposeConverter: '0x143747c40',
  dummyBendSetup: '0x1440bf4be',
  floatPlayer: '0x143629100',
  nativeWrite: '0x143fee0c0',
});

// These properties use direct enum or normalized linear source values.
// Physical display formatting and automation timing are separate qualifications.
const mappings = new Map([
  ['Polyphony', 0], ['PitchBendRange', 1], ['Volume', 2], ['KeyboardFineTune', 3], ['MalletStiffness', 4],
  ['MalletStiffnessKeyboard', 5], ['MalletStiffnessVelocity', 6], ['MalletForceStrength', 7],
  ['MalletForceKeyboard', 8], ['MalletForceVelocity', 9], ['MalletNoisePitch', 10],
  ['MalletNoiseDecay', 11], ['MalletNoiseAmount', 12], ['MalletNoiseKeyboardScaling', 13],
  ['ForkReleaseTime', 14], ['ForkTineDecay', 15], ['ForkTineVolume', 16],
  ['ForkTineKeyboardScaling', 17], ['ForkTineColor', 18], ['ForkToneBarDecay', 19],
  ['ForkToneBarVolume', 20], ['PickupSymmetry', 21], ['PickupDistance', 22], ['PickupModel', 23],
  ['PickupAmpIn', 24], ['PickupAmpOut', 25], ['PickupAmpKeyboardScaling', 26],
  ['DamperTone', 27], ['DamperAmount', 28], ['DamperBalance', 29], ['KeyboardTranspose', 30],
  ['KeyboardStretch', 31], ['DummyPerNotePitchBendRange', 32],
].map(([key, index]) => [key, Object.freeze({
  key, ...electricDescriptors[index], authority: 'current-host-static', runtimeQualified: false,
})]));

export function electricParameterMapping(key) {
  return mappings.get(key) ?? null;
}

function mapping(key) {
  const fact = electricParameterMapping(key);
  if (!fact) throw new Error(`Electric parameter ${String(key)} is unqualified.`);
  return fact;
}

function parameterValue(fact, value) {
  const discrete = fact.kind === 3 || ['Polyphony', 'KeyboardTranspose', 'DummyPerNotePitchBendRange'].includes(fact.key);
  if (!Number.isFinite(value) || value < fact.min || value > fact.max
      || (discrete && !Number.isInteger(value))) {
    throw new Error(`Electric ${fact.key} must be ${discrete ? 'an integer' : 'a finite number'} from ${fact.min} to ${fact.max}.`);
  }
  return value;
}

export function encodeElectricParameter(key, value) {
  const fact = mapping(key);
  return {index: fact.index, value: parameterValue(fact, value)};
}

export function decodeElectricParameter(key, update) {
  const fact = mapping(key);
  if (!update || update.index !== fact.index) throw new Error(`Electric ${fact.key} native index must be ${fact.index}.`);
  return parameterValue(fact, update.value);
}
