export const SHIP_STYLES=Object.freeze(['supportive','direct','analytical','playful','calm','mom']);
export const BIOMES=Object.freeze(['original','patch','fold','lattice','wax','fungi','glass','bristle','cork','coral','metal','feather','moss','stormcloud','frost','ember','shadow','dragon','spring','vine','chitin','puff','rock','shag']);
const PART_WEIGHTS=Object.freeze({body:3,head:2,eye:1,collar:1,arms:1,feet:1});
export const normalizeShip=value=>SHIP_STYLES.includes(value)?value:'supportive';
export function normalizeBackground(value){if(typeof value==='number'&&Number.isInteger(value))return BIOMES[value]||BIOMES[0];return BIOMES.includes(value)?value:BIOMES[0];}
export function dominantFamily(design={}){const styles=design.styles&&typeof design.styles==='object'?design.styles:design,body=Number.isInteger(Number(styles.body))?Number(styles.body):0,score=new Map();for(const [part,weight]of Object.entries(PART_WEIGHTS)){const value=Number(styles[part]);if(Number.isInteger(value)&&value>=0)score.set(value,(score.get(value)||0)+weight)}if(!score.size)return body;let best=body,bestScore=score.get(body)||-1;for(const [family,value]of score)if(value>bestScore||(value===bestScore&&family===body)){best=family;bestScore=value}return best;}
export function initialScene(design={}){return Object.freeze({ship:normalizeShip(design.coach),background:normalizeBackground(dominantFamily(design)),coach:design});}
export function resolveSceneSwap(current,next={}){return Object.freeze({ship:next.ship===undefined?normalizeShip(current.ship):normalizeShip(next.ship),background:next.background===undefined?normalizeBackground(current.background):normalizeBackground(next.background),coach:next.coach===undefined?current.coach:next.coach});}
export function sampleApproach(elapsed,duration=1600){const t=Math.max(0,Math.min(1,elapsed/duration)),eased=1-Math.pow(1-t,3);if(t===1)return Object.freeze({x:0,y:1.82,z:0,scale:1,roll:0,done:true});return Object.freeze({x:3.2*(1-eased),y:3.1-1.28*eased,z:-1.8*(1-eased),scale:.18+.82*eased,roll:-.2*(1-eased),done:t===1});}
// Hover pose that keeps the whole hull above the coach. The coach card is framed body-to-edges (viewer
// 'overlay' stage: feet on its bottom edge, head at or below its top), so its top edge bounds the head.
// band: NDC y range above the card; measured: the ship's NDC y box (top/bottom) and origin at the base
// anchor and scale 1, plus unit = NDC y per world unit of height. Returns world y, scale and the NDC y of
// the posed hull's belly (where the beam starts). A band too short to use keeps the base pose.
export const SHIP_ANCHOR_Y=1.82;
export function coachBand(stage,coach,{margin=.08,gap=.02}={}){const h=stage.height||1,top=h*margin,bottom=coach.top-stage.top-h*gap;return {top:1-2*top/h,bottom:1-2*bottom/h};}
export function shipPoseAbove(band,measured,fill=.85){
 const height=measured.top-measured.bottom;
 if(!(band.top-band.bottom>.2)||!(height>0)||!(measured.unit>0))return Object.freeze({y:SHIP_ANCHOR_Y,scale:1,belly:measured.bottom});
 const scale=Math.min(1,(band.top-band.bottom)*fill/height),centre=(band.top+band.bottom)/2;
 return Object.freeze({y:SHIP_ANCHOR_Y+(centre-((measured.top+measured.bottom)/2-measured.origin)*scale-measured.origin)/measured.unit,scale,belly:centre-height*scale/2});
}
// NDC y extent of an object's projected vertices (the visible hull, not its looser bounding box), its
// origin and NDC y per world unit, for shipPoseAbove.
export function measureShip(THREE,object,camera){
 camera.updateMatrixWorld();object.updateMatrixWorld(true);
 const v=new THREE.Vector3();let top=-Infinity,bottom=Infinity;
 object.traverse(mesh=>{const position=mesh.isMesh&&mesh.geometry.attributes.position;if(position)for(let i=0;i<position.count;i++){const y=v.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).project(camera).y;if(y>top)top=y;if(y<bottom)bottom=y;}});
 const origin=object.position.clone().project(camera).y,above=object.position.clone().add(new THREE.Vector3(0,1,0)).project(camera).y;
 return {top,bottom,origin,unit:above-origin};
}
