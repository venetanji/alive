import assert from 'node:assert/strict';
import {test} from 'node:test';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {probeHelpShell,recognizedHelpShell} from './canvas-help-shell.mjs';
import {analyzeMaxPatch,importMaxPatcher} from './canvas-max-import.mjs';
import {nodeSpec,parsePatch,serializePatch,validatePatch} from './canvas-model.mjs';
import {lowerHierarchy,treeNodes} from './canvas-hierarchy.mjs';

const adapter='max-help-arithmetic-three-v1';
const cases=[
  {object:'times',symbol:'*',source:'1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b',basic:'obj-4',question:'obj-1',starter:'obj-3',name:'obj-6',details:'obj-2',arguments:'obj-5',identity:'684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1',argument:'684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1',creation:'0ca81c69553c5299b7dc137769cb0887e0f1dc26c73bfe08c0e04891d8a99d02'},
  {object:'plus',symbol:'+',source:'d1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895',basic:'obj-2',question:'obj-3',starter:'obj-1',name:'obj-4',details:'obj-2',arguments:'obj-4',identity:'a318c24216defe206feeb73ef5be00033fa9c4a74d0b967f6532a26ca5906d3b',argument:'383ef36928344f56ffe8fe23ceed2ad8c0db8ec222c5f56c47163747dc738a0e',creation:'e86f190fbc376badcc5d7b14a552d4e84fad436e0789bb2c7cc221fa38bf9390'},
  {object:'minus',symbol:'-',source:'7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0',basic:'obj-2',question:'obj-3',starter:'obj-1',name:'obj-4',details:'obj-2',arguments:'obj-4',identity:'3973e022e93220f9212c18d0d0c543ae7c309e46640da93a4a0314de999f5112',argument:'129fa7713adba71e12dca1d217e4236dad4fd946a80ea339180c243e1c7888da',creation:'490326e775bc3adc514c502064cb4b937c4122d2450e8b62c85f583077795a37'},
];
const ports={numinlets:1,numoutlets:1,outlettype:['']};
const box=(id,maxclass,extra={})=>({box:{id,maxclass,patching_rect:[20,30,140,40],...structuredClone(extra)}});
const identityArgument=entry=>`original-synthetic-${entry.object}-identity-b7e2`;
const argumentsArgument=entry=>entry.object==='times'?identityArgument(entry):`original-synthetic-${entry.object}-argument-d9a4`;
const starterText=entry=>`js helpstarter.js ${identityArgument(entry)}`;
function syntheticSource(entry){
  const jsui=(id,file,argument)=>box(id,'jsui',{...ports,filename:file,border:0,ignoreclick:1,parameter_enable:0,jsarguments:[argument]});
  const basic={boxes:[jsui(entry.details,'helpdetails.js',identityArgument(entry)),jsui(entry.arguments,'helpargs.js',argumentsArgument(entry)),
    box('integer-op','newobj',{text:`${entry.symbol} 7`,numinlets:2,numoutlets:1}),box('float-op','newobj',{text:`${entry.symbol} 0.25`,numinlets:2,numoutlets:1}),
    ...Array.from({length:4},(_,i)=>box(`number-${i}`,'number',{numinlets:1,numoutlets:2})),
    ...Array.from({length:3},(_,i)=>box(`flonum-${i}`,'flonum',{numinlets:1,numoutlets:2,format:6})),box('button','button',{numinlets:1,numoutlets:1}),
    ...Array.from({length:4},(_,i)=>box(`comment-${i}`,'comment',{text:`Original synthetic note ${i}.`})),
  ],lines:[
    ['number-0',0,'integer-op',0],['number-1',0,'integer-op',1],['button',0,'integer-op',0],['integer-op',0,'number-2',0],
    ['flonum-0',0,'float-op',0],['flonum-1',0,'float-op',1],['number-3',0,'float-op',0],['float-op',0,'flonum-2',0],
  ].map(([from,outlet,to,inlet])=>({patchline:{source:[from,outlet],destination:[to,inlet]}}))};
  return{patcher:{boxes:[box(entry.starter,'newobj',{...ports,text:starterText(entry),saved_object_attributes:{filename:'helpstarter.js',parameter_enable:0}}),
    jsui(entry.name,'helpname.js',identityArgument(entry)),box(entry.basic,'newobj',{text:'p basic',varname:'basic_tab',patcher:basic}),
    box(entry.question,'newobj',{text:'p ?',varname:'q_tab',patcher:{boxes:[],lines:[]}})],lines:[]}};
}
const nativeIdentity=entry=>({status:'recognized',adapter,object:entry.object,sourceSha256:entry.source});
const probe=(text,entry,identity=nativeIdentity(entry),options)=>probeHelpShell(text,async()=>identity,options);
const get=(scope,id)=>scope.boxes.find(({box})=>box.id===id).box;
const basic=(source,entry)=>get(source.patcher,entry.basic).patcher;
const asBytes=hex=>Uint8Array.from(hex.match(/../g),pair=>parseInt(pair,16)).buffer;
const realDigest=webcrypto.subtle.digest.bind(webcrypto.subtle);
// These doubles map only original synthetic strings to the published digest pins.
// Real installed-source/WebCrypto integration is performed privately by the parent.
function syntheticDigests(t,entry,replace=new Map()){
  const outcomes=new Map([[identityArgument(entry),entry.identity],[argumentsArgument(entry),entry.argument],[starterText(entry),entry.creation],...replace]);
  t.mock.method(globalThis.crypto.subtle,'digest',async(algorithm,data)=>{
    if(algorithm!=='SHA-256')throw Error('Synthetic digest double requires SHA-256.');
    const value=new TextDecoder().decode(data);
    return outcomes.has(value)?asBytes(outcomes.get(value)):realDigest(algorithm,data);
  });
}

for(const entry of cases)test(`synthetic ${entry.object} admission retains the complete tree and selected adapter`,async t=>{
  syntheticDigests(t,entry);
  const source=syntheticSource(entry),text=JSON.stringify(source),identity=await probe(text,entry);
  assert.equal(identity.status,'recognized');
  const result=importMaxPatcher(text,{helpShell:identity,allowPartial:true});
  assert.ok(result.patch);
  assert.deepEqual(result.patch.helpShell,{adapter,object:entry.object,basicNode:result.nodeMap[entry.basic],questionNode:result.nodeMap[entry.question]});
  assert.deepEqual(result.stats,{sourceBoxes:20,sourceEdges:8,importedBoxes:20,importedEdges:8,omittedBoxes:0,omittedEdges:0,decorations:0});
  assert.equal(Object.keys(result.scopedNodeMap).length,20);
  const helpers=treeNodes(result.patch).filter(node=>node.type==='help_helper');
  assert.deepEqual(helpers.map(node=>node.params.role).sort(),['arguments','details','name','starter']);
  for(const helper of helpers){assert.equal(nodeSpec(helper).inlets.length,0);assert.equal(nodeSpec(helper).outlets.length,0);assert.equal(helper.x,20);assert.equal(helper.y,30);assert.equal(helper.style.width,140);assert.equal(helper.style.height,40);}
  const executable=lowerHierarchy(result.patch);
  assert.equal(executable.nodes.length,10);assert.equal(executable.edges.length,8);
  assert.deepEqual(parsePatch(serializePatch(result.patch)).helpShell,result.patch.helpShell);
  assert.equal(analyzeMaxPatch(text,{helpShell:identity}).patchers[0].helpShell.adapter,adapter);
  const child=importMaxPatcher(text,{helpShell:identity,patcherId:`root/${entry.basic}`,allowPartial:true});
  assert.equal(child.patch?.helpShell,undefined);assert.equal(child.stats.omittedBoxes,2);
  assert.equal(result.complete,false);assert.ok(result.diagnostics.some(d=>d.code==='semantic-gap'&&d.message.includes('bounded -100000 to 100000')));
  assert.ok(result.diagnostics.some(d=>d.attribute==='format'));
});

test('arithmetic recognition refuses crossed profiles, unknown objects and wrong source pins',async t=>{
  const entry=cases[0];syntheticDigests(t,entry);const text=JSON.stringify(syntheticSource(entry));
  for(const identity of [
    {...nativeIdentity(entry),adapter:'max-help-four-v1'},
    {...nativeIdentity(entry),object:'append'},
    {...nativeIdentity(entry),object:'*'},
    {...nativeIdentity(entry),adapter:'max-help-arithmetic-three-v2'},
    {...nativeIdentity(entry),sourceSha256:cases[1].source},
    {status:'recognized',adapter:'max-help-four-v1',object:'plus',sourceSha256:cases[1].source},
  ])assert.equal((await probe(text,entry,identity)).status,'unavailable');
});

test('the probe snapshots its verified native response before asynchronous hashing',async t=>{
  const entry=cases[0],response=nativeIdentity(entry),text=JSON.stringify(syntheticSource(entry));
  t.mock.method(globalThis.crypto.subtle,'digest',async(algorithm,data)=>{
    response.sourceSha256='0'.repeat(64);
    return realDigest(algorithm,data);
  });
  assert.deepEqual(await probe(text,entry,response),nativeIdentity(entry));
});

test('arithmetic tokens cannot be forged, serialized, reused on changed text or supplied digest facts',async t=>{
  const entry=cases[1];syntheticDigests(t,entry);const source=syntheticSource(entry),text=JSON.stringify(source),identity=await probe(text,entry);
  for(const [input,token] of [[text,null],[text,nativeIdentity(entry)],[text,{...identity}],[text,JSON.parse(JSON.stringify(identity))],[text+' ',identity],[source,identity]]){
    assert.equal(importMaxPatcher(input,{helpShell:token,allowPartial:true}).patch?.helpShell,undefined);
  }
  assert.equal(recognizedHelpShell(text,{...identity,facts:{argumentSha256:entry.argument}},source.patcher),null);
  const changed=syntheticSource(entry);get(basic(changed,entry),entry.arguments).jsarguments=['changed-after-probe'];
  assert.equal(recognizedHelpShell(text,identity,changed.patcher),null);
});

test('role-specific argument and whole starter hashes remain mandatory even after a native response',async t=>{
  const entry=cases[1];syntheticDigests(t,entry);
  const edits=[source=>{get(source.patcher,entry.starter).text+=' extra';},source=>{get(source.patcher,entry.starter).text='js other.js original-synthetic';},
    source=>{get(source.patcher,entry.name).jsarguments=['unknown'];},source=>{get(basic(source,entry),entry.details).jsarguments=[argumentsArgument(entry)];},
    source=>{get(basic(source,entry),entry.arguments).jsarguments=[identityArgument(entry)];},source=>{get(basic(source,entry),entry.arguments).jsarguments=[argumentsArgument(entry),'extra'];},
    source=>{get(basic(source,entry),entry.arguments).jsarguments=[9];},
  ];
  for(const edit of edits){const source=syntheticSource(entry);edit(source);const text=JSON.stringify(source),identity=await probe(text,entry);
    assert.equal(importMaxPatcher(text,{helpShell:identity,allowPartial:true}).patch?.helpShell,undefined);
  }
});

test('wrong digest outcomes and caller-provided profile overrides cannot authorize arithmetic helpers',async t=>{
  const entry=cases[0];syntheticDigests(t,entry,new Map([[identityArgument(entry),'0'.repeat(64)]]));
  const text=JSON.stringify(syntheticSource(entry)),identity=await probe(text,entry,undefined,{profile:{identity:entry.identity},facts:{argument:entry.identity}});
  assert.equal(importMaxPatcher(text,{helpShell:identity,allowPartial:true}).patch?.helpShell,undefined);
});

test('a wrong whole starter digest refuses otherwise matching arithmetic helper facts',async t=>{
  const entry=cases[2];syntheticDigests(t,entry,new Map([[starterText(entry),'f'.repeat(64)]]));
  const text=JSON.stringify(syntheticSource(entry)),identity=await probe(text,entry);
  assert.equal(importMaxPatcher(text,{helpShell:identity,allowPartial:true}).patch?.helpShell,undefined);
});

test('unavailable or failing WebCrypto cannot mint an arithmetic admission token',async t=>{
  const entry=cases[0],text=JSON.stringify(syntheticSource(entry));
  t.mock.method(globalThis.crypto.subtle,'digest',async()=>{throw Error('Original synthetic digest failure.');});
  assert.equal((await probe(text,entry)).status,'unavailable');
  t.mock.getter(globalThis,'crypto',()=>undefined);
  assert.equal((await probe(text,entry)).status,'unavailable');
});

test('helper hashing refuses oversized values even when a caller supplies matching digest outcomes',async t=>{
  const entry=cases[0],oversized='x'.repeat(4097);syntheticDigests(t,entry,new Map([[oversized,entry.identity]]));
  const source=syntheticSource(entry);get(source.patcher,entry.name).jsarguments=[oversized];
  const text=JSON.stringify(source),identity=await probe(text,entry);
  assert.equal(identity.status,'unavailable');
  assert.equal(importMaxPatcher(text,{helpShell:identity,allowPartial:true}).patch?.helpShell,undefined);
});

test('arithmetic helpers require exact anchors, filenames, saved attributes, ports and isolated routes',async t=>{
  const entry=cases[2];syntheticDigests(t,entry);
  const edits=[
    source=>{get(source.patcher,entry.starter).id='moved-starter';},source=>{get(source.patcher,entry.name).id='moved-name';},
    source=>{get(basic(source,entry),entry.details).id='moved-details';},source=>{get(basic(source,entry),entry.arguments).id='moved-arguments';},
    source=>{get(source.patcher,entry.basic).id='moved-basic';},source=>{get(source.patcher,entry.question).id='moved-question';},
    source=>{get(source.patcher,entry.basic).varname='other';},source=>{get(source.patcher,entry.question).text='p other';},
    source=>{get(source.patcher,entry.question).patcher.boxes.push(box('unexpected','comment',{text:'Original synthetic extra.'}));},
    source=>{get(source.patcher,entry.starter).saved_object_attributes.extra=0;},source=>{get(source.patcher,entry.starter).saved_object_attributes.filename='other.js';},
    source=>{get(source.patcher,entry.starter).saved_object_attributes.parameter_enable=1;},source=>{get(source.patcher,entry.starter).numoutlets=0;},
    source=>{get(source.patcher,entry.name).filename='other.js';},source=>{get(source.patcher,entry.name).border=1;},
    source=>{get(basic(source,entry),entry.details).ignoreclick=0;},source=>{get(basic(source,entry),entry.arguments).parameter_enable=1;},
    source=>{get(basic(source,entry),entry.arguments).numinlets=2;},source=>{get(basic(source,entry),entry.details).outlettype=['int'];},
    source=>{source.patcher.lines.push({patchline:{source:[entry.starter,0],destination:[entry.name,0]}});},
    source=>{basic(source,entry).lines.push({patchline:{source:[entry.details,0],destination:['integer-op',0]}});},
    source=>{basic(source,entry).lines.push({patchline:{source:['integer-op',0],destination:[entry.arguments,0]}});},
  ];
  for(const edit of edits){const source=syntheticSource(entry);edit(source);const text=JSON.stringify(source),identity=await probe(text,entry);
    assert.equal(importMaxPatcher(text,{helpShell:identity,allowPartial:true}).patch?.helpShell,undefined);
  }
});

test('additional script boxes anywhere cannot be admitted as arithmetic shell content',async t=>{
  const entry=cases[0];syntheticDigests(t,entry);
  for(const script of [box('extra','jsui',{filename:'other.js'}),box('extra','newobj',{text:'js other.js'}),box('extra','newobj',{text:'  js other.js'}),box('extra','newobj',{text:'js'}),box('extra','newobj',{text:'v8 other.js'}),box('extra','newobj',{text:'node.script other.js'}),box('extra','newobj',{text:17})]){
    const source=syntheticSource(entry);basic(source,entry).boxes.push(script);const text=JSON.stringify(source),identity=await probe(text,entry);
    assert.equal(importMaxPatcher(text,{helpShell:identity,allowPartial:true}).patch?.helpShell,undefined);
  }
  const source=syntheticSource(entry);basic(source,entry).boxes.push(box('nested','newobj',{text:'p nested',patcher:{boxes:[box('deep-script','newobj',{text:'js other.js'})],lines:[]}}));
  const text=JSON.stringify(source),identity=await probe(text,entry);
  assert.equal(importMaxPatcher(text,{helpShell:identity,allowPartial:true}).patch?.helpShell,undefined);
});

test('serialized help shells accept exact arithmetic policy pairs and refuse crossed or symbolic identities',()=>{
  const corpus=JSON.parse(readFileSync(new URL('../tests/fixtures/help-shell-schema.json',import.meta.url),'utf8'));
  const base=corpus.find(entry=>entry.valid).patch;
  for(const object of ['times','plus','minus']){
    const patch=structuredClone(base);patch.helpShell={...patch.helpShell,adapter,object};
    assert.deepEqual(parsePatch(serializePatch(validatePatch(patch))).helpShell,patch.helpShell);
  }
  for(const [policy,object]of [[adapter,'append'],[adapter,'*'],[adapter,'+'],[adapter,'-'],[adapter,new String('times')],[adapter,{toString:()=> 'times'}],['max-help-four-v1','times'],['max-help-four-v1','plus'],['max-help-four-v1','minus']]){
    const patch=structuredClone(base);patch.helpShell={...patch.helpShell,adapter:policy,object};
    assert.throws(()=>validatePatch(patch));
  }
});
