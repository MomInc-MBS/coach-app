import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCreatureSkinManifests } from '../scripts/build-creature-skin-manifests.mjs';
import { buildPostDownloadSections, unpackBundle } from '../scripts/build-post-download-sections.mjs';
import { DEFAULT_LOCAL_RESOURCE_POLICY, validateChunkManifest } from '../modules/materials/chunk-delivery.mjs';
import { postDownloadSectionStatus, resolvePostDownloadSection, starterPostDownloadSectionIds, fullPostDownloadSectionIds, POST_DOWNLOAD_SECTIONS } from '../modules/materials/post-download-sections.mjs';
import { postDownloadChoices } from '../modules/materials/post-download-ui.mjs';
import { unpackVerifiedBundle } from '../modules/materials/verified-bundle.mjs';
import { acceptShipRevealComplete, canShowCoachEditorShipSection, coachEditorShips, SHIP_REVEAL_KEY } from '../modules/ships/ship-access.mjs';
import * as unlockLedger from '../unlock-ledger.mjs';
import { bossRewards, CREATURE_SKIN_REWARDS, SHIP_DEFINITIONS, TRACKS } from '../battle-pass-rewards.mjs';
import { LEDGER_KINDS } from '../unlock-ledger.mjs';

const root = process.cwd();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('the two skin packets stay additive, uniquely namespaced, and checksum-identical', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'myr5-skins-'));
  try {
    const generated = await buildCreatureSkinManifests({ root, outputDir: temp, catalogPath: join(temp, 'runtime', 'creature-skins.json') });
    assert.equal(generated.skins, 48);
    const catalog = JSON.parse(await readFile(join(temp, 'runtime', 'creature-skins.json'), 'utf8'));
    assert.equal(catalog.additive, true);
    assert.equal(new Set(catalog.skins.map(x => x.id)).size, 48);
    assert.deepEqual(catalog.colorSpace, { basecolor:'srgb', tintMask:'srgb', normal:'linear', roughness:'linear', height:'linear', ao:'linear', metalness:'linear', opacity:'linear', emissive:'srgb' });
    assert.equal(catalog.normalConvention, 'OpenGL +Y');
    assert.match(catalog.tinting, /tint-mask multiplied by selected creature palette/);
    const legacyRegistry=await readFile(join(root,'creature/source/creator/materials-registry.ts'),'utf8');

    const ids = new Set();
    for (const packet of ['forged-realms','celestial-rift']) {
      const sourceText=await readFile(join(root, `plan/assets-inbox/creature-skins/${packet}/source-manifest.json`), 'utf8');
      assert.equal(sha(sourceText.replaceAll('\r\n','\n')),{'forged-realms':'1a11eaa0ed509a0612b1c7cc31e2fc3664ef58cdd2d37e9e09db484d858f4a42','celestial-rift':'4bd028f7461c1b64d88cf7b6dae86ce32818bc004993f58416ee9fef5aa2601e'}[packet],'exact immutable source IDs, hashes, licenses and color-space semantics are retained');
      const source = JSON.parse(sourceText);
      for (const item of source.items) {
        assert.ok(item.id.startsWith('creature-'));
        assert.ok(!legacyRegistry.includes(item.id),`${item.id} must not replace or overlap a fitness material id`);
        assert.ok(!ids.has(item.id), `id collision ${item.id}`); ids.add(item.id);
        assert.equal(item.license, 'CC0-1.0');
        const catalogItem=catalog.skins.find(row=>row.id===item.id);
        assert.ok(catalogItem,`${item.id} is present in the runtime catalog`);
        assert.equal(catalogItem.runtime.pack,`track-${item.track}`);
        assert.deepEqual([catalogItem.sourceUrl,catalogItem.license,catalogItem.author],[item.sourceUrl,item.license,item.author]);
        assert.deepEqual(catalogItem.maps,item.maps,`${item.id} source map sizes and hashes stay verbatim`);
        for (const map of Object.values(item.maps)) {
          const bytes = await readFile(join(root, `plan/assets-inbox/creature-skins/${packet}`, map.file));
          assert.equal(bytes.byteLength, map.bytes, `${item.id}/${map.file} byte count`);
          assert.equal(sha(bytes), map.sha256, `${item.id}/${map.file} digest`);
        }
      }
    }
    assert.equal(ids.size, 48);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('track packets combine both additive collections; ships stay in a separate resumable packet', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'myr5-section-build-'));
  try {
    const baseUrl='https://raw.githubusercontent.com/mominc/myr5-packs/0123456789abcdef0123456789abcdef01234567/materials';
    const result = await buildPostDownloadSections({ root, outputDir: temp, baseUrl });
    assert.equal(result.signed, false);
    assert.equal(result.activation, 'blocked-until-signed-and-hosted');
    assert.deepEqual(result.sections.map(x => [x.id,x.assets]), [['track-arms',1],['track-cardio',1],['track-chest',1],['track-glutes',1],['track-martial-arts',1],['track-meditation',1],['track-quads',1],['track-yoga',1],['coach-ships-biomes',7]]);
    const policy = { ...DEFAULT_LOCAL_RESOURCE_POLICY, trustedOrigins:['https://raw.githubusercontent.com'], pathPrefix:'/mominc/myr5-packs/0123456789abcdef0123456789abcdef01234567/materials/' };
    for (const section of result.sections) {
      const dir = join(temp,section.id);
      const manifest = JSON.parse(await readFile(join(dir,'chunk-manifest.unsigned.json'),'utf8'));
      assert.equal(manifest.signature,'');
      assert.equal(validateChunkManifest(manifest,policy),true);
      assert.equal(manifest.assets.length,section.assets);
      assert.ok(manifest.assets.every(asset => asset.chunks.every(chunk => chunk.bytes <= 1024*1024 && new URL(chunk.url).origin === 'https://raw.githubusercontent.com')));
      assert.ok(manifest.assets.every(asset=>asset.chunks.every(chunk=>new URL(chunk.url).pathname.startsWith(`${policy.pathPrefix}${manifest.packId}/1.0.0/`))));
      for (const asset of manifest.assets) {
        const bytes = await readFile(join(dir,asset.path));
        assert.equal(bytes.byteLength,asset.bytes);
        assert.equal(sha(bytes),asset.sha256);
        for (const chunk of asset.chunks) assert.equal(sha(bytes.subarray(chunk.offset,chunk.offset+chunk.bytes)),chunk.sha256);
      }
    }
    const sample = await readFile(join(temp,'track-chest','assets','chest.m5bundle'));
    const entries = unpackBundle(sample);
    const runtimeEntries = await unpackVerifiedBundle(sample);
    const forged = JSON.parse(await readFile(join(root,'plan/assets-inbox/creature-skins/forged-realms/source-manifest.json'),'utf8')).items.find(x=>x.track==='chest'&&x.collectionSlot===1);
    const celestial = JSON.parse(await readFile(join(root,'plan/assets-inbox/creature-skins/celestial-rift/source-manifest.json'),'utf8')).items.find(x=>x.track==='chest'&&x.collectionSlot===1);
    assert.equal(sha(entries.get(`${forged.id}/basecolor`)),forged.maps.basecolor.sha256);
    assert.equal(sha(runtimeEntries.get(`${celestial.id}/tintMask`)),celestial.maps.tintMask.sha256,'both collections are in one track packet');
    const corrupt = Buffer.from(sample);corrupt[corrupt.length-1]^=1;await assert.rejects(()=>unpackVerifiedBundle(corrupt),/integrity/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('starter selection is the three chosen styles plus meditation; other tracks remain separately requestable',()=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage'), values=new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))}});
  try {
    values.set('myr5-selected-tracks-v1',JSON.stringify(['chest','arms-shoulders','cardio']));
    const account={user:{id:'starter-test'},onboarding:{data:{profile:{exercises:['squat']}}}};
    assert.deepEqual(starterPostDownloadSectionIds(account),['track-meditation','track-chest','track-arms','track-cardio']);
    assert.deepEqual(POST_DOWNLOAD_SECTIONS.filter(x=>x.track).map(x=>x.id).sort(),['track-arms','track-cardio','track-chest','track-glutes','track-martial-arts','track-meditation','track-quads','track-yoga']);
    assert.ok(POST_DOWNLOAD_SECTIONS.some(x=>x.id==='coach-ships-biomes'));
    assert.deepEqual([...fullPostDownloadSectionIds()].sort(),['coach-ships-biomes','track-arms','track-cardio','track-chest','track-glutes','track-martial-arts','track-meditation','track-quads','track-yoga']);
    const choices=postDownloadChoices(account,new Set(fullPostDownloadSectionIds()));
    assert.deepEqual(choices.starter,['track-meditation','track-chest','track-arms','track-cardio']);
    assert.deepEqual([...choices.individual].sort(),['coach-ships-biomes','track-glutes','track-martial-arts','track-quads','track-yoga']);
    assert.deepEqual([...choices.all].sort(),[...fullPostDownloadSectionIds()].sort());
    const partial=postDownloadChoices(account,new Set(['track-meditation','track-chest','track-arms','coach-ships-biomes']));
    assert.deepEqual(partial.starter,[],'starter is withheld rather than silently omitting a selected track packet');
    assert.deepEqual(postDownloadChoices(null,new Set(fullPostDownloadSectionIds())),{starter:[],individual:[],all:[]},'anonymous users only see the unchanged legacy full download');
    for(const selection of [[],['chest'],['chest','cardio','quads','glutes']]){values.set('myr5-selected-tracks-v1',JSON.stringify(selection));assert.deepEqual(starterPostDownloadSectionIds(account),[],'starter needs exactly three chosen workouts, never silently fills or omits choices');}
  } finally { if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage; }
});

test('skin unlock slots are deterministic and additive to existing first-boss rewards', () => {
  assert.ok(LEDGER_KINDS.includes('creature-skin'));
  assert.equal(CREATURE_SKIN_REWARDS.length, 48);
  for (const [row, meta] of Object.entries(TRACKS)) {
    const boardRow = { chest:'strider', quads:'ringer', glutes:'manyarm', 'arms-shoulders':'wedge', yoga:'blob', 'martial-arts':'cap', cardio:'stalk', meditation:'tanka' }[row];
    const levels = bossRewards(`${boardRow}-1`);
    assert.ok(levels[0].some(item => item.kind === 'texture'), `${row}: original L1 texture retained`);
    assert.ok(levels[2].some(item => item.kind === 'texture'), `${row}: original L3 texture retained`);
    assert.ok(levels[4].some(item => item.kind === 'texture'), `${row}: original L5 texture retained`);
    for (const level of [0,2,4]) {
      const additions = levels[level].filter(item => item.kind === 'creature-skin');
      assert.equal(additions.length, 2, `${row}: two packet skins at L${level + 1}`);
      assert.ok(additions.every(item => item.track === meta.catalog));
    }
  }
  assert.equal(bossRewards('strider-2').flat().filter(item => item.kind === 'creature-skin').length, 0, 'style rewards appear once on the track first boss');
});

test('six distinct ship IDs cycle through both L3/L5 milestones on every track, not by family', () => {
  assert.equal(SHIP_DEFINITIONS.length, 16);
  assert.equal(new Set(SHIP_DEFINITIONS.map(x => x.id)).size, 6);
  const cycle=['supportive','direct','analytical','playful','calm','mom'];
  assert.deepEqual(SHIP_DEFINITIONS.map(x=>x.ship),Array.from({length:16},(_,i)=>cycle[i%6]));
  const rows = { chest:'strider', quads:'ringer', glutes:'manyarm', arms:'wedge', yoga:'blob', 'martial-arts':'cap',cardio:'stalk',meditation:'tanka' };
  for(const row of Object.values(rows)){const levels=bossRewards(`${row}-1`);for(const level of [3,5])assert.equal(levels[level-1].filter(x=>x.kind==='ship').length,1);}
  for (const ship of SHIP_DEFINITIONS) {
    const row = rows[ship.track], levels = bossRewards(`${row}-1`);
    assert.ok(levels[ship.level-1].some(x => x.kind==='ship' && x.id===ship.id && x.ship===ship.ship));
  }
  assert.equal(bossRewards('strider-2').flat().filter(x=>x.kind==='ship').length,0);
  assert.ok(LEDGER_KINDS.includes('ship'));
});

test('Ship editor access requires both explicit ownership and persisted completed reveal', () => {
  const old = Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const data = new Map(), storage = { getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,String(v)) };
  Object.defineProperty(globalThis,'localStorage',{ configurable:true, value:storage });
  try {
    const account = { user:{id:'test-owner-ship'} }, options = { account, storage };
    assert.equal(canShowCoachEditorShipSection(options),false);
    unlockLedger.grantUnlock('ship','ship-supportive',options);
    assert.deepEqual(coachEditorShips(options),[]);
    assert.equal(acceptShipRevealComplete({detail:{ship:'supportive',revealComplete:false}},options),false);
    assert.equal(acceptShipRevealComplete({detail:{ship:'supportive',revealComplete:true,ownerId:'other-owner'}},options),false);
    assert.equal(acceptShipRevealComplete({detail:{ship:'supportive',revealComplete:true,ownerId:account.user.id}},options),true);
    assert.deepEqual(coachEditorShips(options),['supportive']);
    assert.equal(canShowCoachEditorShipSection(options),true);
    assert.ok(data.has(SHIP_REVEAL_KEY));
    assert.deepEqual(coachEditorShips({account:{user:{id:'different-owner'}},storage}),[]);
    assert.equal(unlockLedger.isGranted('ship','ship-supportive',{account:null}),false);
  } finally {
    if (old) Object.defineProperty(globalThis,'localStorage',old); else delete globalThis.localStorage;
  }
});

test('unsigned local sections remain blocked until a real production key and hosted signature exist', async () => {
  assert.deepEqual(postDownloadSectionStatus('track-chest'),{available:false,reason:'signing-key-not-configured'});
  await assert.rejects(()=>resolvePostDownloadSection('coach-ships-biomes',{trust:null,fetchImpl:()=>{throw Error('must not fetch')}}),/signing key/);
  assert.deepEqual(postDownloadSectionStatus('coach-ships-biomes',{trust:{kty:'OKP',crv:'Ed25519',x:'a'.repeat(43)},manifest:{packId:'coach-ships-biomes',version:'1.0.0',signature:''}}),{available:false,reason:'signed-hosted-manifest-required'});
});
