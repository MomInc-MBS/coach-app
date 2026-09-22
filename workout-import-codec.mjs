// Shared browser/Worker codec; no authentication or network I/O.
// Version 1 is immutable: preserve its validation and bytes for old replays.
export const IMPORT_DIGEST_VERSION = 1;
export const IMPORT_SNAPSHOT_KEYS = Object.freeze(['schemaVersion','clientWorkoutId','mode','goal','restSeconds','startedAt','completedAt','value','activeSeconds','elapsedSeconds']);
// Pinned from exercise-library.mjs and server/domain.mjs on 2026-09-21.
const timedModes = 'knee-plank high-plank forearm-plank side-knee-left side-knee-right side-plank-left side-plank-right knee-balance low-tree tree overhead-tree mountain salute chair warrior-one warrior goddess high-horse horse low-horse front-stance-left front-stance-right jab-left jab-right boxing double-jab'.split(' ');
const countModes = 'knee-pushup high-incline-pushup low-incline-pushup pushup wide-pushup slow-pushup diamond-pushup decline-pushup shallow-squat squat wide-squat pause-squat slow-squat split-left split-right small-hinge hip-hinge good-morning glute-bridge pause-bridge front-raise lateral-raise overhead-reach standing-press slow-press march high-march jogging step-jack jumping-jack jumping'.split(' ');
export const IMPORT_MODE_LIMITS = Object.freeze(Object.fromEntries([...timedModes.map(mode=>[mode,Object.freeze({goal:7200,value:7200})]),...countModes.map(mode=>[mode,Object.freeze({goal:100000,value:100000})])]));
export class WorkoutImportCodecError extends Error {
  constructor(code,message=code){super(message);this.name='WorkoutImportCodecError';this.code=code;}
}
const fail=(code='invalid_snapshot')=>{throw new WorkoutImportCodecError(code);};
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
// Never run an accessor while validating. Detached descriptor values are read once.
function record(raw,code){
  try {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||![null,Object.prototype].includes(Object.getPrototypeOf(raw)))fail(code);
    const descriptors=Object.getOwnPropertyDescriptors(raw),out=Object.create(null);
    if(Object.getOwnPropertySymbols(descriptors).length)fail(code);
    for(const [key,d] of Object.entries(descriptors)){
      if(!own(d,'value')||!d.enumerable)fail(code);
      out[key]=d.value;
    }
    return out;
  }catch{fail(code);}
}
function exact(raw,keys,code){
  const value=record(raw,code),actual=Object.keys(value);
  if(actual.length!==keys.length||keys.some(key=>!own(value,key)))fail(code);
  return value;
}
function integer(value,min,max,code){if(!Number.isSafeInteger(value)||Object.is(value,-0)||value<min||value>max)fail(code);}
function uuid(value,code){if(typeof value!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/).test(value))fail(code);}
function version(value){if(value!==IMPORT_DIGEST_VERSION)fail('unsupported_digest_version');}
export function validateImportSnapshot(raw){
  const s=exact(raw,IMPORT_SNAPSHOT_KEYS,'invalid_snapshot');
  if(s.schemaVersion!==1)fail();
  uuid(s.clientWorkoutId,'invalid_snapshot');
  if(typeof s.mode!=='string'||!own(IMPORT_MODE_LIMITS,s.mode))fail();
  const limits=IMPORT_MODE_LIMITS[s.mode];
  integer(s.goal,1,limits.goal,'invalid_snapshot');
  integer(s.restSeconds,15,180,'invalid_snapshot');
  integer(s.startedAt,0,8640000000000000,'invalid_snapshot');
  integer(s.completedAt,s.startedAt,8640000000000000,'invalid_snapshot');
  integer(s.value,0,limits.value,'invalid_snapshot');
  integer(s.activeSeconds,0,7200,'invalid_snapshot');
  integer(s.elapsedSeconds,s.activeSeconds,7200,'invalid_snapshot');
  return Object.freeze(Object.fromEntries(IMPORT_SNAPSHOT_KEYS.map(key=>[key,s[key]])));
}
// Caller must obtain this row through its owner-scoped repository. Shape checks
// are not an ownership check. Only these explicit source fields are projected.
export function snapshotFromCompletedWorkout(raw){
  try {
    const row=record(raw,'snapshot_unavailable');
    if(row.status!=='completed')fail('snapshot_unavailable');
    const completion=record(row.completion,'snapshot_unavailable');
    return validateImportSnapshot({schemaVersion:row.schemaVersion,clientWorkoutId:row.clientWorkoutId,mode:row.mode,goal:row.goal,restSeconds:row.restSeconds,startedAt:row.startedAt,completedAt:row.completedAt,value:completion.value,activeSeconds:completion.activeSeconds,elapsedSeconds:completion.elapsedSeconds});
  }catch{fail('snapshot_unavailable');}
}
export function canonicalImportSnapshot(raw,digestVersion=IMPORT_DIGEST_VERSION){
  version(digestVersion);
  return JSON.stringify([digestVersion,validateImportSnapshot(raw)]);
}
async function sha256(text){
  if(typeof globalThis.crypto?.subtle?.digest!=='function')fail('crypto_unavailable');
  let bytes;
  try{bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));}
  catch{fail('crypto_unavailable');}
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function fingerprintImportSnapshot(raw,digestVersion=IMPORT_DIGEST_VERSION){
  return sha256(canonicalImportSnapshot(raw,digestVersion));
}
export function canonicalImportKey(raw){
  const k=exact(raw,['digestVersion','targetAccountId','targetDataEpoch','clientWorkoutId','fingerprint'],'invalid_key_input');
  version(k.digestVersion);
  if(typeof k.targetAccountId!=='string'||!k.targetAccountId||k.targetAccountId.length>512||k.targetAccountId.trim()!==k.targetAccountId||/[\u0000-\u001f\u007f]/.test(k.targetAccountId))fail('invalid_key_input');
  integer(k.targetDataEpoch,1,Number.MAX_SAFE_INTEGER,'invalid_key_input');
  uuid(k.clientWorkoutId,'invalid_key_input');
  if(typeof k.fingerprint!=='string'||!(/^[a-f0-9]{64}$/).test(k.fingerprint))fail('invalid_key_input');
  return JSON.stringify([k.digestVersion,k.targetAccountId,k.targetDataEpoch,k.clientWorkoutId,k.fingerprint]);
}
export async function importIdempotencyKey(raw){return sha256(canonicalImportKey(raw));}
export async function prepareWorkoutImport(snapshotInput,targetInput){
  // Capture all untrusted inputs synchronously before the first async boundary.
  const snapshot=validateImportSnapshot(snapshotInput);
  const target=exact(targetInput,['targetAccountId','targetDataEpoch'],'invalid_key_input');
  canonicalImportKey({digestVersion:IMPORT_DIGEST_VERSION,...target,clientWorkoutId:snapshot.clientWorkoutId,fingerprint:'0'.repeat(64)});
  const fingerprint=await fingerprintImportSnapshot(snapshot);
  const idempotencyKey=await importIdempotencyKey({digestVersion:IMPORT_DIGEST_VERSION,...target,clientWorkoutId:snapshot.clientWorkoutId,fingerprint});
  return Object.freeze({snapshot,digestVersion:IMPORT_DIGEST_VERSION,fingerprint,idempotencyKey});
}
