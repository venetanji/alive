// This owner outlives presentation mounts. Only explicit settlement changes native state.
export function createParameterGestures({native,scope,read,invoke,onReply=()=>{},onCommit=()=>{},onChange=()=>{}}){
  const active=new Map();let serial=0,queue=Promise.resolve();
  const key=value=>JSON.stringify(value),current=gesture=>key(scope())===key(gesture.scope);
  const assert=gesture=>{if(!current(gesture)){active.delete(gesture.id);throw Error('Presentation gesture scope changed.');}};
  function begin(node,param){
    assertTarget(node,param);const id=`parameter-gesture-${++serial}`,original=read(node,param);
    active.set(id,{id,node,key:param,scope:{...scope()},original,value:original,token:null});return id;
  }
  function assertTarget(node,param){if([...active.values()].some(g=>current(g)&&g.node===node&&g.key===param))throw Error('This parameter has an active presentation gesture. Finish or cancel it first.');}
  function assertSettled(){if([...active.values()].some(current))throw Error('Finish or cancel the active presentation control before replacing this patch.');}
  function write(id,phase,value){
    const gesture=active.get(id);if(!gesture)return Promise.reject(Error('Presentation gesture is no longer active.'));
    const run=async()=>{
      assert(gesture);
      if(!['preview','commit','cancel'].includes(phase))throw Error('Invalid presentation gesture phase.');
      if(phase==='cancel'&&gesture.token===null){active.delete(id);onChange();return gesture.original;}
      if(native){
        const captured={ownerLabel:gesture.scope.ownerLabel,runtimeRevision:gesture.scope.runtimeRevision};
        if(gesture.token===null){
          let reply;try{reply=await invoke('document_parameter_gesture',{request:{...captured,token:null,node:gesture.node,key:gesture.key,phase:'begin',value:gesture.original}});}catch(error){assert(gesture);gesture.original=read(gesture.node,gesture.key);gesture.value=gesture.original;onChange();throw error;}
          assert(gesture);if(!Number.isSafeInteger(reply?.token))throw Error('Invalid native presentation gesture token.');gesture.token=reply.token;onReply(reply.document);
        }
        const reply=await invoke('document_parameter_gesture',{request:{...captured,token:gesture.token,node:gesture.node,key:gesture.key,phase,value}});assert(gesture);onReply(reply.document);
      }
      gesture.value=phase==='cancel'?gesture.original:value;
      if(phase!=='preview'){active.delete(id);if(phase==='commit')onCommit(gesture.node,gesture.key,value);}
      onChange();return gesture.value;
    };
    const result=queue.then(run);queue=result.catch(()=>{});return result;
  }
  async function settle(){await queue;for(const gesture of [...active.values()]){if(!current(gesture)){active.delete(gesture.id);continue;}await write(gesture.id,'commit',gesture.value);}}
  return{begin,write,settle,assertTarget,assertSettled,idle:()=>queue,snapshots:()=>[...active.values()].filter(current).map(({id,node,key,value,original})=>({id,node,key,value,baseline:original}))};
}
