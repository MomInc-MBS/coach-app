// Lane L2 (wood secret) harness: node scripts/vault-l2-preview.cjs [shots]
// Serves a page mounting the wood board on :8903; with `shots` it drives it with Playwright (375x812 touch) and
// writes .vault/shots/l2-*.png, then exits.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),PORT=Number(process.env.VAULT_L2_PORT)||8903;
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#140c06;overflow:hidden}#board{position:absolute;left:15px;right:15px;top:0;bottom:103px;touch-action:none}
</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script></head><body><div id="board"></div><script type="module">
import {createGlbBoard} from '/modules/portal/portal-board-glb.mjs';import {wood} from '/modules/portal/portal-board-wood.mjs';
window.errors=[];window.secrets=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('myr5:portal-secret',e=>secrets.push(e.detail));
const host=document.querySelector('#board');
try{window.wood=wood;window.board=await createGlbBoard(host,{effect:wood});board.setTint('#d9a15a');window.ready=true;}catch(e){errors.push(e.stack);}
host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);board.press(e.pointerId,e.clientX,e.clientY);};
host.onpointermove=e=>{if(host.hasPointerCapture(e.pointerId))board.press(e.pointerId,e.clientX,e.clientY);};
host.onpointerup=host.onpointercancel=e=>{window.claimed=(board.claims||wood.claims)(e.pointerId);board.release(e.pointerId);};
</script></body></html>`;
const types={'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.css':'text/css'};
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 try{const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');const data=await fs.readFile(file);res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
server.listen(PORT,'127.0.0.1',()=>{console.log('Wood secret preview http://127.0.0.1:'+PORT);if(process.argv[2]==='shots')shots().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});});

async function shots(){
 const {chromium}=require('playwright'),browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const page=await (await browser.newContext({viewport:{width:375,height:812},hasTouch:true,deviceScaleFactor:1})).newPage(),logs=[];
 page.on('console',m=>{if(['error','warning'].includes(m.type()))logs.push(m.type()+': '+m.text());});
 await page.goto('http://127.0.0.1:'+PORT+'/');await page.waitForFunction('window.ready||window.errors.length',null,{timeout:30000});
 console.log('errors',await page.evaluate('errors'));
 const snap=n=>page.screenshot({path:path.join(root,'.vault/shots/l2-'+n+'.png')}),wait=ms=>page.waitForTimeout(ms);
 // face quadrant: top-left area; scrub in x. Mouse = pointer events, same path as touch.
 // Scrub through the board API exactly as portal.mjs does (board.press with client coords): legs of 60 px, ~330 ms apart.
 await page.evaluate(()=>{window.scrubTo=async(legs,{x0=60,y0=170,leg=60,gap=220}={})=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  board.press(1,x0,y0);for(let k=0;k<legs;k++){for(let j=1;j<=4;j++){board.press(1,x0+(k%2?leg-leg/4*j:leg/4*j),y0+(k%3)*4);await sleep(gap/4);}if(window.stopWhenFire&&myr5Wood.state().stage==='fire')break;}};});
 await page.evaluate('scrubTo(6)');await snap('1-heat-a');console.log('rs',JSON.stringify(await page.evaluate('myr5Wood.state().rs.claimId')));await page.evaluate(()=>{window.stopWhenFire=true;return scrubTo(40);});await snap('1-heat-b');
 console.log('heat',JSON.stringify(await page.evaluate('myr5Wood.state().heat')));
 console.log('claimed during scrub',await page.evaluate('myr5Wood.state().rs.claimId'));
 await page.evaluate('board.release(1)');console.log('claims after lift',await page.evaluate('(board.claims||wood.claims)(1)'),await page.evaluate('myr5Wood.state().stage'));
 await wait(250);await snap('2-fire-start');await wait(1800);await snap('3-fire');await wait(1500);await snap('4-fire-full');
 await page.mouse.click(260,520);await wait(250);await snap('5-steam');await wait(900);await snap('6-ash');
 await wait(900);await snap('7-crumble-a');await wait(900);await snap('8-crumble-b');await wait(1200);await snap('9-crumble-c');
 await wait(1800);await snap('10-gone');
 console.log('secrets',JSON.stringify(await page.evaluate('secrets')),'errors',JSON.stringify(await page.evaluate('errors')),'console',JSON.stringify(logs.slice(0,8)));
 await browser.close();
}
