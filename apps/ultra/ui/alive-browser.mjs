const categories=[['all','All'],['instrument','Instruments'],['effect','Audio Effects'],['source','Project Clips']];

export function browserEntries(bundled=[],document,instances={}){
  const entries=[],paths=new Set();
  function device(entry){if(!entry.path||paths.has(entry.path))return;paths.add(entry.path);entries.push({...entry,id:`device:${entry.path}`});}
  for(const entry of bundled)device(entry);
  for(const track of document?.tracks??[]){
    const instrument=track.chain?.instrument??track.device;
    for(const [reference,kind]of [[instrument,'instrument'],...(track.effects??[]).map(effect=>[effect,'effect'])]){
      if(!reference)continue;const manifest=instances[reference.instanceId]?.manifest;
      device({kind,path:instances[reference.instanceId]?.path??reference.path,name:manifest?.name??reference.id??'Saved device',description:`In project / ${track.name}`});
    }
  }
  if(document?.format==='alive-session-v4'){
    for(const source of document.sources??[]){
      if(source.kind!=='midi')continue;
      const track=document.tracks.find(track=>track.id===source.trackId);
      entries.push({id:`source:${source.id}`,kind:'source',sourceId:source.id,trackId:source.trackId,name:source.name,description:`${track?.name??'MIDI'} / ${source.lengthBeats} beats`});
    }
  }else{
    for(const track of document?.tracks??[])for(const [slot,clip]of (track.slots??[]).entries()){
      if(clip)entries.push({id:`clip:${track.id}:${clip.id}`,kind:'source',name:clip.name,description:`${track.name} / ${clip.lengthBeats} beats`,trackId:track.id,slot,clipId:clip.id});
    }
  }
  return entries;
}

export function filterEntries(entries,query='',category='all'){
  const words=String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(entry=>(category==='all'||entry.kind===category)&&words.every(word=>`${entry.name} ${entry.description??''}`.toLocaleLowerCase().includes(word)));
}

export function mountBrowser({doc,root,onLoad,onSource,onCatalog,onNavigate=()=>{}}){
  const make=(tag,className,text)=>{const element=doc.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;};
  const search=make('input','browser-search');search.type='search';search.placeholder='Search library';search.setAttribute('aria-label','Search browser');
  const body=make('div','browser-body'),nav=make('nav','browser-categories'),results=make('div','browser-results'),heading=make('div','browser-results-heading','Name'),list=make('div','browser-list'),empty=make('p','browser-empty'),footer=make('div','browser-selection'),description=make('p','browser-description'),activate=make('button','browser-load','Load'),status=make('p','browser-status');
  nav.setAttribute('aria-label','Browser categories');list.setAttribute('role','listbox');list.setAttribute('aria-label','Browser results');list.tabIndex=0;
  status.setAttribute('role','status');description.textContent='Select a device or clip';
  results.append(heading,list,empty);body.append(nav,results);footer.append(description,activate);root.append(search,body,footer,status);
  let category='all',selected=null,entries=[],state={},bundled=[],catalogState='idle',catalogError='',key='',resultsKey='',disposed=false;
  const categoryButtons=[];
  for(const [id,label]of categories){
    const button=make('button','browser-category',label);button.setAttribute('aria-label',`Browse ${label}`);button.addEventListener('click',()=>{category=id;paint();if(id!=='source')ensureCatalog();});nav.append(button);categoryButtons.push([id,button]);
  }
  function selectedEntry(){return entries.find(entry=>entry.id===selected);}
  async function ensureCatalog(){
    if(catalogState!=='idle'||!onCatalog)return;catalogState='loading';paint();
    try{const result=await onCatalog();if(disposed)return;bundled=Array.isArray(result)?result:[];catalogState='ready';key='';update(state);}
    catch(error){if(disposed)return;catalogState='failed';catalogError=`Library unavailable: ${String(error)}. Use Open device below.`;paint();}
  }
  function choose(id){selected=id;paint();}
  function move(keyName){
    const visible=filterEntries(entries,search.value,category);if(!visible.length)return;
    const index=visible.findIndex(entry=>entry.id===selected),next=keyName==='Home'?0:keyName==='End'?visible.length-1:Math.max(0,Math.min(visible.length-1,index+(keyName==='ArrowUp'?-1:1)));
    choose(visible[next].id);list.querySelector?.('[aria-selected="true"]')?.scrollIntoView?.({block:'nearest'});
  }
  async function load(){
    const entry=selectedEntry();if(!entry||activate.disabled)return;
    try{await (entry.kind==='source'?onSource(entry):onLoad(entry));}
    catch(error){status.textContent=String(error);status.classList.add('error');}
  }
  function paint(){
    const visible=filterEntries(entries,search.value,category);
    if(selected&&!visible.some(entry=>entry.id===selected))selected=null;
    for(const [id,button]of categoryButtons)button.setAttribute('aria-pressed',String(category===id));
    const nextResultsKey=JSON.stringify(visible);
    if(nextResultsKey!==resultsKey){
      resultsKey=nextResultsKey;list.replaceChildren();
      for(const entry of visible){
      const row=make('button','browser-result'),glyph=make('span',`browser-glyph ${entry.kind}`),name=make('span','browser-result-name',entry.name);
      row.id=`browser-entry-${entries.indexOf(entry)}`;row.type='button';row.tabIndex=-1;row.setAttribute('role','option');row.setAttribute('data-entry',entry.id);row.setAttribute('aria-label',entry.name);row.title=[entry.name,entry.description].filter(Boolean).join(' / ');
      glyph.setAttribute('aria-hidden','true');row.append(glyph,name);row.addEventListener('click',()=>{choose(entry.id);list.focus();});row.addEventListener('dblclick',()=>{choose(entry.id);load();});list.append(row);
      }
    }
    for(const row of list.children)row.setAttribute('aria-selected',String(row.getAttribute('data-entry')===selected));
    const chosen=selectedEntry(),blocked=chosen?.kind==='instrument'?state.instrumentBlocked:chosen?.kind==='effect'?state.effectBlocked:'';
    const active=list.children?.[visible.findIndex(entry=>entry.id===selected)];
    if(active)list.setAttribute('aria-activedescendant',active.id);else list.removeAttribute('aria-activedescendant');
    empty.hidden=visible.length>0;empty.textContent=search.value.trim()?'No results. Try another search.':'No clips in this project.';
    description.textContent=chosen?.description??(chosen?'Saved Ultra device':'Select a device or clip');activate.disabled=!chosen||!!blocked;activate.textContent=chosen?.kind==='source'?'Open Clip':chosen?.kind==='instrument'?'Add Track':'Add Effect';activate.title=blocked??'';
    status.textContent=blocked||catalogError||(catalogState==='loading'?'Loading bundled library...':`${visible.length} ${visible.length===1?'item':'items'}`);status.classList.toggle('error',!!catalogError);
  }
  function update(next){state=next;const nextEntries=browserEntries(bundled,next.document,next.instances);const nextKey=JSON.stringify([nextEntries,next.instrumentBlocked,next.effectBlocked]);if(nextKey===key)return;key=nextKey;entries=nextEntries;paint();}
  search.addEventListener('input',()=>{paint();ensureCatalog();});
  search.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();move(event.key);list.focus();}else if(event.key==='Escape'){event.preventDefault();search.value='';paint();}});
  list.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();move(event.key);}else if(event.key==='Enter'){event.preventDefault();load();}});
  const preserve=event=>{if(!root.contains(doc.activeElement)&&!activate.contains(event.target))onNavigate();};
  root.addEventListener('pointerdown',preserve,true);
  activate.addEventListener('click',load);paint();
  return{render:update,dispose(){disposed=true;root.removeEventListener('pointerdown',preserve,true);}};
}
