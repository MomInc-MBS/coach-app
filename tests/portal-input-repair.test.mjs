import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture(){
 const raw=fs.readFileSync(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 const source=raw.slice(raw.indexOf('function endPointer(e,cancel)'),raw.indexOf('function initialVisible()'));
 const listeners=new Map(),sounds=[];let clock=1000,opened=0;
 const noop=()=>{},context={pointers:new Map(),lastTap:null,board:{release:noop,press:noop},busy:false,fading:[],scheduleIdle:noop,kickRender:noop,markHintSeen:noop,stopHint:noop,portalSound:kind=>sounds.push(kind),performance:{now:()=>clock},TAP_MS:350,TAP_MOVE_PX:32,nearestTapShape:()=> 'up',MENUS:{up:{}},buzz:noop,runShape:()=>opened++,overlay:{addEventListener:(type,fn)=>listeners.set(type,fn),setPointerCapture:noop},finalizeTimer:null,clearTimeout:noop,toNorm:(x,y)=>[x/100,y/100]};
 vm.runInNewContext(source+';wirePointerEvents();',context);
 const send=(type,timeStamp,pointerId=1,x=10,y=20)=>listeners.get(type)({timeStamp,pointerId,clientX:x,clientY:y});
 return {context,send,tap(t,id=1){send('pointerdown',t,id);send('pointerup',t+1,id)},clock(t){clock=t},opened:()=>opened,sounds};
}
test('queued board taps use input timestamps despite delayed processing',()=>{
 const f=fixture();f.tap(100);f.clock(1500);f.tap(220);assert.equal(f.opened(),1);assert.deepEqual(f.sounds,['press','press']);
});
test('press and spaced drag sounds follow one pointer without firing every move',()=>{
 const f=fixture();f.send('pointerdown',100);f.clock(1120);f.send('pointermove',120,1,30,20);
 f.clock(1140);f.send('pointermove',140,1,50,20);
 f.clock(1240);f.send('pointermove',240,1,70,20);
 assert.deepEqual(f.sounds,['press','drag','drag']);
 assert.equal(f.context.pointers.get(1).pts.length,4);
});
test('backwards input clocks cannot pair board taps',()=>{
 const f=fixture();f.tap(300);f.tap(100);assert.equal(f.opened(),0);
});
test('invalid input timestamps fall back to a finite processing clock',()=>{
 const f=fixture();f.tap(Infinity);f.clock(1100);f.tap(Infinity);assert.equal(f.opened(),1);
});
test('cancelled pointer clears previous board tap pairing',()=>{
 const f=fixture();f.tap(100);f.send('pointercancel',150);f.tap(200);assert.equal(f.opened(),0);
});
test('a second simultaneous pointer clears prior tap pairing',()=>{
 const f=fixture();f.tap(100);f.send('pointerdown',150,1);f.send('pointerdown',160,2);assert.equal(f.context.lastTap,null);
});

function dialogFixture(){
 const raw=fs.readFileSync(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8'),start=raw.indexOf('// R7 (Ian 26 Sept): a double-tap on the open menu');
 const source=raw.slice(raw.indexOf(' const at=',start),raw.indexOf('// A tap on the scene',start));
 const dialog=new EventTarget();let opened=0,clock=1000;
 vm.runInNewContext(source,{dialog,framed:{ctl:new AbortController()},TAP_MS:350,TAP_MOVE_PX:32,performance:{now:()=>clock},expandScene:()=>opened++});
 const send=(type,timeStamp,pointerId=1)=>{const e=new Event(type);for(const[k,v]of Object.entries({timeStamp,pointerId,clientX:10,clientY:20}))Object.defineProperty(e,k,{value:v});dialog.dispatchEvent(e);};
 return {send,tap(t,id=1){send('pointerdown',t,id);send('pointerup',t+1,id)},opened:()=>opened};
}
test('dialog pairs valid taps and rejects backwards clocks',()=>{
 const f=dialogFixture();f.tap(100);f.tap(220);assert.equal(f.opened(),1);
 const backwards=dialogFixture();backwards.tap(300);backwards.tap(100);assert.equal(backwards.opened(),0);
});
test('dialog cancellation and simultaneous pointers cannot seed a later double tap',()=>{
 const f=dialogFixture();f.tap(100);f.send('pointerdown',150);f.send('pointercancel',151);f.tap(200);assert.equal(f.opened(),0);
 const multi=dialogFixture();multi.tap(100);multi.send('pointerdown',150,1);multi.send('pointerdown',160,2);multi.send('pointerup',170,2);multi.send('pointerup',180,1);multi.tap(220);assert.equal(multi.opened(),0);
});
