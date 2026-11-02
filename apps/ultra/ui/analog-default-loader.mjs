const LIMIT=1024*1024;

export async function decodeAnalogDefaultPreset(payload){
 const length=payload?.byteLength??payload?.length;
 if(!Number.isInteger(length)||length<2||length>LIMIT)throw Error('Analog default preset transport size is unsupported.');
 const bytes=ArrayBuffer.isView(payload)?new Uint8Array(payload.buffer,payload.byteOffset,payload.byteLength):new Uint8Array(payload);
 if(bytes[0]!==0x1f||bytes[1]!==0x8b)throw Error('Analog default preset is not gzip data.');
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
 const chunks=[];let lengthRead=0;
 try{
  for(;;){
   const {value,done}=await reader.read();if(done)break;
   lengthRead+=value.byteLength;
   if(lengthRead>LIMIT){await reader.cancel();throw Error('Analog default preset expanded size exceeds the supported limit.');}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const output=new Uint8Array(lengthRead);let offset=0;
 for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder('utf-8',{fatal:true}).decode(output);
}
