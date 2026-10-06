import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

test('terminals follow the pod and cutaway frames and hide for fullscreen dialogs', {timeout: 20000}, async t => {
  const moduleSource = await readFile(new URL('../modules/pod-chrome.mjs', import.meta.url));
  const server = createServer((req, res) => {
    if (req.url === '/modules/pod-chrome.mjs') {
      res.writeHead(200, {'Content-Type': 'text/javascript'});
      res.end(moduleSource);
      return;
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`<!doctype html><body>
      <header class="ship-header"><button id="openSettings">Settings</button></header>
      <div id="portalHome" hidden><div id="portalBoardHost"><div class="portal-frame" aria-hidden="true"></div></div></div>
      <div id="portalChrome" aria-hidden="true"><div class="portal-frame" aria-hidden="true"></div></div>
      <dialog id="cutaway" class="portal-shaped"></dialog><dialog id="fullscreen" class="portal-fullscreen"></dialog>
    </body>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  t.after(async () => {await browser.close();server.closeAllConnections();await new Promise(resolve => server.close(resolve));});
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async () => {
    const {mountPodChrome} = await import('/modules/pod-chrome.mjs');
    mountPodChrome(document.createElement('button'));
  });
  const location = () => page.evaluate(() => {
    const nav = document.getElementById('podPersistentChrome');
    return {parent: nav.parentElement?.className || nav.parentElement?.id || nav.parentElement?.tagName,
      hidden: nav.hidden, frameHidden: nav.parentElement?.getAttribute('aria-hidden')};
  });
  assert.deepEqual(await location(), {parent: 'ship-header', hidden: false, frameHidden: null});

  await page.evaluate(() => {document.getElementById('portalHome').hidden = false;});
  await page.waitForFunction(() => document.querySelector('#portalBoardHost > .portal-frame > #podPersistentChrome'));
  assert.deepEqual(await location(), {parent: 'portal-frame', hidden: false, frameHidden: null});

  await page.evaluate(() => {
    document.getElementById('portalHome').hidden = true;
    document.getElementById('cutaway').setAttribute('open', '');
  });
  await page.waitForFunction(() => document.querySelector('#portalChrome > .portal-frame > #podPersistentChrome'));
  assert.deepEqual(await location(), {parent: 'portal-frame', hidden: false, frameHidden: null});

  await page.evaluate(() => {
    document.getElementById('cutaway').removeAttribute('open');
    document.getElementById('fullscreen').setAttribute('open', '');
  });
  await page.waitForFunction(() => document.getElementById('podPersistentChrome').hidden);
  assert.equal((await location()).hidden, true);
  await page.evaluate(() => document.getElementById('fullscreen').removeAttribute('open'));
  await page.waitForFunction(() => document.getElementById('podPersistentChrome').parentElement.matches('.ship-header'));
  assert.deepEqual(await location(), {parent: 'ship-header', hidden: false, frameHidden: null});
});
