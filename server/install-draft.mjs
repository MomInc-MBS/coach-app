import {validIncomingCoach} from '../pending-coach.mjs';
import {fail} from './domain.mjs';
const COOKIE='__Host-coach-install',LIFETIME=3600000;
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const tokenFrom=request=>request.headers.get('Cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
const cookie=(token,age=3600)=>`${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
const json=(data,header)=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(header?{'Set-Cookie':header}:{})}});
export async function installDraft(request,database,readBody,now=Date.now()){
 const token=tokenFrom(request),key=/^[a-f0-9]{64}$/.test(token)?await hash(token):null;
 if(request.method==='GET'){
  const row=key?await database.prepare('SELECT data FROM install_drafts WHERE token_hash=? AND expires_at>?').bind(key,now).first():null;
  return json({data:row?JSON.parse(row.data):null});
 }
 if(request.method==='DELETE'){
  if(key)await database.prepare('DELETE FROM install_drafts WHERE token_hash=?').bind(key).run();
  return json({cleared:true},cookie('',0));
 }
 if(request.method!=='POST')fail('Method not allowed.',405);
 const {data}=await readBody(request),raw=JSON.stringify(data);
 if(!validIncomingCoach(data))fail('Return to the creature studio and choose your coach again.');
 if(new TextEncoder().encode(raw).length>55000)fail('Your saved coach is too large.',413);
 const creator=await hash(request.headers.get('CF-Connecting-IP')||'local');
 const next=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 const results=await database.batch([
  database.prepare('DELETE FROM install_drafts WHERE expires_at<=? OR token_hash=?').bind(now,key||''),
  database.prepare('INSERT INTO install_drafts(token_hash,data,creator,expires_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM install_drafts WHERE creator=?)<20 RETURNING token_hash').bind(await hash(next),raw,creator,now+LIFETIME,creator)
 ]);
 if(!results[1].results?.length)fail('Please wait before preparing another coach.',429);
 // Safari copies first-party cookies into newly installed apps; personal answers stay out of URLs.
 return json({ready:true},cookie(next));
}
