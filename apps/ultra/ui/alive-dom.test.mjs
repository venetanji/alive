import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountAlive} from './alive.mjs';
import {mountHostedEditor} from './alive-editor.mjs';
import {mountBrowser} from './alive-browser.mjs';
import {projectFixturePresentation} from '../tests/presentation-dom.mjs';
import {mountDeviceDrop} from './alive-device-drop.mjs';

// Real view modules with a small DOM adapter; native execution and geometry are separate checks.
class Element{
  constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.listeners={};this.dataset={};this.value='';this.textContent='';this.style={setProperty(key,value){this[key]=value;},removeProperty(key){delete this[key];}};this.clientWidth=1000;this.clientHeight=500;this.className='';
    this.classList={contains:name=>this.className.split(' ').includes(name),add:name=>{if(!this.classList.contains(name))this.className+=' '+name;},remove:name=>{this.className=this.className.split(' ').filter(n=>n!==name).join(' ');},toggle:(name,on)=>{if(on??!this.classList.contains(name))this.classList.add(name);else this.classList.remove(name);}};
  }
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  insertBefore(child,before){child.parentElement=this;const at=this.children.indexOf(before);this.children.splice(at<0?this.children.length:at,0,child);}
  replaceChildren(...children){this.children=[];this.append(...children);}
  setAttribute(key,value){this.attrs[key]=String(value);if(key==='class')this.className=String(value);}
  getAttribute(key){return this.attrs[key]??null;}
  setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}
  removeAttribute(key){delete this.attrs[key];}
  addEventListener(key,fn){(this.listeners[key]??=[]).push(fn);}
  removeEventListener(){}
  querySelectorAll(selector){return descendants(this).filter(e=>e.matches(selector));}
  checkValidity(){return true;}
  dispatchEvent(event){for(const fn of this.listeners[event.type]??[])fn(event);}
  matches(selector){return selector.split(',').some(s=>s.trim().startsWith('[')?this.attrs[s.trim().slice(1,-1)]!==undefined:s.trim().startsWith('.')?this.classList.contains(s.trim().slice(1)):s.trim().startsWith('#')?this.id===s.trim().slice(1):this.tagName===s.trim().toUpperCase());}
  querySelector(selector){return descendants(this).find(e=>e.matches(selector))??null;}
  closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector);}
  getBoundingClientRect(){return{left:0,top:0,width:100,height:30};}
  focus(){this.doc.activeElement=this;}blur(){if(this.doc.activeElement===this)this.doc.activeElement=null;}
  async fire(type,extra={}){if(type==='change'&&this.tagName==='INPUT')for(const fn of this.listeners.input??[])fn({type:'input',target:this});const event={target:this,button:0,preventDefault(){},stopPropagation(){},...extra};for(const fn of this.listeners[type]??[])await fn(event);await settle();}
}
const descendants=element=>element.children.flatMap(child=>[child,...descendants(child)]);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const catalogEntry=(overrides={})=>({id:'bundled:fresh',provider:'bundled',name:'Fresh Synth',kind:'instrument',path:'/devices/fresh.ultra',profile:null,qualification:'qualified',availability:'ready',reason:null,description:'Bundled Ultra device',dependencies:[],...overrides});
const catalogPage=(entries=[],overrides={})=>({revision:'1',entries,nextCursor:null,notices:[],...overrides});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function browserHarness(onCatalog){
  const page=dom('./alive.html'),root=page.ids.get('browser-library'),loads=[],sources=[],drags=[];
  const browser=mountBrowser({doc:page.doc,root,onCatalog,onLoad:entry=>loads.push(entry),onSource:entry=>sources.push(entry),onDeviceDrag:entry=>drags.push(entry)});
  const byClass=name=>descendants(root).find(e=>e.classList.contains(name));
  const row=id=>descendants(root).find(e=>e.attrs['data-entry']===id);
  return{...page,root,browser,loads,sources,drags,byClass,row};
}
test('catalog loads and searches additional pages without losing loaded results',async()=>{
  const continuation=deferred(),requests=[];
  const page=browserHarness(request=>{requests.push(request);return requests.length===1?Promise.resolve(catalogPage([catalogEntry()],{nextCursor:{revision:'1',offset:64},notices:['User library reached its depth bound']})):continuation.promise;});
  await settle();assert.ok(page.row('bundled:fresh'));assert.deepEqual(requests,[{refresh:false,cursor:null},{refresh:false,cursor:{revision:'1',offset:64}}]);
  page.byClass('browser-search').value='chord';await page.byClass('browser-search').fire('input');
  continuation.resolve(catalogPage([catalogEntry({id:'live:chord',name:'Chord',kind:'midiEffect',path:null,qualification:'unsupported',availability:'unavailable',reason:'MIDI processing is unavailable'})]));await settle();
  assert.ok(page.row('live:chord'));assert.match(page.byClass('browser-status').textContent,/depth bound/);
  await page.find('Browse MIDI Effects').fire('click');assert.ok(page.row('live:chord'));page.browser.dispose();
});
for(const overrides of [{path:null,qualification:'candidate',availability:'unavailable'},{qualification:'unsupported'},{availability:'unavailable'},{path:' '},{kind:'midiEffect'}])test(`unavailable ${JSON.stringify(overrides)} blocks button keyboard double-click and drag activation`,async()=>{
  const entry=catalogEntry({id:'live:analog',name:'Analog',reason:'Save a qualified Analog device first',...overrides});
  const page=browserHarness(()=>Promise.resolve(catalogPage([entry])));await settle();const row=page.row('live:analog');assert.ok(row);
  await row.fire('click');assert.match(page.byClass('browser-description').textContent,/Save a qualified Analog/);assert.equal(page.byClass('browser-load').disabled,true);assert.equal(row.draggable,false);
  await page.byClass('browser-load').fire('click');await page.byClass('browser-list').fire('keydown',{key:'Enter'});await row.fire('dblclick');let prevented=false;await row.fire('dragstart',{preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(page.loads.length,0);assert.equal(page.drags.length,0);page.browser.dispose();
});
test('refresh owns responses preserves stable selection and ignores stale failures and pages',async()=>{
  const requests=[],pending=[];const page=browserHarness(request=>{requests.push(request);const gate=deferred();pending.push(gate);return gate.promise;});
  pending[0].resolve(catalogPage([catalogEntry()],{nextCursor:{revision:'1',offset:64}}));await settle();await page.row('bundled:fresh').fire('click');
  const refresh=page.find('Refresh Library');assert.ok(refresh);await refresh.fire('click');assert.deepEqual(requests[2],{refresh:true,cursor:null});
  assert.equal(page.row('bundled:fresh').attrs['aria-selected'],'true');
  pending[2].resolve(catalogPage([catalogEntry({id:'other',name:'Other Synth'})],{revision:'2',nextCursor:{revision:'2',offset:64}}));await settle();assert.equal(page.row('bundled:fresh').attrs['aria-selected'],'true');
  pending[1].resolve(catalogPage([catalogEntry({id:'obsolete',name:'Obsolete'})]));await settle();assert.equal(page.row('obsolete'),undefined);
  pending[3].resolve(catalogPage([catalogEntry({name:'Renamed Synth'})],{revision:'2'}));await settle();assert.equal(page.row('bundled:fresh').attrs['aria-selected'],'true');
  await page.byClass('browser-list').fire('keydown',{key:'Enter'});assert.equal(page.loads[0].name,'Renamed Synth');
  await refresh.fire('click');await refresh.fire('click');pending[4].reject(Error('Stale discovery failure'));pending[5].resolve(catalogPage([catalogEntry()],{revision:'3'}));await settle();assert.doesNotMatch(page.byClass('browser-status').textContent,/Stale discovery failure/);
  await refresh.fire('click');const before=page.byClass('browser-status').textContent;page.browser.dispose();pending[6].resolve(catalogPage([catalogEntry({id:'disposed'})],{revision:'4',nextCursor:{revision:'4',offset:64}}));await settle();
  assert.equal(page.row('disposed'),undefined);assert.equal(requests.length,7);assert.equal(page.byClass('browser-status').textContent,before);
});
test('failed catalog discovery can retry and retains useful project entries',async()=>{
  let attempts=0;const page=browserHarness(()=>++attempts===1?Promise.reject(Error('Unreadable root')):Promise.resolve(catalogPage([catalogEntry()])));
  page.browser.render({document:workspaceState().document,instances:workspaceState().deviceInstances});await settle();assert.match(page.byClass('browser-status').textContent,/Unreadable root/);assert.ok(descendants(page.root).some(e=>e.draggable));
  await page.find('Refresh Library').fire('click');assert.ok(page.row('bundled:fresh'));assert.doesNotMatch(page.byClass('browser-status').textContent,/Unreadable root/);page.browser.dispose();
});
test('failed continuation retains loaded metadata and retries a fresh index with the selected ID',async()=>{
  const requests=[];const page=browserHarness(request=>{
    requests.push(request);
    if(request.cursor)return Promise.reject(Error('Index expired'));
    return Promise.resolve(catalogPage([catalogEntry()],requests.length===1?{nextCursor:{revision:'1',offset:64},notices:['A device could not be read']}:{revision:'2'}));
  });
  await settle();assert.ok(page.row('bundled:fresh'));await page.row('bundled:fresh').fire('click');assert.match(page.byClass('browser-status').textContent,/Index expired/);assert.match(page.byClass('browser-status').textContent,/could not be read/);
  await page.find('Refresh Library').fire('click');assert.deepEqual(requests[2],{refresh:true,cursor:null});assert.equal(page.row('bundled:fresh').attrs['aria-selected'],'true');assert.doesNotMatch(page.byClass('browser-status').textContent,/Index expired/);page.browser.dispose();
});
test('a catalog rejection after disposal cannot change the browser',async()=>{
  const pending=deferred(),page=browserHarness(()=>pending.promise),before=page.byClass('browser-status').textContent;
  page.browser.dispose();pending.reject(Error('Disposed discovery failure'));await settle();assert.equal(page.byClass('browser-status').textContent,before);
});
test('drop admission rejects candidate unavailable and empty-path entries before capturing a drag',async()=>{
  const page=dom('./alive.html'),loaded=[],errors=[],drop=mountDeviceDrop({doc:page.doc,win:page.win,scope:()=>({generation:1,editRevision:0}),track:()=>workspaceState().document.tracks[0],onDrop:entry=>loaded.push(entry),onError:error=>errors.push(error)});
  for(const entry of [catalogEntry({qualification:'candidate'}),catalogEntry({availability:'unavailable'}),catalogEntry({path:' '})]){
    let prevented=false;const dataTransfer=dragTransfer();drop.start(entry,{dataTransfer,preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.deepEqual(dataTransfer.values,{});
    await page.doc.fire('drop',{target:page.ids.get('tracks'),dataTransfer});
  }
  assert.equal(loaded.length,0);assert.equal(errors.length,3);drop.dispose();
});
test('queued browser loading rechecks admission before any native mutation',async()=>{
  const initial=workspaceState();initial.state.playing=0;
  const page=dom('./alive.html'),native=backend(initial),boundary=delayedBoundary(native,'alive_mixer',()=>{}),entry=catalogEntry();
  const view=mountAlive({...page,invoke:(name,args)=>name==='alive_browser_catalog'?Promise.resolve(catalogPage([entry])):boundary.invoke(name,args)});await settle();
  const gain=page.find('Pulse gain');gain.value='.713';await gain.fire('change');
  await page.find('Fresh Synth').fire('click');const list=descendants(page.ids.get('browser-library')).find(e=>e.className==='browser-list'),loading=list.fire('keydown',{key:'Enter'});
  entry.availability='unavailable';entry.reason='Saved device was removed';boundary.release();await loading;
  assert.equal(native.calls.some(c=>['alive_device','alive_workspace_track'].includes(c.name)),false);assert.match(descendants(page.ids.get('browser-library')).find(e=>e.classList.contains('browser-status')).textContent,/Saved device was removed/);view.dispose();
});
test('drop rechecks admission after an otherwise valid drag starts',async()=>{
  const page=dom('./alive.html'),root=page.ids.get('tracks'),target=page.doc.createElement('div'),entry=catalogEntry(),loaded=[],errors=[];target.className='track';target.dataset.trackId='track-1';root.append(target);
  const drop=mountDeviceDrop({doc:page.doc,win:page.win,scope:()=>({generation:1,editRevision:0,playing:false,pending:false,deviceCount:1,maxDevices:6}),track:()=>workspaceState().document.tracks[0],onDrop:entry=>loaded.push(entry),onError:error=>errors.push(error)});
  const dataTransfer=dragTransfer();drop.start(entry,{dataTransfer,preventDefault(){assert.fail('qualified entry must start dragging');}});entry.qualification='unsupported';entry.reason='Device qualification changed';
  await page.doc.fire('drop',{target,dataTransfer});assert.equal(loaded.length,0);assert.match(errors[0],/qualification changed/);drop.dispose();
});

test('plain Tab navigates workspaces while controls and modified Tab keep native focus navigation',async()=>{
  const page=dom('./alive.html'),native=backend(workspaceState()),view=mountAlive({...page,invoke:native.invoke});await settle();
  let prevented=0;const tab=extra=>page.doc.fire('keydown',{key:'Tab',preventDefault(){prevented++;},...extra});
  await tab({target:page.ids.get('session-workspace')});assert.equal(page.ids.get('arrangement-workspace').hidden,false);assert.equal(prevented,1);
  for(const tag of ['input','select','textarea','button','summary'])await tab({target:page.doc.createElement(tag)});
  const role=page.doc.createElement('div');role.setAttribute('role','slider');await tab({target:role});
  const editable=page.doc.createElement('span');editable.setAttribute('contenteditable','true');await tab({target:editable});
  for(const key of ['shiftKey','ctrlKey','altKey','metaKey'])await tab({target:page.ids.get('session-workspace'),[key]:true});
  assert.equal(prevented,1);assert.equal(page.ids.get('arrangement-workspace').hidden,false);
  await tab({target:page.ids.get('arrangement-workspace')});assert.equal(page.ids.get('session-workspace').hidden,false);view.dispose();
});
test('repeated view navigation preserves playing pending receipts, score, clip, instance and editor lifecycle',async()=>{
  const initial=workspaceState();initial.document.tracks[1].slots[0].name='Unsaved';
  initial.runtime.tracks[1].pendingAction='launch';initial.runtime.tracks[1].pendingClipId='clip-track-2';initial.runtime.tracks[1].pendingFrame='96000';
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  await page.find('Select Harmony slot 1').fire('click');await page.ids.get('edit-device').fire('click');
  const before=structuredClone(view.model.snapshot()),piano=page.ids.get('piano-roll'),parameter=page.find('Cutoff base');parameter.value='1717';
  const calls=native.calls.length;
  for(let i=0;i<4;i++){await page.ids.get('view-arrangement').fire('click');await page.ids.get('view-session').fire('click');}
  assert.deepEqual(view.model.snapshot(),before);assert.equal(native.calls.length,calls);assert.equal(page.ids.get('piano-roll'),piano);assert.equal(page.find('Cutoff base'),parameter);assert.equal(parameter.value,'1717');
  assert.equal(page.find('Select Harmony slot 1').attrs['aria-pressed'],'true');await page.ids.get('edit-device').fire('click');
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_editor').map(c=>c.args.instanceId),[initial.document.tracks[1].chain.instrument.instanceId,initial.document.tracks[1].chain.instrument.instanceId]);view.dispose();
});
test('browser and Clip Devices detail toggle locally without rebuilding active controls',async()=>{
  const page=dom('./alive.html'),native=backend(workspaceState()),view=mountAlive({...page,invoke:native.invoke});await settle();const calls=native.calls.length;
  const note=page.find('Note 1 pitch');note.value='73';
  await page.ids.get('toggle-browser').fire('click');assert.equal(page.ids.get('workspace-browser').hidden,true);
  await page.ids.get('detail-devices').fire('click');assert.equal(page.ids.get('device-detail').hidden,false);assert.equal(page.ids.get('clip-detail').hidden,false);
  await page.ids.get('toggle-detail').fire('click');assert.equal(page.ids.get('device-detail').hidden,true);assert.equal(page.ids.get('clip-detail').hidden,true);
  await page.ids.get('detail-clip').fire('click');assert.equal(page.ids.get('detail-content').hidden,false);assert.equal(page.ids.get('clip-detail').hidden,false);
  assert.equal(page.find('Note 1 pitch'),note);assert.equal(note.value,'73');assert.equal(native.calls.length,calls);view.dispose();
});
test('detail resize supports keyboard and cancels pointer preview with Escape',async()=>{
  const page=dom('./alive.html'),native=backend(workspaceState()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const handle=page.ids.get('detail-resizer'),shell=page.ids.get('workspace-shell');shell.clientHeight=700;
  await handle.fire('keydown',{key:'ArrowUp'});assert.equal(handle.attrs['aria-valuenow'],'240');
  await handle.fire('pointerdown',{pointerId:1,clientY:400});await handle.fire('pointermove',{pointerId:1,clientY:350});assert.equal(handle.attrs['aria-valuenow'],'290');
  await page.doc.fire('keydown',{key:'Escape',target:handle});assert.equal(handle.attrs['aria-valuenow'],'240');assert.equal(shell.style['--detail-height'],'240px');
  await handle.fire('pointerdown',{pointerId:2,clientY:400});await handle.fire('pointermove',{pointerId:2,clientY:450});await handle.fire('pointercancel');assert.equal(handle.attrs['aria-valuenow'],'240');view.dispose();
});
test('detail can grow beyond the upper mixer minimum and maximize without musical commands',async()=>{
  const page=dom('./alive.html');page.win.innerHeight=900;page.ids.get('workspace-shell').clientHeight=700;
  const native=backend(workspaceState()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const handle=page.ids.get('detail-resizer');await handle.fire('keydown',{key:'End'});
  assert.ok(Number(handle.attrs['aria-valuenow'])>=560,'The detail editor should be able to use most of the workspace');
  await handle.fire('keydown',{key:'ArrowDown'});const normal=handle.attrs['aria-valuenow'],snapshot=structuredClone(view.model.snapshot());
  const maximize=page.find('Maximize detail');assert.ok(maximize);await maximize.fire('click');
  assert.equal(page.ids.get('session-workspace').hidden,true);assert.equal(page.ids.get('arrangement-workspace').hidden,true);
  assert.equal(maximize.attrs['aria-label'],'Restore detail size');assert.equal(maximize.attrs['aria-pressed'],'true');
  assert.ok(Number(handle.attrs['aria-valuenow'])>Number(normal));
  await maximize.fire('click');assert.equal(handle.attrs['aria-valuenow'],normal);assert.equal(page.ids.get('session-workspace').hidden,false);
  assert.deepEqual(view.model.snapshot(),snapshot);assert.equal(native.calls.filter(c=>c.name!=='alive_current').length,0);view.dispose();
});
test('maximized detail restores after canceled resize and view navigation exposes the selected workspace',async()=>{
  const page=dom('./alive.html'),native=backend(workspaceState()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const handle=page.ids.get('detail-resizer');await handle.fire('dblclick');
  assert.equal(page.ids.get('session-workspace').hidden,true);const full=handle.attrs['aria-valuenow'];
  await handle.fire('pointerdown',{pointerId:1,clientY:100});await handle.fire('pointermove',{pointerId:1,clientY:230});
  await handle.fire('pointercancel');assert.equal(handle.attrs['aria-valuenow'],full);assert.equal(page.ids.get('session-workspace').hidden,true);
  await page.ids.get('view-arrangement').fire('click');assert.equal(page.ids.get('arrangement-workspace').hidden,false);
  assert.equal(page.find('Maximize detail').attrs['aria-pressed'],'false');view.dispose();
});
test('eight Session tracks expose four vertical slots and a mixer per column plus four scene rows',async()=>{
  const initial=workspaceState();initial.capabilities={maxTracks:8,maxDevices:16,atomicTrackActions:true};
  while(initial.document.tracks.length<8){const i=initial.document.tracks.length+1,t=structuredClone(initial.document.tracks[0]);t.id=`track-${i}`;t.name=`Track ${i}`;t.chain.instrument.instanceId=`instance-${i}`;t.slots[0].id=`clip-${i}`;initial.document.tracks.push(t);initial.deviceInstances[t.chain.instrument.instanceId]={...structuredClone(initial.deviceInstances[initial.document.tracks[0].chain.instrument.instanceId]),index:i-1,track:i-1};initial.state.tracks.push(structuredClone(initial.state.tracks[0]));initial.state.devices.push(structuredClone(initial.state.devices[0]));}
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.equal(page.ids.get('tracks').children.length,8);
  for(const column of page.ids.get('tracks').children){assert.equal(descendants(column).filter(e=>e.classList.contains('clip-slot')).length,4);assert.ok(descendants(column).find(e=>e.classList.contains('track-mixer')));}
  assert.equal(page.ids.get('scene-controls').children.length,4);assert.equal(page.ids.get('session-workspace').hidden,false);
  await page.ids.get('view-arrangement').fire('click');assert.equal(page.ids.get('arrangement-workspace').hidden,false);assert.equal(native.calls.filter(c=>c.name!=='alive_current').length,0);view.dispose();
});
test('gain fader commits once, synchronizes numeric and snapshots, and preserves unfinished numeric input',async()=>{
  const page=dom('./alive.html'),native=backend(workspaceState()),view=mountAlive({...page,invoke:native.invoke});await settle();
  const slider=page.find('Pulse gain fader'),number=page.find('Pulse gain');assert.ok(slider);assert.equal(slider.min,'0');assert.equal(slider.max,'2');
  slider.focus();slider.value='.7';await slider.fire('input');assert.equal(native.calls.filter(c=>c.name==='alive_mixer').length,0);
  await slider.fire('change');assert.equal(native.calls.filter(c=>c.name==='alive_mixer').length,1);assert.equal(Number(number.value),.7);
  number.focus();number.value='';native.snapshot.document.tracks[0].gain=.4;native.snapshot.snapshotSequence='2';await view.refresh();assert.equal(number.value,'');assert.equal(Number(slider.value),.4);
  number.value='.85';await number.fire('change');assert.equal(Number(slider.value),.85);number.blur();await view.refresh();assert.equal(native.calls.filter(c=>c.name==='alive_mixer').length,2);
  const meter=page.find('Pulse stereo peak');assert.equal(meter.children[0].style.height,'10%');assert.equal(meter.children[1].style.height,'20%');assert.equal(page.find('Pulse peak').textContent,'0.100 / 0.200');view.dispose();
});

function dom(file){
  const ids=new Map(),doc=new Element('document',null);doc.doc=doc;doc.activeElement=null;doc.createElement=tag=>new Element(tag,doc);doc.createElementNS=(_,tag)=>new Element(tag,doc);doc.createTextNode=text=>{const e=new Element('text',doc);e.textContent=text;return e;};doc.getElementById=id=>ids.get(id);
  const html=readFileSync(new URL(file,import.meta.url),'utf8');
  for(const[markup,tag,id]of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const element=new Element(tag,doc);element.id=id;element.hidden=/\bhidden\b/.test(markup);const text=html.slice(html.indexOf(markup)+markup.length).match(/^[^<]+/);if(text)element.textContent=text[0];ids.set(id,element);}
  if(ids.has('piano-roll')){const area=doc.createElement('div');area.append(ids.get('piano-roll'));ids.set('piano-test-area',area);}
  if(ids.has('timeline')){const tools=doc.createElement('div');tools.className='timeline-tools';ids.get('timeline').append(tools);}
  if(ids.has('master-meter'))ids.get('master-meter').append(doc.createElement('i'),doc.createElement('i'));
  const timeouts=[],win={setTimeout:(fn,delay)=>timeouts.push({fn,delay}),addEventListener(){},removeEventListener(){}};
  return{doc,win,ids,timeouts,find:label=>[...ids.values()].flatMap(e=>[e,...descendants(e)]).find(e=>e.attrs['aria-label']===label)};
}
const dependencyError='Dependency journey-utility.ultra changed. Restore the matching original, then Replace intended instances.';
const snapshotError='Session state is temporarily unavailable';
async function pollAlive(page){
  const index=page.timeouts.findIndex(timer=>timer.delay===80);assert.notEqual(index,-1,'poll remains scheduled');
  const [{fn}]=page.timeouts.splice(index,1);await fn();await settle();
}
for(const failFinalRefresh of [true,false])test(`file refusal survives ${failFinalRefresh?'rejected final refresh':'later periodic refresh failure'} and recovery`,async()=>{
  const initial=workspaceState();initial.document.sources[1].notes[0].pitch=73;
  initial.editRevision=4;initial.history={canUndo:true,canRedo:false};
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
  failSnapshot=false;native.snapshot.snapshotSequence='2';native.snapshot.state.absoluteFrame='4096';
  native.snapshot.runtime.requests=[{preparationRevision:'1',requestSerial:'9',trackId:null,clipId:null,status:'applied',reason:0}];
  await pollAlive(page);
  assert.equal(status.textContent,`Error: ${dependencyError}`);assert.equal(status.classList.contains('error'),true);
  assert.equal(view.model.snapshot().state.absoluteFrame,'4096');assert.deepEqual(view.model.document(),initial.document);
  assert.equal(page.find('Select Harmony slot 1').attrs['aria-pressed'],'true');
  assert.equal(page.ids.get('note-velocity').disabled,false,'selected note survives rejected file and polls');
  assert.equal(page.find('Note 1 pitch'),pitch);assert.equal(pitch.value,'74');
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_file').map(c=>c.args),[{action:'open',generation:1,editRevision:4}]);
  assert.equal(native.calls.filter(c=>!['alive_file','alive_current'].includes(c.name)).length,0);view.dispose();
});

test('successful file keeps its result with failed refresh and clears only refresh health on recovery',async()=>{
  const page=dom('./alive.html'),native=backend(workspaceState());let failSnapshot=false;
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

test('ordinary periodic refresh retains ready status and a later explicit file action replaces an old refusal',async()=>{
  const page=dom('./alive.html'),native=backend(workspaceState());let refuse=true;
  const invoke=async(name,args)=>{const result=await native.invoke(name,args);if(name==='alive_file'&&refuse)throw Error(dependencyError);return result;};
  const view=mountAlive({...page,invoke});await settle();const status=page.ids.get('notice'),ready=status.textContent;
  native.snapshot.state.absoluteFrame='4096';await pollAlive(page);assert.equal(view.model.snapshot().state.absoluteFrame,'4096');assert.equal(status.textContent,ready);
  await page.ids.get('open').fire('click');assert.equal(status.textContent,`Error: ${dependencyError}`);
  refuse=false;await page.ids.get('save').fire('click');assert.equal(status.textContent,'Session saved.');assert.equal(status.classList.contains('error'),false);
  await pollAlive(page);assert.equal(status.textContent,'Session saved.');
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_file').map(c=>c.args.action),['open','save']);view.dispose();
});

for(const[action,field,key,value]of [['new','tempo','tempo','137'],['open','length','lengthBeats','16'],['open','loop','loopEnabled',false]]){
  test(`queued ${key} cannot cross successful ${action}`,async()=>{
    const page=dom('./alive.html'),native=backend(workspaceState()),boundary=delayedBoundary(native,'alive_file',snapshot=>{
      snapshot.document.title='Replacement session';snapshot.generation++;snapshot.editRevision++;
    }),view=mountAlive({...page,invoke:boundary.invoke});await settle();
    const original=native.snapshot.document[key];
    await page.ids.get(action).fire('click');const input=page.ids.get(field);if(field==='loop')input.checked=value;else input.value=value;await input.fire('change');
    boundary.release();await settle();
    assert.equal(view.model.document().title,'Replacement session');assert.equal(view.model.document()[key],original);
    assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,0);view.dispose();
  });
}

test('Alive audio settings preserve accepted edits and route configuration through the session owner',async()=>{
  const page=dom('./alive.html'),initial=workspaceState();initial.audio.running=true;initial.audio.config.buffer_frames=null;
  const native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  const pitch=page.find('Note 1 pitch');pitch.value='65';await pitch.fire('change');
  await page.ids.get('show-audio').fire('click');await settle();
  assert.equal(page.ids.get('alive-audio-settings').hidden,false);
  assert.equal(page.ids.get('audio-save').disabled,true);
  await page.ids.get('audio-stop-configured').fire('click');await settle();
  assert.equal(native.snapshot.state.playing,0);assert.equal(view.model.document().sources[0].notes[0].pitch,65);
  page.ids.get('audio-device').value='speakers';await page.ids.get('audio-device').fire('change');page.ids.get('audio-buffer').value='512';
  await page.ids.get('audio-save').fire('click');await settle();
  assert.deepEqual(native.calls.find(c=>c.name==='alive_audio_configure').args,{generation:1,config:{host:'default',device:'speakers',sample_rate:48000,buffer_frames:512}});
  assert.equal(native.snapshot.audio.running,false);
  await page.ids.get('audio-start-configured').fire('click');await settle();
  assert.equal(native.snapshot.audio.running,true);assert.equal(native.snapshot.state.playing,0);
  await page.ids.get('audio-settings-close').fire('click');assert.equal(page.ids.get('alive-audio-settings').hidden,true);
  assert.equal(page.doc.activeElement,page.ids.get('show-audio'));view.dispose();
});

test('automation base segments follow live controls without rebuilding unchanged poll frames',async()=>{
  const page=dom('./alive.html'),native=backend(workspaceState());
  native.snapshot.document.sources[0].automation.find(l=>l.key==='cutoff').points[0].beat=1;
  native.snapshot.document.sources[0].automation.find(l=>l.key==='level').points=[];
  const view=mountAlive({...page,invoke:native.invoke});await settle();
  const curve=key=>page.ids.get('lanes').children.find(e=>e.dataset.lane===key).querySelector('svg').children[0];
  const cutoffBefore=curve('cutoff'),levelBefore=curve('level');
  await view.refresh();assert.equal(curve('cutoff'),cutoffBefore);assert.equal(curve('level'),levelBefore);
  const cutoff=page.find('Cutoff base');cutoff.value='3500';await cutoff.fire('change');await settle();
  const binding=native.snapshot.deviceInstances[native.snapshot.document.tracks[0].chain.instrument.instanceId].manifest.parameters.find(p=>p.key==='cutoff'),baseY=36-(3500-binding.min)/(binding.max-binding.min)*31;
  assert.equal(curve('cutoff').attrs.d.split(' H ')[0],`M 0 ${baseY}`);
  assert.notEqual(curve('cutoff'),cutoffBefore);assert.equal(curve('cutoff').attrs.d.slice(curve('cutoff').attrs.d.indexOf(' H ')),cutoffBefore.attrs.d.slice(cutoffBefore.attrs.d.indexOf(' H ')));
  const level=page.find('Level base');level.value='80';await level.fire('change');await settle();
  assert.equal(curve('level').attrs.d,`M 0 ${36-80/127*31} H 600`);
  const cutoffAfter=curve('cutoff'),levelAfter=curve('level');await view.refresh();
  assert.equal(curve('cutoff'),cutoffAfter);assert.equal(curve('level'),levelAfter);
  view.dispose();
});

test('a rejected edit restores the authoritative score before a later save',async()=>{
  const page=dom('./alive.html'),native=backend(workspaceState()),calls=[];
  const invoke=async(name,args)=>{calls.push(name);if(name==='alive_workspace_edit')throw Error('Musical edit refused');return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();
  const pitch=page.find('Note 1 pitch');pitch.value='63';await pitch.fire('change');assert.match(page.ids.get('notice').textContent,/Musical edit refused/);await page.ids.get('save').fire('click');await settle();
  assert.equal(calls.includes('alive_file'),true);assert.equal(view.model.document().sources[0].notes[0].pitch,60);
  view.dispose();
});

test('hosted editor uses real patch objects and shared base command; close only releases UI',async()=>{
  const page=dom('./alive-editor.html'),native=backend(workspaceState(true)),closed=[];page.win.__TAURI__={window:{getCurrentWindow:()=>({close:async()=>closed.push('close')})}};
  const view=mountHostedEditor({...page,invoke:native.invoke});await view.ready;
  assert.equal(page.ids.get('objects').children.length,native.snapshot.patch.nodes.length);assert.equal(page.ids.get('cables').children.length,native.snapshot.patch.edges.length);
  const cutoff=page.find('Hosted Cutoff base');cutoff.value='3200';await cutoff.fire('change');await settle();
  assert.deepEqual(native.calls.find(c=>c.name==='alive_base').args,{instanceId:native.snapshot.document.tracks[0].chain.instrument.instanceId,key:'cutoff',value:3200,generation:1});
  assert.equal(page.find('Hosted Cutoff effective ownership').textContent,'Automation: 700 Hz');
  const level=page.find('Hosted Level graph base');assert.ok(level);level.value='61';await level.fire('input');await settle();
  assert.equal(native.calls.filter(c=>c.name==='alive_base').at(-1).args.key,'level');
  await page.ids.get('hosted-close').fire('click');await settle();assert.deepEqual(closed,['close']);assert.equal(native.calls.some(c=>/stop|reset|apply|install/.test(c.name)),false);
  view.dispose();
});

test('hosted zoom selection follows fitted and manually selected graph scale',async()=>{
  const page=dom('./alive-editor.html'),native=backend(workspaceState(true)),view=mountHostedEditor({...page,invoke:native.invoke});await view.ready;
  const zoom=page.ids.get('hosted-zoom'),canvas=page.ids.get('canvas'),actualScale=()=>Number(canvas.style.transform.match(/scale\(([^)]+)\)/)[1]);
  assert.equal(Number(zoom.value),actualScale());
  zoom.value='0.75';await zoom.fire('change');assert.equal(actualScale(),.75);
  await page.ids.get('hosted-fit').fire('click');assert.equal(Number(zoom.value),actualScale());
  assert.match(page.ids.get('hosted-summary').textContent,new RegExp(`${Math.round(actualScale()*100)}%$`));
  view.dispose();
});

test('an effect editor owns its own manifest patch state and instance command',async()=>{
  const initial=workspaceState(true),patch=JSON.parse(readFileSync(new URL('../examples/utility.ultra',import.meta.url),'utf8'));
  const instanceId='effect-editor-instance',manifest={...patch.device,presentation:projectFixturePresentation(patch),parameters:patch.device.parameters.map(p=>({...p,base:1,integral:false}))};
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
  const initial=workspaceState();
  for(const [index,file] of ['utility','stereo-lowpass'].entries()){
    const patch=JSON.parse(readFileSync(new URL(`../examples/${file}.ultra`,import.meta.url),'utf8'));
    const instanceId=`effect-${index}`,manifest={...patch.device,presentation:projectFixturePresentation(patch),parameters:patch.device.parameters.map(p=>({...p,base:p.key==='gain'?1:p.key==='resonance'?.7:2400,integral:false}))};
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
  const card=descendants(page.ids.get('chain')).find(e=>e.dataset.instanceId==='effect-1');
  const control=label=>descendants(card).find(e=>e.attrs['aria-label']===label);
  assert.equal(control('Cutoff effective ownership').textContent,'Automation: 0.5 Hz');
  assert.equal(native.calls.some(c=>c.name==='alive_editor'||c.name==='alive_transport'),false);
  const cutoff=control('Cutoff base');cutoff.value='1400';await cutoff.fire('change');
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
  const original=view.model.document().sources[0].automation.find(l=>l.instanceId===initial.document.tracks[0].chain.instrument.instanceId&&l.key==='cutoff');
  assert.ok(original.points.length);
  await page.find('Add Stereo Lowpass effect 2 / Cutoff point').fire('click');
  assert.deepEqual(view.model.document().sources[0].automation.find(l=>l.instanceId==='effect-1'&&l.key==='cutoff'),{instanceId:'effect-1',key:'cutoff',enabled:false,points:[{beat:0,value:2400}]});
  assert.equal(page.find('Move Pulse Stereo Utility effect 1 later').disabled,true);
  assert.match(page.ids.get('chain-status').textContent,/Stop transport/);
  view.dispose();
});

test('stopped reorder and editor commands retain instance identity and instrument removal names its track scope',async()=>{
  const initial=withChain();initial.state.playing=0;
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  await page.find('Move Pulse Stereo Utility effect 1 later').fire('click');
  assert.deepEqual(native.calls.find(c=>c.name==='alive_device').args,{trackId:'track-1',instanceId:'effect-0',action:'reorder',beforeInstanceId:null,generation:1,editRevision:0});
  await page.find('Select Pulse Stereo Lowpass effect 2').fire('click');await page.ids.get('edit-device').fire('click');
  assert.deepEqual(native.calls.find(c=>c.name==='alive_editor').args,{instanceId:'effect-1',generation:1});
  assert.ok(page.find('Remove Pulse track'));view.dispose();
});

test('selecting the current clip retains its separate device selection and rejected mutations preserve the chain',async()=>{
  const initial=withChain();initial.state.playing=0;
  const page=dom('./alive.html'),native=backend(initial),invoke=async(name,args)=>{if(name==='alive_device')throw Error('Changed source: use Replace to load utility.ultra');return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();
  await page.find('Select Pulse Stereo Utility effect 1').fire('click');await page.find('Select Pulse slot 1').fire('click');
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
  assert.equal(view.model.document().sources[0].automation.find(l=>l.key==='cutoff'&&l.instanceId===initial.document.tracks[0].chain.instrument.instanceId).points.at(-1).value,3456);
  view.dispose();
});

test('rejected audio configuration reaches the audio panel error handler',async()=>{
  const page=dom('./alive.html'),initial=workspaceState();initial.audio.running=false;initial.state.playing=0;
  const native=backend(initial),invoke=async(name,args)=>{if(name==='alive_audio_configure')throw Error('Output does not advertise this buffer');return native.invoke(name,args);};
  const view=mountAlive({...page,invoke});await settle();await page.ids.get('show-audio').fire('click');await page.ids.get('audio-save').fire('click');
  assert.match(page.ids.get('audio-settings-notice').textContent,/does not advertise/);view.dispose();
});

test('piano Preview is set-wide, initially off, and sends held keys to native with release',async()=>{
  const initial=workspaceState();initial.capabilities.midiPreview=true;initial.capabilities.midiEdit=true;
  const page=dom('./alive.html'),native=backend(initial),previewCalls=[];
  const area=page.doc.createElement('div');area.insertBefore=(child,before)=>{child.parentElement=area;const at=area.children.indexOf(before);area.children.splice(at<0?area.children.length:at,0,child);};area.append(page.ids.get('piano-roll'),page.ids.get('piano-help'));page.ids.set('test-piano-area',area);
  const invoke=async(name,args)=>{if(name==='alive_midi_preview'){previewCalls.push(args);return{serial:String(previewCalls.length)}}return native.invoke(name,args)};
  const view=mountAlive({...page,invoke});await settle();const toggle=page.find('MIDI note Preview');
  assert.equal(toggle.attrs['aria-pressed'],'false');assert.equal(toggle.disabled,false);
  await toggle.fire('click');assert.equal(toggle.attrs['aria-pressed'],'true');
  const piano=page.ids.get('piano-roll');piano.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});await piano.fire('wheel',{deltaX:0,deltaY:0,clientX:5,clientY:80});await piano.fire('pointerdown',{pointerId:70,clientX:5,clientY:80});await settle();
  assert.equal(previewCalls.length,1);assert.equal(previewCalls[0].action,'note');assert.equal(previewCalls[0].trackId,'track-1');
  await piano.fire('pointerup',{pointerId:70});await settle();assert.equal(previewCalls.at(-1).action,'release');
  await page.find('Select Harmony slot 1').fire('click');assert.equal(toggle.attrs['aria-pressed'],'true');
  await page.ids.get('add-note').fire('pointerdown',{pointerId:72});await settle();assert.equal(previewCalls.at(-1).action,'note');
  await page.ids.get('add-note').fire('pointerup',{pointerId:72});await settle();assert.equal(previewCalls.at(-1).action,'release');
  await toggle.fire('click');await piano.fire('pointerdown',{pointerId:71,clientX:5,clientY:50});await settle();assert.equal(previewCalls.length,4);
  view.dispose();
});
test('native Preview work refusal is visible instead of claiming audition succeeded',async()=>{
  const initial=workspaceState();initial.midi={previewError:4,previewSerial:'9'};
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.match(page.ids.get('notice').textContent,/Preview.*work allowance/i);view.dispose();
});
test('Session reads sources and real chains without compatibility instruments or embedded clips',async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.ok(page.find('Note 1 pitch'));assert.equal(page.ids.get('tracks').children.length,2);assert.match(page.find('Pulse clip runtime').textContent,/Arrangement/i);
  assert.ok(page.find('Return Pulse to Arrangement'));assert.ok(page.find('Make source independent'));assert.equal(page.find('Set Saved Default'),undefined);
  await page.find('Launch Pulse Clip 1').fire('click');
  assert.deepEqual(native.calls.find(c=>c.name==='alive_workspace_action').args,{generation:1,preparationRevision:'1',action:{kind:'launch',trackId:'track-1',slotId:'clip-track-1'}});
  view.dispose();
});
test('Play starts shared audio then sends Start with the original captured preparation',async()=>{
  const initial=workspaceState();initial.state.playing=0;initial.audio.running=false;
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:async(name,args)=>{const result=await native.invoke(name,args);if(name==='alive_audio'){native.snapshot.generation=2;native.snapshot.preparationRevision='2';}return result;}});await settle();
  await page.ids.get('start').fire('click');
  assert.deepEqual(native.calls.filter(c=>['alive_audio','alive_workspace_action'].includes(c.name)),[{name:'alive_audio',args:{action:'start',generation:1}},{name:'alive_workspace_action',args:{action:{kind:'start'},generation:1,preparationRevision:'1'}}]);view.dispose();
});
test('failed audio start never submits a runtime Start',async()=>{
  const initial=workspaceState();initial.state.playing=0;const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_audio')throw Error('Device failed');return native.invoke(name,args);}});await settle();await page.ids.get('start').fire('click');
  assert.equal(native.calls.some(c=>c.name==='alive_workspace_action'),false);assert.match(page.ids.get('notice').textContent,/Device failed/);view.dispose();
});

test('queued automation cannot retarget a slot made independent by an earlier command',async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=backend(initial);let release;
  const view=mountAlive({...page,invoke:async(name,args)=>{
    if(name==='alive_workspace_edit'){native.calls.push({name,args});if(args.operation.kind==='sourceIndependent'){
      await new Promise(resolve=>{release=resolve;});const source=structuredClone(native.snapshot.document.sources[0]);source.id='new-independent-source';source.notes.forEach(n=>n.id+='-new');native.snapshot.document.sources.push(source);native.snapshot.document.tracks[0].slots[0].sourceId=source.id;native.snapshot.editRevision++;
    }return{snapshot:structuredClone(native.snapshot),affected:{trackId:'track-1',slotId:'clip-track-1',sourceId:'new-independent-source'}};}return native.invoke(name,args);
  }});await settle();
  const first=page.find('Make source independent').fire('click');await settle();const enabled=page.find('Cutoff automation enabled');enabled.checked=!enabled.checked;const second=enabled.fire('change');release();await first;await second;await settle();
  assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,1);assert.match(page.ids.get('notice').textContent,/source.*changed/i);view.dispose();
});

test('queued numeric note edits retain their originating source after track selection changes',async()=>{
  const initial=workspaceState(),original=structuredClone(initial.document.sources[1]),page=dom('./alive.html'),native=backend(initial);let release,held=true;
  const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_workspace_edit'&&held){held=false;await new Promise(resolve=>{release=resolve;});}return native.invoke(name,args);}});await settle();
  const tempo=page.ids.get('tempo');tempo.value='130';const first=tempo.fire('change');await settle();
  const pitch=page.find('Note 1 pitch');pitch.value='61';const second=pitch.fire('change');await settle();await page.find('Select Harmony track').fire('click');
  release();await first;await second;await settle();await settle();
  assert.equal(native.snapshot.document.tempo,130);assert.equal(native.snapshot.document.sources[0].notes[0].pitch,61);assert.deepEqual(native.snapshot.document.sources[1],original);
  const calls=native.calls.filter(c=>c.name==='alive_workspace_edit');assert.deepEqual(calls.map(c=>c.args.editRevision),[0,1]);assert.equal(calls[1].args.operation.sourceId,initial.document.sources[0].id);view.dispose();
});

test('queued automation point values refuse a list changed by a preceding deletion',async()=>{
  const initial=workspaceState(),lane=initial.document.sources[0].automation.find(l=>l.key==='cutoff');lane.points=[{beat:0,value:1200},{beat:2,value:1800},{beat:4,value:2400}];
  const expected=structuredClone(lane.points.slice(1)),page=dom('./alive.html'),native=backend(initial);let release,held=true;
  const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_workspace_edit'&&held){held=false;await new Promise(resolve=>{release=resolve;});}return native.invoke(name,args);}});await settle();
  const remove=page.find('Remove Cutoff point 1'),value=page.find('Cutoff point 2 value');const first=remove.fire('click');await settle();value.value='2300';const second=value.fire('change');
  release();await first;await second;await settle();await settle();
  assert.deepEqual(native.snapshot.document.sources[0].automation.find(l=>l.key==='cutoff').points,expected);assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,1);assert.match(page.ids.get('notice').textContent,/list changed/);view.dispose();
});

for(const effectFirst of [false,true])test(`audio chain has explicit optional instrument (${effectFirst?'effect first':'empty'})`,async()=>{
  const initial=workspaceState(),track=initial.document.tracks[0],reference=track.chain.instrument;
  track.chain={kind:'audio'};track.slots=[null,null,null,null];track.effects=effectFirst?[{...reference,instanceId:'audio-effect'}]:[];
  initial.document.sources=initial.document.sources.filter(s=>s.trackId!==track.id);initial.document.placements=initial.document.placements.filter(p=>p.trackId!==track.id);
  initial.trackChains[0]={trackId:track.id,kind:'audio',instrumentId:null,effectIds:effectFirst?['audio-effect']:[]};
  if(effectFirst)initial.deviceInstances['audio-effect']=structuredClone(initial.deviceInstances[reference.instanceId]);
  initial.runtime.tracks[0]={...initial.runtime.tracks[0],activeSourceId:null,activeSlotId:null,activePlacementId:null,phase:null};
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.equal(page.ids.get('add-note').disabled,true);assert.equal(page.find('Import WAV...').disabled,undefined);
  assert.equal(page.ids.get('notes').children.length,0);assert.equal(page.find('Note 1 pitch'),undefined);
  if(effectFirst){const bypass=descendants(page.ids.get('chain')).find(e=>e.attrs['aria-label']?.startsWith('Bypass '));assert.equal(bypass.disabled,false);}
  view.dispose();
});

for(const firstField of ['name','start'])test(`queued slot ${firstField} edit preserves the other accepted field`,async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=timelineBackend(initial);let release,held=true;
  const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_workspace_edit'&&held){held=false;await new Promise(resolve=>release=resolve);}return native.invoke(name,args);}});await settle();
  const name=page.find('Clip name'),start=page.find('Clip Start');name.value='Renamed slot';start.value='.25';
  await(firstField==='name'?name:start).fire('change');await(firstField==='name'?start:name).fire('change');release();await settle();await settle();await settle();
  const edits=native.calls.filter(c=>c.name==='alive_workspace_edit');assert.deepEqual(edits.map(c=>c.args.editRevision),[0,1]);
  const slot=view.model.document().tracks[0].slots[0];assert.equal(slot.name,'Renamed slot');assert.equal(slot.region.start,.25);assert.equal(slot.region.loopStart,0);view.dispose();
});

for(const field of ['name','offset'])for(const boundary of ['rewire','delete'])test(`queued slot ${field} refuses an earlier ${boundary}`,async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=backend(initial);let release;
  const view=mountAlive({...page,invoke:async(name,args)=>{
    if(name!=='alive_workspace_edit')return native.invoke(name,args);
    native.calls.push({name,args});if(!release)await new Promise(resolve=>{release=resolve;});
    const slot=native.snapshot.document.tracks[0].slots[0];
    if(boundary==='delete')native.snapshot.document.tracks[0].slots[0]=null;
    else{const source=structuredClone(native.snapshot.document.sources[0]);source.id='new-independent-source';source.notes.forEach(n=>n.id+='-new');native.snapshot.document.sources.push(source);slot.sourceId=source.id;}
    native.snapshot.editRevision++;
    return{snapshot:structuredClone(native.snapshot),affected:{trackId:'track-1',slotId:slot.id,sourceId:slot.sourceId,noteId:null,placementId:null}};
  }});await settle();
  const input=page.find(field==='name'?'Clip name':'Clip Start');
  await page.find(boundary==='rewire'?'Make source independent':'Delete clip').fire('click');input.value=field==='name'?'Stale name':'0.25';await input.fire('change');
  release();await settle();await settle();await settle();
  assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,1);assert.match(page.ids.get('notice').textContent,/slot or source changed/);view.dispose();
});

function timelineBackend(initial=workspaceState()){
  const native=liveBackend(initial),history=[],future=[];
  const invoke=async(name,args)=>{
    if(name==='alive_history'){
      native.calls.push({name,args});const from=args.direction==='undo'?history:future,to=args.direction==='undo'?future:history;to.push(structuredClone(initial.document));initial.document=from.pop();initial.editRevision++;return structuredClone(initial);
    }
    if(name!=='alive_workspace_edit')return native.invoke(name,args);
    native.calls.push({name,args});const op=args.operation,document=structuredClone(initial.document),affected={trackId:op.trackId??null,sourceId:op.sourceId??null,slotId:null,placementId:null,noteId:null};
    if(op.kind==='sourceCreateMidi'){affected.sourceId=`source-created-${initial.editRevision}`;document.sources.push({id:affected.sourceId,kind:'midi',trackId:op.trackId,name:op.name,lengthBeats:op.lengthBeats,notes:[],automation:[]});}
    else if(op.kind==='placementCreate'){if(document.placements.some(p=>p.trackId===op.trackId&&op.start<p.start+p.duration&&op.start+op.duration>p.start))throw Error('Placement overlap');affected.placementId=`placement-created-${initial.editRevision}`;const {kind,...p}=op;document.placements.push({id:affected.placementId,...p});}
    else if(op.kind==='placementUpdate'){const p=document.placements.find(p=>p.id===op.placementId);affected.trackId=p.trackId;affected.sourceId=p.sourceId;affected.placementId=p.id;Object.assign(p,{start:op.start,duration:op.duration,region:op.region});}
    else if(op.kind==='noteCreate'){const s=document.sources.find(s=>s.id===op.sourceId),{kind,sourceId,...note}=op;affected.trackId=s.trackId;affected.noteId=`note-created-${initial.editRevision}`;s.notes.push({id:affected.noteId,...note});}
    else if(op.kind==='placementDuplicate'){const p=document.placements.find(p=>p.id===op.placementId);affected.trackId=p.trackId;affected.sourceId=p.sourceId;affected.placementId=`placement-copy-${initial.editRevision}`;document.placements.push({...structuredClone(p),id:affected.placementId,start:op.start});}
    else if(op.kind==='placementDelete'){const p=document.placements.find(p=>p.id===op.placementId);affected.trackId=p.trackId;affected.sourceId=p.sourceId;affected.placementId=p.id;document.placements=document.placements.filter(p=>p.id!==op.placementId);}
    else if(op.kind==='sourceIndependent'){const p=document.placements.find(p=>p.id===op.occurrence.placementId),source=structuredClone(document.sources.find(s=>s.id===p.sourceId));source.id=`independent-${initial.editRevision}`;source.notes.forEach(n=>n.id+='-copy');document.sources.push(source);p.sourceId=source.id;Object.assign(affected,{trackId:p.trackId,sourceId:source.id,placementId:p.id});}
    else if(op.kind==='noteUpdate'){const source=document.sources.find(s=>s.id===op.sourceId),note=source.notes.find(n=>n.id===op.noteId);Object.assign(note,{beat:op.beat,duration:op.duration,pitch:op.pitch,velocity:op.velocity});affected.trackId=source.trackId;affected.noteId=note.id;}
    else if(op.kind==='sourceRename'){const source=document.sources.find(s=>s.id===op.sourceId);source.name=op.name;affected.trackId=source.trackId;}
    else if(op.kind==='sourceLength'){const source=document.sources.find(s=>s.id===op.sourceId);source.lengthBeats=op.lengthBeats;affected.trackId=source.trackId;}
    else if(op.kind==='slotAssign'){const t=document.tracks.find(t=>t.id===op.trackId);affected.slotId=`assigned-${initial.editRevision}`;t.slots[op.slot]={id:affected.slotId,name:op.name,sourceId:op.sourceId,region:op.region};}
    else if(op.kind==='slotUpdate'){const slot=document.tracks.find(t=>t.id===op.trackId).slots.find(s=>s?.id===op.slotId);Object.assign(slot,{name:op.name,region:op.region});Object.assign(affected,{slotId:slot.id,sourceId:slot.sourceId});}
    else if(op.kind==='regionSet'){const o=op.occurrence,p=o.kind==='slot'?document.tracks.find(t=>t.id===o.trackId).slots.find(s=>s?.id===o.slotId):document.placements.find(p=>p.id===o.placementId);p.region=op.region;Object.assign(affected,{trackId:o.trackId??p.trackId,sourceId:p.sourceId,slotId:o.slotId??null,placementId:o.placementId??null});}
    else if(op.kind==='midiClipCreate'||op.kind==='midiPlacementCreate'){const t=document.tracks.find(t=>t.id===op.trackId);affected.sourceId=`created-source-${initial.editRevision}`;const length=op.duration??4;document.sources.push({kind:'midi',id:affected.sourceId,trackId:t.id,name:op.name,lengthBeats:length,notes:[],automation:[]});const region={start:0,end:length,loopStart:0,loopEnd:length,loopEnabled:true};if(op.kind==='midiClipCreate'){affected.slotId=`created-slot-${initial.editRevision}`;t.slots[op.slot]={id:affected.slotId,name:op.name,sourceId:affected.sourceId,region};}else{affected.placementId=`created-placement-${initial.editRevision}`;document.placements.push({id:affected.placementId,trackId:t.id,sourceId:affected.sourceId,start:op.start,duration:op.duration,region});}}
    else if(op.kind==='automationSet'){document.sources.find(s=>s.id===op.sourceId).automation=op.lanes;}
    else if(op.kind==='transportRange'){const {kind,...values}=op;Object.assign(document,values);}
    else throw Error(`Unsupported test operation ${op.kind}`);
    history.push(structuredClone(initial.document));future.length=0;initial.document=document;initial.editRevision++;initial.history={canUndo:true,canRedo:false};return{snapshot:structuredClone(initial),affected};
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
  const page=dom('./alive.html'),native=backend(workspaceState()),boundary=delayedBoundary(native,'alive_file',snapshot=>{snapshot.generation++;snapshot.editRevision++;}),view=mountAlive({...page,invoke:boundary.invoke});await settle();
  await page.ids.get('open').fire('click');const input=page.find('Cutoff base');input.value='3200';await input.fire('change');boundary.release();await settle();await settle();
  assert.equal(native.snapshot.document.tracks[0].chain.instrument.parameters.cutoff,2400);const call=native.calls.find(c=>c.name==='alive_base');assert.ok(!call||call.args.generation===1);view.dispose();
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
  const a=page.find(first==='start'?'Placement start':'Placement source Start'),b=page.find(first==='start'?'Placement source Start':'Placement start');a.value=first==='start'?'2':'.5';await a.fire('change');b.value=first==='start'?'.5':'2';await b.fire('change');release();await settle();await settle();
  const operations=native.calls.filter(c=>c.name==='alive_workspace_edit');assert.equal(operations.length,2);assert.equal(operations[1].args.editRevision,1);const p=view.model.document().placements[0];assert.equal(p.start,2);assert.equal(p.region.start,.5);view.dispose();
});
for(const boundary of ['delete','independent'])test(`queued placement offset refuses earlier ${boundary} without retargeting`,async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=timelineBackend(initial);let release,held=true;
  const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_workspace_edit'&&held){held=false;await new Promise(resolve=>release=resolve);}return native.invoke(name,args);}});await settle();await page.find('Select placement placement-0').fire('click');const offset=page.find('Placement source Start');
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
test('pending Return and selected placement/source/device survive repeated view navigation',async()=>{
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
  const initial=workspaceState();initial.master={gain:1,acceptedSerial:'3',available:true,unavailableReason:null,observationStale:false,observation:{targetGain:1,currentGain:1,peakLeft:.2,peakRight:.8,clipMask:2,appliedSerial:'3',appliedFrame:'64',observationStartFrame:'0',observationEndFrame:'64'}};
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  assert.ok(page.find('Master gain fader'));assert.ok(page.find('Master left peak'));assert.ok(page.find('Master right peak'));
  assert.match(page.find('Master right peak').textContent,/0\.800/);view.dispose();
});

for(const [label,commandName] of [
  ['Bypass Pulse Stereo Utility effect 1','alive_bypass'],
  ['Move Pulse Stereo Utility effect 1 later','alive_device'],
  ['Remove Pulse track','alive_workspace_track'],
  ['Replace Pulse device','alive_device'],
  ['Open Pulse editor','alive_editor'],
  ['Edit selected device in Ultra','alive_editor'],
])for(const succeeds of [true,false])test(`queued ${label} ${succeeds?'cannot affect replacement':'survives failed Open'} with reused IDs`,async()=>{
  const initial=withChain();initial.state.playing=commandName==='alive_bypass'?1:0;
  const page=dom('./alive.html'),native=backend(initial);
  const boundary=delayedBoundary(native,'alive_file',snapshot=>{if(succeeds){snapshot.generation++;snapshot.editRevision++;snapshot.document.title='Replacement';}},succeeds?'snapshot':'error');
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
  else{assert.equal(calls.length,1);assert.equal(calls[0].args.generation,1);if(commandName==='alive_bypass'){assert.deepEqual(calls[0].args,{instanceId:'effect-0',bypassed:true,generation:1});assert.equal(native.snapshot.document.tracks[0].effects[0].bypassed,true);assert.equal(native.snapshot.state.playing,1);}if(commandName==='alive_device'){assert.equal(calls[0].args.trackId,'track-1');assert.equal(native.snapshot.document.title,'Device mutation');}if(commandName==='alive_editor')assert.equal(calls[0].args.instanceId,initial.document.tracks[0].chain.instrument.instanceId);}
  view.dispose();
});

test('launch selectors save fenced settings and preserve captured native target',async()=>{
  const initial=workspaceState();initial.capabilities={...initial.capabilities,launchQuantization:true,launchWindowFrames:1024};
  initial.launch={globalQuantization:'bar1',clipQuantization:[]};
  const clipId=initial.document.tracks[0].slots[0].id;
  initial.runtime.requests=[{preparationRevision:'1',requestSerial:'9',status:'pending',trackId:initial.document.tracks[0].id,clipId,quantization:'sixteenth',targetFrame:'6000',reason:0}];
  initial.runtime.tracks[0].pendingSerial='9';initial.runtime.tracks[0].pendingFrame='6000';
  const page=dom('./alive.html'),native=backend(initial);
  const invoke=async(name,args)=>{if(name!=='alive_launch_settings')return native.invoke(name,args);native.calls.push({name,args});
    assert.equal(args.preparationRevision,'1');assert.equal(args.editRevision,native.snapshot.editRevision);
    if(args.edit.kind==='global')native.snapshot.launch.globalQuantization=args.edit.quantization;
    else native.snapshot.launch.clipQuantization=[{occurrenceId:args.edit.occurrenceId,quantization:args.edit.quantization}];
    native.snapshot.editRevision++;native.snapshot.snapshotSequence=String(Number(native.snapshot.snapshotSequence)+1);return structuredClone(native.snapshot);};
  const view=mountAlive({...page,invoke});await settle();
  assert.ok(page.ids.get('launch-quantization'),'global selector exists');
  const global=page.ids.get('launch-quantization'),clip=page.ids.get('clip-quantization');
  assert.equal(global.value,'bar1');assert.equal(global.children.length,10);assert.equal(clip.value,'global');
  global.value='eighth';await global.fire('change');assert.equal(native.snapshot.launch.globalQuantization,'eighth');
  clip.value='none';await clip.fire('change');assert.equal(native.snapshot.launch.clipQuantization[0].occurrenceId,clipId);
  assert.match(page.ids.get('clip-launch-status').textContent,/1\/16.*6000/);
  assert.equal(native.calls.filter(c=>['alive_transport','alive_workspace_action'].includes(c.name)).length,0);
  await page.find('Select Pulse slot 2').fire('click');assert.equal(page.ids.get('clip-launch-settings').hidden,true);view.dispose();
});

test('launch controls preserve saved intent and explain unavailable native capability',async()=>{
  const initial=workspaceState();initial.launch={globalQuantization:'bar4',clipQuantization:[{occurrenceId:initial.document.tracks[0].slots[0].id,quantization:'sixteenth'}]};
  initial.capabilities={...initial.capabilities,launchQuantization:false,launchUnavailableReason:'This preparation exceeds quantized launch work limits',launchWindowFrames:1024};
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:async(name,args)=>{
    if(name!=='alive_launch_settings')return native.invoke(name,args);
    native.calls.push({name,args});if(args.edit.kind==='global')native.snapshot.launch.globalQuantization=args.edit.quantization;
    else native.snapshot.launch.clipQuantization=[];
    native.snapshot.editRevision++;native.snapshot.snapshotSequence=String(Number(native.snapshot.snapshotSequence)+1);return structuredClone(native.snapshot);
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
  const initial=workspaceState();initial.capabilities={...initial.capabilities,launchQuantization:true};initial.launch={globalQuantization:'bar1',clipQuantization:[]};
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_launch_settings')throw Error('Prepared launch scope changed');return native.invoke(name,args);}});await settle();
  const select=page.ids.get('launch-quantization');select.focus();select.value='eighth';await select.fire('change');assert.equal(select.value,'bar1');
  native.snapshot.generation++;native.snapshot.snapshotSequence='2';native.snapshot.launch.globalQuantization='bar4';await view.refresh();assert.equal(select.value,'bar4');view.dispose();
});


test('empty MIDI slot creation is one immediate command and opens its one-bar editor while rolling',async()=>{
  const page=dom('./alive.html'),native=timelineBackend(),view=mountAlive({...page,invoke:native.invoke});await settle();
  const cell=page.find('Select Pulse slot 2');await cell.fire('click');await cell.fire('dblclick');
  const operations=native.calls.filter(c=>c.name==='alive_workspace_edit').map(c=>c.args.operation);
  assert.deepEqual(operations,[{kind:'midiClipCreate',trackId:'track-1',slot:1,name:'Clip 2'}]);
  assert.equal(view.model.document().sources.at(-1).lengthBeats,4);assert.equal(view.model.snapshot().state.playing,1);assert.ok(page.find('Clip Start'));view.dispose();
});
test('track creation shortcuts insert typed empty tracks after selection and ignore text editing',async()=>{
  const initial=workspaceState();initial.capabilities.maxTracks=8;const page=dom('./alive.html'),native=backend(initial);
  const view=mountAlive({...page,invoke:async(name,args)=>{if(name!=='alive_workspace_track')return native.invoke(name,args);native.calls.push({name,args});return{snapshot:structuredClone(initial),affected:{trackId:null}};}});await settle();
  for(const shiftKey of [false,true])await page.doc.fire('keydown',{target:page.ids.get('session-workspace'),key:'t',ctrlKey:true,shiftKey});
  await page.doc.fire('keydown',{target:page.doc.createElement('input'),key:'t',ctrlKey:true});
  const commands=native.calls.filter(c=>c.name==='alive_workspace_track');assert.deepEqual(commands.map(c=>c.args.operation),[{kind:'addAudio',afterTrackId:'track-1'},{kind:'addMidi',afterTrackId:'track-1'}]);
  assert.ok(page.find('Insert Audio Track'));assert.ok(page.find('Insert MIDI Track'));view.dispose();
});
test('late track insertion preserves a newer selection by track identity',async()=>{
  const initial=workspaceState();initial.capabilities.maxTracks=8;
  const page=dom('./alive.html'),native=backend(initial);let release;
  const view=mountAlive({...page,invoke:async(name,args)=>{
    if(name!=='alive_workspace_track')return native.invoke(name,args);
    await new Promise(resolve=>release=resolve);
    const track={id:'inserted-audio',name:'Inserted Audio',color:'#91b9ed',chain:{kind:'audio'},effects:[],gain:1,mute:false,solo:false,slots:[null,null,null,null]};
    native.snapshot.document.tracks.splice(1,0,track);native.snapshot.editRevision++;
    return{snapshot:structuredClone(native.snapshot),affected:{trackId:track.id}};
  }});await settle();
  await page.find('Insert Audio Track').fire('click');await page.find('Select Harmony slot 1').fire('click');
  release();await settle();await settle();
  assert.match(page.ids.get('clip-title').textContent,/Harmony/);assert.equal(page.find('Select Harmony slot 1').attrs['aria-pressed'],'true');view.dispose();
});
for(const operation of ['track','import'])test(`queued ${operation} creation cannot cross Open with reused track IDs`,async()=>{
  const initial=workspaceState();initial.capabilities.maxTracks=8;
  if(operation==='import'){initial.document.tracks[0].chain={kind:'audio'};initial.document.tracks[0].slots=[null,null,null,null];}
  const page=dom('./alive.html'),native=backend(initial),boundary=delayedBoundary(native,'alive_file',snapshot=>{snapshot.generation++;snapshot.editRevision++;snapshot.document.title='Replacement';});
  const view=mountAlive({...page,invoke:boundary.invoke});await settle();await page.ids.get('open').fire('click');
  if(operation==='track')await page.find('Insert Audio Track').fire('click');else await page.find('Select Pulse slot 1').fire('dblclick');
  boundary.release();await settle();await settle();
  assert.equal(native.calls.filter(c=>c.name===`alive_${operation==='track'?'workspace_track':'audio_import'}`).length,0);view.dispose();
});
test('browser instrument loading retains the existing empty MIDI track selection',async()=>{
  const initial=workspaceState(),instrument=initial.document.tracks[0].chain.instrument;
  initial.state.playing=0;initial.capabilities.maxTracks=8;initial.document.tracks[0].chain.instrument=null;
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:async(name,args)=>{
    if(name!=='alive_device')return native.invoke(name,args);
    native.calls.push({name,args});initial.document.tracks[0].chain.instrument=instrument;initial.generation++;initial.editRevision++;return structuredClone(initial);
  }});await settle();
  const row=descendants(page.ids.get('browser-library')).find(e=>e.className==='browser-result'&&e.getAttribute('data-entry')?.startsWith('device:'));
  assert.ok(row);await row.fire('dblclick');await settle();
  assert.equal(native.calls.find(c=>c.name==='alive_device').args.trackId,'track-1');assert.match(page.ids.get('clip-title').textContent,/Pulse/);view.dispose();
});
test('automatic instrument transaction preserves a newer track selection across insertion and generation change',async()=>{
  const initial=workspaceState();initial.state.playing=0;
  const page=dom('./alive.html'),native=backend(initial),pending=deferred();
  const view=mountAlive({...page,invoke:async(name,args)=>{
    if(name!=='alive_device')return native.invoke(name,args);
    native.calls.push({name,args:structuredClone(args)});await pending.promise;
    const track=structuredClone(initial.document.tracks[0]);track.id='compound-track';track.name='Compound';track.slots=[null,null,null,null];track.chain.instrument.instanceId='compound-instrument';
    initial.document.tracks.splice(1,0,track);initial.deviceInstances['compound-instrument']=structuredClone(initial.deviceInstances[initial.document.tracks[0].chain.instrument.instanceId]);initial.generation++;initial.editRevision++;
    return structuredClone(initial);
  }});await settle();
  const row=descendants(page.ids.get('browser-library')).find(e=>e.className==='browser-result'&&e.getAttribute('data-entry')?.startsWith('device:'));
  await row.fire('dblclick');await page.find('Select Harmony slot 1').fire('click');pending.resolve();await settle();await settle();
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_workspace_track'),[]);
  assert.equal(native.calls.find(c=>c.name==='alive_device').args.action,'loadNewTrack');
  assert.match(page.ids.get('clip-title').textContent,/Harmony/);assert.equal(page.find('Select Harmony slot 1').attrs['aria-pressed'],'true');view.dispose();
});
for(const outcome of ['cancel','refuse'])test(`automatic instrument picker ${outcome} uses one transaction and retains the accepted document`,async()=>{
  const initial=workspaceState();initial.state.playing=0;initial.document.tracks[0].chain={kind:'audio'};
  const page=dom('./alive.html'),native=backend(initial),before=structuredClone(initial);
  const view=mountAlive({...page,invoke:async(name,args)=>{
    if(name!=='alive_device')return native.invoke(name,args);native.calls.push({name,args:structuredClone(args)});
    if(outcome==='refuse')throw Error('Invalid saved Ultra JSON');return structuredClone(initial);
  }});await settle();await page.ids.get('add-track').fire('click');await settle();
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_workspace_track'),[]);
  assert.deepEqual(native.calls.find(c=>c.name==='alive_device').args,{trackId:'track-1',instanceId:null,action:'loadNewTrack',generation:1,editRevision:0});
  assert.deepEqual(view.model.snapshot(),before);assert.match(page.ids.get('chain-title').textContent,/Pulse/);view.dispose();
});
test('queued browser instrument load fills its originating rootless track and preserves newer selection',async()=>{
  const initial=workspaceState(),instrument=initial.document.tracks[0].chain.instrument;
  initial.state.playing=0;initial.capabilities.maxTracks=8;initial.document.tracks[0].chain.instrument=null;
  const page=dom('./alive.html'),native=backend(initial),boundary=delayedBoundary(native,'alive_mixer',()=>{});
  const view=mountAlive({...page,invoke:async(name,args)=>{
    if(name!=='alive_device')return boundary.invoke(name,args);
    native.calls.push({name,args});initial.document.tracks.find(t=>t.id===args.trackId).chain.instrument=instrument;
    initial.generation++;initial.editRevision++;return structuredClone(initial);
  }});await settle();
  const gain=page.find('Pulse gain');gain.value='.713';await gain.fire('change');
  const row=descendants(page.ids.get('browser-library')).find(e=>e.className==='browser-result'&&e.getAttribute('data-entry')?.startsWith('device:'));
  assert.ok(row);await row.fire('dblclick');await page.find('Select Harmony slot 1').fire('click');
  boundary.release();await settle();await settle();
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_workspace_track'),[]);
  assert.equal(native.calls.find(c=>c.name==='alive_device')?.args.trackId,'track-1');
  assert.equal(view.model.document().tracks[0].chain.instrument.instanceId,instrument.instanceId);
  assert.match(page.ids.get('clip-title').textContent,/Harmony/);assert.equal(page.find('Select Harmony slot 1').attrs['aria-pressed'],'true');view.dispose();
});
test('browser can fill a rootless MIDI track at eight logical tracks while enforcing device capacity',async()=>{
  const initial=workspaceState();initial.state.playing=0;initial.capabilities.maxTracks=8;initial.capabilities.maxDevices=16;
  initial.document.tracks[0].chain.instrument=null;
  for(let i=3;i<=8;i++)initial.document.tracks.push({id:`track-${i}`,name:`Audio ${i}`,color:'#91b9ed',chain:{kind:'audio'},effects:[],gain:1,mute:false,solo:false,slots:[null,null,null,null]});
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  const row=descendants(page.ids.get('browser-library')).find(e=>e.className==='browser-result'&&e.getAttribute('data-entry')?.startsWith('device:'));
  assert.ok(row);await row.fire('click');const load=descendants(page.ids.get('browser-library')).find(e=>e.className==='browser-load');
  assert.equal(page.ids.get('add-track').disabled,false);assert.equal(load.disabled,false);
  assert.equal(page.ids.get('insert-audio-track').disabled,true);assert.equal(page.ids.get('insert-midi-track').disabled,true);
  await load.fire('click');assert.equal(native.calls.find(c=>c.name==='alive_device')?.args.trackId,'track-1');assert.deepEqual(native.calls.filter(c=>c.name==='alive_workspace_track'),[]);
  await page.find('Select Harmony slot 1').fire('click');assert.equal(page.ids.get('add-track').disabled,true);assert.equal(load.disabled,true);
  await page.find('Select Pulse slot 1').fire('click');assert.equal(load.disabled,false);
  native.snapshot.capabilities.maxDevices=1;native.snapshot.snapshotSequence='2';await view.refresh();
  assert.equal(page.ids.get('add-track').disabled,true);assert.equal(load.disabled,true);view.dispose();
});
test('blank MIDI time drag then Ctrl+L sets independent occurrence loop and preserves source and End',async()=>{
  const initial=workspaceState(),original=structuredClone(initial.document.sources[0]),page=dom('./alive.html'),native=timelineBackend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  const piano=page.ids.get('piano-roll');piano.getBoundingClientRect=()=>({left:0,top:0,width:640,height:218});
  await piano.fire('wheel',{deltaY:0,deltaX:0,clientX:100,clientY:90});const g={pad:48,width:640,length:8},x=beat=>g.pad+beat/g.length*(g.width-g.pad);
  await piano.fire('pointerdown',{pointerId:41,clientX:x(2),clientY:190});await piano.fire('pointermove',{pointerId:41,clientX:x(6),clientY:190});await piano.fire('pointerup',{pointerId:41});
  await piano.fire('keydown',{key:'l',ctrlKey:true});
  const op=native.calls.find(c=>c.args.operation?.kind==='regionSet')?.args.operation;assert.ok(op);
  assert.deepEqual(op.region,{start:2,end:8,loopStart:2,loopEnd:6,loopEnabled:true});assert.deepEqual(view.model.document().sources[0],original);view.dispose();
});
test('audio empty slot opens real import command and shares waveform loop controls',async()=>{
  const initial=workspaceState();initial.document.tracks[0].chain={kind:'audio'};initial.document.tracks[0].slots=[null,null,null,null];
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:async(name,args)=>{if(name!=='alive_audio_import')return native.invoke(name,args);native.calls.push({name,args});return null;}});await settle();
  const cell=page.find('Select Pulse slot 2');await cell.fire('click');await cell.fire('dblclick');
  assert.equal(native.calls.filter(c=>c.name==='alive_audio_import').length,1);assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,0);view.dispose();
});

test('workspace queue waits for APPLIED before selecting created clip and sending the next edit',async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=timelineBackend(initial);let candidate=null,ready=false;
  initial.midi={pending:false,publication:{status:3,serial:'0',error:0}};
  const invoke=async(name,args)=>{
    if(name==='alive_workspace_edit'&&!candidate){candidate=args;initial.midi={pending:true,publication:{status:1,serial:'1',error:0}};return{snapshot:structuredClone(initial),affected:{trackId:'track-1',sourceId:'created-source-0',slotId:'created-slot-0'}};}
    if(name==='alive_current'&&candidate&&ready){ready=false;await native.invoke('alive_workspace_edit',candidate);initial.midi={pending:false,publication:{status:3,serial:'1',error:0}};}
    return native.invoke(name,args);
  };
  const view=mountAlive({...page,invoke});await settle();const cell=page.find('Select Pulse slot 2');await cell.fire('click');await cell.fire('dblclick');
  assert.equal(view.model.document().tracks[0].slots[1],null);assert.match(page.ids.get('edit-status').textContent,/Updating playback/);
  const tempo=page.ids.get('tempo');tempo.value='120';await tempo.fire('change');assert.equal(native.calls.filter(c=>c.name==='alive_workspace_edit').length,0);
  ready=true;await new Promise(resolve=>setTimeout(resolve,60));await settle();
  assert.equal(view.model.document().tracks[0].slots[1].id,'created-slot-0');assert.equal(view.model.document().tempo,120);
  assert.deepEqual(native.calls.filter(c=>c.name==='alive_workspace_edit').map(c=>c.args.operation.kind),['midiClipCreate','transportRange']);assert.equal(page.find('Select Pulse slot 2').attrs['aria-pressed'],'true');view.dispose();
});

test('MIDI source preservation also holds when an audio waveform time range becomes its loop',async()=>{
  const initial=workspaceState(),t=initial.document.tracks[0],id=t.slots[0].sourceId;
  t.chain={kind:'audio'};initial.document.sources[0]={kind:'audio',id,trackId:t.id,name:'Owned WAV',file:{frames:'192000',sampleRate:48000,channels:2},sourceTempo:120,warpMode:'repitch',automation:[]};
  initial.preparedWorkspaces.sources[0]={sourceId:id,kind:'audio',waveformPeaks:[[-.8,.5],[-.3,.7]]};
  const original=structuredClone(initial.document.sources[0]),page=dom('./alive.html'),native=timelineBackend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();const piano=page.ids.get('audio-waveform');piano.getBoundingClientRect=()=>({left:0,top:0,width:640,height:218});await piano.fire('wheel',{deltaX:0,deltaY:0,clientX:100,clientY:150});
  const x=beat=>16+beat/12*(640-16);await piano.fire('pointerdown',{pointerId:90,clientX:x(2),clientY:180});await piano.fire('pointermove',{pointerId:90,clientX:x(6),clientY:180});await piano.fire('pointerup',{pointerId:90});await piano.fire('keydown',{key:'l',ctrlKey:true});
  assert.deepEqual(view.model.document().tracks[0].slots[0].region,{start:2,end:8,loopStart:2,loopEnd:6,loopEnabled:true});assert.deepEqual(view.model.document().sources[0],original);assert.ok(descendants(piano).some(e=>e.attrs.class==='audio-waveform'));view.dispose();
});

test('Stop can cancel an outstanding musical publication without waiting behind it',async()=>{
  const initial=workspaceState(),page=dom('./alive.html'),native=backend(initial);initial.midi={pending:false,publication:{status:3,serial:'0',error:0}};
  const invoke=async(name,args)=>{
    if(name==='alive_workspace_edit'){initial.midi={pending:true,publication:{status:1,serial:'1',error:0}};return{snapshot:structuredClone(initial),affected:{trackId:'track-1'}};}
    if(name==='alive_transport'&&args.action==='stop'){native.calls.push({name,args});initial.state.playing=0;initial.midi={pending:false,publication:{status:6,serial:'1',error:13}};return;}
    return native.invoke(name,args);
  };
  const view=mountAlive({...page,invoke});await settle();const cell=page.find('Select Pulse slot 2');await cell.fire('click');await cell.fire('dblclick');await page.ids.get('stop').fire('click');
  const stopped=native.calls.some(c=>c.name==='alive_transport'&&c.args.action==='stop');initial.midi.pending=false;await new Promise(resolve=>setTimeout(resolve,30));assert.equal(stopped,true);view.dispose();
});
const dragTransfer=()=>({values:{},setData(type,value){this.values[type]=value;}});
test('device drag cancels on Escape and rejects a changed session or a foreign drop',async()=>{
  const initial=workspaceState();initial.state.playing=0;
  const page=dom('./alive.html'),native=backend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
  const device=()=>descendants(page.ids.get('browser-library')).find(e=>e.draggable);
  const target=()=>page.ids.get('tracks').children[1];let dataTransfer=dragTransfer();
  await page.doc.fire('drop',{target:target(),dataTransfer});assert.equal(native.calls.some(c=>c.name==='alive_device'),false);
  await device().fire('dragstart',{dataTransfer});await page.doc.fire('dragover',{target:target(),dataTransfer});
  assert.equal(target().classList.contains('device-drop-target'),true);
  await page.doc.fire('keydown',{key:'Escape',target:target()});assert.equal(target().classList.contains('device-drop-target'),false);
  await page.doc.fire('drop',{target:target(),dataTransfer});assert.equal(native.calls.some(c=>c.name==='alive_device'),false);
  dataTransfer=dragTransfer();await device().fire('dragstart',{dataTransfer});
  initial.generation++;initial.snapshotSequence='2';await view.refresh();
  await page.doc.fire('drop',{target:target(),dataTransfer});assert.equal(native.calls.some(c=>c.name==='alive_device'),false);
  assert.match(page.ids.get('notice').textContent,/drag session changed/);view.dispose();
});
test('queued device drop retains its destination and does not override a newer track selection',async()=>{
  const initial=workspaceState();initial.state.playing=0;
  const page=dom('./alive.html'),native=backend(initial),boundary=delayedBoundary(native,'alive_mixer',()=>{});
  const view=mountAlive({...page,invoke:boundary.invoke});await settle();
  const gain=page.find('Pulse gain');gain.value='.713';await gain.fire('change');
  const row=descendants(page.ids.get('browser-library')).find(e=>e.draggable),dataTransfer=dragTransfer();
  await row.fire('dragstart',{dataTransfer});await page.doc.fire('drop',{target:page.ids.get('tracks').children[1],dataTransfer});
  await page.find('Select Pulse slot 2').fire('click');boundary.release();await settle();await settle();
  assert.equal(native.calls.find(c=>c.name==='alive_device')?.args.trackId,'track-2');
  assert.equal(native.calls.find(c=>c.name==='alive_device')?.args.action,'replace');
  assert.equal(page.find('Select Pulse slot 2').attrs['aria-pressed'],'true');assert.equal(page.ids.get('device-detail').hidden,true);view.dispose();
});
test('fresh project fetches its device catalog once without category interaction',async()=>{
  const initial=workspaceState();for(const t of initial.document.tracks){t.chain.instrument=null;t.effects=[];t.slots=[null,null,null,null];}initial.document.sources=[];initial.document.placements=[];initial.deviceInstances={};initial.state.playing=0;
  const page=dom('./alive.html'),native=backend(initial);let fetches=0;
  const view=mountAlive({...page,invoke:(name,args)=>{if(name==='alive_browser_catalog'){fetches++;assert.deepEqual(args,{request:{refresh:false,cursor:null}});return Promise.resolve(catalogPage([catalogEntry()]));}return native.invoke(name,args);}});await settle();
  assert.equal(page.find('Fresh Synth').draggable,true);await view.refresh();assert.equal(fetches,1);
  await page.find('Fresh Synth').fire('click');assert.equal(descendants(page.ids.get('browser-library')).find(e=>e.className==='browser-load').textContent,'Load Instrument');view.dispose();
});
function workspaceState(editor=false){
  const document=JSON.parse(readFileSync(new URL('../../alive/examples/two-instruments.alive',import.meta.url),'utf8')).score,patch=JSON.parse(readFileSync(new URL('../examples/subtractive.ultra',import.meta.url),'utf8'));
  const deviceInstances={},devices=[];
  for(const [i,t] of document.tracks.entries()){
    const source=document.sources.find(s=>s.trackId===t.id);source.id=`source-independent-${i}`;source.notes.forEach((n,index)=>n.id=`note-${t.id}-${index}`);t.slots[0].id=`clip-${t.id}`;t.slots[0].sourceId=source.id;
    const placement=document.placements.find(p=>p.trackId===t.id);placement.id=`placement-${i}`;placement.sourceId=source.id;
    const reference=t.chain.instrument,manifest={...patch.device,presentation:projectFixturePresentation(patch),parameters:patch.device.parameters.map(binding=>({...binding,base:reference.parameters[binding.key],integral:false}))};
    deviceInstances[reference.instanceId]={index:i,track:i,path:reference.path,manifest};devices.push(manifest);
  }
  const result={generation:1,editRevision:0,preparationRevision:'1',snapshotSequence:'1',history:{canUndo:false,canRedo:false},document,deviceInstances,instanceId:editor?document.tracks[0].chain.instrument.instanceId:null,deviceIndex:editor?0:null,track:editor?0:null,patch:editor?patch:null,dirty:false,
    master:{gain:1,acceptedSerial:'0',available:true,unavailableReason:null,observation:null,observationStale:false},launch:{globalQuantization:'bar1',clipQuantization:[]},midi:{pending:false,publication:{status:3,serial:'0',error:0}},
    capabilities:{maxTracks:8,maxDevices:16,maxSources:128,maxPlacements:256,atomicTrackActions:true,launchQuantization:true,launchWindowFrames:1024,midiPreview:true,midiEdit:true},
    state:{position:'0',absoluteFrame:'1024',generation:'1',rejected:'0',playing:1,peakLeft:.1,peakRight:.2,tracks:document.tracks.map(()=>({peakLeft:.1,peakRight:.2,activeVoices:3})),devices:devices.map(device=>({effective:device.parameters.map(p=>p.key==='cutoff'?700:p.base),owned:device.parameters.map(p=>p.key==='cutoff'?1:0)}))},
    audio:{running:true,config:{host:'default',device:'default',sample_rate:48000},host:'PipeWire',device:'Private output',observed_buffer_frames:256,callbacks:4,stream_errors:0,failed:false,message:'Audio output is running.'},
    trackChains:document.tracks.map(t=>({trackId:t.id,kind:'midi',instrumentId:t.chain.instrument.instanceId,effectIds:[]})),
    preparedWorkspaces:{preparationRevision:'1',sources:document.sources.map(s=>({trackId:s.trackId,sourceId:s.id,kind:s.kind,name:s.name,lengthFrames:'205714'})),slots:document.tracks.flatMap(t=>t.slots.flatMap((slot,index)=>slot?[{trackId:t.id,slotId:slot.id,slot:index,sourceId:slot.sourceId,name:slot.name}]:[])),placements:document.placements.map(p=>({trackId:p.trackId,placementId:p.id,sourceId:p.sourceId,startFrame:'0',durationFrames:'205714'}))},
    runtime:{tracks:document.tracks.map((t,i)=>({trackId:t.id,authority:'arrangement',activeSlotId:null,activePlacementId:`placement-${i}`,activeSourceId:`source-independent-${i}`,phase:'0',epoch:'1',pendingAction:null,pendingAuthority:null,pendingSlotId:null,pendingSerial:null,pendingFrame:null})),requests:[],requestedStopEpoch:'0',appliedStopEpoch:'0'}};
  return result;
}
function backend(initial){return timelineBackend(initial);}
function liveBackend(snapshot){
  const calls=[];
  return{calls,snapshot,async invoke(name,args={}){
    if(name==='alive_browser_catalog')return catalogPage();
    calls.push({name,args:structuredClone(args)});
    if(name==='alive_current'||name==='alive_file'||name==='alive_device')return structuredClone(snapshot);
    if(name==='alive_mixer'){Object.assign(snapshot.document.tracks.find(t=>t.id===args.trackId),{gain:args.gain,mute:args.mute,solo:args.solo});return;}
    if(name==='alive_base'){
      const owner=snapshot.deviceInstances[args.instanceId],binding=owner.manifest.parameters.find(p=>p.key===args.key),track=snapshot.document.tracks[owner.track];binding.base=args.value;[track.chain.instrument,...track.effects].filter(Boolean).find(d=>d.instanceId===args.instanceId).parameters[args.key]=args.value;
      if(snapshot.patch)snapshot.patch.nodes.find(n=>n.id===binding.node).params[binding.param]=args.value;return;
    }
    if(name==='alive_bypass'){const owner=snapshot.deviceInstances[args.instanceId];snapshot.document.tracks[owner.track].effects.find(d=>d.instanceId===args.instanceId).bypassed=args.bypassed;return;}
    if(name==='alive_audio_devices')return{config:snapshot.audio.config,hosts:['PipeWire'],effective_host:'PipeWire',devices:[{id:'default',name:'Default',compatible:true},{id:'speakers',name:'Speakers',compatible:true}],notice:''};
    if(name==='alive_audio_configure'){snapshot.audio.config=args.config;return;}
    if(name==='alive_audio'){snapshot.audio.running=args.action==='start';if(args.action==='stop')snapshot.state.playing=0;return;}
  }};
}
function delayedBoundary(native,name,change,outcome='snapshot'){
  let release;const gate=new Promise(resolve=>{release=resolve;});
  return{release,async invoke(command,args){const result=await native.invoke(command,args);if(command!==name)return result;await gate;change(native.snapshot);if(outcome==='error')throw Error('Outer file action failed');return outcome==='none'?null:structuredClone(native.snapshot);}};
}
