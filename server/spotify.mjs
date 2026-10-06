import {SPOTIFY_SCOPES,spotifyNowPlaying,spotifyPlaylist} from '../spotify-domain.mjs';
import {inspectAccountDataEpoch} from './account-data-epochs.mjs';
import {epochFencedBatch} from './remote-epochs.mjs';

const API='https://api.spotify.com/v1';
const ACCOUNTS='https://accounts.spotify.com';
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const error=(message,status=400,code='spotify_error')=>Object.assign(new Error(message),{status,code});
const bytes=n=>crypto.getRandomValues(new Uint8Array(n));
const b64=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const from64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const hash=async s=>b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
const secret=async env=>{
  if(!env.SPOTIFY_TOKEN_KEY||env.SPOTIFY_TOKEN_KEY.length<32)throw error('Spotify token encryption is not configured.',503,'spotify_unconfigured');
  return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.SPOTIFY_TOKEN_KEY)),'AES-GCM',false,['encrypt','decrypt']);
};
const encrypt=async(env,value)=>{const iv=bytes(12),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await secret(env),new TextEncoder().encode(value));return `${b64(iv)}.${b64(new Uint8Array(cipher))}`;};
const decrypt=async(env,value)=>{const [iv,cipher]=String(value).split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(iv)},await secret(env),from64(cipher)));};
const config=env=>{
  if(!env.SPOTIFY_CLIENT_ID||!env.SPOTIFY_REDIRECT_URI)throw error('Spotify connection is not configured.',503,'spotify_unconfigured');
  const uri=new URL(env.SPOTIFY_REDIRECT_URI);
  if(uri.pathname!=='/api/spotify/callback'||!['https:','http:'].includes(uri.protocol))throw error('Spotify redirect URI is invalid.',503,'spotify_unconfigured');
  return uri;
};
const cookie=(value,request)=>`spotify_oauth=${value}; Path=/api/spotify/callback; HttpOnly; SameSite=Lax; Max-Age=${value?600:0}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
const cookieValue=request=>request.headers.get('Cookie')?.match(/(?:^|;\s*)spotify_oauth=([A-Za-z0-9_-]{32,128})(?:;|$)/)?.[1]||null;
const noStoreRedirect=(to,request,clear=false)=>new Response(null,{status:303,headers:{Location:to,'Cache-Control':'no-store',...(clear?{'Set-Cookie':cookie('',request)}:{})}});
const safeResult=(kind,request)=>noStoreRedirect(`/pose.html?panel=spotify&spotify=${kind}`,request,true);
const postToken=async(env,form)=>{
  const response=await fetch(`${ACCOUNTS}/api/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...form,client_id:env.SPOTIFY_CLIENT_ID}),signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw error(data.error==='invalid_grant'?'Spotify authorization expired. Connect again.':'Spotify authorization is unavailable.',response.status===429?429:502,data.error==='invalid_grant'?'spotify_reconnect':'spotify_upstream');
  if(!data.access_token||!data.expires_in)throw error('Spotify authorization returned incomplete data.',502,'spotify_upstream');
  return data;
};

// This callback is the sole route that runs before the app's normal account identity check.
// State is consumed atomically; the separate HttpOnly cookie binds the redirect to its starter.
export async function spotifyCallback(request,env,database) {
  try {
    config(env);await secret(env);
    if(request.method!=='GET')return json({error:'Method not allowed.'},405);
    const u=new URL(request.url),state=u.searchParams.get('state'),proof=cookieValue(request);
    if(!state||!proof||!await validState(database,state,proof))return safeResult(state&&!proof&&await stateExists(database,state)?'browser':'expired',request);
    const row=await database.prepare('DELETE FROM spotify_oauth_states WHERE state_hash=? AND cookie_hash=? AND expires_at>? RETURNING user_id,verifier_enc,data_epoch').bind(await hash(state),await hash(proof),Date.now()).first();
    if(!row)return safeResult('expired',request);
    if(u.searchParams.has('error'))return safeResult('denied',request);
    const code=u.searchParams.get('code');if(!code)return safeResult('expired',request);
    const token=await postToken(env,{grant_type:'authorization_code',code,redirect_uri:env.SPOTIFY_REDIRECT_URI,code_verifier:await decrypt(env,row.verifier_enc)});
    if(!token.refresh_token)return safeResult('failed',request);
    const me=await fetch(`${API}/me`,{headers:{Authorization:`Bearer ${token.access_token}`},signal:AbortSignal.timeout(15000)});
    // Development-mode apps answer 403 for any Spotify account not on the dashboard user allowlist.
    if(me.status===403)return safeResult('notlisted',request);
    if(!me.ok)return safeResult('failed',request);
    const profile=await me.json();if(!profile.id)return safeResult('failed',request);
    await epochFencedBatch(database,{ownerId:row.user_id,expectedDataEpoch:row.data_epoch,now:Date.now(),statements:[database.prepare(`INSERT INTO spotify_connections(user_id,spotify_user_id,display_name,access_token_enc,refresh_token_enc,expires_at,scopes,data_epoch,updated_at) VALUES(?,?,?,?,?,?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET spotify_user_id=excluded.spotify_user_id,display_name=excluded.display_name,access_token_enc=excluded.access_token_enc,refresh_token_enc=excluded.refresh_token_enc,expires_at=excluded.expires_at,scopes=excluded.scopes,data_epoch=excluded.data_epoch,updated_at=excluded.updated_at`)
      .bind(row.user_id,profile.id,profile.display_name||profile.id,await encrypt(env,token.access_token),await encrypt(env,token.refresh_token),Date.now()+token.expires_in*1000,token.scope||SPOTIFY_SCOPES,row.data_epoch,Date.now())]});
    return safeResult('connected',request);
  } catch {return safeResult('failed',request);}
}
async function validState(database,state,proof){
  if(!/^[A-Za-z0-9_-]{32,128}$/.test(state))return false;
  const row=await database.prepare('SELECT 1 AS ok FROM spotify_oauth_states WHERE state_hash=? AND cookie_hash=? AND expires_at>?').bind(await hash(state),await hash(proof),Date.now()).first();
  return !!row;
}
// A real state with no cookie means the return landed in a different browser jar (iOS Home Screen app vs Safari).
async function stateExists(database,state){
  if(!/^[A-Za-z0-9_-]{32,128}$/.test(state))return false;
  return !!await database.prepare('SELECT 1 AS ok FROM spotify_oauth_states WHERE state_hash=? AND expires_at>?').bind(await hash(state),Date.now()).first();
}
async function connection(database,user){const proof=await inspectAccountDataEpoch(database,user);return database.prepare('SELECT * FROM spotify_connections WHERE user_id=? AND data_epoch=?').bind(user,proof.currentDataEpoch).first();}
async function access(env,database,user){
  let row=await connection(database,user);if(!row)throw error('Connect Spotify first.',409,'spotify_disconnected');
  if(row.expires_at>Date.now()+60000)return decrypt(env,row.access_token_enc);
  let token;
  try{token=await postToken(env,{grant_type:'refresh_token',refresh_token:await decrypt(env,row.refresh_token_enc)});}
  catch(e){if(e.code==='spotify_reconnect')try{await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:row.data_epoch,now:Date.now(),statements:[database.prepare('DELETE FROM spotify_connections WHERE user_id=? AND data_epoch=? AND refresh_token_enc=?').bind(user,row.data_epoch,row.refresh_token_enc)]});}catch{}throw e;}
  await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:row.data_epoch,now:Date.now(),statements:[database.prepare('UPDATE spotify_connections SET access_token_enc=?,refresh_token_enc=?,expires_at=?,updated_at=? WHERE user_id=? AND data_epoch=?')
    .bind(await encrypt(env,token.access_token),token.refresh_token?await encrypt(env,token.refresh_token):row.refresh_token_enc,Date.now()+token.expires_in*1000,Date.now(),user,row.data_epoch)]});
  return token.access_token;
}
async function spotifyFetch(env,database,user,path,{method='GET',body}={}){
  const readEpoch=(await inspectAccountDataEpoch(database,user)).currentDataEpoch;
  const response=await fetch(API+path,{method,headers:{Authorization:`Bearer ${await access(env,database,user)}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  if((await inspectAccountDataEpoch(database,user)).currentDataEpoch!==readEpoch)throw error('Account data changed.',409,'target_epoch_mismatch');
  if(response.status===204||response.status===202)return null;
  if(response.status===429)throw error('Spotify is busy. Try again shortly.',429,'spotify_rate_limited');
  if(response.status===403)throw error('Spotify Premium or app access is needed for this control.',403,'spotify_restricted');
  if(response.status===404)throw error('Open Spotify on a device, then try this control.',409,'spotify_no_device');
  if(response.status===401)throw error('Spotify session expired. Reconnect Spotify.',401,'spotify_reconnect');
  if(!response.ok)throw error('Spotify is temporarily unavailable.',502,'spotify_upstream');
  return response.json().catch(()=>null);
}
async function readBody(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw error('Send JSON.',415);
  const length=Number(request.headers.get('Content-Length')||0);if(length>2048)throw error('Request too large.',413);
  const text=await request.text();if(text.length>2048)throw error('Request too large.',413);
  try{return JSON.parse(text);}catch{throw error('Invalid request.');}
}
export async function spotifyApi(request,env,database,user){
  try{
    config(env);await secret(env);
    const u=new URL(request.url),p=u.pathname,m=request.method;
    if(!user)throw error('Sign in to Coach.',401,'unauthorized');
    if(!['GET','HEAD'].includes(m)&&request.headers.get('Origin')!==u.origin)throw error('Open this action from Coach.',403,'origin_required');
    let writeEpoch=null;
    if(!['GET','HEAD'].includes(m)){
      const expected=request.headers.get('X-Expected-Data-Epoch');
      if(request.headers.get('X-Target-Account')!==user||!expected||!/^[1-9][0-9]*$/.test(expected))throw error('Refresh account details before connecting Spotify.',428,'account_assertion_required');
      writeEpoch=Number(expected);
      if(!Number.isSafeInteger(writeEpoch)||(await inspectAccountDataEpoch(database,user)).currentDataEpoch!==writeEpoch)throw error('Account data changed.',409,'target_epoch_mismatch');
    }
    if(p==='/api/spotify/status'&&m==='GET'){
      const row=await connection(database,user);
      return json({configured:true,connected:!!row,account:row?{name:row.display_name,id:row.spotify_user_id}:null});
    }
    if(p==='/api/spotify/connect'&&m==='POST'){
      const state=b64(bytes(32)),proof=b64(bytes(32)),verifier=b64(bytes(64)),challenge=await hash(verifier);
      await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:writeEpoch,now:Date.now(),statements:[
        database.prepare('DELETE FROM spotify_oauth_states WHERE user_id=? OR expires_at<?').bind(user,Date.now()),
        database.prepare('INSERT INTO spotify_oauth_states(state_hash,cookie_hash,user_id,verifier_enc,data_epoch,expires_at) VALUES(?,?,?,?,?,?)')
          .bind(await hash(state),await hash(proof),user,await encrypt(env,verifier),writeEpoch,Date.now()+600000),
      ]});
      const auth=new URL(`${ACCOUNTS}/authorize`);
      auth.search=new URLSearchParams({client_id:env.SPOTIFY_CLIENT_ID,response_type:'code',redirect_uri:env.SPOTIFY_REDIRECT_URI,scope:SPOTIFY_SCOPES,state,code_challenge_method:'S256',code_challenge:challenge}).toString();
      return json({url:auth.href},200,{'Set-Cookie':cookie(proof,request)});
    }
    if(p==='/api/spotify/disconnect'&&m==='POST'){
      await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:writeEpoch,now:Date.now(),statements:[database.prepare('DELETE FROM spotify_connections WHERE user_id=?').bind(user),database.prepare('DELETE FROM spotify_oauth_states WHERE user_id=?').bind(user)]});
      return json({connected:false});
    }
    if(p==='/api/spotify/now-playing'&&m==='GET')return json({nowPlaying:spotifyNowPlaying(await spotifyFetch(env,database,user,'/me/player'))});
    if(p==='/api/spotify/playlists'&&m==='GET'){
      const offset=Math.max(0,Math.min(1000,Number.parseInt(u.searchParams.get('offset')||'0',10)||0));
      const data=await spotifyFetch(env,database,user,`/me/playlists?limit=20&offset=${offset}`);
      return json({items:(data?.items||[]).map(spotifyPlaylist),total:Number(data?.total)||0,offset});
    }
    if(p==='/api/spotify/playback'&&m==='POST'){
      const input=await readBody(request),action=input?.action;
      if(!['pause','resume','next','previous','playlist'].includes(action))throw error('Unknown playback control.',422);
      let path='/me/player/',method='POST',body;
      if(action==='pause'){path+='pause';method='PUT';}
      if(action==='resume'){path+='play';method='PUT';}
      if(action==='next')path+='next';
      if(action==='previous')path+='previous';
      if(action==='playlist'){
        if(!/^[A-Za-z0-9]{10,32}$/.test(input.playlistId||''))throw error('Choose a valid playlist.',422);
        path+='play';method='PUT';body={context_uri:`spotify:playlist:${input.playlistId}`};
      }
      await spotifyFetch(env,database,user,path,{method,body});return json({ok:true});
    }
    return json({error:'Not found.'},404);
  }catch(e){if(e.code==='target_epoch_mismatch')return json({error:'Account data changed.',code:e.code},409);return json({error:e.status?e.message:'Spotify is unavailable.',code:e.code||'spotify_error'},e.status||500);}
}
