import test from 'node:test';
import assert from 'node:assert/strict';

test('default preset decompression accepts installed gzip transport bytes without interpreting XML',async()=>{
 const {decodeAnalogDefaultPreset}=await import('./analog-default-loader.mjs');
 const xml='<Ableton><UltraAnalog/></Ableton>';
 const compressed=await new Response(new Blob([xml]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
 assert.equal(await decodeAnalogDefaultPreset(compressed),xml);
 assert.equal(await decodeAnalogDefaultPreset(new Uint8Array(compressed)),xml);
});

test('default preset decompression bounds both transport and expanded bytes',async()=>{
 const {decodeAnalogDefaultPreset}=await import('./analog-default-loader.mjs');
 await assert.rejects(()=>decodeAnalogDefaultPreset(new Uint8Array(1024*1024+1)),/size/i);
 await assert.rejects(()=>decodeAnalogDefaultPreset(new Uint8Array([1,2,3])),/gzip/i);
 const compressed=await new Response(new Blob(['x'.repeat(1024*1024+1)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
 await assert.rejects(()=>decodeAnalogDefaultPreset(compressed),/expanded.*size/i);
});
