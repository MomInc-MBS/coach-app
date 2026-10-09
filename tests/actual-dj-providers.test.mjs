import test from 'node:test';
import assert from 'node:assert/strict';
import {DJ_PROVIDERS,providerLink} from '../actual-dj-providers.mjs';

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
