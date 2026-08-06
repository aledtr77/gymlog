/**
 * Coaching layer: how to actually perform a lift.
 *
 * Deliberately keyed by exercise id and consulted with a fallback, so the
 * library can stay 100+ movements while only the ones people are programmed
 * into carry full notes. Writing thin filler for all of them would be worse
 * than admitting the gap.
 */

const c = (level, how, errors, tips) => ({ level, how, errors, tips });

export const COACHING = {
  squat: c('beginner',
    'Rest the bar across your upper back, set your feet around shoulder width, and turn your toes slightly out. Sit down and back until your thighs are roughly parallel, then drive through the floor to stand.',
    ['Knees collapsing inward', 'Heels lifting from the floor', 'Lower back rounding at the bottom'],
    ['Keep your eyes on a fixed point ahead', 'Brace before you descend and keep that pressure as you stand']),
  'panca-piana': c('beginner',
    'Set your shoulder blades back and down with both feet planted. Lower the bar toward the lower chest with your elbows around 45 degrees from your body, then press up.',
    ['Flaring the elbows straight out', 'Bouncing the bar off the chest', 'Lifting the hips from the bench'],
    ['Imagine bending the bar outward', 'Keep your wrists stacked above your elbows']),
  'stacco-terra': c('advanced',
    'Place the bar over mid-foot and grip it just outside your knees. Keep your chest tall and spine neutral, then push the floor away.',
    ['Hips rising before the chest', 'Letting the bar drift away from the legs', 'Rounding the back'],
    ['Keep the bar close to your legs', 'Stop the set before you lose your back position']),
  'stacco-rumeno': c('intermediate',
    'Keep a soft bend in your knees and push your hips back while the bar slides along your thighs. Stop when you feel a strong hamstring stretch without losing a neutral spine.',
    ['Turning it into a squat', 'Rounding the lower back'],
    ['This is a hip movement, not a knee movement', 'Only lower as far as your mobility allows']),
  'rematore-bil': c('intermediate',
    'Hinge forward with a neutral spine. Pull the bar toward your lower ribs while drawing your shoulder blades together.',
    ['Using body momentum', 'Pulling too high toward the chest'],
    ['Think about driving your elbows back rather than pulling with your hands']),
  'lat-machine': c('beginner',
    'Take a grip slightly wider than shoulder width. Draw your shoulder blades down first, then pull the bar toward your upper chest.',
    ['Pulling behind the neck', 'Leaning too far backward'],
    ['Start the movement from your shoulder blades, not your arms']),
  trazioni: c('advanced',
    'Start from a controlled dead hang with an overhand grip. Pull until your chin clears the bar, then lower under control.',
    ['Swinging the legs', 'Cutting the lowering phase short'],
    ['Use a resistance band or lat pulldown if a full rep is not available yet']),
  'military-press': c('intermediate',
    'Stand with the bar around collarbone height. Press overhead and bring your head gently through once the bar clears it.',
    ['Overarching the lower back', 'Stopping halfway'],
    ['Squeeze your glutes to keep your pelvis stable']),
  'shoulder-press-man': c('beginner',
    'Sit or stand with the dumbbells around ear height. Press overhead without crashing the dumbbells together.',
    ['Overarching the lower back', 'Letting the elbows drift too far behind the body'],
    ['Start light and keep the movement smooth']),
  'leg-press': c('beginner',
    'Place your feet around shoulder width on the platform. Lower with control until your knees reach a comfortable depth, then press the platform away.',
    ['Locking the knees aggressively', 'Letting the hips roll away from the pad'],
    ['Keep your back supported throughout the movement']),
  plank: c('beginner',
    'Set your forearms on the floor and keep a straight line from head to heels. Hold that position while breathing steadily.',
    ['Hips too high', 'Hips sagging toward the floor'],
    ['Squeeze your glutes and brace your core—the goal is active tension']),
  'curl-martello': c('beginner',
    'Keep your palms facing each other and your elbows close to your sides. Curl with control and lower slowly.',
    ['Swinging the torso', 'Letting the elbows slide forward'],
    ['If your back has to help, the weight is too heavy']),
  'panca-inclinata-man': c('beginner',
    'Set the bench to roughly 30 degrees with the dumbbells near your chest. Press upward and slightly inward.',
    ['Setting the bench too upright and turning it into a shoulder press'],
    ['A low incline is enough to emphasize the upper chest']),
};

const FALLBACK = {
  level: 'beginner',
  how: 'Move with control and avoid using momentum. Reduce the load if you cannot maintain steady form.',
  errors: ['Using more load than you can control'],
  tips: ['One clean set is more useful than three rushed ones'],
};

export const coachingFor = (id) => COACHING[id] || FALLBACK;
export const hasCoaching = (id) => Boolean(COACHING[id]);
