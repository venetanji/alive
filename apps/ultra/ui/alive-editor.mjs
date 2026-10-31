import {createNodeView,nodeConfiguration} from './canvas-node.mjs';
import {nodeSpec,validatePatch} from './canvas-model.mjs';
import {applyNodeAppearance} from './canvas-appearance-view.mjs';
import {cablePath,cableBounds} from './canvas-cable-path.mjs';
import {parameterReading,actualDevices} from './alive-model.mjs';

export function mountHostedEditor({doc=globalThis.document,win=globalThis.window,invoke=win?.__TAURI__?.core?.invoke}={}){
  const $=id=>doc.getElementById(id),make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  let snapshot=null,patch=null,path=[],zoom=.75,identity='',queue=Promise.resolve(),disposed=false,autoFit=true;
  const views=new Map(),controls=new Map();
  const fittedZoom=make('option');fittedZoom.hidden=true;$('hosted-zoom').append(fittedZoom);
  function notice(text,error=false){$('hosted-notice').textContent=String(text);$('hosted-notice').classList.toggle('error',error);}
  function enqueue(work){const result=queue.then(work);queue=result.catch(error=>notice(error,true));return result;}
  const guard=work=>(...args)=>{try{Promise.resolve(work(...args)).catch(error=>notice(error,true));}catch(error){notice(error,true);}};
  const structural=()=>notice('For graph changes, stop Alive, edit the saved .ultra source in Ultra, then use Replace in Alive.');
  function scope(){let current=patch;for(const id of path){const node=current.nodes.find(n=>n.id===id);if(!node?.patcher){path=[];return patch;}current=node.patcher;}return current;}
  async function setBase(key,value){
    const generation=snapshot.generation,instanceId=snapshot.instanceId;
    return enqueue(async()=>{await invoke('alive_base',{instanceId,key,value,generation});await refresh();notice('Session base updated. Automation ownership is preserved.');});
  }
  function parameter(node,key,value){
    const binding=snapshot.deviceInstances[snapshot.instanceId].manifest.parameters.find(p=>p.node===node&&p.param===key);
    if(!binding){structural();return false;}guard(()=>setBase(binding.key,value))();return true;
  }
  function navigate(id){if(id===null)path=[];else path.push(id);autoFit=true;render();}
  function buildControls(){
    $('hosted-parameters').replaceChildren();controls.clear();
    for(const binding of snapshot.deviceInstances[snapshot.instanceId].manifest.parameters){
      const group=make('div','hosted-parameter'),label=make('label','',binding.label),input=make('input'),output=make('output');
      input.type='number';input.min=binding.min;input.max=binding.max;input.step=binding.integral?'1':binding.max<=1?'.01':binding.max<=20?'.1':'1';input.value=binding.base;input.id=`hosted-${binding.key}`;label.htmlFor=input.id;input.setAttribute('aria-label',`Hosted ${binding.label} base`);output.setAttribute('aria-label',`Hosted ${binding.label} effective ownership`);
      input.addEventListener('change',guard(()=>{if(input.value==='')throw Error(`${binding.label} requires a number.`);return setBase(binding.key,Number(input.value));}));
      group.append(label,input,output);$('hosted-parameters').append(group);controls.set(binding.key,{group,input,output});
    }
  }
  function drawCables(current){
    const svg=$('cables'),base=$('canvas').getBoundingClientRect();svg.replaceChildren();
    const endpoint=(id,direction,index)=>{const rect=views.get(id)?.ports[direction][index]?.getBoundingClientRect();return rect?{x:(rect.left-base.left+rect.width/2)/zoom,y:(rect.top-base.top+rect.height/2)/zoom}:null;};
    for(const edge of current.edges){
      const a=endpoint(edge.from,'out',edge.outlet),b=endpoint(edge.to,'in',edge.inlet);if(!a||!b)continue;
      const source=current.nodes.find(n=>n.id===edge.from),kind=nodeSpec(source).outlets[edge.outlet].type,path=doc.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',cablePath(a,b,edge.midpoints));path.setAttribute('class',`cable ${kind}`);path.setAttribute('aria-label',`Cable ${edge.from}:${edge.outlet} to ${edge.to}:${edge.inlet}`);svg.append(path);
    }
  }
  function render(){
    if(!snapshot||!patch)return;
    const device=snapshot.deviceInstances[snapshot.instanceId].manifest,track=snapshot.document.tracks[snapshot.track],runtime=snapshot.state.devices[snapshot.deviceIndex];
    $('hosted-title').textContent=`${track.name} / ${device.name}`;$('hosted-source').textContent=actualDevices(track).find(d=>d.instanceId===snapshot.instanceId).path;doc.title=`${track.name} - Ultra Hosted Editor`;
    const nextIdentity=JSON.stringify([snapshot.generation,snapshot.instanceId]);if(nextIdentity!==identity){identity=nextIdentity;path=[];buildControls();autoFit=true;}
    device.parameters.forEach((binding,index)=>{const view=controls.get(binding.key),reading=parameterReading(binding,runtime,index);if(doc.activeElement!==view.input)view.input.value=reading.base;view.output.textContent=`${reading.owner}: ${Number(reading.effective.toFixed(3))}${binding.unit?' '+binding.unit:''}`;view.group.classList.toggle('automated',reading.owner==='Automation');});
    const current=scope(),ids=new Set(current.nodes.map(n=>n.id));for(const[id,view]of views)if(!ids.has(id)){view.dispose();views.delete(id);}
    const rendered=[],state={native:true,ready:true,busy:false,observations:{},messageBoxes:{}};
    for(const node of current.nodes){
      if(!views.has(node.id)||views.get(node.id).configuration!==nodeConfiguration(node)){
        views.get(node.id)?.dispose();
        const noop=()=>{};
        const view=createNodeView(node,{doc,select:noop,dragStart:noop,edit:id=>{const n=current.nodes.find(n=>n.id===id);if(n?.type==='patcher')navigate(id);else structural();},portClick:noop,portDown:noop,hover:noop,unhover:noop,context:structural,operate:structural,parameter,tab:noop,resize:structural,getZoom:()=>zoom});
        views.set(node.id,view);
      }
      const view=views.get(node.id),bindings=device.parameters.filter(p=>p.node===node.id);
      view.update(node,state,{locked:true});applyNodeAppearance(view,node,doc);
      view.element.classList.toggle('hosted-unbound',!bindings.length);
      for(const[key,input]of view.inputs){const binding=bindings.find(p=>p.param===key);input.disabled=!binding;if(binding){input.min=binding.min;input.max=binding.max;input.step=binding.integral?'1':'any';input.setAttribute('aria-label',`Hosted ${binding.label} graph base`);}}
      for(const port of [...view.ports.in,...view.ports.out]){port.disabled=true;port.tabIndex=-1;}rendered.push(view.element);
    }
    const container=$('objects');if(container.children.length!==rendered.length||rendered.some((e,i)=>container.children[i]!==e))container.replaceChildren(...rendered);
    const bounds=cableBounds(current.edges),width=Math.max(600,(bounds?.right??0)+40,...current.nodes.map(n=>n.x+Math.max(n.style?.width??0,230))),height=Math.max(400,(bounds?.bottom??0)+40,...current.nodes.map(n=>n.y+Math.max(n.style?.height??0,100)));
    if(autoFit){zoom=Math.min(1,Math.max(.25,Math.min((($('workspace').clientWidth||1000)-30)/width,(($('workspace').clientHeight||500)-30)/height)));autoFit=false;}
    fittedZoom.hidden=[.5,.75,1,1.25].includes(zoom);fittedZoom.value=String(zoom);fittedZoom.textContent=`${Math.round(zoom*100)}% (Fit)`;$('hosted-zoom').value=String(zoom);
    $('canvas').style.width=`${width}px`;$('canvas').style.height=`${height}px`;$('canvas').style.transform=`scale(${zoom})`;$('hosted-space').style.width=`${width*zoom}px`;$('hosted-space').style.height=`${height*zoom}px`;
    $('hosted-summary').textContent=`${current.nodes.length} objects / ${current.edges.length} cables / ${Math.round(zoom*100)}%`;
    $('hosted-path').replaceChildren();const root=make('button','','Root');root.addEventListener('click',()=>navigate(null));$('hosted-path').append(root);let tree=patch;
    path.forEach((id,index)=>{const node=tree.nodes.find(n=>n.id===id),button=make('button','',node.params.name);button.addEventListener('click',()=>{path=path.slice(0,index+1);autoFit=true;render();});$('hosted-path').append(button);tree=node.patcher;});
    drawCables(current);
  }
  async function refresh(){snapshot=await invoke('alive_current');if(snapshot.track===null||!snapshot.patch)throw Error('Open a hosted device editor from Alive.');patch=validatePatch(snapshot.patch);render();}
  $('hosted-close').addEventListener('click',guard(async()=>{doc.activeElement?.blur?.();await queue;await win.__TAURI__.window.getCurrentWindow().close();}));
  $('hosted-fit').addEventListener('click',()=>{autoFit=true;render();});$('hosted-zoom').value=String(zoom);$('hosted-zoom').addEventListener('change',()=>{zoom=Number($('hosted-zoom').value);autoFit=false;render();});
  const resize=()=>{if(snapshot)drawCables(scope());};win.addEventListener('resize',resize);
  async function poll(){if(disposed)return;try{await enqueue(refresh);}catch{}if(!disposed)win.setTimeout(poll,100);}
  const ready=invoke?enqueue(refresh).then(()=>notice('Hosted device ready. Closing this window preserves playback.')):Promise.resolve(notice('Open this hosted editor from native Alive.',true));
  ready.catch(()=>{});if(invoke)win.setTimeout(poll,100);
  return{ready,refresh,dispose(){disposed=true;for(const view of views.values())view.dispose();win.removeEventListener('resize',resize);}};
}
if(globalThis.document)mountHostedEditor();
