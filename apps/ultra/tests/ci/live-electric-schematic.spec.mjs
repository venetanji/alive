import {test,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

test.use({deviceScaleFactor:2});
let fixture;
test.beforeEach(async({page})=>{
  test.skip(!process.env.ALIVE_ELECTRIC_SCHEMATIC_FIXTURES,'Requires private verified resource packs and independent pixel hashes.');
  fixture=JSON.parse(await readFile(process.env.ALIVE_ELECTRIC_SCHEMATIC_FIXTURES,'utf8'));
  await page.route('**/schematic-host',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><head><link rel="stylesheet" href="/live-controls.css"><link rel="stylesheet" href="/live-device-view.css"></head><body style="margin:0;padding:16px;background:#e5e5dc"></body>'}));
  for(const kind of ['GUI','Graphics'])await page.route(`**/schematic-${kind}`,async route=>route.fulfill({body:await readFile(fixture[kind]),contentType:'application/octet-stream'}));
  await page.goto('/schematic-host');
  await page.evaluate(async xml=>{
    const {readLiveDeviceResources}=await import('/live-device-resources.mjs');
    const {createElectricBindings}=await import('/live-profiles/electric/bindings.mjs');
    const {parseElectricDefaultPresetXml}=await import('/live-profiles/electric/default-model.mjs');
    const [guiBytes,graphicsBytes]=await Promise.all(['GUI','Graphics'].map(async kind=>new Uint8Array(await(await fetch(`/schematic-${kind}`)).arrayBuffer())));
    window.resources=await readLiveDeviceResources({guiBytes,graphicsBytes,path:'Devices/LoungeLizard/Contents.xml'});
    window.bindings=createElectricBindings({modelValues:parseElectricDefaultPresetXml(xml).values});
    window.paints=[];window.rasterErrors=[];
    const put=CanvasRenderingContext2D.prototype.putImageData;
    CanvasRenderingContext2D.prototype.putImageData=function(image,...args){
      const path=this.canvas.parentElement?.dataset.artworkPath;
      if(path)window.paints.push({path,bytes:[...image.data]});
      return put.call(this,image,...args);
    };
    window.mountSchematic=async(family='normal',isCurrent=()=>true)=>{
      const {createLiveDeviceView}=await import('/live-device-view.mjs');
      const view=createLiveDeviceView(document,{...window.resources,electricSchematicFamily:family,isCurrent,resolveBinding:bindings.resolve,evaluateExpression:bindings.evaluate,onError:error=>rasterErrors.push(error.message)});
      const viewport=document.createElement('div');viewport.className='live-resource-viewport';viewport.append(view.element);document.body.append(viewport);
      window.view=view;return view.report;
    };
  },fixture.xml);
});

async function hashes(page){
  return page.evaluate(async()=>{
    const result={};
    for(const {path,bytes}of window.paints)result[path]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(bytes))),b=>b.toString(16).padStart(2,'0')).join('');
    return result;
  });
}
const base=page=>page.locator('[data-artwork-path$="DeviceSchemaBase.png"]');
const mask=page=>page.locator('[data-view-id="DeviceSchemaAnimation"]');
async function expectSchematicPlacement(page){
  const geometry=await base(page).evaluate(element=>{
    const stack=element.parentElement,cell=stack.parentElement,cellBox=cell.getBoundingClientRect();
    const relative=node=>{const box=node.getBoundingClientRect();return[box.x-cellBox.x,box.y-cellBox.y,box.width,box.height];};
    return{cell:[cellBox.width,cellBox.height],stack:relative(stack),base:relative(element),mask:relative(stack.querySelector('[data-view-id="DeviceSchemaAnimation"]')),clickMap:relative(stack.querySelector('[data-view-id="DeviceSchemaClickMap"]'))};
  });
  expect(geometry).toEqual({cell:[106,98],stack:[0,0,106,95],base:[8,4,90,90],mask:[8,4,90,90],clickMap:[0,0,106,98]});
}

test('original normal base and four masks follow editor pages and current theme',async({page})=>{
  await page.evaluate(()=>window.mountSchematic());
  await expect(base(page)).toHaveAttribute('data-artwork-state','ready');
  const family='Devices/Electric';
  expect((await hashes(page))[`${family}/DeviceSchemaBase.png`]).toBe(fixture.pixels[`${family}/DeviceSchemaBase.png`].rgba);
  for(let index=0;index<4;index++){
    await page.locator('[data-view-class=FingerView]').nth(index).click();
    const path=`${family}/DeviceSchema0${index}.png`;
    await expect(mask(page)).toHaveAttribute('data-artwork-path',path);
    await expect(mask(page)).toHaveAttribute('data-artwork-state','ready');
    expect((await hashes(page))[path]).toBe(fixture.pixels[path].tintCyan);
    await expectSchematicPlacement(page);
  }
  await page.locator('[data-view-class=FingerView]').first().click();
  await expect(mask(page)).toHaveAttribute('data-artwork-state','ready');
  await page.evaluate(()=>{document.documentElement.style.setProperty('--live-accent','#ed7c11');view.refresh();});
  await expect.poll(async()=>(await hashes(page))[`${family}/DeviceSchema00.png`]).toBe(fixture.pixels[`${family}/DeviceSchema00.png`].tintOrange);
  expect(await page.evaluate(()=>paints.some(p=>/DeviceSchema0[45]\.png$/.test(p.path)))).toBe(false);
  expect(await base(page).locator('canvas').evaluate(e=>({width:e.width,height:e.height,logical:e.getBoundingClientRect().width,dpr:devicePixelRatio}))).toEqual({width:90,height:90,logical:90,dpr:2});
  const report=await page.evaluate(()=>view.report);
  expect(report.unsupportedClasses).not.toContain('LoadableAnimationView');
  expect(report.unsupportedProperties.filter(p=>p.property==='Artwork.Placement').map(p=>p.status)).toEqual(['inferred','inferred']);
  for(const property of ['Artwork.DpiFamily','Artwork.Resampling','Artwork.NativeLayout','Artwork.OtherScales'])expect(report.unsupportedProperties.filter(p=>p.property===property&&/unqualified/i.test(p.reason))).toHaveLength(2);
  expect(report.unsupportedProperties.some(p=>p.property==='ClickMap.Interaction')).toBe(true);
  await expect(page.locator('.live-device-control input:not(:disabled),.live-device-control button:not(:disabled),.live-device-control select:not(:disabled)')).toHaveCount(0);
  if(process.env.ALIVE_ELECTRIC_SCHEMATIC_OUTPUT){
    await page.evaluate(()=>{document.documentElement.style.removeProperty('--live-accent');view.refresh();});
    await expect.poll(async()=>(await hashes(page))[`${family}/DeviceSchema00.png`]).toBe(fixture.pixels[`${family}/DeviceSchema00.png`].tintCyan);
    const output=process.env.ALIVE_ELECTRIC_SCHEMATIC_OUTPUT;await mkdir(output,{recursive:true});
    await writeFile(join(output,'renderer-report.json'),JSON.stringify(report,null,2)+'\n');
    for(const [width,height]of [[390,844],[800,600],[1280,800],[1440,900]]){
      await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.body.scrollWidth)).toBeLessThanOrEqual(width);
      for(let index=0;index<4;index++){
        await page.locator('[data-view-class=FingerView]').nth(index).click();
        await expect(mask(page)).toHaveAttribute('data-artwork-path',`${family}/DeviceSchema0${index}.png`);
        await expect(mask(page)).toHaveAttribute('data-artwork-state','ready');
        await expectSchematicPlacement(page);
        await page.screenshot({path:join(output,index===0?`schematic-${width}x${height}.png`:`schematic-page-${index}-${width}x${height}.png`)});
      }
    }
  }
});

test('explicit Large family retains logical size and transparent Global mask',async({page})=>{
  await page.evaluate(()=>window.mountSchematic('large'));
  await expect(base(page)).toHaveAttribute('data-artwork-state','ready');
  expect((await hashes(page))['Devices/Electric/Large/DeviceSchemaBase.png']).toBe(fixture.pixels['Devices/Electric/Large/DeviceSchemaBase.png'].rgba);
  expect(await base(page).locator('canvas').evaluate(e=>({width:e.width,height:e.height,logical:e.getBoundingClientRect().width}))).toEqual({width:180,height:180,logical:90});
  for(let index=0;index<4;index++){
    const path=`Devices/Electric/Large/DeviceSchema0${index}.png`;
    await page.locator('[data-view-class=FingerView]').nth(index).click();
    await expect(mask(page)).toHaveAttribute('data-artwork-path',path);
    await expect(mask(page)).toHaveAttribute('data-artwork-state','ready');
    expect((await hashes(page))[path]).toBe(fixture.pixels[path].tintCyan);
    await expectSchematicPlacement(page);
  }
  expect(await mask(page).locator('canvas').evaluate(e=>e.getContext('2d').getImageData(0,0,e.width,e.height).data.every((v,i)=>i%4!==3||v===0))).toBe(true);
});

test('rapid page replacement and disposal cannot publish stale artwork',async({page})=>{
  await page.evaluate(async()=>{
    await window.mountSchematic();
    for(const index of [1,2,3])document.querySelectorAll('.live-device-finger')[index].click();
  });
  await expect(mask(page)).toHaveAttribute('data-artwork-state','ready');
  expect(await page.evaluate(()=>paints.filter(p=>!p.path.endsWith('Base.png')).map(p=>p.path))).toEqual(['Devices/Electric/DeviceSchema03.png']);
  const result=await page.evaluate(async()=>{
    const old=view;old.dispose();const oldCanvases=[...old.element.querySelectorAll('[data-artwork-path] canvas')];
    paints.length=0;await mountSchematic();const current=view;current.dispose();
    await new Promise(resolve=>setTimeout(resolve,100));
    return{paints:paints.length,oldSizes:oldCanvases.map(e=>[e.width,e.height]),newSizes:[...current.element.querySelectorAll('[data-artwork-path] canvas')].map(e=>[e.width,e.height])};
  });
  expect(result.paints).toBe(0);expect(result.oldSizes).toEqual([[0,0],[0,0]]);expect(result.newSizes).toEqual([]);
});

test('revoked host generation cannot publish a pending decode',async({page})=>{
  const result=await page.evaluate(async()=>{
    let current=true;await mountSchematic('normal',()=>current);current=false;
    await new Promise(resolve=>setTimeout(resolve,100));
    return{paints:paints.length,status:view.report.artwork.map(entry=>entry.status)};
  });
  expect(result.paints).toBe(0);expect(result.status).not.toContain('ready');
});

test('late drawing errors cannot report into a revoked host generation',async({page})=>{
  const result=await page.evaluate(async()=>{
    let current=true;
    const put=CanvasRenderingContext2D.prototype.putImageData;
    CanvasRenderingContext2D.prototype.putImageData=function(...args){
      if(this.canvas.parentElement?.dataset.artworkPath){current=false;throw Error('Drawing failed while ownership was revoked');}
      return put.apply(this,args);
    };
    await mountSchematic('normal',()=>current);
    await new Promise(resolve=>setTimeout(resolve,100));
    return{errors:rasterErrors,status:view.report.artwork.map(entry=>entry.status)};
  });
  expect(result.errors).toEqual([]);expect(result.status).not.toContain('unavailable');
});

test('unsupported family reports unavailable artwork without substituting pixels',async({page})=>{
  await page.evaluate(()=>mountSchematic('automatic'));
  await expect(page.locator('[data-artwork-state=unavailable]')).toHaveCount(2);
  expect(await page.evaluate(()=>paints.length)).toBe(0);
  expect(await page.evaluate(()=>view.report.artwork.every(entry=>/explicit artwork family/.test(entry.error)))).toBe(true);
});

test('presentation replacement owns verified pair forwarding and raster teardown',async({page})=>{
  await page.evaluate(async()=>{
    const {mountPresentation}=await import('/canvas-presentation-view.mjs');
    const root=document.createElement('div');document.body.append(root);window.panelRoot=root;
    const panelBindings={snapshot:()=>({values:{}}),resolveBinding:bindings.resolve,evaluateExpression:bindings.evaluate,disconnect(){}};
    const host={scope:{ownerId:'test',generation:1,instanceId:'one',sourceRevision:'source'},subscribe:()=>()=>{},acquirePanel:async()=>({resources,bindings:panelBindings})};
    window.presentation={size:{width:600,height:280},items:[{id:'panel',kind:'livePanel',target:{node:7,profile:'live12-electric-v1'},rect:{x:0,y:0,width:600,height:280},included:true,visible:true,style:{accent:'default'}}]};
    window.panelHost=host;window.mounted=mountPresentation({doc:document,root,presentation,host});
  });
  await expect(base(page)).toHaveAttribute('data-artwork-state','ready');
  await page.evaluate(()=>{window.retained=[...panelRoot.querySelectorAll('[data-artwork-path] canvas')];mounted.update({...presentation,size:{width:620,height:280}});});
  await expect(base(page)).toHaveAttribute('data-artwork-state','ready');
  expect(await page.evaluate(()=>retained.map(e=>[e.width,e.height]))).toEqual([[0,0],[0,0]]);
  await page.evaluate(()=>mounted.dispose());
  expect(await page.locator('[data-artwork-path] canvas').evaluateAll(elements=>elements.every(e=>e.width===0&&e.height===0))).toBe(true);
  const stale=await page.evaluate(async()=>{
    const {mountPresentation}=await import('/canvas-presentation-view.mjs');
    paints.length=0;mounted=mountPresentation({doc:document,root:panelRoot,presentation,host:panelHost});
    await new Promise(resolve=>queueMicrotask(()=>queueMicrotask(resolve)));
    panelHost.scope={...panelHost.scope,generation:2};
    await new Promise(resolve=>setTimeout(resolve,100));
    mounted.dispose();return paints.length;
  });
  expect(stale).toBe(0);
});
