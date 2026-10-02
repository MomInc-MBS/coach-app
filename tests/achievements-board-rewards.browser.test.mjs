import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {chromium} from 'playwright';
import {boardBundle} from './board-bundle.mjs';

test('achievement detail renders the catalogued weapon name and pack tier for each level',async()=>{
 const root=resolve(import.meta.dirname,'..');
 const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/'){
   res.writeHead(200,{'Content-Type':'text/html'});
   res.end('<!doctype html><body><script type="module">import {openAchievements} from "/achievements-board.mjs";window.openBoard=openAchievements;</script></body>');return;
  }
  if(pathname==='/achievements-board.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(await boardBundle());return;}
  if(pathname==='/battle-pass.mjs'){
   res.writeHead(200,{'Content-Type':'text/javascript'});
   res.end('export const selectedTracks=()=>new Set(["chest"]);export const loadProgress=()=>({});export const battlePassState=()=>({bosses:[]});');return;
  }
  const file=resolve(root,'.'+decodeURIComponent(pathname));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{
   const type=extname(file)==='.json'?'application/json':extname(file)==='.css'?'text/css':'text/javascript';
   const contents=await readFile(file);res.writeHead(200,{'Content-Type':type});res.end(contents);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>window.openBoard);
  const rendered=await page.evaluate(()=>{
   window.openBoard();document.querySelector('.ach-boss[data-id="strider-1"]').click();
   return [...document.querySelectorAll('.ach-detail ol li span')].map(node=>node.textContent);
  });
  // R18 lane E: each level line is just the weapon name and pack tier (no skin/ship rewards), taken from the catalog.
  assert.deepEqual(rendered,[' · Glove on a Stick · Legendary Pack',' · Uncommon Pack',' · Chrome Bar Mace · Legendary Pack',' · Rare Pack',' · Legendary Pack']);
  assert.doesNotMatch(rendered.join(' '),/Magma|Rubber Grip|Ship/);
  assert.doesNotMatch(rendered.join(' '),/Weapon 1|Texture 1|Boss skin/,'catalogued names replace the generic placeholders');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolveClose=>server.close(resolveClose));}
});
