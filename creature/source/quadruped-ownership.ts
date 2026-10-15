import * as T from 'three';
import { connectedTriangleComponents } from './limb-ownership';

/**
 * Re-home the lower, source-authored faces of the nine Four-legged coaches into
 * four unambiguous animation groups. Roster `arms`/`feet` are usually fore/hind
 * pairs, not bilateral humanoid limbs; some of their cut faces also land in
 * `body` or `head`. This pass uses the four spatial foot clusters as ownership
 * seeds and never drops or duplicates a source triangle.
 *
 * Call after GLTF load and before region fitting/style wrapping. A consumer can
 * route the cloned meshes by `mesh.userData.quadrupedLimbNode` and use the joint
 * hints stored on `source.userData.quadrupedLimbHints`.
 */

export type QuadrupedLimbNode = 'ArmLeft' | 'ArmRight' | 'FootLeft' | 'FootRight';
export type QuadrupedJointHint = { position: [number, number, number]; side: -1 | 1; fore: boolean };

type Point = { x: number; y: number; z: number };
type Triangle = { mesh: T.Mesh; region: string; id: number; points: [Point, Point, Point]; center: Point };
type Cluster = { center: Point; samples: number; radius: number; node?: QuadrupedLimbNode; fore?: boolean; side?: -1 | 1 };

const REGIONS = ['head', 'body', 'arms', 'feet'] as const;
const QUADRUPED_IDS = new Set([
  'roster/18-quad-all--dragon_creature_3d_model',
  'roster/18-quad-all--fantasy_creature_3d_model1',
  'roster/18-quad-all--fantasy_creature_3d_model3',
  'roster/18-quad-all--four-legged_robot_3d_model',
  'roster/18-quad-all--quadruped_robot_3d_model1',
  'roster/18-quad-all--quadruped_robot_3d_model',
  'roster/18-quad-all--robotic_dog_3d_model',
  'roster/18-quad-all--stylized_quadruped_3d_model',
  'roster/18-quad-all--wooden_four-legged_robot_3d_model',
  'roster/23-blob-texture-bodies--blob_creature_3d_model',
]);
const REPAIR_IDS = new Set([
  'roster/18-quad-all--fantasy_creature_3d_model1',
  'roster/18-quad-all--fantasy_creature_3d_model3',
  'roster/18-quad-all--four-legged_robot_3d_model',
  'roster/18-quad-all--quadruped_robot_3d_model',
  'roster/18-quad-all--quadruped_robot_3d_model1',
  'roster/18-quad-all--robotic_dog_3d_model',
  'roster/18-quad-all--wooden_four-legged_robot_3d_model',
  'roster/23-blob-texture-bodies--blob_creature_3d_model',
]);
const BODY_FRAGMENT_ONLY_IDS = new Set([
  'roster/18-quad-all--quadruped_robot_3d_model',
  'roster/18-quad-all--stylized_quadruped_3d_model',
]);
const STYLIZED_QUAD_ID = 'roster/18-quad-all--stylized_quadruped_3d_model';

const sq = (v: number) => v * v;
const dist2XZ = (a: Point, b: Point) => sq(a.x - b.x) + sq(a.z - b.z);
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (a: Point, n: number): Point => ({ x: a.x * n, y: a.y * n, z: a.z * n });

function makeTriangle(mesh: T.Mesh, region: string, id: number): Triangle {
  const g = mesh.geometry, p = g.getAttribute('position'), ix = g.index, at = (i: number) => {
    const n = ix ? ix.getX(i) : i;
    const v = new T.Vector3().fromBufferAttribute(p, n).applyMatrix4(mesh.matrixWorld);
    return { x: v.x, y: v.y, z: v.z };
  };
  const points = [at(id * 3), at(id * 3 + 1), at(id * 3 + 2)] as [Point, Point, Point];
  return { mesh, region, id, points, center: scale(add(add(points[0], points[1]), points[2]), 1 / 3) };
}

function pointKey(p: Point, tolerance: number) {
  return `${Math.round(p.x / tolerance)},${Math.round(p.y / tolerance)},${Math.round(p.z / tolerance)}`;
}
function edgeKey(a: Point, b: Point, tolerance: number) {
  const ka = pointKey(a, tolerance), kb = pointKey(b, tolerance);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

function lowComponents(triangles: Triangle[], tolerance: number) {
  const edges = new Map<string, number[]>();
  triangles.forEach((tri, i) => { for (let k = 0; k < 3; k++) { const key = edgeKey(tri.points[k], tri.points[(k + 1) % 3], tolerance); const row = edges.get(key); if (row) row.push(i); else edges.set(key, [i]); } });
  const adjacency = triangles.map(() => [] as number[]);
  for (const ids of edges.values()) if (ids.length > 1) for (const a of ids) for (const b of ids) if (a !== b) adjacency[a].push(b);
  const component = new Int32Array(triangles.length).fill(-1), groups: number[][] = [];
  for (let i = 0; i < triangles.length; i++) {
    if (component[i] >= 0) continue;
    const id = groups.length, queue = [i], members: number[] = []; component[i] = id;
    for (let q = 0; q < queue.length; q++) { const at = queue[q]; members.push(at); for (const next of adjacency[at]) if (component[next] < 0) { component[next] = id; queue.push(next); } }
    groups.push(members);
  }
  return { component, groups };
}

function farthestSeeds(points: Point[], k: number): Point[] {
  const mean = points.reduce((sum, p) => add(sum, p), { x: 0, y: 0, z: 0 });
  const origin = scale(mean, 1 / points.length);
  const seeds = [points.reduce((best, p) => dist2XZ(p, origin) > dist2XZ(best, origin) ? p : best, points[0])];
  while (seeds.length < k) {
    const next = points.reduce((best, p) => {
      const d = Math.min(...seeds.map(seed => dist2XZ(p, seed)));
      const bestD = Math.min(...seeds.map(seed => dist2XZ(best, seed)));
      return d > bestD ? p : best;
    }, points[0]);
    seeds.push(next);
  }
  return seeds.map(p => ({ ...p }));
}

function clusterFour(points: Point[]): Cluster[] | null {
  if (points.length < 80) return null;
  const centers = farthestSeeds(points, 4);
  let assignments = new Int8Array(points.length);
  for (let pass = 0; pass < 32; pass++) {
    let changed = false;
    const sums = centers.map(() => ({ x: 0, y: 0, z: 0 })), counts = centers.map(() => 0);
    points.forEach((p, i) => {
      let best = 0, distance = Infinity;
      for (let c = 0; c < centers.length; c++) { const d = dist2XZ(p, centers[c]); if (d < distance) { distance = d; best = c; } }
      if (assignments[i] !== best) changed = true;
      assignments[i] = best; sums[best] = add(sums[best], p); counts[best]++;
    });
    for (let c = 0; c < centers.length; c++) if (counts[c]) centers[c] = scale(sums[c], 1 / counts[c]);
    if (!changed) break;
  }
  const clusters = centers.map((center, c) => {
    let samples = 0, radius = 0;
    points.forEach((p, i) => { if (assignments[i] === c) { samples++; radius = Math.max(radius, Math.sqrt(dist2XZ(p, center))); } });
    return { center, samples, radius };
  });
  const separation = Math.min(...clusters.flatMap((a, i) => clusters.slice(i + 1).map(b => Math.sqrt(dist2XZ(a.center, b.center)))));
  if (clusters.some(c => c.samples < 20) || separation < 0.06) return null;
  return clusters;
}

function triangleSubset(source: T.BufferGeometry, ids: readonly number[]): T.BufferGeometry | null {
  if (!ids.length) return null;
  const position = source.getAttribute('position'), index = source.index, remap = new Map<number, number>(), sourceVertices: number[] = [], outIndex: number[] = [];
  const count = index?.count ?? position.count;
  for (const triangle of ids) {
    const start = triangle * 3;
    if (start + 2 >= count) continue;
    for (let j = 0; j < 3; j++) {
      const old = index ? index.getX(start + j) : start + j;
      let next = remap.get(old);
      if (next === undefined) { next = sourceVertices.length; remap.set(old, next); sourceVertices.push(old); }
      outIndex.push(next);
    }
  }
  if (!outIndex.length) return null;
  const out = new T.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const a = attribute as T.BufferAttribute, values = new (a.array.constructor as any)(sourceVertices.length * a.itemSize);
    for (let i = 0; i < sourceVertices.length; i++) for (let c = 0; c < a.itemSize; c++) values[i * a.itemSize + c] = a.array[sourceVertices[i] * a.itemSize + c];
    out.setAttribute(name, new T.BufferAttribute(values, a.itemSize, a.normalized));
  }
  for (const [name, attributes] of Object.entries(source.morphAttributes)) {
    out.morphAttributes[name] = attributes.map(attribute => {
      const a = attribute as T.BufferAttribute, values = new (a.array.constructor as any)(sourceVertices.length * a.itemSize);
      for (let i = 0; i < sourceVertices.length; i++) for (let c = 0; c < a.itemSize; c++) values[i * a.itemSize + c] = a.array[sourceVertices[i] * a.itemSize + c];
      return new T.BufferAttribute(values, a.itemSize, a.normalized);
    });
  }
  out.morphTargetsRelative = source.morphTargetsRelative;
  out.setIndex(outIndex);
  out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}

/** Quadzilla's source has three legs: one left foreleg split across arms/feet, one right foreleg, and one rear-right leg. */
function correctStylizedQuadOwnership(source: T.Group, regions: Map<string, T.Mesh[]>): boolean {
  source.updateWorldMatrix(true, true);
  const body = source.getObjectByName('body');
  const head = source.getObjectByName('head');
  const feet = source.getObjectByName('feet');
  const bodyMeshes = regions.get('body') ?? [];
  if (!body || !head || !feet || !bodyMeshes.length) return false;
  const bodyBox = new T.Box3().setFromObject(body), headBox = new T.Box3().setFromObject(head), feetBox = new T.Box3().setFromObject(feet);
  const footHeight = feetBox.max.y - feetBox.min.y;
  // Head reaches the torso cut but is far above the ground; reject if it ever contains a foot-height island.
  if (!(footHeight > 0) || headBox.min.y <= feetBox.min.y + footHeight * .15) return false;
  const bodyMaterial = bodyMeshes.find(mesh => !Array.isArray(mesh.material))?.material;
  if (!bodyMaterial || Array.isArray(bodyMaterial)) return false;
  const specs = [
    { region: 'arms', triangles: 154, center: [ .0982, .9973, .2414], owner: 'body' as const },
    { region: 'arms', triangles: 1461, center: [-.8023, .4035, .2243], owner: 'ArmLeft' as const },
    { region: 'arms', triangles: 2014, center: [ .8086, .4974, .3690], owner: 'ArmRight' as const },
    { region: 'feet', triangles: 467, center: [-.8390, .2011,-.0571], owner: 'ArmLeft' as const },
    { region: 'feet', triangles: 102, center: [-.1132,1.0031,-.1474], owner: 'body' as const },
    { region: 'feet', triangles: 1391, center: [ .2609, .3803,-.5842], owner: 'FootRight' as const },
  ];
  const found = new Set<string>(), targets = new Map<T.Mesh, Map<typeof specs[number]['owner'], number[]>>();
  for (const region of ['arms', 'feet']) for (const mesh of regions.get(region) ?? []) {
    const position = mesh.geometry.getAttribute('position'), index = mesh.geometry.index;
    for (const component of connectedTriangleComponents(mesh)) {
      const box = new T.Box3(), center = new T.Vector3();
      for (const face of component) for (let corner = 0; corner < 3; corner++) {
        const vertex = index ? index.getX(face * 3 + corner) : face * 3 + corner;
        const point = new T.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld);
        box.expandByPoint(point); center.add(point);
      }
      center.divideScalar(component.length * 3);
      const specIndex = specs.findIndex(spec => spec.region === region && spec.triangles === component.length &&
        Math.abs(center.x - spec.center[0]) < .025 && Math.abs(center.y - spec.center[1]) < .025 && Math.abs(center.z - spec.center[2]) < .025);
      if (specIndex < 0) continue;
      const key = `${region}:${specIndex}`;
      if (found.has(key)) return false;
      found.add(key);
      const owner = specs[specIndex].owner;
      let byOwner = targets.get(mesh); if (!byOwner) targets.set(mesh, byOwner = new Map());
      let ids = byOwner.get(owner); if (!ids) byOwner.set(owner, ids = []); ids.push(...component);
    }
  }
  if (found.size !== specs.length) return false;
  let moved = 0, bodyMoved = 0;
  for (const [mesh, byOwner] of targets) {
    const selected = new Set([...byOwner.values()].flat());
    const count = (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
    const remaining: number[] = []; for (let id = 0; id < count; id++) if (!selected.has(id)) remaining.push(id);
    const old = mesh.geometry, kept = triangleSubset(old, remaining), parent = mesh.parent;
    if (kept) mesh.geometry = kept; else mesh.removeFromParent();
    for (const [owner, ids] of byOwner) {
      const geometry = triangleSubset(old, ids); if (!geometry) continue;
      const part = mesh.clone(false); part.geometry = geometry;
      if (owner === 'body') {
        const relative = body.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
        relative.decompose(part.position, part.quaternion, part.scale);
        part.name = `${mesh.name || 'Quadzilla seam'} body-owned pelvis`;
        part.material = bodyMaterial;
        part.userData = { ...mesh.userData, quadrupedBodyOwnedTriangles: ids.length };
        body.add(part); bodyMoved += ids.length;
      } else {
        part.name = `${mesh.name || 'Quadzilla leg'} ${owner}`;
        part.userData = { ...mesh.userData, quadrupedLimbNode: owner, rigNodeName: owner };
        parent?.add(part);
      }
      moved += ids.length;
    }
    old.dispose();
  }
  if (moved !== 5589 || bodyMoved !== 256) return false;
  source.updateWorldMatrix(true, true);
  source.userData.quadrupedOwnershipVersion = 1;
  source.userData.quadrupedOwnershipTriangles = moved;
  source.userData.quadrupedOwnershipBodyTriangles = bodyMoved;
  source.userData.quadrupedOwnershipBodyTransferredTriangles = bodyMoved;
  source.userData.quadrupedOwnershipBodyTransferredFromFeet = 102;
  source.userData.quadrupedLimbHints = {
    ArmLeft: { position: [-.8023, 1.05, .2243], side: -1, fore: true },
    ArmRight: { position: [.8086, 1.05, .3690], side: 1, fore: true },
    FootRight: { position: [.2609, 1.05, -.5842], side: 1, fore: false },
  };
  source.userData.quadrupedOwnershipLimbTriangles = { ArmLeft: 1928, ArmRight: 2014, FootLeft: 0, FootRight: 1391 };
  storeMeshJointHints(source, source.userData.quadrupedLimbHints);
  return true;
}

function inferFront(source: T.Group, bodyBox: T.Box3, headBox: T.Box3): { x: number; z: number } {
  const body = bodyBox.getCenter(new T.Vector3()), head = headBox.getCenter(new T.Vector3());
  const anchor = source.getObjectByName('eye_anchor');
  const point = anchor ? anchor.getWorldPosition(new T.Vector3()) : head;
  let x = point.x - body.x, z = point.z - body.z;
  if (Math.hypot(x, z) < 1e-4) { x = head.x - body.x; z = head.z - body.z; }
  if (Math.hypot(x, z) < 1e-4) { x = 0; z = 1; }
  const length = Math.hypot(x, z);
  return { x: x / length, z: z / length };
}

function storeMeshJointHints(source: T.Group, hints: Partial<Record<QuadrupedLimbNode, QuadrupedJointHint>>): void {
  source.updateWorldMatrix(true, true);
  source.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const node = object.userData.rigNodeName as QuadrupedLimbNode | undefined;
    const hint = node ? hints[node] : undefined;
    if (!hint) return;
    const local = object.worldToLocal(new T.Vector3(...hint.position));
    object.userData.rigJointLocal = local.toArray();
  });
}

/** Return false without changing source when four distinct lower-leg clusters cannot be supported. */
export function correctQuadrupedOwnership(source: T.Group, sourceId: string): boolean {
  if (!QUADRUPED_IDS.has(sourceId) || (!REPAIR_IDS.has(sourceId) && !BODY_FRAGMENT_ONLY_IDS.has(sourceId)) || source.userData.quadrupedOwnershipVersion === 1) return false;
  source.updateWorldMatrix(true, true);
  const regionMeshes = new Map<string, T.Mesh[]>();
  const boxes = new Map<string, T.Box3>();
  for (const name of REGIONS) {
    const region = source.getObjectByName(name), meshes: T.Mesh[] = [], box = new T.Box3();
    region?.traverse(o => { if (o instanceof T.Mesh && o.visible && !Array.isArray(o.material)) { meshes.push(o); box.expandByObject(o); } });
    regionMeshes.set(name, meshes); boxes.set(name, box);
  }
  const feetBox = boxes.get('feet')!, bodyBox = boxes.get('body')!, headBox = boxes.get('head')!;
  if (feetBox.isEmpty() || bodyBox.isEmpty() || headBox.isEmpty()) return false;
  if (sourceId === STYLIZED_QUAD_ID) return correctStylizedQuadOwnership(source, regionMeshes);
  const cutoff = feetBox.max.y + Math.max(0.003, feetBox.getSize(new T.Vector3()).y * 0.003);
  const blobBodyPrepared = sourceId === 'roster/23-blob-texture-bodies--blob_creature_3d_model';
  const allLow: Triangle[] = [];
  for (const [region, meshes] of regionMeshes) {
    // The source assembler first returns Blob64's torso side panels and central
    // pelvis to BODY. Only the four original grounded paw components are animated.
    if (blobBodyPrepared && region !== 'feet') continue;
    for (const mesh of meshes) {
    const g = mesh.geometry, count = (g.index?.count ?? g.getAttribute('position').count) / 3;
    for (let id = 0; id < count; id++) {
      const triangle = makeTriangle(mesh, region, id);
      if (triangle.center.y >= cutoff) continue;
      allLow.push(triangle);
    }
    }
  }
  if (allLow.length < 100) return false;
  const allBox = new T.Box3(); for (const tri of allLow) for (const p of tri.points) allBox.expandByPoint(new T.Vector3(p.x, p.y, p.z));
  const weld = Math.max(0.001, allBox.getSize(new T.Vector3()).length() * 0.0005), topology = lowComponents(allLow, weld);
  const bodySize = bodyBox.getSize(new T.Vector3()), heldComponents = new Set<number>();
  if (sourceId === 'roster/18-quad-all--fantasy_creature_3d_model3'
    || sourceId === 'roster/18-quad-all--quadruped_robot_3d_model') {
    const bodyRegion = source.getObjectByName('body'), bodyMaterial = bodyRegion
      ? regionMeshes.get('body')!.find(mesh => !Array.isArray(mesh.material))?.material : undefined;
    if (!bodyRegion || !bodyMaterial || Array.isArray(bodyMaterial)) return false;

    const bodyOwned = new Set<Triangle>();
    if (sourceId === 'roster/18-quad-all--fantasy_creature_3d_model3') {
      // Shiva's separate, 75-face undershell sits centrally at the pelvis seam.
      // It is not one of the four grounded paws and follows the torso.
      const feetTriangles = allLow.filter(tri => tri.region === 'feet');
      const feetTopology = lowComponents(feetTriangles, weld), candidates: Triangle[][] = [];
      feetTopology.groups.forEach(members => {
        if (members.length < 50 || members.length > 100) return;
        const box = new T.Box3();
        for (const index of members) for (const p of feetTriangles[index].points) box.expandByPoint(new T.Vector3(p.x, p.y, p.z));
        const center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
        if (Math.abs(center.x - bodyBox.getCenter(new T.Vector3()).x) < 0.15
          && center.y > feetBox.min.y + (feetBox.max.y - feetBox.min.y) * 0.8
          && box.max.y >= feetBox.max.y - (feetBox.max.y - feetBox.min.y) * 0.02
          && size.x < bodySize.x * 0.6 && size.z < bodySize.z * 0.4) {
          candidates.push(members.map(index => feetTriangles[index]));
        }
      });
      if (candidates.length !== 1 || candidates[0].length !== 75) return false;
      for (const tri of candidates[0]) bodyOwned.add(tri);
    } else {
      // Yee's source has a single head-owned triangle crossing the pelvis cut.
      const candidates: Triangle[] = [];
      topology.groups.forEach(members => {
        if (members.length !== 1) return;
        const tri = allLow[members[0]], sizeX = Math.max(...tri.points.map(p => p.x)) - Math.min(...tri.points.map(p => p.x));
        const sizeZ = Math.max(...tri.points.map(p => p.z)) - Math.min(...tri.points.map(p => p.z));
        if (tri.region === 'head' && tri.center.x > 0.15 && Math.abs(tri.center.y - cutoff) < 0.005
          && sizeX < 0.06 && sizeZ < 0.03) candidates.push(tri);
      });
      if (candidates.length !== 1) return false;
      bodyOwned.add(candidates[0]);
    }

    const feetHeight = feetBox.max.y - feetBox.min.y;
    const groundSeeds = allLow.filter(tri => (tri.region === 'arms' || tri.region === 'feet')
      && !bodyOwned.has(tri) && tri.center.y <= feetBox.min.y + feetHeight * 0.1).map(tri => tri.center);
    const clusters = clusterFour(groundSeeds);
    if (!clusters) return false;
    const bodyCenter = bodyBox.getCenter(new T.Vector3()), front = inferFront(source, bodyBox, headBox);
    const ranked = clusters.map(c => ({ c, foreScore: (c.center.x - bodyCenter.x) * front.x + (c.center.z - bodyCenter.z) * front.z }));
    const fore = [...ranked].sort((a, b) => b.foreScore - a.foreScore);
    const setPair = (pair: typeof ranked, foreleg: boolean) => {
      const [left, right] = [...pair].sort((a, b) => a.c.center.x - b.c.center.x);
      for (const row of [left, right]) {
        row.c.fore = foreleg; row.c.side = row === left ? -1 : 1;
        row.c.node = foreleg ? (row.c.side < 0 ? 'ArmLeft' : 'ArmRight') : (row.c.side < 0 ? 'FootLeft' : 'FootRight');
      }
    };
    setPair(fore.slice(0, 2), true); setPair(fore.slice(2), false);
    const nearestCluster = (p: Point) => clusters.map((c, i) => ({ i, d: dist2XZ(p, c.center) })).sort((a, b) => a.d - b.d)[0].i;
    const targets = new Map<T.Mesh, Map<QuadrupedLimbNode | 'body', number[]>>();
    const assigned: { tri: Triangle; node: QuadrupedLimbNode | 'body' }[] = [];
    const addTarget = (tri: Triangle, node: QuadrupedLimbNode | 'body') => {
      let map = targets.get(tri.mesh); if (!map) targets.set(tri.mesh, map = new Map());
      let ids = map.get(node); if (!ids) map.set(node, ids = []); ids.push(tri.id);
      assigned.push({ tri, node });
    };
    for (const tri of allLow) {
      if (bodyOwned.has(tri)) addTarget(tri, 'body');
      else if (tri.region === 'arms' || tri.region === 'feet') {
        const node = clusters[nearestCluster(tri.center)].node;
        if (!node) return false;
        addTarget(tri, node);
      }
    }
    let moved = 0, bodyTransferred = 0;
    for (const [mesh, byNode] of targets) {
      const selected = new Set([...byNode.values()].flat()), count = (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
      const remaining: number[] = [];
      for (let id = 0; id < count; id++) if (!selected.has(id)) remaining.push(id);
      const old = mesh.geometry, kept = triangleSubset(old, remaining), parent = mesh.parent;
      if (kept) mesh.geometry = kept; else mesh.removeFromParent();
      for (const [node, ids] of byNode) {
        const geometry = triangleSubset(old, ids); if (!geometry) continue;
        const part = mesh.clone(false); part.geometry = geometry;
        if (node === 'body') {
          const relative = bodyRegion.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
          relative.decompose(part.position, part.quaternion, part.scale);
          part.name = `${mesh.name || 'Quadruped'} body-owned pelvis`; part.material = bodyMaterial;
          part.userData = { ...mesh.userData, quadrupedBodyOwnedTriangles: ids.length };
          bodyRegion.add(part); bodyTransferred += ids.length;
        } else {
          part.name = `${mesh.name || 'Quadruped limb'} ${node}`;
          part.userData = { ...mesh.userData, quadrupedLimbNode: node, rigNodeName: node };
          parent?.add(part);
        }
        moved += ids.length;
      }
      old.dispose();
    }
    if (moved < (sourceId === 'roster/18-quad-all--fantasy_creature_3d_model3' ? 6500 : 5500)
      || bodyTransferred !== (sourceId === 'roster/18-quad-all--fantasy_creature_3d_model3' ? 75 : 1)) return false;
    source.updateWorldMatrix(true, true);
    const hints = {} as Record<QuadrupedLimbNode, QuadrupedJointHint>;
    for (const c of clusters) {
      const points = assigned.filter(row => row.node === c.node && row.tri.region !== 'body' && row.tri.region !== 'head'
        && Math.sqrt(dist2XZ(row.tri.center, c.center)) < Math.max(c.radius * 0.7, 0.08)
        && row.tri.center.y >= cutoff - Math.max(0.08, (cutoff - feetBox.min.y) * 0.18)).map(row => row.tri.center);
      const joint = points.length ? points.reduce((sum, p) => add(sum, p), { x: 0, y: 0, z: 0 }) : { ...c.center, y: cutoff };
      const p = points.length ? scale(joint, 1 / points.length) : joint;
      hints[c.node!] = { position: [p.x, p.y, p.z], side: c.side!, fore: c.fore! };
    }
    source.userData.quadrupedLimbHints = hints; storeMeshJointHints(source, hints);
    source.userData.quadrupedOwnershipVersion = 1;
    source.userData.quadrupedOwnershipTriangles = moved;
    source.userData.quadrupedOwnershipBodyTriangles = bodyTransferred;
    source.userData.quadrupedOwnershipBodyTransferredTriangles = bodyTransferred;
    return true;
  }
  if (BODY_FRAGMENT_ONLY_IDS.has(sourceId)) {
    const candidates: number[] = [];
    topology.groups.forEach((members, id) => {
      const counts: Record<string, number> = {}, box = new T.Box3();
      for (const index of members) {
        const tri = allLow[index]; counts[tri.region] = (counts[tri.region] || 0) + 1;
        for (const p of tri.points) box.expandByPoint(new T.Vector3(p.x, p.y, p.z));
      }
      const center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
      if (sourceId === 'roster/18-quad-all--quadruped_robot_3d_model'
        && members.length === 1 && counts.head === 1 && center.x > 0.15
        && Math.abs(center.y - cutoff) < 0.005 && size.x < 0.06 && size.z < 0.03) candidates.push(id);
      if (sourceId === 'roster/18-quad-all--stylized_quadruped_3d_model') {
        const bodySideIsland = Math.abs(center.x - bodyBox.getCenter(new T.Vector3()).x) < 0.15
          && Math.abs(center.y - cutoff) < feetBox.getSize(new T.Vector3()).y * 0.08
          && size.x < bodySize.x * 0.55 && size.z < bodySize.z * 0.4;
        if (bodySideIsland && ((members.length === 102 && counts.feet === 102)
          || (members.length === 154 && counts.arms === 154))) candidates.push(id);
      }
    });
    const expected = sourceId === 'roster/18-quad-all--quadruped_robot_3d_model' ? 1 : 2;
    if (candidates.length !== expected) return false;
    const bodyRegion = source.getObjectByName('body'), bodyMaterial = bodyRegion
      ? regionMeshes.get('body')!.find(mesh => !Array.isArray(mesh.material))?.material : undefined;
    if (!bodyRegion || !bodyMaterial || Array.isArray(bodyMaterial)) return false;
    const byMesh = new Map<T.Mesh, number[]>();
    for (const id of candidates) for (const index of topology.groups[id]) {
      const tri = allLow[index], ids = byMesh.get(tri.mesh);
      if (ids) ids.push(tri.id); else byMesh.set(tri.mesh, [tri.id]);
    }
    let moved = 0;
    for (const [mesh, ids] of byMesh) {
      if (!mesh.parent) continue;
      const count = (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
      const selected = new Set(ids), remaining: number[] = [];
      for (let id = 0; id < count; id++) if (!selected.has(id)) remaining.push(id);
      const old = mesh.geometry, parent = mesh.parent, bodyPart = triangleSubset(old, ids), kept = triangleSubset(old, remaining);
      if (!bodyPart) continue;
      const part = mesh.clone(false); part.geometry = bodyPart;
      const relative = bodyRegion.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
      relative.decompose(part.position, part.quaternion, part.scale);
      part.name = `${mesh.name || 'Quadruped seam'} body-owned lower seam`;
      part.material = bodyMaterial;
      part.userData = { ...mesh.userData, quadrupedBodyOwnedTriangles: ids.length };
      if (kept) mesh.geometry = kept; else mesh.removeFromParent();
      bodyRegion.add(part); old.dispose(); moved += ids.length;
    }
    if (!moved) return false;
    source.userData.quadrupedOwnershipVersion = 1;
    source.userData.quadrupedOwnershipBodyTriangles = moved;
    source.userData.quadrupedOwnershipBodyTransferredTriangles = moved;
    source.userData.quadrupedOwnershipBodyTransferredFromFeet = sourceId === 'roster/18-quad-all--stylized_quadruped_3d_model' ? 102 : 0;
    return true;
  }
  if (sourceId === 'roster/18-quad-all--four-legged_robot_3d_model') {
    const bodyCenter = bodyBox.getCenter(new T.Vector3()), feetHeight = feetBox.max.y - feetBox.min.y;
    const bodyRegion = source.getObjectByName('body'), bodyMaterial = bodyRegion
      ? regionMeshes.get('body')!.find(mesh => !Array.isArray(mesh.material))?.material : undefined;
    if (!bodyRegion || !bodyMaterial || Array.isArray(bodyMaterial) || !(feetHeight > 0)) return false;
    const centralPelvis: number[] = [], limbIsland: number[] = [];
    topology.groups.forEach((members, id) => {
      const counts: Record<string, number> = {}, box = new T.Box3();
      for (const index of members) {
        const tri = allLow[index]; counts[tri.region] = (counts[tri.region] || 0) + 1;
        for (const p of tri.points) box.expandByPoint(new T.Vector3(p.x, p.y, p.z));
      }
      const center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
        // Tara's isolated, non-grounded 500-face underside is split into two
        // source-region islands at the z seam. Together they span the torso
        // width; neither island reaches a grounded leg, so both belong to body.
        if (members.length >= 200 && members.length <= 280
          && ((counts.feet || 0) === members.length || (counts.arms || 0) === members.length)
          && Math.abs(center.x - bodyCenter.x) < 0.1
          && center.y > feetBox.min.y + feetHeight * 0.8
          && size.x > bodySize.x * 0.8 && size.z > bodySize.z * 0.35) centralPelvis.push(id);
        if (members.length >= 7500 && (counts.feet || 0) >= 5000 && (counts.arms || 0) >= 2500) limbIsland.push(id);
      });
    if (centralPelvis.length !== 2 || limbIsland.length !== 1) return false;
    // The source arm mesh also contains a broad center-front facade that reaches
    // the ground. Its 2,190 connected faces meet the head seam directly, but it
    // is not a fifth leg. Exclude it from paw clustering and keep it with the
    // head shell; body ownership opened a visible seam through the front cone.
    const armTriangles = allLow.filter(tri => tri.region === 'arms');
    const armTopology = lowComponents(armTriangles, weld), centralFrontPanels: Triangle[][] = [];
    armTopology.groups.forEach(members => {
      const box = new T.Box3(), groundNearCenter: Triangle[] = [];
      for (const index of members) {
        const tri = armTriangles[index];
        for (const p of tri.points) box.expandByPoint(new T.Vector3(p.x, p.y, p.z));
        if (tri.center.y <= feetBox.min.y + feetHeight * 0.1
          && Math.abs(tri.center.x - bodyCenter.x) < 0.25
          && tri.center.z > bodyCenter.z + bodySize.z * 0.6) groundNearCenter.push(tri);
      }
      const size = box.getSize(new T.Vector3()), center = box.getCenter(new T.Vector3());
      if (members.length >= 2000 && members.length <= 2300 && groundNearCenter.length >= 100
        && Math.abs(center.x - bodyCenter.x) < 0.1 && center.z > bodyCenter.z + bodySize.z * 0.5
        && size.x > bodySize.x * 0.8 && size.z > bodySize.z * 0.8
        && box.min.y <= feetBox.min.y + feetHeight * 0.1 && box.max.y >= cutoff - feetHeight * 0.02) {
        centralFrontPanels.push(members.map(index => armTriangles[index]));
      }
    });
    if (centralFrontPanels.length !== 1) return false;
    const centralFrontTriangles = new Set(centralFrontPanels[0]);
    const groundSeeds: Point[] = [];
    for (let i = 0; i < allLow.length; i++) {
      const tri = allLow[i];
      if (topology.component[i] === limbIsland[0] && (tri.region === 'arms' || tri.region === 'feet')
        && !centralFrontTriangles.has(tri)
        && tri.center.y <= feetBox.min.y + feetHeight * 0.1) groundSeeds.push(tri.center);
    }
    const clusters = clusterFour(groundSeeds);
    if (!clusters) return false;
    const front = inferFront(source, bodyBox, headBox), ranked = clusters.map(c => ({
      c, foreScore: (c.center.x - bodyCenter.x) * front.x + (c.center.z - bodyCenter.z) * front.z,
      sideScore: c.center.x - bodyCenter.x,
    }));
    const fore = [...ranked].sort((a, b) => b.foreScore - a.foreScore);
    const setPair = (pair: typeof ranked, foreleg: boolean) => {
      const [left, right] = [...pair].sort((a, b) => a.sideScore - b.sideScore);
      for (const row of [left, right]) {
        row.c.fore = foreleg; row.c.side = row === left ? -1 : 1;
        row.c.node = foreleg ? (row.c.side < 0 ? 'ArmLeft' : 'ArmRight') : (row.c.side < 0 ? 'FootLeft' : 'FootRight');
      }
    };
    setPair(fore.slice(0, 2), true); setPair(fore.slice(2), false);
    const nearestCluster = (p: Point) => clusters.map((c, i) => ({ i, d: dist2XZ(p, c.center) })).sort((a, b) => a.d - b.d)[0].i;
    const targets = new Map<T.Mesh, Map<QuadrupedLimbNode | 'body' | 'head', number[]>>();
    const addTarget = (tri: Triangle, node: QuadrupedLimbNode | 'body' | 'head') => {
      let meshTargets = targets.get(tri.mesh); if (!meshTargets) targets.set(tri.mesh, meshTargets = new Map());
      let ids = meshTargets.get(node); if (!ids) meshTargets.set(node, ids = []); ids.push(tri.id);
    };
    const centralIds = new Set(centralPelvis);
    for (let i = 0; i < allLow.length; i++) {
      const tri = allLow[i], component = topology.component[i];
      if ((centralIds.has(component) || centralFrontTriangles.has(tri)) && (tri.region === 'arms' || tri.region === 'feet')) {
        addTarget(tri, centralFrontTriangles.has(tri) ? 'head' : 'body');
      }
      else if (component === limbIsland[0] && (tri.region === 'arms' || tri.region === 'feet')) {
        const node = clusters[nearestCluster(tri.center)].node;
        if (!node) return false;
        addTarget(tri, node);
      }
    }
    const headRegion = source.getObjectByName('head'), headMaterial = headRegion
      ? regionMeshes.get('head')!.find(mesh => !Array.isArray(mesh.material))?.material : undefined;
    if (!headRegion || !headMaterial || Array.isArray(headMaterial)) return false;
    let moved = 0, bodyTransferred = 0, headTransferred = 0;
    for (const [mesh, byNode] of targets) {
      const selected = new Set([...byNode.values()].flat()), count = (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
      const remaining: number[] = [];
      for (let id = 0; id < count; id++) if (!selected.has(id)) remaining.push(id);
      const old = mesh.geometry, kept = triangleSubset(old, remaining), parent = mesh.parent;
      if (kept) mesh.geometry = kept; else mesh.removeFromParent();
      for (const [node, ids] of byNode) {
        const geometry = triangleSubset(old, ids); if (!geometry) continue;
        const part = mesh.clone(false); part.geometry = geometry;
        if (node === 'body' || node === 'head') {
          const ownerRegion = node === 'body' ? bodyRegion : headRegion;
          const relative = ownerRegion.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
          relative.decompose(part.position, part.quaternion, part.scale);
          part.name = `${mesh.name || 'Tara shell'} ${node}-owned central shell`;
          part.material = node === 'body' ? bodyMaterial : headMaterial;
          part.userData = { ...mesh.userData, [node === 'body' ? 'quadrupedBodyOwnedTriangles' : 'quadrupedHeadOwnedTriangles']: ids.length };
          ownerRegion.add(part);
          if (node === 'body') bodyTransferred += ids.length; else headTransferred += ids.length;
        } else {
          part.name = `${mesh.name || 'Tara leg'} ${node}`;
          part.userData = { ...mesh.userData, quadrupedLimbNode: node, rigNodeName: node };
          parent?.add(part);
        }
        moved += ids.length;
      }
      old.dispose();
    }
    if (bodyTransferred < 450 || headTransferred !== 2190 || moved < 7000) return false;
    source.updateWorldMatrix(true, true);
    const hints = {} as Record<QuadrupedLimbNode, QuadrupedJointHint>;
    for (const cluster of clusters) hints[cluster.node!] = {
      position: [cluster.center.x, cutoff, cluster.center.z], side: cluster.side!, fore: cluster.fore!,
    };
    source.userData.quadrupedLimbHints = hints;
    storeMeshJointHints(source, hints);
    source.userData.quadrupedOwnershipVersion = 1;
    source.userData.quadrupedOwnershipTriangles = moved;
    source.userData.quadrupedOwnershipBodyTriangles = bodyTransferred;
    source.userData.quadrupedOwnershipBodyTransferredTriangles = bodyTransferred;
    source.userData.quadrupedOwnershipHeadTriangles = headTransferred;
    source.userData.quadrupedOwnershipHeadTransferredTriangles = headTransferred;
    return true;
  }
  if (sourceId === 'roster/18-quad-all--wooden_four-legged_robot_3d_model') {
    topology.groups.forEach((members, id) => {
      let bodyFaces = 0, armFaces = 0, footFaces = 0; const box = new T.Box3();
      for (const index of members) { const tri = allLow[index]; if (tri.region === 'body') bodyFaces++; if (tri.region === 'arms') armFaces++; if (tri.region === 'feet') footFaces++; for (const p of tri.points) box.expandByPoint(new T.Vector3(p.x,p.y,p.z)); }
      const size = box.getSize(new T.Vector3());
      // The verified wooden model has one continuous rear underside bridging both
      // sides. Preserve it as body-owned instead of cleaving it between hind feet.
      if (bodyFaces > 0 && armFaces > 0 && footFaces > 0 && size.x > bodySize.x * 0.4 && size.z > bodySize.z * 0.7) heldComponents.add(id);
    });
  }
  if (sourceId === 'roster/18-quad-all--robotic_dog_3d_model') {
    const bodyCenter = bodyBox.getCenter(new T.Vector3());
    const front = inferFront(source, bodyBox, headBox);
    topology.groups.forEach((members, id) => {
      let armFaces = 0, otherFaces = 0; const box = new T.Box3();
      for (const index of members) {
        const tri = allLow[index];
        if (tri.region === 'arms') armFaces++; else otherFaces++;
        for (const p of tri.points) box.expandByPoint(new T.Vector3(p.x, p.y, p.z));
      }
      const size = box.getSize(new T.Vector3()), center = box.getCenter(new T.Vector3());
      const foreDepth = (center.x - bodyCenter.x) * front.x + (center.z - bodyCenter.z) * front.z;
      // Two source ARM flecks sit inside the chest, immediately below its front
      // edge. They are not appendages: routing them to either foreleg makes them
      // swing visibly under the abdomen. Keep only these small, central components
      // body-owned; the four full limb components remain independently animated.
      if (otherFaces === 0 && armFaces >= 70 && armFaces <= 95
        && Math.abs(center.x - bodyCenter.x) < bodySize.x * 0.3
        && foreDepth > bodySize.z * 0.3
        && center.y > cutoff - feetBox.getSize(new T.Vector3()).y * 0.45
        && size.x < bodySize.x * 0.35 && size.y < bodySize.y * 0.4 && size.z < bodySize.z * 0.4) {
        heldComponents.add(id);
      }
    });
  }
  if (sourceId === 'roster/18-quad-all--quadruped_robot_3d_model1') {
    const bodyCenter = bodyBox.getCenter(new T.Vector3()), front = inferFront(source, bodyBox, headBox);
    topology.groups.forEach((members, id) => {
      const counts: Record<string, number> = {}, box = new T.Box3();
      for (const index of members) {
        const tri = allLow[index]; counts[tri.region] = (counts[tri.region] || 0) + 1;
        for (const p of tri.points) box.expandByPoint(new T.Vector3(p.x, p.y, p.z));
      }
      const center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
      const frontOffset = (center.x - bodyCenter.x) * front.x + (center.z - bodyCenter.z) * front.z;
      // Werner's isolated 548-face central apron is authored in ARMS, but it is
      // below the torso and has no contact with any of the four grounded limbs.
      // Keep the whole centerline component with BodyMotion instead of letting
      // nearest-paw voting make it swing as a detached fifth appendage.
      if (members.length === 548 && counts.arms === 548
        && Math.abs(center.x - bodyCenter.x) < bodySize.x * 0.08
        && center.y < cutoff * 0.4 && frontOffset > bodySize.z * 0.25
        && size.x < bodySize.x * 0.1 && size.y < feetBox.getSize(new T.Vector3()).y * 0.3
        && size.z < bodySize.z * 0.12) heldComponents.add(id);
    });
  }
  const seedTriangles: Triangle[] = [];
  for (let i = 0; i < allLow.length; i++) {
    const tri = allLow[i];
    if (!heldComponents.has(topology.component[i]) && (tri.region === 'arms' || tri.region === 'feet') && tri.center.y <= feetBox.min.y + (feetBox.max.y - feetBox.min.y) * 0.68) seedTriangles.push(tri);
  }
  if (allLow.length < 100 || seedTriangles.length < 80) return false;
  const clusters = clusterFour(seedTriangles.map(t => t.center));
  if (!clusters) return false;

  const centerX = bodyBox.getCenter(new T.Vector3()).x;
  const centerZ = bodyBox.getCenter(new T.Vector3()).z;
  const front = inferFront(source, bodyBox, headBox);
  const ranked = clusters.map(c => ({ c, foreScore: (c.center.x - centerX) * front.x + (c.center.z - centerZ) * front.z, sideScore: c.center.x - centerX }));
  const fore = [...ranked].sort((a, b) => b.foreScore - a.foreScore), rear = fore.slice(2);
  const setPair = (pair: typeof ranked, foreleg: boolean) => {
    const [left, right] = [...pair].sort((a, b) => a.sideScore - b.sideScore);
    for (const row of [left, right]) {
      row.c.fore = foreleg; row.c.side = row === left ? -1 : 1;
      row.c.node = foreleg ? (row.c.side < 0 ? 'ArmLeft' : 'ArmRight') : (row.c.side < 0 ? 'FootLeft' : 'FootRight');
    }
  };
  setPair(fore.slice(0, 2), true); setPair(rear, false);

  const center = { x: centerX, y: 0, z: centerZ };
  const nearest = (p: Point) => clusters.map((c, i) => ({ i, d: dist2XZ(p, c.center) })).sort((a, b) => a.d - b.d)[0];
  const clusterRadius = Math.max(...clusters.map(c => c.radius));
  const maxAttach = Math.max(0.14, clusterRadius * 1.8);
  const assigned = new Map<Triangle, QuadrupedLimbNode>();
  for (let componentId = 0; componentId < topology.groups.length; componentId++) {
    const memberIndexes = topology.groups[componentId];
    if (heldComponents.has(componentId)) continue;
    const members = memberIndexes.map(i => allLow[i]);
    const sourceLimbFaces = members.filter(tri => tri.region === 'arms' || tri.region === 'feet').length;
    const box = new T.Box3();
    const votes = new Int32Array(clusters.length);
    for (const tri of members) {
      for (const p of tri.points) box.expandByPoint(new T.Vector3(p.x, p.y, p.z));
      votes[nearest(tri.center).i]++;
    }
    const size = box.getSize(new T.Vector3());
    const compactLimb = sourceLimbFaces > 0 && size.x <= bodySize.x * 1.05 && size.z <= bodySize.z * 1.05;
    if (compactLimb) {
      // A physical appendage is one connected source component. Give every one of its
      // triangles the same joint owner; per-face nearest-cluster routing shears long toes
      // and curved limbs at Voronoi boundaries when they pass close to another leg.
      let winner = 0;
      for (let i = 1; i < votes.length; i++) if (votes[i] > votes[winner]) winner = i;
      const node = clusters[winner].node;
      if (!node) return false;
      for (const tri of members) assigned.set(tri, node);
      continue;
    }
    // Fused, broad low shells retain their whole-body ownership where possible. For
    // remaining broad geometry, keep the established contact-aware triangle fallback.
    for (const tri of members) {
      const { i, d } = nearest(tri.center), candidate = clusters[i];
      if (!candidate.node) return false;
      const bodyOwned = tri.region === 'body' || tri.region === 'head';
      if (bodyOwned && Math.sqrt(d) > maxAttach) continue;
      const sideDistance = Math.sqrt(dist2XZ(candidate.center, center));
      if (bodyOwned && sideDistance < 0.08) continue;
      assigned.set(tri, candidate.node);
    }
  }
  const bodyRegion = source.getObjectByName('body');
  const bodyMaterial = bodyRegion ? regionMeshes.get('body')!.find(mesh => !Array.isArray(mesh.material))?.material : undefined;
  const byMesh = new Map<T.Mesh, Map<QuadrupedLimbNode | 'body', number[]>>();
  let bodyOwnedTriangles = 0;
  let bodyTransferredTriangles = 0;
  let bodyTransferredFromFeet = 0;
  const addTarget = (tri: Triangle, node: QuadrupedLimbNode | 'body') => {
    let targets = byMesh.get(tri.mesh); if (!targets) byMesh.set(tri.mesh, targets = new Map());
    let ids = targets.get(node); if (!ids) targets.set(node, ids = []); ids.push(tri.id);
  };
  for (let i = 0; i < allLow.length; i++) if (heldComponents.has(topology.component[i])) {
    const tri = allLow[i];
    addTarget(tri, 'body'); bodyOwnedTriangles++;
    if (tri.region !== 'body') bodyTransferredTriangles++;
    if (tri.region === 'feet') bodyTransferredFromFeet++;
  }
  for (const [tri, node] of assigned) {
    addTarget(tri, node);
  }
  let moved = 0;
  for (const [mesh, targets] of byMesh) {
    const movedIds = new Set([...targets.values()].flat());
    if (!movedIds.size || !mesh.parent) continue;
    const count = (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
    const remaining: number[] = [];
    for (let id = 0; id < count; id++) if (!movedIds.has(id)) remaining.push(id);
    const kept = triangleSubset(mesh.geometry, remaining);
    const old = mesh.geometry, parent = mesh.parent;
    const parts: Array<{ node: QuadrupedLimbNode | 'body'; geometry: T.BufferGeometry }> = [];
    for (const [node, ids] of targets) {
      const geometry = triangleSubset(old, ids);
      if (geometry) parts.push({ node, geometry });
    }
    if (kept) mesh.geometry = kept; else mesh.removeFromParent();
    for (const { node, geometry } of parts) {
      const part = mesh.clone(false); part.geometry = geometry;
      const count = (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
      if (node === 'body') {
        if (!bodyRegion || !bodyMaterial) { geometry.dispose(); continue; }
        part.name = `${mesh.name || 'Quadruped underside'} body-owned underside`;
        part.userData = { ...mesh.userData, quadrupedBodyOwnedTriangles: count };
        source.updateWorldMatrix(true, true); bodyRegion.updateWorldMatrix(true, false);
        const relative = bodyRegion.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
        relative.decompose(part.position, part.quaternion, part.scale);
        part.material = bodyMaterial;
        bodyRegion.add(part);
      } else {
        part.name = `${mesh.name || 'Quadruped limb'} ${node}`;
        part.userData = { ...mesh.userData, quadrupedLimbNode: node, rigNodeName: node };
        parent?.add(part);
      }
      moved += count;
    }
    old.dispose();
  }
  if (!moved) return false;

  const hints = {} as Record<QuadrupedLimbNode, QuadrupedJointHint>;
  for (const c of clusters) {
    const triangles = assigned;
    const points: Point[] = [];
    for (const [tri, node] of triangles) if (node === c.node && Math.sqrt(dist2XZ(tri.center, c.center)) <= maxAttach && tri.center.y >= cutoff - Math.max(0.08, (cutoff - feetBox.min.y) * 0.18)) points.push(tri.center);
    const joint = points.length ? points.reduce((sum, p) => add(sum, p), { x: 0, y: 0, z: 0 }) : { ...c.center, y: cutoff };
    const p = points.length ? scale(joint, 1 / points.length) : joint;
    hints[c.node!] = { position: [p.x, p.y, p.z], side: c.side!, fore: c.fore! };
  }
  source.userData.quadrupedLimbHints = hints;
  storeMeshJointHints(source, hints);
  source.userData.quadrupedOwnershipVersion = 1;
  source.userData.quadrupedOwnershipTriangles = moved;
  source.userData.quadrupedOwnershipBodyTriangles = bodyOwnedTriangles;
  source.userData.quadrupedOwnershipBodyTransferredTriangles = bodyTransferredTriangles;
  source.userData.quadrupedOwnershipBodyTransferredFromFeet = bodyTransferredFromFeet;
  return true;
}


