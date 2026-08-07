/**
 * Exercise library.
 *
 * Compact format: [id, name, muscle, equipment, rest seconds].
 * The default rest is per exercise rather than global: a heavy squat and a
 * curl do not need the same recovery, and making the user adjust it every
 * time would be pointless friction.
 */

const RAW = [
  // Chest -----------------------------------------------------------------
  ['panca-piana', 'Bench press', 'Chest', 'Barbell', 150],
  ['panca-inclinata-bil', 'Incline barbell press', 'Chest', 'Barbell', 150],
  ['panca-declinata-bil', 'Decline barbell press', 'Chest', 'Barbell', 150],
  ['panca-piana-man', 'Dumbbell bench press', 'Chest', 'Dumbbells', 120],
  ['panca-inclinata-man', 'Incline dumbbell press', 'Chest', 'Dumbbells', 120],
  ['croci-piana', 'Dumbbell fly', 'Chest', 'Dumbbells', 90],
  ['croci-inclinata', 'Incline dumbbell fly', 'Chest', 'Dumbbells', 90],
  ['chest-press', 'Chest press', 'Chest', 'Machine', 90],
  ['pectoral-machine', 'Pectoral machine', 'Chest', 'Machine', 75],
  ['croci-cavi-alte', 'High cable fly', 'Chest', 'Cable', 75],
  ['croci-cavi-basse', 'Low cable fly', 'Chest', 'Cable', 75],
  ['piegamenti', 'Push-up', 'Chest', 'Bodyweight', 75],
  ['dip-petto', 'Chest dip', 'Chest', 'Bodyweight', 120],
  ['pullover', 'Pullover', 'Chest', 'Dumbbells', 90],

  // Back ------------------------------------------------------------------
  ['trazioni', 'Pull-up', 'Back', 'Bodyweight', 150],
  ['trazioni-presa-inversa', 'Chin-up', 'Back', 'Bodyweight', 150],
  ['trazioni-zavorrate', 'Weighted pull-up', 'Back', 'Bodyweight', 180],
  ['lat-machine', 'Lat pulldown', 'Back', 'Machine', 105],
  ['lat-machine-presa-stretta', 'Close-grip lat pulldown', 'Back', 'Machine', 105],
  ['rematore-bil', 'Barbell row', 'Back', 'Barbell', 150],
  ['rematore-pendlay', 'Pendlay row', 'Back', 'Barbell', 150],
  ['rematore-man', 'One-arm dumbbell row', 'Back', 'Dumbbells', 105],
  ['pulley', 'Seated cable row', 'Back', 'Cable', 105],
  ['t-bar-row', 'T-bar row', 'Back', 'Barbell', 120],
  ['rematore-macchina', 'Machine row', 'Back', 'Machine', 105],
  ['pullover-cavi', 'Cable pullover', 'Back', 'Cable', 75],
  ['stacco-terra', 'Deadlift', 'Back', 'Barbell', 210],
  ['stacco-sumo', 'Sumo deadlift', 'Back', 'Barbell', 210],
  ['face-pull', 'Face pull', 'Back', 'Cable', 75],
  ['shrug-bil', 'Barbell shrug', 'Back', 'Barbell', 90],
  ['shrug-man', 'Dumbbell shrug', 'Back', 'Dumbbells', 90],
  ['iperestensioni', 'Back extension', 'Back', 'Bodyweight', 75],

  // Shoulders -------------------------------------------------------------
  ['military-press', 'Standing overhead press', 'Shoulders', 'Barbell', 150],
  ['shoulder-press-man', 'Dumbbell shoulder press', 'Shoulders', 'Dumbbells', 120],
  ['arnold-press', 'Arnold press', 'Shoulders', 'Dumbbells', 105],
  ['shoulder-press-macchina', 'Machine shoulder press', 'Shoulders', 'Machine', 90],
  ['alzate-laterali', 'Lateral raise', 'Shoulders', 'Dumbbells', 60],
  ['alzate-laterali-cavi', 'Cable lateral raise', 'Shoulders', 'Cable', 60],
  ['alzate-frontali', 'Front raise', 'Shoulders', 'Dumbbells', 60],
  ['alzate-posteriori', 'Rear delt raise', 'Shoulders', 'Dumbbells', 60],
  ['reverse-pec-deck', 'Reverse pec deck', 'Shoulders', 'Machine', 60],
  ['tirate-al-mento', 'Upright row', 'Shoulders', 'Barbell', 90],
  ['push-press', 'Push press', 'Shoulders', 'Barbell', 150],

  // Biceps ----------------------------------------------------------------
  ['curl-bil', 'Barbell curl', 'Biceps', 'Barbell', 90],
  ['curl-ez', 'EZ-bar curl', 'Biceps', 'Barbell', 90],
  ['curl-man-alternato', 'Alternating dumbbell curl', 'Biceps', 'Dumbbells', 75],
  ['curl-martello', 'Hammer curl', 'Biceps', 'Dumbbells', 75],
  ['curl-panca-inclinata', 'Incline dumbbell curl', 'Biceps', 'Dumbbells', 75],
  ['curl-scott', 'Preacher curl', 'Biceps', 'Barbell', 75],
  ['curl-cavi', 'Cable curl', 'Biceps', 'Cable', 60],
  ['curl-concentrato', 'Concentration curl', 'Biceps', 'Dumbbells', 60],

  // Triceps ---------------------------------------------------------------
  ['panca-stretta', 'Close-grip bench press', 'Triceps', 'Barbell', 120],
  ['french-press', 'French press', 'Triceps', 'Barbell', 90],
  ['push-down-corda', 'Rope triceps pushdown', 'Triceps', 'Cable', 60],
  ['push-down-barra', 'Bar triceps pushdown', 'Triceps', 'Cable', 60],
  ['estensioni-sopra-testa', 'Overhead triceps extension', 'Triceps', 'Cable', 60],
  ['dip-tricipiti', 'Triceps dip', 'Triceps', 'Bodyweight', 120],
  ['kickback', 'Kickback', 'Triceps', 'Dumbbells', 60],
  ['skull-crusher', 'Skull crusher', 'Triceps', 'Barbell', 90],

  // Quads -----------------------------------------------------------------
  ['squat', 'Barbell squat', 'Quads', 'Barbell', 180],
  ['front-squat', 'Front squat', 'Quads', 'Barbell', 180],
  ['hack-squat', 'Hack squat', 'Quads', 'Machine', 150],
  ['leg-press', 'Leg press', 'Quads', 'Machine', 150],
  ['affondi-man', 'Dumbbell lunge', 'Quads', 'Dumbbells', 120],
  ['affondi-camminata', 'Walking lunge', 'Quads', 'Dumbbells', 120],
  ['bulgarian-split', 'Bulgarian split squat', 'Quads', 'Dumbbells', 120],
  ['leg-extension', 'Leg extension', 'Quads', 'Machine', 75],
  ['goblet-squat', 'Goblet squat', 'Quads', 'Kettlebell', 105],
  ['step-up', 'Step up', 'Quads', 'Dumbbells', 90],
  ['sissy-squat', 'Sissy squat', 'Quads', 'Bodyweight', 75],

  // Hamstrings ------------------------------------------------------------
  ['stacco-rumeno', 'Romanian deadlift', 'Hamstrings', 'Barbell', 150],
  ['stacco-gambe-tese', 'Stiff-leg deadlift', 'Hamstrings', 'Barbell', 150],
  ['leg-curl-sdraiato', 'Lying leg curl', 'Hamstrings', 'Machine', 75],
  ['leg-curl-seduto', 'Seated leg curl', 'Hamstrings', 'Machine', 75],
  ['good-morning', 'Good morning', 'Hamstrings', 'Barbell', 120],
  ['nordic-curl', 'Nordic hamstring curl', 'Hamstrings', 'Bodyweight', 105],

  // Glutes ----------------------------------------------------------------
  ['hip-thrust', 'Hip thrust', 'Glutes', 'Barbell', 150],
  ['glute-bridge', 'Glute bridge', 'Glutes', 'Bodyweight', 90],
  ['abduzioni-macchina', 'Machine hip abduction', 'Glutes', 'Machine', 60],
  ['kickback-cavi', 'Cable glute kickback', 'Glutes', 'Cable', 60],
  ['pull-through', 'Pull through', 'Glutes', 'Cable', 90],

  // Calves ----------------------------------------------------------------
  ['calf-in-piedi', 'Standing calf raise', 'Calves', 'Machine', 60],
  ['calf-seduto', 'Seated calf raise', 'Calves', 'Machine', 60],
  ['calf-leg-press', 'Leg press calf raise', 'Calves', 'Machine', 60],

  // Abs -------------------------------------------------------------------
  ['crunch', 'Crunch', 'Core', 'Bodyweight', 45],
  ['crunch-cavi', 'Cable crunch', 'Core', 'Cable', 60],
  ['plank', 'Plank', 'Core', 'Bodyweight', 60],
  ['plank-laterale', 'Side plank', 'Core', 'Bodyweight', 45],
  ['sollevamento-gambe', 'Hanging leg raise', 'Core', 'Bodyweight', 60],
  ['ab-wheel', 'Ab wheel', 'Core', 'Other', 75],
  ['russian-twist', 'Russian twist', 'Core', 'Other', 45],
  ['hollow-hold', 'Hollow hold', 'Core', 'Bodyweight', 45],

  // Forearms --------------------------------------------------------------
  ['curl-polsi', 'Wrist curl', 'Forearms', 'Barbell', 45],
  ['farmer-walk', "Farmer's walk", 'Forearms', 'Dumbbells', 90],

  // Total body / cardio ----------------------------------------------------
  ['clean-and-press', 'Clean and press', 'Total body', 'Barbell', 180],
  ['kettlebell-swing', 'Kettlebell swing', 'Total body', 'Kettlebell', 90],
  ['thruster', 'Thruster', 'Total body', 'Barbell', 150],
  ['burpees', 'Burpees', 'Total body', 'Bodyweight', 90],
  ['tapis-roulant', 'Treadmill', 'Cardio', 'Machine', 0],
  ['cyclette', 'Exercise bike', 'Cardio', 'Machine', 0],
  ['vogatore', 'Rowing machine', 'Cardio', 'Machine', 0],
  ['ellittica', 'Elliptical', 'Cardio', 'Machine', 0],
  ['corda', 'Jump rope', 'Cardio', 'Other', 60],
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

/** Accent-insensitive, case-insensitive search. */
export function normalize(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
