// D-ship-route: full-screen ship view. Same coach capsule renderer as the pod's "Show my coach"
// card (creature/assets/phone.js), reparented full-screen, with the owned ship + biome backdrop
// composed behind it when the signed "Ships and worlds" pack is already downloaded and verified
// locally. No new download is ever started here — see localVerifiedBridge().
import {ownedShipIds} from './ship-access.mjs';
import {createVerifiedShipAssetBridge} from './verified-ship-assets.mjs';
import {initialScene} from './ship-scene-domain.mjs';
import {productionMaterialTrust} from '../materials/material-config.mjs';
import {resolvePostDownloadSection} from '../materials/post-download-sections.mjs';
import {ChunkDownloader, indexedDbChunkStore, DEFAULT_LOCAL_RESOURCE_POLICY} from '../materials/chunk-delivery.mjs';

const HASH = '#ship';
const RECIPE_KEY = 'myr5-recipe-v1';
const SHIP_SETTINGS_KEY = 'myr5-ship-customization-v1';
const readJSON = key => { try { const v = JSON.parse(localStorage.getItem(key) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };

/** Read-only: true only if this account's owned ship section is already downloaded and verified
 * on this device. Never fetches chunk bytes — a missing/partial pack always falls through to null
 * so opening this view can never start the 60MB download on its own. */
async function localVerifiedBridge() {
 const account = globalThis.myr5AuthenticatedAccount, owner = account?.user?.id;
 if (!owner || !ownedShipIds().length) return null;
 const trust = productionMaterialTrust(); if (!trust) return null;
 const resolved = await resolvePostDownloadSection('coach-ships-biomes', { trust });
 const downloader = new ChunkDownloader({ store: indexedDbChunkStore(), policy: DEFAULT_LOCAL_RESOURCE_POLICY, expectedVersion: resolved.manifest.version, manifestPublicKey: resolved.trust, ownership: async () => owner });
 await downloader.verifyStored(resolved.manifest); // local store reads + hash checks only, no network
 return createVerifiedShipAssetBridge({ downloader, manifest: resolved.manifest, isOwned: id => id === 'coach-ships-biomes', canUseShip: ownedShipIds });
}

function disposeModel(root) {
 const geometries = new Set(), materials = new Set(), textures = new Set();
 root?.traverse(node => { if (node.geometry) geometries.add(node.geometry); for (const mat of [].concat(node.material || [])) if (mat) { materials.add(mat); for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value); } });
 for (const t of textures) t.dispose(); for (const m of materials) m.dispose(); for (const g of geometries) g.dispose();
}

/** A still (idle hover only) ship + biome backdrop, not the full approach/beam/flash cinematic —
 * this is a passive viewer, not the unlock reveal. ponytail: no tint/customizer-tap here; add if
 * Ian wants the full ship-intro.mjs treatment reused instead of this lighter still scene. */
async function mountRealShip({ stage, bgEl, bridge, ship, background }) {
 const [THREE, { GLTFLoader }] = await Promise.all([import('three'), import('three/addons/loaders/GLTFLoader.js')]);
 bgEl.style.backgroundImage = `url("${bridge.getBackgroundUrl(background)}")`;
 const canvas = document.createElement('canvas'); canvas.className = 'ship-view-canvas'; stage.append(canvas);
 const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
 let renderer;
 try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
 catch (error) { canvas.remove(); throw error; }
 renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
 camera.position.set(0, .45, 7); camera.lookAt(0, .9, 0);
 scene.add(new THREE.HemisphereLight(0xe9d9ff, 0x23162d, 2.5));
 const key = new THREE.DirectionalLight(0xffefca, 4.2); key.position.set(-3, 5, 4); scene.add(key);
 const rim = new THREE.DirectionalLight(0xb58cff, 3.2); rim.position.set(4, 2, -3); scene.add(rim);
 const resize = () => { const r = stage.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
 const observer = new ResizeObserver(resize); observer.observe(stage); resize();
 let disposed = false;
 let loaded;
 try { loaded = await new GLTFLoader().loadAsync(bridge.getShipUrl(ship)); }
 catch (error) { observer.disconnect(); canvas.remove(); throw error; }
 if (disposed) { disposeModel(loaded.scene); observer.disconnect(); canvas.remove(); throw new DOMException('Ship view closed', 'AbortError'); }
 const box = new THREE.Box3().setFromObject(loaded.scene), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
 loaded.scene.position.sub(center);
 const group = new THREE.Group(); group.add(loaded.scene); group.scale.setScalar(2.25 / (Math.max(size.x, size.y, size.z) || 1));
 group.position.set(0, 1.82, 0); group.rotation.set(.08, -.32, 0); scene.add(group);
 const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
 let raf = 0; const start = performance.now();
 function tick(now) {
  if (disposed) return;
  if (!reduced) { group.position.y = 1.82 + Math.sin((now - start) / 820) * .07; group.rotation.y = -.32 + Math.sin((now - start) / 1700) * .055; }
  renderer.render(scene, camera); raf = requestAnimationFrame(tick);
 }
 raf = requestAnimationFrame(tick);
 return {
  dispose() {
   if (disposed) return; disposed = true; cancelAnimationFrame(raf); observer.disconnect();
   disposeModel(scene); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
   bridge.dispose?.();
  }
 };
}

let dialog = null, stage = null, bgEl = null, coachMount = null, note = null, fallback = null, downloadBtn = null;
let realShip = null, pushedHash = false, openEpoch = 0;

function showFallback() { bgEl.className = 'ship-view-bg ship-view-bg-fallback'; bgEl.style.backgroundImage = ''; fallback.hidden = false; }
function clearShipVisual() { realShip?.dispose(); realShip = null; bgEl.className = 'ship-view-bg'; bgEl.style.backgroundImage = ''; fallback.hidden = true; }

async function waitForCard(timeoutMs = 8000) {
 const started = performance.now();
 while (!document.querySelector('.myr5-companion-card') && performance.now() - started < timeoutMs) await new Promise(r => setTimeout(r, 50));
 return document.querySelector('.myr5-companion-card');
}

function onPopState() { if (dialog?.open && location.hash !== HASH) dialog.close(); }

function onClose() {
 openEpoch++; clearShipVisual();
 document.body.dataset.shipView = '';
 const card = coachMount.querySelector('.myr5-companion-card');
 if (card) document.getElementById('coachMount')?.append(card); // pod.mjs's own observer re-homes it (rest vs pod)
 if (location.hash === HASH) { if (pushedHash) history.back(); else history.replaceState(null, '', location.pathname + location.search); }
 pushedHash = false;
}

function build() {
 dialog = document.createElement('dialog'); dialog.className = 'ship-view'; dialog.setAttribute('aria-label', 'Your ship');
 dialog.innerHTML = '<div class="ship-view-stage"><div class="ship-view-bg" aria-hidden="true"></div><div class="ship-view-coach"></div></div>'
  + '<p class="ship-view-note" role="status"></p>'
  + '<div class="ship-view-fallback" hidden><p>Download Ships &amp; worlds to see your ship</p><button type="button" class="ship-view-download">Download Ships &amp; worlds</button></div>'
  + '<button type="button" class="ship-view-close" aria-label="Close">✕</button>';
 document.body.append(dialog);
 stage = dialog.querySelector('.ship-view-stage'); bgEl = dialog.querySelector('.ship-view-bg'); coachMount = dialog.querySelector('.ship-view-coach');
 note = dialog.querySelector('.ship-view-note'); fallback = dialog.querySelector('.ship-view-fallback'); downloadBtn = dialog.querySelector('.ship-view-download');
 dialog.querySelector('.ship-view-close').onclick = () => dialog.close();
 downloadBtn.onclick = () => { if (typeof window.myr5Packs?.open === 'function') window.myr5Packs.open('coach-ships-biomes'); else document.querySelector('.coach-dock [data-panel="install"]')?.click(); };
 dialog.addEventListener('close', onClose);
 window.addEventListener('popstate', onPopState);
 window.addEventListener('pagehide', () => realShip?.dispose());
 const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/modules/ships/ship-view.css'; document.head.append(css);
}

/** window.myr5Menus.ship(): opens the full-screen ship view and returns its <dialog> (the portal
 * uses this for its porthole reveal / fade-back, same contract as achievements). `loadCoachViewer`
 * is app.mjs's existing coach-capsule loader (same function "Show my coach" uses); `getBridge` is
 * overridable for tests. */
export async function openShipView({ loadCoachViewer, getBridge = localVerifiedBridge } = {}) {
 if (!dialog) build();
 const epoch = ++openEpoch;
 clearShipVisual(); note.textContent = 'Preparing your coach…';
 const firstOpen = !dialog.open;
 if (firstOpen) dialog.showModal();
 if (location.hash !== HASH) { pushedHash = true; history.pushState({ myr5Ship: true }, '', HASH); } else if (firstOpen) pushedHash = false;
 document.body.dataset.shipView = 'true';
 try { await loadCoachViewer?.(); } catch { /* surfaced below via the missing card */ }
 const card = await waitForCard();
 if (epoch !== openEpoch) return dialog;
 if (card) { coachMount.append(card); note.textContent = ''; }
 else note.textContent = 'Coach could not load. Check your connection and try again.';
 let bridge = null;
 try { bridge = await getBridge(); } catch { bridge = null; }
 if (epoch !== openEpoch) { bridge?.dispose?.(); return dialog; }
 if (!bridge) { showFallback(); return dialog; }
 try {
  const owner = globalThis.myr5AuthenticatedAccount?.user?.id, owned = bridge.ownedShipIds();
  const scene = initialScene(readJSON(RECIPE_KEY)), custom = readJSON(`${SHIP_SETTINGS_KEY}/${owner}`);
  const shipId = owned.includes(custom.ship) ? custom.ship : owned.includes(scene.ship) ? scene.ship : owned[0];
  const mounted = await mountRealShip({ stage, bgEl, bridge, ship: shipId, background: scene.background });
  if (epoch !== openEpoch) { mounted.dispose(); return dialog; }
  realShip = mounted; fallback.hidden = true;
 } catch { bridge.dispose?.(); showFallback(); }
 return dialog;
}
