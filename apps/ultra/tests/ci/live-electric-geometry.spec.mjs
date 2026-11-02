import {test,expect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';

test.beforeEach(async({page})=>{
  await page.route('**/electric-geometry-host',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><head><link rel="stylesheet" href="/live-controls.css"><link rel="stylesheet" href="/live-device-view.css"></head><body style="margin:0;padding:16px;background:#e5e5dc"></body>'}));
  await page.goto('/electric-geometry-host');
});

test('embedded preferred height preserves content and respects explicit fixed constraints',async({page})=>{
  const heights=await page.evaluate(async()=>{
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    const size=(x,y)=>({tag:'PointProperty',attributes:{X:String(x),Y:String(y)}});
    const node=(className,properties)=>({className,properties,resource:'Devices/Example/Contents.xml',scope:[],children:[],text:()=>''});
    return [[98,null],[64,null],[98,80]].map(([content,fixed])=>{
      const root=node('EmbeddedLoadableView',{Size:size(330,80),...(fixed?{VertResizePolicy:{attributes:{PolicyName:'FixedLength',Value1:String(fixed)}}}:{})});
      root.embedded=node('VoidView',{Size:size(262,content)});
      const view=createLiveDeviceView(document,{layout:{root,warnings:[]}});document.body.append(view.element);
      return view.element.firstElementChild.getBoundingClientRect().height;
    });
  });
  expect(heights).toEqual([98,80,80]);
});

test('resource padding fills the detail height and retains invalid-inset diagnostics',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {loadLiveDeviceLayout}=await import('/live-device-layout.mjs');
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    const render=(insets,height)=>{
      const xml=`<Ableton><PropertiesNode TargetClassName="BorderedCellView" Id="Detail"><Categories><Category><Properties><BorderProperty Name="Border" ${insets}/></Properties></Category></Categories><Children><PropertiesNode TargetClassName="VoidView"><Categories><Category><Properties><PointProperty Name="Size" X="248" Y="${height}"/></Properties></Category></Categories><Children/></PropertiesNode></Children></PropertiesNode></Ableton>`;
      const layout=loadLiveDeviceLayout({gui:{has:()=>false,text:()=>xml},path:'Devices/Example/Contents.xml'});
      const view=createLiveDeviceView(document,{layout});document.body.append(view.element);
      const cell=view.element.firstElementChild,box=cell.getBoundingClientRect();
      const result={padding:cell.style.padding,width:box.width,height:box.height,diagnostics:view.report.unsupportedProperties};
      view.dispose();view.element.remove();return result;
    };
    return {fork:render('Top="0" Right="0" Bottom="33" Left="0"',65),
      global:render('Top="3" Right="5" Bottom="36" Left="3"',59),
      row:render('Top="3" Right="17" Bottom="3" Left="3"',26),
      invalid:render('Top="invalid" Right="-1" Bottom="65" Left="1e309"',26)};
  });
  expect(result.fork).toMatchObject({padding:'0px 0px 33px',width:248,height:98,diagnostics:[]});
  expect(result.global).toMatchObject({padding:'3px 5px 36px 3px',width:256,height:98,diagnostics:[]});
  expect(result.row).toMatchObject({padding:'3px 17px 3px 3px',width:268,height:32,diagnostics:[]});
  expect(result.invalid).toMatchObject({padding:'0px 0px 64px',width:248,height:90});
  expect(result.invalid.diagnostics.map(({property,applied})=>({property,applied}))).toEqual([
    {property:'Border.Top',applied:0},{property:'Border.Right',applied:0},
    {property:'Border.Bottom',applied:64},{property:'Border.Left',applied:0},
  ]);
});

test('exact private Electric detail backgrounds fill all four resource pages',async({page})=>{
  test.skip(!process.env.ALIVE_ELECTRIC_WIDGET_FIXTURES,'Requires verified private Electric r6 resources.');
  const fixtures=JSON.parse(await readFile(process.env.ALIVE_ELECTRIC_WIDGET_FIXTURES,'utf8'));
  const pins={
    Contents:'bfaf96caf9550bee0a0cbb43c3182425b512bf9a03e0f71e9b802b430310daf1',
    ForkDetail:'97c73383d37740256e6bc35ccd3f7c3b9733826aef57e1f3f623aa70d2495564',
    GlobalDetail:'fcfd4721108c82372181f51b400ad60f16fe50beab99d9bf9f65e0a1f94c96a7',
    HammerDetail:'162f663532171137470221b50d0dcb866f1cd55ed3a43247eb164534c33a1749',
    PickupDamperDetail:'dfbc8d8cf370b6bc8dd2f017ab62ce448a1e88d8ea3f176c8618d84b453caa87',
    RightTitleControls:'727873787372626b9d63a25e2f4eac02ce1fd71a0289d3c761a0ef17131cf917',
  };
  for(const [name,sha]of Object.entries(pins))expect(createHash('sha256').update(fixtures.resources[`Devices/LoungeLizard/${name}.xml`]).digest('hex')).toBe(sha);
  const report=await page.evaluate(async({resources,pngs,xml})=>{
    const {loadLiveDeviceLayout}=await import('/live-device-layout.mjs');
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    const {parseElectricDefaultPresetXml}=await import('/live-profiles/electric/default-model.mjs');
    const {createElectricBindings}=await import('/live-profiles/electric/bindings.mjs');
    const layout=loadLiveDeviceLayout({gui:{has:key=>Object.hasOwn(resources,key),text:key=>resources[key]},path:'Devices/LoungeLizard/Contents.xml'});
    const bindings=createElectricBindings({modelValues:parseElectricDefaultPresetXml(xml).values});
    const view=createLiveDeviceView(document,{layout,graphics:{has:key=>Object.hasOwn(pngs,key),read:key=>Uint8Array.from(pngs[key])},resolveBinding:bindings.resolve,evaluateExpression:bindings.evaluate});
    const viewport=document.createElement('div');viewport.className='live-resource-viewport';viewport.append(view.element);document.body.append(viewport);return view.report;
  },fixtures);
  expect(report.unsupportedProperties.filter(p=>p.applied!==undefined)).toEqual([]);
  const backgroundHeights=[];
  for(let index=0;index<4;index++){
    await page.locator('[data-view-class=FingerView]').nth(index).click();
    const embedded=page.locator('[data-view-class=EmbeddedLoadableView]:visible');
    backgroundHeights.push(await embedded.locator('.live-device-cell').first().evaluate(e=>e.getBoundingClientRect().height));
    expect(await embedded.evaluate(e=>e.scrollHeight)).toBeLessThanOrEqual(await embedded.evaluate(e=>e.clientHeight));
    const clipped=await embedded.locator('.live-device-control input').evaluateAll(elements=>elements.filter(e=>{
      if(!e.getClientRects().length)return false;
      const parent=e.closest('[data-view-class=EmbeddedLoadableView]').getBoundingClientRect(),box=e.getBoundingClientRect();
      return box.top<parent.top||box.bottom>parent.bottom;
    }).map(e=>e.getAttribute('aria-label')));
    expect(clipped).toEqual([]);
  }
  expect(backgroundHeights).toEqual([98,98,98,98]);
  await expect(page.locator('.live-device-control input:not(:disabled),.live-device-control button:not(:disabled),.live-device-control select:not(:disabled)')).toHaveCount(0);
  await page.locator('[data-view-class=FingerView]').first().click();
  if(process.env.ALIVE_ELECTRIC_GEOMETRY_OUTPUT){
    const output=process.env.ALIVE_ELECTRIC_GEOMETRY_OUTPUT;await mkdir(output,{recursive:true});
    await writeFile(join(output,'renderer-report.json'),JSON.stringify({report,backgroundHeights},null,2)+'\n');
    for(const [width,height]of [[390,844],[800,600],[1280,800],[1440,900]]){
      await page.setViewportSize({width,height});
      expect(await page.evaluate(()=>document.body.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({path:join(output,`electric-geometry-${width}x${height}.png`)});
    }
  }
});
