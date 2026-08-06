/**
 * Everything that is not the workout, behind one row.
 *
 * The brief asks for calendar, goals, body weight, photos and seven
 * calculators. Putting them on the dashboard would bury the one thing that
 * matters, so they live here: reachable in two taps, invisible until asked
 * for.
 */
import { el } from '../ui/el.js';
import { appbar, navRow, sheet, toast, stat } from '../ui/components.js';
import { state, logBody, prefs, setTemplate, activeTemplate } from '../core/state.js';
import { TEMPLATES } from '../data/programs.js';
import { go } from '../core/router.js';
import { volume } from '../core/training.js';
import * as calc from '../utils/calc.js';
import { files, share, clipboard, net } from '../platform/index.js';
import { usage } from '../services/db.js';
import { applyTheme } from '../services/theme.js';
import { kg, compact, parseNum } from '../utils/num.js';
import { dayLabel } from '../utils/date.js';

export function render() {
  const template = activeTemplate();
  const lastWeight = state.body[0];

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Altro', back: () => go('/') }),
      el(
        'main',
        { class: 'screen flex flex-col gap-2' },

        navRow({
          title: 'Programma',
          sub: `${template.name} · ${template.days} giorni a settimana`,
          iconName: 'calendar',
          onClick: openProgram,
        }),
        navRow({
          title: 'Peso corporeo',
          sub: lastWeight ? `${kg(lastWeight.weight)} kg · ${dayLabel(lastWeight.at)}` : 'Mai registrato',
          iconName: 'scale',
          onClick: openBody,
        }),
        navRow({ title: 'Calcolatori', sub: 'BMI, TDEE, 1RM, macro, dischi', iconName: 'calculator', onClick: openCalculators }),
        navRow({ title: 'Storico', sub: `${state.sets.length} serie registrate`, iconName: 'trophy', onClick: openHistory }),
        navRow({ title: 'I tuoi dati', sub: 'Esporta, importa, spazio usato', iconName: 'share', onClick: openData }),
        navRow({ title: 'Impostazioni', sub: 'Tema, suoni, recupero', iconName: 'info', onClick: openSettings }),
      ),
    ),
  };
}

/* --------------------------------------------------------------- program */

function openProgram() {
  const current = activeTemplate();
  sheet({
    title: 'Programma',
    body: el(
      'div',
      { class: 'flex flex-col gap-3' },
      el('p', { class: 'text-sm text-ink-2' }, 'Scegli in base a quanti giorni riesci davvero a venire in palestra.'),
      TEMPLATES.map((t) =>
        el(
          'button',
          {
            type: 'button',
            class: ['card text-left transition', t.id === current.id ? 'border-accent' : ''],
            onClick: () => {
              setTemplate(t.id);
              toast(`Programma: ${t.name}`, { variant: 'ok' });
              go('/');
            },
          },
          el(
            'div',
            { class: 'flex items-center gap-2' },
            el('span', { class: 'font-extrabold text-lg' }, t.name),
            el('span', { class: 'chip' }, `${t.days} giorni`),
            t.id === current.id ? el('span', { class: 'chip chip-on ml-auto' }, 'Attivo') : null,
          ),
          el('p', { class: 'text-sm text-ink-3 mt-1' }, t.blurb),
          el('p', { class: 'text-xs text-ink-3 mt-2' }, `Livello: ${t.level}`),
        ),
      ),
    ),
  });
}

/* ------------------------------------------------------------------ body */

function openBody() {
  const input = el('input', { type: 'number', inputmode: 'decimal', step: '0.1', class: 'field', placeholder: 'Peso in kg' });
  const history = el('div', { class: 'flex flex-col gap-2 mt-5' });

  const paint = () => {
    const rows = state.body.slice(0, 20);
    history.replaceChildren(
      el('h3', { class: 'label mb-1' }, 'Storico'),
      ...(rows.length
        ? rows.map((b) =>
            el(
              'div',
              { class: 'flex justify-between py-2 border-b border-line' },
              el('span', { class: 'text-sm text-ink-2' }, dayLabel(b.at)),
              el('span', { class: 'font-bold num' }, `${kg(b.weight)} kg`),
            ),
          )
        : [el('p', { class: 'text-sm text-ink-3' }, 'Nessuna misurazione.')]),
    );
  };
  paint();

  sheet({
    title: 'Peso corporeo',
    body: el(
      'div',
      null,
      input,
      el(
        'button',
        {
          type: 'button',
          class: 'btn-primary w-full mt-3',
          onClick: async () => {
            const value = parseNum(input.value);
            if (!value || value <= 0) return toast('Inserisci un peso valido', { variant: 'err' });
            await logBody({ weight: value });
            input.value = '';
            paint();
            toast('Registrato', { variant: 'ok' });
          },
        },
        'Registra',
      ),
      history,
    ),
  });
}

/* ----------------------------------------------------------- calculators */

function openCalculators() {
  sheet({
    title: 'Calcolatori',
    body: el(
      'div',
      { class: 'flex flex-col gap-2' },
      [
        ['1RM e percentuali', oneRmCalc],
        ['BMI', bmiCalc],
        ['TDEE e macro', tdeeCalc],
        ['Massa grassa', bodyFatCalc],
        ['Dischi sul bilanciere', platesCalc],
      ].map(([label, open]) => navRow({ title: label, iconName: 'calculator', onClick: open })),
    ),
  });
}

/** Small helper so each calculator is a form plus a live result panel. */
function calcSheet(title, fields, compute) {
  const out = el('div', { class: 'tile mt-4' });
  const inputs = {};

  const run = () => {
    const values = Object.fromEntries(
      Object.entries(inputs).map(([k, node]) => [k, node.type === 'number' ? parseNum(node.value) : node.value]),
    );
    out.replaceChildren(...[compute(values)].flat().filter(Boolean));
  };

  const form = el(
    'div',
    { class: 'flex flex-col gap-3' },
    fields.map((f) => {
      const node =
        f.options
          ? el(
              'select',
              { class: 'field', onChange: run },
              f.options.map((o) => el('option', { value: o.value }, o.label)),
            )
          : el('input', {
              type: 'number',
              inputmode: 'decimal',
              step: f.step || '0.1',
              class: 'field',
              placeholder: f.label,
              value: f.value ?? '',
              onInput: run,
            });
      inputs[f.key] = node;
      return el('label', { class: 'flex flex-col gap-1.5' }, el('span', { class: 'label' }, f.label), node);
    }),
  );

  run();
  sheet({ title, body: el('div', null, form, out) });
}

const line = (label, value, accent = false) =>
  el(
    'div',
    { class: 'flex justify-between py-1.5' },
    el('span', { class: 'text-sm text-ink-2' }, label),
    el('span', { class: ['font-extrabold num', accent && 'text-accent'] }, value),
  );

function oneRmCalc() {
  calcSheet(
    '1RM e percentuali',
    [
      { key: 'weight', label: 'Peso sollevato (kg)', value: 60 },
      { key: 'reps', label: 'Ripetizioni', value: 5, step: '1' },
    ],
    ({ weight, reps }) => {
      const orm = calc.oneRepMax(weight, reps);
      if (!orm) return el('p', { class: 'text-sm text-ink-3' }, 'Inserisci peso e ripetizioni.');
      return [
        line('Massimale stimato', `${kg(orm)} kg`, true),
        el('div', { class: 'h-px bg-line my-2' }),
        ...calc.loadTable(orm).map((r) => line(`${r.pct}% · ~${r.reps} reps`, `${kg(r.weight)} kg`)),
        el('p', { class: 'text-xs text-ink-3 mt-3' }, 'Formula di Epley. È una stima, non un test.'),
      ];
    },
  );
}

function bmiCalc() {
  calcSheet(
    'BMI',
    [
      { key: 'weight', label: 'Peso (kg)', value: 75 },
      { key: 'height', label: 'Altezza (cm)', value: 175 },
    ],
    ({ weight, height }) => {
      const r = calc.bmi(weight, height);
      if (!r) return el('p', { class: 'text-sm text-ink-3' }, 'Inserisci peso e altezza.');
      return [line('BMI', String(r.value), true), line('Fascia', r.band), el('p', { class: 'text-xs text-ink-3 mt-3' }, r.caveat)];
    },
  );
}

function tdeeCalc() {
  calcSheet(
    'TDEE e macro',
    [
      { key: 'weight', label: 'Peso (kg)', value: 75 },
      { key: 'height', label: 'Altezza (cm)', value: 175 },
      { key: 'age', label: 'Età', value: 30, step: '1' },
      { key: 'sex', label: 'Sesso', options: [{ value: 'm', label: 'Uomo' }, { value: 'f', label: 'Donna' }] },
      { key: 'activity', label: 'Attività', options: calc.ACTIVITY.map((a) => ({ value: a.id, label: `${a.label} — ${a.hint}` })) },
      { key: 'goal', label: 'Obiettivo', options: [
        { value: 'mantenimento', label: 'Mantenimento' },
        { value: 'dimagrimento', label: 'Dimagrimento' },
        { value: 'massa', label: 'Massa' },
      ] },
    ],
    ({ weight, height, age, sex, activity, goal }) => {
      const bmr = calc.bmr({ weight, height, age, sex });
      if (!bmr) return el('p', { class: 'text-sm text-ink-3' }, 'Compila i campi.');
      const tdee = calc.tdee(bmr, activity);
      const m = calc.macros(tdee, weight, goal);
      return [
        line('Metabolismo basale', `${bmr} kcal`),
        line('Fabbisogno', `${tdee} kcal`),
        line('Target', `${m.calories} kcal`, true),
        el('div', { class: 'h-px bg-line my-2' }),
        line('Proteine', `${m.protein} g`),
        line('Grassi', `${m.fat} g`),
        line('Carboidrati', `${m.carbs} g`),
        el('p', { class: 'text-xs text-ink-3 mt-3' }, 'Mifflin–St Jeor. Proteine a 1,8 g per kg.'),
      ];
    },
  );
}

function bodyFatCalc() {
  calcSheet(
    'Massa grassa',
    [
      { key: 'sex', label: 'Sesso', options: [{ value: 'm', label: 'Uomo' }, { value: 'f', label: 'Donna' }] },
      { key: 'height', label: 'Altezza (cm)', value: 175 },
      { key: 'neck', label: 'Collo (cm)', value: 38 },
      { key: 'waist', label: 'Vita (cm)', value: 85 },
      { key: 'hip', label: 'Fianchi (cm, solo donne)', value: 95 },
    ],
    (v) => {
      const r = calc.bodyFat(v);
      if (r === null) return el('p', { class: 'text-sm text-ink-3' }, 'Servono almeno altezza, collo e vita.');
      return [line('Massa grassa', `${r}%`, true), el('p', { class: 'text-xs text-ink-3 mt-3' }, 'Metodo US Navy, con metro da sarto.')];
    },
  );
}

function platesCalc() {
  calcSheet(
    'Dischi sul bilanciere',
    [
      { key: 'target', label: 'Peso totale (kg)', value: 100 },
      { key: 'bar', label: 'Bilanciere (kg)', value: 20 },
    ],
    ({ target, bar }) => {
      const r = calc.plates(target, bar ?? 20);
      if (!r.ok) return el('p', { class: 'text-sm text-danger' }, r.error);
      return [
        el('p', { class: 'label mb-2' }, 'Per lato'),
        ...r.plates.map((p) => line(`${kg(p.plate)} kg`, `× ${p.count}`)),
        r.error ? el('p', { class: 'text-sm text-warn mt-2' }, r.error) : null,
        line('Totale reale', `${kg(r.achieved)} kg`, true),
      ];
    },
  );
}

/* --------------------------------------------------------------- history */

function openHistory() {
  const byDay = new Map();
  for (const s of state.sets) {
    const key = new Date(s.at).toDateString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(s);
  }

  sheet({
    title: 'Storico',
    body: byDay.size
      ? el(
          'div',
          { class: 'flex flex-col gap-5' },
          [...byDay.entries()].map(([, sets]) =>
            el(
              'section',
              null,
              el(
                'div',
                { class: 'flex justify-between items-baseline pb-1.5 border-b border-line' },
                el('span', { class: 'font-extrabold capitalize' }, dayLabel(sets[0].at)),
                el('span', { class: 'text-xs font-bold text-accent num' }, `${compact(volume(sets))} kg`),
              ),
              el(
                'div',
                { class: 'mt-1' },
                sets
                  .slice()
                  .reverse()
                  .map((s) =>
                    el(
                      'div',
                      { class: 'flex justify-between py-1.5 text-sm' },
                      el('span', { class: 'truncate flex-1 min-w-0' }, s.name),
                      el('span', { class: 'num text-ink-2 ml-3' }, `${kg(s.weight)} kg × ${s.reps}`),
                    ),
                  ),
              ),
            ),
          ),
        )
      : el('p', { class: 'text-sm text-ink-3' }, 'Nessun allenamento registrato.'),
  });
}

/* ------------------------------------------------------------------ data */

async function openData() {
  const { used, quota } = await usage();

  const payload = () =>
    JSON.stringify(
      { app: 'gymlog', version: 3, at: new Date().toISOString(), sets: state.sets, body: state.body, goals: state.goals },
      null,
      2,
    );

  sheet({
    title: 'I tuoi dati',
    body: el(
      'div',
      { class: 'flex flex-col gap-3' },
      el(
        'div',
        { class: 'tile' },
        el('p', { class: 'text-sm text-ink-2' }, 'Tutto resta sul dispositivo. Nessun account, nessun server.'),
        quota
          ? el('p', { class: 'text-xs text-ink-3 mt-2 num' }, `Spazio usato: ${(used / 1048576).toFixed(1)} MB su ${(quota / 1048576).toFixed(0)} MB`)
          : null,
        el('p', { class: 'text-xs text-ink-3 mt-1' }, `Connessione: ${net.online ? 'online' : 'offline'}`),
      ),
      el(
        'button',
        {
          type: 'button',
          class: 'btn-ghost w-full',
          onClick: async () => {
            const blob = new Blob([payload()], { type: 'application/json' });
            await files.save(`gymlog-${new Date().toISOString().slice(0, 10)}.json`, blob);
            toast('Esportato', { variant: 'ok' });
          },
        },
        'Esporta tutto (JSON)',
      ),
      share.supported
        ? el(
            'button',
            {
              type: 'button',
              class: 'btn-ghost w-full',
              onClick: () => share.send({ title: 'GymLog', text: `Questa settimana: ${compact(volume(state.sets))} kg sollevati.` }),
            },
            'Condividi i progressi',
          )
        : null,
      clipboard.supported
        ? el(
            'button',
            {
              type: 'button',
              class: 'btn-ghost w-full',
              onClick: async () => {
                await clipboard.copy(payload());
                toast('Copiato negli appunti', { variant: 'ok' });
              },
            },
            'Copia negli appunti',
          )
        : null,
    ),
  });
}

/* -------------------------------------------------------------- settings */

function openSettings() {
  const p = prefs.get();

  const toggle = (key, label, hint) => {
    const input = el('input', {
      type: 'checkbox',
      class: 'w-6 h-6 accent-current',
      checked: p[key],
      onChange: (e) => prefs.set({ [key]: e.target.checked }),
    });
    return el(
      'label',
      { class: 'flex items-center gap-3 py-3 border-b border-line' },
      el('span', { class: 'flex-1' }, el('span', { class: 'font-bold block' }, label), el('span', { class: 'text-xs text-ink-3' }, hint)),
      input,
    );
  };

  sheet({
    title: 'Impostazioni',
    body: el(
      'div',
      null,
      el(
        'label',
        { class: 'flex flex-col gap-1.5 mb-4' },
        el('span', { class: 'label' }, 'Tema'),
        el(
          'select',
          {
            class: 'field',
            onChange: (e) => {
              prefs.set({ theme: e.target.value });
              applyTheme(e.target.value);
            },
          },
          [
            { v: 'system', l: 'Come il sistema' },
            { v: 'dark', l: 'Scuro' },
            { v: 'light', l: 'Chiaro' },
          ].map((o) => el('option', { value: o.v, selected: p.theme === o.v }, o.l)),
        ),
      ),
      toggle('sound', 'Suono', 'Beep a fine recupero'),
      toggle('vibration', 'Vibrazione', 'Feedback ai tocchi'),
      toggle('keepAwake', 'Schermo acceso', 'Durante l’allenamento'),
      el(
        'label',
        { class: 'flex flex-col gap-1.5 mt-4' },
        el('span', { class: 'label' }, 'Recupero predefinito'),
        el('input', {
          type: 'number',
          class: 'field',
          value: p.restDefault,
          step: '15',
          onChange: (e) => prefs.set({ restDefault: Number(e.target.value) || 90 }),
        }),
      ),
    ),
  });
}
