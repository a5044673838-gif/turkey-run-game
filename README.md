# turkey-run-game

[![turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![Rank](https://make.fun/badge/turkey-run-game-01/a5044673838-gif/turkey-run-game/rank.svg)](https://make.fun/bounty/turkey-run-game-01)
[![Reward](https://make.fun/badge/turkey-run-game-01/a5044673838-gif/turkey-run-game/reward.svg)](https://make.fun/bounty/turkey-run-game-01)

**Gobble Dash — The Great Turkey Escape.** A turkey runs 1000 m from the farmyard to the woods before the farmer catches it: jump the hay, fences and ovens, slide under low branches, dodge the falling carving knives, grab the corn. Three stages — Farmyard, Barn, Kitchen — each faster and hotter than the last. Three lives, a chasing farmer who lunges closer every time you stumble, and an escape (or a caught screen) with restart.

## Run it

Serve the game folder with any static server and open `game/index.html` in a desktop browser — no network request, no build step:

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080
```

Controls: **Space / ↑ / W / tap** to jump, **↓ / S** to slide under branches, **← → / A D** to nudge speed and sidestep the falling knives, **P / Esc** to pause. The best score is kept in localStorage.

Hand the entry in with the kit's program (Node 22):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

It copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library, failing loudly if a screenshot or the dossier is over the scorer's caps.
