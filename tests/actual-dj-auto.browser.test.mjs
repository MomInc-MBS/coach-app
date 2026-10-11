import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createDJPreviewServer } from '../scripts/actual-dj-preview.mjs';

let server, browser, base;
test.before(async () => {
  server = createDJPreviewServer();
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'msedge', headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
});
test.after(async () => {
  await browser?.close(); server?.closeAllConnections();
  if (server) await new Promise(done => server.close(done));
});

async function open(t) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  t.after(() => context.close());
  await context.addInitScript(() => {
    const BrowserAudio = window.Audio;
    window.autoDJAudio = [];
    function ObserveAudio(...args) {
      const audio = new BrowserAudio(...args); window.autoDJAudio.push(audio); return audio;
    }
    ObserveAudio.prototype = BrowserAudio.prototype; Object.setPrototypeOf(ObserveAudio, BrowserAudio);
    window.Audio = ObserveAudio;
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/actual-dj-preview');await page.locator('.dj-more').click();await page.locator('.dj-tabs [data-view=mix]').click();
  await page.waitForFunction(() => document.querySelector('[data-deck=a] .dj-title')?.textContent === 'Hey Man IDK' && !document.querySelector('.dj-auto')?.disabled);
  assert.equal(await page.locator('.dj-playing').count(), 0, 'both decks begin paused');
  return { page, errors };
}

async function seekNearEnd(page, deck, remaining = 1) {
  await page.waitForFunction(id => Number(document.querySelector(`[data-deck=${id}] .dj-seek`)?.max) > 1, deck);
  await page.locator(`[data-deck=${deck}] .dj-seek`).evaluate((input, seconds) => {
    input.value = String(Number(input.max) - seconds);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, remaining);
}

async function command(page, text) {
  await page.locator('#djDeckCommand').fill(text);
  await page.locator('.dj-command-form button').click();
}

test('one tap starts paused decks with an empty queue, hands off real media, and STOP prevents another handoff',
  { timeout: 60000 }, async t => {
    const { page, errors } = await open(t);
    assert.equal(await page.locator('.dj-queue-row').count(), 0);
    const start = page.locator('.dj-auto');
    assert.equal(await start.textContent(), 'START AUTO DJ ▶');
    assert.ok(await start.evaluate(button => button.getBoundingClientRect().top < document.querySelector('.dj-decks').getBoundingClientRect().top), 'one-tap control appears above the decks');
    await page.locator('.dj-fade').selectOption('4');
    await start.click();
    await page.waitForFunction(() => document.querySelector('.dj-live')?.textContent === 'AUTO DJ PLAYING / QUEUE READY');
    assert.equal(await start.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.dj-queue-row').count(), 5, 'empty queue becomes a finite crate sequence');
    await page.waitForFunction(() => window.autoDJAudio.some(audio => audio.src.includes('/hey-man-idk.m4a') && !audio.paused && audio.currentTime > .25 && audio.readyState >= 2));
    assert.equal(await page.locator('[data-deck=b] .dj-play').textContent(), 'PLAY', 'the primed incoming deck stays silent until its transition');
    await mkdir('.actual-dj', { recursive: true });
    await start.scrollIntoViewIfNeeded();
    await page.screenshot({ path: '.actual-dj/auto-dj-start-375.png' });
    await seekNearEnd(page, 'a', 4.1);
    await page.waitForFunction(() => Number(document.querySelector('.dj-crossfader')?.value) === 1 && document.querySelector('[data-deck=b]')?.classList.contains('dj-playing'));
    await page.waitForFunction(() => document.querySelector('[data-deck=a] .dj-title')?.textContent === 'Daemon Time' && document.querySelectorAll('.dj-queue-row').length === 4);
    assert.equal(await page.locator('[data-deck=a] .dj-title').textContent(), 'Daemon Time', 'the vacated deck is prepared with the following queued song');
    assert.equal(await page.locator('.dj-queue-row').count(), 4);
    await start.click();
    assert.equal(await start.getAttribute('aria-pressed'), 'false');
    await seekNearEnd(page, 'b', .4);
    await page.waitForFunction(() => !document.querySelector('.dj-playing'), null, { timeout: 5000 });
    assert.equal(await page.locator('.dj-playing').count(), 0, 'current track ends without an unsolicited next transition');
    assert.equal(await page.locator('.dj-crossfader').inputValue(), '1');
    assert.equal(await page.locator('.dj-queue-row').count(), 4, 'stopping Auto DJ retains the unplayed queue');
    assert.deepEqual(errors, []);
  });

test('an explicit one-song queue is played next and Auto DJ finishes on that final song',
  { timeout: 60000 }, async t => {
    const { page, errors } = await open(t);
    await page.locator('.dj-crate-row[data-track=daemon-time] [data-load=queue]').click();
    await page.locator('.dj-auto').click();
    await page.waitForFunction(() => document.querySelector('.dj-live')?.textContent === 'AUTO DJ PLAYING / QUEUE READY');
    assert.equal(await page.locator('[data-deck=b] .dj-title').textContent(), 'Daemon Time');
    assert.equal(await page.locator('.dj-queue-row').count(), 1, 'explicit queue is not padded with the default crate');
    await seekNearEnd(page, 'a', 1);
    await page.waitForFunction(() => document.querySelector('.dj-live')?.textContent === 'LAST TRACK / AUTO DJ FINISHED');
    assert.equal(await page.locator('.dj-auto').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('.dj-queue-row').count(), 0);
    assert.equal(await page.locator('[data-deck=b] .dj-play').textContent(), 'PAUSE', 'the last queued song continues through its ending');
    await seekNearEnd(page, 'b', .3);
    await page.waitForFunction(() => !document.querySelector('.dj-playing'), null, { timeout: 5000 }).catch(async error => {t.diagnostic(`Final song at failure: ${JSON.stringify(await page.evaluate(() => window.autoDJAudio.map(audio => ({src:audio.src,position:audio.currentTime,duration:audio.duration,paused:audio.paused,ended:audio.ended,error:audio.error?.code}))))}`);throw error;});
    assert.equal(await page.locator('.dj-playing').count(), 0);
    assert.deepEqual(errors, []);
  });

test('closing during Auto DJ transition cancels audio and stale queue work before reopening',
  { timeout: 60000 }, async t => {
    const { page, errors } = await open(t);
    await page.locator('.dj-auto').click();
    await page.waitForFunction(() => document.querySelector('.dj-live')?.textContent === 'AUTO DJ PLAYING / QUEUE READY');
    await seekNearEnd(page, 'a', 2);
    await page.waitForFunction(() => document.querySelector('.dj-transition')?.textContent === 'MIXING…');
    const queued = await page.locator('.dj-queue-row').count();
    await page.locator('.sp-close').click(); await page.waitForTimeout(2500);
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await page.locator('.dj-playing').count(), 0);
    assert.equal(await page.evaluate(() => window.autoDJAudio.every(audio => audio.paused)), true);
    assert.equal(await page.locator('.dj-queue-row').count(), queued, 'cancelled transition did not consume a song');
    await page.locator('#open').click();
    assert.equal(await page.locator('.dj-auto').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('.dj-playing').count(), 0);
    assert.deepEqual(errors, []);
  });

test('typed deck commands reuse local start, transition, fade and play controls; unknown commands stay inert',
  { timeout: 60000 }, async t => {
    const { page, errors } = await open(t);
    await command(page, 'fade 4 seconds');
    assert.equal(await page.locator('.dj-fade').inputValue(), '4');
    await command(page, 'start auto dj');
    await page.waitForFunction(() => document.querySelector('.dj-command-form [role=status]')?.textContent === 'Done: start auto dj');
    assert.equal(await page.locator('[data-deck=a] .dj-play').textContent(), 'PAUSE');
    await command(page, 'mix next');
    await page.waitForFunction(() => document.querySelector('.dj-command-form [role=status]')?.textContent === 'Done: mix next');
    assert.equal(await page.locator('.dj-crossfader').inputValue(), '1');
    assert.equal(await page.locator('.dj-queue-row').count(), 4);
    await command(page, 'stop auto dj');
    assert.equal(await page.locator('.dj-auto').getAttribute('aria-pressed'), 'false');
    await page.locator('.dj-command-form').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '.actual-dj/deck-commands-375.png' });
    await command(page, 'pause deck B');
    assert.equal(await page.locator('.dj-playing').count(), 0);
    await command(page, 'play B');
    await page.waitForFunction(() => document.querySelector('[data-deck=b]')?.classList.contains('dj-playing'));
    const before = await page.locator('.dj-crossfader').inputValue();
    await command(page, 'blend Spotify and Apple Music');
    assert.match(await page.locator('.dj-command-form [role=status]').textContent(), /^Use a deck command/);
    assert.equal(await page.locator('.dj-crossfader').inputValue(), before);
    await page.locator('.sp-close').click();
    await page.waitForFunction(() => !document.querySelector('.dj-playing'));
    assert.equal(await page.locator('.dj-playing').count(), 0);
    assert.deepEqual(errors, []);
  });

test('STOP during a blend finishes that handoff once and retains the remaining queue',
  { timeout: 60000 }, async t => {
    const { page, errors } = await open(t);
    await page.locator('.dj-auto').click();
    await page.waitForFunction(() => document.querySelector('.dj-live')?.textContent === 'AUTO DJ PLAYING / QUEUE READY');
    await seekNearEnd(page, 'a', 3);
    await page.waitForFunction(() => document.querySelector('.dj-transition')?.textContent === 'MIXING…');
    await page.locator('.dj-auto').click();
    assert.equal(await page.locator('.dj-live').textContent(), 'FINISHING CURRENT MIX / AUTO DJ OFF');
    assert.equal(await page.locator('.dj-auto').getAttribute('aria-pressed'), 'false');
    await page.waitForFunction(() => document.querySelector('.dj-live')?.textContent === 'AUTO DJ STOPPED / MANUAL MIX');
    assert.equal(await page.locator('.dj-crossfader').inputValue(), '1');
    assert.equal(await page.locator('.dj-queue-row').count(), 4, 'only the completed incoming song left the queue');
    assert.equal(await page.locator('[data-deck=a] .dj-title').textContent(), 'Hey Man IDK', 'STOP did not prepare another future handoff');
    assert.deepEqual(errors, []);
  });

test('an explicit deck pause cancels Auto DJ without consuming an unfinished transition',
  { timeout: 60000 }, async t => {
    const { page, errors } = await open(t);
    await page.locator('.dj-auto').click();
    await page.waitForFunction(() => document.querySelector('.dj-live')?.textContent === 'AUTO DJ PLAYING / QUEUE READY');
    await seekNearEnd(page, 'a', 4);
    await page.waitForFunction(() => document.querySelector('.dj-transition')?.textContent === 'MIXING…');
    await command(page, 'pause deck B');
    await page.waitForFunction(() => document.querySelector('.dj-command-form [role=status]')?.textContent === 'Done: pause deck B');
    assert.equal(await page.locator('.dj-auto').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('[data-deck=b] .dj-play').textContent(), 'PLAY');
    assert.equal(await page.locator('.dj-queue-row').count(), 5);
    assert.notEqual(await page.locator('.dj-crossfader').inputValue(), '1');
    await seekNearEnd(page, 'a', .3);
    await page.waitForFunction(() => !document.querySelector('.dj-playing'));
    assert.equal(await page.locator('.dj-queue-row').count(), 5, 'manual cancellation preserved every unplayed queue entry');
    assert.deepEqual(errors, []);
  });
