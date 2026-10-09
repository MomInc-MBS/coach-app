import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {webcrypto} from 'node:crypto';
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
async function seedConnection(database,user='owner-a'){
  database.sqlite.prepare('INSERT OR REPLACE INTO account_data_epochs(owner_id,epoch,updated_at) VALUES(?,?,?)').run(user,1,Date.now());
  const enc=new TextEncoder(),digest=await webcrypto.subtle.digest('SHA-256',enc.encode(env.SPOTIFY_TOKEN_KEY)),key=await webcrypto.subtle.importKey('raw',digest,'AES-GCM',false,['encrypt']);
  const encode=bytes=>Buffer.from(bytes).toString('base64url');
  const seal=async value=>{const iv=webcrypto.getRandomValues(new Uint8Array(12)),cipher=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(value));return `${encode(iv)}.${encode(new Uint8Array(cipher))}`;};
  database.sqlite.prepare('INSERT INTO spotify_connections(user_id,spotify_user_id,display_name,access_token_enc,refresh_token_enc,expires_at,scopes,data_epoch,updated_at) VALUES(?,?,?,?,?,?,?,?,?)')
    .run(user,'spotify-user','DJ',await seal('access-token'),await seal('refresh-token'),Date.now()+3600000,'user-read-playback-state user-modify-playback-state',1,Date.now());
}

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
  let result=await spotifyCallback(req(callback),env,database);assert.match(result.headers.get('Location'),/spotify=browser/);assert.equal(database.sqlite.prepare('SELECT count(*) AS n FROM spotify_oauth_states').get().n,1);
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
test('a Spotify account missing from the dev-mode allowlist gets a specific result',async()=>{
  const database=db(),started=await spotifyApi(req('/api/spotify/connect','POST',{headers:writeHeaders()}),env,database,'owner-a');
  const {url}=await started.json(),state=new URL(url).searchParams.get('state'),cookie=started.headers.get('Set-Cookie').split(';')[0];
  const oldFetch=globalThis.fetch;globalThis.fetch=async url=>String(url).endsWith('/api/token')?Response.json({access_token:'a',refresh_token:'r',expires_in:3600}):new Response('{}',{status:403});
  try{const result=await spotifyCallback(req(`/api/spotify/callback?state=${state}&code=code`,'GET',{headers:{Cookie:cookie}}),env,database);assert.match(result.headers.get('Location'),/spotify=notlisted/);}finally{globalThis.fetch=oldFetch;database.sqlite.close();}
});

test('search, queue, devices, and playlist tracks use Spotify API projections and pagination',async()=>{
  const database=db();await seedConnection(database);const oldFetch=globalThis.fetch,seen=[];
  globalThis.fetch=async(url,options)=>{
    const parsed=new URL(String(url));seen.push({url:parsed,options});
    if(parsed.pathname==='/v1/search')return Response.json({tracks:{total:24,items:[{id:'track1234567890',name:'Lift',uri:'spotify:track:track1234567890',artists:[{name:'DJ'},{name:'Guest'}],album:{name:'EP',images:[{url:'https://i.scdn.co/x'}]},duration_ms:123000,external_urls:{spotify:'https://open.spotify.com/track/track1234567890'},popularity:99}]}});
    if(parsed.pathname==='/v1/me/player/queue')return Response.json({queue:[{id:'track1234567890',name:'Lift',artists:[{name:'DJ'}],album:{name:'EP'},duration_ms:123000}]});
    if(parsed.pathname==='/v1/me/player/devices')return Response.json({devices:[{id:'device_123',name:'Phone',is_active:true,is_restricted:false,volume_percent:45,supports_volume:true}]});
    if(parsed.pathname==='/v1/playlists/playlist123456/items')return Response.json({total:2,items:[{item:{id:'track1234567890',name:'Lift',artists:[],album:{},duration_ms:123000}}]});
    throw Error(String(url));
  };
  try{
    let response=await spotifyApi(req('/api/spotify/search?q=lift%20mix&offset=10'),env,database,'owner-a'),body=await response.json();
    assert.equal(response.status,200);assert.equal(body.total,24);assert.equal(body.offset,10);assert.equal(body.items[0].durationMs,123000);assert.equal(body.items[0].uri,'spotify:track:track1234567890');assert.equal(body.items[0].popularity,undefined);
    assert.equal(seen[0].url.pathname,'/v1/search');assert.equal(seen[0].url.searchParams.get('q'),'lift mix');assert.equal(seen[0].url.searchParams.get('type'),'track');assert.equal(seen[0].url.searchParams.get('limit'),'10');assert.equal(seen[0].url.searchParams.get('offset'),'10');
    response=await spotifyApi(req('/api/spotify/queue'),env,database,'owner-a');body=await response.json();assert.equal(body.items[0].id,'track1234567890');assert.equal(seen[1].url.pathname,'/v1/me/player/queue');
    response=await spotifyApi(req('/api/spotify/devices'),env,database,'owner-a');body=await response.json();assert.deepEqual(body.items[0],{id:'device_123',name:'Phone',active:true,restricted:false,volumePercent:45,supportsVolume:true});
    response=await spotifyApi(req('/api/spotify/playlist-tracks?playlistId=playlist123456&offset=50'),env,database,'owner-a');body=await response.json();assert.equal(body.offset,50);assert.equal(body.total,2);assert.equal(body.items.length,1);assert.equal(seen[3].url.pathname,'/v1/playlists/playlist123456/items');assert.equal(seen[3].url.searchParams.get('limit'),'50');assert.equal(seen[3].url.searchParams.get('offset'),'50');
  }finally{globalThis.fetch=oldFetch;database.sqlite.close();}
});

test('playback controls map strict actions to Spotify endpoints and payloads',async()=>{
  const database=db();await seedConnection(database);const oldFetch=globalThis.fetch,seen=[];
  globalThis.fetch=async(url,options)=>{seen.push({url:new URL(String(url)),options});return new Response(null,{status:204});};
  const actions=[
    [{action:'seek',positionMs:1250},'PUT','/v1/me/player/seek','position_ms','1250',null],
    [{action:'volume',volumePercent:20},'PUT','/v1/me/player/volume','volume_percent','20',null],
    [{action:'shuffle',enabled:false},'PUT','/v1/me/player/shuffle','state','false',null],
    [{action:'repeat',mode:'context'},'PUT','/v1/me/player/repeat','state','context',null],
    [{action:'track',trackId:'track1234567890'},'PUT','/v1/me/player/play',null,null,{uris:['spotify:track:track1234567890']}],
    [{action:'queue',trackId:'track1234567890'},'POST','/v1/me/player/queue','uri','spotify:track:track1234567890',null],
    [{action:'transfer',deviceId:'device_123'},'PUT','/v1/me/player',null,null,{device_ids:['device_123'],play:true}],
  ];
  try{
    for(const [input,method,path,param,value,body] of actions){
      const response=await spotifyApi(req('/api/spotify/playback','POST',{headers:{...writeHeaders(),'Content-Type':'application/json'},body:JSON.stringify(input)}),env,database,'owner-a');assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
      const call=seen.at(-1);assert.equal(call.options.method,method);assert.equal(call.url.pathname,path);if(param)assert.equal(call.url.searchParams.get(param),value);if(body)assert.deepEqual(JSON.parse(call.options.body),body);
    }
  }finally{globalThis.fetch=oldFetch;database.sqlite.close();}
});

test('Spotify routes reject unauthenticated reads and malformed query or playback values before upstream calls',async()=>{
  const database=db();await seedConnection(database);const oldFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({});};
  try{
    let response=await spotifyApi(req('/api/spotify/search?q=x'),env,database,null);assert.equal(response.status,401);
    for(const path of ['/api/spotify/search','/api/spotify/search?q=%20','/api/spotify/search?q=x&offset=-1','/api/spotify/search?q=x&debug=1','/api/spotify/playlist-tracks?playlistId=bad','/api/spotify/playlist-tracks?playlistId=playlist123456&offset=100001']){
      response=await spotifyApi(req(path),env,database,'owner-a');assert.ok(response.status>=400,path);
    }
    for(const input of [{action:'seek',positionMs:-1},{action:'seek',positionMs:1.5},{action:'volume',volumePercent:101},{action:'shuffle',enabled:'false'},{action:'repeat',mode:'all'},{action:'track',trackId:'bad'},{action:'queue',trackId:'track1234567890',extra:'unsafe'},{action:'transfer',deviceId:'bad device'}]){
      response=await spotifyApi(req('/api/spotify/playback','POST',{headers:{...writeHeaders(),'Content-Type':'application/json'},body:JSON.stringify(input)}),env,database,'owner-a');assert.equal(response.status,422,JSON.stringify(input));
    }
    assert.equal(calls,0);
  }finally{globalThis.fetch=oldFetch;database.sqlite.close();}
});
