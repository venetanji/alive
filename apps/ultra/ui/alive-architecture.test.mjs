import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./alive.html',import.meta.url),'utf8');

test('Alive chrome keeps project file actions inside their owning menu',()=>{
  const header=html.match(/<header class="document-bar">([\s\S]*?)<\/header>/)?.[1];
  assert.ok(header,'document header exists');
  const nav=header.match(/<nav class="document-actions"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav,'project actions are grouped');
  assert.match(nav,/<details id="file-menu">[\s\S]*?id="new"[\s\S]*?id="open"[\s\S]*?id="save-as"[\s\S]*?id="quit"[\s\S]*?<\/details><button id="save"/);
  assert.equal((nav.match(/<button\b/g)??[]).length,5,'additional file actions need a region review');
});

test('browser keeps track creation in a single disclosure',()=>{
  assert.match(html,/<details id="browser-add-menu">[\s\S]*?id="insert-audio-track"[\s\S]*?id="insert-midi-track"[\s\S]*?id="add-track"[\s\S]*?id="add-effect"[\s\S]*?<\/details>/);
  assert.equal((html.match(/id="browser-add-menu"/g)??[]).length,1);
});

test('contextual Info remains footer-left and never substitutes for status',()=>{
  assert.match(html,/<footer><aside id="info-view"[^>]*>[\s\S]*?<output id="info-text"[\s\S]*?<\/aside><p id="notice"/);
  assert.equal((html.match(/id="info-view"/g)??[]).length,1);
  assert.match(html,/<link rel="stylesheet" href="alive-browser.css"><link rel="stylesheet" href="creative-shell.css"><link rel="stylesheet" href="alive-ui-contract.css">/);
  assert.match(html,/<script type="module" src="alive-info.mjs"><\/script>/);
});
