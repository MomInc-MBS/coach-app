import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createDJPreviewServer} from '../scripts/actual-dj-preview.mjs';

test('a live Spotify source cannot open the Apple deck player when Spotify pause fails', {timeout:60000}, async t=>{
 const server=createDJPreviewServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 t.after(async()=>{await browser.close();server.closeAllConnections();await new Promise(done=>server.close(done));});
 const context=await browser.newContext({viewport:{width:375,height:812}});
 await context.addInitScript(()=>localStorage.setItem('myr5.actualDJ.deckSources',JSON.stringify({a:'spotify',b:'apple'})));
 const page=await context.newPage(),actions=[],pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 await page.route('**/actual-dj-preview',async route=>{
  const response=await route.fetch(),html=await response.text();
  await route.fulfill({response,body:html.replace('getAccount:()=>null','getAccount:()=>({user:{id:"fixture"},dataEpoch:1})')});
 });
 await page.route('**/api/spotify/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/spotify/status')return route.fulfill({json:{connected:true,account:{name:'Fixture'}}});
  if(url.pathname==='/api/spotify/now-playing')return route.fulfill({json:{nowPlaying:{playing:true,track:{name:'Fixture track',artists:['Fixture artist'],image:null},durationMs:120000,progressMs:4000,device:'Fixture phone',volumePercent:50,bpm:null}}});
  if(url.pathname==='/api/spotify/playlists')return route.fulfill({json:{items:[],total:0,offset:0}});
  if(url.pathname==='/api/spotify/playback'){
   actions.push(JSON.parse(route.request().postData()||'{}'));
   return route.fulfill({status:503,json:{error:'Spotify pause unavailable'}});
  }
  return route.fulfill({status:404,json:{error:'Unexpected fixture request'}});
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/actual-dj-preview`);
 await page.waitForTimeout(1500);
 const initial=await page.evaluate(()=>({title:document.title,preview:!!window.djPreview,live:document.querySelector('.dj-live')?.textContent,spotify:document.querySelector('.sp-status')?.textContent,track:document.querySelector('.sp-title')?.textContent,deck:document.querySelector('[data-deck=b] [data-deck-source-select]')?.value}));
 assert.equal(initial.track,'Fixture track',JSON.stringify({initial,pageErrors}));
 await page.locator('.dj-more').click();
 await page.locator('.dj-tabs [data-view=mix]').click();
 assert.equal(await page.locator('[data-deck=a] [data-deck-source-select]').inputValue(),'spotify');
 assert.equal(await page.locator('[data-deck=b] [data-deck-source-select]').inputValue(),'apple');
 await page.locator('[data-deck=b] .dj-deck-source-open').click();
 await page.waitForFunction(()=>document.querySelector('.dj-live')?.textContent.includes('PAUSE SPOTIFY'));
 assert.deepEqual(actions.map(action=>action.action),['pause']);
 assert.equal(await page.locator('dialog').getAttribute('data-dj-view'),'mix','failed handoff does not switch to Apple');
 assert.equal(await page.locator('.dj-provider-frame').count(),0,'failed handoff does not start a second provider player');
 assert.equal(await page.locator('[data-deck=b] .dj-title').textContent(),'Apple Music');
 await context.close();
});
