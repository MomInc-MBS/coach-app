import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// R19 K (built dist/client, 375x812, standalone customizer): the neon aura sits above the dock (z-index) and lights only
// the 15px metal rail; the screen face and the dock stay clear of it.
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
test('standalone glow: above the dock, strong on the rail, absent from the face',{timeout:120000},async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.addInitScript(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2'));
  await page.goto('http://127.0.0.1:'+server.address().port+'/creature/index.html');
  await page.waitForSelector('.portal-standalone-aura',{state:'attached'});await page.waitForTimeout(800);
  const info=await page.evaluate(()=>{const a=getComputedStyle(document.querySelector('.portal-standalone-aura')),d=getComputedStyle(document.getElementById('coachDock'));return {az:+a.zIndex,dz:+d.zIndex,inset:a.inset,filter:a.filter,border:a.borderTopWidth};});
  assert.ok(info.az>info.dz,'aura z-index above the dock '+JSON.stringify(info));assert.equal(info.border,'0px','no band inside the face');
  const shot=(await page.screenshot()).toString('base64');
  const [rail,face]=await page.evaluate(async b64=>{const img=await createImageBitmap(await (await fetch('data:image/png;base64,'+b64)).blob()),c=new OffscreenCanvas(img.width,img.height),x=c.getContext('2d');x.drawImage(img,0,0);return [[14,400],[24,400]].map(([a,b])=>[...x.getImageData(a,b,1,1).data].slice(0,3));},shot);
  assert.ok(rail[0]>110&&rail[2]>170&&rail[1]<90,'rail inner edge is bright neon '+rail);
  assert.ok(Math.abs(face[0]-14)<40&&face[2]<150||face[2]<rail[2]-40,'face is not washed by the glow '+face);
 }finally{await browser?.close();server.close();}
});
