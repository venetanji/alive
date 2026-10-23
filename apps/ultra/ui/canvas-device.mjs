// Saved device interface; DSP state and active notes never enter this manifest.
const fail=message=>{throw Error(`Device: ${message}`);};
const own=(value,key)=>Object.hasOwn(value,key);
const clone=value=>JSON.parse(JSON.stringify(value));
const nodes=patch=>patch.nodes.flatMap(node=>[node,...(node.type==='patcher'?nodes(node.patcher):[])]);
function fields(value,allowed,required=allowed){
  if(!value||typeof value!=='object'||Array.isArray(value))fail('expected an object.');
  for(const key of Object.keys(value))if(!allowed.includes(key))fail(`unknown field ${key}.`);
  for(const key of required)if(!own(value,key))fail(`missing field ${key}.`);
}
function text(value,label,limit,empty=false){
  if(typeof value!=='string'||value.length>limit||(!empty&&!value.length)||/[^\x20-\x7e]/.test(value))fail(`${label} must contain ${empty?'0':1} to ${limit} printable ASCII characters.`);
}
function number(value,min,max,label,integer=false){
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))fail(`${label} is outside its supported numeric range.`);
}
export function validateDevice(patch,registry,structural){
  if(!own(patch,'device'))return;
  const device=patch.device;
  fields(device,['version','id','name','midi','audio','parameters','presets']);
  if(device.version!==1)fail('unsupported manifest version.');
  text(device.id,'id',127);
  if(!/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(device.id))fail('id must use ASCII identifier segments separated by dots.');
  text(device.name,'name',64);
  fields(device.midi,['node','inlet']);fields(device.audio,['inputs','outputs','layout']);
  const byId=new Map(nodes(patch).map(node=>[node.id,node]));
  if(!Number.isInteger(device.midi.node)||byId.get(device.midi.node)?.type!=='poly_note'||device.midi.inlet!==0)fail('MIDI entry must be the note inlet of poly.note~.');
  if(device.audio.inputs!==0||device.audio.outputs!==2||device.audio.layout!=='stereo')fail('audio interface supports zero inputs and exactly two stereo outputs.');
  if(!Array.isArray(device.parameters)||!device.parameters.length||device.parameters.length>16)fail('expected 1 to 16 parameter bindings.');
  const keys=new Set(),bindings=new Set();
  for(const parameter of device.parameters){
    fields(parameter,['key','label','node','param','min','max','unit'],['key','label','node','param','min','max']);
    text(parameter.key,'parameter key',31);text(parameter.label,'parameter label',64);
    if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(parameter.key)||['__proto__','prototype','constructor'].includes(parameter.key)||keys.has(parameter.key))fail('parameter keys must be safe, unique ASCII identifiers.');
    keys.add(parameter.key);if(own(parameter,'unit'))text(parameter.unit,'unit',16,true);
    const node=byId.get(parameter.node),spec=node&&registry[node.type]?.params;
    const descriptor=spec&&own(spec,parameter.param)?spec[parameter.param]:null;
    if(!Number.isInteger(parameter.node)||typeof parameter.param!=='string'||!descriptor||typeof descriptor.value!=='number'||structural(node.type,parameter.param))fail(`invalid live parameter binding ${parameter.key}.`);
    const binding=`${parameter.node}:${parameter.param}`;
    if(bindings.has(binding))fail('a node parameter cannot be bound twice.');bindings.add(binding);
    number(parameter.min,descriptor.min,descriptor.max,'minimum',descriptor.integer);
    number(parameter.max,descriptor.min,descriptor.max,'maximum',descriptor.integer);
    if(parameter.min>=parameter.max)fail('minimum must be less than maximum.');
    number(node.params[parameter.param],parameter.min,parameter.max,parameter.key,descriptor.integer);
  }
  if(!Array.isArray(device.presets)||device.presets.length>16)fail('expected at most 16 presets.');
  const names=new Set();
  for(const preset of device.presets){
    fields(preset,['name','values']);text(preset.name,'preset name',64);
    if(names.has(preset.name))fail('preset names must be unique.');names.add(preset.name);
    fields(preset.values,[...keys]);
    for(const parameter of device.parameters){
      const node=byId.get(parameter.node);
      number(preset.values[parameter.key],parameter.min,parameter.max,`${preset.name}.${parameter.key}`,registry[node.type].params[parameter.param].integer);
    }
  }
}
export function deviceValues(patch){
  if(!patch.device)fail('package this patch before saving presets.');
  const byId=new Map(nodes(patch).map(node=>[node.id,node]));
  return Object.fromEntries(patch.device.parameters.map(binding=>[binding.key,byId.get(binding.node).params[binding.param]]));
}
export function withDevicePreset(patch,name){
  text(name,'preset name',64);
  const next=clone(patch),preset={name,values:deviceValues(next)};
  const index=next.device.presets.findIndex(preset=>preset.name===name);
  if(index>=0)next.device.presets[index]=preset;
  else {if(next.device.presets.length===16)fail('remove or replace a preset before adding another.');next.device.presets.push(preset);}
  return next;
}
export function presetParameters(patch,name){
  const preset=patch.device?.presets.find(preset=>preset.name===name);
  if(!preset)fail('preset is unavailable.');
  return patch.device.parameters.map(binding=>({node:binding.node,key:binding.param,value:preset.values[binding.key]}));
}
