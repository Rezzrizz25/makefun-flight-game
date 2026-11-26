// terrain.js — the island world below: coastline, patchwork fields, hills,
// mountains, little towns and the runways every leg starts and ends on.
// Terrain is a pure function of world-x, so the same mission always flies the
// same ground; the plane never meets a surprise the map did not promise.

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise(x, scale) {
  const xi = Math.floor(x / scale);
  const xf = (x / scale) - xi;
  const u = xf * xf * (3 - 2 * xf);
  return hash(xi) * (1 - u) + hash(xi + 1) * u;
}

// Mission profiles shape the ground: gentle coast, rugged mountains, sea gaps.
export const MISSIONS = [
  {
    name: 'LEG 1 · COAST RUN',
    sub: 'Harbourfield → Gull Bay · 8 rings',
    length: 9000,
    hills: 26,
    mountains: 0.25,
    sea: 0.12,
    rings: 8,
    seed: 11,
    fuel: 100,
  },
  {
    name: 'LEG 2 · MOUNTAIN PASS',
    sub: 'Gull Bay → High Tarn · 10 rings',
    length: 11000,
    hills: 55,
    mountains: 1.0,
    sea: 0.05,
    rings: 10,
    seed: 47,
    fuel: 100,
  },
  {
    name: 'LEG 3 · ISLAND HOP',
    sub: 'High Tarn → Aurora Bay · 12 rings',
    length: 13000,
    hills: 34,
    mountains: 0.5,
    sea: 0.45,
    rings: 12,
    seed: 83,
    fuel: 80,
  },
];

export function terrainHeight(game, x) {
  const m = game.mission;
  // Runways are flat: the first 420 m and the last 420 m of every leg.
  if (x < 420 || x > m.length - 420) return 18;
  const base = 14
    + smoothNoise(x + m.seed * 977, 900) * m.hills
    + smoothNoise(x + m.seed * 331, 260) * m.hills * 0.45;
  // Mountain spine in the middle of the leg for the pass; sea dips elsewhere.
  const spine = Math.exp(-Math.pow((x - m.length * 0.55) / (m.length * 0.16), 2));
  const mountain = spine * 150 * m.mountains * (0.6 + smoothNoise(x, 300) * 0.8);
  const seaDip = smoothNoise(x + m.seed * 57, 1500) < m.sea ? -26 : 0;
  return Math.max(-22, base + mountain + seaDip);
}

export function isSea(game, x) {
  return terrainHeight(game, x) < 0;
}

export function runwayAt(game, x) {
  const m = game.mission;
  if (x < 420) return 'start';
  if (x > m.length - 420) return 'end';
  return null;
}

function drawDistantMountains(ctx, game) {
  const { width: W, height: H } = game.view;
  // Two parallax ridges, drawn from the same noise so they never jump.
  for (let layer = 0; layer < 2; layer++) {
    const depth = layer === 0 ? 0.25 : 0.45;
    const baseY = game.screenY(60 + layer * 40);
    ctx.fillStyle = layer === 0 ? 'rgba(122, 148, 190, 0.75)' : 'rgba(88, 118, 158, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let sx = 0; sx <= W; sx += 16) {
      const wx = game.plane.x * depth + sx * 2.2;
      const peak = 40 + smoothNoise(wx + layer * 5000, 420) * (90 + layer * 70);
      ctx.lineTo(sx, baseY - peak);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }
}

function drawFields(ctx, game, groundTop) {
  const { width: W } = game.view;
  // Patchwork fields: coloured rectangles hugging the ground line, seeded by
  // ground column so they scroll with the world instead of the screen.
  const palette = ['#7fae4e', '#a8b545', '#c9a94f', '#6d9e46', '#b98a4a', '#8fae52'];
  const colW = 90;
  const startCol = Math.floor((game.plane.x - 500) / colW);
  for (let c = startCol; c < startCol + Math.ceil(W / colW) + 2; c++) {
    const wx = c * colW;
    const h = terrainHeight(game, wx);
    if (h < 2) continue; // sea has no fields
    const sx = game.worldToScreenX(wx);
    const top = groundTop(wx);
    const colour = palette[Math.floor(hash(c * 3.7) * palette.length)];
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(sx, top, colW + 2, 90);
    ctx.globalAlpha = 1;
  }
}

function drawTown(ctx, game, groundTop) {
  // A few tiny houses with warm lit windows cluster near each runway.
  const towns = [700, game.mission.length - 700];
  for (const tx of towns) {
    for (let i = 0; i < 6; i++) {
      const wx = tx + i * 34 - 90;
      const h = terrainHeight(game, wx);
      if (h < 2) continue;
      const sx = game.worldToScreenX(wx);
      const top = groundTop(wx);
      const w = 22 + hash(i * 13 + tx) * 10;
      const hh = 14 + hash(i * 29 + tx) * 10;
      ctx.fillStyle = '#e8dcc8';
      ctx.fillRect(sx, top - hh, w, hh);
      ctx.fillStyle = '#a34d3a';
      ctx.beginPath();
      ctx.moveTo(sx - 2, top - hh);
      ctx.lineTo(sx + w / 2, top - hh - 9);
      ctx.lineTo(sx + w + 2, top - hh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd977';
      ctx.fillRect(sx + 4, top - hh + 5, 5, 6);
      ctx.fillRect(sx + w - 9, top - hh + 5, 5, 6);
    }
  }
}

function drawRunway(ctx, game, groundTop, which) {
  const m = game.mission;
  const x0 = which === 'start' ? 0 : m.length - 420;
  const x1 = which === 'start' ? 420 : m.length;
  const sx0 = game.worldToScreenX(x0);
  const sx1 = game.worldToScreenX(x1);
  if (sx1 < -50 || sx0 > game.view.width + 50) return;
  const top = groundTop(x0);
  // Asphalt strip with centre dashes and threshold bars.
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(sx0, top - 2, sx1 - sx0, 10);
  ctx.fillStyle = '#f5f5f0';
  const dashW = 26;
  for (let x = sx0 + 14; x < sx1 - 14; x += 52) {
    ctx.fillRect(x, top + 1, dashW, 3);
  }
  ctx.fillStyle = '#ffd23e';
  ctx.fillRect(sx0, top - 4, 6, 14);
  ctx.fillRect(sx1 - 6, top - 4, 6, 14);
  // Windsock on a pole beside the strip.
  const poleX = sx0 + (which === 'start' ? 40 : (sx1 - sx0) - 40);
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(poleX, top - 2);
  ctx.lineTo(poleX, top - 42);
  ctx.stroke();
  ctx.fillStyle = '#ff7a3c';
  ctx.beginPath();
  ctx.moveTo(poleX, top - 42);
  ctx.lineTo(poleX + 26, top - 38);
  ctx.lineTo(poleX, top - 32);
  ctx.closePath();
  ctx.fill();
  // Runway label, readable from the air.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(which === 'start' ? 'HARBOURFIELD' : 'DESTINATION', (sx0 + sx1) / 2, top - 14);
  ctx.textAlign = 'left';
}

export function drawTerrain(ctx, game) {
  const { width: W, height: H } = game.view;
  drawDistantMountains(ctx, game);
  const groundTop = (wx) => game.screenY(terrainHeight(game, wx));

  // Ground polygon: land in grass green, sea as animated blue.
  const step = 14;
  const xStart = game.plane.x - 600;
  const xEnd = game.plane.x + 1600;
  ctx.beginPath();
  ctx.moveTo(game.worldToScreenX(xStart), H + 4);
  for (let wx = xStart; wx <= xEnd; wx += step) {
    ctx.lineTo(game.worldToScreenX(wx), groundTop(wx));
  }
  ctx.lineTo(game.worldToScreenX(xEnd), H + 4);
  ctx.closePath();
  const landGrad = ctx.createLinearGradient(0, game.screenY(120), 0, H);
  landGrad.addColorStop(0, '#69a84f');
  landGrad.addColorStop(0.4, '#4e8a3d');
  landGrad.addColorStop(1, '#2f5d2a');
  ctx.fillStyle = landGrad;
  ctx.fill();

  drawFields(ctx, game, groundTop);

  // Sea: only where the ground dips below zero, paint water from the
  // waterline down, with a sun glitter that shimmers as time passes.
  const seaGrad = ctx.createLinearGradient(0, game.screenY(0), 0, H);
  seaGrad.addColorStop(0, '#3f8fc4');
  seaGrad.addColorStop(1, '#1d5a8a');
  ctx.fillStyle = seaGrad;
  let runStart = null;
  const paintRun = (a, b) => {
    ctx.beginPath();
    ctx.moveTo(game.worldToScreenX(a), game.screenY(0));
    ctx.lineTo(game.worldToScreenX(b), game.screenY(0));
    ctx.lineTo(game.worldToScreenX(b), H + 4);
    ctx.lineTo(game.worldToScreenX(a), H + 4);
    ctx.closePath();
    ctx.fill();
  };
  for (let wx = xStart; wx <= xEnd; wx += step) {
    if (terrainHeight(game, wx) < 0) {
      if (runStart === null) runStart = wx;
    } else if (runStart !== null) {
      paintRun(runStart, wx);
      runStart = null;
    }
  }
  if (runStart !== null) paintRun(runStart, xEnd);
  // Sun glitter on the water.
  ctx.strokeStyle = 'rgba(255, 230, 160, 0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const wx = xStart + ((i * 173 + Math.floor(game.time * 30)) % 2200);
    if (terrainHeight(game, wx) >= 0) continue;
    const sx = game.worldToScreenX(wx);
    const sy = game.screenY(-2 - (i % 5) * 3) + Math.sin(game.time * 2 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(sx - 14, sy);
    ctx.lineTo(sx + 14, sy);
    ctx.stroke();
  }

  drawTown(ctx, game, groundTop);
  drawRunway(ctx, game, groundTop, 'start');
  drawRunway(ctx, game, groundTop, 'end');
}
