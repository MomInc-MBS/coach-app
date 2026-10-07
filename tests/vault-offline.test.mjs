import test from 'node:test';
import assert from 'node:assert/strict';
import {offlineInventory,VAULT} from '../scripts/offline-assets.mjs';
test('vault code and art stay out of the offline core (and the optional package)',async()=>{
 assert.ok(VAULT.test('/modules/vault/vault-hall.mjs')&&VAULT.test('/pod/worlds/vault/door-poster.webp')&&!VAULT.test('/modules/vaulted.mjs'));
 const {core,optional}=await offlineInventory('.');
 assert.deepEqual([...core,...optional].filter(a=>VAULT.test(a.url)).map(a=>a.url),[]);
});
