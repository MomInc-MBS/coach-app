// Shared-shape mechanical layout. All seams exist before a gesture is made.
import {SHAPES,fromFrame} from './portal-shapes.mjs';
import {portalWindow,shapeOutlinePts} from './portal-apertures.mjs';
export const MECHANICAL_FRAME={x0:.085,y0:.065,x1:.915,y1:.925};
const EPS=1e-7;
export const area=poly=>poly.reduce((a,p,i)=>{const q=poly[(i+1)%poly.length];return a+p[0]*q[1]-q[0]*p[1];},0)/2;
export function interiorPoint(poly){
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(let i=0;i<poly.length;i++){
  const ai=(i+poly.length-1)%poly.length,ci=(i+1)%poly.length,a=poly[ai],b=poly[i],c=poly[ci];
  if(cross(a,b,c)<=EPS)continue;
  const blocked=poly.some((p,j)=>j!==ai&&j!==i&&j!==ci&&cross(a,b,p)>=-EPS&&cross(b,c,p)>=-EPS&&cross(c,a,p)>=-EPS);
  if(!blocked)return [(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3];
 }
 throw new Error('Mechanical panel has no interior ear');
}
export function mechanicalPaths(frame=MECHANICAL_FRAME){
 return Object.entries(SHAPES).flatMap(([id,lines])=>id==='line'?[]:lines.map((l,line)=>{const points=(id==='oval'?shapeOutlinePts(id):l.points).map(p=>fromFrame(...p,frame));if(id==='oval')points.push(points[0]);return {id,line,points};}));
}
export function releasePaths(face,frame=MECHANICAL_FRAME){
 const rect={left:frame.x0*face.w,top:frame.y0*face.h,width:(frame.x1-frame.x0)*face.w,height:(frame.y1-frame.y0)*face.h};
 return ['rect','oval','up','down','vdiamond','hdiamond','x','line-lr','line-down'].map(id=>({id:'release-'+id,points:portalWindow(id,rect).pts.map(([x,y])=>[x/face.w,y/face.h])}));
}
// Split each finite segment at intersections, then walk the planar graph's bounded faces.
// Unlike cutting the slab during release, these separate pieces are manufactured at init.
export function sectionPanels(paths=mechanicalPaths()){
 const segments=[],seen=new Set(),key=p=>p.map(v=>v.toFixed(6)).join(',');
 const add=(a,b)=>{const k=[key(a),key(b)].sort().join('|');if(k!==[key(a),key(a)].join('|')&&!seen.has(k)){seen.add(k);segments.push({a,b,ts:[0,1]});}};
 const border=[[0,0],[1,0],[1,1],[0,1],[0,0]];
 [border,...paths.map(p=>p.points)].forEach(ps=>{for(let i=1;i<ps.length;i++)add(ps[i-1],ps[i]);});
 // Join the inset rectangular frame to the outer casing so the graph has no
 // disconnected outer face whose geometry would incorrectly cover inner cells.
 const rect=paths.find(p=>p.id==='rect');if(rect)for(let i=0;i<4;i++)add(border[i],rect.points[i]);
 for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
  const s=segments[i],t=segments[j],rx=s.b[0]-s.a[0],ry=s.b[1]-s.a[1],sx=t.b[0]-t.a[0],sy=t.b[1]-t.a[1],cross=rx*sy-ry*sx;
  if(Math.abs(cross)<EPS){
   const dx=t.a[0]-s.a[0],dy=t.a[1]-s.a[1];
   if(Math.abs(dx*ry-dy*rx)<EPS){
    const project=(p,a,x,y)=>(p[0]-a[0])*x/(x*x+y*y)+(p[1]-a[1])*y/(x*x+y*y);
    for(const p of [t.a,t.b]){const u=project(p,s.a,rx,ry);if(u>=0&&u<=1)s.ts.push(u);}
    for(const p of [s.a,s.b]){const v=project(p,t.a,sx,sy);if(v>=0&&v<=1)t.ts.push(v);}
   }continue;
  }
  const dx=t.a[0]-s.a[0],dy=t.a[1]-s.a[1],u=(dx*sy-dy*sx)/cross,v=(dx*ry-dy*rx)/cross;
  if(u>=-EPS&&u<=1+EPS&&v>=-EPS&&v<=1+EPS){s.ts.push(Math.max(0,Math.min(1,u)));t.ts.push(Math.max(0,Math.min(1,v)));}
 }
 const vertices=new Map(),edges=new Set(),buckets=new Map(),snap=1e-6;
 const vertex=p=>{
  const x=Math.floor(p[0]/snap),y=Math.floor(p[1]/snap);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const v of buckets.get((x+dx)+','+(y+dy))||[])if(Math.hypot(p[0]-v.p[0],p[1]-v.p[1])<=snap)return v;
  const k=String(vertices.size),v={k,p,neighbors:[]},bucket=x+','+y;vertices.set(k,v);if(!buckets.has(bucket))buckets.set(bucket,[]);buckets.get(bucket).push(v);return v;
 };
 for(const s of segments){const ts=[...new Set(s.ts.map(t=>+t.toFixed(12)))].sort((a,b)=>a-b);for(let i=1;i<ts.length;i++){
  const at=t=>[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t],a=vertex(at(ts[i-1])),b=vertex(at(ts[i])),ek=[a.k,b.k].sort().join('|');
  if(a===b||edges.has(ek))continue;edges.add(ek);a.neighbors.push(b);b.neighbors.push(a);
 }}
 for(const v of vertices.values())v.neighbors.sort((a,b)=>Math.atan2(a.p[1]-v.p[1],a.p[0]-v.p[0])-Math.atan2(b.p[1]-v.p[1],b.p[0]-v.p[0]));
 const walked=new Set(),panels=[];
 for(const a of vertices.values())for(const b of a.neighbors){
  if(walked.has(a.k+'>'+b.k))continue;let prev=a,next=b,poly=[];
  for(let n=0;n<edges.size*2+2;n++){
   const ek=prev.k+'>'+next.k;if(walked.has(ek))break;walked.add(ek);poly.push(prev.p);
   const ns=next.neighbors,index=ns.indexOf(prev),after=ns[(index-1+ns.length)%ns.length];prev=next;next=after;
   if(prev===a&&next===b)break;
  }
  if(poly.length>=3&&area(poly)>EPS)panels.push({points:poly,center:interiorPoint(poly)});
 }
 return panels;
}
export function pointOnPath(paths,face,u,v){
 let best=null;
 paths.forEach((path,pathIndex)=>{for(let i=1;i<path.points.length;i++){
  const a=path.points[i-1],b=path.points[i],dx=(b[0]-a[0])*face.w,dy=(b[1]-a[1])*face.h,len2=dx*dx+dy*dy;
  if(!len2)continue;const t=Math.max(0,Math.min(1,((u-a[0])*face.w*dx+(v-a[1])*face.h*dy)/len2)),q=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],distance=Math.hypot((u-q[0])*face.w,(v-q[1])*face.h);
  if(!best||distance<best.distance)best={pathIndex,segment:i-1,u:q[0],v:q[1],distance,tx:dx/Math.sqrt(len2),ty:dy/Math.sqrt(len2)};
 }});return best;
}
// Paired gears mesh at each drive station. Long spans and junctions are carried
// by metal transmission channels, leaving the shared shape silhouettes readable.
export function mechanicalLayout(face,paths=mechanicalPaths(),nodes=['m19']){
 const parts=[],trains=[];
 paths.forEach((path,pathIndex)=>{
  const train=[],lengths=path.points.slice(1).map((b,i)=>Math.hypot((b[0]-path.points[i][0])*face.w,(b[1]-path.points[i][1])*face.h)),length=lengths.reduce((a,b)=>a+b,0),closed=Math.hypot(path.points[0][0]-path.points.at(-1)[0],path.points[0][1]-path.points.at(-1)[1])<EPS;
  const count=Math.max(2,Math.round(length/(.5*face.w)));let segment=0,offset=0;
  for(let i=0;i<count;i++){
   const distance=(i+.5)*length/count;while(segment<lengths.length-1&&offset+lengths[segment]<distance){offset+=lengths[segment++];}
   const a=path.points[segment],b=path.points[segment+1],t=(distance-offset)/lengths[segment],tx=(b[0]-a[0])*face.w/lengths[segment],ty=(b[1]-a[1])*face.h/lengths[segment],rA=i===0?.029:.021,rB=rA,gap=(rA+rB)*face.w*.94;
   for(let k=0;k<2;k++){
    const d=(k?1:-1)*gap/2,index=parts.length,r=k?rB:rA;
    const drives=k?train.at(-1):(train.length?train.at(-2):null),driveRatio=!k&&drives!=null?parts[drives].r/r:undefined;
    parts.push({node:nodes[(i+pathIndex)%nodes.length],kind:'gear',u:a[0]+(b[0]-a[0])*t+tx*d/face.w,v:a[1]+(b[1]-a[1])*t+ty*d/face.h,r,rot:k?9:0,layer:pathIndex,pathIndex,station:i,drives,driveRatio});train.push(index);
   }
  }
  trains.push(train);
 });
 const first=trains[0]?.[0];for(const train of trains.slice(1)){const i=train[0];parts[i].drives=first;parts[i].driveRatio=parts[first].r/parts[i].r;}
 // Four larger flywheels are mounted on the casing around the shape frame.
 // They reuse the same existing kit cog and drive through their smaller axles.
 for(const [u,v] of [[MECHANICAL_FRAME.x0,MECHANICAL_FRAME.y0],[MECHANICAL_FRAME.x1,MECHANICAL_FRAME.y0],[MECHANICAL_FRAME.x1,MECHANICAL_FRAME.y1],[MECHANICAL_FRAME.x0,MECHANICAL_FRAME.y1]])parts.push({node:nodes[0],kind:'gear',u,v,r:.055,rot:0,layer:11,hub:true,pathIndex:-1,drives:first,driveRatio:parts[first].r/.055});
 return {parts,trains,paths};
}
export function signedRailImpulse(hit,du,dv,face,r,gain=2){return (du*face.w*hit.tx+dv*face.h*hit.ty)/(r*face.w)*gain;}
// Lock-ring machinery along the shape lines. Lengths/radii are face-WIDTH fractions, rot = tangent in face space.
// bolt.side: sign so that local +y*side (3D, y up = -v) withdraws toward the path centroid; in uv the withdrawn centre is c+side*throw*(sin,-cos) in face-width units.
export function mechanismLayout(face,paths=mechanicalPaths(),gearLayout=mechanicalLayout(face,paths)){
 const {parts}=gearLayout,out={tubes:[],bolts:[],pistons:[],pulleys:[],cables:[],weights:[],lamps:[],dial:[]};
 const W=(a,b)=>Math.hypot(b[0]-a[0],(b[1]-a[1])*face.h/face.w),rotOf=(a,b)=>Math.atan2((b[1]-a[1])*face.h,(b[0]-a[0])*face.w);
 const nearGear=(u,v)=>parts.reduce((best,p,i)=>W([u,v],[p.u,p.v])<W([u,v],[parts[best].u,parts[best].v])?i:best,0);
 paths.forEach((path,pathIndex)=>{
  const pts=path.points,closed=Math.hypot(pts[0][0]-pts.at(-1)[0],pts[0][1]-pts.at(-1)[1])<EPS,gs=parts.filter(p=>p.pathIndex===pathIndex),st=[];
  const body=closed?pts.slice(1):pts,cu=body.reduce((a,p)=>a+p[0],0)/body.length,cv=body.reduce((a,p)=>a+p[1],0)/body.length;
  for(let i=0;i<gs.length;i+=2){const a=gs[i],b=gs[i+1],u=(a.u+b.u)/2,v=(a.v+b.v)/2;st.push({u,v,segment:pointOnPath([path],face,u,v).segment,station:a.station,clear:(a.r+b.r)*.47+a.r});}
  for(const s of st){
   const a=pts[s.segment],b=pts[s.segment+1],rot=rotOf(a,b),L=W(a,b),at=W(a,[s.u,s.v]),to=Math.min(Math.max(at,.03),L-.03),bu=s.u+(b[0]-a[0])*(to-at)/L,bv=s.v+(b[1]-a[1])*(to-at)/L;
   out.lamps.push({u:s.u,v:s.v,r:.018,pathIndex,station:s.station});
   // a bolt on a vertex slides .03 along its segment so the withdrawn bar stays inside the polygon
   if(closed)out.bolts.push({u:L>.06?bu:s.u,v:L>.06?bv:s.v,rot,r:.02,pathIndex,station:s.station,throw:.025,side:Math.sign(Math.sin(rot)*(cu-bu)*face.w-Math.cos(rot)*(cv-bv)*face.h)||1});
  }
  const mine=out.tubes.length;
  for(let seg=0;seg<pts.length-1;seg++){
   const a=pts[seg],b=pts[seg+1],L=W(a,b),rot=rotOf(a,b),nodes=[{s:0,c:0},...st.filter(s=>s.segment===seg).map(s=>({s:W(a,[s.u,s.v]),c:s.clear+.005})),{s:L,c:0}];
   // every crossing with another path splits the tube, so a tube never spans two panels
   paths.forEach((q,j)=>{if(j===pathIndex)return;for(let k=0;k<q.points.length-1;k++){
    const c=q.points[k],d=q.points[k+1],rx=b[0]-a[0],ry=b[1]-a[1],sx=d[0]-c[0],sy=d[1]-c[1],x=rx*sy-ry*sx;
    if(Math.abs(x)<EPS)continue;const t=((c[0]-a[0])*sy-(c[1]-a[1])*sx)/x,u=((c[0]-a[0])*ry-(c[1]-a[1])*rx)/x;
    if(t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS)nodes.push({s:t*L,c:.003});
   }});
   nodes.sort((p,q)=>p.s-q.s);
   for(let i=1;i<nodes.length;i++){
    const from=nodes[i-1].s+nodes[i-1].c,to=nodes[i].s-nodes[i].c,len=to-from;
    if(len<.012)continue;const t=(from+to)/2/L;
    out.tubes.push({u:a[0]+(b[0]-a[0])*t,v:a[1]+(b[1]-a[1])*t,len,rot,r:.007,pathIndex,segment:seg});
   }
  }
  // one piston per path, at the centre of its longest tube
  const t=out.tubes.slice(mine).sort((p,q)=>q.len-p.len)[0];
  if(t)out.pistons.push({u:t.u,v:t.v,rot:t.rot,r:.02,stroke:.04,pathIndex,drives:nearGear(t.u,t.v)});
 });
 // Corner hubs become pulleys; cables hang in the side margin outside the frame so nothing hides them.
 parts.forEach((p,drives)=>{if(!p.hub)return;
  const sx=p.u<.5?-1:1,sy=p.v<.5?1:-1,from=[p.u+sx*p.r,p.v],to=[from[0],p.v+sy*.22],len=W(from,to);
  out.pulleys.push({u:p.u,v:p.v,r:p.r,drives});out.cables.push({from,to,r:.004});
  out.weights.push({u:from[0]+(to[0]-from[0])*.4,v:from[1]+(to[1]-from[1])*.4,r:.016,travel:len*.5,drives});
 });
 const oi=paths.findIndex(p=>p.id==='oval'),op=paths[oi].points.slice(1);
 out.dial.push({u:op.reduce((a,p)=>a+p[0],0)/op.length,v:op.reduce((a,p)=>a+p[1],0)/op.length,r:.11,drives:gearLayout.trains[oi][0]});
 return out;
}
