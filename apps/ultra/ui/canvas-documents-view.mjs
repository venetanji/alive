import {createDocumentSession} from './canvas-documents.mjs';
import {LIBRARY_ENTRIES,createLibraryPatch,searchLibrary} from './canvas-library.mjs';
import {parsePatch} from './canvas-model.mjs';
import {MAX_IMPORT_LIMITS,readPatchFile} from './canvas-max-import.mjs';

export function mountDocuments({doc,win,invoke,getPatch,adopt,beforeSave,beforeClose,onCloseCancelled=()=>{},inspect,notice,onDocument=()=>{},onDescriptor=()=>{},onReveal=()=>{}}){
  const $=id=>doc.querySelector('#'+id),make=(tag,className,text)=>{const e=doc.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
  const cleanPatch={version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]};
  const unlisten=[];let disposed=false,returnFocus=null,readyTask=null;
  const guard=fn=>(...args)=>{try{return Promise.resolve(fn(...args)).catch(notice);}catch(error){notice(error);}};
  const pageURL=params=>{const url=new URL(win.location.href||'http://localhost/canvas.html');url.search='';url.hash='';for(const [key,value]of Object.entries(params))url.searchParams.set(key,value);return url.href;};
  function openPreview(params){const opened=win.open?.(pageURL(params),'_blank');if(!opened)throw Error('The preview window was blocked. Allow pop-ups for this site, then try again.');return opened;}
  const browser={
    current(){
      const query=new URLSearchParams(win.location.search||'');
      if(query.has('new'))return{title:'Untitled patch',kind:'patch',patch:cleanPatch};
      if(query.has('library')){
        const key=query.get('library'),entry=LIBRARY_ENTRIES.find(entry=>entry.key===key);if(!entry)throw Error('This help entry does not exist.');
        return{title:entry.title,kind:entry.kind,helpKey:key,patch:createLibraryPatch(key)};
      }
      if(query.has('previewDocument')){
        const key=query.get('previewDocument'),source=win.sessionStorage?.getItem(key);win.sessionStorage?.removeItem(key);
        if(!source)throw Error('The preview document is no longer available. Open the file again.');return JSON.parse(source);
      }
      return null;
    },
    new:()=>openPreview({new:'1'}),open:()=>$('document-file').click(),openHelp:key=>openPreview({library:key}),
    save(patch,descriptor){
      const url=URL.createObjectURL(new Blob([JSON.stringify(patch,null,2)+'\n'],{type:'application/json'})),link=make('a');
      link.href=url;link.download=(descriptor.title||'Untitled patch').replace(/\.(?:json|ultra|maxpat|maxhelp)$/i,'')+'.ultra';link.click();
      win.setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Patch download requested.');return{...descriptor,title:link.download,kind:'patch'};
    },
  };
  const session=createDocumentSession({invoke,getPatch,adopt,beforeSave,beforeClose,inspect,notice,browser,
    setTimer:(fn,ms)=>win.setTimeout(fn,ms),clearTimer:id=>win.clearTimeout(id),onSaveReleased:onCloseCancelled,metadata:value=>{
    const title=value.viewTitle||value.title;
    $('document-title').textContent=title;$('document-title').title=value.path||value.title;$('document-dirty').hidden=!value.dirty;
    doc.title=`${value.dirty?'* ':''}${title} - Ultra`;onDocument(value);
  }});
  function closeLibrary(){$('help-library').close();returnFocus?.focus?.();}
  function renderLibrary(){
    const entries=searchLibrary($('help-library-search').value,$('help-library-kind').value||'all'),area=$('help-library-results');area.replaceChildren();
    $('help-library-count').textContent=`${entries.length} ${entries.length===1?'entry':'entries'}`;
    if(!entries.length){area.append(make('p','library-empty','No matching help or examples. Try an object name, alias, or topic such as timing.'));return;}
    let lastGroup='';
    for(const entry of [...entries].sort((a,b)=>a.group.localeCompare(b.group)||a.title.localeCompare(b.title))){
      if(entry.group!==lastGroup){lastGroup=entry.group;area.append(make('h3','library-group',entry.group));}
      const row=make('button','library-entry');row.type='button';row.dataset.libraryKey=entry.key;
      const heading=make('span','library-entry-heading');heading.append(make('strong','',entry.title),make('span','library-entry-kind',entry.kind));
      row.append(heading,make('span','library-entry-summary',entry.summary));row.addEventListener('click',guard(async()=>{await session.openHelp(entry.key);closeLibrary();}));area.append(row);
    }
  }
  async function openLibrary(query=''){
    returnFocus=doc.activeElement;$('help-library-search').value=query;renderLibrary();
    if(!$('help-library').open)$('help-library').showModal();$('help-library-search').focus();
    const area=$('document-windows');area.replaceChildren();$('document-windows-section').hidden=!invoke;
    if(invoke){
      const documents=await session.list();if(disposed||!Array.isArray(documents))return;
      for(const document of documents){
        const button=make('button','document-window',`${document.title}${document.dirty?' *':''}`);button.type='button';button.dataset.windowLabel=document.label;
        if(document.label===session.document.label){button.setAttribute('aria-current','true');button.append(make('span','','Current'));}
        button.addEventListener('click',guard(async()=>{await session.focus(document.label);closeLibrary();}));area.append(button);
      }
    }
  }
  const actions={new:()=>session.new(),open:()=>session.open(),save:()=>session.save(),'save-as':()=>session.save(true),library:()=>openLibrary(),close:()=>win.__TAURI__?.window?.getCurrentWindow?.().close()};
  for(const [id,action]of [['new-patch','new'],['document-new','new'],['document-open','open'],['document-open-menu','open'],['document-save','save'],['document-save-menu','save'],['document-save-as','save-as'],['open-help-library','library'],['help-library-menu','library']]){
    $(id).addEventListener('click',guard(()=>{$('file-menu').open=false;return actions[action]();}));
  }
  $('starter-patch').addEventListener('click',guard(()=>session.openHelp('example:starter')));
  $('help-library-search').addEventListener('input',renderLibrary);$('help-library-kind').addEventListener('change',renderLibrary);
  $('help-library-close').addEventListener('click',closeLibrary);$('help-library').addEventListener('cancel',e=>{e.preventDefault();closeLibrary();});
  $('help-library').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeLibrary();}});
  async function openFile(file){
    if(!file)return;if(file.size>MAX_IMPORT_LIMITS.bytes)throw Error('Input exceeds the 8 MiB analysis limit.');
    const opened=win.open?.('about:blank','_blank');if(!opened)throw Error('The preview window was blocked. Allow pop-ups for this site, then open the file again.');
    try{
      const source=await readPatchFile(file);let input;try{input=JSON.parse(source.replace(/^\uFEFF/,''));}catch{throw Error('Patch is not valid JSON.');}
      const descriptor=input&&typeof input==='object'&&Object.hasOwn(input,'patcher')?{title:file.name,kind:'patch',source,sourceName:file.name,patch:cleanPatch}:{title:file.name,kind:'patch',patch:parsePatch(source)};
      const key=`ultra-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      opened.sessionStorage.setItem(key,JSON.stringify(descriptor));opened.location.replace(pageURL({previewDocument:key}));
    }catch(error){opened.close();throw error;}
  }
  $('document-file').addEventListener('change',guard(async e=>{try{await openFile(e.target.files?.[0]);}finally{e.target.value='';}}));
  if(!invoke){
    doc.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files'))e.preventDefault();});
    doc.addEventListener('drop',guard(e=>{if(!e.dataTransfer?.files?.length)return;e.preventDefault();return openFile(e.dataTransfer.files[0]);}));
  }
  const events=win.__TAURI__?.event,eventLabel=win.__TAURI__?.webviewWindow?.getCurrentWebviewWindow?.().label;
  async function listen(name,handler){
    if(!events?.listen)return;if(!eventLabel)throw Error('Cannot determine the document window for native events.');
    const off=await events.listen(name,guard(handler),{target:{kind:'WebviewWindow',label:eventLabel}});
    if(disposed)off();else unlisten.push(off);
  }
  const subscriptions=invoke?Promise.all([
    listen('document-action',event=>actions[event.payload]?.()),
    listen('document-save-before-close',event=>session.saveBeforeClose(event.payload)),
    listen('document-flush-before-close',async event=>{if(readyTask)await readyTask;return session.flushBeforeClose(event.payload);}),
    listen('document-flush-before-save',async event=>{if(readyTask)await readyTask;return session.flushBeforeSave(event.payload);}),
    listen('document-save-flush-released',event=>{const barrier=session.releaseSave(event.payload);if(barrier)return onCloseCancelled(barrier);}),
    listen('document-close-cancelled',async event=>{if(readyTask)await readyTask;session.cancelClose(event.payload);return onCloseCancelled(event.payload);}),
    listen('document-error',event=>notice(event.payload)),
    listen('document-changed',event=>{if(session.acceptDescriptor(event.payload))return onDescriptor(event.payload);}),
    listen('document-reveal',async event=>{if(readyTask)await readyTask;return onReveal(event.payload);}),
  ]):Promise.resolve();
  if(invoke){
    const webview=win.__TAURI__?.webview?.getCurrentWebview?.();
    if(webview?.onDragDropEvent)webview.onDragDropEvent(guard(async event=>{if(event.payload.type==='drop')for(const path of event.payload.paths||[])await session.open(path);})).then(off=>{if(disposed)off();else unlisten.push(off);}).catch(notice);
  }
  return{session,openLibrary,openHelp:key=>session.openHelp(key),action:action=>actions[action]?.(),ready:()=>readyTask??=(async()=>{await subscriptions;return session.ready();})(),update:()=>session.update(),isOpen:()=>$('help-library').open,dispose(){disposed=true;session.dispose();unlisten.splice(0).forEach(off=>off());}};
}
