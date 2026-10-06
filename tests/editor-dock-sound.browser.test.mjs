import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

test('coach editor dock has the pod controls and a persistent Sound switch',{timeout:60000},async()=>{
 const root=resolve(process.env.MYR5_TEST_CLIENT_ROOT||'dist/client');
 const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Test</title>');return;}
  if(pathname.startsWith('/api/')){res.writeHead(pathname==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(pathname==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(pathname==='/'?'/pose.html':pathname));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage();
  await page.goto(base+'/__test__');
  await page.evaluate(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2'));
  await page.goto(base+'/creature/index.html');
  await page.locator('#editorSoundSwitch').waitFor();
  const dock=await page.evaluate(()=>{const bar=document.getElementById('coachDock'),sound=document.getElementById('editorSoundSwitch'),r=sound.getBoundingClientRect(),visible=[...bar.querySelectorAll(':scope > a, :scope > .dock-sound button')].map(el=>({name:el.dataset.route||'sound',x:el.getBoundingClientRect().left})).sort((a,b)=>a.x-b.x).map(el=>el.name);return {routes:[...bar.querySelectorAll(':scope > a')].map(a=>a.dataset.route),visible,soundInDock:!!sound.closest('#coachDock'),hit:sound.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)),within:r.left>=0&&r.right<=innerWidth};});
  assert.deepEqual(dock.routes,['customizeCoach','food','portal','scoreboard','achievements','reminders']);
  assert.deepEqual(dock.visible,['customizeCoach','food','scoreboard','portal','achievements','reminders','sound']);
  assert.ok(dock.soundInDock&&dock.hit&&dock.within,JSON.stringify(dock));
  await page.locator('#editorSoundSwitch').click();
  assert.equal(await page.locator('#editorSoundSwitch').getAttribute('aria-checked'),'false');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('myr5.physicalSound.v1')).muted),true);
  await page.locator('#editorSoundSwitch').focus();await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('#editorSoundSwitch').getAttribute('aria-checked'),'true');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('#editorSoundSwitch').getAttribute('aria-checked'),'false');
  await page.reload();
  await page.locator('#editorSoundSwitch').waitFor();
  assert.equal(await page.locator('#editorSoundSwitch').getAttribute('aria-checked'),'false');
  await context.close();
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
