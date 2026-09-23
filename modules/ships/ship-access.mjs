import * as ledger from '../../unlock-ledger.mjs';

export const SHIP_REVEAL_KEY = 'myr5-ship-reveal-seen-v1';
export const SHIP_IDS = Object.freeze(['supportive','direct','analytical','playful','calm','mom']);
const stableOwner = account => {
  const id = account?.user?.id ?? account?.id;
  return typeof id === 'string' && /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/.test(id) ? id : null;
};
const ownedId = id => SHIP_IDS.includes(id) && ledger.isGranted('ship', `ship-${id}`);
function read(store = globalThis.localStorage) {
  try { const value = JSON.parse(store?.getItem(SHIP_REVEAL_KEY) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  catch { return {}; }
}

export function ownedShipIds() { return SHIP_IDS.filter(ownedId); }
export function hasSeenShipReveal(ship, { account = globalThis.myr5AuthenticatedAccount, storage = globalThis.localStorage } = {}) {
  const owner = stableOwner(account);
  return !!owner && ownedId(ship) && Array.isArray(read(storage)[owner]) && read(storage)[owner].includes(ship);
}
export function markShipRevealSeen(ship, { account = globalThis.myr5AuthenticatedAccount, storage = globalThis.localStorage } = {}) {
  const owner = stableOwner(account);
  if (!owner || !ownedId(ship) || !storage?.setItem) return false;
  const data = read(storage), seen = new Set(Array.isArray(data[owner]) ? data[owner] : []);
  seen.add(ship); data[owner] = [...seen].filter(SHIP_IDS.includes.bind(SHIP_IDS)).sort();
  try { storage.setItem(SHIP_REVEAL_KEY, JSON.stringify(data)); return true; } catch { return false; }
}
export function coachEditorShips(options = {}) {
  return ownedShipIds().filter(ship => hasSeenShipReveal(ship, options));
}
export const canShowCoachEditorShipSection = (options = {}) => coachEditorShips(options).length > 0;

/** Only the scene's post-flash completion event advances reveal-seen state. */
export function acceptShipRevealComplete(event, options = {}) {
  const detail = event?.detail;
  if (!detail?.revealComplete || !SHIP_IDS.includes(detail.ship)) return false;
  return markShipRevealSeen(detail.ship, options);
}
