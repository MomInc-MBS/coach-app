import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

test('fullscreen aura feathers inward widely and faintly (R21) and shaped masks stay clear well inside the feather',async()=>{
 const source=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function rimMask('),end=source.indexOf('const setMask=',start);
 assert.ok(start>=0&&end>start,'production aura mask helper is extractable');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  const pixels=await page.evaluate(async helper=>{
   const rimMask=new Function('document','Path2D','pathD','AURA',`${helper};return rimMask`)(document,Path2D,()=> 'M15 15H135V135H15Z',{maskScale:.5,edgeAlpha:.85,featherFrac:.3,featherAlpha:.3,fullFrac:.2,fullAlpha:.2,fullCurve:2,shadeK:.4,outK:.5,ringAlpha:.5,inset:12,railAlpha:.15});
   const decode=async(url)=>{const image=new Image();image.src=url.slice(5,-2);await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);return g.getImageData(0,0,c.width,c.height);};
   const full=await decode(rimMask([[15,15],[135,15],[135,135],[15,135],[15,15]],150,150,7,false,true));
   const shaped=await decode(rimMask([[0,0],[120,0],[120,120],[0,120],[0,0]],120,120,7,true,false));
   const alpha=(image,cssY)=>image.data[4*(Math.floor(cssY/2)*image.width+37)+3];
   return {full:[14,11,7,1,18].map(y=>alpha(full,y)),shaped:alpha(shaped,42)};
  },source.slice(start,end));
  assert.ok(pixels.full[0]>100&&pixels.full[0]<=200,'R21: a thin bright line sits on the face edge, not a solid ring');
  assert.ok(pixels.full[1]<=80&&pixels.full[1]>=pixels.full[2]&&pixels.full[2]>0&&pixels.full[3]<=4,'R21: only a faint, fading hint of glow reaches the metal rail (was solid, R19)');
  assert.ok(pixels.full[4]>20&&pixels.full[4]<=110,'R21: the inward feather is wide and see-through, not a band');
  assert.ok(pixels.shaped<=40,'shaped masks stay clear well inside the feather');
 }finally{await browser.close();}
});
