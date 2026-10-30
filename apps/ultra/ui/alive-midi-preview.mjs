// The native owner supplies sound, timing and expiry. This producer only
// coalesces gestures and releases the exact token returned by native ingress.
export function createMidiPreview({invoke,onError=()=>{}}){
  let scope=null,on=false,desired=null,current=null,busy=false,disposed=false;
  const key=value=>JSON.stringify([value?.generation,value?.preparationRevision,value?.trackId,value?.sourceId,value?.pitch,value?.velocity]);
  async function pump(){
    if(busy)return;busy=true;
    try{
      while(desired||current){
        if(desired&&current&&key(desired)===key(current))break;
        if(desired){
          const request=desired;
          try{const result=await invoke('alive_midi_preview',{...request,action:'note'});current={...request,serial:result.serial};}
          catch(error){if(desired===request)desired=null;if(!disposed)onError(error);}
        }else{
          const release=current;current=null;
          try{await invoke('alive_midi_preview',{generation:release.generation,preparationRevision:release.preparationRevision,action:'release',serial:release.serial});}
          catch(error){if(!disposed&&scope?.generation===release.generation&&scope?.preparationRevision===release.preparationRevision)onError(error);}
        }
      }
    }finally{busy=false;}
  }
  function release(){desired=null;void pump();}
  return{
    configure(value){if(key(value)!==key(scope)||!value.available)release();scope=value;},
    enabled(value){if(value===undefined)return on;on=!!value;if(!on)release();return on;},
    note({pitch,velocity=100}){if(disposed||!on||!scope?.available||!invoke||!Number.isInteger(pitch)||pitch<0||pitch>127)return;desired={...scope,pitch,velocity};delete desired.available;void pump();},
    release,
    dispose(){disposed=true;on=false;release();}
  };
}
