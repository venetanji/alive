import assert from 'node:assert/strict';
import {test} from 'node:test';
import {completionFor} from './canvas-completion.mjs';

test('object completion exposes syntax and argument guidance from the validated profile',()=>{
  const c=completionFor('mak');
  assert.equal(c.mode,'objects');assert.equal(c.choices[0].label,'makenote');
  assert.equal(c.choices[0].syntax,'makenote [velocity] [duration]');
  const a=completionFor('makenote 100 ');
  assert.equal(a.parameter.key,'duration');
  assert.match(a.parameter.detail,/10 to 2000/);assert.match(a.parameter.detail,/milliseconds/);
  assert.equal(a.parameter.value,150);
  assert.equal(completionFor('metro ').parameter.integer,false);
  assert.equal(completionFor('met 225').choices[0]?.insert,'metro');
  assert.equal(completionFor('met 225').choices[0]?.end,3);
  assert.deepEqual(completionFor('cycle~ ').choices,[]);
});
test('option and value completion follows the caret and retains text after the current token',()=>{
  const option=completionFor('voice~ 1 @re 40',12);
  assert.equal(option.mode,'options');
  assert.deepEqual(option.choices.map(s=>s.label),['@release']);
  const selected=option.choices[0];
  assert.equal('voice~ 1 @re 40'.slice(0,selected.start)+selected.insert+'voice~ 1 @re 40'.slice(selected.end),'voice~ 1 @release 40');
  const values=completionFor('chord 48 ');
  assert.equal(values.parameter.key,'shape');
  assert.deepEqual(values.choices.map(s=>[s.label,s.detail]),[['0','Major'],['1','Minor'],['2','Sus4']]);
  assert.deepEqual(completionFor('voice~ @device ').choices.map(s=>s.label),['0','1']);
  const remaining=completionFor('voice~ 1 @attack 8 @');
  assert.deepEqual(remaining.choices.map(s=>s.label),['@release']);
  assert.deepEqual(completionFor('message @').choices,[]);
  assert.equal(completionFor('message 60 ').parameter.key,'text');
});
