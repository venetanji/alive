import assert from 'node:assert/strict';
import {test} from 'node:test';
import {makeNode,nodeSpec,validatePatch,createCanvasController} from './canvas-model.mjs';
import {objectText,parseObjectText,portHelp} from './canvas-catalog.mjs';
import {appearanceFields} from './canvas-appearance.mjs';
import {importMaxPatcher} from './canvas-max-import.mjs';
import {createSharedCanvasController} from './canvas-shared.mjs';

const flat=nodes=>({version:1,profile:'ultra-canvas-v1',nodes,edges:[]});
const source=(boxes,lines=[])=>({patcher:{boxes:boxes.map(box=>({box:{patching_rect:[40,40,64,24],...box}})),lines:lines.map(patchline=>({patchline}))}});

test('Max number authoring uses an integer box while saved legacy numbers round-trip unchanged',()=>{
  assert.equal(parseObjectText('number').type,'number_int');
  assert.deepEqual(parseObjectText('number.int 7 @minimum -3 @maximum 20'),{
    type:'number_int',params:{value:7,minimum:-3,maximum:20},
  });
  const legacy=makeNode('number',1,0,0,{value:3.75});
  assert.equal(objectText(legacy),'number.legacy 3.75');
  assert.deepEqual(parseObjectText(objectText(legacy)),{type:'number',params:{value:3.75}});
  assert.deepEqual(nodeSpec(legacy).inlets.length,2);assert.equal(nodeSpec(legacy).outlets.length,1);
  const integer=makeNode('number_int',2);
  assert.equal(nodeSpec(integer).inlets.length,1);assert.equal(nodeSpec(integer).outlets.length,2);
  assert.match(portHelp(integer,'out',1).detail,/Tab/);
  assert.deepEqual(appearanceFields('number_int'),appearanceFields('number'));
  for(const params of [{value:1.25},{minimum:-2.5},{maximum:3.5},{minimum:4,maximum:3}])
    assert.throws(()=>validatePatch(flat([makeNode('number_int',1,0,0,params)])));
});

test('Max integer bounds and Tab cables import without a number semantic or port warning',()=>{
  const input=source([
    {id:'n',maxclass:'number',minimum:-3,maximum:12,numinlets:1,numoutlets:2},
    {id:'b',maxclass:'button',numinlets:1,numoutlets:1},
  ],[{source:['n',1],destination:['b',0]}]);
  const result=importMaxPatcher(input);
  assert.ok(result.patch,JSON.stringify(result.diagnostics));
  assert.equal(result.patch.nodes[0].type,'number_int');
  assert.deepEqual(result.patch.nodes[0].params,{value:0,minimum:-3,maximum:12});
  assert.equal(result.patch.edges[0].outlet,1);
  assert.equal(result.diagnostics.some(row=>row.boxId==='n'&&['semantic-gap','port-shape'].includes(row.code)),false);
  const fractional=structuredClone(input);fractional.patcher.boxes[0].box.minimum=-2.5;
  assert.equal(importMaxPatcher(fractional).patch,null);
});

test('plain numeric send methods import but unresolved destination scope stays an error',()=>{
  for(const type of ['int','float']){
    const input=source([{id:'m',maxclass:'message',text:'send goom'},
      {id:'n',maxclass:'newobj',text:type}], [{source:['m',0],destination:['n',0]}]);
    const result=importMaxPatcher(input,{allowPartial:true});
    assert.equal(result.patch.edges.length,1,JSON.stringify(result.diagnostics));
    const scoped=structuredClone(input);scoped.patcher.boxes[0].box.text='send ---goom';
    const rejected=importMaxPatcher(scoped,{allowPartial:true});
    assert.equal(rejected.patch.edges.length,0);
    assert.ok(rejected.diagnostics.some(row=>row.severity==='error'));
  }
});

test('integer bound messages outside the qualified integral profile keep an import error',()=>{
  for(const text of ['min 2.5','max -2.5']){
    const result=importMaxPatcher(source([{id:'m',maxclass:'message',text},{id:'n',maxclass:'number'}],
      [{source:['m',0],destination:['n',0]}]),{allowPartial:true});
    assert.equal(result.patch.edges.length,0);
    assert.ok(result.diagnostics.some(row=>row.code==='unsupported-edge'));
  }
});

test('physical Tab is a separate queued action after numeric commit and selector tab stays data',async()=>{
  const calls=[];let release;
  const c=createCanvasController({patch:flat([makeNode('number_int',1),makeNode('flonum',2),makeNode('number',3)]),invoke:async(name,args)=>{
    calls.push({name,args});if(name==='canvas_apply')return{revision:9};
    if(name==='canvas_param')await new Promise(resolve=>release=resolve);
    return true;
  }});
  await c.prepare();const value=c.parameter(1,'value',7),tab=c.tab(1);
  assert.equal(calls.some(call=>call.name==='canvas_event'),false);
  release();await Promise.all([value,tab]);await c.event(2,0,'tab');await c.tab(2);await c.flush();
  assert.deepEqual(calls.filter(call=>call.name==='canvas_event').map(call=>call.args),[
    {revision:9,node:1,inlet:0,value:[7]},
    {revision:9,node:1,inlet:0,value:null,action:'tab'},
    {revision:9,node:2,inlet:0,value:'tab'},
    {revision:9,node:2,inlet:0,value:null,action:'tab'},
  ]);
  assert.throws(()=>c.tab(3),/Tab/);
});

test('shared numeric Tab waits for atomic hot admission and close barriers cancel it',async()=>{
  const patch=flat([makeNode('number_int',1)]),calls=[];let release;
  const descriptor={shared:true,label:'owner',ownerLabel:'owner',id:1,title:'Numbers',viewPath:[],patch,authoringRevision:1,runtimeRevision:11};
  const c=createSharedCanvasController({invoke:async(name,args)=>{
    calls.push({name,args:structuredClone(args)});
    if(name==='document_current')return structuredClone(descriptor);
    if(name==='document_commit'){
      await new Promise(resolve=>release=resolve);
      descriptor.patch=args.patch;descriptor.authoringRevision++;
      return{accepted:true,document:structuredClone(descriptor)};
    }
    return true;
  }});
  await c.prepare();c.parameter(1,'value',8);const tab=c.tab(1);
  assert.equal(calls.some(call=>call.name==='canvas_event'),false);
  await new Promise(resolve=>setImmediate(resolve));
  release();await tab;await c.flush();
  assert.deepEqual(calls.find(call=>call.name==='document_commit').args.parameter,{node:1,key:'value',value:8,hot:true});
  assert.deepEqual(calls.find(call=>call.name==='canvas_event').args,{revision:11,node:1,inlet:0,value:null,action:'tab'});
  const before=calls.length;await c.flushBeforeClose({requestLabel:'owner',token:13});await c.tab(1);
  assert.equal(calls.slice(before).some(call=>call.name==='canvas_event'),false);
});
