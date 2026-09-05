// Procedural level director: builds fair-but-relentless obstacle rows ahead of
// the runner, plus orb ribbons, power-ups, gravity-inversion corridors and the
// warp gates that stitch the five biomes together.
import { LANE_X, CEILING_Y, SPAWN_AHEAD, BIOME_LENGTH } from '../config.js';
import { rand, pick } from '../core/noise.js';
import { BIOMES } from './biomes.js';

const ROW_TYPES = ['single', 'single', 'double', 'jumpline', 'slideline', 'zigzag', 'phase', 'drone', 'padjump', 'crystalwall'];

export class Spawner {
  constructor(pool) {
    this.pool = pool;
    this.reset();
  }

  reset() {
    this.cursorZ = -80;
    this.flip = false;
    this.flipEndZ = 0;
    this.biomeIndex = 0;
    this.nextWarpZ = -BIOME_LENGTH;
    this.nextFlipZ = -430;
    this.sinceGap = 0;
    this.rowsSinceRest = 0;
  }

  get biome() { return BIOMES[this.biomeIndex]; }

  update(playerZ, speed, distance, game) {
    while (this.cursorZ > playerZ - SPAWN_AHEAD) {
      this._emit(speed, distance, game);
    }
  }

  _laneY(local = 0) {
    return this.flip ? CEILING_Y - local : local;
  }

  _spawn(type, lane, zOff, opts = {}) {
    const x = typeof lane === 'number' ? LANE_X[lane] : lane;
    const y = opts.absoluteY !== undefined ? opts.absoluteY : this._laneY(opts.local || 0);
    return this.pool.spawn(type, x, y, this.cursorZ - zOff, { flip: this.flip, ...opts });
  }

  _orbArc(lane, zStart, count, arc = false, gap = 3.4) {
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      const h = arc ? 1.1 + Math.sin(t * Math.PI) * 2.5 : 1.15;
      const y = this.flip ? CEILING_Y - h : h;
      this.pool.spawn('orb', LANE_X[lane], y, zStart - i * gap, { flip: this.flip });
    }
  }

  _emit(speed, distance, game) {
    // --- biome warp gate ---------------------------------------------------
    if (this.cursorZ < this.nextWarpZ) {
      this.cursorZ -= 26;
      if (this.flip) this._endFlip();
      const nextIndex = (this.biomeIndex + 1) % BIOMES.length;
      this._spawn('warp', 0, 0, { data: { biome: nextIndex } });
      this.biomeIndex = nextIndex;
      this.nextWarpZ = this.cursorZ - BIOME_LENGTH;
      this.nextFlipZ = this.cursorZ - rand(360, 560);
      this.cursorZ -= 46;
      return;
    }

    // --- gravity inversion corridor ---------------------------------------
    if (!this.flip && this.cursorZ < this.nextFlipZ && distance > 350) {
      this._startFlip(speed);
      return;
    }
    if (this.flip && this.cursorZ < this.flipEndZ) {
      this._endFlip();
      return;
    }

    const diff = Math.min(1, distance / 2600);
    const gap = Math.max(15, speed * (0.82 - diff * 0.2));

    // occasional breather with a big orb ribbon
    this.rowsSinceRest++;
    if (this.rowsSinceRest > 5 + Math.random() * 4) {
      this.rowsSinceRest = 0;
      const lane = (Math.random() * 3) | 0;
      this._orbArc(lane, this.cursorZ, 7, false, 3.2);
      if (Math.random() < 0.42) {
        const p = pick(['shield', 'magnet', 'x2', 'core']);
        this._spawn(p, lane, 12, { local: 1.3 });
      }
      this.cursorZ -= gap * 1.6;
      if (this.flip) this._maybeCeiling();
      return;
    }

    let kind = pick(ROW_TYPES);
    if (distance < 220) kind = pick(['single', 'single', 'jumpline', 'double']);
    if (kind === 'phase' && distance < 420) kind = 'double';
    if (kind === 'crystalwall' && distance < 700) kind = 'zigzag';
    if (this.flip && (kind === 'padjump' || kind === 'drone')) kind = 'single';

    const laneOrder = [0, 1, 2].sort(() => Math.random() - 0.5);

    switch (kind) {
      case 'single': {
        const t = pick(['barrier', 'pillar', 'gate', 'barrier']);
        this._spawn(t, laneOrder[0], 0, {});
        if (Math.random() < 0.5) this._orbArc(laneOrder[1], this.cursorZ, 4);
        if (t === 'barrier' && Math.random() < 0.5) this._orbArc(laneOrder[0], this.cursorZ + 2, 3, true, 2.6);
        break;
      }
      case 'double': {
        this._spawn(pick(['barrier', 'pillar']), laneOrder[0], 0, {});
        this._spawn(pick(['barrier', 'gate', 'pillar']), laneOrder[1], rand(0, 3), {});
        this._orbArc(laneOrder[2], this.cursorZ - 1, 4);
        break;
      }
      case 'jumpline': {
        for (let l = 0; l < 3; l++) this._spawn('barrier', l, 0, {});
        this._orbArc(1, this.cursorZ + 4, 5, true, 2.8);
        break;
      }
      case 'slideline': {
        for (let l = 0; l < 3; l++) this._spawn('gate', l, 0, {});
        this._orbArc((Math.random() * 3) | 0, this.cursorZ - 2, 4);
        break;
      }
      case 'zigzag': {
        const a = laneOrder[0];
        const b = laneOrder[1];
        this._spawn('pillar', a, 0, {});
        this._spawn('pillar', b, 0, {});
        this._orbArc(laneOrder[2], this.cursorZ, 3);
        this.cursorZ -= gap * 0.75;
        const c = laneOrder[2];
        this._spawn('pillar', c, 0, {});
        this._spawn('pillar', a, 0, {});
        this._orbArc(b, this.cursorZ, 3);
        break;
      }
      case 'phase': {
        const ph = (Math.random() * 2) | 0;
        const openLane = Math.random() < 0.35 ? (Math.random() * 3) | 0 : -1;
        for (let l = 0; l < 3; l++) {
          if (l === openLane) continue;
          this._spawn('phasewall', l, 0, { phase: ph });
        }
        if (openLane >= 0) this._orbArc(openLane, this.cursorZ, 4);
        else this._orbArc(1, this.cursorZ - 4, 4);
        break;
      }
      case 'drone': {
        const e = this._spawn('drone', laneOrder[0], 0, { local: 1.5 });
        e.data.osc = { amp: rand(1.6, 2.4), speed: rand(1.1, 2.0), phase: rand(0, 6.28), base: e.mesh.position.x };
        this._spawn(pick(['barrier', 'pillar']), laneOrder[1], rand(4, 8), {});
        this._orbArc(laneOrder[2], this.cursorZ, 4);
        break;
      }
      case 'padjump': {
        const lane = laneOrder[0];
        this._spawn('pad', lane, 0, {});
        this._orbArc(lane, this.cursorZ - 6, 6, true, 3.6);
        for (const l of [laneOrder[1], laneOrder[2]]) {
          if (Math.random() < 0.7) this._spawn(pick(['pillar', 'crystal']), l, rand(6, 12), {});
        }
        break;
      }
      case 'crystalwall': {
        this._spawn('crystal', laneOrder[0], 0, {});
        this._spawn('crystal', laneOrder[1], rand(0, 2), {});
        this._orbArc(laneOrder[2], this.cursorZ, 4);
        break;
      }
    }

    this.cursorZ -= gap;
    if (this.flip) this._maybeCeiling();
  }

  _startFlip(speed) {
    this.flip = true;
    this._spawn('flip', 0, 0, { data: { flip: true } });
    this.ceilingZ = this.cursorZ + 12;
    this.flipEndZ = this.cursorZ - rand(180, 300);
    this.cursorZ -= 34;
    this._maybeCeiling();
  }

  _endFlip() {
    // trailing slabs then the exit gate
    this._maybeCeiling();
    this.cursorZ -= 20;
    this.flip = false;
    this.pool.spawn('flip', 0, CEILING_Y, this.cursorZ, { flip: true, data: { flip: false } });
    this.cursorZ -= 52;
    this.nextFlipZ = this.cursorZ - rand(620, 950);
  }

  _maybeCeiling() {
    // keep the ceiling slab road ahead of the cursor
    while (this.ceilingZ > this.cursorZ - 40) {
      this.pool.spawn('ceiling', 0, CEILING_Y + 0.2, this.ceilingZ - 12, {});
      this.ceilingZ -= 24;
    }
  }
}
