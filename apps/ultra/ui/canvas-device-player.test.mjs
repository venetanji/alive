import test from 'node:test';
import assert from 'node:assert/strict';

test('two input sources holding the same key release only after both let go',async()=>{
  const {createDevicePlayer}=await import('./canvas-device-player.mjs');
  const notes=[];const player=createDevicePlayer({send:async note=>{notes.push(note);return true;},stop:async()=>{throw Error('unexpected Stop');}});
  await player.press(60,'pointer:1');await player.press(60,'key:a');
  await player.release('pointer:1');assert.deepEqual(notes,[[60,100]]);
  await player.release('key:a');assert.deepEqual(notes,[[60,100],[60,0]]);
  assert.deepEqual(player.held(),[]);
});

test('lost focus releases held keys and a rejected note-off invokes the out-of-band Stop',async()=>{
  const {createDevicePlayer}=await import('./canvas-device-player.mjs');
  const notes=[];let stopped=0;
  const player=createDevicePlayer({send:async note=>{notes.push(note);return note[1]!==0;},stop:async()=>{stopped++;}});
  await player.press(60,'key:a');await player.press(64,'key:d');await player.releaseAll();
  assert.deepEqual(notes,[[60,100],[64,100],[60,0],[64,0]]);
  assert.equal(stopped,2);assert.deepEqual(player.held(),[]);
});

test('press and release retain order while native admission is pending',async()=>{
  const {createDevicePlayer}=await import('./canvas-device-player.mjs');
  const notes=[];let finish;
  const player=createDevicePlayer({send:note=>{notes.push(note);return note[1]?new Promise(resolve=>{finish=resolve;}):Promise.resolve(true);},stop:async()=>{}});
  const down=player.press(67,'key:g'),up=player.release('key:g');finish(true);
  await Promise.all([down,up]);assert.deepEqual(notes,[[67,100],[67,0]]);
  assert.deepEqual(player.held(),[]);
});
