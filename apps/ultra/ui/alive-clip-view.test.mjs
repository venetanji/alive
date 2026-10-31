import test from 'node:test';
import assert from 'node:assert/strict';
import {mountClipView} from './alive-clip-view.mjs';

class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.style={};this.rect={left:0,top:0,width:900,height:156};}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  insertBefore(child,before){child.parentElement=this;this.children.splice(this.children.indexOf(before),0,child);}
  replaceChildren(...children){this.children=[];this.append(...children);}
  setAttribute(key,value){this.attrs[key]=String(value);}
  getAttribute(key){return this.attrs[key]??null;}
  removeAttribute(key){delete this.attrs[key];}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]??[]).filter(f=>f!==fn);}
  getBoundingClientRect(){return this.rect;}
  fire(type,event={}){for(const fn of this.listeners[type]??[])fn({target:this,preventDefault(){},...event});}
}
const descendants=e=>e.children.flatMap(c=>[c,...descendants(c)]);
const midiSource={id:'source-a',kind:'midi'};
async function mount(){
  const doc={createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)},win=new Element('window');
  let observer,disconnected=false;
  win.ResizeObserver=class{constructor(fn){observer=fn;}observe(){}disconnect(){disconnected=true;}};
  const area=new Element('div'),svg=new Element('svg'),audioSvg=new Element('svg'),help=new Element('p'),label=new Element('label');area.append(svg,audioSvg,help,label);
  let navigations=0,lastGeometry;
  const view=mountClipView({doc,win,svg,audioSvg,onNavigate:()=>navigations++,onGeometry:g=>lastGeometry=g});
  const notes=[{id:'a',beat:1,duration:1,pitch:60,velocity:90},{id:'b',beat:6,duration:.5,pitch:65,velocity:110}];
  view.render({notes,length:16,scope:'source-a',kind:'midi',source:midiSource,selectedNote:'a'});
  return {view,svg,audioSvg,area,win,notes,resize:()=>observer(),geometry:()=>lastGeometry,navigations:()=>navigations,disconnected:()=>disconnected,find:label=>descendants(area).find(e=>e.attrs['aria-label']===label)};
}
test('keyboard, musical ruler and editable velocity lane share actual pixel geometry',async()=>{
  const p=await mount(),g=p.geometry();
  assert.equal(g.width,900);assert.equal(g.height,156);assert.equal(g.pitchHeight,12);
  assert.equal(p.svg.attrs.viewBox,'0 0 900 156');
  assert.notEqual(p.svg.attrs.preserveAspectRatio,'none');
  assert.ok(descendants(p.svg).some(e=>e.attrs['data-key']==='60'));
  assert.ok(descendants(p.svg).some(e=>e.attrs['data-ruler-beat']==='0'&&e.textContent==='1'));
  const lane=p.view.velocityLane,stem=descendants(lane).find(e=>e.attrs['data-note']==='0'&&e.attrs['data-part']==='velocity');
  assert.ok(stem);assert.equal(lane.attrs['aria-label'],'Note velocity lane');
  assert.equal(Number(stem.attrs.x),g.pad+g.pixelsPerBeat-3);
  p.view.dispose();
});
test('time and pitch controls and wheel navigation only change the viewport',async()=>{
  const p=await mount(),before=structuredClone(p.notes),initial=p.geometry();
  p.find('Zoom in time').fire('click');const time=p.geometry();
  assert.equal(time.beatSpan,8);assert.equal(time.pitchHeight,initial.pitchHeight);
  p.find('Zoom in pitch').fire('click');const pitch=p.geometry();
  assert.ok(pitch.pitchHeight>time.pitchHeight);assert.equal(pitch.beatSpan,time.beatSpan);
  p.find('Scroll time later').fire('click');assert.ok(p.geometry().beatStart>time.beatStart);
  p.svg.fire('wheel',{deltaY:-120,deltaX:0,ctrlKey:true,clientX:400,clientY:80});
  assert.ok(p.geometry().beatSpan<pitch.beatSpan);
  p.svg.fire('wheel',{deltaY:120,deltaX:0,clientX:400,clientY:80});
  assert.deepEqual(p.notes,before);assert.ok(p.navigations()>=4);p.view.dispose();
});
test('resize recomputes geometry and bodies without stretching rows or changing source scope',async()=>{
  const p=await mount();p.find('Zoom in time').fire('click');const before=p.geometry();
  p.svg.rect={left:30,top:40,width:512,height:192};p.resize();const after=p.geometry();
  assert.equal(after.width,512);assert.equal(after.height,192);
  assert.equal(after.pitchHeight,before.pitchHeight);assert.equal(after.beatSpan,before.beatSpan);
  assert.equal(p.svg.attrs.viewBox,'0 0 512 192');
  const body=descendants(p.svg).find(e=>e.attrs['data-note']==='0'&&e.attrs['data-part']==='body');
  assert.equal(Number(body.attrs.x),after.pad+(p.notes[0].beat-after.beatStart)*after.pixelsPerBeat+1);
  p.view.dispose();assert.equal(p.disconnected(),true);
});
test('fit frames all notes, preserves their identities, and a source change resets navigation',async()=>{
  const p=await mount();p.find('Fit notes').fire('click');const fit=p.geometry();
  assert.ok(fit.beatStart<=1&&fit.beatStart+fit.beatSpan>=6.5);assert.ok(fit.min<=60&&fit.max>=65);
  const selected=descendants(p.svg).find(e=>e.attrs['data-note']==='0'&&e.attrs['data-part']==='body');
  assert.equal(selected.attrs['aria-selected'],'true');
  p.view.render({notes:p.notes,length:32,scope:'source-b',kind:'midi',source:{...midiSource,id:'source-b'},selectedNote:'b'});
  assert.equal(p.geometry().beatStart,0);assert.equal(p.geometry().beatSpan,32);
  p.view.dispose();
});
test('clip editor renders separate Start, End and loop handles above a persistent time selection',async()=>{
  const p=await mount(),region={start:0,end:16,loopStart:2,loopEnd:8,loopEnabled:true};
  p.view.render({notes:p.notes,length:16,scope:'source-a',kind:'midi',source:midiSource,region,timeSelection:{start:2,end:8}});
  for(const kind of ['start','end','loopMove','loopLeft','loopRight'])assert.ok(descendants(p.svg).some(e=>e.attrs['data-region']===kind),kind);
  assert.ok(p.find('Clip Start'));assert.ok(p.find('Clip End'));assert.ok(p.find('Loop Position'));assert.ok(p.find('Loop Length'));
  assert.ok(descendants(p.svg).some(e=>e.attrs.class==='clip-time-selection'));
  assert.ok(p.geometry().top>=48);p.view.dispose();
});
test('audio editor draws actual waveform peaks and keeps the shared beat and region controls',async()=>{
  const p=await mount();
  p.view.render({notes:[],length:8,scope:'audio',kind:'audio',source:{sourceTempo:120,file:{frames:'192000',sampleRate:48000,channels:2}},waveformPeaks:[[-.5,.75],[-.25,.5]],region:{start:0,end:8,loopStart:0,loopEnd:8,loopEnabled:true}});
  const waveform=descendants(p.audioSvg).find(e=>e.attrs.class==='audio-waveform');assert.ok(waveform);assert.ok(waveform.attrs.d.includes('L'));
  assert.equal(p.view.velocityLane.hidden,true);assert.ok(p.find('Loop Selection'));p.view.dispose();
});
test('empty selection survives resize without geometry and a real empty MIDI clip restores the editor',async()=>{
  const p=await mount();
  assert.equal(p.view.render({notes:[],length:4,kind:'midi',source:null,scope:'empty'}),null);
  p.svg.rect.width=512;p.resize();p.svg.fire('wheel',{deltaY:120});
  assert.equal(p.geometry(),null);assert.equal(p.svg.hidden,true);assert.equal(p.svg.children.length,0);assert.equal(p.view.velocityLane.hidden,true);
  p.view.render({notes:[],length:4,kind:'midi',source:midiSource,scope:'new-clip'});
  assert.equal(p.svg.hidden,false);assert.equal(p.view.velocityLane.hidden,false);assert.equal(p.geometry().width,512);
  assert.ok(descendants(p.svg).some(e=>e.attrs['data-key']));p.view.dispose();
});
