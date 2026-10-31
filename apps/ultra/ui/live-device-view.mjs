import {createDial,createNumber,createToggle,createMenu,createRadioGroup} from './live-controls.mjs';
import {propertyPoint,propertyValue as value} from './live-device-layout.mjs';
import {createLiveEnvelopeEditor} from './live-envelope-editor.mjs';

const continuous=new Set(['LoadableCombiSliderSmall','LoadableSliderEditField','LoadableBipolSliderEditField','LoadableDisplayStyleEditField']);
const toggles=new Set(['LoadableCheckControlText','LoadableDisplayCheckControl','RadioButtonControlModulated','LoadableAnimationButtonControl']);
const menus=new Set(['LoadableChooserControl','LoadableDisplayChooser']);
const containers=new Set(['LoadableView','EmbeddedLoadableView','VoidView','HorizBoxView','VertBoxView','BorderedCellView','ExpandableCellView','CardView','FingerView','SplashCellView','StackView','GridLayoutView','ControlManager','']);
const colorTokens=new Map([['RetroDisplayBackground','--live-well'],['RetroDisplayForeground2','--live-accent'],['RetroDisplayForegroundDisabled','--live-muted'],['RetroDisplayBackgroundLine','--live-edge']]);
const key=connection=>JSON.stringify([connection?.scope??[],connection?.expression??'']);
const make=(doc,tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const visibilityReference=node=>{
  const expression=node.properties.ShowWhen;if(expression?.tag!=='ViewExpressionProperty')return null;
  const match=String(expression.attributes.Value).trim().match(/^(!?)\s*([A-Za-z_]\w*(?:\[\d+\])?(?:\.[A-Za-z_]\w*(?:\[\d+\])?)*)$/);
  return match?{name:match[2],negated:!!match[1]}:null;
};

export function createLiveDeviceView(doc,{layout,graphics=null,resolveBinding=()=>null,evaluateExpression=null,onError=()=>{}}={}){
  let disposed=false;const cleanup=[],refreshers=[],drafts=[],cards=new Map(),fingers=[],selectors=[],unsupported=new Set();let unresolved=0,controls=0;
  const textMeasure=doc.createElement('canvas').getContext('2d');if(textMeasure)textMeasure.font='11px "Liberation Sans"';
  const guard=fn=>(...args)=>{if(disposed)return false;try{const result=fn?.(...args);if(result?.then)result.catch(onError);return result;}catch(e){onError(e);return false;}};
  const label=node=>node.text('Label')||node.text('Text')||node.text('TrueText')||node.text('InfoTextHeader').replace(/^@/,'')||node.connection?.expression||node.className;
  function render(node,ancestorExpressions=[],naturalText=false){
    const type=node.className,e=make(doc,'div','live-device-node');e.dataset.viewClass=type;
    const color=name=>{const token=colorTokens.get(value(node,name));return token?`var(${token})`:null;};
    const background=color('BackgroundColor'),foreground=color('TextColor'),controlInk=color('Color')??color('Color Scheme');
    if(background)e.style.backgroundColor=background;if(foreground)e.style.color=foreground;
    if(controlInk)e.style.setProperty('--live-device-control-ink',controlInk);
    const viewId=value(node,'ViewId');if(viewId)e.dataset.viewId=viewId;
    if(node.connection)e.dataset.binding=key(node.connection);
    const ownExpressions=Object.entries(node.properties).filter(([name,p])=>p.tag==='ViewExpressionProperty'&&name!=='IndexExpression').map(([name,p])=>({name,value:p.attributes.Value,scope:node.scope,resource:node.resource,connection:node.connection}));
    const stateExpressions=[...ancestorExpressions,...ownExpressions];
    let children=node.embedded?[node.embedded]:node.children;
    if(type==='GridLayoutView')children=node.children.find(n=>n.id==='ViewChildren')?.children??[];
    const horizontal=type==='HorizBoxView',vertical=type==='VertBoxView';
    const compactToolbar=horizontal&&children.some(child=>child.className==='RadioButtonControlModulated'&&child.connection?.expression==='ExponentialSlope');
    let childViews=children.map(child=>render(child,stateExpressions,compactToolbar)),width=0,height=0,fitWidth=null;
    if(horizontal||vertical){
      const slots=[];
      for(let i=0;i<childViews.length;i++){
        const first=childViews[i],second=childViews[i+1],a=visibilityReference(first.node),b=second&&visibilityReference(second.node);
        if(!a||!b||a.name!==b.name||a.negated===b.negated||first.node.resource!==second.node.resource||JSON.stringify(first.node.scope)!==JSON.stringify(second.node.scope)){slots.push(first);continue;}
        // Exact complementary references are alternate drawings of one native box slot.
        const element=make(doc,'div','live-device-node live-device-choice'),width=Math.max(first.width,second.width),height=Math.max(first.height,second.height);
        element.style.width=width+'px';element.style.height=height+'px';
        for(const variant of [first,second]){variant.element.style.position='absolute';variant.element.style.left='0';variant.element.style.top='0';element.append(variant.element);}
        slots.push({element,width,height,node:first.node,fitWidth:null});i++;
      }
      childViews=slots;
    }
    if(type==='GridLayoutView'){
      const cells=childViews.map(c=>{const at=propertyPoint(c.node,'GridPosition')??{x:0,y:0},span=propertyPoint(c.node,'GridSize')??{x:1,y:1};
        if(![at.x,at.y,span.x,span.y].every(Number.isInteger)||at.x<0||at.y<0||span.x<1||span.y<1||at.x+span.x>64||at.y+span.y>64)throw Error('Live device layout: invalid grid coordinates.');
        return{...c,at,span};
      });
      const columns=node.children.find(n=>n.id==='Columns'),rows=node.children.find(n=>n.id==='Rows');
      const gap=n=>Math.min(64,Math.max(0,Number(n?value(n,'Gap','0'):0)||0)),gx=gap(columns),gy=gap(rows);
      const widths=Array(Math.max(0,...cells.map(c=>c.at.x+c.span.x))).fill(0),heights=Array(Math.max(0,...cells.map(c=>c.at.y+c.span.y))).fill(0);
      for(const c of cells){for(let x=c.at.x;x<c.at.x+c.span.x;x++)widths[x]=Math.max(widths[x],(c.width-gx*(c.span.x-1))/c.span.x);for(let y=c.at.y;y<c.at.y+c.span.y;y++)heights[y]=Math.max(heights[y],(c.height-gy*(c.span.y-1))/c.span.y);}
      if(columns&&value(columns,'TryKeepSameLength')==='true')widths.fill(Math.max(0,...widths));
      if(rows&&value(rows,'TryKeepSameLength')==='true')heights.fill(Math.max(0,...heights));
      const before=(tracks,end,g)=>tracks.slice(0,end).reduce((a,b)=>a+b,0)+g*end;
      const positionCells=()=>{for(const c of cells){c.element.style.position='absolute';c.element.style.left=before(widths,c.at.x,gx)+'px';c.element.style.top=before(heights,c.at.y,gy)+'px';
        const available=widths.slice(c.at.x,c.at.x+c.span.x).reduce((a,b)=>a+b,0)+gx*(c.span.x-1);
        const numericField=continuous.has(c.node.className)&&c.node.className!=='LoadableCombiSliderSmall';
        if(numericField||c.width>available){if(c.fitWidth)c.fitWidth(available);else c.element.style.width=available+'px';}
      }};
      positionCells();
      width=widths.reduce((a,b)=>a+b,0)+gx*Math.max(0,widths.length-1);height=heights.reduce((a,b)=>a+b,0)+gy*Math.max(0,heights.length-1);
      fitWidth=available=>{const ratio=Math.max(0,available-gx*Math.max(0,widths.length-1))/widths.reduce((a,b)=>a+b,0);for(let i=0;i<widths.length;i++)widths[i]*=ratio;positionCells();};
    }else if(horizontal||vertical){
      e.classList.add(horizontal?'live-device-horizontal':'live-device-vertical');
      const gap=Math.min(64,Math.max(0,Number(value(node,'Gap','0'))||0));e.style.gap=gap+'px';
      width=horizontal?childViews.reduce((n,c)=>n+c.width,0)+gap*Math.max(0,childViews.length-1):Math.max(0,...childViews.map(c=>c.width));
      height=vertical?childViews.reduce((n,c)=>n+c.height,0)+gap*Math.max(0,childViews.length-1):Math.max(0,...childViews.map(c=>c.height));
      const flexible=childViews.filter(c=>c.fitWidth);
      if(flexible.length)fitWidth=available=>{
        if(vertical){for(const c of flexible)c.fitWidth(Math.min(c.width,available));}
        else{const excess=Math.max(0,width-available),total=flexible.reduce((sum,c)=>sum+c.width,0);for(const c of flexible)c.fitWidth(Math.max(0,c.width-excess*c.width/total));}
      };
    }else{
      width=Math.max(0,...childViews.map(c=>c.width+(propertyPoint(c.node,'Position')?.x??0)));
      height=Math.max(0,...childViews.map(c=>c.height+(propertyPoint(c.node,'Position')?.y??0)));
    }
    for(const c of childViews){
      if(type==='VoidView'||type==='CardView'||type==='StackView'||type==='ControlManager'){
        const point=propertyPoint(c.node,'Position')??{x:0,y:0};c.element.style.position='absolute';c.element.style.left=point.x+'px';c.element.style.top=point.y+'px';
      }
      e.append(c.element);
    }
    if(type==='CardView'&&node.connection){
      const group=key(node.connection),initial=Math.max(0,children.findIndex(n=>value(n,'IsVisible')!=='false'));
      const select=index=>{childViews.forEach((c,i)=>{c.element.dataset.cardSelected=String(i===index);c.element.hidden=i!==index;});};select(initial);
      if(!cards.has(group))cards.set(group,[]);cards.get(group).push({select,count:children.length,initial});
    }
    if(type==='FingerView'&&node.connection){
      const index=Number(value(node,'IndexExpression','-1'));
      if(Number.isInteger(index)&&index>=0){
        const button=make(doc,'button','live-device-finger',viewId||node.children.find(n=>value(n,'ViewId'))?.properties.ViewId?.attributes.Value||'Details');button.type='button';
        button.setAttribute('aria-label',`Show ${label(children[0]??node)} details`);e.prepend(button);
        e.classList.add('live-device-module');
        fingers.push({button,element:e,group:key(node.connection),index});
      }
    }
    if(continuous.has(type)||toggles.has(type)||menus.has(type)){
      controls++;e.classList.add('live-device-control');
      const binding=node.connection?resolveBinding(node.connection,node,{stateExpressions}):null;
      const verified=binding?.verified===true&&(!stateExpressions.length||binding.handlesExpressions===true);
      const read=()=>binding?.getState?.()??{enabled:verified,known:verified,value:binding?.value,initial:binding?.value};
      let state=read(),enabled=verified&&state.enabled;
      const title=label(node),numeric=continuous.has(type);
      const validRange=Number.isFinite(binding?.min)&&Number.isFinite(binding?.max)&&binding.min<binding.max;
      const validOptions=Array.isArray(binding?.options)&&binding.options.length>0;
      let control;
      const change=guard(v=>enabled&&binding.onChange?.(v));
      if(type==='LoadableCombiSliderSmall'){
        control=createDial(doc,{label:title,min:validRange?binding.min:0,max:validRange?binding.max:1,value:state.known?state.value:0,step:validRange?binding.step??'any':'any',unit:binding?.unit??'',display:binding?.display,disabled:!enabled,onInput:guard(v=>enabled&&binding.onInput?.(v)),onChange:change,onCancel:guard(v=>binding.onCancel?.(v))});
      }else if(numeric){control=createNumber(doc,{label:title,min:validRange?binding.min:undefined,max:validRange?binding.max:undefined,value:state.known?state.value:0,step:binding?.step??'any',display:binding?.display,disabled:!enabled,onChange:change});}
      else if(type==='RadioButtonControlModulated'&&node.text('FalseText')&&node.text('TrueText')){control=createRadioGroup(doc,{label:title,options:[{value:0,label:node.text('FalseText')},{value:1,label:node.text('TrueText')}],value:Number(!!state.value),disabled:!enabled,onChange:change});}
      else if(type==='RadioButtonControlModulated'&&node.connection?.expression.endsWith('LFOSyncToggle')){
        control=createRadioGroup(doc,{label:title,options:[{value:0,label:'Hz'},{value:1,label:'Tempo sync'}],value:Number(!!state.value),vertical:true,disabled:!enabled,onChange:change});
        const sync=control.element.lastElementChild,note=doc.createElementNS('http://www.w3.org/2000/svg','svg'),path=doc.createElementNS('http://www.w3.org/2000/svg','path');
        note.setAttribute('viewBox','0 0 12 12');note.setAttribute('aria-hidden','true');path.setAttribute('d','M7 1v7.3a2 1.4 0 1 1-1-1.2V1zm0 0c0 2 3 1.4 3 4H9C9 3.5 7 3.8 7 2Z');path.setAttribute('fill','currentColor');note.append(path);sync.replaceChildren(note);
      }
      else if(toggles.has(type)){
        const small=propertyPoint(node,'Size'),checkbox=!node.text('TrueText')&&small?.x<=14&&small?.y<=14;
        control=createToggle(doc,{label:checkbox?'':node.text('TrueText')||title,checked:state.known?!!state.value:false,disabled:!enabled,onChange:change});
        if(checkbox){control.element.setAttribute('aria-label',title);control.element.classList.add('live-device-checkbox');}
      }
      else control=createMenu(doc,{label:title,options:validOptions?binding.options:['--'],value:state.known?state.value:'--',disabled:!enabled,onChange:change});
      if(!verified)unresolved++;
      const refresh=()=>{
        state=read();enabled=verified&&state.enabled;
        if(numeric)enabled=enabled&&validRange&&Number.isFinite(state.value)&&state.value>=binding.min&&state.value<=binding.max;
        if(menus.has(type))enabled=enabled&&validOptions;
        if(control.setDisabled)control.setDisabled(!enabled);else (control.input??control.element).disabled=!enabled;
        e.classList.toggle('live-device-unresolved',!state.known);
        e.classList.toggle('live-device-pending',!!state.pending);
        e.title=!verified?`${title}: mapping or conversion is unresolved.`:!state.known?`${title}: start audio to connect.`:binding?.display?.format?`${title}: ${binding.display.format(state.value)}`:binding?.unit?title:`${title}: native parameter scale ${binding.min} to ${binding.max}.`;
        if(state.known){control.update(state.value);control.setDefaultValue?.(state.initial);}
        else{
          if(control.number&&!control.hasDraft?.())control.number.value='';
          else if(numeric&&!control.hasDraft?.()){control.input.value='';control.input.placeholder='--';}
          if(control.input?.type==='range')control.input.setAttribute('aria-valuetext','Unresolved model binding');
        }
      };
      refreshers.push(refresh);refresh();
      e.append(control.element);cleanup.push(()=>control.dispose?.());drafts.push(()=>control.hasDraft?.()??false);
    }else if(type==='AnalogAdsrEnvelopeDisplay'||type==='AnalogPitchEnvelopeDisplay'){
      const pitch=type==='AnalogPitchEnvelopeDisplay',names=pitch?{Initial:'OscillatorEnvAmount',Time:'OscillatorEnvTime'}:Object.fromEntries(['AttackTime','DecayTime','SustainLevel','SustainTime','ReleaseTime','ExponentialSlope','Loop','FreeRun'].map(name=>[name,name]));
      const scope=node.connection&&node.connection.expression!=='doc'?[...node.scope,node.connection.expression]:node.scope;
      const bindings=Object.fromEntries(Object.entries(names).map(([name,expression])=>[name,resolveBinding({scope,expression,resource:node.resource},node,{stateExpressions})]));
      const graph=createLiveEnvelopeEditor(doc,{kind:pitch?'pitch':'adsr',bindings,onError});
      e.append(graph.element);refreshers.push(graph.refresh);cleanup.push(graph.dispose);drafts.push(graph.hasDraft);
    }else if(type==='RadioButtonControlManager'&&node.resource==='Devices/UltraAnalog/GlobalDetail.xml'&&node.connection?.expression==='SelectedGlobalMpeFinger'){
      const group=key(node.connection),control=createRadioGroup(doc,{label:'Global details',options:[{value:0,label:'Global'},{value:1,label:'MPE'}],value:0,onChange:index=>selectPage(group,index)});
      e.classList.add('live-device-navigation');e.append(control.element);selectors.push({group,control});cleanup.push(control.dispose);
    }else if(type==='TextField'){e.classList.add('live-device-text');e.textContent=node.text('Text');width=width||Math.ceil(textMeasure?.measureText(e.textContent).width??e.textContent.length*6);height=height||11;}
    else if(type==='SeparatorView')e.classList.add('live-device-separator');
    else if(type==='BitmapView'){
      const bitmap=value(node,'BitmapName');
      if(bitmap&&graphics?.has(bitmap)&&bitmap.endsWith('.png')){
        const url=URL.createObjectURL(new Blob([graphics.read(bitmap)],{type:'image/png'})),image=make(doc,'img');image.src=url;image.alt='';e.append(image);cleanup.push(()=>URL.revokeObjectURL(url));
      }else{e.classList.add('live-device-unimplemented');e.textContent=bitmap||'Image';unsupported.add(type);}
    }else if(type==='HorizSpacingView'||type==='VertSpacingView'){
      width=type==='HorizSpacingView'?4:0;height=type==='VertSpacingView'?4:0;
    }else if(!containers.has(type)){
      unsupported.add(type);e.classList.add('live-device-unimplemented');e.textContent=type==='RadioButtonControlManager'?'Tabs unavailable':type.replace(/^Analog/,'').replace(/Display$/,'');e.title=`${type}: compiled Live drawing behavior is not implemented.`;
    }
    const border=node.properties.Border?.attributes;
    if(type==='BorderedCellView'){
      e.classList.add('live-device-cell');
      const padding=['Top','Right','Bottom','Left'].map(k=>Math.min(16,Math.max(0,Number(border?.[k])||0)));
      e.style.padding=padding.map(n=>n+'px').join(' ');width+=padding[1]+padding[3];height+=padding[0]+padding[2];
    }
    if(!fitWidth&&['LoadableView','EmbeddedLoadableView','BorderedCellView','CardView'].includes(type)){
      const flexible=childViews.filter(c=>c.fitWidth),inset=type==='BorderedCellView'?parseFloat(e.style.paddingLeft)+parseFloat(e.style.paddingRight):0;
      if(flexible.length)fitWidth=available=>{for(const c of flexible)c.fitWidth(Math.max(0,Math.min(c.width,available-inset)));};
    }
    const size=propertyPoint(node,'Size');
    // Box Size is a natural minimum; FixedLength below is the explicit constraint.
    width=naturalText&&type==='TextField'?Math.ceil(textMeasure?.measureText(e.textContent).width??e.textContent.length*6):horizontal||vertical?Math.max(size?.x||0,width):size?.x||width;height=horizontal||vertical?Math.max(size?.y||0,height):size?.y||height;
    if(type==='ControlManager'&&size?.x){for(const c of childViews){const available=size.x-(propertyPoint(c.node,'Position')?.x??0);if(c.fitWidth&&c.width>available)c.fitWidth(available);}}
    for(const [name,dimension]of [['HorizResizePolicy','width'],['VertResizePolicy','height']]){
      const policy=node.properties[name]?.attributes,length=Number(policy?.Value1);
      if(policy?.PolicyName==='FixedLength'&&Number.isFinite(length)&&length>=0&&length<=4096){if(dimension==='width')width=length;else height=length;}
    }
    if(type==='EmbeddedLoadableView'&&size?.x&&fitWidth)fitWidth(width);
    if(type==='EmbeddedLoadableView'&&(size?.x||size?.y))e.style.overflow='auto';
    // A declared zero is the native layout's natural-size request.
    if(!width&&(continuous.has(type)||toggles.has(type)||menus.has(type)))width=40;
    if(!height&&(continuous.has(type)||toggles.has(type)||menus.has(type)))height=type==='LoadableCombiSliderSmall'?36:15;
    if(width)e.style.width=width+'px';if(height)e.style.height=height+'px';
    if(value(node,'IsVisible')==='false')e.hidden=true;
    const visibility=ownExpressions.filter(expression=>expression.name==='ShowWhen');
    if(evaluateExpression&&visibility.length)refreshers.push(()=>{e.hidden=e.dataset.cardSelected==='false'||!visibility.every(expression=>!!evaluateExpression(expression,{connection:node.connection}));});
    return{element:e,width,height,node,fitWidth:fitWidth?function(available){fitWidth(available);width=available;this.width=available;e.style.width=available+'px';}:null};
  }
  function selectPage(group,index){
    for(const target of cards.get(group)??[])if(index>=0&&index<target.count)target.select(index);
    for(const finger of fingers)if(finger.group===group){finger.button.setAttribute('aria-pressed',String(finger.index===index));finger.element.classList.toggle('is-selected',finger.index===index);}
    for(const selector of selectors)if(selector.group===group)selector.control.update(index);
  }
  const result=render(layout.root),element=make(doc,'div','live-device-view');element.append(result.element);
  for(const finger of fingers){
    const targets=cards.get(finger.group)??[];
    const select=()=>selectPage(finger.group,finger.index);
    finger.button.disabled=!targets.length;finger.button.setAttribute('aria-pressed',String(targets.some(t=>t.initial===finger.index)));
    finger.element.classList.toggle('is-selected',targets.some(t=>t.initial===finger.index));
    finger.button.addEventListener('click',select);cleanup.push(()=>finger.button.removeEventListener('click',select));
    if(targets.length){
      finger.element.addEventListener('pointerdown',select,true);finger.element.addEventListener('focusin',select);
      cleanup.push(()=>{finger.element.removeEventListener('pointerdown',select,true);finger.element.removeEventListener('focusin',select);});
    }
  }
  for(const selector of selectors){const targets=cards.get(selector.group)??[];selector.control.setDisabled(!targets.length);selector.control.update(targets[0]?.initial??0);}
  const refresh=()=>{if(!disposed)for(const update of refreshers)update();};refresh();
  return{element,refresh,hasDraft:()=>drafts.some(read=>read()),report:{controls,unresolved,unsupportedClasses:[...unsupported].sort(),warnings:layout.warnings},dispose(){if(disposed)return;disposed=true;for(const release of cleanup)release();}};
}
