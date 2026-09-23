import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {DAY_MS} from '../combat.mjs';
import {runArmieLetterScheduler} from '../server/armie-scheduler.mjs';

let mf,database;
before(async () => {
 mf = new Miniflare({modules: true, script: 'export default {fetch(){return new Response("ok")}}', d1Databases: ['DB']});
 database = await mf.getD1Database('DB');
 for (const file of (await readdir('drizzle')).filter(f => f.endsWith('.sql')).sort())
  for (const sql of (await readFile('drizzle/' + file, 'utf8')).split('--> statement-breakpoint').filter(s => s.trim()))
   await database.prepare(sql).run();
});
after(async () => mf?.dispose());

// The scheduler is NOT deployed (see server/armie-scheduler.mjs header). This
// exercises its letter logic with an injected fake sender and an in-memory
// "already sent" tracker standing in for the table a deployment would need.
test('the scheduler sends each newly-fired letter once per subscription and never re-sends after markSent', async () => {
 const day0 = 30000, user = 'scheduler-user';
 // day0 kept, day0+1 missed (forgiven -> forgive-1), day0+2 kept
 for (const day of [day0, day0 + 2]) await database.prepare('INSERT INTO login_days(user_id,day,logged_at) VALUES(?,?,?)').bind(user, day, day * DAY_MS).run();
 await database.prepare('INSERT INTO subscriptions(endpoint,user_id,data,created_at) VALUES(?,?,?,?)').bind('https://fcm.googleapis.com/x', user, JSON.stringify({endpoint: 'https://fcm.googleapis.com/x', keys: {p256dh: 'a', auth: 'b'}}), 1000).run();

 const sent = [];
 const sentTracker = new Set();
 const alreadySent = async (u, date, id) => sentTracker.has(`${u}|${date}|${id}`);
 const markSent = async (u, date, id) => void sentTracker.add(`${u}|${date}|${id}`);
 const send = async (env, sub, date, letterId) => { sent.push({date, letterId}); };

 const now = (day0 + 2) * DAY_MS + 1000;
 const first = await runArmieLetterScheduler({}, database, {now, alreadySent, markSent, send});
 assert.equal(first.sent, sent.length);
 assert.ok(sent.some(s => s.letterId === 'forgive-1'), 'expected the forgiven-miss letter to be picked up');

 const sentAfterFirstRun = sent.length;
 const second = await runArmieLetterScheduler({}, database, {now, alreadySent, markSent, send});
 assert.equal(second.sent, 0, 'a second run with the same markSent state must not re-send');
 assert.equal(sent.length, sentAfterFirstRun);
});

test('a user with no push subscription is skipped without error', async () => {
 const day0 = 31000, user = 'no-sub-user';
 await database.prepare('INSERT INTO login_days(user_id,day,logged_at) VALUES(?,?,?)').bind(user, day0, day0 * DAY_MS).run();
 const result = await runArmieLetterScheduler({}, database, {now: day0 * DAY_MS + 1000, alreadySent: async () => false, markSent: async () => {}, send: async () => { throw Error('should not be called'); }});
 assert.equal(result.sent, 0);
 assert.equal(result.failed, 0);
});
