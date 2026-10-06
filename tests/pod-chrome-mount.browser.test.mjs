import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

test('terminals follow the pod and cutaway frames and hide for fullscreen dialogs', {timeout: 20000}, async t => {
  const moduleSource = await readFile(new URL('../modules/pod-chrome.mjs', import.meta.url));
  const styles=new Map(await Promise.all(['modules/portal/portal.css','pod/persistent-chrome.css'].map(async name=>['/'+name,await readFile(new URL('../'+name,import.meta.url))])));
  const server = createServer((req, res) => {
    if(styles.has(req.url)){res.writeHead(200,{'Content-Type':'text/css'});res.end(styles.get(req.url));return;}
    if (req.url === '/modules/pod-chrome.mjs') {
      res.writeHead(200, {'Content-Type': 'text/javascript'});
      res.end(moduleSource);
      return;
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`<!doctype html><head><link rel="stylesheet" href="/modules/portal/portal.css"><link rel="stylesheet" href="/pod/persistent-chrome.css"></head><body>
      <header class="ship-header"><button id="openSettings">Settings</button></header>
      <div id="portalHome" hidden><div id="portalBoardHost"><div class="portal-frame" aria-hidden="true"></div></div><canvas id="portalOverlay"></canvas></div>
      <div id="portalChrome" aria-hidden="true"><div class="portal-frame" aria-hidden="true"></div></div>
      <dialog id="cutaway" class="portal-shaped"></dialog><dialog id="fullscreen" class="portal-fullscreen"></dialog>
    </body>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  t.after(async () => {await browser.close();server.closeAllConnections();await new Promise(resolve => server.close(resolve));});
  const page = await browser.newPage({viewport:{width:375,height:812}});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async () => {
    const {mountPodChrome} = await import('/modules/pod-chrome.mjs');
    const key=document.createElement('button');key.id='portalSettingsButton';key.textContent='Grimoire';
    window.terminalTaps=0;key.onclick=()=>window.terminalTaps++;
    mountPodChrome(key);
  });
  const location = () => page.evaluate(() => {
    const nav = document.getElementById('podPersistentChrome');
    return {parent: nav.parentElement?.className || nav.parentElement?.id || nav.parentElement?.tagName,
      hidden: nav.hidden, frameHidden: nav.parentElement?.getAttribute('aria-hidden')};
  });
  assert.deepEqual(await location(), {parent: 'ship-header', hidden: false, frameHidden: null});
  assert.equal(await page.locator('#portalSettingsButton').isVisible(),false);
  assert.equal(await page.locator('#spotifyNowPlayingOpen').isVisible(),true);

  await page.evaluate(() => {document.getElementById('portalHome').hidden = false;});
  await page.waitForFunction(() => document.querySelector('#portalHome > #podPersistentChrome'));
  assert.deepEqual(await location(), {parent: 'portalHome', hidden: false, frameHidden: null});
  assert.equal(await page.locator('#portalSettingsButton').isVisible(),true);
  assert.equal(await page.evaluate(()=>{const key=document.getElementById('portalSettingsButton').getBoundingClientRect(),frame=document.querySelector('#portalBoardHost>.portal-frame').getBoundingClientRect();return Math.abs(key.top+key.height/2-frame.top)<4;}),true,'buttons are centred on the metal frame top edge');
  assert.equal(await page.evaluate(()=>{
    const key=document.getElementById('portalSettingsButton'),r=key.getBoundingClientRect();
    return r.width>=100&&r.height>=44&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===key;
  }),true,'the real drawing layer cannot intercept terminal taps');
  await page.locator('#portalSettingsButton').click();assert.equal(await page.evaluate(()=>window.terminalTaps),1);

  await page.evaluate(() => {
    document.getElementById('portalHome').hidden = true;
    document.getElementById('cutaway').setAttribute('open', '');
  });
  await page.waitForFunction(() => document.querySelector('#portalChrome > .portal-frame > #podPersistentChrome'));
  assert.deepEqual(await location(), {parent: 'portal-frame', hidden: false, frameHidden: null});

  await page.evaluate(() => {
    const cutaway=document.getElementById('cutaway');cutaway.removeAttribute('open');cutaway.showModal();
  });
  await page.waitForFunction(() => document.getElementById('podPersistentChrome').hidden);
  assert.equal((await location()).hidden,true,'keys outside a native modal must not remain visibly inert');
  await page.evaluate(() => document.getElementById('cutaway').close());

  await page.evaluate(() => {
    document.getElementById('cutaway').removeAttribute('open');
    document.getElementById('fullscreen').setAttribute('open', '');
  });
  await page.waitForFunction(() => document.getElementById('podPersistentChrome').hidden);
  assert.equal((await location()).hidden, true);
  await page.evaluate(() => document.getElementById('fullscreen').removeAttribute('open'));
  await page.waitForFunction(() => document.getElementById('podPersistentChrome').parentElement.matches('.ship-header'));
  assert.deepEqual(await location(), {parent: 'ship-header', hidden: false, frameHidden: null});
  assert.equal(await page.locator('#portalSettingsButton').isVisible(),false);
  assert.equal(await page.locator('#spotifyNowPlayingOpen').isVisible(),true);
});
