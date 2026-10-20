import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {REGISTRY, CanvasDocument, createCanvasController, starterPatch, validatePatch, parsePatch, parseMessage, serializePatch} from './canvas-model.mjs';
const clone = x => structuredClone(x);
const tick = () => new Promise(r => setImmediate(r));
function host() {
  const calls = []; let revision = 0, running = false, patch;
  return {calls, invoke: async (name, args = {}) => {
    calls.push({name,args});
    if (name === 'canvas_apply') { patch = clone(args.patch); return {revision: ++revision}; }
    if (name === 'audio_start') running = true;
    if (name === 'audio_stop') running = false;
    if (name === 'audio_status') return {running, fault: false, server_lost: false};
    if (name === 'canvas_status') return {revision,active:true,nodes:patch.nodes.map(n => ({id:n.id,value:0,pulses:0}))};
    return true;
  }};
}
test('registry has exactly 15 protocol objects, exclusively top inlet / bottom outlet descriptors', () => {
  assert.equal(Object.keys(REGISTRY).length,15);
  for (const spec of Object.values(REGISTRY)) {
    assert.ok(spec.inlets.every(p => p.side === 'top'));
    assert.ok(spec.outlets.every(p => p.side === 'bottom'));
  }
});
test('starter is a valid real editable graph, including independent MIDI voice and explicit stereo join', () => {
  const patch = validatePatch(starterPatch());
  assert.equal(patch.nodes.filter(n=>n.type==='voice').length,2);
  assert.ok(patch.edges.some(e=>patch.nodes.find(n=>n.id===e.from).type==='midiin' && patch.nodes.find(n=>n.id===e.to).type==='voice'));
  assert.deepEqual(parsePatch(serializePatch(patch)),patch);
  assert.deepEqual(parsePatch(readFileSync(new URL('./canvas-preset.json',import.meta.url),'utf8')),patch);
});
test('add/delete/connect/disconnect and layout retain stable IDs and explicit fan-out order', () => {
  const model = new CanvasDocument({version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]});
  const a=model.add('bang',20,20), b=model.add('message',30,130), c=model.add('number',240,130);
  model.connect(a,0,b,0); model.connect(a,0,c,0);
  assert.deepEqual(model.patch.edges.map(e=>e.to),[b,c]);
  model.move(a,100,90); assert.equal(model.patch.nodes[0].x,100);
  model.disconnect(0); assert.equal(model.patch.edges.length,1);
  model.remove(a); assert.equal(model.patch.edges.length,0);
  const d=model.add('bang',0,0); assert.ok(d>c);
  model.undo(); assert.equal(model.patch.nodes.length,2);
  model.redo(); assert.equal(model.patch.nodes.at(-1).id,d);
});
test('strict validation rejects malformed, unknown, oversized, duplicate and cyclic edits atomically', () => {
  const model = new CanvasDocument(starterPatch()); const original=clone(model.patch);
  const bang=model.patch.nodes.find(n=>n.type==='bang');
  assert.throws(()=>model.connect(bang.id,0,bang.id,0),/cycl/i); assert.deepEqual(model.patch,original);
  const voice=model.patch.nodes.find(n=>n.type==='voice');
  assert.throws(()=>model.connect(voice.id,0,bang.id,0),/type/i);
  assert.throws(()=>parsePatch(' '.repeat(65537)),/64 KiB/i);
  for (const mutate of [p=>p.extra=1,p=>p.nodes[0].params.extra=1,p=>p.nodes[0].x=Infinity,p=>p.nodes[0].id=0,p=>p.edges.push({...p.edges[0]}),p=>p.nodes[0].type='js']) {
    const p=clone(original); mutate(p); assert.throws(()=>validatePatch(p));
  }
  assert.deepEqual(parseMessage('60 100'),[60,100]); assert.equal(parseMessage('bang'),null);
  for (const text of ['', 'hello', 'Infinity', '1 2 3 4', '100001','0x10']) assert.throws(()=>parseMessage(text));
});
test('audio supports missing paths and explicit dual mono, rejects parallel gains and duplicate devices', () => {
  const p=starterPatch(), voices=p.nodes.filter(n=>n.type==='voice'), gains=p.nodes.filter(n=>n.type==='gain'), join=p.nodes.find(n=>n.type==='join');
  p.edges=p.edges.filter(e=>!(e.to===join.id&&e.inlet===1)); p.edges.push({from:gains[0].id,outlet:0,to:join.id,inlet:1}); validatePatch(p);
  p.nodes.find(n=>n.id===voices[1].id).params.device=0; assert.throws(()=>validatePatch(p),/device/i);
  const q=starterPatch(); q.edges.push({from:voices[0].id,outlet:0,to:gains[1].id,inlet:0}); assert.throws(()=>validatePatch(q),/audio|gain/i);
});
test('parameter edit and undo round trip without mutating past snapshots; message is structural', () => {
  const m=new CanvasDocument(starterPatch()); const n=m.patch.nodes.find(n=>n.type==='number');
  m.parameter(n.id,'value',12); assert.equal(m.patch.nodes.find(x=>x.id===n.id).params.value,12); m.undo(); assert.equal(m.patch.nodes.find(x=>x.id===n.id).params.value,n.params.value);
  const msg=m.patch.nodes.find(n=>n.type==='message'); m.parameter(msg.id,'text','60 100'); assert.equal(m.patch.nodes.find(x=>x.id===msg.id).params.text,'60 100');
  assert.throws(()=>m.parameter(n.id,'value',100001));
});
test('preview can edit and export but never invents runtime execution', async () => {
  const c=createCanvasController(); await c.prepare(); c.add('add',0,0); await c.startAudio(); await c.event(1,0,null);
  assert.equal(c.getState().native,false); assert.equal(c.getState().revision,null); assert.deepEqual(c.getState().observations,{});
  assert.match(c.getState().notice,/preview|native/i);
});
test('prepare precedes audio; start retains stopped graph; actual events include revision and own hot number inlet', async () => {
  const h=host(),c=createCanvasController({invoke:h.invoke}); await c.startAudio();
  assert.ok(h.calls.findIndex(x=>x.name==='canvas_apply')<h.calls.findIndex(x=>x.name==='audio_start'));
  assert.equal(c.getState().ready,true);
  const number=c.getState().patch.nodes.find(n=>n.type==='number'); await c.parameter(number.id,'value',72); await c.flush();
  assert.ok(h.calls.some(x=>x.name==='canvas_param'&&x.args.node===number.id&&x.args.value===72));
  assert.ok(h.calls.some(x=>x.name==='canvas_event'&&x.args.node===number.id&&x.args.inlet===0&&x.args.value[0]===72));
  const applied=h.calls.filter(x=>x.name==='canvas_apply').length; c.move(number.id,10,10); await c.flush(); assert.equal(h.calls.filter(x=>x.name==='canvas_apply').length,applied);
});
test('parameter dragging uses bounded latest-wins native admission and never stops/reapplies graph', async () => {
  const h=host(); let release; const c=createCanvasController({invoke:async(name,args)=>{
    if(name==='canvas_param'&&!release) await new Promise(r=>release=r); return h.invoke(name,args);
  }}); await c.startAudio(); const gain=c.getState().patch.nodes.find(n=>n.type==='gain');
  const before=h.calls.length; c.parameter(gain.id,'value',20);
  for(let i=21;i<=100;i++) c.parameter(gain.id,'value',i); await tick(); release(); await c.flush();
  const recent=h.calls.slice(before); assert.equal(recent.filter(x=>x.name==='canvas_param').length,2); assert.equal(recent.filter(x=>x.name==='canvas_param').at(-1).args.value,100);
  assert.equal(recent.filter(x=>['canvas_apply','canvas_stop'].includes(x.name)).length,0);
});
test('structural apply prevents stale actions, resets observations, and retains valid graph on native rejection', async () => {
  const h=host(); let reject=false; const c=createCanvasController({invoke:(name,args)=>{if(name==='canvas_apply'&&reject)return Promise.reject(Error('native topology rejected'));return h.invoke(name,args);}});
  await c.startAudio(); const revision=c.getState().revision; reject=true; c.add('bang',20,20); await c.flush();
  assert.equal(c.getState().revision,revision); assert.equal(c.getState().ready,false); assert.match(c.getState().notice,/native topology rejected/);
  const before=h.calls.length; await c.event(1,0,null); assert.equal(h.calls.slice(before).filter(x=>x.name==='canvas_event').length,0);
});
test('latest structural graph wins while earlier apply is pending; intermediate controls never send', async () => {
  const h=host(); let block=false,release; const c=createCanvasController({invoke:async(name,args)=>{if(name==='canvas_apply'&&block){block=false;await new Promise(r=>release=r);}return h.invoke(name,args);}});
  await c.startAudio(); block=true; c.add('bang',10,10); await tick(); c.add('add',20,20); await c.event(1,0,null); release(); await c.flush();
  assert.equal(c.getState().ready,true); assert.equal(h.calls.filter(x=>x.name==='canvas_apply').at(-1).args.patch.nodes.length,starterPatch().nodes.length+2);
  assert.equal(h.calls.filter(x=>x.name==='canvas_event').length,0);
});
test('native observations, stop, panic and awaited navigation cleanup use native commands', async () => {
  const h=host(),c=createCanvasController({invoke:h.invoke}); await c.startAudio(); await c.poll(); assert.ok(Object.keys(c.getState().observations).length>0);
  await c.stop(); assert.equal(h.calls.filter(x=>x.name==='canvas_stop').length>=1,true);
  await c.panic(); assert.equal(h.calls.at(-1).name,'audio_panic'); await c.stopAudio(); assert.equal(c.getState().ready,false);
  await c.dispose(); assert.ok(h.calls.some(x=>x.name==='audio_stop'));
});
test('MIDI channel and voice device edits are structural safety boundaries', async () => {
  const h=host(),c=createCanvasController({invoke:h.invoke}); await c.startAudio();
  const midi=c.getState().patch.nodes.find(n=>n.type==='midiin'); const before=h.calls.length;
  c.parameter(midi.id,'channel',3); await c.flush();
  assert.ok(h.calls.slice(before).some(x=>x.name==='canvas_apply')); assert.ok(!h.calls.slice(before).some(x=>x.name==='canvas_param'));
});
test('failed native startup never claims audio ready and reports backend reason', async () => {
  const h=host();const c=createCanvasController({invoke:(name,args)=>name==='audio_start'?Promise.resolve({running:false,message:'JACK server is unavailable'}):name==='audio_status'?Promise.resolve({running:false,message:'JACK server is unavailable'}):h.invoke(name,args)});
  await c.startAudio();assert.equal(c.getState().ready,false);assert.match(c.getState().notice,/JACK server is unavailable/);assert.doesNotMatch(c.getState().notice,/Audio ready/);
});
test('event queue overflow fails closed instead of dropping a possible note termination', async () => {
  const h=host();let release;const c=createCanvasController({invoke:async(name,args)=>{if(name==='canvas_event'&&!release)await new Promise(r=>release=r);return h.invoke(name,args);}});await c.startAudio();
  const stops=h.calls.filter(x=>x.name==='canvas_stop').length;c.event(6,0,[60,100]);for(let i=0;i<64;i++)c.event(6,0,[60,100]);const overflow=c.event(6,0,[60,0]);await tick();
  assert.ok(h.calls.filter(x=>x.name==='canvas_stop').length>stops,'Overflow must stop native notes');assert.equal(c.getState().ready,false);release();await overflow;await c.flush();assert.match(c.getState().notice,/queue|overflow/i);
});
test('dispose while startup is pending cancels startup and always stops native audio', async () => {
  const h=host();let release;const c=createCanvasController({invoke:async(name,args)=>{if(name==='canvas_apply'&&!release)await new Promise(r=>release=r);return h.invoke(name,args);}});
  const start=c.startAudio();await tick();const done=c.dispose();release();await Promise.all([start,done]);assert.ok(h.calls.some(x=>x.name==='audio_stop'));assert.equal(c.getState().ready,false);assert.equal(c.getState().status.running,false);
});
test('missing known parameters normalize to protocol defaults but unknown parameters still reject', () => {
  const p=starterPatch();p.nodes.find(n=>n.type==='number').params={};const result=validatePatch(p);assert.deepEqual(result.nodes.find(n=>n.type==='number').params,{value:0});
  p.nodes.find(n=>n.type==='number').params={unknown:0};assert.throws(()=>validatePatch(p),/Unknown/);
});
test('Panic cancels a pending startup and cannot be overwritten by an apply result', async()=>{
  const h=host();let release;const c=createCanvasController({invoke:async(name,args)=>{if(name==='canvas_apply'&&!release)await new Promise(r=>release=r);return h.invoke(name,args);}});
  const start=c.startAudio();await tick();const panic=c.panic();release();await Promise.all([start,panic]);assert.ok(!h.calls.some(x=>x.name==='audio_start'));assert.equal(c.getState().faulted,true);assert.equal(c.getState().ready,false);
});
test('undo and redo of numeric parameters remain live, while topology undo reapplies',async()=>{
  const h=host(),c=createCanvasController({invoke:h.invoke});await c.startAudio();const gain=c.getState().patch.nodes.find(n=>n.type==='gain');await c.parameter(gain.id,'value',20);await c.flush();
  const before=h.calls.length;c.undo();await c.flush();c.redo();await c.flush();const recent=h.calls.slice(before);assert.equal(recent.filter(x=>x.name==='canvas_apply').length,0);assert.deepEqual(recent.filter(x=>x.name==='canvas_param').map(x=>x.args.value),[90,20]);
  c.add('bang',0,0);await c.flush();const applyCount=h.calls.filter(x=>x.name==='canvas_apply').length;c.undo();await c.flush();assert.equal(h.calls.filter(x=>x.name==='canvas_apply').length,applyCount+1);
});
test('native audio fault retains the backend reason and recovery instruction',async()=>{
  const h=host(),c=createCanvasController({invoke:async(name,args)=>{
    const result=await h.invoke(name,args);
    return name==='audio_status'?{...result,fault:true,message:'JACK period exceeded 1024 frames.'}:result;
  }});
  await c.prepare();await c.poll();
  assert.match(c.getState().notice,/JACK period exceeded 1024 frames/);
  assert.match(c.getState().notice,/Stop audio/);
});
