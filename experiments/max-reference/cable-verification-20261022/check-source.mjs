// Local metadata accounting only; installed Max help is never copied into results.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {probeHelpShell} from '../../../apps/ultra/ui/canvas-help-shell.mjs';
import {importMaxPatcher} from '../../../apps/ultra/ui/canvas-max-import.mjs';

const base=process.env.ULTRA_MAX_HELP_ROOT??'/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources/help/max';
const rows=[];
for(const object of ['append','prepend','int','float']){
  const source=fs.readFileSync(`${base}/${object}.maxhelp`,'utf8');
  const sourceSha256=crypto.createHash('sha256').update(source).digest('hex');
  const identity=await probeHelpShell(source,async()=>({status:'recognized',adapter:'max-help-four-v1',object,sourceSha256}));
  const report=importMaxPatcher(source,{allowPartial:true,helpShell:identity});
  assert.ok(report.patch);let routes=0,comments=0;
  function verify(original,scope,path){
    for(const {patchline:line}of original.lines??[]){
      if(!Object.hasOwn(line,'midpoints'))continue;
      const from=report.scopedNodeMap[`${path}/${encodeURIComponent(line.source[0])}`];
      const to=report.scopedNodeMap[`${path}/${encodeURIComponent(line.destination[0])}`];
      const edge=scope.edges.find(edge=>edge.from===from&&edge.to===to&&edge.outlet===line.source[1]&&edge.inlet===line.destination[1]);
      assert.ok(edge);assert.deepEqual(edge.midpoints,line.midpoints);routes++;
    }
    for(const {box}of original.boxes){
      const node=scope.nodes.find(node=>node.id===report.scopedNodeMap[`${path}/${encodeURIComponent(box.id)}`]);
      assert.ok(node);if(box.maxclass==='comment')comments++;
      if(box.patcher)verify(box.patcher,node.patcher,`${path}/${encodeURIComponent(box.id)}`);
    }
  }
  verify(JSON.parse(source).patcher,report.patch,'root');
  assert.equal(report.diagnostics.filter(d=>d.attribute==='midpoints').length,0);
  rows.push({object,sourceSha256,stats:report.stats,routesRetained:routes,commentsRetained:comments,diagnostics:report.diagnostics.length,complete:report.complete});
}
const result={scope:'Metadata-only import retention with injected native-provider identity; no runtime or complete-root qualification.',results:rows};
const target=fileURLToPath(new URL('./results/source-preservation.json',import.meta.url));
fs.mkdirSync(fileURLToPath(new URL('./results/',import.meta.url)),{recursive:true});
fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(rows.map(({object,routesRetained,stats,diagnostics})=>({object,routesRetained,boxes:stats.importedBoxes,cables:stats.importedEdges,diagnostics})),null,2));
