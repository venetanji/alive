import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {TYPES,LABELS,starter,validate,payload} from './graph.mjs';

// Run the actual control code with idle DOM nodes and a paused native command.
// No browser, audio server, keyboard or pointer is involved.
const source=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
const bootstrap=source.lastIndexOf('render();applyPatch();refresh();setInterval');
assert(bootstrap>0,'Locate the application bootstrap');
const code=source.slice(0,bootstrap).replace(/^import[^\n]*\n/,'');
function app(){
 const calls=[],listeners={},elements=new Map();
 let finishPatch;
 const context=vm.createContext({
  TYPES,LABELS,starter,validate,payload,console,
  window:{__TAURI__:{core:{invoke(name,args){
   calls.push({name,args});
   if(name==='patch_apply')return new Promise(resolve=>{finishPatch=resolve;});
   return Promise.resolve(true);
  }}},addEventListener(name,fn){listeners[name]=fn;}},
  document:{querySelector(name){
   if(!elements.has(name))elements.set(name,{style:{},addEventListener(){}});
   return elements.get(name);
  },querySelectorAll(){return [];},addEventListener(){}},
 });
 vm.runInContext(code,context);
 vm.runInContext("status={running:true};routeMask=3;render=()=>{};",context);
 return {context,calls,listeners,async accept(mask=2){
  // Let the serialized patch command reach its deliberately paused invoke.
  await Promise.resolve();
  assert(finishPatch,'Patch command was submitted');
  const complete=finishPatch;finishPatch=undefined;complete({route_mask:mask});
 },async finish(mask=2){
  await this.accept(mask);
  await vm.runInContext('commandQueue',context);
 }};
}
for(const release of ['key-up','focus-loss']){
 const a=app();
 vm.runInContext("down('typing-B',1,67);patch.edges=patch.edges.filter(e=>e.from!=='0-note');applyPatch();",a.context);
 if(release==='key-up')vm.runInContext("up('typing-B')",a.context);
 else a.listeners.blur();
 await a.finish();
 assert(a.calls.some(c=>c.name==='note_event'&&c.args.device===1&&c.args.kind===1),
  release+': B release was lost while an A patch edit was pending');
 if(release==='focus-loss')assert(a.calls.some(c=>c.name==='note_event'&&c.args.device===1&&c.args.kind===4),
  'Focus loss must retain B all-off while patch IPC is pending');
}
const restored=app();
vm.runInContext("patch.edges=patch.edges.filter(e=>e.from!=='0-note');routeMask=2;pending='0-note';connect('0-faust','in');",restored.context);
await restored.finish(3);
assert(!restored.calls.some(c=>c.name==='note_event'&&c.args.device===0&&c.args.kind!==3),
 'Connecting a previously muted A route must not submit rejected A reset events');
assert(restored.calls.some(c=>c.name==='note_event'&&c.args.device===0&&c.args.kind===3),
 'Reconnected A must receive its gain after native patch acceptance');
const gain=app();
vm.runInContext("applyPatch();patch.nodes.find(n=>n.type==='gain'&&n.device===1).level=7;event(1,3,0,7);",gain.context);
await gain.finish(3);
const levels=gain.calls.filter(c=>c.name==='note_event'&&c.args.device===1&&c.args.kind===3);
assert.equal(levels.at(-1)?.args.value,7,
 'A gain change during patch IPC must reach the engine after patch acceptance');
console.log('PASS: pending patch edits preserve releases and latest gains; reconnect avoids inactive-device resets.');

const pressing=app();
vm.runInContext("patch.edges=patch.edges.filter(e=>e.from!=='0-note');applyPatch();down('new-B',1,69);down('removed-A',0,60);",pressing.context);
assert(pressing.calls.some(c=>c.name==='note_event'&&c.args.device===1&&c.args.kind===0&&c.args.note===69),
 'An A-only edit must preserve new B presses while patch acceptance is pending');
assert(!pressing.calls.some(c=>c.name==='note_event'&&c.args.device===0&&c.args.kind===0),
 'A removed route must not accept new UI notes');
await pressing.finish(2);
const revisions=app();
const first=vm.runInContext("patch.edges=patch.edges.filter(e=>e.from!=='0-note');applyPatch();",revisions.context);
vm.runInContext("patch=starter();applyPatch();down('reconnecting-A',0,60);down('continuous-B',1,67);",revisions.context);
assert.equal(vm.runInContext('routeMask',revisions.context),2,
 'Reconnect pending behind a disconnect must preserve only continuously accepted routes');
await revisions.accept(2);await first;
assert.equal(vm.runInContext('routeMask',revisions.context),2,'Stale acceptance must not expose a reconnect');
await revisions.finish(3);
vm.runInContext("down('accepted-A',0,72)",revisions.context);
const presses=revisions.calls.filter(c=>c.name==='note_event'&&c.args.kind===0);
assert.deepEqual(presses.map(c=>[c.args.device,c.args.note]),[[1,67],[0,72]],
 'Only unaffected B may start before latest reconnect acceptance');
console.log('PASS: unaffected presses survive edits; removed/reconnecting routes wait for latest acceptance.');
const stale=app();
const staleFirst=vm.runInContext('applyPatch()',stale.context);
vm.runInContext("patch.edges=patch.edges.filter(e=>e.from!=='0-note');applyPatch();",stale.context);
await stale.accept(3);await staleFirst;
assert.equal(vm.runInContext('routeMask',stale.context),2,
 'An older connected result must not re-enable a route removed by a newer edit');
await stale.finish(2);
