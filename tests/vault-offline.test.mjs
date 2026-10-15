import test from 'node:test';
import assert from 'node:assert/strict';
import {offlineInventory,VAULT} from '../scripts/offline-assets.mjs';
test('vault code and art stay out of the offline core (and the optional package)',async()=>{
 assert.ok(VAULT.test('/modules/vault/vault-hall.mjs')&&VAULT.test('/pod/worlds/vault/door-poster.webp')&&!VAULT.test('/modules/vaulted.mjs'));
 const {core,optional}=await offlineInventory('.');
 assert.deepEqual([...core,...optional].filter(a=>VAULT.test(a.url)).map(a=>a.url),[]);
});
test('game quest callbacks keep Vault out of their static offline module closure',async()=>{
 const {readFile}=await import('node:fs/promises');
 const [pyramid,rest]=await Promise.all(['../arcade/pyramid-jump/game.mjs','../arcade/slice/rest-game.mjs'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
 for(const source of [pyramid,rest]){
  assert.doesNotMatch(source,/^\s*import\s+.*modules\/vault\/quest-progress\.mjs/m);
  assert.match(source,/createQuestProgressReporter/);
 }
 const {core,optional}=await offlineInventory('.');
 assert.deepEqual([...core,...optional].filter(a=>a.url.includes('/modules/vault/quest-progress.mjs')),[]);
 const store=await readFile(new URL('../modules/vault/vault-store.mjs',import.meta.url),'utf8');
 assert.match(store,/import\('\.\.\/\.\.\/arcade\/quest-progress-reporter\.mjs'\)/,'opening Vault retries saved same-owner game maxima');
});
