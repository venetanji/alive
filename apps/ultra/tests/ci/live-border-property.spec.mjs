import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';

test.beforeEach(async({page})=>{
  await page.route('**/border-test-host',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Border property compatibility</title>'}));
  await page.goto('/border-test-host');
});

test('private retained/current Analog and Electric layouts retain drawing behavior and expose fidelity limits',async({page})=>{
  test.skip(!process.env.ALIVE_RESOURCE_XML_FIXTURES,'Requires private XMLs from the exact qualified resource packs.');
  const fixtures=JSON.parse(await readFile(process.env.ALIVE_RESOURCE_XML_FIXTURES,'utf8'));
  const result=await page.evaluate(async fixtures=>{
    const {loadLiveDeviceLayout}=await import('/live-device-layout.mjs');
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    const result={};
    for(const [release,resources]of Object.entries(fixtures)){
      result[release]={};
      for(const device of ['UltraAnalog','LoungeLizard']){
        const gui={has:name=>Object.hasOwn(resources,name),text:name=>resources[name]};
        const layout=loadLiveDeviceLayout({gui,path:`Devices/${device}/Contents.xml`});
        const view=createLiveDeviceView(document,{layout});document.body.append(view.element);
        result[release][device]={report:view.report,resources:layout.documents,nodeCount:layout.nodeCount,
          cells:[...view.element.querySelectorAll('.live-device-cell')].map(e=>({padding:e.style.padding,width:e.style.width,height:e.style.height}))};
        view.dispose();view.element.remove();
      }
    }
    return result;
  },fixtures);
  for(const device of ['UltraAnalog','LoungeLizard']){
    const old=result['retained-20261031'][device],current=result['current-20261102'][device];
    expect(current.report.borders.length).toBeGreaterThan(0);
    expect(current.report.borders).toEqual(old.report.borders);
    expect(current.cells).toEqual(old.cells);
    expect(current.nodeCount).toBe(old.nodeCount);
    expect(current.resources).toEqual(old.resources);
    expect(current.report.unsupportedProperties.length).toBeGreaterThan(0);
    expect(current.report.borders.every(b=>b.color!==null&&b.cornerColor==='UseBackground')).toBe(true);
  }
  expect(result['current-20261102'].UltraAnalog.nodeCount).toBe(719);
  expect(result['current-20261102'].LoungeLizard.report.unsupportedProperties.filter(p=>p.applied!==undefined)).toEqual([]);
  if(process.env.ALIVE_RESOURCE_REPORT)await writeFile(process.env.ALIVE_RESOURCE_REPORT,JSON.stringify(result,null,2)+'\n');
});

test('old and current border color serialization produce equivalent, explicit diagnostics',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {loadLiveDeviceLayout}=await import('/live-device-layout.mjs');
    const {createLiveDeviceView}=await import('/live-device-view.mjs');
    const render=attributes=>{
      const xml=`<Ableton><PropertiesNode TargetClassName="BorderedCellView" Id="Example"><Categories><Category><Properties><BorderProperty Name="Border" ${attributes} Top="17" Right="2" Bottom="3" Left="4" RoundedCorners="5" EdgesToDraw="15"><BorderType Value="4"/></BorderProperty></Properties></Category></Categories></PropertiesNode></Ableton>`;
      const layout=loadLiveDeviceLayout({gui:{has:()=>false,text:()=>xml},path:'Devices/Example/Contents.xml'});
      const view=createLiveDeviceView(document,{layout});
      const cell=view.element.firstElementChild;
      const result={report:view.report,padding:cell.style.padding,outline:cell.style.outline,color:cell.style.outlineColor};
      view.dispose();return result;
    };
    return {
      old:render('ColorName="56" CornerColorName="1"'),
      current:render('ColorString="Black" CornerColorString="UseBackground"'),
      disabled:render('ColorString="RetroDisplayForegroundDisabled" CornerColorString="UseBackground"'),
      disabledOld:render('ColorName="63" CornerColorName="1"'),
      unknown:render('ColorString="FutureColor" CornerColorString="FutureCorner"'),
    };
  });
  expect(result.old.report.borders[0].color).toBe('Black');
  expect(result.current.report.borders[0].color).toBe('Black');
  expect(result.current.report.borders[0].cornerColor).toBe('UseBackground');
  expect(result.disabled.report.borders[0].color).toBe('RetroDisplayForegroundDisabled');
  expect(result.disabledOld.report.borders[0].color).toBe('RetroDisplayForegroundDisabled');
  expect(result.current.padding).toBe('17px 2px 3px 4px');
  expect(result.current.outline).toBe('');
  expect(result.current.color).toBe('');
  expect(result.current.report.unsupportedProperties.map(p=>p.property)).toEqual(expect.arrayContaining(['Border.Color','Border.CornerColor','Border.BorderType','Border.RoundedCorners','Border.EdgesToDraw']));
  expect(result.current.report.unsupportedProperties.find(p=>p.property==='Border.Top')).toBeUndefined();
  expect(result.unknown.report.borders[0].color).toBe(null);
  expect(result.unknown.report.borders[0].cornerColor).toBe(null);
  expect(result.unknown.report.unsupportedProperties.find(p=>p.property==='Border.Color').reason).toMatch(/unknown/i);
});
