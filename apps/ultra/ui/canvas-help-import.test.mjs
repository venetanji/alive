import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {probeHelpShell} from './canvas-help-shell.mjs';
import {analyzeMaxPatch,importMaxPatcher,readPatchFile} from './canvas-max-import.mjs';
import {lowerHierarchy,treeNodes} from './canvas-hierarchy.mjs';

const sha='d4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729';
const box=(id,maxclass,extra={})=>({box:{id,maxclass,patching_rect:[10,10,140,40],...extra}});
const source=()=>JSON.parse(readFileSync(new URL('../tests/fixtures/help-shell.maxpat',import.meta.url),'utf8'));
// This explicit fake native identity tests orchestration with original synthetic data.
const probe=async text=>probeHelpShell(text,async(name,args)=>{
  assert.equal(name,'help_shell_probe');assert.equal(args.source,text);
  return{status:'recognized',adapter:'max-help-four-v1',object:'append',sourceSha256:sha};
});
test('a native-probed whole help shell retains all helpers and source maps without script execution',async()=>{
  const text=JSON.stringify(source()),recognition=await probe(text);
  const result=importMaxPatcher(text,{helpShell:recognition,allowPartial:true});
  assert.ok(result.patch,JSON.stringify(result.diagnostics));
  assert.deepEqual(result.stats,{sourceBoxes:8,sourceEdges:1,importedBoxes:8,importedEdges:1,omittedBoxes:0,omittedEdges:0,decorations:0});
  assert.equal(result.patch.helpShell.object,'append');
  assert.equal(treeNodes(result.patch).filter(node=>node.type==='help_helper').length,4);
  assert.equal(Object.keys(result.scopedNodeMap).length,8);assert.equal(lowerHierarchy(result.patch).nodes.length,2);
  assert.equal(analyzeMaxPatch(text,{helpShell:recognition}).patchers[0].helpShell.object,'append');
  const basic=importMaxPatcher(text,{helpShell:recognition,patcherId:'root/basic',allowPartial:true});
  assert.equal(Object.hasOwn(basic.patch,'helpShell'),false);assert.equal(basic.stats.omittedBoxes,2);
});
test('unprobed, changed, object-valued and forged input cannot select the native helper adapter',async()=>{
  const text=JSON.stringify(source()),recognition=await probe(text);
  for(const [input,identity]of [[text,null],[text,{status:'recognized',adapter:'max-help-four-v1',object:'append',sourceSha256:sha}],[text+' ',recognition],[source(),recognition]]){
    const result=importMaxPatcher(input,{helpShell:identity,allowPartial:true});
    assert.equal(result.patch?.helpShell,undefined);assert.equal(result.stats.omittedBoxes,4);
  }
  assert.equal((await probeHelpShell(text,null)).status,'unavailable');
});
test('recognized input still independently checks helper arguments, ports, shape and cable isolation',async()=>{
  const edits=[input=>{input.patcher.boxes[2].box.jsarguments=['float'];},input=>{input.patcher.boxes[1].box.varname='other';},
    input=>{input.patcher.boxes[3].box.patcher.boxes.push(box('extra','message',{text:'9'}));},
    input=>{input.patcher.boxes[2].box.numinlets=2;},
    input=>{input.patcher.lines.push({patchline:{source:['name',0],destination:['basic',0]}});},
  ];
  for(const edit of edits){const input=source();edit(input);const text=JSON.stringify(input),recognition=await probe(text);
    assert.equal(importMaxPatcher(text,{helpShell:recognition,allowPartial:true}).patch?.helpShell,undefined);
  }
});
test('file reading preserves exact UTF-8 BOM bytes and refuses invalid encoding or oversized input',async()=>{
  const bytes=new Uint8Array([239,187,191,123,125]);
  assert.equal(await readPatchFile({size:bytes.length,arrayBuffer:async()=>bytes.buffer}),'\uFEFF{}');
  await assert.rejects(()=>readPatchFile({size:1,arrayBuffer:async()=>new Uint8Array([255]).buffer}),/UTF-8/);
  let read=false;
  await assert.rejects(()=>readPatchFile({size:8*1048576+1,arrayBuffer:async()=>{read=true;}}),/8 MiB/);assert.equal(read,false);
});
