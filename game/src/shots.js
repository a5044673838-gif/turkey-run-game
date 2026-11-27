// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a short game really looks like and the same seed
// always gives the same frame. The play pilot jumps and slides in time; the end
// pilot is a panicked turkey that never jumps, so it is caught, as a hurried
// player is.

import { FIELD, STEP, TURKEY } from './config.js';
import { EVENT_OVER, KIND_KNIFE, KIND_BRANCH, KIND_CORN, KIND_PUDDLE } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 120;
const SAMPLE = 1 / 30;

/** The nearest ground hazard ahead of the turkey that is not corn or a puddle.
 * A falling knife is not one: jumping does not dodge it, sidestepping does, and
 * jumping for it leaves the turkey airborne when the next real hazard arrives.
 * A knife already stuck in the ground is a jumpable hazard like any other. */
function nextHazard(state, ahead) {
  let best = null;
  for (const item of state.items) {
    if (!item.active || item.kind === KIND_CORN || item.kind === KIND_PUDDLE) continue;
    if (item.kind === KIND_KNIFE && item.timer <= 0) continue;
    const gap = item.x - state.turkey.x;
    if (gap < -20 || gap > ahead) continue;
    if (best === null || item.x < best.x) best = item;
  }
  return best;
}

/** The falling knife whose landing zone the turkey is standing in, if any.
 * Checked from the moment the knife starts falling, so the pilot has the whole
 * fall — about a second — to sidestep, not just the last instant. */
function knifeThreat(state) {
  const t = state.turkey;
  for (const item of state.items) {
    if (!item.active || item.kind !== KIND_KNIFE || item.timer > 0) continue;
    const overlap = item.x < t.x + TURKEY.width + 30 && item.x + item.width > t.x - 30;
    if (overlap) return item;
  }
  return null;
}

/** Careful pilot: jump the ground hazards, slide under branches, sidestep knives. */
function autopilot(state) {
  const t = state.turkey;
  const input = { jump: false, slide: false, nudge: 0 };
  const knife = knifeThreat(state);
  if (knife) {
    const knifeCentre = knife.x + knife.width / 2;
    const turkeyCentre = t.x + TURKEY.width / 2;
    input.nudge = knifeCentre > turkeyCentre ? -1 : 1;
  }
  const hazard = nextHazard(state, 420);
  if (!hazard) return input;
  const gap = hazard.x - t.x;
  const speed = 330 + state.stageIndex * 60;
  if (hazard.kind === KIND_BRANCH) {
    if (gap < 150 && t.grounded) input.slide = true;
    return input;
  }
  // Jump about 0.30 s before the hazard arrives: the jump's arc holds the
  // turkey above the hazard for exactly the overlap window. Jumping earlier
  // lands the turkey back down on the hazard's tail; the world buffers a jump
  // pressed mid-air, so asking while airborne still fires on landing.
  if (gap < speed * 0.30) input.jump = true;
  return input;
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { jump: false, slide: false, nudge: 0 });
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const careful = name === 'play';
  for (let index = 0; index < limit / STEP; index += 1) {
    const input = careful ? autopilot(world.state) : { jump: false, slide: false, nudge: 0 };
    if (world.step(STEP, input) & EVENT_OVER) break;
  }
  const over = world.state.over !== null;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}

export { SAMPLE, autopilot };
