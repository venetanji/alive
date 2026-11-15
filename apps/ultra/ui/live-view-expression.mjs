// A bounded interpreter for resource expressions; resource text is never executable JS.
export function compileViewExpression(source){
  const invalid=()=>{throw Error('Unsupported Live view expression.');};
  if(typeof source!=='string'||!source.length||source.length>512)invalid();
  const tokens=[];let at=0;
  const token=/\s*(?:([A-Za-z_][A-Za-z_0-9]*(?:\[\d+\])?(?:\.[A-Za-z_][A-Za-z_0-9]*(?:\[\d+\])?)*)|(\d+(?:\.\d+)?)|(==|!=|<=|>=|&&|\|\||[!<>&|?:()+-]))/y;
  while(at<source.length){
    if(!source.slice(at).trim())break;
    token.lastIndex=at;const match=token.exec(source);if(!match)invalid();
    tokens.push(match[1]?{name:match[1]}:match[2]?{number:Number(match[2])}:match[3]);at=token.lastIndex;
    if(tokens.length>128)invalid();
  }
  let cursor=0,depth=0;
  const take=text=>tokens[cursor]===text?(cursor++,true):false;
  function primary(){
    if(++depth>32)invalid();let result;
    if(take('!'))result=['!',primary()];
    else if(take('-'))result=['-',primary()];
    else if(take('+'))result=primary();
    else if(take('(')){result=ternary();if(!take(')'))invalid();}
    else {const t=tokens[cursor++];if(!t||typeof t==='string')invalid();result=t;}
    depth--;return result;
  }
  const chain=(next,ops)=>()=>{let left=next();while(ops.includes(tokens[cursor])){const op=tokens[cursor++];left=[op,left,next()];}return left;};
  const compare=chain(primary,['==','!=','<','>','<=','>=']);
  const and=chain(compare,['&','&&']),or=chain(and,['|','||']);
  function ternary(){const condition=or();if(!take('?'))return condition;const yes=ternary();if(!take(':'))invalid();return ['?:',condition,yes,ternary()];}
  const tree=ternary();if(cursor!==tokens.length)invalid();
  function evaluate(node,resolve){
    if(!Array.isArray(node)){
      if('number'in node)return node.number;
      if(node.name==='KEnabled')return 1;if(node.name==='KIrrelevant')return 0;
      const value=resolve(node.name);return typeof value==='boolean'||Number.isFinite(value)?value:undefined;
    }
    const [op,a,b,c]=node,x=evaluate(a,resolve);
    if(op==='!')return x===undefined?undefined:!x;
    if(op==='-')return x===undefined?undefined:-x;
    if(op==='?:')return x===undefined?undefined:evaluate(x?b:c,resolve);
    const y=evaluate(b,resolve);
    if(op==='&'||op==='&&'){if(x!==undefined&&!x||y!==undefined&&!y)return false;return x===undefined||y===undefined?undefined:!!(x&&y);}
    if(op==='|'||op==='||'){if(x!==undefined&&x||y!==undefined&&y)return true;return x===undefined||y===undefined?undefined:!!(x||y);}
    if(x===undefined||y===undefined)return undefined;
    switch(op){case '==':return Number(x)===Number(y);case '!=':return Number(x)!==Number(y);case '<':return x<y;case '>':return x>y;case '<=':return x<=y;case '>=':return x>=y;default:return undefined;}
  }
  return resolve=>evaluate(tree,resolve);
}
