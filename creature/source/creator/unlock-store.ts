// One global unlock ledger, shared across every coach (not per-coach). A later battle-pass
// worker calls grantUnlock() when the player earns an item; the registry decides whether an
// id needs a grant at all ('default' items are always unlocked and never touch this store).
export type UnlockKind = 'texture' | 'color' | 'palette';
const KEY = 'myr5-unlocks-v1';
type Store = Record<UnlockKind, string[]>;
const empty = (): Store => ({ texture: [], color: [], palette: [] });

function read(): Store {
 try {
  const d = JSON.parse(localStorage.getItem(KEY) || '{}');
  return { texture: Array.isArray(d.texture) ? d.texture : [], color: Array.isArray(d.color) ? d.color : [], palette: Array.isArray(d.palette) ? d.palette : [] };
 } catch { return empty(); }
}
function write(store: Store) { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage unavailable: grant just won't persist across reloads */ } }

export const isGranted = (kind: UnlockKind, id: string) => read()[kind].includes(id);
export function grantUnlock(kind: UnlockKind, id: string) { const s = read(); if (!s[kind].includes(id)) { s[kind].push(id); write(s); } }
export const grantedIds = (kind: UnlockKind) => read()[kind];
