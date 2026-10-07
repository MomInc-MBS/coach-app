// Tub flight endless review harness. node scripts/vault-tub-preview.cjs shoot  -> .vault/shots/tub-*.png
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),PORT=Number(process.env.VAULT_TUB_PORT)||8921;
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/arcade/tub-flight/style.css"><style>body{margin:0;padding:10px;background:#164743}</style></head><body><main id="g"></main><script type="module">
import {mountTubFlight} from '/arcade/tub-flight/game.mjs';window.errors=[];addEventListener('error',e=>errors.push(e.message));window.fuelCalls=0;
window.h=mountTubFlight(document.getElementById('g'),{autoFuel:true,onComplete:()=>fuelCalls++});
window.bot=true;const g=h.game;setInterval(()=>{if(!bot||g.phase!=='running')return;const p=g.pipes.find(p=>p.x+44>69);const t=p?p.gap+8:210;if(g.y>t&&g.velocity>0)g.flap();},8);
</script></body></html>`;
const mime={'.mjs':'text/javascript','.css':'text/css'};
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://l');if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 try{const f=path.resolve(root,'.'+u.pathname);if(!f.startsWith(root+path.sep))throw 0;res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.writeHead(404);res.end();}});
server.listen(PORT,'127.0.0.1',()=>{if(process.argv[2]==='shoot')shoot().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});else console.log('http://127.0.0.1:'+PORT);});
async function shoot(){
 const {chromium}=require('playwright'),out=path.join(root,'.vault','shots');await fs.mkdir(out,{recursive:true});
 const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:375,height:812},hasTouch:true,deviceScaleFactor:2}),page=await ctx.newPage();
 const logs=[];page.on('console',m=>{if(/error|warn/i.test(m.type()))logs.push(m.text());});page.on('pageerror',e=>logs.push(String(e)));
 await page.goto(`http://127.0.0.1:${PORT}/`);await page.waitForFunction('window.h');
 const shot=n=>page.screenshot({path:path.join(out,`tub-${n}.png`)}),sc=()=>page.evaluate('h.game.score');
 const until=n=>page.waitForFunction(`h.game.score>=${n}||h.game.phase==='crashed'`,null,{timeout:120000,polling:20});
 await page.evaluate('localStorage.clear()');await page.reload();await page.waitForFunction('window.h');
 await shot('1-start');
 await page.evaluate('h.game.flap();document.querySelector("canvas").dispatchEvent(new Event("pointerdown"))');
 await until(5);await page.evaluate('h.pause()');console.log('mid',await sc());await shot('2-mid5');await page.click('[data-pause]');
 await until(8);await page.waitForTimeout(300);console.log('fuel',await sc(),await page.evaluate('[fuelCalls,localStorage.getItem("mbs-fuel-flight-v1"),h.game.phase]'));await shot('3-fuel-toast');
 await until(16);await page.evaluate('h.pause()');console.log('mid16',await sc(),await page.evaluate('h.game.pipes[0].half'));await shot('4-mid16');
 await page.click('[data-pause]');await page.evaluate('bot=false');await page.waitForFunction("h.game.phase==='crashed'",null,{timeout:20000});await page.waitForTimeout(150);
 console.log('crash',await page.evaluate('[h.game.score,localStorage.getItem("mbs-tub-best-v1"),localStorage.getItem("myr5-vault-pending")]'));await shot('5-crash');
 await page.click('[data-retry]');await shot('6-retry');console.log('errors',logs,await page.evaluate('errors'));await b.close();}
