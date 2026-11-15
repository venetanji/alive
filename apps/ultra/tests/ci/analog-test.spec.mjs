import {test,expect} from '@playwright/test';

async function open(page,{failStart=false,failCatalog=false}={}){
 await page.addInitScript(({failStart,failCatalog})=>{
  window.analogCalls=[];let running=false;
  window.__TAURI__={core:{invoke:async(name,args={})=>{
   window.analogCalls.push({name,args});
   if(name==='analog_test_start'){if(failStart)throw Error('Cannot open output.');running=true;}
   if(name==='analog_test_parameters'&&failCatalog)throw Error('Cannot read controls.');
   if(name==='analog_test_stop')running=false;
   if(name==='analog_test_note')return running;
   if(name==='analog_test_status')return{running,fault:false,frames:'24000',peak:running?.1:0,output:running?'Audio output is running.':'Audio is off.'};
   return null;
  }}};
 },{failStart,failCatalog});
 await page.goto('/analog-test.html');
}
test('Analog keyboard sends note pairs and releases pointer and computer keys',async({page})=>{
 await open(page);const c=page.locator('[data-note="60"]');
 await expect(c).toBeDisabled();await page.getByRole('button',{name:'Start audio',exact:true}).click();
 await expect(c).toBeEnabled();await c.click();
 await expect.poll(()=>page.evaluate(()=>window.analogCalls.filter(x=>x.name==='analog_test_note').map(x=>x.args))).toEqual([{pitch:60,velocity:100},{pitch:60,velocity:0}]);
 await page.locator('#keyboard').focus();await page.keyboard.down('a');await page.keyboard.down('a');await page.keyboard.up('a');
 await expect.poll(()=>page.evaluate(()=>window.analogCalls.filter(x=>x.name==='analog_test_note').length)).toBe(4);
 await page.keyboard.down('s');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await expect(page.locator('[data-note="62"]')).toHaveAttribute('aria-pressed','false');
 await expect.poll(()=>page.evaluate(()=>window.analogCalls.filter(x=>x.name==='analog_test_note').at(-1).args)).toEqual({pitch:62,velocity:0});
 await page.keyboard.up('s');await page.keyboard.press('Escape');
 await expect(c).toBeDisabled();await expect(page.locator('#status')).toContainText('Audio stopped');
 await expect.poll(()=>page.evaluate(()=>window.analogCalls.some(x=>x.name==='analog_test_stop'))).toBe(true);
});
test('Analog startup failures keep the keyboard disabled and allow retry',async({page})=>{
 await open(page,{failStart:true});await page.getByRole('button',{name:'Start audio',exact:true}).click();
 await expect(page.locator('#status')).toContainText('Cannot open output.');
 await expect(page.locator('[data-note="60"]')).toBeDisabled();
 await expect(page.getByRole('button',{name:'Start audio',exact:true})).toBeEnabled();
});

test('failed initialization after the native stream starts rolls it back and permits retry',async({page})=>{
 await open(page,{failCatalog:true});await page.getByRole('button',{name:'Start audio',exact:true}).click();
 await expect(page.locator('#status')).toContainText('Cannot read controls.');
 await expect.poll(()=>page.evaluate(()=>window.analogCalls.some(c=>c.name==='analog_test_stop'))).toBe(true);
 await expect(page.locator('[data-note="60"]')).toBeDisabled();
 await expect(page.getByRole('button',{name:'Start audio',exact:true})).toBeEnabled();
});

test('installed default values are applied as one batch before the keyboard becomes playable',async({page})=>{
 await page.addInitScript(()=>{
  let running=false;const parameter={index:2,module:3534,property:1,kind:0,min:0,max:1,value:.125,applied:.125,revision:1,applied_revision:1};
  window.startupCalls=[];
  window.__TAURI__={core:{invoke:async(name,args={})=>{
   window.startupCalls.push({name,args});
   if(name==='analog_test_resource_pack')throw Error('Synthetic test has no resource packs.');
   if(name==='analog_test_start'){running=true;return;}
   if(name==='analog_test_default_preset')return new Response(new Blob(['<Ableton><UltraAnalog><Volume><Manual Value="0.625"/></Volume></UltraAnalog></Ableton>']).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
   if(name==='analog_test_parameter_batch')return new Promise(resolve=>{window.finishPreset=()=>{parameter.value=parameter.applied=args.values[0].value;parameter.revision++;parameter.applied_revision=parameter.revision;resolve({generation:'1',parameters:[{...parameter}]});};});
   if(name==='analog_test_parameters')return{generation:'1',parameters:[{...parameter}]};
   if(name==='analog_test_status')return{running,fault:false,frames:'1000',peak:0,output:'Synthetic output',controls:{generation:'1',parameters:[{...parameter}]}};
   if(name==='analog_test_note')return running;
  }}};
 });
 await page.goto('/analog-test.html');await page.getByRole('button',{name:'Start audio',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>typeof window.finishPreset)).toBe('function');
 await expect(page.locator('[data-note="60"]')).toBeDisabled();
 expect(await page.evaluate(()=>window.startupCalls.find(c=>c.name==='analog_test_parameter_batch').args)).toEqual({generation:'1',values:[{index:2,value:.625}]});
 await page.evaluate(()=>window.finishPreset());await expect(page.locator('[data-note="60"]')).toBeEnabled();
 await expect(page.locator('#status')).toContainText('installed Analog default');
});
test('a status response started before startup cannot disconnect the new device',async({page})=>{
 await page.addInitScript(()=>{
  window.__TAURI__={core:{invoke:async name=>{
   if(name==='analog_test_status')return new Promise(resolve=>{window.releaseOldStatus=()=>resolve({running:false,fault:false,frames:'0',peak:0,output:'Old stopped instance'});});
   if(name==='analog_test_note')return true;
   return null;
  }}};
 });
 await page.goto('/analog-test.html');
 await expect.poll(()=>page.evaluate(()=>typeof window.releaseOldStatus)).toBe('function');
 await page.getByRole('button',{name:'Start audio',exact:true}).click();await expect(page.locator('[data-note="60"]')).toBeEnabled();
 await page.evaluate(()=>window.releaseOldStatus());await page.waitForTimeout(250);
 await expect(page.locator('[data-note="60"]')).toBeEnabled();await expect(page.locator('#status')).toContainText('Audio is running');
});
test('Analog test view fits desktop and narrow widths',async({page},testInfo)=>{
 await open(page);
 for(const width of [1100,360]){
  await page.setViewportSize({width,height:650});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('#keyboard')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath(`analog-keyboard-${width}.png`),fullPage:true});
 }
});
