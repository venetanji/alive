import {safeResourcePath} from './live-resource-pack.mjs';

const fail=message=>{throw Error(`Live device layout: ${message}`);};
const child=(element,tag)=>Array.from(element.children).find(e=>e.tagName===tag);
export const propertyValue=(node,name,fallback='')=>node.properties[name]?.attributes.Value??node.properties[name]?.attributes.ColorName??fallback;
export function propertyPoint(node,name){
  const a=node.properties[name]?.attributes;if(!a)return null;
  const x=Number(a.X),y=Number(a.Y);if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>4096||Math.abs(y)>4096)fail(`invalid ${name} geometry.`);
  if(name==='Size'&&(x<0||y<0))fail('negative view size.');return{x,y};
}
function languageStrings(text){
  const strings=Object.create(null);
  if(text.length>256*1024)fail('language resource exceeds limit.');
  for(const match of text.matchAll(/\b([A-Za-z_][\w]*)\s*=\s*("(?:[^"\\]|\\.)*")\s*;/g)){
    try{strings[match[1]]=JSON.parse(match[2]);}catch{ /* Preserve unresolved localization rather than execute another grammar. */ }
  }
  return strings;
}

export function loadLiveDeviceLayout({gui,path='Devices/UltraAnalog/Contents.xml',locale='EN',DOMParser:Parser=globalThis.DOMParser}={}){
  safeResourcePath(path);if(typeof Parser!=='function')fail('an XML parser is required.');
  if(!/^[A-Z]{2}$/.test(locale))fail('invalid locale.');
  const documents=new Map(),propertyCache=new WeakMap(),bindings=[],expressions=[],warnings=[];let nodes=0,totalText=0,propertyCount=0,attributeText=0;
  function document(resource){
    if(documents.has(resource))return documents.get(resource);
    if(documents.size>=64)fail('resource count exceeds limit.');
    const text=gui.text(resource);if(typeof text!=='string')fail('XML resource must be text.');totalText+=text.length;
    if(text.length>2*1024*1024||totalText>8*1024*1024)fail('XML resource exceeds limit.');
    if(/<!DOCTYPE|<!ENTITY/i.test(text))fail('DTD/DOCTYPE resources are unsupported.');
    const doc=new Parser().parseFromString(text,'application/xml');
    if(doc.querySelector('parsererror')||doc.documentElement.tagName!=='Ableton')fail(`invalid XML: ${resource}`);
    if(doc.getElementsByTagName('*').length>20000)fail('XML element count exceeds limit.');
    const root=child(doc.documentElement,'PropertiesNode');if(!root)fail(`missing view root: ${resource}`);
    let strings=Object.create(null);const language=resource.replace(/\.xml$/,`-${locale}.lng`);
    if(gui.has(language))strings=languageStrings(gui.text(language));
    const entry={root,strings};documents.set(resource,entry);return entry;
  }
  function property(element,depth=0){
    if(propertyCache.has(element))return propertyCache.get(element);
    if(depth>32)fail('property nesting exceeds limit.');
    if(++propertyCount>50000)fail('property count exceeds limit.');
    const attributes=Object.fromEntries(Array.from(element.attributes,a=>{attributeText+=a.name.length+a.value.length;return[a.name,a.value];}));
    if(attributeText>8*1024*1024)fail('property attribute text exceeds limit.');
    // Embedded instances share immutable metadata from their cached source document.
    const result=Object.freeze({tag:element.tagName,attributes:Object.freeze(attributes),children:Object.freeze(Array.from(element.children,e=>property(e,depth+1)))});
    propertyCache.set(element,result);return result;
  }
  function visit(element,resource,scope,stack,depth=0){
    if(++nodes>4096||depth>64)fail('view depth/count exceeds limit.');
    const properties=Object.create(null),categories=child(element,'Categories');
    for(const category of categories?.children??[])for(const p of child(category,'Properties')?.children??[]){
      const name=p.getAttribute('Name');if(!name||Object.hasOwn(properties,name))fail(`missing or duplicate property: ${name}`);properties[name]=property(p);
    }
    const node={className:element.getAttribute('TargetClassName')??'',id:element.getAttribute('Id')??'',resource,scope:[...scope],properties:Object.freeze(properties),children:[]};
    const strings=documents.get(resource).strings;
    node.text=name=>{const value=String(propertyValue(node,name));return value.startsWith('@')?(strings[value.slice(1)]??value):value;};
    propertyPoint(node,'Size');propertyPoint(node,'Position');
    const expression=propertyValue(node,'ConnectTo');
    if(expression){node.connection={scope:[...scope],expression,resource};bindings.push(node.connection);}
    for(const [name,p]of Object.entries(properties))if(p.tag==='ViewExpressionProperty')expressions.push({resource,scope:[...scope],name,value:p.attributes.Value??''});
    for(const e of child(element,'Children')?.children??[])if(e.tagName==='PropertiesNode')node.children.push(visit(e,resource,scope,stack,depth+1));
    if(node.className==='EmbeddedLoadableView'){
      const prop=properties.Resource,kind=prop?.children[0]?.children[0];
      const name=kind?.children.find(p=>p.tag==='ResourceName')?.attributes.Value;
      if(kind?.tag!=='FixedLoadableViewResource'||!name){warnings.push({resource,className:node.className,reason:'Unresolved view resource type'});return node;}
      // These are resource names relative to this device, never filesystem paths.
      if(!/^[A-Za-z0-9_-]+$/.test(name))fail('unsafe embedded resource name/path.');
      const target=resource.slice(0,resource.lastIndexOf('/')+1)+name+'.xml';
      if(stack.includes(target))fail(`resource cycle at ${target}`);
      const embedded=document(target);
      node.embedded=visit(embedded.root,target,expression?[...scope,expression]:scope,[...stack,target],depth+1);
    }
    return node;
  }
  const rootDocument=document(path),root=visit(rootDocument.root,path,[],[path]);
  return{root,documents:[...documents.keys()],bindings,expressions,warnings,nodeCount:nodes};
}
