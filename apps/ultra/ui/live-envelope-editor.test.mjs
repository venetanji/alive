import test from 'node:test';
import assert from 'node:assert/strict';

const implementation=await import('./live-envelope-editor.mjs').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return{};
  throw error;
});

class Element{
  constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag;this.children=[];this.attrs={};this.listeners=new Map();this.rect={left:0,top:0,width:175,height:65};}
  append(...children){this.children.push(...children);}
  setAttribute(name,value){this.attrs[name]=String(value);}
  getAttribute(name){return this.attrs[name]??null;}
  removeAttribute(name){delete this.attrs[name];}
  addEventListener(type,handler){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(handler);}
  removeEventListener(type,handler){this.listeners.get(type)?.delete(handler);}
  getBoundingClientRect(){return this.rect;}
  focus(){this.ownerDocument.activeElement=this;}
  setPointerCapture(id){this.captured=id;}
  hasPointerCapture(id){return this.captured===id;}
  releasePointerCapture(){this.captured=undefined;}
  fire(type,event={}){for(const handler of this.listeners.get(type)??[])handler({button:0,pointerId:1,clientX:0,clientY:0,preventDefault(){},stopPropagation(){},...event});}
}
const descendants=e=>[e,...e.children.flatMap(descendants)];
function setup(kind='adsr',overrides={}){
  assert.equal(typeof implementation.createLiveEnvelopeEditor,'function','the SVG envelope editor must exist');
  const doc={createElement:tag=>new Element(doc,tag),createElementNS:(_,tag)=>new Element(doc,tag)};
  doc.defaultView=new Element(doc,'window');
  const values=kind==='pitch'?{Initial:.5,Time:.5}:{AttackTime:.2,DecayTime:.4,SustainLevel:.6,SustainTime:1,ReleaseTime:.3,ExponentialSlope:0,Loop:0,FreeRun:0};
  const events=[],bindings={};
  for(const[name,value]of Object.entries(values)){
    const state={known:true,enabled:true,value,initial:value,pending:false,...overrides[name]};
    bindings[name]={min:name==='Initial'?-1:0,max:1,getState:()=>({...state}),state,
      onInput(next){state.value=next;events.push(['input',name,next]);},onChange(next){state.value=next;events.push(['change',name,next]);}};
  }
  const errors=[],editor=implementation.createLiveEnvelopeEditor(doc,{kind,bindings,onError:error=>errors.push(error)});
  return{doc,bindings,events,editor,errors,all:()=>descendants(editor.element),handle:name=>descendants(editor.element).find(e=>e.attrs['data-handle']===name),svg:descendants(editor.element).find(e=>e.tagName==='svg')};
}

test('ADSR keeps three ordered, bounded handles at raw normalized positions',()=>{
  const t=setup(),handles=t.all().filter(e=>e.attrs['data-handle']);
  assert.equal(handles.length,3);
  const xy=handles.map(h=>h.attrs.transform.match(/[\d.]+/g).map(Number));
  assert.ok(xy[0][0]<xy[1][0]&&xy[1][0]<xy[2][0]);
  for(const[x,y]of xy)assert.ok(x>=0&&x<=175&&y>=0&&y<=65);
  const before=t.handle('attack').attrs.transform;
  t.bindings.AttackTime.state.value=1;t.editor.refresh();
  assert.notEqual(t.handle('attack').attrs.transform,before);
  assert.equal(t.handle('attack').attrs['aria-valuenow'],'1');
  t.editor.dispose();
});

test('pitch draws above and below a zero baseline and edits signed values',()=>{
  const t=setup('pitch'),h=t.handle('initial');
  assert.equal(t.svg.attrs.viewBox,'0 0 175 78');
  assert.ok(Number(h.attrs.transform.match(/,([\d.]+)\)/)[1])<39);
  h.fire('keydown',{key:'Home'});
  assert.equal(t.bindings.Initial.state.value,-1);
  assert.ok(Number(h.attrs.transform.match(/,([\d.]+)\)/)[1])>39);
  h.fire('keydown',{key:'ArrowUp',shiftKey:true});
  assert.equal(t.bindings.Initial.state.value,-.998);
  assert.deepEqual(t.events.slice(-2),[['input','Initial',-.998],['change','Initial',-.998]]);
  assert.equal(t.all().filter(e=>e.tagName==='text'&&e.textContent==='0').length,2);
  t.editor.dispose();
});

test('a drag previews immediately, commits on release, and Escape reverses the real binding',()=>{
  const t=setup(),h=t.handle('attack');
  h.fire('pointerdown',{clientX:20,clientY:20});
  h.fire('pointermove',{clientX:41,clientY:20});
  assert.equal(t.bindings.AttackTime.state.value,.7);
  assert.deepEqual(t.events,[['input','AttackTime',.7]]);
  h.fire('pointerup');
  assert.deepEqual(t.events.at(-1),['change','AttackTime',.7]);
  h.fire('pointerdown',{clientX:20,clientY:20});
  h.fire('pointermove',{clientX:41,clientY:20});
  h.fire('keydown',{key:'Escape'});
  assert.equal(t.bindings.AttackTime.state.value,.7);
  assert.deepEqual(t.events.slice(-2),[['input','AttackTime',.7],['change','AttackTime',.7]]);
  const count=t.events.length;h.fire('pointerup');assert.equal(t.events.length,count);
  t.editor.dispose();
});

test('unknown sustain leaves the decay axis editable and never emits a sustain default',()=>{
  const t=setup('adsr',{SustainLevel:{known:false,value:undefined}}),h=t.handle('sustain');
  assert.equal(h.attrs['aria-disabled'],'false');
  h.fire('keydown',{key:'ArrowRight'});
  assert.equal(t.bindings.DecayTime.state.value,.41);
  h.fire('keydown',{key:'ArrowUp'});
  assert.equal(t.events.some(e=>e[1]==='SustainLevel'),false);
  assert.equal(t.handle('attack').attrs['aria-disabled'],'false');
  assert.ok(t.all().filter(e=>e.tagName==='path').every(e=>!e.attrs.d.includes('NaN')));
  t.editor.dispose();
});

test('Shift drag is fine, values clamp, and disabled fields ignore input independently',()=>{
  const t=setup('adsr',{DecayTime:{enabled:false}}),h=t.handle('sustain');
  h.fire('pointerdown',{clientX:40,clientY:30});
  h.fire('pointermove',{clientX:100,clientY:24.3,shiftKey:true});h.fire('pointerup');
  assert.equal(t.bindings.DecayTime.state.value,.4);
  assert.equal(t.bindings.SustainLevel.state.value,.61);
  assert.equal(t.events.some(e=>e[1]==='DecayTime'),false);
  const attack=t.handle('attack');attack.fire('keydown',{key:'End'});attack.fire('keydown',{key:'ArrowUp'});
  assert.equal(t.bindings.AttackTime.state.value,1);
  t.editor.dispose();
});

test('refresh reflects slope, sustain time, free mode, pending state and captured initial reset',()=>{
  const t=setup(),paths=()=>t.all().filter(e=>e.tagName==='path').map(e=>e.attrs.d).join(' '),linear=paths();
  t.bindings.ExponentialSlope.state.value=1;t.editor.refresh();assert.notEqual(paths(),linear);
  const exponential=paths();t.bindings.SustainTime.state.value=.2;t.editor.refresh();assert.notEqual(paths(),exponential);
  const held=paths();t.bindings.FreeRun.state.value=1;t.editor.refresh();assert.notEqual(paths(),held);
  t.bindings.AttackTime.state.pending=true;t.bindings.AttackTime.state.value=.8;t.editor.refresh();
  assert.equal(t.handle('attack').attrs['data-pending'],'true');
  t.handle('attack').fire('dblclick');assert.equal(t.bindings.AttackTime.state.value,.2);
  t.editor.dispose();
});

test('dispose cancels a live preview and removes every owned listener',()=>{
  const t=setup(),h=t.handle('release');
  h.fire('pointerdown');h.fire('pointermove',{clientX:20});assert.equal(t.bindings.ReleaseTime.state.value,.8);
  t.editor.dispose();assert.equal(t.bindings.ReleaseTime.state.value,.3);
  const count=t.events.length;
  for(const e of [...t.all(),t.doc.defaultView])for(const listeners of e.listeners.values())assert.equal(listeners.size,0);
  h.fire('keydown',{key:'End'});assert.equal(t.events.length,count);
});

test('binding callback failures reach onError without breaking the remaining handles',async()=>{
  const t=setup(),failure=Error('Native write rejected');
  t.bindings.AttackTime.onInput=()=>{throw failure;};
  t.handle('attack').fire('keydown',{key:'ArrowRight'});
  assert.equal(t.errors[0],failure);
  t.bindings.ReleaseTime.onChange=async()=>{throw failure;};
  t.handle('release').fire('keydown',{key:'ArrowRight'});
  await Promise.resolve();
  assert.equal(t.errors.at(-1),failure);
  assert.equal(t.bindings.ReleaseTime.state.value,.31);
  t.editor.dispose();
});

test('losing a binding during a drag never commits an unknown value',()=>{
  const t=setup(),h=t.handle('attack');
  h.fire('pointerdown');h.fire('pointermove',{clientX:21});
  t.bindings.AttackTime.state.known=false;t.bindings.AttackTime.state.value=undefined;t.editor.refresh();
  h.fire('pointerup');
  assert.equal(t.events.some(e=>e[0]==='change'),false);
  assert.equal(t.events.some(e=>e[2]===undefined),false);
  t.editor.dispose();
});

test('an unavailable decay axis preserves accessible sustain values and range keys',()=>{
  const t=setup('adsr',{DecayTime:{known:false,value:undefined}}),h=t.handle('sustain');
  assert.equal(h.attrs['aria-valuenow'],'0.6');
  h.fire('keydown',{key:'Home'});
  assert.equal(t.bindings.SustainLevel.state.value,0);
  assert.equal(t.events.some(e=>e[1]==='DecayTime'),false);
  t.editor.dispose();
});

test('a replacement generation abandons every stale commit and cancel path',()=>{
  for(const action of ['pointercancel','pointerup','Escape','dispose']){
    const t=setup('adsr',{AttackTime:{generation:'instance-1'}}),h=t.handle('attack');
    h.fire('pointerdown');h.fire('pointermove',{clientX:21});
    assert.equal(t.bindings.AttackTime.state.value,.7);
    const count=t.events.length;
    t.bindings.AttackTime.state.generation='instance-2';t.bindings.AttackTime.state.value=.9;
    if(action==='pointercancel')t.editor.refresh();
    if(action==='dispose')t.editor.dispose();
    else if(action==='Escape')h.fire('keydown',{key:'Escape'});
    else h.fire(action);
    assert.equal(t.events.length,count,action+' must not write into the new generation');
    assert.equal(t.bindings.AttackTime.state.value,.9);
    t.editor.dispose();
  }
});

test('an observed availability gap abandons a gesture even without generation metadata',()=>{
  for(const field of ['enabled','known']){
    const t=setup(),h=t.handle('attack');h.fire('pointerdown');h.fire('pointermove',{clientX:21});
    const count=t.events.length;
    t.bindings.AttackTime.state[field]=false;t.editor.refresh();
    t.bindings.AttackTime.state[field]=true;t.bindings.AttackTime.state.value=.9;t.editor.refresh();
    h.fire('pointercancel');
    assert.equal(t.events.length,count);assert.equal(t.bindings.AttackTime.state.value,.9);
    assert.equal(h.hasPointerCapture(1),false);t.editor.dispose();
  }
});

test('a generation change in either participating axis abandons the whole gesture',()=>{
  const t=setup('adsr',{DecayTime:{generation:'instance-1'},SustainLevel:{generation:'instance-1'}}),h=t.handle('sustain');
  h.fire('pointerdown');h.fire('pointermove',{clientX:4,clientY:-5.7});
  const count=t.events.length;
  t.bindings.DecayTime.state.generation='instance-2';t.bindings.DecayTime.state.value=.9;t.editor.refresh();
  h.fire('pointercancel');
  assert.equal(t.events.length,count);assert.equal(t.bindings.DecayTime.state.value,.9);
  assert.equal(t.bindings.SustainLevel.state.value,.7);t.editor.dispose();
});

test('Escape still reverses actual preview writes within the captured generation',()=>{
  const t=setup('adsr',{AttackTime:{generation:'instance-1'}}),h=t.handle('attack');
  h.fire('pointerdown');h.fire('pointermove',{clientX:21});h.fire('keydown',{key:'Escape'});
  assert.equal(t.bindings.AttackTime.state.value,.2);
  assert.deepEqual(t.events.slice(-2),[['input','AttackTime',.2],['change','AttackTime',.2]]);
  t.editor.dispose();
});
