/**
 * Timer di recupero.
 *
 * Basato su timestamp assoluti, non su un contatore decrementato a ogni tick:
 * quando il telefono va in standby o il browser mette la scheda in background
 * i timer vengono rallentati o congelati, e un timer a decremento arriverebbe
 * a fine serie sbagliando anche di minuti.
 */

import { beep } from './feedback.js';

let endsAt = 0;
let totalMs = 0;
let label = '';
let interval = null;
let firedEnd = false;
const listeners = new Set();

export function onRestChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  const snapshot = getRestState();
  listeners.forEach((fn) => fn(snapshot));
}

export function getRestState() {
  if (!endsAt) return { running: false, remainingMs: 0, totalMs: 0, label: '', over: false };
  const remainingMs = endsAt - Date.now();
  return {
    running: true,
    remainingMs: Math.max(0, remainingMs),
    totalMs,
    label,
    over: remainingMs <= 0,
    progress: totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 1,
  };
}

export function startRest(seconds, restLabel = '', { sound = true, vibration = true } = {}) {
  stopTicking();
  const ms = Math.max(1, Math.round(seconds)) * 1000;
  totalMs = ms;
  endsAt = Date.now() + ms;
  label = restLabel;
  firedEnd = false;

  interval = setInterval(() => {
    const remaining = endsAt - Date.now();

    if (remaining <= 0 && !firedEnd) {
      firedEnd = true;
      beep({ sound, vibration });
      notify();
      // La barra resta visibile qualche secondo dopo lo zero: chi si allena
      // spesso alza gli occhi in ritardo e deve poter vedere che è ora.
      setTimeout(() => {
        if (firedEnd) stopRest();
      }, 8000);
      return;
    }
    notify();
  }, 250);

  notify();
}

export function addRestTime(seconds) {
  if (!endsAt) return;
  const now = Date.now();
  const remaining = Math.max(0, endsAt - now);
  const next = remaining + seconds * 1000;

  if (next <= 0) {
    stopRest();
    return;
  }

  endsAt = now + next;
  totalMs = Math.max(totalMs, next);
  firedEnd = false;
  notify();
}

export function stopRest() {
  stopTicking();
  endsAt = 0;
  totalMs = 0;
  label = '';
  firedEnd = false;
  notify();
}

function stopTicking() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
