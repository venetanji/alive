import {analogNativeDescriptors} from './analog-native-descriptors.mjs';
import {analogPresetParameters} from './analog-bindings.mjs';
import {decodeAnalogDefaultPreset} from './analog-default-loader.mjs';
import {parseAnalogDefaultPresetXml} from './analog-default-preset.mjs';

const analog=Object.freeze({
 device:'Analog',version:1,profile:'live12-analog-v1',
 dllSha256:'4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133',
 guiSha256:'5ec872d673fd5f4f5f05787e4245c56e172ff2663c2d4493e94d598b883114e6',
 graphicsSha256:'a0b8aa480aa3d21f093b416ea59b3f200d2e2466936f95d886a554bffe875cb7',
 entrypoint:'Devices/UltraAnalog/Contents.xml',descriptors:analogNativeDescriptors,
});
const stateFields=['version','profile','dllSha256','guiSha256','graphicsSha256','values'];
const resourcePairs=[
 [analog.guiSha256,analog.graphicsSha256],
 ['75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f','ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d'],
];
const fail=message=>{throw Error(`Live device: ${message}`);};
export function liveDeviceProfile(device='Analog'){
 if(device!==analog.device)fail(`unsupported device ${String(device)}.`);
 return analog;
}
// Match the audition host's authored, tuned and note-gated fallback. Installed
// defaults are read separately and never distributed with this profile.
function fallback(index,minimum){
 if(index===0)return 4;if(index===1)return 1/6;
 if([2,45,128].includes(index))return .65;
 if([3,30,113].includes(index))return 3;
 if([4,31,114].includes(index))return 12;
 if([5,11,26,34,36,71,82,117,119,154,165].includes(index))return .5;
 if([7,28,46,65,87,99,129,148,170,182,52,135,96,97,108,109,179,180,191,192,121].includes(index))return 1;
 if([68,151].includes(index))return .7;
 if([98,110,181,193].includes(index))return .2;
 return minimum;
}
export function createLiveDeviceState(device='Analog'){
 const profile=liveDeviceProfile(device);
 return Object.fromEntries(stateFields.map(key=>[key,key==='values'?profile.descriptors.map((row,index)=>Math.fround(fallback(index,row[3]))):profile[key]]));
}
export function validateLiveDeviceState(device,state){
 const profile=liveDeviceProfile(device);
 if(!state||typeof state!=='object'||Array.isArray(state)||Object.keys(state).length!==stateFields.length||Object.keys(state).some(key=>!stateFields.includes(key)))fail('expected complete versioned source state.');
 for(const key of ['version','profile','dllSha256'])if(state[key]!==profile[key])fail(`unsupported ${key} identity.`);
 if(!resourcePairs.some(([gui,graphics])=>state.guiSha256===gui&&state.graphicsSha256===graphics))fail('unsupported resource pair identity.');
 if(!Array.isArray(state.values)||state.values.length!==profile.descriptors.length)fail('native state parameter count does not match.');
 const values=state.values.map((value,index)=>{
  const [,,kind,min,max]=profile.descriptors[index];
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||kind===3&&!Number.isInteger(value))fail(`invalid native value at index ${index}${kind===3?' (integer required)':''}.`);
  return Math.fround(value);
 });
 return {...state,values};
}
export function patchLiveDeviceState(device,state,updates){
 const next=validateLiveDeviceState(device,state),seen=new Set();
 if(!Array.isArray(updates)||!updates.length||updates.length>next.values.length)fail('expected a bounded native state batch.');
 for(const part of updates){
  if(!part||Object.keys(part).length!==2||!Object.hasOwn(part,'index')||!Object.hasOwn(part,'value'))fail('invalid native state update.');
  const {index,value}=part;
  if(!Number.isInteger(index)||index<0||index>=next.values.length)fail('native index is outside the profile.');
  if(seen.has(index))fail('duplicate native index in batch.');seen.add(index);next.values[index]=value;
 }
 return validateLiveDeviceState(device,next);
}
export function liveDeviceCatalog(state,generation='1'){
 const profile=liveDeviceProfile(),validated=validateLiveDeviceState(profile.device,state);
 return {generation:String(generation),parameters:profile.descriptors.map(([module,property,kind,min,max],index)=>({index,module,property,kind,min,max,
  value:validated.values[index],applied:validated.values[index],revision:1,applied_revision:1}))};
}
export async function installedLiveDeviceState(device,bytes,{DOMParser=globalThis.DOMParser}={}){
 const state=createLiveDeviceState(device);
 const {values}=parseAnalogDefaultPresetXml(await decodeAnalogDefaultPreset(bytes),{DOMParser});
 return patchLiveDeviceState(device,state,analogPresetParameters(values,liveDeviceCatalog(state)));
}
