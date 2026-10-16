// Tiny verlet rope for the FULL workout power cables. Pure maths, no DOM.
// TUNING KNOBS -- real phones need tuning; change only here.
export const ROPE={
 segments:14,        // points per cable
 gravityScale:2600,  // px/s^2 at a full 1.0 gravity vector
 damping:.97,        // velocity kept per step (lower = heavier air)
 iterations:8,       // constraint passes per step
 stiffness:.9,       // 0..1 how hard each pass pulls segments back to length
 sway:.07,           // idle sway (fraction of gravity) when no tilt reading exists
 swayHz:.45,
 fanDeg:8,           // loose cables fan out in two rings, this many degrees apart, from straight down toward the left
 looseLength:100,     // px of a loose cable
 looseStagger:70,    // extra px on every other cable so plugs do not stack
 plugSlack:1.06,     // plugged cable length = distance * this (it sags under gravity)
 slackSpread:.025,   // extra slack per cable (i%5) so the bundle in the gutter fans out a little
 gutter:64,          // px of the right-hand cord channel plugged cables live in
 settleSteps:90,     // steps run at once for the static (reduced motion) pose
};

export function makeRope(ax,ay,length,n=ROPE.segments){
 return {length,pts:Array.from({length:n},(_,i)=>{const y=ay+length*i/(n-1);return {x:ax,y,px:ax,py:y};})};
}

/** One step. g = {gx,gy} (unit-ish, +y down). anchor pinned; end pinned when given (plugged / dragged). */
export function stepRope(rope,dt,g,{anchor,end=null,length=rope.length}={},knobs=ROPE){
 const p=rope.pts,n=p.length;rope.length=length;const seg=length/(n-1),ax=g.gx*knobs.gravityScale*dt*dt,ay=g.gy*knobs.gravityScale*dt*dt;
 for(let i=1;i<n;i++){const q=p[i],vx=(q.x-q.px)*knobs.damping,vy=(q.y-q.py)*knobs.damping;q.px=q.x;q.py=q.y;q.x+=vx+ax;q.y+=vy+ay;}
 const pin=()=>{Object.assign(p[0],{x:anchor.x,y:anchor.y,px:anchor.x,py:anchor.y});if(end)Object.assign(p[n-1],{x:end.x,y:end.y,px:end.x,py:end.y});};
 pin();
 for(let it=0;it<knobs.iterations;it++){
  for(let i=0;i<n-1;i++){
   const a=p[i],b=p[i+1],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-6,k=(d-seg)/d*knobs.stiffness;
   const wa=i===0?0:1,wb=i===n-2&&end?0:1,w=wa+wb;if(!w)continue;
   a.x+=dx*k*wa/w;a.y+=dy*k*wa/w;b.x-=dx*k*wb/w;b.y-=dy*k*wb/w;
  }
  pin();
 }
 return p;
}

/** Rotate a gravity vector by deg degrees (per-cable fan). */
export const rotate=(g,deg)=>{const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return {gx:g.gx*c-g.gy*s,gy:g.gx*s+g.gy*c};};

/** Smooth SVG path through the points (quadratic midpoints). */
export function ropePath(pts){
 let d=`M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
 for(let i=1;i<pts.length-1;i++){const m={x:(pts[i].x+pts[i+1].x)/2,y:(pts[i].y+pts[i+1].y)/2};d+=`Q${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${m.x.toFixed(1)} ${m.y.toFixed(1)}`;}
 const l=pts[pts.length-1];return d+`L${l.x.toFixed(1)} ${l.y.toFixed(1)}`;
}
