export const TYPES=['note','faust','gain','dac'];
export const LABELS={note:'note.in',faust:'faust.voice~',gain:'gain~',dac:'audio.out~'};
export function starter(){return {version:1,nodes:[0,1].flatMap(device=>TYPES.map((type,i)=>({id:`${device}-${type}`,type,device,x:90+device*360,y:90+i*132,level:100}))),edges:[0,1].flatMap(d=>TYPES.slice(0,-1).map((t,i)=>({from:`${d}-${t}`,to:`${d}-${TYPES[i+1]}`})))};}
export function validate(p){
 if(!p||p.version!==1||!Array.isArray(p.nodes)||!Array.isArray(p.edges)||p.nodes.length>8||p.edges.length>6)throw Error('Expected an Ultra v1 patch, maximum eight objects and six cables.');
 const ids=new Set();for(const n of p.nodes){if(typeof n.id!=='string'||n.id.length===0||n.id.length>64||ids.has(n.id)||!TYPES.includes(n.type)||![0,1].includes(n.device)||!Number.isFinite(n.x)||!Number.isFinite(n.y)||n.x<0||n.y<0||n.x>4000||n.y>4000||!Number.isInteger(n.level??100)||(n.level??100)<0||(n.level??100)>127)throw Error('Invalid object data.');ids.add(n.id);}
 const edges=new Set();for(const e of p.edges){const a=p.nodes.find(n=>n.id===e.from),b=p.nodes.find(n=>n.id===e.to),key=JSON.stringify([e.from,e.to]);if(!a||!b||a.device!==b.device||TYPES.indexOf(b.type)!==TYPES.indexOf(a.type)+1||edges.has(key))throw Error('Cables must connect consecutive types on the same device.');edges.add(key);}
 let mask=0;for(const d of [0,1]){const ns=p.nodes.filter(n=>n.device===d);if(TYPES.some(t=>ns.filter(n=>n.type===t).length>1))throw Error('Only one object of each type per device is supported.');if(TYPES.every(t=>ns.some(n=>n.type===t))&&TYPES.slice(0,-1).every((t,i)=>p.edges.some(e=>e.from===ns.find(n=>n.type===t).id&&e.to===ns.find(n=>n.type===TYPES[i+1]).id)))mask|=1<<d;}
 return mask;
}
export function payload(p){return {nodes:p.nodes.map(({id,type,device})=>({id,type,device})),edges:p.edges.map(({from,to})=>({from,to}))};}
