import {electricModelFields} from './default-model.mjs';
import {electricParameterMapping} from './parameter-mapping.mjs';
import {electricParameterDisplay} from './parameter-display.mjs';

const modelKeys = new Set(electricModelFields);
export const electricEditorContract = Object.freeze({
  entrypoint: 'Devices/LoungeLizard/Contents.xml',
  // FingerView indices and matching CardView children observed in current XML.
  navigation: Object.freeze(['HammerDetail', 'ForkDetail', 'PickupDamperDetail', 'GlobalDetail']),
  uiKeys: Object.freeze(['SelectedFinger', 'ShowSplashScreen']),
  nativeBindingsQualified: false,
  physicalDisplayQualified: true,
  rendererQualified: false,
});

export const electricSnapshotEvidence = Object.freeze({
  packetRevision: 6,
  packetSha256: '741d6ae704fb925c3354d0d43c071beac753c84794b3591f78ccfadf525052c1',
  displayAuthority: 'current-host-static',
});

const unsupportedDisplay = Object.freeze({authority: 'unqualified', format: () => '--', parse: () => NaN});

export function electricConnectionStatus(connection) {
  if (!connection || !Array.isArray(connection.scope) || connection.scope.some(part => part !== 'doc')
    || typeof connection.expression !== 'string') return {authority: 'unknown', qualified: false};
  const key = connection.expression;
  if (key === 'doc') return {authority: 'scope', qualified: false};
  if (electricEditorContract.uiKeys.includes(key)) return {authority: 'editor', qualified: false};
  if (modelKeys.has(key === 'PickupModel.Current' ? 'PickupModel' : key)) {
    return {authority: 'unqualified-model', qualified: false};
  }
  return {authority: 'unknown', qualified: false};
}

export function createElectricBindings({modelValues = new Map()} = {}) {
  if (!(modelValues instanceof Map)) throw new Error('Electric model snapshot must be a Map.');
  const snapshots = new Map();
  for (const [key, value] of modelValues) {
    if (!modelKeys.has(key)) continue;
    if (key === 'On' ? typeof value !== 'boolean' : !Number.isFinite(value)) {
      throw new Error(`Electric model snapshot has an invalid ${key} value.`);
    }
    const fact = electricParameterMapping(key);
    const display = electricParameterDisplay(key) ?? unsupportedDisplay;
    const range = fact ?? display;
    const state = Object.freeze({
      enabled: false, known: true, pending: false, value, initial: value,
      authority: 'installed-model-snapshot',
    });
    snapshots.set(key, Object.freeze({
      verified: display.qualified === true && display.format(value) !== '--',
      ...(Number.isFinite(range.min) ? {min: range.min, max: range.max} : {}),
      ...(display.options ? {options: display.options} : {}),
      ...(display.options || ['KeyboardTranspose', 'PerNotePitchBendRange'].includes(key) ? {step: 1} : {}),
      display,
      getState: () => state,
    }));
  }
  // Verified static displays can show positions, but these snapshots never
  // retain a transport or enable editing. Navigation belongs to the shared view.
  return Object.freeze({
    resolve: connection => {
      if (electricConnectionStatus(connection).authority !== 'unqualified-model'
        || connection.scope.length > 1) return null;
      return snapshots.get(connection.expression === 'PickupModel.Current' ? 'PickupModel' : connection.expression) ?? null;
    },
    evaluate: () => undefined,
    connect() {},
    disconnect() {},
    observe() {},
    async idle() {},
  });
}
