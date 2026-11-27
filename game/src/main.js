// Gobble Dash main loop: a fixed-step simulation, a canvas scaled to the window,
// screens for title, play, pause and game over, and the ?shot= scenes the maker
// uses for screenshots. Sounds are synthesised; the best score lives in localStorage.

import { FIELD, STEP, BEST_KEY } from './config.js';
import { createWorld, EVENT_HIT, EVENT_OVER, EVENT_ESCAPED, EVENT_STAGE, EVENT_CORN } from './world.js';
import { createInput, ACTION_JUMP, ACTION_SLIDE, ACTION_CONFIRM, ACTION_PAUSE } from './controls.js';
import { draw, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { stageShot } from './shots.js';
import { playJump, playCorn, playHit, playEscape, playCaught, playStage } from './sound.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;
const world = createWorld(seed);
const input = createInput(canvas);

let screen = SCREEN_TITLE;
let best = 0;
try {
  best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
} catch (error) {
  best = 0;
}

function saveBest() {
  if (world.state.score <= best) return;
  best = world.state.score;
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch (error) {
    // A private window or a blocked store: the score still shows this run.
  }
}

function resize() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(FIELD.width * scale * ratio);
  canvas.height = Math.round(FIELD.height * scale * ratio);
  canvas.style.width = `${Math.round(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.round(FIELD.height * scale)}px`;
  ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function announce(message) {
  if (status) status.textContent = message;
}

function startRun() {
  world.reset();
  screen = SCREEN_PLAY;
  announce('Running! Jump the hay and fences, slide under the branches, dodge the knives.');
}

function togglePause() {
  if (screen === SCREEN_PLAY) {
    screen = SCREEN_PAUSED;
    announce('Paused.');
  } else if (screen === SCREEN_PAUSED) {
    screen = SCREEN_PLAY;
    announce('Running!');
  }
}

let accumulator = 0;
let last = performance.now();

function frame(now) {
  let actions = input.takeActions();
  if (actions & ACTION_PAUSE) togglePause();
  if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) startRun();
  else if (screen === SCREEN_OVER && (actions & ACTION_CONFIRM)) startRun();

  if (screen === SCREEN_PLAY) {
    accumulator += Math.min(0.1, (now - last) / 1000);
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const stepInput = {
        jump: Boolean(actions & ACTION_JUMP),
        slide: Boolean(actions & ACTION_SLIDE),
        nudge: input.nudge(),
      };
      const events = world.step(STEP, stepInput);
      if (events & EVENT_HIT) playHit();
      if (events & EVENT_CORN) playCorn();
      if (events & EVENT_STAGE) playStage();
      if (events & EVENT_ESCAPED) playEscape();
      if (events & EVENT_OVER) {
        screen = SCREEN_OVER;
        saveBest();
        if (world.state.over === 'escaped') announce(`Escaped! Score ${world.state.score}.`);
        else {
          playCaught();
          announce(`Caught! Score ${world.state.score}. Press Space to run again.`);
        }
      }
      // One-shot presses are spent on the first step of the frame.
      actions = 0;
    }
  }
  last = now;
  draw(ctx, screen, world, best);
  window.requestAnimationFrame(frame);
}

// A screenshot scene (?shot=start|play|end&seed=1) draws once and stops. The scene is
// redrawn for a few frames as well: a headless screenshot can otherwise capture the
// page before the module's first draw has painted.
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot, world);
  let frames = 0;
  const drawShot = () => {
    draw(ctx, staged.screen, world, staged.best);
    frames += 1;
    if (frames < 30) window.requestAnimationFrame(drawShot);
  };
  drawShot();
  window.__shotReady = true;
} else {
  announce('Gobble Dash. Press Space or tap to run from the farmer.');
  window.requestAnimationFrame(frame);
}
