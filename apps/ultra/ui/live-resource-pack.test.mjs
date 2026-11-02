import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as reader from './live-resource-pack.mjs';

test('pack pair validation rejects unverified objects and wrong kinds',()=>{
  assert.equal(typeof reader.assertLiveResourcePair,'function');
  for(const pair of [[{},{}],[{kind:'GUI',resourceRelease:'current-20261102'},{kind:'Graphics',resourceRelease:'current-20261102'}],[null,null]])
    assert.throws(()=>reader.assertLiveResourcePair(...pair),/verified resource pack pair/);
});

test('resource paths and pack bounds remain strict',async()=>{
  for(const path of ['../a','a//b','a\\b','a:b','/a','a/'])assert.throws(()=>reader.safeResourcePath(path),/unsafe resource path/);
  assert.equal(reader.safeResourcePath('Devices/Example/Contents.xml'),'Devices/Example/Contents.xml');
  await assert.rejects(reader.openLiveResourcePack(new Uint8Array(1),'GUI'),/identity \(size\)/);
  await assert.rejects(reader.openLiveResourcePack(new Uint8Array(1),'Other'),/unsupported pack kind/);
});

test('exact retained and current packs open, remain immutable, and cannot form mixed pairs',{
  skip:!process.env.ALIVE_RESOURCE_PACK_FIXTURES,
},async()=>{
  const fixtures=JSON.parse(await readFile(process.env.ALIVE_RESOURCE_PACK_FIXTURES,'utf8'));
  const opened={};
  for(const [release,paths]of Object.entries(fixtures)){
    opened[release]={};
    for(const kind of ['GUI','Graphics']){
      const source=new Uint8Array(await readFile(paths[kind]));
      const pending=reader.openLiveResourcePack(source,kind);
      source.fill(0);
      const pack=await pending;
      assert.equal(pack.resourceRelease,release);
      assert.equal(pack.kind,kind);
      assert.equal(Object.isFrozen(pack),true);
      assert.ok(pack.entries.length>2000);
      const entry=pack.entries.find(e=>e.size),original=pack.read(entry.path);
      const copy=pack.read(entry.path);copy.fill(0);
      assert.deepEqual(pack.read(entry.path),original);
      opened[release][kind]=pack;
      const tampered=new Uint8Array(await readFile(paths[kind]));tampered[100]^=1;
      await assert.rejects(reader.openLiveResourcePack(tampered,kind),/identity \(SHA-256\)/);
    }
    const {GUI,Graphics}=opened[release];
    assert.equal(reader.assertLiveResourcePair(GUI,Graphics),release);
    assert.throws(()=>reader.assertLiveResourcePair(Graphics,GUI),/verified resource pack pair/);
    assert.throws(()=>reader.assertLiveResourcePair({...GUI},Graphics),/verified resource pack pair/);
  }
  assert.throws(()=>reader.assertLiveResourcePair(opened['retained-20261031'].GUI,opened['current-20261102'].Graphics),/same qualified release/);
});
