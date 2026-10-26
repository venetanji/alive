import {geometry,point,beatAt,pitchAt,transformNote,addNote,keyEdit} from './alive-piano.mjs';
import {createAliveModel,parameterReading,nativeInteger} from './alive-model.mjs';
import {mountAudioSettings} from './audio-settings.mjs';
import {mountWorkspace} from './alive-workspace.mjs';

export function mountAlive({doc=globalThis.document,win=globalThis.window,invoke=win?.__TAURI__?.core?.invoke}={}){
  const $=id=>doc.getElementById(id),make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const model=createAliveModel();let selected=0,selectedInstance=null,chainKey='',queue=Promise.resolve(),disposed=false,trackKey='',musicKey='',parameterKey='',laneKey='';
  const workspace=mountWorkspace({doc,win});
  let selectedSlots=new Map(),selectionToken=0,activeEditClip=null,selectedNote=null,gesture=null,preview=null,pianoGeometry=null,velocityCanceled=false,listRevision=0,scopeRevision=0,transportRequestKey='';
  const trackViews=[],chainViews=[],parameterViews=new Map(),diagnostics=new Map();let audioSettings;
  function notice(text,error=false){$('notice').textContent=String(text);$('notice').classList.toggle('error',error);}
  function enqueue(work){const result=queue.then(work);queue=result.catch(error=>notice(error,true));return result;}
  function generation(){return model.snapshot()?.generation;}
  function command(name,args={}){return invoke(name,{...args,generation:generation(),...(['alive_transport','alive_clip_action'].includes(name)?{preparationRevision:model.snapshot()?.preparationRevision}:{}),...(['alive_edit','alive_clip_edit','alive_enable_clips','alive_history','alive_apply','alive_discard','alive_file','alive_device'].includes(name)?{draftRevision:model.snapshot()?.draftRevision??0}:{})});}
  function commitFocused(){if(doc.activeElement?.matches('input'))doc.activeElement.blur();}
  const guard=work=>(...args)=>{try{Promise.resolve(work(...args)).catch(error=>notice(error,true));}catch(error){notice(error,true);}};
  const bind=(id,label,fn)=>{$(id).setAttribute('aria-label',label);$(id).addEventListener('click',guard(fn));};
  function numeric(label,value,{min,max,step='any'}={},change){
    const input=make('input');input.type='number';input.value=String(value);input.setAttribute('aria-label',label);
    if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);input.step=String(step);
    input.addEventListener('change',guard(()=>{if(input.value===''||!Number.isFinite(Number(input.value)))throw Error(`${label} requires a number.`);return change(Number(input.value));}));return input;
  }
  function svgElement(tag,attrs={}){const e=doc.createElementNS('http://www.w3.org/2000/svg',tag);for(const[key,value]of Object.entries(attrs))e.setAttribute(key,String(value));return e;}
  function meter(element,left,right){const bars=element.children;bars[0].style.width=`${Math.min(1,left)*100}%`;bars[1].style.width=`${Math.min(1,right)*100}%`;}
  function peak(left,right){return`${left.toFixed(3)} / ${right.toFixed(3)}`;}
  function cancelGesture(){
    if(!gesture&&!preview)return;
    const old=gesture;if(old?.kind==='velocity')velocityCanceled=true;gesture=null;preview=null;
    if(old?.pointerId!==undefined&&$('piano-roll').hasPointerCapture?.(old.pointerId))$('piano-roll').releasePointerCapture(old.pointerId);
    musicKey='';render();
  }
  function slotOf(track){return selectedSlots.get(track.id)??0;}
  function selectedClip(track=model.document()?.tracks[selected]){return track?.slots?.[slotOf(track)]??null;}
  function editorDocument(document=model.document()){
    if(!document||document.format!=='alive-session-v3')return document;
    return {...document,lengthBeats:selectedClip(document.tracks[selected])?.lengthBeats??document.lengthBeats,tracks:document.tracks.map(t=>{const c=selectedClip(t);return {...t,notes:c?.notes??[],automation:c?.automation??[],clipId:c?.id??null,clipLength:c?.lengthBeats??document.lengthBeats};})};
  }
  function selectedNoteIndex(notes){return typeof selectedNote==='string'?notes.findIndex(n=>n.id===selectedNote):selectedNote;}
  function noteIdentity(note,index){return note.id??index;}
  function listShape(document){return JSON.stringify(document.tracks.map(t=>[t.id,t.slots?t.slots.map(c=>c?[c.id,c.notes.map(n=>n.id),c.automation.map(l=>[l.instanceId,l.key,l.points.length])]:null):[t.notes.length,t.automation.map(l=>[l.instanceId,l.key,l.points.length])]]));}
  function trackById(document,id){const track=document.tracks.find(track=>track.id===id);if(!track)throw Error('The originating track changed. Select it and try again.');if(!track.slots)return track;const clip=track.slots.find(c=>c?.id===activeEditClip);if(!clip)throw Error('The originating clip changed. Select it and try again.');return clip;}
  function noteAt(track,id,index){const at=id?track.notes.findIndex(n=>n.id===id):index;if(at<0||!track.notes[at])throw Error('The originating note changed.');return at;}
  // Accepted boundaries invalidate queued intent; ordinary edits keep their queue's scope.
  function invalidateScope(before){
    const current=model.snapshot();
    if(before&&(before.generation!==current.generation||before.draftRevision!==current.draftRevision)){
      scopeRevision++;listRevision++;selectedNote=null;cancelGesture();
    }
  }
  function applySnapshot(snapshot){const before=model.snapshot();model.applied(snapshot);invalidateScope(before);}
  function edit(change,rebuild=true,label='Edit schedule',context=null,indexed=false){
    const epoch=listRevision,scope=context?.scope??scopeRevision,clipId=context?.clipId??selectedClip()?.id??null;
    return enqueue(async()=>{
      if(scope!==scopeRevision){musicKey='';render();throw Error('The score scope changed. Select it and try again.');}
      if(indexed&&epoch!==listRevision){musicKey='';render();throw Error('The note or automation list changed. Select it and try again.');}
      if(context?.revision!==undefined&&(generation()!==context.generation||(model.snapshot()?.draftRevision??0)!==context.revision))throw Error('The score changed during this gesture. Try again.');
      const previous=model.document(),document=structuredClone(previous);activeEditClip=clipId;try{change(document);}finally{activeEditClip=null;}
      try{model.applied(await command('alive_edit',{document,label}));if(listShape(previous)!==listShape(model.document()))listRevision++;}
      catch(error){selectedNote=null;musicKey='';await refresh();throw error;}
      preview=null;musicKey='';render();
    });
  }
  async function refresh(){
    const snapshot=await invoke('alive_current');
    if(gesture&&(snapshot.generation!==gesture.generation||(snapshot.draftRevision??0)!==gesture.revision)){if(gesture.kind==='velocity')velocityCanceled=true;gesture=null;preview=null;selectedNote=null;musicKey='';}
    const before=model.snapshot();model.accept(snapshot);
    invalidateScope(before);
    render();return snapshot;
  }
  function file(action){commitFocused();cancelGesture();return enqueue(async()=>{
    let result;
    try{result=await command('alive_file',{action});}
    finally{applySnapshot(await invoke('alive_current'));trackKey=musicKey=parameterKey='';selectedNote=null;render();}
    if(result)notice(action.startsWith('save')?'Session saved.':'Session ready.');
  });}
  function transport(action){return enqueue(async()=>{
    const result=await command('alive_transport',{action,beat:Number($('seek').value)});await refresh();
    if(result?.requestSerial){const observed=observedRequest(result);notice(`Transport ${requestText(observed,model.snapshot())}`,observed.status==='rejected');}
    else notice(action==='start'?(model.pending()?'Playing the prepared schedule. Pending edits remain unapplied.':'Transport playing.'):action==='stop'?'Transport stop requested.':'Transport seek queued.');
  });}
  function paintPiano(svg,notes,length,detailed=false){
    const width=640,height=detailed?218:52,pad=detailed?32:0,top=detailed?21:3;
    const g=detailed?(gesture?.geometry??geometry(notes,length)):null;
    if(detailed)pianoGeometry=g;
    const min=detailed?g.min:Math.min(48,...notes.map(n=>n.pitch)),max=detailed?g.max:Math.max(84,...notes.map(n=>n.pitch));
    const pitchHeight=(height-top-6)/(max-min+1),x=beat=>pad+beat/length*(width-pad),y=pitch=>top+(max-pitch)*pitchHeight;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.replaceChildren();
    if(detailed){
      for(let pitch=min;pitch<=max;pitch++){
        if([1,3,6,8,10].includes(pitch%12))svg.append(svgElement('rect',{x:pad,y:y(pitch),width:width-pad,height:pitchHeight,fill:'#222',stroke:'none'}));
        if(pitch%12===0){const text=svgElement('text',{x:3,y:y(pitch)+pitchHeight,fill:'#b4b4b0',stroke:'none','font-size':10});text.textContent=`C${Math.floor(pitch/12)-1}`;svg.append(text);}
      }
    }
    const beatStep=Math.max(1,Math.ceil(length/32));
    for(let beat=0;beat<=length;beat+=beatStep){svg.append(svgElement('line',{x1:x(beat),x2:x(beat),y1:detailed?17:0,y2:height,stroke:beat%4===0?'#535353':'#3d3d3d','stroke-width':1}));if(detailed){const text=svgElement('text',{x:x(beat)+3,y:12,fill:'#b4b4b0',stroke:'none','font-size':10});text.textContent=String(beat);svg.append(text);}}
    notes.forEach((note,index)=>{
      const left=x(note.beat)+1,wide=Math.max(2,x(note.duration)-pad-2),high=Math.max(2,pitchHeight-1),chosen=detailed&&selectedNote===noteIdentity(note,index);
      svg.append(svgElement('rect',{x:left,y:y(note.pitch),width:wide,height:high,rx:1,fill:detailed?'#efbb62':'#c8ae74',stroke:chosen?'#91b9ed':'none','stroke-width':2,...(detailed?{'data-note':index,'data-part':'body'}:{})}));
      if(detailed){svg.append(svgElement('rect',{x:left+Math.max(0,wide-6),y:y(note.pitch),width:Math.min(6,wide),height:high,fill:chosen?'#91b9ed':'#c8ae74',stroke:'none','data-note':index,'data-part':'resize'}));
        if(chosen)svg.append(svgElement('line',{x1:left,x2:left+wide*note.velocity/127,y1:y(note.pitch)+high,y2:y(note.pitch)+high,stroke:'#eeeeec','stroke-width':2,'pointer-events':'none'}));}
    });
    svg.append(svgElement('line',{class:'playhead',x1:pad,x2:pad,y1:0,y2:height,stroke:'#eeeeec','stroke-width':1}));
  }
  let clipControlsKey='',slotViews=[],sceneViews=[];
  function sceneText(result,snapshot){
    const reason=({7:'command queue full',8:'receipt table busy',12:'optional work limit',13:'Stop canceled',14:'end canceled',15:'feature disabled',16:'runtime invariant',18:'replaced request'})[result.reason]??`native reason ${result.reason}`;
    const members=(result.members??[]).map(member=>`${snapshot.document.tracks.find(t=>t.id===member.trackId)?.name??member.trackId}: ${member.status}${member.action==='stop'?' (track Stop)':''}`).join(' / ');
    return `Scene ${result.sceneSlot+1} request ${result.requestSerial} ${result.status}${result.targetFrame?` at frame ${result.targetFrame}`:''}. ${members}${result.reason?`. Request summary: ${reason}.`:''}${[7,8,12].includes(result.reason)?' Let audio advance before an explicit retry.':''}`;
  }
  function launchScene(slot){
    const intent={generation:generation(),preparationRevision:model.snapshot().preparationRevision,slot};
    return enqueue(async()=>{
      const result=await invoke('alive_launch_scene',intent);await refresh();
      if(result){const observed=observedRequest(result);notice(sceneText(observed,model.snapshot()),observed.status==='rejected');}
    });
  }
  function renderScenes(snapshot){
    const enabled=snapshot.mode==='clipsV3';$('scene-controls').hidden=$('scene-help').hidden=!enabled;
    if(!enabled)return;
    if(!sceneViews.length)for(let slot=0;slot<4;slot++){
      const row=make('div','scene-row'),launch=make('button','scene-launch',`Launch scene ${slot+1}`),prepared=make('small','muted'),result=make('output','scene-result');
      launch.setAttribute('aria-label',`Launch scene ${slot+1}`);launch.setAttribute('aria-describedby','scene-help');launch.addEventListener('click',guard(()=>launchScene(slot)));
      prepared.setAttribute('aria-label',`Prepared scene ${slot+1}`);result.setAttribute('aria-label',`Scene ${slot+1} request`);
      row.append(launch,prepared,result);$('scene-controls').append(row);sceneViews.push({slot,launch,prepared,result});
    }
    for(const v of sceneViews){
      v.launch.disabled=!snapshot.capabilities?.atomicTrackActions;
      v.launch.title=v.launch.disabled?'Atomic scenes are unavailable for this prepared profile':snapshot.audio.running?'Launch this prepared row':'Start Audio to launch a scene';
      v.prepared.textContent=snapshot.document.tracks.map(t=>`${t.name}: ${snapshot.preparedClips?.find(c=>c.trackId===t.id&&c.slot===v.slot)?.name??'Stop'}`).join(' / ');
      const request=snapshot.runtime?.requests.filter(r=>r.sceneSlot===v.slot).at(-1);
      v.result.textContent=request?sceneText(request,snapshot):'';
    }
  }
  function clipEdit(operation){
    const scope=scopeRevision,token=selectionToken;
    return enqueue(async()=>{
      if(scope!==scopeRevision)throw Error('The score scope changed. Select it and try again.');
      let result;try{result=await command('alive_clip_edit',{operation});}catch(error){clipControlsKey='';await refresh();throw error;}model.applied(result.snapshot);listRevision++;
      if(token===selectionToken){const a=result.affected;if(['create','duplicate'].includes(operation.kind)){selectedSlots.set(a.trackId,a.slot);selectedNote=null;}if(operation.kind==='delete'&&slotOf(model.document().tracks[selected])===a.slot)selectedNote=null;if(operation.kind==='noteCreate')selectedNote=a.noteId;}
      musicKey=clipControlsKey=trackKey='';render();
    });
  }
  function requestText(result,snapshot){
    const clip=snapshot.preparedClips?.find(c=>c.clipId===result.clipId)?.name;
    const reason=({7:'command queue full',8:'receipt table busy',12:'optional work limit',5:'stale preparation',9:'empty slot',15:'feature disabled'})[result.reason]??`native reason ${result.reason}`;
    return `request ${result.requestSerial} ${result.status}${clip?` for ${clip}`:''}${result.reason?` (${reason}); prior playback or pending action is retained. Let audio advance before an explicit retry.`:''}`;
  }
  function observedRequest(result){return model.snapshot().runtime?.requests.find(r=>r.preparationRevision===result.preparationRevision&&r.requestSerial===result.requestSerial)??result;}
  function renderTransportRequest(snapshot){
    const request=snapshot.runtime?.requests.filter(r=>r.trackId===null&&r.sceneSlot==null).at(-1);
    if(!request){transportRequestKey='';return;}
    const key=JSON.stringify(request);if(key===transportRequestKey)return;transportRequestKey=key;
    notice(`Transport ${requestText(request,snapshot)}`,request.status==='rejected');
  }
  function clipAction(action){return enqueue(async()=>{const result=await command('alive_clip_action',{action});await refresh();if(result){const observed=observedRequest(result);notice(requestText(observed,model.snapshot()),observed.status==='rejected');}});}
  function buildSlots(bank,track,index){
    for(let slot=0;slot<4;slot++){
      const c=track.slots[slot],cell=make('div','clip-slot'),choose=make('button','clip-select',c?.name??`Empty ${slot+1}`),launch=make('button','clip-launch','Launch'),status=make('small');
      choose.setAttribute('aria-label',`Select ${track.name} slot ${slot+1}`);choose.addEventListener('click',()=>{cancelGesture();selected=index;selectedSlots.set(track.id,slot);selectionToken++;selectedNote=null;musicKey=clipControlsKey='';render();});
      launch.setAttribute('aria-label',`Launch ${track.name} ${c?.name??`slot ${slot+1}`}`);launch.disabled=!c;launch.addEventListener('click',guard(()=>clipAction({kind:'launch',trackId:track.id,clipId:c.id})));
      cell.dataset.slot=String(slot);cell.append(choose,launch,status);bank.append(cell);slotViews.push({trackId:track.id,slot,clipId:c?.id,cell,choose,launch,status});
    }
    const stop=make('button','track-stop','Stop track');stop.setAttribute('aria-label',`Stop ${track.name} track`);stop.addEventListener('click',guard(()=>clipAction({kind:'stop',trackId:track.id})));bank.append(stop);
    const state=make('output','clip-runtime');state.setAttribute('aria-label',`${track.name} clip runtime`);bank.append(state);slotViews.push({trackId:track.id,state});
  }
  function renderClipControls(){
    const snapshot=model.snapshot(),document=model.document(),track=document.tracks[selected],clip=selectedClip(track),enabled=document.format==='alive-session-v3',container=$('clip-controls');
    renderScenes(snapshot);
    $('clip-bank-notice').textContent=snapshot.notice??'';
    $('add-note').disabled=enabled&&!clip;$('add-lane').disabled=enabled&&!clip;
    for(const v of slotViews){
      if(v.state){const r=snapshot.runtime?.tracks.find(t=>t.trackId===v.trackId),name=snapshot.preparedClips?.find(c=>c.clipId===r?.activeClipId)?.name,requests=snapshot.runtime?.requests.filter(q=>q.trackId===v.trackId),last=requests?.at(-1);v.state.textContent=`${r?.activeClipId?`${snapshot.state.playing?'Playing':'Cued'} ${name}`:'Stopped'}${last?` / ${requestText(last,snapshot)}`:''}${r?.pendingAction?` / pending ${r.pendingAction} at frame ${r.pendingFrame}`:''}`;continue;}
      const t=document.tracks.find(t=>t.id===v.trackId),c=t?.slots[v.slot],runtime=snapshot.runtime?.tracks.find(t=>t.trackId===v.trackId),prepared=snapshot.preparedClips?.find(c=>c.clipId===v.clipId),active=runtime?.activeClipId===v.clipId&&!!v.clipId,pending=runtime?.pendingClipId===v.clipId&&!!v.clipId;
      v.choose.setAttribute('aria-pressed',String(t?.id===track.id&&v.slot===slotOf(track)));v.cell.classList.toggle('selected',t?.id===track.id&&v.slot===slotOf(track));v.launch.disabled=!prepared;v.launch.textContent=prepared&&model.pending()?'Launch prepared':'Launch';v.launch.title=prepared?(model.pending()?'Launch prepared version':'Launch at the next native bar boundary'):'Apply while stopped to launch';
      const activeName=snapshot.preparedClips?.find(c=>c.clipId===runtime?.activeClipId)?.name;
      v.status.textContent=[c&&t.defaultClipId===c.id?'Saved default':'',active?`${snapshot.state.playing?'Playing':'Cued'} ${prepared?.name??''}`:'',pending?'Pending switch':'',v.slot===0&&runtime?.pendingAction==='stop'?'Pending track Stop':'',v.slot===0&&runtime?.activeClipId&&!t.slots.some(c=>c?.id===runtime.activeClipId)?`${snapshot.state.playing?'Playing':'Cued'} prepared ${activeName} (deleted in draft)`:''].filter(Boolean).join(' / ');
    }
    const key=JSON.stringify([enabled,track.id,slotOf(track),clip?.id,clip?.name,clip?.lengthBeats,track.defaultClipId,track.slots?.map(c=>c?.id),snapshot.generation]);if(key===clipControlsKey)return;clipControlsKey=key;container.replaceChildren();
    const button=(text,fn)=>{const b=make('button','',text);b.setAttribute('aria-label',text);b.addEventListener('click',guard(fn));container.append(b);return b;};
    if(!enabled){const b=button('Enable clip bank',()=>enqueue(async()=>{applySnapshot(await command('alive_enable_clips'));trackKey=musicKey=clipControlsKey='';render();}));b.disabled=!!snapshot.state.playing||model.pending();return;}
    const trackId=track.id,slot=slotOf(track);
    if(!clip){button('Create clip',()=>clipEdit({kind:'create',trackId,slot}));container.append(make('span','muted',`Slot ${slot+1} is empty. Create a clip to edit notes.`));return;}
    const clipId=clip.id,name=make('input');name.value=clip.name;name.maxLength=64;name.setAttribute('aria-label','Clip name');name.addEventListener('change',guard(()=>clipEdit({kind:'rename',trackId,clipId,name:name.value})));container.append(name);
    const label=make('label','','Clip length '),length=numeric('Selected clip length',clip.lengthBeats,{min:1/64,max:256},lengthBeats=>clipEdit({kind:'length',trackId,clipId,lengthBeats}));label.append(length);container.append(label);
    const destination=make('select');destination.setAttribute('aria-label','Duplicate destination');track.slots.forEach((c,i)=>{if(!c){const option=make('option','',`Slot ${i+1}`);option.value=String(i);destination.append(option);}});destination.value=destination.children[0]?.value??'';container.append(destination);
    button('Duplicate clip',()=>clipEdit({kind:'duplicate',trackId,clipId,destinationSlot:Number(destination.value)})).disabled=!destination.children.length;
    button('Delete clip',()=>clipEdit({kind:'delete',trackId,clipId}));button('Set Saved Default',()=>clipEdit({kind:'default',trackId,clipId}));button('Clear Saved Default',()=>clipEdit({kind:'default',trackId,clipId:null}));container.append(make('span','muted','Used after Apply and when reopened. Selection does not launch.'));
  }
  function buildTracks(document){
    $('tracks').replaceChildren();trackViews.length=0;slotViews=[];
    document.tracks.forEach((track,index)=>{
      const row=make('article','track'),name=make('button','track-name'),title=make('span','',track.name),detail=make('small','',`${track.notes.length} notes / stereo`),clip=make('button','clip-preview'),svg=svgElement('svg');
      name.append(title,detail);name.setAttribute('aria-label',`Select ${track.name} track`);clip.setAttribute('aria-label',`${track.name} clip`);clip.append(svg);
      const choose=()=>{if(selected!==index){cancelGesture();selectedNote=null;selectionToken++;selected=index;selectedInstance=null;}musicKey=parameterKey='';render();};name.addEventListener('click',choose);clip.addEventListener('click',choose);
      const gainLabel=make('label','track-gain','Gain'),gain=numeric(`${track.name} gain`,track.gain,{min:0,max:2,step:.05},value=>mix(index,{gain:value}));gainLabel.append(gain);
      const mute=make('button','mixer-toggle','M'),solo=make('button','mixer-toggle','S');mute.setAttribute('aria-label',`${track.name} mute`);solo.setAttribute('aria-label',`${track.name} solo`);
      mute.addEventListener('click',guard(()=>mix(index,{mute:!model.document().tracks[index].mute})));solo.addEventListener('click',guard(()=>mix(index,{solo:!model.document().tracks[index].solo})));
      const meters=make('div','track-meter'),bar=make('div','stereo-meter'),readout=make('output');bar.append(make('i'),make('i'));bar.setAttribute('aria-label',`${track.name} stereo peak`);readout.setAttribute('aria-label',`${track.name} peak`);meters.append(bar,readout);
      const actions=make('div','track-actions');for(const[action,label]of [['editor','Editor'],['load','Replace'],['remove','Remove track']]){
        const button=make('button','',label);button.setAttribute('aria-label',action==='editor'?`Open ${track.name} editor`:action==='remove'?`Remove ${track.name} track`:`${label} ${track.name} device`);
        button.addEventListener('click',guard(()=>enqueue(async()=>{
          if(action!=='editor'){commitFocused();cancelGesture();selectedNote=null;}
          if(action==='editor')await command('alive_editor',{instanceId:track.device.instanceId});else{const snapshot=await command('alive_device',{trackId:track.id,instanceId:track.device.instanceId,action});applySnapshot(snapshot);trackKey=musicKey=parameterKey='';render();notice('Device updated. Start transport when ready.');}
        })));actions.append(button);
      }
      row.dataset.trackId=track.id;row.style.setProperty('--track-color',['#efbb62','#88c5c7','#91b9ed','#d8a0a7','#b4c98b','#d3b48a','#a5b9ce','#c5b6cf'][index%8]);
      const mixer=make('div','track-mixer'),toggles=make('div','mixer-toggles'),inspector=make('details','track-inspector'),summary=make('summary','','Device / track');
      toggles.append(mute,solo);mixer.append(gainLabel,toggles,meters);inspector.append(summary,actions);
      row.append(name);if(track.slots){row.classList.add('clips-track');clip.hidden=true;const bank=make('div','clip-bank');row.append(bank);buildSlots(bank,track,index);}row.append(clip,mixer,inspector);$('tracks').append(row);trackViews.push({row,detail,svg,gain,mute,solo,bar,readout,actions});
    });
  }
  function chainDevices(track=model.document().tracks[selected]){return [track.device,...track.effects];}
  function instanceView(id){return model.snapshot().deviceInstances[id];}
  function instanceName(reference,index){return `${instanceView(reference.instanceId).manifest.name}${index===0?' instrument':` effect ${index}`}`;}
  function structural(reference,action,beforeInstanceId){
    commitFocused();cancelGesture();selectedNote=null;
    const trackId=model.document().tracks[selected].id,instanceId=reference?.instanceId;
    return enqueue(async()=>{const snapshot=await command('alive_device',{trackId,instanceId,action,...(action==='reorder'?{beforeInstanceId}: {})});applySnapshot(snapshot);trackKey=musicKey=parameterKey=chainKey='';render();notice('Chain prepared. Start transport when ready.');});
  }
  function buildChain(){
    const track=model.document().tracks[selected],devices=chainDevices(track);
    $('chain-title').textContent=`${track.name} chain`;$('chain').replaceChildren();chainViews.length=0;
    devices.forEach((reference,index)=>{
      const name=instanceName(reference,index),context=`${track.name} ${name}`,row=make('div','chain-device'),choose=make('button','chain-select',name),bypass=make('button','','Bypass'),actions=[];
      choose.setAttribute('aria-label',`Select ${context}`);choose.addEventListener('click',()=>{selectedInstance=reference.instanceId;parameterKey='';render();});
      bypass.setAttribute('aria-label',`Bypass ${context}`);bypass.disabled=index===0;bypass.title=index===0?'Only effects support bypass. Use track mute to silence this track.':'Live bypass keeps the device state warm; audio output stays open.';
      bypass.addEventListener('click',guard(()=>{const instanceId=reference.instanceId,bypassed=!chainDevices().find(d=>d.instanceId===instanceId).bypassed;return enqueue(async()=>{await command('alive_bypass',{instanceId,bypassed});await refresh();});}));
      row.append(choose,bypass);
      const action=(label,aria,fn,blocked=false)=>{const button=make('button','',label);button.setAttribute('aria-label',aria);button.addEventListener('click',guard(fn));row.append(button);actions.push({button,blocked});};
      action('Replace...',`Replace ${context}`,()=>structural(reference,'replace'));
      if(index>0){
        action('Earlier',`Move ${context} earlier`,()=>structural(reference,'reorder',devices[index-1].instanceId),index===1);
        action('Later',`Move ${context} later`,()=>structural(reference,'reorder',devices[index+2]?.instanceId??null),index===devices.length-1);
        action('Remove',`Remove ${context}`,()=>structural(reference,'remove'));
      }
      $('chain').append(row);chainViews.push({row,choose,bypass,reference,actions});
    });
  }
  function automationTargets(){
    return chainDevices().flatMap((reference,index)=>instanceView(reference.instanceId).manifest.parameters.map(binding=>({instanceId:reference.instanceId,binding,label:index===0?binding.label:`${instanceName(reference,index)} / ${binding.label}`})));
  }
  function mix(track,changes){return enqueue(async()=>{const current=model.snapshot().document.tracks[track];await command('alive_mixer',{track,gain:changes.gain??current.gain,mute:changes.mute??current.mute,solo:changes.solo??current.solo});await refresh();});}
  function buildMusic(document){
    const track=document.tracks[selected],trackId=track.id,clipId=track.clipId,scope=scopeRevision;const editClip=(change,rebuild=true,label='Edit schedule',ctx=null,indexed=false)=>edit(change,rebuild,label,ctx??{clipId,scope},indexed);$('clip-title').textContent=track.slots?`${track.name} / ${selectedClip()?.name??'Empty slot'}`:`${track.name} clip`;
    paintPiano($('piano-roll'),preview??track.notes,document.lengthBeats,true);$('notes').replaceChildren();
    track.notes.forEach((note,index)=>{
      const row=make('tr');for(const[key,bounds]of [['beat',{min:0,max:document.lengthBeats,step:.25}],['pitch',{min:0,max:127,step:1}],['duration',{min:1/64,max:document.lengthBeats,step:.25}],['velocity',{min:1,max:127,step:1}]]){
        const cell=make('td'),input=numeric(`Note ${index+1} ${key}`,note[key],bounds,value=>editClip(doc=>{trackById(doc,trackId).notes[noteAt(trackById(doc,trackId),note.id,index)][key]=value;},false,'Edit note',null,!note.id));cell.append(input);row.append(cell);
      }
      const remove=make('button','','Remove'),cell=make('td');remove.setAttribute('aria-label',`Remove note ${index+1}`);remove.addEventListener('click',guard(()=>{if(model.document().tracks[selected].id===trackId)selectedNote=null;return editClip(doc=>trackById(doc,trackId).notes.splice(noteAt(trackById(doc,trackId),note.id,index),1),true,'Delete note',null,!note.id);}));cell.append(remove);row.append(cell);$('notes').append(row);
    });
    const targets=automationTargets(),targetSelect=$('automation-target'),priorTarget=targetSelect.value;
    targetSelect.replaceChildren();
    for(const target of targets){const option=make('option','',`${instanceName(chainDevices().find(d=>d.instanceId===target.instanceId),chainDevices().findIndex(d=>d.instanceId===target.instanceId))} / ${target.binding.label}`);option.value=JSON.stringify([target.instanceId,target.binding.key]);targetSelect.append(option);}
    targetSelect.value=targets.some(t=>JSON.stringify([t.instanceId,t.binding.key])===priorTarget)?priorTarget:targetSelect.children[0]?.value??'';
    $('lanes').replaceChildren();
    for(const {instanceId,binding,label:laneLabel} of targets){
      const key=binding.key,lane=track.automation.find(l=>l.instanceId===instanceId&&l.key===key);
      if(!lane&&!(instanceId===track.device.instanceId&&['cutoff','level'].includes(key)))continue;
      const section=make('div','lane'),heading=make('div','lane-heading'),label=make('label'),enable=make('input'),add=make('button','',`Add ${laneLabel} point`);
      section.dataset.lane=key;section.dataset.instance=instanceId;enable.type='checkbox';enable.checked=!!lane?.enabled;enable.setAttribute('aria-label',`${laneLabel} automation enabled`);label.append(enable,doc.createTextNode(laneLabel));heading.append(label,add);add.setAttribute('aria-label',`Add ${laneLabel} point`);
      const ensure=doc=>{const track=trackById(doc,trackId);let lane=track.automation.find(l=>l.instanceId===instanceId&&l.key===key);if(!lane){lane={instanceId,key,enabled:false,points:[]};track.automation.push(lane);}return lane;};
      enable.addEventListener('change',guard(()=>{const checked=enable.checked;return editClip(doc=>{ensure(doc).enabled=checked;},false,'Toggle automation');}));
      add.addEventListener('click',guard(()=>editClip(doc=>{const points=ensure(doc).points,last=points.at(-1)?.beat??-1;const beat=last<0?0:Math.min((trackById(doc,trackId).lengthBeats??doc.lengthBeats)-.015625,last+1);if(beat<=last)throw Error('Move or remove the final point to make room before the clip end.');points.push({beat,value:instanceView(instanceId).manifest.parameters.find(p=>p.key===key).base});})));
      const graph=svgElement('svg',{class:'lane-graph','aria-label':`${laneLabel} step automation`,role:'img'}),points=make('div','lane-points');
      if(!lane?.points.length)points.append(make('span','lane-empty','No points. Base value applies.'));
      (lane?.points??[]).forEach((point,index)=>{
        const group=make('div','lane-point'),beat=numeric(`${laneLabel} point ${index+1} beat`,point.beat,{min:0,max:document.lengthBeats,step:.25},value=>editClip(doc=>{ensure(doc).points[index].beat=value;},false,'Edit automation point',null,true)),value=numeric(`${laneLabel} point ${index+1} value`,point.value,{min:binding.min,max:binding.max,step:binding.integral?1:'any'},value=>editClip(doc=>{ensure(doc).points[index].value=value;},false,'Edit automation point',null,true)),remove=make('button','','x');
        remove.setAttribute('aria-label',`Remove ${laneLabel} point ${index+1}`);remove.addEventListener('click',guard(()=>editClip(doc=>ensure(doc).points.splice(index,1),true,'Delete automation point',null,true)));group.append(beat,value,remove);points.append(group);
      });
      section.append(heading,graph,points);$('lanes').append(section);
    }
    laneKey='';paintLanes();
  }
  function paintLanes(){
    const document=editorDocument(),track=document.tracks[selected];
    const bindings=automationTargets();
    const nextKey=JSON.stringify([selected,document.lengthBeats,track.automation,bindings.map(({instanceId,binding:p})=>[instanceId,p.key,p.min,p.max,p.base])]);
    if(nextKey===laneKey)return;laneKey=nextKey;
    for(const section of $('lanes').children){
      const key=section.dataset.lane,instanceId=section.dataset.instance,binding=instanceView(instanceId).manifest.parameters.find(p=>p.key===key),lane=track.automation.find(l=>l.instanceId===instanceId&&l.key===key),svg=section.querySelector('svg'),x=beat=>beat/document.lengthBeats*600,y=value=>36-(value-binding.min)/(binding.max-binding.min)*31;
      svg.setAttribute('viewBox','0 0 600 40');svg.setAttribute('preserveAspectRatio','none');svg.replaceChildren();
      let d=`M 0 ${y(binding.base)}`;for(const point of lane?.points??[])d+=` H ${x(point.beat)} V ${y(point.value)}`;d+=' H 600';
      svg.append(svgElement('path',{d,stroke:lane?.enabled?'#88c5c7':'#b4b4b0','stroke-width':1.5,fill:'none'}));
      for(const point of lane?.points??[])svg.append(svgElement('circle',{cx:x(point.beat),cy:y(point.value),r:2.5,fill:'#eeeeec',stroke:'none'}));
    }
  }
  function buildParameters(snapshot){
    $('parameters').replaceChildren();parameterViews.clear();const device=instanceView(selectedInstance).manifest,instanceId=selectedInstance;
    $('device-title').textContent=device?.name??'Device';$('device-path').textContent=chainDevices().find(d=>d.instanceId===selectedInstance).path;$('device-path').title=$('device-path').textContent;
    for(const binding of device?.parameters??[]){
      const section=make('div','parameter'),label=make('label','',binding.label),base=make('div','base'),unit=make('span','unit',binding.unit??''),number=numeric(`${binding.label} base`,binding.base,{min:binding.min,max:binding.max,step:binding.integral?1:binding.max<=1?.01:binding.max<=20?.1:1},value=>setBase(instanceId,binding.key,value)),range=make('input'),output=make('output');
      range.type='range';range.min=binding.min;range.max=binding.max;range.step=binding.integral?'1':'any';range.value=binding.base;range.id=`base-${binding.key}`;range.setAttribute('aria-label',`${binding.label} base slider`);label.htmlFor=range.id;
      range.addEventListener('change',guard(()=>setBase(instanceId,binding.key,Number(range.value))));range.addEventListener('input',()=>{number.value=range.value;});
      output.setAttribute('aria-label',`${binding.label} effective ownership`);base.append(number,unit);section.append(label,range,base,output);$('parameters').append(section);parameterViews.set(binding.key,{section,number,range,output});
    }
  }
  function setBase(instanceId,key,value){return enqueue(async()=>{await command('alive_base',{instanceId,key,value});await refresh();});}
  const piano=$('piano-roll'),velocity=$('note-velocity');
  function context(){return {trackId:model.document().tracks[selected].id,clipId:selectedClip()?.id??null,noteId:typeof selectedNote==='string'?selectedNote:null,scope:scopeRevision,generation:generation(),revision:model.snapshot()?.draftRevision??0};}
  function paintSelection(){paintPiano(piano,preview??editorDocument().tracks[selected].notes,editorDocument().lengthBeats,true);render();}
  piano.addEventListener('pointerdown',guard(event=>{
    if(event.button!==0||gesture)return;
    const hit=event.target.closest?.('[data-note]')??(event.target.getAttribute?.('data-note')!==null?event.target:null);
    const index=hit?.getAttribute?.('data-note')??hit?.attrs?.['data-note'];
    selectedNote=index!==undefined&&index!==null?noteIdentity(editorDocument().tracks[selected].notes[Number(index)],Number(index)):null;piano.focus();
    if(selectedNote!==null){const g=pianoGeometry,rect=piano.getBoundingClientRect(),start=point(event,rect,g);gesture={...context(),geometry:g,rect,start,index:selectedNoteIndex(editorDocument().tracks[selected].notes),kind:(hit?.getAttribute?.('data-part')??hit?.attrs?.['data-part'])==='resize'?'resize':'move',notes:structuredClone(editorDocument().tracks[selected].notes),pointerId:event.pointerId};piano.setPointerCapture?.(event.pointerId);event.preventDefault();}
    if(selectedNote!==null)paintSelection();
    else {for(const child of piano.children)if(child.getAttribute?.('data-part')==='body')child.setAttribute('stroke','none');render();}
  }));
  piano.addEventListener('pointermove',guard(event=>{
    if(!gesture||gesture.pointerId!==event.pointerId)return;const g=gesture,p=point(event,g.rect,g.geometry);
    preview=structuredClone(g.notes);preview[g.index]=transformNote(g.notes[g.index],g.kind,beatAt(p,g.geometry)-beatAt(g.start,g.geometry),(g.start.y-p.y)/g.geometry.pitchHeight);paintSelection();
  }));
  piano.addEventListener('pointerup',guard(event=>{
    if(!gesture||gesture.pointerId!==event.pointerId)return;const g=gesture,notes=preview;gesture=null;preview=null;
    if(piano.hasPointerCapture?.(event.pointerId))piano.releasePointerCapture(event.pointerId);
    if(notes&&JSON.stringify(notes)!==JSON.stringify(g.notes))return edit(document=>{trackById(document,g.trackId).notes=notes;},true,g.kind==='resize'?'Resize note':'Move note',g);
    paintSelection();
  }));
  piano.addEventListener('pointercancel',cancelGesture);piano.addEventListener('lostpointercapture',()=>{if(gesture)cancelGesture();});
  piano.addEventListener('dblclick',guard(event=>{
    if(event.target.closest?.('[data-note]'))return;
    cancelGesture();const p=point(event,piano.getBoundingClientRect(),pianoGeometry);
    if(p.x<pianoGeometry.pad||p.y<pianoGeometry.top)return;
    const trackId=model.document().tracks[selected].id,note=addNote(beatAt(p,pianoGeometry),pitchAt(p,pianoGeometry),editorDocument().lengthBeats);if(!note)throw Error('The new note must fit within the clip.');
    if(selectedClip())return clipEdit({kind:'noteCreate',trackId,clipId:selectedClip().id,...note});
    return edit(document=>{const notes=trackById(document,trackId).notes;notes.push(note);if(model.document().tracks[selected].id===trackId)selectedNote=notes.length-1;},true,'Add note');
  }));
  piano.addEventListener('keydown',guard(event=>{
    if(event.key==='Escape'){event.preventDefault();cancelGesture();return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();return history(event.shiftKey?'redo':'undo');}
    if(selectedNote===null)return;
    const trackId=model.document().tracks[selected].id,notes=editorDocument().tracks[selected].notes,index=selectedNoteIndex(notes),note=notes[index],id=note?.id;
    if(['Delete','Backspace'].includes(event.key)){event.preventDefault();cancelGesture();selectedNote=null;return edit(document=>trackById(document,trackId).notes.splice(noteAt(trackById(document,trackId),id,index),1),true,'Delete note',null,!note.id);}
    const changed=keyEdit(note,event.key,event.shiftKey);if(changed){event.preventDefault();cancelGesture();return edit(document=>{const notes=trackById(document,trackId).notes;const at=noteAt({notes},id,index);notes[at]=keyEdit(notes[at],event.key,event.shiftKey);},true,event.shiftKey?'Resize note':'Move note',null,true);}
  }));
  velocity.addEventListener('pointerdown',event=>{velocityCanceled=false;velocity.setPointerCapture?.(event.pointerId);if(selectedNote!==null){gesture={...context(),kind:'velocity',index:selectedNoteIndex(editorDocument().tracks[selected].notes),notes:structuredClone(editorDocument().tracks[selected].notes)};}});
  velocity.addEventListener('input',()=>{if(velocityCanceled){render();return;}if(selectedNote===null)return;preview=structuredClone(gesture?.notes??editorDocument().tracks[selected].notes);preview[selectedNoteIndex(preview)].velocity=Number(velocity.value);paintSelection();});
  velocity.addEventListener('change',guard(()=>{if(velocityCanceled){render();return;}if(selectedNote===null)return;const g=gesture,trackId=g?.trackId??model.document().tracks[selected].id,index=selectedNoteIndex(editorDocument().tracks[selected].notes),id=editorDocument().tracks[selected].notes[index]?.id,value=Number(velocity.value);gesture=null;preview=null;return edit(document=>{trackById(document,trackId).notes[noteAt(trackById(document,trackId),id,index)].velocity=value;},true,'Change velocity',g,true);}));
  velocity.addEventListener('pointercancel',cancelGesture);velocity.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();cancelGesture();}else velocityCanceled=false;});
  const diagnosticNames=['Audio backend','Audio device','Audio sample rate','Audio buffer frames','Audio callbacks','Audio stream errors','Audio failed','Audio status','Transport playing','Absolute frame','Rejected commands','Native generation',...Array.from({length:8},(_,index)=>`Track ${index+1} active voices`)];
  for(const name of diagnosticNames){const label=make('label','',name),output=make('output','','-');output.setAttribute('aria-label',name);label.append(output);$('diagnostics').append(label);diagnostics.set(name,output);}
  function render(){
    const snapshot=model.snapshot(),document=editorDocument();if(!snapshot||!document)return;
    renderTransportRequest(snapshot);
    selected=Math.min(selected,document.tracks.length-1);
    if(!chainDevices().some(d=>d.instanceId===selectedInstance))selectedInstance=document.tracks[selected].device.instanceId;
    $('session-title').textContent=document.title;$('dirty').textContent=snapshot.dirty||model.pending()?'Modified':'';doc.title=`${snapshot.dirty||model.pending()?'* ':''}${document.title} - Alive`;
    for(const[id,value]of [['tempo',document.tempo],['length',model.document().lengthBeats]])if(doc.activeElement!==$(id))$(id).value=value;
    $('undo').disabled=!snapshot.history?.canUndo;$('redo').disabled=!snapshot.history?.canRedo;
    $('undo').title=snapshot.history?.undoLabel??'No pending edit to undo';$('redo').title=snapshot.history?.redoLabel??'No pending edit to redo';
    const notes=document.tracks[selected].notes,chosenIndex=selectedNoteIndex(notes),selectedValue=notes[chosenIndex];if(!selectedValue)selectedNote=null;$('note-velocity').disabled=!selectedValue;$('note-velocity').value=preview?.[chosenIndex]?.velocity??selectedValue?.velocity??100;$('velocity-value').textContent=selectedValue?String($('note-velocity').value):'Select a note';
    $('loop').checked=document.loopEnabled;$('apply').disabled=!model.pending();$('discard').disabled=!model.pending()&&!snapshot.history?.canUndo&&!snapshot.history?.canRedo;$('draft-status').textContent=model.pending()?'Pending schedule edits':'Prepared schedule';
    const deviceCount=document.tracks.reduce((count,track)=>count+1+track.effects.length,0),maxTracks=snapshot.capabilities?.maxTracks??2,maxDevices=snapshot.capabilities?.maxDevices??6;
    $('start').disabled=!!snapshot.state.playing;$('stop').disabled=false;$('add-track').disabled=document.tracks.length>=maxTracks||deviceCount>=maxDevices||!!snapshot.state.playing||model.pending();
    const nextTracks=JSON.stringify([snapshot.generation,document.tracks.map(t=>[t.id,t.name,t.slots?.map(c=>c?[c.id,c.name]:null),t.defaultClipId])]);if(nextTracks!==trackKey){trackKey=nextTracks;buildTracks(document);}
    const nextChain=JSON.stringify([snapshot.generation,selected,chainDevices().map(d=>[d.instanceId,d.path])]);if(nextChain!==chainKey){chainKey=nextChain;buildChain();}
    const structuralBlocked=!!snapshot.state.playing||model.pending();
    $('chain-status').textContent=model.pending()?'Apply or discard pending schedule edits before changing the chain.':snapshot.state.playing?'Stop transport to add, remove, replace or reorder devices. Bypass and base values work live.':'Add, remove, replace and reorder prepare the chain while stopped. Shared changed sources require restoration before selected Replace. Bypass keeps state warm.';
    $('add-effect').disabled=structuralBlocked||document.tracks[selected].effects.length>=2||deviceCount>=maxDevices;
    for(const view of chainViews){view.choose.setAttribute('aria-pressed',String(view.reference.instanceId===selectedInstance));view.row.classList.toggle('selected',view.reference.instanceId===selectedInstance);view.bypass.setAttribute('aria-pressed',String(chainDevices().find(d=>d.instanceId===view.reference.instanceId).bypassed));for(const {button,blocked} of view.actions){button.disabled=structuralBlocked||blocked;button.title=blocked?'Already at this end of the effect chain.':$('chain-status').textContent;}}
    const nextMusic=JSON.stringify([snapshot.generation,selected,selectedClip()?.id,document.tempo,document.lengthBeats,document.loopEnabled,document.tracks[selected]?.notes,document.tracks[selected]?.automation]);
    if(nextMusic!==musicKey){musicKey=nextMusic;buildMusic(document);}
    paintLanes();
    const nextParameters=JSON.stringify([snapshot.generation,selected,selectedInstance]);if(nextParameters!==parameterKey){parameterKey=nextParameters;buildParameters(snapshot);}
    document.tracks.forEach((track,index)=>{
      const view=trackViews[index],runtime=snapshot.state.tracks[index];view.row.classList.toggle('selected',selected===index);view.row.setAttribute('aria-label',`${track.name} track`);view.detail.textContent=`${track.notes.length} notes / stereo`;
      if(doc.activeElement!==view.gain&&!workspace.preserves(view.gain))view.gain.value=track.gain;view.mute.setAttribute('aria-pressed',String(track.mute));view.solo.setAttribute('aria-pressed',String(track.solo));
      const key=JSON.stringify([track.notes,document.lengthBeats]);if(view.paintKey!==key){view.paintKey=key;paintPiano(view.svg,track.notes,document.lengthBeats);}
      meter(view.bar,runtime.peakLeft,runtime.peakRight);view.readout.textContent=peak(runtime.peakLeft,runtime.peakRight);
      for(const button of [...view.actions.children].slice(1)){button.disabled=!!snapshot.state.playing||model.pending();button.title=model.pending()?'Apply or discard pending schedule edits before changing devices.':snapshot.state.playing?'Stop transport before replacing a device or removing a track.':button.textContent==='Remove track'?'Remove this whole track, its instrument, effects and automation. Keep at least one track.':'Replace this instrument from a saved Ultra source; its automation lanes are removed.';}
    });
    for(const[bindingIndex,binding]of (instanceView(selectedInstance).manifest.parameters??[]).entries()){
      const view=parameterViews.get(binding.key),reading=parameterReading(binding,snapshot.state.devices[instanceView(selectedInstance).index],bindingIndex);if(!view)continue;
      if(doc.activeElement!==view.number)view.number.value=reading.base;if(doc.activeElement!==view.range)view.range.value=reading.base;
      view.output.textContent=`${reading.owner}: ${Number(reading.effective.toFixed(3))}${binding.unit?' '+binding.unit:''}`;view.section.classList.toggle('automated',reading.owner==='Automation');
    }
    const frameBeat=value=>typeof value==='string'?Number(nativeInteger(value)*1000000n/48000n)/1000000*snapshot.document.tempo/60:value/(48000*60/snapshot.document.tempo);const beat=frameBeat(snapshot.state.position);$('position').textContent=`${beat.toFixed(3)} beats`;
    for(const svg of [...trackViews.map(v=>v.svg),$('piano-roll')]){const line=svg.querySelector('.playhead');if(line){const detailed=svg===$('piano-roll'),pad=detailed?32:0,x=pad+(snapshot.runtime?frameBeat(snapshot.runtime.tracks.find(t=>t.trackId===document.tracks[detailed?selected:trackViews.findIndex(v=>v.svg===svg)]?.id)?.phase??'0'):beat)/(detailed?document.lengthBeats:document.tracks[trackViews.findIndex(v=>v.svg===svg)]?.clipLength??document.lengthBeats)*(640-pad);line.setAttribute('x1',x);line.setAttribute('x2',x);}}
    meter($('master-meter'),snapshot.state.peakLeft,snapshot.state.peakRight);$('master-peak').textContent=peak(snapshot.state.peakLeft,snapshot.state.peakRight);
    const a=snapshot.audio,s=snapshot.state,values=[a.host||a.config.host,a.device||a.config.device,a.config.sample_rate,a.observed_buffer_frames,a.callbacks,a.stream_errors,String(a.failed),a.message,String(!!s.playing),s.absoluteFrame,s.rejected,s.generation,...Array.from({length:8},(_,index)=>s.tracks[index]?.activeVoices??0)];
    diagnosticNames.forEach((name,index)=>{diagnostics.get(name).textContent=String(values[index]);});
    renderClipControls();audioSettings?.update();
  }
  const audioController={
    getState:()=>{const audio=model.snapshot()?.audio;return {status:{running:!!audio?.running,output:audio},faulted:!!audio?.failed,busy:false};},
    poll:()=>enqueue(refresh),
    startAudio:()=>enqueue(async()=>{await command('alive_audio',{action:'start'});await refresh();}),
    stopAudio:()=>enqueue(async()=>{await command('alive_audio',{action:'stop'});await refresh();}),
  };
  audioSettings=mountAudioSettings({document:{querySelector:selector=>$(selector.slice(1)),createElement:tag=>doc.createElement(tag)},controller:audioController,
    invoke:invoke?(name,args={})=>enqueue(()=>command(name==='audio_devices'?'alive_audio_devices':'alive_audio_configure',args)):null});
  function closeAudioSettings(){$('alive-audio-settings').hidden=true;$('show-audio').setAttribute('aria-expanded','false');$('show-audio').focus();}
  bind('show-audio','Alive audio settings',()=>{const panel=$('alive-audio-settings');if(!panel.hidden){closeAudioSettings();return;}panel.hidden=false;$('show-audio').setAttribute('aria-expanded','true');$('audio-settings-close').focus();return audioSettings.open();});
  bind('audio-settings-close','Close audio settings',closeAudioSettings);
  for(const[id,action,label]of [['new','new','New session'],['open','open','Open session'],['save','save','Save session'],['save-as','saveAs','Save session as'],['quit','quit','Quit Alive']])bind(id,label,()=>file(action));
  bind('start','Start transport',()=>transport('start'));bind('stop','Stop transport',()=>transport('stop'));bind('seek-go','Seek transport',()=>transport('seek'));
  for(const[id,key,label]of [['tempo','tempo','Change tempo'],['length','lengthBeats','Change length']])$(id).addEventListener('change',guard(()=>{const value=Number($(id).value);if($(id).value===''||!Number.isFinite(value))throw Error('Enter a valid number.');return edit(doc=>{doc[key]=value;},false,label);}));$('loop').addEventListener('change',guard(()=>{const value=$('loop').checked;return edit(doc=>{doc.loopEnabled=value;},false,'Change looping');}));
  bind('apply','Prepare / Apply',()=>{commitFocused();cancelGesture();return enqueue(async()=>{try{applySnapshot(await command('alive_apply'));}finally{await refresh();}selectedNote=null;trackKey=musicKey=parameterKey='';render();notice('Schedule prepared and applied. Start transport when ready.');});});
  bind('discard','Discard edits',()=>{cancelGesture();return enqueue(async()=>{applySnapshot(await command('alive_discard'));selectedNote=null;musicKey='';render();notice('Pending schedule edits discarded.');});});
  function history(direction){cancelGesture();return enqueue(async()=>{try{applySnapshot(await command('alive_history',{direction}));}finally{await refresh();}selectedNote=null;musicKey='';render();});}
  bind('undo','Undo pending edit',()=>history('undo'));bind('redo','Redo pending edit',()=>history('redo'));
  bind('add-note','Add note',()=>{const trackId=model.document().tracks[selected].id;if(model.document().format==='alive-session-v3'){const c=selectedClip();if(!c)throw Error('Create a clip first.');let note=null;for(let beat=0;beat+.25<=c.lengthBeats&&!note;beat+=.25)for(let pitch=60;pitch<=127;pitch++)if(!c.notes.some(n=>n.pitch===pitch&&n.beat<beat+.25&&n.beat+n.duration>beat)){note={beat,pitch,duration:.25,velocity:100};break;}if(!note)throw Error('No room for a note.');return clipEdit({kind:'noteCreate',trackId,clipId:c.id,...note});}return edit(document=>{const notes=trackById(document,trackId).notes;let note=null;for(let beat=0;beat+.25<=document.lengthBeats&&!note;beat+=.25)for(let pitch=60;pitch<=127;pitch++)if(!notes.some(n=>n.pitch===pitch&&n.beat<beat+.25&&n.beat+n.duration>beat)){note={beat,pitch,duration:.25,velocity:100};break;}if(!note)throw Error('No room for a note. Move or delete an existing note.');notes.push(note);if(model.document().tracks[selected].id===trackId)selectedNote=notes.length-1;},true,'Add note');});
  bind('add-effect','Add effect',()=>structural(null,'add'));
  bind('edit-device','Edit selected device in Ultra',()=>{const instanceId=selectedInstance;return enqueue(()=>command('alive_editor',{instanceId}));});
  bind('add-lane','Add automation lane',()=>{const trackId=model.document().tracks[selected].id,[instanceId,key]=JSON.parse($('automation-target').value);return edit(document=>{const track=trackById(document,trackId);if(!track.automation.some(l=>l.instanceId===instanceId&&l.key===key))track.automation.push({instanceId,key,enabled:false,points:[]});});});
  bind('add-track','Add instrument track',()=>{cancelGesture();return enqueue(async()=>{const snapshot=await command('alive_device',{trackId:`track-${Date.now()}`,action:'load'});applySnapshot(snapshot);trackKey=musicKey=parameterKey='';render();});});
  const keydown=guard(event=>{if(event.defaultPrevented)return;if(event.key==='Escape'&&!$('alive-audio-settings').hidden){event.preventDefault();closeAudioSettings();return;}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();return file(event.shiftKey?'saveAs':'save');}if(event.code==='Space'&&!event.target.matches('input,select,button,summary')){event.preventDefault();return transport(model.snapshot()?.state.playing?'stop':'start');}});doc.addEventListener('keydown',keydown);
  let unlisten=null;
  if(win?.__TAURI__?.event?.listen)win.__TAURI__.event.listen('alive-close-requested',()=>{guard(()=>file('quit'))();}).then(fn=>{unlisten=fn;});
  win?.addEventListener('blur',cancelGesture);
  async function poll(){if(disposed)return;try{await enqueue(refresh);}catch{}if(!disposed)win.setTimeout(poll,80);}
  async function pollMeasurements(){
    if(disposed)return;
    if($('audio-details').open&&$('stream-measurements').open){
      try{const result=await invoke('alive_audio_diagnostics',{after:'0'});if(!disposed)$('stream-diagnostics').value=JSON.stringify(result);}
      catch(error){if(!disposed)$('stream-diagnostics').value=JSON.stringify({error:String(error)});}
    }
    if(!disposed)win.setTimeout(pollMeasurements,1000);
  }
  if(invoke)win.setTimeout(pollMeasurements,1000);
  if(invoke){enqueue(refresh).then(()=>notice('Ready. Select a clip to edit notes or automation.')).catch(()=>{});win.setTimeout(poll,80);}else notice('Open the native app with bash apps/alive/run.sh. This page does not synthesize audio.',true);
  return{model,refresh,dispose(){disposed=true;workspace.dispose();win?.removeEventListener('blur',cancelGesture);unlisten?.();doc.removeEventListener('keydown',keydown);}};
}
if(globalThis.document)mountAlive();
