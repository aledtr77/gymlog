/**
 * Rest timer. Starts itself when you log a set and counts down. Nothing to
 * configure: 90 seconds, +30 if you want more, tap to dismiss.
 *
 * Built on an absolute end time rather than a decrementing counter, because
 * browsers throttle timers in backgrounded tabs and a counter would end up
 * minutes wrong.
 */

import { beep } from './feedback.js';

export const DEFAULT_REST = 90;

let endsAt = 0;
let total = 0;
let interval = null;
let fired = false;
const listeners = new Set();

export function onRest(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  const snapshot = restState();
  listeners.forEach((fn) => fn(snapshot));
}

export function restState() {
  if (!endsAt) return { running: false, remaining: 0, total: 0 };
  const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
  return { running: true, remaining, total, over: endsAt - Date.now() <= 0 };
}

export function startRest(seconds = DEFAULT_REST) {
  stopTicking();
  total = seconds;
  endsAt = Date.now() + seconds * 1000;
  fired = false;

  interval = setInterval(() => {
    if (endsAt - Date.now() <= 0 && !fired) {
      fired = true;
      beep();
      notify();
      // Stays on screen a few seconds past zero: people look up late.
      setTimeout(() => {
        if (fired) stopRest();
      }, 6000);
      return;
    }
    notify();
  }, 250);

  notify();
}

export function addRest(seconds) {
  if (!endsAt) return;
  endsAt += seconds * 1000;
  total += seconds;
  fired = false;
  notify();
}

export function stopRest() {
  stopTicking();
  endsAt = 0;
  total = 0;
  fired = false;
  notify();
}

function stopTicking() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
