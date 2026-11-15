import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

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
  const snapshot={master:{gain:1,acceptedSerial:'1',available:true,unavailableReason:null,observationStale:false,observation:{targetGain:1,currentGain:1,peakLeft:.2,peakRight:1.2,clipMask:2,appliedSerial:'1',appliedFrame:'64',observationStartFrame:'0',observationEndFrame:'64'}},generation:1,draftRevision:0,capabilities:{maxTracks:8,maxDevices:16,atomicTrackActions:true},history:{canUndo:false,canRedo:false},document,deviceInstances,dirty:false,draft:null,state:{playing:0,position:0,absoluteFrame:0,rejected:0,generation:1,peakLeft:0,peakRight:0,devices:runtime,tracks:document.tracks.map(()=>({peakLeft:0,peakRight:0,activeVoices:0}))},audio:{config:{host:'default',device:'default',sample_rate:48000},observed_buffer_frames:0,callbacks:0,stream_errors:0,failed:false,message:'Browser fixture'}};
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
      if(name==='alive_master'||name==='alive_master_reset_clip'){window.calls.push({name,args});if(window.masterGate)return window.masterGate(name,args);if(args.generation!==snapshot.generation)throw {code:'STALE_GENERATION',message:'stale generation'};const serial=String(BigInt(snapshot.master.acceptedSerial)+1n);snapshot.master.acceptedSerial=serial;snapshot.master.observation.appliedSerial=serial;if(name==='alive_master'){snapshot.master.gain=args.gain;snapshot.master.observation.targetGain=args.gain;snapshot.master.observation.currentGain=args.gain;return {generation:args.generation,acceptedGain:args.gain,acceptedSerial:serial,changed:true};}snapshot.master.observation.clipMask=0;return {generation:args.generation,acceptedSerial:serial};}
      if(name==='alive_mixer'){window.calls.push({name,args});for(const document of [snapshot.document,snapshot.draft])if(document)Object.assign(document.tracks[args.track],{gain:args.gain,mute:args.mute,solo:args.solo});snapshot.dirty=true;return;}
      if(name==='alive_clip_edit'){window.calls.push({name,args});const op=args.operation;if(op.kind!=='create')throw Error('Fixture supports create only');snapshot.draft??=structuredClone(snapshot.document);const track=snapshot.draft.tracks.find(t=>t.id===op.trackId);if(track.slots[op.slot])throw Error('Slot already occupied');track.slots[op.slot]={id:`new-${track.id}-${op.slot}`,name:'New clip',lengthBeats:8,notes:[],automation:[]};snapshot.draftRevision++;snapshot.history={canUndo:true,canRedo:false};return{snapshot:structuredClone(snapshot),affected:{trackId:track.id,slot:op.slot}};}
      return previous(name,args);
    };
  },snapshot);
  await page.goto('/alive.html');await expect(page.locator('#chain-title')).toHaveText('Pulse chain');
}

const OUT=resolve(process.env.ALIVE_CAPTURE_DIR || fileURLToPath(new URL('./test-results/ui-captures/', import.meta.url)));
mkdirSync(OUT,{recursive:true});
test('capture populated session and arrangement',async({page})=>{
  test.setTimeout(60000);
  for (const [w,h,tag] of [[1440,900,'1440'],[1280,800,'1280']]) {
    await page.setViewportSize({width:w,height:h});
    await openSession(page,false,true,4,true);
    await page.waitForTimeout(400);
    await page.screenshot({path:`${OUT}/pop-${tag}-session.png`});
    // select a clip to fill detail panel
    const slot=page.getByRole('button',{name:/Select Pulse slot 1/}).first();
    if(await slot.count()){await slot.click();await page.waitForTimeout(300);}
    await page.screenshot({path:`${OUT}/pop-${tag}-session-detail.png`});
    await page.click('#view-arrangement');
    await page.waitForTimeout(400);
    await page.screenshot({path:`${OUT}/pop-${tag}-arrangement.png`});
    await page.click('#view-session');
    await page.waitForTimeout(200);
  }
});
