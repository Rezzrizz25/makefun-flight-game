// rings.js — the golden target rings, the three legs' scoring, and the
// ground-contact rules: what counts as a landing, a rough touchdown, or a crash.

import { terrainHeight, runwayAt } from './terrain.js';

export function buildRings(game) {
  const m = game.mission;
  const rings = [];
  let s = m.seed * 7 + 3;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const spacing = (m.length - 1200) / m.rings;
  for (let i = 0; i < m.rings; i++) {
    const x = 800 + i * spacing + rnd() * spacing * 0.4;
    const ground = terrainHeight(game, x);
    const alt = Math.max(ground + 55, 60 + rnd() * 130);
    rings.push({ x, alt, r: 30, passed: false, near: false, pulse: rnd() * Math.PI * 2 });
  }
  return rings;
}

// A ring is passed when the plane crosses its x within its circle; a close
// fly-by still earns a near-miss bonus so a brave line is never wasted.
export function updateRings(game, dt) {
  const p = game.plane;
  let combo = 1;
  for (const ring of game.rings) {
    ring.pulse += dt * 3;
    if (ring.passed) continue;
    const dx = ring.x - p.x;
    if (dx > 30 || dx < -30) continue;
    const dy = ring.alt - p.alt;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ring.r) {
      ring.passed = true;
      game.ringsHit++;
      combo = Math.min(5, game.combo + 1);
      game.combo = combo;
      const pts = 100 * combo;
      game.score += pts;
      game.comboTimer = 9; // nine seconds to reach the next ring, or the combo fades
      game.audio.ring();
      game.message(`RING! +${pts}  (x${combo} combo)`, '#ffd23e');
      game.spawnBurst(ring.x, ring.alt, '#ffd23e', 16);
    } else if (dist < ring.r + 26 && !ring.near) {
      ring.near = true;
      game.score += 25;
      game.message('NEAR MISS +25', '#cfe6ff');
    }
  }
  // Combo fades if the pilot dawdles between rings.
  game.comboTimer -= dt;
  if (game.comboTimer <= 0) game.combo = 0;
}

export function drawRings(ctx, game) {
  for (const ring of game.rings) {
    // Rings left behind the plane are out of the story; never draw one
    // sitting on top of the aircraft. Passed rings are not drawn either:
    // the rings counter already records them, and a faint ghost circle
    // under the plane reads as a smudge, not a trophy.
    if (ring.passed) continue;
    if (ring.x < game.plane.x - 60) continue;
    const sx = game.worldToScreenX(ring.x);
    if (sx < -120 || sx > game.view.width + 120) continue;
    const sy = game.screenY(ring.alt);
    const r = ring.r * 0.9 + 8;
    const pulse = 1 + Math.sin(ring.pulse) * 0.06;
    ctx.save();
    if (ring.passed) {
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#9be29b';
    } else {
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = '#ffd23e';
      ctx.shadowColor = '#ffb400';
      ctx.shadowBlur = 18;
    }
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(sx, sy, r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = ring.passed ? '#cfe8cf' : '#fff3c4';
    ctx.beginPath();
    ctx.arc(sx, sy, r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    // Distance tag so the pilot can judge the approach.
    if (!ring.passed) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#3a2c00';
      ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      const dist = Math.max(0, Math.round((ring.x - game.plane.x) * 3.28));
      ctx.fillText(`${dist} ft`, sx, sy - r - 8);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }
}

// Ground contact: landing, rough touchdown, ditching in the sea, or a crash.
// Returns 'landed' | 'rough' | 'crash' | null.
export function groundContact(game) {
  const p = game.plane;
  const ground = terrainHeight(game, p.x);
  const agl = p.alt - ground;
  if (agl > 1.5) return null;
  // Still sitting on the departure runway before takeoff: not a landing.
  if (!p.airborne && p.vy >= -1) return null;
  const runway = runwayAt(game, p.x);
  const sea = ground < 0;
  const descent = -p.vy;
  const gentle = descent < 7 && p.speed < 105;

  if (sea) {
    if (gentle && p.speed < 80) return 'ditch';
    return 'crash';
  }
  if (runway && p.gear && gentle) return 'landed';
  if (gentle) return 'rough';
  return 'crash';
}

export function applyGroundContact(game, kind) {
  const p = game.plane;
  if (kind === 'landed') {
    game.state = 'landed';
    p.airborne = false;
    const ringBonus = game.ringsHit * 50;
    const fuelBonus = Math.round(p.fuel * 2);
    const total = 500 + ringBonus + fuelBonus;
    game.score += total;
    game.audio.land();
    game.message(`TOUCHDOWN! +${total} (landing 500 + rings ${ringBonus} + fuel ${fuelBonus})`, '#9be29b');
    if (p.x > game.mission.length - 420) {
      game.state = 'complete';
      game.audio.win();
    }
  } else if (kind === 'rough') {
    p.damage += 22;
    p.alt = terrainHeight(game, p.x) + 6;
    p.vy = 6;
    p.speed *= 0.7;
    p.shake = 1;
    game.audio.thud();
    game.message('ROUGH LANDING — HULL DAMAGE!', '#ff9a4e');
    if (p.damage >= 100) game.state = 'crashed';
  } else if (kind === 'ditch') {
    p.damage += 30;
    p.alt = 2;
    p.vy = 4;
    p.speed *= 0.55;
    p.shake = 1;
    game.audio.thud();
    game.message('DITCHED IN THE SEA — HULL DAMAGE!', '#7fc4ff');
    if (p.damage >= 100) game.state = 'crashed';
  } else {
    game.state = 'crashed';
    p.shake = 1.5;
    game.audio.crash();
    game.spawnBurst(p.x, p.alt, '#ff5a4e', 30);
    game.spawnBurst(p.x, p.alt, '#333333', 20);
  }
}
