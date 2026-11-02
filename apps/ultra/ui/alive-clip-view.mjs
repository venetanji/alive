import {GRID,geometry,initialViewport,navigateViewport,fitViewport,rulerTicks,beatX} from './alive-piano.mjs';

const blackKeys=new Set([1,3,6,8,10]);
const pitchName=pitch=>`${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][pitch%12]}${Math.floor(pitch/12)-1}`;

export function mountClipView({doc,win,svg:midiSvg,audioSvg,onImport=()=>{},onStretch=()=>{},onNavigate=()=>{},onPark=()=>{},onRestore=()=>{},onStash=()=>[],onRecall=()=>{},isDraft=()=>false,onGeometry=()=>{},onPreview=()=>{},onRegion=()=>{},onLoopSelection=()=>{},onError=()=>{}}){
  const make=(tag,attrs={},text)=>{
    const element=tag==='svg'||['rect','line','text','g','defs','clipPath','path','title'].includes(tag)
      ?doc.createElementNS('http://www.w3.org/2000/svg',tag):doc.createElement(tag);
    for(const [key,value]of Object.entries(attrs))element.setAttribute(key,String(value));
    if(text!==undefined)element.textContent=text;
    return element;
  };
  let svg=midiSvg;
  const area=midiSvg.parentElement,toolbar=make('div',{class:'clip-view-tools',role:'toolbar','aria-label':'Clip viewport'});
  const heading=doc.querySelector?.('#clip-detail > .clip-section > .section-heading');
  const layouts=make('div',{class:'clip-layout-controls',role:'group','aria-label':'Clip layout'}),layoutButtons=[];
  area.setAttribute('data-layout','auto');
  for(const [mode,label,path]of [['auto','Automatic Clip layout','M2 2h14v14H2z M7 2v14 M7 7h9'],['horizontal','Horizontal Clip layout','M2 2h14v14H2z M6 2v14 M10 2v14'],['vertical','Vertical Clip layout','M2 2h14v14H2z M7 2v14 M2 7h5 M2 12h5']]){
    const control=make('button',{type:'button','aria-label':label,'aria-pressed':String(mode==='auto'),'data-help':label}),icon=make('svg',{viewBox:'0 0 18 18','aria-hidden':true});icon.append(make('path',{d:path}));control.append(icon);
    control.addEventListener('pointerdown',event=>event.preventDefault());
    control.addEventListener('click',()=>{area.setAttribute('data-layout',mode);for(const item of layoutButtons)item.control.setAttribute('aria-pressed',String(item.mode===mode));draw();});
    layoutButtons.push({mode,control});layouts.append(control);
  }
  heading?.append(layouts);
  const inspectors=make('div',{class:'clip-inspectors'});let automationPanel;
  for(const [selector,label,path]of [['.note-table','Note inspector','M3 3h12v12H3z M3 7h12 M3 11h12 M7 3v12'],['.automation-section','Automation inspector','M2 13h3l4-8 3 5h4']]){
    const panel=doc.querySelector?.('#clip-detail '+selector);if(!panel)continue;
    const summary=panel.querySelector('summary');summary.setAttribute('aria-label',label);summary.setAttribute('data-help',label);
    if(selector==='.automation-section')automationPanel=panel;
    const icon=make('svg',{viewBox:'0 0 18 18','aria-hidden':true});icon.append(make('path',{d:path}));summary.replaceChildren(icon);
    if(selector==='.note-table'){const scroller=make('div',{class:'clip-note-inspector-content'});scroller.append(...[...panel.children].filter(child=>child!==summary));panel.append(scroller);}
    inspectors.append(panel);
  }
  heading?.append(inspectors);
  const range=make('output',{class:'clip-view-range','aria-label':'Visible clip range'});
  function actionIcon(control,path){const icon=make('svg',{viewBox:'0 0 18 18','aria-hidden':true});icon.append(make('path',{d:path}));control.replaceChildren(icon);}
  const previewButton=make('button',{type:'button',class:'piano-preview','aria-label':'MIDI note Preview','aria-pressed':'false',title:'Preview notes through the selected instrument'},'Preview');
  actionIcon(previewButton,'M2 7h3l4-4v12l-4-4H2z M12 5q5 4 0 8');
  let previewEnabled=false;
  previewButton.addEventListener('pointerdown',event=>event.preventDefault());
  previewButton.addEventListener('click',()=>onPreview(!previewEnabled));
  const velocityLane=make('svg',{class:'piano-velocity-lane','aria-label':'Note velocity lane',role:'group',tabindex:0,'aria-describedby':'piano-help'});
  let viewport,last=null,g=null,scope=null,regionScope=null,disposed=false,waveformZoom=1;
  const fieldIntents=new Map(),scopedIntents=new Map();

  function navigate(action){
    if(!last?.source)return;
    onNavigate();
    if(action.type==='waveformZoom')waveformZoom=Math.max(.25,Math.min(8,waveformZoom*action.factor));
    else viewport=action.type==='fit'?fitViewport(last.kind==='audio'?[]:last.notes,g):navigateViewport(viewport,g,action);
    draw();
  }
  function button(label,symbol,action){
    const element=make('button',{type:'button','aria-label':label,title:label},symbol);
    const paths={'<':'M11 3 5 9l6 6','>':'M7 3l6 6-6 6',v:'M3 6l6 6 6-6','^':'M3 12l6-6 6 6','-':'M4 9h10','+':'M4 9h10 M9 4v10',Fit:'M2 7V2h5 M11 2h5v5 M16 11v5h-5 M7 16H2v-5'};
    actionIcon(element,paths[symbol]??paths.Fit);
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
  function unavailable(tag,label,reason,text){const element=make(tag,{'aria-label':label,'data-help':reason},text);element.disabled=true;return element;}
  const midiModes=make('div',{class:'piano-editor-modes'});
  const search=unavailable('button','Search notes unavailable','Unavailable: piano-roll note search is not implemented.');actionIcon(search,'M7 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M11 11l5 5');
  const highlight=make('label',{class:'piano-scale-highlight','data-help':'Unavailable: the session has no scale metadata or highlight contract.'});highlight.append(unavailable('input','Highlight Scale unavailable','Unavailable: scale highlighting is not implemented.'));highlight.children[0].setAttribute('type','checkbox');highlight.append(make('span',{},'Highlight Scale'));
  const notesMode=make('button',{type:'button','aria-label':'Notes','aria-pressed':'true'},'Notes'),envelopesMode=make('button',{type:'button','aria-label':'Envelopes','aria-pressed':'false'},'Envelopes');
  function editorMode(envelopes){if(!automationPanel)return;if(envelopes){onPark(area);automationPanel.open=true;}else{onPark(automationPanel);automationPanel.open=false;onRestore(area);}notesMode.setAttribute('aria-pressed',String(!envelopes));envelopesMode.setAttribute('aria-pressed',String(envelopes));}
  for(const [control,envelopes]of [[notesMode,false],[envelopesMode,true]]){control.addEventListener('pointerdown',event=>event.preventDefault());control.addEventListener('click',()=>editorMode(envelopes));}
  automationPanel?.addEventListener('toggle',()=>{notesMode.setAttribute('aria-pressed',String(!automationPanel.open));envelopesMode.setAttribute('aria-pressed',String(!!automationPanel.open));});
  midiModes.append(search,unavailable('button','Fold unavailable','Unavailable: folded note rows are not implemented.','Fold'),unavailable('button','Scale unavailable','Unavailable: scale metadata and note filtering are not implemented.','Scale'),highlight,notesMode,envelopesMode,unavailable('button','MPE unavailable','Unavailable: per-note expression has no native contract.','MPE'));
  const navigation=make('details',{class:'clip-navigation'}),navigationToggle=make('summary',{'aria-label':'Piano navigation','data-help':'Time and pitch navigation; viewport changes preserve notes and unfinished values.'}),navigationBody=make('div',{class:'clip-navigation-body'});
  navigationToggle.addEventListener('pointerdown',event=>event.preventDefault());
  actionIcon(navigationToggle,'M2 7V2h5 M11 2h5v5 M16 11v5h-5 M7 16H2v-5');navigationBody.append(time,pitch,waveform,fit,range);navigation.append(navigationToggle,navigationBody);
  const gridSelect=unavailable('select','Piano roll grid','Fixed 1/16 grid. Changing the editing grid is not implemented.');gridSelect.append(make('option',{value:'sixteenth'},'1/16'));
  toolbar.append(midiModes,previewButton,navigation,layouts,inspectors);const addNote=doc.getElementById?.('add-note');if(addNote)toolbar.append(addNote);toolbar.append(gridSelect);
  const empty=make('div',{class:'audio-clip-empty'}),importButton=make('button',{type:'button','aria-label':'Import audio into selected slot'},'Import WAV...');
  actionIcon(importButton,'M3 12v4h12v-4 M9 2v10 M5 8l4 4 4-4');
  importButton.addEventListener('click',onImport);empty.append(make('strong',{},'Audio clip'),make('p',{},'Import a sample to edit its waveform, start point and loop.'),importButton);
  const properties=make('aside',{class:'clip-properties','aria-label':'Clip properties'});
  const propertiesTitle=make('div',{class:'clip-properties-title'}),optionTabs=make('nav',{class:'clip-option-tabs','aria-label':'Clip option sections'});
  propertiesTitle.append(make('span',{},'Clip'));const sourceControls=doc.getElementById?.('clip-controls');if(sourceControls)propertiesTitle.append(sourceControls);
  const propertyGroups=make('div',{class:'clip-option-groups'});properties.append(propertiesTitle,optionTabs,propertyGroups);if(heading)heading.hidden=true;
  const divider=make('div',{class:'clip-properties-resizer',role:'separator',tabindex:0,'aria-label':'Resize Clip properties','aria-orientation':'vertical','aria-valuemin':140,'aria-valuemax':600});
  let propertyResize=null;
  const widthLimit=()=>Math.max(140,Math.min(600,(area.clientWidth||800)-160));
  let requestedPropertyWidth=null;
  function inspectorLayout(){const mode=area.getAttribute('data-layout'),horizontal=mode==='horizontal'||mode==='auto'&&((area.getBoundingClientRect().height||156)<300||(requestedPropertyWidth??0)>=350);area.setAttribute('data-inspector-layout',horizontal?'horizontal':'vertical');}
  function setPropertyWidth(value){const width=Math.round(Math.max(140,Math.min(widthLimit(),value)));requestedPropertyWidth=width;area.style.setProperty('--clip-properties-width',`${width}px`);divider.setAttribute('aria-valuenow',width);divider.setAttribute('aria-valuemax',widthLimit());inspectorLayout();}
  divider.addEventListener('pointerdown',event=>{if(event.button!==0)return;propertyResize={id:event.pointerId,x:event.clientX,width:properties.getBoundingClientRect().width,requestedWidth:requestedPropertyWidth};divider.setPointerCapture?.(event.pointerId);event.preventDefault();});
  divider.addEventListener('pointermove',event=>{if(propertyResize?.id===event.pointerId)setPropertyWidth(propertyResize.width+event.clientX-propertyResize.x);});
  divider.addEventListener('pointerup',event=>{if(propertyResize?.id===event.pointerId){propertyResize=null;divider.releasePointerCapture?.(event.pointerId);}});
  function cancelPropertyResize(){if(!propertyResize)return;const prior=propertyResize;propertyResize=null;if(prior.requestedWidth===null){requestedPropertyWidth=null;area.style.removeProperty('--clip-properties-width');inspectorLayout();}else setPropertyWidth(prior.requestedWidth);if(divider.hasPointerCapture?.(prior.id))divider.releasePointerCapture(prior.id);}
  divider.addEventListener('pointercancel',cancelPropertyResize);divider.addEventListener('lostpointercapture',cancelPropertyResize);
  divider.addEventListener('keydown',event=>{if(event.key==='Escape'&&propertyResize){event.preventDefault();event.stopPropagation();cancelPropertyResize();return;}if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const current=properties.getBoundingClientRect().width;setPropertyWidth(event.key==='Home'?140:event.key==='End'?widthLimit():current+(event.key==='ArrowRight'?20:-20));});
  const regionTools=make('div',{class:'clip-region-tools',role:'toolbar','aria-label':'Clip markers and loop'}),regionInputs={};
  regionTools.append(make('strong',{class:'clip-properties-heading'},'Clip'));
  for(const [key,label]of [['start','Start'],['end','End'],['loopStart','Loop Position'],['loopLength','Loop Length']]){
    const visibleLabel=key==='loopStart'?'Position':key==='loopLength'?'Length':label;
    const holder=make('label',{class:`clip-region-${key}`},visibleLabel),input=make('input',{type:'number',step:'.25',min:0,'aria-label':key==='start'?'Clip Start':key==='end'?'Clip End':label,title:`${label} in source beats (0 is 1.1.1)`});
    input.addEventListener('focus',()=>{if(!isDraft(input))fieldIntents.set(input,last?.regionScope);});
    input.addEventListener('change',()=>{const intent=fieldIntents.get(input);if(intent!==undefined&&intent!==last?.regionScope){onError('The selected clip changed. Return to the original clip before finishing this value.');return;}const value=Number(input.value);if(input.value===''||!Number.isFinite(value)){onError(`${label} requires a number.`);return;}onRegion(key,value);});
    regionInputs[key]=input;holder.append(input);regionTools.append(holder);
  }
  const loopLabel=make('label',{class:'clip-loop-toggle'}),loopToggle=make('input',{type:'checkbox','aria-label':'Clip Loop'});loopToggle.addEventListener('change',()=>onRegion('loopEnabled',loopToggle.checked));loopLabel.append(loopToggle,make('span',{},'Loop'));regionTools.append(loopLabel);
  const loopSelection=make('button',{type:'button','aria-label':'Loop Selection',title:'Set loop and Start from the time selection (Ctrl+L)'},'Loop Selection');actionIcon(loopSelection,'M4 5h10v8H4z M2 3v4 M16 11v4');loopSelection.addEventListener('click',onLoopSelection);regionTools.append(loopSelection,make('span',{class:'muted'},'beats'));
  const stretchTools=make('div',{class:'audio-stretch-tools',role:'toolbar','aria-label':'Audio Re-Pitch stretching'}),stretchInputs={};
  async function stretch(tempo,sourceId=last?.source?.id){try{return await onStretch(tempo,sourceId);}catch(error){onError(String(error));return null;}}
  stretchTools.append(make('strong',{},'Audio'),make('span',{class:'clip-audio-mode'},'Re-Pitch'));
  for(const [key,label,aria]of [['tempo','Source BPM','Audio source BPM'],['length','Length','Audio length in beats']]){
    const holder=make('label',{},label),input=make('input',{type:'number',step:'any','aria-label':aria});
    const identity=()=>JSON.stringify([last?.scope,last?.revision,last?.source?.id]);
    input.addEventListener('focus',()=>{if(!isDraft(input))fieldIntents.set(input,identity());});
    input.addEventListener('change',async()=>{
      if(last?.kind!=='audio'||!last.source||fieldIntents.get(input)!==identity()){onError('The audio source changed. Select it and enter the stretch value again.');return;}
      const value=Number(input.value),tempo=key==='tempo'?value:last.source.sourceTempo*value/last.length;
      if(input.value===''||!Number.isFinite(tempo)||tempo<30||tempo>240){onError('Re-Pitch requires a source tempo from 30 to 240 BPM.');return;}
      const scope=last.scope,sourceId=last.source.id,receipt=await stretch(tempo,sourceId);
      if(last.scope===scope&&last.source?.id===sourceId&&last.revision===receipt?.snapshot?.editRevision)fieldIntents.set(input,identity());
    });
    stretchInputs[key]=input;holder.append(input);if(key==='length')holder.append(make('span',{},'beats'));stretchTools.append(holder);
  }
  const stretchActions=[];
  for(const [label,factor]of [['Half sample length',.5],['Double sample length',2]]){
    const action=make('button',{type:'button','aria-label':label},factor===.5?'/2':'x2');action.addEventListener('click',()=>stretch(last.source.sourceTempo*factor));stretchTools.append(action);stretchActions.push({action,factor});
  }
  stretchTools.append(make('span',{class:'muted'},'Pitch follows speed; shared sample'));
  const optionGroups=[];
  const group=(key,label,content,path,open=true)=>{
    const section=make('details',{'data-section':key,...open?{open:''}:{}}),summary=make('summary',{},label);section.append(summary,content);
    const tab=make('button',{type:'button','aria-label':`Toggle ${label} options`,'aria-pressed':String(open),'data-help':`${label} options`});actionIcon(tab,path);
    tab.addEventListener('pointerdown',event=>event.preventDefault());
    tab.addEventListener('click',()=>{if(section.open)onPark(section);section.open=!section.open;tab.setAttribute('aria-pressed',String(section.open));if(section.open)onRestore(section);});
    summary.addEventListener('pointerdown',event=>{if(section.open&&section.contains(doc.activeElement)&&doc.activeElement?.matches?.('input,select,textarea')){onPark(section);event.preventDefault();}});
    section.addEventListener('keydown',event=>{if(event.key==='Tab'&&event.shiftKey&&event.target===content.querySelector?.('input,select,textarea,button'))onPark(section);});
    section.addEventListener('toggle',()=>{tab.setAttribute('aria-pressed',String(section.open));if(section.open)onRestore(section);});optionTabs.append(tab);optionGroups.push({section,tab});return section;
  };
  const regionGroup=group('clip','Clip',regionTools,'M3 3h12v12H3z M7 6l5 3-5 3z'),stretchGroup=group('audio','Audio',stretchTools,'M2 9h3l2-5 4 10 2-5h3');
  propertyGroups.append(regionGroup);
  const launchSettings=doc.getElementById?.('clip-launch-settings');
  if(launchSettings)propertyGroups.append(group('launch','Launch',launchSettings,'M4 3v12 M7 4l6 5-6 5 M14 4v10',false));
  const pitchTools=make('div',{class:'clip-pitch-tools'}),pitchReason='Unavailable: MIDI Pitch & Time operations need defined selection, validation and Undo behavior.';
  const row=(...children)=>{const element=make('div',{class:'clip-option-row'});element.append(...children);return element;};
  const disabledAction=label=>unavailable('button',`${label} unavailable`,pitchReason,label);
  const pitchValue=make('output',{class:'clip-pitch-value'},'---'),pitchActions=make('div',{class:'clip-pitch-actions'});pitchActions.append(disabledAction('Fit to Scale'),disabledAction('Invert'));pitchTools.append(row(pitchValue,pitchActions));
  pitchTools.append(row(unavailable('input','Pitch interval unavailable',pitchReason),disabledAction('Add Interval')));pitchTools.children[1].children[0].value='0 sd';
  const stretchDial=unavailable('button','MIDI stretch unavailable',pitchReason);actionIcon(stretchDial,'M4 14a7 7 0 1 1 10 0 M9 9V2');const stretchAmount=make('div',{class:'clip-midi-stretch'});stretchAmount.append(make('span',{},'Stretch'),stretchDial,make('output',{},'x1.0'));
  const stretchFactors=make('div',{class:'clip-pitch-actions'});stretchFactors.append(disabledAction('x2'),disabledAction('/2'));pitchTools.append(row(stretchAmount,stretchFactors));
  const lengthGrid=unavailable('select','MIDI length grid unavailable',pitchReason);lengthGrid.append(make('option',{},'Grid'));pitchTools.append(row(lengthGrid,disabledAction('Set Length')));
  const humanize=unavailable('input','Humanize amount unavailable',pitchReason);humanize.value='10%';pitchTools.append(row(humanize,disabledAction('Humanize')),row(disabledAction('Reverse'),disabledAction('Legato')));
  const pitchGroup=group('pitch','Pitch & Time',pitchTools,'M2 5h14 M2 13h14 M6 2v6 M12 10v6');propertyGroups.append(pitchGroup,stretchGroup);
  const midiOnlyGroups=[pitchGroup];
  for(const [key,label,path]of [['transform','Transform','M9 2a7 7 0 1 0 7 7 M9 2v4 M16 9h-4'],['generate','Generate','M9 2v3 M9 13v3 M2 9h3 M13 9h3 M4 4l2 2 M12 12l2 2 M4 14l2-2 M12 6l2-2']]){
    const body=make('div',{class:'clip-option-unavailable'});body.append(unavailable('select',`${label} unavailable`,`Unavailable: MIDI ${label.toLowerCase()} has no admitted implementation.`),make('p',{},`${label} is unavailable.`));body.children[0].append(make('option',{},label));const section=group(key,label,body,path,false);midiOnlyGroups.push(section);propertyGroups.append(section);
  }
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
    inspectorLayout();
    const audio=last.kind==='audio',hasSource=!!last.source,emptyAudio=audio&&!hasSource;
    svg=audio?audioSvg:midiSvg;
    midiSvg.hidden=audio||!hasSource;audioSvg.hidden=!audio||emptyAudio;empty.hidden=!emptyAudio;
    if(audio||!hasSource)midiSvg.setAttribute('hidden','');else midiSvg.removeAttribute('hidden');
    if(!audio||emptyAudio)audioSvg.setAttribute('hidden','');else audioSvg.removeAttribute('hidden');
    properties.hidden=false;optionTabs.hidden=!hasSource;propertyGroups.hidden=!hasSource;divider.hidden=!hasSource;area?.classList?.toggle('has-source',hasSource);
    if(hasSource&&!divider.getAttribute('aria-valuenow')){divider.setAttribute('aria-valuenow',Math.round(properties.getBoundingClientRect().width));divider.setAttribute('aria-valuemax',widthLimit());}
    toolbar.hidden=!hasSource;regionTools.hidden=!hasSource||!last.region;
    stretchTools.hidden=!audio||emptyAudio;stretchGroup.hidden=!audio||emptyAudio;
    for(const section of midiOnlyGroups)section.hidden=audio;for(const {section,tab}of optionGroups)tab.hidden=section.hidden;
    midiModes.hidden=audio;gridSelect.hidden=audio;
    if(audio&&!emptyAudio){
      if(doc.activeElement!==stretchInputs.tempo&&!isDraft(stretchInputs.tempo))stretchInputs.tempo.value=String(Number(last.source.sourceTempo.toFixed(6)));
      if(doc.activeElement!==stretchInputs.length&&!isDraft(stretchInputs.length))stretchInputs.length.value=String(Number(last.length.toFixed(6)));
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
      for(const [key,input]of Object.entries(regionInputs))if(doc.activeElement!==input&&!isDraft(input))input.value=String(key==='loopLength'?region.loopEnd-region.loopStart:region[key]);
      loopToggle.checked=region.loopEnabled;loopSelection.disabled=!last.timeSelection;
      const color=region.loopEnabled?'#acc8b7':'#898983',brace=clip(svg,'piano-clip-markers',pad-1,17,width-pad+2,35);
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
      const body=make('rect',{x,y,width:w,height:h,rx:1,fill:chosen?'#dfc5ac':last.color??'#c8ae74',stroke:chosen?'#91b9ed':'#2b2924','stroke-width':chosen?2:.5,'data-note':index,'data-part':'body','aria-selected':chosen,'aria-label':`${pitchName(note.pitch)}, beat ${note.beat+1}, velocity ${note.velocity}`});
      notes.append(body,make('rect',{x:x+Math.max(0,w-6),y,width:Math.min(6,w),height:h,fill:chosen?'#819da3':last.color??'#ab9461',stroke:'none','data-note':index,'data-part':'resize'}));
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
    velocityLane.replaceChildren();velocityLane.append(make('rect',{x:0,y:0,width:g.width,height,fill:'#393939',stroke:'none'}));
    text(velocityLane,5,16,'Vel');text(velocityLane,5,31,'1-127',{'font-size':9});
    const stems=clip(velocityLane,'piano-velocity-stems',g.pad,0,g.width-g.pad,height);
    stems.append(make('line',{x1:g.pad,x2:g.width,y1:bottom,y2:bottom,stroke:'#555'}));
    const ordered=last.notes.map((note,index)=>({note,index}));
    // Chords share a velocity marker position. Keep the selected note reachable.
    ordered.sort((a,b)=>Number(last.selectedNote===a.note.id)-Number(last.selectedNote===b.note.id));
    ordered.forEach(({note,index})=>{
      const x=beatX(note.beat,g),chosen=last.selectedNote===note.id,y=bottom-(note.velocity/127)*(bottom-top);
      stems.append(make('line',{x1:x,x2:x,y1:y,y2:bottom,stroke:chosen?'#a7c8cd':'#8dbab1','stroke-width':chosen?2:1,'pointer-events':'none'}));
      stems.append(make('rect',{x:x-3,y:y-3,width:7,height:7,fill:chosen?'#a7c8cd':'#8dbab1',stroke:'#272727','data-note':index,'data-part':'velocity','aria-label':`Note ${index+1} velocity ${note.velocity}`}));
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
  const resize=()=>{if(disposed)return;inspectorLayout();if(!last?.source)return;const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height||(rect.width===g.width&&rect.height===g.height))return;onNavigate();draw();};
  for(const surface of [midiSvg,audioSvg])surface.addEventListener('wheel',wheel,{passive:false});
  const observer=win?.ResizeObserver?new win.ResizeObserver(resize):null;observer?.observe(midiSvg);observer?.observe(audioSvg);observer?.observe(area);observer?.observe(properties);win?.addEventListener('resize',resize);
  return {
    velocityLane,
    preview({enabled,available,reason}){previewEnabled=enabled;previewButton.disabled=!available;previewButton.setAttribute('aria-pressed',String(enabled));previewButton.title=available?'Preview selected, added and moved notes through the instrument':reason??'Native MIDI Preview is unavailable';},
    render(value){
      const transfer=(prefix,previous,next,fields)=>{if(previous!==null){const key=prefix+previous,retained=onStash(key,fields);if(retained.length)scopedIntents.set(key,new Map(retained.map(input=>[input,fieldIntents.get(input)])));}const key=prefix+next;onRecall(key);const intents=scopedIntents.get(key);if(intents){for(const [input,intent]of intents)fieldIntents.set(input,intent);scopedIntents.delete(key);}};
      if(value.scope!==scope){
        transfer('source:',scope,value.scope,Object.values(stretchInputs));
        scope=value.scope;viewport=initialViewport(value.notes,value.kind==='audio'?Math.ceil(value.length/4)*4+4:value.length);waveformZoom=1;
        if(stretchGroup.open)onRestore(stretchGroup);
      }
      if(value.regionScope!==regionScope){transfer('region:',regionScope,value.regionScope,Object.values(regionInputs));regionScope=value.regionScope;if(regionGroup.open)onRestore(regionGroup);}
      last=value;draw();return g;
    },
    dispose(){disposed=true;observer?.disconnect();for(const surface of [midiSvg,audioSvg])surface.removeEventListener('wheel',wheel);win?.removeEventListener('resize',resize);}
  };
}
