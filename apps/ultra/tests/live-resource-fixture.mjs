// Authored format fixtures. These contain no installed application resources.
const utf8=new TextEncoder();
const join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;};
const u32=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;};
const u64=n=>{const b=new Uint8Array(8);new DataView(b.buffer).setBigUint64(0,BigInt(n),true);return b;};
const utf16=text=>join([...text].map(char=>{const b=new Uint8Array(2);new DataView(b.buffer).setUint16(0,char.charCodeAt(0),true);return b;}));
const marker=Uint8Array.of(0xe0,0x8b,0xf2,0x37);
export function resourcePackFixture(items=[{name:'Devices',children:[{name:'Example.xml',text:'<Ableton/>'}]}],root='GUI'){
  let cursor=12;const payloads=[],records=[];
  function entry(item,index){
    const children=item.children?.map(entry)??[],payload=item.children?new Uint8Array():utf8.encode(item.text??'example');
    const offset=payload.length?cursor:0;cursor+=payload.length;payloads.push(payload);
    const trailer=join([u32(item.children?65536:0),u64(offset),u64(payload.length),u64(0),u64(0)]);
    const record=join([Uint8Array.of(0,11),utf8.encode('PackageItem'),u32(index),u32(item.name.length),utf16(item.name),marker,u32(children.length),...children,trailer]);
    records.push({name:item.name,record,payload,offset});return record;
  }
  const children=items.map(entry),header=join([utf8.encode('pl-a'),u64(cursor)]);
  const metadata=join([u32(root.length),utf16(root),marker,u32(children.length),...children,u32(65536),u64(0),u64(0),u64(0),u64(0),new Uint8Array(27)]);
  const decoded=join([header,...payloads,metadata]),key=Uint8Array.from({length:32},(_,i)=>33+i*5);
  const encrypted=decoded.map((b,i)=>{const k=key[(i^(i>>>8)^(i>>>16)^(i>>>24)^3)&31];return b===0||b===k?b:b^k;});
  return{decoded,encrypted,key,records,metadata:cursor};
}
