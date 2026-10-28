export function createFocusedDrafts({onCancel=()=>{}}={}){
  const pending=new Set();let serial=0;
  function watch(input,isDirty=()=>true){
    const commit=input.commitDraft,cancel=input.cancelDraft;
    input.commitDraft=()=>{const accepted=commit();if(accepted!==false&&pending.delete(input))serial++;return accepted;};
    input.cancelDraft=()=>{cancel();if(pending.delete(input))onCancel();};
    input.addEventListener('input',()=>{if(isDirty())pending.add(input);});
  }
  function commitWhere(predicate=()=>true){
    for(const input of [...pending]){
      if(!predicate(input))continue;
      if(input.commitDraft()===false){input.focus();return false;}
    }
    return true;
  }
  return{watch,add:input=>pending.add(input),forget:input=>pending.delete(input),commitWhere,clear:()=>pending.clear(),get serial(){return serial;}};
}
