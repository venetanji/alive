import {test,expect} from '@playwright/test';

const empty={version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]};
async function open(page){await page.locator('.file-menu summary').click();await page.locator('#open-patch').click();}
async function load(page,patch){await open(page);await page.locator('#patch-json').fill(JSON.stringify(patch));await page.locator('#import-patch').click();}
async function exported(page){
  await page.locator('.file-menu summary').click();await page.locator('#export-patch').click();
  const patch=JSON.parse(await page.locator('#patch-json').inputValue());await page.keyboard.press('Escape');return patch;
}
const routedPatch=()=>({...empty,nodes:[
  {id:1,type:'add',x:60,y:60,params:{rhs:1}},
  {id:2,type:'number',x:300,y:240,params:{value:0}},
],edges:[{from:1,outlet:0,to:2,inlet:0,midpoints:[90,150,280,150,280,220]}]});
const routedCable=page=>page.locator('#cables path[data-edge="0"]');
async function worldScreen(page,p){return page.locator('#canvas').evaluate((canvas,p)=>{
  const r=canvas.getBoundingClientRect(),z=new DOMMatrix(getComputedStyle(canvas).transform).a;
  return{x:r.left+p.x*z,y:r.top+p.y*z};
},p);}

test('saved cord routes share their hit path and remain attached after pan and zoom',async({page})=>{
  await page.goto('/canvas.html');await load(page,routedPatch());
  const cable=routedCable(page);await expect(cable).toHaveAttribute('d',/ Q 280 150 /);
  await page.locator('#canvas-zoom').selectOption('1.5');
  const workspace=await page.locator('#workspace').boundingBox();
  await page.mouse.move(workspace.x+800,workspace.y+500);await page.mouse.down({button:'middle'});
  await page.mouse.move(workspace.x+1100,workspace.y+700,{steps:4});await page.mouse.up({button:'middle'});
  const distance=await cable.evaluate(path=>[0,path.getTotalLength()].map((length,i)=>{
    const port=document.querySelector(i?'[data-node="2"] [data-direction=in]':'[data-node="1"] [data-direction=out]'),r=port.getBoundingClientRect();
    const p=path.getPointAtLength(length),s=new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM());
    return Math.hypot(s.x-r.left-r.width/2,s.y-r.top-r.height/2);
  }));expect(Math.max(...distance)).toBeLessThan(.5);
  const joins=await cable.evaluate(path=>{
    const length=path.getTotalLength(),start=path.getPointAtLength(0),after=path.getPointAtLength(.25);
    const end=path.getPointAtLength(length),before=path.getPointAtLength(length-.25);
    return{sourceX:Math.abs(after.x-start.x),destinationX:Math.abs(end.x-before.x)};
  });expect(joins.sourceX).toBeLessThan(.01);expect(joins.destinationX).toBeLessThan(.01);
  expect(await cable.getAttribute('d')).toBe(await page.locator('.cable-hit').getAttribute('d'));
  const at=await worldScreen(page,{x:185,y:150});
  expect(at.x).toBeGreaterThan(workspace.x);expect(at.y).toBeGreaterThan(workspace.y);
  await page.mouse.click(at.x,at.y+3);
  await expect(cable).toHaveClass(/selected/);
  await page.mouse.click(at.x,at.y+3,{button:'right'});
  await expect(page.locator('#context-menu')).toContainText('Disconnect cable');
  await page.keyboard.press('Escape');
  expect((await exported(page)).edges).toEqual(routedPatch().edges);
});

test('cord bends follow a group during drag preview and Undo restores the saved route',async({page})=>{
  await page.goto('/canvas.html');await load(page,routedPatch());
  const header=page.locator('[data-node="1"] [data-drag]');
  let box=await header.boundingBox();await page.mouse.move(box.x+15,box.y+12);await page.mouse.down();
  await page.mouse.move(box.x+55,box.y+42,{steps:4});
  await expect(routedCable(page)).toHaveAttribute('d',/ Q 280 150 /);
  await page.mouse.up();expect((await exported(page)).edges).toEqual(routedPatch().edges);
  await page.locator('#undo').click();
  await page.locator('#workspace').focus();await page.keyboard.press('Control+a');
  box=await header.boundingBox();await page.mouse.move(box.x+15,box.y+12);await page.mouse.down();
  await page.mouse.move(box.x+55,box.y+42,{steps:4});
  await expect(routedCable(page)).toHaveAttribute('d',/ Q 320 180 /);
  await page.mouse.up();expect((await exported(page)).edges[0].midpoints).toEqual([130,180,320,180,320,250]);
  await page.locator('#undo').click();await expect(routedCable(page)).toHaveAttribute('d',/ Q 280 150 /);
  await page.locator('#redo').click();expect((await exported(page)).edges[0].midpoints).toEqual([130,180,320,180,320,250]);
});

test('Fit includes saved bends outside the objects at compact desktop size',async({page})=>{
  await page.setViewportSize({width:800,height:600});await page.goto('/canvas.html');
  const patch=routedPatch();patch.edges[0].midpoints=[90,800,1100,800,1100,220];await load(page,patch);
  await page.locator('#fit-patch').click();
  const geometry=await routedCable(page).evaluate(path=>{
    const route=path.getBoundingClientRect(),workspace=document.querySelector('#workspace').getBoundingClientRect();
    return{left:route.left,top:route.top,right:route.right,bottom:route.bottom,viewport:{left:workspace.left,top:workspace.top,right:workspace.right,bottom:workspace.bottom}};
  });
  expect(geometry.left).toBeGreaterThanOrEqual(geometry.viewport.left);
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.viewport.top);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport.right);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport.bottom);
  expect((await exported(page)).edges).toEqual(patch.edges);
});
const source={patcher:{boxes:[{box:{id:'basic',maxclass:'newobj',text:'p basic',patching_rect:[30,30,70,24],patcher:{boxes:[
  {box:{id:'a',maxclass:'newobj',text:'int 2',numinlets:2,numoutlets:1,patching_rect:[40,40,120,32],bgcolor:[0.2,0.3,0.4,1],fontsize:16}},
  {box:{id:'b',maxclass:'newobj',text:'float 0',numinlets:2,numoutlets:1,patching_rect:[200,120,80,24]}},
],lines:[{patchline:{source:['a',0],destination:['b',0]}}]}}}],lines:[]}};

test('inspector appearance changes render, export, reset and undo',async({page})=>{
  await page.goto('/canvas.html');await load(page,{...empty,nodes:[{id:1,type:'add',x:60,y:60,params:{}}]});
  await page.locator('[data-node="1"] .object-label').click();await page.locator('#show-inspector').click();
  const width=page.locator('#inspector [data-style="width"]');await expect(width).toBeVisible();
  await width.fill('180');await width.press('Tab');
  const color=page.locator('#inspector [data-style="bgcolor"]');await color.fill('#304050');await color.dispatchEvent('change');
  const alpha=page.locator('#inspector [data-style-alpha="bgcolor"]');await alpha.fill('0.5');await alpha.press('Tab');
  await expect(page.locator('[data-node="1"]')).toHaveCSS('width','180px');
  await expect(page.locator('[data-node="1"]')).toHaveCSS('background-color','rgba(48, 64, 80, 0.5)');
  const patch=await exported(page);expect(patch.nodes[0].style.width).toBe(180);
  expect(patch.nodes[0].style.bgcolor).toEqual([48/255,64/255,80/255,0.5]);
  await page.locator('#reset-appearance').click();expect((await exported(page)).nodes[0].style).toBeUndefined();
  await page.locator('#undo').click();expect((await exported(page)).nodes[0].style).toEqual(patch.nodes[0].style);
});

test('a Max help file selects and imports an actual compatible nested tab with layout and attributes',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/canvas.html');await load(page,empty);await open(page);
  await page.locator('#patch-file').setInputFiles({name:'original-test.maxhelp',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  await expect(page.locator('#max-import')).toBeVisible();
  await page.locator('#max-patcher').selectOption('root/basic');
  await expect(page.locator('#max-summary')).toContainText(/2 objects.*1 cable/i);
  await expect(page.locator('#import-patch')).toBeEnabled();await page.locator('#import-patch').click();
  await expect(page.locator('#patch-dialog')).not.toBeVisible();
  const patch=await exported(page);expect(patch.nodes.map(n=>n.type)).toEqual(['int','float']);
  expect(patch.edges).toHaveLength(1);expect(patch.nodes[0].style).toMatchObject({width:120,height:32,fontsize:16,bgcolor:[0.2,0.3,0.4,1]});
  expect(errors).toEqual([]);
});

test('partial Max imports require explicit opt-in and disclose unsupported objects',async({page})=>{
  await page.goto('/canvas.html');const before=await exported(page);await open(page);
  await page.locator('#patch-json').fill(JSON.stringify({patcher:{boxes:[
    {box:{id:'a',maxclass:'button',patching_rect:[50,50,24,24],numinlets:1,numoutlets:1}},
    {box:{id:'b',maxclass:'newobj',text:'unimplemented.example',patching_rect:[50,120,160,24]}},
  ],lines:[]}}));
  await page.locator('#import-patch').click();
  await expect(page.locator('#max-diagnostics')).toContainText('unimplemented.example');
  await expect(page.locator('#import-patch')).toBeDisabled();
  await page.keyboard.press('Escape');expect(await exported(page)).toEqual(before);
  await open(page);await page.locator('#patch-json').fill(JSON.stringify({patcher:{boxes:[
    {box:{id:'a',maxclass:'button',patching_rect:[50,50,24,24],numinlets:1,numoutlets:1}},
    {box:{id:'b',maxclass:'newobj',text:'unimplemented.example',patching_rect:[50,120,160,24]}},
  ],lines:[]}}));await page.locator('#import-patch').click();
  await page.locator('#max-allow-partial').check();await page.locator('#import-patch').click();
  const patch=await exported(page);expect(patch.nodes.map(n=>n.type)).toEqual(['bang']);
  await expect(page.locator('#notice')).toContainText(/partial/i);
});

test('editing inspected Max JSON invalidates the import preview',async({page})=>{
  await page.goto('/canvas.html');await open(page);await page.locator('#patch-json').fill(JSON.stringify(source));await page.locator('#import-patch').click();
  await expect(page.locator('#max-import')).toBeVisible();await page.locator('#patch-json').fill('{broken');
  await expect(page.locator('#max-import')).not.toBeVisible();await page.locator('#import-patch').click();
  await expect(page.locator('#dialog-status')).toContainText(/JSON/i);await expect(page.locator('#patch-dialog')).toBeVisible();
});

test('saved comment rectangles show wrapped and explicit lines at their saved font sizes',async({page})=>{
  const comments=[
    {id:1,type:'comment',x:50,y:50,params:{text:'First line\nSecond line\nThird line'},style:{width:180,height:60,fontsize:13}},
    {id:2,type:'comment',x:280,y:50,params:{text:'Words wrap inside the saved box.'},style:{width:130,height:84,fontsize:18}},
    {id:3,type:'comment',x:50,y:180,params:{text:'<img src=x onerror=alert(1)>\nLiteral text'},style:{width:260,height:50,fontsize:12}},
    {id:4,type:'comment',x:350,y:180,params:{text:'An unsized note\nkeeps its second line\nand its third line.'},style:{width:160,fontsize:13}},
  ];
  await page.goto('/canvas.html');await load(page,{version:2,profile:'ultra-patcher-v2',nodes:comments,edges:[]});
  for(const comment of comments){
    const node=page.locator(`[data-node="${comment.id}"]`),label=node.locator('.comment-label');
    await expect(node).toHaveCSS('width',`${comment.style.width}px`);
    if(comment.style.height)await expect(node).toHaveCSS('height',`${comment.style.height}px`);
    else expect((await node.boundingBox()).height).toBeGreaterThan(comment.style.fontsize*3);
    await expect(label).toHaveText(comment.params.text);
    const geometry=await label.evaluate(element=>{
      const range=document.createRange();range.selectNodeContents(element);
      const bounds=element.getBoundingClientRect(),lines=[...range.getClientRects()];
      return{lineCount:new Set(lines.map(line=>line.top)).size,labelHeight:bounds.height,
        contained:lines.every(line=>line.left>=bounds.left&&line.right<=bounds.right+.5&&line.top>=bounds.top&&line.bottom<=bounds.bottom+.5)};
    });
    expect(geometry.lineCount).toBeGreaterThanOrEqual(comment.id===2?3:comment.id===1?3:2);
    expect(geometry.labelHeight).toBeGreaterThan(comment.style.fontsize*2);
    expect(geometry.contained).toBe(true);
  }
  await expect(page.locator('[data-node="3"] img')).toHaveCount(0);
  expect((await exported(page)).nodes).toEqual(comments);
});

test('comment text keeps keyboard focus, direct editing and drag history',async({page})=>{
  const node={id:1,type:'comment',x:70,y:60,params:{text:'An editable note.'},style:{width:180,height:46,fontsize:13}};
  await page.goto('/canvas.html');await load(page,{version:2,profile:'ultra-patcher-v2',nodes:[node],edges:[]});
  const comment=page.locator('[data-node="1"]'),label=comment.locator('.comment-label');
  await label.focus();await page.keyboard.press('Enter');
  await expect(page.locator('#object-entry')).toBeVisible();
  await page.locator('#object-text').fill('comment Updated note.');await page.locator('#object-text').press('Enter');
  await expect(label).toHaveText('Updated note.');
  await label.focus();await expect(label).toBeFocused();
  await expect(label).toHaveCSS('outline-style','solid');
  const bounds=await label.boundingBox();await page.mouse.move(bounds.x+30,bounds.y+12);await page.mouse.down();
  await page.mouse.move(bounds.x+70,bounds.y+42,{steps:5});await page.mouse.up();
  expect((await exported(page)).nodes[0]).toMatchObject({x:110,y:90,params:{text:'Updated note.'},style:node.style});
  await page.locator('#undo').click();expect((await exported(page)).nodes[0]).toMatchObject({x:70,y:60,params:{text:'Updated note.'}});
  await label.dblclick();await expect(page.locator('#object-entry')).toBeVisible();
  await page.locator('#object-text').press('Escape');await expect(label).toHaveText('Updated note.');
});

test('comment callouts reserve their arrow side and stay within saved bounds',async({page})=>{
  const comments=[0,1,2,3].map((side,index)=>({id:index+1,type:'comment',x:50+index*250,y:50,
    params:{text:'A callout note.\nA second line.'},style:{width:220,height:80,fontsize:13,bubble:1,bubbleside:side,bubblepoint:.5}}));
  comments.push(...[0,1].map((point,index)=>({id:index+5,type:'comment',x:50+index*40,y:200,params:{text:''},
    style:{width:12,height:12,fontsize:48,bubble:1,bubbleside:index?3:0,bubblepoint:point}})));
  await page.goto('/canvas.html');await load(page,{version:2,profile:'ultra-patcher-v2',nodes:comments,edges:[]});
  for(const comment of comments){
    const node=page.locator(`[data-node="${comment.id}"]`),outline=node.locator('.comment-outline');
    await expect(outline).toBeVisible();await expect(outline).toHaveAttribute('aria-hidden','true');
    await expect(outline).toHaveCSS('pointer-events','none');
    await expect(node).toHaveCSS('width',`${comment.style.width}px`);await expect(node).toHaveCSS('height',`${comment.style.height}px`);
    const shape=await outline.evaluate(svg=>{
      const bounds=svg.querySelector('path').getBBox(),viewBox=svg.viewBox.baseVal;
      return{x:bounds.x,y:bounds.y,right:bounds.x+bounds.width,bottom:bounds.y+bounds.height,width:viewBox.width,height:viewBox.height};
    });
    expect(shape.x).toBeGreaterThanOrEqual(0);expect(shape.y).toBeGreaterThanOrEqual(0);
    expect(shape.right).toBeLessThanOrEqual(shape.width);expect(shape.bottom).toBeLessThanOrEqual(shape.height);
    if(comment.id<=4){
      const padding=await node.locator('.comment-label').evaluate(element=>{
        const style=getComputedStyle(element);return[style.paddingTop,style.paddingLeft,style.paddingBottom,style.paddingRight].map(parseFloat);
      });
      const side=comment.style.bubbleside;expect(padding[side]).toBeGreaterThan(padding[(side+2)%4]);
    }
  }
  expect((await exported(page)).nodes).toEqual(comments);
});

test('comment callout typography and colors update and reset with saved appearance',async({page})=>{
  const node={id:1,type:'comment',x:60,y:60,params:{text:'First line\nSecond line\nThird line'},
    style:{width:220,height:54,fontsize:13,bubble:1,bgcolor:[.2,.4,.6,.4],color:[.2,.2,.2,.7],textcolor:[1,.8,.6,1]}};
  await page.goto('/canvas.html');await load(page,{version:2,profile:'ultra-patcher-v2',nodes:[node],edges:[]});
  const comment=page.locator('[data-node="1"]'),label=comment.locator('.comment-label'),outline=comment.locator('.comment-outline');
  const textGeometry=await label.evaluate(element=>{
    const range=document.createRange();range.selectNodeContents(element);
    const bounds=element.getBoundingClientRect(),lines=[...range.getClientRects()];
    return{lines:new Set(lines.map(line=>line.top)).size,
      inside:lines.every(line=>line.top>=bounds.top&&line.bottom<=bounds.bottom)};
  });
  expect(textGeometry).toEqual({lines:3,inside:true});
  await expect(outline).toHaveCSS('fill','rgba(51, 102, 153, 0.4)');await expect(outline).toHaveCSS('stroke','rgba(51, 51, 51, 0.7)');
  await expect(label).toHaveCSS('color','rgb(255, 204, 153)');
  await label.click();await page.locator('#show-inspector').click();
  const font=page.locator('#inspector [data-style="fontsize"]');await font.fill('18');await font.press('Tab');
  await expect(label).toHaveCSS('font-size','18px');await expect(comment).toHaveCSS('height','54px');
  await page.locator('#reset-appearance').click();await expect(outline).toBeHidden();
  await expect(label).toHaveCSS('padding','2px 3px');await expect(label).toHaveCSS('color','rgb(238, 238, 236)');
  expect((await exported(page)).nodes[0].style).toBeUndefined();
  await page.locator('#undo').click();await expect(outline).toBeVisible();
  await expect(outline).toHaveCSS('fill','rgba(51, 102, 153, 0.4)');await expect(label).toHaveCSS('font-size','18px');
});
