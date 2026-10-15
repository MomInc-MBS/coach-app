/**
 * Runtime ownership helpers for source meshes whose authoring cuts put pieces of
 * the lower limbs in the arm region. This module deliberately does not delete or
 * rewrite source triangles: callers receive triangle-index sets and can bake each
 * source triangle exactly once into its selected rig node.
 */

export type Vec3 = { x: number; y: number; z: number };
export type Box3Like = { min: Vec3; max: Vec3; isEmpty?: () => boolean };
export type GeometryLike = {
  getAttribute(name: string): { count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number };
  index?: { count: number; getX(i: number): number } | null;
};
export type MeshLike = { geometry: GeometryLike; matrixWorld?: { elements: ArrayLike<number> } };

export type OwnershipOptions = {
  /** World-space contact tolerance. Default: max(0.012, 0.008 * feet height). */
  contactTolerance?: number;
  /** Position weld tolerance for identifying shared triangle edges. */
  weldTolerance?: number;
  /** Keep a component in arms if it reaches the body's lower cut boundary. */
  bodyLowerY?: number;
  /** Extend the torso candidate band for a verified source with plates above the hip. */
  bodyUpperFraction?: number;
  /** Raise the small-component cap only for a source with measured larger torso shards. */
  bodyComponentLimit?: number;
  /** Require every corner of a candidate face to lie on the body surface. */
  allVerticesOnBody?: boolean;
};

/** Copy a complete triangle subset without dropping vertex/morph attributes or reordering faces. */
export function triangleSubset(source: THREE.BufferGeometry, keep: (triangle: number) => boolean): THREE.BufferGeometry | null {
  const position = source.getAttribute('position'), index = source.index, count = index?.count ?? position.count;
  const remap = new Map<number, number>(), sourceVertices: number[] = [], outIndex: number[] = [];
  for (let i = 0; i + 2 < count; i += 3) {
    if (!keep(i / 3)) continue;
    for (let j = 0; j < 3; j++) {
      const old = index ? index.getX(i + j) : i + j;
      let next = remap.get(old);
      if (next === undefined) { next = sourceVertices.length; remap.set(old, next); sourceVertices.push(old); }
      outIndex.push(next);
    }
  }
  if (!outIndex.length) return null;
  const out = new THREE.BufferGeometry();
  const copyAttribute = (attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
    const interleaved = attribute as THREE.InterleavedBufferAttribute;
    const isInterleaved = (attribute as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute === true;
    const sourceArray = isInterleaved ? interleaved.data.array : attribute.array;
    const stride = isInterleaved ? interleaved.data.stride : attribute.itemSize;
    const offset = isInterleaved ? interleaved.offset : 0;
    const values = new (sourceArray.constructor as any)(sourceVertices.length * attribute.itemSize);
    for (let i = 0; i < sourceVertices.length; i++) for (let component = 0; component < attribute.itemSize; component++)
      values[i * attribute.itemSize + component] = sourceArray[sourceVertices[i] * stride + offset + component];
    return new THREE.BufferAttribute(values, attribute.itemSize, attribute.normalized);
  };
  for (const [name, attribute] of Object.entries(source.attributes)) out.setAttribute(name, copyAttribute(attribute as THREE.BufferAttribute));
  for (const [name, attributes] of Object.entries(source.morphAttributes)) out.morphAttributes[name] = attributes.map(attribute => copyAttribute(attribute as THREE.BufferAttribute));
  out.morphTargetsRelative = source.morphTargetsRelative;
  out.setIndex(outIndex); out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}

type Point = [number, number, number];
type Triangle = { id: number; p: [Point, Point, Point]; center: Point; low: boolean };

const clampTolerance = (value: number) => Math.max(1e-5, value);
const distSq = (a: Point, b: Point) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const midpoint = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

function worldPoint(mesh: MeshLike, i: number): Point {
  const position = mesh.geometry.getAttribute('position');
  const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
  const e = mesh.matrixWorld?.elements;
  if (!e) return [x, y, z];
  const w = e[3] * x + e[7] * y + e[11] * z + e[15];
  const d = w && w !== 1 ? 1 / w : 1;
  return [
    (e[0] * x + e[4] * y + e[8] * z + e[12]) * d,
    (e[1] * x + e[5] * y + e[9] * z + e[13]) * d,
    (e[2] * x + e[6] * y + e[10] * z + e[14]) * d,
  ];
}

function triangleData(mesh: MeshLike): Triangle[] {
  const g = mesh.geometry, position = g.getAttribute('position'), count = g.index?.count ?? position.count;
  const vertex = (i: number) => g.index ? g.index.getX(i) : i;
  const triangles: Triangle[] = [];
  for (let i = 0; i + 2 < count; i += 3) {
    const p: [Point, Point, Point] = [worldPoint(mesh, vertex(i)), worldPoint(mesh, vertex(i + 1)), worldPoint(mesh, vertex(i + 2))];
    triangles.push({id: i / 3, p, center: [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3, (p[0][2] + p[1][2] + p[2][2]) / 3,], low: false});
  }
  return triangles;
}

function pointKey(p: Point, eps: number) { return `${Math.round(p[0] / eps)},${Math.round(p[1] / eps)},${Math.round(p[2] / eps)}`; }
function edgeKey(a: Point, b: Point, eps: number) {
  const ka = pointKey(a, eps), kb = pointKey(b, eps);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

/** Build face adjacency from shared edges, including duplicated/non-indexed seam vertices. */
function components(triangles: Triangle[], weldTolerance: number, eligible?: (triangle: Triangle) => boolean) {
  const eligibleIds = new Set(triangles.filter(t => !eligible || eligible(t)).map(t => t.id));
  const edges = new Map<string, number[]>();
  for (const t of triangles) {
    if (!eligibleIds.has(t.id)) continue;
    for (let i = 0; i < 3; i++) {
      const k = edgeKey(t.p[i], t.p[(i + 1) % 3], weldTolerance);
      const list = edges.get(k);
      if (list) list.push(t.id); else edges.set(k, [t.id]);
    }
  }
  const neighbors = new Map<number, Set<number>>();
  for (const ids of edges.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      let set = neighbors.get(id); if (!set) neighbors.set(id, set = new Set());
      for (const other of ids) if (other !== id) set.add(other);
    }
  }
  const byId = new Map(triangles.map(t => [t.id, t]));
  const seen = new Set<number>(), result: Triangle[][] = [];
  for (const id of eligibleIds) {
    if (seen.has(id)) continue;
    seen.add(id); const queue = [id], group: Triangle[] = [];
    for (let q = 0; q < queue.length; q++) {
      const current = queue[q], triangle = byId.get(current)!; group.push(triangle);
      for (const n of neighbors.get(current) ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
    result.push(group);
  }
  return result;
}

/** Return face-component triangle ids, optionally restricted to a selected set. */
export function connectedTriangleComponents(mesh: MeshLike, eligibleIds?: ReadonlySet<number>, weldTolerance?: number): number[][] {
  const triangles = triangleData(mesh);
  if (!triangles.length) return [];
  let min = Infinity, max = -Infinity;
  for (const t of triangles) for (const p of t.p) { min = Math.min(min, p[0]); max = Math.max(max, p[0]); }
  const eps = clampTolerance(weldTolerance ?? Math.max(1e-5, (max - min) * 1e-5));
  return components(triangles, eps, eligibleIds ? t => eligibleIds.has(t.id) : undefined).map(group => group.map(t => t.id));
}

/** Index only open boundary edges of the feet mesh; interior surface contact is not enough. */
function boundarySamples(meshes: Iterable<MeshLike>, cell: number, weldTolerance: number) {
  const edges = new Map<string, {count:number; a:Point; b:Point}>();
  for (const mesh of meshes) for (const t of triangleData(mesh)) for (let i = 0; i < 3; i++) {
    const a = t.p[i], b = t.p[(i + 1) % 3], k = edgeKey(a, b, weldTolerance), row = edges.get(k);
    if (row) row.count++;
    else edges.set(k, {count:1, a, b});
  }
  const grid = new Map<string, Point[]>(), key = (p:Point) => `${Math.floor(p[0]/cell)},${Math.floor(p[1]/cell)},${Math.floor(p[2]/cell)}`;
  let total = 0;
  for (const edge of edges.values()) {
    if (edge.count !== 1) continue;
    // Subsamples tolerate small discrepancies from separate decimation passes.
    for (let i = 0; i <= 4; i++) {
      const t = i / 4, p:Point = [edge.a[0] + (edge.b[0] - edge.a[0]) * t, edge.a[1] + (edge.b[1] - edge.a[1]) * t, edge.a[2] + (edge.b[2] - edge.a[2]) * t];
      const k = key(p), row = grid.get(k); if (row) row.push(p); else grid.set(k, [p]); total++;
    }
  }
  return {grid, cell, total};
}

/** Index the complete body surface (including closed side walls, not just cut edges). */
function surfaceSamples(meshes: Iterable<MeshLike>, cell: number) {
  const grid = new Map<string, Point[]>(), key = (p:Point) => `${Math.floor(p[0]/cell)},${Math.floor(p[1]/cell)},${Math.floor(p[2]/cell)}`;
  let total = 0;
  const add = (p:Point) => {const k=key(p),row=grid.get(k);if(row)row.push(p);else grid.set(k,[p]);total++;};
  for (const mesh of meshes) for (const t of triangleData(mesh)) {
    for (let i=0;i<3;i++) {add(t.p[i]);add(midpoint(t.p[i],t.p[(i+1)%3]));}
    add(t.center);
  }
  return {grid,cell,total};
}

function nearSample(p: Point, index: ReturnType<typeof samples>, tolerance: number) {
  const {grid, cell} = index, cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell), limit = tolerance * tolerance;
  for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (let z = cz - 1; z <= cz + 1; z++) {
    for (const q of grid.get(`${x},${y},${z}`) ?? []) if (distSq(p, q) <= limit) return true;
  }
  return false;
}

/**
 * Return triangle ids in an `arms` mesh that should be owned by the feet node.
 * A candidate must be below the actual feet-region top and belong to a connected
 * low component that contacts the actual feet surface within a small tolerance.
 * This keeps ordinary hanging hands and disconnected quadruped front legs in
 * arms, while recovering lower-leg pieces cut into arms. No triangle is dropped.
 *
 * `feetMeshes` must be the visible meshes under the assembled source `feet` group,
 * in the same world transform as `mesh`. Pass an empty iterable to disable rescue.
 */
export function armFootTriangles(mesh: MeshLike, feetBox: Box3Like, feetMeshes: Iterable<MeshLike>, options: OwnershipOptions = {}): Set<number> {
  if (feetBox.isEmpty?.()) return new Set();
  const height = Math.max(0, feetBox.max.y - feetBox.min.y);
  const tolerance = clampTolerance(options.contactTolerance ?? Math.max(0.012, height * 0.008));
  const weld = clampTolerance(options.weldTolerance ?? Math.max(1e-5, tolerance * 0.02));
  const footIndex = boundarySamples(feetMeshes, tolerance, weld);
  if (!footIndex.total) return new Set();

  const arm = triangleData(mesh), top = feetBox.max.y + tolerance;
  for (const t of arm) t.low = t.center[1] <= top;
  const low = arm.filter(t => t.low);
  if (!low.length) return new Set();

  const seeds = new Set<number>();
  for (const t of low) {
    if (t.p.some(p => nearSample(p, footIndex, tolerance)) ||
        nearSample(midpoint(t.p[0], t.p[1]), footIndex, tolerance) ||
        nearSample(midpoint(t.p[1], t.p[2]), footIndex, tolerance) ||
        nearSample(midpoint(t.p[2], t.p[0]), footIndex, tolerance) ||
        nearSample(t.center, footIndex, tolerance)) seeds.add(t.id);
  }
  if (!seeds.size) return new Set();

  const selected = new Set<number>();
  // Decide ownership from the complete source component. Building connectivity
  // only from low faces can peel a claw/forearm off an otherwise continuous arm
  // when the low section happens to touch a foot cut at the wrist.
  for (const group of components(arm, weld)) {
    const reachesBodyCut = options.bodyLowerY !== undefined && group.some(t => t.p.some(p => p[1] >= options.bodyLowerY! - tolerance));
    // A complete grounded leg can end at the pelvis cut, too. Ground contact
    // distinguishes it from a hanging claw whose top happens to meet that cut.
    const grounded = group.some(t => t.p.some(p => p[1] <= feetBox.min.y + height * .1));
    if ((!reachesBodyCut || grounded) && group.some(t => seeds.has(t.id)) && group.every(t => t.p.every(p => p[1] <= top)))
      for (const t of group) selected.add(t.id);
  }
  return selected;
}

/**
 * Return small, complete lower-torso components in an arm cut that approach the
 * body's full surface, including closed side walls. The lower-body band and
 * component-size cap keep hands and continuous arms animated as arms; this is
 * for detached pelvis/torso shards that the cut-edge-only check can miss.
 */
export function armBodyTriangles(mesh: MeshLike, bodyBox: Box3Like, bodyMeshes: Iterable<MeshLike>, options: OwnershipOptions = {}): Set<number> {
  if (bodyBox.isEmpty?.()) return new Set();
  const height = Math.max(0, bodyBox.max.y - bodyBox.min.y);
  if (!height) return new Set();
  const tolerance = clampTolerance(options.contactTolerance ?? Math.max(0.018, height * 0.014));
  const weld = clampTolerance(options.weldTolerance ?? Math.max(1e-5, tolerance * 0.02));
  const bodyIndex = surfaceSamples(bodyMeshes, tolerance);
  if (!bodyIndex.total) return new Set();
  const triangles = triangleData(mesh), lowerTop = bodyBox.min.y + height * (options.bodyUpperFraction ?? 0.4);
  if (!triangles.length) return new Set();
  const maximum = Math.min(300, options.bodyComponentLimit ?? Math.max(200, Math.floor(triangles.length * 0.06)));
  const selected = new Set<number>();
  // Keep connected pieces intact. Lower arm-cut scraps are body owned when they
  // sit in the pelvis band and approach any body surface; checking only open
  // cut edges misses pieces against a closed body side wall.
  for (const group of components(triangles, weld)) {
    if (group.length > maximum) continue;
    let minY=Infinity,maxY=-Infinity,nearBody=false;
    for(const t of group) for(const p of t.p){minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);if(!nearBody&&nearSample(p,bodyIndex,tolerance))nearBody=true;}
    if(nearBody&&minY>=bodyBox.min.y-height*.03&&maxY<=lowerTop)for(const t of group)selected.add(t.id);
  }
  return selected;
}

/**
 * Select only torso-side faces in a narrow hip band when they are welded into a
 * larger animated arm component. This keeps the actual arm connected and moving
 * while assigning the small faces that overlap the body cut to BodyMotion.
 */
export function armBodyBandTriangles(mesh: MeshLike, bodyBox: Box3Like, bodyMeshes: Iterable<MeshLike>, options: OwnershipOptions = {}): Set<number> {
  if (bodyBox.isEmpty?.()) return new Set();
  const height = Math.max(0, bodyBox.max.y - bodyBox.min.y);
  if (!height) return new Set();
  const tolerance = clampTolerance(options.contactTolerance ?? Math.max(0.018, height * 0.014));
  const bodyIndex = surfaceSamples(bodyMeshes, tolerance);
  if (!bodyIndex.total) return new Set();
  const bottom = bodyBox.min.y - height * 0.03;
  const top = bodyBox.min.y + height * (options.bodyUpperFraction ?? 0.45);
  const selected = new Set<number>();
  for (const triangle of triangleData(mesh)) {
    const points = [...triangle.p, midpoint(triangle.p[0], triangle.p[1]), midpoint(triangle.p[1], triangle.p[2]), midpoint(triangle.p[2], triangle.p[0]), triangle.center];
    const onBody=options.allVerticesOnBody?triangle.p.every(point=>nearSample(point,bodyIndex,tolerance)):points.some(point=>nearSample(point,bodyIndex,tolerance));
    if (triangle.center[1] >= bottom && triangle.center[1] <= top && onBody) selected.add(triangle.id);
  }
  return selected;
}

/** Arm-cut faces whose centers fall just below a source body's bottom cut; intended for continuous tail shells. */
export function trianglesBelowBodyCut(mesh: MeshLike, bodyCutY: number, cutTolerance = 0): Set<number> {
  const selected = new Set<number>();
  for (const triangle of triangleData(mesh)) if (triangle.center[1] <= bodyCutY + Math.max(0, cutTolerance)) selected.add(triangle.id);
  return selected;
}

/** Move only complete, floor-grounded source components below a continuous-tail body cut. */
export function groundedComponentsBelowBodyCut(mesh: MeshLike, bodyCutY: number, feetBox: Box3Like, cutTolerance = 0): Set<number> {
  const selected = new Set<number>(), triangles = triangleData(mesh), height = feetBox.max.y - feetBox.min.y;
  if (!(height > 0)) return selected;
  for (const component of connectedTriangleComponents(mesh)) {
    let minY = Infinity, maxY = -Infinity;
    for (const id of component) for (const point of triangles[id].p) { minY = Math.min(minY, point[1]); maxY = Math.max(maxY, point[1]); }
    if (minY <= feetBox.min.y + height * .1 && maxY <= bodyCutY + Math.max(0, cutTolerance)) for (const id of component) selected.add(id);
  }
  return selected;
}

/** Select whole detached foot-cut components that are really side hands. */
export function detachedHandTriangles(
  mesh: MeshLike,
  feetBox: Box3Like,
  feetMeshes: Iterable<MeshLike>,
  armsBox: Box3Like,
  armsMeshes: Iterable<MeshLike>,
  bodyBox: Box3Like,
  bodyMeshes: Iterable<MeshLike>,
  lowerBodyBox: Box3Like,
  options: {maxComponentTriangles?: number} = {},
): Set<number> {
  if (feetBox.isEmpty?.() || armsBox.isEmpty?.() || bodyBox.isEmpty?.() || lowerBodyBox.isEmpty?.()) return new Set();
  const floor = feetBox.min.y, footHeight = feetBox.max.y - floor;
  if (!(footHeight > 0) || !(bodyBox.max.y > bodyBox.min.y)) return new Set();
  const armContact = armFootTriangles(mesh, armsBox, armsMeshes);
  if (!armContact.size) return new Set();
  const bodyContact = armFootTriangles(mesh, bodyBox, bodyMeshes);
  const triangles = triangleData(mesh), weld = clampTolerance(Math.max(1e-5, footHeight * 0.00016));
  const selected = new Set<number>();
  for (const group of components(triangles, weld)) {
    if (group.length > (options.maxComponentTriangles ?? 600) || !group.some(t => armContact.has(t.id)) || group.some(t => bodyContact.has(t.id))) continue;
    let minY = Infinity, centerX = 0, count = 0;
    for (const triangle of group) for (const p of triangle.p) { minY = Math.min(minY, p[1]); centerX += p[0]; count++; }
    centerX /= count;
    const ungrounded = minY > floor + footHeight * 0.1;
    const outsideLowerBody = centerX < lowerBodyBox.min.x || centerX > lowerBodyBox.max.x;
    if (ungrounded && outsideLowerBody) for (const triangle of group) selected.add(triangle.id);
  }
  return selected;
}

/**
 * Assign complete connected components to left (-1), right (+1), or neutral (0).
 * Neutral means the component crosses the centerline or is too close to call.
 * The caller must resolve neutral ownership for that source; a valid fused limb
 * component can remain animated with a centroid-side fallback when appropriate.
 */
export function connectedComponentSides(mesh: MeshLike, centerX = 0, options: OwnershipOptions = {}): Int8Array {
  const triangles = triangleData(mesh), result = new Int8Array(triangles.length);
  if (!triangles.length) return result;
  const xs = triangles.flatMap(t => t.p.map(p => p[0]));
  const width = Math.max(...xs) - Math.min(...xs);
  const weld = clampTolerance(options.weldTolerance ?? Math.max(1e-5, width * 1e-5));
  const deadband = Math.max(1e-5, width * 0.015);
  for (const group of components(triangles, weld)) {
    let sum = 0, min = Infinity, max = -Infinity, count = 0;
    for (const t of group) for (const p of t.p) { sum += p[0]; min = Math.min(min, p[0]); max = Math.max(max, p[0]); count++; }
    const center = sum / count - centerX;
    const crossesCenter = min < centerX - deadband && max > centerX + deadband;
    let side = crossesCenter || Math.abs(center) <= deadband ? 0 : Math.sign(center);
    if (!side && !crossesCenter && min >= centerX - weld) side = 1;
    else if (!side && !crossesCenter && max <= centerX + weld) side = -1;
    // A fused component spanning the center remains whole and neutral.
    for (const t of group) result[t.id] = side;
  }
  return result;
}
import * as THREE from 'three';
