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
 applyLookVars(el,{portal:'#112233',strip:'#000000'});
 assert.deepEqual([...props],[['--portal-metal','#112233'],['--frame-metal','#112233'],['--portal-strip-glow','#00000040']],'one Metal color reaches both housing surfaces and Strip owns its glow');
});

test('shared Metal reads legacy frame-only settings, prefers canonical Metal, and saves without touching Strip',()=>{
 const legacy='myr5.portalFrameMetal',m=mem();m.set(legacy,'#654321');m.set(LOOK_KEYS.strip,'#13aaff');
 assert.deepEqual(readLook(),{portal:'#654321',strip:'#13aaff'},'legacy frame-only choice remains visible');
 m.set(LOOK_KEYS.portal,'#123456');assert.deepEqual(readLook(),{portal:'#123456',strip:'#13aaff'},'canonical Metal wins when both old settings exist');
 saveLook('portal','#0c3456');assert.equal(m.get(LOOK_KEYS.portal),'#0c3456');assert.equal(m.has(legacy),false,'saving removes the obsolete independent frame value');assert.equal(m.get(LOOK_KEYS.strip),'#13aaff');
 saveLook('portal',LOOK_DEFAULTS.portal);assert.equal(m.has(LOOK_KEYS.portal),false);assert.equal(m.has(legacy),false);assert.equal(readLook().strip,'#13aaff','resetting only Metal preserves the chosen Strip color');
});
test('portal reads the shared look and saves the board on screen',async()=>{
 const src=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 assert.match(src,/store\.set\(BOARD_KEY,id\); \/\/ the saved choice is the board on screen/);
 assert.match(src,/energize\(restSeq\(\)\)/);
 const css=await readFile(new URL('../modules/portal/portal.css',import.meta.url),'utf8');
 assert.match(css,/#portalHome,#portalChrome\{--pm:var\(--portal-metal\)\}/,'both housing copies use the canonical Metal value');
});
