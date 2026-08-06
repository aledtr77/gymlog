/**
 * The training plan the app ships with.
 *
 * The whole point of this file is that a beginner never has to invent a
 * workout. They open the app and today's session is already there.
 *
 * Why this plan and not another: for someone untrained, full-body three
 * times a week beats a body-part split. Each lift gets trained three times
 * as often, which is what drives progress early on, and missing one day
 * costs a third of a week instead of an entire muscle group. Two
 * alternating days (A/B) keep the big lifts frequent without repeating an
 * identical session.
 *
 * Order inside a session is deliberate: the heaviest compound comes first,
 * while you are fresh, and isolation work last, where fatigue costs least.
 *
 * `start` is a genuinely light first load — the point of session one is to
 * learn the movement, not to find a limit. Everything after that comes from
 * what you actually lifted.
 */

const day = (id, name, focus, exercises) => ({ id, name, focus, exercises });

const lift = (exerciseId, name, sets, reps, start, rest, note) => ({
  exerciseId,
  name,
  sets,
  reps,
  start,
  rest,
  note,
});

export const PROGRAM = [
  day('a', 'Allenamento A', 'Spinta e gambe', [
    lift('squat', 'Squat con bilanciere', 3, 8, 20, 150,
      'Scendi finché le cosce sono parallele. Schiena dritta, sguardo avanti.'),
    lift('panca-piana', 'Panca piana', 3, 8, 20, 120,
      'Bilanciere al petto, gomiti a 45°. Non far rimbalzare.'),
    lift('rematore-bil', 'Rematore con bilanciere', 3, 10, 20, 120,
      'Busto inclinato, tira verso l’ombelico stringendo le scapole.'),
    lift('shoulder-press-man', 'Shoulder press manubri', 3, 10, 6, 90,
      'Spingi sopra la testa senza inarcare la schiena.'),
    lift('plank', 'Plank', 3, 30, 0, 60,
      'Tieni la posizione. Le ripetizioni qui sono secondi.'),
  ]),

  day('b', 'Allenamento B', 'Trazione e catena posteriore', [
    lift('stacco-rumeno', 'Stacco rumeno', 3, 8, 20, 150,
      'Spingi il bacino indietro, gambe quasi tese. Senti i femorali.'),
    lift('lat-machine', 'Lat machine', 3, 10, 20, 120,
      'Tira la barra al petto, non dietro la nuca.'),
    lift('panca-inclinata-man', 'Panca inclinata manubri', 3, 10, 8, 120,
      'Panca a 30°. Scendi controllato.'),
    lift('leg-press', 'Leg press', 3, 12, 40, 120,
      'Non bloccare le ginocchia in chiusura.'),
    lift('curl-martello', 'Curl a martello', 3, 12, 6, 60,
      'Palmi affacciati, gomiti fermi lungo i fianchi.'),
  ]),
];

/** Alternates A and B: whichever you did last, today is the other one. */
export function nextDay(lastDayId) {
  if (!lastDayId) return PROGRAM[0];
  return PROGRAM.find((d) => d.id !== lastDayId) || PROGRAM[0];
}

export function dayById(id) {
  return PROGRAM.find((d) => d.id === id) || null;
}
