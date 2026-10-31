import fs from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
const file=root+'/apps/ultra/ui/alive-dom.test.mjs';
let source=fs.readFileSync(file,'utf8').replace("import test from 'node:test';",'const test=()=>{};');
source=source.replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL(p,pathToFileURL(file)).href}'`).replaceAll('import.meta.url',JSON.stringify(pathToFileURL(file).href));
source+=`
// Reuse the existing DOM adapter and snapshot fixture; only delay/implement focused IPC.
{
 const initial=workspaceState(),page=dom('./alive.html'),native=backend(initial);let release;
 const view=mountAlive({...page,invoke:async(name,args)=>{
  if(name!=='alive_workspace_edit')return native.invoke(name,args);
  native.calls.push({name,args});const op=args.operation;
  if(op.kind==='sourceIndependent')await new Promise(resolve=>release=resolve);
  initial.draft??=structuredClone(initial.document);
  if(op.kind==='sourceIndependent'){
   const slot=initial.draft.tracks[0].slots[0],s=structuredClone(initial.draft.sources[0]);s.id='new-independent';s.notes.forEach(n=>n.id+='-new');initial.draft.sources.push(s);slot.sourceId=s.id;
  }else if(op.kind==='sourceLength')initial.draft.sources.find(s=>s.id===op.sourceId).lengthBeats=op.lengthBeats;
  else throw Error('Unexpected '+op.kind);
  initial.draftRevision++;
  return{snapshot:structuredClone(initial),affected:{trackId:'track-1',sourceId:op.kind==='sourceIndependent'?'new-independent':op.sourceId,slotId:op.kind==='sourceIndependent'?'clip-track-1':null}};
 }});await settle();
 const length=page.find('Selected clip length');
 await page.find('Make source independent').fire('click');length.value='16';await length.fire('change');release();for(let i=0;i<6;i++)await settle();
 const d=view.model.document();assert.equal(d.tracks[0].slots[0].sourceId,'new-independent');assert.equal(d.sources.find(s=>s.id==='new-independent').lengthBeats,8);assert.equal(d.sources.find(s=>s.id==='source-independent-0').lengthBeats,16);
 console.log('CONFIRMED wrong source length',JSON.stringify({operations:native.calls.filter(c=>c.name==='alive_workspace_edit').map(c=>c.args),slot:d.tracks[0].slots[0],originalArrangementPlacement:d.placements[0],sources:d.sources.map(s=>({id:s.id,length:s.lengthBeats})),notice:page.ids.get('notice').textContent},null,2));view.dispose();
}
{
 const initial=workspaceState(),page=dom('./alive.html'),native=timelineBackend(initial),view=mountAlive({...page,invoke:native.invoke});await settle();
 const brace=()=>page.ids.get('timeline-canvas').querySelector('.timeline-brace');const before={enabled:initial.document.loopEnabled,className:brace().className};
 page.ids.get('loop').checked=!initial.document.loopEnabled;await page.ids.get('loop').fire('change');for(let i=0;i<3;i++)await settle();
 assert.equal(view.model.document().loopEnabled,false);assert.equal(brace().classList.contains('disabled'),false);
 console.log('CONFIRMED stale loop brace',JSON.stringify({before,after:{enabled:view.model.document().loopEnabled,className:brace().className}}));view.dispose();
}
{
 const initial=workspaceState(),page=dom('./alive.html'),native=timelineBackend(initial);let release,held=true;
 const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_workspace_edit'&&held){held=false;await new Promise(resolve=>release=resolve);}return native.invoke(name,args);}});await settle();
 await page.find('Select placement placement-0').fire('click');
 const name=page.find('Arrangement source name');await page.find('Make placement independent').fire('click');name.value='Edited independent source';await name.fire('change');release();for(let i=0;i<6;i++)await settle();
 const d=view.model.document();assert.equal(d.placements[0].sourceId,'independent-0');assert.equal(d.sources[0].name,'Edited independent source');assert.equal(d.sources.find(s=>s.id==='independent-0').name,'Clip 1');
 console.log('CONFIRMED wrong source rename',JSON.stringify({operations:native.calls.filter(c=>c.name==='alive_workspace_edit').map(c=>c.args),placement:d.placements[0],sessionSlot:d.tracks[0].slots[0],sources:d.sources.map(s=>({id:s.id,name:s.name})),notice:page.ids.get('notice').textContent},null,2));view.dispose();
}
`;
source+=`
{
 const initial=workspaceState(),page=dom('./alive.html'),native=timelineBackend(initial);let release,held=true;
 const view=mountAlive({...page,invoke:async(name,args)=>{if(name==='alive_workspace_edit'&&held){held=false;await new Promise(resolve=>release=resolve);}return native.invoke(name,args);}});await settle();
 await page.find('Select placement placement-0').fire('click');const beforeCount=initial.document.sources[0].notes.length;
 await page.find('Make placement independent').fire('click');await page.ids.get('add-note').fire('click');release();for(let i=0;i<6;i++)await settle();
 const d=view.model.document();assert.equal(d.sources[0].notes.length,beforeCount+1);assert.equal(d.sources.find(s=>s.id==='independent-0').notes.length,beforeCount);
 console.log('CONFIRMED wrong source note creation',JSON.stringify({operations:native.calls.filter(c=>c.name==='alive_workspace_edit').map(c=>c.args),placement:d.placements[0],sessionSlot:d.tracks[0].slots[0],sources:d.sources.map(s=>({id:s.id,noteCount:s.notes.length})),notice:page.ids.get('notice').textContent},null,2));view.dispose();
}
`;
source+=`
{
 const initial=state();initial.state.playing=0;const page=dom('./alive.html'),native=backend(initial),boundary=delayedBoundary(native,'alive_file',snapshot=>{
   snapshot.document.title='Replacement session';snapshot.generation++;snapshot.draftRevision++;
 }),view=mountAlive({...page,invoke:boundary.invoke});await settle();
 const oldGeneration=view.model.snapshot().generation,instanceId=initial.document.tracks[0].device.instanceId;
 await page.ids.get('open').fire('click');const input=page.find('Cutoff base');input.value='1717';await input.fire('change');boundary.release();for(let i=0;i<6;i++)await settle();
 const base=native.calls.find(c=>c.name==='alive_base');assert.equal(base.args.generation,oldGeneration+1);assert.equal(view.model.document().tracks[0].device.parameters.cutoff,1717);
 console.log('CONFIRMED base edit crosses Open',JSON.stringify({clickedInGeneration:oldGeneration,sent:base,replacement:{generation:view.model.snapshot().generation,title:view.model.document().title,instanceId,cutoff:view.model.document().tracks[0].device.parameters.cutoff},notice:page.ids.get('notice').textContent},null,2));view.dispose();
}
`;
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
