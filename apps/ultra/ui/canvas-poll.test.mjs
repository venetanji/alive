import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCanvasPoller} from './canvas-poll.mjs';

function clock(poll){
  const timers=new Map();let serial=0,hidden=false;
  const scheduler=createCanvasPoller({poll,hidden:()=>hidden,setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id)});
  return {scheduler,timers,setHidden(value){hidden=value;scheduler.visibilityChanged();},
    async tick(){assert.equal(timers.size,1);const [id,timer]=[...timers][0];timers.delete(id);await timer.fn();}};
}
test('visibility changes keep a single poll and resume immediately',async()=>{
  let calls=0;const p=clock(async()=>calls++);p.scheduler.start();
  assert.equal([...p.timers.values()][0].ms,100);
  p.setHidden(true);assert.equal(p.timers.size,1);assert.equal([...p.timers.values()][0].ms,1000);
  await p.tick();assert.equal(calls,1);assert.equal([...p.timers.values()][0].ms,1000);
  p.setHidden(false);assert.equal([...p.timers.values()][0].ms,0);
  await p.tick();assert.equal(calls,2);assert.equal([...p.timers.values()][0].ms,100);
  p.scheduler.stop();assert.equal(p.timers.size,0);
});
test('an in-flight poll does not overlap after restoring or reschedule after disposal',async()=>{
  let finish,calls=0;const p=clock(()=>{calls++;return new Promise(resolve=>finish=resolve);});
  p.scheduler.start();const ticking=p.tick();
  p.setHidden(true);p.setHidden(false);assert.equal(p.timers.size,0);assert.equal(calls,1);
  finish();await ticking;assert.equal([...p.timers.values()][0].ms,0);
  const last=p.tick();p.scheduler.stop();finish();await last;assert.equal(p.timers.size,0);
});
