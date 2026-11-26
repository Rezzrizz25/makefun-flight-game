// plane.js — the mail plane itself: arcade flight physics and the hand-drawn
// aircraft sprite (fuselage, wings, tail, spinning prop, lit cockpit glass).

export function makePlane() {
  return {
    x: 0,            // world position, metres along the leg
    alt: 18,         // altitude above sea level, metres
    vy: 0,           // vertical speed, m/s
    speed: 0,        // forward speed, knots
    throttle: 0,     // 0..100
    pitch: 0,        // degrees, + is nose up
    gear: true,      // landing gear down
    fuel: 100,
    damage: 0,       // 0..100; 100 is a wreck
    boost: 0,        // seconds of flap boost left
    prop: 0,         // propeller animation angle
    shake: 0,        // screen shake, decays
    airborne: false, // true once she has left the ground; ground contact
                     // only counts after takeoff, so sitting on the runway
                     // at the start of a leg is never scored as a landing
  };
}

const KTS_TO_MS = 0.514444;

// One physics step. Throttle sets a target speed; pitch turns speed into
// climb or descent; too slow and the wing stops flying and she sinks.
export function updatePlane(game, dt) {
  const p = game.plane;
  const input = game.input;

  // Throttle: W / Up raises it, S / Down lowers it, mouse wheel fine-tunes.
  if (input.up) p.throttle = Math.min(100, p.throttle + 34 * dt);
  if (input.down) p.throttle = Math.max(0, p.throttle - 40 * dt);
  p.throttle = Math.min(100, Math.max(0, p.throttle + input.wheel * 22 * dt));
  input.wheel = 0;

  // Pitch: A/D or Left/Right, or steer toward the mouse pointer.
  let pitchTarget = 0;
  if (input.left) pitchTarget = 16;
  if (input.right) pitchTarget = -16;
  if (input.mouseActive) {
    const dy = input.mouseY - game.view.height * 0.45;
    pitchTarget = Math.max(-20, Math.min(20, -dy * 0.09));
  }
  const pitchRate = input.mouseActive ? 3.2 : 2.6;
  p.pitch += (pitchTarget - p.pitch) * Math.min(1, pitchRate * dt);

  // Flap boost: Space gives a short burst, paid for in fuel.
  if (input.boost && p.boost <= 0 && p.fuel > 5) {
    p.boost = 1.4;
    game.audio.boost();
  }
  if (p.boost > 0) {
    p.boost -= dt;
    p.fuel = Math.max(0, p.fuel - 9 * dt);
  }

  // Speed chases the throttle's target; boost adds 25 kt while it lasts.
  const targetSpeed = 42 + p.throttle * 0.95 + (p.boost > 0 ? 25 : 0);
  p.speed += (targetSpeed - p.speed) * Math.min(1, 0.7 * dt);

  // Lift: climbing eats speed, diving gains it; stalling sinks the nose.
  const climb = Math.sin((p.pitch * Math.PI) / 180) * p.speed * KTS_TO_MS;
  const stall = p.speed < 58 ? (58 - p.speed) * 0.55 : 0;
  const sink = p.throttle < 12 ? 6 : 0;
  p.vy = climb - stall - sink;
  // On the ground she rolls; she cannot sink through the runway while the
  // wing has not yet lifted her. Once airborne the stall sink is real.
  if (!p.airborne && p.alt - game.groundHeight(p.x) <= 0.5 && p.vy < 0) p.vy = 0;
  // Fast turns bleed a little speed: throttle discipline matters.
  if (Math.abs(p.pitch) > 12) p.speed = Math.max(40, p.speed - Math.abs(p.pitch) * 0.06 * dt * 10);

  p.alt += p.vy * dt;
  p.x += p.speed * KTS_TO_MS * dt;
  if (p.alt - game.groundHeight(p.x) > 15) p.airborne = true;
  p.prop += dt * (4 + p.throttle * 0.35);
  p.shake = Math.max(0, p.shake - dt * 2.2);

  // Fuel burns with throttle; an empty tank means gliding to somewhere flat.
  if (p.throttle > 0 && p.fuel > 0) {
    p.fuel = Math.max(0, p.fuel - (0.35 + p.throttle * 0.02) * dt);
    if (p.fuel <= 0) {
      p.throttle = 0;
      game.message('FUEL EMPTY — GLIDE HER DOWN!', '#ff5a4e');
    }
  }
  if (p.alt < 0) p.alt = 0;
}

// Draw the aircraft at its screen position, pitched, with a lit cockpit,
// spinning prop blur and a soft shadow on the ground far below.
export function drawPlane(ctx, game) {
  const p = game.plane;
  // On the title screen the plane flies down the left edge, clear of the
  // centred menu text; in flight she sits a third across the screen.
  const cx = (game.state === 'title' ? 0.13 : 0.34) * game.view.width;
  const cy = game.screenY(p.alt);
  const shakeX = p.shake > 0 ? (Math.random() - 0.5) * p.shake * 8 : 0;
  const shakeY = p.shake > 0 ? (Math.random() - 0.5) * p.shake * 8 : 0;

  // Ground shadow: a soft ellipse that grows fainter with height.
  const agl = Math.max(0, p.alt - game.groundHeight(p.x));
  ctx.save();
  ctx.globalAlpha = Math.max(0.05, 0.3 - agl * 0.0012);
  ctx.fillStyle = '#1a2a1a';
  ctx.beginPath();
  ctx.ellipse(cx + 10, game.screenY(game.groundHeight(p.x)) + 4, 34, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(cx + shakeX, cy + shakeY);
  ctx.rotate((-p.pitch * Math.PI) / 180);
  ctx.scale(1.18, 1.18);

  // Tail fin and stabiliser.
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.moveTo(-34, -2);
  ctx.lineTo(-46, -20);
  ctx.lineTo(-36, -20);
  ctx.lineTo(-24, -3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8e2d4';
  ctx.beginPath();
  ctx.moveTo(-38, 2);
  ctx.lineTo(-50, 8);
  ctx.lineTo(-36, 8);
  ctx.lineTo(-26, 3);
  ctx.closePath();
  ctx.fill();

  // Main wing, swept slightly back, with a red tip.
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(10, 26);
  ctx.lineTo(20, 24);
  ctx.lineTo(8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.moveTo(10, 26);
  ctx.lineTo(20, 24);
  ctx.lineTo(24, 18);
  ctx.lineTo(16, 20);
  ctx.closePath();
  ctx.fill();

  // Fuselage: cream body, red cheatline, round nose.
  ctx.fillStyle = '#f6f1e3';
  ctx.beginPath();
  ctx.moveTo(-44, -4);
  ctx.quadraticCurveTo(-20, -12, 18, -8);
  ctx.quadraticCurveTo(44, -5, 46, 2);
  ctx.quadraticCurveTo(44, 8, 18, 9);
  ctx.quadraticCurveTo(-20, 10, -44, 5);
  ctx.quadraticCurveTo(-48, 0, -44, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ctx.fillRect(-40, 2, 82, 3);

  // Cockpit glass, lit warm from inside; mail badge on the door.
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.moveTo(8, -8);
  ctx.quadraticCurveTo(20, -9, 26, -4);
  ctx.lineTo(24, 0);
  ctx.lineTo(8, -1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a6d2f';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.arc(-6, 1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 7px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✉', -6, 3.5);
  ctx.textAlign = 'left';

  // Landing gear, only when down.
  if (p.gear) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-18, 9);
    ctx.lineTo(-18, 16);
    ctx.moveTo(14, 9);
    ctx.lineTo(14, 16);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-18, 18, 4, 0, Math.PI * 2);
    ctx.arc(14, 18, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Propeller: a faint spinning blur disc plus two blades catching the light.
  ctx.save();
  ctx.translate(47, 1);
  ctx.rotate(p.prop);
  ctx.fillStyle = 'rgba(60, 60, 70, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(46, 46, 54, 0.55)';
  ctx.fillRect(-1.5, -27, 3, 54);
  ctx.restore();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.arc(47, 1, 3, 0, Math.PI * 2);
  ctx.fill();

  // Navigation lights: red left, green right, blinking white strobe.
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(-46, -6, 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (Math.floor(game.time * 2) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-30, -14, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
