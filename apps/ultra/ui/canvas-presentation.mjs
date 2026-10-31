// Authored surface metadata is validated before execution lowering.
const fail=message=>{throw Error(`Presentation: ${message}`);};
const fields=(value,keys)=>{
  if(!value||typeof value!=='object'||Array.isArray(value))fail('expected an object.');
  for(const key of Object.keys(value))if(!keys.includes(key))fail(`unknown field ${key}.`);
  for(const key of keys)if(!Object.hasOwn(value,key))fail(`missing field ${key}.`);
};
const integer=(value,min,max)=>{if(!Number.isInteger(value)||value<min||value>max)fail(`expected an integer from ${min} to ${max}.`);};
const text=(value,min=0)=>{if(typeof value!=='string'||value.length<min||value.length>64||/[^\x20-\x7e]/.test(value))fail('label requires printable ASCII, at most 64 bytes.');};
const descendants=scope=>scope.nodes.flatMap(node=>[node,...(node.type==='patcher'?descendants(node.patcher):[])]);
export function validatePresentation(document,registry,structural){
  const identities=new Set();let count=0,panels=0,bytes=0;
  function scope(patcher){
    if(!Object.hasOwn(patcher,'presentation'))fail('missing presentation record.');
    const p=patcher.presentation;
    if(p!==null){
      fields(p,['version','openOnLoad','size','items']);
      if(p.version!==1||typeof p.openOnLoad!=='boolean')fail('unsupported version or openOnLoad.');
      fields(p.size,['width','height']);integer(p.size.width,1,8192);integer(p.size.height,1,8192);
      if(!Array.isArray(p.items))fail('items must be an array.');
      count+=p.items.length;bytes+=new TextEncoder().encode(JSON.stringify(p)).length;
      if(count>128||bytes>65536)fail('document exceeds 128 items or 64 KiB of presentation JSON.');
      const nodes=new Map(descendants(patcher).map(node=>[node.id,node]));
      for(const item of p.items){
        const control=item?.kind==='control';
        fields(item,control?['id','kind','target','widget','label','rect','included','visible','style',...(['menu','radio'].includes(item.widget)?['options']:[])]:['id','kind','target','rect','included','visible','style']);
        if(typeof item.id!=='string'||! /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/.test(item.id)||identities.has(item.id))fail('item IDs must be document-wide unique ASCII identifiers.');
        identities.add(item.id);
        if(typeof item.included!=='boolean'||typeof item.visible!=='boolean')fail('included and visible must be Boolean.');
        fields(item.rect,['x','y','width','height']);
        integer(item.rect.x,0,8192);integer(item.rect.y,0,8192);integer(item.rect.width,1,8192);integer(item.rect.height,1,8192);
        if(item.rect.x+item.rect.width>p.size.width||item.rect.y+item.rect.height>p.size.height)fail('rectangle must fit its surface.');
        fields(item.style,control?['accent','labelPosition']:['accent']);
        if(!['default','cyan','orange','neutral'].includes(item.style.accent))fail('unsupported accent.');
        const node=nodes.get(item.target?.node);
        if(!Number.isInteger(item.target?.node)||!node)fail('target must name a node in its subtree.');
        if(!control){
          if(item.kind!=='livePanel')fail('unknown item kind.');
          fields(item.target,['node','profile']);
          if(++panels>8)fail('document exceeds 8 installed panels.');
          if(node.type!=='live_device'||typeof item.target.profile!=='string'||item.target.profile!==node.params.state?.profile||!registry.live_device?.profiles?.some(profile=>profile.device===node.params.device&&profile.profile===item.target.profile))fail('unsupported installed profile identity.');
          continue;
        }
        text(item.label);
        if(!['above','below','hidden'].includes(item.style.labelPosition))fail('unsupported label position.');
        const target=item.target,spec=registry[node.type];
        if(target.kind==='parameter'){
          fields(target,['kind','node','param']);
          const d=spec?.params?.[target.param];
          if(typeof target.param!=='string'||!d||typeof d.value!=='number'||structural(node.type,target.param))fail('target must be a live nonstructural numeric parameter.');
          if(!['dial','slider','number','toggle','menu','radio'].includes(item.widget))fail('numeric target requires a numeric widget.');
          if(item.widget==='toggle'&&(!d.integer||d.min!==0||d.max!==1))fail('toggle requires a Boolean range.');
          if(['menu','radio'].includes(item.widget)){
            if(!d.integer||!Array.isArray(item.options)||item.options.length>32||item.options.length!==d.max-d.min+1)fail('options must cover the integer domain with at most 32 choices.');
            const values=new Set();
            for(const option of item.options){fields(option,['value','label']);integer(option.value,d.min,d.max);text(option.label,1);if(values.has(option.value))fail('duplicate option.');values.add(option.value);}
          }
        }else if(target.kind==='event'){
          fields(target,['kind','node','inlet','action']);
          const inlet=node.type==='patcher'?null:(spec?.presentationInlets?.(node)??spec?.inlets)?.[target.inlet];
          if(item.widget!=='button'||target.action!=='bang'||!Number.isInteger(target.inlet)||target.inlet<0||!inlet||(inlet.accepts??[inlet.type]).every(type=>type!=='control'))fail('unsupported bang event target.');
        }else if(target.kind==='text'){
          fields(target,['kind','node','param']);
          if(item.widget!=='text'||target.param!=='text'||!['comment','message','message_box'].includes(node.type)||typeof (Object.hasOwn(node.params,'text')?node.params.text:['message','message_box'].includes(node.type)?spec?.params?.text?.value:undefined)!=='string')fail('unsupported display text target.');
        }else fail('unknown target kind.');
      }
    }
    for(const node of patcher.nodes)if(node.type==='patcher')scope(node.patcher);
  }
  scope(document);return document.presentation;
}

export function removePresentationTargets(document,removed){
  if(document.presentation)document.presentation.items=document.presentation.items.filter(item=>!removed.has(item.target.node));
  for(const node of document.nodes)if(node.type==='patcher')removePresentationTargets(node.patcher,removed);
}

// Preserve paint order while remapping copied node/item identities atomically.
export function remapPresentation(presentation,nodeIds,itemId){
  if(presentation===null)return null;
  return {...structuredClone(presentation),items:presentation.items.map(item=>({...structuredClone(item),id:itemId(item.id),target:{...item.target,node:nodeIds.get(item.target.node)??item.target.node}}))};
}
