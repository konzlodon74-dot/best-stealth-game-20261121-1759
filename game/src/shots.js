// shots.js — staged scenes for the dossier screenshots (?shot=<name>).
// Each shot freezes the game in a readable, representative moment: the
// title, a mid-sneak patrol, a guard going alert, and the clean getaway.
// Nothing here runs during normal play.

import { GUARD_STATE } from './guard.js';

function placePlayer(game, col, row, dir) {
  game.player.x = col + 0.5;
  game.player.y = row + 0.5;
  game.player.dir = dir;
}

function placeGuard(game, i, col, row, dir, meter, state) {
  const g = game.guards[i];
  if (!g) return;
  g.x = col + 0.5;
  g.y = row + 0.5;
  g.dir = dir;
  g.meter = meter;
  g.state = state;
  if (state === GUARD_STATE.ALERTED) g.lastSeen = { x: game.player.x, y: game.player.y };
}

export function applyShot(game, shot) {
  if (shot === 'title') {
    game.screen = 'title';
    return;
  }
  if (shot === 'play') {
    // Level 1, mid-sneak: Mara crouched behind a crate while two guards
    // patrol with their cones out, one relic already stolen.
    game.loadLevel(0);
    game.world.relics[0].taken = true;
    game.score = 100;
    game.time = 47;
    placePlayer(game, 9, 9, 0.3);
    game.player.sneaking = true;
    placeGuard(game, 0, 12, 2, 0, 0, GUARD_STATE.PATROL);
    placeGuard(game, 1, 16, 10, Math.PI, 22, GUARD_STATE.PATROL);
    game.screen = 'play';
    return;
  }
  if (shot === 'alert') {
    // Level 2: Mara grabbed a relic in the lamplight and a guard is now
    // charging in, meter full, while a second guard turns suspicious.
    game.loadLevel(1);
    game.world.relics[0].taken = true;
    game.score = 100;
    game.time = 132;
    placePlayer(game, 18, 9, Math.PI);
    placeGuard(game, 0, 15, 8, 0.5, 100, GUARD_STATE.ALERTED);
    placeGuard(game, 1, 12, 12, -1.2, 48, GUARD_STATE.SUSPICIOUS);
    placeGuard(game, 2, 20, 5, Math.PI / 2, 0, GUARD_STATE.PATROL);
    game.ghost = false;
    game.screen = 'play';
    return;
  }
  if (shot === 'win') {
    // Level 3 cleared: every relic stolen, Mara at the exit, getaway won.
    game.loadLevel(2);
    for (const relic of game.world.relics) relic.taken = true;
    game.score = 3420;
    game.time = 268;
    placePlayer(game, 18, 13, 0);
    placeGuard(game, 0, 12, 4, Math.PI, 0, GUARD_STATE.PATROL);
    placeGuard(game, 1, 10, 10, -Math.PI / 2, 0, GUARD_STATE.PATROL);
    game.screen = 'win';
    return;
  }
  // Unknown shot name: leave the title up.
  game.screen = 'title';
}
