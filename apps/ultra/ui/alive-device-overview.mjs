// The miniature mirrors mounted devices; navigation never invokes a musical command.
export function mountDeviceOverview({doc,win,chain,root,park=()=>{}}){
  if(!root||!win?.ResizeObserver||!win?.MutationObserver)return{dispose(){}};
  const strip=doc.createElement('div'),viewport=doc.createElement('span');
  strip.className='device-overview-strip';strip.inert=true;strip.setAttribute('aria-hidden','true');
  viewport.className='device-overview-window';viewport.setAttribute('aria-hidden','true');root.append(strip,viewport);
  let frame=0,drag=null,fingerprint='',disposed=false;
  const maximum=()=>Math.max(0,chain.scrollWidth-chain.clientWidth);
  const request=()=>{if(!disposed&&!frame)frame=win.requestAnimationFrame(paint);};
  function paint(){
    frame=0;root.hidden=!chain.clientWidth||!chain.clientHeight;
    if(root.hidden)return;
    const cards=[...chain.querySelectorAll('.chain-device')],width=chain.scrollWidth,height=chain.clientHeight;
    const key=JSON.stringify([chain.dataset.trackId,width,height,cards.map(card=>[card.dataset.instanceId,card.className,card.textContent,[...card.querySelectorAll('input,select')].map(e=>e.value)])]);
    if(key!==fingerprint){
      fingerprint=key;strip.replaceChildren();
      const origin=chain.getBoundingClientRect().left-chain.scrollLeft;
      for(const card of cards){
        const copy=card.cloneNode(true);copy.className='device-overview-miniature';copy.removeAttribute('data-instance-id');
        for(const element of [copy,...copy.querySelectorAll('*')]){
          element.removeAttribute('id');element.removeAttribute('name');element.removeAttribute('tabindex');element.removeAttribute('title');
          if(element.classList.contains('chain-select'))element.className='device-overview-label';
        }
        Object.assign(copy.style,{left:`${card.getBoundingClientRect().left-origin}px`,top:'0',width:`${card.offsetWidth}px`,height:`${card.offsetHeight}px`});
        strip.append(copy);
      }
    }
    Object.assign(strip.style,{width:`${width}px`,height:`${height}px`,transform:`scale(${root.clientWidth/width},${root.clientHeight/height})`});
    viewport.style.left=`${chain.scrollLeft/width*100}%`;viewport.style.width=`${Math.min(100,chain.clientWidth/width*100)}%`;
    root.setAttribute('aria-valuenow',String(maximum()?Math.round(chain.scrollLeft/maximum()*100):0));
    root.setAttribute('aria-valuetext',`${cards.length} devices; ${root.getAttribute('aria-valuenow')} percent across the chain`);
  }
  const resize=new win.ResizeObserver(request);resize.observe(chain);resize.observe(root);
  const mutations=new win.MutationObserver(request);mutations.observe(chain,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','value']});
  const visibility=new win.MutationObserver(request);visibility.observe(doc.getElementById('device-detail'),{attributes:true,attributeFilter:['hidden']});
  function down(event){
    if(event.button!==0||drag)return;park();event.preventDefault();
    const bounds=root.getBoundingClientRect(),scale=chain.scrollWidth/bounds.width;
    drag={id:event.pointerId,x:event.clientX,left:chain.scrollLeft,original:chain.scrollLeft,scale};root.setPointerCapture(event.pointerId);
    if(event.target!==viewport)chain.scrollLeft=(event.clientX-bounds.left)*scale-chain.clientWidth/2;
    drag.left=chain.scrollLeft;request();
  }
  const move=event=>{if(drag?.id===event.pointerId){chain.scrollLeft=drag.left+(event.clientX-drag.x)*drag.scale;request();}};
  function end(event){if(drag?.id!==event.pointerId)return;const id=drag.id;drag=null;if(root.hasPointerCapture(id))root.releasePointerCapture(id);}
  function cancel(){if(!drag)return;chain.scrollLeft=drag.original;end({pointerId:drag.id});request();}
  function key(event){
    if(event.key==='Escape'&&drag){event.preventDefault();event.stopImmediatePropagation();cancel();return;}
    if(event.target!==root||event.ctrlKey||event.metaKey||event.altKey||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();chain.scrollLeft=event.key==='Home'?0:event.key==='End'?maximum():chain.scrollLeft+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?chain.clientWidth:60);request();
  }
  function wheel(event){
    if(!maximum()||event.ctrlKey||event.metaKey||(!event.deltaX&&!event.shiftKey))return;
    chain.scrollLeft+=event.deltaX||event.deltaY;event.preventDefault();request();
  }
  root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move);root.addEventListener('pointerup',end);root.addEventListener('pointercancel',cancel);root.addEventListener('lostpointercapture',cancel);
  doc.addEventListener('keydown',key,true);win.addEventListener('blur',cancel);chain.addEventListener('scroll',request);chain.addEventListener('input',request);chain.addEventListener('wheel',wheel,{passive:false});request();
  return{dispose(){disposed=true;if(frame)win.cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();visibility.disconnect();root.removeEventListener('pointerdown',down);root.removeEventListener('pointermove',move);root.removeEventListener('pointerup',end);root.removeEventListener('pointercancel',cancel);root.removeEventListener('lostpointercapture',cancel);doc.removeEventListener('keydown',key,true);win.removeEventListener('blur',cancel);chain.removeEventListener('scroll',request);chain.removeEventListener('input',request);chain.removeEventListener('wheel',wheel);}};
}
