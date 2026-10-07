import {COACHES} from './performance-catalog.mjs';
import PALETTES from './creature/source/creator/palettes.json' with {type:'json'};
import {grantDailyPack,openRewardPackExclusive,unopenedPacks,PACK_SIZES} from './reward-packs.mjs';

// The pack is just a tile: a 64x64 pixel tile in its tier colour, then the item it awarded. Both popups are
// modal <dialog> (top layer) so the portal's background inerting never swallows it, and it presents itself
// once per pack per page load when one is waiting; the small launcher button reopens packs left for Later.
const CSS=`
.reward-pack-launch[hidden]{display:none}
.reward-pack-launch{position:fixed;right:16px;bottom:calc(var(--myr5-bar,0px) + 18px + env(safe-area-inset-bottom,0px));z-index:9000;display:flex;align-items:center;gap:8px;border:2px solid var(--pack);border-radius:12px;background:#21182f;color:#fff4bd;padding:6px 12px 6px 6px;font:800 14px system-ui;box-shadow:0 8px 30px #0009;cursor:pointer}
.reward-pack-launch canvas{width:32px;height:32px;image-rendering:pixelated}
.reward-pack-dialog{width:min(calc(100vw - 32px),380px);max-height:calc(100dvh - 32px);margin:auto;padding:0;border:0;background:none;color:#fff7df;font:500 16px/1.4 system-ui;overflow:visible}
.reward-pack-dialog::backdrop{background:#090717e8}
.reward-pack-card{overflow:auto;max-height:calc(100dvh - 32px);box-sizing:border-box;text-align:center;border:2px solid var(--pack);border-radius:20px;background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--pack) 26%,#21152e),#13101e 73%);box-shadow:0 0 55px color-mix(in srgb,var(--pack) 35%,transparent);padding:18px 18px 20px}
.reward-pack-card h2{margin:4px 0 0;font:900 24px/1.1 system-ui;text-transform:uppercase;letter-spacing:.04em}.reward-pack-card .eyebrow{margin:0;color:var(--pack);font:800 12px system-ui;letter-spacing:.2em;text-transform:uppercase}
.reward-pack-tile{display:block;margin:14px auto 10px;width:min(56vw,192px);height:min(56vw,192px);image-rendering:pixelated;filter:drop-shadow(0 10px 8px #000a)}
.reward-pack-dialog.opened .reward-pack-tile{animation:pack-flip .45s ease-out}
.reward-pack-result{min-height:64px;margin:0 0 14px}.reward-pack-result strong{display:block;color:var(--pack);font-size:22px;line-height:1.2}.reward-pack-result small{display:block;opacity:.85;text-transform:uppercase;letter-spacing:.12em;font-size:12px;margin-top:4px}
.reward-pack-swatches{display:flex;justify-content:center;gap:6px;margin-top:8px}.reward-pack-swatches i{width:26px;height:26px;border:2px solid #fff7df;border-radius:4px}
.reward-pack-actions{display:flex;gap:9px;justify-content:center}.reward-pack-actions button{min-height:44px;border:2px solid var(--pack);border-radius:12px;background:var(--pack);color:#15101c;font:800 15px system-ui;padding:8px 18px;cursor:pointer}.reward-pack-actions button.secondary{background:transparent;color:#fff7df}
.reward-pack-actions button:focus-visible,.reward-pack-launch:focus-visible{outline:3px solid white;outline-offset:3px}
@keyframes pack-flip{0%{transform:scale(1)}40%{transform:scale(1.12) rotateY(90deg);filter:brightness(2)}100%{transform:scale(1)}}
.reward-pack-launch[data-tier=secret],.reward-pack-dialog[data-tier=secret] .reward-pack-card{border-color:transparent;background:linear-gradient(#21182f,#21182f) padding-box,linear-gradient(120deg,#3ff5ff,#b388ff,#ff4bd8,#ffd36a,#3ff5ff) border-box;background-size:auto,300% 100%;animation:pack-iri 5s linear infinite}
.reward-pack-dialog[data-tier=secret] .reward-pack-card{background:radial-gradient(circle at 50% 30%,#3a2160,#13101e 73%) padding-box,linear-gradient(120deg,#3ff5ff,#b388ff,#ff4bd8,#ffd36a,#3ff5ff) border-box;background-size:auto,300% 100%}
.reward-pack-launch[data-tier=secret] canvas,.reward-pack-dialog[data-tier=secret] .reward-pack-tile{animation:pack-hue 6s linear infinite}
@keyframes pack-iri{to{background-position:0 0,-300% 0}}@keyframes pack-hue{50%{filter:hue-rotate(60deg) drop-shadow(0 10px 8px #000a)}}
@media(prefers-reduced-motion:reduce){.reward-pack-dialog.opened .reward-pack-tile,.reward-pack-launch[data-tier=secret],.reward-pack-dialog[data-tier=secret] .reward-pack-card,.reward-pack-launch[data-tier=secret] canvas,.reward-pack-dialog[data-tier=secret] .reward-pack-tile{animation:none}}
`;
export const TIER_COLORS=Object.freeze({uncommon:'#76e356',rare:'#4bafff',legendary:'#ff9c36',secret:'#b388ff'});
export const tierOf=id=>{const tier=String(id).startsWith('reward-pack:')?String(id).split(':')[1]:'uncommon';return Object.hasOwn(TIER_COLORS,tier)?tier:'uncommon';};
const CATEGORY={color:'Colour palette','64-bit':'64-bit pixel finish',texture:'Texture'};
// What the tile says about an opened pack: the actual item, what kind it is, and its colours when it is a palette.
export function rewardSummary(opened){
 const rewards=opened?.rewards|| (opened?.reward?[opened.reward]:[]);
 const reward=rewards[0]||{};
 // A single colour (pool items carry `hex`; a hex id is itself one) shows one swatch the way a palette shows its bands.
 const single=reward.kind==='color'?[/^#[0-9a-f]{6}$/i.test(reward.id)?reward.id:reward.hex].filter(Boolean):[];
 const colors=reward.kind==='palette'?PALETTES.find(item=>item.id===reward.id)?.colors||[]:single;
 return {title:reward.name||'Collection complete',detail:reward.kind==='boss-skin'?'64-bit boss skin':CATEGORY[reward.category||opened?.category]||'Cosmetic',colors,rewards};
}
const shade=(hex,amount)=>{const n=parseInt(hex.slice(1),16),c=[n>>16,n>>8&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v+amount))));return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');};
// A 64x64 bevelled pixel tile in the tier colour. Unopened: a pixel "?" glyph. Opened: the awarded palette's
// colours as bands (or a pixel star for skins/textures), so the tile itself shows what came out.
export function drawTierTile(ctx,tier,{colors=[],opened=false}={}){
 const base=TIER_COLORS[tier]||TIER_COLORS.uncommon,rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 ctx.clearRect(0,0,64,64);
 rect(0,0,64,64,shade(base,-120));rect(2,2,60,60,shade(base,70));rect(4,4,58,58,shade(base,-70));rect(4,4,56,56,base);
 rect(8,8,48,48,shade(base,-40));rect(10,10,44,44,shade(base,-95));
 if(opened&&colors.length){const band=Math.floor(44/colors.length);colors.forEach((color,i)=>rect(10,10+i*band,44,i===colors.length-1?44-i*band:band,color));}
 else{
  const ink=opened?'#fff7df':shade(base,90),px=(x,y)=>rect(12+x*4,12+y*4,4,4,ink);
  const glyph=opened?['....#.....','....#.....','...###....','#########.','.#######..','..#####...','..##.##...','.##...##..','.#.....#..','..........']:['..#####...','.##...##..','.##...##..','.....##...','....##....','....##....','..........','....##....','....##....','..........'];
  glyph.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell==='#')px(x,y);}));
 }
 rect(4,4,56,2,shade(base,110));rect(4,4,2,56,shade(base,110));
 // Secret: an iridescent bevel, cyan/violet/magenta/gold pixels round the frame (CSS hue-rotates it on screen).
 if(tier==='secret'){const hues=['#3ff5ff','#b388ff','#ff4bd8','#ffd36a'];for(let i=0;i<14;i++){const c=hues[i%4],o=2+i*4;rect(o,2,4,2,c);rect(60,o,2,4,c);rect(62-o-4,60,4,2,hues[(i+2)%4]);rect(2,62-o-4,2,4,hues[(i+2)%4]);}}
}
export function mountRewardPacks(){
 const style=document.createElement('style');style.textContent=CSS;document.head.append(style);
 const launch=document.createElement('button');launch.type='button';launch.className='reward-pack-launch';launch.hidden=true;launch.innerHTML='<canvas width="64" height="64" aria-hidden="true"></canvas><span></span>';document.body.append(launch);
 const overlay=document.createElement('dialog');overlay.className='reward-pack-dialog';overlay.setAttribute('aria-labelledby','pack-title');overlay.innerHTML='<section class="reward-pack-card"><p class="eyebrow">MYR5 • REWARD DROP</p><h2 id="pack-title"></h2><canvas class="reward-pack-tile" width="64" height="64" role="img"></canvas><div class="reward-pack-result" role="status" aria-live="polite"></div><div class="reward-pack-actions"><button type="button" data-open>Open pack</button><button type="button" class="secondary" data-close>Later</button></div></section>';document.body.append(overlay);
 const tile=overlay.querySelector('.reward-pack-tile'),result=overlay.querySelector('.reward-pack-result'),open=overlay.querySelector('[data-open]'),close=overlay.querySelector('[data-close]');let current=null,presentTimer=0;const presented=new Set();
 const available=()=>unopenedPacks();
 function update(){
  const ids=available(),count=ids.length;
  launch.hidden=!count||overlay.open;if(launch.hidden)return;
  const tier=tierOf(ids[0]);launch.style.setProperty('--pack',TIER_COLORS[tier]);launch.dataset.tier=tier;drawTierTile(launch.querySelector('canvas').getContext('2d'),tier);
  launch.querySelector('span').textContent=`${count} reward pack${count===1?'':'s'}`;
  const bar=document.getElementById('coachDock')?.getBoundingClientRect();launch.style.bottom=bar?.height?Math.max(18,innerHeight-bar.top+12)+'px':'';
 }
 // Present a waiting pack by itself, once per pack per page load, but never over a camera set.
 function present(){
  clearTimeout(presentTimer);const id=available().find(id=>!presented.has(id));if(!id||overlay.open)return;
  if(document.body.dataset.tracking==='true'||document.body.dataset.cameraWorkout==='true'){presentTimer=setTimeout(present,1500);return;}
  if(document.querySelector('dialog[open]:not(.reward-pack-dialog)')){presentTimer=setTimeout(present,500);return;}
  // The starter quilt only appears when no dialog is open: let it come up first (up to 5 s after launch).
  if(document.getElementById('portalHome')?.hidden!==false&&performance.now()<5000){presentTimer=setTimeout(present,250);return;}
  presented.add(id);show(id);
 }
 function hide(){if(overlay.open)overlay.close();}
 function select(id){
  current={kind:'reward-pack',id,tier:tierOf(id)};overlay.classList.remove('opened');overlay.style.setProperty('--pack',TIER_COLORS[current.tier]);overlay.dataset.tier=current.tier;
  overlay.querySelector('h2').textContent=`${current.tier} pack`;tile.setAttribute('aria-label',`${current.tier} pack tile`);drawTierTile(tile.getContext('2d'),current.tier);
  result.textContent=`${PACK_SIZES[current.tier]} coach cosmetic${PACK_SIZES[current.tier]===1?'':'s'} inside. Tap to open.`;open.hidden=false;close.textContent='Later';
 }
 let pods=null;const preload=()=>pods??=import('./drop-pod-opening.mjs').catch(()=>null);
 function show(id){select(id);preload();launch.hidden=true;overlay.showModal();open.focus();}
 launch.onclick=()=>{const id=available()[0];if(id)show(id);};close.onclick=hide;overlay.addEventListener('close',()=>{current=null;update();});
 // What an opened pack unlocked, as the plain items the reveal card (and the dialog's own result area) list.
 const unlocked=opened=>rewardSummary(opened).rewards.map(reward=>{const item=rewardSummary({reward,category:reward.category});return {title:item.title,detail:`${item.detail} for ${COACHES.find(coach=>coach.id===reward.coachId)?.label||'your coach'}`,colors:item.colors};});
 function render(opened){
  const summary=rewardSummary(opened);drawTierTile(tile.getContext('2d'),current.tier,{colors:summary.colors,opened:true});tile.setAttribute('aria-label',`${summary.title}, ${summary.detail}`);
  overlay.classList.remove('opened');void tile.offsetWidth;overlay.classList.add('opened');
  result.replaceChildren();
  if(!summary.rewards.length)result.textContent='All cosmetics for your unlocked coaches are collected.';
  for(const item of unlocked(opened)){
   const title=document.createElement('strong'),kind=document.createElement('small');title.textContent=`${item.title} unlocked!`;kind.textContent=item.detail;result.append(title,kind);
   if(item.colors.length){const swatches=document.createElement('div');swatches.className='reward-pack-swatches';for(const color of item.colors){const chip=document.createElement('i');chip.style.background=color;swatches.append(chip);}result.append(swatches);}
  }
  open.hidden=true;close.textContent='Done';close.focus();
 }
 // Open pack starts the full-screen drop-pod sequence; the pack is opened when the pod is tapped, and Open another moves to the next waiting pack.
 const sequence=pending=>({tier:pending.tier,hasNext:()=>available().some(id=>id!==pending.id),onExit:hide,
  open:async()=>{const opened=await openRewardPackExclusive(pending);if(!opened)return null;if(current===pending)render(opened);return unlocked(opened);},
  onNext:()=>{const id=available().find(id=>id!==pending.id);if(!id)return null;select(id);return sequence(current);}});
 open.onclick=async()=>{
  if(!current)return;const pending=current,module=await preload();if(current!==pending)return;
  if(module){module.playDropPod(sequence(pending));return;}
  // The sequence module could not load (offline without the update): fall back to the plain tile.
  open.disabled=true;let opened;try{opened=await openRewardPackExclusive(pending);}finally{open.disabled=false;}if(current!==pending)return;if(!opened){result.textContent='Could not save this pack. Try again.';return;}
  render(opened);
 };
 const onGrant=event=>{if(event.detail?.granted?.some(item=>item.kind==='reward-pack')){update();present();}};
 const onReady=event=>{grantDailyPack({account:event.detail});update();present();};
 const onCleared=()=>{clearTimeout(presentTimer);hide();update();};
 window.addEventListener('myr5:performance-progress',update);window.addEventListener('myr5:battle-pass',onGrant);window.addEventListener('myr5:account-ready',onReady);window.addEventListener('myr5:account-cleared',onCleared);update();
 return ()=>{clearTimeout(presentTimer);hide();window.removeEventListener('myr5:performance-progress',update);window.removeEventListener('myr5:battle-pass',onGrant);window.removeEventListener('myr5:account-ready',onReady);window.removeEventListener('myr5:account-cleared',onCleared);launch.remove();overlay.remove();style.remove();};
}
