import {test,expect} from '@playwright/test';

// Production browser preview: document gestures only, without native IPC/audio substitutes.
const patch={version:1,profile:'ultra-canvas-v1',nodes:[
  {id:1,type:'bang',x:80,y:60,params:{}},
  {id:2,type:'toggle',x:160,y:60,params:{}},
  {id:3,type:'number',x:80,y:140,params:{value:20}},
  {id:4,type:'flonum',x:220,y:140,params:{value:1.25,minimum:-2,maximum:4,numdecimalplaces:3}},
  {id:5,type:'slider',x:80,y:240,params:{value:0,size:101}},
  {id:6,type:'gain',x:300,y:240,params:{value:90}},
],edges:[]};
const face=(page,id)=>page.locator(`[data-node="${id}"]`);
async function open(page,document=patch){
  await page.goto('/canvas.html');await page.locator('.file-menu summary').click();
  await page.locator('#open-patch').click();await page.locator('#patch-json').fill(JSON.stringify(document));
  await page.locator('#import-patch').click();await expect(face(page,6)).toBeVisible();
}
async function exported(page){
  await page.locator('.file-menu summary').click();await page.locator('#export-patch').click();
  const result=JSON.parse(await page.locator('#patch-json').inputValue());await page.keyboard.press('Escape');return result;
}
async function drag(page,id,from,to,modifier){
  const r=await face(page,id).boundingBox();if(modifier)await page.keyboard.down(modifier);
  await page.mouse.move(r.x+r.width*from[0],r.y+r.height*from[1]);await page.mouse.down();
  await page.mouse.move(r.x+r.width*to[0],r.y+r.height*to[1],{steps:8});await page.mouse.up();
  if(modifier)await page.keyboard.up(modifier);
}

test('locked compact control faces remain reachable beside their connection notches',async({page})=>{
  await open(page);await page.locator('#lock-patch').click();
  const failures=await page.locator('.ui-bang,.ui-toggle,.ui-number,.ui-gain,.ui-slider').evaluateAll(nodes=>nodes.flatMap(n=>{
    const r=n.getBoundingClientRect(),bad=[];
    for(const [x,y] of [[5,2],[5,r.height-3],[r.width/2,2],[r.width/2,r.height/2]]){
      const hit=document.elementFromPoint(r.x+x,r.y+y);
      if(!hit?.matches('.trigger,input,.gain-value,.slider-value')||hit.disabled)bad.push({id:n.dataset.node,x,y,hit:hit?.className});
    }return bad;
  }));
  expect(failures).toEqual([]);
});

test('Ctrl and Cmd temporarily operate slider and gain across the entire face in edit mode',async({page})=>{
  await open(page);
  await drag(page,5,[.04,.5],[.96,.5],'Control');
  await drag(page,6,[.5,.9],[.5,.08],'Meta');
  const result=await exported(page);
  expect(result.nodes[4].params.value).toBeGreaterThan(90);
  expect(result.nodes[5].params.value).toBeGreaterThan(110);
  expect(result.nodes.map(n=>[n.x,n.y])).toEqual(patch.nodes.map(n=>[n.x,n.y]));
  await page.locator('#undo').click();expect((await exported(page)).nodes[5].params.value).toBe(90);
  await page.locator('#undo').click();expect((await exported(page)).nodes[4].params.value).toBe(0);
});

test('number dragging changes values while plain unlocked gestures move the object',async({page})=>{
  await open(page);
  await drag(page,3,[.5,.5],[.5,-.5],'Control');
  expect((await exported(page)).nodes[2].params.value).toBe(44);
  await drag(page,3,[.5,.5],[1.5,1.5]);
  const n=(await exported(page)).nodes[2];expect(n.params.value).toBe(44);expect(n.x).toBeGreaterThan(80);expect(n.y).toBeGreaterThan(140);
});

test('locked flonum supports bounded drag and direct numeric entry without opening object text',async({page})=>{
  await open(page);await page.locator('#lock-patch').click();
  await drag(page,4,[.5,.5],[.5,-20]);
  expect((await exported(page)).nodes[3].params.value).toBe(4);
  const input=face(page,4).locator('input');await input.dblclick();await input.fill('-1.375');await input.press('Enter');
  await expect(page.locator('#object-entry')).toBeHidden();
  expect((await exported(page)).nodes[3].params.value).toBe(-1.375);
});

test('cancelled slider capture stops the gesture and the next gesture has its own undo step',async({page})=>{
  await open(page);await page.keyboard.down('Control');
  const r=await face(page,5).boundingBox();await page.mouse.move(r.x+r.width*.25,r.y+r.height*.5);await page.mouse.down();
  await page.mouse.move(r.x+r.width*.5,r.y+r.height*.5,{steps:4});
  await face(page,5).dispatchEvent('pointercancel',{pointerId:1});
  await page.mouse.move(r.x+r.width*.95,r.y+r.height*.5,{steps:4});await page.mouse.up();await page.keyboard.up('Control');
  const value=(await exported(page)).nodes[4].params.value;expect(value).toBeGreaterThan(35);expect(value).toBeLessThan(65);
  await drag(page,5,[.6,.5],[.95,.5],'Control');await page.locator('#undo').click();
  expect((await exported(page)).nodes[4].params.value).toBe(value);
});

test('Ctrl-click permits direct number entry until focus leaves and edit-mode range keys remain inert',async({page})=>{
  await open(page);const input=face(page,3).locator('input');
  await face(page,3).click({modifiers:['Control']});await expect(input).toHaveJSProperty('readOnly',false);await input.fill('37');await input.press('Enter');
  expect((await exported(page)).nodes[2].params.value).toBe(37);
  await expect(input).toHaveJSProperty('readOnly',true);
  const slider=face(page,5).locator('input');await slider.focus();await slider.press('End');
  expect((await exported(page)).nodes[4].params.value).toBe(0);
});

test('flonum drag preserves stored precision beyond the displayed decimal places',async({page})=>{
  const document=structuredClone(patch);Object.assign(document.nodes[3].params,{value:1.234567,numdecimalplaces:2});
  await open(page,document);await page.locator('#lock-patch').click();
  await drag(page,4,[.5,.5],[.5,.375]);
  expect((await exported(page)).nodes[3].params.value).toBeCloseTo(1.264567,8);
});

for(const cancellation of ['Escape','blur','lostpointercapture','lock'])test(`${cancellation} ends a control gesture before later pointer movement`,async({page})=>{
  await open(page);await page.keyboard.down('Control');
  const r=await face(page,5).boundingBox();await page.mouse.move(r.x+r.width*.25,r.y+r.height*.5);await page.mouse.down();
  await page.mouse.move(r.x+r.width*.5,r.y+r.height*.5,{steps:4});
  if(cancellation==='Escape')await page.keyboard.press('Escape');
  if(cancellation==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  if(cancellation==='lostpointercapture')await face(page,5).dispatchEvent('lostpointercapture',{pointerId:1});
  if(cancellation==='lock')await page.locator('#lock-patch').evaluate(e=>e.click());
  await page.mouse.move(r.x+r.width*.95,r.y+r.height*.5,{steps:4});await page.mouse.up();await page.keyboard.up('Control');
  const value=(await exported(page)).nodes[4].params.value;expect(value).toBeGreaterThan(35);expect(value).toBeLessThan(65);
});

test('styled vertical slider and horizontal gain gestures use their saved orientation at 150% zoom',async({page},testInfo)=>{
  const document=structuredClone(patch);
  document.nodes[4].style={width:32,height:160,orientation:2,knobcolor:[1,.4,.1,1],elementcolor:[.2,.3,.4,1]};
  document.nodes[5].style={width:160,height:32,orientation:1,knobcolor:[.1,.8,.6,1]};
  await open(page,document);
  const workspace=await page.locator('#workspace').boundingBox();await page.mouse.move(workspace.x+8,workspace.y+8);
  await page.keyboard.down('Control');await page.mouse.wheel(0,-202.732554);await page.keyboard.up('Control');
  await expect.poll(async()=>Number(await page.locator('#canvas-zoom').inputValue())).toBeCloseTo(1.5,5);
  await page.locator('#lock-patch').click();
  await expect(face(page,5)).toHaveCSS('width','32px');await expect(face(page,5)).toHaveCSS('height','160px');
  await expect(face(page,6)).toHaveCSS('width','160px');await expect(face(page,6)).toHaveCSS('height','32px');
  await drag(page,5,[.5,.95],[.5,.05]);await drag(page,6,[.05,.5],[.95,.5]);
  const result=await exported(page);
  expect(result.nodes[4].params.value).toBeGreaterThan(90);expect(result.nodes[5].params.value).toBeGreaterThan(110);
  expect(result.nodes[4].style).toEqual(document.nodes[4].style);
  await expect(face(page,5).locator('input')).toHaveAttribute('aria-orientation','vertical');
  await expect(face(page,6).locator('input')).toHaveAttribute('aria-orientation','horizontal');
  await expect(face(page,5).locator('.appearance-range-thumb')).toHaveCSS('background-color','rgb(255, 102, 26)');
  await expect(face(page,5).locator('.appearance-range-track')).toHaveCSS('background-color','rgb(51, 77, 102)');
  await page.screenshot({path:testInfo.outputPath('controls-150-percent.png')});
  await page.locator('#reset-view').click();await page.setViewportSize({width:480,height:844});await page.locator('#canvas-zoom').selectOption('0.75');
  await expect(face(page,5)).toBeInViewport();await expect(face(page,6)).toBeInViewport();
  await page.screenshot({path:testInfo.outputPath('controls-narrow-preview.png')});
});

test('Fit includes saved control dimensions when imported controls are larger than their default faces',async({page})=>{
  const document=structuredClone(patch);document.nodes[4].style={width:1200,height:800};
  await open(page,document);await page.locator('#fit-patch').click();
  const viewport=await page.locator('#workspace').boundingBox(),control=await face(page,5).boundingBox();
  expect(control.x+control.width).toBeLessThanOrEqual(viewport.x+viewport.width);
  expect(control.y+control.height).toBeLessThanOrEqual(viewport.y+viewport.height);
});
