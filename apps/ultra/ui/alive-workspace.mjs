// Workspace navigation owns only presentation. Native state and editor nodes stay mounted.
export function mountWorkspace({doc,win,onNavigate=()=>{}}){
  const $=id=>doc.getElementById(id);
  let view='session',detail='clip',previousDetail='clip',expanded=true,browser=true,height=220,resize=null,browserWidth=220,browserResize=null;
  const handle=$('detail-resizer'),shell=$('workspace-shell');
  const parked=new Map();
  const detailRoot=()=>$(detail==='clip'?'clip-detail':detail==='master'?'master-detail':'device-detail');
  const maxHeight=()=>Math.max(160,shell.clientHeight-$('schedule-controls').getBoundingClientRect().height-($('detail-panel').getBoundingClientRect().height-$('detail-content').getBoundingClientRect().height)-150);
  function park(root){const element=doc.activeElement;if(root.contains?.(element)&&element.matches?.('input,select,textarea'))parked.set(element,{root,value:element.value,visible:false,changed:parked.get(element)?.changed??false});}
  function restore(root){for(const [element,state]of parked){if(element.isConnected===false){parked.delete(element);continue;}if(state.root!==root||state.visible||element.closest?.('[hidden]'))continue;element.value=state.value;state.visible=true;if(!doc.activeElement?.closest?.('input,select,textarea,button,[contenteditable]'))element.focus();}}
  // display:none blurs inputs and emits change. Keep that navigation local,
  // then publish a suppressed change only on a later user change or blur.
  const change=event=>{const state=parked.get(event.target);if(!state)return;if(!state.visible){state.changed=true;event.stopImmediatePropagation();}else parked.delete(event.target);};
  const blur=event=>{const state=parked.get(event.target);if(!state?.visible)return;parked.delete(event.target);if(state.changed)event.target.dispatchEvent(new win.Event('change',{bubbles:true}));};
  doc.addEventListener('change',change,true);doc.addEventListener('blur',blur,true);
  function paint(){
    $('session-workspace').hidden=view!=='session';$('arrangement-workspace').hidden=view!=='arrangement';
    for(const name of ['session','arrangement'])$('view-'+name).setAttribute('aria-pressed',String(view===name));
    $('workspace-browser').hidden=!browser;$('browser-resizer').hidden=!browser;$('toggle-browser').setAttribute('aria-expanded',String(browser));$('timeline-inspector').hidden=view!=='arrangement';
    shell.style.setProperty('--browser-width',`${browserWidth}px`);$('browser-resizer').setAttribute('aria-valuenow',browserWidth);
    $('detail-content').hidden=!expanded;handle.hidden=!expanded;
    $('toggle-detail').setAttribute('aria-expanded',String(expanded));
    for(const name of ['clip','devices']){$('detail-'+name).setAttribute('aria-pressed',String(detail===name));$(name==='clip'?'clip-detail':'device-detail').hidden=detail!==name;}
    $('master-detail').hidden=detail!=='master';for(const id of ['master-select-session','master-select-arrangement'])$(id).setAttribute('aria-pressed',String(detail==='master'));
    shell.style.setProperty('--detail-height',`${height}px`);handle.setAttribute('aria-valuenow',height);handle.setAttribute('aria-valuemax',maxHeight());
    restore($(view+'-workspace'));
    if(expanded){restore(detailRoot());if(view==='arrangement'&&detail==='clip')restore($('timeline-inspector'));}
  }
  function setHeight(value){height=Math.round(Math.max(160,Math.min(maxHeight(),value)));paint();}
  function cancelResize(){if(!resize)return;const old=resize;resize=null;setHeight(old.height);if(handle.hasPointerCapture?.(old.id))handle.releasePointerCapture(old.id);}
  function navigate(name){cancelResize();const changed=name!==view;if(changed){park($(view+'-workspace'));if(view==='arrangement')park($('timeline-inspector'));}view=name;paint();if(changed)onNavigate(name);}
  for(const name of ['session','arrangement'])$('view-'+name).addEventListener('click',()=>navigate(name));
  // A pointer navigation must not blur an unfinished field and publish its change.
  for(const id of ['view-session','view-arrangement','toggle-browser','toggle-detail','detail-clip','detail-devices'])$(id).addEventListener('pointerdown',event=>event.preventDefault());
  for(const name of ['clip','devices'])$('detail-'+name).addEventListener('click',()=>{cancelResize();if(expanded&&detail!==name)park(detailRoot());detail=name;expanded=true;paint();});
  $('toggle-browser').addEventListener('click',()=>{browser=!browser;paint();});
  $('toggle-detail').addEventListener('click',()=>{cancelResize();if(expanded)park(detailRoot());expanded=!expanded;paint();});
  handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;resize={id:event.pointerId,y:event.clientY,height};handle.setPointerCapture?.(event.pointerId);event.preventDefault();});
  handle.addEventListener('pointermove',event=>{if(resize?.id===event.pointerId)setHeight(resize.height+resize.y-event.clientY);});
  handle.addEventListener('pointerup',event=>{if(resize?.id!==event.pointerId)return;resize=null;handle.releasePointerCapture?.(event.pointerId);});
  handle.addEventListener('pointercancel',cancelResize);handle.addEventListener('lostpointercapture',cancelResize);
  handle.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();setHeight(event.key==='Home'?160:event.key==='End'?maxHeight():height+(event.key==='ArrowUp'?1:-1)*(event.shiftKey?50:20));}});
  const browserHandle=$('browser-resizer');
  function setBrowserWidth(value){browserWidth=Math.round(Math.max(180,Math.min(280,value)));paint();}
  function cancelBrowserResize(){if(!browserResize)return;const old=browserResize;browserResize=null;setBrowserWidth(old.width);if(browserHandle.hasPointerCapture?.(old.id))browserHandle.releasePointerCapture(old.id);}
  browserHandle.addEventListener('pointerdown',event=>{if(event.button!==0)return;browserResize={id:event.pointerId,x:event.clientX,width:browserWidth};browserHandle.setPointerCapture?.(event.pointerId);event.preventDefault();});
  browserHandle.addEventListener('pointermove',event=>{if(browserResize?.id===event.pointerId)setBrowserWidth(browserResize.width+event.clientX-browserResize.x);});
  browserHandle.addEventListener('pointerup',event=>{if(browserResize?.id!==event.pointerId)return;browserResize=null;browserHandle.releasePointerCapture?.(event.pointerId);});
  browserHandle.addEventListener('pointercancel',cancelBrowserResize);browserHandle.addEventListener('lostpointercapture',cancelBrowserResize);
  browserHandle.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();setBrowserWidth(event.key==='Home'?180:event.key==='End'?280:browserWidth+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?20:5));}});
  $('track-width').addEventListener('input',event=>shell.style.setProperty('--track-width',`${event.target.value}px`));
  const interactive='input,select,textarea,button,summary,a,[contenteditable],[role]';
  const keydown=event=>{
    if(event.key==='Escape'){cancelResize();cancelBrowserResize();return;}
    if(event.defaultPrevented||event.key!=='Tab'||event.shiftKey||event.ctrlKey||event.altKey||event.metaKey||event.target?.closest?.(interactive))return;
    event.preventDefault();navigate(view==='session'?'arrangement':'session');
    $(view+'-workspace').focus();
  };
  const fit=()=>{cancelResize();setHeight(height);};doc.addEventListener('keydown',keydown);win?.addEventListener('blur',cancelResize);win?.addEventListener('resize',fit);paint();
  return{preserves:element=>parked.has(element),openMaster(){if(detail!=='master'){previousDetail=detail;if(expanded)park(detailRoot());}detail='master';expanded=true;paint();},returnMusic(){if(detail==='master'){park(detailRoot());detail=previousDetail;expanded=true;paint();}},openClip(){if(expanded&&detail!=='clip')park(detailRoot());detail='clip';expanded=true;paint();},dispose(){doc.removeEventListener('keydown',keydown);doc.removeEventListener('change',change,true);doc.removeEventListener('blur',blur,true);parked.clear();win?.removeEventListener('blur',cancelResize);win?.removeEventListener('resize',fit);}};
}
