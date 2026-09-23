import test from 'node:test';
import assert from 'node:assert/strict';
import {emberColor,emberFade,dwellAlpha,wood,COOL_MS,FADE_MS,FADE_OUT_MS} from '../portal-board-wood.mjs';

const bright=c=>c.r+c.g+c.b;

test('emberColor: deep orange at birth, char at COOL_MS and after',()=>{
 assert.deepEqual(emberColor(0),{r:255,g:106,b:0});
 assert.deepEqual(emberColor(COOL_MS),{r:10,g:6,b:4});
 assert.deepEqual(emberColor(COOL_MS*3),emberColor(COOL_MS));
});

test('emberColor: darkens monotonically with age',()=>{
 for(let a=0;a<COOL_MS;a+=50)assert.ok(bright(emberColor(a+50))<=bright(emberColor(a)),`brighter at ${a+50} ms`);
});

test('emberFade: full until FADE_MS, gone FADE_OUT_MS later',()=>{
 assert.equal(emberFade(0),1);assert.equal(emberFade(FADE_MS),1);
 assert.equal(emberFade(FADE_MS+FADE_OUT_MS/2),.5);assert.equal(emberFade(FADE_MS+FADE_OUT_MS),0);
});

test('dwellAlpha: monotonic non-decreasing, capped, never zero',()=>{
 const samples=[0,50,150,300,400].map(dwellAlpha);
 for(let i=1;i<samples.length;i++)assert.ok(samples[i]>=samples[i-1]);
 assert.equal(dwellAlpha(300),dwellAlpha(1000));
 assert.ok(dwellAlpha(0)>0);
});

test('wood: a drag drops an ember every 12 px, glow is wiped once on cooling, paint returns to the guides',()=>{
 const ctx=()=>({draws:[],clears:0,save(){},restore(){},fillRect(){},beginPath(){},rect(){},clip(){},
  drawImage(img){this.draws.push(img);},clearRect(){this.clears++;},createRadialGradient:()=>({addColorStop(){}})});
 const canvas=()=>{const c={width:64,height:64,ctx:ctx(),getContext:()=>c.ctx};return c;};
 const made=[],layer=()=>({canvas:{width:1024,height:1024},ctx:ctx(),texture:{}});
 globalThis.document={createElement:()=>{const c=canvas();made.push(c);return c;}};
 globalThis.matchMedia=()=>({matches:false});
 const Stub=class{constructor(m){this.material=m;this.position={set(){}};this.scale={set(){}};}dispose(){}};
 const paint=layer(),glow=layer();
 wood.init({THREE:{CanvasTexture:Stub,SpriteMaterial:Stub,Sprite:Stub},scene:{add(){}},paint,glow,toWorld:(u,v)=>[u,v],faceZ:0,wake(){}});
 const pristine=made[0];
 wood.press(1,.1,.5);wood.move(1,.5,.5); // 409.6 px in one event -> 34 hops + the press
 wood.release(1);
 const t=performance.now();
 assert.equal(wood.step(1/60,t+100),true);
 assert.equal(glow.ctx.draws.length,35);assert.equal(glow.ctx.clears,1);
 assert.equal(paint.ctx.draws[0],pristine);assert.equal(paint.ctx.draws.length,36);
 wood.step(1/60,t+COOL_MS+200); // cooled: glow wiped, nothing re-added
 assert.equal(glow.ctx.clears,2);assert.equal(glow.ctx.draws.length,35);
 assert.equal(wood.step(1/60,t+COOL_MS+400),false); // char holds still
 assert.equal(glow.ctx.clears,2);
 paint.ctx.draws.length=0;paint.texture.needsUpdate=false;
 assert.equal(wood.step(1/60,t+FADE_MS+FADE_OUT_MS+200),true); // faded out: restore the guides only
 assert.deepEqual(paint.ctx.draws,[pristine]);assert.equal(paint.texture.needsUpdate,true);
 paint.ctx.draws.length=0;
 assert.equal(wood.step(1/60,t+FADE_MS+FADE_OUT_MS+400),false);
 assert.equal(paint.ctx.draws.length,0);
 wood.dispose();delete globalThis.document;delete globalThis.matchMedia;
});
