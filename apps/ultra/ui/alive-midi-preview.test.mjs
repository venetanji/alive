import test from 'node:test';
import assert from 'node:assert/strict';
import {createMidiPreview} from './alive-midi-preview.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('Preview is off initially, coalesces pitch motion and releases a late accepted note',async()=>{
  const calls=[];let accept;
  const producer=createMidiPreview({invoke:async(name,args)=>{calls.push({name,args});if(args.action==='note')return new Promise(resolve=>accept=resolve);return{};}});
  producer.configure({generation:1,preparationRevision:'4',trackId:'track-a',sourceId:'source-a',available:true});
  producer.note({pitch:60,velocity:100});await tick();assert.equal(calls.length,0);
  producer.enabled(true);producer.note({pitch:60,velocity:100});producer.note({pitch:61,velocity:100});producer.note({pitch:62,velocity:100});await tick();
  assert.equal(calls.length,1);assert.equal(calls[0].args.pitch,60);
  accept({serial:'1'});await tick();assert.equal(calls.length,2);assert.equal(calls[1].args.pitch,62);
  producer.release();accept({serial:'2'});await tick();assert.equal(calls.at(-1).args.action,'release');assert.equal(calls.at(-1).args.serial,'2');
});
test('scope changes release original native owner and missing capability never fabricates audio',async()=>{
  const calls=[];const producer=createMidiPreview({invoke:async(_,args)=>{calls.push(args);return{serial:'9'};}});
  producer.enabled(true);producer.configure({generation:1,preparationRevision:'4',trackId:'a',available:true});producer.note({pitch:67,velocity:80});await tick();
  producer.configure({generation:2,preparationRevision:'7',trackId:'b',available:false});await tick();
  assert.equal(calls.at(-1).generation,1);assert.equal(calls.at(-1).preparationRevision,'4');assert.equal(calls.at(-1).action,'release');
  producer.note({pitch:70,velocity:80});await tick();assert.equal(calls.length,2);producer.dispose();
});
