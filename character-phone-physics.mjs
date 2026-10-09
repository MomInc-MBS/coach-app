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
  climb = true,
  safeTiltDegrees = 22.5,
  contain = false,
  tiltExit = false,
} = {}) {
  const safeDimension = (value, fallback = 1) => Number.isFinite(value) ? Math.max(1, value) : fallback;
  const view = { width: safeDimension(width), height: safeDimension(height) };
  const body = { width: safeDimension(bodyWidth), height: safeDimension(bodyHeight) };
  const margin = Math.max(0, Number.isFinite(buffer) ? buffer : 96);
  const restCenter = { x: null, y: null };
  let hasShip = Boolean(ship);
  const safeTilt = Math.max(0, Math.min(60, safeTiltDegrees)) * Math.PI / 180;
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
  let tiltExitFall = false;
  let fallGravity = { x: 0, y: 1 };
  let recoveryStart = { x: 0, y: 0 };
  let climbStart = { x: 0, y: 0 };
  let edge = { x: 0, y: 1 };
  let lastTime = 0;

  const rotatedHalfExtents = () => {
    const c = Math.abs(Math.cos(state.angle)), s = Math.abs(Math.sin(state.angle));
    return { width: (body.width * c + body.height * s) / 2, height: (body.height * c + body.width * s) / 2 };
  };
  const exitBounds = () => {
    const half = rotatedHalfExtents();
    return { left: -view.width / 2 - margin - half.width, right: view.width / 2 + margin + half.width,
      top: -view.height / 2 - margin - half.height, bottom: view.height / 2 + margin + half.height };
  };
  const centerBounds = () => {
    if (!contain) return exitBounds();
    const c = Math.abs(Math.cos(state.angle)), s = Math.abs(Math.sin(state.angle));
    const halfW = Math.min(view.width / 2, (body.width * c + body.height * s) / 2);
    const halfH = Math.min(view.height / 2, (body.height * c + body.width * s) / 2);
    const ox = restCenter.x ?? view.width / 2, oy = restCenter.y ?? view.height / 2;
    return { left: -ox + halfW, right: view.width - ox - halfW, top: -oy + halfH, bottom: view.height - oy - halfH };
  };
  const setPhase = (phase, pose = phase) => {
    state.phase = phase;
    state.pose = pose;
    phaseAge = 0;
    state.active = phase !== 'idle' && phase !== 'gone';
  };
  const gravityAngle = () => Math.atan2(gravityX, gravityY);
  const snapshot = () => ({ ...state });
  const supported = () => Math.abs(gravityX) < 0.2 && gravityY > 0.8;
  const sideways = () => Math.abs(Math.atan2(gravityX, gravityY)) >= 89 * Math.PI / 180;
  const setFallEdge = () => {
    const length = Math.hypot(gravityX, gravityY) || 1;
    edge = { x: gravityX / length, y: gravityY / length };
    fallGravity = { x: gravityX, y: gravityY };
  };
  const fallExitDistance = () => {
    const half = rotatedHalfExtents();
    const ox = (restCenter.x ?? view.width / 2) - view.width / 2;
    const oy = (restCenter.y ?? view.height / 2) - view.height / 2;
    return Math.abs(edge.x) * (view.width / 2 + half.width + margin)
      + Math.abs(edge.y) * (view.height / 2 + half.height + margin)
      - ox * edge.x - oy * edge.y;
  };
  const startFall = (pose = 'fall', canRecover = false) => {
    setFallEdge();
    fallHold = 0;
    fallAge = 0;
    recoverAfterFall = canRecover;
    tiltExitFall = Boolean(tiltExit && canRecover);
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
    // Return along the original platform, never diagonally through the air.
    state.y = 0; state.angle = 0;
    recoveryStart = { x: state.x, y: 0 };
    vx = 0;
    vy = 0;
    recoverAfterFall = false;
    tiltExitFall = false;
    state.shipProgress = 0;
    setPhase('recover', 'walk');
  };
  const beginClimb = () => {
    climbStart = { x: state.x, y: state.y };
    vx = 0;
    vy = 0;
    tiltExitFall = false;
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
    const neutralTilt = Math.abs(Math.atan2(gravityX, gravityY)) <= safeTilt + 1e-9;
    if (neutralTilt) { gravityX = 0; gravityY = 1; }
    const angular = Number.isFinite(input.angularSpeed) ? Math.abs(input.angularSpeed) : 0;
    const shake = Number.isFinite(input.shake) ? Math.max(0, input.shake) : 0;
    const now = Number.isFinite(timeSeconds) ? timeSeconds : lastTime;
    lastTime = now;

    if (shake <= 7) shakeArmed = true;
    if (angular < 1.2) angularArmed = true;

    // An impulse is edge-triggered, so one sustained sensor reading cannot pin
    // the character against a wall. A renewed pulse can add another impulse.
    let shakeTriggered = false;
    if (shake > 14 && shakeArmed && !(shake < 30 && angular > 2 && !sideways())) {
      shakeTriggered = true;
      shakeArmed = false;
      const direction = ((Math.floor(Math.max(0, now) * 10) % 2) ? 1 : -1);
      vx += direction * Math.min(1500, shake * 20);
      vy -= Math.min(780, shake * 10);
      if (['climb', 'wave', 'climb-out'].includes(state.phase)) startFall('fall');
      else if (state.phase === 'idle' || state.phase === 'slide' || state.phase === 'recover') startFall('fall');
      else if (state.phase === 'fall' || state.phase === 'bounce') {
        recoverAfterFall = false;
        tiltExitFall = false;
        clampPosition(true);
      }
      else if (state.phase === 'air-run' || state.phase === 'look-down') { recoverAfterFall = false; tiltExitFall = false; }
    }

    if (sideways() && angular > 2 && angularArmed && !(state.phase === 'recover' && supported()) && !['air-run', 'look-down', 'climb', 'wave', 'climb-out', 'ship', 'gone'].includes(state.phase)) {
      angularArmed = false;
      setFallEdge();
      fallHold = 0;
      fallAge = 0;
      recoverAfterFall = !shakeTriggered;
      tiltExitFall = false;
      setPhase('air-run', 'wiggle');
    }

    // A slow orientation change moves the supported coach across the glass.
    if (state.phase === 'idle' && (!supported() || Math.abs(vx) > 18)) { tiltHold = 0; setPhase('slide', 'slide'); }
    if (['idle', 'slide'].includes(state.phase)) state.angle = Math.max(-.35, Math.min(.35, gravityAngle()));
    if (['fall', 'bounce'].includes(state.phase)) setFallEdge();
    if (!wasSupported && supported() && ['slide', 'fall', 'bounce', 'climb', 'wave', 'climb-out', 'ship', 'gone'].includes(state.phase)) enterRecovery();
    if (!['idle', 'slide', 'recover'].includes(state.phase)) state.angle = gravityAngle();

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
        if (climb && fallHold >= 2 - 1 / 60) { beginClimb(); continue; }
        if (recoverAfterFall && supported() && fallAge >= 0.25) { enterRecovery(); continue; }
        let acceleration = 620;
        if (tiltExit && tiltExitFall) {
          const remaining = Math.max(1 / 60, 1.15 - fallAge);
          const alongVelocity = vx * edge.x + vy * edge.y;
          const distance = fallExitDistance() + 2 - state.x * edge.x - state.y * edge.y;
          acceleration = Math.max(acceleration, 2 * Math.max(0, distance - alongVelocity * remaining) / (remaining * remaining));
        }
        vx += fallGravity.x * acceleration * h;
        vy += fallGravity.y * acceleration * h;
        state.x += vx * h;
        state.y += vy * h;
        if (supported() && state.y > 0) {
          state.y = 0;
          if (vy > 35) { vy = -vy * 0.28; setPhase('bounce', 'wiggle'); }
          else {
            vy = 0;
            if (Math.abs(vx) < 30) { enterRecovery(); continue; }
          }
        }
        state.angle = gravityAngle();
        const beforeX = state.x;
        const beforeY = state.y;
        if (!(tiltExit && tiltExitFall)) clampPosition(true);
        if (state.x !== beforeX || state.y !== beforeY) {
          if (state.phase !== 'bounce') setPhase('bounce', 'wiggle');
        } else if (state.phase === 'bounce' && phaseAge > 0.35) setPhase('fall', 'fall');
        const drag = tiltExit && tiltExitFall ? 1 : Math.pow(0.985, h * 60);
        vx *= drag;
        vy *= drag;
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
        const b = exitBounds();
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
        if (tiltHold >= 0.8) { startFall('fall', tiltExit); continue; }
        vx += gravityX * 480 * h;
        vx *= Math.pow(0.91, h * 60);
        state.x += vx * h;
        const slideLimit = view.width * .15;
        state.x = Math.max(-slideLimit, Math.min(slideLimit, state.x));
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
    // A standing character belongs at its calibrated rest anchor. Early hidden
    // layout measurements must not push it below the eventual platform.
    if (state.phase === 'idle') { state.x = 0; state.y = 0; }
    else if (!['recover', 'climb-out', 'ship', 'gone'].includes(state.phase)) clampPosition(false);
    return snapshot();
  }

  function setRestCenter(x, y) {
    restCenter.x = Number.isFinite(x) ? x : null;
    restCenter.y = Number.isFinite(y) ? y : null;
  }

  function reset() {
    state.x = 0; state.y = 0; state.angle = 0; state.shipProgress = 0;
    setPhase('idle', 'idle');
    vx = 0; vy = 0; phaseAge = 0; fallHold = 0; tiltHold = 0; fallAge = 0; recoverAfterFall = false; tiltExitFall = false;
    gravityX = 0; gravityY = 1; lastTime = 0;
    shakeArmed = true; angularArmed = true;
    return snapshot();
  }

  // Adapters enable boarding only after the selected, authorized model has loaded.
  const setShipAvailable = available => { hasShip = Boolean(available); };
  return { sample, step, resize, reset, setShipAvailable, setRestCenter, state };
}
