// The menu and shortcut labels share this inventory; command execution stays
// with the existing control that owns each operation.
export const COMMANDS=[
  {menu:'Edit',label:'Undo',target:'undo',help:'Undo the last supported edit.'},
  {menu:'Edit',label:'Redo',target:'redo',help:'Redo the last supported edit.'},
  {menu:'Create',label:'Insert Audio Track',target:'insert-audio-track',shortcut:'Ctrl+T',help:'Insert an audio track after the selected track.'},
  {menu:'Create',label:'Insert MIDI Track',target:'insert-midi-track',shortcut:'Ctrl+Shift+T',help:'Insert a MIDI track after the selected track.'},
  {menu:'Create',label:'Open instrument...',target:'add-track',help:'Choose a saved Ultra instrument in the native file picker.'},
  {menu:'Create',label:'Open effect...',target:'add-effect',help:'Choose a saved Ultra effect for the selected track.'},
  {menu:'Playback',label:'Start',target:'start',shortcut:'Space',shortcutTarget:'toggle-transport',help:'Start transport playback. Space toggles playback.'},
  {menu:'Playback',label:'Stop',target:'stop',help:'Stop transport playback.'},
  {menu:'Playback',label:'Loop',target:'loop',help:'Toggle the transport loop.'},
  {menu:'Playback',label:'Return all to Arrangement',target:'return-all',help:'Return all tracks to Arrangement when the native session supports it.'},
  {menu:'View',label:'Toggle Browser',target:'toggle-browser',help:'Show or hide the Browser.'},
  {menu:'View',label:'Toggle Clip',target:'detail-clip',help:'Show or hide the Clip editor.'},
  {menu:'View',label:'Toggle Devices',target:'detail-devices',help:'Show or hide the Device editor.'},
  {menu:'Navigate',label:'Focus Session',target:'view-session',focus:'session-workspace',help:'Switch to and focus Session.'},
  {menu:'Navigate',label:'Focus Arrangement',target:'view-arrangement',focus:'arrangement-workspace',help:'Switch to and focus Arrangement.'},
  {menu:'Options',label:'Audio settings',target:'show-audio',help:'Open the native audio settings.'},
  {menu:'Help',label:'Toggle contextual Help',target:'toggle-help',shortcut:'?',help:'Show or hide contextual Help. Point to a control for its description.'},
  {menu:'File',label:'New',target:'new',help:'Create an Alive session.'},
  {menu:'File',label:'Open...',target:'open',help:'Open an Alive session.'},
  {menu:'File',label:'Save',target:'save',shortcut:'Ctrl+S',help:'Save the current session.'},
  {menu:'File',label:'Save As...',target:'save-as',shortcut:'Ctrl+Shift+S',help:'Save the current session under another name.'},
  {menu:'File',label:'Quit',target:'quit',help:'Quit Alive.'},
  {label:'Create MIDI clip',target:'create-midi-clip',shortcut:'Ctrl+Shift+M',help:'Create a MIDI clip in the current supported context.'},
];
const NATIVE_TARGETS=new Set(['new','open','save','save-as','quit','undo','redo','insert-audio-track','insert-midi-track','add-track','add-effect','start','stop','loop','return-all','show-audio']);

export function shortcutCommand(event,{native=true}={}){
  if(event.defaultPrevented||event.repeat||event.altKey||event.target?.isContentEditable||event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return null;
  const mod=(event.ctrlKey||event.metaKey),key=event.key?.toLowerCase();
  // Browser and OS command chords remain owned by the browser in preview.
  if(mod&&!native)return null;
  const chord=mod?'Ctrl+'+(event.shiftKey?'Shift+':'')+key?.toUpperCase():event.code==='Space'&&!event.shiftKey?'Space':event.key==='?'?'?':null;
  const command=COMMANDS.find(item=>item.shortcut===chord);
  if(chord==='Space'&&event.target?.closest?.('button,summary,a,[role]'))return null;
  return command?.shortcutTarget??command?.target??null;
}

export function mountCommandMenus({doc,park=()=>{},native=true}){
  const nav=doc.getElementById('application-menus');if(!nav)return{dispose(){}};
  const file=doc.getElementById('file-menu'),menus=[file].filter(Boolean),rows=[];
  const save=doc.getElementById('save');
  const fileSurface=file?.querySelector?.('.file-menu-items');
  if(!native)for(const id of NATIVE_TARGETS){const target=doc.getElementById(id);if(target){target.disabled=true;target.setAttribute('data-native-unavailable','');target.setAttribute('data-help','Available in the native Alive app.');target.title='Available in the native Alive app.';}}
  for(const command of COMMANDS.filter(c=>c.menu==='File')){
    const target=doc.getElementById(command.target);if(native)target?.setAttribute('data-help',command.help+(command.shortcut?' ('+command.shortcut+').':''));
  }
  if(fileSurface){
    const command=COMMANDS.find(c=>c.target==='save'),button=doc.createElement('button');
    button.type='button';button.textContent=command.label;button.setAttribute('aria-label',command.label);button.setAttribute('data-help',command.help+(native?' ('+command.shortcut+').':''));
    if(native){const key=doc.createElement('kbd');key.textContent=command.shortcut;button.append(key);}
    button.addEventListener('pointerdown',park);button.addEventListener('click',()=>{file.open=false;save.click();file.querySelector('summary')?.focus();});
    fileSurface.insertBefore(button,doc.getElementById('save-as'));rows.push({button,command});
  }
  for(const group of ['Edit','Create','Playback','View','Navigate','Options','Help']){
    const details=doc.createElement('details'),summary=doc.createElement('summary'),surface=doc.createElement('div');
    details.className='app-menu';summary.textContent=group;summary.setAttribute('role','button');summary.setAttribute('aria-label',group+' menu');
    surface.className='app-menu-items ui-menu-surface';details.append(summary,surface);nav.insertBefore(details,save);menus.push(details);
    for(const command of COMMANDS.filter(c=>c.menu===group)){
      const button=doc.createElement('button');button.type='button';button.textContent=command.label;
      button.setAttribute('aria-label',command.label);
      button.setAttribute('data-help',command.help+(command.shortcut&&(!command.shortcut.startsWith('Ctrl+')||native)?' ('+command.shortcut+').':''));button.title=command.help;
      if(command.shortcut&&(!command.shortcut.startsWith('Ctrl+')||native)){button.setAttribute('aria-label',command.label);const key=doc.createElement('kbd');key.textContent=command.shortcut;button.append(key);}
      button.addEventListener('pointerdown',park);
      button.addEventListener('click',()=>{const target=doc.getElementById(command.target);if(!target||target.disabled)return;details.open=false;target.click();if(command.focus)doc.getElementById(command.focus)?.focus();else summary.focus();});
      surface.append(button);rows.push({button,command});
    }
  }
  file?.classList.add('app-menu');file?.querySelector?.('.file-menu-items')?.classList.add('app-menu-items');
  function update(){
    for(const {button,command}of rows){
      const target=doc.getElementById(command.target);button.disabled=!target||!!target.disabled;
      if(!native&&NATIVE_TARGETS.has(command.target)){button.setAttribute('data-help','Available in the native Alive app.');button.title='Available in the native Alive app.';}
      const state=target?.type==='checkbox'?String(target.checked):target?.getAttribute('aria-pressed')??target?.getAttribute('aria-expanded');
      if(state!==null&&state!==undefined)button.setAttribute('aria-pressed',state);
    }
  }
  for(const details of menus){
    const summary=details.querySelector('summary');summary?.setAttribute('aria-expanded','false');summary?.addEventListener('pointerdown',park);
    details.addEventListener('toggle',()=>{summary?.setAttribute('aria-expanded',String(details.open));if(!details.open)return;for(const other of menus)if(other!==details)other.open=false;update();});
  }
  function keydown(event){
    const details=menus.find(menu=>menu.open&&menu.contains(event.target));if(!details)return;
    const summary=details.querySelector('summary');
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();details.open=false;summary.focus();return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const buttons=Array.from(details.querySelectorAll('button')).filter(button=>!button.disabled);if(!buttons.length)return;
    event.preventDefault();const index=buttons.indexOf(doc.activeElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowDown'?(index+1)%buttons.length:(index<=0?buttons.length-1:index-1);buttons[next].focus();
  }
  function pointerdown(event){for(const menu of menus)if(menu.open&&!menu.contains(event.target))menu.open=false;}
  function focusin(event){for(const menu of menus)if(menu.open&&!menu.contains(event.target))menu.open=false;}
  doc.addEventListener('keydown',keydown,true);doc.addEventListener('pointerdown',pointerdown,true);doc.addEventListener('focusin',focusin,true);
  return{update,dispose(){doc.removeEventListener('keydown',keydown,true);doc.removeEventListener('pointerdown',pointerdown,true);doc.removeEventListener('focusin',focusin,true);}};
}
