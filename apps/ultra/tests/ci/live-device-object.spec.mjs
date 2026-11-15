import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const property=(tag,name,attributes)=>`<${tag} Name="${name}" ${attributes}/>`;
const node=(type,properties='',children='')=>`<PropertiesNode TargetClassName="${type}" Id=""><Categories><PropertiesCategory Name="View"><Properties>${properties}</Properties></PropertiesCategory></Categories><Children>${children}</Children></PropertiesNode>`;
const xml=`<Ableton>${node('LoadableView','',node('VoidView',property('PointProperty','Size','X="180" Y="55"'),
 node('LoadableCombiSliderSmall',property('PointProperty','Size','X="60" Y="36"')+property('StringProperty','Label','Value="Volume"')+property('ConnectionProperty','ConnectTo','Value="Volume"'))+
 node('LoadableCombiSliderSmall',property('PointProperty','Size','X="60" Y="36"')+property('PointProperty','Position','X="70" Y="0"')+property('StringProperty','Label','Value="Unknown"')+property('ConnectionProperty','ConnectTo','Value="NotMapped"'))))}</Ableton>`;

async function mount(page){
 await page.goto('/controls-gallery.html');
 await page.evaluate(async xml=>{
  const [{makeNode,createCanvasController},{createLiveDeviceNodeView},{loadLiveDeviceLayout},{createFocusedDrafts}]=await Promise.all([
   import('./canvas-model.mjs'),import('./live-device-object.mjs'),import('./live-device-layout.mjs'),import('./canvas-focused-drafts.mjs')]);
  window.deviceEvents=[];
  const node=makeNode('live_device',1),controller=createCanvasController({patch:{version:2,profile:'ultra-patcher-v2',nodes:[node],edges:[]}});
  const layout=loadLiveDeviceLayout({gui:{has:()=>true,text:()=>xml},path:'Devices/Example/Contents.xml'});
  const events={...controller,flush:async()=>{await window.deviceFlushGate;if(window.deviceFlushError)throw Error(window.deviceFlushError);return controller.flush();},deviceEvent:async(id,inlet,value)=>{window.deviceEvents.push({id,inlet,value});return true;}};
  window.deviceController=controller;
  window.deviceDrafts=createFocusedDrafts();
  window.deviceView=createLiveDeviceNodeView(node,{doc:document,controller:events,select:()=>{},dragStart:()=>{},edit:()=>{},portClick:()=>{},portDown:()=>{},hover:()=>{},unhover:()=>{},context:()=>{},operate:()=>{},parameter:()=>{},tab:()=>{},
   drafts:window.deviceDrafts,acquireResources:async()=>({layout,graphics:null})});
  document.body.replaceChildren(window.deviceView.element);await window.deviceView.ready;
  window.updateDeviceView=()=>window.deviceView.update(controller.getState().patch.nodes[0],controller.getState(),{});
  window.updateDeviceView();
 },xml);
}

test('embedded original-layout controls edit complete source state and retain control identity',async({page})=>{
 await mount(page);
 const known=page.getByRole('slider',{name:'Volume'}),unknown=page.getByRole('slider',{name:'Unknown'});
 await expect(known).toBeEnabled();await expect(unknown).toBeDisabled();
 await known.evaluate(e=>window.originalControl=e);await known.focus();await page.keyboard.press('Home');
 await expect.poll(()=>page.evaluate(()=>window.deviceController.getState().document.nodes[0].params.state.values[2])).toBe(0);
 await page.evaluate(()=>window.updateDeviceView());
 expect(await known.evaluate(e=>e===window.originalControl)).toBe(true);
 expect(await page.evaluate(()=>JSON.parse(window.deviceController.export()).nodes[0].params.state.values.length)).toBe(203);
 await page.evaluate(()=>{window.deviceController.undo();window.updateDeviceView();});
 await expect.poll(()=>page.evaluate(()=>window.deviceController.getState().document.nodes[0].params.state.values[2])).not.toBe(0);
});

test('embedded numeric drafts block Save and Close until accepted or cancelled',async({page})=>{
 await mount(page);
 const value=page.getByRole('spinbutton',{name:'Volume value',exact:true});
 await value.fill('');
 expect(await page.evaluate(()=>window.deviceDrafts.commitWhere())).toBe(false);
 await expect(value).toHaveAttribute('aria-invalid','true');
 await page.evaluate(()=>window.updateDeviceView());
 await expect(value).toHaveValue('');
 await value.fill('-inf dB');
 expect(await page.evaluate(()=>window.deviceDrafts.commitWhere())).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.deviceController.getState().document.nodes[0].params.state.values[2])).toBe(0);
 await value.fill('');await value.press('Escape');
 expect(await page.evaluate(()=>window.deviceDrafts.commitWhere())).toBe(true);
});

test('settling embedded controls waits for queued edits before a document flush',async({page})=>{
 await mount(page);
 await page.evaluate(()=>{window.deviceFlushGate=new Promise(resolve=>window.releaseDeviceFlush=resolve);});
 const control=page.getByRole('slider',{name:'Volume',exact:true});
 await control.focus();await page.keyboard.press('Home');
 await expect.poll(()=>page.evaluate(()=>window.deviceController.getState().document.nodes[0].params.state.values[2])).toBe(0);
 await page.keyboard.press('End');
 await page.evaluate(()=>{window.controlsSettled=false;window.controlSettlement=window.deviceView.settleControls().then(()=>{window.controlsSettled=true;});});
 expect(await page.evaluate(()=>window.controlsSettled)).toBe(false);
 await page.evaluate(async()=>{window.releaseDeviceFlush();await window.controlSettlement;await window.deviceController.flush();});
 expect(await page.evaluate(()=>JSON.parse(window.deviceController.export()).nodes[0].params.state.values[2])).toBe(1);
});

test('a committed numeric control does not block Save after becoming disabled',async({page})=>{
 await mount(page);
 const value=page.getByRole('spinbutton',{name:'Volume value',exact:true});
 await value.fill('-inf dB');await value.press('Enter');
 await page.evaluate(()=>window.deviceView.settleControls());
 expect(await value.evaluate(input=>{input.disabled=true;return window.deviceDrafts.commitWhere();})).toBe(true);
});

test('settling embedded controls rejects a refused pending publication before Close',async({page})=>{
 await mount(page);
 await page.evaluate(()=>{window.deviceFlushError='Native edit refused';window.deviceFlushGate=new Promise(resolve=>window.releaseDeviceFlush=resolve);});
 await page.getByRole('slider',{name:'Volume',exact:true}).focus();await page.keyboard.press('Home');
 await expect.poll(()=>page.evaluate(()=>window.deviceController.getState().document.nodes[0].params.state.values[2])).toBe(0);
 const error=await page.evaluate(async()=>{
  const settled=window.deviceView.settleControls().then(()=>null,error=>error.message);
  window.releaseDeviceFlush();return settled;
 });
 expect(error).toBe('Native edit refused');
});

test('audition keyboard releases held notes on blur and disposal',async({page})=>{
 await mount(page);
 await page.evaluate(()=>window.deviceView.update(window.deviceController.getState().patch.nodes[0],{...window.deviceController.getState(),native:true,ready:true,status:{running:true}},{}));
 await page.getByRole('button',{name:'Play C4',exact:true}).focus();await page.keyboard.down('Enter');
 await expect.poll(()=>page.evaluate(()=>window.deviceEvents.map(e=>e.value))).toEqual([[60,100]]);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('Enter');
 await expect.poll(()=>page.evaluate(()=>window.deviceEvents.map(e=>e.value))).toEqual([[60,100],[60,0]]);
 await page.getByRole('button',{name:'Play D4',exact:true}).focus();await page.keyboard.down('Enter');
 await page.evaluate(()=>window.deviceView.dispose());await page.keyboard.up('Enter');
 await expect.poll(()=>page.evaluate(()=>window.deviceEvents.map(e=>e.value))).toEqual([[60,100],[60,0],[62,100],[62,0]]);
});

test('ordinary canvas creates the installed Analog panel and saves live edits through canonical commits',async({page})=>{
 const resources=process.env.ULTRA_LIVE_RESOURCE_DIR;
 test.skip(!resources,'Requires the local qualified Live Resources installation.');
 for(const [name,file]of [['GUI','GUI.alp'],['Graphics','Graphics.alp'],['default','Core Library/Defaults/Instruments/Analog.adv']]){
  const bytes=await readFile(path.join(resources,file));
  await page.route(`**/__livepack__/${name}`,route=>route.fulfill({status:200,contentType:'application/octet-stream',body:bytes}));
 }
 await page.addInitScript(()=>{
  let current={id:1,label:'patch-1',title:'Analog.ultra',kind:'patch',shared:true,ownerLabel:'patch-1',viewPath:[],authoringRevision:1,runtimeRevision:1,descriptorRevision:1,
   patch:{version:2,profile:'ultra-patcher-v2',nodes:[],edges:[]}};
  window.liveDeviceCalls=[];
  window.__TAURI__={core:{invoke:async(name,args={})=>{
   window.liveDeviceCalls.push({name,args});
   if(name==='document_current')return current;
   if(name==='document_list')return[current];
   if(name==='document_commit'){
    current={...current,patch:structuredClone(args.patch),authoringRevision:current.authoringRevision+1,descriptorRevision:current.descriptorRevision+1};
    return{accepted:true,document:current};
   }
   if(name==='live_device_parameters'){
    const {liveDeviceCatalog}=await import('./live-device-profile.mjs');
    return liveDeviceCatalog(current.patch.nodes.find(n=>n.id===args.node).params.state,String(current.runtimeRevision));
   }
   if(name==='live_device_resource_pack'||name==='live_device_default_preset')return(await fetch(`/__livepack__/${args.kind??'default'}`)).arrayBuffer();
   if(['canvas_stop','canvas_event','document_set_dirty'].includes(name))return true;
   if(name==='audio_status')return{running:true};
   if(name==='canvas_status')return{revision:1,active:true,nodes:[],console:[]};
   if(name==='audio_devices')return{config:{host:'default',device:'default',sample_rate:48000,buffer_frames:512},hosts:['PipeWire'],effective_host:'PipeWire',devices:[],notice:''};
   throw Error('Unexpected command '+name);
  }},event:{listen:async()=>()=>{}},webviewWindow:{getCurrentWebviewWindow:()=>({label:'patch-1'})},webview:{getCurrentWebview:()=>({onDragDropEvent:async()=>()=>{}})}};
 });
 await page.goto('/canvas.html');
 await page.locator('#add-object').click();
 const entry=page.getByRole('combobox',{name:'Object name and arguments'});await entry.fill('live.device~ Analog');await entry.press('Enter');
 const instrument=page.locator('.live-device-canvas-node');await expect(instrument.locator('.live-device-view')).toHaveCount(1,{timeout:15000});
 const control=instrument.locator('.live-control-dial input[type=range]:enabled').first();
 await expect(control).toBeEnabled();await control.evaluate(e=>window.canvasInstrumentControl=e);await control.focus();await page.keyboard.press('Home');
 await expect.poll(()=>page.evaluate(()=>window.liveDeviceCalls.filter(c=>c.name==='document_commit').length)).toBeGreaterThan(1);
 expect(await control.evaluate(e=>e===window.canvasInstrumentControl)).toBe(true);
 const saved=await page.evaluate(()=>window.liveDeviceCalls.filter(c=>c.name==='document_commit').at(-1).args.patch);
 expect(saved.nodes[0].type).toBe('live_device');expect(saved.nodes[0].params.state.values).toHaveLength(203);
 expect(await page.evaluate(()=>window.liveDeviceCalls.some(c=>c.name==='canvas_param'||c.name==='analog_test_start'))).toBe(false);
 await instrument.getByRole('button',{name:'Play C4',exact:true}).focus();await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await expect.poll(()=>page.evaluate(()=>window.liveDeviceCalls.filter(c=>c.name==='canvas_event').map(c=>c.args.value))).toEqual([[60,100],[60,0]]);
 const overlaps=await instrument.evaluate(e=>{
  const body=e.querySelector('.live-device-object-panel').getBoundingClientRect(),keys=e.querySelector('.live-device-object-footer').getBoundingClientRect(),header=e.querySelector('header').getBoundingClientRect();
  return{header:header.bottom>body.top,keyboard:body.bottom>keys.top};
 });expect(overlaps).toEqual({header:false,keyboard:false});
});
