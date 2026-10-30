// Toolbar disclosures own presentation only; closing them never commits a field.
export function mountTransportOptions(doc=globalThis.document,{onClose=()=>{},onOpen=()=>{}}={}){
  const toggle=doc.getElementById('transport-options-toggle'),panel=doc.getElementById('transport-options');
  if(!toggle||!panel)return{dispose(){}};
  function close(restoreFocus=false){onClose(panel);panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(restoreFocus)toggle.focus();}
  const click=()=>{if(!panel.hidden)close();else{panel.hidden=false;toggle.setAttribute('aria-expanded','true');onOpen(panel);}};
  const pointerdown=event=>event.preventDefault();
  const keydown=event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopPropagation();close(true);}};
  const outside=event=>{if(!panel.hidden&&!panel.contains(event.target)&&!toggle.contains(event.target))close();};
  toggle.addEventListener('pointerdown',pointerdown);toggle.addEventListener('click',click);doc.addEventListener('keydown',keydown,true);doc.addEventListener('pointerdown',outside);
  return{dispose(){toggle.removeEventListener('pointerdown',pointerdown);toggle.removeEventListener('click',click);doc.removeEventListener('keydown',keydown,true);doc.removeEventListener('pointerdown',outside);}};
}
