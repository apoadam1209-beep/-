/* ===== الكيانات: اللاعب، البشر، الكاميرات، أجزاء السفينة، خلايا الطاقة ===== */

class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 34; this.h = 42;
    this.vx = 0; this.vy = 0;
    this.speed = 250;
    this.jump = -560;          // قوة القفز (تنعكس مع اتجاه الجاذبية)
    this.onGround = false;
    this.gravityDir = 1;       // 1 = أسفل، -1 = أعلى
    this.energy = 100; this.maxEnergy = 100;
    this.cloaked = false; this.morphed = false;
    this.facing = 1;
    this.animT = 0;
  }
  get hidden() { return this.cloaked || this.morphed; }
  aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  center() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }

  update(dt, input, level, game) {
    this.cloaked = input.cloakHeld && this.energy > 0 && !this.morphed;
    if (input.consumeMorph()) {
      if (this.morphed) { this.morphed = false; }
      else if (this.energy > 10) { this.morphed = true; this.vx = 0; sfx('morph'); }
    }
    if (input.consumeGravity()) {
      if (this.gravityDir === 1 && this.energy > 15) { this.gravityDir = -1; sfx('gravity'); }
      else if (this.gravityDir === -1) { this.gravityDir = 1; sfx('gravity'); }
    }

    var move = 0;
    if (!this.morphed) {
      if (input.left) move -= 1;
      if (input.right) move += 1;
    }
    this.vx = move * this.speed;
    if (move !== 0) this.facing = move;

    var G = 1500;
    this.vy += G * this.gravityDir * dt;
    var MAXFALL = 700;
    this.vy = clamp(this.vy, -MAXFALL, MAXFALL);
    if (input.consumeJump() && this.onGround && !this.morphed) {
      this.vy = this.jump * this.gravityDir;
      this.onGround = false; sfx('jump');
    }

    this.x += this.vx * dt;
    var i, p;
    for (i = 0; i < level.platforms.length; i++) {
      p = level.platforms[i];
      if (aabb(this.aabb(), p)) {
        if (this.vx > 0) this.x = p.x - this.w;
        else if (this.vx < 0) this.x = p.x + p.w;
        this.vx = 0;
      }
    }
    this.y += this.vy * dt;
    this.onGround = false;
    for (i = 0; i < level.platforms.length; i++) {
      p = level.platforms[i];
      if (aabb(this.aabb(), p)) {
        if (this.vy * this.gravityDir > 0) {
          this.y = this.gravityDir > 0 ? p.y - this.h : p.y + p.h;
          this.vy = 0; this.onGround = true;
        } else if (this.vy * this.gravityDir < 0) {
          this.y = this.gravityDir > 0 ? p.y + p.h : p.y - this.h;
          this.vy = 0;
        }
      }
    }

    var drain = 0;
    if (this.cloaked) drain += 22;
    if (this.morphed) drain += 10;
    if (this.gravityDir === -1) drain += 8;
    if (drain > 0) {
      this.energy = Math.max(0, this.energy - drain * dt);
      if (this.energy === 0) { this.cloaked = false; if (this.gravityDir === -1) this.gravityDir = 1; }
    } else {
      this.energy = Math.min(this.maxEnergy, this.energy + 14 * dt);
    }
    this.animT += dt;
    if (this.y > level.worldH + 220 || this.y < -340) game.respawn();
  }
}

class Human {
  constructor(x, y, range) {
    this.x = x; this.y = y; this.w = 30; this.h = 54;
    this.dir = 1;
    this.patrolMin = x - range; this.patrolMax = x + range;
    this.speed = 70;
    this.visionRange = 270; this.fov = 0.62;
    this.state = 'patrol'; this.chaseT = 0; this.chaseMul = 1.7; this.seeing = false;
  }
  update(dt, player) {
    if (this.state === 'chase') {
      var dx = (player.x + player.w / 2) - (this.x + this.w / 2);
      this.dir = Math.sign(dx) || this.dir;
      this.x += this.dir * this.speed * this.chaseMul * dt;
      this.chaseT -= dt;
      if (this.chaseT <= 0) this.state = 'patrol';
    } else {
      this.x += this.dir * this.speed * dt;
      if (this.x < this.patrolMin) { this.x = this.patrolMin; this.dir = 1; }
      if (this.x > this.patrolMax) { this.x = this.patrolMax; this.dir = -1; }
    }
    this.seeing = false;
    if (!player.hidden) {
      var ex = this.x + this.w / 2, ey = this.y + 12;
      var pc = player.center();
      var d = Math.hypot(pc.x - ex, pc.y - ey);
      if (d < this.visionRange) {
        var ang = Math.atan2(pc.y - ey, pc.x - ex);
        var face = this.dir > 0 ? 0 : Math.PI;
        if (Math.abs(angDiff(ang, face)) < this.fov) this.seeing = true;
      }
    }
    if (this.seeing) { this.state = 'chase'; this.chaseT = 2.2; }
  }
}

class Cam {
  constructor(x, y, baseAngle, range) {
    this.x = x; this.y = y;
    this.baseAngle = baseAngle; this.range = range;
    this.fov = 0.5; this.t = Math.random() * 6; this.angle = baseAngle; this.seeing = false;
  }
  update(dt, player) {
    this.t += dt;
    this.angle = this.baseAngle + Math.sin(this.t * 0.8) * 0.6;
    this.seeing = false;
    if (!player.hidden) {
      var pc = player.center();
      var d = Math.hypot(pc.x - this.x, pc.y - this.y);
      if (d < this.range) {
        var ang = Math.atan2(pc.y - this.y, pc.x - this.x);
        if (Math.abs(angDiff(ang, this.angle)) < this.fov) this.seeing = true;
      }
    }
  }
}

class Part {
  constructor(x, y) { this.x = x; this.y = y; this.r = 18; this.collected = false; this.t = Math.random() * 6; }
  update(dt) { this.t += dt; }
}

class EnergyCell {
  constructor(x, y) { this.x = x; this.y = y; this.r = 15; this.taken = false; this.t = Math.random() * 6; }
  update(dt) { this.t += dt; }
}
