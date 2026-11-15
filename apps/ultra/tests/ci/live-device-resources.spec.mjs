import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

// Small, original layouts exercise the importer without copying Live XML.
const property=(tag,name,attributes)=>`<${tag} Name="${name}" ${attributes}/>`;
const node=(type,properties='',children='')=>`<PropertiesNode TargetClassName="${type}" Id=""><Categories><PropertiesCategory Name="View"><Properties>${properties}</Properties></PropertiesCategory></Categories><Children>${children}</Children></PropertiesNode>`;
const xml=body=>`<?xml version="1.0"?><Ableton>${body}</Ableton>`;
const embedded=scope=>node('EmbeddedLoadableView',property('ConnectionProperty','ConnectTo',`Value="${scope}"`)+`<LoadableViewResourceProperty Name="Resource"><Value><FixedLoadableViewResource><ResourceName Value="Osc"/></FixedLoadableViewResource></Value></LoadableViewResourceProperty>`);
const resources={
 'Devices/Example/Contents.xml':xml(node('LoadableView','',node('HorizBoxView','',embedded('SignalChain1')+embedded('SignalChain2')))),
 'Devices/Example/Osc.xml':xml(node('LoadableView','',node('VoidView',property('PointProperty','Size','X="170" Y="64"'),
   node('LoadableCombiSliderSmall',property('PointProperty','Size','X="40" Y="40"')+property('PointProperty','Position','X="10" Y="5"')+property('StringProperty','Label','Value="Level"')+property('ConnectionProperty','ConnectTo','Value="OscillatorLevel"'))+
   node('AnalogAdsrEnvelopeDisplay',property('PointProperty','Size','X="80" Y="50"')+property('PointProperty','Position','X="60" Y="5"')+property('ConnectionProperty','ConnectTo','Value="doc"')+property('ViewExpressionProperty','StateExpression','Value="Level &gt; 0 ? KEnabled : KIrrelevant"'))))),
};

async function mount(page,resources,verified=false){
 await page.goto('/analog-test.html');
 await page.evaluate(async({resources,verified})=>{
  const {loadLiveDeviceLayout}=await import('./live-device-layout.mjs');
  const {createLiveDeviceView}=await import('./live-device-view.mjs');
  const style=document.createElement('link');style.rel='stylesheet';style.href='./live-device-view.css';document.head.append(style);
  window.edits=[];
  const layout=loadLiveDeviceLayout({gui:{has:p=>p in resources,text:p=>resources[p]},path:'Devices/Example/Contents.xml'});
  window.resourceView=createLiveDeviceView(document,{layout,resolveBinding:binding=>verified&&binding.expression==='OscillatorLevel'&&binding.scope[0]==='SignalChain1'?{verified:true,min:0,max:10,value:3,onChange:value=>window.edits.push(value)}:null});
  document.body.append(window.resourceView.element);
 },{resources,verified});
}

test('imports embedded views with distinct model scopes and retained expressions',async({page})=>{
 await page.goto('/analog-test.html');
 const result=await page.evaluate(async resources=>{
  const {loadLiveDeviceLayout}=await import('./live-device-layout.mjs');
  const layout=loadLiveDeviceLayout({gui:{has:p=>p in resources,text:p=>resources[p]},path:'Devices/Example/Contents.xml'});
  return{documents:layout.documents,bindings:layout.bindings,expressions:layout.expressions};
 },resources);
 expect(result.documents).toHaveLength(2);
 expect(result.bindings.filter(b=>b.expression==='OscillatorLevel').map(b=>b.scope)).toEqual([['SignalChain1'],['SignalChain2']]);
 expect(result.bindings.filter(b=>b.expression==='doc').map(b=>b.scope)).toEqual([['SignalChain1'],['SignalChain2']]);
 expect(result.expressions).toHaveLength(2);expect(result.expressions[0].value).toContain('KIrrelevant');
});

test('renders original geometry through shared controls and disables unresolved bindings',async({page})=>{
 await mount(page,resources);
 await expect(page.locator('.live-device-view .live-control-dial')).toHaveCount(2);
 await expect(page.locator('.live-device-view input[type=range]:disabled')).toHaveCount(2);
 await expect(page.locator('.live-envelope-editor')).toHaveCount(2);
 await expect(page.locator('.live-envelope-editor svg[aria-disabled=true]')).toHaveCount(2);
 const geometry=await page.locator('.live-device-view [data-view-class="LoadableCombiSliderSmall"]').first().evaluate(e=>({width:e.getBoundingClientRect().width,left:e.style.left,top:e.style.top}));
 expect(geometry).toEqual({width:40,left:'10px',top:'5px'});
 expect(await page.locator('.live-device-view .live-control-dial').first().evaluate(e=>e.getBoundingClientRect().width)).toBeLessThanOrEqual(40);
});

test('only explicit verified bindings receive edits, and disposal releases listeners',async({page})=>{
 await mount(page,resources,true);
 const sliders=page.locator('.live-device-view input[type=range]');
 await expect(sliders.first()).toBeEnabled();await expect(sliders.nth(1)).toBeDisabled();
 await sliders.first().focus();await page.keyboard.press('End');
 expect(await page.evaluate(()=>window.edits)).toEqual([10]);
 await page.evaluate(()=>window.resourceView.dispose());await page.keyboard.press('Home');
 expect(await page.evaluate(()=>window.edits)).toEqual([10]);
});

test('rejects malformed XML, DTDs, resource cycles and unsafe embedded names',async({page})=>{
 await page.goto('/analog-test.html');
 const errors=await page.evaluate(async({resources,cycle})=>{
  const {loadLiveDeviceLayout}=await import('./live-device-layout.mjs');
  const run=resources=>{try{loadLiveDeviceLayout({gui:{has:p=>p in resources,text:p=>resources[p]},path:'Devices/Example/Contents.xml'});return 'accepted';}catch(e){return e.message;}};
  return [run({'Devices/Example/Contents.xml':'<Ableton>'}),run({'Devices/Example/Contents.xml':'<!DOCTYPE Ableton><Ableton/>'}),run({...resources,'Devices/Example/Osc.xml':cycle}),run({...resources,'Devices/Example/Contents.xml':resources['Devices/Example/Contents.xml'].replace('Value="Osc"','Value="../Osc"')})];
 },{resources,cycle:xml(node('LoadableView','',embedded('doc')))});
 expect(errors[0]).toMatch(/XML/i);expect(errors[1]).toMatch(/DTD|DOCTYPE/i);expect(errors[2]).toMatch(/cycle/i);expect(errors[3]).toMatch(/path|name/i);
});

test('resource picker reports invalid packs without pretending controls loaded',async({page})=>{
 await page.goto('/analog-test.html');
 await page.getByLabel('Live resource packs').setInputFiles({name:'GUI.alp',mimeType:'application/octet-stream',buffer:Buffer.from('not a pack')});
 await expect(page.locator('#live-resource-status')).toContainText('unsupported installed pack identity');
 await expect(page.locator('#live-resource-view .live-device-view')).toHaveCount(0);
});

test('grid settings position cells without overlapping and preserve spans',async({page})=>{
 const size=property('PointProperty','Size','X="30" Y="12"');
 const cells=node('TextField',size+property('StringProperty','Text','Value="First"'))+node('TextField',size+property('PointProperty','GridPosition','X="1" Y="1"')+property('StringProperty','Text','Value="Next"'));
 const wrapper=node('', '', cells).replace('Id=""','Id="ViewChildren"');
 const columns=node('',property('IntProperty','Gap','Value="3"')).replace('Id=""','Id="Columns"');
 const rows=node('',property('IntProperty','Gap','Value="2"')).replace('Id=""','Id="Rows"');
 await mount(page,{'Devices/Example/Contents.xml':xml(node('LoadableView','',node('GridLayoutView','',wrapper+columns+rows)))});
 const boxes=await page.locator('.live-device-view [data-view-class="TextField"]').evaluateAll(es=>es.map(e=>({x:e.offsetLeft,y:e.offsetTop,width:e.offsetWidth,height:e.offsetHeight})));
 expect(boxes).toEqual([{x:0,y:0,width:30,height:12},{x:33,y:14,width:30,height:12}]);
});

test('unresolved ancestor state expressions keep otherwise verified descendants disabled',async({page})=>{
 const altered={...resources,'Devices/Example/Contents.xml':resources['Devices/Example/Contents.xml'].replace('<Properties></Properties>',`<Properties>${property('ViewExpressionProperty','StateExpression','Value="Enabled ? KEnabled : KIrrelevant"')}</Properties>`)};
 await mount(page,altered,true);
 await expect(page.locator('.live-device-view input[type=range]:disabled')).toHaveCount(2);
});

test('reports compiled button managers instead of silently omitting generated controls',async({page})=>{
 await mount(page,{'Devices/Example/Contents.xml':xml(node('LoadableView','',node('RadioButtonControlManager',property('PointProperty','Size','X="150" Y="11"')+property('ConnectionProperty','ConnectTo','Value="SelectedPage"'))))});
 await expect(page.locator('.live-device-view [data-view-class="RadioButtonControlManager"]')).toHaveClass(/live-device-unimplemented/);
 expect(await page.evaluate(()=>window.resourceView.report.unsupportedClasses)).toContain('RadioButtonControlManager');
});

test('bounds aggregate property metadata across embedded documents',async({page})=>{
 await page.goto('/analog-test.html');
 const error=await page.evaluate(async()=>{
  const {loadLiveDeviceLayout}=await import('./live-device-layout.mjs');
  const resource=name=>`<PropertiesNode TargetClassName="EmbeddedLoadableView"><Categories><PropertiesCategory><Properties><LoadableViewResourceProperty Name="Resource"><Value><FixedLoadableViewResource><ResourceName Value="${name}"/></FixedLoadableViewResource></Value></LoadableViewResourceProperty></Properties></PropertiesCategory></Categories><Children/></PropertiesNode>`;
  const heavy=next=>`<Ableton><PropertiesNode TargetClassName="LoadableView"><Categories><PropertiesCategory><Properties><DataProperty Name="Metadata">${'<Slot X="1"/>'.repeat(17000)}</DataProperty></Properties></PropertiesCategory></Categories><Children>${next?resource(next):''}</Children></PropertiesNode></Ableton>`;
  const resources={'Devices/Example/Contents.xml':heavy('B'),'Devices/Example/B.xml':heavy('C'),'Devices/Example/C.xml':heavy('')};
  try{loadLiveDeviceLayout({gui:{has:p=>p in resources,text:p=>resources[p]},path:'Devices/Example/Contents.xml'});return 'accepted';}catch(e){return e.message;}
 });
 expect(error).toMatch(/property.*limit|property.*budget/i);
});

test('oversized embedded content scrolls inside its declared panel bounds',async({page})=>{
 const original=resources['Devices/Example/Contents.xml'];
 await mount(page,{...resources,'Devices/Example/Contents.xml':original.replace('<ConnectionProperty Name="ConnectTo"',`${property('PointProperty','Size','X="85" Y="20"')}<ConnectionProperty Name="ConnectTo"`)});
 const viewport=page.locator('.live-device-view [data-view-class="EmbeddedLoadableView"]').first();
 const box=await viewport.evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,scrollHeight:e.scrollHeight,overflow:getComputedStyle(e).overflow}));
 expect(box.width).toBe(85);expect(box.height).toBe(20);expect(box.scrollHeight).toBeGreaterThan(20);expect(box.overflow).toBe('auto');
});

test('installed Analog pack builds all embedded panels and keeps audio controls separate',async({page})=>{
 test.skip(!process.env.LIVE_RESOURCE_DIR,'Requires privately installed, exact-profile Live resource packs.');
 await page.goto('/analog-test.html');
 await page.getByLabel('Live resource packs').setInputFiles(await Promise.all(['GUI','Graphics'].map(async kind=>({name:kind+'.alp',mimeType:'application/octet-stream',buffer:await readFile(path.join(process.env.LIVE_RESOURCE_DIR,kind+'.alp'))}))));
 await expect(page.locator('#live-resource-status')).toContainText('Original panel loaded');
 await expect(page.locator('#live-resource-view .live-device-view')).toHaveCount(1);
 await expect(page.locator('#live-resource-view .live-control-dial')).toHaveCount(20);
 expect(await page.locator('#live-resource-view input:enabled,#live-resource-view select:enabled').count()).toBe(0);
 expect(await page.locator('#live-resource-view [data-view-class="EmbeddedLoadableView"]').count()).toBeGreaterThan(17);
 await expect(page.locator('#keyboard')).toBeVisible();
 const detail=page.locator('#live-resource-view [data-view-id="Inspector"]');
 await expect(detail.locator(':scope > :visible')).toHaveCount(1);
 const fingers=page.locator('#live-resource-view .live-device-finger');
 await fingers.last().press('Enter');
 await expect(detail.locator(':scope > :visible')).toHaveCount(1);
 expect(await detail.locator(':scope > :visible [data-view-class="AnalogPitchEnvelopeDisplay"]').count()).toBe(0);
 await page.setViewportSize({width:360,height:700});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('native bindings enable an existing panel and refresh linked controls and toggle gates',async({page})=>{
 await page.goto('/analog-test.html');
 await page.evaluate(async resources=>{
  const {loadLiveDeviceLayout}=await import('./live-device-layout.mjs');
  const {createLiveDeviceView}=await import('./live-device-view.mjs');
  const {createAnalogBindings}=await import('./analog-bindings.mjs');
  const p=(index,module,property,kind=0,value=.5)=>({index,module,property,kind,min:0,max:1,value,applied:value,revision:1,applied_revision:1});
  window.catalog={generation:'7',parameters:[p(45,3514,1),p(128,3522,1),p(28,3513,65535,3,1)]};window.edits=[];
  window.bindings=createAnalogBindings({send:async c=>{window.edits.push(c);return{...window.catalog.parameters.find(p=>p.index===c.index),value:c.value,revision:2};},onChange:()=>window.resourceView?.refresh()});
  const layout=loadLiveDeviceLayout({gui:{has:p=>p in resources,text:p=>resources[p]},path:'Devices/Example/Contents.xml'});
  window.resourceView=createLiveDeviceView(document,{layout,resolveBinding:window.bindings.resolve,evaluateExpression:window.bindings.evaluate});
  document.body.append(window.resourceView.element);
 },{...resources,'Devices/Example/Osc.xml':xml(node('LoadableView','',
  node('LoadableCheckControlText',property('StringProperty','TrueText','Value="On"')+property('ConnectionProperty','ConnectTo','Value="OscillatorToggle"'))+
  node('VertBoxView',property('ViewExpressionProperty','StateExpression','Value="OscillatorToggle ? KEnabled : KIrrelevant"'),
   node('LoadableCombiSliderSmall',property('StringProperty','Label','Value="Level"')+property('ConnectionProperty','ConnectTo','Value="OscillatorLevel"'))+
   node('LoadableSliderEditField',property('StringProperty','Label','Value="Linked level"')+property('ConnectionProperty','ConnectTo','Value="OscillatorLevel"')))))});
 const knobs=page.locator('.live-device-view input[type=range]'),linked=page.locator('.live-device-view input[aria-label="Linked level"]');
 await expect(knobs.first()).toBeDisabled();await page.evaluate(()=>window.bindings.connect(window.catalog));
 await expect(knobs.first()).toBeEnabled();await expect(knobs.nth(1)).toBeDisabled(); // second toggle not in catalog
 await knobs.first().focus();await page.keyboard.press('End');
 await expect(linked.first()).toHaveValue('9.5 dB');
 expect(await page.evaluate(()=>window.edits)).toEqual([{generation:'7',index:45,value:1}]);
 await page.evaluate(()=>window.bindings.observe(window.catalog));await expect(knobs.first()).toHaveValue('1');
 await knobs.first().dblclick();await expect(knobs.first()).toHaveValue('0.5');await expect(linked.first()).toHaveValue('-15 dB');
 await page.locator('.live-device-view button.live-toggle').first().click();await expect(knobs.first()).toBeDisabled();
 await page.locator('.live-device-view button.live-toggle').first().click();await expect(knobs.first()).toBeEnabled();
 await linked.first().fill('-30 dB');await linked.first().press('Enter');
 const expected=await page.evaluate(async()=>{const {analogParameterDisplay}=await import('./analog-parameter-display.mjs');return analogParameterDisplay('SignalChain1.OscillatorLevel').parse('-30 dB');});
 await expect.poll(async()=>Number(await knobs.first().inputValue())).toBeCloseTo(expected,10);
 await linked.first().fill('0.9');
 await page.evaluate(()=>window.bindings.disconnect());await expect(knobs.first()).toBeDisabled();
 await page.evaluate(()=>window.bindings.connect({...window.catalog,generation:'8'}));await expect(knobs.first()).toHaveValue('0.5');
 await expect(linked.first()).toHaveValue('-15 dB');
 expect(await page.evaluate(()=>window.edits.some(c=>c.value===.9))).toBe(false);
});

test('installed Analog controls send scoped native edits through the host IPC',async({page})=>{
 test.skip(!process.env.LIVE_RESOURCE_DIR,'Requires privately installed, exact-profile Live resources.');
 await page.addInitScript(()=>{
  let running=false,generation=0,parameters=[];window.parameterEdits=[];window.batchEdits=[];
  window.__TAURI__={core:{invoke:async(name,args={})=>{
   if(name==='analog_test_resource_pack')throw Error('Select installed packs for this browser test.');
   if(name==='analog_test_start'){
    running=true;generation++;
    const {analogParameterFacts}=await import('./analog-parameter-facts.mjs');
    parameters=[...analogParameterFacts.map(([,index,module,property,kind,min,max])=>({index,module,property,kind,min,max,value:kind===3?(max===1?1:min):(min+max)/2,applied:0,revision:1,applied_revision:1})),
     {index:39,module:3513,property:10,kind:0,min:0,max:1,value:.5,applied:.5,revision:1,applied_revision:1},
     {index:40,module:3513,property:16,kind:3,min:0,max:1,value:0,applied:0,revision:1,applied_revision:1}];return;
   }
   if(name==='analog_test_parameters')return{generation:String(generation),parameters};
   if(name==='analog_test_parameter'){
    window.parameterEdits.push(args);const p=parameters.find(p=>p.index===args.index);p.value=p.applied=args.value;p.revision++;p.applied_revision=p.revision;return{...p};
   }
   if(name==='analog_test_parameter_batch'){
    window.batchEdits.push(args);const changed=args.values.map(v=>{const p=parameters.find(p=>p.index===v.index);p.value=p.applied=v.value;p.revision++;p.applied_revision=p.revision;return{...p};});
    return{generation:String(generation),parameters:changed};
   }
   if(name==='analog_test_stop'){running=false;return;}
   if(name==='analog_test_note')return running;
   if(name==='analog_test_status')return{running,fault:false,frames:'24000',peak:.1,output:'Audio output',controls:{generation:String(generation),parameters}};
  }}};
 });
 await page.goto('/analog-test.html');
 await page.getByLabel('Live resource packs').setInputFiles(await Promise.all(['GUI','Graphics'].map(async kind=>({name:kind+'.alp',mimeType:'application/octet-stream',buffer:await readFile(path.join(process.env.LIVE_RESOURCE_DIR,kind+'.alp'))}))));
 await expect(page.locator('#live-resource-status')).toContainText('Original panel loaded');
 const knob=index=>page.locator(`#live-resource-view [data-view-class="LoadableCombiSliderSmall"][data-binding*="${index}"] input[type=range]`);
 const cutoff=knob('FilterCutoffFrequency').first(),volume=knob('Volume').first();
 await expect(cutoff).toBeDisabled();await page.getByRole('button',{name:'Start audio',exact:true}).click();
 await expect(cutoff).toBeEnabled();await cutoff.focus();await cutoff.press('Home');
 await expect.poll(()=>page.evaluate(()=>window.parameterEdits.some(c=>c.index===52&&c.value===0))).toBe(true);
 await volume.focus();await volume.press('End');
 await expect.poll(()=>page.evaluate(()=>window.parameterEdits.some(c=>c.index===2&&c.value===1))).toBe(true);
 const modules=page.locator('#live-resource-view .live-device-module'),inspector=page.locator('#live-resource-view [data-view-id="Inspector"]');
 const attack=inspector.locator('[data-handle="attack"]:visible');
 for(const [module,index] of [[1,93],[2,105],[4,176],[5,188]]){
  await modules.nth(module).locator('input[type=range]').first().focus();
  await expect(attack).toBeVisible();await attack.focus();await attack.press('End');
  await expect.poll(()=>page.evaluate(index=>window.parameterEdits.some(c=>c.index===index&&c.value===1),index)).toBe(true);
  const loop=inspector.locator('[data-view-class="LoadableDisplayChooser"][data-binding*="Loop"]:visible');
  const bounds=await loop.evaluate(e=>({right:e.getBoundingClientRect().right,panel:e.closest('[data-view-id="Inspector"]').getBoundingClientRect().right}));
  expect(bounds.right).toBeLessThanOrEqual(bounds.panel);
 }
 await modules.first().locator('input[type=range]').first().focus();
 const pitch=inspector.locator('[data-handle="initial"]:visible');await pitch.focus();await pitch.press('Home');
 await expect.poll(()=>page.evaluate(()=>window.batchEdits.at(-1))).toEqual({generation:'1',values:[{index:39,value:1},{index:40,value:1}]});
 await modules.last().locator('.live-device-finger').press('Enter');
 await inspector.getByRole('radio',{name:'MPE',exact:true}).click();
 await expect(inspector.getByText('Note PB',{exact:true})).toBeVisible();
 await inspector.getByRole('radio',{name:'Global',exact:true}).click();
 await expect(inspector.getByText('Keyboard',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Stop / Silence',exact:true}).click();await expect(cutoff).toBeDisabled();
 await modules.first().locator('.live-device-finger').press('Enter');await expect(pitch).toHaveAttribute('aria-disabled','true');
 await page.getByRole('button',{name:'Start audio',exact:true}).click();await expect(cutoff).toBeEnabled();
 await cutoff.focus();await cutoff.press('End');
 await expect.poll(()=>page.evaluate(()=>window.parameterEdits.at(-1))).toEqual({generation:'2',index:52,value:1});
});
