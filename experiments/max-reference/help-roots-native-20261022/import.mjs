// Private scoring bridge; this never bundles installed help content in Ultra.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {readFile,realpath,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {HELP_OBJECTS,probeHelpShell} from '../../../apps/ultra/ui/canvas-help-shell.mjs';
import {importMaxPatcher} from '../../../apps/ultra/ui/canvas-max-import.mjs';
import {lowerHierarchy} from '../../../apps/ultra/ui/canvas-hierarchy.mjs';

const catalog=JSON.parse(readFileSync(new URL('../hierarchy-reference-20261021/sources.json',import.meta.url),'utf8'));
const repo=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const contained=(path,root)=>path===root||path.startsWith(root+sep);

export async function verifyResources(directory,object,identities=catalog){
  if(!HELP_OBJECTS.includes(object)||!identities.help?.[object])throw Error('Choose a recognized help root.');
  const root=await realpath(directory);
  async function verified(identity){
    const path=await realpath(join(root,identity.path));
    if(!contained(path,root))throw Error('Resource escapes its configured root.');
    const bytes=await readFile(path);
    if(bytes.length>8*1048576||sha(bytes)!==identity.sha256)throw Error('Resource identity mismatch: '+identity.path);
    return{path:identity.path,sha256:identity.sha256,bytes:bytes.length,content:bytes};
  }
  const source=await verified(identities.help[object]),helpers=[];
  for(const identity of Object.values(identities.scripts)){
    const {content,...metadata}=await verified(identity);helpers.push(metadata);
  }
  return{object,resources:root,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(source.content),
    sourceSha256:source.sha256,helpers};
}

export function importBoundSource(source,identity){
  const report=importMaxPatcher(source,{sourceName:'private installed help score',helpShell:identity,allowPartial:true});
  if(!report.patch?.helpShell)throw Error('A recognized full help shell is required.');
  if(report.stats.omittedBoxes||report.stats.omittedEdges)throw Error('Complete help scoring refuses omitted boxes or cables.');
  return{object:report.patch.helpShell.object,sourceSha256:sha(source),adapter:report.patch.helpShell.adapter,
    patch:report.patch,flat:lowerHierarchy(report.patch),scopedNodeMap:report.scopedNodeMap,
    stats:report.stats,diagnostics:report.diagnostics,complete:report.complete,
    authoringSha256:sha(JSON.stringify(report.patch))};
}

export async function writePrivateBundle(bundle,destination){
  const output=resolve(destination),parent=await realpath(dirname(output));
  if(contained(join(parent,output.slice(dirname(output).length+1)),repo))throw Error('Private help output must be outside the source worktree.');
  await mkdir(output,{mode:0o700});
  const write=(name,value)=>writeFile(join(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
  await write('authoring.json',bundle.patch);
  await write('flat.json',bundle.flat);
  const {patch,flat,...metadata}=bundle;
  await write('import.json',metadata);
  return output;
}

async function main(){
  const [resources,object,output]=process.argv.slice(2);
  if(!resources||!object||!output||process.argv.length!==5)throw Error('Usage: node import.mjs RESOURCES OBJECT NEW_PRIVATE_OUTPUT_DIRECTORY');
  const verified=await verifyResources(resources,object);
  const identity=await probeHelpShell(verified.source,async()=>({status:'recognized',adapter:'max-help-four-v1',object,sourceSha256:verified.sourceSha256}));
  const bundle=importBoundSource(verified.source,identity);
  bundle.helpers=verified.helpers;
  await writePrivateBundle(bundle,output);
  console.log(JSON.stringify({object,sourceSha256:bundle.sourceSha256,stats:bundle.stats,
    diagnostics:bundle.diagnostics.length,nativeNodes:bundle.flat.nodes.length,nativeEdges:bundle.flat.edges.length,
    complete:bundle.complete,qualification:'not established'}));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
