import {appearanceFields} from './canvas-appearance.mjs';
import {OBJECTS} from './canvas-catalog.mjs';
import {arithmeticModeChoices,isArithmetic} from './canvas-arithmetic.mjs';

const colorDefaults={bgcolor:[32/255,32/255,32/255,1],textcolor:[238/255,238/255,236/255,1],color:[0,0,0,0],bordercolor:[0,0,0,0],blinkcolor:[239/255,187/255,98/255,1],outlinecolor:[167/255,167/255,164/255,1],checkedcolor:[239/255,187/255,98/255,1],uncheckedcolor:[115/255,115/255,115/255,1],tricolor:[180/255,180/255,176/255,1],knobcolor:[145/255,185/255,237/255,1],elementcolor:[100/255,100/255,100/255,1]};
function inheritedColor(node,key){
  if(node.type==='comment'){
    if(key==='bgcolor')return node.style?.bubble?[60/255,60/255,60/255,1]:[0,0,0,0];
    if(node.style?.bubble&&['textcolor','color'].includes(key))return[217/255,217/255,217/255,1];
  }
  return colorDefaults[key];
}
const toHex=rgba=>'#'+rgba.slice(0,3).map(value=>Math.round(value*255).toString(16).padStart(2,'0')).join('');
const fromHex=value=>[1,3,5].map(offset=>parseInt(value.slice(offset,offset+2),16)/255);

export function createParameterField({doc,node,key,definition,change}){
  const label=doc.createElement('label');label.className='field';
  const name=doc.createElement('span');name.className='field-name';
  const sliderLabels={value:'Value',size:'Range Size',min:'Output Minimum',mult:'Output Multiplier',floatoutput:'Output Mode'};
  name.textContent=key==='numericmode'?'Numeric Mode':node.type==='slider'?(sliderLabels[key]??key):node.type==='print'?({label:'Label',level:'Console Level',popup:'Popup'}[key]??key):key;
  const choices=key==='numericmode'&&isArithmetic(node.type)?arithmeticModeChoices(node.type):node.type==='slider'&&key==='floatoutput'?['Integer','Float']:node.type==='print'?({level:['Message','Warning','Error','Debug'],popup:['Off','On']}[key]??null):null;
  const multiline=['text','args','channels'].includes(key),textual=multiline||['label','name'].includes(definition.kind);
  const input=doc.createElement(choices?'select':multiline?'textarea':'input');
  input.dataset.parameter=key;input.setAttribute('aria-label',`${OBJECTS[node.type].name} ${key}, selected object ${node.id}`);
  if(key==='channels')input.maxLength=127;
  if(choices){
    choices.forEach((choice,index)=>{const [value,text]=Array.isArray(choice)?choice:[index,choice];const option=doc.createElement('option');option.value=String(value);option.textContent=text;input.append(option);});
  }else if(!multiline){
    input.type=textual?'text':'number';
    if(textual)input.maxLength=node.type==='patcher'?127:31;else{input.min=definition.min;input.max=definition.max;input.step=definition.integer||(key==='rhs'&&node.params.numericmode===1)?1:'any';}
  }
  input.value=String(node.params[key]);input.addEventListener('change',()=>change(textual?input.value:Number(input.value)));
  label.append(name,input);return{label,input};
}

function sliderOutputDescription(node){
  const {min,mult,size,floatoutput}=node.params,format=value=>String(Number(Math.max(-100000,Math.min(100000,floatoutput?value:Math.trunc(value))).toPrecision(10)));
  return `${floatoutput?'Float':'Integer'} output: ${format(min)} to ${format(min+(size-1)*mult)}. Output = position * multiplier + minimum. Position runs from 0 to ${size-1}.`;
}

export function mountAppearanceFields({doc,area,node,change,reset}) {
  const make=(tag,className,text)=>{const element=doc.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;};
  const controls=new Map();let current=node,outputRange=null;
  if(node.type==='slider'){
    outputRange=make('p','panel-note');outputRange.dataset.sliderOutputRange='';area.append(outputRange);
  }
  area.append(make('h3','inspector-section','Appearance'));
  for(const field of appearanceFields(node.type)){
    const label=make('label','field'),name=make('span','field-name',field.label),input=make(field.kind==='enum'?'select':'input');
    input.dataset.style=field.key;input.setAttribute('aria-label',`${field.label}, selected object ${node.id}`);input.title=`Max attribute: ${field.key}`;
    label.append(name);
    if(field.kind==='color'){
      input.type='color';const group=make('span','appearance-color'),alpha=make('input');
      alpha.type='number';alpha.min=0;alpha.max=1;alpha.step=0.05;alpha.dataset.styleAlpha=field.key;
      alpha.setAttribute('aria-label',`${field.label} opacity, selected object ${node.id}`);
      input.addEventListener('change',()=>change(field.key,[...fromHex(input.value),(current.style?.[field.key]??inheritedColor(current,field.key))[3]]));
      alpha.addEventListener('change',()=>change(field.key,[...(current.style?.[field.key]??inheritedColor(current,field.key)).slice(0,3),Number(alpha.value)]));
      group.append(input,alpha);label.append(group);controls.set(field.key,{input,alpha,field});
    }else{
      if(field.kind==='enum'){
        const automatic=make('option','','Default');automatic.value='';input.append(automatic);
        for(const choice of field.options){const option=make('option','',choice.label);option.value=String(choice.value);input.append(option);}
      }else{input.type='number';input.min=field.min;input.max=field.max;input.step=field.step??'any';input.placeholder='Auto';}
      input.addEventListener('change',()=>change(field.key,input.value===''?null:Number(input.value)));
      label.append(input);controls.set(field.key,{input,field});
    }
    area.append(label);
  }
  const clear=make('button','panel-action','Reset appearance');clear.id='reset-appearance';clear.addEventListener('click',reset);area.append(clear);
  area.append(make('p','panel-note','Colors use Max RGBA attributes; opacity runs from 0 to 1. Blank dimensions use the object default. Appearance edits preserve the running patch.'));
  return {update(value,locked){
    current=value;
    if(outputRange)outputRange.textContent=sliderOutputDescription(current);
    for(const [key,{input,alpha,field}]of controls){
      input.disabled=locked;if(alpha)alpha.disabled=locked;
      if(field.kind==='color'){
        const rgba=current.style?.[key]??inheritedColor(current,key);
        if(doc.activeElement!==input)input.value=toHex(rgba);
        if(doc.activeElement!==alpha)alpha.value=String(rgba[3]);
      }else if(doc.activeElement!==input)input.value=String(current.style?.[key]??'');
    }
    clear.disabled=locked||!current.style;
  }};
}
