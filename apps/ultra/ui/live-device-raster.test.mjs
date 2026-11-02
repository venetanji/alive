import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {chunk,png,rasterCases} from '../tests/ci/live-device-raster-fixtures.mjs';
import {createLiveDeviceRaster,decodeLiveRasterPNG} from './live-device-raster.mjs';
import {openLiveResourcePack} from './live-resource-pack.mjs';

for(const {name,bytes,mode,pixels}of rasterCases)test(`PNG preserves ${name}`,async()=>{
  const source=new Uint8Array(bytes),pending=decodeLiveRasterPNG(source,{mode});source.fill(0);
  const image=await pending;
  assert.deepEqual([...image.copyPixels()],pixels);
  image.copyPixels().fill(99);
  assert.deepEqual([...image.copyPixels()],pixels);
  assert.ok(Object.isFrozen(image));
  if(mode==='coverage'){
    const tinted=image.tint([3,195,213,128]);
    assert.deepEqual([...tinted.copyPixels()],pixels.flatMap(alpha=>[3,195,213,Math.round(alpha*128/255)]));
    assert.throws(()=>image.tint([0,0,256,255]),/tint/);
  }
});

test('all five PNG filters reconstruct exact previous-row and left bytes',async()=>{
  for(const filter of [0,1,2,3,4]){
    const rows=[[10,20,30],[40,50,60]],raw=[];
    for(let y=0;y<2;y++){
      raw.push(filter);
      for(let x=0;x<3;x++){
        const a=rows[y][x-1]??0,b=rows[y-1]?.[x]??0,c=rows[y-1]?.[x-1]??0,p=a+b-c;
        const pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
        const predictor=[0,a,b,Math.floor((a+b)/2),pa<=pb&&pa<=pc?a:pb<=pc?b:c][filter];
        raw.push((rows[y][x]-predictor)&255);
      }
    }
    assert.deepEqual([...(await decodeLiveRasterPNG(png({width:3,height:2,type:0,raw}),{mode:'coverage'})).copyPixels()],rows.flat());
  }
});

test('maximum supported RGBA dimensions decode without a full inflated scanline copy',async()=>{
  const image=await decodeLiveRasterPNG(png({width:512,height:512,raw:new Uint8Array((512*4+1)*512)}));
  assert.equal(image.width,512);assert.equal(image.height,512);assert.equal(image.byteLength,1024*1024);
  assert.ok(image.copyPixels().every(byte=>byte===0));
});

test('PNG validation bounds bytes, format, chunks, inflation, and coverage',async()=>{
  const crc=png();crc[crc.length-1]^=1;
  const invalid=[new Uint8Array(1024*1024+1),new Uint8Array(8),crc,
    png({width:513}),png({height:0}),png({depth:16}),png({interlace:1}),png({type:1}),
    png({raw:[0,1,2,3,4,5]}),png({raw:[0,1]}),png({raw:[5,1,2,3,4]}),
    png({before:[chunk('acTL',[0,0,0,1,0,0,0,0])]}),png({before:[chunk('NOPE')]}),
    png({after:[chunk('IDAT',[1])]}),png({before:[chunk('tRNS',[1])]}),
    png({type:3,raw:[0,1],before:[chunk('PLTE',[1,2,3])]}),
    new Uint8Array([...png(),0]),png({type:3,raw:[0,0]}),
    png({before:Array.from({length:256},()=>chunk('tEXt'))})];
  invalid.push(png({raw:new Uint8Array(2*1024*1024)}));
  invalid.push(png({compressed:new Uint8Array([...deflateSync(Uint8Array.of(0,1,2,3,4)),0])}));
  for(const bytes of invalid)await assert.rejects(decodeLiveRasterPNG(bytes),/Live raster/);
  await assert.rejects(decodeLiveRasterPNG(png({raw:[0,1,2,3,255]}),{mode:'coverage'}),/grayscale/);
  await assert.rejects(decodeLiveRasterPNG(png(),{mode:'guess'}),/mode/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(decodeLiveRasterPNG(png(),{signal:controller.signal}),/cancelled/);
  const running=new AbortController(),pending=decodeLiveRasterPNG(png(),{signal:running.signal});
  running.abort();await assert.rejects(pending,/cancelled/);
});

test('verified ownership refuses duck-typed packs without reading bytes',()=>{
  const fake={kind:'Graphics',sha256:'x',resourceRelease:'current-20261102',has:()=>true,read:()=>{assert.fail('read unverified pack');}};
  assert.throws(()=>createLiveDeviceRaster({},fake),/verified resource pack pair/);
  assert.throws(()=>createLiveDeviceRaster(null,null),/verified resource pack pair/);
});

test('private exact artwork and verified owner lifecycle', {skip:!process.env.ALIVE_RASTER_FIXTURES},async()=>{
  const fixture=JSON.parse(await readFile(process.env.ALIVE_RASTER_FIXTURES,'utf8'));
  const gui=await openLiveResourcePack(new Uint8Array(await readFile(fixture.GUI)),'GUI');
  const graphics=await openLiveResourcePack(new Uint8Array(await readFile(fixture.Graphics)),'Graphics');
  const owner=createLiveDeviceRaster(gui,graphics);
  await assert.rejects(owner.load('DeviceSchemaBase.png'),/family/);
  assert.throws(()=>owner.selectFamily('https://arbitrary'),/unsafe resource path/);
  owner.selectFamily('Devices/Electric');
  for(const path of ['../x','/x','x\\y','a:b'])await assert.rejects(owner.load(path),/unsafe resource path/);
  await assert.rejects(owner.load('missing.png'),/not found/);
  for(const family of ['Devices/Electric','Devices/Electric/Large']){
    owner.selectFamily(family);
    assert.equal(owner.stats().entries,0);
    for(const name of ['Base','00','01','02','03','04']){
      const path=`${family}/DeviceSchema${name}.png`,mode=name==='Base'?'rgba':'coverage';
      const first=owner.load(`DeviceSchema${name}.png`,{mode});
      assert.equal(owner.load(`DeviceSchema${name}.png`,{mode}),first);
      const image=await first;
      const sha=createHash('sha256').update(image.copyPixels()).digest('hex');
      assert.equal(sha,fixture.pixels[path][mode]);
      const rgba=await decodeLiveRasterPNG(graphics.read(path));
      assert.equal(createHash('sha256').update(rgba.copyPixels()).digest('hex'),fixture.pixels[path].rgba);
      assert.equal(image.width,family.endsWith('Large')?180:90);
      assert.ok(owner.stats().decodedBytes<=2*1024*1024);
      assert.equal(await owner.load(`DeviceSchema${name}.png`,{mode}),image);
    }
    const rgba=await owner.load('DeviceSchema00.png');
    const mask=await owner.load('DeviceSchema00.png',{mode:'coverage'});
    assert.notEqual(rgba.mode,mask.mode);
  }
  const cached=owner.load('DeviceSchemaBase.png');
  owner.selectFamily('Devices/Electric');
  await assert.rejects(cached,/cancelled/);
  const requests=[];
  for(const directory of ['', 'Large/'])for(const name of ['00','01','02','03','04','Base'])for(const mode of ['rgba','coverage']){
    if(requests.length<16)requests.push(owner.load(`${directory}DeviceSchema${name}.png`,{mode}));
  }
  assert.equal(owner.stats().pending,16);
  await assert.rejects(owner.load('Large/DeviceSchema02.png'),/pending entry limit/);
  const settled=Promise.allSettled(requests);owner.selectFamily('Devices/Electric/Large');
  assert.ok((await settled).every(result=>result.status==='rejected'&&/cancelled/.test(result.reason.message)));
  owner.selectFamily('Devices/Electric');
  let first;
  for(const directory of ['', 'Large/'])for(const name of ['Base','00','01','02','03','04'])for(const mode of ['rgba','coverage']){
    const image=await owner.load(`${directory}DeviceSchema${name}.png`,{mode});first??=image;
    assert.ok(owner.stats().entries<=16);assert.ok(owner.stats().decodedBytes<=2*1024*1024);
  }
  assert.notEqual(await owner.load('DeviceSchemaBase.png'),first);
  owner.selectFamily('Products');
  let largestFirst;
  for(const path of fixture.budgetPaths){
    const image=await owner.load(path);largestFirst??=image;
    assert.ok(owner.stats().decodedBytes<=2*1024*1024);
  }
  assert.ok(owner.stats().entries<fixture.budgetPaths.length);
  assert.notEqual(await owner.load(fixture.budgetPaths[0]),largestFirst);
  owner.selectFamily('Devices/Electric/Large');owner.selectFamily('Devices/Electric');
  const stale=owner.load('DeviceSchemaBase.png');owner.selectFamily('Devices/Electric/Large');
  await assert.rejects(stale,/cancelled/);
  const disposed=owner.load('DeviceSchemaBase.png');owner.dispose();
  await assert.rejects(disposed,/cancelled/);
  assert.deepEqual(owner.stats(),{entries:0,pending:0,decodedBytes:0,disposed:true});
  await assert.rejects(owner.load('DeviceSchemaBase.png'),/disposed/);
  assert.throws(()=>owner.selectFamily('Devices/Electric'),/disposed/);
  owner.dispose();
});
