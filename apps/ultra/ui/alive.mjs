import {point,beatAt,beatX,pitchAt,transformNote,velocityEdit,addNote,keyEdit} from './alive-piano.mjs';
import {mountPianoView} from './alive-piano-view.mjs';
import {mountBrowser} from './alive-browser.mjs';
import {mountTransportOptions} from './alive-shell.mjs';
import {createAliveModel,parameterReading,nativeInteger,instrumentOf,actualDevices} from './alive-model.mjs';
import {mountAudioSettings} from './audio-settings.mjs';
import {mountWorkspace} from './alive-workspace.mjs';
import {workspaceMusicEdit} from './alive-workspace-edits.mjs';
import {mountTimeline,placementError} from './alive-timeline.mjs';
import {createMasterProducer,nativeInteger as masterInteger} from './alive-master.mjs';

export function mountAlive({doc=globalThis.document,win=globalThis.window,invoke=win?.__TAURI__?.core?.invoke}={}){
  const $=id=>doc.getElementById(id),make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const model=createAliveModel();let selected=0,selectedInstance=null,chainKey='',queue=Promise.resolve(),disposed=false,trackKey='',musicKey='',parameterKey='',laneKey='';
  let timeline,pianoView,sourceSelection=null,activeEditSource=null;
  const workspace=mountWorkspace({doc,win,onNavigate:()=>{timeline?.cancel();timeline?.render();}});
  const transportOptions=mountTransportOptions(doc,{onClose:workspace.park,onOpen:workspace.restore});
  let selectedSlots=new Map(),selectionToken=0,activeEditClip=null,selectedNote=null,gesture=null,preview=null,pianoGeometry=null,velocityCanceled=false,listRevision=0,scopeRevision=0,transportRequestKey='';
  const trackViews=[],chainViews=[],parameterViews=new Map(),diagnostics=new Map();let audioSettings;
  let operationText=$('notice').textContent,operationError=false,noticeOwner=null,refreshError='';
  function renderNotice(){$('notice').textContent=[operationText,refreshError&&`Refresh delayed: ${refreshError}`].filter(Boolean).join(' ');$('notice').classList.toggle('error',operationError||!!refreshError);}
  function notice(text,error=false,owner=null){operationText=String(text);operationError=error;noticeOwner=owner;renderNotice();}
  function enqueue(work,background=false){const result=queue.then(work);queue=result.catch(error=>{if(!background)notice(error,true);});return result;}
  function generation(){return model.snapshot()?.generation;}
  function command(name,args={}){return invoke(name,{...args,generation:generation(),...(['alive_transport','alive_clip_action','alive_workspace_action'].includes(name)?{preparationRevision:model.snapshot()?.preparationRevision}:{}),...(['alive_edit','alive_clip_edit','alive_enable_clips','alive_enable_workspaces','alive_workspace_edit','alive_workspace_track','alive_history','alive_apply','alive_discard','alive_file','alive_device'].includes(name)?{draftRevision:model.snapshot()?.draftRevision??0}:{})});}
  function commitFocused(){if(doc.activeElement?.matches('input'))doc.activeElement.blur();}
  const guard=work=>(...args)=>{try{Promise.resolve(work(...args)).catch(error=>notice(error,true));}catch(error){notice(error,true);}};
  const browser=mountBrowser({doc,root:$('browser-library'),onNavigate:workspace.preserveFocused,onLoad:loadBrowserEntry,onSource:openBrowserSource,onCatalog:()=>invoke?invoke('alive_browser_catalog'):Promise.reject('Open the native Alive app to browse bundled devices')});
  const bind=(id,label,fn)=>{$(id).setAttribute('aria-label',label);$(id).addEventListener('click',guard(fn));};
  function numeric(label,value,{min,max,step='any'}={},change){
    const input=make('input');input.type='number';input.value=String(value);input.setAttribute('aria-label',label);
    if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);input.step=String(step);
    input.addEventListener('change',guard(()=>{if(input.value===''||!Number.isFinite(Number(input.value)))throw Error(`${label} requires a number.`);return change(Number(input.value));}));return input;
  }
  function svgElement(tag,attrs={}){const e=doc.createElementNS('http://www.w3.org/2000/svg',tag);for(const[key,value]of Object.entries(attrs))e.setAttribute(key,String(value));return e;}
  function icon(kind){
    const paths={play:'M5 3 14 9 5 15Z',stop:'M4 4H14V14H4Z',browser:'M2 3H16V15H2ZM6 3V15M9 6H13M9 9H13',session:'M3 3H7V15H3ZM11 3H15V15H11Z',arrangement:'M3 4H15V7H3ZM3 11H11V14H3Z',clip:'M3 4H15V14H3ZM6 7H9M10 11H13',devices:'M2 5H7V13H2ZM11 5H16V13H11ZM7 9H11',detail:'M3 5 9 11 15 5M3 15H15',instrument:'M2 4H16V14H2ZM5 4V10M8 4V10M11 4V10M14 4V10',effect:'M3 5H15M3 13H15M6 2V8M12 10V16',file:'M4 2H11L15 6V16H4ZM10 2V7H15',save:'M3 2H13L16 5V16H3ZM6 2V7H12M6 11H13V16',edit:'M3 12 11 4 14 7 6 15H3ZM11 4 13 2 16 5 14 7',duplicate:'M6 6H15V15H6ZM3 11V3H11',remove:'M4 5H14M7 5V2H11V5M5 5 6 16H12L13 5',reset:'M14 7A5 5 0 1 0 14 11M14 3V7H10',undo:'M7 3 3 7 7 11M3 7H11Q16 7 15 14',redo:'M11 3 15 7 11 11M15 7H7Q2 7 3 14'};
    const svg=svgElement('svg',{viewBox:'0 0 18 18','aria-hidden':'true',focusable:'false'});svg.append(svgElement('path',{d:paths[kind]??paths.file}));return svg;
  }
  function decorate(button,kind,label,{only=false}={}){button.replaceChildren(icon(kind),make('span',only?'sr-only':'',label));button.title=button.getAttribute('aria-label')??label;}
  for(const[id,kind]of Object.entries({'toggle-browser':'browser','view-session':'session','view-arrangement':'arrangement','detail-clip':'clip','detail-devices':'devices','toggle-detail':'detail','add-track':'instrument','add-effect':'effect','new':'file','open':'file','save':'save','save-as':'save','edit-device':'edit','undo':'undo','redo':'redo'}))decorate($(id),kind,$(id).textContent);
  for(const[id,kind]of [['start','play'],['stop','stop']])decorate($(id),kind,id==='start'?'Start':'Stop',{only:true});
  function meter(element,left,right){const bars=element.children,axis=element.classList.contains('vertical-meter')?'height':'width';bars[0].style[axis]=`${Math.min(1,left)*100}%`;bars[1].style[axis]=`${Math.min(1,right)*100}%`;}
  function peak(left,right){return`${left.toFixed(3)} / ${right.toFixed(3)}`;}
  let masterIntent=null,masterReceipt=null,masterStatus='',masterError=false,masterGeneration=null,masterPendingReset=false;
  const masterProducer=createMasterProducer({invoke:(name,args)=>invoke(name,args),onStatus:status=>{
    masterStatus=status.message;masterError=!!status.error;notice(status.message,masterError,'master');
    if(status.pending&&status.kind==='gain')masterIntent={ordinal:status.ordinal,value:status.value};if(status.pending&&status.kind==='reset')masterPendingReset=true;
    if(status.receipt){if(status.kind==='reset')masterPendingReset=false;if(status.kind==='gain')masterReceipt=status.receipt;if(status.kind==='gain'&&masterIntent?.ordinal===status.ordinal)masterIntent=null;}
    if(status.error&&status.kind==='reset')masterPendingReset=false;if(status.error&&status.kind==='gain'&&masterIntent?.ordinal===status.ordinal)masterIntent={...masterIntent,refused:true};
    renderMaster();
  }});
  function makeMaster(container){
    const root=make('div','master-controls'),gain=make('input','master-fader'),number=make('input','master-number'),readout=make('output','master-db'),bars=make('div','master-bars'),left=make('i'),right=make('i'),leftText=make('output'),rightText=make('output'),state=make('output','master-state'),unity=make('button','','Unity'),reset=make('button','','Overload');
    gain.type='range';gain.min='0';gain.max='4';gain.step='.01';gain.setAttribute('aria-label','Master gain fader');gain.setAttribute('aria-orientation','vertical');
    number.type='number';number.min='0';number.max='4';number.step='.01';number.setAttribute('aria-label','Master gain');
    leftText.setAttribute('aria-label','Master left peak');rightText.setAttribute('aria-label','Master right peak');readout.setAttribute('aria-label','Master gain decibels');state.setAttribute('aria-label','Master output status');unity.setAttribute('aria-label','Reset Master gain to unity');reset.setAttribute('aria-label','Reset Master digital overload');decorate(unity,'reset','Unity');decorate(reset,'reset','Overload');
    bars.setAttribute('aria-label','Master stereo peak');bars.append(left,right);const meterArea=make('div','master-meter-area');meterArea.append(bars,leftText,rightText);const marks=make('div','master-marks');marks.append(make('span','','+12'),make('span','','0'),make('span','','-inf'));const faderArea=make('div','master-fader-area');faderArea.append(gain,marks,meterArea);const actions=make('div','master-actions');actions.append(unity,reset);const top=make('div','master-gain-top');top.append(number,readout);root.append(top,faderArea,actions,state);container.append(root);
    gain.addEventListener('input',()=>masterProducer.gain(Number(gain.value)));gain.addEventListener('dblclick',()=>masterProducer.gain(1));
    number.addEventListener('change',()=>{const value=Number(number.value);if(number.value===''||!Number.isFinite(value)||value<0||value>4){masterStatus='Master gain must be between 0 and 4.';masterError=true;notice(masterStatus,true,'master');renderMaster();return;}masterProducer.gain(value);});
    unity.addEventListener('click',()=>masterProducer.gain(1));reset.addEventListener('click',()=>masterProducer.reset());
    return{gain,number,readout,left,right,leftText,rightText,state,unity,reset};
  }
  const masterViews=[makeMaster($('master-session')),makeMaster($('master-arrangement'))];
  function db(value){return value===0?'-inf':`${(20*Math.log10(value)).toFixed(1)} dB`;}
  function renderMaster(){
    if(!masterViews)return;const m=model.snapshot()?.master,available=!!m?.available,observation=m?.observation;
    if(m&&masterReceipt&&masterInteger(m.acceptedSerial)>=masterInteger(masterReceipt.acceptedSerial))masterReceipt=null;
    const display=masterIntent?.value??masterReceipt?.acceptedGain??m?.gain;
    const applied=observation&&m&&!m.observationStale&&masterInteger(observation.appliedSerial)>=masterInteger(m.acceptedSerial);
    const description=!m?'Master unavailable.':!available?`Master unavailable: ${m.unavailableReason??'native capability unavailable'}`:[`Saved target ${db(m.gain)}`,masterReceipt?`admitted ${db(masterReceipt.acceptedGain)} awaiting snapshot`:null,!observation?'observation unavailable':`${m.observationStale?'stale observation: ':''}${applied?'applied':'current'} ${db(observation.currentGain)}${!m.observationStale&&!applied?' (awaiting application)':''}${observation.observationStartFrame===observation.observationEndFrame?' (empty interval)':''}`,observation?.clipMask?`digital overload ${observation.clipMask===3?'L/R':observation.clipMask===1?'L':'R'}`:null,masterIntent?`${masterIntent.refused?'refused':'pending'} intent ${db(masterIntent.value)}`:null].filter(Boolean).join('; ')+'.';
    for(const v of masterViews){
      for(const input of [v.gain,v.number,v.unity,v.reset])input.disabled=!available;
      if(display!==undefined&&doc.activeElement!==v.number&&!workspace.preserves(v.number))v.number.value=String(display);
      if(display!==undefined&&doc.activeElement!==v.gain)v.gain.value=String(display);
      v.readout.textContent=display===undefined?'Unavailable':db(display);v.gain.setAttribute('aria-valuetext',display===undefined?'Unavailable':db(display));
      v.left.style.height=observation?`${Math.min(1,observation.peakLeft)*100}%`:'0%';v.right.style.height=observation?`${Math.min(1,observation.peakRight)*100}%`:'0%';
      v.leftText.textContent=observation?`L ${observation.peakLeft.toFixed(3)}${observation.clipMask&1?' !':''}`:'L unavailable';v.rightText.textContent=observation?`R ${observation.peakRight.toFixed(3)}${observation.clipMask&2?' !':''}`:'R unavailable';
      v.state.textContent=[masterStatus,description].filter(Boolean).join(' ');v.state.title=v.state.textContent;v.state.classList.toggle('error',masterError);
    }
    $('master-detail-status').textContent=[description,masterStatus].filter(Boolean).join(' ');
  }
  for(const id of ['master-select-session','master-select-arrangement']){$(id).addEventListener('pointerdown',event=>event.preventDefault());$(id).addEventListener('click',()=>workspace.openMaster());}
  function cancelGesture(){
    if(!gesture&&!preview)return;
    const old=gesture;if(old?.kind==='velocity')velocityCanceled=true;gesture=null;preview=null;
    const target=old?.captureTarget??$('piano-roll');
    if(old?.pointerId!==undefined&&target.hasPointerCapture?.(old.pointerId))target.releasePointerCapture(old.pointerId);
    musicKey='';render();
  }
  function isWorkspace(document=model.document()){return document?.format==='alive-session-v4';}
  function sourceOf(track=model.document()?.tracks[selected],document=model.document()){return document?.sources?.find(s=>s.id===(sourceSelection?.trackId===track?.id?sourceSelection.sourceId:selectedClip(track)?.sourceId))??null;}
  function preparedSlots(snapshot=model.snapshot()){return isWorkspace(snapshot.document)?snapshot.preparedWorkspaces?.slots??[]:snapshot.preparedClips??[];}
  function slotIdentity(slot){return slot?.slotId??slot?.clipId;}
  function slotOf(track){return selectedSlots.get(track.id)??0;}
  function selectedClip(track=model.document()?.tracks[selected]){if(sourceSelection?.trackId===track?.id)return null;return track?.slots?.[slotOf(track)]??null;}
  function editorDocument(document=model.document()){
    if(isWorkspace(document)){const source=sourceOf(document.tracks[selected],document);return {...document,lengthBeats:source?.kind==='midi'?source.lengthBeats:document.lengthBeats,tracks:document.tracks.map(t=>{const source=sourceOf(t,document);return {...t,...(source?.kind==='midi'?{notes:source.notes}:{}),automation:source?.automation??[],sourceId:source?.id??null,sourceKind:source?.kind??t.chain.kind,clipId:selectedClip(t)?.id??null,clipLength:source?.kind==='midi'?source.lengthBeats:document.lengthBeats};})};}
    if(!document||document.format!=='alive-session-v3')return document;
    return {...document,lengthBeats:selectedClip(document.tracks[selected])?.lengthBeats??document.lengthBeats,tracks:document.tracks.map(t=>{const c=selectedClip(t);return {...t,notes:c?.notes??[],automation:c?.automation??[],clipId:c?.id??null,clipLength:c?.lengthBeats??document.lengthBeats};})};
  }
  function selectedNoteIndex(notes){return typeof selectedNote==='string'?notes.findIndex(n=>n.id===selectedNote):selectedNote;}
  function noteIdentity(note,index){return note.id??index;}
  function listShape(document){if(isWorkspace(document))return JSON.stringify([document.tracks.map(t=>[t.id,t.slots]),document.sources.map(s=>[s.id,s.kind,s.notes?.map(n=>n.id),s.automation.map(l=>[l.instanceId,l.key,l.points.length])])]);return JSON.stringify(document.tracks.map(t=>[t.id,t.slots?t.slots.map(c=>c?[c.id,c.notes.map(n=>n.id),c.automation.map(l=>[l.instanceId,l.key,l.points.length])]:null):[t.notes.length,t.automation.map(l=>[l.instanceId,l.key,l.points.length])]]));}
  function trackById(document,id){const track=document.tracks.find(track=>track.id===id);if(!track)throw Error('The originating track changed. Select it and try again.');if(!track.slots)return track;if(isWorkspace(document)){const slot=track.slots.find(s=>s?.id===activeEditClip),source=document.sources.find(s=>s.id===(activeEditSource??slot?.sourceId)&&s.trackId===id);if(!source||source.kind!=='midi')throw Error('The originating MIDI source changed.');return source;}const clip=track.slots.find(c=>c?.id===activeEditClip);if(!clip)throw Error('The originating clip changed. Select it and try again.');return clip;}
  function noteAt(track,id,index){const at=id?track.notes.findIndex(n=>n.id===id):index;if(at<0||!track.notes[at])throw Error('The originating note changed.');return at;}
  // Accepted boundaries invalidate queued intent; ordinary edits keep their queue's scope.
  function invalidateScope(before){
    const current=model.snapshot();
    if(before&&before.generation!==current.generation)workspace.resetPreserved();
    if(before&&(before.generation!==current.generation||before.draftRevision!==current.draftRevision)){
      scopeRevision++;listRevision++;selectedNote=null;cancelGesture();timeline?.cancel();
    }
  }
  function applySnapshot(snapshot){const before=model.snapshot();model.applied(snapshot);invalidateScope(before);}
  function edit(change,rebuild=true,label='Edit schedule',context=null,indexed=false){
    const epoch=listRevision,scope=context?.scope??scopeRevision,clipId=context?.clipId??selectedClip()?.id??null;
    const sourceId=context?.sourceId??(isWorkspace()?sourceOf()?.id:null),occurrence=context&&'occurrence' in context?context.occurrence:(sourceSelection?.occurrence?{...sourceSelection.occurrence}:null);
    return enqueue(async()=>{
      if(scope!==scopeRevision){musicKey='';render();throw Error('The score scope changed. Select it and try again.');}
      if(isWorkspace()&&(clipId?sourceId!==model.document().tracks.flatMap(t=>t.slots??[]).find(s=>s?.id===clipId)?.sourceId:occurrence?sourceId!==model.document().placements.find(p=>p.id===occurrence.placementId)?.sourceId:sourceId&&!model.document().sources.some(s=>s.id===sourceId))){musicKey='';render();throw Error('The originating source changed. Select it and try again.');}
      if(indexed&&epoch!==listRevision){musicKey='';render();throw Error('The note or automation list changed. Select it and try again.');}
      if(context?.revision!==undefined&&(generation()!==context.generation||(model.snapshot()?.draftRevision??0)!==context.revision))throw Error('The score changed during this gesture. Try again.');
      const previous=model.document(),document=structuredClone(previous);activeEditClip=clipId;activeEditSource=sourceId;try{change(document);}finally{activeEditClip=null;activeEditSource=null;}
      try{if(isWorkspace(previous)){const operation=workspaceMusicEdit(previous,document);if(operation){const result=await command('alive_workspace_edit',{operation});model.applied(result.snapshot);}}else model.applied(await command('alive_edit',{document,label}));if(listShape(previous)!==listShape(model.document()))listRevision++;}
      catch(error){selectedNote=null;musicKey='';await refresh();throw error;}
      preview=null;musicKey='';render();
    });
  }
  async function current(){
    try{const snapshot=await invoke('alive_current');refreshError='';renderNotice();return snapshot;}
    catch(error){refreshError=String(error);renderNotice();throw error;}
  }
  async function refresh(){
    const snapshot=await current();
    if(gesture&&(snapshot.generation!==gesture.generation||(snapshot.draftRevision??0)!==gesture.revision)){if(gesture.kind==='velocity')velocityCanceled=true;gesture=null;preview=null;selectedNote=null;musicKey='';}
    const before=model.snapshot();model.accept(snapshot);
    invalidateScope(before);
    render();return snapshot;
  }
  function file(action){
    const unfinished=workspace.uncommitted();
    if(unfinished)throw Error(`Finish ${unfinished.getAttribute('aria-label')??'the unfinished field'} before using file actions. Return to the field and press Tab to accept it.`);
    commitFocused();cancelGesture();return enqueue(async()=>{
    let result,failure,failed=false,snapshot;
    try{result=await command('alive_file',{action});}catch(error){failure=error;failed=true;}
    // Reconcile inner accepted boundaries even when the outer file action fails.
    try{snapshot=await current();}catch{}
    if(snapshot){applySnapshot(snapshot);if(result){trackKey=musicKey=parameterKey='';selectedNote=null;}render();}
    if(failed)throw failure;
    if(result)notice(action.startsWith('save')?(result.notice?.includes('Saved in Alive session v5 format')?result.notice:'Session saved.'):'Session ready.');
  });}
  function transport(action){
    const intent={generation:generation(),preparationRevision:model.snapshot()?.preparationRevision},v4=isWorkspace(),beat=Number($('seek').value);
    return enqueue(async()=>{
      let result;
      if(v4&&action!=='stop'){
        if(action==='start')await invoke('alive_audio',{action:'start',generation:intent.generation});
        try{result=await invoke('alive_workspace_action',{action:action==='start'?{kind:'start'}:{kind:'seek',beat},...intent});}
        catch(error){await refresh();throw Error(`${error}. Audio may remain running silently.`);}
      }else result=await invoke('alive_transport',{action,beat,...intent});
      await refresh();
      if(result?.requestSerial){const observed=observedRequest(result);notice(`Transport ${requestText(observed,model.snapshot())}${v4&&observed.status==='rejected'?' Audio may remain running silently.':''}`,observed.status==='rejected','transport');}
      else notice(action==='start'?(model.pending()?'Playing the prepared schedule. Pending edits remain unapplied.':'Transport playing.'):action==='stop'?'Transport stop requested.':'Transport seek queued.');
    });
  }
  function paintPiano(svg,notes,length,detailed=false){
    if(detailed){
      pianoGeometry=pianoView.render({notes,length,selectedNote,scope:JSON.stringify([generation(),selected,selectedClip()?.id,sourceOf()?.id]),frozenGeometry:gesture?.geometry});
      return;
    }
    const width=640,height=52,pad=0,top=3;
    const min=Math.min(48,...notes.map(n=>n.pitch)),max=Math.max(84,...notes.map(n=>n.pitch));
    const pitchHeight=(height-top-6)/(max-min+1),x=beat=>pad+beat/length*(width-pad),y=pitch=>top+(max-pitch)*pitchHeight;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.replaceChildren();
    const beatStep=Math.max(1,Math.ceil(length/32));
    for(let beat=0;beat<=length;beat+=beatStep)svg.append(svgElement('line',{x1:x(beat),x2:x(beat),y1:0,y2:height,stroke:beat%4===0?'#535353':'#3d3d3d','stroke-width':1}));
    notes.forEach(note=>{
      svg.append(svgElement('rect',{x:x(note.beat)+1,y:y(note.pitch),width:Math.max(2,x(note.duration)-2),height:Math.max(2,pitchHeight-1),rx:1,fill:'#c8ae74',stroke:'none'}));
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
      const result=isWorkspace()?await invoke('alive_workspace_action',{generation:intent.generation,preparationRevision:intent.preparationRevision,action:{kind:'scene',slot:intent.slot}}):await invoke('alive_launch_scene',intent);await refresh();
      if(result){const observed=observedRequest(result);notice(sceneText(observed,model.snapshot()),observed.status==='rejected');}
    });
  }
  function renderScenes(snapshot){
    const enabled=snapshot.mode==='clipsV3'||snapshot.mode==='workspacesV4';$('scene-controls').hidden=$('scene-help').hidden=$('scene-history').hidden=!enabled;
    if(!enabled)return;
    if(!sceneViews.length)for(let slot=0;slot<4;slot++){
      const row=make('div','scene-row'),launch=make('button','scene-launch'),prepared=make('small','muted'),result=make('output','scene-result');
      decorate(launch,'play',String(slot+1));
      launch.setAttribute('aria-label',`Launch scene ${slot+1}`);launch.setAttribute('aria-describedby','scene-help');launch.addEventListener('click',guard(()=>launchScene(slot)));
      prepared.setAttribute('aria-label',`Prepared scene ${slot+1}`);result.setAttribute('aria-label',`Scene ${slot+1} request`);
      const receipt=make('details','scene-receipt'),summary=make('summary','',`Scene ${slot+1}`);summary.setAttribute('aria-label',`Scene ${slot+1} receipt details`);receipt.append(summary,prepared,result);$('scene-receipts').append(receipt);
      row.append(launch);$('scene-controls').append(row);sceneViews.push({slot,launch,prepared,result});
    }
    for(const v of sceneViews){
      v.launch.disabled=!snapshot.capabilities?.atomicTrackActions;
      v.launch.title=v.launch.disabled?'Atomic scenes are unavailable for this prepared profile':snapshot.audio.running?'Launch this prepared row':'Start Audio to launch a scene';
      v.prepared.textContent=snapshot.document.tracks.map(t=>`${t.name}: ${preparedSlots(snapshot).find(c=>c.trackId===t.id&&c.slot===v.slot)?.name??'Stop'}`).join(' / ');
      const request=snapshot.runtime?.requests.filter(r=>r.sceneSlot===v.slot).at(-1);
      v.result.textContent=request?sceneText(request,snapshot):'';
    }
  }
  function clipEdit(operation){
    if(isWorkspace())return workspaceClipEdit(operation);
    const scope=scopeRevision,token=selectionToken;
    return enqueue(async()=>{
      if(scope!==scopeRevision)throw Error('The score scope changed. Select it and try again.');
      let result;try{result=await command('alive_clip_edit',{operation});}catch(error){clipControlsKey='';await refresh();throw error;}model.applied(result.snapshot);listRevision++;
      if(token===selectionToken){const a=result.affected;if(['create','duplicate'].includes(operation.kind)){selectedSlots.set(a.trackId,a.slot);selectedNote=null;}if(operation.kind==='delete'&&slotOf(model.document().tracks[selected])===a.slot)selectedNote=null;if(operation.kind==='noteCreate')selectedNote=a.noteId;}
      musicKey=clipControlsKey=trackKey='';render();
    });
  }
  function requestText(result,snapshot){
    const clip=preparedSlots(snapshot).find(c=>slotIdentity(c)===(result.slotId??result.clipId))?.name;
    const reason=({7:'command queue full',8:'receipt table busy',12:'optional work limit',5:'stale preparation',9:'empty slot',15:'feature disabled'})[result.reason]??`native reason ${result.reason}`;
    const members=isWorkspace()?(result.members??[]).map(m=>`${snapshot.document.tracks.find(t=>t.id===m.trackId)?.name??m.trackId}: ${m.status}`).join(' / '):'';
    return `request ${result.requestSerial} ${result.status}${clip?` for ${clip}`:''}${members?` / ${members}`:''}${result.reason?` (${reason}); prior playback or pending action is retained. Let audio advance before an explicit retry.`:''}`;
  }
  function observedRequest(result){return model.snapshot().runtime?.requests.find(r=>r.preparationRevision===result.preparationRevision&&r.requestSerial===result.requestSerial)??result;}
  function renderTransportRequest(snapshot){
    const request=snapshot.runtime?.requests.filter(r=>snapshot.mode==='workspacesV4'?['start','seek'].includes(r.kind):r.trackId===null&&r.sceneSlot==null).at(-1);
    if(!request){transportRequestKey='';return;}
    const key=JSON.stringify(request);if(key===transportRequestKey)return;transportRequestKey=key;
    if(noticeOwner==='transport')notice(`Transport ${requestText(request,snapshot)}`,request.status==='rejected','transport');
  }
  function clipAction(action){
    const intent={generation:generation(),preparationRevision:model.snapshot().preparationRevision},v4=isWorkspace();
    if(v4&&action.kind==='launch')action={kind:'launch',trackId:action.trackId,slotId:action.clipId??action.slotId};
    return enqueue(async()=>{const result=await invoke(v4?'alive_workspace_action':'alive_clip_action',{action,...intent});await refresh();if(result){const observed=observedRequest(result);notice(requestText(observed,model.snapshot()),observed.status==='rejected');}});
  }
  function workspaceEdit(operation,selectResult=false){
    const scope=scopeRevision,token=selectionToken,origin=generation();
    const sourceTarget=typeof operation!=='function'&&['sourceRename','sourceLength','noteCreate'].includes(operation.kind)?{sourceId:operation.sourceId,trackId:model.document().tracks[selected].id,slotId:selectedClip()?.id,placementId:sourceSelection?.occurrence?.placementId}:null;
    return enqueue(async()=>{if(scope!==scopeRevision||origin!==generation())throw Error('The source scope changed. Select it and try again.');
      if(sourceTarget){const d=model.document(),actual=sourceTarget.placementId?d.placements.find(p=>p.id===sourceTarget.placementId&&p.trackId===sourceTarget.trackId)?.sourceId:sourceTarget.slotId?d.tracks.find(t=>t.id===sourceTarget.trackId)?.slots.find(s=>s?.id===sourceTarget.slotId)?.sourceId:d.sources.find(s=>s.id===sourceTarget.sourceId&&s.trackId===sourceTarget.trackId)?.id;if(actual!==sourceTarget.sourceId)throw Error('The originating source changed. Select it and try again.');}
      const resolved=typeof operation==='function'?operation():operation;const result=await command('alive_workspace_edit',{operation:resolved});if(!model.applied(result.snapshot))return result;listRevision++;
      if(token===selectionToken){const a=result.affected,track=model.document().tracks.find(t=>t.id===a.trackId);if(selectResult&&track&&a.sourceId&&(a.placementId||!sourceSelection||resolved.kind==='sourceCreateMidi'))sourceSelection={trackId:a.trackId,sourceId:a.sourceId,occurrence:a.placementId?{kind:'placement',placementId:a.placementId}:null};if(sourceSelection?.occurrence?.placementId){const p=model.document().placements.find(p=>p.id===sourceSelection.occurrence.placementId);sourceSelection={...sourceSelection,sourceId:p?.sourceId??sourceSelection.sourceId,occurrence:p?sourceSelection.occurrence:null};}if(a.slotId&&track){const slot=track.slots.findIndex(s=>s?.id===a.slotId);if(slot>=0)selectedSlots.set(a.trackId,slot);}selectedNote=a.noteId??null;}
      musicKey=clipControlsKey=trackKey='';render();return result;});
  }
  function workspaceSlotEdit(trackId,slotId,sourceId,changes){
    return workspaceEdit(()=>{
      const slot=model.document().tracks.find(t=>t.id===trackId)?.slots.find(s=>s?.id===slotId);
      if(!slot||slot.sourceId!==sourceId)throw Error('The originating slot or source changed. Select it and try again.');
      return{kind:'slotUpdate',trackId,slotId,name:slot.name,sourceOffset:slot.sourceOffset,loopEnabled:slot.loopEnabled,...changes};
    });
  }
  function chooseSource(value){
    workspace.returnMusic();const index=model.document().tracks.findIndex(t=>t.id===value.trackId);if(index<0)return;
    if(selected===index&&sourceSelection?.trackId===value.trackId&&sourceSelection?.sourceId===value.sourceId&&(sourceSelection?.occurrence?.placementId??null)===(value.occurrence?.placementId??null)){render();return;}
    cancelGesture();if(selected!==index)selectedInstance=null;selected=index;sourceSelection=value;selectionToken++;selectedNote=null;musicKey=clipControlsKey='';if(value.occurrence)workspace.openClip();render();
  }
  function placementEdit(trackId,placementId,sourceId,changes){return workspaceEdit(()=>{
    const document=model.document(),p=document.placements.find(p=>p.id===placementId&&p.trackId===trackId);
    if(!p||p.sourceId!==sourceId)throw Error('The originating placement or source changed. Select it and try again.');
    const next={...p,...changes},error=placementError(next,document.sources.find(s=>s.id===sourceId),document.placements,document.lengthBeats);if(error)throw Error(error);
    return{kind:'placementUpdate',placementId,start:next.start,duration:next.duration,sourceOffset:next.sourceOffset,loopEnabled:next.loopEnabled};
  });}
  function transportRange(changes){return workspaceEdit(()=>{const d=model.document();return{kind:'transportRange',tempo:d.tempo,lengthBeats:d.lengthBeats,loopEnabled:d.loopEnabled,loopStartBeats:d.loopStartBeats,loopEndBeats:d.loopEndBeats,...changes};});}
  timeline=mountTimeline({doc,win,guard,notice,choose:chooseSource,edit:operation=>workspaceEdit(operation,true),placementEdit,transportRange,action:clipAction,preserves:element=>workspace.preserves(element),mix:(trackId,changes)=>mix(model.document().tracks.findIndex(t=>t.id===trackId),changes),
    state:()=>({snapshot:model.snapshot(),document:model.document(),trackId:model.document()?.tracks[selected]?.id,selection:sourceSelection,token:selectionToken})});
  function workspaceClipEdit(operation){
    const track=model.document().tracks.find(t=>t.id===operation.trackId),slot=track?.slots.find(s=>s?.id===operation.clipId),source=model.document().sources.find(s=>s.id===slot?.sourceId);
    const {kind,trackId,clipId,sourceId,...rest}=operation;
    if(kind==='create'){
      const scope=scopeRevision,token=selectionToken;
      return enqueue(async()=>{if(scope!==scopeRevision)throw Error('The source scope changed.');const created=await command('alive_workspace_edit',{operation:{kind:'sourceCreateMidi',trackId,name:`Clip ${rest.slot+1}`,lengthBeats:model.document().lengthBeats}});model.applied(created.snapshot);
        const assigned=await command('alive_workspace_edit',{operation:{kind:'slotAssign',trackId,slot:rest.slot,sourceId:created.affected.sourceId,name:`Clip ${rest.slot+1}`,sourceOffset:{kind:'beats',value:0},loopEnabled:true}});model.applied(assigned.snapshot);listRevision++;if(token===selectionToken){selectedSlots.set(trackId,rest.slot);selectedNote=null;}trackKey=musicKey=clipControlsKey='';render();});
    }
    if(!slot||!source)throw Error('Select a MIDI source slot.');
    if(kind==='duplicate')return workspaceEdit({kind:'slotDuplicate',trackId,slotId:slot.id,...rest});
    if(kind==='delete')return workspaceEdit({kind:'slotDelete',trackId,slotId:slot.id});
    if(kind==='rename')return workspaceSlotEdit(trackId,slot.id,sourceId??source.id,{name:rest.name});
    if(kind==='length')return workspaceEdit({kind:'sourceLength',sourceId:source.id,...rest});
    if(kind==='noteCreate')return workspaceEdit({kind:'noteCreate',sourceId:source.id,...rest});
    throw Error('This clip operation is unavailable in workspaces.');
  }
  const creatingSlots=new Set();
  function buildSlots(bank,track,index){
    for(let slot=0;slot<4;slot++){
      const c=track.slots[slot],cell=make('div','clip-slot'),choose=make('button','clip-select',c?.name??''),launch=make('button','clip-launch'),status=make('small','sr-only');
      choose.setAttribute('aria-label',`Select ${track.name} slot ${slot+1}`);choose.addEventListener('click',()=>{workspace.returnMusic();if(selected===index&&!sourceSelection&&slotOf(track)===slot){render();return;}cancelGesture();selected=index;sourceSelection=null;selectedSlots.set(track.id,slot);selectionToken++;selectedNote=null;musicKey=clipControlsKey='';render();});
      choose.title=c?.name??`Empty slot ${slot+1}. Double-click to create a clip.`;
      choose.addEventListener('dblclick',guard(async()=>{
        const current=model.document().tracks[selected],key=`${track.id}:${slot}`;
        if(current?.id!==track.id||slotOf(current)!==slot||current.slots[slot]||creatingSlots.has(key))return;
        creatingSlots.add(key);try{await clipEdit({kind:'create',trackId:track.id,slot});}finally{creatingSlots.delete(key);}
      }));
      decorate(launch,'play','Launch',{only:true});
      launch.setAttribute('aria-label',`Launch ${track.name} ${c?.name??`slot ${slot+1}`}`);launch.disabled=!c;launch.addEventListener('click',guard(()=>clipAction({kind:'launch',trackId:track.id,clipId:c.id})));
      cell.dataset.slot=String(slot);cell.append(launch,choose,status);bank.append(cell);slotViews.push({trackId:track.id,slot,clipId:c?.id,cell,choose,launch,status});
    }
    const stop=make('button','track-stop');stop.setAttribute('aria-label',`Stop ${track.name} track`);decorate(stop,'stop','Stop track');stop.addEventListener('click',guard(()=>clipAction({kind:'stop',trackId:track.id})));bank.append(stop);if(isWorkspace()){const back=make('button','track-return','Return');back.setAttribute('aria-label',`Return ${track.name} to Arrangement`);back.addEventListener('click',guard(()=>clipAction({kind:'return',trackIds:[track.id]})));bank.append(back);}
    const receipt=make('details','runtime-receipt'),summary=make('summary','','Runtime'),state=make('output','clip-runtime');state.setAttribute('aria-label',`${track.name} clip runtime`);summary.setAttribute('aria-label',`${track.name} runtime details`);receipt.append(summary,state);bank.append(receipt);slotViews.push({trackId:track.id,state,summary});
  }
  function renderWorkspaceControls(snapshot,document,track,container){
    const slot=selectedClip(track),source=sourceOf(track,document),prepared=snapshot.preparedWorkspaces;
    $('clip-bank-notice').textContent=snapshot.notice??'MIDI workspace profile 1. Practical device buffers of at least 256 frames are recommended; delivered periods may differ.';
    $('clip-bank-notice').title=$('clip-bank-notice').textContent;
    $('add-note').disabled=source?.kind!=='midi';$('add-lane').disabled=!source||!automationTargets().length;
    for(const v of slotViews){
      const observation=snapshot.runtime?.tracks.find(t=>t.trackId===v.trackId),current=document.tracks.find(t=>t.id===v.trackId);
      const active=prepared?.sources.find(s=>s.sourceId===observation?.activeSourceId),activeSlot=prepared?.slots.find(s=>s.slotId===observation?.activeSlotId);
      const authority=observation?.authority==='session'?'Session':observation?.authority==='arrangement'?'Arrangement':'Unavailable';
      if(v.state){const deleted=activeSlot&&!current?.slots.some(s=>s?.id===activeSlot.slotId),last=snapshot.runtime?.requests.filter(r=>r.members?.some(m=>m.trackId===v.trackId)).at(-1);v.state.textContent=`${authority}: ${active?`${snapshot.state.playing?'Playing':'Cued'} ${activeSlot?.name??active.name}${deleted?' (deleted in draft)':''}`:authority==='Session'?'Session silence':authority==='Arrangement'?'Arrangement gap':'observation unavailable'}${observation?.pendingAction?` / pending ${observation.pendingAction} (${observation.pendingAuthority}) at frame ${observation.pendingFrame}`:''}${last?` / ${requestText(last,snapshot)}`:''}`;v.summary.textContent=authority;v.summary.title=v.state.textContent;continue;}
      const draft=current?.slots[v.slot],installed=prepared?.slots.find(s=>s.slotId===v.clipId),playing=!!v.clipId&&observation?.activeSlotId===v.clipId,pending=!!v.clipId&&observation?.pendingSlotId===v.clipId;
      v.choose.setAttribute('aria-pressed',String(track.id===v.trackId&&!sourceSelection&&slotOf(track)===v.slot));v.launch.disabled=!installed;v.launch.title=installed?'Launch the prepared slot at the next native bar boundary':'Apply while stopped to launch this slot';
      for(const [name,on] of Object.entries({occupied:!!draft,empty:!draft,prepared:!!installed,'draft-only':!!draft&&!installed,selected:track.id===v.trackId&&!sourceSelection&&slotOf(track)===v.slot,playing:playing&&!!snapshot.state.playing,cued:playing&&!snapshot.state.playing,pending}))v.cell.classList.toggle(name,on);
      v.status.textContent=[playing?`${snapshot.state.playing?'Playing':'Cued'} ${installed?.name}`:'',pending?'Pending launch':''].filter(Boolean).join(' / ');
    }
    const key=JSON.stringify(['v4',snapshot.generation,track.id,slotOf(track),slot,source?.id,source?.name,source?.lengthBeats,sourceSelection,document.sources.map(s=>[s.id,s.name]),document.placements.map(p=>[p.id,p.sourceId])]);if(key===clipControlsKey)return;clipControlsKey=key;container.replaceChildren();
    const button=(label,fn)=>{const b=make('button','',label);b.setAttribute('aria-label',label);b.addEventListener('click',guard(fn));container.append(b);return b;};
    const sources=make('select');sources.setAttribute('aria-label','MIDI source');
    const empty=make('option','','Choose source');empty.value='';sources.append(empty);
    for(const item of document.sources.filter(s=>s.trackId===track.id)){const option=make('option','',item.name);option.value=item.id;sources.append(option);}sources.value=source?.id??'';
    sources.addEventListener('change',()=>chooseSource({trackId:track.id,sourceId:sources.value||null,occurrence:null}));container.append(sources);
    button('Create MIDI source',()=>{const range=timeline.getRange();return workspaceEdit({kind:'sourceCreateMidi',trackId:track.id,name:`MIDI ${document.sources.filter(s=>s.trackId===track.id).length+1}`,lengthBeats:range.duration},true);});
    button('Place source in range',()=>{const range=timeline.getRange();if(!source)throw Error('Choose or create a MIDI source first.');return workspaceEdit({kind:'placementCreate',trackId:track.id,sourceId:source.id,start:range.start,duration:range.duration,sourceOffset:{kind:'beats',value:0},loopEnabled:true},true);}).disabled=!source;
    if(sourceSelection?.trackId===track.id){
      if(!source){container.append(make('span','muted','Choose or create a source; drag a blank timeline range, then Place.'));return;}
      const references=document.tracks.reduce((n,t)=>n+t.slots.filter(s=>s?.sourceId===source.id).length,0)+document.placements.filter(p=>p.sourceId===source.id).length;
      container.append(make('span','source-scope',`${references} references. Notes and automation edit every reference.`));
      const name=make('input');name.value=source.name;name.setAttribute('aria-label','MIDI source name');name.addEventListener('change',guard(()=>workspaceEdit({kind:'sourceRename',sourceId:source.id,name:name.value})));const nameLabel=make('label','','Source name');nameLabel.append(name);container.append(nameLabel);
      const lengthLabel=make('label');lengthLabel.append(make('span','','Source length'),numeric('MIDI source length',source.lengthBeats,{min:1/64,max:256},lengthBeats=>workspaceEdit({kind:'sourceLength',sourceId:source.id,lengthBeats})),make('span','muted','beats'));container.append(lengthLabel);
      const destination=make('select');destination.setAttribute('aria-label','Assign source to Session slot');track.slots.forEach((s,i)=>{if(!s){const option=make('option','',`Slot ${i+1}`);option.value=String(i);destination.append(option);}});destination.value=destination.children[0]?.value??'';container.append(destination);
      button('Assign source to Session',()=>workspaceEdit({kind:'slotAssign',trackId:track.id,slot:Number(destination.value),sourceId:source.id,name:source.name,sourceOffset:{kind:'beats',value:0},loopEnabled:true})).disabled=!destination.children.length;
      return;
    }
    if(!slot){button('Create clip',()=>clipEdit({kind:'create',trackId:track.id,slot:slotOf(track)})).disabled=track.chain.kind!=='midi';container.append(make('span','muted',`Empty slot ${slotOf(track)+1}`));return;}
    if(!source){container.append(make('span','muted','Source unavailable'));return;}
    const references=document.tracks.reduce((n,t)=>n+t.slots.filter(s=>s?.sourceId===source.id).length,0)+document.placements.filter(p=>p.sourceId===source.id).length;
    container.append(make('span','source-scope',`${source.name} / shared source: ${references} references. Notes and automation edit every reference.`));
    const name=make('input');name.value=slot.name;name.setAttribute('aria-label','Clip name');name.maxLength=64;name.addEventListener('change',guard(()=>clipEdit({kind:'rename',trackId:track.id,clipId:slot.id,sourceId:source.id,name:name.value})));const nameLabel=make('label','','Clip name');nameLabel.append(name);container.append(nameLabel);
    if(source.kind==='midi'){const length=make('label'),offset=make('label');length.append(make('span','','Source length'),numeric('Selected clip length',source.lengthBeats,{min:1/64,max:256},lengthBeats=>workspaceEdit({kind:'sourceLength',sourceId:source.id,lengthBeats})),make('span','muted','beats'));offset.append(make('span','','Offset'),numeric('Slot source offset',slot.sourceOffset.value,{min:0,max:source.lengthBeats},value=>workspaceSlotEdit(track.id,slot.id,source.id,{sourceOffset:{kind:'beats',value}})),make('span','muted','beats'));container.append(length,offset);}
    const destination=make('select');destination.setAttribute('aria-label','Duplicate destination');track.slots.forEach((s,i)=>{if(!s){const option=make('option','',`Slot ${i+1}`);option.value=String(i);destination.append(option);}});destination.value=destination.children[0]?.value??'';container.append(destination);
    button('Duplicate clip',()=>workspaceEdit({kind:'slotDuplicate',trackId:track.id,slotId:slot.id,destinationSlot:Number(destination.value)})).disabled=!destination.children.length;
    button('Make source independent',()=>workspaceEdit({kind:'sourceIndependent',occurrence:{kind:'slot',trackId:track.id,slotId:slot.id}}));
    button('Delete clip',()=>workspaceEdit({kind:'slotDelete',trackId:track.id,slotId:slot.id}));
  }
  function renderClipControls(){
    const snapshot=model.snapshot(),document=model.document(),track=document.tracks[selected],clip=selectedClip(track),enabled=document.format==='alive-session-v3',container=$('clip-controls');
    renderScenes(snapshot);
    if(isWorkspace(document)){renderWorkspaceControls(snapshot,document,track,container);return;}
    $('clip-bank-notice').textContent=snapshot.notice??'';$('clip-bank-notice').title=snapshot.notice??'';
    $('add-note').disabled=enabled&&!clip;$('add-lane').disabled=enabled&&!clip;
    for(const v of slotViews){
      if(v.state){const r=snapshot.runtime?.tracks.find(t=>t.trackId===v.trackId),name=snapshot.preparedClips?.find(c=>c.clipId===r?.activeClipId)?.name,requests=snapshot.runtime?.requests.filter(q=>q.trackId===v.trackId),last=requests?.at(-1),deleted=r?.activeClipId&&!document.tracks.find(t=>t.id===v.trackId)?.slots.some(c=>c?.id===r.activeClipId);v.state.textContent=`${r?.activeClipId?`${snapshot.state.playing?'Playing':'Cued'} ${name}${deleted?' (deleted in draft)':''}`:'Stopped'}${last?` / ${requestText(last,snapshot)}`:''}${r?.pendingAction?` / pending ${r.pendingAction} at frame ${r.pendingFrame}`:''}`;v.summary.textContent=last?.status==='rejected'?'Request rejected':r?.pendingAction?'Pending action':r?.activeClipId?`${snapshot.state.playing?'Playing':'Cued'} ${name}`:'Stopped';v.summary.title=v.state.textContent;continue;}
      const t=document.tracks.find(t=>t.id===v.trackId),c=t?.slots[v.slot],runtime=snapshot.runtime?.tracks.find(t=>t.trackId===v.trackId),prepared=snapshot.preparedClips?.find(c=>c.clipId===v.clipId),active=runtime?.activeClipId===v.clipId&&!!v.clipId,pending=runtime?.pendingClipId===v.clipId&&!!v.clipId;
      v.choose.setAttribute('aria-pressed',String(t?.id===track.id&&v.slot===slotOf(track)));v.cell.classList.toggle('selected',t?.id===track.id&&v.slot===slotOf(track));v.launch.disabled=!prepared;v.launch.title=prepared?(model.pending()?'Launch prepared version':'Launch at the next native bar boundary'):'Apply while stopped to launch';
      for(const[state,on]of Object.entries({occupied:!!c,empty:!c,prepared:!!prepared,'draft-only':!!c&&!prepared,playing:active&&!!snapshot.state.playing,cued:active&&!snapshot.state.playing,pending,'saved-default':!!c&&t.defaultClipId===c.id}))v.cell.classList.toggle(state,on);
      const activeName=snapshot.preparedClips?.find(c=>c.clipId===runtime?.activeClipId)?.name;
      v.status.textContent=[c&&t.defaultClipId===c.id?'Saved default':'',active?`${snapshot.state.playing?'Playing':'Cued'} ${prepared?.name??''}`:'',pending?'Pending switch':'',v.slot===0&&runtime?.pendingAction==='stop'?'Pending track Stop':'',v.slot===0&&runtime?.activeClipId&&!t.slots.some(c=>c?.id===runtime.activeClipId)?`${snapshot.state.playing?'Playing':'Cued'} prepared ${activeName} (deleted in draft)`:''].filter(Boolean).join(' / ');
      v.choose.title=[c?.name??`Empty slot ${v.slot+1}. Double-click to create a clip.`,v.status.textContent].filter(Boolean).join(' / ');
    }
    const key=JSON.stringify([enabled,track.id,slotOf(track),clip?.id,clip?.name,clip?.lengthBeats,track.defaultClipId,track.slots?.map(c=>c?.id),snapshot.generation]);if(key===clipControlsKey)return;clipControlsKey=key;container.replaceChildren();
    const button=(text,fn)=>{const b=make('button','',text);b.setAttribute('aria-label',text);b.addEventListener('click',guard(fn));container.append(b);return b;};
    if(snapshot.capabilities?.workspaceConversionAvailable){const b=button('Enable MIDI workspaces',()=>enqueue(async()=>{applySnapshot(await command('alive_enable_workspaces'));trackKey=musicKey=clipControlsKey='';render();notice('MIDI workspaces prepared. Arrangement starts at zero.');}));b.disabled=!!snapshot.state.playing||model.pending();b.title='Explicit stopped conversion. Complete native admission can refuse this project while preserving current playback.';}
    if(!enabled){const b=button('Enable clip bank',()=>enqueue(async()=>{applySnapshot(await command('alive_enable_clips'));trackKey=musicKey=clipControlsKey='';render();}));b.disabled=!!snapshot.state.playing||model.pending();return;}
    const trackId=track.id,slot=slotOf(track);
    if(!clip){button('Create clip',()=>clipEdit({kind:'create',trackId,slot}));container.append(make('span','muted',`Empty slot ${slot+1}`));return;}
    const clipId=clip.id,name=make('input');name.value=clip.name;name.maxLength=64;name.setAttribute('aria-label','Clip name');name.addEventListener('change',guard(()=>clipEdit({kind:'rename',trackId,clipId,name:name.value})));container.append(name);
    const label=make('label','','Clip length '),length=numeric('Selected clip length',clip.lengthBeats,{min:1/64,max:256},lengthBeats=>clipEdit({kind:'length',trackId,clipId,lengthBeats}));label.append(length);container.append(label);
    const destination=make('select');destination.setAttribute('aria-label','Duplicate destination');track.slots.forEach((c,i)=>{if(!c){const option=make('option','',`Slot ${i+1}`);option.value=String(i);destination.append(option);}});destination.value=destination.children[0]?.value??'';container.append(destination);
    button('Duplicate clip',()=>clipEdit({kind:'duplicate',trackId,clipId,destinationSlot:Number(destination.value)})).disabled=!destination.children.length;
    button('Delete clip',()=>clipEdit({kind:'delete',trackId,clipId}));button('Set Saved Default',()=>clipEdit({kind:'default',trackId,clipId})).title='Used after Apply and when reopened. Selection does not launch.';button('Clear Saved Default',()=>clipEdit({kind:'default',trackId,clipId:null}));
  }
  function buildTracks(document){
    $('tracks').replaceChildren();trackViews.length=0;slotViews=[];
    document.tracks.forEach((track,index)=>{
      const row=make('article','track'),name=make('button','track-name'),title=make('span','',`${index+1}  ${track.name}`),detail=make('small','',`${(track.notes?.length??0)} notes / stereo`),clip=make('button','clip-preview'),svg=svgElement('svg');
      name.append(title,detail);name.setAttribute('aria-label',`Select ${track.name} track`);name.title=track.name;clip.setAttribute('aria-label',`${track.name} clip`);clip.append(svg);
      const choose=()=>{workspace.returnMusic();if(selected!==index){cancelGesture();selectedNote=null;selectionToken++;selected=index;selectedInstance=null;musicKey=parameterKey='';}render();};name.addEventListener('click',choose);clip.addEventListener('click',choose);
      const gainLabel=make('label','track-gain','Gain'),gain=numeric(`${track.name} gain`,track.gain,{min:0,max:2,step:.05},value=>mix(index,{gain:value}));gainLabel.append(gain);
      const fader=make('input','gain-fader');fader.type='range';fader.min='0';fader.max='2';fader.step='any';fader.value=String(track.gain);fader.setAttribute('aria-label',`${track.name} gain fader`);fader.setAttribute('aria-orientation','vertical');fader.title='Linear gain, 0 to 2';
      let faderEditing=false;fader.addEventListener('input',()=>{faderEditing=true;});fader.addEventListener('change',guard(()=>{faderEditing=false;return mix(index,{gain:Number(fader.value)});}));fader.addEventListener('pointercancel',()=>{faderEditing=false;render();});
      const mute=make('button','mixer-toggle','M'),solo=make('button','mixer-toggle','S');mute.setAttribute('aria-label',`${track.name} mute`);solo.setAttribute('aria-label',`${track.name} solo`);
      mute.addEventListener('click',guard(()=>mix(index,{mute:!model.document().tracks[index].mute})));solo.addEventListener('click',guard(()=>mix(index,{solo:!model.document().tracks[index].solo})));
      const meters=make('div','track-meter'),bar=make('div','stereo-meter vertical-meter'),readout=make('output');bar.append(make('i'),make('i'));bar.setAttribute('aria-label',`${track.name} stereo peak`);readout.setAttribute('aria-label',`${track.name} peak`);meters.append(bar,readout);
      const actions=make('div','track-actions');for(const[action,label]of [['editor','Editor'],['load','Replace'],['remove','Remove track']]){
        const button=make('button','',label);button.setAttribute('aria-label',action==='editor'?`Open ${track.name} editor`:action==='remove'?`Remove ${track.name} track`:`${label} ${track.name} device`);
        button.disabled=action!=='remove'&&!instrumentOf(track);button.addEventListener('click',guard(()=>{const origin=generation();return enqueue(async()=>{
          if(generation()!==origin)throw Error('The originating device session changed.');
          if(action!=='editor'){commitFocused();cancelGesture();selectedNote=null;}
          if(action==='editor')await command('alive_editor',{instanceId:instrumentOf(track)?.instanceId});else{const result=isWorkspace()&&action==='remove'?await command('alive_workspace_track',{operation:{kind:'remove',trackId:track.id}}):await command('alive_device',{trackId:track.id,instanceId:instrumentOf(track)?.instanceId,action});applySnapshot(result.snapshot??result);trackKey=musicKey=parameterKey='';render();notice('Device updated. Start transport when ready.');}
        });}));actions.append(button);
      }
      row.dataset.trackId=track.id;row.style.setProperty('--track-color',track.color??['#efbb62','#88c5c7','#91b9ed','#d8a0a7','#b4c98b','#d3b48a','#a5b9ce','#c5b6cf'][index%8]);
      const mixer=make('div','track-mixer'),toggles=make('div','mixer-toggles'),inspector=make('details','track-inspector'),summary=make('summary','','Device / track');
      const strip=make('div','mixer-strip');strip.append(fader,meters);toggles.append(mute,solo);mixer.append(gainLabel,strip,toggles);inspector.append(summary,actions);
      row.append(name);if(track.slots){row.classList.add('clips-track');clip.hidden=true;const bank=make('div','clip-bank');row.append(bank);buildSlots(bank,track,index);}row.append(clip,mixer,inspector);$('tracks').append(row);trackViews.push({row,detail,svg,gain,fader,faderEditing:()=>faderEditing,mute,solo,bar,readout,actions});
    });
  }
  function chainDevices(track=model.document().tracks[selected]){return actualDevices(track);}
  function instanceView(id){return model.snapshot().deviceInstances[id];}
  function instanceName(reference,index){const isInstrument=reference.instanceId===instrumentOf(model.document().tracks[selected])?.instanceId,effect=index+(instrumentOf(model.document().tracks[selected])?0:1);return `${instanceView(reference.instanceId)?.manifest.name??'Device'}${isInstrument?' instrument':` effect ${effect}`}`;}
  function structural(reference,action,beforeInstanceId){
    commitFocused();cancelGesture();selectedNote=null;
    const trackId=model.document().tracks[selected].id,instanceId=reference?.instanceId,origin=generation();
    return enqueue(async()=>{if(generation()!==origin)throw Error('The originating device session changed.');const snapshot=await command('alive_device',{trackId,instanceId,action,...(action==='reorder'?{beforeInstanceId}: {})});applySnapshot(snapshot);trackKey=musicKey=parameterKey=chainKey='';render();notice('Chain prepared. Start transport when ready.');});
  }
  function loadBrowserEntry(entry){
    const intent={generation:generation(),draftRevision:model.snapshot()?.draftRevision??0},trackId=model.document().tracks[selected].id,token=selectionToken;
    return enqueue(async()=>{
      if(generation()!==intent.generation||(model.snapshot()?.draftRevision??0)!==intent.draftRevision)throw Error('The originating session changed. Select the browser entry again.');
      let result;
      if(entry.kind==='instrument'&&isWorkspace())result=await invoke('alive_workspace_track',{...intent,operation:{kind:'addMidi',path:entry.path}});
      else result=await invoke('alive_device',{...intent,trackId:entry.kind==='instrument'?`track-${Date.now()}`:trackId,action:entry.kind==='instrument'?'load':'add',path:entry.path});
      applySnapshot(result.snapshot??result);
      if(entry.kind==='instrument'&&token===selectionToken){selected=model.document().tracks.length-1;sourceSelection=null;selectedInstance=null;selectionToken++;}
      trackKey=musicKey=parameterKey=chainKey='';render();notice(`${entry.name} loaded. Transport remains stopped.`);
    });
  }
  function openBrowserSource(entry){
    const document=model.document(),index=document.tracks.findIndex(track=>track.id===entry.trackId);
    if(index<0||(isWorkspace()?!document.sources.some(source=>source.id===entry.sourceId&&source.trackId===entry.trackId):document.tracks[index].slots?.[entry.slot]?.id!==entry.clipId))throw Error('This clip is no longer in the project. Search again.');
    cancelGesture();selected=index;selectedInstance=null;selectedNote=null;selectionToken++;
    if(isWorkspace())sourceSelection={trackId:entry.trackId,sourceId:entry.sourceId,occurrence:null};
    else{sourceSelection=null;selectedSlots.set(entry.trackId,entry.slot);}
    musicKey=clipControlsKey='';workspace.openClip();render();
  }
  function buildChain(){
    const track=model.document().tracks[selected],devices=chainDevices(track);
    $('chain-title').textContent=`${track.name} chain`;$('chain').replaceChildren();chainViews.length=0;
    devices.forEach((reference,index)=>{
      const name=instanceName(reference,index),context=`${track.name} ${name}`,row=make('div','chain-device'),choose=make('button','chain-select',name),bypass=make('button','','Bypass'),actions=[];
      choose.setAttribute('aria-label',`Select ${context}`);choose.addEventListener('click',()=>{selectedInstance=reference.instanceId;parameterKey='';render();});
      bypass.setAttribute('aria-label',`Bypass ${context}`);const isInstrument=reference.instanceId===instrumentOf(track)?.instanceId;bypass.disabled=isInstrument;bypass.title=isInstrument?'Only effects support bypass. Use track mute to silence this track.':'Live bypass keeps the device state warm; audio output stays open.';
      bypass.addEventListener('click',guard(()=>{const instanceId=reference.instanceId,bypassed=!chainDevices().find(d=>d.instanceId===instanceId).bypassed,origin=generation();return enqueue(async()=>{if(generation()!==origin)throw Error('The originating device session changed.');await command('alive_bypass',{instanceId,bypassed});await refresh();});}));
      row.append(choose,bypass);
      const action=(label,aria,fn,blocked=false)=>{const button=make('button','',label);button.setAttribute('aria-label',aria);button.addEventListener('click',guard(fn));row.append(button);actions.push({button,blocked});};
      action('Replace...',`Replace ${context}`,()=>structural(reference,'replace'));
      if(!isInstrument){
        action('Earlier',`Move ${context} earlier`,()=>structural(reference,'reorder',devices[index-1].instanceId),index===(instrumentOf(track)?1:0));
        action('Later',`Move ${context} later`,()=>structural(reference,'reorder',devices[index+2]?.instanceId??null),index===devices.length-1);
        action('Remove',`Remove ${context}`,()=>structural(reference,'remove'));
      }
      $('chain').append(row);chainViews.push({row,choose,bypass,reference,actions});
    });
  }
  function automationTargets(){
    return chainDevices().flatMap((reference,index)=>(instanceView(reference.instanceId)?.manifest?.parameters??[]).map(binding=>({instanceId:reference.instanceId,binding,label:reference.instanceId===instrumentOf(model.document().tracks[selected])?.instanceId?binding.label:`${instanceName(reference,index)} / ${binding.label}`})));
  }
  function mix(track,changes){const trackId=model.snapshot().document.tracks[track].id,origin=generation();return enqueue(async()=>{if(generation()!==origin)throw Error('The originating mixer session changed.');const index=model.snapshot().document.tracks.findIndex(t=>t.id===trackId);if(index<0)throw Error('The originating track was removed.');const current=model.snapshot().document.tracks[index];await invoke('alive_mixer',{generation:origin,track:index,gain:changes.gain??current.gain,mute:changes.mute??current.mute,solo:changes.solo??current.solo});await refresh();});}
  function buildMusic(document){
    const track=document.tracks[selected],trackId=track.id,clipId=track.clipId,sourceId=track.sourceId,occurrence=sourceSelection?.trackId===trackId?sourceSelection.occurrence:null,scope=scopeRevision;const editClip=(change,rebuild=true,label='Edit schedule',ctx=null,indexed=false)=>edit(change,rebuild,label,ctx??{clipId,sourceId,occurrence,scope},indexed);$('clip-title').textContent=isWorkspace()?`${track.name} / ${sourceOf()?.name??'Choose a source'}`:track.slots?`${track.name} / ${selectedClip()?.name??'Empty slot'}`:`${track.name} clip`;
    paintPiano($('piano-roll'),preview??track.notes??[],document.lengthBeats,true);$('notes').replaceChildren();
    (track.notes??[]).forEach((note,index)=>{
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
      if(!lane&&!(instanceId===instrumentOf(track)?.instanceId&&['cutoff','level'].includes(key)))continue;
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
    $('parameters').replaceChildren();parameterViews.clear();const device=instanceView(selectedInstance)?.manifest,instanceId=selectedInstance;
    $('device-title').textContent=device?.name??'Device';$('device-path').textContent=chainDevices().find(d=>d.instanceId===selectedInstance)?.path??'No device selected';$('device-path').title=$('device-path').textContent;
    for(const binding of device?.parameters??[]){
      const section=make('div','parameter'),label=make('label','',binding.label),base=make('div','base'),unit=make('span','unit',binding.unit??''),number=numeric(`${binding.label} base`,binding.base,{min:binding.min,max:binding.max,step:binding.integral?1:binding.max<=1?.01:binding.max<=20?.1:1},value=>setBase(instanceId,binding.key,value)),range=make('input'),output=make('output');
      range.type='range';range.min=binding.min;range.max=binding.max;range.step=binding.integral?'1':'any';range.value=binding.base;range.id=`base-${binding.key}`;range.setAttribute('aria-label',`${binding.label} base slider`);label.htmlFor=range.id;
      range.addEventListener('change',guard(()=>setBase(instanceId,binding.key,Number(range.value))));range.addEventListener('input',()=>{number.value=range.value;});
      output.setAttribute('aria-label',`${binding.label} effective ownership`);base.append(number,unit);section.append(label,range,base,output);$('parameters').append(section);parameterViews.set(binding.key,{section,number,range,output});
    }
  }
  function setBase(instanceId,key,value){const origin=generation();return enqueue(async()=>{if(generation()!==origin)throw Error('The originating device session changed.');await invoke('alive_base',{instanceId,key,value,generation:origin});await refresh();});}
  const piano=$('piano-roll'),velocity=$('note-velocity');
  pianoView=mountPianoView({doc,win,svg:piano,onNavigate:cancelGesture,onGeometry:g=>{pianoGeometry=g;}});
  function context(){return {sourceId:sourceOf()?.id,occurrence:sourceSelection?.occurrence,trackId:model.document().tracks[selected].id,clipId:selectedClip()?.id??null,noteId:typeof selectedNote==='string'?selectedNote:null,scope:scopeRevision,generation:generation(),revision:model.snapshot()?.draftRevision??0};}
  function paintSelection(){paintPiano(piano,preview??editorDocument().tracks[selected].notes,editorDocument().lengthBeats,true);render();}
  piano.addEventListener('pointerdown',guard(event=>{
    if(event.button!==0||gesture||(isWorkspace()&&sourceOf()?.kind!=='midi'))return;
    const hit=event.target.closest?.('[data-note]')??(event.target.getAttribute?.('data-note')!==null?event.target:null);
    const index=hit?.getAttribute?.('data-note')??hit?.attrs?.['data-note'];
    selectedNote=index!==undefined&&index!==null?noteIdentity(editorDocument().tracks[selected].notes[Number(index)],Number(index)):null;piano.focus();
    if(selectedNote!==null){const g=pianoGeometry,rect=piano.getBoundingClientRect(),start=point(event,rect,g);gesture={...context(),geometry:g,rect,start,index:selectedNoteIndex(editorDocument().tracks[selected].notes),kind:(hit?.getAttribute?.('data-part')??hit?.attrs?.['data-part'])==='resize'?'resize':'move',notes:structuredClone(editorDocument().tracks[selected].notes),pointerId:event.pointerId};piano.setPointerCapture?.(event.pointerId);event.preventDefault();}
    paintSelection();
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
    if(event.target.closest?.('[data-note]')||(isWorkspace()&&sourceOf()?.kind!=='midi'))return;
    cancelGesture();const p=point(event,piano.getBoundingClientRect(),pianoGeometry);
    if(p.x<pianoGeometry.pad||p.y<pianoGeometry.top||p.x>pianoGeometry.width||p.y>pianoGeometry.height)return;
    const trackId=model.document().tracks[selected].id,note=addNote(beatAt(p,pianoGeometry),pitchAt(p,pianoGeometry),editorDocument().lengthBeats);if(!note)throw Error('The new note must fit within the clip.');
    if(isWorkspace())return workspaceEdit({kind:'noteCreate',sourceId:sourceOf().id,...note});if(selectedClip())return clipEdit({kind:'noteCreate',trackId,clipId:selectedClip().id,...note});
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
  velocity.addEventListener('pointerdown',event=>{velocityCanceled=false;velocity.setPointerCapture?.(event.pointerId);if(selectedNote!==null){gesture={...context(),kind:'velocity',index:selectedNoteIndex(editorDocument().tracks[selected].notes),notes:structuredClone(editorDocument().tracks[selected].notes),pointerId:event.pointerId,captureTarget:velocity};}});
  velocity.addEventListener('input',()=>{if(velocityCanceled){render();return;}if(selectedNote===null)return;preview=structuredClone(gesture?.notes??editorDocument().tracks[selected].notes);preview[selectedNoteIndex(preview)].velocity=Number(velocity.value);paintSelection();});
  velocity.addEventListener('change',guard(()=>{if(velocityCanceled){render();return;}if(selectedNote===null)return;const g=gesture,trackId=g?.trackId??model.document().tracks[selected].id,index=selectedNoteIndex(editorDocument().tracks[selected].notes),id=editorDocument().tracks[selected].notes[index]?.id,value=Number(velocity.value);gesture=null;preview=null;return edit(document=>{trackById(document,trackId).notes[noteAt(trackById(document,trackId),id,index)].velocity=value;},true,'Change velocity',g,true);}));
  velocity.addEventListener('pointercancel',cancelGesture);velocity.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();cancelGesture();}else velocityCanceled=false;});
  const velocityLane=pianoView.velocityLane;
  velocityLane.addEventListener('pointerdown',guard(event=>{
    if(event.button!==0||gesture||(isWorkspace()&&sourceOf()?.kind!=='midi'))return;
    const hit=event.target.closest?.('[data-note]'),index=Number(hit?.getAttribute('data-note'));
    if(!hit||!Number.isInteger(index))return;
    const notes=editorDocument().tracks[selected].notes;
    selectedNote=noteIdentity(notes[index],index);
    gesture={...context(),kind:'velocityLane',index,notes:structuredClone(notes),rect:velocityLane.getBoundingClientRect(),startY:event.clientY,pointerId:event.pointerId,captureTarget:velocityLane};
    velocityLane.setPointerCapture?.(event.pointerId);velocityLane.focus();event.preventDefault();paintSelection();
  }));
  velocityLane.addEventListener('pointermove',guard(event=>{
    if(gesture?.kind!=='velocityLane'||gesture.pointerId!==event.pointerId)return;
    const g=gesture;preview=structuredClone(g.notes);preview[g.index]=velocityEdit(g.notes[g.index],(g.startY-event.clientY)*40/g.rect.height);paintSelection();
  }));
  velocityLane.addEventListener('pointerup',guard(event=>{
    if(gesture?.kind!=='velocityLane'||gesture.pointerId!==event.pointerId)return;
    const g=gesture,notes=preview;gesture=null;preview=null;
    if(velocityLane.hasPointerCapture?.(event.pointerId))velocityLane.releasePointerCapture(event.pointerId);
    if(notes&&JSON.stringify(notes)!==JSON.stringify(g.notes))return edit(document=>{trackById(document,g.trackId).notes=notes;},true,'Change velocity',g);
    paintSelection();
  }));
  velocityLane.addEventListener('pointercancel',cancelGesture);velocityLane.addEventListener('lostpointercapture',()=>{if(gesture?.kind==='velocityLane')cancelGesture();});
  velocityLane.addEventListener('keydown',guard(event=>{
    if(event.key==='Escape'){event.preventDefault();cancelGesture();return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();return history(event.shiftKey?'redo':'undo');}
    if(selectedNote===null||!['ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();cancelGesture();
    const g=context(),notes=structuredClone(editorDocument().tracks[selected].notes),index=selectedNoteIndex(notes),delta=(event.key==='ArrowUp'?1:-1)*(event.shiftKey?10:1);
    notes[index].velocity=Math.max(1,Math.min(127,notes[index].velocity+delta));
    return edit(document=>{trackById(document,g.trackId).notes=notes;},true,'Change velocity',g);
  }));
  const diagnosticNames=['Audio backend','Audio device','Audio sample rate','Audio buffer frames','Audio callbacks','Audio stream errors','Audio failed','Audio status','Transport playing','Absolute frame','Rejected commands','Native generation',...Array.from({length:8},(_,index)=>`Track ${index+1} active voices`),...Array.from({length:8},(_,index)=>[`Track ${index+1} authority`,`Track ${index+1} active source`,`Track ${index+1} active placement`]).flat()];
  for(const name of diagnosticNames){const label=make('label','',name),output=make('output','','-');output.setAttribute('aria-label',name);label.append(output);$('diagnostics').append(label);diagnostics.set(name,output);}
  function render(){
    if(sourceSelection&&model.document()){const d=model.document(),p=d.placements?.find(p=>p.id===sourceSelection.occurrence?.placementId);if(!d.sources?.some(s=>s.id===sourceSelection.sourceId))sourceSelection=null;else if(sourceSelection.occurrence)sourceSelection={...sourceSelection,sourceId:p?.sourceId??sourceSelection.sourceId,occurrence:p?sourceSelection.occurrence:null};}
    const snapshot=model.snapshot(),document=editorDocument();if(!snapshot||!document)return;
    if(masterGeneration!==snapshot.generation){const canceled=masterGeneration!==null&&(!!masterIntent||masterPendingReset);masterGeneration=snapshot.generation;masterIntent=masterReceipt=null;masterPendingReset=false;masterStatus=canceled?'Master pending intent canceled on session change.':'';masterError=false;masterProducer.setGeneration(snapshot.generation);if(canceled)notice(masterStatus,false,'master');else if(noticeOwner==='master')notice('Master state refreshed for this session.',false,'master');}
    renderMaster();renderTransportRequest(snapshot);
    selected=Math.min(selected,document.tracks.length-1);
    if(!chainDevices().some(d=>d.instanceId===selectedInstance))selectedInstance=chainDevices()[0]?.instanceId??null;
    $('edit-device').disabled=!selectedInstance;$('session-title').textContent=document.title;$('dirty').textContent=snapshot.dirty||model.pending()?'Modified':'';doc.title=`${snapshot.dirty||model.pending()?'* ':''}${document.title} - Alive`;
    for(const[id,value]of [['tempo',document.tempo],['length',model.document().lengthBeats]])if(doc.activeElement!==$(id)&&!workspace.preserves($(id)))$(id).value=value;
    $('undo').disabled=!snapshot.history?.canUndo;$('redo').disabled=!snapshot.history?.canRedo;
    $('undo').title=snapshot.history?.undoLabel??'No pending edit to undo';$('redo').title=snapshot.history?.redoLabel??'No pending edit to redo';
    const notes=document.tracks[selected].notes??[],chosenIndex=selectedNoteIndex(notes),selectedValue=notes[chosenIndex];if(!selectedValue)selectedNote=null;$('note-velocity').disabled=!selectedValue;$('note-velocity').value=preview?.[chosenIndex]?.velocity??selectedValue?.velocity??100;$('velocity-value').textContent=selectedValue?String($('note-velocity').value):'Select a note';
    $('loop').checked=document.loopEnabled;$('apply').disabled=!model.pending();$('discard').disabled=!model.pending()&&!snapshot.history?.canUndo&&!snapshot.history?.canRedo;$('draft-status').textContent=model.pending()?'Pending schedule edits':'Prepared schedule';
    const deviceCount=document.tracks.reduce((count,track)=>count+actualDevices(track).length,0),maxTracks=snapshot.capabilities?.maxTracks??2,maxDevices=snapshot.capabilities?.maxDevices??6;
    $('start').disabled=!!snapshot.state.playing;$('stop').disabled=false;$('add-track').disabled=document.tracks.length>=maxTracks||deviceCount>=maxDevices||!!snapshot.state.playing||model.pending();
    const nextTracks=JSON.stringify([snapshot.generation,document.tracks.map(t=>[t.id,t.name,t.color,t.chain?.kind,t.slots?.map(c=>c?[c.id,c.name,c.sourceId]:null),t.defaultClipId])]);if(nextTracks!==trackKey){trackKey=nextTracks;buildTracks(document);}
    const nextChain=JSON.stringify([snapshot.generation,selected,chainDevices().map(d=>[d.instanceId,d.path])]);if(nextChain!==chainKey){chainKey=nextChain;buildChain();}
    const structuralBlocked=!!snapshot.state.playing||model.pending();
    $('chain-status').textContent=model.pending()?'Apply or discard pending schedule edits before changing the chain.':snapshot.state.playing?'Stop transport to add, remove, replace or reorder devices. Bypass and base values work live.':'Add, remove, replace and reorder prepare the chain while stopped. Shared changed sources require restoration before selected Replace. Bypass keeps state warm.';
    $('add-effect').disabled=structuralBlocked||document.tracks[selected].effects.length>=2||deviceCount>=maxDevices;
    const structureMessage=model.pending()?'Apply or discard pending edits before loading a device.':snapshot.state.playing?'Stop transport before loading a device.':'';
    browser.render({document:model.document(),instances:snapshot.deviceInstances,instrumentBlocked:structureMessage||($('add-track').disabled?'Track or device capacity reached.':''),effectBlocked:structureMessage||($('add-effect').disabled?'Effect or device capacity reached.':'')});
    for(const view of chainViews){view.choose.setAttribute('aria-pressed',String(view.reference.instanceId===selectedInstance));view.row.classList.toggle('selected',view.reference.instanceId===selectedInstance);view.bypass.setAttribute('aria-pressed',String(chainDevices().find(d=>d.instanceId===view.reference.instanceId).bypassed));for(const {button,blocked} of view.actions){button.disabled=structuralBlocked||blocked;button.title=blocked?'Already at this end of the effect chain.':$('chain-status').textContent;}}
    const nextMusic=JSON.stringify([snapshot.generation,selected,selectedClip()?.id,sourceOf()?.id,document.tracks[selected].sourceKind,document.tempo,document.lengthBeats,document.loopEnabled,document.tracks[selected]?.notes,document.tracks[selected]?.automation]);
    if(nextMusic!==musicKey){musicKey=nextMusic;buildMusic(document);}
    paintLanes();
    const nextParameters=JSON.stringify([snapshot.generation,selected,selectedInstance]);if(nextParameters!==parameterKey){parameterKey=nextParameters;buildParameters(snapshot);}
    document.tracks.forEach((track,index)=>{
      const view=trackViews[index],runtime=snapshot.state.tracks[index];view.row.classList.toggle('selected',selected===index);view.row.setAttribute('aria-label',`${track.name} track`);view.detail.textContent=`${(track.notes?.length??0)} notes / stereo`;
      if(doc.activeElement!==view.gain&&!workspace.preserves(view.gain))view.gain.value=String(Number(track.gain.toFixed(3)));view.gain.title=`Exact gain: ${track.gain}`;view.mute.setAttribute('aria-pressed',String(track.mute));view.solo.setAttribute('aria-pressed',String(track.solo));
      if(!view.faderEditing()&&!workspace.preserves(view.fader))view.fader.value=track.gain;
      const key=JSON.stringify([track.notes,document.lengthBeats]);if(view.paintKey!==key){view.paintKey=key;paintPiano(view.svg,track.notes??[],document.lengthBeats);}
      meter(view.bar,runtime.peakLeft,runtime.peakRight);view.readout.textContent=peak(runtime.peakLeft,runtime.peakRight);
      for(const button of [...view.actions.children].slice(1)){button.disabled=!!snapshot.state.playing||model.pending()||(button!==view.actions.children[2]&&!instrumentOf(track));button.title=model.pending()?'Apply or discard pending schedule edits before changing devices.':snapshot.state.playing?'Stop transport before replacing a device or removing a track.':button.textContent==='Remove track'?'Remove this whole track, its instrument, effects and automation. Keep at least one track.':'Replace this instrument from a saved Ultra source; its automation lanes are removed.';}
    });
    for(const[bindingIndex,binding]of (instanceView(selectedInstance)?.manifest.parameters??[]).entries()){
      const view=parameterViews.get(binding.key),reading=parameterReading(binding,snapshot.state.devices[instanceView(selectedInstance).index],bindingIndex);if(!view)continue;
      if(doc.activeElement!==view.number&&!workspace.preserves(view.number))view.number.value=reading.base;if(doc.activeElement!==view.range&&!workspace.preserves(view.range))view.range.value=reading.base;
      view.output.textContent=`${reading.owner}: ${Number(reading.effective.toFixed(3))}${binding.unit?' '+binding.unit:''}`;view.section.classList.toggle('automated',reading.owner==='Automation');
    }
    const frameBeat=value=>typeof value==='string'?Number(nativeInteger(value)*1000000n/48000n)/1000000*snapshot.document.tempo/60:value/(48000*60/snapshot.document.tempo);
    const beat=frameBeat(snapshot.state.position),sixteenth=Math.floor(Math.max(0,beat)*4);
    const musicalPosition=`${Math.floor(sixteenth/16)+1}.${Math.floor(sixteenth/4)%4+1}.${sixteenth%4+1}`,precisePosition=`${beat.toFixed(3)} beats`;
    if($('position').textContent!==musicalPosition)$('position').textContent=musicalPosition;
    if($('position-beats').textContent!==precisePosition)$('position-beats').textContent=precisePosition;
    $('position').title=`${beat.toFixed(3)} beats; fixed 4/4`;
    for(const svg of [...trackViews.map(v=>v.svg),piano]){
      const line=svg.querySelector('.playhead');if(!line)continue;
      const detailed=svg===piano,index=detailed?selected:trackViews.findIndex(v=>v.svg===svg),track=document.tracks[index];
      const runtime=snapshot.runtime?.tracks.find(t=>t.trackId===track?.id),phase=snapshot.runtime?frameBeat(runtime?.phase??'0'):beat;
      const x=detailed?beatX(phase,pianoGeometry):phase/(track?.clipLength??document.lengthBeats)*640;
      line.setAttribute('visibility',!isWorkspace()||(runtime?.phase!=null&&!!track?.sourceId&&runtime.activeSourceId===track.sourceId)?'visible':'hidden');
      line.setAttribute('x1',x);line.setAttribute('x2',x);
    }
    const a=snapshot.audio,s=snapshot.state,values=[a.host||a.config.host,a.device||a.config.device,a.config.sample_rate,a.observed_buffer_frames,a.callbacks,a.stream_errors,String(a.failed),a.message,String(!!s.playing),s.absoluteFrame,s.rejected,s.generation,...Array.from({length:8},(_,index)=>s.tracks[index]?.activeVoices??0),...Array.from({length:8},(_,index)=>{const r=snapshot.runtime?.tracks.find(t=>t.trackId===snapshot.document.tracks[index]?.id);return[r?.authority??'-',r?.activeSourceId??'-',r?.activePlacementId??'-'];}).flat()];
    diagnosticNames.forEach((name,index)=>{const output=diagnostics.get(name),text=String(values[index]);if(output.textContent!==text)output.textContent=text;});
    const observations=snapshot.runtime?.tracks??[],overridden=observations.filter(t=>t.authority==='session').length,pending=observations.filter(t=>t.pendingAction).length;
    $('workspace-authority').textContent=isWorkspace()?`${observations.length!==snapshot.document.tracks.length||observations.some(t=>t.authority==null)?'Authority unavailable':overridden?`${overridden} Session override${overridden===1?'':'s'}`:'Arrangement'}${pending?` / ${pending} pending`:''}`:'Session playback';
    $('return-all').hidden=!isWorkspace();$('return-all').disabled=!snapshot.capabilities?.atomicTrackActions;
    renderClipControls();timeline?.render();audioSettings?.update();
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
  bind('return-all','Return all tracks to Arrangement',()=>clipAction({kind:'return',trackIds:model.snapshot().document.tracks.map(t=>t.id)}));
  for(const[id,key,label]of [['tempo','tempo','Change tempo'],['length','lengthBeats','Change length']])$(id).addEventListener('change',guard(()=>{const value=Number($(id).value);if($(id).value===''||!Number.isFinite(value))throw Error('Enter a valid number.');return edit(doc=>{doc[key]=value;},false,label);}));$('loop').addEventListener('change',guard(()=>{const value=$('loop').checked;return edit(doc=>{doc.loopEnabled=value;},false,'Change looping');}));
  bind('apply','Prepare / Apply',()=>{commitFocused();cancelGesture();return enqueue(async()=>{try{applySnapshot(await command('alive_apply'));}finally{await refresh();}selectedNote=null;trackKey=musicKey=parameterKey='';render();notice('Schedule prepared and applied. Start transport when ready.');});});
  bind('discard','Discard edits',()=>{cancelGesture();return enqueue(async()=>{applySnapshot(await command('alive_discard'));selectedNote=null;musicKey='';render();notice('Pending schedule edits discarded.');});});
  function history(direction){cancelGesture();return enqueue(async()=>{try{applySnapshot(await command('alive_history',{direction}));}finally{await refresh();}selectedNote=null;musicKey='';render();});}
  bind('undo','Undo pending edit',()=>history('undo'));bind('redo','Redo pending edit',()=>history('redo'));
  bind('add-note','Add note',()=>{const trackId=model.document().tracks[selected].id;if(model.document().format==='alive-session-v3'||isWorkspace()){const c=isWorkspace()?sourceOf():selectedClip();if(!c)throw Error('Create a clip first.');let note=null;for(let beat=0;beat+.25<=c.lengthBeats&&!note;beat+=.25)for(let pitch=60;pitch<=127;pitch++)if(!c.notes.some(n=>n.pitch===pitch&&n.beat<beat+.25&&n.beat+n.duration>beat)){note={beat,pitch,duration:.25,velocity:100};break;}if(!note)throw Error('No room for a note.');return isWorkspace()?workspaceEdit({kind:'noteCreate',sourceId:c.id,...note}):clipEdit({kind:'noteCreate',trackId,clipId:c.id,...note});}return edit(document=>{const notes=trackById(document,trackId).notes;let note=null;for(let beat=0;beat+.25<=document.lengthBeats&&!note;beat+=.25)for(let pitch=60;pitch<=127;pitch++)if(!notes.some(n=>n.pitch===pitch&&n.beat<beat+.25&&n.beat+n.duration>beat)){note={beat,pitch,duration:.25,velocity:100};break;}if(!note)throw Error('No room for a note. Move or delete an existing note.');notes.push(note);if(model.document().tracks[selected].id===trackId)selectedNote=notes.length-1;},true,'Add note');});
  bind('add-effect','Add effect',()=>structural(null,'add'));
  bind('edit-device','Edit selected device in Ultra',()=>{const instanceId=selectedInstance,origin=generation();return enqueue(()=>{if(generation()!==origin)throw Error('The originating device session changed.');return command('alive_editor',{instanceId});});});
  bind('add-lane','Add automation lane',()=>{if(!$('automation-target').value)throw Error('Select a device parameter first.');const trackId=model.document().tracks[selected].id,[instanceId,key]=JSON.parse($('automation-target').value);return edit(document=>{const track=trackById(document,trackId);if(!track.automation.some(l=>l.instanceId===instanceId&&l.key===key))track.automation.push({instanceId,key,enabled:false,points:[]});});});
  bind('add-track','Add instrument track',()=>{cancelGesture();return enqueue(async()=>{const result=isWorkspace()?await command('alive_workspace_track',{operation:{kind:'addMidi',path:null}}):await command('alive_device',{trackId:`track-${Date.now()}`,action:'load'});applySnapshot(result.snapshot??result);trackKey=musicKey=parameterKey='';render();});});
  const keydown=guard(event=>{if(event.defaultPrevented)return;if(event.key==='Escape'&&!$('alive-audio-settings').hidden){event.preventDefault();closeAudioSettings();return;}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();return file(event.shiftKey?'saveAs':'save');}if(event.code==='Space'&&!event.target.matches('input,select,button,summary')){event.preventDefault();return transport(model.snapshot()?.state.playing?'stop':'start');}});doc.addEventListener('keydown',keydown);
  let unlisten=null;
  if(win?.__TAURI__?.event?.listen)win.__TAURI__.event.listen('alive-close-requested',()=>{guard(()=>file('quit'))();}).then(fn=>{unlisten=fn;});
  win?.addEventListener('blur',cancelGesture);
  async function poll(){if(disposed)return;try{await enqueue(refresh,true);}catch{}if(!disposed)win.setTimeout(poll,80);}
  async function pollMeasurements(){
    if(disposed)return;
    if($('audio-details').open&&$('stream-measurements').open){
      try{const result=await invoke('alive_audio_diagnostics',{after:'0'});if(!disposed)$('stream-diagnostics').value=JSON.stringify(result);}
      catch(error){if(!disposed)$('stream-diagnostics').value=JSON.stringify({error:String(error)});}
    }
    if(!disposed)win.setTimeout(pollMeasurements,1000);
  }
  if(invoke)win.setTimeout(pollMeasurements,1000);
  if(invoke){enqueue(refresh,true).then(()=>notice('Ready. Select a clip to edit notes or automation.')).catch(()=>{});win.setTimeout(poll,80);}else notice('Open the native app with bash apps/alive/run.sh. This page does not synthesize audio.',true);
  return{model,refresh,dispose(){disposed=true;browser.dispose();transportOptions.dispose();masterProducer.dispose();workspace.dispose();timeline?.dispose();pianoView.dispose();win?.removeEventListener('blur',cancelGesture);unlisten?.();doc.removeEventListener('keydown',keydown);}};
}
if(globalThis.document)mountAlive();
