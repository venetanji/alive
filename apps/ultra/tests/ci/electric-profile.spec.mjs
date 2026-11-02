import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.route('**/electric-test-host', route => route.fulfill({contentType: 'text/html', body: '<!doctype html><title>Electric profile boundary</title>'}));
  await page.goto('/electric-test-host');
});

test('Electric parses model state without inventing native defaults', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {parseElectricDefaultPresetXml} = await import('/live-profiles/electric/default-model.mjs');
    const parsed = parseElectricDefaultPresetXml('<Ableton Creator="authored-test" Revision="test"><LoungeLizard><On><Manual Value="true"/></On><PickupModel><Manual Value="0"/></PickupModel><Volume><Manual Value="7.5e-1"/></Volume><FutureField><Manual Value=".25"/></FutureField></LoungeLizard></Ableton>');
    return {...parsed, values: [...parsed.values]};
  });
  expect(result.values).toEqual([['On', true], ['PickupModel', 0], ['Volume', .75], ['FutureField', .25]]);
  expect(result.unknown).toEqual(['FutureField']);
  expect(result.missing).toContain('DamperBalance');
  expect(result.source).toEqual({creator: 'authored-test', revision: 'test'});
  expect(result).not.toHaveProperty('nativeValues');
});

test('Electric rejects ambiguous model scopes and invalid Manual values', async ({page}) => {
  const errors = await page.evaluate(async () => {
    const {parseElectricDefaultPresetXml: parse} = await import('/live-profiles/electric/default-model.mjs');
    const wrap = body => `<Ableton><LoungeLizard>${body}</LoungeLizard></Ableton>`;
    return [
      '<Ableton><UltraAnalog/></Ableton>', '<Ableton><LoungeLizard/><LoungeLizard/></Ableton>',
      '<!DOCTYPE Ableton [<!ENTITY x "1">]><Ableton><LoungeLizard/></Ableton>',
      wrap('<PickupModel><Manual Value="0"/><Manual Value="1"/></PickupModel>'),
      wrap('<PickupModel><Manual Value="0"/></PickupModel><PickupModel><Manual Value="1"/></PickupModel>'),
      wrap('<Volume><Manual Value="NaN"/></Volume>'), wrap('<Volume><Manual Value="1e999"/></Volume>'),
      wrap('<Volume><Manual/></Volume>'), wrap('<Volume><Manual Value=""/></Volume>'),
      wrap('<Volume><Manual Value="0x10"/></Volume>'), wrap('<Volume><Manual Value="false"/></Volume>'),
      wrap('<On><Manual Value="1"/></On>'), '<Ableton><LoungeLizard></Ableton>',
      wrap('<Scope><Volume><Manual Value=".5"/></Volume></Scope>'),
      wrap(Array.from({length: 257}, (_, index) => `<Field${index}><Manual Value="0"/></Field${index}>`).join('')),
      ' '.repeat(1024 * 1024 + 1),
    ].map(xml => { try { parse(xml); return false; } catch { return true; } });
  });
  expect(errors).toEqual(Array(16).fill(true));
});

test('unknown future boolean fields are preserved without acquiring a native binding', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {parseElectricDefaultPresetXml} = await import('/live-profiles/electric/default-model.mjs');
    const {createElectricBindings} = await import('/live-profiles/electric/bindings.mjs');
    const parsed = parseElectricDefaultPresetXml('<Ableton><LoungeLizard><FutureToggle><Manual Value="true"/></FutureToggle></LoungeLizard></Ableton>');
    return {value: parsed.values.get('FutureToggle'), unknown: parsed.unknown,
      binding: createElectricBindings().resolve({scope: [], expression: 'FutureToggle'})};
  });
  expect(result).toEqual({value: true, unknown: ['FutureToggle'], binding: null});
});

test('parsed model snapshots show qualified displays while native writes stay disabled', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {parseElectricDefaultPresetXml} = await import('/live-profiles/electric/default-model.mjs');
    const {createElectricBindings} = await import('/live-profiles/electric/bindings.mjs');
    const parsed = parseElectricDefaultPresetXml('<Ableton><LoungeLizard><MalletStiffness><Manual Value="0.5"/></MalletStiffness><PickupModel><Manual Value="0"/></PickupModel></LoungeLizard></Ableton>');
    const bindings = createElectricBindings({modelValues: parsed.values});
    const binding = bindings.resolve({scope: [], expression: 'MalletStiffness'});
    parsed.values.set('MalletStiffness', .75);
    const pickup = bindings.resolve({scope: [], expression: 'PickupModel.Current'});
    return {state: binding.getState(), verified: binding.verified, readout: binding.display.format(.5),
      editedReadout: binding.display.format(.75), writable: typeof binding.onChange === 'function',
      pickup: pickup.getState().value, pickupOptions: pickup.options};
  });
  expect(result).toEqual({state: {enabled: false, known: true, pending: false, value: .5, initial: .5,
    authority: 'installed-model-snapshot'}, verified: true, readout: '50 %', editedReadout: '75 %', writable: false,
    pickup: 0, pickupOptions: [{value: 0, label: 'R'}, {value: 1, label: 'W'}]});
});

test('Electric browser displays preserve source units and reject unrelated suffixes', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {electricParameterDisplay: display} = await import('/live-profiles/electric/parameter-display.mjs');
    return {
      transpose: [display('KeyboardTranspose').format(0), display('KeyboardTranspose').format(24)],
      modulation: display('MalletStiffnessKeyboard').format(.25),
      stretch: display('KeyboardStretch').format(.25),
      volume: display('Volume').format(.7047892213),
      invalidUnit: Number.isNaN(display('MalletStiffness').parse('50 ms')),
    };
  });
  expect(result).toEqual({transpose: ['-12 st', '12 st'], modulation: '25', stretch: '-50 %', volume: '0.0 dB', invalidUnit: true});
});
