/**
 * Feedback aptico e sonoro.
 *
 * L'AudioContext viene creato una sola volta e "sbloccato" al primo tocco:
 * i browser mobile bloccano l'audio non originato da un gesto utente, quindi
 * senza questo trucco il beep di fine recupero semplicemente non suona.
 */

let ctx = null;
let unlocked = false;

function audioContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function unlockAudio() {
  if (unlocked) return;
  const context = audioContext();
  if (!context) return;
  unlocked = true;
  if (context.state === 'suspended') context.resume().catch(() => {});
  // Un buffer muto: alcuni browser considerano "attivo" il contesto solo dopo
  // che ha effettivamente riprodotto qualcosa.
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 1, 22050);
  source.connect(context.destination);
  source.start(0);
}

function tone(context, at, duration, frequency, gainPeak = 0.35) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(gainPeak, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/** Tre note ascendenti: riconoscibili anche con la musica in cuffia. */
export function beep({ sound = true, vibration = true } = {}) {
  if (vibration) vibrate([120, 70, 120, 70, 260]);
  if (!sound) return;

  const context = audioContext();
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
    /* alcuni browser lanciano se la pagina non è visibile */
  }
}

export function tapFeedback(enabled = true) {
  if (enabled) vibrate(12);
}

/* -------------------------------------------------------------------------
   Schermo sempre acceso
   ------------------------------------------------------------------------- */
let wakeLock = null;
let wakeWanted = false;

export async function keepScreenAwake(enabled) {
  wakeWanted = enabled;
  if (!('wakeLock' in navigator)) return false;

  if (!enabled) {
    try {
      await wakeLock?.release();
    } catch {
      /* già rilasciato */
    }
    wakeLock = null;
    return false;
  }

  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
    return true;
  } catch {
    return false;
  }
}

/** Il wake lock decade quando l'app va in background: va riacquisito. */
export function reacquireWakeLockOnVisible() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wakeWanted && !wakeLock) {
      keepScreenAwake(true);
    }
  });
}
