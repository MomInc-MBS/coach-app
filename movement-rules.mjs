// SPDX-License-Identifier: AGPL-3.0-or-later
// Deliberately coarse movement measurements, not a form or injury-risk score.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const angle=(a,b,c)=>{const u=[a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0)],v=[c.x-b.x,c.y-b.y,(c.z??0)-(b.z??0)],d=Math.hypot(...u)*Math.hypot(...v);return d>1e-8?Math.acos(clamp(u.reduce((s,x,i)=>s+x*v[i],0)/d,-1,1))*180/Math.PI:NaN;};
export function evaluateMovement(f,m,previousSide=null){
 const needed=m.detector==='pushup'?['s','e','w','h']:['hinge','split','bridge'].includes(m.detector)?['s','h','k']:m.detector==='plank'?['s','e','w','h','k']:null;
 const candidates=Object.entries(f.sides).filter(([name,s])=>(!m.side||m.side===name)&&s.torso>.035&&(!needed||f.visible(needed.map(k=>s.id[k]))));
 const picked=candidates.find(([name])=>name===previousSide)??candidates.sort((a,b)=>b[1].coreQuality-a[1].coreQuality)[0];
 const out={valid:false,up:false,down:false,match:false,metric:0,side:picked?.[0]??null,message:m.hint};
 if(needed&&!picked)return out;
 const l=f.sides.left,r=f.sides.right,s=picked?.[1]??l,T=Math.max(f.torso,.035),d=m.detector;
 const require=ids=>ids.every(i=>f.visible([i])&&f.p[i].visibility>=.6);
 // World angles are optional: never combine world and image coordinates.
 const a3=(a,b,c)=>{const ids=[a,b,c],w=f.world;return w&&ids.every(i=>w[i]&&[w[i].x,w[i].y,w[i].z].every(Number.isFinite))?angle(w[a],w[b],w[c]):angle(f.p[a],f.p[b],f.p[c]);};
 const upper=require([11,12,13,14,15,16,23,24]),legs=require([11,12,23,24,25,26]);
 const overhead=upper&&l.w.y<l.s.y-.65*T&&r.w.y<r.s.y-.65*T;
 const armAngle=a=>a3(a.id.h,a.id.s,a.id.w);
 if(needed&&!require(needed.map(k=>s.id[k])))return out;
 if(d==='pushup'){
  if(s.horizontal<(m.incline?.28:.5)||s.w.y<s.s.y+.12*s.torso)return out;
  const bend=a3(s.id.s,s.id.e,s.id.w);if(!Number.isFinite(bend))return out;
  out.up=bend>150;out.down=bend<112;out.metric=(165-bend)/60;out.valid=true;
 }else if(d==='squat'){
  if(!s.core||(s.h.y-s.s.y)/s.torso<.55)return out;
  out.valid=true;out.sample={hipY:s.h.y,torso:s.torso,angle:0};out.metric=s.h.y;
 }else if(d==='split'){
  if(!f.upright||s.k.y<s.h.y)return out;
  const bend=a3(s.id.s,s.id.h,s.id.k);out.valid=Number.isFinite(bend);out.up=bend>155;out.down=bend<135;out.metric=(165-bend)/60;
 }else if(d==='hinge'){
  const hip=a3(s.id.s,s.id.h,s.id.k);
  if(s.k.y<s.h.y+.35*s.torso)return out;
  out.valid=Number.isFinite(hip);out.up=hip>158;out.down=hip<180-(m.bend??45);out.metric=(180-hip)/65;
 }else if(d==='bridge'){
  if(s.horizontal<.5||s.k.y>=s.h.y+.2*s.torso||s.s.y<s.k.y+.1*s.torso)return out;
  const hip=a3(s.id.s,s.id.h,s.id.k);out.valid=Number.isFinite(hip);out.up=hip<145;out.down=hip>162;out.metric=(hip-125)/50;
 }else if(d==='plank'){
  const body=a3(s.id.s,s.id.h,s.id.k),elbow=a3(s.id.s,s.id.e,s.id.w);
  out.valid=s.horizontal>.65;out.match=out.valid&&body>155&&s.w.y>s.s.y+.2*s.torso&&(m.forearm?elbow>60&&elbow<120:elbow>145);out.metric=Number(out.match);
 }else if(d==='sideplank'){
  const a=m.side==='right'?r:l,end=a.id.k;
  if(!require([11,12,23,24,a.id.e,end]))return out;
  const stacked=Math.abs(l.s.y-r.s.y)>.3*T&&Math.abs(l.s.x-r.s.x)<.5*T;
  out.valid=true;out.match=stacked&&a.horizontal>.7&&a3(a.id.s,a.id.h,end)>153&&a.e.y>a.s.y+.15*T;out.metric=Number(out.match);
 }else if(d==='raise'||d==='press'){
  if(!upper||!f.upright)return out;
  const elbows=[a3(11,13,15),a3(12,14,16)],arms=[armAngle(l),armAngle(r)];
  if(![...elbows,...arms].every(Number.isFinite))return out;
  out.valid=true;
  if(d==='press'){out.up=elbows.every(x=>x<115)&&l.w.y<l.s.y+.2*T&&r.w.y<r.s.y+.2*T;out.down=overhead&&elbows.every(x=>x>155);}
  else{out.up=arms.every(x=>x<30);out.down=arms.every(x=>x>(m.overhead?150:75))&&elbows.every(x=>x>145);}
  out.metric=Math.min(...arms)/(m.overhead?160:90);
 }else if(d==='balance'){
  if(!legs||!f.upright)return out;out.valid=true;
  out.match=[[l,r],[r,l]].some(([a,b])=>{
   const kneeGap=(b.k.y-a.k.y)/T,support=Math.abs(b.k.x-b.h.x)<.55*T&&b.k.y>b.h.y+.5*T;
   return support&&kneeGap>(m.low?.08:.15)&&(m.kneeLift?kneeGap>.35:Math.abs(a.k.x-a.h.x)/T>(m.low?.2:.4))&&(!m.overhead||overhead);
  });out.metric=Number(out.match);
 }else if(d==='yoga'||d==='stance'){
  if(!legs||!f.upright)return out;out.valid=true;
  const drops=[(l.k.y-l.h.y)/T,(r.k.y-r.h.y)/T],spread=Math.abs(l.k.x-r.k.x)/T;
  const straight=[l,r].every(a=>Math.abs(a.k.x-a.h.x)<.55*T&&a.k.y>a.h.y+.7*T);
  const horse=spread>1.4&&[l,r].every(a=>Math.abs(a.k.x-a.h.x)>.5*T)&&drops.every(x=>x>.08&&x<(m.high?1.25:m.low?.6:1));
  const front=spread>1.1&&((drops[0]<.85&&drops[1]>.85)||(drops[1]<.85&&drops[0]>.85));
  if(d==='stance')out.match=m.side?(front&&drops[m.side==='left'?0:1]<.85):horse;
  else if(m.pose==='mountain')out.match=straight&&spread<1.2&&upper&&l.w.y>l.s.y+.5*T&&r.w.y>r.s.y+.5*T;
  else if(m.pose==='salute')out.match=straight&&spread<1.2&&overhead;
  else if(m.pose==='chair')out.match=drops.every(x=>x>.08&&x<.8)&&spread<1.2&&overhead;
  else if(m.pose==='warrior-one')out.match=front&&overhead;
  else if(m.pose==='warrior')out.match=front&&upper&&l.elbow>145&&r.elbow>145&&Math.abs(l.w.y-l.s.y)<.3*T&&Math.abs(r.w.y-r.s.y)<.3*T&&Math.abs(l.w.x-r.w.x)>2*T;
  else out.match=horse&&upper&&l.elbow<120&&r.elbow<120&&l.w.y<l.e.y&&r.w.y<r.e.y;
  out.metric=Number(out.match);
 }else if(d==='jack'){
  if(!upper||!legs||!f.upright)return out;
  const spread=Math.abs(l.k.x-r.k.x)/T,armA=armAngle(l),armB=armAngle(r);
  out.valid=true;out.up=spread<1.2&&armA<35&&armB<35;out.down=spread>(m.step?1.3:1.5)&&armA>130&&armB>130;out.metric=Math.min(spread/1.5,armA/140,armB/140);
 }
 return out;
}
