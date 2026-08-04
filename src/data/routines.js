/**
 * Routine di partenza.
 * Sono solo un punto di partenza: vengono seminate al primo avvio e da lì
 * l'utente le modifica, le duplica o le cancella come qualsiasi altra.
 */

const ex = (exerciseId, name, sets, reps, restSeconds) => ({
  exerciseId,
  name,
  sets,
  reps,
  restSeconds,
});

export const PRESET_ROUTINES = [
  {
    id: 'preset-full-body-a',
    name: 'Full Body A',
    description: 'Tre sedute a settimana, progressione lineare sui fondamentali.',
    createdAt: '2026-01-01T00:00:00.000Z',
    exercises: [
      ex('squat', 'Squat con bilanciere', 4, 6, 180),
      ex('panca-piana', 'Panca piana', 4, 6, 150),
      ex('rematore-bil', 'Rematore con bilanciere', 4, 8, 150),
      ex('shoulder-press-man', 'Shoulder press manubri', 3, 10, 120),
      ex('plank', 'Plank', 3, 45, 60),
    ],
  },
  {
    id: 'preset-full-body-b',
    name: 'Full Body B',
    description: 'Seduta complementare: catena posteriore e trazioni.',
    createdAt: '2026-01-01T00:00:00.000Z',
    exercises: [
      ex('stacco-terra', 'Stacco da terra', 3, 5, 210),
      ex('trazioni', 'Trazioni alla sbarra', 4, 8, 150),
      ex('panca-inclinata-man', 'Panca inclinata manubri', 3, 10, 120),
      ex('leg-press', 'Leg press', 3, 12, 150),
      ex('curl-martello', 'Curl a martello', 3, 12, 75),
    ],
  },
  {
    id: 'preset-push',
    name: 'Push · Spinta',
    description: 'Petto, spalle e tricipiti.',
    createdAt: '2026-01-01T00:00:00.000Z',
    exercises: [
      ex('panca-piana', 'Panca piana', 4, 8, 150),
      ex('shoulder-press-man', 'Shoulder press manubri', 3, 10, 120),
      ex('panca-inclinata-man', 'Panca inclinata manubri', 3, 10, 120),
      ex('alzate-laterali', 'Alzate laterali', 4, 15, 60),
      ex('push-down-corda', 'Push down alla corda', 3, 12, 60),
      ex('french-press', 'French press', 3, 10, 90),
    ],
  },
  {
    id: 'preset-pull',
    name: 'Pull · Trazione',
    description: 'Dorso e bicipiti.',
    createdAt: '2026-01-01T00:00:00.000Z',
    exercises: [
      ex('trazioni', 'Trazioni alla sbarra', 4, 8, 150),
      ex('rematore-bil', 'Rematore con bilanciere', 4, 8, 150),
      ex('pulley', 'Pulley basso', 3, 12, 105),
      ex('face-pull', 'Face pull', 3, 15, 75),
      ex('curl-bil', 'Curl con bilanciere', 3, 10, 90),
      ex('curl-panca-inclinata', 'Curl su panca inclinata', 3, 12, 75),
    ],
  },
  {
    id: 'preset-legs',
    name: 'Legs · Gambe',
    description: 'Quadricipiti, femorali, glutei e polpacci.',
    createdAt: '2026-01-01T00:00:00.000Z',
    exercises: [
      ex('squat', 'Squat con bilanciere', 4, 8, 180),
      ex('stacco-rumeno', 'Stacco rumeno', 3, 10, 150),
      ex('leg-press', 'Leg press', 3, 12, 150),
      ex('leg-curl-sdraiato', 'Leg curl sdraiato', 3, 12, 75),
      ex('hip-thrust', 'Hip thrust', 3, 12, 150),
      ex('calf-in-piedi', 'Calf raise in piedi', 4, 15, 60),
    ],
  },
  {
    id: 'preset-upper',
    name: 'Upper · Parte alta',
    description: 'Tutta la parte superiore in una seduta.',
    createdAt: '2026-01-01T00:00:00.000Z',
    exercises: [
      ex('panca-piana', 'Panca piana', 4, 8, 150),
      ex('rematore-man', 'Rematore con manubrio', 4, 10, 105),
      ex('military-press', 'Lento avanti in piedi', 3, 8, 150),
      ex('lat-machine', 'Lat machine avanti', 3, 12, 105),
      ex('curl-ez', 'Curl con bilanciere EZ', 3, 12, 90),
      ex('push-down-barra', 'Push down alla barra', 3, 12, 60),
    ],
  },
];
