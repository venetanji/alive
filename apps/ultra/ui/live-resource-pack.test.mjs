import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {resourcePackFixture} from '../tests/live-resource-fixture.mjs';
import {decodeResourcePack,parseResourcePack,openLiveResourcePack} from './live-resource-pack.mjs';
import * as reader from './live-resource-pack.mjs';

test('decodes at absolute byte offsets, including the zero/key exception',()=>{
  const f=resourcePackFixture([{name:'Long.xml',text:' '.repeat(66000)+'<Ableton/>'}]);
  assert.deepEqual(decodeResourcePack(f.encrypted,f.key),f.decoded);
  assert.throws(()=>decodeResourcePack(f.encrypted,new Uint8Array(3)),/key/i);
});

test('indexes nested resources and returns isolated payloads',()=>{
  const f=resourcePackFixture(),pack=parseResourcePack(f.decoded,'GUI');
  assert.equal(pack.entries.length,2);
  assert.equal(pack.text('Devices/Example.xml'),'<Ableton/>');
  const b=pack.read('Devices/Example.xml');b.fill(0);
  assert.equal(pack.text('Devices/Example.xml'),'<Ableton/>');
  assert.throws(()=>pack.read('Missing.xml'),/not found/i);
  assert.throws(()=>pack.read('Devices'),/directory/i);
  assert.throws(()=>pack.read('../Example.xml'),/path/i);
});

test('rejects unsafe names, duplicate resources and directory payloads',()=>{
  for(const name of ['..','a/b','a\\b','.','a\u0000b'])assert.throws(()=>parseResourcePack(resourcePackFixture([{name}]).decoded,'GUI'),/name|path/i);
  assert.throws(()=>parseResourcePack(resourcePackFixture([{name:'a'},{name:'a'}]).decoded,'GUI'),/duplicate/i);
  const f=resourcePackFixture(),data=f.decoded.slice(),file=f.records.find(r=>r.name==='Example.xml');
  const index=Buffer.from(data).indexOf(file.record),trailer=index+file.record.length-36;
  new DataView(data.buffer).setUint32(trailer,65536,true);
  assert.throws(()=>parseResourcePack(data,'GUI'),/directory/i);
});

test('rejects truncated indexes, huge counts and overlapping payloads',()=>{
  const f=resourcePackFixture([{name:'a'},{name:'b'}]);
  assert.throws(()=>parseResourcePack(f.decoded.subarray(0,f.decoded.length-40),'GUI'),/bound|truncat/i);
  const huge=f.decoded.slice(),rootChildren=f.metadata+4+6+4;
  new DataView(huge.buffer).setUint32(rootChildren,0xffffffff,true);
  assert.throws(()=>parseResourcePack(huge,'GUI'),/count|limit/i);
  const overlap=f.decoded.slice(),b=f.records.find(r=>r.name==='b'),offset=Buffer.from(overlap).indexOf(b.record)+b.record.length-32;
  new DataView(overlap.buffer).setBigUint64(offset,12n,true);
  assert.throws(()=>parseResourcePack(overlap,'GUI'),/overlap|coverage/i);
});

test('rejects corrupt offsets, unexpected flags and ambiguous roots',()=>{
  const f=resourcePackFixture();
  const invalid=f.decoded.slice();new DataView(invalid.buffer).setBigUint64(4,BigInt(invalid.length+1),true);
  assert.throws(()=>parseResourcePack(invalid,'GUI'),/metadata/i);
  const unknown=f.decoded.slice(),file=f.records.find(r=>r.name==='Example.xml');
  new DataView(unknown.buffer).setUint32(Buffer.from(unknown).indexOf(file.record)+file.record.length-36,2,true);
  assert.throws(()=>parseResourcePack(unknown,'GUI'),/flags/i);
  const duplicate=Buffer.concat([f.decoded,f.decoded.subarray(f.metadata,f.metadata+14)]);
  assert.throws(()=>parseResourcePack(duplicate,'GUI'),/root/i);
});

test('installed reader refuses unqualified pack bytes before importing layouts',async()=>{
  await assert.rejects(()=>openLiveResourcePack(resourcePackFixture().encrypted,'GUI'),/unsupported|identity/i);
  await assert.rejects(()=>openLiveResourcePack(new Uint8Array(),'Other'),/kind/i);
});

test('resource pair admission rejects unverified pack objects',()=>{
 assert.equal(typeof reader.assertLiveResourcePair,'function');
 for(const pair of [[{},{}],[{kind:'GUI',resourceRelease:'current-20261102'},{kind:'Graphics',resourceRelease:'current-20261102'}],[null,null]])
  assert.throws(()=>reader.assertLiveResourcePair(...pair),/verified resource pack pair/);
});

test('qualified installed packs open without copying assets into fixtures',{
 skip:!process.env.ULTRA_LIVE_RESOURCE_DIR,
},async()=>{
 const opened={};
 for(const kind of ['GUI','Graphics']){
  const source=new Uint8Array(await readFile(path.join(process.env.ULTRA_LIVE_RESOURCE_DIR,kind+'.alp')));
  const pending=openLiveResourcePack(source,kind);source.fill(0);
  const pack=await pending;
  assert.ok(['retained-20261031','current-20261102'].includes(pack.resourceRelease));
  assert.equal(pack.kind,kind);assert.equal(Object.isFrozen(pack),true);
  assert.ok(pack.entries.length>2000);
  const entry=pack.entries.find(e=>e.size),original=pack.read(entry.path),copy=pack.read(entry.path);copy.fill(0);
  assert.deepEqual(pack.read(entry.path),original);opened[kind]=pack;
  const tampered=new Uint8Array(await readFile(path.join(process.env.ULTRA_LIVE_RESOURCE_DIR,kind+'.alp')));tampered[100]^=1;
  await assert.rejects(openLiveResourcePack(tampered,kind),/identity \(SHA-256\)/);
 }
 assert.equal(reader.assertLiveResourcePair(opened.GUI,opened.Graphics),opened.GUI.resourceRelease);
 assert.throws(()=>reader.assertLiveResourcePair(opened.Graphics,opened.GUI),/verified resource pack pair/);
 assert.throws(()=>reader.assertLiveResourcePair({...opened.GUI},opened.Graphics),/verified resource pack pair/);
});
