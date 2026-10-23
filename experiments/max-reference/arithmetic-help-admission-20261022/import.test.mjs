import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const script=new URL('./import.mjs',import.meta.url);
const run=(...args)=>spawnSync(process.execPath,[script.pathname,...args],{encoding:'utf8'});
async function temporary(callback){
  const directory=await mkdtemp(join(tmpdir(),'ultra-arithmetic-help-'));
  try{await callback(directory);}finally{await rm(directory,{recursive:true,force:true});}
}

test('arithmetic intake refuses legacy names, symbols and path input before reading resources',()=>{
  for(const object of ['append','int','*','+','-','../times','unknown']){
    const result=run('/missing-resources',object,'/missing-output');
    assert.equal(result.status,1);
    assert.match(result.stderr,/Choose times, plus or minus/);
    assert.equal(result.stdout,'');
  }
});

test('safe arithmetic names use only their fixed source routes and reject changed bytes',async()=>temporary(async directory=>{
  await mkdir(join(directory,'help/max'),{recursive:true});
  for(const object of ['times','plus','minus']){
    await writeFile(join(directory,'help/max',object+'.maxhelp'),'original synthetic unrecognized source');
    const result=run(directory,object,join(directory,'output-'+object));
    assert.equal(result.status,1);
    assert.match(result.stderr,new RegExp('Resource identity mismatch: help/max/'+object+'\\.maxhelp'));
    assert.equal(result.stdout,'');
  }
}));

test('CLI refuses missing or extra arguments without any import output',()=>{
  for(const args of [[],['one'],['one','two'],['one','two','three','four']]){
    const result=run(...args);
    assert.equal(result.status,1);
    assert.match(result.stderr,/Usage: node import\.mjs/);
    assert.equal(result.stdout,'');
  }
});
