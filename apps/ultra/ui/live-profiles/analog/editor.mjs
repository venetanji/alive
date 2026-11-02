import {analogModelSpecifications} from './model.mjs';
import {analogCurrentMappings} from './parameter-mapping.mjs';

const controls = new Set(['LoadableCombiSliderSmall', 'LoadableSliderEditField', 'LoadableBipolSliderEditField',
  'LoadableDisplayStyleEditField', 'LoadableCheckControlText', 'LoadableDisplayCheckControl',
  'RadioButtonControlModulated', 'LoadableAnimationButtonControl', 'LoadableChooserControl', 'LoadableDisplayChooser']);
const modelKeys = new Set(analogModelSpecifications.map(spec => spec.key));
const currentModelKeys = new Set(analogCurrentMappings.flatMap(row => row.secondary ? [row.model, row.secondary] : [row.model]));
const keyFor = connection => {
  if (!connection || !Array.isArray(connection.scope) || typeof connection.expression !== 'string') return null;
  const expression = connection.expression;
  return /^SignalChain[12](?:\.|$)/.test(expression) ? expression
    : [...connection.scope, expression].filter(part => part && part !== 'doc').join('.');
};

export const analogEditorContract = Object.freeze({
  entrypoint: 'Devices/UltraAnalog/Contents.xml',
  uiKeys: Object.freeze(['SelectedFinger', 'SelectedGlobalMpeFinger', 'ShowSplashScreen']),
  missingDrawings: Object.freeze(['AASLfoDisplay', 'LedView']),
  approximateDrawings: Object.freeze(['AnalogAdsrEnvelopeDisplay', 'AnalogPitchEnvelopeDisplay']),
  currentHostBridgeQualified: false,
  rendererQualified: false,
});

export function analogConnectionStatus(connection) {
  const key = keyFor(connection);
  if (!key) return {authority: 'unknown', qualified: false};
  if (analogEditorContract.uiKeys.includes(key)) return {key, authority: 'editor', qualified: false};
  if (modelKeys.has(key)) return {key, authority: 'historical-mapping', qualified: false};
  return {key, authority: /^SetRouting[1-4]$/.test(key) ? 'unqualified-command' : 'unknown', qualified: false};
}

export function analogCurrentConnectionStatus(connection) {
  const key = keyFor(connection);
  return currentModelKeys.has(key) ? {key, authority: 'current-host-static', qualified: false}
    : analogConnectionStatus(connection);
}

function auditEditor(layout, classify, mappedAuthority, qualification) {
  if (!layout?.root) throw new Error('Analog: expected an expanded device layout.');
  const mapped = [], unresolved = [], missingDrawings = [], approximateDrawings = [];
  let nodeCount = 0;
  function visit(node, depth = 0) {
    if (++nodeCount > 4096 || depth > 64) throw new Error('Analog: editor audit exceeds bounded layout.');
    const row = {className: node.className, resource: node.resource, connection: node.connection ?? null};
    if (controls.has(node.className)) {
      const status = classify(node.connection);
      (status.authority === mappedAuthority ? mapped : unresolved).push({...row, ...status});
    }
    if (analogEditorContract.missingDrawings.includes(node.className)) missingDrawings.push(row);
    if (analogEditorContract.approximateDrawings.includes(node.className)) approximateDrawings.push(row);
    for (const child of node.children ?? []) visit(child, depth + 1);
    if (node.embedded) visit(node.embedded, depth + 1);
  }
  visit(layout.root);
  return {nodeCount, controlCount: mapped.length + unresolved.length, mapped, unresolved, missingDrawings, approximateDrawings,
    complete: unresolved.length === 0 && missingDrawings.length === 0 && approximateDrawings.length === 0,
    qualification};
}

export function auditAnalogEditor(layout) {
  return auditEditor(layout, analogConnectionStatus, 'historical-mapping', 'static-editor-coverage');
}

export function auditAnalogCurrentEditor(layout) {
  return auditEditor(layout, analogCurrentConnectionStatus, 'current-host-static', 'current-static-editor-coverage');
}
