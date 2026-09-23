import assert from 'node:assert/strict';
import {readFile,stat,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import test from 'node:test';
import {PRODUCTION_PORTALS} from '../modules/portal/portal.mjs';
import {offlineInventory} from '../scripts/offline-assets.mjs';

test('Quilt is the sole production portal and the fixed starter',async()=>{
 assert.deepEqual(PRODUCTION_PORTALS,['quilt']);
 const portal=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 assert.match(portal,/return 'quilt'/);
 assert.match(portal,/const BOARDS=\{quilt:/);
 assert.doesNotMatch(portal,/portal-board-(?:ice|grass|cogs|jelly|wood)|createGlbBoard/);
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

test('production build contains quilt but no experimental portal board runtime or models',async t=>{
 const client=fileURLToPath(new URL('../dist/client/',import.meta.url));
 try{await stat(client);}catch{t.skip('Run npm run build to verify the deploy inventory.');return;}
 const forbidden=['portal-board-glb.mjs','portal-board-ice.mjs','portal-board-grass.mjs','portal-board-cogs.mjs','portal-board-jelly.mjs','portal-board-wood.mjs','parts-kit.glb','cog-kit.glb','ice.glb','grass.glb','jelly.glb','wood.glb','cogs.glb'];
 async function files(dir){let out=[];for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name);out=e.isDirectory()?out.concat(await files(path)):[...out,path];}return out;}
 const paths=await files(client),portable=paths.map(path=>path.replaceAll('\\','/')),names=portable.map(path=>decodeURIComponent(path.split('/').at(-1)));
 assert.deepEqual((await readdir(join(client,'modules/portal'))).sort(),['portal-board.mjs','portal-cut.mjs','portal-entry.mjs','portal-shapes.mjs','portal.css','portal.mjs']);
 assert(!portable.some(path=>path.includes('/plan/')),'authoring prototypes must not be deployed');
 assert(portable.some(path=>path.endsWith('/pod/worlds/quilt.webp')),'quilt texture ships');
 for(const name of forbidden)assert(!names.includes(name),`${name} must not ship`);
 for(const name of ['portal.mjs','portal-board.mjs','portal-shapes.mjs','portal-cut.mjs','portal.css'])assert(names.includes(name),`${name} ships for Quilt`);
 const {core,optional}=await offlineInventory(client);
 assert(core.some(asset=>asset.url==='/pod/worlds/quilt.webp'),'offline core includes the starter portal art');
 assert(core.some(asset=>asset.url==='/vendor/three/three.module.js'),'offline core includes the starter portal renderer');
 assert(!optional.some(asset=>/\/(?:ice|grass|jelly|wood|cogs|cog-kit|parts-kit)\.glb$/i.test(asset.url)),'experimental board models are absent from the post-download package');
});
