import * as THREE from 'three';
import {connectedTriangleComponents, triangleSubset} from './limb-ownership';

const IYENG_ARC = 'roster/10-petal-wisp--stylized_creature_3d_model';

/** Restore Iyeng-Arc's complete opposite fin/arm after the broad foot-cut repair. */
export function correctPetalWispArmOwnership(source: THREE.Group, sourceId: string): number {
  if (sourceId !== IYENG_ARC) return 0;
  source.updateWorldMatrix(true, true);
  const arms = source.getObjectByName('arms'), feet = source.getObjectByName('feet');
  if (!arms || !feet) return 0;
  let armMaterial: THREE.Material | undefined;
  arms.traverse(o => { if (!armMaterial && o instanceof THREE.Mesh && o.visible && !Array.isArray(o.material)) armMaterial = o.material; });
  if (!armMaterial) return 0;
  const toArms = arms.matrixWorld.clone().invert();
  let recovered = 0;
  const meshes: THREE.Mesh[] = [];
  feet.traverse(o => { if (o instanceof THREE.Mesh && o.visible && !Array.isArray(o.material)) meshes.push(o); });
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position'), index = mesh.geometry.index, selected = new Set<number>();
    for (const component of connectedTriangleComponents(mesh)) {
      if (component.length !== 581 && component.length !== 732) continue;
      const bounds = new THREE.Box3();
      for (const face of component) for (let k = 0; k < 3; k++) {
        const vertex = index ? index.getX(face * 3 + k) : face * 3 + k;
        bounds.expandByPoint(new THREE.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld));
      }
      const isArmSection=component.length===581&&bounds.min.x>.59&&bounds.min.x<.62&&bounds.max.x>.88&&bounds.max.x<.92&&bounds.min.y>.67&&bounds.min.y<.70&&bounds.max.y>1.27&&bounds.max.y<1.33;
      const isAttachedFin=component.length===732&&bounds.min.x>.28&&bounds.min.x<.31&&bounds.max.x>.59&&bounds.max.x<.62&&bounds.min.y>.75&&bounds.min.y<.78&&bounds.max.y>1.46&&bounds.max.y<1.48;
      if (isArmSection||isAttachedFin) component.forEach(face => selected.add(face));
    }
    if (!selected.size) continue;
    const original = mesh.geometry, armPart = triangleSubset(original, face => selected.has(face)), remainder = triangleSubset(original, face => !selected.has(face));
    if (!armPart) continue;
    armPart.applyMatrix4(toArms.clone().multiply(mesh.matrixWorld));
    recovered += selected.size;
    if (remainder) { mesh.geometry = remainder; original.dispose(); }
    else { mesh.removeFromParent(); original.dispose(); }
    const recoveredArm = new THREE.Mesh(armPart, armMaterial);
    recoveredArm.name = 'Iyeng-Arc recovered arm section';
    recoveredArm.userData.region = 'arms';
    recoveredArm.userData.petalWispRecoveredArmTriangles = selected.size;
    arms.add(recoveredArm);
    const prior = Number(mesh.userData.recoveredArmFootTriangles) || 0;
    mesh.userData.recoveredArmFootTriangles = Math.max(0, prior - selected.size);
  }
  source.updateWorldMatrix(true, true);
  source.userData.petalWispRecoveredArmTriangles = recovered;
  return recovered;
}
