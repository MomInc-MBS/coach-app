// Pyramid Jump: classic Doodle-Jump on 2D paper, MOM Inc. Fitness space theme. Lazy/optional (arcade/ is never core).
// World y points up (feet = y); the camera only scrolls up; falling below the view ends the run.
import {W,BEST_KEY,PLAT_W,JUMP,GRAVITY,Level,mulberry,mealMarkers,markerHeight,paperFor} from './logic.mjs';
const PW=40,PH=50,LINES=['CARED FOR.','CORRECTED.','PROVIDED FOR.','READ THE SOURCE.','KEEP THE LABEL.','SMILE. REP. REPEAT.','ASK MOM.','MOM INC. FITNESS'];
const KEYS=[[0,'#bba16e'],[1800,'#8a6aa0'],[3600,'#6e5ca8'],[4800,'#1c2d6b'],[7000,'#0d1030'],[10500,'#05030f']];
const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
function sky(h){let i=KEYS.findIndex(([k])=>k>h);if(i<0)return hex(KEYS.at(-1)[1]);if(!i)return hex(KEYS[0][1]);const [a,ca]=KEYS[i-1],[b,cb]=KEYS[i],t=(h-a)/(b-a),A=hex(ca),B=hex(cb);return A.map((v,n)=>v+(B[n]-v)*t);}
const rgb=c=>`rgb(${c.map(Math.round)})`;
const hash=n=>{const x=Math.sin(n*127.1)*43758.5453;return x-Math.floor(x);};
export const bestScore=(store=localStorage)=>{try{const n=JSON.parse(store.getItem(BEST_KEY));return Number.isSafeInteger(n)&&n>0?n:0;}catch{return 0;}};

export function startGame(root,{recipe=null,meals=null,subscribeMotion=null,onExit=()=>{},seed=Date.now()}={}){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block';
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Pyramid Jump. Tilt or touch the left and right sides to steer.');
 const over=document.createElement('div');over.style.cssText='position:absolute;inset:0;display:none;place-content:center;gap:12px;text-align:center;background:#0009;color:#fff4dc;font:800 18px/1.4 system-ui,sans-serif;letter-spacing:.05em;white-space:pre-line';
 const btn=(t,f)=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.style.cssText='min-height:44px;padding:0 18px;border:2px solid #fff9;border-radius:999px;background:#1d1428;color:#fff4dc;font:700 14px system-ui,sans-serif;pointer-events:auto';b.onclick=f;return b;};
 const msg=document.createElement('div'),row=document.createElement('div');row.style.cssText='display:flex;gap:10px;justify-content:center';
 const exit=btn('EXIT',()=>onExit());exit.style.cssText+=';position:absolute;top:max(10px,env(safe-area-inset-top));right:10px;min-height:44px;min-width:44px';exit.setAttribute('aria-label','Exit to the pyramid');
 row.append(btn('AGAIN',()=>reset()),btn('EXIT',()=>onExit()));over.append(msg,row);root.append(canvas,exit,over);
 const art=paperFor(recipe),shape=new Path2D(art.d),tags=mealMarkers(meals);
 let lvl,p,camY,maxY,best=bestScore(),t=0,dir=0,tilt=0,tiltAt=-9,raf=0,last=0,dead=false,disposed=false,scale=1,viewH=640;
 function reset(){lvl=new Level(mulberry(seed++));p={x:W/2,y:0,vx:0,vy:JUMP,fly:0,flyV:0,gear:null,face:1};camY=-90;maxY=0;dead=false;over.style.display='none';lvl.ensure(1200);for(const i of lvl.items)Object.assign(i,{broken:false,by:0});}
 reset();
 function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);scale=canvas.width/W;viewH=canvas.height/scale;}
 const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 const unsub=subscribeMotion?.(({gx})=>{tilt=Math.max(-1,Math.min(1,gx*2.2));tiltAt=t;});
 const key=down=>e=>{const k=e.key;if(k==='ArrowLeft'||k==='a')dir=down?-1:dir<0?0:dir;else if(k==='ArrowRight'||k==='d')dir=down?1:dir>0?0:dir;};
 const kd=key(true),ku=key(false);addEventListener('keydown',kd);addEventListener('keyup',ku);
 const pd=e=>{if(e.target!==canvas)return;const r=canvas.getBoundingClientRect();dir=e.clientX<r.left+r.width/2?-1:1;},pu=()=>{dir=0;};
 canvas.addEventListener('pointerdown',pd);addEventListener('pointerup',pu);addEventListener('pointercancel',pu);
 const px=it=>it.type==='moving'?Math.max(0,Math.min(W-PLAT_W,it.x+Math.sin(t*1.6+it.phase)*it.dx)):it.x;
 function die(why){if(dead)return;dead=true;const s=Math.floor(maxY/10);if(s>best){best=s;try{localStorage.setItem(BEST_KEY,String(best));}catch{/* ignore */}}
  msg.textContent=`${why}\nHEIGHT ${s}\nBEST ${best}${s>=best&&s>0?'  NEW BEST!':''}`;over.style.display='grid';}
 function step(dt){
  t+=dt;if(dead)return;
  const steer=dir||(t-tiltAt<.5?tilt:0);p.vx=steer*340;if(steer)p.face=steer>0?1:-1;
  const prev=p.y;p.x+=p.vx*dt;if(p.x<-PW/2)p.x+=W+PW;else if(p.x>W+PW/2)p.x-=W+PW;
  if(p.fly>0){p.fly-=dt;p.vy=p.flyV;if(p.fly<=0)p.vy=JUMP*.6;}else p.vy-=GRAVITY*dt;
  p.y+=p.vy*dt;lvl.ensure(camY+viewH*2);
  for(const it of lvl.items){
   if(it.broken){it.by-=420*dt;continue;}
   if(it.type==='monster'){it.x+=it.dir*50*dt;if(it.x<0||it.x>W-50)it.dir*=-1;const dx=Math.abs(p.x-(it.x+25)),dy=p.y+PH/2-(it.y+16);
    if(dx<PW/2+18&&Math.abs(dy)<PH/2+14){if(p.fly>0||(p.vy<0&&prev>it.y+14)){it.broken=true;p.vy=JUMP;p.fly=0;}else die('BONKED');}continue;}
   if(it.type==='hole'){if(Math.hypot(p.x-(it.x+30),p.y+PH/2-(it.y+30))<30)die('SUCKED IN');continue;}
   const x=px(it),near=Math.abs(p.x-(x+PLAT_W/2))<PLAT_W/2+PW/3;
   if(it.gear&&p.fly<=0&&near&&Math.abs(p.y-(it.y+14))<26){p.fly=it.gear==='jetpack'?4:2.5;p.flyV=it.gear==='jetpack'?900:560;p.gear=it.gear;it.gear=null;}
   if(p.vy<0&&p.fly<=0&&near&&prev>=it.y-2&&p.y<=it.y){
    if(it.type==='breaking'){it.broken=true;continue;}
    p.y=it.y;p.vy=it.type==='spring'?JUMP*1.55:JUMP;
   }
  }
  maxY=Math.max(maxY,p.y);camY=Math.max(camY,p.y-viewH*.45);
  lvl.items=lvl.items.filter(i=>(i.y+(i.by||0))>camY-200);
  if(p.y+PH<camY)die('FELL');
 }
 const sy=wy=>(viewH-(wy-camY))*scale,sx=x=>x*scale;
 // ---- Paper toolkit (the Dr. Girlfriend look): cut edges, hard offset shadow, grain, slight tilt.
 const grain=(()=>{const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d'),d=g.createImageData(96,96);for(let i=0;i<d.data.length;i+=4){d.data[i]=d.data[i+1]=d.data[i+2]=hash(i)*255;d.data[i+3]=30;}g.putImageData(d,0,0);return c;})();
 let grainPat=null;
 function cut(w,h,seed,j=1.3){ // slightly uneven scissor-cut rectangle centred on the origin
  const p=new Path2D(),n=Math.max(2,Math.round(w/(20*scale))),J=i=>(hash(seed*7+i)-.5)*2*j*scale,pts=[];
  for(let i=0;i<=n;i++)pts.push([-w/2+w*i/n+J(i),-h/2+J(i+50)]);
  pts.push([w/2+J(90),J(91)]);
  for(let i=n;i>=0;i--)pts.push([-w/2+w*i/n+J(i+100),h/2+J(i+150)]);
  pts.push([-w/2+J(190),J(191)]);
  pts.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();return p;
 }
 const SHADOW='#49334b66',EDGE='#624848';
 function sheet(cx,cy,w,h,fill,rot=0,seed=1,inner=null,{edge=EDGE,shadow=3,alpha=1}={}){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);const path=cut(w,h,seed);
  ctx.globalAlpha*=alpha;
  ctx.save();ctx.translate(shadow*scale,shadow*scale);ctx.fillStyle=SHADOW;ctx.fill(path);ctx.restore();
  ctx.fillStyle=fill;ctx.fill(path);grainPat??=ctx.createPattern(grain,'repeat');ctx.fillStyle=grainPat;ctx.fill(path);
  ctx.strokeStyle=edge;ctx.lineWidth=1.6*scale;ctx.stroke(path);inner?.();ctx.restore();
 }
 const tape=(x,y,r)=>{ctx.save();ctx.translate(x,y);ctx.rotate(r);ctx.fillStyle='#e8cf7acc';ctx.fillRect(-9*scale,-3.5*scale,18*scale,7*scale);ctx.strokeStyle='#b89e4a88';ctx.lineWidth=scale;ctx.strokeRect(-9*scale,-3.5*scale,18*scale,7*scale);ctx.restore();};
 const text=(t,x,y,size,color,font='Georgia,serif',weight=700)=>{ctx.fillStyle=color;ctx.font=`${weight} ${size*scale}px ${font}`;ctx.textAlign='center';ctx.fillText(t,x,y);};
 const ly=(wy,f)=>(viewH-(wy-camY*f))*scale; // screen y of a point on a parallax layer
 const fadeIn=(h,lo,hi,fade=400)=>Math.max(0,Math.min(1,(h-lo)/fade,(hi-h)/fade));
 function diamond(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r*.45,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r*.45,y);ctx.closePath();ctx.fill();}
 const blob=(cx,cy,r,seed,c,a=1)=>{ctx.save();ctx.globalAlpha*=a;ctx.translate(cx,cy);const p=new Path2D(),n=14;for(let i=0;i<n;i++){const t=i/n*6.283,k=r*(.8+hash(seed+i)*.35);i?p.lineTo(Math.cos(t)*k,Math.sin(t)*k):p.moveTo(k,0);}p.closePath();ctx.fillStyle=c;ctx.fill(p);ctx.strokeStyle=EDGE;ctx.lineWidth=scale;ctx.globalAlpha*=.5;ctx.stroke(p);ctx.restore();};
 const SLOGANS=[['CARED FOR.','CORRECTED.','PROVIDED FOR.'],['SMILE.','REP.','REPEAT.'],['READ THE','SOURCE.'],['ASK MOM.'],['KEEP THE','LABEL.'],['MOM IS','PROUD.'],['EAT. LIFT.','REPORT.'],['FITNESS IS','A FAMILY.']];
 const POSTER=['#e5d4a2','#e0c3ea','#f2c6a0','#bfdcc6','#f0e08a'];
 function poster(cx,cy,w,h,b){
  const L=SLOGANS[b%SLOGANS.length];
  sheet(cx,cy,w,h,POSTER[b%POSTER.length],(hash(b+9)-.5)*.12,b,()=>{
   text('MOM INC.',0,-h/2+13*scale,8,'#4c3255','Georgia,serif');
   ctx.fillStyle='#79558a';ctx.beginPath();ctx.arc(0,-h/2+32*scale,9*scale,0,7);ctx.fill();diamond(0,-h/2+32*scale,8*scale,'#f4e7a0');
   L.forEach((l,i)=>text(l,0,-h/2+54*scale+i*13*scale,l.length>9?9:11,'#3a2548'));
   text('A MOM INC. WORKPLACE',0,h/2-6*scale,5,'#6d5a7c','monospace',400);tape(-w/2+8*scale,-h/2+2*scale,-.5);tape(w/2-8*scale,-h/2+2*scale,.5);});
 }
 function bg(){
  const h=camY+viewH/2,g=ctx.createLinearGradient(0,0,0,canvas.height);g.addColorStop(0,rgb(sky(camY+viewH)));g.addColorStop(1,rgb(sky(camY)));ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.save();
  // paper stars (parallax .3), then the collage layers far to near
  const star=Math.min(1,Math.max(0,(h-3800)/2000));
  if(star>0){const o=camY*.3;for(let i=Math.floor(o/60);i<(o+viewH)/60+1;i++)for(let k=0;k<2;k++)diamond(sx(hash(i*3+k)*W),ly(i*60+hash(i+k*7)*60,.3),(1.5+hash(i+k)*2.5)*scale,`rgba(255,244,210,${star})`);}
  const deep=fadeIn(h,8800,99999,1500);
  if(deep>0){ctx.globalAlpha=deep;for(let b=Math.floor(camY*.35/500);b<(camY*.35+viewH)/500+1;b++){const y=ly(b*500+hash(b)*300,.35),x=sx(hash(b+5)*W);
   blob(x,y,sx(70+hash(b+2)*60),b,hash(b)<.5?'#8a4fc4':'#3fa6b8',.35);blob(x+sx(24),y+sx(14),sx(40),b+30,hash(b)<.5?'#c86fe6':'#7fe6ff',.3);
   if(b%4===0){sheet(x,y,sx(60),sx(60),'#d98a4a',0,b,null,{alpha:.9});ctx.save();ctx.strokeStyle='#f4e7a0';ctx.lineWidth=3*scale;ctx.beginPath();ctx.ellipse(x,y,sx(52),sx(12),-.4,0,7);ctx.stroke();ctx.restore();}}ctx.globalAlpha=1;}
  const orb=fadeIn(h,3000,7800,900);
  if(orb>0){ctx.globalAlpha=orb;const T=3700,ey=ly(T-1500,.7);
   blob(sx(W/2),ey,sx(1500),3,'#3b78c4');for(const [x,y,r,s] of [[60,T-110,70,4],[230,T-190,95,5],[130,T-330,60,6],[300,T-60,55,7]])blob(sx(x),ly(y,.7),sx(r*.6),s,'#6fae5a');
   for(const [x,y,w] of [[40,T-250,80],[250,T-120,100],[150,T-40,90]])sheet(sx(x),ly(y,.7),sx(w),sx(14),'#f4f0e8',-.05,Math.round(x),null,{shadow:2});
   sheet(sx(290),ly(5200,.45),sx(64),sx(64),'#c9c6d2',0,2);blob(sx(280),ly(5210,.45),sx(8),9,'#a8a5b4');blob(sx(300),ly(5190,.45),sx(6),11,'#a8a5b4');ctx.globalAlpha=1;}
  const port=fadeIn(h,6400,11400,700);
  if(port>0){ctx.globalAlpha=port;for(let b=Math.floor(camY*.6/380);b<(camY*.6+viewH)/380+1;b++){const y=ly(b*380+100,.6),left=hash(b+3)<.5,x=left?sx(70):sx(W-70),w=sx(120+hash(b)*70),hh=sx(52+hash(b+1)*30);
   sheet(x,y,w,hh,'#5d5a8c',(hash(b+6)-.5)*.05,b,()=>{for(let i=0;i<5;i++){ctx.fillStyle='#ffd66a';ctx.fillRect(-w/2+sx(12+i*26),sx(6),sx(8),sx(8));}ctx.fillStyle='#8b86c4';ctx.fillRect(-w/2,-hh/2,w,sx(8));});
   sheet(x+(left?w/2+sx(24):-w/2-sx(24)),y,sx(48),sx(7),'#9fd4e6',0,b+1,null,{shadow:2});
   sheet(x+(left?w/2+sx(60):-w/2-sx(60)),y-sx(10),sx(16),sx(12),'#e8e0d0',.3,b+2,null,{shadow:2});
   if(b%2===0)sheet(x,y-hh/2-sx(10),sx(86),sx(14),'#2d2a4e',0,b+3,()=>text('MOM PORT '+b,0,sx(3),7,'#ffd66a','monospace'),{shadow:2});}ctx.globalAlpha=1;}
  // the wall: striped paper room, borders, MOM Inc. posters; it peels away into orbit
  const wall=Math.max(0,Math.min(1,(4800-h)/1000));
  if(wall>0){ctx.globalAlpha=wall;
   ctx.fillStyle='#ffffff14';for(let x=0;x<W;x+=48)ctx.fillRect(sx(x),0,sx(14),canvas.height);ctx.fillStyle='#00000010';for(let wy=Math.floor(camY/80)*80;wy<camY+viewH;wy+=80)ctx.fillRect(0,ly(wy,1),canvas.width,2*scale);
   grainPat??=ctx.createPattern(grain,'repeat');ctx.fillStyle=grainPat;ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.fillStyle='#665044';ctx.fillRect(0,0,sx(10),canvas.height);ctx.fillRect(sx(W-10),0,sx(10),canvas.height);
   if(camY<1000){ // the office: floor, desk, filing cabinets, window and the pyramid on the desk
    ctx.fillStyle='#6a5240';ctx.fillRect(0,ly(-40,1),canvas.width,canvas.height);ctx.fillStyle='#00000022';for(let x=0;x<W;x+=40)ctx.fillRect(sx(x),ly(-40,1),scale*2,canvas.height);
    sheet(sx(250),ly(150,1),sx(70),sx(90),'#bfe3ee',0,3,()=>{ctx.strokeStyle=EDGE;ctx.beginPath();ctx.moveTo(0,-sx(45));ctx.lineTo(0,sx(45));ctx.moveTo(-sx(35),0);ctx.lineTo(sx(35),0);ctx.stroke();});
    sheet(sx(36),ly(60,1),sx(46),sx(100),'#8c8f98',0,4,()=>{for(let i=0;i<3;i++){ctx.strokeStyle=EDGE;ctx.strokeRect(-sx(18),-sx(40)+i*sx(30),sx(36),sx(26));}});
    sheet(sx(86),ly(40,1),sx(46),sx(80),'#9a9da6',0,5);
    sheet(sx(W/2),ly(-18,1),sx(300),sx(34),'#8a5f3c',0,6);sheet(sx(W/2),ly(-50,1),sx(280),sx(10),'#a9774c',0,7);
    const px0=sx(W/2),py0=ly(-4,1);for(let i=0;i<3;i++){const wd=sx(150-i*45),ht=sx(34);sheet(px0,py0-sx(17)-i*sx(32),wd,ht,['#cdbb8a','#d9c590','#e8d28a'][i],0,20+i);}
    for(const [dx,dy,c] of [[-30,-16,'#7fcf5a'],[0,-16,'#f4d35e'],[30,-16,'#4fd1c5'],[-14,-48,'#f4978e'],[14,-48,'#c9a7eb']])sheet(px0+sx(dx),py0+sx(dy),sx(22),sx(18),c,0,Math.round(dx+dy),null,{shadow:1});
    sheet(sx(W/2),ly(-4,1)-sx(100),sx(30),sx(14),'#2d2a4e',0,8,()=>text('FOOD',0,sx(3),6,'#f4e7a0','monospace'));
    poster(sx(60),ly(250,1),sx(96),sx(104),0);
    sheet(sx(250),ly(260,1),sx(86),sx(54),'#dbc68a',.05,9,()=>{text('READ THE SOURCE.',0,-sx(4),6.5,'#463149','monospace',400);text('KEEP THE LABEL.',0,sx(8),6.5,'#463149','monospace',400);});
   }
   for(let b=Math.max(2,Math.floor((camY-100)/230));b<(camY+viewH+100)/230;b++){const wy=b*230+hash(b)*60,a=Math.min(1,(wy-900)/300);if(a<=0)continue;ctx.globalAlpha=wall*a;
    const w=sx(70+hash(b+1)*40);poster(sx(30+hash(b)*(W-60)),ly(wy,1),w,w*1.2,b);}
   ctx.globalAlpha=1;}
  ctx.restore();
 }
 function paper(it){
  const x=px(it),cx=sx(x+PLAT_W/2),y=sy(it.y+(it.by||0)),w=sx(PLAT_W),hh=sx(11),cy=y+hh/2-scale,rot=(hash(it.y)-.5)*.08+(it.broken?(hash(it.y+1)-.5)*3*(-(it.by||0)/200):0);
  if(it.type==='monster'||it.type==='hole'||(it.broken&&y>canvas.height+50))return;
  if(it.type==='breaking'){ // two paper halves with a torn edge between
   for(const s of[-1,1])sheet(cx+s*w/4,cy+(it.broken?s*sx(3):0),w/2-scale,hh,'#c58558',rot+(it.broken?s*.25:0),Math.round(it.y)+s,null,{edge:'#7a4a30'});
   ctx.strokeStyle='#4a2a1a';ctx.lineWidth=scale*1.2;ctx.beginPath();ctx.moveTo(cx,cy-hh/2);ctx.lineTo(cx-sx(3),cy-sx(1));ctx.lineTo(cx+sx(2),cy+sx(1));ctx.lineTo(cx,cy+hh/2);ctx.stroke();
  }else{
   sheet(cx,cy,w,hh,it.type==='moving'?'#8cc3d1':'#d7c28a',rot,Math.round(it.y),it.type==='moving'?()=>{tape(-w/2+sx(5),0,-.3);tape(w/2-sx(5),0,.3);}:null);
  }
  if(it.type==='spring'){ctx.save();ctx.translate(cx,y);for(const [o,c,wd] of[[2,SHADOW,5],[0,'#fff4dc',4]]){ctx.strokeStyle=c;ctx.lineWidth=wd*scale;ctx.lineJoin='bevel';ctx.beginPath();ctx.moveTo(-sx(7)+o,0);for(let i=0;i<4;i++)ctx.lineTo(i%2?-sx(7)+o:sx(7)+o,-(i+1)*sx(4)+o);ctx.stroke();}ctx.strokeStyle=EDGE;ctx.lineWidth=scale;ctx.stroke();ctx.restore();}
  if(it.gear==='jetpack')sheet(cx,y-sx(9),sx(11),sx(16),'#e45a5a',0,3,()=>{ctx.fillStyle='#ffb24d';ctx.fillRect(-sx(3),sx(6),sx(6),sx(5));},{shadow:2});
  else if(it.gear)sheet(cx,y-sx(8),sx(16),sx(7),'#7fe6ff',-.2,4,()=>{ctx.beginPath();ctx.moveTo(-sx(8),0);ctx.lineTo(sx(8),0);ctx.stroke();},{shadow:2});
 }
 function foe(it){
  if(it.broken)return;const x=sx(it.x),y=sy(it.y);
  if(it.type==='hole'){const cx=x+sx(30),cy=y-sx(30);const r=ctx.createRadialGradient(cx,cy,0,cx,cy,sx(34));r.addColorStop(0,'#000');r.addColorStop(.6,'#1a0830');r.addColorStop(1,'#7a3cc800');ctx.fillStyle=r;ctx.beginPath();ctx.arc(cx,cy,sx(34),0,7);ctx.fill();ctx.strokeStyle='#b57cff';ctx.lineWidth=2*scale;ctx.beginPath();ctx.arc(cx,cy,sx(18),t*4,t*4+4);ctx.stroke();return;}
  if(it.type==='monster'){ctx.fillStyle='#69b04a';ctx.strokeStyle='#1d3a1a';ctx.lineWidth=2*scale;ctx.beginPath();ctx.ellipse(x+sx(25),y-sx(16),sx(25),sx(16),0,0,7);ctx.fill();ctx.stroke();
   ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+sx(25),y-sx(18),sx(8),0,7);ctx.fill();ctx.fillStyle='#000';ctx.beginPath();ctx.arc(x+sx(25+3*Math.sign(p.x-it.x-25)),y-sx(18),sx(3.5),0,7);ctx.fill();
   ctx.strokeStyle='#1d3a1a';for(const k of[-1,1]){ctx.beginPath();ctx.moveTo(x+sx(25+k*14),y-sx(30));ctx.lineTo(x+sx(25+k*20),y-sx(42));ctx.stroke();}}
 }
 function tag(i,m){
  const wy=markerHeight(i),y=sy(wy);if(y<-80||y>canvas.height+80)return;const left=i%2===0,x=left?sx(6):sx(W-150),w=sx(144),h=sx(46);
  ctx.save();ctx.translate(x+w/2,y);ctx.rotate(left?-.03:.03);ctx.strokeStyle='#ffffff55';ctx.lineWidth=scale;ctx.beginPath();ctx.moveTo(left?-w/2:w/2,0);ctx.lineTo(left?-w/2-sx(8):w/2+sx(8),-sx(30));ctx.stroke();
  ctx.fillStyle='#ead9a6';ctx.strokeStyle='#8c7646';ctx.lineWidth=2*scale;ctx.fillRect(-w/2,-h/2,w,h);ctx.strokeRect(-w/2,-h/2,w,h);ctx.textAlign='left';
  ctx.fillStyle='#463149';ctx.font=`700 ${11*scale}px system-ui,sans-serif`;ctx.fillText(m.name,-w/2+sx(6),-sx(6));ctx.font=`${9*scale}px monospace`;ctx.fillText(m.date,-w/2+sx(6),sx(6));ctx.fillText(`P${m.p} C${m.c} F${m.f}`,-w/2+sx(6),sx(17));ctx.restore();
 }
 function me(){
  const x=sx(p.x),y=sy(p.y),k=PH/240*scale;
  for(const dx of[0,W*scale,-W*scale]){ctx.save();ctx.translate(x+dx,y);ctx.scale(p.face*k,k);ctx.translate(-100,-236);
   ctx.shadowColor='#49334b88';ctx.shadowOffsetX=3*scale;ctx.shadowOffsetY=3*scale;ctx.fillStyle=art.colour;ctx.strokeStyle='#2a1838';ctx.lineWidth=4;ctx.lineJoin='round';ctx.fill(shape);ctx.shadowColor='transparent';ctx.stroke(shape);
   const [ex,ey,er]=art.eye;ctx.fillStyle='#fff8eb';ctx.beginPath();ctx.arc(ex,ey,er*1.7,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#2a1838';ctx.beginPath();ctx.arc(ex+er*.5,ey,er*.8,0,7);ctx.fill();
   if(p.fly>0){ctx.rotate(0);if(p.gear==='propeller'){ctx.fillStyle='#7fe6ff';ctx.fillRect(80,0,40,8);ctx.fillRect(100-60*Math.cos(t*30),-6,120*Math.abs(Math.cos(t*30))||4,5);}else{ctx.fillStyle='#e45a5a';ctx.fillRect(40,100,20,60);ctx.fillRect(140,100,20,60);ctx.fillStyle='#ffb24d';ctx.fillRect(44,160,12,30+30*Math.random());ctx.fillRect(144,160,12,30+30*Math.random());}}
   ctx.restore();}
 }
 function draw(){
  bg();tags.forEach((m,i)=>tag(i,m));lvl.items.forEach(paper);lvl.items.forEach(foe);me();
  const s=Math.floor(maxY/10);ctx.fillStyle='#fff4dc';ctx.strokeStyle='#000a';ctx.lineWidth=3*scale;ctx.textAlign='left';ctx.font=`800 ${18*scale}px monospace`;ctx.strokeText(String(s),sx(10),sx(26));ctx.fillText(String(s),sx(10),sx(26));
  ctx.font=`${10*scale}px monospace`;ctx.fillText('BEST '+Math.max(best,s),sx(10),sx(40));
  const past=tags.filter((_,i)=>markerHeight(i)<=p.y);if(tags.length){const m=past.at(-1)||tags[0];ctx.textAlign='right';ctx.font=`700 ${10*scale}px monospace`;ctx.fillStyle='#ead9a6';ctx.strokeText(m.date,sx(W-6),sx(120));ctx.fillText(m.date,sx(W-6),sx(120));ctx.font=`${8*scale}px monospace`;ctx.fillText('YOU ATE',sx(W-6),sx(108));}
 }
 function tick(now){raf=requestAnimationFrame(tick);if(disposed)return;const dt=Math.min(.033,last?(now-last)/1000:0);last=now;if(!document.hidden){step(dt);draw();}}
 raf=requestAnimationFrame(tick);
 return {
  state:()=>({p,camY,maxY,dead,items:lvl.items}),
  teleport(h){lvl.ensure(h+viewH*2);p.y=h;p.vy=JUMP;camY=h-viewH*.45;maxY=Math.max(maxY,h);},
  dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);ro.disconnect();unsub?.();removeEventListener('keydown',kd);removeEventListener('keyup',ku);removeEventListener('pointerup',pu);removeEventListener('pointercancel',pu);canvas.remove();exit.remove();over.remove();},
 };
}
