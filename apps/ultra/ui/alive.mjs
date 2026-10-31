import {mountPresentation} from './canvas-presentation-view.mjs';
import {createAlivePresentationHost} from './canvas-presentation-hosts.mjs';
import {point,beatAt,beatX,pitchAt,transformNote,velocityEdit,addNote,keyEdit,timeSelection,loopSelection,transformRegion} from './alive-piano.mjs';
import {mountClipView} from './alive-clip-view.mjs';
import {mountBrowser,deviceAdmissionReason} from './alive-browser.mjs';
import {mountDeviceDrop} from './alive-device-drop.mjs';
import {mountTransportOptions} from './alive-shell.mjs';
import {createAliveModel,nativeInteger,instrumentOf,actualDevices,sourceLength} from './alive-model.mjs';
import {mountAudioSettings} from './audio-settings.mjs';
import {mountWorkspace} from './alive-workspace.mjs';
import {workspaceMusicEdit} from './alive-workspace-edits.mjs';
import {mountTimeline,placementError} from './alive-timeline.mjs';
import {createMasterProducer,nativeInteger as masterInteger} from './alive-master.mjs';
import {createMidiPreview} from './alive-midi-preview.mjs';

export function mountAlive({doc=globalThis.document,win=globalThis.window,invoke=win?.__TAURI__?.core?.invoke}={}){
  const $=id=>doc.getElementById(id),make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const model=createAliveModel();let selected=0,selectedInstance=null,chainKey='',queue=Promise.resolve(),disposed=false,trackKey='',musicKey='',parameterKey='',laneKey='';
  let clipTimeSelection=null,regionPreview=null,stretchPreview=null,clipSelectionScope='',timeline,clipView,sourceSelection=null,activeEditSource=null;
  const workspace=mountWorkspace({doc,win,onNavigate:()=>{timeline?.cancel();timeline?.render();}});
  const transportOptions=mountTransportOptions(doc,{onClose:workspace.park,onOpen:workspace.restore});
  let selectedSlots=new Map(),selectionToken=0,selectedNote=null,gesture=null,preview=null,pianoGeometry=null,velocityCanceled=false,listRevision=0,scopeRevision=0,transportRequestKey='';
  let rootlessInstrumentButton=null;const trackViews=[],chainViews=[],parameterViews=new Map(),rackCache=new Map(),diagnostics=new Map();let audioSettings;
  let operationText=$('notice').textContent,operationError=false,noticeOwner=null,refreshError='',previewFailure='';
  function renderNotice(){$('notice').textContent=[operationText,previewFailure,refreshError&&`Refresh delayed: ${refreshError}`].filter(Boolean).join(' ');$('notice').title=$('notice').textContent;$('notice').classList.toggle('error',operationError||!!refreshError||!!previewFailure);}
  function notice(text,error=false,owner=null){operationText=String(text);operationError=error;noticeOwner=owner;renderNotice();}
  function enqueue(work,background=false){const result=queue.then(work);queue=result.catch(error=>{if(!background)notice(error,true);});return result;}
  function generation(){return model.snapshot()?.generation;}
  const audition=createMidiPreview({invoke,onError:error=>notice(error,true)});
  let keyPreviewPointer=null;
  function releaseAudition(){keyPreviewPointer=null;audition.release();}
  function adoptSnapshot(snapshot){
    const trackId=model.document()?.tracks[selected]?.id,origin=generation();
    const accepted=model.accept(snapshot);
    if(accepted&&origin===generation()&&trackId){
      const index=model.document().tracks.findIndex(track=>track.id===trackId);
      if(index>=0)selected=index;
    }
    return accepted;
  }
  function command(name,args={}){return invoke(name,{...args,generation:generation(),...(['alive_transport','alive_workspace_action','alive_launch_settings'].includes(name)?{preparationRevision:model.snapshot()?.preparationRevision}:{}),...(['alive_workspace_edit','alive_workspace_track','alive_audio_import','alive_history','alive_launch_settings','alive_file','alive_device'].includes(name)?{editRevision:model.snapshot()?.editRevision}:{})});}
  async function publicationCommand(name,args={}){
    const previousSerial=model.snapshot()?.midi?.publication?.serial;const result=await command(name,args);if(!result)return result;
    let snapshot=result.snapshot??result;adoptSnapshot(snapshot);render();
    const deadline=Date.now()+10000;
    while(snapshot.midi?.pending){
      if(Date.now()>deadline)throw Error('The musical edit is still waiting for playback. Check audio status before trying again.');
      await new Promise(resolve=>globalThis.setTimeout(resolve,20));
      snapshot=await current();adoptSnapshot(snapshot);render();
    }
    const publication=snapshot.midi?.publication;if(publication&&publication.serial!==previousSerial&&[4,6].includes(publication.status))throw Error(snapshot.notice??`The musical edit was refused (${publication.error}).`);
    return result.snapshot?{...result,snapshot}:snapshot;
  }
  function commitFocused(){if(doc.activeElement?.matches('input'))doc.activeElement.blur();}
  const guard=work=>(...args)=>{try{Promise.resolve(work(...args)).catch(error=>notice(error,true));}catch(error){notice(error,true);}};
  const deviceDrop=mountDeviceDrop({doc,win,scope:()=>{const snapshot=model.snapshot();return snapshot?{generation:snapshot.generation,editRevision:snapshot.editRevision,playing:!!snapshot.state.playing,pending:snapshot.midi.pending,deviceCount:model.document().tracks.reduce((n,t)=>n+actualDevices(t).length,0),maxDevices:snapshot.capabilities.maxDevices}:null;},track:id=>model.document()?.tracks.find(t=>t.id===id),onDrop:loadBrowserEntry,onError:error=>notice(error,true)});
  const browser=mountBrowser({doc,root:$('browser-library'),onNavigate:workspace.preserveFocused,onLoad:loadBrowserEntry,onSource:openBrowserSource,onDeviceDrag:deviceDrop.start,onDragEnd:deviceDrop.cancel,onCatalog:request=>invoke?invoke('alive_browser_catalog',{request}):Promise.reject('Open the native Alive app to browse the device library')});
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
  for(const[id,kind]of Object.entries({'toggle-browser':'browser','view-session':'session','view-arrangement':'arrangement','detail-devices':'devices','toggle-detail':'detail','add-track':'instrument','add-effect':'effect','new':'file','open':'file','save':'save','save-as':'save','edit-device':'edit','undo':'undo','redo':'redo'}))decorate($(id),kind,$(id).textContent);
  for(const[id,kind]of [['start','play'],['stop','stop']])decorate($(id),kind,id==='start'?'Start':'Stop',{only:true});
  const quantizations=[['none','None'],['thirtySecond','1/32'],['sixteenth','1/16'],['eighth','1/8'],['quarter','1/4'],['half','1/2'],['bar1','1 Bar'],['bar2','2 Bars'],['bar4','4 Bars'],['bar8','8 Bars']];
  const gridLabel=value=>quantizations.find(([key])=>key===value)?.[1]??'1 Bar';
  const effectiveGrid=id=>model.snapshot()?.launch?.clipQuantization?.find(o=>o.occurrenceId===id&&o.quantization!=='global')?.quantization??model.snapshot()?.launch?.globalQuantization??'bar1';
  for(const id of ['launch-quantization','clip-quantization']) {
    const select=$(id),options=id==='clip-quantization'?[['global','Global'],...quantizations]:quantizations;
    for(const[value,label]of options){const option=make('option','',label);option.value=value;select.append(option);}
    select.addEventListener('change',guard(()=>launchSetting(id==='launch-quantization'?{kind:'global',quantization:select.value}:{kind:'clip',occurrenceId:selectedClip()?.id,quantization:select.value})));
  }
  function launchSetting(edit){
    const origin=generation(),preparation=model.snapshot()?.preparationRevision;
    return enqueue(async()=>{
      if(origin!==generation()||preparation!==model.snapshot()?.preparationRevision)throw Error('The launch scope changed. Refresh and try again.');
      try{adoptSnapshot(await command('alive_launch_settings',{edit}));}catch(error){await refresh();throw error;}
      render();
    });
  }
  function renderLaunchSettings(snapshot){
    const available=!!snapshot.capabilities?.launchQuantization,global=$('launch-quantization'),clip=$('clip-quantization'),slot=selectedClip();
    const reason=snapshot.capabilities?.launchUnavailableReason??'Native launch quantization is unavailable; saved settings are retained.';
    const frames=snapshot.capabilities?.launchWindowFrames??1024;
    const help=`For grids other than 1 Bar, at most one batch is accepted per ${frames} audio frames (about ${(frames/48).toFixed(1)} ms at 48 kHz), sharing the Start/Seek allowance. Refused requests are not retried automatically. Queued requests keep their captured grid and target.`;
    global.disabled=false;
    global.value=snapshot.launch?.globalQuantization??'bar1';
    for(const option of global.children)option.disabled=!available&&option.value!=='bar1';
    global.title=available?`Quantization for new launches, scenes, track Stop and Return. ${help}`:`${reason} Select 1 Bar to change the global setting; clip overrides stay saved.`;
    $('launch-help').textContent=`${available?'':`${reason} Select 1 Bar to recover supported launches; change each clip override explicitly. `}${help}`;
    $('clip-launch-settings').hidden=!slot;
    if(!slot)return;
    clip.disabled=false;
    for(const option of clip.children)option.disabled=!available&&option.value!=='bar1'&&!(option.value==='global'&&global.value==='bar1');
    clip.value=snapshot.launch?.clipQuantization?.find(o=>o.occurrenceId===slot.id)?.quantization??'global';
    clip.title=available?'Changes affect future launches.':`${reason} Select 1 Bar, or Global when the global setting is 1 Bar.`;
    const runtime=snapshot.runtime?.tracks.find(t=>t.trackId===model.document().tracks[selected].id);
    const pending=snapshot.runtime?.requests.find(r=>r.requestSerial===runtime?.pendingSerial&&r.preparationRevision===snapshot.preparationRevision);
    $('clip-launch-status').textContent=`Effective: ${gridLabel(effectiveGrid(slot.id))}. ${pending?`Queued ${gridLabel(pending.quantization)}${pending.targetFrame?` at frame ${pending.targetFrame}`:''}. `:''}${available?'Changes affect future launches.':reason}`;
    $('clip-launch-status').title=$('clip-launch-status').textContent;
  }
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
    if(gesture||keyPreviewPointer!==null)releaseAudition();
    if(!gesture&&!preview)return;
    const old=gesture;if(old?.kind==='timeRange')clipTimeSelection=old.previousSelection;regionPreview=null;stretchPreview=null;if(old?.kind==='velocity')velocityCanceled=true;gesture=null;preview=null;
    const target=old?.captureTarget??$('piano-roll');
    if(old?.pointerId!==undefined&&target.hasPointerCapture?.(old.pointerId))target.releasePointerCapture(old.pointerId);
    musicKey='';render();
  }
  function sourceOf(track=model.document()?.tracks[selected],document=model.document()){return document?.sources?.find(s=>s.id===(sourceSelection?.trackId===track?.id?sourceSelection.sourceId:selectedClip(track)?.sourceId))??null;}
  function paintClipOverview(){
    const holder=$('clip-overview'),source=sourceOf(),notes=source?.kind==='midi'?source.notes??[]:[];
    holder.replaceChildren();holder.title=source?source.kind==='audio'?'Audio clip selected':`${notes.length} MIDI notes`:'No clip selected';
    const peaks=source?.kind==='audio'?model.snapshot()?.preparedWorkspaces?.sources?.find(item=>item.sourceId===source.id)?.waveformPeaks??[]:[];
    if(!notes.length&&!peaks.length)return;
    const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 44 10');svg.setAttribute('aria-hidden','true');
    if(notes.length){const length=Math.max(.01,sourceLength(source)),low=Math.min(...notes.map(n=>n.pitch)),high=Math.max(...notes.map(n=>n.pitch));
      for(const note of notes){const rect=doc.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',Math.max(0,Math.min(43,note.beat/length*44)));rect.setAttribute('y',8-(note.pitch-low)/Math.max(1,high-low)*7);rect.setAttribute('width',Math.max(1,Math.min(44,note.duration/length*44)));rect.setAttribute('height','1.5');svg.append(rect);}}
    else{const path=doc.createElementNS('http://www.w3.org/2000/svg','path');let d='';for(let x=0;x<44;x++){const peak=peaks[Math.min(peaks.length-1,Math.floor(x*peaks.length/44))];d+=`M${x} ${5-Math.min(1,Math.max(0,peak[1]))*4}V${5-Math.max(-1,Math.min(0,peak[0]))*4}`;}path.setAttribute('d',d);path.setAttribute('class','clip-overview-waveform');svg.append(path);}
    holder.append(svg);
  }
  function preparedSlots(snapshot=model.snapshot()){return snapshot.preparedWorkspaces.slots;}
  function slotIdentity(slot){return slot?.slotId;}
  function slotOf(track){return selectedSlots.get(track.id)??0;}
  function selectedClip(track=model.document()?.tracks[selected]){if(sourceSelection?.trackId===track?.id)return null;return track?.slots?.[slotOf(track)]??null;}
  function editorDocument(document=model.document()){
    if(!document)return document;
    const source=sourceOf(document.tracks[selected],document);
    return {...document,lengthBeats:source?sourceLength(source):document.lengthBeats,tracks:document.tracks.map(t=>{const source=sourceOf(t,document);return {...t,notes:source?.kind==='midi'?source.notes:[],automation:source?.automation??[],sourceId:source?.id??null,sourceKind:source?.kind??t.chain.kind,clipId:selectedClip(t)?.id??null};})};
  }
  function selectedNoteIndex(notes){return notes.findIndex(n=>n.id===selectedNote);}
  function listShape(document){return JSON.stringify([document.tracks.map(t=>[t.id,t.slots]),document.sources.map(s=>[s.id,s.kind,s.notes?.map(n=>n.id),s.automation.map(l=>[l.instanceId,l.key,l.points.length])])]);}
  function trackById(document,id){const track=document.tracks.find(track=>track.id===id);if(!track)throw Error('The originating track changed. Select it and try again.');const source=document.sources.find(s=>s.id===activeEditSource&&s.trackId===id);if(!source)throw Error('The originating source changed.');return source;}
  function noteAt(track,id){const at=track.notes.findIndex(n=>n.id===id);if(at<0||!track.notes[at])throw Error('The originating note changed.');return at;}
  // Accepted boundaries invalidate queued intent; ordinary edits keep their queue's scope.
  function invalidateScope(before){
    const current=model.snapshot();
    if(before&&before.generation!==current.generation)workspace.resetPreserved();
    if(before&&(before.generation!==current.generation||before.editRevision!==current.editRevision)){
      scopeRevision++;listRevision++;selectedNote=null;cancelGesture();timeline?.cancel();
    }
  }
  function applySnapshot(snapshot){const before=model.snapshot();adoptSnapshot(snapshot);invalidateScope(before);}
  function edit(change,context=null,indexed=false){
    const epoch=listRevision,scope=context?.scope??scopeRevision,clipId=context?.clipId??selectedClip()?.id??null;
    const sourceId=context?.sourceId??sourceOf()?.id??null,occurrence=context&&'occurrence' in context?context.occurrence:(sourceSelection?.occurrence?{...sourceSelection.occurrence}:null);
    return enqueue(async()=>{
      if(scope!==scopeRevision){musicKey='';render();throw Error('The score scope changed. Select it and try again.');}
      if((clipId?sourceId!==model.document().tracks.flatMap(t=>t.slots??[]).find(s=>s?.id===clipId)?.sourceId:occurrence?sourceId!==model.document().placements.find(p=>p.id===occurrence.placementId)?.sourceId:sourceId&&!model.document().sources.some(s=>s.id===sourceId))){musicKey='';render();throw Error('The originating source changed. Select it and try again.');}
      if(indexed&&epoch!==listRevision){musicKey='';render();throw Error('The note or automation list changed. Select it and try again.');}
      if(context?.revision!==undefined&&(generation()!==context.generation||(model.snapshot()?.editRevision)!==context.revision))throw Error('The score changed during this gesture. Try again.');
      const previous=model.document(),document=structuredClone(previous);activeEditSource=sourceId;try{change(document);}finally{activeEditSource=null;}
      try{const operation=workspaceMusicEdit(previous,document);if(operation){const result=await publicationCommand('alive_workspace_edit',{operation});adoptSnapshot(result.snapshot);}if(listShape(previous)!==listShape(model.document()))listRevision++;}
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
    if(gesture&&(snapshot.generation!==gesture.generation||snapshot.editRevision!==gesture.revision)){cancelGesture();selectedNote=null;musicKey='';}
    const before=model.snapshot();adoptSnapshot(snapshot);
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
    if(result)notice(action.startsWith('save')?'Session saved.':'Session ready.');
  });}
  function transport(action){
    const intent={generation:generation(),preparationRevision:model.snapshot()?.preparationRevision},beat=Number($('seek').value);
    if(action==='stop'&&model.snapshot()?.midi?.pending)return(async()=>{await invoke('alive_transport',{action:'stop',...intent});await refresh();notice('Transport stop requested.');})();
    return enqueue(async()=>{
      let result;
      if(action!=='stop'){
        if(action==='start')await invoke('alive_audio',{action:'start',generation:intent.generation});
        try{result=await invoke('alive_workspace_action',{action:action==='start'?{kind:'start'}:{kind:'seek',beat},...intent});}
        catch(error){await refresh();throw Error(`${error}. Audio may remain running silently.`);}
      }else result=await invoke('alive_transport',{action,beat,...intent});
      await refresh();
      if(result?.requestSerial){const observed=observedRequest(result);notice(`Transport ${requestText(observed,model.snapshot())}${observed.status==='rejected'?' Audio may remain running silently.':''}`,observed.status==='rejected','transport');}
      else notice(action==='start'?'Transport playing.':action==='stop'?'Transport stop requested.':'Transport seek queued.');
    });
  }
  function paintClip(notes,length){
    const original=sourceOf(),source=stretchPreview===null?original:{...original,sourceTempo:stretchPreview},ratio=stretchPreview===null?1:stretchPreview/original.sourceTempo,occurrence=editorOccurrence();
    const region=regionPreview??(occurrence?.region?{...occurrence.region,...Object.fromEntries(['start','end','loopStart','loopEnd'].map(k=>[k,occurrence.region[k]*ratio]))}:null);
    pianoGeometry=clipView.render({notes,length:length*ratio,selectedNote,kind:source?.kind??model.document().tracks[selected].chain.kind,source,canImport:!source&&!sourceSelection,waveformPeaks:model.snapshot()?.preparedWorkspaces.sources.find(s=>s.sourceId===source?.id)?.waveformPeaks,region,timeSelection:clipTimeSelection,scope:JSON.stringify([generation(),source?.id]),regionScope:JSON.stringify([generation(),model.document().tracks[selected].id,source?.id,sourceSelection?.occurrence??{kind:'slot',slotId:selectedClip()?.id}]),revision:model.snapshot()?.editRevision,frozenGeometry:gesture?.geometry});
  }
  let clipControlsKey='',slotViews=[],sceneViews=[];
  function sceneText(result,snapshot){
    const reason=({7:'command queue full',8:'receipt table busy',12:'optional work limit',13:'Stop canceled',14:'end canceled',15:'feature disabled',16:'runtime invariant',18:'replaced request'})[result.reason]??`native reason ${result.reason}`;
    const members=(result.members??[]).map(member=>`${snapshot.document.tracks.find(t=>t.id===member.trackId)?.name??member.trackId}: ${member.status}${member.action==='stop'?' (track Stop)':''}`).join(' / ');
    return `Scene ${result.sceneSlot+1} request ${result.requestSerial} ${result.status}${result.quantization?` (${gridLabel(result.quantization)})`:""}${result.targetFrame?` at frame ${result.targetFrame}`:''}. ${members}${result.reason?`. Request summary: ${reason}.`:''}${[7,8,12].includes(result.reason)?' Let audio advance before an explicit retry.':''}`;
  }
  function launchScene(slot){
    const intent={generation:generation(),preparationRevision:model.snapshot().preparationRevision,slot};
    return enqueue(async()=>{
      const result=await invoke('alive_workspace_action',{generation:intent.generation,preparationRevision:intent.preparationRevision,action:{kind:'scene',slot:intent.slot}});await refresh();
      if(result){const observed=observedRequest(result);notice(sceneText(observed,model.snapshot()),observed.status==='rejected');}
    });
  }
  function renderScenes(snapshot){
    if(!sceneViews.length)for(let slot=0;slot<4;slot++){
      const row=make('div','scene-row'),launch=make('button','scene-launch'),prepared=make('small','muted'),result=make('output','scene-result');
      decorate(launch,'play',String(slot+1));
      launch.setAttribute('aria-label',`Launch scene ${slot+1}`);launch.setAttribute('aria-describedby','scene-help');launch.addEventListener('click',guard(()=>launchScene(slot)));
      prepared.setAttribute('aria-label',`Scene ${slot+1} clips`);result.setAttribute('aria-label',`Scene ${slot+1} request`);
      const receipt=make('details','scene-receipt'),summary=make('summary','',`Scene ${slot+1}`);summary.setAttribute('aria-label',`Scene ${slot+1} receipt details`);receipt.append(summary,prepared,result);$('scene-receipts').append(receipt);
      row.append(launch);$('scene-controls').append(row);sceneViews.push({slot,launch,prepared,result});
    }
    for(const v of sceneViews){
      v.launch.disabled=!snapshot.capabilities?.atomicTrackActions;
      v.launch.title=v.launch.disabled?'Scene launch is unavailable':snapshot.audio.running?'Launch this scene':'Start Audio to launch a scene';
      v.prepared.textContent=snapshot.document.tracks.map(t=>`${t.name}: ${preparedSlots(snapshot).find(c=>c.trackId===t.id&&c.slot===v.slot)?.name??'Stop'}`).join(' / ');
      const request=snapshot.runtime?.requests.filter(r=>r.sceneSlot===v.slot).at(-1);
      v.result.textContent=request?sceneText(request,snapshot):'';
    }
  }
  function requestText(result,snapshot){
    const clip=preparedSlots(snapshot).find(c=>slotIdentity(c)===(result.slotId))?.name;
    const reason=({7:'command queue full',8:'receipt table busy',12:'optional work limit',5:'stale preparation',9:'empty slot',15:'feature disabled'})[result.reason]??`native reason ${result.reason}`;
    const members=(result.members??[]).map(m=>`${snapshot.document.tracks.find(t=>t.id===m.trackId)?.name??m.trackId}: ${m.status}`).join(' / ');
    return `request ${result.requestSerial} ${result.status}${result.quantization?` (${gridLabel(result.quantization)})`:""}${result.targetFrame?` at frame ${result.targetFrame}`:""}${clip?` for ${clip}`:''}${members?` / ${members}`:''}${result.reason?` (${reason}); prior playback or pending action is retained. Let audio advance before an explicit retry.`:''}`;
  }
  function observedRequest(result){return model.snapshot().runtime?.requests.find(r=>r.preparationRevision===result.preparationRevision&&r.requestSerial===result.requestSerial)??result;}
  function renderTransportRequest(snapshot){
    const request=snapshot.runtime?.requests.filter(r=>['start','seek'].includes(r.kind)).at(-1);
    if(!request){transportRequestKey='';return;}
    const key=JSON.stringify(request);if(key===transportRequestKey)return;transportRequestKey=key;
    if(noticeOwner==='transport')notice(`Transport ${requestText(request,snapshot)}`,request.status==='rejected','transport');
  }
  function clipAction(action){
    const intent={generation:generation(),preparationRevision:model.snapshot().preparationRevision};
    if(action.kind==='launch')action={kind:'launch',trackId:action.trackId,slotId:action.clipId??action.slotId};
    return enqueue(async()=>{const result=await invoke('alive_workspace_action',{action,...intent});await refresh();if(result){const observed=observedRequest(result);notice(requestText(observed,model.snapshot()),observed.status==='rejected');}});
  }
  function workspaceEdit(operation,selectResult=false){
    const scope=scopeRevision,token=selectionToken,origin=generation();
    const sourceTarget=typeof operation!=='function'&&['sourceRename','sourceLength','audioSourceTempo','noteCreate'].includes(operation.kind)?{sourceId:operation.sourceId,trackId:model.document().tracks[selected].id,slotId:selectedClip()?.id,placementId:sourceSelection?.occurrence?.placementId}:null;
    return enqueue(async()=>{if(scope!==scopeRevision||origin!==generation())throw Error('The source scope changed. Select it and try again.');
      if(sourceTarget){const d=model.document(),actual=sourceTarget.placementId?d.placements.find(p=>p.id===sourceTarget.placementId&&p.trackId===sourceTarget.trackId)?.sourceId:sourceTarget.slotId?d.tracks.find(t=>t.id===sourceTarget.trackId)?.slots.find(s=>s?.id===sourceTarget.slotId)?.sourceId:d.sources.find(s=>s.id===sourceTarget.sourceId&&s.trackId===sourceTarget.trackId)?.id;if(actual!==sourceTarget.sourceId)throw Error('The originating source changed. Select it and try again.');}
      const resolved=typeof operation==='function'?operation():operation;const result=await publicationCommand('alive_workspace_edit',{operation:resolved});if(!adoptSnapshot(result.snapshot))return result;listRevision++;
      if(token===selectionToken){const a=result.affected,track=model.document().tracks.find(t=>t.id===a.trackId);if(resolved.kind==='midiClipCreate')sourceSelection=null;if(selectResult&&resolved.kind!=='midiClipCreate'&&track&&a.sourceId&&(a.placementId||!sourceSelection||resolved.kind==='sourceCreateMidi'))sourceSelection={trackId:a.trackId,sourceId:a.sourceId,occurrence:a.placementId?{kind:'placement',placementId:a.placementId}:null};if(sourceSelection?.occurrence?.placementId){const p=model.document().placements.find(p=>p.id===sourceSelection.occurrence.placementId);sourceSelection={...sourceSelection,sourceId:p?.sourceId??sourceSelection.sourceId,occurrence:p?sourceSelection.occurrence:null};}if(a.slotId&&track){const slot=track.slots.findIndex(s=>s?.id===a.slotId);if(slot>=0)selectedSlots.set(a.trackId,slot);}selectedNote=a.noteId??null;}
      musicKey=clipControlsKey=trackKey='';render();return result;});
  }
  function workspaceSlotEdit(trackId,slotId,sourceId,changes){
    return workspaceEdit(()=>{
      const slot=model.document().tracks.find(t=>t.id===trackId)?.slots.find(s=>s?.id===slotId);
      if(!slot||slot.sourceId!==sourceId)throw Error('The originating slot or source changed. Select it and try again.');
      return{kind:'slotUpdate',trackId,slotId,name:slot.name,region:slot.region,...changes};
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
    const next={...p,...(typeof changes==='function'?changes(p):changes)},error=placementError(next,document.sources.find(s=>s.id===sourceId),document.placements,document.lengthBeats);if(error)throw Error(error);
    return{kind:'placementUpdate',placementId,start:next.start,duration:next.duration,region:next.region};
  });}
  function transportRange(changes){return workspaceEdit(()=>{const d=model.document();return{kind:'transportRange',tempo:d.tempo,lengthBeats:d.lengthBeats,loopEnabled:d.loopEnabled,loopStartBeats:d.loopStartBeats,loopEndBeats:d.loopEndBeats,...changes};});}
  // Park before timeline gestures focus the canvas or select another track.
  $('timeline-canvas').addEventListener('pointerdown',event=>{if(event.button===0&&event.target.closest?.('.timeline-track-name,.timeline-lane'))workspace.preserveFocused();},true);
  timeline=mountTimeline({doc,win,guard,notice,choose:chooseSource,edit:operation=>workspaceEdit(operation,true),placementEdit,transportRange,action:clipAction,preserves:element=>workspace.preserves(element),mix:(trackId,changes)=>mix(model.document().tracks.findIndex(t=>t.id===trackId),changes),
    state:()=>({snapshot:model.snapshot(),document:model.document(),trackId:model.document()?.tracks[selected]?.id,selection:sourceSelection,token:selectionToken})});
  function clipEdit(operation){
    const track=model.document().tracks.find(t=>t.id===operation.trackId),slot=track?.slots.find(s=>s?.id===operation.clipId),source=model.document().sources.find(s=>s.id===slot?.sourceId);
    const {kind,trackId,clipId,sourceId,...rest}=operation;
    if(kind==='create'){
      if(track?.chain.kind==='audio')return importAudio(trackId,rest.slot);
      return workspaceEdit({kind:'midiClipCreate',trackId,slot:rest.slot,name:`Clip ${rest.slot+1}`},true).then(result=>{workspace.openClip();return result;});
    }
    if(!slot||!source)throw Error('Select a MIDI source slot.');
    if(kind==='duplicate')return workspaceEdit({kind:'slotDuplicate',trackId,slotId:slot.id,...rest});
    if(kind==='delete')return workspaceEdit({kind:'slotDelete',trackId,slotId:slot.id});
    if(kind==='rename')return workspaceSlotEdit(trackId,slot.id,sourceId??source.id,{name:rest.name});
    if(kind==='length')return workspaceEdit({kind:'sourceLength',sourceId:source.id,...rest});
    if(kind==='noteCreate')return workspaceEdit({kind:'noteCreate',sourceId:source.id,...rest});
    throw Error('This clip operation is unavailable in workspaces.');
  }
  const creatingSlots=new Set(),trackWidths=new Map();let slotScrollers=[],slotScrollTop=0,scrollFadeTimer=null;
  function showScrolling(){for(const el of [...slotScrollers,$('scene-controls'),$('session-workspace')])el.classList.add('is-scrolling');clearTimeout(scrollFadeTimer);scrollFadeTimer=setTimeout(()=>{for(const el of [...slotScrollers,$('scene-controls'),$('session-workspace')])el.classList.remove('is-scrolling');scrollFadeTimer=null;},850);}
  function syncSlots(source){showScrolling();slotScrollTop=source.scrollTop;for(const scroller of [...slotScrollers,$('scene-controls')])if(scroller!==source&&scroller.scrollTop!==slotScrollTop)scroller.scrollTop=slotScrollTop;}
  function slotsRestore(bank){if(slotScrollTop)bank.children[0].scrollTop=slotScrollTop;}
  const sceneScroll=event=>syncSlots(event.currentTarget),sessionScroll=()=>showScrolling(),sessionWheel=event=>{const el=$('session-workspace');if(event.shiftKey&&event.deltaY&&el.scrollWidth>el.clientWidth){el.scrollLeft+=event.deltaY;event.preventDefault();}};
  $('scene-controls').addEventListener('scroll',sceneScroll);$('session-workspace').addEventListener('scroll',sessionScroll);$('session-workspace').addEventListener('wheel',sessionWheel,{passive:false});
  const globalWidth=event=>{for(const view of trackViews)if(!trackWidths.has(view.row.dataset.trackId))view.resize.setAttribute('aria-valuenow',event.target.value);};$('track-width').addEventListener('input',globalWidth);
  function buildSlots(bank,track,index){
    const slots=make('div','clip-slots'),actions=make('div','clip-bank-actions');slots.setAttribute('aria-label',`${track.name} clip slots`);slots.addEventListener('scroll',event=>syncSlots(event.currentTarget));slotScrollers.push(slots);bank.append(slots,actions);
    for(let slot=0;slot<4;slot++){
      const c=track.slots[slot],cell=make('div','clip-slot'),choose=make('button','clip-select',c?.name??''),launch=make('button','clip-launch'),status=make('small','sr-only');
      choose.setAttribute('aria-label',`Select ${track.name} slot ${slot+1}`);choose.addEventListener('pointerdown',()=>workspace.preserveFocused());choose.addEventListener('click',()=>{workspace.returnMusic();if(selected===index&&!sourceSelection&&slotOf(track)===slot){render();return;}cancelGesture();selected=index;sourceSelection=null;selectedSlots.set(track.id,slot);selectionToken++;selectedNote=null;musicKey=clipControlsKey='';render();});
      choose.title=c?.name??`Empty slot ${slot+1}. ${track.chain?.kind==='audio'?'Double-click to import a WAV file.':'Double-click to create a one-bar MIDI clip (Ctrl+Shift+M).'}`;
      choose.addEventListener('dblclick',guard(async()=>{
        const current=model.document().tracks[selected],key=`${track.id}:${slot}`;
        if(current?.id!==track.id||slotOf(current)!==slot||current.slots[slot]||creatingSlots.has(key))return;
        creatingSlots.add(key);try{await clipEdit({kind:'create',trackId:track.id,slot});}finally{creatingSlots.delete(key);}
      }));
      decorate(launch,'play','Launch',{only:true});
      launch.setAttribute('aria-label',`Launch ${track.name} ${c?.name??`slot ${slot+1}`}`);launch.disabled=!c;launch.addEventListener('click',guard(()=>clipAction({kind:'launch',trackId:track.id,clipId:c.id})));
      cell.dataset.slot=String(slot);cell.append(launch,choose,status);slots.append(cell);slotViews.push({trackId:track.id,slot,clipId:c?.id,cell,choose,launch,status});
    }
    const stop=make('button','track-stop');stop.setAttribute('aria-label',`Stop ${track.name} track`);decorate(stop,'stop','Stop track');stop.addEventListener('click',guard(()=>clipAction({kind:'stop',trackId:track.id})));actions.append(stop);{const back=make('button','track-return','Return');back.setAttribute('aria-label',`Return ${track.name} to Arrangement`);back.addEventListener('click',guard(()=>clipAction({kind:'return',trackIds:[track.id]})));actions.append(back);}
    const receipt=make('details','runtime-receipt'),summary=make('summary','','Runtime'),state=make('output','clip-runtime');state.setAttribute('aria-label',`${track.name} clip runtime`);summary.setAttribute('aria-label',`${track.name} runtime details`);receipt.append(summary,state);actions.append(receipt);slotViews.push({trackId:track.id,state,summary});
  }
  function renderWorkspaceControls(snapshot,document,track,container){
    const slot=selectedClip(track),source=sourceOf(track,document),prepared=snapshot.preparedWorkspaces;
    $('clip-bank-notice').textContent=snapshot.notice??(source?.kind==='audio'?`Warp / Re-Pitch / ${source.sourceTempo} BPM`:source?'Drag blank time to select. Ctrl+L loops the selection.':'');
    $('clip-bank-notice').title=$('clip-bank-notice').textContent;
    $('add-note').disabled=source?.kind!=='midi';$('add-note').hidden=source?.kind!=='midi';$('add-lane').disabled=!source||!automationTargets().length;
    for(const v of slotViews){
      const observation=snapshot.runtime?.tracks.find(t=>t.trackId===v.trackId),current=document.tracks.find(t=>t.id===v.trackId);
      const active=prepared?.sources.find(s=>s.sourceId===observation?.activeSourceId),activeSlot=prepared?.slots.find(s=>s.slotId===observation?.activeSlotId);
      const authority=observation?.authority==='session'?'Session':observation?.authority==='arrangement'?'Arrangement':'Unavailable';
      if(v.state){const deleted=activeSlot&&!current?.slots.some(s=>s?.id===activeSlot.slotId),last=snapshot.runtime?.requests.filter(r=>r.members?.some(m=>m.trackId===v.trackId)).at(-1);v.state.textContent=`${authority}: ${active?`${snapshot.state.playing?'Playing':'Cued'} ${activeSlot?.name??active.name}${deleted?' (removed)':''}`:authority==='Session'?'Session silence':authority==='Arrangement'?'Arrangement gap':'observation unavailable'}${observation?.pendingAction?` / pending ${observation.pendingAction} (${observation.pendingAuthority}) at frame ${observation.pendingFrame}`:''}${last?` / ${requestText(last,snapshot)}`:''}`;v.summary.textContent=authority;v.summary.title=v.state.textContent;continue;}
      const currentSlot=current?.slots[v.slot],installed=prepared?.slots.find(s=>s.slotId===v.clipId),playing=!!v.clipId&&observation?.activeSlotId===v.clipId,pending=!!v.clipId&&observation?.pendingSlotId===v.clipId;
      v.choose.setAttribute('aria-pressed',String(track.id===v.trackId&&!sourceSelection&&slotOf(track)===v.slot));v.launch.disabled=!installed;v.launch.title=installed?`Launch: ${gridLabel(effectiveGrid(v.clipId))}`:'Waiting for the musical edit to reach playback';
      for(const [name,on] of Object.entries({occupied:!!currentSlot,empty:!currentSlot,selected:track.id===v.trackId&&!sourceSelection&&slotOf(track)===v.slot,playing:playing&&!!snapshot.state.playing,cued:playing&&!snapshot.state.playing,pending}))v.cell.classList.toggle(name,on);
      v.status.textContent=[playing?`${snapshot.state.playing?'Playing':'Cued'} ${installed?.name}`:'',pending?'Pending launch':''].filter(Boolean).join(' / ');
    }
    const key=JSON.stringify([snapshot.generation,track.id,slotOf(track),slot,source?.id,source?.name,source?.lengthBeats,sourceSelection,document.sources.map(s=>[s.id,s.name]),document.placements.map(p=>[p.id,p.sourceId])]);if(key===clipControlsKey)return;clipControlsKey=key;container.replaceChildren();
    const heading=make('span','clip-control-heading',slot?.name??source?.name??`Empty ${track.chain.kind==='audio'?'Audio':'MIDI'} slot ${slotOf(track)+1}`),advanced=make('details','clip-source-actions'),summary=make('summary','','Source / Clip');heading.title=heading.textContent;container.append(heading,advanced);container=make('div','clip-source-actions-body');advanced.append(summary,container);
    const button=(label,fn)=>{const b=make('button','',label);b.setAttribute('aria-label',label);b.addEventListener('click',guard(fn));container.append(b);return b;};
    const sources=make('select');sources.setAttribute('aria-label',track.chain.kind==='midi'?'MIDI source':'Audio source');
    const empty=make('option','','Choose source');empty.value='';sources.append(empty);
    for(const item of document.sources.filter(s=>s.trackId===track.id)){const option=make('option','',item.name);option.value=item.id;sources.append(option);}sources.value=source?.id??'';
    sources.addEventListener('change',()=>chooseSource({trackId:track.id,sourceId:sources.value||null,occurrence:null}));container.append(sources);
    const createSource=button('Create MIDI source',()=>{const range=timeline.getRange();return workspaceEdit({kind:'sourceCreateMidi',trackId:track.id,name:`MIDI ${document.sources.filter(s=>s.trackId===track.id).length+1}`,lengthBeats:range.duration},true);});createSource.hidden=track.chain.kind!=='midi';
    button('Place source in range',()=>{const range=timeline.getRange();if(!source)throw Error('Choose or create a MIDI source first.');return workspaceEdit({kind:'placementCreate',trackId:track.id,sourceId:source.id,start:range.start,duration:range.duration,region:{start:0,end:sourceLength(source),loopStart:0,loopEnd:sourceLength(source),loopEnabled:true}},true);}).disabled=!source;
    if(sourceSelection?.trackId===track.id){
      if(!source){container.append(make('span','muted','Choose or create a source; drag a blank timeline range, then Place.'));return;}
      const references=document.tracks.reduce((n,t)=>n+t.slots.filter(s=>s?.sourceId===source.id).length,0)+document.placements.filter(p=>p.sourceId===source.id).length;
      container.append(make('span','source-scope',`${references} references. Source content and automation edit every reference.`));
      const name=make('input');name.value=source.name;name.setAttribute('aria-label','MIDI source name');name.addEventListener('change',guard(()=>workspaceEdit({kind:'sourceRename',sourceId:source.id,name:name.value})));const nameLabel=make('label','','Source name');nameLabel.append(name);container.append(nameLabel);
      if(source.kind==='midi'){const lengthLabel=make('label');lengthLabel.append(make('span','','Source length'),numeric('MIDI source length',source.lengthBeats,{min:1/64,max:256},lengthBeats=>workspaceEdit({kind:'sourceLength',sourceId:source.id,lengthBeats})),make('span','muted','beats'));container.append(lengthLabel);}
      const destination=make('select');destination.setAttribute('aria-label','Assign source to Session slot');track.slots.forEach((s,i)=>{if(!s){const option=make('option','',`Slot ${i+1}`);option.value=String(i);destination.append(option);}});destination.value=destination.children[0]?.value??'';container.append(destination);
      button('Assign source to Session',()=>workspaceEdit({kind:'slotAssign',trackId:track.id,slot:Number(destination.value),sourceId:source.id,name:source.name,region:{start:0,end:sourceLength(source),loopStart:0,loopEnd:sourceLength(source),loopEnabled:true}})).disabled=!destination.children.length;
      return;
    }
    if(!slot){button(track.chain.kind==='audio'?'Import WAV...':'Create clip',()=>clipEdit({kind:'create',trackId:track.id,slot:slotOf(track)}));container.append(make('span','muted',`Empty slot ${slotOf(track)+1}`));return;}
    if(!source){container.append(make('span','muted','Source unavailable'));return;}
    if(source.kind==='audio')container.append(make('span','source-scope',`Warp / Re-Pitch / ${source.sourceTempo} BPM / ${(Number(source.file.frames)/source.file.sampleRate).toFixed(2)} s / ${source.file.channels} ch`));
    const references=document.tracks.reduce((n,t)=>n+t.slots.filter(s=>s?.sourceId===source.id).length,0)+document.placements.filter(p=>p.sourceId===source.id).length;
    container.append(make('span','source-scope',`${source.name} / shared source: ${references} references. Source content and automation edit every reference.`));
    const name=make('input');name.value=slot.name;name.setAttribute('aria-label','Clip name');name.maxLength=64;name.addEventListener('change',guard(()=>clipEdit({kind:'rename',trackId:track.id,clipId:slot.id,sourceId:source.id,name:name.value})));const nameLabel=make('label','','Clip name');nameLabel.append(name);container.append(nameLabel);
    const destination=make('select');destination.setAttribute('aria-label','Duplicate destination');track.slots.forEach((s,i)=>{if(!s){const option=make('option','',`Slot ${i+1}`);option.value=String(i);destination.append(option);}});destination.value=destination.children[0]?.value??'';container.append(destination);
    button('Duplicate clip',()=>workspaceEdit({kind:'slotDuplicate',trackId:track.id,slotId:slot.id,destinationSlot:Number(destination.value)})).disabled=!destination.children.length;
    button('Make source independent',()=>workspaceEdit({kind:'sourceIndependent',occurrence:{kind:'slot',trackId:track.id,slotId:slot.id}}));
    button('Delete clip',()=>workspaceEdit({kind:'slotDelete',trackId:track.id,slotId:slot.id}));
  }
  function renderClipControls(){
    const snapshot=model.snapshot(),document=model.document();
    renderScenes(snapshot);renderWorkspaceControls(snapshot,document,document.tracks[selected],$('clip-controls'));
  }
  function buildTracks(document){
    $('tracks').replaceChildren();trackViews.length=0;slotViews=[];slotScrollers=[];
    document.tracks.forEach((track,index)=>{
      const row=make('article','track'),name=make('button','track-name'),title=make('span','',`${index+1}  ${track.name}`),detail=make('small','',`${(track.notes?.length??0)} notes / stereo`);
      name.append(title,detail);name.addEventListener('pointerdown',()=>workspace.preserveFocused());name.setAttribute('aria-label',`Select ${track.name} track`);name.title=track.name;
      const choose=()=>{workspace.returnMusic();if(selected!==index){cancelGesture();selectedNote=null;selectionToken++;selected=index;selectedInstance=null;musicKey=parameterKey='';}render();};name.addEventListener('click',choose);
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
          if(action==='editor')await command('alive_editor',{instanceId:instrumentOf(track)?.instanceId});else{const result=action==='remove'?await publicationCommand('alive_workspace_track',{operation:{kind:'remove',trackId:track.id}}):await command('alive_device',{trackId:track.id,instanceId:instrumentOf(track)?.instanceId,action});applySnapshot(result.snapshot??result);trackKey=musicKey=parameterKey='';render();notice('Device updated.');}
        });}));actions.append(button);
      }
      row.dataset.trackId=track.id;row.style.setProperty('--track-color',track.color??['#efbb62','#88c5c7','#91b9ed','#d8a0a7','#b4c98b','#d3b48a','#a5b9ce','#c5b6cf'][index%8]);
      const resize=make('div','track-width-handle');resize.setAttribute('role','separator');resize.tabIndex=0;resize.setAttribute('aria-label',`Resize ${track.name} track`);resize.setAttribute('aria-orientation','vertical');resize.setAttribute('aria-valuemin','72');resize.setAttribute('aria-valuemax','280');
      const applyWidth=value=>{const width=Math.max(72,Math.min(280,Math.round(value)));trackWidths.set(track.id,width);row.style.setProperty('--individual-track-width',`${width}px`);resize.setAttribute('aria-valuenow',String(width));};
      const initialWidth=trackWidths.get(track.id);if(initialWidth)applyWidth(initialWidth);else resize.setAttribute('aria-valuenow',$('track-width').value||'128');
      let resizing=null;resize.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();resizing={id:event.pointerId,x:event.clientX,width:row.getBoundingClientRect().width};resize.setPointerCapture?.(event.pointerId);});
      resize.addEventListener('pointermove',event=>{if(resizing?.id===event.pointerId)applyWidth(resizing.width+event.clientX-resizing.x);});
      resize.addEventListener('pointerup',event=>{if(resizing?.id===event.pointerId){resizing=null;resize.releasePointerCapture?.(event.pointerId);}});
      resize.addEventListener('pointercancel',event=>{if(resizing?.id===event.pointerId){applyWidth(resizing.width);resizing=null;}});
      resize.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const current=row.getBoundingClientRect().width;applyWidth(event.key==='Home'?72:event.key==='End'?280:current+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?20:8));});
      const mixer=make('div','track-mixer'),toggles=make('div','mixer-toggles'),inspector=make('details','track-inspector'),summary=make('summary','','Device / track');
      const strip=make('div','mixer-strip'),midiOnly=make('div','midi-only-status','MIDI only');midiOnly.title='MIDI event activity is not available in this build.';strip.append(fader,meters);toggles.append(mute,solo);mixer.append(gainLabel,strip,midiOnly,toggles);inspector.append(summary,actions);
      row.append(name,resize);const bank=make('div','clip-bank');row.append(bank);buildSlots(bank,track,index);row.append(mixer,inspector);$('tracks').append(row);slotsRestore(bank);trackViews.push({row,name,resize,detail,gain,gainLabel,strip,mixer,midiOnly,fader,faderEditing:()=>faderEditing,mute,solo,bar,readout,actions});
    });
  }
  function chainDevices(track=model.document().tracks[selected]){return actualDevices(track);}
  function instanceView(id){return model.snapshot().deviceInstances[id];}
  function instanceName(reference,index){const isInstrument=reference.instanceId===instrumentOf(model.document().tracks[selected])?.instanceId,effect=index+(instrumentOf(model.document().tracks[selected])?0:1);return `${instanceView(reference.instanceId)?.manifest.name??'Device'}${isInstrument?' instrument':` effect ${effect}`}`;}
  function structural(reference,action,beforeInstanceId){
    commitFocused();cancelGesture();selectedNote=null;
    const trackId=model.document().tracks[selected].id,instanceId=reference?.instanceId,origin=generation();
    return enqueue(async()=>{if(generation()!==origin)throw Error('The originating device session changed.');const snapshot=await command('alive_device',{trackId,instanceId,action,...(action==='reorder'?{beforeInstanceId}: {})});applySnapshot(snapshot);trackKey=musicKey=parameterKey=chainKey='';render();notice('Device chain updated.');});
  }
  function loadBrowserEntry(entry,destination=null){
    const intent=destination?.intent??{generation:generation(),editRevision:model.snapshot()?.editRevision},trackId=destination?.trackId??model.document().tracks[selected].id,token=selectionToken;
    cancelGesture();releaseAudition();
    return enqueue(async()=>{
      const unavailable=deviceAdmissionReason(entry);if(unavailable)throw Error(unavailable);
      if(generation()!==intent.generation||(model.snapshot()?.editRevision)!==intent.editRevision)throw Error('The originating session changed. Select the browser entry again.');
      const current=model.document().tracks.find(track=>track.id===trackId);if(!current)throw Error('The destination track was removed. Select a track and load the device again.');
      if(model.snapshot().state.playing)throw Error('Stop transport before loading a device.');
      if(model.snapshot().midi.pending)throw Error('Wait for the musical edit to finish before loading a device.');
      let result,targetId=trackId;const previousIds=new Set(actualDevices(current).map(d=>d.instanceId));
      if(entry.kind==='instrument'){
        if(destination&&current.chain.kind!=='midi')throw Error('Drop instruments onto a MIDI track. Audio tracks accept audio effects.');
        const replace=destination&&instrumentOf(current);
        const newTrack=!destination&&(current.chain.kind!=='midi'||instrumentOf(current)),trackIds=new Set(model.document().tracks.map(track=>track.id));
        result=await command('alive_device',{trackId,instanceId:replace?.instanceId??null,action:newTrack?'loadNewTrack':replace?'replace':'load',path:entry.path});
        if(newTrack)targetId=result.document.tracks.find(track=>!trackIds.has(track.id))?.id??trackId;
      }else result=await command('alive_device',{trackId,action:'add',path:entry.path,...(destination?{beforeInstanceId:destination.beforeInstanceId}: {})});
      const selectedTrackId=model.document().tracks[selected]?.id;
      applySnapshot(result.snapshot??result);
      if(token===selectionToken){selected=Math.max(0,model.document().tracks.findIndex(t=>t.id===targetId));sourceSelection=null;selectedInstance=actualDevices(model.document().tracks[selected]).find(d=>!previousIds.has(d.instanceId))?.instanceId??null;selectionToken++;workspace.openDevices();}
      else{const index=model.document().tracks.findIndex(track=>track.id===selectedTrackId);if(index>=0)selected=index;}
      trackKey=musicKey=parameterKey=chainKey='';render();notice(`${entry.name} loaded. Transport remains stopped.`);
    });
  }
  function openBrowserSource(entry){
    const document=model.document(),index=document.tracks.findIndex(track=>track.id===entry.trackId);
    if(index<0||!document.sources.some(source=>source.id===entry.sourceId&&source.trackId===entry.trackId))throw Error('This clip is no longer in the project. Search again.');
    cancelGesture();selected=index;selectedInstance=null;selectedNote=null;selectionToken++;
    sourceSelection={trackId:entry.trackId,sourceId:entry.sourceId,occurrence:null};
    musicKey=clipControlsKey='';workspace.openClip();render();
  }
  function discardRack(key,cached){for(const view of cached.parameters.values()){workspace.discardPreserved([...view.panel.querySelectorAll('input,select')]);view.surface.dispose();view.host.dispose();}rackCache.delete(key);}
  function buildChain(){
    const track=model.document().tracks[selected],devices=chainDevices(track);
    rootlessInstrumentButton=null;$('chain-title').textContent=`${track.name} chain`;
    const cacheKey=JSON.stringify([generation(),track.id,track.name,devices.map(d=>[d.instanceId,d.path,d.sourceSha256,d.id,d.version])]);
    // Keep mounted control nodes per track so navigation preserves unfinished fields.
    for(const [key,cached]of rackCache)if(cached.generation!==generation()||(cached.trackId===track.id&&key!==cacheKey))discardRack(key,cached);
    const cached=rackCache.get(cacheKey);$('chain').replaceChildren();chainViews.length=0;parameterViews.clear();
    if(cached){$('chain').append(...cached.nodes);chainViews.push(...cached.views);for(const [key,view]of cached.parameters)parameterViews.set(key,view);rootlessInstrumentButton=cached.load;$('chain').dataset.trackId=track.id;return;}
    $('chain').dataset.trackId=track.id;
    if(track.chain?.kind==='midi'&&!instrumentOf(track)){const load=make('button','','Load instrument...');load.setAttribute('aria-label','Load instrument');load.disabled=!!model.snapshot().state.playing;load.title=load.disabled?'Stop transport to load an instrument':'Choose a saved Ultra instrument';load.addEventListener('click',guard(()=>structural(null,'load')));$('chain').append(load);rootlessInstrumentButton=load;}
    devices.forEach((reference,index)=>{
      const name=instanceName(reference,index),context=`${track.name} ${name}`,row=make('div','chain-device'),choose=make('button','chain-select',name),bypass=make('button','','Bypass'),actions=[];
      row.dataset.instanceId=reference.instanceId;row.setAttribute('role','group');row.setAttribute('aria-label',context);
      const header=make('header','device-card-header'),tools=make('div','device-card-actions');
      choose.setAttribute('aria-label',`Select ${context}`);choose.addEventListener('pointerdown',()=>workspace.preserveFocused());choose.addEventListener('click',()=>{selectedInstance=reference.instanceId;parameterKey='';render();});
      bypass.setAttribute('aria-label',`Bypass ${context}`);const isInstrument=reference.instanceId===instrumentOf(track)?.instanceId;bypass.disabled=isInstrument;bypass.title=isInstrument?'Only effects support bypass. Use track mute to silence this track.':'Live bypass keeps the device state warm; audio output stays open.';
      bypass.addEventListener('click',guard(()=>{const instanceId=reference.instanceId,bypassed=!chainDevices().find(d=>d.instanceId===instanceId).bypassed,origin=generation();return enqueue(async()=>{if(generation()!==origin)throw Error('The originating device session changed.');await command('alive_bypass',{instanceId,bypassed});await refresh();});}));
      header.append(choose,bypass);row.append(header);
      const action=(label,aria,fn,blocked=false)=>{const button=make('button','',label);button.setAttribute('aria-label',aria);button.addEventListener('click',guard(fn));tools.append(button);actions.push({button,blocked});};
      action('Replace...',`Replace ${context}`,()=>structural(reference,'replace'));
      if(!isInstrument){
        action('Earlier',`Move ${context} earlier`,()=>structural(reference,'reorder',devices[index-1].instanceId),index===(instrumentOf(track)?1:0));
        action('Later',`Move ${context} later`,()=>structural(reference,'reorder',devices[index+2]?.instanceId??null),index===devices.length-1);
        action('Remove',`Remove ${context}`,()=>structural(reference,'remove'));
      }
      const editor=make('button','','Edit in Ultra');editor.setAttribute('aria-label',`Edit ${context} in Ultra`);editor.addEventListener('click',guard(()=>openDevice(reference.instanceId)));tools.replaceChildren(editor,...tools.children);
      const path=make('div','device-card-path',reference.path);path.title=reference.path;
      row.append(buildParameters(reference.instanceId),tools,path);
      $('chain').append(row);chainViews.push({row,choose,bypass,reference,actions});
    });
    const tail=make('div','chain-drop-tail',track.chain.kind==='midi'&&!instrumentOf(track)?'Drop an instrument or audio effect here':'Drop audio effects here');tail.setAttribute('role','group');tail.setAttribute('aria-label','Device chain drop area');$('chain').append(tail);
    rackCache.set(cacheKey,{generation:generation(),trackId:track.id,nodes:[...$('chain').children],views:[...chainViews],parameters:new Map(parameterViews),load:rootlessInstrumentButton});
  }
  function automationTargets(){
    return chainDevices().flatMap((reference,index)=>(instanceView(reference.instanceId)?.manifest?.parameters??[]).map(binding=>({instanceId:reference.instanceId,binding,label:reference.instanceId===instrumentOf(model.document().tracks[selected])?.instanceId?binding.label:`${instanceName(reference,index)} / ${binding.label}`})));
  }
  function mix(track,changes){const trackId=model.snapshot().document.tracks[track].id,origin=generation();return enqueue(async()=>{if(generation()!==origin)throw Error('The originating mixer session changed.');const index=model.snapshot().document.tracks.findIndex(t=>t.id===trackId);if(index<0)throw Error('The originating track was removed.');const current=model.snapshot().document.tracks[index];await invoke('alive_mixer',{generation:origin,trackId,track:index,gain:changes.gain??current.gain,mute:changes.mute??current.mute,solo:changes.solo??current.solo});await refresh();});}
  function buildMusic(document){
    const track=document.tracks[selected],trackId=track.id,clipId=track.clipId,sourceId=track.sourceId,occurrence=sourceSelection?.trackId===trackId?sourceSelection.occurrence:null,scope=scopeRevision;const editClip=(change,indexed=false)=>edit(change,{clipId,sourceId,occurrence,scope},indexed);$('clip-title').textContent=`${track.name} / ${sourceOf()?.name??'Choose a source'}`;
    $('clip-detail').classList.toggle('empty-source',!sourceOf());$('piano-roll').parentElement?.classList?.toggle('audio-source',track.sourceKind==='audio');paintClip(preview??track.notes??[],document.lengthBeats);$('notes').replaceChildren();
    (track.notes??[]).forEach((note,index)=>{
      const row=make('tr');for(const[key,bounds]of [['beat',{min:0,max:document.lengthBeats,step:.25}],['pitch',{min:0,max:127,step:1}],['duration',{min:1/64,max:document.lengthBeats,step:.25}],['velocity',{min:1,max:127,step:1}]]){
        const cell=make('td'),input=numeric(`Note ${index+1} ${key}`,note[key],bounds,value=>editClip(doc=>{trackById(doc,trackId).notes[noteAt(trackById(doc,trackId),note.id)][key]=value;}));cell.append(input);row.append(cell);
      }
      const remove=make('button','','Remove'),cell=make('td');remove.setAttribute('aria-label',`Remove note ${index+1}`);remove.addEventListener('click',guard(()=>{if(model.document().tracks[selected].id===trackId)selectedNote=null;return editClip(doc=>trackById(doc,trackId).notes.splice(noteAt(trackById(doc,trackId),note.id),1));}));cell.append(remove);row.append(cell);$('notes').append(row);
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
      enable.addEventListener('change',guard(()=>{const checked=enable.checked;return editClip(doc=>{ensure(doc).enabled=checked;});}));
      add.addEventListener('click',guard(()=>editClip(doc=>{const points=ensure(doc).points,last=points.at(-1)?.beat??-1;const beat=last<0?0:Math.min((trackById(doc,trackId).lengthBeats??doc.lengthBeats)-.015625,last+1);if(beat<=last)throw Error('Move or remove the final point to make room before the clip end.');points.push({beat,value:instanceView(instanceId).manifest.parameters.find(p=>p.key===key).base});})));
      const graph=svgElement('svg',{class:'lane-graph','aria-label':`${laneLabel} step automation`,role:'img'}),points=make('div','lane-points');
      if(!lane?.points.length)points.append(make('span','lane-empty','No points. Base value applies.'));
      (lane?.points??[]).forEach((point,index)=>{
        const group=make('div','lane-point'),beat=numeric(`${laneLabel} point ${index+1} beat`,point.beat,{min:0,max:document.lengthBeats,step:.25},value=>editClip(doc=>{ensure(doc).points[index].beat=value;},true)),value=numeric(`${laneLabel} point ${index+1} value`,point.value,{min:binding.min,max:binding.max,step:binding.integral?1:'any'},value=>editClip(doc=>{ensure(doc).points[index].value=value;},true)),remove=make('button','','x');
        remove.setAttribute('aria-label',`Remove ${laneLabel} point ${index+1}`);remove.addEventListener('click',guard(()=>editClip(doc=>ensure(doc).points.splice(index,1),true)));group.append(beat,value,remove);points.append(group);
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
  function buildParameters(instanceId){
    const device=instanceView(instanceId)?.manifest,panel=make('div','device-controls');
    if(!device?.presentation)return panel;
    const host=createAlivePresentationHost({instanceId,getSnapshot:()=>model.snapshot(),writeBase:(request,assert,assertValue)=>enqueue(async()=>{assert();assertValue();await invoke('alive_base',request);assert();await refresh();assert();})});
    const surface=mountPresentation({doc,root:panel,presentation:device.presentation,host,mode:'performance',onError:error=>notice(error,true)});
    parameterViews.set(instanceId,{instanceId,panel,host,surface});
    return panel;
  }
  const piano=$('piano-roll'),audioWaveform=$('audio-waveform'),velocity=$('note-velocity');
  clipView=mountClipView({doc,win,svg:piano,audioSvg:audioWaveform,onImport:guard(()=>importAudio(model.document().tracks[selected].id,slotOf(model.document().tracks[selected]))),onStretch:stretchAudio,onNavigate:()=>{releaseAudition();cancelGesture();},onPark:workspace.park,onRestore:workspace.restore,onStash:workspace.stashPreserved,onRecall:workspace.recallPreserved,isDraft:workspace.preserves,onGeometry:g=>{pianoGeometry=g;},onPreview:enabled=>{audition.enabled(enabled);render();},onRegion:guard(changeRegion),onLoopSelection:guard(loopClipSelection),onError:error=>notice(error,true)});
  function stretchAudio(sourceTempo,sourceId=sourceOf()?.id){const source=sourceOf();if(source?.kind!=='audio'||source.id!==sourceId)throw Error('Select the audio sample again.');if(!Number.isFinite(sourceTempo)||sourceTempo<30||sourceTempo>240)throw Error('Re-Pitch requires a source tempo from 30 to 240 BPM.');clipTimeSelection=null;return workspaceEdit({kind:'audioSourceTempo',sourceId:source.id,sourceTempo});}
  function editorOccurrence(){return sourceSelection?.occurrence?.placementId?model.document()?.placements.find(p=>p.id===sourceSelection.occurrence.placementId):selectedClip();}
  function regionIntent(){const source=sourceOf(),slot=selectedClip(),p=sourceSelection?.occurrence;return source&&editorOccurrence()?{sourceId:source.id,occurrence:p??{kind:'slot',trackId:model.document().tracks[selected].id,slotId:slot.id}}:null;}
  function setRegion(intent,change){if(!intent)throw Error('Select a clip occurrence first.');return workspaceEdit(()=>{
    const o=intent.occurrence,current=o.kind==='slot'?model.document().tracks.find(t=>t.id===o.trackId)?.slots.find(s=>s?.id===o.slotId):model.document().placements.find(p=>p.id===o.placementId);
    if(!current||current.sourceId!==intent.sourceId)throw Error('The originating slot or source changed. Select it and try again.');
    return{kind:'regionSet',occurrence:o,region:typeof change==='function'?change(current.region):change};
  });}
  function changeRegion(key,value){const intent=regionIntent();return setRegion(intent,region=>key==='loopLength'?{...region,loopEnd:region.loopStart+value}:key==='loopStart'?{...region,loopStart:value,loopEnd:value+region.loopEnd-region.loopStart}:{...region,[key]:value});}
  function loopClipSelection(){if(!clipTimeSelection)throw Error('Drag a time range in the clip first.');const selection={...clipTimeSelection};return setRegion(regionIntent(),region=>loopSelection(region,selection));}
  function context(){return {sourceId:sourceOf()?.id,occurrence:sourceSelection?.occurrence,trackId:model.document().tracks[selected].id,clipId:selectedClip()?.id??null,noteId:selectedNote,scope:scopeRevision,generation:generation(),revision:model.snapshot()?.editRevision};}
  function paintSelection(){paintClip(preview??editorDocument().tracks[selected].notes??[],editorDocument().lengthBeats);render();}
  for(const piano of [$('piano-roll'),audioWaveform]){
  piano.addEventListener('pointerdown',guard(event=>{
    if(event.button!==0||gesture||!sourceOf())return;
    const keyboardPoint=point(event,piano.getBoundingClientRect(),pianoGeometry);
    if(event.target.closest?.('[data-stretch]')&&sourceOf()?.kind==='audio'){gesture={...context(),captureTarget:piano,kind:'stretch',tempo:sourceOf().sourceTempo,length:sourceLength(sourceOf()),geometry:pianoGeometry,rect:piano.getBoundingClientRect(),start:keyboardPoint,pointerId:event.pointerId};piano.setPointerCapture?.(event.pointerId);piano.focus();event.preventDefault();return;}
    const marker=event.target.closest?.('[data-region]');
    if(marker&&editorOccurrence()){gesture={...context(),captureTarget:piano,kind:'region',regionKind:marker.getAttribute('data-region'),region:structuredClone(editorOccurrence().region),intent:regionIntent(),geometry:pianoGeometry,rect:piano.getBoundingClientRect(),start:keyboardPoint,pointerId:event.pointerId};piano.setPointerCapture?.(event.pointerId);piano.focus();event.preventDefault();return;}
    if(sourceOf()?.kind!=='audio'&&keyboardPoint.x<pianoGeometry.pad&&keyboardPoint.y>=pianoGeometry.top){keyPreviewPointer=event.pointerId;audition.note({pitch:pitchAt(keyboardPoint,pianoGeometry)});piano.setPointerCapture?.(event.pointerId);event.preventDefault();return;}
    const hit=event.target.closest?.('[data-note]')??(event.target.getAttribute?.('data-note')!==null?event.target:null);
    const index=hit?.getAttribute?.('data-note')??hit?.attrs?.['data-note'];
    selectedNote=index!==undefined&&index!==null?editorDocument().tracks[selected].notes[Number(index)].id:null;piano.focus();
    if(selectedNote!==null){const g=pianoGeometry,rect=piano.getBoundingClientRect(),start=point(event,rect,g);gesture={...context(),geometry:g,rect,start,index:selectedNoteIndex(editorDocument().tracks[selected].notes),kind:(hit?.getAttribute?.('data-part')??hit?.attrs?.['data-part'])==='resize'?'resize':'move',notes:structuredClone(editorDocument().tracks[selected].notes),pointerId:event.pointerId};piano.setPointerCapture?.(event.pointerId);event.preventDefault();}
    if(selectedNote===null&&keyboardPoint.x>=pianoGeometry.pad&&keyboardPoint.y>=pianoGeometry.top){gesture={...context(),captureTarget:piano,kind:'timeRange',geometry:pianoGeometry,rect:piano.getBoundingClientRect(),start:keyboardPoint,previousSelection:clipTimeSelection,pointerId:event.pointerId};clipTimeSelection=null;piano.setPointerCapture?.(event.pointerId);event.preventDefault();}
    if(selectedNote!==null){clipTimeSelection=null;}
    if(selectedNote!==null)audition.note(editorDocument().tracks[selected].notes[selectedNoteIndex(editorDocument().tracks[selected].notes)]);
    else if(event.detail===2&&sourceOf()?.kind==='midi')audition.note({pitch:pitchAt(keyboardPoint,pianoGeometry)});
    paintSelection();
  }));
  piano.addEventListener('pointermove',guard(event=>{
    if(keyPreviewPointer===event.pointerId){audition.note({pitch:pitchAt(point(event,piano.getBoundingClientRect(),pianoGeometry),pianoGeometry)});return;}
    if(!gesture||gesture.pointerId!==event.pointerId)return;const g=gesture,p=point(event,g.rect,g.geometry);
    if(g.kind==='stretch'){const length=Math.round((g.length+beatAt(p,g.geometry)-beatAt(g.start,g.geometry))*4)/4;stretchPreview=Math.max(30,Math.min(240,g.tempo*length/g.length));paintSelection();return;}
    if(g.kind==='timeRange'){clipTimeSelection=timeSelection(beatAt(g.start,g.geometry),beatAt(p,g.geometry),g.geometry.sourceLength);paintSelection();return;}
    if(g.kind==='region'){regionPreview=transformRegion(g.region,g.regionKind,beatAt(p,g.geometry)-beatAt(g.start,g.geometry),g.geometry.sourceLength);paintSelection();return;}
    preview=structuredClone(g.notes);preview[g.index]=transformNote(g.notes[g.index],g.kind,beatAt(p,g.geometry)-beatAt(g.start,g.geometry),(g.start.y-p.y)/g.geometry.pitchHeight);paintSelection();
    if(g.kind==='move')audition.note(preview[g.index]);
  }));
  piano.addEventListener('pointerup',guard(event=>{
    releaseAudition();
    if(!gesture||gesture.pointerId!==event.pointerId)return;const g=gesture,notes=preview;gesture=null;preview=null;
    if(piano.hasPointerCapture?.(event.pointerId))piano.releasePointerCapture(event.pointerId);
    if(g.kind==='stretch'){const tempo=stretchPreview;stretchPreview=null;paintSelection();if(tempo!==null&&tempo!==g.tempo&&g.scope===scopeRevision&&g.generation===generation()&&g.revision===model.snapshot()?.editRevision&&g.sourceId===sourceOf()?.id)return stretchAudio(tempo);return;}
    if(g.kind==='timeRange'){paintSelection();return;}
    if(g.kind==='region'){const region=regionPreview;regionPreview=null;paintSelection();if(region&&JSON.stringify(region)!==JSON.stringify(g.region))return setRegion(g.intent,region);return;}
    if(notes&&JSON.stringify(notes)!==JSON.stringify(g.notes))return edit(document=>{trackById(document,g.trackId).notes=notes;},g);
    paintSelection();
  }));
  piano.addEventListener('pointercancel',()=>{releaseAudition();cancelGesture();});piano.addEventListener('lostpointercapture',()=>{releaseAudition();if(gesture)cancelGesture();});
  piano.addEventListener('dblclick',guard(event=>{
    if(event.target.closest?.('[data-note]')||sourceOf()?.kind!=='midi')return;
    cancelGesture();const p=point(event,piano.getBoundingClientRect(),pianoGeometry);
    if(p.x<pianoGeometry.pad||p.y<pianoGeometry.top||p.x>pianoGeometry.width||p.y>pianoGeometry.height)return;
    const trackId=model.document().tracks[selected].id,note=addNote(beatAt(p,pianoGeometry),pitchAt(p,pianoGeometry),editorDocument().lengthBeats);if(!note)throw Error('The new note must fit within the clip.');
    return workspaceEdit({kind:'noteCreate',sourceId:sourceOf().id,...note});
  }));
  piano.addEventListener('keydown',guard(event=>{
    if(event.key==='Escape'){event.preventDefault();cancelGesture();clipTimeSelection=null;paintSelection();return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='l'){event.preventDefault();return loopClipSelection();}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();return history(event.shiftKey?'redo':'undo');}
    if(selectedNote===null)return;
    const trackId=model.document().tracks[selected].id,notes=editorDocument().tracks[selected].notes,index=selectedNoteIndex(notes),note=notes[index],id=note?.id;
    if(['Delete','Backspace'].includes(event.key)){event.preventDefault();cancelGesture();selectedNote=null;return edit(document=>trackById(document,trackId).notes.splice(noteAt(trackById(document,trackId),id),1));}
    const changed=keyEdit(note,event.key,event.shiftKey);if(changed){event.preventDefault();cancelGesture();if(!event.shiftKey)audition.note(changed);return edit(document=>{const notes=trackById(document,trackId).notes;const at=noteAt({notes},id);notes[at]=keyEdit(notes[at],event.key,event.shiftKey);},null,true);}
  }));
  piano.addEventListener('keyup',releaseAudition);piano.addEventListener('blur',releaseAudition);
  }
  win?.addEventListener('blur',releaseAudition);
  function previewAddedNote(){
    const document=editorDocument(),notes=document.tracks[selected].notes??[];
    for(let beat=0;beat+.25<=document.lengthBeats;beat+=.25)for(let pitch=60;pitch<=127;pitch++)if(!notes.some(n=>n.pitch===pitch&&n.beat<beat+.25&&n.beat+n.duration>beat)){audition.note({pitch,velocity:100});return;}
  }
  $('add-note').addEventListener('pointerdown',event=>{if(event.button===0){previewAddedNote();$('add-note').setPointerCapture?.(event.pointerId);}});
  $('add-note').addEventListener('keydown',event=>{if(!event.repeat&&['Enter',' '].includes(event.key))previewAddedNote();});
  for(const type of ['pointerup','pointercancel','lostpointercapture','keyup','blur'])$('add-note').addEventListener(type,releaseAudition);
  velocity.addEventListener('pointerdown',event=>{velocityCanceled=false;velocity.setPointerCapture?.(event.pointerId);if(selectedNote!==null){gesture={...context(),kind:'velocity',index:selectedNoteIndex(editorDocument().tracks[selected].notes),notes:structuredClone(editorDocument().tracks[selected].notes),pointerId:event.pointerId,captureTarget:velocity};}});
  velocity.addEventListener('input',()=>{if(velocityCanceled){render();return;}if(selectedNote===null)return;preview=structuredClone(gesture?.notes??editorDocument().tracks[selected].notes);preview[selectedNoteIndex(preview)].velocity=Number(velocity.value);paintSelection();});
  velocity.addEventListener('change',guard(()=>{if(velocityCanceled){render();return;}if(selectedNote===null)return;const g=gesture,trackId=g?.trackId??model.document().tracks[selected].id,index=selectedNoteIndex(editorDocument().tracks[selected].notes),id=editorDocument().tracks[selected].notes[index]?.id,value=Number(velocity.value);gesture=null;preview=null;return edit(document=>{trackById(document,trackId).notes[noteAt(trackById(document,trackId),id)].velocity=value;},g,true);}));
  velocity.addEventListener('pointercancel',cancelGesture);velocity.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();cancelGesture();}else velocityCanceled=false;});
  const velocityLane=clipView.velocityLane;
  velocityLane.addEventListener('pointerdown',guard(event=>{
    if(event.button!==0||gesture||sourceOf()?.kind!=='midi')return;
    const hit=event.target.closest?.('[data-note]'),index=Number(hit?.getAttribute('data-note'));
    if(!hit||!Number.isInteger(index))return;
    const notes=editorDocument().tracks[selected].notes;
    selectedNote=notes[index].id;
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
    if(notes&&JSON.stringify(notes)!==JSON.stringify(g.notes))return edit(document=>{trackById(document,g.trackId).notes=notes;},g);
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
    return edit(document=>{trackById(document,g.trackId).notes=notes;},g);
  }));
  const diagnosticNames=['Audio backend','Audio device','Audio sample rate','Audio buffer frames','Audio callbacks','Audio stream errors','Audio failed','Audio status','Transport playing','Absolute frame','Rejected commands','Native generation',...Array.from({length:8},(_,index)=>`Track ${index+1} active voices`),...Array.from({length:8},(_,index)=>[`Track ${index+1} authority`,`Track ${index+1} active source`,`Track ${index+1} active placement`]).flat()];
  for(const name of diagnosticNames){const label=make('label','',name),output=make('output','','-');output.setAttribute('aria-label',name);label.append(output);$('diagnostics').append(label);diagnostics.set(name,output);}
  function render(){
    if(sourceSelection&&model.document()){const d=model.document(),p=d.placements?.find(p=>p.id===sourceSelection.occurrence?.placementId);if(!d.sources?.some(s=>s.id===sourceSelection.sourceId))sourceSelection=null;else if(sourceSelection.occurrence)sourceSelection={...sourceSelection,sourceId:p?.sourceId??sourceSelection.sourceId,occurrence:p?sourceSelection.occurrence:null};}
    const snapshot=model.snapshot();if(!snapshot)return;
    selected=Math.min(selected,snapshot.document.tracks.length-1);
    const document=editorDocument();if(!document)return;
    const selectionScope=JSON.stringify([snapshot.generation,document.tracks[selected]?.id,selectedClip()?.id,sourceSelection]);if(selectionScope!==clipSelectionScope){clipSelectionScope=selectionScope;clipTimeSelection=null;regionPreview=null;}
    previewFailure=snapshot.midi?.previewError===4?'Preview reached the native work allowance. Release the key and try again.':snapshot.midi?.previewError&&snapshot.midi.previewError!==6?'Preview was refused by native playback.':'';renderNotice();
    audition.configure({generation:snapshot.generation,preparationRevision:snapshot.preparationRevision,trackId:document.tracks[selected]?.id,sourceId:sourceOf()?.id,available:!!snapshot.capabilities?.midiPreview});
    clipView?.preview({enabled:audition.enabled(),available:!!snapshot.capabilities?.midiPreview,reason:snapshot.capabilities?.midiUnavailableReason});
    if(masterGeneration!==snapshot.generation){const canceled=masterGeneration!==null&&(!!masterIntent||masterPendingReset);masterGeneration=snapshot.generation;masterIntent=masterReceipt=null;masterPendingReset=false;masterStatus=canceled?'Master pending intent canceled on session change.':'';masterError=false;masterProducer.setGeneration(snapshot.generation);if(canceled)notice(masterStatus,false,'master');else if(noticeOwner==='master')notice('Master state refreshed for this session.',false,'master');}
    renderMaster();renderTransportRequest(snapshot);
    renderLaunchSettings(snapshot);
    if(!chainDevices().some(d=>d.instanceId===selectedInstance))selectedInstance=chainDevices()[0]?.instanceId??null;
    $('edit-device').disabled=!selectedInstance;$('session-title').textContent=document.title;$('dirty').textContent=snapshot.dirty?'Modified':'';doc.title=`${snapshot.dirty?'* ':''}${document.title} - Alive`;
    for(const[id,value]of [['tempo',document.tempo],['length',model.document().lengthBeats]])if(doc.activeElement!==$(id)&&!workspace.preserves($(id)))$(id).value=value;
    $('undo').disabled=!snapshot.history?.canUndo;$('redo').disabled=!snapshot.history?.canRedo;
    for(const [id,label]of [['undo','Undo'],['redo','Redo']]){$(id).setAttribute('aria-label',label);const text=$(id).querySelector('span');if(text)text.textContent=label;}
    $('undo').title=snapshot.history?.undoLabel??'No edit to undo';$('redo').title=snapshot.history?.redoLabel??'No edit to redo';
    const notes=document.tracks[selected].notes??[],chosenIndex=selectedNoteIndex(notes),selectedValue=notes[chosenIndex];if(!selectedValue)selectedNote=null;$('note-velocity').disabled=!selectedValue;$('note-velocity').value=preview?.[chosenIndex]?.velocity??selectedValue?.velocity??100;$('velocity-value').textContent=selectedValue?String($('note-velocity').value):'Select a note';
    $('loop').checked=document.loopEnabled;$('edit-status').textContent=snapshot.midi.pending?'Updating playback...':'Edits play immediately';$('edit-status').title=$('edit-status').textContent;
    const deviceCount=document.tracks.reduce((count,track)=>count+actualDevices(track).length,0),maxTracks=snapshot.capabilities.maxTracks,maxDevices=snapshot.capabilities.maxDevices,instrumentNeedsTrack=document.tracks[selected].chain.kind!=='midi'||!!instrumentOf(document.tracks[selected]);
    for(const id of ['insert-audio-track','insert-midi-track'])$(id).disabled=document.tracks.length>=maxTracks||snapshot.midi.pending;
    $('start').disabled=!!snapshot.state.playing;$('stop').disabled=false;$('add-track').disabled=(instrumentNeedsTrack&&document.tracks.length>=maxTracks)||deviceCount>=maxDevices||!!snapshot.state.playing||snapshot.midi.pending;
    const nextTracks=JSON.stringify([snapshot.generation,document.tracks.map(t=>[t.id,t.name,t.color,t.chain?.kind,t.slots?.map(c=>c?[c.id,c.name,c.sourceId]:null)])]);if(nextTracks!==trackKey){trackKey=nextTracks;buildTracks(document);}
    for(const [key,cached]of rackCache)if(cached.generation!==generation()||!model.document().tracks.some(track=>track.id===cached.trackId))discardRack(key,cached);
    const nextChain=JSON.stringify([snapshot.generation,document.tracks[selected].id,document.tracks[selected].name,document.tracks[selected].chain.kind,chainDevices().map(d=>[d.instanceId,d.path,d.sourceSha256,d.id,d.version])]);if(nextChain!==chainKey){chainKey=nextChain;buildChain();}
    const structuralBlocked=!!snapshot.state.playing||snapshot.midi.pending;if(rootlessInstrumentButton)rootlessInstrumentButton.disabled=structuralBlocked;
    $('chain-status').textContent=snapshot.midi.pending?'Wait for the musical edit to finish before changing devices.':snapshot.state.playing?'Stop transport to add, remove, replace or reorder devices. Bypass and base values work live.':'Add, remove, replace and reorder devices while stopped. Bypass and base values work live.';
    $('add-effect').disabled=structuralBlocked||document.tracks[selected].effects.length>=2||deviceCount>=maxDevices;
    const structureMessage=snapshot.midi.pending?'Wait for the musical edit to finish before loading a device.':snapshot.state.playing?'Stop transport before loading a device.':'';
    browser.render({document:model.document(),instances:snapshot.deviceInstances,instrumentNeedsTrack,instrumentBlocked:structureMessage||($('add-track').disabled?'Track or device capacity reached.':''),effectBlocked:structureMessage||($('add-effect').disabled?'Effect or device capacity reached.':'')});
    for(const view of chainViews){view.choose.setAttribute('aria-pressed',String(view.reference.instanceId===selectedInstance));view.row.classList.toggle('selected',view.reference.instanceId===selectedInstance);view.bypass.setAttribute('aria-pressed',String(chainDevices().find(d=>d.instanceId===view.reference.instanceId).bypassed));view.row.classList.toggle('bypassed',!!chainDevices().find(d=>d.instanceId===view.reference.instanceId).bypassed);for(const {button,blocked} of view.actions){button.disabled=structuralBlocked||blocked;button.title=blocked?'Already at this end of the effect chain.':$('chain-status').textContent;}}
    const nextMusic=JSON.stringify([snapshot.generation,selected,selectedClip()?.id,sourceOf()?.id,document.tracks[selected].sourceKind,document.tempo,document.lengthBeats,document.loopEnabled,document.tracks[selected]?.notes,document.tracks[selected]?.automation,editorOccurrence()?.region,clipTimeSelection,sourceOf()?.kind==='audio'?snapshot.preparedWorkspaces?.sources?.find(item=>item.sourceId===sourceOf()?.id)?.waveformPeaks:null]);
    if(nextMusic!==musicKey){musicKey=nextMusic;paintClipOverview();buildMusic(document);}
    paintLanes();
    $('device-title').textContent=instanceView(selectedInstance)?.manifest?.name??'Device';
    document.tracks.forEach((track,index)=>{
      const view=trackViews[index],runtime=snapshot.state.tracks[index],midiOnly=track.chain.kind==='midi'&&!instrumentOf(track);view.row.classList.toggle('selected',selected===index);view.name.setAttribute('aria-pressed',String(selected===index));view.row.setAttribute('aria-label',`${track.name} track`);view.detail.textContent=`${(track.notes?.length??0)} notes / ${midiOnly?'MIDI':'stereo'}`;view.gainLabel.hidden=midiOnly;view.strip.hidden=midiOnly;view.midiOnly.hidden=!midiOnly;view.mixer.classList.toggle('midi-only',midiOnly);
      if(doc.activeElement!==view.gain&&!workspace.preserves(view.gain))view.gain.value=String(Number(track.gain.toFixed(3)));view.gain.title=`Exact gain: ${track.gain}`;view.mute.setAttribute('aria-pressed',String(track.mute));view.solo.setAttribute('aria-pressed',String(track.solo));
      if(!view.faderEditing()&&!workspace.preserves(view.fader))view.fader.value=track.gain;
      meter(view.bar,runtime?.peakLeft??0,runtime?.peakRight??0);view.readout.textContent=peak(runtime?.peakLeft??0,runtime?.peakRight??0);
      for(const button of [...view.actions.children].slice(1)){button.disabled=button===view.actions.children[2]?!!snapshot.midi?.pending||document.tracks.length<=1:!!snapshot.state.playing||snapshot.midi.pending||!instrumentOf(track);button.title=snapshot.midi.pending?'Wait for the musical edit to finish before changing devices.':snapshot.state.playing?'Stop transport before replacing a device or removing a track.':button.textContent==='Remove track'?'Remove this whole track, its instrument, effects and automation. Keep at least one track.':'Replace this instrument from a saved Ultra source; its automation lanes are removed.';}
    });
    for(const cached of rackCache.values())for(const view of cached.parameters.values())view.host.publish();
    const frameBeat=value=>Number(nativeInteger(value)*1000000n/48000n)/1000000*snapshot.document.tempo/60;
    const beat=frameBeat(snapshot.state.position),sixteenth=Math.floor(Math.max(0,beat)*4);
    const musicalPosition=`${Math.floor(sixteenth/16)+1}.${Math.floor(sixteenth/4)%4+1}.${sixteenth%4+1}`,precisePosition=`${beat.toFixed(3)} beats`;
    if($('position').textContent!==musicalPosition)$('position').textContent=musicalPosition;
    if($('position-beats').textContent!==precisePosition)$('position-beats').textContent=precisePosition;
    $('position').title=`${beat.toFixed(3)} beats; fixed 4/4`;
    const playhead=(document.tracks[selected].sourceKind==='audio'?audioWaveform:piano).querySelector('.playhead');
    if(playhead){
      const track=document.tracks[selected],runtime=snapshot.runtime.tracks.find(t=>t.trackId===track.id),x=beatX(frameBeat(runtime?.phase??'0'),pianoGeometry);
      playhead.setAttribute('visibility',runtime?.phase!=null&&!!track.sourceId&&runtime.activeSourceId===track.sourceId?'visible':'hidden');
      playhead.setAttribute('x1',x);playhead.setAttribute('x2',x);
    }
    const a=snapshot.audio,s=snapshot.state,values=[a.host||a.config.host,a.device||a.config.device,a.config.sample_rate,a.observed_buffer_frames,a.callbacks,a.stream_errors,String(a.failed),a.message,String(!!s.playing),s.absoluteFrame,s.rejected,s.generation,...Array.from({length:8},(_,index)=>s.tracks[index]?.activeVoices??0),...Array.from({length:8},(_,index)=>{const r=snapshot.runtime?.tracks.find(t=>t.trackId===snapshot.document.tracks[index]?.id);return[r?.authority??'-',r?.activeSourceId??'-',r?.activePlacementId??'-'];}).flat()];
    diagnosticNames.forEach((name,index)=>{const output=diagnostics.get(name),text=String(values[index]);if(output.textContent!==text){output.textContent=text;output.title=text;}});
    const observations=snapshot.runtime?.tracks??[],overridden=observations.filter(t=>t.authority==='session').length,pending=observations.filter(t=>t.pendingAction).length;
    $('workspace-authority').textContent=`${observations.length!==snapshot.document.tracks.length||observations.some(t=>t.authority==null)?'Authority unavailable':overridden?`${overridden} Session override${overridden===1?'':'s'}`:'Arrangement'}${pending?` / ${pending} pending`:''}`;
    $('return-all').disabled=!snapshot.capabilities?.atomicTrackActions;
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
  for(const[id,key]of [['tempo','tempo'],['length','lengthBeats']])$(id).addEventListener('change',guard(()=>{const value=Number($(id).value);if($(id).value===''||!Number.isFinite(value))throw Error('Enter a valid number.');return edit(doc=>{doc[key]=value;});}));$('loop').addEventListener('change',guard(()=>{const value=$('loop').checked;return edit(doc=>{doc.loopEnabled=value;});}));
  function history(direction){cancelGesture();return enqueue(async()=>{try{const before=model.snapshot();const result=await publicationCommand('alive_history',{direction});applySnapshot(result);invalidateScope(before);}finally{await refresh();}selectedNote=null;musicKey='';render();});}
  bind('undo','Undo',()=>history('undo'));bind('redo','Redo',()=>history('redo'));
  bind('add-note','Add note',()=>{const source=sourceOf();if(source?.kind!=='midi')throw Error('Select a MIDI clip first.');let note=null;for(let beat=0;beat+.25<=source.lengthBeats&&!note;beat+=.25)for(let pitch=60;pitch<=127;pitch++)if(!source.notes.some(n=>n.pitch===pitch&&n.beat<beat+.25&&n.beat+n.duration>beat)){note={beat,pitch,duration:.25,velocity:100};break;}if(!note)throw Error('No room for a note.');return workspaceEdit({kind:'noteCreate',sourceId:source.id,...note});});
  bind('add-effect','Add effect',()=>structural(null,'add'));
  function openDevice(instanceId){const origin=generation();return enqueue(()=>{if(generation()!==origin)throw Error('The originating device session changed.');return command('alive_editor',{instanceId});});}
  bind('edit-device','Edit selected device in Ultra',()=>openDevice(selectedInstance));
  bind('add-lane','Add automation lane',()=>{if(!$('automation-target').value)throw Error('Select a device parameter first.');const trackId=model.document().tracks[selected].id,[instanceId,key]=JSON.parse($('automation-target').value);return edit(document=>{const track=trackById(document,trackId);if(!track.automation.some(l=>l.instanceId===instanceId&&l.key===key))track.automation.push({instanceId,key,enabled:false,points:[]});});});
  function importAudio(trackId,slot){const token=selectionToken,origin=generation(),preparation=model.snapshot()?.preparationRevision;return enqueue(async()=>{
    if(origin!==generation()||preparation!==model.snapshot()?.preparationRevision)throw Error('The audio import session changed. Select the slot again.');
    const result=await publicationCommand('alive_audio_import',{trackId,slot});if(!result)return;
    if(token===selectionToken){sourceSelection=null;selectedSlots.set(trackId,slot);selectedNote=null;workspace.openClip();}
    trackKey=musicKey=clipControlsKey='';render();return result;
  });}
  function insertTrack(kind){const afterTrackId=model.document()?.tracks[selected]?.id??null,token=selectionToken,origin=generation(),preparation=model.snapshot()?.preparationRevision;cancelGesture();return enqueue(async()=>{
    if(origin!==generation()||preparation!==model.snapshot()?.preparationRevision)throw Error('The track creation session changed. Try again.');
    const result=await publicationCommand('alive_workspace_track',{operation:{kind,afterTrackId}});if(!result)return;
    const id=result.affected?.trackId;if(id&&token===selectionToken){const index=model.document().tracks.findIndex(t=>t.id===id);if(index>=0){selected=index;selectedInstance=null;sourceSelection=null;selectionToken++;}}
    trackKey=musicKey=parameterKey=chainKey='';render();
  });}
  bind('insert-audio-track','Insert Audio Track',()=>insertTrack('addAudio'));bind('insert-midi-track','Insert MIDI Track',()=>insertTrack('addMidi'));
  bind('add-track','Add instrument track',()=>{
    const trackId=model.document().tracks[selected].id,intent={generation:generation(),editRevision:model.snapshot().editRevision},token=selectionToken;
    cancelGesture();releaseAudition();return enqueue(async()=>{
      if(generation()!==intent.generation||model.snapshot().editRevision!==intent.editRevision)throw Error('The originating session changed. Select the instrument again.');
      const track=model.document().tracks.find(t=>t.id===trackId);if(!track)throw Error('The destination track was removed.');
      const newTrack=track.chain.kind!=='midi'||!!instrumentOf(track),ids=new Set(model.document().tracks.map(t=>t.id));
      const result=await command('alive_device',{trackId,instanceId:null,action:newTrack?'loadNewTrack':'load'}),selectedTrackId=model.document().tracks[selected]?.id;
      const created=newTrack&&result.document.tracks.find(t=>!ids.has(t.id));applySnapshot(result);
      if(created&&token===selectionToken){selected=model.document().tracks.findIndex(t=>t.id===created.id);selectedInstance=instrumentOf(created)?.instanceId??null;sourceSelection=null;selectionToken++;workspace.openDevices();}
      else{const index=model.document().tracks.findIndex(t=>t.id===selectedTrackId);if(index>=0)selected=index;}
      trackKey=musicKey=parameterKey=chainKey='';render();
    });
  });
  const keydown=guard(event=>{if(event.defaultPrevented)return;const typing=event.target.closest?.('input,select,textarea,[contenteditable]');if(!typing&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='t'){event.preventDefault();return insertTrack(event.shiftKey?'addMidi':'addAudio');}if(!event.repeat&&!typing&&(event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='m'){event.preventDefault();if(event.target.closest?.('#arrangement-workspace')){const range=timeline.getRange(),track=model.document().tracks[selected];if(track.chain.kind!=='midi')throw Error('Select a MIDI track to insert a MIDI clip.');return workspaceEdit({kind:'midiPlacementCreate',trackId:track.id,start:range.start,duration:range.duration,name:'MIDI clip'},true);}const track=model.document().tracks[selected],slot=slotOf(track);if(track.chain.kind!=='midi'||track.slots[slot])return;return clipEdit({kind:'create',trackId:track.id,slot});}if(event.key==='Escape'&&!$('alive-audio-settings').hidden){event.preventDefault();closeAudioSettings();return;}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();return file(event.shiftKey?'saveAs':'save');}if(event.code==='Space'&&!event.target.matches('input,select,button,summary')){event.preventDefault();return transport(model.snapshot()?.state.playing?'stop':'start');}});doc.addEventListener('keydown',keydown);
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
  return{model,refresh,dispose(){disposed=true;clearTimeout(scrollFadeTimer);$('track-width').removeEventListener('input',globalWidth);$('scene-controls').removeEventListener('scroll',sceneScroll);$('session-workspace').removeEventListener('scroll',sessionScroll);$('session-workspace').removeEventListener('wheel',sessionWheel);for(const [key,cached]of rackCache)discardRack(key,cached);audition.dispose();win?.removeEventListener('blur',releaseAudition);deviceDrop.dispose();browser.dispose();transportOptions.dispose();masterProducer.dispose();workspace.dispose();timeline?.dispose();clipView.dispose();win?.removeEventListener('blur',cancelGesture);unlisten?.();doc.removeEventListener('keydown',keydown);}};
}
if(globalThis.document)mountAlive();
