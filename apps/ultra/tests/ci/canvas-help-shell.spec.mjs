import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const cases=JSON.parse(readFileSync(new URL('../fixtures/help-shell-schema.json',import.meta.url),'utf8'));
function shell(){
  const patch=structuredClone(cases.find(item=>item.name==='valid-append').patch);
  const basic=patch.nodes.find(node=>node.id===3).patcher;
  Object.assign(basic.nodes.find(node=>node.id===5),{x:40,y:35,style:{width:520,height:130}});
  Object.assign(basic.nodes.find(node=>node.id===6),{x:40,y:190,style:{width:520,height:85}});
  Object.assign(basic.nodes.find(node=>node.id===7),{x:80,y:325});
  Object.assign(basic.nodes.find(node=>node.id===8),{x:80,y:410,params:{label:'shell-source',popup:0}});
  basic.nodes.push({id:9,type:'number',x:320,y:325,params:{}});
  return patch;
}
async function exported(page){
  await page.locator('#file-menu summary').click();await page.locator('#export-patch').click();
  const patch=JSON.parse(await page.locator('#patch-json').inputValue());
  await page.keyboard.press('Escape');return patch;
}
async function reference(page){
  await page.locator('#help-question').click();
  await page.locator('#help-reference-menu').getByRole('menuitem',{name:'Reference',exact:true}).click();
  await expect(page.locator('#help-reference-pane')).toBeVisible();
}
async function expectBasic(page){
  await expect(page.locator('#help-basic')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('[data-node="7"]')).toBeVisible();
  await expect(page.locator('[data-node="5"].help-helper h1')).toHaveText('append');
  await expect(page.locator('[data-node="2"]')).toHaveCount(0);
}

test('browser shell keeps Basic visible through keyboard menus and exports no local reference state',async({page})=>{
  await page.goto('/canvas.html?new=1');
  await page.locator('#file-menu summary').click();await page.locator('#open-patch').click();
  await page.locator('#patch-json').fill(JSON.stringify(shell()));await page.locator('#import-patch').click();
  await expectBasic(page);
  const before=await exported(page);
  await page.locator('[data-node="8"] .object-label').click();
  await page.locator('#help-question').focus();await page.keyboard.press('ArrowDown');
  await expect(page.locator('#help-reference-menu')).toBeVisible();
  await expect(page.locator('[data-node="8"]')).toHaveCSS('top','410px');
  await expect(page.locator('#help-question')).toHaveAttribute('aria-expanded','true');
  await expectBasic(page);await page.keyboard.press('Escape');
  await expect(page.locator('#help-reference-menu')).toBeHidden();
  await expect(page.locator('#help-question')).toBeFocused();
  await page.locator('#help-question').click();
  await page.locator('#workspace').click({position:{x:650,y:500}});
  await expect(page.locator('#help-reference-menu')).toBeHidden();
  await reference(page);await expectBasic(page);
  await expect(page.locator('#help-reference-body')).toContainText(/unavailable|local Max installation/i);
  await page.locator('#help-reference-close').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#help-reference-pane')).toBeHidden();
  expect(await exported(page)).toEqual(before);
});

// Only IPC is synthetic here; native execution and licensed local reads belong to the desktop suite.
async function nativeShell(page,viewPath=[]){
  await page.addInitScript(({patch,viewPath})=>{
    const descriptor={shared:true,id:1,label:viewPath.length?'child':'owner',ownerLabel:'owner',title:'Shell.ultra',kind:'patch',patch,dirty:false,viewPath,authoringRevision:1,runtimeRevision:9,messageTextSerial:0};
    window.shellCalls=[];window.shellConsole=[];
    window.__TAURI__={core:{invoke:async(name,args={})=>{
      window.shellCalls.push({name,args});
      if(name==='document_current')return descriptor;
      if(name==='document_list')return [descriptor];
      if(name==='help_reference')return{status:'available',object:args.name,sourceSha256:'0'.repeat(64),digest:'Original <digest>',description:'Synthetic safe <img src=x onerror="window.helpInjected=true"> text.',arguments:[{name:'tail',type:'list',optional:true,description:'Synthetic argument.'}],methods:[{name:'list',description:'Synthetic method.'}],inlets:[{name:'left',description:'Synthetic inlet.'}],outlets:[{name:'left',description:'Synthetic outlet.'}],related:[{name:'prepend',available:true},{name:'outside-catalog',available:false}]};
      if(name==='canvas_status')return{revision:9,active:true,nodes:[{id:9,value:77,pulses:1}],message_boxes:{revision:9,text_edit_serial:0,nodes:[{id:7,generation:2,empty:false,text:'runtime 23',prototype:{},placeholders:[]}]},console:window.shellConsole.splice(0)};
      if(name==='audio_status')return{running:false};
      if(name==='audio_devices')return{config:{host:'default',device:'default',sample_rate:48000,buffer_frames:null},hosts:[],devices:[],notice:'Audio is off.'};
      if(['document_set_dirty','document_focus','document_close_confirmed'].includes(name))return true;
      throw Error(`Unexpected shell bridge command: ${name}`);
    }},event:{listen:async()=>()=>{}},webviewWindow:{getCurrentWebviewWindow:()=>({label:descriptor.label})},webview:{getCurrentWebview:()=>({onDragDropEvent:async()=>()=>{}})}};
  },{patch:shell(),viewPath});
  await page.goto('/canvas.html');await expectBasic(page);
  await expect(page.locator('[data-node="9"] input')).toHaveValue('77');
  await expect(page.getByRole('button',{name:'Trigger message object 7',exact:true})).toHaveAccessibleDescription('runtime 23');
}

test('native shell references render safe text and Basic source reveal preserves live state in independent views',async({page,context})=>{
  await nativeShell(page);const before=await exported(page);
  await expect(page.locator('[data-node="5"].help-helper')).toContainText('Original <digest>');
  await reference(page);await expectBasic(page);
  await expect(page.locator('#help-reference-body')).toContainText('Synthetic method.');
  await expect(page.locator('#help-reference-body')).toContainText('<img src=x');
  await expect(page.locator('#help-reference-body img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.helpInjected)).toBeUndefined();
  const child=await context.newPage();await nativeShell(child,[3]);
  await expect(child.locator('#help-shell-controls')).toBeHidden();
  await child.locator('[data-node="5"] header').click();await child.keyboard.press('F1');
  await expect(child.locator('#help-reference-pane')).toBeVisible();
  await expect(page.locator('#help-reference-pane')).toBeVisible();
  await child.keyboard.press('Escape');await expect(child.locator('#help-reference-pane')).toBeHidden();
  await page.evaluate(()=>window.shellConsole.push({sequence:1,revision:9,node:8,label:'shell-source',level:0,text:'runtime 23',frame:0}));
  await page.locator('#show-console').click();await page.getByRole('button',{name:'shell-source:',exact:true}).click();
  await expect(page.locator('#help-reference-pane')).toBeHidden();
  await expect(page.locator('[data-node="8"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-node="9"] input')).toHaveValue('77');
  await expect(page.getByRole('button',{name:'Trigger message object 7',exact:true})).toHaveAccessibleDescription('runtime 23');
  expect(await exported(page)).toEqual(before);
  for(const view of [page,child]){
    const mutations=await view.evaluate(()=>window.shellCalls.filter(call=>['canvas_apply','canvas_stop','canvas_event','document_open_patcher','document_commit'].includes(call.name)));
    expect(mutations).toEqual([]);
  }
  await child.close();
});

test('compact help references stay above the Inspector and below the question menu',async({page})=>{
  await nativeShell(page);await page.setViewportSize({width:640,height:680});
  await page.locator('[data-node="5"] header').click();await page.locator('#show-inspector').click();
  await page.locator('#inspector').getByRole('button',{name:'Reference',exact:true}).click();
  await expect(page.locator('#help-reference-pane')).toBeVisible();
  const close=page.locator('#help-reference-close');
  expect(await close.evaluate(element=>{const r=element.getBoundingClientRect();return element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  await page.locator('#help-question').click();
  const menu=page.locator('#help-reference-menu');await expect(menu).toBeVisible();
  expect(await menu.evaluate(element=>{const r=element.getBoundingClientRect();return element.contains(document.elementFromPoint(r.right-5,r.top+30));})).toBe(true);
  await page.keyboard.press('Escape');await expect(menu).toBeHidden();
  await close.click();await expect(page.locator('#help-reference-pane')).toBeHidden();
});
