import {test,expect} from '@playwright/test';

// Rendered UI checks with a native document bridge fixture; no native execution or audio claim.
async function mountNativeDocuments(page){
  await page.addInitScript(()=>{
    const patch={version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'add',x:40,y:40,params:{rhs:12}}],edges:[]};
    const current={id:1,label:'patch-1',title:'First.ultra',kind:'patch',patch};let revision=0,applied=patch;
    window.documentCalls=[];
    window.__TAURI__={
      core:{invoke:async(name,args={})=>{
        window.documentCalls.push({name,args});
        if(name==='document_current')return current;
        if(name==='document_list')return Array.from({length:16},(_,index)=>({id:index+1,label:`patch-${index+1}`,title:`Patch ${index+1} - independent window.ultra`,kind:'patch'}));
        if(['document_new','document_open','document_open_help','document_save'].includes(name))return current;
        if(['document_set_dirty','document_focus','canvas_stop','document_close_confirmed'].includes(name))return true;
        if(name==='canvas_apply'){applied=args.patch;return{revision:++revision};}
        if(name==='canvas_status')return{revision,active:true,nodes:applied.nodes.map(node=>({id:node.id,value:0,pulses:0})),console:[]};
        if(name==='audio_status')return{running:false};
        if(name==='audio_devices')return{config:{host:'default',device:'default',sample_rate:48000,buffer_frames:null},hosts:['PipeWire'],effective_host:'PipeWire',devices:[],notice:'Audio is off.'};
        throw Error(`Unexpected bridge command: ${name}`);
      }},
      event:{listen:async()=>()=>{}},webviewWindow:{getCurrentWebviewWindow:()=>({label:'patch-1'})},
      webview:{getCurrentWebview:()=>({onDragDropEvent:async()=>()=>{}})},
    };
  });
  await page.goto('/canvas.html');await expect(page.locator('#document-title')).toHaveText('First.ultra');
}

test('native library keeps sixteen open windows reachable at the minimum child-window size',async({page},testInfo)=>{
  await page.setViewportSize({width:640,height:480});await mountNativeDocuments(page);await page.locator('#open-help-library').click();
  await expect(page.locator('.document-window')).toHaveCount(16);
  const bounds=await page.locator('#help-library').evaluate(dialog=>{
    const modal=dialog.getBoundingClientRect(),windows=document.getElementById('document-windows').getBoundingClientRect();
    return{modalTop:modal.top,modalBottom:modal.bottom,windowsTop:windows.top,windowsBottom:windows.bottom,height:innerHeight};
  });
  expect(bounds.modalTop).toBeGreaterThanOrEqual(0);expect(bounds.modalBottom).toBeLessThanOrEqual(bounds.height);
  expect(bounds.windowsTop).toBeGreaterThanOrEqual(bounds.modalTop);expect(bounds.windowsBottom).toBeLessThanOrEqual(bounds.modalBottom);
  await page.locator('[data-window-label="patch-16"]').click();
  await expect.poll(()=>page.evaluate(()=>window.documentCalls.filter(call=>call.name==='document_focus').map(call=>call.args.label))).toEqual(['patch-16']);
  await expect(page.locator('#help-library')).toBeHidden();
  await page.locator('#open-help-library').click();await page.screenshot({path:testInfo.outputPath('native-library-small-window.png')});
});

test('Enter activates document toolbar buttons with a selected canvas object',async({page})=>{
  await mountNativeDocuments(page);await page.locator('[data-node="1"] [data-drag]').click();
  await expect(page.locator('[data-node="1"]')).toHaveClass(/selected/);
  for(const [id,command]of [['document-new','document_new'],['document-open','document_open'],['document-save','document_save']]){
    await page.locator('#'+id).focus();await page.keyboard.press('Enter');
    await expect.poll(()=>page.evaluate(name=>window.documentCalls.filter(call=>call.name===name).length,command)).toBe(1);
    await expect(page.locator('#object-entry')).toBeHidden();
  }
  await page.locator('#open-help-library').focus();await page.keyboard.press('Enter');await expect(page.locator('#help-library')).toBeVisible();
});

test('Enter opens File and activates Save As while F2 still edits a selected canvas object',async({page})=>{
  await mountNativeDocuments(page);await page.locator('[data-node="1"] [data-drag]').click();
  await page.locator('#file-menu summary').focus();await page.keyboard.press('Enter');await expect(page.locator('#file-menu')).toHaveAttribute('open');
  await page.locator('#document-save-as').focus();await page.keyboard.press('Enter');
  await expect.poll(()=>page.evaluate(()=>window.documentCalls.filter(call=>call.name==='document_save'&&call.args.saveAs).length)).toBe(1);
  await expect(page.locator('#object-entry')).toBeHidden();
  await page.locator('#workspace').focus();await page.keyboard.press('F2');await expect(page.locator('#object-entry')).toBeVisible();
});

test('Ctrl+S commits a focused number before saving its owner',async({page})=>{
  await page.addInitScript(()=>{
    let patch={version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'number',x:40,y:40,params:{value:10}}],edges:[]},revision=1;
    const descriptor=()=>({shared:true,id:1,label:'owner',ownerLabel:'owner',title:'Number.ultra',kind:'patch',viewPath:[],patch:structuredClone(patch),authoringRevision:revision,runtimeRevision:1,dirty:false});
    window.documentCalls=[];
    window.__TAURI__={core:{invoke:async(name,args={})=>{
      window.documentCalls.push({name,args});
      if(name==='document_current')return descriptor();
      if(name==='document_commit'){patch=structuredClone(args.patch);revision++;return{accepted:true,document:descriptor()};}
      if(name==='document_save')return descriptor();
      if(name==='canvas_status')return{revision:1,active:true,nodes:[],console:[]};
      if(name==='audio_status')return{running:false};
      if(name==='audio_devices')return{config:{host:'default',device:'default',sample_rate:48000,buffer_frames:null},hosts:[],devices:[],notice:'Audio is off.'};
      return true;
    }},event:{listen:async()=>()=>{}},webviewWindow:{getCurrentWebviewWindow:()=>({label:'owner'})},webview:{getCurrentWebview:()=>({onDragDropEvent:async()=>()=>{}})}};
  });
  await page.goto('/canvas.html');await expect(page.locator('#document-title')).toHaveText('Number.ultra');
  await page.locator('#lock-patch').click();
  const input=page.locator('[data-node="1"] [data-parameter="value"]');await input.click();await input.fill('42');await input.press('Control+s');
  await expect.poll(()=>page.evaluate(()=>window.documentCalls.filter(call=>call.name==='document_save').length)).toBe(1);
  const calls=await page.evaluate(()=>window.documentCalls);
  expect(calls.filter(call=>call.name==='document_commit')).toHaveLength(1);
  expect(calls.find(call=>call.name==='document_save').args.patch.nodes[0].params.value).toBe(42);
  expect(calls.findIndex(call=>call.name==='document_commit')).toBeLessThan(calls.findIndex(call=>call.name==='document_save'));
  await input.fill('');await input.evaluate(element=>element.blur());
  await page.locator('#document-save').evaluate(element=>{element.focus();element.click();});
  await expect.poll(()=>page.locator('#notice').textContent()).toContain('invalid focused edit');
  expect(await page.evaluate(()=>window.documentCalls.filter(call=>call.name==='document_save').length)).toBe(1);
  await expect(input).toHaveValue('');await input.focus();await input.press('Escape');await input.press('Control+s');
  await expect.poll(()=>page.evaluate(()=>window.documentCalls.filter(call=>call.name==='document_save').length)).toBe(2);
});
