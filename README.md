# GymLog — offline-first training journal

> **Status: 1.0.0 / public prototype.** GymLog is functional, but it is
> not a stable release. The current version is the first stage of a partial but
> substantial rebuild; training flows, persistence and interface details will continue
> to change before the first stable release.

GymLog is an installable PWA for planning workouts, logging sets and reviewing
progress without requiring an account or a permanent connection. Training data stays
on the device and can be exported by the user.

The active application has been renamed from its original internal name, **Forgia**, to
GymLog and now uses an English interface. The repository still contains legacy modules
from earlier prototypes; they remain only while the new architecture is being
consolidated and are not all part of the production bundle.

## What works today

- Guides first-time users through experience level and realistic weekly availability
- Builds a starting plan that can be reviewed and adjusted before activation
- Presents the next useful session through a guided **Today** screen
- Logs planned sets with suggested loads based on previous performance
- Provides a searchable exercise library with filters, favourites and movement guidance
- Runs configurable rest timers
- Tracks workout history, weekly volume, muscle distribution and personal records
- Includes body-weight tracking and practical fitness calculators
- Stores data locally in IndexedDB
- Exports training data as JSON
- Installs as a standalone PWA and works offline after the production build is cached

## What is being rebuilt

The goal is not to discard the working core. Offline storage, fast set logging, rest
timers, history and progress tracking remain central. The first redesign pass has
already replaced the original home screen, onboarding and desktop navigation. The
remaining work focuses on making the full path from setup to repeated training feel
coherent, especially for someone who does not already know how to structure gym
training.

Planned work includes:

- Refining plan creation, exercise replacement and later plan changes
- Making the relationship between Today, the active plan and completed sessions clearer
- Improving training explanations without overwhelming beginners or slowing experts
- Completing the mobile and desktop visual pass across secondary screens and sheets
- Consolidating naming, English copy, metadata and remaining legacy modules
- Finalizing persistence, migrations and recovery before declaring the data model stable
- Adding current screenshots, deployment details and release notes once the UI settles

Until this work is complete, routes, layout, wording and locally stored data structures
may change between revisions.

## Intended audience

GymLog is being designed for both:

- people recording an established routine who want a quick training journal;
- beginners who need plain-language guidance before a workout appears on their home
  screen.

It is a general training tool, not a medical product or a replacement for qualified
coaching when pain, injury, health conditions or movement limitations are involved.

## Technical outline

The current rebuild uses:

- semantic HTML, Tailwind CSS and a small layer of shared component styles;
- JavaScript ES modules with a small client-side router;
- Vite and PostCSS for development and production builds;
- IndexedDB for workouts, routines, records and preferences;
- a service worker and web app manifest for offline installation;
- browser APIs for audio, vibration and screen wake lock where available;
- Node's built-in test runner for the logic layer.

The interface is assembled from DOM nodes rather than injecting user-provided content
through `innerHTML`.

## Run locally

Node.js and npm are required.

```bash
npm install
npm run dev        # development server
npm test           # logic tests
npm run build      # production bundle
npm run preview    # preview the production build and service worker
```

The service worker is deliberately disabled during development so cached production
files cannot interfere while the interface is being edited.

## Data and privacy

GymLog currently has no account system and no application server. Workout data is
stored in the browser on the current device. Clearing site data or changing browser
profiles can remove it, so important records should be exported before testing
development builds.

No cloud synchronization or cross-device backup should be assumed at this stage.

## Before the first stable release

- [x] Offline-capable workout logging
- [x] Routines, history, rest timing and progress metrics
- [x] Local export and import
- [x] Introduce the GymLog name and English production interface
- [x] Add guided setup and reviewable starting plans
- [x] Add the first responsive desktop and mobile redesign pass
- [ ] Refine plan editing, exercise replacement and repeat-use flows
- [ ] Consolidate the active architecture and remove obsolete modules
- [ ] Verify storage migrations and recovery paths
- [ ] Publish an up-to-date demo, screenshots and release notes

Expect frequent changes while these items remain open.
