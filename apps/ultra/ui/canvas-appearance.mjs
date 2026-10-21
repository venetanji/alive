// Max attribute names with local width/height projected from patching_rect.
// Omitted fields inherit the renderer theme; no defaults are saved in the patch.
const color=(key,label)=>({key,label,kind:'color',min:0,max:1,step:0.01});
const number=(key,label,min,max,step=1)=>({key,label,kind:'number',min,max,step});
const choice=(key,label,labels)=>({key,label,kind:'enum',min:0,max:labels.length-1,step:1,options:labels.map((label,value)=>Object.freeze({value,label}))});
const common=[
  number('width','Width',12,1200),number('height','Height',12,800),number('fontsize','Font Size',8,48,0.5),
  color('bgcolor','Background Color'),color('textcolor','Text Color'),color('color','Object Outline Color'),
];
const specific={
  bang:[color('blinkcolor','Blink Color'),color('outlinecolor','Button Outline Color')],
  toggle:[color('bordercolor','Border Color'),color('checkedcolor','Checked Color'),color('uncheckedcolor','Unchecked Color')],
  number:[color('bordercolor','Border Color'),color('tricolor','Triangle Color'),choice('triangle','Draw Triangle',['Off','On'])],
  flonum:[color('bordercolor','Border Color'),color('tricolor','Triangle Color'),choice('triangle','Draw Triangle',['Off','On'])],
  slider:[color('bordercolor','Border Color'),color('knobcolor','Knob Color'),color('elementcolor','Element Color'),choice('orientation','Orientation',['Automatic','Horizontal','Vertical'])],
  gain:[color('bordercolor','Border Color'),color('knobcolor','Knob Color'),choice('orientation','Orientation',['Automatic','Horizontal','Vertical'])],
};
const generic=['message','add','multiply','metro','counter','chord','makenote','midiin','voice','join','dac','int','float','pack','unpack','select','route','trigger','line'];
const fieldsByType=Object.freeze(Object.fromEntries([...generic,...Object.keys(specific)].map(type=>[
  type,Object.freeze([...common,...(specific[type]??[])].map(field=>Object.freeze({...field,...(field.options?{options:Object.freeze(field.options)}:{})}))),
])));

export function appearanceFields(type) {
  if(!Object.hasOwn(fieldsByType,type))throw Error(`Unknown object type: ${type}.`);
  return fieldsByType[type];
}

export function validateStyle(type,style) {
  const fields=appearanceFields(type);
  if(!style||typeof style!=='object'||Array.isArray(style)||![Object.prototype,null].includes(Object.getPrototypeOf(style)))throw Error(`${type} style must be an object.`);
  const result={};
  for(const [key,value] of Object.entries(style)) {
    const field=fields.find(field=>field.key===key);
    if(!field)throw Error(`Unknown ${type} style attribute: ${key}.`);
    if(field.kind==='color') {
      const rgba=Array.isArray(value)?[...value]:null;
      if(!rgba||rgba.length!==4||rgba.some(component=>typeof component!=='number'||!Number.isFinite(component)||component<0||component>1))throw Error(`${type} style ${key} must contain four RGBA numbers from 0 to 1.`);
      result[key]=rgba;
    } else {
      if(typeof value!=='number'||!Number.isFinite(value)||value<field.min||value>field.max||(field.kind==='enum'&&!Number.isInteger(value)))throw Error(`${type} style ${key} must be ${field.kind==='enum'?'an integer':'a finite number'} from ${field.min} to ${field.max}.`);
      result[key]=value;
    }
  }
  return result;
}
