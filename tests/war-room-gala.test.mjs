// The War Room's 3D bay dresses the player's 64-bit Gala character, never the coach.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const code=text=>text.replace(/^\s*\/\/.*$/gm,'');

test('the War Room opens the Gala bay, not the coach customizer or its ship admission',async()=>{
 const [html,room,build]=await Promise.all(['war-room/index.html','war-room/war-room.mjs','scripts/build.mjs'].map(read));
 assert.doesNotMatch(html+code(room),/creature\/index\.html|SHIP_GATE|iframe/);
 assert.match(code(room),/import\('\/war-room\/gala-bay\.js'\)/);
 for(const script of ['/pod/gala-weapons.js','/pod/gala-avatar.js','/pod/gala-performer.js'])assert.ok(html.indexOf(script)>=0&&html.indexOf(script)<html.indexOf('/war-room/war-room.mjs'),script+' loads before the room');
 assert.match(html,/"three":"\/vendor\/three\/three\.module\.js"/);
 assert.match(build,/entryPoints:\['\.\/creature\/source\/war-room-gala\.ts'\][^\n]*outfile:'war-room\/gala-bay\.js'/);
});

test('the Gala bay never loads, saves or calls the coach, and writes only the Gala look',async()=>{
 const bay=code(await read('creature/source/war-room-gala.ts'));
 assert.doesNotMatch(bay,/from '\.\/(?:viewer|profile|save-look|editor|editor-workbench|rig|motion)'|creator\/|myr5-recipe|saveRecipe|\/api\//);
 assert.match(bay,/localStorage\.setItem\(GALA_KEY,JSON\.stringify\(A\.normalize\(next\)\)\)/,'every save is the normalized Gala look');
 assert.match(bay,/if\(!kept&&!W\.unlocked\(next\)\)next=\{type:next\.type,tier:0\}/,'an unearned weapon upgrade never saves');
 assert.match(bay,/mountCage\(stage,\{[\s\S]*?bay:showBay,labels:LABELS,volumes:\{pedestal:/,'Gala-only head hit area keeps the centre clothes station tappable');
});

test('the room bays map onto the existing Gala creator sections only',async()=>{
 const [bay,avatar]=await Promise.all([read('creature/source/war-room-gala.ts'),read('pod/gala-avatar.js')]);
 const context={window:{}};vm.runInNewContext(avatar,context);
 const ids=context.window.GalaAvatar.sections.map(s=>s.id),list=name=>JSON.parse(bay.match(new RegExp(`export const ${name}=(\\[[^\\]]*\\])`))[1].replace(/'/g,'"'));
 const mirror=list('MIRROR'),clothes=list('CLOTHES');
 assert.deepEqual(mirror,['body','skin','face','hair','facial'],'mirror: alien physical changes');
 for(const id of [...mirror,...clothes,'pet'])assert.ok(ids.includes(id),id+' is a Gala creator section');
 assert.equal(new Set([...mirror,...clothes,'pet']).size,mirror.length+clothes.length+1,'no section sits in two bays');
 assert.match(bay,/section==='pets'\)body\.replaceChildren\(\.\.\.sections\(\['pet'\]\),/);
 assert.match(bay,/coaches\.picker\('pet',load\)/);
 assert.match(bay,/coaches\.picker\('body',load\)/);
 assert.match(bay,/section==='weapons'\)body\.replaceChildren\(weaponForm\(\)\)/);
 assert.match(bay,/IDLE_WALK_MS=10000/);
});

test('the coach cage keeps its own tabs and bays when no Gala hooks are given',async()=>{
 const cage=code(await read('creature/source/cage.ts'));
 assert.match(cage,/if\(hooks\.bay\)\{[^}]*\}\s*else if\(section==='pedestal'\)hooks\.openTab\('body'\);\s*else if\(section==='mirror'\)hooks\.openTab\('materials'\);/);
 assert.match(cage,/b\.textContent=own\?\.label\?\?s\.label/);
});
