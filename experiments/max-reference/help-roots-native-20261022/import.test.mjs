import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {probeHelpShell} from '../../../apps/ultra/ui/canvas-help-shell.mjs';
import {verifyResources,importBoundSource,writePrivateBundle} from './import.mjs';

const digest=text=>createHash('sha256').update(text).digest('hex');
const sourceSha='d4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729';
async function temporary(run){const directory=await mkdtemp(join(tmpdir(),'ultra-help-import-'));try{await run(directory);}finally{await rm(directory,{recursive:true,force:true});}}

test('resource verification binds exact bytes and all helper hashes before recognition',async()=>temporary(async directory=>{
  await mkdir(join(directory,'help/max'),{recursive:true});await mkdir(join(directory,'help/resources'),{recursive:true});
  await writeFile(join(directory,'help/max/append.maxhelp'),'original synthetic source');
  await writeFile(join(directory,'help/resources/original.js'),'original synthetic helper');
  const catalog={help:{append:{path:'help/max/append.maxhelp',sha256:digest('original synthetic source')}},scripts:{original:{path:'help/resources/original.js',sha256:digest('original synthetic helper')}}};
  const result=await verifyResources(directory,'append',catalog);
  assert.equal(result.source,'original synthetic source');assert.equal(result.helpers.length,1);
  await writeFile(join(directory,'help/resources/original.js'),'changed helper');
  await assert.rejects(()=>verifyResources(directory,'append',catalog),/identity/);
  await writeFile(join(directory,'help/resources/original.js'),'original synthetic helper');
  await writeFile(join(directory,'help/max/append.maxhelp'),'changed source');
  await assert.rejects(()=>verifyResources(directory,'append',catalog),/identity/);
  await assert.rejects(()=>verifyResources(directory,'unknown',catalog),/recognized/);
}));

test('full production import retains original synthetic helpers, empty Message and scoped anchors',async()=>{
  const fixture=JSON.parse(await readFile(new URL('../../../apps/ultra/tests/fixtures/help-shell.maxpat',import.meta.url),'utf8'));
  const basic=fixture.patcher.boxes.find(({box})=>box.text==='p basic').box.patcher;
  basic.boxes.find(({box})=>box.maxclass==='message').box.text='';
  const source=JSON.stringify(fixture);
  const identity=await probeHelpShell(source,async()=>({status:'recognized',adapter:'max-help-four-v1',object:'append',sourceSha256:sourceSha}));
  const bundle=importBoundSource(source,identity);
  assert.equal(bundle.patch.helpShell.object,'append');
  assert.equal(bundle.stats.omittedBoxes,0);assert.equal(bundle.stats.omittedEdges,0);
  assert.equal(Object.keys(bundle.scopedNodeMap).length,8);
  assert.equal(bundle.flat.nodes.length,2);assert.equal(bundle.flat.edges.length,1);
  assert.equal(bundle.flat.nodes.find(node=>node.type==='message_box').params.text,'');
  assert.equal(bundle.authoringSha256,digest(JSON.stringify(bundle.patch)));
  assert.throws(()=>importBoundSource(source+' ',identity),/recognized/);
});

test('private bundle output is new, exclusive and outside the source worktree',async()=>temporary(async directory=>{
  const bundle={patch:{original:true},flat:{nodes:[],edges:[]},scopedNodeMap:{'root/a':1},stats:{omittedBoxes:0,omittedEdges:0},diagnostics:[],authoringSha256:'original'};
  const output=join(directory,'bundle');await writePrivateBundle(bundle,output);
  assert.deepEqual(JSON.parse(await readFile(join(output,'authoring.json'),'utf8')),bundle.patch);
  await assert.rejects(()=>writePrivateBundle(bundle,output),/exist/i);
  await assert.rejects(()=>writePrivateBundle(bundle,new URL('./forbidden-bundle',import.meta.url).pathname),/worktree/);
}));
