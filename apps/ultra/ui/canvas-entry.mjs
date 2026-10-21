import {completionFor} from './canvas-completion.mjs';

export function createObjectEntry({document:doc,window:win,commit,onClose=()=>{}}) {
  const $=id=>doc.querySelector('#'+id),box=$('object-entry'),input=$('object-text'),list=$('object-suggestions'),guide=$('object-arguments');
  let choices=[],active=0,context=null,completion=null,anchor={x:80,y:140},lastSelection='';
  const selection=()=>`${input.selectionStart}:${input.selectionEnd}`;
  const make=(tag,className,text)=>{const e=doc.createElement(tag);e.className=className;e.textContent=text;return e;};
  function render() {
    completion=completionFor(input.value,input.selectionStart??input.value.length);
    lastSelection=selection();
    choices=completion.choices;active=Math.min(active,Math.max(0,choices.length-1));
    list.replaceChildren();
    choices.forEach((s,i)=>{
      const b=doc.createElement('button');b.className='suggestion';b.type='button';b.id=`suggestion-${i}`;
      b.setAttribute('role','option');b.setAttribute('aria-selected',String(i===active));b.tabIndex=-1;
      b.append(make('strong','',s.label),make('span','suggestion-detail',s.detail));
      if(s.syntax)b.append(make('small','suggestion-syntax',s.syntax));
      b.addEventListener('pointerdown',e=>e.preventDefault());
      b.addEventListener('click',()=>{active=i;complete();input.focus();});list.append(b);
    });
    const object=completion.mode==='objects'?choices[active]?.object:completion.object;
    const p=completion.parameter||choices[active]?.parameter;
    guide.replaceChildren();guide.hidden=!object;
    if(object) {
      const syntax=make('div','argument-syntax',object.name);
      object.args.forEach(key=>{
        const arg=make('span',p?.key===key?'current-argument':'',` [${key}]`);
        if(p?.key===key)arg.setAttribute('aria-current','true');syntax.append(arg);
      });
      guide.append(syntax,make('p','argument-detail',p?`${p.key}: ${p.detail}`:object.summary));
      if(object.args.length&&object.type!=='message')guide.append(make('p','argument-options','Type @ for named options.'));
    }
    list.setAttribute('aria-label',completion.mode==='objects'?'Supported objects':completion.mode==='options'?'Supported options':'Parameter values');
    input.setAttribute('aria-expanded',String(choices.length>0));
    input.setAttribute('aria-activedescendant',choices[active]?`suggestion-${active}`:'');
    const rect=box.getBoundingClientRect();
    box.style.left=`${Math.max(8,Math.min(anchor.x,(win.innerWidth||1280)-rect.width-8))}px`;
    box.style.top=`${Math.max(78,Math.min(anchor.y,(win.innerHeight||840)-rect.height-8))}px`;
  }
  function complete() {
    const s=choices[active];if(!s)return;
    const suffix=input.value.slice(s.end),separator=/^\s/.test(suffix)?'':' ';
    input.value=input.value.slice(0,s.start)+s.insert+separator+suffix;
    const caret=s.start+s.insert.length+(separator.length||suffix.match(/^\s+/)?.[0].length||0);
    input.setSelectionRange?.(caret,caret);active=0;render();
  }
  function close() {box.hidden=true;context=null;$('object-error').textContent='';onClose();}
  function open({text='',clientX=80,clientY=140,...rest}={}) {
    context=rest;active=0;input.value=text;input.setAttribute('aria-invalid','false');$('object-error').textContent='';box.hidden=false;
    anchor={x:clientX,y:clientY};
    input.focus();if(text)input.select();render();
  }
  input.addEventListener('input',()=>{active=0;input.setAttribute('aria-invalid','false');$('object-error').textContent='';render();});
  input.addEventListener('click',()=>{active=0;render();});
  input.addEventListener('select',()=>{if(selection()!==lastSelection){active=0;render();}});
  input.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){active=0;render();}});
  input.addEventListener('keydown',e=>{
    e.stopPropagation();
    if(selection()!==lastSelection){active=0;render();}
    if(e.key==='Escape'){e.preventDefault();close();}
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();active=(active+(e.key==='ArrowDown'?1:-1)+choices.length)%Math.max(1,choices.length);render();
      list.children[active]?.scrollIntoView?.({block:'nearest'});
    } else if(e.key==='Tab'){e.preventDefault();complete();}
    else if(e.key==='Enter'){
      e.preventDefault();
      try{
        const name=input.value.trim().split(/\s+/)[0];
        if(completion.mode==='objects'&&choices.length&&!choices.some(s=>s.object.name===name||s.object.aliases.includes(name)))complete();
        commit(input.value,context);close();
      }catch(error){$('object-error').textContent=error.message;input.setAttribute('aria-invalid','true');}
    }
  });
  return{open,close,isOpen:()=>!box.hidden};
}
