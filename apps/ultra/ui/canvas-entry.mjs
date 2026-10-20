import {suggestObjects} from './canvas-catalog.mjs';

export function createObjectEntry({document:doc,window:win,commit,onClose=()=>{}}) {
  const $=id=>doc.querySelector('#'+id),box=$('object-entry'),input=$('object-text'),list=$('object-suggestions');
  let choices=[],active=0,context=null;
  function render() {
    choices=suggestObjects(input.value);active=Math.min(active,Math.max(0,choices.length-1));
    list.replaceChildren();
    choices.forEach((s,i)=>{
      const b=doc.createElement('button');b.className='suggestion';b.type='button';b.id=`suggestion-${s.type}`;
      b.setAttribute('role','option');b.setAttribute('aria-selected',String(i===active));b.tabIndex=-1;
      const name=doc.createElement('strong'),summary=doc.createElement('span');name.textContent=s.name;summary.textContent=s.summary;b.append(name,summary);
      b.addEventListener('pointerdown',e=>e.preventDefault());
      b.addEventListener('click',()=>{active=i;complete();input.focus();});list.append(b);
    });
    input.setAttribute('aria-expanded',String(choices.length>0));
    input.setAttribute('aria-activedescendant',choices[active]?`suggestion-${choices[active].type}`:'');
  }
  function complete() {
    if(!choices[active])return;
    const tail=input.value.trim().split(/\s+/).slice(1).join(' ');
    input.value=choices[active].name+(tail?' '+tail:' ');render();
  }
  function close() {box.hidden=true;context=null;$('object-error').textContent='';onClose();}
  function open({text='',clientX=80,clientY=140,...rest}={}) {
    context=rest;active=0;input.value=text;input.setAttribute('aria-invalid','false');$('object-error').textContent='';box.hidden=false;
    box.style.left=`${Math.max(8,Math.min(clientX,(win.innerWidth||1280)-350))}px`;
    box.style.top=`${Math.max(78,Math.min(clientY,(win.innerHeight||840)-350))}px`;
    render();input.focus();if(text)input.select();
  }
  input.addEventListener('input',()=>{active=0;input.setAttribute('aria-invalid','false');$('object-error').textContent='';render();});
  input.addEventListener('keydown',e=>{
    e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();close();}
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();active=(active+(e.key==='ArrowDown'?1:-1)+choices.length)%Math.max(1,choices.length);render();
      list.children[active]?.scrollIntoView?.({block:'nearest'});
    } else if(e.key==='Tab'){e.preventDefault();complete();}
    else if(e.key==='Enter'){
      e.preventDefault();
      try{
        const name=input.value.trim().split(/\s+/)[0];
        if(choices.length&&!choices.some(s=>s.name===name||s.aliases.includes(name)))complete();
        commit(input.value,context);close();
      }catch(error){$('object-error').textContent=error.message;input.setAttribute('aria-invalid','true');}
    }
  });
  return{open,close,isOpen:()=>!box.hidden};
}
