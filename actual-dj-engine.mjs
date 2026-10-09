// MYR5 browser audio glue; manual/measured BPM, without native track analysis.
// riseGain/fallGain below are JavaScript ports of BitChord's equal-power pair:
// kushagrasinghx/BitChord, revision 2c599a6cd7a195227a11dab5769f88da8fd08194,
// app/src/main/java/com/music/bitchord/playback/CrossfadeController.kt:2268-2273.
// Upstream is GPL-3.0; preserve its attribution and license in third-party notices.
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const riseGain = progress => Math.sin(clamp(progress, 0, 1) * Math.PI / 2);
const fallGain = progress => Math.cos(clamp(progress, 0, 1) * Math.PI / 2);
const numeric = (n, low, high) => Number.isFinite(Number(n)) ? clamp(Number(n), low, high) : low;
const validBpm = value => Number.isFinite(Number(value)) && Number(value) >= 30 && Number(value) <= 300;

export function createDJEngine({ onChange = () => {}, onError = () => {} } = {}) {
  let context, masterNode, analyser, disposed = false, crossfader = 0, master = .8;
  let transitionJob = null, transitionGeneration = 0, lastEmit = 0;
  const decks = Object.fromEntries(['a', 'b'].map(id => [id, {
    track: null, audio: null, nodes: null, listeners: [], generation: 0,
    bpm: null, rate: 1, cue: 0, loopBeats: 0, loopStart: 0,
    eq: { low: 0, mid: 0, high: 0 }, playing: false, playGeneration: 0,
  }]));
  const getDeck = id => {
    if (disposed) throw new Error('DJ engine has been closed.');
    if (!decks[id]) throw new TypeError('Deck must be a or b.');
    return decks[id];
  };
  function snapshot() {
    return { decks: Object.fromEntries(Object.entries(decks).map(([id, d]) => [id, {
      track: d.track ? { ...d.track } : null, playing: d.playing,
      position: Number.isFinite(d.audio?.currentTime) ? d.audio.currentTime : 0,
      duration: Number.isFinite(d.audio?.duration) ? d.audio.duration : 0,
      bpm: d.bpm, rate: d.rate, cue: d.cue, loopBeats: d.loopBeats,
      eq: { ...d.eq },
    }])), crossfader, master, mixing: Boolean(transitionJob) };
  }
  const emit = () => { if (!disposed) onChange(snapshot()); };
  const fail = error => { if (!disposed) onError(error instanceof Error ? error : new Error(String(error))); };
  function cancelTransition() {
    transitionGeneration++;
    if (transitionJob) {
      clearInterval(transitionJob.timer);
      transitionJob.resolve(false);
      transitionJob = null;
    }
  }
  function applyGains() {
    for (const [id, d] of Object.entries(decks)) {
      if (d.nodes) d.nodes.gain.gain.value = id === 'a' ? fallGain(crossfader) : riseGain(crossfader);
    }
    if (masterNode) masterNode.gain.value = master;
  }
  function ensureGraph(d) {
    if (!context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) throw new Error('This browser does not support DJ audio processing.');
      context = new AudioContextClass();
      masterNode = context.createGain();
      analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = .75;
      masterNode.connect(analyser);
      analyser.connect(context.destination);
    }
    if (!d.nodes) {
      const source = context.createMediaElementSource(d.audio);
      const low = context.createBiquadFilter(), mid = context.createBiquadFilter();
      const high = context.createBiquadFilter(), gain = context.createGain();
      low.type = 'lowshelf'; low.frequency.value = 250;
      mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 1;
      high.type = 'highshelf'; high.frequency.value = 4000;
      source.connect(low); low.connect(mid); mid.connect(high); high.connect(gain); gain.connect(masterNode);
      d.nodes = { source, low, mid, high, gain };
      for (const band of ['low', 'mid', 'high']) d.nodes[band].gain.value = d.eq[band];
    }
    applyGains();
  }
  function release(d) {
    d.generation++; d.playGeneration++;
    d.playing = false;
    if (d.audio) {
      for (const [event, listener] of d.listeners) d.audio.removeEventListener(event, listener);
      d.audio.pause();
      d.audio.removeAttribute('src');
      d.audio.load();
    }
    d.listeners = [];
    if (d.nodes) for (const node of Object.values(d.nodes)) node.disconnect();
    d.nodes = null; d.audio = null;
  }
  function load(id, track) {
    const d = getDeck(id);
    if (track === null) {
      cancelTransition(); release(d); d.track = null; d.bpm = null;
      d.rate = 1; d.cue = 0; d.loopBeats = 0; d.loopStart = 0;
      emit(); return snapshot();
    }
    if (!track || typeof track.url !== 'string') throw new TypeError('Choose a playable track.');
    // Only our bundled assets and browser-owned local blobs enter the mixer.
    if (!/^(?:\/audio\/music\/[a-z0-9-]+\.(?:m4a|mp3|wav|ogg|aac|flac)|blob:[^\s]+)$/i.test(track.url)) throw new TypeError('Choose a bundled track or import a local audio file.');
    cancelTransition(); release(d);
    d.track = { ...track }; d.bpm = validBpm(track.bpm) ? Number(track.bpm) : null;
    d.rate = 1; d.cue = 0; d.loopBeats = 0; d.loopStart = 0;
    const audio = new Audio();
    audio.preload = 'metadata'; audio.crossOrigin = 'anonymous';
    audio.playsInline = true; audio.setAttribute('playsinline', '');
    audio.src = track.url;
    audio.playbackRate = 1;
    d.audio = audio;
    const generation = d.generation;
    for (const event of ['loadedmetadata', 'durationchange', 'play', 'pause', 'ended', 'error']) {
      const listener = () => {
        if (disposed || generation !== d.generation || d.audio !== audio) return;
        if (event === 'play') d.playing = true;
        if (event === 'pause' || event === 'ended' || event === 'error') d.playing = false;
        if (event === 'error') { cancelTransition(); fail(new Error(`Could not load ${d.track.title || 'this track'}.`)); }
        if (event === 'ended' && d.loopBeats && d.bpm) { seek(id, d.loopStart); void play(id); }
        emit();
      };
      audio.addEventListener(event, listener); d.listeners.push([event, listener]);
    }
    audio.load(); emit(); return snapshot();
  }
  async function start(id, internal = false) {
    const d = getDeck(id);
    if (!d.audio) { fail(new Error('Load a track into this deck first.')); return false; }
    if (!internal) cancelTransition();
    const audio = d.audio, generation = d.generation, playGeneration = ++d.playGeneration;
    try {
      ensureGraph(d);
      // Both calls occur before yielding: iOS requires the initiating user gesture.
      const resumed = context.state === 'running' ? Promise.resolve() : context.resume();
      const playing = audio.play();
      await Promise.all([resumed, playing]);
      if (disposed || d.audio !== audio || d.generation !== generation) { audio.pause(); return false; }
      if (playGeneration !== d.playGeneration) return false;
      d.playing = true; emit(); return true;
    } catch (error) {
      if (disposed || d.audio !== audio || d.generation !== generation || playGeneration !== d.playGeneration) return false;
      audio.pause(); d.playing = false;
      fail(new Error(`Playback could not start. Tap Play to retry. ${error.message || ''}`)); emit(); return false;
    }
  }
  const play = id => start(id);
  function pause(id) { const d = getDeck(id); cancelTransition(); d.playGeneration++; d.audio?.pause(); d.playing = false; emit(); }
  const toggle = id => getDeck(id).playing ? (pause(id), Promise.resolve(false)) : play(id);
  function seek(id, seconds) {
    const d = getDeck(id);
    if (!d.audio) return;
    const duration = Number.isFinite(d.audio.duration) ? d.audio.duration : Number.MAX_SAFE_INTEGER;
    d.audio.currentTime = numeric(seconds, 0, duration); emit();
  }
  function setCue(id) { const d = getDeck(id); d.cue = d.audio?.currentTime || 0; emit(); }
  function cue(id) { const d = getDeck(id); if (d.playing) setCue(id); else seek(id, d.cue); }
  function setLoop(id, beats) {
    const d = getDeck(id), value = numeric(beats, 0, 64);
    if (value && !d.bpm) { fail(new Error('Set a BPM before enabling a beat loop.')); return false; }
    d.loopBeats = value; d.loopStart = d.audio?.currentTime || 0; emit(); return true;
  }
  function setBpm(id, bpm) {
    const d = getDeck(id);
    d.bpm = validBpm(bpm) ? Number(bpm) : null;
    if (!d.bpm) d.loopBeats = 0;
    emit();
  }
  function setRate(id, rate) {
    const d = getDeck(id); d.rate = numeric(rate, .5, 2);
    if (d.audio) { d.audio.playbackRate = d.rate; d.audio.preservesPitch = false; d.audio.webkitPreservesPitch = false; }
    emit();
  }
  function setEQ(id, band, db) {
    const d = getDeck(id);
    if (!['low', 'mid', 'high'].includes(band)) throw new TypeError('EQ band must be low, mid or high.');
    d.eq[band] = numeric(db, -24, 12);
    if (d.nodes) d.nodes[band].gain.value = d.eq[band]; emit();
  }
  function setCrossfader(value) { getDeck('a'); cancelTransition(); crossfader = numeric(value, 0, 1); applyGains(); emit(); }
  function setMaster(value) { getDeck('a'); master = numeric(value, 0, 1); applyGains(); emit(); }
  function sync(id) {
    const d = getDeck(id), other = decks[id === 'a' ? 'b' : 'a'];
    if (!d.bpm || !other.bpm) { fail(new Error('Set BPM on both decks before syncing.')); return false; }
    const rate = other.bpm * other.rate / d.bpm;
    if (rate < .5 || rate > 2) { fail(new Error('These BPM values are outside the supported sync range.')); return false; }
    setRate(id, rate); return true;
  }
  async function transition(seconds = 8) {
    getDeck('a'); cancelTransition();
    const token = transitionGeneration, from = crossfader;
    const incoming = from < .5 ? 'b' : 'a', target = incoming === 'b' ? 1 : 0;
    const d = decks[incoming], audio = d.audio, wasPlaying = d.playing, expectedPlayGeneration = d.playGeneration + 1;
    if (!audio) { fail(new Error('Load a track into the incoming deck first.')); return false; }
    if (!await start(incoming, true)) return false;
    if (disposed || token !== transitionGeneration) {
      if (!wasPlaying && d.audio === audio && d.playGeneration === expectedPlayGeneration) { audio.pause(); d.playing = false; emit(); }
      return false;
    }
    const duration = numeric(seconds, .1, 120) * 1000, began = performance.now();
    return new Promise(resolve => {
      transitionJob = { resolve, timer: setInterval(() => {
        if (disposed || token !== transitionGeneration) return cancelTransition();
        const fraction = clamp((performance.now() - began) / duration, 0, 1);
        crossfader = from + (target - from) * fraction; applyGains();
        if (fraction === 1) { clearInterval(transitionJob.timer); transitionJob = null; resolve(true); }
        emit();
      }, 50) };
      emit();
    });
  }
  const ticker = setInterval(() => {
    for (const [id, d] of Object.entries(decks)) {
      if (!d.playing || !d.audio || !d.loopBeats || !d.bpm) continue;
      const end = Math.min(d.loopStart + d.loopBeats * 60 / d.bpm,
        Number.isFinite(d.audio.duration) ? d.audio.duration : Infinity);
      if (end > d.loopStart && d.audio.currentTime >= end) {
        d.audio.currentTime = d.loopStart + ((d.audio.currentTime - end) % (end - d.loopStart));
      }
    }
    if (performance.now() - lastEmit >= 200 && Object.values(decks).some(d => d.playing)) {
      lastEmit = performance.now(); emit();
    }
  }, 25);
  function dispose() {
    if (disposed) return;
    cancelTransition(); disposed = true; clearInterval(ticker);
    Object.values(decks).forEach(release);
    masterNode?.disconnect(); analyser?.disconnect();
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }
  return { load, play, pause, toggle, seek, cue, setCue, setLoop, setBpm, setRate, setEQ,
    setCrossfader, setMaster, sync, transition, snapshot, getAnalyser: () => analyser || null, dispose };
}
