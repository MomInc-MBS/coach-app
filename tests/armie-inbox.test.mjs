import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB, IDBKeyRange} from 'fake-indexeddb';
import {openArmieInbox, armieLetterId} from '../armie-inbox.mjs';
import {pickArmieLetter} from '../armie-letters.mjs';

let seq = 0;
const nextDb = () => `myr5-armie-letters-test-${++seq}`;

test('adding letters is idempotent by (date, letterId) and lists newest first', async () => {
 const name = nextDb();
 const inbox = await openArmieInbox({name, indexedDB, IDBKeyRange});
 const letter = pickArmieLetter('forgive-1', '2026-10-05');
 await inbox.addLetters([{date: '2026-10-05', ...letter}]);
 await inbox.addLetters([{date: '2026-10-05', ...letter}]); // re-delivered, e.g. reopen catch-up
 const later = pickArmieLetter('milestone-5', '2026-10-09');
 await inbox.addLetters([{date: '2026-10-09', ...later}]);
 const rows = await inbox.listLetters();
 assert.equal(rows.length, 2, 'the repeated letter should not duplicate');
 assert.equal(rows[0].date, '2026-10-09');
 assert.equal(rows[0].id, armieLetterId('2026-10-09', 'milestone-5'));
 inbox.close();
});

test('marking a letter read does not get clobbered by a re-delivery', async () => {
 const name = nextDb();
 const inbox = await openArmieInbox({name, indexedDB, IDBKeyRange});
 const letter = pickArmieLetter('forgive-1', '2026-10-05');
 const [row] = await inbox.addLetters([{date: '2026-10-05', ...letter}]);
 assert.equal(await inbox.unreadCount(), 1);
 await inbox.markRead(row.id);
 assert.equal(await inbox.unreadCount(), 0);
 await inbox.addLetters([{date: '2026-10-05', ...letter}]); // re-delivered
 assert.equal(await inbox.unreadCount(), 0, 'a re-delivered letter must stay read, not reset to unread');
 inbox.close();
});

// D23: persisted and readable offline -- reopen the inbox (a fresh handle on
// the same database, like relaunching the app) and confirm everything is there.
test('letters, read state and the iOS notice flag survive closing and reopening the inbox', async () => {
 const name = nextDb();
 const first = await openArmieInbox({name, indexedDB, IDBKeyRange});
 const letter = pickArmieLetter('milestone-10', '2026-10-14');
 const [row] = await first.addLetters([{date: '2026-10-14', ...letter}]);
 await first.markRead(row.id);
 await first.markIosNoticeSeen();
 first.close();

 const second = await openArmieInbox({name, indexedDB, IDBKeyRange});
 const rows = await second.listLetters();
 assert.equal(rows.length, 1);
 assert.equal(rows[0].read, 1);
 assert.equal(rows[0].header, letter.header);
 assert.equal(await second.hasSeenIosNotice(), true);
 assert.equal(await second.hasAnyLetterEver(), true);
 second.close();
});

test('a fresh inbox has no letters and has not shown the iOS notice', async () => {
 const inbox = await openArmieInbox({name: nextDb(), indexedDB, IDBKeyRange});
 assert.equal(await inbox.hasAnyLetterEver(), false);
 assert.equal(await inbox.hasSeenIosNotice(), false);
 inbox.close();
});
