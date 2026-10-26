import {commentBubbleGeometry} from './canvas-comment-ui.mjs';

const cssColor=value=>value?`rgba(${value.slice(0,3).map(component=>component*255).join(',')},${value[3]})`:'';
const variables={textcolor:'--node-text',blinkcolor:'--blink-color',outlinecolor:'--bang-outline',checkedcolor:'--checked-color',uncheckedcolor:'--unchecked-color',tricolor:'--triangle-color',knobcolor:'--knob-color',elementcolor:'--element-color'};

export function applyNodeAppearance(view,node,doc) {
  const {element}=view,style={...node.style,...view.resizePreview},ranged=['slider','gain'].includes(node.type);
  if(style.width!==undefined){
    element.style.width=`${Math.max(style.width,view.minimumWidth)}px`;
  }
  element.style.minWidth=style.width!==undefined?'12px':'';
  element.style.height=style.height!==undefined?`${style.height}px`:'';
  const width=element.offsetWidth||style.width||parseFloat(element.style.width),height=element.offsetHeight||style.height||(node.type==='gain'?100:24);
  element.style.setProperty('--control-size',`${Math.min(width,height)}px`);
  element.style.backgroundColor=cssColor(style.bgcolor);
  element.style.borderColor=cssColor(style.bordercolor??style.color);
  element.style.fontSize=style.fontsize!==undefined?`${style.fontsize}px`:'';
  for(const [key,variable] of Object.entries(variables)){
    if(style[key])element.style.setProperty(variable,cssColor(style[key]));else element.style.removeProperty(variable);
  }
  element.classList.toggle('hide-number-triangle',style.triangle===0);
  if(node.type==='comment'){
    const bubble=style.bubble===1;view.header.style.padding='';element.classList.toggle('comment-bubble',bubble);
    if(bubble){
      if(!view.commentOutline){
        const outline=doc.createElementNS('http://www.w3.org/2000/svg','svg'),path=doc.createElementNS('http://www.w3.org/2000/svg','path');
        outline.setAttribute('class','comment-outline');outline.setAttribute('aria-hidden','true');outline.setAttribute('focusable','false');
        outline.append(path);element.append(outline);view.commentOutline={outline,path};
      }
      const side=style.bubbleside??1,point=style.bubblepoint??.5;
      const bubbleWidth=element.offsetWidth||width,bubbleHeight=style.height??Math.max(48,element.offsetHeight||height);
      const padding=commentBubbleGeometry(bubbleWidth,bubbleHeight,side,point).padding;
      view.header.style.padding=padding.map(value=>`${value}px`).join(' ');
      const actualWidth=element.offsetWidth||bubbleWidth,actualHeight=element.offsetHeight||bubbleHeight;
      const geometry=commentBubbleGeometry(actualWidth,actualHeight,side,point),{outline,path}=view.commentOutline;
      outline.removeAttribute('hidden');outline.setAttribute('viewBox',`0 0 ${actualWidth} ${actualHeight}`);
      outline.style.fill=cssColor(style.bgcolor);outline.style.stroke=cssColor(style.color);
      path.setAttribute('d',geometry.path);view.header.style.padding=geometry.padding.map(value=>`${value}px`).join(' ');
      element.style.backgroundColor='transparent';element.style.borderColor='transparent';
    }else if(view.commentOutline){
      const {outline,path}=view.commentOutline;outline.setAttribute('hidden','');outline.style.fill='';outline.style.stroke='';path.setAttribute('d','');
    }
  }
  if(ranged){
    const vertical=style.orientation===2||(style.orientation!==1&&height>width);
    element.classList.toggle('vertical-control',vertical);
    const input=view.inputs.get('value');input.setAttribute('aria-orientation',vertical?'vertical':'horizontal');
    element.classList.add('custom-range-colors');
    if(!view.appearanceRange){
      const track=doc.createElement('span'),thumb=doc.createElement('span');track.className='appearance-range-track';thumb.className='appearance-range-thumb';
      track.setAttribute('aria-hidden','true');thumb.setAttribute('aria-hidden','true');element.append(track,thumb);view.appearanceRange={track,thumb};
    }
    if(view.appearanceRange){
      const min=Number(input.min),max=Number(input.max),position=max===min?0:Math.max(0,Math.min(1,(Number(input.value)-min)/(max-min)));
      element.style.setProperty('--slider-position',String(position));
      const scaled=node.type==='slider'?Math.max(-100000,Math.min(100000,Number(input.value)*node.params.mult+node.params.min)):Number(input.value);
      input.setAttribute('aria-valuetext',String(node.type==='slider'&&!node.params.floatoutput?Math.trunc(scaled):scaled));
    }
  }
}
