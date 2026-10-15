import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {avatarPowerState} from '../arcade/power/avatar-power.mjs';
import {renderPower as renderPowerNative} from '../arcade/power/power.mjs';
const source=(await readFile(new URL('../pod/home-character.mjs',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace('export function','function');
const performerSource=await readFile(new URL('../pod/gala-performer.js',import.meta.url),'utf8');
const phone=()=>({state:{x:80,y:0,angle:0,phase:'idle',pose:'idle',active:false,shipProgress:0},sample(){},step(){},resize(){},setRestCenter(){},reset(){}});
const sensor=callback=>{sensor.last=callback;return()=>{};};
test('Gala stays through exercise changes and returns after stop, camera failure and rest',()=>{
 const listeners=new Map(),observers=[];
 const canvas={style:{},setAttribute(){}},button={setAttribute(){},addEventListener(){}},label={};
 const host={hidden:true,clientWidth:320,clientHeight:220,append(){},querySelector:s=>s==='canvas'?canvas:s==='button'?button:label},hud={hidden:false};
 const body={dataset:{screen:'pod',tracking:'false'}};
 const document={body,hidden:false,createElement:()=>({className:'',setAttribute(){}}),getElementById:id=>id==='homeCharacter'?host:hud,querySelector:()=>null,addEventListener(){}};
 const window={addEventListener:(key,fn)=>listeners.set(key,fn),GalaWeapons:{unlocked:()=>true,name:()=>''},GalaAvatar:{},GalaPerformance:{create:()=>({paint(){}})}};
 vm.runInNewContext(source+';mountHomeCharacter();',{window,document,createCharacterPhysics:phone,subscribePhoneMotion:sensor,matchMedia:()=>({matches:false,addEventListener(){}}),loadGala:()=>({look:{weapon:{type:'rapier'}}}),performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},drawAnimatedWeapon(){},abilityFor(){},evolution(){},GALA_KEY:'avatar',MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}disconnect(){}},IntersectionObserver:class{observe(){}disconnect(){}}});
 const sync=()=>observers.forEach(fn=>fn());
 assert.equal(host.hidden,false);assert.equal(hud.hidden,true);
 for(let i=0;i<5;i++){listeners.get('myr5:exercise-selected')?.();sync();assert.equal(host.hidden,false);}
 for(const state of ['true','false','true','false']){body.dataset.tracking=state;sync();assert.equal(host.hidden,state==='true');assert.equal(hud.hidden,state!=='true');}
 body.dataset.screen='rest';sync();assert.equal(host.hidden,true);
 body.dataset.screen='pod';sync();assert.equal(host.hidden,false);assert.equal(hud.hidden,true);
});
test('R26: the pod window draws the War Room coach sprites and redraws after a coach or War Room change',async()=>{
 const listeners=new Map(),created=[];let loads=0;
 const coaches={draw:(avatarDraw,canvas)=>{canvas.drawnBy='coach';},hasPet:true};
 const canvas={style:{},setAttribute(){}},button={setAttribute(){},addEventListener(){}},label={};
 const host={hidden:true,clientWidth:320,clientHeight:220,append(){},querySelector:s=>s==='canvas'?canvas:s==='button'?button:label};
 const document={body:{dataset:{screen:'pod',tracking:'false'}},hidden:false,createElement:()=>({className:'',setAttribute(){}}),getElementById:id=>id==='homeCharacter'?host:{},querySelector:()=>null,addEventListener(){}};
 const window={addEventListener:(key,fn)=>listeners.set(key,fn),GalaWeapons:{unlocked:()=>true,name:()=>''},GalaAvatar:{draw(){}},GalaPerformance:{create:(look,options={})=>{created.push(options);return {paint(){}};}}};
 const stub=source.replace('import(COACH_SPRITES)','Promise.resolve({loadWarRoomCoaches:async()=>{bump();return stubCoaches;}})');
 vm.runInNewContext(stub+';mountHomeCharacter();',{bump:()=>loads++,stubCoaches:coaches,window,document,createCharacterPhysics:phone,subscribePhoneMotion:sensor,matchMedia:()=>({matches:false,addEventListener(){}}),loadGala:()=>({look:{weapon:{type:'rapier'}}}),performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},drawAnimatedWeapon(){},abilityFor(){},evolution(){},GALA_KEY:'avatar',MutationObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{observe(){}disconnect(){}}});
 await new Promise(r=>setTimeout(r));
 assert.equal(loads,1);
 const last=()=>created.at(-1);
 assert.equal(typeof last().draw,'function','the pod uses the coach sprite drawer once it loads');
 const c={};last().draw(c,{},{});assert.equal(c.drawnBy,'coach');assert.equal(last().hasPet,true);
 for(const fire of [()=>listeners.get('myr5:recipe')(),()=>listeners.get('storage')({key:'myr5-recipe-v1'}),()=>listeners.get('storage')({key:'myr5-war-room-coaches-v2/guest%3Aa'}),()=>listeners.get('pageshow')({persisted:true})]){
  const before=created.length;fire();assert.equal(created.length,before+1,'each coach change repaints the pod window');
 }
});
test('phone pose is wired to the pixel performer and follows late pod layout sizing',()=>{
 let frameCallback,physicsOptions,painted,platform,layoutCallback;const observed=[],resizes=[],restCenters=[],state={x:14,y:-8,angle:1.2,phase:'fall',pose:'fall',active:true,shipProgress:0};
 const canvas={style:{},dataset:{},clientWidth:120,clientHeight:240,setAttribute(){}};
 const button={setAttribute(){},addEventListener(){}};
 const host={hidden:true,dataset:{},clientWidth:320,clientHeight:220,append:value=>{platform=value;},querySelector:s=>s==='canvas'?canvas:s==='button'?button:{textContent:''}};
 const listeners=new Map(),body={dataset:{screen:'pod',tracking:'false'}};
 const document={body,hidden:false,createElement:()=>({style:{},dataset:{},className:'',setAttribute(){}}),getElementById:id=>id==='homeCharacter'?host:{},querySelector:()=>null,addEventListener(){}};
 const window={addEventListener:(key,fn)=>listeners.set(key,fn),GalaWeapons:{unlocked:()=>true,name:()=>''},GalaAvatar:{},GalaPerformance:{create:()=>({paint:(c,t,r,m)=>{painted=m;}})}};
 const sourceWithMocks=source.replace('import(COACH_SPRITES)','Promise.resolve({loadWarRoomCoaches:async()=>{throw Error("offline");}})');
 vm.runInNewContext(sourceWithMocks+';mountHomeCharacter();',{window,document,createCharacterPhysics:options=>{physicsOptions=options;return {state,sample(){},step(){},resize(...args){resizes.push(args);},setRestCenter(...args){restCenters.push(args);},reset(){}};},subscribePhoneMotion:callback=>{sensor.callback=callback;return()=>{};},matchMedia:()=>({matches:false,addEventListener(){}}),loadGala:()=>({look:{weapon:{type:'rapier'}}}),performance:{now:()=>0},requestAnimationFrame:callback=>{frameCallback=callback;return 1;},cancelAnimationFrame(){},drawAnimatedWeapon(){},abilityFor(){},evolution(){},GALA_KEY:'avatar',MutationObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{observe(){}disconnect(){}},ResizeObserver:class{constructor(callback){layoutCallback=callback;}observe(value){observed.push(value);}disconnect(){}}});
 assert.equal(physicsOptions.ship,false,'the customizer physics must not board the ship');
 assert.equal(physicsOptions.climb,false);assert.equal(physicsOptions.contain,true);
 assert.equal(platform.className,'home-character-platform');
 assert.ok(observed.includes(host)&&observed.includes(canvas),'hidden-to-visible host and rendered canvas sizes are observed');
 host.clientWidth=400;host.clientHeight=350;canvas.clientWidth=150;canvas.clientHeight=180;layoutCallback();
 assert.deepEqual(resizes.at(-1),[400,350,150,180]);
 assert.deepEqual(restCenters.at(-1),[200,350-parseFloat(canvas.style.bottom)-90]);
 sensor.callback({gx:1,gy:0,shake:0,angularSpeed:0,timeSeconds:1});
 frameCallback(40);
 assert.equal(painted.pose,'fall');assert.equal(host.dataset.phonePhase,'fall');
 assert.match(canvas.style.transform,/translate\(calc\(-50% \+ 14px\),-8px\) rotate\(-1.2rad\)/,'the falling feet point toward gravity');
});
test('active phone phases hold the Gala playlist and animate a coach-sprite arm wave',()=>{
 const drawCalls=[],drawnPoses=[],contexts=[];
 const context={clearRect(){},save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(...args){drawCalls.push(args);},fillRect(){},beginPath(){},ellipse(){},fill(){}};
 const makeCanvas=()=>{const value={width:0,height:0,dataset:{},getContext:()=>context};contexts.push(value);return value;};
 const window={GalaAvatar:{draw(){}},GalaWeapons:{unlocked:()=>false},performance:{now:()=>0}};
 vm.runInNewContext(performerSource,{window,document:{createElement:makeCanvas}});
 const draw=(canvas,look,options)=>{drawnPoses.push(options);canvas.width=64;canvas.height=96;};
 const performer=window.GalaPerformance.create({parts:{}},{draw,hasCoachBody:true});
 const canvas=makeCanvas();performer.paint(canvas,50000,false,{phase:'wave',pose:'greet',active:true});
 assert.equal(canvas.dataset.scene,'idle','physics movement freezes the usual face/walk playlist');
 assert.ok(drawnPoses.some(options=>typeof options.pose?.greet==='number'),'the avatar draw hook receives a real wave pose');
 const limbCalls=drawCalls.filter(args=>args.length===9&&args[1]===48);
 assert.equal(limbCalls.length,1,'the selected coach sprite waves its outer arm pixels');
 assert.ok(limbCalls.every(args=>args[1]>=48),'waving does not cut pixels from the face and torso columns');
 performer.paint(canvas,51000,false,{phase:'look-down',pose:'look-down',active:true});
 assert.ok(drawnPoses.some(options=>options.blink===true),'look-down closes the face before the fall');
});
test('reduced motion resets phone physics and the resting transform',()=>{
 let changePreference,resetCount=0;const canvas={style:{},dataset:{},setAttribute(){}},button={setAttribute(){},addEventListener(){}},body={dataset:{screen:'pod',tracking:'false'}};
 const host={hidden:true,dataset:{},clientWidth:300,clientHeight:210,append(){},querySelector:s=>s==='canvas'?canvas:s==='button'?button:{textContent:''}};
 const reduced={matches:false,addEventListener:(name,fn)=>{changePreference=fn;},removeEventListener(){}};
 const document={body,hidden:false,createElement:()=>({style:{},className:'',setAttribute(){}}),getElementById:id=>id==='homeCharacter'?host:{},querySelector:()=>null,addEventListener(){}};
 const window={addEventListener(){},GalaWeapons:{unlocked:()=>true,name:()=>''},GalaAvatar:{},GalaPerformance:{create:()=>({paint(){}})}};
 vm.runInNewContext(source+';mountHomeCharacter();',{window,document,createCharacterPhysics:()=>({state:{x:20,y:30,angle:1,phase:'fall',pose:'fall',active:true,shipProgress:0},sample(){},step(){},resize(){},setRestCenter(){},reset(){resetCount++;Object.assign(this.state,{x:0,y:0,angle:0,phase:'idle',pose:'idle',active:false});}}),subscribePhoneMotion:()=>()=>{},matchMedia:()=>reduced,loadGala:()=>({look:{weapon:{type:'rapier'}}}),performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},drawAnimatedWeapon(){},abilityFor(){},evolution(){},GALA_KEY:'avatar',MutationObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{observe(){}disconnect(){}}});
 reduced.matches=true;changePreference();
 assert.equal(resetCount,1);assert.equal(canvas.style.transform,'translateX(-50%)');assert.equal(host.dataset.phonePhase,'idle');
});

test('retained floor power follows the real Gala performer walking offset, flip and gait',async()=>{
 const draws=[],powerTransforms=[],states=[];let frameCallback,overlay,now=0;
 const makeContext=canvas=>({globalAlpha:1,imageSmoothingEnabled:false,clearRect(){},setTransform(){},save(){},restore(){},translate(x,y){if(canvas.className==='myr5-home-power-overlay')powerTransforms.push(['translate',x,y]);},scale(x,y){if(canvas.className==='myr5-home-power-overlay')powerTransforms.push(['scale',x,y]);},rotate(){},drawImage(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},ellipse(){},fill(){}});
 const makeCanvas=()=>{const value={width:0,height:0,style:{},dataset:{},setAttribute(){},remove(){},getContext(){return this.context||=(makeContext(this));}};return value;};
 const bodyCanvas=makeCanvas();bodyCanvas.clientWidth=120;bodyCanvas.clientHeight=240;bodyCanvas.style.transform='translateX(-50%)';
 const button={setAttribute(){},addEventListener(){},appendChild(node){overlay=node;}};
 const host={hidden:true,dataset:{},clientWidth:320,clientHeight:220,append(){},querySelector:s=>s==='canvas'?bodyCanvas:s==='button'?button:{textContent:''}};
 const document={body:{dataset:{screen:'pod',tracking:'false'}},hidden:false,createElement:tag=>tag==='canvas'?makeCanvas():{style:{},className:'',setAttribute(){}},getElementById:id=>id==='homeCharacter'?host:{},querySelector:()=>null,addEventListener(){},removeEventListener(){}};
 const listeners=new Map(),reduced={matches:false,addEventListener(){},removeEventListener(){}};
 const window={devicePixelRatio:1,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener(){},dispatchEvent(){},GalaWeapons:{types:[{id:'rapier',name:'Rapier'}],tiers:['I'],unlocked:()=>true,name:()=> 'Rapier',draw(){}},GalaAvatar:{draw(canvas){canvas.width=64;canvas.height=96;} }};
 const schedule={step(_dt,visible){return visible?1:0;},reset(){},dispose(){}};
 const powerModules={avatar:{avatarPowerState:(...args)=>{const state=avatarPowerState(...args);states.push(state);return state;},createAvatarPowerSchedule:()=>schedule},power:{renderPower(){}},blizzard:{renderBlizzard(){}}};
 const sourceWithMocks=source.replace("import('../arcade/power/avatar-power.mjs')",'Promise.resolve(powerModules.avatar)').replace("import('../arcade/power/power.mjs')",'Promise.resolve(powerModules.power)').replace("import('../arcade/hold/blizzard.mjs')",'Promise.resolve(powerModules.blizzard)');
 const sandbox={window:{...window,performance:{now:()=>now}},document,powerModules,CustomEvent:class{constructor(type){this.type=type;}},createCharacterPhysics:()=>({state:{x:0,y:0,angle:0,phase:'idle',pose:'idle',active:false,shipProgress:0},sample(){},step(){},resize(){},setRestCenter(){},reset(){}}),subscribePhoneMotion:()=>()=>{},matchMedia:()=>reduced,loadGala:()=>({look:{parts:{},weapon:{type:'rapier'}}}),performance:{now:()=>now},requestAnimationFrame:callback=>{frameCallback=callback;return 1;},cancelAnimationFrame(){},drawAnimatedWeapon(){},abilityFor(){return null;},evolution(){return{};},GALA_KEY:'avatar',MutationObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{observe(){}disconnect(){}}};
 vm.runInNewContext(performerSource,sandbox);vm.runInNewContext(sourceWithMocks+';mountHomeCharacter();',sandbox);
 listeners.get('myr5:retained-character-power')({detail:{ownerId:'guest:walk',record:{version:1,equipped:'floor',styles:{floor:{intensity:.7,tier:4,units:21,maxUnits:30,kind:'reps'}}}}});
 await new Promise(resolve=>setTimeout(resolve,0));now=22000;const callback=frameCallback;frameCallback=null;callback(now);
 const expectedOffset=170*(t=>t*t*(3-2*t))(1/2.6);
 assert.ok(powerTransforms.some(([kind,x,y])=>kind==='translate'&&Math.abs(x-expectedOffset)<1e-6&&y===0),'power rendering uses the real performer walk-scene offset');
 assert.ok(powerTransforms.some(([kind,x,y])=>kind==='translate'&&x===160&&y===0),'power rendering mirrors during the performer walk flip');
 assert.ok(powerTransforms.some(([kind,x,y])=>kind==='scale'&&x===-1&&y===1),'the effect uses the performer flip transform');
 const gait=2*Math.sin(2*Math.PI*1.15);
 assert.ok(Math.abs(states.at(-1).contacts[0].y-(168*.835+gait))<1e-6,'left floor anchor follows the actual walking gait');
 assert.ok(Math.abs(states.at(-1).contacts[1].y-(168*.835-gait))<1e-6,'right floor anchor follows the opposite walking gait');
});

test('retained power follows the native Gala canvas for default and coach-sprite feet',async t=>{
 const priorDocument=Object.getOwnPropertyDescriptor(globalThis,'document');let nativeDraws=0;const layerContext={clearRect(){},save(){},restore(){},translate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){nativeDraws++;},drawImage(){nativeDraws++;}};
 Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>layerContext})}});
 t.after(()=>priorDocument?Object.defineProperty(globalThis,'document',priorDocument):delete globalThis.document);
 for(const coachVariant of [false,true]){
  const listeners=new Map(),docListeners=new Map(),requests=[],rendered=[];let frameCallback,overlay,frameId=0,changePreference,stepCount=0;
  const bodyCanvas={style:{transform:'translateX(-50%)'},dataset:{},clientWidth:120,clientHeight:240,setAttribute(){}};
  const context={clearRect(){},setTransform(){},translate(){},scale(){},drawImage(){nativeDraws++;},save(){},restore(){}};
  const button={setAttribute(){},addEventListener(){},appendChild(node){overlay=node;}};
  const host={hidden:true,dataset:{},clientWidth:320,clientHeight:220,append(){},querySelector:s=>s==='canvas'?bodyCanvas:s==='button'?button:{textContent:''}};
  const reduced={matches:false,addEventListener(_name,fn){changePreference=fn;},removeEventListener(){}};
  const document={body:{dataset:{screen:'pod',tracking:'false'}},hidden:false,createElement:tag=>tag==='canvas'?{style:{},width:0,height:0,setAttribute(){},getContext(){context.canvas=this;return context;},remove(){this.removed=true;}}:{style:{},setAttribute(){}},getElementById:id=>id==='homeCharacter'?host:{},querySelector:()=>null,addEventListener:(key,fn)=>docListeners.set(key,fn),removeEventListener(){}};
  const window={devicePixelRatio:1,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener(){},dispatchEvent:event=>{requests.push(event);},GalaWeapons:{unlocked:()=>true,name:()=>''},GalaAvatar:{},GalaPerformance:{create:()=>({paint(){}})}};
  const schedule={step(_dt,visible){return visible?1:0;},reset(){},dispose(){}};
  const avatarPowerForTest={avatarPowerState,createAvatarPowerSchedule:()=>schedule};
  const sourceWithMocks=source
   .replace('import(COACH_SPRITES)',`Promise.resolve({loadWarRoomCoaches:async()=>${coachVariant?'stubCoaches':'null'}})`)
   .replace("import('../arcade/power/avatar-power.mjs')",'Promise.resolve(avatarPowerForTest)')
   .replace("import('../arcade/power/power.mjs')",'Promise.resolve({renderPower:(ctx,state)=>{rendered.push(state);renderPowerNative(ctx,state);}})')
   .replace("import('../arcade/hold/blizzard.mjs')",'Promise.resolve({renderBlizzard(){}})');
  const coaches={draw(){},hasBody:true,hasPet:false};
  const state={x:80,y:0,angle:0,phase:'idle',pose:'walk',active:true,shipProgress:0},makePhone=()=>({state,sample(){},step(){stepCount++;},resize(){},setRestCenter(){},reset(){Object.assign(state,{x:0,y:0,angle:0,phase:'idle',pose:'idle',active:false});}});
  vm.runInNewContext(sourceWithMocks+';mountHomeCharacter();',{stubCoaches:coaches,avatarPowerForTest,rendered,renderPowerNative,window,document,CustomEvent:class{constructor(type){this.type=type;}},createCharacterPhysics:makePhone,subscribePhoneMotion:sensor,matchMedia:()=>reduced,loadGala:()=>({look:{weapon:{type:'rapier'}}}),performance:{now:()=>0},requestAnimationFrame:callback=>{frameCallback=callback;return ++frameId;},cancelAnimationFrame(){},drawAnimatedWeapon(){},abilityFor(){},evolution(){},GALA_KEY:'avatar',MutationObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{observe(){}disconnect(){}}});
  const request=requests.find(event=>event.type==='myr5:retained-character-power-request');assert.ok(request,'mount requests the retained record snapshot');
  listeners.get('myr5:retained-character-power')({detail:{ownerId:`guest:${coachVariant?'coach':'gala'}`,record:{version:1,equipped:'floor',styles:{floor:{intensity:.7,tier:4,units:21,maxUnits:30,kind:'reps'}}}}});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.ok(overlay,'the power layer is added after retained power arrives');
  const nextFrame=frameCallback;frameCallback=null;nextFrame(40);
  assert.equal(overlay.style.transform,bodyCanvas.style.transform,'the overlay inherits the active canvas walk/physics transform');
  assert.equal(overlay.style.bottom,bodyCanvas.style.bottom,'the overlay shares the native sprite feet baseline');
  assert.equal(overlay.style.pointerEvents,'none');
  assert.equal(rendered.length,1,'the overlay rendered a real floor-power state');
  const contacts=rendered[0].contacts,feet=coachVariant?.935:.835;
  assert.deepEqual(Array.from(contacts,point=>point.index),[27,28]);
  assert.equal(contacts[0].x,160*.46);assert.equal(contacts[1].x,160*.54);
  assert.equal(contacts[0].y,168*feet,coachVariant?'coach sprite feet use its native .935 fraction':'default Gala feet use its native .835 fraction');
  assert.ok(nativeDraws>0,'native Canvas2D floor rendering reached visible drawing operations');
  const stepsBeforeReduced=stepCount;reduced.matches=true;changePreference();const reducedFrame=frameCallback;frameCallback=null;reducedFrame(100);
  assert.equal(stepCount,stepsBeforeReduced,'reduced motion does not advance phone physics');assert.equal(rendered.length,2,'reduced motion paints a static retained effect');
  document.hidden=true;docListeners.get('visibilitychange')();assert.equal(overlay.style.display,'none','hidden documents clear the retained overlay');
  listeners.get('myr5:retained-character-power')({detail:{ownerId:`guest:cleared-${coachVariant}`,record:{version:1,equipped:null,styles:{}}}});
  assert.equal(overlay.style.display,'none','an owner change clears the old owner effect immediately');
  document.hidden=false;
  listeners.get('myr5:retained-character-power')({detail:{ownerId:`guest:equipped-again-${coachVariant}`,record:{version:1,equipped:'floor',styles:{floor:{intensity:.7,tier:4,units:21,maxUnits:30,kind:'reps'}}}}});
  const resumedFrame=frameCallback;frameCallback=null;assert.equal(typeof resumedFrame,'function','equipping power restarts the reduced-motion loop without a visibility event');
  resumedFrame(200);
  assert.equal(rendered.length,3,'the newly equipped power paints after the empty-owner reduced-motion loop stopped');
  assert.equal(stepCount,stepsBeforeReduced,'restarting the effect still does not advance phone physics');
 }
});

test('a renderer import from the previous owner cannot mount after an owner change',async()=>{
 const listeners=new Map();let resolveAvatar,overlay=null;const setAvatarResolver=resolve=>{resolveAvatar=resolve;};
 const canvas={style:{},dataset:{},clientWidth:120,clientHeight:240,setAttribute(){}},button={setAttribute(){},addEventListener(){},appendChild(node){overlay=node;}},host={hidden:true,dataset:{},clientWidth:320,clientHeight:220,append(){},querySelector:s=>s==='canvas'?canvas:s==='button'?button:{textContent:''}};
 const context={clearRect(){},setTransform(){}};
 const document={body:{dataset:{screen:'pod',tracking:'false'}},hidden:false,createElement:tag=>tag==='canvas'?{style:{},setAttribute(){},getContext(){return context;},remove(){}}:{style:{},setAttribute(){}},getElementById:id=>id==='homeCharacter'?host:{},querySelector:()=>null,addEventListener(){},removeEventListener(){}};
 const window={addEventListener:(key,fn)=>listeners.set(key,fn),dispatchEvent(){},GalaWeapons:{unlocked:()=>true,name:()=>''},GalaAvatar:{},GalaPerformance:{create:()=>({paint(){}})}};
 const sourceWithDeferredPower=source.replace('import(COACH_SPRITES)','Promise.resolve({loadWarRoomCoaches:async()=>null})')
  .replace("import('../arcade/power/avatar-power.mjs')",'new Promise(resolve=>{setAvatarResolver(resolve);})')
  .replace("import('../arcade/power/power.mjs')",'Promise.resolve({renderPower(){}})')
  .replace("import('../arcade/hold/blizzard.mjs')",'Promise.resolve({renderBlizzard(){}})');
 vm.runInNewContext(sourceWithDeferredPower+';mountHomeCharacter();',{setAvatarResolver,window,document,CustomEvent:class{constructor(type){this.type=type;}},createCharacterPhysics:phone,subscribePhoneMotion:sensor,matchMedia:()=>({matches:false,addEventListener(){}}),loadGala:()=>({look:{weapon:{type:'rapier'}}}),performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},drawAnimatedWeapon(){},abilityFor(){},evolution(){},GALA_KEY:'avatar',MutationObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{observe(){}disconnect(){}}});
 listeners.get('myr5:retained-character-power')({detail:{ownerId:'guest:old',record:{version:1,equipped:'floor',styles:{floor:{intensity:.6,tier:3,units:18,maxUnits:30,kind:'reps'}}}}});
 listeners.get('myr5:retained-character-power')({detail:{ownerId:'guest:new',record:{version:1,equipped:null,styles:{}}}});
 resolveAvatar?.({avatarPowerState,createAvatarPowerSchedule:()=>({step(){return 1;},reset(){},dispose(){}})});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(overlay,null,'stale optional imports never attach an overlay for the new empty owner');
});


