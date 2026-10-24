export function createAliveModel(){
  let current=null,draft=null;
  const clone=value=>structuredClone(value);
  function merge(){
    if(!draft||!current)return;
    for(const track of draft.tracks){
      const live=current.document.tracks.find(item=>item.id===track.id);
      if(live){for(const device of [track.device,...track.effects]){const current=[live.device,...live.effects].find(d=>d.instanceId===device.instanceId);if(current){device.parameters=clone(current.parameters);device.bypassed=current.bypassed;}}for(const key of ['gain','mute','solo'])track[key]=live[key];}
    }
  }
  return{
    accept(snapshot){if(current&&(snapshot.generation<current.generation||(snapshot.generation===current.generation&&(snapshot.draftRevision??0)<(current.draftRevision??0))))return;if(current&&(snapshot.generation!==current.generation||snapshot.draftRevision!==current.draftRevision))draft=null;current=snapshot;if(snapshot.draft&&!draft)draft=clone(snapshot.draft);merge();},
    edit(change){if(!current)throw Error('Open a session first.');draft??=clone(current.document);change(draft);merge();return clone(draft);},
    document(){return draft??current?.document;},snapshot(){return current;},pending(){return !!draft;},
    discard(){draft=null;},applied(snapshot){current=snapshot;draft=snapshot.draft?clone(snapshot.draft):null;merge();},
  };
}
export function parameterReading(binding,runtime,index){
  return{base:binding.base,effective:runtime?.effective?.[index]??binding.base,owner:runtime?.owned?.[index]?'Automation':'Base'};
}
