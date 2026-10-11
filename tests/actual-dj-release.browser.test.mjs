// Production packaging check: full Coach /pose.html, with real local media playback.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
import { completeCoach } from './onboarding-fixture.mjs';
import { sendFile as sendPreviewFile } from '../scripts/actual-dj-preview.mjs';

const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
  '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };

async function openMixer(page){if(await page.locator('.dj-more').getAttribute('aria-expanded')!=='true')await page.locator('.dj-more').click();await page.locator('.dj-tabs [data-view=mix]').click();}

function serve() {
  const root = resolve('dist/client');
  return createServer(async (req, res) => {
    const path = new URL(req.url, 'http://local').pathname;
    if (path.startsWith('/api/')) {
      const enabled = path === '/api/auth/config';
      res.writeHead(enabled ? 200 : 401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(enabled ? { enabled: false } : { error: 'Sign in' })); return;
    }
    try {
      const file = resolve(root, '.' + (path === '/' ? '/pose.html' : path));
      if (!file.startsWith(root + sep)) throw new Error('Outside static root');
      const body = await readFile(file);
      sendPreviewFile(req, res, body, TYPES[extname(file)] || 'application/octet-stream');
    } catch { res.writeHead(404); res.end(); }
  });
}

async function installedContext(browser, overrides = {}) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 },
    serviceWorkers: 'block', reducedMotion: 'reduce', ...overrides });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
    const get = Storage.prototype.getItem, d = new Date();
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    Storage.prototype.getItem = function (key) {
      return String(key).startsWith('myr5-how-to-play-day-v1/') ? day : get.call(this, key);
    };
    // Observe actual browser Audio elements, without substituting their decoder or play().
    const BrowserAudio = window.Audio;
    window.actualDJReleaseAudio = [];
    function ObservedAudio(...args) {
      const audio = new BrowserAudio(...args);
      window.actualDJReleaseAudio.push(audio); return audio;
    }
    ObservedAudio.prototype = BrowserAudio.prototype;
    Object.setPrototypeOf(ObservedAudio, BrowserAudio);
    window.Audio = ObservedAudio;
    window.actualDJReleaseEvents = [];
    window.addEventListener('myr5:dj-active', event => window.actualDJReleaseEvents.push(event.detail.active));
  });
  return context;
}

test('packaged Coach service worker returns cached music ranges and real offline audio seeks and loops',
  { timeout: 120000 }, async t => {
    const server = serve(); await new Promise(done => server.listen(0, '127.0.0.1', done));
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ channel: 'msedge', headless: true,
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    t.after(async () => { await browser.close(); server.closeAllConnections(); await new Promise(done => server.close(done)); });
    const context = await installedContext(browser, { serviceWorkers: 'allow' }); t.after(() => context.close());
    await context.addInitScript(() => { try { localStorage.setItem('handborne-recipe-v4', JSON.stringify({
      version: 4, sections: { nails: 0, fingertips: 0, fingers: 0, palm: 0, back_of_hand: 0, wrist: 0 }, pose: 'relaxed', nailShape: 'family',
    })); } catch {} });
    await seed(context, base);
    const page = await context.newPage(), errors = [], swResponses = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().includes('/audio/music/hey-man-idk.m4a') && response.fromServiceWorker()) swResponses.push(response.status());
    });
    await page.goto(base + '/pose.html');
    await page.waitForFunction(() => window.myr5TestState?.phase === 'idle' && !!document.querySelector('#spotifyNowPlayingOpen'));
    await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }); await navigator.serviceWorker.ready; });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.waitForFunction(() => window.myr5WorkoutOwner && !window.myr5WorkoutOwner.snapshot().transitioning);
    await page.getByRole('button', { name: 'Not now', exact: true }).click();
    await page.locator('#spotifyNowPlayingOpen').click();assert.equal(await page.locator('#spotifyPanel').getAttribute('data-dj-view'),'playlist');assert.equal(await page.locator('.dj-hand-overlay').isVisible(),false);await openMixer(page);
    await page.locator('.dj-crate-row[data-track=daemon-time] [data-load=a]').click();
    await page.locator('[data-deck=a] .dj-play').click();
    await page.waitForFunction(() => document.querySelector('.dj-hand-overlay')?.dataset.ready === 'true');
    assert.equal(await page.locator('.dj-hand-overlay canvas').count(), 1, 'saved nondefault Hand rig loads while known local music actually plays');
    assert.equal(await page.locator('.dj-hand-overlay').getAttribute('data-family'), '0');
    async function corner() {
      await page.waitForFunction(() => document.querySelector('.dj-hand-overlay')?.dataset.mode === 'corner-beat' && !document.querySelector('.dj-hand-overlay')?.hidden);
      const anchor=await page.locator('.dj-hand-overlay').evaluate(h=>{const r=h.getBoundingClientRect(),f=document.querySelector('.sp-shell>footer').getBoundingClientRect();return{size:[r.width,r.height],right:f.right-r.right,bottom:f.bottom-r.bottom,top:r.top-f.top,target:h.dataset.target,pointer:getComputedStyle(h).pointerEvents,clipBottom:Math.min(innerHeight,...(()=>{const bounds=[];for(let e=h.parentElement;e;e=e.parentElement)if(getComputedStyle(e).overflow!=='visible'||e.tagName==='DIALOG')bounds.push(e.getBoundingClientRect().bottom);return bounds;})()),bottomEdge:r.bottom};});
      assert.ok(anchor.bottomEdge<=anchor.clipBottom,'native corner is inside actual Coach clipping bounds, not under the dock');assert.deepEqual(anchor.size,[64,84]);assert.equal(anchor.target,'');assert.equal(anchor.pointer,'none');assert.ok(anchor.top>=0&&anchor.right>=7&&anchor.right<=9&&anchor.bottom>=3&&anchor.bottom<=12,JSON.stringify(anchor));
    }
    await corner();await page.locator('.dj-crossfader').scrollIntoViewIfNeeded();
    await page.locator('.dj-crossfader').focus();await page.keyboard.down('ArrowRight');await page.waitForTimeout(800);await corner();await page.keyboard.up('ArrowRight');
    await page.locator('.sp-close').click();
    const onlineRange = await page.evaluate(async () => {
      const response = await fetch('/audio/music/hey-man-idk.m4a', { headers: { Range: 'bytes=0-15' } });
      return { status: response.status, range: response.headers.get('content-range'), length: (await response.arrayBuffer()).byteLength };
    });
    assert.equal(onlineRange.status, 206); assert.equal(onlineRange.length, 16);
    assert.match(onlineRange.range, /^bytes 0-15\/145363$/);
    // Music is an optional download too: cache the real crate before checking
    // offline Auto DJ, rather than expecting missing tracks to play offline.
    await page.evaluate(async () => {
      const manifest = await (await fetch('/audio/music/manifest.json')).json();
      window.actualDJOfflineMusic = Object.values(manifest.tracks).map(track => track.url);
      await Promise.all(window.actualDJOfflineMusic.map(async url => {
        const response = await fetch(url); if (!response.ok) throw new Error('Music download failed'); await response.arrayBuffer();
      }));
    });
    await page.waitForFunction(async () => (await Promise.all(window.actualDJOfflineMusic.map(url => caches.match(url)))).every(Boolean));
    await page.waitForFunction(async () => {
      for (const name of await caches.keys()) if (name.startsWith('myr5-optional-') || name.startsWith('myr5-package-')) {
        const cached = await (await caches.open(name)).match('/audio/music/hey-man-idk.m4a');
        if (cached?.status === 200 && (await cached.arrayBuffer()).byteLength === 145363) return true;
      }
      return false;
    });
    const rawProviderCached = await page.evaluate(async () => {
      const paths = ['/actual-dj.mjs', '/actual-dj-hand.mjs', '/actual-dj-providers.mjs','/actual-dj-playlist.mjs'];
      for (const name of await caches.keys()) for (const path of paths) await (await caches.open(name)).delete(path);
      return (await Promise.all(paths.map(path => caches.match(path)))).some(Boolean);
    });
    assert.equal(rawProviderCached, false, 'raw main, hand and provider duplicates are deliberately absent offline');
    await context.setOffline(true);
    const offlineRange = await page.evaluate(async () => {
      const response = await fetch('/audio/music/hey-man-idk.m4a', { headers: { Range: 'bytes=12-31' } });
      return { status: response.status, range: response.headers.get('content-range'), length: (await response.arrayBuffer()).byteLength };
    });
    assert.deepEqual(offlineRange, { status: 206, range: 'bytes 12-31/145363', length: 20 });
    // Start Coach again from its installed shell. The raw provider source is optional;
    // the packaged core runtime must still open and operate the DJ while offline.
    await page.reload();
    await page.waitForFunction(() => window.myr5TestState?.phase === 'idle' && !!document.querySelector('#spotifyNowPlayingOpen'));
    await page.locator('#spotifyNowPlayingOpen').click();assert.equal(await page.locator('#spotifyPanel').getAttribute('data-dj-view'),'playlist');assert.equal(await page.locator('.dj-hand-overlay').isVisible(),false);await openMixer(page);
    await page.waitForFunction(() => document.querySelector('#spotifyPanel')?.open === true && !document.querySelector('.dj-auto')?.disabled);
    await page.locator('.dj-auto').click();
    await page.waitForFunction(() => document.querySelector('.dj-hand-overlay')?.dataset.ready === 'true');
    assert.equal(await page.locator('.dj-hand-overlay canvas').count(), 1, 'downloaded nondefault corner Hand rig works offline without raw authoring modules');
    await corner();
    await page.waitForFunction(() => window.actualDJReleaseAudio.some(audio => !audio.paused && audio.currentTime > .2));
    assert.equal(await page.locator('.dj-auto').getAttribute('aria-pressed'), 'true', 'bundled Auto DJ works offline without raw authoring modules');
    await page.locator('.dj-auto').click();
    await page.locator('.dj-tabs [data-view=providers]').click();
    await page.locator('#djSourceUrl').fill('https://music.apple.com/us/album/example/123?i=456');
    await page.locator('.dj-source-form button[type=submit]').click();
    assert.equal(await page.locator('.dj-provider-frame').getAttribute('src'), 'https://embed.music.apple.com/us/album/example/123?i=456');
    assert.match(await page.locator('.dj-source-status').textContent(), /previews.*full playback/i);
    assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), true);
    await page.locator('.dj-tabs [data-view=mix]').click();
    await page.locator('.dj-crate-row[data-track=hey-man-idk] [data-load=a]').click();
    await page.locator('[data-deck=a] .dj-play').click();
    await page.waitForFunction(() => window.actualDJReleaseAudio.some(audio => audio.src.includes('/hey-man-idk.m4a') && !audio.paused && audio.currentTime > .2));
    await page.locator('[data-deck=a] .dj-seek').evaluate(input => { input.value = '2'; input.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForFunction(() => {
      const audio = window.actualDJReleaseAudio.filter(media => media.src.includes('/hey-man-idk.m4a')).at(-1);
      return audio && !audio.seeking && audio.currentTime >= 2 && audio.currentTime < 3 && audio.seekable.length > 0 && audio.seekable.end(audio.seekable.length - 1) > 9;
    });
    await page.locator('[data-deck=a] .dj-loop').selectOption('4');
    await page.evaluate(() => { window.actualDJLoopPrevious = 0; });
    await page.waitForFunction(() => {
      const audio = window.actualDJReleaseAudio.filter(media => media.src.includes('/hey-man-idk.m4a')).at(-1);
      const wrapped = audio.currentTime < window.actualDJLoopPrevious - .3;
      window.actualDJLoopPrevious = audio.currentTime; return wrapped;
    }, null, { timeout: 5000 });
    assert.ok(swResponses.includes(206), `real SW media responses: ${JSON.stringify(swResponses)}`);
    await page.locator('.sp-close').click(); await page.waitForFunction(() => !document.querySelector('.dj-playing'));
    // A fresh installed shell without the optional Hand download still operates
    // the bundled DJ. Removing the lazy rig must not produce an unhandled import.
    await page.evaluate(async () => {
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) if (new URL(request.url).pathname.startsWith('/handborne/')) await cache.delete(request);
      }
    });
    const cacheControl = await context.newCDPSession(page);
    await cacheControl.send('Network.enable'); await cacheControl.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.reload();
    await page.waitForFunction(() => window.myr5TestState?.phase === 'idle' && !!document.querySelector('#spotifyNowPlayingOpen'));
    await page.locator('#spotifyNowPlayingOpen').click();assert.equal(await page.locator('#spotifyPanel').getAttribute('data-dj-view'),'playlist');assert.equal(await page.locator('.dj-hand-overlay').isVisible(),false);await openMixer(page);
    await page.locator('.dj-auto').click();
    await page.waitForFunction(() => document.querySelector('.dj-hand-overlay')?.dataset.mode === 'corner-beat');
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.dj-hand-overlay canvas').count(), 0, 'missing optional Hand rig cannot block audio');
    await page.waitForFunction(() => window.actualDJReleaseAudio.some(audio => !audio.paused && audio.currentTime > .2));
    assert.equal(await page.locator('.dj-auto').getAttribute('aria-pressed'), 'true', 'missing optional Hand download does not block Auto DJ');
    await page.locator('.sp-close').click();
    assert.deepEqual(errors, [], 'installed SW and offline media produced no runtime errors');
    t.diagnostic(`Service worker music range responses: ${JSON.stringify(swResponses)}`);
  });
async function seed(context, base) {
  const page = await context.newPage();
  await page.goto(base + '/onboarding.html');
  await page.evaluate(async intake => {
    const { openLocalCoach } = await import('/local-coach-runtime.mjs');
    const repo = await openLocalCoach();
    await repo.forOwner(repo.guestOwnerId).saveSetup(intake, { startDay: '2026-09-21' });
    repo.close();
  }, completeCoach());
  await page.close();
}

test('full Coach production page opens actual.dj from the original Spotify button and restores the app',
  { timeout: 120000 }, async t => {
    const server = serve();
    await new Promise(done => server.listen(0, '127.0.0.1', done));
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ channel: 'msedge', headless: true,
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    t.after(async () => {
      await browser.close(); server.closeAllConnections(); await new Promise(done => server.close(done));
    });
    const context = await installedContext(browser, { deviceScaleFactor: 3 }); t.after(() => context.close());
    await seed(context, base);
    const page = await context.newPage(), bootErrors = [], featureErrors = [], failedAssets = [];
    let checkingDJ = false;
    page.on('pageerror', error => (checkingDJ ? featureErrors : bootErrors).push(error.message));
    page.on('response', response => {
      if (response.status() >= 400 && !new URL(response.url()).pathname.startsWith('/api/')) {
        failedAssets.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });
    await page.goto(base + '/pose.html');
    await page.waitForFunction(() => window.myr5TestState?.phase === 'idle' && window.myr5WorkoutOwner && !window.myr5WorkoutOwner.snapshot().transitioning);
    await page.waitForFunction(() => !!document.querySelector('.coach-dock'));
    const launch = page.locator('#spotifyNowPlayingOpen');
    await launch.waitFor({ state: 'visible' });
    assert.equal(await launch.count(), 1, 'the original app launcher is present');
    assert.equal(new URL(page.url()).pathname, '/pose.html');
    const originalHash = await page.evaluate(() => location.hash);
    t.diagnostic(`Initial launcher hit: ${JSON.stringify(await launch.evaluate(node => {
      const r = node.getBoundingClientRect();
      return { rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.outerHTML.slice(0, 250), scrollY };
    }))}`);
    checkingDJ = true;
    await launch.click();
    await page.waitForFunction(() => document.querySelector('#spotifyPanel.actual-dj')?.open === true);
    assert.equal(await page.locator('#spotifyPanel').getAttribute('data-dj-view'),'playlist','normal Coach music shortcut opens Playlist');
    assert.equal(await page.locator('.dj-decks').isVisible(),false);assert.equal(await page.locator('.dj-hand-overlay').isVisible(),false);
    await page.locator('.dj-add-music summary').click();await page.locator('.dj-local-song').selectOption('hey-man-idk');await page.locator('.dj-save-local').click();
    await page.locator('.dj-add-music summary').click();await page.locator('.dj-local-song').selectOption('daemon-time');await page.locator('.dj-save-local').click();
    await page.screenshot({path:'.actual-dj/coach-playlist-375.png'});
    await page.locator('.dj-current-play').click();await page.waitForFunction(()=>window.actualDJReleaseAudio.some(audio=>!audio.paused&&audio.currentTime>.3));
    assert.match(await page.locator('.dj-current-source').textContent(),/^Playing/);await page.locator('.dj-current-play').click();assert.ok(await page.evaluate(()=>window.actualDJReleaseAudio.every(audio=>audio.paused)));
    await page.locator('.dj-next-item').click();assert.equal(await page.locator('.dj-current-title').textContent(),'Daemon Time');assert.match(await page.locator('.dj-current-source').textContent(),/^On this device/);
    await openMixer(page);
    assert.equal(await page.locator('#spotifyPanel h2').textContent(), 'actual.dj');
    await page.waitForFunction(() => document.querySelector('[data-deck=a] .dj-title')?.textContent === 'Hey Man IDK');
    const bounds = await page.locator('#spotifyPanel .sp-screen').evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth }));
    assert.ok(bounds.content <= bounds.width + 1, `375px production panel has no horizontal overflow: ${JSON.stringify(bounds)}`);
    await mkdir('.actual-dj',{recursive:true});
    await page.screenshot({path:'.actual-dj/coach-dj-375.png'});
    await page.locator('[data-deck=a] .dj-play').click();
    await page.waitForFunction(() => document.querySelector('[data-deck=a]')?.classList.contains('dj-playing'));
    await page.waitForFunction(() => window.actualDJReleaseAudio.some(audio => audio.src.includes('/audio/music/hey-man-idk.m4a') && !audio.paused && audio.readyState >= 2 && audio.currentTime >= 1));
    await page.waitForFunction(() => /^0:0[1-9] /.test(document.querySelector('[data-deck=a] .dj-time')?.textContent || ''));
    const media = await page.evaluate(() => window.actualDJReleaseAudio.filter(audio => audio.src.includes('/audio/music/hey-man-idk.m4a')).map(audio => ({ paused: audio.paused, position: audio.currentTime, duration: audio.duration, error: audio.error?.code ?? null })));
    assert.ok(media.some(audio => !audio.paused && audio.position >= 1 && audio.duration > 1 && audio.error === null), JSON.stringify(media));
    await page.locator('[data-deck=a] .dj-loop').selectOption('4');
    await page.locator('.dj-tabs [data-view=visuals]').click();
    await page.waitForFunction(() => document.querySelector('.dj-visual-status')?.textContent.includes('Butterchurn'));
    async function renderedPixels(label) {
      await page.waitForFunction(() => {
        const c = document.querySelector('.dj-visual-canvas'), g = c?.getContext('webgl2'); if (!g) return false;
        const b = c.getBoundingClientRect(), v = g.getParameter(g.VIEWPORT), ratio = Math.min(devicePixelRatio, 1.5);
        return c.width === Math.round(b.width * ratio) && c.height === Math.round(b.height * ratio) && v[2] === g.drawingBufferWidth && v[3] === g.drawingBufferHeight;
      });
      const viewport = await page.locator('.dj-visual-canvas').evaluate(c => { const g = c.getContext('webgl2'); return { dpr: devicePixelRatio, backing: [c.width, c.height], viewport: Array.from(g.getParameter(g.VIEWPORT)), error: g.getError() }; });
      assert.equal(viewport.dpr, 3); assert.equal(viewport.error, 0); assert.deepEqual(viewport.viewport, [0, 0, ...viewport.backing]);
      await page.screenshot({ path: `.actual-dj/coach-visualizer-dpr3-${label}.png` }); t.diagnostic(`${label}: ${JSON.stringify(viewport)}`);
    }
    await renderedPixels('panel-portrait');
    await page.setViewportSize({ width: 812, height: 375 }); await renderedPixels('panel-landscape');
    await page.locator('.dj-fullscreen').click(); await page.waitForFunction(() => !!document.fullscreenElement); await renderedPixels('fullscreen-landscape');
    await page.setViewportSize({ width: 375, height: 812 }); await renderedPixels('fullscreen-portrait');
    await page.evaluate(() => document.exitFullscreen()); await page.waitForFunction(() => !document.fullscreenElement); await renderedPixels('panel-return');
    await page.locator('#spotifyPanel .sp-close').click();
    await page.waitForFunction(() => !document.querySelector('#spotifyPanel')?.open && !document.querySelector('.dj-playing'));
    // Allow app close handlers and their layout observers to finish before hit testing.
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => location.hash), originalHash);
    assert.equal(await page.evaluate(() => window.myr5TestState.phase), 'idle');
    assert.equal(await page.evaluate(() => window.actualDJReleaseAudio.filter(audio => audio.src.includes('/audio/music/')).every(audio => audio.paused)), true, 'DJ audio stops when the panel closes');
    const restoredLauncher = await launch.evaluate(node => {
      const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { tappable: !node.closest('[inert]') && !!hit && node.contains(hit),
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        hit: hit?.outerHTML.slice(0, 600), inert: node.closest('[inert]')?.id, scrollY };
    });
    t.diagnostic(`Existing boot runtime errors: ${JSON.stringify(bootErrors)}`);
    t.diagnostic(`DJ runtime errors: ${JSON.stringify(featureErrors)}`);
    t.diagnostic(`Static HTTP failures: ${JSON.stringify([...new Set(failedAssets)])}`);
    t.diagnostic(`Restored launcher hit: ${JSON.stringify(restoredLauncher)}`);
    assert.equal(restoredLauncher.tappable, true, 'original launcher remains tappable when actual.dj closes');
    assert.ok(await page.evaluate(() => window.actualDJReleaseEvents.includes(true) && window.actualDJReleaseEvents.at(-1) === false), 'app receives matching audio takeover/restore events');
    await launch.click({timeout:5000}); await page.waitForFunction(() => document.querySelector('#spotifyPanel')?.open === true);assert.equal(await page.locator('#spotifyPanel').getAttribute('data-dj-view'),'playlist');assert.equal(await page.locator('.dj-add-music').getAttribute('open'),null);assert.equal(await page.locator('.dj-playlist-row').count(),2);assert.equal(await page.locator('.dj-hand-overlay').isVisible(),false);
    await page.locator('#spotifyPanel .sp-close').click();
    assert.deepEqual(featureErrors, [], 'no new runtime errors from opening, playback, close or reopen');
  });
