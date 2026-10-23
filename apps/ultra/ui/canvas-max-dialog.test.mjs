import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {mountMaxImportDialog} from './canvas-max-dialog.mjs';

const source=readFileSync(new URL('../tests/fixtures/help-shell.maxpat',import.meta.url),'utf8');
const identity={status:'recognized',adapter:'max-help-four-v1',object:'append',sourceSha256:'d4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729'};
function mount(invoke){
  const elements=new Map();
  const make=()=>({value:'',checked:false,disabled:false,hidden:false,open:true,textContent:'',dataset:{},children:[],listeners:{},classList:{add(){},remove(){}},
    replaceChildren(...items){this.children=items;},addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);},async fire(name){for(const fn of this.listeners[name]??[])await fn();}});
  const doc={querySelector(name){if(!elements.has(name)){
    const element=make();
    if(name==='#patch-json'){let value='';Object.defineProperty(element,'value',{get:()=>value,set:text=>{value=String(text).replace(/\r\n?/g,'\n');}});}
    elements.set(name,element);
  }return elements.get(name);},createElement:make};
  const dialog=mountMaxImportDialog({doc,invoke});return{...dialog,get:id=>doc.querySelector('#'+id)};
}
test('native recognition prefers the complete root and import uses that exact probed source',async()=>{
  const p=mount(async(name,args)=>{assert.equal(name,'help_shell_probe');assert.equal(args.source,source);return identity;});
  p.get('patch-json').value=source;await p.inspect(source,'original-synthetic.maxpat');
  assert.equal(p.get('max-patcher').value,'root');assert.equal(p.importSelected().patch.helpShell.object,'append');
  p.get('max-patcher').value='root/basic';await p.get('max-patcher').fire('change');
  p.get('max-allow-partial').checked=true;assert.equal(p.importSelected().patch.helpShell,undefined);
});
test('editing, closing and newer inspection invalidate late native probe replies',async()=>{
  for(const action of ['edit','close','replace']){
    const replies=[],p=mount(()=>new Promise(resolve=>replies.push(resolve)));
    p.get('patch-json').value=source;const first=p.inspect(source);assert.equal(p.get('import-patch').disabled,true);
    let second;
    if(action==='edit'){p.get('patch-json').value='changed';await p.get('patch-json').fire('input');}
    if(action==='close')await p.get('patch-dialog').fire('close');
    if(action==='replace'){p.get('patch-json').value=source+' ';second=p.inspect(source+' ');}
    replies[0](identity);await first;
    assert.equal(p.hasSelection(),false,action);
    if(second){replies[1]({status:'unrecognized'});await second;assert.equal(p.get('max-patcher').value,'root/basic');}
  }
});
test('browser import keeps ordinary helper diagnostics and cannot infer native recognition',async()=>{
  const p=mount();p.get('patch-json').value=source;await p.inspect(source);
  assert.equal(p.get('max-patcher').value,'root/basic');p.get('max-allow-partial').checked=true;
  assert.equal(p.importSelected().patch.helpShell,undefined);
});

const bytes=text=>new TextEncoder().encode(text).buffer;
const file=text=>({name:'original.maxpat',size:bytes(text).byteLength,arrayBuffer:async()=>bytes(text)});
test('CRLF textarea normalization preserves exact probed source through final import',async()=>{
  const original=source.replace(/\r?\n/g,'\r\n');
  const p=mount(async(name,args)=>{assert.equal(args.source,original);return identity;});
  await p.inspect(original);
  assert.equal(p.get('patch-json').value,source);
  assert.equal(p.get('import-patch').disabled,false);
  assert.equal(p.importSelected().patch.helpShell.object,'append');
});
test('file reads are invalidated by edits, close, reset, new files and new inspections',async()=>{
  for(const action of ['edit','close','reset','file','inspect']){
    const calls=[],p=mount(async(name,args)=>{calls.push(args.source);return identity;});
    let resolve;
    const pending=p.inspectFile({name:'old.maxpat',size:source.length,arrayBuffer:()=>new Promise(done=>{resolve=done;})});
    assert.equal(p.get('import-patch').disabled,true);
    if(action==='edit'){p.get('patch-json').value='new draft';await p.get('patch-json').fire('input');}
    if(action==='close')await p.get('patch-dialog').fire('close');
    if(action==='reset')p.reset();
    if(action==='file')await p.inspectFile(file(source+' '));
    if(action==='inspect')await p.inspect(source+' ');
    const before={value:p.get('patch-json').value,status:p.get('dialog-status').textContent,selected:p.hasSelection()};
    resolve(bytes(source));assert.equal(await pending,false,action);
    assert.deepEqual({value:p.get('patch-json').value,status:p.get('dialog-status').textContent,selected:p.hasSelection()},before,action);
    assert.deepEqual(calls,['file','inspect'].includes(action)?[source+' ']:[],action);
  }
});
test('late file failures cannot replace a newer inspection or its status',async()=>{
  const p=mount(async()=>identity);let reject;
  const pending=p.inspectFile({size:1,arrayBuffer:()=>new Promise((_,fail)=>{reject=fail;})});
  await p.inspect(source);const status=p.get('dialog-status').textContent;
  reject(Error('old read failed'));
  assert.equal(await pending,false);assert.equal(p.get('dialog-status').textContent,status);
  assert.equal(p.importSelected().patch.helpShell.object,'append');
});
test('file inspection stages Max and ordinary Ultra JSON and reports current failures',async()=>{
  const p=mount(async()=>identity);
  assert.equal(await p.inspectFile(file(source)),true);
  assert.equal(p.importSelected().patch.helpShell.object,'append');
  const ordinary=JSON.stringify({version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]});
  assert.equal(await p.inspectFile(file(ordinary)),true);
  assert.equal(p.hasSelection(),false);assert.equal(p.get('patch-json').value,ordinary);
  assert.equal(p.get('import-patch').disabled,false);
  await assert.rejects(p.inspectFile(file('broken')),/valid JSON/);
  assert.match(p.get('dialog-status').textContent,/valid JSON/);
  assert.equal(p.get('import-patch').disabled,false);
});
