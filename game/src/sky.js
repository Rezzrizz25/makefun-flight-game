// sky.js — the sky, sun, drifting clouds, storm cells, birds and particles.
// Everything here is drawn fresh each frame from the game's clock, so the sky
// always matches the time of day the mission flies in (golden late afternoon).

export function makeSky(seed) {
  // Seeded clouds: each cloud keeps its world position so it scrolls past
  // naturally as the plane advances, instead of teleporting.
  const clouds = [];
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = 0; i < 55; i++) {
    clouds.push({
      x: rnd() * 26000,
      alt: 230 + rnd() * 280,
      scale: 0.5 + rnd() * 0.9,
      speed: 2 + rnd() * 4,
      storm: rnd() < 0.10,
      puff: 0.6 + rnd() * 0.8,
    });
  }
  const birds = [];
  for (let i = 0; i < 14; i++) {
    birds.push({
      x: 400 + rnd() * 12000,
      alt: 90 + rnd() * 160,
      phase: rnd() * Math.PI * 2,
      speed: 8 + rnd() * 6,
      hit: false,
    });
  }
  return { clouds, birds, particles: [] };
}

export function drawSky(ctx, game) {
  const { width: W, height: H } = game.view;
  // Golden-hour gradient: warm horizon, deep blue up top.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d4e89');
  g.addColorStop(0.45, '#5f96c8');
  g.addColorStop(0.72, '#f7c873');
  g.addColorStop(1, '#f2a35e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Low sun, upper right, with a soft halo.
  const sx = W * 0.82;
  const sy = H * 0.2;
  const halo = ctx.createRadialGradient(sx, sy, 4, sx, sy, 150);
  halo.addColorStop(0, 'rgba(255, 236, 170, 0.95)');
  halo.addColorStop(0.25, 'rgba(255, 205, 110, 0.55)');
  halo.addColorStop(1, 'rgba(255, 205, 110, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sx - 160, sy - 160, 320, 320);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sx, sy, 26, 0, Math.PI * 2);
  ctx.fill();
}

function cloudPuff(ctx, x, y, r, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawClouds(ctx, game) {
  const { sky, view } = game;
  const W = view.width;
  for (const c of sky.clouds) {
    // Wrap clouds across the screen with a simple modulo on screen space.
    const wrapped = (((c.x - game.plane.x * 0.55) % 3000) + 3000) % 3000;
    const cx = wrapped * (W / 3000) - 100;
    const cy = game.screenY(c.alt);
    const s = c.scale;
    if (cx < -260 || cx > W + 260 || cy < -80 || cy > view.height) continue;
    ctx.save();
    ctx.globalAlpha = c.storm ? 0.9 : 0.75;
    const base = c.storm ? '#5a6274' : '#ffffff';
    const shade = c.storm ? '#3d4454' : '#e8eef7';
    cloudPuff(ctx, cx, cy, 34 * s, base);
    cloudPuff(ctx, cx + 30 * s, cy + 6 * s, 26 * s, base);
    cloudPuff(ctx, cx - 32 * s, cy + 8 * s, 24 * s, shade);
    cloudPuff(ctx, cx + 8 * s, cy - 16 * s, 24 * s, base);
    cloudPuff(ctx, cx - 12 * s, cy + 14 * s, 20 * s, shade);
    if (c.storm) {
      // Rain streaks under a storm cell.
      ctx.strokeStyle = 'rgba(180, 200, 230, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const rx = cx - 40 + i * 16;
        ctx.moveTo(rx, cy + 26);
        ctx.lineTo(rx - 4, cy + 52);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Birds: tiny flapping silhouettes. Returns the bird the plane hit, if any.
export function updateBirds(ctx, game, dt) {
  const { sky } = game;
  ctx.save();
  ctx.strokeStyle = '#2b2b33';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const b of sky.birds) {
    if (b.hit) continue;
    b.x += b.speed * dt;
    b.phase += dt * 9;
    // Recycle birds far behind the plane, ahead again.
    if (b.x < game.plane.x - 400) b.x = game.plane.x + 1400 + Math.random() * 600;
    if (b.x > game.plane.x + 2200) continue;
    const sx = game.worldToScreenX(b.x);
    const sy = game.screenY(b.alt + Math.sin(b.phase * 0.5) * 4);
    const flap = Math.sin(b.phase) * 5;
    ctx.beginPath();
    ctx.moveTo(sx - 9, sy - flap);
    ctx.quadraticCurveTo(sx, sy + 2, sx, sy);
    ctx.quadraticCurveTo(sx, sy + 2, sx + 9, sy - flap);
    ctx.stroke();
    // Collision with the plane: generous but fair.
    const dx = b.x - game.plane.x;
    const dy = b.alt - game.plane.alt;
    if (Math.abs(dx) < 14 && Math.abs(dy) < 10) {
      b.hit = true;
      game.onBirdStrike(b);
    }
  }
  ctx.restore();
}

export function spawnParticles(game, x, y, n, colour) {
  for (let i = 0; i < n; i++) {
    game.sky.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 90,
      vy: (Math.random() - 0.5) * 90 - 20,
      life: 0.5 + Math.random() * 0.7,
      max: 1.2,
      colour,
      size: 2 + Math.random() * 4,
    });
  }
}

export function drawParticles(ctx, game, dt) {
  const list = game.sky.particles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.arc(game.worldToScreenX(p.x), game.screenY(p.y), p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
