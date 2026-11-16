import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const wire=(from,to)=>({from,outlet:0,to,inlet:0});
const patch={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[
  {id:1,type:'message',x:60,y:50,params:{text:'7'}},
  {id:2,type:'patcher',x:60,y:130,params:{name:'basic'},patcher:{presentation:null,nodes:[
    {id:3,type:'inlet',x:60,y:50,params:{}},{id:4,type:'add',x:60,y:130,params:{rhs:10}},
    {id:5,type:'outlet',x:60,y:210,params:{}},{id:7,type:'comment',x:200,y:50,params:{text:'An embedded patcher.'}},
    {id:8,type:'number',x:200,y:130,params:{value:20}},
  ],edges:[wire(3,4),wire(4,5)]}},
  {id:6,type:'number',x:60,y:210,params:{value:10}},
],edges:[wire(1,2),wire(2,6)]};

async function load(page){
  await page.goto('/canvas.html');await page.locator('.file-menu summary').click();await page.locator('#open-patch').click();
  await page.locator('#patch-json').fill(JSON.stringify(patch));await page.locator('#import-patch').click();
  await expect(page.locator('[data-node="2"]')).toBeVisible();
}

async function save(page){
  const saving=page.waitForEvent('download');await page.keyboard.press('Control+s');const download=await saving;
  return JSON.parse(await readFile(await download.path(),'utf8'));
}

test('embedded patcher navigation keeps the complete saved tree and shared undo history',async({page},testInfo)=>{
  await load(page);await expect(page.locator('#document-dirty')).toBeVisible();
  await page.locator('[data-node="2"] .object-label').dblclick();
  await expect(page.locator('[data-node="4"]')).toBeVisible();
  await expect(page.locator('[data-node="7"]')).toHaveText('An embedded patcher.');
  await expect(page.locator('#patcher-path [aria-current="page"]')).toHaveText('basic');
  await page.screenshot({path:testInfo.outputPath('hierarchy-desktop.png')});
  await page.setViewportSize({width:760,height:640});await page.screenshot({path:testInfo.outputPath('hierarchy-compact.png')});
  await page.locator('[data-node="4"] .object-label').dblclick();await page.locator('#object-text').fill('+ 12');await page.locator('#object-text').press('Enter');
  const saved=await save(page);
  expect(saved.nodes).toHaveLength(3);expect(saved.nodes[1].patcher.nodes.find(n=>n.id===4).params.rhs).toBe(12);
  await expect(page.locator('#document-dirty')).toBeHidden();
  await page.getByRole('button',{name:'Root patcher',exact:true}).click();
  await expect(page.locator('[data-node="2"]')).toBeVisible();await expect(page.locator('#document-dirty')).toBeHidden();
  await page.keyboard.press('Control+z');await page.locator('[data-node="2"] .object-label').dblclick();
  await expect(page.locator('[data-node="4"] .arguments')).toHaveText('10');
});

test('patcher navigation commits valid drafts and retains an invalid child until corrected',async({page})=>{
  await load(page);await page.locator('#lock-patch').click();
  const root=page.locator('[data-node="6"] [data-parameter="value"]');
  const child=page.locator('[data-node="8"] [data-parameter="value"]');
  const enter=page.locator('[data-node="2"] .object-label');
  const leave=page.getByRole('button',{name:'Root patcher',exact:true});
  await root.fill('42');await enter.dblclick();
  await expect(page.locator('#patcher-path [aria-current="page"]')).toHaveText('basic');
  await expect(child).toHaveValue('20');await child.fill('73');await leave.click();
  await expect(root).toHaveValue('42');
  const saved=await save(page);
  expect(saved.nodes.find(n=>n.id===6).params.value).toBe(42);
  expect(saved.nodes.find(n=>n.id===2).patcher.nodes.find(n=>n.id===8).params.value).toBe(73);
  await expect(page.locator('#document-dirty')).toBeHidden();

  await enter.dblclick();await expect(child).toHaveValue('73');await child.fill('');await leave.click();
  await expect(page.locator('#patcher-path [aria-current="page"]')).toHaveText('basic');
  await expect(child).toBeVisible();await expect(child).toHaveValue('');await expect(child).toBeFocused();
  await expect(root).toHaveCount(0);
  await child.fill('84');await leave.click();await expect(root).toHaveValue('42');
  const corrected=await save(page);
  expect(corrected.nodes.find(n=>n.id===6).params.value).toBe(42);
  expect(corrected.nodes.find(n=>n.id===2).patcher.nodes.find(n=>n.id===8).params.value).toBe(84);
  await expect(page.locator('#document-dirty')).toBeHidden();
});

test('p creation promotes a flat patch and allows keyboard navigation while locked',async({page})=>{
  await page.goto('/canvas.html?new=1');await page.locator('#add-object').click();
  await page.locator('#object-text').fill('p child');await page.locator('#object-text').press('Enter');
  const header=page.locator('.node .object-label');await header.focus();await page.keyboard.press('Control+e');await header.press('Enter');
  await expect(page.locator('#patcher-path [aria-current="page"]')).toHaveText('child');
  await expect(page.locator('#empty-patch')).toBeVisible();
  await page.getByRole('button',{name:'Root patcher',exact:true}).click();await expect(page.locator('.node .arguments')).toHaveText('child');
});
