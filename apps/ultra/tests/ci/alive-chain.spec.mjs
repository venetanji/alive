import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

// Browser geometry and input coverage only. The native desktop journey qualifies hosting/audio.
async function openSession(page,longNames=false){
  const document=JSON.parse(readFileSync(new URL('../../../alive/examples/two-instruments.alive',import.meta.url))),patch=JSON.parse(readFileSync(new URL('../../examples/subtractive.ultra',import.meta.url)));
  document.format='alive-session-v2';const deviceInstances={},runtime=[];
  document.tracks.forEach((track,index)=>{
    track.effects=[];track.device.instanceId=`instrument-${index}`;track.device.bypassed=false;
    track.automation.forEach(l=>l.instanceId=track.device.instanceId);
    const manifest={...patch.device,parameters:patch.device.parameters.map(p=>({...p,base:track.device.parameters[p.key]}))};
    deviceInstances[track.device.instanceId]={track:index,index:runtime.length,manifest};runtime.push({effective:manifest.parameters.map(p=>p.base),owned:manifest.parameters.map(()=>0)});
  });
  for(const file of ['utility','stereo-lowpass']){
    const device=JSON.parse(readFileSync(new URL(`../../examples/${file}.ultra`,import.meta.url))).device,instanceId=file;
    if(longNames&&file==='stereo-lowpass')device.name='LongSavedDevice'.repeat(8);
    const manifest={...device,parameters:device.parameters.map(p=>({...p,base:p.key==='gain'?1:p.key==='resonance'?.7:1000}))};
    document.tracks[0].effects.push({instanceId,id:device.id,path:`${file}.ultra`,parameters:{},bypassed:false});
    deviceInstances[instanceId]={track:0,index:runtime.length,manifest};runtime.push({effective:manifest.parameters.map(p=>p.base),owned:manifest.parameters.map(()=>0)});
  }
  const snapshot={generation:1,document,deviceInstances,dirty:false,draft:null,state:{playing:0,position:0,absoluteFrame:0,rejected:0,generation:1,peakLeft:0,peakRight:0,devices:runtime,tracks:document.tracks.map(()=>({peakLeft:0,peakRight:0,activeVoices:0}))},audio:{config:{host:'default',device:'default',sample_rate:48000},observed_buffer_frames:0,callbacks:0,stream_errors:0,failed:false,message:'Browser fixture'}};
  await page.addInitScript(snapshot=>{
    window.calls=[];window.__TAURI__={core:{invoke:async(name,args)=>{window.calls.push({name,args});if(name==='alive_current')return structuredClone(snapshot);if(name==='alive_draft')snapshot.draft=args.document;}}};
  },snapshot);
  await page.goto('/alive.html');await expect(page.locator('#chain-title')).toHaveText('Pulse chain');
}

test('selected instance controls, keyboard automation target, draft guard and desktop bounds',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:900,height:660});await openSession(page);
  await page.getByRole('button',{name:'Select Pulse Stereo Lowpass effect 2',exact:true}).click();
  await expect(page.locator('#device-title')).toHaveText('Stereo Lowpass');await expect(page.getByRole('spinbutton',{name:'Cutoff base',exact:true})).toHaveValue('1000');
  expect(await page.evaluate(()=>window.calls.some(c=>c.name==='alive_editor'||c.name==='alive_transport'))).toBe(false);
  await page.getByLabel('Automation target',{exact:true}).selectOption(JSON.stringify(['stereo-lowpass','cutoff']));await page.getByRole('button',{name:'Add automation lane',exact:true}).click();
  await page.getByRole('button',{name:'Add Stereo Lowpass effect 2 / Cutoff point',exact:true}).click();
  await expect(page.getByLabel('Stereo Lowpass effect 2 / Cutoff point 1 value',{exact:true})).toHaveValue('1000');
  await expect(page.locator('#chain-status')).toContainText('Apply or discard');await expect(page.getByRole('button',{name:'Add effect',exact:true})).toBeDisabled();
  await expect(page.getByLabel('Cutoff point 1 value',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('alive-minimum-desktop.png')});expect(errors).toEqual([]);
});

test('long saved device names fit the minimum desktop window',async({page})=>{
  await page.setViewportSize({width:900,height:660});await openSession(page,true);
  await expect(page.locator('.chain-select').nth(2)).toContainText('LongSavedDevice');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth)).toBe(true);
});
