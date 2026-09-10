import {fail} from './domain.mjs';
const checkpoints={djscratch:'dj_at',goon:'gala_at',lilboyfriend:'lil_at',corgi:'corgi_at',hand:'hand_at',armie:'armie_at'};
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const safe=row=>({id:row.id,startedAt:row.started_at,completedAt:row.completed_at,durationMs:row.duration_ms,installedAt:row.installed_at,joinedAt:row.joined_at,djName:row.dj_name,moniker:row.moniker,completed:Object.entries(checkpoints).filter(([,column])=>row[column]!=null).map(([name])=>name)});
export function galaName(value){const base=String(value?.base||'').trim(),moniker=String(value?.moniker||'').trim().toUpperCase();if(!/^[A-Z0-9 ]{2,48}$/i.test(base)||!/^[A-Z0-9]{3}$/.test(moniker))fail('Choose a DJ name and a three-character moniker.');return {name:`${base} · ${moniker}`,moniker};}
export async function galaApi(request,database,readBody){
 const url=new URL(request.url),origin=request.headers.get('Origin'),self=url.origin,allowed=origin===self||origin==='https://mominc.online'||origin==='https://www.mominc.online'||(!origin&&request.method==='GET');
 const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...(allowed&&origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}:{})}});
 try{
  if(request.method==='OPTIONS')return allowed?new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin'}}):response({error:'Open this from MOM Inc.'},403);
  const path=url.pathname,method=request.method,now=Date.now();
  if(path==='/api/gala/install-draft'){
   if((method==='POST'&&origin!==self)||(origin&&origin!==self))fail('Open this from Coach.',403);
   let id,token;
   if(method==='POST'){const data=await readBody(request);id=data.id;token=data.token;}
   else if(method==='GET'){const saved=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-gala-run='))?.split('=')[1];[id,token]=(saved||'').split('.');if(!saved)return response({data:null});}
   else fail('Action unavailable.',405);
   if(!/^[0-9a-f-]{36}$/.test(id||'')||!/^[a-f0-9]{64}$/.test(token||''))fail('Invalid Gala invitation.');
   const row=await database.prepare('SELECT * FROM gala_runs WHERE id=? AND token_hash=?').bind(id,await hash(token)).first();if(!row)fail('Run not found.',404);
   const result=response({data:{version:1,id,token}});if(method==='POST')result.headers.set('Set-Cookie',`__Host-gala-run=${id}.${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800`);return result;
  }
  if(path==='/api/gala/leaderboard'&&method==='GET'){
   const rows=await database.prepare('SELECT dj_name AS djName,moniker,duration_ms AS durationMs,joined_at AS joinedAt FROM gala_runs WHERE joined_at IS NOT NULL ORDER BY duration_ms ASC,joined_at ASC LIMIT 100').all();
   return response({items:rows.results.map((row,i)=>({...row,rank:i+1}))});
  }
  if(!allowed)fail('Open this action from MOM Inc or Coach.',403);
  if(path==='/api/gala/runs'&&method==='POST'){
   const creator=await hash(request.headers.get('CF-Connecting-IP')||'local');
   const recent=await database.prepare('SELECT COUNT(*) AS total FROM gala_runs WHERE creator=? AND started_at>?').bind(creator,now-3600000).first();if(recent.total>=12)fail('Please wait before starting another ranked run.',429);
   const id=crypto.randomUUID(),token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
   await database.prepare('INSERT INTO gala_runs(id,token_hash,creator,started_at) VALUES(?,?,?,?)').bind(id,await hash(token),creator,now).run();
   return response({id,token,startedAt:now},201);
  }
  const match=path.match(/^\/api\/gala\/runs\/([0-9a-f-]{36})(?:\/(checkpoint|install|join|moniker))?$/i);if(!match)fail('Run not found.',404);
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token||!/^[a-f0-9]{64}$/.test(token))fail('Open the run on the device where you started it.',401);
  const row=await database.prepare('SELECT * FROM gala_runs WHERE id=? AND token_hash=?').bind(match[1],await hash(token)).first();if(!row)fail('Run not found.',404);
  if(!match[2]&&method==='GET')return response(safe(row));
  if(method!=='POST')fail('Action unavailable.',405);
  const data=await readBody(request);
  if(match[2]==='checkpoint'){
   if(row.joined_at)return response(safe(row));
   const column=checkpoints[data.stage];if(!column)fail('Unknown run milestone.');
   if(data.stage==='djscratch'){
    const name=galaName(data);if(row.dj_at&&row.dj_name!==name.name)fail('Your DJ identity is already attached to this run.',409);
    await database.prepare('UPDATE gala_runs SET dj_at=COALESCE(dj_at,?),dj_name=?,moniker=? WHERE id=?').bind(now,name.name,name.moniker,row.id).run();
   }else{
    if(data.stage==='armie'&&(!row.dj_at||!row.lil_at||!row.corgi_at||!row.gala_at||!row.hand_at))fail('Finish all four character pages, including the Gala, and your hand before Coach Armie.',409);
    await database.prepare(`UPDATE gala_runs SET ${column}=COALESCE(${column},?) WHERE id=?`).bind(now,row.id).run();
   }
   await database.prepare('UPDATE gala_runs SET completed_at=?,duration_ms=?-started_at WHERE id=? AND completed_at IS NULL AND dj_at IS NOT NULL AND gala_at IS NOT NULL AND lil_at IS NOT NULL AND corgi_at IS NOT NULL AND hand_at IS NOT NULL AND armie_at IS NOT NULL').bind(now,now,row.id).run();
  }else if(match[2]==='moniker'){
   if(!row.dj_at||row.joined_at)fail('Change your moniker before joining the rankings.',409);
   const next=galaName({base:row.dj_name.split(' · ')[0],moniker:data.moniker}),duplicate=await database.prepare('SELECT id FROM gala_runs WHERE public_name=? AND id<>?').bind(next.name.toUpperCase(),row.id).first();
   if(duplicate)fail('That name and moniker are taken. Try another three characters.',409);
   await database.prepare('UPDATE gala_runs SET dj_name=?,moniker=? WHERE id=? AND joined_at IS NULL').bind(next.name,next.moniker,row.id).run();
  }else if(match[2]==='install'){
   if(origin!==self||data.installed!==true)fail('Open the installed MYR5 app to save your run.',403);
   await database.prepare('UPDATE gala_runs SET installed_at=COALESCE(installed_at,?) WHERE id=?').bind(now,row.id).run();
  }else if(match[2]==='join'){
   if(data.confirm!==true)fail('Choose Join the rankings to show your DJ name and time.');
   if(!row.completed_at||!row.installed_at)fail('Complete DJ Scratch, the Gala and Armie, then get the app.',409);
   if(!row.joined_at){
    const nameKey=row.dj_name.toUpperCase(),duplicate=await database.prepare('SELECT id FROM gala_runs WHERE public_name=? AND id<>?').bind(nameKey,row.id).first();
    if(duplicate)fail('That DJ name and moniker are already on the board. This run stays saved on your device.',409);
    try{await database.prepare('UPDATE gala_runs SET joined_at=?,public_name=? WHERE id=? AND joined_at IS NULL').bind(now,nameKey,row.id).run();}catch(error){if(/UNIQUE constraint/i.test(error.message))fail('That DJ name and moniker are already on the board.',409);throw error;}
   }
  }
  return response(safe(await database.prepare('SELECT * FROM gala_runs WHERE id=?').bind(row.id).first()));
 }catch(error){if(!error.status)console.error('Gala request failed',error.message);return response({error:error.status?error.message:'The Gala terminal could not connect. Try again.'},error.status||500);}
}
