import test from 'node:test';
import assert from 'node:assert/strict';
import {compileViewExpression} from './live-view-expression.mjs';

test('evaluates the bounded Live view expression grammar with named inputs',()=>{
 const resolve=name=>({'Shape':2,'LFO':1,'Envelope[0].Loop':2}[name]);
 assert.equal(compileViewExpression('Shape == 2 & LFO ? KEnabled : KIrrelevant')(resolve),1);
 assert.equal(compileViewExpression('Envelope[0].Loop > 0 & Envelope[0].Loop < 3 ? KIrrelevant : KEnabled')(resolve),0);
 assert.equal(compileViewExpression('!(Shape == 1 | Shape == 3)')(resolve),true);
 assert.equal(compileViewExpression('Shape != 2')(resolve),false);
 assert.equal(compileViewExpression('Unknown ? KEnabled : KIrrelevant')(resolve),undefined);
 assert.equal(compileViewExpression('0 & Unknown')(resolve),false);
});
test('rejects scripts, arbitrary calls, excessive input and malformed expressions',()=>{
 for(const text of ['globalThis.alert(1)','x.constructor()','x = 1','x ? 1','x; y','('.repeat(200),'x'.repeat(1024)])assert.throws(()=>compileViewExpression(text),/expression/i);
});
