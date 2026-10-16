// Aura anchoring harness (R-1017 lane AURA).
//   node tools/aura-anchor-harness.mjs <repoRoot> <outDir> [--perf] [--tiers]
// Serves <repoRoot> (this tree or the 0c4d4b2 tree for "before"), builds the camera stage like the app
// (#cameraWorkout > mannequin "camera" + <video> + #coachOverlay, front camera mirrored, 720x1280 portrait video,
// object-fit:contain), mounts the real mountWorkoutEffects and feeds workoutEffectsSnapshot details at 30 Hz from a
// stubbed pose sequence (fast squat / punches / side step). Each detection carries the pose captured 45 ms earlier
// (inference lag) plus jitter; the mannequin and the green debug skeleton show the TRUE pose now. Screenshots go to
// <outDir>; metrics (share of aura light within 0.6 torso of the true skeleton, centroid error) to report.json.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const root = resolve(process.argv[2] || '.'), out = resolve(process.argv[3] || '.r1017/shots');
const PERF = process.argv.includes('--perf'), TIERS = process.argv.includes('--tiers');

const PAGE = `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0;background:#000">
<div id=cameraWorkout style="position:fixed;inset:0;width:100vw;height:100vh;background:#000;overflow:hidden">
 <canvas id=cam width=720 height=1280 style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform:scaleX(-1)"></canvas>
 <video muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform:scaleX(-1)"></video>
 <div id=coachOverlay style="position:absolute;inset:0;pointer-events:none;z-index:3"></div>
 <canvas id=dbg width=720 height=1280 style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform:scaleX(-1);z-index:10;pointer-events:none"></canvas>
</div>
<script type=module>
import {mountWorkoutEffects,preloadWorkoutEffects} from '/arcade/workout-effects.mjs';
import {workoutEffectsSnapshot} from '/arcade/workout-effects-state.mjs';
import {EXERCISES} from '/exercise-library.mjs';
const VW=720,VH=1280,host=document.getElementById('coachOverlay'),cam=document.getElementById('cam').getContext('2d'),dbg=document.getElementById('dbg').getContext('2d');
const BONES=[[11,12],[11,23],[12,24],[23,24],[11,13],[13,15],[12,14],[14,16],[23,25],[25,27],[24,26],[26,28],[0,11],[0,12]];
// TRUE pose in video fractions at time t (s) for a motion kind.
function truePose(t,kind){
 const P=Array.from({length:33},()=>({x:.5,y:.5,visibility:.95}));
 let cx=.5,dy=0,lw=null,rw=null;
 if(kind==='squat'){const ph=(t%0.9)/0.9;dy=.13*(1-Math.cos(ph*2*Math.PI))/2;}
 if(kind==='step'){cx=.5+.17*Math.sin(t*2*Math.PI/1.2);}
 if(kind==='sway'){cx=.5+.12*Math.sin(t*2*Math.PI/1.6);}
 const s=(i,x,y)=>{P[i]={x:cx+(x-.5),y:y,visibility:.95};};
 s(0,.5,.2+dy);s(7,.47,.2+dy);s(8,.53,.2+dy);s(11,.41,.3+dy);s(12,.59,.3+dy);
 s(23,.44,.55+dy);s(24,.56,.55+dy);
 const knee=kind==='squat'?dy*.55:0,kx=kind==='squat'?dy*.5:0;
 s(25,.43-kx,.7+knee);s(26,.57+kx,.7+knee);s(27,.43,.86);s(28,.57,.86);s(29,.42,.88);s(30,.58,.88);s(31,.41,.89);s(32,.59,.89);
 if(kind==='punch'){
  // alternating jabs, 3 per second, full extension toward the camera-left/right at shoulder height
  const ph=(t*3)%2,left=ph<1,e=Math.sin(Math.min(1,ph%1*1.6)*Math.PI); // 0 -> 1 -> 0 extension
  const guard=(sx,dir)=>({ex:sx+dir*.03,ey:.42,wx:sx+dir*.02,wy:.3});
  const L=guard(.41,-1),R=guard(.59,1);
  const ext=(g,dir,k)=>({ex:g.ex+dir*.1*k,ey:g.ey-.1*k,wx:g.wx+dir*.3*k,wy:g.wy+.02*k});
  const l=left?ext(L,-1,e):L,r=left?R:ext(R,1,e);
  s(13,l.ex,l.ey+dy);s(15,l.wx,l.wy+dy);s(14,r.ex,r.ey+dy);s(16,r.wx,r.wy+dy);
  for(const [i,j] of [[17,15],[19,15],[21,15],[18,16],[20,16],[22,16]])P[i]={...P[j]};
 }else if(kind==='squat'){s(13,.36,.36+dy);s(14,.64,.36+dy);s(15,.42,.33+dy);s(16,.58,.33+dy);} // arms forward
 else{s(13,.37,.41+dy);s(14,.63,.41+dy);s(15,.36,.52+dy);s(16,.64,.52+dy);}
 return P;
}
function figure(ctx,P,{color,width,joints}){
 ctx.save();ctx.lineCap='round';ctx.strokeStyle=color;ctx.lineWidth=width;
 for(const [a,b] of BONES){ctx.beginPath();ctx.moveTo(P[a].x*VW,P[a].y*VH);ctx.lineTo(P[b].x*VW,P[b].y*VH);ctx.stroke();}
 if(joints){ctx.fillStyle=color;for(const i of [0,11,12,13,14,15,16,23,24,25,26,27,28]){ctx.beginPath();ctx.arc(P[i].x*VW,P[i].y*VH,width*.9,0,7);ctx.fill();}}
 ctx.restore();
}
function mannequin(ctx,P){
 ctx.fillStyle='#1a1d24';ctx.fillRect(0,0,VW,VH);ctx.fillStyle='#232733';ctx.fillRect(0,VH*.88,VW,VH*.12);
 ctx.save();ctx.fillStyle='#7d6a5c';ctx.beginPath();for(const [n,i] of [11,12,24,23].entries()){n?ctx.lineTo(P[i].x*VW,P[i].y*VH):ctx.moveTo(P[i].x*VW,P[i].y*VH);}ctx.closePath();ctx.fill();ctx.restore();
 figure(ctx,P,{color:'#7d6a5c',width:46});
 ctx.fillStyle='#8d7a6a';ctx.beginPath();ctx.arc(P[0].x*VW,P[0].y*VH,52,0,7);ctx.fill();
}
const mask=document.createElement('canvas');mask.width=96;mask.height=171;const mctx=mask.getContext('2d',{willReadFrequently:true});
const maskData={w:96,h:171,data:new Uint8ClampedArray(96*171)};
function synthMask(P){
 mctx.clearRect(0,0,96,171);mctx.save();mctx.scale(96/VW,171/VH);
 mctx.fillStyle='#fff';mctx.beginPath();for(const [n,i] of [11,12,24,23].entries()){n?mctx.lineTo(P[i].x*VW,P[i].y*VH):mctx.moveTo(P[i].x*VW,P[i].y*VH);}mctx.closePath();mctx.fill();
 figure(mctx,P,{color:'#fff',width:46});mctx.beginPath();mctx.arc(P[0].x*VW,P[0].y*VH,52,0,7);mctx.fill();mctx.restore();
 const d=mctx.getImageData(0,0,96,171).data;for(let k=0;k<maskData.data.length;k++)maskData.data[k]=d[k*4+3];return maskData;
}
// ---- metrics: share of aura light within 0.6 torso of the true skeleton, light centroid vs body centre (CSS px)
function toCss(p){const W=innerWidth,H=innerHeight,s=Math.min(W/VW,H/VH),ox=(W-VW*s)/2,oy=(H-VH*s)/2;return {x:ox+(1-p.x)*VW*s,y:oy+p.y*VH*s};}
function segDist(px,py,a,b){const vx=b.x-a.x,vy=b.y-a.y,l=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((px-a.x)*vx+(py-a.y)*vy)/l));return Math.hypot(px-a.x-vx*t,py-a.y-vy*t);}
window.measure=()=>{
 const P=window.lastTrue.map(toCss),torso=Math.max(Math.hypot(P[11].x-P[23].x,P[11].y-P[23].y),Math.hypot(P[12].x-P[24].x,P[12].y-P[24].y));
 const centre={x:(P[11].x+P[12].x+P[23].x+P[24].x)/4,y:(P[11].y+P[12].y+P[23].y+P[24].y)/4};
 const res={};
 for(const c of document.querySelectorAll('#cameraWorkout canvas')){
  if(c.id||c.style.display==='none'||!c.width)continue;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const sx=innerWidth/c.width,sy=innerHeight/c.height,step=Math.max(1,Math.round(c.width/180));let w=0,near=0,mx=0,my=0,dist=0;
  for(let y=0;y<c.height;y+=step)for(let x=0;x<c.width;x+=step){const k=(y*c.width+x)*4,a=d[k+3]/255;if(a<.03)continue;const lum=a*(d[k]+d[k+1]+d[k+2])/765,px=x*sx,py=y*sy;
   w+=lum;mx+=lum*px;my+=lum*py;let m=1e9;for(const [i,j] of BONES)m=Math.min(m,segDist(px,py,P[i],P[j]));if(m<=.6*torso)near+=lum;dist+=lum*m/torso;}
  res[c.className]=w?{meanDist:+(dist/w).toFixed(3),onBody:+(near/w).toFixed(3),centroidErr:+(Math.hypot(mx/w-centre.x,my/w-centre.y)/torso).toFixed(3),light:+w.toFixed(1)}:{light:0};
 }
 // anchor error: where the aura is anchored (after: drawn skeleton; before: the last raw detection) vs the true joints
 const J=[11,12,13,14,15,16,23,24,25,26,27,28],now=performance.now(),drawn=window.myr5AuraBody?.points(now),fed=window.lastFed;
 const W=innerWidth,H=innerHeight;let e=0,n=0;
 for(const i of J){let q;if(drawn){q={x:drawn[i].x*W,y:drawn[i].y*H};}else if(fed){q=toCss(fed[i]);}else continue;e+=Math.hypot(q.x-P[i].x,q.y-P[i].y);n++;}
 if(n)res.anchorErr=+(e/n/torso).toFixed(4);
 return res;
};
window.run=async({mode,kind,choices,mask:withMask=false,lagMs=45,impacts=false,tier=2})=>{
 if(tier!=null)window.myr5EffectQuality?.pin(tier);
 localStorage.setItem('myr5-exercise-effect-choices-v1',JSON.stringify({version:1,choices}));
 preloadWorkoutEffects(mode);await new Promise(r=>setTimeout(r,900));
 const ex=EXERCISES[mode],effects=mountWorkoutEffects({host,seed:7});
 const t0=performance.now();let reps=0,lastRep=0,lastPunch=-1,seed=12345;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)/4294967296)-.5;};
 window.clockRun=()=>(performance.now()-t0)/1000;
 const draw=()=>{if(window.stopped)return;const t=(performance.now()-t0)/1000,P=truePose(t,kind);window.lastTrue=P;mannequin(cam,P);dbg.clearRect(0,0,VW,VH);figure(dbg,P,{color:'#39ff6a',width:4,joints:true});requestAnimationFrame(draw);};
 draw();
 const feed=()=>{
  const now=performance.now(),capture=now-lagMs,t=(capture-t0)/1000,P=truePose(t,kind).map(p=>({x:p.x+rnd()*.006,y:p.y+rnd()*.006,visibility:p.visibility}));
  if(ex.kind==='reps'&&t-lastRep>=0.9){reps++;lastRep=t;}
  if(impacts&&kind==='punch'){const k=Math.floor(t*3);if(k!==lastPunch&&(t*3)%1>.3){lastPunch=k;const left=(t*3)%2<1,w=truePose(t,kind)[left?15:16],c=toCss(w);dispatchEvent(new CustomEvent('myr5:punch-impact',{detail:{x:c.x/innerWidth,y:c.y/innerHeight,hand:left?'left':'right',strength:.9}}));}}
  const workout={mode,kind:ex.kind==='hold'?'hold':ex.kind==='reps'?'reps':'gentle',stage:'working',counting:true,finished:false,value:reps,activeSeconds:ex.kind==='hold'?t:0,difficulty:'easy'};
  const pose={points:P,width:VW,height:VH,mirrored:true,now,frameMs:capture,mask:withMask?synthMask(truePose(t,kind)):null};
  window.lastFed=P;
  effects.pose(workoutEffectsSnapshot({pose,motion:{tracking:true,kind:ex.kind==='hold'?'hold':ex.kind,progress:1},workout,sessionId:'s-'+mode,tracking:true,visible:true,canCount:true,workingSet:true}));
 };
 window.feedId=setInterval(feed,33);
 window.stopFeed=()=>clearInterval(window.feedId);
 window.stopRun=()=>{clearInterval(window.feedId);window.stopped=true;effects.stop();};
};
// Frame cost: time every rAF callback the effect layers schedule (harness callbacks excluded by name).
window.frameStats={n:0,sum:0,list:[],intervals:[],last:0};
const raf=window.requestAnimationFrame.bind(window);
window.requestAnimationFrame=fn=>raf(ts=>{if(fn.name==='draw'){fn(ts);return;}const a=performance.now();fn(ts);const d=performance.now()-a;const s=window.frameStats;s.n++;s.sum+=d;s.list.push(d);if(s.last)s.intervals.push(ts-s.last);s.last=ts;});
</script>`;

const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://l').pathname;
  if (path === '/__h.html') { res.setHeader('Content-Type', 'text/html'); res.end(PAGE); return; }
  try { const body = await readFile(resolve(root, '.' + decodeURIComponent(path))); res.setHeader('Content-Type', TYPES[extname(path)] || 'application/octet-stream'); res.end(body); } catch { res.statusCode = 404; res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const url = 'http://127.0.0.1:' + server.address().port + '/__h.html';
const report = { root, scenarios: [] };
async function page() {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('pageerror', e => report.scenarios.push({ pageerror: e.message })); p.on('console', m => { if (m.type() === 'error') report.scenarios.push({ console: m.text() }); });
  await p.goto(url); return { ctx, p };
}
async function waitUntil(p, at) { const c = await p.evaluate(() => window.clockRun()); if (at > c) await p.waitForTimeout((at - c) * 1000); }
const SCENARIOS = [ // tier: pinned for the visual runs (metric reads stall headless frames); --tiers runs the real ladder
  { name: 'squat-classic', mode: 'squat', kind: 'squat', choices: { legs: 'classic' }, shots: [4.2, 4.45, 4.65, 6.0] },
  { name: 'squat-firespin', mode: 'squat', kind: 'squat', choices: { legs: 'firespin' }, shots: [4.2, 4.45, 6.0] },
  { name: 'punch-lightning', mode: 'jab-right', kind: 'punch', choices: { shoulders: 'lightning' }, impacts: true, shots: [4.1, 4.27, 4.6, 6.0] },
  { name: 'step-sunburn', mode: 'jogging', kind: 'step', choices: { legs: 'sunburn' }, shots: [4.0, 4.3, 4.6, 6.0] },
  { name: 'step-classic-mask', mode: 'jogging', kind: 'step', choices: { legs: 'classic' }, mask: true, tier: 3, shots: [6.2, 6.5, 6.8] },
  { name: 'horse-casting-sway', mode: 'horse', kind: 'sway', choices: { stances: 'casting' }, shots: [4.0, 4.4, 6.0] },
];
try {
  if (!PERF && !TIERS) for (const sc of SCENARIOS) {
    const { ctx, p } = await page();
    await p.evaluate(sc => window.run(sc), sc);
    const metrics = [];
    // sample metrics every 150 ms from 1.5 s to the last shot; shots at the listed times
    const end = Math.max(...sc.shots), events = sc.shots.map(at => ({ at, shot: true }));
    for (let at = 1.5; at < end; at += 0.15) events.push({ at, shot: false });
    events.sort((a, b) => a.at - b.at);
    for (const e of events) {
      await waitUntil(p, e.at);
      if (e.shot) await p.screenshot({ path: `${out}/${sc.name}-t${e.at.toFixed(2)}.png` });
      else metrics.push(await p.evaluate(() => window.measure()));
    }
    const tier = await p.evaluate(() => window.myr5EffectQuality ? { tier: window.myr5EffectQuality.tier, avg: +window.myr5EffectQuality.average.toFixed(1) } : null);
    const agg = {};
    const ae = metrics.map(m => m.anchorErr).filter(Number.isFinite); agg.anchorErr = ae.length ? +(ae.reduce((a, b) => a + b, 0) / ae.length).toFixed(4) : null; agg.anchorErrMax = ae.length ? Math.max(...ae) : null;
    for (const m of metrics) for (const [k, v] of Object.entries(m)) { if (!v?.light) continue; const a = agg[k] ??= { meanDist: 0, onBody: 0, centroidErr: 0, n: 0 }; a.meanDist += v.meanDist; a.onBody += v.onBody; a.centroidErr += v.centroidErr; a.n++; }
    for (const a of Object.values(agg).filter(v => v && typeof v === "object")) { a.meanDist = +(a.meanDist / a.n).toFixed(3); a.onBody = +(a.onBody / a.n).toFixed(3); a.centroidErr = +(a.centroidErr / a.n).toFixed(3); }
    report.scenarios.push({ name: sc.name, tier, metrics: agg });
    console.log(sc.name, JSON.stringify(agg), JSON.stringify(tier));
    await p.evaluate(() => window.stopRun()); await ctx.close();
  }
  if (PERF) {
    // Mid-range phone: 4x CPU throttle; 8 s of punches with impacts; effect-layer callback cost and frame intervals.
    for (const rate of [1, 4]) {
      const { ctx, p } = await page(); const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await p.evaluate(() => window.run({ mode: 'jab-right', kind: 'punch', choices: { shoulders: 'lightning' }, impacts: true, tier: null }));
      await waitUntil(p, 2); await p.evaluate(() => { const s = window.frameStats; s.n = 0; s.sum = 0; s.list = []; s.intervals = []; s.last = 0; });
      await waitUntil(p, 8);
      const r = await p.evaluate(() => { const s = window.frameStats, l = [...s.list].sort((a, b) => a - b), iv = [...s.intervals].sort((a, b) => a - b); const q = (a, f) => a[Math.min(a.length - 1, Math.floor(a.length * f))] ?? 0; return { callbacks: s.n, meanMs: +(s.sum / Math.max(1, s.n)).toFixed(2), p95Ms: +q(l, .95).toFixed(2), frameMedianMs: +q(iv, .5).toFixed(1), frameP95Ms: +q(iv, .95).toFixed(1), tier: window.myr5EffectQuality?.tier ?? null }; });
      await p.screenshot({ path: `${out}/perf-throttle${rate}x.png` });
      report.scenarios.push({ perf: rate + 'x CPU', ...r }); console.log('perf', rate + 'x', JSON.stringify(r));
      await p.evaluate(() => window.stopRun()); await ctx.close();
    }
  }
  if (TIERS) {
    // Tier stepping: smooth -> forced 45 ms frames (busy loop) -> smooth again. Records tier changes over time.
    const { ctx, p } = await page();
    await p.evaluate(() => { window.tierLog = []; });
    await p.evaluate(() => window.run({ mode: 'jogging', kind: 'step', choices: { legs: 'classic' }, mask: true, tier: null }));
    await p.evaluate(() => { const t0 = performance.now(); window.myr5EffectQuality.onChange((t, prev) => window.tierLog.push({ at: +((performance.now() - t0) / 1000).toFixed(2), from: prev, to: t })); window.tierLog.push({ at: 0, start: window.myr5EffectQuality.tier }); });
    await p.waitForTimeout(5000); await p.screenshot({ path: `${out}/tiers-1-smooth.png` });
    await p.evaluate(() => { window.busy = true; const spin = () => { if (!window.busy) return; const a = performance.now(); while (performance.now() - a < 40); requestAnimationFrame(spin); }; requestAnimationFrame(spin); });
    await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/tiers-2-slow.png` });
    await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/tiers-3-slower.png` });
    await p.evaluate(() => { window.busy = false; });
    await p.waitForTimeout(8000); await p.screenshot({ path: `${out}/tiers-4-recovered.png` });
    const log = await p.evaluate(() => ({ log: window.tierLog, final: window.myr5EffectQuality.tier, cap: window.myr5EffectQuality.cap, wantsMask: !!window.myr5AuraWantsMask }));
    report.scenarios.push({ tiers: log }); console.log('tiers', JSON.stringify(log));
    await p.evaluate(() => window.stopRun()); await ctx.close();
  }
} finally { await browser.close(); server.close(); }
const name = PERF ? 'perf.json' : TIERS ? 'tiers.json' : 'report.json';
await writeFile(`${out}/${name}`, JSON.stringify(report, null, 1));
