export function cablePath(a,b,midpoints){
  if(midpoints?.length){
    // Fit endpoint joins to the ports without rewriting the saved coordinates.
    const bends=[];
    for(let i=0;i<midpoints.length;i+=2)bends.push({x:midpoints[i],y:midpoints[i+1]});
    if(bends.length===1)bends.push({...bends[0]});
    bends[0].x=a.x;bends[bends.length-1].x=b.x;
    const points=[a];
    for(const p of [...bends,b]){
      const prev=points[points.length-1];
      if(p.x!==prev.x||p.y!==prev.y)points.push(p);
    }
    let path=`M ${a.x} ${a.y}`;
    for(let i=1;i<points.length-1;i++){
      const prev=points[i-1],p=points[i],next=points[i+1];
      const ix=p.x-prev.x,iy=p.y-prev.y,ox=next.x-p.x,oy=next.y-p.y;
      const incoming=Math.hypot(ix,iy),outgoing=Math.hypot(ox,oy);
      if(ix*oy===iy*ox){path+=` L ${p.x} ${p.y}`;continue;}
      // Bound the fitted 12px corner by half of either adjoining segment.
      const trim=Math.min(12,incoming/2,outgoing/2);
      path+=` L ${p.x-ix/incoming*trim} ${p.y-iy/incoming*trim}`;
      path+=` Q ${p.x} ${p.y} ${p.x+ox/outgoing*trim} ${p.y+oy/outgoing*trim}`;
    }
    return`${path} L ${b.x} ${b.y}`;
  }
  const bend=Math.max(22,Math.min(130,Math.abs(b.y-a.y)*.45));
  return`M ${a.x} ${a.y} C ${a.x} ${a.y+bend}, ${b.x} ${b.y-bend}, ${b.x} ${b.y}`;
}

export function cableBounds(edges){
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const edge of edges)for(let i=0;i<(edge.midpoints?.length??0);i+=2){
    left=Math.min(left,edge.midpoints[i]);right=Math.max(right,edge.midpoints[i]);
    top=Math.min(top,edge.midpoints[i+1]);bottom=Math.max(bottom,edge.midpoints[i+1]);
  }
  return left===Infinity?null:{left,top,right,bottom};
}
