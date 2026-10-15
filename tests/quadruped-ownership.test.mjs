import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(repo, 'package.json'));
const { build } = require('esbuild');
const buildFile = resolve(repo, '.quadruped-ownership.test-build.mjs');
const rigBuildFile = resolve(repo, '.quadruped-rig-motion.test-build.mjs');
const motionBuildFile = resolve(repo, '.quadruped-motion.test-build.mjs');
const assembleBuildFile = resolve(repo, '.quadruped-assemble.test-build.mjs');
const modelRoot = resolve(repo, 'creature/models/roster');
const blobName = 'blob_creature_3d_model';
const names = [
  'dragon_creature_3d_model', 'fantasy_creature_3d_model1', 'fantasy_creature_3d_model3',
  'four-legged_robot_3d_model', 'quadruped_robot_3d_model1', 'quadruped_robot_3d_model',
  'robotic_dog_3d_model', 'stylized_quadruped_3d_model', 'wooden_four-legged_robot_3d_model', blobName,
];
const repaired = new Set([
  'fantasy_creature_3d_model1', 'fantasy_creature_3d_model3', 'quadruped_robot_3d_model', 'quadruped_robot_3d_model1', 'robotic_dog_3d_model',
  'four-legged_robot_3d_model', 'wooden_four-legged_robot_3d_model', blobName,
]);
const bodyFragmentOnly = new Map([
  ['quadruped_robot_3d_model', 1],
  ['quadruped_robot_3d_model1', 548],
  ['stylized_quadruped_3d_model', 256],
]);

function fingerprint(scene) {
  const rows = [];
  scene.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry, index = geometry.index;
    const count = index?.count ?? geometry.attributes.position.count;
    for (let i = 0; i + 2 < count; i += 3) {
      const triangle = [];
      for (let j = 0; j < 3; j++) {
        const vertex = index ? index.getX(i + j) : i + j, attrs = {};
        for (const [name, attribute] of Object.entries(geometry.attributes)) {
          attrs[name] = Array.from({ length: attribute.itemSize }, (_, k) => attribute.array[vertex * attribute.itemSize + k]);
        }
        triangle.push(attrs);
      }
      rows.push(JSON.stringify(triangle));
    }
  });
  rows.sort();
  return createHash('sha256').update(rows.join('\n')).digest('hex');
}

function triangleCount(root) {
  let total = 0;
  root?.traverse(object => {
    if (object.isMesh) total += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
  });
  return total;
}

function pointSurfaceDistance(point, meshes) {
  let best = Infinity;
  const triangle = new T.Triangle(), closest = new T.Vector3(), a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  for (const mesh of meshes) {
    const geometry = mesh.geometry, position = geometry.getAttribute('position'), index = geometry.index;
    for (let face = 0, count = (index?.count ?? position.count) / 3; face < count; face++) {
      a.fromBufferAttribute(position, index ? index.getX(face * 3) : face * 3).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(position, index ? index.getX(face * 3 + 1) : face * 3 + 1).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(position, index ? index.getX(face * 3 + 2) : face * 3 + 2).applyMatrix4(mesh.matrixWorld);
      triangle.set(a, b, c).closestPointToPoint(point, closest);
      best = Math.min(best, point.distanceTo(closest));
      if (best <= 1e-5) return best;
    }
  }
  return best;
}

function meshPointDistance(mesh, point) {
  let best = Infinity;
  const geometry = mesh.geometry, position = geometry.getAttribute('position'), index = geometry.index;
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), triangle = new T.Triangle(), closest = new T.Vector3();
  for (let face = 0, count = (index?.count ?? position.count) / 3; face < count; face++) {
    a.fromBufferAttribute(position, index ? index.getX(face * 3) : face * 3).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(position, index ? index.getX(face * 3 + 1) : face * 3 + 1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(position, index ? index.getX(face * 3 + 2) : face * 3 + 2).applyMatrix4(mesh.matrixWorld);
    triangle.set(a, b, c).closestPointToPoint(point, closest);
    best = Math.min(best, point.distanceTo(closest));
    if (best <= 1e-5) return best;
  }
  return best;
}

function meshesUnder(root, predicate = () => true) {
  const out = [];
  root?.traverse(object => { if (object.isMesh && predicate(object)) out.push(object); });
  return out;
}

function subsetGeometry(source, triangleIds) {
  const position = source.getAttribute('position'), index = source.index;
  const remap = new Map(), sourceVertices = [], outIndex = [];
  for (const triangle of triangleIds) for (let j = 0; j < 3; j++) {
    const old = index ? index.getX(triangle * 3 + j) : triangle * 3 + j;
    let next = remap.get(old);
    if (next === undefined) { next = sourceVertices.length; remap.set(old, next); sourceVertices.push(old); }
    outIndex.push(next);
  }
  const out = new source.constructor();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const values = new attribute.array.constructor(sourceVertices.length * attribute.itemSize);
    sourceVertices.forEach((old, i) => {
      for (let k = 0; k < attribute.itemSize; k++) values[i * attribute.itemSize + k] = attribute.array[old * attribute.itemSize + k];
    });
    out.setAttribute(name, new attribute.constructor(values, attribute.itemSize, attribute.normalized));
  }
  out.setIndex(outIndex);
  out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}

function connectedComponents(mesh) {
  const geometry = mesh.geometry, index = geometry.index, count = (index?.count ?? geometry.attributes.position.count) / 3;
  const position = geometry.getAttribute('position'), world = mesh.matrixWorld;
  const pointKey = vertex => {
    const point = new T.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(world);
    return `${Math.round(point.x / 0.003)},${Math.round(point.y / 0.003)},${Math.round(point.z / 0.003)}`;
  };
  const edges = new Map();
  for (let tri = 0; tri < count; tri++) for (let j = 0; j < 3; j++) {
    const a = pointKey(index ? index.getX(tri * 3 + j) : tri * 3 + j);
    const b = pointKey(index ? index.getX(tri * 3 + (j + 1) % 3) : tri * 3 + (j + 1) % 3);
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const row = edges.get(key); if (row) row.push(tri); else edges.set(key, [tri]);
  }
  const adjacency = Array.from({ length: count }, () => []);
  for (const ids of edges.values()) if (ids.length > 1) for (const a of ids) for (const b of ids) if (a !== b) adjacency[a].push(b);
  const seen = new Uint8Array(count), groups = [];
  for (let i = 0; i < count; i++) {
    if (seen[i]) continue;
    const queue = [i], group = []; seen[i] = 1;
    for (let q = 0; q < queue.length; q++) { const tri = queue[q]; group.push(tri); for (const next of adjacency[tri]) if (!seen[next]) { seen[next] = 1; queue.push(next); } }
    groups.push(group);
  }
  return groups;
}

function prepareBlobSource(scene) {
  const body = scene.getObjectByName('body'), arms = scene.getObjectByName('arms'), feet = scene.getObjectByName('feet');
  scene.updateWorldMatrix(true, true);
  for (const child of [...arms.children]) {
    const relative = body.matrixWorld.clone().invert().multiply(child.matrixWorld);
    relative.decompose(child.position, child.quaternion, child.scale);
    body.add(child);
  }
  const mesh = feet.children.find(child => child.isMesh);
  const groups = connectedComponents(mesh);
  const pelvis = groups.find(group => {
    if (group.length < 1000 || group.length > 1500) return false;
    const box = new T.Box3();
    const p = mesh.geometry.getAttribute('position'), ix = mesh.geometry.index;
    for (const tri of group) for (let j = 0; j < 3; j++) {
      const v = ix ? ix.getX(tri * 3 + j) : tri * 3 + j;
      box.expandByPoint(new T.Vector3().fromBufferAttribute(p, v).applyMatrix4(mesh.matrixWorld));
    }
    const center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
    return Math.abs(center.x) < 0.2 && size.x > 1 && size.z > 2;
  });
  assert.ok(pelvis, 'Blob fixture: identify connected central pelvis before assembly transfer');
  const moved = new Set(pelvis), remaining = Array.from({ length: (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3 }, (_, i) => i).filter(id => !moved.has(id));
  const part = mesh.clone(false); part.geometry = subsetGeometry(mesh.geometry, pelvis);
  mesh.geometry = subsetGeometry(mesh.geometry, remaining);
  scene.updateWorldMatrix(true, true);
  const relative = body.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
  relative.decompose(part.position, part.quaternion, part.scale);
  body.add(part);
}

test('quadruped ownership conserves source triangles and isolates verified lower limbs', async () => {
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
  globalThis.self = globalThis;
  await MeshoptDecoder.ready;
  await build({
    entryPoints: [resolve(repo, 'creature/source/quadruped-ownership.ts')],
    outfile: buildFile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    external: ['three'],
  });
  await build({ entryPoints: [resolve(repo, 'creature/source/rig.ts')], outfile: rigBuildFile, bundle: true, platform: 'node', format: 'esm', target: 'node22', external: ['three'] });
  await build({ entryPoints: [resolve(repo, 'creature/source/motion.ts')], outfile: motionBuildFile, bundle: true, platform: 'node', format: 'esm', target: 'node22', external: ['three'] });
  await build({ entryPoints: [resolve(repo, 'creature/source/creator/assemble.ts')], outfile: assembleBuildFile, bundle: true, platform: 'node', format: 'esm', target: 'node22', external: ['three'] });
  try {
    const { correctQuadrupedOwnership } = await import(pathToFileURL(buildFile).href);
    const { createRig } = await import(pathToFileURL(rigBuildFile).href);
    const { MotionController } = await import(pathToFileURL(motionBuildFile).href);
    const { repairRosterSource } = await import(pathToFileURL(assembleBuildFile).href);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    for (const name of names) {
      const isBlob = name === blobName;
      const path = isBlob
        ? resolve(modelRoot, '23-blob-texture-bodies--blob_creature_3d_model.glb')
        : resolve(modelRoot, `18-quad-all--${name}.glb`);
      const bytes = readFileSync(path);
      const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
      const scene = gltf.scene;
      scene.updateWorldMatrix(true, true);
      if (isBlob) prepareBlobSource(scene);
      const before = fingerprint(scene), bodyBefore = triangleCount(scene.getObjectByName('body')),
        headBefore = triangleCount(scene.getObjectByName('head'));
      const originalArmsMaterial = meshesUnder(scene.getObjectByName('arms'))[0]?.material;
      const sourceId = isBlob ? 'roster/23-blob-texture-bodies--blob_creature_3d_model' : `roster/18-quad-all--${name}`;
      const shouldRepair = repaired.has(name) || bodyFragmentOnly.has(name), changed = correctQuadrupedOwnership(scene, sourceId);
      scene.updateWorldMatrix(true, true);
      assert.equal(fingerprint(scene), before, `${name}: preserve exact source triangles and attributes`);
      assert.equal(changed, shouldRepair, `${name}: repair only verified topologies`);

      const nodes = { ArmLeft: 0, ArmRight: 0, FootLeft: 0, FootRight: 0 };
      scene.traverse(object => {
        if (!object.isMesh || !object.userData.rigNodeName) return;
        assert.equal(object.userData.rigNodeName, object.userData.quadrupedLimbNode, `${name}: consistent limb tag`);
        const hint = scene.userData.quadrupedLimbHints?.[object.userData.rigNodeName];
        assert.ok(hint && Array.isArray(object.userData.rigJointLocal) && object.userData.rigJointLocal.length === 3,
          `${name}: tagged limb stores its mesh-local joint hint`);
        const jointWorld = object.localToWorld(new T.Vector3(...object.userData.rigJointLocal));
        assert.ok(jointWorld.distanceTo(new T.Vector3(...hint.position)) < 1e-5,
          `${name}: mesh-local joint hint resolves to the shared source-space joint`);
        nodes[object.userData.rigNodeName] += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
      });
      if (repaired.has(name)) {
        assert.ok(Object.values(nodes).every(count => count > 100), `${name}: retain four substantial moving limbs`);
        assert.equal(Object.keys(scene.userData.quadrupedLimbHints ?? {}).length, 4, `${name}: four joint hints`);
      } else if (name === 'stylized_quadruped_3d_model') {
        assert.deepEqual(nodes, { ArmLeft: 1928, ArmRight: 2014, FootLeft: 0, FootRight: 1391 },
          'Quadzilla: rejoin the split left foreleg and preserve only its three grounded limb groups');
        assert.equal(Object.keys(scene.userData.quadrupedLimbHints ?? {}).length, 3,
          'Quadzilla: record its three supported moving limbs, not a synthetic fourth leg');
      } else {
        assert.equal(Object.values(nodes).reduce((sum, value) => sum + value, 0), 0, `${name}: leave native topology untouched`);
      }

      if (bodyFragmentOnly.has(name)) {
        const expectedBodyTransfer = bodyFragmentOnly.get(name);
        assert.equal(scene.userData.quadrupedOwnershipBodyTransferredTriangles, expectedBodyTransfer,
          `${name}: transfer only the verified seam island(s) to the torso`);
        assert.equal(triangleCount(scene.getObjectByName('body')) - bodyBefore, expectedBodyTransfer,
          `${name}: preserve torso ownership for the complete seam island(s)`);
        if (name === 'stylized_quadruped_3d_model') {
          assert.equal(scene.userData.quadrupedOwnershipBodyTransferredFromFeet, 102,
            'Quadzilla: only its 102-triangle central foot island moves to torso');
        }
        if (name === 'quadruped_robot_3d_model1') {
          const body = scene.getObjectByName('body');
          const details = meshesUnder(body, mesh => mesh.userData.ownershipAttachment === 'body-belly-detail');
          assert.equal(details.length, 1, 'Werner: retain one measured detached belly detail');
          const detail = details[0];
          assert.equal(detail.userData.quadrupedBodyOwnedTriangles, 548, 'Werner: tag all original apron faces');
          assert.ok(Array.isArray(detail.userData.ownershipAttachmentWorldOffset)
            && detail.userData.ownershipAttachmentWorldOffset.length === 3, 'Werner: record the intentional world-space attachment translation');
          assert.equal(detail.material, originalArmsMaterial, 'Werner: preserve the source arms material and texture');
          const contact = new T.Vector3(...detail.userData.ownershipAttachmentBodyContactWorldPoint);
          const bodySurfaces = meshesUnder(body, mesh => mesh !== detail);
          assert.ok(pointSurfaceDistance(contact, bodySurfaces) <= 0.001,
            'Werner: use a measured point on the original torso surface');
          assert.ok(meshPointDistance(detail, contact) <= 0.02,
            'Werner: reattach the orb so its original surface intersects the torso within 0.02 units');
          assert.ok(new T.Vector3(...detail.userData.ownershipAttachmentWorldOffset).length() > 0.7,
            'Werner: record the intentional movement from the original orphaned position');
          const beforeCenter = new T.Box3().setFromObject(detail).getCenter(new T.Vector3()), oldY = body.position.y;
          body.position.y += 0.1; scene.updateWorldMatrix(true, true);
          const afterCenter = new T.Box3().setFromObject(detail).getCenter(new T.Vector3());
          assert.ok(afterCenter.distanceTo(beforeCenter.clone().add(new T.Vector3(0, 0.1, 0))) < 1e-5,
            'Werner: attached detail follows its body parent');
          body.position.y = oldY; scene.updateWorldMatrix(true, true);
        }
      }

      if (name === 'robotic_dog_3d_model') {
        assert.equal(scene.userData.quadrupedOwnershipBodyTransferredTriangles, 162, 'dog: only the 84/78 central flecks move to torso');
        assert.equal(triangleCount(scene.getObjectByName('body')) - bodyBefore, 162, 'dog: central flecks are torso-owned');
        assert.ok(Object.values(nodes).every(count => count > 500), 'dog: all four large appendage groups stay animated');
      }
      if (name === 'four-legged_robot_3d_model') {
        assert.ok(Object.values(nodes).every(count => count > 500), 'Tara: keep all four grounded legs independently animated');
        assert.equal(scene.userData.quadrupedOwnershipBodyTransferredTriangles, 499,
          'Tara: transfer only the two verified central pelvis islands to BodyMotion');
        assert.equal(triangleCount(scene.getObjectByName('body')) - bodyBefore, 499,
          'Tara: keep both central pelvis islands under BodyMotion');
        assert.equal(scene.userData.quadrupedOwnershipHeadTransferredTriangles, 2190,
          'Tara: keep the ground-reaching center-front facade with the head shell it directly contacts');
        assert.equal(triangleCount(scene.getObjectByName('head')) - headBefore, 2190,
          'Tara: preserve the complete center-front facade under HeadMotion');
      }
      if (name === 'fantasy_creature_3d_model3') {
        assert.equal(scene.userData.quadrupedOwnershipBodyTransferredTriangles, 75,
          'Shiva: keep the isolated center-front pelvis shell with BodyMotion');
        assert.equal(triangleCount(scene.getObjectByName('body')) - bodyBefore, 75,
          'Shiva: transfer the complete 75-face center pelvis island');
      }
      if (isBlob) {
        assert.equal(Object.values(nodes).reduce((sum, value) => sum + value, 0), 1928, 'Blob64: animate only the four grounded source feet');
        assert.equal(triangleCount(scene.getObjectByName('body')), bodyBefore, 'Blob64: keep pelvis and side panels body-owned');
      }
      if (name === 'wooden_four-legged_robot_3d_model') {
        assert.ok(nodes.ArmLeft + nodes.ArmRight + nodes.FootLeft + nodes.FootRight < 4000, 'wooden model: broad underside stays body-owned');
      }
      console.log(`${name}: ${changed ? 'repaired' : 'unchanged'}; limb triangles ${JSON.stringify(nodes)}`);
    }

    for (const name of names.filter(value => value !== blobName)) {
      const id = `roster/18-quad-all--${name}`;
      const path = resolve(modelRoot, `18-quad-all--${name}.glb`), bytes = readFileSync(path);
      const scene = (await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
      const originalTriangles = triangleCount(scene);
      const report = repairRosterSource(scene, id);
      assert.equal(report.quadrupedRepaired, repaired.has(name) || bodyFragmentOnly.has(name),
        `${name}: full production repair dispatch matches the verified per-model policy`);
      assert.equal(triangleCount(scene), originalTriangles, `${name}: complete source-repair chain conserves every triangle`);
      if (name === 'four-legged_robot_3d_model') {
        assert.equal(report.armOwnershipTriangles, 0, 'Tara: generic arm/foot pass must leave the measured whole source facade intact');
        assert.equal(scene.userData.quadrupedOwnershipBodyTransferredTriangles, 499, 'Tara: complete chain keeps pelvis in body');
        assert.equal(scene.userData.quadrupedOwnershipHeadTransferredTriangles, 2190, 'Tara: complete chain keeps facade in head');
      }
      const rig = createRig(scene, { eyeLayout: 'single', armsFrom: id, feetFrom: id });
      const counts = Object.fromEntries(['ArmLeft', 'ArmRight', 'FootLeft', 'FootRight'].map(node => [node, triangleCount(rig.nodes[node])]));
      assert.ok(Object.values(counts).some(count => count > 100), `${name}: actual createRig routes real source geometry to limb nodes`);
      if (repaired.has(name)) assert.ok(Object.values(counts).filter(count => count > 100).length >= 3,
        `${name}: actual createRig retains at least three supported moving appendages`);
      const motion = new MotionController(rig); motion.neutral(); motion.play('walk');
      for (let frame = 0; frame < 14; frame++) motion.update(1 / 60);
      const movedArms = ['ArmLeft', 'ArmRight'].filter(node => counts[node] > 100 && Math.abs(rig.nodes[node].rotation.x) > 0.15);
      const movedFeet = ['FootLeft', 'FootRight'].filter(node => counts[node] > 100 && (
        Math.abs(rig.nodes[node].position.y - rig.rest[node].position.y) > 0.01
        || Math.abs(rig.nodes[node].rotation.x) > 0.15));
      assert.ok(movedArms.length + movedFeet.length >= 2, `${name}: real MotionController walk animates its populated appendage nodes`);
      motion.dispose();
      rig.root.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });
      console.log(`${name}: full repair chain + createRig + MotionController walk; ${JSON.stringify(counts)}`);
    }
  } finally {
    const { unlinkSync } = await import('node:fs');
    try { unlinkSync(buildFile); } catch {}
    try { unlinkSync(rigBuildFile); } catch {}
    try { unlinkSync(motionBuildFile); } catch {}
    try { unlinkSync(assembleBuildFile); } catch {}
  }
});
