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
 return {context,calls,listeners,async finish(mask=2){
  // Let the serialized patch command reach its deliberately paused invoke.
  await Promise.resolve();
  assert(finishPatch,'Patch command was submitted');
  finishPatch({route_mask:mask});
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
console.log('PASS: pending patch edits preserve B key/focus releases; reconnect avoids inactive-device resets.');
