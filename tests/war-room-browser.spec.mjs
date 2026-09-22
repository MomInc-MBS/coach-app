import {test,expect} from 'playwright/test';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';

const root=resolve(import.meta.dirname,'..');let server,base,unlocked=false;
const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css'};
test.use({channel:'msedge'});test.describe.configure({mode:'serial'});
test.beforeAll(async()=>{server=http.createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
 if(path==='/api/auth/config'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({enabled:false}));return;}
 if(path==='/api/account'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({entitlements:{coachArmy:unlocked?{status:'completed',completedAt:1700000000000}:null}}));return;}
 if(path==='/api/war-room'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({targetAccountId:'browser-user',dataEpoch:1,state:{loadout:{type:'rapier',tier:0},recipes:[],revision:0,updatedAt:null}}));return;}
 if(path==='/api/gala/install-draft'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({data:null}));return;}
 if(path==='/api/gala/leaderboard'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({items:[{rank:1,djName:'TEST DJ · 123',durationMs:61000}]}));return;}
 try{const file=await readFile(resolve(root,'.'+(path==='/war-room/'?'/war-room/index.html':path)));res.writeHead(200,{'Content-Type':mime[extname(path)]||'text/html'});res.end(file);}catch{res.writeHead(path==='/pose.html'?200:404,{'Content-Type':'text/html'});res.end('<!doctype html><title>Coach</title>');}});await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}`;});
 test.afterAll(()=>new Promise(done=>server.close(done)));
 test('locked deep link reveals no War Room hints and loads no route resources',async({page})=>{unlocked=false;const requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));await page.goto(base+'/war-room/');await page.waitForTimeout(100);expect(requests).not.toContain('/war-room/war-room.mjs');expect(requests).not.toContain('/war-room/war-room.css');expect(requests.filter(p=>p.startsWith('/war-room/')&&p!='/war-room/')).toEqual([]);});
 test('unlocked deep link loads scaffold and existing read seams',async({page})=>{unlocked=true;const requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));await page.goto(base+'/war-room/');await expect(page.locator('h1')).toHaveText('WAR ROOM');await expect(page.locator('#leaderRows tr')).toHaveCount(1);expect(requests).toContain('/war-room/war-room.mjs');expect(requests).toContain('/api/gala/install-draft');expect(requests).toContain('/api/gala/leaderboard');});
