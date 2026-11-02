// Observed direct Manual field names; this inventory supplies no DSP conversions.
export const electricModelFields = Object.freeze([
  'On', 'Polyphony', 'PitchBendRange', 'PerNotePitchBendRange', 'Volume',
  'KeyboardTranspose', 'KeyboardFineTune', 'KeyboardStretch',
  'MalletStiffness', 'MalletStiffnessKeyboard', 'MalletStiffnessVelocity',
  'MalletForceStrength', 'MalletForceKeyboard', 'MalletForceVelocity',
  'MalletNoisePitch', 'MalletNoiseDecay', 'MalletNoiseAmount', 'MalletNoiseKeyboardScaling',
  'ForkReleaseTime', 'ForkTineDecay', 'ForkTineVolume', 'ForkTineKeyboardScaling',
  'ForkTineColor', 'ForkToneBarDecay', 'ForkToneBarVolume', 'PickupSymmetry',
  'PickupDistance', 'PickupModel', 'PickupAmpIn', 'PickupAmpOut',
  'PickupAmpKeyboardScaling', 'DamperTone', 'DamperAmount', 'DamperBalance',
]);
const known = new Set(electricModelFields);
const fail = message => { throw new Error(`Electric model: ${message}`); };
const children = node => Array.from(node.children);

export function parseElectricDefaultPresetXml(xml, {DOMParser: Parser = globalThis.DOMParser} = {}) {
  if (typeof xml !== 'string' || !xml.length || xml.length > 1024 * 1024) fail('XML size exceeds the supported limit.');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) fail('DTD and entity declarations are unsupported.');
  if (typeof Parser !== 'function') fail('XML parser is unavailable.');
  const document = new Parser().parseFromString(xml, 'application/xml');
  const root = document.documentElement;
  if (!root || root.tagName !== 'Ableton' || document.getElementsByTagName('parsererror').length) fail('invalid Ableton XML.');
  if (document.getElementsByTagName('*').length > 8192) fail('XML element count exceeds the supported limit.');
  const devices = children(root);
  if (devices.length !== 1 || devices[0].tagName !== 'LoungeLizard') fail('expected exactly one LoungeLizard model.');
  const values = new Map();
  for (const node of children(devices[0])) {
    const manuals = children(node).filter(child => child.tagName === 'Manual');
    if (node.getElementsByTagName('Manual').length !== manuals.length) fail(`unqualified nested Manual scope ${node.tagName}.`);
    if (!manuals.length) continue;
    const key = node.tagName;
    if (manuals.length !== 1 || values.has(key)) fail(`duplicate Manual value for ${key}.`);
    const text = manuals[0].getAttribute('Value');
    let value;
    if (key === 'On') {
      if (text !== 'true' && text !== 'false') fail('On must be boolean.');
      value = text === 'true';
    } else if (!known.has(key) && (text === 'true' || text === 'false')) {
      value = text === 'true';
    } else {
      if (text === null || !/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(text)) fail(`invalid numeric Manual value for ${key}.`);
      value = Number(text);
      if (!Number.isFinite(value)) fail(`nonfinite Manual value for ${key}.`);
    }
    values.set(key, value);
    if (values.size > 256) fail('model field count exceeds the supported limit.');
  }
  return {
    values,
    source: {creator: root.getAttribute('Creator') ?? '', revision: root.getAttribute('Revision') ?? ''},
    missing: electricModelFields.filter(key => !values.has(key)),
    unknown: [...values.keys()].filter(key => !known.has(key)),
  };
}
