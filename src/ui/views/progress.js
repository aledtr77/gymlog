/**
 * Progressi.
 * Tre domande, in ordine di importanza: sto alzando di più su un esercizio?
 * sto allenandomi con costanza? sto trascurando qualche gruppo muscolare?
 */

import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { barChart, lineChart } from '../chart.js';
import { findExercise, state } from '../../core/store.js';
import {
  exerciseProgress,
  summarizeWorkout,
  volumeByMuscle,
} from '../../core/metrics.js';
import { compactKg, num, shortDate, startOfWeek } from '../../core/format.js';

export function progressView(ctx) {
  const completed = state.workouts.filter((w) => w.status === 'completed');

  const node = h(
    'div',
    null,
    h(
      'header',
      { class: 'appbar' },
      h('div', { class: 'appbar__inner' }, h('h1', { class: 'appbar__title' }, 'Progressi')),
    ),
    h('main', { class: 'main' }, h('div', { class: 'view' }, ...sections())),
  );

  return { node };

  function sections() {
    if (!completed.length) {
      return [
        h(
          'div',
          { class: 'card' },
          h(
            'div',
            { class: 'empty' },
            h('div', { class: 'empty__icon' }, icon('chart')),
            h('h3', null, 'Ancora nessun dato'),
            h('p', null, 'Dopo il primo allenamento qui compaiono andamento dei carichi, volume settimanale e record.'),
            h(
              'button',
              { type: 'button', class: 'btn btn--primary', onClick: () => ctx.navigate('home') },
              'Inizia ad allenarti',
            ),
          ),
        ),
      ];
    }

    return [overview(), weeklyVolume(), exerciseTrend(), muscleBalance(), records()];
  }

  /* --------------------------------------------------------------- sintesi */

  function overview() {
    const now = Date.now();
    const last30 = completed.filter(
      (w) => now - new Date(w.startedAt).getTime() <= 30 * 86400000,
    );
    const summaries = last30.map(summarizeWorkout);
    const volume = summaries.reduce((sum, s) => sum + s.volume, 0);
    const sets = summaries.reduce((sum, s) => sum + s.sets, 0);
    const duration = summaries.reduce((sum, s) => sum + s.durationMs, 0);

    return h(
      'section',
      { class: 'card' },
      h('div', { class: 'section-title' }, h('h2', null, 'Ultimi 30 giorni')),
      h(
        'div',
        { class: 'stats', style: { marginTop: '12px' } },
        stat(String(last30.length), '', 'Sessioni'),
        stat(compactKg(volume), 'kg', 'Volume'),
        stat(String(sets), '', 'Serie'),
        // Sotto l'ora si mostrano i minuti: "0 h" non è un dato.
        duration >= 3600000
          ? stat(String(Math.round(duration / 3600000)), 'h', 'Tempo')
          : stat(String(Math.round(duration / 60000)), 'min', 'Tempo'),
      ),
    );
  }

  /* ------------------------------------------------------ volume per settimana */

  function weeklyVolume() {
    const weeks = [];
    const cursor = startOfWeek(new Date());

    for (let i = 7; i >= 0; i -= 1) {
      const start = new Date(cursor);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const volume = completed
        .filter((w) => {
          const at = new Date(w.startedAt);
          return at >= start && at < end;
        })
        .reduce((sum, w) => sum + summarizeWorkout(w).volume, 0);

      weeks.push({ label: i === 0 ? 'Ora' : shortDate(start).slice(0, 5), value: volume });
    }

    return h(
      'section',
      { class: 'card' },
      h('div', { class: 'section-title' }, h('h2', null, 'Volume per settimana')),
      h('p', { class: 'tiny' }, 'Ultime 8 settimane, in kg sollevati.'),
      h('div', { style: { marginTop: '12px' } },
        barChart(weeks, { unit: ' kg', caption: 'Volume settimanale', formatValue: compactKg }),
      ),
    );
  }

  /* ----------------------------------------------------- andamento esercizio */

  function exerciseTrend() {
    // Solo esercizi con almeno due sessioni: sotto quella soglia non c'è
    // nessun andamento da mostrare, solo un punto isolato.
    const counts = new Map();
    for (const workout of completed) {
      for (const block of workout.exercises || []) {
        counts.set(block.exerciseId, (counts.get(block.exerciseId) || 0) + 1);
      }
    }

    const candidates = [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([id]) => ({ id, name: findExercise(id)?.name || id, count: counts.get(id) }))
      .sort((a, b) => b.count - a.count);

    if (!candidates.length) {
      return h(
        'section',
        { class: 'card' },
        h('div', { class: 'section-title' }, h('h2', null, 'Andamento carichi')),
        h('p', { class: 'tiny' }, 'Ripeti un esercizio in almeno due sessioni per vedere la curva.'),
      );
    }

    const chartHost = h('div');
    const select = h(
      'select',
      {
        class: 'select',
        'aria-label': 'Esercizio da analizzare',
        onChange: (event) => draw(event.target.value),
      },
      candidates.map((item) =>
        h('option', { value: item.id }, `${item.name} · ${item.count} sessioni`),
      ),
    );

    function draw(exerciseId) {
      const points = exerciseProgress(completed, exerciseId).map((p) => ({
        x: p.date,
        y: p.oneRm,
        label: shortDate(p.date),
      }));

      const first = points[0]?.y ?? 0;
      const last = points.at(-1)?.y ?? 0;
      const delta = last - first;

      replace(
        chartHost,
        lineChart(points, {
          unit: ' kg',
          caption: '1RM stimato',
          formatY: (v) => num(Math.round(v)),
          formatX: (v) => shortDate(v),
        }),
        points.length >= 2
          ? h(
              'p',
              { class: 'tiny', style: { marginTop: '8px' } },
              delta >= 0
                ? `In crescita di ${num(Math.round(delta))} kg dalla prima sessione registrata.`
                : `In calo di ${num(Math.round(Math.abs(delta)))} kg rispetto alla prima sessione.`,
            )
          : null,
      );
    }

    draw(candidates[0].id);

    return h(
      'section',
      { class: 'card' },
      h('div', { class: 'section-title' }, h('h2', null, '1RM stimato')),
      h('p', { class: 'tiny' }, 'Massimale teorico calcolato dalla serie migliore di ogni sessione.'),
      h('div', { style: { margin: '12px 0' } }, select),
      chartHost,
    );
  }

  /* --------------------------------------------------- equilibrio muscolare */

  function muscleBalance() {
    const now = Date.now();
    const recent = completed.filter(
      (w) => now - new Date(w.startedAt).getTime() <= 30 * 86400000,
    );

    const distribution = volumeByMuscle(recent, (id) => findExercise(id)?.muscle);
    if (!distribution.length) return null;

    const max = distribution[0].volume;

    return h(
      'section',
      { class: 'card' },
      h('div', { class: 'section-title' }, h('h2', null, 'Volume per gruppo')),
      h('p', { class: 'tiny' }, 'Ultimi 30 giorni. Utile per capire cosa stai trascurando.'),
      h(
        'div',
        { style: { marginTop: '8px' } },
        ...distribution.map((row) =>
          h(
            'div',
            { class: 'muscle-row' },
            h('span', { class: 'muscle-row__name' }, row.muscle),
            h(
              'span',
              { class: 'muscle-row__track' },
              h('span', {
                class: 'muscle-row__fill',
                style: { width: `${Math.max(3, (row.volume / max) * 100)}%` },
              }),
            ),
            h('span', { class: 'muscle-row__v' }, compactKg(row.volume)),
          ),
        ),
      ),
    );
  }

  /* ---------------------------------------------------------------- record */

  function records() {
    const list = [...state.records.values()].sort(
      (a, b) => (b.bestOneRm?.value || 0) - (a.bestOneRm?.value || 0),
    );

    if (!list.length) return null;

    return h(
      'section',
      { class: 'col col--tight' },
      h('div', { class: 'section-title' }, h('h2', null, 'Record personali')),
      h(
        'div',
        { class: 'list-grid' },
        list.map((record) =>
          h(
            'div',
            { class: 'pr-card' },
            h('span', { class: 'pr-card__medal' }, icon('trophy')),
            h(
              'div',
              { class: 'pr-card__body' },
              h('div', { class: 'pr-card__name' }, record.name),
              h(
                'div',
                { class: 'pr-card__sub' },
                record.bestWeight
                  ? `Massimale ${num(record.bestWeight.weight)} kg × ${num(record.bestWeight.reps)}`
                  : '—',
              ),
            ),
            h(
              'div',
              { class: 'pr-card__v' },
              h('strong', null, `${num(record.bestOneRm?.value ?? 0)}`),
              h('span', { class: 'tiny' }, 'kg 1RM'),
            ),
          ),
        ),
      ),
    );
  }

  function stat(value, unit, label) {
    return h(
      'div',
      { class: 'stat' },
      h(
        'span',
        { class: 'stat__value' },
        value,
        unit ? h('span', { class: 'stat__unit' }, unit) : null,
      ),
      h('span', { class: 'stat__label' }, label),
    );
  }
}
