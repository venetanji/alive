import {test,expect} from '@playwright/test';

const text='  First line\nSecond <literal> line\nThird line  ';
async function load(page,value=text,style={width:250,height:90,fontsize:13}){
  await page.goto('/canvas.html?new=1');
  await page.locator('#file-menu summary').click();await page.locator('#open-patch').click();
  await page.locator('#patch-json').fill(JSON.stringify({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[
    {id:1,type:'comment',x:60,y:60,params:{text:value},style},
  ],edges:[]}));
  await page.locator('#import-patch').click();
}
async function exported(page){
  await page.locator('#file-menu summary').click();await page.locator('#export-patch').click();
  const patch=JSON.parse(await page.locator('#patch-json').inputValue());
  await page.keyboard.press('Escape');return patch;
}

test('comment text editing preserves newlines and whitespace on an unchanged commit',async({page})=>{
  await load(page);const before=await exported(page);
  await page.locator('.comment-label').dblclick();
  await expect(page.locator('#object-text')).toHaveValue('comment '+text);
  await page.locator('#object-text').press('Enter');
  await expect(page.locator('#object-entry')).toBeHidden();
  expect(await exported(page)).toEqual(before);
});

test('comment editor supports multiline navigation, insertion, undo and cancel',async({page})=>{
  await load(page,'First annotation\nSecond annotation');
  await page.locator('.comment-label').dblclick();
  const editor=page.locator('#object-text');
  await editor.press('Control+End');await editor.press('ArrowUp');await editor.type('X');
  await editor.press('Control+End');await editor.press('Shift+Enter');await editor.type('Third');
  await expect(editor).toHaveValue(/X.*\nSecond annotation\nThird$/);
  await editor.press('Enter');await expect(page.locator('#object-entry')).toBeHidden();
  const changed=await exported(page);
  expect(changed.nodes[0].params.text).toMatch(/X.*\nSecond annotation\nThird$/);
  await page.locator('#undo').click();expect((await exported(page)).nodes[0].params.text).toBe('First annotation\nSecond annotation');
  await page.locator('.comment-label').dblclick();await editor.fill('comment Replacement\nDiscard me');
  await editor.press('Escape');expect((await exported(page)).nodes[0].params.text).toBe('First annotation\nSecond annotation');
});

test('long imported comments can be edited without the ordinary object text limit',async({page})=>{
  const long='Original annotation. '.repeat(20)+'\nLast line';
  await load(page,long);await page.locator('.comment-label').dblclick();
  await page.locator('#object-text').press('Enter');
  await expect(page.locator('#object-entry')).toBeHidden();
  expect((await exported(page)).nodes[0].params.text).toBe(long);
});

test('callout outline keeps its independent inherited color when text is transparent',async({page})=>{
  await load(page,'Independent callout colors',{width:250,height:90,fontsize:13,bubble:1,textcolor:[1,0,0,0]});
  const outline=page.locator('.comment-outline'),header=page.locator('.comment-label');
  await expect(outline).toHaveCSS('stroke','rgb(217, 217, 217)');
  await expect(header).toHaveCSS('color','rgba(255, 0, 0, 0)');
  await header.click();await page.locator('#show-inspector').click();
  await expect(page.locator('[data-style="color"]')).toHaveValue('#d9d9d9');
  await page.locator('[data-style-alpha="color"]').fill('0.5');
  await page.locator('[data-style-alpha="color"]').dispatchEvent('change');
  await expect(outline).toHaveCSS('stroke','rgba(217, 217, 217, 0.5)');
  expect((await exported(page)).nodes[0].style.color).toEqual([217/255,217/255,217/255,0.5]);
});

test('an unchanged comment retains original CRLF and CR bytes after textarea normalization',async({page})=>{
  const original='First\r\nSecond\rLast\r\n';
  await load(page,original);await page.locator('.comment-label').dblclick();
  await expect(page.locator('#object-text')).toHaveValue('comment First\nSecond\nLast\n');
  await page.locator('#object-text').press('Enter');
  await expect(page.locator('#object-entry')).toBeHidden();
  expect((await exported(page)).nodes[0].params.text).toBe(original);
});

test('ordinary object entry keeps its prior single-line paste behavior',async({page})=>{
  await load(page,'Change object type');await page.locator('.comment-label').dblclick();
  await page.locator('#object-text').fill('+ \n12');
  await expect(page.locator('#object-text')).toHaveValue('+ 12');
  await page.locator('#object-text').press('Enter');
  expect((await exported(page)).nodes[0]).toMatchObject({type:'add',params:{rhs:12}});
});
