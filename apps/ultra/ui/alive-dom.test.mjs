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

test('plain Tab navigates workspaces while controls and modified Tab keep native focus navigation',async()=>{
  const page=dom('./alive.html'),native=backend(clipState()),view=mountAlive({...page,invoke:native.invoke});await settle();
  let prevented=0;const tab=extra=>page.doc.fire('keydown',{key:'Tab',preventDefault(){prevented++;},...extra});
  await tab({target:page.ids.get('session-workspace')});assert.equal(page.ids.get('arrangement-workspace').hidden,false);assert.equal(prevented,1);
  for(const tag of ['input','select','textarea','button','summary'])await tab({target:page.doc.createElement(tag)});
  const role=page.doc.createElement('div');role.setAttribute('role','slider');await tab({target:role});
  const editable=page.doc.createElement('span');editable.setAttribute('contenteditable','true');await tab({target:editable});
  for(const key of ['shiftKey','ctrlKey','altKey','metaKey'])await tab({target:page.ids.get('session-workspace'),[key]:true});
  assert.equal(prevented,1);assert.equal(page.ids.get('arrangement-workspace').hidden,false);
  await tab({target:page.ids.get('arrangement-workspace')});assert.equal(page.ids.get('session-workspace').hidden,false);view.dispose();
});
test('repeated view navigation preserves playing pending receipts, draft, clip, instance and editor lifecycle',async()=>{
  const initial=clipState();initial.draft=structuredClone(initial.document);initial.draft.tracks[1].slots[0].name='Unsaved';
  initial.runtime.tracks[1].pendingAction='launch';initial.runtime.tracks[1].pendingClipId='clip-track-2';initial.runtime.tracks[1].pendingFrame='96000';
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  await page.find('Select Harmony slot 1').fire('click');await page.ids.get('edit-device').fire('click');
  const before=structuredClone(view.model.snapshot()),piano=page.ids.get('piano-roll'),parameter=page.find('Cutoff base');parameter.value='1717';
  const calls=native.calls.length;
  for(let i=0;i<4;i++){await page.ids.get('view-arrangement').fire('click');await page.ids.get('view-session').fire('click');}
  assert.deepEqual(view.model.snapshot(),before);assert.equal(native.calls.length,calls);assert.equal(page.ids.get('piano-roll'),piano);assert.equal(page.find('Cutoff base'),parameter);assert.equal(parameter.value,'1717');
  assert.equal(page.find('Select Harmony slot 1').attrs['aria-pressed'],'true');await page.ids.get('edit-device').fire('click');
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_editor').map(c=>c.args.instanceId),[initial.document.tracks[1].device.instanceId,initial.document.tracks[1].device.instanceId]);view.dispose();
});
test('browser and Clip Devices detail toggle locally without rebuilding active controls',async()=>{
  const page=dom('./alive.html'),native=backend(clipState()),view=mountAlive({...page,invoke:native.invoke});await settle();const calls=native.calls.length;
  const note=page.find('Note 1 pitch');note.value='73';
  await page.ids.get('toggle-browser').fire('click');assert.equal(page.ids.get('workspace-browser').hidden,true);
  await page.ids.get('detail-devices').fire('click');assert.equal(page.ids.get('device-detail').hidden,false);assert.equal(page.ids.get('clip-detail').hidden,true);
  await page.ids.get('toggle-detail').fire('click');assert.equal(page.ids.get('detail-content').hidden,true);
  await page.ids.get('detail-clip').fire('click');assert.equal(page.ids.get('detail-content').hidden,false);assert.equal(page.ids.get('clip-detail').hidden,false);
  assert.equal(page.find('Note 1 pitch'),note);assert.equal(note.value,'73');assert.equal(native.calls.length,calls);view.dispose();
});
test('detail resize supports keyboard and cancels pointer preview with Escape',async()=>{
  const page=dom('./alive.html'),native=backend(clipState()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const handle=page.ids.get('detail-resizer'),shell=page.ids.get('workspace-shell');shell.clientHeight=700;
  await handle.fire('keydown',{key:'ArrowUp'});assert.equal(handle.attrs['aria-valuenow'],'240');
  await handle.fire('pointerdown',{pointerId:1,clientY:400});await handle.fire('pointermove',{pointerId:1,clientY:350});assert.equal(handle.attrs['aria-valuenow'],'290');
  await page.doc.fire('keydown',{key:'Escape',target:handle});assert.equal(handle.attrs['aria-valuenow'],'240');assert.equal(shell.style['--detail-height'],'240px');
  await handle.fire('pointerdown',{pointerId:2,clientY:400});await handle.fire('pointermove',{pointerId:2,clientY:450});await handle.fire('pointercancel');assert.equal(handle.attrs['aria-valuenow'],'240');view.dispose();
});
test('eight Session tracks expose four vertical slots and a mixer per column plus four scene rows',async()=>{
  const initial=clipState();initial.capabilities={maxTracks:8,maxDevices:16,atomicTrackActions:true};
  while(initial.document.tracks.length<8){const i=initial.document.tracks.length+1,t=structuredClone(initial.document.tracks[0]);t.id=`track-${i}`;t.name=`Track ${i}`;t.device.instanceId=`instance-${i}`;t.slots[0].id=`clip-${i}`;t.defaultClipId=t.slots[0].id;initial.document.tracks.push(t);initial.deviceInstances[t.device.instanceId]={...structuredClone(initial.deviceInstances[initial.document.tracks[0].device.instanceId]),index:i-1,track:i-1};initial.state.tracks.push(structuredClone(initial.state.tracks[0]));initial.state.devices.push(structuredClone(initial.state.devices[0]));}
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.equal(page.ids.get('tracks').children.length,8);
  for(const column of page.ids.get('tracks').children){assert.equal(descendants(column).filter(e=>e.classList.contains('clip-slot')).length,4);assert.ok(descendants(column).find(e=>e.classList.contains('track-mixer')));}
  assert.equal(page.ids.get('scene-controls').children.length,4);assert.equal(page.ids.get('session-workspace').hidden,false);
  await page.ids.get('view-arrangement').fire('click');assert.match(page.ids.get('arrangement-unavailable').textContent,/unavailable/i);assert.equal(native.calls.filter(c=>c.name!=='alive_current').length,0);view.dispose();
});
function clipState(){const s=state();s.mode='clipsV3';s.preparationRevision='1';s.snapshotSequence='1';s.document.format='alive-session-v3';s.preparedClips=[];
  for(const t of s.document.tracks){const clip={id:`clip-${t.id}`,name:'Clip 1',lengthBeats:s.document.lengthBeats,notes:t.notes.map((n,i)=>({...n,id:`note-${t.id}-${i}`})),automation:t.automation};t.slots=[clip,null,null,null];t.defaultClipId=clip.id;delete t.notes;delete t.automation;s.preparedClips.push({trackId:t.id,clipId:clip.id,name:clip.name,slot:0,lengthFrames:'411429'});}
  s.runtime={tracks:s.document.tracks.map(t=>({trackId:t.id,activeClipId:t.slots[0].id,phase:'0',epoch:'1',pendingAction:null,pendingClipId:null,pendingSerial:null,pendingFrame:null})),requests:[],requestedStopEpoch:'0',appliedStopEpoch:'0'};return s;}

test('compact clip states follow native identities independently of selection and draft names',async()=>{
  const initial=clipState();initial.draft=structuredClone(initial.document);
  const track=initial.draft.tracks[0];track.slots[0].name='Draft rename';
  track.slots[1]={...structuredClone(track.slots[0]),id:'draft-only',name:'Draft'};
  initial.runtime.tracks[0].pendingClipId=track.slots[0].id;
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  await page.find('Select Pulse slot 3').fire('click');
  const first=page.find('Select Pulse slot 1').parentElement,second=page.find('Select Pulse slot 2').parentElement,empty=page.find('Select Pulse slot 3').parentElement;
  for(const state of ['occupied','playing','pending','saved-default'])assert.ok(first.classList.contains(state),state);
  assert.equal(first.classList.contains('selected'),false);assert.ok(second.classList.contains('draft-only'));assert.ok(empty.classList.contains('empty'));assert.ok(empty.classList.contains('selected'));
  native.snapshot.draft.tracks[0].slots[0]=null;native.snapshot.draftRevision++;native.snapshot.snapshotSequence='2';await view.refresh();
  assert.match(page.find('Pulse clip runtime').textContent,/deleted in draft/);assert.match(page.find('Pulse clip runtime').textContent,/Playing Clip 1/);view.dispose();
});

test('gain fader commits once, synchronizes numeric and snapshots, and preserves unfinished numeric input',async()=>{
  const page=dom('./alive.html'),native=backend(clipState()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const slider=page.find('Pulse gain fader'),number=page.find('Pulse gain');assert.ok(slider);assert.equal(slider.min,'0');assert.equal(slider.max,'2');
  slider.focus();slider.value='.7';await slider.fire('input');assert.equal(native.calls.filter(c=>c.name==='alive_mixer').length,0);
  await slider.fire('change');assert.equal(native.calls.filter(c=>c.name==='alive_mixer').length,1);assert.equal(Number(number.value),.7);
  number.focus();number.value='';native.snapshot.document.tracks[0].gain=.4;native.snapshot.snapshotSequence='2';await view.refresh();assert.equal(number.value,'');assert.equal(Number(slider.value),.4);
  number.value='.85';await number.fire('change');assert.equal(Number(slider.value),.85);number.blur();await view.refresh();assert.equal(native.calls.filter(c=>c.name==='alive_mixer').length,2);
  const meter=page.find('Pulse stereo peak');assert.equal(meter.children[0].style.height,'10%');assert.equal(meter.children[1].style.height,'20%');assert.equal(page.find('Pulse peak').textContent,'0.100 / 0.200');view.dispose();
});

test('empty body double-click creates once with no launch and late completion preserves newer selection',async()=>{
  const page=dom('./alive.html'),native=backend(clipState());let release;
  const invoke=async(name,args)=>{if(name==='alive_clip_edit')await new Promise(resolve=>{release=resolve;});return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();const empty=page.find('Select Pulse slot 2');
  await empty.fire('click');await empty.fire('click');assert.equal(native.calls.filter(c=>c.name==='alive_clip_edit').length,0);
  await empty.fire('dblclick');await empty.fire('dblclick');await page.find('Select Harmony slot 3').fire('click');assert.ok(release);release();await settle();await settle();
  assert.equal(native.calls.filter(c=>c.name==='alive_clip_edit').length,1);assert.equal(native.calls.filter(c=>c.name==='alive_clip_action').length,0);
  assert.equal(page.find('Select Harmony slot 3').attrs['aria-pressed'],'true');assert.ok(view.model.document().tracks[0].slots[1]);view.dispose();
});

test('scene controls launch a prepared row once without selection or document edits',async()=>{
  const initial=clipState();initial.capabilities={atomicTrackActions:true};initial.state.playing=0;initial.audio.running=true;
  initial.draft=structuredClone(initial.document);initial.draft.tracks[0].slots[0].name='Draft name';
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  const button=page.find('Launch scene 1');assert.ok(button,'scene row has an explicit launch button');
  assert.match(page.find('Prepared scene 1').textContent,/Pulse: Clip 1/);assert.doesNotMatch(page.find('Prepared scene 1').textContent,/Draft name/);
  assert.match(page.find('Prepared scene 4').textContent,/Pulse: Stop.*Harmony: Stop/);
  await page.find('Select Harmony slot 2').fire('click');button.focus();await button.fire('click');
  const calls=native.calls.filter(c=>c.name!=='alive_current');assert.deepEqual(calls,[{name:'alive_launch_scene',args:{generation:1,preparationRevision:'1',slot:0}}]);
  assert.equal(page.find('Select Harmony slot 2').attrs['aria-pressed'],'true');assert.equal(page.doc.activeElement,button);
  assert.equal(view.model.document().tracks[0].slots[0].name,'Draft name');view.dispose();
});
test('scene receipt shows separate member outcomes and never presents it as transport success',async()=>{
  const initial=clipState();initial.capabilities={atomicTrackActions:true};initial.audio.running=true;
  initial.runtime.requests=[{preparationRevision:'1',requestSerial:'9007199254740993',sceneSlot:0,trackId:null,status:'pending',reason:18,targetFrame:'96000',members:[{trackId:'track-1',clipId:'clip-track-1',action:'launch',status:'pending'},{trackId:'track-2',clipId:'clip-track-2',action:'launch',status:'superseded'}]}];
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  const result=page.find('Scene 1 request');assert.ok(result);assert.match(result.textContent,/9007199254740993.*pending.*96000/);
  assert.match(result.textContent,/Pulse: pending.*Harmony: superseded/);assert.doesNotMatch(page.ids.get('notice').textContent,/Transport/);
  native.snapshot.snapshotSequence='2';native.snapshot.runtime.requests[0].status='mixed';native.snapshot.runtime.requests[0].members[0].status='applied';await view.refresh();
  assert.match(result.textContent,/Pulse: applied.*Harmony: superseded/);assert.doesNotMatch(result.textContent,/prior playback or pending action is retained/);view.dispose();
});
test('scene receipts hide through legacy fallback and refresh identities when clip-bank mode returns',async()=>{
  const initial=clipState();initial.capabilities={atomicTrackActions:true};initial.preparedClips[0].name='Old session clip';
  initial.runtime.requests=[{preparationRevision:'1',requestSerial:'13',sceneSlot:0,status:'applied',reason:0,members:[{trackId:'track-1',action:'launch',status:'applied'}]}];
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  const history=page.ids.get('scene-history');assert.ok(history);history.open=true;
  assert.equal(history.hidden,false);assert.match(page.find('Prepared scene 1').textContent,/Old session clip/);assert.match(page.find('Scene 1 request').textContent,/request 13 applied/);
  Object.assign(native.snapshot,state(),{generation:2,mode:'legacyV2',snapshotSequence:'2',preparedClips:[],runtime:null});await view.refresh();
  assert.equal(history.hidden,true);assert.equal(page.ids.get('scene-controls').hidden,true);
  const next=clipState();next.generation=3;next.preparationRevision='2';next.snapshotSequence='3';next.preparedClips[0].name='Fresh session clip';next.preparedClips[0].clipId='fresh-clip';next.document.tracks[0].slots[0].id='fresh-clip';next.runtime.tracks[0].activeClipId='fresh-clip';
  next.runtime.requests=[{preparationRevision:'2',requestSerial:'14',sceneSlot:0,status:'rejected',reason:7,members:[{trackId:'track-1',action:'launch',status:'rejected'}]}];
  Object.assign(native.snapshot,next);await view.refresh();assert.equal(history.hidden,false);assert.equal(page.ids.get('scene-controls').hidden,false);
  assert.match(page.find('Prepared scene 1').textContent,/Fresh session clip/);assert.doesNotMatch(page.find('Prepared scene 1').textContent,/Old session clip/);
  assert.match(page.find('Scene 1 request').textContent,/request 14 rejected/);assert.doesNotMatch(page.find('Scene 1 request').textContent,/request 13/);
  assert.equal(native.calls.filter(c=>c.name!=='alive_current').length,0);view.dispose();
});
test('queued scene captures preparation at gesture and late result preserves newer selection and focus',async()=>{
  const initial=clipState();initial.capabilities={atomicTrackActions:true};initial.audio.running=true;
  const page=dom('./alive.html'),native=backend(initial),boundary=delayedBoundary(native,'alive_base',()=>{}),view=mountAlive({...page,invoke:boundary.invoke});await settle();
  const input=page.find('Cutoff base');input.value='1800';await input.fire('change');
  const launch=page.find('Launch scene 4');assert.ok(launch);await launch.fire('click');
  await page.find('Select Harmony slot 3').fire('click');const selected=page.find('Select Harmony slot 3');selected.focus();
  native.snapshot.preparationRevision='2';native.snapshot.snapshotSequence='2';await view.refresh();boundary.release();await settle();await settle();
  assert.deepEqual(native.calls.find(c=>c.name==='alive_launch_scene').args,{generation:1,preparationRevision:'1',slot:3});
  assert.equal(page.find('Select Harmony slot 3').attrs['aria-pressed'],'true');assert.equal(page.doc.activeElement,selected);view.dispose();
});

test('track addition follows explicitly advertised capacity and retains the legacy fallback',async()=>{
  const initial=clipState();initial.state.playing=0;initial.capabilities={maxTracks:8,maxDevices:16};
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.equal(page.ids.get('add-track').disabled,false);
  native.snapshot.capabilities={maxTracks:2,maxDevices:6};native.snapshot.snapshotSequence='2';await view.refresh();
  assert.equal(page.ids.get('add-track').disabled,true);view.dispose();
});

test('four slots separate selection, draft-only launch and prepared runtime identity',async()=>{
  const initial=clipState(),page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.ok(page.find('Select Pulse slot 4'));await page.find('Select Pulse slot 2').fire('click');
  assert.equal(native.calls.filter(c=>c.name==='alive_clip_action'||c.name==='alive_edit').length,0);
  assert.ok(page.find('Create clip'));assert.equal(page.ids.get('add-note').disabled,true);
  await page.find('Select Pulse slot 1').fire('click');await page.find('Launch Pulse Clip 1').fire('click');
  const action=native.calls.find(c=>c.name==='alive_clip_action');assert.deepEqual(action.args.action,{kind:'launch',trackId:initial.document.tracks[0].id,clipId:initial.document.tracks[0].slots[0].id});assert.equal(action.args.preparationRevision,'1');view.dispose();
});

test('asynchronous work refusal names the requested clip and preserves actionable runtime context',async()=>{
  const initial=clipState();initial.preparedClips.push({trackId:'track-1',clipId:'second',name:'Second',slot:1,lengthFrames:'411429'});
  Object.assign(initial.runtime.tracks[0],{pendingAction:'launch',pendingClipId:'clip-track-1',pendingSerial:'8',pendingFrame:'4096'});
  initial.runtime.requests=[{preparationRevision:'1',requestSerial:'9',status:'queued',reason:0,trackId:'track-1',clipId:'second',targetFrame:null}];
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.match(page.find('Pulse clip runtime').textContent,/request 9 queued/);
  Object.assign(native.snapshot.runtime.requests[0],{status:'rejected',reason:12});
  native.snapshot.snapshotSequence='2';await view.refresh();
  const output=page.find('Pulse clip runtime').textContent;
  assert.match(output,/Playing Clip 1/);assert.match(output,/request 9 rejected.*Second.*optional work limit/);
  assert.match(output,/pending launch at frame 4096/);
  assert.match(output,/prior playback or pending action is retained/i);assert.match(output,/Let audio advance before an explicit retry/);
  assert.equal(native.calls.filter(c=>c.name==='alive_clip_action').length,0);view.dispose();
});

for(const[action,button]of [['start','start'],['seek','seek-go']])test(`v3 ${action} reports native refusal instead of transport success`,async()=>{
  const initial=clipState();initial.state.playing=0;const page=dom('./alive.html'),native=backend(initial);
  const result={preparationRevision:'1',requestSerial:'9',status:'rejected',reason:7,trackId:null,clipId:null,targetFrame:null};
  const invoke=async(name,args)=>{if(name==='alive_transport'){native.snapshot.runtime.requests=[result];return result;}return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();await page.ids.get(button).fire('click');
  assert.match(page.ids.get('notice').textContent,/Transport request 9 rejected.*command queue full/);
  assert.doesNotMatch(page.ids.get('notice').textContent,/Transport playing|seek queued/);assert.equal(view.model.snapshot().state.playing,0);view.dispose();
});

test('trackless transport receipts progress from queued to asynchronous refusal without automatic retry',async()=>{
  const initial=clipState();initial.state.playing=0;const page=dom('./alive.html'),native=backend(initial);let requests=0;
  const result={preparationRevision:'1',requestSerial:'9',status:'queued',reason:0,trackId:null,clipId:null,targetFrame:null};
  const invoke=async(name,args)=>{if(name==='alive_transport'){requests++;native.snapshot.runtime.requests=[structuredClone(result)];return result;}return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();await page.ids.get('start').fire('click');
  assert.match(page.ids.get('notice').textContent,/Transport request 9 queued/);assert.doesNotMatch(page.ids.get('notice').textContent,/Transport playing/);
  Object.assign(native.snapshot.runtime.requests[0],{status:'rejected',reason:12});native.snapshot.snapshotSequence='2';await view.refresh();
  assert.match(page.ids.get('notice').textContent,/Transport request 9 rejected.*optional work limit/);assert.match(page.ids.get('notice').textContent,/explicit retry/);assert.equal(requests,1);view.dispose();
});

test('immediate queued transport response cannot overwrite a matching applied publication',async()=>{
  const initial=clipState(),page=dom('./alive.html'),native=backend(initial);
  const result={preparationRevision:'1',requestSerial:'9',status:'queued',reason:0,trackId:null,clipId:null,targetFrame:null};
  const invoke=async(name,args)=>{if(name==='alive_transport'){native.snapshot.runtime.requests=[{...result,status:'applied'}];return result;}return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();await page.ids.get('start').fire('click');
  assert.match(page.ids.get('notice').textContent,/Transport request 9 applied/);assert.doesNotMatch(page.ids.get('notice').textContent,/queued/);view.dispose();
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
  const ids=new Map(),doc=new Element('document',null);doc.doc=doc;doc.activeElement=null;doc.createElement=tag=>new Element(tag,doc);doc.createElementNS=(_,tag)=>new Element(tag,doc);doc.createTextNode=text=>{const e=new Element('text',doc);e.textContent=text;return e;};doc.getElementById=id=>ids.get(id);
  const html=readFileSync(new URL(file,import.meta.url),'utf8');
  for(const[markup,tag,id]of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const element=new Element(tag,doc);element.id=id;element.hidden=/\bhidden\b/.test(markup);const text=html.slice(html.indexOf(markup)+markup.length).match(/^[^<]+/);if(text)element.textContent=text[0];ids.set(id,element);}
  if(ids.has('master-meter'))ids.get('master-meter').append(doc.createElement('i'),doc.createElement('i'));
  const timeouts=[],win={setTimeout:(fn,delay)=>timeouts.push({fn,delay}),addEventListener(){},removeEventListener(){}};
  return{doc,win,ids,timeouts,find:label=>[...ids.values()].flatMap(e=>[e,...descendants(e)]).find(e=>e.attrs['aria-label']===label)};
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
    if(name==='alive_mixer'){Object.assign(snapshot.document.tracks[args.track],{gain:args.gain,mute:args.mute,solo:args.solo});if(snapshot.draft)Object.assign(snapshot.draft.tracks[args.track],{gain:args.gain,mute:args.mute,solo:args.solo});return;}
    if(name==='alive_clip_edit'){const op=args.operation;assert.equal(op.kind,'create');snapshot.draft??=structuredClone(snapshot.document);const track=snapshot.draft.tracks.find(t=>t.id===op.trackId);assert.equal(track.slots[op.slot],null);track.slots[op.slot]={id:'created-clip',name:'New clip',lengthBeats:8,notes:[],automation:[]};snapshot.draftRevision++;return{snapshot:structuredClone(snapshot),affected:{trackId:op.trackId,slot:op.slot}};}
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

const dependencyError='Dependency journey-utility.ultra changed. Restore the matching original, then Replace intended instances.';
const snapshotError='Session state is temporarily unavailable';
async function pollAlive(page){
  const index=page.timeouts.findIndex(timer=>timer.delay===80);assert.notEqual(index,-1,'poll remains scheduled');
  const [{fn}]=page.timeouts.splice(index,1);await fn();await settle();
}
for(const failFinalRefresh of [true,false])test(`file refusal survives ${failFinalRefresh?'rejected final refresh':'later periodic refresh failure'} and recovery`,async()=>{
  const initial=clipState();initial.draft=structuredClone(initial.document);initial.draft.tracks[1].slots[0].notes[0].pitch=73;
  initial.draftRevision=4;initial.history={canUndo:true,canRedo:false};
  const page=dom('./alive.html'),native=backend(initial);let failSnapshot=false;
  const invoke=async(name,args)=>{
    if(name==='alive_file'){await native.invoke(name,args);failSnapshot=failFinalRefresh;throw Error(dependencyError);}
    if(name==='alive_current'&&failSnapshot){await native.invoke(name,args);throw Error(snapshotError);}
    return native.invoke(name,args);
  };
  const view=mountAlive({...page,invoke});await settle();await page.find('Select Harmony slot 1').fire('click');
  const piano=page.ids.get('piano-roll'),note=descendants(piano).find(e=>e.attrs['data-note']==='0'&&e.attrs['data-part']==='body');
  await piano.fire('pointerdown',{target:note,pointerId:4,clientX:10,clientY:15});await piano.fire('pointerup',{pointerId:4});
  await page.ids.get('open').fire('click');
  const status=page.ids.get('notice');
  if(failFinalRefresh){assert.equal(status.textContent,`Error: ${dependencyError} Refresh delayed: Error: ${snapshotError}`);}
  else assert.equal(status.textContent,`Error: ${dependencyError}`);
  const pitch=page.find('Note 1 pitch');pitch.focus();pitch.value='74';failSnapshot=true;
  await pollAlive(page);
  assert.equal(status.textContent,`Error: ${dependencyError} Refresh delayed: Error: ${snapshotError}`);assert.equal(status.classList.contains('error'),true);
  failSnapshot=false;native.snapshot.snapshotSequence='2';native.snapshot.state.absoluteFrame=4096;
  native.snapshot.runtime.requests=[{preparationRevision:'1',requestSerial:'9',trackId:null,clipId:null,status:'applied',reason:0}];
  await pollAlive(page);
  assert.equal(status.textContent,`Error: ${dependencyError}`);assert.equal(status.classList.contains('error'),true);
  assert.equal(view.model.snapshot().state.absoluteFrame,4096);assert.deepEqual(view.model.document(),initial.draft);
  assert.equal(page.find('Select Harmony slot 1').attrs['aria-pressed'],'true');
  assert.equal(page.ids.get('note-velocity').disabled,false,'selected note survives rejected file and polls');
  assert.equal(page.find('Note 1 pitch'),pitch);assert.equal(pitch.value,'74');
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_file').map(c=>c.args),[{action:'open',generation:1,draftRevision:4}]);
  assert.equal(native.calls.filter(c=>!['alive_file','alive_current'].includes(c.name)).length,0);view.dispose();
});

test('successful file keeps its result with failed refresh and clears only refresh health on recovery',async()=>{
  const page=dom('./alive.html'),native=backend(state());let failSnapshot=false;
  const invoke=async(name,args)=>{
    const result=await native.invoke(name,args);
    if(name==='alive_file'){failSnapshot=true;native.snapshot.dirty=false;}
    if(name==='alive_current'&&failSnapshot)throw Error(snapshotError);
    return result;
  };
  const view=mountAlive({...page,invoke});await settle();await page.ids.get('save').fire('click');
  const status=page.ids.get('notice');assert.equal(status.textContent,`Session saved. Refresh delayed: Error: ${snapshotError}`);assert.equal(status.classList.contains('error'),true);
  failSnapshot=false;await pollAlive(page);
  assert.equal(status.textContent,'Session saved.');assert.equal(status.classList.contains('error'),false);
  assert.equal(native.calls.filter(c=>c.name==='alive_file').length,1);view.dispose();
});

test('migrated save feedback remains visible when the follow-up refresh fails',async()=>{
  const page=dom('./alive.html'),native=backend(state());let failSnapshot=false;
  const invoke=async(name,args)=>{
    if(name==='alive_current'&&failSnapshot)throw Error(snapshotError);
    const result=await native.invoke(name,args);
    if(name==='alive_file'){result.notice='Saved in Alive session v5 format';failSnapshot=true;}
    return result;
  };
  const view=mountAlive({...page,invoke});await settle();await page.ids.get('save').fire('click');
  assert.equal(page.ids.get('notice').textContent,`Saved in Alive session v5 format Refresh delayed: Error: ${snapshotError}`);
  view.dispose();
});

test('ordinary periodic refresh retains ready status and a later explicit file action replaces an old refusal',async()=>{
  const page=dom('./alive.html'),native=backend(state());let refuse=true;
  const invoke=async(name,args)=>{const result=await native.invoke(name,args);if(name==='alive_file'&&refuse)throw Error(dependencyError);return result;};
  const view=mountAlive({...page,invoke});await settle();const status=page.ids.get('notice'),ready=status.textContent;
  native.snapshot.state.absoluteFrame=4096;await pollAlive(page);assert.equal(view.model.snapshot().state.absoluteFrame,4096);assert.equal(status.textContent,ready);
  await page.ids.get('open').fire('click');assert.equal(status.textContent,`Error: ${dependencyError}`);
  refuse=false;await page.ids.get('save').fire('click');assert.equal(status.textContent,'Session saved.');assert.equal(status.classList.contains('error'),false);
  await pollAlive(page);assert.equal(status.textContent,'Session saved.');
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_file').map(c=>c.args.action),['open','save']);view.dispose();
});

test('workspace conversion feedback does not misidentify a v5 envelope as a v4 file',async()=>{
  const initial=state();initial.state.playing=0;initial.capabilities={workspaceConversionAvailable:true,clipBank:false};
  const page=dom('./alive.html'),native=backend(initial);
  const invoke=async(name,args)=>name==='alive_enable_workspaces'?structuredClone(native.snapshot):native.invoke(name,args);
  const view=mountAlive({...page,invoke});await settle();
  await page.find('Enable MIDI workspaces').fire('click');
  const status=page.ids.get('notice').textContent;
  assert.match(status,/MIDI workspaces prepared/);assert.doesNotMatch(status,/Save writes v4/);
  view.dispose();
});

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

function workspaceState(){
  const s=clipState();s.mode='workspacesV4';s.document.format='alive-session-v4';s.document.loopStartBeats=0;s.document.loopEndBeats=s.document.lengthBeats;s.document.sources=[];s.document.placements=[];s.devices=[];s.preparedClips=[];s.trackChains=[];s.preparedWorkspaces={preparationRevision:s.preparationRevision,sources:[],slots:[],placements:[]};
  for(const [i,t] of s.document.tracks.entries()){
    const c=t.slots[0],sourceId=`source-independent-${i}`,placementId=`placement-${i}`;
    s.document.sources.push({kind:'midi',id:sourceId,trackId:t.id,name:c.name,lengthBeats:c.lengthBeats,notes:c.notes,automation:c.automation});
    t.chain={kind:'midi',instrument:t.device};t.color=i?'#86a59c':'#c77b61';delete t.device;delete t.defaultClipId;
    t.slots[0]={id:c.id,name:c.name,sourceId,sourceOffset:{kind:'beats',value:0},loopEnabled:true};
    s.document.placements.push({id:placementId,trackId:t.id,sourceId,start:0,duration:s.document.lengthBeats,sourceOffset:{kind:'beats',value:0},loopEnabled:true});
    s.trackChains.push({trackId:t.id,kind:'midi',instrumentId:t.chain.instrument.instanceId,effectIds:[]});
    s.preparedWorkspaces.sources.push({trackId:t.id,sourceId,kind:'midi',name:c.name,lengthFrames:'205714'});
    s.preparedWorkspaces.slots.push({trackId:t.id,slotId:c.id,slot:0,sourceId,name:c.name,sourceOffsetFrames:'0',loopEnabled:true});
    s.preparedWorkspaces.placements.push({trackId:t.id,placementId,sourceId,startFrame:'0',durationFrames:'205714',sourceOffsetFrames:'0',loopEnabled:true});
  }
  s.runtime={tracks:s.document.tracks.map((t,i)=>({trackId:t.id,authority:'arrangement',activeSlotId:null,activePlacementId:`placement-${i}`,activeSourceId:`source-independent-${i}`,phase:'0',epoch:'1',pendingAction:null,pendingAuthority:null,pendingSlotId:null,pendingSerial:null,pendingFrame:null})),requests:[],requestedStopEpoch:'0',appliedStopEpoch:'0'};
  s.capabilities={clipBank:true,workspaces:true,arrangement:true,audioSources:false,workspaceConversionAvailable:false,maxTracks:2,maxDevices:6,maxSources:8,maxPlacements:16,atomicTrackActions:true};return s;
}
test('v4 Session reads sources and real chains without compatibility instruments or embedded clips',async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.ok(page.find('Note 1 pitch'));assert.equal(page.ids.get('tracks').children.length,2);assert.match(page.find('Pulse clip runtime').textContent,/Arrangement/i);
  assert.ok(page.find('Return Pulse to Arrangement'));assert.ok(page.find('Make source independent'));assert.equal(page.find('Set Saved Default'),undefined);
  await page.find('Launch Pulse Clip 1').fire('click');
  assert.deepEqual(native.calls.find(c=>c.name==='alive_workspace_action').args,{generation:1,preparationRevision:'1',action:{kind:'launch',trackId:'track-1',slotId:'clip-track-1'}});
  view.dispose();
});
test('v4 Play starts shared audio then sends Start with the original captured preparation',async()=>{
  const initial=workspaceState();initial.state.playing=0;initial.audio.running=false;
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:async(name,args)=>{const result=await native.invoke(name,args);if(name==='alive_audio'){native.snapshot.generation=2;native.snapshot.preparationRevision='2';}return result;}});await settle();
  await page.ids.get('start').fire('click');
  assert.deepEqual(native.calls.filter(c=>['alive_audio','alive_workspace_action'].includes(c.name)),[{name:'alive_audio',args:{action:'start',generation:1}},{name:'alive_workspace_action',args:{action:{kind:'start'},generation:1,preparationRevision:'1'}}]);view.dispose();
});
test('v4 failed audio start never submits a runtime Start',async()=>{
  const initial=workspaceState();initial.state.playing=0;const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_audio')throw Error('Device failed');return native.invoke(name,args);}});await settle();await page.ids.get('start').fire('click');
  assert.equal(native.calls.some(c=>c.name==='alive_workspace_action'),false);assert.match(page.ids.get('notice').textContent,/Device failed/);view.dispose();
});

test('v4 note edits address the source while draft-only slots cannot launch',async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=backend(initial);
  initial.document.tracks[0].slots[1]={...initial.document.tracks[0].slots[0],id:'draft-only',name:'Draft slot'};
  const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_workspace_edit'){native.calls.push({name,args});return{snapshot:structuredClone(native.snapshot),affected:{sourceId:args.operation.sourceId}};}return native.invoke(name,args);}});await settle();
  const pitch=page.find('Note 1 pitch');pitch.value='64';await pitch.fire('change');const op=native.calls.find(c=>c.name==='alive_workspace_edit').args.operation;
  assert.equal(op.kind,'noteUpdate');assert.equal(op.sourceId,'source-independent-0');assert.notEqual(op.sourceId,initial.document.tracks[0].slots[0].id);assert.equal(page.find('Launch Pulse Draft slot').disabled,true);view.dispose();
});

test('v4 queued automation cannot retarget a slot made independent by an earlier command',async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=backend(initial);let release;
  const view=mountAlive({...page,invoke:async(name,args)=>{
    if(name==='alive_workspace_edit'){native.calls.push({name,args});if(args.operation.kind==='sourceIndependent'){
      await new Promise(resolve=>{release=resolve;});native.snapshot.draft=structuredClone(native.snapshot.document);const source=structuredClone(native.snapshot.draft.sources[0]);source.id='new-independent-source';source.notes.forEach(n=>n.id+='-new');native.snapshot.draft.sources.push(source);native.snapshot.draft.tracks[0].slots[0].sourceId=source.id;native.snapshot.draftRevision++;
    }return{snapshot:structuredClone(native.snapshot),affected:{trackId:'track-1',slotId:'clip-track-1',sourceId:'new-independent-source'}};}return native.invoke(name,args);
  }});await settle();
  const first=page.find('Make source independent').fire('click');await settle();const enabled=page.find('Cutoff automation enabled');enabled.checked=!enabled.checked;const second=enabled.fire('change');release();await first;await second;await settle();
  assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,1);assert.match(page.ids.get('notice').textContent,/source.*changed/i);view.dispose();
});

for(const effectFirst of [false,true])test(`v4 unavailable audio chain has explicit optional instrument (${effectFirst?'effect first':'empty'})`,async()=>{
  const initial=workspaceState(),track=initial.document.tracks[0],reference=track.chain.instrument;
  track.chain={kind:'audio'};track.slots=[null,null,null,null];track.effects=effectFirst?[{...reference,instanceId:'audio-effect'}]:[];
  initial.document.sources=initial.document.sources.filter(s=>s.trackId!==track.id);initial.document.placements=initial.document.placements.filter(p=>p.trackId!==track.id);
  initial.trackChains[0]={trackId:track.id,kind:'audio',instrumentId:null,effectIds:effectFirst?['audio-effect']:[]};
  if(effectFirst)initial.deviceInstances['audio-effect']=structuredClone(initial.deviceInstances[reference.instanceId]);
  initial.runtime.tracks[0]={...initial.runtime.tracks[0],activeSourceId:null,activeSlotId:null,activePlacementId:null,phase:null};
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.equal(page.ids.get('add-note').disabled,true);assert.equal(page.find('Create clip').disabled,true);
  assert.equal(page.ids.get('notes').children.length,0);assert.equal(page.find('Note 1 pitch'),undefined);
  if(effectFirst){const bypass=descendants(page.ids.get('chain')).find(e=>e.attrs['aria-label']?.startsWith('Bypass '));assert.equal(bypass.disabled,false);}
  view.dispose();
});

for(const firstField of ['name','offset'])test(`v4 queued slot ${firstField} edit preserves the other accepted field`,async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=backend(initial);let release;
  const view=mountAlive({...page,invoke:async(name,args)=>{
    if(name!=='alive_workspace_edit')return native.invoke(name,args);
    native.calls.push({name,args});if(!release)await new Promise(resolve=>{release=resolve;});
    native.snapshot.draft??=structuredClone(native.snapshot.document);const op=args.operation;
    const slot=native.snapshot.draft.tracks.find(t=>t.id===op.trackId).slots.find(s=>s?.id===op.slotId);
    Object.assign(slot,{name:op.name,sourceOffset:op.sourceOffset,loopEnabled:op.loopEnabled});native.snapshot.draftRevision++;
    return{snapshot:structuredClone(native.snapshot),affected:{trackId:op.trackId,slotId:op.slotId,sourceId:slot.sourceId,noteId:null,placementId:null}};
  }});await settle();
  const name=page.find('Clip name'),offset=page.find('Slot source offset');name.value='Renamed slot';offset.value='0.25';
  await(firstField==='name'?name:offset).fire('change');await(firstField==='name'?offset:name).fire('change');
  assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,1);release();await settle();await settle();await settle();
  const edits=native.calls.filter(c=>c.name==='alive_workspace_edit');assert.deepEqual(edits.map(c=>c.args.draftRevision),[0,1]);
  assert.deepEqual(edits[1].args.operation,{kind:'slotUpdate',trackId:'track-1',slotId:'clip-track-1',name:'Renamed slot',sourceOffset:{kind:'beats',value:0.25},loopEnabled:true});
  assert.deepEqual(view.model.document().tracks[0].slots[0],{...initial.document.tracks[0].slots[0],name:'Renamed slot',sourceOffset:{kind:'beats',value:0.25}});view.dispose();
});

for(const field of ['name','offset'])for(const boundary of ['rewire','delete'])test(`v4 queued slot ${field} refuses an earlier ${boundary}`,async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=backend(initial);let release;
  const view=mountAlive({...page,invoke:async(name,args)=>{
    if(name!=='alive_workspace_edit')return native.invoke(name,args);
    native.calls.push({name,args});if(!release)await new Promise(resolve=>{release=resolve;});
    native.snapshot.draft??=structuredClone(native.snapshot.document);const slot=native.snapshot.draft.tracks[0].slots[0];
    if(boundary==='delete')native.snapshot.draft.tracks[0].slots[0]=null;
    else{const source=structuredClone(native.snapshot.draft.sources[0]);source.id='new-independent-source';source.notes.forEach(n=>n.id+='-new');native.snapshot.draft.sources.push(source);slot.sourceId=source.id;}
    native.snapshot.draftRevision++;
    return{snapshot:structuredClone(native.snapshot),affected:{trackId:'track-1',slotId:slot.id,sourceId:slot.sourceId,noteId:null,placementId:null}};
  }});await settle();
  const input=page.find(field==='name'?'Clip name':'Slot source offset');
  await page.find(boundary==='rewire'?'Make source independent':'Delete clip').fire('click');input.value=field==='name'?'Stale name':'0.25';await input.fire('change');
  release();await settle();await settle();await settle();
  assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,1);assert.match(page.ids.get('notice').textContent,/slot or source changed/);view.dispose();
});

function timelineBackend(initial=workspaceState()){
  const native=backend(initial),history=[],future=[];
  const invoke=async(name,args)=>{
    if(name==='alive_history'){
      native.calls.push({name,args});const from=args.direction==='undo'?history:future,to=args.direction==='undo'?future:history;to.push(structuredClone(initial.draft??initial.document));initial.draft=from.pop();initial.draftRevision++;return structuredClone(initial);
    }
    if(name!=='alive_workspace_edit')return native.invoke(name,args);
    native.calls.push({name,args});const op=args.operation,document=structuredClone(initial.draft??initial.document),affected={trackId:op.trackId??null,sourceId:op.sourceId??null,slotId:null,placementId:null,noteId:null};
    if(op.kind==='sourceCreateMidi'){affected.sourceId=`source-created-${initial.draftRevision}`;document.sources.push({id:affected.sourceId,kind:'midi',trackId:op.trackId,name:op.name,lengthBeats:op.lengthBeats,notes:[],automation:[]});}
    else if(op.kind==='placementCreate'){if(document.placements.some(p=>p.trackId===op.trackId&&op.start<p.start+p.duration&&op.start+op.duration>p.start))throw Error('Placement overlap');affected.placementId=`placement-created-${initial.draftRevision}`;const {kind,...p}=op;document.placements.push({id:affected.placementId,...p});}
    else if(op.kind==='placementUpdate'){const p=document.placements.find(p=>p.id===op.placementId);affected.trackId=p.trackId;affected.sourceId=p.sourceId;affected.placementId=p.id;Object.assign(p,{start:op.start,duration:op.duration,sourceOffset:op.sourceOffset,loopEnabled:op.loopEnabled});}
    else if(op.kind==='noteCreate'){const s=document.sources.find(s=>s.id===op.sourceId),{kind,sourceId,...note}=op;affected.trackId=s.trackId;affected.noteId=`note-created-${initial.draftRevision}`;s.notes.push({id:affected.noteId,...note});}
    else if(op.kind==='placementDuplicate'){const p=document.placements.find(p=>p.id===op.placementId);affected.trackId=p.trackId;affected.sourceId=p.sourceId;affected.placementId=`placement-copy-${initial.draftRevision}`;document.placements.push({...structuredClone(p),id:affected.placementId,start:op.start});}
    else if(op.kind==='placementDelete'){const p=document.placements.find(p=>p.id===op.placementId);affected.trackId=p.trackId;affected.sourceId=p.sourceId;affected.placementId=p.id;document.placements=document.placements.filter(p=>p.id!==op.placementId);}
    else if(op.kind==='sourceIndependent'){const p=document.placements.find(p=>p.id===op.occurrence.placementId),source=structuredClone(document.sources.find(s=>s.id===p.sourceId));source.id=`independent-${initial.draftRevision}`;source.notes.forEach(n=>n.id+='-copy');document.sources.push(source);p.sourceId=source.id;Object.assign(affected,{trackId:p.trackId,sourceId:source.id,placementId:p.id});}
    else if(op.kind==='noteUpdate'){const source=document.sources.find(s=>s.id===op.sourceId),note=source.notes.find(n=>n.id===op.noteId);Object.assign(note,{beat:op.beat,duration:op.duration,pitch:op.pitch,velocity:op.velocity});affected.trackId=source.trackId;affected.noteId=note.id;}
    else if(op.kind==='sourceRename'){const source=document.sources.find(s=>s.id===op.sourceId);source.name=op.name;affected.trackId=source.trackId;}
    else if(op.kind==='sourceLength'){const source=document.sources.find(s=>s.id===op.sourceId);source.lengthBeats=op.lengthBeats;affected.trackId=source.trackId;}
    else if(op.kind==='slotAssign'){const t=document.tracks.find(t=>t.id===op.trackId);affected.slotId=`assigned-${initial.draftRevision}`;t.slots[op.slot]={id:affected.slotId,name:op.name,sourceId:op.sourceId,sourceOffset:op.sourceOffset,loopEnabled:op.loopEnabled};}
    else if(op.kind==='transportRange'){const {kind,...values}=op;Object.assign(document,values);}
    else throw Error(`Unsupported test operation ${op.kind}`);
    history.push(structuredClone(initial.draft??initial.document));future.length=0;initial.draft=document;initial.draftRevision++;initial.history={canUndo:true,canRedo:false};return{snapshot:structuredClone(initial),affected};
  };return{...native,invoke};
}
for(const field of ['MIDI source length','Arrangement source name','Add note'])test(`queued ${field} refuses a source rewired by independence`,async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=timelineBackend(initial);let release,held=true;
  const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_workspace_edit'&&held){held=false;await new Promise(resolve=>release=resolve);}return native.invoke(name,args);}});await settle();
  await page.find('Select placement placement-0').fire('click');const input=page.find(field),originalId=initial.document.sources[0].id;
  await page.find('Make placement independent').fire('click');if(field==='Add note')await input.fire('click');else{input.value=field.includes('length')?'16':'Changed';await input.fire('change');}await page.find('Select Harmony slot 1').fire('click');release();await settle();await settle();
  const document=view.model.document(),independentId=document.placements[0].sourceId;
  assert.notEqual(independentId,originalId);assert.equal(document.sources.find(s=>s.id===originalId).lengthBeats,8);assert.equal(document.sources.find(s=>s.id===originalId).name,initial.document.sources[0].name);
  assert.equal(document.sources.find(s=>s.id===originalId).notes.length,initial.document.sources[0].notes.length);
  assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,1);assert.match(page.ids.get('notice').textContent,/source.*changed/i);view.dispose();
});
test('queued base edit retains its generation across Open with a reused instance',async()=>{
  const page=dom('./alive.html'),native=backend(state()),boundary=delayedBoundary(native,'alive_file',snapshot=>{snapshot.generation++;snapshot.draftRevision++;}),view=mountAlive({...page,invoke:boundary.invoke});await settle();
  await page.ids.get('open').fire('click');const input=page.find('Cutoff base');input.value='3200';await input.fire('change');boundary.release();await settle();await settle();
  assert.equal(native.snapshot.document.tracks[0].device.parameters.cutoff,2400);const call=native.calls.find(c=>c.name==='alive_base');assert.ok(!call||call.args.generation===1);view.dispose();
});
test('loop-only edit updates the Arrangement brace disabled state',async()=>{
  const page=dom('./alive.html'),native=timelineBackend(),view=mountAlive({...page,invoke:native.invoke});await settle();
  const loop=page.ids.get('loop');loop.checked=false;await loop.fire('change');
  assert.equal(page.find('Song loop brace').classList.contains('disabled'),!view.model.document().loopEnabled);view.dispose();
});
test('duplicate refuses an out-of-song destination without changing placements',async()=>{
  const page=dom('./alive.html'),native=timelineBackend(),view=mountAlive({...page,invoke:native.invoke});await settle();await page.find('Select placement placement-0').fire('click');
  await page.find('Duplicate placement').fire('click');assert.equal(view.model.document().placements.length,2);assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,0);assert.match(page.ids.get('notice').textContent,/fit inside the song/i);view.dispose();
});
test('Arrangement creates an accessible unplaced source then a separate placement and source note',async()=>{
  const initial=workspaceState();initial.document.placements=[];const page=dom('./alive.html'),native=timelineBackend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  await page.find('Create MIDI source').fire('click');assert.equal(view.model.document().sources.length,3);assert.equal(view.model.document().placements.length,0);
  assert.equal(page.find('MIDI source').value,'source-created-0');await page.find('Add note').fire('click');assert.equal(view.model.document().sources.at(-1).notes.length,1);
  await page.find('Place source in range').fire('click');assert.equal(view.model.document().placements.length,1);assert.equal(view.model.document().placements[0].sourceId,'source-created-0');
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_workspace_edit').map(c=>c.args.operation.kind),['sourceCreateMidi','noteCreate','placementCreate']);
  await page.ids.get('undo').fire('click');assert.equal(view.model.document().placements.length,0);assert.equal(view.model.document().sources.at(-1).notes.length,1);view.dispose();
});
test('refused Arrangement placement keeps the created source selected and discoverable',async()=>{
  const page=dom('./alive.html'),native=timelineBackend(),view=mountAlive({...page,invoke:native.invoke});await settle();await page.find('Create MIDI source').fire('click');await page.find('Place source in range').fire('click');
  assert.equal(view.model.document().sources.length,3);assert.equal(page.find('MIDI source').value,'source-created-0');assert.match(page.ids.get('notice').textContent,/overlap/i);view.dispose();
});

for(const first of ['start','offset'])test(`queued placement ${first} resolves unchanged sibling fields at execution`,async()=>{
  const initial=workspaceState();initial.document.lengthBeats=16;initial.document.placements[0].duration=4;
  const page=dom('./alive.html'),native=timelineBackend(initial);let release,held=true;
  const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_workspace_edit'&&held){held=false;await new Promise(resolve=>release=resolve);}return native.invoke(name,args);}});await settle();
  await page.find('Select placement placement-0').fire('click');
  const a=page.find(first==='start'?'Placement start':'Placement source offset'),b=page.find(first==='start'?'Placement source offset':'Placement start');a.value=first==='start'?'2':'.5';await a.fire('change');b.value=first==='start'?'.5':'2';await b.fire('change');release();await settle();await settle();
  const operations=native.calls.filter(c=>c.name==='alive_workspace_edit');assert.equal(operations.length,2);assert.equal(operations[1].args.draftRevision,1);const p=view.model.document().placements[0];assert.equal(p.start,2);assert.equal(p.sourceOffset.value,.5);view.dispose();
});
for(const boundary of ['delete','independent'])test(`queued placement offset refuses earlier ${boundary} without retargeting`,async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=timelineBackend(initial);let release,held=true;
  const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_workspace_edit'&&held){held=false;await new Promise(resolve=>release=resolve);}return native.invoke(name,args);}});await settle();await page.find('Select placement placement-0').fire('click');const offset=page.find('Placement source offset');
  await page.find(boundary==='delete'?'Delete placement':'Make placement independent').fire('click');offset.value='.5';await offset.fire('change');release();await settle();await settle();
  assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,1);assert.match(page.ids.get('notice').textContent,/placement or source changed/);view.dispose();
});
test('placement sharing, independent copy and occurrence history preserve Session source membership',async()=>{
  const initial=workspaceState();initial.document.lengthBeats=16;const page=dom('./alive.html'),native=timelineBackend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  await page.find('Select placement placement-0').fire('click');await page.find('Duplicate placement').fire('click');const copy=view.model.document().placements.at(-1);assert.equal(copy.sourceId,'source-independent-0');
  const note=page.find('Note 1 velocity');note.value='71';await note.fire('change');assert.equal(view.model.document().sources[0].notes[0].velocity,71);
  await page.find('Make placement independent').fire('click');const independent=view.model.document().placements.at(-1);assert.equal(independent.id,copy.id);assert.notEqual(independent.sourceId,copy.sourceId);assert.equal(view.model.document().tracks[0].slots[0].sourceId,copy.sourceId);
  await page.find('Delete placement').fire('click');assert.equal(view.model.document().placements.length,2);await page.ids.get('undo').fire('click');assert.equal(view.model.document().placements.at(-1).id,copy.id);await page.ids.get('redo').fire('click');assert.equal(view.model.document().placements.length,2);view.dispose();
});
test('late placement creation cannot steal a newer track/source selection',async()=>{
  const initial=workspaceState();initial.document.placements=[];const page=dom('./alive.html'),native=timelineBackend(initial);let release;
  const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_workspace_edit')await new Promise(resolve=>release=resolve);return native.invoke(name,args);}});await settle();
  await page.find('Place source in range').fire('click');await page.find('Select Harmony slot 1').fire('click');release();await settle();await settle();assert.match(page.ids.get('clip-title').textContent,/Harmony/);assert.equal(page.find('MIDI source').value,'source-independent-1');view.dispose();
});
test('Arrangement observes mixed/silent authority and Return members without optimistic updates',async()=>{
  const initial=workspaceState();initial.runtime.tracks[0].authority='session';initial.runtime.tracks[0].activeSourceId=null;initial.runtime.tracks[0].phase=null;initial.runtime.tracks[1].activeSourceId=null;initial.runtime.tracks[1].phase=null;
  initial.runtime.tracks[0].pendingAction='return';initial.runtime.requests=[{kind:'return',requestSerial:'9007199254740999',status:'pending',appliedMask:0,pendingMask:1,supersededMask:2,rejectedMask:0,members:[{trackId:'track-1',status:'pending'},{trackId:'track-2',status:'superseded'}]}];
  const page=dom('./alive.html'),native=timelineBackend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();assert.match(page.find('Pulse Arrangement authority').textContent,/Session silence.*pending return/);assert.match(page.find('Harmony Arrangement authority').textContent,/Arrangement gap/);assert.match(page.ids.get('return-receipts').textContent,/Pulse: pending.*Harmony: superseded/);assert.match(page.ids.get('workspace-authority').textContent,/1 Session override.*1 pending/);view.dispose();
});
test('v4 pending Return and selected placement/source/device survive repeated view navigation',async()=>{
  const initial=workspaceState();initial.runtime.tracks[0].authority='session';initial.runtime.tracks[0].pendingAction='return';initial.runtime.tracks[0].pendingAuthority='arrangement';initial.runtime.tracks[0].pendingFrame='9007199254741000';
  const page=dom('./alive.html'),native=timelineBackend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();await page.find('Select placement placement-0').fire('click');const source=page.find('MIDI source').value,before=structuredClone(view.model.snapshot()),count=native.calls.length;
  for(let i=0;i<3;i++){await page.ids.get('view-arrangement').fire('click');await page.ids.get('view-session').fire('click');}
  assert.deepEqual(view.model.snapshot(),before);assert.equal(native.calls.length,count);assert.equal(page.find('MIDI source').value,source);assert.equal(page.find('Placement start').value,'0');assert.match(page.find('Pulse Arrangement authority').textContent,/pending return/);view.dispose();
});
test('Arrangement gain uses shared mixer state and retains queued track identity',async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=timelineBackend(initial);let release;
  const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_mixer')await new Promise(resolve=>release=resolve);return native.invoke(name,args);}});await settle();
  await page.ids.get('view-arrangement').fire('click');const gain=page.find('Pulse Arrangement gain');assert.ok(gain);gain.value='.713';await gain.fire('change');
  await page.find('Select Harmony Arrangement track').fire('click');release();await settle();await settle();
  assert.equal(view.model.document().tracks[0].gain,.713);assert.equal(Number(page.find('Pulse gain').value),.713);assert.equal(page.ids.get('arrangement-workspace').hidden,false);
  assert.equal(native.calls.filter(c=>c.name==='alive_mixer').length,1);assert.equal(native.calls.find(c=>c.name==='alive_mixer').args.track,0);assert.ok(page.find('Harmony Arrangement gain'));view.dispose();
});

test('Master controls use one native owner and display separate interval channels',async()=>{
  const initial=clipState();initial.master={gain:1,acceptedSerial:'3',available:true,unavailableReason:null,observationStale:false,observation:{targetGain:1,currentGain:1,peakLeft:.2,peakRight:.8,clipMask:2,appliedSerial:'3',appliedFrame:'64',observationStartFrame:'0',observationEndFrame:'64'}};
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.ok(page.find('Master gain fader'));assert.ok(page.find('Master left peak'));assert.ok(page.find('Master right peak'));
  assert.match(page.find('Master right peak').textContent,/0\.800/);view.dispose();
});

for(const [label,commandName] of [
  ['Bypass Pulse Stereo Utility effect 1','alive_bypass'],
  ['Move Pulse Stereo Utility effect 1 later','alive_device'],
  ['Remove Pulse track','alive_device'],
  ['Replace Pulse device','alive_device'],
  ['Open Pulse editor','alive_editor'],
  ['Edit selected device in Ultra','alive_editor'],
])for(const succeeds of [true,false])test(`queued ${label} ${succeeds?'cannot affect replacement':'survives failed Open'} with reused IDs`,async()=>{
  const initial=withChain();initial.state.playing=commandName==='alive_bypass'?1:0;
  const page=dom('./alive.html'),native=backend(initial);
  const boundary=delayedBoundary(native,'alive_file',snapshot=>{if(succeeds){snapshot.generation++;snapshot.draftRevision++;snapshot.document.title='Replacement';}},succeeds?'snapshot':'error');
  const invoke=async(name,args)=>{
    if(name===commandName){
      if(args.generation!==native.snapshot.generation){native.calls.push({name,args:structuredClone(args)});throw Error('Stale generation');}
      if(name==='alive_device'){native.calls.push({name,args:structuredClone(args)});native.snapshot.document.title='Device mutation';return structuredClone(native.snapshot);}
    }
    return boundary.invoke(name,args);
  };
  const view=mountAlive({...page,invoke});await settle();
  await page.ids.get('open').fire('click');await page.find(label).fire('click');boundary.release();await settle();await settle();
  const calls=native.calls.filter(c=>c.name===commandName);
  if(succeeds){assert.equal(native.snapshot.document.title,'Replacement');assert.equal(native.snapshot.document.tracks[0].effects[0].bypassed,false);assert.ok(calls.length===0||calls.every(c=>c.args.generation===1));}
  else{assert.equal(calls.length,1);assert.equal(calls[0].args.generation,1);if(commandName==='alive_bypass'){assert.deepEqual(calls[0].args,{instanceId:'effect-0',bypassed:true,generation:1});assert.equal(native.snapshot.document.tracks[0].effects[0].bypassed,true);assert.equal(native.snapshot.state.playing,1);}if(commandName==='alive_device'){assert.equal(calls[0].args.trackId,'track-1');assert.equal(native.snapshot.document.title,'Device mutation');}if(commandName==='alive_editor')assert.equal(calls[0].args.instanceId,initial.document.tracks[0].device.instanceId);}
  view.dispose();
});

test('launch selectors save fenced settings and preserve captured native target',async()=>{
  const initial=clipState();initial.capabilities={...initial.capabilities,launchQuantization:true,launchWindowFrames:1024};
  initial.launch={globalQuantization:'bar1',clipQuantization:[]};
  const clipId=initial.document.tracks[0].slots[0].id;
  initial.runtime.requests=[{preparationRevision:'1',requestSerial:'9',status:'pending',trackId:initial.document.tracks[0].id,clipId,quantization:'sixteenth',targetFrame:'6000',reason:0}];
  initial.runtime.tracks[0].pendingSerial='9';initial.runtime.tracks[0].pendingFrame='6000';
  const page=dom('./alive.html'),native=backend(initial);
  const invoke=async(name,args)=>{if(name!=='alive_launch_settings')return native.invoke(name,args);native.calls.push({name,args});
    assert.equal(args.preparationRevision,'1');assert.equal(args.draftRevision,native.snapshot.draftRevision);
    if(args.edit.kind==='global')native.snapshot.launch.globalQuantization=args.edit.quantization;
    else native.snapshot.launch.clipQuantization=[{occurrenceId:args.edit.occurrenceId,quantization:args.edit.quantization}];
    native.snapshot.draftRevision++;native.snapshot.snapshotSequence=String(Number(native.snapshot.snapshotSequence)+1);return structuredClone(native.snapshot);};
  const view=mountAlive({...page,invoke});await settle();
  assert.ok(page.ids.get('launch-quantization'),'global selector exists');
  const global=page.ids.get('launch-quantization'),clip=page.ids.get('clip-quantization');
  assert.equal(global.value,'bar1');assert.equal(global.children.length,10);assert.equal(clip.value,'global');
  global.value='eighth';await global.fire('change');assert.equal(native.snapshot.launch.globalQuantization,'eighth');
  clip.value='none';await clip.fire('change');assert.equal(native.snapshot.launch.clipQuantization[0].occurrenceId,clipId);
  assert.match(page.ids.get('clip-launch-status').textContent,/1\/16.*6000/);
  assert.equal(native.calls.filter(c=>['alive_transport','alive_clip_action','alive_workspace_action'].includes(c.name)).length,0);
  await page.find('Select Pulse slot 2').fire('click');assert.equal(page.ids.get('clip-launch-settings').hidden,true);view.dispose();
});

test('launch controls preserve saved intent and explain unavailable native capability',async()=>{
  const initial=clipState();initial.launch={globalQuantization:'bar4',clipQuantization:[{occurrenceId:initial.document.tracks[0].slots[0].id,quantization:'sixteenth'}]};
  initial.capabilities={...initial.capabilities,launchQuantization:false,launchUnavailableReason:'This preparation exceeds quantized launch work limits',launchWindowFrames:1024};
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:async(name,args)=>{
    if(name!=='alive_launch_settings')return native.invoke(name,args);
    native.calls.push({name,args});if(args.edit.kind==='global')native.snapshot.launch.globalQuantization=args.edit.quantization;
    else native.snapshot.launch.clipQuantization=[];
    native.snapshot.draftRevision++;native.snapshot.snapshotSequence=String(Number(native.snapshot.snapshotSequence)+1);return structuredClone(native.snapshot);
  }});await settle();
  assert.ok(page.ids.get('launch-quantization'));assert.equal(page.ids.get('launch-quantization').value,'bar4');
  const global=page.ids.get('launch-quantization'),clip=page.ids.get('clip-quantization');
  assert.equal(global.disabled,false);assert.match(global.title,/exceeds.*work limits/i);
  assert.equal(global.children.find(o=>o.value==='sixteenth').disabled,true);assert.equal(global.children.find(o=>o.value==='bar1').disabled,false);
  assert.equal(clip.children.find(o=>o.value==='global').disabled,true);
  assert.match(page.ids.get('launch-help').textContent,/1024.*21\.3.*Start\/Seek/);
  global.value='bar1';await global.fire('change');assert.equal(clip.value,'sixteenth');assert.equal(clip.children.find(o=>o.value==='global').disabled,false);
  clip.value='global';await clip.fire('change');assert.match(page.ids.get('clip-launch-status').textContent,/Effective: 1 Bar/);
  assert.equal(native.calls.filter(c=>c.name==='alive_launch_settings').length,2);view.dispose();
});

test('focused launch selector restores accepted intent after refusal and generation change',async()=>{
  const initial=clipState();initial.capabilities={...initial.capabilities,launchQuantization:true};initial.launch={globalQuantization:'bar1',clipQuantization:[]};
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_launch_settings')throw Error('Prepared launch scope changed');return native.invoke(name,args);}});await settle();
  const select=page.ids.get('launch-quantization');select.focus();select.value='eighth';await select.fire('change');assert.equal(select.value,'bar1');
  native.snapshot.generation++;native.snapshot.snapshotSequence='2';native.snapshot.launch.globalQuantization='bar4';await view.refresh();assert.equal(select.value,'bar4');view.dispose();
});
