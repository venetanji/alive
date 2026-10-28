import {nativeInteger,validateMaster} from './alive-master.mjs';
export {nativeInteger} from './alive-master.mjs';
export function instrumentOf(track){return track?.chain?(track.chain.kind==='midi'?track.chain.instrument:null):track?.device??null;}
export function actualDevices(track){return [instrumentOf(track),...(track?.effects??[])].filter(Boolean);}
export function createAliveModel(){
  let current=null,draft=null;
  const clone=value=>structuredClone(value);
  function fresh(snapshot){
    // Once a stream supplies these fields, an older mock cannot downgrade it.
    if(current)for(const key of ['master','snapshotSequence','preparationRevision'])if(current[key]!==undefined&&snapshot[key]===undefined)return false;
    // Older mock snapshots may omit Master; present DTOs must be complete.
    if(Object.hasOwn(snapshot,'master'))validateMaster(snapshot.master);
    for(const key of ['generation','draftRevision'])if(snapshot[key]!==undefined&&(!Number.isSafeInteger(snapshot[key])||snapshot[key]<0))throw Error('Invalid desktop revision.');
    for(const key of ['preparationRevision','snapshotSequence'])if(snapshot[key]!==undefined)nativeInteger(snapshot[key]);
    if(!current)return true;
    if(snapshot.generation<current.generation||snapshot.generation===current.generation&&(snapshot.draftRevision??0)<(current.draftRevision??0))return false;
    for(const key of ['preparationRevision','snapshotSequence'])if(snapshot[key]!==undefined&&current[key]!==undefined&&nativeInteger(snapshot[key])<nativeInteger(current[key]))return false;
    return true;
  }
  function merge(){
    if(!draft||!current)return;
    for(const track of draft.tracks){
      const live=current.document.tracks.find(item=>item.id===track.id);
      if(live){for(const device of actualDevices(track)){const current=actualDevices(live).find(d=>d.instanceId===device.instanceId);if(current){device.parameters=clone(current.parameters);device.bypassed=current.bypassed;}}for(const key of ['gain','mute','solo'])track[key]=live[key];}
    }
  }
  return{
    accept(snapshot){if(!fresh(snapshot))return false;if(current&&(snapshot.generation!==current.generation||snapshot.draftRevision!==current.draftRevision))draft=null;current=snapshot;if(snapshot.draft&&!draft)draft=clone(snapshot.draft);merge();return true;},
    edit(change){if(!current)throw Error('Open a session first.');draft??=clone(current.document);change(draft);merge();return clone(draft);},
    document(){return draft??current?.document;},snapshot(){return current;},pending(){return !!draft;},
    discard(){draft=null;},applied(snapshot){if(!fresh(snapshot))return false;current=snapshot;draft=snapshot.draft?clone(snapshot.draft):null;merge();return true;},
  };
}
export function parameterReading(binding,runtime,index){
  return{base:binding.base,effective:runtime?.effective?.[index]??binding.base,owner:runtime?.owned?.[index]?'Automation':'Base'};
}
