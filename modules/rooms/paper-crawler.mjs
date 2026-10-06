export function buildPaperCrawler(THREE,{paperMat,suitMat,caseMat}){
 const g=new THREE.Group();
 const eyeMat=new THREE.MeshStandardMaterial({color:0x0a0806,roughness:1});
 // helpers
 const grp=(x,y,z,p)=>{const o=new THREE.Group();o.position.set(x,y,z);(p||g).add(o);return o;}
 const part=(geo,mat,x,y,z,p)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);(p||g).add(m);return m;}
 // body constants
 const THIGH=0.6, SHIN=0.45, SPINE=0.68, UARM=0.34, FARM=0.32;
 const HIP_Y=0.7, HIP_Z=-0.45; // crawling pose
 // pelvis & torso
 part(new THREE.BoxGeometry(0.34,0.2,0.22),suitMat,0,HIP_Y,HIP_Z);
 const torso=grp(0,HIP_Y,HIP_Z);torso.rotation.x=Math.PI/2+0.25;
 // chest
 part(new THREE.CylinderGeometry(0.21,0.15,SPINE,10),suitMat,0,SPINE/2,0,torso).scale.z=0.62;
 for(const s of[-1,1])part(new THREE.SphereGeometry(0.08,10,8),suitMat,s*0.26,SPINE-0.05,0,torso);
 // neck
 const neck=grp(0,SPINE,0,torso); part(new THREE.CylinderGeometry(0.06,0.07,0.16,8),paperMat,0,0.06,0,neck);
 // head
 const head=grp(0,0,0);head.rotation.order='YXZ';
 part(new THREE.SphereGeometry(0.17,16,12),paperMat,0,0,0,head).scale.set(1,1.12,0.95);
 part(new THREE.SphereGeometry(0.1,12,8),paperMat,0,-0.14,0.05,head).scale.set(1,0.55,0.9);
 for(const s of[-1,1])part(new THREE.SphereGeometry(0.036,8,6),eyeMat,s*0.065,0.035,0.135,head);
 const nose=part(new THREE.ConeGeometry(0.03,0.08,6),paperMat,0,-0.035,0.19,head);nose.rotation.x=Math.PI/2;
 part(new THREE.SphereGeometry(0.175,12,8,0,Math.PI*2,0,Math.PI*0.4),caseMat,0,0.012,-0.012,head).scale.set(1,1.12,0.97);
 // limb builder
 const limb=(px,py,pz,upLen,loLen,upR,loR)=>{const up=grp(px,py,pz);part(new THREE.CylinderGeometry(upR,upR*0.82,upLen,8),suitMat,0,-upLen/2,0,up);
  part(new THREE.SphereGeometry(upR*1.05,8,6),suitMat,0,-upLen,0,up);const lo=grp(0,-upLen,0,up);part(new THREE.CylinderGeometry(loR,loR*0.85,loLen,8),suitMat,0,-loLen/2,0,lo);
  return{upper:up,lower:lo};}
 const armL=limb(0,0,0,UARM,FARM,0.05,0.04),armR=limb(0,0,0,UARM,FARM,0.05,0.04);
 const legL=limb(-0.1,HIP_Y,HIP_Z,THIGH,SHIN,0.075,0.06),legR=limb(0.1,HIP_Y,HIP_Z,THIGH,SHIN,0.075,0.06);
 // feet
 for(const leg of[legL,legR]){const foot=grp(0,-SHIN,0,leg.lower);foot.rotation.x=Math.PI-( -0.15+Math.PI/2-0.1 );part(new THREE.BoxGeometry(0.11,0.06,0.27),caseMat,0,-0.02,0.08,foot);}
 // hands
 const handL=grp(0,-FARM,0,armL.lower);const handR=grp(0,-FARM,0,armR.lower);
 part(new THREE.BoxGeometry(0.09,0.11,0.035),paperMat,0,-0.055,0,handL);part(new THREE.BoxGeometry(0.09,0.11,0.035),paperMat,0,-0.055,0,handR);
 for(const h of[handL,handR])for(const fx of[-0.028,0,0.028])part(new THREE.BoxGeometry(0.018,0.075,0.022),paperMat,fx,-0.145,0,h);
 // rest rotations
 armL.upper.rotation.set(-0.45,0,0);armR.upper.rotation.set(-0.45,0,0);
 armL.lower.rotation.x=armR.lower.rotation.x=-0.3;
 legL.upper.rotation.x=legR.upper.rotation.x=-0.15;
 legL.lower.rotation.x=legR.lower.rotation.x=Math.PI/2-0.1;
 head.rotation.x=0.3;
 // layout
 const v=new THREE.Vector3();
 function layout(dip){torso.rotation.x=Math.PI/2+0.25;const lift=0.1-0.17*dip;
  v.set(0,SPINE+0.26,0).applyEuler(torso.rotation);head.position.set(v.x,HIP_Y+v.y+lift,HIP_Z+v.z);
  v.set(-0.27,SPINE-0.06,0).applyEuler(torso.rotation);armL.upper.position.set(v.x,HIP_Y+v.y,HIP_Z+v.z);
  v.set(0.27,SPINE-0.06,0).applyEuler(torso.rotation);armR.upper.position.set(v.x,HIP_Y+v.y,HIP_Z+v.z);}
 layout(0);
 // pose function
 const rest={headP:0.3,armU:-0.45,armL:-0.3,legU:-0.15,legL:Math.PI/2-0.1};
 function pose(seconds){const t=seconds*4*Math.PI; // 2Hz
  armL.upper.rotation.x=rest.armU+0.4*Math.sin(t);armR.upper.rotation.x=rest.armU+0.4*Math.cos(t);
  armL.lower.rotation.x=rest.armL+0.3*Math.sin(t);armR.lower.rotation.x=rest.armL+0.3*Math.cos(t);
  legL.upper.rotation.x=rest.legU+0.5*Math.sin(t+Math.PI/2);legR.upper.rotation.x=rest.legU+0.5*Math.cos(t+Math.PI/2);
  legL.lower.rotation.x=rest.legL+0.4*Math.sin(t+Math.PI/2);legR.lower.rotation.x=rest.legL+0.4*Math.cos(t+Math.PI/2);
  const dip=Math.abs(Math.sin(t*3));layout(dip);}
 g.visible=true;
 return{root:g,pose};
}