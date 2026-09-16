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
async function verifyManifest(manifest,key){
 if(!isSignedExpansionManifest(manifest)||!plain(key)||key.kty!=='OKP'||key.crv!=='Ed25519'||typeof key.x!=='string')return false;
 try{const crypto=await subtle(),trusted=await crypto.importKey('jwk',key,{name:'Ed25519'},false,['verify']);return await crypto.verify({name:'Ed25519'},trusted,b64bytes(manifest.signature),new TextEncoder().encode(canonical(manifest)));}catch{return false;}
}
function safeAssetUrl(path,base){const url=new URL(path,base);if(url.origin!==base.origin||!url.pathname.startsWith('/modules/new/assets/'))throw new Error('Expansion asset origin/path is not allowed');return url;}

/** Tests may inject a test public key only with the explicit test-only purpose. Production remains fail-closed without a valid production signature. */
export async function resolveExpansionManifest({fetchImpl=globalThis.fetch,url=MANIFEST_URL,fixture=null,testTrust=null}={}){
 const trust=testTrust?.purpose==='test-only-signed-expansion'?testTrust.publicKey:(fixture?null:PRODUCTION_EXPANSION_KEY);
 if(!fixture&&!trust)throw new Error('Expansion unavailable: trusted production signing key is not configured');
 const manifest=fixture?.manifest??await(async()=>{if(typeof fetchImpl!=='function')throw new Error('Expansion manifest unavailable');const r=await fetchImpl(url,{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw new Error(`Expansion manifest unavailable (${r.status})`);return r.json();})();
 if(!(await verifyManifest(manifest,trust)))throw new Error('Expansion manifest signature is invalid');
 if(fixture){if(!testTrust)throw new Error('Expansion fixture requires explicit test-only trust');return {manifest,source:fixture.source};}
 const base=new URL(url,globalThis.location?.origin||'http://localhost');return {manifest,source:{async get(asset,previous){const r=await fetchImpl(safeAssetUrl(asset.path,base),{cache:'no-store',credentials:'same-origin',headers:previous?{Range:`bytes=${previous.byteLength}-`}:undefined});if(!r.ok)throw new Error(`Asset unavailable (${r.status})`);const body=new Uint8Array(await r.arrayBuffer());if(body.byteLength>asset.bytes)throw new Error('Expansion asset exceeds manifest length');return previous?new Uint8Array([...previous,...body]):body;}}};
}

// The pull and the reveal go down the phone, following the user's finger.
export function tearProgress(start,point,safeHeight=400){return !start||!point?0:Math.max(0,Math.min(1,(point.y-start.y)/Math.max(96,safeHeight*.28)));}
export function createPaperTearShell({document:doc=globalThis.document,onOpen=()=>{}}={}){
 if(!doc)return null;const shell=doc.createElement('section');shell.className='mom-paper-expansion';shell.setAttribute('aria-label','MOM paper expansion');shell.hidden=true;shell.innerHTML='<div class="paper-top-safe-area"><button type="button" class="paper-logo" aria-label="Pull MOM paper expansion down to open"><span aria-hidden="true">MOM</span><small>PULL DOWN TO OPEN</small></button></div><p class="paper-status" role="status"></p><div class="dimension-shell" hidden><div class="dimension-slot" aria-label="Expansion scene slot">COACH POD // PAPER DIMENSION</div><button type="button" class="paper-reopen">Close paper dimension</button></div>';
 const logo=shell.querySelector('.paper-logo'),status=shell.querySelector('.paper-status'),dimension=shell.querySelector('.dimension-shell');let start=null;const cancel=()=>{start=null;shell.classList.remove('paper-tearing');logo.style.removeProperty('--tear-progress');status.textContent='Pull canceled. Paper restored.';},open=()=>{dimension.hidden=false;logo.hidden=true;status.textContent='Paper dimension open.';onOpen(dimension);};
 logo.addEventListener('pointerdown',e=>{try{logo.setPointerCapture?.(e.pointerId);}catch{}start={x:e.clientX,y:e.clientY};shell.classList.add('paper-tearing');status.textContent='Pull down to tear.';});logo.addEventListener('pointermove',e=>{if(start)logo.style.setProperty('--tear-progress',tearProgress(start,{x:e.clientX,y:e.clientY},shell.clientHeight||400));});logo.addEventListener('pointerup',e=>{if(!start)return;const progress=tearProgress(start,{x:e.clientX,y:e.clientY},shell.clientHeight||400);start=null;shell.classList.remove('paper-tearing');logo.style.removeProperty('--tear-progress');if(progress>=.72)open();else cancel();});logo.addEventListener('pointercancel',cancel);shell.querySelector('.paper-reopen').addEventListener('click',()=>{dimension.hidden=true;logo.hidden=false;status.textContent='Paper restored. Pull down to reopen.';});logo.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});return shell;
}
export function mountExpansion({account,workoutOwner,workout,storage,assetStore,fetchImpl,fixture,testTrust,host=globalThis.document?.querySelector('.crew-footer')}={}){
 if(!host||!coachArmyComplete(account))return null;const doc=host.ownerDocument,panel=doc.createElement('section');panel.className='expansion-control';panel.setAttribute('aria-label','Optional MOM paper expansion');panel.innerHTML='<h2>OPTIONAL PAPER DIMENSION</h2><p data-expansion-copy>Verified Coach Army access. Download the optional expansion when ready.</p><button type="button" data-expansion-download>Download optional expansion</button><p data-expansion-status role="status"></p>';host.before(panel);const button=panel.querySelector('[data-expansion-download]'),status=panel.querySelector('[data-expansion-status]');let control=null,shell=null;const paint=v=>{if(!v)return;status.textContent=v.error||`${v.state}${v.receivedBytes?` · ${v.receivedBytes} bytes`:''}`;button.disabled=['downloading','verified','pending-equip','active'].includes(v.state);if(v.state==='active'){panel.querySelector('[data-expansion-copy]').textContent='Verified optional expansion active.';if(shell)shell.hidden=false;}};
 const runtimeFactory=async()=>{shell?.remove();shell=createPaperTearShell({document:doc});panel.append(shell);shell.hidden=false;return {dispose(){shell?.remove();shell=null;}};};
 const setup=async({activateAtBoot=false}={})=>{button.disabled=true;status.textContent='Checking signed expansion manifest…';try{const entry=await resolveExpansionManifest({fetchImpl,fixture,testTrust});control=createIsolatedPackControl({account:{getEntitlements:()=>coachArmyComplete(account)?[EXPANSION_ID]:[]},workout,workoutOwner,storage,assetStore,runtimeFactory,onChange:paint});control.manifest(entry.manifest,entry.source);if(activateAtBoot){const current=control.status(EXPANSION_ID);if(current.state==='pending-equip')await control.restart();else await control.restore();}paint(control.status(EXPANSION_ID));}catch(e){status.textContent=e.message||'Production expansion unavailable.';button.disabled=false;}};
 button.addEventListener('click',async()=>{if(!control)return setup();button.disabled=true;try{paint(await control.download(EXPANSION_ID));paint(await control.verify(EXPANSION_ID));paint(await control.equipPending(EXPANSION_ID));status.textContent='Verified and saved as pending. Reload Coach to activate.';button.disabled=false;}catch(e){status.textContent=e.message||'Download failed. Tap to retry.';button.disabled=false;}});
 // Manifest metadata is checked at unlocked startup; optional asset bytes are
 // fetched only from an explicit Download action. A pending pack activates only
 // during the next real app boot, never through this click handler.
 void setup({activateAtBoot:true});return {panel,get lifecycle(){return control;}};
}
if(typeof document!=='undefined'){const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./expansion.css',import.meta.url);document.head.append(style);}
