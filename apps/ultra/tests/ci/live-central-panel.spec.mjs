import {test,expect} from '@playwright/test';

const p=(tag,name,attrs)=>`<${tag} Name="${name}" ${attrs}/>`;
const n=(type,props='',children='')=>`<PropertiesNode TargetClassName="${type}"><Categories><PropertiesCategory><Properties>${props}</Properties></PropertiesCategory></Categories><Children>${children}</Children></PropertiesNode>`;
const xml=body=>`<Ableton>${body}</Ableton>`;
const size=(x,y)=>p('PointProperty','Size',`X="${x}" Y="${y}"`);
const connect=value=>p('ConnectionProperty','ConnectTo',`Value="${value}"`);
const text=value=>p('StringProperty','Text',`Value="${value}"`);
const label=value=>p('StringProperty','Label',`Value="${value}"`);

async function mount(page,body,{expressions=false,unit=''}={}){
 await page.goto('/analog-test.html');
 await page.evaluate(async({source,expressions,unit})=>{
  const {loadLiveDeviceLayout}=await import('./live-device-layout.mjs');
  const {createLiveDeviceView}=await import('./live-device-view.mjs');
  window.edits=[];window.fields=new Map();window.expressionState=true;
  const resolveBinding=connection=>{
   const key=[...connection.scope,connection.expression].join('.');
   if(!window.fields.has(key))window.fields.set(key,{value:key.endsWith('ExponentialSlope')?0:.5,initial:.5,known:true,enabled:true});
   const state=window.fields.get(key);
   return{verified:true,handlesExpressions:true,min:0,max:1,step:'any',unit,getState:()=>({...state}),onChange:value=>{state.value=Number(value);window.edits.push({key,value});window.resourceView.refresh();},onInput:value=>{state.value=value;window.edits.push({key,value});window.resourceView.refresh();}};
  };
  const layout=loadLiveDeviceLayout({gui:{has:()=>false,text:()=>source},path:'Devices/UltraAnalog/Contents.xml'});
  const evaluateExpression=expressions?expression=>window.expressionState===undefined?undefined:expression.value==='IsActive'?window.expressionState:expression.value==='!IsActive'?!window.expressionState:true:null;
  window.resourceView=createLiveDeviceView(document,{layout,resolveBinding,evaluateExpression});document.body.append(window.resourceView.element);
 },{source:xml(body),expressions,unit});
}

test('native 36px dials retain the full readout beside the open dial arc',async({page})=>{
 await mount(page,n('HorizBoxView','',[39,44,46,47,52].map((width,index)=>n('LoadableCombiSliderSmall',size(width,36)+label('Dial '+index)+connect('Dial'+index))).join('')),{unit:'%'});
 const geometry=await page.locator('.live-device-view .live-device-control').evaluateAll(nodes=>nodes.map(e=>{
  const frame=e.getBoundingClientRect(),dial=e.querySelector('.live-dial').getBoundingClientRect(),readout=e.querySelector('.live-readout').getBoundingClientRect();
  return{bottom:readout.bottom-frame.bottom,left:readout.left-frame.left,dialLeft:dial.left-frame.left,dialRight:dial.right-frame.left,readoutRight:readout.right-frame.right,unitBottom:e.querySelector('.live-unit').getBoundingClientRect().bottom-frame.bottom};
 }));
 for(const row of geometry){expect(row.bottom).toBeLessThanOrEqual(0);expect(row.unitBottom).toBeLessThanOrEqual(0);expect(row.left).toBeGreaterThan(row.dialLeft);expect(row.left).toBeLessThan(row.dialRight);expect(row.readoutRight).toBeLessThanOrEqual(0);}
});

test('complementary visibility variants share one stable slot through unknown state and disposal',async({page})=>{
 const variant=(name,condition,hidden=false)=>n('VoidView',size(91,49)+p('ViewExpressionProperty','ShowWhen',`Value="${condition}"`)+(hidden?p('BoolProperty','IsVisible','Value="false"'):''),n('TextField',text(name)+size(40,11)));
 await mount(page,n('HorizBoxView','',n('HorizBoxView','',variant('Active','IsActive')+variant('Inactive','!IsActive',true))+n('TextField',text('After')+size(30,11))),{expressions:true});
 const after=page.locator('.live-device-view').getByText('After',{exact:true});
 const offset=()=>after.evaluate(e=>e.getBoundingClientRect().left-e.closest('.live-device-view').getBoundingClientRect().left);
 expect(await offset()).toBe(91);
 await expect(page.getByText('Active',{exact:true})).toBeVisible();await expect(page.getByText('Inactive',{exact:true})).toBeHidden();
 await page.evaluate(()=>{window.expressionState=false;window.resourceView.refresh();});
 await expect(page.getByText('Active',{exact:true})).toBeHidden();await expect(page.getByText('Inactive',{exact:true})).toBeVisible();expect(await offset()).toBe(91);
 await page.evaluate(()=>{window.expressionState=undefined;window.resourceView.refresh();});
 await expect(page.getByText('Active',{exact:true})).toBeHidden();await expect(page.getByText('Inactive',{exact:true})).toBeHidden();expect(await offset()).toBe(91);
 await page.evaluate(()=>{window.expressionState=true;window.resourceView.refresh();window.resourceView.dispose();window.expressionState=false;window.resourceView.refresh();});
 await expect(page.getByText('Active',{exact:true})).toBeVisible();await expect(page.getByText('Inactive',{exact:true})).toBeHidden();
});

test('independent visibility expressions keep separate box slots',async({page})=>{
 const variant=condition=>n('VoidView',size(91,49)+p('ViewExpressionProperty','ShowWhen',`Value="${condition}"`));
 await mount(page,n('HorizBoxView','',n('HorizBoxView','',variant('IsActive')+variant('OtherFlag'))+n('TextField',text('After')+size(30,11))),{expressions:true});
 expect(await page.getByText('After',{exact:true}).evaluate(e=>e.getBoundingClientRect().left-e.closest('.live-device-view').getBoundingClientRect().left)).toBe(182);
});

test('nested bordered box and card fit their grid inside the fixed inspector width',async({page})=>{
 const cells=Array.from({length:8},(_,index)=>n('TextField',text('Cell '+index)+size(50,11)+p('PointProperty','GridPosition',`X="${index}" Y="0"`))).join('');
 const grid=n('GridLayoutView','',`<PropertiesNode Id="ViewChildren"><Categories/><Children>${cells}</Children></PropertiesNode>`);
 const body=n('HorizBoxView',size(1,0),n('BorderedCellView',p('BorderProperty','Border','Left="3" Right="3" Top="3" Bottom="3"'),n('HorizBoxView','',n('TextField',text('Fixed')+size(100,11))+n('CardView',connect('Page'),n('VertBoxView','',grid)))));
 await mount(page,n('ControlManager',size(490,83),body));
 const geometry=await page.locator('.live-device-view').evaluate(root=>{
  const inspector=root.getBoundingClientRect(),border=root.querySelector('[data-view-class="BorderedCellView"]').getBoundingClientRect(),last=root.querySelector('[data-view-class="GridLayoutView"] [data-view-class="TextField"]:last-child').getBoundingClientRect();
  return{borderRight:border.right-inspector.right,lastRight:last.right-inspector.right,fixedWidth:[...root.querySelectorAll('.live-device-text')].find(e=>e.textContent==='Fixed').getBoundingClientRect().width};
 });
 expect(geometry.borderRight).toBeLessThanOrEqual(0);expect(geometry.lastRight).toBeLessThanOrEqual(0);expect(geometry.fixedWidth).toBe(100);
});

test('numeric edit fields use the grid track width reserved by their captions',async({page})=>{
 const grid=n('GridLayoutView','',`<PropertiesNode Id="ViewChildren"><Categories/><Children>${n('TextField',text('Attack')+size(46,11))+n('LoadableDisplayStyleEditField',size(28,15)+label('Attack')+connect('AttackTime')+p('PointProperty','GridPosition','X="0" Y="1"'))}</Children></PropertiesNode>`);
 await mount(page,grid);
 const width=await page.locator('.live-device-view input[aria-label="Attack"]').evaluate(e=>e.getBoundingClientRect().width);
 expect(width).toBe(46);
});

test('resource retro colors use existing surface, accent and muted tokens',async({page})=>{
 const color=(name,value)=>p('ColorNameProperty',name,`ColorName="${value}"`);
 await mount(page,n('CardView',size(100,50)+color('BackgroundColor','RetroDisplayBackground'),n('VertBoxView','',n('TextField',text('Caption')+size(46,11)+color('TextColor','RetroDisplayForegroundDisabled'))+n('LoadableDisplayStyleEditField',size(46,15)+label('Attack')+connect('AttackTime')+color('Color','RetroDisplayForeground2')))));
 const colors=await page.locator('.live-device-view').evaluate(root=>{
  root.style.setProperty('--live-well','rgb(14, 22, 30)');root.style.setProperty('--live-accent','rgb(0, 190, 200)');root.style.setProperty('--live-muted','rgb(150, 160, 170)');
  return{background:getComputedStyle(root.querySelector('[data-view-class="CardView"]')).backgroundColor,caption:getComputedStyle(root.querySelector('.live-device-text')).color,value:getComputedStyle(root.querySelector('.live-value')).color};
 });
 expect(colors).toEqual({background:'rgb(14, 22, 30)',caption:'rgb(150, 160, 170)',value:'rgb(0, 190, 200)'});
});

test('clicking or focusing any module control selects its detail page without swallowing its edit',async({page})=>{
 const finger=(index,name)=>n('FingerView',connect('SelectedFinger')+p('ViewExpressionProperty','IndexExpression',`Value="${index}"`)+size(90,50),n('LoadableCombiSliderSmall',label(name)+connect(name)+size(40,40)));
 const card=n('CardView',connect('SelectedFinger')+p('StringProperty','ViewId','Value="Inspector"')+size(180,30),n('TextField',text('Pitch page'))+n('TextField',text('Amplitude page')+p('BoolProperty','IsVisible','Value="false"')));
 await mount(page,n('VertBoxView','',n('HorizBoxView','',finger(0,'Oscillator')+finger(1,'Amplifier'))+card+n('LoadableCombiSliderSmall',label('Noise')+connect('Noise')+size(40,40))));
 const inspector=page.locator('.live-device-view [data-view-id="Inspector"]');
 await expect(inspector.getByText('Pitch page',{exact:true})).toBeVisible();
 const amp=page.locator('.live-device-view input[type=range][aria-label="Amplifier"]');
 await amp.click();await expect(inspector.getByText('Amplitude page',{exact:true})).toBeVisible();
 await amp.press('End');expect(await page.evaluate(()=>window.edits.at(-1))).toEqual({key:'Amplifier',value:1});
 await page.evaluate(()=>window.resourceView.refresh());await expect(inspector.locator(':scope > :visible')).toHaveCount(1);
 await page.locator('.live-device-view input[type=range][aria-label="Noise"]').focus();await expect(inspector.getByText('Amplitude page',{exact:true})).toBeVisible();
 await page.locator('.live-device-view input[type=range][aria-label="Oscillator"]').focus();await expect(inspector.getByText('Pitch page',{exact:true})).toBeVisible();
});

test('central ControlManager geometry retains explicit child positions and box gaps',async({page})=>{
 const at=p('PointProperty','Position','X="6" Y="5"');
 await mount(page,n('LoadableView','',n('ControlManager',size(250,80),n('HorizBoxView',at+p('IntProperty','Gap','Value="7"'),n('TextField',text('One')+size(30,11))+n('TextField',text('Two')+size(30,11))))));
 const boxes=await page.locator('.live-device-view [data-view-class="TextField"]').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().left-es[0].getBoundingClientRect().left,y:e.parentElement.style.top,parentX:e.parentElement.style.left})));
 expect(boxes).toEqual([{x:0,y:'5px',parentX:'6px'},{x:37,y:'5px',parentX:'6px'}]);
});

test('slope exposes separate LIN and EXP options backed by the same boolean parameter',async({page})=>{
 await mount(page,n('LoadableView','',n('RadioButtonControlModulated',size(48,13)+connect('ExponentialSlope')+p('StringProperty','FalseText','Value="LIN"')+p('StringProperty','TrueText','Value="EXP"'))));
 const lin=page.getByRole('radio',{name:'LIN',exact:true}),exp=page.getByRole('radio',{name:'EXP',exact:true});
 await exp.click();await expect(exp).toHaveAttribute('aria-checked','true');
 await lin.click();await expect(lin).toHaveAttribute('aria-checked','true');
 expect(await page.evaluate(()=>window.edits.map(e=>e.value))).toEqual([1,0]);
 await lin.press('ArrowRight');await expect(exp).toHaveAttribute('aria-checked','true');
});

test('module navigation listeners are released with the view',async({page})=>{
 const finger=n('FingerView',connect('SelectedFinger')+p('ViewExpressionProperty','IndexExpression','Value="1"')+size(80,40),n('TextField',text('Module')));
 await mount(page,n('LoadableView','',finger+n('CardView',connect('SelectedFinger')+size(180,30),n('TextField',text('First'))+n('TextField',text('Second')+p('BoolProperty','IsVisible','Value="false"')))));
 await page.evaluate(()=>window.resourceView.dispose());await page.getByText('Module',{exact:true}).click();
 await expect(page.getByText('First',{exact:true})).toBeVisible();
});

test('ADSR graphics and numeric fields share live values and envelope scope',async({page})=>{
 const graph=n('AnalogAdsrEnvelopeDisplay',size(175,65)+connect('doc'));
 const field=n('LoadableSliderEditField',size(44,15)+label('Attack')+connect('AttackTime'));
 await mount(page,n('LoadableView','',n('HorizBoxView','',graph+field)));
 const attack=page.locator('.live-device-view [data-handle="attack"]');
 await expect(attack).toHaveAttribute('aria-valuenow','0.5');
 const before=await page.locator('.live-envelope-curve').first().getAttribute('d');
 await attack.focus();await attack.press('ArrowRight');
 await expect(page.locator('.live-device-view input[aria-label="Attack"]')).toHaveValue('0.51');
 expect(await page.locator('.live-envelope-curve').first().getAttribute('d')).not.toBe(before);
 await page.locator('.live-device-view input[aria-label="Attack"]').fill('0.8');await page.locator('.live-device-view input[aria-label="Attack"]').press('Enter');
 await expect(attack).toHaveAttribute('aria-valuenow','0.8');
 await page.evaluate(()=>{for(const state of window.fields.values())state.enabled=false;window.resourceView.refresh();});
 await expect(attack).toHaveAttribute('aria-disabled','true');
});

test('compact labels stay on one line and small envelope switches render as checkboxes',async({page})=>{
 await mount(page,n('HorizBoxView','',n('TextField',text('Pitch Env Initial')+size(46,11))+n('LoadableDisplayCheckControl',connect('Legato')+size(11,11))));
 const caption=page.locator('.live-device-view [data-view-class="TextField"]');
 expect(await caption.evaluate(e=>({height:e.clientHeight,content:e.scrollHeight}))).toEqual({height:11,content:11});
 const checkbox=page.getByRole('button',{name:'Legato',exact:true});
 await expect(checkbox).toHaveText('');await checkbox.click();
 expect(await page.evaluate(()=>window.edits.at(-1).value)).toBe(false);
});
