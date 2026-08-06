import './styles.css';
import { h } from './ui/dom.js';
import { mountApp } from './ui/app.js';
import { registerServiceWorker } from './pwa.js';

async function boot() {
  const root = document.getElementById('app');

  try {
    await mountApp(root);
  } catch (error) {
    console.error('[gymlog] startup failed', error);
    root.replaceChildren(
      h(
        'div',
        { class: 'wrap' },
        h('p', { class: 'blank' }, 'Non riesco ad avviare l’app. Ricarica la pagina.'),
      ),
    );
    return;
  }

  registerServiceWorker();
}

boot();
