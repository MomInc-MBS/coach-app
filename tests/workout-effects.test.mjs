import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mapPointToOverlay,mountWorkoutEffects} from '../arcade/workout-effects.mjs';
import {workoutEffectsSnapshot,isMartialSliceExercise,holdStyleForExercise,latestRetainableWorkoutSnapshot,createOptionalRetry,createOptionalModuleLoader} from '../arcade/workout-effects-state.mjs';
import {createRetainedPower} from '../arcade/power/retained-power.mjs';

test('overlay mapping contains letterboxed video, mirrors into host space, and keeps missing landmarks missing',()=>{
 const g={videoWidth:1920,videoHeight:1080,hostWidth:360,hostHeight:640};
 const top=mapPointToOverlay({x:.5,y:0,visibility:.9},g),mirrored=mapPointToOverlay({x:.2,y:.5,visibility:.9},{...g,mirrored:true});
 assert.ok(top.y>.3&&top.y<.4);assert.equal(mirrored.x,.8);assert.equal(mapPointToOverlay(null,g),null);
});

test('effect snapshot uses post-consume workout state and valid hold gates',()=>{
 const base={pose:{points:[{x:.5,y:.5,visibility:.9}],width:640,height:480,now:10},motion:{kind:'hold',tracking:true,progress:1},workout:{mode:'plank',kind:'hold',stage:'working',counting:true,finished:false,value:3,activeSeconds:45,difficulty:'medium'},sessionId:'set-a',ownerId:'account:alpha',tracking:true,visible:true,canCount:true,workingSet:true};
 const detail=workoutEffectsSnapshot(base);assert.equal(detail.validHold,true);assert.equal(detail.workout.active,true);assert.equal(detail.workout.sessionId,'set-a');assert.equal(detail.workout.ownerId,'account:alpha');assert.equal(detail.workout.activeSeconds,45);
 assert.equal(workoutEffectsSnapshot({...base,canCount:false}).validHold,false);
 assert.equal(workoutEffectsSnapshot({...base,visible:false}).workout.active,false);
 assert.equal(workoutEffectsSnapshot({...base,motion:{...base.motion,tracking:false}}).workout.active,false);
 assert.equal(workoutEffectsSnapshot({...base,motion:{...base.motion,progress:0}}).validHold,false);
 assert.equal(workoutEffectsSnapshot({...base,workout:{...base.workout,paused:true}}).workout.paused,true);
 assert.equal(workoutEffectsSnapshot({...base,workout:{...base.workout,stage:'preparation-easy'}}).workout.stage,'preparation-easy');
});

test('Fruit Ninja classifier excludes every hold while preserving boxing',()=>{
 for(const group of ['stances','yoga','balance','floor'])assert.equal(isMartialSliceExercise({group,kind:'hold'}),false);
 assert.equal(isMartialSliceExercise({group:'boxing',kind:'reps'}),true);
 assert.equal(isMartialSliceExercise({group:'stances',kind:'reps'}),true);
});

test('a stale pending module cannot mount after invalidation; living holds retry ecology and power',async()=>{
 let releaseFirst;const firstImport=new Promise(resolve=>{releaseFirst=resolve;}),holdLoads=[];
 const mounted={hold:[],power:[]},calls=[];
 const moduleFor=kind=>({[kind==='hold'?'mountCameraHold':'mountCameraPower'](options){if(kind==='hold')calls.push([kind,'mount-mode',options.mode]);const instance={pose:d=>calls.push([kind,'pose',d.workout.mode]),invalidate:()=>calls.push([kind,'invalidate']),stop:()=>calls.push([kind,'stop'])};mounted[kind].push(instance);return instance;}});
 const loaders={hold:()=>{holdLoads.push(true);return holdLoads.length===1?firstImport:Promise.resolve(moduleFor('hold'));},power:()=>Promise.resolve(moduleFor('power'))};
 const runtime=mountWorkoutEffects({host:{},loaders});
 const make=(active,mode='mountain')=>({points:[],now:1,validHold:active,workout:{sessionId:'same-set',mode,kind:'hold',active}});
 runtime.pose(make(true));runtime.pose(make(false));
 releaseFirst(moduleFor('hold'));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(mounted.hold.length,0);assert.equal(mounted.power.length,0);
 runtime.pose(make(true));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(mounted.hold.length,1);assert.equal(mounted.power.length,1);
 assert.ok(calls.some(call=>call[0]==='hold'&&call[1]==='mount-mode'&&call[2]==='mountain'));
 assert.ok(calls.some(call=>call[0]==='hold'&&call[1]==='pose'&&call[2]==='mountain'));
 assert.ok(calls.some(call=>call[0]==='power'&&call[1]==='pose'&&call[2]==='mountain'));
 runtime.pose(make(true,'tree'));await new Promise(resolve=>setImmediate(resolve));
 assert.ok(calls.some(call=>call[0]==='hold'&&call[1]==='stop'));assert.equal(mounted.hold.length,2);assert.equal(mounted.power.length,1);
 assert.ok(calls.some(call=>call[0]==='power'&&call[1]==='stop'));
 runtime.stop();assert.ok(calls.filter(call=>call[1]==='stop').length>=2);
});

test('a rejected optional import can retry on the next valid pose',async()=>{
 let holdLoads=0,powerLoads=0,now=0;const mounted=[];
 const loaders={
  hold:async()=>{if(++holdLoads===1)throw Error('temporary hold fetch failure');return {mountCameraHold:()=>{const instance={pose:()=>{},invalidate:()=>{},stop:()=>{}};mounted.push('hold');return instance;}};},
  power:async()=>{if(++powerLoads===1)throw Error('temporary power fetch failure');return {mountCameraPower:()=>{const instance={pose:()=>{},invalidate:()=>{},stop:()=>{}};mounted.push('power');return instance;}};}
 };
 const runtime=mountWorkoutEffects({host:{},loaders,retryOptions:{now:()=>now,baseDelay:10,maxDelay:20,cooldown:100}}),detail={points:[],now:1,validHold:true,workout:{sessionId:'retry',mode:'mountain',kind:'hold',active:true}};
 runtime.pose(detail);await new Promise(resolve=>setImmediate(resolve));
 runtime.pose(detail);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(holdLoads,1,'repeated poses do not immediately retry a failed hold import');assert.equal(powerLoads,1,'repeated poses do not immediately retry a failed power import');
 now=10;runtime.pose(detail);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(holdLoads,2);assert.equal(powerLoads,2);assert.deepEqual(mounted.sort(),['hold','power']);runtime.stop();
});

test('exercise metadata changes pending hold style and the old import cannot mount',async()=>{
 let resolveLiving;const styles=[],mounted=[];
 const loaders={hold:style=>{styles.push(style);return style==='living'?new Promise(resolve=>{resolveLiving=resolve;}):Promise.resolve({mountCameraHold:options=>{mounted.push(options.style);return {pose:()=>{},invalidate:()=>{},stop:()=>{}};}});},power:()=>Promise.resolve({mountCameraPower:()=>({pose:()=>{},invalidate:()=>{},stop:()=>{}})})};
 const runtime=mountWorkoutEffects({host:{},loaders}),detail={points:[],now:1,validHold:true,workout:{sessionId:'style-set',mode:'mountain',kind:'hold',active:true}};
 runtime.pose(detail);runtime.pose({...detail,now:2,workout:{...detail.workout,mode:'tree'}});
 resolveLiving({mountCameraHold:options=>{mounted.push(options.style);return {pose:()=>{},invalidate:()=>{},stop:()=>{}};}});await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(styles,['living','blizzard']);assert.deepEqual(mounted,['blizzard']);runtime.stop();
});

test('switching a living hold to balance remounts Blizzard without camera fire',async()=>{
 const calls=[],mounted={hold:[],power:[]};
 const moduleFor=kind=>({[kind==='hold'?'mountCameraHold':'mountCameraPower'](options){const instance={style:options.style,pose:()=>{},invalidate:()=>{},stop:()=>calls.push([kind,'stop',options.style])};mounted[kind].push(instance);return instance;}});
 const runtime=mountWorkoutEffects({host:{},loaders:{hold:style=>Promise.resolve(moduleFor('hold')),power:()=>Promise.resolve(moduleFor('power'))}});
 const detail={points:[],now:1,validHold:true,workout:{sessionId:'live-style',mode:'mountain',kind:'hold',active:true}};
 runtime.pose(detail);await new Promise(resolve=>setImmediate(resolve));assert.equal(mounted.hold.length,1);assert.equal(mounted.power.length,1);
 runtime.pose({...detail,now:2,workout:{...detail.workout,mode:'tree'}});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(mounted.hold.length,2);assert.equal(mounted.power.length,1);assert.equal(mounted.hold[1].style,'blizzard');
 assert.ok(calls.some(call=>call[0]==='hold'&&call[1]==='stop'));runtime.stop();assert.ok(calls.some(call=>call[0]==='power'&&call[1]==='stop'));
});

test('offline inventory keeps generated entry bundles and skips raw bundled entry sources',async()=>{
 const {offlineInventory}=await import('../scripts/offline-assets.mjs');
 const {core}=await offlineInventory('.'),urls=new Set(core.map(asset=>asset.url));
 for(const url of ['/app-runtime.mjs','/launch-runtime.mjs'])assert.ok(urls.has(url),`${url} remains available offline`);
 for(const url of ['/app.mjs','/launch.mjs'])assert.equal(urls.has(url),false,`${url} source is published without duplicating the offline runtime bundle`);
});

test('app wiring snapshots post-consume owner data and keeps retained modules optional',async()=>{
 const source=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/holdEffectStyle|HOLD_STYLE_KEY/,'hold style follows exercise metadata with no manual preference');
 assert.match(source,/ownerId:effectActive\?\.performanceOwner\?\?null/);
 assert.ok(source.indexOf('const pendingConsume=pod.consume')<source.indexOf('const effectDetail=workoutEffectsSnapshot'), 'effect state is captured after synchronous performance consumption');
 assert.match(source,/createOptionalModuleLoader\('\/arcade\/power\/retained-power\.mjs'\)/,'retained storage remains optional and lazy with a retryable absolute entry');
 assert.match(source,/createOptionalModuleLoader\('\/arcade\/quest-progress-reporter\.mjs'\)/,'offline quest maxima use the retryable optional owner-scoped queue');
 assert.match(source,/createOptionalModuleLoader\('\/arcade\/workout-effects\.mjs'\)/,'workout effects use a retryable optional entry module');
 assert.match(source,/questReporterLoading\|\|!questReporterRetry\.canStart\(\)/,'repeated progress poses respect the quest import backoff');
 assert.match(source,/workoutEffectsLoading\|\|!workoutEffectsRetry\.canStart\(\)/,'repeated camera poses respect the workout-effects import backoff');
 assert.match(source,/mountHomeCharacter\(\);\s*ensureRetainedPower\(\);/,'retained store boots without requiring a companion card');
 assert.match(source,/myr5:retained-character-power-request/,'home presentation can request a cached store snapshot after mounting');
 assert.match(source,/myr5:retained-character-power/,'cached and updated retained records are published to home presentation');
 const ensureStart=source.indexOf('function ensureRetainedPower('),ensureEnd=source.indexOf('\nfunction syncRetainedPowerOwner',ensureStart);
 assert.doesNotMatch(source.slice(ensureStart,ensureEnd),/if\(!card\)return/,'retained store initializes even when the home card is absent');
 assert.match(source,/ownerId:retainedOwner\?\?performanceOwner\(\).*record:retainedPower\?\.read\(\)/,'retained records carry their owner and empty state during initialization');
 assert.match(source,/ownerId:pod\?\.flow\?\.active\?\.performanceOwner\?\?null/,'Fruit Ninja captures its workout owner before combo callbacks');
 const build=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8');assert.match(build,/\.\.\/modules\/vault\/quest-progress\.mjs/,'Vault bridge stays external to the core bundle');assert.match(build,/modules\/vault\/quest-progress\.mjs/,'quest bridge is published in the lazy Vault bundle');assert.match(build,/\.\/arcade\/power\/power\.mjs/,'shared camera power module stays a same-origin module');assert.match(build,/\.\/arcade\/hold\/blizzard\.mjs/,'Blizzard renderer stays a same-origin module');
});

test('hold style mapping follows yoga, stances, core and balance exercise metadata',()=>{
 assert.equal(holdStyleForExercise({kind:'hold',group:'yoga'}),'living');
 assert.equal(holdStyleForExercise({kind:'hold',group:'stances'}),null);
 assert.equal(holdStyleForExercise({kind:'hold',group:'core'}),'blizzard');
 assert.equal(holdStyleForExercise({kind:'hold',group:'balance'}),'blizzard');
 assert.equal(holdStyleForExercise({kind:'hold',group:'other'}),'living');
 assert.equal(holdStyleForExercise({kind:'reps',group:'core'}),null);
});

test('late retained-store initialization keeps an inactive final rep and ignores later paused or preparation snapshots',()=>{
 const detail=(workingReps,stage='working',paused=false)=>({now:99,workout:{sessionId:'final-rep',ownerId:'guest:stable',mode:'squat',kind:'reps',stage,paused,workingReps,active:false}});
 let buffered=null;
 buffered=latestRetainableWorkoutSnapshot(buffered,detail(30),'guest:stable');
 const final=buffered;
 buffered=latestRetainableWorkoutSnapshot(buffered,detail(30,'working',true),'guest:stable');
 buffered=latestRetainableWorkoutSnapshot(buffered,detail(0,'preparation-rest'),'guest:stable');
 assert.equal(buffered,final,'release or later nonworking snapshots do not erase the final authoritative snapshot');
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const retained=createRetainedPower({storage,ownerId:'guest:stable'});
 assert.equal(retained.observe(buffered),true);assert.equal(retained.read().styles.aura.units,30);
});

test('optional retained-power failure retries on later activity and then saves and mounts',async()=>{
 let now=0,loads=0,saved=false,mounted=false;const retry=createOptionalRetry({now:()=>now,maxAttempts:3,baseDelay:100,maxDelay:800});
 const activity=async()=>{if(!retry.canStart())return false;retry.start();try{if(++loads===1)throw Error('optional module fetch failed');saved=true;mounted=true;retry.succeed();return true;}catch{retry.fail();return false;}};
 assert.equal(await activity(),false);assert.equal(await activity(),false,'a repeated pose cannot hammer a failed import before backoff');assert.equal(loads,1);
 now=100;assert.equal(await activity(),true);assert.equal(loads,2);assert.equal(saved,true);assert.equal(mounted,true);
 const source=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 assert.match(source,/detail\.workout\.ownerId===performanceOwner\(\)\)ensureRetainedPower\(\)/,'later owner-matching workout activity retries the optional attachment');
 assert.match(source,/avatarPowerFailedCard===card/,'avatar failure state is tied to the card that failed');
});

test('optional retries cool down after the bounded burst and become eligible again',()=>{
 let now=0;const retry=createOptionalRetry({now:()=>now,maxAttempts:2,baseDelay:10,maxDelay:20,cooldown:100});
 for(let i=0;i<2;i++){assert.equal(retry.canStart(),true);retry.start();retry.fail();if(i===0)now=10;}
 assert.equal(retry.canStart(),false);now=109;assert.equal(retry.canStart(),false);now=110;assert.equal(retry.canStart(),true);assert.equal(retry.attempts,0);
});

test('optional module loader cache-busts only after failure, deduplicates in-flight loads, and caches success',async()=>{
 const urls=[];let finish;
 const loader=createOptionalModuleLoader('https://myr5.test/arcade/optional.mjs',{importer:url=>{urls.push(url);if(urls.length<3)return Promise.reject(new Error('offline'));return new Promise(resolve=>finish=resolve);}});
 await assert.rejects(loader(),/offline/);await assert.rejects(loader(),/offline/);
 const pending=loader();assert.equal(loader(),pending,'concurrent callers share the in-flight promise');
 await new Promise(resolve=>setImmediate(resolve));const loaded={ready:true};finish(loaded);assert.equal(await pending,loaded);
 assert.equal(await loader(),loaded,'a successful optional module is cached');
 assert.equal(urls.length,3,'success cache prevents another import');
 assert.equal(new URL(urls[0]).search,'','the canonical URL is used on the first attempt');
 const nonce1=new URL(urls[1]).searchParams.get('myr5_retry'),nonce2=new URL(urls[2]).searchParams.get('myr5_retry');
 assert.ok(nonce1&&nonce2&&nonce1!==nonce2,'each rejected retry receives a fresh shared document nonce');
});
