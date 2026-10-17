import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

// Renderer-only bench: the real Three.js view and biome scenes, without camera/coach setup.
test('Plank Flight renders six procedural biomes at a fixed mobile viewport', {timeout:180000}, async()=>{
  const root=resolve('.'),built=resolve('dist/client'),captureDir=resolve('biomes/render-captures'),errors=[],notFound=[];
  const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flight renderer bench</title>
    <script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script>
    <style>html,body,#host{margin:0;width:100%;height:100%;overflow:hidden;background:#050713}#host{width:375px;height:812px}</style>
    <div id="host"></div><script type="module">
      import {mountFlightView} from '/arcade/plank-flight/view.mjs';
      import {createFlight,commandFlight} from '/arcade/plank-flight/sim.mjs';
      import {biomeAt} from '/arcade/plank-flight/biomes.mjs';
      const run=createFlight({seed:4317,paced:true,biomes:true});commandFlight(run,'start');
      run.speed=5.2;run.time=22;run.distance=125;
      run.objects=[
        {id:'bench-coin',type:'coin',z:run.distance+28,x:-.6,y:.58,value:1},
        {id:'bench-zap',type:'zapper',z:run.distance+38,x:.7,y:.55,w:.34,h:.28,state:'warning'},
        {id:'bench-laser',type:'laser',z:run.distance+46,x:-.8,y:.42,w:.36,h:.45,laserState:'charging'},
        {id:'bench-missile',type:'missile',z:run.distance+54,x:.9,y:.62,state:'lock'},
        {id:'bench-vehicle',type:'vehicle',z:run.distance+31,x:.9,y:.34},
        {id:'bench-powerup',type:'powerup',z:run.distance+40,x:-.8,y:.4},
        {id:'bench-component',type:'component',z:run.distance+35,x:1,y:.75},
        {id:'bench-token',type:'token',z:run.distance+50,x:-1,y:.7},
        {id:'bench-npc',type:'npc',z:run.distance+58,x:.2,y:.8},
        {id:'bench-pickup',type:'biome-pickup',z:run.distance+44,x:-.6,y:.76,shape:'crystal',benefit:'speed'}
      ];
      const frame={pose:{calibrated:true,controlValid:true,exerciseEligible:false},profile:{},paused:false,shopItems:[]};
      const view=mountFlightView({host:document.querySelector('#host'),run});
      window.__bench={run,view,frame,biomeAt};
      window.__benchSet=index=>{run.biome=biomeAt(index,40);run.time=22;run.distance=125+index*3;view.render(frame);return {id:run.biome.id,stats:view.stats,canvas:document.querySelector('canvas.pf-canvas')?.className??'',fallback:document.querySelector('.plank-flight')?.classList.contains('pf-fallback')??true};};
      window.__benchFrames=async(index,count=24)=>{run.biome=biomeAt(index,40);const samples=[];let last=0;for(let i=0;i<count;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(last)samples.push(now-last);last=now;run.time+=1/60;run.distance+=5.2/60;view.render(frame);}const sorted=samples.slice().sort((a,b)=>a-b);return {meanFrameMs:samples.reduce((a,b)=>a+b,0)/samples.length,p50FrameMs:sorted[Math.floor(sorted.length/2)],fps:1000/(samples.reduce((a,b)=>a+b,0)/samples.length),stats:view.stats};};
    </script>`;
  const server=createServer(async(req,res)=>{
    const path=new URL(req.url,'http://local').pathname;
    if(path==='/__bench'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;}
    let target;
    try{
      if(path.startsWith('/vendor/'))target=resolve(built,'.'+path);
      else target=resolve(root,'.'+path);
      const safeBase=path.startsWith('/vendor/')?built:root;
      if(!target.startsWith(safeBase+sep))throw Error('path escape');
      const data=await readFile(target);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wasm':'application/wasm'})[extname(target)]??'application/octet-stream'});res.end(data);
    }catch{notFound.push(path);res.writeHead(404);res.end('not found');}
  });
  await mkdir(captureDir,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser,page;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:1,serviceWorkers:'block'});
    page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack??e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource: the server responded with a status of 404/i.test(m.text()))errors.push(m.text());});
    await page.goto(`http://127.0.0.1:${server.address().port}/__bench`);await page.waitForFunction(()=>!!window.__bench?.view?.stats,null,{timeout:20000});
    const report=[];
    for(let i=0;i<6;i++){
      const entry=await page.evaluate(index=>window.__benchSet(index),i);
      assert.equal(entry.id,['tropical','castle','rainbow','loopway','laboratory','asteroid'][i]);
      assert.equal(entry.fallback,false,'WebGL fallback activated');assert.ok(entry.stats,'renderer stats unavailable');
      const timing=await page.evaluate(index=>window.__benchFrames(index,24),i);
      const snapshot={...entry,meanFrameMs:timing.meanFrameMs,p50FrameMs:timing.p50FrameMs,fps:timing.fps,stats:timing.stats};report.push(snapshot);
      await page.screenshot({path:resolve(captureDir,`${entry.id}-375x812.png`)});
      assert.ok(snapshot.stats.render.calls<300,`${entry.id} draw calls exceed 300: ${snapshot.stats.render.calls}`);
    }
    await writeFile(resolve(captureDir,'renderer-report.json'),JSON.stringify({viewport:'375x812',browser:'Microsoft Edge headless; default graphics flags',report,errors,notFound},null,2));
    assert.deepEqual(errors,[],errors.join('\n'));
    assert.deepEqual(notFound.filter(path=>!path.endsWith('/favicon.ico')),[],`missing resources: ${notFound.join(', ')}`);
    console.log(JSON.stringify(report.map(({id,fps,meanFrameMs,stats})=>({id,fps:+fps.toFixed(1),meanFrameMs:+meanFrameMs.toFixed(2),calls:stats.render.calls,triangles:stats.render.triangles,memory:stats.memory})),null,2));
  } finally {await browser?.close();await new Promise(r=>server.close(r));}
});
