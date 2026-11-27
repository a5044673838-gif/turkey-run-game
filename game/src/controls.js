// Keyboard and pointer input. Held keys give a speed nudge; one-shot presses (jump,
// slide, start or restart, pause) are queued as bit flags and taken once by the loop,
// so a press between two frames is never lost and never counted twice.

export const ACTION_JUMP = 1;
export const ACTION_SLIDE = 2;
export const ACTION_CONFIRM = 4;
export const ACTION_PAUSE = 8;

const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const SLIDE = new Set(['ArrowDown', 'KeyS']);
const SLOW = new Set(['ArrowLeft', 'KeyA']);
const FAST = new Set(['ArrowRight', 'KeyD']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let slow = false;
  let fast = false;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (JUMP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_JUMP | ACTION_CONFIRM;
    } else if (SLIDE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SLIDE;
    } else if (SLOW.has(event.code)) slow = true;
    else if (FAST.has(event.code)) fast = true;
    else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (SLOW.has(event.code)) slow = false;
    else if (FAST.has(event.code)) fast = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    slow = false;
    fast = false;
  });
  // A tap or click jumps (and starts / restarts); a tap low on the screen slides.
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    if (event.clientY - rect.top > rect.height * 0.7) actions |= ACTION_SLIDE;
    else actions |= ACTION_JUMP | ACTION_CONFIRM;
  });

  return {
    /** -1 to slow down a touch, 1 to hurry, 0 for neither or both. */
    nudge() {
      return (fast ? 1 : 0) - (slow ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
