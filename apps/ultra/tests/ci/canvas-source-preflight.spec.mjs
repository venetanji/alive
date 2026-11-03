import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('**/source-preflight-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><main id="root"></main><button id="elsewhere">Elsewhere</button><div id="outside">Outside</div>'}));
  await page.goto('/source-preflight-fixture');
  await page.evaluate(async()=>{
    const {mountPresentation}=await import('/canvas-presentation-view.mjs');
    const node={className:'LoadableDisplayStyleEditField',scope:[],resource:'fixture',properties:{},children:[],connection:{scope:[],expression:'a',resource:'fixture'},text:()=>''};
    const layout={version:1,size:{width:200,height:100},items:[{id:'panel',kind:'livePanel',target:{node:7,profile:'fixture'},rect:{x:0,y:0,width:200,height:100},included:true,visible:true,style:{accent:'default'}}]};
    const listeners=new Set(),host={scope:{ownerId:'owner',generation:1,instanceId:'root',sourceRevision:'x'},subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},beginSourceGesture:()=>1,writeBatch:async()=>({outcome:'rejected',reason:'rejected'}),acquirePanel:async()=>({resources:{identity:'fixture',layout:{root:node,warnings:[]}},bindings:{snapshot:()=>({values:{a:.2}}),resolveBinding:()=>({bindingId:'a',verified:true,min:0,max:1,display:{format:v=>String(v),parse:s=>Number(s)},getState:()=>({enabled:true,known:true,value:.2})}),disconnect(){}}})};
    window.view=mountPresentation({doc:document,root:document.querySelector('#root'),presentation:layout,host});
    await new Promise(resolve=>setTimeout(resolve,0));
  });
});

test('invalid focused draft regains focus and selection after overlapping failed freezes',async({page})=>{
  const input=page.locator('#root input');await input.focus();await input.fill('bad');await input.evaluate(e=>e.setSelectionRange(1,2));
  const result=await page.evaluate(()=>{const input=document.querySelector('#root input'),first=view.freezeEdits(),second=view.freezeEdits();const accepted=view.captureDrafts(()=>input.commitDraft());first(true);const during=document.activeElement===input;second(false);return{accepted,during,focused:document.activeElement===input,start:input.selectionStart,end:input.selectionEnd,value:input.value,readOnly:input.readOnly};});
  expect(result).toEqual({accepted:false,during:false,focused:true,start:1,end:2,value:'bad',readOnly:false});
});

test('a later user focus change is not overwritten after rejection',async({page})=>{
  const input=page.locator('#root input');await input.focus();await input.fill('bad');
  const focused=await page.evaluate(()=>{const release=view.freezeEdits();document.querySelector('#elsewhere').focus();release(true);return document.activeElement.id;});
  expect(focused).toBe('elsewhere');
});
test('a later pointer action on a non-focusable target prevents focus restoration',async({page})=>{
  const input=page.locator('#root input');await input.focus();await input.fill('bad');
  const focused=await page.evaluate(()=>{const release=view.freezeEdits();document.querySelector('#outside').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));release(true);return document.activeElement===document.querySelector('#root input');});
  expect(focused).toBe(false);
});

test('asynchronous source rejection restores focus after preflight',async({page})=>{
  const input=page.locator('#root input');await input.focus();await input.fill('0.6');await input.evaluate(e=>e.setSelectionRange(1,2));
  const result=await page.evaluate(async()=>{
    const input=document.querySelector('#root input'),release=view.freezeEdits();
    view.captureDrafts(()=>input.commitDraft());let rejected=false;try{await view.settleDrafts();}catch{rejected=true;}finally{release(true);}
    return{rejected,focused:document.activeElement===input,start:input.selectionStart,end:input.selectionEnd};
  });
  expect(result).toEqual({rejected:true,focused:true,start:1,end:2});
});
