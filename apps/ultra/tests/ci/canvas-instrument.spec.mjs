import {test,expect} from '@playwright/test';
import {subtractivePatch} from '../../ui/canvas-instrument.mjs';

// Rendered panel/IPC checks. Native DSP and actual desktop have separate gates.
async function mount(page,{nested=false,child=false}={}){
  const patch=subtractivePatch();
  if(nested){patch.version=2;patch.profile='ultra-patcher-v2';patch.nodes=[{id:100,type:'patcher',x:40,y:40,params:{name:'synth'},patcher:{nodes:patch.nodes,edges:patch.edges}}];patch.edges=[];}
  await page.addInitScript(({patch,child})=>{
    let current={id:1,label:'patch-1',title:'Subtractive.ultra',kind:'patch',shared:true,
      ownerLabel:'patch-1',viewPath:child?[100]:[],authoringRevision:1,runtimeRevision:1,descriptorRevision:1,patch};
    window.instrumentCalls=[];
    window.__TAURI__={core:{invoke:async(name,args={})=>{
      window.instrumentCalls.push({name,args});
      if(name==='document_current')return current;
      if(name==='document_list')return[current];
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
  await expect(page.getByRole('button',{name:'Play C4',exact:true})).toBeEnabled();
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
  const saved=commits.at(-1).args.patch;
  expect(saved.device.presets.at(-1).values.cutoff).toBe(731);
  expect(Object.keys(saved.device.presets.at(-1).values)).toHaveLength(7);
  await page.getByRole('button',{name:'New instance',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.instrumentCalls.filter(call=>call.name==='document_instantiate').length)).toBe(1);
});

test('keyboard, pointer and panel close release notes without duplicate same-pitch note-offs',async({page})=>{
  await mount(page);
  const key=page.getByRole('button',{name:'Play C4',exact:true});
  await key.focus();await page.keyboard.down('a');
  await expect(key).toHaveAttribute('aria-pressed','true');
  const box=await key.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height-10);await page.mouse.down();
  await page.keyboard.up('a');await expect(key).toHaveAttribute('aria-pressed','true');
  await page.mouse.up();await expect(key).toHaveAttribute('aria-pressed','false');
  await expect.poll(()=>page.evaluate(()=>window.instrumentCalls.filter(call=>call.name==='canvas_event').map(call=>call.args.value))).toEqual([[60,100],[60,0]]);
  await key.focus();await page.keyboard.down('d');
  await page.getByRole('button',{name:'Close instrument panel',exact:true}).click();
  await page.keyboard.up('d');
  await expect.poll(()=>page.evaluate(()=>window.instrumentCalls.filter(call=>call.name==='canvas_event').map(call=>call.args.value))).toEqual([[60,100],[60,0],[64,100],[64,0]]);
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
    await expect.poll(()=>page.evaluate(()=>window.instrumentCalls.filter(call=>call.name==='document_commit').at(-1)?.args.parameter)).toEqual({node:4,key:'cutoff',value:815,hot:false});
    await page.getByRole('button',{name:'Play C4',exact:true}).focus();
    await page.keyboard.down('a');await page.keyboard.up('a');
    await expect.poll(()=>page.evaluate(()=>window.instrumentCalls.filter(call=>call.name==='canvas_event').map(call=>[call.args.node,call.args.value]))).toEqual([[2,[60,100]],[2,[60,0]]]);
  }
});
