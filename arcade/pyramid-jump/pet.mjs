// The paper MOM Inc. character that lives in Dr. Girlfriend's pocket on photo days (peek -> jump to the right ->
// hop onto the pyramid and bounce -> PLAY). Lazy/optional; mounted by food/pyramid-scanner.mjs, all in the same window.
import {paperFor,readRecipe,topOf} from './logic.mjs';
const STYLE=`
#pyramidScanner .pj-layer{position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden}
#pyramidScanner .pj-pet{position:absolute;left:0;top:0;padding:0;border:0;background:none;pointer-events:auto;cursor:pointer;filter:drop-shadow(2px 3px 2px #30251988);touch-action:manipulation}
#pyramidScanner .pj-pet svg{display:block;width:100%;height:100%;overflow:hidden}
#pyramidScanner .pj-lip{position:absolute;left:-16px;right:-16px;bottom:-6px;height:20px;background:repeating-linear-gradient(90deg,#8b5bc7 0 9px,#d4a93a 9px 14px);border:2px solid #351344;border-radius:2px 2px 5px 5px}
#pyramidScanner .pj-play{position:absolute;left:0;top:0;min-height:44px;padding:0 24px;border:2px solid #fff;border-radius:999px;background:#ff5d8f;color:#fff;font:800 15px/1 system-ui,sans-serif;letter-spacing:.12em;pointer-events:auto;box-shadow:0 2px 10px #0008;animation:pjPulse 1.6s ease-in-out infinite}
@keyframes pjPulse{50%{box-shadow:0 2px 10px #0008,0 0 18px 6px #ff5d8fbb}}
#pyramidScanner[data-jump] .pyramid-ui>*{opacity:0!important;pointer-events:none!important}
#pyramidScanner .pyramid-ui>*{transition:opacity .45s}
@media(prefers-reduced-motion:reduce){#pyramidScanner .pj-play{animation:none}#pyramidScanner .pyramid-ui>*{transition:none}}
`;
const ease=t=>t<.5?2*t*t:1-(-2*t+2)**2/2;
export function mountPet({host,walker,playAt,apex,getMeals,dialog,recipe=readRecipe()}){
 const art=paperFor(recipe),top=topOf(art.d),[ex,ey,er]=art.eye,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const style=document.createElement('style');style.textContent=STYLE;document.head.append(style);
 const layer=document.createElement('div');layer.className='pj-layer';
 const pet=document.createElement('button');pet.type='button';pet.className='pj-pet';pet.setAttribute('aria-label','A little paper friend peeks out of her pocket. Tap to say hi');
 const peekH=Math.max(60,ey+er*1.7+46-top+20);
 const tufts=`<path d="M78,${top+3}l5,-14l6,12l6,-18l6,16l7,-15l5,14l7,-11l4,11z" fill="${art.colour}" stroke="#2a1838" stroke-width="3" stroke-linejoin="round"/>`;
 pet.innerHTML=`<svg viewBox="0 ${top-20} 200 ${peekH}" aria-hidden="true"><path d="${art.d}" fill="${art.colour}" stroke="#2a1838" stroke-width="4" stroke-linejoin="round"/>${tufts}<circle cx="${ex}" cy="${ey}" r="${er*1.7}" fill="#fff8eb" stroke="#2a1838" stroke-width="3"/><circle class="pj-pupil" cx="${ex}" cy="${ey}" r="${er*.8}" fill="#2a1838"/></svg><i class="pj-lip"></i>`;
 const svg=pet.querySelector('svg'),pupil=pet.querySelector('.pj-pupil'),lip=pet.querySelector('.pj-lip');
 const play=document.createElement('button');play.type='button';play.className='pj-play';play.textContent='PLAY';play.hidden=true;
 layer.append(pet,play);host.append(layer);
 const size={peek:[72,72*peekH/200],full:[56,56*240/200]};
 let state='peek',tween=null,pos={x:-99,y:-99},w=72,h=size.peek[1],game=null,raf=0,disposed=false,gamePromise=null;
 const to=(x,y,ms,hop=60)=>{const from={...pos};tween={from,to:{x,y},t0:performance.now(),ms:reduced?1:ms,hop};};
 const hostBox=()=>host.getBoundingClientRect();
 function full(){[w,h]=size.full;svg.setAttribute('viewBox','0 0 200 240');pet.removeChild(lip);}
 function frame(now){
  if(disposed)return;raf=requestAnimationFrame(frame);
  const hb=hostBox();
  if(state==='peek'&&walker?.isConnected){const r=walker.getBoundingClientRect();pos={x:r.left-hb.left+r.width*.63-w/2,y:r.top-hb.top+r.height*.31-h+6};} // peeks out of the DR GIRLFRIEND badge pocket, up top
  if(tween){const t=Math.min(1,(now-tween.t0)/tween.ms),e=ease(t);pos={x:tween.from.x+(tween.to.x-tween.from.x)*e,y:tween.from.y+(tween.to.y-tween.from.y)*e-Math.sin(t*Math.PI)*tween.hop};if(t>=1){const done=tween.then;tween=null;done?.();}}
  else if(state==='right')pos.y+=Math.sin(now/260)*.35;
  else if(state==='bounce'){const a=apex(),b=Math.abs(Math.sin(now/230));pos={x:a.x-w/2,y:a.y-h-b*34};}
  pet.style.width=w+'px';pet.style.height=h+'px';pet.style.transform=`translate(${Math.round(pos.x)}px,${Math.round(pos.y)}px)${state==='bounce'?` scale(${1+.08*(1-Math.abs(Math.sin(now/230)))},${1-.08*(1-Math.abs(Math.sin(now/230)))})`:''}`;
  // the eyeball looks at the user: toward the middle of the screen
  const dx=hb.width/2-(pos.x+w/2),dy=hb.height/2-(pos.y+h/2),d=Math.hypot(dx,dy)||1;
  pupil.setAttribute('cx',ex+dx/d*er*.7);pupil.setAttribute('cy',ey+dy/d*er*.7);
  if(!play.hidden){const r=playAt.getBoundingClientRect(),pw=play.offsetWidth||110,ph=play.offsetHeight||44;play.style.transform=`translate(${Math.round(hb.width/2-pw/2)}px,${Math.round(r.top-hb.top-ph-14)}px)`;} // PLAY takes the camera button's job, above the TODAY/LAST MEAL switch
 }
 const home=()=>{const hb=hostBox();return {x:hb.width-w-14,y:hb.height*.56};};
 function jumpOut(){
  state='fly';full();pet.setAttribute('aria-label','Your paper friend. Tap to hop onto the pyramid');
  const h0=home();to(h0.x,h0.y,750,90);tween.then=()=>{state='right';};
 }
 function hopOnPyramid(){
  state='fly';host.dataset.jump='';pet.setAttribute('aria-label','Your paper friend bouncing on the pyramid');pet.tabIndex=-1;
  const a=apex();to(a.x-w/2,a.y-h,700,80);tween.then=()=>{state='bounce';play.hidden=false;play.focus({preventScroll:true});};
 }
 function backHome(){
  delete host.dataset.jump;play.hidden=true;state='fly';pet.tabIndex=0;pet.setAttribute('aria-label','Your paper friend. Tap to hop onto the pyramid');
  const h0=home();to(h0.x,h0.y,700,80);tween.then=()=>{state='right';};
 }
 pet.onclick=()=>{if(state==='peek')jumpOut();else if(state==='right')hopOnPyramid();};
 play.onclick=async()=>{
  if(game||gamePromise)return;
  const motion=await import('../../character-phone-sensor.mjs').catch(()=>null);void motion?.requestPhoneMotion?.(); // iOS asks for tilt inside this tap
  gamePromise=import('./game.mjs').then(m=>{
   if(disposed)return;
   layer.hidden=true;const root=document.createElement('div');root.className='pj-game';root.style.cssText='position:absolute;inset:0;z-index:7;background:#05030f;overflow:hidden';(dialog||host).append(root);
   const g=m.startGame(root,{startLevel:+new URLSearchParams(location.search).get('pjlevel')||0,recipe,meals:getMeals(),subscribeMotion:motion?.subscribePhoneMotion,onExit(){g.dispose();root.remove();game=null;layer.hidden=false;backHome();}});
   game={g,root};window.__pyramidJump=g; // test hook: g.teleport(h)
  }).catch(()=>{layer.hidden=false;}).finally(()=>{gamePromise=null;});
 };
 raf=requestAnimationFrame(frame);
 return {dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);game?.g.dispose();game?.root.remove();delete host.dataset.jump;layer.remove();style.remove();if(window.__pyramidJump===game?.g)delete window.__pyramidJump;}};
}
