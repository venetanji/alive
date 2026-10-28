import test from 'node:test';
import assert from 'node:assert/strict';
import {createMasterProducer} from './alive-master.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};

test('one in flight, reset precedes superseding gain, and second reset is refused',async()=>{
  const calls=[],pending=[];const notices=[];
  const producer=createMasterProducer({invoke:(name,args)=>{calls.push([name,args]);const d=deferred();pending.push(d);return d.promise;},onStatus:s=>notices.push(s)});
  producer.setGeneration(7);producer.gain(.1);producer.gain(.2);producer.reset();producer.gain(.3);
  assert.equal(producer.reset(),false);assert.match(notices.at(-1).message,/pending/i);
  assert.deepEqual(calls,[['alive_master',{generation:7,gain:.1}]]);
  pending[0].resolve({generation:7,acceptedGain:.1,acceptedSerial:'1',changed:true});await tick();
  assert.deepEqual(calls[1],['alive_master_reset_clip',{generation:7}]);
  pending[1].resolve({generation:7,acceptedSerial:'2'});await tick();
  assert.deepEqual(calls[2],['alive_master',{generation:7,gain:.3}]);
  pending[2].resolve({generation:7,acceptedGain:.3,acceptedSerial:'3',changed:true});await tick();
});

test('busy retains final gain and one retry timer; generation cancels late work',async()=>{
  const calls=[],pending=[],timers=[];const notices=[];
  const producer=createMasterProducer({invoke:(name,args)=>{calls.push([name,args]);const d=deferred();pending.push(d);return d.promise;},onStatus:s=>notices.push(s),setTimer:fn=>{timers.push(fn);return timers.length;},clearTimer:()=>{}});
  producer.setGeneration(1);producer.gain(.25);pending[0].reject({code:'BUSY',message:'retiring'});await tick();
  assert.equal(timers.length,1);producer.gain(.75);assert.equal(calls.length,1);
  timers[0]();await tick();assert.deepEqual(calls[1],['alive_master',{generation:1,gain:.75}]);
  producer.setGeneration(2);pending[1].resolve({generation:1,acceptedGain:.75,acceptedSerial:'1',changed:true});await tick();
  assert.equal(notices.some(s=>s.receipt?.generation===1),false);
});

test('retry preserves reset ordering and permanent failures never retry',async()=>{
  const calls=[],pending=[],timers=[],status=[];
  const producer=createMasterProducer({invoke:(name,args)=>{calls.push([name,args]);const d=deferred();pending.push(d);return d.promise;},onStatus:s=>status.push(s),setTimer:fn=>(timers.push(fn),timers.length)});
  producer.setGeneration(3);producer.reset();producer.gain(.2);
  pending[0].reject({code:'FULL',message:'queue full'});await tick();assert.equal(timers.length,1);
  producer.gain(.9);assert.equal(producer.reset(),false);timers[0]();
  assert.equal(calls[1][0],'alive_master_reset_clip');pending[1].resolve({generation:3,acceptedSerial:'10'});await tick();
  assert.deepEqual(calls[2],['alive_master',{generation:3,gain:.9}]);pending[2].reject({code:'INVALID',message:'invalid value'});await tick();
  assert.equal(timers.length,1);assert.match(status.at(-1).message,/invalid value/);
});

test('ordinal exhaustion refuses intent without wrapping',()=>{
  const calls=[],status=[];const producer=createMasterProducer({invoke:(name,args)=>(calls.push([name,args]),new Promise(()=>{})),onStatus:s=>status.push(s),maxOrdinal:1});
  producer.setGeneration(1);assert.equal(producer.gain(.5),true);assert.equal(producer.gain(.6),false);assert.match(status.at(-1).message,/exhausted/);assert.equal(calls.length,1);
});

test('malformed receipts are refused and unavailable generation cannot send',async()=>{
  const statuses=[];const pending=deferred();let calls=0;
  const producer=createMasterProducer({invoke:()=>{calls++;return pending.promise;},onStatus:s=>statuses.push(s)});
  assert.equal(producer.gain(.4),false);assert.equal(calls,0);
  producer.setGeneration(4);producer.gain(.4);pending.resolve({generation:4,acceptedGain:.4,acceptedSerial:'bad',changed:true});await tick();
  assert.match(statuses.at(-1).message,/receipt/i);assert.equal(statuses.at(-1).error,true);
});

test('permanent gain refusal retains the requested value in visible status',async()=>{
  const pending=deferred(),statuses=[];const producer=createMasterProducer({invoke:()=>pending.promise,onStatus:s=>statuses.push(s)});
  producer.setGeneration(1);producer.gain(.42);pending.reject({code:'UNSUPPORTED',message:'unavailable'});await tick();
  assert.equal(statuses.at(-1).value,.42);assert.equal(statuses.at(-1).error,true);
});

test('permanent bridge codes do not retry, even if message mentions busy',async()=>{
  for(const code of ['STALE_GENERATION','INVALID','UNSUPPORTED','UNCONFIGURED','EXHAUSTED','INTERNAL']){
    const pending=deferred(),status=[],timers=[];const producer=createMasterProducer({invoke:()=>pending.promise,onStatus:s=>status.push(s),setTimer:fn=>timers.push(fn)});
    producer.setGeneration(1);producer.gain(.7);pending.reject({code,message:'busy, try again'});await tick();assert.equal(timers.length,0,code);assert.equal(status.at(-1).error,true,code);assert.equal(status.at(-1).value,.7,code);
  }
});

test('generation change cancels pending retry and late failure cannot affect new generation',async()=>{
  const calls=[],pending=[],timers=new Map(),status=[];let id=0;
  const producer=createMasterProducer({invoke:(name,args)=>{calls.push([name,args]);const d=deferred();pending.push(d);return d.promise;},onStatus:s=>status.push(s),setTimer:fn=>(timers.set(++id,fn),id),clearTimer:id=>timers.delete(id)});
  producer.setGeneration(1);producer.gain(.2);pending[0].reject({code:'FULL',message:'full'});await tick();assert.equal(timers.size,1);producer.setGeneration(2);assert.equal(timers.size,0);
  producer.gain(.6);assert.deepEqual(calls.at(-1),['alive_master',{generation:2,gain:.6}]);producer.setGeneration(3);producer.gain(.9);pending[1].reject({code:'UNSUPPORTED',message:'old generation'});await tick();assert.deepEqual(calls.at(-1),['alive_master',{generation:3,gain:.9}]);assert.equal(status.some(s=>s.message.includes('old generation')),false);
  pending[2].resolve({generation:3,acceptedGain:.9,acceptedSerial:'9',changed:true});await tick();
});

test('admission receipt must carry a nonzero native serial',async()=>{
  const pending=deferred(),status=[];const producer=createMasterProducer({invoke:()=>pending.promise,onStatus:s=>status.push(s)});
  producer.setGeneration(1);producer.gain(.4);pending.resolve({generation:1,acceptedGain:.4,acceptedSerial:'0',changed:true});await tick();assert.equal(status.at(-1).error,true);assert.equal(status.at(-1).value,.4);
});
