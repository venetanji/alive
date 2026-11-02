import {analogParameterFacts} from './analog-parameter-facts.mjs';
import {compileViewExpression} from './live-view-expression.mjs';
import {analogParameterDisplay} from './analog-parameter-display.mjs';

const facts=new Map(analogParameterFacts.map(([key,index,module,property,kind,min,max,offset])=>[key,{key,index,module,property,kind,min,max,offset}]));
const specifications=new Map([...facts.values()].map(fact=>[fact.key,{key:fact.key,parts:[fact],min:fact.min-fact.offset,max:fact.max-fact.offset,kind:fact.kind,
  decode:(parameters,field)=>parameters[0][field]-fact.offset,encode:value=>[{index:fact.index,value:value+fact.offset}]}]));
// Live's model uses 1 for F1; the shared native balance mixer uses 0.
for(const key of ['NoiseBalance','SignalChain1.OscillatorBalance','SignalChain2.OscillatorBalance']){
  const specification=specifications.get(key),index=specification.parts[0].index;
  specifications.set(key,{...specification,decode:(parameters,field)=>1-parameters[0][field],encode:value=>[{index,value:1-value}]});
}
for(const [chain,index,module]of [[1,39,3513],[2,122,3521]]){
  const key=`SignalChain${chain}.OscillatorEnvAmount`;
  specifications.set(key,{key,kind:0,min:-1,max:1,parts:[{index,module,property:10,kind:0,min:0,max:1},{index:index+1,module,property:16,kind:3,min:0,max:1}],
    decode:(parameters,field)=>parameters[0][field]*(parameters[1][field]?-1:1),
    encode:value=>[{index,value:Math.abs(value)},{index:index+1,value:value<0?1:0}]});
}
const path=(scope,expression)=>{
  const parts=[...scope,expression].filter(p=>p&&p!=='doc');
  if(/^SignalChain[12]\./.test(expression)||/^SignalChain[12]$/.test(expression))return expression;
  return parts.join('.');
};
const matches=(p,f)=>p&&p.index===f.index&&p.module===f.module&&p.property===f.property&&p.kind===f.kind&&p.min===f.min&&p.max===f.max
  &&['value','applied'].every(field=>Number.isFinite(p[field])&&p[field]>=f.min&&p[field]<=f.max&&(f.kind!==3||Number.isInteger(p[field])))
  &&['revision','applied_revision'].every(field=>Number.isInteger(p[field])&&p[field]>=0);

export function analogPresetParameters(values,catalog){
  if(!(values instanceof Map)||!catalog?.generation||catalog.generation==='0'||!Array.isArray(catalog.parameters))throw Error('Analog preset initialization requires an active parameter catalog.');
  const byIndex=new Map(catalog.parameters.map(p=>[p.index,p])),encoded=new Map();
  for(const [key,input]of values){
    const specification=specifications.get(key);if(!specification)continue;
    const value=typeof input==='boolean'?Number(input):input;
    if(!Number.isFinite(value)||value<specification.min||value>specification.max||specification.kind===3&&!Number.isInteger(value))throw Error(`Analog preset value is outside the admitted range: ${key}.`);
    if(!specification.parts.every(fact=>matches(byIndex.get(fact.index),fact)))throw Error(`Analog preset descriptor does not match: ${key}.`);
    for(const part of specification.encode(value)){
      if(encoded.has(part.index)&&encoded.get(part.index)!==part.value)throw Error('Conflicting Analog preset parameter aliases.');
      encoded.set(part.index,part.value);
    }
  }
  return[...encoded].sort(([a],[b])=>a-b).map(([index,value])=>({index,value}));
}

export function createAnalogBindings({send,sendBatch,onChange=()=>{},onError=()=>{}}={}){
  let generation=null,epoch=0;const states=new Map(),tasks=new Set(),expressions=new Map();
  const changed=()=>onChange();
  const specificationFor=(scope,expression)=>specifications.get(path(scope,expression));
  const parametersFor=(specification,byIndex)=>{
    const parameters=specification.parts.map(fact=>byIndex.get(fact.index));
    return parameters.every((parameter,i)=>matches(parameter,specification.parts[i]))?parameters:null;
  };
  function accept(state,parameters){
    if(parameters.every((p,i)=>p.applied_revision>=state.applied_revisions[i])){
      state.applied=state.specification.decode(parameters,'applied');state.applied_revisions=parameters.map(p=>p.applied_revision);
    }
    if(parameters.every((p,i)=>p.revision>=state.revisions[i])){
      state.revisions=parameters.map(p=>p.revision);state.confirmed=state.specification.decode(parameters,'value');
    }
  }
  function expressionValue(expression,{connection}={}){
    let compiled=expressions.get(expression.value);
    if(compiled===undefined){try{compiled=compileViewExpression(expression.value);}catch{compiled=null;}expressions.set(expression.value,compiled);}
    if(!compiled)return undefined;
    return compiled(name=>{
      const target=name==='IsActive'?expression.connection??connection:null;
      const specification=target?specificationFor(target.scope,target.expression):specificationFor(expression.scope??[],name);
      return specification?states.get(specification.key)?.value:undefined;
    });
  }
  function observe(catalog){
    if(!generation||catalog?.generation!==generation||!Array.isArray(catalog.parameters))return;
    const byIndex=new Map(catalog.parameters.map(p=>[p.index,p]));
    for(const state of states.values()){
      const parameters=parametersFor(state.specification,byIndex);if(!parameters)continue;
      accept(state,parameters);
      if(!state.inflight&&state.pending===undefined)state.value=state.confirmed;
    }
    changed();
  }
  function disconnect(){epoch++;generation=null;changed();}
  function connect(catalog){
    epoch++;generation=null;states.clear();
    if(catalog?.generation&&catalog.generation!=='0'&&Array.isArray(catalog.parameters)){
      generation=String(catalog.generation);
      const byIndex=new Map(catalog.parameters.map(p=>[p.index,p]));
      for(const specification of specifications.values()){
        const parameters=parametersFor(specification,byIndex);if(!parameters)continue;
        const value=specification.decode(parameters,'value');
        states.set(specification.key,{specification,initial:value,value,confirmed:value,applied:specification.decode(parameters,'applied'),
          revisions:parameters.map(p=>p.revision),applied_revisions:parameters.map(p=>p.applied_revision),pending:undefined,inflight:false,error:false});
      }
    }
    changed();
  }
  function flush(state){
    if(state.inflight||state.pending===undefined)return;
    const ticket=epoch,instance=generation;state.inflight=true;
    const work=(async()=>{
      try{
        while(state.pending!==undefined&&ticket===epoch&&generation===instance){
          const value=state.pending;state.pending=undefined;
          const specification=state.specification,values=specification.encode(value),batch=values.length>1;
          const ack=await(batch?sendBatch({generation:instance,values}):send({generation:instance,...values[0]}));
          if(ticket!==epoch)return;
          if(batch&&(ack?.generation!==instance||!Array.isArray(ack.parameters)))throw Error('Invalid Analog parameter batch acknowledgment.');
          const parameters=parametersFor(specification,new Map((batch?ack.parameters:[ack]).map(p=>[p?.index,p])));
          if(!parameters)throw Error('Invalid Analog parameter acknowledgment.');
          accept(state,parameters);
          if(state.pending===undefined)state.value=state.confirmed;
          changed();
        }
      }catch(error){
        if(ticket===epoch){state.pending=undefined;state.value=state.confirmed;state.error=true;onError(error);changed();}
      }finally{state.inflight=false;}
    })();
    tasks.add(work);work.finally(()=>tasks.delete(work));
  }
  function resolve(connection,node,{stateExpressions=[]}={}){
    const specification=connection&&specificationFor(connection.scope,connection.expression);if(!specification)return null;
    const {min,max,kind}=specification;
    const display=analogParameterDisplay(specification.key);
    const binding={verified:true,handlesExpressions:true,min,max,step:kind===3?1:'any',display,
      options:display?.options??(kind===3?Array.from({length:max-min+1},(_,i)=>({value:min+i,label:String(min+i)})):undefined),
      getState(){
        const state=states.get(specification.key);
        const active=stateExpressions.filter(e=>e.name==='StateExpression'||e.name==='ShowWhen');
        return{generation,enabled:!!generation&&!!state&&!state.error&&(specification.parts.length===1||typeof sendBatch==='function')&&active.every(e=>!!expressionValue(e,{connection})),
          known:!!state,value:state?.value,initial:state?.initial,applied:state?.applied,
          pending:!!state&&(state.inflight||state.pending!==undefined||state.revisions.some((revision,i)=>revision!==state.applied_revisions[i]))};
      },
    };
    const edit=input=>{
      if(!binding.getState().enabled)return;
      const value=typeof input==='boolean'?Number(input):typeof input==='string'&&input.trim()!==''?Number(input):input;
      if(!Number.isFinite(value)||value<min||value>max||kind===3&&!Number.isInteger(value))return;
      const state=states.get(specification.key);if(state.value===value)return;
      state.value=value;state.pending=value;changed();flush(state);
    };
    binding.onInput=binding.onChange=edit;return binding;
  }
  return{connect,disconnect,observe,resolve,evaluate:expressionValue,async idle(){while(tasks.size)await Promise.all([...tasks]);}};
}
