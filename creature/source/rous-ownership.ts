import * as THREE from 'three';
import {connectedTriangleComponents, triangleSubset} from './limb-ownership';

const ROUS = 'roster/09-monolith-tanka--robot_3d_model2';

/** Recover the exact left arm pieces placed in the body and feet cuts of Rous. */
export function correctRousArmOwnership(source: THREE.Group, sourceId: string) {
  if (sourceId !== ROUS) return 0;
  source.updateWorldMatrix(true, true);
  const arms = source.getObjectByName('arms'), body = source.getObjectByName('body'), feet = source.getObjectByName('feet');
  if (!arms || !body || !feet) return 0;
  const intoArms = arms.matrixWorld.clone().invert();
  let recovered = 0;
  const extracted: Record<'body' | 'feet', number> = {body: 0, feet: 0};
  const recover = (group: THREE.Object3D, sourceRegion: 'body' | 'feet') => {
    const meshes: THREE.Mesh[] = [];
    group.traverse(o => { if (o instanceof THREE.Mesh && o.visible && !Array.isArray(o.material)) meshes.push(o); });
    for (const mesh of meshes) {
      const position = mesh.geometry.getAttribute('position'), index = mesh.geometry.index;
      const chosen = new Set<number>();
      for (const component of connectedTriangleComponents(mesh)) {
        if (component.length < (sourceRegion === 'body' ? 100 : 500)) continue;
        const bounds = new THREE.Box3(); let centerX = 0, centerY = 0, count = 0;
        for (const face of component) for (let k = 0; k < 3; k++) {
          const vertex = index ? index.getX(face * 3 + k) : face * 3 + k;
          const point = new THREE.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld);
          bounds.expandByPoint(point); centerX += point.x; centerY += point.y; count++;
        }
        centerX /= count; centerY /= count;
        // The left shoulder and forearm sit wholly outside the source body midpoint.
        // The feet-cut glove is the sole large negative-X component reaching above the floor.
        const isLeftShoulder = sourceRegion === 'body' && centerX < 0 && bounds.max.x < .24 && bounds.min.y > 1.05 && bounds.max.y < 1.9;
        const isLeftGlove = sourceRegion === 'feet' && centerX < 0 && centerY > .5 && bounds.max.y <= 1.081;
        if (isLeftShoulder || isLeftGlove) component.forEach(face => chosen.add(face));
      }
      if (!chosen.size) continue;
      const original = mesh.geometry, movedGeometry = triangleSubset(original, face => chosen.has(face));
      const remaining = triangleSubset(original, face => !chosen.has(face));
      if (!movedGeometry) continue;
      const transform = intoArms.clone().multiply(mesh.matrixWorld);
      movedGeometry.applyMatrix4(transform);
      recovered += chosen.size;
      if (remaining) { mesh.geometry = remaining; original.dispose(); }
      else { mesh.removeFromParent(); original.dispose(); }
      const recoveredMesh = new THREE.Mesh(movedGeometry, mesh.material as THREE.Material);
      recoveredMesh.name = `Rous recovered left arm from ${sourceRegion}`;
      recoveredMesh.userData.region = 'arms';
      recoveredMesh.userData.rousRecoveredArmSource = sourceRegion;
      recoveredMesh.userData.rousRecoveredArmTriangles = chosen.size;
      arms.add(recoveredMesh);
    }
  };
  recover(body, 'body'); recover(feet, 'feet');
  source.updateWorldMatrix(true, true);
  const meshMaterial = (group: THREE.Object3D) => { let result: THREE.Material | undefined; group.traverse(o => { if (!result && o instanceof THREE.Mesh && o.visible && !Array.isArray(o.material)) result = o.material; }); return result; };
  const targets = {body, feet};
  const materials = {body: meshMaterial(body), feet: meshMaterial(feet)};
  const moveArmFragments = (target: 'body' | 'feet') => {
    const targetMaterial = materials[target]; if (!targetMaterial) return;
    const meshes: THREE.Mesh[] = [];
    arms.traverse(o => { if (o instanceof THREE.Mesh && o.visible && !Array.isArray(o.material)) meshes.push(o); });
    for (const mesh of meshes) {
      const position = mesh.geometry.getAttribute('position'), index = mesh.geometry.index, selected = new Set<number>();
      for (const component of connectedTriangleComponents(mesh)) {
        let x = 0, y = 0, count = 0; const bounds = new THREE.Box3();
        for (const face of component) for (let k = 0; k < 3; k++) {
          const vertex = index ? index.getX(face * 3 + k) : face * 3 + k;
          const point = new THREE.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld);
          x += point.x; y += point.y; count++; bounds.expandByPoint(point);
        }
        x /= count; y /= count;
        const footShard = target === 'feet' && component.length >= 150 && x > 1.5 && x < 1.7 && y < .22 && bounds.max.y < .4;
        const pelvisShard = target === 'body' && component.length >= 20 && component.length <= 50 && x > 1.14 && x < 1.4 && y > 1.08 && y < 1.12 && bounds.max.y < 1.15;
        if (footShard || pelvisShard) component.forEach(face => selected.add(face));
      }
      if (!selected.size) continue;
      const original = mesh.geometry, movedGeometry = triangleSubset(original, face => selected.has(face)), remaining = triangleSubset(original, face => !selected.has(face));
      if (!movedGeometry) continue;
      const transform = targets[target].matrixWorld.clone().invert().multiply(mesh.matrixWorld);
      movedGeometry.applyMatrix4(transform); extracted[target] += selected.size;
      if (remaining) { mesh.geometry = remaining; original.dispose(); } else { mesh.removeFromParent(); original.dispose(); }
      const fragment = new THREE.Mesh(movedGeometry, targetMaterial); fragment.name = `Rous recovered ${target} fragment from arms`;
      fragment.userData.region = target; fragment.userData.rousRecoveredFromArms = target; fragment.userData.rousRecoveredArmTriangles = selected.size;
      targets[target].add(fragment);
    }
  };
  moveArmFragments('body'); moveArmFragments('feet');
  source.updateWorldMatrix(true, true);
  source.userData.rousRecoveredArmTriangles = recovered;
  source.userData.rousExtractedFromArms = extracted;
  return recovered;
}
