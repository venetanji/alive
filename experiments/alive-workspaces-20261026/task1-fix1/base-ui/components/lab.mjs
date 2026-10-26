import {createComponent} from './index.mjs';
const definitions=[
 ['objects',{id:'object',type:'object',label:'Object text',value:'osc~ 440'}],
 ['objects',{id:'message',type:'message',label:'Message',value:'60 100'}],
 ['objects',{id:'bang',type:'button',label:'Bang'}],
 ['objects',{id:'toggle',type:'toggle',label:'Toggle'}],
 ['values',{id:'integer',type:'number',label:'Integer',value:60,min:0,max:127}],
 ['values',{id:'float',type:'flonum',label:'Float',value:.5,min:-1,max:1,step:.01}],
 ['values',{id:'slider',type:'slider',label:'Preview level',value:.4,min:0,max:1,step:.01}],
 ['values',{id:'meter',type:'meter',label:'UI preview only',value:.4}],
 ['ports',{id:'inlet',type:'inlet',label:'frequency'}],
 ['ports',{id:'outlet',type:'outlet',label:'signal'}],
];
const components=new Map(),log=[];
function onEvent(event){
 log.push(JSON.stringify(event));if(log.length>20)log.shift();document.querySelector('#events').textContent=log.join('\n');
 if(event.id==='slider'&&(event.action==='input'||event.action==='change'))components.get('meter').setState({value:event.value});
}
function reset(){
 for(const c of components.values())c.destroy();components.clear();
 for(const [group,state] of definitions){const c=createComponent(state,{onEvent});components.set(state.id,c);document.getElementById(group).append(c.element);}
 document.querySelector('#disabled').checked=false;log.length=0;document.querySelector('#events').textContent='No events yet.';snapshot();
}
function snapshot(){document.querySelector('#state').textContent=JSON.stringify([...components.values()].map(c=>c.getState()),null,2);}
document.querySelector('#disabled').addEventListener('change',e=>{for(const c of components.values())c.setState({disabled:e.target.checked});snapshot();});
document.querySelector('#reset').addEventListener('click',reset);
document.querySelector('#snapshot').addEventListener('click',snapshot);
document.querySelector('#clear').addEventListener('click',()=>{log.length=0;document.querySelector('#events').textContent='No events yet.';});
reset();document.querySelector('#load-status').textContent='Ready. All interactions are local UI previews.';
