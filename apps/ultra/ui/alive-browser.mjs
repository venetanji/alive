const categories=[['all','All'],['instrument','Instruments'],['audioEffect','Audio Effects'],['midiEffect','MIDI Effects'],['source','Project Clips']];

export function deviceAdmissionReason(entry){
  if(entry?.qualification!=='qualified'||entry.availability!=='ready')return entry?.reason||'This device is not available for loading.';
  if(typeof entry.path!=='string'||!entry.path.trim())return entry.reason||'Save a qualified device before loading it.';
  if(!['instrument','audioEffect'].includes(entry.kind))return entry.reason||'MIDI device hosting is not available.';
  return '';
}

export function browserEntries(bundled=[],document,instances={}){
  const entries=[],paths=new Set();
  function device(entry){if(!entry.path||paths.has(entry.path))return;paths.add(entry.path);entries.push({...entry,id:`device:${entry.path}`,provider:'project',qualification:'qualified',availability:'ready',reason:null,profile:null,dependencies:[]});}
  for(const entry of bundled){entries.push(entry);if(entry.path)paths.add(entry.path);}
  for(const track of document?.tracks??[]){
    const instrument=track.chain.kind==='midi'?track.chain.instrument:null;
    for(const [reference,kind]of [[instrument,'instrument'],...(track.effects??[]).map(effect=>[effect,'audioEffect'])]){
      if(!reference)continue;const manifest=instances[reference.instanceId]?.manifest;
      device({kind,path:instances[reference.instanceId]?.path??reference.path,name:manifest?.name??reference.id??'Saved device',description:`In project / ${track.name}`});
    }
  }
  for(const source of document?.sources??[]){
    const track=document.tracks.find(track=>track.id===source.trackId);
    entries.push({id:`source:${source.id}`,kind:'source',sourceId:source.id,trackId:source.trackId,name:source.name,description:`${track.name} / ${source.kind==='audio'?'Audio':`${source.lengthBeats} beats`}`});
  }
  return entries;
}

export function filterEntries(entries,query='',category='all'){
  const words=String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(entry=>(category==='all'||entry.kind===category)&&words.every(word=>`${entry.name} ${entry.description??''} ${entry.reason??''}`.toLocaleLowerCase().includes(word)));
}

export function mountBrowser({doc,root,onLoad,onSource,onCatalog,onNavigate=()=>{},onDeviceDrag=()=>{},onDragEnd=()=>{}}){
  const make=(tag,className,text)=>{const element=doc.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;};
  const search=make('input','browser-search');search.type='search';search.placeholder='Search library';search.setAttribute('aria-label','Search browser');
  const toolbar=make('div','browser-toolbar'),refresh=make('button','browser-refresh');refresh.type='button';refresh.setAttribute('aria-label','Refresh Library');refresh.title='Refresh Library';
  const refreshIcon=doc.createElementNS('http://www.w3.org/2000/svg','svg'),refreshPath=doc.createElementNS('http://www.w3.org/2000/svg','path');
  refreshIcon.setAttribute('viewBox','0 0 18 18');refreshIcon.setAttribute('aria-hidden','true');refreshPath.setAttribute('d','M14 7A5 5 0 1 0 14 11M14 3V7H10');refreshIcon.append(refreshPath);refresh.append(refreshIcon,make('span','','Refresh Library'));
  const body=make('div','browser-body'),nav=make('nav','browser-categories'),results=make('div','browser-results'),heading=make('div','browser-results-heading','Name'),list=make('div','browser-list'),empty=make('p','browser-empty'),footer=make('div','browser-selection'),description=make('p','browser-description'),activate=make('button','browser-load','Load'),status=make('p','browser-status');
  nav.setAttribute('aria-label','Browser categories');list.setAttribute('role','listbox');list.setAttribute('aria-label','Browser results');list.tabIndex=0;
  status.setAttribute('role','status');description.textContent='Select a device or clip';
  toolbar.append(search,refresh);results.append(heading,list,empty);body.append(nav,results);footer.append(description,activate);root.append(toolbar,body,footer,status);
  let category='all',selected=null,entries=[],state={},bundled=[],catalogState='idle',catalogError='',catalogNotices=[],requestOwner=0,key='',resultsKey='',disposed=false;
  const categoryButtons=[];
  for(const [id,label]of categories){
    const button=make('button','browser-category',label);button.setAttribute('aria-label',`Browse ${label}`);button.addEventListener('click',()=>{category=id;paint();if(id!=='source')ensureCatalog();});nav.append(button);categoryButtons.push([id,button]);
  }
  function selectedEntry(){return entries.find(entry=>entry.id===selected);}
  async function ensureCatalog(refreshIndex=false){
    if(disposed||!onCatalog||(!refreshIndex&&catalogState!=='idle'))return;
    const owner=++requestOwner,previous=bundled,received=new Map();let cursor=null,revision=null;
    catalogState='loading';catalogError='';catalogNotices=[];paint();
    try{
      do{
        const page=await onCatalog({refresh:refreshIndex&&cursor===null,cursor});
        if(disposed||owner!==requestOwner)return;
        if(!page||!Array.isArray(page.entries)||typeof page.revision!=='string'||!Array.isArray(page.notices))throw Error('Invalid library response');
        if(revision!==null&&page.revision!==revision)throw Error('The library changed while loading. Refresh Library to retry.');
        revision=page.revision;
        for(const entry of page.entries)received.set(entry.id,entry);
        catalogNotices=[...new Set([...catalogNotices,...page.notices])];
        const next=page.nextCursor;
        if(next&&(next.revision!==revision||!Number.isInteger(next.offset)||next.offset<=(cursor?.offset??0)))throw Error('Invalid library continuation');
        cursor=next;
        // Retain old rows during a refresh so selection survives until its page arrives.
        bundled=cursor?[...new Map([...previous,...received.values()].map(entry=>[entry.id,entry])).values()]:[...received.values()];
        if(!cursor)catalogState='ready';key='';update(state);
      }while(cursor);
    }catch(error){if(disposed||owner!==requestOwner)return;catalogState='failed';catalogError=`Library unavailable: ${String(error)}. Refresh Library to retry.`;paint();}
  }
  function choose(id){selected=id;paint();}
  function move(keyName){
    const visible=filterEntries(entries,search.value,category);if(!visible.length)return;
    const index=visible.findIndex(entry=>entry.id===selected),next=keyName==='Home'?0:keyName==='End'?visible.length-1:Math.max(0,Math.min(visible.length-1,index+(keyName==='ArrowUp'?-1:1)));
    choose(visible[next].id);list.querySelector?.('[aria-selected="true"]')?.scrollIntoView?.({block:'nearest'});
  }
  async function load(){
    const entry=selectedEntry();if(disposed||!entry||activate.disabled||(entry.kind!=='source'&&deviceAdmissionReason(entry)))return;
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
      row.id=`browser-entry-${entries.indexOf(entry)}`;row.type='button';row.tabIndex=-1;row.setAttribute('role','option');row.setAttribute('data-entry',entry.id);row.setAttribute('aria-label',entry.name);row.title=[entry.name,entry.description,entry.reason].filter(Boolean).join(' / ');
      if(entry.kind!=='source'){const blocked=deviceAdmissionReason(entry);row.draggable=!blocked;row.classList.toggle('unavailable',!!blocked);row.addEventListener('dragstart',event=>{if(disposed||deviceAdmissionReason(entry)){event.preventDefault();return;}choose(entry.id);onDeviceDrag(entry,event);});row.addEventListener('dragend',onDragEnd);}
      glyph.setAttribute('aria-hidden','true');row.append(glyph,name);row.addEventListener('click',()=>{choose(entry.id);list.focus();});row.addEventListener('dblclick',()=>{choose(entry.id);load();});list.append(row);
      }
    }
    for(const row of list.children)row.setAttribute('aria-selected',String(row.getAttribute('data-entry')===selected));
    const chosen=selectedEntry(),blocked=chosen&&chosen.kind!=='source'?(deviceAdmissionReason(chosen)||(chosen.kind==='instrument'?state.instrumentBlocked:state.effectBlocked)):'';
    const active=list.children?.[visible.findIndex(entry=>entry.id===selected)];
    if(active)list.setAttribute('aria-activedescendant',active.id);else list.removeAttribute('aria-activedescendant');
    empty.hidden=visible.length>0;empty.textContent=search.value.trim()?'No results. Try another search.':category==='source'?'No clips in this project.':'No devices found.';
    description.textContent=chosen?[chosen.description??'Saved Ultra device',chosen.reason].filter(Boolean).join(' / '):'Drag an instrument or effect onto a track';activate.disabled=!chosen||!!blocked;activate.textContent=chosen?.kind==='source'?'Open Clip':chosen?.kind==='instrument'?(state.instrumentNeedsTrack?'Add Track':'Load Instrument'):'Add Effect';activate.title=blocked??'';
    list.setAttribute('aria-busy',String(catalogState==='loading'));
    status.textContent=[blocked,catalogError,catalogState==='loading'?'Loading library...':`${visible.length} ${visible.length===1?'item':'items'}`,...catalogNotices].filter(Boolean).join(' / ');status.classList.toggle('error',!!catalogError);
  }
  function update(next){state=next;const nextEntries=browserEntries(bundled,next.document,next.instances);const nextKey=JSON.stringify([nextEntries,next.instrumentBlocked,next.effectBlocked,next.instrumentNeedsTrack]);if(nextKey===key)return;key=nextKey;entries=nextEntries;paint();}
  search.addEventListener('input',()=>{paint();ensureCatalog();});
  search.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();move(event.key);list.focus();}else if(event.key==='Escape'){event.preventDefault();search.value='';paint();}});
  list.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();move(event.key);}else if(event.key==='Enter'){event.preventDefault();load();}});
  const preserve=event=>{if(!root.contains(doc.activeElement)&&!activate.contains(event.target))onNavigate();};
  root.addEventListener('pointerdown',preserve,true);
  refresh.addEventListener('click',()=>{ensureCatalog(true);});activate.addEventListener('click',load);paint();ensureCatalog();
  return{render:update,dispose(){disposed=true;requestOwner++;root.removeEventListener('pointerdown',preserve,true);}};
}
