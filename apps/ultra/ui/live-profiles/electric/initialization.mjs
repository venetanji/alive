import {electricModelFields} from './default-model.mjs';
import {electricParameterMapping, encodeElectricParameter} from './parameter-mapping.mjs';

export const electricNativeModelFields = Object.freeze([
  ...electricModelFields.filter(key => electricParameterMapping(key)), 'DummyPerNotePitchBendRange',
].sort((a, b) => electricParameterMapping(a).index - electricParameterMapping(b).index));

// Missing saved fields never acquire constructor values or another property's value here.
export function planElectricInitialization(modelValues) {
  if (!(modelValues instanceof Map)) throw new Error('Electric initialization requires a model-value Map.');
  const missing = [];
  const updates = [];
  for (const key of electricNativeModelFields) {
    const {index} = electricParameterMapping(key);
    if (!modelValues.has(key)) missing.push(Object.freeze({key, index}));
    else updates.push(Object.freeze(encodeElectricParameter(key, modelValues.get(key))));
  }
  const ready = missing.length === 0;
  return Object.freeze({
    ready,
    authority: 'current-host-static',
    runtimeQualified: false,
    missing: Object.freeze(missing),
    updates: ready ? Object.freeze(updates) : null,
    values: ready ? Object.freeze(updates.map(update => Math.fround(update.value))) : null,
  });
}
