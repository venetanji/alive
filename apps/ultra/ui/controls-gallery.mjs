import {createDial,createSlider,createToggle,createMenu,createPanel,createButton} from './live-controls.mjs';

const doc=document,changes=doc.createElement('output');changes.id='changes';changes.setAttribute('aria-live','polite');changes.textContent='Ready';window.controlChanges=[];
const changed=key=>value=>{window.controlChanges.push({key,value});changes.textContent=`${key}: ${value}`;};
const controls=[
  createDial(doc,{label:'Cutoff',min:20,max:20000,value:1200,step:1,unit:'Hz',onChange:changed('cutoff')}),
  createDial(doc,{label:'Resonance',value:.35,onChange:changed('resonance')}),
  createDial(doc,{label:'Attack',min:0,max:1000,value:18,step:1,unit:'ms',onChange:changed('attack')}),
  createDial(doc,{label:'Pan',min:-1,max:1,value:0,onChange:changed('pan')}),
  createSlider(doc,{label:'Level',value:.7,onChange:changed('level')}),
  createMenu(doc,{label:'Mode',value:'poly',options:[{value:'poly',label:'Polyphonic'},{value:'mono',label:'Monophonic'}],onChange:changed('mode')}),
];
const panel=createPanel(doc,{title:'Instrument',controls}),bypass=createToggle(doc,{label:'Bypass',onChange:changed('bypass')});panel.header.append(bypass.element);
const disabled=createDial(doc,{label:'Unavailable',value:.5,disabled:true}),reset=createButton(doc,{label:'Reset instrument',onClick:()=>controls.forEach(control=>control.reset?.())});
const states=createPanel(doc,{title:'Control States',controls:[disabled,reset]});
const note=doc.createElement('p');note.className='gallery-note';note.textContent='Original SVG and CSS controls. This gallery edits local values only.';
doc.getElementById('gallery').append(panel.element,states.element,changes,note);
