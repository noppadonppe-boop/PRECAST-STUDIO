export function orderedContactEdges(edges,tol=1e-6){
 if(!edges.length)throw Error('Empty contact chain');
 const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<tol,starts=edges.filter(e=>!edges.some(q=>same(q[1],e[0])));
 if(starts.length!==1)throw Error('Contact chain must have one start');
 const result=[starts[0]],remaining=new Set(edges);remaining.delete(starts[0]);
 while(remaining.size){const next=[...remaining].filter(e=>same(e[0],result.at(-1)[1]));if(next.length!==1)throw Error('Disconnected or branched contact chain');result.push(next[0]);remaining.delete(next[0]);}
 return result;
}
