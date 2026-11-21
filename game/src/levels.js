// levels.js — the three museum floors of The Moonlit Vault.
// Each map is 16 rows of 24 characters (see config.js T for the legend).
// Guards patrol the waypoint lists in order, then walk back along them.
// A 'G' in the map marks where a guard starts (its first waypoint).

export const LEVELS = [
  {
    name: 'Level 1 — The Gallery',
    tip: 'Stay out of the yellow cones. Crouch behind crates, hide in the plants.',
    map: [
      '########################',
      '#P....C......,,,,,,..R.#',
      '#.....CG.....,,,,,,....#',
      '#..B.........,,,,,.....#',
      '#...........,,,,,,..C..#',
      '#.#####................#',
      '#.#...#....C....####...#',
      '#.#...#.........#..#...#',
      '#.....#..B...G.#..#B...#',
      '#.C...#.........#..#...#',
      '#.....#....R....#..#...#',
      '#.....####......#..#C..#',
      '#.........,....,....#..#',
      '#..B......,,,,,,....#E.#',
      '#........,,,,,,,....#..#',
      '########################',
    ],
    guards: [
      { patrol: [[7, 2], [17, 2], [17, 5], [7, 5]] },
      { patrol: [[13, 8], [13, 13], [18, 13], [17, 8]] },
    ],
  },
  {
    name: 'Level 2 — The Vault Hall',
    tip: 'Lamplit floors betray you — cross them fast, or sneak through the dark.',
    map: [
      '########################',
      '#P..C.....,,,,,,,....R.#',
      '#....G.C..,,,,,,,....#.#',
      '#..B......,,,,,,,....#G#',
      '#.........,,,,,,,..C.#.#',
      '#.####............#....#',
      '#.#..#...C....###..#...#',
      '#.#..#.......#...#.#B..#',
      '#....#..B.G..#...#.#...#',
      '#.C..#.......#R..#.#...#',
      '#....#...C...#...#.#C..#',
      '#....####....#...#.#...#',
      '#......,.....#...#..#..#',
      '#..B...,,,,,,....#..#E.#',
      '#......,,,,,,..R.#..#..#',
      '########################',
    ],
    guards: [
      { patrol: [[5, 2], [18, 2], [18, 6], [6, 6]] },
      { patrol: [[10, 8], [10, 13], [15, 13], [15, 8]] },
      { patrol: [[20, 3], [18, 10], [19, 13]] },
    ],
  },
  {
    name: 'Level 3 — The Rooftop Garden',
    tip: 'Four guards, no room for mistakes. Pebbles pull a guard off its route.',
    map: [
      '########################',
      '#P...B.....,,,,,,,...R.#',
      '#...GB.......,,,,,,...##',
      '#..C.......,,,,,,..C.G.#',
      '#............,,,,,,....#',
      '#.#####...C.......####.#',
      '#.#...#.........#....#.#',
      '#.#B..#.G.R....#....#..#',
      '#.#G..#........#..B.#..#',
      '#.....#..C.....#....#..#',
      '#.C...#........#....#C.#',
      '#.....####..B..#....#..#',
      '#......,......,,,...#..#',
      '#..B...,,,,,,.,,,..#E..#',
      '#......,,,,,,....R.#...#',
      '########################',
    ],
    guards: [
      { patrol: [[4, 2], [19, 2], [16, 5], [8, 5]] },
      { patrol: [[8, 7], [8, 13], [16, 13], [16, 7]] },
      { patrol: [[21, 3], [21, 9], [18, 12]] },
      { patrol: [[3, 8], [5, 8], [5, 12], [2, 12]] },
    ],
  },
];

// Validate a level map: 16 rows, 24 columns each, one start, one exit,
// at least one relic, and every guard spawn has a patrol list.
export function validateLevel(level, index) {
  const problems = [];
  if (level.map.length !== 16) problems.push(`level ${index}: ${level.map.length} rows, want 16`);
  level.map.forEach((row, r) => {
    if (row.length !== 24) problems.push(`level ${index} row ${r}: ${row.length} chars, want 24`);
  });
  const joined = level.map.join('\n');
  const count = (ch) => (joined.split(ch).length - 1);
  if (count('P') !== 1) problems.push(`level ${index}: ${count('P')} player starts`);
  if (count('E') !== 1) problems.push(`level ${index}: ${count('E')} exits`);
  if (count('R') < 1) problems.push(`level ${index}: no relics`);
  if (count('G') !== level.guards.length) {
    problems.push(`level ${index}: ${count('G')} guard spawns but ${level.guards.length} patrols`);
  }
  level.guards.forEach((g, gi) => {
    g.patrol.forEach(([c, r]) => {
      const ch = level.map[r] && level.map[r][c];
      if (ch === undefined || '#C'.includes(ch)) {
        problems.push(`level ${index} guard ${gi} waypoint [${c},${r}] on ${JSON.stringify(ch)}`);
      }
    });
  });
  return problems;
}
