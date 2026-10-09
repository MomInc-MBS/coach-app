import test from 'node:test';
import assert from 'node:assert/strict';
import { createDJVisualizer } from '../actual-dj-visualizer.mjs';

function browser(getUserMedia) {
  const saved = new Map(), contexts = [], connections = [], frames = new Map();
  const stopped = [], statuses = []; let next = 1;
  function set(name, value) { saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }); }
  const node = context => ({ context, fftSize: 1024, connect(target) { connections.push(target); }, disconnect() {} });
  class AudioContext {
    constructor() { this.state = 'running'; contexts.push(this); this.destination = {}; }
    createAnalyser() { return node(this); }
    createMediaStreamSource() { return node(this); }
    async resume() {}
    async close() { this.state = 'closed'; }
  }
  set('window', { AudioContext });
  set('navigator', { mediaDevices: { getUserMedia } });
  set('matchMedia', () => ({ matches: false }));
  set('ResizeObserver', class { observe() {} disconnect() { stopped.push('observer'); } });
  set('requestAnimationFrame', fn => { const id = next++; frames.set(id, fn); return id; });
  set('cancelAnimationFrame', id => frames.delete(id));
  return {
    contexts, connections, frames, stopped, statuses,
    create() { return createDJVisualizer({}, { onStatus: s => statuses.push(s) }); },
    restore() { for (const [name, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]; },
  };
}
function capture() {
  let stops = 0;
  return { stream: { getTracks: () => [{ stop: () => stops++ }] }, stops: () => stops };
}

test('closing while microphone permission is pending immediately stops the late stream', async () => {
  let resolve; const pending = new Promise(r => { resolve = r; });
  const environment = browser(() => pending), audio = capture();
  try {
    const visual = environment.create(), request = visual.microphone();
    visual.dispose(); resolve(audio.stream);
    assert.equal(await request, false);
    assert.equal(audio.stops(), 1);
    assert.equal(environment.contexts.length, 0);
    assert.equal(await visual.microphone(), false);
  } finally { environment.restore(); }
});

test('older microphone request cannot close a newer successful capture', async () => {
  const waiting = []; const environment = browser(() => new Promise((resolve, reject) => waiting.push({ resolve, reject })));
  const audio = capture();
  try {
    const visual = environment.create(), first = visual.microphone(), second = visual.microphone();
    waiting[1].resolve(audio.stream); assert.equal(await second, true);
    waiting[0].reject(Error('Old request denied')); assert.equal(await first, false);
    assert.equal(audio.stops(), 0);
    assert.equal(environment.contexts[0].state, 'running');
    assert.equal(environment.statuses.at(-1), 'Microphone → MilkDrop visuals only.');
    visual.stop();
    assert.equal(audio.stops(), 1);
    assert.equal(environment.contexts[0].state, 'closed');
  } finally { environment.restore(); }
});

test('microphone is never monitored to speakers and stopping cancels rendering', async () => {
  const audio = capture(), environment = browser(async () => audio.stream);
  try {
    const visual = environment.create();
    visual.start(); assert.equal(environment.frames.size, 1);
    assert.equal(await visual.microphone(), true);
    assert.equal(environment.connections.length, 1);
    assert.notEqual(environment.connections[0], environment.contexts[0].destination);
    visual.stop();
    assert.equal(environment.frames.size, 0);
    assert.equal(audio.stops(), 1);
    visual.dispose(); assert.ok(environment.stopped.includes('observer'));
  } finally { environment.restore(); }
});
