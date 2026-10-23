import {analyzeMaxPatch,importMaxPatcher,readPatchFile} from './canvas-max-import.mjs';
import {probeHelpShell} from './canvas-help-shell.mjs';
import {parsePatch} from './canvas-model.mjs';

export function mountMaxImportDialog({doc,invoke}) {
  const $=id=>doc.querySelector('#'+id),make=(tag,text)=>{const element=doc.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
  let source=null,displayedSource=null,analysis=null,sourceName='',recognition=null,epoch=0,pending=false;
  function reset(opening=true){
    epoch++;pending=false;source=null;displayedSource=null;analysis=null;sourceName='';recognition=null;$('patch-dialog').classList.remove('max-mode');$('max-import').hidden=true;$('max-patcher').replaceChildren();$('max-diagnostics').replaceChildren();
    $('max-allow-partial').checked=false;$('analyze-max').hidden=!opening;$('import-patch').textContent='Import JSON';$('import-patch').disabled=false;
  }
  function report(){return analysis?.patchers.find(patcher=>patcher.id===$('max-patcher').value);}
  function update(){
    const selected=report();if(!selected)return;
    const stats=selected.stats;
    $('max-summary').textContent=`${selected.helpShell?'Help shell retained':selected.complete?'Compatible selection':selected.importable?'Partial selection':'Cannot import this selection'}: ${stats.importedBoxes} objects, ${stats.importedEdges} ${stats.importedEdges===1?'cable':'cables'}. ${stats.omittedBoxes} objects and ${stats.omittedEdges} cables omitted; ${stats.decorations} comments omitted.`;
    $('max-diagnostics').replaceChildren(...selected.diagnostics.map(item=>{
      const entry=make('li',`${item.boxId?item.boxId+': ':item.edgeIndex!==undefined?'Cable '+(item.edgeIndex+1)+': ':''}${item.message}`);entry.dataset.severity=item.severity;return entry;
    }));
    $('max-partial-field').hidden=!selected.requiresPartial;
    $('import-patch').textContent=selected.requiresPartial?'Import supported portion':'Import selected patcher';
    $('import-patch').disabled=!selected.importable||(selected.requiresPartial&&!$('max-allow-partial').checked);
    $('dialog-status').textContent='Review the selected patcher and its compatibility report before importing. The current patch stays open until you import.';
  }
  async function inspect(text,name='Pasted Max JSON'){
    reset();const request=epoch;pending=true;source=text;sourceName=name;
    $('patch-json').value=text;
    // Textareas normalize line endings; provenance continues to use the original source.
    const displayed=$('patch-json').value;displayedSource=displayed;
    $('import-patch').disabled=true;$('dialog-status').textContent='Inspecting patch and local help resources...';
    let identity,next;
    try{
      identity=await probeHelpShell(text,invoke);
      if(request!==epoch||$('patch-json').value!==displayed)return false;
      next=analyzeMaxPatch(text,{sourceName:name,helpShell:identity});
    }catch(error){
      if(request!==epoch||$('patch-json').value!==displayed)return false;
      reset();$('dialog-status').textContent=error.message;throw error;
    }
    pending=false;recognition=identity;analysis=next;
    $('max-patcher').replaceChildren(...analysis.patchers.map(patcher=>{
      const option=make('option',`${patcher.path.length?'  '.repeat(patcher.path.length):''}${patcher.name} - ${patcher.complete?'compatible':patcher.importable?'partial':'unsupported'} (${patcher.boxCount} boxes)`);option.value=patcher.id;return option;
    }));
    const preferred=analysis.patchers.find(patcher=>patcher.id==='root'&&patcher.helpShell&&patcher.importable)||analysis.patchers.find(patcher=>patcher.name==='basic'&&patcher.importable)||analysis.patchers.find(patcher=>patcher.complete)||analysis.patchers.find(patcher=>patcher.importable)||analysis.patchers[0];
    $('max-patcher').value=preferred.id;$('max-allow-partial').checked=false;$('patch-dialog').classList.add('max-mode');$('max-import').hidden=false;update();return true;
  }
  async function inspectFile(file){
    reset();const request=epoch,displayed=$('patch-json').value;pending=true;
    $('import-patch').disabled=true;$('dialog-status').textContent='Reading patch file...';
    try{
      const text=await readPatchFile(file);
      if(request!==epoch||$('patch-json').value!==displayed)return false;
      const json=text.replace(/^\uFEFF/,'');let input;
      try{input=JSON.parse(json);}catch{throw Error('Patch is not valid JSON.');}
      if(input&&typeof input==='object'&&Object.hasOwn(input,'patcher'))return inspect(text,file.name);
      parsePatch(json);pending=false;$('patch-json').value=json;$('import-patch').disabled=false;
      $('dialog-status').textContent='File validated. Choose Import JSON to replace the patch.';return true;
    }catch(error){
      if(request!==epoch||$('patch-json').value!==displayed)return false;
      reset();$('dialog-status').textContent=error.message;throw error;
    }
  }
  $('max-patcher').addEventListener('change',()=>{$('max-allow-partial').checked=false;update();});
  $('max-allow-partial').addEventListener('change',update);
  $('patch-json').addEventListener('input',()=>{if(analysis||pending)reset();});
  for(const event of ['close','cancel'])$('patch-dialog').addEventListener(event,()=>reset(false));
  $('analyze-max').addEventListener('click',async()=>{try{await inspect($('patch-json').value);}catch(error){reset();$('dialog-status').textContent=error.message;}});
  return {reset,inspect,inspectFile,hasSelection:()=>!!analysis,importSelected(){
    if(!analysis||pending||$('patch-json').value!==displayedSource)throw Error('Inspect the current Max source first.');
    const result=importMaxPatcher(source,{sourceName,patcherId:$('max-patcher').value,allowPartial:$('max-allow-partial').checked,helpShell:recognition});
    if(!result.patch)throw Error(result.importable?'Select Allow partial import to accept the listed omissions and differences.':'This selection cannot be imported. Choose a compatible patcher.');
    return result;
  }};
}
