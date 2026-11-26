// main.js — Aurora Run: Sky Courier. Boots the canvas, owns the game state
// machine (title / flying / paused / landed / crashed / complete), steps the
// physics, and draws the world in order: sky, clouds, terrain, rings, birds,
// plane, particles, HUD, instruments, overlays.
//
// The plane flies left to right through a world measured in metres. The camera
// keeps the plane at a fixed screen spot and scrolls the world past it; the
// vertical scale maps altitude to screen rows. Nothing here loads over the
// network: every pixel is drawn, every sound is synthesised.

import { makeSky, drawSky, drawClouds, updateBirds, drawParticles, spawnParticles } from './sky.js';
import { MISSIONS, terrainHeight, drawTerrain } from './terrain.js';
import { makePlane, updatePlane, drawPlane } from './plane.js';
import { buildRings, updateRings, drawRings, groundContact, applyGroundContact } from './rings.js';
import {
  drawTopHud, drawInstruments, drawMessage,
  drawTitle, drawPaused, drawCrashed, drawLanded, drawComplete,
} from './hud.js';
import { makeAudio } from './audio.js';
import { makeInput, bindInput } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

// The game object every module shares: view, world, plane, mission, score.
const game = {
  view: { width: 1280, height: 480 },
  time: 0,
  state: 'title', // title | flying | paused | landed | crashed | complete
  missionIndex: 0,
  mission: MISSIONS[0],
  missionList: MISSIONS,
  plane: makePlane(),
  sky: makeSky(20261126),
  rings: [],
  ringsHit: 0,
  combo: 0,
  comboTimer: 0,
  score: 0,
  best: 0,
  banner: '',
  bannerColour: '#ffffff',
  bannerT: 0,
  camAlt: 60,
  hScale: 1.0,  // screen px per world metre, horizontal
  vScale: 0.5,  // screen px per metre of altitude, vertical
  input: makeInput(),
  audio: makeAudio(),
  frozen: false, // screenshot scenes freeze the clock for a steady frame

  groundHeight(x) {
    return terrainHeight(this, x);
  },
  // World-x to screen-x: the plane sits at 34% of the width.
  worldToScreenX(wx) {
    return this.view.width * 0.34 + (wx - this.plane.x) * this.hScale;
  },
  // Altitude to screen-y: the camera altitude anchors the view, so the plane
  // rises and sinks on screen as it climbs and descends, and the ground stays
  // in frame even from high cruise.
  screenY(alt) {
    return this.view.height * 0.45 + (this.camAlt - alt) * this.vScale;
  },
  message(text, colour) {
    this.banner = text;
    this.bannerColour = colour || '#ffffff';
    this.bannerT = 2.4;
  },
  spawnBurst(x, y, colour, n) {
    spawnParticles(this, x, y, n, colour);
  },
  nextRingDist() {
    for (const ring of this.rings) {
      if (!ring.passed && ring.x > this.plane.x) return ring.x - this.plane.x;
    }
    return Math.max(0, this.mission.length - this.plane.x);
  },
  nextRingLabel() {
    for (const ring of this.rings) {
      if (!ring.passed && ring.x > this.plane.x) return 'RING';
    }
    return 'DEST';
  },
};

function loadBest() {
  try {
    game.best = Number(window.localStorage.getItem('aurora-run-best') || 0) || 0;
  } catch {
    game.best = 0;
  }
}

function saveBest() {
  if (game.score > game.best) {
    game.best = game.score;
    try {
      window.localStorage.setItem('aurora-run-best', String(game.best));
    } catch {
      // Private browsing or a hosted page without storage: best score is
      // simply not remembered, the game plays on regardless.
    }
  }
}

function startLeg(index) {
  game.missionIndex = index;
  game.mission = MISSIONS[index];
  game.plane = makePlane();
  game.plane.alt = 18;
  game.plane.gear = true;
  game.plane.fuel = game.mission.fuel;
  game.plane.throttle = 55;
  game.rings = buildRings(game);
  game.ringsHit = 0;
  game.combo = 0;
  game.comboTimer = 0;
  game.score = 0;
  game.camAlt = 40;
  game.state = 'flying';
  game.message(`${game.mission.name} — FLY!`, '#ffd23e');
  game.audio.ensure();
  statusEl.textContent = `${game.mission.name}. Flying.`;
}

function backToTitle() {
  game.state = 'title';
  game.plane = makePlane();
  game.plane.x = 1200;
  game.plane.alt = 160;
  game.plane.speed = 110;
  game.plane.throttle = 60;
  game.camAlt = 160;
  statusEl.textContent = 'Aurora Run title screen.';
}

// Edge actions: keys that fire once per press rather than while held.
game.input.onKey = (code) => {
  game.audio.ensure();
  if (code === 'KeyM') {
    const muted = game.audio.toggleMute();
    game.message(muted ? 'SOUND OFF' : 'SOUND ON', '#cfe6ff');
    return;
  }
  if (game.state === 'title') {
    if (code === 'Digit1') startLeg(0);
    else if (code === 'Digit2') startLeg(1);
    else if (code === 'Digit3') startLeg(2);
    else if (code === 'Enter' || code === 'Space') startLeg(game.missionIndex);
    return;
  }
  if (code === 'KeyP') {
    if (game.state === 'flying') {
      game.state = 'paused';
      statusEl.textContent = 'Paused.';
    } else if (game.state === 'paused') {
      game.state = 'flying';
    }
    return;
  }
  if (code === 'KeyR') {
    startLeg(game.missionIndex);
    return;
  }
  if (code === 'KeyT') {
    backToTitle();
    return;
  }
  if (game.state === 'flying' && code === 'KeyG') {
    game.plane.gear = !game.plane.gear;
    game.message(game.plane.gear ? 'GEAR DOWN' : 'GEAR UP', '#cfe6ff');
    return;
  }
  if (game.state === 'landed' && code === 'Enter') {
    // Take off again from the runway where she stopped.
    const p = game.plane;
    p.fuel = 100;
    p.damage = Math.max(0, p.damage - 10);
    p.throttle = 60;
    game.state = 'flying';
    game.message('TAKEOFF — FLY!', '#9be29b');
  }
};

game.input.onClick = (x, y) => {
  game.audio.ensure();
  if (game.state !== 'title') return;
  // Title-screen leg rows: click one to fly it.
  game.missionList.forEach((m, i) => {
    const rowY = 272 + i * 34;
    if (Math.abs(y - rowY) < 18) startLeg(i);
  });
};

bindInput(game.input, canvas);

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.view.width = w;
  game.view.height = h;
  // Keep the vertical scale readable on short windows: about 0.56 px per
  // metre at 480 px high, so ~450 m of sky fits on screen.
  game.vScale = Math.max(0.32, Math.min(0.62, h / 850));
}
window.addEventListener('resize', resize);
resize();

// Screenshot scenes (?scene=ring|runway|cruise|title) drop the game straight
// into a real flight state so the screenshots show genuine gameplay.
function applyScene() {
  const scene = new URLSearchParams(window.location.search).get('scene');
  if (!scene) return;
  loadBest();
  if (scene === 'title') {
    backToTitle();
    return;
  }
  const leg = scene === 'cruise' ? 2 : scene === 'runway' ? 0 : 1;
  startLeg(leg);
  const p = game.plane;
  if (scene === 'ring') {
    // Mid-flight, a golden ring dead ahead, runway and fields below.
    const ring = game.rings[2];
    p.x = ring.x - 260;
    p.alt = ring.alt + 6;
    p.speed = 128;
    p.throttle = 72;
    p.pitch = 2;
    game.score = 340;
    game.ringsHit = 2;
    game.combo = 2;
  } else if (scene === 'runway') {
    // Final approach: low over the destination runway, gear down, flaps set.
    // All rings already collected, so the runway ahead is the whole story.
    p.x = game.rings[game.rings.length - 1].x + 150;
    p.alt = 62;
    p.speed = 96;
    p.throttle = 48;
    p.pitch = -4;
    p.gear = true;
    game.score = 720;
    game.ringsHit = game.rings.length;
  } else if (scene === 'cruise') {
    // High over the island chain, sea glittering below, storm cell ahead:
    // the next ring sits just ahead and a touch above the nose.
    const ring = game.rings[6];
    p.x = ring.x - 480;
    p.alt = ring.alt - 10;
    p.speed = 145;
    p.throttle = 80;
    p.pitch = 3;
    game.score = 1150;
    game.ringsHit = 6;
    game.combo = 3;
  }
  // Rings already collected in this staged state show as passed, so no
  // ring ever sits on top of the plane in a screenshot.
  game.rings.forEach((ring, i) => {
    if (i < game.ringsHit) ring.passed = true;
  });
  game.camAlt = p.alt;
  game.frozen = true;
  game.banner = '';
}

function step(dt) {
  game.time += dt;
  if (game.bannerT > 0) game.bannerT -= dt;
  const p = game.plane;

  if (game.state === 'title') {
    // Attract mode: the plane cruises across the title screen on her own.
    p.x += 62 * dt;
    if (p.x > 9000) p.x = 200;
    p.alt = 150 + Math.sin(game.time * 0.4) * 18;
    p.pitch = Math.cos(game.time * 0.4) * 4;
    p.prop += dt * 20;
    return;
  }
  if (game.state !== 'flying') return;

  updatePlane(game, dt);
  updateRings(game, dt);

  // Camera follows altitude smoothly so the plane never slams the frame.
  game.camAlt += (p.alt - game.camAlt) * Math.min(1, 2.2 * dt);

  // Storm turbulence: inside a storm cloud the air shoves the plane around.
  for (const c of game.sky.clouds) {
    if (!c.storm) continue;
    const dx = Math.abs(c.x - p.x);
    if (dx < 120 && Math.abs(c.alt - p.alt) < 60) {
      p.pitch += (Math.random() - 0.5) * 22 * dt;
      p.alt += (Math.random() - 0.5) * 14 * dt;
      p.shake = Math.max(p.shake, 0.35);
    }
  }

  // Passed the end of the leg without landing: she must turn back is not
  // modelled, so the leg ends in an overrun crash past the runway.
  if (p.x > game.mission.length + 200) {
    game.state = 'crashed';
    game.audio.crash();
    game.message('OVERRAN THE AIRFIELD!', '#ff5a4e');
  }

  const contact = groundContact(game);
  if (contact) applyGroundContact(game, contact);

  if (game.state === 'crashed' || game.state === 'complete') saveBest();
}

// Engine drone and wind follow the plane in every state, so a crash silences
// the engine instead of leaving it humming.
function updateAudio() {
  game.audio.update(game.plane.throttle, game.plane.speed, game.state === 'flying');
}

function render() {
  const { width: W, height: H } = game.view;
  drawSky(ctx, game);
  drawClouds(ctx, game);
  drawTerrain(ctx, game);
  drawRings(ctx, game);
  updateBirds(ctx, game, 0); // birds drawn here; motion stepped in step()
  drawPlane(ctx, game);
  drawParticles(ctx, game, 0);
  if (game.state !== 'title') {
    drawTopHud(ctx, game);
    drawInstruments(ctx, game);
    drawMessage(ctx, game);
  }
  if (game.state === 'title') drawTitle(ctx, game);
  else if (game.state === 'paused') drawPaused(ctx, game);
  else if (game.state === 'crashed') drawCrashed(ctx, game);
  else if (game.state === 'landed') drawLanded(ctx, game);
  else if (game.state === 'complete') drawComplete(ctx, game);
}

// Birds need a real dt for their flap; step them inside the frame loop.
function stepBirds(dt) {
  const { sky } = game;
  for (const b of sky.birds) {
    if (b.hit) continue;
    b.x += b.speed * dt;
    b.phase += dt * 9;
    if (b.x < game.plane.x - 400) b.x = game.plane.x + 1400 + Math.random() * 600;
  }
}

game.onBirdStrike = (bird) => {
  const p = game.plane;
  p.damage += 15;
  p.shake = 1;
  game.audio.thud();
  game.spawnBurst(bird.x, bird.alt, '#ff5a4e', 12);
  game.message('BIRD STRIKE — HULL DAMAGE!', '#ff9a4e');
  if (p.damage >= 100) {
    game.state = 'crashed';
    game.audio.crash();
  }
};

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.frozen) {
    step(dt);
    stepBirds(dt);
    // Particles age in real time.
    const list = game.sky.particles;
    for (let i = list.length - 1; i >= 0; i--) {
      const pt = list[i];
      pt.life -= dt;
      if (pt.life <= 0) list.splice(i, 1);
      else {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
      }
    }
  }
  updateAudio();
  render();
  requestAnimationFrame(frame);
}

loadBest();
backToTitle();
applyScene();
requestAnimationFrame(frame);

// Test hook: the play-test reads window.__aurora to confirm the game booted.
window.__aurora = game;
