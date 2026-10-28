export function nativeInteger(value){if(typeof value!=='string'||! /^(0|[1-9][0-9]*)$/.test(value))throw Error('Native identity requires a canonical decimal string.');const result=BigInt(value);if(result>18446744073709551615n)throw Error('Native identity exceeds u64.');return result;}

export function validateMaster(master){
  const invalid=()=>{throw Error('Invalid Master snapshot.');};
  const number=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
  if(!master||typeof master!=='object'||!number(master.gain,0,4)||typeof master.available!=='boolean'||!(master.unavailableReason===null||typeof master.unavailableReason==='string')||typeof master.observationStale!=='boolean')invalid();
  nativeInteger(master.acceptedSerial);
  const observation=master.observation;
  if(observation!==null){
    if(!observation||typeof observation!=='object'||!number(observation.targetGain,0,4)||!number(observation.currentGain,0,4)||!number(observation.peakLeft,0,Infinity)||!number(observation.peakRight,0,Infinity)||!Number.isInteger(observation.clipMask)||observation.clipMask<0||observation.clipMask>3)invalid();
    for(const key of ['appliedSerial','appliedFrame','observationStartFrame','observationEndFrame'])nativeInteger(observation[key]);
  }
  return master;
}
