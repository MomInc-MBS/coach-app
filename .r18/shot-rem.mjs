import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';import {chromium} from 'playwright';
const root=resolve('dist/client');const T={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
 if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
 try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();res.writeHead(200,{'Content-Type':T[extname(file)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true});const ctx=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block',reducedMotion:'reduce'});
await ctx.addInitScript(()=>{localStorage.setItem('myr5-recipe-v1',JSON.stringify({version:1,styles:{head:0,eye:0,collar:0,body:0,arms:0,feet:0},eye:'open',fur:1,iris:1,pupil:'round',pupilSize:1,detail:1,coach:'playful',fingers:4,toes:3,eyeLayout:'single',body:'myr5',headFrom:'myr5',armsFrom:'myr5',feetFrom:'myr5'}));});
const page=await ctx.newPage();page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.goto(base+'/pose.html#reminders');await page.waitForTimeout(4000);
console.log(await page.evaluate(()=>{const f=document.querySelector('.coach-reminder-plan');return f?('form found; personality='+f.elements.personality.value+' options='+f.elements.personality.options.length+' line='+f.querySelector('[data-personality-line]').textContent.slice(0,40)+' visible='+(f.offsetParent!==null)):'no form';}));
await page.evaluate(()=>{document.querySelector('.coach-reminder-plan')?.scrollIntoView({block:'center'});});await page.waitForTimeout(800);
await page.screenshot({path:'.frames/r18-f-reminders.png'});
// change personality: storage carries over
await page.evaluate(()=>{const s=document.querySelector('.coach-reminder-plan').elements.personality;s.value='calm';s.dispatchEvent(new Event('change'));});
console.log('stored coach after change:',await page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-recipe-v1')).coach));
await browser.close();server.close();
