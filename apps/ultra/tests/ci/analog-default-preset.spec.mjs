import {test,expect} from '@playwright/test';

const authoredPreset=`<Ableton Creator="Synthetic test" Revision="authored">
 <UltraAnalog><On><Manual Value="true"/></On><Volume><Manual Value="0.625"/></Volume>
  <SignalChain1><OscillatorOct><Manual Value="-1"/></OscillatorOct>
   <Envelope.0><AttackTime><Manual Value="0.125"/></AttackTime></Envelope.0>
   <Envelope.1><Loop><Manual Value="0"/></Loop></Envelope.1>
  </SignalChain1>
  <SignalChain2><OscillatorToggle><Manual Value="false"/></OscillatorToggle></SignalChain2>
 </UltraAnalog></Ableton>`;

test('reads installed-format Manual values without interpreting automation or relative positions',async({page})=>{
 await page.goto('/analog-test.html');
 const result=await page.evaluate(async xml=>{
  const {parseAnalogDefaultPresetXml}=await import('/analog-default-preset.mjs');
  const parsed=parseAnalogDefaultPresetXml(xml);
  return {values:[...parsed.values],source:parsed.source};
 },authoredPreset);
 expect(result).toEqual({values:[['On',true],['Volume',.625],['SignalChain1.OscillatorOct',-1],
  ['SignalChain1.Envelope[0].AttackTime',.125],['SignalChain1.Envelope[1].Loop',0],
  ['SignalChain2.OscillatorToggle',false]],source:{creator:'Synthetic test',revision:'authored'}});
});

test('rejects malformed, ambiguous, nonfinite or oversized defaults before applying values',async({page})=>{
 await page.goto('/analog-test.html');
 const errors=await page.evaluate(async()=>{
  const {parseAnalogDefaultPresetXml}=await import('/analog-default-preset.mjs');
  const body=content=>`<Ableton><UltraAnalog>${content}</UltraAnalog></Ableton>`;
  const inputs=['<Ableton>', '<Other><UltraAnalog/></Other>',
   '<Ableton><UltraAnalog/><UltraAnalog/></Ableton>',
   '<!DOCTYPE Ableton [<!ENTITY x "1">]><Ableton><UltraAnalog/></Ableton>',
   body('<Volume><Manual Value="NaN"/></Volume>'),
   body('<Volume><Manual Value="1e999"/></Volume>'),
   body('<Volume><Manual Value="0"/><Manual Value="1"/></Volume>'),
   body('<Volume><Manual Value="0"/></Volume><Volume><Manual Value="1"/></Volume>'),
   body('<Volume><Manual/></Volume>'),
   ' '.repeat(1024*1024+1)];
  return inputs.map(xml=>{try{parseAnalogDefaultPresetXml(xml);return null;}catch(error){return error.message;}});
 });
 expect(errors).toHaveLength(10);
 for(const error of errors)expect(error).toMatch(/Analog default preset/i);
});

test('ignores host metadata, automation values and unrecognized nested scopes',async({page})=>{
 await page.goto('/analog-test.html');
 const values=await page.evaluate(async()=>{
  const {parseAnalogDefaultPresetXml}=await import('/analog-default-preset.mjs');
  return [...parseAnalogDefaultPresetXml(`<Ableton><UltraAnalog>
   <Volume><Manual Value="0.375"/><AutomationTarget><Manual Value="999"/></AutomationTarget></Volume>
   <SignalChain1><OscillatorOctRelativePosition Value="-1073741824"/></SignalChain1>
   <Metadata><Volume><Manual Value="42"/></Volume></Metadata>
  </UltraAnalog></Ableton>`).values];
 });
 expect(values).toEqual([['Volume',.375]]);
});
