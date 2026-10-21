import {analyzeMaxPatch,importMaxPatcher} from './canvas-max-import.mjs';

export function mountMaxImportDialog({doc}) {
  const $=id=>doc.querySelector('#'+id),make=(tag,text)=>{const element=doc.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
  let source=null,analysis=null,sourceName='';
  function reset(opening=true){
    source=null;analysis=null;sourceName='';$('patch-dialog').classList.remove('max-mode');$('max-import').hidden=true;$('max-patcher').replaceChildren();$('max-diagnostics').replaceChildren();
    $('max-allow-partial').checked=false;$('analyze-max').hidden=!opening;$('import-patch').textContent='Import JSON';$('import-patch').disabled=false;
  }
  function report(){return analysis?.patchers.find(patcher=>patcher.id===$('max-patcher').value);}
  function update(){
    const selected=report();if(!selected)return;
    const stats=selected.stats;
    $('max-summary').textContent=`${selected.complete?'Compatible selection':selected.importable?'Partial selection':'Cannot import this selection'}: ${stats.importedBoxes} objects, ${stats.importedEdges} ${stats.importedEdges===1?'cable':'cables'}. ${stats.omittedBoxes} objects and ${stats.omittedEdges} cables omitted; ${stats.decorations} comments omitted.`;
    $('max-diagnostics').replaceChildren(...selected.diagnostics.map(item=>{
      const entry=make('li',`${item.boxId?item.boxId+': ':item.edgeIndex!==undefined?'Cable '+(item.edgeIndex+1)+': ':''}${item.message}`);entry.dataset.severity=item.severity;return entry;
    }));
    $('max-partial-field').hidden=!selected.requiresPartial;
    $('import-patch').textContent=selected.requiresPartial?'Import supported portion':'Import selected patcher';
    $('import-patch').disabled=!selected.importable||(selected.requiresPartial&&!$('max-allow-partial').checked);
    $('dialog-status').textContent='Review the selected patcher and its compatibility report before importing. The current patch stays open until you import.';
  }
  function inspect(text,name='Pasted Max JSON'){
    const next=analyzeMaxPatch(text,{sourceName:name});source=text;analysis=next;sourceName=name;
    $('max-patcher').replaceChildren(...analysis.patchers.map(patcher=>{
      const option=make('option',`${patcher.path.length?'  '.repeat(patcher.path.length):''}${patcher.name} - ${patcher.complete?'compatible':patcher.importable?'partial':'unsupported'} (${patcher.boxCount} boxes)`);option.value=patcher.id;return option;
    }));
    const preferred=analysis.patchers.find(patcher=>patcher.name==='basic'&&patcher.importable)||analysis.patchers.find(patcher=>patcher.complete)||analysis.patchers.find(patcher=>patcher.importable)||analysis.patchers[0];
    $('max-patcher').value=preferred.id;$('max-allow-partial').checked=false;$('patch-dialog').classList.add('max-mode');$('max-import').hidden=false;update();
  }
  $('max-patcher').addEventListener('change',()=>{$('max-allow-partial').checked=false;update();});
  $('max-allow-partial').addEventListener('change',update);
  $('patch-json').addEventListener('input',()=>{if(analysis)reset();});
  $('analyze-max').addEventListener('click',()=>{try{inspect($('patch-json').value);}catch(error){reset();$('dialog-status').textContent=error.message;}});
  return {reset,inspect,hasSelection:()=>!!analysis,importSelected(){
    if(!analysis)throw Error('Inspect a Max file first.');
    const result=importMaxPatcher(source,{sourceName,patcherId:$('max-patcher').value,allowPartial:$('max-allow-partial').checked});
    if(!result.patch)throw Error(result.importable?'Select Allow partial import to accept the listed omissions and differences.':'This selection cannot be imported. Choose a compatible patcher.');
    return result;
  }};
}
