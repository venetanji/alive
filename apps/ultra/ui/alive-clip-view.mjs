import {GRID,geometry,initialViewport,navigateViewport,fitViewport,rulerTicks,beatX} from './alive-piano.mjs';

const blackKeys=new Set([1,3,6,8,10]);
const pitchName=pitch=>`${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][pitch%12]}${Math.floor(pitch/12)-1}`;

export function mountClipView({doc,win,svg:midiSvg,audioSvg,onImport=()=>{},onStretch=()=>{},onNavigate=()=>{},onGeometry=()=>{},onPreview=()=>{},onRegion=()=>{},onLoopSelection=()=>{},onError=()=>{}}){
  const make=(tag,attrs={},text)=>{
    const element=tag==='svg'||['rect','line','text','g','defs','clipPath','path','title'].includes(tag)
      ?doc.createElementNS('http://www.w3.org/2000/svg',tag):doc.createElement(tag);
    for(const [key,value]of Object.entries(attrs))element.setAttribute(key,String(value));
    if(text!==undefined)element.textContent=text;
    return element;
  };
  let svg=midiSvg;
  const area=midiSvg.parentElement,toolbar=make('div',{class:'clip-view-tools',role:'toolbar','aria-label':'Clip viewport'});
  const range=make('output',{class:'clip-view-range','aria-label':'Visible clip range'});
  const previewButton=make('button',{type:'button',class:'piano-preview','aria-label':'MIDI note Preview','aria-pressed':'false',title:'Preview notes through the selected instrument'},'Preview');
  let previewEnabled=false;
  previewButton.addEventListener('pointerdown',event=>event.preventDefault());
  previewButton.addEventListener('click',()=>onPreview(!previewEnabled));
  const velocityLane=make('svg',{class:'piano-velocity-lane','aria-label':'Note velocity lane',role:'group',tabindex:0,'aria-describedby':'piano-help'});
  let viewport,last=null,g=null,scope=null,disposed=false,waveformZoom=1;

  function navigate(action){
    if(!last?.source)return;
    onNavigate();
    if(action.type==='waveformZoom')waveformZoom=Math.max(.25,Math.min(8,waveformZoom*action.factor));
    else viewport=action.type==='fit'?fitViewport(last.kind==='audio'?[]:last.notes,g):navigateViewport(viewport,g,action);
    draw();
  }
  function button(label,symbol,action){
    const element=make('button',{type:'button','aria-label':label,title:label},symbol);
    // Navigating the viewport must not blur an unfinished numeric edit.
    element.addEventListener('pointerdown',event=>event.preventDefault());
    element.addEventListener('click',()=>navigate(typeof action==='function'?action():action));
    return element;
  }
  const time=make('div',{class:'clip-tool-group'}),pitch=make('div',{class:'clip-tool-group'}),waveform=make('div',{class:'clip-tool-group'});
  time.append(make('span',{},'Time'),button('Scroll time earlier','<',()=>({type:'timePan',beats:-g.beatSpan/4})),button('Scroll time later','>',()=>({type:'timePan',beats:g.beatSpan/4})),button('Zoom out time','-',{type:'timeZoom',factor:1/1.5}),button('Zoom in time','+',{type:'timeZoom',factor:2}));
  pitch.append(make('span',{},'Pitch'),button('Scroll pitch down','v',{type:'pitchPan',pitches:-3}),button('Scroll pitch up','^',{type:'pitchPan',pitches:3}),button('Zoom out pitch','-',{type:'pitchZoom',factor:1/1.25}),button('Zoom in pitch','+',{type:'pitchZoom',factor:1.25}));
  waveform.append(make('span',{},'Waveform'),button('Zoom out waveform','-',{type:'waveformZoom',factor:1/1.5}),button('Zoom in waveform','+',{type:'waveformZoom',factor:1.5}));
  const fit=button('Fit notes','Fit',{type:'fit'});
  toolbar.append(previewButton,time,pitch,waveform,fit,range);
  const empty=make('div',{class:'audio-clip-empty'}),importButton=make('button',{type:'button','aria-label':'Import audio into selected slot'},'Import WAV...');
  importButton.addEventListener('click',onImport);empty.append(make('strong',{},'Audio clip'),make('p',{},'Import a sample to edit its waveform, start point and loop.'),importButton);
  const properties=make('aside',{class:'clip-properties','aria-label':'Clip properties'});
  const divider=make('div',{class:'clip-properties-resizer',role:'separator',tabindex:0,'aria-label':'Resize Clip properties','aria-orientation':'vertical','aria-valuemin':140,'aria-valuemax':600});
  let propertyResize=null;
  const widthLimit=()=>Math.max(140,Math.min(600,(area.clientWidth||800)-160));
  function setPropertyWidth(value){const width=Math.round(Math.max(140,Math.min(widthLimit(),value)));area.style.setProperty('--clip-properties-width',`${width}px`);divider.setAttribute('aria-valuenow',width);divider.setAttribute('aria-valuemax',widthLimit());}
  divider.addEventListener('pointerdown',event=>{if(event.button!==0)return;propertyResize={id:event.pointerId,x:event.clientX,width:properties.getBoundingClientRect().width};divider.setPointerCapture?.(event.pointerId);event.preventDefault();});
  divider.addEventListener('pointermove',event=>{if(propertyResize?.id===event.pointerId)setPropertyWidth(propertyResize.width+event.clientX-propertyResize.x);});
  divider.addEventListener('pointerup',event=>{if(propertyResize?.id===event.pointerId){propertyResize=null;divider.releasePointerCapture?.(event.pointerId);}});
  function cancelPropertyResize(){if(!propertyResize)return;const prior=propertyResize;propertyResize=null;setPropertyWidth(prior.width);if(divider.hasPointerCapture?.(prior.id))divider.releasePointerCapture(prior.id);}
  divider.addEventListener('pointercancel',cancelPropertyResize);divider.addEventListener('lostpointercapture',cancelPropertyResize);
  divider.addEventListener('keydown',event=>{if(event.key==='Escape'&&propertyResize){event.preventDefault();event.stopPropagation();cancelPropertyResize();return;}if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const current=properties.getBoundingClientRect().width;setPropertyWidth(event.key==='Home'?140:event.key==='End'?widthLimit():current+(event.key==='ArrowRight'?20:-20));});
  const regionTools=make('div',{class:'clip-region-tools',role:'toolbar','aria-label':'Clip markers and loop'}),regionInputs={};
  regionTools.append(make('strong',{class:'clip-properties-heading'},'Clip'));
  for(const [key,label]of [['start','Start'],['end','End'],['loopStart','Loop Position'],['loopLength','Loop Length']]){
    const visibleLabel=key==='loopStart'?'Position':key==='loopLength'?'Length':label;
    const holder=make('label',{class:`clip-region-${key}`},visibleLabel),input=make('input',{type:'number',step:'.25',min:0,'aria-label':key==='start'?'Clip Start':key==='end'?'Clip End':label,title:`${label} in source beats (0 is 1.1.1)`});
    input.addEventListener('change',()=>{const value=Number(input.value);if(input.value===''||!Number.isFinite(value)){onError(`${label} requires a number.`);return;}onRegion(key,value);});
    regionInputs[key]=input;holder.append(input);regionTools.append(holder);
  }
  const loopLabel=make('label',{class:'clip-loop-toggle'}),loopToggle=make('input',{type:'checkbox','aria-label':'Clip Loop'});loopToggle.addEventListener('change',()=>onRegion('loopEnabled',loopToggle.checked));loopLabel.append(loopToggle,make('span',{},'Loop'));regionTools.append(loopLabel);
  const loopSelection=make('button',{type:'button','aria-label':'Loop Selection',title:'Set loop and Start from the time selection (Ctrl+L)'},'Loop Selection');loopSelection.addEventListener('click',onLoopSelection);regionTools.append(loopSelection,make('span',{class:'muted'},'beats'));
  const stretchTools=make('div',{class:'audio-stretch-tools',role:'toolbar','aria-label':'Audio Re-Pitch stretching'}),stretchInputs={};
  async function stretch(tempo,sourceId=last?.source?.id){try{return await onStretch(tempo,sourceId);}catch(error){onError(String(error));return null;}}
  stretchTools.append(make('strong',{},'Audio'),make('span',{class:'clip-audio-mode'},'Re-Pitch'));
  for(const [key,label,aria]of [['tempo','Source BPM','Audio source BPM'],['length','Length','Audio length in beats']]){
    const holder=make('label',{},label),input=make('input',{type:'number',step:'any','aria-label':aria});
    const identity=()=>JSON.stringify([last?.scope,last?.revision,last?.source?.id]);let intent=null;
    input.addEventListener('focus',()=>{intent=identity();});
    input.addEventListener('change',async()=>{
      if(last?.kind!=='audio'||!last.source||intent!==identity()){onError('The audio source changed. Select it and enter the stretch value again.');return;}
      const value=Number(input.value),tempo=key==='tempo'?value:last.source.sourceTempo*value/last.length;
      if(input.value===''||!Number.isFinite(tempo)||tempo<30||tempo>240){onError('Re-Pitch requires a source tempo from 30 to 240 BPM.');return;}
      const scope=last.scope,sourceId=last.source.id,receipt=await stretch(tempo,sourceId);
      if(last.scope===scope&&last.source?.id===sourceId&&last.revision===receipt?.snapshot?.editRevision)intent=identity();
    });
    stretchInputs[key]=input;holder.append(input);if(key==='length')holder.append(make('span',{},'beats'));stretchTools.append(holder);
  }
  const stretchActions=[];
  for(const [label,factor]of [['Half sample length',.5],['Double sample length',2]]){
    const action=make('button',{type:'button','aria-label':label},factor===.5?'/2':'x2');action.addEventListener('click',()=>stretch(last.source.sourceTempo*factor));stretchTools.append(action);stretchActions.push({action,factor});
  }
  stretchTools.append(make('span',{class:'muted'},'Pitch follows speed; shared sample'));
  const group=(label,content)=>{const section=make('details',{open:''}),summary=make('summary',{},label);section.append(summary,content);return section;};
  const regionGroup=group('Clip',regionTools),stretchGroup=group('Audio',stretchTools);
  properties.append(regionGroup,stretchGroup);
  const launchSettings=doc.getElementById?.('clip-launch-settings');
  if(launchSettings)properties.append(group('Launch',launchSettings));
  if(area){area.insertBefore(properties,midiSvg);area.insertBefore(divider,midiSvg);area.insertBefore(toolbar,midiSvg);area.insertBefore(velocityLane,midiSvg.nextSibling??null);area.insertBefore(empty,midiSvg);}

  function text(parent,x,y,value,attrs={}){
    parent.append(make('text',{x,y,fill:'#b4b4b0',stroke:'none','font-size':10,...attrs},value));
  }
  function clip(parent,id,x,y,width,height){
    const defs=make('defs'),path=make('clipPath',{id});path.append(make('rect',{x,y,width,height}));defs.append(path);parent.append(defs);
    const group=make('g',{'clip-path':`url(#${id})`});parent.append(group);return group;
  }
  function draw(){
    if(!last||disposed)return;
    const audio=last.kind==='audio',hasSource=!!last.source,emptyAudio=audio&&!hasSource;
    svg=audio?audioSvg:midiSvg;
    midiSvg.hidden=audio||!hasSource;audioSvg.hidden=!audio||emptyAudio;empty.hidden=!emptyAudio;
    if(audio||!hasSource)midiSvg.setAttribute('hidden','');else midiSvg.removeAttribute('hidden');
    if(!audio||emptyAudio)audioSvg.setAttribute('hidden','');else audioSvg.removeAttribute('hidden');
    properties.hidden=!hasSource;divider.hidden=!hasSource;area?.classList?.toggle('has-source',hasSource);
    if(hasSource&&!divider.getAttribute('aria-valuenow')){divider.setAttribute('aria-valuenow',Math.round(properties.getBoundingClientRect().width));divider.setAttribute('aria-valuemax',widthLimit());}
    toolbar.hidden=!hasSource;regionTools.hidden=!hasSource||!last.region;
    stretchTools.hidden=!audio||emptyAudio;stretchGroup.hidden=!audio||emptyAudio;
    if(audio&&!emptyAudio){
      if(doc.activeElement!==stretchInputs.tempo)stretchInputs.tempo.value=String(Number(last.source.sourceTempo.toFixed(6)));
      if(doc.activeElement!==stretchInputs.length)stretchInputs.length.value=String(Number(last.length.toFixed(6)));
      stretchInputs.tempo.min=30;stretchInputs.tempo.max=240;
      for(const {action,factor}of stretchActions)action.disabled=last.source.sourceTempo*factor<30||last.source.sourceTempo*factor>240;
    }
    importButton.disabled=!last.canImport;
    const inactive=audio?midiSvg:audioSvg;inactive.replaceChildren();
    pitch.hidden=audio;waveform.hidden=!audio;previewButton.hidden=audio;velocityLane.hidden=audio||!hasSource;velocityLane.style.display=audio||!hasSource?'none':'';
    if(!hasSource){svg.replaceChildren();velocityLane.replaceChildren();g=null;onGeometry(g);return;}
    fit.setAttribute('aria-label',audio?'Fit sample':'Fit notes');fit.title=audio?'Fit the complete audio sample':'Fit notes';
    toolbar.setAttribute('aria-label',audio?'Audio sample viewport':'Piano viewport');
    range.title=audio?'Wheel: scroll time; Ctrl + wheel: zoom time':'Wheel: scroll pitch; Shift + wheel: scroll time; Ctrl + wheel: zoom time; Alt + wheel: zoom pitch';
    const rect=svg.getBoundingClientRect();
    const extent=audio?Math.ceil(last.length/4)*4+4:last.length;
    g=last.frozenGeometry??geometry(last.notes,extent,viewport,{width:rect.width||640,height:rect.height||156,pad:audio?16:48,top:last.region?52:22});
    g={...g,sourceLength:last.length};
    onGeometry(g);
    const {width,height,pad,top,pitchHeight}=g;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio','xMinYMin meet');
    for(const [key,value]of Object.entries({'beat-start':g.beatStart,'beat-span':g.beatSpan,'pitch-max':g.max,'row-height':pitchHeight,'keyboard-width':pad,'ruler-height':top}))svg.setAttribute(`data-${key}`,value);
    svg.setAttribute('data-pixels-per-beat',g.pixelsPerBeat);
    svg.replaceChildren();
    svg.append(make('rect',{x:0,y:0,width,height,fill:'#313131',stroke:'none'}));
    const grid=clip(svg,'piano-note-grid',pad,top,width-pad,height-top);
    for(let pitch=g.min;!audio&&pitch<=g.max;pitch++){
      const y=top+(g.max-pitch)*pitchHeight,black=blackKeys.has(pitch%12);
      grid.append(make('rect',{x:pad,y,width:width-pad,height:pitchHeight,fill:black?'#292929':'#343434',stroke:'#3d3d3d','stroke-width':.5}));
      svg.append(make('rect',{x:0,y,width:pad,height:pitchHeight,fill:'#a8a8a3',stroke:'#666661','stroke-width':.5,'data-key':pitch}));
      if(black)svg.append(make('rect',{x:0,y,width:pad*.64,height:Math.max(1,pitchHeight-1),fill:'#252525',stroke:'none'}));
      if(pitch%12===0&&pitchHeight>=8)text(svg,pad-4,y+Math.min(pitchHeight-2,10),pitchName(pitch),{'text-anchor':'end',fill:'#30302e','font-size':Math.min(10,pitchHeight-1)});
    }
    const ticks=rulerTicks(g),step=g.pixelsPerBeat*GRID>=10?GRID:g.pixelsPerBeat>=10?1:Math.max(4,4*Math.ceil(10/g.pixelsPerBeat/4));
    for(let beat=Math.ceil(g.beatStart/step)*step,count=0;beat<=g.beatStart+g.beatSpan&&count<600;beat+=step,count++){
      const x=beatX(beat,g);grid.append(make('line',{x1:x,x2:x,y1:top,y2:height,stroke:beat%4===0?'#686868':Number.isInteger(beat)?'#4a4a4a':'#3c3c3c','stroke-width':beat%4===0?1:.5}));
    }
    if(last.timeSelection){const selection=last.timeSelection;grid.append(make('rect',{class:'clip-time-selection',x:beatX(selection.start,g),y:top,width:(selection.end-selection.start)*g.pixelsPerBeat,height:height-top,fill:'#91b9ed','fill-opacity':.19,'pointer-events':'none'}));}
    if(audio){
      const peaks=last.waveformPeaks??[],middle=top+(height-top)/2,amplitude=Math.max(1,(height-top)/2-10)*waveformZoom;let d='';
      peaks.forEach((peak,index)=>{const x=beatX((index+.5)/peaks.length*last.length,g);d+=`M${x} ${middle-Math.min(1,peak[1])*amplitude}L${x} ${middle-Math.max(-1,peak[0])*amplitude}`;});
      grid.append(make('line',{x1:pad,x2:width,y1:middle,y2:middle,stroke:'#6c624d','stroke-width':.5,'pointer-events':'none'}));
      grid.append(make('path',{class:'audio-waveform',d,fill:'none',stroke:'#c8ae74','stroke-width':Math.max(1,last.length*g.pixelsPerBeat/Math.max(1,peaks.length)),'pointer-events':'none'}));
      if(last.region)for(const [start,end]of [[0,last.region.start],[last.region.end,last.length]])grid.append(make('rect',{class:'audio-outside-region',x:beatX(start,g),y:top,width:Math.max(0,(end-start)*g.pixelsPerBeat),height:height-top,fill:'#1d1d1d','fill-opacity':.65,'pointer-events':'none'}));
      const end=beatX(last.length,g);
      grid.append(make('line',{x1:end,x2:end,y1:top,y2:height,stroke:'#c8ae74','stroke-dasharray':'2 3','pointer-events':'none'}));
      const handle=make('rect',{x:end-7,y:height-24,width:14,height:22,rx:2,fill:'#c8ae74','data-stretch':'end','aria-label':'Stretch sample end'});handle.append(make('title',{},'Drag to stretch the sample in Re-Pitch mode'));grid.append(handle);
    }
    svg.append(make('rect',{x:0,y:0,width,height:top,fill:'#303030',stroke:'none'}));
    text(svg,8,14,'4/4');
    for(const tick of ticks){const x=beatX(tick.beat,g);text(svg,x+4,14,tick.label,{'data-ruler-beat':tick.beat,fill:tick.major?'#eeeeec':'#a4a4a0'});}
    if(last.region){
      const region=last.region,loopStart=beatX(region.loopStart,g),loopEnd=beatX(region.loopEnd,g);
      for(const [key,input]of Object.entries(regionInputs))if(doc.activeElement!==input)input.value=String(key==='loopLength'?region.loopEnd-region.loopStart:region[key]);
      loopToggle.checked=region.loopEnabled;loopSelection.disabled=!last.timeSelection;
      const color=region.loopEnabled?'#c8ae74':'#898983',brace=clip(svg,'piano-clip-markers',pad-1,17,width-pad+2,35);
      brace.append(make('rect',{x:loopStart,y:21,width:Math.max(1,loopEnd-loopStart),height:10,fill:color,'data-region':'loopMove','aria-label':'Clip loop brace'}));
      for(const [kind,x]of [['loopLeft',loopStart],['loopRight',loopEnd]])brace.append(make('rect',{x:x-4,y:19,width:8,height:15,fill:color,'data-region':kind,'aria-label':kind==='loopLeft'?'Loop start handle':'Loop end handle'}));
      for(const [kind,beat]of [['start',region.start],['end',region.end]]){
        const x=beatX(beat,g),side=kind==='start'?1:-1;
        brace.append(make('path',{d:`M${x} 36L${x+side*9} 36L${x} 48Z`,fill:'#eeeeec','data-region':kind,'aria-label':kind==='start'?'Clip Start marker':'Clip End marker'}));
        grid.append(make('line',{x1:x,x2:x,y1:top,y2:height,stroke:'#c4c4bf','stroke-dasharray':'3 3','pointer-events':'none'}));
      }
    }
    svg.append(make('line',{x1:pad,x2:width,y1:top,y2:top,stroke:'#666'}));
    const notes=clip(svg,'piano-note-bodies',pad,top,width-pad,height-top);
    for(const [index,note]of (audio?[]:last.notes).entries()){
      const x=beatX(note.beat,g)+1,y=top+(g.max-note.pitch)*pitchHeight+1,w=Math.max(2,note.duration*g.pixelsPerBeat-2),h=Math.max(1,pitchHeight-2),chosen=last.selectedNote===note.id;
      const body=make('rect',{x,y,width:w,height:h,rx:1,fill:chosen?'#f1c77d':'#c8ae74',stroke:chosen?'#91b9ed':'#2b2924','stroke-width':chosen?2:.5,'data-note':index,'data-part':'body','aria-selected':chosen,'aria-label':`${pitchName(note.pitch)}, beat ${note.beat+1}, velocity ${note.velocity}`});
      notes.append(body,make('rect',{x:x+Math.max(0,w-6),y,width:Math.min(6,w),height:h,fill:chosen?'#91b9ed':'#ab9461',stroke:'none','data-note':index,'data-part':'resize'}));
      if(w>33&&h>=10)text(notes,x+4,y+Math.min(h-1,10),pitchName(note.pitch),{fill:'#302a1f','pointer-events':'none'});
    }
    notes.append(make('line',{class:'playhead',x1:pad,x2:pad,y1:top,y2:height,stroke:'#eeeeec','stroke-width':1,'pointer-events':'none'}));
    if(!audio)drawVelocity();
    const file=last.source?.file;
    range.textContent=audio?file?`${(Number(file.frames)/file.sampleRate).toFixed(2)} s / ${file.channels} ch / ${file.sampleRate/1000} kHz`:'':`${pitchName(g.min)} - ${pitchName(g.max)} / 1/16`;
  }
  function drawVelocity(){
    const height=40,bottom=36,top=8;
    velocityLane.setAttribute('viewBox',`0 0 ${g.width} ${height}`);velocityLane.setAttribute('preserveAspectRatio','xMinYMin meet');
    velocityLane.replaceChildren();velocityLane.append(make('rect',{x:0,y:0,width:g.width,height,fill:'#292929',stroke:'none'}));
    text(velocityLane,5,16,'Vel');text(velocityLane,5,31,'1-127',{'font-size':9});
    const stems=clip(velocityLane,'piano-velocity-stems',g.pad,0,g.width-g.pad,height);
    stems.append(make('line',{x1:g.pad,x2:g.width,y1:bottom,y2:bottom,stroke:'#555'}));
    const ordered=last.notes.map((note,index)=>({note,index}));
    // Chords share a velocity marker position. Keep the selected note reachable.
    ordered.sort((a,b)=>Number(last.selectedNote===a.note.id)-Number(last.selectedNote===b.note.id));
    ordered.forEach(({note,index})=>{
      const x=beatX(note.beat,g),chosen=last.selectedNote===note.id,y=bottom-(note.velocity/127)*(bottom-top);
      stems.append(make('line',{x1:x,x2:x,y1:y,y2:bottom,stroke:chosen?'#91b9ed':'#c8ae74','stroke-width':chosen?2:1,'pointer-events':'none'}));
      stems.append(make('rect',{x:x-3,y:y-3,width:7,height:7,fill:chosen?'#91b9ed':'#c8ae74',stroke:'#272727','data-note':index,'data-part':'velocity','aria-label':`Note ${index+1} velocity ${note.velocity}`}));
    });
  }
  const wheel=event=>{
    if(!last?.source||!g)return;
    event.preventDefault();
    const rect=svg.getBoundingClientRect(),x=Math.max(0,Math.min(1,(event.clientX-rect.left-g.pad)/(g.width-g.pad))),y=Math.max(0,Math.min(1,(event.clientY-rect.top-g.top)/(g.height-g.top)));
    if(event.ctrlKey||event.metaKey)navigate({type:'timeZoom',factor:event.deltaY<0?1.25:1/1.25,anchor:x});
    else if(last.kind==='audio')navigate({type:'timePan',beats:(event.deltaX||event.deltaY)/g.pixelsPerBeat});
    else if(event.altKey)navigate({type:'pitchZoom',factor:event.deltaY<0?1.15:1/1.15,anchor:y});
    else if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))navigate({type:'timePan',beats:(event.deltaX||event.deltaY)/g.pixelsPerBeat});
    else navigate({type:'pitchPan',pitches:-Math.sign(event.deltaY)*3});
  };
  const resize=()=>{if(!last?.source||disposed)return;const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height||(rect.width===g.width&&rect.height===g.height))return;onNavigate();draw();};
  for(const surface of [midiSvg,audioSvg])surface.addEventListener('wheel',wheel,{passive:false});
  const observer=win?.ResizeObserver?new win.ResizeObserver(resize):null;observer?.observe(midiSvg);observer?.observe(audioSvg);win?.addEventListener('resize',resize);
  return {
    velocityLane,
    preview({enabled,available,reason}){previewEnabled=enabled;previewButton.disabled=!available;previewButton.setAttribute('aria-pressed',String(enabled));previewButton.title=available?'Preview selected, added and moved notes through the instrument':reason??'Native MIDI Preview is unavailable';},
    render(value){if(value.scope!==scope){scope=value.scope;viewport=initialViewport(value.notes,value.kind==='audio'?Math.ceil(value.length/4)*4+4:value.length);waveformZoom=1;}last=value;draw();return g;},
    dispose(){disposed=true;observer?.disconnect();for(const surface of [midiSvg,audioSvg])surface.removeEventListener('wheel',wheel);win?.removeEventListener('resize',resize);}
  };
}
