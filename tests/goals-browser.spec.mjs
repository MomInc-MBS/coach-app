import {test,expect} from 'playwright/test';
import http from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {Miniflare} from 'miniflare';
import worker from '../server/worker.mjs';

const root=resolve(import.meta.dirname,'..');
const evidence=resolve(root,'../../outputs/P04G');
const mime=path=>({'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.glb':'model/gltf-binary'}[extname(path)]||'application/octet-stream');
let server,base,mf,env;
test.use({channel:'msedge'});
test.beforeAll(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});env={DB:await mf.getD1Database('DB'),LOCAL_PREVIEW:true};
 for(const file of (await readdir(resolve(root,'drizzle'))).filter(file=>file.endsWith('.sql')).sort()){
  const statements=(await readFile(resolve(root,'drizzle',file),'utf8')).split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean);
  await env.DB.batch(statements.map(sql=>env.DB.prepare(sql)));
 }
 server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://local');
  if(url.pathname.startsWith('/api/')){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','goals-browser-user');headers.set('oai-authenticated-user-email','goals-browser@test.example');
   const response=await worker.fetch(new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}),env);
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const file=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/pose.html':url.pathname));
  if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
  try{const body=await readFile(file);res.writeHead(200,{'Content-Type':mime(file),'Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{await new Promise(done=>server.close(done));await mf.dispose();});

async function openGoals(page,viewport,screenshot){
 await page.setViewportSize(viewport);await page.goto(base+'/pose.html?panel=account');
 await expect(page.getByRole('heading',{name:'Goals'})).toBeVisible();
 await page.screenshot({path:resolve(evidence,screenshot),fullPage:true});
}

test('authenticated Goals board supports keyboard create, reload, complete, reopen, and archive on phone',async({page})=>{
 await openGoals(page,{width:393,height:873},'goals-phone-initial.png');
 const title=page.getByRole('textbox',{name:'Title'}),note=page.getByRole('textbox',{name:'Note (optional)'});
 await title.focus();await page.keyboard.type('   ');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Enter');
 await expect(page.locator('#goalStatus')).toContainText('Could not save goal: Please check the highlighted information.');
 await title.fill('Walk after lunch');await note.fill('Ten calm minutes');await note.press('Tab');await page.keyboard.press('Enter');
 await expect(page.locator('.goal-entry')).toContainText('Walk after lunch');await expect(page.getByRole('button',{name:'Complete'})).toBeVisible();
 await page.getByRole('button',{name:'Complete'}).click();await expect(page.getByRole('button',{name:'Reopen'})).toBeVisible();
 await page.reload();await expect(page.getByRole('button',{name:'Reopen'})).toBeVisible();
 await page.getByRole('button',{name:'Reopen'}).click();await expect(page.getByRole('button',{name:'Complete'})).toBeVisible();
 await page.getByRole('button',{name:'Archive'}).click();await expect(page.locator('.goal-entry[data-status="archived"]')).toContainText('Walk after lunch');
 await page.screenshot({path:resolve(evidence,'goals-phone-archived.png'),fullPage:true});
});

test('authenticated Goals board remains visible and usable at desktop width',async({page})=>{
 await openGoals(page,{width:1440,height:900},'goals-desktop.png');
 await expect(page.locator('.goals-board')).toBeVisible();
 const submit=page.locator('#goalForm button');await submit.scrollIntoViewIfNeeded();await expect(submit).toBeVisible();
 await page.getByRole('textbox',{name:'Title'}).fill('Desktop planning');await submit.click();
 await expect(page.getByText('Desktop planning',{exact:true})).toBeVisible();
 await page.screenshot({path:resolve(evidence,'goals-desktop.png'),fullPage:true});
});
