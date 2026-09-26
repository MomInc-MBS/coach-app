import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../server/cloudflare.mjs';

test('the public Worker never trusts Sites identity headers',async()=>{
 const forged={'oai-authenticated-user-id':'victim','oai-authenticated-user-email':'victim@example.test'};
 const DB={prepare(){assert.fail('A forged identity must not reach account storage.');}};
 const response=await worker.fetch(new Request('https://coach.test/api/account',{headers:forged}),{DB});
 assert.equal(response.status,401);
 assert.equal(typeof worker.scheduled,'function');
 assert.match(await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8'),/ssr:'server\/cloudflare\.mjs'/);
});
