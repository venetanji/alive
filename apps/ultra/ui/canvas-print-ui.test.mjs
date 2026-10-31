import test from 'node:test';
import assert from 'node:assert/strict';
import {mergePrintPopups,printPopupText} from './canvas-print-ui.mjs';
import {makeNode,parsePatch,serializePatch,validatePatch,createCanvasController} from './canvas-model.mjs';
import {parseObjectText,objectText} from './canvas-catalog.mjs';
import {analyzeMaxPatch,importMaxPatcher} from './canvas-max-import.mjs';
import {createSharedCanvasController} from './canvas-shared.mjs';

const patch=nodes=>({version:1,profile:'ultra-canvas-v1',presentation:null,nodes,edges:[]});
const row=(id,text='31',generation=1,frame=48000)=>({id,text,generation,frame,enabled:true,has_value:true});
const snapshot=(nodes,frame=48000,revision=4)=>({revision,frame,nodes});
const options=(extra={})=>({revision:4,ids:new Set([1,2]),now:100,...extra});

test('Print popup defaults off and round-trips strict @popup authoring',()=>{
  assert.equal(makeNode('print',1).params.popup,0);
  const parsed=parseObjectText('print notes @popup 1 @level 2');
  assert.deepEqual(parsed.params,{label:'notes',level:2,popup:1});
  assert.deepEqual(parseObjectText(objectText({id:1,...parsed})),parsed);
  assert.equal(parsePatch(serializePatch(patch([makeNode('print',1,0,0,parsed.params)]))).nodes[0].params.popup,1);
  for(const popup of [true,null,'1',-1,.5,2])assert.throws(()=>validatePatch(patch([{...makeNode('print',1),params:{label:'print',level:0,popup}}])));
});

test('Max popup Print creation and saved values retain every ordinary message cable',()=>{
  const source={patcher:{boxes:[
    {box:{id:'a',maxclass:'message',text:'popup 0',patching_rect:[20,20,80,22],numinlets:2,numoutlets:1,outlettype:['']}},
    {box:{id:'b',maxclass:'newobj',text:'print @popup 1',patching_rect:[20,90,120,22],numinlets:1,numoutlets:0}},
    {box:{id:'c',maxclass:'newobj',text:'print saved',popup:1,patching_rect:[200,90,120,22],numinlets:1,numoutlets:0}},
  ],lines:[{patchline:{source:['a',0],destination:['b',0],order:0}},{patchline:{source:['a',0],destination:['c',0],order:1}}]}};
  const result=importMaxPatcher(source);
  assert.equal(result.complete,true);assert.equal(result.patch.edges.length,2);
  assert.deepEqual(result.patch.nodes.filter(node=>node.type==='print').map(node=>node.params.popup),[1,1]);
  source.patcher.boxes[2].box.popup=2;
  assert.equal(analyzeMaxPatch(source).patchers[0].complete,false);
});

test('independent popup deadlines use frame age and cannot extend or resurrect on polling',()=>{
  const first=mergePrintPopups({},snapshot([row(1),row(2,'73',1,0)]),options());
  assert.equal(printPopupText(first[1],100),'31');assert.equal(first[1].expiresAt,2100);
  assert.equal(first[2].expiresAt,1100);
  const repeated=mergePrintPopups(first,snapshot([row(1),row(2,'73',1,0)]),options({now:600}));
  assert.equal(repeated[1].expiresAt,2100);assert.equal(printPopupText(repeated[2],1100),null);
  const expired=mergePrintPopups(repeated,snapshot([row(1)]),options({now:2200}));
  assert.equal(printPopupText(expired[1],2200),null);
  const next=mergePrintPopups(expired,snapshot([row(1,'fresh',2)]),options({now:2300}));
  assert.equal(printPopupText(next[1],2300),'fresh');assert.equal(next[1].expiresAt,4300);
  assert.equal(printPopupText(next[1],4300),null);
});

test('popup disable and reenable do not restore a previous receipt',()=>{
  const first=mergePrintPopups({},snapshot([row(1)]),options());
  const disabled=mergePrintPopups(first,snapshot([{...row(1,''),enabled:false,has_value:false}]),options({now:200}));
  assert.equal(printPopupText(disabled[1],200),null);
  const enabled=mergePrintPopups(disabled,snapshot([{...row(1,''),has_value:false}]),options({now:300}));
  assert.equal(printPopupText(enabled[1],300),null);
  const old=mergePrintPopups(enabled,snapshot([row(1)]),options({now:400}));
  assert.equal(printPopupText(old[1],400),null,'A delayed snapshot must not revive the cleared generation.');
  const fresh=mergePrintPopups(old,snapshot([row(1,'new',2)]),options({now:500}));
  assert.equal(printPopupText(fresh[1],500),'new');
});

test('popup snapshots are non-consuming, revision-bound and retain local expiry on unavailable reads',()=>{
  const value=snapshot([row(1,'<safe>'),row(2,'old',1,0)]);
  const first=mergePrintPopups({},value,options());
  assert.deepEqual(mergePrintPopups({},value,options()),first);
  assert.deepEqual(mergePrintPopups(first,null,options({now:2200})),first);
  assert.equal(printPopupText(first[1],2200),null);
  assert.deepEqual(mergePrintPopups(first,value,options({revision:5})),{});
  assert.equal(mergePrintPopups(first,value,options({ids:new Set([2])}))[1],undefined);
  const older=mergePrintPopups(first,snapshot([row(1,'stale',0)]),options());
  assert.equal(older[1].text,'<safe>');
  const aged=mergePrintPopups({},snapshot([row(1)],144000),options());
  assert.equal(printPopupText(aged[1],100),null);
});

test('malformed popup snapshots cannot replace an accepted display',()=>{
  const first=mergePrintPopups({},snapshot([row(1)]),options());
  for(const invalid of [
    {...row(1),enabled:1},{...row(1),has_value:1},{...row(1),generation:-1},
    {...row(1),frame:48001},{...row(1),text:'bad\u0000text'},
    {...row(1),text:'x'.repeat(4097)},{...row(1),enabled:false},
  ])assert.deepEqual(mergePrintPopups(first,snapshot([invalid]),options()),first);
  assert.deepEqual(mergePrintPopups(first,snapshot([row(1),row(1)]),options()),first);
});

test('both controllers project live Print values without changing authoring or opening console',async()=>{
  for(const shared of [false,true]){
    const saved=patch([makeNode('print',1,20,20,{popup:1})]);let live=snapshot([row(1,'popup 0')]);
    const invoke=async name=>{
      if(name==='document_current')return{shared:true,label:'main',ownerLabel:'main',viewPath:[],patch:saved,authoringRevision:1,runtimeRevision:4};
      if(name==='canvas_apply')return{revision:4};
      if(name==='canvas_status')return{revision:4,active:true,nodes:[],console:[],print_popups:live};
      return{};
    };
    const c=shared?createSharedCanvasController({invoke}):createCanvasController({invoke,patch:saved});
    await c.prepare();const before=c.export();await c.poll();
    assert.equal(printPopupText(c.getState().printPopups[1],performance.now()),'popup 0');
    assert.equal(c.export(),before);assert.equal(c.getState().console.length,0);
    live=null;await c.poll();assert.equal(c.getState().printPopups[1].text,'popup 0');
    await c.dispose();
  }
});

test('standalone lifecycle operations cannot resurrect an expired Print receipt',async t=>{
  let now=100;
  t.mock.method(performance,'now',()=>now);
  for(const operation of ['stop','startAudio','stopAudio','panic']){
    now=100;
    const saved=patch([makeNode('print',1,20,20,{popup:1})]);
    const live=snapshot([row(1,'already observed')]);
    const invoke=async name=>{
      if(name==='canvas_apply')return{revision:4};
      if(name==='audio_status')return{running:true};
      if(name==='canvas_status')return{revision:4,active:true,nodes:[],console:[],print_popups:live};
      return{};
    };
    const c=createCanvasController({invoke,patch:saved});
    await c.prepare();await c.poll();
    assert.equal(c.getState().printPopups[1].expiresAt,2100);
    now=2200;await c.poll();
    assert.equal(printPopupText(c.getState().printPopups[1],now),null);
    await c[operation]();await c.poll();
    assert.equal(printPopupText(c.getState().printPopups[1],now),null,`${operation} must preserve the observed deadline when native time is paused`);
    await c.dispose();
  }
});
