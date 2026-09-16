import {fail} from './domain.mjs';
import {readEntitlements} from './entitlements.mjs';

// These are the existing Gala family ids.  A selection is presentation data,
// not an entitlement: this service never creates XP, tiers, or rewards.
const WEAPONS=new Set(['rapier','greatsword','dagger','sabre','axe','hammer','mace','flail','spear','trident','halberd','scythe','bow','crossbow','chakram','gauntlets','staff','wand','tome','cannon']);
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(value);
const json=value=>JSON.stringify(value);
const parse=(value,fallback)=>{try{const parsed=JSON.parse(value);return parsed&&typeof parsed==='object'?parsed:fallback;}catch{return fallback;}};
const weapon=value=>{
 if(!value||typeof value!=='object'||!WEAPONS.has(value.type)||!Number.isInteger(value.tier)||value.tier<0||value.tier>20)fail('Choose a valid Gala weapon.');
 return {type:value.type,tier:value.tier};
};
const recipe=value=>{
 if(!value||typeof value!=='object'||!id(value.id)||typeof value.name!=='string'||value.name.trim().length<1||value.name.trim().length>80||typeof value.data!=='string'||value.data.length<1||value.data.length>30000)fail('Choose a valid saved recipe.');
 return {id:value.id,name:value.name.trim(),data:value.data};
};
// Persisted rows are untrusted. Ignore malformed entries so an old or
// interrupted save cannot prevent the owner from opening the War Room.
const storedWeapon=value=>{try{return weapon(value);}catch{return {type:'rapier',tier:0};}};
const storedRecipes=value=>{
 const parsed=parse(value,[]),items=Array.isArray(parsed)?parsed:[],seen=new Set(),valid=[];
 for(const item of items){try{const safe=recipe(item);if(!seen.has(safe.id)){seen.add(safe.id);valid.push(safe);}}catch{}if(valid.length===20)break;}
 return valid;
};
async function clearance(database,user){
 const entitlements=await readEntitlements(database,user);
 if(!entitlements.coachArmy)fail('Complete verified Coach Army access before opening the War Room.',403);
 return entitlements;
}
async function current(database,user){
 return (await database.prepare('SELECT loadout,recipes,revision,updated_at FROM war_room_arsenals WHERE user_id=?').bind(user).first())||{loadout:json({type:'rapier',tier:0}),recipes:'[]',revision:0,updated_at:null};
}
const safe=row=>({loadout:storedWeapon(parse(row.loadout,{type:'rapier',tier:0})),recipes:storedRecipes(row.recipes),revision:Number.isSafeInteger(Number(row.revision))&&Number(row.revision)>=0?Number(row.revision):0,updatedAt:row.updated_at==null?null:Number.isFinite(Number(row.updated_at))?Number(row.updated_at):null});
async function save(database,user,previous,next,now){
 const result=await database.prepare('INSERT INTO war_room_arsenals(user_id,loadout,recipes,revision,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET loadout=excluded.loadout,recipes=excluded.recipes,revision=war_room_arsenals.revision+1,updated_at=excluded.updated_at WHERE war_room_arsenals.revision=? RETURNING revision,updated_at').bind(user,json(next.loadout),json(next.recipes),1,now,previous.revision).first();
 if(!result)fail('War Room changed on another device. Refresh before saving.',409);
 return {...next,revision:Number(result.revision),updatedAt:Number(result.updated_at)};
}
export async function warRoomApi(database,user,path,method,input,now=Date.now()){
 const entitlements=await clearance(database,user);
 const row=await current(database,user),state=safe(row);
 if(path==='/api/war-room'&&method==='GET')return {entitlements,state};
 if(path==='/api/war-room/loadout'&&method==='PUT'){
  if(!Number.isSafeInteger(input?.revision)||input.revision!==state.revision)fail('War Room changed on another device. Refresh before saving.',409);
  return {state:await save(database,user,state,{...state,loadout:weapon(input.loadout)},now)};
 }
 if(path==='/api/war-room/recipes'&&method==='POST'){
  if(!Number.isSafeInteger(input?.revision)||input.revision!==state.revision)fail('War Room changed on another device. Refresh before saving.',409);
  const item=recipe(input.recipe);if(state.recipes.some(existing=>existing.id===item.id))fail('That recipe id already exists.',409);if(state.recipes.length>=20)fail('Keep up to 20 saved recipes.');
  return {state:await save(database,user,state,{...state,recipes:[...state.recipes,item]},now)};
 }
 if(path==='/api/war-room/import/profile'&&method==='POST'){
  if(!Number.isSafeInteger(input?.revision)||input.revision!==state.revision)fail('War Room changed on another device. Refresh before importing.',409);
  // This is deliberately opt-in and reads only the authenticated owner's
  // established profile. Cookies, IPs, and an arbitrary supplied owner id can
  // never claim a legacy Gala save.
  const profile=await database.prepare('SELECT data FROM profiles WHERE user_id=?').bind(user).first();
  const saved=parse(profile?.data,{}),avatar=parse(saved['mominc-avatar-v1'],{}),next={...state};
  if(avatar.weapon){try{next.loadout=weapon(avatar.weapon);}catch{/* malformed legacy appearance is ignored */}}
  const legacyRecipe=saved['myr5-recipe-v1'];
  if(typeof legacyRecipe==='string'&&legacyRecipe.length>0&&legacyRecipe.length<=30000&&!next.recipes.some(item=>item.id==='legacy-myr5'))next.recipes=[...next.recipes,{id:'legacy-myr5',name:'Imported MYR5 recipe',data:legacyRecipe}];
  if(JSON.stringify(next.loadout)===JSON.stringify(state.loadout)&&JSON.stringify(next.recipes)===JSON.stringify(state.recipes))fail('No validated legacy War Room data is available for this account.',404);
  return {state:await save(database,user,state,next,now),imported:true};
 }
 const match=path.match(/^\/api\/war-room\/recipes\/([A-Za-z0-9_-]{1,80})$/);
 if(match&&method==='DELETE'){
  if(!Number.isSafeInteger(input?.revision)||input.revision!==state.revision)fail('War Room changed on another device. Refresh before saving.',409);
  const recipes=state.recipes.filter(item=>item?.id!==match[1]);if(recipes.length===state.recipes.length)fail('Recipe not found.',404);
  return {state:await save(database,user,state,{...state,recipes},now)};
 }
 fail('War Room action unavailable.',405);
}
