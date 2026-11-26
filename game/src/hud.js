// hud.js — the lit instrument panel: top HUD bar (ALT / SPD / HDG, score,
// rings, fuel) and the bottom strip (artificial horizon, airspeed dial,
// altimeter tape, throttle lever, fuel gauge, compass). Plus the title,
// pause, crash and mission-complete overlays.

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 18, 30, 0.82)';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 190, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, colour = '#9fc4e8') {
  ctx.fillStyle = colour;
  ctx.font = 'bold 10px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

function value(ctx, text, x, y, colour = '#ffffff', size = 20) {
  ctx.fillStyle = colour;
  ctx.font = `bold ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

export function drawTopHud(ctx, game) {
  const { width: W } = game.view;
  const p = game.plane;
  const agl = Math.max(0, p.alt - game.groundHeight(p.x));
  const hdg = 90 + Math.round(-p.pitch * 0.6);
  panel(ctx, 10, 8, W - 20, 46);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 17px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('✈ AURORA RUN', 24, 38);
  // Mission name and sub, left-aligned clear of the centre instruments.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 10px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(game.mission.name, 205, 24);
  ctx.fillStyle = '#cfe6ff';
  ctx.font = '12px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(game.mission.sub, 205, 42);

  const cx = W / 2;
  label(ctx, 'ALTITUDE', cx - 150, 22);
  value(ctx, `${Math.round(p.alt * 3.28).toLocaleString()} ft`, cx - 150, 45);
  label(ctx, 'AIRSPEED', cx - 30, 22);
  value(ctx, `${Math.round(p.speed)} kt`, cx - 30, 45, p.speed < 58 ? '#ff9a4e' : '#ffffff');
  label(ctx, 'HEADING', cx + 90, 22);
  value(ctx, `${String(((hdg % 360) + 360) % 360).padStart(3, '0')}°`, cx + 90, 45);
  label(ctx, 'VERT SPEED', cx + 200, 22);
  value(ctx, `${p.vy >= 0 ? '+' : ''}${Math.round(p.vy * 196)} fpm`, cx + 200, 45, p.vy >= 0 ? '#9be29b' : '#ff9a4e', 16);

  // Right side: score, rings, fuel bar.
  const rx = W - 250;
  label(ctx, 'SCORE', rx + 30, 22);
  value(ctx, `${game.score}`, rx + 30, 45, '#ffd23e');
  label(ctx, 'RINGS', rx + 115, 22);
  value(ctx, `${game.ringsHit}/${game.rings.length}`, rx + 115, 45);
  label(ctx, 'FUEL', rx + 195, 22);
  ctx.fillStyle = '#222f42';
  roundRect(ctx, rx + 155, 30, 80, 12, 6);
  ctx.fill();
  ctx.fillStyle = p.fuel < 25 ? '#ff5a4e' : '#7fd67f';
  const fw = Math.max(0, (p.fuel / 100) * 78);
  if (fw > 0) {
    roundRect(ctx, rx + 156, 31, fw, 10, 5);
    ctx.fill();
  }
  if (p.speed < 58 && game.state === 'flying') {
    ctx.fillStyle = '#ff5a4e';
    ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STALL — ADD THROTTLE', cx, 72);
    ctx.textAlign = 'left';
  }
  if (agl < 60 && game.state === 'flying') {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ LOW — PULL UP', cx, 72);
    ctx.textAlign = 'left';
  }
}

function drawHorizon(ctx, game, x, y, r) {
  const p = game.plane;
  ctx.save();
  panel(ctx, x - r - 8, y - r - 20, r * 2 + 16, r * 2 + 34);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  // Sky half and ground half rotate with pitch, shift with climb.
  ctx.translate(x, y);
  ctx.rotate((p.pitch * Math.PI) / 180 * 0.5);
  ctx.translate(0, Math.max(-r, Math.min(r, p.vy * 1.2)));
  ctx.fillStyle = '#4f8fd0';
  ctx.fillRect(-r - 2, -r - 2, r * 2 + 4, r + 2);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r - 2, 0, r * 2 + 4, r + 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-r - 2, -1, r * 2 + 4, 2);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#9fc4e8';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Fixed wings marker: the aircraft symbol never moves.
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.lineTo(x - 6, y);
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + 18, y);
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd23e';
  ctx.fill();
  ctx.restore();
  label(ctx, 'ATTITUDE', x, y + r + 10);
}

function drawDial(ctx, x, y, r, frac, colour, text, unit) {
  ctx.save();
  panel(ctx, x - r - 8, y - r - 20, r * 2 + 16, r * 2 + 34);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1826';
  ctx.fill();
  ctx.strokeStyle = '#9fc4e8';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Tick marks.
  for (let i = 0; i <= 10; i++) {
    const a = (-210 + i * 24) * (Math.PI / 180);
    const inner = i % 5 === 0 ? r - 10 : r - 6;
    ctx.strokeStyle = '#cfe6ff';
    ctx.lineWidth = i % 5 === 0 ? 2.5 : 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.stroke();
  }
  const a = (-210 + frac * 240) * (Math.PI / 180);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * (r - 8), y + Math.sin(a) * (r - 8));
  ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  value(ctx, text, x, y + r + 10, '#ffffff', 13);
  label(ctx, unit, x, y + r + 21, '#9fc4e8');
  ctx.restore();
}

export function drawInstruments(ctx, game) {
  const { width: W, height: H } = game.view;
  const p = game.plane;
  const y = H - 62;
  const stripY = H - 96;
  panel(ctx, 10, stripY, W - 20, 88);

  // Artificial horizon.
  drawHorizon(ctx, game, 92, y + 8, 24);
  // Airspeed dial: 0–200 kt.
  drawDial(ctx, 210, y + 8, 24, Math.min(1, p.speed / 200), '#7fd67f', `${Math.round(p.speed)}`, 'KNOTS');
  // Altimeter dial: 0–2000 ft.
  drawDial(ctx, 330, y + 8, 24, Math.min(1, (p.alt * 3.28) / 2000), '#7fc4ff', `${Math.round(p.alt * 3.28)}`, 'FEET');
  // Throttle lever (vertical) with a glowing detent.
  const tx = 448;
  label(ctx, 'THROTTLE', tx, stripY + 16);
  ctx.fillStyle = '#0d1826';
  roundRect(ctx, tx - 8, stripY + 22, 16, 56, 8);
  ctx.fill();
  ctx.strokeStyle = '#9fc4e8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const leverY = stripY + 72 - (p.throttle / 100) * 46;
  ctx.fillStyle = p.boost > 0 ? '#ffd23e' : '#ff7a3c';
  roundRect(ctx, tx - 12, leverY - 5, 24, 10, 5);
  ctx.fill();
  value(ctx, `${Math.round(p.throttle)}%`, tx, stripY + 90, '#ffffff', 12);

  // Fuel gauge: vertical bar with a lit scale.
  const fx = 520;
  label(ctx, 'FUEL', fx, stripY + 16);
  ctx.fillStyle = '#0d1826';
  roundRect(ctx, fx - 8, stripY + 22, 16, 56, 8);
  ctx.fill();
  const fh = (p.fuel / 100) * 54;
  ctx.fillStyle = p.fuel < 25 ? '#ff5a4e' : '#7fd67f';
  if (fh > 1) {
    roundRect(ctx, fx - 7, stripY + 77 - fh, 14, fh, 6);
    ctx.fill();
  }
  value(ctx, `${Math.round(p.fuel)}%`, fx, stripY + 90, '#ffffff', 12);

  // Damage gauge.
  const dx = 592;
  label(ctx, 'HULL', dx, stripY + 16);
  ctx.fillStyle = '#0d1826';
  roundRect(ctx, dx - 8, stripY + 22, 16, 56, 8);
  ctx.fill();
  const dh = ((100 - p.damage) / 100) * 54;
  ctx.fillStyle = p.damage > 60 ? '#ff5a4e' : '#7fd67f';
  if (dh > 1) {
    roundRect(ctx, dx - 7, stripY + 77 - dh, 14, dh, 6);
    ctx.fill();
  }
  value(ctx, `${Math.round(100 - p.damage)}%`, dx, stripY + 90, '#ffffff', 12);

  // Compass strip: heading tape with the runway course marked.
  const compassX = W - 330;
  label(ctx, 'COMPASS — RUNWAY COURSE 090°', compassX + 150, stripY + 16);
  ctx.fillStyle = '#0d1826';
  roundRect(ctx, compassX, stripY + 22, 300, 30, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, compassX, stripY + 22, 300, 30, 8);
  ctx.clip();
  const hdg = 90 - p.pitch * 0.6;
  for (let d = 0; d < 360; d += 15) {
    const off = ((d - hdg + 540) % 360) - 180;
    const px = compassX + 150 + off * 3;
    if (px < compassX - 10 || px > compassX + 310) continue;
    ctx.strokeStyle = d % 90 === 0 ? '#ffd23e' : '#9fc4e8';
    ctx.lineWidth = d % 90 === 0 ? 2.5 : 1;
    ctx.beginPath();
    ctx.moveTo(px, stripY + 44);
    ctx.lineTo(px, stripY + (d % 90 === 0 ? 28 : 36));
    ctx.stroke();
    if (d % 90 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(d).padStart(3, '0'), px, stripY + 34);
      ctx.textAlign = 'left';
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(compassX + 150, stripY + 22);
  ctx.lineTo(compassX + 144, stripY + 14);
  ctx.lineTo(compassX + 156, stripY + 14);
  ctx.closePath();
  ctx.fill();

  // Gear + distance-to-go readout.
  const dist = Math.max(0, game.mission.length - p.x);
  ctx.fillStyle = '#cfe6ff';
  ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`DEST ${(dist * 0.000621).toFixed(1)} mi`, W - 26, stripY + 40);
  ctx.fillText(`GEAR ${p.gear ? 'DOWN ✓' : 'UP'}  [G]`, W - 26, stripY + 62);
  ctx.fillText(`NEXT ${game.nextRingLabel()} ${(game.nextRingDist() * 3.28).toFixed(0)} ft`, W - 26, stripY + 84);
  ctx.textAlign = 'left';
}

export function drawMessage(ctx, game) {
  if (!game.banner || game.bannerT <= 0) return;
  const { width: W } = game.view;
  ctx.save();
  ctx.globalAlpha = Math.min(1, game.bannerT);
  ctx.font = 'bold 22px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 8;
  ctx.fillStyle = game.bannerColour;
  ctx.fillText(game.banner, W / 2, 92);
  ctx.restore();
  ctx.textAlign = 'left';
}

function overlay(ctx, game, title, lines, accent) {
  const { width: W, height: H } = game.view;
  ctx.fillStyle = 'rgba(8, 14, 26, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px "Trebuchet MS", Verdana, sans-serif';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 12;
  ctx.fillText(title, W / 2, H / 2 - 90);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eaf3ff';
  ctx.font = '18px "Trebuchet MS", Verdana, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 - 44 + i * 28));
  ctx.restore();
}

export function drawTitle(ctx, game) {
  const { width: W, height: H } = game.view;
  ctx.fillStyle = 'rgba(8, 14, 26, 0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 56px "Trebuchet MS", Verdana, sans-serif';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 14;
  ctx.fillText('✈ AURORA RUN', W / 2, 108);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('— SKY COURIER —', W / 2, 142);
  ctx.fillStyle = '#d7e8ff';
  ctx.font = '16px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('Fly the mail plane across the islands. Thread the golden rings,', W / 2, 176);
  ctx.fillText('mind your fuel, and put her down gently on the far runway.', W / 2, 198);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 17px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('PICK A LEG — click, or press 1 / 2 / 3', W / 2, 240);
  game.missionList.forEach((m, i) => {
    const y = 272 + i * 34;
    const locked = false;
    ctx.fillStyle = locked ? '#8a97a8' : '#ffffff';
    ctx.font = 'bold 16px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(`${i + 1}. ${m.name} — ${m.sub}`, W / 2, y);
  });
  ctx.fillStyle = '#cfe6ff';
  ctx.font = '15px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('W/S or ↑/↓ throttle · A/D or ←/→ pitch · mouse steers · wheel trims throttle', W / 2, H - 66);
  ctx.fillText('SPACE flap boost · G landing gear · P pause · R restart · M sound', W / 2, H - 42);
  ctx.restore();
}

export function drawPaused(ctx, game) {
  overlay(ctx, game, 'PAUSED', ['Press P to keep flying.', 'R restarts the leg.'], '#cfe6ff');
}

export function drawCrashed(ctx, game) {
  overlay(ctx, game, 'CRASHED', [
    `Score ${game.score} · Rings ${game.ringsHit}/${game.rings.length} · Distance ${(game.plane.x * 0.000621).toFixed(1)} mi`,
    'Press R to fly the leg again, or T for the title screen.',
  ], '#ff5a4e');
}

export function drawLanded(ctx, game) {
  overlay(ctx, game, 'LANDED — REFUELLED', [
    `Score ${game.score} · Fuel topped up to 100%.`,
    'Press ENTER to take off again, or T for the title screen.',
  ], '#9be29b');
}

export function drawComplete(ctx, game) {
  overlay(ctx, game, 'LEG COMPLETE!', [
    `${game.mission.name} — all rings ${game.ringsHit}/${game.rings.length}`,
    `Final score ${game.score} · Best ${game.best}`,
    'Press T for the title screen, or 1 / 2 / 3 to fly another leg.',
  ], '#ffd23e');
}
