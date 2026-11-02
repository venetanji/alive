import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('combined installed panel resources retain the exact source resource pair',async({page})=>{
  test.skip(!process.env.ALIVE_RESOURCE_PACK_FIXTURES,'Requires private qualified installed resource pack fixtures.');
  const fixtures=JSON.parse(await readFile(process.env.ALIVE_RESOURCE_PACK_FIXTURES,'utf8'));
  const paths=fixtures['current-20261102'];
  for(const kind of ['GUI','Graphics']){
    const body=await readFile(paths[kind]);
    await page.route(`**/fixture-${kind}`,route=>route.fulfill({body,contentType:'application/octet-stream'}));
  }
  await page.goto('/canvas.html');
  const result=await page.evaluate(async()=>{
    const {readLiveDeviceResources}=await import('/live-device-resources.mjs');
    const [guiBytes,graphicsBytes]=await Promise.all(['GUI','Graphics'].map(async kind=>new Uint8Array(await(await fetch(`/fixture-${kind}`)).arrayBuffer())));
    const source={guiSha256:'75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f',graphicsSha256:'ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d'};
    const resource=await readLiveDeviceResources({guiBytes,graphicsBytes,path:'Devices/UltraAnalog/Contents.xml',identity:source});
    let wrongSource=false,missingGraphics=false;
    try{await readLiveDeviceResources({guiBytes,graphicsBytes,identity:{...source,guiSha256:'0'.repeat(64)}});}catch(error){wrongSource=/identity/.test(error.message);}
    try{await readLiveDeviceResources({guiBytes,identity:source});}catch(error){missingGraphics=/Graphics/.test(error.message);}
    return{identity:resource.identity,resources:resource.layout.documents.length,nodes:resource.layout.nodeCount,wrongSource,missingGraphics};
  });
  expect(result).toEqual({identity:{guiSha256:'75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f',graphicsSha256:'ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d',resourceRelease:'current-20261102'},resources:17,nodes:719,wrongSource:true,missingGraphics:true});
});
