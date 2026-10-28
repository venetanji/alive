import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

// Browser geometry and input coverage only. The native desktop journey qualifies hosting/audio.
async function openSession(page,longNames=false,clipBank=false,trackCount=2,workspaces=false){
  const document=JSON.parse(readFileSync(new URL('../../../alive/examples/two-instruments.alive',import.meta.url))),patch=JSON.parse(readFileSync(new URL('../../examples/subtractive.ultra',import.meta.url)));
  document.format='alive-session-v2';const deviceInstances={},runtime=[];
  while(document.tracks.length<trackCount){const track=structuredClone(document.tracks[0]);track.id=`track-${document.tracks.length+1}`;track.name=`Track ${document.tracks.length+1}`;document.tracks.push(track);}
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
  const snapshot={generation:1,draftRevision:0,capabilities:{maxTracks:8,maxDevices:16,atomicTrackActions:true},history:{canUndo:false,canRedo:false},document,deviceInstances,dirty:false,draft:null,state:{playing:0,position:0,absoluteFrame:0,rejected:0,generation:1,peakLeft:0,peakRight:0,devices:runtime,tracks:document.tracks.map(()=>({peakLeft:0,peakRight:0,activeVoices:0}))},audio:{config:{host:'default',device:'default',sample_rate:48000},observed_buffer_frames:0,callbacks:0,stream_errors:0,failed:false,message:'Browser fixture'}};
  if(clipBank){
    document.format='alive-session-v3';snapshot.mode='clipsV3';snapshot.preparationRevision='9007199254740993';snapshot.snapshotSequence='1';snapshot.preparedClips=[];
    document.tracks.forEach(t=>{const c={id:`clip-${t.id}`,name:'Clip 1',lengthBeats:8,notes:t.notes.map((n,i)=>({...n,id:`note-${t.id}-${i}`})),automation:t.automation};t.slots=[c,null,null,null];t.defaultClipId=c.id;delete t.notes;delete t.automation;snapshot.preparedClips.push({trackId:t.id,clipId:c.id,name:c.name,slot:0,lengthFrames:'205714'});});
    snapshot.runtime={tracks:document.tracks.map(t=>({trackId:t.id,activeClipId:t.slots[0].id,phase:'0',epoch:'1',pendingAction:null,pendingClipId:null,pendingSerial:null,pendingFrame:null})),requests:[],requestedStopEpoch:'0',appliedStopEpoch:'0'};
  }
  if(workspaces){
    snapshot.capabilities.arrangement=true;snapshot.capabilities.workspaces=true;document.format='alive-session-v4';document.loopStartBeats=0;document.loopEndBeats=document.lengthBeats;document.sources=[];document.placements=[];snapshot.mode='workspacesV4';snapshot.devices=[];snapshot.preparedClips=[];snapshot.trackChains=[];snapshot.preparedWorkspaces={preparationRevision:snapshot.preparationRevision,sources:[],slots:[],placements:[]};
    document.tracks.forEach((t,i)=>{const clip=t.slots[0],sourceId=`source-${t.id}`;document.sources.push({kind:'midi',id:sourceId,trackId:t.id,name:clip.name,lengthBeats:clip.lengthBeats,notes:clip.notes,automation:clip.automation});t.color='#c77b61';t.chain={kind:'midi',instrument:t.device};delete t.device;delete t.defaultClipId;t.slots[0]={id:clip.id,name:clip.name,sourceId,sourceOffset:{kind:'beats',value:0},loopEnabled:true};snapshot.trackChains.push({trackId:t.id,kind:'midi',instrumentId:t.chain.instrument.instanceId,effectIds:t.effects.map(e=>e.instanceId)});snapshot.preparedWorkspaces.sources.push({trackId:t.id,sourceId,kind:'midi',name:clip.name,lengthFrames:'205714'});snapshot.preparedWorkspaces.slots.push({trackId:t.id,slotId:clip.id,slot:0,sourceId,name:clip.name,sourceOffsetFrames:'0',loopEnabled:true});});
    snapshot.runtime.tracks=document.tracks.map(t=>({trackId:t.id,authority:'arrangement',activeSourceId:null,activePlacementId:null,activeSlotId:null,phase:null,epoch:'1',pendingAction:null,pendingAuthority:null,pendingSlotId:null,pendingSerial:null,pendingFrame:null}));
  }
  await page.addInitScript(snapshot=>{
    window.sessionSnapshot=snapshot;
    window.removeTrack=async trackId=>{
      await new Promise(resolve=>{window.finishRemoval=resolve;});
      const index=snapshot.document.tracks.findIndex(track=>track.id===trackId);
      snapshot.document.tracks.splice(index,1);snapshot.state.tracks.splice(index,1);
      snapshot.generation++;snapshot.draftRevision++;return structuredClone(snapshot);
    };
    window.calls=[];const undo=[],redo=[];window.__TAURI__={core:{invoke:async(name,args)=>{window.calls.push({name,args});if(name==='alive_current')return structuredClone(snapshot);if(name==='alive_edit'){undo.push(structuredClone(snapshot.draft??snapshot.document));redo.length=0;snapshot.draft=args.document;snapshot.draftRevision++;snapshot.history={canUndo:true,canRedo:false};return structuredClone(snapshot);}if(name==='alive_history'){const from=args.direction==='undo'?undo:redo,to=args.direction==='undo'?redo:undo;to.push(structuredClone(snapshot.draft??snapshot.document));snapshot.draft=from.pop();snapshot.draftRevision++;snapshot.history={canUndo:!!undo.length,canRedo:!!redo.length};return structuredClone(snapshot);}}}};
    const invoke=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=(name,args)=>name==='alive_device'&&args.action==='remove'?window.removeTrack(args.trackId):invoke(name,args);
    const previous=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(name,args)=>{
      if(name==='alive_workspace_edit'){
        window.calls.push({name,args});const op=args.operation;if(args.draftRevision!==snapshot.draftRevision)throw Error('Stale draft');const draft=structuredClone(snapshot.draft??snapshot.document),affected={trackId:op.trackId??null,sourceId:op.sourceId??null,placementId:null,slotId:null,noteId:op.noteId??null};
        if(op.kind==='noteUpdate')Object.assign(draft.sources.find(s=>s.id===op.sourceId).notes.find(n=>n.id===op.noteId),{beat:op.beat,duration:op.duration,pitch:op.pitch,velocity:op.velocity});
        else if(op.kind==='noteDelete'){const source=draft.sources.find(s=>s.id===op.sourceId);source.notes=source.notes.filter(n=>n.id!==op.noteId);}
        else if(op.kind==='sourceCreateMidi'){affected.sourceId=`new-source-${snapshot.draftRevision}`;draft.sources.push({id:affected.sourceId,kind:'midi',trackId:op.trackId,name:op.name,lengthBeats:op.lengthBeats,notes:[],automation:[]});}
        else if(op.kind==='placementCreate'){const {kind,...p}=op;affected.placementId=`new-placement-${snapshot.draftRevision}`;draft.placements.push({id:affected.placementId,...p});}
        else if(op.kind==='placementUpdate'){const p=draft.placements.find(p=>p.id===op.placementId);Object.assign(affected,{trackId:p.trackId,sourceId:p.sourceId,placementId:p.id});Object.assign(p,{start:op.start,duration:op.duration,sourceOffset:op.sourceOffset,loopEnabled:op.loopEnabled});}
        else if(op.kind==='placementDelete'){const p=draft.placements.find(p=>p.id===op.placementId);Object.assign(affected,{trackId:p.trackId,sourceId:p.sourceId,placementId:p.id});draft.placements=draft.placements.filter(p=>p.id!==op.placementId);}
        else if(op.kind==='sourceRename'){const s=draft.sources.find(s=>s.id===op.sourceId);s.name=op.name;affected.trackId=s.trackId;}
        else if(op.kind==='transportRange'){const {kind,...fields}=op;Object.assign(draft,fields);}
        else throw Error('Unsupported fixture edit '+op.kind);
        undo.push(structuredClone(snapshot.draft??snapshot.document));redo.length=0;snapshot.draft=draft;snapshot.draftRevision++;snapshot.history={canUndo:true,canRedo:false};return{snapshot:structuredClone(snapshot),affected};
      }
      if(name==='alive_mixer'){window.calls.push({name,args});for(const document of [snapshot.document,snapshot.draft])if(document)Object.assign(document.tracks[args.track],{gain:args.gain,mute:args.mute,solo:args.solo});snapshot.dirty=true;return;}
      if(name==='alive_clip_edit'){window.calls.push({name,args});const op=args.operation;if(op.kind!=='create')throw Error('Fixture supports create only');snapshot.draft??=structuredClone(snapshot.document);const track=snapshot.draft.tracks.find(t=>t.id===op.trackId);if(track.slots[op.slot])throw Error('Slot already occupied');track.slots[op.slot]={id:`new-${track.id}-${op.slot}`,name:'New clip',lengthBeats:8,notes:[],automation:[]};snapshot.draftRevision++;snapshot.history={canUndo:true,canRedo:false};return{snapshot:structuredClone(snapshot),affected:{trackId:track.id,slot:op.slot}};}
      return previous(name,args);
    };
  },snapshot);
  await page.goto('/alive.html');await expect(page.locator('#chain-title')).toHaveText('Pulse chain');
}

test('empty body double-click creates one draft clip and never launches',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page,false,true);
  const body=page.getByRole('button',{name:'Select Pulse slot 2',exact:true});await body.click();
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await body.dblclick();await expect(page.getByLabel('Clip name',{exact:true})).toHaveValue('New clip');
  const calls=await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'));expect(calls).toHaveLength(1);expect(calls[0].name).toBe('alive_clip_edit');expect(calls[0].args.operation).toEqual({kind:'create',trackId:'track-1',slot:1});
  await expect(page.getByRole('button',{name:'Launch Pulse New clip',exact:true})).toBeDisabled();await expect(body).toHaveAttribute('aria-pressed','true');
});

test('scene receipts leave the visual and accessibility tree in legacy mode and refresh on return',async({page})=>{
  await openSession(page,false,true);
  await page.evaluate(()=>{
    const snapshot=window.sessionSnapshot;snapshot.preparedClips[0].name='Old session clip';snapshot.document.tracks[0].slots[0].name='Old session clip';
    snapshot.runtime.requests=[{preparationRevision:snapshot.preparationRevision,requestSerial:'13',sceneSlot:0,status:'applied',reason:0,members:[{trackId:'track-1',action:'launch',status:'applied'}]}];
  });
  await page.locator('.scene-history>summary').click();await page.getByLabel('Scene 1 receipt details',{exact:true}).click();
  await expect(page.getByLabel('Prepared scene 1',{exact:true})).toHaveText(/Old session clip/);await expect(page.getByLabel('Scene 1 request',{exact:true})).toHaveText(/request 13 applied/);
  await page.evaluate(()=>{
    const snapshot=window.sessionSnapshot;window.previousClipSnapshot=structuredClone(snapshot);snapshot.generation++;snapshot.snapshotSequence='2';snapshot.mode='legacyV2';snapshot.document.format='alive-session-v2';
    for(const track of snapshot.document.tracks){track.notes=track.slots[0].notes;track.automation=track.slots[0].automation;delete track.slots;delete track.defaultClipId;}
    snapshot.runtime=null;snapshot.preparedClips=[];
  });
  await expect(page.locator('#scene-controls')).toBeHidden();await expect(page.locator('.scene-history')).toBeHidden();
  const legacyTree=await page.locator('.scene-column').ariaSnapshot();expect(legacyTree).not.toContain('Scene receipts');expect(legacyTree).not.toContain('Old session clip');expect(legacyTree).not.toContain('request 13');
  await page.evaluate(()=>{
    const next=structuredClone(window.previousClipSnapshot);next.generation+=2;next.snapshotSequence='3';next.preparationRevision='9007199254740994';next.document.tracks[0].slots[0].name='Fresh session clip';next.preparedClips[0].name='Fresh session clip';
    next.runtime.requests=[{preparationRevision:next.preparationRevision,requestSerial:'14',sceneSlot:0,status:'rejected',reason:7,members:[{trackId:'track-1',action:'launch',status:'rejected'}]}];Object.assign(window.sessionSnapshot,next);
  });
  await expect(page.locator('.scene-history')).toBeVisible();await expect(page.getByLabel('Prepared scene 1',{exact:true})).toHaveText(/Fresh session clip/);await expect(page.getByLabel('Scene 1 request',{exact:true})).toHaveText(/request 14 rejected/);
  const currentTree=await page.locator('.scene-column').ariaSnapshot();expect(currentTree).not.toContain('Old session clip');expect(currentTree).not.toContain('request 13');expect(currentTree).toContain('Fresh session clip');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('vertical gain fader sends one bounded change and reflects external snapshots without erasing focused numeric text',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page,false,true);
  const slider=page.getByRole('slider',{name:'Pulse gain fader',exact:true}),number=page.getByRole('spinbutton',{name:'Pulse gain',exact:true});
  const initial=Number(await slider.inputValue());await slider.focus();await slider.press('ArrowUp');
  await expect(number).toHaveValue(String(Math.round((initial+.02)*100)/100));
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_mixer'))).toHaveLength(1);
  await number.fill('0.83');await page.evaluate(()=>{window.sessionSnapshot.document.tracks[0].gain=.4;});
  await expect(slider).toHaveValue('0.4');await expect(number).toHaveValue('0.83');
  await number.press('Tab');await expect(slider).toHaveValue('0.83');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_mixer').map(c=>c.args.gain))).toEqual([Math.round((initial+.02)*100)/100,.83]);
});

for(const size of [{width:1440,height:900},{width:1280,height:800}])test(`two fixed track columns leave blank stage and expose piano roll at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page,false,true);
  const geometry=await page.evaluate(()=>{const rect=e=>e.getBoundingClientRect().toJSON();return{track:[...document.querySelectorAll('.track')].map(rect),mixerControls:[...document.querySelectorAll('.mixer-toggle,.track-inspector')].map(rect),session:rect(document.querySelector('#session-workspace')),piano:rect(document.querySelector('#piano-roll')),detail:rect(document.querySelector('#detail-content')),scene:rect(document.querySelector('.scene-column'))};});
  for(const track of geometry.track)expect(track.width).toBe(146);expect(geometry.scene.x-(geometry.track[1].x+geometry.track[1].width)).toBeGreaterThan(300);
  for(const control of geometry.mixerControls)expect(control.bottom).toBeLessThanOrEqual(geometry.session.bottom);
  expect(geometry.piano.y).toBeLessThan(geometry.detail.y+65);expect(Math.min(geometry.piano.bottom,geometry.detail.bottom)-geometry.piano.y).toBeGreaterThan(150);
  await page.screenshot({path:testInfo.outputPath(`two-tracks-${size.width}x${size.height}.png`)});
});

test('Add note queued behind track removal never edits the surviving track',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1100,height:800});await openSession(page);
  await page.locator('.track-inspector summary').first().click();
  await page.getByRole('button',{name:'Remove Pulse track',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>typeof window.finishRemoval)).toBe('function');
  await page.getByRole('button',{name:'Add note',exact:true}).click();await page.evaluate(()=>window.finishRemoval());
  await expect(page.locator('#clip-title')).toHaveText('Harmony clip');await expect(page.locator('#notice')).toContainText('score scope changed');
  await expect(page.locator('#notes tr')).toHaveCount(12);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_edit'))).toEqual([]);expect(errors).toEqual([]);
});

test('selected instance controls, keyboard automation target, draft guard and desktop bounds',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:900,height:660});await openSession(page);
  await page.locator('#detail-devices').click();
  await page.getByRole('button',{name:'Select Pulse Stereo Lowpass effect 2',exact:true}).click();
  await expect(page.locator('#device-title')).toHaveText('Stereo Lowpass');await expect(page.getByRole('spinbutton',{name:'Cutoff base',exact:true})).toHaveValue('1000');
  expect(await page.evaluate(()=>window.calls.some(c=>c.name==='alive_editor'||c.name==='alive_transport'))).toBe(false);
  await page.locator('#detail-clip').click();await page.locator('.automation-section>summary').click();
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
  await page.locator('#detail-devices').click();
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
  await page.locator('.note-table>summary').click();
  const pitch=page.getByRole('spinbutton',{name:'Note 1 pitch',exact:true});await pitch.fill('62');await pitch.press('Tab');await expect(pitch).toHaveValue('62');
  const changes=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_edit'));expect(changes).toHaveLength(1);expect(changes[0].args.document.tracks[0].slots[0].notes[0].id).toMatch(/^note-/);expect(changes[0].args.document.tracks[0].slots[0].notes[0].pitch).toBe(62);expect(changes[0].args.document.tracks[0].defaultClipId).toBe(changes[0].args.document.tracks[0].slots[0].id);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth)).toBe(true);
  await page.getByRole('button',{name:'Select Pulse slot 1',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('four-slot-minimum-desktop.png')});expect(errors).toEqual([]);
});

for(const size of [{width:1440,height:900},{width:1280,height:800}])test(`eight columns align with four scene rows at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page,false,true,8);
  const bounds=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
    return{columns:[...document.querySelectorAll('.track')].map(e=>({box:rect(e),slots:[...e.querySelectorAll('.clip-slot')].map(rect),mixer:rect(e.querySelector('.track-mixer'))})),scenes:[...document.querySelectorAll('.scene-row')].map(rect),session:rect(document.querySelector('#session-workspace')),detail:rect(document.querySelector('#detail-panel')),whole:document.documentElement.scrollWidth};
  });
  expect(bounds.columns).toHaveLength(8);expect(bounds.scenes).toHaveLength(4);expect(bounds.whole).toBe(size.width);
  for(let c=0;c<8;c++){expect(bounds.columns[c].box.x).toBeLessThan(bounds.columns[c].box.x+bounds.columns[c].box.width);if(c)expect(bounds.columns[c].box.x).toBeGreaterThan(bounds.columns[c-1].box.x);for(let r=0;r<4;r++){expect(bounds.columns[c].slots[r].y).toBe(bounds.scenes[r].y);expect(bounds.columns[c].slots[r].height).toBe(bounds.scenes[r].height);}expect(bounds.columns[c].mixer.y).toBeGreaterThanOrEqual(bounds.columns[c].slots[3].y+bounds.columns[c].slots[3].height);}
  expect(bounds.session.height).toBeGreaterThan(250);expect(bounds.detail.y+bounds.detail.height).toBeLessThanOrEqual(size.height-30);
  await page.screenshot({path:testInfo.outputPath(`session-${size.width}x${size.height}.png`)});
  await page.locator('#session-workspace').evaluate(e=>e.scrollLeft=e.scrollWidth);await expect(page.getByRole('button',{name:'Select Track 8 slot 4',exact:true})).toBeInViewport();await expect(page.getByRole('button',{name:'Launch scene 4',exact:true})).toBeInViewport();
});

test('view buttons preserve focused uncommitted values and native Tab navigation',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page,false,true);
  const tempo=page.locator('#tempo');await tempo.fill('135');
  await page.locator('#view-arrangement').click();await expect(page.locator('#arrangement-unavailable')).toBeVisible();
  await page.locator('#view-session').click();await expect(tempo).toHaveValue('135');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await tempo.press('Tab');await expect(page.locator('#session-workspace')).toBeVisible();
  await page.locator('#session-workspace').focus();await page.keyboard.press('Tab');await expect(page.locator('#arrangement-workspace')).toBeVisible();
  await page.keyboard.press('Tab');await expect(page.locator('#session-workspace')).toBeVisible();
});

test('hiding Session preserves an unfinished gain field without issuing a mixer mutation',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page,false,true);
  const gain=page.getByLabel('Pulse gain',{exact:true});await gain.fill('0.85');
  for(let i=0;i<3;i++){await page.locator('#view-arrangement').click();await page.locator('#view-session').click();}
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);await expect(gain).toHaveValue('0.85');
  await gain.focus();await gain.press('Tab');expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_mixer').map(c=>c.args.gain))).toEqual([0.85]);
});

for(const kind of ['device','note'])test(`detail navigation preserves an unfinished ${kind} field until one deliberate commit`,async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page,false,true);
  const device=kind==='device',own=device?'devices':'clip',other=device?'clip':'devices',typed=device?'1717':'73';
  if(device)await page.locator('#detail-devices').click();else await page.locator('.note-table>summary').click();
  const input=page.getByRole('spinbutton',{name:device?'Cutoff base':'Note 1 pitch',exact:true,includeHidden:true});
  const original=JSON.parse(readFileSync(new URL('../../../alive/examples/two-instruments.alive',import.meta.url)));
  const mutations=()=>page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'));
  const acrossPolls=async()=>{
    const before=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);
    await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(before+2);
    expect(await mutations()).toEqual([]);await expect(input).toHaveValue(typed);
  };
  await input.fill(typed);
  for(let i=0;i<3;i++){
    await page.locator('#detail-'+other).click();await acrossPolls();
    await page.locator('#toggle-detail').click();await acrossPolls();
    await page.locator('#toggle-detail').click();await acrossPolls();
    expect(await input.evaluate(e=>document.activeElement===e)).toBe(false);
    await page.locator('#detail-'+own).click();await acrossPolls();
    await page.locator('#toggle-detail').click();await acrossPolls();
    await page.locator('#detail-'+other).click();await acrossPolls();
    expect(await input.evaluate(e=>document.activeElement===e)).toBe(false);
    await page.locator('#detail-'+own).click();await acrossPolls();
  }
  await input.focus();await input.press('Tab');
  await expect.poll(async()=>(await mutations()).length).toBe(1);
  const [call]=await mutations();
  if(device){expect(call.name).toBe('alive_base');expect(call.args).toMatchObject({instanceId:'instrument-0',key:'cutoff',value:1717});}
  else{
    expect(call.name).toBe('alive_edit');expect(call.args.label).toBe('Edit note');
    const expected=structuredClone(original.tracks[0].notes);expected[0].pitch=73;
    const tracks=call.args.document.tracks;
    expect(tracks[0].id).toBe(original.tracks[0].id);expect(tracks[0].slots[0].id).toBe(`clip-${original.tracks[0].id}`);
    expect(tracks[0].slots[0].notes).toEqual(expected.map((note,i)=>({...note,id:`note-${original.tracks[0].id}-${i}`})));
    expect(tracks[1].slots[0].notes.map(({id,...note})=>note)).toEqual(original.tracks[1].notes);
  }
  const before=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(before+2);
  expect(await mutations()).toHaveLength(1);
});

test('maximum detail resize leaves the entire detail and workspace reachable',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page,false,true);
  const handle=page.getByRole('separator',{name:'Resize detail area'});await handle.focus();await page.keyboard.press('End');
  const bounds=await page.evaluate(()=>({detail:document.querySelector('#detail-panel').getBoundingClientRect().bottom,footer:document.querySelector('footer').getBoundingClientRect().top,workspace:document.querySelector('#session-workspace').getBoundingClientRect().height}));
  expect(bounds.detail).toBeLessThanOrEqual(bounds.footer);expect(bounds.workspace).toBeGreaterThanOrEqual(150);
});

test('track name and metadata line boxes fit the fixed Session header without clipping',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page,false,true,8);
  const headers=await page.locator('.track-name').evaluateAll(elements=>elements.map(e=>({height:e.clientHeight,content:e.scrollHeight,lines:[...e.children].map(child=>({height:child.clientHeight,content:child.scrollHeight}))})));
  for(const header of headers){expect(header.content).toBeLessThanOrEqual(header.height);for(const line of header.lines)expect(line.content).toBeLessThanOrEqual(line.height);}
});

for(const kind of ['gain','note'])test(`v4 navigation and polling preserve unfinished ${kind} without changing runtime authority`,async({page})=>{
  await openSession(page,false,true,2,true);
  if(kind==='note')await page.locator('.note-table>summary').click();
  const input=page.getByLabel(kind==='gain'?'Pulse gain':'Note 1 pitch',{exact:true});
  await input.fill(kind==='gain'?'0.83':'73');
  for(let i=0;i<2;i++){await page.locator('#view-arrangement').click();await page.locator('#view-session').click();}
  const before=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(before+2);
  await expect(input).toHaveValue(kind==='gain'?'0.83':'73');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await page.locator('#session-workspace').focus();
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current').length)).toBe(1);
  const committed=await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'));
  expect(committed[0].name).toBe(kind==='gain'?'alive_mixer':'alive_workspace_edit');
  if(kind==='note')expect(committed[0].args.operation).toMatchObject({kind:'noteUpdate',sourceId:'source-track-1',noteId:'note-track-1-0',pitch:73});
  await page.keyboard.press('Tab');await expect(page.locator('#arrangement-workspace')).toBeVisible();await page.keyboard.press('Tab');await expect(page.locator('#session-workspace')).toBeVisible();
  expect(await page.evaluate(()=>window.sessionSnapshot.runtime.tracks.every(t=>t.authority==='arrangement'&&t.activeSourceId===null))).toBe(true);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual(committed);
});

async function openArrangement(page,size){
  await page.setViewportSize(size);await openSession(page,false,true,2,true);
  await page.evaluate(()=>{const s=window.sessionSnapshot,d=s.document;d.lengthBeats=16;d.placements=d.tracks.map((t,i)=>({id:`p-${i}`,trackId:t.id,sourceId:d.sources[i].id,start:0,duration:4,sourceOffset:{kind:'beats',value:0},loopEnabled:true}));s.preparedWorkspaces.placements=d.placements.map(p=>({placementId:p.id,trackId:p.trackId,sourceId:p.sourceId,startFrame:'0',durationFrames:'102857',sourceOffsetFrames:'0',loopEnabled:true}));s.draftRevision++;});
  await page.locator('#view-arrangement').click();await expect(page.getByRole('button',{name:'Select placement p-0',exact:true})).toBeVisible();
}
const workspaceEdits=page=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_workspace_edit'));
async function dragTimeline(page,locator,from,to,{cancel=false,hide=false}={}){
  const box=await locator.boundingBox();await page.mouse.move(box.x+from[0],box.y+from[1]);await page.mouse.down();await page.mouse.move(box.x+to[0],box.y+to[1],{steps:6});
  if(cancel)await page.keyboard.press('Escape');if(hide)await page.locator('#view-session').click();await page.mouse.up();
}
for(const size of [{width:1440,height:900},{width:1280,height:800}]){
  test(`Arrangement pointer edits, cancellation and local view controls at ${size.width}`,async({page})=>{
    await openArrangement(page,size);const p=page.getByRole('button',{name:'Select placement p-0',exact:true});
    // Read the current placement and its geometry together; timeline redraws replace its nodes.
    const box=await page.evaluate(()=>{const element=document.querySelector('[data-placement-id="p-0"]'),rect=element?.getBoundingClientRect();return rect&&rect.width&&rect.height?{x:rect.x,y:rect.y}:null;});expect(box).not.toBeNull();await page.mouse.move(box.x+30,box.y+12);await page.mouse.down();await page.mouse.move(box.x+126,box.y+12,{steps:5});expect(await workspaceEdits(page)).toHaveLength(0);await page.mouse.up();
    await expect(page.getByLabel('Placement start',{exact:true})).toHaveValue('2');expect(await workspaceEdits(page)).toHaveLength(1);
    await dragTimeline(page,p,[30,12],[78,12],{cancel:true});expect(await workspaceEdits(page)).toHaveLength(1);await expect(page.getByLabel('Placement start',{exact:true})).toHaveValue('2');
    await dragTimeline(page,p.locator('.timeline-edge.right'),[3,15],[51,15]);await expect(page.getByLabel('Placement duration',{exact:true})).toHaveValue('5');
    await dragTimeline(page,p.locator('.timeline-edge.left'),[3,15],[27,15]);await expect(page.getByLabel('Placement start',{exact:true})).toHaveValue('2.5');await expect(page.getByLabel('Placement source offset',{exact:true})).toHaveValue('0.5');
    await page.getByLabel('Loop source suffix',{exact:true}).uncheck();expect((await workspaceEdits(page)).at(-1).args.operation).toMatchObject({kind:'placementUpdate',loopEnabled:false,start:2.5,duration:4.5,sourceOffset:{kind:'beats',value:.5}});const count=(await workspaceEdits(page)).length;await dragTimeline(page,p,[30,12],[78,12],{hide:true});await page.locator('#view-arrangement').click();expect(await workspaceEdits(page)).toHaveLength(count);
    await page.getByRole('button',{name:'Zoom timeline in',exact:true}).click();await page.getByRole('button',{name:'Zoom timeline out',exact:true}).click();await page.locator('#timeline-scroll').evaluate(e=>e.scrollLeft=100);await page.getByRole('button',{name:'Fit timeline',exact:true}).click();
    expect(await page.evaluate(()=>window.calls.filter(c=>['alive_workspace_action','alive_transport','alive_clip_action'].includes(c.name)))).toHaveLength(0);
    await page.getByRole('button',{name:'Delete placement',exact:true}).click();await expect(p).toHaveCount(0);await page.locator('#undo').click();await expect(p).toBeVisible();
    expect(await page.evaluate(()=>window.sessionSnapshot.draft.tracks[0].slots[0].sourceId)).toBe('source-track-1');
    await page.screenshot({path:`/tmp/alive-workspaces-task4-midi/browser-arrangement-${size.width}x${size.height}.png`});
  });
  for(const field of ['Placement start','Placement source offset','Arrangement source name'])test(`Arrangement unfinished ${field} survives hiding and polling at ${size.width}`,async({page})=>{
    await openArrangement(page,size);await page.getByRole('button',{name:'Select placement p-0',exact:true}).click();const input=page.getByLabel(field,{exact:true}),value=field.includes('name')?'Unfinished source':field.includes('offset')?'0.5':'1';await input.fill(value);await input.evaluate(e=>window.retainedArrangementField=e);
    for(let i=0;i<2;i++){await page.locator('#view-session').click();await page.locator('#view-arrangement').click();}
    await page.locator('#toggle-browser').click();await page.locator('#toggle-browser').click();const polls=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(polls+2);
    expect(await workspaceEdits(page)).toHaveLength(0);await expect(input).toHaveValue(value);expect(await input.evaluate(e=>e===window.retainedArrangementField)).toBe(true);
    await input.focus();await input.press('Tab');await expect.poll(async()=>(await workspaceEdits(page)).length).toBe(1);await expect(input).toHaveValue(value);
  });
}
test('Arrangement creates separate source and occurrence history and cancels stale gestures and brace previews',async({page})=>{
  await openArrangement(page,{width:1280,height:800});const lane=page.locator('.timeline-lane').first();await dragTimeline(page,lane,[384,35],[480,35]);await page.getByRole('button',{name:'Create MIDI source',exact:true}).click();await expect(page.getByLabel('MIDI source',{exact:true})).toHaveValue('new-source-1');await page.getByRole('button',{name:'Place source in range',exact:true}).click();expect((await workspaceEdits(page)).map(c=>c.args.operation.kind)).toEqual(['sourceCreateMidi','placementCreate']);
  const p=page.getByRole('button',{name:'Select placement new-placement-2',exact:true});const b=await p.boundingBox();await page.mouse.move(b.x+30,b.y+15);await page.mouse.down();await page.mouse.move(b.x+78,b.y+15);const polls=await page.evaluate(()=>{window.sessionSnapshot.draftRevision++;return window.calls.filter(c=>c.name==='alive_current').length;});await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(polls+1);await page.mouse.up();expect(await workspaceEdits(page)).toHaveLength(2);
  await dragTimeline(page,page.locator('.timeline-brace .right'),[3,8],[-93,8],{cancel:true});expect(await workspaceEdits(page)).toHaveLength(2);
  await dragTimeline(page,page.locator('.timeline-brace .right'),[3,8],[-93,8]);await expect(page.getByLabel('Song loop end',{exact:true})).toHaveValue('6');expect((await workspaceEdits(page)).at(-1).args.operation.kind).toBe('transportRange');
});
for(const size of [{width:1440,height:900},{width:1280,height:800}])test(`Arrangement eight-track scrolling, long names and expanded detail stay bounded at ${size.width}`,async({page})=>{
  await page.setViewportSize(size);await openSession(page,true,true,8,true);await page.evaluate(()=>{const s=window.sessionSnapshot;s.document.lengthBeats=128;s.document.tracks[0].name='Long track name '.repeat(8);s.document.placements=[{id:'long',trackId:s.document.tracks[0].id,sourceId:s.document.sources[0].id,start:0,duration:4,sourceOffset:{kind:'beats',value:0},loopEnabled:true}];s.document.sources[0].name='Long MIDI source name '.repeat(5);s.draftRevision++;});
  await page.locator('#view-arrangement').click();await page.getByRole('button',{name:'Select placement long',exact:true}).click();await page.getByRole('separator',{name:'Resize detail area'}).focus();await page.keyboard.press('End');
  const bounds=await page.evaluate(()=>{const scroll=document.querySelector('#timeline-scroll');return{body:document.body.scrollHeight,viewport:innerHeight,workspace:document.querySelector('#arrangement-workspace').clientHeight,detail:document.querySelector('#detail-panel').getBoundingClientRect().bottom,footer:document.querySelector('footer').getBoundingClientRect().top,scrollX:scroll.scrollWidth>scroll.clientWidth,scrollY:scroll.scrollHeight>scroll.clientHeight};});
  expect(bounds.body).toBe(bounds.viewport);expect(bounds.workspace).toBeGreaterThanOrEqual(150);expect(bounds.detail).toBeLessThanOrEqual(bounds.footer);expect(bounds.scrollX&&bounds.scrollY).toBe(true);
  await page.locator('#timeline-scroll').evaluate(e=>{e.scrollTop=240;e.scrollLeft=800;});expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});
test('Arrangement selection opens Clip detail and piano Delete never deletes its occurrence',async({page})=>{
  await openArrangement(page,{width:1280,height:800});await page.locator('#detail-devices').click();await page.getByRole('button',{name:'Select placement p-0',exact:true}).click();
  await expect(page.locator('#clip-detail')).toBeVisible();
  await page.locator('#piano-roll [data-note="0"][data-part="body"]').click();await page.locator('#piano-roll').press('Delete');
  await expect.poll(async()=>(await workspaceEdits(page)).length).toBeGreaterThan(0);expect((await workspaceEdits(page)).map(c=>c.args.operation.kind)).toEqual(['noteDelete']);await expect(page.getByRole('button',{name:'Select placement p-0',exact:true})).toBeVisible();
});
for(const size of [{width:1440,height:900},{width:1280,height:800}])test(`Arrangement gain preserves unfinished input and shares Session mixer at ${size.width}`,async({page})=>{
  await openArrangement(page,size);const gain=page.getByLabel('Pulse Arrangement gain',{exact:true});await gain.fill('0.713');
  for(let i=0;i<2;i++){await page.locator('#view-session').click();await page.locator('#view-arrangement').click();}
  const polls=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(polls+2);
  await expect(gain).toHaveValue('0.713');expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await gain.focus();await gain.press('Tab');await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_mixer').length)).toBe(1);
  expect(await page.evaluate(()=>window.calls.find(c=>c.name==='alive_mixer').args)).toMatchObject({track:0,gain:.713});await expect(page.locator('#arrangement-workspace')).toBeVisible();
  await page.locator('#view-session').click();await expect(page.getByLabel('Pulse gain',{exact:true})).toHaveValue('0.713');
});
