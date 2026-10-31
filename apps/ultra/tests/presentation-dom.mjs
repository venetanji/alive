export class Element {
  constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attrs={};this.listeners=new Map();this.dataset={};this.value='';this.className='';this.style={setProperty(k,v){this[k]=v;}};this.classList={add:n=>{this.className+=' '+n;},remove:n=>{this.className=this.className.split(' ').filter(x=>x!==n).join(' ');},contains:n=>this.className.split(' ').includes(n),toggle:(n,on)=>{if(on??!this.classList.contains(n)){if(!this.classList.contains(n))this.classList.add(n);}else this.classList.remove(n);}};}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  prepend(child){child.parentElement=this;this.children.unshift(child);}
  replaceChildren(...children){this.children=[];this.append(...children);}
  remove(){this.parentElement?.children.splice(this.parentElement.children.indexOf(this),1);}
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}
  removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,f){if(!this.listeners.has(k))this.listeners.set(k,new Set());this.listeners.get(k).add(f);}
  removeEventListener(k,f){this.listeners.get(k)?.delete(f);}
  dispatchEvent(event){for(const f of this.listeners.get(event.type)??[])f(event);return true;}
  fire(type,extra={}){const event={type,target:this,button:0,preventDefault(){},stopPropagation(){},...extra};this.dispatchEvent(event);return event;}
  focus(){this.ownerDocument.activeElement=this;}
  checkValidity(){return true;}
  getContext(){return{measureText:s=>({width:s.length*6})};}
  getBoundingClientRect(){return{left:0,top:0,width:175,height:65};}
  get lastElementChild(){return this.children.at(-1);}
  querySelectorAll(selector){return all(this).filter(e=>selector.split(',').some(s=>s.startsWith('.')?e.classList.contains(s.slice(1)):e.tagName===s.toUpperCase()));}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
  setPointerCapture(){} hasPointerCapture(){return false;} releasePointerCapture(){}
}
export const all=root=>root.children.flatMap(child=>[child,...all(child)]);
export function dom(){const doc={activeElement:null,defaultView:{Event:class{constructor(type){this.type=type;}},addEventListener(){},removeEventListener(){}},createElement(tag){return new Element(tag,this);},createElementNS(ns,tag){return new Element(tag,this);}};return{doc,root:doc.createElement('div')};}
export const settle=()=>new Promise(resolve=>setImmediate(resolve));
export function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
// Test IPC fixtures mirror the accepted Rust projection; production never infers a surface.
export function projectFixturePresentation(patch){return{...patch.presentation,items:patch.presentation.items.map(item=>{
  const binding=patch.device.parameters.find(binding=>binding.node===item.target.node&&binding.param===item.target.param);
  return{...item,resolved:{kind:'parameter',bindingId:binding.key,descriptor:{min:binding.min,max:binding.max,integral:false,unit:binding.unit??null}}};
})};}
