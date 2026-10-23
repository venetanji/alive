import assert from 'node:assert/strict';
import {test} from 'node:test';
import {OBJECTS} from './canvas-catalog.mjs';
import {validatePatch} from './canvas-model.mjs';
import {readFileSync} from 'node:fs';

test('every supported object has searchable original help and an executable example containing that object',async()=>{
  const {LIBRARY_ENTRIES,createLibraryPatch}=await import('./canvas-library.mjs');
  for(const type of Object.keys(OBJECTS))for(const kind of ['help','example']){
    const entry=LIBRARY_ENTRIES.find(entry=>entry.key===`${kind}:${type}`);assert.ok(entry,`${kind}:${type}`);
    assert.equal(entry.kind,kind);assert.ok(entry.title&&entry.summary&&entry.group);
    const patch=validatePatch(createLibraryPatch(entry.key));assert.ok(patch.nodes.some(node=>node.type===type),entry.key);
  }
  assert.throws(()=>createLibraryPatch('help:unsupported'),/unknown/i);
});

test('native help manifest and browser library contain the same runnable patches',async()=>{
  const {LIBRARY_ENTRIES,createLibraryPatch}=await import('./canvas-library.mjs');
  const manifest=JSON.parse(readFileSync(new URL('./canvas-library-data.json',import.meta.url),'utf8'));
  assert.deepEqual(manifest.entries,LIBRARY_ENTRIES.map(entry=>({...entry,patch:createLibraryPatch(entry.key)})));
});

test('library search finds aliases, topic words and an empty result without changing its entries',async()=>{
  const {searchLibrary}=await import('./canvas-library.mjs');
  assert.ok(searchLibrary('button','help').some(entry=>entry.key==='help:bang'));
  assert.ok(searchLibrary('timing','example').some(entry=>entry.key==='example:metro'));
  assert.deepEqual(searchLibrary('unknown-object-xyz'),[]);
});
