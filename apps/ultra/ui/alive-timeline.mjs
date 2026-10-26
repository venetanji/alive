export const snap=beat=>Math.round(beat*4)/4;
export const beatToX=(beat,scale,scroll=0)=>beat*scale-scroll;
export const xToBeat=(x,scale,scroll=0)=>(x+scroll)/scale;
export function transformPlacement(p,kind,delta){
  delta=snap(delta);
  if(kind==='trim')return{...p,start:p.start+delta,duration:p.duration-delta,sourceOffset:{kind:'beats',value:p.sourceOffset.value+delta}};
  return{...p,...(kind==='resize'?{duration:p.duration+delta}:{start:p.start+delta})};
}
export function placementError(p,source,placements,length){
  if(!source||source.kind&&source.kind!=='midi')return 'Choose a MIDI source on this track.';
  if(p.sourceOffset.value<0||p.sourceOffset.value>=source.lengthBeats)return 'Source offset must stay inside the source.';
  if(p.start<0||p.duration<1/64||p.start+p.duration>length)return 'Placement must fit inside the song. Extend Transport length or choose a shorter range.';
  if(!p.loopEnabled&&p.duration>source.lengthBeats-p.sourceOffset.value)return 'Nonlooping duration exceeds the source suffix. Enable Loop or shorten the placement.';
  if(placements.some(q=>q.id!==p.id&&q.trackId===p.trackId&&p.start<q.start+q.duration&&p.start+p.duration>q.start))return 'Placement overlaps another occurrence. Choose a free range on this track.';
  return null;
}
export function midiMarks(source,p,left,right,scale){
  const offset=p.sourceOffset.value,period=source.lengthBeats-offset,from=Math.max(left,p.start),to=Math.min(right,p.start+p.duration),marks=[];
  if(!(period>0)||from>=to)return marks;
  const first=p.loopEnabled?Math.max(0,Math.floor((from-p.start)/period)):0,last=p.loopEnabled?Math.floor((to-p.start)/period):0;
  // At subpixel periods, one representative repetition per pixel is sufficient.
  const stride=Math.max(1,Math.ceil(1/(period*scale))),limit=Math.min(4096,Math.ceil((to-from)*scale)*Math.max(1,source.notes.length));
  for(let repeat=first;repeat<=last&&marks.length<limit;repeat+=stride)for(const n of source.notes){
    const start=Math.max(offset,n.beat),end=Math.min(source.lengthBeats,n.beat+n.duration);
    if(start>=end)continue;const a=Math.max(from,p.start+repeat*period+start-offset),b=Math.min(to,p.start+repeat*period+end-offset);
    if(a<b)marks.push({start:a,end:b,pitch:n.pitch});if(marks.length>=limit)break;
  }
  return marks;
}

// Geometry and previews are local; the owner supplies authenticated edits and selection.
export function mountTimeline({doc,win,state,choose,edit,placementEdit,transportRange,action,mix,preserves,notice,guard}){
  const $=id=>doc.getElementById(id),root=$('timeline'),scroll=$('timeline-scroll'),canvas=$('timeline-canvas');
  const make=(tag,cls,text)=>{const e=doc.createElement(tag);e.className=cls??'';if(text!==undefined)e.textContent=text;return e;};
  let scale=48,range=null,gesture=null,preview=null,key='',last=null,inspectorKey='',fields={};
  const button=(label,fn,cls='')=>{const e=make('button',cls,label);e.setAttribute('aria-label',label);e.addEventListener('click',guard(fn));return e;};
  function cancel(){if(!gesture)return;const old=gesture;gesture=null;preview=null;if('range' in old)range=old.range;if(canvas.hasPointerCapture?.(old.id))canvas.releasePointerCapture(old.id);key='';render();}
  function select(trackId,sourceId,placementId=null){choose({trackId,sourceId,occurrence:placementId?{kind:'placement',placementId}:null});}
  function getRange(){const s=state();return range?.trackId===s.trackId?range:{trackId:s.trackId,start:0,duration:Math.min(4,s.document.lengthBeats)};}
  function number(label,value,change){const input=make('input');input.type='number';input.step='.25';input.value=String(value);input.setAttribute('aria-label',label);input.addEventListener('change',guard(()=>{if(input.value===''||!Number.isFinite(Number(input.value)))throw Error(`${label} requires a number.`);return change(Number(input.value));}));return input;}
  function field(label,input){const holder=make('label','',label);holder.append(input);return holder;}
  function updateInput(input,value){if(doc.activeElement!==input&&!preserves(input))input.value=String(value);}
  function inspector(s){
    const track=s.document.tracks.find(t=>t.id===s.trackId),p=s.document.placements.find(p=>p.id===s.selection?.occurrence?.placementId),source=s.document.sources.find(source=>source.id===s.selection?.sourceId),container=$('timeline-inspector');
    const identity=JSON.stringify([s.snapshot.generation,s.trackId,source?.id,p?.id]);
    if(identity!==inspectorKey){inspectorKey=identity;container.replaceChildren();fields={};
      fields.gain=number(`${track.name} Arrangement gain`,track.gain,gain=>{if(gain<0||gain>2)throw Error('Gain must be between 0 and 2.');return mix(track.id,{gain});});fields.gain.min='0';fields.gain.max='2';fields.gain.step='.01';fields.gain.title=`${track.name} track gain`;container.append(field('Gain',fields.gain));
      if(source){const name=make('input');name.value=source.name;name.maxLength=64;name.setAttribute('aria-label','Arrangement source name');name.addEventListener('change',guard(()=>edit({kind:'sourceRename',sourceId:source.id,name:name.value})));fields.name=name;container.append(field('Source',name));}
      if(p){
        const change=changes=>placementEdit(p.trackId,p.id,p.sourceId,changes);
        fields.start=number('Placement start',p.start,start=>change({start}));fields.duration=number('Placement duration',p.duration,duration=>change({duration}));fields.offset=number('Placement source offset',p.sourceOffset.value,value=>change({sourceOffset:{kind:'beats',value}}));
        fields.loop=make('input');fields.loop.type='checkbox';fields.loop.checked=p.loopEnabled;fields.loop.setAttribute('aria-label','Loop source suffix');const loop=fields.loop;loop.addEventListener('change',guard(()=>change({loopEnabled:loop.checked})));
        fields.destination=number('Duplicate placement start',p.start+p.duration,()=>{});const destination=fields.destination;
        container.append(field('Start',fields.start),field('Duration',fields.duration),field('Offset',fields.offset),field('Loop suffix',fields.loop),field('Copy to',fields.destination),button('Duplicate placement',()=>edit({kind:'placementDuplicate',placementId:p.id,start:Number(destination.value)})),button('Make placement independent',()=>edit({kind:'sourceIndependent',occurrence:{kind:'placement',placementId:p.id}})),button('Delete placement',()=>edit({kind:'placementDelete',placementId:p.id})));
      }else container.append(make('span','muted','Select an occurrence to edit its timing. Source notes stay in Clip detail.'));
    }
    updateInput(fields.gain,track.gain);if(fields.name)updateInput(fields.name,source.name);
    if(p){updateInput(fields.start,p.start);updateInput(fields.duration,p.duration);updateInput(fields.offset,p.sourceOffset.value);if(doc.activeElement!==fields.loop&&!preserves(fields.loop))fields.loop.checked=p.loopEnabled;}
    updateInput($('song-loop-start'),s.document.loopStartBeats);updateInput($('song-loop-end'),s.document.loopEndBeats);
    const receipts=s.snapshot.runtime?.requests.filter(r=>r.kind==='return')??[];
    $('return-receipts').textContent=receipts.slice(-4).map(r=>`Return ${r.requestSerial}: ${r.status}. ${(r.members??[]).map(m=>`${s.snapshot.document.tracks.find(t=>t.id===m.trackId)?.name??m.trackId}: ${m.status}`).join(' / ')}. Applied ${r.appliedMask}, pending ${r.pendingMask}, superseded ${r.supersededMask}, rejected ${r.rejectedMask}.`).join('\n')||'No Return requests in this preparation.';
  }
  function render(){
    const s=state();if(!s?.snapshot)return;last=s;const {snapshot,document}=s,enabled=snapshot.mode==='workspacesV4'&&snapshot.capabilities?.arrangement;
    root.hidden=!enabled;$('arrangement-placeholder').hidden=!!enabled;if(!enabled)return;
    if(gesture&&(gesture.generation!==snapshot.generation||gesture.revision!==snapshot.draftRevision||gesture.token!==s.token)){cancel();return;}
    inspector(s);const r=getRange();$('timeline-range').textContent=`Range ${r.start} - ${r.start+r.duration} beats`;
    const width=document.lengthBeats*scale,visibleLeft=(scroll.scrollLeft??0)/scale,visibleRight=visibleLeft+(scroll.clientWidth||1000)/scale;
    const next=JSON.stringify([snapshot.generation,document.tracks.map(t=>[t.id,t.name,t.color]),document.sources,document.placements,document.lengthBeats,document.loopStartBeats,document.loopEndBeats,scale,range,preview,s.selection,visibleLeft,visibleRight]);
    if(next!==key){key=next;canvas.replaceChildren();canvas.style.width=`${width+176}px`;canvas.style.minHeight=`${48+64*document.tracks.length}px`;
      const ruler=make('div','timeline-ruler');ruler.style.width=`${width}px`;ruler.style.marginLeft='176px';
      for(let beat=0;beat<=document.lengthBeats;beat+=Math.max(1,Math.ceil(40/scale))){const tick=button(`${Math.floor(beat/4)+1}.${beat%4+1}`,()=>action({kind:'seek',beat}),'timeline-tick');tick.setAttribute('aria-label',`Seek to beat ${beat}`);tick.style.left=`${beat*scale}px`;ruler.append(tick);}canvas.append(ruler);
      const brace=make('div','timeline-brace'),start=preview?.loopStartBeats??document.loopStartBeats,end=preview?.loopEndBeats??document.loopEndBeats;
      brace.setAttribute('aria-label','Song loop brace');brace.style.left=`${176+start*scale}px`;brace.style.width=`${(end-start)*scale}px`;brace.textContent=`Song loop ${start} - ${end}`;brace.classList.toggle('disabled',!document.loopEnabled);
      for(const side of ['left','right']){const handle=make('span','timeline-edge '+side);handle.dataset.braceEdge=side;brace.append(handle);}canvas.append(brace);
      document.tracks.forEach(t=>{
        const row=make('div','timeline-row');row.dataset.trackId=t.id;row.style.setProperty('--track-color',t.color);row.style.width=`${width+176}px`;
        const header=make('div','timeline-header'),name=button(t.name,()=>select(t.id,null),'timeline-track-name');name.setAttribute('aria-label',`Select ${t.name} Arrangement track`);name.title=t.name;header.append(name);
        const authority=make('output','timeline-authority');authority.setAttribute('aria-label',`${t.name} Arrangement authority`);
        const back=button(`Return ${t.name}`,()=>action({kind:'return',trackIds:[t.id]}),'timeline-return');back.textContent='Return';back.title=`Return ${t.name} to Arrangement`;
        const mute=button(`${t.name} Arrangement mute`,()=>mix(t.id,{mute:!state().document.tracks.find(q=>q.id===t.id).mute}),'timeline-mute'),solo=button(`${t.name} Arrangement solo`,()=>mix(t.id,{solo:!state().document.tracks.find(q=>q.id===t.id).solo}),'timeline-solo');mute.textContent='M';solo.textContent='S';
        header.append(mute,solo,authority,back);row.append(header);
        const lane=make('div','timeline-lane');lane.dataset.trackId=t.id;lane.style.width=`${width}px`;lane.style.backgroundSize=`${4*scale}px 100%`;
        if(r.trackId===t.id){const selected=make('div','timeline-range');selected.style.left=`${r.start*scale}px`;selected.style.width=`${r.duration*scale}px`;lane.append(selected);}
        for(const installed of snapshot.document.placements.filter(p=>p.trackId===t.id)){
          const draft=document.placements.find(p=>p.id===installed.id);if(JSON.stringify(draft)===JSON.stringify(installed))continue;
          const label=snapshot.preparedWorkspaces?.sources.find(s=>s.sourceId===installed.sourceId)?.name??'Prepared source',outline=make('div','timeline-prepared',`Prepared: ${label}`);
          outline.dataset.preparedId=installed.id;outline.style.left=`${installed.start*scale}px`;outline.style.width=`${installed.duration*scale}px`;outline.title=`Prepared ${label}: ${installed.start} - ${installed.start+installed.duration}. Apply stopped to replace this schedule.`;lane.append(outline);
        }
        for(const original of document.placements.filter(p=>p.trackId===t.id)){
          const p=preview?.id===original.id?preview:original,source=document.sources.find(s=>s.id===p.sourceId),occurrence=button(source?.name??'Missing source',()=>select(t.id,p.sourceId,p.id),'timeline-placement');
          occurrence.dataset.placementId=p.id;occurrence.setAttribute('aria-label',`Select placement ${p.id}`);occurrence.title=`${source?.name}: ${p.start} - ${p.start+p.duration} beats`;occurrence.style.left=`${p.start*scale}px`;occurrence.style.width=`${p.duration*scale}px`;
          const installed=snapshot.document.placements.find(q=>q.id===p.id),prepared=snapshot.preparedWorkspaces?.placements.find(q=>q.placementId===p.id);
          occurrence.classList.toggle('draft-only',!prepared||JSON.stringify(installed)!==JSON.stringify(original)||JSON.stringify(snapshot.document.sources.find(q=>q.id===p.sourceId))!==JSON.stringify(source));
          occurrence.classList.toggle('selected',s.selection?.occurrence?.placementId===p.id);occurrence.classList.toggle('invalid',!!preview&&preview.id===p.id&&!!placementError(p,source,document.placements,document.lengthBeats));
          const marks=doc.createElementNS('http://www.w3.org/2000/svg','svg');marks.setAttribute('viewBox',`0 0 ${p.duration*scale} 30`);marks.setAttribute('preserveAspectRatio','none');
          if(source?.kind==='midi')for(const m of midiMarks(source,p,visibleLeft,visibleRight,scale)){const line=doc.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v]of Object.entries({x:(m.start-p.start)*scale,y:26-Math.max(0,Math.min(1,(m.pitch-36)/60))*24,width:Math.max(1,(m.end-m.start)*scale),height:2}))line.setAttribute(k,String(v));marks.append(line);}occurrence.append(marks);
          for(const side of ['left','right']){const handle=make('span','timeline-edge '+side);handle.dataset.edge=side;occurrence.append(handle);}lane.append(occurrence);
        }row.append(lane);canvas.append(row);
      });const playhead=make('div','timeline-playhead');canvas.append(playhead);
    }
    for(const row of canvas.children){if(!row.dataset.trackId)continue;const observation=snapshot.runtime?.tracks.find(t=>t.trackId===row.dataset.trackId),authority=observation?.authority;
      const track=document.tracks.find(t=>t.id===row.dataset.trackId);row.querySelector('.timeline-mute').setAttribute('aria-pressed',String(track.mute));row.querySelector('.timeline-solo').setAttribute('aria-pressed',String(track.solo));
      row.classList.toggle('session-override',authority==='session');const output=row.querySelector('.timeline-authority');output.textContent=authority==='session'?(observation.activeSourceId?'Session override':'Session silence'):authority==='arrangement'?(observation.activeSourceId?'Arrangement':'Arrangement gap'):'Unavailable';if(observation?.pendingAction)output.textContent+=` / pending ${observation.pendingAction}`;output.title=output.textContent;
      const lane=row.querySelector('.timeline-lane');for(const item of lane.children){if(item.dataset.placementId)item.classList.toggle('playing',!!snapshot.state.playing&&observation?.activePlacementId===item.dataset.placementId&&observation.activeSourceId===document.placements.find(p=>p.id===item.dataset.placementId)?.sourceId);if(item.dataset.preparedId)item.classList.toggle('playing',!!snapshot.state.playing&&observation?.activePlacementId===item.dataset.preparedId);}
    }
    const playhead=canvas.querySelector('.timeline-playhead');if(playhead){const value=snapshot.state.position,frames=BigInt(value??0),beat=Number(frames*1000000n/48000n)/1000000*snapshot.document.tempo/60;playhead.style.left=`${176+beat*scale}px`;}
  }
  canvas.addEventListener('pointerdown',guard(event=>{
    if(event.button!==0||event.target.closest?.('.timeline-header,.timeline-ruler'))return;
    const brace=event.target.closest?.('.timeline-brace');if(brace){const s=state(),side=event.target.dataset.braceEdge;gesture={id:event.pointerId,x:event.clientX,scale,generation:s.snapshot.generation,revision:s.snapshot.draftRevision,token:s.token,kind:side==='left'?'loopLeft':side==='right'?'loopRight':'loopMove',start:s.document.loopStartBeats,end:s.document.loopEndBeats};canvas.setPointerCapture?.(event.pointerId);event.preventDefault();return;}
    const hit=event.target.closest?.('[data-placement-id]'),lane=event.target.closest?.('.timeline-lane');if(!lane)return;
    const bounds=lane.getBoundingClientRect(),s=state(),p=s.document.placements.find(p=>p.id===hit?.dataset.placementId);if(p)select(p.trackId,p.sourceId,p.id);else select(lane.dataset.trackId,s.trackId===lane.dataset.trackId?s.selection?.sourceId:null);
    const now=state();gesture={id:event.pointerId,x:event.clientX,scale,rect:bounds,generation:now.snapshot.generation,revision:now.snapshot.draftRevision,token:now.token,trackId:lane.dataset.trackId,placement:p?structuredClone(p):null,range:range?{...range}:null,kind:event.target.dataset.edge==='left'?'trim':event.target.dataset.edge==='right'?'resize':'move'};
    canvas.setPointerCapture?.(event.pointerId);event.preventDefault();
  }));
  canvas.addEventListener('pointermove',guard(event=>{if(gesture?.id!==event.pointerId)return;const g=gesture;
    if(g.kind.startsWith('loop')){const delta=snap((event.clientX-g.x)/g.scale);preview={loopStartBeats:g.start+(g.kind==='loopRight'?0:delta),loopEndBeats:g.end+(g.kind==='loopLeft'?0:delta)};}
    else if(g.placement)preview=transformPlacement(g.placement,g.kind,(event.clientX-g.x)/g.scale);
    else{const length=state().document.lengthBeats,a=Math.min(length-.25,Math.max(0,snap((g.x-g.rect.left)/g.scale))),b=Math.min(length,Math.max(0,snap((event.clientX-g.rect.left)/g.scale)));range={trackId:g.trackId,start:Math.min(a,b),duration:Math.max(.25,Math.abs(b-a))};}render();
  }));
  canvas.addEventListener('pointerup',guard(event=>{if(gesture?.id!==event.pointerId)return;const g=gesture,p=preview;gesture=null;preview=null;if(canvas.hasPointerCapture?.(g.id))canvas.releasePointerCapture(g.id);key='';render();
    if(!p)return;const s=state();if(s.snapshot.generation!==g.generation||s.snapshot.draftRevision!==g.revision||s.token!==g.token)return;
    const validate=()=>{const current=state();if(current.snapshot.generation!==g.generation||current.snapshot.draftRevision!==g.revision||current.token!==g.token)throw Error('The Arrangement changed during this gesture. Try again.');};
    if(g.kind.startsWith('loop')){if(p.loopStartBeats===g.start&&p.loopEndBeats===g.end)return;if(p.loopStartBeats<0||p.loopEndBeats>state().document.lengthBeats||p.loopEndBeats-p.loopStartBeats<1/64)throw Error('Song loop must fit inside the transport range.');return edit(()=>{validate();const d=state().document;return{kind:'transportRange',tempo:d.tempo,lengthBeats:d.lengthBeats,loopEnabled:d.loopEnabled,...p};});}
    if(JSON.stringify(p)===JSON.stringify(g.placement))return;
    const error=placementError(p,s.document.sources.find(s=>s.id===p.sourceId),s.document.placements,s.document.lengthBeats);if(error)throw Error(error);
    return edit(()=>{validate();return{kind:'placementUpdate',placementId:p.id,start:p.start,duration:p.duration,sourceOffset:p.sourceOffset,loopEnabled:p.loopEnabled};});
  }));
  canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
  const escape=event=>{if(event.key==='Escape')cancel();if(!event.defaultPrevented&&(event.key==='Delete'||event.key==='Backspace')&&!root.hidden&&!$('arrangement-workspace').hidden&&event.target.closest?.('#arrangement-workspace')&&!event.target.closest?.('input,select,textarea,button,[contenteditable],[role]')){const p=state().selection?.occurrence?.placementId;if(p){event.preventDefault();guard(()=>edit({kind:'placementDelete',placementId:p}))();}}};doc.addEventListener('keydown',escape);win?.addEventListener('blur',cancel);
  scroll.addEventListener('scroll',()=>render());
  for(const [id,factor] of [['timeline-zoom-in',1.5],['timeline-zoom-out',1/1.5]])$(id).addEventListener('click',()=>{cancel();scale=Math.max(1,Math.min(192,scale*factor));key='';render();});
  $('timeline-fit').addEventListener('click',()=>{cancel();scale=Math.max(1,Math.min(192,((scroll.clientWidth||1000)-176)/last.document.lengthBeats));scroll.scrollLeft=0;key='';render();});
  for(const [id,key]of [['song-loop-start','loopStartBeats'],['song-loop-end','loopEndBeats']])$(id).addEventListener('change',guard(()=>{if($(id).value===''||!Number.isFinite(Number($(id).value)))throw Error('Enter a valid song loop beat.');return transportRange({[key]:Number($(id).value)});}));
  return{render,cancel,getRange,dispose(){doc.removeEventListener('keydown',escape);win?.removeEventListener('blur',cancel);}};
}
