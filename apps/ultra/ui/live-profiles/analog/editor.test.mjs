import test from 'node:test';
import assert from 'node:assert/strict';
import {analogConnectionStatus, auditAnalogEditor, analogCurrentConnectionStatus, auditAnalogCurrentEditor} from './editor.mjs';

test('editor navigation and commands remain separate from retained native mappings', () => {
  assert.equal(analogConnectionStatus({scope: ['doc'], expression: 'SelectedFinger'}).authority, 'editor');
  assert.equal(analogConnectionStatus({scope: ['doc'], expression: 'SetRouting1'}).authority, 'unqualified-command');
  assert.equal(analogConnectionStatus({scope: ['doc', 'SignalChain1'], expression: 'FilterType'}).authority, 'unknown');
  assert.equal(analogConnectionStatus({scope: ['doc'], expression: 'SignalChain1.OscillatorBalance'}).authority, 'historical-mapping');
  assert.equal(analogConnectionStatus({scope: ['doc', 'SignalChain1'], expression: 'OscillatorBalance'}).qualified, false);
});

test('editor audit counts controls and drawing instances independently', () => {
  const control = (expression, scope = []) => ({className: 'LoadableCombiSliderSmall', connection: {scope, expression}});
  const report = auditAnalogEditor({root: {className: 'LoadableView', children: [
    control('Volume'), control('FilterType', ['SignalChain1']),
    {className: 'EmbeddedLoadableView', embedded: {className: 'LoadableView', children: [
      {className: 'AASLfoDisplay'}, {className: 'LedView'}, {className: 'AnalogPitchEnvelopeDisplay'}]}},
  ]}});
  assert.equal(report.nodeCount, 8); assert.equal(report.controlCount, 2);
  assert.equal(report.mapped.length, 1); assert.equal(report.unresolved.length, 1);
  assert.equal(report.missingDrawings.length, 2); assert.equal(report.approximateDrawings.length, 1);
  assert.equal(report.complete, false);
});

test('current static editor audit admits current fields without enabling runtime inputs', () => {
  const connection = expression => ({scope: ['doc', 'SignalChain1'], expression});
  for (const key of ['FilterType', 'LFOSync', 'LFOSyncToggle', 'LFOGateReset', 'Envelope[0].ToggleDummy']) {
    const status = analogCurrentConnectionStatus(connection(key));
    assert.equal(status.authority, 'current-host-static'); assert.equal(status.qualified, false);
  }
  assert.equal(analogCurrentConnectionStatus(connection('SetRouting1')).authority, 'unknown');
  const layout = {root: {className: 'LoadableView', children: [
    {className: 'LoadableChooserControl', connection: connection('FilterType')},
    {className: 'LoadableChooserControl', connection: {scope: ['doc'], expression: 'SelectedFinger'}},
    {className: 'AASLfoDisplay'},
  ]}};
  const report = auditAnalogCurrentEditor(layout);
  assert.equal(report.mapped.length, 1); assert.equal(report.unresolved.length, 1);
  assert.equal(report.complete, false); assert.equal(report.qualification, 'current-static-editor-coverage');
  assert.equal(auditAnalogEditor(layout).mapped.length, 0);
});
