import {CHOOSABLE_TRACKS} from '../performance-catalog.mjs';
import {inspectAccountDataEpoch} from './account-data-epochs.mjs';
import {epochFencedBatch} from './remote-epochs.mjs';

const fail=(message,status,code)=>{throw Object.assign(Error(message),{status,code});};
const samePair=(a,b)=>a.length===2&&b.length===2&&a.every(id=>b.includes(id));

/** An authenticated account's one-time path choice. The server stores only path IDs;
 * all coach access is reconstructed from the canonical catalogue and earned history. */
export async function saveWorkoutPaths(request,database,user,readBody){
 if(request.method!=='POST')fail('Method not allowed.',405,'method_not_allowed');
 if(request.headers.get('Origin')!==new URL(request.url).origin)fail('Open this action from Coach.',403,'origin_mismatch');
 const target=request.headers.get('X-Target-Account'),rawEpoch=request.headers.get('X-Expected-Data-Epoch');
 if(!target||!rawEpoch)fail('Refresh account details before saving.',428,'account_assertion_required');
 if(target!==user)fail('Account changed.',409,'target_mismatch');
 if(!/^[1-9][0-9]*$/.test(rawEpoch)||!Number.isSafeInteger(Number(rawEpoch)))fail('Invalid account generation.',422,'invalid_account_epoch');
 const epoch=Number(rawEpoch),proof=await inspectAccountDataEpoch(database,user);
 if(proof.currentDataEpoch!==epoch)fail('Account data changed.',409,'target_epoch_mismatch');
 const value=await readBody(request),paths=value.paths;
 if(!Array.isArray(paths)||paths.length!==2||new Set(paths).size!==2||!paths.every(id=>CHOOSABLE_TRACKS.includes(id)))fail('Choose exactly two workout paths.',422,'invalid_paths');
 const now=Date.now();
 try{
  await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:epoch,now,statements:[database.prepare(`INSERT INTO workout_path_choices(user_id,data_epoch,paths,created_at) VALUES(?,?,?,?)
   ON CONFLICT(user_id) DO UPDATE SET data_epoch=excluded.data_epoch,paths=excluded.paths,created_at=excluded.created_at
   WHERE workout_path_choices.data_epoch<>excluded.data_epoch`).bind(user,epoch,JSON.stringify(paths),now)]});
 }catch(error){if(error.code==='target_epoch_mismatch')fail('Account data changed.',409,'target_epoch_mismatch');throw error;}
 const row=await database.prepare('SELECT paths FROM workout_path_choices WHERE user_id=? AND data_epoch=?').bind(user,epoch).first();
 let saved;try{saved=JSON.parse(row?.paths);}catch{}
 if(!Array.isArray(saved)||!samePair(paths,saved))fail('Workout paths were already chosen.',409,'paths_already_chosen');
 return {paths:saved};
}
