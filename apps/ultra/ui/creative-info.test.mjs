import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CONTEXT_INFO,describeContextTarget,mountContextInfo} from './creative-info.mjs';
import {describeUltraTarget} from './canvas-info.mjs';

function element(attrs={},region=null,tag='button'){
  const el={
    textContent:attrs.textContent??'',
    getAttribute:key=>attrs[key]??null,
    matches:q=>q.split(',').includes(tag),
    closest(q){
      if(q.startsWith('[data-help]'))return attrs.control===false?null:el;
      if(region===q)return el;
      return null;
    },
  };
  return el;
}
test('shared Info prioritizes explicit help then titles and accessible names',()=>{
  assert.equal(describeContextTarget(element({'data-help':'Patcher action',title:'Title'})),'Patcher action');
  assert.equal(describeContextTarget(element({title:'Zoom patch','aria-label':'Scale'})),'Zoom patch');
  assert.equal(describeContextTarget(element({'aria-label':'Save patch'})),'Save patch');
  assert.equal(describeContextTarget(null),DEFAULT_CONTEXT_INFO);
});
test('Ultra region fallback is specific to the patch canvas',()=>{
  assert.match(describeUltraTarget(element({control:false},'#workspace')),/Patch canvas/);
  assert.match(describeUltraTarget(element({control:false},'.audio-bar')),/Native audio/);
  assert.match(describeUltraTarget(element({control:false},'#details-panel')),/Inspector/);
});
test('shared Info observes pointer and focus without changing controls',()=>{
  const handlers=new Map(),output={textContent:DEFAULT_CONTEXT_INFO,title:''};
  const doc={getElementById:()=>output,
    addEventListener:(type,fn)=>handlers.set(type,fn),
    removeEventListener:(type,fn)=>{if(handlers.get(type)===fn)handlers.delete(type);},
  };
  const mounted=mountContextInfo({doc,outputId:'ultra-info-text'});
  assert.equal(handlers.size,3);
  handlers.get('pointerover')({target:element({title:'Stop patch'})});
  assert.equal(output.textContent,'Stop patch');
  assert.equal(output.title,'Stop patch');
  handlers.get('focusin')({target:element({'aria-label':'Inspector'})});
  assert.equal(output.textContent,'Inspector');
  handlers.get('pointerout')({relatedTarget:null});
  assert.equal(output.textContent,DEFAULT_CONTEXT_INFO);
  mounted.dispose();assert.equal(handlers.size,0);
});
test('Info can keep descriptions in its output without recreating a tooltip',()=>{
  const handlers=new Map(),output={textContent:'',title:''};
  const doc={getElementById:()=>output,addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:()=>{}};
  mountContextInfo({doc,tooltip:false});
  handlers.get('pointerover')({target:element({'data-help':'Stop transport'})});
  assert.equal(output.textContent,'Stop transport');assert.equal(output.title,'');
});

test('Info refreshes only the current opted-in help target and stops observing on exit',()=>{
  const handlers=new Map(),output={textContent:'',title:''},attrs={'data-help':'Noise: Off.','data-help-live':''};
  let observer;
  class Observer{constructor(callback){this.callback=callback;observer=this;}observe(target,options){this.target=target;this.options=options;}disconnect(){this.target=null;}}
  const doc={defaultView:{MutationObserver:Observer},getElementById:()=>output,addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:()=>{}};
  const noise=element(attrs),other=element({'data-help':'Save'}),mounted=mountContextInfo({doc,tooltip:false});
  handlers.get('pointerover')({target:noise});assert.equal(output.textContent,'Noise: Off.');
  assert.ok(observer,'the current live-help target is observed');assert.equal(observer.target,noise);assert.deepEqual(observer.options,{attributes:true,attributeFilter:['data-help']});
  attrs['data-help']='Noise: On.';observer.callback();assert.equal(output.textContent,'Noise: On.');
  handlers.get('focusin')({target:other});assert.equal(output.textContent,'Save');assert.equal(observer.target,null);
  attrs['data-help']='Noise: Off.';observer.callback();assert.equal(output.textContent,'Save');
  mounted.dispose();assert.equal(observer.target,null);
});
