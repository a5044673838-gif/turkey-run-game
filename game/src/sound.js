// Tiny synthesised sound effects: no audio files, everything is an oscillator.
// The context is created on the first user gesture; in a headless screenshot run
// there is no gesture, so every call is guarded and silently does nothing.

let context = null;
let muted = false;

function audio() {
  if (muted || typeof window === 'undefined') return null;
  try {
    if (!context) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch (error) {
    muted = true;
    return null;
  }
}

function tone(freq, seconds, type, gain, when = 0, slideTo = 0) {
  const ctx = audio();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  } catch (error) {
    muted = true;
  }
}

/** A short gobble-chirp when the turkey jumps. */
export function playJump() {
  tone(620, 0.12, 'square', 0.05, 0, 940);
}

/** A bright pluck when a corn cob is collected. */
export function playCorn() {
  tone(880, 0.09, 'sine', 0.07, 0, 1320);
}

/** A low thud when the turkey stumbles into something. */
export function playHit() {
  tone(160, 0.22, 'sawtooth', 0.09, 0, 70);
}

/** A rising fanfare when the turkey reaches the woods. */
export function playEscape() {
  [523, 659, 784, 1047].forEach((freq, index) => tone(freq, 0.22, 'triangle', 0.08, index * 0.13));
}

/** A descending sting when the farmer catches the turkey. */
export function playCaught() {
  [392, 330, 262, 196].forEach((freq, index) => tone(freq, 0.24, 'sawtooth', 0.06, index * 0.15));
}

/** A soft whoosh when the stage changes. */
export function playStage() {
  tone(440, 0.3, 'sine', 0.05, 0, 880);
}
