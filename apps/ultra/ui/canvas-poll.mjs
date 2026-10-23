import {printPopupText} from './canvas-print-ui.mjs';

export function canvasRenderKey({status={},printPopups={},...state}) {
  const {frames,output,...audio}=status;
  const {callbacks,...device}=output??{};
  return JSON.stringify({...state,status:{...audio,...(output?{output:device}:{})},
    printPopups:Object.fromEntries(Object.entries(printPopups).map(([id,value])=>[id,printPopupText(value)]))});
}

export function createCanvasPoller({poll,hidden=()=>false,setTimeout,clearTimeout}) {
  let active=false,timer=null,running=false,refresh=false;
  function schedule(delay=hidden()?1000:100) {
    if(timer!==null)clearTimeout(timer);
    timer=active?setTimeout(tick,delay):null;
  }
  async function tick() {
    timer=null;
    if(!active||running)return;
    running=true;
    try{await poll();}
    finally{running=false;if(active)schedule(refresh?0:undefined);refresh=false;}
  }
  return {
    start(){active=true;schedule();},
    stop(){active=false;refresh=false;if(timer!==null)clearTimeout(timer);timer=null;},
    visibilityChanged(){if(!active)return;if(running){refresh=!hidden();return;}schedule(hidden()?1000:0);},
  };
}
