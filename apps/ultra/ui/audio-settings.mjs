// Native device discovery and configuration only; no browser audio simulation.
export function mountAudioSettings({document:doc,invoke,controller}) {
  const $=id=>doc.querySelector('#'+id);
  let busy=false,loaded=false,generation=0;
  const option=(value,label,disabled=false)=>{const e=doc.createElement('option');e.value=value;e.textContent=label;e.disabled=disabled;return e;};
  function notice(text,error=false){$('audio-settings-notice').textContent=text;$('audio-settings-notice').classList.toggle('error',error);}
  function duration(){const n=Number($('audio-buffer').value);$('audio-buffer-duration').textContent=n>0?`Requested buffer duration: ${(n/48).toFixed(2)} ms at 48 kHz.`:'Automatic lets the audio system choose a buffer size.';}
  function update(state=controller.getState()) {
    const running=!!state.status.running,output=state.status.output,blocked=!invoke||busy||state.busy||running;
    for(const id of ['audio-host','audio-device','audio-buffer','audio-refresh'])$(id).disabled=blocked;
    for(const id of ['audio-save','audio-start-configured'])$(id).disabled=blocked||!loaded;
    $('audio-stop-configured').hidden=!running&&!state.faulted;
    $('audio-stop-configured').disabled=!invoke||busy||state.busy;
    $('audio-live-state').textContent=state.faulted?'Stopped after a fault':running?'Running':'Audio off';
    $('audio-live-device').textContent=running&&output?`${output.device} (${output.host})`:'Not started';
    const frames=output?.observed_buffer_frames;
    $('audio-live-buffer').textContent=running&&frames?`${frames} frames / ${(frames/48).toFixed(2)} ms`:'Waiting for audio';
    $('audio-live-errors').textContent=String(output?.stream_errors??0);
    if(running)notice('Audio is running. Stop audio before changing settings.');
    else if(output?.failed)notice(output.message,true);
  }
  async function load(selectedHost) {
    if(!invoke){notice('Audio devices are available in the native Ultra app.');update();return;}
    const request=++generation;busy=true;notice('Looking for audio outputs...');update();
    try{
      const catalog=await invoke('audio_devices',selectedHost===undefined?{}:{host:selectedHost});
      if(request!==generation)return;
      const config=catalog.config,host=selectedHost??config.host,device=selectedHost===undefined?config.device:'default';
      $('audio-host').replaceChildren(option('default','System default'),...catalog.hosts.map(h=>option(h,h)));
      if(host!=='default'&&!catalog.hosts.includes(host))$('audio-host').append(option(host,`${host} (unavailable)`,true));
      $('audio-host').value=host;
      $('audio-host-detail').textContent=`Rust / CPAL - ${catalog.effective_host}`;
      $('audio-device').replaceChildren(...catalog.devices.map(d=>option(d.id,d.compatible?d.name:`${d.name} (48 kHz stereo unavailable)`,!d.compatible)));
      const present=catalog.devices.some(d=>d.id===device&&d.compatible);
      if(!present)$('audio-device').append(option(device,'Selected output unavailable - choose another',true));
      $('audio-device').value=device;
      if(selectedHost===undefined)$('audio-buffer').value=config.buffer_frames===null?'auto':String(config.buffer_frames);
      loaded=catalog.devices.some(d=>d.compatible);duration();
      notice(!loaded?'No compatible stereo outputs found. Connect an output and refresh devices.':!present?'Choose an available output before saving.':catalog.notice||'Choose an output and save settings.',!present);
    }catch(error){loaded=false;notice(String(error?.message||error),true);}
    finally{if(request===generation){busy=false;update();}}
  }
  async function save(start=false) {
    if(!invoke||busy||controller.getState().status.running)return;
    busy=true;notice('Saving audio settings...');update();
    try{
      await invoke('audio_configure',{config:{host:$('audio-host').value,device:$('audio-device').value,sample_rate:48000,buffer_frames:$('audio-buffer').value==='auto'?null:Number($('audio-buffer').value)}});
      if(start){await controller.startAudio();const state=controller.getState();notice(state.status.running?'Audio is running.':state.notice,!state.status.running);}
      else{await controller.poll();notice('Audio settings saved. Audio stays off until you start it.');}
    }catch(error){notice(String(error?.message||error),true);}
    finally{busy=false;update();}
  }
  $('audio-host').addEventListener('change',()=>load($('audio-host').value));
  $('audio-buffer').addEventListener('change',duration);
  $('audio-refresh').addEventListener('click',()=>load($('audio-host').value));
  $('audio-save').addEventListener('click',()=>save(false));
  $('audio-start-configured').addEventListener('click',()=>save(true));
  $('audio-stop-configured').addEventListener('click',async()=>{await controller.stopAudio();notice('Audio is off. You can edit the settings.');update();});
  update();
  return{open:()=>load(),update};
}
