export function commentBubbleGeometry(width,height,side=1,point=.5) {
  // Keep the saved rectangle authoritative, scaling the arrow only for tiny boxes.
  const edge=.5,depth=Math.min(15,Math.max(0,(side%2?width:height)-6));
  const left=edge+(side===1?depth:0),top=edge+(side===0?depth:0);
  const right=width-edge-(side===3?depth:0),bottom=height-edge-(side===2?depth:0);
  const radius=Math.min(10,(right-left)/3,(bottom-top)/3),vertical=side%2===1;
  const start=vertical?top:left,end=vertical?bottom:right,length=vertical?height:width;
  const margin=Math.min(5,length/2),position=margin+(length-margin*2)*point;
  const half=Math.min(7.5,Math.max(0,(end-start-radius*2)/2));
  const center=Math.max(start+radius+half,Math.min(end-radius-half,position));
  const low=center-half,high=center+half;
  const tip={x:side===1?edge:side===3?width-edge:position,y:side===0?edge:side===2?height-edge:position};
  const n=value=>Number(value.toFixed(3)),p=(x,y)=>`${n(x)} ${n(y)}`;
  const commands=[`M ${p(left+radius,top)}`];
  if(side===0)commands.push(`L ${p(low,top)} L ${p(tip.x,tip.y)} L ${p(high,top)}`);
  commands.push(`L ${p(right-radius,top)} Q ${p(right,top)} ${p(right,top+radius)}`);
  if(side===3)commands.push(`L ${p(right,low)} L ${p(tip.x,tip.y)} L ${p(right,high)}`);
  commands.push(`L ${p(right,bottom-radius)} Q ${p(right,bottom)} ${p(right-radius,bottom)}`);
  if(side===2)commands.push(`L ${p(high,bottom)} L ${p(tip.x,tip.y)} L ${p(low,bottom)}`);
  commands.push(`L ${p(left+radius,bottom)} Q ${p(left,bottom)} ${p(left,bottom-radius)}`);
  if(side===1)commands.push(`L ${p(left,high)} L ${p(tip.x,tip.y)} L ${p(left,low)}`);
  commands.push(`L ${p(left,top+radius)} Q ${p(left,top)} ${p(left+radius,top)} Z`);
  const inset=Math.min(5,(right-left)/2,(bottom-top)/2),padding=[inset,inset,inset,inset];
  padding[[0,3,2,1][side]]+=depth;
  return{path:commands.join(' '),padding,body:{x:left,y:top,width:right-left,height:bottom-top},tip};
}
