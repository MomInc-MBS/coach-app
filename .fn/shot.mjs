import {chromium} from 'playwright';import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),types={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.png':'image/png'};
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});r.end(d);}});}).listen(8765);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:375,height:700}});
p.on('console',m=>console.log('console',m.text()));p.on('pageerror',e=>console.log('pageerror',e.message));
await p.goto('http://localhost:8765/.fn/harness.html');
async function run(mode,name,body){
 await p.evaluate(m=>{window.s?.stop();window.xp=0;window.mount(m);const o=s.engine.hitSegment;window.kinds=[];s.engine.hitSegment=(a,b,op)=>{const n=o(a,b,op);if(n)kinds.push(op.kind);return n;};},mode);
 await p.evaluate(body);await p.waitForTimeout(name==='martial-slice'?120:200);await p.screenshot({path:`.fn/${name}.png`});
 console.log(name,JSON.stringify(await p.evaluate(()=>({score:s.engine.score,xp:window.xp,hits:s.engine.hits,halves:s.engine.halves.length,laser:s.engine.laser.phase,res:s.engine.laser.result,strikes:s.engine.strikes,kinds:window.kinds.join()}))));
}
const helpers=`
 window.frame=(over={})=>{const pts=Array.from({length:33},()=>({x:.5,y:.5,visibility:.9}));pts[11]={x:.6,y:.3,visibility:1};pts[12]={x:.4,y:.3,visibility:1};pts[23]={x:.58,y:.6,visibility:1};pts[24]={x:.42,y:.6,visibility:1};for(const k in over)pts[k]=over[k];return pts;};
 window.send=(points,now)=>s.pose({points,width:375,height:700,mirrored:false,now,counting:true});
 window.sleep=ms=>new Promise(r=>setTimeout(r,ms));
`;
await p.evaluate(helpers);
// martial: wait for waves, then sweep right wrist at objects (straight = explode, curved = slice)
await run('martial','martial-slice',async()=>{
 await sleep(2500);let t=performance.now();
 for(let n=0;n<14&&!s.engine.halves.length;n++){await sleep(60);t+=60;const e=s.engine;
  for(const o of e.objects){if(o.hold)continue;const x=o.x/e.w,y=o.y/e.h;
   // curved sweep through the object
   for(let k=0;k<10;k++){t+=40;send(frame({16:{x:x-.5+k*.07,y:y+Math.sin(k/9*Math.PI)*.15-.07,visibility:1}}),t);}t+=60;send(frame({16:{x:.5,y:.5,visibility:0}}),t);}
 }
});
await run('martial','martial-explode',async()=>{
 await sleep(2500);let t=performance.now();
 for(let n=0;n<14;n++){await sleep(60);t+=60;const e=s.engine;
  for(const o of e.objects){if(o.hold)continue;const x=o.x/e.w,y=o.y/e.h;
   for(let k=0;k<6;k++){t+=30;send(frame({16:{x:x-.15+k*.06,y:y-.15+k*.06,visibility:1}}),t);}t+=60;send(frame({16:{x:.5,y:.5,visibility:0}}),t);}
 }
});
await run('hold','hold-laser',async()=>{
 await sleep(300);const e=s.engine;e.laserStart(90,200);let t=performance.now();
 for(let k=0;k<28;k++){await sleep(40);t+=40;send(frame(),t);} // perfectly still
});
await p.waitForTimeout(100);
await run('hold','hold-bonus',async()=>{
 await sleep(4500);let t=performance.now();
 for(let n=0;n<40;n++){await sleep(50);t+=50;const e=s.engine;const o=e.objects.find(o=>o.bonus);send(frame(o?{16:{x:o.x/e.w,y:o.y/e.h,visibility:1}}:{}),t);}
});
await run('martial','martial-laser-move',async()=>{
 await sleep(300);s.engine.laserStart(90,200);let t=performance.now();
 for(let k=0;k<26;k++){await sleep(40);t+=40;send(frame({15:{x:.3+k*.02,y:.4,visibility:1},16:{x:.7-k*.02,y:.5,visibility:1},11:{x:.6+k*.01,y:.3,visibility:1}}),t);}
});
await b.close();srv.close();
