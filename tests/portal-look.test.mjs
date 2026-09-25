import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LOOK_DEFAULTS,LOOK_KEYS,cleanColor,readLook,saveLook,stripSeq,applyLookVars} from '../modules/portal/portal-look.mjs';

const mem=()=>{const m=new Map();globalThis.localStorage={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};return m;};

test('colours are sanitized to #rrggbb and reset removes the key',()=>{
 const m=mem();
 assert.equal(cleanColor('#ABCDEF',null),'#abcdef');
 for(const bad of ['red','#fff','url(x)','#12345g',null,'#1234567'])assert.equal(cleanColor(bad,'x'),'x');
 saveLook('strip','#00ff88');assert.equal(readLook().strip,'#00ff88');
 saveLook('strip','javascript:1');assert.equal(readLook().strip,LOOK_DEFAULTS.strip);
 saveLook('strip','#00ff88');saveLook('strip',LOOK_DEFAULTS.strip);assert.equal(m.has(LOOK_KEYS.strip),false);
 m.set(LOOK_KEYS.portal,'</style>');assert.equal(readLook().portal,LOOK_DEFAULTS.portal);
});
test('strip sequence stays valid hex and only default vars are left unset',()=>{
 assert.ok(stripSeq('#b026ff').every(c=>/^#[0-9a-f]{6}$/.test(c)));
 const props=new Map(),el={style:{setProperty:(k,v)=>props.set(k,v),removeProperty:k=>props.delete(k)}};
 applyLookVars(el,{portal:'#112233',frame:LOOK_DEFAULTS.frame,strip:'#000000'});
 assert.deepEqual([...props],[['--portal-metal','#112233']]);
});
test('portal reads the shared look and keeps an uncached board choice',async()=>{
 const src=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 assert.match(src,/if\(id===wanted\)store\.set\(BOARD_KEY,id\)/);
 assert.match(src,/energize\(restSeq\(\)\)/);
 const css=await readFile(new URL('../modules/portal/portal.css',import.meta.url),'utf8');
 assert.match(css,/#portalChrome\{--pm:var\(--frame-metal\)\}/);
});
