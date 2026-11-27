// Gobble Dash renderer: everything the player sees, drawn with plain canvas paths.
// The playfield is a fixed 1280x720 logical area; the caller scales the context to
// the window. Parallax hills and fence posts scroll with the distance the turkey ran.

import { FIELD, ESCAPE_METRES, TURKEY, STAGES, PALETTE, FONT } from './config.js';
import { KIND_HAY, KIND_FENCE, KIND_OVEN, KIND_BRANCH, KIND_PUDDLE, KIND_KNIFE, KIND_CORN } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Fill an ellipse at (x, y) with the current fillStyle. */
function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Stroke an ellipse at (x, y) with the current strokeStyle. */
function ring(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function drawSky(ctx, stageIndex, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  grad.addColorStop(0, PALETTE.skyTop[stageIndex]);
  grad.addColorStop(1, PALETTE.skyBottom[stageIndex]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Sun.
  ctx.fillStyle = PALETTE.sun;
  ellipse(ctx, 1120, 96, 44, 44);
  ctx.fillStyle = 'rgba(255, 217, 77, 0.25)';
  ellipse(ctx, 1120, 96, 64, 64);
  // Drifting clouds.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (let i = 0; i < 4; i += 1) {
    const cx = ((i * 340 + 120 - time * 12) % 1400 + 1400) % 1400 - 60;
    const cy = 70 + i * 46;
    ellipse(ctx, cx, cy, 56, 18);
    ellipse(ctx, cx + 38, cy + 6, 40, 14);
    ellipse(ctx, cx - 40, cy + 8, 34, 12);
  }
}

function drawHills(ctx, stageIndex, distancePx) {
  // Far hills.
  ctx.fillStyle = PALETTE.hillFar[stageIndex];
  ctx.beginPath();
  ctx.moveTo(0, FIELD.groundY);
  for (let x = 0; x <= FIELD.width; x += 80) {
    const wx = x + distancePx * 0.15;
    ctx.lineTo(x, FIELD.groundY - 90 - Math.sin(wx * 0.006) * 46 - Math.sin(wx * 0.0016) * 30);
  }
  ctx.lineTo(FIELD.width, FIELD.groundY);
  ctx.closePath();
  ctx.fill();
  // Near hills.
  ctx.fillStyle = PALETTE.hillNear[stageIndex];
  ctx.beginPath();
  ctx.moveTo(0, FIELD.groundY);
  for (let x = 0; x <= FIELD.width; x += 80) {
    const wx = x + distancePx * 0.35;
    ctx.lineTo(x, FIELD.groundY - 34 - Math.sin(wx * 0.009 + 2) * 26);
  }
  ctx.lineTo(FIELD.width, FIELD.groundY);
  ctx.closePath();
  ctx.fill();
  // Ground.
  ctx.fillStyle = PALETTE.ground[stageIndex];
  ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
  ctx.fillStyle = PALETTE.grass[stageIndex];
  ctx.fillRect(0, FIELD.groundY, FIELD.width, 10);
  // Grass tufts scrolling past.
  ctx.strokeStyle = PALETTE.grass[stageIndex];
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i += 1) {
    const gx = ((i * 173 - distancePx) % 1400 + 1400) % 1400 - 60;
    ctx.beginPath();
    ctx.moveTo(gx, FIELD.groundY + 8);
    ctx.lineTo(gx - 4, FIELD.groundY - 8);
    ctx.moveTo(gx + 4, FIELD.groundY + 8);
    ctx.lineTo(gx + 8, FIELD.groundY - 6);
    ctx.stroke();
  }
  // Fence posts scrolling past, farmyard flavour.
  ctx.fillStyle = PALETTE.fence;
  for (let i = 0; i < 9; i += 1) {
    const fx = ((i * 220 - distancePx) % 1600 + 1600) % 1600 - 80;
    ctx.fillRect(fx, FIELD.groundY - 52, 10, 52);
    ctx.fillRect(fx - 14, FIELD.groundY - 46, 38, 6);
  }
}

function drawTurkey(ctx, t, time) {
  // Blink while invulnerable after a hit — fade, never vanish, so the turkey
  // is always visible in screenshots.
  if (t.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.35;
  const runPhase = t.grounded && !t.sliding ? Math.sin(time * 16) : 0;
  const cx = t.x + 32;
  const ground = FIELD.groundY;
  ctx.save();
  ctx.translate(cx, t.y + 28);
  if (t.sliding) ctx.scale(1.25, 0.55);
  // Legs.
  ctx.strokeStyle = '#e8a33c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-8, 22);
  ctx.lineTo(-8 + runPhase * 8, 28);
  ctx.moveTo(8, 22);
  ctx.lineTo(8 - runPhase * 8, 28);
  ctx.stroke();
  // Tail fan.
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (i - 2) * 0.42;
    ctx.fillStyle = PALETTE.turkeyTail[i % PALETTE.turkeyTail.length];
    ctx.save();
    ctx.rotate(angle);
    ellipse(ctx, 0, -34, 9, 26);
    ctx.restore();
  }
  // Body.
  ctx.fillStyle = PALETTE.turkeyBody;
  ellipse(ctx, 0, 0, 32, 24);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ellipse(ctx, -6, -8, 18, 10);
  // Head, beak, wattle, eye.
  ctx.fillStyle = PALETTE.turkeyHead;
  ellipse(ctx, 26, -22, 13, 12);
  ctx.fillStyle = PALETTE.turkeyBeak;
  ctx.beginPath();
  ctx.moveTo(36, -24);
  ctx.lineTo(50, -20);
  ctx.lineTo(36, -16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.turkeyWattle;
  ellipse(ctx, 30, -10, 5, 8);
  ctx.fillStyle = '#1b1f2a';
  ellipse(ctx, 29, -25, 2.5, 2.5);
  ctx.restore();
  ctx.globalAlpha = 1;
  void ground;
}

function drawFarmer(ctx, farmerX, time) {
  if (farmerX < -90) return;
  const bob = Math.sin(time * 10) * 4;
  const x = farmerX;
  const y = FIELD.groundY;
  ctx.save();
  // Legs mid-stride.
  ctx.strokeStyle = PALETTE.farmerOveralls;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x + 10, y - 52);
  ctx.lineTo(x + 2 + bob, y);
  ctx.moveTo(x + 26, y - 52);
  ctx.lineTo(x + 34 - bob, y);
  ctx.stroke();
  // Body: overalls and shirt.
  ctx.fillStyle = PALETTE.farmerShirt;
  rr(ctx, x - 6, y - 108, 48, 58, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerOveralls;
  ctx.fillRect(x - 6, y - 66, 48, 16);
  ctx.fillRect(x + 2, y - 52, 14, 14);
  ctx.fillRect(x + 24, y - 52, 14, 14);
  // Reaching arms.
  ctx.strokeStyle = PALETTE.farmerShirt;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x + 36, y - 96);
  ctx.lineTo(x + 62, y - 78 + bob);
  ctx.moveTo(x + 36, y - 84);
  ctx.lineTo(x + 58, y - 62 - bob);
  ctx.stroke();
  // Head, hat, beard.
  ctx.fillStyle = PALETTE.farmerSkin;
  ellipse(ctx, x + 18, y - 122, 16, 16);
  ctx.fillStyle = '#e8e0d0';
  ellipse(ctx, x + 18, y - 106, 12, 7);
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.fillRect(x - 2, y - 142, 40, 8);
  rr(ctx, x + 6, y - 158, 24, 18, 6);
  ctx.fill();
  ctx.fillStyle = '#1b1f2a';
  ellipse(ctx, x + 24, y - 124, 2, 2);
  ctx.restore();
}

function drawObstacle(ctx, item, time) {
  const { x, y, width, height } = item;
  switch (item.kind) {
    case KIND_HAY: {
      ctx.fillStyle = PALETTE.hay;
      ellipse(ctx, x + width / 2, y + height / 2, width / 2, height / 2);
      ctx.strokeStyle = PALETTE.hayBand;
      ctx.lineWidth = 4;
      ring(ctx, x + width / 2, y + height / 2, width / 2 - 8, height / 2 - 8);
      ring(ctx, x + width / 2, y + height / 2, width / 2 - 18, height / 2 - 18);
      break;
    }
    case KIND_FENCE: {
      ctx.fillStyle = PALETTE.fence;
      ctx.fillRect(x, y, 8, height);
      ctx.fillRect(x + width - 8, y, 8, height);
      ctx.fillRect(x - 6, y + 12, width + 12, 8);
      ctx.fillRect(x - 6, y + height / 2, width + 12, 8);
      break;
    }
    case KIND_OVEN: {
      ctx.fillStyle = PALETTE.oven;
      rr(ctx, x, y, width, height, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.ovenHot;
      rr(ctx, x + 16, y + 22, width - 32, height - 44, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 220, 120, 0.85)';
      rr(ctx, x + 26, y + 32, width - 52, 14, 4);
      ctx.fill();
      // Heat shimmer: rising smoke.
      ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
      for (let i = 0; i < 3; i += 1) {
        const sy = y - ((time * 30 + i * 26) % 70);
        ellipse(ctx, x + 30 + i * 36, sy, 8, 6);
      }
      break;
    }
    case KIND_BRANCH: {
      ctx.fillStyle = '#4a3b28';
      ctx.fillRect(x, y, width, 10);
      ctx.fillStyle = PALETTE.branch;
      for (let i = 0; i < 5; i += 1) {
        ellipse(ctx, x + 10 + i * 20, y + 22 + (i % 2) * 10, 16, 12);
      }
      break;
    }
    case KIND_PUDDLE: {
      ctx.fillStyle = PALETTE.puddle;
      ellipse(ctx, x + width / 2, y + height / 2, width / 2, height / 2 + 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ellipse(ctx, x + width / 2 - 18, y + 4, 22, 4);
      break;
    }
    case KIND_KNIFE: {
      if (item.timer > 0) {
        // Stuck in the ground, blade down.
        ctx.fillStyle = PALETTE.knife;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + height);
        ctx.lineTo(x + width / 2, y + 18);
        ctx.lineTo(x + width - 4, y + height);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALETTE.knifeHandle;
        rr(ctx, x + width / 2 - 5, y, 10, 20, 4);
        ctx.fill();
      } else {
        // Falling: red warning marker on the ground below it.
        ctx.fillStyle = 'rgba(255, 90, 74, 0.55)';
        ellipse(ctx, x + width / 2, FIELD.groundY + 6, 34, 7);
        ctx.fillStyle = PALETTE.danger;
        text(ctx, '!', x + width / 2, FIELD.groundY - 18, 26, PALETTE.danger);
        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate(0.5);
        ctx.fillStyle = PALETTE.knife;
        ctx.beginPath();
        ctx.moveTo(-6, -height / 2);
        ctx.lineTo(6, -height / 2);
        ctx.lineTo(0, height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALETTE.knifeHandle;
        rr(ctx, -5, -height / 2 - 14, 10, 16, 4);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case KIND_CORN: {
      ctx.fillStyle = PALETTE.corn;
      ellipse(ctx, x + width / 2, y + height / 2, 9, 12);
      ctx.strokeStyle = '#d9a41e';
      ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + width / 2 + i * 5, y + 4);
        ctx.lineTo(x + width / 2 + i * 5, y + height - 4);
        ctx.stroke();
      }
      ctx.fillStyle = PALETTE.cornHusk;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + height - 4);
      ctx.lineTo(x + 10, y + height + 8);
      ctx.lineTo(x + width - 2, y + height - 4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      break;
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, 16, 14, 600, 56, 12);
  ctx.fill();
  text(ctx, `SCORE ${state.score}`, 34, 42, 24, PALETTE.text, 'left');
  text(ctx, `${Math.floor(state.distanceM)} m / ${ESCAPE_METRES} m`, 268, 42, 20, PALETTE.gold, 'left');
  // Lives as hearts.
  for (let i = 0; i < 3; i += 1) {
    const hx = 500 + i * 34;
    ctx.fillStyle = i < state.lives ? '#ff5a6e' : 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(hx, 50);
    ctx.bezierCurveTo(hx - 12, 36, hx - 22, 48, hx, 60);
    ctx.bezierCurveTo(hx + 22, 48, hx + 12, 36, hx, 50);
    ctx.fill();
  }
  // Stage tag, top right.
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, FIELD.width - 216, 14, 200, 56, 12);
  ctx.fill();
  text(ctx, STAGES[state.stageIndex].name.toUpperCase(), FIELD.width - 116, 42, 22, PALETTE.text);
  // Stage banner.
  if (state.bannerTimer > 0) {
    const alpha = Math.min(1, state.bannerTimer);
    ctx.globalAlpha = alpha;
    text(ctx, state.banner, FIELD.width / 2, 120, 40, PALETTE.gold);
    ctx.globalAlpha = 1;
  }
}

function drawPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10, 14, 22, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, 290, 150, 700, 420, 18);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  rr(ctx, 290, 150, 700, 420, 18);
  ctx.stroke();
  text(ctx, title, FIELD.width / 2, 210, 52, accent);
  lines.forEach((line, index) => {
    text(ctx, line, FIELD.width / 2, 280 + index * 38, 22, PALETTE.text, 'center', index === 0 ? '700' : '400');
  });
}

export function draw(ctx, screen, world, best) {
  const { state } = world;
  drawSky(ctx, state.stageIndex, state.time);
  drawHills(ctx, state.stageIndex, state.distancePx);
  for (const item of state.items) {
    if (item.active) drawObstacle(ctx, item, state.time);
  }
  drawFarmer(ctx, state.farmerX, state.time);
  if (screen !== SCREEN_TITLE) drawTurkey(ctx, state.turkey, state.time);

  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
    drawHud(ctx, state);
    if (screen === SCREEN_PAUSED) {
      drawPanel(ctx, 'PAUSED', ['Take a breath, turkey.', 'Press P or tap to keep running.'], PALETTE.text);
    }
    return;
  }
  if (screen === SCREEN_OVER) {
    drawHud(ctx, state);
    if (state.over === 'escaped') {
      drawPanel(ctx, 'ESCAPED!', [
        `You ran ${Math.floor(state.distanceM)} m and reached the woods.`,
        `Score ${state.score}  •  Best ${Math.max(best, state.score)}`,
        'Thanksgiving is cancelled. Press Space to run again.',
      ], PALETTE.gold);
    } else {
      drawPanel(ctx, 'CAUGHT!', [
        'The farmer finally got his hands on you.',
        `Score ${state.score}  •  Best ${Math.max(best, state.score)}  •  ${Math.floor(state.distanceM)} m`,
        'Press Space or tap to try another escape.',
      ], PALETTE.danger);
    }
    return;
  }
  // Title screen.
  ctx.fillStyle = 'rgba(10, 14, 22, 0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, 'GOBBLE DASH', FIELD.width / 2, 190, 84, PALETTE.gold);
  text(ctx, 'The Great Turkey Escape', FIELD.width / 2, 258, 30, PALETTE.text, 'center', '400');
  text(ctx, 'Thanksgiving is coming. Run 1000 m to the woods before the farmer catches you.', FIELD.width / 2, 320, 22, PALETTE.text, 'center', '400');
  text(ctx, 'SPACE / ↑ / tap — jump      ↓ — slide under branches      ← → — dodge the knives', FIELD.width / 2, 368, 20, PALETTE.muted, 'center', '400');
  text(ctx, 'Jump the hay, fences and ovens. Grab the corn. Mind the falling carving knives.', FIELD.width / 2, 404, 20, PALETTE.muted, 'center', '400');
  ctx.fillStyle = PALETTE.gold;
  rr(ctx, FIELD.width / 2 - 170, 452, 340, 62, 31);
  ctx.fill();
  text(ctx, 'PRESS SPACE TO RUN', FIELD.width / 2, 484, 24, '#3a2e10');
  if (best > 0) text(ctx, `Best score: ${best}`, FIELD.width / 2, 556, 20, PALETTE.text, 'center', '400');
}
