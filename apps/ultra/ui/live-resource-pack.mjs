// Original reader for the two resource packs qualified against the local Live 12 installation.
const profiles=Object.freeze({
  GUI:{size:18944474,sha256:'5ec872d673fd5f4f5f05787e4245c56e172ff2663c2d4493e94d598b883114e6',key:'f2b22ea4efb7ead5e2301fc41f3cda84f888da2a834f96b7f3c0cf8919fbdc72'},
  Graphics:{size:3477777,sha256:'a0b8aa480aa3d21f093b416ea59b3f200d2e2466936f95d886a554bffe875cb7',key:'ac9a09a4dba4efdcf37237bf3a1ad8afe78a9d0bba76b0e9f3cddce044d1e05d'},
});
const LIMIT=64*1024*1024,MAX_ENTRIES=10000,MAX_DEPTH=32;
const encoder=new TextEncoder(),utf8=new TextDecoder('utf-8',{fatal:true}),utf16=new TextDecoder('utf-16le',{fatal:true});
const prefix=Uint8Array.from([0,11,...encoder.encode('PackageItem')]),marker=Uint8Array.of(0xe0,0x8b,0xf2,0x37);
const fail=message=>{throw Error(`Live resource pack: ${message}`);};
function bytes(value){if(!(value instanceof Uint8Array)||value.length>LIMIT)fail('expected bounded byte data.');return value;}
export function safeResourcePath(path){
  if(typeof path!=='string'||path.length>4096||path.split('/').some(p=>!p||p==='.'||p==='..'||/[\\\x00-\x1f\x7f:]/.test(p)))fail('unsafe resource path.');
  return path;
}
export function decodeResourcePack(source,key){
  bytes(source);if(!(key instanceof Uint8Array)||key.length!==32)fail('key must have 32 bytes.');
  const out=new Uint8Array(source.length);
  for(let i=0;i<source.length;i++){
    const b=source[i],k=key[(i^(i>>>8)^(i>>>16)^(i>>>24)^3)&31];
    out[i]=b===0||b===k?b:b^k;
  }
  return out;
}

export function parseResourcePack(source,rootName){
  // Own the bytes so a caller cannot mutate a previously validated index/payload.
  const data=new Uint8Array(bytes(source)),view=new DataView(data.buffer);
  if(!['GUI','Graphics'].includes(rootName))fail('unsupported root kind.');
  function bounds(offset,size,end=data.length){if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(size)||offset<0||size<0||offset>end-size)fail('truncated or out-of-bounds record.');}
  function u32(offset){bounds(offset,4);return view.getUint32(offset,true);}
  function u64(offset){bounds(offset,8);const n=view.getBigUint64(offset,true);if(n>BigInt(Number.MAX_SAFE_INTEGER))fail('offset exceeds integer bounds.');return Number(n);}
  function match(offset,pattern){bounds(offset,pattern.length);return pattern.every((b,i)=>data[offset+i]===b);}
  if(data.length<12||!match(0,encoder.encode('pl-a')))fail('decoded header mismatch.');
  const metadata=u64(4);
  if(metadata<12||metadata>=data.length||data.length-metadata>1024*1024)fail('invalid metadata bounds.');
  const pattern=new Uint8Array(4+2*rootName.length+marker.length),pv=new DataView(pattern.buffer);
  pv.setUint32(0,rootName.length,true);for(let i=0;i<rootName.length;i++)pv.setUint16(4+i*2,rootName.charCodeAt(i),true);pattern.set(marker,4+rootName.length*2);
  const roots=[];
  for(let i=metadata;i<=data.length-pattern.length;i++)if(data[i]===pattern[0]&&match(i,pattern))roots.push(i);
  if(roots.length!==1)fail('missing or ambiguous root record.');
  let pos=roots[0]+pattern.length;
  const count=u32(pos);pos+=4;
  if(count>MAX_ENTRIES)fail('root child count exceeds limit.');
  const entries=[],index=new Map();
  function trailer(directory,children){
    bounds(pos,36);const flags=u32(pos),offset=u64(pos+4),size=u64(pos+12),a=u64(pos+20),b=u64(pos+28);pos+=36;
    if(flags!==0&&flags!==65536)fail('unsupported record flags.');
    if(a||b)fail('unsupported record extension.');
    if((flags===65536&&(offset||size))||(flags===0&&children))fail('invalid directory record.');
    if(directory&&flags!==65536)fail('root must be a directory.');
    if(size){bounds(offset,size,metadata);if(offset<12)fail('payload overlaps header.');}
    else if(offset)fail('unexpected empty payload offset.');
    return{flags,offset,size,directory:flags===65536};
  }
  function item(parent,sibling,depth){
    if(depth>MAX_DEPTH||entries.length>=MAX_ENTRIES)fail('index depth/count exceeds limit.');
    const recordOffset=pos;
    if(!match(pos,prefix))fail('invalid item prefix.');pos+=prefix.length;
    const sequence=u32(pos),chars=u32(pos+4);pos+=8;
    if(sequence!==sibling||!chars||chars>255)fail('invalid sibling index/name length.');
    bounds(pos,chars*2);const name=utf16.decode(data.subarray(pos,pos+chars*2));pos+=chars*2;
    if(name.includes('/'))fail('unsafe item name.');safeResourcePath(name);
    if(!match(pos,marker))fail('invalid item marker.');pos+=4;
    const childCount=u32(pos);pos+=4;if(childCount>MAX_ENTRIES-entries.length)fail('child count exceeds limit.');
    const path=safeResourcePath(parent?`${parent}/${name}`:name);
    if(index.has(path))fail(`duplicate resource path: ${path}`);
    const entry={path,recordOffset,childCount};entries.push(entry);index.set(path,entry);
    for(let i=0;i<childCount;i++)item(path,i,depth+1);
    Object.assign(entry,trailer(false,childCount));Object.freeze(entry);
  }
  for(let i=0;i<count;i++)item('',i,0);
  trailer(true,count);
  if(data.length-pos!==27)fail('unsupported package footer bounds.');
  let cursor=12;
  for(const e of entries.filter(e=>e.size).sort((a,b)=>a.offset-b.offset)){
    if(e.offset!==cursor)fail('payload overlap or incomplete coverage.');cursor+=e.size;
  }
  if(cursor!==metadata)fail('incomplete payload coverage.');
  function read(path){
    const e=index.get(safeResourcePath(path));if(!e)fail(`resource not found: ${path}`);if(e.directory)fail(`resource is a directory: ${path}`);
    return data.slice(e.offset,e.offset+e.size);
  }
  return Object.freeze({kind:rootName,metadataOffset:metadata,entries:Object.freeze(entries),has:path=>index.has(safeResourcePath(path)),read,text:path=>utf8.decode(read(path))});
}

export async function openLiveResourcePack(source,kind){
  const profile=profiles[kind];if(!profile)fail('unsupported pack kind.');bytes(source);
  if(source.length!==profile.size)fail('unsupported installed pack identity (size).');
  // Snapshot before the asynchronous digest to prevent a hash/decode race.
  const snapshot=new Uint8Array(source),hash=await crypto.subtle.digest('SHA-256',snapshot);
  const sha256=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  if(sha256!==profile.sha256)fail('unsupported installed pack identity (SHA-256).');
  const key=Uint8Array.from(profile.key.match(/../g),b=>parseInt(b,16));
  return Object.freeze({...parseResourcePack(decodeResourcePack(snapshot,key),kind),sha256});
}
