import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
globalThis.myr5AuthenticatedAccount={user:{id:'coach-cosmetic-tests'}};
const bundled=await build({stdin:{contents:"export * from './creature/source/creator/materials-registry';export * from './creature/source/creator/unlock-store';export * from './creature/source/war-room-coaches';export * from './creature/source/save-look';export {fresh} from './creature/source/creator/design';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022'});
const mod=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const avatarContext={window:{}};vm.runInNewContext(await readFile(new URL('../pod/gala-avatar.js',import.meta.url),'utf8'),avatarContext);globalThis.GalaAvatar=avatarContext.window.GalaAvatar;
const {performanceOwner,readPerformanceProgress,PERFORMANCE_KEY,unlockedCoachIds}=await import('../performance-progress.mjs');
const {COACHES,EXCLUDED_COACH_IDS}=await import('../performance-catalog.mjs');

class Element{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={};}
 append(...nodes){this.children.push(...nodes);}setAttribute(k,v){this.attributes[k]=v;}
 cloneNode(){return new Element(this.tag);}
}
class Canvas extends Element{
 constructor(){super('canvas');this.width=64;this.height=96;const self=this;this.context={
  drawImage(source){self.mask=!!source.mask;self.pixels=source.pixels?.slice();},
  getImageData(){if(self.pixels)return {data:self.pixels.slice()};const data=new Uint8ClampedArray(self.width*self.height*4);for(let i=0;i<data.length;i+=4){data[i]=self.mask?64:184;data[i+1]=184;data[i+2]=184;data[i+3]=255;}return {data};},
  putImageData(image){self.pixels=image.data.slice();},
 };}
 getContext(){return this.context;}cloneNode(){return new Canvas();}
}
const doc={createElement:tag=>tag==='canvas'?new Canvas():new Element(tag)};
globalThis.Image=class{set src(value){this.mask=value.includes('mask');}async decode(){}};
const manifest=JSON.parse(await readFile(new URL('../pod/gala-coaches/manifest.json',import.meta.url),'utf8'));
globalThis.fetch=async()=>({ok:true,json:async()=>manifest});

test('a texture and palette belong only to the coach that earned them; save guards reject cross-coach reuse',()=>{
 memory.clear();const ids=unlockedCoachIds();const first=ids[0],second=ids.find(id=>id!==first);
 mod.grantUnlock('texture','chest-plate-steel',first);mod.grantUnlock('palette','pal-01',first);
 assert(!mod.isLocked('chest-plate-steel',first));assert(mod.isLocked('chest-plate-steel',second));
 assert(mod.colorTriad('pal-01',false,first));assert.equal(mod.colorTriad('pal-01',false,second),undefined);
 const base=mod.fresh(),materials={body:{textureId:'chest-plate-steel',colorId:'pal-01',sparkle:0,metallic:0}};
 const draft={...base,body:second,headFrom:second,armsFrom:second,feetFrom:second,materials};
 const kept=mod.keepOwned(draft,base,new Set([first,second]));assert.equal(kept.materials,undefined);
});

test('the mirror skin helper uses the same palette and shade as regular Gala avatars',()=>{
 const A=globalThis.GalaAvatar;
 assert.equal(A.skinColor({...A.defaultLook,parts:{...A.defaultLook.parts,skin:0}}),'#b18fc8');
 assert.equal(A.skinColor({...A.defaultLook,parts:{...A.defaultLook.parts,skin:1}}),'#80ba98');
 assert.notEqual(A.skinColor({...A.defaultLook,parts:{...A.defaultLook.parts,skin:10}}),'#b18fc8');
});

test('approved 64-bit coaches follow ownership, including quadrupeds, and mirror colors redraw them',async()=>{
 memory.clear();const room=await mod.loadWarRoomCoaches(doc),picker=room.picker('body',()=>{});
 const buttons=picker.children.filter(child=>child.dataset?.coachSprite);
 assert.equal(new Set(buttons.map(button=>button.dataset.coachSprite)).size,COACHES.length);
 assert.ok(EXCLUDED_COACH_IDS.every(id=>!buttons.some(button=>button.dataset.coachSprite===id)),'rejected legacy sprites remain hidden from the picker');
 const original=buttons.find(button=>button.dataset.coachSprite==='myr5');assert(!original.disabled);original.onclick();assert(room.hasBody);
 const one=new Canvas(),two=new Canvas(),A=globalThis.GalaAvatar;
 room.draw(()=>assert.fail('Selected coach should render its shape'),one,{...A.defaultLook,parts:{...A.defaultLook.parts,skin:0}});
 room.draw(()=>assert.fail('Selected coach should render its shape'),two,{...A.defaultLook,parts:{...A.defaultLook.parts,skin:1}});
 assert.notDeepEqual([...one.pixels.slice(0,3)],[...two.pixels.slice(0,3)]);
 const quad=buttons.find(button=>manifest.sprites.find(sprite=>sprite.id===button.dataset.coachSprite)?.kind==='pet');assert(quad);assert(quad.disabled,'unearned quadruped starts locked');
 const state=readPerformanceProgress();state.coaches.push(quad.dataset.coachSprite);localStorage.setItem(`${PERFORMANCE_KEY}/${performanceOwner()}`,JSON.stringify(state));
 const earnedRoom=await mod.loadWarRoomCoaches(doc),earnedButton=earnedRoom.picker('body',()=>{}).children.find(button=>button.dataset?.coachSprite===quad.dataset.coachSprite);
 assert.equal(earnedButton.disabled,false,'an earned quadruped becomes selectable');earnedButton.onclick();assert(earnedRoom.hasBody);
});

test('golden coach sprite variants are selectable separately and remain scoped to their owner',async()=>{
 memory.clear();const state=readPerformanceProgress();state.goldenCoaches.push('myr5');localStorage.setItem(`${PERFORMANCE_KEY}/${performanceOwner()}`,JSON.stringify(state));
 const room=await mod.loadWarRoomCoaches(doc),picker=room.picker('body',()=>{}),gold=picker.children.find(child=>child.dataset?.goldenCoach==='true'&&child.dataset.coachSprite==='myr5');assert(gold);gold.onclick();assert(room.hasBody);
 globalThis.myr5AuthenticatedAccount={user:{id:'different-owner'}};assert.equal(room.hasBody,false);
 globalThis.myr5AuthenticatedAccount={user:{id:'coach-cosmetic-tests'}};assert(room.hasBody);
});

test('a shared saved recipe cannot bypass performance ownership for a locked 64-bit coach',async()=>{
 memory.clear();const state=readPerformanceProgress(),locked=manifest.sprites.find(sprite=>!state.coaches.includes(sprite.id));assert(locked);
 const recipe={...mod.fresh(),body:locked.id,headFrom:locked.id,armsFrom:locked.id,feetFrom:locked.id};localStorage.setItem('myr5-recipe-v1',JSON.stringify(recipe));
 const key=`myr5-war-room-coaches-v2/${encodeURIComponent(performanceOwner())}`;localStorage.setItem(key,JSON.stringify({body:locked.id,pet:null,goldenBody:false}));
 const room=await mod.loadWarRoomCoaches(doc),picker=room.picker('body',()=>{}),button=picker.children.find(child=>child.dataset?.coachSprite===locked.id);
 assert(button.disabled);assert.equal(room.hasBody,false);button.onclick();assert.equal(room.hasBody,false);
 let fallback=false;room.draw(()=>{fallback=true;},new Canvas(),globalThis.GalaAvatar.defaultLook);assert(fallback);
});

test('fallback material ownership follows the selected 64-bit sprite rather than the 3D recipe body',async()=>{
 const source=await readFile(new URL('../creature/source/war-room-coaches.ts',import.meta.url),'utf8');
 assert.match(source,/resolveRegionMaterial\(r\.styles\[region\],regionChoice\(r\.materials,region\),false,sprite\.id\)/);
});
