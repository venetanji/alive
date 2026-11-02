import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

test.beforeEach(async ({page}) => {
  await page.route('**/analog-profile-test-host', route => route.fulfill({contentType: 'text/html', body: '<!doctype html><title>Analog profile boundary</title>'}));
  await page.goto('/analog-profile-test-host');
});

test('Analog preserves unknown preset fields and reports incomplete initialization', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {parseAnalogDefaultPresetXml} = await import('/analog-default-preset.mjs');
    const {analogIdentity, analogDescriptors} = await import('/live-profiles/analog/facts.mjs');
    const {applyAnalogPreset} = await import('/live-profiles/analog/model.mjs');
    const {values} = parseAnalogDefaultPresetXml('<Ableton><UltraAnalog><NoiseBalance><Manual Value="1"/></NoiseBalance><FutureField><Manual Value="true"/></FutureField><SignalChain1><OscillatorEnvAmount><Manual Value="-.75"/></OscillatorEnvAmount></SignalChain1></UltraAnalog></Ableton>');
    const {version, profile, dllSha256, guiSha256, graphicsSha256} = analogIdentity;
    const state = {version, profile, dllSha256, guiSha256, graphicsSha256, values: analogDescriptors.map(row => row.min)};
    state.values[202] = -3;
    const catalog = {generation: '1', parameters: analogDescriptors.map(row => ({...row,
      value: state.values[row.index], applied: state.values[row.index], revision: 0, applied_revision: 0}))};
    const plan = applyAnalogPreset(state, values, catalog);
    return {updates: plan.updates, unknown: [...plan.unknownValues], untouched: plan.untouchedNativeSlots.length,
      preserved: plan.state.values[202], complete: plan.complete};
  });
  expect(result).toEqual({updates: [{index: 26, value: 0}, {index: 39, value: .75}, {index: 40, value: 1}],
    unknown: [['FutureField', true]], untouched: 200, preserved: -3, complete: false});
});

test('Analog XML rejects ambiguous values before generating native state', async ({page}) => {
  const errors = await page.evaluate(async () => {
    const {parseAnalogDefaultPresetXml: parse} = await import('/analog-default-preset.mjs');
    return [
      '<Ableton><UltraAnalog><Volume><Manual Value=".5"/><Manual Value=".7"/></Volume></UltraAnalog></Ableton>',
      '<Ableton><UltraAnalog><SignalChain1/><SignalChain1/></UltraAnalog></Ableton>',
      '<Ableton><UltraAnalog><Volume><Manual Value="NaN"/></Volume></UltraAnalog></Ableton>',
      '<!DOCTYPE Ableton><Ableton><UltraAnalog/></Ableton>',
    ].map(xml => { try { parse(xml); return false; } catch { return true; } });
  });
  expect(errors).toEqual([true, true, true, true]);
});

test('verified local Analog packet retains explicit editor coverage gaps', async ({page}) => {
  test.skip(!process.env.ALIVE_ANALOG_PACKET, 'Requires the private, verified Analog r1 evidence packet.');
  const manifestPath = process.env.ALIVE_ANALOG_PACKET;
  const manifestBytes = await readFile(manifestPath);
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  expect(digest(manifestBytes)).toBe('3c70168eba0e0338dcf4c1b7d0bdfa90a99f5c3d8293cc0980a7ef7dd8e5e49b');
  const manifest = JSON.parse(manifestBytes), resources = {};
  for (const file of manifest.files.filter(file => file.path.startsWith('ui/') && file.path.endsWith('.xml'))) {
    const bytes = await readFile(path.resolve(path.dirname(manifestPath), file.path));
    expect(bytes.length).toBe(file.bytes); expect(digest(bytes)).toBe(file.sha256);
    resources[file.path.slice(3)] = bytes.toString('utf8');
  }
  const result = await page.evaluate(async resources => {
    const {loadLiveDeviceLayout} = await import('/live-device-layout.mjs');
    const {createLiveDeviceView} = await import('/live-device-view.mjs');
    const {createAnalogBindings} = await import('/analog-bindings.mjs');
    const {auditAnalogEditor, auditAnalogCurrentEditor} = await import('/live-profiles/analog/editor.mjs');
    const gui = {has: name => Object.hasOwn(resources, name), text: name => resources[name]};
    const layout = loadLiveDeviceLayout({gui}), bindings = createAnalogBindings();
    const view = createLiveDeviceView(document, {layout, resolveBinding: bindings.resolve, evaluateExpression: bindings.evaluate});
    document.body.append(view.element);
    const audit = auditAnalogEditor(layout), current = auditAnalogCurrentEditor(layout);
    const report = {resources: layout.documents.length, nodes: layout.nodeCount, controls: audit.controlCount,
      retainedMappings: audit.mapped.length, unresolved: audit.unresolved.length,
      currentMappings: current.mapped.length, currentUnresolved: current.unresolved.length,
      currentUnresolvedKeys: current.unresolved.map(row => row.key),
      missingDrawings: audit.missingDrawings.map(row => row.className),
      approximateDrawings: audit.approximateDrawings.length, renderer: view.report};
    view.dispose(); return report;
  }, resources);
  expect(result).toMatchObject({resources: 17, nodes: 719, controls: 175, retainedMappings: 124,
    unresolved: 51, currentMappings: 170, currentUnresolved: 5,
    approximateDrawings: 6, renderer: {controls: 175, unresolved: 49}});
  expect(result.currentUnresolvedKeys.sort()).toEqual(['PerNotePitchBendRange', 'SetRouting1', 'SetRouting2', 'SetRouting3', 'SetRouting4']);
  expect(result.missingDrawings.sort()).toEqual(['AASLfoDisplay', 'AASLfoDisplay', 'LedView', 'LedView']);
  expect(result.renderer.unsupportedClasses).toEqual(['AASLfoDisplay', 'BitmapView', 'LedView']);
});
