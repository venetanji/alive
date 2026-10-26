import assert from 'node:assert/strict';
import {test} from 'node:test';
import {REGISTRY, CanvasDocument, makeNode, validatePatch} from './canvas-model.mjs';
import {OBJECTS, parseObjectText, objectText, suggestObjects, portHelp} from './canvas-catalog.mjs';

test('typed names and arguments build the supported profile without approximating Max classes',()=>{
  assert.deepEqual(parseObjectText('+ 2'),{type:'add',params:{rhs:2,numericmode:1}});
  assert.deepEqual(parseObjectText('* 0.5'),{type:'multiply',params:{rhs:0.5,numericmode:2}});
  assert.deepEqual(parseObjectText('metro 225.5'),{type:'metro',params:{interval:225.5}});
  assert.deepEqual(parseObjectText('message 60 100'),{type:'message_box',params:{text:'60 100'}});
  assert.deepEqual(parseObjectText('voice~ 1 8 28'),{type:'voice',params:{device:1,attack:8,release:28}});
  assert.equal(parseObjectText('button').type,'bang');
  for(const text of ['buffer~ wave','metro 1','metro NaN','gain~ 128','voice~ 0 8 28 99','message set $3'])
    assert.throws(()=>parseObjectText(text),undefined,text);
});
test('every supported object has round-trippable creation text and directional port help',()=>{
  assert.deepEqual(Object.keys(OBJECTS),Object.keys(REGISTRY));
  for(const [type,s] of Object.entries(OBJECTS)) {
    const node=makeNode(type,1);
    assert.deepEqual(parseObjectText(objectText(node)),{type,params:node.params});
    for(const [direction,ports] of [['in',s.inlets],['out',s.outlets]])ports.forEach((p,i)=>{
      const help=portHelp(type,direction,i);
      assert.ok(help.title&&help.detail&&help.messages.length);
      assert.equal(help.direction,direction==='in'?'Accepts':'Emits');
      assert.equal(help.type,p.type);
    });
  }
  assert.match(portHelp('add','in',1).detail,/cold/i);
  assert.match(portHelp('join','out',0).detail,/left.*right/i);
});
test('autocomplete ranks exact names before prefixes, and never invents unsupported objects',()=>{
  assert.equal(suggestObjects('metro')[0].type,'metro');
  assert.equal(suggestObjects('+')[0].type,'add');
  assert.equal(suggestObjects('but')[0].type,'bang');
  assert.deepEqual(suggestObjects('buffer~'),[]);
  assert.deepEqual(suggestObjects('').map(object=>object.type).sort(),Object.keys(OBJECTS).sort());
});
test('comment creation text round-trips multiline whitespace and the full annotation limit',()=>{
  for(const text of ['', '  First\nSecond\nThird  ', 'Original annotation. '.repeat(150)+'\nFinal', 'a'.repeat(4096)]){
    const node=makeNode('comment',1,0,0,{text});
    assert.deepEqual(parseObjectText(objectText(node),node),{type:'comment',params:{text}});
  }
  assert.equal(parseObjectText('comment',makeNode('comment',1,0,0,{text:'Erase me'})).params.text,'');
  assert.throws(()=>parseObjectText('comment '+'a'.repeat(4097)),/4096/);
  assert.throws(()=>parseObjectText('metro '+' '.repeat(161)),/160/);
});
test('named creation parameters share the positional validator and preserve unspecified edit values',()=>{
  assert.deepEqual(parseObjectText('voice~ 1 @release 40 @attack 12'),{type:'voice',params:{device:1,attack:12,release:40}});
  assert.deepEqual(parseObjectText('metro @interval 250'),parseObjectText('metro 250'));
  const previous={type:'voice',params:{device:1,attack:8,release:28}};
  assert.deepEqual(parseObjectText('voice~ @attack 16',previous),{type:'voice',params:{device:1,attack:16,release:28}});
  for(const text of ['metro @active 1','metro @interval','metro @interval 1','voice~ @device 2',
    'voice~ @attack 1 @attack 2','voice~ 0 @device 1','voice~ @attack 1 2','gain~ @value NaN','chord @shape 1.5'])
    assert.throws(()=>parseObjectText(text),undefined,text);
  assert.equal(parseObjectText('message bang').params.text,'bang');
});
test('creation and text replacement are atomic, undoable and preserve identity and valid cords',()=>{
  const doc=new CanvasDocument({version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]});
  const a=doc.add('add',30,40,{rhs:12}),b=doc.add('number',30,90,{value:4});
  assert.equal(doc.patch.nodes[0].params.rhs,12);
  doc.connect(a,0,b,0);
  doc.configure(a,'multiply',{rhs:3});
  assert.equal(doc.patch.nodes[0].id,a);
  assert.equal(doc.patch.nodes[0].type,'multiply');
  assert.equal(doc.patch.edges.length,1);
  const before=JSON.stringify(doc.patch);
  assert.throws(()=>doc.configure(a,'dac',{}));
  assert.equal(JSON.stringify(doc.patch),before);
  doc.undo();assert.equal(doc.patch.nodes[0].type,'add');
  assert.doesNotThrow(()=>validatePatch(doc.patch));
});
test('group movement and deletion each have one undo step, preserving internal wires',()=>{
  const doc=new CanvasDocument({version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]});
  const a=doc.add('bang',40,40),b=doc.add('number',40,100);doc.connect(a,0,b,0);
  doc.moveMany([{id:a,x:70,y:80},{id:b,x:70,y:140}]);
  assert.equal(doc.patch.nodes[1].y,140);doc.undo();assert.equal(doc.patch.nodes[1].y,100);
  doc.removeMany([a,b]);assert.equal(doc.patch.nodes.length,0);assert.equal(doc.patch.edges.length,0);
  doc.undo();assert.equal(doc.patch.nodes.length,2);assert.equal(doc.patch.edges.length,1);
});
