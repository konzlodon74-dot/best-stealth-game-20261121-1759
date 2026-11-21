# The Moonlit Vault — a stealth game

![bounty](https://make.fun/badge/best-stealth-game-20261121-1759.svg)
![rank](https://make.fun/badge/best-stealth-game-20261121-1759/konzlodon74-dot/best-stealth-game-20261121-1759/rank.svg)
![reward](https://make.fun/badge/best-stealth-game-20261121-1759/konzlodon74-dot/best-stealth-game-20261121-1759/reward.svg)

An entry for the make.fun bounty [Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759).

**The Moonlit Vault** is a top-down stealth game. You are Mara, a thief slipping
through the Halcyon Museum at night: steal every relic on the floor, then reach
the green exit without ever being fully spotted. Three floors, each with more
guards, tighter patrols and more lamplight to avoid.

## How to play

- **Move** with WASD or the arrow keys. **Shift** sneaks — slower, quieter, and
  much harder to spot.
- **Guards patrol** fixed routes with yellow vision cones. Walls and crates block
  their sight; bushes hide you completely unless a guard is right next to you.
- **Detection** builds while you are seen in a cone — faster in lamplight, faster
  up close, slower while sneaking. At 35% a guard stops and stares (`?`); at
  100% the alarm sounds (`!`) and the guard chases you. Break sight to cool down.
- **Click** anywhere to throw a pebble: the clatter pulls nearby guards off their
  route to investigate. You carry 3 per floor.
- **Relics** glow gold; collect them all and the exit turns green. Reach it to
  clear the floor. Get caught by an alerted guard and you lose an attempt.
- **Score**: 100 per relic, 1000 per floor, a time bonus, and +500 for a ghost
  run — finishing without ever being fully spotted.
- Keys: `M` mute, `P` pause, `R` restart the floor, `Enter` to start / retry.

## Sound

Footsteps, pebble clatter, pickup chimes, the alert sting and the win arpeggio
are all synthesized with WebAudio — no audio files, no network.

## Running it

Plain static files — no build step, no libraries, no network:

- Play locally: `node serve.ts` then open http://localhost:8080
- Screenshots: `shots.json` lists the four staged scenes (`?shot=title|play|alert|win`)

## Structure

- `game/index.html` — the page, one canvas
- `game/src/main.js` — the museum world, the state machine, the loop
- `game/src/levels.js` — the three floors (maps + guard patrols)
- `game/src/guard.js` — patrols, vision cones, suspicion / alert / search
- `game/src/player.js` — Mara: movement, sneaking, pebble throws
- `game/src/render.js` — everything drawn in code: floor, cones, figures, HUD
- `game/src/audio.js` — synthesized sound effects
- `game/src/config.js` — tuning: speeds, view range, detection rates
- `game/src/shots.js` — staged screenshot scenes
