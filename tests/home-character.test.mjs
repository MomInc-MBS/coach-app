import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
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


