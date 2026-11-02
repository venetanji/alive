import {openLiveResourcePack,assertLiveResourcePair} from './live-resource-pack.mjs';
import {loadLiveDeviceLayout} from './live-device-layout.mjs';

// A device's saved identity and both installed packs must agree before rendering.
export async function readLiveDeviceResources({guiBytes,graphicsBytes,path,locale,identity}={}){
  if(!(graphicsBytes instanceof Uint8Array))throw Error('Live device resources: Graphics pack is required.');
  const [gui,graphics]=await Promise.all([
    openLiveResourcePack(guiBytes,'GUI'),openLiveResourcePack(graphicsBytes,'Graphics'),
  ]);
  const resourceRelease=assertLiveResourcePair(gui,graphics);
  if(identity!==undefined&&(!identity||identity.guiSha256!==gui.sha256||identity.graphicsSha256!==graphics.sha256)){
    throw Error('Live device resources: installed resource identity does not match the saved device.');
  }
  return Object.freeze({gui,graphics,layout:loadLiveDeviceLayout({gui,path,locale}),
    identity:Object.freeze({guiSha256:gui.sha256,graphicsSha256:graphics.sha256,resourceRelease})});
}
