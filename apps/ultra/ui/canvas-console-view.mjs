import {treeNodes} from './canvas-hierarchy.mjs';

export function mountConsole({doc,controller,select}) {
  const $=id=>doc.querySelector('#'+id);
  let open=false,current=null,identity='';
  function render(state) {
    current=state;
    const records=state.console||[],errors=records.filter(row=>row.level===2).length;
    $('show-console').setAttribute('aria-pressed',String(open));
    $('show-console').title=`Console (Ctrl M)${errors?` - ${errors} errors`:''}`;
    $('console-count').textContent=String(records.length);
    $('console-count').hidden=records.length===0;
    $('patch-console').hidden=!open;
    if(!open)return;
    const filter=$('console-level').value||'all',query=$('console-search').value.toLowerCase();
    const ids=new Set(treeNodes(state.document??state.patch).map(node=>node.id));
    const key=JSON.stringify([records.at(-1)?.sequence,records.length,state.revision,state.consoleDropped,filter,query,state.native,[...ids]]);
    if(key===identity)return;identity=key;
    const matching=records.filter(row=>(filter==='all'||row.level===Number(filter))&&`${row.label} ${row.text}`.toLowerCase().includes(query));
    const area=$('console-rows'),follow=area.scrollHeight-area.scrollTop-area.clientHeight<28;
    const rows=matching.map(record=>{
      const row=doc.createElement('div');row.className=`console-row console-level-${record.level}`;
      const source=doc.createElement('button');source.className='console-source';source.textContent=`${record.label}:`;
      source.title=`Select object ${record.node}, graph ${record.revision}`;
      source.disabled=record.revision!==state.revision||!ids.has(record.node);
      source.addEventListener('click',()=>{if(record.revision===current.revision&&treeNodes(current.document??current.patch).some(node=>node.id===record.node))select({node:record.node,revision:record.revision});});
      const text=doc.createElement('p');text.className='console-message';text.textContent=record.text;
      row.append(source,text);return row;
    });
    if(!rows.length){const empty=doc.createElement('p');empty.className='console-empty';empty.textContent=!state.native?'The native app prints messages here. Browser preview does not execute patches.':records.length?'No messages match this filter.':'Connect an outlet to print to see messages here. Audio can stay off.';rows.push(empty);}
    area.replaceChildren(...rows);
    if(follow)area.scrollTop=area.scrollHeight;
    $('console-status').textContent=`${matching.length} / ${records.length} messages${state.consoleDropped?` - ${state.consoleDropped} dropped while the native queue was full`:''}. Latest 512 retained.`;
  }
  const toggle=()=>{open=!open;identity='';if(current)render(current);if(!open)$('workspace').focus();};
  $('show-console').addEventListener('click',toggle);
  $('close-console').addEventListener('click',()=>{open=false;if(current)render(current);$('show-console').focus();});
  $('clear-console').addEventListener('click',()=>controller.clearConsole());
  for(const id of ['console-level','console-search'])$(id).addEventListener(id==='console-search'?'input':'change',()=>{if(current)render(current);});
  return {render,toggle,open:()=>{open=true;identity='';if(current)render(current);}};
}
