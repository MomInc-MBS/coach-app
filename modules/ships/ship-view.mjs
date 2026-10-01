// D-ship-route: full-screen ship view. Same coach capsule renderer as the pod's "Show my coach"
// card (creature/assets/phone.js), reparented full-screen, with the owned ship + biome backdrop
// composed behind it when the signed "Ships and worlds" pack is already downloaded and verified
// locally. Without that pack (signed out, no ship owned, or not downloaded) Original MYR5's bundled
// starter ship and a starter wonder show instead, with his entrance the first open of the session.
// `getBridge`/`ownedShipIds` are injected by app.mjs (modules/ships/ship-view-bridge.mjs) —
// scripts/build.mjs serves THIS file unbundled in production (no Vite, no build-time defines), so it
// must stay free of imports that need either. tests/ship-view-import-graph.test.mjs enforces that.
import {offAxis} from '../portal/peer.mjs'; // #135: tilt looks round the ship through the portal window
import {initialScene,SHIP_ANCHOR_Y,SHIP_FACING,SHIP_REST_Z,coachBand,shipPoseAbove,measureShip,openCustomizer} from './ship-scene-domain.mjs';
import {STARTER_WONDERS,backgroundForDay,starterWonderUrl} from '../../meditation-backgrounds.mjs';

const HASH = '#ship';
const RECIPE_KEY = 'myr5-recipe-v1';
const SHIP_SETTINGS_KEY = 'myr5-ship-customization-v1';
const readJSON = key => { try { const v = JSON.parse(localStorage.getItem(key) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };

// Original MYR5's recipe (coach 'supportive') maps to this ship through initialScene().
const STARTER_SHIP = 'supportive', STARTER_SHIP_URL = '/pod/worlds/starter/supportive.glb';
const UPGRADE_TEXT = 'Earn ships on your tracks · Download Ships & worlds for all of them';
let starterEntranceDone = false; // once per app session (page lifetime)

function disposeModel(root) {
 const geometries = new Set(), materials = new Set(), textures = new Set();
 root?.traverse(node => { if (node.geometry) geometries.add(node.geometry); for (const mat of [].concat(node.material || [])) if (mat) { materials.add(mat); for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value); } });
 for (const t of textures) t.dispose(); for (const m of materials) m.dispose(); for (const g of geometries) g.dispose();
}

/** A still (idle hover only) ship + biome backdrop, not the full approach/beam/flash cinematic —
 * used after the first arrival has completed. */
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
 let place = () => {};
 const resize = () => { const r = stage.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); place(); };
 const observer = new ResizeObserver(resize); observer.observe(stage); resize();
 let disposed = false;
 let loaded;
 try { loaded = await new GLTFLoader().loadAsync(bridge.getShipUrl(ship)); }
 catch (error) { observer.disconnect(); canvas.remove(); throw error; }
 if (disposed) { disposeModel(loaded.scene); observer.disconnect(); canvas.remove(); throw new DOMException('Ship view closed', 'AbortError'); }
 const box = new THREE.Box3().setFromObject(loaded.scene), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
 loaded.scene.position.sub(center);
 const group = new THREE.Group(), model = new THREE.Group(), fit = 2.25 / (Math.max(size.x, size.y, size.z) || 1); model.rotation.y = SHIP_FACING; model.add(loaded.scene); group.add(model); group.scale.setScalar(fit);
 group.position.set(0, SHIP_ANCHOR_Y, SHIP_REST_Z); group.rotation.set(.08, -.32, 0); scene.add(group);
 // Same hover pose as the arrival scene's end: the whole hull above the coach card.
 const measured = measureShip(THREE, group, camera); let pose;
 place = () => { pose = shipPoseAbove(coachBand(stage.getBoundingClientRect(), coachMount.getBoundingClientRect()), measured); group.position.y = pose.y; group.scale.setScalar(fit * pose.scale); };
 place();
 // #148: the still ship opens the customizer exactly like the arrival's ship does (tap the hull, or Enter/Space).
 const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
 canvas.tabIndex = 0; canvas.setAttribute('role', 'button'); canvas.setAttribute('aria-label', 'Customize this coach');
 canvas.addEventListener('click', e => { const r = canvas.getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)); raycaster.setFromCamera(pointer, camera); if (raycaster.intersectObject(group, true).length) openCustomizer(); });
 canvas.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCustomizer(); } });
 const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
 let raf = 0; const start = performance.now();
 function tick(now) {
  if (disposed) return;
  if (!reduced) { group.position.y = pose.y + Math.sin((now - start) / 820) * .07 * pose.scale; group.rotation.y = -.32 + Math.sin((now - start) / 1700) * .055; }
  offAxis(camera, 7); renderer.render(scene, camera); raf = requestAnimationFrame(tick);
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

let dialog = null, stage = null, bgEl = null, coachMount = null, note = null, fallback = null, downloadBtn = null, customizeBtn = null, retryBtn = null, errorLine = null;
let viewOwner = null, lastOpen = {};
let realShip = null, pushedHash = false, openEpoch = 0, coachStage = null, openHash = HASH;
const LOADING = 'Loading your ship…';

function clearShipVisual() { realShip?.dispose(); realShip = null; bgEl.style.backgroundImage = ''; fallback.hidden = true; customizeBtn.hidden = true; retryBtn.hidden = true; errorLine.hidden = true; }
// #148: no ship to tap (no WebGL, or the model failed): the customizer is still one plain button away.
function offerCustomizer() { fallback.hidden = false; customizeBtn.hidden = false; }
// A ship that failed to load says so and can be tried again (the same open, re-run in place).
function offerRetry(text) { errorLine.textContent = text; errorLine.hidden = false; retryBtn.hidden = false; fallback.hidden = false; }
// Inside the app modules/routes.mjs owns this view's #hash (it pushes and pops it: one owner of history). Standalone
// (no router) the view keeps its own.
const routed = () => !!window.myr5Routes;

/** W2-2O: the starter ship and wonders are Starter-pack art. When the ship didn't load because it isn't on this
 * phone (offline, never downloaded; not a WebGL failure), the plain backdrop and the coach stay, and the Starter
 * pack is offered. */
async function offerStarter(isCurrent) {
 if (navigator.onLine || await globalThis.caches?.match(STARTER_SHIP_URL).catch(() => null) || !isCurrent()) return false;
 const line = fallback.querySelector('p'); line.textContent = 'Your starter ship and its worlds come with the Starter pack.'; line.hidden = false;
 downloadBtn.textContent = 'Download the Starter pack'; downloadBtn.dataset.pack = 'starter'; downloadBtn.hidden = false; fallback.hidden = false;
 return true;
}

/** No verified pack: the starter ship over today's starter wonder. The upgrade line shows only when
 * signed in; the download button only when they own a ship. Reduced motion or a repeat open idles. */
async function showStarter({ signedIn, owned, isCurrent, always = false }) {
 const background = starterWonderUrl(backgroundForDay(STARTER_WONDERS));
 bgEl.style.backgroundImage = `url("${background}")`;
 const line = fallback.querySelector('p'); line.textContent = UPGRADE_TEXT; line.hidden = !signedIn; downloadBtn.textContent = 'Download Ships & worlds'; downloadBtn.dataset.pack = 'coach-ships-biomes'; downloadBtn.hidden = !owned.length; fallback.hidden = !signedIn;
 const bridge = { ownedShipIds: () => [STARTER_SHIP], getShipUrl: () => STARTER_SHIP_URL, getBackgroundUrl: () => background };
 try {
  if ((always || !starterEntranceDone) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
   const { mountShipScene } = await import('./ship-intro.mjs');
   if (!isCurrent()) return;
   const scene = realShip = mountShipScene({ host: stage, assetBridge: bridge, ship: STARTER_SHIP, starter: true });
   // Offered (W2-2O): the arrival scene steps aside (its beam and status), leaving the plain backdrop, the coach and the offer.
   // No ship to tap either way (#148): the plain customizer button shows too.
   if (await scene.ready) { if (isCurrent()) starterEntranceDone = true; return true; }
   if (await offerStarter(isCurrent) && realShip === scene) { scene.dispose(); realShip = null; } if (isCurrent()) offerCustomizer();
   return false;
  }
  const mounted = await mountRealShip({ stage, bgEl, bridge, ship: STARTER_SHIP });
  if (!isCurrent()) mounted.dispose(); else realShip = mounted;
  return true;
 } catch { await offerStarter(isCurrent); if (isCurrent()) offerCustomizer(); /* no WebGL or model: the wonder and the coach still show */ return false; }
}

async function waitForCard(timeoutMs = 8000) {
 const started = performance.now();
 while (!document.querySelector('.myr5-companion-card') && performance.now() - started < timeoutMs) await new Promise(r => setTimeout(r, 50));
 return document.querySelector('.myr5-companion-card');
}

function onPopState() { if (!routed() && dialog?.open && location.hash !== openHash) dialog.close(); }

function onClose() {
 // The native `close` event is queued. A same-task route handoff can close and immediately reopen this
 // shared dialog before that event is delivered; that old event must not invalidate the new open.
 if (dialog?.open) return;
 openEpoch++; clearShipVisual();
 document.body.dataset.shipView = '';
 if (coachStage) window.myr5Creature?.stage?.(coachStage); coachStage = null;
 window.myr5Creature?.park?.(); // the capsule stops drawing under the quilt; its next stage() (this view, a workout) wakes it
 const card = coachMount.querySelector('.myr5-companion-card');
 if (card) document.getElementById('coachMount')?.append(card); // pod.mjs's own observer re-homes it (rest vs pod)
 if (!routed() && location.hash === openHash) { if (pushedHash) history.back(); else history.replaceState(null, '', location.pathname + location.search); }
 pushedHash = false;
}

function build() {
 dialog = document.createElement('dialog'); dialog.className = 'ship-view'; dialog.setAttribute('aria-label', 'Your ship');
 dialog.innerHTML = '<div class="ship-view-stage"><div class="ship-view-bg" aria-hidden="true"></div><div class="ship-view-coach"></div></div>'
  + '<p class="ship-view-note" role="status"></p>'
  + '<div class="ship-view-fallback" hidden><strong class="ship-view-error" role="alert" hidden></strong><p></p><button type="button" class="ship-view-retry" hidden>Try again</button><button type="button" class="ship-view-download">Download Ships &amp; worlds</button><button type="button" class="ship-view-customize" hidden>Open the customizer</button></div>'
  + '<button type="button" class="ship-view-close" aria-label="Close">✕</button>';
 document.body.append(dialog);
 stage = dialog.querySelector('.ship-view-stage'); bgEl = dialog.querySelector('.ship-view-bg'); coachMount = dialog.querySelector('.ship-view-coach');
 note = dialog.querySelector('.ship-view-note'); fallback = dialog.querySelector('.ship-view-fallback'); downloadBtn = dialog.querySelector('.ship-view-download'); customizeBtn = dialog.querySelector('.ship-view-customize');
 retryBtn = dialog.querySelector('.ship-view-retry'); errorLine = dialog.querySelector('.ship-view-error');
 retryBtn.onclick = () => { if (dialog.open) void openShipView(lastOpen); };
 customizeBtn.onclick = () => openCustomizer();
 dialog.querySelector('.ship-view-close').onclick = () => dialog.close();
 downloadBtn.onclick = () => { if (typeof window.myr5Packs?.open === 'function') window.myr5Packs.open(downloadBtn.dataset.pack || 'coach-ships-biomes'); else document.querySelector('.coach-dock [data-panel="install"]')?.click(); };
 dialog.addEventListener('close', onClose);
 window.addEventListener('popstate', onPopState);
 window.addEventListener('pagehide', () => { openEpoch++; clearShipVisual(); });
 const accountChanged = () => { if (dialog.open && globalThis.myr5AuthenticatedAccount?.user?.id !== viewOwner) { openEpoch++; clearShipVisual(); dialog.close(); } };
 window.addEventListener('myr5:account-ready', accountChanged);
 window.addEventListener('myr5:account-cleared', accountChanged);
 const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/modules/ships/ship-view.css'; document.head.append(css);
}

/** window.myr5Menus.ship(): opens the full-screen ship view and returns its <dialog> (the portal
 * uses this for its porthole reveal / fade-back, same contract as achievements). `loadCoachViewer`
 * is app.mjs's existing coach-capsule loader (same function "Show my coach" uses); `getBridge` and
 * `ownedShipIds` come from app.mjs's statically-bundled modules/ships/ship-view-bridge.mjs (this
 * file is served unbundled and cannot import that chain itself — see the header comment). Both are
 * overridable for tests. W2-2A: `entrance: 'always'` plays the ship's fly-in and beam-down on every open (the
 * portal's oval, Ian 2026-09-23) instead of once per session / once per ship; `hash` is the route this open
 * owns in history (the oval's is '#select'; Menu -> Ship keeps '#ship' and the once-per-session entrance). */
export async function openShipView({ loadCoachViewer, getBridge = async () => null, ownedShipIds = () => [], mountArrival = () => null, entrance = 'first', hash = HASH } = {}) {
 if (!dialog) build();
 lastOpen = arguments[0] || {};
 const epoch = ++openEpoch;
 const owner = viewOwner = globalThis.myr5AuthenticatedAccount?.user?.id;
 const isCurrent = () => epoch === openEpoch && dialog.open && globalThis.myr5AuthenticatedAccount?.user?.id === owner;
 clearShipVisual(); note.textContent = 'Preparing your coach…';
 const firstOpen = !dialog.open;
 if (firstOpen) { openHash = hash; dialog.showModal(); }
 if (routed()) pushedHash = false; else if (location.hash !== openHash) { pushedHash = true; history.pushState({ myr5Ship: true }, '', openHash); } else if (firstOpen) pushedHash = false;
 document.body.dataset.shipView = 'true';
 try { await loadCoachViewer?.(); } catch { /* surfaced below via the missing card */ }
 const card = await waitForCard();
 if (!isCurrent()) return dialog;
 // Frame the whole body in the card (feet on its bottom edge) so the ship can hover clear above its top edge.
 if (card) { coachMount.append(card); note.textContent = LOADING; coachStage ??= window.myr5Creature?.stats?.().stage || null; window.myr5Creature?.stage?.('overlay'); }
 else note.textContent = 'Coach could not load. Check your connection and try again.';
 try { await showShip({ getBridge, ownedShipIds, mountArrival, entrance, owner, isCurrent }); }
 finally { if (epoch === openEpoch && note.textContent === LOADING) note.textContent = ''; }
 return dialog;
}

async function showShip({ getBridge, ownedShipIds, mountArrival, entrance, owner, isCurrent }) {
 const signedIn = !!globalThis.myr5AuthenticatedAccount?.user?.id;
 let bridge = null;
 try { bridge = await getBridge(); } catch { bridge = null; }
 if (!isCurrent()) { bridge?.dispose?.(); return; }
 const always = entrance === 'always';
 if (!bridge) { if (!await showStarter({ signedIn, owned: signedIn ? ownedShipIds() : [], isCurrent, always }) && isCurrent()) offerRetry('The ship could not load.'); return; }
 try {
  const owned = bridge.ownedShipIds();
  const arrival = await mountArrival({host:stage,assetBridge:bridge,isCurrent});
  if (!isCurrent()) { if (arrival) arrival.dispose(); else bridge.dispose?.(); return; }
  if (arrival) {
   realShip = arrival;
   const completed = await arrival.ready;
   if (!isCurrent()) { arrival.dispose(); return; }
   if (!completed) throw new Error('Ship arrival did not complete');
   fallback.hidden = true; return;
  }
  const scene = initialScene(readJSON(RECIPE_KEY)), custom = readJSON(`${SHIP_SETTINGS_KEY}/${owner}`);
  const shipId = owned.includes(custom.ship) ? custom.ship : owned.includes(scene.ship) ? scene.ship : owned[0];
  if (always && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
   const { mountShipScene } = await import('./ship-intro.mjs');
   if (!isCurrent()) { bridge.dispose?.(); return; }
   const intro = mountShipScene({ host: stage, assetBridge: bridge, ship: shipId });
   realShip = { dispose() { intro.dispose(); bridge.dispose?.(); } };
   const arrived = await intro.ready; if (!isCurrent()) return;
   if (!arrived) throw new Error('Ship arrival did not complete'); // the owned ship failed: fall back to the starter below
   fallback.hidden = true; return;
  }
  const mounted = await mountRealShip({ stage, bgEl, bridge, ship: shipId, background: scene.background });
  if (!isCurrent()) { mounted.dispose(); return; }
  realShip = mounted; fallback.hidden = true;
 } catch (error) {
  if (!isCurrent()) { bridge.dispose?.(); return; }
  if (error?.name !== 'AbortError') console.warn('Owned ship unavailable', error);
  clearShipVisual(); bridge.dispose?.();
  const starter = await showStarter({ signedIn, owned: signedIn ? ownedShipIds() : [], isCurrent, always });
  if (isCurrent()) offerRetry(starter ? 'Your ship did not load, so the starter ship came instead.' : 'Your ship did not load.');
 }
}
