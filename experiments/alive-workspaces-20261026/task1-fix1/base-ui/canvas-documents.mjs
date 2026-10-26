const copy=value=>JSON.parse(JSON.stringify(value));
const fingerprint=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);

export function createDocumentSession({invoke,getPatch,adopt,beforeSave=async()=>{},beforeClose=beforeSave,metadata=()=>{},notice=()=>{},inspect=()=>{},browser={}}){
  let descriptor={title:'Untitled patch',kind:'patch'},baseline=null,dirty=false,active=false,reported=null,notifications=Promise.resolve(),saving=null;
  const closing=new Map();
  const publish=()=>metadata({...descriptor,dirty});
  function acceptDescriptor(value){
    if(!value||typeof value!=='object')return false;
    if(descriptor.shared&&value.ownerLabel&&value.ownerLabel!==descriptor.ownerLabel)return false;
    if(descriptor.shared&&Number.isSafeInteger(value.authoringRevision)&&value.authoringRevision<descriptor.authoringRevision)return false;
    if(descriptor.shared&&Number.isSafeInteger(descriptor.descriptorRevision)&&
      (!Number.isSafeInteger(value.descriptorRevision)||value.descriptorRevision<descriptor.descriptorRevision))return false;
    descriptor={...descriptor,...value};
    if(descriptor.shared)dirty=!!descriptor.dirty;
    publish();return true;
  }
  function update(){
    if(!active)return Promise.resolve();
    if(descriptor.shared){publish();return Promise.resolve();}
    dirty=fingerprint(getPatch())!==baseline;publish();
    if(invoke&&reported!==dirty){
      const value=dirty;reported=value;
      notifications=notifications.then(()=>invoke('document_set_dirty',{dirty:value})).catch(error=>{reported=null;notice(error);});
    }
    return notifications;
  }
  async function ready(){
    const value=invoke?await invoke('document_current'):await browser.current?.();
    const valid=value&&typeof value==='object'&&typeof value.title==='string';
    if(valid){acceptDescriptor(value);if(descriptor.patch)await adopt(copy(descriptor.patch),descriptor);else if(descriptor.source)await adopt({version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]},descriptor);}
    baseline=fingerprint(getPatch());active=true;await update();
    if(valid&&value.source)await inspect(value.source,value.sourceName||value.title);
    return !!(valid&&(value.patch||value.source));
  }
  async function performSave(saveAs){
    await beforeSave();
    const snapshot=copy(getPatch());
    const value=invoke?await invoke('document_save',{patch:snapshot,saveAs:!!saveAs}):await browser.save?.(snapshot,descriptor,!!saveAs);
    if(!value)return false;
    acceptDescriptor(value);baseline=fingerprint(snapshot);reported=null;await update();return true;
  }
  return{
    ready,update,acceptDescriptor,get dirty(){return dirty;},get document(){return {...descriptor,dirty};},
    async new(){return invoke?invoke('document_new'):browser.new?.();},
    async open(path){return invoke?invoke('document_open',path?{path}:{}):browser.open?.(path);},
    async openHelp(key){return invoke?invoke('document_open_help',{key}):browser.openHelp?.(key);},
    async list(){return invoke?invoke('document_list'):[];},
    async focus(label){return invoke?invoke('document_focus',{label}):false;},
    save(saveAs=false){if(saving)return saving;saving=performSave(saveAs).finally(()=>{saving=null;});return saving;},
    async flushBeforeClose(request){
      const pending={token:request.token};closing.set(request.requestLabel,pending);
      try{await beforeClose(request);}
      catch(error){
        if(closing.get(request.requestLabel)!==pending)return;
        if(invoke)await invoke('document_close_flushed',{...request,error:String(error?.message||error)});throw error;
      }
      if(closing.get(request.requestLabel)!==pending)return;
      if(invoke)await invoke('document_close_flushed',request);
    },
    cancelClose(request){if(closing.get(request.requestLabel)?.token===request.token)closing.delete(request.requestLabel);},
    async saveBeforeClose(request){
      const args=request?.quitToken===undefined?undefined:{quitToken:request.quitToken};
      let confirmed=false;
      try {
        const saved=await this.save();
        if(!saved||dirty)return false;
        if(invoke&&await invoke('document_close_confirmed',args)===false)return false;
        confirmed=true;return true;
      } finally {
        // A frontend preflight failure never reaches native Save. Release the
        // Quit transaction for that case as well as picker/save cancellation.
        if(!confirmed&&invoke)await invoke('document_cancel_close',args);
      }
    },
  };
}
