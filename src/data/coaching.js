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
  squat: c('base',
    'Bilanciere sui trapezi, piedi a larghezza spalle, punte leggermente in fuori. Scendi spingendo i fianchi indietro finché le cosce sono parallele, poi risali spingendo con i talloni.',
    ['Ginocchia che collassano verso l’interno', 'Talloni che si staccano', 'Schiena che si arrotonda in basso'],
    ['Guarda un punto fisso davanti a te, non in alto', 'Inspira in alto, trattieni durante la salita']),
  'panca-piana': c('base',
    'Scapole strette e bloccate, piedi a terra. Scendi con il bilanciere all’altezza dello sterno, gomiti a circa 45° dal busto, poi spingi.',
    ['Gomiti aperti a 90°', 'Rimbalzo sul petto', 'Sedere sollevato dalla panca'],
    ['Immagina di piegare il bilanciere verso l’esterno', 'Polsi dritti sopra i gomiti']),
  'stacco-terra': c('avanzato',
    'Bilanciere a metà piede, presa fuori dalle ginocchia. Petto alto, schiena neutra, spingi il pavimento via con i piedi.',
    ['Bacino che sale prima del petto', 'Bilanciere lontano dalle tibie', 'Schiena arrotondata'],
    ['Il bilanciere resta a contatto con le gambe', 'Meglio fermarsi che perdere la posizione della schiena']),
  'stacco-rumeno': c('intermedio',
    'Gambe quasi tese, spingi il bacino indietro facendo scorrere il bilanciere lungo le cosce. Scendi finché senti tirare i femorali.',
    ['Piegare le ginocchia come in uno squat', 'Arrotondare la zona lombare'],
    ['È un movimento di anca, non di ginocchio', 'Fermati dove finisce la tua mobilità']),
  'rematore-bil': c('intermedio',
    'Busto inclinato a circa 45°, schiena neutra. Tira il bilanciere verso l’ombelico stringendo le scapole.',
    ['Usare lo slancio del busto', 'Tirare verso il petto invece che verso l’addome'],
    ['Pensa di portare i gomiti indietro, non le mani']),
  'lat-machine': c('base',
    'Presa poco più larga delle spalle. Tira la barra al petto abbassando prima le scapole.',
    ['Tirare dietro la nuca', 'Sbilanciare il busto all’indietro'],
    ['Inizia il movimento dalle scapole, non dalle braccia']),
  trazioni: c('avanzato',
    'Presa prona, parti a braccia distese. Sali finché il mento supera la sbarra, scendi controllato.',
    ['Oscillare con le gambe', 'Non completare la discesa'],
    ['Se non ne fai una: usa l’elastico o la lat machine']),
  'military-press': c('intermedio',
    'In piedi, bilanciere all’altezza delle clavicole. Spingi sopra la testa portando la testa leggermente avanti a fine spinta.',
    ['Inarcare la schiena per compensare', 'Fermarsi a metà'],
    ['Stringi i glutei per stabilizzare il bacino']),
  'shoulder-press-man': c('base',
    'Seduto o in piedi, manubri all’altezza delle orecchie. Spingi sopra la testa senza far toccare i manubri.',
    ['Inarcare la zona lombare', 'Gomiti troppo indietro'],
    ['Parti leggero: la spalla è l’articolazione più delicata']),
  'leg-press': c('base',
    'Piedi a larghezza spalle sulla pedana. Scendi finché le ginocchia sono a circa 90°, poi spingi.',
    ['Bloccare le ginocchia in chiusura', 'Staccare il bacino dallo schienale'],
    ['La schiena resta appoggiata per tutto il movimento']),
  plank: c('base',
    'Avambracci a terra, corpo in linea da testa a talloni. Tieni la posizione.',
    ['Bacino troppo alto', 'Bacino che cede verso il basso'],
    ['Stringi glutei e addome: è tensione, non attesa']),
  'curl-martello': c('base',
    'Palmi affacciati, gomiti fermi lungo i fianchi. Sali controllato, scendi lentamente.',
    ['Dondolare con il busto', 'Gomiti che scivolano in avanti'],
    ['Se devi usare la schiena, il peso è troppo']),
  'panca-inclinata-man': c('base',
    'Panca a circa 30°, manubri all’altezza del petto. Spingi verso l’alto e leggermente verso l’interno.',
    ['Inclinazione troppo alta, diventa una spinta per le spalle'],
    ['30° basta: oltre lavori le spalle, non il petto']),
};

const FALLBACK = {
  level: 'base',
  how: 'Esegui il movimento controllato, senza slanci. Se non riesci a mantenere la tecnica, riduci il carico.',
  errors: ['Carico troppo alto rispetto al controllo'],
  tips: ['Meglio una serie pulita che tre sporche'],
};

export const coachingFor = (id) => COACHING[id] || FALLBACK;
export const hasCoaching = (id) => Boolean(COACHING[id]);
