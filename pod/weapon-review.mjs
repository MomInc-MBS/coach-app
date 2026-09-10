import {AbilityCooldown, abilityFor, evolution} from './weapon-evolution.mjs';
import {drawAnimatedWeapon} from './weapon-animator.mjs';

const $ = id => document.getElementById(id), weapons = window.GalaWeapons;
const progress = {activeDays: 365, totalXp: 36500, strength: 75};
// Review-only progress and cooldown: never read or write account/localStorage.
const cooldown = new AbilityCooldown();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const canvas = $('scene'), ctx = canvas.getContext('2d');
const comparison = [...document.querySelectorAll('.comparison canvas')];
let selected = {type: 'rapier', tier: 4}, action = null, autoplay = false;
let frame = 0, lastFrame = 0, lastAuto = 0, cooling = false;

for (const weapon of weapons.types) {
  const button = document.createElement('button');
  button.textContent = weapon.name; button.dataset.type = weapon.id;
  button.setAttribute('aria-pressed', String(weapon.id === selected.type));
  button.addEventListener('click', () => { selected = {...selected, type: weapon.id}; action = null; update(); });
  $('families').append(button);
}

function update() {
  const profile = evolution(selected), ability = profile.ability, required = weapons.requirements(selected);
  document.documentElement.style.setProperty('--accent', profile.energy);
  $('weaponName').textContent = weapons.types.find(w => w.id === selected.type).name;
  $('tierLabel').textContent = weapons.tiers[selected.tier];
  $('tierNumber').textContent = `${selected.tier} / 20`;
  $('tierOutput').value = selected.tier;
  $('previousLabel').textContent = `${weapons.tiers[Math.max(0, selected.tier - 1)]} · tier ${Math.max(0, selected.tier - 1)}`;
  $('currentLabel').textContent = `${weapons.tiers[selected.tier]} · tier ${selected.tier}`;
  $('unlock').textContent = selected.tier ? `${required.days} workout days · strength ${required.strength}` : 'Available from the start';
  $('abilityInfo').textContent = ability ? `Rank ${ability.rank} · ${ability.cooldownMs / 1000}s cooldown` : 'Special unlocks at tier 4';
  for (const button of $('families').children) button.setAttribute('aria-pressed', String(button.dataset.type === selected.type));
  updateCooldown();
}

function attack(special = false) {
  if(!special&&action?.special&&performance.now()-action.startedAt<(abilityFor(selected)?.animationMs||0))return;
  if (special) {
    const result = cooldown.activate(selected, {progress, inRest: true, catalog: weapons});
    if (!result.ok) return;
    $('status').textContent = result.ability.name;
    cooling = true;
  }
  action = {startedAt: performance.now(), special};
  lastAuto = performance.now();
}

function updateCooldown() {
  const ability = abilityFor(selected), remaining = cooldown.remaining();
  $('attack').disabled=!!(action?.special&&performance.now()-action.startedAt<(ability?.animationMs||0));
  $('special').disabled = !ability || remaining > 0;
  $('special').textContent = !ability ? 'Unlocks at tier 4' : remaining ? `${ability.name} · ${(remaining / 1000).toFixed(1)}s` : `${ability.name} · Ready`;
  // A shared clock may belong to another weapon, so its progress is measured
  // against the last activated duration rather than the selected tier's timer.
  const duration = cooldown.durationMs;
  $('cooldown').value = remaining ? Math.max(0, 1 - remaining / Math.max(1, duration)) : 1;
  $('cooldown').setAttribute('aria-label', remaining ? 'Special ability cooling down' : 'Special ability ready');
  if (cooling && remaining === 0) { cooling = false; $('status').textContent = 'Special ready'; }
}
$('attack').addEventListener('click', () => attack());
$('special').addEventListener('click', () => attack(true));
$('tier').addEventListener('input', event => { selected = {...selected, tier: Number(event.target.value)}; action = null; update(); });
$('autoplay').addEventListener('click', () => { autoplay = !autoplay; $('autoplay').setAttribute('aria-pressed', String(autoplay)); if (autoplay) attack(); });

function platform(context, width, height) {
  context.clearRect(0, 0, width, height); context.imageSmoothingEnabled = false;
  const x = width * .29, y = height * .79, half = width * .23;
  context.fillStyle = '#0b152c'; context.beginPath(); context.moveTo(x-half,y); context.lineTo(x+half,y); context.lineTo(x+half*.67,y+height*.08); context.lineTo(x-half*.55,y+height*.09); context.fill();
  context.fillStyle = '#384a69'; context.fillRect(x-half,y-4,half*2,5);
  context.fillStyle = '#78dbc4'; context.fillRect(x-half*.6,y+4,half*1.2,2);
  context.fillStyle = '#a7d6e1'; context.globalAlpha = .35;
  for(let k=0;k<13;k++) context.fillRect((k*59+23)%width,(k*31+19)%(height*.7),1,1);
  context.globalAlpha = 1;
}

function render(now) {
  frame = 0;
  if (document.hidden) return;
  if (now - lastFrame > (reduced.matches ? 100 : 32)) {
    lastFrame = now;
    if (autoplay && now - lastAuto > 2300) attack();
    platform(ctx, canvas.width, canvas.height);
    drawAnimatedWeapon(ctx, selected, {weapons, x: 185, y: 190, scale: 1.45, now, action, reducedMotion: reduced.matches});
    const tiers = [0, Math.max(0, selected.tier - 1), selected.tier];
    comparison.forEach((card, index) => {
      const context = card.getContext('2d'); platform(context, card.width, card.height);
      drawAnimatedWeapon(context, {...selected, tier: tiers[index]}, {weapons, x: 92, y: 88, scale: .65, now, action, reducedMotion: reduced.matches});
    });
    updateCooldown();
  }
  frame = requestAnimationFrame(render);
}

function motionPreference() { $('motionNote').hidden = !reduced.matches; }
const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (!frame) frame = requestAnimationFrame(render); };
document.addEventListener('visibilitychange', visibility);
reduced.addEventListener('change', motionPreference);
window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', motionPreference); });
update(); motionPreference(); frame = requestAnimationFrame(render);
