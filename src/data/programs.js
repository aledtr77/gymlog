/**
 * Templates the app ships with, so nobody ever faces an empty planner.
 *
 * Three levels, because the same person needs different things in month one
 * and year three. Full-body for a novice (each lift trained three times a
 * week, and a missed day costs a third of a week rather than a muscle
 * group); upper/lower once recovery allows more volume; a push/pull/legs
 * split when total weekly volume is the limiting factor.
 *
 * `start` is a genuinely light first load: session one is for learning the
 * movement, not for finding a limit.
 */

const x = (exerciseId, name, sets, reps, start, rest) => ({
  exerciseId, name, sets, reps, start, rest,
});

export const TEMPLATES = [
  {
    id: 'full-body',
    name: 'Full Body',
    level: 'principiante',
    days: 3,
    blurb: '3 giorni a settimana. Tutto il corpo ogni volta.',
    sessions: [
      {
        id: 'fb-a', name: 'Giorno A', focus: 'Spinta e gambe',
        lifts: [
          x('squat', 'Squat con bilanciere', 3, 8, 20, 150),
          x('panca-piana', 'Panca piana', 3, 8, 20, 120),
          x('rematore-bil', 'Rematore con bilanciere', 3, 10, 20, 120),
          x('shoulder-press-man', 'Shoulder press manubri', 3, 10, 6, 90),
          x('plank', 'Plank', 3, 30, 0, 60),
        ],
      },
      {
        id: 'fb-b', name: 'Giorno B', focus: 'Trazione e catena posteriore',
        lifts: [
          x('stacco-rumeno', 'Stacco rumeno', 3, 8, 20, 150),
          x('lat-machine', 'Lat machine', 3, 10, 20, 120),
          x('panca-inclinata-man', 'Panca inclinata manubri', 3, 10, 8, 120),
          x('leg-press', 'Leg press', 3, 12, 40, 120),
          x('curl-martello', 'Curl a martello', 3, 12, 6, 60),
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    level: 'intermedio',
    days: 4,
    blurb: '4 giorni. Parte alta e parte bassa alternate.',
    sessions: [
      {
        id: 'ul-u1', name: 'Upper A', focus: 'Spinta orizzontale',
        lifts: [
          x('panca-piana', 'Panca piana', 4, 6, 40, 180),
          x('rematore-bil', 'Rematore con bilanciere', 4, 8, 40, 150),
          x('military-press', 'Military press', 3, 8, 20, 150),
          x('lat-machine', 'Lat machine', 3, 10, 30, 120),
          x('curl-bil', 'Curl con bilanciere', 3, 10, 15, 75),
        ],
      },
      {
        id: 'ul-l1', name: 'Lower A', focus: 'Quadricipiti',
        lifts: [
          x('squat', 'Squat con bilanciere', 4, 6, 50, 210),
          x('stacco-rumeno', 'Stacco rumeno', 3, 8, 40, 150),
          x('leg-press', 'Leg press', 3, 10, 80, 150),
          x('leg-curl-sdraiato', 'Leg curl sdraiato', 3, 12, 20, 90),
          x('calf-in-piedi', 'Calf in piedi', 4, 15, 30, 60),
        ],
      },
      {
        id: 'ul-u2', name: 'Upper B', focus: 'Spinta verticale',
        lifts: [
          x('military-press', 'Military press', 4, 6, 25, 180),
          x('trazioni', 'Trazioni alla sbarra', 4, 6, 0, 180),
          x('panca-inclinata-man', 'Panca inclinata manubri', 3, 10, 14, 120),
          x('pulley', 'Pulley basso', 3, 10, 35, 120),
          x('push-down-corda', 'Push down ai cavi', 3, 12, 20, 75),
        ],
      },
      {
        id: 'ul-l2', name: 'Lower B', focus: 'Catena posteriore',
        lifts: [
          x('stacco-terra', 'Stacco da terra', 3, 5, 60, 240),
          x('front-squat', 'Front squat', 3, 8, 30, 180),
          x('hip-thrust', 'Hip thrust', 3, 10, 40, 120),
          x('leg-extension', 'Leg extension', 3, 12, 25, 90),
          x('crunch', 'Crunch', 3, 15, 0, 60),
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    level: 'avanzato',
    days: 6,
    blurb: '6 giorni. Volume alto, split classico.',
    sessions: [
      {
        id: 'ppl-push', name: 'Push', focus: 'Petto, spalle, tricipiti',
        lifts: [
          x('panca-piana', 'Panca piana', 4, 6, 60, 180),
          x('military-press', 'Military press', 4, 8, 30, 150),
          x('panca-inclinata-man', 'Panca inclinata manubri', 3, 10, 20, 120),
          x('alzate-laterali', 'Alzate laterali', 4, 15, 6, 60),
          x('push-down-corda', 'Push down ai cavi', 3, 12, 25, 75),
        ],
      },
      {
        id: 'ppl-pull', name: 'Pull', focus: 'Dorso e bicipiti',
        lifts: [
          x('stacco-terra', 'Stacco da terra', 3, 5, 80, 240),
          x('trazioni', 'Trazioni alla sbarra', 4, 8, 0, 150),
          x('rematore-bil', 'Rematore con bilanciere', 4, 8, 50, 150),
          x('face-pull', 'Face pull', 3, 15, 15, 60),
          x('curl-bil', 'Curl con bilanciere', 3, 10, 20, 75),
        ],
      },
      {
        id: 'ppl-legs', name: 'Legs', focus: 'Gambe complete',
        lifts: [
          x('squat', 'Squat con bilanciere', 4, 6, 70, 210),
          x('stacco-rumeno', 'Stacco rumeno', 3, 8, 50, 150),
          x('leg-press', 'Leg press', 3, 12, 100, 150),
          x('leg-curl-sdraiato', 'Leg curl sdraiato', 3, 12, 25, 90),
          x('calf-in-piedi', 'Calf in piedi', 4, 15, 40, 60),
        ],
      },
    ],
  },
];

export const templateById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

export const sessionById = (templateId, sessionId) =>
  templateById(templateId).sessions.find((s) => s.id === sessionId) || null;

/** Rotates through a template's sessions from whatever you did last. */
export function nextSession(template, lastSessionId) {
  const list = template.sessions;
  if (!lastSessionId) return list[0];
  const i = list.findIndex((s) => s.id === lastSessionId);
  return list[(i + 1) % list.length] || list[0];
}
