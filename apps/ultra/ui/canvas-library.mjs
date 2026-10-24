import {OBJECTS} from './canvas-catalog.mjs';
import {makeNode,starterPatch,validatePatch} from './canvas-model.mjs';
import {OBJECT_EXAMPLES} from './canvas-object-examples.mjs';
import {subtractivePatch} from './canvas-instrument.mjs';
import {utilityPatch,stereoLowpassPatch} from './canvas-effects.mjs';

const copy=value=>JSON.parse(JSON.stringify(value));
const groups={bang:'UI Controls',toggle:'UI Controls',number:'UI Controls',flonum:'UI Controls',slider:'UI Controls',message:'Messages & Numbers',int:'Messages & Numbers',float:'Messages & Numbers',add:'Messages & Numbers',multiply:'Messages & Numbers',pack:'Routing',unpack:'Routing',select:'Routing',route:'Routing',trigger:'Routing',send:'Routing',receive:'Routing',print:'Routing',metro:'Timing',counter:'Timing',line:'Timing',chord:'Notes & MIDI',makenote:'Notes & MIDI',midiin:'Notes & MIDI',voice:'Audio',gain:'Audio',join:'Audio',dac:'Audio',sig:'Audio',signal_add:'Audio',signal_subtract:'Audio',signal_multiply:'Audio',signal_divide:'Audio',cycle:'Audio',phasor:'Audio',noise:'Audio',signal_clip:'Audio',line_signal:'Audio',snapshot:'Audio',signal_dac:'Audio'};
const summaries={dac:'Send a stereo bundle to the shared native audio output.',midiin:'Inspect MIDI channel routing. Physical MIDI input is unavailable in the desktop audio path.'};
groups.number_int='UI Controls';
groups.message_box='Messages & Numbers';
groups.audio_in=groups.filter_stereo='Audio';

function demo(type){
  if(type==='audio_in')return utilityPatch();
  if(type==='filter_stereo')return stereoLowpassPatch();
  if(['poly_note','saw_voice','filter_voice','adsr_voice','multiply_voice','mix_voice'].includes(type))return subtractivePatch();
  if(['patcher','comment','inlet','outlet'].includes(type)){
    const wire=(from,to)=>({from,outlet:0,to,inlet:0});
    const annotation=makeNode('comment',7,200,50,{text:'Double-click p basic to enter. All objects share this document runtime.'});
    const child={nodes:[makeNode('inlet',3,60,50),makeNode('signal_add',4,60,120,{rhs:10}),makeNode('outlet',5,60,190)],edges:[wire(3,4),wire(4,5)]};
    if(['inlet','outlet'].includes(type))return{version:2,profile:'ultra-patcher-v2',...child};
    return{version:2,profile:'ultra-patcher-v2',nodes:[makeNode('message',1,60,50,{text:'7'}),{...makeNode('patcher',2,60,140,{name:'basic'}),patcher:child},makeNode('snapshot',6,60,230),annotation],edges:[wire(1,2),wire(2,6)]};
  }
  if(Object.hasOwn(OBJECT_EXAMPLES,type))return copy(OBJECT_EXAMPLES[type]);
  if(['voice','gain','join','dac'].includes(type)){
    const patch=starterPatch();for(const node of patch.nodes)if(node.type==='gain')node.params.value=4;return patch;
  }
  const patch={version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]};
  const node=(type,x,y,params={})=>{const value=makeNode(type,patch.nodes.length+1,x,y,params);patch.nodes.push(value);return value.id;};
  const cable=(from,to,inlet=0)=>patch.edges.push({from,outlet:0,to,inlet});
  if(['send','receive'].includes(type)){
    const message=node('message',65,65,{text:'60 100'}),send=node('send',65,125,{name:'ultra-help-notes'}),receive=node('receive',330,125,{name:'ultra-help-notes'}),print=node('print',330,200,{label:'named-notes'});
    cable(message,send);cable(receive,print);return patch;
  }
  if(type==='midiin'){
    const source=node(type,65,65),print=node('print',65,150,{label:'midi-notes'});cable(source,print);return patch;
  }
  const source=node(type==='metro'?'toggle':'message',65,65,type==='metro'?{}:{text:['bang','toggle','counter','chord'].includes(type)?'bang':type==='makenote'?'60 100':'12'});
  const target=node(type,65,145,type==='add'?{rhs:12,numericmode:1}:type==='multiply'?{rhs:0.5,numericmode:2}:{}),print=node('print',65,235,{label:type});
  cable(source,target);cable(target,print);return patch;
}

export const LIBRARY_ENTRIES=Object.freeze([
  {key:'example:utility',kind:'example',title:'Stereo Utility',group:'Effects',summary:'A reusable stereo effect with one line~ gain shared by two authored multiplies. Host audio input is silent when opened alone.',patch:utilityPatch()},
  {key:'example:stereo-lowpass',kind:'example',title:'Stereo Lowpass',group:'Effects',summary:'A reusable stereo Faust lowpass effect with live cutoff, resonance and presets. Host audio input is silent when opened alone.',patch:stereoLowpassPatch()},
  {key:'example:subtractive',kind:'example',title:'Subtractive instrument',group:'Instruments',summary:'An editable four-voice saw, resonant filter and ADSR device. Perform opens its keyboard, controls and presets.',patch:subtractivePatch()},
  {key:'example:starter',kind:'example',title:'Chord sequencer',group:'Getting Started',summary:'A complete two-voice patch. Lock it, start audio, then switch on the clock.',patch:demo('voice')},
  ...Object.entries(OBJECTS).flatMap(([type,spec])=>['help','example'].map(kind=>({key:`${kind}:${type}`,kind,title:kind==='help'?`${spec.name} help`:`${spec.name} example`,group:groups[type]||'Messages & Numbers',summary:summaries[type]||spec.summary,objectType:type,patch:demo(type)}))),
]);

export function createLibraryPatch(key){
  const entry=LIBRARY_ENTRIES.find(entry=>entry.key===key);if(!entry)throw Error(`Unknown help or example: ${key}.`);
  return validatePatch(copy(entry.patch));
}

export function searchLibrary(query='',kind='all'){
  const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return LIBRARY_ENTRIES.filter(entry=>(kind==='all'||entry.kind===kind)&&words.every(word=>`${entry.title} ${entry.group} ${entry.summary} ${entry.objectType||''} ${(OBJECTS[entry.objectType]?.aliases||[]).join(' ')}`.toLowerCase().includes(word)));
}
