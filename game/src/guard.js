// guard.js — a museum guard: patrols waypoints, watches a vision cone,
// grows suspicious, then alerted, then searches. All positions in tiles.

import {
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_SEARCH_SPEED,
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  DETECT_BASE_RATE,
  DETECT_LIT_MULT,
  DETECT_SNEAK_MULT,
  DETECT_DECAY_RATE,
  SUSPICIOUS_AT,
  ALERTED_AT,
  SEARCH_SECONDS,
  LOSE_SIGHT_SECONDS,
  NOISE_WALK_RADIUS,
  NOISE_SNEAK_RADIUS,
  PEBBLE_NOISE_RADIUS,
} from './config.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  ALERTED: 'alerted',
  INVESTIGATE: 'investigate',
  SEARCH: 'search',
  RETURN: 'return',
};

export class Guard {
  constructor(patrol, startTile, id) {
    this.id = id;
    // patrol: list of [col, row] waypoints; walk there and back.
    this.patrol = patrol.map(([c, r]) => ({ x: c + 0.5, y: r + 0.5 }));
    this.x = startTile.x;
    this.y = startTile.y;
    this.dir = 0; // facing angle, radians
    this.state = GUARD_STATE.PATROL;
    this.waypoint = 1;
    this.forward = true;
    this.meter = 0; // detection 0..100
    this.lastSeen = null; // {x, y} of the player, in tiles
    this.loseSightTimer = 0;
    this.searchTimer = 0;
    this.pauseTimer = 0;
    this.target = null; // {x, y} tile to walk toward (investigate / search)
    this.speed = GUARD_PATROL_SPEED;
    this.stepPhase = 0;
    this.heardAt = null;
  }

  reset(startTile) {
    this.x = startTile.x;
    this.y = startTile.y;
    this.state = GUARD_STATE.PATROL;
    this.waypoint = 1;
    this.forward = true;
    this.meter = 0;
    this.lastSeen = null;
    this.target = null;
    this.speed = GUARD_PATROL_SPEED;
    this.pauseTimer = 0;
  }

  // True when the player stands inside this guard's vision cone with a
  // clear line of sight (walls and crates block it; bushes do not).
  canSee(player, world) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD_VIEW_RANGE) return false;
    const angle = Math.atan2(dy, dx);
    let diff = angle - this.dir;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > GUARD_VIEW_HALF_ANGLE) return false;
    if (!world.hasLineOfSight(this.x, this.y, player.x, player.y)) return false;
    // A player crouched inside a bush is invisible unless the guard is close.
    if (world.tileAt(player.x, player.y) === 'B' && dist > 1.6) return false;
    return true;
  }

  // A noise at (x, y) with the given radius pulls a patrolling guard over.
  hearNoise(x, y, radius) {
    if (this.state === GUARD_STATE.ALERTED) return;
    const dist = Math.hypot(x - this.x, y - this.y);
    if (dist <= radius) {
      this.heardAt = { x, y };
      if (this.state === GUARD_STATE.PATROL || this.state === GUARD_STATE.RETURN) {
        this.state = GUARD_STATE.INVESTIGATE;
        this.target = { x, y };
      }
    }
  }

  update(dt, player, world, sfx) {
    const seen = this.canSee(player, world);
    if (seen) {
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightTimer = 0;
      let rate = DETECT_BASE_RATE;
      if (player.sneaking) rate *= DETECT_SNEAK_MULT;
      if (world.tileAt(player.x, player.y) === ',') rate *= DETECT_LIT_MULT;
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      rate *= 1.5 - (dist / GUARD_VIEW_RANGE) * 0.8; // closer = spotted faster
      this.meter = Math.min(ALERTED_AT, this.meter + rate * dt);
      if (this.meter >= ALERTED_AT && this.state !== GUARD_STATE.ALERTED) {
        this.state = GUARD_STATE.ALERTED;
        sfx.alert();
        world.onGuardAlerted(this);
      } else if (this.meter >= SUSPICIOUS_AT && this.state === GUARD_STATE.PATROL) {
        this.state = GUARD_STATE.SUSPICIOUS;
        this.pauseTimer = 0.9;
        sfx.suspicious();
      }
    } else {
      this.meter = Math.max(0, this.meter - DETECT_DECAY_RATE * dt);
      if (this.state === GUARD_STATE.SUSPICIOUS && this.meter < SUSPICIOUS_AT) {
        this.state = GUARD_STATE.PATROL;
      }
    }

    // Footstep noise: walking is audible, sneaking almost is not.
    if (player.moving) {
      const radius = player.sneaking ? NOISE_SNEAK_RADIUS : NOISE_WALK_RADIUS;
      this.hearNoise(player.x, player.y, radius);
    }

    switch (this.state) {
      case GUARD_STATE.PATROL:
        this.speed = GUARD_PATROL_SPEED;
        this.walkPatrol(dt, world);
        break;
      case GUARD_STATE.SUSPICIOUS: {
        // Stop, turn toward the last seen spot, stare.
        if (this.lastSeen) this.faceToward(this.lastSeen.x, this.lastSeen.y, dt);
        this.pauseTimer -= dt;
        if (this.pauseTimer <= 0) {
          this.state = GUARD_STATE.PATROL;
          this.meter = Math.max(0, this.meter - 10);
        }
        break;
      }
      case GUARD_STATE.ALERTED: {
        this.speed = GUARD_CHASE_SPEED;
        if (seen) {
          this.moveToward(player.x, player.y, dt, world);
          this.loseSightTimer = 0;
        } else {
          this.loseSightTimer += dt;
          if (this.lastSeen) this.moveToward(this.lastSeen.x, this.lastSeen.y, dt, world);
          if (this.loseSightTimer > LOSE_SIGHT_SECONDS) {
            this.state = GUARD_STATE.SEARCH;
            this.searchTimer = SEARCH_SECONDS;
            this.target = this.lastSeen;
          }
        }
        break;
      }
      case GUARD_STATE.INVESTIGATE:
        this.speed = GUARD_PATROL_SPEED * 1.25;
        if (this.target) {
          const arrived = this.moveToward(this.target.x, this.target.y, dt, world);
          if (arrived) {
            this.state = GUARD_STATE.SEARCH;
            this.searchTimer = 1.6;
          }
        } else {
          this.state = GUARD_STATE.PATROL;
        }
        break;
      case GUARD_STATE.SEARCH:
        this.speed = GUARD_SEARCH_SPEED;
        this.searchTimer -= dt;
        // Look around while searching.
        this.dir += dt * 1.6;
        if (this.searchTimer <= 0) {
          this.state = GUARD_STATE.RETURN;
          this.target = this.patrol[0];
        }
        break;
      case GUARD_STATE.RETURN: {
        this.speed = GUARD_PATROL_SPEED * 1.3;
        const arrived = this.target
          ? this.moveToward(this.target.x, this.target.y, dt, world)
          : true;
        if (arrived) {
          this.state = GUARD_STATE.PATROL;
          this.waypoint = 1;
          this.forward = true;
          this.meter = 0;
        }
        break;
      }
    }
  }

  walkPatrol(dt, world) {
    const goal = this.patrol[this.waypoint];
    const arrived = this.moveToward(goal.x, goal.y, dt, world);
    if (arrived) {
      if (this.forward) {
        this.waypoint++;
        if (this.waypoint >= this.patrol.length) {
          this.waypoint = this.patrol.length - 2;
          this.forward = false;
        }
      } else {
        this.waypoint--;
        if (this.waypoint < 0) {
          this.waypoint = 1;
          this.forward = true;
        }
      }
    }
  }

  // Walk toward a tile; returns true when arrived. Slides along walls.
  moveToward(tx, ty, dt, world) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.08) return true;
    const step = (this.speed * dt) / dist;
    const nx = this.x + dx * step;
    const ny = this.y + dy * step;
    this.dir = Math.atan2(dy, dx);
    this.stepPhase += dt * 9;
    if (world.walkableAt(nx, this.y)) this.x = nx;
    if (world.walkableAt(this.x, ny)) this.y = ny;
    return Math.hypot(tx - this.x, ty - this.y) < 0.12;
  }

  faceToward(tx, ty, dt) {
    const want = Math.atan2(ty - this.y, tx - this.x);
    let diff = want - this.dir;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
    this.dir += turn;
  }

  // Cone polygon (in pixels, for the renderer) clipped by walls is drawn by
  // render.js; this returns the cone's reach in tiles for the noise label.
  get coneColor() {
    if (this.state === GUARD_STATE.ALERTED) return 'alerted';
    if (this.state === GUARD_STATE.SUSPICIOUS || this.state === GUARD_STATE.INVESTIGATE) {
      return 'suspicious';
    }
    return 'calm';
  }

  get statusLabel() {
    switch (this.state) {
      case GUARD_STATE.PATROL: return 'Calm';
      case GUARD_STATE.SUSPICIOUS: return 'Suspicious ?';
      case GUARD_STATE.ALERTED: return 'ALERTED !';
      case GUARD_STATE.INVESTIGATE: return 'Checking noise';
      case GUARD_STATE.SEARCH: return 'Searching';
      case GUARD_STATE.RETURN: return 'Returning';
      default: return this.state;
    }
  }
}

// A pebble thrown by the player: a short arc that lands with a clatter and
// draws every guard in earshot to the landing spot.
export class Pebble {
  constructor(fromX, fromY, toX, toY) {
    this.fromX = fromX;
    this.fromY = fromY;
    this.x = fromX;
    this.y = fromY;
    this.toX = toX;
    this.toY = toY;
    this.t = 0;
    this.duration = 0.45;
    this.landed = false;
    this.ringT = 0;
  }

  update(dt, guards) {
    if (!this.landed) {
      this.t += dt;
      const k = Math.min(1, this.t / this.duration);
      this.x = this.fromX + (this.toX - this.fromX) * k;
      this.y = this.fromY + (this.toY - this.fromY) * k;
      if (k >= 1) {
        this.landed = true;
        this.ringT = 0;
        for (const g of guards) g.hearNoise(this.toX, this.toY, PEBBLE_NOISE_RADIUS);
      }
    } else {
      this.ringT += dt;
    }
  }

  get done() {
    return this.landed && this.ringT > 1.1;
  }
}
