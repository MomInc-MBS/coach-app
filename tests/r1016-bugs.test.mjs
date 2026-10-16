import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LOCAL_COACH_OPEN_TIMEOUT_MS} from '../local-coach/repository.mjs';

test('first-launch storage open tolerates slow devices but stays within the validated cap',()=>{
 assert.ok(LOCAL_COACH_OPEN_TIMEOUT_MS>=10000&&LOCAL_COACH_OPEN_TIMEOUT_MS<=60000);
});
test('guest probes are answered locally only when Clerk is on and no Clerk sign-in exists',async()=>{
 const src=await readFile(new URL('../auth-client.mjs',import.meta.url),'utf8');
 assert.match(src,/options\.guestSkip&&config\.enabled&&provider!=='clerk'/);
});
test('Not now pauses the auto-started download',async()=>{
 const src=await readFile(new URL('../post-download.mjs',import.meta.url),'utf8');
 assert.match(src,/\[data-later\]'\)\.onclick=\(\)=>\{if\(autoMenu&&controller\)controller\.abort\(\)/);
});
