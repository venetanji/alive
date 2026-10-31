// Contextual Info is a UI-only observer. It never calls native commands,
// mutates editor values, accepts drafts, or steals focus from musical controls.
export const DEFAULT_INFO = 'Point to a control for help';

const REGIONS = [
  ['#workspace-browser','Browse clips, instruments and effects. Drag a supported device onto a track.'],
  ['#session-workspace','Session View: select or launch clips independently; scene launches are at the right.'],
  ['#arrangement-workspace','Arrangement View: position clips on the timeline; switching views does not change playback.'],
  ['#detail-panel','Selected clip or device editor. Drag its divider to resize.'],
  ['.transport','Global tempo, transport and view navigation.'],
  ['footer','Session status, audio configuration and diagnostics.'],
];

function clean(value) {
  return typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,240):'';
}

export function describeAliveTarget(target) {
  if (!target?.closest) return DEFAULT_INFO;
  const control=target.closest('[data-help],button,input,select,textarea,summary,[role="separator"]');
  if (control) {
    for (const attr of ['data-help','title','aria-label']) {
      const content=clean(control.getAttribute?.(attr));
      if(content)return content;
    }
    const labels=control.labels;
    if(labels?.length) {
      const text=clean(labels[0].textContent);
      if(text)return text;
    }
    if(control.matches?.('button,summary')) {
      const text=clean(control.textContent);
      if(text)return text;
    }
  }
  for(const [selector,message] of REGIONS)if(target.closest(selector))return message;
  return DEFAULT_INFO;
}

export function mountAliveInfo(doc=globalThis.document) {
  const output=doc?.getElementById?.('info-text');
  if(!output)return {dispose(){}};
  const fileMenu=doc.getElementById('file-menu');
  const browserAdd=doc.getElementById('browser-add-menu');
  let last=DEFAULT_INFO;
  function show(target){
    const next=describeAliveTarget(target);
    if(next!==last){output.textContent=next;last=next;}
  }
  function hover(event){show(event.target);}
  function leave(event){show(event.relatedTarget);}
  function focus(event){show(event.target);}
  function click(event){
    if(fileMenu?.open && (!fileMenu.contains(event.target) || event.target.closest?.('button')))fileMenu.open=false;
    if(browserAdd?.open && !browserAdd.contains(event.target))browserAdd.open=false;
  }
  function keydown(event){
    if(event.key!=='Escape')return;
    if(fileMenu?.open){fileMenu.open=false;event.stopPropagation();}
    if(browserAdd?.open){browserAdd.open=false;event.stopPropagation();}
  }
  doc.addEventListener('pointerover',hover);
  doc.addEventListener('pointerout',leave);
  doc.addEventListener('focusin',focus);
  doc.addEventListener('click',click);
  doc.addEventListener('keydown',keydown);
  return{dispose(){
    doc.removeEventListener('pointerover',hover);
    doc.removeEventListener('pointerout',leave);
    doc.removeEventListener('focusin',focus);
    doc.removeEventListener('click',click);
    doc.removeEventListener('keydown',keydown);
  }};
}

if(typeof document!=='undefined')mountAliveInfo(document);
