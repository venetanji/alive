import {createParameterGestures} from './canvas-parameter-gestures.mjs';
import {CanvasDocument, createHelpViewState, nodeSpec, parseMessage, parsePatch, serializePatch,structuralParameter} from './canvas-model.mjs';
import {mergeMessageDisplays, parseMessageTemplate} from './canvas-message-ui.mjs';
import {mergePrintPopups} from './canvas-print-ui.mjs';
import {validateLiveDeviceState} from './live-device-profile.mjs';

const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const empty=()=>({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[],edges:[]});
const treeNodes=scope=>scope.nodes.flatMap(node=>[node,...(node.type==='patcher'?treeNodes(node.patcher):[])]);
const sourceFields=['version','profile','dllSha256','guiSha256','graphicsSha256','values'];
const sourceIdentity=sourceFields.filter(key=>key!=='values');
const sameSource=(a,b)=>!!a&&!!b&&sourceIdentity.every(key=>a[key]===b[key])&&
  a.values.length===b.values.length&&a.values.every((value,index)=>value===b.values[index]);
function validateExactSource(device,state) {
  if(!state||![Object.prototype,null].includes(Object.getPrototypeOf(state))||
    Reflect.ownKeys(state).length!==sourceFields.length||sourceFields.some(key=>!Object.hasOwn(state,key)))
    throw Error('Live source requires a complete plain state record.');
  if(!Array.isArray(state.values)||Object.getPrototypeOf(state.values)!==Array.prototype)
    throw Error('Live source requires a plain native value array.');
  // Profile validation checks the fixed count before traversing values. Own
  // indices then close its sparse-array gap without unbounded allocation.
  validateLiveDeviceState(device,state);
  if(Reflect.ownKeys(state.values).length!==state.values.length+1)
    throw Error('Live source requires every native value without extra fields.');
  for(let index=0;index<state.values.length;index++)if(!Object.hasOwn(state.values,index))
    throw Error('Live source requires every own native value.');
}
function validateExactSources(patch) {
  for(const node of treeNodes(patch))if(node.type==='live_device')validateExactSource(node.params.device,node.params.state);
}

// Merge individual fields and stable node IDs. Ordered cable edits conflict when
// both authors change them, because fan-out order has execution meaning.
function rebase(base,local,remote,key='') {
  if(equal(base,local))return copy(remote);
  if(equal(base,remote)||equal(local,remote))return copy(local);
  if(key==='nodes'&&[base,local,remote].every(Array.isArray)) {
    const maps=[base,local,remote].map(nodes=>new Map(nodes.map(node=>[node.id,node])));
    return [...new Set([...remote.map(node=>node.id),...local.map(node=>node.id)])]
      .map(id=>rebase(...maps.map(map=>map.get(id)))).filter(node=>node!==undefined);
  }
  if([base,local,remote].every(value=>value&&typeof value==='object'&&!Array.isArray(value))) {
    return Object.fromEntries([...new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])]
      .map(field=>[field,rebase(base[field],local[field],remote[field],field)]).filter(([,value])=>value!==undefined));
  }
  throw Error('Edit conflict: another view changed the same content. The authoritative document was retained.');
}

export function createSharedCanvasController({invoke,onState=()=>{}}={}) {
  if(typeof invoke!=='function')throw Error('Shared canvas requires native document IPC.');
  let parameterGestures;
  let document=new CanvasDocument(empty()),descriptor=null,rawCanonical=null,sourceUnavailable=false,prepareTask=null,drainTask=null,pollTask=null;
  const helpView=createHelpViewState();
  let status={},observations={},messageBoxes={},printPopups={},consoleRecords=[],consoleDropped=0,consoleBaseline=0,consoleEpoch=0;
  let notice='Preparing shared native patch...',faulted=false,panicked=false,disposed=false,detaching=false,epoch=0;
  const queue=[],closeBarriers=new Map();
  const MAX_PENDING_EDITS=64;
  let activeItem=null;
  const getState=()=>({patch:copy(document.patch),document:copy(document.document),path:[...document.path],...helpView.getState(),
    native:true,shared:true,ownerId:descriptor?.ownerLabel,parameterPreviews:[...(descriptor?.parameterPreviews??[]),...(parameterGestures?.snapshots()??[])],revision:descriptor?.runtimeRevision??null,
    desiredRevision:(descriptor?.authoringRevision??0)+queue.filter(item=>['edit','liveSource'].includes(item.kind)).length,
    activeDocumentRevision:descriptor?.authoringRevision??0,
    status:{...status},observations:copy(observations),messageBoxes:copy(messageBoxes),printPopups:copy(printPopups),console:copy(consoleRecords),
    consoleDropped:Math.max(0,consoleDropped-consoleBaseline),notice,faulted:faulted||panicked,
    busy:queue.some(item=>item.kind!=='edit'),applying:queue.some(item=>['edit','liveSource'].includes(item.kind)),
    closing:closeBarriers.size>0,
    ready:!!descriptor&&!queue.length&&!faulted&&!panicked&&!disposed&&!detaching&&!closeBarriers.size&&!status.fault&&!status.server_lost,
    canUndo:!!descriptor?.canUndo,canRedo:!!descriptor?.canRedo});
  const emit=()=>{if(!disposed)onState(getState());};
  parameterGestures=createParameterGestures({native:true,invoke,scope:()=>({ownerLabel:descriptor?.ownerLabel,runtimeRevision:descriptor?.runtimeRevision}),read:(id,key)=>treeNodes(document.document).find(node=>node.id===id)?.params[key],onReply:value=>{if(value?.shared)acceptDescriptor(value);},onChange:emit});
  const report=error=>{notice=String(error?.message||error);emit();};
  function reconcileHelp(next=document,restore=false) {
    helpView.reconcile(next,{owner:descriptor?.ownerLabel??'',path:descriptor?.viewPath??[],restore});
  }
  function setDocument(patch) {
    const next=new CanvasDocument(patch);reconcileHelp(next,true);
    next.nextId=Math.max(next.nextId,document.nextId);document=next;
  }
  function rebuild({isolateConflicts=false}={}) {
    if(!descriptor)return;
    let patch=descriptor.patch;
    for(const item of [...queue])if(item.kind==='edit'){
      try{patch=rebase(item.base,item.patch,patch);}
      catch(error){
        if(!isolateConflicts)throw error;
        queue.splice(queue.indexOf(item),1);item.resolve(false);epoch++;
        for(const barrier of closeBarriers.values())barrier.error=error;
        report(error);
      }
    }
    setDocument(patch);
  }
  function acceptDescriptor(value) {
    if(disposed||!value?.shared||!value.patch)return false;
    if(!Number.isSafeInteger(value.authoringRevision)||value.authoringRevision<0||
      !Number.isSafeInteger(value.runtimeRevision)||value.runtimeRevision<1)throw Error('Invalid native document revision.');
    if(descriptor&&(value.ownerLabel!==descriptor.ownerLabel||value.authoringRevision<descriptor.authoringRevision))return false;
    if(descriptor&&Number.isSafeInteger(descriptor.descriptorRevision)&&
      (!Number.isSafeInteger(value.descriptorRevision)||value.descriptorRevision<descriptor.descriptorRevision))return false;
    validateExactSources(value.patch);
    const valid=new CanvasDocument(value.patch);
    valid.path=[...(value.viewPath||[])];valid.repairPath();
    if(descriptor?.runtimeRevision!==value.runtimeRevision){observations={};printPopups={};}
    if(descriptor?.runtimeRevision!==value.runtimeRevision||descriptor?.messageTextSerial!==value.messageTextSerial)messageBoxes={};
    const first=!descriptor;rawCanonical=copy(value.patch);sourceUnavailable=false;
    descriptor={...copy(value),patch:copy(valid.document)};
    if(first)setDocument(valid.document);
    else if(!queue.length)setDocument(valid.document);
    else {try{rebuild();}catch{/* In-flight CAS resolves a conflicting broadcast before recovery. */}}
    if(first)notice='Shared native patch ready.';
    emit();return true;
  }
  function adoptDescriptor(value) {
    if(!acceptDescriptor(value))throw Error('Cannot adopt this shared native document.');
    return copy(descriptor);
  }
  async function prepare() {
    if(disposed)return false;
    if(descriptor)return true;
    if(!prepareTask)prepareTask=(async()=>{adoptDescriptor(await invoke('document_current'));return true;})()
      .catch(error=>{report(error);return false;}).finally(()=>{prepareTask=null;});
    return prepareTask;
  }
  function recover(error) {
    for(const barrier of closeBarriers.values())barrier.error=error;
    epoch++;faulted=false;
    for(let i=queue.length-1;i>=0;i--)if(queue[i].kind==='edit'){const [item]=queue.splice(i,1);item.resolve(false);}
    if(descriptor)setDocument(descriptor.patch);
    report(error);
  }
  function acceptResult(result) {
    if(typeof result?.accepted!=='boolean'||!result.document?.shared||
      result.document.ownerLabel!==descriptor.ownerLabel)throw Error('Native operation did not return the authoritative document.');
    acceptDescriptor(result.document);
    return result.accepted;
  }
  async function commit(item) {
    for(let attempt=0;attempt<8;attempt++) {
      let patch;
      try{patch=new CanvasDocument(rebase(item.base,item.patch,descriptor.patch)).document;}
      catch(error){throw Error(`Edit conflict: ${error.message} The authoritative document was retained.`);}
      // Generic model validation narrows native values. Restore only sources
      // this edit left untouched, using the latest exact canonical numbers.
      const maps=[item.base,item.patch,descriptor.patch,rawCanonical].map(root=>new Map(treeNodes(root).map(node=>[node.id,node])));
      for(const node of treeNodes(patch))if(node.type==='live_device'){
        const [base,local,remote,raw]=maps.map(map=>map.get(node.id));
        if([base,local,remote,raw].every(part=>part?.type==='live_device'&&part.params.device===node.params.device)&&
          sameSource(base.params.state,local.params.state)&&sameSource(node.params.state,remote.params.state))
          node.params.state=copy(raw.params.state);
      }
      const result=await invoke('document_commit',{baseRevision:descriptor.authoringRevision,patch,
        ...(item.parameter?{parameter:{...item.parameter,hot:item.parameter.hot&&item.epoch===epoch}}:{}),...(item.messageText?{messageText:item.messageText}:{}),history:item.history, ...(item.force?{force:true}:{})});
      if(acceptResult(result))return true;
    }
    throw Error('Edit conflict: the document is changing in another view. The authoritative document was retained.');
  }
  function sourceAvailability() {
    if(disposed||detaching)return 'This patcher view is detached.';
    if(!descriptor||!rawCanonical)return 'Wait for the shared document to prepare.';
    if(sourceUnavailable)return 'Canonical source state is unavailable. Read the shared document again.';
    if(faulted||panicked||status.fault||status.server_lost)return 'Native document is faulted.';
    return null;
  }
  function readLiveSource(node) {
    const reason=sourceAvailability();if(reason)return {available:false,reason};
    const source=treeNodes(rawCanonical).find(part=>part.id===node);
    if(source?.type!=='live_device')return {available:false,reason:'Native source is unavailable at this node.'};
    return {available:true,expected:{ownerLabel:descriptor.ownerLabel,runtimeRevision:descriptor.runtimeRevision,
      node,device:source.params.device,state:copy(source.params.state)}};
  }
  function sourceCanonical(node) {
    if(!descriptor||!rawCanonical||sourceUnavailable||!Number.isSafeInteger(node))return null;
    const source=treeNodes(rawCanonical).find(part=>part.id===node);
    return {ownerLabel:descriptor.ownerLabel,runtimeRevision:descriptor.runtimeRevision,
      authoringRevision:descriptor.authoringRevision,node,
      source:source?.type==='live_device'?copy(source.params):null};
  }
  function sourceResult(outcome,node,reason,canonical=sourceCanonical(node)) {
    return {outcome,...(reason?{reason}:{}),canonical:copy(canonical),native:{status:'unobserved'}};
  }
  async function reconcileSource(error,node) {
    try {
      if(!acceptDescriptor(await invoke('document_current')))throw Error('Canonical source reply was out of order.');
      return sourceResult('unknown',node,String(error?.message||error));
    } catch {
      sourceUnavailable=true;
      return sourceResult('unknown',node,String(error?.message||error),null);
    }
  }
  async function commitSource(item) {
    const {expected,nextState}=item;
    for(let attempt=0;attempt<8;attempt++) {
      const unavailable=sourceAvailability();
      if(unavailable)return sourceResult('unavailable',expected.node,unavailable);
      const current=sourceCanonical(expected.node);
      if(current.ownerLabel!==expected.ownerLabel||current.runtimeRevision!==expected.runtimeRevision||
        current.source?.device!==expected.device||!sameSource(current.source?.state,expected.state))
        return sourceResult('conflict',expected.node,'The complete native source or its runtime scope changed.');
      if(sameSource(expected.state,nextState))return sourceResult('unchanged',expected.node);
      const patch=copy(rawCanonical);
      treeNodes(patch).find(node=>node.id===expected.node).params.state=copy(nextState);
      try {
        validateExactSources(patch);new CanvasDocument(patch);
        const result=await invoke('document_commit',{baseRevision:descriptor.authoringRevision,patch,history:true,
          expectedScope:{ownerLabel:expected.ownerLabel,runtimeRevision:expected.runtimeRevision}});
        if(typeof result?.accepted!=='boolean'||!result.document?.shared||result.document.ownerLabel!==descriptor.ownerLabel)
          throw Error('Native source operation did not return the authoritative document.');
        // Validate even an older reply before trusting its acceptance receipt.
        validateExactSources(result.document.patch);new CanvasDocument(result.document.patch);
        if(!Number.isSafeInteger(result.document.authoringRevision)||result.document.authoringRevision<0||
          !Number.isSafeInteger(result.document.runtimeRevision)||result.document.runtimeRevision<1)
          throw Error('Invalid native document revision.');
        if(result.accepted){
          const source=treeNodes(result.document.patch).find(node=>node.id===expected.node);
          if(result.document.runtimeRevision!==expected.runtimeRevision||source?.type!=='live_device'||
            source.params.device!==expected.device||!sameSource(source.params.state,nextState))
            throw Error('Native source acceptance returned a different source.');
        }
        if(!acceptDescriptor(result.document))throw Error('Native source reply was out of order.');
        if(result.accepted)return sourceResult('accepted',expected.node);
      } catch(error) {
        // An IPC failure can follow successful admission. Reconcile once and
        // leave later queued edits intact; this write must never be replayed.
        return reconcileSource(error,expected.node);
      }
    }
    return sourceResult('conflict',expected.node,'The document kept changing during native source admission.');
  }
  function commitLiveSource(request) {
    const unavailable=sourceAvailability();
    if(unavailable)return Promise.resolve(sourceResult('unavailable',request?.expected?.node,unavailable));
    if(closeBarriers.size||queue.some(item=>item.kind==='history'))return Promise.resolve(sourceResult('unavailable',request?.expected?.node,
      closeBarriers.size?'This patcher is closing.':'Native history is pending. Wait before editing.'));
    try {
      const {expected,nextState}=request??{};
      if(!expected||typeof expected.ownerLabel!=='string'||!expected.ownerLabel||
        !Number.isSafeInteger(expected.runtimeRevision)||expected.runtimeRevision<1||
        !Number.isSafeInteger(expected.node)||expected.node<1||expected.node>100000)
        throw Error('Invalid native source expectation.');
      validateExactSource(expected.device,expected.state);validateExactSource(expected.device,nextState);
      if(sourceIdentity.some(key=>expected.state[key]!==nextState[key]))throw Error('Native source identity cannot change.');
      if(queue.filter(item=>['edit','liveSource'].includes(item.kind)).length>=MAX_PENDING_EDITS)
        throw Error('Edit queue full. Wait for native admission before editing.');
      return enqueue({kind:'liveSource',expected:{ownerLabel:expected.ownerLabel,runtimeRevision:expected.runtimeRevision,
        node:expected.node,device:expected.device,state:copy(expected.state)},nextState:copy(nextState)});
    } catch(error) {return Promise.resolve(sourceResult('rejected',request?.expected?.node,String(error?.message||error)));}
  }
  function pump() {
    if(drainTask)return drainTask;
    drainTask=Promise.resolve().then(async()=>{
      while(queue.length&&!disposed) {
        const item=queue[0];activeItem=item;
        try {
          let result;
          if(item.kind==='edit')result=await commit(item);
          else if(item.kind==='liveSource') {
            result=await commitSource(item);
            if(!['accepted','unchanged'].includes(result.outcome)){
              const error=Error(result.reason||'Native source commit failed.');
              for(const barrier of closeBarriers.values())barrier.error=error;
              report(error);
            }
          }
          else if(item.kind==='history') {
            const response=await invoke('document_history',{direction:item.direction,baseRevision:descriptor.authoringRevision});
            result=acceptResult(response);
            if(!result){
              const error=Error('History changed in another view. The authoritative document was retained; try again.');
              for(const barrier of closeBarriers.values())barrier.error=error;
              report(error);
            }
          } else if(item.kind==='event') {
            result=false;
            if(item.epoch===epoch&&!faulted&&!panicked) {
              // Later optimistic edits must not change an earlier event's target.
              const node=treeNodes(descriptor.patch).find(node=>node.id===item.node);
              if(node)result=await invoke('canvas_event',{revision:descriptor.runtimeRevision,node:item.node,inlet:item.inlet,value:item.value,...(item.action?{action:item.action}:{})});
            }
          } else result=await item.run();
          if(queue[0]===item)queue.shift();
          if(item.kind==='liveSource')rebuild({isolateConflicts:true});
          item.resolve(result);if(item.kind!=='liveSource')rebuild();emit();
        } catch(error) {
          if(item.kind==='liveSource') {
            const result=await reconcileSource(error,item.expected.node);
            if(queue[0]===item)queue.shift();
            for(const barrier of closeBarriers.values())barrier.error=error;
            try{rebuild({isolateConflicts:true});}catch{/* Retain unrelated queued edits for their own admission. */}
            item.resolve(result);report(error);
          } else if(item.kind==='edit') {
            // A failed IPC may have reached native admission. Read canonical state
            // before removing optimistic edits, never publish a guessed rollback.
            try{acceptDescriptor(await invoke('document_current'));}catch{}
            recover(error);
          } else {
            if(item.kind==='history')for(const barrier of closeBarriers.values())barrier.error=error;
            if(queue[0]===item)queue.shift();
            if(item.kind==='event')faulted=true;
            item.resolve(false);report(error);
          }
        }
      }
    }).finally(()=>{activeItem=null;drainTask=null;emit();if(queue.length&&!disposed)pump();});
    return drainTask;
  }
  function enqueue(item,{priority=false}={}) {
    const promise=new Promise(resolve=>item.resolve=resolve);
    if(priority){item.safety=true;let index=activeItem?1:0;while(queue[index]?.safety)index++;queue.splice(index,0,item);}else queue.push(item);
    emit();pump();return promise;
  }
  function edit(method,args,{history=true,parameter,messageText,force=false,coalesceKey}={}) {
    if(disposed||detaching)throw Error('This patcher view is detached.');
    if(closeBarriers.size)throw Error('This patcher is closing. Cancel closing before editing.');
    if(!descriptor)throw Error('Wait for the shared document to prepare.');
    // History has no speculative tree: wait for its canonical result before
    // capturing another edit base, including while its IPC is in flight.
    if(queue.some(item=>item.kind==='history'))throw Error('Native history is pending. Wait before editing.');
    coalesceKey??=parameter?`parameter:${parameter.node}:${parameter.key}`:undefined;
    const tail=queue.at(-1);
    const coalesce=history===false&&coalesceKey&&tail?.kind==='edit'&&tail!==activeItem&&tail.coalesceKey===coalesceKey&&tail.epoch===epoch;
    // Refuse before mutating the optimistic document; discrete undo boundaries
    // and event/history ordering are never silently merged or discarded.
    if(!coalesce&&queue.filter(item=>['edit','liveSource'].includes(item.kind)).length>=MAX_PENDING_EDITS)
      throw Error('Edit queue full. Wait for native admission before editing.');
    const base=copy(document.document),result=method(...args);
    reconcileHelp();
    // A hot control may restore its saved value after incoming messages changed
    // only live state. Native must admit that action even with an unchanged tree.
    if(messageText)delete messageBoxes[messageText.node];
    if(force||messageText||parameter?.hot||!equal(base,document.document)) {
      if(coalesce){tail.patch=copy(document.document);tail.parameter=parameter;emit();}
      else enqueue({kind:'edit',base,patch:copy(document.document),history,parameter,messageText,force,coalesceKey,epoch});
    }
    return result;
  }
  function parameter(id,key,value,{history=true,root=false}={}) {
    parameterGestures.assertTarget(id,key);
    const node=(root?treeNodes(document.document):document.patch.nodes).find(node=>node.id===id);
    if(!node)throw Error('Missing object.');
    const structural=structuralParameter(node.type,key);
    const parameter=typeof value==='number'&&!structural&&!['comment','patcher','help_helper'].includes(node.type)?
      {node:id,key,value,hot:key==='value'&&['number','number_int','toggle','int','float','flonum','slider'].includes(node.type)}:undefined;
    const messageText=node.type==='message_box'&&key==='text'?{node:id,text:value}:undefined;
    return edit((...args)=>root?document.parameterRoot(...args):document.parameter(...args),[id,key,value,{history}],{history,parameter,messageText});
  }
  function event(node,inlet=0,value=null,action,root=false) {
    const releasingDeviceNote=closeBarriers.size&&root&&inlet===0&&Array.isArray(value)&&value.length===2&&value[1]===0&&
      treeNodes(document.document).some(target=>target.id===node&&target.type==='poly_note');
    if(disposed||detaching||!descriptor||closeBarriers.size&&
      (!releasingDeviceNote||[...closeBarriers.values()].some(barrier=>barrier.purpose!=='save')))return Promise.resolve(false);
    const target=(root?treeNodes(document.document):document.patch.nodes).find(item=>item.id===node),port=target&&nodeSpec(target).inlets[inlet];
    if(!port||!(port.accepts??[port.type]).includes('control'))throw Error('Events require an inlet that accepts control messages.');
    if(typeof value==='string'){
      if(target.type==='message_box'&&(inlet===1||/^set(?:\s|$)/.test(value.trimStart())))parseMessageTemplate(value);
      else parseMessage(value);
    }
    else if(value!==null&&(!Array.isArray(value)||!value.length||value.length>8||value.some(atom=>!Number.isFinite(atom)||Math.abs(atom)>100000)))
      throw Error('Events contain one to eight bounded numbers or a literal message.');
    if(queue.filter(item=>item.kind==='event').length>=64){report('Event queue overflow. Wait for native admission.');return Promise.resolve(false);}
    return enqueue({kind:'event',node,inlet,value:copy(value),epoch,...(action?{action}:{})});
  }
  function tab(node) {
    if(disposed||detaching||closeBarriers.size||!descriptor)return Promise.resolve(false);
    if(!['flonum','number_int'].includes(document.patch.nodes.find(item=>item.id===node)?.type))throw Error('Tab requires a numeric UI box with a second outlet.');
    return event(node,0,null,'tab');
  }
  async function poll() {
    if(disposed)return;
    if(pollTask)return pollTask;
    const logEpoch=consoleEpoch;
    pollTask=(async()=>{
      try {
        const [audio,graph]=await Promise.all([invoke('audio_status'),invoke('canvas_status')]);
        if(disposed)return;
        status=audio||{};
        if(logEpoch===consoleEpoch&&Array.isArray(graph?.console))consoleRecords=[...consoleRecords,...graph.console].slice(-512);
        if(Number.isSafeInteger(graph?.console_dropped))consoleDropped=graph.console_dropped;
        if(logEpoch!==consoleEpoch)consoleBaseline=consoleDropped;
        if(graph?.revision===descriptor?.runtimeRevision) {
          const ids=new Set(treeNodes(document.document).map(node=>node.id));
          observations=Object.fromEntries((graph.nodes||[]).filter(node=>ids.has(node.id)).map(node=>[node.id,{value:node.value,pulses:node.pulses}]));
          const pending=new Set(queue.filter(item=>item.kind==='edit'&&item.messageText).map(item=>item.messageText.node));
          messageBoxes=mergeMessageDisplays(messageBoxes,graph.message_boxes,{revision:descriptor.runtimeRevision,serial:descriptor.messageTextSerial??0,ids,pending});
          printPopups=mergePrintPopups(printPopups,graph.print_popups,{revision:descriptor.runtimeRevision,ids:new Set(treeNodes(document.document).filter(node=>node.type==='print').map(node=>node.id))});
          if(graph.active===false){faulted=true;notice='Native canvas profile is no longer active. Reapply before playing.';}
        }
        if(status.fault||status.server_lost){faulted=true;notice=`Native audio fault: ${status.message||'backend unavailable'}.`;}
        emit();
      }catch(error){report(`Native status unavailable: ${error?.message||error}`);}
    })().finally(()=>{pollTask=null;});return pollTask;
  }
  async function flush() {
    if(!descriptor)await prepare();
    while(drainTask||queue.length){if(!drainTask)pump();await drainTask;}
    if(pollTask)await pollTask;
    return copy(descriptor);
  }
  async function flushBeforeClose(request) {
    const existing=closeBarriers.get(request.requestLabel);
    if(!existing||existing.token!==request.token)closeBarriers.set(request.requestLabel,{token:request.token,purpose:request.purpose,error:null});
    emit();await settleParameterGestures();
    const barrier=closeBarriers.get(request.requestLabel);
    if(barrier?.token===request.token&&barrier.error)throw barrier.error;
  }
  function cancelClose(request) {
    if(closeBarriers.get(request.requestLabel)?.token!==request.token)return;
    closeBarriers.delete(request.requestLabel);emit();
  }
  async function settleParameterGestures(){
    await parameterGestures.settle();await flush();
    if(descriptor?.parameterPreviews?.length){const captured=descriptor.ownerLabel,runtime=descriptor.runtimeRevision;const value=await invoke('document_settle_parameter_gestures');if(descriptor.ownerLabel!==captured||descriptor.runtimeRevision!==runtime)throw Error('Presentation settlement scope changed.');acceptDescriptor(value);}
  }
  function operation(run,priority=false) {if(disposed||detaching)return Promise.resolve(false);return enqueue({kind:'operation',run},{priority});}
  function stop(message='Timers and notes stopped.') {
    epoch++;observations={};
    return operation(async()=>{await invoke('canvas_stop');observations={};notice=message;return true;},true);
  }
  async function dispose() {
    if(disposed)return;
    await settleParameterGestures();detaching=true;epoch++;await flush();disposed=true;observations={};
  }
  return {beginParameterGesture:parameterGestures.begin,writeParameterGesture:parameterGestures.write,settleParameterGestures,readLiveSource,commitLiveSource,getState,prepare,adoptDescriptor,acceptDescriptor,flush,flushBeforeClose,cancelClose,poll,dispose,disposeDocument:dispose,parameter,event,tab,stop,
    deviceParameter:(id,key,value,options)=>parameter(id,key,value,{...options,root:true}),
    deviceEvent:(node,inlet,value)=>event(node,inlet,value,undefined,true),
    startAudio:()=>{const token=epoch;return operation(async()=>{if(token!==epoch)return false;if(panicked){report('Panic is latched. Stop audio, then Start audio to recover.');return false;}
      if(!descriptor&&!(await prepare()))return false;faulted=false;await invoke('audio_start');await poll();
      notice=status.running?'Audio running.':'Audio could not start.';emit();return !!status.running;});},
    stopAudio:()=>{epoch++;return operation(async()=>{try{await invoke('canvas_stop');}catch{/* Global stop remains available after a canvas fault. */}await invoke('audio_stop');status={...status,running:false};faulted=false;panicked=false;observations={};notice='Audio stopped.';return true;},true);},
    panic:()=>{epoch++;panicked=true;faulted=true;return operation(async()=>{await invoke('audio_panic');notice='Native Panic sent. Stop audio, then Start audio to recover.';return true;},true);},
    enter:id=>{document.enter(id);helpView.navigate(document);emit();},leave:depth=>{document.leave(depth);helpView.navigate(document);emit();},reveal:id=>{document.reveal(id);helpView.navigate(document);emit();},
    hostHelpBasic:()=>{if(disposed||detaching||closeBarriers.size)return false;const hosted=helpView.hostBasic(document);if(hosted)emit();return hosted;},
    clearConsole:()=>{consoleRecords=[];consoleBaseline=consoleDropped;consoleEpoch++;emit();},
    ...Object.fromEntries(['add','configure','remove','removeMany','connect','disconnect','move','moveMany','resize','style','setPresentation','updatePresentationItem','duplicateMany']
      .map(method=>[method,(...args)=>edit((...values)=>document[method](...values),args,{history:args.at(-1)?.history!==false,coalesceKey:`${method}:${JSON.stringify(args[0])}`})])),
    configure:(id,type,params)=>type==='message_box'&&document.patch.nodes.find(node=>node.id===id)?.type===type?
      parameter(id,'text',params.text):edit((...args)=>document.configure(...args),[id,type,params]),
    undo:()=>operationHistory('undo'),redo:()=>operationHistory('redo'),
    load:value=>edit(patch=>{
      const changed=document.replace(patch);
      reconcileHelp(document,true);return changed;
    },[typeof value==='string'?parsePatch(value):value]),
    reapply:()=>{faulted=false;panicked=false;return edit(()=>true,[],{force:true,history:false});},
    export:()=>serializePatch(document.document),notice:report};

  function operationHistory(direction) {
    if(disposed||detaching||closeBarriers.size||!descriptor)return Promise.resolve(false);
    return enqueue({kind:'history',direction});
  }
}
