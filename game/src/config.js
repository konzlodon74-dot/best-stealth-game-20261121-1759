// config.js — shared constants for The Moonlit Vault.
// One tile is 40 px; the museum floor is 24 x 16 tiles (960 x 640 px)
// drawn inside a 1280 x 800 canvas with a HUD bar on top and a side panel.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const MAP_X = 40; // px offset of the map inside the canvas
export const MAP_Y = 118;
export const CANVAS_W = 1280;
export const CANVAS_H = 800;

// Tile characters used by levels.js
export const T = {
  WALL: '#',
  FLOOR: '.',
  LIT: ',', // lamplit floor: guards spot you faster here
  CRATE: 'C', // cover: blocks movement and line of sight
  BUSH: 'B', // hiding plant: you can stand inside, guards cannot see you there
  RELIC: 'R',
  EXIT: 'E',
  START: 'P',
  GUARD: 'G',
};

// Movement speeds in tiles per second
export const PLAYER_WALK_SPEED = 3.1;
export const PLAYER_SNEAK_SPEED = 1.7;
export const GUARD_PATROL_SPEED = 1.5;
export const GUARD_CHASE_SPEED = 2.9;
export const GUARD_SEARCH_SPEED = 2.0;

// Vision: how far a guard sees, and how wide the cone is (half-angle, radians)
export const GUARD_VIEW_RANGE = 5.6;
export const GUARD_VIEW_HALF_ANGLE = 0.61; // ~35 degrees

// Detection meter 0..100. Rates are per second while the player is seen.
export const DETECT_BASE_RATE = 34;
export const DETECT_LIT_MULT = 1.55; // standing in lamplight
export const DETECT_SNEAK_MULT = 0.55;
export const DETECT_WALK_MULT = 1.0;
export const DETECT_DECAY_RATE = 26; // per second while unseen
export const SUSPICIOUS_AT = 35; // meter where a guard stops and stares
export const ALERTED_AT = 100;

// Noise: guards hear footsteps inside this radius (tiles)
export const NOISE_WALK_RADIUS = 1.4;
export const NOISE_SNEAK_RADIUS = 0.35;
export const PEBBLE_NOISE_RADIUS = 2.6;
export const PEBBLE_RANGE = 6.5; // tiles from the player
export const PEBBLES_PER_LEVEL = 3;

// A guard that lost you searches the last seen spot this long, then goes home.
export const SEARCH_SECONDS = 3.5;
export const LOSE_SIGHT_SECONDS = 4.0;

// Palette — a moonlit museum: deep blues, warm lamplight, green exit glow.
export const COLORS = {
  bg: '#0b1020',
  hudBg: '#10182e',
  panelBg: '#0e1526',
  floorDark: '#1c2438',
  floorDark2: '#202842',
  floorLit: '#3a3220',
  floorLit2: '#403824',
  wall: '#3d4a6b',
  wallTop: '#5a6b96',
  crate: '#7a5a34',
  crateTop: '#9c7642',
  bush: '#1f5c33',
  bushLeaf: '#2f7d46',
  exit: '#39d98a',
  exitDim: '#1d5c40',
  relic: '#ffd94d',
  player: '#e8e6f2',
  playerCloak: '#4b3a78',
  guard: '#d8dee9',
  guardUniform: '#27408b',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 150, 40, 0.30)',
  coneAlerted: 'rgba(255, 60, 60, 0.34)',
  text: '#e8ecf7',
  textDim: '#9aa7c7',
  gold: '#ffd94d',
  danger: '#ff5a5a',
};
