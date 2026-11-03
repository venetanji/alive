import {analogCurrentMappings,decodeAnalogCurrentParameter} from './parameter-mapping.mjs';
import {validateAnalogDescriptors} from './state.mjs';
import {validateLiveDeviceState} from '../../live-device-profile.mjs';
import {analogCurrentConnectionStatus} from './editor.mjs';
import {compileViewExpression} from '../../live-view-expression.mjs';

const mappings=new Map(analogCurrentMappings.flatMap(row=>(row.secondary?[row.model,row.secondary]:[row.model]).map(key=>[key,row])));
const clone=value=>structuredClone(value);
const identity=['ownerLabel','runtimeRevision','node','device'];
const sourceFields=['version','profile','dllSha256','guiSha256','graphicsSha256'];
const sameIdentity=(a,b)=>identity.every(key=>a?.[key]===b?.[key])&&sourceFields.every(key=>a?.state?.[key]===b?.state?.[key]);
const sameValues=(a,b)=>a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
const fail=message=>{throw Error(`Analog panel: ${message}`);};
const unqualifiedDisplay=Object.freeze({format:()=>'--',parse:()=>fail('physical input conversion is unqualified (read-only).')});
const booleanDisplay=Object.freeze({format:value=>value?'On':'Off',parse:unqualifiedDisplay.parse});

// This permits one source-editor transaction, not DSP readback or full mapping qualification.
export function analogWritableKey(expected,key){if(key!=='NoiseToggle')return false;try{validateExpected(expected);return true;}catch{return false;}}

function qualifiedNoiseWidget(connection,node){
  const resource='Devices/UltraAnalog/Noise.xml';
  const scope=value=>Array.isArray(value)&&value.length===1&&value[0]==='doc';
  return connection?.expression==='NoiseToggle'&&connection.resource===resource&&scope(connection.scope)&&
    node?.className==='LoadableCheckControlText'&&node.id===''&&node.resource===resource&&scope(node.scope)&&
    node.properties?.OnlySetActiveWhen?.tag==='EnumProperty'&&node.properties.OnlySetActiveWhen.attributes?.Value==='2';
}

function validateExpected(expected){
  if(!expected||expected.device!=='Analog'||typeof expected.ownerLabel!=='string'||!expected.ownerLabel.length||
    !Number.isSafeInteger(expected.runtimeRevision)||expected.runtimeRevision<=0||!Number.isSafeInteger(expected.node)||expected.node<=0)
    fail('expected an exact prepared Analog source.');
  validateLiveDeviceState('Analog',expected.state);
  const values=expected.state.values;
  if(Reflect.ownKeys(values).length!==204||!Array.from({length:203},(_,index)=>Object.hasOwn(values,index)).every(Boolean))
    fail('expected every own native source index.');
}
function validateCatalog(expected,catalog){
  if(catalog?.generation!==String(expected.runtimeRevision))fail('native observation generation does not match.');
  validateAnalogDescriptors(catalog.parameters);
  for(const row of catalog.parameters){
    for(const field of ['value','applied'])if(!Number.isFinite(row[field])||row[field]<row.min||row[field]>row.max||row.kind===3&&!Number.isInteger(row[field]))
      fail(`invalid native observation value at index ${row.index}.`);
    for(const field of ['revision','applied_revision'])if(!Number.isInteger(row[field])||row[field]<=0||row[field]>0xffffffff)
      fail(`invalid native observation version at index ${row.index}.`);
    if(row.value!==Math.fround(expected.state.values[row.index]))fail(`native observation does not match saved source at index ${row.index}.`);
  }
}
function decode(values,dormant){
  const known=Object.create(null),unknown=new Set(['On','PerNotePitchBendRange']);
  for(const row of analogCurrentMappings){
    try{
      const decoded=decodeAnalogCurrentParameter(row.model,row.indices.map(index=>({index,value:Math.fround(values[index])})),dormant.get(row.model));
      if(row.secondary){
        known[row.secondary]=decoded.toggle;
        if(decoded.ambiguous)unknown.add(row.model);else known[row.model]=decoded.value;
      }else known[row.model]=decoded;
    }catch{unknown.add(row.model);if(row.secondary)unknown.add(row.secondary);}
  }
  return{values:known,unknown};
}

// Static model/native knowledge alone grants no physical display or dial authority.
export function createAnalogPanelBindings({expected,catalog,dormantValues=new Map(),onChange=()=>{}}={}){
  validateExpected(expected);validateCatalog(expected,catalog);
  if(!(dormantValues instanceof Map)||dormantValues.size>3)fail('expected bounded dormant selections.');
  const dormant=new Map(dormantValues);
  for(const[key,value]of dormant){
    const row=mappings.get(key);if(!row||row.model!==key||row.kind!==2)fail('invalid dormant selection.');
    decodeAnalogCurrentParameter(key,[{index:row.index,value:0}],value);
  }
  let current=clone(expected),observed=clone(catalog),model=decode(current.state.values,dormant),nativeStatus='observed',disconnected=false;
  let appliedModel=decode(observed.parameters.map(part=>part.applied),dormant);
  const initial={...model.values},origin=clone(expected),expressions=new Map();
  let notify=onChange;
  function evaluateExpression(expression,{connection}={}){
    if(!expression||typeof expression.value!=='string')return undefined;
    let compiled=expressions.get(expression.value);
    if(compiled===undefined){try{compiled=compileViewExpression(expression.value);}catch{compiled=null;}if(expressions.size<4096)expressions.set(expression.value,compiled);}
    if(!compiled)return undefined;
    return compiled(name=>{
      const bound=name==='IsActive'?(expression.connection??connection):{scope:expression.scope??[],expression:name};
      const key=analogCurrentConnectionStatus(bound).key;
      return key&&Object.hasOwn(model.values,key)?model.values[key]:undefined;
    });
  }
  function resolveBinding(connection,node,{stateExpressions=[]}={}){
    const key=analogCurrentConnectionStatus(connection).key,row=mappings.get(key);
    if(!row)return null;
    const qualified=qualifiedNoiseWidget(connection,node);
    return{bindingId:key,verified:qualified&&analogWritableKey(current,key),
      get handlesExpressions(){return stateExpressions.every(expression=>evaluateExpression(expression,{connection})!==undefined);},
      min:row.secondary===key?0:row.min,max:row.secondary===key?1:row.max,
      step:row.secondary===key||['enum','int','gated','bool'].includes(row.source.type)?1:'any',display:qualified?booleanDisplay:unqualifiedDisplay,contextualHelp:qualified,
      getState(){
        const known=Object.hasOwn(model.values,key),parts=observed?row.indices.map(index=>observed.parameters[index]):null;
        const applied=appliedModel?.values[key],enabled=!disconnected&&nativeStatus==='observed'&&known&&qualified&&analogWritableKey(current,key);
        return{enabled,known,value:known?model.values[key]:undefined,initial:initial[key],applied,
          generation:String(current.runtimeRevision),nativeStatus,
          revisions:parts?.map(part=>part.revision),applied_revisions:parts?.map(part=>part.applied_revision),
          pending:parts?parts.some(part=>part.revision!==part.applied_revision||part.value!==part.applied):undefined,
          unavailableReason:enabled?undefined:disconnected?'Panel bindings are disconnected.':nativeStatus==='unavailable'?'Native cached observation is unavailable.':!known?'Current model group is unknown.':'Physical display and editing are unqualified (read-only).'};
      }};
  }
  function observe(next){
    if(disconnected)return false;
    try{validateExpected(next?.expected);if(!sameIdentity(origin,next.expected))return false;}catch{return false;}
    if(!sameValues(current.state.values,next.expected.state.values)){observed=null;appliedModel=null;}
    current=clone(next.expected);model=decode(current.state.values,dormant);
    let accepted=true;
    if(next.catalog==null)nativeStatus='unavailable';
    else try{validateCatalog(current,next.catalog);observed=clone(next.catalog);appliedModel=decode(observed.parameters.map(part=>part.applied),dormant);nativeStatus='observed';}
    catch{nativeStatus='unavailable';accepted=false;}
    notify?.();return accepted;
  }
  return{snapshot:()=>({values:{...model.values},unknownKeys:[...model.unknown],expected:clone(current),nativeStatus,disconnected}),
    resolveBinding,evaluateExpression,observe,
    disconnect(){if(disconnected)return;disconnected=true;nativeStatus='unavailable';observed=null;appliedModel=null;expressions.clear();notify?.();notify=null;}};
}
