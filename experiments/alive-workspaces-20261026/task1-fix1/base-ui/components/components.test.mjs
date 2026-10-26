import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeState, messagePayload, createComponent, TYPES} from './index.mjs';

// Minimal DOM adapter: exercises production event handlers, not browser layout.
class Element {
  constructor(tag) { this.tagName=tag; this.children=[]; this.attrs={}; this.listeners={}; this.style={}; this.value=''; this.disabled=false; }
  append(...children) { this.children.push(...children); }
  setAttribute(k,v) { this.attrs[k]=String(v); }
  addEventListener(k,fn) { (this.listeners[k]??=[]).push(fn); }
  removeEventListener(k,fn) { this.listeners[k]=(this.listeners[k]??[]).filter(x=>x!==fn); }
  remove() { this.removed=true; }
  fire(type, extra={}) { const event={type,target:this,stopPropagation(){this.stopped=true;},preventDefault(){this.prevented=true;},...extra}; for(const fn of this.listeners[type]??[])fn(event); return event; }
}
const document={createElement:tag=>new Element(tag)};
const setup=(type, extra={})=> { const events=[]; const component=createComponent({id:'test',type,...extra},{document,onEvent:e=>events.push(e)}); return {...component,events}; };

test('state is bounded, finite, typed and JSON round-trippable',()=>{
  for(const type of TYPES) {const s=normalizeState({id:'a',type}); assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(s))),s);}
  assert.equal(normalizeState({id:'a',type:'number',value:5.9,min:0,max:4}).value,4);
  assert.equal(normalizeState({id:'a',type:'number',value:-2.8}).value,-2);
  assert.throws(()=>normalizeState({id:'a',type:'slider',value:Infinity}));
  assert.throws(()=>normalizeState({id:'a',type:'slider',min:5,max:4}));
  assert.throws(()=>normalizeState({id:'a',type:'number',step:0}));
  assert.throws(()=>normalizeState({id:'a',type:'unknown'}));
  assert.throws(()=>normalizeState({id:'a',type:'toggle',value:'false'}));
  assert.throws(()=>normalizeState({id:'a',type:'object',value:'x'.repeat(4097)}));
});
test('message protocol does not pretend to implement Max parsing',()=>{
  assert.deepEqual(messagePayload(' bang '),{kind:'bang'});
  assert.deepEqual(messagePayload('  1 2.5 -3 '),{kind:'list',atoms:[1,2.5,-3]});
  assert.deepEqual(messagePayload('set $1, next;'),{kind:'text',text:'set $1, next;'});
  assert.deepEqual(messagePayload('1 Infinity'),{kind:'text',text:'1 Infinity'});
});
test('object commit and escape preserve focus-safe editing',()=>{
  const c=setup('object',{value:'osc~'});
  c.control.value='gain~'; const enter=c.control.fire('keydown',{key:'Enter'});
  assert.equal(enter.stopped,true); assert.equal(enter.prevented,true);
  assert.equal(c.getState().value,'gain~'); assert.equal(c.events.length,1);
  assert.deepEqual(c.events[0],{version:1,id:'test',type:'object',action:'change',value:'gain~'});
  c.control.fire('change'); assert.equal(c.events.length,1);
  c.control.value='discard'; c.control.fire('keydown',{key:'Escape'}); assert.equal(c.control.value,'gain~');
  for(const key of ['a','Delete',' '])assert.equal(c.element.fire('keydown',{key}).stopped,true);
  assert.equal(c.element.fire('keyup',{key:'a'}).stopped,true);
});
test('message edits never output until explicitly activated',()=>{
  const c=setup('message',{value:'bang'}); c.control.value='1 2'; c.control.fire('change');
  assert.equal(c.events[0].action,'change'); c.trigger.fire('click');
  assert.deepEqual(c.events[1],{version:1,id:'test',type:'message',action:'output',payload:{kind:'list',atoms:[1,2]}});
});
test('numeric editing clamps and ignores empty/non-finite values',()=>{
  const c=setup('flonum',{min:0,max:1,value:.5});
  for(const bad of ['', 'Infinity','NaN']) {c.control.value=bad;c.control.fire('change'); assert.equal(c.getState().value,.5);}
  assert.equal(c.events.length,0); c.control.value='2'; c.control.fire('change'); assert.equal(c.getState().value,1);
  c.control.fire('change');assert.equal(c.events.length,1);
  assert.deepEqual(c.events[0],{version:1,id:'test',type:'flonum',action:'change',value:1});
});
test('slider previews are separate from its one commit',()=>{
  const c=setup('slider',{min:0,max:1,value:0}); c.control.value='.5';c.control.fire('input');
  assert.equal(c.events[0].action,'input');assert.equal(c.getState().value,0);
  c.control.fire('change');assert.equal(c.getState().value,.5);assert.equal(c.events[1].action,'change');
});
test('bang, toggle and ports use native activation with clear contracts',()=>{
  const bang=setup('button');bang.control.fire('click');assert.equal(bang.events[0].payload.kind,'bang');
  const toggle=setup('toggle');toggle.control.fire('click');assert.equal(toggle.getState().value,1);assert.equal(toggle.control.attrs['aria-pressed'],'true');
  const inlet=setup('inlet',{label:'frequency'});inlet.control.fire('click');assert.equal(inlet.events[0].action,'connect');assert.equal(inlet.events[0].direction,'inlet');
  assert.match(inlet.control.attrs['aria-label'],/frequency/);
});
test('disabled controls block mutation and output but accept silent host updates',()=>{
  for(const type of TYPES){const c=setup(type,{disabled:true});const before=c.getState();
    c.control.value='1';c.control.fire('change');c.control.fire('input');c.control.fire('click');c.trigger?.fire('click');
    assert.deepEqual(c.getState(),before);assert.equal(c.events.length,0);
  }
  const c=setup('toggle',{disabled:true});c.setState({value:1});assert.equal(c.getState().value,1);assert.equal(c.events.length,0);
});
test('meter is passive, updates are silent, state snapshots cannot mutate component',()=>{
  const c=setup('meter',{value:.3});c.setState({value:4});assert.equal(c.getState().value,1);assert.equal(c.events.length,0);
  assert.equal(c.control.tagName,'meter'); const snapshot=c.getState();snapshot.value=.2;assert.equal(c.getState().value,1);
  assert.throws(()=>c.setState({type:'object'}));assert.throws(()=>c.setState({id:'other'}));
  c.destroy(); c.control.fire('change'); assert.equal(c.events.length,0);assert.equal(c.element.removed,true);
});

test('state rejects null, malformed versions, unsafe integers and unknown fields',()=>{
  for(const patch of [{label:null},{disabled:null},{value:null},{version:2},{extra:1}])
    assert.throws(()=>normalizeState({id:'a',type:'number',...patch}));
  for(const patch of [{min:.2},{max:Number.MAX_SAFE_INTEGER+1},{step:.5}])
    assert.throws(()=>normalizeState({id:'a',type:'number',...patch}));
  assert.throws(()=>normalizeState({id:'a',type:'object',min:0}));
});
test('numeric text does not accept alternate JS literal syntax',()=>{
  const c=setup('number',{value:5});c.control.value='0x10';c.control.fire('change');assert.equal(c.getState().value,5);
});
test('IME Enter does not prematurely commit, message activation commits pending edit',()=>{
  const c=setup('message',{value:'bang'});c.control.value='draft';c.control.fire('keydown',{key:'Enter',isComposing:true});
  assert.equal(c.getState().value,'bang');assert.equal(c.events.length,0);c.trigger.fire('click');
  assert.equal(c.events[0].action,'change');assert.equal(c.events[1].payload.text,'draft');
});
test('state updates are atomic, silent and immutable in identity; disposal is idempotent',()=>{
  const c=setup('slider',{value:.5});assert.throws(()=>c.setState({max:-1}));assert.equal(c.getState().max,1);
  c.setState({value:.8,label:'Updated'});assert.equal(c.control.attrs['aria-label'],'Updated');assert.equal(c.events.length,0);
  c.destroy();c.destroy();assert.throws(()=>c.setState({value:0}));c.control.fire('input');assert.equal(c.events.length,0);
});
test('lab wiring updates a passive meter and serializes/reset/disables controls',async()=>{
  const nodes=new Map();for(const id of ['objects','values','ports','disabled','reset','snapshot','clear','events','state','load-status'])nodes.set(id,new Element('div'));
  globalThis.document={...document,getElementById:id=>nodes.get(id),querySelector:s=>nodes.get(s.slice(1))};
  try {
    await import('./lab.mjs');assert.match(nodes.get('load-status').textContent,/Ready/);
    const [integer,float,slider,meter]=nodes.get('values').children;
    slider.children[1].value='.7';slider.children[1].fire('input');assert.equal(meter.children[1].value,'0.7');
    assert.match(nodes.get('events').textContent,/"action":"input"/);
    nodes.get('snapshot').fire('click');assert.equal(JSON.parse(nodes.get('state').textContent).find(s=>s.id==='meter').value,.7);
    nodes.get('disabled').checked=true;nodes.get('disabled').fire('change');assert.equal(integer.children[1].disabled,true);
    nodes.get('reset').fire('click');assert.equal(nodes.get('disabled').checked,false);
    assert.equal(JSON.parse(nodes.get('state').textContent).find(s=>s.id==='meter').value,.4);
    nodes.get('clear').fire('click');assert.equal(nodes.get('events').textContent,'No events yet.');
  } finally {delete globalThis.document;}
});

test('slider canonical state quantizes to valid step positions including uneven bounds',()=>{
  const c=setup('slider',{value:.555,step:.01});assert.equal(c.getState().value,.56);assert.equal(c.control.value,'0.56');
  assert.equal(normalizeState({id:'s',type:'slider',value:1,min:0,max:1,step:.3}).value,.9);
  assert.equal(normalizeState({id:'s',type:'slider',value:.3,min:0,max:.3,step:.1}).value,.3);
  assert.equal(normalizeState({id:'s',type:'slider',value:-.25,min:-1,max:1,step:.5}).value,0);
  assert.throws(()=>normalizeState({id:'s',type:'slider',step:1e-30}));
});

test('range bounds are configured before browser value sanitization',()=>{
  const sanitizingDocument={createElement(tag){
    const node=new Element(tag);let current='';
    Object.defineProperty(node,'value',{get:()=>current,set(value){
      current=node.type==='range'?String(Math.max(Number(node.min??0),Math.min(Number(node.max??100),Number(value)))):String(value);
    }});return node;
  }};
  const c=createComponent({id:'range',type:'slider',min:200,max:300,value:250,step:1},{document:sanitizingDocument});
  assert.equal(c.control.value,'250');c.setState({min:400,max:500,value:450});assert.equal(c.control.value,'450');
});
