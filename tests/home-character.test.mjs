import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../pod/home-character.mjs',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace('export function','function');
test('Gala stays through exercise changes and returns after stop, camera failure and rest',()=>{
 const listeners=new Map(),observers=[];
 const canvas={setAttribute(){}},button={addEventListener(){}},label={};
 const host={hidden:true,querySelector:s=>s==='canvas'?canvas:s==='button'?button:label},hud={hidden:false};
 const body={dataset:{screen:'pod',tracking:'false'}};
 const document={body,hidden:false,getElementById:id=>id==='homeCharacter'?host:hud,querySelector:()=>null,addEventListener(){}};
 const window={addEventListener:(key,fn)=>listeners.set(key,fn),GalaWeapons:{unlocked:()=>true,name:()=>''},GalaAvatar:{},GalaPerformance:{create:()=>({paint(){}})}};
 vm.runInNewContext(source+';mountHomeCharacter();',{window,document,matchMedia:()=>({matches:false,addEventListener(){}}),loadGala:()=>({look:{weapon:{type:'rapier'}}}),performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},drawAnimatedWeapon(){},abilityFor(){},evolution(){},GALA_KEY:'avatar',MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}},IntersectionObserver:class{observe(){}}});
 const sync=()=>observers.forEach(fn=>fn());
 assert.equal(host.hidden,false);assert.equal(hud.hidden,true);
 for(let i=0;i<5;i++){listeners.get('myr5:exercise-selected')?.();sync();assert.equal(host.hidden,false);}
 for(const state of ['true','false','true','false']){body.dataset.tracking=state;sync();assert.equal(host.hidden,state==='true');assert.equal(hud.hidden,state!=='true');}
 body.dataset.screen='rest';sync();assert.equal(host.hidden,true);
 body.dataset.screen='pod';sync();assert.equal(host.hidden,false);assert.equal(hud.hidden,true);
});
