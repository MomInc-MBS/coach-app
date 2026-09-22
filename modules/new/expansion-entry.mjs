import { coachArmyComplete } from '../../public-access.mjs';
import { createIsolatedPackControl } from '../../packs/isolated-pack-control.mjs';
import { productionExpansionTrust } from './expansion-config.mjs';

export const EXPANSION_ID = 'mom-paper-tear';
export const MANIFEST_URL = '/modules/new/manifest.json';
const MAX_ASSET_BYTES = 512 * 1024, MAX_PACK_BYTES = 2 * 1024 * 1024;
// Production trust comes only from the validated release-build public config,
// never from a manifest-provided key. Null is deliberate fail-closed state.
export const PRODUCTION_EXPANSION_KEY = productionExpansionTrust();
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const b64 = value => typeof value === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length >= 80;
const canonical = m => JSON.stringify({ packId:m.packId,version:m.version,minAppVersion:m.minAppVersion,sha256:m.sha256,alg:m.alg,keyId:m.keyId,assets:m.assets.map(({path,bytes,sha256})=>({path,bytes,sha256})) });
const safeAsset = a => plain(a) && typeof a.path === 'string' && /^assets\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(a.path) && !a.path.includes('..') && Number.isSafeInteger(a.bytes) && a.bytes > 0 && a.bytes <= MAX_ASSET_BYTES && hex(a.sha256);

/** Shape checking is separate from cryptographic verification. `signed: true` never grants trust. */
export function isSignedExpansionManifest(value) {
 return plain(value) && value.packId === EXPANSION_ID && typeof value.version === 'string' && value.version.length <= 64 && typeof value.minAppVersion === 'string' && hex(value.sha256) && value.alg === 'Ed25519' && value.keyId === 'mom-paper-production-v1' && b64(value.signature) && Array.isArray(value.assets) && value.assets.length > 0 && value.assets.length <= 16 && value.assets.every(safeAsset) && value.assets.reduce((n,a)=>n+a.bytes,0) <= MAX_PACK_BYTES;
}
const b64bytes = value => { const binary=typeof atob==='function'?atob(value):Buffer.from(value,'base64').toString('binary'); return Uint8Array.from(binary,c=>c.charCodeAt(0)); };
async function subtle(){if(!globalThis.crypto?.subtle)throw new Error('Web Crypto unavailable');return globalThis.crypto.subtle;}
export async function verifyExpansionManifest(manifest,key){
 if(!isSignedExpansionManifest(manifest)||!plain(key)||key.kty!=='OKP'||key.crv!=='Ed25519'||typeof key.x!=='string')return false;
 try{const crypto=await subtle(),trusted=await crypto.importKey('jwk',key,{name:'Ed25519'},false,['verify']);return await crypto.verify({name:'Ed25519'},trusted,b64bytes(manifest.signature),new TextEncoder().encode(canonical(manifest)));}catch{return false;}
}
function safeAssetUrl(path,base){const url=new URL(path,base);if(url.origin!==base.origin||!url.pathname.startsWith('/modules/new/assets/'))throw new Error('Expansion asset origin/path is not allowed');return url;}

/** Tests may inject a test public key only with the explicit test-only purpose. Production remains fail-closed without a valid production signature. */
export async function resolveExpansionManifest({fetchImpl=globalThis.fetch,url=MANIFEST_URL,fixture=null,testTrust=null}={}){
 const trust=testTrust?.purpose==='test-only-signed-expansion'?testTrust.publicKey:(fixture?null:PRODUCTION_EXPANSION_KEY);
 if(!fixture&&!trust)throw new Error('Expansion unavailable: trusted production signing key is not configured');
 const manifest=fixture?.manifest??await(async()=>{if(typeof fetchImpl!=='function')throw new Error('Expansion manifest unavailable');const r=await fetchImpl(url,{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw new Error(`Expansion manifest unavailable (${r.status})`);return r.json();})();
 if(!(await verifyExpansionManifest(manifest,trust)))throw new Error('Expansion manifest signature is invalid');
 if(fixture){if(!testTrust)throw new Error('Expansion fixture requires explicit test-only trust');return {manifest,source:fixture.source};}
 const base=new URL(url,globalThis.location?.origin||'http://localhost');
 return {manifest,source:{async get(asset,previous){
  const offset=previous?.byteLength||0;
  if(offset>=asset.bytes)throw new Error('Invalid expansion resume offset');
  const r=await fetchImpl(safeAssetUrl(asset.path,base),{cache:'no-store',credentials:'same-origin',redirect:'error',headers:offset?{Range:`bytes=${offset}-`}:undefined});
  if(!r.ok||r.redirected||![200,206].includes(r.status))throw new Error(`Asset unavailable (${r.status})`);
  const body=new Uint8Array(await r.arrayBuffer());
  // Servers may ignore Range. A 200 is a complete replacement, never a suffix.
  if(r.status===200){if(body.byteLength!==asset.bytes)throw new Error('Expansion asset length does not match manifest');return body;}
  const range=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(r.headers?.get('content-range')||'');
  if(!range||Number(range[1])!==offset||Number(range[2])!==asset.bytes-1||Number(range[3])!==asset.bytes||body.byteLength!==asset.bytes-offset)throw new Error('Expansion Content-Range does not match manifest');
  return offset?new Uint8Array([...previous,...body]):body;
 }}};
}

// The pull and the reveal go down the phone, following the user's finger.
export function tearProgress(start,point,safeHeight=400){return !start||!point?0:Math.max(0,Math.min(1,(point.y-start.y)/Math.max(96,safeHeight*.28)));}
export function createPaperTearShell({document:doc=globalThis.document,onOpen=()=>{}}={}){
 if(!doc)return null;const shell=doc.createElement('section');shell.className='mom-paper-expansion';shell.setAttribute('aria-label','MOM paper expansion');shell.hidden=true;shell.innerHTML='<div class="paper-top-safe-area"><button type="button" class="paper-logo" aria-label="Pull MOM paper expansion down to open"><span aria-hidden="true">MOM</span><small>PULL DOWN TO OPEN</small></button></div><p class="paper-status" role="status"></p><div class="dimension-shell" hidden><div class="dimension-slot" aria-label="Expansion scene slot">COACH POD // PAPER DIMENSION</div><button type="button" class="paper-reopen">Close paper dimension</button></div>';
 const logo=shell.querySelector('.paper-logo'),status=shell.querySelector('.paper-status'),dimension=shell.querySelector('.dimension-shell');let start=null;const cancel=()=>{start=null;shell.classList.remove('paper-tearing');logo.style.removeProperty('--tear-progress');status.textContent='Pull canceled. Paper restored.';},open=()=>{dimension.hidden=false;logo.hidden=true;status.textContent='Paper dimension open.';onOpen(dimension);};
 logo.addEventListener('pointerdown',e=>{try{logo.setPointerCapture?.(e.pointerId);}catch{}start={x:e.clientX,y:e.clientY};shell.classList.add('paper-tearing');status.textContent='Pull down to tear.';});logo.addEventListener('pointermove',e=>{if(start)logo.style.setProperty('--tear-progress',tearProgress(start,{x:e.clientX,y:e.clientY},shell.clientHeight||400));});logo.addEventListener('pointerup',e=>{if(!start)return;const progress=tearProgress(start,{x:e.clientX,y:e.clientY},shell.clientHeight||400);start=null;shell.classList.remove('paper-tearing');logo.style.removeProperty('--tear-progress');if(progress>=.72)open();else cancel();});logo.addEventListener('pointercancel',cancel);shell.querySelector('.paper-reopen').addEventListener('click',()=>{dimension.hidden=true;logo.hidden=false;status.textContent='Paper restored. Pull down to reopen.';});logo.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});return shell;
}
export function mountExpansion({account,workoutOwner,workout,storage,assetStore,fetchImpl,fixture,testTrust,events=globalThis.window,host=globalThis.document?.querySelector('.crew-footer')}={}){
 if(!host||!coachArmyComplete(account))return null;
 const doc=host.ownerDocument,panel=doc.createElement('section');panel.className='expansion-control';panel.setAttribute('aria-label','Optional MOM paper expansion');panel.innerHTML='<h2>OPTIONAL PAPER DIMENSION</h2><p data-expansion-copy>Verified Coach Army access. Download the optional expansion when ready.</p><button type="button" data-expansion-download>Download optional expansion</button><p data-expansion-status role="status"></p>';host.before(panel);
 const button=panel.querySelector('[data-expansion-download]'),status=panel.querySelector('[data-expansion-status]');
 const trust=testTrust?.purpose==='test-only-signed-expansion'?testTrust.publicKey:(fixture?null:PRODUCTION_EXPANSION_KEY);
 let control=null,shell=null,generation=0,disposed=false,ready;
 const identity=value=>value?.user?.id??value?.id??value;
 let observedIdentity=identity(account),observedDataEpoch=account?.dataEpoch;
 const paint=v=>{if(!v)return;status.textContent=v.error||`${v.state}${v.receivedBytes?` · ${v.receivedBytes} bytes`:''}`;button.disabled=['downloading','verified','pending-equip','active'].includes(v.state);if(v.state==='active'){panel.querySelector('[data-expansion-copy]').textContent='Verified optional expansion active.';if(shell)shell.hidden=false;}};
 const runtimeFactory=async()=>{
  const prepared=createPaperTearShell({document:doc});
  return {activate(){shell=prepared;panel.append(prepared);prepared.hidden=false;},dispose(){prepared?.remove();if(shell===prepared)shell=null;}};
 };
 const setup=async({activateAtBoot=false}={})=>{
  const ticket=++generation;
  control?.dispose();
  let life;
  const current=()=>!disposed&&ticket===generation&&control===life&&coachArmyComplete(account);
  button.disabled=true;status.textContent='Checking signed expansion manifest\u2026';
  try{
   life=createIsolatedPackControl({account:{getIdentity:()=>identity(account),getGeneration:()=>JSON.stringify([generation,account?.dataEpoch??null]),getEntitlements:()=>!disposed&&coachArmyComplete(account)?[EXPANSION_ID]:[]},workout,workoutOwner,storage,assetStore,runtimeFactory,verifyManifest:manifest=>verifyExpansionManifest(manifest,trust),onChange:value=>{if(ticket===generation&&!disposed)paint(value);}});
   control=life;
   // Restore exact signed metadata and bytes before attempting any network call.
   if(activateAtBoot){
    if(life.pending)await life.restart();
    if(!current())return;
    if(!life.runtime&&life.equipped)await life.restore();
    if(!current())return;
    paint(life.status(EXPANSION_ID));
   }
   const entry=await resolveExpansionManifest({fetchImpl,fixture,testTrust});
   if(!current())return;
   life.manifest(entry.manifest,entry.source);paint(life.status(EXPANSION_ID));
  }catch(error){
   if(disposed||ticket!==generation||!coachArmyComplete(account))return;
   if(life?.runtime){paint(life.status(EXPANSION_ID));return;}
   status.textContent=error.message||'Production expansion unavailable.';button.disabled=false;
  }
 };
 button.addEventListener('click',async()=>{
  const life=control,ticket=generation;
  const current=()=>!disposed&&ticket===generation&&life===control&&coachArmyComplete(account);
  if(!life?.manifests.has(EXPANSION_ID)){ready=setup();return ready;}
  button.disabled=true;
  try{
   const downloaded=await life.download(EXPANSION_ID);if(!current())return;paint(downloaded);
   const verified=await life.verify(EXPANSION_ID);if(!current())return;paint(verified);
   const pending=await life.equipPending(EXPANSION_ID);if(!current())return;paint(pending);
   status.textContent='Verified and saved as pending. Reload Coach to activate.';button.disabled=false;
  }catch(error){if(current()){status.textContent=error.message||'Download failed. Tap to retry.';button.disabled=false;}}
 });
 const clear=()=>{generation++;control?.dispose();control=null;account=null;panel.hidden=true;};
 const accountReady=event=>{
  const next=event.detail,changed=identity(next)!==observedIdentity||next?.dataEpoch!==observedDataEpoch;
  account=next;observedIdentity=identity(next);observedDataEpoch=next?.dataEpoch;
  if(!coachArmyComplete(account)){clear();return;}
  panel.hidden=false;
  if(changed||!control){ready=setup({activateAtBoot:true});}
 };
 events?.addEventListener?.('myr5:account-cleared',clear);
 events?.addEventListener?.('myr5:account-ready',accountReady);
 // Assets are fetched only by the explicit Download action. Restored or pending
 // packs still require the workout owner's held idle lease at boot.
 ready=setup({activateAtBoot:true});
 return {panel,get lifecycle(){return control;},get ready(){return ready;},dispose(){disposed=true;clear();events?.removeEventListener?.('myr5:account-cleared',clear);events?.removeEventListener?.('myr5:account-ready',accountReady);panel.remove();}};
}
if(typeof document!=='undefined'){const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./expansion.css',import.meta.url);document.head.append(style);}
