import test from 'node:test';
import assert from 'node:assert/strict';
import {makeNode, nodeSpec, validatePatch, CanvasDocument} from './canvas-model.mjs';
import {parseObjectText, objectText} from './canvas-catalog.mjs';
import {readFileSync} from 'node:fs';
import {deviceValues,presetParameters} from './canvas-device.mjs';
import {packageInstrument,subtractivePatch} from './canvas-instrument.mjs';

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

test('repackaging retains authored bindings, ranges, presets and interfaces',()=>{
  const before=subtractivePatch();
  before.device.parameters[4]={...before.device.parameters[4],key:'tone',label:'Tone',min:100,max:9000,unit:'Hz'};
  for(const preset of before.device.presets){preset.values.tone=preset.values.cutoff;delete preset.values.cutoff;}
  const after=packageInstrument(before,{id:before.device.id,name:'Renamed'});
  assert.deepEqual(after.device.presets,before.device.presets);
  assert.deepEqual(after.device.parameters,before.device.parameters);
  assert.deepEqual(after.device.midi,before.device.midi);
  assert.deepEqual(after.device.audio,before.device.audio);
  assert.equal(after.device.name,'Renamed');
  assert.deepEqual(before,subtractivePatchWithTone());
});
function subtractivePatchWithTone(){
  const patch=subtractivePatch();patch.device.parameters[4]={...patch.device.parameters[4],key:'tone',label:'Tone',min:100,max:9000,unit:'Hz'};
  for(const preset of patch.device.presets){preset.values.tone=preset.values.cutoff;delete preset.values.cutoff;}return patch;
}
test('repackaging rejects incompatible saved bindings without changing the input',()=>{
  const before=subtractivePatch();before.device.parameters[0].node=999;const snapshot=structuredClone(before);
  assert.throws(()=>packageInstrument(before,{id:before.device.id,name:'Renamed'}),/binding.*attack/i);
  assert.deepEqual(before,snapshot);
});
test('repackaging accepts a valid non-template version 2 device',()=>{
  const before={...graph(),device:{...manifest(),version:2,kind:'instrument',midi:{input:{node:1,inlet:0},output:null},audio:{input:null,output:{channels:2,layout:'stereo'}}}};
  const after=packageInstrument(before,{id:before.device.id,name:'Renamed'});
  assert.deepEqual(after.device,{...before.device,name:'Renamed'});
});

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

test('version 2 instruments retain authored MIDI with explicit stereo output',()=>{
  const patch={...graph(),device:{...manifest(),version:2,kind:'instrument',
    midi:{input:{node:1,inlet:0},output:null},audio:{input:null,output:{channels:2,layout:'stereo'}}}};
  assert.equal(validatePatch(patch).device.kind,'instrument');
  for(const change of [d=>delete d.kind,d=>d.audio.input={node:3,bundle:{channels:2,layout:'stereo'}},
    d=>d.midi.output={},d=>delete d.midi.output,d=>d.audio.output.layout='discrete',d=>d.kind='audioEffect']){
    const invalid=structuredClone(patch);change(invalid.device);assert.throws(()=>validatePatch(invalid),/device/i);
  }
});

test('version 2 effects bind stereo audio input and live filter parameters without MIDI',()=>{
  const patch={version:1,profile:'ultra-canvas-v1',nodes:[makeNode('audio_in',1),makeNode('filter_stereo',2),makeNode('signal_dac',3,0,0,{channels:'1 2'})],
    edges:[[1,0,2,0],[1,1,2,1],[2,0,3,0],[2,1,3,1]].map(([from,outlet,to,inlet])=>({from,outlet,to,inlet})),
    device:{version:2,id:'org.alive.test-effect',name:'Stereo lowpass',kind:'audioEffect',midi:{input:null,output:null},
      audio:{input:{node:1,bundle:{channels:2,layout:'stereo'}},output:{channels:2,layout:'stereo'}},
      parameters:[{key:'cutoff',label:'Cutoff',node:2,param:'cutoff',min:20,max:20000}],presets:[{name:'Soft',values:{cutoff:350}}]}};
  assert.equal(validatePatch(patch).device.kind,'audioEffect');
  for(const change of [d=>d.midi.input={node:1,inlet:0},d=>d.audio.input=null,d=>d.audio.input.node=2,
    d=>d.audio.input.bundle.channels=1,d=>d.audio.input.bundle.layout='mono',d=>d.audio.output.channels=4,
    d=>d.audio.input.extra=true,d=>delete d.audio.input,d=>d.kind='effect']){
    const invalid=structuredClone(patch);change(invalid.device);assert.throws(()=>validatePatch(invalid),/device/i);
  }
});

test('saved stereo effects retain authored routes, stable parameter keys and working presets',()=>{
  for(const [file,id,keys] of [['utility','org.alive.utility',['gain']],['stereo-lowpass','org.alive.stereo-lowpass',['cutoff','resonance']]]){
    const patch=validatePatch(JSON.parse(readFileSync(new URL(`../examples/${file}.ultra`,import.meta.url),'utf8')));
    assert.equal(patch.device.id,id);assert.equal(patch.device.kind,'audioEffect');assert.deepEqual(patch.device.parameters.map(p=>p.key),keys);
    const doc=new CanvasDocument(patch);
    for(const change of presetParameters(patch,patch.device.presets[1].name))doc.parameter(change.node,change.key,change.value);
    assert.deepEqual(deviceValues(doc.document),patch.device.presets[1].values);
    for(const node of patch.nodes)if(['audio_in','filter_stereo'].includes(node.type))assert.equal(parseObjectText(objectText(node)).type,node.type);
    if(file==='utility'){
      assert.equal(patch.nodes.filter(n=>n.type==='signal_multiply').length,2);
      const gain=patch.nodes.find(n=>n.type==='line_signal');assert.equal(patch.device.parameters[0].node,gain.id);
      assert.equal(patch.edges.filter(e=>e.from===gain.id).length,2);
    }
  }
});
