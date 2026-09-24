export const SHIP_STYLES=Object.freeze(['supportive','direct','analytical','playful','calm','mom']);
export const BIOMES=Object.freeze(['original','patch','fold','lattice','wax','fungi','glass','bristle','cork','coral','metal','feather','moss','stormcloud','frost','ember','shadow','dragon','spring','vine','chitin','puff','rock','shag']);
const PART_WEIGHTS=Object.freeze({body:3,head:2,eye:1,collar:1,arms:1,feet:1});
export const normalizeShip=value=>SHIP_STYLES.includes(value)?value:'supportive';
export function normalizeBackground(value){if(typeof value==='number'&&Number.isInteger(value))return BIOMES[value]||BIOMES[0];return BIOMES.includes(value)?value:BIOMES[0];}
export function dominantFamily(design={}){const styles=design.styles&&typeof design.styles==='object'?design.styles:design,body=Number.isInteger(Number(styles.body))?Number(styles.body):0,score=new Map();for(const [part,weight]of Object.entries(PART_WEIGHTS)){const value=Number(styles[part]);if(Number.isInteger(value)&&value>=0)score.set(value,(score.get(value)||0)+weight)}if(!score.size)return body;let best=body,bestScore=score.get(body)||-1;for(const [family,value]of score)if(value>bestScore||(value===bestScore&&family===body)){best=family;bestScore=value}return best;}
export function initialScene(design={}){return Object.freeze({ship:normalizeShip(design.coach),background:normalizeBackground(dominantFamily(design)),coach:design});}
export function resolveSceneSwap(current,next={}){return Object.freeze({ship:next.ship===undefined?normalizeShip(current.ship):normalizeShip(next.ship),background:next.background===undefined?normalizeBackground(current.background):normalizeBackground(next.background),coach:next.coach===undefined?current.coach:next.coach});}
// #145 (Ian 2026-09-23): the ship shows its stern to the viewer, flies in over their head and settles nearer the
// camera than the coach; the beam waits until it has landed. The duration knobs: the flight, then the beam's charge.
export const APPROACH_MS=2200,BEAM_CHARGE_MS=500;
// The starter ship's nose is its model +x (cockpit; the engines are at -x): a quarter turn puts the stern to the camera.
export const SHIP_FACING=Math.PI/2,SHIP_REST_Z=1.5;
// From above and behind the camera (z 7) it glides forward and down over the coach into its hover spot: depth and
// drift ease out, height a little faster, so it drops into view at the top edge and slows into place.
export function sampleApproach(elapsed,duration=APPROACH_MS){const t=Math.max(0,Math.min(1,elapsed/duration)),far=Math.pow(1-t,3),high=Math.pow(1-t,5);if(t===1)return Object.freeze({x:0,y:SHIP_ANCHOR_Y,z:SHIP_REST_Z,scale:1,roll:0,done:true});return Object.freeze({x:1.4*far,y:SHIP_ANCHOR_Y+2.6*high,z:SHIP_REST_Z+8.5*far,scale:1,roll:-.25*far,done:false});}
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
// #148 (Ian 2026-09-23): the customizer opens only from the arrival's ship. The editor (creature/source/editor-workbench.ts)
// boots only with this per-tab gate set; without it (a typed URL, a fresh tab) it sends the user to the arrival first.
export const SHIP_GATE='myr5-ship-gate';
export function openCustomizer(url='/creature/index.html'){try{sessionStorage.setItem(SHIP_GATE,'1');}catch{}location.assign(url);}
