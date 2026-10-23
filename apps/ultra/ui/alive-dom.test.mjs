import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountAlive} from './alive.mjs';
import {mountHostedEditor} from './alive-editor.mjs';

// Real view modules with a small DOM adapter; native execution and geometry are separate checks.
class Element{
  constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.listeners={};this.dataset={};this.value='';this.textContent='';this.style={setProperty(key,value){this[key]=value;},removeProperty(key){delete this[key];}};this.clientWidth=1000;this.clientHeight=500;this.className='';
    this.classList={contains:name=>this.className.split(' ').includes(name),add:name=>{if(!this.classList.contains(name))this.className+=' '+name;},remove:name=>{this.className=this.className.split(' ').filter(n=>n!==name).join(' ');},toggle:(name,on)=>{if(on??!this.classList.contains(name))this.classList.add(name);else this.classList.remove(name);}};
  }
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  setAttribute(key,value){this.attrs[key]=String(value);if(key==='class')this.className=String(value);}
  removeAttribute(key){delete this.attrs[key];}
  addEventListener(key,fn){(this.listeners[key]??=[]).push(fn);}
  removeEventListener(){}
  matches(selector){return selector.split(',').some(s=>s.trim().startsWith('.')?this.classList.contains(s.trim().slice(1)):s.trim().startsWith('#')?this.id===s.trim().slice(1):this.tagName===s.trim().toUpperCase());}
  querySelector(selector){return descendants(this).find(e=>e.matches(selector))??null;}
  closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector);}
  getBoundingClientRect(){return{left:0,top:0,width:100,height:30};}
  focus(){this.doc.activeElement=this;}blur(){if(this.doc.activeElement===this)this.doc.activeElement=null;}
  async fire(type,extra={}){const event={target:this,button:0,preventDefault(){},stopPropagation(){},...extra};for(const fn of this.listeners[type]??[])await fn(event);await settle();}
}
const descendants=element=>element.children.flatMap(child=>[child,...descendants(child)]);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function dom(file){
  const ids=new Map(),doc={activeElement:null,addEventListener(){},removeEventListener(){}};doc.createElement=tag=>new Element(tag,doc);doc.createElementNS=(_,tag)=>new Element(tag,doc);doc.createTextNode=text=>{const e=new Element('text',doc);e.textContent=text;return e;};doc.getElementById=id=>ids.get(id);
  for(const[,tag,id]of readFileSync(new URL(file,import.meta.url),'utf8').matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"/g)){const element=new Element(tag,doc);element.id=id;ids.set(id,element);}
  if(ids.has('master-meter'))ids.get('master-meter').append(doc.createElement('i'),doc.createElement('i'));
  const timeouts=[],win={setTimeout:fn=>timeouts.push(fn),addEventListener(){},removeEventListener(){}};
  return{doc,win,ids,find:label=>[...ids.values()].flatMap(e=>[e,...descendants(e)]).find(e=>e.attrs['aria-label']===label)};
}
function state(editor=false){
  const document=JSON.parse(readFileSync(new URL('../../alive/examples/two-instruments.alive',import.meta.url),'utf8')),patch=JSON.parse(readFileSync(new URL('../examples/subtractive.ultra',import.meta.url),'utf8'));
  const devices=document.tracks.map(track=>({...patch.device,parameters:patch.device.parameters.map(binding=>({...binding,base:track.device.parameters[binding.key],integral:false}))}));
  return{generation:1,document,devices,dirty:false,draft:null,state:{position:0,absoluteFrame:1024,generation:1,rejected:0,playing:1,peakLeft:.1,peakRight:.2,tracks:devices.map(device=>({peakLeft:.1,peakRight:.2,activeVoices:3,effective:device.parameters.map(p=>p.key==='cutoff'?700:p.base),owned:device.parameters.map(p=>p.key==='cutoff'?1:0)}))},audio:{config:{host:'default',device:'default',sample_rate:48000},host:'PipeWire',device:'Private output',observed_buffer_frames:256,callbacks:4,stream_errors:0,failed:false,message:'Audio output is running.'},track:editor?0:null,patch:editor?patch:null};
}
function backend(initial){
  const calls=[];let snapshot=initial;
  return{calls,get snapshot(){return snapshot;},async invoke(name,args={}){
    calls.push({name,args:structuredClone(args)});
    if(name==='alive_current')return structuredClone(snapshot);
    if(name==='alive_draft'){snapshot.draft=args.document;return;}
    if(name==='alive_base'){
      const binding=snapshot.devices[args.track].parameters.find(p=>p.key===args.key);binding.base=args.value;snapshot.document.tracks[args.track].device.parameters[args.key]=args.value;
      if(snapshot.patch)snapshot.patch.nodes.find(n=>n.id===binding.node).params[binding.param]=args.value;return;
    }
    if(name==='alive_file')return structuredClone(snapshot);
    if(name==='alive_apply'){if(snapshot.state.playing)throw Error('Stop transport before preparing');snapshot.document=args.document;snapshot.draft=null;snapshot.generation++;return structuredClone(snapshot);}
  }};
}

test('real musical fields retain drafts across polls and rejected Apply',async()=>{
  const page=dom('./alive.html'),native=backend(state()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const pitch=page.find('Note 1 pitch');assert.ok(pitch);pitch.value='62';await pitch.fire('change');await settle();
  assert.equal(native.calls.find(c=>c.name==='alive_draft').args.document.tracks[0].notes[0].pitch,62);
  native.snapshot.document.tracks[0].device.parameters.cutoff=1500;native.snapshot.devices[0].parameters.find(p=>p.key==='cutoff').base=1500;
  await view.refresh();assert.equal(view.model.document().tracks[0].notes[0].pitch,62);assert.equal(view.model.document().tracks[0].device.parameters.cutoff,1500);
  await page.ids.get('apply').fire('click');await settle();assert.equal(view.model.pending(),true);assert.match(page.ids.get('notice').textContent,/Stop transport/);
  native.snapshot.state.playing=0;await page.ids.get('apply').fire('click');await settle();assert.equal(view.model.pending(),false);assert.equal(native.snapshot.document.tracks[0].notes[0].pitch,62);
  view.dispose();
});

test('draft writes precede file actions and actual native metrics remain visible',async()=>{
  const page=dom('./alive.html'),native=backend(state()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const value=page.find('Cutoff point 1 value');value.value='1100';await value.fire('change');await page.ids.get('save').fire('click');await settle();
  assert.ok(native.calls.findIndex(c=>c.name==='alive_draft')<native.calls.findIndex(c=>c.name==='alive_file'));
  assert.equal(page.find('Audio callbacks').textContent,'4');assert.equal(page.find('Audio backend').textContent,'PipeWire');assert.equal(page.find('Absolute frame').textContent,'1024');
  assert.equal(page.find('Cutoff effective ownership').textContent,'Automation: 700 Hz');
  view.dispose();
});

test('a rejected draft sync blocks save and keeps local musical edits',async()=>{
  const page=dom('./alive.html'),native=backend(state()),calls=[];
  const invoke=async(name,args)=>{calls.push(name);if(name==='alive_draft')throw Error('Draft admission failed');return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();
  const pitch=page.find('Note 1 pitch');pitch.value='63';await pitch.fire('change');await page.ids.get('save').fire('click');await settle();
  assert.equal(calls.includes('alive_file'),false);assert.equal(view.model.pending(),true);assert.equal(view.model.document().tracks[0].notes[0].pitch,63);
  view.dispose();
});

test('hosted editor uses real patch objects and shared base command; close only releases UI',async()=>{
  const page=dom('./alive-editor.html'),native=backend(state(true)),closed=[];page.win.__TAURI__={window:{getCurrentWindow:()=>({close:async()=>closed.push('close')})}};
  const view=mountHostedEditor({...page,invoke:native.invoke});await view.ready;
  assert.equal(page.ids.get('objects').children.length,native.snapshot.patch.nodes.length);assert.equal(page.ids.get('cables').children.length,native.snapshot.patch.edges.length);
  const cutoff=page.find('Hosted Cutoff base');cutoff.value='3200';await cutoff.fire('change');await settle();
  assert.deepEqual(native.calls.find(c=>c.name==='alive_base').args,{track:0,key:'cutoff',value:3200,generation:1});
  assert.equal(page.find('Hosted Cutoff effective ownership').textContent,'Automation: 700 Hz');
  const level=page.find('Hosted Level graph base');assert.ok(level);level.value='61';await level.fire('input');await settle();
  assert.equal(native.calls.filter(c=>c.name==='alive_base').at(-1).args.key,'level');
  await page.ids.get('hosted-close').fire('click');await settle();assert.deepEqual(closed,['close']);assert.equal(native.calls.some(c=>/stop|reset|apply|install/.test(c.name)),false);
  view.dispose();
});
