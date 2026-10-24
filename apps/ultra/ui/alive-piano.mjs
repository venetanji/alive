// All gesture math uses the pointer-down viewport and original note.
export const GRID=.25;
export function geometry(notes,length){
  const min=Math.max(0,Math.min(48,...notes.map(n=>n.pitch))-1),max=Math.min(127,Math.max(84,...notes.map(n=>n.pitch))+1);
  return {width:640,height:218,pad:32,top:21,min,max,length,pitchHeight:191/(max-min+1)};
}
export function point(event,rect,g){return {x:(event.clientX-rect.left)*g.width/rect.width,y:(event.clientY-rect.top)*g.height/rect.height};}
export const beatAt=(p,g)=>(p.x-g.pad)/(g.width-g.pad)*g.length;
export const pitchAt=(p,g)=>Math.max(0,Math.min(127,g.max-Math.floor((p.y-g.top)/g.pitchHeight)));
export function transformNote(note,kind,beats,pitches=0){const delta=Math.round(beats/GRID)*GRID;return kind==='resize'?{...note,duration:note.duration+delta}:{...note,beat:note.beat+delta,pitch:note.pitch+Math.round(pitches)};}
export function addNote(beat,pitch,length){beat=Math.round(beat/GRID)*GRID;return beat>=0&&beat+GRID<=length?{beat,pitch,duration:GRID,velocity:100}:null;}
export function keyEdit(note,key,shift){
  if(key==='ArrowLeft'||key==='ArrowRight')return transformNote(note,shift?'resize':'move',key==='ArrowLeft'?-GRID:GRID);
  if(key==='ArrowUp'||key==='ArrowDown')return transformNote(note,'move',0,key==='ArrowUp'?1:-1);
  return null;
}
