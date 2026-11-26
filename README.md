# Aurora Run — Sky Courier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Rezzrizz25/makefun-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Rezzrizz25/makefun-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A complete original flight game for the make.fun **best-flight-game-20261126-0057** bounty. You are the pilot of a little red-and-cream mail plane flying the island airmail run at golden hour: take off from Harbourfield, thread the golden rings over coastline, patchwork fields and mountain passes, mind your fuel and your hull, and put her down gently on the far runway. Three legs with different ground and different goals — Coast Run, Mountain Pass, Island Hop — plus birds, storm cells, stall warnings, flap boost, and a fully lit instrument panel.

## How to play

- **W / ↑** throttle up, **S / ↓** throttle down
- **A / ←** pitch up (climb), **D / →** pitch down (descend)
- **Mouse** — move to steer toward the pointer; **wheel** trims the throttle
- **Space** — flap boost (short burst, costs fuel)
- **G** — landing gear up / down (land with it down, gently, on a runway)
- **P** — pause, **R** — restart the leg, **T** — title screen, **M** — sound on/off
- **1 / 2 / 3** on the title screen — pick a leg (or click one)

Fly through the centre of a golden ring for +100 (chained rings build a ×5 combo); a close fly-by still earns +25. A gentle touchdown on a runway scores a landing bonus and refuels you; a rough landing or a ditching costs hull. Below 58 kt the wing stalls — add throttle. Empty tank means gliding to somewhere flat.

## How to run

```sh
node serve.ts
```

then open http://localhost:8080 in desktop Chrome. Or open `game/index.html` directly — the game is static files only, no network requests, all art drawn on canvas and all sound synthesised live with WebAudio.

## Structure

- `game/index.html`, `game/style.css` — page shell
- `game/src/main.js` — boot, game loop, state machine, camera
- `game/src/terrain.js` — island terrain, coastline, fields, towns, runways
- `game/src/plane.js` — flight physics and the hand-drawn aircraft
- `game/src/rings.js` — target rings, scoring, landing / crash rules
- `game/src/sky.js` — sky, sun, clouds, storm cells, birds, particles
- `game/src/hud.js` — HUD and lit instruments (attitude, airspeed, altimeter, throttle, fuel, hull, compass)
- `game/src/audio.js` — synthesised engine, wind, chimes and thuds
- `game/src/input.js` — keyboard and mouse
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`
- `screenshots/` — real renders of the game running in headless Chromium

## Referral

https://make.fun/r/v4m1pbv2

## License

MIT — see [LICENSE](LICENSE).
