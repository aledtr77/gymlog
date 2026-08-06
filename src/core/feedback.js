/**
 * Sound and vibration for the end of a rest.
 *
 * The AudioContext is created once and unlocked on the first touch: mobile
 * browsers block audio that did not come from a user gesture, so without
 * that the beep simply never plays.
 */

let ctx = null;
let unlocked = false;

function audio() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function unlockAudio() {
  if (unlocked) return;
  const context = audio();
  if (!context) return;
  unlocked = true;
  if (context.state === 'suspended') context.resume().catch(() => {});
  // A silent buffer: some browsers only count the context as running once it
  // has actually played something.
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 1, 22050);
  source.connect(context.destination);
  source.start(0);
}

function tone(context, at, duration, frequency, peak = 0.35) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/** Three rising notes: audible over headphones. */
export function beep() {
  vibrate([120, 70, 120, 70, 260]);
  const context = audio();
  if (!context) return;
  if (context.state === 'suspended') context.resume().catch(() => {});
  const now = context.currentTime;
  tone(context, now, 0.14, 660);
  tone(context, now + 0.18, 0.14, 880);
  tone(context, now + 0.36, 0.3, 1175, 0.4);
}

export function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* some browsers throw when the page is not visible */
  }
}

export function tap() {
  vibrate(12);
}
