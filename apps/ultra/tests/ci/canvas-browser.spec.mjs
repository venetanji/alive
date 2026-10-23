import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

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

const wiringPatch={version:1,profile:'ultra-canvas-v1',nodes:[
  {id:1,type:'add',x:80,y:80,params:{}},
  {id:2,type:'number',x:300,y:240,params:{}},
  {id:3,type:'gain',x:420,y:240,params:{}},
],edges:[]};

test('New opens an independent patch and Save downloads its authored state',async({page})=>{
  await page.goto('/canvas.html');const original=await exportPatch(page);
  const created=page.waitForEvent('popup');await page.locator('#document-new').click();const child=await created;
  await expect(child.locator('#empty-patch')).toBeVisible();expect(await exportPatch(page)).toEqual(original);
  await child.locator('#add-object').click();await child.locator('#object-text').fill('print notes @level 2');await child.locator('#object-text').press('Enter');
  await expect(child.locator('#document-dirty')).toBeVisible();
  const saving=child.waitForEvent('download');await child.keyboard.press('Control+s');const download=await saving;
  expect(download.suggestedFilename()).toMatch(/\.ultra$/);const patch=JSON.parse(await readFile(await download.path(),'utf8'));
  expect(patch.nodes).toHaveLength(1);expect(patch.nodes[0]).toMatchObject({type:'print',params:{label:'notes',level:2}});
  await expect(child.locator('#document-dirty')).toBeHidden();await child.close();
});

test('Help library searches names and aliases and opens runnable help in a separate window',async({page},testInfo)=>{
  await page.goto('/canvas.html');const original=await exportPatch(page);await page.locator('#open-help-library').click();
  await page.locator('#help-library-search').fill('button');await expect(page.locator('[data-library-key="help:bang"]')).toBeVisible();
  await page.locator('#help-library-search').fill('receive');await expect(page.locator('[data-library-key="help:receive"]')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('help-library-desktop.png')});
  const opening=page.waitForEvent('popup');await page.locator('[data-library-key="help:receive"]').click();const help=await opening;
  await expect(help.locator('#document-title')).toHaveText('receive help');await expect(help.locator('#help-content')).toContainText('named');
  const patch=await exportPatch(help);expect(patch.nodes.some(node=>node.type==='receive')).toBe(true);expect(patch.nodes.some(node=>node.type==='send')).toBe(true);
  expect(await exportPatch(page)).toEqual(original);await expect(help.locator('#start-audio')).toBeDisabled();await help.close();
  await page.locator('#open-help-library').click();await page.locator('#help-library-search').fill('no such object');
  await expect(page.locator('#help-library-results')).toContainText('No matching help');await page.keyboard.press('Escape');await expect(page.locator('#open-help-library')).toBeFocused();
});

test('list objects author through standard and legacy names and open original runnable help',async({page})=>{
  await page.goto('/canvas.html');
  await importPatch(page,{version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]});
  const cases=[['iter','iter'],['prepend','prepend'],['append tail','append'],['zl reg violet 2.','zl_reg'],
    ['zl.join 8.','zl_join'],['zl.len','zl_len'],['zl.iter 2','zl_iter'],['zl.slice 2','zl_slice'],
    ['zl.rev','zl_rev'],['zl rot -1','zl_rot']];
  for(const [index,[text,type]]of cases.entries()){
    await page.locator('#add-object').click();await page.locator('#object-text').fill(text);await page.locator('#object-text').press('Enter');
    await expect(page.locator('#object-entry')).toBeHidden();
    const node=page.locator('#objects [data-node]').nth(index),count=type.startsWith('zl_')?2:1;
    await expect(node.locator('[data-direction="in"]')).toHaveCount(count);
    await expect(node.locator('[data-direction="out"]')).toHaveCount(count);
  }
  const patch=await exportPatch(page);expect(patch.nodes.map(node=>node.type)).toEqual(cases.map(([,type])=>type));
  expect(patch.nodes[1].params.args).toBe('');expect(patch.nodes[6].params.size).toBe(2);
  await page.locator('#open-help-library').click();await page.locator('#help-library-search').fill('zl.slice');
  const opening=page.waitForEvent('popup');await page.locator('[data-library-key="help:zl_slice"]').click();const help=await opening;
  await expect(help.locator('#document-title')).toHaveText('zl.slice help');
  const example=await exportPatch(help);expect(example.nodes.some(node=>node.type==='zl_slice')).toBe(true);
  expect(example.nodes.some(node=>node.type==='print')).toBe(true);expect(await exportPatch(page)).toEqual(patch);await help.close();
});

test('MSP objects author with Max names and open original signal help',async({page})=>{
  await page.goto('/canvas.html');
  await importPatch(page,{version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]});
  const cases=[['sig~ .25 -.5','sig',1,2],['+~','signal_add',2,1],['-~','signal_subtract',2,1],
    ['*~ .1','signal_multiply',2,1],['/~','signal_divide',2,1],['cycle~ 440','cycle',2,1],
    ['phasor~ -1','phasor',2,1],['noise~','noise',1,1],['clip~ -1 1','signal_clip',3,1],
    ['line~','line_signal',2,2],['snapshot~ 10','snapshot',2,1],['dac~ 2 1','signal_dac',2,0]];
  for(const [index,[text,type,inputs,outputs]]of cases.entries()){
    await page.locator('#add-object').click();await page.locator('#object-text').fill(text);await page.locator('#object-text').press('Enter');
    await expect(page.locator('#object-entry')).toBeHidden();
    const node=page.locator('#objects [data-node]').nth(index);
    await expect(node.locator('[data-direction="in"]')).toHaveCount(inputs);
    await expect(node.locator('[data-direction="out"]')).toHaveCount(outputs);
  }
  const patch=await exportPatch(page);expect(patch.nodes.map(node=>node.type)).toEqual(cases.map(([,type])=>type));
  expect(patch.nodes[4].params.rhs).toBe(0);expect(patch.nodes[11].params.channels).toBe('2 1');
  await page.locator('#open-help-library').click();await page.locator('#help-library-search').fill('cycle~');
  const opening=page.waitForEvent('popup');await page.locator('[data-library-key="help:cycle"]').click();const help=await opening;
  await expect(help.locator('#document-title')).toHaveText('cycle~ help');
  const example=await exportPatch(help);expect(example.nodes.some(node=>node.type==='cycle')).toBe(true);
  expect(example.nodes.some(node=>node.type==='snapshot')).toBe(true);
  expect(example.nodes.some(node=>node.type==='print')).toBe(true);await expect(help.locator('#start-audio')).toBeDisabled();
  expect(await exportPatch(page)).toEqual(patch);await help.close();
});

test('mixed MSP inputs accept messages and summed signals, and dac channel edits rebuild the inlet rail',async({page})=>{
  await page.goto('/canvas.html');
  await importPatch(page,{version:1,profile:'ultra-canvas-v1',nodes:[
    {id:1,type:'sig',x:80,y:80,params:{args:'.25 .5'}},
    {id:2,type:'message',x:80,y:220,params:{text:'2'}},
    {id:3,type:'signal_add',x:300,y:300,params:{}},
    {id:4,type:'signal_dac',x:540,y:480,params:{channels:'1 2'}},
  ],edges:[]});
  for(const [id,outlet]of [[1,0],[1,1],[2,0]]){
    await port(page,id,'out',outlet).click();await port(page,3,'in',0).click();
  }
  await port(page,3,'out').click();await port(page,4,'in').click();
  expect((await exportPatch(page)).edges).toHaveLength(4);
  await page.locator('[data-node="4"] .object-label').click();
  await page.locator('#show-inspector').click();
  const channels=page.locator('#inspector [data-parameter="channels"]');
  await expect(channels).toHaveAttribute('maxlength','127');
  await channels.fill('1 2 1 2');await channels.press('Tab');
  await expect(port(page,4,'in',3)).toBeVisible();
  await page.locator('#undo').click();await expect(page.locator('[data-node="4"] [data-direction="in"]')).toHaveCount(2);
  await page.locator('#redo').click();await expect(page.locator('[data-node="4"] [data-direction="in"]')).toHaveCount(4);
  await page.locator('#lock-patch').click();await page.locator('[data-node="4"] .object-label').focus();
  await page.keyboard.press('Enter');await expect(channels).toBeDisabled();
});

test('normal Open validates a file into a separate preview window and keeps the original intact',async({page})=>{
  await page.goto('/canvas.html');const original=await exportPatch(page),opened=page.waitForEvent('popup');
  await page.locator('#document-file').setInputFiles({name:'Controls.ultra',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(wiringPatch))});
  const child=await opened;await expect(child.locator('#document-title')).toHaveText('Controls.ultra');expect((await exportPatch(child)).nodes).toHaveLength(3);
  expect(await exportPatch(page)).toEqual(original);await child.close();
});

test('normal Open of Max source shows compatibility analysis before any graph is imported',async({page})=>{
  await page.goto('/canvas.html');const opened=page.waitForEvent('popup');
  const source={patcher:{boxes:[{box:{id:'button',maxclass:'button',patching_rect:[40,40,24,24]}}],lines:[]}};
  await page.locator('#document-file').setInputFiles({name:'Control.maxhelp',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  const child=await opened;await expect(child.locator('#patch-dialog')).toBeVisible();await expect(child.locator('#max-import')).toBeVisible();
  await expect(child.locator('#objects [data-node]')).toHaveCount(0);await child.keyboard.press('Escape');await expect(child.locator('#empty-patch')).toBeVisible();await child.close();
});

test('library and document tools fit a narrow window',async({page},testInfo)=>{
  await page.setViewportSize({width:320,height:740});await page.goto('/canvas.html');
  for(const id of ['document-new','document-open','document-save','open-help-library'])await expect(page.locator('#'+id)).toBeInViewport();
  await page.locator('#open-help-library').click();await expect(page.locator('#help-library-search')).toBeInViewport();await expect(page.locator('#help-library-close')).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
  expect(await page.locator('#help-library').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('help-library-mobile.png')});
});
const port=(page,id,direction,index=0)=>page.locator(`[data-node="${id}"] [data-direction="${direction}"][data-port="${index}"]`);
async function portPoint(locator){const r=await locator.boundingBox();return{x:r.x+r.width/2,y:r.y+r.height/2};}
async function dragPort(page,source,target,offset={x:0,y:0}){
  const a=await portPoint(source),b=await portPoint(target);
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x+offset.x,b.y+offset.y,{steps:8});
  await page.mouse.up();
}

test('dragging a patch cord connects ports and undo removes exactly that cable',async({page},testInfo)=>{
  await page.goto('/canvas.html');await importPatch(page,wiringPatch);
  const a=await portPoint(port(page,1,'out')),b=await portPoint(port(page,2,'in'));
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y+9,{steps:8});
  await expect(page.locator('.pending-cable')).toHaveCount(1);
  await expect(port(page,2,'in')).toHaveClass(/compatible/);
  await expect(port(page,2,'in')).toHaveClass(/wire-target/);
  await page.screenshot({path:testInfo.outputPath('patch-cord-target.png')});
  await page.mouse.up();
  expect((await exportPatch(page)).edges).toEqual([{from:1,outlet:0,to:2,inlet:0}]);
  await expect(page.locator('.pending-cable')).toHaveCount(0);
  await page.locator('#undo').click();expect((await exportPatch(page)).edges).toEqual([]);
});

test('patch cords can start at an inlet with dragging or keyboard activation',async({page})=>{
  await page.goto('/canvas.html');await importPatch(page,wiringPatch);
  await dragPort(page,port(page,2,'in'),port(page,1,'out'));
  expect((await exportPatch(page)).edges).toEqual([{from:1,outlet:0,to:2,inlet:0}]);
  await page.locator('#undo').click();
  await port(page,2,'in').focus();await page.keyboard.press('Enter');
  await port(page,1,'out').focus();await page.keyboard.press('Space');
  expect((await exportPatch(page)).edges).toEqual([{from:1,outlet:0,to:2,inlet:0}]);
});

test('invalid patch cord drops explain the rejection and allow a valid retry',async({page})=>{
  await page.goto('/canvas.html');await importPatch(page,wiringPatch);
  await dragPort(page,port(page,1,'out'),port(page,3,'in'));
  await expect(page.locator('#notice')).toContainText(/type mismatch/i);
  expect((await exportPatch(page)).edges).toEqual([]);
  await dragPort(page,port(page,1,'out'),port(page,2,'in'));
  expect((await exportPatch(page)).edges).toEqual([{from:1,outlet:0,to:2,inlet:0}]);
});

test('patch cord dragging respects zoom and pan without moving objects',async({page})=>{
  await page.goto('/canvas.html');await importPatch(page,wiringPatch);
  const anchor=await portPoint(port(page,1,'out'));
  await page.mouse.move(anchor.x,anchor.y);await page.keyboard.down('Control');
  await page.mouse.wheel(0,-200);await page.keyboard.up('Control');
  await expect.poll(async()=>Number(await page.locator('#canvas-zoom').inputValue())).toBeGreaterThan(1.4);
  const r=await page.locator('#workspace').boundingBox();
  await page.mouse.move(r.x+500,r.y+300);await page.mouse.down({button:'middle'});
  await page.mouse.move(r.x+570,r.y+340,{steps:5});await page.mouse.up({button:'middle'});
  await dragPort(page,port(page,1,'out'),port(page,2,'in'));
  const patch=await exportPatch(page);
  expect(patch.edges).toEqual([{from:1,outlet:0,to:2,inlet:0}]);
  expect(patch.nodes.map(n=>[n.x,n.y])).toEqual([[80,80],[300,240],[420,240]]);
});

test('cancelled patch cord gestures and locked ports cannot create cables',async({page})=>{
  await page.goto('/canvas.html');await importPatch(page,wiringPatch);
  const a=await portPoint(port(page,1,'out')),b=await portPoint(port(page,2,'in'));
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});
  await page.keyboard.press('Escape');await page.mouse.up();
  await expect(page.locator('.pending-cable')).toHaveCount(0);
  expect((await exportPatch(page)).edges).toEqual([]);
  await page.locator('#lock-patch').click();
  await dragPort(page,port(page,1,'out'),port(page,2,'in'));
  await expect(page.locator('#notice')).toContainText(/unlock/i);
  expect((await exportPatch(page)).edges).toEqual([]);
});

test('keyboard undo cancels a pending cord before removing its hovered destination',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/canvas.html');await importPatch(page,wiringPatch);
  await page.locator('#show-library').click();await page.locator('#palette [data-add="number"]').click();
  const added=(await exportPatch(page)).nodes.at(-1).id;
  await port(page,1,'out').click();await port(page,added,'in').hover();
  await expect(port(page,added,'in')).toHaveClass(/wire-target/);
  await page.keyboard.press('Control+z');
  await expect(page.locator(`[data-node="${added}"]`)).toHaveCount(0);
  await expect(page.locator('.pending-cable')).toHaveCount(0);
  await expect(page.locator('.wire-target')).toHaveCount(0);
  await dragPort(page,port(page,1,'out'),port(page,2,'in'));
  expect((await exportPatch(page)).edges).toEqual([{from:1,outlet:0,to:2,inlet:0}]);
  expect(errors).toEqual([]);
});

test('empty undo and redo stacks still clear all pending cord feedback',async({page})=>{
  for(const key of ['Control+z','Control+Shift+z']){
    await page.goto('/canvas.html');const original=await exportPatch(page);
    await port(page,1,'out').click();
    await expect(page.locator('.pending-cable')).toHaveCount(1);
    await page.keyboard.press(key);
    await expect(page.locator('.pending-cable')).toHaveCount(0);
    await expect(page.locator('.port.pending, .port.compatible, .port.unavailable')).toHaveCount(0);
    await expect(page.locator('#workspace')).not.toHaveClass(/wiring/);
    expect(await exportPatch(page)).toEqual(original);
  }
});

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
  await expect(page.locator('#palette [data-add]')).toHaveCount(62);
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
  if(process.env.ULTRA_TEST_NO_CAPTURES!=='1'){
    const screenshot = testInfo.outputPath('canvas-browser-preview.png');
    await page.screenshot({path: screenshot, fullPage: true});
    await testInfo.attach('Canvas browser preview, not native audio', {path: screenshot, contentType: 'image/png'});
  }
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

test('plain unlocked numeric controls select objects and locked controls edit authored values in preview',async({page})=>{
  await page.goto('/canvas.html');
  await importPatch(page,{version:1,profile:'ultra-canvas-v1',nodes:[{id:1,type:'flonum',x:60,y:60,params:{value:1.25,minimum:-2,maximum:4,numdecimalplaces:3}},{id:2,type:'slider',x:60,y:140,params:{size:11,min:-5,mult:1,floatoutput:1}},{id:3,type:'gain',x:60,y:220,params:{}}],edges:[]});
  const flonum=page.locator('[data-node="1"] .number-input'),slider=page.locator('[data-node="2"] .slider-input');
  expect(await slider.evaluate(e=>({min:e.min,max:e.max,step:e.step}))).toEqual({min:'0',max:'10',step:'any'});
  await expect(flonum).toHaveJSProperty('readOnly',true);
  await expect(slider).toHaveAttribute('aria-disabled','true');
  const unlocked=await exportPatch(page);
  await slider.focus();await page.keyboard.press('End');await page.keyboard.press('ArrowRight');
  const gain=page.locator('[data-node="3"] .gain-input');await gain.focus();await page.keyboard.press('Home');
  expect(await exportPatch(page)).toEqual(unlocked);
  await expect(slider).toHaveJSProperty('readOnly',true);await expect(gain).toHaveJSProperty('readOnly',true);
  await page.locator('#lock-patch').click();await expect(flonum).toHaveJSProperty('readOnly',false);
  await flonum.fill('2.375');await flonum.press('Tab');
  await expect(page.locator('#notice')).toContainText(/preview|native/i);
  await slider.focus();await slider.press('End');
  await expect(slider).toHaveValue('10');await expect(page.locator('[data-node="2"] .slider-value')).toHaveText('5');
  const patch=await exportPatch(page);expect(patch.nodes[0].params.value).toBe(2.375);expect(patch.nodes[1].params.value).toBe(10);
  await page.locator('#lock-patch').click();await expect(flonum).toHaveJSProperty('readOnly',true);
  await expect(slider).toHaveJSProperty('readOnly',true);await expect(gain).toHaveJSProperty('readOnly',true);
});

test('add and wire objects, delete and undo, export, and reject invalid import', async ({page}, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/canvas.html');
  await expect(page.locator('#palette [data-add]')).toHaveCount(62);
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

  if(process.env.ULTRA_TEST_NO_CAPTURES!=='1'){
    const screenshot = testInfo.outputPath('canvas-browser-edited.png');
    await page.screenshot({path: screenshot, fullPage: true});
    await testInfo.attach('Canvas editing result, not native audio', {path: screenshot, contentType: 'image/png'});
  }
});

test('inline creation, rejected classes, connected text edits, lock, help and directional port menus', async ({page}) => {
  await page.goto('/canvas.html');
  await importPatch(page,{version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]});
  await expect(page.locator('#file-menu')).not.toHaveAttribute('open');
  await page.keyboard.press('n');
  const text=page.locator('#object-text');
  await text.fill('buffer~ unsupported');await text.press('Enter');
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
  const helpWindow=page.waitForEvent('popup');await page.locator('#context-menu button').last().click();const help=await helpWindow;
  await expect(help.locator('#help-content')).toContainText('Inlets / accepted messages');
  await expect(help.locator('#help-content')).toContainText('Open runnable example patch');await help.close();
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
  const newWindow=page.waitForEvent('popup');await page.keyboard.press('Control+n');const empty=await newWindow;
  await expect(empty.locator('#empty-patch')).toBeVisible();await empty.locator('#empty-add').click();await expect(empty.locator('#object-text')).toBeFocused();await empty.close();
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
