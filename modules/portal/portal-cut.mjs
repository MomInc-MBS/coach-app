import * as THREE from 'three';

export function pointInPolygon(u,v,poly){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [xi,yi]=poly[i],[xj,yj]=poly[j];
  if((yi>v)!==(yj>v)&&u<(xj-xi)*(v-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}

export function splitIndexByPolygon(positions,index,toUv,poly){
 const keep=[],cut=[],us=poly.map(p=>p[0]),vs=poly.map(p=>p[1]),u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs);
 for(let t=0;t<index.length;t+=3){
  const a=3*index[t],b=3*index[t+1],c=3*index[t+2],[u,v]=toUv((positions[a]+positions[b]+positions[c])/3,(positions[a+1]+positions[b+1]+positions[c+1])/3);
  (u>=u0&&u<=u1&&v>=v0&&v<=v1&&pointInPolygon(u,v,poly)?cut:keep).push(index[t],index[t+1],index[t+2]);
 }
 return {keep,cut};
}

export function pieceMaterial(src){const m=src.clone();m.onBeforeCompile=src.onBeforeCompile;m.customProgramCacheKey=src.customProgramCacheKey;m.transparent=true;return m;}
export function fallPieces(pieces,fall,ms){
 const angle=Math.random()*Math.PI*2,axis=new THREE.Vector3(Math.cos(angle),Math.sin(angle),0),t0=performance.now(),z0=pieces.map(p=>p.pivot.position.z);
 const f={live:true,pose(now){const t=Math.min(1,(now-t0)/Math.max(1,ms)),e=t*t;pieces.forEach((p,i)=>{p.pivot.position.z=z0[i]-fall*e;p.pivot.quaternion.setFromAxisAngle(axis,(35*Math.PI/180)*e);p.pivot.scale.setScalar(1-.4*e);p.material.opacity=1-e;});}};
 f.pose(t0);
 f.done=new Promise(resolve=>{f.end=()=>{if(!f.live)return;f.live=false;pieces.forEach(p=>p.drop());resolve();};if(ms>0)setTimeout(f.end,ms);else f.end();});
 return f;
}
