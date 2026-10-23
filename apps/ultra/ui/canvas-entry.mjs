import {completionFor} from './canvas-completion.mjs';

export function createObjectEntry({document:doc,window:win,commit,onClose=()=>{}}) {
  const $=id=>doc.querySelector('#'+id),box=$('object-entry'),input=$('object-text'),list=$('object-suggestions'),guide=$('object-arguments'),assistance=$('entry-assistance');
  let choices=[],active=0,context=null,completion=null,anchor={x:80,y:140},lastSelection='',entryWidth=100,entryHeight=24,fontSize=12,multiline=false,originalText='',originalDisplay='';
  const selection=()=>`${input.selectionStart}:${input.selectionEnd}`;
  const make=(tag,className,text)=>{const e=doc.createElement(tag);e.className=className;e.textContent=text;return e;};
  function render() {
    if(!/^\s*comment(?:\s|$)/.test(input.value))input.value=input.value.replace(/[\r\n]/g,'');
    completion=completionFor(input.value,input.selectionStart??input.value.length);
    multiline=completion.object?.type==='comment';
    if(multiline)completion={...completion,mode:'arguments',choices:[],parameter:null};
    input.setAttribute('role',multiline?'textbox':'combobox');
    input.setAttribute('aria-label',multiline?'Comment text':'Object name and arguments');
    input.setAttribute('aria-autocomplete',multiline?'none':'list');
    if(multiline)input.setAttribute('aria-multiline','true');else input.removeAttribute?.('aria-multiline');
    input.style.whiteSpace=multiline?'pre-wrap':'pre';
    $('entry-keys').textContent=multiline?'Shift Enter: new line. Enter: save. Esc: cancel.':'Up/Down: choose. Tab: complete. Enter: create. Esc: cancel.';
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
    guide.replaceChildren();guide.hidden=!object||completion.mode==='objects';
    box.classList.toggle('completing-name',completion.mode==='objects');
    list.hidden=choices.length===0;
    if(object) {
      const syntax=make('div','argument-syntax',object.name);
      object.args.forEach(key=>{
        const arg=make('span',p?.key===key?'current-argument':'',` [${key}]`);
        if(p?.key===key)arg.setAttribute('aria-current','true');syntax.append(arg);
      });
      guide.append(syntax,make('p','argument-detail',p?`${p.key}: ${p.detail}`:object.summary));
      if(object.args.length&&(object.options??object.args).length&&!['message','message_box'].includes(object.type))guide.append(make('p','argument-options','Type @ for named options.'));
    }
    list.setAttribute('aria-label',completion.mode==='objects'?'Supported objects':completion.mode==='options'?'Supported options':'Parameter values');
    if(multiline)input.removeAttribute?.('aria-expanded');else input.setAttribute('aria-expanded',String(choices.length>0));
    input.setAttribute('aria-activedescendant',choices[active]?`suggestion-${active}`:'');
    const viewportWidth=win.innerWidth||1280,viewportHeight=win.innerHeight||840;
    const lines=multiline?input.value.split('\n'):[];
    const measure=multiline?lines.reduce((longest,line)=>Math.max(longest,line.length),0):input.value.length;
    const width=Math.min(viewportWidth-16,Math.max(entryWidth,Math.min(370,measure*fontSize*.62+16)));
    const height=multiline?Math.min(Math.max(48,viewportHeight-94),Math.max(entryHeight,fontSize*1.3*Math.min(8,lines.length)+8)):entryHeight;
    box.style.width=`${width}px`;box.style.height=`${height}px`;input.style.fontSize=`${fontSize}px`;
    const left=Math.max(8,Math.min(anchor.x,viewportWidth-width-8)),top=Math.max(78,Math.min(anchor.y,viewportHeight-height-8));
    box.style.left=`${left}px`;box.style.top=`${top}px`;
    const assistWidth=Math.min(370,viewportWidth-16),below=viewportHeight-top-height-11,above=top-8;
    const upwards=below<Math.min(240,assistance.scrollHeight||240)&&above>below;
    assistance.style.left=`${Math.min(left,viewportWidth-assistWidth-8)}px`;
    assistance.style.maxHeight=`${Math.max(0,upwards?above-3:below)}px`;
    assistance.style.top=upwards?'auto':`${top+height+3}px`;
    assistance.style.bottom=upwards?`${viewportHeight-top+3}px`:'auto';
  }
  function complete() {
    const s=choices[active];if(!s)return;
    const suffix=input.value.slice(s.end),separator=/^\s/.test(suffix)?'':' ';
    input.value=input.value.slice(0,s.start)+s.insert+separator+suffix;
    const caret=s.start+s.insert.length+(separator.length||suffix.match(/^\s+/)?.[0].length||0);
    input.setSelectionRange?.(caret,caret);active=0;render();
  }
  function close() {box.hidden=true;context=null;$('object-error').textContent='';onClose();}
  function open({text='',clientX=80,clientY=140,width=100,height=24,fontSize:font=12,...rest}={}) {
    context=rest;active=0;originalText=text;input.value=text;originalDisplay=input.value;input.setAttribute('aria-invalid','false');$('object-error').textContent='';box.hidden=false;
    anchor={x:clientX,y:clientY};
    entryWidth=width;entryHeight=height;fontSize=font;
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
    else if(multiline&&(['ArrowDown','ArrowUp'].includes(e.key)||(e.key==='Enter'&&e.shiftKey)))return;
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();active=(active+(e.key==='ArrowDown'?1:-1)+choices.length)%Math.max(1,choices.length);render();
      list.children[active]?.scrollIntoView?.({block:'nearest'});
    } else if(e.key==='Tab'){e.preventDefault();complete();}
    else if(e.key==='Enter'){
      e.preventDefault();
      try{
        const name=input.value.trim().split(/\s+/)[0];
        if(completion.mode==='objects'&&choices.length&&!choices.some(s=>s.object.name===name||s.object.aliases.includes(name)))complete();
        commit(multiline&&input.value===originalDisplay?originalText:input.value,context);close();
      }catch(error){$('object-error').textContent=error.message;input.setAttribute('aria-invalid','true');}
    }
  });
  return{open,close,isOpen:()=>!box.hidden};
}
