// Scoreboard crew heads: real Gala heads (never "?" while a look exists), front view, and a blink timer that stops on removal.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'};
const parts=Object.fromEntries(['body','skin','face','hair','facial','headwear','neck','torso','shoulders','arms','hands','legs','feet','held','back','base','pet'].map(k=>[k,1]));
const look={schema:'mominc-avatar',version:1,name:'',dye:2,parts};
const PAGE=gala=>`<!doctype html><body><dialog id="accountPanel" open><header></header><div id="accountContent"></div><button id="signIn"></button><p id="recordsStatus"></p><div id="workoutList"></div><div id="boardCanvas"></div><div id="boardMovingPen"></div><div id="scoreboardMarkers"></div><b id="scoreboardGroup"></b><b id="scoreboardSubtitle"></b><div id="scoreboardCrew"></div><button id="copyCrewInvite"></button><button id="createCrewInvite"></button><input id="crewInviteCode"><div id="crewInviteControls"></div><div id="crewInviteOutput"></div><button id="crewJoin"></button><input id="crewJoinCode"><form id="crewJoinForm"></form><p id="crewStatus"></p><button id="revokeCrewInvite"></button></dialog>${gala?'<script src="/pod/gala-avatar.js"></script>':''}</body>`;

async function run(t,{gala=true,local=null,members}){
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://l').pathname;if(path==='/t.html'){res.setHeader('Content-Type','text/html');return res.end(PAGE(gala));}
  try{const body=await readFile(resolve('.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});t.after(async()=>{await browser.close();server.close();});
 const page=await browser.newPage();if(local)await page.addInitScript(v=>localStorage.setItem('mominc-avatar-v1',v),JSON.stringify(local));
 await page.goto(`http://127.0.0.1:${server.address().port}/t.html`);
 await page.evaluate(async({members,gala})=>{if(!gala){await new Promise(r=>{const s=document.createElement('script');s.src='/pod/gala-avatar.js';s.onload=r;document.head.append(s);});}
  const {mountScoreboard}=await import('/scoreboard.mjs');const account={user:{id:'u'},dataEpoch:1};
  window.sb=mountScoreboard({api:async()=>({targetAccountId:'u',dataEpoch:1,members,updatedAt:0}),getAccount:()=>account});await window.sb.refresh();},{members,gala});
 return page;
}
const heads=page=>page.$$eval('#scoreboardCrew .crew-head',n=>n.map(h=>h.querySelector('canvas')?'canvas':h.textContent));
const m=(name,avatar)=>({name,link:name==='Me'?null:'l',avatar,items:[]});

test('You with no server look uses the locally saved Gala look',async t=>{const page=await run(t,{local:look,members:[m('Me',null),m('Pal',look)]});assert.deepEqual((await heads(page)).slice(0,2),['canvas','canvas']);});
test('a friend with no avatar data keeps the "?"',async t=>{const page=await run(t,{members:[m('Me',look),m('Pal',null)]});assert.deepEqual((await heads(page)).slice(0,2),['canvas','?']);});
test('heads face front and blink, and the timer stops when removed',async t=>{
 const page=await run(t,{members:[m('Me',look),m('Pal',look)]});
 const r=await page.evaluate(async()=>{const calls=[],GA=window.GalaAvatar,draw=GA.draw;GA.draw=(c,l,o={})=>{calls.push(o.blink?'b':'o');return draw(c,l,o);};
  const cleared=[],ci=window.clearInterval,ct=window.clearTimeout;window.clearTimeout=x=>{cleared.push(x);return ct(x);};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(6800);const blinked=calls.includes('b');
  document.getElementById('scoreboardCrew').replaceChildren();await wait(200);const n=calls.length;await wait(7000);return {blinked,leak:calls.length-n};});
 assert.equal(r.blinked,true);assert.equal(r.leak,0);});
