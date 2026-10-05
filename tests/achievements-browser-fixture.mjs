import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {chromium} from 'playwright';
import {boardBundle} from './board-bundle.mjs';
const root=resolve(import.meta.dirname,'..');
export async function openAchievementFixture({width=375,height=812}={}){
 const bundle=await boardBundle();
 const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/'){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
   res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/achievements-board.css"><script type="module">import {openAchievements} from "/achievements-board.mjs";import * as performance from "/performance-progress.mjs";import * as rest from "/rest-boss-rewards.mjs";window.openBoard=openAchievements;window.performanceProgress=performance;window.restRewards=rest;</script>');return;
  }
  if(pathname==='/achievements-board.mjs'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});res.end(bundle);return;}
  if(pathname==='/battle-pass.mjs'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});res.end('export const selectedTracks=()=>new Set(["chest"]);');return;}
  const file=resolve(root,'.'+decodeURIComponent(pathname));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{const type={'.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.json':'application/json'}[extname(file)]||'text/javascript; charset=utf-8';const contents=await readFile(file);res.writeHead(200,{'Content-Type':type});res.end(contents);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const close=async()=>{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));};
 try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width,height}});await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.openBoard&&window.performanceProgress&&window.restRewards);await page.evaluate(()=>window.openBoard());return {page,close};}catch(error){await close();throw error;}
}
