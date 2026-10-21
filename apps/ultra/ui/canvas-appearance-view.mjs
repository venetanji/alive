const cssColor=value=>value?`rgba(${value.slice(0,3).map(component=>component*255).join(',')},${value[3]})`:'';
const variables={textcolor:'--node-text',blinkcolor:'--blink-color',outlinecolor:'--bang-outline',checkedcolor:'--checked-color',uncheckedcolor:'--unchecked-color',tricolor:'--triangle-color',knobcolor:'--knob-color',elementcolor:'--element-color'};

export function applyNodeAppearance(view,node,doc) {
  const {element}=view,style=node.style??{},ranged=['slider','gain'].includes(node.type);
  if(style.width!==undefined){
    const ports=Math.max(view.ports.in.length,view.ports.out.length);
    element.style.width=`${Math.max(style.width,ports>1?ports*18:12)}px`;
  }
  element.style.minWidth=style.width!==undefined?'12px':'';
  element.style.height=style.height!==undefined?`${style.height}px`:'';
  element.style.backgroundColor=cssColor(style.bgcolor);
  element.style.borderColor=cssColor(style.bordercolor??style.color);
  element.style.fontSize=style.fontsize!==undefined?`${style.fontsize}px`:'';
  for(const [key,variable] of Object.entries(variables)){
    if(style[key])element.style.setProperty(variable,cssColor(style[key]));else element.style.removeProperty(variable);
  }
  element.classList.toggle('hide-number-triangle',style.triangle===0);
  if(ranged){
    const height=element.offsetHeight||style.height||(node.type==='gain'?100:24),width=element.offsetWidth||parseFloat(element.style.width);
    const vertical=style.orientation===2||(style.orientation!==1&&height>width);
    element.classList.toggle('vertical-control',vertical);
    const input=view.inputs.get('value');input.setAttribute('aria-orientation',vertical?'vertical':'horizontal');
    const custom=!!(style.knobcolor||style.elementcolor);element.classList.toggle('custom-range-colors',custom);
    if(custom&&!view.appearanceRange){
      const track=doc.createElement('span'),thumb=doc.createElement('span');track.className='appearance-range-track';thumb.className='appearance-range-thumb';
      track.setAttribute('aria-hidden','true');thumb.setAttribute('aria-hidden','true');element.append(track,thumb);view.appearanceRange={track,thumb};
    }
    if(view.appearanceRange){
      view.appearanceRange.track.hidden=!custom;view.appearanceRange.thumb.hidden=!custom;
      const min=Number(input.min),max=Number(input.max),position=max===min?0:Math.max(0,Math.min(1,(Number(input.value)-min)/(max-min)));
      element.style.setProperty('--slider-position',String(position));
    }
  }
}
