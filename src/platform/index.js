/**
 * Browser capabilities, each behind a feature test.
 *
 * Every wrapper answers "can I?" and then does the thing or degrades
 * silently. Nothing in features/ ever touches a `navigator.*` directly, so
 * an unsupported API is a missing button rather than a thrown exception.
 */

const can = (test) => {
  try {
    return Boolean(test());
  } catch {
    return false;
  }
};

/* ------------------------------------------------------------- vibration */
export const haptics = {
  supported: can(() => navigator.vibrate),
  tap: () => haptics.supported && navigator.vibrate(12),
  ok: () => haptics.supported && navigator.vibrate([18, 40, 18]),
  alarm: () => haptics.supported && navigator.vibrate([120, 70, 120, 70, 260]),
};

/* ----------------------------------------------------------------- audio */
let ctx = null;
let unlocked = false;

export const audio = {
  /** Mobile blocks audio without a gesture, so the first touch primes it. */
  unlock() {
    if (unlocked) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    ctx = ctx || new Ctor();
    unlocked = true;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start(0);
  },
  beep(times = [660, 880, 1175]) {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    times.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.18;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.34, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.26);
    });
  },
};

/* ------------------------------------------------------------- wake lock */
let lock = null;
let lockWanted = false;

export const screen = {
  supported: can(() => 'wakeLock' in navigator),
  async keepAwake(on) {
    lockWanted = on;
    if (!screen.supported) return false;
    if (!on) {
      try {
        await lock?.release();
      } catch {
        /* already gone */
      }
      lock = null;
      return false;
    }
    try {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => {
        lock = null;
      });
      return true;
    } catch {
      return false;
    }
  },
  /** The lock dies when the tab backgrounds; take it again on return. */
  watch() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && lockWanted && !lock) screen.keepAwake(true);
    });
  },
};

/* --------------------------------------------------------- notifications */
export const notify = {
  supported: can(() => 'Notification' in window),
  get granted() {
    return notify.supported && Notification.permission === 'granted';
  },
  async ask() {
    if (!notify.supported) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  },
  show(title, body) {
    if (!notify.granted || document.visibilityState === 'visible') return;
    try {
      new Notification(title, { body, icon: '/icons/icon-192.png', tag: 'gymlog-rest' });
    } catch {
      /* some engines only allow this from a service worker */
    }
  },
};

/* ----------------------------------------------------------------- share */
export const share = {
  supported: can(() => navigator.share),
  async send(data) {
    if (!share.supported) return false;
    try {
      await navigator.share(data);
      return true;
    } catch {
      return false;
    }
  },
};

export const clipboard = {
  supported: can(() => navigator.clipboard?.writeText),
  async copy(text) {
    if (!clipboard.supported) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },
};

/* --------------------------------------------------------------- network */
export const net = {
  get online() {
    return navigator.onLine !== false;
  },
  /** Used to hold back non-essential work on a metered connection. */
  get saveData() {
    return can(() => navigator.connection?.saveData);
  },
  get effectiveType() {
    return navigator.connection?.effectiveType ?? 'unknown';
  },
  watch(fn) {
    window.addEventListener('online', () => fn(true));
    window.addEventListener('offline', () => fn(false));
  },
};

/* --------------------------------------------------------------- battery */
export const battery = {
  async status() {
    if (!can(() => navigator.getBattery)) return null;
    try {
      const b = await navigator.getBattery();
      return { level: b.level, charging: b.charging };
    } catch {
      return null;
    }
  },
};

/* ------------------------------------------------------------ fullscreen */
export const fullscreen = {
  supported: can(() => document.documentElement.requestFullscreen),
  get active() {
    return Boolean(document.fullscreenElement);
  },
  toggle(el = document.documentElement) {
    if (!fullscreen.supported) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen().catch(() => {});
  },
};

/* ------------------------------------------------------------ the camera */
export const camera = {
  supported: can(() => navigator.mediaDevices?.getUserMedia),
  async stream() {
    if (!camera.supported) return null;
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 } },
      });
    } catch {
      return null;
    }
  },
};

/* ------------------------------------------------- file system, for export */
export const files = {
  supported: can(() => window.showSaveFilePicker),
  /** Uses the picker where available, falls back to a download link. */
  async save(name, blob) {
    if (files.supported) {
      try {
        const fh = await window.showSaveFilePicker({ suggestedName: name });
        const stream = await fh.createWritable();
        await stream.write(blob);
        await stream.close();
        return true;
      } catch {
        return false;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  },
};
