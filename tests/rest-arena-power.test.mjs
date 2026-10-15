import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {avatarPowerState} from '../arcade/power/avatar-power.mjs';

const source=(await readFile(new URL('../pod/rest-arena.mjs',import.meta.url),'utf8'))
 .replace(/^import .*;\r?\n/gm,'').replace(/export const/g,'const').replace(/export function/g,'function');
function makeHarness({defer=false}={}){
 const listeners=new Map(),docListeners=new Map(),requests=[],paints=[],steps=[],mainDraws=[],states=[];let now=0,frameCallback=null,resolveAvatar,resolvePower,resolveBlizzard,createdCanvases=0;
 const artContext={clearRect(){},setTransform(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},save(){},restore(){},globalAlpha:1};
 const mainContext={globalAlpha:1,clearRect(){},save(){this.savedAlpha=this.globalAlpha;},restore(){this.globalAlpha=this.savedAlpha;},translate(x,y){this.offset=[x,y];},rotate(){},drawImage(image){if(image===powerArt)mainDraws.push({alpha:this.globalAlpha,offset:this.offset});}};
 let powerArt;
 const fxContext={clearRect(){},save(){},restore(){},translate(){},rotate(){}};
 const canvas={width:0,height:0,getContext:()=>mainContext,getBoundingClientRect:()=>({left:0,top:0,width:160,height:168})};
 const scene={dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},getBoundingClientRect:()=>({left:0,top:0,width:320,height:300})};
 const elements={restAvatar:canvas,encounter:scene,restWeaponFx:{width:0,height:0,getContext:()=>fxContext},weaponType:{value:'rapier',append(){},addEventListener(){},removeEventListener(){}},weaponTier:{value:'0',append(){},replaceChildren(){},addEventListener(){},removeEventListener(){}},weaponStatus:{textContent:''},weaponLevelBar:{setAttribute(){}},restWeaponName:{textContent:''}};
 const document={hidden:false,createElement(tag){if(tag==='canvas'){const index=++createdCanvases,node={width:0,height:0,getContext:()=>{if(index===2)powerArt=node;return artContext;}};return node;}return{append(){},value:'',textContent:'',disabled:false};},getElementById:id=>elements[id],querySelector:()=>scene,addEventListener:(key,fn)=>docListeners.set(key,fn),removeEventListener(){}};
 const window={GalaAvatar:{defaultLook:{weapon:{type:'rapier'}},draw(){}},GalaWeapons:{types:[{id:'rapier',name:'Rapier'}],tiers:['I'],unlocked:()=>true,level:()=>({level:1,max:true})},addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener(){},dispatchEvent:event=>requests.push(event)};
 const schedule={step(dt,visible,reduced){steps.push({dt,visible,reduced});return visible?1:0;},reset(){},dispose(){}};
 const powerModules={avatar:{avatarPowerState:(...args)=>{const state=avatarPowerState(...args);states.push(state);return state;},createAvatarPowerSchedule:()=>schedule},power:{renderPower(ctx){ctx.globalAlpha=1;ctx.fillRect(1,1,1,1);paints.push('power');}},blizzard:{renderBlizzard(ctx){ctx.globalAlpha=1;ctx.fillRect(1,1,1,1);paints.push('blizzard');}}};
 const setResolver=(name,resolve)=>{if(name==='avatar')resolveAvatar=resolve;else if(name==='power')resolvePower=resolve;else resolveBlizzard=resolve;};
 const sourceWithImports=source
  .replace("import('../arcade/power/avatar-power.mjs')",defer?"new Promise(resolve=>setResolver('avatar',resolve))":'Promise.resolve(powerModules.avatar)')
  .replace("import('../arcade/power/power.mjs')",defer?"new Promise(resolve=>setResolver('power',resolve))":'Promise.resolve(powerModules.power)')
  .replace("import('../arcade/hold/blizzard.mjs')",defer?"new Promise(resolve=>setResolver('blizzard',resolve))":'Promise.resolve(powerModules.blizzard)');
 const reduced={matches:false};let reducedValue=reduced;
 const sandbox={window,document,CustomEvent:class{constructor(type){this.type=type;}},Event:class{},localStorage:{getItem:()=>null,setItem(){}},structuredClone:value=>JSON.parse(JSON.stringify(value)),matchMedia:()=>reducedValue,performance:{now:()=>now},requestAnimationFrame:callback=>{frameCallback=callback;return 1;},cancelAnimationFrame(){frameCallback=null;},ResizeObserver:class{observe(){}disconnect(){}},GALA_KEY:'avatar',loadGala:()=>({look:{weapon:{type:'rapier'}}}),abilityFor:()=>null,evolution:()=>({energy:'#fff',attackMs:1000}),drawAnimatedWeapon(){},powerModules,setResolver};
 vm.runInNewContext(sourceWithImports+';globalThis.arena=initRestArena();',sandbox);
 return {window,document,listeners,docListeners,requests,paints,steps,states,mainDraws,mainContext,get powerArt(){return powerArt;},get frameCallback(){return frameCallback;},tick(time){now=time;const callback=frameCallback;frameCallback=null;callback?.(time);},setTime(time){now=time;},setReduced(value){reduced.matches=value;},resolve(){resolveAvatar(powerModules.avatar);resolvePower(powerModules.power);resolveBlizzard(powerModules.blizzard);},arena:sandbox.arena};
}

test('rest retained power paints on the native canvas, follows body pulse, and resets on stop and hidden',async()=>{
 const h=makeHarness();h.arena.start();
 assert.ok(h.requests.some(event=>event.type==='myr5:retained-character-power-request'));
 h.listeners.get('myr5:retained-character-power')({detail:{ownerId:'guest:rest',record:{version:1,equipped:'floor',styles:{floor:{intensity:.7,tier:4,units:21,maxUnits:30,kind:'reps'}}}}});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(h.paints.length,1,'the retained floor style reaches its Canvas2D renderer');
 const stateArgs=h.steps.at(-1);assert.equal(stateArgs.visible,true);assert.deepEqual(Array.from(h.states.at(-1).contacts,point=>point.index),[27,28]);assert.ok(Math.abs(h.states.at(-1).contacts[0].x-73.6)<1e-9);assert.equal(h.states.at(-1).contacts[0].y,168*.835);
 // The effect is rendered on a local buffer; the final native-canvas composite owns opacity and motion.
 h.arena.attack({special:false});h.tick(500);
 const composite=h.mainDraws.at(-1);assert.equal(composite.alpha,.55);assert.deepEqual(Array.from(composite.offset),[-2,-4]);
 const beforeStop=h.mainDraws.length;h.arena.stop();assert.equal(h.mainDraws.length,beforeStop,'stop redraws only the body and removes the old effect');
 h.arena.start();const beforeHidden=h.mainDraws.length,beforeHiddenSteps=h.steps.length;h.document.hidden=true;h.docListeners.get('visibilitychange')();assert.equal(h.mainDraws.length,beforeHidden,'hidden state clears the native effect');
 assert.equal(h.steps.length,beforeHiddenSteps,'hidden redraws do not advance the retained-power schedule');
 h.arena.dispose();
});

test('rest retained power stays static under reduced motion and stale imports cannot revive an old owner',async()=>{
 const h=makeHarness({defer:true});h.arena.start();
 h.listeners.get('myr5:retained-character-power')({detail:{ownerId:'guest:old',record:{version:1,equipped:'floor',styles:{floor:{intensity:.6,tier:3,units:18,maxUnits:30,kind:'reps'}}}}});
 h.listeners.get('myr5:retained-character-power')({detail:{ownerId:'guest:new',record:{version:1,equipped:null,styles:{}}}});
 h.resolve();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.paints.length,0,'a late renderer import cannot revive the prior owner');
 h.arena.dispose();
 const active=makeHarness();active.arena.start();active.listeners.get('myr5:retained-character-power')({detail:{ownerId:'guest:reduced',record:{version:1,equipped:'floor',styles:{floor:{intensity:.6,tier:3,units:18,maxUnits:30,kind:'reps'}}}}});
 await new Promise(resolve=>setTimeout(resolve,0));active.setReduced(true);active.tick(200);assert.ok(active.steps.at(-1).reduced);assert.ok(active.mainDraws.at(-1).alpha===.55);active.arena.dispose();
});
