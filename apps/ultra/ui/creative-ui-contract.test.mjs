import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ultra=readFileSync(new URL('./canvas.html',import.meta.url),'utf8');
const alive=readFileSync(new URL('./alive.html',import.meta.url),'utf8');

function count(content,id){return(content.match(new RegExp('id="'+id+'"','g'))??[]).length;}

test('Ultra keeps the Max-style hierarchy and single command owners',()=>{
  assert.match(ultra,/<div class="toolbar" role="toolbar" aria-label="Patcher tools">[\s\S]*?id="lock-patch"[\s\S]*?id="add-object"[\s\S]*?id="undo"[\s\S]*?id="show-inspector"/);
  assert.match(ultra,/<main>[\s\S]*?<section id="workspace" aria-label="Editable patch canvas"/);
  for(const id of ['document-new','document-open','document-save','show-help','open-help-library','show-audio','assist','stop-graph','panic'])assert.equal(count(ultra,id),1,id);
  assert.match(ultra,/<div class="assist-bar"><aside id="ultra-info-view"[^>]*>[\s\S]*?id="show-help"[\s\S]*?id="open-help-library"[\s\S]*?<\/aside><span id="assist"/);
});
test('Ultra and Alive share tokens, Info primitives and settings appearance without sharing engines',()=>{
  for(const html of [ultra,alive]){
    assert.match(html,/class="creative-app (?:alive-app|ultra-app)"/);
    assert.match(html,/href="creative-shell.css"/);
    assert.match(html,/ui-settings-surface/);
    assert.match(html,/ui-info-rail/);
    assert.match(html,/ui-info-text/);
  }
  assert.match(ultra,/src="canvas-info.mjs"/);
  assert.match(alive,/src="alive-info.mjs"/);
  assert.match(ultra,/id="audio-content" class="ui-settings-surface"/);
  assert.match(alive,/id="alive-audio-settings" class="ui-settings-surface"/);
});
