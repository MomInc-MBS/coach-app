// Production packaging check: full Coach /pose.html, with real local media playback.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
import { completeCoach } from './onboarding-fixture.mjs';

const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
  '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };

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
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
}

async function installedContext(browser) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 },
    serviceWorkers: 'block', reducedMotion: 'reduce' });
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
    const context = await installedContext(browser); t.after(() => context.close());
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
    await launch.click({timeout:5000}); await page.waitForFunction(() => document.querySelector('#spotifyPanel')?.open === true);
    await page.locator('#spotifyPanel .sp-close').click();
    assert.deepEqual(featureErrors, [], 'no new runtime errors from opening, playback, close or reopen');
  });
