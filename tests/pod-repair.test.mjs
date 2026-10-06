import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const memory=new Map();
globalThis.localStorage??={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key),clear:()=>memory.clear()};
const {dailyGuideDue,markDailyGuide,guideOwner,localDay}=await import('../daily-guide.mjs');
const {TIER_COLORS,tierOf,rewardSummary,drawTierTile}=await import('../reward-pack-ui.mjs');
const {SETTINGS_LINKS,collapseOnOpen}=await import('../coach-hub.mjs');
const {idleStatus}=await import('../pod/pod.mjs');
const {continueVisible,continuePrompt}=await import('../pod/continue-workout.mjs');
const {setArmieLauncherOwned}=await import('../armie-inbox-ui.mjs');
const html=fs.readFileSync(new URL('../pose.html',import.meta.url),'utf8');
const store=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value))};};

test('How to Play is due once per local day, separately for each account and the guest',()=>{
 const storage=store(),morning=new Date(2026,8,25,7),night=new Date(2026,8,25,23,59),tomorrow=new Date(2026,8,26,0,1);
 assert.equal(localDay(morning),'2026-09-25');
 assert.equal(guideOwner(null),'guest');assert.equal(guideOwner({user:{id:'a1'}}),'account:a1');
 assert.equal(dailyGuideDue({owner:'guest',date:morning,storage}),true);
 assert.equal(markDailyGuide({owner:'guest',date:morning,storage}),true);
 assert.equal(dailyGuideDue({owner:'guest',date:night,storage}),false,'no repeat later the same day');
 assert.equal(dailyGuideDue({owner:'account:a1',date:night,storage}),true,'an account has its own day');
 assert.equal(dailyGuideDue({owner:'guest',date:tomorrow,storage}),true,'due again the next local day');
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.equal(dailyGuideDue({owner:'guest',date:morning,storage:broken}),false,'unreadable storage never nags');
});

test('the reward pack is a 64x64 tier tile in its tier colour and names the actual awarded item',()=>{
 assert.deepEqual({...TIER_COLORS},{uncommon:'#76e356',rare:'#4bafff',legendary:'#ff9c36'});
 assert.equal(tierOf('reward-pack:rare:strider-1:4'),'rare');assert.equal(tierOf('reward-pack:legendary:x'),'legendary');
 assert.equal(tierOf('daily:owner:2026-09-25'),'uncommon');assert.equal(tierOf('reward-pack:bogus:x'),'uncommon');
 for(const tier of Object.keys(TIER_COLORS)){
  const fills=[];const ctx={fillStyle:'',clearRect(){},fillRect(x,y,w,h){fills.push({color:this.fillStyle,x,y,w,h});}};
  drawTierTile(ctx,tier);
  assert(fills.some(f=>f.color===TIER_COLORS[tier]&&f.w===56&&f.h===56),`${tier} tile body is ${TIER_COLORS[tier]}`);
  assert(fills.every(f=>f.x>=0&&f.y>=0&&f.x+f.w<=64&&f.y+f.h<=64),'drawn inside the 64x64 tile');
 }
 const palette=rewardSummary({category:'color',reward:{kind:'palette',id:'pal-03',name:'Static Pop'}});
 assert.equal(palette.title,'Static Pop');assert.equal(palette.detail,'Colour palette');assert.deepEqual(palette.colors,['#FF3B30','#111111','#FFFFFF']);
 const fills=[];drawTierTile({clearRect(){},fillRect(){fills.push(this.fillStyle);}},'rare',{opened:true,colors:palette.colors});
 for(const color of palette.colors)assert(fills.includes(color),'the opened tile shows the palette it awarded');
 const skin=rewardSummary({category:'64-bit',reward:{kind:'boss-skin',id:'strider-1-skin',name:'Strider Skin'}});
 assert.equal(skin.title,'Strider Skin');assert.equal(skin.detail,'64-bit boss skin');assert.deepEqual(skin.colors,[]);
 const source=fs.readFileSync(new URL('../reward-pack-ui.mjs',import.meta.url),'utf8');
 assert(!/three|GLTFLoader|canister\.glb/.test(source),'no 3D dependency for the reward display');
});

test('Settings drops Portal, Achievements and Reminders and opens folded',()=>{
 assert.deepEqual(SETTINGS_LINKS.map(([label])=>label),['ACCOUNT','DEVICE + UPDATES','HOW TO PLAY']);
 const details=[{open:true},{open:true}];let shown=0;
 const dialog={scrollTop:120,showModal(){shown++;},querySelectorAll:()=>details};
 collapseOnOpen(dialog);dialog.showModal();
 assert.equal(shown,1);assert.equal(dialog.scrollTop,0);assert(details.every(d=>!d.open),'every section starts collapsed');
 const settings=html.slice(html.indexOf('<dialog id="settings"'),html.indexOf('</dialog>',html.indexOf('<dialog id="settings"')));
 for(const id of ['goal','restDuration','camera','coachPower','goalSlider','testVoice','manageMaterials','reset','visitRest'])
  assert.match(settings,new RegExp(`<details class="settings-group">(?:(?!</details>).)*id="${id}"`,'s'),`#${id} sits in a collapsible group`);
});

test('the idle pod has no Ready line or STOP; name and Customize coach are text header actions',()=>{
 assert.equal(idleStatus('Ready'),true);assert.equal(idleStatus(''),true);assert.equal(idleStatus('Allow camera access for this site, then tap Begin.'),false);
 assert.match(html,/<button id="stop" disabled hidden>STOP<\/button>/);assert.match(html,/<p id="status" role="status" hidden><\/p>/);
 const header=html.match(/<nav class="pod-header-actions"[^]*?<\/nav>/)?.[0]||'';
 assert.match(header,/id="openIdentity"[^]*>Anonymous guest</);assert.match(header,/href="\/creature\/index.html">Customize coach</);
 assert(!html.includes('pod-nameplate'),'no second copy on the viewing port');
 const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 assert.match(app,/\$\('stop'\)\.disabled=!busy;\$\('stop'\)\.hidden=!busy;/,'STOP shows only while a set is running');
});

test('Continue is offered on the pod only, idle, until dismissed for that workout',()=>{
 const row={id:'w1',mode:'squat'};
 assert.equal(continueVisible({shown:true,idle:true,row,dismissed:null}),true);
 assert.equal(continueVisible({shown:false,idle:true,row,dismissed:null}),false,'not on the quilt');
 assert.equal(continueVisible({shown:true,idle:false,row,dismissed:null}),false,'not mid-set');
 assert.equal(continueVisible({shown:true,idle:true,row,dismissed:'w1'}),false);
 assert.equal(continueVisible({shown:true,idle:true,row:{...row,id:'w2'},dismissed:'w1'}),true,'a newer workout asks again');
 assert.equal(continueVisible({shown:true,idle:true,row:null,dismissed:null}),false);
 const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 assert(!app.includes('dock-continue'),'the quilt dock chip is no longer driven');
});

test('a saved set on a locked path explains the lock and offers no impossible Continue action',()=>{
 const row={id:'unfinished-horse',mode:'high-horse',metadata:{control:'camera'}};
 const locked=continuePrompt(row,'High horse stance',{allowed:false,reason:'Martial arts is locked.'});
 assert.equal(locked.allowed,false);
 assert.match(locked.text,/Martial arts is locked/);
 assert.match(locked.text,/remains in history/);
 assert.equal(continuePrompt(row,'High horse stance',{allowed:true}).allowed,true);
});

test('the Armie launcher is hidden and inert until the player owns a letter',()=>{
 const launcher={hidden:false,inert:false,tabIndex:0,removeAttribute(name){if(name==='tabindex')this.tabIndex=0;}};
 setArmieLauncherOwned(launcher,false);assert.deepEqual([launcher.hidden,launcher.inert,launcher.tabIndex],[true,true,-1]);
 setArmieLauncherOwned(launcher,true);assert.deepEqual([launcher.hidden,launcher.inert,launcher.tabIndex],[false,false,0]);
 const source=fs.readFileSync(new URL('../armie-inbox-ui.mjs',import.meta.url),'utf8');
 assert(!/opacity:\.55/.test(source),'no greyed half-loaded state');
});
