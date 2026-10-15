import test from 'node:test';
import assert from 'node:assert/strict';
import {offlineInventory,VAULT} from '../scripts/offline-assets.mjs';
test('Vault code and art stay out of core and ship in the public offline package',async()=>{
 assert.ok(VAULT.test('/modules/vault/vault-hall.mjs')&&VAULT.test('/pod/worlds/vault/door-poster.webp')&&!VAULT.test('/modules/vaulted.mjs'));
 const {core,optional}=await offlineInventory('.');
 assert.deepEqual(core.filter(a=>VAULT.test(a.url)).map(a=>a.url),[],'Vault remains outside the first-run core');
 const vault=optional.filter(a=>VAULT.test(a.url));
 assert.ok(vault.length>=7,'Vault modules and public art are included');
 assert.ok(vault.every(a=>a.group==='vault'),'every public Vault asset is one selectable package group');
 for(const url of ['/modules/vault/vault-hall.mjs','/modules/vault/vault-store.mjs','/modules/vault/vault-door.mjs','/pod/worlds/vault/door-poster.webp'])
  assert.ok(vault.some(a=>a.url===url),`${url} is packaged`);
});
test('game quest callbacks keep Vault out of their static offline module closure',async()=>{
 const {readFile}=await import('node:fs/promises');
 const [pyramid,rest]=await Promise.all(['../arcade/pyramid-jump/game.mjs','../arcade/slice/rest-game.mjs'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
 for(const source of [pyramid,rest]){
  assert.doesNotMatch(source,/^\s*import\s+.*modules\/vault\/quest-progress\.mjs/m);
  assert.match(source,/createQuestProgressReporter/);
 }
 const {core,optional}=await offlineInventory('.');
 assert.ok(core.every(a=>a.url!=='/modules/vault/quest-progress.mjs'));
 assert.ok(optional.some(a=>a.url==='/modules/vault/quest-progress.mjs'&&a.group==='vault'),'Vault quest code is present in the optional public package');
 const store=await readFile(new URL('../modules/vault/vault-store.mjs',import.meta.url),'utf8');
 assert.match(store,/import\('\.\.\/\.\.\/arcade\/quest-progress-reporter\.mjs'\)/,'opening Vault retries saved same-owner game maxima');
});
