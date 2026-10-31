import {nativeInteger,validateMaster} from './alive-master.mjs';
export {nativeInteger} from './alive-master.mjs';
export function instrumentOf(track){return track?.chain?.kind==='midi'?track.chain.instrument:null;}
export function actualDevices(track){return [instrumentOf(track),...(track?.effects??[])].filter(Boolean);}
export function sourceLength(source){return source?.kind==='audio'?Number(source.file.frames)/source.file.sampleRate*source.sourceTempo/60:source?.lengthBeats??0;}
export function createAliveModel(){
  let current=null;
  function accept(snapshot){
    validateMaster(snapshot.master);
    for(const key of ['generation','editRevision'])if(!Number.isSafeInteger(snapshot[key])||snapshot[key]<0)throw Error('Invalid desktop revision.');
    for(const key of ['preparationRevision','snapshotSequence'])nativeInteger(snapshot[key]);
    if(current){
      if(snapshot.generation<current.generation||snapshot.generation===current.generation&&snapshot.editRevision<current.editRevision)return false;
      for(const key of ['preparationRevision','snapshotSequence'])if(nativeInteger(snapshot[key])<nativeInteger(current[key]))return false;
    }
    current=snapshot;return true;
  }
  return{accept,document:()=>current?.document,snapshot:()=>current};
}
export function parameterReading(binding,runtime,index){
  return{base:binding.base,effective:runtime?.effective?.[index]??binding.base,owner:runtime?.owned?.[index]?'Automation':'Base'};
}
