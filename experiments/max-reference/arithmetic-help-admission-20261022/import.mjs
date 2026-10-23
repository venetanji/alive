// Private installed-source intake. Full imported documents stay outside the worktree.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {probeHelpShell} from '../../../apps/ultra/ui/canvas-help-shell.mjs';
import {verifyResources,importBoundSource,writePrivateBundle} from '../help-roots-native-20261022/import.mjs';

const identities={
  help:{
    times:{path:'help/max/times.maxhelp',sha256:'1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b'},
    plus:{path:'help/max/plus.maxhelp',sha256:'d1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895'},
    minus:{path:'help/max/minus.maxhelp',sha256:'7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0'},
  },
  scripts:{
    starter:{path:'help/resources/helpstarter.js',sha256:'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8'},
    name:{path:'help/resources/helpname.js',sha256:'49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa'},
    details:{path:'help/resources/helpdetails.js',sha256:'31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1'},
    arguments:{path:'help/resources/helpargs.js',sha256:'04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'},
  },
};

export async function importInstalledArithmetic(resources,object){
  if(!Object.hasOwn(identities.help,object))throw Error('Choose times, plus or minus.');
  const verified=await verifyResources(resources,object,identities);
  // The offline bridge supplies IPC only after byte verification; Rust admission is checked separately.
  const identity=await probeHelpShell(verified.source,async()=>({
    status:'recognized',adapter:'max-help-arithmetic-three-v1',object,sourceSha256:verified.sourceSha256,
  }));
  const bundle=importBoundSource(verified.source,identity);
  bundle.helpers=verified.helpers;
  return bundle;
}

async function main(){
  const [resources,object,output]=process.argv.slice(2);
  if(!resources||!object||!output||process.argv.length!==5)
    throw Error('Usage: node import.mjs RESOURCES OBJECT NEW_PRIVATE_OUTPUT_DIRECTORY');
  const bundle=await importInstalledArithmetic(resources,object);
  await writePrivateBundle(bundle,output);
  console.log(JSON.stringify({object,sourceSha256:bundle.sourceSha256,adapter:bundle.adapter,
    stats:bundle.stats,scopedNodes:Object.keys(bundle.scopedNodeMap).length,
    nativeNodes:bundle.flat.nodes.length,nativeEdges:bundle.flat.edges.length,
    diagnostics:bundle.diagnostics.length,complete:bundle.complete,qualification:'not established'}));
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
