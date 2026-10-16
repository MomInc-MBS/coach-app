// Rest scene coach while the 3D coach is off (coach3d-flag.mjs): the 64-bit coach sprite, front-facing, standing
// still in front of the user, beside the MOM gun lane. Same sprite source as the Fruit Ninja coach (camera-slice.mjs). Drawn once per call.
// The MOM gun (arcade/slice/rest-game.mjs) hangs top-centre and fires down the middle at the player, so the coach stands
// right of that lane, facing us. No seated frame exists in war-room/coach-sprites.js, so he stands still.
export const REST_SPRITE={heightPct:46,bottomPct:2,centerPct:70}; // tuning: size/feet/horizontal centre within the rest mount
export function mountRestCoachSprite(mount){
 if(!mount)return null;
 let canvas=mount.querySelector('canvas.rest-coach-sprite');
 if(!canvas){
  canvas=document.createElement('canvas');canvas.className='rest-coach-sprite';canvas.width=64;canvas.height=96;canvas.setAttribute('aria-hidden','true');
  const aspect=64/96;
  canvas.style.cssText=`position:absolute;left:${REST_SPRITE.centerPct}%;bottom:${REST_SPRITE.bottomPct}%;height:${REST_SPRITE.heightPct}%;aspect-ratio:${aspect};transform:translateX(-50%);image-rendering:pixelated;pointer-events:none;`;
  mount.append(canvas);
 }
 (async()=>{
  try{const A=window.GalaAvatar,{loadGala}=await import('/pod/identity.mjs'),m=await import('/war-room/coach-sprites.js'),c=await m.loadWarRoomCoaches(document);
   c.draw(A.draw,canvas,loadGala(localStorage,A).look,{});}
  catch{const x=canvas.getContext('2d');x.fillStyle='#bc89ff';x.fillRect(20,30,24,50);x.fillStyle='#fff';x.fillRect(24,36,6,6);x.fillRect(34,36,6,6);}
 })();
 return canvas;
}
