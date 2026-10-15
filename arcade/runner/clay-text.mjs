// Rolled-out clay letters on a canvas, copied from the site (tv/assets/armie-intro/chase-ui.mjs clayText).
export function clayText(text,height=40){
  let seed=[...text].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7);const rnd=()=>(seed=seed*1664525+1013904223>>>0)/4294967296;
  const dpr=Math.min(2,devicePixelRatio||1),fs=height*.74,font=`900 ${fs}px "Arial Rounded MT Bold","Arial Black","Segoe UI Black",system-ui,sans-serif`;
  const c=document.createElement('canvas'),x=c.getContext('2d');x.font=font;
  const letters=[...text.toUpperCase()].map(ch=>({ch,w:ch===' '?fs*.32:x.measureText(ch).width+fs*.1,r:(rnd()-.5)*.22,dy:(rnd()-.5)*fs*.1}));
  const w=letters.reduce((a,l)=>a+l.w,0)+fs*.5;c.width=Math.ceil(w*dpr);c.height=Math.ceil(height*dpr);c.style.width=w+'px';c.style.height=height+'px';
  x.scale(dpr,dpr);x.font=font;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';
  const each=fn=>{let px=fs*.25;for(const l of letters){if(l.ch!==' '){x.save();x.translate(px+l.w/2,height/2+l.dy);x.rotate(l.r);fn(l);x.restore();}px+=l.w;}};
  x.shadowColor='#000c';x.shadowBlur=fs*.12;x.shadowOffsetY=fs*.07;x.strokeStyle=x.fillStyle='#3a1a4a';x.lineWidth=fs*.27;each(l=>{x.strokeText(l.ch,0,0);x.fillText(l.ch,0,0);});
  x.shadowColor='transparent';const g=x.createLinearGradient(0,height*.15,0,height*.85);g.addColorStop(0,'#b07acc');g.addColorStop(.45,'#8e5b99');g.addColorStop(1,'#5e3270');
  x.strokeStyle=x.fillStyle=g;x.lineWidth=fs*.19;each(l=>{x.strokeText(l.ch,0,0);x.fillText(l.ch,0,0);});
  x.strokeStyle='#d6a8ea88';x.lineWidth=fs*.035;each(l=>{x.save();x.translate(-fs*.025,-fs*.04);x.beginPath();x.rect(-l.w,-fs,l.w*2,fs*.75);x.clip();x.strokeText(l.ch,0,0);x.restore();});
  x.globalCompositeOperation='source-atop';for(let i=0;i<w*1.4;i++){x.fillStyle=rnd()<.5?'#512866':'#c79ce0';x.globalAlpha=.08+rnd()*.12;x.beginPath();x.ellipse(rnd()*w,rnd()*height,1+rnd()*fs*.09,1+rnd()*fs*.05,rnd()*3,0,7);x.fill();}
  x.globalAlpha=1;x.globalCompositeOperation='source-over';
  let px=fs*.25;letters.forEach((l,i)=>{if(l.ch!==' '&&rnd()<.3){const bx=px+l.w*(.3+rnd()*.4),by=height*(.3+rnd()*.4),a=rnd()*3,s=fs*.07;x.save();x.translate(bx,by);x.rotate(a);x.fillStyle='#d4a017';x.fillRect(-s*1.6,-s*.35,s*3.2,s*.7);for(const ex of[-1.6,1.6])for(const ey of[-.4,.4]){x.beginPath();x.arc(ex*s,ey*s,s*.45,0,7);x.fill();}x.restore();}px+=l.w;});
  return c;
}
