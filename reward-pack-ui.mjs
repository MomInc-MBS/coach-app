import PALETTES from './creature/source/creator/palettes.json' with {type:'json'};
import {grantDailyPack,openRewardPack,unopenedPacks} from './reward-packs.mjs';

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
@media(prefers-reduced-motion:reduce){.reward-pack-dialog.opened .reward-pack-tile{animation:none}}
`;
export const TIER_COLORS=Object.freeze({uncommon:'#76e356',rare:'#4bafff',legendary:'#ff9c36'});
export const tierOf=id=>{const tier=String(id).startsWith('reward-pack:')?String(id).split(':')[1]:'uncommon';return Object.hasOwn(TIER_COLORS,tier)?tier:'uncommon';};
const CATEGORY={color:'Colour palette','64-bit':'64-bit boss skin',texture:'Texture'};
// What the tile says about an opened pack: the actual item, what kind it is, and its colours when it is a palette.
export function rewardSummary(opened){
 const reward=opened?.reward||{};
 const colors=reward.kind==='palette'?PALETTES.find(item=>item.id===reward.id)?.colors||[]:[];
 return {title:reward.name||'Reward',detail:CATEGORY[opened?.category]||'Cosmetic',colors};
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
  const tier=tierOf(ids[0]);launch.style.setProperty('--pack',TIER_COLORS[tier]);drawTierTile(launch.querySelector('canvas').getContext('2d'),tier);
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
 function show(id){
  current={kind:'reward-pack',id,tier:tierOf(id)};overlay.classList.remove('opened');overlay.style.setProperty('--pack',TIER_COLORS[current.tier]);
  overlay.querySelector('h2').textContent=`${current.tier} pack`;tile.setAttribute('aria-label',`${current.tier} pack tile`);drawTierTile(tile.getContext('2d'),current.tier);
  result.textContent='One cosmetic inside. Tap to open.';open.hidden=false;close.textContent='Later';
  launch.hidden=true;overlay.showModal();open.focus();
 }
 launch.onclick=()=>{const id=available()[0];if(id)show(id);};close.onclick=hide;overlay.addEventListener('close',()=>{current=null;update();});
 open.onclick=()=>{
  if(!current)return;const opened=openRewardPack(current);if(!opened){result.textContent='Could not save this pack. Try again.';return;}
  const summary=rewardSummary(opened);drawTierTile(tile.getContext('2d'),current.tier,{colors:summary.colors,opened:true});tile.setAttribute('aria-label',`${summary.title}, ${summary.detail}`);
  overlay.classList.remove('opened');void tile.offsetWidth;overlay.classList.add('opened');
  const title=document.createElement('strong'),kind=document.createElement('small');title.textContent=`${summary.title} unlocked!`;kind.textContent=summary.detail;result.replaceChildren(title,kind);
  if(summary.colors.length){const swatches=document.createElement('div');swatches.className='reward-pack-swatches';for(const color of summary.colors){const chip=document.createElement('i');chip.style.background=color;swatches.append(chip);}result.append(swatches);}
  open.hidden=true;close.textContent='Done';close.focus();
 };
 const onGrant=event=>{if(event.detail?.granted?.some(item=>item.kind==='reward-pack')){update();present();}};
 const onReady=event=>{grantDailyPack({account:event.detail});update();present();};
 const onCleared=()=>{clearTimeout(presentTimer);hide();update();};
 window.addEventListener('myr5:battle-pass',onGrant);window.addEventListener('myr5:account-ready',onReady);window.addEventListener('myr5:account-cleared',onCleared);update();
 return ()=>{clearTimeout(presentTimer);hide();window.removeEventListener('myr5:battle-pass',onGrant);window.removeEventListener('myr5:account-ready',onReady);window.removeEventListener('myr5:account-cleared',onCleared);launch.remove();overlay.remove();style.remove();};
}
