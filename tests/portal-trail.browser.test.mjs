// #105 (W2-2E/2E2): a magical finger trail on #portalOverlay — a wide soft neon glow flowing through the six
// neons along its length over a soft dark underglow, a vivid core with a white-hot centre, twinkling dust
// shed from the fingertip and the recent path, a star-flare tip, and a shimmer along the path on release.
// Reduced motion: a plain glowing line, no particles. Visual judgement uses the test-only trail probe
// (window.__portalTrailProbe → myr5Portal.trailProbe), which draws a fixed stroke with fresh timestamps
// straight to the renderer: synthetic mouse drags press the WebGL cloth on every move and take longer than
// the 0.8s fade here, so their frames only ever caught the trail half-faded. Frames land in .frames/ (untracked).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const FRAMES_DIR=resolve('.frames');

async function withPortal(run){
 const source=resolve('.'),built=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__portal__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script>');return;}
  try{const root=path.startsWith('/modules/portal/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}
async function open(page){return page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();return !!window.portal.current();});}
async function openProbePage(browser,url,{reduced=false,dpr=1}={}){
 const page=await browser.newPage({viewport:{width:375,height:812},deviceScaleFactor:dpr});
 await page.addInitScript(()=>{window.__portalTrailProbe=true;});
 if(reduced)await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(url);
 assert(await open(page),'real WebGL Quilt must load');
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 return page;
}
// A brisk ~350px swoop: a quarter arc up from lower left, then a straight run right to the tip, a point every
// ~6px. The straight run sits on a pixel-row centre (y=420.5) so the cross-section is measured unblurred.
const PROBE_PATH=(()=>{
 const pts=[];
 for(let i=0;i<=36;i++){const a=Math.PI*(1+i/72);pts.push([190+140*Math.cos(a),560.5+140*Math.sin(a)]);}
 for(let x=196;x<=320;x+=6)pts.push([x,420.5]);
 return pts;
})();
const TIP=PROBE_PATH.at(-1),CROSS_X=260; // cross-section 60px behind the tip (age ~60ms: full strength)

// Distinct-hue "buckets" of the lit (non-background, opaque-ish) pixels on the overlay canvas — a flat
// single-colour line collapses to ~1 bucket; the flowing multi-neon ribbon spans several.
async function litHueBuckets(page){
 return page.evaluate(()=>{
  const c=document.getElementById('portalOverlay'),ctx=c.getContext('2d');
  const d=ctx.getImageData(0,0,c.width,c.height).data,seen=new Set();
  for(let i=0;i<d.length;i+=4*4){
   const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
   if(a<40||(r<40&&g<40&&b<40))continue;
   seen.add(`${r>>5},${g>>5},${b>>5}`);
  }
  return seen.size;
 });
}
async function anyLitPixel(page){
 return page.evaluate(()=>{
  const c=document.getElementById('portalOverlay'),ctx=c.getContext('2d');
  const d=ctx.getImageData(0,0,c.width,c.height).data;
  for(let i=0;i<d.length;i+=4)if(d[i+3]>40&&(d[i]>60||d[i+1]>60||d[i+2]>60))return true;
  return false;
 });
}
// Measures the probe frame on the overlay canvas alone (transparent background, so the quilt texture can't
// skew it), in CSS px at whatever devicePixelRatio the page has (the overlay renders at up to 2×, as on a phone):
// - sparkle px, on the frame as drawn: lit pixels (alpha ≥ .3) clear of the neon glow (> 14px from the path;
//   the faint underglow stays under that alpha) and of the tip flare (> 36px from the tip), i.e. dust that has
//   drifted off the trail, as CSS-px area;
// - widths, on the same stroke redrawn without dust (so no mote drifts across the scan): a vertical
//   cross-section of the straight run at CROSS_X: dark underglow extent (alpha ≥ .03), neon glow
//   extent (alpha ≥ .2 and coloured), core width as the sub-pixel coverage of the opaque layer over the glow
//   beneath it, white-hot width as the sub-pixel white fraction over the core's own neon.
async function measureTrail(page){
 return page.evaluate(({path,tip,crossX})=>{
  const c=document.getElementById('portalOverlay'),s=c.width/c.getBoundingClientRect().width,W=c.width,H=c.height;
  let data=c.getContext('2d').getImageData(0,0,W,H).data;
  const segDist=(x,y)=>{let best=1e9;for(let i=1;i<path.length;i++){const[ax,ay]=path[i-1],[bx,by]=path[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));best=Math.min(best,Math.hypot(x-ax-dx*t,y-ay-dy*t));}return best;};
  let sparkle=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   if(data[(y*W+x)*4+3]<77)continue;
   const X=(x+.5)/s,Y=(y+.5)/s;
   if(Math.hypot(X-tip[0],Y-tip[1])>36&&segDist(X,Y)>14)sparkle++;
  }
  window.portal.trailProbe.draw(path,{dust:false});data=c.getContext('2d').getImageData(0,0,W,H).data;
  const px=(x,y)=>{const i=(y*W+x)*4;return[data[i],data[i+1],data[i+2],data[i+3]/255];};
  const cx=Math.floor(crossX*s),col=[];for(let y=Math.floor((tip[1]-40)*s);y<Math.ceil((tip[1]+40)*s);y++)col.push(px(cx,y));
  const peak=Math.max(...col.map(p=>p[3])),top=col.map((p,i)=>p[3]>=peak-.02?i:-1).filter(i=>i>=0),mid=Math.round((top[0]+top.at(-1))/2);
  const under=col.filter(p=>p[3]>=.03).length/s,glow=col.filter(p=>p[3]>=.2&&Math.max(p[0],p[1],p[2])>=110).length/s;
  const base=(col[mid-Math.round(6*s)][3]+col[mid+Math.round(6*s)][3])/2;
  const core=col.reduce((sum,p)=>sum+Math.min(1,Math.max(0,(p[3]-base)/(peak-base))),0)/s;
  const neon=col[mid-Math.floor(2*s)],ch=neon.indexOf(Math.min(neon[0],neon[1],neon[2]));
  const hot=col.reduce((sum,p)=>sum+(p[3]>.9?Math.min(1,Math.max(0,(p[ch]-neon[ch])/(255-neon[ch]))):0),0)/s;
  const r2=v=>Math.round(v*100)/100;
  return{dpr:s,underglowPx:r2(under),glowPx:r2(glow),corePx:r2(core),hotPx:r2(hot),sparklePx:Math.round(sparkle/(s*s))};
 },{path:PROBE_PATH,tip:TIP,crossX:CROSS_X});
}
// A 3× nearest-neighbour zoom of the tip (80×80 CSS px → 240×240), so the flare's construction is visible.
async function saveTipZoom(page,file){
 const png=await page.screenshot({clip:{x:TIP[0]-40,y:TIP[1]-40,width:80,height:80}});
 const zoomed=await page.evaluate(async src=>{
  const img=new Image();img.src=src;await img.decode();
  const c=document.createElement('canvas');c.width=img.width*3;c.height=img.height*3;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0,c.width,c.height);
  return c.toDataURL('image/png').split(',')[1];
 },'data:image/png;base64,'+png.toString('base64'));
 await writeFile(file,Buffer.from(zoomed,'base64'));
}

test('#105 trail at full strength: wide flowing neon glow, vivid core, white-hot centre, dust, star tip',async()=>withPortal(async(browser,url)=>{
 await mkdir(FRAMES_DIR,{recursive:true});
 const page=await openProbePage(browser,url);
 const motes=await page.evaluate(path=>window.portal.trailProbe.draw(path),PROBE_PATH);
 await page.screenshot({path:resolve(FRAMES_DIR,'trail-full-v4.png')});
 await saveTipZoom(page,resolve(FRAMES_DIR,'trail-tip-zoom3x-v4.png'));
 const buckets=await litHueBuckets(page),m=await measureTrail(page);
 await page.close();
 // Same frame at 2× (the overlay's cap, what a phone renders): sub-pixel widths resolve properly there.
 const page2=await openProbePage(browser,url,{dpr:2});
 await page2.evaluate(path=>window.portal.trailProbe.draw(path),PROBE_PATH);
 const m2=await measureTrail(page2);
 await page2.close();
 console.log(`#105 full-strength trail @1x: ${JSON.stringify({...m,motes,hueBuckets:buckets})}`);
 console.log(`#105 full-strength trail @2x: ${JSON.stringify(m2)}`);
 assert(buckets>3,`expected several distinct hues along the flowing ribbon, saw ${buckets}`);
 assert(motes>=100,`expected plenty of dust in flight, only ${motes} motes alive`);
 for(const r of [m,m2]){
  assert(r.glowPx>=20&&r.glowPx<=30,`wide soft glow should be ~20-28px, measured ${r.glowPx}px @${r.dpr}x`);
  assert(r.underglowPx>r.glowPx,`dark underglow (${r.underglowPx}px) should extend past the glow (${r.glowPx}px) @${r.dpr}x`);
  assert(r.corePx>=5.5&&r.corePx<=7.5,`vivid core should be ~6-7px, measured ${r.corePx}px @${r.dpr}x`);
  assert(r.hotPx>=1&&r.hotPx<=2.5,`white-hot centre should be ~1.5px, measured ${r.hotPx}px @${r.dpr}x`);
  assert(r.sparklePx>=100,`expected plenty of visible dust off the trail, only ${r.sparklePx} sparkle px @${r.dpr}x`);
 }
}));

test('#105 release: still lit and shimmering 0.3s after release, fully gone once the fade and dust run out',async()=>withPortal(async(browser,url)=>{
 await mkdir(FRAMES_DIR,{recursive:true});
 const page=await openProbePage(browser,url);
 await page.evaluate(path=>window.portal.trailProbe.draw(path,{releasedAgoMs:300}),PROBE_PATH);
 await page.screenshot({path:resolve(FRAMES_DIR,'trail-release-v4.png')});
 assert(await anyLitPixel(page),'the trail should still be fading 0.3s after release (light-painting)');
 assert(await litHueBuckets(page)>3,'the fading trail keeps its flowing neons');
 // Real-time fade: a live probe stroke (no cloth press), released, then checked after the 0.8s ribbon fade,
 // the 0.45s release shimmer and the 0.7s life of its last dust have all run out.
 const lit=await page.evaluate(path=>new Promise(done=>{
  const p=window.portal.trailProbe;p.resume();p.down(...path[0]);path.slice(1).forEach(pt=>p.move(...pt));p.up();
  setTimeout(()=>{
   const c=document.getElementById('portalOverlay'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   for(let i=0;i<d.length;i+=4)if(d[i+3]>40&&(d[i]>60||d[i+1]>60||d[i+2]>60)){done(true);return;}
   done(false);
  },1600);
 }),PROBE_PATH);
 assert.equal(lit,false,'the trail and its dust should be fully gone ~1.6s after release');
 await page.close();
}));

test('#105 reduced motion: a plain single-colour line, no sparkles/ribbon flow',async()=>withPortal(async(browser,url)=>{
 const page=await openProbePage(browser,url,{reduced:true});
 await page.evaluate(path=>window.portal.trailProbe.draw(path),PROBE_PATH);
 const buckets=await litHueBuckets(page),m=await measureTrail(page);
 assert(buckets<=2,`reduced motion should be a plain glowing line, saw ${buckets} distinct hues`);
 assert.equal(m.sparklePx,0,'reduced motion draws no dust');
 await page.close();
}));

// Kept on real pointer events (the probe skips shape matching). Sparse steps: each synthetic pointermove
// presses the cloth board, which is slow here.
async function dragRect(page,r,inset=.06){
 const x0=r.left+r.width*inset,y0=r.top+r.height*inset,x1=r.left+r.width*(1-inset),y1=r.top+r.height*(1-inset);
 await page.mouse.move(x0,y0);await page.mouse.down();
 await page.mouse.move(x1,y0,{steps:3});await page.mouse.move(x1,y1,{steps:3});
 await page.mouse.move(x0,y1,{steps:3});await page.mouse.move(x0,y0,{steps:3});
}
test('#105 a matched trace flashes the destination colour before the cut starts',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.goto(url);
 assert(await open(page));
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 const r=await page.evaluate(()=>window.portal.current().patternRect());
 await dragRect(page,r);
 await page.mouse.up();
 // 450ms recognizer debounce, then the trail flash (outlineFlash) is live for ~350ms: sample mid-flash.
 await page.waitForTimeout(600);
 const orangeish=await page.evaluate(()=>{
  const c=document.getElementById('portalOverlay'),ctx=c.getContext('2d');
  const d=ctx.getImageData(0,0,c.width,c.height).data;
  for(let i=0;i<d.length;i+=4){
   const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
   if(a>80&&r>170&&g>50&&g<160&&b<90)return true; // #ff5f1f-ish (Workout/rect neon)
  }
  return false;
 });
 assert(orangeish,'the traced trail should flash the Workout/rect neon (#ff5f1f) once the shape matches');
 await page.close();
}));

test('#105 holds its frame rate at 375x812 under 4x CPU throttle while drawing a live trail',async()=>withPortal(async(browser,url)=>{
 const page=await openProbePage(browser,url);
 const client=await page.context().newCDPSession(page);
 await client.send('Emulation.setCPUThrottlingRate',{rate:4});
 // Idle board first, then a 3s brisk figure-eight fed one point per frame through the probe (the real
 // renderer, minus the cloth press), so the ribbon, flare and a full dust pool are all live the whole time.
 const{idle,fps,frames,ms}=await page.evaluate(()=>{
  const p=window.portal.trailProbe,at=t=>[187+140*Math.sin(t*2.2),420+260*Math.sin(t*4.4)];
  const run=(secs,feed)=>new Promise(done=>{
   const t0=performance.now();let frames=0;if(feed)p.down(...at(0));
   const tick=()=>{frames++;const t=(performance.now()-t0)/1000;if(feed)p.move(...at(t));if(t<secs)requestAnimationFrame(tick);else{if(feed)p.up();done({fps:frames/t,frames,ms:Math.round(t*1000)});}};
   requestAnimationFrame(tick);
  });
  return run(1.5,false).then(idle=>run(3,true).then(trail=>({idle:idle.fps,...trail})));
 });
 await client.send('Emulation.setCPUThrottlingRate',{rate:1});
 console.log(`#105 live probe trail under 4x CPU throttle @375x812: ${fps.toFixed(1)} fps (${frames} frames / ${ms}ms); idle board ${idle.toFixed(1)} fps`);
 // Judged against the idle board on the same page, not an absolute floor: the full suite runs many headless
 // browsers at once on this box, which drags both numbers down together.
 assert(fps>=idle*.5,`the trail should cost at most half the idle frame rate under 4x throttle: ${fps.toFixed(1)} vs idle ${idle.toFixed(1)} fps`);
 await page.close();
}));
