import {createAliveModel,parameterReading} from './alive-model.mjs';

export function mountAlive({doc=globalThis.document,win=globalThis.window,invoke=win?.__TAURI__?.core?.invoke}={}){
  const $=id=>doc.getElementById(id),make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const model=createAliveModel();let selected=0,queue=Promise.resolve(),disposed=false,trackKey='',musicKey='',parameterKey='';
  const trackViews=[],parameterViews=new Map(),diagnostics=new Map();
  function notice(text,error=false){$('notice').textContent=String(text);$('notice').classList.toggle('error',error);}
  function enqueue(work){const result=queue.then(work);queue=result.catch(error=>notice(error,true));return result;}
  function generation(){return model.snapshot()?.generation;}
  function command(name,args={}){return invoke(name,{...args,generation:generation()});}
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
  function edit(change,rebuild=true){
    const document=model.edit(change);if(!rebuild)musicKey=JSON.stringify([selected,document.tempo,document.lengthBeats,document.loopEnabled,document.tracks[selected]?.notes,document.tracks[selected]?.automation]);
    enqueue(()=>command('alive_draft',{document}));render();
    if(!rebuild){paintPiano($('piano-roll'),document.tracks[selected].notes,document.lengthBeats,true);paintLanes();}
  }
  async function refresh(){const snapshot=await invoke('alive_current');model.accept(snapshot);render();return snapshot;}
  function file(action){commitFocused();return enqueue(async()=>{
    if(model.pending())await command('alive_draft',{document:model.document()});
    const result=await command('alive_file',{action});model.applied(result??await invoke('alive_current'));trackKey=musicKey=parameterKey='';render();if(result)notice(action.startsWith('save')?'Session saved.':'Session ready.');
  });}
  function transport(action){return enqueue(async()=>{await command('alive_transport',{action,beat:Number($('seek').value)});await refresh();notice(action==='start'?(model.pending()?'Playing the prepared schedule. Pending edits remain unapplied.':'Transport playing.'):action==='stop'?'Transport stopped.':'Transport seek queued.');});}
  function paintPiano(svg,notes,length,detailed=false){
    const width=640,height=detailed?218:52,pad=detailed?32:0,top=detailed?21:3;
    const min=detailed?Math.min(48,...notes.map(n=>n.pitch))-1:Math.min(48,...notes.map(n=>n.pitch)),max=detailed?Math.max(84,...notes.map(n=>n.pitch))+1:Math.max(84,...notes.map(n=>n.pitch));
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
    for(const note of notes)svg.append(svgElement('rect',{x:x(note.beat)+1,y:y(note.pitch),width:Math.max(2,x(note.duration)-pad-2),height:Math.max(2,pitchHeight-1),rx:1,fill:detailed?'#efbb62':'#c8ae74',stroke:'none'}));
    svg.append(svgElement('line',{class:'playhead',x1:pad,x2:pad,y1:0,y2:height,stroke:'#eeeeec','stroke-width':1}));
  }
  function buildTracks(document){
    $('tracks').replaceChildren();trackViews.length=0;
    document.tracks.forEach((track,index)=>{
      const row=make('article','track'),name=make('button','track-name'),title=make('span','',track.name),detail=make('small','',`${track.notes.length} notes / stereo`),clip=make('button','clip-preview'),svg=svgElement('svg');
      name.append(title,detail);name.setAttribute('aria-label',`Select ${track.name} track`);clip.setAttribute('aria-label',`${track.name} clip`);clip.append(svg);
      const choose=()=>{selected=index;musicKey=parameterKey='';render();};name.addEventListener('click',choose);clip.addEventListener('click',choose);
      const gainLabel=make('label','track-gain','Gain'),gain=numeric(`${track.name} gain`,track.gain,{min:0,max:2,step:.05},value=>mix(index,{gain:value}));gainLabel.append(gain);
      const mute=make('button','mixer-toggle','M'),solo=make('button','mixer-toggle','S');mute.setAttribute('aria-label',`${track.name} mute`);solo.setAttribute('aria-label',`${track.name} solo`);
      mute.addEventListener('click',guard(()=>mix(index,{mute:!model.document().tracks[index].mute})));solo.addEventListener('click',guard(()=>mix(index,{solo:!model.document().tracks[index].solo})));
      const meters=make('div','track-meter'),bar=make('div','stereo-meter'),readout=make('output');bar.append(make('i'),make('i'));bar.setAttribute('aria-label',`${track.name} stereo peak`);readout.setAttribute('aria-label',`${track.name} peak`);meters.append(bar,readout);
      const actions=make('div','track-actions');for(const[action,label]of [['editor','Editor'],['load','Replace'],['remove','Remove']]){
        const button=make('button','',label);button.setAttribute('aria-label',action==='editor'?`Open ${track.name} editor`:`${label} ${track.name} device`);
        button.addEventListener('click',guard(()=>enqueue(async()=>{
          if(action==='editor')await command('alive_editor',{track:index});else{const snapshot=await command('alive_device',{track:index,action});model.applied(snapshot);trackKey=musicKey=parameterKey='';render();notice('Device updated.');}
        })));actions.append(button);
      }
      row.append(name,clip,gainLabel,mute,solo,meters,actions);$('tracks').append(row);trackViews.push({row,detail,svg,gain,mute,solo,bar,readout,actions});
    });
  }
  function mix(track,changes){return enqueue(async()=>{const current=model.snapshot().document.tracks[track];await command('alive_mixer',{track,gain:changes.gain??current.gain,mute:changes.mute??current.mute,solo:changes.solo??current.solo});await refresh();});}
  function buildMusic(document){
    const track=document.tracks[selected];$('clip-title').textContent=`${track.name} clip`;
    paintPiano($('piano-roll'),track.notes,document.lengthBeats,true);$('notes').replaceChildren();
    track.notes.forEach((note,index)=>{
      const row=make('tr');for(const[key,bounds]of [['beat',{min:0,max:document.lengthBeats,step:.25}],['pitch',{min:0,max:127,step:1}],['duration',{min:1/64,max:document.lengthBeats,step:.25}],['velocity',{min:1,max:127,step:1}]]){
        const cell=make('td'),input=numeric(`Note ${index+1} ${key}`,note[key],bounds,value=>edit(doc=>{doc.tracks[selected].notes[index][key]=value;},false));cell.append(input);row.append(cell);
      }
      const remove=make('button','','Remove'),cell=make('td');remove.setAttribute('aria-label',`Remove note ${index+1}`);remove.addEventListener('click',()=>edit(doc=>doc.tracks[selected].notes.splice(index,1)));cell.append(remove);row.append(cell);$('notes').append(row);
    });
    $('lanes').replaceChildren();
    for(const key of ['cutoff','level']){
      const binding=model.snapshot().devices[selected]?.parameters.find(p=>p.key===key);if(!binding)continue;
      const lane=track.automation.find(l=>l.key===key),section=make('div','lane'),heading=make('div','lane-heading'),label=make('label'),enable=make('input'),add=make('button','',`Add ${binding.label} point`);
      section.dataset.lane=key;enable.type='checkbox';enable.checked=!!lane?.enabled;enable.setAttribute('aria-label',`${binding.label} automation enabled`);label.append(enable,doc.createTextNode(binding.label));heading.append(label,add);add.setAttribute('aria-label',`Add ${binding.label} point`);
      const ensure=doc=>{const track=doc.tracks[selected];let lane=track.automation.find(l=>l.key===key);if(!lane){lane={key,enabled:false,points:[]};track.automation.push(lane);}return lane;};
      enable.addEventListener('change',()=>edit(doc=>{ensure(doc).enabled=enable.checked;},false));
      add.addEventListener('click',guard(()=>edit(doc=>{const points=ensure(doc).points,last=points.at(-1)?.beat??-1;const beat=last<0?0:Math.min(doc.lengthBeats-.015625,last+1);if(beat<=last)throw Error('Move or remove the final point to make room before the clip end.');points.push({beat,value:binding.base});})));
      const graph=svgElement('svg',{class:'lane-graph','aria-label':`${binding.label} step automation`,role:'img'}),points=make('div','lane-points');
      if(!lane?.points.length)points.append(make('span','lane-empty','No points. Base value applies.'));
      (lane?.points??[]).forEach((point,index)=>{
        const group=make('div','lane-point'),beat=numeric(`${binding.label} point ${index+1} beat`,point.beat,{min:0,max:document.lengthBeats,step:.25},value=>edit(doc=>{ensure(doc).points[index].beat=value;},false)),value=numeric(`${binding.label} point ${index+1} value`,point.value,{min:binding.min,max:binding.max,step:binding.integral?1:'any'},value=>edit(doc=>{ensure(doc).points[index].value=value;},false)),remove=make('button','','x');
        remove.setAttribute('aria-label',`Remove ${binding.label} point ${index+1}`);remove.addEventListener('click',()=>edit(doc=>ensure(doc).points.splice(index,1)));group.append(beat,value,remove);points.append(group);
      });
      section.append(heading,graph,points);$('lanes').append(section);
    }
    paintLanes();
  }
  function paintLanes(){
    const document=model.document(),track=document.tracks[selected];
    for(const section of $('lanes').children){
      const key=section.dataset.lane,binding=model.snapshot().devices[selected].parameters.find(p=>p.key===key),lane=track.automation.find(l=>l.key===key),svg=section.querySelector('svg'),x=beat=>beat/document.lengthBeats*600,y=value=>36-(value-binding.min)/(binding.max-binding.min)*31;
      svg.setAttribute('viewBox','0 0 600 40');svg.setAttribute('preserveAspectRatio','none');svg.replaceChildren();
      let d=`M 0 ${y(binding.base)}`;for(const point of lane?.points??[])d+=` H ${x(point.beat)} V ${y(point.value)}`;d+=' H 600';
      svg.append(svgElement('path',{d,stroke:lane?.enabled?'#88c5c7':'#b4b4b0','stroke-width':1.5,fill:'none'}));
      for(const point of lane?.points??[])svg.append(svgElement('circle',{cx:x(point.beat),cy:y(point.value),r:2.5,fill:'#eeeeec',stroke:'none'}));
    }
  }
  function buildParameters(snapshot){
    $('parameters').replaceChildren();parameterViews.clear();const device=snapshot.devices[selected];
    $('device-title').textContent=device?.name??'Device';$('device-path').textContent=snapshot.document.tracks[selected].device.path;
    for(const binding of device?.parameters??[]){
      const section=make('div','parameter'),label=make('label','',binding.label),base=make('div','base'),unit=make('span','unit',binding.unit??''),number=numeric(`${binding.label} base`,binding.base,{min:binding.min,max:binding.max,step:binding.integral?1:binding.max<=1?.01:binding.max<=20?.1:1},value=>setBase(binding.key,value)),range=make('input'),output=make('output');
      range.type='range';range.min=binding.min;range.max=binding.max;range.step=binding.integral?'1':'any';range.value=binding.base;range.id=`base-${binding.key}`;range.setAttribute('aria-label',`${binding.label} base slider`);label.htmlFor=range.id;
      range.addEventListener('change',guard(()=>setBase(binding.key,Number(range.value))));range.addEventListener('input',()=>{number.value=range.value;});
      output.setAttribute('aria-label',`${binding.label} effective ownership`);base.append(number,unit);section.append(label,range,base,output);$('parameters').append(section);parameterViews.set(binding.key,{section,number,range,output});
    }
  }
  function setBase(key,value){const track=selected;return enqueue(async()=>{await command('alive_base',{track,key,value});await refresh();});}
  const diagnosticNames=['Audio backend','Audio device','Audio sample rate','Audio buffer frames','Audio callbacks','Audio stream errors','Audio failed','Audio status','Transport playing','Absolute frame','Rejected commands','Native generation','Track 1 active voices','Track 2 active voices'];
  for(const name of diagnosticNames){const label=make('label','',name),output=make('output','','-');output.setAttribute('aria-label',name);label.append(output);$('diagnostics').append(label);diagnostics.set(name,output);}
  function render(){
    const snapshot=model.snapshot(),document=model.document();if(!snapshot||!document)return;
    selected=Math.min(selected,document.tracks.length-1);
    $('session-title').textContent=document.title;$('dirty').textContent=snapshot.dirty||model.pending()?'Modified':'';doc.title=`${snapshot.dirty||model.pending()?'* ':''}${document.title} - Alive`;
    for(const[id,value]of [['tempo',document.tempo],['length',document.lengthBeats]])if(doc.activeElement!==$(id))$(id).value=value;
    $('loop').checked=document.loopEnabled;$('apply').disabled=$('discard').disabled=!model.pending();$('draft-status').textContent=model.pending()?'Pending schedule edits':'Prepared schedule';
    $('start').disabled=!!snapshot.state.playing;$('stop').disabled=false;$('add-track').disabled=document.tracks.length>=2||!!snapshot.state.playing||model.pending();
    const nextTracks=JSON.stringify([snapshot.generation,document.tracks.map(t=>[t.id,t.name])]);if(nextTracks!==trackKey){trackKey=nextTracks;buildTracks(document);}
    const nextMusic=JSON.stringify([selected,document.tempo,document.lengthBeats,document.loopEnabled,document.tracks[selected]?.notes,document.tracks[selected]?.automation]);
    if(nextMusic!==musicKey){musicKey=nextMusic;buildMusic(document);}
    const nextParameters=JSON.stringify([snapshot.generation,selected,snapshot.devices[selected]?.id]);if(nextParameters!==parameterKey){parameterKey=nextParameters;buildParameters(snapshot);}
    document.tracks.forEach((track,index)=>{
      const view=trackViews[index],runtime=snapshot.state.tracks[index];view.row.classList.toggle('selected',selected===index);view.row.setAttribute('aria-label',`${track.name} track`);view.detail.textContent=`${track.notes.length} notes / stereo`;
      if(doc.activeElement!==view.gain)view.gain.value=track.gain;view.mute.setAttribute('aria-pressed',String(track.mute));view.solo.setAttribute('aria-pressed',String(track.solo));
      const key=JSON.stringify([track.notes,document.lengthBeats]);if(view.paintKey!==key){view.paintKey=key;paintPiano(view.svg,track.notes,document.lengthBeats);}
      meter(view.bar,runtime.peakLeft,runtime.peakRight);view.readout.textContent=peak(runtime.peakLeft,runtime.peakRight);
      for(const button of [...view.actions.children].slice(1))button.disabled=!!snapshot.state.playing||model.pending();
    });
    for(const[bindingIndex,binding]of (snapshot.devices[selected]?.parameters??[]).entries()){
      const view=parameterViews.get(binding.key),reading=parameterReading(binding,snapshot.state.tracks[selected],bindingIndex);if(!view)continue;
      if(doc.activeElement!==view.number)view.number.value=reading.base;if(doc.activeElement!==view.range)view.range.value=reading.base;
      view.output.textContent=`${reading.owner}: ${Number(reading.effective.toFixed(3))}${binding.unit?' '+binding.unit:''}`;view.section.classList.toggle('automated',reading.owner==='Automation');
    }
    const beat=snapshot.state.position/(48000*60/snapshot.document.tempo);$('position').textContent=`${beat.toFixed(3)} beats`;
    for(const svg of [...trackViews.map(v=>v.svg),$('piano-roll')]){const line=svg.querySelector('.playhead');if(line){const detailed=svg===$('piano-roll'),pad=detailed?32:0,x=pad+beat/document.lengthBeats*(640-pad);line.setAttribute('x1',x);line.setAttribute('x2',x);}}
    meter($('master-meter'),snapshot.state.peakLeft,snapshot.state.peakRight);$('master-peak').textContent=peak(snapshot.state.peakLeft,snapshot.state.peakRight);
    const a=snapshot.audio,s=snapshot.state,values=[a.host||a.config.host,a.device||a.config.device,a.config.sample_rate,a.observed_buffer_frames,a.callbacks,a.stream_errors,String(a.failed),a.message,String(!!s.playing),s.absoluteFrame,s.rejected,s.generation,s.tracks[0]?.activeVoices??0,s.tracks[1]?.activeVoices??0];
    diagnosticNames.forEach((name,index)=>{diagnostics.get(name).textContent=String(values[index]);});
  }
  for(const[id,action,label]of [['new','new','New session'],['open','open','Open session'],['save','save','Save session'],['save-as','saveAs','Save session as'],['quit','quit','Quit Alive']])bind(id,label,()=>file(action));
  bind('start','Start transport',()=>transport('start'));bind('stop','Stop transport',()=>transport('stop'));bind('seek-go','Seek transport',()=>transport('seek'));
  $('tempo').addEventListener('change',guard(()=>edit(doc=>{doc.tempo=Number($('tempo').value);},false)));$('length').addEventListener('change',guard(()=>edit(doc=>{doc.lengthBeats=Number($('length').value);},false)));$('loop').addEventListener('change',()=>edit(doc=>{doc.loopEnabled=$('loop').checked;},false));
  bind('apply','Prepare / Apply',()=>{commitFocused();return enqueue(async()=>{const snapshot=await command('alive_apply',{document:model.document()});model.applied(snapshot);trackKey=musicKey=parameterKey='';render();notice('Schedule prepared and applied. Start transport when ready.');});});
  bind('discard','Discard edits',()=>enqueue(async()=>{await command('alive_draft',{document:null});model.discard();await refresh();notice('Pending schedule edits discarded.');}));
  bind('add-note','Add note',()=>edit(doc=>{if(doc.tracks[selected].notes.length>=128)throw Error('A clip supports up to 128 notes.');doc.tracks[selected].notes.push({beat:0,pitch:60,duration:Math.min(.5,doc.lengthBeats),velocity:90});}));
  bind('add-track','Add instrument track',()=>enqueue(async()=>{const snapshot=await command('alive_device',{track:model.document().tracks.length,action:'load'});model.applied(snapshot);trackKey=musicKey=parameterKey='';render();}));
  const keydown=guard(event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();return file(event.shiftKey?'saveAs':'save');}if(event.code==='Space'&&!event.target.matches('input,button,summary')){event.preventDefault();return transport(model.snapshot()?.state.playing?'stop':'start');}});doc.addEventListener('keydown',keydown);
  let unlisten=null;
  if(win?.__TAURI__?.event?.listen)win.__TAURI__.event.listen('alive-close-requested',()=>{guard(()=>file('quit'))();}).then(fn=>{unlisten=fn;});
  async function poll(){if(disposed)return;try{await enqueue(refresh);}catch{}if(!disposed)win.setTimeout(poll,80);}
  if(invoke){enqueue(refresh).then(()=>notice('Ready. Select a clip to edit notes or automation.')).catch(()=>{});win.setTimeout(poll,80);}else notice('Open Alive in the native app with ultra --alive. This page does not synthesize audio.',true);
  return{model,refresh,dispose(){disposed=true;unlisten?.();doc.removeEventListener('keydown',keydown);}};
}
if(globalThis.document)mountAlive();
