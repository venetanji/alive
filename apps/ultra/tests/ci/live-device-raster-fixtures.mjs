import {deflateSync} from 'node:zlib';

export function chunk(type, bytes=new Uint8Array()) {
  const data=Buffer.concat([Buffer.from(type),Buffer.from(bytes)]);
  let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const header=Buffer.alloc(4),tail=Buffer.alloc(4);
  header.writeUInt32BE(bytes.length);tail.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([header,data,tail]);
}

export function png({width=1,height=1,type=6,depth=8,interlace=0,raw=[0,9,8,7,0],compressed,before=[],after=[]}={}) {
  const header=Buffer.alloc(13);
  header.writeUInt32BE(width);header.writeUInt32BE(height,4);
  header[8]=depth;header[9]=type;header[12]=interlace;
  return new Uint8Array(Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),...before,
    chunk('IDAT',compressed??deflateSync(Uint8Array.from(raw))),...after,chunk('IEND')]));
}

export const rasterCases=[
  {name:'stored transparent RGB',bytes:png(),mode:'rgba',pixels:[9,8,7,0]},
  {name:'grayscale coverage',bytes:png({width:3,type:0,raw:[0,0,128,255]}),mode:'coverage',pixels:[0,128,255]},
  {name:'gray alpha coverage',bytes:png({type:4,raw:[0,128,128]}),mode:'coverage',pixels:[64]},
  {name:'transparent indexed color',bytes:png({type:3,raw:[0,0],before:[chunk('PLTE',[3,90,200]),chunk('tRNS',[0])]}),mode:'coverage',pixels:[0]},
  {name:'RGB transparency key',bytes:png({type:2,raw:[0,1,2,3],before:[chunk('tRNS',[0,1,0,2,0,3])]}),mode:'rgba',pixels:[1,2,3,0]},
];
