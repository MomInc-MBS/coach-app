import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {build} from 'esbuild';

const root=resolve('.');
const mime={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'};
test('CRT pages ten-level areas; full flight keeps all 250 levels in one scrollable map',async()=>{
 const runtime=(await build({entryPoints:['battle-pass-page.mjs'],bundle:true,format:'esm',target:'es2022',write:false})).outputFiles[0].text;
 const missing=[];
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/battle-pass-page.css"><button id="battlePassOpen">XP</button><script type="module">import {mountBattlePass} from "/map-runtime.mjs";mountBattlePass();</script>');return;}
  if(path==='/map-runtime.mjs'){res.setHeader('Content-Type','text/javascript');res.end(runtime);return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error('path');const data=await readFile(file);res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(data);}catch{missing.push(path);res.writeHead(404);res.end();}
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:375,height:812},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  try{await page.locator('.pass-crt-entry').waitFor({timeout:5000});}catch{throw Error(JSON.stringify({errors,missing,body:await page.locator('body').innerText()}));}
  assert.match(await page.locator('#battlePassOpen').innerText(),/SYSTEM 01/);
  await page.locator('.pass-crt-switch').last().click();
  assert.match(await page.locator('#battlePassOpen').innerText(),/SYSTEM 02/);
  await page.locator('#battlePassOpen').click();
  assert.equal(await page.locator('.pass-area').count(),25);
  assert.equal(await page.locator('.pass-level').count(),250);
  assert.equal(await page.locator('.pass-coach-art').count(),25);
  assert.equal(await page.locator('.pass-chapter-nav').count(),0);
  assert.equal(await page.locator('.pass-area[data-chapter="0"] .pass-current-fog').count(),1);
  assert.equal(await page.locator('.pass-area[data-chapter="1"]').getAttribute('data-future'),'true');
  assert.equal(await page.locator('.pass-level[data-level="1"]').getAttribute('data-state'),'current');
  const geometry=await page.evaluate(()=>{const d=document.getElementById('battlePassPanel'),v=d.querySelector('.pass-map-viewport'),a=d.querySelector('[data-chapter="1"]');return{dialog:d.getBoundingClientRect().height,viewport:v.getBoundingClientRect().height,outerScroll:d.scrollHeight-d.clientHeight,scroll:v.scrollTop,areaTop:a.getBoundingClientRect().top,viewTop:v.getBoundingClientRect().top,viewBottom:v.getBoundingClientRect().bottom};});
  assert.ok(geometry.viewport>=350,JSON.stringify(geometry));
  assert.equal(geometry.outerScroll,0);
  assert.ok(geometry.areaTop<geometry.viewBottom&&geometry.areaTop>geometry.viewTop-900,JSON.stringify(geometry));
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
