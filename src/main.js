import './styles.css';
import { h } from './ui/dom.js';
import { init } from './core/store.js';
import { mountApp } from './ui/app.js';
import { maybeSuggestInstall, registerServiceWorker, watchInstallPrompt } from './pwa.js';

// Va agganciato prima del primo paint: Chrome emette beforeinstallprompt una
// sola volta e non lo ripete se nessuno stava ascoltando.
watchInstallPrompt();

async function boot() {
  const root = document.getElementById('app');

  try {
    await init();
    mountApp(root);
  } catch (error) {
    console.error('[forgia] avvio fallito', error);
    root.replaceChildren(
      h(
        'div',
        { class: 'main' },
        h(
          'div',
          { class: 'card' },
          h(
            'div',
            { class: 'empty' },
            h('h3', null, 'Non riesco ad avviare l’app'),
            h(
              'p',
              null,
              'Ricarica la pagina. Se il problema resta, il browser potrebbe bloccare l’archiviazione locale (finestra anonima o restrizioni sui dati dei siti).',
            ),
            h(
              'button',
              { type: 'button', class: 'btn btn--primary', onClick: () => location.reload() },
              'Ricarica',
            ),
          ),
        ),
      ),
    );
    return;
  }

  registerServiceWorker();
  setTimeout(maybeSuggestInstall, 4000);
}

boot();
