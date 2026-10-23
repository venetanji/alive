import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const wire=(from,to)=>({from,outlet:0,to,inlet:0});
const patch={version:2,profile:'ultra-patcher-v2',nodes:[
  {id:1,type:'message',x:60,y:50,params:{text:'7'}},
  {id:2,type:'patcher',x:60,y:130,params:{name:'basic'},patcher:{nodes:[
    {id:3,type:'inlet',x:60,y:50,params:{}},{id:4,type:'add',x:60,y:130,params:{rhs:10}},
    {id:5,type:'outlet',x:60,y:210,params:{}},{id:7,type:'comment',x:200,y:50,params:{text:'An embedded patcher.'}},
  ],edges:[wire(3,4),wire(4,5)]}},
  {id:6,type:'number',x:60,y:210,params:{}},
],edges:[wire(1,2),wire(2,6)]};

async function load(page){
  await page.goto('/canvas.html');await page.locator('.file-menu summary').click();await page.locator('#open-patch').click();
  await page.locator('#patch-json').fill(JSON.stringify(patch));await page.locator('#import-patch').click();
  await expect(page.locator('[data-node="2"]')).toBeVisible();
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
  const saving=page.waitForEvent('download');await page.keyboard.press('Control+s');const download=await saving;
  const saved=JSON.parse(await readFile(await download.path(),'utf8'));
  expect(saved.nodes).toHaveLength(3);expect(saved.nodes[1].patcher.nodes.find(n=>n.id===4).params.rhs).toBe(12);
  await expect(page.locator('#document-dirty')).toBeHidden();
  await page.getByRole('button',{name:'Root patcher',exact:true}).click();
  await expect(page.locator('[data-node="2"]')).toBeVisible();await expect(page.locator('#document-dirty')).toBeHidden();
  await page.keyboard.press('Control+z');await page.locator('[data-node="2"] .object-label').dblclick();
  await expect(page.locator('[data-node="4"] .arguments')).toHaveText('10');
});

test('p creation promotes a flat patch and allows keyboard navigation while locked',async({page})=>{
  await page.goto('/canvas.html?new=1');await page.locator('#add-object').click();
  await page.locator('#object-text').fill('p child');await page.locator('#object-text').press('Enter');
  const header=page.locator('.node .object-label');await header.focus();await page.keyboard.press('Control+e');await header.press('Enter');
  await expect(page.locator('#patcher-path [aria-current="page"]')).toHaveText('child');
  await expect(page.locator('#empty-patch')).toBeVisible();
  await page.getByRole('button',{name:'Root patcher',exact:true}).click();await expect(page.locator('.node .arguments')).toHaveText('child');
});
