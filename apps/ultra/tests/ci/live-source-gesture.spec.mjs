import {test,expect} from '@playwright/test';
import {ordinaryPanelPage,ordinaryCanvasPage} from './live-ordinary-panel-helper.mjs';

test('production authority enables only the installed Noise control',async({page})=>{
  await ordinaryPanelPage(page);
  await page.evaluate(async()=>{window.h=await window.createOrdinaryPanelHarness();h.enableCommits();window.before=h.patch;h.mount();});
  await expect(page.locator('.live-device-view')).toBeVisible();
  const counts=await page.evaluate(()=>{
    const e=document.querySelector('.live-device-view');
    const controls=[...e.querySelectorAll('.live-device-control input,.live-device-control select,.live-device-control button')];
    const handles=[...e.querySelectorAll('.live-envelope-editor [role=slider]')];
    return {total:controls.length,enabled:controls.filter(x=>!x.disabled).length,handles:handles.filter(x=>x.getAttribute('aria-disabled')!=='true').length};
  });
  expect(counts.total).toBeGreaterThan(100);expect(counts.enabled).toBe(1);expect(counts.handles).toBe(0);
  const enabled=page.locator('.live-device-control :is(input,select,button):enabled');
  await expect(enabled).toHaveCount(1);await expect(enabled).toHaveText('Noise');
  const wrapper=enabled.locator('xpath=..');
  await expect(wrapper).not.toHaveAttribute('title');await expect(enabled).not.toHaveAttribute('title');
  await expect(enabled).toHaveAttribute('data-help',/Noise.*Off/);await expect(enabled).toHaveAttribute('aria-pressed','false');
  await enabled.hover();await enabled.focus();
  expect(await page.evaluate(()=>h.calls.filter(call=>call.name==='document_commit').length)).toBe(0);
  await enabled.click();
  await expect.poll(()=>page.evaluate(()=>h.history.length)).toBe(1);
  await expect(enabled).toHaveText('Noise');await expect(enabled).toHaveAttribute('aria-pressed','true');
  await expect(enabled).toHaveAttribute('data-help',/Noise.*On/);await expect(wrapper).not.toHaveAttribute('title');
  const after=await page.evaluate(()=>h.patch);const before=await page.evaluate(()=>window.before);
  before.nodes[0].params.state.values[24]=1;expect(after).toEqual(before);
  await page.evaluate(()=>h.dispose());
});

for(const key of ['Enter','Space'])test(`production Noise ${key} activation makes one source transaction without transport commands`,async({page})=>{
  await ordinaryCanvasPage(page,{writable:false});
  await page.locator('#show-instrument').click();
  const noise=page.locator('#instrument-controls').getByRole('button',{name:'Noise',exact:true});
  await expect(noise).toBeEnabled();const start=await page.evaluate(()=>owner.calls.length);
  await noise.hover();await noise.focus();
  await expect(page.locator('#ultra-info-text')).toHaveText(/Noise.*Off/);
  expect(await page.evaluate(start=>owner.calls.slice(start).filter(call=>/^(audio_(?!status|devices)|device_event|document_(commit|save|undo|redo|close))/.test(call.name)).map(call=>call.name),start)).toEqual([]);
  await page.keyboard.press(key);
  await expect.poll(()=>page.evaluate(()=>owner.history.length)).toBe(1);
  const calls=await page.evaluate(start=>owner.calls.slice(start).map(call=>call.name),start);
  expect(calls.filter(name=>name==='document_commit')).toHaveLength(1);
  expect(calls.filter(name=>/^(audio_(?!status|devices)|device_event|document_(save|undo|redo|close))/.test(name))).toEqual([]);
  expect(await page.evaluate(()=>owner.patch.nodes[0].params.state.values[24])).toBe(1);
});

async function writablePanel(page){
  await ordinaryPanelPage(page,{writable:true});
  await page.evaluate(async()=>{
    window.h=await window.createOrdinaryPanelHarness();h.enableCommits();
    h.publish(patch=>{const second=structuredClone(patch.nodes[0]);second.id=8;patch.nodes.push(second);});
    window.before=h.patch;window.view=h.mount();
  });
  await expect(page.locator('.live-device-view')).toBeVisible();
  const enabled=page.locator('.live-device-control :is(input,select,button):enabled');
  await expect(enabled).toHaveCount(1);
  await expect(enabled).toHaveText('Noise');
  return page.locator('#panel').getByRole('button',{name:'Noise',exact:true});
}

test('mounted Boolean commits one complete source and preserves the other source',async({page})=>{
  const noise=await writablePanel(page);
  await page.evaluate(()=>{
    window.originalElement=document.querySelector('.live-device-view');
    const mpe=[...originalElement.querySelectorAll('button')].find(button=>button.textContent==='MPE');
    for(const finger of originalElement.querySelectorAll('.live-device-finger')){finger.click();if(mpe.checkVisibility())break;}
    mpe.click();window.selectedMpe=mpe;
  });
  await noise.click();
  await expect.poll(()=>page.evaluate(()=>h.replies.filter(r=>r.request.phase==='commit').length)).toBe(1);
  const result=await page.evaluate(()=>({before,after:h.patch,history:h.history,replies:h.replies,
    writes:h.calls.filter(call=>call.name==='document_commit'),sameElement:originalElement===document.querySelector('.live-device-view'),mpeSelected:selectedMpe.getAttribute('aria-checked')}));
  expect(result.writes).toHaveLength(1);expect(result.history).toHaveLength(1);
  expect(result.replies.at(-1).reply).toMatchObject({outcome:'accepted',native:{status:'unobserved'}});
  expect(result.after.nodes[0].params.state.values[24]).toBe(1);
  expect(result.before.nodes[0].params.state.values[24]).toBe(0);
  expect(result.after.nodes[0].params.state.values).toHaveLength(203);
  for(const key of ['version','profile','dllSha256','guiSha256','graphicsSha256'])expect(result.after.nodes[0].params.state[key]).toBe(result.before.nodes[0].params.state[key]);
  for(let index=0;index<203;index++)if(index!==24)expect(result.after.nodes[0].params.state.values[index]).toBe(result.before.nodes[0].params.state.values[index]);
  expect(result.after.nodes[0].params.state.values[194]).toBe(12.1);
  expect(result.after.nodes[1]).toEqual(result.before.nodes[1]);expect(result.sameElement).toBe(true);expect(result.mpeSelected).toBe('true');
  await page.evaluate(()=>h.dispose());
});

test('rejected commit retains the visible Boolean draft until explicit cancel',async({page})=>{
  const noise=await writablePanel(page);
  await page.evaluate(()=>{h.hook=name=>name==='document_commit'?Promise.reject(Error('owner rejected')):undefined;});
  await noise.click();
  const cancel=page.getByRole('button',{name:'Cancel draft'});
  await expect(cancel).toBeVisible();await expect(noise).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>view.hasDraft())).toBe(true);
  await cancel.click();
  await expect(cancel).toBeHidden();await expect(noise).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>view.hasDraft())).toBe(false);
  expect(await page.evaluate(()=>h.history.length)).toBe(0);
  await page.evaluate(()=>h.dispose());
});

test('disabled controls cannot write and no-op and cancel phases create no history',async({page})=>{
  await writablePanel(page);
  const phases=await page.evaluate(async()=>{
    const controls=[...document.querySelectorAll('.live-device-control :is(input,select,button):disabled')];
    for(const control of controls){
      control.dispatchEvent(new Event('input',{bubbles:true}));control.dispatchEvent(new Event('change',{bubbles:true}));
      control.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    }
    const scope=h.host.scope,id=h.host.beginSourceGesture(7);
    const preview=await h.host.writeBatch({scope,sourceNode:7,gestureId:id,phase:'preview',values:{NoiseToggle:true}});
    const cancel=await h.host.writeBatch({scope,sourceNode:7,gestureId:id,phase:'cancel',values:{}});
    const id2=h.host.beginSourceGesture(7);
    const unchanged=await h.host.writeBatch({scope,sourceNode:7,gestureId:id2,phase:'commit',values:{NoiseToggle:false}});
    return {preview,cancel,unchanged,writes:h.calls.filter(call=>call.name==='document_commit').length,history:h.history.length};
  });
  expect(phases.preview).toEqual({phase:'preview'});expect(phases.cancel).toEqual({phase:'cancel'});
  expect(phases.unchanged).toMatchObject({outcome:'unchanged',native:{status:'unobserved'}});
  expect(phases.writes).toBe(0);expect(phases.history).toBe(0);
  await page.evaluate(()=>h.dispose());
});

test('pending Boolean commit stays a draft and blocks repeated clicks until its owner replies',async({page})=>{
  const noise=await writablePanel(page);
  await page.evaluate(()=>{window.releaseCommit=null;h.hook=(name,args)=>{
    if(name==='document_commit')return new Promise((resolve,reject)=>{releaseCommit=()=>reject(Error('owner rejected'));});
  };});
  await noise.click();
  await expect.poll(()=>page.evaluate(()=>typeof releaseCommit)).toBe('function');
  await expect(noise).toBeDisabled();expect(await page.evaluate(()=>view.hasDraft())).toBe(true);
  await noise.dispatchEvent('click');
  expect(await page.evaluate(()=>h.calls.filter(call=>call.name==='document_commit').length)).toBe(1);
  await page.evaluate(()=>releaseCommit());
  await expect(page.getByRole('button',{name:'Cancel draft'})).toBeVisible();
  await page.getByRole('button',{name:'Cancel draft'}).click();
  expect(await page.evaluate(()=>view.hasDraft())).toBe(false);
  await page.evaluate(()=>h.dispose());
});

test('two mounted views retain the losing draft when the first source commit wins',async({page})=>{
  const first=await writablePanel(page);
  await page.evaluate(()=>{
    const root=document.createElement('main');root.id='second-panel';document.body.append(root);
    window.secondView=h.mount(root);window.release=h.holdCommit();
  });
  await expect(page.locator('#second-panel .live-device-view')).toBeVisible();
  const second=page.locator('#second-panel').getByRole('button',{name:'Noise',exact:true});
  await expect(second).toBeEnabled();
  await first.click();await expect.poll(()=>page.evaluate(()=>h.calls.filter(c=>c.name==='document_commit').length)).toBe(1);
  await second.click();await page.evaluate(()=>release());
  await expect(page.locator('#second-panel').getByRole('button',{name:'Cancel draft'})).toBeVisible();
  expect(await page.evaluate(()=>secondView.hasDraft())).toBe(true);
  expect(await page.evaluate(()=>h.history.length)).toBe(1);
  await page.locator('#second-panel').getByRole('button',{name:'Cancel draft'}).click();
  expect(await page.evaluate(()=>secondView.hasDraft())).toBe(false);
  await page.evaluate(()=>h.dispose());
});

test('source replacement while a commit is held preserves the draft and rejects the late write',async({page})=>{
  const noise=await writablePanel(page);
  await page.evaluate(()=>{window.release=h.holdCommit();});
  await noise.click();await expect.poll(()=>page.evaluate(()=>h.calls.filter(c=>c.name==='document_commit').length)).toBe(1);
  await page.evaluate(()=>{h.publish(patch=>{patch.nodes[0].params.state.values[194]=12.2;});release();});
  await expect(page.getByRole('button',{name:'Cancel draft'})).toBeVisible();
  const result=await page.evaluate(()=>({draft:view.hasDraft(),state:h.patch.nodes[0].params.state,history:h.history.length}));
  expect(result.draft).toBe(true);expect(result.state.values[24]).toBe(0);expect(result.state.values[194]).toBe(12.2);expect(result.history).toBe(0);
  await page.getByRole('button',{name:'Cancel draft'}).click();
  expect(await page.evaluate(()=>view.hasDraft())).toBe(false);
  await page.evaluate(()=>h.dispose());
});

test('runtime replacement rejects a held source commit without discarding its draft',async({page})=>{
  const noise=await writablePanel(page);
  await page.evaluate(()=>{window.release=h.holdCommit();});
  await noise.click();await expect.poll(()=>page.evaluate(()=>h.calls.filter(c=>c.name==='document_commit').length)).toBe(1);
  await page.evaluate(()=>{h.replaceRuntime();release();});
  await expect(page.getByRole('button',{name:'Cancel draft'})).toBeVisible();
  expect(await page.evaluate(()=>({draft:view.hasDraft(),value:h.patch.nodes[0].params.state.values[24],history:h.history.length}))).toEqual({draft:true,value:0,history:0});
  await page.getByRole('button',{name:'Cancel draft'}).click();
  expect(await page.evaluate(()=>view.hasDraft())).toBe(false);
  await page.evaluate(()=>h.dispose());
});

for(const action of ['save','close'])test(`actual canvas ${action} waits for the mounted Boolean commit`,async({page})=>{
  await ordinaryCanvasPage(page);
  await expect(page.locator('#document-title')).toHaveText('Analog.ultra');
  await page.locator('#show-instrument').click();
  const noise=page.locator('#instrument-controls').getByRole('button',{name:'Noise',exact:true});
  await expect(noise).toBeEnabled();
  await page.evaluate(()=>{window.release=owner.hold();});
  await noise.click();
  await expect.poll(()=>page.evaluate(()=>owner.calls.filter(c=>c.name==='document_commit').length)).toBe(1);
  if(action==='save')await page.locator('#document-save').click();
  else await page.evaluate(()=>{void owner.emit('document-flush-before-close',{requestLabel:'ordinary-panel-test',token:43});});
  const ack=action==='save'?'document_save':'document_close_flushed';
  await page.waitForTimeout(100);
  expect(await page.evaluate(name=>owner.calls.filter(c=>c.name===name).length,ack)).toBe(0);
  await page.evaluate(()=>release());
  await expect.poll(()=>page.evaluate(name=>owner.calls.filter(c=>c.name===name).length,ack)).toBe(1);
  const result=await page.evaluate(name=>({calls:owner.calls,history:owner.history.length,ack:owner.calls.find(c=>c.name===name)}),ack);
  expect(result.history).toBe(1);expect(result.ack.args.error).toBeUndefined();
  expect(result.calls.findIndex(c=>c.name==='document_commit')).toBeLessThan(result.calls.findIndex(c=>c.name===ack));
  if(action==='save')expect(result.ack.args.patch.nodes[0].params.state.values[24]).toBe(1);
});

test('resource identity replacement rejects a held gesture and retains its draft',async({page})=>{
  const noise=await writablePanel(page);
  await page.evaluate(()=>{window.release=h.holdCommit();});
  await noise.click();await expect.poll(()=>page.evaluate(()=>h.calls.filter(c=>c.name==='document_commit').length)).toBe(1);
  await page.evaluate(()=>{h.publish(patch=>{const state=patch.nodes[0].params.state;state.guiSha256='5ec872d673fd5f4f5f05787e4245c56e172ff2663c2d4493e94d598b883114e6';state.graphicsSha256='a0b8aa480aa3d21f093b416ea59b3f200d2e2466936f95d886a554bffe875cb7';});release();});
  await expect(page.getByRole('button',{name:'Cancel draft'})).toBeVisible();
  expect(await page.evaluate(()=>({draft:view.hasDraft(),value:h.patch.nodes[0].params.state.values[24],history:h.history.length}))).toEqual({draft:true,value:0,history:0});
  await page.getByRole('button',{name:'Cancel draft'}).click();
  expect(await page.evaluate(()=>view.hasDraft())).toBe(false);
  await page.evaluate(()=>h.dispose());
});

test('owner replacement revokes a held gesture and retains the old view draft',async({page})=>{
  const noise=await writablePanel(page);
  await page.evaluate(()=>{window.release=h.holdCommit();});
  await noise.click();await expect.poll(()=>page.evaluate(()=>h.calls.filter(c=>c.name==='document_commit').length)).toBe(1);
  await page.evaluate(()=>{h.replaceOwner();release();});
  await expect(page.getByRole('button',{name:'Cancel draft'})).toBeVisible();
  expect(await page.evaluate(()=>({draft:view.hasDraft(),value:h.patch.nodes[0].params.state.values[24],history:h.history.length}))).toEqual({draft:true,value:0,history:0});
  await page.getByRole('button',{name:'Cancel draft'}).click();
  expect(await page.evaluate(()=>view.hasDraft())).toBe(false);
  await page.evaluate(()=>h.dispose());
});

test('disposed mounted view cannot start another gesture after a late commit reply',async({page})=>{
  const noise=await writablePanel(page);
  await page.evaluate(()=>{window.release=h.holdCommit();});
  await noise.click();await expect.poll(()=>page.evaluate(()=>h.calls.filter(c=>c.name==='document_commit').length)).toBe(1);
  await page.evaluate(()=>{view.dispose();release();});
  await expect.poll(()=>page.evaluate(()=>h.replies.length)).toBe(1);
  await noise.dispatchEvent('click');
  expect(await page.evaluate(()=>h.calls.filter(c=>c.name==='document_commit').length)).toBe(1);
  await page.evaluate(()=>h.dispose());
});

for(const laterFocus of [false,true])test(`actual canvas delayed close rejection ${laterFocus?'respects newer focus':'restores Boolean focus'}`,async({page})=>{
  await ordinaryCanvasPage(page);
  await expect(page.locator('#document-title')).toHaveText('Analog.ultra');
  await page.locator('#show-instrument').click();
  const noise=page.locator('#instrument-controls').getByRole('button',{name:'Noise',exact:true});
  await expect(noise).toBeEnabled();await noise.click();
  await expect.poll(()=>page.evaluate(()=>owner.history.length)).toBe(1);
  await expect(noise).toBeEnabled();await noise.focus();await expect(noise).toBeFocused();
  await page.evaluate(async()=>{
    await owner.setPreviews([{node:7,key:'test',value:0}]);
    owner.hook=name=>name==='document_settle_parameter_gestures'?new Promise((resolve,reject)=>{window.rejectBarrier=reject;}):undefined;
    void owner.emit('document-flush-before-close',{requestLabel:'ordinary-panel-test',token:44});
  });
  await expect.poll(()=>page.evaluate(()=>typeof window.rejectBarrier)).toBe('function');
  await noise.dispatchEvent('click');
  await expect(noise).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.presentation-panel-status')).toContainText('unavailable');
  await expect(page.getByRole('button',{name:'Cancel draft',includeHidden:true})).toBeHidden();
  if(laterFocus)await page.locator('#document-save').focus();
  await page.evaluate(()=>rejectBarrier(Error('delayed barrier failure')));
  await expect.poll(()=>page.evaluate(()=>owner.calls.filter(c=>c.name==='document_close_flushed').length)).toBe(1);
  expect(await page.evaluate(()=>owner.calls.find(c=>c.name==='document_close_flushed').args.error)).toContain('delayed barrier failure');
  if(laterFocus)await expect(page.locator('#document-save')).toBeFocused();else await expect(noise).toBeFocused();
  expect(await page.evaluate(()=>({writes:owner.calls.filter(c=>c.name==='document_commit').length,history:owner.history.length,value:owner.patch.nodes[0].params.state.values[24]}))).toEqual({writes:1,history:1,value:1});
});

test('overlapping close requests before source settlement do not restore superseded focus',async({page})=>{
  await ordinaryCanvasPage(page);
  await expect(page.locator('#document-title')).toHaveText('Analog.ultra');
  await page.locator('#show-instrument').click();
  const noise=page.locator('#instrument-controls').getByRole('button',{name:'Noise',exact:true});
  await expect(noise).toBeEnabled();await noise.focus();await expect(noise).toBeFocused();
  await page.evaluate(()=>{
    window.restores=0;document.querySelector('#instrument-controls .live-toggle:not(:disabled)').addEventListener('focus',()=>restores++);
    window.release=owner.hold();document.querySelector('#instrument-controls .live-toggle:not(:disabled)').click();
    void owner.emit('document-flush-before-close',{requestLabel:'ordinary-panel-test',token:50});
    void owner.emit('document-flush-before-close',{requestLabel:'ordinary-panel-test',token:51});
  });
  await expect.poll(()=>page.evaluate(()=>owner.calls.filter(c=>c.name==='document_commit').length)).toBe(1);
  await page.evaluate(()=>release());
  await expect.poll(()=>page.evaluate(()=>owner.calls.filter(c=>c.name==='document_close_flushed').length)).toBe(1);
  const result=await page.evaluate(()=>({acks:owner.calls.filter(c=>c.name==='document_close_flushed').map(c=>c.args),writes:owner.calls.filter(c=>c.name==='document_commit').length,history:owner.history.length,focused:document.activeElement?.textContent==='Noise',restores}));
  expect(result.acks).toEqual([{requestLabel:'ordinary-panel-test',token:51}]);
  expect(result.writes).toBe(1);expect(result.history).toBe(1);expect(result.focused).toBe(false);expect(result.restores).toBe(0);
});
