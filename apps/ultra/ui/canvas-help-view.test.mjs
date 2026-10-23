import assert from 'node:assert/strict';
import {test} from 'node:test';
import {checkedReference,mountHelpShell,createHelpHelperView} from './canvas-help-view.mjs';
import {applyNodeAppearance} from './canvas-appearance-view.mjs';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
const reference=name=>({status:'available',object:name,sourceSha256:'a'.repeat(64),digest:'Original summary',description:'Original description',
  arguments:[],methods:[],inlets:[],outlets:[],related:[{name:'pack',available:true}]});
function mount(object='append'){
  let doc;
  class Element{
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.dataset={};this.style={setProperty(key,value){this[key]=value;},removeProperty(key){delete this[key];}};this.classList={toggle(){}};this.disabled=false;this.hidden=false;}
    append(...children){this.children.push(...children);}
    contains(element){return element===this||this.children.some(child=>child.contains(element));}
    replaceChildren(...children){
      // Removing a focused descendant returns focus to the document in a real browser.
      if(this.contains(doc.activeElement))doc.activeElement=null;
      this.children=[];this.append(...children);
    }
    setAttribute(){}
    addEventListener(name,handler){(this.listeners[name]??=[]).push(handler);}
    focus(){doc.activeElement=this;}
    click(){return this.fire('click');}
    async fire(name,extra={}){
      let stopped=false;
      const event={target:this,preventDefault(){},stopPropagation(){stopped=true;},...extra};
      for(const handler of this.listeners[name]??[])await handler(event);
      if(name==='keydown'&&!stopped)doc.onKeydown?.(event);
    }
  }
  const ids=new Map(),replies=new Map(),requested=[];
  doc={activeElement:null,querySelector(id){if(!ids.has(id))ids.set(id,new Element());return ids.get(id);},createElement:tag=>new Element(tag),addEventListener(){}};
  const view=mountHelpShell({doc,invoke:(_,{name})=>{requested.push(name);return new Promise(resolve=>replies.set(name,resolve));}});
  view.update({helpIdentity:'original-shell',helpShell:{object},hostingHelp:true});
  return{doc,view,requested,get:id=>doc.querySelector('#'+id),reply:(name,value)=>replies.get(name)(value),
    button:label=>doc.querySelector('#help-reference-menu').children.find(child=>child.tagName==='BUTTON'&&child.textContent===label)};
}

for(const name of ['times','plus','minus']){
  test(`${name} accepts only its exact safe Reference response identity`,()=>{
    const value=reference(name);
    assert.equal(checkedReference(value,name),value);
    assert.equal(checkedReference({...value,object:'append'},name).status,'unavailable');
    assert.equal(checkedReference(value,'append').status,'unavailable');
  });

  test(`${name} shell opens and renders its Reference as plain text`,async()=>{
    const p=mount(name),value={...reference(name),digest:'Original synthetic <img src=x> summary.',description:'Original synthetic <script>text</script> description.'};
    await settle();p.reply(name,value);await settle();
    assert.equal(p.view.reference.status,'available');
    await p.get('help-question').fire('click');await p.button('Reference').fire('click');await settle();
    assert.equal(p.get('help-reference-pane').hidden,false);
    assert.equal(p.get('help-reference-title').textContent,`${name} Reference`);
    assert.deepEqual(p.get('help-reference-body').children.map(child=>[child.tagName,child.textContent]),[
      ['H2',name],['P','Original synthetic <img src=x> summary.'],['P','Original synthetic <script>text</script> description.'],
    ]);
    assert.equal(p.doc.activeElement,p.get('help-reference-close'));
    assert.deepEqual(p.requested,[name]);
  });
}

test('safe arithmetic related links navigate while symbolic, path and unknown aliases remain disabled',async()=>{
  const p=mount(),safe=['times','plus','minus'],refused=['*','+','-','../times','/plus','plus.maxref.xml','unknown'];
  await settle();p.reply('append',{...reference('append'),related:[...safe,...refused].map(name=>({name,available:true}))});await settle();
  await p.get('help-question').fire('click');
  for(const name of safe)assert.equal(p.button(name).disabled,false,name);
  for(const name of refused){assert.equal(p.button(name).disabled,true,name);await p.view.openReference(name);}
  assert.deepEqual(p.requested,['append']);
  for(const name of safe){
    await p.button(name).fire('click');await settle();
    assert.equal(p.get('help-reference-title').textContent,`${name} Reference`);
    p.reply(name,reference(name));await settle();
    assert.equal(p.get('help-reference-body').children[0].textContent,name);
    await p.get('help-question').fire('click');
  }
  assert.deepEqual(p.requested,['append','times','plus','minus']);
  for(const name of refused)assert.equal(checkedReference(reference(name),name).status,'unavailable',name);
});

test('arithmetic Reference admission retains response bounds and plain-text field checks',()=>{
  const value=reference('plus');
  for(const update of [{description:'x'.repeat(16385)},{description:'Original synthetic\u0000text'},
    {methods:Array.from({length:65},()=>({name:'original',description:'Original synthetic method.'}))},{sourceSha256:'invalid'},
    {arguments:[{name:'original',description:'Original synthetic argument.',type:'number',optional:'yes'}]},
    {related:[{name:'times',available:'yes'}]},
  ])assert.equal(checkedReference({...value,...update},'plus').status,'unavailable');
});

test('a delayed reference response preserves keyboard focus in the open menu',async()=>{
  const p=mount();await p.get('help-question').fire('click');await settle();
  const original=p.button('Reference');assert.equal(p.doc.activeElement,original);
  p.reply('append',reference('append'));await settle();
  assert.equal(p.get('help-reference-menu').hidden,false);
  assert.notEqual(p.button('Reference'),original);
  assert.equal(p.doc.activeElement,p.button('Reference'));
});

test('refreshing the menu preserves the selected related item',async()=>{
  const p=mount();await settle();p.reply('append',reference('append'));await settle();
  await p.view.openReference('pack');await settle();
  await p.get('help-question').fire('click');p.button('pack').focus();
  p.reply('pack',reference('pack'));await settle();
  assert.equal(p.doc.activeElement,p.button('pack'));
});

test('a delayed menu refresh does not steal focus from outside the menu',async()=>{
  const p=mount();await p.get('help-question').fire('click');await settle();
  p.get('workspace').focus();
  p.reply('append',reference('append'));await settle();
  assert.equal(p.doc.activeElement,p.get('workspace'));
});

test('status polling preserves a helper drag preview until committed geometry arrives',()=>{
  const p=mount(),node={id:5,type:'help_helper',x:10,y:20,params:{role:'details'}};
  const view=createHelpHelperView(node,{doc:p.doc});
  const options={selected:true,locked:false,object:'append',reference:reference('append')};
  view.update(node,{},options);
  const heading=view.header.children[0];
  view.element.style.left='110px';view.element.style.top='140px';
  view.update(node,{}, {...options,moving:true});
  assert.equal(view.element.style.left,'110px');assert.equal(view.element.style.top,'140px');
  assert.equal(view.header.children[0],heading,'Polling should preserve stable helper content.');
  view.update({...node,x:110,y:140},{},options);
  assert.equal(view.element.style.left,'110px');assert.equal(view.element.style.top,'140px');
  view.update(node,{},options);
  assert.equal(view.element.style.left,'10px');assert.equal(view.element.style.top,'20px');
});

test('resetting helper appearance clears an explicit width and permits restoring it',()=>{
  const p=mount(),node={id:5,type:'help_helper',x:10,y:20,params:{role:'details'},style:{width:320,height:100}};
  const view=createHelpHelperView(node,{doc:p.doc});
  const options={selected:true,locked:false,object:'append',reference:reference('append')};
  const render=current=>{view.update(current,{},options);applyNodeAppearance(view,current,p.doc);};
  render(node);assert.equal(view.element.style.width,'320px');
  render({...node,style:{height:100}});assert.equal(view.element.style.width,'');
  render(node);assert.equal(view.element.style.width,'320px');
  const reset={...node};delete reset.style;render(reset);assert.equal(view.element.style.width,'');
});

test('question arrow navigation does not bubble into canvas object movement',async()=>{
  for(const key of ['ArrowDown','ArrowUp'])for(const alreadyOpen of [false,true]){
    const p=mount();let selectedY=100;
    p.doc.onKeydown=event=>{if(event.key==='ArrowDown')selectedY++;if(event.key==='ArrowUp')selectedY--;};
    if(alreadyOpen)await p.get('help-question').fire('click');
    await p.get('help-question').fire('keydown',{key});await settle();
    assert.equal(selectedY,100,`${key}, menu initially ${alreadyOpen?'open':'closed'}`);
    assert.equal(p.get('help-reference-menu').hidden,false);
    assert.equal(p.doc.activeElement,p.button('Reference'));
  }
});
