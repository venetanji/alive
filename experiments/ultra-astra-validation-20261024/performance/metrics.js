(() => {
  const m = window.aliveAudit = {paths:0,rebuilds:0,rects:0,polls:0,ipc:{},errors:[],audio:null,holdHistory:false};
  const send = value => window.webkit.messageHandlers.aliveAudit.postMessage(JSON.stringify(value));
  const attr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name,value) {
    if (name === 'd' && this.tagName.toLowerCase() === 'path') m.paths++;
    return attr.call(this,name,value);
  };
  const replace = Element.prototype.replaceChildren;
  Element.prototype.replaceChildren = function(...args) {
    if (this.id === 'cables') m.rebuilds++;
    return replace.apply(this,args);
  };
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function(...args) {m.rects++;return rect.apply(this,args);};
  const timeout = window.setTimeout;
  window.setTimeout = function(fn,ms,...args) {
    if(ms===100 && typeof fn==='function') return timeout.call(this,(...a)=>{m.polls++;return fn(...a);},ms,...args);
    return timeout.call(this,fn,ms,...args);
  };
  addEventListener('error',e=>m.errors.push(String(e.message)));
  addEventListener('unhandledrejection',e=>m.errors.push(String(e.reason)));
  function attach() {
    const core=window.__TAURI__?.core;
    if(!core || typeof core.invoke!=='function')return false;
    const invoke=core.invoke;
    const wrapped=async function(name,args,...rest) {
      m.ipc[name]=(m.ipc[name]||0)+1;
      if(name==='document_history'&&m.holdHistory){send({type:'history-held',args});await new Promise(r=>m.releaseHistory=r);}
      const value=await invoke.call(this,name,args,...rest);
      if(name==='audio_status')m.audio=value;
      if(name==='document_commit'||name==='document_history')send({type:'admission',name,args,result:value});
      return value;
    };
    window.__TAURI__.core={...core,invoke:wrapped};
    return window.__TAURI__.core.invoke===wrapped;
  }
  const attached=attach();
  if(!attached){const retry=setInterval(()=>{if(attach())clearInterval(retry);},1);}
  setInterval(()=>send({type:'metrics',time:Date.now(),paths:m.paths,rebuilds:m.rebuilds,rects:m.rects,polls:m.polls,ipc:m.ipc,
    hidden:document.hidden,visibility:document.visibilityState,audio:m.audio,errors:m.errors,
    summary:document.querySelector('#patch-summary')?.textContent,notice:document.querySelector('#notice')?.textContent,
    cables:document.querySelector('#cables')?.children.length}),1000);
  send({type:'bootstrap',time:Date.now(),attached});
})();
