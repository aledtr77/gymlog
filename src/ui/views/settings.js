/**
 * Strumenti e impostazioni.
 * Include export/import: i dati di allenamento sono di chi si allena, e
 * devono poter uscire dall'app in un file leggibile.
 */

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { confirmSheet } from '../sheet.js';
import { toast } from '../toast.js';
import { openPlateCalculator } from '../plateCalculator.js';
import {
  clearAllWorkouts,
  exportData,
  importData,
  state,
  updateSettings,
} from '../../core/store.js';
import { applyTheme } from '../theme.js';

export function settingsView(ctx) {
  const node = h(
    'div',
    null,
    h(
      'header',
      { class: 'appbar' },
      h('div', { class: 'appbar__inner' }, h('h1', { class: 'appbar__title' }, 'Strumenti')),
    ),
    h(
      'main',
      { class: 'main' },
      h('div', { class: 'view' }, tools(), preferences(), data(), about()),
    ),
  );

  return { node };

  function tools() {
    return h(
      'section',
      { class: 'card' },
      h('div', { class: 'section-title' }, h('h2', null, 'Strumenti')),
      h(
        'div',
        { class: 'menu', style: { marginTop: '8px' } },
        h(
          'button',
          { type: 'button', class: 'menu__item', onClick: () => openPlateCalculator({}) },
          icon('calculator'),
          'Calcolatore dischi',
        ),
      ),
    );
  }

  function preferences() {
    return h(
      'section',
      { class: 'card' },
      h('div', { class: 'section-title' }, h('h2', null, 'Preferenze')),
      h(
        'div',
        { style: { marginTop: '8px' } },
        toggle('Suono a fine recupero', 'sound'),
        toggle('Vibrazione', 'vibration'),
        toggle('Schermo sempre acceso durante l’allenamento', 'keepAwake'),
        toggle('Avvia il recupero automaticamente', 'autoRest'),
        h('div', { class: 'divider' }),
        themeRow(),
      ),
    );
  }

  function toggle(label, key) {
    const input = h('input', {
      type: 'checkbox',
      checked: Boolean(state.settings[key]),
      style: { width: '20px', height: '20px', accentColor: 'var(--accent)' },
      onChange: (event) => updateSettings({ [key]: event.target.checked }),
    });

    return h(
      'label',
      {
        class: 'row row--between',
        style: { padding: '11px 0', gap: '16px', cursor: 'pointer' },
      },
      h('span', { class: 'grow', style: { fontSize: '15px' } }, label),
      input,
    );
  }

  function themeRow() {
    const select = h(
      'select',
      {
        class: 'select',
        style: { width: 'auto', minWidth: '140px' },
        onChange: (event) => {
          updateSettings({ theme: event.target.value });
          applyTheme(event.target.value);
        },
      },
      [
        ['system', 'Come il sistema'],
        ['dark', 'Sempre scuro'],
        ['light', 'Sempre chiaro'],
      ].map(([value, label]) =>
        h('option', { value, selected: state.settings.theme === value }, label),
      ),
    );

    return h(
      'div',
      { class: 'row row--between', style: { padding: '11px 0', gap: '16px' } },
      h('span', { class: 'grow', style: { fontSize: '15px' } }, 'Tema'),
      select,
    );
  }

  function data() {
    const fileInput = h('input', {
      type: 'file',
      accept: 'application/json,.json',
      class: 'hidden',
      onChange: async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        try {
          const payload = JSON.parse(await file.text());
          const added = await importData(payload, { merge: true });
          toast(
            added ? `${added} allenamenti importati` : 'Nessun nuovo allenamento da importare',
            { variant: 'ok', iconName: 'check' },
          );
          ctx.refresh();
        } catch (error) {
          toast(error.message || 'File non valido', { variant: 'err', duration: 4000 });
        }
      },
    });

    return h(
      'section',
      { class: 'card' },
      h('div', { class: 'section-title' }, h('h2', null, 'I tuoi dati')),
      h('p', { class: 'tiny', style: { marginTop: '6px' } },
        'Tutto resta sul tuo dispositivo. Nessun account, nessun server.',
      ),
      fileInput,
      h(
        'div',
        { class: 'menu', style: { marginTop: '8px' } },
        h(
          'button',
          { type: 'button', class: 'menu__item', onClick: doExport },
          icon('download'),
          'Esporta tutto (JSON)',
        ),
        h(
          'button',
          { type: 'button', class: 'menu__item', onClick: () => fileInput.click() },
          icon('upload'),
          'Importa da file',
        ),
        h(
          'button',
          { type: 'button', class: 'menu__item menu__item--danger', onClick: wipe },
          icon('trash'),
          'Cancella tutti gli allenamenti',
        ),
      ),
    );
  }

  function doExport() {
    const payload = exportData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = h('a', {
      href: url,
      download: `gymlog-${new Date().toISOString().slice(0, 10)}.json`,
    });

    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`${payload.workouts.length} allenamenti esportati`, { variant: 'ok', iconName: 'check' });
  }

  async function wipe() {
    const ok = await confirmSheet({
      title: 'Cancellare tutto?',
      message:
        'Verranno eliminati tutti gli allenamenti e i record personali. Le routine restano. L’operazione non è reversibile: esporta prima i dati se vuoi conservarli.',
      confirmLabel: 'Cancella tutto',
      danger: true,
    });
    if (!ok) return;

    await clearAllWorkouts();
    toast('Storico cancellato', { variant: 'default' });
    ctx.refresh();
  }

  function about() {
    return h(
      'section',
      { class: 'card' },
      h('div', { class: 'row', style: { gap: '12px' } },
        h('span', { class: 'brand__mark' }, 'G'),
        h(
          'div',
          { class: 'grow' },
          h('div', { style: { fontWeight: '700' } }, 'GymLog'),
          h('div', { class: 'tiny' }, 'Diario di allenamento offline-first'),
        ),
      ),
      h(
        'p',
        { class: 'tiny', style: { marginTop: '10px' } },
        'Funziona senza connessione. Aggiungila alla schermata home dal menu del browser per usarla a schermo intero.',
      ),
    );
  }
}
