import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLiveDeviceView} from './live-device-view.mjs';
import {dom,all,settle} from '../tests/presentation-dom.mjs';
import {png} from '../tests/ci/live-device-raster-fixtures.mjs';

const prop=Value=>({attributes:{Value}});
const node=(className,properties={},children=[])=>({className,properties,children,scope:[],resource:'Devices/LoungeLizard/Contents.xml',text:()=>''});
function schematic(){
  const size={attributes:{X:'90',Y:'90'}};
  return {root:node('StackView',{},[
    node('ClickMapView',{ViewId:prop('DeviceSchemaClickMap')}),
    node('BitmapView',{Size:size,BitmapName:prop('Devices/Electric/DeviceSchemaBase.png')}),
    node('LoadableAnimationView',{Size:size,ViewId:prop('DeviceSchemaAnimation'),AnimationName:prop('Devices/Electric/DeviceSchema00.png'),BitmapColor:{attributes:{ColorName:'RetroDisplayForeground2'}}}),
  ]),warnings:[]};
}

test('Electric schematic refuses unverified artwork before reading provider bytes',async()=>{
  const page=dom(),errors=[];let reads=0;
  const graphics={has:()=>true,read:()=>{reads++;return png();}};
  const view=createLiveDeviceView(page.doc,{layout:schematic(),gui:{kind:'GUI'},graphics,onError:error=>errors.push(error.message)});
  page.root.append(view.element);await settle();
  assert.equal(reads,0);
  const layers=all(page.root).filter(element=>['BitmapView','LoadableAnimationView'].includes(element.dataset.viewClass));
  assert.deepEqual(layers.map(layer=>layer.dataset.artworkState),['unavailable','unavailable']);
  assert.equal(errors.length,2);
  assert.ok(errors.every(message=>/verified resource pack pair/.test(message)));
  assert.equal(view.report.artwork.length,2);
  assert.ok(view.report.artwork.every(entry=>entry.status==='unavailable'&&/verified/.test(entry.error)));
  assert.equal(all(page.root).some(element=>element.tagName==='IMG'),false);
  view.dispose();
});

test('schematic placement stays provisional and its click map stays inert',async()=>{
  const page=dom(),view=createLiveDeviceView(page.doc,{layout:schematic()});page.root.append(view.element);await settle();
  const clickMap=all(page.root).find(element=>element.dataset.viewId==='DeviceSchemaClickMap');
  assert.equal(clickMap.textContent??'','');
  assert.equal(clickMap.listeners.size,0);
  assert.ok(view.report.unsupportedProperties.some(entry=>entry.property==='Artwork.Placement'&&/provisional/i.test(entry.reason)));
  assert.ok(view.report.unsupportedProperties.some(entry=>entry.property==='ClickMap.Interaction'));
  assert.equal(all(page.root).filter(element=>element.tagName==='CANVAS').length,0);
  view.dispose();view.dispose();view.refresh();
});

test('unrecognized animation resources retain unsupported drawing diagnostics',()=>{
  const page=dom(),layout={root:node('LoadableAnimationView',{AnimationName:prop('Devices/Other/Sequence00.png')}),warnings:[]};
  const view=createLiveDeviceView(page.doc,{layout});
  assert.ok(view.report.unsupportedClasses.includes('LoadableAnimationView'));view.dispose();
});
