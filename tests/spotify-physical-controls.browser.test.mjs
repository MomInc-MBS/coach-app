import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

test('connected Spotify retains physical controls without a decorative hand', {timeout: 20000}, async t => {
  const files = new Map(await Promise.all(['spotify-terminal.mjs', 'spotify-domain.mjs', 'spotify-terminal.css', 'spotify-return.mjs', 'auth-paths.mjs', 'actual-dj.mjs', 'actual-dj-hand.mjs', 'actual-dj-playlist.mjs', 'actual-dj-commands.mjs', 'actual-dj-engine.mjs', 'actual-dj-library.mjs', 'actual-dj-providers.mjs', 'actual-dj-visualizer.mjs', 'actual-dj.css'].map(async name =>
    [`/${name}`, await readFile(new URL(`../${name}`, import.meta.url))])));
  const server = createServer((req, res) => {
    if (req.url === '/') {res.writeHead(200, {'Content-Type': 'text/html'});res.end('<!doctype html><body></body>');return;}
    const body = files.get(req.url);
    res.writeHead(body ? 200 : 404, {'Content-Type': req.url.endsWith('.css') ? 'text/css' : 'text/javascript'});
    res.end(body || '');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  t.after(async () => {await browser.close();server.closeAllConnections();await new Promise(resolve => server.close(resolve));});
  const page = await browser.newPage({viewport: {width: 375, height: 667}});
  const handRequests=[],errors=[];page.on('request',request=>{if(request.url().includes('/handborne/'))handRequests.push(request.url());});page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.addStyleTag({url: `http://127.0.0.1:${server.address().port}/spotify-terminal.css`});
  await page.addStyleTag({url: `http://127.0.0.1:${server.address().port}/actual-dj.css`});
  await page.evaluate(async () => {
    window.actions = [];
    const {initSpotifyTerminal} = await import('/spotify-terminal.mjs');
    const request = async (path, options = {}) => {
      if (path === '/api/spotify/status') return Response.json({connected: true, account: {name: 'DJ'}});
      if (path === '/api/spotify/now-playing') return Response.json({nowPlaying: {track: null, playing: false}});
      if (path.startsWith('/api/spotify/playlists')) return Response.json({total: 0, items: []});
      if (path === '/api/spotify/playback') {
        window.actions.push(JSON.parse(options.body).action);
        return Response.json({ok: true});
      }
      return Response.json({error: 'Unexpected request'}, {status: 404});
    };
    window.terminal = initSpotifyTerminal({request, getAccount: () => ({user: {id: 'test'}, dataEpoch: 1})});
    window.terminal.open();
  });
  await page.waitForFunction(() => document.querySelector('.sp-account-name')?.textContent === 'DJ');
  await page.locator('.dj-more').click();
  await page.locator('.dj-tabs [data-view="spotify"]').click();
  assert.equal(await page.locator('.sp-hand-mount,.sp-hand-status').count(),0);assert.equal(await page.locator('.dj-hand-overlay').isVisible(),false);assert.equal(await page.locator('.sp-hand .sp-label').textContent(),'PLAYBACK CONTROLS');
  const style = await page.locator('.sp-hand').evaluate(section => {
    const knob = section.querySelector('.sp-knob');
    return {background: getComputedStyle(section).backgroundColor,
      knobWidth: knob.getBoundingClientRect().width, knobHeight: knob.getBoundingClientRect().height,
      controls: [...section.querySelectorAll('[data-action]')].map(button => button.getAttribute('aria-label'))};
  });
  assert.equal(style.background, 'rgba(0, 0, 0, 0)');
  assert.ok(style.knobWidth <= 30 && style.knobHeight <= 30, JSON.stringify(style));
  assert.deepEqual(style.controls, ['Play', 'Previous track', 'Next track', 'Pause']);
  await page.locator('.sp-hand [data-action="next"]').click();
  await page.waitForFunction(() => window.actions.includes('next'));
  assert.deepEqual(await page.evaluate(() => window.actions), ['next']);await page.locator('.sp-hand [data-action=resume]').click();await page.waitForFunction(()=>window.actions.includes('resume'));await page.locator('.sp-hand [data-action=pause]').click();await page.waitForFunction(()=>window.actions.includes('pause'));assert.deepEqual(await page.evaluate(()=>window.actions),['next','resume','pause']);await page.waitForTimeout(200);assert.deepEqual(handRequests,[],'connected status and Spotify transport never load a legacy decorative rig');assert.deepEqual(errors,[]);
});
