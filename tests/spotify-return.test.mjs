import test from 'node:test';
import assert from 'node:assert/strict';
import {spotifyReturnMessage} from '../spotify-return.mjs';
test('failed OAuth returns explain recovery instead of appearing connected',()=>{
  for(const result of ['denied','expired','failed','browser','notlisted','incomplete'])assert.match(spotifyReturnMessage(result),/Connect Spotify/);
  assert.equal(spotifyReturnMessage('connected'),null);assert.equal(spotifyReturnMessage(null),null);
});
