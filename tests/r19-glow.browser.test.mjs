import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// R21 L2 (built dist/client, 375x812, standalone customizer): a thin bright edge fades softly from the metal rail into
// the face, while its stacking stays above the dock.
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
test('standalone glow: thin bright edge fades across the face and stays above the dock',{timeout:120000},async()=>{
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
  const [outside,edge,face,fade]=await page.evaluate(async b64=>{const img=await createImageBitmap(await (await fetch('data:image/png;base64,'+b64)).blob()),c=new OffscreenCanvas(img.width,img.height),x=c.getContext('2d');x.drawImage(img,0,0);return [[14,400],[15,400],[24,400],[55,400]].map(([a,b])=>[...x.getImageData(a,b,1,1).data].slice(0,3));},shot);
  assert.ok(edge[0]>outside[0]+55&&edge[2]>outside[2]+100,'the two-pixel rail edge is visibly bright '+JSON.stringify({outside,edge}));
  assert.ok(edge[0]>face[0]&&edge[2]>face[2],'the soft halo fades inward from its bright edge '+JSON.stringify({edge,face,fade}));
  assert.ok(face[0]<180&&face[2]<210&&fade[0]<=face[0]&&fade[2]<=face[2],'the feather stays soft and fades out instead of washing the screen '+JSON.stringify({face,fade}));
 }finally{await browser?.close();server.close();}
});
