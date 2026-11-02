// Alive shares Info discovery and hover/focus behavior with Ultra.
// File and browser disclosures remain owned here; musical state is never touched.
import {DEFAULT_CONTEXT_INFO,describeContextTarget,mountContextInfo} from './creative-info.mjs';
export const DEFAULT_INFO=DEFAULT_CONTEXT_INFO;
const REGIONS=[
  ['#workspace-browser','Browse clips, instruments and effects. Drag a supported device onto a track.'],
  ['#session-workspace','Session View: select or launch clips independently; scene launches are at the right.'],
  ['#arrangement-workspace','Arrangement View: position clips on the timeline; switching views does not change playback.'],
  ['#detail-panel','Selected clip or device editor. Drag the divider to resize Clip; Devices keeps a fixed height.'],
  ['.transport','Global tempo, transport and view navigation.'],
  ['footer','Session status, audio configuration and diagnostics.'],
];
export function describeAliveTarget(target){
  return describeContextTarget(target,REGIONS,DEFAULT_INFO);
}
export function mountAliveInfo(doc=globalThis.document){
  // Legacy renderers still set titles on every snapshot. Move those descriptions
  // to Help before the browser can present a second, floating help surface.
  const migrated=new WeakMap();
  function moveTitle(element){
    const title=element.getAttribute?.('title');if(!title)return;
    const help=element.getAttribute('data-help');
    if(!help||help===migrated.get(element)){element.setAttribute('data-help',title);migrated.set(element,title);}
    element.removeAttribute('title');
  }
  function scan(root){
    moveTitle(root);
    for(const element of root.querySelectorAll?.('[title]')??[])moveTitle(element);
    for(const title of root.querySelectorAll?.('svg title')??[]){const parent=title.parentElement;if(!parent.hasAttribute('data-help'))parent.setAttribute('data-help',title.textContent);title.remove();}
  }
  scan(doc);
  const Observer=doc.defaultView?.MutationObserver;
  const observer=Observer?new Observer(records=>{for(const record of records){if(record.type==='attributes')moveTitle(record.target);else for(const node of record.addedNodes)if(node.nodeType===1)scan(node);}}):null;
  observer?.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['title']});
  const info=mountContextInfo({doc,regions:REGIONS,outputId:'info-text',fallback:DEFAULT_INFO,tooltip:false});
  const fileMenu=doc?.getElementById?.('file-menu');
  const browserAdd=doc?.getElementById?.('browser-add-menu');
  const panel=doc?.getElementById?.('info-view'),toggle=doc?.getElementById?.('toggle-help');
  function toggleHelp(){if(!panel||!toggle)return;panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));}
  const preserveFocus=event=>event.preventDefault();
  function click(event){
    if(fileMenu?.open && (!fileMenu.contains(event.target) || event.target.closest?.('button')))fileMenu.open=false;
    if(browserAdd?.open && !browserAdd.contains(event.target))browserAdd.open=false;
  }
  function keydown(event){
    if(event.key!=='Escape')return;
    if(fileMenu?.open){fileMenu.open=false;event.stopPropagation();}
    if(browserAdd?.open){browserAdd.open=false;event.stopPropagation();}
  }
  doc?.addEventListener?.('click',click);
  doc?.addEventListener?.('keydown',keydown);
  toggle?.addEventListener('pointerdown',preserveFocus);
  toggle?.addEventListener('click',toggleHelp);
  return{dispose(){
    observer?.disconnect();
    info.dispose();
    doc?.removeEventListener?.('click',click);
    doc?.removeEventListener?.('keydown',keydown);
    toggle?.removeEventListener('pointerdown',preserveFocus);
    toggle?.removeEventListener('click',toggleHelp);
  }};
}
if(typeof document!=='undefined')mountAliveInfo(document);
