const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ctx=vm.createContext({jsarguments:['v8','private','int',1]});
const file=path.join(__dirname,'v8-readback.js');
if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
assert.equal(typeof ctx.numericValue,'function','numeric getter capability absent');
for(const raw of [0,7,-3.25,[0],[7]]){
 const got=ctx.numericValue({getvalueof:()=>raw},'flonum');
 assert.equal(got.value,Array.isArray(raw)?raw[0]:raw);
 assert.equal(got.semantic_tag,'float');
}
for(const raw of [null,undefined,true,'0',[],[0,1],NaN,Infinity]){
 assert.throws(()=>ctx.numericValue({getvalueof:()=>raw},'number'));
}
assert.throws(()=>ctx.numericValue({getvalueof:()=>3.25},'number'));
console.log('reader: strict getter representations, class semantic tags and malformed refusal pass');
