const lifetime=2000;
const tick=value=>Number.isSafeInteger(value)&&value>=0;

export function mergePrintPopups(previous,snapshot,{revision,ids,now=performance.now()}){
  const result=Object.fromEntries(Object.entries(previous).filter(([id,row])=>row.revision===revision&&ids.has(Number(id))));
  if(snapshot?.revision!==revision||!tick(snapshot.frame)||!Array.isArray(snapshot.nodes)||snapshot.nodes.length>32||!Number.isFinite(now))return result;
  const seen=new Set();
  for(const row of snapshot.nodes){
    if(!row||!Number.isInteger(row.id)||row.id<1||row.id>4294967295||seen.has(row.id)||
      !tick(row.generation)||!tick(row.frame)||row.frame>snapshot.frame||
      typeof row.enabled!=='boolean'||typeof row.has_value!=='boolean'||
      (row.has_value&&!row.enabled)||typeof row.text!=='string'||row.text.length>4096||
      /[^\x20-\x7e]/.test(row.text)||(row.has_value&&!row.text.length))return result;
    seen.add(row.id);
  }
  for(const row of snapshot.nodes){
    if(!ids.has(row.id))continue;
    const old=result[row.id];
    if(old&&row.generation<old.generation)continue;
    const remaining=Math.max(0,lifetime-(snapshot.frame-row.frame)/48);
    let expiresAt=row.enabled&&row.has_value?now+remaining:0;
    // A paused clock or repeated snapshot cannot extend an observed receipt.
    if(old?.generation===row.generation)expiresAt=Math.min(expiresAt,old.expiresAt);
    result[row.id]={...row,revision,expiresAt};
  }
  return result;
}

export function printPopupText(record,now=performance.now()){
  return record?.enabled&&record.has_value&&now<record.expiresAt?record.text:null;
}
