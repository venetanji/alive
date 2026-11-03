import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('combined installed panel resources retain the exact source resource pair',async({page})=>{
  test.skip(!process.env.ALIVE_RESOURCE_PACK_FIXTURES,'Requires private qualified installed resource pack fixtures.');
  const fixtures=JSON.parse(await readFile(process.env.ALIVE_RESOURCE_PACK_FIXTURES,'utf8'));
  const paths=fixtures['current-20261102'];
  for(const kind of ['GUI','Graphics']){
    const body=await readFile(paths[kind]);
    await page.route(`**/fixture-${kind}`,route=>route.fulfill({body,contentType:'application/octet-stream'}));
  }
  await page.goto('/canvas.html');
  const result=await page.evaluate(async()=>{
    const {readLiveDeviceResources}=await import('/live-device-resources.mjs');
    const [guiBytes,graphicsBytes]=await Promise.all(['GUI','Graphics'].map(async kind=>new Uint8Array(await(await fetch(`/fixture-${kind}`)).arrayBuffer())));
    const source={guiSha256:'75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f',graphicsSha256:'ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d'};
    const resource=await readLiveDeviceResources({guiBytes,graphicsBytes,path:'Devices/UltraAnalog/Contents.xml',identity:source});
    let wrongSource=false,missingGraphics=false;
    try{await readLiveDeviceResources({guiBytes,graphicsBytes,identity:{...source,guiSha256:'0'.repeat(64)}});}catch(error){wrongSource=/identity/.test(error.message);}
    try{await readLiveDeviceResources({guiBytes,identity:source});}catch(error){missingGraphics=/Graphics/.test(error.message);}
    return{identity:resource.identity,resources:resource.layout.documents.length,nodes:resource.layout.nodeCount,wrongSource,missingGraphics};
  });
  expect(result).toEqual({identity:{guiSha256:'75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f',graphicsSha256:'ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d',resourceRelease:'current-20261102'},resources:17,nodes:719,wrongSource:true,missingGraphics:true});
});

async function ordinaryPanelPage(page){
  test.skip(!process.env.ALIVE_RESOURCE_PACK_FIXTURES,'Requires private qualified installed resource pack fixtures.');
  const fixtures=JSON.parse(await readFile(process.env.ALIVE_RESOURCE_PACK_FIXTURES,'utf8'));
  for(const kind of ['GUI','Graphics']){
    const body=await readFile(fixtures['current-20261102'][kind]);
    await page.route(`**/ordinary-pack-${kind}`,route=>route.fulfill({body,contentType:'application/octet-stream'}));
  }
  await page.route('**/ordinary-panel-test-host',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/canvas-presentation-view.css"><main id="panel"></main>'}));
  await page.goto('/ordinary-panel-test-host');
  await page.evaluate(async()=>{
    const {createSharedCanvasController}=await import('/canvas-shared.mjs');
    const {createUltraPresentationHost}=await import('/canvas-presentation-hosts.mjs');
    const {mountPresentation}=await import('/canvas-presentation-view.mjs');
    const {analogDescriptors,analogIdentity}=await import('/live-profiles/analog/facts.mjs');
    const packs=Object.fromEntries(await Promise.all(['GUI','Graphics'].map(async kind=>[kind,new Uint8Array(await(await fetch(`/ordinary-pack-${kind}`)).arrayBuffer())])));
    window.createOrdinaryPanelHarness=async()=>{
      // Explicit controlled values, not original defaults or native readback.
      const {version,profile,dllSha256,guiSha256,graphicsSha256}=analogIdentity;
      const state={version,profile,dllSha256,guiSha256,graphicsSha256,values:analogDescriptors.map(row=>row.min)};
      state.values[194]=12.1;
      const presentation={version:1,openOnLoad:true,size:{width:1100,height:220},items:[{
        id:'analog',kind:'livePanel',target:{node:7,profile},included:true,visible:true,
        rect:{x:0,y:0,width:1100,height:220},style:{accent:'default'},
      }]};
      const patch={version:2,profile:'ultra-patcher-v2',presentation,nodes:[{id:7,type:'live_device',x:0,y:0,params:{device:'Analog',state}}],edges:[]};
      const calls=[],errors=[];let authoringRevision=1,hook=null,view=null;
      const descriptor=()=>({shared:true,id:1,label:'ordinary-panel-test',ownerLabel:'ordinary-panel-test',viewPath:[],patch:structuredClone(patch),runtimeRevision:10,authoringRevision,descriptorRevision:authoringRevision});
      const catalog=()=>({generation:'10',parameters:analogDescriptors.map(row=>({...row,
        value:Math.fround(state.values[row.index]),applied:Math.fround(state.values[row.index]),revision:1,applied_revision:1,
      }))});
      const invoke=async(name,args={})=>{
        calls.push({name,args,at:performance.now()});
        if(hook){const result=hook(name,args);if(result!==undefined)return await result;}
        if(name==='document_current')return descriptor();
        if(name==='live_device_resource_pack')return packs[args.kind];
        if(name==='live_device_parameters')return catalog();
        throw Error(`Unexpected panel write or IPC: ${name}`);
      };
      const controller=createSharedCanvasController({invoke});
      if(!await controller.prepare())throw Error(`Panel descriptor rejected: ${controller.getState().notice}`);
      const host=createUltraPresentationHost({controller,invoke});
      return{host,controller,calls,errors,catalog,set hook(value){hook=value;},
        acquire:()=>host.acquirePanel({scope:host.scope,sourceNode:7,profile}),
        publish(change=()=>{}){change(patch);authoringRevision++;if(!controller.acceptDescriptor(descriptor()))throw Error('Descriptor refused');host.publish();},
        mount(){view=mountPresentation({doc:document,root:document.getElementById('panel'),presentation,host,onError:error=>errors.push(error.message)});return view;},
        async dispose(){view?.dispose();host.dispose();await controller.dispose();},
      };
    };
  });
}

test('ordinary shared host mounts the installed read-only panel and preserves source and pages',async({page})=>{
  await ordinaryPanelPage(page);
  const result=await page.evaluate(async()=>{
    const h=await window.createOrdinaryPanelHarness();
    try{
      const acquired=await h.acquire(),view=h.mount();
      while(!document.querySelector('.live-device-view')&&!h.errors.length)await new Promise(resolve=>setTimeout(resolve,10));
      if(h.errors.length)throw Error(h.errors.join('; '));
      const element=document.querySelector('.live-device-view'),buttons=[...element.querySelectorAll('button')];
      const mpe=buttons.find(button=>button.textContent==='MPE');
      for(const button of element.querySelectorAll('.live-device-finger')){button.click();if(mpe.checkVisibility())break;}
      mpe.click();
      h.publish(patch=>{patch.nodes[0].params.state.values[26]=.75;});
      const inputs=[...element.querySelectorAll('.live-device-control input,.live-device-control select,.live-device-control button')];
      const handles=[...element.querySelectorAll('.live-envelope-editor [role=slider]')];
      for(const input of [...inputs,...handles]){
        if(input.tagName==='INPUT')input.value='1';
        for(const type of ['input','change','click'])input.dispatchEvent(new Event(type,{bubbles:true}));
        input.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
        for(const type of ['pointerdown','pointermove','pointerup'])input.dispatchEvent(new PointerEvent(type,{pointerId:1,clientX:30,clientY:30,bubbles:true}));
      }
      await Promise.resolve();
      return{documents:acquired.resources.layout.documents.length,nodes:acquired.resources.layout.nodeCount,
        identity:acquired.resources.identity,raw194:h.controller.readLiveSource(7).expected.state.values[194],
        sourceBalance:acquired.bindings.snapshot().values.NoiseBalance,mpeSelected:mpe.getAttribute('aria-checked'),
        sameElement:document.querySelector('.live-device-view')===element,inputs:inputs.length,handles:handles.length,
        enabled:inputs.filter(input=>!input.disabled).length+handles.filter(handle=>handle.getAttribute('aria-disabled')!=='true').length,
        draft:view.hasDraft(),errors:h.errors,writes:h.calls.filter(call=>!['document_current','live_device_resource_pack','live_device_parameters'].includes(call.name))};
    }finally{await h.dispose();}
  });
  expect(result).toMatchObject({documents:17,nodes:719,raw194:12.1,sourceBalance:.25,mpeSelected:'true',sameElement:true,enabled:0,draft:false,errors:[],writes:[]});
  expect(result.inputs).toBeGreaterThan(100);expect(result.handles).toBeGreaterThan(0);
  expect(result.identity.resourceRelease).toBe('current-20261102');
});

test('ordinary panel disconnect and reacquire retain the 250ms observation bound',async({page})=>{
  await ordinaryPanelPage(page);
  const result=await page.evaluate(async()=>{
    const h=await window.createOrdinaryPanelHarness();
    try{
      const first=await h.acquire();first.bindings.disconnect();
      const second=await h.acquire();second.bindings.disconnect();
      const calls=h.calls.filter(call=>call.name==='live_device_parameters');
      return{reads:calls.length,interval:calls[1].at-calls[0].at};
    }finally{await h.dispose();}
  });
  expect(result.reads).toBe(2);expect(result.interval).toBeGreaterThanOrEqual(250);
});

test('ordinary host disposal cancels a pending observation delay',async({page})=>{
  await ordinaryPanelPage(page);
  const result=await page.evaluate(async()=>{
    const h=await window.createOrdinaryPanelHarness();
    try{
      const first=await h.acquire();first.bindings.disconnect();
      h.publish(patch=>{patch.nodes[0].params.state.values[26]=.75;});
      const pending=h.acquire().then(()=>({accepted:true}),error=>({error:error.message}));
      await new Promise(resolve=>setTimeout(resolve,10));h.host.dispose();
      const reply=await Promise.race([pending,new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),80))]);
      await new Promise(resolve=>setTimeout(resolve,275));
      return{...reply,reads:h.calls.filter(call=>call.name==='live_device_parameters').length};
    }finally{await h.dispose();}
  });
  expect(result.timeout).toBeUndefined();expect(result.accepted).toBeUndefined();
  expect(result.error).toMatch(/disconnect|scope|disposed/i);expect(result.reads).toBe(1);
});

for(const change of ['source','deletion','disposal'])test(`ordinary acquisition discards native replies after ${change}`,async({page})=>{
  await ordinaryPanelPage(page);
  const result=await page.evaluate(async change=>{
    const h=await window.createOrdinaryPanelHarness();let resolve,started=false;
    const gate=new Promise(done=>{resolve=done;}),catalog=h.catalog();
    h.hook=name=>{if(name==='live_device_parameters'){started=true;return gate;}};
    try{
      const pending=h.acquire().then(()=>({accepted:true}),error=>({error:error.message}));
      while(!started)await new Promise(done=>setTimeout(done,10));
      if(change==='disposal')h.host.dispose();
      else h.publish(patch=>{if(change==='source')patch.nodes[0].params.state.values[194]=12.2;else{patch.nodes=[];patch.presentation=null;}});
      resolve(catalog);return await pending;
    }finally{resolve(catalog);await h.dispose();}
  },change);
  expect(result.accepted).toBeUndefined();expect(result.error).toMatch(/changed|unavailable|disconnect|scope/i);
});
