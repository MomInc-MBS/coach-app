// Vault L1 (pond secret) review harness: node scripts/vault-l1-preview.cjs  (serves :8902) then drives it with Playwright
// when run with --shots (writes .vault/shots/l1-*.png). Debug hooks: pond.forceBig(), pond.debug().
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.VAULT_L1_PORT)||8902;
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#06110f;overflow:hidden}#board{position:absolute;inset:0 15px 100px 15px;touch-action:none}</style><script>
// virtual clock: rAF callbacks only run inside advance(ms) so slow software-GL screenshots cannot skew the hold timing
(()=>{let V=performance.now(),q=[];performance.now=()=>V;window.requestAnimationFrame=cb=>{q.push(cb);return q.length;};window.cancelAnimationFrame=()=>{};
window.advance=ms=>{const end=V+ms;while(V<end){V+=1000/30;const c=q;q=[];for(const f of c)f(V);}};})();
</script><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script></head><body><div id="board"></div><script type="module">
import {createGlbBoard} from '/modules/portal/portal-board-glb.mjs';import {pond} from '/modules/portal/portal-board-pond.mjs';
window.errors=[];window.secrets=0;window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('myr5:portal-secret',e=>{secrets++;window.secretBoard=e.detail.board;});
const host=document.querySelector('#board');window.pond=pond;
try{window.board=await createGlbBoard(host,{effect:pond});
const rel=e=>{const r=host.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
host.onpointerdown=e=>{host.setPointerCapture(e.pointerId);board.press(e.pointerId,...rel(e));};host.onpointermove=e=>{if(host.hasPointerCapture(e.pointerId))board.press(e.pointerId,...rel(e));};host.onpointerup=host.onpointercancel=e=>board.release(e.pointerId);
window.bigXY=()=>{const f=board.faceRect(),b=pond.debug().big;const r=host.getBoundingClientRect();return [r.left+f.left+b.x*f.width,r.top+f.top+b.y*f.width];};
window.ready=true;}catch(e){errors.push(e.stack);}
</script></body></html>`;
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}try{const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');const data=await fs.readFile(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}}).listen(port,'127.0.0.1',()=>console.log('Vault L1 preview http://127.0.0.1:'+port));
if(process.argv.includes('--shots'))(async()=>{
 const {chromium}=require('playwright'),sleep=ms=>new Promise(r=>setTimeout(r,ms));await fs.mkdir(path.join(root,'.vault/shots'),{recursive:true});
 const b=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']}),ctx=await b.newContext({viewport:{width:375,height:812},hasTouch:true,deviceScaleFactor:1}),pg=await ctx.newPage();
 const logs=[];pg.on('console',m=>logs.push(m.type()+': '+m.text()));pg.on('pageerror',e=>logs.push('pageerror: '+e.message));
 await pg.goto('http://127.0.0.1:'+port+'/');await pg.waitForFunction(()=>window.ready||window.errors.length,null,{timeout:60000});
 const shot=n=>pg.screenshot({path:path.join(root,'.vault/shots/l1-'+n+'.png')}),dbg=()=>pg.evaluate(()=>{const d=pond.debug();return {sec:d.sec,phase:d.phase,e:d.an&&+d.an.e.toFixed(2),pitch:d.an&&+d.an.pitch.toFixed(2)};});
 const adv=async ms=>{for(;ms>0;ms-=200)await pg.evaluate(m=>advance(m),Math.min(200,ms));},start=async()=>{await pg.evaluate(()=>pond.forceBig());await adv(1800);};
 // 1) full hold: shots at 0 / .7 / 1.4 / 2.0 s of hold, then the splash
 await start();await shot('0-big');let [x,y]=await pg.evaluate(()=>bigXY());await pg.mouse.move(x,y);await pg.mouse.down();await adv(34);
 for(const [t,n] of [[0,'0'],[700,'0.7'],[700,'1.4'],[400,'1.8']]){await adv(t);await shot('hold-'+n);console.log('hold',n,await dbg());}
 for(const [t,n] of [[100,'splash-a'],[250,'splash-b'],[250,'splash-c'],[400,'splash-d'],[500,'splash-e']]){await adv(t);await shot(n);console.log(n,await dbg());}
 await pg.mouse.up();await adv(1500);console.log('after splash',await dbg(),'secrets',await pg.evaluate(()=>[secrets,secretBoard]));await shot('after');
 // 2) early lift -> bored
 await start();[x,y]=await pg.evaluate(()=>bigXY());await pg.mouse.move(x,y);await pg.mouse.down();await adv(1100);await pg.mouse.up();
 for(const [t,n] of [[150,'a'],[600,'b'],[700,'c'],[900,'d'],[1500,'e']]){await adv(t);await shot('bored-'+n);console.log('bored',n,await dbg());}
 await adv(3000);console.log('bored end',await dbg(),'secrets',await pg.evaluate(()=>secrets));
 // 3) press elsewhere while big: no secret
 await start();await pg.mouse.move(40,60);await pg.mouse.down();await adv(2300);console.log('miss',await dbg(),'secrets',await pg.evaluate(()=>secrets));await pg.mouse.up();
 console.log('errors',await pg.evaluate(()=>errors),logs.filter(l=>!/^log|^info|^debug/.test(l)));await b.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
