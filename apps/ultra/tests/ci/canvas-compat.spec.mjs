import {test,expect} from '@playwright/test';

const empty={version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]};
async function open(page){await page.locator('.file-menu summary').click();await page.locator('#open-patch').click();}
async function load(page,patch){await open(page);await page.locator('#patch-json').fill(JSON.stringify(patch));await page.locator('#import-patch').click();}
async function exported(page){
  await page.locator('.file-menu summary').click();await page.locator('#export-patch').click();
  const patch=JSON.parse(await page.locator('#patch-json').inputValue());await page.keyboard.press('Escape');return patch;
}
const source={patcher:{boxes:[{box:{id:'basic',maxclass:'newobj',text:'p basic',patching_rect:[30,30,70,24],patcher:{boxes:[
  {box:{id:'a',maxclass:'newobj',text:'int 2',numinlets:2,numoutlets:1,patching_rect:[40,40,120,32],bgcolor:[0.2,0.3,0.4,1],fontsize:16}},
  {box:{id:'b',maxclass:'newobj',text:'float 0',numinlets:2,numoutlets:1,patching_rect:[200,120,80,24]}},
],lines:[{patchline:{source:['a',0],destination:['b',0]}}]}}}],lines:[]}};

test('inspector appearance changes render, export, reset and undo',async({page})=>{
  await page.goto('/canvas.html');await load(page,{...empty,nodes:[{id:1,type:'add',x:60,y:60,params:{}}]});
  await page.locator('[data-node="1"] .object-label').click();await page.locator('#show-inspector').click();
  const width=page.locator('#inspector [data-style="width"]');await expect(width).toBeVisible();
  await width.fill('180');await width.press('Tab');
  const color=page.locator('#inspector [data-style="bgcolor"]');await color.fill('#304050');await color.dispatchEvent('change');
  const alpha=page.locator('#inspector [data-style-alpha="bgcolor"]');await alpha.fill('0.5');await alpha.press('Tab');
  await expect(page.locator('[data-node="1"]')).toHaveCSS('width','180px');
  await expect(page.locator('[data-node="1"]')).toHaveCSS('background-color','rgba(48, 64, 80, 0.5)');
  const patch=await exported(page);expect(patch.nodes[0].style.width).toBe(180);
  expect(patch.nodes[0].style.bgcolor).toEqual([48/255,64/255,80/255,0.5]);
  await page.locator('#reset-appearance').click();expect((await exported(page)).nodes[0].style).toBeUndefined();
  await page.locator('#undo').click();expect((await exported(page)).nodes[0].style).toEqual(patch.nodes[0].style);
});

test('a Max help file selects and imports an actual compatible nested tab with layout and attributes',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/canvas.html');await load(page,empty);await open(page);
  await page.locator('#patch-file').setInputFiles({name:'original-test.maxhelp',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  await expect(page.locator('#max-import')).toBeVisible();
  await page.locator('#max-patcher').selectOption('root/basic');
  await expect(page.locator('#max-summary')).toContainText(/2 objects.*1 cable/i);
  await expect(page.locator('#import-patch')).toBeEnabled();await page.locator('#import-patch').click();
  await expect(page.locator('#patch-dialog')).not.toBeVisible();
  const patch=await exported(page);expect(patch.nodes.map(n=>n.type)).toEqual(['int','float']);
  expect(patch.edges).toHaveLength(1);expect(patch.nodes[0].style).toMatchObject({width:120,height:32,fontsize:16,bgcolor:[0.2,0.3,0.4,1]});
  expect(errors).toEqual([]);
});

test('partial Max imports require explicit opt-in and disclose unsupported objects',async({page})=>{
  await page.goto('/canvas.html');const before=await exported(page);await open(page);
  await page.locator('#patch-json').fill(JSON.stringify({patcher:{boxes:[
    {box:{id:'a',maxclass:'button',patching_rect:[50,50,24,24],numinlets:1,numoutlets:1}},
    {box:{id:'b',maxclass:'newobj',text:'unimplemented.example',patching_rect:[50,120,160,24]}},
  ],lines:[]}}));
  await page.locator('#import-patch').click();
  await expect(page.locator('#max-diagnostics')).toContainText('unimplemented.example');
  await expect(page.locator('#import-patch')).toBeDisabled();
  await page.keyboard.press('Escape');expect(await exported(page)).toEqual(before);
  await open(page);await page.locator('#patch-json').fill(JSON.stringify({patcher:{boxes:[
    {box:{id:'a',maxclass:'button',patching_rect:[50,50,24,24],numinlets:1,numoutlets:1}},
    {box:{id:'b',maxclass:'newobj',text:'unimplemented.example',patching_rect:[50,120,160,24]}},
  ],lines:[]}}));await page.locator('#import-patch').click();
  await page.locator('#max-allow-partial').check();await page.locator('#import-patch').click();
  const patch=await exported(page);expect(patch.nodes.map(n=>n.type)).toEqual(['bang']);
  await expect(page.locator('#notice')).toContainText(/partial/i);
});

test('editing inspected Max JSON invalidates the import preview',async({page})=>{
  await page.goto('/canvas.html');await open(page);await page.locator('#patch-json').fill(JSON.stringify(source));await page.locator('#import-patch').click();
  await expect(page.locator('#max-import')).toBeVisible();await page.locator('#patch-json').fill('{broken');
  await expect(page.locator('#max-import')).not.toBeVisible();await page.locator('#import-patch').click();
  await expect(page.locator('#dialog-status')).toContainText(/JSON/i);await expect(page.locator('#patch-dialog')).toBeVisible();
});
