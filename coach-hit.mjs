// coach-hit.mjs — where the workout coach walks. Pure: pose landmarks in, screen placement out.
// Screen coords are fractions (x right, y down). The floor is a pinhole model with the horizon at the
// user's hips: a coach z times the user's distance away stands higher on screen and 1/z as tall.
// World spot = {X, z}: X is the screen x it would have level with the user, z the distance ratio.
// ponytail: no segmentation occlusion. Spots behind the user (z > 1) always sit clear of them and the
// coach only crosses over in front, so it never needs cutting out. Add pose segmentation masks if it must.

export const COACH = {
  hitSpeed: 1.2,
  hitLimbs: [25, 26, 27, 28], // knees + ankles: kick it away (add 15, 16 for wrist swats)
  spinMs: 700,
  awayMs: 2000,
  heightPerTorso: 1.5,
  ease: 6,
  boxWidth: 0.6,
  stride: 1.1, // walking speed, coach heights per second
  roomDepth: 3, // the user's distance from the camera in coach heights (how slow walking in depth looks)
  depths: [0.85, 1, 1.2, 1.45], // spots it wanders between (1 = level with the user, more = behind)
  gap: 0.03, // screen gap kept between the user's shoulders and the coach
  pauseMs: [1500, 4000],
  crossRoom: 0.15, // the other side must be this much roomier before it crosses over
  horizon: 0, // camera height: 0 = the user's hips, 1 = their knees, negative = above the hips
  turnRate: 8
};

const VISIBLE = 0.45;
const seen = p => p && p.visibility >= VISIBLE;
const distH = (p, q, aspect) => Math.hypot((p.x - q.x) * aspect, p.y - q.y);

// Where the user is: hip centre, shoulder half-width, floor line (knees) and horizon (hips).
export function userAnchor(points, aspect) {
  if (!Array.isArray(points) || ![11, 12, 23, 24].every(i => seen(points[i]))) return null;
  const sx = (points[11].x + points[12].x) / 2, sy = (points[11].y + points[12].y) / 2;
  const hx = (points[23].x + points[24].x) / 2, hy = (points[23].y + points[24].y) / 2;
  const torso = Math.hypot((sx - hx) * aspect, sy - hy);
  const knees = [25, 26].filter(i => seen(points[i])).map(i => points[i].y);
  const floorY = knees.length ? knees.reduce((a, b) => a + b) / knees.length : Math.min(1, hy + torso * 0.9);
  const horizonY = Math.min(hy + COACH.horizon * (floorY - hy), floorY - 0.05);
  return { x: hx, halfW: Math.abs(points[12].x - points[11].x) / 2, floorY, horizonY, height: torso * COACH.heightPerTorso };
}

const halfWidth = (a, z, aspect) => (a.height / z) * COACH.boxWidth / 2 / aspect;

export function project(a, X, z, aspect) {
  const height = a.height / z, half = halfWidth(a, z, aspect);
  const x = 0.5 + (X - 0.5) / z, feetY = a.horizonY + (a.floorY - a.horizonY) / z;
  return { x, feetY, height, box: { left: x - half, right: x + half, top: feetY - height, bottom: feetY } };
}

// Free screen width beside the user.
export const room = (a, side) => (side > 0 ? 1 - (a.x + a.halfW) : a.x - a.halfW);

// Standing on `side` of the user at depth z, `extra` further out. Clamped on screen; `fits` = no clamp needed.
export function spot(a, side, z, aspect, extra = 0) {
  const half = halfWidth(a, z, aspect), want = a.x + side * (a.halfW + COACH.gap + half + extra);
  const x = Math.max(half, Math.min(1 - half, want));
  return { X: 0.5 + (x - 0.5) * z, z, fits: x === want };
}

export class CoachMotion {
  constructor({ aspect = 0.46, now = 0, random = Math.random } = {}) {
    this.aspect = aspect;
    this.random = random;
    this.prevNow = now;
    this.prevPoints = null;
    this.anchor = null; // eased userAnchor
    this.phase = 'offstage'; // offstage → walking ⇄ pausing → spun → away → walking
    this.begun = false;
    this.X = 0;
    this.z = 1;
    this.slot = null; // {side, z, extra}
    this.until = 0; // pause end
    this.yaw = 0;
    this.rotation = 0;
    this.hitStartNow = 0;
    this.direction = 1;
    this.flyFrom = 0;
  }

  // Reps are counting: walk in on the next frame that sees the user.
  begin() { this.begun = true; }

  target() { const s = this.slot; return spot(this.anchor, s.side, s.z, this.aspect, s.extra); }

  // Next spot: a new depth on the same side, or cross over in front when the other side is much roomier.
  pick(first = false) {
    const a = this.anchor, side = this.slot?.side ?? (room(a, 1) >= room(a, -1) ? 1 : -1);
    const fitsAt = sd => COACH.depths.some(z => spot(a, sd, z, this.aspect).fits);
    if (!first && (room(a, -side) > room(a, side) + COACH.crossRoom || (!fitsAt(side) && fitsAt(-side)))) {
      // Only cross from level or in front, so the coach passes in front of the user, never behind.
      this.slot = this.z > 1 ? { side, z: COACH.depths[0], extra: 0, hurry: true } : { side: -side, z: COACH.depths[0], extra: 0 };
      return;
    }
    const open = COACH.depths.filter(z => z !== this.slot?.z && spot(a, side, z, this.aspect).fits);
    const z = open.length ? open[Math.floor(this.random() * open.length)] : Math.max(...COACH.depths);
    const slack = room(a, side) - COACH.gap - 2 * halfWidth(a, z, this.aspect);
    this.slot = { side, z, extra: this.random() * Math.max(0, Math.min(0.1, slack)) };
  }

  // Start just off the edge on the roomier side, level with the user, and walk in.
  enter() {
    const a = this.anchor, side = room(a, 1) >= room(a, -1) ? 1 : -1, half = halfWidth(a, 1, this.aspect);
    this.X = side > 0 ? 1 + half : -half;
    this.z = 1;
    this.slot = { side, z: 1, extra: 0 };
    this.pick(true);
    this.phase = 'walking';
    this.yaw = -side * Math.PI / 2;
  }

  update(points, now) {
    const dt = Math.max((now - this.prevNow) / 1000, 0.001);
    this.prevNow = now;
    const raw = userAnchor(points, this.aspect);
    if (raw) {
      if (!this.anchor) this.anchor = raw;
      else { const f = 1 - Math.exp(-COACH.ease * dt); for (const k in raw) this.anchor[k] += (raw[k] - this.anchor[k]) * f; }
    }
    const a = this.anchor;
    let yawTarget = this.yaw;

    if (!a) {
      // Never seen the user: nothing to stand beside yet.
    } else if (this.phase === 'offstage') {
      if (this.begun) this.enter();
    } else if (this.phase === 'walking' || this.phase === 'pausing') {
      // Hit test against where the coach was drawn last frame.
      const drawn = project(a, this.X, this.z, this.aspect).box;
      if (raw && this.prevPoints) {
        for (const idx of COACH.hitLimbs) {
          const cur = points[idx], prev = this.prevPoints[idx];
          if (!seen(cur) || !seen(prev) || distH(prev, cur, this.aspect) / dt <= COACH.hitSpeed) continue;
          if (cur.x < drawn.left || cur.x > drawn.right || cur.y < drawn.top || cur.y > drawn.bottom) continue;
          this.phase = 'spun';
          this.hitStartNow = now;
          this.direction = Math.sign(cur.x - prev.x) || (a.x < 0.5 ? 1 : -1);
          this.flyFrom = (drawn.left + drawn.right) / 2;
          break;
        }
      }
      if (this.phase !== 'spun') {
        let t = this.target();
        // The user stepped into its spot behind them: re-plan (a clear depth, or cross over in front).
        if (t.z > 1 && !t.fits && !this.slot.hurry) { this.pick(); t = this.target(); }
        const dx = (t.X - this.X) * this.aspect / a.height, dz = (t.z - this.z) * COACH.roomDepth, d = Math.hypot(dx, dz);
        if (this.phase === 'pausing' && d > 0.3) this.phase = 'walking';
        if (this.phase === 'walking') {
          const step = COACH.stride * dt;
          if (d <= step) {
            this.X = t.X; this.z = t.z; this.phase = 'pausing';
            const [lo, hi] = COACH.pauseMs;
            this.until = this.slot.hurry ? now : now + lo + this.random() * (hi - lo);
          } else {
            this.X += (t.X - this.X) * step / d; this.z += (t.z - this.z) * step / d;
            yawTarget = Math.atan2(dx, -dz); // face where it walks: right = +π/2, away = π
          }
        }
        if (this.phase === 'pausing') {
          this.X = t.X; this.z = t.z; // small user shifts: stay put beside them
          yawTarget = -this.slot.side * 0.35; // turned a little toward the user
          if (now >= this.until) { this.pick(); this.phase = 'walking'; }
        }
      }
    } else if (this.phase === 'spun') {
      const u = Math.min((now - this.hitStartNow) / COACH.spinMs, 1), half = halfWidth(a, this.z, this.aspect);
      const off = this.direction > 0 ? 1 + half : -half, x = this.flyFrom + (off - this.flyFrom) * u;
      this.X = 0.5 + (x - 0.5) * this.z;
      this.rotation = this.direction * u * 4 * Math.PI;
      if (u >= 1) { this.phase = 'away'; this.hitStartNow = now; this.rotation = 0; }
    } else if (this.phase === 'away') {
      if (now - this.hitStartNow >= COACH.awayMs) this.enter();
    }

    const turn = Math.atan2(Math.sin(yawTarget - this.yaw), Math.cos(yawTarget - this.yaw));
    this.yaw += turn * (1 - Math.exp(-COACH.turnRate * dt));
    this.prevPoints = Array.isArray(points) ? points.map(p => p && { x: p.x, y: p.y, visibility: p.visibility }) : null;

    const placed = a ? project(a, this.X, this.z, this.aspect) : { x: 0, feetY: 0, height: 0, box: { left: 0, right: 0, top: 0, bottom: 0 } };
    return { phase: this.phase, z: this.z, yaw: this.yaw, rotation: this.rotation, baseHeight: a?.height ?? 0, ...placed };
  }
}
