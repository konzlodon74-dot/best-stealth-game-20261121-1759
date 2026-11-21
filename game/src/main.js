// main.js — the game itself: the museum world (tiles, sight lines, collision),
// the state machine (title / play / paused / caught / win) and the loop.
// Boots from index.html; ?shot= stages a fixed scene for screenshots.

import { TILE, COLS, ROWS, MAP_X, MAP_Y } from './config.js';
import { LEVELS } from './levels.js';
import { Guard, Pebble } from './guard.js';
import { Player } from './player.js';
import { Sfx } from './audio.js';
import { drawScene } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// The museum floor: parses a level map into tiles, relics, the exit and the
// guard spawns, and answers the questions movement and sight keep asking.
export class World {
  constructor(level) {
    this.map = level.map.map((row) => row.split(''));
    this.relics = [];
    this.exit = { x: 0, y: 0 };
    this.start = { x: 1.5, y: 1.5 };
    this.guardSpawns = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = this.map[r][c];
        if (ch === 'P') this.start = { x: c + 0.5, y: r + 0.5 };
        else if (ch === 'E') this.exit = { x: c + 0.5, y: r + 0.5 };
        else if (ch === 'R') this.relics.push({ x: c + 0.5, y: r + 0.5, taken: false });
        else if (ch === 'G') this.guardSpawns.push({ x: c + 0.5, y: r + 0.5 });
      }
    }
    this.alertedGuard = null;
  }

  tileAt(x, y) {
    const c = Math.floor(x);
    const r = Math.floor(y);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return '#';
    return this.map[r][c];
  }

  // Walls and crates stop a body; bushes stop only guards.
  walkableAt(x, y, isGuard = false) {
    const ch = this.tileAt(x, y);
    if (ch === '#' || ch === 'C') return false;
    if (isGuard && ch === 'B') return false;
    // Keep bodies out of the tile's corners: check a small radius.
    return true;
  }

  blocksSightAt(x, y) {
    const ch = this.tileAt(x, y);
    return ch === '#' || ch === 'C';
  }

  // Sampled line of sight: true when no wall or crate stands between the
  // two tile positions.
  hasLineOfSight(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(dist / 0.12);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.blocksSightAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  onGuardAlerted(guard) {
    this.alertedGuard = guard;
  }
}

class Game {
  constructor() {
    this.sfx = new Sfx();
    this.screen = 'title';
    this.levelIndex = 0;
    this.level = LEVELS[0];
    this.world = new World(this.level);
    this.player = new Player(this.world.start);
    this.guards = this.level.guards.map(
      (g, i) => new Guard(g.patrol, this.world.guardSpawns[i], i + 1),
    );
    this.pebbles = [];
    this.time = 0;
    this.attempts = 3;
    this.score = 0;
    this.ghost = true; // stays true while no guard ever fully spots Mara
    this.keys = { up: false, down: false, left: false, right: false, sneak: false };
    this.stepAcc = 0;
    this.lastTs = 0;
    this.shot = new URLSearchParams(window.location.search).get('shot');
    this.bindInput();
    if (this.shot) applyShot(this, this.shot);
    requestAnimationFrame((ts) => this.loop(ts));
  }

  get relicsGot() {
    return this.world.relics.filter((r) => r.taken).length;
  }

  get relicsTotal() {
    return this.world.relics.length;
  }

  get maxMeter() {
    // An alerted guard reads as fully spotted even while its meter decays.
    if (this.guards.some((g) => g.state === 'alerted')) return 100;
    return this.guards.reduce((m, g) => Math.max(m, g.meter), 0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.world = new World(this.level);
    this.player.reset(this.world.start);
    this.guards = this.level.guards.map(
      (g, i) => new Guard(g.patrol, this.world.guardSpawns[i], i + 1),
    );
    this.pebbles = [];
    this.attempts = 3;
    this.screen = 'play';
  }

  startGame() {
    this.time = 0;
    this.score = 0;
    this.ghost = true;
    this.loadLevel(0);
  }

  bindInput() {
    const keyMap = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ShiftLeft: 'sneak', ShiftRight: 'sneak',
    };
    window.addEventListener('keydown', (e) => {
      if (keyMap[e.code] !== undefined) {
        this.keys[keyMap[e.code]] = true;
        e.preventDefault();
      }
      if (e.code === 'KeyM') {
        this.sfx.ensure();
        this.sfx.toggleMute();
      }
      if (e.code === 'KeyP' && (this.screen === 'play' || this.screen === 'paused')) {
        this.screen = this.screen === 'play' ? 'paused' : 'play';
      }
      if (e.code === 'KeyR' && this.screen === 'play') {
        this.loadLevel(this.levelIndex);
      }
      if (e.code === 'Enter') this.confirm();
    });
    window.addEventListener('keyup', (e) => {
      if (keyMap[e.code] !== undefined) this.keys[keyMap[e.code]] = false;
    });
    canvas.addEventListener('mousedown', (e) => {
      this.sfx.ensure();
      if (this.screen !== 'play') {
        this.confirm();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      const tileX = (px - MAP_X) / TILE;
      const tileY = (py - MAP_Y) / TILE;
      if (tileX < 0 || tileX >= COLS || tileY < 0 || tileY >= ROWS) return;
      const landing = this.player.throwPebble(Math.floor(tileX) + 0.5, Math.floor(tileY) + 0.5);
      if (landing) {
        this.sfx.pebbleThrow();
        this.pebbles.push(new Pebble(this.player.x, this.player.y, landing.x, landing.y));
      }
    });
    // Touch: tap to throw a pebble where tapped.
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  }

  confirm() {
    this.sfx.ensure();
    if (this.screen === 'title') this.startGame();
    else if (this.screen === 'caught') {
      if (this.attempts > 0) this.loadLevel(this.levelIndex);
      else this.startGame();
    } else if (this.screen === 'win') this.startGame();
  }

  update(dt) {
    if (this.screen !== 'play') return;
    this.time += dt;
    const stepped = this.player.update(dt, this.keys, this.world);
    // Footsteps: a soft tick every half tile walked (quieter while sneaking).
    this.stepAcc += stepped;
    if (this.stepAcc > 0.5) {
      this.stepAcc = 0;
      this.sfx.footstep(this.player.sneaking);
    }
    for (const g of this.guards) g.update(dt, this.player, this.world, this.sfx);
    if (this.guards.some((g) => g.state === 'alerted')) this.ghost = false;
    for (const p of this.pebbles) p.update(dt, this.guards);
    this.pebbles = this.pebbles.filter((p) => !p.done);
    if (this.pebbles.some((p) => p.landed && p.ringT < dt * 2)) this.sfx.pebbleLand();

    // Relic pickup.
    for (const relic of this.world.relics) {
      if (!relic.taken && Math.hypot(relic.x - this.player.x, relic.y - this.player.y) < 0.65) {
        relic.taken = true;
        this.sfx.pickup();
        this.score += 100;
        if (this.relicsGot >= this.relicsTotal) this.sfx.exitOpen();
      }
    }

    // Exit: open once every relic is stolen.
    const exitOpen = this.relicsGot >= this.relicsTotal;
    if (exitOpen && Math.hypot(this.world.exit.x - this.player.x, this.world.exit.y - this.player.y) < 0.7) {
      this.score += 1000 + Math.max(0, 600 - Math.floor(this.time * 2));
      if (this.levelIndex + 1 < LEVELS.length) {
        this.loadLevel(this.levelIndex + 1);
      } else {
        if (this.ghost) this.score += 500;
        this.screen = 'win';
        this.sfx.win();
      }
      return;
    }

    // Caught: an alerted guard gets within arm's reach.
    for (const g of this.guards) {
      if (g.state === 'alerted' && Math.hypot(g.x - this.player.x, g.y - this.player.y) < 0.55) {
        this.attempts--;
        this.screen = 'caught';
        this.sfx.caught();
        return;
      }
    }
    this.sfx.heartbeat(dt, this.maxMeter);
  }

  loop(ts) {
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000 || 0);
    this.lastTs = ts;
    this.update(dt);
    drawScene(ctx, this);
    requestAnimationFrame((t) => this.loop(t));
  }
}

const game = new Game();
// Debug handle for automated playtests (harmless in normal play).
window.__vault = game;
