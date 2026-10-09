import test from 'node:test';
import assert from 'node:assert/strict';
import {spotifyJamLink,spotifyNowPlaying,handPulse,spotifyPlaylist,spotifyTrack,spotifyDevice} from '../spotify-domain.mjs';

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

test('track and device projections expose only the actual.dj contract fields',()=>{
  const track=spotifyTrack({id:'id123',name:'Track',uri:'spotify:track:id123',artists:[{name:'One'},null,{name:'Two'}],album:{name:'Album',images:[{url:'https://i.scdn.co/x'}]},duration_ms:98765,external_urls:{spotify:'https://open.spotify.com/track/id123'},popularity:99});
  assert.deepEqual(track,{id:'id123',name:'Track',artists:['One','Two'],album:'Album',image:'https://i.scdn.co/x',url:'https://open.spotify.com/track/id123',durationMs:98765,uri:'spotify:track:id123'});
  assert.equal(spotifyTrack(null),null);
  assert.deepEqual(spotifyDevice({id:'d',name:'Phone',is_active:true,is_restricted:false,volume_percent:61,supports_volume:true}),{id:'d',name:'Phone',active:true,restricted:false,volumePercent:61,supportsVolume:true});
  const now=spotifyNowPlaying({is_playing:true,progress_ms:23,shuffle_state:true,repeat_state:'track',device:{id:'d',name:'Phone',volume_percent:61},item:{id:'id123',name:'Track',artists:[],album:{},duration_ms:100}});
  assert.equal(now.shuffle,true);assert.equal(now.repeat,'track');assert.equal(now.deviceId,'d');assert.equal(now.volumePercent,61);
  assert.deepEqual(spotifyNowPlaying(null),{playing:false,track:null,progressMs:0,durationMs:0,device:null,deviceId:null,volumePercent:null,shuffle:false,repeat:'off',bpm:null});
});
