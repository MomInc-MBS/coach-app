import assert from 'node:assert/strict';
import {readFile,stat,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import test from 'node:test';
import {PRODUCTION_PORTALS} from '../modules/portal/portal.mjs';
import {offlineInventory} from '../scripts/offline-assets.mjs';

test('Quilt remains the built-in fallback while physics boards are selectable',async()=>{
 assert.deepEqual(PRODUCTION_PORTALS,['quilt','ice','grass','cogs','jelly','wood','pond']);
 const portal=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 assert.match(portal,/return 'quilt'/);
 assert.match(portal,/const BOARDS=\{quilt:/);
 assert.match(portal,/portal-board-(?:ice|grass|cogs|jelly|wood)/);
 assert.match(portal,/createGlbBoard/);
 const entry=await readFile(new URL('../modules/portal/portal-entry.mjs',import.meta.url),'utf8');
 assert.match(entry,/import\('\.\/portal\.mjs'\)/);
 const app=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 assert.match(app,/import\('\.\/modules\/portal\/portal-entry\.mjs'\)/);
 assert.match(app,/myr5Menus=.*portal/);
 assert.match(app,/addEventListener\('myr5:coach-plan'/);
 assert.match(app,/isInstalled\(\).*route\.has\('panel'\)/s);
 assert.match(app,/shouldShow:starterPortalReady/);
 assert.match(entry,/if\(!shouldShow\(\)\)return null/);
});

test('production build keeps physics board art in an opt-in group',async t=>{
 const client=fileURLToPath(new URL('../dist/client/',import.meta.url));
 try{await stat(client);}catch{t.skip('Run npm run build to verify the deploy inventory.');return;}
 const forbidden=['cog-kit.glb','cogs.glb'];
 async function files(dir){let out=[];for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name);out=e.isDirectory()?out.concat(await files(path)):[...out,path];}return out;}
 const paths=await files(client),portable=paths.map(path=>path.replaceAll('\\','/')),names=portable.map(path=>decodeURIComponent(path.split('/').at(-1)));
 for(const name of ['portal-board-glb.mjs','portal-board-ice.mjs','portal-board-grass.mjs','portal-board-cogs.mjs','portal-board-jelly.mjs','portal-board-wood.mjs','portal-board-pond.mjs'])assert(names.includes(name),`${name} ships`);
 assert(!portable.some(path=>path.includes('/plan/')),'authoring prototypes must not be deployed');
 assert(portable.some(path=>path.endsWith('/pod/worlds/quilt.webp')),'quilt texture ships');
 for(const name of forbidden)assert(!names.includes(name),`${name} must not ship`);
 for(const name of ['portal.mjs','portal-board.mjs','portal-shapes.mjs','portal-cut.mjs','portal.css'])assert(names.includes(name),`${name} ships for Quilt`);
 const {core,optional}=await offlineInventory(client);
 assert(optional.some(asset=>asset.url==='/pod/worlds/quilt.webp'&&asset.group==='starter'),'the quilt art is the Starter download (W2-2O), not core');
 assert(core.some(asset=>asset.url==='/vendor/three/three.module.js'),'offline core includes the starter portal renderer');
 for(const [id,names] of Object.entries({ice:['ice.glb'],grass:['grass.glb','flower.glb'],cogs:['door.glb','parts-kit.glb','door-layout.json'],jelly:['jelly.glb'],wood:['wood.glb'],pond:['pond-poster.webp']})){
  for(const name of names)assert(optional.some(asset=>asset.url.endsWith('/'+name)&&asset.group===`grimoire-${id}`),`${name} belongs to ${id} grimoire`);
  assert(optional.some(asset=>asset.url===`/modules/portal/portal-tunnel-${id}.mjs`&&asset.group===`grimoire-${id}`),`${id} tunnel belongs to its device packet`);
 }
 for(const name of ['classroom-wall.glb','classroom-desks.glb'])assert(optional.some(asset=>asset.url===`/pod/rooms/${name}`&&asset.group==='room-scoreboard'),`${name} belongs to the classroom packet`);
 for(const name of ['classroom.mjs','classroom.css'])assert(optional.some(asset=>asset.url===`/modules/rooms/${name}`&&asset.group==='room-scoreboard'),`${name} belongs to the classroom packet`);
 for(const url of ['/pod/rooms/console.glb','/pod/rooms/console.webp','/modules/rooms/reminders-computer.css'])assert(optional.some(asset=>asset.url===url&&asset.group==='room-reminders'),`${url} belongs to the Reminders computer packet`);
 assert(!core.some(asset=>asset.url.startsWith('/pod/rooms/')||asset.url.startsWith('/modules/rooms/')),'classroom art and Reminders art stay out of the core install');
 assert(!core.some(asset=>asset.url.startsWith('/pod/worlds/boards/')),'physics board art stays out of the core install');
});
