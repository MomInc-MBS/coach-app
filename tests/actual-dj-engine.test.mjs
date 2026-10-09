import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDJEngine } from '../actual-dj-engine.mjs';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let engines, audios, contexts;
class MockAudio extends EventTarget {
  constructor() { super(); audios.push(this); this.currentTime = 0; this.duration = 30; this.paused = true; }
  setAttribute() {}
  removeAttribute() { this.src = ''; }
  load() {}
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  play() {
    if (this.blocked) return Promise.reject(new Error('NotAllowedError'));
    this.paused = false; this.dispatchEvent(new Event('play'));
    return this.pending || Promise.resolve();
  }
}
class MockNode {
  constructor(type) {
    this.kind = type; this.gain = { value: 1 }; this.frequency = { value: 0 };
    this.Q = { value: 0 }; this.connections = []; this.disconnected = false;
  }
  connect(node) { this.connections.push(node); }
  disconnect() { this.disconnected = true; }
}
class MockContext {
  constructor() { contexts.push(this); this.state = 'suspended'; this.nodes = []; this.destination = {}; }
  make(type) { const node = new MockNode(type); this.nodes.push(node); return node; }
  createGain() { return this.make('gain'); }
  createBiquadFilter() { return this.make('filter'); }
  createAnalyser() { return this.make('analyser'); }
  createMediaElementSource(audio) { const node = this.make('source'); node.audio = audio; return node; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
const originals = { Audio: globalThis.Audio, AudioContext: globalThis.AudioContext };
beforeEach(() => { engines = []; audios = []; contexts = []; globalThis.Audio = MockAudio; globalThis.AudioContext = MockContext; });
afterEach(() => { engines.forEach(engine => engine.dispose()); Object.assign(globalThis, originals); });
function engine(options) { const value = createDJEngine(options); engines.push(value); return value; }
const track = (bpm = 120) => ({ id: 'test', title: 'Test', url: '/audio/music/main-theme-one.m4a', bpm });

test('audio context starts on play and two decks share a graph with equal-power gains', async () => {
  const dj = engine(); dj.load('a', track()); dj.load('b', track());
  assert.equal(contexts.length, 0); assert.equal(dj.getAnalyser(), null);
  assert.equal(await dj.play('a'), true); assert.equal(await dj.play('b'), true);
  assert.equal(contexts.length, 1);
  const context = contexts[0], master = context.nodes[0], analyser = context.nodes[1];
  assert.equal(dj.getAnalyser(), analyser);
  assert.deepEqual(master.connections, [analyser]); assert.deepEqual(analyser.connections, [context.destination]);
  const channels = context.nodes.filter(node => node.kind === 'gain').slice(1);
  dj.setCrossfader(.5);
  assert.ok(Math.abs(channels[0].gain.value ** 2 + channels[1].gain.value ** 2 - 1) < 1e-10);
  dj.setCrossfader(-9); assert.equal(channels[0].gain.value, 1); assert.equal(channels[1].gain.value, 0);
  dj.setCrossfader(9); assert.ok(channels[0].gain.value < 1e-10); assert.equal(channels[1].gain.value, 1);
  dj.setMaster(9); assert.equal(master.gain.value, 1);
  dj.setMaster(-9); assert.equal(master.gain.value, 0);
  dj.setEQ('a', 'low', -99); dj.setEQ('a', 'mid', 99);
  assert.equal(dj.snapshot().decks.a.eq.low, -24); assert.equal(dj.snapshot().decks.a.eq.mid, 12);
});

test('beat loops and sync require real BPM; sync accounts for the reference rate', async () => {
  const errors = [], dj = engine({ onError: error => errors.push(error.message) });
  dj.load('a', track(null)); dj.load('b', track(150));
  assert.equal(dj.snapshot().decks.a.bpm, null);
  assert.equal(dj.setLoop('a', 4), false); assert.equal(dj.sync('a'), false);
  dj.setBpm('a', 100); dj.setRate('b', 1.2);
  assert.equal(dj.sync('a'), true); assert.equal(dj.snapshot().decks.a.rate, 1.8);
  dj.seek('a', 3); dj.setLoop('a', 2); await dj.play('a');
  audios[0].currentTime = 4.3; await wait(40);
  assert.ok(Math.abs(audios[0].currentTime - 3.1) < 1e-8);
  dj.setBpm('a', null); assert.equal(dj.snapshot().decks.a.loopBeats, 0);
  assert.equal(errors.length, 2);
});

test('cue captures a playing position and returns there while paused; seeking clamps duration', async () => {
  const dj = engine(); dj.load('a', track()); await dj.play('a');
  dj.seek('a', 8); dj.cue('a'); dj.pause('a'); dj.seek('a', 12); dj.cue('a');
  assert.equal(dj.snapshot().decks.a.position, 8);
  dj.seek('a', 90); assert.equal(dj.snapshot().decks.a.position, 30);
  dj.seek('a', -4); assert.equal(dj.snapshot().decks.a.position, 0);
});

test('loading replacement while play is pending cannot mark the new deck playing', async () => {
  const dj = engine(); dj.load('a', track());
  let resolve; audios[0].pending = new Promise(done => { resolve = done; });
  const oldAudio = audios[0], play = dj.play('a');
  dj.load('a', { ...track(), id: 'replacement' }); resolve();
  assert.equal(await play, false); assert.equal(dj.snapshot().decks.a.track.id, 'replacement');
  assert.equal(dj.snapshot().decks.a.playing, false); assert.equal(oldAudio.src, '');
  oldAudio.dispatchEvent(new Event('play')); assert.equal(dj.snapshot().decks.a.playing, false);
});

test('pause cancels a pending start without bringing playback back', async () => {
  const dj = engine(); dj.load('a', track());
  let resolve; audios[0].pending = new Promise(done => { resolve = done; });
  const playing = dj.play('a'); dj.pause('a'); resolve();
  assert.equal(await playing, false); assert.equal(dj.snapshot().decks.a.playing, false);
});

test('loading null unloads the active stream before local object URLs are revoked', async () => {
  const dj = engine(); dj.load('a', { ...track(), url: 'blob:local-audio' }); await dj.play('a');
  const audio = audios[0]; dj.load('a', null);
  assert.equal(audio.src, ''); assert.equal(audio.paused, true);
  assert.equal(dj.snapshot().decks.a.track, null); assert.equal(dj.snapshot().decks.a.bpm, null);
  assert.equal(dj.snapshot().decks.a.playing, false);
});

test('blocked incoming playback preserves original track and crossfader', async () => {
  const errors = [], dj = engine({ onError: error => errors.push(error) });
  dj.load('a', track()); dj.load('b', track()); await dj.play('a');
  audios[1].blocked = true;
  assert.equal(await dj.transition(.1), false);
  assert.equal(dj.snapshot().crossfader, 0); assert.equal(dj.snapshot().decks.a.playing, true);
  assert.equal(dj.snapshot().decks.b.playing, false); assert.equal(errors.length, 1);
});

test('transition finishes using elapsed time and manual crossfader cancels cleanly', async () => {
  const dj = engine(); dj.load('a', track()); dj.load('b', track()); await dj.play('a');
  assert.equal(await dj.transition(.1), true); assert.equal(dj.snapshot().crossfader, 1);
  const transition = dj.transition(1); await wait(70); dj.setCrossfader(.4);
  assert.equal(await transition, false); await wait(70);
  assert.equal(dj.snapshot().crossfader, .4); assert.equal(dj.snapshot().mixing, false);
});

test('manual play during pending transition remains playing when transition cancels', async () => {
  const dj = engine(); dj.load('a', track()); dj.load('b', track());
  let resolve; audios[1].pending = new Promise(done => { resolve = done; });
  const mixing = dj.transition(1); const manual = dj.play('b'); resolve();
  assert.equal(await manual, true); assert.equal(await mixing, false);
  assert.equal(dj.snapshot().decks.b.playing, true);
});

test('dispose closes audio, nodes and ticker; unsafe inputs are rejected', async () => {
  let changes = 0;
  const dj = engine({ onChange: () => changes++ });
  assert.throws(() => dj.load('a', { url: 'https://example.com/song.mp3' }), /local/);
  assert.throws(() => dj.load('c', track()), /Deck/);
  dj.load('a', track()); await dj.play('a');
  dj.dispose(); const before = changes; await wait(250);
  assert.equal(changes, before); assert.equal(contexts[0].state, 'closed');
  assert.equal(audios[0].paused, true); assert.equal(audios[0].src, '');
  assert.ok(contexts[0].nodes.every(node => node.disconnected));
  await assert.rejects(dj.play('a'), /closed/);
});
