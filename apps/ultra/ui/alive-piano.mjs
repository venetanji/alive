// All gesture math uses the pointer-down viewport and original note.
export const GRID=.25;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const snap=value=>Math.round(value/GRID)*GRID;
export function timeSelection(a,b,length){
  a=clamp(snap(a),0,length);b=clamp(snap(b),0,length);
  const start=Math.min(a,b),end=Math.max(a,b);
  return end>start?{start,end}:null;
}
export const loopSelection=(region,selection)=>({...region,start:selection.start,loopStart:selection.start,loopEnd:selection.end,loopEnabled:true});
export function transformRegion(region,kind,delta,length){
  delta=snap(delta);const next={...region},minimum=1/64;
  if(kind==='loopMove'){
    delta=clamp(delta,-region.loopStart,length-region.loopEnd);
    next.loopStart+=delta;next.loopEnd+=delta;
  }else if(kind==='loopLeft')next.loopStart=clamp(region.loopStart+delta,0,region.loopEnd-minimum);
  else if(kind==='loopRight')next.loopEnd=clamp(region.loopEnd+delta,region.loopStart+minimum,length);
  else if(kind==='start')next.start=clamp(region.start+delta,0,Math.min(region.end,region.loopEnabled?region.loopEnd:Infinity)-minimum);
  else if(kind==='end')next.end=clamp(region.end+delta,region.start+minimum,length);
  return next;
}
export function initialViewport(notes,length){
  const pitches=notes.map(n=>n.pitch),center=pitches.length?(Math.min(...pitches)+Math.max(...pitches))/2:60;
  return {beatStart:0,beatSpan:length,pitchTop:Math.round(center)+6,pitchHeight:12};
}
export function geometry(notes,length,viewport={},size={}){
  const v={...initialViewport(notes,length),...viewport},width=Math.max(64,size.width??640),height=Math.max(34,size.height??218),pad=48,top=size.top??22;
  const pitchHeight=clamp(v.pitchHeight,1,36),rows=Math.min(128,Math.ceil((height-top)/pitchHeight));
  const max=clamp(Math.round(v.pitchTop),rows-1,127),min=Math.max(0,max-rows+1);
  const beatSpan=clamp(v.beatSpan,Math.min(GRID,length),length),beatStart=clamp(v.beatStart,0,length-beatSpan);
  return {width,height,pad,top,min,max,length,pitchHeight,beatStart,beatSpan,pixelsPerBeat:(width-pad)/beatSpan};
}
export function navigateViewport(viewport,g,action){
  const next={...viewport};
  if(action.type==='timeZoom'){
    next.beatSpan=clamp(g.beatSpan/action.factor,Math.min(GRID,g.length),g.length);
    next.beatStart=clamp(g.beatStart+(g.beatSpan-next.beatSpan)*(action.anchor??.5),0,g.length-next.beatSpan);
  }else if(action.type==='timePan')next.beatStart=clamp(g.beatStart+action.beats,0,g.length-g.beatSpan);
  else if(action.type==='pitchPan')next.pitchTop=clamp(g.max+action.pitches,Math.ceil((g.height-g.top)/g.pitchHeight)-1,127);
  else if(action.type==='pitchZoom'){
    next.pitchHeight=clamp(g.pitchHeight*action.factor,4,36);
    const anchor=action.anchor??.5,pitch=g.max-(g.height-g.top)*anchor/g.pitchHeight;
    next.pitchTop=Math.round(pitch+(g.height-g.top)*anchor/next.pitchHeight);
  }
  return next;
}
export function fitViewport(notes,g){
  if(!notes.length)return initialViewport([],g.length);
  const start=Math.max(0,Math.min(...notes.map(n=>n.beat))-.5),end=Math.min(g.length,Math.max(...notes.map(n=>n.beat+n.duration))+.5);
  const min=Math.max(0,Math.min(...notes.map(n=>n.pitch))-2),max=Math.min(127,Math.max(...notes.map(n=>n.pitch))+2);
  return {beatStart:start,beatSpan:Math.max(GRID,end-start),pitchTop:max,pitchHeight:Math.min(24,(g.height-g.top)/(max-min+1))};
}
export function rulerTicks(g){
  const step=g.pixelsPerBeat>=40?1:Math.max(4,4*Math.ceil(40/g.pixelsPerBeat/4)),ticks=[];
  for(let beat=Math.ceil(g.beatStart/step)*step;beat<=g.beatStart+g.beatSpan&&ticks.length<130;beat+=step){
    ticks.push({beat,major:beat%4===0,label:beat%4===0?String(Math.floor(beat/4)+1):`${Math.floor(beat/4)+1}.${beat%4+1}`});
  }
  return ticks;
}
export function point(event,rect,g){return {x:(event.clientX-rect.left)*g.width/rect.width,y:(event.clientY-rect.top)*g.height/rect.height};}
export const beatAt=(p,g)=>g.beatStart+(p.x-g.pad)/(g.width-g.pad)*g.beatSpan;
export const beatX=(beat,g)=>g.pad+(beat-g.beatStart)*g.pixelsPerBeat;
export const pitchAt=(p,g)=>Math.max(0,Math.min(127,g.max-Math.floor((p.y-g.top)/g.pitchHeight)));
export const velocityEdit=(note,pixels)=>({...note,velocity:clamp(Math.round(note.velocity+pixels*127/28),1,127)});
export function transformNote(note,kind,beats,pitches=0){const delta=Math.round(beats/GRID)*GRID;return kind==='resize'?{...note,duration:note.duration+delta}:{...note,beat:note.beat+delta,pitch:note.pitch+Math.round(pitches)};}
export function addNote(beat,pitch,length){beat=Math.round(beat/GRID)*GRID;return beat>=0&&beat+GRID<=length?{beat,pitch,duration:GRID,velocity:100}:null;}
export function keyEdit(note,key,shift){
  if(key==='ArrowLeft'||key==='ArrowRight')return transformNote(note,shift?'resize':'move',key==='ArrowLeft'?-GRID:GRID);
  if(key==='ArrowUp'||key==='ArrowDown')return transformNote(note,'move',0,key==='ArrowUp'?1:-1);
  return null;
}
