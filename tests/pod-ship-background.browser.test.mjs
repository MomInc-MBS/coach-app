import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {build} from 'esbuild';
import {completeCoach} from './onboarding-fixture.mjs';

const MIME={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
let server,browser,base;
test.before(async()=>{
 const source=resolve('.'),built=resolve('dist/client');
 const app=(await build({entryPoints:['app.mjs'],bundle:true,format:'esm',target:'es2022',write:false,external:['https://*','./local-coach-runtime.mjs','./creature/assets/phone.js','./modules/portal/portal-entry.mjs','./modules/ships/ship-view.mjs','./modules/ships/ship-intro.mjs'],plugins:[{name:'vendored-three',setup(build){build.onResolve({filter:/^three$/},()=>({path:'three',external:true}));}}]})).outputFiles[0].text;
 server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
  if(path==='/__review'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Asset review</title>');return;}
  if(path==='/app-runtime.mjs'){res.setHeader('Content-Type','text/javascript');res.end(app);return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  for(const root of [source,built])try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))break;const data=await readFile(file);res.setHeader('Content-Type',MIME[extname(file)]||'application/octet-stream');res.end(data);return;}catch{}
  res.writeHead(404);res.end();
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await mkdir('.frames',{recursive:true});
});
test.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});
async function open(viewport,reducedMotion='reduce'){
 const context=await browser.newContext({viewport,reducedMotion,serviceWorkers:'block'});
 await context.addInitScript(()=>{Object.defineProperty(navigator,'standalone',{value:true,configurable:true});const get=Storage.prototype.getItem,d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Storage.prototype.getItem=function(key){return String(key).startsWith('myr5-how-to-play-day-v1/')?day:get.call(this,key);};});
 const seed=await context.newPage();await seed.goto(base+'/onboarding.html');await seed.evaluate(async intake=>{const{openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());await seed.close();
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});await page.goto(base+'/pose.html');try{await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);}catch(error){throw Error(error.message+'; page errors: '+JSON.stringify(errors)+'; state: '+JSON.stringify(await page.evaluate(()=>({url:location.href,phase:window.myr5TestState?.phase,owner:window.myr5WorkoutOwner?.snapshot(),body:document.body.innerText.slice(0,500)}))));}await page.evaluate(()=>{document.querySelector('.app-update-banner [data-later]')?.click();window.myr5Routes.go('pod');});await page.waitForFunction(()=>location.hash==='#pod');return{context,page};
}

test('the supplied ship art has a real transparent central window over an opaque nebula',async()=>{
 const page=await browser.newPage();try{await page.goto(base+'/__review');const assets=await page.evaluate(async()=>{
  const sample=async url=>{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let clear=0,solid=0;const alpha={};for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;if(data[i]>=250)solid++;alpha[data[i]]=(alpha[data[i]]||0)+1;}return{width:c.width,height:c.height,center:data[4*(Math.floor(c.height/2)*c.width+Math.floor(c.width/2))+3],clear:clear/(c.width*c.height),solid:solid/(c.width*c.height),alpha:Object.entries(alpha).sort((a,b)=>b[1]-a[1]).slice(0,5)};};
  return{ship:await sample('/pod/assets/ship-interior-cutout.png'),nebula:await sample('/pod/assets/nebula.png')};
 });assert.equal(assets.ship.center,0);assert.ok(assets.ship.clear>.25&&assets.ship.solid>.15,'transparent viewport and opaque ship structure coexist: '+JSON.stringify(assets));assert.equal(assets.nebula.solid,1);assert.equal(assets.nebula.width,assets.nebula.height);
 }finally{await page.close();}
});

for(const viewport of [{width:375,height:812},{width:375,height:667},{width:1280,height:900}])test(`ship background preserves direct and framed pod controls at ${viewport.width}x${viewport.height}`,{timeout:90000},async()=>{
 const{context,page}=await open(viewport);try{
  for(const route of ['pod','workout']){
   if(route==='workout'){await page.evaluate(async()=>{await window.myr5Menus.portal();await window.myr5Portal.open('rect');});await page.waitForFunction(()=>document.querySelector('#portalWorkoutHome')?.open&&!document.querySelector('.portal-glass'));}
   if(route==='workout')assert.equal(await page.locator('#podShipBackdrop').evaluate(el=>el.closest('dialog')?.id),'portalWorkoutHome','the real artwork moves into the visible modal layer');
   await page.screenshot({path:resolve('.frames',`pod-ship-${route}-${viewport.width}x${viewport.height}.png`)});
   for(const selector of ['#start','#exerciseDial','#difficultySlider','#harder','#easier','#toggleVoice']){
    const state=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),dock=document.querySelector('#coachDock').getBoundingClientRect(),inDock=!!el.closest('#coachDock');return{hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),fits:r.top>=(inDock?dock.top:0)&&r.bottom<=(inDock?dock.bottom:dock.top)&&r.left>=0&&r.right<=innerWidth,top:r.top,bottom:r.bottom,dockTop:dock.top,width:r.width,height:r.height};});assert.ok(state.hit&&state.fits,`${route} ${selector}: ${JSON.stringify(state)}`);
   }
   for(const selector of ['#podShipBackdrop','.pod-ship-nebula','.pod-ship-cutout','.pod-ship-lights'])assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).pointerEvents),'none','decorative layer never captures controls');
   const avatar=await page.locator('#homeCharacter canvas').evaluate(el=>{const r=el.getBoundingClientRect(),clip=el.closest('#homeCharacter').getBoundingClientRect(),stage=el.closest('#view').getBoundingClientRect();return{height:r.height,visibleHeight:Math.max(0,Math.min(r.bottom,clip.bottom,stage.bottom)-Math.max(r.top,clip.top,stage.top))};});assert.ok(avatar.height>=40&&avatar.visibleHeight>=40,`${route} the existing character remains visibly sized: ${JSON.stringify(avatar)}`);
   assert.equal(await page.locator('#homeCharacter canvas').evaluate(el=>{const r=el.getBoundingClientRect(),button=el.closest('button');return [.25,.5,.8].every(y=>button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height*y)));}),true,'the caption does not cover the character head or torso');
   assert.equal(await page.locator('#coachDock [data-route="portal"]').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'dock remains tappable');
   assert.equal(await page.locator('.ship-header #openSettings').evaluate(el=>{const r=el.getBoundingClientRect();return r.height>=44&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'projected header keeps Settings visible and tappable');
   const shown=(await page.screenshot()).toString('base64');await page.locator('#podShipBackdrop').evaluate(el=>el.style.setProperty('visibility','hidden','important'));const hidden=(await page.screenshot()).toString('base64');await page.locator('#podShipBackdrop').evaluate(el=>el.style.removeProperty('visibility'));
   const changed=await page.evaluate(async({shown,hidden})=>{const pixels=async png=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};const a=await pixels(shown),b=await pixels(hidden);let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>40)n++;return n/(a.length/4);},{shown,hidden});assert.ok(changed>.02,`${route} actual visible backdrop contributes pixels (${changed})`);
   await page.screenshot({path:resolve('.frames',`pod-ship-${route}-${viewport.width}x${viewport.height}.png`)});
  }
  await page.locator('#coachDock [data-route="portal"]').click();await page.waitForFunction(()=>document.querySelector('#portalHome')?.hidden===false&&!document.querySelector('#portalWorkoutHome')?.open&&!document.querySelector('.portal-glass'));
  const restored=await page.evaluate(()=>['podShipBackdrop','homeScreen'].every(id=>document.querySelectorAll('#'+id).length===1&&document.getElementById(id).parentElement===document.body)&&document.querySelectorAll('.ship-header').length===1&&document.querySelector('.ship-header').parentElement===document.body);assert.equal(restored,true,'closing the framed pod restores the original header, artwork, and content without duplicate IDs');
 }finally{await context.close();}
});

test('pod background tilt leads the small delayed control movement while rails and hit targets stay usable',{timeout:90000},async()=>{
 const {context,page}=await open({width:375,height:667},'no-preference');try{
  const sample=()=>page.evaluate(()=>{const s=getComputedStyle(document.body),n=p=>parseFloat(s.getPropertyValue(p))||0;return{bg:n('--pod-bg-x'),controls:n('--pod-controls-x'),tilt:n('--pod-bg-tilt'),smallTilt:n('--pod-controls-tilt'),cutout:getComputedStyle(document.querySelector('.pod-ship-cutout')).transform,dock:document.querySelector('#coachDock').getBoundingClientRect().toJSON()};});
  const initial=await sample();await page.mouse.move(374,120);await page.waitForTimeout(70);const early=await sample();await page.waitForTimeout(700);const settled=await sample();
  assert.ok(Math.abs(early.bg)/24>Math.abs(early.controls)/4+.02,'background responds ahead of delayed controls: '+JSON.stringify({early,settled}));assert.ok(Math.abs(settled.bg)>10&&Math.abs(settled.bg)<=25,'background movement is substantial and bounded');assert.ok(Math.abs(settled.controls)>.2&&Math.abs(settled.controls)<=4.5,'controls move only a few pixels');assert.ok(Math.abs(settled.tilt)>3&&Math.abs(settled.smallTilt)<=1.6,'background tilt is much stronger than control tilt');assert.equal(settled.cutout,initial.cutout,'ship cutout stays fixed');assert.deepEqual(settled.dock,initial.dock,'dock remains stationary');
  const begin=await page.locator('#start').evaluate(el=>{const r=el.getBoundingClientRect(),dock=document.querySelector('#coachDock').getBoundingClientRect();return{inside:r.left>=0&&r.right<=innerWidth&&r.bottom<=dock.top,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});assert.ok(begin.inside&&begin.hit,'delayed movement keeps BEGIN visible and tappable on short phones');
  await page.screenshot({path:resolve('.frames/pod-parallax-375x667.png')});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);const reduced=await sample();assert.ok(Math.abs(reduced.bg)<.05&&Math.abs(reduced.controls)<.05,'reduced motion resets both layers');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.move(5,120);await page.waitForTimeout(200);await page.evaluate(()=>window.myr5Menus.portal());await page.waitForTimeout(150);const hidden=await sample();assert.ok(Math.abs(hidden.bg)<.05&&Math.abs(hidden.controls)<.05,'closed pod resets parallax');
 }finally{await context.close();}
});

test('nebula rotates slowly without edge seams and pauses when hidden, away, or reduced motion is requested',{timeout:90000},async()=>{
 const{context,page}=await open({width:375,height:812},'no-preference');try{
  await page.waitForFunction(()=>document.querySelector('.pod-ship-nebula')?.getAnimations().some(a=>a.playState==='running'));
  const geometry=await page.locator('.pod-ship-nebula').evaluate(el=>{const host=document.querySelector('#podShipBackdrop'),a=el.getAnimations()[0],t=a.effect.getTiming();return{width:el.offsetWidth,height:el.offsetHeight,diagonal:Math.hypot(host.clientWidth,host.clientHeight),duration:t.duration,iterations:t.iterations===Infinity,easing:t.easing};});
  assert.ok(geometry.duration>=240000&&geometry.duration<=360000,'a full turn takes four to six minutes');assert.equal(geometry.iterations,true);assert.equal(geometry.easing,'linear');assert.ok(Math.min(geometry.width,geometry.height)>=geometry.diagonal-1,'rotating texture covers the entire backdrop diagonal at every angle');
  await page.setViewportSize({width:640,height:640});const parallaxCoverage=await page.locator('.pod-ship-nebula').evaluate(el=>{const host=document.querySelector('#podShipBackdrop');return{size:Math.min(el.offsetWidth,el.offsetHeight),required:Math.hypot(host.clientWidth,host.clientHeight)+2*Math.hypot(24,24)};});assert.ok(parallaxCoverage.size>=parallaxCoverage.required-1,'rotation plus maximum parallax has no uncovered corners: '+JSON.stringify(parallaxCoverage));await page.setViewportSize({width:375,height:812});
  const seam=await page.locator('.pod-ship-nebula').evaluate(async el=>{const a=el.getAnimations()[0],d=a.effect.getTiming().duration;a.currentTime=0;await new Promise(requestAnimationFrame);const first=getComputedStyle(el).transform;a.currentTime=d-.01;await new Promise(requestAnimationFrame);const last=getComputedStyle(el).transform;return{first,last};});
  const seamDelta=await page.evaluate(({first,last})=>{const a=new DOMMatrix(first),b=new DOMMatrix(last);return Math.max(...['a','b','c','d','e','f'].map(k=>Math.abs(a[k]-b[k])));},seam);assert.ok(seamDelta<.01,'the last frame joins the first without a visible rotation jump');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>document.querySelector('#podShipBackdrop').getAnimations({subtree:true}).every(a=>a.playState!=='running'));
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>document.querySelector('.pod-ship-nebula').getAnimations().some(a=>a.playState==='running'));
  await page.evaluate(()=>document.querySelector('#settings').showModal());await page.waitForFunction(()=>document.querySelector('#podShipBackdrop').getAnimations({subtree:true}).every(a=>a.playState!=='running'));await page.evaluate(()=>document.querySelector('#settings').close());await page.waitForFunction(()=>document.querySelector('.pod-ship-nebula').getAnimations().some(a=>a.playState==='running'));
  await page.evaluate(()=>window.myr5Menus.portal());await page.waitForFunction(()=>document.querySelector('#portalHome')?.hidden===false&&!document.querySelector('.portal-glass')&&!document.querySelector('#portalChrome')?.matches(':popover-open'));await page.waitForFunction(()=>document.querySelector('.pod-ship-nebula').getAnimations().every(a=>a.playState!=='running'));
  await page.waitForFunction(()=>{const el=document.querySelector('#coachDock [data-route="portal"]'),r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));},null,{timeout:5000});
  const portalHit=await page.locator('#coachDock [data-route="portal"]').evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{hit:el.contains(hit),target:hit?.outerHTML.slice(0,300),rect:r.toJSON(),dialogs:[...document.querySelectorAll('dialog[open]')].map(el=>el.id),parent:el.closest('#coachDock').parentElement.id};});assert.equal(portalHit.hit,true,'R15 portal remains tappable above the stopped background: '+JSON.stringify(portalHit));
  await page.evaluate(()=>window.myr5Routes.go('pod'));await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>[...document.querySelectorAll('#podShipBackdrop,#podShipBackdrop *')].every(el=>el.getAnimations().every(a=>a.playState!=='running')));
 }finally{await context.close();}
});

test('ship motion resumes after a persisted page restore and disposes its route observers',async()=>{
 const context=await browser.newContext({reducedMotion:'no-preference'}),page=await context.newPage();try{
  await page.goto(base+'/__review');await page.evaluate(async()=>{document.body.dataset.screen='pod';document.body.innerHTML='<div id="podShipBackdrop"><img class="pod-ship-nebula"></div>';const link=document.createElement('link');link.rel='stylesheet';link.href='/pod/ship-interior.css';document.head.append(link);const{mountShipBackdropMotion}=await import('/pod/ship-backdrop.mjs');window.disposeBackdrop=mountShipBackdropMotion();});
  await page.waitForFunction(()=>document.querySelector('.pod-ship-nebula').getAnimations().some(a=>a.playState==='running'));
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));});await page.waitForFunction(()=>document.querySelector('.pod-ship-nebula').getAnimations().every(a=>a.playState!=='running'));
  await page.evaluate(()=>{delete document.hidden;dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});await page.waitForFunction(()=>document.querySelector('.pod-ship-nebula').getAnimations().some(a=>a.playState==='running'));
  await page.evaluate(()=>{disposeBackdrop();document.body.dataset.screen='rest';document.body.dataset.screen='pod';document.dispatchEvent(new Event('visibilitychange'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});assert.equal(await page.locator('#podShipBackdrop').getAttribute('data-motion-running'),'false');
 }finally{await context.close();}
});
