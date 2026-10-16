import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {build} from 'esbuild';

const root=resolve('.');
const mime={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'};
test('one achievements page: constellation on top, all 250 levels below, CRT section menu inside the game screen',async()=>{
 const runtime=(await build({entryPoints:['battle-pass-page.mjs'],bundle:true,format:'esm',target:'es2022',write:false})).outputFiles[0].text;
 const missing=[];
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/battle-pass-page.css"><link rel="stylesheet" href="/achievements-board.css"><script type="module">import {mountBattlePass} from "/map-runtime.mjs";mountBattlePass();window.mounted=true;</script>');return;}
  if(path==='/map-runtime.mjs'){res.setHeader('Content-Type','text/javascript');res.end(runtime);return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error('path');const data=await readFile(file);res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(data);}catch{missing.push(path);res.writeHead(404);res.end();}
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:375,height:812},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  try{await page.waitForFunction(()=>window.mounted&&window.myr5Menus?.achievements,null,{timeout:5000});}catch{throw Error(JSON.stringify({errors,missing,body:await page.locator('body').innerText()}));}
  await page.evaluate(()=>window.myr5Menus.achievements());
  assert.equal(await page.locator('#battlePassPanel .pass-map-shell .pass-hud #battlePassOpen').count(),1,'the section menu lives inside the game screen');
  assert.equal(await page.locator('.pass-map-viewport > .ach-board.ach-embed').count(),1,'the constellation heads the flight scroller');
  assert.equal(await page.locator('dialog.ach-board').count(),0,'no second achievements dialog');
  assert.match(await page.locator('#battlePassOpen').innerText(),/SYSTEM 01/);
  assert.equal(await page.locator('.pass-area').count(),25);
  assert.equal(await page.locator('.pass-level').count(),250);
  assert.equal(await page.locator('.pass-coach-star').count(),25);
  assert.equal(await page.locator('.pass-route-main').count(),25);
  assert.equal(await page.locator('.pass-fire').count(),0);
  assert.equal(await page.locator('.pass-chapter-nav').count(),0);
  assert.equal(await page.locator('.pass-area[data-chapter="0"] .pass-current-fog').count(),1);
  assert.equal(await page.locator('.pass-area[data-chapter="1"]').getAttribute('data-future'),'true');
  assert.equal(await page.locator('.pass-level[data-level="1"]').getAttribute('data-state'),'current');
  await page.evaluate(()=>{
   const ctx=document.querySelector('.pass-scene').getContext('2d'),clear=ctx.clearRect.bind(ctx),stroke=ctx.stroke.bind(ctx);
   window.mapLaserFrame=0;window.mapLaserPeak=0;
   ctx.clearRect=(...args)=>{window.mapLaserFrame=0;return clear(...args);};
   ctx.stroke=(...args)=>{if(ctx.strokeStyle==='#b9faff'){window.mapLaserFrame++;window.mapLaserPeak=Math.max(window.mapLaserPeak,window.mapLaserFrame);}return stroke(...args);};
  });
  const shell=await page.locator('.pass-map-shell').boundingBox();
  await page.mouse.move(shell.x+shell.width*.68,shell.y+shell.height*.72);
  await page.mouse.down();await page.waitForTimeout(440);
  assert.ok(await page.evaluate(()=>window.mapLaserPeak)>=3,'holding anywhere on the flight map fires repeatedly');
  await page.mouse.up();await page.waitForTimeout(800);
  assert.equal(await page.evaluate(()=>window.mapLaserFrame),0,'released pointer stops creating shots');
  const geometry=await page.evaluate(()=>{const d=document.getElementById('battlePassPanel'),v=d.querySelector('.pass-map-viewport'),a=d.querySelector('[data-chapter="1"]');return{dialog:d.getBoundingClientRect().height,viewport:v.getBoundingClientRect().height,outerScroll:d.scrollHeight-d.clientHeight,scroll:v.scrollTop,areaTop:a.getBoundingClientRect().top,viewTop:v.getBoundingClientRect().top,viewBottom:v.getBoundingClientRect().bottom};});
  assert.ok(geometry.viewport>=350,JSON.stringify(geometry));
  assert.equal(geometry.outerScroll,0);
  const start=await page.evaluate(()=>{const v=document.querySelector('.pass-map-viewport').getBoundingClientRect(),s=document.querySelector('.ach-embed .ach-stage').getBoundingClientRect();return {stageBottom:s.bottom,viewTop:v.top,viewBottom:v.bottom};});
  assert.ok(start.stageBottom>start.viewTop&&start.stageBottom<start.viewBottom,'opens with the ship under the last coach: '+JSON.stringify(start));
  await page.locator('.pass-hud .pass-crt-switch').last().click();
  assert.match(await page.locator('#battlePassOpen').innerText(),/SYSTEM 02/);
  assert.equal(await page.locator('.pass-crt-chart .pass-crt-dot').count(),10);
  await page.locator('#battlePassOpen').click(); // reduced motion: the hyper-jump is a cut
  const landed=await page.evaluate(()=>{const v=document.querySelector('.pass-map-viewport').getBoundingClientRect(),r=document.querySelector('.pass-level[data-level="11"]').getBoundingClientRect();return {row:r.top,viewTop:v.top,viewBottom:v.bottom};});
  assert.ok(landed.row>landed.viewTop&&landed.row<landed.viewBottom,'jumped to system 2: '+JSON.stringify(landed));
  for(let i=0;i<30;i++)await page.locator('.pass-hud .pass-crt-switch').last().click({force:true}).catch(()=>{});
  assert.match(await page.locator('#battlePassOpen').innerText(),/COACH CONSTELLATION/);
  await page.locator('#battlePassOpen').click();
  assert.equal(await page.locator('.pass-map-viewport').evaluate(el=>el.scrollTop),0);
  const openSpace=await page.locator('.pass-level[data-level="1"]').evaluate(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderStyle}));
  assert.equal(openSpace.background,'rgba(0, 0, 0, 0)');
  assert.equal(openSpace.border,'none');
  await page.locator('.pass-map-viewport').evaluate(el=>el.scrollTop=0);
  assert.equal(await page.locator('.pass-area').first().getAttribute('data-chapter'),'24');
  await page.locator('.pass-map-viewport').evaluate(el=>el.scrollTop=el.scrollHeight);
  assert.equal(await page.locator('.pass-area').last().getAttribute('data-chapter'),'0');
  await page.locator('.pass-close').click();
  assert.equal(await page.locator('#battlePassPanel').evaluate(el=>el.open),false);
  assert.deepEqual(errors,[]);
  await page.close();
 }finally{await browser.close();await new Promise(done=>server.close(done));}
});
