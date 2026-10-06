import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

test('physical Spotify controls stay usable on a transparent hand station', {timeout: 20000}, async t => {
  const files = new Map(await Promise.all(['spotify-terminal.mjs', 'spotify-domain.mjs', 'spotify-terminal.css'].map(async name =>
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
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.addStyleTag({url: `http://127.0.0.1:${server.address().port}/spotify-terminal.css`});
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
  assert.deepEqual(await page.evaluate(() => window.actions), ['next']);
});
