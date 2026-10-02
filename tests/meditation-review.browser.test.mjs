import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {BREATHING_MODES,GENTLE_DIALOGUE,GUIDED_ROUND_TIMING,buildScript} from '../breathing-modes.mjs';
const guided=BREATHING_MODES['wim-hof'];
const beforeHold=()=>{let ms=0;for(const phase of buildScript('wim-hof')){if(phase.key==='optional-hold')return ms;ms+=phase.ms;}throw Error('Missing optional hold');};

// Reuse the existing source-backed scene fixture, including account receipts and coach calls.
const fixture=await readFile(new URL('./meditation-scene.browser.test.mjs',import.meta.url),'utf8');
const html=fixture.match(/const PAGE=`([\s\S]*?)`;/)[1].replace('mountMeditation({api,getAccount','mountMeditation({api,onComplete:async()=>{window.__completionEntered=true;if(window.__completionGate)await window.__completionGate;},getAccount');
const routedHtml=html.replace('<link rel="stylesheet" href="/launch.css">','<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script><link rel="stylesheet" href="/launch.css">')
 .replace('<footer class="crew-footer"></footer>','<footer id="coachDock" class="coach-dock crew-footer"><button data-route="pod">Pod</button><button data-route="meditate">Meditate</button></footer>')
 .replace("import {mountMeditation} from '/meditation.mjs';","import {mountMeditation} from '/meditation.mjs'; import {mountRoutes} from '/modules/routes.mjs';")
 .replace('window.__ready=true;','mountRoutes();window.__ready=true;');
const root=resolve('.'),shots=resolve('.frames/meditation-review');
let server,browser,base;
test.before(async()=>{
 await mkdir(shots,{recursive:true});
 server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__review__'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  if(path==='/__review-route__'){res.setHeader('Content-Type','text/html');res.end(routedHtml);return;}
  if(path==='/arcade/tub-flight/game.mjs'){const source=await readFile(resolve(root,'.'+path),'utf8');res.setHeader('Content-Type','text/javascript');res.end(source.replace('return {game,pause()', 'return window.__reviewTubFlight={game,pause()'));return;}
  try{const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(body);}catch{res.statusCode=404;res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'msedge',headless:true});
});
test.after(async()=>{await browser?.close();server?.close();});
async function room(viewport={width:375,height:812},{reducedMotion='no-preference',integrated=false,beforeOpen}={}){
 const context=await browser.newContext({viewport,reducedMotion}),page=await context.newPage();
 await page.clock.install({time:new Date('2026-09-22T12:00:00Z')});
 await page.goto(base+(integrated?'/__review-route__':'/__review__'));await page.waitForFunction(()=>window.__ready);
 await beforeOpen?.(page);
 if(integrated){await page.evaluate(()=>window.myr5Routes.go('meditate'));await page.locator('.meditation-panel[data-route="meditate"]').waitFor();await page.addStyleTag({content:'.portal-peer-ui{display:none!important}/* the portal frame tilt chip is out of scope here */'});}else await page.locator('.meditation-entry').click();
 return {context,page};
}
async function start(page,mode){await page.locator(`[data-mode="${mode}"]`).click();if(mode==='wim-hof')await page.locator('[data-seated-accept]').click();await page.waitForFunction(()=>/remaining/.test(document.querySelector('[data-status]').textContent));await page.clock.runFor(250);}
const calls=page=>page.evaluate(()=>window.__calls.filter(p=>p==='/api/breathing/complete').length);
async function visibleAvatarBounds(page){return page.locator('.meditation-character canvas').evaluate(canvas=>{
 const {width,height}=canvas,rgba=canvas.getContext('2d').getImageData(0,0,width,height).data;let minX=width,minY=height,maxX=-1,maxY=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(rgba[(y*width+x)*4+3]>32){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 if(maxX<0)throw Error('The player avatar canvas is empty');const r=canvas.getBoundingClientRect();if(!r.width||!r.height)throw Error('The player avatar canvas is hidden');return {x:r.x+minX*r.width/width,y:r.y+minY*r.height/height,width:(maxX-minX+1)*r.width/width,height:(maxY-minY+1)*r.height/height};
});}

test('the room renders the saved player Gala avatar at its native pixel resolution, seated only',async()=>{
 const {context,page}=await room({width:375,height:812},{integrated:true,beforeOpen:page=>page.evaluate(()=>{
  const A=window.GalaAvatar,look=A.normalize({...structuredClone(A.defaultLook),name:'Review player look',dye:3});localStorage.setItem('mominc-avatar-v1',JSON.stringify(look));window.__avatarDraws=[];const draw=A.draw;A.draw=(canvas,look,options)=>{window.__avatarDraws.push({look:structuredClone(look),options:structuredClone(options)});return draw(canvas,look,options);};
 })});
 const canvas=page.locator('.meditation-character canvas');assert.equal(await canvas.isVisible(),true);assert.deepEqual(await canvas.evaluate(el=>[el.width,el.height]),[64,96]);assert.equal(await canvas.evaluate(el=>getComputedStyle(el).imageRendering),'pixelated');
 await visibleAvatarBounds(page);assert.equal(await page.locator('[data-pose]').count(),0,'the standing pose selector is gone');
 const draws=await page.evaluate(()=>window.__avatarDraws);assert.ok(draws.some(draw=>draw.look.name==='Review player look'&&draw.look.dye===3&&draw.options.pose.meditate));assert.ok(!draws.some(draw=>draw.options.pose.meditationStanding),'the room never draws the standing pose');await context.close();
});

test('the accessible circle exits without a character poke, while five avatar taps preserve Tub Flight and its completion link',async()=>{
 const {context,page}=await room();assert.equal(await page.getByRole('button',{name:/^Stop(?: now)?$/i}).count(),0);
 const circle=page.locator('[data-breath-exit]');assert.equal(await circle.evaluate(el=>el.tagName==='BUTTON'||el.getAttribute('role')==='button'&&el.tabIndex>=0),true);assert.equal(await circle.evaluate(el=>!!el.closest('[aria-hidden="true"]')),false,'exit is exposed to assistive technology');
 assert.match(await circle.getAttribute('aria-label')||'',/exit|leave|end|stop/i,'circle names its exit action');
 await page.evaluate(()=>{const character=document.querySelector('.meditation-character'),original=character.onclick;window.__characterClicks=0;character.onclick=event=>{window.__characterClicks++;return original.call(character,event);};});
 await start(page,'wim-hof');await circle.click();assert.equal(await page.evaluate(()=>window.__characterClicks),0,'circle tap never pokes the player');assert.equal(await page.locator('[data-breath-run]').isHidden(),true);await page.clock.runFor(5000);assert.equal(await calls(page),0);assert.equal(await page.locator('.meditation-panel').evaluate(el=>el.open),false,'cartoon bounce finishes by leaving the room');
 await page.locator('.meditation-entry').click();await start(page,'wim-hof');await page.mouse.click(5,450);for(let i=0;i<5;i++)await page.locator('.meditation-character').click();await page.clock.runFor(3100);
 assert.equal(await page.locator('[data-meditation-scene]').isHidden(),true);assert.equal(await page.locator('[data-meditation-arcade] canvas').isVisible(),true);await page.locator('[data-meditation-arcade] [data-flap]').click();
 // Expose only the existing game's returned test instance; exercise its actual completion callback.
 await page.evaluate(()=>{window.__reviewTubFlight.game.phase='complete';});await page.clock.runFor(50);
 const link=page.locator('[data-meditation-arcade] a.primary-action');assert.equal(await link.getAttribute('href'),'https://mominc.online/games/fuel/#fuelFlight=myr5-eight-pipes');assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await calls(page),0);await context.close();
});

test('single round runs 210 active seconds, freezes when paused/hidden, and saves once',async()=>{
 const {context,page}=await room();await start(page,'wim-hof');
 assert.equal(await page.locator('progress').getAttribute('max'),'210000');
 await page.clock.runFor(19000);const before=await page.locator('[data-session-clock]').textContent(),countBefore=await page.locator('[data-breath-count]').textContent();
 await page.mouse.click(5,450);await page.locator('[data-breath-pause]').click();await page.clock.runFor(20000);assert.equal(await page.locator('[data-session-clock]').textContent(),before);assert.equal(await page.locator('[data-breath-count]').textContent(),countBefore,'phase countdown pauses with session clock');
 await page.mouse.click(5,450);await page.locator('[data-breath-pause]').click();await page.clock.runFor(250);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));await page.clock.runFor(20000);const hiddenTime=await page.locator('[data-session-clock]').textContent();assert.equal(hiddenTime,before);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));await page.clock.runFor(181000);assert.equal(await calls(page),0,'three minutes must not finish the 210-second round');
 await page.clock.runFor(30000);await page.waitForFunction(()=>/Breathing complete/.test(document.querySelector('[data-status]').textContent));assert.equal(await calls(page),1);assert.equal(await page.locator('[data-session-clock]').textContent(),'0:00');
 await page.clock.runFor(10000);assert.equal(await calls(page),1);await context.close();
});

test('WHM instructs seated practice; the counter chip follows phases',async()=>{
 const {context,page}=await room();await start(page,'wim-hof');assert.match(await page.locator('[data-seated]').textContent(),/seated|lying/i);
 assert.equal(await page.locator('.coach-pixel').isHidden(),true,'successful live coach preview hides the illustrative fallback');
 const coachLog=await page.evaluate(()=>window.__creature),previewIndex=coachLog.findIndex(([name,parts])=>name==='preview'&&parts),sleepIndex=coachLog.findLastIndex(([name,sleeping])=>name==='sleep'&&sleeping===true);assert.ok(sleepIndex>previewIndex,'sleep is restored after loading the preview rig');
 const scale=()=>page.locator('.breath-hud').evaluate(el=>Number(getComputedStyle(el).getPropertyValue('--breath-progress')));
 await page.clock.runFor(guided.settleMs);const initial=await scale();await page.clock.runFor(guided.inhaleMs/2);const expanded=await scale();assert.ok(expanded>initial,'breath progress rises during inhale');
 await page.clock.runFor(guided.inhaleMs/2+250);assert.equal(await page.locator('[data-breath-count]').getAttribute('data-breath'),'out');const exhale=await scale();await page.clock.runFor(guided.exhaleMs/2);assert.ok(await scale()<exhale,'breath progress falls during exhale');
 const advanceTo=async time=>{const elapsed=await page.locator('progress').evaluate(el=>el.value);await page.clock.runFor(time-elapsed);};
 await advanceTo(beforeHold()-guided.transitionMs+100);assert.equal(await page.locator('[data-breath-direction]').textContent(),'OUT');const releaseStart=await scale();await page.clock.runFor(1000);assert.ok(await scale()<releaseStart,'final release falls');
 await advanceTo(beforeHold()+guided.holdMs+100);assert.equal(await page.locator('[data-breath-direction]').textContent(),'IN');const recoveryStart=await scale();await page.clock.runFor(1000);assert.ok(await scale()>recoveryStart,'recovery inhale rises');
 await page.locator('[data-meditation-close]').click();await page.clock.runFor(60000);assert.equal(await calls(page),0);assert.equal(await page.locator('#coachMount > .myr5-companion-card').count(),1);await context.close();
});

for(const reducedMotion of ['no-preference','reduce'])test(`breathing cue remains phase-driven with motion preference ${reducedMotion}`,async()=>{
 const {context,page}=await room({width:375,height:748},{reducedMotion});await start(page,'wim-hof');await page.clock.runFor(guided.settleMs);
 const scale=()=>page.locator('.breath-hud').evaluate(el=>Number(getComputedStyle(el).getPropertyValue('--breath-progress')));
 const inhaleStart=await scale();await page.clock.runFor(guided.inhaleMs/2);assert.ok(await scale()>inhaleStart,'inhale visibly expands');
 await page.clock.runFor(guided.inhaleMs/2+100);const exhaleStart=await scale();await page.clock.runFor(guided.exhaleMs/2);assert.ok(await scale()<exhaleStart,'exhale visibly contracts');await context.close();
});

test('a delayed completion callback cannot wake a closed and reopened room',async()=>{
 const {context,page}=await room();await page.evaluate(()=>{window.__completionGate=new Promise(resolve=>window.__releaseCompletion=resolve);});await start(page,'wim-hof');await page.clock.runFor(211000);await page.waitForFunction(()=>window.__completionEntered);
 await page.locator('[data-meditation-close]').click();await page.locator('.meditation-entry').click();await page.evaluate(()=>window.__releaseCompletion());await page.clock.runFor(6000);
 assert.equal(await page.locator('.meditation-panel').evaluate(el=>el.classList.contains('meditation-colour')),false);assert.equal(await page.locator('[data-breath-modes]').isVisible(),true);assert.equal(await calls(page),1);await context.close();
});

test('a delayed completion callback cannot wake the room after account invalidation',async()=>{
 const {context,page}=await room();await page.evaluate(()=>{window.__completionGate=new Promise(resolve=>window.__releaseCompletion=resolve);});await start(page,'wim-hof');await page.clock.runFor(211000);await page.waitForFunction(()=>window.__completionEntered);
 await page.evaluate(async()=>{const {authTransitions}=await import('/auth-transition.mjs');authTransitions().invalidate();window.__releaseCompletion();});await page.clock.runFor(6000);
 assert.equal(await page.locator('.meditation-panel').evaluate(el=>el.classList.contains('meditation-colour')),false);assert.equal(await page.locator('[data-breath-modes]').isVisible(),true);await context.close();
});

test('optional hold can be skipped and cartoon early exit immediately abandons saving',async()=>{
 const {context,page}=await room();await start(page,'wim-hof');await page.clock.runFor(beforeHold()+1000);
 assert.equal(await page.locator('[data-breath-run]').getAttribute('data-phase'),'optional-hold');assert.equal(await page.locator('[data-skip-hold]').isVisible(),true);
 await page.mouse.click(5,450);await page.locator('[data-skip-hold]').click();assert.notEqual(await page.locator('[data-breath-run]').getAttribute('data-phase'),'optional-hold');assert.equal(await calls(page),0);
 await page.clock.runFor(35000);assert.equal(await page.locator('[data-breath-run]').getAttribute('data-phase'),'rest','skipping the first hold also removes the later recovery hold');
 await page.locator('[data-breath-exit]').click();assert.equal(await page.locator('[data-breath-run]').isHidden(),true,'session clock is abandoned immediately');await page.clock.runFor(1000);assert.equal(await calls(page),0);
 await page.clock.runFor(60000);assert.equal(await calls(page),0);await context.close();
});

test('returning from a cached page restores a usable room and account fencing',async()=>{
 const {context,page}=await room();await start(page,'wim-hof');await page.clock.runFor(5000);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await page.clock.runFor(20000);assert.equal(await calls(page),0);assert.equal(await page.locator('#coachMount > .myr5-companion-card').count(),1);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 if(await page.locator('.meditation-panel').evaluate(el=>el.open))await page.locator('[data-meditation-close]').click();
 await page.locator('.meditation-entry').click();await start(page,'wim-hof');const restartedTime=await page.locator('[data-session-clock]').textContent();await page.clock.runFor(5000);assert.notEqual(await page.locator('[data-session-clock]').textContent(),restartedTime,'clock ticks after cached-page return');
 await page.evaluate(async()=>{const {authTransitions}=await import('/auth-transition.mjs');authTransitions().invalidate();});assert.equal(await page.locator('[data-breath-modes]').isVisible(),true,'account transitions still reset the room after return');await context.close();
});

for(const {width,height,integrated=false} of [{width:375,height:812},{width:375,height:748},{width:375,height:667},{width:375,height:603},{width:812,height:375},{width:375,height:812,integrated:true},{width:375,height:667,integrated:true},{width:812,height:375,integrated:true}])test(`controls fit ${width}x${height}${integrated?' integrated route':''}`,async()=>{
 const viewport={width,height},size=`${width}x${height}${integrated?'-route':''}`;
 const {context,page}=await room(viewport,{integrated});
 if(integrated){const panelBox=await page.locator('.meditation-panel').boundingBox();assert.ok(panelBox.y+panelBox.height<=height+1&&panelBox.height<height,'the framed room stays inside the viewport with the dock'+JSON.stringify(panelBox));assert.equal(await page.locator('.meditation-panel > #coachDock').count(),1,'router adopts the real dock into the room');}
 await page.screenshot({path:resolve(shots,`choice-${size}.png`)});
 const choiceErrors=[],begin=page.locator('[data-begin]'),beginBox=await begin.boundingBox();assert.equal(await page.locator('[data-mode="tai-chi"]').count(),0,'R20: the start screen offers only Begin');assert.equal((await begin.textContent()).trim(),'Begin');if(!(beginBox&&beginBox.x>=0&&beginBox.y>=0&&beginBox.x+beginBox.width<=viewport.width&&beginBox.y+beginBox.height<=viewport.height))choiceErrors.push(`Begin outside viewport: ${JSON.stringify(beginBox)}`);if(!await begin.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}))choiceErrors.push('Begin is covered');
 await start(page,'wim-hof');await page.screenshot({path:resolve(shots,`active-${size}.png`)});

 assert.deepEqual(choiceErrors,[]);
 const landscape=width>height,captionMin=landscape?24:2*Math.max(12,Math.min(19,width*.037)),phaseMin=landscape?20:24;
 for(const [selector,minSize] of [['.meditation-speech',captionMin],['[data-phase-label]',phaseMin]]){const typography=await page.locator(selector).evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),scroll:[el.scrollWidth,el.scrollHeight],client:[el.clientWidth,el.clientHeight],overflow:getComputedStyle(el).overflow,clipped:el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1}));assert.ok(typography.size>=minSize-.05,`${selector} guide text is at least twice its previous size (${minSize}px)`);assert.equal(typography.clipped,false,JSON.stringify(typography)+`${selector} enlarged text fits without clipping`);}
 for(const selector of ['[data-breath-exit]','[data-breath-pause]','[data-meditation-close]','[data-breath-count]','[data-session-clock]']){const locator=page.locator(selector),box=await locator.boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,`${selector} within viewport`);if(selector.includes('exit')||selector.includes('pause')||selector.includes('close'))assert.equal(await locator.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el.contains(hit)||('covered by '+hit?.className+' '+JSON.stringify(r));}),true,`${selector} is reachable`);}
 const clockBox=await page.locator('[data-session-clock]').boundingBox();assert.equal(await page.locator('.breathing-ring,.meditation-platform').evaluateAll(els=>els.every(el=>getComputedStyle(el).display==='none')),true,'no ring or diamond covers the scene');assert.ok(clockBox.width<120&&clockBox.height<40,'the counter is a small chip');assert.ok(clockBox.y>height*.5,'the counter sits low');
 const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 const visibleFigure=await visibleAvatarBounds(page);
 assert.equal(overlaps(clockBox,visibleFigure),false,'foreground figure leaves center timer readable');
 assert.equal(overlaps(await page.locator('[data-breath-direction]').boundingBox(),visibleFigure),false,'foreground figure leaves breathing direction readable');
 assert.equal(overlaps(await page.locator('.meditation-speech').boundingBox(),await page.locator('.breath-run').boundingBox()),false,'control panel does not cover guidance');
 assert.equal(overlaps(await page.locator('.meditation-speech').boundingBox(),visibleFigure),false,'guidance does not cover the visible figure');
 assert.equal(overlaps(await page.locator('.meditation-speech').boundingBox(),await page.locator('[data-meditation-close]').boundingBox()),false,'Close does not cover guidance');
 const captionErrors=await page.locator('.meditation-speech').evaluate((el,captions)=>{const saved=el.textContent,errors=[];for(const text of captions){el.textContent=text;const r=el.getBoundingClientRect(),run=document.querySelector('.breath-run').getBoundingClientRect(),close=document.querySelector('[data-meditation-close]').getBoundingClientRect();const overlaps=b=>r.x<b.right&&r.right>b.x&&r.y<b.bottom&&r.bottom>b.y;if(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1||overlaps(run)||overlaps(close))errors.push(text);}el.textContent=saved;return errors;},[...new Set([...GENTLE_DIALOGUE,...buildScript('wim-hof').map(p=>p.dialogue).filter(Boolean)])]);
 assert.deepEqual(captionErrors,[],'all original guidance captions remain unclipped and clear of controls');
 assert.equal(overlaps(beginBox,visibleFigure),false,'Begin leaves the seated figure visible');
 // R20: the settle countdown and the steady in/out cue sit on screen, clear of the guidance bubble, the figure and Close.
 for(const [selector,ms] of [['[data-settle-countdown]',0],['[data-breath-cue]',GUIDED_ROUND_TIMING.settleMs+500]]){await page.clock.runFor(ms);const box=await page.locator(selector).boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,`${selector} within viewport ${JSON.stringify(box)}`);for(const [other,b] of [['guidance',await page.locator('.meditation-speech').boundingBox()],['figure',visibleFigure],['Close',await page.locator('[data-meditation-close]').boundingBox()]])assert.equal(overlaps(box,b),false,`${selector} clear of ${other}`);}
 await page.screenshot({path:resolve(shots,`cue-${size}.png`)});
 await context.close();
});
