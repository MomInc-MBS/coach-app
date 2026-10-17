import {themeFor} from '../runner/themes.mjs';

const palettes={
 tropical:['#82cced','#7bb9a0','#ffae46','#30b865',36],
 castle:['#180b20','#351420','#ff872f','#ffcc52',14],
 rainbow:['#05051c','#101339','#6eefff','#f9a7ff',215],
 loopway:['#67c9fa','#90d4dd','#ffe765','#61eb76',95],
 laboratory:['#0a2430','#174451','#48f9d1','#f8dc51',173],
 asteroid:['#020309','#070d20','#75caff','#ff685d',220]
};
const cache=new Map();
export function biomeTheme(id){
 if(cache.has(id))return cache.get(id);
 const [bg,fog,rail,warm,hue]=palettes[id]??palettes.tropical,base=themeFor(0);
 const value={...base,name:id,bg,fog,hue,hemi:[id==='castle'?'#ffbc86':'#e7f6ff',fog],light:warm,
  wall:{...base.wall,tint:rail,from:fog,to:bg},neon:{...base.neon,rail,warm,amber:warm,emergency:'#ff6574'}};
 cache.set(id,value);return value;
}

// Screen-fixed thin viewport frame: the center remains clear for posture gates.
export const COCKPIT_MARKUP=`<svg viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true">
 <g class="pf-cockpit-shadow"><ellipse cx="50" cy="86" rx="51" ry="57"/><path d="M40 65H60L76 78V95L60 108H40L24 95V78Z M40 65L30 33 M60 65L70 33 M76 78L97 64 M76 95L97 108 M60 108L70 139 M40 108L30 139 M24 95L3 108 M24 78L3 64"/></g>
 <g class="pf-cockpit-metal"><ellipse cx="50" cy="86" rx="51" ry="57"/><path d="M40 65H60L76 78V95L60 108H40L24 95V78Z M40 65L30 33 M60 65L70 33 M76 78L97 64 M76 95L97 108 M60 108L70 139 M40 108L30 139 M24 95L3 108 M24 78L3 64"/></g>
 </svg><span class="pf-cockpit-tag">MOM INC. / INK INTERCEPTOR</span>`;

export function pickupGeometry(THREE){
 const star=new THREE.Shape();
 for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?.2:.44;star[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}star.closePath();
 return {
  speed:new THREE.ConeGeometry(.35,.8,4).rotateZ(-Math.PI/2),
  magnet:new THREE.TorusGeometry(.32,.12,5,12,Math.PI*1.65),
  shield:new THREE.OctahedronGeometry(.44,0),
  coins:new THREE.BoxGeometry(.58,.52,.48),
  lift:new THREE.TorusKnotGeometry(.25,.075,24,4,2,3),
  pineapple:new THREE.DodecahedronGeometry(.4,0).scale(.8,1.25,.8),
  coconut:new THREE.SphereGeometry(.4,7,5),
  tiki:new THREE.BoxGeometry(.45,.8,.36),
  star:new THREE.ExtrudeGeometry(star,{depth:.12,bevelEnabled:false}),
  crest:new THREE.CylinderGeometry(.4,.15,.65,5).rotateZ(Math.PI),
  spring:new THREE.TorusKnotGeometry(.25,.065,40,4,1,5),
  crystal:new THREE.OctahedronGeometry(.45,0).scale(.7,1.3,.7),
  prism:new THREE.CylinderGeometry(.25,.35,.7,3),
  cloud:new THREE.SphereGeometry(.4,8,5).scale(1.5,.7,.7),
  ring:new THREE.TorusGeometry(.36,.1,6,18),
  flower:new THREE.TorusKnotGeometry(.24,.09,32,5,2,5),
  cell:new THREE.CylinderGeometry(.23,.23,.65,8),
  flask:new THREE.CylinderGeometry(.14,.4,.65,8),
  briefcase:new THREE.BoxGeometry(.7,.46,.24),
  comet:new THREE.ConeGeometry(.33,.9,7).rotateZ(-Math.PI/3),
  satellite:new THREE.BoxGeometry(.75,.18,.4),
  orbital:new THREE.TorusGeometry(.32,.14,5,10)
 };
}
