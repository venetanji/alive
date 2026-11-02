import {test,expect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';

test.beforeEach(async({page})=>{
  await page.route('**/electric-widget-host',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><head><link rel="stylesheet" href="/live-controls.css"><link rel="stylesheet" href="/live-device-view.css"></head><body style="margin:0;padding:16px;background:#e5e5dc"></body>'}));
  await page.goto('/electric-widget-host');
});

test('border layout retains its row title and reserves the resource fixed width',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {loadLiveDeviceLayout}=await import('/live-device-layout.mjs');
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    const xml='<Ableton><PropertiesNode TargetClassName="HorizBoxView"><Categories/><Children><PropertiesNode TargetClassName="BorderLayoutView"><Categories><Category><Properties><ResizePolicyProperty Name="DefaultHorizResizePolicy" PolicyName="FixedLength" Value1="132" Value2="0"/></Properties></Category></Categories><Children><PropertiesNode TargetClassName="TextField"><Categories><Category><Properties><LocalizedStringProperty Name="Text" Value="Stiffness"/></Properties></Category></Categories><Children/></PropertiesNode></Children></PropertiesNode><PropertiesNode TargetClassName="TextField"><Categories><Category><Properties><LocalizedStringProperty Name="Text" Value="Vel"/></Properties></Category></Categories><Children/></PropertiesNode></Children></PropertiesNode></Ableton>';
    const layout=loadLiveDeviceLayout({gui:{has:()=>false,text:()=>xml},path:'Devices/Example/Contents.xml'});
    const view=createLiveDeviceView(document,{layout});document.body.append(view.element);
    const title=view.element.querySelector('[data-view-class=BorderLayoutView]'),next=title.nextElementSibling;
    return {text:title.textContent,childCount:title.querySelectorAll('[data-view-class=TextField]').length,
      width:title.getBoundingClientRect().width,nextOffset:next.getBoundingClientRect().left-title.getBoundingClientRect().left,
      unsupported:view.report.unsupportedClasses};
  });
  expect(result).toEqual({text:'Stiffness',childCount:1,width:132,nextOffset:132,unsupported:[]});
});

test('module navigation announces each visible heading',async({page})=>{
  const names=await page.evaluate(async()=>{
    const {loadLiveDeviceLayout}=await import('/live-device-layout.mjs');
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    return ['Oscillator','Filter'].map((title,index)=>{
      const xml=`<Ableton><PropertiesNode TargetClassName="FingerView"><Categories><Category><Properties><ConnectionProperty Name="ConnectTo" Value="SelectedFinger"/><ViewExpressionProperty Name="IndexExpression" Value="${index}"/></Properties></Category></Categories><Children><PropertiesNode TargetClassName="BorderedCellView"><Categories/><Children><PropertiesNode TargetClassName="TextField"><Categories><Category><Properties><StringProperty Name="Text" Value="${title}"/></Properties></Category></Categories><Children/></PropertiesNode></Children></PropertiesNode></Children></PropertiesNode></Ableton>`;
      const layout=loadLiveDeviceLayout({gui:{has:()=>false,text:()=>xml},path:'Devices/Example/Contents.xml'});
      const view=createLiveDeviceView(document,{layout});document.body.append(view.element);
      return view.element.querySelector('.live-device-finger').getAttribute('aria-label');
    });
  });
  expect(names).toEqual(['Show Oscillator details','Show Filter details']);
});

test('border layout default width is bounded, class specific and yields to its explicit policy',async({page})=>{
  const widths=await page.evaluate(async()=>{
    const {loadLiveDeviceLayout}=await import('/live-device-layout.mjs');
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    return [['BorderLayoutView','132','80'],['BorderLayoutView','5000',null],['BorderLayoutView','-1',null],['BorderLayoutView','invalid',null],['LoadableView','132',null]].map(([type,length,explicit])=>{
      const xml=`<Ableton><PropertiesNode TargetClassName="${type}"><Categories><Category><Properties><PointProperty Name="Size" X="25" Y="15"/><ResizePolicyProperty Name="DefaultHorizResizePolicy" PolicyName="FixedLength" Value1="${length}" Value2="0"/>${explicit?`<ResizePolicyProperty Name="HorizResizePolicy" PolicyName="FixedLength" Value1="${explicit}" Value2="0"/>`:''}</Properties></Category></Categories><Children/></PropertiesNode></Ableton>`;
      const layout=loadLiveDeviceLayout({gui:{has:()=>false,text:()=>xml},path:'Devices/Example/Contents.xml'});
      const view=createLiveDeviceView(document,{layout});document.body.append(view.element);
      return view.element.firstElementChild.getBoundingClientRect().width;
    });
  });
  expect(widths).toEqual([80,25,25,25,25]);
});

test('composite dial consumes only its evidenced decoration and keeps unqualified values disabled',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {loadLiveDeviceLayout}=await import('/live-device-layout.mjs');
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    const properties='<PointProperty Name="Size" X="51" Y="48"/><StringProperty Name="Name" Value="Stiffness"/><ConnectionProperty Name="ConnectTo" Value="Example"/>';
    const poti='<PropertiesNode TargetClassName="ModulatedPoti" Id="Slider"><Categories><Category><Properties><PointProperty Name="Size" X="27" Y="27"/></Properties></Category></Categories><Children/></PropertiesNode>';
    const xml=`<Ableton><PropertiesNode TargetClassName="LoadableCombiSlider"><Categories><Category><Properties>${properties}</Properties></Category></Categories><Children>${poti}</Children></PropertiesNode></Ableton>`;
    const layout=loadLiveDeviceLayout({gui:{has:()=>false,text:()=>xml},path:'Devices/Example/Contents.xml'});
    let writes=0;
    const view=createLiveDeviceView(document,{layout,resolveBinding:()=>({verified:false,getState:()=>({known:true,enabled:false,value:.5}),display:{format:()=>'--',parse:()=>NaN},onChange:()=>writes++})});
    document.body.append(view.element);
    const dial=view.element.querySelector('.live-dial'),input=view.element.querySelector('input[type=range]');
    for(const element of view.element.querySelectorAll('input'))element.dispatchEvent(new Event('change',{bubbles:true}));
    return {report:view.report,label:view.element.querySelector('.live-label')?.textContent,
      values:[...view.element.querySelectorAll('.live-value')].map(e=>e.value),
      inputs:[...view.element.querySelectorAll('input')].map(e=>e.disabled),
      size:dial?{width:dial.getBoundingClientRect().width,height:dial.getBoundingClientRect().height}:null,
      positionHidden:dial?getComputedStyle(dial.querySelector('.live-dial-needle')).visibility:null,
      positionText:input?.getAttribute('aria-valuetext'),writes,
      decorations:view.element.querySelectorAll('[data-view-class=ModulatedPoti]').length};
  });
  expect(result.report.controls).toBe(1);
  expect(result.report.unresolved).toBe(1);
  expect(result.report.unsupportedClasses).toEqual([]);
  expect(result.label).toBe('Stiffness');
  expect(result.values).toEqual(['--']);
  expect(result.inputs).toEqual([true,true]);
  expect(result.size).toEqual({width:27,height:27});
  expect(result.positionHidden).toBe('hidden');
  expect(result.positionText).toBe('Unresolved dial position');
  expect(result.decorations).toBe(0);
  expect(result.writes).toBe(0);
});

test('unknown composite structure and standalone poti retain unsupported reporting',async({page})=>{
  const reports=await page.evaluate(async()=>{
    const {loadLiveDeviceLayout}=await import('/live-device-layout.mjs');
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    return ['LoadableCombiSlider','ModulatedPoti'].map(type=>{
      const xml=`<Ableton><PropertiesNode TargetClassName="${type}"><Categories/><Children/></PropertiesNode></Ableton>`;
      const layout=loadLiveDeviceLayout({gui:{has:()=>false,text:()=>xml},path:'Devices/Example/Contents.xml'});
      return createLiveDeviceView(document,{layout}).report;
    });
  });
  expect(reports[0].unsupportedClasses).toContain('LoadableCombiSlider');
  expect(reports[0].controls).toBe(0);
  expect(reports[1].unsupportedClasses).toContain('ModulatedPoti');
});

test('PickupModel has disabled R/W radio structure without inventing enum selection',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {loadLiveDeviceLayout}=await import('/live-device-layout.mjs');
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    const xml='<Ableton><PropertiesNode TargetClassName="RadioButtonControlManager"><Categories><Category><Properties><PointProperty Name="Size" X="33" Y="15"/><PointProperty Name="ButtonSize" X="31" Y="15"/><BoolProperty Name="IsVertical" Value="true"/><ConnectionProperty Name="ConnectTo" Value="PickupModel.Current"/></Properties></Category></Categories><Children/></PropertiesNode></Ableton>';
    const layout=loadLiveDeviceLayout({gui:{has:()=>false,text:()=>xml},path:'Devices/LoungeLizard/Contents.xml'});
    const view=createLiveDeviceView(document,{layout,resolveBinding:()=>({verified:false,getState:()=>({known:true,enabled:false,value:0})})});document.body.append(view.element);
    const group=view.element.querySelector('[role=radiogroup]');
    return {report:view.report,orientation:group?.getAttribute('aria-orientation'),
      options:[...view.element.querySelectorAll('[role=radio]')].map(e=>({text:e.textContent,checked:e.getAttribute('aria-checked'),disabled:e.disabled,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))};
  });
  expect(result.report.controls).toBe(1);
  expect(result.report.unsupportedClasses).toEqual([]);
  expect(result.orientation).toBe('vertical');
  expect(result.options).toEqual(['R','W'].map(text=>({text,checked:'false',disabled:true,width:31,height:15})));
});

test('private Electric controls retain resource geometry, disabled bindings and usable module navigation',async({page})=>{
  test.skip(!process.env.ALIVE_ELECTRIC_WIDGET_FIXTURES,'Requires the verified private Electric r6 resources.');
  const fixtures=JSON.parse(await readFile(process.env.ALIVE_ELECTRIC_WIDGET_FIXTURES,'utf8'));
  const report=await page.evaluate(async({resources,pngs,xml})=>{
    const {loadLiveDeviceLayout}=await import('/live-device-layout.mjs');
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    const {parseElectricDefaultPresetXml}=await import('/live-profiles/electric/default-model.mjs');
    const {createElectricBindings}=await import('/live-profiles/electric/bindings.mjs');
    const layout=loadLiveDeviceLayout({gui:{has:key=>Object.hasOwn(resources,key),text:key=>resources[key]},path:'Devices/LoungeLizard/Contents.xml'});
    const parsed=parseElectricDefaultPresetXml(xml),bindings=createElectricBindings({modelValues:parsed.values});
    const view=createLiveDeviceView(document,{layout,graphics:{has:key=>Object.hasOwn(pngs,key),read:key=>Uint8Array.from(pngs[key])},resolveBinding:bindings.resolve,evaluateExpression:bindings.evaluate});
    const viewport=document.createElement('div');viewport.className='live-resource-viewport';viewport.append(view.element);document.body.append(viewport);window.widgetView=view;
    return view.report;
  },fixtures);
  expect(report.controls).toBe(33);
  expect(report.unresolved).toBe(0);
  expect(report.unsupportedClasses).not.toContain('LoadableCombiSlider');
  expect(report.unsupportedClasses).not.toContain('ModulatedPoti');
  expect(report.unsupportedClasses).not.toContain('RadioButtonControlManager');
  expect(report.unsupportedClasses).not.toContain('BorderLayoutView');
  const titles=page.locator('[data-view-class=BorderLayoutView]');
  expect(await titles.allTextContents()).toEqual(['Stiffness','Force','Noise','Tine','Tone','Damper','Pickup','Keyboard']);
  expect(await titles.evaluateAll(elements=>elements.map(e=>e.getBoundingClientRect().width||Number.parseFloat(e.style.width)))).toEqual([132,64,64,64,64,64,64,64]);
  await expect(page.locator('.live-device-combi .live-dial')).toHaveCount(6);
  await expect(page.locator('.live-device-control input:not(:disabled),.live-device-control button:not(:disabled),.live-device-control select:not(:disabled)')).toHaveCount(0);
  expect(await page.locator('.live-device-combi .live-label').allTextContents()).toEqual(['Stiffness','Noise','Tine','Tone','Symmetry','Volume']);
  expect(await page.locator('.live-device-combi .live-value').evaluateAll(inputs=>inputs.map(e=>e.value))).toEqual(['50 %','50 %','50 %','50 %','50 %','0.0 dB']);
  const fingers=page.locator('button.live-device-finger');
  expect(await fingers.evaluateAll(elements=>elements.map(e=>e.getAttribute('aria-label')))).toEqual(['Show Hammer details','Show Fork details','Show Damper / Pickup details','Show Global details']);
  for(let index=0;index<4;index++){
    await page.locator('[data-view-class=FingerView]').nth(index).click();
    await expect(fingers.nth(index)).toHaveAttribute('aria-pressed','true');
    await fingers.nth(index).focus();await fingers.nth(index).press('Enter');
    await expect(fingers.nth(index)).toHaveAttribute('aria-pressed','true');
  }
  await fingers.first().focus();await fingers.first().press('Enter');
  if(process.env.ALIVE_ELECTRIC_WIDGET_OUTPUT){
    await mkdir(process.env.ALIVE_ELECTRIC_WIDGET_OUTPUT,{recursive:true});
    await writeFile(join(process.env.ALIVE_ELECTRIC_WIDGET_OUTPUT,'renderer-report.json'),JSON.stringify(report,null,2)+'\n');
    for(const [width,height]of [[390,844],[800,600],[1280,800],[1440,900]]){
      await page.setViewportSize({width,height});
      const geometry=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth,
        dials:[...document.querySelectorAll('.live-device-combi .live-dial')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),
        readoutAlignments:[...document.querySelectorAll('.live-device-combi .live-value')].map(e=>getComputedStyle(e).textAlign)}));
      expect(geometry.body).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.dials).toEqual(Array(6).fill({width:27,height:27}));
      expect(geometry.readoutAlignments).toEqual(Array(6).fill('center'));
      await page.screenshot({path:join(process.env.ALIVE_ELECTRIC_WIDGET_OUTPUT,`electric-widgets-${width}x${height}.png`)});
    }
  }
});
