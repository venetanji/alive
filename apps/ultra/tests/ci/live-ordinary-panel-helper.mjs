import {test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function routeResources(page,{writable=false}={}){
  const fixturePath=process.env.ALIVE_RESOURCE_PACK_FIXTURES;
  test.skip(fixturePath===undefined,'Requires ALIVE_RESOURCE_PACK_FIXTURES with private installed GUI and Graphics packs.');
  let fixtures;
  try{fixtures=JSON.parse(await readFile(fixturePath,'utf8'));}
  catch(error){throw Error(`Invalid ALIVE_RESOURCE_PACK_FIXTURES manifest: ${error.message}`);}
  const current=fixtures?.['current-20261102'];
  if(!current||['GUI','Graphics'].some(kind=>typeof current[kind]!=='string'||!current[kind].trim()))
    throw Error('Invalid ALIVE_RESOURCE_PACK_FIXTURES: current-20261102 requires both GUI and Graphics pack paths.');
  for(const kind of ['GUI','Graphics']){
    let body;
    try{body=await readFile(current[kind]);}
    catch(error){throw Error(`Invalid ALIVE_RESOURCE_PACK_FIXTURES ${kind} pack: ${error.message}`);}
    await page.route(`**/ordinary-pack-${kind}`,route=>route.fulfill({body,contentType:'application/octet-stream'}));
  }
  if(writable)await page.route('**/live-profiles/analog/panel-bindings.mjs',async route=>{
    const response=await route.fetch(),body=await response.text();
    const original="export function analogWritableKey(expected,key){if(key!=='NoiseToggle')return false;try{validateExpected(expected);return true;}catch{return false;}}";
    if(!body.includes(original))throw Error('Test-only authority seam changed.');
    await route.fulfill({response,body:body.replace(original,"export function analogWritableKey(_expected,_key){return _key==='NoiseToggle';}")});
  });
}

export async function ordinaryPanelPage(page,options={}){
  await routeResources(page,options);
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
      const calls=[],errors=[],history=[],replies=[],views=[];let ownerLabel='ordinary-panel-test',authoringRevision=1,runtimeRevision=10,hook=null,commitEnabled=false,commitGate=null;
      const descriptor=()=>({shared:true,id:1,label:ownerLabel,ownerLabel,viewPath:[],patch:structuredClone(patch),runtimeRevision,authoringRevision,descriptorRevision:authoringRevision});
      const catalog=()=>({generation:String(runtimeRevision),parameters:analogDescriptors.map(row=>({...row,
        value:Math.fround(patch.nodes[0].params.state.values[row.index]),applied:Math.fround(patch.nodes[0].params.state.values[row.index]),revision:1,applied_revision:1,
      }))});
      const invoke=async(name,args={})=>{
        calls.push({name,args,at:performance.now()});
        if(hook){const result=hook(name,args);if(result!==undefined)return await result;}
        if(name==='document_current')return descriptor();
        if(name==='live_device_resource_pack')return packs[args.kind];
        if(name==='live_device_parameters')return catalog();
        if(name==='document_commit'&&commitEnabled){
          if(commitGate){const gate=commitGate;commitGate=null;await gate;}
          if(args.baseRevision!==authoringRevision||args.expectedScope?.ownerLabel!==ownerLabel||args.expectedScope?.runtimeRevision!==runtimeRevision)
            return {accepted:false,document:descriptor()};
          history.push(structuredClone(patch));Object.assign(patch,structuredClone(args.patch));authoringRevision++;
          return {accepted:true,document:descriptor()};
        }
        throw Error(`Unexpected panel write or IPC: ${name}`);
      };
      const controller=createSharedCanvasController({invoke});
      if(!await controller.prepare())throw Error(`Panel descriptor rejected: ${controller.getState().notice}`);
      const host=createUltraPresentationHost({controller,invoke});
      return{host,controller,calls,errors,history,replies,catalog,set hook(value){hook=value;},
        enableCommits(){
          if(commitEnabled)return;commitEnabled=true;
          const writeBatch=host.writeBatch;
          host.writeBatch=async request=>{const reply=await writeBatch(request);replies.push({request,reply});return reply;};
        },
        holdCommit(){let release;commitGate=new Promise(resolve=>{release=resolve;});return release;},
        replaceRuntime(){runtimeRevision++;authoringRevision++;if(!controller.acceptDescriptor(descriptor()))throw Error('Descriptor refused');host.publish();},
        replaceOwner(){ownerLabel='replacement-owner';authoringRevision++;host.dispose();},
        get patch(){return structuredClone(patch);},
        acquire:()=>host.acquirePanel({scope:host.scope,sourceNode:7,profile}),
        publish(change=()=>{}){change(patch);authoringRevision++;if(!controller.acceptDescriptor(descriptor()))throw Error('Descriptor refused');host.publish();},
        mount(root=document.getElementById('panel')){const view=mountPresentation({doc:document,root,presentation,host,onError:error=>errors.push(error.message)});views.push(view);return view;},
        async dispose(){for(const view of views)view.dispose();host.dispose();await controller.dispose();},
      };
    };
  });
}


// One boot-time owner backs the actual canvas, its panel, and native event bridge.
export async function ordinaryCanvasPage(page,{writable=true}={}){
  await routeResources(page,{writable});
  await page.addInitScript(()=>{
    const listeners=new Map(),calls=[],history=[];let patch,revision=1,gate=null,previews=[];
    const ready=(async()=>{
      const {analogDescriptors,analogIdentity}=await import('/live-profiles/analog/facts.mjs');
      const {version,profile,dllSha256,guiSha256,graphicsSha256}=analogIdentity;
      const state={version,profile,dllSha256,guiSha256,graphicsSha256,values:analogDescriptors.map(row=>row.min)};state.values[194]=12.1;
      patch={version:2,profile:'ultra-patcher-v2',presentation:{version:1,openOnLoad:true,size:{width:1100,height:220},items:[{id:'analog',kind:'livePanel',target:{node:7,profile},included:true,visible:true,rect:{x:0,y:0,width:1100,height:220},style:{accent:'default'}}]},nodes:[{id:7,type:'live_device',x:0,y:0,params:{device:'Analog',state}}],edges:[]};
      return analogDescriptors;
    })();
    const descriptor=()=>({shared:true,id:1,label:'ordinary-panel-test',ownerLabel:'ordinary-panel-test',title:'Analog.ultra',kind:'patch',viewPath:[],patch:structuredClone(patch),runtimeRevision:10,authoringRevision:revision,descriptorRevision:revision,dirty:false,parameterPreviews:previews});
    window.owner={calls,history,hook:null,get patch(){return structuredClone(patch);},hold(){let release;gate=new Promise(resolve=>{release=resolve;});return release;},emit(name,payload){return listeners.get(name)?.({payload});},setPreviews(value){previews=value;return listeners.get('document-changed')?.({payload:descriptor()});}};
    window.__TAURI__={core:{invoke:async(name,args={})=>{
      const descriptors=await ready;calls.push({name,args:structuredClone(args)});
      if(owner.hook){const response=owner.hook(name,args);if(response!==undefined)return await response;}
      if(name==='document_current'||name==='document_save')return descriptor();
      if(name==='live_device_resource_pack')return new Uint8Array(await(await fetch(`/ordinary-pack-${args.kind}`)).arrayBuffer());
      if(name==='live_device_parameters')return{generation:'10',parameters:descriptors.map(row=>({...row,value:Math.fround(patch.nodes[0].params.state.values[row.index]),applied:Math.fround(patch.nodes[0].params.state.values[row.index]),revision:1,applied_revision:1}))};
      if(name==='document_commit'){
        if(gate){const pending=gate;gate=null;await pending;}
        if(args.baseRevision!==revision||args.expectedScope?.ownerLabel!=='ordinary-panel-test'||args.expectedScope?.runtimeRevision!==10)return{accepted:false,document:descriptor()};
        history.push(structuredClone(patch));patch=structuredClone(args.patch);revision++;return{accepted:true,document:descriptor()};
      }
      if(name==='canvas_status')return{revision:10,active:true,nodes:[],console:[]};
      if(name==='audio_status')return{running:false};
      if(name==='audio_devices')return{config:{host:'default',device:'default',sample_rate:48000,buffer_frames:null},hosts:[],devices:[],notice:'Audio is off.'};
      return true;
    }},event:{listen:async(name,fn)=>{listeners.set(name,fn);return()=>listeners.delete(name);}},webviewWindow:{getCurrentWebviewWindow:()=>({label:'ordinary-panel-test'})},webview:{getCurrentWebview:()=>({onDragDropEvent:async()=>()=>{}})}};
  });
  await page.goto('/canvas.html');
}
