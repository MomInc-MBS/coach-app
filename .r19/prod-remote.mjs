import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const url='https://myr5.mominc.online',prev=JSON.parse(await readFile('C:/Users/ianmy/Documents/Codex/2026-09-30/okay-we-need-to-diagnose-some/outputs/pod-ship-staging-remote.json','utf8'));
const extra=['meditation.mjs','breathing.mjs','breathing-modes.mjs','meditation.css','pod/worlds/meditation-waterfall.png','scoreboard.mjs','achievements-board.mjs','modules/portal/portal.css','modules/portal/portal.mjs','modules/portal/standalone-housing.css','camera-workout.css','coach-overlay.mjs','movement-rules.mjs','coach-hub.mjs','battle-pass-rewards.mjs','reward-packs.mjs','creature/assets/editor.js','creature/assets/phone.js','creature/index.html','creature/creature.css','war-room/gala-bay.js','war-room/war-room.css','coach-net.mjs','modules/portal/portal-peek.mjs','modules/portal/standalone-housing.mjs','modules/portal/standalone-housing.css','camera-workout.css','hologram.mjs','robot-audio.mjs','coach.mjs','camera-workout.mjs','app.mjs','modules/portal/portal-board-cogs.mjs','modules/portal/portal-board.mjs','modules/portal/portal.mjs','release-info.mjs'];
const paths=[...new Set([...prev.checked.map(c=>c.path),...extra])];const sha=b=>createHash('sha256').update(b).digest('hex');
const build_id=(await readFile('dist/client/release-build.mjs','utf8')).match(/'(\w+)'/)[1];
const checked=[];for(const path of paths){let local=null;try{local=await readFile('dist/client/'+path);}catch{}
 const r=await fetch(url+'/'+path,{cache:'no-store'}),b=Buffer.from(await r.arrayBuffer());checked.push({path,status:r.status,bytes:b.length,sha256:sha(b),match:local?sha(local)===sha(b):null,local:!!local});}
const api={};for(const p of ['health','api/auth/config']){const r=await fetch(url+'/'+p);api[p]={status:r.status,cache_control:r.headers.get('cache-control'),body:await r.json()};}
const home=await fetch(url+'/');const html=await home.text();
const out={url,build_id,checked,api,home:{status:home.status,bytes:html.length}};
await writeFile('.r19/release19-production-remote.json',JSON.stringify(out,null,2));
console.log({matched:checked.filter(c=>c.match).length,mismatched:checked.filter(c=>c.match===false).map(c=>c.path),notLocal:checked.filter(c=>!c.local).map(c=>c.path+':'+c.status),api:JSON.stringify(api),home:out.home});

