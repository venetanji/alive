import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{await page.goto('/controls-gallery.html');});

test('dial keyboard adjustment, fine steps, limits and reset reach the same owner',async({page})=>{
  const dial=page.getByRole('slider',{name:'Resonance',exact:true});
  await expect(dial).toHaveValue('0.35');await dial.focus();
  await dial.press('ArrowUp');await expect(dial).toHaveValue('0.36');
  await dial.press('Shift+ArrowUp');await expect(dial).toHaveValue('0.361');
  await dial.press('Home');await expect(dial).toHaveValue('0');
  await dial.press('ArrowDown');await expect(dial).toHaveValue('0');
  await dial.press('End');await expect(dial).toHaveValue('1');
  await dial.dblclick();await expect(dial).toHaveValue('0.35');
  await expect(page.getByRole('spinbutton',{name:'Resonance value',exact:true})).toHaveValue('0.35');
  expect(await page.evaluate(()=>window.controlChanges.at(-1))).toEqual({key:'resonance',value:.35});
});

test('pointer drag previews values and releases one change, with reusable fine movement',async({page})=>{
  const dial=page.getByRole('slider',{name:'Resonance',exact:true}),box=await dial.boundingBox();
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-48,{steps:6});
  await expect(dial).toHaveValue('0.65');
  expect(await page.evaluate(()=>window.controlChanges)).toEqual([]);
  await page.mouse.up();expect(await page.evaluate(()=>window.controlChanges)).toEqual([{key:'resonance',value:.65}]);
  await page.mouse.move(x,y);await page.keyboard.down('Shift');await page.mouse.down();await page.mouse.move(x,y-16);await page.mouse.up();await page.keyboard.up('Shift');
  await expect(dial).toHaveValue('0.66');
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-20);await dial.press('Escape');await page.mouse.up();
  await expect(dial).toHaveValue('0.66');
});

test('numeric drafts commit valid values, preserve invalid entry, and cancel with Escape',async({page})=>{
  const number=page.getByRole('spinbutton',{name:'Resonance value',exact:true}),dial=page.getByRole('slider',{name:'Resonance',exact:true});
  await number.fill('0.72');await expect(dial).toHaveValue('0.35');
  await number.press('Enter');await expect(dial).toHaveValue('0.72');
  await number.fill('2');await number.press('Enter');await expect(number).toHaveAttribute('aria-invalid','true');await expect(dial).toHaveValue('0.72');
  await number.press('Escape');await expect(number).toHaveValue('0.72');await expect(number).not.toHaveAttribute('aria-invalid','true');
  const disabled=page.getByRole('slider',{name:'Unavailable',exact:true});await expect(disabled).toBeDisabled();
  const before=await page.evaluate(()=>window.controlChanges.length);await disabled.dispatchEvent('keydown',{key:'End'});expect(await page.evaluate(()=>window.controlChanges.length)).toBe(before);
});

test('returning a pointer preview to its origin still closes the owner gesture',async({page})=>{
  const dial=page.getByRole('slider',{name:'Resonance',exact:true}),box=await dial.boundingBox(),x=box.x+26,y=box.y+26;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-20);await page.mouse.move(x,y);await page.mouse.up();
  await expect(dial).toHaveValue('0.35');
  expect(await page.evaluate(()=>window.controlChanges)).toEqual([{key:'resonance',value:.35}]);
});

test('slider, toggle and native menu use shared authored controls',async({page})=>{
  const slider=page.getByRole('slider',{name:'Level',exact:true});await slider.focus();await slider.press('End');await expect(slider).toHaveValue('1');
  const toggle=page.getByRole('button',{name:'Bypass',exact:true});await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');
  await page.getByRole('combobox',{name:'Mode',exact:true}).selectOption('mono');
  expect(await page.evaluate(()=>window.controlChanges.slice(-3))).toEqual([{key:'level',value:1},{key:'bypass',value:true},{key:'mode',value:'mono'}]);
});

test('slider clicks retain their value and relative dragging supports fine adjustment',async({page})=>{
  const slider=page.getByRole('slider',{name:'Level',exact:true}),box=await slider.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await expect(slider).toHaveValue('0.7');
  await page.mouse.move(x+16,y);await page.mouse.up();await expect(slider).toHaveValue('0.8');
  await page.mouse.move(x,y);await page.keyboard.down('Shift');await page.mouse.down();await page.mouse.move(x+16,y);await page.mouse.up();await page.keyboard.up('Shift');await expect(slider).toHaveValue('0.81');
});

test('component gallery retains readable controls on desktop and narrow viewports',async({page},testInfo)=>{
  for(const size of [{width:1280,height:800},{width:360,height:780}]){
    await page.setViewportSize(size);await expect(page.getByRole('slider',{name:'Resonance',exact:true})).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`controls-${size.width}.png`),fullPage:true});
  }
});

test('physical readouts keep dial positions raw and convert typed units back to the owner',async({page})=>{
 await page.evaluate(async()=>{
  const {createDial}=await import('./live-controls.mjs');window.physicalEdits=[];
  const display={toDisplay:v=>100*10**(2*v),format:v=>`${Math.round(100*10**(2*v))} Hz`,parse:text=>/^\s*[\d.]+\s*(?:Hz)?\s*$/.test(text)?Math.log10(parseFloat(text)/100)/2:NaN};
  window.physicalControl=createDial(document,{label:'Physical frequency',min:0,max:1,value:.5,display,onInput:value=>window.physicalEdits.push(value)});
  document.body.append(window.physicalControl.element);
 });
 const dial=page.getByRole('slider',{name:'Physical frequency',exact:true}),field=page.getByRole('spinbutton',{name:'Physical frequency value',exact:true});
 await expect(dial).toHaveValue('0.5');await expect(dial).toHaveAttribute('aria-valuetext','1000 Hz');await expect(field).toHaveValue('1000 Hz');
 await field.press('ArrowUp');await expect(dial).toHaveValue('0.51');
 await field.fill('2500 Hz');await field.press('Enter');
 await expect.poll(()=>page.evaluate(()=>window.physicalEdits.at(-1))).toBeCloseTo(Math.log10(25)/2,10);
 await field.fill('12 bananas');await field.press('Enter');await expect(field).toHaveAttribute('aria-invalid','true');
 await field.press('Escape');await expect(field).toHaveValue('2500 Hz');
 await field.fill('3000');await page.evaluate(()=>window.physicalControl.update(.5));await expect(field).toHaveValue('3000');
 await page.evaluate(()=>window.physicalControl.setDisabled(true));await expect(field).toHaveValue('1000 Hz');
});
