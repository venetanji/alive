import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLiveDeviceView} from './live-device-view.mjs';
import {dom,all,settle} from '../tests/presentation-dom.mjs';
import {png} from '../tests/ci/live-device-raster-fixtures.mjs';

const prop=Value=>({attributes:{Value}});
const point=(X,Y)=>({attributes:{X:String(X),Y:String(Y)}});
const color=ColorName=>({attributes:{ColorName}});
const node=(className,properties={},children=[])=>({className,properties,children,scope:[],resource:'Devices/LoungeLizard/Contents.xml',text:()=>''});
function schematic(){
  const size={attributes:{X:'90',Y:'90'}};
  return {root:node('StackView',{},[
    node('ClickMapView',{ViewId:prop('DeviceSchemaClickMap')}),
    node('BitmapView',{Size:size,BitmapName:prop('Devices/Electric/DeviceSchemaBase.png')}),
    node('LoadableAnimationView',{Size:size,ViewId:prop('DeviceSchemaAnimation'),AnimationName:prop('Devices/Electric/DeviceSchema00.png'),BitmapColor:{attributes:{ColorName:'RetroDisplayForeground2'}}}),
  ]),warnings:[]};
}
function qualifiedSchematic(){
  const layout=schematic(),stack=layout.root;
  stack.properties.Size=point(106,95);
  stack.children[0].properties.Size=point(106,98);
  stack.children[2].properties.BackgroundColor=color('Transparent');
  layout.root=node('BorderedCellView',{
    Size:point(106,98),BackgroundColor:color('RetroDisplayBackground'),IsHorizExpandable:prop('false'),IsVertExpandable:prop('false'),
    Border:{attributes:{ColorString:'Black',Left:'0',Right:'0',Top:'0',Bottom:'0',RoundedCornerSize:'2',RoundedCorners:'5',EdgesToDraw:'15',CornerColorString:'UseBackground'},children:[{tag:'BorderType',attributes:{Value:'4'}}]},
  },[stack]);
  return layout;
}
const layerElements=root=>all(root).filter(element=>['BitmapView','LoadableAnimationView'].includes(element.dataset.viewClass));

test('exact Electric schematic centers both artwork layers in the containing cell without resizing its Stack',()=>{
  for(const electricSchematicFamily of ['normal','large']){
    const page=dom(),view=createLiveDeviceView(page.doc,{layout:qualifiedSchematic(),electricSchematicFamily});page.root.append(view.element);
    const layers=layerElements(page.root),cell=all(page.root).find(e=>e.dataset.viewClass==='BorderedCellView'),stack=layers[0].parentElement;
    assert.deepEqual(layers.map(e=>[e.style.left,e.style.top,e.style.width,e.style.height]),[['8px','4px','90px','90px'],['8px','4px','90px','90px']]);
    assert.deepEqual([cell.style.width,cell.style.height,stack.style.width,stack.style.height],['106px','98px','106px','95px']);
    const clickMap=stack.children[0];
    assert.deepEqual([clickMap.style.left,clickMap.style.top,clickMap.style.width,clickMap.style.height],['0px','0px','106px','98px']);
    assert.equal(clickMap.style.pointerEvents,'none');assert.equal(clickMap.listeners.size,0);
    view.dispose();
  }
});

test('inferred Electric placement keeps independent family, sampling, allocator and scale gaps visible',()=>{
  const page=dom(),view=createLiveDeviceView(page.doc,{layout:qualifiedSchematic()}),diagnostics=view.report.unsupportedProperties;
  const placement=diagnostics.filter(p=>p.property==='Artwork.Placement');
  assert.equal(placement.length,2);
  assert.ok(placement.every(p=>p.status==='inferred'&&/one recorded/i.test(p.reason)));
  for(const property of ['Artwork.DpiFamily','Artwork.Resampling','Artwork.NativeLayout','Artwork.OtherScales']){
    assert.equal(diagnostics.filter(p=>p.property===property&&/unqualified/i.test(p.reason)).length,2);
  }
  view.dispose();
});

for(const {name,change,want=[['0px','0px'],['0px','0px']]}of [
  {name:'another resource',change:cell=>{cell.resource='Devices/Other/Contents.xml';}},
  {name:'a different cell size',change:cell=>{cell.properties.Size=point(106,97);}},
  {name:'a different Stack size',change:cell=>{cell.children[0].properties.Size=point(106,98);}},
  {name:'a different click-map size',change:cell=>{cell.children[0].children[0].properties.Size=point(106,95);}},
  {name:'a different artwork size',change:cell=>{cell.children[0].children[1].properties.Size=point(89,90);}},
  {name:'a different mask tint',change:cell=>{cell.children[0].children[2].properties.BitmapColor=color('RetroDisplayForegroundDisabled');}},
  {name:'a different mask background',change:cell=>{cell.children[0].children[2].properties.BackgroundColor=color('RetroDisplayBackground');}},
  {name:'nonzero border margins',change:cell=>{cell.properties.Border.attributes.Top='1';}},
  {name:'an expandable cell',change:cell=>{cell.properties.IsVertExpandable=prop('true');}},
  {name:'an extra Stack child',change:cell=>{cell.children[0].children.push(node('VoidView'));}},
  {name:'different child ordering',change:cell=>{cell.children[0].children.reverse();}},
  {name:'an explicitly positioned Stack',change:cell=>{cell.children[0].properties.Position=point(2,3);}},
  {name:'an explicit artwork Position',change:cell=>{cell.children[0].children[1].properties.Position=point(3,7);},want:[['3px','7px'],['0px','0px']]},
  {name:'a fixed Stack height policy',change:cell=>{cell.children[0].properties.VertResizePolicy={attributes:{PolicyName:'FixedLength',Value1:'94'}};}},
])test(`Electric centering does not apply to ${name}`,()=>{
  const layout=qualifiedSchematic();change(layout.root);
  const page=dom(),view=createLiveDeviceView(page.doc,{layout});page.root.append(view.element);
  assert.deepEqual(layerElements(page.root).map(e=>[e.style.left,e.style.top]),want);
  assert.equal(view.report.unsupportedProperties.some(p=>p.property==='Artwork.Placement'&&p.status==='inferred'),false);
  view.dispose();
});

test('generic StackView children retain explicit and origin positioning',()=>{
  const layout={root:node('StackView',{Size:point(106,95)},[node('VoidView',{Size:point(90,90),Position:point(3,7)}),node('VoidView',{Size:point(90,90)})]),warnings:[]};
  const page=dom(),view=createLiveDeviceView(page.doc,{layout});page.root.append(view.element);
  const stack=all(page.root).find(e=>e.dataset.viewClass==='StackView');
  assert.deepEqual(stack.children.map(e=>[e.style.left,e.style.top,e.style.width,e.style.height]),[['3px','7px','90px','90px'],['0px','0px','90px','90px']]);
  assert.deepEqual([stack.style.width,stack.style.height],['106px','95px']);view.dispose();
});

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
