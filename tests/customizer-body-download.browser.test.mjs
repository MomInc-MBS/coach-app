// W2-2J: Customizer body download listener. Fires real service worker messages at the real
// editor-workbench.ts listener and asserts the footer status text updates correctly.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('dist/client');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'};

test('customizer body download listener updates footer status', async () => {
  const server=createServer(async(req,res)=>{
    const path=new URL(req.url,'http://local').pathname;
    try{
      const body=await readFile(resolve(root,'.'+path));
      res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');
      res.end(body);
    }catch{
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage();
    const base='http://127.0.0.1:'+server.address().port;

    await page.goto(base+'/creature/index.html');
    await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});

    // Ensure navigator.serviceWorker exists as an EventTarget for the listener.
    // The real app registers a real SW; inject a mock if needed for testing.
    await page.evaluate(()=>{
      if(!navigator.serviceWorker){
        const et=new EventTarget();
        Object.defineProperty(navigator,'serviceWorker',{value:et,configurable:true});
      }
    });

    // Initial status text
    const initialStatus=await page.locator('#creatureStatus').textContent();
    assert.equal(initialStatus,'Your coach is ready','initial status shows ready');

    // Fire BODY_DOWNLOAD start event
    await page.evaluate(()=>{
      navigator.serviceWorker.dispatchEvent(
        new MessageEvent('message',{data:{type:'BODY_DOWNLOAD',url:'/body1.glb',state:'start'}})
      );
    });
    await page.waitForTimeout(100); // brief wait for listener to process
    let status=await page.locator('#creatureStatus').textContent();
    assert.equal(status,'Downloading this body…','status shows downloading on start');

    // Add another pending body
    await page.evaluate(()=>{
      navigator.serviceWorker.dispatchEvent(
        new MessageEvent('message',{data:{type:'BODY_DOWNLOAD',url:'/body2.glb',state:'start'}})
      );
    });
    await page.waitForTimeout(100);
    status=await page.locator('#creatureStatus').textContent();
    assert.equal(status,'Downloading this body…','status still shows downloading with multiple pending');

    // Complete one download
    await page.evaluate(()=>{
      navigator.serviceWorker.dispatchEvent(
        new MessageEvent('message',{data:{type:'BODY_DOWNLOAD',url:'/body1.glb',state:'done'}})
      );
    });
    await page.waitForTimeout(100);
    status=await page.locator('#creatureStatus').textContent();
    assert.equal(status,'Downloading this body…','status still downloading with one pending');

    // Complete the second download
    await page.evaluate(()=>{
      navigator.serviceWorker.dispatchEvent(
        new MessageEvent('message',{data:{type:'BODY_DOWNLOAD',url:'/body2.glb',state:'done'}})
      );
    });
    await page.waitForTimeout(100);
    status=await page.locator('#creatureStatus').textContent();
    assert.equal(status,'Your coach is ready','status restored to ready when all done');

    // Test unavailable state (6s timer)
    await page.evaluate(()=>{
      navigator.serviceWorker.dispatchEvent(
        new MessageEvent('message',{data:{type:'BODY_DOWNLOAD',url:'/body3.glb',state:'unavailable'}})
      );
    });
    await page.waitForTimeout(100);
    status=await page.locator('#creatureStatus').textContent();
    assert(status.includes('isn\'t on this phone yet'),'status shows offline message on unavailable');

    // After 6s timeout, should restore ready
    await page.waitForTimeout(6100);
    status=await page.locator('#creatureStatus').textContent();
    assert.equal(status,'Your coach is ready','status restored to ready after unavailable timeout');

  } finally {
    await browser?.close();
    await new Promise(r=>server.close(r));
  }
});
