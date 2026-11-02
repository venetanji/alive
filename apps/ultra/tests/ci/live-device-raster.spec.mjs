import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {png,rasterCases} from './live-device-raster-fixtures.mjs';

for(const {name,bytes,mode,pixels}of rasterCases)test(`raster bytes: ${name}`,async({page})=>{
  await page.goto('/canvas.html');
  const result=await page.evaluate(async({bytes,mode})=>{
    const {decodeLiveRasterPNG}=await import('/live-device-raster.mjs');
    URL.createObjectURL=()=>{throw Error('unexpected URL ownership');};
    window.createImageBitmap=()=>{throw Error('unexpected bitmap ownership');};
    const source=Uint8Array.from(bytes),pending=decodeLiveRasterPNG(source,{mode});source.fill(0);
    const image=await pending,first=[...image.copyPixels()];image.copyPixels().fill(99);
    return{first,second:[...image.copyPixels()],frozen:Object.isFrozen(image),
      tinted:mode==='coverage'?[...image.tint([3,195,213,128]).copyPixels()]:null};
  },{bytes:[...bytes],mode});
  expect(result.first).toEqual(pixels);expect(result.second).toEqual(pixels);expect(result.frozen).toBe(true);
  if(mode==='coverage')expect(result.tinted).toEqual(pixels.flatMap(alpha=>[3,195,213,Math.round(alpha*128/255)]));
});

test('raster bounded inflation, strict coverage and cancellation run in Chromium',async({page})=>{
  await page.goto('/canvas.html');
  const errors=await page.evaluate(async cases=>{
    const {decodeLiveRasterPNG,createLiveDeviceRaster}=await import('/live-device-raster.mjs');
    const errors=[];
    for(const bytes of cases){try{await decodeLiveRasterPNG(Uint8Array.from(bytes),{mode:'coverage'});errors.push('accepted');}catch(error){errors.push(error.message);}}
    const controller=new AbortController(),pending=decodeLiveRasterPNG(Uint8Array.from(cases[0]),{signal:controller.signal});
    controller.abort();try{await pending;errors.push('accepted');}catch(error){errors.push(error.message);}
    try{createLiveDeviceRaster({},{read(){throw Error('unverified read');}});errors.push('accepted');}catch(error){errors.push(error.message);}
    return errors;
  },[png({raw:new Uint8Array(2*1024*1024)}),png({width:513}),png({raw:[0,1,2,3,255]})].map(bytes=>[...bytes]));
  expect(errors[0]).toMatch(/inflated scanline count/);expect(errors[1]).toMatch(/dimensions/);
  expect(errors[2]).toMatch(/grayscale/);expect(errors[3]).toMatch(/cancelled/);expect(errors[4]).toMatch(/verified resource pack pair/);
});

test('private verified artwork pixels and replacement lifecycle in Chromium',async({page})=>{
  test.skip(!process.env.ALIVE_RASTER_FIXTURES,'Exact installed artwork is opt-in/private.');
  const fixture=JSON.parse(await readFile(process.env.ALIVE_RASTER_FIXTURES,'utf8'));
  for(const kind of ['GUI','Graphics'])await page.route(`**/__raster-private__/${kind}`,async route=>{
    await route.fulfill({body:await readFile(fixture[kind]),contentType:'application/octet-stream'});
  });
  await page.goto('/canvas.html');
  const result=await page.evaluate(async expected=>{
    const {openLiveResourcePack}=await import('/live-resource-pack.mjs');
    const {createLiveDeviceRaster}=await import('/live-device-raster.mjs');
    const [gui,graphics]=await Promise.all(['GUI','Graphics'].map(async kind=>openLiveResourcePack(new Uint8Array(await(await fetch(`/__raster-private__/${kind}`)).arrayBuffer()),kind)));
    const owner=createLiveDeviceRaster(gui,graphics),hashes={};
    for(const family of ['Devices/Electric','Devices/Electric/Large']){
      owner.selectFamily(family);
      for(const name of ['Base','00','01','02','03','04']){
        const path=`${family}/DeviceSchema${name}.png`,mode=name==='Base'?'rgba':'coverage';
        const image=await owner.load(`DeviceSchema${name}.png`,{mode});
        hashes[path]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',image.copyPixels())),b=>b.toString(16).padStart(2,'0')).join('');
        if(hashes[path]!==expected[path][mode])throw Error(`pixel mismatch: ${path}`);
        const rgba=await owner.load(`DeviceSchema${name}.png`);
        const rgbaHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',rgba.copyPixels())),b=>b.toString(16).padStart(2,'0')).join('');
        if(rgbaHash!==expected[path].rgba)throw Error(`RGBA mismatch: ${path}`);
      }
    }
    const cached=owner.load('DeviceSchemaBase.png');owner.selectFamily('Devices/Electric');
    let replaced=false;try{await cached;}catch(error){replaced=/cancelled/.test(error.message);}
    const pending=owner.load('DeviceSchemaBase.png');owner.dispose();
    let disposed=false;try{await pending;}catch(error){disposed=/cancelled/.test(error.message);}
    return{count:Object.keys(hashes).length,replaced,disposed,stats:owner.stats()};
  },fixture.pixels);
  expect(result).toEqual({count:12,replaced:true,disposed:true,stats:{entries:0,pending:0,decodedBytes:0,disposed:true}});
});
