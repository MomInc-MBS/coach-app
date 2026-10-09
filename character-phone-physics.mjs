/**
 * Deterministic phone-orientation physics for the customizer character.
 * Coordinates are CSS-pixel offsets from the centered resting pose. `gx` points
 * screen-right and `gy` screen-down; upright is (0, 1). `shake` is acceleration
 * magnitude in m/s² (shake impulses above 14 m/s²) and angularSpeed is
 * radians/second. Poses are renderer hints (`wiggle` for unsupported midair,
 * `greet` for the midpoint wave, `walk` for recovery). The adapter owns sensor
 * permissions, reduced-motion policy, rendering, and persistence.
 */
export function createCharacterPhysics({
  width,
  height,
  bodyWidth,
  bodyHeight,
  buffer = 96,
  ship = false,
} = {}) {
  const safeDimension = (value, fallback = 1) => Number.isFinite(value) ? Math.max(1, value) : fallback;
  const view = { width: safeDimension(width), height: safeDimension(height) };
  const body = { width: safeDimension(bodyWidth), height: safeDimension(bodyHeight) };
  const margin = Math.max(0, Number.isFinite(buffer) ? buffer : 96);
  const hasShip = Boolean(ship);
  const state = { x: 0, y: 0, angle: 0, phase: 'idle', pose: 'idle', active: false, shipProgress: 0 };

  let vx = 0;
  let vy = 0;
  let phaseAge = 0;
  let gravityX = 0;
  let gravityY = 1;
  let shakeArmed = true;
  let angularArmed = true;
  let fallHold = 0;
  let tiltHold = 0;
  let fallAge = 0;
  let recoverAfterFall = false;
  let fallGravity = { x: 0, y: 1 };
  let recoveryStart = { x: 0, y: 0 };
  let climbStart = { x: 0, y: 0 };
  let edge = { x: 0, y: 1 };
  let lastTime = 0;

  const centerBounds = () => ({
    left: -view.width / 2 - margin - body.width / 2,
    right: view.width / 2 + margin + body.width / 2,
    top: -view.height / 2 - margin - body.height / 2,
    bottom: view.height / 2 + margin + body.height / 2,
  });
  const setPhase = (phase, pose = phase) => {
    state.phase = phase;
    state.pose = pose;
    phaseAge = 0;
    state.active = phase !== 'idle' && phase !== 'gone';
  };
  const gravityAngle = () => Math.atan2(gravityX, gravityY);
  const snapshot = () => ({ ...state });
  const supported = () => Math.abs(gravityX) < 0.2 && gravityY > 0.8;
  const sideways = () => Math.abs(gravityX) > 0.8 || gravityY < 0;
  const setFallEdge = () => {
    const length = Math.hypot(gravityX, gravityY) || 1;
    edge = { x: gravityX / length, y: gravityY / length };
    fallGravity = { x: gravityX, y: gravityY };
  };
  const startFall = (pose = 'fall', canRecover = false) => {
    setFallEdge();
    fallHold = 0;
    fallAge = 0;
    recoverAfterFall = canRecover;
    setPhase('fall', pose);
  };
  const clampPosition = (bounce = true) => {
    const b = centerBounds();
    if (state.x < b.left) { state.x = b.left; if (bounce && vx < 0) vx = -vx * 0.68; }
    if (state.x > b.right) { state.x = b.right; if (bounce && vx > 0) vx = -vx * 0.68; }
    if (state.y < b.top) { state.y = b.top; if (bounce && vy < 0) vy = -vy * 0.68; }
    if (state.y > b.bottom) { state.y = b.bottom; if (bounce && vy > 0) vy = -vy * 0.58; }
  };
  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
  const enterRecovery = () => {
    recoveryStart = { x: state.x, y: state.y };
    vx = 0;
    vy = 0;
    recoverAfterFall = false;
    state.shipProgress = 0;
    setPhase('recover', 'walk');
  };
  const beginClimb = () => {
    climbStart = { x: state.x, y: state.y };
    vx = 0;
    vy = 0;
    setPhase('climb', 'climb');
  };

  function sample(input = {}, timeSeconds = 0) {
    const wasSupported = supported();
    const rawX = Number.isFinite(input.gx) ? input.gx : gravityX;
    const rawY = Number.isFinite(input.gy) ? input.gy : gravityY;
    const norm = Math.hypot(rawX, rawY);
    if (norm > 0.05) {
      gravityX = rawX / norm;
      gravityY = rawY / norm;
    }
    const angular = Number.isFinite(input.angularSpeed) ? Math.abs(input.angularSpeed) : 0;
    const shake = Number.isFinite(input.shake) ? Math.max(0, input.shake) : 0;
    const now = Number.isFinite(timeSeconds) ? timeSeconds : lastTime;
    lastTime = now;

    if (shake <= 7) shakeArmed = true;
    if (angular < 1.2) angularArmed = true;

    // An impulse is edge-triggered, so one sustained sensor reading cannot pin
    // the character against a wall. A renewed pulse can add another impulse.
    if (shake > 14 && shakeArmed) {
      shakeArmed = false;
      const direction = ((Math.floor(Math.max(0, now) * 10) % 2) ? 1 : -1);
      vx += direction * Math.min(1500, shake * 20);
      vy -= Math.min(780, shake * 10);
      if (['climb', 'wave', 'climb-out'].includes(state.phase)) startFall('fall');
      else if (state.phase === 'idle' || state.phase === 'slide' || state.phase === 'recover') startFall('fall');
    }

    if (angular > 2 && angularArmed && !['air-run', 'look-down', 'climb', 'wave', 'climb-out', 'ship', 'gone'].includes(state.phase)) {
      angularArmed = false;
      setFallEdge();
      fallHold = 0;
      fallAge = 0;
      recoverAfterFall = true;
      setPhase('air-run', 'wiggle');
    }

    // A slow orientation change moves the supported coach across the glass.
    if (state.phase === 'idle' && (!supported() || Math.abs(vx) > 18)) { tiltHold = 0; setPhase('slide', 'slide'); }
    if (['idle', 'slide'].includes(state.phase)) state.angle = gravityAngle();
    if (['fall', 'bounce'].includes(state.phase)) setFallEdge();
    if (!wasSupported && supported() && ['fall', 'bounce', 'climb', 'wave', 'climb-out', 'ship', 'gone'].includes(state.phase)) enterRecovery();
    if (!['idle', 'recover'].includes(state.phase)) state.angle = gravityAngle();

    return snapshot();
  }

  function step(dt) {
    let remaining = Number.isFinite(dt) ? Math.max(0, Math.min(10, dt)) : 0;
    while (remaining > 1e-9) {
      const h = Math.min(remaining, 1 / 60);
      remaining -= h;
      phaseAge += h;

      if (['air-run', 'look-down'].includes(state.phase)) {
        if (state.phase === 'air-run' && phaseAge >= 0.6 - 1e-6) { setPhase('look-down', 'look-down'); continue; }
        if (state.phase === 'look-down' && phaseAge >= 0.45 - 1e-6) { startFall('fall', recoverAfterFall); continue; }
      }

      if (state.phase === 'fall' || state.phase === 'bounce') {
        // Keep the falling vector aligned with fresh device samples. The edge
        // remembered at fall start is only used to choose the later climb path.
        fallGravity = { x: gravityX, y: gravityY };
        const gravityLength = Math.hypot(gravityX, gravityY) || 1;
        edge = { x: gravityX / gravityLength, y: gravityY / gravityLength };
        fallAge += h;
        fallHold = sideways() ? fallHold + h : 0;
        if (fallHold >= 2 - 1 / 60) { beginClimb(); continue; }
        if (recoverAfterFall && supported() && fallAge >= 0.25) { enterRecovery(); continue; }
        vx += fallGravity.x * 620 * h;
        vy += fallGravity.y * 620 * h;
        state.x += vx * h;
        state.y += vy * h;
        if (supported() && state.y > 0) {
          state.y = 0;
          if (vy > 35) { vy = -vy * 0.28; setPhase('bounce', 'wiggle'); }
          else vy = 0;
        }
        state.angle = gravityAngle();
        const beforeX = state.x;
        const beforeY = state.y;
        clampPosition(true);
        if (state.x !== beforeX || state.y !== beforeY) {
          if (state.phase !== 'bounce') setPhase('bounce', 'wiggle');
        } else if (state.phase === 'bounce' && phaseAge > 0.35) setPhase('fall', 'fall');
        vx *= Math.pow(0.985, h * 60);
        vy *= Math.pow(0.985, h * 60);
        continue;
      }

      if (state.phase === 'climb') {
        state.angle = gravityAngle();
        const t = phaseAge / 3;
        state.x = lerp(climbStart.x, 0, t);
        state.y = lerp(climbStart.y, 0, t);
        if (t >= 1 - 1e-6) { climbStart = { x: state.x, y: state.y }; setPhase('wave', 'wave'); }
        continue;
      }

      if (state.phase === 'wave') {
        state.angle = gravityAngle();
        state.pose = 'greet';
        if (phaseAge >= 2 - 1e-6) { climbStart = { x: state.x, y: state.y }; setPhase('climb-out', 'climb'); }
        continue;
      }

      if (state.phase === 'climb-out') {
        state.angle = gravityAngle();
        const t = phaseAge / 3;
        const b = centerBounds();
        const targetX = edge.x ? (edge.x > 0 ? b.left : b.right) : 0;
        const targetY = edge.y ? (edge.y > 0 ? b.top : b.bottom) : b.top;
        state.x = lerp(climbStart.x, targetX, t);
        state.y = lerp(climbStart.y, targetY, t);
        if (t >= 1 - 1e-6) {
          if (hasShip) setPhase('ship', 'ship');
          else setPhase('gone', 'gone');
        }
        continue;
      }

      if (state.phase === 'ship') {
        state.shipProgress = Math.min(1, phaseAge / 2);
        if (state.shipProgress >= 1) setPhase('gone', 'gone');
        continue;
      }

      if (state.phase === 'recover') {
        const t = phaseAge / 3;
        state.x = lerp(recoveryStart.x, 0, t);
        state.y = lerp(recoveryStart.y, 0, t);
        state.angle = lerp(state.angle, 0, Math.min(1, h * 3));
        if (t >= 1) {
          state.x = 0; state.y = 0; state.angle = 0; vx = 0; vy = 0;
          setPhase('idle', 'idle');
        }
        continue;
      }

      if (state.phase === 'slide') {
        tiltHold = sideways() ? tiltHold + h : 0;
        if (tiltHold >= 0.8) { startFall('fall'); continue; }
        vx += gravityX * 480 * h;
        vx *= Math.pow(0.91, h * 60);
        state.x += vx * h;
        state.y = lerp(state.y, 0, Math.min(1, h * 2));
        clampPosition(true);
        if (supported() && Math.abs(vx) < 8 && Math.abs(state.x) < 4) {
          state.x = 0; state.y = 0; vx = 0;
          setPhase('idle', 'idle');
        }
      }
    }
    state.active = state.phase !== 'idle' && state.phase !== 'gone';
    return snapshot();
  }

  function resize(nextWidth, nextHeight, nextBodyWidth, nextBodyHeight) {
    view.width = safeDimension(nextWidth, view.width);
    view.height = safeDimension(nextHeight, view.height);
    body.width = safeDimension(nextBodyWidth, body.width);
    body.height = safeDimension(nextBodyHeight, body.height);
    clampPosition(false);
    return snapshot();
  }

  function reset() {
    state.x = 0; state.y = 0; state.angle = 0; state.shipProgress = 0;
    setPhase('idle', 'idle');
    vx = 0; vy = 0; phaseAge = 0; fallHold = 0; tiltHold = 0; fallAge = 0; recoverAfterFall = false;
    gravityX = 0; gravityY = 1; lastTime = 0;
    shakeArmed = true; angularArmed = true;
    return snapshot();
  }

  return { sample, step, resize, reset, state };
}
