import test from 'node:test';
import assert from 'node:assert/strict';
import {createNumber} from './live-controls.mjs';
import {dom} from '../tests/presentation-dom.mjs';

test('disabled numeric input ignores synthetic events and refreshes from accepted state without a draft',()=>{
  const {doc}=dom(),writes=[],control=createNumber(doc,{value:.25,min:0,max:1,disabled:true,onChange:value=>writes.push(value)});
  control.input.value='.9';control.input.fire('input');control.input.fire('change');
  assert.equal(control.hasDraft(),false);assert.deepEqual(writes,[]);
  control.update(.75);assert.equal(control.input.value,'0.75');assert.equal(control.input.disabled,true);control.dispose();
});

test('disabling numeric input preserves a legitimate existing draft until it can commit',()=>{
  const {doc}=dom(),writes=[],control=createNumber(doc,{value:.25,min:0,max:1,onChange:value=>writes.push(value)});
  control.input.value='.6';control.input.fire('input');control.setDisabled(true);
  control.input.fire('input');control.input.fire('change');control.update(.75);
  assert.equal(control.hasDraft(),true);assert.equal(control.input.value,'.6');assert.deepEqual(writes,[]);
  control.setDisabled(false);control.input.fire('change');
  assert.equal(control.hasDraft(),false);assert.equal(control.input.value,'0.6');assert.deepEqual(writes,[.6]);control.dispose();
});
