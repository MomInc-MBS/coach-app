// W3-3A (#3, #13, #31, #32, #35, #38, D36): the floating pyramid IS the Food menu, checked at 375x812.
// Same harness as pyramid-lifecycle.browser.test.mjs: current launch.mjs/food/* source over a built dist/client.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.glb':'model/gltf-binary'};
// signedIn: a stub account (with finished setup) plus an in-memory /api/meals, so Save meal reaches today's log.
// worker: replaces /food-worker.mjs (the on-device recognition model) with a scripted classifier.
async function withFood(run,{reducedMotion='no-preference',signedIn=false,worker=null,meals=[]}={}){
 const root=resolve('dist/client'),source=resolve('.');
 const account={user:{id:'food-owner',email:'food@test.local',provider:'chatgpt'},dataEpoch:1,revision:0,profile:{},entitlements:{},
  progress:{completedSets:0,xp:0,level:1,unlocks:{ember:false,arc:false,frost:false,shieldBreak:false},exerciseRoute:{groups:{}}},
  push:{environment:'preview',configured:false,schedulerActive:false},
  onboarding:{data:completeCoach(),revision:1,startDay:'2026-09-21',completedAt:1,targets:{day:3,date:'2026-09-23',reps:3,holdSeconds:9,proteinGrams:100,waterOz:100,goals:{}}}};
 const body=req=>new Promise(r=>{let data='';req.on('data',c=>data+=c);req.on('end',()=>r(data?JSON.parse(data):null));});
 const bundle=await build({entryPoints:['launch.mjs'],bundle:true,write:false,format:'esm',target:'es2022',external:['./nutrition-data.mjs','./local-coach-runtime.mjs','./food/pyramid-scanner.mjs']});
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__test__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Test</title>');return;}
  if(path==='/launch-runtime.mjs'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
  if(worker&&path==='/food-worker.mjs'){res.setHeader('Content-Type','text/javascript');res.end(worker);return;}
  if(signedIn&&path==='/api/account'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(account));return;}
  if(signedIn&&path==='/api/meals'){
   res.setHeader('Content-Type','application/json');
   if(req.method==='POST'){const m=await body(req);meals.push({id:m.id,name:m.name,portion:m.portion,calories:m.calories,protein:m.protein,carbs:m.carbs,fat:m.fat,micros:JSON.stringify(m.micros),eaten_at:m.eatenAt});res.end(JSON.stringify({saved:true}));return;}
   res.end(JSON.stringify({items:[...meals].sort((x,y)=>y.eaten_at.localeCompare(x.eaten_at))}));return;
  }
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const base=path.startsWith('/food/')||path==='/food-live.css'?source:root,file=resolve(base,'.'+path);if(!file.startsWith(base+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:375,height:812},hasTouch:true,reducedMotion});
  const base='http://127.0.0.1:'+server.address().port,page=await context.newPage(),warnings=[];
  page.on('console',msg=>{if(msg.type()==='warning')warnings.push(msg.text());});
  // Observe the text painted onto each screen texture, and capture the scene + camera for projections.
  await page.addInitScript(()=>{
   const labels=new Set(['FOOD','CALORIES','PROTEIN','FAT','CARBS','VITAMINS']),canvases=new WeakMap(),fill=CanvasRenderingContext2D.prototype.fillText;
   window.pyramidPaint={};
   CanvasRenderingContext2D.prototype.fillText=function(value,...args){if(labels.has(value))canvases.set(this.canvas,value);else if(canvases.has(this.canvas))window.pyramidPaint[canvases.get(this.canvas)]=value;return fill.call(this,value,...args);};
   window.photoPicks=0;const click=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.id==='foodPhoto'){window.photoPicks++;return;}return click.call(this);};
  });
  await page.goto(base+'/__test__');
  await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
  await page.goto(base+'/pose.html#pod');
  await page.waitForFunction(()=>window.myr5Menus?.food);
  await page.evaluate(async()=>{
   const THREE=await import('/vendor/three/three.module.js'),add=THREE.Scene.prototype.add;
   THREE.Scene.prototype.add=function(...args){window.pyramidScene=this;return add.apply(this,args);};
   window.projectNode=name=>{const node=window.pyramidScene.getObjectByName(name),camera=window.pyramidScene.children.find(n=>n.isCamera),rect=document.querySelector('#pyramidScanner canvas').getBoundingClientRect(),p=node.getWorldPosition(new THREE.Vector3()).project(camera);return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};};
   // The update banner and setup gate are not part of this screen.
   const style=document.createElement('style');style.textContent='.app-update-banner{display:none!important}';document.head.append(style);
  });
  await run(page,warnings);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
const ready=page=>page.waitForFunction(()=>document.querySelector('#pyramidScanner canvas')&&!document.querySelector('#pyramidScanner[data-loading]')&&window.pyramidPaint.FOOD,null,{timeout:20000});
const box=(page,selector)=>page.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};},selector);

test('#3/#38 Food is one full-screen pyramid scene: no Camera button or lists on screen, both posters whole',async()=>withFood(async(page,warnings)=>{
 const returned=await page.evaluate(()=>{const d=window.myr5Menus.food();return {id:d?.id,open:d?.open,dialog:d instanceof HTMLDialogElement};});
 assert.deepEqual(returned,{id:'mealsPanel',open:true,dialog:true},'myr5Menus.food() opens Food and returns its dialog');
 await ready(page);
 assert.equal(await page.evaluate(()=>window.pyramidPaint.FOOD),'SCAN A MEAL');
 // Release 5: Food is a route, so it fills the screen down to the bottom bar (W2-2A), which stays showing, lit for Food.
 const barTop=(await box(page,'#coachDock')).top;
 assert.equal(barTop,812-64);
 assert.deepEqual(await box(page,'#mealsPanel'),{left:0,top:0,right:375,bottom:barTop,width:375,height:barTop});
 assert.equal(await page.evaluate(()=>{const b=document.querySelector('#coachDock [data-route="food"]'),r=b.getBoundingClientRect();return b.getAttribute('aria-current')==='page'&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===b;}),true,'the bar is lit for Food and tappable');
 assert.equal(await page.locator('#foodCamera').isVisible(),false,'the lens is the camera');
 for(const title of ['#macroTitle','#microTitle']){
  const section=await page.evaluate(s=>{const el=document.querySelector(s).closest('section'),r=el.getBoundingClientRect();return {w:r.width,h:r.height,text:el.textContent};},title);
  assert(section.w<=1&&section.h<=1,`${title} list is off screen`);assert.match(section.text,/Calories|Calcium/,'but kept as the screen-reader copy');
 }
 const header=await box(page,'#mealsPanel>header');
 for(const poster of ['#pyramidScanner .paper-poster','#pyramidScanner .paper-note']){
  const r=await box(page,poster);
  assert(r.left>=0&&r.right<=375&&r.bottom<=barTop&&r.top>=header.bottom-2,`${poster} is fully in frame: ${JSON.stringify(r)}`);
 }
 const clipped=await page.evaluate(()=>[...document.querySelectorAll('#pyramidScanner .paper-poster,#pyramidScanner .paper-note')].filter(el=>el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1).length);
 assert.equal(clipped,0,'poster text is not cropped');
 const tags=await page.evaluate(()=>[...document.querySelectorAll('.pyramid-tag')].filter(t=>!t.hidden).map(t=>t.textContent));
 assert.deepEqual(tags,['Scan food','Log by hand','Water','Today']);
 assert(!warnings.some(w=>w.includes('Pyramid scanner unavailable')),warnings.join('\n'));
}));

test('#31/#32/#13 the lens takes the photo, results fly onto the screens, and a tapped screen zooms full width',async()=>withFood(async page=>{
 await page.evaluate(()=>window.myr5Menus.food());await ready(page);
 const lens=await page.evaluate(()=>window.projectNode('lens'));
 await page.mouse.click(lens.x,lens.y);
 assert.equal(await page.evaluate(()=>window.photoPicks),1,'tapping the lens opens the food-photo flow');
 await page.getByRole('button',{name:'Scan food: take a food photo'}).click();
 assert.equal(await page.evaluate(()=>window.photoPicks),2,'the lens label is its keyboard/touch target');
 // A result: the screens blank, numbers fly out of the lens, then land.
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('myr5:food-selected',{detail:{name:'banana'}})));
 await page.waitForFunction(()=>document.querySelectorAll('#pyramidScanner .pyramid-fly').length>0,null,{timeout:10000});
 await page.waitForFunction(()=>Number(document.querySelector('[name="calories"]').value)>0&&!document.querySelector('#pyramidScanner .pyramid-fly')&&window.pyramidPaint.CALORIES===`${Math.round(Number(document.querySelector('[name="calories"]').value))} kcal`,null,{timeout:15000});
 assert.equal(await page.evaluate(()=>window.pyramidPaint.FOOD),'banana');
 assert(await page.locator('#saveMeal').isVisible(),'the confirm sheet is up');
 const kcal=await page.evaluate(()=>window.pyramidPaint.CALORIES);
 // Tap the calories screen: a full-width card with big numbers; tap again to return.
 await page.waitForTimeout(400); // camera settles above the sheet
 const screen=await page.evaluate(()=>window.projectNode('screen_calories'));
 await page.touchscreen.tap(screen.x,screen.y);
 const zoom=page.locator('#pyramidScanner .pyramid-zoom');
 await zoom.waitFor({state:'visible'});
 await page.waitForTimeout(400);assert(await zoom.isVisible(),'the tap that opened the zoom must not also close it');
 assert.match(await zoom.innerText(),new RegExp(`CALORIES\\s+${kcal}`));
 const card=await page.evaluate(()=>({width:document.querySelector('#pyramidScanner .pyramid-zoom').offsetWidth})),size=await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.pyramid-zoom strong')).fontSize));
 assert(card.width>=340,'the zoomed screen fills the width');assert(size>=46,`numbers are big (${size}px)`);
 await zoom.click();await zoom.waitFor({state:'hidden'});
 // Keyboard: a screen key zooms, Escape returns without closing Food.
 await page.locator('#pyramidScanner .pyramid-screen-key').nth(2).focus();await page.keyboard.press('Enter');
 await zoom.waitFor({state:'visible'});assert.match(await zoom.innerText(),/PROTEIN/);
 await page.keyboard.press('Escape');await zoom.waitFor({state:'hidden'});
 assert(await page.evaluate(()=>document.getElementById('mealsPanel').open),'Escape leaves the zoom, not Food');
}));

test('D36/#35 dials open Log by hand, Water and Today; a spin or the indicator flips the screens to today',async()=>withFood(async page=>{
 await page.evaluate(()=>window.myr5Menus.food());await ready(page);
 await page.getByRole('button',{name:'Log by hand',exact:true}).click();
 await page.waitForFunction(()=>!document.getElementById('mealConfirmation').hidden&&document.activeElement?.id==='mealName');
 assert.equal(await page.evaluate(()=>window.pyramidPaint.FOOD),'TYPE YOUR FOOD');
 await page.locator('#cancelMeal').click();
 await page.waitForFunction(()=>document.getElementById('mealConfirmation').hidden&&window.pyramidPaint.FOOD==='SCAN A MEAL');
 await page.getByRole('button',{name:'Water',exact:true}).click();
 await page.waitForFunction(()=>!document.getElementById('foodDial').hidden);
 assert.equal(await page.locator('#foodDialTitle').textContent(),'Water');
 assert.equal(await page.getByRole('button',{name:'Water',exact:true}).getAttribute('aria-pressed'),'true');
 assert(await page.getByRole('button',{name:'Set a water reminder'}).isVisible());
 // Today's dial sits on the back: its label still takes keyboard focus.
 await page.getByRole('button',{name:'Today',exact:true}).focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.getElementById('foodDialTitle').textContent==='Today');
 assert.match(await page.locator('#foodDialBody').innerText(),/Sign in to see today’s meals/);
 await page.locator('#foodDialBack').click();
 await page.waitForFunction(()=>document.getElementById('foodDial').hidden&&!document.getElementById('mealsPanel').dataset.dial);
 // #35: a clear swipe spins the pyramid round to its other face.
 const flip=page.locator('#pyramidScanner .pyramid-flip');
 assert.match(await flip.getAttribute('aria-label'),/show the last meal/);
 const canvas=await box(page,'#pyramidScanner canvas');
 await page.mouse.move(110,canvas.top+canvas.height*.66);await page.mouse.down();await page.mouse.move(320,canvas.top+canvas.height*.66,{steps:4});await page.mouse.up();
 await page.waitForFunction(()=>/today’s totals\./.test(document.querySelector('.pyramid-flip').getAttribute('aria-label'))&&window.pyramidPaint.FOOD==='TODAY',null,{timeout:5000});
 await flip.click();
 await page.waitForFunction(()=>/the last meal\./.test(document.querySelector('.pyramid-flip').getAttribute('aria-label'))&&window.pyramidPaint.FOOD==='SCAN A MEAL',null,{timeout:5000});
}));

test('reduced motion: the indicator flips the screens at once and results land without flying',async()=>withFood(async page=>{
 await page.evaluate(()=>window.myr5Menus.food());await ready(page);
 await page.locator('#pyramidScanner .pyramid-flip').click();
 assert.equal(await page.evaluate(()=>window.pyramidPaint.FOOD),'TODAY','no spin animation: the face swaps immediately');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('myr5:food-selected',{detail:{name:'banana'}})));
 await page.waitForFunction(()=>Number(document.querySelector('[name="calories"]').value)>0&&window.pyramidPaint.CALORIES===`${Math.round(Number(document.querySelector('[name="calories"]').value))} kcal`,null,{timeout:15000});
 assert.equal(await page.evaluate(()=>window.pyramidPaint.FOOD),'banana','a result switches back to the meal face');
 assert.equal(await page.locator('#pyramidScanner .pyramid-fly').count(),0);
},{reducedMotion:'reduce'}));

// What the real recognition model answers for a burger photo (hamburger 98.7%, measured with food-worker.mjs's pinned
// swin-food101 model). The stub also reports what it was handed, proving the photo reached the worker resized to JPEG.
const BURGER_WORKER=`self.onmessage=({data})=>{
 const kind=data.image.slice(0,23);
 postMessage({type:'progress',stage:'analyzing',text:'Worker got '+kind+' ('+data.image.length+' chars)'});
 setTimeout(()=>postMessage({type:'result',uncertain:false,items:[{label:'hamburger',score:.987},{label:'hot dog',score:.006},{label:'club sandwich',score:.002},{label:'onion rings',score:.002}]}),600);
};`;

test('#31 a sample food photo runs the real scan path onto the screens, then Save puts it in today\'s log',async()=>{
 const meals=[];
 await withFood(async page=>{
  await page.evaluate(()=>window.myr5Menus.food());await ready(page);
  await page.waitForFunction(()=>window.coachPlan&&!document.getElementById('accountContent').hidden,null,{timeout:10000});
  assert.equal(await page.evaluate(()=>window.pyramidPaint.FOOD),'SCAN A MEAL');
  // The camera hands back a photo: a 1200x900 PNG drawn on a canvas, set on the real #foodPhoto input.
  await page.evaluate(async()=>{
   const c=document.createElement('canvas');c.width=1200;c.height=900;const g=c.getContext('2d');
   g.fillStyle='#2b2b30';g.fillRect(0,0,1200,900);g.fillStyle='#d99a4e';g.beginPath();g.ellipse(600,380,330,170,0,Math.PI,0);g.fill();g.fillStyle='#5b3622';g.fillRect(280,440,640,90);g.fillStyle='#e0b25d';g.fillRect(290,540,620,70);
   const blob=await new Promise(r=>c.toBlob(r,'image/png')),input=document.getElementById('foodPhoto'),files=new DataTransfer();
   files.items.add(new File([blob],'burger.png',{type:'image/png'}));input.files=files.files;input.dispatchEvent(new Event('change'));
  });
  // Full-screen photo flow while the worker analyses the resized photo.
  await page.waitForFunction(()=>/Worker got data:image\/jpeg;base64/.test(document.getElementById('scanDetail').textContent));
  assert.deepEqual(await box(page,'#mealScanStage'),{left:0,top:0,right:375,bottom:812-64,width:375,height:812-64},'full screen down to the bottom bar');
  assert.equal(await page.locator('#scanPhase').textContent(),'ANALYZING FOOD');
  assert(await page.locator('#scanPhase').isVisible(),'the scan read-out shows without the optional pocket-hardware skin');
  // Result -> USDA match -> the numbers fly onto the screens.
  await page.waitForFunction(()=>document.getElementById('mealScanStage').hidden&&document.getElementById('mealName').value==='hamburger');
  await page.waitForFunction(()=>Number(document.querySelector('[name="calories"]').value)>0&&!document.querySelector('#pyramidScanner .pyramid-fly')&&window.pyramidPaint.FOOD==='hamburger',null,{timeout:15000});
  const form=await page.evaluate(()=>Object.fromEntries(['calories','protein','fat','carbs'].map(k=>[k,Number(document.querySelector(`[name="${k}"]`).value)])));
  const shown=await page.evaluate(()=>window.pyramidPaint);
  assert.equal(shown.CALORIES,`${Math.round(form.calories)} kcal`);
  assert.equal(shown.PROTEIN,`${Math.round(form.protein*10)/10} g`);assert.equal(shown.FAT,`${Math.round(form.fat*10)/10} g`);assert.equal(shown.CARBS,`${Math.round(form.carbs*10)/10} g`);
  assert.equal(typeof shown.VITAMINS,'string');
  assert.match(await page.locator('#scanDetail').textContent(),/hamburger · 98\.7% match score/);
  // Save -> /api/meals -> today's log, the last-meal face and today's totals.
  await page.locator('#saveMeal').click();
  await page.waitForFunction(()=>document.getElementById('mealStatus').textContent==='Meal saved');
  assert.equal(meals.length,1);assert.equal(meals[0].name,'hamburger');assert.equal(meals[0].calories,form.calories);
  await page.waitForFunction(()=>document.getElementById('mealConfirmation').hidden&&window.pyramidPaint.FOOD==='hamburger',null,{timeout:10000});
  await page.getByRole('button',{name:'Today',exact:true}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>/hamburger · .* · \d+ kcal/.test(document.getElementById('foodDialBody').innerText));
  assert.match(await page.locator('#foodDialBody').innerText(),new RegExp(`${Math.round(form.calories)} kcal`));
  await page.locator('#foodDialBack').click();
  await page.locator('#pyramidScanner .pyramid-flip').click();
  await page.waitForFunction(()=>window.pyramidPaint.FOOD==='TODAY · 1 MEAL',null,{timeout:5000});
  assert.equal(await page.evaluate(()=>window.pyramidPaint.CALORIES),`${Math.round(form.calories)} kcal`);
 },{signedIn:true,worker:BURGER_WORKER,meals});
});

test('#34 the empty state invites a scan (SCAN A MEAL, dashes, a pulsing lens) and calms once a meal exists',async()=>withFood(async page=>{
 await page.evaluate(()=>window.myr5Menus.food());await ready(page);
 assert.equal(await page.evaluate(()=>window.pyramidPaint.FOOD),'SCAN A MEAL');
 assert.equal(await page.evaluate(()=>window.pyramidPaint.CALORIES),'—');
 assert.equal(await page.evaluate(()=>document.querySelector('[aria-label="Scan food: take a food photo"]').hasAttribute('data-pulse')),true,'idle lens pulses harder');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('myr5:food-selected',{detail:{name:'banana'}})));
 await page.waitForFunction(()=>Number(document.querySelector('[name="calories"]').value)>0&&!document.querySelector('#pyramidScanner .pyramid-fly'),null,{timeout:15000});
 assert.equal(await page.evaluate(()=>document.querySelector('[aria-label="Scan food: take a food photo"]').hasAttribute('data-pulse')),false,'pulse drops back once a meal exists');
}));

const ERROR_WORKER=`self.onmessage=()=>{setTimeout(()=>postMessage({type:'error',text:'Photo recognition could not finish. Try again on Wi-Fi or type the food name.'}),50);};`;
async function pickAPhoto(page){
 await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=100;c.height=100;c.getContext('2d').fillRect(0,0,100,100);
  const blob=await new Promise(r=>c.toBlob(r,'image/png')),input=document.getElementById('foodPhoto'),files=new DataTransfer();
  files.items.add(new File([blob],'x.png',{type:'image/png'}));input.files=files.files;input.dispatchEvent(new Event('change'));
 });
}

test('#36 Type it appears after a scan error, opens Log by hand and focuses the name field, and hides on reset',async()=>withFood(async page=>{
 await page.evaluate(()=>window.myr5Menus.food());await ready(page);
 await pickAPhoto(page);
 await page.waitForFunction(()=>document.getElementById('scanPhase').textContent==='SCAN INTERRUPTED');
 const typeIt=page.getByRole('button',{name:'Type it',exact:true});
 await typeIt.waitFor({state:'visible'});
 await typeIt.click();
 await page.waitForFunction(()=>!document.getElementById('mealConfirmation').hidden&&document.activeElement?.id==='mealName');
 assert.equal(await page.getByRole('button',{name:'Log by hand',exact:true}).evaluate(el=>el.hasAttribute('data-on')),true,'the knob_0 label lights');
 await page.locator('#cancelMeal').click();
 await page.waitForFunction(()=>document.getElementById('mealConfirmation').hidden);
 assert.equal(await typeIt.isVisible(),false,'hidden again once the scan is reset');
},{worker:ERROR_WORKER}));

const UNSURE_WORKER=`self.onmessage=()=>{setTimeout(()=>postMessage({type:'result',uncertain:true,items:[{label:'oatmeal',score:.42},{label:'porridge',score:.3},{label:'rice pudding',score:.1},{label:'cereal',score:.05}]}),50);};`;

test('#37 an unsure result asks (pyramid full size, no sheet), Fix opens the sheet prefilled, Yes accepts directly',async()=>withFood(async page=>{
 await page.evaluate(()=>window.myr5Menus.food());await ready(page);
 await pickAPhoto(page);
 const question=page.locator('#pyramidScanner .pyramid-question');
 await question.waitFor({state:'visible',timeout:15000});
 assert.match(await question.textContent(),/Looks like… oatmeal\?/);
 await page.waitForFunction(()=>window.pyramidPaint.FOOD==='oatmeal',null,{timeout:15000}); // the plain guess flies in as usual; the question rides above it
 const yes=page.getByRole('button',{name:'Yes',exact:true}),fix=page.getByRole('button',{name:'Fix',exact:true}),typeIt=page.getByRole('button',{name:'Type it',exact:true});
 assert.equal(await yes.isVisible(),true);assert.equal(await fix.isVisible(),true);assert.equal(await typeIt.isVisible(),true);
 for(const tag of [yes,fix,typeIt])assert((await tag.boundingBox()).height>=44,'a 44px tap target');
 assert.equal(await page.locator('#mealConfirmation').isVisible(),false,'#3: the pyramid, not the correction sheet, is the whole Food menu while unsure');
 await fix.click();
 assert.equal(await page.locator('#foodSuggestions').isVisible(),true,'Fix reveals the other matches');
 assert.equal(await page.locator('#mealConfirmation').isVisible(),true,'Fix opens the correction sheet');
 assert.equal(await page.locator('#mealName').inputValue(),'oatmeal','the sheet is prefilled with the guess, not empty');
 assert.equal(await question.isVisible(),false,'the question is resolved');
 // A second unsure result: Yes accepts directly, without opening the candidate list.
 await pickAPhoto(page);
 await question.waitFor({state:'visible',timeout:15000});
 await page.getByRole('button',{name:'Yes',exact:true}).click();
 await page.waitForFunction(()=>window.pyramidPaint.FOOD==='oatmeal',null,{timeout:15000}); // Yes keeps the guess
 assert.equal(await question.isVisible(),false);
 assert.equal(await page.locator('#mealConfirmation').isVisible(),true,'Yes opens the correction sheet too');
},{worker:UNSURE_WORKER}));

test('#39 a loading stand-in (silhouette + rising percent) shows while the model downloads, then the model swaps in',async()=>withFood(async page=>{
 // No DevTools session in this harness: re-serve the real GLB in slow chunks with a Content-Length so the percent readout has something to compute from.
 await page.evaluate(()=>{
  const real=window.fetch;
  window.fetch=async function(input,options){
   if(String(input).endsWith('/food/pyramid-scanner.glb')){
    const res=await real(input,options),buf=await res.arrayBuffer(),total=buf.byteLength,step=Math.max(1,Math.ceil(total/4));let sent=0;
    const stream=new ReadableStream({async pull(controller){
     if(sent>=total){controller.close();return;}
     await new Promise(r=>setTimeout(r,150));
     const end=Math.min(total,sent+step);controller.enqueue(new Uint8Array(buf.slice(sent,end)));sent=end;
    }});
    return new Response(stream,{headers:{'Content-Length':String(total)}});
   }
   return real(input,options);
  };
 });
 await page.evaluate(()=>window.myr5Menus.food());
 await page.waitForSelector('#pyramidScanner .pyramid-loading svg',{state:'attached'});
 await page.waitForFunction(()=>/Loading the pyramid · \d+%/.test(document.querySelector('.pyramid-loading-text')?.textContent||''),null,{timeout:5000});
 await ready(page);
 await page.waitForSelector('#pyramidScanner .pyramid-loading',{state:'detached',timeout:5000}); // it fades out (CSS transition), then is removed
}));

test('#40 no food during a workout: myr5Routes.go(\'food\') opens nothing while camera tracking is active',async()=>withFood(async page=>{
 await page.evaluate(()=>{document.body.dataset.cameraWorkout='true';});
 const hashBefore=await page.evaluate(()=>location.hash);
 await page.evaluate(()=>window.myr5Routes.go('food'));
 await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>document.getElementById('mealsPanel').open),false,'#mealsPanel stays closed');
 assert.equal(await page.evaluate(()=>location.hash),hashBefore,'no hash change');
}));
