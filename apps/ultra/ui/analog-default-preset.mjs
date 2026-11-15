const fail=message=>{throw new Error(`Analog default preset: ${message}`);};
const children=node=>Array.from(node.children);

export function parseAnalogDefaultPresetXml(xml,{DOMParser:Parser=globalThis.DOMParser}={}){
 if(typeof xml!=='string'||!xml.length||xml.length>1024*1024)fail('XML size exceeds the supported limit.');
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))fail('DTD and entity declarations are unsupported.');
 if(typeof Parser!=='function')fail('XML parser is unavailable.');
 const doc=new Parser().parseFromString(xml,'application/xml'),root=doc.documentElement;
 if(doc.querySelector('parsererror')||!root||root.tagName!=='Ableton')fail('Invalid Ableton XML.');
 const devices=children(root);
 if(devices.length!==1||devices[0].tagName!=='UltraAnalog')fail('Expected exactly one UltraAnalog instrument.');
 if(doc.getElementsByTagName('*').length>8192)fail('XML element count exceeds the supported limit.');
 const values=new Map();
 function visit(scope,prefix=''){
  const scopes=new Set();
  for(const node of children(scope)){
   const tag=node.tagName;
   const nested=prefix===''&&/^SignalChain[12]$/.test(tag)||/^SignalChain[12]$/.test(prefix)&&/^Envelope\.[01]$/.test(tag);
   if(nested){
    if(scopes.has(tag))fail(`Duplicate parameter scope ${tag}.`);
    scopes.add(tag);
    visit(node,`${prefix?`${prefix}.`:''}${tag.replace(/^Envelope\.([01])$/,'Envelope[$1]')}`);
    continue;
   }
   const manuals=children(node).filter(child=>child.tagName==='Manual');
   if(!manuals.length)continue;
   const path=`${prefix?`${prefix}.`:''}${tag}`;
   if(manuals.length!==1||values.has(path))fail(`Duplicate Manual value for ${path}.`);
   const text=manuals[0].getAttribute('Value');
   let value;
   if(text==='true'||text==='false')value=text==='true';
   else{
    if(text===null||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(text))fail(`Invalid Manual value for ${path}.`);
    value=Number(text);
    if(!Number.isFinite(value))fail(`Nonfinite Manual value for ${path}.`);
   }
   values.set(path,value);
   if(values.size>256)fail('Parameter count exceeds the supported limit.');
  }
 }
 visit(devices[0]);
 return {values,source:{creator:root.getAttribute('Creator')??'',revision:root.getAttribute('Revision')??''}};
}
