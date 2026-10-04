// coach-hit.mjs — where the workout coach walks. Pure: pose landmarks in, screen placement out.
// Screen coords are fractions (x right, y down). The floor is a pinhole model with the horizon at the
// user's hips: a coach z times the user's distance away stands higher on screen and 1/z as tall.
// World spot = {X, z}: X is the screen x it would have level with the user, z the distance ratio.
// ponytail: no segmentation occlusion. Spots behind the user (z > 1) always sit clear of them and the
// coach only crosses over in front, so it never needs cutting out. Add pose segmentation masks if it must.

export const COACH = {
  hitSpeed: 1.2,
  hitLimbs: [13, 14, 15, 16, 25, 26, 27, 28, 29, 30, 31, 32],
  launchSpeedT: 4,
  sparseSpeedT: 2.2,
  minReachT: .35,
  hitPadT: .2,
  maxLimbGapMs: 750,
  grabGraceMs: 1000,
  throwSpeedT: 1.5,
  throwWindowMs: 500,
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
  turnRate: 8,
  grabMs: 1000,
  holdMs: 8000,
  dropMs: 400,
  grabLimbs: [15, 16], // wrists are more stable than fingertips
  chargeAfterMs: 8000, // counting time in the set before he charges (once per begin())
  judgeMs: 1200,       // how long he lies there judging the user's balance
  steady: 0.15,        // max hip-centre shift ÷ torso length that still counts as "didn't budge"
  swipeMs: 1800, agreeMs: 1900, laughMs: 3400 // rig clip lengths (GESTURES.swipe/agree/laugh in creature/source/motion.ts)
};

const VISIBLE = 0.45;
const seen = p => p && p.visibility >= VISIBLE;
const distH = (p, q, aspect) => Math.hypot((p.x - q.x) * aspect, p.y - q.y);
const limbSeen=p=>seen(p)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
// A segment crossing the box counts even when neither endpoint lands inside it.
export function sweptHit(p,q,box,padX=0,padY=0){
 let lo=0,hi=1;
 for(const [start,end,min,max] of [[p.x,q.x,box.left-padX,box.right+padX],[p.y,q.y,box.top-padY,box.bottom+padY]]){
  const d=end-start;if(Math.abs(d)<1e-9){if(start<min||start>max)return false;continue;}
  const a=(min-start)/d,b=(max-start)/d;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return false;
 }
 return true;
}

// Where the user is: hip centre, shoulder half-width, floor line (knees) and horizon (hips).
export function userAnchor(points, aspect) {
  if (!Array.isArray(points) || ![11, 12, 23, 24].every(i => limbSeen(points[i]))) return null;
  const sx = (points[11].x + points[12].x) / 2, sy = (points[11].y + points[12].y) / 2;
  const hx = (points[23].x + points[24].x) / 2, hy = (points[23].y + points[24].y) / 2;
  const torso = Math.hypot((sx - hx) * aspect, sy - hy);
  if(torso<=.015)return null;
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
  constructor({ aspect = 0.46, now = 0, random = Math.random, play = true } = {}) {
    this.play = play; // false = kick-only (four-legged coaches): no grab, no charge
    this.aspect = aspect;
    this.random = random;
    this.prevNow = now;
    this.prevPoints = null;
    this.prevPoseNow = now;
    this.handSeenAt = now;
    this.grabMissAt = null;
    this.handHistory = [];
    this.throwVelocity = null;
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
    this.grabLimb = -1;
    this.grabSince = 0;
    this.heldSince = 0;
    this.dropAt = 0;
    this.dy = 0;
    this.dropFrom = 0;
    this.charged = false;
    this.beginNow = 0;
    this.phaseAt = 0;
    this.hip0 = 0;
    this.shift = 0;
  }

  // Reps are counting: walk in on the next frame that sees the user.
  begin() { this.begun = true; this.charged = false; this.beginNow = this.prevNow; }

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
    this.phase = 'walking';this.dy=0;
    this.yaw = -side * Math.PI / 2;
  }

  launch(cur,prev,now,drawn){
    const dx=(cur.x-prev.x)*this.aspect,dy=cur.y-prev.y,length=Math.hypot(dx,dy);
    this.direction=Math.sign(dx)||1;this.flyFrom=(drawn.left+drawn.right)/2;this.flyFromY=drawn.bottom;
    const nx=length>0?dx/length:this.direction,ny=length>0?dy/length:0,half=(drawn.right-drawn.left)/2,height=drawn.bottom-drawn.top;
    const xdist=Math.abs(nx)>1e-6?((nx>0?1+half-this.flyFrom:this.flyFrom+half)*this.aspect/Math.abs(nx)):Infinity;
    const ydist=Math.abs(ny)>1e-6?(ny>0?1+height-this.flyFromY:this.flyFromY)/Math.abs(ny):Infinity;
    const distance=Math.min(xdist,ydist)+.03;
    this.flyDx=nx*distance/this.aspect;this.flyDy=ny*distance;
    this.phase='spun';this.hitStartNow=now;this.grabLimb=-1;this.handHistory=[];this.throwVelocity=null;
  }
  strike(points,now,box,skip=-1){
    const gap=now-this.prevPoseNow;if(!this.prevPoints||gap<=0||gap>COACH.maxLimbGapMs)return null;
    const torso=this.anchor.height/COACH.heightPerTorso,dt=gap/1000;
    const threshold=COACH.launchSpeedT+(COACH.sparseSpeedT-COACH.launchSpeedT)*Math.min(1,Math.max(0,(gap-120)/280));
    for(const idx of COACH.hitLimbs){
      if(idx===skip)continue;const cur=points?.[idx],prev=this.prevPoints[idx];
      if(!limbSeen(cur)||!limbSeen(prev))continue;
      const travel=distH(prev,cur,this.aspect)/torso;
      if(travel<COACH.minReachT||travel/dt<threshold)continue;
      if(sweptHit(prev,cur,box,COACH.hitPadT*torso/this.aspect,COACH.hitPadT*torso))return {cur,prev};
    }
    return null;
  }
  tick(now){return now>this.prevNow?this.update(null,now,false):null;}
  update(points, now, sample=true) {
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
      // Hover grab: a grab limb resting inside the box for grabMs lifts the coach by the head.
      let hover = -1;
      if (raw && this.play) for (const idx of COACH.grabLimbs) {
        const p = points[idx];
        if (seen(p) && p.x >= drawn.left && p.x <= drawn.right && p.y >= drawn.top && p.y <= drawn.bottom) { hover = idx; break; }
      }
      // A frame with no user (tracker blink) keeps the timer: only a hand seen elsewhere resets it.
      if (sample && hover < 0) {this.grabMissAt??=now;if(now-this.grabMissAt>COACH.grabGraceMs/2)this.grabLimb=-1;}
      else if (hover >= 0) {
        this.grabMissAt=null;
        if (this.grabLimb !== hover) { this.grabLimb = hover; this.grabSince = now; }
        if (now - this.grabSince >= COACH.grabMs) { this.phase = 'held'; this.heldSince = now;this.handSeenAt=now;this.handHistory=[];this.throwVelocity=null; }
      }
      if (this.play && this.phase === 'pausing' && !this.charged && now - this.beginNow >= COACH.chargeAfterMs) {
        this.charged = true;
        this.phase = 'charge';
        this.slot = { side: this.slot.side, z: 1, extra: -COACH.gap };
      }

      if (this.phase !== 'held' && this.phase !== 'charge') {
        // Kick test against where the coach was drawn last frame.
        const hit=raw?this.strike(points,now,drawn):null;
        if(hit)this.launch(hit.cur,hit.prev,now,drawn);
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
      }
    } else if (this.phase === 'charge') {
      const t = this.target(), dx = (t.X - this.X) * this.aspect / a.height, dz = (t.z - this.z) * COACH.roomDepth, d = Math.hypot(dx, dz), step = COACH.stride * dt;
      if (d <= step) { this.X = t.X; this.z = t.z; this.phase = 'swiping'; this.phaseAt = now; yawTarget = -this.slot.side * Math.PI / 2; }
      else { this.X += (t.X - this.X) * step / d; this.z += (t.z - this.z) * step / d; yawTarget = Math.atan2(dx, -dz); }
    } else if (this.phase === 'swiping') {
      yawTarget = -this.slot.side * Math.PI / 2; // squared up to the user
      if (now - this.phaseAt >= COACH.swipeMs) { this.phase = 'fallen'; this.phaseAt = now; this.hip0 = raw ? raw.x : a.x; this.shift = 0; }
    } else if (this.phase === 'fallen') {
      // Judge: the biggest hip-centre shift while he lies there, in torso lengths (x in the same units distH uses).
      if (raw) this.shift = Math.max(this.shift, Math.abs(raw.x - this.hip0) * this.aspect / (a.height / COACH.heightPerTorso));
      if (now - this.phaseAt >= COACH.judgeMs) { this.phase = this.shift < COACH.steady ? 'impressed' : 'laughing'; this.phaseAt = now; }
    } else if (this.phase === 'impressed' || this.phase === 'laughing') {
      yawTarget = -this.slot.side * 0.35;
      if (now - this.phaseAt >= (this.phase === 'impressed' ? COACH.agreeMs : COACH.laughMs)) { this.pick(); this.phase = 'walking'; }
    } else if (this.phase === 'held') {
      const p = points?.[this.grabLimb];
      const drawn=project(a,this.X,this.z,this.aspect).box;drawn.top+=this.dy;drawn.bottom+=this.dy;
      const hit=raw?this.strike(points,now,drawn):null;
      if(hit){this.launch(hit.cur,hit.prev,now,drawn);}
      else if ((now-this.handSeenAt>COACH.grabGraceMs) || now - this.heldSince >= COACH.holdMs) {
        // A recently moving hand releases with its observed velocity; a stale hand simply drops.
        const velocity=this.throwVelocity;
        if(velocity&&now-velocity.t<=COACH.throwWindowMs){
          this.launch({x:velocity.x+velocity.vx,y:velocity.y+velocity.vy},{x:velocity.x,y:velocity.y},now,drawn);
        }else{
          this.phase = 'dropped';
          this.dropAt = now;
          this.dropFrom = this.dy;
          this.grabLimb = -1;
        }
      } else if (raw&&limbSeen(p)) {
        this.handSeenAt=now;
        this.handHistory.push({x:p.x,y:p.y,t:now});this.handHistory=this.handHistory.filter(h=>now-h.t<=COACH.throwWindowMs);
        const first=this.handHistory[0],span=(now-first.t)/1000,torso=a.height/COACH.heightPerTorso;
        if(span>0){const vx=(p.x-first.x)/span,vy=(p.y-first.y)/span;if(Math.hypot(vx*this.aspect,vy)/torso>=COACH.throwSpeedT&&distH(first,p,this.aspect)/torso>=COACH.minReachT)this.throwVelocity={x:p.x,y:p.y,vx,vy,t:now};}
        // A moving hand that becomes unseen is a release; one still, missing sample keeps the grip.
        // The box top-centre follows the limb; feet hang below it.
        this.X = 0.5 + (p.x - 0.5) * this.z;
        const base = project(a, this.X, this.z, this.aspect);
        this.dy = p.y + base.height - base.feetY;
      }
      if(this.phase==='held'&&sample&&!limbSeen(p)&&this.throwVelocity&&now-this.throwVelocity.t<=COACH.throwWindowMs){
        const v=this.throwVelocity;this.launch({x:v.x+v.vx,y:v.y+v.vy},{x:v.x,y:v.y},now,drawn);
      }
    } else if (this.phase === 'dropped') {
      const u = Math.min((now - this.dropAt) / COACH.dropMs, 1);
      this.dy = this.dropFrom * (1 - u);
      if (u >= 1) { this.dy = 0; this.phase = 'walking'; }
    } else if (this.phase === 'spun') {
      const u = Math.min((now - this.hitStartNow) / COACH.spinMs, 1);
      const x = this.flyFrom + this.flyDx * u;
      this.X = 0.5 + (x - 0.5) * this.z;
      const base=project(a,this.X,this.z,this.aspect);this.dy=this.flyFromY+this.flyDy*u-base.feetY;
      this.rotation = this.direction * u * 4 * Math.PI;
      if (u >= 1) { this.phase = 'away'; this.hitStartNow = now; this.rotation = 0; }
    } else if (this.phase === 'away') {
      if (now - this.hitStartNow >= COACH.awayMs) this.enter();
    }

    const turn = Math.atan2(Math.sin(yawTarget - this.yaw), Math.cos(yawTarget - this.yaw));
    this.yaw += turn * (1 - Math.exp(-COACH.turnRate * dt));
    if(sample){this.prevPoseNow=now;this.prevPoints = Array.isArray(points) ? points.map(p => p && { x: p.x, y: p.y, visibility: p.visibility }) : null;}

    const placed = a ? project(a, this.X, this.z, this.aspect) : { x: 0, feetY: 0, height: 0, box: { left: 0, right: 0, top: 0, bottom: 0 } };
    if (this.dy !== 0) {
      placed.feetY += this.dy;
      placed.box.top += this.dy;
      placed.box.bottom += this.dy;
    }
    return { phase: this.phase, z: this.z, yaw: this.yaw, rotation: this.rotation, baseHeight: a?.height ?? 0, ...placed, dy: this.dy, side: this.slot?.side ?? 1, shift: this.shift };
  }
}
