# GymLog — offline-first training journal

> **Status: 1.0.0 public prototype.** GymLog is a functional, installable PWA and
> can be used as a personal training journal. It is not presented as a production
> fitness service, a native Android application or a cloud-backed commercial product.

GymLog plans simple workouts, records completed sets and derives useful progress
metrics without requiring an account or a permanent connection. The application is
deliberately local-first: its normal operation happens entirely in the browser.

## Why this project exists

GymLog has two practical purposes:

- provide a self-contained PWA that can accompany larger website templates as an
  optional demonstration application;
- serve as a distinct, complete GitHub project rather than another variation of a
  presentation template.

It is also useful on its own for occasional or personal training. The current scope is
intentionally that of a polished prototype: enough real behaviour to demonstrate the
architecture and product idea without pretending that a PWA with device-local data is
already a distributable consumer platform.

Cloud accounts, multi-device synchronization and a hosted user database are therefore
not part of version 1.0.0. That investment would make sense if GymLog evolves into a
native Android product with an explicit account and recovery model.

## Current functionality

- Guided setup based on experience and realistic weekly availability
- Reviewable full-body, upper/lower and push/pull/legs starting plans
- A focused **Today** screen with suggested loads and repetitions
- Fast set logging with configurable rest timers
- Searchable exercise library, favourites and movement guidance
- Workout history, weekly volume, muscle distribution and personal records
- Body-weight tracking and practical fitness calculators
- Responsive mobile and desktop interface
- Installable app shell with offline support
- Local, versioned persistence and portable JSON backup/restore

## Persistence, migrations and recovery

GymLog treats user data as more important than the cached application shell.

### Persistence

- Growing training data is stored in IndexedDB.
- Small synchronous preferences are stored in a separately versioned LocalStorage
  document.
- State changes become visible only after the corresponding IndexedDB transaction has
  committed.
- Multi-store restore operations are atomic and roll back if any write fails.
- The application asks the browser for persistent storage when the API is available.
- If IndexedDB cannot be opened, GymLog switches to a volatile in-memory mode and
  displays an explicit warning that new data will disappear when the page closes.

### Migrations

The active IndexedDB schema is version 4. Upgrade steps preserve the legacy stores as a
safety net while converting useful records:

- v1 nested completed workouts are flattened into the current set log;
- v2 flat entries and pinned exercises become sets and favourites;
- v3 records are retained unchanged while the database advances to v4.

Preferences and backup files have their own versions, independent from the IndexedDB
version. Migration behaviour is covered with real IndexedDB-compatible automated tests
through `fake-indexeddb`.

### Backup and restore

The **Data and privacy** settings allow the user to:

- export all user-owned stores and preferences as versioned JSON;
- copy the same backup to the clipboard;
- merge another GymLog backup with local records;
- replace local data from a backup.

Imports are validated before writing. A safety backup must be saved before either
import mode proceeds. Existing legacy GymLog JSON exports remain importable. Binary
photo values are encoded into the portable backup format when present. The transient
sync outbox is intentionally excluded because it is transport state, not user data.

## Important limitations

- There is no account system, application API or server-side user database.
- There is no automatic cloud or cross-device backup.
- Clearing browser site data can remove the local database.
- Browser storage belongs to an origin. The `workers.dev` address and a future custom
  domain would have separate IndexedDB databases.
- Installing the PWA does not turn it into a native Android application or provide
  Play Store distribution and platform-level account recovery.
- Training suggestions are general guidance, not medical advice or a replacement for
  qualified coaching.

For important personal records, export a backup periodically.

## Architecture

The project intentionally has no runtime framework dependency. It uses:

- semantic HTML and DOM nodes instead of injecting user content through `innerHTML`;
- JavaScript ES modules and a small hash-based router;
- Tailwind CSS plus shared component styles;
- Vite and PostCSS for development and production builds;
- IndexedDB repositories behind a small persistence API;
- a service worker and web app manifest for installation and offline startup;
- browser APIs for audio, vibration, wake lock, file access and clipboard support;
- Node's built-in test runner for domain, migration and recovery tests;
- Cloudflare Workers Static Assets for the public deployment.

The persistence boundary is isolated under `src/services/`, so a future backend can be
added without coupling feature screens directly to a storage vendor.

## Run locally

Node.js and npm are required.

```bash
npm install
npm run dev       # development server
npm test          # complete automated test suite
npm run build     # production bundle in dist/
npm run preview   # preview the production build
```

The service worker is disabled during development so an old production cache cannot
interfere with active UI work.

## Cloudflare deployment

The public prototype is deployed as static assets, without a backend Worker script or
Cloudflare database:

**https://gymlog.aledtr-77.workers.dev**

`wrangler.jsonc` points Cloudflare at the Vite `dist/` directory. After authenticating
Wrangler, a release can be built and deployed with:

```bash
npm run deploy
```

Static hosting does not change the persistence model: workout data remains in the
visitor's browser and is never uploaded to Cloudflare.

## Project boundary after 1.0.0

This repository can continue receiving focused fixes, compatibility updates and small
interface improvements. It does not need a speculative backend merely to make the
prototype look more substantial.

A separate product phase would be justified by a native Android release. That phase
would need to define authentication, encrypted transport, cloud backup, device
reconciliation, conflict handling, account deletion, privacy obligations and operating
costs before cloud synchronization is enabled.
