// Saved cable vertices are local authoring coordinates, never native graph data.
export function validateMidpoints(value) {
  if(!Array.isArray(value)||value.length>256||value.length%2)throw Error('Cable midpoints must be an even array of at most 256 coordinates.');
  for(const coordinate of value)if(typeof coordinate!=='number'||!Number.isFinite(coordinate)||coordinate<0||coordinate>4000)throw Error('Cable midpoint coordinates must be finite numbers from 0 to 4000.');
  return [...value];
}

export function translatedMidpoints(edge,positions,nodes) {
  if(!Object.hasOwn(edge,'midpoints'))return undefined;
  const points=validateMidpoints(edge.midpoints),moves=new Map(positions.map(position=>[position.id,position]));
  const from=nodes.find(node=>node.id===edge.from),to=nodes.find(node=>node.id===edge.to);
  const movedFrom=moves.get(edge.from),movedTo=moves.get(edge.to);
  if(!from||!to||!movedFrom||!movedTo)return points;
  const dx=movedFrom.x-from.x,dy=movedFrom.y-from.y;
  // Subtracting the same fractional drag from differently sized coordinates
  // can differ by a few ULPs. Scale tolerance to the operands, not the drag.
  const roundoff=(...values)=>2*Number.EPSILON*Math.max(1,...values.map(Math.abs));
  const tx=roundoff(from.x,to.x,movedFrom.x,movedTo.x),ty=roundoff(from.y,to.y,movedFrom.y,movedTo.y);
  if(Math.abs(dx-(movedTo.x-to.x))>tx||Math.abs(dy-(movedTo.y-to.y))>ty)return points;
  return validateMidpoints(points.map((coordinate,index)=>{
    const delta=index%2?dy:dx;if(delta===0)return coordinate;
    const next=coordinate+delta,tolerance=(index%2?ty:tx)+roundoff(coordinate,next);
    if(Math.abs(next)<=tolerance)return 0;
    if(Math.abs(next-4000)<=tolerance)return 4000;
    return next;
  }));
}
