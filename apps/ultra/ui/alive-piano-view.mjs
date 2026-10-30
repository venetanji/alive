import {GRID,geometry,initialViewport,navigateViewport,fitViewport,rulerTicks,beatX} from './alive-piano.mjs';

const blackKeys=new Set([1,3,6,8,10]);
const pitchName=pitch=>`${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][pitch%12]}${Math.floor(pitch/12)-1}`;

export function mountPianoView({doc,win,svg,onNavigate=()=>{},onGeometry=()=>{}}){
  const make=(tag,attrs={},text)=>{
    const element=tag==='svg'||['rect','line','text','g','defs','clipPath','path','title'].includes(tag)
      ?doc.createElementNS('http://www.w3.org/2000/svg',tag):doc.createElement(tag);
    for(const [key,value]of Object.entries(attrs))element.setAttribute(key,String(value));
    if(text!==undefined)element.textContent=text;
    return element;
  };
  const area=svg.parentElement,toolbar=make('div',{class:'piano-tools',role:'toolbar','aria-label':'Piano viewport'});
  const range=make('output',{class:'piano-view-range','aria-label':'Visible piano range',title:'Wheel: scroll pitch; Shift + wheel: scroll time; Ctrl + wheel: zoom time; Alt + wheel: zoom pitch'});
  const velocityLane=make('svg',{class:'piano-velocity-lane','aria-label':'Note velocity lane',role:'group',tabindex:0,'aria-describedby':'piano-help'});
  let viewport,last=null,g=null,scope=null,disposed=false;

  function navigate(action){
    if(!last)return;
    onNavigate();
    viewport=action.type==='fit'?fitViewport(last.notes,g):navigateViewport(viewport,g,action);
    draw();
  }
  function button(label,symbol,action){
    const element=make('button',{type:'button','aria-label':label,title:label},symbol);
    // Navigating the viewport must not blur an unfinished numeric edit.
    element.addEventListener('pointerdown',event=>event.preventDefault());
    element.addEventListener('click',()=>navigate(typeof action==='function'?action():action));
    return element;
  }
  const time=make('div',{class:'piano-tool-group'}),pitch=make('div',{class:'piano-tool-group'});
  time.append(make('span',{},'Time'),button('Scroll time earlier','<',()=>({type:'timePan',beats:-g.beatSpan/4})),button('Scroll time later','>',()=>({type:'timePan',beats:g.beatSpan/4})),button('Zoom out time','-',{type:'timeZoom',factor:1/1.5}),button('Zoom in time','+',{type:'timeZoom',factor:2}));
  pitch.append(make('span',{},'Pitch'),button('Scroll pitch down','v',{type:'pitchPan',pitches:-3}),button('Scroll pitch up','^',{type:'pitchPan',pitches:3}),button('Zoom out pitch','-',{type:'pitchZoom',factor:1/1.25}),button('Zoom in pitch','+',{type:'pitchZoom',factor:1.25}));
  toolbar.append(time,pitch,button('Fit notes','Fit',{type:'fit'}),range);
  if(area){area.insertBefore(toolbar,svg);area.insertBefore(velocityLane,svg.nextSibling??null);}

  function text(parent,x,y,value,attrs={}){
    parent.append(make('text',{x,y,fill:'#b4b4b0',stroke:'none','font-size':10,...attrs},value));
  }
  function clip(parent,id,x,y,width,height){
    const defs=make('defs'),path=make('clipPath',{id});path.append(make('rect',{x,y,width,height}));defs.append(path);parent.append(defs);
    const group=make('g',{'clip-path':`url(#${id})`});parent.append(group);return group;
  }
  function draw(){
    if(!last||disposed)return;
    const rect=svg.getBoundingClientRect();
    g=last.frozenGeometry??geometry(last.notes,last.length,viewport,{width:rect.width||640,height:rect.height||156});
    onGeometry(g);
    const {width,height,pad,top,pitchHeight}=g;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio','xMinYMin meet');
    for(const [key,value]of Object.entries({'beat-start':g.beatStart,'beat-span':g.beatSpan,'pitch-max':g.max,'row-height':pitchHeight,'keyboard-width':pad,'ruler-height':top}))svg.setAttribute(`data-${key}`,value);
    svg.replaceChildren();
    svg.append(make('rect',{x:0,y:0,width,height,fill:'#313131',stroke:'none'}));
    const grid=clip(svg,'piano-note-grid',pad,top,width-pad,height-top);
    for(let pitch=g.min;pitch<=g.max;pitch++){
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
    svg.append(make('rect',{x:0,y:0,width,height:top,fill:'#303030',stroke:'none'}));
    text(svg,8,14,'4/4');
    for(const tick of ticks){const x=beatX(tick.beat,g);text(svg,x+4,14,tick.label,{'data-ruler-beat':tick.beat,fill:tick.major?'#eeeeec':'#a4a4a0'});}
    svg.append(make('line',{x1:pad,x2:width,y1:top,y2:top,stroke:'#666'}));
    const notes=clip(svg,'piano-note-bodies',pad,top,width-pad,height-top);
    last.notes.forEach((note,index)=>{
      const x=beatX(note.beat,g)+1,y=top+(g.max-note.pitch)*pitchHeight+1,w=Math.max(2,note.duration*g.pixelsPerBeat-2),h=Math.max(1,pitchHeight-2),chosen=last.selectedNote===(note.id??index);
      const body=make('rect',{x,y,width:w,height:h,rx:1,fill:chosen?'#f1c77d':'#c8ae74',stroke:chosen?'#91b9ed':'#2b2924','stroke-width':chosen?2:.5,'data-note':index,'data-part':'body','aria-selected':chosen,'aria-label':`${pitchName(note.pitch)}, beat ${note.beat+1}, velocity ${note.velocity}`});
      notes.append(body,make('rect',{x:x+Math.max(0,w-6),y,width:Math.min(6,w),height:h,fill:chosen?'#91b9ed':'#ab9461',stroke:'none','data-note':index,'data-part':'resize'}));
      if(w>33&&h>=10)text(notes,x+4,y+Math.min(h-1,10),pitchName(note.pitch),{fill:'#302a1f','pointer-events':'none'});
    });
    notes.append(make('line',{class:'playhead',x1:pad,x2:pad,y1:top,y2:height,stroke:'#eeeeec','stroke-width':1,'pointer-events':'none'}));
    drawVelocity();
    range.textContent=`${pitchName(g.min)} - ${pitchName(g.max)} / 1/16`;
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
    ordered.sort((a,b)=>Number(last.selectedNote===(a.note.id??a.index))-Number(last.selectedNote===(b.note.id??b.index)));
    ordered.forEach(({note,index})=>{
      const x=beatX(note.beat,g),chosen=last.selectedNote===(note.id??index),y=bottom-(note.velocity/127)*(bottom-top);
      stems.append(make('line',{x1:x,x2:x,y1:y,y2:bottom,stroke:chosen?'#91b9ed':'#c8ae74','stroke-width':chosen?2:1,'pointer-events':'none'}));
      stems.append(make('rect',{x:x-3,y:y-3,width:7,height:7,fill:chosen?'#91b9ed':'#c8ae74',stroke:'#272727','data-note':index,'data-part':'velocity','aria-label':`Note ${index+1} velocity ${note.velocity}`}));
    });
  }
  const wheel=event=>{
    if(!last)return;
    event.preventDefault();
    const rect=svg.getBoundingClientRect(),x=Math.max(0,Math.min(1,(event.clientX-rect.left-g.pad)/(g.width-g.pad))),y=Math.max(0,Math.min(1,(event.clientY-rect.top-g.top)/(g.height-g.top)));
    if(event.ctrlKey||event.metaKey)navigate({type:'timeZoom',factor:event.deltaY<0?1.25:1/1.25,anchor:x});
    else if(event.altKey)navigate({type:'pitchZoom',factor:event.deltaY<0?1.15:1/1.15,anchor:y});
    else if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))navigate({type:'timePan',beats:(event.deltaX||event.deltaY)/g.pixelsPerBeat});
    else navigate({type:'pitchPan',pitches:-Math.sign(event.deltaY)*3});
  };
  const resize=()=>{if(!last||disposed)return;const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height||(rect.width===g.width&&rect.height===g.height))return;onNavigate();draw();};
  svg.addEventListener('wheel',wheel,{passive:false});
  const observer=win?.ResizeObserver?new win.ResizeObserver(resize):null;observer?.observe(svg);win?.addEventListener('resize',resize);
  return {
    velocityLane,
    render(value){if(value.scope!==scope){scope=value.scope;viewport=initialViewport(value.notes,value.length);}last=value;draw();return g;},
    dispose(){disposed=true;observer?.disconnect();svg.removeEventListener('wheel',wheel);win?.removeEventListener('resize',resize);}
  };
}
