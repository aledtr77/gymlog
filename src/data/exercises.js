/**
 * Exercise library.
 *
 * Compact format: [id, name, muscle, equipment, rest seconds].
 * The default rest is per exercise rather than global: a heavy squat and a
 * curl do not need the same recovery, and making the user adjust it every
 * time would be pointless friction.
 */

export const MUSCLES = [
  'Petto',
  'Dorso',
  'Spalle',
  'Bicipiti',
  'Tricipiti',
  'Quadricipiti',
  'Femorali',
  'Glutei',
  'Polpacci',
  'Addome',
  'Avambracci',
  'Total body',
  'Cardio',
];

export const EQUIPMENT = [
  'Bilanciere',
  'Manubri',
  'Cavi',
  'Macchina',
  'Corpo libero',
  'Kettlebell',
  'Elastico',
  'Altro',
];

const RAW = [
  // Chest -----------------------------------------------------------------
  ['panca-piana', 'Panca piana', 'Petto', 'Bilanciere', 150],
  ['panca-inclinata-bil', 'Panca inclinata bilanciere', 'Petto', 'Bilanciere', 150],
  ['panca-declinata-bil', 'Panca declinata bilanciere', 'Petto', 'Bilanciere', 150],
  ['panca-piana-man', 'Panca piana manubri', 'Petto', 'Manubri', 120],
  ['panca-inclinata-man', 'Panca inclinata manubri', 'Petto', 'Manubri', 120],
  ['croci-piana', 'Croci su panca piana', 'Petto', 'Manubri', 90],
  ['croci-inclinata', 'Croci su panca inclinata', 'Petto', 'Manubri', 90],
  ['chest-press', 'Chest press', 'Petto', 'Macchina', 90],
  ['pectoral-machine', 'Pectoral machine', 'Petto', 'Macchina', 75],
  ['croci-cavi-alte', 'Croci ai cavi alte', 'Petto', 'Cavi', 75],
  ['croci-cavi-basse', 'Croci ai cavi basse', 'Petto', 'Cavi', 75],
  ['piegamenti', 'Piegamenti sulle braccia', 'Petto', 'Corpo libero', 75],
  ['dip-petto', 'Dip alle parallele (petto)', 'Petto', 'Corpo libero', 120],
  ['pullover', 'Pullover', 'Petto', 'Manubri', 90],

  // Back ------------------------------------------------------------------
  ['trazioni', 'Trazioni alla sbarra', 'Dorso', 'Corpo libero', 150],
  ['trazioni-presa-inversa', 'Trazioni presa inversa', 'Dorso', 'Corpo libero', 150],
  ['trazioni-zavorrate', 'Trazioni zavorrate', 'Dorso', 'Corpo libero', 180],
  ['lat-machine', 'Lat machine avanti', 'Dorso', 'Macchina', 105],
  ['lat-machine-presa-stretta', 'Lat machine presa stretta', 'Dorso', 'Macchina', 105],
  ['rematore-bil', 'Rematore con bilanciere', 'Dorso', 'Bilanciere', 150],
  ['rematore-pendlay', 'Pendlay row', 'Dorso', 'Bilanciere', 150],
  ['rematore-man', 'Rematore con manubrio', 'Dorso', 'Manubri', 105],
  ['pulley', 'Pulley basso', 'Dorso', 'Cavi', 105],
  ['t-bar-row', 'T-bar row', 'Dorso', 'Bilanciere', 120],
  ['rematore-macchina', 'Rematore a macchina', 'Dorso', 'Macchina', 105],
  ['pullover-cavi', 'Pullover ai cavi', 'Dorso', 'Cavi', 75],
  ['stacco-terra', 'Stacco da terra', 'Dorso', 'Bilanciere', 210],
  ['stacco-sumo', 'Stacco sumo', 'Dorso', 'Bilanciere', 210],
  ['face-pull', 'Face pull', 'Dorso', 'Cavi', 75],
  ['shrug-bil', 'Scrollate con bilanciere', 'Dorso', 'Bilanciere', 90],
  ['shrug-man', 'Scrollate con manubri', 'Dorso', 'Manubri', 90],
  ['iperestensioni', 'Iperestensioni lombari', 'Dorso', 'Corpo libero', 75],

  // Shoulders -------------------------------------------------------------
  ['military-press', 'Lento avanti in piedi', 'Spalle', 'Bilanciere', 150],
  ['shoulder-press-man', 'Shoulder press manubri', 'Spalle', 'Manubri', 120],
  ['arnold-press', 'Arnold press', 'Spalle', 'Manubri', 105],
  ['shoulder-press-macchina', 'Shoulder press a macchina', 'Spalle', 'Macchina', 90],
  ['alzate-laterali', 'Alzate laterali', 'Spalle', 'Manubri', 60],
  ['alzate-laterali-cavi', 'Alzate laterali ai cavi', 'Spalle', 'Cavi', 60],
  ['alzate-frontali', 'Alzate frontali', 'Spalle', 'Manubri', 60],
  ['alzate-posteriori', 'Alzate posteriori', 'Spalle', 'Manubri', 60],
  ['reverse-pec-deck', 'Reverse pec deck', 'Spalle', 'Macchina', 60],
  ['tirate-al-mento', 'Tirate al mento', 'Spalle', 'Bilanciere', 90],
  ['push-press', 'Push press', 'Spalle', 'Bilanciere', 150],

  // Biceps ----------------------------------------------------------------
  ['curl-bil', 'Curl con bilanciere', 'Bicipiti', 'Bilanciere', 90],
  ['curl-ez', 'Curl con bilanciere EZ', 'Bicipiti', 'Bilanciere', 90],
  ['curl-man-alternato', 'Curl alternato con manubri', 'Bicipiti', 'Manubri', 75],
  ['curl-martello', 'Curl a martello', 'Bicipiti', 'Manubri', 75],
  ['curl-panca-inclinata', 'Curl su panca inclinata', 'Bicipiti', 'Manubri', 75],
  ['curl-scott', 'Curl alla panca Scott', 'Bicipiti', 'Bilanciere', 75],
  ['curl-cavi', 'Curl ai cavi', 'Bicipiti', 'Cavi', 60],
  ['curl-concentrato', 'Curl concentrato', 'Bicipiti', 'Manubri', 60],

  // Triceps ---------------------------------------------------------------
  ['panca-stretta', 'Panca presa stretta', 'Tricipiti', 'Bilanciere', 120],
  ['french-press', 'French press', 'Tricipiti', 'Bilanciere', 90],
  ['push-down-corda', 'Push down alla corda', 'Tricipiti', 'Cavi', 60],
  ['push-down-barra', 'Push down alla barra', 'Tricipiti', 'Cavi', 60],
  ['estensioni-sopra-testa', 'Estensioni sopra la testa', 'Tricipiti', 'Cavi', 60],
  ['dip-tricipiti', 'Dip alle parallele (tricipiti)', 'Tricipiti', 'Corpo libero', 120],
  ['kickback', 'Kickback', 'Tricipiti', 'Manubri', 60],
  ['skull-crusher', 'Skull crusher', 'Tricipiti', 'Bilanciere', 90],

  // Quads -----------------------------------------------------------------
  ['squat', 'Squat con bilanciere', 'Quadricipiti', 'Bilanciere', 180],
  ['front-squat', 'Front squat', 'Quadricipiti', 'Bilanciere', 180],
  ['hack-squat', 'Hack squat', 'Quadricipiti', 'Macchina', 150],
  ['leg-press', 'Leg press', 'Quadricipiti', 'Macchina', 150],
  ['affondi-man', 'Affondi con manubri', 'Quadricipiti', 'Manubri', 120],
  ['affondi-camminata', 'Affondi in camminata', 'Quadricipiti', 'Manubri', 120],
  ['bulgarian-split', 'Squat bulgaro', 'Quadricipiti', 'Manubri', 120],
  ['leg-extension', 'Leg extension', 'Quadricipiti', 'Macchina', 75],
  ['goblet-squat', 'Goblet squat', 'Quadricipiti', 'Kettlebell', 105],
  ['step-up', 'Step up', 'Quadricipiti', 'Manubri', 90],
  ['sissy-squat', 'Sissy squat', 'Quadricipiti', 'Corpo libero', 75],

  // Hamstrings ------------------------------------------------------------
  ['stacco-rumeno', 'Stacco rumeno', 'Femorali', 'Bilanciere', 150],
  ['stacco-gambe-tese', 'Stacco a gambe tese', 'Femorali', 'Bilanciere', 150],
  ['leg-curl-sdraiato', 'Leg curl sdraiato', 'Femorali', 'Macchina', 75],
  ['leg-curl-seduto', 'Leg curl seduto', 'Femorali', 'Macchina', 75],
  ['good-morning', 'Good morning', 'Femorali', 'Bilanciere', 120],
  ['nordic-curl', 'Nordic hamstring curl', 'Femorali', 'Corpo libero', 105],

  // Glutes ----------------------------------------------------------------
  ['hip-thrust', 'Hip thrust', 'Glutei', 'Bilanciere', 150],
  ['glute-bridge', 'Ponte per glutei', 'Glutei', 'Corpo libero', 90],
  ['abduzioni-macchina', 'Abduzioni a macchina', 'Glutei', 'Macchina', 60],
  ['kickback-cavi', 'Slanci posteriori ai cavi', 'Glutei', 'Cavi', 60],
  ['pull-through', 'Pull through', 'Glutei', 'Cavi', 90],

  // Calves ----------------------------------------------------------------
  ['calf-in-piedi', 'Calf raise in piedi', 'Polpacci', 'Macchina', 60],
  ['calf-seduto', 'Calf raise seduto', 'Polpacci', 'Macchina', 60],
  ['calf-leg-press', 'Calf alla leg press', 'Polpacci', 'Macchina', 60],

  // Abs -------------------------------------------------------------------
  ['crunch', 'Crunch', 'Addome', 'Corpo libero', 45],
  ['crunch-cavi', 'Crunch ai cavi', 'Addome', 'Cavi', 60],
  ['plank', 'Plank', 'Addome', 'Corpo libero', 60],
  ['plank-laterale', 'Plank laterale', 'Addome', 'Corpo libero', 45],
  ['sollevamento-gambe', 'Sollevamento gambe alla sbarra', 'Addome', 'Corpo libero', 60],
  ['ab-wheel', 'Ab wheel', 'Addome', 'Altro', 75],
  ['russian-twist', 'Russian twist', 'Addome', 'Altro', 45],
  ['hollow-hold', 'Hollow hold', 'Addome', 'Corpo libero', 45],

  // Forearms --------------------------------------------------------------
  ['curl-polsi', 'Curl per polsi', 'Avambracci', 'Bilanciere', 45],
  ['farmer-walk', "Farmer's walk", 'Avambracci', 'Manubri', 90],

  // Total body / cardio ----------------------------------------------------
  ['clean-and-press', 'Clean and press', 'Total body', 'Bilanciere', 180],
  ['kettlebell-swing', 'Kettlebell swing', 'Total body', 'Kettlebell', 90],
  ['thruster', 'Thruster', 'Total body', 'Bilanciere', 150],
  ['burpees', 'Burpees', 'Total body', 'Corpo libero', 90],
  ['tapis-roulant', 'Tapis roulant', 'Cardio', 'Macchina', 0],
  ['cyclette', 'Cyclette', 'Cardio', 'Macchina', 0],
  ['vogatore', 'Vogatore', 'Cardio', 'Macchina', 0],
  ['ellittica', 'Ellittica', 'Cardio', 'Macchina', 0],
  ['corda', 'Salto con la corda', 'Cardio', 'Altro', 60],
];

export const EXERCISES = RAW.map(([id, name, muscle, equipment, restSeconds]) => ({
  id,
  name,
  muscle,
  equipment,
  restSeconds,
  search: normalize(`${name} ${muscle} ${equipment}`),
}));

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function exerciseById(id) {
  return BY_ID.get(id) || null;
}

/** Accent-insensitive, case-insensitive search: "panca" finds "Panca piana". */
export function normalize(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
