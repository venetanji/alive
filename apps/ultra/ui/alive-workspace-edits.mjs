// Translate a single existing MIDI gesture into the focused workspace protocol.
export function workspaceMusicEdit(before,after){
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const transport=['tempo','lengthBeats','loopEnabled','loopStartBeats','loopEndBeats'];
  if(transport.some(key=>before[key]!==after[key]))return{kind:'transportRange',...Object.fromEntries(transport.map(key=>[key,after[key]]))};
  const changed=after.sources.filter(source=>!same(source,before.sources.find(s=>s.id===source.id)));
  if(!changed.length)return null;
  if(changed.length!==1)throw Error('A MIDI gesture must edit one source.');
  const source=changed[0],old=before.sources.find(s=>s.id===source.id),sourceId=source.id;
  if(!old||source.kind!=='midi')throw Error('Select an existing MIDI source.');
  if(!same(old.automation,source.automation))return{kind:'automationSet',sourceId,lanes:source.automation};
  const removed=old.notes.filter(n=>!source.notes.some(next=>next.id===n.id));
  if(removed.length===1&&source.notes.length===old.notes.length-1)return{kind:'noteDelete',sourceId,noteId:removed[0].id};
  const notes=source.notes.filter(n=>!same(n,old.notes.find(prior=>prior.id===n.id)));
  if(notes.length===1&&old.notes.some(n=>n.id===notes[0].id)){const {id,beat,duration,pitch,velocity}=notes[0];return{kind:'noteUpdate',sourceId,noteId:id,beat,duration,pitch,velocity};}
  throw Error('Use a focused source or note control for this edit.');
}
