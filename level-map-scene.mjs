// A deliberately small canvas effect: no models, downloads, gameplay state, or XP writes.
const SHIPS=['supportive','direct','analytical','playful','calm','mom'];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const sprite=[
 '.......11.......','......1221......','......1221......','.....123321.....',
 '....12344321....','...1234554321...','..123456654321..','1123456776543211',
 '1123456776543211','..123456654321..','...1234554321...','....12344321....',
 '.....123321.....','......1881......','.....8.88.8.....','....8..88..8....'
];
const colors={supportive:['#142b40','#70b4db','#b9edff','#f4e6b2','#f37f42','#ffe4a0','#fff8de','#e66638'],direct:['#302644','#b59ce8','#e6caff','#ffdfad','#d95f51','#ff9c65','#fff4db','#e65d39'],analytical:['#183a40','#60d3cc','#b8fff0','#e1e8ff','#6b8fea','#afd3ff','#fff8de','#e66638'],playful:['#3d2445','#fa9ccf','#ffd7ec','#ffecae','#fc7d87','#ffc484','#fff8de','#e66638'],calm:['#173a36','#7dbea7','#c6f5d7','#f8e8be','#8ecbc6','#d7fff0','#fff8de','#e66638'],mom:['#402824','#dba579','#f7d5ad','#fff0c9','#d86d50','#ffbc7f','#fff8de','#e66638']};
function drawShip(ctx,x,y,style,t){
 const palette=colors[SHIPS.includes(style)?style:'supportive'],pixel=3;
 ctx.save();ctx.translate(Math.round(x-24),Math.round(y-24));
 // Each selected catalog hull has its own readable silhouette at this small resolution.
 ctx.fillStyle=palette[1];
 if(style==='supportive'){for(const px of [1,37]){ctx.fillRect(px,19,10,12);ctx.fillRect(px+2,31,6,9);}}
 if(style==='direct'){ctx.fillRect(0,28,15,5);ctx.fillRect(33,28,15,5);ctx.fillRect(3,23,10,6);ctx.fillRect(35,23,10,6);}
 if(style==='analytical'){ctx.fillRect(4,32,40,4);ctx.fillRect(4,25,4,11);ctx.fillRect(40,25,4,11);ctx.fillRect(12,36,24,5);}
 if(style==='playful'){ctx.fillRect(4,3,5,26);ctx.fillRect(39,3,5,26);ctx.fillRect(0,30,11,10);ctx.fillRect(37,30,11,10);}
 if(style==='calm'){ctx.fillRect(9,12,30,28);ctx.fillRect(13,7,22,5);ctx.fillRect(13,40,22,5);}
 if(style==='mom'){ctx.fillRect(2,18,44,22);ctx.fillRect(17,6,14,15);ctx.fillRect(4,10,9,13);ctx.fillRect(35,10,9,13);}
 for(let row=0;row<16;row++)for(let col=0;col<16;col++){
  const code=Number(sprite[row][col]);if(!code)continue;
  ctx.fillStyle=palette[code-1]||palette[0];ctx.fillRect(col*pixel,row*pixel,pixel,pixel);
 }
 ctx.fillStyle=t%360<180?'#f58b40':'#ffe5a0';ctx.fillRect(19,48,4,8);ctx.fillRect(27,48,4,8);ctx.restore();
}
export function mountLevelMapScene(canvas,{ship='supportive',reducedMotion=false}={}){
 const ctx=canvas.getContext('2d');if(!ctx)return {start(){},stop(){},fire(){},aim(){},setShip(){},resize(){}};
 let running=false,raf=0,w=1,h=1,last=0,time=0,style=ship,aimX=.5,aimY=.72,x=.5,y=.72;
 const asteroids=Array.from({length:9},(_,i)=>({x:((i*37+19)%97)/100,y:((i*29+8)%103)/100,r:3+i%4*2,s:.000035+i%5*.000016,hit:0}));
 const lasers=[];const blasts=[];
 const resize=()=>{const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);w=Math.max(1,rect.width);h=Math.max(1,rect.height);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();};
 function draw(){ctx.clearRect(0,0,w,h);const now=time;
  for(const a of asteroids){if(a.hit>0)continue;ctx.fillStyle='#758a9caa';const px=a.x*w,py=a.y*h;ctx.beginPath();ctx.moveTo(px-a.r,py);ctx.lineTo(px-a.r*.35,py-a.r);ctx.lineTo(px+a.r*.8,py-a.r*.6);ctx.lineTo(px+a.r,py+a.r*.4);ctx.lineTo(px,py+a.r);ctx.closePath();ctx.fill();ctx.fillStyle='#b8d7e3aa';ctx.fillRect(px-a.r*.5,py-a.r*.4,Math.max(2,a.r*.5),2);}
  for(const l of lasers){ctx.strokeStyle='#b9faff';ctx.lineWidth=2;ctx.shadowBlur=12;ctx.shadowColor='#60e6ff';ctx.beginPath();ctx.moveTo(l.x*w,l.y*h);ctx.lineTo(l.x*w,(l.y-.08)*h);ctx.stroke();ctx.shadowBlur=0;}
  for(const b of blasts){ctx.strokeStyle=`rgba(255,190,105,${Math.max(0,1-b.age/380)})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x*w,b.y*h,3+b.age/24,0,Math.PI*2);ctx.stroke();}
  drawShip(ctx,x*w,y*h,style,now);
 }
 function frame(now){if(!running)return;const dt=Math.min(40,Math.max(0,now-last));last=now;time+=dt;
  x+=(aimX-x)*Math.min(1,dt*.009);y+=(aimY-y)*Math.min(1,dt*.009);
  for(const a of asteroids){if(a.hit>0){a.hit-=dt;continue;}a.y+=a.s*dt;if(a.y>1.05){a.y=-.08;a.x=(a.x+.37)%1;}}
  for(let i=lasers.length-1;i>=0;i--){const l=lasers[i];l.y-=dt*.0016;if(l.y<-.1){lasers.splice(i,1);continue;}const hit=asteroids.find(a=>a.hit<=0&&Math.abs(a.x-l.x)*w<a.r+5&&Math.abs(a.y-l.y)*h<a.r+10);if(hit){hit.hit=700;blasts.push({x:hit.x,y:hit.y,age:0});lasers.splice(i,1);}}
  for(let i=blasts.length-1;i>=0;i--){blasts[i].age+=dt;if(blasts[i].age>380)blasts.splice(i,1);}
  draw();raf=requestAnimationFrame(frame);
 }
 function start(){resize();if(running||reducedMotion||document.hidden)return;running=true;last=performance.now();raf=requestAnimationFrame(frame);}
 function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0;}
 return {start,stop,resize,aim(clientX,clientY){const r=canvas.getBoundingClientRect();aimX=clamp((clientX-r.left)/r.width,.12,.88);aimY=clamp((clientY-r.top)/r.height,.16,.88);if(reducedMotion){x=aimX;y=aimY;draw();}},fire(){if(reducedMotion){draw();return;}lasers.push({x,y:y-.04});},setShip(value){style=value;draw();}};
}
