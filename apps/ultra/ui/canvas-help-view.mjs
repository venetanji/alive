const catalog=new Set(['append','prepend','int','float','combine','join','pack','pak','zl','message','route','pv','value','times','plus','minus']);
const unavailable=reason=>({status:'unavailable',reason});
const text=value=>typeof value==='string'&&new TextEncoder().encode(value).length<=16384&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ufffe\uffff]/u.test(value);

export function checkedReference(value,name){
  if(value?.status==='unavailable')return unavailable(value.reason);
  if(!catalog.has(name)||value?.status!=='available'||value.object!==name||!text(value.digest)||!text(value.description)||
    !/^[a-f0-9]{64}$/.test(value.sourceSha256??'')||new TextEncoder().encode(JSON.stringify(value)).length>262144)return unavailable('invalid-reference');
  for(const key of ['arguments','methods','inlets','outlets','related']){
    if(!Array.isArray(value[key])||value[key].length>64)return unavailable('invalid-reference');
    if(value[key].some(item=>!item||!text(item.name)||(key==='related'?typeof item.available!=='boolean':!text(item.description))||
      key==='arguments'&&(!text(item.type)||typeof item.optional!=='boolean')))return unavailable('invalid-reference');
  }
  return value;
}

const reasonText=reason=>({
  'not-configured':'Reference text requires a local Max installation. The Basic patch remains available.',
  'not-found':'This reference is missing from the local Max installation. The Basic patch remains available.',
  'identity-mismatch':'The local Max help resources have changed. Reference text is unavailable.',
  'invalid-reference':'This local reference could not be read. The Basic patch remains available.',
}[reason]??'Reference text is unavailable. The Basic patch remains available.');

export function mountHelpShell({doc,win,invoke,onChange=()=>{},beforeRead=async()=>{},beforeNavigate=async()=>{},hostBasic=()=>false}){
  const $=id=>doc.querySelector('#'+id),make=(tag,className,value)=>{const e=doc.createElement(tag);if(className)e.className=className;if(value!==undefined)e.textContent=value;return e;};
  const controls=$('help-shell-controls'),basic=$('help-basic'),question=$('help-question'),menu=$('help-reference-menu'),pane=$('help-reference-pane'),body=$('help-reference-body');
  basic.setAttribute('aria-selected','true');question.setAttribute('aria-expanded','false');
  let identity=null,shell=null,epoch=0,disposed=false,menuOpen=false,page=null;
  let pages=new Map(),requests=new Map();
  const buttons=()=>[...menu.children].filter(e=>e.tagName==='BUTTON'&&!e.disabled);
  function closeMenu(focus=false){menuOpen=false;menu.hidden=true;question.setAttribute('aria-expanded','false');if(focus)question.focus();}
  function closeReference(focus=false){page=null;pane.hidden=true;if(focus)(controls.hidden?$('workspace'):basic).focus();}
  function showMenu(){
    const restoreFocus=menu.contains?.(doc.activeElement),focusedName=doc.activeElement?.dataset?.helpReference;
    menu.replaceChildren();
    if(!shell)return;
    menu.append(make('h2','help-menu-title',shell.object));
    const action=(label,name,enabled=true)=>{
      const button=make('button','',label);button.type='button';button.dataset.helpReference=name;button.setAttribute('role','menuitem');button.disabled=!enabled;
      button.addEventListener('click',()=>{closeMenu();void openReference(name);});menu.append(button);
    };
    action('Reference',shell.object);
    const current=pages.get(shell.object);menu.append(make('h3','help-menu-heading','Related Objects'));
    if(current?.status==='available'){
      if(!current.related.length)menu.append(make('p','help-menu-note','No related objects listed.'));
      for(const related of current.related)action(related.name,related.name,related.available&&catalog.has(related.name));
    }else menu.append(make('p','help-menu-note',current?.status==='loading'?'Loading local reference...':reasonText(current?.reason)));
    if(restoreFocus)(buttons().find(button=>button.dataset.helpReference===focusedName)??buttons()[0])?.focus();
  }
  function showReference(){
    pane.hidden=!page;if(!page)return;
    $('help-reference-title').textContent=`${page} Reference`;body.replaceChildren();
    const value=pages.get(page);
    if(value?.status!=='available'){
      const message=make('p','help-reference-status',value?.status==='loading'?'Loading local reference...':reasonText(value?.reason));
      message.setAttribute('role','status');body.append(message);return;
    }
    body.append(make('h2','',value.object),make('p','reference-digest',value.digest),make('p','reference-prose',value.description));
    for(const [key,label]of [['arguments','Arguments'],['methods','Messages'],['inlets','Inlets'],['outlets','Outlets']]){
      if(!value[key].length)continue;
      const section=make('section','reference-section');section.append(make('h3','',label));
      for(const item of value[key]){
        const entry=make('div','reference-entry');entry.append(make('h4','',item.name));
        if(key==='arguments')entry.append(make('p','reference-type',`${item.type}${item.optional?' (optional)':''}`));
        entry.append(make('p','reference-prose',item.description));section.append(entry);
      }
      body.append(section);
    }
  }
  async function request(name){
    if(pages.has(name)&&pages.get(name).status!=='loading')return;
    if(requests.has(name))return requests.get(name);
    const ticket=epoch;pages.set(name,{status:'loading'});
    const task=Promise.resolve().then(beforeRead).then(()=>{
      if(disposed||ticket!==epoch)return unavailable('not-configured');
      return typeof invoke==='function'?invoke('help_reference',{name}):unavailable('not-configured');
    })
      .then(value=>checkedReference(value,name),()=>unavailable('invalid-reference')).then(value=>{
        if(disposed||ticket!==epoch)return;
        pages.set(name,value);requests.delete(name);if(menuOpen)showMenu();showReference();onChange();
      });
    requests.set(name,task);return task;
  }
  async function openReference(name){
    if(!shell||!catalog.has(name))return;
    const ticket=epoch;await beforeNavigate();if(disposed||ticket!==epoch)return;
    closeMenu();page=name;void request(name);showReference();$('help-reference-close').focus();
  }
  basic.addEventListener('click',async()=>{const ticket=epoch;await beforeNavigate();if(disposed||ticket!==epoch)return;closeMenu();closeReference();hostBasic();$('workspace').focus();});
  question.addEventListener('click',async()=>{
    if(menuOpen){closeMenu(true);return;}
    const ticket=epoch;await beforeNavigate();if(disposed||ticket!==epoch||!shell)return;
    menuOpen=true;showMenu();menu.hidden=false;question.setAttribute('aria-expanded','true');buttons()[0]?.focus();
  });
  question.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();e.stopPropagation();if(!menuOpen)question.click();else buttons()[e.key==='ArrowUp'?buttons().length-1:0]?.focus();}});
  menu.addEventListener('keydown',e=>{
    if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
    e.preventDefault();e.stopPropagation();const items=buttons(),i=items.indexOf(doc.activeElement);
    items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
  });
  $('help-reference-close').addEventListener('click',()=>closeReference(true));
  const outside=e=>{if(menuOpen&&!controls.contains?.(e.target))closeMenu();};
  doc.addEventListener('pointerdown',outside);
  return{
    update(state){
      if(identity!==state.helpIdentity){
        identity=state.helpIdentity??null;shell=state.helpShell??null;epoch++;pages=new Map();requests=new Map();closeMenu();closeReference();
        if(shell)void request(shell.object);
      }
      controls.hidden=!state.hostingHelp;controls.inert=!!state.closing;pane.inert=!!state.closing;
    },
    get reference(){return pages.get(shell?.object)??unavailable('not-configured');},
    get object(){return shell?.object??'';},
    openReference,closeMenu,closeReference,
    dismiss(){if(menuOpen){closeMenu(true);return true;}if(page){closeReference(true);return true;}return false;},
    dispose(){disposed=true;epoch++;doc.removeEventListener?.('pointerdown',outside);},
  };
}

export function createHelpHelperView(node,{doc,select,dragStart}){
  const make=(tag,className,value)=>{const e=doc.createElement(tag);if(className)e.className=className;if(value!==undefined)e.textContent=value;return e;};
  const element=make('article','node help-helper'),header=make('header','help-helper-heading'),content=make('div','help-helper-content');
  element.dataset.node=String(node.id);element.append(header,content);let key='',locked=false;
  element.addEventListener('pointerdown',e=>{if(!locked)dragStart(node.id,e);});
  element.addEventListener('click',e=>{if(!locked&&!e.detail)select(node.id,e.shiftKey);});
  header.tabIndex=0;header.addEventListener('keydown',e=>{if(!locked&&['Enter',' '].includes(e.key)){e.preventDefault();select(node.id,e.shiftKey);}});
  return{type:node.type,configuration:JSON.stringify(node.params),element,header,inputs:new Map(),ports:{in:[],out:[]},minimumWidth:12,
    update(current,state,{selected,locked:isLocked,reference,object,moving=false}){
      locked=isLocked;if(!moving){element.style.left=`${current.x}px`;element.style.top=`${current.y}px`;}element.classList.toggle('selected',selected);header.tabIndex=locked?-1:0;
      if(current.style?.width===undefined)element.style.width='';
      element.setAttribute('aria-label',`${object} help ${current.params.role}`);
      const next=JSON.stringify([current.params.role,object,reference]);if(key===next)return;key=next;
      header.replaceChildren();content.replaceChildren();element.classList.toggle('help-details',current.params.role==='details');
      if(current.params.role==='starter'){element.hidden=true;return;}element.hidden=false;
      if(['details','name'].includes(current.params.role)){
        header.append(make('h1','',object));
        if(current.params.role==='name')return;
        if(reference.status==='available')content.append(make('p','help-digest',reference.digest),make('p','help-description',reference.description));
        else content.append(make('p','help-local-status',reference.status==='loading'?'Loading local reference...':reasonText(reference.reason)));
      }else{
        header.append(make('h2','','Arguments'));
        if(reference.status==='available'){
          for(const argument of reference.arguments){
            const row=make('div','help-argument');row.append(make('strong','',`${argument.name} (${argument.type}${argument.optional?', optional':''})`),make('p','',argument.description));content.append(row);
          }
          if(!reference.arguments.length)content.append(make('p','','None.'));
        }else content.append(make('p','help-local-status',reference.status==='loading'?'Loading local reference...':'Local reference unavailable.'));
      }
    },
  };
}
