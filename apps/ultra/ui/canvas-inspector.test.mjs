import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mountAppearanceFields,createParameterField} from './canvas-inspector.mjs';
import {makeNode,REGISTRY} from './canvas-model.mjs';

class Element {
  constructor(){this.children=[];this.dataset={};this.listeners={};}
  append(...children){this.children.push(...children);}
  setAttribute(){}
  addEventListener(name,callback){this.listeners[name]=callback;}
}
const descendants=element=>element.children.flatMap(child=>[child,...descendants(child)]);

test('native Inspector identity and complete state are readable without numeric drafts',()=>{
  const doc={createElement:()=>new Element()},node=makeNode('live_device',1),changes=[],watched=[];
  for(const key of ['device','state']){
    const {input}=createParameterField({doc,node,key,definition:REGISTRY.live_device.params[key],change:value=>changes.push(value),drafts:{watch:input=>watched.push(input)}});
    assert.equal(input.type,'text');
    assert.equal(input.readOnly,true);
    assert.equal(input.value,key==='device'?'Analog':'203 native parameters');
    assert.equal(input.hasDraft?.()??false,false);
    assert.equal(input.listeners.input,undefined);
  }
  assert.deepEqual(changes,[]);assert.deepEqual(watched,[]);
});

test('comment Inspector swatches and opacity edits use the visible inherited callout colors',()=>{
  const area=new Element(),changes=[],doc={createElement:()=>new Element()};
  const node={id:1,type:'comment',params:{text:'Annotation'},style:{bubble:1}};
  const fields=mountAppearanceFields({doc,area,node,change:(...args)=>changes.push(args),reset(){}});
  const control=(key,alpha=false)=>descendants(area).find(element=>element.dataset[alpha?'styleAlpha':'style']===key);
  fields.update(node,false);
  assert.equal(control('bgcolor').value,'#3c3c3c');
  assert.equal(control('color').value,'#d9d9d9');
  assert.equal(control('textcolor').value,'#d9d9d9');
  control('bgcolor',true).value='0.5';control('bgcolor',true).listeners.change();
  assert.deepEqual(changes.at(-1),['bgcolor',[60/255,60/255,60/255,0.5]]);
  fields.update({...node,style:{bubble:0}},false);
  assert.equal(control('bgcolor',true).value,'0');
  assert.equal(control('color',true).value,'0');
  assert.equal(control('textcolor').value,'#eeeeec');
});
