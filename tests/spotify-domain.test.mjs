import test from 'node:test';
import assert from 'node:assert/strict';
import {spotifyJamLink,spotifyNowPlaying,handPulse,spotifyPlaylist} from '../spotify-domain.mjs';

test('Jam links accept Spotify hosts and reject redirects and unrelated content',()=>{
  assert.equal(spotifyJamLink('https://spotify.link/AbC123'),'https://spotify.link/AbC123');
  assert.equal(spotifyJamLink('https://open.spotify.com/socialsession/AbC123'),'https://open.spotify.com/socialsession/AbC123');
  for(const value of ['javascript:alert(1)','https://spotify.link.evil.example/a','https://open.spotify.com/track/abc','https://user@spotify.link/abc','http://spotify.link/abc'])assert.equal(spotifyJamLink(value),null);
});
test('API data is reduced and tempo is never invented',()=>{
  const now=spotifyNowPlaying({is_playing:true,progress_ms:17500,item:{id:'a',name:'Song',duration_ms:200000,artists:[{name:'Artist'}],album:{images:[{url:'https://i.scdn.co/image/x'}]},external_urls:{spotify:'https://open.spotify.com/track/a'},popularity:99}});
  assert.deepEqual(now.track.artists,['Artist']);assert.equal(now.bpm,null);assert.equal(now.track.popularity,undefined);
  assert.equal(handPulse(now.bpm,now.progressMs),null);
  assert.equal(handPulse(180,0).movementBpm,30);
  assert.ok(Math.abs(handPulse(180,1000).phase-.5)<1e-10);
  assert.equal(spotifyPlaylist({name:'Set',items:{total:12}}).tracks,12);
});
