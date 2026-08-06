# GymLog — a PWA training log

An installable web app for logging gym sessions. Works fully offline, has no
accounts and no server: data lives in IndexedDB on the device and can be
exported to JSON at any time.

```bash
npm install
npm run dev        # development on http://localhost:5173
npm test           # unit tests for the logic layer
npm run build      # production bundle in dist/
npm run preview    # serves dist/ (needed to exercise the service worker)
```

> The service worker only runs in the production build; it is deliberately
> disabled in `dev`, or it would serve cached files while you are editing them.

## Where the interaction model comes from

The apps that dominate this category (Hevy, Strong) all converged on the same
scheme, for good reasons. GymLog adopts it:

| Choice | Why |
|---|---|
| **One card per exercise, one row per set** | The whole session reads at a glance. A single "pick exercise → enter → save" form forces you to remember what you have already done. |
| **A permanently visible `previous` column** | It is the most useful thing to have while training: knowing you did 82.5 x 8 last time decides today's load. Tapping it copies the values across. |
| **Logging = one tap on the tick** | Load and reps are prefilled from last time. If you repeat the same weight you touch nothing. |
| **Rest starts automatically on the tick** | The timer starts on its own with the rest configured for that exercise, and stays a bottom bar rather than a modal screen: you keep using the app while resting. |
| **Lettered set types (W / D / F)** | Warmup, drop set and failure are one tap on the number apart, and warmups stay out of volume and records. |
| **Records celebrated on the spot** | A personal best is detected when you tick the set, not at the end of the month in a stats screen. |

## Layout

The app is designed for the phone and unchanged there. From 700px the repeated
card lists go to two columns; from 900px the bottom tab bar becomes a side
column and the content widens, so an installed desktop PWA is not a narrow
strip in the middle of an empty screen.

## Structure

```
src/
  core/          pure logic, no DOM — this is the part the tests cover
    metrics.js     1RM, volumes, records, last performance, progress
    workout.js     session model (immutable)
    plates.js      plate maths
    restTimer.js   timer built on absolute timestamps
    db.js          promisified IndexedDB with an in-memory fallback
    store.js       application state + persistence
    feedback.js    audio, vibration, wake lock
    format.js      Italian-localised formatting
  data/          exercise library and starter routines
  ui/            views and components (hyperscript, never innerHTML)
  pwa.js         service worker and install prompt
public/          manifest, service worker, icons
```

Note the app's user interface is in Italian; the code, comments and docs are
in English.

## Non-obvious technical decisions

- **No runtime dependencies.** No framework, no CDN fonts. The bundle is ~26 kB
  gzipped and opens instantly even on gym-basement reception.
- **The rest timer uses absolute timestamps**, not a counter decremented each
  tick. Timers freeze when the phone sleeps; a decrementing counter would be
  minutes wrong.
- **The in-progress session is saved on every change** (debounced) and again
  when the app backgrounds. Closing the app or running out of battery does not
  cost you the workout.
- **The DOM is built from real nodes**, never `innerHTML`: names the user types
  (custom exercises, notes, routines) cannot turn into markup.
- **`overscroll-behavior: none`** stops pull-to-refresh reloading the app
  halfway through a set.
- **Completed rows use an opaque background**, not a translucent one: the red
  swipe-to-delete layer sits underneath.
- **Sheets push a history entry**, so Android's back button closes them instead
  of leaving the app.

## Data

Everything lives in IndexedDB (`gymlog`): workouts, routines, records, custom
exercises, preferences and the in-progress session. `Tools → Your data` exports
and re-imports a complete JSON file. Import merges without duplicating (keyed
on workout id) and recomputes records from scratch.

## Tests

`npm test` covers the pure logic: 1RM estimation, volume counts with warmups
excluded, record detection, rebuilding records from history, the last-performance
index, plate maths (including unmakeable weights and floating-point drift) and
the session's immutable mutations.
