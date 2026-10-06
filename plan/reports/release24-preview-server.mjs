// Local-only review fixture. No real accounts, workouts or provider tokens.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {completeCoach} from '../../tests/onboarding-fixture.mjs';
const root=resolve('dist/client');
const account={user:{id:'release24-review',email:'review@test.local',provider:'chatgpt'},dataEpoch:1,revision:0,profile:{},entitlements:{},progress:{completedSets:0,xp:0,level:1,unlocks:{},exerciseRoute:{groups:{}}},push:{environment:'preview',configured:false,schedulerActive:false},onboarding:{data:completeCoach(),revision:1,startDay:'2026-10-05',completedAt:1,targets:{day:1,date:'2026-10-05',reps:3,holdSeconds:9,proteinGrams:100,waterOz:100,goals:{}}}};
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.glb':'model/gltf-binary'};
createServer(async(req,res)=>{
 const path=new URL(req.url,'http://local').pathname;
 if(path.startsWith('/api/')){const data=path==='/api/account'?account:path==='/api/auth/config'?{enabled:false}:path==='/api/spotify/status'?{connected:false}:null;res.writeHead(data?200:401,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data||{error:'Local review fixture'}));return;}
 try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end();}
}).listen(Number(process.argv[2])||5214,'127.0.0.1',()=>console.log('Local release review server ready'));
