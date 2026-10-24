import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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
  getAttribute(key){return this.attrs[key]??null;}
  setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}
  removeAttribute(key){delete this.attrs[key];}
  addEventListener(key,fn){(this.listeners[key]??=[]).push(fn);}
  removeEventListener(){}
  matches(selector){return selector.split(',').some(s=>s.trim().startsWith('[')?this.attrs[s.trim().slice(1,-1)]!==undefined:s.trim().startsWith('.')?this.classList.contains(s.trim().slice(1)):s.trim().startsWith('#')?this.id===s.trim().slice(1):this.tagName===s.trim().toUpperCase());}
  querySelector(selector){return descendants(this).find(e=>e.matches(selector))??null;}
  closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector);}
  getBoundingClientRect(){return{left:0,top:0,width:100,height:30};}
  focus(){this.doc.activeElement=this;}blur(){if(this.doc.activeElement===this)this.doc.activeElement=null;}
  async fire(type,extra={}){const event={target:this,button:0,preventDefault(){},stopPropagation(){},...extra};for(const fn of this.listeners[type]??[])await fn(event);await settle();}
}
const descendants=element=>element.children.flatMap(child=>[child,...descendants(child)]);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function clipState(){const s=state();s.mode='clipsV3';s.preparationRevision='1';s.snapshotSequence='1';s.document.format='alive-session-v3';s.preparedClips=[];
  for(const t of s.document.tracks){const clip={id:`clip-${t.id}`,name:'Clip 1',lengthBeats:s.document.lengthBeats,notes:t.notes.map((n,i)=>({...n,id:`note-${t.id}-${i}`})),automation:t.automation};t.slots=[clip,null,null,null];t.defaultClipId=clip.id;delete t.notes;delete t.automation;s.preparedClips.push({trackId:t.id,clipId:clip.id,name:clip.name,slot:0,lengthFrames:'411429'});}
  s.runtime={tracks:s.document.tracks.map(t=>({trackId:t.id,activeClipId:t.slots[0].id,phase:'0',epoch:'1',pendingAction:null,pendingClipId:null,pendingSerial:null,pendingFrame:null})),requests:[],requestedStopEpoch:'0',appliedStopEpoch:'0'};return s;}

test('four slots separate selection, draft-only launch and prepared runtime identity',async()=>{
  const initial=clipState(),page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.ok(page.find('Select Pulse slot 4'));await page.find('Select Pulse slot 2').fire('click');
  assert.equal(native.calls.filter(c=>c.name==='alive_clip_action'||c.name==='alive_edit').length,0);
  assert.ok(page.find('Create clip'));assert.equal(page.ids.get('add-note').disabled,true);
  await page.find('Select Pulse slot 1').fire('click');await page.find('Launch Pulse Clip 1').fire('click');
  const action=native.calls.find(c=>c.name==='alive_clip_action');assert.deepEqual(action.args.action,{kind:'launch',trackId:initial.document.tracks[0].id,clipId:initial.document.tracks[0].slots[0].id});assert.equal(action.args.preparationRevision,'1');view.dispose();
});

test('queued v3 note values keep originating clip and note IDs after selection changes',async()=>{
  const initial=clipState(),first=initial.document.tracks[0].slots[0],second=structuredClone(first);second.id='second';second.name='Second';second.notes.forEach(n=>n.id+='-second');initial.document.tracks[0].slots[1]=second;
  const page=dom('./alive.html'),native=backend(initial),boundary=delayedBoundary(native,'alive_base',()=>{}),view=mountAlive({...page,invoke:boundary.invoke});await settle();
  const cutoff=page.find('Cutoff base');cutoff.value='1800';await cutoff.fire('change');
  const pitch=page.find('Note 1 pitch');pitch.value='63';await pitch.fire('change');
  await page.find('Select Pulse slot 2').fire('click');const velocity=page.find('Note 1 velocity');velocity.value='87';await velocity.fire('change');
  boundary.release();await settle();await settle();
  const doc=view.model.document();assert.equal(doc.tracks[0].slots[0].notes[0].pitch,63);assert.equal(doc.tracks[0].slots[1].notes[0].pitch,second.notes[0].pitch);assert.equal(doc.tracks[0].slots[1].notes[0].velocity,87);
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_edit').map(c=>c.args.draftRevision),[0,1]);view.dispose();
});

test('late focused clip creation accepts score without stealing a newer track selection',async()=>{
  const initial=clipState(),page=dom('./alive.html'),native=backend(initial);let release;
  const invoke=async(name,args)=>{if(name!=='alive_clip_edit')return native.invoke(name,args);await new Promise(resolve=>release=resolve);const snapshot=structuredClone(initial);snapshot.draft=structuredClone(snapshot.document);snapshot.draftRevision=1;snapshot.snapshotSequence='2';const t=snapshot.draft.tracks.find(t=>t.id===args.operation.trackId);t.slots[args.operation.slot]={id:'created',name:'Clip 2',lengthBeats:8,notes:[],automation:[]};return{snapshot,affected:{trackId:t.id,slot:1,clipId:'created',noteId:null}};};
  const view=mountAlive({...page,invoke});await settle();await page.find('Select Pulse slot 2').fire('click');await page.find('Create clip').fire('click');await page.find('Select Harmony slot 1').fire('click');release();await settle();
  assert.equal(view.model.document().tracks[0].slots[1].id,'created');assert.match(page.ids.get('clip-title').textContent,/Harmony/);assert.equal(page.find('Select Harmony slot 1').attrs['aria-pressed'],'true');view.dispose();
});
function dom(file){
  const ids=new Map(),doc={activeElement:null,addEventListener(){},removeEventListener(){}};doc.createElement=tag=>new Element(tag,doc);doc.createElementNS=(_,tag)=>new Element(tag,doc);doc.createTextNode=text=>{const e=new Element('text',doc);e.textContent=text;return e;};doc.getElementById=id=>ids.get(id);
  for(const[markup,tag,id]of readFileSync(new URL(file,import.meta.url),'utf8').matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const element=new Element(tag,doc);element.id=id;element.hidden=/\bhidden\b/.test(markup);ids.set(id,element);}
  if(ids.has('master-meter'))ids.get('master-meter').append(doc.createElement('i'),doc.createElement('i'));
  const timeouts=[],win={setTimeout:fn=>timeouts.push(fn),addEventListener(){},removeEventListener(){}};
  return{doc,win,ids,find:label=>[...ids.values()].flatMap(e=>[e,...descendants(e)]).find(e=>e.attrs['aria-label']===label)};
}
function state(editor=false){
  const document=JSON.parse(readFileSync(new URL('../../alive/examples/two-instruments.alive',import.meta.url),'utf8')),patch=JSON.parse(readFileSync(new URL('../examples/subtractive.ultra',import.meta.url),'utf8'));
  document.format='alive-session-v2';
  for(const track of document.tracks){track.effects=[];track.device.instanceId='legacy-'+createHash('sha256').update(track.id).digest('hex').slice(0,32);track.device.sourceSha256=createHash('sha256').update(JSON.stringify(patch)).digest('hex');track.device.bypassed=false;for(const lane of track.automation)lane.instanceId=track.device.instanceId;}
  const devices=document.tracks.map(track=>({...patch.device,parameters:patch.device.parameters.map(binding=>({...binding,base:track.device.parameters[binding.key],integral:false}))}));
  const deviceInstances=Object.fromEntries(document.tracks.map((t,index)=>[t.device.instanceId,{index,track:index,manifest:devices[index]}]));
  const result={generation:1,draftRevision:0,history:{canUndo:false,canRedo:false},document,devices,deviceInstances,instanceId:editor?document.tracks[0].device.instanceId:null,deviceIndex:editor?0:null,dirty:false,draft:null,state:{position:0,absoluteFrame:1024,generation:1,rejected:0,playing:1,peakLeft:.1,peakRight:.2,tracks:devices.map(device=>({peakLeft:.1,peakRight:.2,activeVoices:3,effective:device.parameters.map(p=>p.key==='cutoff'?700:p.base),owned:device.parameters.map(p=>p.key==='cutoff'?1:0)}))},audio:{config:{host:'default',device:'default',sample_rate:48000},host:'PipeWire',device:'Private output',observed_buffer_frames:256,callbacks:4,stream_errors:0,failed:false,message:'Audio output is running.'},track:editor?0:null,patch:editor?patch:null};
  result.state.devices=result.state.tracks;return result;
}
function backend(initial){
  const calls=[];let snapshot=initial;
  return{calls,get snapshot(){return snapshot;},async invoke(name,args={}){
    calls.push({name,args:structuredClone(args)});
    if(name==='alive_current')return structuredClone(snapshot);
    if(name==='alive_edit'){assert.equal(args.draftRevision,snapshot.draftRevision);snapshot.draft=args.document;snapshot.draftRevision++;snapshot.history={canUndo:true,canRedo:false,undoLabel:args.label};return structuredClone(snapshot);}
    if(name==='alive_discard'){snapshot.draft=null;snapshot.draftRevision++;snapshot.history={canUndo:false,canRedo:false};return structuredClone(snapshot);}
    if(name==='alive_base'){
      const owner=snapshot.deviceInstances[args.instanceId],binding=owner.manifest.parameters.find(p=>p.key===args.key),track=snapshot.document.tracks[owner.track];binding.base=args.value;[track.device,...track.effects].find(d=>d.instanceId===args.instanceId).parameters[args.key]=args.value;
      if(snapshot.patch)snapshot.patch.nodes.find(n=>n.id===binding.node).params[binding.param]=args.value;return;
    }
    if(name==='alive_device')return structuredClone(snapshot);
    if(name==='alive_bypass'){const owner=snapshot.deviceInstances[args.instanceId],track=snapshot.document.tracks[owner.track];[track.device,...track.effects].find(d=>d.instanceId===args.instanceId).bypassed=args.bypassed;return;}
    if(name==='alive_file')return structuredClone(snapshot);
    if(name==='alive_audio_devices')return {config:snapshot.audio.config,hosts:['PipeWire'],effective_host:'PipeWire',devices:[{id:'default',name:'Default',compatible:true},{id:'speakers',name:'Speakers',compatible:true}],notice:''};
    if(name==='alive_audio_configure'){snapshot.audio.config=args.config;return;}
    if(name==='alive_audio'){snapshot.audio.running=args.action==='start';if(args.action==='stop')snapshot.state.playing=0;return;}
    if(name==='alive_apply'){if(snapshot.state.playing)throw Error('Stop transport before preparing');snapshot.document=snapshot.draft;snapshot.draft=null;snapshot.generation++;return structuredClone(snapshot);}
  }};
}

function delayedBoundary(native,name,change,outcome='snapshot'){
  let release;const gate=new Promise(resolve=>{release=resolve;});
  return{release,async invoke(command,args){
    const result=await native.invoke(command,args);if(command!==name)return result;
    await gate;change(native.snapshot);
    if(outcome==='error')throw Error('Outer file action failed');
    return outcome==='none'?null:structuredClone(native.snapshot);
  }};
}

test('queued Add note cannot cross successful removal into a reused track index',async()=>{
  const initial=state();initial.state.playing=0;
  const page=dom('./alive.html'),native=backend(initial),boundary=delayedBoundary(native,'alive_device',snapshot=>{
    snapshot.document.tracks.shift();snapshot.devices.shift();snapshot.state.tracks.shift();snapshot.state.devices=snapshot.state.tracks;
    snapshot.deviceInstances=Object.fromEntries(Object.entries(snapshot.deviceInstances).filter(([,owner])=>owner.track!==0).map(([id,owner])=>[id,{...owner,track:0,index:0}]));
    snapshot.generation++;snapshot.draftRevision++;
  }),view=mountAlive({...page,invoke:boundary.invoke});await settle();
  const survivor=structuredClone(initial.document.tracks[1]);
  await page.find('Remove Pulse track').fire('click');await page.ids.get('add-note').fire('click');boundary.release();await settle();
  assert.equal(native.snapshot.document.tracks[0].id,survivor.id);
  assert.deepEqual(view.model.document().tracks[0].notes,survivor.notes);
  assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,0);
  assert.match(page.ids.get('notice').textContent,/score.*changed/i);view.dispose();
});

for(const[action,field,key,value]of [['new','tempo','tempo','137'],['open','length','lengthBeats','16'],['open','loop','loopEnabled',false]]){
  test(`queued ${key} cannot cross successful ${action}`,async()=>{
    const page=dom('./alive.html'),native=backend(state()),boundary=delayedBoundary(native,'alive_file',snapshot=>{
      snapshot.document.title='Replacement session';snapshot.generation++;snapshot.draftRevision++;
    }),view=mountAlive({...page,invoke:boundary.invoke});await settle();
    const original=native.snapshot.document[key];
    await page.ids.get(action).fire('click');const input=page.ids.get(field);if(field==='loop')input.checked=value;else input.value=value;await input.fire('change');
    boundary.release();await settle();
    assert.equal(view.model.document().title,'Replacement session');assert.equal(view.model.document()[key],original);
    assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,0);view.dispose();
  });
}

for(const[resolution,outcome]of [['apply','none'],['apply','error'],['discard','none'],['discard','error'],['relocate','snapshot']]){
  test(`queued global edits cancel after ${resolution} with file outcome ${outcome}`,async()=>{
    const page=dom('./alive.html'),native=backend(state()),boundary=delayedBoundary(native,'alive_file',snapshot=>{
      if(resolution==='apply'){snapshot.document=snapshot.draft;snapshot.draft=null;snapshot.generation++;}
      if(resolution==='discard')snapshot.draft=null;
      if(resolution==='relocate'){snapshot.document.tracks[0].device.path='../relocated/subtractive.ultra';snapshot.history={canUndo:false,canRedo:true,redoLabel:'Move note'};}
      else snapshot.history={canUndo:false,canRedo:false};
      snapshot.draftRevision++;
    },outcome),view=mountAlive({...page,invoke:boundary.invoke});await settle();
    if(resolution!=='relocate'){const pitch=page.find('Note 1 pitch');pitch.value='63';await pitch.fire('change');}
    const edits=native.calls.filter(c=>c.name==='alive_edit').length,originalTempo=native.snapshot.document.tempo;
    await page.ids.get('save-as').fire('click');const tempo=page.ids.get('tempo');tempo.value='137';await tempo.fire('change');boundary.release();await settle();
    assert.equal(view.model.document().tempo,originalTempo);assert.equal(view.model.pending(),false);
    assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,edits);
    assert.equal(view.model.snapshot().history.canRedo,resolution==='relocate');view.dispose();
  });
}

for(const outcome of ['none','error']){
  test(`file ${outcome} without an accepted boundary preserves queued same-scope edits`,async()=>{
    const page=dom('./alive.html'),native=backend(state()),boundary=delayedBoundary(native,'alive_file',()=>{},outcome),view=mountAlive({...page,invoke:boundary.invoke});await settle();
    await page.ids.get('open').fire('click');const tempo=page.ids.get('tempo');tempo.value='137';await tempo.fire('change');
    const pitch=page.find('Note 1 pitch');pitch.value='64';await pitch.fire('change');boundary.release();await settle();
    assert.equal(view.model.document().tempo,137);assert.equal(view.model.document().tracks[0].notes[0].pitch,64);
    assert.deepEqual(native.calls.filter(c=>c.name==='alive_edit').map(c=>c.args.draftRevision),[0,1]);view.dispose();
  });
}

for(const action of ['apply','discard','undo']){
  test(`queued global edits cancel after accepted ${action}`,async()=>{
    const initial=state();initial.state.playing=0;
    const page=dom('./alive.html'),native=backend(initial),boundary=delayedBoundary(native,action==='undo'?'alive_history':`alive_${action}`,snapshot=>{
      snapshot.draft=null;snapshot.draftRevision++;snapshot.history={canUndo:false,canRedo:action==='undo'};
    }),view=mountAlive({...page,invoke:boundary.invoke});await settle();
    const pitch=page.find('Note 1 pitch');pitch.value='63';await pitch.fire('change');
    await page.ids.get(action).fire('click');const tempo=page.ids.get('tempo');tempo.value='137';await tempo.fire('change');boundary.release();await settle();
    assert.equal(view.model.document().tempo,112);assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,1);view.dispose();
  });
}

test('real musical fields retain drafts across polls and rejected Apply',async()=>{
  const page=dom('./alive.html'),native=backend(state()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const pitch=page.find('Note 1 pitch');assert.ok(pitch);pitch.value='62';await pitch.fire('change');await settle();
  assert.equal(native.calls.find(c=>c.name==='alive_edit').args.document.tracks[0].notes[0].pitch,62);
  native.snapshot.document.tracks[0].device.parameters.cutoff=1500;native.snapshot.devices[0].parameters.find(p=>p.key==='cutoff').base=1500;
  await view.refresh();assert.equal(view.model.document().tracks[0].notes[0].pitch,62);assert.equal(view.model.document().tracks[0].device.parameters.cutoff,1500);
  await page.ids.get('apply').fire('click');await settle();assert.equal(view.model.pending(),true);assert.match(page.ids.get('notice').textContent,/Stop transport/);
  native.snapshot.state.playing=0;await page.ids.get('apply').fire('click');await settle();assert.equal(view.model.pending(),false);assert.equal(native.snapshot.document.tracks[0].notes[0].pitch,62);
  view.dispose();
});

test('Alive audio settings preserve drafts and route configuration through the session owner',async()=>{
  const page=dom('./alive.html'),initial=state();initial.audio.running=true;initial.audio.config.buffer_frames=null;
  const native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  const pitch=page.find('Note 1 pitch');pitch.value='65';await pitch.fire('change');
  await page.ids.get('show-audio').fire('click');await settle();
  assert.equal(page.ids.get('alive-audio-settings').hidden,false);
  assert.equal(page.ids.get('audio-save').disabled,true);
  await page.ids.get('audio-stop-configured').fire('click');await settle();
  assert.equal(native.snapshot.state.playing,0);assert.equal(view.model.document().tracks[0].notes[0].pitch,65);
  page.ids.get('audio-device').value='speakers';await page.ids.get('audio-device').fire('change');page.ids.get('audio-buffer').value='512';
  await page.ids.get('audio-save').fire('click');await settle();
  assert.deepEqual(native.calls.find(c=>c.name==='alive_audio_configure').args,{generation:1,config:{host:'default',device:'speakers',sample_rate:48000,buffer_frames:512}});
  assert.equal(view.model.pending(),true);assert.equal(native.snapshot.audio.running,false);
  await page.ids.get('audio-start-configured').fire('click');await settle();
  assert.equal(native.snapshot.audio.running,true);assert.equal(native.snapshot.state.playing,0);
  await page.ids.get('audio-settings-close').fire('click');assert.equal(page.ids.get('alive-audio-settings').hidden,true);
  assert.equal(page.doc.activeElement,page.ids.get('show-audio'));view.dispose();
});

test('draft writes precede file actions and actual native metrics remain visible',async()=>{
  const page=dom('./alive.html'),native=backend(state()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const value=page.find('Cutoff point 1 value');value.value='1100';await value.fire('change');await page.ids.get('save').fire('click');await settle();
  assert.ok(native.calls.findIndex(c=>c.name==='alive_edit')<native.calls.findIndex(c=>c.name==='alive_file'));
  assert.equal(page.find('Audio callbacks').textContent,'4');assert.equal(page.find('Audio backend').textContent,'PipeWire');assert.equal(page.find('Absolute frame').textContent,'1024');
  assert.equal(page.find('Cutoff effective ownership').textContent,'Automation: 700 Hz');
  view.dispose();
});

test('automation base segments follow live controls without rebuilding unchanged poll frames',async()=>{
  const page=dom('./alive.html'),native=backend(state());
  native.snapshot.document.tracks[0].automation.find(l=>l.key==='cutoff').points[0].beat=1;
  native.snapshot.document.tracks[0].automation.find(l=>l.key==='level').points=[];
  const view=mountAlive({...page,invoke:native.invoke});await settle();
  const curve=key=>page.ids.get('lanes').children.find(e=>e.dataset.lane===key).querySelector('svg').children[0];
  const cutoffBefore=curve('cutoff'),levelBefore=curve('level');
  await view.refresh();assert.equal(curve('cutoff'),cutoffBefore);assert.equal(curve('level'),levelBefore);
  const cutoff=page.find('Cutoff base');cutoff.value='3500';await cutoff.fire('change');await settle();
  const binding=native.snapshot.devices[0].parameters.find(p=>p.key==='cutoff'),baseY=36-(3500-binding.min)/(binding.max-binding.min)*31;
  assert.equal(curve('cutoff').attrs.d.split(' H ')[0],`M 0 ${baseY}`);
  assert.notEqual(curve('cutoff'),cutoffBefore);assert.equal(curve('cutoff').attrs.d.slice(curve('cutoff').attrs.d.indexOf(' H ')),cutoffBefore.attrs.d.slice(cutoffBefore.attrs.d.indexOf(' H ')));
  const level=page.find('Level base');level.value='80';await level.fire('change');await settle();
  assert.equal(curve('level').attrs.d,`M 0 ${36-80/127*31} H 600`);
  const cutoffAfter=curve('cutoff'),levelAfter=curve('level');await view.refresh();
  assert.equal(curve('cutoff'),cutoffAfter);assert.equal(curve('level'),levelAfter);
  view.dispose();
});

test('a rejected edit restores the authoritative score before a later save',async()=>{
  const page=dom('./alive.html'),native=backend(state()),calls=[];
  const invoke=async(name,args)=>{calls.push(name);if(name==='alive_edit')throw Error('Draft admission failed');return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();
  const pitch=page.find('Note 1 pitch');pitch.value='63';await pitch.fire('change');assert.match(page.ids.get('notice').textContent,/Draft admission failed/);await page.ids.get('save').fire('click');await settle();
  assert.equal(calls.includes('alive_file'),true);assert.equal(view.model.pending(),false);assert.equal(view.model.document().tracks[0].notes[0].pitch,60);
  view.dispose();
});

test('hosted editor uses real patch objects and shared base command; close only releases UI',async()=>{
  const page=dom('./alive-editor.html'),native=backend(state(true)),closed=[];page.win.__TAURI__={window:{getCurrentWindow:()=>({close:async()=>closed.push('close')})}};
  const view=mountHostedEditor({...page,invoke:native.invoke});await view.ready;
  assert.equal(page.ids.get('objects').children.length,native.snapshot.patch.nodes.length);assert.equal(page.ids.get('cables').children.length,native.snapshot.patch.edges.length);
  const cutoff=page.find('Hosted Cutoff base');cutoff.value='3200';await cutoff.fire('change');await settle();
  assert.deepEqual(native.calls.find(c=>c.name==='alive_base').args,{instanceId:native.snapshot.document.tracks[0].device.instanceId,key:'cutoff',value:3200,generation:1});
  assert.equal(page.find('Hosted Cutoff effective ownership').textContent,'Automation: 700 Hz');
  const level=page.find('Hosted Level graph base');assert.ok(level);level.value='61';await level.fire('input');await settle();
  assert.equal(native.calls.filter(c=>c.name==='alive_base').at(-1).args.key,'level');
  await page.ids.get('hosted-close').fire('click');await settle();assert.deepEqual(closed,['close']);assert.equal(native.calls.some(c=>/stop|reset|apply|install/.test(c.name)),false);
  view.dispose();
});

test('hosted zoom selection follows fitted and manually selected graph scale',async()=>{
  const page=dom('./alive-editor.html'),native=backend(state(true)),view=mountHostedEditor({...page,invoke:native.invoke});await view.ready;
  const zoom=page.ids.get('hosted-zoom'),canvas=page.ids.get('canvas'),actualScale=()=>Number(canvas.style.transform.match(/scale\(([^)]+)\)/)[1]);
  assert.equal(Number(zoom.value),actualScale());
  zoom.value='0.75';await zoom.fire('change');assert.equal(actualScale(),.75);
  await page.ids.get('hosted-fit').fire('click');assert.equal(Number(zoom.value),actualScale());
  assert.match(page.ids.get('hosted-summary').textContent,new RegExp(`${Math.round(actualScale()*100)}%$`));
  view.dispose();
});

test('an effect editor owns its own manifest patch state and instance command',async()=>{
  const initial=state(true),patch=JSON.parse(readFileSync(new URL('../examples/utility.ultra',import.meta.url),'utf8'));
  const instanceId='effect-editor-instance',manifest={...patch.device,parameters:patch.device.parameters.map(p=>({...p,base:1,integral:false}))};
  initial.document.tracks[0].effects.push({instanceId,path:'utility.ultra',id:manifest.id,version:2,sourceSha256:'0'.repeat(64),parameters:{gain:1},bypassed:false});
  initial.deviceInstances[instanceId]={index:2,track:0,manifest};initial.state.devices.push({base:[1],effective:[.5],owned:[1]});
  initial.instanceId=instanceId;initial.deviceIndex=2;initial.patch=patch;
  const page=dom('./alive-editor.html'),calls=[];
  const invoke=async(name,args)=>{calls.push({name,args});if(name==='alive_current')return structuredClone(initial);};
  const view=mountHostedEditor({...page,invoke});await view.ready;
  assert.equal(page.ids.get('hosted-source').textContent,'utility.ultra');
  assert.match(page.ids.get('hosted-title').textContent,/Utility/);
  assert.equal(page.find('Hosted Cutoff base'),undefined);
  assert.match(page.find('Hosted Gain effective ownership').textContent,/Automation: 0.5/);
  const input=page.find('Hosted Gain base');assert.ok(input);input.value='.7';await input.fire('change');await settle();
  assert.deepEqual(calls.find(c=>c.name==='alive_base').args,{instanceId,key:'gain',value:.7,generation:1});
  view.dispose();
});

function withChain(){
  const initial=state();
  for(const [index,file] of ['utility','stereo-lowpass'].entries()){
    const patch=JSON.parse(readFileSync(new URL(`../examples/${file}.ultra`,import.meta.url),'utf8'));
    const instanceId=`effect-${index}`,manifest={...patch.device,parameters:patch.device.parameters.map(p=>({...p,base:p.key==='gain'?1:p.key==='resonance'?.7:2400,integral:false}))};
    initial.document.tracks[0].effects.push({instanceId,id:manifest.id,path:`${file}.ultra`,version:2,sourceSha256:'0'.repeat(64),parameters:Object.fromEntries(manifest.parameters.map(p=>[p.key,p.base])),bypassed:false});
    initial.deviceInstances[instanceId]={index:index+2,track:0,manifest};initial.state.devices.push({effective:manifest.parameters.map(()=>.5),owned:manifest.parameters.map(()=>1)});
  }
  return initial;
}

test('chain selection uses stable instance metadata without launching and live bypass retains transport',async()=>{
  const initial=withChain(),page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.ok(page.find('Select Pulse Stereo Utility effect 1'));
  assert.equal(page.find('Bypass Pulse Subtractive instrument').disabled,true);
  await page.find('Select Pulse Stereo Lowpass effect 2').fire('click');
  assert.equal(page.ids.get('device-title').textContent,'Stereo Lowpass');
  assert.equal(page.find('Cutoff effective ownership').textContent,'Automation: 0.5 Hz');
  assert.equal(native.calls.some(c=>c.name==='alive_editor'||c.name==='alive_transport'),false);
  const cutoff=page.find('Cutoff base');cutoff.value='1400';await cutoff.fire('change');
  assert.deepEqual(native.calls.find(c=>c.name==='alive_base').args,{instanceId:'effect-1',key:'cutoff',value:1400,generation:1});
  await page.find('Bypass Pulse Stereo Lowpass effect 2').fire('click');
  assert.deepEqual(native.calls.find(c=>c.name==='alive_bypass').args,{instanceId:'effect-1',bypassed:true,generation:1});
  assert.equal(native.calls.some(c=>c.name==='alive_audio'||c.name==='alive_transport'),false);
  assert.equal(page.find('Move Pulse Stereo Utility effect 1 later').disabled,true);
  assert.match(page.ids.get('chain-status').textContent,/Stop transport/);
  view.dispose();
});

test('metadata automation targets distinguish matching keys across instances and preserve original lanes',async()=>{
  const initial=withChain(),page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  const target=page.ids.get('automation-target');
  assert.equal(target.children.length,10);
  target.value=JSON.stringify(['effect-1','cutoff']);await target.fire('change');await page.ids.get('add-lane').fire('click');
  const original=view.model.document().tracks[0].automation.find(l=>l.instanceId===initial.document.tracks[0].device.instanceId&&l.key==='cutoff');
  assert.ok(original.points.length);
  await page.find('Add Stereo Lowpass effect 2 / Cutoff point').fire('click');
  assert.deepEqual(view.model.document().tracks[0].automation.find(l=>l.instanceId==='effect-1'&&l.key==='cutoff'),{instanceId:'effect-1',key:'cutoff',enabled:false,points:[{beat:0,value:2400}]});
  assert.equal(page.find('Move Pulse Stereo Utility effect 1 later').disabled,true);
  assert.match(page.ids.get('chain-status').textContent,/Apply or discard/);
  view.dispose();
});

test('stopped reorder and editor commands retain instance identity and instrument removal names its track scope',async()=>{
  const initial=withChain();initial.state.playing=0;
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  await page.find('Move Pulse Stereo Utility effect 1 later').fire('click');
  assert.deepEqual(native.calls.find(c=>c.name==='alive_device').args,{trackId:'track-1',instanceId:'effect-0',action:'reorder',beforeInstanceId:null,generation:1,draftRevision:0});
  await page.find('Select Pulse Stereo Lowpass effect 2').fire('click');await page.ids.get('edit-device').fire('click');
  assert.deepEqual(native.calls.find(c=>c.name==='alive_editor').args,{instanceId:'effect-1',generation:1});
  assert.ok(page.find('Remove Pulse track'));view.dispose();
});

test('selecting the current clip retains its separate device selection and rejected mutations preserve the chain',async()=>{
  const initial=withChain();initial.state.playing=0;
  const page=dom('./alive.html'),native=backend(initial),invoke=async(name,args)=>{if(name==='alive_device')throw Error('Changed source: use Replace to load utility.ultra');return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();
  await page.find('Select Pulse Stereo Utility effect 1').fire('click');await page.find('Pulse clip').fire('click');
  assert.equal(page.ids.get('device-title').textContent,'Stereo Utility');
  await page.find('Remove Pulse Stereo Utility effect 1').fire('click');await settle();
  assert.equal(view.model.document().tracks[0].effects.length,2);
  assert.equal(page.ids.get('device-title').textContent,'Stereo Utility');assert.match(page.ids.get('notice').textContent,/Replace.*utility/);
  view.dispose();
});

test('new automation points use the current live instance base after polling',async()=>{
  const initial=withChain(),page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  const input=page.find('Cutoff base');input.value='3456';await input.fire('change');
  await page.find('Add Cutoff point').fire('click');
  assert.equal(view.model.document().tracks[0].automation.find(l=>l.key==='cutoff'&&l.instanceId===initial.document.tracks[0].device.instanceId).points.at(-1).value,3456);
  view.dispose();
});

test('piano selection is clean and keyboard edits use one authenticated transaction',async()=>{
  const page=dom('./alive.html'),native=backend(state()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const svg=page.ids.get('piano-roll'),note=descendants(svg).find(e=>e.attrs['data-note']==='0'&&e.attrs['data-part']==='body');
  assert.ok(note);await svg.fire('pointerdown',{target:note,pointerId:1,clientX:10,clientY:10});await svg.fire('pointerup',{pointerId:1,clientX:10,clientY:10});
  assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,0);
  await svg.fire('keydown',{key:'ArrowRight'});await settle();
  const edits=native.calls.filter(c=>c.name==='alive_edit');assert.equal(edits.length,1);assert.equal(edits[0].args.document.tracks[0].notes[0].beat,.25);assert.equal(edits[0].args.draftRevision,0);
  await svg.fire('keydown',{key:'ArrowUp'});await settle();assert.equal(native.calls.filter(c=>c.name==='alive_edit')[1].args.draftRevision,1);
  view.dispose();
});

test('pointer previews commit once; cancel, Escape, scope actions and new revisions commit none',async()=>{
  const page=dom('./alive.html'),native=backend(state()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const svg=page.ids.get('piano-roll'),body=()=>descendants(svg).find(e=>e.attrs['data-note']==='0'&&e.attrs['data-part']==='body');
  const down=()=>svg.fire('pointerdown',{target:body(),pointerId:4,clientX:10,clientY:15});
  await down();await svg.fire('pointermove',{pointerId:4,clientX:12,clientY:15});await svg.fire('pointermove',{pointerId:4,clientX:14,clientY:15});
  assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,0);await svg.fire('pointerup',{pointerId:4});
  assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,1);
  for(const cancel of ['pointercancel','lostpointercapture','Escape','discard','revision']){
    await down();await svg.fire('pointermove',{pointerId:4,clientX:18,clientY:15});
    if(cancel==='Escape')await svg.fire('keydown',{key:'Escape'});
    else if(cancel==='discard')await page.ids.get('discard').fire('click');
    else if(cancel==='revision'){native.snapshot.draftRevision++;await view.refresh();}
    else await svg.fire(cancel,{pointerId:4});
    await svg.fire('pointerup',{pointerId:4});
    assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,1,cancel);
  }
  view.dispose();
});
test('velocity preview is one transaction and external live polls do not replace a drag',async()=>{
  const page=dom('./alive.html'),native=backend(state()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const svg=page.ids.get('piano-roll'),note=descendants(svg).find(e=>e.attrs['data-note']==='0'&&e.attrs['data-part']==='body');
  await svg.fire('pointerdown',{target:note,pointerId:4,clientX:10,clientY:15});await svg.fire('pointerup',{pointerId:4});
  const velocity=page.ids.get('note-velocity');await velocity.fire('pointerdown',{pointerId:6});velocity.value='70';await velocity.fire('input');
  await view.refresh();assert.equal(velocity.value,70);velocity.value='83';await velocity.fire('input');assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,0);
  await velocity.fire('change');assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,1);assert.equal(view.model.document().tracks[0].notes[0].velocity,83);
  view.dispose();
});

test('file cancellation after an accepted boundary refreshes authoritative revision and history',async()=>{
  const page=dom('./alive.html'),native=backend(state());let boundary=false;
  const invoke=async(name,args)=>{if(name==='alive_file'){native.snapshot.document=native.snapshot.draft;native.snapshot.draft=null;native.snapshot.generation++;native.snapshot.draftRevision++;native.snapshot.history={canUndo:false,canRedo:false};boundary=true;return null;}return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();const pitch=page.find('Note 1 pitch');pitch.value='63';await pitch.fire('change');await page.ids.get('quit').fire('click');
  assert.equal(boundary,true);assert.equal(view.model.pending(),false);assert.equal(view.model.document().tracks[0].notes[0].pitch,63);assert.equal(view.model.snapshot().draftRevision,2);assert.equal(page.ids.get('undo').disabled,true);view.dispose();
});

test('queued numeric edits retain their originating track after a selection change',async()=>{
  const page=dom('./alive.html'),native=backend(state());let release,blocked=true;
  const invoke=async(name,args)=>{if(name==='alive_edit'&&blocked){blocked=false;await new Promise(resolve=>{release=resolve;});}return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();const tempo=page.ids.get('tempo');tempo.value='130';const first=tempo.fire('change');await settle();
  const pitch=page.find('Note 1 pitch');pitch.value='61';const second=pitch.fire('change');await settle();await page.find('Select Harmony track').fire('click');release();await first;await second;await settle();
    assert.equal(native.snapshot.draft.tempo,130);assert.equal(native.snapshot.draft.tracks[0].notes[0].pitch,61);assert.equal(native.snapshot.draft.tracks[1].notes[0].pitch,native.snapshot.document.tracks[1].notes[0].pitch);
    assert.deepEqual(native.calls.filter(c=>c.name==='alive_edit').map(c=>c.args.draftRevision),[0,1]);view.dispose();
});
test('Escape cancels a velocity drag including late input and change events',async()=>{
  const page=dom('./alive.html'),native=backend(state()),view=mountAlive({...page,invoke:native.invoke});await settle();const svg=page.ids.get('piano-roll'),note=descendants(svg).find(e=>e.attrs['data-note']==='0'&&e.attrs['data-part']==='body');
  await svg.fire('pointerdown',{target:note,pointerId:4,clientX:10,clientY:15});await svg.fire('pointerup',{pointerId:4});const velocity=page.ids.get('note-velocity');
  await velocity.fire('pointerdown',{pointerId:6});velocity.value='70';await velocity.fire('input');await velocity.fire('keydown',{key:'Escape'});velocity.value='60';await velocity.fire('input');await velocity.fire('change');
  assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,0);assert.equal(view.model.pending(),false);view.dispose();
});

test('rejected audio configuration reaches the audio panel error handler',async()=>{
  const page=dom('./alive.html'),initial=state();initial.audio.running=false;initial.state.playing=0;
  const native=backend(initial),invoke=async(name,args)=>{if(name==='alive_audio_configure')throw Error('Output does not advertise this buffer');return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();await page.ids.get('show-audio').fire('click');await page.ids.get('audio-save').fire('click');
  assert.match(page.ids.get('audio-settings-notice').textContent,/does not advertise/);view.dispose();
});

test('automation event rejection restores accepted score and the next edit recovers',async()=>{
  const page=dom('./alive.html'),native=backend(state());let reject=true;
  const invoke=async(name,args)=>{if(name==='alive_edit'&&reject){reject=false;throw Error('Automation admission failed');}return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();let enable=page.find('Cutoff automation enabled');const original=enable.checked;enable.checked=!original;await enable.fire('change');
  assert.equal(view.model.pending(),false);assert.match(page.ids.get('notice').textContent,/Automation admission failed/);
  enable=page.find('Cutoff automation enabled');enable.checked=!original;await enable.fire('change');assert.equal(view.model.pending(),true);assert.equal(native.snapshot.draftRevision,1);view.dispose();
});

test('a queued note index cannot target another note after a preceding deletion',async()=>{
  const page=dom('./alive.html'),native=backend(state());let release,blocked=true;
  const invoke=async(name,args)=>{if(name==='alive_edit'&&blocked){blocked=false;await new Promise(resolve=>{release=resolve;});}return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();const remove=page.find('Remove note 1'),pitch=page.find('Note 2 pitch');const original=native.snapshot.document.tracks[0].notes[1].pitch;
  const first=remove.fire('click');await settle();pitch.value='65';const second=pitch.fire('change');release();await first;await second;await settle();
  assert.equal(native.snapshot.draft.tracks[0].notes[0].pitch,original);assert.equal(native.snapshot.draft.tracks[0].notes[1].pitch,native.snapshot.document.tracks[0].notes[2].pitch);assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,1);view.dispose();
});

test('automation point indices also invalidate after a queued deletion',async()=>{
  const page=dom('./alive.html'),native=backend(state());let release,blocked=true;
  const invoke=async(name,args)=>{if(name==='alive_edit'&&blocked){blocked=false;await new Promise(resolve=>{release=resolve;});}return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();const remove=page.find('Remove Cutoff point 1'),value=page.find('Cutoff point 2 value');
  const first=remove.fire('click');await settle();value.value='2300';const second=value.fire('change');release();await first;await second;await settle();
  assert.equal(native.calls.filter(c=>c.name==='alive_edit').length,1);view.dispose();
});
