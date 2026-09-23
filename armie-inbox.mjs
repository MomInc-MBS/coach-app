// The in-app inbox for Armie letters (D23): persisted, readable offline, and
// the source of truth -- a push notification is only ever a nudge to look
// here, never the only place a letter lives. Namespaced DB name so it never
// collides with the unrelated "armie" onboarding stage (see armie-letters.mjs).
import Dexie from 'dexie';

export const ARMIE_INBOX_DB = 'myr5-armie-letters-v1';
export const ARMIE_INBOX_SCHEMA_VERSION = 1;

// One row per fired letter, id `letter:<date>:<letterId>` so repeated
// delivery (a reopen catch-up, a retried push) is an idempotent upsert
// instead of a duplicate.
export const armieLetterId = (date, letterId) => `letter:${date}:${letterId}`;

export async function openArmieInbox({name = ARMIE_INBOX_DB, indexedDB = globalThis.indexedDB, IDBKeyRange = globalThis.IDBKeyRange} = {}) {
 const db = new Dexie(name, {indexedDB, IDBKeyRange});
 db.version(ARMIE_INBOX_SCHEMA_VERSION).stores({
  letters: '&id,date,read,firedAt',
  meta: '&key',
 });
 await db.open();

 return {
  close() { db.close({disableAutoOpen: true}); },
  // Idempotent: existing rows are left untouched so a re-delivered letter
  // never resets `read` back to unread or duplicates itself.
  async addLetters(letters, {now = () => Date.now()} = {}) {
   const added = [];
   await db.transaction('rw', db.letters, async () => {
    for (const {date, letterId, header, lines} of letters) {
     const id = armieLetterId(date, letterId);
     if (await db.letters.get(id)) continue;
     // `read` is stored 0/1, not boolean: IndexedDB key ranges (used by the
     // `read` index below) don't accept booleans as a valid key type.
     const row = {id, date, letterId, header, lines, firedAt: now(), read: 0};
     await db.letters.add(row);
     added.push(row);
    }
   });
   return added;
  },
  async listLetters() {
   return (await db.letters.toArray()).sort((a, b) => b.date.localeCompare(a.date) || b.firedAt - a.firedAt);
  },
  async unreadCount() {
   return db.letters.where('read').equals(0).count();
  },
  async markRead(id) {
   await db.letters.update(id, {read: 1});
  },
  async markAllRead() {
   await db.letters.where('read').equals(0).modify({read: 1});
  },
  // D23: "explain the iOS home-screen requirement once in the inbox, no
  // nagging" -- one flag, checked and set once by the inbox UI.
  async hasSeenIosNotice() {
   return !!(await db.meta.get('ios-home-screen-notice-seen'));
  },
  async markIosNoticeSeen() {
   await db.meta.put({key: 'ios-home-screen-notice-seen', value: true});
  },
  // D23: "ask for notification permission only after the first letter
  // exists" -- checked by the one caller that requests permission.
  async hasAnyLetterEver() {
   return (await db.letters.count()) > 0;
  },
 };
}
