// #135 look-around behind the portal window. The portal's destination framing (portal.mjs) writes the eye here while a
// destination is open inside the metal frame: x right, y down, each -1..1 at the tilt clamp, 0 when off (reduced
// motion, camera-only, no destination). A three.js scene behind the window calls offAxis() every frame.
// Standalone and dependency-free: served unbundled next to portal.mjs and imported by the scenes that use it.
// AGPL-3.0-or-later.
export const eye={x:0,y:0};

// Off-axis (head-coupled) projection: the eye slides parallel to the window while the window's edges stay pinned, so
// the scene behind shows its sides like a real hole in a wall (Kooima's frustum for a screen-parallel window). Call it
// after the scene has posed its camera for the frame, right before render. dist: the camera's distance to the window
// plane (put it at the subject: nearer things swing more, farther less); deg: the view shift at full tilt. It undoes
// its own last shift if the scene left the camera where it was, so a camera posed once (not every frame) is fine too,
// and rebuilds the frustum every call (the scene's own updateProjectionMatrix() makes it symmetric again).
export function offAxis(camera,dist,deg=12){
 const u=camera.userData;
 if(u.peerAt&&camera.position.equals(u.peerAt)){camera.translateX(-u.peerX);camera.translateY(-u.peerY);}
 camera.updateProjectionMatrix();
 const k=Math.tan(deg*Math.PI/180)*dist,ex=eye.x*k,ey=-eye.y*k; // world units at the window plane; screen y is down
 u.peerX=ex;u.peerY=ey;
 if(ex||ey){
  camera.translateX(ex);camera.translateY(ey);
  const near=camera.near,top=near*Math.tan(camera.fov*Math.PI/360)/camera.zoom,half=top*camera.aspect,s=near/dist;
  camera.projectionMatrix.makePerspective(-half-ex*s,half-ex*s,top-ey*s,-top-ey*s,near,camera.far);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
 }
 (u.peerAt??=camera.position.clone()).copy(camera.position);
}
