import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMANDS,shortcutCommand} from './alive-commands.mjs';

test('command shortcuts have one owner and stay out of editable and browser contexts',()=>{
  const shortcuts=COMMANDS.map(command=>command.shortcut).filter(Boolean);
  assert.equal(new Set(shortcuts).size,shortcuts.length);
  const target={closest:()=>null},event=(key,extra={})=>({key,target,...extra});
  assert.equal(shortcutCommand(event('?')),'toggle-help');
  assert.equal(shortcutCommand(event('s',{ctrlKey:true})),'save');
  assert.equal(shortcutCommand(event('S',{ctrlKey:true,shiftKey:true})),'save-as');
  assert.equal(shortcutCommand(event('t',{ctrlKey:true}),{native:false}),null);
  assert.equal(shortcutCommand(event('t',{ctrlKey:true}),{native:true}),'insert-audio-track');
  for(const blocked of [{altKey:true},{repeat:true},{defaultPrevented:true},{target:{isContentEditable:true}}])
    assert.equal(shortcutCommand(event('s',{ctrlKey:true,...blocked})),null);
  assert.equal(shortcutCommand(event('?',{target:{closest:()=>({})}})),null);
});
