const svgNS='http://www.w3.org/2000/svg';
const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
const tidy=value=>Number(value.toPrecision(12));
const coordinate=value=>String(Number(value.toFixed(4)));
const point=p=>`${coordinate(p.x)} ${coordinate(p.y)}`;
const line=(from,to)=>`M ${point(from)} L ${point(to)}`;
const curve=(from,to,exponential)=>!exponential||from.y===to.y?line(from,to):
  `M ${point(from)} C ${coordinate(from.x+(to.x-from.x)*.12)} ${coordinate(to.y)} ${coordinate(from.x+(to.x-from.x)*.3)} ${coordinate(to.y)} ${point(to)}`;

// Stage bands show raw parameter positions, rather than implying a seconds scale.
function geometry(kind,state){
  const n=name=>state[name]?.known?state[name].position:null;
  if(kind==='pitch'){
    const initial=n('Initial'),time=n('Time'),start={x:8,y:initial===null?39:71-64*initial},end={x:time===null?93:19+148*time,y:39};
    return{height:78,handles:{initial:start,time:end},segments:initial!==null&&time!==null?
      [line(start,end),line(end,{x:167,y:39})]:[]};
  }
  const attack=n('AttackTime'),decay=n('DecayTime'),sustain=n('SustainLevel'),duration=n('SustainTime'),release=n('ReleaseTime');
  const a={x:8+42*(attack??.5),y:4},d={x:58+40*(decay??.5),y:sustain===null?61:61-57*sustain},r={x:130+40*(release??.5),y:61};
  const slope=state.ExponentialSlope,loop=state.Loop,free=state.FreeRun;
  const segments=[],exp=slope?.known&&slope.value>=.5;
  if(slope?.known&&attack!==null)segments.push(curve({x:5,y:61},a,exp));
  if(slope?.known&&attack!==null&&decay!==null&&sustain!==null)segments.push(curve(a,d,exp));
  if(slope?.known&&decay!==null&&sustain!==null&&loop?.known&&free?.known){
    let releaseStart=d;
    if(!(free.value>=.5&&loop.value===0)){
      const end={x:122,y:duration===null?d.y:61-57*sustain*duration};
      if(loop.value===1){
        const peak={x:d.x+(end.x-d.x)*.5,y:4};
        segments.push(curve(d,peak,exp),curve(peak,{x:end.x,y:d.y},exp));end.y=d.y;
      }else if(loop.value===2){
        const zero={x:d.x+(end.x-d.x)*.3,y:61},peak={x:d.x+(end.x-d.x)*.6,y:4};
        segments.push(curve(d,zero,exp),curve(zero,peak,exp),curve(peak,{x:end.x,y:d.y},exp));end.y=d.y;
      }else if(duration!==null)segments.push(curve(d,end,exp));
      else return{height:65,handles:{attack:a,sustain:d,release:r},segments};
      releaseStart=end;
    }
    if(release!==null)segments.push(curve(releaseStart,r,exp));
  }
  return{height:65,handles:{attack:a,sustain:d,release:r},segments};
}

export function createLiveEnvelopeEditor(doc,{kind,bindings={},onError=()=>{}}={}){
  if(kind!=='adsr'&&kind!=='pitch')throw Error('An envelope editor requires adsr or pitch kind.');
  const svg=(tag,attrs={})=>{const e=doc.createElementNS(svgNS,tag);for(const[key,value]of Object.entries(attrs))e.setAttribute(key,String(value));return e;};
  const element=doc.createElement('div');element.setAttribute('class',`live-envelope-editor live-envelope-${kind}`);
  const drawing=svg('svg',{viewBox:`0 0 175 ${kind==='pitch'?78:65}`,preserveAspectRatio:'none',role:'group','aria-label':kind==='pitch'?'Pitch envelope':'ADSR envelope'});
  const explanation=svg('title');explanation.textContent='Envelope timing uses native normalized parameter positions. Drag a handle, use arrow keys, hold Shift for fine adjustment, or press Escape to cancel a drag.';
  drawing.append(explanation);element.append(drawing);
  if(kind==='pitch'){
    drawing.append(svg('line',{x1:8,y1:39,x2:167,y2:39,class:'live-envelope-zero','aria-hidden':'true'}));
    for(const x of [1,169]){const label=svg('text',{x,y:42,class:'live-envelope-zero-label','aria-hidden':'true'});label.textContent='0';drawing.append(label);}
  }
  const paths=Array.from({length:6},()=>{const path=svg('path',{class:'live-envelope-curve','aria-hidden':'true','data-visible':'false'});drawing.append(path);return path;});
  const definitions=kind==='pitch'?[
    {id:'initial',label:'Pitch envelope initial level',y:'Initial',ySpan:64},
    {id:'time',label:'Pitch envelope time',x:'Time',xSpan:148},
  ]:[
    {id:'attack',label:'Envelope attack time',x:'AttackTime',xSpan:42},
    {id:'sustain',label:'Envelope decay time and sustain level',x:'DecayTime',xSpan:40,y:'SustainLevel',ySpan:57},
    {id:'release',label:'Envelope release time',x:'ReleaseTime',xSpan:40},
  ];
  const names=kind==='pitch'?['Initial','Time']:['AttackTime','DecayTime','SustainLevel','SustainTime','ReleaseTime','ExponentialSlope','Loop','FreeRun'];
  const listeners=[],handles=new Map();let disposed=false,gesture=null,state={};
  const listen=(target,type,handler)=>{target.addEventListener(type,handler);listeners.push(()=>target.removeEventListener(type,handler));};
  const report=error=>{try{onError(error);}catch{}};
  function snapshot(){
    const result={};
    for(const name of names){
      const binding=bindings[name];let current={};
      try{current=binding?.getState?.()??{};}catch(error){report(error);}
      const min=binding?.min??0,max=binding?.max??1,value=typeof current.value==='boolean'?Number(current.value):current.value;
      const known=current.known===true&&Number.isFinite(min)&&Number.isFinite(max)&&min<max&&Number.isFinite(value)&&value>=min&&value<=max;
      result[name]={...current,min,max,value,known,position:known?clamp((value-min)/(max-min)):null,
        enabled:known&&current.enabled===true&&!!(binding?.onInput||binding?.onChange)};
    }
    return result;
  }
  function invoke(name,phase,value){
    const binding=bindings[name],callback=phase==='cancel'?binding?.onCancel:phase==='input'?(binding?.onInput??binding?.onChange):(binding?.onChange??binding?.onInput);
    try{Promise.resolve(callback?.(value)).catch(report);}catch(error){report(error);}
  }
  function primaryName(def,current){
    const fields=[def.x,def.y].filter(Boolean);
    return fields.find(name=>current[name].enabled)??fields.find(name=>current[name].known)??fields[0];
  }
  function continuous(previous,current){
    return Object.keys(previous.original).every(name=>current[name].enabled&&(current[name].generation??null)===previous.generations[name]);
  }
  function releaseGesture(){
    const previous=gesture;gesture=null;
    if(previous?.handle.hasPointerCapture?.(previous.id))previous.handle.releasePointerCapture(previous.id);
    element.setAttribute('data-adjusting','false');return previous;
  }
  function interrupted(current){
    if(!gesture||continuous(gesture,current))return false;
    releaseGesture();return true;
  }
  function refresh(){
    if(disposed)return;
    state=snapshot();interrupted(state);const shape=geometry(kind,state);
    drawing.setAttribute('data-complete',String(names.every(name=>state[name].known)));
    drawing.setAttribute('data-loop',String(state.Loop?.known?state.Loop.value:''));
    drawing.setAttribute('aria-disabled',String(!definitions.some(def=>[def.x,def.y].some(name=>name&&state[name].enabled))));
    paths.forEach((path,index)=>{path.setAttribute('d',shape.segments[index]??'');path.setAttribute('data-visible',String(!!shape.segments[index]));});
    for(const def of definitions){
      const h=handles.get(def.id),fields=[def.x,def.y].filter(Boolean),known=fields.filter(name=>state[name].known),enabled=fields.some(name=>state[name].enabled),primaryAxis=primaryName(def,state),primary=state[primaryAxis];
      const p=shape.handles[def.id];h.setAttribute('transform',`translate(${coordinate(p.x)},${coordinate(p.y)})`);
      h.setAttribute('aria-disabled',String(!enabled));h.setAttribute('tabindex',enabled?'0':'-1');
      h.setAttribute('data-known',String(known.length>0));h.setAttribute('data-partial',String(known.length>0&&known.length<fields.length));
      h.setAttribute('data-pending',String(fields.some(name=>state[name].pending)));
      h.setAttribute('aria-orientation',primaryAxis===def.y?'vertical':'horizontal');
      h.setAttribute('aria-valuemin',String(primary.min));h.setAttribute('aria-valuemax',String(primary.max));
      if(primary.known)h.setAttribute('aria-valuenow',String(primary.value));else h.removeAttribute('aria-valuenow');
      const description=fields.map(name=>`${name.replace(/([a-z])([A-Z])/g,'$1 $2')}: ${state[name].known?tidy(state[name].position*100)+'% native position':'unavailable'}`).join('; ');
      h.setAttribute('aria-valuetext',description);
      h.children[0].textContent=`${def.label}. ${description}. ${def.x&&def.y?'Left/Right adjust decay; Up/Down adjust sustain.':'Use arrow keys to adjust.'} Shift is fine; double-click resets.`;
    }
  }
  function write(name,value){
    const current=snapshot();if(interrupted(current)){refresh();return false;}
    const field=current[name];
    if(!field?.enabled)return false;
    const next=tidy(clamp(value,field.min,field.max));
    if(next===field.value)return false;
    if(gesture)gesture.changed.add(name);
    invoke(name,'input',next);refresh();return true;
  }
  function finish(cancel=false){
    if(!gesture)return;
    const previous=releaseGesture();
    for(const name of previous.changed){
      const current=snapshot();if(!continuous(previous,current))break;
      if(cancel){
        if(bindings[name]?.onCancel)invoke(name,'cancel',previous.original[name]);
        else {invoke(name,'input',previous.original[name]);if(!continuous(previous,snapshot()))break;invoke(name,'change',previous.original[name]);}
      }else invoke(name,'change',current[name].value);
    }
    refresh();
  }
  function pointerScale(){
    const box=drawing.getBoundingClientRect();return{x:box.width>0?175/box.width:0,y:box.height>0?(kind==='pitch'?78:65)/box.height:0};
  }
  for(const def of definitions){
    const h=svg('g',{class:'live-envelope-handle','data-handle':def.id,role:'slider','aria-label':def.label,'aria-orientation':def.y&&!def.x?'vertical':'horizontal'});
    const title=svg('title');h.append(title,svg('rect',{x:-5,y:-5,width:10,height:10,class:'live-envelope-hit','aria-hidden':'true'}),
      svg('rect',{x:-2.25,y:-2.25,width:4.5,height:4.5,class:'live-envelope-square','aria-hidden':'true'}));
    handles.set(def.id,h);drawing.append(h);
    listen(h,'pointerdown',event=>{
      if(disposed||gesture||event.button!==0)return;
      state=snapshot();const fields=[def.x,def.y].filter(name=>name&&state[name].enabled);if(!fields.length)return;
      event.preventDefault();event.stopPropagation();h.focus();
      gesture={id:event.pointerId,handle:h,x:event.clientX,y:event.clientY,original:Object.fromEntries(fields.map(name=>[name,state[name].value])),
        generations:Object.fromEntries(fields.map(name=>[name,state[name].generation??null])),changed:new Set()};
      h.setPointerCapture?.(event.pointerId);element.setAttribute('data-adjusting','true');
    });
    listen(h,'pointermove',event=>{
      if(!gesture||gesture.handle!==h||gesture.id!==event.pointerId)return;
      if(interrupted(snapshot())){refresh();return;}
      const active=gesture;
      event.preventDefault();const scale=pointerScale(),fine=event.shiftKey?.1:1,dx=(event.clientX-gesture.x)*scale.x*fine,dy=(event.clientY-gesture.y)*scale.y*fine;
      gesture.x=event.clientX;gesture.y=event.clientY;
      for(const[name,delta]of [[def.x,dx/def.xSpan],[def.y,-dy/def.ySpan]]){
        if(gesture!==active)break;
        if(!name||!Object.hasOwn(active.original,name))continue;
        const field=snapshot()[name];if(field.enabled)write(name,field.value+delta*(field.max-field.min));
      }
    });
    listen(h,'pointerup',event=>{if(gesture?.handle===h&&gesture.id===event.pointerId)finish();});
    for(const type of ['pointercancel','lostpointercapture'])listen(h,type,event=>{if(gesture?.handle===h&&gesture.id===event.pointerId)finish(true);});
    listen(h,'blur',()=>{if(gesture?.handle===h)finish(true);});
    listen(h,'keydown',event=>{
      if(event.key==='Escape'&&gesture){event.preventDefault();event.stopPropagation();finish(true);return;}
      if(disposed||event.altKey||event.ctrlKey||event.metaKey)return;
      if(interrupted(snapshot())){refresh();return;}
      const current=snapshot(),primary=primaryName(def,current);let name,amount,absolute;
      if(event.key==='Home'||event.key==='End'){name=primary;absolute=event.key==='Home'?'min':'max';}
      else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){name=def.x??def.y;amount=event.key==='ArrowRight'?1:-1;}
      else if(event.key==='ArrowUp'||event.key==='ArrowDown'){name=def.y??def.x;amount=event.key==='ArrowUp'?1:-1;}
      else if(event.key==='PageUp'||event.key==='PageDown'){name=primary;amount=event.key==='PageUp'?10:-10;}
      else return;
      const field=snapshot()[name];if(!field.enabled)return;
      event.preventDefault();event.stopPropagation();
      const next=absolute?field[absolute]:field.value+amount*(field.max-field.min)*(event.shiftKey?.001:.01);
      if(write(name,next))invoke(name,'change',snapshot()[name].value);
      refresh();
    });
    listen(h,'dblclick',event=>{
      if(disposed)return;event.preventDefault();event.stopPropagation();
      for(const name of [def.x,def.y].filter(Boolean)){
        const field=snapshot()[name];if(field.enabled&&Number.isFinite(field.initial)&&write(name,field.initial))invoke(name,'change',snapshot()[name].value);
      }
      refresh();
    });
  }
  if(doc.defaultView)listen(doc.defaultView,'blur',()=>finish(true));
  refresh();
  return{element,refresh,hasDraft:()=>!!gesture,dispose(){if(disposed)return;finish(true);disposed=true;for(const remove of listeners)remove();}};
}
