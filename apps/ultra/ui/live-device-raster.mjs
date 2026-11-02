import {assertLiveResourcePair,safeResourcePath} from './live-resource-pack.mjs';

const MAX_ENCODED=1024*1024,MAX_DECODED=2*1024*1024,MAX_ENTRIES=16,MAX_CHUNKS=256;
const signature=Uint8Array.of(137,80,78,71,13,10,26,10);
const fail=message=>{throw Error(`Live raster: ${message}.`);};
const cancelled=signal=>{if(signal?.aborted)fail('decode cancelled');};
const channels={0:1,2:3,3:1,4:2,6:4};

function parsePNG(source,mode){
  if(mode!=='rgba'&&mode!=='coverage')fail('unsupported pixel mode');
  if(!(source instanceof Uint8Array)||source.length>MAX_ENCODED)fail('expected PNG bytes at most 1 MiB');
  const bytes=new Uint8Array(source),view=new DataView(bytes.buffer);
  if(!signature.every((byte,i)=>bytes[i]===byte))fail('invalid PNG signature');
  let pos=8,count=0,header=null,palette=null,transparency=null,data=false,ended=false,finished=false;
  const compressed=[];
  while(pos<bytes.length){
    if(++count>MAX_CHUNKS||bytes.length-pos<12)fail('chunk count or bounds');
    const length=view.getUint32(pos),end=pos+12+length;
    if(end>bytes.length)fail('truncated chunk');
    const type=String.fromCharCode(...bytes.subarray(pos+4,pos+8));
    if(!/^[A-Za-z]{4}$/.test(type)||type[2]!==type[2].toUpperCase())fail('invalid chunk type');
    let crc=0xffffffff;
    for(let i=pos+4;i<end-4;i++){
      crc^=bytes[i];for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
    }
    if(((crc^0xffffffff)>>>0)!==view.getUint32(end-4))fail('chunk CRC mismatch');
    const payload=bytes.subarray(pos+8,end-4);
    if(!header&&type!=='IHDR')fail('IHDR must be first');
    if(data&&type!=='IDAT')ended=true;
    if(type==='IHDR'){
      if(header||length!==13)fail('invalid IHDR');
      const width=view.getUint32(pos+8),height=view.getUint32(pos+12),colorType=payload[9];
      if(!width||!height||width>512||height>512)fail('dimensions exceed 512 x 512');
      if(payload[8]!==8||!Object.hasOwn(channels,colorType)||payload[10]||payload[11]||payload[12])fail('unsupported PNG format');
      header={width,height,colorType,channels:channels[colorType],mode};
    }else if(type==='PLTE'){
      if(data||palette||transparency||[0,4].includes(header.colorType)||!length||length%3||length>768)fail('invalid palette');
      palette=payload;
    }else if(type==='tRNS'){
      const kind=header.colorType;
      if(data||transparency||![0,2,3].includes(kind)||
        (kind===3&&(!palette||!length||length>palette.length/3))||
        (kind===0&&(length!==2||payload[0]))||
        (kind===2&&(length!==6||payload[0]||payload[2]||payload[4])))fail('invalid transparency');
      transparency=payload;
    }else if(type==='IDAT'){
      if(ended||(header.colorType===3&&!palette))fail('invalid IDAT order');
      data=true;compressed.push(payload);
    }else if(type==='IEND'){
      if(length||!data||end!==bytes.length)fail('invalid IEND');
      finished=true;pos=end;break;
    }else if(['acTL','fcTL','fdAT'].includes(type)||type[0]===type[0].toUpperCase())fail('unsupported critical or animated chunk');
    pos=end;
  }
  if(!finished)fail('missing IEND');
  return{...header,palette,transparency,compressed};
}

function snapshot(width,height,mode,pixels){
  // Pixel copies and tinted images belong to the caller, outside the owner cache.
  const image={width,height,mode,byteLength:pixels.length,copyPixels:()=>pixels.slice()};
  if(mode==='coverage')image.tint=tint=>{
    if(!Array.isArray(tint)||tint.length!==4||tint.some(v=>!Number.isInteger(v)||v<0||v>255))fail('tint requires four byte channels');
    const rgba=new Uint8Array(width*height*4);
    for(let i=0;i<pixels.length;i++){rgba.set(tint,i*4);rgba[i*4+3]=Math.round(pixels[i]*tint[3]/255);}
    return snapshot(width,height,'rgba',rgba);
  };
  return Object.freeze(image);
}

function paeth(a,b,c){
  const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
  return pa<=pb&&pa<=pc?a:pb<=pc?b:c;
}

async function decodePNG(png,signal){
  cancelled(signal);
  const {width,height,mode,colorType,channels:bpp,palette,transparency}=png;
  const stride=width*bpp,expected=(stride+1)*height;
  const pixels=new Uint8Array(width*height*(mode==='rgba'?4:1));
  let row=new Uint8Array(stride+1),previous=new Uint8Array(stride),column=0,seen=0,y=0;
  // Unfilter one row at a time; never retain the full inflated scanline buffer.
  function finishRow(){
    const filter=row[0];if(filter>4)fail('unsupported row filter');
    for(let x=0;x<stride;x++){
      const a=x>=bpp?row[x-bpp+1]:0,b=previous[x],c=x>=bpp?previous[x-bpp]:0;
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
      row[x+1]=(row[x+1]+predictor)&255;
    }
    for(let x=0;x<width;x++){
      const i=1+x*bpp;
      let r,g,b,a=255;
      if(colorType===0||colorType===4){r=g=b=row[i];if(colorType===4)a=row[i+1];else if(transparency&&r===transparency[1])a=0;}
      else if(colorType===2||colorType===6){
        [r,g,b]=row.subarray(i,i+3);
        if(colorType===6)a=row[i+3];else if(transparency&&r===transparency[1]&&g===transparency[3]&&b===transparency[5])a=0;
      }else{
        const index=row[i];if(index>=palette.length/3)fail('palette index out of range');
        [r,g,b]=palette.subarray(index*3,index*3+3);a=transparency?.[index]??255;
      }
      const pixel=y*width+x;
      if(mode==='rgba')pixels.set([r,g,b,a],pixel*4);
      else{
        if(a&&(r!==g||r!==b))fail('coverage requires grayscale pixels');
        pixels[pixel]=Math.round(r*a/255);
      }
    }
    previous.set(row.subarray(1));column=0;y++;
  }
  let reader;
  const abort=()=>{void reader?.cancel().catch(()=>{});};
  try{
    const compressed=new Blob(png.compressed).stream();
    reader=compressed.pipeThrough(new DecompressionStream('deflate')).getReader();
    signal?.addEventListener('abort',abort,{once:true});
    while(true){
      cancelled(signal);
      const {done,value}=await reader.read();
      cancelled(signal);
      if(done)break;
      if(value.length>expected-seen)fail('inflated scanline count exceeds dimensions');
      seen+=value.length;
      for(const byte of value){row[column++]=byte;if(column===row.length)finishRow();}
    }
    if(seen!==expected)fail('truncated inflated scanlines');
    return snapshot(width,height,mode,pixels);
  }catch(error){
    if(signal?.aborted)fail('decode cancelled');
    if(error.message?.startsWith('Live raster:'))throw error;
    fail('invalid PNG compressed data');
  }finally{
    signal?.removeEventListener('abort',abort);
    if(reader){void reader.cancel().catch(()=>{});reader.releaseLock();}
  }
}

// Standalone byte decoding proves no pack identity; only the owner admits pack artwork.
export async function decodeLiveRasterPNG(source,{mode='rgba',signal}={}){
  cancelled(signal);
  return decodePNG(parsePNG(source,mode),signal);
}

export function createLiveDeviceRaster(gui,graphics){
  assertLiveResourcePair(gui,graphics);
  const cache=new Map(),pending=new Map(),jobs=[];
  let family=null,disposed=false,decodedBytes=0,generation=0,running=false,controller=new AbortController();
  const active=()=>{if(disposed)fail('owner disposed');};
  function clear(){
    generation++;controller.abort();controller=new AbortController();
    for(const job of jobs.splice(0))job.reject(Error('Live raster: decode cancelled.'));
    cache.clear();pending.clear();decodedBytes=0;
  }
  async function drain(){
    if(running)return;running=true;
    while(jobs.length){
      const job=jobs.shift(),{key,fullPath,mode,version,signal}=job;
      try{
        cancelled(signal);
        const png=parsePNG(graphics.read(fullPath),mode),reserved=png.width*png.height*(mode==='rgba'?4:1);
        // One decode runs at a time; reserve its pixels before retaining any output.
        while(cache.size&&(cache.size>=MAX_ENTRIES||decodedBytes+reserved>MAX_DECODED)){
          const oldest=cache.keys().next().value;decodedBytes-=cache.get(oldest).byteLength;cache.delete(oldest);
        }
        const image=await decodePNG(png,signal);
        cancelled(signal);if(disposed||version!==generation)fail('decode cancelled');
        cache.set(key,image);decodedBytes+=image.byteLength;job.resolve(image);
      }catch(error){job.reject(error);}
      finally{if(pending.get(key)===job.promise)pending.delete(key);}
    }
    running=false;
  }
  function selectFamily(prefix){active();safeResourcePath(prefix);if(prefix!==family){clear();family=prefix;}}
  function load(path,{mode='rgba'}={}){
    try{
      active();if(family===null)fail('select a family before loading');
      safeResourcePath(path);if(!['rgba','coverage'].includes(mode))fail('unsupported pixel mode');
      const fullPath=safeResourcePath(`${family}/${path}`),key=`${graphics.sha256}:${family}:${fullPath}:${mode}`;
      if(cache.has(key)){
        const image=cache.get(key),signal=controller.signal;cache.delete(key);cache.set(key,image);
        return Promise.resolve().then(()=>{cancelled(signal);return image;});
      }
      if(pending.has(key))return pending.get(key);
      if(pending.size>=MAX_ENTRIES)fail('pending entry limit exceeded');
      if(!graphics.has(fullPath))fail(`resource not found: ${fullPath}`);
      const entry=graphics.entries.find(entry=>entry.path===fullPath);
      if(!entry||entry.directory||entry.size>MAX_ENCODED)fail('expected indexed PNG at most 1 MiB');
      const job={key,fullPath,mode,version:generation,signal:controller.signal};
      const promise=new Promise((resolve,reject)=>Object.assign(job,{resolve,reject}));job.promise=promise;
      pending.set(key,promise);jobs.push(job);void drain();
      return promise;
    }catch(error){return Promise.reject(error);}
  }
  return Object.freeze({selectFamily,load,dispose(){if(!disposed){disposed=true;clear();family=null;}},
    stats:()=>Object.freeze({entries:cache.size,pending:pending.size,decodedBytes,disposed})});
}
