import {openLiveResourcePack,assertLiveResourcePair} from './live-resource-pack.mjs';
import {loadLiveDeviceLayout} from './live-device-layout.mjs';
import {createLiveDeviceView} from './live-device-view.mjs';

// Resource acquisition is injected; the same pipeline can serve a canvas object or a device host.
export async function readLiveDeviceResources({guiBytes,graphicsBytes,path,locale}={}){
  const gui=await openLiveResourcePack(guiBytes,'GUI');
  const graphics=graphicsBytes?await openLiveResourcePack(graphicsBytes,'Graphics'):null;
  if(graphics)assertLiveResourcePair(gui,graphics);
  return{gui,graphics,layout:loadLiveDeviceLayout({gui,path,locale})};
}

export function mountLiveDeviceResources({doc,readInstalledPack=null,resolveBinding,evaluateExpression,onError}={}){
  const host=doc.getElementById('live-resource-view'),status=doc.getElementById('live-resource-status'),files=doc.getElementById('live-resource-files'),installed=doc.getElementById('live-resource-installed'),details=doc.getElementById('live-resource-details');
  let view=null,generation=0,disposed=false;
  const notice=(message,error=false)=>{status.textContent=String(message);status.classList.toggle('error',error);};
  async function load(acquire){
    const ticket=++generation;notice('Reading the original Analog panel...');
    try{
      const bytes=await acquire();if(disposed||ticket!==generation)return;
      const resource=await readLiveDeviceResources(bytes);if(disposed||ticket!==generation)return;
      const next=createLiveDeviceView(doc,{layout:resource.layout,graphics:resource.graphics,resolveBinding,evaluateExpression,onError});
      host.replaceChildren(next.element);view?.dispose();view=next;
      notice(resolveBinding?"Original panel loaded. Start audio to edit the connected controls. Readouts use Analog's values and units.":'Original panel loaded. Preview only: synthesis controls are not connected yet.');
      details.textContent=`${resource.layout.documents.length} view resources; ${resource.layout.nodeCount} view instances.\n${next.report.controls-next.report.unresolved} of ${next.report.controls} controls have admitted mappings; unresolved controls stay disabled.\nUnimplemented drawing classes: ${next.report.unsupportedClasses.join(', ')||'none'}.`;
    }catch(error){if(!disposed&&ticket===generation)notice(error.message??error,true);}
  }
  const selected=()=>load(async()=>{
    const list=Array.from(files.files??[]);
    if(list.length<1||list.length>2||new Set(list.map(f=>f.name)).size!==list.length||list.some(f=>!['GUI.alp','Graphics.alp'].includes(f.name)))throw Error('Choose GUI.alp and, optionally, Graphics.alp from the installed Live Resources folder.');
    const gui=list.find(f=>f.name==='GUI.alp'),graphics=list.find(f=>f.name==='Graphics.alp');
    if(!gui)throw Error('Choose GUI.alp to load the original panel.');
    if(list.some(f=>f.size>64*1024*1024))throw Error('Resource pack exceeds the supported size.');
    return{guiBytes:new Uint8Array(await gui.arrayBuffer()),graphicsBytes:graphics?new Uint8Array(await graphics.arrayBuffer()):null};
  });
  const fromInstalled=()=>load(async()=>({guiBytes:new Uint8Array(await readInstalledPack('GUI')),graphicsBytes:new Uint8Array(await readInstalledPack('Graphics'))}));
  installed.hidden=!readInstalledPack;files.addEventListener('change',selected);installed.addEventListener('click',fromInstalled);
  if(readInstalledPack)fromInstalled();
  return{refresh(){view?.refresh();},dispose(){disposed=true;generation++;view?.dispose();files.removeEventListener('change',selected);installed.removeEventListener('click',fromInstalled);}};
}
