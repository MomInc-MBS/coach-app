import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

test('fullscreen aura feathers inward for 36 CSS pixels while shaped masks keep their crisp original band',async()=>{
 const source=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function rimMask('),end=source.indexOf('const setMask=',start);
 assert.ok(start>=0&&end>start,'production aura mask helper is extractable');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  const pixels=await page.evaluate(async helper=>{
   const rimMask=new Function('document','Path2D','pathD','AURA',`${helper};return rimMask`)(document,Path2D,()=> 'M0 0H120V120H0Z',{maskScale:.5});
   const decode=async(url)=>{const image=new Image();image.src=url.slice(5,-2);await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);return g.getImageData(0,0,c.width,c.height);};
   const full=await decode(rimMask([[15,15],[135,15],[135,135],[15,135],[15,15]],150,150,7,false,true));
   const shaped=await decode(rimMask([[0,0],[120,0],[120,120],[0,120],[0,0]],120,120,7,true,false));
   const alpha=(image,cssY)=>image.data[4*(Math.floor(cssY/2)*image.width+37)+3];
   return {full:[14,11,7,1,30].map(y=>alpha(full,y)),shaped:alpha(shaped,42)};
  },source.slice(start,end));
  assert.ok(pixels.full[0]>200,'R19: the glow is brightest on the metal rail at the screen edge');
  assert.ok(pixels.full[0]>pixels.full[1]&&pixels.full[1]>pixels.full[2]&&pixels.full[2]>pixels.full[3],'alpha fades smoothly outward across the rail');
  assert.ok(pixels.full[3]<=40&&pixels.full[4]===0,'R19: nothing inside the screen face');
  assert.equal(pixels.shaped,0,'the existing shaped aperture mask keeps its original narrow edge band');
 }finally{await browser.close();}
});
