// Client glue for D12 Armie letters. Turns the `pendingLetters` that
// server/combat.mjs attaches to the existing 'myr5:account-progress' event
// into inbox rows. Self-initializing: importing this module (armie-inbox-ui.mjs
// does, from app.mjs) is the whole integration; it adds its own independent
// event listener rather than touching pod.mjs's dense render loop.
import {openArmieInbox} from './armie-inbox.mjs';
import {pickArmieLetter} from './armie-letters.mjs';
import {armieNotifyBlocked} from './armie-notify-gate.mjs';
import {authFetch} from './auth-client.mjs';

export const PUSH_PROMPTED_KEY = 'myr5-armie-push-prompted-v1';
const fromBase64 = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')), c => c.charCodeAt(0));

let inboxPromise = null;
export const armieInbox = () => inboxPromise ??= openArmieInbox().catch(error => {inboxPromise = null; throw error;});

// D23: offer is shown only inside the inbox once a letter exists (never on
// first launch), and only until tapped once.
export function canOfferArmiePush() {
 try {
  return 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator
   && Notification.permission === 'default' && !localStorage.getItem(PUSH_PROMPTED_KEY);
 } catch { return false; }
}

// Same subscribe steps as the settings-screen notification switch
// (launch.mjs). Must be called from a tap: Safari/iOS and Firefox only show
// the permission prompt inside a user gesture, so requestPermission() runs
// first, before any await.
export async function maybeRequestArmiePushPermission() {
 try {
  if (!canOfferArmiePush()) return false;
  localStorage.setItem(PUSH_PROMPTED_KEY, '1'); // ask once, ever -- D23 says never nag
  if (await Notification.requestPermission() !== 'granted') return false;
  const accountResponse = await authFetch('/api/account');
  if (!accountResponse.ok) return false;
  const account = await accountResponse.json();
  if (!account?.push?.configured || account.push.environment === 'preview') return false;
  const registration = await navigator.serviceWorker.ready;
  const sub = (await registration.pushManager.getSubscription()) || await registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: fromBase64(account.push.publicKey)});
  await authFetch('/api/push/subscribe', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(sub.toJSON())});
  return true;
 } catch { return false; } // best-effort; the inbox already has the letter either way
}

export async function handleArmieProgress(pendingLetters) {
 if (!pendingLetters?.length) return [];
 const store = await armieInbox();
 const letters = pendingLetters.map(({date, id}) => {
  const picked = pickArmieLetter(id, date);
  return picked && {date, ...picked};
 }).filter(Boolean);
 const added = await store.addLetters(letters);
 if (added.length) window.dispatchEvent(new CustomEvent('myr5:armie-inbox-updated', {detail: {added, blocked: armieNotifyBlocked()}}));
 return added;
}

if (typeof window !== 'undefined') window.addEventListener('myr5:account-progress', event => void handleArmieProgress(event.detail?.combat?.pendingLetters));

// D23: "a push arriving mid-workout is held until the set ends." sw.js asks
// this window (ARMIE_NOTIFY_CHECK); if busy it hands the payload over
// (ARMIE_LETTER_HELD) and this page shows it once camera-only mode and the set
// are both over. ponytail: held in memory only -- if the page closes first the
// OS toast is dropped, but the letter itself is still in the inbox.
const held = [];
const showHeld = async letter => (await navigator.serviceWorker.ready).showNotification(String(letter.title).slice(0, 80), {body: String(letter.body).slice(0, 200), icon: '/icons/myr5-alien-192.png', badge: '/icons/myr5-alien-192.png', tag: letter.tag, data: {url: letter.url, kind: letter.kind}});
export async function flushHeldArmiePushes(show = showHeld) {
 if (armieNotifyBlocked() || !held.length) return 0;
 const letters = held.splice(0);
 for (const letter of letters) await show(letter);
 return letters.length;
}
export function holdArmiePush(letter, show) { held.push(letter); return flushHeldArmiePushes(show); }

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
 navigator.serviceWorker.addEventListener('message', event => {
  if (event.data?.type === 'ARMIE_NOTIFY_CHECK') event.ports[0]?.postMessage({blocked: armieNotifyBlocked()});
  else if (event.data?.type === 'ARMIE_LETTER_HELD') void holdArmiePush(event.data.letter).catch(() => {});
 });
 new MutationObserver(() => void flushHeldArmiePushes().catch(() => {})).observe(document.body, {attributes: true, attributeFilter: ['data-tracking', 'data-camera-workout']});
}
