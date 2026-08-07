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
    name: 'Full body',
    level: 'beginner',
    days: 3,
    blurb: 'Three weekly sessions that train the whole body.',
    bestFor: 'People who are new, returning after a break, or want a simple and sustainable routine.',
    schedule: 'Three non-consecutive sessions, such as Monday, Wednesday, and Friday.',
    duration: 'About 40–55 minutes per session.',
    sessions: [
      {
        id: 'fb-a', name: 'Workout 1', focus: 'Legs, chest, back, and shoulders',
        lifts: [
          x('squat', 'Barbell squat', 3, 8, 20, 150),
          x('panca-piana', 'Bench press', 3, 8, 20, 120),
          x('rematore-bil', 'Barbell row', 3, 10, 20, 120),
          x('shoulder-press-man', 'Dumbbell shoulder press', 3, 10, 6, 90),
          x('plank', 'Plank', 3, 30, 0, 60),
        ],
      },
      {
        id: 'fb-b', name: 'Workout 2', focus: 'Back and posterior legs',
        lifts: [
          x('stacco-rumeno', 'Romanian deadlift', 3, 8, 20, 150),
          x('lat-machine', 'Lat pulldown', 3, 10, 20, 120),
          x('panca-inclinata-man', 'Incline dumbbell press', 3, 10, 8, 120),
          x('leg-press', 'Leg press', 3, 12, 40, 120),
          x('curl-martello', 'Hammer curl', 3, 12, 6, 60),
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / lower',
    level: 'intermediate',
    days: 4,
    blurb: 'Four days alternating upper- and lower-body sessions.',
    bestFor: 'People who have trained consistently for a few months and recover well across four sessions.',
    schedule: 'Two upper- and two lower-body sessions, with at least one recovery day.',
    duration: 'About 50–65 minutes per session.',
    sessions: [
      {
        id: 'ul-u1', name: 'Upper body 1', focus: 'Chest, back, shoulders, and arms',
        lifts: [
          x('panca-piana', 'Bench press', 4, 6, 40, 180),
          x('rematore-bil', 'Barbell row', 4, 8, 40, 150),
          x('military-press', 'Military press', 3, 8, 20, 150),
          x('lat-machine', 'Lat pulldown', 3, 10, 30, 120),
          x('curl-bil', 'Barbell curl', 3, 10, 15, 75),
        ],
      },
      {
        id: 'ul-l1', name: 'Lower body 1', focus: 'Legs with a front-thigh emphasis',
        lifts: [
          x('squat', 'Barbell squat', 4, 6, 50, 210),
          x('stacco-rumeno', 'Romanian deadlift', 3, 8, 40, 150),
          x('leg-press', 'Leg press', 3, 10, 80, 150),
          x('leg-curl-sdraiato', 'Lying leg curl', 3, 12, 20, 90),
          x('calf-in-piedi', 'Standing calf raise', 4, 15, 30, 60),
        ],
      },
      {
        id: 'ul-u2', name: 'Upper body 2', focus: 'Shoulders, back, chest, and arms',
        lifts: [
          x('military-press', 'Military press', 4, 6, 25, 180),
          x('trazioni', 'Pull-up', 4, 6, 0, 180),
          x('panca-inclinata-man', 'Incline dumbbell press', 3, 10, 14, 120),
          x('pulley', 'Seated cable row', 3, 10, 35, 120),
          x('push-down-corda', 'Rope triceps pushdown', 3, 12, 20, 75),
        ],
      },
      {
        id: 'ul-l2', name: 'Lower body 2', focus: 'Legs, glutes, and posterior chain',
        lifts: [
          x('stacco-terra', 'Deadlift', 3, 5, 60, 240),
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
    name: 'Push / pull / legs',
    level: 'advanced',
    days: 6,
    blurb: 'Six days using a higher-volume three-way split.',
    bestFor: 'Experienced lifters with stable technique and enough time to train most days.',
    schedule: 'Three sessions repeated twice, supported by adequate sleep and recovery.',
    duration: 'About 55–75 minutes per session.',
    sessions: [
      {
        id: 'ppl-push', name: 'Push', focus: 'Chest, shoulders, and triceps',
        lifts: [
          x('panca-piana', 'Bench press', 4, 6, 60, 180),
          x('military-press', 'Military press', 4, 8, 30, 150),
          x('panca-inclinata-man', 'Incline dumbbell press', 3, 10, 20, 120),
          x('alzate-laterali', 'Lateral raise', 4, 15, 6, 60),
          x('push-down-corda', 'Rope triceps pushdown', 3, 12, 25, 75),
        ],
      },
      {
        id: 'ppl-pull', name: 'Pull', focus: 'Back and biceps',
        lifts: [
          x('stacco-terra', 'Deadlift', 3, 5, 80, 240),
          x('trazioni', 'Pull-up', 4, 8, 0, 150),
          x('rematore-bil', 'Barbell row', 4, 8, 50, 150),
          x('face-pull', 'Face pull', 3, 15, 15, 60),
          x('curl-bil', 'Barbell curl', 3, 10, 20, 75),
        ],
      },
      {
        id: 'ppl-legs', name: 'Legs', focus: 'Quads, hamstrings, glutes, and calves',
        lifts: [
          x('squat', 'Barbell squat', 4, 6, 70, 210),
          x('stacco-rumeno', 'Romanian deadlift', 3, 8, 50, 150),
          x('leg-press', 'Leg press', 3, 12, 100, 150),
          x('leg-curl-sdraiato', 'Lying leg curl', 3, 12, 25, 90),
          x('calf-in-piedi', 'Standing calf raise', 4, 15, 40, 60),
        ],
      },
    ],
  },
];

export const templateById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

/** Rotates through a template's sessions from whatever you did last. */
export function nextSession(template, lastSessionId) {
  const list = template.sessions;
  if (!lastSessionId) return list[0];
  const i = list.findIndex((s) => s.id === lastSessionId);
  return list[(i + 1) % list.length] || list[0];
}
