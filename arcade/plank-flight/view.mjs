import * as THREE from 'three';
import { themeFor } from '../runner/themes.mjs';
import { releaseGraphics } from '../../modules/graphics-lifecycle.mjs';

const STYLE_ID = 'plank-flight-style';
const SEGMENT_LENGTH = 12;
const SEGMENT_COUNT = 9;
const OBJECT_LIMIT = 52;
const finite = (n, fallback = 0) => Number.isFinite(+n) ? +n : fallback;
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const title = value => String(value ?? '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const ownedIds = frame => (Array.isArray(frame?.profile?.owned) ? frame.profile.owned : Array.isArray(frame?.inventory) ? frame.inventory : [])
  .map(v => typeof v === 'string' ? v : v?.id).filter(Boolean);

function ensureStylesheet() {
  if (document.getElementById(STYLE_ID)) return null;
  const link = document.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = new URL('./flight.css', import.meta.url).href;
  document.head.append(link);
  return link;
}

function tileTexture(THREE, theme) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, theme.wall.from);
  grad.addColorStop(1, theme.wall.to);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,.12)';
  g.lineWidth = 2;
  g.strokeRect(5, 5, 246, 246);
  g.strokeStyle = 'rgba(0,0,0,.48)';
  g.lineWidth = 5;
  g.strokeRect(1, 1, 254, 254);
  if (theme.wall.style === 'hex') {
    g.strokeStyle = 'rgba(0,0,0,.32)';
    g.lineWidth = 2;
    for (let y = -24; y < 300; y += 42) for (let x = -24; x < 300; x += 48) {
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * 25, y + Math.sin(a) * 25);
      }
      g.closePath(); g.stroke();
    }
  } else {
    for (const y of [32, 128, 224]) {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y, 256, 4);
      g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, y + 4, 256, 2);
    }
    for (const [x, y] of [[18, 18], [238, 18], [18, 238], [238, 238]]) {
      g.fillStyle = '#17131d'; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.48)'; g.beginPath(); g.arc(x - 1, y - 1, 2, 0, Math.PI * 2); g.fill();
    }
    if (theme.wall.style === 'rust') {
      for (let i = 0; i < 22; i++) {
        g.fillStyle = `rgba(180,74,24,${.08 + (i % 4) * .025})`;
        g.beginPath(); g.ellipse((i * 71) % 256, (i * 43) % 256, 10 + (i % 5) * 4, 3 + (i % 3) * 3, i, 0, Math.PI * 2); g.fill();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 2;
  return texture;
}

function buildDom(host, onAction) {
  const root = document.createElement('div');
  root.className = 'plank-flight';
  root.setAttribute('aria-label', 'Plank Flight workout game');
  const canvas = document.createElement('canvas');
  canvas.className = 'pf-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const fallback = document.createElement('canvas');
  fallback.className = 'pf-fallback-canvas';
  fallback.setAttribute('aria-hidden', 'true');
  const hud = document.createElement('div');
  hud.className = 'pf-hud';
  hud.innerHTML = `
    <header class="pf-topbar">
      <div class="pf-brand"><span class="pf-brand-mark" aria-hidden="true">✦</span><span>PLANK FLIGHT</span></div>
      <div class="pf-top-actions"><button type="button" class="pf-icon-button" data-act="recalibrate" aria-label="Recheck your form" title="Recheck form">↻</button><button type="button" class="pf-icon-button" data-act="pause" aria-label="Pause flight" title="Pause">Ⅱ</button><button type="button" class="pf-icon-button" data-act="exit" aria-label="Exit and turn camera off" title="Exit">×</button></div>
    </header>
    <div class="pf-stats" aria-label="Flight status">
      <div class="pf-stat"><span>Distance</span><strong data-distance>0 m</strong></div>
      <div class="pf-stat"><span>Flight coins</span><strong data-run-coins>0</strong></div>
      <div class="pf-stat" aria-label="Device-only coin balance"><span>Device-only</span><strong data-bank-coins>0</strong></div>
      <div class="pf-stat pf-protection"><span>Shield</span><strong data-shield>Ready</strong></div>
      <div class="pf-stat"><span>Rank stars</span><strong data-stars>0</strong></div>
    </div>
    <section class="pf-pace" data-pace hidden aria-label="Posture timing" aria-live="polite" aria-atomic="true">
      <div class="pf-pace-current"><span class="pf-pace-eyebrow">NOW</span><strong data-pace-current></strong><small data-pace-credit></small></div>
      <div class="pf-pace-time"><strong data-pace-remaining>0</strong><span>SEC</span></div>
      <div class="pf-pace-next"><span class="pf-pace-eyebrow">NEXT</span><strong data-pace-next></strong></div>
    </section>
    <div class="pf-live-mission" data-mission hidden></div>
    <div class="pf-fold-preview" data-fold-preview hidden role="status" aria-live="polite" aria-atomic="true"><i aria-hidden="true"></i><span>Next spot</span></div>
    <div class="pf-notice" data-notice aria-hidden="true" hidden></div>
    <span class="pf-sr" data-announcement role="status" aria-live="polite" aria-atomic="true"></span>
    <div class="pf-aim" aria-hidden="true"><i></i><b></b></div>
    <div class="pf-bottomline"><div class="pf-vehicle" data-vehicle></div><div class="pf-vehicle-hint" data-vehicle-hint hidden></div><div class="pf-powerup" data-powerup></div><div class="pf-effect" data-effects aria-live="polite"></div><button type="button" class="pf-menu-button" data-act="menu">MENU</button></div>
    <div class="pf-message" data-message role="status" aria-live="polite"></div>
    <section class="pf-panel" data-panel hidden aria-label="Flight menu"></section>
  `;
  root.append(canvas, fallback, hud);
  host.classList.add('plank-flight-host');
  host.prepend(root);
  const panel = hud.querySelector('[data-panel]');
  let panelName = 'welcome';
  let latest = {};
  let currentRun = {};
  const action = (name, payload) => onAction(name, payload);
  const renderPanel = (name, frame = latest, run = {}) => {
    panelName = name;
    const pose = frame.pose ?? {};
    const prompt = frame.message || pose.prompt || 'Bring your shoulders, elbows and wrists into view. Keep a comfortable plank and follow the simple prompts.';
    const profile = frame.profile ?? {};
    const missions = Array.isArray(run.missions) ? run.missions : [];
    const items = Array.isArray(frame.shopItems) ? frame.shopItems : [];
    const inventory = Array.isArray(frame.inventory) ? frame.inventory : [];
    const owned = Array.isArray(profile.owned) ? profile.owned : inventory.map(v => typeof v === 'string' ? v : v?.id).filter(Boolean);
    const loadout = Array.isArray(frame.loadout) ? frame.loadout : Array.isArray(profile.loadout) ? profile.loadout : [];
    const listButton = (item, actionName, extra = '') => {
      const id = item?.id ?? item?.key;
      if (!id) return '';
      const label = item.name ?? item.title ?? title(id);
      const detail = item.description ?? item.summary ?? '';
      const cost = item.cost ?? item.price ?? item.coins;
      const selection = ['vehicle', 'cosmetic'].includes(item.kind);
      const readyLabel = actionName === 'buy' ? `Get${cost != null ? ` · ${cost}` : ''}` : selection ? 'Select' : 'Equip';
      return `<article class="pf-list-card"><div><strong>${esc(label)}</strong><small>${esc(detail || (cost != null ? `${cost} device-only coins` : 'Ready to equip'))}</small></div><button type="button" data-act="${actionName}" data-id="${esc(id)}" data-kind="${esc(item.kind ?? '')}" data-ready-label="${esc(readyLabel)}" ${extra}>${esc(readyLabel)}</button></article>`;
    };
    let content = '';
    if (name === 'welcome') content = `<div class="pf-panel-icon" aria-hidden="true">✦</div><p class="pf-eyebrow">A MYR5 ARCADE FLIGHT</p><h1>Find your line.</h1><p data-prompt-text>${esc(prompt)}</p><div class="pf-howto"><span><b>↑</b> A higher, comfortable plank lifts your path</span><span><b>↔</b> Shift gently left or right to steer</span><span><b>◎</b> Follow the rings; leave room around hazards</span></div><p class="pf-smallprint">Coins are device-only and separate from exercise progress.</p>${run.phase === 'ready' && !run.headstartUsed ? '<button class="pf-secondary" type="button" data-act="headstart">Use a head start</button>' : ''}<button class="pf-primary" type="button" data-act="start">Begin flight</button><button class="pf-secondary" type="button" data-act="recalibrate">Recheck form</button>`;
    else if (name === 'pause') content = `<p class="pf-eyebrow">SAFE BAY</p><h2>Take your time.</h2><p data-prompt-text>${esc(frame.message || 'Your flight and exercise progress are paused together.')}</p><button class="pf-primary" type="button" data-act="resume">Continue</button><button class="pf-secondary" type="button" data-act="menu-shop">Visit the shop</button><button class="pf-secondary" type="button" data-act="menu-loadout">Choose equipment</button><button class="pf-secondary" type="button" data-act="finish">Finish this flight</button><button class="pf-link" type="button" data-act="recalibrate">Recheck form</button>`;
    else if (name === 'crashed') content = `<p class="pf-eyebrow">FLIGHT PAUSED</p><h2>Catch your breath.</h2><p>Your exercise progress is kept. Continue when you feel ready.</p><button class="pf-primary" type="button" data-act="revive">Continue safely</button>${run.phase === 'crashed' && !run.finalBlastUsed ? '<button class="pf-secondary" type="button" data-act="final-blast">One last burst</button>' : ''}<button class="pf-link" type="button" data-act="finish">See results</button>`;
    else if (name === 'results') content = `<p class="pf-eyebrow">FLIGHT COMPLETE</p><h2>Nice steady work.</h2><div class="pf-result-grid"><div><strong>${Math.floor(finite(run.distance))} m</strong><small>Distance</small></div><div><strong>${Math.floor(finite(run.coins))}</strong><small>Flight coins</small></div><div><strong>${Math.floor(finite(profile.stars))}</strong><small>Stars</small></div><div><strong>${Math.floor(finite(profile.bestDistance))} m</strong><small>Best flight</small></div></div><p class="pf-smallprint">Coins stay in this device wallet. Device balance: <b data-wallet-value>${Math.floor(finite(profile.balance))}</b>. Exercise progress is tracked separately.</p>${missions.length ? `<div class="pf-missions">${missions.slice(0, 3).map(m => `<div>${esc(m.label ?? m.name ?? title(m.id))}<span>${m.complete || m.done ? 'Complete' : `${Math.floor(finite(m.progress))}${m.target ? ` / ${esc(m.target)}` : ''}`}</span></div>`).join('')}</div>` : ''}${finite(profile.tokens) > 0 ? `<button class="pf-primary" type="button" data-act="spin">Open your reward · ${Math.floor(finite(profile.tokens))}</button>` : ''}<button class="pf-secondary" type="button" data-act="menu-shop">Visit the shop</button><button class="pf-secondary" type="button" data-act="menu-loadout">Choose equipment</button><button class="pf-secondary" type="button" data-act="new-run">Fly another route</button><button class="pf-secondary" type="button" data-act="exit">Finish workout</button>`;
    else if (name === 'shop') content = `<p class="pf-eyebrow">DEVICE WALLET · NOT FITNESS XP</p><h2>Flight shop</h2><p>Choose small upgrades and looks for future flights. Purchases use device-only coins. Balance: <b data-wallet-value>${Math.floor(finite(profile.balance))}</b></p><div class="pf-list">${items.length ? items.map(i => listButton(i, 'buy')).join('') : '<p class="pf-empty">The shop will appear here when items are available.</p>'}</div><button class="pf-secondary" type="button" data-act="event">Try a themed route</button><button class="pf-link" type="button" data-act="back">Back</button>`;
    else if (name === 'loadout') {
      const equipped = new Set([...loadout.map(v => typeof v === 'string' ? v : v?.id), profile.selectedVehicle, profile.selectedCosmetic].filter(Boolean));
      const itemsOwned = owned.map(v => typeof v === 'string' ? items.find(i => i.id === v) ?? { id: v } : v)
        .filter(i => i && (i.equipable !== false || ['vehicle', 'cosmetic'].includes(i.kind)));
      content = `<p class="pf-eyebrow">YOUR FLIGHT SETUP</p><h2>Choose equipment</h2><p>Your choices affect the game route only.</p><div class="pf-list">${itemsOwned.length ? itemsOwned.map(i => listButton(i, 'equip', equipped.has(i.id) ? 'aria-pressed="true"' : '')).join('') : '<p class="pf-empty">Equipment you own will appear here.</p>'}</div><button class="pf-link" type="button" data-act="back">Back</button>`;
    }
    if(name==='welcome')content+='<button class="pf-link" type="button" data-act="exit">End workout and turn camera off</button>';
    if(['pause','results'].includes(name))content+='<p class="pf-smallprint" data-progression></p>';
    panel.innerHTML = `<div class="pf-panel-scroll"><button type="button" class="pf-close" data-act="close-panel" aria-label="Close menu">×</button>${content}</div>`;
    panel.hidden = false;
    panel.dataset.view = name;
    panel.querySelectorAll('[data-act]').forEach(button => button.addEventListener('click', () => {
      const act = button.dataset.act;
      if (act === 'menu-shop') { action('pause', { reason: 'menu' }); renderPanel('shop', latest, run); return; }
      if (act === 'menu-loadout') { action('pause', { reason: 'menu' }); renderPanel('loadout', latest, run); return; }
      if (act === 'back') { renderPanel(run.phase === 'finalized' ? 'results' : 'pause', latest, run); return; }
      if (act === 'close-panel') { if(panelName==='welcome')panelName='calibration';panel.hidden = true; return; }
      if (act === 'menu') { action('pause', { reason: 'menu' }); renderPanel('pause', latest, run); return; }
      if (act === 'start') { panelName='calibration';panel.hidden=true;action('start');return; }
      if (act === 'resume') { panel.hidden = true; action('resume'); return; }
      if (act === 'revive') { panel.hidden = true; action('revive'); return; }
      if (act === 'finish') { action('finish'); return; }
      if (act === 'recalibrate') { action('recalibrate');panelName='calibration';panel.hidden=true;return; }
      if (act === 'buy' || act === 'equip') { action(act, { id: button.dataset.id }); return; }
      if (act === 'event') { action('event', { enabled: true }); panel.hidden = true; return; }
      if (act === 'spin' || act === 'headstart' || act === 'final-blast') { action(act); return; }
      if (act === 'exit' || act === 'new-run') { action(act); return; }
      if (act === 'pause') { action('pause'); renderPanel('pause', latest, run); return; }
    }));
  };
  hud.addEventListener('click', event => {
    const button = event.target.closest('[data-act]');
    if (!button || panel.contains(button)) return;
    const act = button.dataset.act;
    if (act === 'pause' || act === 'menu') { action('pause', { reason: 'user' }); renderPanel('pause', latest, currentRun); }
    if (act === 'recalibrate') { action('recalibrate');panelName='calibration';panel.hidden=true; }
    if (act === 'resume') { action('resume'); panel.hidden = true; }
    if (act === 'exit') action('exit');
  });
  const ui = {
    root, canvas, fallback, hud, panel, renderPanel,
    update(frame, run) {
      latest = frame;
      currentRun = run;
      const pose = frame.pose ?? {};
      const notice = hud.querySelector('[data-notice]');
      const message = frame.message || pose.prompt || '';
      const bad = !pose.controlValid || frame.paused;
      host.classList.toggle('plank-flight-calibrating',!pose.calibrated&&['ready','paused'].includes(run.phase));
      notice.hidden = !bad;
      notice.textContent = message || (frame.paused ? 'Paused safely' : 'Move into view');
      hud.querySelector('[data-message]').textContent = bad ? '' : (message || (pose.exerciseEligible ? 'Your position is in view' : 'Find a comfortable plank position'));
      hud.querySelector('[data-distance]').textContent = `${Math.floor(finite(run.distance))} m`;
      hud.querySelector('[data-run-coins]').textContent = String(Math.floor(finite(run.coins)));
      const banked = Math.floor(finite(frame.coinsBanked ?? frame.profile?.balance));
      const pending = Math.floor(finite(frame.pendingCoins));
      hud.querySelector('[data-bank-coins]').textContent = `${banked}${pending > 0 ? ` · +${pending}` : ''}`;
      const wallet = panel.querySelectorAll('[data-wallet-value]');
      for (const target of wallet) if (target.textContent !== String(banked)) target.textContent = String(banked);
      if(panelName==='results'){
        const tokens=Math.max(0,Math.floor(finite(frame.profile?.tokens)));
        let reward=panel.querySelector('[data-act="spin"]');
        if(tokens&&!reward){reward=document.createElement('button');reward.type='button';reward.className='pf-primary';reward.dataset.act='spin';reward.addEventListener('click',()=>action('spin'));panel.querySelector('[data-act="menu-shop"]')?.before(reward);}
        if(reward){reward.hidden=!tokens;reward.textContent=`Open your reward · ${tokens}`;}
        const totals=panel.querySelectorAll('.pf-result-grid strong');
        if(totals[2])totals[2].textContent=String(Math.floor(finite(frame.profile?.stars)));
        if(totals[3])totals[3].textContent=`${Math.floor(finite(frame.profile?.bestDistance))} m`;
      }
      const pace = run.pace;
      const pacePanel = hud.querySelector('[data-pace]');
      const hasPace = pace && typeof pace === 'object' && (pace.kind || pace.label || Number.isFinite(+pace.remaining));
      pacePanel.hidden = !hasPace;
      if (hasPace) {
        const isRest = value => /rest|recover/i.test(String(value ?? ''));
        const cue = (kind, label) => isRest(kind) || isRest(label) ? 'CHEST DOWN · REST' : String(label || title(kind) || 'Steady plank').toLocaleUpperCase();
        const resting = isRest(pace.kind) || isRest(pace.label);
        const currentCue = cue(pace.kind, pace.label);
        const nextCue = cue(pace.nextKind, pace.nextLabel || 'Continue');
        pacePanel.querySelector('[data-pace-current]').textContent = currentCue;
        pacePanel.querySelector('[data-pace-next]').textContent = nextCue;
        pacePanel.querySelector('[data-pace-remaining]').textContent = String(Math.max(0, Math.ceil(finite(pace.remaining))));
        pacePanel.querySelector('[data-pace-credit]').textContent = resting ? 'Recovery · workout credit paused · flight continues' : (pace.transitioning ? 'Changing posture' : 'Hold a comfortable position');
        pacePanel.classList.toggle('is-rest', resting);
        pacePanel.classList.toggle('is-transitioning', !!pace.transitioning);
      }
      const promptTarget = panel.querySelector('[data-prompt-text]');
      const promptText = frame.message || pose.prompt || (panelName === 'pause' ? 'Your flight and exercise progress are paused together.' : 'Bring your shoulders, elbows and wrists into view. Keep a comfortable plank and follow the simple prompts.');
      if (promptTarget && promptTarget.textContent !== promptText) promptTarget.textContent = promptText;
      const shield = Math.max(0, finite(run.shield));
      hud.querySelector('[data-shield]').textContent = shield ? `${shield} layer${shield === 1 ? '' : 's'}` : 'None';
      hud.querySelector('[data-stars]').textContent = String(Math.floor(finite(frame.profile?.stars)));
      const vehicle = run.vehicle ?? frame.profile?.selectedVehicle;
      hud.querySelector('[data-vehicle]').textContent = vehicle ? `RIDE · ${title(vehicle.name ?? vehicle.id ?? vehicle)}` : '';
      const vehicleHint = hud.querySelector('[data-vehicle-hint]');
      const hintText = run.vehicle && typeof run.vehicleHint === 'string' ? run.vehicleHint : '';
      vehicleHint.hidden = !hintText;
      if (vehicleHint.textContent !== hintText) vehicleHint.textContent = hintText;
      const foldPreview = run.foldPreview;
      const foldMarker = hud.querySelector('[data-fold-preview]');
      const foldX = Number(foldPreview?.x), foldY = Number(foldPreview?.y);
      const hasFoldDestination = Number.isFinite(foldX) && Number.isFinite(foldY);
      foldMarker.hidden = !hasFoldDestination;
      if (hasFoldDestination) {
        const blocked = foldPreview.clear === false;
        foldMarker.classList.toggle('is-blocked', blocked);
        const foldLabel = foldMarker.querySelector('span');
        const foldText = blocked ? 'Wait for a clear path' : 'Next spot';
        if (foldLabel.textContent !== foldText) foldLabel.textContent = foldText;
        const width = root.clientWidth || 1, height = root.clientHeight || 1;
        const ahead = Math.max(2, finite(foldPreview.ahead, 8));
        const halfHeight = ahead * Math.tan(76 * Math.PI / 360);
        const left = width / 2 + (foldX - finite(run.x)) * 2.12 * height / (2 * halfHeight);
        const top = height / 2 - (foldY - finite(run.y, .5)) * 3.35 * height / (2 * halfHeight);
        foldMarker.style.left = `${left}px`;
        foldMarker.style.top = `${top}px`;
      }
      hud.querySelector('[data-powerup]').textContent = run.powerup ? `ACTIVE · ${title(run.powerup.name ?? run.powerup.id ?? run.powerup)}` : '';
      const effects = run.effects ?? {};
      const marks = [];
      if (finite(effects.coinPreview) > 0) marks.push('ROUTE LANTERN: EARLY COINS');
      if (finite(effects.warningLead) > 0) marks.push('SIGNAL: EARLY WARNINGS');
      if (finite(effects.magnetRadius) > 0) marks.push('ORBIT MAGNET: PULL');
      if (run.powerup?.effect?.visualRush) marks.push('AFTERBURN: ACTIVE');
      const effectsTarget = hud.querySelector('[data-effects]');
      const effectText = marks.join('  /  ');
      if (effectsTarget.textContent !== effectText) effectsTarget.textContent = effectText;
      const profile = frame.profile ?? {};
      const objectives = Array.isArray(run.missions) ? run.missions : [];
      const objective = objectives.find(m => !m.complete && !m.done) ?? null;
      const mission = hud.querySelector('[data-mission]');
      const upgradesValue = profile.upgrades ?? profile.ownedUpgrades ?? [];
      const upgrades = Array.isArray(upgradesValue) ? upgradesValue : Object.keys(upgradesValue ?? {});
      const upgradesText = upgrades.length ? ` · UPGRADES ${upgrades.length}` : '';
      const rank = Math.max(1, Math.floor(finite(profile.rank, 1)));
      const prestige = Math.max(0, Math.floor(finite(profile.prestige)));
      const rankStars = Math.max(0, Math.floor(finite(profile.rankStarsProgress)));
      const achievementNames = Array.isArray(profile.achievements) ? profile.achievements.map(title) : [];
      const achievementText = achievementNames.length ? achievementNames.join(', ') : '0';
      const daily = profile.dailyComponents ?? {};
      const dailyText = `${Math.max(0, Math.floor(finite(daily.progress)))}/5 · ${Math.max(0, Math.floor(finite(daily.totalDays)))} days · ${Math.max(0, Math.floor(finite(daily.rewards)))} rewards`;
      const missionStars = objectives.filter(m => m.complete || m.done).reduce((total,m)=>total+finite(m.stars,1),0);
      const rankText = `RANK ${rank} · ${rankStars}/3 STARS${upgradesText}`;
      const progression=panel.querySelector('[data-progression]');
      if(progression)progression.textContent=`Rank ${rank} · Prestige ${prestige} · Flight mission stars ${missionStars}. Achievements: ${achievementText}. Component days: ${dailyText}. Original MYR5 reward: 100 device coins every five qualifying days; consecutive days are not required.`;
      const eventText = run.event ? ` · EVENT TRACK ${Math.floor(finite(run.eventRewardProgress))}/${Math.floor(finite(run.eventRewardTarget,3))}${run.eventRewardClaimed ? ' · CACHE EARNED' : ' · 15 COIN CACHE'}` : '';
      mission.hidden = false;
      mission.textContent = `${rankText}${objective ? ` · GOAL ${objective.label ?? objective.name ?? title(objective.id)}${objective.target != null ? ` ${finite(objective.progress).toFixed(1)}/${objective.target}` : ''}` : ''}${eventText}`;
      if (run.phase === 'crashed' && (panel.hidden || panelName !== 'crashed')) renderPanel('crashed', frame, run);
      else if (run.phase === 'finalized' && (panel.hidden || !['results', 'shop', 'loadout'].includes(panelName))) renderPanel('results', frame, run);
      else if (run.phase === 'ready' && panel.hidden && panelName === 'welcome') renderPanel('welcome', frame, run);
      else if (run.phase === 'paused' && panel.hidden && panelName!=='calibration') renderPanel('pause', frame, run);
      else if (run.phase === 'flying' && !frame.paused && ['welcome', 'pause', 'crashed'].includes(panelName)) panel.hidden = true;
      const buyButtons = panel.querySelectorAll('[data-act="buy"]');
      for (const button of buyButtons) {
        const item = Array.isArray(frame.shopItems) ? frame.shopItems.find(v => v.id === button.dataset.id) : null;
        const cost = item?.cost ?? item?.price ?? item?.coins;
        const upgradeLevel = finite(item?.currentLevel, finite(frame.profile?.upgrades?.[button.dataset.id]));
        const upgradeCap = finite(item?.maxLevel, Infinity);
        const isUpgrade = item?.kind === 'upgrade' || button.dataset.kind === 'upgrade';
        const isOwned = isUpgrade ? upgradeLevel >= upgradeCap : ownedIds(frame).includes(button.dataset.id);
        if (cost != null) button.dataset.readyLabel = `Get · ${cost}`;
        if (button.disabled !== isOwned) button.disabled = isOwned;
        const label = isOwned ? (isUpgrade ? 'Max level' : 'Owned') : button.dataset.readyLabel;
        if (button.textContent !== label) button.textContent = label;
        const description = item?.description ?? item?.summary ?? (isUpgrade ? `Level ${upgradeLevel} of ${upgradeCap}` : cost != null ? `${cost} device-only coins` : 'Ready to equip');
        const detail = button.closest('.pf-list-card')?.querySelector('small');
        if (detail && detail.textContent !== description) detail.textContent = description;
      }
      for (const button of panel.querySelectorAll('[data-act="headstart"]')) {
        const used = Boolean(run.headstartUsed) || run.phase !== 'ready';
        button.disabled = used;
        if (used && button.textContent !== 'Used') button.textContent = 'Used';
      }
      for (const button of panel.querySelectorAll('[data-act="final-blast"]')) {
        const used = Boolean(run.finalBlastUsed) || run.phase !== 'crashed';
        button.disabled = used;
        if (used && button.textContent !== 'Used') button.textContent = 'Used';
      }
      const slots = profile.gadgetSlots && typeof profile.gadgetSlots === 'object' ? (Array.isArray(profile.gadgetSlots) ? profile.gadgetSlots : Object.values(profile.gadgetSlots)) : [];
      const equippedIds = new Set([
        ...(Array.isArray(frame.loadout) ? frame.loadout : Array.isArray(profile.loadout) ? profile.loadout : []).map(v => typeof v === 'string' ? v : v?.id),
        ...slots.map(v => typeof v === 'string' ? v : v?.id), profile.selectedVehicle, profile.selectedCosmetic
      ].filter(Boolean));
      for (const button of panel.querySelectorAll('[data-act="equip"]')) {
        const equipped = equippedIds.has(button.dataset.id);
        if (button.getAttribute('aria-pressed') !== String(equipped)) button.setAttribute('aria-pressed', String(equipped));
        const selected = ['vehicle', 'cosmetic'].includes(button.dataset.kind);
        const label = equipped ? (selected ? 'Selected' : 'Equipped') : button.dataset.readyLabel;
        if (button.textContent !== label) button.textContent = label;
      }
      return { panelName };
    },
    setTheme(theme) {
      root.style.setProperty('--pf-accent', theme.neon.rail);
      root.style.setProperty('--pf-warm', theme.neon.warm);
      root.style.setProperty('--pf-alert', theme.neon.emergency);
      root.style.setProperty('--pf-bg', theme.bg);
      root.style.setProperty('--pf-fog', theme.fog);
      root.dataset.theme = theme.name;
    },
    dispose() { root.remove(); host.classList.remove('plank-flight-host','plank-flight-calibrating'); }
  };
  panel.hidden = true;
  return ui;
}

function makeScene(THREE, theme) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.bg);
  scene.fog = new THREE.Fog(theme.fog, 18, 88);
  const camera = new THREE.PerspectiveCamera(76, 1, .08, 130);
  const hemi = new THREE.HemisphereLight(theme.hemi[0], theme.hemi[1], 1.15);
  const key = new THREE.PointLight(theme.light, 18, 28, 1.7); key.position.set(0, 4.3, -13);
  const fill = new THREE.PointLight(theme.neon.rail, 8, 18, 1.8); fill.position.set(0, 1.2, -22);
  scene.add(hemi, key, fill);
  const wallMap = tileTexture(THREE, theme);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallMap, color: theme.wall.tint, roughness: .62, metalness: theme.wall.metalness, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: theme.wall.to, roughness: .48, metalness: .72, side: THREE.DoubleSide });
  const railMat = new THREE.MeshBasicMaterial({ color: theme.neon.rail, toneMapped: false });
  const glassMat = new THREE.MeshBasicMaterial({ color: theme.sky?.colors?.[0] ?? '#21456d', transparent: true, opacity: .38, toneMapped: false, side: THREE.DoubleSide });
  const glowMat = new THREE.MeshBasicMaterial({ color: theme.neon.warm, toneMapped: false });
  const sharedGeo = { wall: new THREE.BoxGeometry(5.6, .14, SEGMENT_LENGTH), floor: new THREE.BoxGeometry(5.6, .16, SEGMENT_LENGTH), side: new THREE.BoxGeometry(.14, 4.5, SEGMENT_LENGTH), rail: new THREE.BoxGeometry(.07, .08, SEGMENT_LENGTH), window: new THREE.BoxGeometry(.025, 1.15, 3.1), lamp: new THREE.BoxGeometry(1.1, .035, .55), rush: new THREE.BoxGeometry(.035, .04, 2.1) };
  sharedGeo.windowFrame = new THREE.BoxGeometry(.07, 1.24, .07);
  const corridor = [];
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const group = new THREE.Group();
    const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m; };
    mesh(sharedGeo.floor, floorMat, 0, -.08, 0);
    mesh(sharedGeo.wall, wallMat, 0, 4.62, 0);
    mesh(sharedGeo.side, wallMat, -2.82, 2.25, 0);
    mesh(sharedGeo.side, wallMat, 2.82, 2.25, 0);
    for (const x of [-2.55, 2.55]) mesh(sharedGeo.rail, railMat, x, .16, 0);
    mesh(sharedGeo.lamp, glowMat, 0, 4.47, 0);
    if (i % 3 === 1) for (const side of [-1, 1]) {
      mesh(sharedGeo.window, glassMat, side * 2.735, 2.45, 0);
      mesh(sharedGeo.windowFrame, railMat, side * 2.68, 2.45, -1.58);
      mesh(sharedGeo.windowFrame, railMat, side * 2.68, 2.45, 1.58);
    }
    scene.add(group); corridor.push(group);
  }
  const mats = {
    coin: new THREE.MeshBasicMaterial({ color: '#ffe275', toneMapped: false }),
    zapper: new THREE.MeshBasicMaterial({ color: '#ffbd45', transparent: true, opacity: .78, toneMapped: false, side: THREE.DoubleSide }),
    coinPreview: new THREE.MeshBasicMaterial({ color: '#baf7ff', transparent: true, opacity: .55, toneMapped: false, side: THREE.DoubleSide }),
    rush: new THREE.MeshBasicMaterial({ color: theme.neon.warm, transparent: true, opacity: .32, toneMapped: false, side: THREE.DoubleSide }),
    laser: new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: .82, toneMapped: false, side: THREE.DoubleSide }),
    missile: new THREE.MeshBasicMaterial({ color: theme.neon.emergency, toneMapped: false }),
    vehicle: new THREE.MeshStandardMaterial({ color: theme.neon.rail, emissive: theme.neon.rail, emissiveIntensity: .5, metalness: .6, roughness: .28 }),
    powerup: new THREE.MeshBasicMaterial({ color: '#61fff0', toneMapped: false }),
    component: new THREE.MeshBasicMaterial({ color: '#d6b1ff', toneMapped: false }),
    token: new THREE.MeshBasicMaterial({ color: '#ffd45b', toneMapped: false }),
    npc: new THREE.MeshStandardMaterial({ color: '#d2a9ff', emissive: '#482e78', emissiveIntensity: .5 }),
    detail: new THREE.MeshBasicMaterial({ color: theme.neon.warm, wireframe: true, toneMapped: false })
  };
  const geos = {
    coin: new THREE.TorusGeometry(.34, .1, 6, 18), zapper: new THREE.BoxGeometry(1, 1, .14), laser: new THREE.BoxGeometry(1, 1, .12),
    missile: new THREE.ConeGeometry(.3, .75, 6), vehicle: new THREE.OctahedronGeometry(.53, 1), powerup: new THREE.DodecahedronGeometry(.42, 0),
    component: new THREE.TorusGeometry(.4, .1, 6, 16), token: new THREE.CylinderGeometry(.32, .32, .08, 12), npc: new THREE.IcosahedronGeometry(.43, 1)
  };
  const detailGeo = new THREE.TorusGeometry(.62, .035, 4, 20);
  const objectSlots = [];
  for (let i = 0; i < OBJECT_LIMIT; i++) {
    const group = new THREE.Group();
    const main = new THREE.Mesh(geos.coin, mats.coin);
    const detail = new THREE.Mesh(detailGeo, mats.detail);
    group.add(main, detail); group.visible = false; scene.add(group);
    objectSlots.push({ group, main, detail });
  }
  const aperture = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.1, 32), new THREE.MeshBasicMaterial({ color: theme.neon.rail, transparent: true, opacity: .7, toneMapped: false, side: THREE.DoubleSide }));
  aperture.position.set(0, 2.1, -4.2); scene.add(aperture);
  const exhaust = new THREE.Group();
  const exhaustGeo = new THREE.CylinderGeometry(.045, .15, 1.25, 7).rotateX(Math.PI / 2);
  const exhaustMat = new THREE.MeshBasicMaterial({ color: theme.neon.amber, transparent: true, opacity: .8, toneMapped: false });
  for (const x of [-.34, .34]) { const jet = new THREE.Mesh(exhaustGeo, exhaustMat); jet.position.x = x; exhaust.add(jet); }
  exhaust.visible = false; scene.add(exhaust);
  const rush = new THREE.Group();
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const streak = new THREE.Mesh(sharedGeo.rush, mats.rush);
    streak.position.set(side * (2.15 + (i % 2) * .18), (i - 1.5) * .58, -5 - i * 3.1);
    streak.rotation.z = side * .035;
    rush.add(streak);
  }
  rush.visible = false; scene.add(rush);
  return { scene, camera, hemi, key, fill, corridor, objectSlots, aperture, exhaust, exhaustGeo, exhaustMat, rush, mats, geos, detailGeo, sharedGeo, wallMat, floorMat, wallMap, railMat, glassMat, glowMat, theme };
}

function releaseScene(view) {
  if (!view) return;
  const { scene, mats, geos, detailGeo, sharedGeo, wallMat, floorMat, wallMap, railMat, glassMat, glowMat, aperture, exhaustGeo, exhaustMat } = view;
  scene.traverse(o => { if (o.isInstancedMesh) o.dispose?.(); });
  for (const mesh of [aperture]) { mesh.geometry.dispose(); mesh.material.dispose(); }
  for (const material of Object.values(mats)) material.dispose();
  for (const geometry of Object.values(geos)) geometry.dispose();
  detailGeo.dispose();
  for (const geometry of Object.values(sharedGeo)) geometry.dispose();
  exhaustGeo.dispose(); exhaustMat.dispose();
  for (const material of [wallMat, floorMat, railMat, glassMat, glowMat]) material.dispose();
  wallMap.dispose();
  scene.clear();
}

function drawFallback(ctx, canvas, run, theme, nearest, objects) {
  const w = canvas.width, h = canvas.height;
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, theme.bg); gradient.addColorStop(.56, theme.fog); gradient.addColorStop(1, '#080711');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * .48;
  ctx.strokeStyle = theme.neon.rail; ctx.lineWidth = Math.max(1, w / 420); ctx.globalAlpha = .7;
  ctx.beginPath();
  for (const x of [-1, 1]) { ctx.moveTo(cx, cy); ctx.lineTo(cx + x * w * .62, h * 1.05); }
  for (const y of [0, .22, .45, .7, 1]) { const yy = cy + (h - cy) * y; ctx.moveTo(cx - w * y * .62, yy); ctx.lineTo(cx + w * y * .62, yy); }
  ctx.stroke(); ctx.globalAlpha = 1;
  if (run.powerup?.effect?.visualRush && finite(run.time) < finite(run.powerup.until)) {
    ctx.strokeStyle = theme.neon.warm; ctx.lineWidth = Math.max(2, w / 180); ctx.globalAlpha = .55; ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const yy = h * (.24 + i * .12), inset = w * (.04 + i * .025);
      ctx.moveTo(inset, yy); ctx.lineTo(inset + w * .16, yy + h * .035);
      ctx.moveTo(w - inset, yy); ctx.lineTo(w - inset - w * .16, yy + h * .035);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  for (const o of objects) {
    const ahead = finite(o.z) - finite(run.distance);
    if (ahead <= .15 || ahead > 65) continue;
    const p = 13 / (13 + ahead), x = cx + (finite(o.x) - finite(run.x)) * w * .34 * p;
    const y = cy + (finite(run.y, .5) - finite(o.y, .5)) * h * .36 * p;
    const r = Math.max(3, w * .035 * p);
    const previewCoin = o.type === 'coin' && Number.isFinite(Number(o.revealAt)) && ahead > 3;
    const color = o.type === 'coin' ? (previewCoin ? '#baf7ff' : '#ffe275') : ['laser', 'zapper', 'missile'].includes(o.type) ? theme.neon.emergency : '#70fff0';
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(2, r * .2);
    if (o.type === 'laser' || o.type === 'zapper') { ctx.globalAlpha = o.type === 'laser' ? .68 : .48; ctx.fillRect(x - r * 2.3, y - r * 1.35, r * 4.6, r * 2.7); ctx.globalAlpha = 1; ctx.strokeRect(x - r * 2.3, y - r * 1.35, r * 4.6, r * 2.7); }
    else if (o.type === 'missile') { ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, Math.PI * 2); ctx.stroke(); ctx.fillText('!', x - r * .25, y + r * .35); }
    else { ctx.beginPath(); ctx.arc(x, y, r * (previewCoin ? .58 : 1), 0, Math.PI * 2); ctx.stroke(); }
  }
  if (nearest) {
    ctx.fillStyle = '#ff4e64'; ctx.font = `700 ${Math.max(12, w / 30)}px system-ui`;
    ctx.textAlign = 'center'; ctx.fillText(nearest, cx, h * .19);
  }
}

/** Mount a renderer-only view. Simulation and camera input remain owned by the caller. */
export function mountFlightView({ host, run, onAction = () => {}, sound = () => {} } = {}) {
  if (!host || !run) throw new TypeError('mountFlightView requires host and run');
  const stylesheet = ensureStylesheet();
  const ui = buildDom(host, onAction);
  const mediaReduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let renderer = null, view = null, fallbackCtx = ui.fallback.getContext('2d');
  let stopped = false, width = 0, height = 0, priorCoins = finite(run.coins), latestTheme = null, lost = false;
  let resizeObserver = null;
  let graphicsRelease = Promise.resolve();
  const setSize = () => {
    if (stopped) return;
    const rect = ui.root.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width || host.clientWidth || innerWidth));
    height = Math.max(1, Math.round(rect.height || host.clientHeight || innerHeight));
    if (renderer) {
      renderer.setPixelRatio(Math.min(1.25, window.devicePixelRatio || 1));
      renderer.setSize(width, height, false);
      if (view) { view.camera.aspect = width / height; view.camera.updateProjectionMatrix(); }
    }
    for (const canvas of [ui.canvas, ui.fallback]) { canvas.style.width = '100%'; canvas.style.height = '100%'; }
    ui.fallback.width = Math.min(1024, width);
    ui.fallback.height = Math.min(1600, Math.round(height * ui.fallback.width / width));
  };
  const releaseRenderer = () => {
    const owned = renderer;
    if (!owned) return graphicsRelease;
    renderer = null;
    let gl = null;
    try { gl = owned.getContext?.() ?? null; } catch {}
    graphicsRelease = releaseGraphics(ui.canvas, gl, () => {
      try { owned.dispose(); } catch {}
      try { owned.forceContextLoss?.(); } catch {}
    });
    return graphicsRelease;
  };
  const showFallback = reason => {
    lost = true; ui.root.classList.add('pf-fallback');
    ui.hud.querySelector('[data-notice]').hidden = false;
    ui.hud.querySelector('[data-notice]').textContent = 'Graphics unavailable. Exercise credit is paused; end this workout to save progress.';
    onAction('render-error', { reason: String(reason?.message ?? reason ?? 'WebGL unavailable') });
    if (renderer) releaseRenderer();
    view && releaseScene(view); view = null;
    setSize();
  };
  try {
    renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: false, alpha: false, powerPreference: 'low-power', stencil: false, depth: true, failIfMajorPerformanceCaveat: false });
    renderer.setPixelRatio(Math.min(1.25, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    setSize();
    view = makeScene(THREE, themeFor(0));
  } catch (error) { showFallback(error); }
  const onContextLost = event => { event.preventDefault(); showFallback('graphics context lost'); onAction('pause', { reason: 'graphics-lost' }); };
  ui.canvas.addEventListener('webglcontextlost', onContextLost, false);
  const onResize = () => setSize();
  window.addEventListener('resize', onResize, { passive: true });
  if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(onResize); resizeObserver.observe(ui.root); }
  const objects = [];
  let warningText = '', warningKey = '', warningCritical = false;
  const render = (frame = {}) => {
    if (stopped) return;
    try {
      ui.update(frame, run);
      const theme = themeFor(Math.max(0, Math.floor(finite(run.level))));
      if (theme !== latestTheme) {
        latestTheme = theme; ui.setTheme(theme);
        if (view && view.theme !== theme.name) { releaseScene(view); view = makeScene(THREE, theme); }
      }
      const speed = Math.max(.05, finite(run.speed, 1));
      const selected = frame.profile?.selectedCosmetic;
      const cosmetic = selected && typeof selected === 'object' ? selected : (Array.isArray(frame.shopItems) ? frame.shopItems.find(item => item.id === selected) : null);
      const rawTint = cosmetic?.tint ?? cosmetic?.color ?? cosmetic?.accent;
      const tint = typeof rawTint === 'object' ? rawTint.primary ?? rawTint.color : rawTint;
      let tintCss = '';
      if (typeof tint === 'string' && tint) { try { tintCss = `#${new THREE.Color(tint).getHexString()}`; } catch {} }
      if (tintCss) ui.root.style.setProperty('--pf-personal', tintCss);
      else ui.root.style.removeProperty('--pf-personal');
      if (view) {
        if (tintCss) { view.aperture.material.color.set(tintCss); view.exhaustMat.color.set(tintCss); }
        else { view.aperture.material.color.set(theme.neon.rail); view.exhaustMat.color.set(theme.neon.amber); }
      }
      objects.length = 0;
      const worldDistance = finite(run.distance);
      for (const object of Array.isArray(run.objects) ? run.objects : []) {
        const ahead = finite(object?.z) - worldDistance;
        const previewAt = finite(object?.revealAt, -Infinity);
        if (object && object.active !== false && object.collected !== true && ahead >= -.5 && ahead <= 76 && (object.type !== 'coin' || worldDistance >= previewAt)) objects.push(object);
      }
      const hazards = objects.filter(o => ['zapper', 'laser', 'missile'].includes(o.type)).map(o => ({ object: o, ahead: finite(o.z) - worldDistance })).filter(v => v.ahead > 0).sort((a, b) => a.ahead - b.ahead);
      const closest = hazards[0];
      let warning = '', label = '', ttc = 0;
      if (closest) {
        ttc = Math.max(0, closest.ahead / speed);
        const state = String(closest.object.state ?? closest.object.kind ?? '').toLowerCase();
        const laserState = String(closest.object.laserState ?? '').toLowerCase();
        label = closest.object.type === 'missile' ? (state.includes('lock') ? 'MISSILE LOCK' : state.includes('warn') ? 'MISSILE WARNING' : 'MISSILE ALERT') : closest.object.type === 'laser' ? (laserState === 'charging' ? 'LASER CHARGING' : laserState === 'active' ? 'LASER ACTIVE' : 'LASER AHEAD') : 'ENERGY FIELD';
        if (finite(run.effects?.warningLead) > 0) label = `SIGNAL · ${label}`;
        warning = `${label} · ${ttc.toFixed(1)}s`;
      }
      const notice = ui.hud.querySelector('[data-notice]');
      const pose = frame.pose ?? {};
      if (warning && closest.ahead < Math.max(3, speed * 2.8, finite(closest.object.warningLead)) && !frame.paused && pose.controlValid !== false) {
        const critical = closest.ahead < speed * 1.35;
        notice.hidden = false; notice.textContent = warning; notice.classList.toggle('is-critical', critical);
        warningText = warning;
        const nextWarningKey = String(closest.object.id ?? `${closest.object.type}:${closest.ahead < speed * 2 ? 'near' : 'approach'}`);
        if (nextWarningKey !== warningKey) {
          warningKey = nextWarningKey; sound('crt');
          ui.hud.querySelector('[data-announcement]').textContent = `${label}. About ${Math.ceil(ttc)} seconds ahead.`;
        } else if (critical && !warningCritical) {
          ui.hud.querySelector('[data-announcement]').textContent = `${label} very close. Move gently to a clear path.`;
        }
        warningCritical = critical;
      } else {
        notice.classList.remove('is-critical');
        if (!frame.paused) { warningText = ''; warningKey = ''; warningCritical = false; }
      }
      const coins = finite(run.coins);
      if (coins > priorCoins) { sound('coin'); priorCoins = coins; }
      else if (coins < priorCoins) priorCoins = coins;
      if (view && renderer && !lost) {
        const camera = view.camera;
        const playerX = finite(run.x), playerY = finite(run.y, .5);
        camera.position.set(playerX * 2.12, .35 + playerY * 3.35, 0);
        camera.lookAt(camera.position.x, camera.position.y, -18);
        const offset = ((finite(run.distance) % SEGMENT_LENGTH) + SEGMENT_LENGTH) % SEGMENT_LENGTH;
        view.corridor.forEach((segment, index) => { segment.position.z = offset - (index * SEGMENT_LENGTH + SEGMENT_LENGTH / 2); });
        view.aperture.position.set(camera.position.x, camera.position.y, -4.5);
        view.aperture.rotation.z = 0;
        const visibleObjects = objects.slice().sort((a, b) => (finite(a.z) - finite(run.distance)) - (finite(b.z) - finite(run.distance)));
        let slotIndex = 0;
        for (const object of visibleObjects) {
          if (slotIndex >= view.objectSlots.length) break;
          const ahead = finite(object.z) - finite(run.distance);
          const slot = view.objectSlots[slotIndex++];
          if (ahead < -.5 || ahead > 76) { slot.group.visible = false; continue; }
          const type = ['coin', 'zapper', 'laser', 'missile', 'vehicle', 'powerup', 'component', 'token', 'npc'].includes(object.type) ? object.type : 'component';
          slot.group.visible = true;
          slot.group.position.set(finite(object.x) * 2.12, .35 + finite(object.y, .5) * 3.35, -ahead);
          slot.group.scale.set(1, 1, 1);
          const previewCoin = type === 'coin' && Number.isFinite(Number(object.revealAt)) && ahead > 3;
          slot.main.geometry = view.geos[type]; slot.main.material = previewCoin ? view.mats.coinPreview : view.mats[type];
          slot.detail.material = view.mats.detail;
          const w = Math.max(.01, 2 * finite(object.w, .18) * 2.12);
          const h = Math.max(.01, 2 * finite(object.h, .18) * 3.35);
          if (previewCoin) slot.main.scale.set(.52, .52, .52);
          else if (type === 'laser' || type === 'zapper') {
            slot.main.scale.set(w, h, 1); slot.detail.visible = false;
          } else {
            slot.main.scale.set(1, 1, 1); slot.detail.visible = ['missile', 'vehicle', 'powerup', 'component', 'token'].includes(type);
            slot.detail.geometry = view.detailGeo; slot.detail.scale.set(.82, .82, .82);
          }
          slot.main.rotation.set(0, 0, type === 'missile' ? Math.PI / 2 : 0);
          slot.detail.rotation.set(0, 0, 0);
        }
        for (; slotIndex < view.objectSlots.length; slotIndex++) view.objectSlots[slotIndex].group.visible = false;
        view.hemi.intensity = mediaReduce?.matches ? .9 : 1.15;
        view.fill.color.set(theme.neon.rail);
        view.fill.position.set(camera.position.x, camera.position.y, -21);
        const visualRush = Boolean(run.powerup?.effect?.visualRush) && finite(run.time) < finite(run.powerup.until);
        view.rush.visible = visualRush;
        view.rush.position.set(camera.position.x, camera.position.y, 0);
        view.mats.rush.opacity = mediaReduce?.matches ? .32 : .25 + .12 * (0.5 + 0.5 * Math.sin(finite(run.time) * 9));
        view.exhaust.visible = Boolean(run.vehicle || run.powerup);
        view.exhaust.scale.setScalar(visualRush ? 1.35 : 1);
        view.exhaust.position.set(camera.position.x, camera.position.y - .22, -.35);
        renderer.render(view.scene, camera);
      } else if (fallbackCtx) {
        drawFallback(fallbackCtx, ui.fallback, run, theme, warning, objects);
      }
    } catch (error) {
      if (!lost) showFallback(error);
      if (fallbackCtx) drawFallback(fallbackCtx, ui.fallback, run, latestTheme ?? themeFor(0), warningText, objects);
    }
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    resizeObserver?.disconnect();
    window.removeEventListener('resize', onResize);
    ui.canvas.removeEventListener('webglcontextlost', onContextLost, false);
    const released = releaseRenderer();
    if (view) { releaseScene(view); view = null; }
    ui.dispose();
    if (stylesheet && !document.querySelector('.plank-flight-host .plank-flight')) stylesheet.remove();
    return released;
  };
  return { render, stop };
}
