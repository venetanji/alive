import test from 'node:test';
import assert from 'node:assert/strict';
import {makeNode, nodeSpec, validatePatch, CanvasDocument} from './canvas-model.mjs';
import {parseObjectText, objectText} from './canvas-catalog.mjs';

const manifest=()=>({version:1,id:'org.alive.test',name:'Test synth',midi:{node:1,inlet:0},
  audio:{inputs:0,outputs:2,layout:'stereo'},parameters:[{key:'cutoff',label:'Cutoff',node:3,param:'cutoff',min:20,max:20000,unit:'Hz'}],
  presets:[{name:'Soft',values:{cutoff:350}}]});

const graph = () => ({version:1,profile:'ultra-canvas-v1',nodes:[
  makeNode('poly_note',1),makeNode('saw_voice',2),makeNode('filter_voice',3),
  makeNode('adsr_voice',4),makeNode('multiply_voice',5),makeNode('mix_voice',6),
  makeNode('gain',7),makeNode('join',8),makeNode('dac',9),
],edges:[[1,0,2,0],[2,0,3,0],[1,1,4,0],[3,0,5,0],[4,0,5,1],
  [5,0,6,0],[6,0,7,0],[7,0,8,0],[7,0,8,1],[8,0,9,0]]
  .map(([from,outlet,to,inlet])=>({from,outlet,to,inlet}))});

test('a subtractive voice graph connects through an explicit four-lane mixdown to stereo',()=>{
  const patch=validatePatch(graph());
  assert.equal(patch.nodes.length,9);
  const lanes=nodeSpec(patch.nodes[0]).outlets;
  assert.deepEqual(lanes.map(port=>[port.type,port.channels]),[['voice4',4],['voice4',4],['voice4',4]]);
  assert.equal(nodeSpec(patch.nodes[5]).outlets[0].type,'mono');
  assert.equal(nodeSpec(patch.nodes[7]).outlets[0].type,'stereo');
});

test('voice lanes cannot silently become mono or accept a mono oscillator',()=>{
  const patch=graph();patch.edges.push({from:1,outlet:0,to:7,inlet:0});
  assert.throws(()=>validatePatch(patch),/type mismatch/i);
  const other=graph();other.nodes.push(makeNode('cycle',10));
  other.edges.push({from:10,outlet:0,to:3,inlet:0});
  assert.throws(()=>validatePatch(other),/type mismatch/i);
});

test('voice dependency cycles and a second allocator are rejected',()=>{
  const patch=graph();patch.edges.push({from:5,outlet:0,to:3,inlet:0});
  assert.throws(()=>validatePatch(patch),/cycles/i);
  const second=graph();second.nodes.push(makeNode('poly_note',10));
  assert.throws(()=>validatePatch(second),/one poly_note/i);
});

test('all six objects are keyboard-authorable and live parameter edits retain their bounds',()=>{
  for(const text of ['poly.note~ 4','saw.voice~','lowpass.voice~ 2400 0.7',
    'adsr.voice~ 10 150 0.65 300','*.voice~','mix.voice~']){
    const parsed=parseObjectText(text);
    assert.deepEqual(parseObjectText(objectText({...makeNode(parsed.type,1),params:parsed.params})),parsed);
  }
  const doc=new CanvasDocument(graph());
  doc.parameter(3,'cutoff',350);assert.equal(doc.patch.nodes[2].params.cutoff,350);
  assert.throws(()=>doc.parameter(3,'resonance',40),/resonance/i);
  assert.throws(()=>parseObjectText('poly.note~ 5'),/voices/i);
});

test('device bindings and presets survive serialization and metadata edits are undoable',()=>{
  const patch={...graph(),device:manifest()};
  const document=new CanvasDocument(JSON.parse(JSON.stringify(patch)));
  assert.deepEqual(document.document.device,manifest());
  document.setDevice({...manifest(),name:'Renamed'});
  assert.equal(document.document.device.name,'Renamed');
  document.undo();assert.equal(document.document.device.name,'Test synth');
});

test('malformed device interfaces, duplicate bindings and out-of-range presets fail admission',()=>{
  for(const change of [
    d=>d.audio.outputs=4,d=>d.midi.node=3,d=>d.parameters[0].param='missing',
    d=>d.parameters[0].min=0,d=>d.presets[0].values.cutoff=0,
    d=>d.presets[0].values.extra=2,d=>d.parameters.push({...d.parameters[0],key:'other'}),
    d=>d.parameters[0].key='__proto__',d=>d.unrecognized=true,
  ]){
    const patch={...graph(),device:manifest()};change(patch.device);
    assert.throws(()=>validatePatch(patch),/device/i);
  }
});
