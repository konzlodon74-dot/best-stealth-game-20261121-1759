// render.js — every pixel of The Moonlit Vault is drawn in code: the museum
// floor, the guards' vision cones (ray-cast so walls clip them), the thief,
// the relics, and the HUD. No image files.

import { TILE, MAP_X, MAP_Y, COLS, ROWS, CANVAS_W, CANVAS_H, COLORS } from './config.js';

const px = (tile) => MAP_X + tile * TILE; // tile coordinate -> canvas pixel
const py = (tile) => MAP_Y + tile * TILE;

function coneColor(kind) {
  if (kind === 'alerted') return COLORS.coneAlerted;
  if (kind === 'suspicious') return COLORS.coneSuspicious;
  return COLORS.coneCalm;
}

// A vision cone clipped by walls: cast rays across the arc and stop each one
// at the first wall or crate (or at the guard's view range).
function drawCone(ctx, guard, world) {
  const range = 5.6;
  const half = 0.61;
  const rays = 26;
  const cx = px(guard.x);
  const cy = py(guard.y);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let i = 0; i <= rays; i++) {
    const a = guard.dir - half + (2 * half * i) / rays;
    let r = range;
    for (let d = 0.3; d <= range; d += 0.15) {
      const tx = guard.x + Math.cos(a) * d;
      const ty = guard.y + Math.sin(a) * d;
      if (world.blocksSightAt(tx, ty)) {
        r = d;
        break;
      }
    }
    ctx.lineTo(px(guard.x + Math.cos(a) * r), py(guard.y + Math.sin(a) * r));
  }
  ctx.closePath();
  ctx.fillStyle = coneColor(guard.coneColor);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 220, 120, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawTile(ctx, ch, col, row, world) {
  const x = px(col);
  const y = py(row);
  if (ch === '#') {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(x, y, TILE, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, y + TILE - 5, TILE, 5);
    return;
  }
  const lit = ch === ',';
  const checker = (col + row) % 2 === 0;
  ctx.fillStyle = lit
    ? checker ? COLORS.floorLit : COLORS.floorLit2
    : checker ? COLORS.floorDark : COLORS.floorDark2;
  ctx.fillRect(x, y, TILE, TILE);
  if (lit) {
    // A pool of lamplight.
    const g = ctx.createRadialGradient(
      x + TILE / 2, y + TILE / 2, 4, x + TILE / 2, y + TILE / 2, TILE * 0.75,
    );
    g.addColorStop(0, 'rgba(255, 214, 130, 0.20)');
    g.addColorStop(1, 'rgba(255, 214, 130, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, TILE, TILE);
  }
  if (ch === 'C') {
    ctx.fillStyle = COLORS.crate;
    ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
    ctx.fillStyle = COLORS.crateTop;
    ctx.fillRect(x + 5, y + 5, TILE - 10, 6);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 5);
    ctx.lineTo(x + TILE - 5, y + TILE - 5);
    ctx.stroke();
  } else if (ch === 'B') {
    ctx.fillStyle = COLORS.bush;
    ctx.beginPath();
    ctx.arc(x + TILE / 2, y + TILE / 2, TILE * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.bushLeaf;
    ctx.beginPath();
    ctx.arc(x + TILE * 0.35, y + TILE * 0.4, TILE * 0.2, 0, Math.PI * 2);
    ctx.arc(x + TILE * 0.65, y + TILE * 0.6, TILE * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRelic(ctx, relic, time) {
  const x = px(relic.x);
  const y = py(relic.y);
  const bob = Math.sin(time * 2 + relic.x) * 3;
  const g = ctx.createRadialGradient(x, y + bob, 2, x, y + bob, 26);
  g.addColorStop(0, 'rgba(255, 217, 77, 0.55)');
  g.addColorStop(1, 'rgba(255, 217, 77, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y + bob, 26, 0, Math.PI * 2);
  ctx.fill();
  // A little gem.
  ctx.fillStyle = COLORS.relic;
  ctx.beginPath();
  ctx.moveTo(x, y - 11 + bob);
  ctx.lineTo(x + 9, y + bob);
  ctx.lineTo(x, y + 11 + bob);
  ctx.lineTo(x - 9, y + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(x, y - 11 + bob);
  ctx.lineTo(x + 5, y - 2 + bob);
  ctx.lineTo(x, y + bob);
  ctx.lineTo(x - 5, y - 2 + bob);
  ctx.closePath();
  ctx.fill();
}

function drawExit(ctx, exit, open, time) {
  const x = px(exit.x);
  const y = py(exit.y);
  const pulse = open ? 0.65 + Math.sin(time * 4) * 0.25 : 0.25;
  ctx.fillStyle = open ? COLORS.exit : COLORS.exitDim;
  ctx.globalAlpha = pulse;
  ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = open ? '#a9f5cd' : '#5a7d6c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
  ctx.fillStyle = open ? '#0b3d24' : '#274d3c';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', x + TILE / 2, y + TILE / 2 + 1);
}

function drawGuardFigure(ctx, guard) {
  const x = px(guard.x);
  const y = py(guard.y);
  const bob = Math.sin(guard.stepPhase) * 1.5;
  // Body: navy uniform, pale face, cap brim pointing where he looks.
  ctx.fillStyle = COLORS.guardUniform;
  ctx.beginPath();
  ctx.arc(x, y + bob, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(x, y + bob, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b2a52';
  ctx.beginPath();
  ctx.arc(x, y - 3 + bob, 8, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 8, y - 4 + bob, 16, 3);
  // Direction tick.
  ctx.strokeStyle = COLORS.guard;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + bob);
  ctx.lineTo(x + Math.cos(guard.dir) * 17, y + Math.sin(guard.dir) * 17 + bob);
  ctx.stroke();
  // Detection meter ring + mark.
  if (guard.meter > 2) {
    const frac = guard.meter / 100;
    ctx.strokeStyle = frac >= 1 ? COLORS.danger : frac >= 0.35 ? '#ff9a2a' : '#ffd65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y + bob, 19, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
  if (guard.state === 'alerted') {
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x, y - 26 + bob);
  } else if (guard.state === 'suspicious' || guard.state === 'investigate') {
    ctx.fillStyle = '#ff9a2a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', x, y - 26 + bob);
  }
}

function drawPlayerFigure(ctx, player, time) {
  const x = px(player.x);
  const y = py(player.y);
  const bob = Math.sin(player.stepPhase) * (player.sneaking ? 0.8 : 1.6);
  // Cloak: a violet triangle pointing where Mara faces.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(player.dir) * 16, y + Math.sin(player.dir) * 16 + bob);
  ctx.lineTo(
    x + Math.cos(player.dir + 2.4) * 13,
    y + Math.sin(player.dir + 2.4) * 13 + bob,
  );
  ctx.lineTo(
    x + Math.cos(player.dir - 2.4) * 13,
    y + Math.sin(player.dir - 2.4) * 13 + bob,
  );
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(x, y + bob, 10, 0, Math.PI * 2);
  ctx.fill();
  // Hood point.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(player.dir) * 15, y + Math.sin(player.dir) * 15 + bob);
  ctx.lineTo(x + Math.cos(player.dir + 0.5) * 7, y + Math.sin(player.dir + 0.5) * 7 + bob);
  ctx.lineTo(x + Math.cos(player.dir - 0.5) * 7, y + Math.sin(player.dir - 0.5) * 7 + bob);
  ctx.closePath();
  ctx.fill();
  if (player.hidden) {
    ctx.strokeStyle = 'rgba(120, 255, 160, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x, y + bob, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (player.sneaking) {
    ctx.fillStyle = 'rgba(232, 236, 247, 0.75)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', x, y + 28 + bob);
  }
}

function drawPebbles(ctx, pebbles) {
  for (const p of pebbles) {
    const x = px(p.x);
    const y = py(p.y);
    if (!p.landed) {
      // Mid-flight: a small stone with a shadow.
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.arc(px(p.toX), py(p.toY), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9ccd6';
      ctx.beginPath();
      ctx.arc(x, y - 10, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const r = 8 + p.ringT * 46;
      ctx.strokeStyle = `rgba(255, 220, 120, ${Math.max(0, 0.8 - p.ringT * 0.7)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#c9ccd6';
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawHud(ctx, game) {
  const { level, relicsGot, relicsTotal, time, attempts, maxMeter, player } = game;
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, CANVAS_W, 96);
  ctx.fillStyle = '#22304f';
  ctx.fillRect(0, 96, CANVAS_W, 2);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('THE MOONLIT VAULT', 40, 30);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '16px sans-serif';
  ctx.fillText(level.name, 40, 62);

  // Relics.
  ctx.fillStyle = COLORS.relic;
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`◆ ${relicsGot} / ${relicsTotal} relics`, 420, 30);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '15px sans-serif';
  ctx.fillText(`● ${player.pebbles} pebbles  (click to throw)`, 420, 60);

  // Timer and attempts.
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60).toString().padStart(2, '0');
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`⏱ ${mins}:${secs}`, 700, 30);
  ctx.fillStyle = COLORS.danger;
  ctx.fillText('♥'.repeat(attempts), 700, 60);

  // The detection eye: opens and reddens as the hottest guard's meter rises.
  const eyeX = 900;
  const eyeY = 48;
  const openness = 4 + (maxMeter / 100) * 10;
  ctx.strokeStyle = maxMeter >= 100 ? COLORS.danger : maxMeter >= 35 ? '#ff9a2a' : COLORS.textDim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(eyeX - 26, eyeY);
  ctx.quadraticCurveTo(eyeX, eyeY - 20, eyeX + 26, eyeY);
  ctx.quadraticCurveTo(eyeX, eyeY + 20, eyeX - 26, eyeY);
  ctx.stroke();
  ctx.fillStyle = maxMeter >= 100 ? COLORS.danger : maxMeter >= 35 ? '#ff9a2a' : COLORS.text;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, openness, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  const label = maxMeter >= 100 ? 'SPOTTED!' : maxMeter >= 35 ? 'SUSPICIOUS' : 'HIDDEN';
  ctx.fillText(label, 940, 48);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px sans-serif';
  ctx.fillText('Shift: sneak   M: mute   P: pause   R: restart', 940, 70);
}

function drawPanel(ctx, game) {
  const x0 = MAP_X + COLS * TILE + 20; // 1020
  const w = CANVAS_W - x0 - 20; // 220
  ctx.fillStyle = COLORS.panelBg;
  ctx.fillRect(x0, MAP_Y, w, ROWS * TILE);
  ctx.strokeStyle = '#22304f';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, MAP_Y, w, ROWS * TILE);

  let y = MAP_Y + 24;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('THE JOB', x0 + 14, y);
  y += 30;
  ctx.fillStyle = COLORS.text;
  ctx.font = '14px sans-serif';
  const lines = [
    'Steal every relic,',
    'then slip out the',
    'green exit unseen.',
    '',
    '• Yellow cones are',
    '  guard sight.',
    '• Crates block sight.',
    '• Bushes hide you.',
    '• Lamplight betrays',
    '  you — cross fast.',
    '• A pebble click pulls',
    '  a guard away.',
  ];
  for (const line of lines) {
    ctx.fillText(line, x0 + 14, y);
    y += 20;
  }
  y += 14;
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('GUARDS', x0 + 14, y);
  y += 26;
  ctx.font = '14px sans-serif';
  for (const g of game.guards) {
    ctx.fillStyle = g.state === 'alerted' ? COLORS.danger : g.state === 'patrol' ? COLORS.textDim : '#ff9a2a';
    ctx.fillText(`G${g.id}  ${g.statusLabel}`, x0 + 14, y);
    y += 20;
  }
  y += 14;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px sans-serif';
  // Word-wrap the level tip so it fits the panel instead of squashing.
  const words = game.level.tip.split(' ');
  let line = '';
  for (const word of words) {
    const trial = line ? line + ' ' + word : word;
    if (ctx.measureText(trial).width > w - 28 && line) {
      ctx.fillText(line, x0 + 14, y);
      y += 18;
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) ctx.fillText(line, x0 + 14, y);
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.82)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent || COLORS.gold;
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(title, CANVAS_W / 2, 300);
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, 380 + i * 34);
  });
}

export function drawScene(ctx, game) {
  const { world, time } = game;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Moonlight wash over the whole floor.
  const moon = ctx.createRadialGradient(300, 160, 60, 640, 420, 900);
  moon.addColorStop(0, 'rgba(140, 170, 255, 0.10)');
  moon.addColorStop(1, 'rgba(140, 170, 255, 0)');
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Floor.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      drawTile(ctx, world.map[r][c], c, r, world);
    }
  }
  // Exit and relics under the cones.
  drawExit(ctx, world.exit, game.relicsGot >= game.relicsTotal, time);
  for (const relic of world.relics) {
    if (!relic.taken) drawRelic(ctx, relic, time);
  }
  // Vision cones, then figures, then pebbles.
  for (const g of game.guards) drawCone(ctx, g, world);
  for (const g of game.guards) drawGuardFigure(ctx, g);
  drawPlayerFigure(ctx, game.player, time);
  drawPebbles(ctx, game.pebbles);

  // Vignette: the edges of the museum are darker, so the safe dark reads.
  const vg = ctx.createRadialGradient(640, 420, 320, 640, 420, 720);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawHud(ctx, game);
  drawPanel(ctx, game);

  // Bottom tip strip.
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.level.tip, CANVAS_W / 2, CANVAS_H - 16);

  if (game.screen === 'title') {
    drawOverlay(ctx, 'THE MOONLIT VAULT', [
      'A thief. A museum. Three floors of guards.',
      'Steal every relic, then slip out the green exit — unseen.',
      '',
      'WASD / arrows — move      Shift — sneak      Click — throw a pebble',
      'M — mute      P — pause      R — restart level',
      '',
      'Click or press Enter to begin',
    ]);
  } else if (game.screen === 'caught') {
    drawOverlay(ctx, 'CAUGHT!', [
      `The guards hauled Mara off on ${game.level.name}.`,
      game.attempts > 0
        ? `${game.attempts} ${game.attempts === 1 ? 'attempt' : 'attempts'} left on this floor — press Enter to try again.`
        : 'No attempts left — press Enter to start over from Level 1.',
    ], COLORS.danger);
  } else if (game.screen === 'win') {
    const mins = Math.floor(game.time / 60);
    const secs = Math.floor(game.time % 60).toString().padStart(2, '0');
    drawOverlay(ctx, 'CLEAN GETAWAY!', [
      `Every relic, every floor — and nobody saw a thing.`,
      `Time ${mins}:${secs}   •   Score ${game.score}`,
      game.ghost ? 'Ghost bonus: never once fully spotted. +500' : 'Spotted at least once — the ghost bonus slipped away.',
      '',
      'Press Enter to play again',
    ], COLORS.exit);
  } else if (game.screen === 'paused') {
    drawOverlay(ctx, 'PAUSED', ['Press P to keep sneaking.'], COLORS.textDim);
  }
}
