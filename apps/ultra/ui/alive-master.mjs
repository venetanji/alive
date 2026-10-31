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

// One producer owns admission for every Master control in both views.
export function createMasterProducer({invoke,onStatus=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,maxOrdinal=Number.MAX_SAFE_INTEGER}={}){
  let generation=null,ordinal=0,inFlight=null,gain=null,reset=null,timer=null,epoch=0;
  const report=(message,extra={})=>onStatus({message,...extra});
  function nextOrdinal(){if(ordinal>=maxOrdinal){report('Master command ordinal exhausted.',{error:true});return null;}return ++ordinal;}
  function pump(){
    if(inFlight||timer!==null||generation===null)return;
    const op=!gain?reset:!reset?gain:gain.ordinal<reset.ordinal?gain:reset;
    if(!op)return;
    if(op===gain)gain=null;else reset=null;
    inFlight=op;const currentEpoch=epoch;
    let request;try{request=invoke(op.kind==='gain'?'alive_master':'alive_master_reset_clip',op.kind==='gain'?{generation:op.generation,gain:op.value}:{generation:op.generation});}catch(error){request=Promise.reject(error);}
    Promise.resolve(request).then(receipt=>{
      if(currentEpoch!==epoch)return;
      try{
        if(receipt?.generation!==generation)throw Error();
        if(nativeInteger(receipt.acceptedSerial)===0n)throw Error();
        if(op.kind==='gain'&&(typeof receipt.acceptedGain!=='number'||!Number.isFinite(receipt.acceptedGain)||receipt.acceptedGain<0||receipt.acceptedGain>4||typeof receipt.changed!=='boolean'))throw Error();
      }catch{report('Invalid or stale Master receipt.',{error:true,ordinal:op.ordinal,kind:op.kind,...(op.kind==='gain'?{value:op.value}:{})});return;}
      report(op.kind==='gain'?'Master gain admitted.':'Digital overload reset admitted.',{receipt,ordinal:op.ordinal,kind:op.kind,value:op.value});
    },error=>{
      if(currentEpoch!==epoch)return;
      const message=error?.message??String(error);
      if(error?.code==='FULL'||error?.code==='BUSY'){
        if(op.kind==='reset')reset=op;else if(!gain||gain.ordinal<op.ordinal)gain=op;
        report(`Master waiting: ${message}`,{pending:true});
        timer=setTimer(()=>{timer=null;pump();},100);
      }else report(`Master refused: ${message}`,{error:true,ordinal:op.ordinal,kind:op.kind,...(op.kind==='gain'?{value:op.value}:{})});
    }).finally(()=>{inFlight=null;pump();});
  }
  return {
    setGeneration(value){if(value===generation)return;generation=value;epoch++;ordinal=0;gain=reset=null;if(timer!==null){clearTimer(timer);timer=null;}pump();},
    gain(value){if(generation===null){report('Master is unavailable.',{error:true});return false;}if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>4){report('Master gain must be between 0 and 4.',{error:true});return false;}const n=nextOrdinal();if(n===null)return false;gain={kind:'gain',value,generation,ordinal:n};report('Master gain pending admission.',{pending:true,value,ordinal:n,kind:'gain'});pump();return true;},
    reset(){if(generation===null){report('Master is unavailable.',{error:true});return false;}if(reset||inFlight?.kind==='reset'&&inFlight.generation===generation){report('Digital overload reset already pending.',{error:true});return false;}const n=nextOrdinal();if(n===null)return false;reset={kind:'reset',generation,ordinal:n};report('Digital overload reset pending admission.',{pending:true,ordinal:n,kind:'reset'});pump();return true;},
    dispose(){generation=null;epoch++;gain=reset=null;if(timer!==null){clearTimer(timer);timer=null;}}
  };
}
