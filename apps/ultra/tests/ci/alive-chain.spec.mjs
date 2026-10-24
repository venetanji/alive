import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

// Browser geometry and input coverage only. The native desktop journey qualifies hosting/audio.
async function openSession(page,longNames=false,clipBank=false){
  const document=JSON.parse(readFileSync(new URL('../../../alive/examples/two-instruments.alive',import.meta.url))),patch=JSON.parse(readFileSync(new URL('../../examples/subtractive.ultra',import.meta.url)));
  document.format='alive-session-v2';const deviceInstances={},runtime=[];
  document.tracks.forEach((track,index)=>{
    track.effects=[];track.device.instanceId=`instrument-${index}`;track.device.bypassed=false;
    track.automation.forEach(l=>l.instanceId=track.device.instanceId);
    const manifest={...patch.device,parameters:patch.device.parameters.map(p=>({...p,base:track.device.parameters[p.key]}))};
    deviceInstances[track.device.instanceId]={track:index,index:runtime.length,manifest};runtime.push({effective:manifest.parameters.map(p=>p.base),owned:manifest.parameters.map(()=>0)});
  });
  for(const file of ['utility','stereo-lowpass']){
    const device=JSON.parse(readFileSync(new URL(`../../examples/${file}.ultra`,import.meta.url))).device,instanceId=file;
    if(longNames&&file==='stereo-lowpass')device.name='LongSavedDevice'.repeat(8);
    const manifest={...device,parameters:device.parameters.map(p=>({...p,base:p.key==='gain'?1:p.key==='resonance'?.7:1000}))};
    document.tracks[0].effects.push({instanceId,id:device.id,path:`${file}.ultra`,parameters:{},bypassed:false});
    deviceInstances[instanceId]={track:0,index:runtime.length,manifest};runtime.push({effective:manifest.parameters.map(p=>p.base),owned:manifest.parameters.map(()=>0)});
  }
  const snapshot={generation:1,draftRevision:0,history:{canUndo:false,canRedo:false},document,deviceInstances,dirty:false,draft:null,state:{playing:0,position:0,absoluteFrame:0,rejected:0,generation:1,peakLeft:0,peakRight:0,devices:runtime,tracks:document.tracks.map(()=>({peakLeft:0,peakRight:0,activeVoices:0}))},audio:{config:{host:'default',device:'default',sample_rate:48000},observed_buffer_frames:0,callbacks:0,stream_errors:0,failed:false,message:'Browser fixture'}};
  if(clipBank){
    document.format='alive-session-v3';snapshot.mode='clipsV3';snapshot.preparationRevision='9007199254740993';snapshot.snapshotSequence='1';snapshot.preparedClips=[];
    document.tracks.forEach(t=>{const c={id:`clip-${t.id}`,name:'Clip 1',lengthBeats:8,notes:t.notes.map((n,i)=>({...n,id:`note-${t.id}-${i}`})),automation:t.automation};t.slots=[c,null,null,null];t.defaultClipId=c.id;delete t.notes;delete t.automation;snapshot.preparedClips.push({trackId:t.id,clipId:c.id,name:c.name,slot:0,lengthFrames:'205714'});});
    snapshot.runtime={tracks:document.tracks.map(t=>({trackId:t.id,activeClipId:t.slots[0].id,phase:'0',epoch:'1',pendingAction:null,pendingClipId:null,pendingSerial:null,pendingFrame:null})),requests:[],requestedStopEpoch:'0',appliedStopEpoch:'0'};
  }
  await page.addInitScript(snapshot=>{
    window.removeTrack=async trackId=>{
      await new Promise(resolve=>{window.finishRemoval=resolve;});
      const index=snapshot.document.tracks.findIndex(track=>track.id===trackId);
      snapshot.document.tracks.splice(index,1);snapshot.state.tracks.splice(index,1);
      snapshot.generation++;snapshot.draftRevision++;return structuredClone(snapshot);
    };
    window.calls=[];const undo=[],redo=[];window.__TAURI__={core:{invoke:async(name,args)=>{window.calls.push({name,args});if(name==='alive_current')return structuredClone(snapshot);if(name==='alive_edit'){undo.push(structuredClone(snapshot.draft??snapshot.document));redo.length=0;snapshot.draft=args.document;snapshot.draftRevision++;snapshot.history={canUndo:true,canRedo:false};return structuredClone(snapshot);}if(name==='alive_history'){const from=args.direction==='undo'?undo:redo,to=args.direction==='undo'?redo:undo;to.push(structuredClone(snapshot.draft??snapshot.document));snapshot.draft=from.pop();snapshot.draftRevision++;snapshot.history={canUndo:!!undo.length,canRedo:!!redo.length};return structuredClone(snapshot);}}}};
    const invoke=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=(name,args)=>name==='alive_device'&&args.action==='remove'?window.removeTrack(args.trackId):invoke(name,args);
  },snapshot);
  await page.goto('/alive.html');await expect(page.locator('#chain-title')).toHaveText('Pulse chain');
}

test('Add note queued behind track removal never edits the surviving track',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1100,height:800});await openSession(page);
  await page.getByRole('button',{name:'Remove Pulse track',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>typeof window.finishRemoval)).toBe('function');
  await page.getByRole('button',{name:'Add note',exact:true}).click();await page.evaluate(()=>window.finishRemoval());
  await expect(page.locator('#clip-title')).toHaveText('Harmony clip');await expect(page.locator('#notice')).toContainText('score scope changed');
  await expect(page.locator('#notes tr')).toHaveCount(12);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_edit'))).toEqual([]);expect(errors).toEqual([]);
});

test('selected instance controls, keyboard automation target, draft guard and desktop bounds',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:900,height:660});await openSession(page);
  await page.getByRole('button',{name:'Select Pulse Stereo Lowpass effect 2',exact:true}).click();
  await expect(page.locator('#device-title')).toHaveText('Stereo Lowpass');await expect(page.getByRole('spinbutton',{name:'Cutoff base',exact:true})).toHaveValue('1000');
  expect(await page.evaluate(()=>window.calls.some(c=>c.name==='alive_editor'||c.name==='alive_transport'))).toBe(false);
  await page.getByLabel('Automation target',{exact:true}).selectOption(JSON.stringify(['stereo-lowpass','cutoff']));await page.getByRole('button',{name:'Add automation lane',exact:true}).click();
  await page.getByRole('button',{name:'Add Stereo Lowpass effect 2 / Cutoff point',exact:true}).click();
  await expect(page.getByLabel('Stereo Lowpass effect 2 / Cutoff point 1 value',{exact:true})).toHaveValue('1000');
  await expect(page.locator('#chain-status')).toContainText('Apply or discard');await expect(page.getByRole('button',{name:'Add effect',exact:true})).toBeDisabled();
  await expect(page.getByLabel('Cutoff point 1 value',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('alive-minimum-desktop.png')});expect(errors).toEqual([]);
});

test('long saved device names fit the minimum desktop window',async({page})=>{
  await page.setViewportSize({width:900,height:660});await openSession(page,true);
  await expect(page.locator('.chain-select').nth(2)).toContainText('LongSavedDevice');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth)).toBe(true);
});

test('piano body, resize, velocity, cancellation and keyboard gestures are bounded transactions',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1100,height:800});await openSession(page);
  const piano=page.locator('#piano-roll'),edits=()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_edit'));
  await piano.scrollIntoViewIfNeeded();
  const box=await piano.boundingBox(),x=beat=>box.x+(32+beat/8*608)*box.width/640,y=pitch=>box.y+(21+(85-pitch+.5)*191/39)*box.height/218;
  await page.mouse.dblclick(x(2),y(80));await expect.poll(async()=>(await edits()).length).toBe(1);
  expect((await edits())[0].args.document.tracks[0].notes.at(-1)).toEqual({beat:2,pitch:80,duration:.25,velocity:100});
  const index=(await edits())[0].args.document.tracks[0].notes.length-1;
  const body=piano.locator(`[data-note="${index}"][data-part="body"]`),edge=piano.locator(`[data-note="${index}"][data-part="resize"]`);
  let b=await body.boundingBox();await page.mouse.move(b.x+.5,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+.5+(608/8*.5)*box.width/640,b.y+b.height/2,{steps:5});
  expect((await edits()).length).toBe(1);await page.mouse.up();await expect.poll(async()=>(await edits()).length).toBe(2);
  expect((await edits())[1].args.document.tracks[0].notes[index].beat).toBe(2.5);
  b=await edge.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+(608/8*.5)*box.width/640,b.y+b.height/2,{steps:5});await page.mouse.up();await expect.poll(async()=>(await edits()).length).toBe(3);
  expect((await edits())[2].args.document.tracks[0].notes[index].duration).toBe(.75);
  b=await body.boundingBox();await page.mouse.move(b.x+2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+30,b.y+b.height/2);await page.keyboard.press('Escape');await page.mouse.up();expect((await edits()).length).toBe(3);
  await piano.focus();await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await edits()).length).toBe(4);
  expect((await edits())[3].args.document.tracks[0].notes[index].pitch).toBe(81);
  const velocity=page.getByLabel('Selected note velocity',{exact:true});await velocity.scrollIntoViewIfNeeded();const v=await velocity.boundingBox();await page.mouse.move(v.x+v.width*.4,v.y+v.height/2);await page.mouse.down();await page.mouse.move(v.x+v.width*.7,v.y+v.height/2,{steps:8});await page.mouse.up();await expect.poll(async()=>(await edits()).length).toBe(5);
  await piano.focus();await page.keyboard.press('Control+z');await expect(page.locator('#redo')).toBeEnabled();
  await page.screenshot({path:testInfo.outputPath('piano-selected-history.png')});expect(errors).toEqual([]);
});


test('four-slot bank preserves numeric note identity and fits the minimum desktop',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:900,height:660});await openSession(page,false,true);
  await expect(page.getByRole('button',{name:'Select Pulse slot 4',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Select Pulse slot 2',exact:true}).click();await expect(page.getByRole('button',{name:'Add note',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Create clip',exact:true})).toBeVisible();expect(await page.evaluate(()=>window.calls.some(c=>c.name==='alive_edit'||c.name==='alive_clip_action'))).toBe(false);
  await page.getByRole('button',{name:'Select Pulse slot 1',exact:true}).click();
  const pitch=page.getByRole('spinbutton',{name:'Note 1 pitch',exact:true});await pitch.fill('62');await pitch.press('Tab');await expect(pitch).toHaveValue('62');
  const changes=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_edit'));expect(changes).toHaveLength(1);expect(changes[0].args.document.tracks[0].slots[0].notes[0].id).toMatch(/^note-/);expect(changes[0].args.document.tracks[0].slots[0].notes[0].pitch).toBe(62);expect(changes[0].args.document.tracks[0].defaultClipId).toBe(changes[0].args.document.tracks[0].slots[0].id);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth)).toBe(true);
  await page.getByRole('button',{name:'Select Pulse slot 1',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('four-slot-minimum-desktop.png')});expect(errors).toEqual([]);
});
