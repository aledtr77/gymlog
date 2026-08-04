/**
 * Bottom sheet.
 * Trascinabile verso il basso, chiudibile con Esc o toccando lo sfondo, con
 * gestione della cronologia: il tasto "indietro" di Android chiude il pannello
 * invece di uscire dall'app.
 */

import { h, raf } from './dom.js';
import { icon } from './icons.js';

const layer = () => document.getElementById('layer-sheet');
const openSheets = [];

export function openSheet({
  title,
  body,
  footer = null,
  sticky = null,
  full = false,
  onClose = null,
  leading = null,
}) {
  const scrim = h('div', { class: 'scrim' });
  const bodyEl = h('div', { class: 'sheet__body' });
  const grab = h('div', { class: 'sheet__grab', 'aria-hidden': 'true' });

  const sheet = h(
    'div',
    {
      class: ['sheet', full && 'sheet--full'],
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': typeof title === 'string' ? title : 'Pannello',
    },
    grab,
    title
      ? h(
          'div',
          { class: 'sheet__head' },
          leading,
          h('h2', { class: 'sheet__title' }, title),
          h(
            'button',
            { type: 'button', class: 'icon-btn', 'aria-label': 'Chiudi', onClick: () => close() },
            icon('close'),
          ),
        )
      : null,
    // La fascia "sticky" (ricerca, filtri) precede il corpo scorrevole:
    // sotto la lista sembrerebbe una barra di stato, non un comando.
    sticky ? h('div', { class: 'sheet__sticky' }, sticky) : null,
    bodyEl,
    footer ? h('div', { class: 'sheet__foot' }, footer) : null,
  );

  const content = typeof body === 'function' ? body({ close, bodyEl, sheet }) : body;
  if (content) bodyEl.append(content);

  layer().append(scrim, sheet);
  layer().style.pointerEvents = 'auto';

  raf(() => {
    scrim.classList.add('is-open');
    sheet.classList.add('is-open');
  });

  const handle = { close, sheet, bodyEl };
  openSheets.push(handle);

  scrim.addEventListener('click', () => close());
  document.addEventListener('keydown', onKey);
  attachDrag(grab, sheet, close);

  // Voce di cronologia dedicata: intercetta il gesto "indietro".
  history.pushState({ sheet: true }, '');
  window.addEventListener('popstate', onPop);

  let closing = false;
  let poppedByHistory = false;

  function onKey(event) {
    if (event.key === 'Escape' && openSheets.at(-1) === handle) close();
  }

  function onPop() {
    poppedByHistory = true;
    close();
  }

  function close() {
    if (closing) return;
    closing = true;

    document.removeEventListener('keydown', onKey);
    window.removeEventListener('popstate', onPop);

    const index = openSheets.indexOf(handle);
    if (index >= 0) openSheets.splice(index, 1);

    scrim.classList.remove('is-open');
    sheet.classList.remove('is-open');
    sheet.style.transform = '';

    setTimeout(() => {
      scrim.remove();
      sheet.remove();
      if (!openSheets.length) layer().style.pointerEvents = 'none';
    }, 300);

    // onClose viene invocato solo dopo che la voce di cronologia del pannello
    // è stata effettivamente rimossa: chi chiude un pannello e subito dopo
    // naviga altrove troverebbe la propria destinazione sovrascritta dal
    // popstate in arrivo.
    if (!poppedByHistory && history.state?.sheet) {
      let settled = false;
      const finalize = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener('popstate', finalize);
        onClose?.();
      };
      window.addEventListener('popstate', finalize, { once: true });
      setTimeout(finalize, 250); // rete di sicurezza se popstate non arriva
      history.back();
    } else {
      onClose?.();
    }
  }

  return handle;
}

/** Trascinamento sulla maniglia: sotto i 110px torna su, oltre chiude. */
function attachDrag(grab, sheet, close) {
  let startY = 0;
  let delta = 0;
  let dragging = false;

  grab.addEventListener('pointerdown', (event) => {
    dragging = true;
    startY = event.clientY;
    delta = 0;
    sheet.style.transition = 'none';
    grab.setPointerCapture(event.pointerId);
  });

  grab.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    delta = Math.max(0, event.clientY - startY);
    sheet.style.transform = `translateY(${delta}px)`;
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (delta > 110) close();
  };

  grab.addEventListener('pointerup', end);
  grab.addEventListener('pointercancel', end);
}

/* -------------------------------------------------------------------------
   Scorciatoie: menu di azioni e conferme
   ------------------------------------------------------------------------- */

export function openMenu(title, items) {
  return openSheet({
    title,
    body: ({ close }) =>
      h(
        'div',
        { class: 'menu' },
        items.filter(Boolean).map((item) =>
          h(
            'button',
            {
              type: 'button',
              class: ['menu__item', item.danger && 'menu__item--danger'],
              onClick: () => {
                close();
                setTimeout(() => item.onClick(), 60);
              },
            },
            item.iconName ? icon(item.iconName) : null,
            item.label,
          ),
        ),
      ),
  });
}

/**
 * Conferma. Sostituisce window.confirm, che in standalone su iOS mostra
 * l'URL dell'app ed è impossibile da rendere coerente col resto.
 */
export function confirmSheet({
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  danger = false,
}) {
  return new Promise((resolve) => {
    // L'esito viene registrato al click ma consegnato solo alla chiusura
    // completa: chi attende questa promessa può navigare senza correre
    // contro l'animazione e la cronologia del pannello.
    let outcome = false;
    let settled = false;

    const handle = openSheet({
      title,
      body: () => h('p', { class: 'muted' }, message),
      footer: [
        h(
          'button',
          { type: 'button', class: 'btn btn--ghost grow', onClick: () => handle.close() },
          cancelLabel,
        ),
        h(
          'button',
          {
            type: 'button',
            class: ['btn grow', danger ? 'btn--danger' : 'btn--primary'],
            onClick: () => {
              outcome = true;
              handle.close();
            },
          },
          confirmLabel,
        ),
      ],
      onClose: () => {
        if (settled) return;
        settled = true;
        resolve(outcome);
      },
    });
  });
}

/** Input testuale in un pannello, stessa logica di confirmSheet. */
export function promptSheet({
  title,
  label,
  value = '',
  placeholder = '',
  confirmLabel = 'Salva',
  multiline = false,
}) {
  return new Promise((resolve) => {
    let outcome = null;
    let settled = false;
    let input;

    const accept = () => {
      outcome = input.value.trim();
      handle.close();
    };

    const handle = openSheet({
      title,
      body: () =>
        h(
          'div',
          { class: 'field' },
          label ? h('label', { class: 'field__label', for: 'prompt-field' }, label) : null,
          (input = h(multiline ? 'textarea' : 'input', {
            id: 'prompt-field',
            class: multiline ? 'textarea' : 'input',
            value,
            placeholder,
            enterkeyhint: 'done',
            onKeydown: (event) => {
              if (event.key === 'Enter' && !multiline) {
                event.preventDefault();
                accept();
              }
            },
          })),
        ),
      footer: [
        h(
          'button',
          { type: 'button', class: 'btn btn--ghost grow', onClick: () => handle.close() },
          'Annulla',
        ),
        h('button', { type: 'button', class: 'btn btn--primary grow', onClick: accept }, confirmLabel),
      ],
      onClose: () => {
        if (settled) return;
        settled = true;
        resolve(outcome);
      },
    });

    raf(() => input?.focus());
  });
}
