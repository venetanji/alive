import {test,expect} from '@playwright/test';
import {subtractivePatch} from '../../ui/canvas-instrument.mjs';

// Rendered panel/IPC checks. Native DSP and actual desktop have separate gates.
async function mount(page,{nested=false,child=false}={}){
  const patch=subtractivePatch();
  if(nested){patch.version=2;patch.profile='ultra-patcher-v2';patch.nodes=[{id:100,type:'patcher',x:40,y:40,params:{name:'synth'},patcher:{presentation:null,nodes:patch.nodes,edges:patch.edges}}];patch.edges=[];}
  await page.addInitScript(({patch,child})=>{
    let current={id:1,label:'patch-1',title:'Subtractive.ultra',kind:'patch',shared:true,
      ownerLabel:'patch-1',viewPath:child?[100]:[],authoringRevision:1,runtimeRevision:1,descriptorRevision:1,patch};
    window.instrumentCalls=[];
    window.__TAURI__={core:{invoke:async(name,args={})=>{
      window.instrumentCalls.push({name,args});
      if(name==='document_current')return current;
      if(name==='document_list')return[current];
      if(name==='document_parameter_gesture'){
        const r=args.request;
        const find=scope=>scope.nodes.flatMap(node=>[node,...(node.patcher?find(node.patcher):[])]);
        if(r.phase==='commit'){find(current.patch).find(node=>node.id===r.node).params[r.key]=r.value;current={...current,authoringRevision:current.authoringRevision+1,descriptorRevision:current.descriptorRevision+1,parameterPreviews:[]};}
        else if(r.phase==='preview')current={...current,parameterPreviews:[{node:r.node,key:r.key,value:r.value}]};
        else if(r.phase==='cancel')current={...current,parameterPreviews:[]};
        return{token:1,document:current};
      }
      if(name==='document_commit'){
        current={...current,patch:args.patch,authoringRevision:current.authoringRevision+1,
          descriptorRevision:current.descriptorRevision+1};
        return{accepted:true,document:current};
      }
      if(['canvas_stop','canvas_event','document_set_dirty','document_instantiate'].includes(name))return true;
      if(name==='audio_status')return{running:true};
      if(name==='canvas_status')return{revision:1,active:true,nodes:[],console:[]};
      if(name==='audio_devices')return{config:{host:'default',device:'default',sample_rate:48000,buffer_frames:512},hosts:['PipeWire'],effective_host:'PipeWire',devices:[],notice:''};
      throw Error('Unexpected instrument command: '+name);
    }},event:{listen:async()=>()=>{}},webviewWindow:{getCurrentWebviewWindow:()=>({label:'patch-1'})},
    webview:{getCurrentWebview:()=>({onDragDropEvent:async()=>()=>{}})}};
  },{patch,child});
  await page.goto('/canvas.html');await page.getByRole('button',{name:'Perform instrument',exact:true}).click();
  await expect(page.locator('#instrument-controls .presentation-surface')).toBeVisible();
  await expect(page.getByRole('group',{name:'Instrument keyboard',exact:true})).toHaveCount(0);
}

test('Perform saves a full preset, recalls bound parameters and creates an independent native instance',async({page})=>{
  await mount(page);
  const cutoff=page.getByRole('spinbutton',{name:'Cutoff value',exact:true});
  await cutoff.fill('731');await cutoff.press('Tab');
  await page.getByRole('textbox',{name:'New preset name',exact:true}).fill('Warm');
  await page.getByRole('button',{name:'Store preset',exact:true}).click();
  await expect(page.getByLabel('Instrument preset',{exact:true})).toHaveValue('Warm');
  await cutoff.fill('5200');await cutoff.press('Tab');
  await page.getByRole('button',{name:'Recall',exact:true}).click();
  await expect(cutoff).toHaveValue('731');
  const commits=await page.evaluate(()=>window.instrumentCalls.filter(call=>call.name==='document_commit'));
  const saved=commits.findLast(c=>c.args.patch.device.presets.some(p=>p.name==='Warm')).args.patch;
  expect(saved.device.presets.at(-1).values.cutoff).toBe(731);
  expect(Object.keys(saved.device.presets.at(-1).values)).toHaveLength(7);
  await page.getByRole('button',{name:'New instance',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.instrumentCalls.filter(call=>call.name==='document_instantiate').length)).toBe(1);
});

test('closing and hiding the saved surface sends no notes or stop commands',async({page})=>{
  await mount(page);
  await page.getByRole('button',{name:'Close instrument panel',exact:true}).click();
  expect(await page.evaluate(()=>window.instrumentCalls.filter(c=>['canvas_event','canvas_stop'].includes(c.name)))).toEqual([]);
});

test('Perform remains reachable and scrollable in a 640 by 480 window',async({page})=>{
  await page.setViewportSize({width:640,height:480});await mount(page);
  const panel=page.getByRole('complementary',{name:'Instrument panel'});
  await expect(panel).toBeVisible();
  await page.getByRole('button',{name:'New instance',exact:true}).scrollIntoViewIfNeeded();
  const bounds=await panel.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(640);
});

test('Perform addresses embedded device bindings from both root and child views',async({page})=>{
  for(const child of [false,true]){
    await mount(page,{nested:true,child});
    const cutoff=page.getByRole('spinbutton',{name:'Cutoff value',exact:true});
    await cutoff.fill('815');await cutoff.press('Tab');
    await expect.poll(()=>page.evaluate(()=>window.instrumentCalls.filter(call=>call.name==='document_parameter_gesture'&&call.args.request.phase==='commit').at(-1)?.args.request)).toMatchObject({node:4,key:'cutoff',value:815});
    expect(await page.evaluate(()=>window.instrumentCalls.filter(call=>call.name==='canvas_event'))).toEqual([]);
  }
});

for(const size of [{width:800,height:600},{width:1280,height:800}])test(`saved Ultra surface keeps natural size and focus at ${size.width}x${size.height}`,async({page},info)=>{
  await page.setViewportSize(size);await mount(page);
  const viewport=page.locator('#instrument-controls .presentation-viewport'),surface=page.locator('#instrument-controls .presentation-surface');
  const width=await surface.evaluate(e=>e.offsetWidth);expect(width).toBe(subtractivePatch().presentation.size.width);
  expect(await viewport.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
  const field=page.getByRole('spinbutton',{name:'Attack value',exact:true});await field.fill('123');await expect(field).toBeFocused();await expect(page.getByLabel('Attack effective ownership',{exact:true})).toBeInViewport({ratio:1});
  await page.screenshot({path:info.outputPath(`saved-ultra-${size.width}x${size.height}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await page.getByRole('button',{name:'Close instrument panel',exact:true}).click();await page.getByRole('button',{name:'Perform instrument',exact:true}).click();await expect(field).toHaveValue('123');
});

for(const size of [{width:800,height:600},{width:1280,height:800}])test(`resource panel errors keep size and bitmap URLs stay per mount at ${size.width}x${size.height}`,async({page},info)=>{
  await page.setViewportSize(size);await page.goto('/canvas.html');
  await page.evaluate(async()=>{
    const {mountPresentation}=await import('/canvas-presentation-view.mjs');
    const gallery=document.createElement('main');gallery.style.cssText='width:100%;max-width:620px;overflow:auto;padding:8px;display:block';document.body.replaceChildren(gallery);
    const created=[],revoked=[],create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{const url=create(blob);created.push(url);return url;};URL.revokeObjectURL=url=>{revoked.push(url);revoke(url);};
    const prop=Value=>({attributes:{Value}}),point=(X,Y)=>({attributes:{X,Y}});
    const node=(className,properties={},expression=null,children=[])=>({className,properties,scope:[],resource:'fixture.xml',connection:expression?{scope:[],resource:'fixture.xml',expression}:null,children,text:name=>name==='Label'?'Resource level':''});
    const bitmap=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
    const resources=Object.freeze({identity:'fixture:exact-gui-hash:exact-graphics-hash:EN:fixture.xml',layout:{root:node('VertBoxView',{},null,[node('LoadableDisplayStyleEditField',{Size:point(180,24)},'level'),node('BitmapView',{BitmapName:prop('fixture.png'),Size:point(24,24)})]),warnings:[]},graphics:{has:p=>p==='fixture.png',read:()=>bitmap.slice()}});
    const item=(id,sourceNode,x,width)=>({id,kind:'livePanel',target:{node:sourceNode,profile:'fixture'},included:true,visible:true,rect:{x,y:8,width,height:140},style:{accent:'default'}}),presentation={version:1,openOnLoad:false,size:{width:640,height:160},items:[item('resource',7,8,300),item('missing',8,324,300)]},views=[];
    for(const instanceId of ['first','second']){
      const root=document.createElement('section');root.id=`fixture-${instanceId}`;const title=document.createElement('p');title.textContent=`${instanceId} instance`;gallery.append(title,root);let value=.4,enabled=true;
      const scope=Object.freeze({ownerId:'fixture-owner',generation:1,instanceId,sourceRevision:resources.identity});
      const host={scope,subscribe:()=>()=>{},beginGesture:()=>`${instanceId}-gesture`,resolve:()=>null,snapshot:()=>null,write:()=>{throw Error('Unexpected scalar write');},sendEvent:()=>{throw Error('Unexpected event');},writeBatch:async request=>{value=request.values.level;return{values:{level:value,undisplayed:.9}};},acquirePanel:async request=>{if(request.sourceNode===8)throw Error('Panel resources unavailable. Reopen the device source.');return{resources,bindings:{snapshot:()=>({values:{level:value,undisplayed:.9}}),resolveBinding:()=>({bindingId:'level',verified:true,min:0,max:1,getState:()=>({known:true,enabled,value,initial:.4})}),observe:accepted=>{value=accepted.values.level;},disconnect(){enabled=false;}}};}};
      views.push(mountPresentation({doc:document,root,presentation,host}));
    }
    window.resourceFixture={created,revoked,dispose:()=>views.forEach(view=>view.dispose())};
  });
  const first=page.locator('#fixture-first'),second=page.locator('#fixture-second');await expect(first.getByRole('alert')).toContainText('Panel resources unavailable');
  const input=first.getByRole('spinbutton',{name:'Resource level'});await input.fill('0.64');await expect(second.getByRole('spinbutton',{name:'Resource level'})).toHaveValue('0.4');await expect(input).toBeFocused();
  const error=first.locator('[data-presentation-id=missing]');expect(await error.evaluate(e=>[e.offsetWidth,e.offsetHeight])).toEqual([300,140]);
  expect(await page.evaluate(()=>window.resourceFixture.created.length)).toBe(2);await expect(first.locator('img')).toBeVisible();expect(await first.locator('img').evaluate(e=>e.naturalWidth)).toBe(1);
  await page.screenshot({path:info.outputPath(`saved-resource-error-${size.width}x${size.height}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await page.evaluate(()=>window.resourceFixture.dispose());expect(await page.evaluate(()=>window.resourceFixture.revoked.sort())).toEqual(await page.evaluate(()=>window.resourceFixture.created.sort()));
});
