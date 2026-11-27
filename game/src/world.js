// Gobble Dash simulation: a turkey auto-runs from the farmyard to the woods while
// the farmer chases from behind. The turkey jumps hay, fences and ovens, slides
// under low branches, dodges falling carving knives and collects corn. A stumble
// costs a life and lets the farmer lunge closer; no lives left, or the farmer
// reaching the turkey, ends the run caught. 1000 m ends it escaped.

import {
  FIELD, STEP, PX_PER_METRE, ESCAPE_METRES, TURKEY, LIVES, FARMER,
  OBSTACLE, STAGES, CORN, POOL_SIZE,
} from './config.js';
import { createRandom } from './random.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_STAGE = 8;
export const EVENT_CORN = 16;

export const KIND_HAY = 'hay';
export const KIND_FENCE = 'fence';
export const KIND_OVEN = 'oven';
export const KIND_BRANCH = 'branch';
export const KIND_PUDDLE = 'puddle';
export const KIND_KNIFE = 'knife';
export const KIND_CORN = 'corn';

const SPAWN_X = FIELD.width + 60;

function makePool() {
  const pool = [];
  for (let i = 0; i < POOL_SIZE; i += 1) {
    pool.push({ active: false, kind: '', x: 0, y: 0, width: 0, height: 0, speed: 0, counted: false, timer: 0, vy: 0 });
  }
  return pool;
}

function take(pool) {
  for (let i = 0; i < pool.length; i += 1) {
    if (!pool[i].active) return pool[i];
  }
  return null;
}

export function createWorld(seed = 1) {
  const random = createRandom(seed);
  const state = {
    time: 0,
    score: 0,
    cornPoints: 0,
    dodgePoints: 0,
    distancePx: 0,
    distanceM: 0,
    lives: LIVES,
    stageIndex: 0,
    farmerX: FARMER.startX,
    over: null,
    banner: '',
    bannerTimer: 0,
    turkey: {
      x: TURKEY.x, y: FIELD.groundY - TURKEY.height, vy: 0,
      grounded: true, sliding: false, slideTimer: 0, invulnerable: 0, jumpBuffer: 0,
    },
    items: makePool(),
    spawnTimer: 1.1,
    knifeTimer: 4.5,
    inPuddle: false,
    steps: 0,
  };

  function stage() {
    return STAGES[state.stageIndex];
  }

  function spawnObstacle(kind, x) {
    const item = take(state.items);
    if (!item) return;
    const spec = OBSTACLE[kind];
    item.active = true;
    item.kind = kind;
    item.x = x === undefined ? SPAWN_X : x;
    item.width = spec.width;
    item.height = spec.height;
    item.counted = false;
    item.timer = 0;
    item.vy = 0;
    if (kind === KIND_BRANCH) item.y = FIELD.groundY - OBSTACLE.branch.hangY - spec.height;
    else if (kind === KIND_PUDDLE) item.y = FIELD.groundY - spec.height;
    else item.y = FIELD.groundY - spec.height;
  }

  function spawnKnife() {
    const item = take(state.items);
    if (!item) return;
    item.active = true;
    item.kind = KIND_KNIFE;
    // Aim near the turkey, but leave a fair dodge window on either side.
    item.x = 220 + random() * 760;
    item.y = -OBSTACLE.knife.height;
    item.width = OBSTACLE.knife.width;
    item.height = OBSTACLE.knife.height;
    item.vy = 760 + state.stageIndex * 90;
    item.counted = false;
    item.timer = 0;
  }

  function spawnCornArc(overX) {
    const count = 3 + Math.floor(random() * 3);
    const baseY = FIELD.groundY - 150 - random() * 60;
    for (let i = 0; i < count; i += 1) {
      const item = take(state.items);
      if (!item) return;
      item.active = true;
      item.kind = KIND_CORN;
      item.x = (overX === undefined ? SPAWN_X : overX) + i * 52;
      // A gentle arc: the middle cobs fly highest, rewarding a jump.
      item.y = baseY - Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 70;
      item.width = CORN.size;
      item.height = CORN.size;
      item.counted = false;
      item.timer = 0;
      item.vy = 0;
    }
  }

  function spawnPattern() {
    const roll = random();
    const s = state.stageIndex;
    // Keep ground hazards at least a jump apart: the last one must have
    // scrolled 500 px clear of the spawn point before another appears, or two
    // hazards land closer together than one jump arc can clear.
    const crowded = state.items.some(
      (item) => item.active
        && item.kind !== KIND_CORN && item.kind !== KIND_KNIFE && item.kind !== KIND_PUDDLE
        && item.x > SPAWN_X - 500,
    );
    if (crowded) {
      if (roll < 0.4) spawnCornArc();
      return;
    }
    if (roll < 0.30) {
      spawnObstacle(KIND_HAY);
      if (random() < 0.6) spawnCornArc(SPAWN_X + 130);
    } else if (roll < 0.52) {
      spawnObstacle(KIND_FENCE);
    } else if (roll < 0.64 && s >= 1) {
      spawnObstacle(KIND_BRANCH);
    } else if (roll < 0.76 && s >= 1) {
      spawnObstacle(KIND_OVEN);
      if (random() < 0.5) spawnCornArc(SPAWN_X + 170);
    } else if (roll < 0.86) {
      spawnObstacle(KIND_PUDDLE);
      spawnCornArc(SPAWN_X + 60);
    } else {
      spawnCornArc();
    }
  }

  function hitTurkey() {
    const t = state.turkey;
    if (t.invulnerable > 0 || state.over) return false;
    state.lives -= 1;
    t.invulnerable = 1.6;
    t.vy = -320;
    t.grounded = false;
    state.farmerX += FARMER.lunge;
    if (state.lives <= 0 || state.farmerX + FARMER.catchGap >= t.x) {
      state.over = 'caught';
    }
    return true;
  }

  function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.cornPoints = 0;
    state.dodgePoints = 0;
    state.distancePx = 0;
    state.distanceM = 0;
    state.lives = LIVES;
    state.stageIndex = 0;
    state.farmerX = FARMER.startX;
    state.over = null;
    state.banner = 'Farmyard — run!';
    state.bannerTimer = 2.2;
    state.turkey.x = TURKEY.x;
    state.turkey.y = FIELD.groundY - TURKEY.height;
    state.turkey.vy = 0;
    state.turkey.grounded = true;
    state.turkey.sliding = false;
    state.turkey.slideTimer = 0;
    state.turkey.invulnerable = 0;
    state.turkey.jumpBuffer = 0;
    for (const item of state.items) item.active = false;
    state.spawnTimer = 1.1;
    state.knifeTimer = 4.5;
    state.inPuddle = false;
    state.steps = 0;
  }

  reset();

  return {
    state,
    reset,
    /** Advance the world one fixed step. `input` is {jump, slide, nudge}. */
    step(dt, input, events) {
      let out = 0;
      if (state.over) return out;
      const t = state.turkey;
      const st = stage();
      state.time += dt;
      state.steps += 1;

      // Steering: nudge the turkey's screen position; jump and slide. A jump
      // pressed just before landing is buffered and fires on touchdown, so a
      // jump timed for the landing is never lost.
      t.x = Math.min(560, Math.max(140, t.x + input.nudge * TURKEY.nudge * dt));
      if (input.jump) {
        if (t.grounded) {
          t.vy = TURKEY.jumpVelocity;
          t.grounded = false;
          t.sliding = false;
        } else {
          t.jumpBuffer = 0.25;
        }
      }
      if (input.slide && t.grounded && !t.sliding) {
        t.sliding = true;
        t.slideTimer = 0.55;
      }
      if (t.sliding) {
        t.slideTimer -= dt;
        if (t.slideTimer <= 0) t.sliding = false;
      }
      t.vy += TURKEY.gravity * dt;
      t.y += t.vy * dt;
      if (t.y >= FIELD.groundY - TURKEY.height) {
        t.y = FIELD.groundY - TURKEY.height;
        t.vy = 0;
        t.grounded = true;
        if (t.jumpBuffer > 0) {
          t.jumpBuffer = 0;
          t.vy = TURKEY.jumpVelocity;
          t.grounded = false;
          t.sliding = false;
        }
      } else if (t.jumpBuffer > 0) {
        t.jumpBuffer -= dt;
      }
      if (t.invulnerable > 0) t.invulnerable -= dt;

      // Scroll speed, slowed while wading through a puddle.
      let speed = st.speed;
      if (state.inPuddle) speed *= 0.55;
      state.distancePx += speed * dt;
      state.distanceM = state.distancePx / PX_PER_METRE;
      state.score = Math.floor(state.distanceM) + state.cornPoints + state.dodgePoints;

      // The farmer falls back while the turkey runs clean.
      if (state.farmerX > FARMER.startX) {
        state.farmerX = Math.max(FARMER.startX, state.farmerX - FARMER.recover * dt);
      }
      if (state.farmerX + FARMER.catchGap >= t.x) state.over = 'caught';

      // Spawning.
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnPattern();
        state.spawnTimer = st.spawn * (0.85 + random() * 0.4);
      }
      state.knifeTimer -= dt;
      if (state.knifeTimer <= 0) {
        if (random() < st.knifeChance + 0.55) spawnKnife();
        state.knifeTimer = 1.6 + random() * 1.6;
      }

      // Move everything, resolve hits.
      state.inPuddle = false;
      const box = {
        x: t.x + 6, y: t.y + (t.sliding ? TURKEY.height - TURKEY.slideHeight : 0),
        width: TURKEY.width - 12, height: t.sliding ? TURKEY.slideHeight : TURKEY.height,
      };
      for (const item of state.items) {
        if (!item.active) continue;
        if (item.kind === KIND_KNIFE) {
          if (item.timer > 0) {
            // Stuck in the ground: still a jumpable hazard until it is pulled
            // out, and it scrolls with the ground like everything else.
            item.x -= speed * dt;
            item.timer -= dt;
            if (item.timer <= 0) item.active = false;
            else if (overlaps(box, item)) {
              item.active = false;
              if (hitTurkey()) out |= EVENT_HIT;
            }
            continue;
          }
          item.y += item.vy * dt;
          // The knife falls straight down at its warning marker: the player
          // sidesteps it, and the marker never lies about where it lands.
          if (item.y + item.height >= FIELD.groundY) {
            // Stuck in the ground: a small jumpable hazard for a moment.
            item.y = FIELD.groundY - item.height;
            item.timer = 1.1;
          }
          if (overlaps(box, item)) {
            item.active = false;
            if (hitTurkey()) out |= EVENT_HIT;
          }
          continue;
        }
        item.x -= speed * dt;
        if (item.x + item.width < -80) {
          item.active = false;
          continue;
        }
        if (item.kind === KIND_CORN) {
          if (overlaps(box, item)) {
            item.active = false;
            state.cornPoints += CORN.points;
            out |= EVENT_CORN;
          }
          continue;
        }
        if (item.kind === KIND_PUDDLE) {
          if (overlaps(box, item)) state.inPuddle = true;
          continue;
        }
        if (item.kind === KIND_BRANCH && t.sliding) continue;
        if (overlaps(box, item)) {
          item.active = false;
          if (hitTurkey()) out |= EVENT_HIT;
          continue;
        }
        if (!item.counted && item.x + item.width < t.x) {
          item.counted = true;
          state.dodgePoints += 1;
        }
      }

      // Stage changes.
      if (state.stageIndex + 1 < STAGES.length && state.distanceM >= STAGES[state.stageIndex + 1].from) {
        state.stageIndex += 1;
        state.banner = `${STAGES[state.stageIndex].name} — it gets hotter!`;
        state.bannerTimer = 2.4;
        out |= EVENT_STAGE;
      }
      if (state.bannerTimer > 0) state.bannerTimer -= dt;

      // Win or lose.
      if (state.over) {
        out |= EVENT_OVER;
      } else if (state.distanceM >= ESCAPE_METRES) {
        state.over = 'escaped';
        out |= EVENT_OVER | EVENT_ESCAPED;
      }
      return out;
    },
  };
}

export { STEP };
