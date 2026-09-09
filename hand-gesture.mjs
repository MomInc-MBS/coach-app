// Pinch signature adapted from Ian's Barehands cockpit, originally by Jared
// Rhodenizer. AGPL-3.0-or-later. Menu gestures intentionally omit board throws.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class PinchGesture {
  constructor(){this.reset();}
  reset(){this.pinched=false;this.armed=false;this.okPrev=false;this.okEma=0;this.bad=0;this.last=0;this.point=null;}
  update(raw,now,aspect=1){
    if(!raw||raw.length!==21||raw.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))){this.reset();return null;}
    if(this.last&&now-this.last>250)this.reset();
    const dt=this.last?Math.min(100,now-this.last):50;this.last=now;
    const p=raw.map(q=>({x:q.x*aspect,y:q.y})),d=(a,b)=>Math.hypot(p[a].x-p[b].x,p[a].y-p[b].y);
    const span=d(0,9),width=d(5,17);if(span<.025||width<.002||span/width>12){this.reset();return null;}
    const finger=(tip,mcp)=>d(tip,0)/Math.max(d(mcp,0),.001);
    const f8=finger(8,5),back=(finger(12,9)+finger(16,13)+finger(20,17))/3;
    const palmAspect=span/width,ratio=d(4,8)/span,thumb=d(4,13)/span;
    const signature=(back-f8>.18&&back>1.3)||(palmAspect<2&&thumb>.95)||(back>1.6&&f8>1.6);
    this.okEma=.7*this.okEma+.3*Number(signature);
    const was=this.pinched;let canceled=false;
    if(ratio>=.55){this.armed=true;this.pinched=false;}
    else if(!was&&this.armed&&ratio<(palmAspect<2?.38:.32)&&((signature&&this.okPrev)||this.okEma>.55)){this.pinched=true;this.started=now;this.bad=0;}
    if(was&&now-this.started<400){this.bad=signature?0:this.bad+1;if(this.bad>=4){this.pinched=false;this.armed=false;canceled=true;}}
    this.okPrev=signature;
    const point={x:(raw[4].x+raw[8].x)/2,y:(raw[4].y+raw[8].y)/2};
    const alpha=1-Math.exp(-dt/55);this.point=this.point?{x:this.point.x+(point.x-this.point.x)*alpha,y:this.point.y+(point.y-this.point.y)*alpha}:point;
    return {...this.point,pinched:this.pinched,down:!was&&this.pinched,up:was&&!this.pinched&&!canceled,canceled,armed:this.armed};
  }
}
// Map a comfortable central camera region across the control surface.
export function cursorPoint(p,rect,mirrored=false){return {x:rect.left+clamp(((mirrored?1-p.x:p.x)-.12)/.76,0,1)*rect.width,y:rect.top+clamp((p.y-.08)/.84,0,1)*rect.height};}
