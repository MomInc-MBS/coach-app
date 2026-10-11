import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createDJPreviewServer} from '../scripts/actual-dj-preview.mjs';

function wav(){const length=16000,data=Buffer.alloc(44+length*2);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(8000,24);data.writeUInt32LE(16000,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(length*2,40);for(let i=0;i<length;i++)data.writeInt16LE(Math.round(Math.sin(i/8000*440*Math.PI*2)*12000),44+i*2);return data;}

test('actual.dj plays actual media, persists imports, hands off providers and preserves Spotify control', {timeout:120000},async t=>{
 const server=createDJPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 t.after(async()=>{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 const page=await browser.newPage({viewport:{width:375,height:667}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=`http://127.0.0.1:${server.address().port}`;await page.goto(base+'/actual-dj-preview');await page.locator('.dj-more').click();await page.locator('.dj-tabs [data-view=mix]').click();
 await page.waitForFunction(()=>document.querySelector('[data-deck=a] .dj-title')?.textContent==='Hey Man IDK');
 assert.equal(await page.locator('.dj-track-list .dj-crate-row').count(),6);
 await page.locator('[data-deck=a] .dj-play').click();await page.waitForFunction(()=>document.querySelector('[data-deck=a]')?.classList.contains('dj-playing'));
 await page.waitForFunction(()=>document.querySelector('[data-deck=a] .dj-time')?.textContent.startsWith('0:01'));
 await page.locator('.dj-tabs [data-view=visuals]').click();await page.waitForFunction(()=>document.querySelector('.dj-visual-status')?.textContent.includes('Butterchurn'));
 await page.locator('.dj-scene').selectOption('tunnel');await page.waitForFunction(()=>document.querySelector('.dj-visual-status')?.textContent.includes('glass corridor'));
 await mkdir('.actual-dj',{recursive:true});await page.screenshot({path:'.actual-dj/visualizer-375.png'});
 await page.locator('.dj-tabs [data-view=mix]').click();
 await page.locator('[data-deck=a] .dj-play').click();
 await page.locator('.dj-files').setInputFiles({name:'Studio test.wav',mimeType:'audio/wav',buffer:wav()});
 await page.waitForFunction(()=>document.querySelectorAll('.dj-track-list .dj-crate-row').length===7);
 await page.locator('.dj-track-list .dj-crate-row').filter({hasText:'Studio test'}).locator('[data-load=queue]').click();assert.equal(await page.locator('.dj-queue-row').count(),1);
 await page.reload();await page.locator('.dj-more').click();await page.locator('.dj-tabs [data-view=mix]').click();await page.waitForFunction(()=>document.querySelectorAll('.dj-track-list .dj-crate-row').length===7);assert.equal(await page.locator('.dj-queue-row').count(),1);
 await page.locator('.dj-track-list .dj-crate-row').filter({hasText:'Studio test'}).locator('[data-load=a]').click();
 await page.locator('[data-deck=a] .dj-play').click();await page.waitForFunction(()=>document.querySelector('[data-deck=a]')?.classList.contains('dj-playing'));
 await page.locator('.dj-tabs [data-view=providers]').click();assert.equal(await page.locator('.dj-playing').count(),0);
 await page.locator('#djSourceUrl').fill('https://music.apple.com/us/album/studio/12345?i=12346');
 await page.locator('.dj-source-form button').click();assert.match(await page.locator('.dj-provider-frame').getAttribute('src'),/^https:\/\/embed.music.apple.com/);assert.match(await page.locator('.dj-source-open').getAttribute('href'),/music.apple.com/);
 await page.locator('.dj-provider-grid [data-provider=youtube]').click();assert.equal(await page.locator('.dj-provider-frame').count(),0);
 await page.locator('.dj-tabs [data-view=mix]').click();await page.screenshot({path:'.actual-dj/decks-375.png'});
 const dimensions=await page.locator('.actual-dj').evaluate(n=>({width:n.clientWidth,scrollWidth:n.scrollWidth,screen:n.querySelector('.sp-screen').clientWidth,screenScroll:n.querySelector('.sp-screen').scrollWidth}));assert.ok(dimensions.scrollWidth<=dimensions.width+1,JSON.stringify(dimensions));assert.ok(dimensions.screenScroll<=dimensions.screen+1,JSON.stringify(dimensions));
 // Reinitialize with a signed-in API fixture: no real account is changed.
 await page.evaluate(async()=>{window.djPreview.dispose();const {initSpotifyTerminal}=await import('/spotify-terminal.mjs');window.spActions=[];window.djAccount={user:{id:'test'},dataEpoch:1};window.spotifyTest=initSpotifyTerminal({getAccount:()=>window.djAccount,request:async(path,options={})=>{if(path==='/api/spotify/status')return Response.json({connected:true,account:{name:'DJ TEST'}});if(path==='/api/spotify/now-playing')return Response.json({nowPlaying:{playing:false,track:null}});if(path.startsWith('/api/spotify/playlists'))return Response.json({items:[],total:0});if(path.startsWith('/api/spotify/search')&&window.holdSpotifySearch)return new Promise(resolve=>{window.finishSpotifySearch=()=>resolve(Response.json({items:[{id:'1234567890abcdefghijkl',name:'Old account track',artists:[]}],total:1}));});if(path.startsWith('/api/spotify/search'))return Response.json({items:[{id:'1234567890abcdefghijkl',name:'Search track',artists:['Artist'],url:'https://open.spotify.com/track/1234567890abcdefghijkl'}],total:1});if(path==='/api/spotify/playback'){window.spActions.push(JSON.parse(options.body));return Response.json({ok:true});}return Response.json({error:'fixture unavailable'},{status:404});}});window.spotifyTest.open();});
 await page.locator('.dj-more').click();await page.locator('.dj-tabs [data-view=spotify]').click();await page.waitForFunction(()=>document.querySelector('.sp-account-name')?.textContent==='DJ TEST');
 await page.locator('.sp-hand [data-action=next]').click();await page.waitForFunction(()=>window.spActions.some(a=>a.action==='next'));
 await page.locator('#djSpotifySearch').fill('Search track');await page.locator('.dj-spotify-search button').click();await page.waitForFunction(()=>document.querySelector('.dj-spotify-results')?.textContent.includes('Search track'));
 await page.locator('.dj-spotify-results button').filter({hasText:'PLAY'}).click();await page.waitForFunction(()=>window.spActions.some(a=>a.action==='track'));
 for(const width of [390,1024]){await page.setViewportSize({width,height:844});await page.locator('.dj-tabs [data-view=mix]').click();const bounds=await page.locator('.sp-screen').evaluate(n=>[n.clientWidth,n.scrollWidth]);assert.ok(bounds[1]<=bounds[0]+1,`width ${width}: ${bounds}`);}
 // A late search response must never repopulate the next account's library.
 await page.locator('.dj-tabs [data-view=spotify]').click();
 await page.evaluate(()=>{window.holdSpotifySearch=true;});
 await page.locator('#djSpotifySearch').fill('Old account track');await page.locator('.dj-spotify-search button').click();
 await page.waitForFunction(()=>!!window.finishSpotifySearch);
 await page.evaluate(()=>{window.djAccount={user:{id:'next-account'},dataEpoch:2};window.dispatchEvent(new Event('myr5:account-cleared'));window.spotifyTest.open();window.finishSpotifySearch();});
 await page.waitForFunction(()=>document.querySelector('.sp-account-name')?.textContent==='DJ TEST');
 assert.equal(await page.locator('.dj-spotify-results .dj-crate-row').count(),0);
 assert.equal(await page.locator('.dj-spotify-status').textContent(),'');
 await page.locator('.sp-close').click();assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('.dj-playing').count(),0);
 assert.deepEqual(errors,[]);
});
