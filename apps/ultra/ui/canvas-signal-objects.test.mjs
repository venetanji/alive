import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {CanvasDocument, REGISTRY, createCanvasController, makeNode, nodeSpec, validatePatch} from './canvas-model.mjs';
import {OBJECTS, objectText, parseObjectText, portHelp} from './canvas-catalog.mjs';
import {completionFor} from './canvas-completion.mjs';
import {importMaxPatcher} from './canvas-max-import.mjs';
import {OBJECT_EXAMPLES} from './canvas-object-examples.mjs';
import {createLibraryPatch, searchLibrary} from './canvas-library.mjs';

const types=['sig','signal_add','signal_subtract','signal_multiply','signal_divide','cycle','phasor','noise','signal_clip','line_signal','snapshot','signal_dac'];
const empty=()=>({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[],edges:[]});
const edge=(from,to,inlet=0,outlet=0)=>({from,outlet,to,inlet});
const box=(id,text,extra={})=>({box:{id,maxclass:'newobj',text,patching_rect:[40,60,120,22],...extra}});
const message=(id,text)=>({box:{id,maxclass:'message',text,patching_rect:[40,20,120,22]}});
const wire=(from,to,inlet=0)=>({patchline:{source:[from,0],destination:[to,inlet]}});
const source=(boxes,lines=[])=>({patcher:{boxes,lines}});

test('signal authoring follows Max positional syntax and observed defaults',()=>{
  const cases=[
    ['sig~','sig',{args:'0'}],['sig~ 0.25 -0.5 2','sig',{args:'0.25 -0.5 2'}],
    ['+~','signal_add',{rhs:0}],['-~ 2','signal_subtract',{rhs:2}],['*~ 0.1','signal_multiply',{rhs:0.1}],['/~','signal_divide',{rhs:0}],
    ['cycle~ 440','cycle',{frequency:440,phase:0}],['phasor~ 2','phasor',{frequency:2,phase:0}],
    ['noise~','noise',{}],['clip~','signal_clip',{minimum:0,maximum:0}],['clip~ 1 -1','signal_clip',{minimum:1,maximum:-1}],
    ['line~ 0.5','line_signal',{value:0.5,time:0}],['snapshot~ 25','snapshot',{interval:25,offset:0}],['dac~','signal_dac',{channels:'1 2'}],['dac~ 2 1 2','signal_dac',{channels:'2 1 2'}],
  ];
  for(const [text,type,params]of cases){
    assert.deepEqual(parseObjectText(text),{type,params},text);
    assert.equal(parseObjectText(objectText(makeNode(type,1,40,60,params))).type,type,text);
  }
  assert.equal(parseObjectText('stereo.dac~').type,'dac');
  assert.equal(objectText(makeNode('dac',1)),'stereo.dac~');
  for(const text of ['cycle~ 440 0.25','cycle~ wave','phasor~ 2 0.25','phasor~ 4n','line~ 0 10','snapshot~ 25 1','noise~ 1','ezdac~'])assert.throws(()=>parseObjectText(text),undefined,text);
});

test('signal text edits preserve saved inspector settings without treating them as positional Max arguments',()=>{
  for(const [type,params,text]of [['cycle',{frequency:440,phase:0.25},'cycle~ 440 @phase 0.25'],['phasor',{frequency:2,phase:-0.25},'phasor~ 2 @phase -0.25'],['line_signal',{value:0.5,time:100},'line~ 0.5 @time 100'],['snapshot',{interval:25,offset:63},'snapshot~ 25 @offset 63']]){
    const node=makeNode(type,1,0,0,params);
    assert.equal(objectText(node),text);assert.deepEqual(parseObjectText(text),{type,params});
    assert.equal(importMaxPatcher(source([box('o',text)]),{allowPartial:true}).patch,null,text);
  }
  for(const text of ['snapshot~ 25 @offset -1','snapshot~ 25 @offset 64','line~ 0 @time -1'])assert.throws(()=>parseObjectText(text),undefined,text);
});

test('signal completion explains frequency and phase units and channel limitations',()=>{
  const cycle=completionFor('cycle~ '),frequency=cycle.parameters.find(parameter=>parameter.key==='frequency'),phase=cycle.parameters.find(parameter=>parameter.key==='phase');
  assert.match(frequency.detail,/Hz|hertz/i);assert.match(phase.detail,/cycles|phase/i);
  assert.ok(!frequency.detail.includes('undefined'));assert.equal(cycle.syntax,'cycle~ [frequency]');
  assert.match(completionFor('dac~ ').parameters[0].detail,/left.*right|1.*2/i);
});

test('sig values and output channels are bounded numeric creation lists with dynamic ports',()=>{
  const sig=makeNode('sig',1,40,40,{args:'0.25 -0.5 2'}),dac=makeNode('signal_dac',2,40,160,{channels:'2 1 2'});
  assert.equal(nodeSpec(sig).inlets.length,1);
  assert.deepEqual(nodeSpec(sig).outlets.map(port=>port.type),['mono','mono','mono']);
  assert.equal(nodeSpec(dac).inlets.length,3);
  for(const inlet of nodeSpec(dac).inlets)assert.equal(inlet.type,'mono');
  assert.deepEqual(nodeSpec(sig).inlets[0].accepts,['control','mono']);
  assert.doesNotThrow(()=>validatePatch({...empty(),nodes:[sig,dac],edges:[edge(1,2,2,2)]}));
  for(const args of ['','red','1 red','1 2 3 4 5 6 7 8 9','100001'])assert.throws(()=>validatePatch({...empty(),nodes:[makeNode('sig',1,0,0,{args})]}),undefined,args);
  for(const channels of ['','0','3','1.5','red','1 2 1 2 1 2 1 2 1'])assert.throws(()=>validatePatch({...empty(),nodes:[makeNode('signal_dac',1,0,0,{channels})]}),undefined,channels);
});

test('mono fan-in sums and independent legacy gain branches remain valid signal paths',()=>{
  const nodes=[makeNode('sig',1),makeNode('noise',2),makeNode('signal_add',3),makeNode('gain',4),makeNode('gain',5),makeNode('signal_dac',6),makeNode('message',7,0,0,{text:'0.5'})];
  const edges=[edge(1,3),edge(2,3),edge(7,3,1),edge(3,4),edge(3,5),edge(4,6),edge(5,6)];
  assert.doesNotThrow(()=>validatePatch({...empty(),nodes,edges}));
  assert.throws(()=>validatePatch({...empty(),nodes,edges:[...edges,edge(1,7)]}),/type/i);
  assert.throws(()=>validatePatch({...empty(),nodes,edges:[...edges,edge(7,4)]}),/type/i);
});

test('separate signal and control cycles reject zero-delay feedback but permit snapshot boundaries',()=>{
  const nodes=[makeNode('sig',1),makeNode('snapshot',2),makeNode('signal_add',3),makeNode('bang',4),makeNode('bang',5)];
  assert.doesNotThrow(()=>validatePatch({...empty(),nodes,edges:[edge(1,2),edge(2,1)]}));
  assert.throws(()=>validatePatch({...empty(),nodes,edges:[edge(3,3)]}),/signal.*cycl|cycl.*signal/i);
  assert.throws(()=>validatePatch({...empty(),nodes,edges:[edge(4,5),edge(5,4)]}),/control.*cycl|cycl.*control/i);
});

test('signal dac channel edits rebuild graphs and undo restores their ports',async()=>{
  const patch={...empty(),nodes:[makeNode('signal_dac',1)]},document=new CanvasDocument(patch);
  document.parameter(1,'channels','2');assert.equal(nodeSpec(document.patch.nodes[0]).inlets.length,1);
  document.undo();assert.equal(nodeSpec(document.patch.nodes[0]).inlets.length,2);
  const applied=[],controller=createCanvasController({patch,invoke:async(name,args)=>{if(name==='canvas_apply'){applied.push(args.patch);return{revision:applied.length};}return true;}});
  await controller.prepare();controller.parameter(1,'channels','2');await controller.flush();
  assert.equal(applied.length,2);assert.equal(applied[1].nodes[0].params.channels,'2');
  controller.undo();await controller.flush();assert.equal(applied.length,3);assert.equal(applied[2].nodes[0].params.channels,'1 2');
});

test('mixed signal inlets accept direct control events through the native controller',async()=>{
  const calls=[],controller=createCanvasController({patch:{...empty(),nodes:[makeNode('signal_add',1)]},invoke:async(name,args)=>{calls.push({name,args});return name==='canvas_apply'?{revision:1}:true;}});
  await controller.prepare();await controller.event(1,1,[0.5]);await controller.flush();
  assert.deepEqual(calls.find(call=>call.name==='canvas_event')?.args,{revision:1,node:1,inlet:1,value:[0.5]});
});

test('Max signal import preserves mono topology and mixed message connections',()=>{
  const result=importMaxPatcher(source([box('s','sig~ 0.25'),box('a','+~ 0.5'),message('m','0.75'),box('d','dac~ 1 2')],[wire('s','a'),wire('m','a',1),wire('a','d'),wire('a','d',1)]),{allowPartial:true});
  assert.ok(result.patch);assert.equal(result.stats.omittedBoxes,0);assert.equal(result.stats.omittedEdges,0);
  assert.deepEqual(result.patch.nodes.map(node=>node.type),['sig','signal_add','message_box','signal_dac']);assert.equal(result.patch.edges.length,4);
});

test('unsupported Max signal attributes and runtime methods remain explicit import gaps',()=>{
  for(const text of ['cycle~ wave','cycle~ 440 0.25','phasor~ 4n','dac~ 3','ezdac~','clip~ -1 1 @mode 1'])assert.equal(importMaxPatcher(source([box('s',text)]),{allowPartial:true}).patch,null,text);
  for(const [text,attribute]of [['cycle~','buffer'],['cycle~','buffer_offset'],['cycle~','buffer_sizeinsamps'],['phasor~','phaseoffset'],['phasor~','syncupdate'],['phasor~','jitter'],['phasor~','limit'],['phasor~','lock'],['phasor~','transport'],['clip~','mode'],['line~','activeout'],['line~','maxpoints'],['snapshot~','sampleinterval']]){
    const result=importMaxPatcher(source([box('s',text,{[attribute]:1})]),{allowPartial:true});
    assert.equal(result.patch,null,`${text}: ${attribute}`);assert.ok(result.diagnostics.some(d=>d.code==='unsupported-box'));
  }
  for(const [text,method]of [['cycle~','set wave'],['phasor~','lock 1'],['clip~','mode 1'],['dac~','startwindow'],['noise~','seed 100']]){
    const result=importMaxPatcher(source([message('m',method),box('s',text)],[wire('m','s')]),{allowPartial:true});
    assert.ok(result.patch);assert.equal(result.patch.edges.length,0,`${text}: ${method}`);assert.ok(result.diagnostics.some(d=>d.code==='unsupported-edge'));
  }
});

test('Max signal literal admission checks supported data shape for each inlet',()=>{
  const cases=[
    ['sig~ 0 0','0.25 -0.5',0,true],['sig~ 0 0','set 1 0.5',0,true],['sig~ 0 0','set 2 0.5',0,false],['sig~','bang',0,false],
    ['+~','0.5',0,true],['+~','list 0.5',1,true],['+~','1 2',0,false],['+~','bang',0,false],
    ['cycle~','reset 0.25',0,true],['cycle~','reset 0.25',1,false],['cycle~','set wave',0,false],
    ['phasor~','0.25',1,true],['phasor~','4n',0,false],['clip~ -1 1','0.5',2,true],['clip~ -1 1','1 2',0,false],
    ['line~','1 20 0 20',0,true],['line~','1 -20',0,false],['line~','1 20 0',0,false],['line~','20',1,true],['line~','-1',1,false],['line~','stop',0,true],
    ['snapshot~','bang',0,true],['snapshot~','20',1,true],['snapshot~','20',0,false],['snapshot~','-1',1,false],
    ['snapshot~','offset 0',0,true],['snapshot~','offset 63',0,true],['snapshot~','offset -1',0,false],['snapshot~','offset 64',0,false],['snapshot~','offset 0.5',0,false],['snapshot~','offset 1 2',0,false],['snapshot~','offset 1',1,false],
    ['snapshot~','start',0,true],['snapshot~','stop',0,true],['snapshot~','start 1',0,false],['snapshot~','start',1,false],['snapshot~','sampleinterval 1',0,false],
    ['noise~','1',0,false],['dac~','1',0,false],['dac~','bang',0,false],
  ];
  for(const [text,literal,inlet,accepted]of cases){
    const result=importMaxPatcher(source([message('m',literal),box('o',text)],[wire('m','o',inlet)]),{allowPartial:true});
    assert.ok(result.patch,`${text}: ${literal}`);assert.equal(result.patch.edges.length,accepted?1:0,`${text}: ${literal}, inlet ${inlet}`);
  }
});

test('signal help explains accepted port messages without promising arbitrary selectors',()=>{
  for(const type of types){
    assert.ok(REGISTRY[type]?.help,type);assert.ok(OBJECTS[type]?.summary,type);
    const spec=nodeSpec(makeNode(type,1));
    for(const direction of ['in','out'])for(let index=0;index<(direction==='in'?spec.inlets:spec.outlets).length;index++){
      const help=portHelp(type,direction,index);assert.ok(help.detail,type);assert.ok(!help.messages.includes('named selector'),`${type}: ${direction}${index}`);
    }
  }
  assert.match(portHelp('signal_divide','in',1).detail,/zero|0/);
  assert.match(portHelp('snapshot','out',0).detail,/float|sample/i);
  assert.ok(portHelp('snapshot','in',0).messages.includes('offset <0-63>'));
  assert.ok(portHelp('snapshot','in',0).messages.includes('start'));
  assert.ok(portHelp('snapshot','in',0).messages.includes('stop'));
  assert.match(portHelp('signal_dac','in',0).detail,/shared|channel/i);
});

test('each signal help patch is original, runnable and matches its installed example',async()=>{
  for(const type of types){
    const patch=createLibraryPatch(`help:${type}`),file=JSON.parse(await readFile(new URL(`../examples/${type}.ultra`,import.meta.url),'utf8'));
    assert.deepEqual(file,OBJECT_EXAMPLES[type],type);assert.deepEqual(patch,validatePatch(file),type);
    assert.ok(patch.nodes.some(node=>node.type===type),type);assert.ok(patch.edges.length,type);
    assert.ok(searchLibrary(OBJECTS[type].name,'help').some(entry=>entry.objectType===type),type);
    assert.ok(patch.nodes.some(node=>node.type==='print'),type);
  }
});
