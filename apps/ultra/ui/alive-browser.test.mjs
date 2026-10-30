import test from 'node:test';
import assert from 'node:assert/strict';
import {browserEntries,filterEntries} from './alive-browser.mjs';

const document={format:'alive-session-v4',tracks:[{id:'track-1',name:'Pulse',chain:{kind:'midi',instrument:{instanceId:'inst-1',path:'/devices/synth.ultra'}},effects:[{instanceId:'fx-1',path:'/devices/gain.ultra'}]}],sources:[{id:'source-1',trackId:'track-1',kind:'midi',name:'Opening Chords',lengthBeats:8}]};
const instances={'inst-1':{manifest:{name:'Subtractive Instrument'}},'fx-1':{manifest:{name:'Stereo Utility'}}};
test('browser indexes real device references and current project sources without changing them',()=>{
  const before=structuredClone(document),entries=browserEntries([],document,instances);
  assert.deepEqual(entries.map(e=>e.kind),['instrument','effect','source']);
  assert.equal(entries[0].path,'/devices/synth.ultra');assert.equal(entries[2].sourceId,'source-1');
  assert.deepEqual(document,before);
});
test('bundled and loaded copies share one result and search is case insensitive',()=>{
  const bundled=[{id:'subtractive',name:'Subtractive Instrument',kind:'instrument',path:'/devices/synth.ultra'}];
  const entries=browserEntries(bundled,document,instances);
  assert.equal(entries.filter(e=>e.path==='/devices/synth.ultra').length,1);
  assert.deepEqual(filterEntries(entries,'CHORD','source').map(e=>e.name),['Opening Chords']);
  assert.deepEqual(filterEntries(entries,'stereo','instrument'),[]);
  assert.deepEqual(filterEntries(entries,'no-matching-result','all'),[]);
});
test('clip-bank source entries retain their owning track and slot',()=>{
  const entries=browserEntries([],{format:'alive-session-v3',tracks:[{id:'track-2',name:'Harmony',device:{instanceId:'inst-1',path:'/synth.ultra'},effects:[],slots:[null,{id:'clip-2',name:'Verse',notes:[],lengthBeats:8},null,null]}]},instances);
  assert.deepEqual(entries.find(e=>e.kind==='source'),{id:'clip:track-2:clip-2',kind:'source',name:'Verse',description:'Harmony / 8 beats',trackId:'track-2',slot:1,clipId:'clip-2'});
});
test('project devices use the native resolved path rather than the saved relative reference',()=>{
  const project=structuredClone(document);project.tracks[0].chain.instrument.path='../../devices/synth.ultra';
  const views={...instances,'inst-1':{...instances['inst-1'],path:'/resolved/devices/synth.ultra'}};
  const entries=browserEntries([{kind:'instrument',name:'Subtractive',path:'/resolved/devices/synth.ultra'}],project,views);
  assert.equal(entries.filter(e=>e.kind==='instrument').length,1);
  assert.equal(entries.find(e=>e.kind==='instrument').path,'/resolved/devices/synth.ultra');
  assert.equal(project.tracks[0].chain.instrument.path,'../../devices/synth.ultra');
});
