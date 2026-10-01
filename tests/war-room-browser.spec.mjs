import {test,expect} from 'playwright/test';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';

const root=resolve(import.meta.dirname,'..');let server,base,unlocked=false;
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css'};
test.use({channel:'msedge'});test.describe.configure({mode:'serial'});
test.beforeAll(async()=>{server=http.createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
 if(path==='/api/auth/config'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({enabled:false}));return;}
 if(path==='/api/account'){if(!unlocked){res.writeHead(401,{'Content-Type':'application/json'});res.end('{}');return;}res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({user:{id:'browser-user'},entitlements:{}}));return;}
 if(path==='/api/war-room'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({targetAccountId:'browser-user',dataEpoch:1,state:{loadout:{type:'rapier',tier:0},recipes:[],revision:0,updatedAt:null}}));return;}
 if(path==='/api/gala/install-draft'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({data:null}));return;}
 if(path==='/api/gala/leaderboard'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({items:[{rank:1,djName:'TEST DJ · 123',durationMs:61000}]}));return;}
 try{const file=await readFile(resolve(root,'.'+(path==='/war-room/'?'/war-room/index.html':path)));res.writeHead(200,{'Content-Type':mime[extname(path)]||'text/html'});res.end(file);}catch{res.writeHead(path==='/pose.html'?200:404,{'Content-Type':'text/html'});res.end('<!doctype html><title>Coach</title>');}});await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}`;});
 test.afterAll(()=>new Promise(done=>server.close(done)));
 test('signed-out deep link shows the room while saved account data needs sign-in',async({page})=>{
  unlocked=false;const requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));
  await page.goto(base+'/war-room/');await expect(page.locator('h1')).toHaveText('WAR ROOM');
  await expect(page.locator('#access')).toHaveText('Public War Room');
  await expect(page.locator('#leaderRows tr')).toHaveCount(1);
  await expect(page.locator('#saveLoadout')).toBeDisabled();
  await expect(page.locator('#arsenalStatus')).not.toContainText('Coach Army');
  await expect(page.locator('#lookTitle, #lookPreview, #lookPortal, #lookFrame, #lookStrip, #lookBoards, #lookReset')).toHaveCount(0);
  expect(requests).not.toContain('/modules/portal/portal-look.mjs');
  expect(requests).toContain('/war-room/war-room.mjs');
  expect(requests).toContain('/war-room/war-room.css');
  expect(requests).toContain('/api/gala/leaderboard');
  expect(requests).not.toContain('/api/war-room');
  expect(requests).not.toContain('/api/gala/install-draft');
  await expect.poll(()=>requests).toContain('/war-room/gala-bay.js');
  expect(requests).not.toContain('/creature/index.html');
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe('/war-room/');
 }); test('signed-in deep link, with no Coach Army entitlement, loads scaffold and existing read seams',async({page})=>{unlocked=true;const requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));await page.goto(base+'/war-room/');await expect(page.locator('h1')).toHaveText('WAR ROOM');await expect(page.locator('#leaderRows tr')).toHaveCount(1);expect(requests).toContain('/war-room/war-room.mjs');expect(requests).toContain('/api/gala/install-draft');expect(requests).toContain('/api/gala/leaderboard');await expect.poll(()=>requests).toContain('/war-room/gala-bay.js');expect(requests).not.toContain('/creature/index.html');});
