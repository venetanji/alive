import {nativeInteger,validateMaster} from './alive-master.mjs';
export {nativeInteger} from './alive-master.mjs';
export function instrumentOf(track){return track?.chain?.kind==='midi'?track.chain.instrument:null;}
export function actualDevices(track){return [instrumentOf(track),...(track?.effects??[])].filter(Boolean);}
export function sourceLength(source){return source?.kind==='audio'?Number(source.file.frames)/source.file.sampleRate*source.sourceTempo/60:source?.lengthBeats??0;}
export function clipPlayback(snapshot,trackId){
  try{
    const prepared=snapshot.preparedWorkspaces,observed=snapshot.runtime?.tracks.find(t=>t.trackId===trackId);
    if(!prepared||prepared.preparationRevision!==snapshot.preparationRevision||!observed?.activeSourceId)return null;
    const source=prepared.sources.find(s=>s.trackId===trackId&&s.sourceId===observed.activeSourceId);
    const occurrence=observed.authority==='session'?prepared.slots.find(s=>s.trackId===trackId&&s.slotId===observed.activeSlotId):observed.authority==='arrangement'?prepared.placements.find(p=>p.trackId===trackId&&p.placementId===observed.activePlacementId):null;
    if(!source||!occurrence?.region||occurrence.sourceId!==source.sourceId)return null;
    const region=occurrence.region,phase=nativeInteger(observed.phase),sourceEnd=nativeInteger(source.lengthFrames);
    const start=nativeInteger(region.startFrame),end=nativeInteger(region.endFrame),loopStart=nativeInteger(region.loopStartFrame),loopEnd=nativeInteger(region.loopEndFrame);
    if(typeof region.loopEnabled!=='boolean'||start>=end||end>sourceEnd||loopStart>=loopEnd||loopEnd>sourceEnd||region.loopEnabled&&start>=loopEnd||phase>sourceEnd)return null;
    const from=region.loopEnabled?loopStart:start,to=region.loopEnabled?loopEnd:end,length=to-from;
    if(phase<start&&(!region.loopEnabled||phase<loopStart)||phase>to)return null;
    const tempo=snapshot.document.tempo,frames=Number(length);
    if(!Number.isSafeInteger(frames)||!Number.isFinite(tempo)||tempo<30||tempo>240)return null;
    // Native phase wraps at the loop boundary; it cannot prove a play count.
    return{playing:!!snapshot.state.playing,loopEnabled:region.loopEnabled,intro:phase<from,
      fraction:phase<from?null:Number((phase-from)*1000000n/length)/1000000,
      lengthBeats:frames*tempo/(48000*60),playCount:null};
  }catch{return null;}
}
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
