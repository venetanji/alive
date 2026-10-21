import {test, expect} from '@playwright/test';

// These tests use the real page and ordinary user controls. They deliberately
// provide no __TAURI__ or native-IPC replacement and make no audio claim.
async function exportPatch(page) {
  await page.locator('.file-menu summary').click();
  await page.locator('#export-patch').click();
  await expect(page.locator('#patch-dialog')).toBeVisible();
  const patch = JSON.parse(await page.locator('#patch-json').inputValue());
  await page.keyboard.press('Escape');
  await expect(page.locator('#patch-dialog')).not.toBeVisible();
  return patch;
}

async function importPatch(page, patch) {
  await page.locator('.file-menu summary').click();
  await page.locator('#open-patch').click();
  await page.locator('#patch-json').fill(JSON.stringify(patch));
  await page.locator('#import-patch').click();
}

test('autocomplete guides arguments, completes named options and keeps typed values on Enter',async({page},testInfo)=>{
  await page.goto('/canvas.html');await page.locator('#workspace').focus();await page.keyboard.press('n');
  const input=page.locator('#object-text'),help=page.locator('#object-arguments');
  await input.fill('chord 48 ');
  await expect(help).toContainText('shape');await expect(help).toContainText('default 0');
  await expect(page.locator('.suggestion')).toHaveText(['0Major','1Minor','2Sus4']);
  await input.press('ArrowDown');await input.press('Tab');await expect(input).toHaveValue('chord 48 1 ');
  await input.press('Enter');
  expect((await exportPatch(page)).nodes.at(-1).params).toEqual({root:48,shape:1});
  await page.locator('#workspace').focus();await page.keyboard.press('n');
  await input.fill('metro ');await expect(help).toContainText('20 to 2000');await expect(help).toContainText('milliseconds');
  await input.fill('metro 225');await input.press('Enter');
  expect((await exportPatch(page)).nodes.at(-1).params.interval).toBe(225);
  await page.locator('#workspace').focus();await page.keyboard.press('n');
  await input.fill('voice~ 1 @re 40');await input.evaluate(e=>e.setSelectionRange(12,12));await input.press('ArrowLeft');await input.press('ArrowRight');
  await expect(page.locator('.suggestion strong')).toHaveText(['@release']);
  await input.press('Tab');await expect(input).toHaveValue('voice~ 1 @release 40');
  expect(await input.evaluate(e=>e.selectionStart)).toBe('voice~ 1 @release '.length);
  await input.fill('metro @int');await page.locator('.suggestion').click();await expect(input).toHaveValue('metro @interval ');
  await input.fill('metro @interval 250');
  await page.screenshot({path:testInfo.outputPath('autocomplete-parameters.png')});
  await input.press('Enter');expect((await exportPatch(page)).nodes.at(-1).params.interval).toBe(250);
});

test('completion follows selected edit text and Ctrl A instead of stale argument choices',async({page})=>{
  await page.goto('/canvas.html');
  await page.locator('[data-node="6"] .object-label').dblclick();
  const input=page.locator('#object-text');await expect(input).toHaveValue('voice~ 0 8 28');
  await input.press('Tab');await expect(input).toHaveValue('voice~ 0 8 28');
  await input.fill('voice~ 1 8 2');await input.press('Control+a');await input.press('Tab');
  await expect(input).toHaveValue('voice~ 1 8 2');
});

test('autocomplete argument guidance fits a narrow viewport and rejects unsupported options atomically',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/canvas.html');
  await page.locator('#workspace').focus();await page.keyboard.press('n');await page.locator('#object-text').fill('voice~ @');
  await expect(page.locator('#object-entry')).toBeInViewport();
  expect(await page.locator('#object-entry').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.locator('#object-text').fill('metro @active 1');await page.keyboard.press('Enter');
  await expect(page.locator('#object-error')).toContainText('Unknown metro option');
  await expect(page.locator('#objects [data-node]')).toHaveCount(16);
});

test('honest browser preview renders all inlets above outlets', async ({page}, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/canvas.html');
  await expect(page.locator('#preview-banner')).toBeVisible();
  await expect(page.locator('#preview-banner')).toContainText(/native|preview/i);
  await expect(page.locator('#start-audio')).toBeDisabled();
  await expect(page.locator('#palette [data-add]')).toHaveCount(25);
  await expect(page.locator('#objects [data-node]').first()).toBeVisible();

  const geometry = await page.locator('#objects [data-node]').evaluateAll(nodes =>
    nodes.map(node => {
      const box = node.getBoundingClientRect();
      const ports = [...node.querySelectorAll('[data-direction]')].map(port => {
        const rect = port.getBoundingClientRect();
        return {
          direction: port.dataset.direction,
          index: Number(port.dataset.port),
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      });
      return {id: node.dataset.node, top: box.top, bottom: box.bottom, ports};
    }),
  );
  expect(geometry.length).toBeGreaterThan(10);
  let checkedPorts = 0;
  for (const node of geometry) {
    const midpoint = (node.top + node.bottom) / 2;
    for (const port of node.ports) {
      checkedPorts++;
      if (port.direction === 'in') expect(port.y, `node ${node.id} inlet`).toBeLessThan(midpoint);
      else expect(port.y, `node ${node.id} outlet`).toBeGreaterThan(midpoint);
    }
    for (const direction of ['in', 'out']) {
      const ports = node.ports.filter(port => port.direction === direction).sort((a, b) => a.index - b.index);
      for (let i = 1; i < ports.length; i++) expect(ports[i].x).toBeGreaterThan(ports[i - 1].x);
    }
  }
  expect(checkedPorts).toBeGreaterThan(30);
  expect(errors).toEqual([]);
  const screenshot = testInfo.outputPath('canvas-browser-preview.png');
  await page.screenshot({path: screenshot, fullPage: true});
  await testInfo.attach('Canvas browser preview, not native audio', {path: screenshot, contentType: 'image/png'});
});

test('new control objects expose dynamic ports, typed text and parameter guidance',async({page},testInfo)=>{
  await page.goto('/canvas.html');
  const kinds=['int','float','flonum','slider','pack','unpack','select','route','trigger','line'];
  const args={pack:'0 f s',unpack:'i f s',select:'red blue',route:'red blue',trigger:'b i f s'};
  await importPatch(page,{version:1,profile:'ultra-canvas-v1',nodes:kinds.map((type,i)=>({id:i+1,type,x:60+(i%3)*230,y:60+Math.floor(i/3)*100,params:args[type]?{args:args[type]}:{}})),edges:[]});
  const expected=[[2,1],[2,1],[1,2],[1,1],[3,1],[1,3],[1,3],[3,3],[1,4],[3,2]];
  for(let i=0;i<kinds.length;i++){
    const node=page.locator(`#objects [data-node="${i+1}"]`);
    await expect(node.locator('[data-direction=in]')).toHaveCount(expected[i][0]);
    await expect(node.locator('[data-direction=out]')).toHaveCount(expected[i][1]);
  }
  await page.locator('[data-node="5"] [data-drag]').click();
  await page.locator('#show-inspector').click();
  await page.locator('#inspector textarea[data-parameter=args]').fill('0 0 0 0 0');
  await page.locator('#inspector textarea[data-parameter=args]').press('Tab');
  await expect(page.locator('[data-node="5"] [data-direction=in]')).toHaveCount(5);
  await page.locator('[data-node="6"] [data-direction=out][data-port="2"]').click();
  await page.locator('[data-node="5"] [data-direction=in][data-port="4"]').click();
  await expect(page.locator('#cables path[data-edge]')).toHaveCount(1);
  const exported=await exportPatch(page);
  expect(exported.edges).toEqual([{from:6,outlet:2,to:5,inlet:4}]);
  await page.locator('#workspace').focus();await page.keyboard.press('n');
  await page.locator('#object-text').fill('trigger ');await page.locator('#object-text').press('End');
  await expect(page.locator('#object-arguments')).toContainText(/8 typed atoms/);
  await expect(page.locator('#object-arguments')).toContainText(/i\/int/);
  await page.keyboard.press('Escape');await page.keyboard.press('t');
  await expect(page.locator('#object-text')).toHaveValue('toggle ');
  await page.locator('#object-text').fill('t b i');await page.locator('#object-text').press('Enter');
  expect((await exportPatch(page)).nodes.at(-1).type).toBe('trigger');
  await page.locator('#workspace').focus();await page.keyboard.press('n');
  await page.locator('#object-text').fill('line 0 ');await page.locator('#object-text').press('End');
  await expect(page.locator('#object-arguments .current-argument')).toHaveText(' [grain]');
  await page.locator('#object-text').fill('line 0 5 @time 100 @floatoutput 1');await page.locator('#object-text').press('Enter');
  expect((await exportPatch(page)).nodes.at(-1).params).toEqual({value:0,time:100,grain:5,floatoutput:1});
  await page.screenshot({path:testInfo.outputPath('control-object-batch.png')});
});

test('flonum and slider operate only in locked mode and keep authored values in preview',async({page})=>{
  await page.goto('/canvas.html');
  await importPatch(page,{version:1,profile:'ultra-canvas-v1',nodes:[{id:1,type:'flonum',x:60,y:60,params:{value:1.25,minimum:-2,maximum:4,numdecimalplaces:3}},{id:2,type:'slider',x:60,y:140,params:{size:11,min:-5,mult:1,floatoutput:1}},{id:3,type:'gain',x:60,y:220,params:{}}],edges:[]});
  const flonum=page.locator('[data-node="1"] .number-input'),slider=page.locator('[data-node="2"] .slider-input');
  expect(await slider.evaluate(e=>({min:e.min,max:e.max,step:e.step}))).toEqual({min:'0',max:'10',step:'any'});
  await expect(flonum).toHaveJSProperty('readOnly',true);
  await expect(slider).toHaveCSS('pointer-events','none');
  const unlocked=await exportPatch(page);
  await slider.focus();await page.keyboard.press('End');await page.keyboard.press('ArrowRight');
  const gain=page.locator('[data-node="3"] .gain-input');await gain.focus();await page.keyboard.press('Home');
  expect(await exportPatch(page)).toEqual(unlocked);
  await expect(slider).toBeDisabled();await expect(gain).toBeDisabled();
  await page.locator('#lock-patch').click();await expect(flonum).toHaveJSProperty('readOnly',false);
  await flonum.fill('2.375');await flonum.press('Tab');
  await expect(page.locator('#notice')).toContainText(/preview|native/i);
  await slider.focus();await slider.press('End');
  await expect(slider).toHaveValue('10');await expect(page.locator('[data-node="2"] .slider-value')).toHaveText('5');
  const patch=await exportPatch(page);expect(patch.nodes[0].params.value).toBe(2.375);expect(patch.nodes[1].params.value).toBe(10);
  await page.locator('#lock-patch').click();await expect(flonum).toHaveJSProperty('readOnly',true);
  await expect(slider).toBeDisabled();await expect(gain).toBeDisabled();
});

test('add and wire objects, delete and undo, export, and reject invalid import', async ({page}, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/canvas.html');
  await expect(page.locator('#palette [data-add]')).toHaveCount(25);
  await importPatch(page, {version: 1, profile: 'ultra-canvas-v1', nodes: [], edges: []});
  await expect(page.locator('#patch-dialog')).not.toBeVisible();
  await expect(page.locator('#objects [data-node]')).toHaveCount(0);

  await page.locator('#show-library').click();
  await page.locator('#palette [data-add="bang"]').click();
  await page.locator('#palette [data-add="number"]').click();
  await expect(page.locator('#objects [data-node]')).toHaveCount(2);
  const added = await exportPatch(page);
  const source = added.nodes.find(node => node.type === 'bang');
  const target = added.nodes.find(node => node.type === 'number');
  expect(source).toBeTruthy();
  expect(target).toBeTruthy();

  const header = page.locator(`#objects [data-node="${source.id}"] [data-drag]`);
  const headerBox = await header.boundingBox();
  expect(headerBox).toBeTruthy();
  // New nodes are cascaded. Use the exposed header corner rather than the
  // center, which may be covered by the next node's top inlet.
  const dragStart = {x: headerBox.x + 8, y: headerBox.y + 8};
  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragStart.x, dragStart.y + 180, {steps: 8});
  await page.mouse.up();
  const moved = await exportPatch(page);
  expect(moved.nodes.find(node => node.id === source.id).y).toBe(source.y + 180);

  await page.locator(`#objects [data-node="${source.id}"] [data-direction="out"][data-port="0"]`).click();
  await page.locator(`#objects [data-node="${target.id}"] [data-direction="in"][data-port="0"]`).click();
  await expect(page.locator('#cables path[data-edge]')).toHaveCount(1);
  const connected = await exportPatch(page);
  expect(connected.edges).toEqual([{from: source.id, outlet: 0, to: target.id, inlet: 0}]);

  // Select the cable at an actual rendered path point, not its rectangular
  // bounding-box center (which can lie outside a curved SVG stroke).
  const cablePoint = await page.locator('#cables path[data-edge="0"]').evaluate(path => {
    const point = path.getPointAtLength(path.getTotalLength() / 2);
    const screen = new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM());
    return {x: screen.x, y: screen.y};
  });
  await page.mouse.click(cablePoint.x, cablePoint.y);
  await page.keyboard.press('Delete');
  await expect(page.locator('#cables path[data-edge]')).toHaveCount(0);
  await page.locator('#undo').click();
  await expect(page.locator('#cables path[data-edge]')).toHaveCount(1);
  await page.locator('#redo').click();
  await expect(page.locator('#cables path[data-edge]')).toHaveCount(0);
  await page.locator('#undo').click();
  await expect(page.locator('#cables path[data-edge]')).toHaveCount(1);

  const valid = await exportPatch(page);
  await importPatch(page, {...valid, edges: [{from: source.id, outlet: 99, to: target.id, inlet: 0}]});
  await expect(page.locator('#notice')).toContainText(/outlet|port|invalid/i);
  await page.keyboard.press('Escape');
  expect(await exportPatch(page)).toEqual(valid);
  await expect(page.locator('#start-audio')).toBeDisabled();
  expect(errors).toEqual([]);

  const screenshot = testInfo.outputPath('canvas-browser-edited.png');
  await page.screenshot({path: screenshot, fullPage: true});
  await testInfo.attach('Canvas editing result, not native audio', {path: screenshot, contentType: 'image/png'});
});

test('inline creation, rejected classes, connected text edits, lock, help and directional port menus', async ({page}) => {
  await page.goto('/canvas.html');
  await page.keyboard.press('Control+n');
  await expect(page.locator('#file-menu')).not.toHaveAttribute('open');
  await page.keyboard.press('n');
  const text=page.locator('#object-text');
  await text.fill('cycle~ 440');await text.press('Enter');
  await expect(page.locator('#object-error')).toContainText('Unknown object');
  await expect(page.locator('#objects [data-node]')).toHaveCount(0);
  await text.fill('+ 12');await expect(text).toHaveAttribute('aria-invalid','false');await text.press('Enter');
  await expect(page.locator('#objects .object-label')).toContainText('+12');
  await page.keyboard.press('Enter');await text.fill('* 2');await text.press('Enter');
  await expect(page.locator('#objects .class-name')).toHaveText('*');
  await page.keyboard.press('Control+z');await expect(page.locator('#objects .class-name')).toHaveText('+');
  const workspace=await page.locator('#workspace').boundingBox();await page.mouse.move(workspace.x+360,workspace.y+220);
  await page.keyboard.press('n');await text.fill('met');
  await expect(page.locator('#object-suggestions [role=option]').first()).toContainText('metro');
  await text.press('Enter');await expect(page.locator('#objects [data-node]')).toHaveCount(2);
  await page.keyboard.press('Control+e');await expect(page.locator('#lock-label')).toHaveText('Locked');
  await page.keyboard.press('n');await expect(page.locator('#object-entry')).toBeHidden();
  await page.keyboard.press('Delete');await expect(page.locator('#objects [data-node]')).toHaveCount(2);
  await page.keyboard.press('Control+e');
  const inlet=page.locator('#objects article').first().locator('[data-direction=in]').first();
  await inlet.hover();await expect(page.locator('#port-tooltip')).toContainText('Accepts');
  await inlet.click({button:'right'});await expect(page.locator('#context-menu')).toContainText('Accepts');
  await page.keyboard.press('Escape');
  await page.locator('#objects article').first().locator('[data-direction=out]').click({button:'right'});
  await expect(page.locator('#context-menu')).toContainText('Emits');
  await page.locator('#context-menu button').last().click();
  await expect(page.locator('#help-content')).toContainText('Inlets / accepted messages');
  await expect(page.locator('#help-content')).toContainText('Open runnable example patch');
});

test('group drag and undo retain selection; zoom keeps patch cord endpoints on ports', async ({page}) => {
  await page.goto('/canvas.html');
  await importPatch(page,{version:1,profile:'ultra-canvas-v1',nodes:[
    {id:1,type:'add',x:80,y:80,params:{rhs:1}},
    {id:2,type:'number',x:300,y:220,params:{value:0}},
  ],edges:[{from:1,outlet:0,to:2,inlet:0}]});
  await page.locator('#workspace').focus();await page.keyboard.press('Control+a');
  const box=await page.locator('[data-node="1"] [data-drag]').boundingBox();
  await page.mouse.move(box.x+15,box.y+12);await page.mouse.down();
  await page.mouse.move(box.x+55,box.y+52,{steps:5});await page.mouse.up();
  await expect(page.locator('.node.selected')).toHaveCount(2);
  let patch=await exportPatch(page);expect(patch.nodes.map(n=>[n.x,n.y])).toEqual([[120,120],[340,260]]);
  await page.locator('#undo').click();patch=await exportPatch(page);
  expect(patch.nodes.map(n=>[n.x,n.y])).toEqual([[80,80],[300,220]]);
  await page.locator('#canvas-zoom').selectOption('1.5');
  const distance=await page.locator('#cables path[data-edge]').evaluate(path=>{
    const ports=[document.querySelector('[data-node="1"] [data-direction=out]'),document.querySelector('[data-node="2"] [data-direction=in]')];
    return [0,path.getTotalLength()].map((length,i)=>{
      const p=path.getPointAtLength(length),s=new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM()),r=ports[i].getBoundingClientRect();
      return Math.hypot(s.x-r.left-r.width/2,s.y-r.top-r.height/2);
    });
  });
  expect(Math.max(...distance)).toBeLessThan(.5);
});

test('small preview keeps chrome reachable and overlays its optional inspector', async ({page}) => {
  await page.setViewportSize({width:390,height:844});await page.goto('/canvas.html');
  await expect(page.locator('#show-inspector')).toBeInViewport();
  await expect(page.locator('#panic')).toBeInViewport();
  await expect(page.locator('#show-audio')).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.locator('#show-inspector').click();await expect(page.locator('#details-panel')).toBeInViewport();
  await page.locator('#close-panel').click();await page.locator('#fit-patch').click();
  await expect(page.locator('#canvas-zoom')).not.toHaveValue('');
  await page.keyboard.press('Control+n');await expect(page.locator('#empty-patch')).toBeVisible();
  await page.locator('#empty-add').click();await expect(page.locator('#object-text')).toBeFocused();
});

test('audio settings preview is reachable, fits the panel and explains native-only devices', async ({page}) => {
  for (const width of [1280,390]) {
    await page.setViewportSize({width,height:844});await page.goto('/canvas.html');
    await page.locator('#show-audio').click();
    await expect(page.locator('#audio-content')).toBeVisible();
    await expect(page.locator('#audio-settings-notice')).toContainText('native Ultra');
    await expect(page.locator('#audio-save')).toBeDisabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    const panel=await page.locator('#details-panel').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));
    expect(panel.scroll).toBe(panel.width);
  }
});

test('space and middle drag pan without editing, cursor zoom anchors and reset restores view', async ({page}) => {
  await page.goto('/canvas.html');
  const before=await exportPatch(page);
  await page.locator('#workspace').focus();
  const node=page.locator('[data-node="1"]'),start=await node.boundingBox();
  await page.mouse.move(start.x+12,start.y+12);await page.keyboard.down('Space');
  await page.mouse.down();await page.mouse.move(start.x+112,start.y+72,{steps:8});await page.mouse.up();await page.keyboard.up('Space');
  let moved=await node.boundingBox();expect(moved.x-start.x).toBeCloseTo(100,0);expect(moved.y-start.y).toBeCloseTo(60,0);
  expect(await exportPatch(page)).toEqual(before);
  await page.mouse.move(moved.x+12,moved.y+12);await page.mouse.down({button:'middle'});await page.mouse.move(moved.x+52,moved.y+42,{steps:5});await page.mouse.up({button:'middle'});
  moved=await node.boundingBox();expect(moved.x-start.x).toBeCloseTo(140,0);
  const anchor={x:moved.x+20,y:moved.y+15};
  const world=await page.locator('#canvas').evaluate((canvas,a)=>{const r=canvas.getBoundingClientRect(),z=new DOMMatrix(getComputedStyle(canvas).transform).a;return{x:(a.x-r.left)/z,y:(a.y-r.top)/z};},anchor);
  await page.mouse.move(anchor.x,anchor.y);await page.keyboard.down('Control');await page.mouse.wheel(0,-240);await page.keyboard.up('Control');
  await expect.poll(()=>page.locator('#canvas-zoom').inputValue()).not.toBe('1');
  const after=await page.locator('#canvas').evaluate((canvas,p)=>{const r=canvas.getBoundingClientRect(),z=new DOMMatrix(getComputedStyle(canvas).transform).a;return{x:r.left+p.x*z,y:r.top+p.y*z};},world);
  expect(after.x).toBeCloseTo(anchor.x,0);expect(after.y).toBeCloseTo(anchor.y,0);
  await page.locator('#workspace').focus();await page.keyboard.press('Control+0');
  const reset=await node.boundingBox();expect(reset.x).toBeCloseTo(start.x,0);expect(reset.y).toBeCloseTo(start.y,0);
  expect(await exportPatch(page)).toEqual(before);
  await page.locator('#lock-patch').click();await page.locator('#workspace').focus();
  await page.keyboard.press('Control+=');expect(Number(await page.locator('#canvas-zoom').inputValue())).toBeGreaterThan(1);
});

test('panned zoomed canvas keeps drag, marquee, creation and cables in world coordinates', async ({page},testInfo) => {
  await page.goto('/canvas.html');
  await importPatch(page,{version:1,profile:'ultra-canvas-v1',nodes:[
    {id:1,type:'add',x:80,y:80,params:{rhs:1}},
    {id:2,type:'number',x:300,y:220,params:{value:0}},
  ],edges:[{from:1,outlet:0,to:2,inlet:0}]});
  await page.locator('#canvas-zoom').selectOption('1.5');
  const workspace=await page.locator('#workspace').boundingBox();
  await page.mouse.move(workspace.x+1100,workspace.y+600);await page.mouse.down({button:'middle'});
  await page.mouse.move(workspace.x+1400,workspace.y+800,{steps:5});await page.mouse.up({button:'middle'});
  const header=await page.locator('[data-node="1"] [data-drag]').boundingBox();
  await page.mouse.move(header.x+header.width/2,header.y+header.height/2);await page.mouse.down();await page.mouse.move(header.x+header.width/2+60,header.y+header.height/2+45,{steps:5});await page.mouse.up();
  let patch=await exportPatch(page);expect(patch.nodes[0].x).toBe(120);expect(patch.nodes[0].y).toBe(110);
  const distance=await page.locator('#cables path[data-edge]').evaluate(path=>[0,path.getTotalLength()].map((length,i)=>{
    const port=document.querySelector(i?'[data-node="2"] [data-direction=in]':'[data-node="1"] [data-direction=out]'),r=port.getBoundingClientRect();
    const p=path.getPointAtLength(length),s=new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM());return Math.hypot(s.x-r.left-r.width/2,s.y-r.top-r.height/2);
  }));expect(Math.max(...distance)).toBeLessThan(.5);
  const first=await page.locator('[data-node="1"]').boundingBox(),second=await page.locator('[data-node="2"]').boundingBox();
  await page.mouse.move(first.x-15,first.y-15);await page.mouse.down();await page.mouse.move(second.x+second.width+15,second.y+second.height+15,{steps:8});await page.mouse.up();
  await expect(page.locator('.node.selected')).toHaveCount(2);
  const world={x:500,y:400};const at=await page.locator('#canvas').evaluate((canvas,p)=>{const r=canvas.getBoundingClientRect(),z=new DOMMatrix(getComputedStyle(canvas).transform).a;return{x:r.left+p.x*z,y:r.top+p.y*z};},world);
  await page.mouse.dblclick(at.x,at.y);await page.locator('#object-text').fill('button');await page.locator('#object-text').press('Enter');
  patch=await exportPatch(page);expect(patch.nodes.at(-1).x).toBeCloseTo(world.x,0);expect(patch.nodes.at(-1).y).toBeCloseTo(world.y,0);
  const screenshot=testInfo.outputPath('canvas-zoom-pan.png');await page.screenshot({path:screenshot,fullPage:true});await testInfo.attach('Panned 150% canvas: browser editing, not native audio',{path:screenshot,contentType:'image/png'});
});

test('locked Inspector disables structural edits but permits live values; input Escape stays safe',async({page})=>{
  await page.goto('/canvas.html');await page.locator('#lock-patch').click();await page.locator('#show-inspector').click();
  for(const [id,key] of [[14,'text'],[6,'device']]){
    await page.locator(`[data-node="${id}"] [data-drag]`).focus();await page.keyboard.press('Enter');
    await expect(page.locator(`#inspector [data-parameter="${key}"]`)).toBeDisabled();
  }
  await page.locator('[data-node="15"] [data-drag]').focus();await page.keyboard.press('Enter');
  const value=page.locator('#inspector [data-parameter="value"]');await expect(value).toBeEnabled();await value.fill('200');await value.press('Tab');
  expect((await exportPatch(page)).nodes.find(n=>n.id===15).params.value).toBe(200);
  await page.locator('#lock-patch').click();await page.locator('#show-library').click();await page.locator('#object-search').fill('metro');await page.keyboard.press('Escape');
  await expect(page.locator('#notice')).toContainText('Browser preview: native execution is unavailable.');
});

test('Space keeps toolbar buttons keyboard-accessible rather than starting canvas pan',async({page})=>{
  await page.goto('/canvas.html');await page.locator('#lock-patch').focus();await page.keyboard.press('Space');
  await expect(page.locator('#lock-label')).toHaveText('Locked');
});

test('Max Z and Shift Z zoom around the cursor in edit and locked mode',async({page})=>{
  await page.goto('/canvas.html');
  const before=await exportPatch(page);
  for(const locked of [false,true]){
    if(locked)await page.locator('#lock-patch').click();
    await page.locator('#reset-view').click();await page.locator('#workspace').focus();
    const anchor={x:510,y:430};await page.mouse.move(anchor.x,anchor.y);
    const world=await page.locator('#canvas').evaluate((canvas,a)=>{const r=canvas.getBoundingClientRect(),z=new DOMMatrix(getComputedStyle(canvas).transform).a;return{x:(a.x-r.left)/z,y:(a.y-r.top)/z};},anchor);
    await page.keyboard.press('z');
    expect(Number(await page.locator('#canvas-zoom').inputValue())).toBeGreaterThan(1);
    const after=await page.locator('#canvas').evaluate((canvas,p)=>{const r=canvas.getBoundingClientRect(),z=new DOMMatrix(getComputedStyle(canvas).transform).a;return{x:r.left+p.x*z,y:r.top+p.y*z};},world);
    expect(after.x).toBeCloseTo(anchor.x,0);expect(after.y).toBeCloseTo(anchor.y,0);
    // A toolbar zoom moves the canvas without moving the physical pointer.
    await page.keyboard.press('Control+=');
    const at=await page.locator('#canvas').evaluate((canvas,a)=>{const r=canvas.getBoundingClientRect(),z=new DOMMatrix(getComputedStyle(canvas).transform).a;return{x:(a.x-r.left)/z,y:(a.y-r.top)/z};},anchor);
    await page.keyboard.press('z');
    const anchored=await page.locator('#canvas').evaluate((canvas,p)=>{const r=canvas.getBoundingClientRect(),z=new DOMMatrix(getComputedStyle(canvas).transform).a;return{x:r.left+p.x*z,y:r.top+p.y*z};},at);
    expect(anchored.x).toBeCloseTo(anchor.x,0);expect(anchored.y).toBeCloseTo(anchor.y,0);
    await page.keyboard.press('Shift+Z');await page.keyboard.press('Control+-');
    await page.keyboard.press('Shift+z');expect(Number(await page.locator('#canvas-zoom').inputValue())).toBeCloseTo(1,5);
    expect(await exportPatch(page)).toEqual(before);
  }
});

test('Max zoom shortcuts leave typing and Ctrl Z undo available',async({page})=>{
  await page.goto('/canvas.html');await page.locator('#workspace').focus();
  await page.keyboard.press('n');await page.locator('#object-text').fill('z');
  await page.locator('#object-text').press('Shift+Z');
  await expect(page.locator('#object-text')).toHaveValue('zZ');
  await expect(page.locator('#canvas-zoom')).toHaveValue('1');
  await page.keyboard.press('Escape');await page.keyboard.press('n');
  await page.locator('#object-text').fill('button');await page.keyboard.press('Enter');
  await expect(page.locator('#objects [data-node]')).toHaveCount(17);
  await page.keyboard.press('Control+z');await expect(page.locator('#objects [data-node]')).toHaveCount(16);
  await page.keyboard.press('Control+Shift+z');await expect(page.locator('#objects [data-node]')).toHaveCount(17);
  await expect(page.locator('#canvas-zoom')).toHaveValue('1');
});

test('wheel, Shift wheel and two-axis trackpad scrolling move the view without changing the patch',async({page})=>{
  await page.goto('/canvas.html');
  await importPatch(page,{version:1,profile:'ultra-canvas-v1',nodes:[
    {id:1,type:'add',x:400,y:400,params:{rhs:1}},
    {id:2,type:'number',x:2600,y:2200,params:{value:0}},
  ],edges:[{from:1,outlet:0,to:2,inlet:0}]});
  const before=await exportPatch(page),node=page.locator('[data-node="1"]');
  await page.mouse.move(650,650);const start=await node.boundingBox();
  await page.mouse.wheel(0,120);
  await expect.poll(async()=>Math.round((await node.boundingBox()).y)).toBe(Math.round(start.y-120));
  await page.keyboard.down('Shift');await page.mouse.wheel(0,140);await page.keyboard.up('Shift');
  await expect.poll(async()=>Math.round((await node.boundingBox()).x)).toBe(Math.round(start.x-140));
  await page.mouse.wheel(35,45);
  await expect.poll(async()=>Math.round((await node.boundingBox()).x)).toBe(Math.round(start.x-175));
  await expect.poll(async()=>Math.round((await node.boundingBox()).y)).toBe(Math.round(start.y-165));
  await expect(page.locator('#canvas-zoom')).toHaveValue('1');
  expect(await exportPatch(page)).toEqual(before);
});
