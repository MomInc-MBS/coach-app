import {epochFencedBatch} from './remote-epochs.mjs';
import {fail,cleanText} from './domain.mjs';
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const codeValue=value=>typeof value==='string'?value.replace(/[\s-]/g,'').toLowerCase():'';
const connections=(database,user)=>database.prepare('SELECT id,CASE WHEN user_a=? THEN user_b ELSE user_a END AS friend FROM scoreboard_links WHERE user_a=? OR user_b=? ORDER BY created_at,id').bind(user,user,user).all();
async function scores(database,user){return (await database.prepare(`SELECT mode,COUNT(*) AS sets,MAX(value) AS best FROM workouts WHERE user_id=? AND source='server' AND competitive_status='accepted' AND completed_at IS NOT NULL GROUP BY mode`).bind(user).all()).results;}
export function sharedGala(profile){try{const raw=JSON.parse(JSON.parse(profile||'{}')['mominc-avatar-v1']||'null');if(raw?.schema!=='mominc-avatar'||raw.version!==1||!Number.isInteger(raw.dye)||raw.dye<0||raw.dye>9)return null;const parts={};for(const key of ['body','skin','face','hair','facial','headwear','neck','torso','shoulders','arms','hands','legs','feet','held','back','base','pet']){const value=raw.parts?.[key]??0;if(!Number.isInteger(value)||value<0||value>39)return null;parts[key]=value;}return {schema:'mominc-avatar',version:1,name:'',dye:raw.dye,parts};}catch{return null;}}
async function member(database,user,link=null){const row=await database.prepare('SELECT data FROM onboarding WHERE user_id=?').bind(user).first(),profile=await database.prepare('SELECT data FROM profiles WHERE user_id=?').bind(user).first();let name='Crew member';try{name=JSON.parse(row?.data||'{}').profile?.name||name;}catch{}return {name:String(name).slice(0,60),link,avatar:sharedGala(profile?.data),items:await scores(database,user)};}
export async function scoreboardApi(database,user,path,method,input={},now=Date.now(),{dataEpoch=1}={}){
 if(path==='/api/scoreboard'&&method==='GET'){
  const links=(await connections(database,user)).results;
  const members=await Promise.all([member(database,user),...links.map(l=>member(database,l.friend,l.id))]);
  const invite=await database.prepare('SELECT expires_at FROM scoreboard_invites WHERE owner_id=? AND expires_at>?').bind(user,now).first();
  return {members,inviteExpiresAt:invite?.expires_at??null,updatedAt:now};
 }
 if(path==='/api/scoreboard/invite'&&method==='POST'){
  if(input.consent!==true)fail('Choose to share your name and best sets with a friend.');
  if((await connections(database,user)).results.length>=2)fail('Your two friend places are full. Remove a friend to invite someone else.',409);
  const code=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
  const saved=(await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:dataEpoch,now,statements:[database.prepare('INSERT INTO scoreboard_invites(owner_id,token_hash,created_at,expires_at) VALUES(?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET token_hash=excluded.token_hash,created_at=excluded.created_at,expires_at=excluded.expires_at WHERE scoreboard_invites.created_at<=? RETURNING owner_id').bind(user,await hash(code),now,now+7*86400000,now-60000)]}))[0].results[0];
  if(!saved)fail('Wait a minute before replacing your invite code.',429);
  return {code:code.match(/.{6}/g).join('-').toUpperCase(),expiresAt:now+7*86400000};
 }
 if(path==='/api/scoreboard/invite'&&method==='DELETE'){
  await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:dataEpoch,now,statements:[database.prepare('DELETE FROM scoreboard_invites WHERE owner_id=?').bind(user)]});return {revoked:true};
 }
 if(path==='/api/scoreboard/join'&&method==='POST'){
  if(input.consent!==true)fail('Choose to share your name and best sets with this friend.');
  const code=codeValue(input.code);if(!/^[a-f0-9]{24}$/.test(code))fail('Enter the full invite code from your friend.');
  const rate=(await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:dataEpoch,now,statements:[database.prepare("INSERT INTO system(key,value) VALUES(?,json_object('since',?,'count',1)) ON CONFLICT(key) DO UPDATE SET value=CASE WHEN json_extract(system.value,'$.since')<? THEN excluded.value ELSE json_set(system.value,'$.count',json_extract(system.value,'$.count')+1) END WHERE json_extract(system.value,'$.since')<? OR json_extract(system.value,'$.count')<20 RETURNING key").bind(`scoreboard-join:${user}`,now,now-3600000,now-3600000)]}))[0].results[0];
  if(!rate)fail('Too many attempts. Try again in an hour.',429);
  const tokenHash=await hash(code),invite=await database.prepare('SELECT owner_id FROM scoreboard_invites WHERE token_hash=? AND expires_at>?').bind(tokenHash,now).first();
  if(!invite)fail('That invite expired or was used. Ask your friend for a new code.',404);
  if(invite.owner_id===user)fail('That is your own code. Enter a friend’s code.');
  const [a,b]=[user,invite.owner_id].sort(),id=crypto.randomUUID();
  // Capacity, token consumption and membership are one transaction, including concurrent joins.
  const [insert]=await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:dataEpoch,now,statements:[
   database.prepare('INSERT INTO scoreboard_links(id,user_a,user_b,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM scoreboard_invites WHERE token_hash=? AND expires_at>?) AND (SELECT COUNT(*) FROM scoreboard_links WHERE user_a=? OR user_b=?)<2 AND (SELECT COUNT(*) FROM scoreboard_links WHERE user_a=? OR user_b=?)<2 ON CONFLICT(user_a,user_b) DO NOTHING RETURNING id').bind(id,a,b,now,tokenHash,now,a,a,b,b),
   database.prepare('DELETE FROM scoreboard_invites WHERE token_hash=? AND EXISTS(SELECT 1 FROM scoreboard_links WHERE id=?)').bind(tokenHash,id)
  ]});
  if(!insert.results.length)fail('Already connected, or one of your boards is full. Refresh your board.',409);
  return {connected:true};
 }
 if(path.startsWith('/api/scoreboard/friends/')&&method==='DELETE'){
  const id=cleanText(path.split('/').at(-1),50);const removed=(await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:dataEpoch,now,statements:[database.prepare('DELETE FROM scoreboard_links WHERE id=? AND (user_a=? OR user_b=?) RETURNING id').bind(id,user,user)]}))[0].results[0];
  if(!removed)fail('Friend connection not found.',404);return {removed:true};
 }
 fail('Not found.',404);
}
export async function exportScoreboard(database,user){return {connections:(await connections(database,user)).results.map(({id})=>({id})),invite:(await database.prepare('SELECT created_at,expires_at FROM scoreboard_invites WHERE owner_id=?').bind(user).first())??null};}
export function deleteScoreboard(database,user){return [database.prepare('DELETE FROM scoreboard_links WHERE user_a=? OR user_b=?').bind(user,user),database.prepare('DELETE FROM scoreboard_invites WHERE owner_id=?').bind(user),database.prepare('DELETE FROM system WHERE key=?').bind(`scoreboard-join:${user}`)];}
