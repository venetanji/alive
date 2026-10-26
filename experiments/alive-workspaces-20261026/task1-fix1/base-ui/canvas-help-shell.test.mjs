import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {REGISTRY,nodeSpec,parsePatch,serializePatch,validatePatch} from './canvas-model.mjs';
import {lowerHierarchy,treeNodes} from './canvas-hierarchy.mjs';
import {OBJECTS} from './canvas-catalog.mjs';

const cases=JSON.parse(readFileSync(new URL('../tests/fixtures/help-shell-schema.json',import.meta.url),'utf8'));
test('original help shell schema corpus agrees with strict native admission',()=>{
  for(const entry of cases){
    if(!entry.valid){assert.throws(()=>validatePatch(entry.patch),undefined,entry.name);continue;}
    const patch=validatePatch(entry.patch);
    assert.deepEqual(parsePatch(serializePatch(patch)),patch,entry.name);
    assert.deepEqual(patch.helpShell,entry.patch.helpShell,entry.name);
    const executable=lowerHierarchy(patch);
    assert.equal(Object.hasOwn(executable,'helpShell'),false);
    assert.equal(executable.nodes.some(node=>node.type==='help_helper'),false);
    for(const helper of treeNodes(patch).filter(node=>node.type==='help_helper')){
      assert.equal(nodeSpec(helper).inlets.length,0);assert.equal(nodeSpec(helper).outlets.length,0);
    }
  }
  assert.equal(Object.hasOwn(REGISTRY,'help_helper'),false);
  assert.equal(Object.hasOwn(OBJECTS,'help_helper'),false);
});
