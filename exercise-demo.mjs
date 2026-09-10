// SPDX-License-Identifier: AGPL-3.0-or-later
// Schematic movement previews, with the selected supports/arm positions shown.
export function applyExerciseDemo(p,m,t){
 const slow=m.minCycle||m.dwell?1.1:2.1,q=(1-Math.cos(t*slow))/2;
 const armsUp=()=>{p.le=[-.29,.96,0];p.re=[.29,.96,0];p.lw=[-.23,1.37,0];p.rw=[.23,1.37,0];};
 const d=m.detector;
 if(d==='pushup'||d==='plank'){
  const bend=d==='plank'?0:q,inc=m.incline?.45:0,lower=m.support==='knees';
  for(const [side,z] of [['l',-.12],['r',.12]]){
   p[side+'s']=[-.56,.04-bend*.27+inc,z];p[side+'h']=[.25,-.04+inc*.4,z];
   p[side+'k']=[.58,lower?-.48:-.12,z];p[side+'a']=[.91,m.decline?.15:lower?-.38:-.28,z];
   p[side+'w']=[-.58,-.51+inc,m.narrow?z*.2:m.wide?z*2.5:z];
   p[side+'e']=m.forearm?[-.57,-.5,z]:[-.57+bend*.18,-.25-bend*.04+inc,z];
  }
  p.head=[-.85,.1-q*.27*(d==='pushup')+inc,0];p.neck=[-.68,.04-q*.27*(d==='pushup')+inc,0];
 }else if(d==='squat'||d==='split'){
  const drop=(m.travel?.22:.4)*q;
  for(const key of ['head','neck','ls','rs','le','re','lw','rw','lh','rh'])p[key][1]-=drop;
  if(d==='split'){
   const lead=m.side==='right'?'r':'l',back=lead==='l'?'r':'l';p[lead+'k']=[-.6,-.43-drop*.4,.04];p[lead+'a']=[-.6,-.95,.04];p[back+'k']=[.45,-.47-drop*.5,-.05];p[back+'a']=[.8,-.95,-.05];
  }else{const width=m.wide?.34:.18;p.lk=[-width-.13*q,-.46-drop*.5,.25*q];p.rk=[width+.13*q,-.46-drop*.5,.25*q];p.la=[-width,-.95,0];p.ra=[width,-.95,0];}
  p.le=[-.3,.24-drop,.25];p.re=[.3,.24-drop,.25];p.lw=[-.15,.36-drop,.4];p.rw=[.15,.36-drop,.4];
 }else if(d==='hinge'){
  const bend=q*(m.bend?.45:.9),cos=Math.cos(bend),sin=Math.sin(bend);
  for(const key of ['head','neck','ls','rs','le','re','lw','rw']){const y=p[key][1];p[key][1]=y*cos;p[key][2]=y*sin;}
  if(m.arms==='chest'){p.lw=[.1,.37*cos,.37*sin+.1];p.rw=[-.1,.37*cos,.37*sin+.1];}
 }else if(d==='bridge'){
  for(const [side,z] of [['l',-.14],['r',.14]]){p[side+'s']=[-.67,-.53,z];p[side+'h']=[0,-.5+q*.37,z];p[side+'k']=[.38,.02,z];p[side+'a']=[.66,-.53,z];p[side+'e']=[-.4,-.54,z*1.4];p[side+'w']=[-.1,-.54,z*1.7];}p.head=[-.93,-.47,0];p.neck=[-.78,-.5,0];
 }else if(d==='sideplank'){
  const lower=m.side==='left'?'l':'r',upper=lower==='l'?'r':'l';
  p[lower+'s']=[-.5,-.03,0];p[upper+'s']=[-.5,.32,0];p[lower+'h']=[.2,-.18,0];p[upper+'h']=[.2,.08,0];
  p[lower+'e']=[-.5,-.3,0];p[lower+'w']=[-.48,-.55,0];p[upper+'e']=[-.5,.64,0];p[upper+'w']=[-.5,.96,0];
  for(const side of [lower,upper]){p[side+'k']=[.57,-.31,side===lower?0:.08];p[side+'a']=[m.support==='knees'?.25:.94,-.53,side===lower?0:.08];}
  p.neck=[-.65,.18,0];p.head=[-.87,.21,0];
 }else if(d==='raise'){
  const a=q*(m.overhead?Math.PI:Math.PI/2);
  for(const [side,sign] of [['l',-1],['r',1]])for(const [joint,length] of [['e',.36],['w',.73]])p[side+joint]=[sign*(.23+(m.plane==='front'?0:Math.sin(a)*length)),.57-Math.cos(a)*length,m.plane==='front'?Math.sin(a)*length:0];
 }else if(d==='press'){
  for(const [side,sign] of [['l',-1],['r',1]]){p[side+'e']=[sign*(.56-.28*q),.53+.4*q,0];p[side+'w']=[sign*(.56-.31*q),.89+.43*q,0];}
 }else if(d==='balance'){
  const lift=m.low?.15:.4;p.lk=[-.17-(m.kneeLift?0:.3),-.46+lift,m.kneeLift?.45:0];p.la=m.kneeLift?[-.17,-.63,.48]:[.12,m.low?-.78:-.4,0];
  p.lw=[-.02,.45,.16];p.rw=[.02,.45,.16];p.le=[-.32,.22,.07];p.re=[.32,.22,.07];if(m.overhead)armsUp();
 }else if(d==='yoga'||d==='stance'){
  const pose=m.pose??'horse';
  if(pose==='salute')armsUp();
  if(pose==='chair'){for(const key of ['head','neck','ls','rs','le','re','lw','rw','lh','rh'])p[key][1]-=.28;p.lk=[-.17,-.55,.3];p.rk=[.17,-.55,.3];armsUp();for(const key of ['le','re','lw','rw'])p[key][1]-=.28;}
  if(['warrior','warrior-one'].includes(pose)||m.side){const lead=m.side==='right'?'r':'l',back=lead==='l'?'r':'l',sign=lead==='l'?-1:1;p[lead+'k']=[sign*.66,-.33,0];p[lead+'a']=[sign*.66,-.85,0];p[back+'k']=[-sign*.46,-.43,0];p[back+'a']=[-sign*.82,-.88,0];if(pose==='warrior'){p.le=[-.6,.57,0];p.re=[.6,.57,0];p.lw=[-.98,.57,0];p.rw=[.98,.57,0];}else if(pose==='warrior-one')armsUp();}
  else if(pose==='horse'||pose==='goddess'){
   const deep=m.high?.06:m.low?.35:.23;p.lk=[-.56,-.44+deep,0];p.rk=[.56,-.44+deep,0];p.la=[-.56,-.94+deep,0];p.ra=[.56,-.94+deep,0];
   for(const v of Object.values(p))v[1]-=deep;
   if(pose==='goddess'){p.le=[-.58,.48-deep,0];p.re=[.58,.48-deep,0];p.lw=[-.58,.84-deep,0];p.rw=[.58,.84-deep,0];}
   else{p.lw=[-.06,.42-deep,.1];p.rw=[.06,.42-deep,.1];p.le=[-.34,.22-deep,0];p.re=[.34,.22-deep,0];}
  }
 }else if(d==='boxing'){
  for(const [side,sign,phase] of [['l',-1,Math.sin(t*(m.double?5:2.5))],['r',1,-Math.sin(t*2.5)]]){const punch=m.side&&m.side!==({l:'left',r:'right'}[side])?0:Math.max(0,phase);p[side+'e']=[sign*.28,.37+punch*.16,.2+punch*.22];p[side+'w']=[sign*.2,.55,.25+punch*.65];}p.la=[-.32,-.95,.1];p.ra=[.32,-.95,-.17];
 }else if(d==='march'){
  for(const [side,sign,phase] of [['l',-1,Math.sin(t*(m.id==='jogging'?4:2))],['r',1,-Math.sin(t*(m.id==='jogging'?4:2))]]){const lift=Math.max(0,phase)*(m.lift?.48:m.id==='march'?.2:.32);p[side+'k']=[sign*.17,-.46+lift,lift];p[side+'a']=[sign*.17,-.95+lift,.06];p[side+'e']=[sign*.32,.22,-phase*.18];p[side+'w']=[sign*.27,.42,-phase*.32];}
 }else if(d==='jack'){
  const swing=m.step?(1-Math.cos(t*2))/2:q;for(const [side,sign] of [['l',-1],['r',1]]){const a=swing*2.8;p[side+'e']=[sign*(.23+Math.sin(a)*.36),.57-Math.cos(a)*.36,0];p[side+'w']=[sign*(.23+Math.sin(a)*.73),.57-Math.cos(a)*.73,0];const step=!m.step||((Math.floor(t/Math.PI)%2===0)===(side==='l'));p[side+'a']=[sign*(.17+(step?.48*swing:0)),-.95,0];p[side+'k']=[sign*(.17+(step?.24*swing:0)),-.46,0];}
 }
 return p;
}
