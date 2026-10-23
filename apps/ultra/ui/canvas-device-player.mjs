// Input ownership is separate from native voice allocation. A note-off which
// cannot enter the ordinary queue uses the document's out-of-band Stop.
export function createDevicePlayer({send,stop,onChange=()=>{},onError=()=>{}}){
  const sources=new Map(),counts=new Map();
  const changed=()=>onChange([...counts.keys()]);
  function remove(source,entry){
    if(sources.get(source)!==entry)return false;
    sources.delete(source);const count=counts.get(entry.note)-1;
    if(count)counts.set(entry.note,count);else counts.delete(entry.note);
    changed();return count===0;
  }
  async function transmit(note,velocity){
    let accepted=false;
    try{accepted=await send([note,velocity]);}catch(error){onError(error);}
    if(!accepted&&velocity===0)await stop();
    return !!accepted;
  }
  async function release(source){
    const entry=sources.get(source);if(!entry)return true;
    return remove(source,entry)?transmit(entry.note,0):true;
  }
  return{
    held:()=>[...counts.keys()],
    async press(note,source,velocity=100){
      if(!Number.isInteger(note)||note<0||note>127||!Number.isInteger(velocity)||velocity<1||velocity>127)throw Error('MIDI note and velocity must be bounded integers.');
      if(sources.has(source))return true;
      const entry={note};sources.set(source,entry);
      const count=counts.get(note)||0;counts.set(note,count+1);changed();
      if(count)return true;
      const accepted=await transmit(note,velocity);
      if(!accepted)remove(source,entry);
      return accepted;
    },
    release,
    async releaseAll(){for(const source of [...sources.keys()])await release(source);},
  };
}
