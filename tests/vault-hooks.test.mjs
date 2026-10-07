import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// L9 vault counter hooks: every hook file is checked for the right counter AND for an import path that resolves.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=f=>readFileSync(resolve(root,f),'utf8');
const HOOKS={ // file -> counters it must send
 'apple-basic-share.mjs':["bump('share')"],
 'armie-inbox-ui.mjs':["bump('armie-read')","bump('armie-ignored'"],
 'breathing.mjs':["bump('breath-mode'"],
 'menu.mjs':["bump('library-open'"],
 'spotify-terminal.mjs':["bump('dj-session')"],
 'launch.mjs':["bump('reminder-set')"],
 'scoreboard.mjs':["bump('scoreboard-link')"],
 'meal-scanner.mjs':["bump('food-scan')"],
 'app.mjs':["bump('ar-session')"],
 'modules/routes.mjs':["bump('history-open')"],
};
test('every static vault-store import in a hook resolves to the real file',()=>{
 for(const [file,needles] of Object.entries(HOOKS)){
  const text=src(file);
  for(const n of needles)assert.ok(text.includes(n),`${file} lacks ${n}`);
  const paths=[...text.matchAll(/import\('([^']*vault-store\.mjs)'\)/g)].map(m=>m[1]);
  assert.ok(paths.length,`${file} has no vault-store import`);
  for(const p of paths)assert.ok(existsSync(resolve(root,dirname(file),p)),`${file}: ${p} does not resolve`);
 }
});
test('raw-served files send events or queue instead of importing the store',()=>{
 assert.ok(existsSync(resolve(root,'modules/portal',src('modules/portal/portal.mjs').match(/import\('([^']*vault-store\.mjs)'\)/)[1])),'portal markSecret path'); // L0's own import
 for(const f of ['modules/portal/portal-board-pond.mjs','creature/source/war-room-gala.ts','arcade/tub-flight/game.mjs'])assert.ok(!src(f).includes('vault-store'),f);
 assert.ok(src('modules/portal/portal.mjs').includes("vaultSend({counter:'shape-opened',key:id})"));
 assert.ok(src('modules/portal/portal-board-pond.mjs').includes("counter:'pond-fish'"));
 const gala=src('creature/source/war-room-gala.ts');
 for(const n of ["vaultQueue('gala-part')","vaultQueue('gala-slot',id)","vaultQueue('gala-slot','dye')","vaultQueue('gala-slot','weapon')"])assert.ok(gala.includes(n),n);
 assert.ok(src('arcade/tub-flight/game.mjs').includes("'arcade-score',game.score"));
 assert.ok(src('modules/routes.mjs').includes("import('./vault/vault-store.mjs')"));
});
test('grimoire time: one flush per visible stretch, no interval, flushed on hide/visibilitychange/pagehide',()=>{
 const p=src('modules/portal/portal.mjs');
 assert.ok(!p.includes('grimTimer')&&!/setInterval\([^)]*grim/.test(p));
 assert.ok(p.includes("addEventListener('pagehide',grimFlush")&&p.includes("document.hidden)grimFlush()"));
 const a=p.indexOf('const vaultSend'),b=p.indexOf('\nfunction setVisible');
 const sent=[];let now=1000;
 const ctx={dispatchEvent:e=>sent.push(e.detail),CustomEvent:class{constructor(t,i){this.detail=i.detail;}},Date:{now:()=>now}};
 vm.createContext(ctx);
 vm.runInContext(p.slice(a,b)+';globalThis.show=()=>{visibleSince=Date.now();};globalThis.flush=grimFlush;',ctx);
 ctx.show();now=6000;ctx.flush();ctx.flush(); // hide, then visibilitychange + pagehide fire too
 assert.equal(JSON.stringify(sent),JSON.stringify([{counter:'grim-time',ms:5000}]));
 ctx.show();now=8000;ctx.flush();assert.equal(sent.length,2);assert.equal(sent[1].ms,2000);
});
test('vault-store hears myr5:vault-bump (bump and ms) and drains the pending queue',async()=>{
 const memory=new Map(),listeners={};
 globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
 globalThis.myr5AuthenticatedAccount={user:{id:'hooks-test'}};
 globalThis.CustomEvent=class{constructor(t,i){this.detail=i?.detail;}};
 globalThis.window={dispatchEvent(){},addEventListener:(t,f)=>{listeners[t]=f;}};
 localStorage.setItem('myr5-vault-pending',JSON.stringify([['gala-part',1],['gala-slot',1,'dye']]));
 const store=await import('../modules/vault/vault-store.mjs?hooks');
 assert.equal(store.read().counters['gala-part'],1);assert.equal(store.read().counters['gala-slot'],1);assert.equal(localStorage.getItem('myr5-vault-pending'),null);
 listeners['myr5:vault-bump']({detail:{counter:'grim-time',ms:3000}});listeners['myr5:vault-bump']({detail:{counter:'shape-opened',key:'x'}});
 assert.equal(store.read().time['grim-time'],3000);assert.equal(store.read().counters['shape-opened'],1);
});
