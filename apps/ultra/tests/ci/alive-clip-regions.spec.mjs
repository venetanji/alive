import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

async function openRangeStudy(page){
  const document=JSON.parse(readFileSync(new URL('../../../alive/examples/midi-arrangement.alive',import.meta.url))).score;
  document.title='Range Study';
  for(const track of document.tracks){track.chain={kind:'midi',instrument:null};track.effects=[];}
  for(const source of document.sources)source.automation=[];
  const audio={kind:'audio',id:'owned-audio',trackId:'audio-track',name:'Owned WAV',file:{path:'owned.wav',sourceSha256:'a'.repeat(64),encoding:'pcm',channels:2,sampleRate:48000,bitsPerSample:16,frames:'192000'},sourceTempo:120,warpMode:'repitch',automation:[]};
  const region={start:0,end:8,loopStart:0,loopEnd:8,loopEnabled:true};
  document.sources.push(audio);document.tracks.push({id:'audio-track',name:'Audio',color:'#91b9ed',chain:{kind:'audio'},effects:[],gain:.7,mute:false,solo:false,slots:[{id:'audio-slot',name:'Owned WAV',sourceId:audio.id,region},null,null,null]});
  const snapshot={master:{gain:1,acceptedSerial:'0',available:true,unavailableReason:null,observation:null,observationStale:false},generation:1,editRevision:0,snapshotSequence:'1',preparationRevision:'1',document,dirty:false,deviceInstances:{},history:{canUndo:false,canRedo:false},capabilities:{maxTracks:8,maxDevices:6,atomicTrackActions:true,launchQuantization:true},launch:{globalQuantization:'bar1',clipQuantization:[]},midi:{pending:false,publication:{status:3,serial:'0',error:0}},state:{playing:1,position:'0',absoluteFrame:'0',rejected:'0',generation:'1',tracks:[],devices:[]},runtime:{tracks:[],requests:[],requestedStopEpoch:'0',appliedStopEpoch:'0'},preparedWorkspaces:{sources:[],slots:[],placements:[]},audio:{running:true,config:{host:'default',device:'default',sample_rate:48000},observed_buffer_frames:256,callbacks:4,stream_errors:0,failed:false,message:'Browser bridge fixture'}};
  await page.addInitScript(snapshot=>{
    window.sessionSnapshot=snapshot;window.calls=[];let pending=null,serial=0;const history=[];
    function prepare(){
      snapshot.state.tracks=snapshot.document.tracks.map(()=>({peakLeft:.1,peakRight:.15,activeVoices:0}));
      snapshot.runtime.tracks=snapshot.document.tracks.map(t=>({trackId:t.id,authority:'arrangement',activeSourceId:null,activeSlotId:null,activePlacementId:null,phase:null,pendingAction:null}));
      snapshot.preparedWorkspaces.sources=snapshot.document.sources.map(s=>({sourceId:s.id,trackId:s.trackId,kind:s.kind,name:s.name,lengthFrames:'192000',...(s.kind==='audio'?{waveformPeaks:Array.from({length:256},(_,i)=>{const a=.15+.65*Math.abs(Math.sin(i*.17));return[-a,a*.9];})}:{})}));
      snapshot.preparedWorkspaces.slots=snapshot.document.tracks.flatMap(t=>t.slots.flatMap((s,slot)=>s?[{trackId:t.id,slotId:s.id,sourceId:s.sourceId,name:s.name,slot}]:[]));
      snapshot.preparedWorkspaces.placements=snapshot.document.placements.map(p=>({trackId:p.trackId,placementId:p.id,sourceId:p.sourceId}));
    }
    function snapshotNow(){
      if(pending&&Date.now()>=pending.ready){
        if(window.rejectNext){window.rejectNext=false;snapshot.midi.publication={status:4,serial:String(serial),error:9};snapshot.notice='The clip region was refused. Shorten the loop and try again.';}
        else{history.push(snapshot.document);snapshot.document=pending.document;snapshot.editRevision++;snapshot.history={canUndo:true,canRedo:false};snapshot.midi.publication={status:3,serial:String(serial),error:0};snapshot.notice=null;prepare();}
        pending=null;snapshot.midi.pending=false;
      }
      snapshot.snapshotSequence=String(BigInt(snapshot.snapshotSequence)+1n);snapshot.state.absoluteFrame=String(BigInt(snapshot.state.absoluteFrame)+256n);return structuredClone(snapshot);
    }
    prepare();window.__TAURI__={core:{invoke:async(name,args={})=>{
      window.calls.push({name,args});if(name==='alive_current')return snapshotNow();
      if(name==='alive_browser_catalog')return{revision:'1',entries:[],nextCursor:null,notices:[]};
      if(name==='alive_workspace_edit'||name==='alive_workspace_track'){
        if(pending)throw Error('A musical edit is still pending.');if(args.editRevision!==snapshot.editRevision)throw Error('Stale musical edit.');
        const document=structuredClone(snapshot.document),op=args.operation,affected={trackId:op.trackId??null,sourceId:null,slotId:null,placementId:null,noteId:null};
        if(op.kind==='regionSet'){const o=op.occurrence,p=o.kind==='slot'?document.tracks.find(t=>t.id===o.trackId).slots.find(s=>s?.id===o.slotId):document.placements.find(p=>p.id===o.placementId);p.region=op.region;affected.trackId=o.trackId??p.trackId;affected.sourceId=p.sourceId;}
        else if(op.kind==='audioSourceTempo'){
          const source=document.sources.find(s=>s.id===op.sourceId),ratio=op.sourceTempo/source.sourceTempo;source.sourceTempo=op.sourceTempo;affected.sourceId=source.id;affected.trackId=source.trackId;
          for(const o of [...document.tracks.flatMap(t=>t.slots.filter(Boolean)),...document.placements].filter(o=>o.sourceId===source.id))for(const k of ['start','end','loopStart','loopEnd'])o.region[k]*=ratio;
        }
        else if(op.kind==='midiClipCreate'||op.kind==='midiPlacementCreate'){
          const t=document.tracks.find(t=>t.id===op.trackId),length=op.duration??4;affected.sourceId=`source-${serial}`;const region={start:0,end:length,loopStart:0,loopEnd:length,loopEnabled:true};document.sources.push({kind:'midi',id:affected.sourceId,trackId:t.id,name:op.name,lengthBeats:length,notes:[],automation:[]});
          if(op.kind==='midiClipCreate'){affected.slotId=`slot-${serial}`;t.slots[op.slot]={id:affected.slotId,name:op.name,sourceId:affected.sourceId,region};}
          else{affected.placementId=`placement-${serial}`;document.placements.push({id:affected.placementId,trackId:t.id,sourceId:affected.sourceId,start:op.start,duration:op.duration,region});}
        }else if(op.kind==='addAudio'||op.kind==='addMidi'){
          const midi=op.kind==='addMidi',at=document.tracks.findIndex(t=>t.id===op.afterTrackId)+1;affected.trackId=`track-new-${serial}`;
          document.tracks.splice(at,0,{id:affected.trackId,name:midi?'New MIDI':'New Audio',color:midi?'#efbb62':'#91b9ed',chain:midi?{kind:'midi',instrument:null}:{kind:'audio'},effects:[],slots:[null,null,null,null],gain:1,mute:false,solo:false});
        }else if(op.kind==='transportRange'){const {kind,...range}=op;Object.assign(document,range);}
        else throw Error('Unsupported fixture operation '+op.kind);
        serial++;pending={document,ready:Date.now()+45};snapshot.midi.pending=true;snapshot.midi.publication={status:1,serial:String(serial),error:0};return{snapshot:snapshotNow(),affected};
      }
      if(name==='alive_history'){snapshot.document=history.pop();snapshot.editRevision++;prepare();return snapshotNow();}
      if(name==='alive_audio_import')return null;
      throw Error('Unsupported fixture command '+name);
    }}};
  },snapshot);
  await page.goto('/alive.html');await expect(page.locator('#clip-title')).toContainText('Pulse');
}
const mutations=page=>page.evaluate(()=>window.calls.filter(c=>['alive_workspace_edit','alive_workspace_track'].includes(c.name)));

for(const {method,label,value,tempo} of [{method:'mouse',label:'Audio source BPM',value:'121',tempo:121},{method:'keyboard',label:'Audio source BPM',value:'121',tempo:121},{method:'mouse',label:'Audio length in beats',value:'7',tempo:105}])test(`Audio disclosure preserves unfinished ${label} through ${method} navigation`,async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openRangeStudy(page);await page.getByRole('button',{name:'Select Audio slot 1',exact:true}).click();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  const field=page.getByRole('spinbutton',{name:label,exact:true}),summary=page.locator('.clip-properties > details').filter({has:page.locator('.audio-stretch-tools')}).locator('summary');
  await field.fill(value);if(method==='mouse')await summary.click();else{await field.press('Shift+Tab');await expect(summary).toBeFocused();await summary.press('Enter');}
  await expect(field).toBeHidden();const before=await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length);await expect.poll(()=>page.evaluate(()=>window.calls.filter(c=>c.name==='alive_current').length)).toBeGreaterThan(before+2);
  expect(await mutations(page)).toEqual([]);if(method==='mouse')await summary.click();else await summary.press('Enter');await expect(field).toHaveValue(value);
  await field.focus();await field.press('Tab');await expect.poll(async()=>(await mutations(page)).length).toBe(1);
  expect((await mutations(page))[0].args.operation).toMatchObject({kind:'audioSourceTempo',sourceId:'owned-audio',sourceTempo:tempo});
});

test('parked audio tempo stays with its sample through clip selection',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openRangeStudy(page);await page.getByRole('button',{name:'Select Audio slot 1',exact:true}).click();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  const field=page.getByRole('spinbutton',{name:'Audio source BPM',exact:true}),summary=page.locator('.clip-properties > details').filter({has:page.locator('.audio-stretch-tools')}).locator('summary');
  await field.fill('121');await summary.click();await page.getByRole('button',{name:'Restore detail size',exact:true}).click();await page.getByRole('button',{name:'Select Pulse slot 1',exact:true}).click();
  await page.getByRole('button',{name:'Select Audio slot 1',exact:true}).click();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();await summary.click();
  await expect(field).toHaveValue('121');expect(await mutations(page)).toEqual([]);await field.focus();await field.press('Tab');await expect.poll(async()=>(await mutations(page)).length).toBe(1);
  expect((await mutations(page))[0].args.operation).toMatchObject({kind:'audioSourceTempo',sourceId:'owned-audio',sourceTempo:121});
});
async function selectClipTime(page,start,end){
  const svg=page.locator('#piano-roll:visible, #audio-waveform:visible');await svg.scrollIntoViewIfNeeded();
  const g=await svg.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,pad:Number(e.dataset.keyboardWidth),start:Number(e.dataset.beatStart),span:Number(e.dataset.beatSpan)};});
  const x=beat=>g.x+g.pad+(beat-g.start)/g.span*(g.width-g.pad),y=g.y+g.height-14;
  await page.mouse.move(x(start),y);await page.mouse.down();await page.mouse.move(x(end),y,{steps:8});await page.mouse.up();await page.keyboard.press('Control+l');
}

for(const size of [{width:800,height:600},{width:1280,height:800}])test(`clip properties sit beside the MIDI and audio editors at ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await openRangeStudy(page);
  await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  await expect(page.locator('.clip-source-actions')).not.toHaveAttribute('open');
  const before=await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document));
  const properties=page.getByRole('complementary',{name:'Clip properties',exact:true});
  await expect(properties).toHaveCount(1,{timeout:1000});
  await expect(properties.getByLabel('Clip Start',{exact:true})).toBeVisible();
  await expect(properties.getByLabel('Loop Length',{exact:true})).toBeVisible();
  await expect(properties.getByLabel('Clip Launch Quantization',{exact:true})).toBeAttached();
  const panel=await properties.boundingBox(),piano=await page.locator('#piano-roll').boundingBox();
  expect(panel.x+panel.width).toBeLessThanOrEqual(piano.x+1);
  expect(piano.width).toBeGreaterThan(300);
  await page.screenshot({path:testInfo.outputPath(`midi-clip-properties-${size.width}.png`)});
  await page.getByRole('button',{name:'Restore detail size',exact:true}).click();
  await page.getByRole('button',{name:'Select Audio slot 1',exact:true}).click();
  await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  await expect(page.locator('#clip-overview svg path')).toHaveCount(1);
  await expect(properties.getByLabel('Audio source BPM',{exact:true})).toBeVisible();
  const audioPanel=await properties.boundingBox();
  const audio=await page.locator('#audio-waveform').boundingBox();
  expect(audioPanel.x+audioPanel.width).toBeLessThanOrEqual(audio.x+1);
  expect(audio.width).toBeGreaterThan(300);
  expect(await page.evaluate(()=>JSON.stringify(window.sessionSnapshot.document))).toBe(before);
  expect(await mutations(page)).toEqual([]);
  await page.screenshot({path:testInfo.outputPath(`audio-clip-properties-${size.width}.png`)});
});

for(const size of [{width:800,height:600},{width:1280,height:800},{width:1440,height:1000}])test(`MIDI and audio range controls preserve source content at ${size.width}x${size.height}`,async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize(size);await openRangeStudy(page);
  await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  const notes=await page.evaluate(()=>structuredClone(window.sessionSnapshot.document.sources[0].notes));
  await selectClipTime(page,2,6);await expect(page.getByLabel('Clip Start',{exact:true})).toHaveValue('2');await expect(page.getByLabel('Loop Position',{exact:true})).toHaveValue('2');await expect(page.getByLabel('Loop Length',{exact:true})).toHaveValue('4');await expect(page.getByLabel('Clip End',{exact:true})).toHaveValue('8');
  const marker=page.locator('#piano-roll [data-region=start]');const g=await page.locator('#piano-roll').evaluate(e=>({width:e.getBoundingClientRect().width,pad:Number(e.dataset.keyboardWidth),span:Number(e.dataset.beatSpan)})),box=await marker.boundingBox();
  await page.mouse.move(box.x+2,box.y+2);await page.mouse.down();await page.mouse.move(box.x+2-2*(g.width-g.pad)/g.span,box.y+2,{steps:8});await page.mouse.up();
  await expect(page.getByLabel('Clip Start',{exact:true})).toHaveValue('0');await expect(page.getByLabel('Loop Position',{exact:true})).toHaveValue('2');expect(await page.evaluate(()=>window.sessionSnapshot.document.sources[0].notes)).toEqual(notes);
  await page.screenshot({path:testInfo.outputPath(`midi-region-${size.width}x${size.height}.png`)});
  await page.getByRole('button',{name:'Restore detail size',exact:true}).click();await page.getByRole('button',{name:'Select Audio slot 1',exact:true}).click();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  await expect(page.getByRole('group',{name:'Selected audio clip waveform',exact:true})).toBeVisible();await expect(page.locator('#piano-roll')).toBeHidden();
  await expect(page.getByRole('button',{name:'Add note',exact:true})).toBeHidden();await expect(page.getByRole('button',{name:'Fit notes',exact:true})).toHaveCount(0);
  await expect(page.getByRole('group',{name:'Note velocity lane',exact:true})).toBeHidden();await selectClipTime(page,2,6);
  await expect(page.getByLabel('Clip Start',{exact:true})).toHaveValue('2');await expect(page.getByLabel('Clip End',{exact:true})).toHaveValue('8');await expect(page.getByRole('button',{name:'Fit sample',exact:true})).toBeVisible();
  await expect(page.locator('#stop')).toBeInViewport();await expect(page.locator('#show-audio')).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath(`audio-region-${size.width}x${size.height}.png`)});
});

for(const size of [{width:800,height:600},{width:1280,height:800}])test(`empty MIDI slots and new tracks keep the clip editor empty at ${size.width}x${size.height}`,async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize(size);await openRangeStudy(page);
  async function expectEmpty(){
    for(const selector of ['#piano-roll','#audio-waveform','.clip-view-tools','.clip-region-tools','.piano-velocity-lane','.note-velocity','.note-table','.automation-section','#add-note'])await expect(page.locator(selector)).toBeHidden();
    await expect(page.locator('.clip-area')).toBeVisible();
  }
  await page.getByRole('button',{name:'Select Pulse slot 2',exact:true}).click();await expectEmpty();
  expect(await mutations(page)).toEqual([]);
  await page.locator('#session-workspace').focus();await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('button',{name:'Select New MIDI track',exact:true})).toHaveAttribute('aria-pressed','true');await expectEmpty();
  await page.screenshot({path:testInfo.outputPath(`empty-midi-${size.width}x${size.height}.png`)});
  await page.getByRole('button',{name:'Select New MIDI slot 1',exact:true}).dblclick();
  await expect(page.locator('#piano-roll')).toBeVisible();await expect(page.locator('.clip-region-tools')).toBeVisible();await expect(page.locator('.piano-velocity-lane')).toBeVisible();await expect(page.locator('#add-note')).toBeVisible();
  expect(await page.evaluate(()=>window.sessionSnapshot.document.sources.at(-1).notes)).toEqual([]);
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expectEmpty();
  await page.getByRole('button',{name:'Select Pulse slot 1',exact:true}).click();await expect(page.locator('#piano-roll [data-note]')).not.toHaveCount(0);
  expect(await page.evaluate(()=>window.sessionSnapshot.state.playing)).toBe(1);expect(errors).toEqual([]);
});

test('an empty audio track has an audio import surface and no piano or MIDI editing controls',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openRangeStudy(page);
  await page.getByRole('button',{name:'Select Audio slot 2',exact:true}).click();
  await expect(page.getByRole('button',{name:'Import audio into selected slot',exact:true})).toBeVisible();
  await expect(page.locator('#piano-roll')).toBeHidden();await expect(page.getByRole('button',{name:'Add note',exact:true})).toBeHidden();
  await expect(page.getByRole('button',{name:'MIDI note Preview',exact:true})).toBeHidden();await expect(page.getByRole('button',{name:'Zoom in pitch',exact:true})).toBeHidden();
  await page.getByRole('button',{name:'Import audio into selected slot',exact:true}).click();
  expect(await page.evaluate(()=>window.calls.filter(c=>c.name==='alive_audio_import').map(c=>c.args))).toEqual([{trackId:'audio-track',slot:1,generation:1,editRevision:0}]);
  expect(await mutations(page)).toEqual([]);
  await page.getByRole('button',{name:'Select Pulse slot 1',exact:true}).click();await expect(page.locator('#piano-roll')).toBeVisible();await expect(page.getByRole('button',{name:'Add note',exact:true})).toBeVisible();
});

test('waveform zoom and navigation change only the view while marker drags edit the audio loop',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openRangeStudy(page);await page.getByRole('button',{name:'Select Audio slot 1',exact:true}).click();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  const svg=page.locator('#audio-waveform'),source=await page.evaluate(()=>structuredClone(window.sessionSnapshot.document.sources.at(-1)));
  const initial=await svg.getAttribute('data-beat-span'),path=await svg.locator('.audio-waveform').getAttribute('d');
  await page.getByRole('button',{name:'Zoom in waveform',exact:true}).click();expect(await svg.locator('.audio-waveform').getAttribute('d')).not.toBe(path);
  await page.getByRole('button',{name:'Zoom in time',exact:true}).click();expect(Number(await svg.getAttribute('data-beat-span'))).toBeLessThan(Number(initial));
  await svg.hover();await page.mouse.wheel(0,100);expect(Number(await svg.getAttribute('data-beat-start'))).toBeGreaterThan(0);
  expect(await mutations(page)).toEqual([]);await page.getByRole('button',{name:'Fit sample',exact:true}).click();
  await selectClipTime(page,2,6);await expect(page.getByLabel('Loop Length',{exact:true})).toHaveValue('4');
  const handle=svg.locator('[data-region=loopRight]'),box=await handle.boundingBox(),scale=await svg.evaluate(e=>Number(e.dataset.pixelsPerBeat));
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+scale,box.y+box.height/2,{steps:8});await page.mouse.up();
  await expect(page.getByLabel('Loop Length',{exact:true})).toHaveValue('5');expect(await page.evaluate(()=>window.sessionSnapshot.document.sources.at(-1))).toEqual(source);
});

test('Re-Pitch stretches the shared sample with numeric and drag controls; Escape cancels preview',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openRangeStudy(page);await page.getByRole('button',{name:'Select Audio slot 1',exact:true}).click();await page.getByRole('button',{name:'Maximize detail',exact:true}).click();
  const bpm=page.getByRole('spinbutton',{name:'Audio source BPM',exact:true}),length=page.getByRole('spinbutton',{name:'Audio length in beats',exact:true});
  await expect(bpm).toHaveValue('120');await expect(length).toHaveValue('8');
  await length.fill('12');await length.press('Tab');await expect(bpm).toHaveValue('180');await expect(page.getByLabel('Clip End',{exact:true})).toHaveValue('12');
  await page.getByRole('button',{name:'Fit sample',exact:true}).click();
  const svg=page.locator('#audio-waveform'),handle=svg.getByLabel('Stretch sample end',{exact:true}),box=await handle.boundingBox(),scale=Number(await svg.getAttribute('data-pixels-per-beat'));
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-4*scale,box.y+box.height/2,{steps:8});await page.keyboard.press('Escape');await page.mouse.up();
  expect((await mutations(page)).filter(c=>c.args.operation.kind==='audioSourceTempo')).toHaveLength(1);await expect(length).toHaveValue('12');
  const next=await handle.boundingBox();await page.mouse.move(next.x+next.width/2,next.y+next.height/2);await page.mouse.down();await page.mouse.move(next.x+next.width/2-4*scale,next.y+next.height/2,{steps:8});await page.mouse.up();
  await expect(length).toHaveValue('8');await expect(bpm).toHaveValue('120');await expect(page.getByLabel('Clip End',{exact:true})).toHaveValue('8');
  expect(await page.evaluate(()=>window.sessionSnapshot.document.sources.at(-1).file.frames)).toBe('192000');
});

test('source BPM accepts repeated Enter commits without requiring a refocus',async({page})=>{
  await openRangeStudy(page);await page.getByRole('button',{name:'Select Audio slot 1',exact:true}).click();
  const bpm=page.getByRole('spinbutton',{name:'Audio source BPM',exact:true});
  for(const value of [140,150]){await bpm.fill(String(value));await bpm.press('Enter');await expect.poll(()=>page.evaluate(()=>window.sessionSnapshot.document.sources.at(-1).sourceTempo)).toBe(value);}
  expect((await mutations(page)).filter(c=>c.args.operation.kind==='audioSourceTempo')).toHaveLength(2);
});

test('an audio length draft cannot target a clip removed by an accepted refresh',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await openRangeStudy(page);await page.getByRole('button',{name:'Select Audio slot 1',exact:true}).click();
  const length=page.getByRole('spinbutton',{name:'Audio length in beats',exact:true});await length.fill('10');
  await page.evaluate(()=>{window.sessionSnapshot.document.tracks.at(-1).slots[0]=null;window.sessionSnapshot.editRevision++;});
  await expect(page.getByRole('button',{name:'Import audio into selected slot',exact:true})).toBeVisible();await page.locator('#tempo').click();
  expect(await mutations(page)).toEqual([]);expect(errors).toEqual([]);
});

test('rolling clip and typed tracks are immediate and keep the inserted track selected',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openRangeStudy(page);
  await page.getByRole('button',{name:'Select Pulse slot 2',exact:true}).dblclick();await expect(page.locator('#clip-title')).toContainText('Clip 2');expect((await mutations(page)).map(c=>c.args.operation.kind)).toEqual(['midiClipCreate']);
  await page.locator('#session-workspace').focus();await page.keyboard.press('Control+t');await expect(page.getByRole('button',{name:'Select New Audio track',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.locator('#session-workspace').focus();await page.keyboard.press('Control+Shift+t');await expect(page.getByRole('button',{name:'Select New MIDI track',exact:true})).toHaveAttribute('aria-pressed','true');
  const tracks=await page.evaluate(()=>window.sessionSnapshot.document.tracks);expect(tracks.map(t=>t.name)).toEqual(['Pulse','New Audio','New MIDI','Harmony','Audio']);expect(tracks[2].chain.instrument).toBeNull();expect(await page.evaluate(()=>window.sessionSnapshot.state.playing)).toBe(1);await expect(page.locator('#apply')).toHaveCount(0);
});

test('Arrangement focused time selection drives global loop and atomic MIDI insertion',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openRangeStudy(page);await page.locator('#view-arrangement').click();
  const lane=page.locator('.timeline-lane[data-track-id=track-1]'),box=await lane.boundingBox();
  await page.mouse.move(box.x+9*48,box.y+45);await page.mouse.down();await page.mouse.move(box.x+13*48,box.y+45,{steps:8});await page.mouse.up();await page.keyboard.press('Control+l');
  await expect(page.getByLabel('Song loop start',{exact:true})).toHaveValue('9');await expect(page.getByLabel('Song loop end',{exact:true})).toHaveValue('13');
  await page.keyboard.press('Control+Shift+m');await expect.poll(()=>page.evaluate(()=>window.sessionSnapshot.document.placements.length)).toBe(3);const clip=await page.evaluate(()=>window.sessionSnapshot.document.sources.at(-1));expect(clip.lengthBeats).toBe(4);expect((await mutations(page)).at(-1).args.operation.kind).toBe('midiPlacementCreate');
});

test('a rejected publication preserves the installed region and surfaces its native explanation',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await openRangeStudy(page);await page.evaluate(()=>window.rejectNext=true);
  const start=page.getByLabel('Clip Start',{exact:true});await start.fill('1');await start.press('Tab');await expect(page.locator('#notice')).toContainText('Shorten the loop');expect(await page.evaluate(()=>window.sessionSnapshot.document.tracks[0].slots[0].region.start)).toBe(0);
});
