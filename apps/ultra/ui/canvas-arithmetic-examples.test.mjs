import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {OBJECT_EXAMPLES} from './canvas-object-examples.mjs';
import {validatePatch} from './canvas-model.mjs';

const types=['subtract','divide','modulo','reverse_subtract','reverse_divide','abs'];
test('original arithmetic examples expose direct console output and explicit numeric modes',()=>{
  for(const type of types){
    const patch=OBJECT_EXAMPLES[type];assert.ok(patch,`${type} original example`);
    const source=JSON.parse(readFileSync(new URL(`../examples/${type}.ultra`,import.meta.url),'utf8'));
    assert.deepEqual(patch,source);assert.deepEqual(validatePatch(patch),patch);
    const target=patch.nodes.find(node=>node.type===type),sink=patch.nodes.find(node=>node.type==='print');
    assert.equal(target.params.numericmode,type==='modulo'?1:2);
    assert.ok(patch.edges.some(edge=>edge.from===target.id&&edge.to===sink.id&&edge.outlet===0&&edge.inlet===0));
    if(type!=='abs'){
      assert.ok(patch.edges.some(edge=>edge.to===target.id&&edge.inlet===1),'cold operand control');
      const recall=patch.nodes.find(node=>node.type==='bang');
      assert.ok(patch.edges.some(edge=>edge.from===recall.id&&edge.to===target.id&&edge.inlet===0),'hot recall control');
    }
  }
});

test('new addition and multiplication library demos use explicit typed arithmetic',async()=>{
  const {createLibraryPatch}=await import('./canvas-library.mjs');
  for(const [type,mode]of [['add',1],['multiply',2]]){
    const patch=createLibraryPatch(`help:${type}`),target=patch.nodes.find(node=>node.type===type);
    assert.equal(target.params.numericmode,mode);
    assert.ok(patch.edges.some(edge=>edge.from===target.id&&patch.nodes.find(node=>node.id===edge.to)?.type==='print'));
  }
});
