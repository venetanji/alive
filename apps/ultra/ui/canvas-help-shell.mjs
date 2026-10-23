const fail=message=>{throw Error(message);};
export const HELP_OBJECTS=Object.freeze(['append','prepend','int','float','times','plus','minus']);
export const HELP_ROLES=Object.freeze(['starter','name','details','arguments']);
export const HELP_HELPER_SPEC=Object.freeze({label:'Help helper',params:{},inlets:[],outlets:[],help:'Local help-shell annotation. No runtime ports or script execution.'});
const sourceHashes=Object.freeze({
  append:'d4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729',
  prepend:'281fec882e5eac1c59f74b677a2c8485701602153028e2bead9e338e1440f5fb',
  int:'bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61',
  float:'c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c',
});
const arithmeticProfiles=Object.freeze({
  times:Object.freeze({sourceSha256:'1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b',basic:'obj-4',question:'obj-1',starter:'obj-3',name:'obj-6',details:'obj-2',arguments:'obj-5',identitySha256:'684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1',argumentsSha256:'684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1',starterSha256:'0ca81c69553c5299b7dc137769cb0887e0f1dc26c73bfe08c0e04891d8a99d02'}),
  plus:Object.freeze({sourceSha256:'d1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895',basic:'obj-2',question:'obj-3',starter:'obj-1',name:'obj-4',details:'obj-2',arguments:'obj-4',identitySha256:'a318c24216defe206feeb73ef5be00033fa9c4a74d0b967f6532a26ca5906d3b',argumentsSha256:'383ef36928344f56ffe8fe23ceed2ad8c0db8ec222c5f56c47163747dc738a0e',starterSha256:'e86f190fbc376badcc5d7b14a552d4e84fad436e0789bb2c7cc221fa38bf9390'}),
  minus:Object.freeze({sourceSha256:'7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0',basic:'obj-2',question:'obj-3',starter:'obj-1',name:'obj-4',details:'obj-2',arguments:'obj-4',identitySha256:'3973e022e93220f9212c18d0d0c543ae7c309e46640da93a4a0314de999f5112',argumentsSha256:'129fa7713adba71e12dca1d217e4236dad4fd946a80ea339180c243e1c7888da',starterSha256:'490326e775bc3adc514c502064cb4b937c4122d2450e8b62c85f583077795a37'}),
});
const probedSources=new WeakMap();
const profileFor=(adapter,object)=>typeof adapter!=='string'||typeof object!=='string'?null:
  adapter==='max-help-four-v1'&&Object.hasOwn(sourceHashes,object)?{sourceSha256:sourceHashes[object]}:
  adapter==='max-help-arithmetic-three-v1'&&Object.hasOwn(arithmeticProfiles,object)?arithmeticProfiles[object]:null;
const boxAt=(scope,id)=>{
  const matches=Array.isArray(scope?.boxes)?scope.boxes.filter(item=>item?.box?.id===id):[];
  return matches.length===1?matches[0].box:null;
};

async function arithmeticHashFacts(source,profile){
  if(!globalThis.crypto?.subtle)return null;
  let root;
  try{root=JSON.parse(source.replace(/^\uFEFF/,''))?.patcher;}catch{return null;}
  const basic=boxAt(root,profile.basic)?.patcher,starter=boxAt(root,profile.starter),text=starter?.text;
  const match=typeof text==='string'&&/^js helpstarter\.js (\S+)$/.exec(text);
  if(!match)return null;
  const digest=async value=>{
    if(typeof value!=='string')throw Error('Invalid helper value.');
    const bytes=new TextEncoder().encode(value);
    if(bytes.length>4096)throw Error('Helper value exceeds the hash limit.');
    return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
  };
  const argumentFact=async box=>{
    if(!Array.isArray(box?.jsarguments)||box.jsarguments.length!==1)return null;
    const argument=box.jsarguments[0];return{argument,sha256:await digest(argument)};
  };
  try{
    const [starterSha256,identitySha256,name,details,args]=await Promise.all([
      digest(text),digest(match[1]),argumentFact(boxAt(root,profile.name)),argumentFact(boxAt(basic,profile.details)),argumentFact(boxAt(basic,profile.arguments)),
    ]);
    return{starter:{text,argument:match[1],sha256:starterSha256,argumentSha256:identitySha256},name,details,arguments:args};
  }catch{return null;}
}

export async function probeHelpShell(source,invoke){
  if(typeof source!=='string'||new TextEncoder().encode(source).length>8*1048576)fail('Help source exceeds the 8 MiB text limit.');
  if(typeof invoke!=='function')return{status:'unavailable',reason:'not-configured'};
  const result=await invoke('help_shell_probe',{source});
  if(result?.status==='unrecognized')return{status:'unrecognized'};
  const adapter=result?.adapter,object=result?.object,sourceSha256=result?.sourceSha256,profile=profileFor(adapter,object);
  if(result?.status!=='recognized'||!profile||sourceSha256!==profile.sourceSha256){
    return{status:'unavailable',reason:result?.status==='unavailable'?result.reason:'identity-mismatch'};
  }
  // Digest facts stay private and bind to the exact source, just like the token.
  const facts=adapter==='max-help-arithmetic-three-v1'?await arithmeticHashFacts(source,profile):null;
  if(adapter==='max-help-arithmetic-three-v1'&&!facts)return{status:'unavailable',reason:'helper-integrity-unavailable'};
  const identity=Object.freeze({status:'recognized',adapter,object,sourceSha256});
  probedSources.set(identity,{source,facts});return identity;
}

export function recognizedHelpShell(source,identity,root){
  const admitted=identity&&probedSources.get(identity);
  if(typeof source!=='string'||!admitted||admitted.source!==source)return null;
  if(identity.adapter==='max-help-arithmetic-three-v1')return recognizedArithmeticShell(identity,root,admitted.facts);
  return recognizedLegacyShell(identity,root);
}

function recognizedArithmeticShell(identity,root,facts){
  const profile=arithmeticProfiles[identity.object],roles=new Map();
  if(!Array.isArray(root?.boxes)||root.boxes.length!==4||(root.lines??[]).length)return null;
  const basic=boxAt(root,profile.basic),question=boxAt(root,profile.question),starter=boxAt(root,profile.starter),name=boxAt(root,profile.name);
  if(basic?.maxclass!=='newobj'||basic.text!=='p basic'||basic.varname!=='basic_tab'||!Array.isArray(basic.patcher?.boxes)||
    question?.maxclass!=='newobj'||question.text!=='p ?'||question.varname!=='q_tab'||!Array.isArray(question.patcher?.boxes)||question.patcher.boxes.length||(question.patcher.lines??[]).length)return null;
  const ports=box=>box.numinlets===1&&box.numoutlets===1&&Array.isArray(box.outlettype)&&box.outlettype.length===1&&box.outlettype[0]==='';
  if(starter?.maxclass!=='newobj'||Object.hasOwn(starter,'patcher')||!ports(starter)||starter.text!==facts.starter.text||
    facts.starter.sha256!==profile.starterSha256||facts.starter.argumentSha256!==profile.identitySha256||
    !starter.saved_object_attributes||Array.isArray(starter.saved_object_attributes)||Object.keys(starter.saved_object_attributes).length!==2||
    starter.saved_object_attributes.filename!=='helpstarter.js'||starter.saved_object_attributes.parameter_enable!==0)return null;
  roles.set(starter,'starter');
  const jsui=(box,file,role,sha256)=>{
    const fact=facts[role];
    if(box?.maxclass!=='jsui'||Object.hasOwn(box,'patcher')||box.filename!==file||box.border!==0||box.ignoreclick!==1||box.parameter_enable!==0||!ports(box)||
      !Array.isArray(box.jsarguments)||box.jsarguments.length!==1||typeof box.jsarguments[0]!=='string'||
      !fact||box.jsarguments[0]!==fact.argument||fact.sha256!==sha256)return false;
    roles.set(box,role);return true;
  };
  const details=boxAt(basic.patcher,profile.details),args=boxAt(basic.patcher,profile.arguments);
  if(!jsui(name,'helpname.js','name',profile.identitySha256)||!jsui(details,'helpdetails.js','details',profile.identitySha256)||!jsui(args,'helpargs.js','arguments',profile.argumentsSha256))return null;
  const helperIds=new Set([details.id,args.id]);
  if((basic.patcher.lines??[]).some(({patchline})=>helperIds.has(patchline?.source?.[0])||helperIds.has(patchline?.destination?.[0])))return null;
  const scopes=[root];let boxes=0;
  for(const scope of scopes){
    if(scopes.length>256||!Array.isArray(scope?.boxes)||(boxes+=scope.boxes.length)>20000)return null;
    for(const {box}of scope.boxes){
      if(box.patcher)scopes.push(box.patcher);
      if(box.maxclass==='newobj'&&typeof box.text!=='string')return null;
      const script=['js','jsui','v8','v8ui','node.script'].includes(box.maxclass)||box.maxclass==='newobj'&&/^(?:js|jsui|v8|v8ui|node\.script)(?:\s|$)/.test((box.text??'').trim());
      if(script&&!roles.has(box))return null;
    }
  }
  return{identity,roles,basic:basic.id,question:question.id};
}

function recognizedLegacyShell(identity,root){
  const name=identity.object,roles=new Map();
  const ports=box=>box.numinlets===1&&box.numoutlets===1&&Array.isArray(box.outlettype)&&box.outlettype.length===1&&box.outlettype[0]==='';
  const jsui=(box,file,role)=>{
    if(box?.maxclass!=='jsui'||box.filename!==file||box.border!==0||box.ignoreclick!==1||box.parameter_enable!==0||
      !Array.isArray(box.jsarguments)||box.jsarguments.length!==1||box.jsarguments[0]!==name||!ports(box))return false;
    roles.set(box,role);return true;
  };
  if(root.boxes.length!==4||(root.lines??[]).length)return null;
  const boxes=root.boxes.map(item=>item.box),basic=boxes.find(box=>box.maxclass==='newobj'&&box.text==='p basic'&&box.varname==='basic_tab'),
    question=boxes.find(box=>box.maxclass==='newobj'&&box.text==='p ?'&&box.varname==='q_tab'),starter=boxes.find(box=>box.maxclass==='newobj'&&box.text===`js helpstarter.js ${name}`);
  if(!basic?.patcher||!question?.patcher||question.patcher.boxes.length||(question.patcher.lines??[]).length||!starter||!ports(starter)||
    !starter.saved_object_attributes||Object.keys(starter.saved_object_attributes).length!==2||starter.saved_object_attributes.filename!=='helpstarter.js'||starter.saved_object_attributes.parameter_enable!==0)return null;
  roles.set(starter,'starter');
  const rootOther=boxes.filter(box=>![basic,question,starter].includes(box));
  if(rootOther.length!==1||!jsui(rootOther[0],'helpname.js','name'))return null;
  const details=basic.patcher.boxes.map(item=>item.box).filter(box=>box.maxclass==='jsui'&&box.filename==='helpdetails.js');
  const args=basic.patcher.boxes.map(item=>item.box).filter(box=>box.maxclass==='jsui'&&box.filename==='helpargs.js');
  if(details.length!==1||args.length!==1||!jsui(details[0],'helpdetails.js','details')||!jsui(args[0],'helpargs.js','arguments'))return null;
  const helperIds=new Set([details[0].id,args[0].id]);
  if((basic.patcher.lines??[]).some(({patchline})=>helperIds.has(patchline?.source?.[0])||helperIds.has(patchline?.destination?.[0])))return null;
  const scopes=[root];
  for(const scope of scopes)for(const {box}of scope.boxes){
    if(box.patcher)scopes.push(box.patcher);
    if((box.maxclass==='jsui'||box.maxclass==='newobj'&&/^js\s/.test(box.text??''))&&!roles.has(box))return null;
  }
  return{identity,roles,basic:basic.id,question:question.id};
}

export function validateHelpRole(params){
  if(!params||typeof params!=='object'||Array.isArray(params)||Object.keys(params).length!==1||!HELP_ROLES.includes(params.role))fail('Help helper requires only a supported role.');
  return{role:params.role};
}

export function validateHelpShell(root){
  const all=[],scopes=[root];
  for(const scope of scopes)for(const node of scope.nodes){all.push(node);if(node.type==='patcher')scopes.push(node.patcher);}
  const helpers=all.filter(node=>node.type==='help_helper');
  if(!Object.hasOwn(root,'helpShell')){
    if(helpers.length)fail('Help helpers require a complete helpShell document.');
    return;
  }
  const shell=root.helpShell;
  if(!shell||typeof shell!=='object'||Array.isArray(shell)||Object.keys(shell).length!==4||
    !Object.keys(shell).every(key=>['adapter','object','basicNode','questionNode'].includes(key))||
    !profileFor(shell.adapter,shell.object))fail('Invalid helpShell metadata.');
  if(![shell.basicNode,shell.questionNode].every(id=>Number.isInteger(id)&&id>0&&id<=4294967295)||shell.basicNode===shell.questionNode)fail('Help shell child IDs must be distinct positive u32 integers.');
  const basic=root.nodes.find(node=>node.id===shell.basicNode),question=root.nodes.find(node=>node.id===shell.questionNode);
  const roles=(scope,expected)=>{
    const found=scope.nodes.filter(node=>node.type==='help_helper');
    return found.length===expected.length&&expected.every(role=>found.filter(node=>node.params.role===role).length===1);
  };
  if(root.nodes.length!==4||root.edges.length||!roles(root,['starter','name'])||
    basic?.type!=='patcher'||basic.params.name!=='basic'||question?.type!=='patcher'||question.params.name!=='?')fail('Help shell root requires starter, name, basic and question nodes without cables.');
  if(question.patcher.nodes.length||question.patcher.edges.length)fail('Help shell question patcher must be empty.');
  if(helpers.length!==4||!roles(basic.patcher,['details','arguments']))fail('Help shell Basic requires exactly one details and one arguments helper; helpers cannot appear elsewhere.');
}
