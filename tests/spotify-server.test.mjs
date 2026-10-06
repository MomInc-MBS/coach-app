import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {spotifyApi,spotifyCallback} from '../server/spotify.mjs';

const env={SPOTIFY_CLIENT_ID:'client-id',SPOTIFY_REDIRECT_URI:'https://coach.example/api/spotify/callback',SPOTIFY_TOKEN_KEY:'test-only-encryption-key-at-least-32-characters'};
function db(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE account_data_epochs(owner_id TEXT PRIMARY KEY,epoch INTEGER NOT NULL,updated_at INTEGER NOT NULL);
    CREATE TABLE account_data_deletions(owner_id TEXT,deleted_epoch INTEGER,deleted_at INTEGER);
    CREATE TABLE spotify_oauth_states(state_hash TEXT PRIMARY KEY,cookie_hash TEXT,user_id TEXT,verifier_enc TEXT,data_epoch INTEGER,expires_at INTEGER);
    CREATE TABLE spotify_connections(user_id TEXT PRIMARY KEY,spotify_user_id TEXT,display_name TEXT,access_token_enc TEXT,refresh_token_enc TEXT,expires_at INTEGER,scopes TEXT,data_epoch INTEGER,updated_at INTEGER);`);
  const wrap=(sql,args=[])=>({bind(...values){return wrap(sql,values);},first(){return sqlite.prepare(sql).get(...args)||null;},run(){return sqlite.prepare(sql).run(...args);}});
  return {sqlite,prepare:sql=>wrap(sql),async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
}
const req=(path,method='GET',extras={})=>new Request(`https://coach.example${path}`,{method,...extras});
const writeHeaders=(owner='owner-a',epoch=1)=>({Origin:'https://coach.example','X-Target-Account':owner,'X-Expected-Data-Epoch':String(epoch)});

test('unconfigured, cross-origin, and missing epoch writes are rejected',async()=>{
  const database=db();let response=await spotifyApi(req('/api/spotify/status'),{},database,'owner');assert.equal(response.status,503);assert.equal((await response.json()).code,'spotify_unconfigured');
  response=await spotifyApi(req('/api/spotify/connect','POST',{headers:{Origin:'https://other.example'}}),env,database,'owner');assert.equal(response.status,403);
  response=await spotifyApi(req('/api/spotify/connect','POST',{headers:{Origin:'https://coach.example'}}),env,database,'owner');assert.equal(response.status,428);
  assert.equal(database.sqlite.prepare('SELECT count(*) AS n FROM spotify_oauth_states').get().n,0);database.sqlite.close();
});
test('PKCE callback is cookie-bound, single use, epoch-bound, and tokens stay server-side',async()=>{
  const database=db();const started=await spotifyApi(req('/api/spotify/connect','POST',{headers:writeHeaders()}),env,database,'owner-a');
  assert.equal(started.status,200);const {url}=await started.json();const auth=new URL(url);assert.equal(auth.searchParams.get('code_challenge_method'),'S256');assert.equal(auth.searchParams.get('scope').includes('user-read-currently-playing'),true);
  const cookie=started.headers.get('Set-Cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Secure/);
  const callback=`/api/spotify/callback?state=${auth.searchParams.get('state')}&code=test-code`;
  let result=await spotifyCallback(req(callback),env,database);assert.match(result.headers.get('Location'),/spotify=expired/);assert.equal(database.sqlite.prepare('SELECT count(*) AS n FROM spotify_oauth_states').get().n,1);
  const oldFetch=globalThis.fetch;let exchanges=0;globalThis.fetch=async(url,options)=>{if(String(url).endsWith('/api/token')){exchanges++;const form=new URLSearchParams(options.body);if(form.get('grant_type')==='refresh_token'){assert.equal(form.get('refresh_token'),'refresh-secret');return Response.json({access_token:'new-access-secret',expires_in:3600});}assert.equal(form.get('code_verifier')?.length>30,true);return Response.json({access_token:'access-secret',refresh_token:'refresh-secret',expires_in:3600,scope:'user-read-currently-playing'});}if(String(url).endsWith('/me'))return Response.json({id:'spotify-user',display_name:'DJ'});if(String(url).endsWith('/me/player')){assert.equal(options.headers.Authorization,'Bearer new-access-secret');return Response.json({is_playing:true,progress_ms:1000,item:{name:'A song',duration_ms:120000,artists:[{name:'Singer'}]}});}throw Error(String(url));};
  try{
    result=await spotifyCallback(req(callback,'GET',{headers:{Cookie:cookie.split(';')[0]}}),env,database);assert.match(result.headers.get('Location'),/spotify=connected/);assert.equal(exchanges,1);
    assert.equal(database.sqlite.prepare('SELECT count(*) AS n FROM spotify_oauth_states').get().n,0);
    assert.equal(database.sqlite.prepare('SELECT access_token_enc FROM spotify_connections').get().access_token_enc.includes('access-secret'),false);
    result=await spotifyCallback(req(callback,'GET',{headers:{Cookie:cookie.split(';')[0]}}),env,database);assert.match(result.headers.get('Location'),/spotify=expired/);assert.equal(exchanges,1);
    const status=await spotifyApi(req('/api/spotify/status'),env,database,'owner-b');assert.equal((await status.json()).connected,false);
    const own=await spotifyApi(req('/api/spotify/status'),env,database,'owner-a');const body=await own.text();assert.match(body,/"connected":true/);assert.doesNotMatch(body,/access-secret|refresh-secret/);
    database.sqlite.prepare('UPDATE spotify_connections SET expires_at=0 WHERE user_id=?').run('owner-a');
    const playing=await spotifyApi(req('/api/spotify/now-playing'),env,database,'owner-a');const now=await playing.json();assert.equal(now.nowPlaying.track.name,'A song');assert.equal(now.nowPlaying.bpm,null);assert.equal(exchanges,2);
  }finally{globalThis.fetch=oldFetch;database.sqlite.close();}
});
test('a deleted account epoch cannot relink through a pending callback',async()=>{
  const database=db(),started=await spotifyApi(req('/api/spotify/connect','POST',{headers:writeHeaders()}),env,database,'owner-a');
  const {url}=await started.json(),state=new URL(url).searchParams.get('state'),cookie=started.headers.get('Set-Cookie').split(';')[0];
  database.sqlite.prepare('UPDATE account_data_epochs SET epoch=2 WHERE owner_id=?').run('owner-a');
  database.sqlite.prepare('INSERT INTO account_data_deletions(owner_id,deleted_epoch,deleted_at) VALUES(?,?,?)').run('owner-a',1,Date.now());
  const stale=await spotifyApi(req('/api/spotify/connect','POST',{headers:writeHeaders()}),env,database,'owner-a');assert.equal(stale.status,409);
  const oldFetch=globalThis.fetch;globalThis.fetch=async url=>String(url).endsWith('/api/token')?Response.json({access_token:'access-secret',refresh_token:'refresh-secret',expires_in:3600}):Response.json({id:'spotify-user'});
  try{const result=await spotifyCallback(req(`/api/spotify/callback?state=${state}&code=code`,'GET',{headers:{Cookie:cookie}}),env,database);assert.match(result.headers.get('Location'),/spotify=failed/);assert.equal(database.sqlite.prepare('SELECT count(*) AS n FROM spotify_connections').get().n,0);}finally{globalThis.fetch=oldFetch;database.sqlite.close();}
});
