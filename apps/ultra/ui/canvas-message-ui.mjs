const numberAtom=/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
const placeholder=/^\$[12]$/;

export function parseMessageTemplate(text) {
  if(typeof text!=='string'||text.length>127||/[^\x20-\x7e\t\r\n]|[,;'"\\]/.test(text))throw Error('Message text must be at most 127 ASCII bytes, without quotes, backslashes, commas or semicolons.');
  const words=text.trim()?text.trim().split(/\s+/):[];
  for(const [index,word] of words.entries()){
    if(word.includes('$')&&!placeholder.test(word))throw Error('Message substitution supports only complete $1 and $2 atoms.');
    const forced=words[0]==='symbol'&&index===1;
    if(placeholder.test(word)){
      if(index===0||forced)throw Error('Message substitution requires a fixed selector or numeric first atom.');
      continue;
    }
    if(!forced&&numberAtom.test(word)){
      if(!Number.isFinite(Number(word))||Math.abs(Number(word))>100000)throw Error('Message values must be finite numbers from -100000 to 100000.');
    }else if(word.length>31||(!forced&&(/^[\d+.-]/.test(word)||/^(?:nan|inf(?:inity)?)$/i.test(word))))throw Error('Message symbols must contain at most 31 ASCII bytes; numeric atoms must be valid finite numbers.');
  }
  if(words[0]==='bang'&&words.length!==1)throw Error('bang does not accept arguments.');
  if(words[0]==='symbol'&&words.length!==2)throw Error('symbol requires exactly one symbol atom.');
  if(words.length-(numberAtom.test(words[0]??'')?0:1)>8)throw Error('Message supports at most eight atoms.');
  return words;
}

// Snapshots are non-consuming and can arrive after an authoring commit. Keep
// the last matching display until the callback publishes that edit's serial.
export function mergeMessageDisplays(previous,snapshot,{revision,serial=0,ids,pending=new Set()}) {
  const result=Object.fromEntries(Object.entries(previous).filter(([id,row])=>row.revision===revision&&ids.has(Number(id))&&!pending.has(Number(id))));
  if(snapshot?.revision!==revision||!Number.isSafeInteger(snapshot.text_edit_serial)||snapshot.text_edit_serial<serial||!Array.isArray(snapshot.nodes))return result;
  for(const row of snapshot.nodes){
    if(!ids.has(row.id)||pending.has(row.id)||!Number.isSafeInteger(row.generation)||row.generation<0||typeof row.empty!=='boolean'||typeof row.text!=='string'||row.text.length>287||/[^\x20-\x7e\t\r\n]/.test(row.text))continue;
    if(row.generation<(result[row.id]?.generation??-1))continue;
    result[row.id]={...row,revision,serial:snapshot.text_edit_serial};
  }
  return result;
}
