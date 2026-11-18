# emberline-defense

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/vlsk3104/emberline-defense/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/vlsk3104/emberline-defense/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Emberline Defense is a tower-defense game for desktop browsers. Ember-wraiths walk a winding dirt path toward the Ember Heart; you spend gold on towers placed on the grass to stop them across 12 waves. Four tower types — fast Arrow, splash Cannon, slowing Frost and chain-lightning Arc (the only answer to shielded wraiths) — each upgrade through three levels, and unspent gold earns 5% interest (capped) after every wave, so saving is a strategy, not a waste. Tanks leak double, the wave-12 Ember Tyrant leaks ten, and twenty lost lives end the run. It features a fixed-step deterministic simulation, seeded cosmetics, particles, muzzle flashes, projectile trails, frozen chain-lightning, screen shake, placement previews, wave banners and fully synthesized WebAudio sound — no assets, no libraries, no network.

## How to play

- Click a tower card in the side panel, then click a grass tile to place it. Click a placed tower to upgrade (to level 3) or sell it (70% refund).
- Press **Send Wave** when your line is ready. Toggle **1×/2×** speed or pause from the panel.
- **R** restarts the run at any time; **Esc** cancels a placement or selection. Mouse only — no keyboard is ever required to play.
- Frost slows the most-progressed unslowed enemy; Cannon splashes packs; Arc chains to nearby wraiths and ignores shield damage reduction. Bend tiles that cover two path legs are the strongest spots.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in a desktop browser
```

Headless check (plain Node, no DOM): `node game/src/sim.js both` plays the reference build order to victory and the no-tower run to its wave-3 defeat. Verified for this build: reference — VICTORY, 20 lives left, 272 kills, 0 leaks; no-build — defeat during wave 3, exactly as designed.

## Tech notes

Vanilla ES modules and Canvas 2D, zero dependencies. The simulation (`game/src/engine.js` with `config.js`, `map.js`, `waves.js`) is pure logic with a fixed 1/60 s timestep decoupled from rendering, so it runs identically in the browser and in Node; rendering, particles and synthesized audio are layered on top. Screenshot scenes are deterministic via `?scene=title|wave3|wave8|victory&seed=16`. Emberline Defense is fully original — no third-party IP, characters or brands.

---

<sub>Entered on [make.fun](https://make.fun/?ref=tv7w63vg&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
