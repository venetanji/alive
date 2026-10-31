// Workspace navigation owns only presentation. Native state and editor nodes stay mounted.
export function mountWorkspace({doc,win,onNavigate=()=>{}}){
  const $=id=>doc.getElementById(id);
  let view='session',detail='clip',previousDetail='clip',expanded=true,browser=true,height=win?.innerHeight?340:220,resize=null,browserWidth=220,browserResize=null;
  let clipOpen=true,deviceOpen=false,masterOpen=false,previousPanels=null;
  let requestedHeight=height,maximized=false,customHeight=false;
  const handle=$('detail-resizer'),shell=$('workspace-shell');
  const parked=new Map(),scopedDrafts=new Map();
  const detailRoot=()=>$(detail==='clip'?'clip-detail':detail==='master'?'master-detail':'device-detail');
  const maxBrowserWidth=()=>Math.max(180,Math.min(420,(shell.clientWidth||900)-480));
  const detailBudget=()=>shell.clientHeight-$('edit-controls').getBoundingClientRect().height-($('detail-panel').getBoundingClientRect().height-$('detail-content').getBoundingClientRect().height);
  const workspaceMinimum=()=>view==='arrangement'?$('timeline').querySelector('.timeline-tools').getBoundingClientRect().height+$('master-arrangement-lane').getBoundingClientRect().height+96:96;
  const maxHeight=()=>Math.max(160,detailBudget()-(maximized?0:workspaceMinimum()));
  const fitHeight=()=>{
    if(!maximized&&!customHeight&&expanded&&clipOpen&&deviceOpen&&!masterOpen&&win?.innerHeight){
      const workspaceFloor=win.innerHeight<700?180:win.innerHeight<850?200:240;
      height=Math.round(Math.max(160,Math.min(510,maxHeight(),detailBudget()-workspaceFloor)));return;
    }
    const limit=!maximized&&!customHeight&&clipOpen&&!deviceOpen&&win?.innerHeight?Math.max(160,detailBudget()-(win.innerHeight<700?272:364)):maxHeight();height=Math.round(Math.max(160,Math.min(limit,maximized?Infinity:requestedHeight)));
  };
  function park(root){const element=doc.activeElement;if(root.contains?.(element)&&element.matches?.('input,select,textarea'))parked.set(element,{root,value:element.value,visible:false,changed:parked.get(element)?.changed??false});}
  // Cached rack controls can be detached while another track is selected.
  function restore(root){for(const [element,state]of parked){if(element.isConnected===false){if(!element.closest?.('.chain-device'))parked.delete(element);continue;}if(state.root!==root||state.visible||element.closest?.('[hidden]'))continue;element.value=state.value;state.visible=true;if(!doc.activeElement?.closest?.('input,select,textarea,button,[contenteditable]'))element.focus();}}
  function stashPreserved(key,elements){const bucket=new Map();for(const element of elements){const state=parked.get(element);if(state){bucket.set(element,state);parked.delete(element);}}if(bucket.size)scopedDrafts.set(key,bucket);return [...bucket.keys()];}
  function recallPreserved(key){const bucket=scopedDrafts.get(key);if(!bucket)return;scopedDrafts.delete(key);for(const [element,state]of bucket)parked.set(element,{...state,visible:false});}
  function discardPreserved(elements){for(const element of elements){parked.delete(element);for(const bucket of scopedDrafts.values())bucket.delete(element);}}
  function resetPreserved(){parked.clear();scopedDrafts.clear();}
  function uncommitted(){const entry=[...parked].find(([element,state])=>(element.isConnected!==false||element.closest?.('.chain-device'))&&state.changed);if(entry)return entry[0];for(const bucket of scopedDrafts.values())for(const [element,state]of bucket)if(state.changed)return element;}
  function preserveFocused(){
    const element=doc.activeElement;if(!element?.matches?.('input,select,textarea')||element.id==='seek')return;
    park(element.parentElement);const state=parked.get(element);
    // Browser navigation moves focus without accepting the previous field's unfinished value.
    if(state)state.resumeOnFocus=true;
  }
  // display:none blurs inputs and emits change. Keep that navigation local,
  // then publish a suppressed change only on a later user change or blur.
  const change=event=>{const state=parked.get(event.target);if(!state)return;if(!state.visible){state.changed=true;event.stopImmediatePropagation();}else parked.delete(event.target);};
  const blur=event=>{const state=parked.get(event.target);if(state&&!state.visible){event.stopImmediatePropagation();return;}if(!state?.visible)return;parked.delete(event.target);if(state.changed)event.target.dispatchEvent(new win.Event('change',{bubbles:true}));};
  const focus=event=>{const state=parked.get(event.target);if(state?.resumeOnFocus)state.visible=true;};
  doc.addEventListener('change',change,true);doc.addEventListener('blur',blur,true);doc.addEventListener('focus',focus,true);
  function paint(){
    const full=maximized&&expanded;
    $('session-workspace').hidden=full||view!=='session';$('arrangement-workspace').hidden=full||view!=='arrangement';
    shell.classList.toggle('detail-maximized',full);
    shell.classList.toggle('detail-both',expanded&&!masterOpen&&clipOpen&&deviceOpen);
    const maximize=$('maximize-detail'),label=full?'Restore detail size':'Maximize detail';
    maximize.setAttribute('aria-label',label);maximize.setAttribute('aria-pressed',String(full));maximize.title=label;
    for(const name of ['session','arrangement'])$('view-'+name).setAttribute('aria-pressed',String(view===name));
    $('workspace-browser').hidden=!browser;$('browser-resizer').hidden=!browser;$('toggle-browser').setAttribute('aria-expanded',String(browser));$('timeline-inspector').hidden=view!=='arrangement';
    shell.style.setProperty('--browser-width',`${browserWidth}px`);$('browser-resizer').setAttribute('aria-valuenow',browserWidth);$('browser-resizer').setAttribute('aria-valuemax',maxBrowserWidth());
    shell.classList.toggle('detail-collapsed',!expanded);handle.hidden=!expanded;
    $('toggle-detail').setAttribute('aria-expanded',String(expanded));
    $('clip-detail').hidden=!expanded||masterOpen||!clipOpen;$('device-detail').hidden=!expanded||masterOpen||!deviceOpen;
    $('detail-clip').setAttribute('aria-pressed',String(expanded&&!masterOpen&&clipOpen));$('detail-devices').setAttribute('aria-pressed',String(expanded&&!masterOpen&&deviceOpen));
    $('master-detail').hidden=!expanded||!masterOpen;for(const id of ['master-select-session','master-select-arrangement'])$(id).setAttribute('aria-pressed',String(masterOpen));
    shell.style.setProperty('--detail-height',`${height}px`);handle.setAttribute('aria-valuenow',height);handle.setAttribute('aria-valuemax',maxHeight());
    restore($(view+'-workspace'));
    if(expanded){if(clipOpen&&!masterOpen)restore($('clip-detail'));if(deviceOpen&&!masterOpen)restore($('device-detail'));if(masterOpen)restore($('master-detail'));if(view==='arrangement'&&clipOpen&&!masterOpen)restore($('timeline-inspector'));}
  }
  function setHeight(value){maximized=false;customHeight=true;requestedHeight=value;fitHeight();paint();}
  function cancelResize(){if(!resize)return;const old=resize;resize=null;maximized=old.maximized;customHeight=old.customHeight;requestedHeight=old.requestedHeight;fitHeight();paint();if(handle.hasPointerCapture?.(old.id))handle.releasePointerCapture(old.id);}
  function toggleMaximize(){cancelResize();if(!maximized)park($(view+'-workspace'));maximized=!maximized;expanded=true;if(!clipOpen&&!deviceOpen&&!masterOpen)clipOpen=true;paint();fitHeight();paint();}
  function navigate(name){cancelResize();if(maximized){maximized=false;fitHeight();}const changed=name!==view;if(changed){park($(view+'-workspace'));if(view==='arrangement')park($('timeline-inspector'));}view=name;paint();fitHeight();paint();if(changed)onNavigate(name);}
  for(const name of ['session','arrangement'])$('view-'+name).addEventListener('click',()=>navigate(name));
  // A pointer navigation must not blur an unfinished field and publish its change.
  for(const id of ['view-session','view-arrangement','toggle-browser','toggle-detail','maximize-detail','detail-clip','detail-devices'])$(id).addEventListener('pointerdown',event=>event.preventDefault());
  for(const name of ['clip','devices'])$('detail-'+name).addEventListener('click',()=>{
    cancelResize();if(masterOpen){masterOpen=false;expanded=false;}
    const wasExpanded=expanded,wasOpen=name==='clip'?clipOpen:deviceOpen;
    if(wasExpanded&&wasOpen)park($(name==='clip'?'clip-detail':'device-detail'));
    if(!wasExpanded){clipOpen=false;deviceOpen=false;}
    const next=!wasExpanded||!wasOpen;if(name==='clip')clipOpen=next;else deviceOpen=next;
    detail=name;expanded=clipOpen||deviceOpen;if(!expanded)maximized=false;paint();fitHeight();paint();
  });
  $('toggle-browser').addEventListener('click',()=>{browser=!browser;paint();});
  $('toggle-detail').addEventListener('click',()=>{cancelResize();if(expanded){if(clipOpen)park($('clip-detail'));if(deviceOpen)park($('device-detail'));if(masterOpen)park($('master-detail'));}expanded=!expanded;if(expanded&&!clipOpen&&!deviceOpen&&!masterOpen)clipOpen=true;if(!expanded){maximized=false;fitHeight();}paint();});
  $('maximize-detail').addEventListener('click',toggleMaximize);handle.addEventListener('dblclick',toggleMaximize);handle.title='Drag to resize; double-click to maximize or restore';
  handle.addEventListener('pointerdown',event=>{if(event.button!==0||resize)return;resize={id:event.pointerId,y:event.clientY,height,requestedHeight,maximized,customHeight};handle.setPointerCapture?.(event.pointerId);event.preventDefault();});
  handle.addEventListener('pointermove',event=>{if(resize?.id===event.pointerId)setHeight(resize.height+resize.y-event.clientY);});
  handle.addEventListener('pointerup',event=>{if(resize?.id!==event.pointerId)return;resize=null;handle.releasePointerCapture?.(event.pointerId);});
  handle.addEventListener('pointercancel',cancelResize);handle.addEventListener('lostpointercapture',cancelResize);
  handle.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();setHeight(event.key==='Home'?160:event.key==='End'?maxHeight():height+(event.key==='ArrowUp'?1:-1)*(event.shiftKey?50:20));}});
  const browserHandle=$('browser-resizer');
  function setBrowserWidth(value){browserWidth=Math.round(Math.max(180,Math.min(maxBrowserWidth(),value)));paint();}
  function cancelBrowserResize(){if(!browserResize)return;const old=browserResize;browserResize=null;setBrowserWidth(old.width);if(browserHandle.hasPointerCapture?.(old.id))browserHandle.releasePointerCapture(old.id);}
  browserHandle.addEventListener('pointerdown',event=>{if(event.button!==0)return;browserResize={id:event.pointerId,x:event.clientX,width:browserWidth};browserHandle.setPointerCapture?.(event.pointerId);event.preventDefault();});
  browserHandle.addEventListener('pointermove',event=>{if(browserResize?.id===event.pointerId)setBrowserWidth(browserResize.width+event.clientX-browserResize.x);});
  browserHandle.addEventListener('pointerup',event=>{if(browserResize?.id!==event.pointerId)return;browserResize=null;browserHandle.releasePointerCapture?.(event.pointerId);});
  browserHandle.addEventListener('pointercancel',cancelBrowserResize);browserHandle.addEventListener('lostpointercapture',cancelBrowserResize);
  browserHandle.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();setBrowserWidth(event.key==='Home'?180:event.key==='End'?420:browserWidth+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?20:5));}});
  $('track-width').addEventListener('input',event=>shell.style.setProperty('--track-width',`${event.target.value}px`));
  const interactive='input,select,textarea,button,summary,a,[contenteditable],[role]';
  const keydown=event=>{
    if(event.key==='Escape'){cancelResize();cancelBrowserResize();return;}
    if(event.defaultPrevented||event.key!=='Tab'||event.shiftKey||event.ctrlKey||event.altKey||event.metaKey||event.target?.closest?.(interactive))return;
    event.preventDefault();navigate(view==='session'?'arrangement':'session');
    $(view+'-workspace').focus();
  };
  const fit=()=>{cancelResize();cancelBrowserResize();browserWidth=Math.min(browserWidth,maxBrowserWidth());fitHeight();paint();};doc.addEventListener('keydown',keydown);win?.addEventListener('blur',cancelResize);win?.addEventListener('resize',fit);paint();if(win?.innerHeight)fit();
  return{preserves:element=>parked.has(element),uncommitted,discardPreserved,resetPreserved,stashPreserved,recallPreserved,park,restore,preserveFocused,openMaster(){if(!masterOpen){previousDetail=detail;previousPanels={clip:clipOpen,devices:deviceOpen,expanded};if(expanded){park($('clip-detail'));park($('device-detail'));}}masterOpen=true;detail='master';expanded=true;paint();},returnMusic(){if(masterOpen){park($('master-detail'));masterOpen=false;clipOpen=previousPanels?.clip??true;deviceOpen=previousPanels?.devices??false;detail=previousDetail;expanded=previousPanels?.expanded??true;paint();fitHeight();paint();}},openDevices(){masterOpen=false;deviceOpen=true;detail='devices';expanded=true;paint();fitHeight();paint();},openClip(){masterOpen=false;clipOpen=true;detail='clip';expanded=true;paint();fitHeight();paint();},dispose(){doc.removeEventListener('keydown',keydown);doc.removeEventListener('change',change,true);doc.removeEventListener('blur',blur,true);doc.removeEventListener('focus',focus,true);resetPreserved();win?.removeEventListener('blur',cancelResize);win?.removeEventListener('resize',fit);}};
}
