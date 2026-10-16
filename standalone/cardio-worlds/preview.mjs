import {WORLDS,POWERS,createWorldRun,advance,act,collectPower,hit,collectCoin} from './worlds.mjs';
import {createWorldScene} from './scene.mjs';
const $=s=>document.querySelector(s),canvas=$('#view');
let saved=0;try{saved=Math.max(0,Math.min(2,Number(localStorage.getItem('myr5-cardio-worlds-v1'))||0));}catch{}
let run=createWorldRun({unlocked:saved}),playing=false,coachMode=false,last=0,seenWorld=-1,noticeUntil=0;
const scene=createWorldScene(canvas);
const names=['Crown Foundry','Verdant Ruins','Neon Transit'];
const descriptions=[
  'Purple enamel, brushed gold ribs, huge observation windows and floating machinery. Learn lane changes, floaty jumps and low slides. A clear runway leads to the purple gate.',
  'A jungle-temple run through carved stone arches, hanging vines, mossy terraces and mist. Gold coin trails teach each route. Leap fallen masonry, duck roots and collect relic powers.',
  'First-person rail yards, pastel city blocks, overhead wires and long subway cars. Read train silhouettes, follow rooftop-style coin arcs and use a board, jump shoes or flight to clear the route.'
];
const powerNames={magnet:'Coin magnet',shield:'Relic shield',doubleCoins:'Double coins',boost:'Dash aura',jetpack:'Jetpack',superJump:'Jump shoes',board:'Hoverboard',headstart:'Head start',scoreBoost:'Score ×2',phase:'Phase aura',pogo:'Pogo launch',recovery:'Recovery wings',coinTier:'Triple-value coins'};
function say(text){$('#message').textContent=text;noticeUntil=performance.now()+2500;}
function nav(){ $('#worlds').replaceChildren(...names.map((name,i)=>{const b=document.createElement('button');b.disabled=i>run.unlocked;b.setAttribute('aria-pressed',String(i===run.world));b.innerHTML=`0${i+1} / ${name}<small>${i>run.unlocked?'LOCKED · REACH THROUGH PORTAL':'REPLAY AVAILABLE'}</small>`;b.onclick=()=>{const unlocked=run.unlocked;run=createWorldRun({unlocked});run.world=i;seenWorld=-1;say(`${name}. Ready to run.`);};return b;})); }
for(const id of Object.keys(powerNames)){const b=document.createElement('button');b.textContent=powerNames[id];b.onclick=()=>{say(collectPower(run,id)?`${powerNames[id]} activated`:'Available during a run; head start only in the opening 150 m.');};$('#powers').append(b);}
function action(a){act(run,a);if(run.phase==='wormhole')say('Portal entered. Hold your course.');}
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
function toggle(){playing=!playing;$('#start').textContent=playing?'Pause Ⅱ':'Run →';say(playing?'Follow the coin trail.':'Paused. Take a breath.');}
$('#start').onclick=toggle;
$('#coach').onclick=()=>{coachMode=!coachMode;scene.setCoach(coachMode);$('#coach').setAttribute('aria-pressed',String(coachMode));say(coachMode?'Coach art study · same Sakura ink and light':'Back to first-person run');};
$('#portalPreview').onclick=()=>{run.distance=560;run.phase='run';playing=true;$('#start').textContent='Pause Ⅱ';say('Portal ahead. Jump when you reach the gate.');};
addEventListener('keydown',e=>{if(e.target.closest('button,input,select,textarea'))return;const a={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',' ':'jump',ArrowDown:'slide'}[e.key];if(a){e.preventDefault();action(a);}else if(e.key.toLowerCase()==='p')toggle();});
let down;canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;down=null;if(Math.max(Math.abs(dx),Math.abs(dy))>25)action(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'slide':'jump');});canvas.addEventListener('pointercancel',()=>down=null);
canvas.addEventListener('coin',()=>collectCoin(run));canvas.addEventListener('power',e=>{collectPower(run,e.detail);say(`${powerNames[e.detail]} collected`);});canvas.addEventListener('hit',()=>{const before=run.stumbles;hit(run);say(run.stumbles>before?'Stumble. Keep going!':'Protection absorbed the hit.');});
function frame(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing&&!coachMode)advance(run,dt);if(seenWorld!==run.world){seenWorld=run.world;$('#worldTitle').textContent=names[run.world];$('#worldCopy').textContent=descriptions[run.world];$('#chapter').textContent=`0${run.world+1} / ${names[run.world].toUpperCase()}`;nav();try{localStorage.setItem('myr5-cardio-worlds-v1',String(run.unlocked));}catch{say('Replay unlock works for this visit; browser storage is unavailable.');}}
  $('#distance').textContent=`${Math.floor(run.distance)} m`;$('#progress').textContent=`${Math.floor(run.distance)} / 600 M`;$('#bar').style.width=`${run.distance/6}%`;$('#coins').textContent=run.coins;$('#score').textContent=`${Math.floor(run.score)} SCORE`;
  $('#vortex').hidden=run.phase!=='wormhole';$('#buffs').replaceChildren(...Object.entries(run.powers).filter(([,n])=>n>0).map(([id,n])=>{const s=document.createElement('span');s.textContent=`${powerNames[id]} · ${n.toFixed(1)}s`;return s;}));
  if(now>noticeUntil)$('#message').textContent=coachMode?'Coach study · ink silhouettes + soft colour':run.phase==='portal'?'JUMP THROUGH THE PURPLE PORTAL ↑':!playing?'Press Run to explore':run.distance>520?'Purple portal ahead. Get ready to jump.':'Keep moving. Follow the gold.';
  scene.render(run,now/1000,playing&&!coachMode&&run.phase==='run');requestAnimationFrame(frame);
}
// Explicit debug surface for repeatable browser checks and future pose bridge. No workout XP writes.
window.cardioLab={get run(){return run;},action,power:id=>collectPower(run,id),setWorld:i=>{if(i<0||i>2)return;run.world=i;run.distance=0;seenWorld=-1;},get playing(){return playing;}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)toggle();last=0;});
addEventListener('pagehide',()=>scene.dispose(),{once:true});requestAnimationFrame(frame);
