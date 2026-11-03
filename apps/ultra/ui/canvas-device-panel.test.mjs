import test from 'node:test';
import assert from 'node:assert/strict';
import {mountDevicePanel} from './canvas-device-panel.mjs';
import {dom,all} from '../tests/presentation-dom.mjs';

const ids=['instrument-panel','show-instrument','instrument-controls','instrument-title','instrument-empty','instrument-playable','instrument-instance','instrument-package','instrument-preset','instrument-recall','instrument-store','instrument-preset-name','instrument-close','instrument-name'];
function fixture(){
  const {doc}=dom(),elements=new Map(ids.map(id=>[id,doc.createElement('div')]));doc.querySelector=selector=>elements.get(selector.slice(1));
  const presentation={version:1,size:{width:100,height:100},items:[{id:'n',kind:'control',target:{kind:'parameter',node:1,param:'value'},widget:'number',label:'Value',rect:{x:0,y:0,width:80,height:40},included:true,visible:true,style:{accent:'default',labelPosition:'above'}}]};
  const state={ownerId:'owner',revision:1,shared:true,document:{nodes:[{id:1,type:'number',params:{value:0}}],device:null,presentation}};
  const watched=new Set(),forgotten=new Set(),drafts={watch:input=>watched.add(input),forget:input=>forgotten.add(input)};
  const controller={getState:()=>state,notice(){}};
  return{state,elements,watched,forgotten,panel:mountDevicePanel({doc,win:{},controller,drafts})};
}
test('same shared source retains mounted controls and registration until disposal',()=>{
  const {state,elements,watched,forgotten,panel}=fixture();panel.update(state);
  const input=all(elements.get('instrument-controls')).find(item=>item.type==='number');assert.ok(watched.has(input));
  const scope=panel.captureScope();state.authoringRevision=2;state.document.nodes[0].params.value=.5;panel.update(state);
  assert.doesNotThrow(()=>panel.assertScope(scope));assert.equal(all(elements.get('instrument-controls')).find(item=>item.type==='number'),input);
  panel.dispose();assert.ok(forgotten.has(input));
});
test('a replaced draft surface cannot become current again when its scope returns',()=>{
  const {state,elements,panel}=fixture();panel.update(state);const input=all(elements.get('instrument-controls')).find(item=>item.type==='number');
  input.value='.5';input.fire('input');const scope=panel.captureScope();state.revision=2;panel.update(state);state.revision=1;panel.update(state);
  assert.throws(()=>panel.assertScope(scope),/changed/i);panel.dispose();
});
