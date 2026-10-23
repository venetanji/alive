import {test,expect} from '@playwright/test';

test('console opens with keyboard and stays reachable on narrow previews',async({page})=>{
  await page.goto('/canvas.html');await page.keyboard.press('Control+m');
  await expect(page.locator('#patch-console')).toBeVisible();
  await expect(page.locator('#console-rows')).toContainText('Browser preview does not execute patches');
  await page.locator('#console-search').fill('notes');await page.locator('#console-level').selectOption('2');
  await page.getByRole('button',{name:'Clear',exact:true}).click();
  for(const width of [390,320]){
    await page.setViewportSize({width,height:740});
    const close=await page.locator('#close-console').boundingBox();expect(close.x+close.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.getByRole('button',{name:'Close console',exact:true}).click();
  await expect(page.locator('#patch-console')).toBeHidden();
});

test('print can be authored, inspected and saved with its popup attribute',async({page})=>{
  await page.goto('/canvas.html');await page.locator('#add-object').click();
  await page.getByRole('combobox',{name:'Object name and arguments'}).fill('print notes @level 2 @popup 1');
  await page.getByRole('combobox',{name:'Object name and arguments'}).press('Enter');
  const created=page.locator('.node').filter({hasText:'notes @level 2 @popup 1'});await expect(created).toBeVisible();
  const sink=page.locator(`[data-node="${await created.getAttribute('data-node')}"]`);
  await expect(sink.locator('.ports.outlets .port')).toHaveCount(0);
  await page.locator('#show-inspector').click();
  const popup=page.locator('#inspector [data-parameter="popup"]');
  await expect(popup).toHaveValue('1');await expect(popup.locator('option')).toHaveText(['Off','On']);
  await popup.selectOption('0');await expect(sink).not.toContainText('@popup');
  await popup.selectOption('1');
  await page.locator('.file-menu summary').click();await page.locator('#export-patch').click();
  const patch=JSON.parse(await page.locator('#patch-json').inputValue());
  expect(patch.nodes.at(-1)).toMatchObject({type:'print',params:{label:'notes',level:2,popup:1}});
});

// Synthetic IPC snapshots exercise real rendering; the desktop suite proves native execution.
test('Print bubbles render safe independent values, flip at the edge and expire with a frozen clock',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.addInitScript(()=>{
    let revision=0,patch={nodes:[]};
    window.printSnapshot=null;
    window.__TAURI__={core:{invoke:async(name,args={})=>{
      if(name==='document_current')return null;
      if(name==='document_list')return [];
      if(name==='canvas_apply'){patch=args.patch;return{revision:++revision};}
      if(name==='audio_status')return{running:false};
      if(name==='canvas_status')return{revision,active:true,nodes:patch.nodes.map(node=>({id:node.id,value:0,pulses:0})),console:[],print_popups:window.printSnapshot?{revision,...window.printSnapshot}:null};
      return true;
    }}};
  });
  await page.goto('/canvas.html');await page.locator('.file-menu summary').click();await page.locator('#open-patch').click();
  await page.locator('#patch-json').fill(JSON.stringify({version:1,profile:'ultra-canvas-v1',nodes:[
    {id:1,type:'print',x:80,y:100,params:{popup:1}},
    {id:2,type:'print',x:1080,y:160,params:{popup:1}},
  ],edges:[]}));
  await page.locator('#import-patch').click();
  const first=page.getByRole('status',{name:'Print output, object 1'}),second=page.getByRole('status',{name:'Print output, object 2'});
  await expect(first).toBeHidden();await expect(page.locator('#patch-console')).toBeHidden();
  await page.evaluate(()=>{window.printSnapshot={frame:48000,nodes:[
    {id:1,enabled:true,has_value:true,generation:1,frame:48000,text:'<native> 3.5'},
    {id:2,enabled:true,has_value:true,generation:1,frame:48000,text:'second independent value'},
  ]};});
  await expect(first).toBeVisible();await expect(second).toBeVisible();
  await expect(first).toHaveAccessibleDescription('<native> 3.5');await expect(first.locator('native')).toHaveCount(0);
  await expect(first).not.toHaveClass(/opens-left/);await expect(second).toHaveClass(/opens-left/);
  await page.locator('#workspace').click({position:{x:30,y:260}});
  await expect(first).toBeVisible();await expect(page.locator('#patch-console')).toBeHidden();
  await expect(first).toBeHidden({timeout:3500});await expect(second).toBeHidden();
  await page.evaluate(()=>{window.printSnapshot=null;});await expect(first).toBeHidden();
  await page.evaluate(()=>{window.printSnapshot={frame:48000,nodes:[{id:1,enabled:true,has_value:true,generation:1,frame:48000,text:'<native> 3.5'}]};});
  await expect(first).toBeHidden();
  await page.locator('#lock-patch').click();await page.locator('[data-node="1"] .object-label').dblclick();
  await expect(page.locator('#patch-console')).toBeVisible();
});
