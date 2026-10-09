// Actual MilkDrop rendering: pinned, unmodified Butterchurn + original presets.
// Provenance and MIT notices: ./vendor/butterchurn/README.md.
let libraryPromise;
function script(path) {
  return new Promise((resolve, reject) => {
    const element = document.createElement('script');
    element.src = new URL(path, import.meta.url).href;
    element.onload = resolve;
    element.onerror = () => { element.remove(); reject(Error('Visualizer library could not load.')); };
    document.head.append(element);
  });
}
function libraries() {
  return libraryPromise ??= Promise.all([
    script('./vendor/butterchurn/butterchurn-2.6.7.min.js'),
    script('./vendor/butterchurn/presets-2.4.7.min.js'),
  ]).then(() => ({
    engine: window.butterchurn?.default ?? window.butterchurn,
    presets: window.butterchurnPresets.getPresets(),
  })).catch(error => { libraryPromise = null; throw error; });
}

const SCENES = {
  orbit: ['Flexi - mindblob mix', 'Flexi - mindblob [shiny mix]', 'Flexi - alien fish pond'],
  tunnel: ['martin - glass corridor', 'martin - The Bridge of Khazad-Dum', 'martin - frosty caves 2'],
  spectrum: ['Geiss - Thumb Drum', 'Geiss - Spiral Artifact', 'Geiss - Reaction Diffusion 2'],
  scope: ['Eo.S. + Phat - cubetrace - v2', 'martin - chain breaker', 'Martin - liquid arrows'],
  trails: ['Zylot - Paint Spill (Music Reactive Paint Mix)', 'Cope - The Neverending Explosion of Red Liquid Fire', 'martin - stormy sea (2010 update)'],
};

export function createDJVisualizer(canvas, { getAnalyser = () => null, onStatus = () => {} } = {}) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let running = false, disposed = false, failed = false, pending = false, frame = 0, last = 0;
  let lib, viz, gl, source, gain, scene = 'orbit', palette = 0, react = 1, presetDirty = true;
  let micStream, micContext, micAnalyser, micSource, micGeneration = 0;
  let external = false, lastStatus = '';
  const waveform = new Uint8Array(1024);
  const status = text => { if (text !== lastStatus) { lastStatus = text; onStatus(text); } };
  const selected = () => micAnalyser ?? getAnalyser();
  const dimensions = () => {
    const rect = canvas.getBoundingClientRect();
    return { width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height)), pixelRatio: Math.min(devicePixelRatio || 1, 1.5) };
  };
  function resize() {
    if (!viz) return;
    const { width, height, pixelRatio } = dimensions();
    canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
    viz.setRendererSize(width, height, { pixelRatio });
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  function detach() {
    if (gain) {
      try { source?.disconnect(gain); } catch {}
      try { viz?.disconnectAudio(gain); } catch {}
      gain.disconnect();
    }
    gain = null; source = null; external = false;
  }
  function bind(analyser) {
    detach(); source = analyser;
    // Butterchurn's native processor is tied to its first AudioContext. Its
    // documented render(audioLevels) input handles a microphone in another
    // context without reconnecting incompatible nodes or restarting WebGL.
    external = analyser.context !== viz.audio.audioContext;
    if (!external) {
      gain = analyser.context.createGain(); gain.gain.value = react;
      analyser.connect(gain); viz.connectAudio(gain);
    }
  }
  function preset() {
    const name = SCENES[scene][palette];
    const original = lib.presets[name];
    if (!original) throw Error(`Missing original Butterchurn preset: ${name}`);
    // Upstream loadPreset adds default fields to shapes/waves; copy the
    // official preset so one instance cannot mutate another's preset bank.
    viz.loadPreset(structuredClone(original), motion.matches ? 0 : 1.2);
    presetDirty = false;
    status(`${micAnalyser ? 'Microphone' : 'MYR5 mix'} · Butterchurn · ${name}`);
  }
  async function initialize(analyser) {
    if (pending || disposed || failed) return;
    pending = true;
    try {
      lib = await libraries();
      if (!running || disposed) return;
      const current = selected();
      if (!current || current.context.state === 'closed') return;
      gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
      if (!gl) throw Error('WebGL2 is unavailable. This device cannot run MilkDrop visuals.');
      viz = lib.engine.createVisualizer(current.context, canvas, dimensions());
      viz.setInternalMeshSize(32, 24);
      bind(current); resize(); preset();
    } catch (error) {
      failed = true; status(error.message || 'MilkDrop visualizer could not start.');
    } finally { pending = false; }
  }
  function draw(now) {
    if (!running || disposed) return;
    frame = requestAnimationFrame(draw);
    const interval = 1000 / (motion.matches ? 12 : 30);
    if (now - last < interval) return;
    const delta = last ? Math.min((now - last) / 1000, .1) : 1 / 30;
    last = now;
    const analyser = selected();
    if (!analyser || analyser.context.state === 'closed') {
      if (source) detach();
      status('Choose local audio or microphone for live MilkDrop visuals.'); return;
    }
    if (!viz) { void initialize(analyser); return; }
    if (failed) return;
    try {
      if (source !== analyser) { bind(analyser); presetDirty = true; }
      if (presetDirty) preset();
      // Reduced motion disables preset morphing and lowers frames to twelve.
      // Butterchurn expects elapsedTime as a frame delta, not a playhead.
      if (external) {
        waveform.fill(128);
        analyser.getByteTimeDomainData(waveform);
        for (let i = 0; i < waveform.length; i++) waveform[i] = Math.max(0, Math.min(255, 128 + (waveform[i] - 128) * react));
        viz.render({ elapsedTime: delta, audioLevels: { timeByteArray: waveform, timeByteArrayL: waveform, timeByteArrayR: waveform } });
      } else viz.render({ elapsedTime: delta });
    } catch (error) { failed = true; detach(); status(`MilkDrop stopped: ${error.message}`); }
  }
  function stopMic() {
    micGeneration++;
    if (source === micAnalyser) detach();
    micStream?.getTracks().forEach(track => track.stop()); micStream = null;
    micSource?.disconnect(); micSource = null; micAnalyser = null;
    void micContext?.close().catch(() => {}); micContext = null;
  }
  async function microphone() {
    if (disposed) return false;
    stopMic(); const generation = micGeneration;
    let stream, context;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      if (generation !== micGeneration || disposed) { stream.getTracks().forEach(track => track.stop()); return false; }
      context = new (window.AudioContext || window.webkitAudioContext)();
      micStream = stream; micContext = context;
      micAnalyser = context.createAnalyser(); micAnalyser.fftSize = 1024;
      micSource = context.createMediaStreamSource(stream); micSource.connect(micAnalyser);
      // Nothing connects the microphone to destination: visuals only.
      await context.resume();
      if (generation !== micGeneration || disposed) return false;
      presetDirty = true; status('Microphone → MilkDrop visuals only.'); return true;
    } catch {
      // An older permission request must not close a newer capture session.
      const current = generation === micGeneration;
      if (current) stopMic();
      else { stream?.getTracks().forEach(track => track.stop()); void context?.close().catch(() => {}); }
      if (!disposed && current) status('Microphone unavailable. Allow access or choose the MYR5 mix.');
      return false;
    }
  }
  return {
    start() { if (running || disposed) return; running = true; last = 0; failed = false; frame = requestAnimationFrame(draw); },
    stop() { running = false; cancelAnimationFrame(frame); stopMic(); detach(); },
    microphone,
    useMix() { stopMic(); presetDirty = true; status('MYR5 mix → live MilkDrop visuals.'); },
    setScene(value) { if (SCENES[value]) { scene = value; presetDirty = true; } },
    setReact(value) { react = Math.max(.1, Math.min(3, Number(value) || 1)); if (gain) gain.gain.value = react; },
    // Butterchurn has no universal palette API. This cycles original presets
    // within each scene family; it is an alternate look, not a recolor shader.
    setPalette(value) { palette = ((Math.trunc(Number(value) || 0) % 3) + 3) % 3; presetDirty = true; },
    dispose() {
      disposed = true; running = false; cancelAnimationFrame(frame); stopMic(); detach(); observer.disconnect();
      // Upstream has no destroy(). Losing the owned context releases textures,
      // buffers/programs without deleting another engine's AudioContext.
      gl?.getExtension('WEBGL_lose_context')?.loseContext(); viz = null; lib = null;
    },
  };
}
