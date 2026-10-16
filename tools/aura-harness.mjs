// Seeded per-exercise aura run: node tools/aura-harness.mjs <outDir> [mode,mode,...]
// Serves the repo root, mounts the real mountWorkoutEffects over a mannequin and feeds the same
// snapshot shape app.mjs builds (workoutEffectsSnapshot). Screenshots at t=0.5 s and t=5 s.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const root=resolve(import.meta.dirname,'..');
const out=resolve(process.argv[2]||'.r1016');
const modes=(process.argv[3]||'squat,front-raise,pushup,high-plank,mountain,horse,jab-right,jogging').split(',');
const PAGE=`<!doctype html><meta name=viewport content="width=device-width"><body style="margin:0;background:#16181d">
<div id=host style="position:relative;width:412px;height:915px;overflow:hidden"><canvas id=fig width=412 height=915 style="position:absolute;inset:0"></canvas></div>
<script type=module>
import {mountWorkoutEffects} from '/arcade/workout-effects.mjs';
import {preloadWorkoutEffects} from '/arcade/workout-effects.mjs';
import {workoutEffectsSnapshot} from '/arcade/workout-effects-state.mjs';
import {EXERCISES} from '/exercise-library.mjs';
const host=document.getElementById('host'),fig=document.getElementById('fig').getContext('2d');
function pts(t,mode){
 const P=Array.from({length:33},()=>({x:.5,y:.5,visibility:.95}));
 const s=(i,x,y)=>P[i]={x,y,visibility:.95};
 const ex=EXERCISES[mode],osc=Math.sin(t*2*Math.PI),fast=Math.sin(t*2*Math.PI*2.2);
 let dy=0,wy=.49,wx=.29;
 if(ex.detector==='squat')dy=.07*(osc+1)/2;
 if(ex.detector==='raise'){wy=.49-.2*(osc+1)/2;}
 if(ex.detector==='boxing'){wx=.29+.3*Math.max(0,fast);wy=.38;}
 const floor=['pushup','bridge'].includes(ex.detector);
 const hy=floor?.7:0;
 s(0,.5,.16+dy+hy*.2);s(11,.4,.25+dy);s(12,.6,.25+dy);s(13,.34,.37+dy);s(14,.66,.37+dy);
 s(15,wx,wy+dy);s(16,.71,ex.detector==='boxing'?.38:.49+dy);
 s(23,.43,.53+dy);s(24,.57,.53+dy);s(25,.42,.67+(ex.detector==='squat'?dy*.4:0)+(mode==='jogging'?-.08*Math.max(0,osc):0));s(26,.58,.67);
 s(27,.41,.86);s(28,.59,.86);s(29,.4,.88);s(30,.6,.88);s(31,.39,.89);s(32,.61,.89);
 if(floor){for(const [i,x,y] of [[11,.3,.62],[12,.34,.6],[13,.3,.7],[14,.34,.7],[15,.3,.8],[16,.34,.8],[23,.55,.66],[24,.58,.66],[25,.7,.7],[26,.72,.7],[27,.85,.78],[28,.87,.78],[29,.86,.8],[30,.88,.8],[31,.88,.78],[32,.9,.78]])s(i,x,y);}
 return P;
}
window.run=async mode=>{preloadWorkoutEffects(mode);await new Promise(r=>setTimeout(r,800));return new Promise(resolve=>{
 const ex=EXERCISES[mode],effects=mountWorkoutEffects({host,seed:7});
 const t0=performance.now();let reps=0,lastRep=0,held=0;
 const cardio=ex.kind!=='reps'&&ex.kind!=='hold';
 const id=setInterval(()=>{
  const now=performance.now(),t=(now-t0)/1000;
  const points=pts(t,mode);
  fig.clearRect(0,0,412,915);fig.fillStyle='#8aa';
  for(const p of points.slice(0,33)){fig.fillRect(p.x*412-3,p.y*915-3,6,6);}
  if(ex.kind==='reps'&&t-lastRep>=1){reps++;lastRep=t;}
  if(ex.kind==='hold')held=t;
  const workout={mode,kind:ex.kind==='hold'?'hold':ex.kind==='reps'?'reps':'gentle',stage:'working',counting:true,finished:false,value:reps,activeSeconds:held,difficulty:'easy'};
  const detail=workoutEffectsSnapshot({pose:{points,width:412,height:915,mirrored:false,now},motion:{tracking:true,kind:ex.kind==='hold'?'hold':ex.kind,progress:1},workout,sessionId:'s-'+mode,tracking:true,visible:true,canCount:true,workingSet:true});
  effects.pose(detail);
 },33);
 window.stopRun=()=>{clearInterval(id);effects.stop();};
 window.clockRun=()=>(performance.now()-t0)/1000;
 resolve();
});};
</script>`;
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://l').pathname;
  if(path==='/__h.html'){res.setHeader('Content-Type','text/html');res.end(PAGE);return;}
  try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const report=[];
try{
  for(const mode of modes){
    const ctx=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.6,isMobile:true,hasTouch:true});
    const page=await ctx.newPage();page.on('pageerror',e=>report.push(mode+' pageerror '+e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/__h.html');
    await page.evaluate(m=>window.run(m),mode);
    const shots={};
    for(const [label,at] of [['t0.5',.5],['t5',5]]){
      let c=await page.evaluate(()=>window.clockRun());
      if(at>c)await page.waitForTimeout((at-c)*1000);
      const info=await page.evaluate(()=>{const cs=[...document.querySelectorAll('canvas')].filter(c=>c.id!=='fig');return cs.map(c=>{const x=c.getContext('2d');const d=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>8)n++;return {cls:c.className,display:c.style.display,opacity:c.style.opacity,px:n};});});
      shots[label]=info;
      await page.screenshot({path:`${out}/${mode}-${label}.png`});
    }
    report.push({mode,shots});
    await ctx.close();
  }
}finally{await browser.close();server.close();}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,1));
for(const r of report)console.log(JSON.stringify(r));
