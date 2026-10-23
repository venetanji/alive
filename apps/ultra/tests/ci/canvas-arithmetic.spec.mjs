import {test,expect} from '@playwright/test';

test.use({screenshot:'off',trace:'off'});
const initial={version:1,profile:'ultra-canvas-v1',nodes:[
  {id:1,type:'add',x:80,y:80,params:{rhs:2,numericmode:1}},
  {id:2,type:'multiply',x:320,y:80,params:{rhs:.5}},
],edges:[]};
const face=(page,id)=>page.locator(`[data-node="${id}"]`);
async function open(page){
  await page.goto('/canvas.html');await page.locator('.file-menu summary').click();
  await page.locator('#open-patch').click();await page.locator('#patch-json').fill(JSON.stringify(initial));
  await page.locator('#import-patch').click();await expect(face(page,2)).toBeVisible();
}
async function exported(page){
  await page.locator('.file-menu summary').click();await page.locator('#export-patch').click();
  const value=JSON.parse(await page.locator('#patch-json').inputValue());await page.keyboard.press('Escape');return value;
}
async function create(page,text){
  await page.locator('#add-object').click();await page.locator('#object-text').fill(text);
  await page.locator('#object-text').press('Enter');await expect(page.locator('#object-entry')).toBeHidden();
  return(await exported(page)).nodes.at(-1);
}

test('typed arithmetic creates all six new faces and preserves decimal output mode',async({page})=>{
  await open(page);
  for(const [text,type,rhs,mode]of [['- 2.','subtract',2,2],['/','divide',1,1],['% 2.5','modulo',2.5,2],['!- 10.','reverse_subtract',10,2],['!/ 4.','reverse_divide',4,2],['abs 2.','abs',undefined,2]]){
    const n=await create(page,text);expect(n.type).toBe(type);expect(n.params.numericmode).toBe(mode);
    if(rhs!==undefined)expect(n.params.rhs).toBe(rhs);else expect(n.params).not.toHaveProperty('rhs');
    await expect(face(page,n.id).locator('.inlets .port')).toHaveCount(type==='abs'?1:2);
    await expect(face(page,n.id).locator('.outlets .port')).toHaveCount(1);
  }
});

test('bare same-type edits reset defaults and mode with undo redo preserving float spelling',async({page})=>{
  await open(page);await face(page,1).dblclick();await page.locator('#object-text').fill('+ 2.');await page.locator('#object-text').press('Enter');
  await face(page,1).dblclick();await expect(page.locator('#object-text')).toHaveValue('+ 2.');
  await page.locator('#object-text').fill('+');await page.locator('#object-text').press('Enter');
  expect((await exported(page)).nodes[0].params).toEqual({rhs:0,numericmode:1});
  await page.locator('#workspace').focus();await page.keyboard.press('Control+z');
  expect((await exported(page)).nodes[0].params).toEqual({rhs:2,numericmode:2});
  await page.locator('#workspace').focus();await page.keyboard.press('Control+Shift+z');
  expect((await exported(page)).nodes[0].params).toEqual({rhs:0,numericmode:1});
});

test('mode inspector labels structural edits and locks mode while keeping the operand live',async({page})=>{
  await open(page);await face(page,1).click();await page.locator('#show-inspector').click();
  const mode=page.getByLabel('+ numericmode, selected object 1',{exact:true});
  await expect(mode.locator('option')).toHaveText(['Legacy Ultra','Integer','Float']);
  await mode.selectOption('2');expect((await exported(page)).nodes[0].params.numericmode).toBe(2);
  await page.locator('#lock-patch').click();await face(page,1).locator('.object-label').focus();await page.keyboard.press('Enter');await expect(mode).toBeDisabled();
  const rhs=page.getByLabel('+ rhs, selected object 1',{exact:true});await expect(rhs).toBeEnabled();
  await rhs.fill('2.5');await rhs.dispatchEvent('change');
  expect((await exported(page)).nodes[0].params).toEqual({rhs:2.5,numericmode:2});
  await expect(page.locator('#inspector')).toContainText('Numeric mode is structural');
});

test('legacy faces remain explicit and typed creation refuses exponent and fractional integer operands',async({page})=>{
  await open(page);await expect(face(page,2).locator('.class-name')).toHaveText('multiply.legacy');
  await face(page,2).dblclick();await expect(page.locator('#object-text')).toHaveValue('multiply.legacy 0.5');
  await page.locator('#object-text').fill('* 2e0');await page.locator('#object-text').press('Enter');
  await expect(page.locator('#object-text')).toHaveAttribute('aria-invalid','true');
  await page.locator('#object-text').press('Escape');
  await face(page,1).click();await page.locator('#show-inspector').click();
  const rhs=page.getByLabel('+ rhs, selected object 1',{exact:true});await rhs.fill('2.5');await rhs.dispatchEvent('change');
  expect((await exported(page)).nodes[0].params).toEqual({rhs:2,numericmode:1});
});

test('palette creates new symbolic arithmetic with typed defaults rather than saved legacy defaults',async({page})=>{
  await open(page);await page.locator('#show-library').click();
  await page.locator('[data-add="multiply"]').click();
  expect((await exported(page)).nodes.at(-1)).toMatchObject({type:'multiply',params:{rhs:0,numericmode:1}});
});

test('saved subnormal float operands survive unchanged object-text editing',async({page})=>{
  await page.goto('/canvas.html');await page.locator('.file-menu summary').click();
  await page.locator('#open-patch').click();
  const patch=structuredClone(initial);patch.nodes[0].params={rhs:-Number.MIN_VALUE,numericmode:2};
  await page.locator('#patch-json').fill(JSON.stringify(patch));await page.locator('#import-patch').click();
  await face(page,1).dblclick();
  const input=page.locator('#object-text'),text=await input.inputValue();
  expect(text.length).toBeGreaterThan(160);expect(text).not.toMatch(/[eE]/);
  await input.press('Enter');await expect(page.locator('#object-entry')).toBeHidden();
  expect((await exported(page)).nodes[0].params).toEqual(patch.nodes[0].params);
});
