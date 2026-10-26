// Authoring hierarchy only: execution remains one bounded native owner graph.
import {validateHelpRole,validateHelpShell} from './canvas-help-shell.mjs';
import {validateMidpoints} from './canvas-cable-geometry.mjs';
export const HIERARCHY_LIMITS=Object.freeze({bytes:1048576,nodes:512,edges:1024,depth:16});
export const hierarchyType=type=>['patcher','comment','inlet','outlet','help_helper'].includes(type);
const fail=message=>{throw Error(message);};
const fields=(value,allowed,required=allowed)=>{
  if(!value||typeof value!=='object'||Array.isArray(value))fail('Hierarchy record must be an object.');
  for(const key of Object.keys(value))if(!allowed.includes(key))fail(`Unknown hierarchy field: ${key}.`);
  for(const key of required)if(!Object.hasOwn(value,key))fail(`Missing hierarchy field: ${key}.`);
};
export function boundaryNodes(patcher,type){
  return patcher.nodes.filter(node=>node.type===type).sort((a,b)=>a.x-b.x);
}
export function treeNodes(patcher){
  return patcher.nodes.flatMap(node=>node.type==='patcher'?[node,...treeNodes(node.patcher)]:[node]);
}
export function visiblePatcher(root,path){
  let patcher=root;
  for(const id of path){const node=patcher.nodes.find(node=>node.id===id&&node.type==='patcher');if(!node)fail('Missing child patcher.');patcher=node.patcher;}
  return patcher;
}
export function lowerHierarchy(root){
  const nodes=[],edges=[];
  function lower(patcher){
    const local=new Map(patcher.nodes.map(node=>[node.id,node]));
    for(const edge of patcher.edges){
      const from=local.get(edge.from),to=local.get(edge.to);
      edges.push({from:edge.from,outlet:edge.outlet,to:edge.to,inlet:edge.inlet,
        ...(from.type==='patcher'?{from:boundaryNodes(from.patcher,'outlet')[edge.outlet].id,outlet:0}:{}),
        ...(to.type==='patcher'?{to:boundaryNodes(to.patcher,'inlet')[edge.inlet].id,inlet:0}:{}),
      });
    }
    for(const node of patcher.nodes){
      if(node.type==='patcher')lower(node.patcher);
      else if(!['comment','help_helper'].includes(node.type))nodes.push({...node});
    }
  }
  lower(root);return{version:1,profile:'ultra-canvas-v1',nodes,edges};
}
export function validateHierarchy(input,{validateLeaf,validateExecution,nodeSpec,validateStyle}){
  const ids=new Set();let nodeCount=0,edgeCount=0;
  const seen=new WeakSet();
  function scope(patcher,depth,root=false){
    if(depth>HIERARCHY_LIMITS.depth)fail('Hierarchy exceeds 16 embedded patcher levels.');
    if(seen.has(patcher))fail('Hierarchy must be a tree.');seen.add(patcher);
    fields(patcher,root?['version','profile','nodes','edges','helpShell','device']:['nodes','edges'],root?['version','profile','nodes','edges']:['nodes','edges']);
    if(!Array.isArray(patcher.nodes)||!Array.isArray(patcher.edges))fail('Hierarchy nodes and edges must be arrays.');
    nodeCount+=patcher.nodes.length;edgeCount+=patcher.edges.length;
    if(nodeCount>HIERARCHY_LIMITS.nodes||edgeCount>HIERARCHY_LIMITS.edges)fail('Hierarchy exceeds 512 objects or 1024 cables.');
    const nodes=patcher.nodes.map(node=>{
      fields(node,['id','type','x','y','params','style',...(node?.type==='patcher'?['patcher']:[])],['id','type','x','y','params',...(node?.type==='patcher'?['patcher']:[])]);
      if(!Number.isInteger(node.id)||node.id<1||node.id>4294967295)fail('Node ID must be an integer from 1 to 4294967295.');
      if(ids.has(node.id))fail('Duplicate node ID in hierarchy.');ids.add(node.id);
      if(![node.x,node.y].every(value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=4000))fail('Hierarchy coordinates must be from 0 to 4000.');
      if(node.type==='help_helper')return{...node,params:validateHelpRole(node.params),...(Object.hasOwn(node,'style')?{style:validateStyle(node.type,node.style)}:{})};
      if(node.type==='patcher'||node.type==='comment'){
        const key=node.type==='patcher'?'name':'text',limit=node.type==='patcher'?127:4096;
        fields(node.params,[key]);const text=node.params[key];
        if(typeof text!=='string'||text.length>limit||(key==='name'&&!text.length)||(key==='name'?/[^\x20-\x7e]/:/[^\x20-\x7e\t\r\n]/).test(text))fail(`${node.type} ${key} must contain ${key==='name'?'1 to 127':'at most 4096'} ASCII characters.`);
        return{...node,params:{...node.params},...(Object.hasOwn(node,'style')?{style:validateStyle(node.type,node.style)}:{}),...(node.type==='patcher'?{patcher:scope(node.patcher,depth+1)}:{})};
      }
      return validateLeaf(node);
    });
    const local=new Map(nodes.map(node=>[node.id,node])),duplicates=new Set();
    const edges=patcher.edges.map(edge=>{
      fields(edge,['from','outlet','to','inlet','midpoints'],['from','outlet','to','inlet']);
      const from=local.get(edge.from),to=local.get(edge.to);if(!from||!to)fail('Cable references a missing object in its patcher scope.');
      const output=nodeSpec(from).outlets[edge.outlet],input=nodeSpec(to).inlets[edge.inlet];
      if(!Number.isInteger(edge.outlet)||!Number.isInteger(edge.inlet)||!output||!input)fail('Cable inlet or outlet index is unavailable.');
      if(!(output.emits??[output.type]).some(type=>(input.accepts??[input.type]).includes(type)))fail('Port type mismatch: this inlet does not accept the cable type.');
      const key=`${edge.from}:${edge.outlet}>${edge.to}:${edge.inlet}`;if(duplicates.has(key))fail('Duplicate cable.');duplicates.add(key);
      return{...edge,...(Object.hasOwn(edge,'midpoints')?{midpoints:validateMidpoints(edge.midpoints)}:{})};
    });
    return{...(root?{version:2,profile:'ultra-patcher-v2',...(Object.hasOwn(patcher,'helpShell')?{helpShell:patcher.helpShell}:{}),...(Object.hasOwn(patcher,'device')?{device:patcher.device}:{})}:{}),nodes,edges};
  }
  const validated=scope(input,0,true);
  validateHelpShell(validated);
  if(Object.hasOwn(validated,'helpShell'))validated.helpShell={...validated.helpShell};
  if(new TextEncoder().encode(JSON.stringify(validated)).length>HIERARCHY_LIMITS.bytes)fail('Hierarchy exceeds 1 MiB JSON.');
  validateExecution(lowerHierarchy(validated));return validated;
}

// Parent cables track boundary identity when a child port moves or disappears.
export function remapBoundaryEdges(before,after){
  for(const node of after.nodes){
    if(node.type!=='patcher')continue;
    const previous=before.nodes.find(old=>old.id===node.id&&old.type==='patcher');if(!previous)continue;
    for(const [type,side,index]of [['inlet','to','inlet'],['outlet','from','outlet']]){
      const oldIds=boundaryNodes(previous.patcher,type).map(node=>node.id),newIds=boundaryNodes(node.patcher,type).map(node=>node.id);
      after.edges=after.edges.filter(edge=>{
        if(edge[side]!==node.id)return true;
        const next=newIds.indexOf(oldIds[edge[index]]);if(next<0)return false;edge[index]=next;return true;
      });
    }
    remapBoundaryEdges(previous.patcher,node.patcher);
  }
}
