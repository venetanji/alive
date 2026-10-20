import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mountAudioSettings} from './audio-settings.mjs';

// Small DOM boundary adapter; tests execute the actual settings module.
class Element {
  constructor(){this.children=[];this.listeners={};this.value='';this.textContent='';this.disabled=false;this.classList={toggle(){}};}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;this.value=children[0]?.value??'';}
  addEventListener(type,fn){this.listeners[type]=fn;}
  async fire(type){await this.listeners[type]?.();}
}
function mount(catalog){
  const elements=new Map(),calls=[];
  const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const controller={getState:()=>({status:{running:false},busy:false}),poll:async()=>{},startAudio:async()=>{},stopAudio:async()=>{}};
  const settings=mountAudioSettings({document:{querySelector:s=>get(s.slice(1)),createElement:()=>new Element()},controller,invoke:async(name,args)=>{calls.push({name,args});return name==='audio_devices'?catalog(args):undefined;}});
  return {...settings,get,calls};
}
const healthy=()=>({config:{host:'PipeWire',device:'speakers',buffer_frames:128},hosts:['PipeWire','ALSA'],effective_host:'PipeWire',devices:[{id:'default',name:'Default',compatible:true},{id:'speakers',name:'Speakers',compatible:true},{id:'headphones',name:'Headphones',compatible:true}],notice:''});

test('Refresh preserves an explicit unsaved output and buffer selection',async()=>{
  const p=mount(healthy);await p.open();p.get('audio-device').value='headphones';p.get('audio-buffer').value='256';
  await p.get('audio-refresh').fire('click');
  assert.equal(p.get('audio-device').value,'headphones');assert.equal(p.get('audio-buffer').value,'256');
  await p.get('audio-save').fire('click');assert.equal(p.calls.at(-1).args.config.device,'headphones');
});
test('Refresh retains a disconnected selection and blocks save/start until another output is chosen',async()=>{
  let catalog=healthy();const p=mount(()=>catalog);await p.open();catalog={...catalog,devices:[catalog.devices[0]]};
  await p.get('audio-refresh').fire('click');
  assert.equal(p.get('audio-device').value,'speakers');assert.equal(p.get('audio-save').disabled,true);assert.equal(p.get('audio-start-configured').disabled,true);
  await p.get('audio-save').fire('click');assert.equal(p.calls.filter(c=>c.name==='audio_configure').length,0);
  p.get('audio-device').value='default';await p.get('audio-device').fire('change');assert.equal(p.get('audio-save').disabled,false);
});
test('Unavailable saved host retains its identity, lists recovery alternatives and exposes the diagnostic',async()=>{
  const failed={...healthy(),config:{host:'MissingHost',device:'speakers',buffer_frames:128},effective_host:'',devices:[],notice:'Audio host is unavailable. Choose another host.'};
  const p=mount(args=>args.host==='ALSA'?{...healthy(),effective_host:'ALSA'}:failed);await p.open();
  assert.equal(p.get('audio-host').value,'MissingHost');assert.deepEqual(p.get('audio-host').children.map(o=>o.value),['default','PipeWire','ALSA','MissingHost']);
  assert.match(p.get('audio-settings-notice').textContent,/host is unavailable/);assert.equal(p.get('audio-save').disabled,true);
  p.get('audio-host').value='ALSA';await p.get('audio-host').fire('change');assert.equal(p.get('audio-host').value,'ALSA');assert.equal(p.get('audio-device').value,'default');assert.equal(p.get('audio-save').disabled,false);
});
