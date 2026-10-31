import {test,expect} from '@playwright/test';

// Production browser preview: document gestures only, without native IPC/audio substitutes.
const patch={version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[
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

test('Max I F S shortcuts create controls at the pointer with one undo per object',async({page})=>{
  await open(page);const before=(await exported(page)).nodes.length;
  const canvas=await page.locator('#canvas').boundingBox();
  await page.locator('#workspace').focus();await page.mouse.move(canvas.x+480,canvas.y+100);
  for(const [index,key,type] of [[0,'i','number_int'],[1,'f','flonum'],[2,'s','slider']]){
    await page.keyboard.press(key);await expect(page.locator('#object-entry')).toBeHidden();
    const nodes=(await exported(page)).nodes;
    expect(nodes).toHaveLength(before+index+1);expect(nodes.at(-1)).toMatchObject({type,x:480,y:100});
    if(type==='slider')expect(nodes.at(-1).style).toEqual({width:20,height:140});
    await page.locator('#workspace').focus();
  }
  await page.keyboard.press('Control+z');expect((await exported(page)).nodes).toHaveLength(before+2);
  await page.locator('#lock-patch').click();await page.locator('#workspace').focus();
  await page.keyboard.press('f');expect((await exported(page)).nodes).toHaveLength(before+2);
});

test('Max M creates an empty two-inlet Message and edits bounded templates inline',async({page})=>{
  await open(page);const before=(await exported(page)).nodes.length;
  await page.locator('#workspace').focus();await page.keyboard.press('m');
  await expect(page.locator('#object-text')).toHaveValue('message ');
  await page.locator('#object-text').press('Enter');
  const created=(await exported(page)).nodes.at(-1),node=face(page,created.id);
  expect(created).toMatchObject({type:'message_box',params:{text:''}});
  await expect(node.locator('.inlets .port')).toHaveCount(2);
  await expect(node.locator('.outlets .port')).toHaveCount(1);
  await expect(node.locator('.message-trigger')).toHaveText('');
  await expect(node.locator('.message-trigger')).toHaveAttribute('aria-describedby',`message-description-${created.id}`);
  await expect(node.locator('.message-trigger')).toHaveAccessibleDescription('Empty message');
  await node.locator('.ui-handle').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#object-entry')).toBeVisible();
  await page.locator('#object-text').fill('message saved $1 $2');
  await page.locator('#object-text').press('Enter');
  await expect(node.locator('.message-trigger')).toHaveText('saved $1 $2');
  await expect(node.locator('.message-trigger')).toHaveAccessibleDescription('saved $1 $2');
  expect((await exported(page)).nodes).toHaveLength(before+1);
  await node.dblclick();await page.locator('#object-text').fill('message saved $3');
  await page.locator('#object-text').press('Enter');
  await expect(page.locator('#object-text')).toHaveAttribute('aria-invalid','true');
  await page.locator('#object-text').press('Escape');
  await expect(node.locator('.message-trigger')).toHaveText('saved $1 $2');
  await page.locator('#workspace').focus();await page.keyboard.press('Control+z');
  await expect(node.locator('.message-trigger')).toHaveText('');
  await page.keyboard.press('Control+Shift+z');await expect(node.locator('.message-trigger')).toHaveText('saved $1 $2');
  await page.locator('#lock-patch').click();
  await expect(node.locator('.inlets')).toBeHidden();
  await node.locator('.message-trigger').click();
  expect((await exported(page)).nodes.at(-1).params.text).toBe('saved $1 $2');
});

test('integer number faces truncate signed entry, expose Tab outlets and retain inspector themes',async({page})=>{
  const document=structuredClone(patch);
  document.nodes.push({id:7,type:'number_int',x:440,y:140,params:{value:0,minimum:-10,maximum:10}});
  await open(page,document);
  await expect(face(page,7).locator('.inlets .port')).toHaveCount(1);
  await expect(face(page,7).locator('.outlets .port')).toHaveCount(2);
  await page.locator('#lock-patch').click();await face(page,7).click();
  const input=face(page,7).locator('input');
  for(const [text,value]of [['3.9',3],['-3.9',-3]]){
    await input.fill(text);await input.press('Tab');
    expect((await exported(page)).nodes.find(node=>node.id===7).params.value).toBe(value);
  }
  await expect(face(page,7).locator('.inlets')).toBeHidden();
  await page.keyboard.press('Control+e');await face(page,7).click({position:{x:20,y:12}});
  await page.locator('#show-inspector').click();
  await expect(page.getByLabel('number minimum, selected object 7')).toHaveValue('-10');
  await expect(page.getByLabel('number maximum, selected object 7')).toHaveValue('10');
  const color=page.getByLabel('Triangle Color, selected object 7',{exact:true});
  await color.fill('#ff8800');await color.dispatchEvent('change');
  await expect(face(page,7)).toHaveCSS('--triangle-color','rgba(255,136,0,1)');
  const result=(await exported(page)).nodes.find(node=>node.id===7);
  expect(result.style.tricolor).toEqual([1,136/255,0,1]);
});

test('Console shortcut closes from its filter and restores canvas keyboard focus',async({page})=>{
  await open(page);await page.keyboard.press('Control+m');
  await page.locator('#console-search').fill('notes');await page.keyboard.press('Control+m');
  await expect(page.locator('#patch-console')).toBeHidden();await expect(page.locator('#workspace')).toBeFocused();
  await page.keyboard.press('Control+m');await expect(page.locator('#console-search')).toHaveValue('notes');
  await page.locator('#console-level').focus();await page.keyboard.press('Control+m');
  await expect(page.locator('#patch-console')).toBeHidden();
});

test('Ctrl E unlocks after operating any numeric control with input focus',async({page})=>{
  await open(page);
  for(const id of [3,4,5,6]){
    await page.locator('#lock-patch').click();await face(page,id).click();
    await expect(face(page,id).locator('input')).toBeFocused();await page.keyboard.press('Control+e');
    await expect(page.locator('#lock-patch')).toHaveAttribute('aria-pressed','false');
  }
});

test('locked UI controls hide their ports while text objects retain rails and cables',async({page})=>{
  const document=structuredClone(patch);document.nodes.push({id:7,type:'add',x:420,y:60,params:{}});
  document.edges=[{from:5,outlet:0,to:3,inlet:0}];await open(page,document);
  const path=await page.locator('.cable[data-edge="0"]').getAttribute('d');await page.locator('#lock-patch').click();
  for(const id of [1,2,3,4,5,6])await expect(face(page,id).locator('.inlets')).toBeHidden();
  await expect(face(page,7).locator('.inlets')).toBeVisible();
  await expect(page.locator('.cable[data-edge="0"]')).toHaveAttribute('d',path);
  await page.locator('#lock-patch').click();await expect(face(page,5).locator('.inlets')).toBeVisible();
});

test('range controls use full-width flat bars for default and overridden colors',async({page})=>{
  await open(page);await page.locator('#lock-patch').click();
  for(const id of [5,6]){
    const thumb=face(page,id).locator('.appearance-range-thumb');await expect(thumb).toBeVisible();
    const r=await face(page,id).boundingBox(),bar=await thumb.boundingBox();
    if(id===5){expect(bar.height).toBeCloseTo(r.height-4);expect(bar.width).toBe(6);}
    else {expect(bar.width).toBeCloseTo(r.width-4);expect(bar.height).toBe(6);}
    await drag(page,id,[.5,.5],[id===5?1:.5,id===5?.5:0]);
    const moved=await thumb.boundingBox();
    if(id===5)expect(moved.x).toBeCloseTo(r.x+r.width-8);else expect(moved.y).toBeCloseTo(r.y+2);
  }
  await page.locator('#lock-patch').click();await face(page,5).click({position:{x:40,y:12}});
  await page.locator('#show-inspector').click();const color=page.getByLabel('Knob Color, selected object 5',{exact:true});
  await color.fill('#ff8800');await color.dispatchEvent('change');
  await expect(face(page,5).locator('.appearance-range-thumb')).toHaveCSS('background-color','rgb(255, 136, 0)');
  await expect(face(page,5).locator('.slider-value')).toBeHidden();
});

test('object text edits align with the zoomed object and keep completion below the field',async({page})=>{
  const document=structuredClone(patch);Object.assign(document.nodes[2],{x:600,y:400});
  await open(page,document);await page.locator('#canvas-zoom').selectOption('1.5');
  const rect=await face(page,3).boundingBox();await face(page,3).dblclick({position:{x:32,y:12}});
  const input=page.locator('#object-text'),entry=await input.boundingBox();
  expect(entry.x).toBeCloseTo(rect.x);expect(entry.y).toBeCloseTo(rect.y);expect(entry.height).toBeCloseTo(rect.height);
  expect(entry.width).toBeLessThan(250);await input.fill('met');
  await expect(page.locator('#object-arguments')).toBeHidden();
  const list=await page.locator('#object-suggestions').boundingBox(),field=await input.boundingBox();
  expect(list.y).toBeGreaterThanOrEqual(field.y+field.height);await expect(page.locator('.suggestion').first()).toContainText('metro');
  await input.fill('metro ');await expect(page.locator('#object-arguments')).toBeVisible();
  await input.press('Enter');expect((await exported(page)).nodes.find(n=>n.id===3).type).toBe('metro');
});

test('Escape cancels inline text after focus moves to the Inspector toolbar',async({page})=>{
  await open(page);await face(page,3).dblclick({position:{x:32,y:12}});
  await page.locator('#object-text').fill('number 42');await page.locator('#show-inspector').click();
  await page.keyboard.press('Escape');await expect(page.locator('#object-entry')).toBeHidden();
  await expect(page.locator('#workspace')).toBeFocused();
  expect((await exported(page)).nodes.find(n=>n.id===3).params.value).toBe(20);
});

test('zoom waits until a control resize completes so the handle stays under the pointer',async({page})=>{
  await open(page);await face(page,5).click({position:{x:40,y:12}});
  const handle=await face(page,5).getByRole('button',{name:/Resize/}).boundingBox();
  const x=handle.x+handle.width/2,y=handle.y+handle.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+20,y);
  await page.keyboard.press('z');await expect(page.locator('#canvas-zoom')).toHaveValue('1');
  await page.mouse.move(x+40,y);await page.mouse.up();await expect(face(page,5)).toHaveCSS('width','180px');
  await page.locator('#workspace').focus();await page.keyboard.press('z');
  expect(Number(await page.locator('#canvas-zoom').inputValue())).toBeCloseTo(1.2);
});

test('selected control resize handles save dimensions with one undo and preserve values and positions',async({page})=>{
  await open(page);const initial=(await exported(page)).nodes;
  for(const id of [1,2,5,6]){
    await face(page,id).click({position:{x:12,y:12}});
    const handle=face(page,id).getByRole('button',{name:/Resize/});await expect(handle).toBeVisible();
    const before=await face(page,id).boundingBox(),r=await handle.boundingBox();
    await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
    await page.mouse.move(r.x+r.width/2+48,r.y+r.height/2+32,{steps:6});await page.mouse.up();
    const node=(await exported(page)).nodes.find(n=>n.id===id),original=initial.find(n=>n.id===id);
    expect(node.style.width).toBeCloseTo(before.width+48);expect(node.style.height).toBeCloseTo(before.height+32);
    expect([node.x,node.y,node.params]).toEqual([original.x,original.y,original.params]);
    await page.locator('#undo').click();expect((await exported(page)).nodes.find(n=>n.id===id).style).toBeUndefined();
  }
});

test('gain resize preserves width on height changes and commits the same minimum as its preview',async({page})=>{
  await open(page);await face(page,6).click({position:{x:15,y:20}});
  const handle=face(page,6).getByRole('button',{name:/Resize/});
  await handle.focus();await handle.press('ArrowDown');
  await expect(face(page,6)).toHaveCSS('width','30px');await expect(face(page,6)).toHaveCSS('height','101px');
  expect((await exported(page)).nodes[5].style).toEqual({width:30,height:101});
  await page.locator('#undo').click();
  const r=await handle.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
  await page.mouse.move(r.x+r.width/2-20,r.y+r.height/2+20,{steps:5});
  await expect(face(page,6)).toHaveCSS('width','30px');await expect(face(page,6)).toHaveCSS('height','120px');
  await page.mouse.up();
  await expect(face(page,6)).toHaveCSS('width','30px');await expect(face(page,6)).toHaveCSS('height','120px');
  expect((await exported(page)).nodes[5].style).toEqual({width:30,height:120});
});

test('resizing respects canvas zoom and cancelling a preview leaves the document intact',async({page})=>{
  await open(page);await face(page,5).click({position:{x:50,y:12}});
  await page.locator('#fit-patch').click();await expect(page.locator('#canvas-zoom')).toHaveValue('1.5');
  const handle=face(page,5).getByRole('button',{name:/Resize/}),before=await face(page,5).boundingBox(),r=await handle.boundingBox();
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
  await page.mouse.move(r.x+r.width/2+60,r.y+r.height/2+30,{steps:5});
  await expect(face(page,5)).toHaveCSS('width','180px');await expect(face(page,5)).toHaveCSS('height','44px');
  await page.keyboard.press('Escape');await page.mouse.up();
  expect((await exported(page)).nodes[4].style).toBeUndefined();
  expect((await face(page,5).boundingBox()).width).toBeCloseTo(before.width);
  await handle.focus();await handle.press('Shift+ArrowRight');
  expect((await exported(page)).nodes[4].style).toMatchObject({width:150,height:24});
  await page.locator('#lock-patch').click();await expect(handle).toBeHidden();
});

test('slider inspector names its output range and offers integer or float output',async({page})=>{
  await open(page);await face(page,5).click({position:{x:50,y:12}});await page.locator('#show-inspector').click();
  await page.getByLabel('slider min, selected object 5').fill('-1');await page.getByLabel('slider min, selected object 5').press('Tab');
  await page.getByLabel('slider mult, selected object 5').fill('0.025');await page.getByLabel('slider mult, selected object 5').press('Tab');
  const mode=page.getByLabel('slider floatoutput, selected object 5');
  await expect(mode).toHaveJSProperty('tagName','SELECT');await mode.selectOption('1');
  await expect(page.locator('[data-slider-output-range]')).toContainText('-1');
  await expect(page.locator('[data-slider-output-range]')).toContainText('1.5');
  await expect(page.locator('[data-slider-output-range]')).toContainText('Float');
  const n=(await exported(page)).nodes[4];expect(n.params).toMatchObject({min:-1,mult:0.025,floatoutput:1});
});

test('slider integer output readout truncates the scaled result and float mode retains it',async({page})=>{
  const document=structuredClone(patch);Object.assign(document.nodes[4].params,{value:3,min:0.1,mult:0.5});
  await open(page,document);await expect(face(page,5).locator('.slider-value')).toHaveText('1');
  await face(page,5).click({position:{x:50,y:12}});await page.locator('#show-inspector').click();
  await page.getByLabel('slider floatoutput, selected object 5').selectOption('1');
  await expect(face(page,5).locator('.slider-value')).toHaveText('1.6');
});

test('resize preview follows attached cables and interruption restores the saved geometry',async({page})=>{
  const document=structuredClone(patch);document.edges=[{from:5,outlet:0,to:3,inlet:0}];
  await open(page,document);await face(page,5).click({position:{x:50,y:12}});
  const cord=page.locator('.cable[data-edge="0"]'),path=await cord.getAttribute('d');
  const handle=face(page,5).getByRole('button',{name:/Resize/}),r=await handle.boundingBox();
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
  await page.mouse.move(r.x+r.width/2+20,r.y+r.height/2+60,{steps:5});
  await expect(cord).not.toHaveAttribute('d',path);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();
  await expect(cord).toHaveAttribute('d',path);expect((await exported(page)).nodes[4].style).toBeUndefined();
});

test('compact toolbar keeps console inspector and help inside the narrow browser viewport',async({page})=>{
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});await open(page);
    const geometry=await page.evaluate(()=>({width:window.innerWidth,document:document.documentElement.scrollWidth,
      controls:['show-console','show-inspector','show-help'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return{id,left:r.left,right:r.right};})}));
    expect(geometry.document).toBeLessThanOrEqual(geometry.width);
    for(const control of geometry.controls){expect(control.left).toBeGreaterThanOrEqual(0);expect(control.right).toBeLessThanOrEqual(geometry.width);}
  }
});

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
