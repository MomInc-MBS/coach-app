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
 function bg(){
  const h=camY+viewH/2,g=ctx.createLinearGradient(0,0,0,canvas.height);g.addColorStop(0,rgb(sky(camY+viewH)));g.addColorStop(1,rgb(sky(camY)));ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
  const star=Math.min(1,Math.max(0,(h-3800)/2000));
  if(star>0){ctx.fillStyle=`rgba(255,248,220,${star})`;const o=camY*.3;for(let i=Math.floor(o/50);i<(o+viewH)/50+1;i++)for(let k=0;k<3;k++){ctx.fillRect(sx(hash(i*3+k)*W),(viewH-(i*50+hash(i+k*7)*50-o))*scale,scale*1.6,scale*1.6);}}
  if(h<2500){ // office: floor, striped wall, windows, filing cabinets, and the pyramid we left behind
   ctx.fillStyle='#6a5240';ctx.fillRect(0,sy(-30),canvas.width,canvas.height);
   ctx.fillStyle='#ffffff14';for(let x=0;x<W;x+=48)ctx.fillRect(sx(x),0,sx(14),sy(-30));
   for(let y=300;y<2400;y+=420){ctx.fillStyle='#bfe3ee';ctx.fillRect(sx(250),sy(y+90),sx(70),sx(90));ctx.strokeStyle='#4c3a2c';ctx.lineWidth=3*scale;ctx.strokeRect(sx(250),sy(y+90),sx(70),sx(90));}
   ctx.fillStyle='#8c8f98';ctx.fillRect(sx(20),sy(70),sx(46),sx(100));ctx.fillRect(sx(66),sy(50),sx(46),sx(80));
   ctx.beginPath();ctx.moveTo(sx(W/2-70),sy(-30));ctx.lineTo(sx(W/2),sy(70));ctx.lineTo(sx(W/2+70),sy(-30));ctx.closePath();ctx.fillStyle='#e8d28a';ctx.fill();ctx.strokeStyle='#4c3a2c';ctx.stroke();
  }
  ctx.save();ctx.textAlign='center';
  for(let b=Math.floor(1500/300);b<Math.ceil(4800/300);b++){const wy=b*300+150,y=sy(wy);if(y<-200||y>canvas.height+200)continue;
   const a=Math.min(1,(wy-1500)/300,(4800-wy)/300);if(a<=0)continue;ctx.globalAlpha=a;ctx.save();ctx.translate(sx(40+hash(b)*(W-110)+35),y);ctx.rotate((hash(b+9)-.5)*.14);
   ctx.fillStyle='#e5d4a2';ctx.strokeStyle='#ad9769';ctx.lineWidth=2*scale;ctx.fillRect(-sx(40),-sx(34),sx(80),sx(68));ctx.strokeRect(-sx(40),-sx(34),sx(80),sx(68));
   ctx.fillStyle='#4c3255';ctx.font=`700 ${9*scale}px Georgia,serif`;const l=LINES[b%LINES.length];ctx.fillText(l,0,3*scale);ctx.fillText('★ MOM INC. ★',0,-sx(14));ctx.restore();}
  ctx.globalAlpha=1;
  for(let b=Math.floor(6500/420);b<Math.ceil(11200/420);b++){const wy=b*420+100,y=sy(wy);if(y<-300||y>canvas.height+300)continue; // space ports
   const a=Math.min(1,(wy-6500)/500,(11200-wy)/500);if(a<=0)continue;ctx.globalAlpha=a;const x=hash(b+3)<.5?-20:W-120;
   ctx.fillStyle='#2a2f55';ctx.fillRect(sx(x),y-sx(26),sx(140),sx(52));ctx.fillStyle='#4a528e';ctx.fillRect(sx(x),y-sx(6),sx(140),sx(8));
   ctx.fillStyle='#ffd66a';for(let i=0;i<5;i++)ctx.fillRect(sx(x+14+i*24),y+sx(8),sx(8),sx(8));ctx.fillStyle='#7fe6ff';ctx.fillRect(sx(x<0?x+140:x-40),y-sx(3),sx(40),sx(6));
   if(b%3===0){ctx.fillStyle='#fff4dc';ctx.font=`700 ${8*scale}px monospace`;ctx.fillText('MOM PORT '+b,sx(x+70),y-sx(32));}}
  ctx.globalAlpha=1;
  if(camY<4600&&h>3000){ctx.fillStyle='#2f6fb4';ctx.beginPath();ctx.arc(sx(W/2),sy(3000),sx(1500),0,7);ctx.fill();ctx.strokeStyle='#9fd4ff';ctx.lineWidth=4*scale;ctx.stroke();} // orbit: the planet we left sinks away below
  if(h>9000){const a=Math.min(.35,(h-9000)/3000);for(let i=0;i<4;i++){const gx=sx(hash(i+40)*W),gy=((viewH-(((i*900+camY*.5)%(viewH+400))-100))*scale);const r=ctx.createRadialGradient(gx,gy,0,gx,gy,sx(160));r.addColorStop(0,i%2?`rgba(200,60,255,${a})`:`rgba(60,200,255,${a})`);r.addColorStop(1,'#0000');ctx.fillStyle=r;ctx.fillRect(gx-sx(160),gy-sx(160),sx(320),sx(320));}}
  ctx.restore();
 }
 function paper(it){
  const x=sx(px(it)),y=sy(it.y+(it.by||0)),w=sx(PLAT_W);if(it.broken&&y>canvas.height+50)return;
  if(it.type==='monster'||it.type==='hole'){return;}
  ctx.fillStyle='#00000030';ctx.fillRect(x+2*scale,y+3*scale,w,9*scale);
  ctx.fillStyle={static:'#c8b47a',moving:'#7fb8c8',breaking:'#b9784c',spring:'#c8b47a'}[it.type];ctx.fillRect(x,y,w,9*scale);ctx.strokeStyle='#3a2a2a';ctx.lineWidth=2*scale;ctx.strokeRect(x,y,w,9*scale);
  if(it.type==='breaking'){ctx.beginPath();ctx.moveTo(x+w*.4,y);ctx.lineTo(x+w*.5,y+9*scale);ctx.stroke();}
  if(it.type==='spring'){ctx.strokeStyle='#d94a4a';ctx.lineWidth=3*scale;ctx.beginPath();for(let i=0;i<4;i++){ctx.moveTo(x+w/2-6*scale,y-i*4*scale);ctx.lineTo(x+w/2+6*scale,y-(i+.5)*4*scale);}ctx.stroke();}
  if(it.gear){ctx.fillStyle=it.gear==='jetpack'?'#e45a5a':'#7fe6ff';ctx.fillRect(x+w/2-7*scale,y-14*scale,14*scale,14*scale);ctx.strokeRect(x+w/2-7*scale,y-14*scale,14*scale,14*scale);}
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
   ctx.fillStyle=art.colour;ctx.strokeStyle='#2a1838';ctx.lineWidth=4;ctx.lineJoin='round';ctx.fill(shape);ctx.stroke(shape);
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
