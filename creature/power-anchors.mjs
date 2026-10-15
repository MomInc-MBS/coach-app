// Project cached sole points after the coach's existing render has updated its animated matrices.
// Callers supply reusable Three.js vectors so this adds no per-frame vector allocation.
export function projectAvatarPowerAnchors(anchors, camera, rootVisible, worldPoint, ndcPoint) {
  return (anchors ?? []).map(({ index, node, local }) => {
    worldPoint.copy(local).applyMatrix4(node.matrixWorld);
    ndcPoint.copy(worldPoint).project(camera);
    const x = (ndcPoint.x + 1) * 0.5, y = (1 - ndcPoint.y) * 0.5;
    const visible = !!rootVisible && node.visible !== false && Number.isFinite(x) && Number.isFinite(y)
      && ndcPoint.x >= -1 && ndcPoint.x <= 1 && ndcPoint.y >= -1 && ndcPoint.y <= 1
      && ndcPoint.z >= -1 && ndcPoint.z <= 1;
    return { index, x, y, visible };
  });
}
