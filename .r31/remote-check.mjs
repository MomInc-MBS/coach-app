// node .r31/remote-check.mjs staging|prod — hash every dist/client file that the R20 checks covered, plus the cogs set, against the remote.
import {readFile,writeFile,readdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {join,sep} from 'node:path';
const env=process.argv[2]||'staging',url=env==='prod'?'https://myr5.mominc.online':'https://myr5-coach-staging.mominc-coach.workers.dev';
const sha=b=>createHash('sha256').update(b).digest('hex');
const build_id=(await readFile('dist/client/release-build.mjs','utf8')).match(/'(\w+)'/)[1];
const walk=async d=>(await Promise.all((await readdir(d,{withFileTypes:true})).map(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]))).flat();
const all=(await walk('dist/client')).map(p=>p.slice('dist/client/'.length).split(sep).join('/'));
const paths=all.filter(p=>/\.(mjs|js|css|html|webmanifest|json)$/.test(p)&&!p.includes('handborne/models')).concat(all.filter(p=>p.startsWith('pod/worlds/boards/cogs')||p==='pod/worlds/boards/cogs-poster.webp'));
const checked=[];for(const path of paths){const local=await readFile('dist/client/'+path);const r=await fetch(url+'/'+path,{cache:'no-store'});const b=Buffer.from(await r.arrayBuffer());checked.push({path,status:r.status,match:sha(local)===sha(b)});}
const api={};for(const p of ['health']){const r=await fetch(url+'/'+p);api[p]={status:r.status,body:await r.text()};}
const remoteBuild=(await (await fetch(url+'/release-build.mjs',{cache:'no-store'})).text()).match(/'(\w+)'/)?.[1];
await writeFile(`.r31/${env}-remote.json`,JSON.stringify({url,build_id,remoteBuild,checked,api},null,2));
console.log({env,build_id,remoteBuild,total:checked.length,matched:checked.filter(c=>c.match).length,mismatched:checked.filter(c=>!c.match).map(c=>c.path+':'+c.status).slice(0,20),health:api.health.status});
