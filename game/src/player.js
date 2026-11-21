// player.js — Mara, the thief. Moves with WASD / arrows, sneaks with Shift,
// throws a pebble with a mouse click to pull guards away.

import {
  PLAYER_WALK_SPEED,
  PLAYER_SNEAK_SPEED,
  PEBBLE_RANGE,
  PEBBLES_PER_LEVEL,
} from './config.js';

export class Player {
  constructor(startTile) {
    this.x = startTile.x;
    this.y = startTile.y;
    this.dir = 0; // facing angle, radians
    this.sneaking = false;
    this.moving = false;
    this.pebbles = PEBBLES_PER_LEVEL;
    this.stepPhase = 0;
    this.stepAcc = 0; // distance walked since the last footstep sound
    this.hidden = false; // inside a bush
    this.caught = false;
  }

  reset(startTile) {
    this.x = startTile.x;
    this.y = startTile.y;
    this.dir = 0;
    this.sneaking = false;
    this.moving = false;
    this.pebbles = PEBBLES_PER_LEVEL;
    this.hidden = false;
    this.caught = false;
  }

  // keys: {up, down, left, right, sneak} — returns the footstep distance
  // walked this frame, so main.js can play the step sound at the right pace.
  update(dt, keys, world) {
    let dx = 0;
    let dy = 0;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    this.sneaking = !!keys.sneak;
    this.moving = dx !== 0 || dy !== 0;

    let stepped = 0;
    if (this.moving) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      const speed = this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
      const step = speed * dt;
      this.dir = Math.atan2(dy, dx);
      this.stepPhase += dt * (this.sneaking ? 7 : 11);
      const nx = this.x + dx * step;
      const ny = this.y + dy * step;
      if (world.walkableAt(nx, this.y)) {
        this.x = nx;
        stepped += Math.abs(dx * step);
      }
      if (world.walkableAt(this.x, ny)) {
        this.y = ny;
        stepped += Math.abs(dy * step);
      }
      this.stepAcc += stepped;
    }
    this.hidden = world.tileAt(this.x, this.y) === 'B';
    return stepped;
  }

  // A click on the map throws a pebble toward that tile (range-limited).
  // Returns the landing tile, or null when out of pebbles / out of range.
  throwPebble(tileX, tileY) {
    if (this.pebbles <= 0) return null;
    const dx = tileX - this.x;
    const dy = tileY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.6 || dist > PEBBLE_RANGE) return null;
    this.pebbles--;
    return { x: tileX, y: tileY };
  }
}
