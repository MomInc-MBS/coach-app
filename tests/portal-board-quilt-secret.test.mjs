// Achievement Vault L4: quilt two-step fold reducer (pure, no WebGL).
import test from 'node:test';
import assert from 'node:assert/strict';
import {quiltSecret as R,quiltSecretInit,quiltBend,QUILT_SECRET as Q} from '../modules/portal/portal-board.mjs';

const face={left:0,top:100,width:345,height:560},W=375,H=812,cx=face.left+face.width/2,top=face.top;
const ev=(type,id,x,y)=>({type,id,x,y,face,w:W,h:H});
const run=(s,list,t)=>list.reduce((a,e)=>R(a,e,t),s);
const BL=[90,top+face.height*.85],BR=[260,top+face.height*.85],dy=face.height*Q.min1+2;
const fold1=(t=0,d=dy)=>run(quiltSecretInit(),[ev('down',1,...BL),ev('down',2,...BR),ev('move',1,BL[0],BL[1]-d),ev('move',2,BR[0],BR[1]-d),ev('up',1),ev('up',2)],t);
const U=[110,top+face.height*.1],D=[110,top+face.height*.35],dx=face.width*Q.min2+2;
const fold2=(s,d=dx,t=1000)=>run(s,[ev('down',3,...U),ev('down',4,...D),ev('move',3,U[0]+d,U[1]),ev('move',4,D[0]+d,D[1]),ev('up',3),ev('up',4)],t);

test('two bottom-quadrant drags up >=35% fold step 1', ()=>assert.equal(fold1().phase,'folded1'));
test('drag short of the threshold falls back', ()=>{const s=fold1(0,dy-face.height*.1);assert.equal(s.phase,'idle');assert.equal(s.p,0);});
test('one finger does nothing', ()=>{const s=run(quiltSecretInit(),[ev('down',1,...BL),ev('move',1,BL[0],BL[1]-300),ev('up',1)],0);assert.equal(s.phase,'idle');assert.deepEqual(s.claimed,[]);});
test('two fingers in the same quadrant do not start', ()=>assert.equal(run(quiltSecretInit(),[ev('down',1,...BL),ev('down',2,60,BL[1])],0).phase,'idle'));
test('a touch starting within 24 px of a screen edge is ignored', ()=>{
 const s=run(quiltSecretInit(),[ev('down',1,10,BL[1]),ev('down',2,...BR)],0);assert.equal(s.phase,'idle');
 const t=run(quiltSecretInit(),[ev('down',1,...BL),ev('down',2,...BR)],0);assert.equal(t.phase,'fold1');
});
test('both pointers are claimed from the moment both are down', ()=>{
 const s=run(quiltSecretInit(),[ev('down',1,...BL),ev('down',2,...BR)],0);assert.deepEqual([...s.claimed].sort(),['1','2']);
});
test('too slow (> 2.5 s) falls back', ()=>{
 let s=run(quiltSecretInit(),[ev('down',1,...BL),ev('down',2,...BR),ev('move',1,BL[0],BL[1]-dy),ev('move',2,BR[0],BR[1]-dy)],0);
 s=run(s,[ev('up',1),ev('up',2)],QUILT_MS+1);assert.equal(s.phase,'idle');
});
const QUILT_MS=Q.ms1;
test('progress follows the fingers (0-1) and needs both to move', ()=>{
 let s=run(quiltSecretInit(),[ev('down',1,...BL),ev('down',2,...BR),ev('move',1,BL[0],BL[1]-300)],0);assert.equal(s.p,0);
 s=R(s,ev('move',2,BR[0],BR[1]-150),0);assert.ok(s.p>0&&s.p<1);
});
test('step 2 right drag >=40% of face width completes the secret', ()=>{
 const s=fold2(fold1());assert.equal(s.phase,'done');
});
test('step 2 pair needs one upper-band and one lower-band finger', ()=>{
 const s=run(fold1(),[ev('down',3,...U),ev('down',4,110,top+face.height*.05)],1000);assert.equal(s.phase,'folded1');
});
test('step 2 touch within 40 px of the left screen edge is ignored', ()=>{
 const s=run(fold1(),[ev('down',3,30,U[1]),ev('down',4,...D)],1000);assert.equal(s.phase,'folded1');
});
test('step 2 after 9 s resets to flat', ()=>{
 const s=fold2(fold1(),dx,9000);assert.equal(s.phase,'idle');
});
test('step 2 short drag falls back to folded1', ()=>{const s=fold2(fold1(),face.width*.1);assert.equal(s.phase,'folded1');});
test('cancel mid-drag falls back', ()=>{
 const s=R(run(quiltSecretInit(),[ev('down',1,...BL),ev('down',2,...BR),ev('move',1,BL[0],BL[1]-200),ev('move',2,BR[0],BR[1]-200)],0),{type:'cancel'},1);assert.equal(s.phase,'idle');assert.equal(s.p,0);
});
test('quiltBend: flat at 0, laid back over the stay half at pi', ()=>{
 assert.deepEqual(quiltBend(100,0,0,3),[100,0]);
 const [a,z]=quiltBend(100,0,Math.PI,3);assert.ok(Math.abs(a+(100-3*Math.PI))<1e-6);assert.ok(Math.abs(z-6)<1e-6);
});
