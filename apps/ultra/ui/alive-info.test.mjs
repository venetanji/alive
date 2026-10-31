import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_INFO,describeAliveTarget,mountAliveInfo} from './alive-info.mjs';

function target(attrs={},kind='button',region=null) {
  const node={
    getAttribute(name){return attrs[name]??null;},
    matches(selector){return selector.split(',').includes(kind);},
    textContent:attrs.textContent??'',
    closest(selector){
      if(selector.startsWith('[data-help]')||selector.includes('button'))return node;
      if(region&&selector===region)return node;
      return null;
    },
  };
  return node;
}

test('Info prefers deliberate help, then title, then accessible name',()=>{
  assert.equal(describeAliveTarget(target({'data-help':'Launch clip','title':'Other'})),'Launch clip');
  assert.equal(describeAliveTarget(target({'title':'Stop the track','aria-label':'Stop'})),'Stop the track');
  assert.equal(describeAliveTarget(target({'aria-label':'Browser'})),'Browser');
  assert.equal(describeAliveTarget(null),DEFAULT_INFO);
});

test('Info is observation-only and menus dismiss without making native calls',()=>{
  const handlers=new Map(),output={textContent:DEFAULT_INFO};
  const fileMenu={open:true,contains:()=>false};
  const browserAdd={open:true,contains:()=>false};
  const elements={'info-text':output,'file-menu':fileMenu,'browser-add-menu':browserAdd};
  const doc={
    getElementById(id){return elements[id]??null;},
    addEventListener(name,handler){handlers.set(name,handler);},
    removeEventListener(name,handler){if(handlers.get(name)===handler)handlers.delete(name);},
  };
  const instance=mountAliveInfo(doc);
  handlers.get('pointerover')({target:target({'data-help':'Select track'})});
  assert.equal(output.textContent,'Select track');
  handlers.get('pointerout')({relatedTarget:null});
  assert.equal(output.textContent,DEFAULT_INFO);
  handlers.get('click')({target:{closest:()=>null}});
  assert.equal(fileMenu.open,false);
  assert.equal(browserAdd.open,false);
  fileMenu.open=true;browserAdd.open=true;
  handlers.get('keydown')({key:'Escape',stopPropagation(){}});
  assert.equal(fileMenu.open,false);assert.equal(browserAdd.open,false);
  instance.dispose();
  assert.equal(handlers.size,0);
});
