import test from 'node:test';
import assert from 'node:assert/strict';
import {DJ_PROVIDERS,providerLink,getDJSourceChoices,normalizeProviderSourceEntry} from '../actual-dj-providers.mjs';

test('provider links keep source identity and use only official player origins',()=>{
 const links={apple:'https://music.apple.com/us/album/test/12345?i=12346',spotify:'https://open.spotify.com/track/1234567890abcdefghijkl',soundcloud:'https://soundcloud.com/artist/a-track',youtube:'https://youtu.be/dQw4w9WgXcQ',tidal:'https://tidal.com/browse/track/123',deezer:'https://www.deezer.com/us/track/123',bandcamp:'https://artist.bandcamp.com/album/record',amazon:'https://music.amazon.com/albums/B01234567'};
 const origins=['https://embed.music.apple.com','https://open.spotify.com','https://w.soundcloud.com','https://www.youtube-nocookie.com','https://embed.tidal.com','https://widget.deezer.com'];
 for(const p of DJ_PROVIDERS){const v=providerLink(p.id,links[p.id]);assert.ok(v,p.id);assert.equal(v.name,p.name);assert.equal(v.provider,p.id);if(v.embed)assert.ok(origins.includes(new URL(v.embed).origin));else assert.ok(['bandcamp','amazon'].includes(p.id));}
 assert.match(providerLink('apple',links.apple).embed,/\?i=12346$/);
});
test('arbitrary embeds, credential URLs, hostname tricks and nonmusic links are refused',()=>{
 for(const p of DJ_PROVIDERS)for(const url of ['javascript:alert(1)','https://example.com/music','https://music.apple.com.evil.example/us/album/test/123','https://user:password@music.apple.com/us/album/test/123'])assert.equal(providerLink(p.id,url),null);
 assert.equal(providerLink('spotify','https://open.spotify.com/user/1234567890abcdefghijkl'),null);
 assert.equal(providerLink('youtube','https://youtube.com/watch?v=bad'),null);
 assert.equal(providerLink('bandcamp','https://bandcamp.com/album/foo'),null);
 assert.equal(providerLink('deezer','https://www.deezer.com/us/track/123#thing'),null);
});

test('source choices preserve the existing provider picker and declare real playback boundaries',()=>{
 const choices=getDJSourceChoices();
 assert.deepEqual(choices.map(item=>item.id),['local',...DJ_PROVIDERS.map(item=>item.id)]);
 assert.equal(choices[0].route,'local-deck');
 assert.equal(choices[0].capabilities.localMix,true);
 assert.equal(choices[0].capabilities.autoDJ,true);
 for(const source of choices.slice(1)){
  assert.equal(source.capabilities.localMix,false,source.id);
  assert.equal(source.capabilities.autoDJ,false,source.id);
  assert.equal(source.capabilities.manualHandoff,true,source.id);
  assert.equal(source.capabilities.sourceAttributionRequired,true,source.id);
 }
 assert.equal(choices.find(item=>item.id==='spotify').capabilities.controls,'spotify-terminal-separate');
 assert.equal(choices.find(item=>item.id==='bandcamp').route,'external-link');
 assert.equal(choices.find(item=>item.id==='amazon').route,'external-link');
});

test('source-link entries preserve the authored URL and label and derive only an official player route',()=>{
 const raw='https://open.spotify.com/playlist/1234567890abcdefghijkl?si=source-token';
 const entry=normalizeProviderSourceEntry('spotify',raw,'  Warm-up set  ');
 assert.ok(entry);
 assert.equal(entry.kind,'source-link');
 assert.equal(entry.provider,'spotify');
 assert.equal(entry.label,'Warm-up set');
 assert.equal(entry.sourceUrl,raw);
 assert.equal(entry.validatedUrl,'https://open.spotify.com/playlist/1234567890abcdefghijkl?si=source-token');
 assert.equal(entry.embedUrl,'https://open.spotify.com/embed/playlist/1234567890abcdefghijkl');
 assert.equal(entry.route,'official-player');
 assert.equal(entry.capabilities.controls,'spotify-terminal-separate');
 assert.equal(entry.capabilities.localMix,false);
 assert.equal(entry.capabilities.autoDJ,false);
 assert.deepEqual(entry.attribution,{app:'actual.dj',provider:'Spotify',sourceUrl:raw});
 assert.equal('title' in entry,false);
 assert.equal('artists' in entry,false);
 assert.equal(Object.isFrozen(entry),true);
 assert.equal(Object.isFrozen(entry.attribution),true);
});

test('source-link normalization rejects unsafe, oversized, empty, or unsupported input',()=>{
 const valid='https://music.apple.com/us/album/test/12345?i=12346';
 assert.equal(normalizeProviderSourceEntry('unknown',valid,'Set'),null);
 assert.equal(normalizeProviderSourceEntry('apple',valid,' '),null);
 assert.equal(normalizeProviderSourceEntry('apple',valid,'bad\nlabel'),null);
 assert.equal(normalizeProviderSourceEntry('apple',valid,'x'.repeat(121)),null);
 assert.equal(normalizeProviderSourceEntry('apple','https://music.apple.com/'+ 'a'.repeat(2048),'Set'),null);
 assert.equal(normalizeProviderSourceEntry('apple','javascript:alert(1)','Set'),null);
 assert.equal(normalizeProviderSourceEntry('apple','https://user:pass@music.apple.com/us/album/test/12345','Set'),null);
});
