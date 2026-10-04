// Shared manufacturing and portal release contours, in the supplied rectangle's units.
// Mechanical boards build these seams before input; other boards use the same windows.
import {SHAPES} from './portal-shapes.mjs';
const closeLoop=pts=>{const a=pts[0],b=pts.at(-1);return a[0]===b[0]&&a[1]===b[1]?pts:[...pts,a];};
const toClientPts=(pts,rect)=>pts.map(([x,y])=>[rect.left+x*rect.width,rect.top+y*rect.height]);
const LINE_IDS=new Set(['line-lr','line-rl','line-down']);
export function shapeOutlinePts(id){
 const pts=SHAPES[id][0].points;
 if(id!=='oval')return pts;
 const step=Math.max(1,Math.floor(pts.length/48));
 return pts.filter((_,i)=>i%step===0);
}
export function lensPts([ax,ay],[bx,by],half,n=24){
 const l=Math.hypot(bx-ax,by-ay)||1,nx=-(by-ay)/l,ny=(bx-ax)/l;
 const side=sign=>Array.from({length:n+1},(_,i)=>{const t=sign>0?i/n:1-i/n,w=sign*half*Math.sin(Math.PI*t);return [ax+(bx-ax)*t+nx*w,ay+(by-ay)*t+ny*w];});
 return closeLoop([...side(1),...side(-1).slice(1,-1)]);
}
export function portalWindow(id,rect){
 if(LINE_IDS.has(id)){
  const points=SHAPES.line[id==='line-lr'||id==='line-rl'?1:0].points;
  const [a,b]=toClientPts(points,rect),len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  return {pts:lensPts(a,b,Math.min(.17*len,.3*rect.width)),axis:[a,b]};
 }
 if(id==='x'){
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,r=.3*Math.min(rect.width,rect.height);
  return {pts:closeLoop([[cx,cy-r],[cx+r,cy],[cx,cy+r],[cx-r,cy]])};
 }
 return {pts:closeLoop(toClientPts(shapeOutlinePts(id),rect))};
}
