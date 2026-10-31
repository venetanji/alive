import {test,expect} from '@playwright/test';
import {projectFixturePresentation} from '../presentation-dom.mjs';
import {readFileSync,mkdirSync} from 'node:fs';

for(const size of [{width:800,height:600},{width:1280,height:800},{width:1440,height:900}])test(`detail maximum resize preserves useful pinned Session controls at ${size.width}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page,{trackCount:8});await page.locator('#detail-devices').click();const separator=page.getByRole('separator',{name:'Resize detail area',exact:true}),session=page.locator('#session-workspace');
  const check=async()=>{const bounds=await session.boundingBox();for(const locator of [page.getByRole('button',{name:'Select Pulse slot 1',exact:true}),page.getByRole('button',{name:'Pulse mute',exact:true}),page.getByRole('button',{name:'Pulse solo',exact:true}),page.locator('#master-session').getByRole('spinbutton',{name:'Master gain',exact:true})]){const r=await locator.boundingBox();expect(r.y,await locator.getAttribute('aria-label')).toBeGreaterThanOrEqual(bounds.y-1);expect(r.y+r.height,await locator.getAttribute('aria-label')).toBeLessThanOrEqual(bounds.y+bounds.height+1);}};
  await separator.focus();await separator.press('End');await check();await page.screenshot({path:testInfo.outputPath(`end-resize-${size.width}.png`)});
  await separator.press('Home');const box=await separator.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,65,{steps:5});await page.mouse.up();await check();
  await page.setViewportSize({width:800,height:600});await check();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();await expect(session).toBeHidden();await page.getByRole('button',{name:'Restore detail size',exact:true}).click();await check();expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

for(const width of [128,72])test(`track action menus stay reachable at ${width}px including horizontal scroll`,async({page},testInfo)=>{
  await page.setViewportSize({width:800,height:600});await openSession(page,{trackCount:8});await page.locator('#detail-devices').click();const workspace=page.locator('#session-workspace');
  for(const [id,name]of [['track-1','Pulse'],['track-8','Track 8']]){
    const track=page.locator(`.track[data-track-id="${id}"]`),handle=track.getByRole('separator',{name:`Resize ${name} track`,exact:true});if(id==='track-8')await workspace.evaluate(e=>e.scrollLeft=e.scrollWidth);await handle.focus();if(width===72)await handle.press('Home');
    const inspector=track.locator('.track-inspector'),summary=inspector.locator('summary');await summary.click();
    for(const label of [`Open ${name} editor`,`Replace ${name} device`,`Remove ${name} track`]){const action=page.getByRole('button',{name:label,exact:true}),rect=await action.boundingBox(),view=await workspace.boundingBox();expect(rect.x,label).toBeGreaterThanOrEqual(view.x-1);expect(rect.x+rect.width,label).toBeLessThanOrEqual(view.x+view.width+1);expect(await action.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),label).toBe(true);}
    await page.screenshot({path:testInfo.outputPath(`track-menu-${id}-${width}.png`)});await summary.focus();await summary.press('Escape');await expect(inspector).not.toHaveAttribute('open','');await expect(summary).toBeFocused();
  }expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('track menu navigation preserves draft and the chosen track owns the editor action',async({page})=>{
  await page.setViewportSize({width:800,height:600});await openSession(page);await page.locator('#detail-devices').click();const track=page.locator('.track').first(),menu=track.locator('.track-inspector'),summary=menu.locator('summary'),gain=page.getByRole('spinbutton',{name:'Pulse gain',exact:true});
  await gain.fill('0.713');await summary.click();await expect(gain).toHaveValue('0.713');expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await page.getByRole('button',{name:'Select Harmony track',exact:true}).click();await expect(menu).not.toHaveAttribute('open','');await page.getByRole('button',{name:'Select Pulse track',exact:true}).click();await expect(gain).toHaveValue('0.713');
  await summary.click();await page.getByRole('button',{name:'Open Pulse editor',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_editor').length)).toBe(1);expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([{name:'alive_editor',args:{instanceId:'instrument-0',generation:1}}]);
});

test('scrolling the track bank dismisses an open track menu and keeps focus in Session',async({page})=>{
  await page.setViewportSize({width:800,height:600});await openSession(page,{trackCount:8});const workspace=page.locator('#session-workspace'),menu=page.locator('.track-inspector').first();await menu.locator('summary').click();await menu.getByRole('button',{name:'Open Pulse editor',exact:true}).focus();await workspace.evaluate(e=>e.scrollLeft=300);await expect(menu).not.toHaveAttribute('open','');await expect(workspace).toBeFocused();expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('resizing the window dismisses an open track menu without losing focus',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);const workspace=page.locator('#session-workspace'),menu=page.locator('.track-inspector').first();await menu.locator('summary').click();await menu.getByRole('button',{name:'Open Pulse editor',exact:true}).focus();await page.setViewportSize({width:800,height:600});await expect(menu).not.toHaveAttribute('open','');await expect(workspace).toBeFocused();expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('narrow track keeps secondary stereo readout accessible without visual overlap',async({page})=>{
  await page.setViewportSize({width:800,height:600});await openSession(page);const track=page.locator('.track').first(),resize=track.getByRole('separator',{name:'Resize Pulse track'});await resize.focus();await resize.press('Home');const readout=track.locator('output[aria-label="Pulse peak"]');await expect(readout).toHaveText('0.000 / 0.000');expect((await readout.boundingBox()).width).toBeLessThanOrEqual(1);
});

for(const size of [{width:800,height:600},{width:1280,height:800},{width:1440,height:900}])test(`Browser device hierarchy remains passive and honest at ${size.width}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page);await page.locator('#detail-devices').click();const gain=page.getByRole('spinbutton',{name:'Pulse gain',exact:true});await gain.fill('0.713');
  const tree=page.getByRole('tree',{name:'Browser results'}),device=tree.getByRole('treeitem',{name:'Subtractive',exact:true}),search=page.getByRole('searchbox',{name:'Search browser'});await device.click();await expect(gain).toHaveValue('0.713');
  await tree.press('Space');expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  for(let i=0;i<2;i++){await tree.press('ArrowRight');await expect(device).toHaveAttribute('aria-expanded','true');await expect(tree.getByRole('treeitem',{name:'Preset browsing unavailable',exact:true})).toHaveAttribute('aria-disabled','true');await tree.press('ArrowLeft');await expect(device).toHaveAttribute('aria-expanded','false');}
  await device.locator('.browser-disclosure').click();await expect(device).toHaveAttribute('aria-expanded','true');await device.locator('.browser-disclosure').click();await expect(device).toHaveAttribute('aria-expanded','false');
  await tree.press('ArrowRight');await page.screenshot({path:testInfo.outputPath(`browser-expanded-${size.width}.png`)});await page.getByRole('button',{name:'Browse Audio Effects',exact:true}).click();await page.getByRole('button',{name:'Browse Instruments',exact:true}).click();await expect(device).toHaveAttribute('aria-selected','true');await expect(device).toHaveAttribute('aria-expanded','true');await page.getByRole('button',{name:'Browse All',exact:true}).click();await search.fill('Stereo Utility');await expect(tree.getByRole('treeitem',{name:'Stereo Utility',exact:true})).toBeVisible();await page.screenshot({path:testInfo.outputPath(`browser-search-${size.width}.png`)});await search.fill('');await expect(device).toHaveAttribute('aria-selected','true');await expect(device).toHaveAttribute('aria-expanded','true');
  const browserResize=page.getByRole('separator',{name:'Resize browser'});await browserResize.focus();await browserResize.press('End');await browserResize.press('Home');await expect(device).toHaveAttribute('aria-expanded','true');
  await page.locator('#toggle-browser').click();await page.locator('#toggle-browser').click();await expect(device).toHaveAttribute('aria-expanded','true');await expect(gain).toHaveValue('0.713');expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

for(const size of [{width:800,height:600},{width:1440,height:900}])test(`Browser ends at actual lower chrome with all panels hidden at ${size.width}`,async({page})=>{
  await page.setViewportSize(size);await openSession(page);
  for(let i=0;i<2;i++){
    await page.locator('#detail-clip').click();await page.locator('#toggle-help').click();
    const bounds=await page.evaluate(()=>{const b=document.querySelector('#workspace-browser').getBoundingClientRect(),r=document.querySelector('#detail-panel').getBoundingClientRect(),s=document.querySelector('#browser-resizer').getBoundingClientRect();return {browser:b.bottom,resizer:s.bottom,lower:r.top};});
    expect(Math.abs(bounds.browser-bounds.lower)).toBeLessThanOrEqual(1);expect(Math.abs(bounds.resizer-bounds.lower)).toBeLessThanOrEqual(1);
    await page.locator('#toggle-help').click();await page.locator('#detail-clip').click();
  }
});

for(const method of ['mouse','keyboard'])test(`Clip disclosure preserves an unfinished Start through ${method} navigation`,async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  const field=page.getByRole('spinbutton',{name:'Clip Start',exact:true}),summary=page.locator('.clip-properties > details').first().locator('summary');
  await field.fill('1');
  if(method==='mouse')await summary.click();else{await field.press('Shift+Tab');await expect(summary).toBeFocused();await summary.press('Enter');}
  await expect(field).toBeHidden();
  const before=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(before+2);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  if(method==='mouse')await summary.click();else await summary.press('Enter');
  await expect(field).toHaveValue('1');await field.focus();await field.press('Tab');
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_workspace_edit').length)).toBe(1);
  expect(await page.evaluate(()=>window.calls.find(c=>c.name==='alive_workspace_edit').args.operation)).toMatchObject({kind:'regionSet',occurrence:{kind:'slot',trackId:'track-1',slotId:'clip-track-1'},region:{start:1}});
});

test('a parked Clip Start stays with its source through selection changes',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  const field=page.getByRole('spinbutton',{name:'Clip Start',exact:true}),summary=page.locator('.clip-properties > details').first().locator('summary');
  await field.fill('1');await summary.click();await page.getByRole('button',{name:'Restore detail size',exact:true}).click();
  await page.getByRole('button',{name:'Select Harmony slot 1',exact:true}).click();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();await summary.click();await expect(field).toHaveValue('0');
  await page.locator('#save').click();await expect(page.locator('#notice')).toContainText('Finish Clip Start');expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await summary.click();await page.getByRole('button',{name:'Restore detail size',exact:true}).click();await page.getByRole('button',{name:'Select Pulse slot 1',exact:true}).click();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();await summary.click();
  await expect(field).toHaveValue('1');expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await field.focus();await field.press('Tab');await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_workspace_edit').length)).toBe(1);
  expect(await page.evaluate(()=>window.calls.find(c=>c.name==='alive_workspace_edit').args.operation)).toMatchObject({kind:'regionSet',occurrence:{kind:'slot',trackId:'track-1',slotId:'clip-track-1'},region:{start:1}});
});

for(const size of [{width:1280,height:800},{width:1440,height:900}])test(`default simultaneous detail shows complete controls and useful Session workspace at ${size.width}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page);await page.locator('#detail-devices').click();
  const fullyVisible=locator=>locator.evaluate(el=>{const r=el.getBoundingClientRect();for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflow+s.overflowY+s.overflowX)&&(r.top<b.top-1||r.bottom>b.bottom+1||r.left<b.left-1||r.right>b.right+1))return false;}return r.top>=0&&r.left>=0&&r.bottom<=innerHeight&&r.right<=innerWidth;});
  for(const label of ['Clip Start','Clip End','Loop Position','Loop Length'])expect(await fullyVisible(page.getByRole('spinbutton',{name:label,exact:true})),label).toBe(true);
  expect(await fullyVisible(page.getByRole('combobox',{name:'Clip Launch Quantization',exact:true}))).toBe(true);
  expect(await fullyVisible(page.getByRole('group',{name:'Note velocity lane',exact:true}))).toBe(true);
  const card=page.locator('.chain-device').first();for(const label of ['Attack base','Attack effective ownership'])expect(await fullyVisible(card.getByLabel(label,{exact:true})),label).toBe(true);
  expect((await page.locator('#session-workspace').boundingBox()).height).toBeGreaterThanOrEqual(190);
  await page.screenshot({path:testInfo.outputPath(`default-both-${size.width}.png`)});
});

test('compact desktop default shows complete device controls and a useful Session workspace',async({page},testInfo)=>{
  await page.setViewportSize({width:800,height:600});await openSession(page);await page.locator('#detail-devices').click();
  const card=page.locator('.chain-device').first();
  for(const label of ['Attack base','Attack effective ownership'])expect(await card.getByLabel(label,{exact:true}).evaluate(el=>{const r=el.getBoundingClientRect();for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflow+s.overflowY+s.overflowX)&&(r.top<b.top-1||r.bottom>b.bottom+1||r.left<b.left-1||r.right>b.right+1))return false;}return r.top>=0&&r.left>=0&&r.bottom<=innerHeight&&r.right<=innerWidth;}),label).toBe(true);
  expect((await page.locator('#session-workspace').boundingBox()).height).toBeGreaterThanOrEqual(180);
  await page.screenshot({path:testInfo.outputPath('default-both-800.png')});
});

for(const size of [{width:800,height:600},{width:1280,height:800},{width:1440,height:900}])test(`both-open Session keeps Browser results, clip slots and mixer controls visible at ${size.width}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page);await page.locator('#detail-devices').click();
  const visible=locator=>locator.evaluate(el=>{const r=el.getBoundingClientRect();for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflow+s.overflowY+s.overflowX)&&(r.top<b.top-1||r.bottom>b.bottom+1||r.left<b.left-1||r.right>b.right+1))return false;}return r.width>0&&r.height>0&&r.top>=0&&r.left>=0&&r.bottom<=innerHeight&&r.right<=innerWidth;});
  for(const locator of [page.getByRole('treeitem',{name:'Subtractive',exact:true}),page.getByRole('button',{name:'Select Pulse slot 1',exact:true}),page.getByRole('button',{name:'Pulse mute',exact:true}),page.getByRole('button',{name:'Pulse solo',exact:true}),page.locator('#master-session').getByRole('spinbutton',{name:'Master gain',exact:true})])expect(await visible(locator),await locator.getAttribute('aria-label')).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`session-both-${size.width}x${size.height}.png`)});
});

test('Session slot scrolling is synchronized while mixer controls stay pinned',async({page})=>{
  await page.setViewportSize({width:800,height:600});await openSession(page,{trackCount:8});await page.locator('#detail-devices').click();
  const slots=page.locator('.clip-slots'),scene=page.locator('#scene-controls'),mixer=page.getByRole('button',{name:'Pulse mute',exact:true}),before=await mixer.boundingBox();
  expect(await slots.first().evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);await slots.first().hover();await page.mouse.wheel(0,70);await expect.poll(()=>slots.first().evaluate(e=>e.scrollTop)).toBeGreaterThan(0);await expect(slots.first()).toHaveClass(/is-scrolling/);await expect(slots.first()).not.toHaveClass(/is-scrolling/,{timeout:3000});
  const positions=await slots.evaluateAll(es=>es.map(e=>e.scrollTop));expect(new Set(positions).size).toBe(1);expect(await scene.evaluate(e=>e.scrollTop)).toBe(positions[0]);expect(Math.abs((await mixer.boundingBox()).y-before.y)).toBeLessThanOrEqual(1);
  await page.evaluate(()=>{window.sessionSnapshot.document.tracks[1].name='Renamed';window.sessionSnapshot.editRevision++;});await expect(page.getByRole('button',{name:'Select Renamed track',exact:true})).toBeVisible();await expect.poll(()=>slots.nth(1).evaluate(e=>e.scrollTop)).toBe(positions[0]);
  const workspace=page.locator('#session-workspace');expect(await workspace.evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true);expect(await workspace.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);await workspace.hover();await page.mouse.wheel(0,0);await page.keyboard.down('Shift');await page.mouse.wheel(0,250);await page.keyboard.up('Shift');await expect.poll(()=>workspace.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
  const master=await page.locator('.scene-column').boundingBox(),outer=await workspace.boundingBox();expect(Math.abs(master.x+master.width-(outer.x+outer.width))).toBeLessThanOrEqual(2);expect(await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('.scene-column'),{x:master.x+master.width-5,y:master.y+14})).toBe(true);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('track width boundary supports keyboard resizing and narrow controls reflow',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);await page.locator('#detail-devices').click();
  const handle=page.getByRole('separator',{name:'Resize Pulse track',exact:true}),track=page.locator('.track').first();await handle.focus();await handle.press('Home');await expect(handle).toHaveAttribute('aria-valuenow','72');expect((await track.boundingBox()).width).toBe(72);
  const mute=await track.getByRole('button',{name:'Pulse mute'}).boundingBox(),solo=await track.getByRole('button',{name:'Pulse solo'}).boundingBox(),gain=await track.getByRole('spinbutton',{name:'Pulse gain',exact:true}).boundingBox();expect(mute.x+mute.width).toBeLessThanOrEqual(solo.x+1);expect(gain.x+gain.width).toBeLessThanOrEqual((await track.boundingBox()).x+72);
  await handle.press('End');await expect(handle).toHaveAttribute('aria-valuenow','280');await handle.press('Home');expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('track width handle is hover-only and pointer resize is independent',async({page},testInfo)=>{
  await page.setViewportSize({width:800,height:600});await openSession(page,{trackCount:8});await page.locator('#detail-devices').click();
  const handle=page.getByRole('separator',{name:'Resize Pulse track',exact:true}),track=page.locator('.track').first(),other=page.locator('.track').nth(1);await page.mouse.move(700,45);await handle.focus();expect(await handle.evaluate(e=>getComputedStyle(e,'::before').opacity)).toBe('0');
  const box=await handle.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);expect(await handle.evaluate(e=>getComputedStyle(e,'::before').opacity)).toBe('1');await page.mouse.down();await page.mouse.move(box.x-48,box.y+box.height/2,{steps:5});await page.mouse.up();expect((await track.boundingBox()).width).toBeLessThan(90);expect((await other.boundingBox()).width).toBe(128);
  await page.mouse.move(700,45);await page.screenshot({path:testInfo.outputPath('narrow-overflow-800x600.png')});expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});
test('global track width reports inherited values without overwriting individually resized tracks',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);const first=page.getByRole('separator',{name:'Resize Pulse track',exact:true}),second=page.getByRole('separator',{name:'Resize Harmony track',exact:true});
  await first.focus();await first.press('Home');await page.locator('#transport-options-toggle').click();await page.getByRole('slider',{name:'Track column width',exact:true}).fill('160');await expect(first).toHaveAttribute('aria-valuenow','72');await expect(second).toHaveAttribute('aria-valuenow','160');expect((await page.locator('.track').nth(1).boundingBox()).width).toBe(160);
});

for(const size of [{width:800,height:600},{width:1280,height:800},{width:1440,height:900}])test(`Session capture with lower panels hidden at ${size.width}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page,{trackCount:8});await page.locator('#detail-clip').click();await page.locator('#toggle-help').click();await page.screenshot({path:testInfo.outputPath(`session-lower-hidden-${size.width}x${size.height}.png`)});
});

test('MIDI tracks without an instrument do not present invented audio metering or faders',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page,{emptyDevices:true});const track=page.locator('.track').first();
  await expect(track.getByLabel('Pulse stereo peak',{exact:true})).toBeHidden();await expect(track.getByRole('slider',{name:'Pulse gain fader',exact:true})).toBeHidden();await expect(track.getByRole('spinbutton',{name:'Pulse gain',exact:true})).toBeHidden();
  await expect(track.getByText('MIDI only',{exact:true})).toBeVisible();await expect(track.getByRole('button',{name:'Pulse mute',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

for(const size of [{width:800,height:600},{width:1280,height:800},{width:1440,height:900}])test(`corrected panel capture matrix at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page);await page.locator('#detail-devices').click();
  const shot=name=>page.screenshot({path:testInfo.outputPath(`${name}-${size.width}x${size.height}.png`)});
  expect((await page.locator('#session-workspace').boundingBox()).height).toBeGreaterThanOrEqual(180);await shot('both-default');
  await page.locator('#toggle-help').click();await shot('help-hidden');
  await page.locator('#detail-clip').click();await page.locator('#detail-devices').click();await shot('all-lower-hidden');
  await page.locator('#detail-clip').click();await page.locator('#toggle-help').click();const resize=page.getByRole('separator',{name:'Resize detail area',exact:true});await resize.focus();await resize.press('Home');for(let i=0;i<3;i++)await resize.press('Shift+ArrowUp');await shot('clip-short');
  const previous=await resize.getAttribute('aria-valuenow');await page.getByRole('button',{name:'Maximize detail',exact:true}).click();await shot('clip-maximized');
  await page.getByRole('button',{name:'Restore detail size',exact:true}).click();await expect(resize).toHaveAttribute('aria-valuenow',previous);await shot('clip-restored');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('narrow Browser stays above contextual Help when reopened',async({page},testInfo)=>{
  await page.setViewportSize({width:600,height:600});await openSession(page);
  const browser=page.locator('#workspace-browser'),help=page.locator('#info-view');
  const shell=await page.locator('#workspace-shell').boundingBox(),b=await browser.boundingBox(),h=await help.boundingBox();
  expect(Math.abs(b.y-shell.y)).toBeLessThanOrEqual(1);expect(b.y+b.height).toBeLessThanOrEqual(h.y+1);
  expect(await help.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  await page.screenshot({path:testInfo.outputPath('after-narrow-browser.png')});
  await page.locator('#toggle-browser').click();await expect(browser).toBeHidden();await page.locator('#toggle-browser').click();await expect(browser).toBeVisible();
  await page.locator('#toggle-help').click();await expect(help).toBeHidden();await page.locator('#toggle-help').click();await expect(help).toBeVisible();
  expect(await help.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
});

test('Clip and Device footer toggles independently own the lower rows',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const clip=page.locator('#clip-detail'),device=page.locator('#device-detail'),help=page.locator('#info-view');
  const clipToggle=page.getByRole('button',{name:'Toggle Clip view',exact:true}),deviceToggle=page.getByRole('button',{name:'Toggle Device view',exact:true});
  expect(await page.locator('#clip-overview svg rect').count()).toBeGreaterThan(0);
  await expect(clip).toBeVisible();await deviceToggle.click();await expect(clip).toBeVisible();await expect(device).toBeVisible();
  const c=await clip.boundingBox(),d=await device.boundingBox(),h=await help.boundingBox();
  expect(c.x).toBeLessThanOrEqual(1);expect(c.y+c.height).toBeLessThanOrEqual(Math.min(d.y,h.y)+1);expect(h.x+h.width).toBeLessThanOrEqual(d.x+1);
  await clipToggle.click();await expect(clip).toBeHidden();await expect(device).toBeVisible();
  await deviceToggle.click();await expect(device).toBeHidden();await clipToggle.click();await expect(clip).toBeVisible();
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('Clip properties arrange horizontally when short and as vertical disclosures when tall',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const resize=page.getByRole('separator',{name:'Resize detail area',exact:true}),properties=page.locator('.clip-properties');
  await resize.focus();await resize.press('Home');
  await expect(properties).toBeVisible();expect(await properties.evaluate(el=>getComputedStyle(el).display)).toBe('flex');
  await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  expect(await properties.evaluate(el=>getComputedStyle(el).display)).toBe('block');
  await expect(properties.locator('details > summary').first()).toBeVisible();
});

test('Clip property divider resizes without issuing musical commands',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const divider=page.getByRole('separator',{name:'Resize Clip properties',exact:true}),properties=page.locator('.clip-properties');
  const before=(await properties.boundingBox()).width;await divider.focus();await divider.press('End');
  expect((await properties.boundingBox()).width).toBeGreaterThan(before);await divider.press('Home');
  expect((await properties.boundingBox()).width).toBeLessThan(before);
  const original=(await properties.boundingBox()).width,box=await divider.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+80,box.y+box.height/2);await page.keyboard.press('Escape');await page.mouse.up();
  expect(Math.abs((await properties.boundingBox()).width-original)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('returning from Master restores an entirely hidden detail state',async({page})=>{
  await openSession(page);await page.locator('#detail-clip').click();
  await page.locator('#master-select-session').click();await expect(page.locator('#master-detail')).toBeVisible();
  await page.getByRole('button',{name:'Select Pulse track',exact:true}).click();
  await expect(page.locator('#clip-detail')).toBeHidden();await expect(page.locator('#device-detail')).toBeHidden();
  await expect(page.locator('#workspace-shell')).toHaveClass(/detail-collapsed/);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('footer reopening after collapsing both panels opens only the requested panel',async({page})=>{
  await openSession(page);await page.locator('#detail-devices').click();await page.locator('#toggle-detail').click();
  await expect(page.locator('#clip-detail')).toBeHidden();await expect(page.locator('#device-detail')).toBeHidden();
  await page.locator('#detail-clip').click();await expect(page.locator('#clip-detail')).toBeVisible();await expect(page.locator('#device-detail')).toBeHidden();
  await page.locator('#master-select-session').click();await page.locator('#detail-clip').click();await expect(page.locator('#clip-detail')).toBeVisible();await expect(page.locator('#master-detail')).toBeHidden();
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('footer actions remain reachable at the minimum native size',async({page})=>{
  await page.setViewportSize({width:800,height:600});await openSession(page);
  for(const selector of ['#toggle-help','#detail-clip','#detail-devices','#return-all','#show-audio','#audio-details > summary'])await expect(page.locator(selector)).toBeInViewport({ratio:1});
});

test('both detail panels resize and maximize while a device draft survives hiding',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);await page.locator('#detail-devices').click();
  const clip=page.locator('#clip-detail'),device=page.locator('#device-detail'),resize=page.getByRole('separator',{name:'Resize detail area',exact:true});
  const field=page.locator('.chain-device[data-instance-id="instrument-0"]').getByRole('spinbutton',{name:'Cutoff base',exact:true});
  await field.fill('1717');await page.locator('#detail-devices').click();await expect(device).toBeHidden();await page.locator('#detail-devices').click();await expect(field).toHaveValue('1717');
  const box=await resize.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y-50,{steps:4});await page.mouse.up();const height=await resize.getAttribute('aria-valuenow');
  await page.getByRole('button',{name:'Maximize detail',exact:true}).click();await expect(clip).toBeVisible();await expect(device).toBeVisible();
  await page.getByRole('button',{name:'Restore detail size',exact:true}).click();await expect(resize).toHaveAttribute('aria-valuenow',height);await expect(field).toHaveValue('1717');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

for(const size of [{width:800,height:600},{width:1280,height:800},{width:1440,height:900}])test(`all lower panel combinations preserve selection at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page);
  const clip=page.locator('#clip-detail'),device=page.locator('#device-detail'),help=page.locator('#info-view');
  const buttons=[page.locator('#detail-clip'),page.locator('#detail-devices'),page.locator('#toggle-help')];
  const initial=await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document));
  let state=[true,false,true];
  for(const index of [1,2,0,2,1,2,0,1,2,0,1]){
    await buttons[index].click();state[index]=!state[index];
    for(const [element,on] of [[clip,state[0]],[device,state[1]],[help,state[2]]])if(on)await expect(element).toBeVisible();else await expect(element).toBeHidden();
    if(state[0]&&state[1]&&state[2]){const c=await clip.boundingBox(),d=await device.boundingBox(),h=await help.boundingBox();expect(c.height).toBeGreaterThan(100);expect(d.height).toBeGreaterThanOrEqual(100);expect(c.y+c.height).toBeLessThanOrEqual(Math.min(d.y,h.y)+1);expect(h.x+h.width).toBeLessThanOrEqual(d.x+1);await page.screenshot({path:testInfo.outputPath(`both-panels-${size.width}x${size.height}.png`)});}
  }
  expect(await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document))).toBe(initial);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('contextual Help is a separate passive panel with independent visibility',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const help=page.getByRole('complementary',{name:'Contextual help',exact:true});
  const toggle=page.getByRole('button',{name:'Toggle contextual help',exact:true});
  const initial=await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document));
  const box=await help.boundingBox(),footer=await page.locator('footer').boundingBox();
  expect(box.x).toBeLessThanOrEqual(12);expect(box.height).toBeGreaterThan(80);expect(box.y+box.height).toBeLessThanOrEqual(footer.y+1);
  await page.locator('#stop').hover();await expect(page.locator('#info-text')).toContainText('Stop transport');
  await page.locator('#start').focus();await expect(page.locator('#info-text')).toContainText('Start transport');
  await toggle.click();await expect(help).toBeHidden();await expect(toggle).toHaveAttribute('aria-expanded','false');
  await page.keyboard.press('?');await expect(help).toBeVisible();await page.keyboard.press('?');await expect(help).toBeHidden();
  const field=page.getByRole('searchbox',{name:'Search browser'});await field.fill('draft');await field.press('?');
  await expect(field).toHaveValue('draft?');await expect(help).toBeHidden();
  await page.evaluate(()=>{const el=document.createElement('div');el.contentEditable='true';el.id='test-editable';document.body.append(el);el.focus();});
  await page.keyboard.press('?');await expect(help).toBeHidden();await expect(page.locator('#test-editable')).toHaveText('?');
  await page.locator('#start').focus();await page.keyboard.press('?');await expect(help).toBeVisible();await expect(page.locator('#start')).toBeFocused();
  const tempo=page.locator('#tempo');await tempo.fill('133');await toggle.click();await expect(tempo).toBeFocused();await expect(tempo).toHaveValue('133');await expect(help).toBeHidden();
  await toggle.click();await expect(tempo).toBeFocused();await expect(tempo).toHaveValue('133');await expect(help).toBeVisible();
  expect(await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document))).toBe(initial);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

for(const size of [{width:800,height:600},{width:1280,height:800},{width:1440,height:900}])test(`Help panel visibility and layout at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page);
  const help=page.getByRole('complementary',{name:'Contextual help',exact:true}),detail=page.locator('#detail-panel');
  const toggle=page.getByRole('button',{name:'Toggle contextual help',exact:true});
  const before=await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document));
  const a=await help.boundingBox(),b=await page.locator('#clip-detail').boundingBox();expect(a.x).toBeLessThanOrEqual(1);expect(b.y+b.height).toBeLessThanOrEqual(a.y+1);
  await page.screenshot({path:testInfo.outputPath(`help-shown-${size.width}x${size.height}.png`)});
  await toggle.click();await expect(help).toBeHidden();
  await page.screenshot({path:testInfo.outputPath(`help-hidden-${size.width}x${size.height}.png`)});
  await page.locator('#toggle-browser').click();expect((await detail.boundingBox()).x).toBeLessThanOrEqual(1);await page.locator('#toggle-detail').click();await toggle.click();
  await expect(help).toBeVisible();await expect(page.locator('#workspace-browser')).toBeHidden();await expect(page.locator('#clip-detail')).toBeHidden();await expect(page.locator('#device-detail')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  expect(await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document))).toBe(before);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

for(const size of [{width:800,height:600},{width:1280,height:800}])test(`Alive chrome preserves Live-inspired regions and contextual Info at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page);
  const baseline=await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document));
  const info=page.getByRole('complementary',{name:'Contextual help',exact:true});
  const box=await info.boundingBox(),footer=await page.locator('footer').boundingBox();
  expect(box.x).toBeLessThanOrEqual(12);
  expect(Math.abs(box.y+box.height-footer.y)).toBeLessThanOrEqual(2);
  await page.locator('#stop').hover();
  await expect(page.locator('#info-text')).toContainText('Stop transport');
  const file=page.locator('#file-menu');
  await expect(page.locator('#new')).toBeHidden();
  await file.locator('summary').click();
  await expect(page.locator('#new')).toBeVisible();
  await page.locator('#workspace-browser > h2').click();
  await expect(page.locator('#new')).toBeHidden();
  const add=page.locator('#browser-add-menu');
  await expect(page.locator('#insert-audio-track')).toBeHidden();
  await add.locator('summary').click();
  await expect(page.locator('#insert-audio-track')).toBeVisible();
  await page.locator('#workspace-browser > h2').click();
  await expect(page.locator('#insert-audio-track')).toBeHidden();
  await page.locator('#view-arrangement').click();
  await expect(info).toBeVisible();
  await page.locator('#toggle-browser').click();
  await expect(info).toBeVisible();
  expect(await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document))).toBe(baseline);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await page.screenshot({path:testInfo.outputPath(`alive-chrome-${size.width}x${size.height}.png`)});
});

for(const size of [{width:800,height:600},{width:1280,height:800}])test(`saved Alive surface retains focused draft and natural scroll at ${size.width}x${size.height}`,async({page},info)=>{
  await page.setViewportSize(size);await openSession(page);await page.locator('#detail-devices').click();
  const card=page.locator('.chain-device').first(),surface=card.locator('.presentation-surface'),field=card.getByRole('spinbutton',{name:'Attack base',exact:true});
  await field.fill('123');await expect(field).toBeFocused();await card.getByLabel('Attack effective ownership',{exact:true}).scrollIntoViewIfNeeded();await expect(card.getByLabel('Attack effective ownership',{exact:true})).toBeInViewport({ratio:1});expect(await surface.evaluate(e=>e.offsetWidth)).toBe(640);
  await page.screenshot({path:info.outputPath(`saved-alive-${size.width}x${size.height}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  const chain=page.locator('#chain');expect(await chain.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
  await page.locator('#detail-devices').click();await page.locator('#detail-devices').click();await expect(field).toHaveValue('123');
});

for(const size of [{width:1440,height:900},{width:1280,height:800},{width:800,height:600}])test(`detail expands and maximizes the piano editor at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page);
  const resize=page.getByRole('separator',{name:'Resize detail area',exact:true}),panel=page.locator('#detail-panel');
  const visiblePiano=()=>page.evaluate(()=>{const piano=document.querySelector('#piano-roll').getBoundingClientRect(),clip=document.querySelector('#clip-detail').getBoundingClientRect();return Math.max(0,Math.min(piano.bottom,clip.bottom)-Math.max(piano.top,clip.top));});
  const originalPiano=await page.locator('#piano-roll').boundingBox(),originalVisible=await visiblePiano(),originalHeight=Number(await resize.getAttribute('aria-valuenow'));await resize.focus();await resize.press('End');
  expect(Number(await resize.getAttribute('aria-valuenow'))).toBeGreaterThan(originalHeight);
  const previous=await resize.getAttribute('aria-valuenow');await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  await expect(page.locator('#session-workspace')).toBeHidden();await expect(page.locator('#arrangement-workspace')).toBeHidden();
  expect((await panel.boundingBox()).height).toBeGreaterThan(size.height*.75);
  if(size.height>=800)expect((await page.locator('#piano-roll').boundingBox()).height).toBeGreaterThan(originalPiano.height+30);
  else expect(await visiblePiano()).toBeGreaterThan(originalVisible+30);
  await expect(page.locator('#stop')).toBeInViewport();await expect(page.locator('#show-audio')).toBeInViewport();
  await expect(page.getByRole('button',{name:'Restore detail size',exact:true})).toBeInViewport();
  const velocity=page.getByRole('group',{name:'Note velocity lane',exact:true});
  if(size.height>=800)await expect(velocity).toBeInViewport({ratio:1});
  else{await velocity.scrollIntoViewIfNeeded();await expect(velocity).toBeInViewport({ratio:1});}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`maximized-detail-${size.width}x${size.height}.png`)});
  await page.setViewportSize({width:1024,height:768});await page.setViewportSize(size);
  await page.getByRole('button',{name:'Restore detail size',exact:true}).click();
  await expect(resize).toHaveAttribute('aria-valuenow',previous);await expect(page.locator('#session-workspace')).toBeVisible();
  await page.getByRole('button',{name:'Toggle detail',exact:true}).click();
  await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  const panelBounds=await panel.boundingBox(),workspaceBounds=await page.locator('#workspace-shell').boundingBox();
  expect(panelBounds.y+panelBounds.height).toBeLessThanOrEqual(workspaceBounds.y+workspaceBounds.height);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('maximized Arrangement keeps source actions available without covering the editor',async({page})=>{
  await page.setViewportSize({width:800,height:600});await openSession(page);
  await page.getByRole('button',{name:'Arrangement workspace',exact:true}).click();
  await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  const controls=page.locator('#clip-controls');
  await expect(page.locator('.clip-source-actions')).not.toHaveAttribute('open');
  expect(await controls.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('.clip-source-actions > summary').click();
  const action=page.getByRole('button',{name:'Delete clip',exact:true});expect(await action.boundingBox()).not.toBeNull();await action.scrollIntoViewIfNeeded();await expect(action).toBeInViewport({ratio:1});
  await page.locator('.clip-source-actions > summary').click();
  await page.getByRole('button',{name:'Restore detail size',exact:true}).click();await expect(page.locator('.clip-source-actions')).not.toHaveAttribute('open');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('Devices and Master share detail maximization without changing musical state',async({page})=>{
  await page.setViewportSize({width:800,height:600});await openSession(page);
  for(const [button,content] of [['#detail-devices','#device-detail'],['#master-select-session','#master-detail']]){
    await page.locator(button).click();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
    await expect(page.locator(content)).toBeVisible();expect((await page.locator('#detail-panel').boundingBox()).height).toBeGreaterThan(450);
    await expect(page.locator('#stop')).toBeInViewport();await expect(page.locator('#show-audio')).toBeInViewport();
    await page.getByRole('button',{name:'Restore detail size',exact:true}).click();await expect(page.locator('#session-workspace')).toBeVisible();
  }
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('detail drag cancellation and maximize preserve an unfinished upper mixer field',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const separator=page.getByRole('separator',{name:'Resize detail area',exact:true}),before=await separator.getAttribute('aria-valuenow');
  const box=await separator.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y-100,{steps:4});
  expect(Number(await separator.getAttribute('aria-valuenow'))).toBeGreaterThan(Number(before));
  await page.keyboard.press('Escape');await page.mouse.up();await expect(separator).toHaveAttribute('aria-valuenow',before);
  const gain=page.getByLabel('Pulse gain',{exact:true});await gain.fill('1.234');
  await page.getByRole('button',{name:'Maximize detail',exact:true}).click();await expect(page.locator('#session-workspace')).toBeHidden();
  await page.getByRole('button',{name:'Restore detail size',exact:true}).click();await expect(gain).toHaveValue('1.234');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});


test('musical toolbar and open session adapt to live window resizing without issuing commands',async({page},testInfo)=>{
  await openSession(page,{trackCount:8});
  const score=await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document));
  for(const size of [{width:1920,height:1080},{width:1440,height:900},{width:1280,height:800},{width:1024,height:768},{width:800,height:600}]){
    await page.setViewportSize(size);
    await expect(page.locator('#stop')).toBeInViewport();
    await expect(page.locator('#master-select-session')).toBeInViewport();
    const bounds=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,toolbar:document.querySelector('.transport').getBoundingClientRect().bottom,stop:document.querySelector('#stop').getBoundingClientRect().toJSON()}));
    expect(bounds.width).toBeLessThanOrEqual(size.width);
    expect(bounds.height).toBeLessThanOrEqual(size.height);
    expect(bounds.toolbar).toBeLessThanOrEqual(80);
    await page.screenshot({path:testInfo.outputPath(`responsive-${size.width}x${size.height}.png`)});
  }
  expect(await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document))).toBe(score);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('transport options retain precise controls without crowding the musical toolbar',async({page})=>{
  await page.setViewportSize({width:800,height:600});await openSession(page);
  await expect(page.locator('#position')).toHaveText('1.1.1');
  await expect(page.locator('#position-beats')).toHaveText('0.000 beats');
  await expect(page.locator('#seek')).toBeHidden();
  await page.getByRole('button',{name:'Transport and view options',exact:true}).click();
  await expect(page.locator('#seek')).toBeVisible();
  await expect(page.locator('#length')).toBeVisible();
  await page.locator('#seek').fill('3.25');
  await page.keyboard.press('Escape');
  await expect(page.locator('#seek')).toBeHidden();
  await expect(page.locator('#stop')).toBeInViewport();
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('Arrangement resizing keeps transport and Master usable with a wide browser',async({page},testInfo)=>{
  await page.setViewportSize({width:1440,height:900});await openSession(page);
  const separator=page.getByRole('separator',{name:'Resize browser'});await separator.focus();await separator.press('End');
  await page.locator('#view-arrangement').click();
  for(const size of [{width:1440,height:900},{width:1024,height:768},{width:800,height:600}]){
    await page.setViewportSize(size);await expect(page.locator('#stop')).toBeInViewport();
    await expect(page.locator('#master-select-arrangement')).toBeInViewport();
    await expect(page.locator('#master-arrangement').getByLabel('Master gain',{exact:true})).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`arrangement-responsive-${size.width}x${size.height}.png`)});
  }
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('expanded audio diagnostics keep their summary anchored as active identifiers change',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const details=page.locator('#audio-details'),summary=details.locator(':scope>summary');
  await summary.click();const before=await summary.boundingBox();
  await page.evaluate(()=>{window.sessionSnapshot.runtime.tracks[0].activeSourceId='source-with-a-long-stable-identity-'.repeat(5);window.sessionSnapshot.runtime.tracks[0].activePlacementId='placement-with-a-long-stable-identity-'.repeat(5);});
  await expect(page.getByLabel('Track 1 active source',{exact:true})).toContainText('source-with-a-long');
  const after=await summary.boundingBox();expect(after.y).toBe(before.y);
  await page.setViewportSize({width:800,height:600});await expect(summary).toBeInViewport();
  await summary.click();await expect(details).not.toHaveAttribute('open');
});

test('browser search and keyboard selection never launch or change the score',async({page},testInfo)=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const before=await page.evaluate(()=>JSON.stringify(window.sessionSnapshot));
  await page.getByRole('button',{name:'Browse Project Clips',exact:true}).click();
  const option=page.getByRole('treeitem',{name:'Clip 1',exact:true}).first();await option.click();
  await page.getByRole('tree',{name:'Browser results'}).press('ArrowDown');
  expect(await page.evaluate(()=>JSON.stringify(window.sessionSnapshot))).toBe(before);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await page.getByRole('button',{name:'Open Clip',exact:true}).click();
  await expect(page.locator('#clip-title')).toHaveText('Harmony / Clip 1');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  const search=page.getByRole('searchbox',{name:'Search browser'});await search.fill('no-matching-device');
  await expect(page.locator('.browser-empty')).toHaveText('No results. Try another search.');
  await search.press('Escape');await expect(search).toHaveValue('');
  await page.screenshot({path:testInfo.outputPath('browser-project-clips.png')});
});

for(const size of [{width:800,height:600},{width:1280,height:800}])test(`catalog availability paging and Refresh Library fit ${size.width}x${size.height}`,async({page})=>{
  await page.setViewportSize(size);await openSession(page);
  const before=await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document));
  await page.evaluate(()=>{
    window.catalogRequests=[];let revision=1;
    const entry=(overrides={})=>({id:'user:saved',provider:'user',name:'Saved Synth',kind:'instrument',path:'/saved/synth.ultra',profile:null,qualification:'qualified',availability:'ready',reason:null,description:'User library',dependencies:[],...overrides});
    window.catalogRequest=request=>{
      window.catalogRequests.push(request);if(!request.cursor)revision++;
      return request.cursor?{revision:String(revision),entries:[entry({id:'live:analog',provider:'live',name:'Analog',path:null,qualification:'candidate',availability:'unavailable',reason:'Save a qualified Analog device before loading it.',description:'Installed Live device candidate'}),entry({id:'live:chord',provider:'live',name:'Chord',kind:'midiEffect',path:null,qualification:'unsupported',availability:'unavailable',reason:'MIDI device hosting is not available.'})],nextCursor:null,notices:['User library discovery reached its depth bound.']}:
        {revision:String(revision),entries:[entry()],nextCursor:{revision:String(revision),offset:64},notices:[]};
    };
  });
  const tempo=page.locator('#tempo');await tempo.fill('133');
  const refresh=page.getByRole('button',{name:'Refresh Library',exact:true});await refresh.click();await expect(tempo).toHaveValue('133');
  await expect(page.getByRole('treeitem',{name:'Analog',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.catalogRequests)).toEqual([{refresh:true,cursor:null},{refresh:false,cursor:{revision:'2',offset:64}}]);
  await page.getByRole('button',{name:'Browse MIDI Effects',exact:true}).click();await expect(page.getByRole('treeitem',{name:'Chord',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Browse Instruments',exact:true}).click();
  const search=page.getByRole('searchbox',{name:'Search browser'});await search.fill('Analog');
  const analog=page.getByRole('treeitem',{name:'Analog',exact:true});await analog.click();
  await expect(analog).toHaveAttribute('draggable','false');await expect(page.locator('.browser-description')).toContainText('Save a qualified Analog');await expect(page.locator('.browser-load')).toBeDisabled();
  await page.getByRole('tree',{name:'Browser results'}).press('Enter');await analog.dblclick();
  const dataTransfer=await page.evaluateHandle(()=>new DataTransfer());await analog.dispatchEvent('dragstart',{dataTransfer});await page.locator('.track').first().dispatchEvent('drop',{dataTransfer});
  expect(await dataTransfer.evaluate(data=>data.types.length)).toBe(0);await dataTransfer.dispose();
  await refresh.click();await expect(analog).toHaveAttribute('aria-selected','true');await expect(page.locator('.browser-status')).toContainText('depth bound');await expect(tempo).toHaveValue('133');
  await expect(search).toBeInViewport({ratio:1});await expect(refresh).toBeInViewport({ratio:1});await expect(page.locator('.browser-description')).toBeInViewport({ratio:1});await expect(page.locator('.browser-load')).toBeInViewport({ratio:1});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  expect(await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document))).toBe(before);expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  mkdirSync('/tmp/alive-device-catalog-ui-20261031',{recursive:true});await page.screenshot({path:`/tmp/alive-device-catalog-ui-20261031/catalog-${size.width}x${size.height}.png`});
});

for(const size of [{width:800,height:600},{width:1280,height:800}])test(`unfiltered catalog clips long results and keeps footer hit targets at ${size.width}x${size.height}`,async({page})=>{
  await page.setViewportSize(size);await openSession(page);
  await page.evaluate(()=>{
    const entries=Array.from({length:96},(_,index)=>({id:`live:long-${index}`,provider:'live',name:`Catalog candidate ${String(index).padStart(2,'0')}`,kind:'instrument',path:null,profile:null,qualification:'candidate',availability:'unavailable',reason:'Save a qualified device before loading this installed candidate.',description:'Installed device candidate',dependencies:[]}));
    window.catalogRequest=({cursor})=>({revision:'long-list',entries:entries.slice(cursor?.offset??0,(cursor?.offset??0)+64),nextCursor:cursor?null:{revision:'long-list',offset:64},notices:['Candidate discovery requires saved devices.']});
  });
  await page.getByRole('button',{name:'Refresh Library',exact:true}).click();
  const first=page.getByRole('treeitem',{name:'Catalog candidate 00',exact:true}),last=page.getByRole('treeitem',{name:'Catalog candidate 95',exact:true});
  await expect(last).toHaveCount(1);await first.click();
  const geometry=()=>page.evaluate(()=>{
    const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};},list=document.querySelector('.browser-list');
    const footers=['.browser-description','.browser-load','.browser-status'].map(selector=>{
      const element=document.querySelector(selector),r=element.getBoundingClientRect(),samples=[.2,.5,.8].map(fraction=>{
        const stack=document.elementsFromPoint(r.x+r.width*fraction,r.y+r.height/2);
        return{owned:element.contains(stack[0]),rows:stack.filter(hit=>hit.closest('.browser-result')).length};
      });return{selector,samples};
    });return{body:box('.browser-body'),results:box('.browser-results'),list:box('.browser-list'),selection:box('.browser-selection'),scrollHeight:list.scrollHeight,clientHeight:list.clientHeight,scrollTop:list.scrollTop,footers};
  });
  mkdirSync('/tmp/alive-device-catalog-ui-20261031',{recursive:true});
  const initial=await geometry();await page.screenshot({path:`/tmp/alive-device-catalog-ui-20261031/unfiltered-initial-${size.width}x${size.height}.png`});
  expect(initial.results.bottom,JSON.stringify(initial)).toBeLessThanOrEqual(initial.body.bottom+1);expect(initial.list.bottom).toBeLessThanOrEqual(initial.selection.y+1);
  expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight*2);
  for(const footer of initial.footers)for(const sample of footer.samples){expect(sample.owned,footer.selector).toBe(true);expect(sample.rows,footer.selector).toBe(0);}
  await last.scrollIntoViewIfNeeded();await last.click();await expect(last).toHaveAttribute('aria-selected','true');await expect(last).toBeInViewport({ratio:1});
  const scrolled=await geometry();expect(scrolled.scrollTop).toBeGreaterThan(0);
  for(const footer of scrolled.footers)for(const sample of footer.samples){expect(sample.owned,footer.selector).toBe(true);expect(sample.rows,footer.selector).toBe(0);}
  await page.locator('.browser-description').click();await page.locator('.browser-status').click();await expect(last).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.browser-description')).toContainText('Save a qualified device');await expect(page.locator('.browser-load')).toBeDisabled();
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await page.screenshot({path:`/tmp/alive-device-catalog-ui-20261031/unfiltered-scrolled-${size.width}x${size.height}.png`});
});

test('browser device double-click requests one validated load and reports native refusal',async({page})=>{
  await openSession(page);
  await page.evaluate(()=>{window.sessionSnapshot.document.tracks[0].chain.instrument=null;window.sessionSnapshot.document.sources[0].automation=[];});
  await page.locator('#detail-devices').click();
  await expect(page.getByRole('button',{name:'Load instrument',exact:true})).toHaveCount(1);
  await page.getByRole('treeitem',{name:'Subtractive',exact:true}).click();
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await page.evaluate(()=>{window.browserLoadError='Device capacity reached';});
  await page.getByRole('treeitem',{name:'Subtractive',exact:true}).dblclick();
  await expect(page.locator('.browser-status')).toContainText('Device capacity reached');
  const calls=await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'));
  expect(calls).toHaveLength(1);expect(calls[0]).toMatchObject({name:'alive_device',args:{action:'load',path:'../../ultra/examples/subtractive.ultra',generation:1,editRevision:0}});
  await expect(page.locator('.track')).toHaveCount(2);await expect(page.locator('#start')).toBeEnabled();
});

for(const selected of ['audio','occupied MIDI'])for(const refusal of ['Open device: file is missing','Invalid saved Ultra JSON','Alive does not admit native-source profiles'])test(`automatic instrument activation from ${selected} retains accepted state after ${refusal}`,async({page})=>{
  await openSession(page,{audioTrack:selected==='audio'});
  if(selected==='audio')await page.getByRole('button',{name:'Select Harmony track',exact:true}).click();
  await page.evaluate(()=>{
    window.catalogRequest=()=>({revision:'cached-user',entries:[{id:'user:cached',provider:'user',name:'Cached User Synth',kind:'instrument',path:'/owned/library/cached.ultra',profile:null,qualification:'qualified',availability:'ready',reason:null,description:'Saved user instrument',dependencies:[]}],nextCursor:null,notices:[]});
  });
  await page.getByRole('button',{name:'Refresh Library',exact:true}).click();
  const device=page.getByRole('treeitem',{name:'Cached User Synth',exact:true});await device.click();
  await page.locator('#detail-devices').click();
  const before=await page.evaluate(()=>({document:window.sessionSnapshot.document,generation:window.sessionSnapshot.generation,editRevision:window.sessionSnapshot.editRevision,dirty:window.sessionSnapshot.dirty,history:window.sessionSnapshot.history}));
  const chain=await page.locator('#chain-title').textContent(),card=await page.locator('.chain-select[aria-pressed="true"]').evaluateAll(elements=>elements[0]?.getAttribute('aria-label')??null);
  await page.evaluate(error=>{window.browserLoadError=error;},refusal);
  await device.dblclick();await expect(page.locator('.browser-status')).toContainText(refusal);
  expect(await page.evaluate(()=>({document:window.sessionSnapshot.document,generation:window.sessionSnapshot.generation,editRevision:window.sessionSnapshot.editRevision,dirty:window.sessionSnapshot.dirty,history:window.sessionSnapshot.history}))).toEqual(before);
  await expect(page.locator('.track')).toHaveCount(2);await expect(page.locator('#chain-title')).toHaveText(chain);
  if(card)await expect(page.locator('.chain-select[aria-pressed="true"]')).toHaveAttribute('aria-label',card);
  await expect(device).toHaveAttribute('aria-selected','true');
  expect(await page.evaluate(()=>window.calls.filter(c=>['alive_device','alive_workspace_track'].includes(c.name)))).toEqual([{name:'alive_device',args:{trackId:selected==='audio'?'track-2':'track-1',instanceId:null,action:'loadNewTrack',path:'/owned/library/cached.ultra',generation:1,editRevision:0}}]);
});

for(const selected of ['audio','occupied MIDI'])test(`automatic instrument activation from ${selected} commits one track with compound Undo and Redo`,async({page})=>{
  await openSession(page,{audioTrack:selected==='audio'});
  if(selected==='audio')await page.getByRole('button',{name:'Select Harmony track',exact:true}).click();
  const before=await page.evaluate(()=>structuredClone(window.sessionSnapshot.document));
  await page.getByRole('treeitem',{name:'Subtractive',exact:true}).dblclick();
  await expect(page.locator('.track')).toHaveCount(3);
  expect(await page.evaluate(()=>window.calls.filter(c=>['alive_device','alive_workspace_track'].includes(c.name)).map(c=>({name:c.name,action:c.args.action,trackId:c.args.trackId})))).toEqual([{name:'alive_device',action:'loadNewTrack',trackId:selected==='audio'?'track-2':'track-1'}]);
  const loaded=await page.evaluate(()=>structuredClone(window.sessionSnapshot.document));
  const created=loaded.tracks.find(t=>!before.tracks.some(old=>old.id===t.id));expect(created.chain.instrument).toBeTruthy();
  await expect(page.locator('#chain-title')).toHaveText(`${created.name} chain`);await expect(page.locator('.chain-device')).toHaveCount(1);
  await page.locator('#undo').click();await expect(page.locator('.track')).toHaveCount(2);
  expect(await page.evaluate(()=>window.sessionSnapshot.document)).toEqual(before);
  await page.locator('#redo').click();await expect(page.locator('.track')).toHaveCount(3);
  expect(await page.evaluate(()=>window.sessionSnapshot.document)).toEqual(loaded);
});

test('fresh MIDI tracks expose the library immediately and accept a browser instrument on the dropped-on track',async({page})=>{
  await openSession(page,{emptyDevices:true});
  const device=page.getByRole('treeitem',{name:'Subtractive',exact:true});await expect(device).toBeVisible();
  await device.click();await expect(page.getByRole('button',{name:'Load Instrument',exact:true})).toBeEnabled();
  await device.dragTo(page.locator('.track[data-track-id="track-2"] .track-name'));
  await expect(page.locator('#chain-title')).toHaveText('Harmony chain');await expect(page.locator('#device-detail')).toBeVisible();
  const calls=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_device'));
  expect(calls).toHaveLength(1);expect(calls[0].args).toMatchObject({trackId:'track-2',action:'load',path:'../../ultra/examples/subtractive.ultra'});
  expect(await page.evaluate(()=>window.sessionSnapshot.document.tracks.map(t=>!!t.chain.instrument))).toEqual([false,true]);
  await expect(page.locator('.track')).toHaveCount(2);
});

test('instrument drop replaces the MIDI instrument in place and retains its effects',async({page})=>{
  await openSession(page);await page.getByRole('treeitem',{name:'Subtractive',exact:true}).dragTo(page.locator('.track[data-track-id="track-1"]'));
  await expect(page.locator('#device-detail')).toBeVisible();
  expect(await page.evaluate(()=>window.calls.find(c=>c.name==='alive_device').args)).toMatchObject({trackId:'track-1',instanceId:'instrument-0',action:'replace'});
  expect(await page.evaluate(()=>window.sessionSnapshot.document.tracks[0].effects.map(e=>e.instanceId))).toEqual(['utility','stereo-lowpass']);
  await expect(page.locator('.track')).toHaveCount(2);
});

test('effects drop onto another track then insert before its first effect in serial order',async({page})=>{
  await openSession(page,{audioTrack:true});
  await page.getByRole('treeitem',{name:'Stereo Utility',exact:true}).dragTo(page.locator('.track[data-track-id="track-2"]'));
  await expect(page.locator('#chain-title')).toHaveText('Harmony chain');await expect(page.locator('.chain-device')).toHaveCount(1);
  const first=page.locator('.chain-device .chain-select').first();
  await page.getByRole('treeitem',{name:'Stereo Lowpass',exact:true}).dragTo(first,{targetPosition:{x:30,y:2}});
  await expect(page.locator('.chain-device')).toHaveCount(2);
  const calls=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_device').map(c=>c.args));
  expect(calls).toHaveLength(2);expect(calls[0]).toMatchObject({trackId:'track-2',action:'add',path:'utility.ultra'});
  expect(calls[1]).toMatchObject({trackId:'track-2',action:'add',path:'stereo-lowpass.ultra',beforeInstanceId:'dropped-0'});
  expect(await page.evaluate(()=>window.sessionSnapshot.document.tracks[1].effects.map(e=>e.path))).toEqual(['stereo-lowpass.ultra','utility.ultra']);
});

test('empty device chain accepts an instrument and successive effects at its tail',async({page})=>{
  await openSession(page,{emptyDevices:true});await page.locator('#detail-devices').click();
  await page.getByRole('treeitem',{name:'Subtractive',exact:true}).dragTo(page.locator('.chain-drop-tail'));
  await expect(page.locator('.chain-device')).toHaveCount(1);
  for(const name of ['Stereo Utility','Stereo Lowpass'])await page.getByRole('treeitem',{name,exact:true}).dragTo(page.locator('.chain-drop-tail'));
  await expect(page.locator('.chain-device')).toHaveCount(3);
  expect(await page.evaluate(()=>window.sessionSnapshot.document.tracks[0].effects.map(e=>e.path))).toEqual(['utility.ultra','stereo-lowpass.ultra']);
});

test('device drops remain reachable at the minimum window size',async({page})=>{
  await page.setViewportSize({width:800,height:600});await openSession(page,{emptyDevices:true});
  await page.getByRole('treeitem',{name:'Subtractive',exact:true}).dragTo(page.locator('.track[data-track-id="track-1"] .track-name'));
  await expect(page.locator('#device-detail')).toBeVisible();
  await page.getByRole('treeitem',{name:'Stereo Utility',exact:true}).dragTo(page.locator('.chain-drop-tail'));
  await expect(page.locator('.chain-device')).toHaveCount(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});

test('device drops reject audio instruments, full chains and playing transport visibly',async({page})=>{
  await openSession(page,{audioTrack:true});
  await page.getByRole('treeitem',{name:'Subtractive',exact:true}).dragTo(page.locator('.track[data-track-id="track-2"]'));
  await expect(page.locator('#notice')).toContainText('MIDI track');
  await page.getByRole('treeitem',{name:'Stereo Utility',exact:true}).dragTo(page.locator('.track[data-track-id="track-1"]'));
  await expect(page.locator('#notice')).toContainText('two effects');
  await page.evaluate(()=>{window.sessionSnapshot.state.playing=1;});await expect(page.locator('#start')).toBeDisabled();
  await page.getByRole('treeitem',{name:'Stereo Utility',exact:true}).dragTo(page.locator('.track[data-track-id="track-2"]'));
  await expect(page.locator('#notice')).toContainText('Stop transport');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_device'))).toEqual([]);
});

test('Arrangement track drops use the actual destination and report native refusals without changing the chain',async({page})=>{
  await openSession(page,{emptyDevices:true});await page.locator('#view-arrangement').click();
  await page.evaluate(()=>{window.browserLoadError='Native device admission refused';});
  await page.getByRole('treeitem',{name:'Subtractive',exact:true}).dragTo(page.locator('.timeline-row[data-track-id="track-2"] .timeline-header'));
  await expect(page.locator('#notice')).toContainText('Native device admission refused');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_device').map(c=>c.args.trackId))).toEqual(['track-2']);
  expect(await page.evaluate(()=>window.sessionSnapshot.document.tracks.every(t=>!t.chain.instrument))).toBe(true);
  await expect(page.locator('.device-drop-target')).toHaveCount(0);
});

// Browser geometry and input coverage only. The native desktop journey qualifies hosting/audio.
async function openSession(page,{longNames=false,trackCount=2,launchQuantization=true,midiPreview=true,emptyDevices=false,audioTrack=false}={}){
  const document=JSON.parse(readFileSync(new URL('../../../alive/examples/two-instruments.alive',import.meta.url))).score,patch=JSON.parse(readFileSync(new URL('../../examples/subtractive.ultra',import.meta.url)));
  const template=structuredClone(document.tracks[0]),sourceTemplate=structuredClone(document.sources[0]),deviceInstances={},runtime=[];
  while(document.tracks.length<trackCount){const i=document.tracks.length+1,track=structuredClone(template),source=structuredClone(sourceTemplate);track.id=`track-${i}`;track.name=`Track ${i}`;source.trackId=track.id;document.tracks.push(track);document.sources.push(source);}
  document.placements=[];
  document.tracks.forEach((track,index)=>{
    const reference=track.chain.instrument,source=document.sources[index];reference.instanceId=`instrument-${index}`;reference.bypassed=false;track.effects=[];
    source.id=`source-${track.id}`;source.name='Clip 1';source.notes.forEach((n,i)=>n.id=`note-${track.id}-${i}`);source.automation.forEach(l=>l.instanceId=reference.instanceId);track.slots=[{id:`clip-${track.id}`,name:'Clip 1',sourceId:source.id,region:{start:0,end:8,loopStart:0,loopEnd:8,loopEnabled:true}},null,null,null];
    const manifest={...patch.device,presentation:projectFixturePresentation(patch),parameters:patch.device.parameters.map(p=>({...p,base:reference.parameters[p.key]}))};
    deviceInstances[reference.instanceId]={track:index,index:runtime.length,path:reference.path,manifest};runtime.push({effective:manifest.parameters.map(p=>p.base),owned:manifest.parameters.map(()=>0)});
  });
  for(const file of ['utility','stereo-lowpass']){
    const authored=JSON.parse(readFileSync(new URL(`../../examples/${file}.ultra`,import.meta.url))),device=authored.device,instanceId=file;
    if(longNames&&file==='stereo-lowpass')device.name='LongSavedDevice'.repeat(8);
    const manifest={...device,presentation:projectFixturePresentation(authored),parameters:device.parameters.map(p=>({...p,base:p.key==='gain'?1:p.key==='resonance'?.7:1000}))};
    document.tracks[0].effects.push({instanceId,id:device.id,path:`${file}.ultra`,parameters:Object.fromEntries(manifest.parameters.map(p=>[p.key,p.base])),bypassed:false});
    deviceInstances[instanceId]={track:0,index:runtime.length,path:`${file}.ultra`,manifest};runtime.push({effective:manifest.parameters.map(p=>p.base),owned:manifest.parameters.map(()=>0)});
  }
  const snapshot={master:{gain:1,acceptedSerial:'1',available:true,unavailableReason:null,observationStale:false,observation:{targetGain:1,currentGain:1,peakLeft:.2,peakRight:1.2,clipMask:2,appliedSerial:'1',appliedFrame:'64',observationStartFrame:'0',observationEndFrame:'64'}},generation:1,editRevision:0,preparationRevision:'9007199254740993',snapshotSequence:'1',
    capabilities:{maxTracks:8,maxDevices:16,atomicTrackActions:true,launchQuantization,launchWindowFrames:1024,midiPreview,midiEdit:true},launch:{globalQuantization:'bar1',clipQuantization:[]},midi:{pending:false,publication:{status:3,serial:'0',error:0}},history:{canUndo:false,canRedo:false},document,deviceInstances,dirty:false,
    state:{playing:0,position:'0',absoluteFrame:'0',rejected:'0',generation:'1',peakLeft:0,peakRight:0,devices:runtime,tracks:document.tracks.map(()=>({peakLeft:0,peakRight:0,activeVoices:0}))},audio:{config:{host:'default',device:'default',sample_rate:48000},observed_buffer_frames:0,callbacks:0,stream_errors:0,failed:false,message:'Browser fixture'},
    runtime:{tracks:document.tracks.map(t=>({trackId:t.id,authority:'arrangement',activeSourceId:null,activePlacementId:null,activeSlotId:null,phase:null,epoch:'1',pendingAction:null,pendingAuthority:null,pendingSlotId:null,pendingSerial:null,pendingFrame:null})),requests:[],requestedStopEpoch:'0',appliedStopEpoch:'0'},preparedWorkspaces:{preparationRevision:'9007199254740993',sources:[],slots:[],placements:[]}};
  if(emptyDevices){for(const track of document.tracks){track.chain.instrument=null;track.effects=[];}for(const source of document.sources)source.automation=[];}
  if(audioTrack){document.tracks[1].chain={kind:'audio'};document.tracks[1].slots=[null,null,null,null];document.sources=document.sources.filter(s=>s.trackId!==document.tracks[1].id);}
  await page.addInitScript(snapshot=>{
    window.sessionSnapshot=snapshot;window.calls=[];const undo=[],redo=[];
    function prepared(){
      const d=snapshot.document;snapshot.preparedWorkspaces.sources=d.sources.map(s=>({trackId:s.trackId,sourceId:s.id,kind:s.kind,name:s.name,lengthFrames:'205714'}));snapshot.preparedWorkspaces.slots=d.tracks.flatMap(t=>t.slots.flatMap((c,slot)=>c?[{trackId:t.id,slotId:c.id,slot,sourceId:c.sourceId,name:c.name}]:[]));snapshot.preparedWorkspaces.placements=d.placements.map(p=>({trackId:p.trackId,placementId:p.id,sourceId:p.sourceId,startFrame:String(Math.round(p.start*25714)),durationFrames:String(Math.round(p.duration*25714))}));
    }
    function accepted(){snapshot.editRevision++;snapshot.snapshotSequence=String(BigInt(snapshot.snapshotSequence)+1n);snapshot.dirty=true;snapshot.history={canUndo:!!undo.length,canRedo:!!redo.length};prepared();return structuredClone(snapshot);}
    window.__TAURI__={core:{invoke:async(name,args={})=>{
      if(name==='alive_browser_catalog')return window.catalogRequest?window.catalogRequest(args.request):{revision:'1',entries:[{id:'bundled:subtractive',kind:'instrument',name:'Subtractive',path:'../../ultra/examples/subtractive.ultra'},{id:'bundled:utility',kind:'audioEffect',name:'Stereo Utility',path:'utility.ultra'},{id:'bundled:lowpass',kind:'audioEffect',name:'Stereo Lowpass',path:'stereo-lowpass.ultra'}].map(entry=>({...entry,provider:'bundled',profile:null,qualification:'qualified',availability:'ready',reason:null,description:'Bundled Ultra device',dependencies:[]})),nextCursor:null,notices:[]};
      window.calls.push({name,args});if(name==='alive_current')return structuredClone(snapshot);
      if(name==='alive_midi_preview')return{serial:String(window.calls.length)};
      if(name==='alive_file')return structuredClone(snapshot);
      if(name==='alive_history'){const from=args.direction==='undo'?undo:redo,to=args.direction==='undo'?redo:undo;to.push(structuredClone(snapshot.document));snapshot.document=from.pop();return accepted();}
      if(name==='alive_device'){
        if(window.browserLoadError)throw Error(window.browserLoadError);
        if(args.generation!==snapshot.generation||args.editRevision!==snapshot.editRevision)throw Error('Stale device edit');
        let track=snapshot.document.tracks.find(t=>t.id===args.trackId);const instrument=['load','replace','loadNewTrack'].includes(args.action);
        if(args.action==='loadNewTrack'){
          undo.push(structuredClone(snapshot.document));redo.length=0;
          const at=snapshot.document.tracks.indexOf(track)+1;
          track={id:`track-new-${snapshot.editRevision}`,name:'New MIDI',chain:{kind:'midi',instrument:null},effects:[],slots:[null,null,null,null],color:'#86a59c',gain:1,mute:false,solo:false};
          snapshot.document.tracks.splice(at,0,track);
        }
        const existing=Object.values(snapshot.deviceInstances).find(i=>i.path===args.path),instanceId=`dropped-${snapshot.editRevision}`;
        const reference={instanceId,id:existing?.manifest.id??'fixture',path:args.path,bypassed:false,parameters:Object.fromEntries((existing?.manifest.parameters??[]).map(p=>[p.key,p.base]))};
        if(instrument)track.chain.instrument=reference;
        else{const before=track.effects.findIndex(e=>e.instanceId===args.beforeInstanceId);track.effects.splice(before<0?track.effects.length:before,0,reference);}
        snapshot.deviceInstances[instanceId]={...structuredClone(existing),path:args.path,track:snapshot.document.tracks.indexOf(track),index:snapshot.state.devices.length};
        snapshot.state.devices.push({effective:(existing?.manifest.parameters??[]).map(p=>p.base),owned:(existing?.manifest.parameters??[]).map(()=>0)});
        snapshot.generation++;return accepted();
      }
      if(name==='alive_workspace_track'){
        const op=args.operation;undo.push(structuredClone(snapshot.document));redo.length=0;
        if(op.kind==='remove'){
          await new Promise(resolve=>{window.finishRemoval=resolve;});const d=snapshot.document;d.tracks=d.tracks.filter(t=>t.id!==op.trackId);d.sources=d.sources.filter(s=>s.trackId!==op.trackId);d.placements=d.placements.filter(p=>p.trackId!==op.trackId);snapshot.generation++;
          return{snapshot:accepted(),affected:{trackId:op.trackId}};
        }
        const id=`track-new-${snapshot.editRevision}`,at=snapshot.document.tracks.findIndex(t=>t.id===op.afterTrackId)+1;snapshot.document.tracks.splice(at,0,{id,name:'New MIDI',chain:{kind:'midi',instrument:null},effects:[],slots:[null,null,null,null],color:'#c77b61',gain:1,mute:false,solo:false});return{snapshot:accepted(),affected:{trackId:id}};
      }
      if(name==='alive_workspace_edit'){
        const op=args.operation;if(args.editRevision!==snapshot.editRevision)throw Error('Stale musical edit');const document=structuredClone(snapshot.document),affected={trackId:op.trackId??null,sourceId:op.sourceId??null,placementId:null,slotId:null,noteId:op.noteId??null};
        if(op.kind==='noteUpdate')Object.assign(document.sources.find(s=>s.id===op.sourceId).notes.find(n=>n.id===op.noteId),{beat:op.beat,duration:op.duration,pitch:op.pitch,velocity:op.velocity});
        else if(op.kind==='noteDelete'){const source=document.sources.find(s=>s.id===op.sourceId);source.notes=source.notes.filter(n=>n.id!==op.noteId);}
        else if(op.kind==='noteCreate'){const source=document.sources.find(s=>s.id===op.sourceId),{kind,sourceId,...note}=op;affected.trackId=source.trackId;affected.noteId=`new-note-${snapshot.editRevision}`;source.notes.push({id:affected.noteId,...note});}
        else if(op.kind==='automationSet'){document.sources.find(s=>s.id===op.sourceId).automation=op.lanes;}
        else if(op.kind==='sourceCreateMidi'){affected.sourceId=`new-source-${snapshot.editRevision}`;document.sources.push({id:affected.sourceId,kind:'midi',trackId:op.trackId,name:op.name,lengthBeats:op.lengthBeats,notes:[],automation:[]});}
        else if(op.kind==='midiClipCreate'){const t=document.tracks.find(t=>t.id===op.trackId);affected.sourceId=`new-source-${snapshot.editRevision}`;affected.slotId=`new-slot-${snapshot.editRevision}`;document.sources.push({kind:'midi',id:affected.sourceId,trackId:t.id,name:op.name,lengthBeats:4,notes:[],automation:[]});t.slots[op.slot]={id:affected.slotId,name:op.name,sourceId:affected.sourceId,region:{start:0,end:4,loopStart:0,loopEnd:4,loopEnabled:true}};}
        else if(op.kind==='placementCreate'){const {kind,...p}=op;affected.placementId=`new-placement-${snapshot.editRevision}`;document.placements.push({id:affected.placementId,...p});}
        else if(op.kind==='placementUpdate'){const p=document.placements.find(p=>p.id===op.placementId);Object.assign(affected,{trackId:p.trackId,sourceId:p.sourceId,placementId:p.id});Object.assign(p,{start:op.start,duration:op.duration,region:op.region});}
        else if(op.kind==='placementDelete'){const p=document.placements.find(p=>p.id===op.placementId);Object.assign(affected,{trackId:p.trackId,sourceId:p.sourceId,placementId:p.id});document.placements=document.placements.filter(p=>p.id!==op.placementId);}
        else if(op.kind==='sourceRename'){const s=document.sources.find(s=>s.id===op.sourceId);s.name=op.name;affected.trackId=s.trackId;}
        else if(op.kind==='transportRange'){const {kind,...fields}=op;Object.assign(document,fields);}
        else throw Error('Unsupported fixture edit '+op.kind);
        undo.push(structuredClone(snapshot.document));redo.length=0;snapshot.document=document;return{snapshot:accepted(),affected};
      }
      if(name==='alive_master'||name==='alive_master_reset_clip'){if(window.masterGate)return window.masterGate(name,args);if(args.generation!==snapshot.generation)throw {code:'STALE_GENERATION',message:'stale generation'};const serial=String(BigInt(snapshot.master.acceptedSerial)+1n);snapshot.master.acceptedSerial=serial;snapshot.master.observation.appliedSerial=serial;if(name==='alive_master'){snapshot.master.gain=args.gain;snapshot.master.observation.targetGain=args.gain;snapshot.master.observation.currentGain=args.gain;return{generation:args.generation,acceptedGain:args.gain,acceptedSerial:serial,changed:true};}snapshot.master.observation.clipMask=0;return{generation:args.generation,acceptedSerial:serial};}
      if(name==='alive_launch_settings'){if(args.generation!==snapshot.generation||args.preparationRevision!==snapshot.preparationRevision||args.editRevision!==snapshot.editRevision)throw Error('Stale launch settings');if(args.edit.kind==='global')snapshot.launch.globalQuantization=args.edit.quantization;else{snapshot.launch.clipQuantization=snapshot.launch.clipQuantization.filter(o=>o.occurrenceId!==args.edit.occurrenceId);if(args.edit.quantization!=='global')snapshot.launch.clipQuantization.push({occurrenceId:args.edit.occurrenceId,quantization:args.edit.quantization});}return accepted();}
      if(name==='alive_mixer'){Object.assign(snapshot.document.tracks.find(t=>t.id===args.trackId),{gain:args.gain,mute:args.mute,solo:args.solo});snapshot.dirty=true;return;}
      if(name==='alive_base'){const owner=snapshot.deviceInstances[args.instanceId],track=snapshot.document.tracks[owner.track];owner.manifest.parameters.find(p=>p.key===args.key).base=args.value;[track.chain.instrument,...track.effects].filter(Boolean).find(d=>d.instanceId===args.instanceId).parameters[args.key]=args.value;return;}
      throw Error('Unsupported fixture command '+name);
    }}};prepared();
  },snapshot);
  await page.goto('/alive.html');await expect(page.locator('#chain-title')).toHaveText('Pulse chain');
}

test('empty body double-click creates one playable one-bar clip and never launches',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const body=page.getByRole('button',{name:'Select Pulse slot 2',exact:true});await body.click();
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await body.dblclick();await expect(page.locator('.clip-control-heading')).toHaveText('Clip 2');
  const calls=await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'));expect(calls).toHaveLength(1);expect(calls[0].name).toBe('alive_workspace_edit');expect(calls[0].args.operation).toEqual({kind:'midiClipCreate',trackId:'track-1',slot:1,name:'Clip 2'});
  await expect(page.getByRole('button',{name:'Launch Pulse Clip 2',exact:true})).toBeEnabled();await expect(body).toHaveAttribute('aria-pressed','true');
});

for(const size of [{width:1440,height:900},{width:1280,height:800},{width:1024,height:768},{width:800,height:600}])test(`native Preview control and piano key gestures fit ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page,{midiPreview:true});
  const preview=page.getByRole('button',{name:'MIDI note Preview',exact:true});await expect(preview).toBeInViewport();await expect(preview).toHaveAttribute('aria-pressed','false');
  const height=await page.locator('#piano-roll').evaluate(e=>e.getBoundingClientRect().height);expect(height).toBeGreaterThanOrEqual(156);
  await preview.click();await expect(preview).toHaveAttribute('aria-pressed','true');
  const key=page.locator('#piano-roll [data-key="60"]');await key.scrollIntoViewIfNeeded();const box=await key.boundingBox();
  await page.mouse.move(box.x+5,box.y+box.height/2);await page.mouse.down();
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_midi_preview'&&c.args.action==='note').length)).toBe(1);
  await page.mouse.up();await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_midi_preview'&&c.args.action==='release').length)).toBe(1);
  expect(await page.evaluate(()=>window.calls.some(c=>c.name==='alive_transport'||c.name==='alive_workspace_action'))).toBe(false);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await preview.scrollIntoViewIfNeeded();await expect(preview).toBeInViewport();
  if(size.width===800){
    await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
    const bounds=await page.locator('.clip-view-tools').evaluate(e=>Array.from(e.children).map(child=>{const r=child.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
    for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){const a=bounds[i],b=bounds[j];expect(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y).toBe(true);}
  }
  await page.screenshot({path:testInfo.outputPath(`preview-${size.width}x${size.height}.png`)});
});


test('vertical gain fader sends one bounded change and reflects external snapshots without erasing focused numeric text',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const slider=page.getByRole('slider',{name:'Pulse gain fader',exact:true}),number=page.getByRole('spinbutton',{name:'Pulse gain',exact:true});
  const initial=Number(await slider.inputValue());await slider.focus();await slider.press('ArrowUp');
  await expect(number).toHaveValue(String(Math.round((initial+.02)*100)/100));
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_mixer'))).toHaveLength(1);
  await number.fill('0.83');await page.evaluate(()=>{window.sessionSnapshot.document.tracks[0].gain=.4;});
  await expect(slider).toHaveValue('0.4');await expect(number).toHaveValue('0.83');
  await number.press('Tab');await expect(slider).toHaveValue('0.83');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_mixer').map(c=>c.args.gain))).toEqual([Math.round((initial+.02)*100)/100,.83]);
});

for(const size of [{width:1440,height:900},{width:1280,height:800}])test(`two fixed track columns leave blank stage and expose piano roll at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page);
  const geometry=await page.evaluate(()=>{const rect=e=>e.getBoundingClientRect().toJSON();return{track:[...document.querySelectorAll('.track')].map(rect),mixerControls:[...document.querySelectorAll('.mixer-toggle,.track-inspector')].map(rect),session:rect(document.querySelector('#session-workspace')),piano:rect(document.querySelector('#piano-roll')),detail:rect(document.querySelector('#detail-content')),scene:rect(document.querySelector('.scene-column'))};});
  for(const track of geometry.track)expect(track.width).toBe(128);expect(geometry.scene.x-(geometry.track[1].x+geometry.track[1].width)).toBeGreaterThan(300);
  for(const control of geometry.mixerControls)expect(control.bottom).toBeLessThanOrEqual(geometry.session.bottom);
  expect(geometry.piano.y).toBeLessThan(geometry.detail.y+128);expect(geometry.piano.height).toBeGreaterThanOrEqual(156);expect(Math.min(geometry.piano.bottom,geometry.detail.bottom)-geometry.piano.y).toBeGreaterThanOrEqual(144);
  await page.screenshot({path:testInfo.outputPath(`two-tracks-${size.width}x${size.height}.png`)});
});

for(const size of [{width:1440,height:900},{width:1280,height:800}])for(const fixture of [{name:'two tracks',count:2},{name:'eight tracks',count:8}])test(`expanded inspector preserves shared mixer baseline in ${fixture.name} at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page,{trackCount:fixture.count});
  const tracks=page.locator('.track'),inspector=tracks.first().locator('.track-inspector'),summary=inspector.locator('summary');
  const geometry=()=>tracks.evaluateAll(elements=>elements.slice(0,2).map(track=>{
    const box=selector=>{const r=track.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom};};
    return {fader:box('.gain-fader'),mute:box('.mixer-toggle:first-child'),solo:box('.mixer-toggle:last-child')};
  }));
  const before=await geometry();await summary.focus();await summary.press('Enter');await expect(inspector).toHaveAttribute('open','');
  const after=await geometry();await page.screenshot({path:testInfo.outputPath(`expanded-${fixture.name.replaceAll(' ','-')}-${size.width}x${size.height}.png`)});
  for(const control of ['fader','mute','solo'])for(const edge of ['top','bottom']){
    expect(Math.abs(before[0][control][edge]-before[1][control][edge]),`collapsed ${control} ${edge}`).toBeLessThanOrEqual(2);
    expect(Math.abs(after[0][control][edge]-after[1][control][edge]),`expanded ${control} ${edge}`).toBeLessThanOrEqual(2);
    expect(Math.abs(after[0][control][edge]-before[0][control][edge]),`stable ${control} ${edge}`).toBeLessThanOrEqual(2);
  }
  for(const name of ['Open Pulse editor','Replace Pulse device','Remove Pulse track']){
    const action=page.getByRole('button',{name,exact:true});await expect(action).toBeVisible();await action.focus();await expect(action).toBeFocused();await action.click({trial:true});
  }
  await page.locator('#stop').click({trial:true});await page.locator('#master-session').getByLabel('Master gain fader').click({trial:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
});

test('Add note queued behind track removal never edits the surviving track',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1100,height:800});await openSession(page);
  const survivingNotes=await page.evaluate(()=>window.sessionSnapshot.document.sources.find(s=>s.trackId===window.sessionSnapshot.document.tracks[1].id).notes.length);
  await page.locator('.track-inspector summary').first().click();
  await page.getByRole('button',{name:'Remove Pulse track',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>typeof window.finishRemoval)).toBe('function');
  await page.getByRole('button',{name:'Add note',exact:true}).click();await page.evaluate(()=>window.finishRemoval());
  await expect(page.locator('#clip-title')).toHaveText('Harmony / Clip 1');await expect(page.locator('#notice')).toContainText('source scope changed');
  await expect(page.locator('#notes tr')).toHaveCount(survivingNotes);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_workspace_edit'))).toEqual([]);expect(errors).toEqual([]);
});

test('selected instance controls, keyboard automation target and immediate edits and desktop bounds',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:900,height:660});await openSession(page);
  await page.locator('#detail-devices').click();
  await page.getByRole('button',{name:'Select Pulse Stereo Lowpass effect 2',exact:true}).click();
  await expect(page.locator('#device-title')).toHaveText('Stereo Lowpass');await expect(page.locator('.chain-device[data-instance-id="stereo-lowpass"]').getByRole('spinbutton',{name:'Cutoff base',exact:true})).toHaveValue('1000');
  expect(await page.evaluate(()=>window.calls.some(c=>c.name==='alive_editor'||c.name==='alive_transport'))).toBe(false);
  await expect(page.locator('#clip-detail')).toBeVisible();await page.locator('.automation-section>summary').click();
  await page.getByLabel('Automation target',{exact:true}).selectOption(JSON.stringify(['stereo-lowpass','cutoff']));await page.getByRole('button',{name:'Add automation lane',exact:true}).click();
  await page.getByRole('button',{name:'Add Stereo Lowpass effect 2 / Cutoff point',exact:true}).click();
  await expect(page.getByLabel('Stereo Lowpass effect 2 / Cutoff point 1 value',{exact:true})).toHaveValue('1000');
  await expect(page.locator('#chain-status')).toContainText('while stopped');expect(await page.locator('#add-effect').isDisabled()).toBe(true);
  await expect(page.getByLabel('Cutoff point 1 value',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('alive-minimum-desktop.png')});expect(errors).toEqual([]);
});

test('long saved device names fit the minimum desktop window',async({page})=>{
  await page.setViewportSize({width:900,height:660});await openSession(page,{longNames:true});
  await page.locator('#detail-devices').click();
  await expect(page.locator('.chain-select').nth(2)).toContainText('LongSavedDevice');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth)).toBe(true);
});

test('piano body, resize, velocity, cancellation and keyboard gestures are bounded transactions',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1100,height:800});await openSession(page);
  await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  const piano=page.locator('#piano-roll'),edits=()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_workspace_edit'));
  await piano.scrollIntoViewIfNeeded();
  for(let i=0;i<6;i++)await page.getByRole('button',{name:'Scroll pitch up',exact:true}).click();
  const box=await piano.boundingBox(),viewport=await piano.evaluate(e=>({...e.dataset}));
  const pixelsPerBeat=(box.width-Number(viewport.keyboardWidth))/Number(viewport.beatSpan);
  const x=beat=>box.x+Number(viewport.keyboardWidth)+(beat-Number(viewport.beatStart))*pixelsPerBeat;
  const y=pitch=>box.y+Number(viewport.rulerHeight)+(Number(viewport.pitchMax)-pitch+.5)*Number(viewport.rowHeight);
  await page.mouse.dblclick(x(2),y(80));await expect.poll(async()=>(await edits()).length).toBe(1);
  expect((await edits())[0].args.operation).toMatchObject({kind:'noteCreate',sourceId:'source-track-1',beat:2,pitch:80,duration:.25,velocity:100});
  const index=await page.evaluate(()=>window.sessionSnapshot.document.sources[0].notes.length-1);
  const body=piano.locator(`[data-note="${index}"][data-part="body"]`),edge=piano.locator(`[data-note="${index}"][data-part="resize"]`);
  let b=await body.boundingBox();await page.mouse.move(b.x+2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+2+pixelsPerBeat*.5,b.y+b.height/2,{steps:5});
  expect((await edits()).length).toBe(1);await page.mouse.up();await expect.poll(async()=>(await edits()).length).toBe(2);
  expect((await edits())[1].args.operation.beat).toBe(2.5);
  b=await edge.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+pixelsPerBeat*.5,b.y+b.height/2,{steps:5});await page.mouse.up();await expect.poll(async()=>(await edits()).length).toBe(3);
  expect((await edits())[2].args.operation.duration).toBe(.75);
  b=await body.boundingBox();await page.mouse.move(b.x+2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+30,b.y+b.height/2);await page.keyboard.press('Escape');await page.mouse.up();expect((await edits()).length).toBe(3);
  await piano.focus();await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await edits()).length).toBe(4);
  expect((await edits())[3].args.operation.pitch).toBe(81);
  const velocity=page.getByLabel('Selected note velocity',{exact:true});await velocity.scrollIntoViewIfNeeded();const v=await velocity.boundingBox();await page.mouse.move(v.x+v.width*.4,v.y+v.height/2);await page.mouse.down();await page.mouse.move(v.x+v.width*.7,v.y+v.height/2,{steps:8});await page.mouse.up();await expect.poll(async()=>(await edits()).length).toBe(5);
  const stem=page.locator(`.piano-velocity-lane [data-note="${index}"]`);b=await stem.boundingBox();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2+8,{steps:4});
  expect((await edits()).length).toBe(5);await page.mouse.up();await expect.poll(async()=>(await edits()).length).toBe(6);
  expect((await edits())[5].args.operation.velocity).toBeLessThan((await edits())[4].args.operation.velocity);
  await piano.focus();await page.keyboard.press('Control+z');await expect(page.locator('#redo')).toBeEnabled();
  await page.screenshot({path:testInfo.outputPath('piano-selected-history.png')});expect(errors).toEqual([]);
});

test('piano navigation and live resize preserve the score and recompute editing geometry',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await openSession(page);
  const piano=page.locator('#piano-roll'),initial=await piano.evaluate(e=>({...e.dataset}));
  expect(Number(initial.rowHeight)).toBeGreaterThanOrEqual(10);
  await page.getByRole('button',{name:'Zoom in time',exact:true}).click();
  await page.getByRole('button',{name:'Scroll time later',exact:true}).click();
  const time=await piano.evaluate(e=>({...e.dataset}));
  expect(Number(time.beatSpan)).toBeLessThan(Number(initial.beatSpan));expect(Number(time.beatStart)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Zoom in pitch',exact:true}).click();
  await page.getByRole('button',{name:'Scroll pitch down',exact:true}).click();
  const pitch=await piano.evaluate(e=>({...e.dataset}));
  expect(Number(pitch.rowHeight)).toBeGreaterThan(Number(time.rowHeight));expect(pitch.beatSpan).toBe(time.beatSpan);
  await page.setViewportSize({width:800,height:600});
  await expect.poll(()=>piano.evaluate(e=>Number(e.getAttribute('viewBox').split(' ')[2]))).toBeCloseTo((await piano.boundingBox()).width,0);
  expect(await piano.getAttribute('data-row-height')).toBe(pitch.rowHeight);
  await page.getByRole('button',{name:'Fit notes',exact:true}).click();
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  const frame=await piano.evaluate(e=>({max:Number(e.dataset.pitchMax),row:Number(e.dataset.rowHeight),top:Number(e.dataset.rulerHeight),height:e.getBoundingClientRect().height}));
  const notes=JSON.parse(readFileSync(new URL('../../../alive/examples/two-instruments.alive',import.meta.url))).score.sources[0].notes;
  for(const note of notes){expect(frame.max).toBeGreaterThanOrEqual(note.pitch);expect(frame.top+(frame.max-note.pitch+1)*frame.row).toBeLessThanOrEqual(frame.height+1);}
});

test('a chord velocity drag edits the selected note when markers overlap',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  await page.getByRole('button',{name:'Fit notes',exact:true}).click();
  await page.locator('#piano-roll [data-note="0"][data-part="body"]').click({position:{x:8,y:3}});
  const marker=page.locator('.piano-velocity-lane [data-note="0"]');await marker.scrollIntoViewIfNeeded();const b=await marker.boundingBox();
  await page.mouse.move(b.x+b.width-1,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width-1,b.y+b.height/2+6,{steps:4});await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_workspace_edit').length)).toBe(1);
  const notes=await page.evaluate(()=>window.sessionSnapshot.document.sources[0].notes);
  expect(notes[0].velocity).toBeLessThan(90);expect(notes[1].velocity).toBe(90);expect(notes[2].velocity).toBe(90);
});

test('browser selection and transport dismissal preserve unfinished musical fields',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const tempo=page.locator('#tempo');await tempo.fill('130');
  await page.getByRole('treeitem',{name:'Subtractive',exact:true}).click();
  await expect(tempo).toHaveValue('130');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await page.locator('#save').click();await expect(page.locator('#notice')).toContainText('Finish Tempo');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await tempo.focus();await tempo.press('Tab');
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_workspace_edit').length)).toBe(1);
  await page.evaluate(()=>window.calls=[]);
  await page.locator('#transport-options-toggle').click();const length=page.locator('#length');await length.fill('32');await length.press('Escape');
  await expect(page.locator('#transport-options')).toBeHidden();
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await page.locator('#transport-options-toggle').click();await expect(length).toHaveValue('32');
  await length.focus();await length.press('Tab');
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_workspace_edit').length)).toBe(1);
  await tempo.fill('133');await page.getByRole('treeitem',{name:'Subtractive',exact:true}).click();
  await page.evaluate(()=>{const s=window.sessionSnapshot;s.generation++;s.editRevision=0;s.document.tempo=90;window.calls=[];});
  await expect(tempo).toHaveValue('90');
  await tempo.focus();await tempo.press('Tab');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  const search=page.getByRole('searchbox',{name:'Search browser'});await search.fill('sub');await page.getByRole('treeitem',{name:'Subtractive',exact:true}).click();
  await page.locator('#save').click();await expect(page.locator('#notice')).not.toContainText('Finish Search');
});


test('four-slot bank preserves stable note identity and fits the minimum desktop',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:900,height:660});await openSession(page);
  await expect(page.getByRole('button',{name:'Select Pulse slot 4',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Select Pulse slot 2',exact:true}).click();await expect(page.getByRole('button',{name:'Add note',exact:true})).toBeHidden();
  await page.locator('.clip-source-actions>summary').click();await expect(page.getByRole('button',{name:'Create clip',exact:true})).toBeVisible();expect(await page.evaluate(()=>window.calls.some(c=>c.name==='alive_workspace_edit'||c.name==='alive_workspace_action'))).toBe(false);
  await page.getByRole('button',{name:'Select Pulse slot 1',exact:true}).click();
  await page.locator('.note-table>summary').click();
  const pitch=page.getByRole('spinbutton',{name:'Note 1 pitch',exact:true});await pitch.fill('62');await pitch.press('Tab');await expect(pitch).toHaveValue('62');
  const changes=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_workspace_edit'));expect(changes).toHaveLength(1);expect(changes[0].args.operation).toMatchObject({kind:'noteUpdate',sourceId:'source-track-1',noteId:'note-track-1-0',pitch:62});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth)).toBe(true);
  await page.getByRole('button',{name:'Select Pulse slot 1',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('four-slot-minimum-desktop.png')});expect(errors).toEqual([]);
});

for(const size of [{width:1440,height:900},{width:1280,height:800}])test(`eight columns align with four scene rows at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page,{trackCount:8});
  const bounds=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
    return{columns:[...document.querySelectorAll('.track')].map(e=>({box:rect(e),slots:[...e.querySelectorAll('.clip-slot')].map(rect),mixer:rect(e.querySelector('.track-mixer'))})),scenes:[...document.querySelectorAll('.scene-row')].map(rect),session:rect(document.querySelector('#session-workspace')),detail:rect(document.querySelector('#detail-panel')),whole:document.documentElement.scrollWidth};
  });
  expect(bounds.columns).toHaveLength(8);expect(bounds.scenes).toHaveLength(4);expect(bounds.whole).toBe(size.width);
  for(let c=0;c<8;c++){expect(bounds.columns[c].box.x).toBeLessThan(bounds.columns[c].box.x+bounds.columns[c].box.width);if(c)expect(bounds.columns[c].box.x).toBeGreaterThan(bounds.columns[c-1].box.x);for(let r=0;r<4;r++){expect(bounds.columns[c].slots[r].y).toBe(bounds.scenes[r].y);expect(bounds.columns[c].slots[r].height).toBe(bounds.scenes[r].height);}expect(bounds.columns[c].mixer.y).toBeGreaterThanOrEqual(bounds.columns[c].slots[3].y+bounds.columns[c].slots[3].height);}
  expect(bounds.session.height).toBeGreaterThan(250);expect(bounds.detail.y+bounds.detail.height).toBeLessThanOrEqual(size.height-30);
  await page.screenshot({path:testInfo.outputPath(`session-${size.width}x${size.height}.png`)});
  await page.locator('#session-workspace').evaluate(e=>e.scrollLeft=e.scrollWidth);await expect(page.getByRole('button',{name:'Select Track 8 slot 4',exact:true})).toBeInViewport();await expect(page.getByRole('button',{name:'Launch scene 4',exact:true})).toBeInViewport();
});

test('view buttons preserve focused uncommitted values and native Tab navigation',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const tempo=page.locator('#tempo');await tempo.fill('135');
  await page.locator('#view-arrangement').click();await expect(page.locator('#arrangement-workspace')).toBeVisible();
  await page.locator('#view-session').click();await expect(tempo).toHaveValue('135');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await tempo.press('Tab');await expect(page.locator('#session-workspace')).toBeVisible();
  await page.locator('#session-workspace').focus();await page.keyboard.press('Tab');await expect(page.locator('#arrangement-workspace')).toBeVisible();
  await page.keyboard.press('Tab');await expect(page.locator('#session-workspace')).toBeVisible();
});

test('hiding Session preserves an unfinished gain field without issuing a mixer mutation',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const gain=page.getByLabel('Pulse gain',{exact:true});await gain.fill('0.85');
  for(let i=0;i<3;i++){await page.locator('#view-arrangement').click();await page.locator('#view-session').click();}
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);await expect(gain).toHaveValue('0.85');
  await gain.focus();await gain.press('Tab');expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_mixer').map(c=>c.args.gain))).toEqual([0.85]);
});

for(const kind of ['device','note'])test(`detail navigation preserves an unfinished ${kind} field until one deliberate commit`,async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const device=kind==='device',own=device?'devices':'clip',other=device?'clip':'devices',typed=device?'1717':'73';
  if(device)await page.locator('#detail-devices').click();else await page.locator('.note-table>summary').click();
  const input=(device?page.locator('.chain-device[data-instance-id="instrument-0"]'):page).getByRole('spinbutton',{name:device?'Cutoff base':'Note 1 pitch',exact:true,includeHidden:true});
  const original=JSON.parse(readFileSync(new URL('../../../alive/examples/two-instruments.alive',import.meta.url))).score;
  const mutations=()=>page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'));
  const acrossPolls=async()=>{
    const before=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);
    await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(before+2);
    expect(await mutations()).toEqual([]);await expect(input).toHaveValue(typed);
  };
  await input.fill(typed);
  for(let i=0;i<3;i++){
    await page.locator('#detail-'+own).click();await acrossPolls();
    expect(await input.evaluate(e=>document.activeElement===e)).toBe(false);
    await page.locator('#detail-'+own).click();await acrossPolls();
    await page.locator('#detail-'+other).click();await acrossPolls();
    await page.locator('#detail-'+other).click();await acrossPolls();
    await page.locator('#toggle-detail').click();await acrossPolls();
    await page.locator('#toggle-detail').click();await acrossPolls();
  }
  await input.focus();await input.press('Tab');
  await expect.poll(async()=>(await mutations()).length).toBe(1);
  const [call]=await mutations();
  if(device){expect(call.name).toBe('alive_base');expect(call.args).toMatchObject({instanceId:'instrument-0',key:'cutoff',value:1717});}
  else{
    expect(call.name).toBe('alive_workspace_edit');expect(call.args.operation).toMatchObject({kind:'noteUpdate',sourceId:'source-track-1',noteId:'note-track-1-0',pitch:73});
    const expected=structuredClone(original.sources[0].notes);expected[0].pitch=73;
    const score=await page.evaluate(()=>window.sessionSnapshot.document);
    expect(score.sources[0].notes).toEqual(expected.map((note,i)=>({...note,id:`note-track-1-${i}`})));
    expect(score.sources[1].notes.map(({id,...note})=>note)).toEqual(original.sources[1].notes.map(({id,...note})=>note));
  }
  const before=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(before+2);
  expect(await mutations()).toHaveLength(1);
});

test('maximum detail resize leaves the entire detail and workspace reachable',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const handle=page.getByRole('separator',{name:'Resize detail area'});await handle.focus();await page.keyboard.press('End');
  const bounds=await page.evaluate(()=>({detail:document.querySelector('#detail-panel').getBoundingClientRect().bottom,footer:document.querySelector('footer').getBoundingClientRect().top,workspace:document.querySelector('#session-workspace').getBoundingClientRect().height}));
  expect(bounds.detail).toBeLessThanOrEqual(bounds.footer);expect(bounds.workspace).toBeGreaterThanOrEqual(96);
  const gain=page.getByLabel('Pulse gain',{exact:true});await gain.scrollIntoViewIfNeeded();await expect(gain).toBeInViewport({ratio:1});
  const master=page.locator('#master-select-session');await master.scrollIntoViewIfNeeded();await expect(master).toBeInViewport({ratio:1});
});

test('track name and metadata line boxes fit the fixed Session header without clipping',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page,{trackCount:8});
  const headers=await page.locator('.track-name').evaluateAll(elements=>elements.map(e=>({height:e.clientHeight,content:e.scrollHeight,lines:[...e.children].map(child=>({height:child.clientHeight,content:child.scrollHeight}))})));
  for(const header of headers){expect(header.content).toBeLessThanOrEqual(header.height);for(const line of header.lines)expect(line.content).toBeLessThanOrEqual(line.height);}
});

for(const kind of ['gain','note'])test(`navigation and polling preserve unfinished ${kind} without changing runtime authority`,async({page})=>{
  await openSession(page);
  if(kind==='note')await page.locator('.note-table>summary').click();
  const input=page.getByLabel(kind==='gain'?'Pulse gain':'Note 1 pitch',{exact:true});
  await input.fill(kind==='gain'?'0.83':'73');
  for(let i=0;i<2;i++){await page.locator('#view-arrangement').click();await page.locator('#view-session').click();}
  const before=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(before+2);
  await expect(input).toHaveValue(kind==='gain'?'0.83':'73');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await page.locator('#session-workspace').focus();
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current').length)).toBe(1);
  const committed=await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'));
  expect(committed[0].name).toBe(kind==='gain'?'alive_mixer':'alive_workspace_edit');
  if(kind==='note')expect(committed[0].args.operation).toMatchObject({kind:'noteUpdate',sourceId:'source-track-1',noteId:'note-track-1-0',pitch:73});
  await page.keyboard.press('Tab');await expect(page.locator('#arrangement-workspace')).toBeVisible();await page.keyboard.press('Tab');await expect(page.locator('#session-workspace')).toBeVisible();
  expect(await page.evaluate(()=>window.sessionSnapshot.runtime.tracks.every(t=>t.authority==='arrangement'&&t.activeSourceId===null))).toBe(true);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual(committed);
});

async function openArrangement(page,size){
  await page.setViewportSize(size);await openSession(page);
  await page.evaluate(()=>{const s=window.sessionSnapshot,d=s.document;d.lengthBeats=16;d.placements=d.tracks.map((t,i)=>({id:`p-${i}`,trackId:t.id,sourceId:d.sources[i].id,start:0,duration:4,region:{start:0,end:8,loopStart:0,loopEnd:8,loopEnabled:true}}));s.preparedWorkspaces.placements=d.placements.map(p=>({placementId:p.id,trackId:p.trackId,sourceId:p.sourceId,startFrame:'0',durationFrames:'102857',}));s.editRevision++;});
  await page.locator('#view-arrangement').click();await expect(page.getByRole('button',{name:'Select placement p-0',exact:true})).toBeVisible();
}
const workspaceEdits=page=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_workspace_edit'));
test('a parked Clip region draft follows its Arrangement occurrence when placements share a source',async({page})=>{
  await openArrangement(page,{width:1280,height:800});
  await page.evaluate(()=>{const s=window.sessionSnapshot,p=s.document.placements[0];s.document.placements.push({...structuredClone(p),id:'p-shared',start:4,region:{...p.region,start:.5}});s.preparedWorkspaces.placements.push({placementId:'p-shared',trackId:p.trackId,sourceId:p.sourceId,startFrame:'102857',durationFrames:'102857'});s.editRevision++;});
  const a=page.getByRole('button',{name:'Select placement p-0',exact:true}),b=page.getByRole('button',{name:'Select placement p-shared',exact:true});await expect(b).toBeVisible();await a.click();
  const field=page.getByRole('spinbutton',{name:'Clip Start',exact:true}),summary=page.locator('.clip-properties > details').first().locator('summary');
  await page.getByRole('button',{name:'Maximize detail',exact:true}).click();await field.fill('1');await summary.click();await page.getByRole('button',{name:'Restore detail size',exact:true}).click();await b.click();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();await summary.click();
  await expect(field).toHaveValue('0.5');expect(await workspaceEdits(page)).toEqual([]);
  await summary.click();await page.getByRole('button',{name:'Restore detail size',exact:true}).click();await a.click();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();await summary.click();await expect(field).toHaveValue('1');expect(await workspaceEdits(page)).toEqual([]);
  await field.focus();await field.press('Tab');await expect.poll(async()=>(await workspaceEdits(page)).length).toBe(1);expect((await workspaceEdits(page))[0].args.operation).toMatchObject({kind:'regionSet',occurrence:{kind:'placement',placementId:'p-0'},region:{start:1}});
});
async function dragTimeline(page,locator,from,to,{cancel=false,hide=false,box=null}={}){
  box??=await locator.boundingBox();await page.mouse.move(box.x+from[0],box.y+from[1]);await page.mouse.down();await page.mouse.move(box.x+to[0],box.y+to[1],{steps:6});
  if(cancel)await page.keyboard.press('Escape');if(hide)await page.locator('#view-session').click();await page.mouse.up();
}
async function dragBlankLaneRange(page,lane){
  const box=await page.evaluate(()=>{const element=document.querySelector('.timeline-lane'),rect=element?.getBoundingClientRect();return rect&&rect.width&&rect.height?{x:rect.x,y:rect.y}:null;});
  expect(box).not.toBeNull();await dragTimeline(page,lane,[384,35],[480,35],{box});
}
for(const size of [{width:1440,height:900},{width:1280,height:800}]){
  test(`Arrangement pointer edits, cancellation and local view controls at ${size.width}`,async({page})=>{
    await openArrangement(page,size);const p=page.getByRole('button',{name:'Select placement p-0',exact:true});
    // Read the current placement and its geometry together; timeline redraws replace its nodes.
    const box=await page.evaluate(()=>{const element=document.querySelector('[data-placement-id="p-0"]'),rect=element?.getBoundingClientRect();return rect&&rect.width&&rect.height?{x:rect.x,y:rect.y}:null;});expect(box).not.toBeNull();await page.mouse.move(box.x+30,box.y+12);await page.mouse.down();await page.mouse.move(box.x+126,box.y+12,{steps:5});expect(await workspaceEdits(page)).toHaveLength(0);await page.mouse.up();
    await expect(page.getByLabel('Placement start',{exact:true})).toHaveValue('2');expect(await workspaceEdits(page)).toHaveLength(1);
    await dragTimeline(page,p,[30,12],[78,12],{cancel:true});expect(await workspaceEdits(page)).toHaveLength(1);await expect(page.getByLabel('Placement start',{exact:true})).toHaveValue('2');
    await dragTimeline(page,p.locator('.timeline-edge.right'),[3,15],[51,15]);await expect(page.getByLabel('Placement duration',{exact:true})).toHaveValue('5');
    await dragTimeline(page,p.locator('.timeline-edge.left'),[3,15],[27,15]);await expect(page.getByLabel('Placement start',{exact:true})).toHaveValue('2.5');await expect(page.getByLabel('Placement source Start',{exact:true})).toHaveValue('0.5');
    await page.getByLabel('Placement Loop',{exact:true}).uncheck();expect((await workspaceEdits(page)).at(-1).args.operation).toMatchObject({kind:'placementUpdate',start:2.5,duration:4.5,region:{start:.5,end:8,loopStart:0,loopEnd:8,loopEnabled:false}});const count=(await workspaceEdits(page)).length;await dragTimeline(page,p,[30,12],[78,12],{hide:true});await page.locator('#view-arrangement').click();expect(await workspaceEdits(page)).toHaveLength(count);
    await page.getByRole('button',{name:'Zoom timeline in',exact:true}).click();await page.getByRole('button',{name:'Zoom timeline out',exact:true}).click();await page.locator('#timeline-scroll').evaluate(e=>e.scrollLeft=100);await page.getByRole('button',{name:'Fit timeline',exact:true}).click();
    expect(await page.evaluate(()=>window.calls.filter(c=>['alive_workspace_action','alive_transport'].includes(c.name)))).toHaveLength(0);
    await page.getByRole('button',{name:'Delete placement',exact:true}).click();await expect(p).toHaveCount(0);await page.locator('#undo').click();await expect(p).toBeVisible();
    expect(await page.evaluate(()=>window.sessionSnapshot.document.tracks[0].slots[0].sourceId)).toBe('source-track-1');
    await page.screenshot({path:`/tmp/alive-workspaces-task4-midi/browser-arrangement-${size.width}x${size.height}.png`});
  });
  for(const field of ['Placement start','Placement source Start','Arrangement source name'])test(`Arrangement unfinished ${field} survives hiding and polling at ${size.width}`,async({page})=>{
    await openArrangement(page,size);await page.getByRole('button',{name:'Select placement p-0',exact:true}).click();const input=page.getByLabel(field,{exact:true}),value=field.includes('name')?'Unfinished source':field.includes('source Start')?'0.5':'1';await input.fill(value);await input.evaluate(e=>window.retainedArrangementField=e);
    for(let i=0;i<2;i++){await page.locator('#view-session').click();await page.locator('#view-arrangement').click();}
    await page.locator('#toggle-browser').click();await page.locator('#toggle-browser').click();const polls=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(polls+2);
    expect(await workspaceEdits(page)).toHaveLength(0);await expect(input).toHaveValue(value);expect(await input.evaluate(e=>e===window.retainedArrangementField)).toBe(true);
    await input.focus();await input.press('Tab');await expect.poll(async()=>(await workspaceEdits(page)).length).toBe(1);await expect(input).toHaveValue(value);
  });
}
test('Arrangement creates separate source and occurrence history and cancels stale gestures and brace previews',async({page})=>{
  await openArrangement(page,{width:1280,height:800});const lane=page.locator('.timeline-lane').first();await dragBlankLaneRange(page,lane);await page.locator('.clip-source-actions>summary').click();await page.getByRole('button',{name:'Create MIDI source',exact:true}).click();await expect(page.getByLabel('MIDI source',{exact:true})).toHaveValue('new-source-1');await page.locator('.clip-source-actions>summary').click();await page.getByRole('button',{name:'Place source in range',exact:true}).click();expect((await workspaceEdits(page)).map(c=>c.args.operation.kind)).toEqual(['sourceCreateMidi','placementCreate']);
  const p=page.getByRole('button',{name:'Select placement new-placement-2',exact:true});const b=await p.boundingBox();await page.mouse.move(b.x+30,b.y+15);await page.mouse.down();await page.mouse.move(b.x+78,b.y+15);const polls=await page.evaluate(()=>{window.sessionSnapshot.editRevision++;return window.calls.filter(c=>c.name==='alive_current').length;});await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(polls+1);await page.mouse.up();expect(await workspaceEdits(page)).toHaveLength(2);
  await dragTimeline(page,page.locator('.timeline-brace .right'),[3,8],[-93,8],{cancel:true});expect(await workspaceEdits(page)).toHaveLength(2);
  await dragTimeline(page,page.locator('.timeline-brace .right'),[3,8],[-93,8]);await expect(page.getByLabel('Song loop end',{exact:true})).toHaveValue('6');expect((await workspaceEdits(page)).at(-1).args.operation.kind).toBe('transportRange');
});
test('Arrangement blank-lane drag selects the range after a timeline redraw',async({page})=>{
  await openArrangement(page,{width:1280,height:800});const lane=page.locator('.timeline-lane').first();
  const redraw=async()=>{await page.getByRole('button',{name:'Zoom timeline in',exact:true}).click();await page.getByRole('button',{name:'Zoom timeline out',exact:true}).click();};
  await page.evaluate(()=>{window.previousLane=document.querySelector('.timeline-lane');});await redraw();
  expect(await page.evaluate(()=>!window.previousLane.isConnected&&window.previousLane!==document.querySelector('.timeline-lane'))).toBe(true);
  // A handle-based geometry read must survive an actual redraw at its resolution boundary.
  const withElement=lane._withElement.bind(lane);lane._withElement=(task,options)=>withElement(async handle=>{await redraw();return task(handle);},options);
  await dragBlankLaneRange(page,lane);await expect(page.locator('#timeline-range')).toHaveText('Range 8 - 10 beats');
  await page.locator('.clip-source-actions>summary').click();await page.getByRole('button',{name:'Create MIDI source',exact:true}).click();await expect(page.getByLabel('MIDI source',{exact:true})).toHaveValue('new-source-1');
  expect((await workspaceEdits(page)).map(c=>c.args.operation.kind)).toEqual(['sourceCreateMidi']);
});
for(const size of [{width:1440,height:900},{width:1280,height:800}])test(`Arrangement eight-track scrolling, long names and expanded detail stay bounded at ${size.width}`,async({page})=>{
  await page.setViewportSize(size);await openSession(page,{longNames:true,trackCount:8});await page.evaluate(()=>{const s=window.sessionSnapshot;s.document.lengthBeats=128;s.document.tracks[0].name='Long track name '.repeat(8);s.document.placements=[{id:'long',trackId:s.document.tracks[0].id,sourceId:s.document.sources[0].id,start:0,duration:4,region:{start:0,end:8,loopStart:0,loopEnd:8,loopEnabled:true}}];s.document.sources[0].name='Long MIDI source name '.repeat(5);s.editRevision++;});
  await page.locator('#view-arrangement').click();await page.getByRole('button',{name:'Select placement long',exact:true}).click();await page.getByRole('separator',{name:'Resize detail area'}).focus();await page.keyboard.press('End');
  const bounds=await page.evaluate(()=>{const scroll=document.querySelector('#timeline-scroll');return{body:document.body.scrollHeight,viewport:innerHeight,workspace:document.querySelector('#arrangement-workspace').clientHeight,timelineViewport:scroll.clientHeight,detail:document.querySelector('#detail-panel').getBoundingClientRect().bottom,footer:document.querySelector('footer').getBoundingClientRect().top,scrollX:scroll.scrollWidth>scroll.clientWidth,scrollY:scroll.scrollHeight>scroll.clientHeight};});
  expect(bounds.body).toBe(bounds.viewport);expect(bounds.workspace).toBeGreaterThanOrEqual(150);expect(bounds.timelineViewport).toBeGreaterThanOrEqual(96);expect(bounds.detail).toBeLessThanOrEqual(bounds.footer);expect(bounds.scrollX&&bounds.scrollY).toBe(true);
  await expect(page.locator('#master-select-arrangement')).toBeInViewport({ratio:1});
  await page.locator('#timeline-scroll').evaluate(e=>{e.scrollTop=240;e.scrollLeft=800;});expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});
test('Arrangement selection opens Clip detail and piano Delete never deletes its occurrence',async({page})=>{
  await openArrangement(page,{width:1280,height:800});await page.locator('#detail-devices').click();await page.getByRole('button',{name:'Select placement p-0',exact:true}).click();
  await expect(page.locator('#clip-detail')).toBeVisible();
  await page.locator('#piano-roll [data-note="0"][data-part="body"]').click();await page.locator('#piano-roll').press('Delete');
  await expect.poll(async()=>(await workspaceEdits(page)).length).toBeGreaterThan(0);expect((await workspaceEdits(page)).map(c=>c.args.operation.kind)).toEqual(['noteDelete']);await expect(page.getByRole('button',{name:'Select placement p-0',exact:true})).toBeVisible();
});
for(const size of [{width:1440,height:900},{width:1280,height:800}])test(`Arrangement gain preserves unfinished input and shares Session mixer at ${size.width}`,async({page})=>{
  await openArrangement(page,size);const gain=page.getByLabel('Pulse Arrangement gain',{exact:true});await gain.fill('0.713');
  for(let i=0;i<2;i++){await page.locator('#view-session').click();await page.locator('#view-arrangement').click();}
  const polls=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(polls+2);
  await expect(gain).toHaveValue('0.713');expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await gain.focus();await gain.press('Tab');await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_mixer').length)).toBe(1);
  expect(await page.evaluate(()=>window.calls.find(c=>c.name==='alive_mixer').args)).toMatchObject({track:0,gain:.713});await expect(page.locator('#arrangement-workspace')).toBeVisible();
  await page.locator('#view-session').click();await expect(page.getByLabel('Pulse gain',{exact:true})).toHaveValue('0.713');
});

for(const size of [{width:1440,height:900},{width:1280,height:800}])for(const trackCount of [2,8])test(`Master and compact workspace geometry ${trackCount} tracks ${size.width}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page,{trackCount});
  const geometry=await page.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};return {chrome:box(document.querySelector('.workspace-tools')).bottom, browser:box(document.querySelector('#workspace-browser')),header:box(document.querySelector('.track-name')),slots:[...document.querySelectorAll('.track:first-child .clip-slot')].map(box),scenes:[...document.querySelectorAll('.scene-row')].map(box),master:box(document.querySelector('.scene-column')),masterMixer:box(document.querySelector('#master-session .master-controls')),masterRail:box(document.querySelector('#master-session .master-fader')),masterMeter:box(document.querySelector('#master-session .master-bars')),trackRail:box(document.querySelector('.track .gain-fader')),trackMeter:box(document.querySelector('.track .vertical-meter')),trackMixer:box(document.querySelector('.track-mixer')),workspace:box(document.querySelector('#session-workspace')),stop:box(document.querySelector('#stop')),scrollWidth:document.documentElement.scrollWidth,innerWidth:innerWidth};});
  expect(geometry.chrome).toBeLessThanOrEqual(80);expect(geometry.browser.width).toBe(220);expect(geometry.header.height).toBe(28);expect(geometry.master.width).toBe(128);expect(geometry.masterMixer.y).toBe(geometry.trackMixer.y);expect(geometry.masterMixer.bottom).toBe(geometry.trackMixer.bottom);expect(Math.abs(geometry.masterRail.y-geometry.trackRail.y)).toBeLessThanOrEqual(2);expect(Math.abs(geometry.masterRail.bottom-geometry.trackRail.bottom)).toBeLessThanOrEqual(2);expect(Math.abs(geometry.masterMeter.y-geometry.trackMeter.y)).toBeLessThanOrEqual(2);expect(Math.abs(geometry.masterMeter.bottom-geometry.trackMeter.bottom)).toBeLessThanOrEqual(3);expect(geometry.slots).toHaveLength(4);expect(geometry.scenes).toHaveLength(4);
  for(let i=0;i<4;i++){expect(geometry.slots[i].height).toBe(24);expect(geometry.scenes[i].y).toBe(geometry.slots[i].y);}expect(geometry.scrollWidth).toBe(geometry.innerWidth);expect(geometry.stop.right).toBeLessThan(size.width);
  for(const x of [0,99999]){await page.locator('#session-workspace').evaluate((e,x)=>e.scrollLeft=x,x);await expect(page.locator('#master-select-session')).toBeInViewport();}
  await page.locator('#session-workspace').evaluate(e=>e.scrollLeft=0);await page.mouse.move(500,10);await page.waitForTimeout(700);await page.screenshot({path:testInfo.outputPath(`master-session-${trackCount}-${size.width}.png`)});
  {await page.locator('#view-arrangement').click();const pos=await page.evaluate(()=>{const lane=document.querySelector('.timeline-lane').getBoundingClientRect(),header=document.querySelector('.timeline-header').getBoundingClientRect(),master=document.querySelector('#master-arrangement-lane').getBoundingClientRect();return {laneRight:lane.right,headerLeft:header.left,headerRight:header.right,viewportRight:document.querySelector('#timeline-scroll').getBoundingClientRect().right,masterY:master.y};});expect(pos.headerLeft).toBeGreaterThanOrEqual(pos.laneRight-1);expect(Math.abs(pos.headerRight-pos.viewportRight)).toBeLessThanOrEqual(1);expect(pos.masterY).toBeGreaterThan(0);await page.mouse.move(500,10);await page.waitForTimeout(700);await page.screenshot({path:testInfo.outputPath(`master-arrangement-${size.width}.png`)});}
});

test('both Master views share native gain, interval peaks, overload reset and local selection',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await openSession(page);
  const session=page.locator('#master-session'),arrangement=page.locator('#master-arrangement');
  await expect(session.getByLabel('Master left peak')).toHaveText('L 0.200');await expect(session.getByLabel('Master right peak')).toHaveText('R 1.200 !');
  const calls=()=>page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'));
  await page.locator('#master-select-session').click();await expect(page.locator('#master-detail')).toBeVisible();expect(await calls()).toEqual([]);
  const number=session.getByLabel('Master gain',{exact:true});await number.fill('0');await number.press('Tab');await expect(session.getByLabel('Master gain decibels')).toHaveText('-inf');await expect.poll(async()=>(await calls()).filter(c=>c.name==='alive_master').length).toBe(1);
  await session.getByRole('button',{name:'Reset Master gain to unity'}).click();await expect.poll(async()=>Number(await number.inputValue())).toBe(1);
  await session.getByRole('button',{name:'Reset Master digital overload'}).click();await expect(session.getByLabel('Master right peak')).toHaveText('R 1.200');
  await page.locator('#view-arrangement').click();await expect(arrangement.getByLabel('Master gain decibels')).toHaveText('0.0 dB');await expect(arrangement.getByLabel('Master left peak')).toHaveText('L 0.200');
  const fader=arrangement.getByLabel('Master gain fader');await fader.focus();await fader.press('ArrowUp');await expect.poll(async()=>(await calls()).filter(c=>c.name==='alive_master').length).toBe(3);
  const sends=await calls();expect(sends.filter(c=>c.name==='alive_master').map(c=>c.args.gain)).toEqual([0,1,1.01]);expect(sends.filter(c=>c.name==='alive_master_reset_clip')).toHaveLength(1);
});

test('vertical Session faders respond to real upward and downward pointer drags',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  for(const [label,container] of [['Pulse gain fader',page.locator('#session-workspace')],['Master gain fader',page.locator('#master-session')]]){
    const fader=container.getByLabel(label,{exact:true}),box=await fader.boundingBox();expect(box.height).toBeGreaterThan(45);
    await page.mouse.move(box.x+box.width/2,box.y+box.height*.8);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height*.2,{steps:8});await page.mouse.up();const high=Number(await fader.inputValue());
    await page.mouse.move(box.x+box.width/2,box.y+box.height*.2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height*.8,{steps:8});await page.mouse.up();const low=Number(await fader.inputValue());expect(high).toBeGreaterThan(low);
  }
});

test('Master pressure retains the final intent and reports reset refusal without claiming it saved',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await openSession(page);
  await page.evaluate(()=>{window.masterPending=[];window.masterGate=(name,args)=>new Promise((resolve,reject)=>window.masterPending.push({name,args,resolve,reject}));});
  const root=page.locator('#master-session'),number=root.getByLabel('Master gain',{exact:true}),reset=root.getByRole('button',{name:'Reset Master digital overload'}),status=root.getByLabel('Master output status');
  await number.fill('0.2');await number.press('Tab');await expect(status).toContainText('pending intent');await expect(status).toContainText('Saved target 0.0 dB');
  await reset.click();await number.fill('0.8');await number.press('Tab');await reset.click();await expect(status).toContainText('already pending');
  expect(await page.evaluate(()=>window.masterPending.map(p=>p.name))).toEqual(['alive_master']);
  await page.evaluate(()=>window.masterPending[0].resolve({generation:1,acceptedGain:.2,acceptedSerial:'2',changed:true}));await expect.poll(()=>page.evaluate(()=>window.masterPending.length)).toBe(2);
  expect(await page.evaluate(()=>window.masterPending[1].name)).toBe('alive_master_reset_clip');await page.evaluate(()=>window.masterPending[1].resolve({generation:1,acceptedSerial:'3'}));await expect.poll(()=>page.evaluate(()=>window.masterPending.length)).toBe(3);
  expect(await page.evaluate(()=>window.masterPending[2].args.gain)).toBe(.8);await page.evaluate(()=>window.masterPending[2].resolve({generation:1,acceptedGain:.8,acceptedSerial:'4',changed:true}));await expect(status).toContainText('admitted');
  await page.evaluate(()=>{const m=window.sessionSnapshot.master;m.gain=.8;m.acceptedSerial='4';m.observation.appliedSerial='4';m.observation.currentGain=.8;m.observation.targetGain=.8;});await expect(status).toContainText('applied -1.9 dB');
});

test('Master unavailable and stale observations remain explicit',async({page})=>{
  await openSession(page);const root=page.locator('#master-session'),status=root.getByLabel('Master output status');
  await page.evaluate(()=>{const m=window.sessionSnapshot.master;m.observationStale=true;m.observation.observationStartFrame=m.observation.observationEndFrame;});await expect(status).toContainText('stale observation');await expect(status).toContainText('empty interval');
  await page.evaluate(()=>{const m=window.sessionSnapshot.master;m.available=false;m.unavailableReason='Library lacks Master';m.observation=null;m.acceptedSerial='0';});await expect(status).toContainText('Library lacks Master');await expect(root.getByLabel('Master gain fader')).toBeDisabled();await expect(root.getByLabel('Master left peak')).toHaveText('L unavailable');
});

test('Master selection parks unfinished clip text and caret without a native edit',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  await page.locator('.clip-source-actions>summary').click();
  const input=page.getByLabel('Clip name',{exact:true});await input.fill('Unfinished clip');await input.evaluate(e=>e.setSelectionRange(3,7));
  await page.locator('#master-select-session').click();await expect(page.locator('#master-detail')).toBeVisible();await page.getByRole('button',{name:'Select Pulse slot 1',exact:true}).click();
  await expect(input).toHaveValue('Unfinished clip');expect(await input.evaluate(e=>[e.selectionStart,e.selectionEnd])).toEqual([3,7]);expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('browser and column widths resize locally and Master selection preserves device binding',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page,{longNames:true});
  await page.locator('#detail-devices').click();const parameter=page.locator('.chain-device[data-instance-id="instrument-0"]').getByLabel('Cutoff base',{exact:true});await parameter.fill('1777');
  await page.locator('#master-select-session').click();await expect(page.locator('#master-select-session')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#master-detail')).toBeVisible();
  const separator=page.getByRole('separator',{name:'Resize browser'});await separator.focus();await page.keyboard.press('End');await expect(separator).toHaveAttribute('aria-valuenow','420');expect(await page.locator('#workspace-browser').evaluate(e=>e.getBoundingClientRect().width)).toBe(420);
  await separator.press('Home');expect(await page.locator('#workspace-browser').evaluate(e=>e.getBoundingClientRect().width)).toBe(180);
  await page.locator('#transport-options-toggle').click();await page.locator('#track-width').fill('180');expect(await page.locator('.track').first().evaluate(e=>e.getBoundingClientRect().width)).toBe(180);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Select Pulse track',exact:true}).click();await expect(page.locator('#device-detail')).toBeVisible();await expect(parameter).toHaveValue('1777');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
});

test('Master numeric validation and double-click unity use the same admission path',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const root=page.locator('#master-session'),number=root.getByLabel('Master gain',{exact:true}),fader=root.getByLabel('Master gain fader');
  await number.fill('5');await number.press('Tab');await expect(page.getByRole('status',{name:'Session status'})).toContainText('between 0 and 4');expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_master'))).toHaveLength(0);
  await number.fill('0.25');await number.press('Tab');await expect(root.getByLabel('Master gain decibels')).toHaveText('-12.0 dB');
  await fader.dblclick();await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_master').at(-1)?.args.gain)).toBe(1);await expect(root.getByLabel('Master gain decibels')).toHaveText('0.0 dB');
});

test('Arrangement Master aligns with right track controls and source fields have visible context',async({page})=>{
  await openArrangement(page,{width:1440,height:900});await page.getByRole('button',{name:'Select placement p-0',exact:true}).click();await page.locator('.clip-source-actions>summary').click();
  const boxes=await page.evaluate(()=>{const rect=e=>e.getBoundingClientRect();const header=rect(document.querySelector('.timeline-header')),master=rect(document.querySelector('#master-arrangement-lane .master-heading')),controls=rect(document.querySelector('#master-arrangement'));return {headerLeft:header.left,masterLeft:master.left,controlsRight:controls.right,workspaceRight:rect(document.querySelector('#arrangement-workspace')).right};});
  expect(boxes.masterLeft).toBeGreaterThan(boxes.headerLeft-250);expect(Math.abs(boxes.controlsRight-boxes.workspaceRight)).toBeLessThanOrEqual(1);
  const detail=page.locator('#clip-controls');await expect(detail.getByText('Source name',{exact:true})).toBeVisible();await expect(detail.getByText('Source length',{exact:true})).toBeVisible();await expect(page.getByLabel('Placement source Start',{exact:true})).toBeVisible();await expect(detail.getByText('beats',{exact:true}).first()).toBeVisible();
});

test('returning from Master to the same Arrangement occurrence retains parked text',async({page})=>{
  await openArrangement(page,{width:1440,height:900});const placement=page.getByRole('button',{name:'Select placement p-0',exact:true});await placement.click();
  await page.locator('.clip-source-actions>summary').click();const name=page.getByLabel('MIDI source name',{exact:true});await name.fill('Unfinished source');await name.evaluate(e=>e.setSelectionRange(3,7));
  await page.locator('#master-select-arrangement').click();await placement.click();await expect(name).toHaveValue('Unfinished source');expect(await name.evaluate(e=>[e.selectionStart,e.selectionEnd])).toEqual([3,7]);expect(await workspaceEdits(page)).toHaveLength(0);
});

test('generation change visibly cancels a pending Master intent and ignores its late receipt',async({page})=>{
  await openSession(page);await page.evaluate(()=>{window.masterGate=(name,args)=>new Promise(resolve=>{window.finishMaster=resolve;});});
  const root=page.locator('#master-session'),number=root.getByLabel('Master gain',{exact:true}),notice=page.getByRole('status',{name:'Session status'});
  await number.fill('0.3');await number.press('Tab');await expect(notice).toContainText('pending');
  await page.evaluate(()=>{window.sessionSnapshot.generation=2;window.sessionSnapshot.snapshotSequence='2';});await expect(notice).toContainText('canceled');
  await page.evaluate(()=>window.finishMaster({generation:1,acceptedGain:.3,acceptedSerial:'2',changed:true}));await expect(root.getByLabel('Master gain decibels')).toHaveText('0.0 dB');await expect(notice).toContainText('canceled');
});

test('Arrangement Master markings and meter remain separate in the right-hand control group',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);await page.locator('#view-arrangement').click();
  const boxes=await page.evaluate(()=>{const rect=e=>e.getBoundingClientRect();const root=document.querySelector('#master-arrangement');return {marks:rect(root.querySelector('.master-marks')).toJSON(),markLabel:rect(root.querySelector('.master-marks span:first-child')).toJSON(),meter:rect(root.querySelector('.master-bars')).toJSON(),root:rect(root).toJSON(),button:rect(root.querySelector('.master-actions button:last-child')).toJSON()};});
  expect(boxes.marks.right).toBeLessThanOrEqual(boxes.meter.left);expect(boxes.markLabel.right).toBeLessThanOrEqual(boxes.meter.left);expect(boxes.meter.right).toBeLessThanOrEqual(boxes.root.right);expect(boxes.button.right).toBeLessThanOrEqual(boxes.root.right);
});

test('pointer-derived track gain remains readable in both mixer and Arrangement detail',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openSession(page);
  const slider=page.getByLabel('Pulse gain fader',{exact:true}),number=page.getByLabel('Pulse gain',{exact:true});const box=await slider.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height*.77);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height*.68);await page.mouse.up();await page.locator('#view-arrangement').click();
  const gain=page.getByLabel('Pulse Arrangement gain',{exact:true}),text=await gain.inputValue(),actual=await page.evaluate(()=>window.sessionSnapshot.document.tracks[0].gain);expect(text.length).toBeLessThanOrEqual(5);expect(Math.abs(Number(text)-actual)).toBeLessThanOrEqual(.0005);
  await page.locator('#view-session').click();const shown=await number.inputValue();expect(shown.length).toBeLessThanOrEqual(5);expect(Math.abs(Number(shown)-actual)).toBeLessThanOrEqual(.0005);
});

for(const size of [{width:1440,height:900},{width:1280,height:800},{width:1024,height:768},{width:800,height:600}])test(`launch quantization remains reachable in both workspaces at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page,{launchQuantization:true});
  const global=page.getByLabel('Launch Quantization',{exact:true}),clip=page.getByLabel('Clip Launch Quantization',{exact:true});
  await expect(global).toHaveValue('bar1');await expect(clip).toHaveValue('global');
  await global.selectOption('eighth');await clip.selectOption('none');
  await expect(page.getByLabel('Clip launch status',{exact:true})).toContainText('Effective: None');
  const calls=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_launch_settings'));
  expect(calls).toHaveLength(2);expect(calls[1].args.edit.occurrenceId).toBe(await page.evaluate(()=>window.sessionSnapshot.document.tracks[0].slots[0].id));
  await global.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');
  await expect(page.locator('#session-workspace')).toBeVisible();
  for(const view of ['session','arrangement']) {
    await page.locator(`#view-${view}`).click();await expect(global).toBeInViewport();await expect(page.locator('#stop')).toBeInViewport();
    await expect(page.locator(`#master-select-${view}`)).toBeInViewport();
    const bounds=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,selector:document.querySelector('#launch-quantization').getBoundingClientRect().toJSON(),stop:document.querySelector('#stop').getBoundingClientRect().toJSON()}));
    expect(bounds.width).toBeLessThanOrEqual(size.width);expect(bounds.height).toBeLessThanOrEqual(size.height);expect(bounds.selector.width).toBeGreaterThanOrEqual(64);expect(bounds.selector.left).toBeGreaterThan(bounds.stop.right);
    await page.screenshot({path:testInfo.outputPath(`launch-${view}-${size.width}x${size.height}.png`)});
  }
  expect(await page.evaluate(()=>window.calls.some(c=>['alive_transport','alive_workspace_action'].includes(c.name)))).toBe(false);
});

for(const size of [{width:1440,height:900},{width:800,height:600}])test(`device rack exposes independent controls and internal horizontal scrolling at ${size.width}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openSession(page);await page.locator('#detail-devices').click();
  const cards=page.locator('.chain-device');await expect(cards).toHaveCount(3);
  const bounds=await cards.evaluateAll(nodes=>nodes.map(e=>e.getBoundingClientRect().toJSON()));
  expect(bounds[1].x).toBeGreaterThan(bounds[0].x+bounds[0].width-1);expect(bounds[2].y).toBe(bounds[0].y);
  await page.screenshot({path:testInfo.outputPath(`device-rack-start-${size.width}.png`)});
  const instrument=cards.nth(0),filter=cards.nth(2);
  await expect(instrument.getByLabel('Cutoff base',{exact:true})).toBeVisible();
  await expect(filter.getByLabel('Cutoff base',{exact:true})).toHaveValue('1000');
  await instrument.getByLabel('Cutoff base',{exact:true}).fill('1717');
  await filter.locator('.chain-select').click();
  await expect(instrument.getByLabel('Cutoff base',{exact:true})).toHaveValue('1717');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_base'))).toEqual([]);
  await filter.getByLabel('Cutoff base',{exact:true}).fill('2345');await filter.getByLabel('Cutoff base',{exact:true}).press('Tab');
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_base').at(-1)?.args)).toMatchObject({instanceId:'stereo-lowpass',key:'cutoff',value:2345});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(size.width===800)expect(await page.locator('#chain').evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`device-rack-${size.width}.png`)});
});

test('rack drop insertion follows horizontal card midpoint even at its top edge',async({page})=>{
  await openSession(page,{audioTrack:true});
  await page.getByRole('treeitem',{name:'Stereo Utility',exact:true}).dragTo(page.locator('.track[data-track-id="track-2"]'));
  const first=page.locator('.chain-device').first(),box=await first.boundingBox();
  await page.getByRole('treeitem',{name:'Stereo Lowpass',exact:true}).dragTo(first,{targetPosition:{x:box.width-4,y:2}});
  await expect(first).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>window.sessionSnapshot.document.tracks[1].effects.map(e=>e.path))).toEqual(['utility.ultra','stereo-lowpass.ultra']);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_device').at(-1).args.beforeInstanceId)).toBe(null);
});

test('rack retains another track draft and opens the editor owned by an unselected card',async({page})=>{
  await openSession(page);await page.locator('#detail-devices').click();
  const instrument=page.locator('.chain-device[data-instance-id="instrument-0"]'),cutoff=instrument.getByLabel('Cutoff base',{exact:true});
  await cutoff.fill('1828');
  await page.getByRole('button',{name:'Select Harmony track',exact:true}).click();
  await page.getByRole('button',{name:'Select Pulse track',exact:true}).click();
  await expect(cutoff).toHaveValue('1828');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_base'))).toEqual([]);
  await cutoff.focus();await cutoff.press('Tab');
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_base').map(c=>c.args))).toEqual([{instanceId:'instrument-0',key:'cutoff',value:1828,generation:1}]);
  await page.getByRole('button',{name:'Edit Pulse Stereo Lowpass effect 2 in Ultra',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_editor').at(-1)?.args.instanceId)).toBe('stereo-lowpass');
});

for(const destination of ['Session slot','Arrangement track','Arrangement placement','Arrangement lane'])test(`rack draft survives ${destination} selection and commits once after returning`,async({page})=>{
  await openArrangement(page,{width:1280,height:800});
  if(destination==='Session slot')await page.locator('#view-session').click();
  await page.locator('#detail-devices').click();
  const cutoff=page.locator('.chain-device[data-instance-id="instrument-0"]').getByLabel('Cutoff base',{exact:true});
  await cutoff.evaluate(e=>window.retainedRackCutoff=e);await cutoff.fill('1828');
  if(destination==='Session slot'){
    await page.getByRole('button',{name:'Select Harmony slot 1',exact:true}).click();
    await page.getByRole('button',{name:'Select Pulse slot 1',exact:true}).click();
  }else{
    if(destination==='Arrangement track')await page.getByRole('button',{name:'Select Harmony Arrangement track',exact:true}).click();
    else if(destination==='Arrangement placement')await page.getByRole('button',{name:'Select placement p-1',exact:true}).click();
    else await page.locator('.timeline-row[data-track-id="track-2"] .timeline-lane').click({position:{x:300,y:40}});
    await page.getByRole('button',{name:'Select Pulse Arrangement track',exact:true}).click();
  }
  if(await page.locator('#device-detail').isHidden())await page.locator('#detail-devices').click();
  await expect(cutoff).toHaveValue('1828');expect(await cutoff.evaluate(e=>e===window.retainedRackCutoff)).toBe(true);
  const polls=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(polls+1);
  await expect(cutoff).toHaveValue('1828');expect(await page.evaluate(()=>window.calls.filter(c=>c.name!=='alive_current'))).toEqual([]);
  await cutoff.focus();await cutoff.press('Tab');
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_base').map(c=>c.args))).toEqual([{instanceId:'instrument-0',key:'cutoff',value:1828,generation:1}]);
});

test('detached rack draft blocks Save until its cached field is deliberately committed',async({page})=>{
  await openSession(page);await page.locator('#detail-devices').click();
  const cutoff=page.locator('.chain-device[data-instance-id="instrument-0"]').getByLabel('Cutoff base',{exact:true});
  await cutoff.evaluate(e=>window.retainedRackCutoff=e);await cutoff.fill('1828');
  await page.getByRole('button',{name:'Select Harmony track',exact:true}).click();await page.locator('#save').click();
  await expect(page.locator('#notice')).toContainText('Finish Cutoff base before using file actions');
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_base'||c.name==='alive_file'))).toEqual([]);
  await page.getByRole('button',{name:'Select Pulse track',exact:true}).click();
  expect(await cutoff.evaluate(e=>e===window.retainedRackCutoff)).toBe(true);await expect(cutoff).toHaveValue('1828');
  await cutoff.focus();await cutoff.press('Tab');
  await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_base').length)).toBe(1);
  await page.locator('#save').click();await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_file').map(c=>c.args.action))).toEqual(['save']);
});

test('removing the selected empty MIDI track rebuilds the rack for the audio track at the same index',async({page})=>{
  await openSession(page,{emptyDevices:true,audioTrack:true});await page.locator('#detail-devices').click();await expect(page.getByRole('button',{name:'Load instrument',exact:true})).toBeVisible();
  await page.evaluate(()=>{const s=window.sessionSnapshot;s.document.tracks.shift();s.document.sources=s.document.sources.filter(source=>source.trackId!== 'track-1');s.editRevision++;});
  await expect(page.locator('#chain-title')).toHaveText('Harmony chain');await expect(page.locator('#chain')).toHaveAttribute('data-track-id','track-2');await expect(page.getByRole('button',{name:'Load instrument',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_device'))).toEqual([]);
});

test('removing a track releases its detached cached rack and parked draft',async({page})=>{
  await openSession(page);await page.locator('#detail-devices').click();
  await page.locator('.chain-device[data-instance-id="instrument-0"]').getByLabel('Cutoff base',{exact:true}).fill('1828');
  await page.getByRole('button',{name:'Select Harmony track',exact:true}).click();
  await page.evaluate(()=>{const s=window.sessionSnapshot;s.document.tracks.splice(0,1);s.deviceInstances['instrument-1'].track=0;s.state.tracks.splice(0,1);s.editRevision++;});
  await expect(page.locator('#chain-title')).toHaveText('Harmony chain');await expect(page.locator('.track')).toHaveCount(1);
  await page.locator('#save').click();await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_file').map(c=>c.args.action))).toEqual(['save']);
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_base'))).toEqual([]);
});
