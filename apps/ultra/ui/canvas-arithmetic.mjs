// Creation defaults are separate from the saved legacy Add/Multiply defaults.
export const ARITHMETIC=Object.freeze({
  add:{name:'+',rhs:0,legacy:true},multiply:{name:'*',rhs:0,legacy:true},
  subtract:{name:'-',rhs:0},divide:{name:'/',rhs:1},modulo:{name:'%',rhs:1},
  reverse_subtract:{name:'!-',rhs:0},reverse_divide:{name:'!/',rhs:1},abs:{name:'abs'},
});
export const isArithmetic=type=>Object.hasOwn(ARITHMETIC,type);
export const arithmeticModeChoices=type=>[
  ...(ARITHMETIC[type]?.legacy?[[0,'Legacy Ultra']]:[]),[1,'Integer'],
  ...(ARITHMETIC[type]?.integerOnly?[]:[[2,'Float']]),
];
export function arithmeticCreationParams(type){
  const s=ARITHMETIC[type];
  return s?{...(type==='abs'?{}:{rhs:s.rhs}),numericmode:1}:{};
}
export function arithmeticObjectText(node){
  const s=ARITHMETIC[node.type],mode=node.params.numericmode??0;
  const value=node.type==='abs'?0:node.params.rhs;
  let token=String(value);
  // Max creation does not treat exponent syntax as a floating argument.
  if(mode!==0&&/[eE]/.test(token)){
    const [mantissa,exponent]=token.toLowerCase().split('e'),negative=mantissa.startsWith('-');
    const unsigned=negative?mantissa.slice(1):mantissa,digits=unsigned.replace('.','');
    const point=(unsigned.indexOf('.')<0?unsigned.length:unsigned.indexOf('.'))+Number(exponent);
    token=(negative?'-':'')+(point<=0?'0.'+'0'.repeat(-point)+digits:point>=digits.length?digits+'0'.repeat(point-digits.length):digits.slice(0,point)+'.'+digits.slice(point));
  }
  if(mode===2&&!token.includes('.'))token+='.';
  return `${mode===0?node.type+'.legacy':s.name} ${token}`;
}
