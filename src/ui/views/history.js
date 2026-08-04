/**
 * Storico.
 * Elenco raggruppato per mese; il dettaglio si apre in un pannello con tutte
 * le serie esattamente come sono state registrate.
 */

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { confirmSheet, openSheet } from '../sheet.js';
import { toast } from '../toast.js';
import { deleteWorkout, state } from '../../core/store.js';
import { summarizeWorkout, estimateOneRepMax } from '../../core/metrics.js';
import {
  compactKg,
  dayOf,
  durationLabel,
  fullDate,
  monthOf,
  monthYear,
  num,
  timeOf,
} from '../../core/format.js';

const TYPE_BADGE = { warmup: 'W', drop: 'D', failure: 'C' };

export function historyView(ctx) {
  const completed = state.workouts.filter((w) => w.status === 'completed');

  const node = h(
    'div',
    null,
    h(
      'header',
      { class: 'appbar' },
      h(
        'div',
        { class: 'appbar__inner' },
        h('h1', { class: 'appbar__title' }, 'Storico'),
        h('span', { class: 'badge' }, `${completed.length} sessioni`),
      ),
    ),
    h('main', { class: 'main' }, h('div', { class: 'view' }, body())),
  );

  return { node };

  function body() {
    if (!completed.length) {
      return h(
        'div',
        { class: 'card' },
        h(
          'div',
          { class: 'empty' },
          h('div', { class: 'empty__icon' }, icon('history')),
          h('h3', null, 'Storico vuoto'),
          h('p', null, 'Gli allenamenti conclusi finiscono qui, con tutte le serie registrate.'),
          h(
            'button',
            { type: 'button', class: 'btn btn--primary', onClick: () => ctx.navigate('home') },
            'Inizia il primo',
          ),
        ),
      );
    }

    const groups = [];
    let currentMonth = null;

    for (const workout of completed) {
      const label = monthYear(workout.startedAt);
      if (label !== currentMonth) {
        currentMonth = label;
        groups.push(h('div', { class: 'month-sep' }, label));
      }
      groups.push(card(workout));
    }

    return h('div', { class: 'col col--tight' }, ...groups);
  }

  function card(workout) {
    const summary = summarizeWorkout(workout);

    return h(
      'button',
      { type: 'button', class: 'hist', onClick: () => openDetail(workout) },
      h(
        'div',
        { class: 'hist__date' },
        h('span', { class: 'hist__day' }, dayOf(workout.startedAt)),
        h('span', { class: 'hist__mon' }, monthOf(workout.startedAt)),
      ),
      h(
        'div',
        { class: 'hist__body' },
        h('span', { class: 'hist__name' }, workout.name),
        h(
          'div',
          { class: 'hist__facts' },
          h('span', { class: 'badge badge--accent' }, `${compactKg(summary.volume)} kg`),
          h('span', { class: 'badge' }, `${summary.sets} ${summary.sets === 1 ? 'serie' : 'serie'}`),
          h(
            'span',
            { class: 'badge' },
            `${summary.exercises} ${summary.exercises === 1 ? 'esercizio' : 'esercizi'}`,
          ),
          // Sotto il minuto la durata non dice nulla di utile.
          summary.durationMs >= 60000
            ? h('span', { class: 'badge' }, durationLabel(summary.durationMs))
            : null,
        ),
      ),
      h('span', { class: 'routine__go' }, icon('chevron')),
    );
  }

  function openDetail(workout) {
    const summary = summarizeWorkout(workout);

    const handle = openSheet({
      title: workout.name,
      full: true,
      body: () =>
        h(
          'div',
          { class: 'col' },
          h(
            'p',
            { class: 'tiny' },
            `${fullDate(workout.startedAt)} alle ${timeOf(workout.startedAt)}`,
          ),
          h(
            'div',
            { class: 'stats' },
            stat(compactKg(summary.volume), 'kg', 'Volume'),
            stat(String(summary.sets), '', 'Serie'),
            stat(String(summary.reps), '', 'Reps'),
            summary.durationMs >= 60000
              ? stat(durationLabel(summary.durationMs), '', 'Durata')
              : null,
          ),
          h(
            'div',
            { class: 'card' },
            ...workout.exercises.map((block) =>
              h(
                'div',
                { class: 'detail-ex' },
                h('div', { class: 'detail-ex__name' }, block.name),
                block.notes ? h('p', { class: 'tiny' }, block.notes) : null,
                ...block.sets.map((set, index) =>
                  h(
                    'div',
                    { class: 'detail-set' },
                    h(
                      'span',
                      { class: 'detail-set__n' },
                      TYPE_BADGE[set.type] || String(index + 1),
                    ),
                    h('span', null, `${num(set.weight)} kg × ${num(set.reps)}`),
                    h(
                      'span',
                      { class: 'tiny' },
                      `1RM ≈ ${num(estimateOneRepMax(set.weight, set.reps))} kg`,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      footer: [
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--danger grow',
            onClick: async () => {
              const ok = await confirmSheet({
                title: 'Eliminare l’allenamento?',
                message:
                  'Verrà rimosso dallo storico e i record personali saranno ricalcolati.',
                confirmLabel: 'Elimina',
                danger: true,
              });
              if (!ok) return;
              await deleteWorkout(workout.id);
              handle.close();
              toast('Allenamento eliminato', { variant: 'default' });
              ctx.refresh();
            },
          },
          icon('trash'),
          'Elimina',
        ),
      ],
    });
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
